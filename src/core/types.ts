// 主要な型（仕様書 第9章）。src/core と src/data の両方から使う。

export type Dir = 'up' | 'right' | 'down' | 'left';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemKind = 'origin' | 'attack' | 'defense' | 'consumable';
export type Element = 'physical' | 'blunt' | 'fire' | 'thunder' | 'ice' | 'water' | 'oil';
export type Area = 'single' | 'sweep' | 'splash' | 'all';
export type Status = 'wet' | 'oil' | 'frozen' | 'poison';
export type ConsumableEffect =
  'rally' | 'timeStop' | 'oilAll' | 'wetAll' | 'heal' | 'addTime' | 'bombAll' | 'critUp';

export const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left'];
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];

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
}

export interface ChainPlan {
  originUid: string;
  steps: ChainStep[];
  duration: number; // 無防備の長さ
  defenseGain: number;
  maxStep: number;
  /** 連鎖倍率の上限（通常は CHAIN.multCap） */
  multCap: number;
}
