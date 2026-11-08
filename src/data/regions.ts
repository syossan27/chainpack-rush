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
      ['iron_knight', 'golem'],
      ['goblin_king', 'bat_queen'],
      ['iron_knight', 'golem', 'lich'],
    ],
    power: { hp: 6, atk: 3 },
    loot: { rarityShift: 0.4, artifactMult: 4 },
    bgColors: [0x9ab0c8, 0x7a8090, 0x5a6070],
    groundColor: 0x6a6a70,
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
