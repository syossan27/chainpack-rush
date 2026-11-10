// 数値定数（仕様書 第4〜7章の初期値）。数値はここと src/data にのみ書く。
import type { Rarity, Status, Element } from '../core/types';

export const SIM = {
  fixedStep: 1 / 60, // 固定ステップ（秒）
  ticksPerSecond: 60,
  runDuration: 30, // 秒
  /** 検証用のゲームスピード（設定画面と ?speed= で選ぶ）。ルールの秒数は変えず、進む速さだけを倍にする */
  speedOptions: [0.5, 1, 1.5, 2, 3],
  maxSpeed: 4,
} as const;

export const HERO = {
  maxHp: 100,
  atbTime: 1.5,
  minAtbTime: 1.0, // ATB短縮の下限
  speed: 160, // px/秒（改訂版の初期値、要確認）
  engageRange: 216, // 勇者の前方（改訂版の初期値、要確認）
  unguardedTakenMult: 1.5, // 無防備中の被ダメージ倍率
} as const;

// 距離・速度はすべて 720×1280 の論理px。判定は足元基準点（キャラクターの足元の x）で行う。
export const FIELD = {
  aggroRange: 300, // 群れの先頭がこの距離に入ると、群れごと勇者へ寄ってくる
  viewRange: 440, // 画面内（勇者の前方。全体攻撃・油の大樽などの対象）= 720 − viewBehind
  viewBehind: 280, // 勇者より後ろに見える幅 = 勇者の画面内位置（中央寄りで戦う）
  enemySpeed: 240, // 敵の接近速度 px/秒
  columnSpacing: 80, // 群れ内の横間隔（足元基準点）
  rowsPerColumn: 2, // 群れは前後2列。見た目の縦ずらしだけで core の距離は同じ
  frontStand: 56, // 1列目の立ち位置（勇者からの距離）。56 + 80×2 = 216 で3列まで交戦範囲に入る
  meleeReach: 96, // 近接の雑魚が攻撃できる距離（最前列だけが届く）
  bossStand: 216,
  bossSoloStand: 120, // 取り巻きがいないボスは目の前まで出てくる // ボスの立ち位置（取り巻き2列の後ろ）
  minGroupGap: 240, // 前の群れの最後尾から次の群れの先頭までの最小距離
  loopGap: 240, // ボス撃破地点から次の区間の起点までの距離
  maxOnScreen: 8, // 同時表示の設計目標（固定配置で守る。間引かない）
  attackPhaseJitter: 0.5, // 雑魚の最初の攻撃までの時間を最大でこの割合だけ早める
} as const;

export const CHAIN = {
  relayDelay: 0.2,
  multBase: 1.2,
  multCap: 2.5, // 連鎖倍率の上限（1.2^5≒2.49 まで＝6段目までは仕様どおり）
  tailDelay: 0.2, // 最後の発動から連鎖終了まで
} as const;

/**
 * 短い連鎖と長い連鎖の性格づけ（試作。RunConfig.rules で切り替えられる）
 * B: 次の発火までの待ちは、直前の連鎖の段数に比例（短い連鎖は回転が速い）
 * A: 連鎖中に一定以上のダメージを受けると、よろめいて残りの段が途切れる（長い連鎖はリスクが大きい）
 */
export interface ChainRules {
  atbPerStep: boolean;
  /** この段数でちょうど atbTime 待つ */
  atbRefSteps: number;
  /** 待ちの倍率の下限・上限（atbTime に掛ける） */
  atbMinFactor: number;
  atbMaxFactor: number;
  stagger: boolean;
  /** 1回の連鎖中に受けたダメージ（防御で吸った分は除く）が最大HPのこの割合に達するとよろめく */
  staggerRatio: number;
  /** 連鎖のこの段数までは無防備にならない（0 = 連鎖中はずっと無防備。短い連鎖を安全にする） */
  guardSteps: number;
}

export const CHAIN_RULES: ChainRules = {
  atbPerStep: true,
  atbRefSteps: 6,
  atbMinFactor: 0.25,
  atbMaxFactor: 2,
  stagger: true,
  staggerRatio: 0.15,
  guardSteps: 3,
};

export const CHAIN_RULES_OFF: ChainRules = {
  ...CHAIN_RULES,
  atbPerStep: false,
  stagger: false,
  guardSteps: 0,
};

export const AREA = {
  splashRadius: 80, // 群れ内の横間隔と対応させる
  allMult: 0.4,
} as const;

/** 毒: 付けた一撃のダメージの dpsRatio 倍を、毎秒 STATUS.duration 秒のあいだ与える（重ねがけは強い方） */
export const POISON = {
  dpsRatio: 0.3,
  /** ダメージを表示する間隔（秒） */
  tickEvery: 0.5,
} as const;

export const STATUS = {
  duration: 5,
  /** 状態がついた相手へのコンボ以外の攻撃は ×1.2（状態付与の装備にも単体で役目を持たせる） */
  exposedMult: 1.2,
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
  hp: 1.4, // 装備の追加効果・新装備で強くなりやすくなったぶん 1.3 から上げた
  atk: 1.3,
} as const;

/**
 * 乱数の振れ幅（会心・ダメージの揺れ・精鋭）。RunConfig.luck で上書きできる（テストでは NO_LUCK）
 */
export interface LuckRules {
  /** 各段で会心になる確率 */
  critChance: number;
  critMult: number;
  /** ダメージの揺れ（±割合） */
  damageVariance: number;
  /** 雑魚が精鋭になる確率（1周目）。周回ごとに perLoop 足し、max で止める */
  eliteChance: number;
  eliteChancePerLoop: number;
  eliteChanceMax: number;
}

export const LUCK: LuckRules = {
  critChance: 0.08,
  critMult: 2,
  damageVariance: 0.1,
  eliteChance: 0.06,
  eliteChancePerLoop: 0.02,
  eliteChanceMax: 0.2,
};

export const NO_LUCK: LuckRules = {
  ...LUCK,
  critChance: 0,
  damageVariance: 0,
  eliteChance: 0,
  eliteChancePerLoop: 0,
};

export type EliteId = 'tough' | 'swift' | 'golden';

/** 精鋭の性質（1つの群れに1体まで。ボス・取り巻きはならない） */
export const ELITES: Record<
  EliteId,
  { name: string; weight: number; hp: number; interval: number; atk: number; drops: number }
> = {
  tough: { name: '硬い', weight: 4, hp: 3, interval: 1, atk: 1, drops: 1 },
  swift: { name: '速い', weight: 4, hp: 1.5, interval: 0.5, atk: 1, drops: 1 },
  golden: { name: '金ぴか', weight: 2, hp: 2, interval: 1, atk: 1, drops: 2 }, // 必ず落とし、レア以上
};

export const BOSS = {
  ironKnightThreshold: 120, // 一撃120未満のダメージを無効（200だと特定の組み方しか通らなかった）
  // 取り巻きの数と呼ぶ間隔は敵の定義（escortCount / summonInterval）。初回はまとめて呼ぶ
  regenPerSec: 0.02, // 呪術王: 毎秒、最大HPの2%を回復
  enrageAt: 0.5, // ゴーレム: HPがこの割合を切ると
  enrageInterval: 0.5, // 攻撃間隔×0.5
  enrageAtk: 1.3, // 攻撃力×1.3
} as const;

/** ラン中の時間延長（基本の出撃時間は SIM.runDuration） */
export const TIME_BONUS = {
  boss: 8, // ボス撃破
  sweep: 1.5, // 1回の連鎖で群れを丸ごと倒した（一網打尽）
  /** 強化・延長をすべて込みにした出撃時間の上限（秒）。上限なし（以前は60秒） */
  maxRunTime: Number.POSITIVE_INFINITY,
} as const;

export const CONSUMABLE = {
  timeStopDuration: 3,
  healAmount: 40,
  timeSandSeconds: 5, // 時の砂
  bombDamage: 60, // 爆弾（攻撃倍率の強化が乗る）
  critUpChance: 0.3, // 幸運の硬貨
  critUpDuration: 8,
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
  bossDrops: 2, // ボスは戦利品を2個落とす（序盤の伸びを早める）
  /** アーティファクトが出る確率（1回のドロップごと。ボス・金ぴかの精鋭は rareOrBetter） */
  artifactChance: 0.0005,
  artifactChanceRare: 0.002,
  artifactSell: 1000,
  originMinExits: 1, // 起点石は出口0を出さない（連鎖を始められないため）
  /** 起点石はレアリティ＝出口の数（コモン1・レア2・エピック3・レジェンダリー4）。ATK を持たないので、違いを出口の数で出す */
  originExits: { common: 1, rare: 2, epic: 3, legendary: 4 },
} as const;

/**
 * 合成: 同じ装備・同じレアリティを3つで、1つ上のレアリティに（追加効果・出口は振り直し）。
 * 上のレアリティほど成功しにくい。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入る
 */
export const SYNTH = {
  count: 3,
  cost: { common: 20, rare: 100, epic: 500 } as Record<'common' | 'rare' | 'epic', number>,
  successRate: { common: 0.8, rare: 0.5, epic: 0.25 } as Record<'common' | 'rare' | 'epic', number>,
} as const;

export const ECONOMY = {
  specifyCostMult: 5,
  rerollCostGrowth: 1.5,
  /** アーティファクトの付け直し（レジェンダリー250Gの上） */
  artifactReroll: 1000,
} as const;

export type UpgradeId =
  'maxHp' | 'atb' | 'attack' | 'runTime' | 'backpack' | 'consumableSlots' | 'storage';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  effect: number;
  baseCost: number;
  growth: number;
  maxLevel: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  maxHp: { id: 'maxHp', name: '最大HP', effect: 10, baseCost: 50, growth: 1.4, maxLevel: 10 },
  atb: { id: 'atb', name: '攻撃間隔', effect: 0.05, baseCost: 80, growth: 1.6, maxLevel: 10 }, // 1.5→1.0秒
  attack: { id: 'attack', name: '攻撃倍率', effect: 0.05, baseCost: 60, growth: 1.3, maxLevel: 20 },
  runTime: { id: 'runTime', name: '出撃時間', effect: 2, baseCost: 300, growth: 2.0, maxLevel: 5 }, // +2秒×5（300→600→…と倍々）
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
  /** 地域の★: この周目のボスを倒すと（＝その次の周目に着くと）★1つ */
  starLoops: [3, 6, 10],
  /** ★1つあたりの永続ボーナス */
  starAttack: 0.03,
  starHp: 5,
  /** ボスを倒したときのゴールド（地域の goldPerKill の何倍か） */
  bossGold: 25,
} as const;

export const UI = {
  maxDamageNumbers: 50,
  maxEffects: 200,
  maxEnemies: 24,
  previewBudgetMs: 100,
} as const;

/** 報酬つき広告（見たいときだけ）とプレミアム（買い切り） */
export const MONETIZE = {
  /** 1日に見られる回数（プレミアムは広告なしで同じ回数だけ受け取れる） */
  dailyCaps: { extraLoot: 3, smithReroll: 3 } as Record<'extraLoot' | 'smithReroll', number>,
  /** 力尽きたときの再開: 1ランに1回、HP全回復＋この秒数 */
  reviveSeconds: 10,
  premiumPrice: '480円',
} as const;
