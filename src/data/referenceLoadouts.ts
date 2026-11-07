// バランス検証用の参考配置（仕様書 第9章 受け入れ基準3）
// 3つの型はすべて同じ装備一式（種類・レアリティ）を使い、並べ方と出口の向きだけが違う。
import type { Dir, ItemInstance, Loadout, Rarity } from '../core/types';

export const REFERENCE_SET: readonly { defId: string; rarity: Rarity }[] = [
  { defId: 'origin_stone', rarity: 'common' },
  { defId: 'origin_stone', rarity: 'common' },
  { defId: 'origin_stone', rarity: 'common' },
  { defId: 'canteen', rarity: 'epic' },
  { defId: 'thunder_staff', rarity: 'epic' },
  { defId: 'ice_sword', rarity: 'epic' },
  { defId: 'hammer', rarity: 'epic' },
  { defId: 'greatsword', rarity: 'epic' },
  { defId: 'spear', rarity: 'epic' },
  { defId: 'sword', rarity: 'epic' },
  { defId: 'axe', rarity: 'epic' },
  { defId: 'axe', rarity: 'epic' },
  { defId: 'chainmail', rarity: 'rare' },
  { defId: 'wood_shield', rarity: 'rare' },
];

// 標準的な到達状態の永続強化（最大HP・ATB短縮・攻撃倍率を上限まで）
export const REFERENCE_UPGRADES = {
  maxHp: 10,
  atb: 10,
  attack: 20,
  backpack: 0,
  consumableSlots: 0,
  storage: 0,
} as const;

type Cell = readonly [number, number];

/** 連鎖の通り道: 各マスの出口を次のマスへ向ける */
interface PathSpec {
  cells: readonly Cell[];
  defIds: readonly string[]; // 先頭は起点
}

export interface ReferenceLoadout {
  id: 'single' | 'multi' | 'mixed';
  name: string;
  width: number;
  height: number;
  paths: readonly PathSpec[];
}

export const REFERENCE_LOADOUTS: readonly ReferenceLoadout[] = [
  {
    id: 'single',
    name: '一本型',
    width: 5,
    height: 4,
    paths: [
      {
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [4, 0],
          [4, 1],
          [3, 1],
          [2, 1],
          [1, 1],
          [0, 1],
          [0, 2],
          [1, 2],
        ],
        defIds: [
          'origin_stone',
          'axe',
          'sword',
          'spear',
          'axe',
          'ice_sword',
          'canteen',
          'greatsword',
          'hammer',
          'thunder_staff',
          'chainmail',
          'wood_shield',
        ],
      },
    ],
  },
  {
    id: 'multi',
    name: '複数型',
    width: 5,
    height: 4,
    paths: [
      {
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [4, 0],
        ],
        defIds: ['origin_stone', 'axe', 'canteen', 'thunder_staff', 'chainmail'],
      },
      {
        cells: [
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
        ],
        defIds: ['origin_stone', 'spear', 'ice_sword', 'hammer'],
      },
      {
        cells: [
          [0, 2],
          [1, 2],
          [2, 2],
          [3, 2],
          [4, 2],
        ],
        defIds: ['origin_stone', 'axe', 'sword', 'greatsword', 'wood_shield'],
      },
    ],
  },
  {
    id: 'mixed',
    name: '混合型',
    width: 5,
    height: 4,
    paths: [
      // 短: 薙ぎ払いで群れを処理しつつ狙いを濡らす（次の長い連鎖の雷で感電させる仕込み）
      {
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        defIds: ['origin_stone', 'axe', 'canteen'],
      },
      // 長: 凍結→粉砕、濡れ→感電を高い段数で決める
      {
        cells: [
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [4, 2],
          [3, 2],
          [2, 2],
          [1, 2],
          [0, 2],
        ],
        defIds: [
          'origin_stone',
          'axe',
          'spear',
          'sword',
          'ice_sword',
          'greatsword',
          'hammer',
          'thunder_staff',
          'chainmail',
          'wood_shield',
        ],
      },
    ],
  },
];

function dirTo(a: Cell, b: Cell): Dir {
  if (b[0] > a[0]) return 'right';
  if (b[0] < a[0]) return 'left';
  if (b[1] > a[1]) return 'down';
  return 'up';
}

/** 参考配置を Loadout と ItemInstance に展開する。装備一式との一致も検証する */
export function buildReference(ref: ReferenceLoadout): {
  loadout: Loadout;
  items: Map<string, ItemInstance>;
} {
  const pool = REFERENCE_SET.map((x, i) => ({ ...x, uid: `ref${i}`, used: false }));
  const items = new Map<string, ItemInstance>();
  const cells = new Array<string | null>(ref.width * ref.height).fill(null);
  const originOrder: string[] = [];
  for (const path of ref.paths) {
    path.cells.forEach((cell, i) => {
      const defId = path.defIds[i]!;
      const slot = pool.find((p) => !p.used && p.defId === defId);
      if (!slot) throw new Error(`reference ${ref.id}: ${defId} is not in the reference set`);
      slot.used = true;
      const next = path.cells[i + 1];
      const exits: Dir[] = next ? [dirTo(cell, next)] : [];
      items.set(slot.uid, { uid: slot.uid, defId, rarity: slot.rarity, exits, rerollCount: 0 });
      cells[cell[1] * ref.width + cell[0]] = slot.uid;
      if (i === 0) originOrder.push(slot.uid);
    });
  }
  // 置かなかった装備も数を合わせるために持つが、配置はしない
  for (const p of pool) {
    if (!p.used)
      items.set(p.uid, { uid: p.uid, defId: p.defId, rarity: p.rarity, exits: [], rerollCount: 0 });
  }
  return {
    loadout: { width: ref.width, height: ref.height, cells, originOrder, consumables: [] },
    items,
  };
}
