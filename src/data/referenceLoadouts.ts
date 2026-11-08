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
  runTime: 0, // 参考配置は出撃時間の強化なし（延長はボス・一網打尽だけ）
  backpack: 0,
  consumableSlots: 0,
  storage: 0,
} as const;

type Cell = readonly [number, number];

/**
 * 連鎖の通り道。各マスの出口を次のマスへ向ける。
 * from を指定すると、すでに置いたマスから枝分かれする（そのマスに出口を1つ足す）。
 */
interface PathSpec {
  from?: Cell;
  steps: readonly (readonly [number, number, string])[]; // [x, y, defId]。from がなければ先頭は起点
}

export interface ReferenceLoadout {
  id: 'single' | 'multi' | 'mixed';
  name: string;
  width: number;
  height: number;
  paths: readonly PathSpec[];
}

// prettier-ignore
export const REFERENCE_LOADOUTS: readonly ReferenceLoadout[] = [
  {
    // 一本型: 起点1個。攻撃装備をすべて一本につなぎ、コンボは高い段数で決める。防具は脇の枝に置く
    id: 'single',
    name: '一本型',
    width: 5,
    height: 4,
    paths: [
      { steps: [[0, 0, 'origin_stone'], [1, 0, 'axe'], [2, 0, 'sword'], [3, 0, 'spear'], [4, 0, 'axe'],
        [4, 1, 'ice_sword'], [3, 1, 'canteen'], [2, 1, 'greatsword'], [1, 1, 'hammer'], [0, 1, 'thunder_staff']] },
      { from: [4, 1], steps: [[4, 2, 'chainmail']] },
      { from: [3, 1], steps: [[3, 2, 'wood_shield']] },
    ],
  },
  {
    // 複数型: 起点3個。それぞれ短い連鎖
    id: 'multi',
    name: '複数型',
    width: 5,
    height: 4,
    paths: [
      { steps: [[0, 0, 'origin_stone'], [1, 0, 'axe'], [2, 0, 'canteen'], [3, 0, 'thunder_staff'], [4, 0, 'chainmail']] },
      { steps: [[0, 1, 'origin_stone'], [1, 1, 'spear'], [2, 1, 'ice_sword'], [3, 1, 'hammer']] },
      { steps: [[0, 2, 'origin_stone'], [1, 2, 'axe'], [2, 2, 'sword'], [3, 2, 'greatsword'], [4, 2, 'wood_shield']] },
    ],
  },
  {
    // 混合型: 短い連鎖で群れを払いつつ濡らし、長い連鎖の雷で感電させる（連鎖をまたいだコンボ）
    id: 'mixed',
    name: '混合型',
    width: 5,
    height: 4,
    paths: [
      { steps: [[0, 0, 'origin_stone'], [1, 0, 'axe'], [2, 0, 'canteen']] },
      { steps: [[0, 1, 'origin_stone'], [1, 1, 'axe'], [2, 1, 'spear'], [3, 1, 'sword'], [4, 1, 'ice_sword'],
        [4, 2, 'greatsword'], [3, 2, 'hammer'], [2, 2, 'thunder_staff'], [1, 2, 'chainmail'], [0, 2, 'wood_shield']] },
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
  const at = (c: Cell): ItemInstance => {
    const uid = cells[c[1] * ref.width + c[0]];
    const it = uid ? items.get(uid) : undefined;
    if (!it) throw new Error(`reference ${ref.id}: no item at ${c.join(',')}`);
    return it;
  };
  for (const path of ref.paths) {
    let prev: Cell | null = path.from ?? null;
    path.steps.forEach(([x, y, defId], i) => {
      const cell: Cell = [x, y];
      const slot = pool.find((p) => !p.used && p.defId === defId);
      if (!slot) throw new Error(`reference ${ref.id}: ${defId} is not in the reference set`);
      slot.used = true;
      if (cells[y * ref.width + x])
        throw new Error(`reference ${ref.id}: cell ${x},${y} is used twice`);
      const inst: ItemInstance = {
        uid: slot.uid,
        defId,
        rarity: slot.rarity,
        exits: [],
        rerollCount: 0,
      };
      items.set(slot.uid, inst);
      cells[y * ref.width + x] = slot.uid;
      if (prev) at(prev).exits.push(dirTo(prev, cell));
      else if (i === 0) originOrder.push(slot.uid);
      prev = cell;
    });
  }
  // 置かなかった装備も一式の数を合わせるために持つ（配置はしない）
  for (const p of pool) {
    if (!p.used)
      items.set(p.uid, { uid: p.uid, defId: p.defId, rarity: p.rarity, exits: [], rerollCount: 0 });
  }
  return {
    loadout: { width: ref.width, height: ref.height, cells, originOrder, consumables: [] },
    items,
  };
}
