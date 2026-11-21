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
 * 起点石の種類の効果: その起点の連鎖の流れだけを変える（属性なし。同じ種類の起点石は1回だけ）
 */
export interface LineEffect {
  /** 伝わる時間（秒）に足す（速いなら負） */
  relay?: number;
  /** 攻撃装備のダメージ % */
  damage?: number;
  /** The first `cells` cells to ring (counted like the guard): attack damage +`damage` % */
  lead?: { cells: number; damage: number };
  /** Attack damage +`far` % per cell from the origin along the chain */
  far?: number;
  /** At the end of the chain, the last attack cell rings its stack once more (same counts) */
  echo?: boolean;
  /** Cells added to the guard kept after the origin (ChainRules.guardSteps) */
  guardCells?: number;
}

/** 線の効果を、その段の装備について掛け算にまとめたもの（1 は効果なし） */
export interface LineBoost {
  damage: number;
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
  /** この装備を通る連鎖は、連鎖倍率がこの値まで ×1.2 ずつ伸び、その先も伸びる（循環の環） */
  riseTo?: number;
  /** ボスへのダメージ倍率（竜牙の剣） */
  bossMult?: number;
  /**
   * カウンターシールド: 勇者が受けたダメージ（防御で吸った分も）をためておき、連鎖がこの装備を鳴らすと
   * ためた分 × counter × レア度の倍率を、前の敵へまとめて返す（ためた分は空になる）
   */
  counter?: number;
  /** バックパックに置いてあれば、連鎖中も無防備にならない（不落の城門） */
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
  /**
   * Stacked board (trial): the items under each cell's top item, bottom first (same length as
   * cells). The top item (cells[i]) rings last and its arrows lead on. Absent on an ordinary board
   */
  under?: string[][];
  /** Stacked board (trial): which board it is (data/boards.ts: shape, holes, trait) */
  board?: import('../data/boards').BoardId;
  /** Gimmick cells (trial): the gimmick on each cell (same length as cells). Absent: none */
  gimmicks?: (GimmickKind | null)[];
}

/**
 * Gimmick cells (trial) change only where the chain goes:
 * - rotate: the top item's arrows turn 90° clockwise each time the chain passes
 * - switch: the top item's arrows are used one at a time, the next one on each pass
 * - warp (a pair): after the cell rings, the chain also goes to the other warp cell
 */
export type GimmickKind = 'rotate' | 'switch' | 'warp';
export const GIMMICK_KINDS: readonly GimmickKind[] = ['rotate', 'switch', 'warp'];

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
  /** この段に線が届いている起点（発火順） */
  origins?: string[];
  /** 起点石の種類の効果（この段の装備にかかる分）。効果がなければ無い */
  line?: LineBoost;
  /** Stacked board (trial): position in the cell's stack, 0 = bottom (absent on an ordinary board) */
  ring?: number;
  /** Stacked board (trial): the position's multiplier (×1 / ×1.5 / ×2 from the bottom) */
  stackMult?: number;
  /**
   * 残響の起点石: a ring repeated at the end of the chain. `parentIndex` is the ring it repeats; the
   * count, multipliers and cell are that ring's. No technique, and it adds no step, cell or wait
   */
  echo?: true;
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
  /** 循環の環を通る発火: 連鎖倍率が ×1.2 ずつ伸びる上の値（通らなければなし） */
  riseTo?: number;
  /** Gimmick cells: each cell's turn count after this firing (the next firing starts from it) */
  gimmickEnd?: number[];
}
