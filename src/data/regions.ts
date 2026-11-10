// 地域ごとの雑魚の出方・ボスの候補（仕様書 第4章を、周回ごとに抽選する形へ広げた）
// 群れの中身・数・間隔と、各周回のボスは出撃ごとに抽選する（src/core/layout.ts）。
// 地域選択には「出てくる雑魚」と「周回ごとのボス候補」を見せる。

export interface MobEntry {
  id: string;
  weight: number;
  /** 1つの群れに入れる上限（重い雑魚・後列） */
  maxPerGroup?: number;
}

export interface RegionDef {
  id: string;
  name: string;
  mobTrend: string;
  mobs: MobEntry[];
  /** 1周あたりの群れの数 */
  groupCount: number;
  /** 群れの大きさ（両端を含む。4〜6） */
  groupSize: [number, number];
  /** 周回ごとのボス候補（1周目, 2周目, 3周目…。最後の候補は4周目以降も使う） */
  bossPools: string[][];
  /** 敵の強さの倍率（周回の伸びに掛ける。奥の地域ほど一気に強い） */
  power: { hp: number; atk: number };
  /** 戦利品: コモンからレア以上へ回す割合（周回の分に足す）と、アーティファクトの出やすさの倍率 */
  loot: { rarityShift: number; artifactMult: number };
  bgColors: [number, number, number]; // 仮背景（奥→手前）
  groundColor: number;
  /** 敵を1体倒すごとのゴールド（ボスは ×PROGRESS.bossGold）。奥の地域ほど多い */
  goldPerKill: number;
  /** 敵の得意・苦手のひとこと（地域選択に出す） */
  resistNote?: string;
}

export const REGIONS: readonly RegionDef[] = [
  {
    id: 'grassland',
    name: '草原',
    mobTrend: 'スライム、ゴブリン、狼',
    mobs: [
      { id: 'slime', weight: 5 },
      { id: 'goblin', weight: 2 },
      { id: 'wolf', weight: 2 },
    ],
    groupCount: 2,
    groupSize: [4, 5],
    bossPools: [
      ['big_slime', 'slime_mother'],
      ['goblin_king', 'slime_mother'],
      ['iron_knight', 'golem'],
    ],
    power: { hp: 1, atk: 1 },
    goldPerKill: 1,
    loot: { rarityShift: 0, artifactMult: 1 },
    bgColors: [0x7ec8f0, 0x6ab070, 0x4a9050],
    groundColor: 0x6b4a2a,
  },
  {
    id: 'cave',
    name: '洞窟',
    mobTrend: 'コウモリ、骸骨、呪術師（群れが多い）',
    mobs: [
      { id: 'bat', weight: 6 },
      { id: 'skeleton', weight: 2 },
      { id: 'sorcerer', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 4,
    groupSize: [4, 5],
    bossPools: [
      ['bat_queen', 'big_slime'],
      ['goblin_king', 'lich'],
      ['lich', 'bat_queen', 'golem'],
    ],
    power: { hp: 2.5, atk: 1.8 },
    goldPerKill: 2,
    loot: { rarityShift: 0.2, artifactMult: 2 },
    bgColors: [0x1c1828, 0x2c2638, 0x3c3448],
    groundColor: 0x3a3040,
  },
  {
    id: 'rampart',
    name: '城壁',
    mobTrend: '甲冑兵、ゴブリン、骸骨（硬い）',
    mobs: [
      { id: 'goblin', weight: 4 },
      { id: 'armor', weight: 1, maxPerGroup: 1 },
      { id: 'wolf', weight: 2 },
      { id: 'skeleton', weight: 2 },
    ],
    groupCount: 2,
    groupSize: [4, 6],
    bossPools: [
      // 1周目は中くらいのボス、強いボス（鉄の騎士・ゴーレム）は2周目から
      ['goblin_king', 'bat_queen'],
      ['iron_knight', 'golem'],
      ['iron_knight', 'golem', 'lich'],
    ],
    power: { hp: 5, atk: 2.7 },
    goldPerKill: 3,
    loot: { rarityShift: 0.4, artifactMult: 4 },
    bgColors: [0x9ab0c8, 0x7a8090, 0x5a6070],
    groundColor: 0x6a6a70,
  },
  {
    id: 'volcano',
    name: '火山',
    mobTrend: '火トカゲ、溶岩スライム、火の精',
    resistNote: '炎が効きにくい・氷と水が弱点',
    mobs: [
      { id: 'fire_lizard', weight: 5 },
      { id: 'magma_slime', weight: 2 },
      { id: 'fire_spirit', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 3,
    groupSize: [4, 5],
    bossPools: [
      ['lava_giant', 'bat_queen'],
      ['fire_dragon', 'lava_giant'],
      ['fire_dragon', 'lava_giant', 'golem'],
    ],
    power: { hp: 7, atk: 3.5 },
    goldPerKill: 6,
    loot: { rarityShift: 0.55, artifactMult: 6 },
    bgColors: [0x3a1a1a, 0x6a2a1a, 0x8a3a1a],
    groundColor: 0x2a1a14,
  },
  {
    id: 'glacier',
    name: '氷河',
    mobTrend: '氷の狼、雪だるま、雪男（速い）',
    resistNote: '氷が効きにくい・炎が弱点',
    mobs: [
      { id: 'ice_wolf', weight: 5 },
      { id: 'snowman', weight: 3 },
      { id: 'yeti', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 3,
    groupSize: [4, 6],
    bossPools: [
      ['ice_queen', 'lich'],
      ['mammoth', 'ice_queen'],
      ['mammoth', 'ice_queen', 'fire_dragon'],
    ],
    power: { hp: 10, atk: 4.5 },
    goldPerKill: 10,
    loot: { rarityShift: 0.65, artifactMult: 8 },
    bgColors: [0xc8e8f8, 0xa0c8e0, 0x80a8c8],
    groundColor: 0xd8e4f0,
  },
  {
    id: 'demon_castle',
    name: '魔王城',
    mobTrend: '小悪魔、ガーゴイル、闇の魔導士',
    resistNote: '物理と炎が効きにくい・雷が弱点（ガーゴイルは打撃が弱点）',
    mobs: [
      { id: 'imp', weight: 5 },
      { id: 'gargoyle', weight: 2, maxPerGroup: 2 },
      { id: 'dark_mage', weight: 1, maxPerGroup: 1 },
    ],
    groupCount: 3,
    groupSize: [5, 6],
    bossPools: [['dark_knight', 'ice_queen'], ['dark_knight', 'mammoth'], ['demon_lord']],
    power: { hp: 14, atk: 5.5 },
    goldPerKill: 15,
    loot: { rarityShift: 0.75, artifactMult: 10 },
    bgColors: [0x1a1020, 0x2a1830, 0x3a2040],
    groundColor: 0x2a2030,
  },
];

export function getRegion(id: string): RegionDef {
  const r = REGIONS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown region: ${id}`);
  return r;
}

/** その周回のボス候補 */
export function bossPoolForLoop(region: RegionDef, loop: number): string[] {
  const pools = region.bossPools;
  return pools[Math.min(loop, pools.length) - 1]!;
}

/** 地域に出てくるボス（重複なし、出てくる順） */
export function regionBosses(region: RegionDef): string[] {
  return [...new Set(region.bossPools.flat())];
}
