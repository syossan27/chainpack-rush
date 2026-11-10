// バックパックの配置操作（純粋関数。新しい Loadout を返す）
import { getItemDef } from '../data/items';
import type { ItemInstance, Loadout } from './types';

function clone(l: Loadout): Loadout {
  return {
    width: l.width,
    height: l.height,
    cells: l.cells.slice(),
    originOrder: l.originOrder.slice(),
    consumables: l.consumables.slice(),
    ...(l.consumableAuto ? { consumableAuto: l.consumableAuto.slice() } : {}),
  };
}

function syncOrigins(l: Loadout, items: ReadonlyMap<string, ItemInstance>): void {
  const placed = new Set(l.cells.filter((c): c is string => !!c));
  l.originOrder = l.originOrder.filter((u) => placed.has(u));
  for (const c of l.cells) {
    if (!c) continue;
    const it = items.get(c);
    if (it && getItemDef(it.defId).kind === 'origin' && !l.originOrder.includes(c))
      l.originOrder.push(c);
  }
}

/** アイテムをマスへ置く。置き先に別のアイテムがあれば、元の場所と入れ替える（元がなければ外す） */
export function placeItem(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
  cell: number,
): Loadout {
  const it = items.get(uid);
  if (!it || getItemDef(it.defId).kind === 'consumable') return l;
  if (cell < 0 || cell >= l.cells.length) return l;
  const out = clone(l);
  const from = out.cells.indexOf(uid);
  const occupant = out.cells[cell] ?? null;
  if (from >= 0) out.cells[from] = occupant;
  out.cells[cell] = uid;
  syncOrigins(out, items);
  return out;
}

export function removeItem(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
): Loadout {
  const out = clone(l);
  out.cells = out.cells.map((c) => (c === uid ? null : c));
  out.consumables = out.consumables.filter((u) => u !== uid);
  syncOrigins(out, items);
  return out;
}

/** 起点の発火順を入れ替える（タップした起点を1つ前へ。先頭なら末尾へ） */
export function cycleOriginOrder(l: Loadout, uid: string): Loadout {
  const out = clone(l);
  const i = out.originOrder.indexOf(uid);
  if (i < 0 || out.originOrder.length < 2) return out;
  const j = i === 0 ? out.originOrder.length - 1 : i - 1;
  const tmp = out.originOrder[i]!;
  out.originOrder[i] = out.originOrder[j]!;
  out.originOrder[j] = tmp;
  return out;
}

export function setConsumable(
  l: Loadout,
  slot: number,
  uid: string | null,
  maxSlots: number,
): Loadout {
  const out = clone(l);
  const slots: (string | null)[] = [];
  for (let i = 0; i < maxSlots; i++) slots.push(out.consumables[i] ?? null);
  if (uid) {
    const existing = slots.indexOf(uid);
    if (existing >= 0) slots[existing] = null;
  }
  slots[slot] = uid;
  out.consumables = slots.filter((u): u is string => !!u);
  return out;
}

/** 全部外す: バックパックと消耗品枠を空にする（大きさはそのまま） */
export function clearLoadout(l: Loadout): Loadout {
  return {
    width: l.width,
    height: l.height,
    cells: new Array<string | null>(l.cells.length).fill(null),
    originOrder: [],
    consumables: [],
  };
}

/** 拡張時: 既存の配置は同じ (x, y) に残す */
export function resizeLoadout(l: Loadout, width: number, height: number): Loadout {
  const cells = new Array<string | null>(width * height).fill(null);
  for (let y = 0; y < l.height; y++) {
    for (let x = 0; x < l.width; x++) {
      if (x < width && y < height) cells[y * width + x] = l.cells[y * l.width + x] ?? null;
    }
  }
  return { ...clone(l), width, height, cells };
}
