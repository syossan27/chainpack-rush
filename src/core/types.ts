// 主要な型（仕様書 第9章）。src/core と src/data の両方から使う。

export type Dir = 'up' | 'right' | 'down' | 'left';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemKind = 'origin' | 'attack' | 'defense' | 'consumable';
export type Element = 'physical' | 'blunt' | 'fire' | 'thunder' | 'ice' | 'water' | 'oil';
export type Area = 'single' | 'sweep' | 'splash' | 'all';
export type Status = 'wet' | 'oil' | 'frozen';
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
  effect?: ConsumableEffect;
  description: string;
}

export interface ItemInstance {
  uid: string;
  defId: string;
  rarity: Rarity;
  exits: Dir[]; // 入手時に抽選。付け直しで方向だけ変わる
  rerollCount: number;
  /** 追加効果（入手時に抽選。src/core/affixes.ts）。古いセーブにはない */
  affixes?: { id: import('./affixes').AffixId; value: number }[];
}

export interface Loadout {
  width: number;
  height: number;
  cells: (string | null)[]; // ItemInstance.uid、行優先
  originOrder: string[]; // 起点の uid を発火順に
  consumables: string[];
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
}

export interface ChainPlan {
  originUid: string;
  steps: ChainStep[];
  duration: number; // 無防備の長さ
  defenseGain: number;
  maxStep: number;
}
