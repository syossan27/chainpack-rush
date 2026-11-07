// 地域ごとの雑魚配置・ボスの出現順（仕様書 第4章）
// 位置は周回の起点からの距離（px）。ランダムにせず、事前の敵情報と一致させる。

export interface EnemyGroup {
  x: number;
  enemies: string[];
}

export interface RegionDef {
  id: string;
  name: string;
  mobTrend: string;
  groups: EnemyGroup[];
  bossX: number;
  bosses: string[]; // 1→2→3周目。4周目以降は繰り返し
  bgColors: [number, number, number]; // 仮背景（奥→手前）
  groundColor: number;
}

// 群れは4〜6体。前後2列×横80pxで並ぶ（4体=2列、5〜6体=3列）。
// 前の群れの最後尾から次の群れの先頭まで 240px 以上空ける（tests/regions.test.ts で検証）。
export const REGIONS: readonly RegionDef[] = [
  {
    id: 'grassland',
    name: '草原',
    mobTrend: 'スライム、ゴブリン（チュートリアル）',
    groups: [
      { x: 320, enemies: ['slime', 'slime', 'slime', 'slime', 'slime'] },
      { x: 720, enemies: ['goblin', 'goblin', 'slime', 'slime'] },
    ],
    bossX: 1040,
    bosses: ['big_slime', 'goblin_king', 'iron_knight'],
    bgColors: [0x7ec8f0, 0x6ab070, 0x4a9050],
    groundColor: 0x6b4a2a,
  },
  {
    id: 'cave',
    name: '洞窟',
    mobTrend: 'コウモリ、呪術師（群れが多い）',
    groups: [
      { x: 320, enemies: ['bat', 'bat', 'bat', 'bat'] },
      { x: 640, enemies: ['bat', 'bat', 'bat', 'sorcerer'] },
      { x: 960, enemies: ['bat', 'bat', 'bat', 'bat'] },
      { x: 1280, enemies: ['bat', 'bat', 'bat', 'sorcerer'] },
    ],
    bossX: 1600,
    bosses: ['goblin_king', 'big_slime', 'goblin_king'],
    bgColors: [0x1c1828, 0x2c2638, 0x3c3448],
    groundColor: 0x3a3040,
  },
  {
    id: 'rampart',
    name: '城壁',
    mobTrend: '甲冑兵、ゴブリン（硬い）',
    groups: [
      { x: 320, enemies: ['goblin', 'goblin', 'goblin', 'goblin'] },
      { x: 640, enemies: ['armor', 'goblin', 'goblin', 'goblin'] },
    ],
    bossX: 960,
    bosses: ['iron_knight', 'goblin_king', 'iron_knight'],
    bgColors: [0x9ab0c8, 0x7a8090, 0x5a6070],
    groundColor: 0x6a6a70,
  },
];

/** 群れの横幅（先頭から最後尾まで） */
export function groupSpan(group: EnemyGroup, rows: number, spacing: number): number {
  return (Math.ceil(group.enemies.length / rows) - 1) * spacing;
}

export function getRegion(id: string): RegionDef {
  const r = REGIONS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown region: ${id}`);
  return r;
}

export function bossForLoop(region: RegionDef, loop: number): string {
  return region.bosses[(loop - 1) % region.bosses.length]!;
}
