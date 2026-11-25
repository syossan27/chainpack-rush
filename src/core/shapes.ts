// Trial 「拾って組む」: gear with a shape. A piece covers the X cells of its mask on a plain board
// (its uid is written in each one); the chain rings it once. Each arrow leaves from one set cell of
// the piece (its port for that direction), so where an arrow comes out is part of the piece. Only
// the trial's board uses this — every other board keeps one piece per cell. Pure: no Phaser.
import { getItemDef } from '../data/items';
import type { Dir, ItemInstance, Loadout } from './types';

export interface ShapeDef {
  /** Rows: X is a cell of the piece, . is not */
  mask: readonly string[];
  /** For each direction, the piece's cell the arrow leaves from (index among its X cells, row by row) */
  ports: Readonly<Record<Dir, number>>;
}

/** The shapes (cells are numbered row by row; ports point outside the piece) */
const SHAPE: Record<string, ShapeDef> = {
  one: { mask: ['X'], ports: { up: 0, right: 0, down: 0, left: 0 } },
  // ■■ : arrows up and down from the tip (right cell)
  bar2: { mask: ['XX'], ports: { up: 1, right: 1, down: 1, left: 0 } },
  // ■■ : up from the left cell, down from the right cell
  twin: { mask: ['XX'], ports: { up: 0, right: 1, down: 1, left: 0 } },
  // ■■■ : a long blade, sideways arrows from the tip
  bar3: { mask: ['XXX'], ports: { up: 2, right: 2, down: 2, left: 0 } },
  // a staff: the head on top gives the side arrows
  staff: { mask: ['X', 'X'], ports: { up: 0, right: 0, down: 1, left: 0 } },
  // a bow: left from the top, right from the bottom
  bow: { mask: ['X', 'X'], ports: { up: 0, right: 1, down: 1, left: 0 } },
  // a spear: three tall, everything but down from the point
  spear: { mask: ['X', 'X', 'X'], ports: { up: 0, right: 0, down: 2, left: 0 } },
  // ■■ / ■. : an axe head
  axe: { mask: ['XX', 'X.'], ports: { up: 1, right: 1, down: 2, left: 0 } },
  // ■. / ■■ : a ball on a chain
  ball: { mask: ['X.', 'XX'], ports: { up: 0, right: 2, down: 2, left: 1 } },
  // ■■■ / .■. : a hammer head on its handle
  hammer: { mask: ['XXX', '.X.'], ports: { up: 1, right: 2, down: 3, left: 0 } },
  // 2 × 2 : one arrow from each corner, going round
  block: { mask: ['XX', 'XX'], ports: { up: 0, right: 1, down: 3, left: 2 } },
  // ■■ / ■■ / .. : armor (2 wide, 2 tall) with the head on top
  vest: { mask: ['XX', 'XX'], ports: { up: 1, right: 3, down: 2, left: 0 } },
};

/** Which shape each piece has (absent: one cell) */
const BY_DEF: Record<string, keyof typeof SHAPE> = {
  greatsword: 'bar2',
  twin_blades: 'twin',
  holy_sword: 'bar3',
  war_axe: 'axe',
  hammer: 'hammer',
  sky_hammer: 'hammer',
  iron_ball: 'ball',
  spear: 'spear',
  thunder_spear: 'spear',
  bow: 'bow',
  flame_staff: 'staff',
  thunder_staff: 'staff',
  storm_staff: 'staff',
  sun_staff: 'staff',
  dark_staff: 'staff',
  frost_staff: 'staff',
  venom_staff: 'staff',
  raincloud_staff: 'staff',
  chainmail: 'staff',
  tower_shield: 'block',
  steel_armor: 'vest',
};

export function shapeOf(defId: string): ShapeDef {
  return SHAPE[BY_DEF[defId] ?? 'one']!;
}

/** Every shape in use (for checks) */
export function allShapes(): ShapeDef[] {
  return Object.values(SHAPE);
}

/** The piece's bounding box */
export function shapeSize(defId: string): { w: number; h: number } {
  const { mask } = shapeOf(defId);
  return { w: mask[0]!.length, h: mask.length };
}

/** The piece's cells as [dx, dy] from its top-left, row by row */
export function shapeOffsets(defId: string): [number, number][] {
  const out: [number, number][] = [];
  shapeOf(defId).mask.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch === 'X') out.push([dx, dy]);
    }),
  );
  return out;
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

/** The cells a piece covers when its top-left (of its box) is at `cell` (null: it would stick out) */
export function coverCells(l: Loadout, defId: string, cell: number): number[] | null {
  const { w, h } = shapeSize(defId);
  const x = cell % l.width;
  const y = Math.floor(cell / l.width);
  if (cell < 0 || x + w > l.width || y + h > l.height) return null;
  return shapeOffsets(defId).map(([dx, dy]) => cell + dy * l.width + dx);
}

/**
 * The top-left cell for a piece dropped on `cell`: the dropped cell is its top-left, moved back
 * inside the board when it would stick out to the right or bottom
 */
export function anchorFor(l: Loadout, defId: string, cell: number): number {
  const { w, h } = shapeSize(defId);
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

/** The top-left cell of a piece's box on the board (-1: not on it) */
export function boxCorner(l: Loadout, uid: string): number {
  const at = l.cells.flatMap((u, i) => (u === uid ? [i] : []));
  if (at.length === 0) return -1;
  const x = Math.min(...at.map((i) => i % l.width));
  const y = Math.min(...at.map((i) => Math.floor(i / l.width)));
  return y * l.width + x;
}

/**
 * Put a piece at `cell` over whatever is there. The pieces it lands on come off the board; when it
 * moved from elsewhere on the board and lands on one piece, that piece takes its old place (a swap)
 * if it fits there. `displaced`: the pieces left off the board (for the hand)
 */
export function placeOver(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
  cell: number,
): { loadout: Loadout; displaced: string[]; block: ShapeBlock | null } {
  const it = items.get(uid);
  if (!it) return { loadout: l, displaced: [], block: null };
  const cover = coverCells(l, it.defId, anchorFor(l, it.defId, cell));
  if (!cover) return { loadout: l, displaced: [], block: 'space' };
  const hit = [...new Set(cover.map((c) => l.cells[c]))].filter(
    (u): u is string => !!u && u !== uid,
  );
  const stays = l.cells.filter((u): u is string => !!u && u !== uid && !hit.includes(u));
  if (isOrigin(items, uid) && stays.some((u) => isOrigin(items, u)))
    return { loadout: l, displaced: [], block: 'origin' };
  const from = boxCorner(l, uid);
  const cleared = hit.reduce((acc, u) => takeShaped(acc, items, u), l);
  const placed = putShaped(cleared, items, uid, cell).loadout;
  if (from >= 0 && hit.length === 1) {
    const swap = putShaped(placed, items, hit[0]!, from);
    if (!swap.block) return { loadout: swap.loadout, displaced: [], block: null };
  }
  return { loadout: placed, displaced: hit, block: null };
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

/** The cell an arrow leaves a piece from: its port for that direction (cells as on the board) */
export function portCell(defId: string, cells: readonly number[], dir: Dir): number {
  return cells[shapeOf(defId).ports[dir]] ?? cells[0]!;
}
