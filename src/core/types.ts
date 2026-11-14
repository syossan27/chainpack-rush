// 主要な型（仕様書 第9章）。src/core と src/data の両方から使う。

export type Dir = 'up' | 'right' | 'down' | 'left';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemKind = 'origin' | 'attack' | 'defense' | 'consumable';
export type Element =
  'physical' | 'blunt' | 'fire' | 'thunder' | 'ice' | 'water' | 'oil' | 'wind' | 'light' | 'dark';
export type Area = 'single' | 'sweep' | 'splash' | 'all';
/** radiant: 灼光（光の装備）、bound: 呪縛（闇の装備。付いているあいだ敵の攻撃力ダウン） */
export type Status = 'wet' | 'oil' | 'frozen' | 'poison' | 'radiant' | 'bound';
export type ConsumableEffect =
  'rally' | 'timeStop' | 'oilAll' | 'wetAll' | 'heal' | 'addTime' | 'bombAll' | 'critUp';

export const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left'];
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/**
 * 起点石の種類の効果。その起点から伸びる線に乗った装備にかかる。
 * 合流した本流には、届いた線の効果が全部かかる（同じ種類の起点石は1回だけ）
 */
export interface LineEffect {
  /** 伝わる時間（秒）に足す（速いなら負） */
  relay?: number;
  /** 攻撃装備のダメージ % */
  damage?: number;
  /** この属性の攻撃装備だけ、ダメージ +elementDamage % */
  element?: Element;
  elementDamage?: number;
  /** 防御装備の防御値 % */
  defense?: number;
  /** 毒の毎秒ダメージ % */
  poison?: number;
  /** 吸血の回復量 % */
  lifesteal?: number;
}

/** 線の効果を、その段の装備について掛け算にまとめたもの（1 は効果なし） */
export interface LineBoost {
  damage: number;
  defense: number;
  poison: number;
  lifesteal: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  element?: Element;
  area?: Area;
  atk?: number; // コモン基準
  defense?: number; // コモン基準
  applies?: Status;
  relayDelay?: number; // 既定 0.2 秒、大剣は 0.4 秒
  pierce?: number; // 狙いの後ろにも同ダメージを与える体数（槍）
  hits?: number; // 1段で何回当てるか（双剣は2）
  critBonus?: number; // この装備の会心率に足す（聖剣）
  /** アーティファクト: 滅多に出ない。常にレジェンダリー、出口はこの形で出る（数は固定、向きは鍛冶屋で高額）、追加効果なし */
  artifact?: { exits: Dir[] };
  /** この装備を通る連鎖は、連鎖倍率の上限がこの値になる（循環の環） */
  multCap?: number;
  /** ボスへのダメージ倍率（竜牙の剣） */
  bossMult?: number;
  /** バックパックに置いてあれば、連鎖中も無防備にならず、よろめかない（不落の城門） */
  guardAll?: boolean;
  /** 当てた敵に濡れ・油・凍結をまとめて付ける（賢者の石） */
  appliesAll?: boolean;
  effect?: ConsumableEffect;
  /** 与えたダメージのこの割合だけ勇者のHPが回復する（吸血の剣） */
  lifesteal?: number;
  /** この装備のあとに続く装備は、段数がこの分だけ多く数えられる（疾風の羽） */
  stepBoost?: number;
  /** 起点石の種類: この起点の線に乗った装備への効果 */
  line?: LineEffect;
  /** 出るレアリティの幅（下限・上限）。省略時はすべて。上限を超える合成は next の装備になる */
  rarities?: [Rarity, Rarity];
  /** 系統の次の装備（合成で上限を超えたとき） */
  next?: string;
  description: string;
}

export interface ItemInstance {
  uid: string;
  defId: string;
  rarity: Rarity;
  exits: Dir[]; // 入手時に抽選。付け直しで方向だけ変わる
  rerollCount: number;
  /** ロック中は売れない（間違って売らないように） */
  locked?: boolean;
  /** 追加効果（入手時に抽選。src/core/affixes.ts）。古いセーブにはない */
  affixes?: { id: import('./affixes').AffixId; value: number }[];
}

export interface Loadout {
  width: number;
  height: number;
  cells: (string | null)[]; // ItemInstance.uid、行優先
  originOrder: string[]; // 起点の uid を発火順に
  consumables: string[];
  /** 消耗品枠に入れておきたい消耗品（defId）。使い切ったら、倉庫から同じものを自動で入れ直す */
  consumableAuto?: string[];
}

export interface ChainStep {
  t: number; // 起点発火からの秒数
  uid: string;
  step: number | null; // 段数。防御装備・起点は null
  branch: number;
  mult: number; // 連鎖倍率 1.2^(n-1)。段数を持たないものは 1
  from: string | null; // どのアイテムから伝わったか（起点は null）
  parentIndex: number; // steps 内の親の添字（起点は -1）
  cell: number; // マス番号（行優先）
  /** この一撃が必殺技になる（data/techniques.ts の id） */
  tech?: string;
  /** Sync point: which step this cell is on each route, in firing order (e.g. [3, 4]) */
  mergeArrived?: number[];
  /** Sync point: the count every route goes on from here (the longer route's) */
  mergeCount?: number;
  /** Sync point: the cells the routes come in from */
  mergeFrom?: number[];
  /** 合流ボーナス（%）。合流したマスから先の本流にかかる */
  mergeBonus?: number;
  /** この段に線が届いている起点（発火順） */
  origins?: string[];
  /** 起点石の種類の効果（この段の装備にかかる分）。効果がなければ無い */
  line?: LineBoost;
}

export interface ChainPlan {
  /** The origin that fires */
  originUid: string;
  /** The origins of this firing (always just the one; origins fire one at a time) */
  originUids: string[];
  steps: ChainStep[];
  duration: number; // 無防備の長さ
  defenseGain: number;
  maxStep: number;
  /** 連鎖倍率の上限（通常は CHAIN.multCap） */
  multCap: number;
}
