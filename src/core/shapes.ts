// Gear shapes (2026-11-26). Each piece of gear has a shape, rolled when it is picked up: one cell,
// or several (two in a row, an L, a T …). On the board a piece covers the cells of its shape: its
// uid is written in each one, and the same gear stacked under it is kept in each one's under. The
// chain rings a piece once, at its first cell (row by row); each arrow leaves from one set cell of
// the shape (its port for that direction). A bigger piece hits harder. Pure: no Phaser.
import { SHAPE } from '../config/balance';
import { getItemDef } from '../data/items';
import type { Rng } from './rng';
import type { Dir, ItemInstance, Loadout } from './types';

export type ShapeId =
  'one' | 'bar2' | 'twin' | 'bar3' | 'col2' | 'colx' | 'col3' | 'el' | 'jay' | 'tee' | 'square';

export interface ShapeDef {
  /** Rows: X is a cell of the piece, . is not */
  mask: readonly string[];
  /** For each direction, the piece's cell the arrow leaves from (index among its X cells, row by row) */
  ports: Readonly<Record<Dir, number>>;
}

/** The shapes (cells are numbered row by row; every port points out of the piece) */
export const SHAPES: Record<ShapeId, ShapeDef> = {
  one: { mask: ['X'], ports: { up: 0, right: 0, down: 0, left: 0 } },
  // ■■ : up, right and down from the tip (right cell)
  bar2: { mask: ['XX'], ports: { up: 1, right: 1, down: 1, left: 0 } },
  // ■■ : up from the left cell, down from the right one
  twin: { mask: ['XX'], ports: { up: 0, right: 1, down: 1, left: 0 } },
  // ■■■ : a long blade, the side arrows from the tip
  bar3: { mask: ['XXX'], ports: { up: 2, right: 2, down: 2, left: 0 } },
  // two tall: the side arrows from the head (top)
  col2: { mask: ['X', 'X'], ports: { up: 0, right: 0, down: 1, left: 0 } },
  // two tall: left from the top, right from the bottom
  colx: { mask: ['X', 'X'], ports: { up: 0, right: 1, down: 1, left: 0 } },
  // three tall: all but down from the point (top)
  col3: { mask: ['X', 'X', 'X'], ports: { up: 0, right: 0, down: 2, left: 0 } },
  // ■■ / ■. : up and right from the top right, down from the bottom left
  el: { mask: ['XX', 'X.'], ports: { up: 1, right: 1, down: 2, left: 0 } },
  // ■. / ■■ : up from the top, left from the bottom left, right and down from the bottom right
  jay: { mask: ['X.', 'XX'], ports: { up: 0, right: 2, down: 2, left: 1 } },
  // ■■■ / .■. : up from the head's middle, the sides from its ends, down from the handle
  tee: { mask: ['XXX', '.X.'], ports: { up: 1, right: 2, down: 3, left: 0 } },
  // 2 × 2 : one arrow from each corner, going round
  square: { mask: ['XX', 'XX'], ports: { up: 0, right: 1, down: 3, left: 2 } },
};

export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];

export function isShapeId(v: unknown): v is ShapeId {
  return typeof v === 'string' && v in SHAPES;
}

/** A piece's shape (one cell when it has none) */
export function shapeOf(it: ItemInstance): ShapeDef {
  return SHAPES[it.shape ?? 'one'];
}

/** A shape's cells as [dx, dy] from its top-left, row by row */
export function shapeOffsets(sh: ShapeDef): [number, number][] {
  const out: [number, number][] = [];
  sh.mask.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch === 'X') out.push([dx, dy]);
    }),
  );
  return out;
}

/** A shape's box */
export function shapeBox(sh: ShapeDef): { w: number; h: number } {
  return { w: sh.mask[0]!.length, h: sh.mask.length };
}

/** How many cells a piece covers */
export function shapeCells(it: ItemInstance): number {
  return shapeOffsets(shapeOf(it)).length;
}

// ---- Rolling a shape ----

/** [shape, weight]: what a piece of gear may come as */
type Roll = readonly (readonly [ShapeId, number])[];

const ATTACK: Roll = [
  ['one', 60],
  ['bar2', 12],
  ['col2', 12],
  ['twin', 4],
  ['colx', 4],
  ['el', 4],
  ['jay', 4],
];
const DEFENSE: Roll = [
  ['one', 60],
  ['bar2', 12],
  ['col2', 12],
  ['square', 8],
  ['el', 4],
  ['jay', 4],
];
/** Big weapons: more of the big shapes */
const HEAVY: Roll = [
  ['one', 45],
  ['bar2', 12],
  ['bar3', 10],
  ['tee', 10],
  ['el', 8],
  ['jay', 8],
  ['square', 7],
];
const LONG: Roll = [
  ['one', 45],
  ['col2', 15],
  ['col3', 15],
  ['bar3', 10],
  ['colx', 8],
  ['bar2', 7],
];
const BY_DEF: Record<string, Roll> = {
  greatsword: HEAVY,
  holy_sword: HEAVY,
  war_axe: HEAVY,
  hammer: HEAVY,
  sky_hammer: HEAVY,
  iron_ball: HEAVY,
  spear: LONG,
  thunder_spear: LONG,
  bow: LONG,
};

/** The shapes a piece of gear can come as (origin stones, consumables and artifacts: one cell) */
export function shapeRoll(defId: string): Roll {
  const def = getItemDef(defId);
  if (def.artifact || (def.kind !== 'attack' && def.kind !== 'defense')) return [['one', 1]];
  return BY_DEF[defId] ?? (def.kind === 'defense' ? DEFENSE : ATTACK);
}

/** Roll a shape for gear just picked up (undefined: one cell, the field is left out) */
export function rollShape(rng: Rng, defId: string): ShapeId | undefined {
  const roll = shapeRoll(defId);
  const total = roll.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [id, w] of roll) {
    r -= w;
    if (r < 0) return id === 'one' ? undefined : id;
  }
  return undefined;
}

/** Whether a piece of gear can have this shape (records sent to the ranking) */
export function shapeAllowed(it: ItemInstance): boolean {
  return it.shape === undefined || shapeRoll(it.defId).some(([id]) => id === it.shape);
}

// ---- On the board ----

/**
 * The cells a shape covers with its box's top-left on `anchor` (null: it would stick out). Holes
 * are not checked here
 */
export function coverCells(l: Loadout, sh: ShapeDef, anchor: number): number[] | null {
  const { w, h } = shapeBox(sh);
  const x = anchor % l.width;
  const y = Math.floor(anchor / l.width);
  if (anchor < 0 || anchor >= l.cells.length || x + w > l.width || y + h > l.height) return null;
  return shapeOffsets(sh).map(([dx, dy]) => anchor + dy * l.width + dx);
}

/** The top-left for a shape dropped with its top-left on `cell`, moved back inside the board */
export function anchorFor(l: Loadout, sh: ShapeDef, cell: number): number {
  const { w, h } = shapeBox(sh);
  const x = Math.max(0, Math.min(cell % l.width, l.width - w));
  const y = Math.max(0, Math.min(Math.floor(cell / l.width), l.height - h));
  return y * l.width + x;
}

/** The cells a piece on top covers (row by row; empty when it is not a top) */
export function topCells(l: Loadout, top: string): number[] {
  const out: number[] = [];
  l.cells.forEach((u, i) => {
    if (u === top) out.push(i);
  });
  return out;
}

/** The top-left of a piece's box on the board (-1: not a top) */
export function boxCorner(l: Loadout, top: string): number {
  const at = topCells(l, top);
  if (at.length === 0) return -1;
  const x = Math.min(...at.map((i) => i % l.width));
  const y = Math.min(...at.map((i) => Math.floor(i / l.width)));
  return y * l.width + x;
}

/**
 * Each piece's cells, when some piece covers more than one (null: one piece per cell, so every
 * old layout plans its chain exactly as before)
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
export function portCell(it: ItemInstance, cells: readonly number[], dir: Dir): number {
  return cells[shapeOf(it).ports[dir]] ?? cells[0]!;
}

/** The first cell of each piece on the board (where it rings), in board order */
export function pieceCells(l: Loadout): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  l.cells.forEach((u, i) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(i);
  });
  return out;
}

/** A bigger piece hits harder and guards more: × this for its cell count */
export function shapePower(it: ItemInstance): number {
  return 1 + SHAPE.powerPerCell * (shapeCells(it) - 1);
}
