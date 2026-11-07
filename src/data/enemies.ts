// 敵の定義（仕様書 第4章）

export type EnemyAbility = 'none' | 'summonEscorts' | 'damageThreshold';

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  interval: number; // 攻撃間隔（秒）
  backRow: boolean; // 後列。薙ぎ払い・全体攻撃でしか先に狙えない
  boss: boolean;
  ability: EnemyAbility;
  dropRate: number;
  color: number; // 仮素材の色
  size: number; // 仮素材の大きさ（px）
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  slime: {
    id: 'slime',
    name: 'スライム',
    hp: 30,
    atk: 4,
    interval: 1.5,
    backRow: false,
    boss: false,
    ability: 'none',
    dropRate: 0.1,
    color: 0x5ad16a,
    size: 30,
  },
  bat: {
    id: 'bat',
    name: 'コウモリ',
    hp: 15,
    atk: 3,
    interval: 0.8,
    backRow: false,
    boss: false,
    ability: 'none',
    dropRate: 0.05,
    color: 0x8a6ad1,
    size: 26,
  },
  goblin: {
    id: 'goblin',
    name: 'ゴブリン',
    hp: 60,
    atk: 8,
    interval: 2.0,
    backRow: false,
    boss: false,
    ability: 'none',
    dropRate: 0.2,
    color: 0x6aa04a,
    size: 36,
  },
  armor: {
    id: 'armor',
    name: '甲冑兵',
    hp: 250,
    atk: 12,
    interval: 2.5,
    backRow: false,
    boss: false,
    ability: 'none',
    dropRate: 0.4,
    color: 0x8a96a8,
    size: 42,
  },
  sorcerer: {
    id: 'sorcerer',
    name: '呪術師',
    hp: 40,
    atk: 10,
    interval: 3.0,
    backRow: true,
    boss: false,
    ability: 'none',
    dropRate: 0.3,
    color: 0xc0508a,
    size: 34,
  },

  big_slime: {
    id: 'big_slime',
    name: '大スライム',
    hp: 800,
    atk: 10,
    interval: 1.5,
    backRow: false,
    boss: true,
    ability: 'none',
    dropRate: 1,
    color: 0x3ab84a,
    size: 80,
  },
  goblin_king: {
    id: 'goblin_king',
    name: 'ゴブリン王',
    hp: 1500,
    atk: 14,
    interval: 2.0,
    backRow: false,
    boss: true,
    ability: 'summonEscorts',
    dropRate: 1,
    color: 0xd0a030,
    size: 84,
  },
  iron_knight: {
    id: 'iron_knight',
    name: '鉄の騎士',
    hp: 3000,
    atk: 18,
    interval: 2.5,
    backRow: false,
    boss: true,
    ability: 'damageThreshold',
    dropRate: 1,
    color: 0x5a6a80,
    size: 88,
  },

  // 試し撃ち用のカカシ（HP無限、攻撃しない）
  scarecrow: {
    id: 'scarecrow',
    name: 'カカシ',
    hp: Number.POSITIVE_INFINITY,
    atk: 0,
    interval: 1,
    backRow: false,
    boss: false,
    ability: 'none',
    dropRate: 0,
    color: 0xc8a060,
    size: 40,
  },
};

export const SCARECROW_ID = 'scarecrow';

// ゴブリン王が呼ぶ取り巻き（戦利品を落とさない）
export const ESCORT_ID = 'goblin';

export const BOSS_TRAITS: Record<string, string> = {
  big_slime: '単体、特殊能力なし（どちらの構成でも可）',
  goblin_king: '取り巻きゴブリンを常に4体呼ぶ（短い連鎖の複数・薙ぎ払いが有利）',
  iron_knight: '一撃200未満のダメージを無効（一本の長い連鎖が有利）',
};

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMY_DEFS[id];
  if (!def) throw new Error(`unknown enemy: ${id}`);
  return def;
}
