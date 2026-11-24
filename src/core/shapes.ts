// Trial 「拾って組む」: gear with a size. A piece covers w × h cells of a plain board (its uid is
// written in each one); the chain rings it once and leads on from its whole outline. Only the
// trial's board uses this — every other board keeps one piece per cell. Pure: no Phaser.
import { getItemDef } from '../data/items';
import type { ItemInstance, Loadout } from './types';

export interface Shape {
  w: number;
  h: number;
}

/** Most pieces are one cell; long weapons and staffs two; the big shields and armor 2 × 2 */
const SHAPES: Record<string, Shape> = {
  // Wide (2 × 1)
  greatsword: { w: 2, h: 1 },
  war_axe: { w: 2, h: 1 },
  hammer: { w: 2, h: 1 },
  sky_hammer: { w: 2, h: 1 },
  holy_sword: { w: 2, h: 1 },
  twin_blades: { w: 2, h: 1 },
  // Tall (1 × 2)
  spear: { w: 1, h: 2 },
  thunder_spear: { w: 1, h: 2 },
  bow: { w: 1, h: 2 },
  flame_staff: { w: 1, h: 2 },
  thunder_staff: { w: 1, h: 2 },
  storm_staff: { w: 1, h: 2 },
  sun_staff: { w: 1, h: 2 },
  dark_staff: { w: 1, h: 2 },
  frost_staff: { w: 1, h: 2 },
  venom_staff: { w: 1, h: 2 },
  raincloud_staff: { w: 1, h: 2 },
  chainmail: { w: 1, h: 2 },
  // Big (2 × 2)
  tower_shield: { w: 2, h: 2 },
  steel_armor: { w: 2, h: 2 },
};

const ONE: Shape = { w: 1, h: 1 };

export function shapeOf(defId: string): Shape {
  return SHAPES[defId] ?? ONE;
}

/** An empty plain board (no stacks, no holes) of the given size */
export function emptyShapeBoard(width: number, height: number): Loadout {
  return {
    width,
    height,
    cells: new Array<string | null>(width * height).fill(null),
    originOrder: [],
    consumables: [],
  };
}

/** The cells a piece covers when its top-left is at `cell` (null: it would stick out) */
export function coverCells(l: Loadout, defId: string, cell: number): number[] | null {
  const { w, h } = shapeOf(defId);
  const x = cell % l.width;
  const y = Math.floor(cell / l.width);
  if (cell < 0 || x + w > l.width || y + h > l.height) return null;
  const out: number[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push(cell + dy * l.width + dx);
  return out;
}

/**
 * The top-left cell for a piece dropped on `cell`: the dropped cell is its top-left, moved back
 * inside the board when it would stick out to the right or bottom
 */
export function anchorFor(l: Loadout, defId: string, cell: number): number {
  const { w, h } = shapeOf(defId);
  const x = Math.min(cell % l.width, l.width - w);
  const y = Math.min(Math.floor(cell / l.width), l.height - h);
  return y * l.width + x;
}

export type ShapeBlock = 'space' | 'origin';

const isOrigin = (items: ReadonlyMap<string, ItemInstance>, uid: string) =>
  getItemDef(items.get(uid)!.defId).kind === 'origin';

/** originOrder kept to the origins on the board (those already there first, in their order) */
function syncOrigins(l: Loadout, items: ReadonlyMap<string, ItemInstance>): void {
  const on = [...new Set(l.cells.filter((u): u is string => !!u && isOrigin(items, u)))];
  l.originOrder = [
    ...l.originOrder.filter((u) => on.includes(u)),
    ...on.filter((u) => !l.originOrder.includes(u)),
  ];
}

/** Take a piece off the board (every cell it covered is empty again) */
export function takeShaped(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
): Loadout {
  const out = { ...l, cells: l.cells.map((u) => (u === uid ? null : u)) };
  syncOrigins(out, items);
  return out;
}

/**
 * Put a piece on the board at `cell` (moved in to fit). It may move within the board; it needs
 * every cell it covers free (or its own), and one origin stone at most on the board
 */
export function putShaped(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
  cell: number,
): { loadout: Loadout; block: ShapeBlock | null } {
  const it = items.get(uid);
  if (!it) return { loadout: l, block: null };
  const cover = coverCells(l, it.defId, anchorFor(l, it.defId, cell));
  if (!cover || cover.some((c) => l.cells[c] !== null && l.cells[c] !== uid))
    return { loadout: l, block: 'space' };
  const others = l.cells.filter((u): u is string => !!u && u !== uid);
  if (isOrigin(items, uid) && others.some((u) => isOrigin(items, u)))
    return { loadout: l, block: 'origin' };
  const out = takeShaped(l, items, uid);
  for (const c of cover) out.cells[c] = uid;
  syncOrigins(out, items);
  return { loadout: out, block: null };
}

/**
 * Each piece's cells, when some piece covers more than one (null: one piece per cell, as on every
 * board but the trial's)
 */
export function footprints(l: Loadout): Map<string, number[]> | null {
  const m = new Map<string, number[]>();
  let multi = false;
  l.cells.forEach((u, i) => {
    if (!u) return;
    const a = m.get(u);
    if (a) {
      a.push(i);
      multi = true;
    } else m.set(u, [i]);
  });
  return multi ? m : null;
}
