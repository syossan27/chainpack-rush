// 数値定数（仕様書 第4〜7章の初期値）。数値はここと src/data にのみ書く。
import type { Rarity, Status, Element } from '../core/types';

export const SIM = {
  fixedStep: 1 / 60, // 固定ステップ（秒）
  ticksPerSecond: 60,
  runDuration: 30, // 秒
} as const;

export const HERO = {
  maxHp: 100,
  atbTime: 1.5,
  minAtbTime: 1.0, // ATB短縮の下限
  speed: 120, // px/秒
  engageRange: 160, // 勇者の前方
  unguardedTakenMult: 1.5, // 無防備中の被ダメージ倍率
} as const;

export const FIELD = {
  aggroRange: 230, // 敵が勇者へ寄ってくる距離（いま戦っている群れだけが寄ってくる）
  viewRange: 560, // 画面内（全体攻撃・油の大樽などの対象）
  enemySpeed: 220, // 敵の接近速度 px/秒
  spawnSpacing: 8, // 群れの中の初期間隔
  frontStand: 44, // 前列の立ち位置（勇者からの距離）
  frontSpacing: 20,
  backStand: 130, // 後列（呪術師）
  backSpacing: 10,
  bossStand: 120,
  loopGap: 120,
  attackPhaseJitter: 0.5, // 雑魚の最初の攻撃までの時間を最大でこの割合だけ早める // ボス撃破地点から次の区間の起点までの距離
} as const;

export const CHAIN = {
  relayDelay: 0.2,
  multBase: 1.2,
  multCap: 2.5, // 連鎖倍率の上限（1.2^5≒2.49 まで＝6段目までは仕様どおり）
  tailDelay: 0.2, // 最後の発動から連鎖終了まで
} as const;

export const AREA = {
  splashRadius: 60,
  allMult: 0.4,
} as const;

export const STATUS = {
  duration: 5,
} as const;

export interface ComboRule {
  status: Status;
  element: Element;
  name: string;
  label: string;
  mult: number;
  expandToSplash: boolean;
}

export const COMBOS: readonly ComboRule[] = [
  {
    status: 'wet',
    element: 'thunder',
    name: 'shock',
    label: '感電！',
    mult: 3,
    expandToSplash: false,
  },
  {
    status: 'oil',
    element: 'fire',
    name: 'explode',
    label: '爆発！',
    mult: 2,
    expandToSplash: true,
  },
  {
    status: 'frozen',
    element: 'blunt',
    name: 'shatter',
    label: '粉砕！',
    mult: 2.5,
    expandToSplash: false,
  },
];

export const LOOP_SCALING = {
  hp: 1.3,
  atk: 1.3,
} as const;

export const BOSS = {
  ironKnightThreshold: 200, // 一撃200未満のダメージを無効
  goblinKingEscorts: 4,
  goblinKingSummonInterval: 4.0, // 秒。取り巻きが4体未満なら1体ずつ呼ぶ（初回は4体まとめて）
} as const;

export const CONSUMABLE = {
  timeStopDuration: 3,
  healAmount: 40,
  baseSlots: 3,
} as const;

export const RARITY: Record<
  Rarity,
  {
    mult: number;
    baseRate: number;
    exitCounts: readonly (readonly [number, number])[];
    color: number;
    sell: number;
    reroll: number;
  }
> = {
  common: {
    mult: 1.0,
    baseRate: 0.6,
    exitCounts: [
      [0, 0.1],
      [1, 0.7],
      [2, 0.2],
    ],
    color: 0x9a9aa6,
    sell: 5,
    reroll: 10,
  },
  rare: {
    mult: 1.5,
    baseRate: 0.3,
    exitCounts: [
      [1, 0.5],
      [2, 0.4],
      [3, 0.1],
    ],
    color: 0x4a8cff,
    sell: 20,
    reroll: 30,
  },
  epic: {
    mult: 2.5,
    baseRate: 0.09,
    exitCounts: [
      [1, 0.2],
      [2, 0.5],
      [3, 0.3],
    ],
    color: 0xb05cff,
    sell: 60,
    reroll: 80,
  },
  legendary: {
    mult: 4.0,
    baseRate: 0.01,
    exitCounts: [
      [2, 0.3],
      [3, 0.5],
      [4, 0.2],
    ],
    color: 0xffc634,
    sell: 200,
    reroll: 250,
  },
};

export const LOOT = {
  kindWeights: { attack: 0.6, defense: 0.15, consumable: 0.15, origin: 0.1 },
  commonShiftPerLoop: 0.1, // 1周ごとにコモンから10%分をレア以上へ
  consumableSell: 3,
} as const;

export const ECONOMY = {
  specifyCostMult: 5,
  rerollCostGrowth: 1.5,
} as const;

export type UpgradeId = 'maxHp' | 'atb' | 'attack' | 'backpack' | 'consumableSlots' | 'storage';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  effect: number;
  baseCost: number;
  growth: number;
  maxLevel: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  maxHp: { id: 'maxHp', name: '最大HP', effect: 10, baseCost: 50, growth: 1.6, maxLevel: 10 },
  atb: { id: 'atb', name: 'ATB短縮', effect: 0.05, baseCost: 80, growth: 1.6, maxLevel: 10 }, // 1.5→1.0秒
  attack: { id: 'attack', name: '攻撃倍率', effect: 0.05, baseCost: 60, growth: 1.6, maxLevel: 20 },
  backpack: {
    id: 'backpack',
    name: 'バックパック拡張',
    effect: 1,
    baseCost: 300,
    growth: 2.0,
    maxLevel: 3,
  }, // 5x4→7x5
  consumableSlots: {
    id: 'consumableSlots',
    name: '消耗品枠',
    effect: 1,
    baseCost: 400,
    growth: 2.0,
    maxLevel: 2,
  }, // 3→5
  storage: { id: 'storage', name: '倉庫容量', effect: 10, baseCost: 100, growth: 1.5, maxLevel: 6 }, // 40→100
};

export const BACKPACK = {
  baseWidth: 5,
  baseHeight: 4,
  maxWidth: 7,
  maxHeight: 5,
} as const;

export const STORAGE = {
  baseCapacity: 40,
} as const;

export const PROGRESS = {
  unlockLoop: 3, // 3周目のボスを倒すと次の地域が開放
} as const;

export const UI = {
  maxDamageNumbers: 50,
  maxEffects: 200,
  maxEnemies: 24,
  previewBudgetMs: 100,
} as const;
