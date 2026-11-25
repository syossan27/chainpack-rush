// Editing a small board whose cells hold stacks of gear. The top item of a
// cell is cells[i]; the items under it are under[i], bottom first. A piece with a shape
// (core/shapes.ts) covers several cells: each one holds the same stack. Pure: no Phaser.
import { getBoard, type BoardId } from '../data/boards';
import { getItemDef } from '../data/items';
import { boardDepth, boardSize, isHole } from './boards';
import {
  anchorFor,
  boxCorner,
  coverCells,
  shapeOf,
  SHAPES,
  topCells,
  type ShapeDef,
} from './shapes';
import type { ItemInstance, Loadout } from './types';

/**
 * Which items may share a cell: the same gear (any rarity). Null never stacks: origin stones,
 * consumables, and artifacts (there is one of each; it rings as a full stack instead, see chain)
 */
export function stackGroup(it: ItemInstance): string | null {
  const def = getItemDef(it.defId);
  if (def.artifact) return null;
  if (def.kind === 'attack' || def.kind === 'defense') return def.id;
  return null;
}

/** The items in a cell, bottom → top (empty for an empty cell) */
export function stackAt(l: Loadout, cell: number): string[] {
  const top = l.cells[cell];
  return top ? [...(l.under?.[cell] ?? []), top] : [];
}

/**
 * What a cell rings, bottom → top: its stack, or an artifact alone three times (an artifact cannot
 * be stacked, there is one of each, so it rings as a full stack)
 */
export function cellRings(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  cell: number,
): string[] {
  const s = stackAt(l, cell).filter((u) => items.has(u));
  const only = s.length === 1 ? items.get(s[0]!) : undefined;
  if (only && getItemDef(only.defId).artifact)
    return new Array<string>(boardDepth(getBoard(l.board))).fill(only.uid);
  return s;
}

/** Every item on the board, once each: the tops and the items under them */
export function boardUids(l: Loadout): string[] {
  return [...new Set(l.cells.flatMap((_, i) => stackAt(l, i)))];
}

export function emptyStackBoard(board: BoardId = 'standard'): Loadout {
  const { width, height } = boardSize(getBoard(board));
  const n = width * height;
  const out: Loadout = {
    width,
    height,
    cells: new Array<string | null>(n).fill(null),
    under: Array.from({ length: n }, () => []),
    originOrder: [],
    consumables: [],
    board,
  };
  return out;
}

function clone(l: Loadout): Loadout {
  return {
    ...l,
    cells: l.cells.slice(),
    under: l.cells.map((_, i) => (l.under?.[i] ?? []).slice()),
    originOrder: l.originOrder.slice(),
    consumables: l.consumables.slice(),
  };
}

/** Write a cell's stack back (bottom → top) */
function setStack(l: Loadout, cell: number, stack: readonly string[]): void {
  l.cells[cell] = stack[stack.length - 1] ?? null;
  l.under![cell] = stack.slice(0, -1);
}

function syncOrigins(l: Loadout, items: ReadonlyMap<string, ItemInstance>): void {
  l.originOrder = [
    ...new Set(
      l.cells.filter(
        (u): u is string => !!u && getItemDef(items.get(u)?.defId ?? '').kind === 'origin',
      ),
    ),
  ];
}

/** Write a piece's stack on every cell it covers */
function setPiece(l: Loadout, cells: readonly number[], stack: readonly string[]): void {
  for (const c of cells) setStack(l, c, stack);
}

/** Whether two items may share a stack: the same gear (any rarity) and the same shape */
function sameStack(a: ItemInstance, b: ItemInstance): boolean {
  const g = stackGroup(a);
  return g !== null && g === stackGroup(b) && (a.shape ?? 'one') === (b.shape ?? 'one');
}

/** The cells a shape covers at `anchor` on this board (null: it sticks out or meets a hole) */
function fitCells(l: Loadout, sh: ShapeDef, anchor: number): number[] | null {
  const cover = coverCells(l, sh, anchor);
  const board = getBoard(l.board);
  return cover && !cover.some((c) => isHole(board, c)) ? cover : null;
}

/** Take an item out of the board in place (no copy) */
function pull(l: Loadout, uid: string): void {
  for (let i = 0; i < l.cells.length; i++) {
    const s = stackAt(l, i);
    if (s.includes(uid))
      setStack(
        l,
        i,
        s.filter((u) => u !== uid),
      );
  }
}

/**
 * Why an item cannot go on a cell: other gear, an artifact, a full stack, a second origin stone, a
 * hole in the board's shape, or (a piece with a shape) other gear in the way of its cells
 */
export type StackBlock = 'group' | 'artifact' | 'full' | 'origin' | 'hole' | 'space';

/**
 * Put an item on a cell. On a piece of the same gear and shape it stacks on top (on that piece's
 * cells); otherwise a piece takes the cells of its shape with its top-left on `cell` (moved back
 * inside the board), which must be free
 */
export function stackPut(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
  cell: number,
): { loadout: Loadout; block: StackBlock | null } {
  const it = items.get(uid);
  if (!it || cell < 0 || cell >= l.cells.length) return { loadout: l, block: null };
  const def = getItemDef(it.defId);
  if (def.kind === 'consumable') return { loadout: l, block: null };
  const board = getBoard(l.board);
  if (isHole(board, cell)) return { loadout: l, block: 'hole' };
  const out = clone(l);
  pull(out, uid);
  const here = stackAt(out, cell);
  if (here.length > 0) {
    const top = items.get(here[here.length - 1]!)!;
    const under = items.get(here[0]!)!;
    if (def.artifact || getItemDef(under.defId).artifact) return { loadout: l, block: 'artifact' };
    if (!sameStack(it, top)) {
      // A shape whose cells are free elsewhere can still go in, its top-left on this cell
      return stackGroup(it) !== null && stackGroup(it) === stackGroup(top)
        ? { loadout: l, block: 'space' }
        : { loadout: l, block: 'group' };
    }
    if (here.length >= boardDepth(board)) return { loadout: l, block: 'full' };
    setPiece(out, topCells(out, top.uid), [...here, uid]);
    syncOrigins(out, items);
    return { loadout: out, block: null };
  }
  // One origin stone on the board
  const other = out.originOrder.find((u) => u !== uid && boardUids(out).includes(u));
  if (def.kind === 'origin' && other) return { loadout: l, block: 'origin' };
  const sh = shapeOf(it);
  const cover = fitCells(out, sh, anchorFor(out, sh, cell));
  if (!cover) return { loadout: l, block: 'hole' };
  if (cover.some((c) => out.cells[c] !== null)) return { loadout: l, block: 'space' };
  setPiece(out, cover, [uid]);
  syncOrigins(out, items);
  return { loadout: out, block: null };
}

/**
 * Move the whole stack of the piece on `from` so its top-left goes to `to`. A piece in the way swaps
 * places with it (it goes to the moved piece's old top-left) when both fit; otherwise nothing
 * moves. One-cell pieces: the stacks of the two cells swap, as before shapes
 */
export function stackMove(
  l: Loadout,
  from: number,
  to: number,
  items: ReadonlyMap<string, ItemInstance>,
): Loadout {
  if (from < 0 || to < 0 || from >= l.cells.length || to >= l.cells.length) return l;
  const board = getBoard(l.board);
  if (isHole(board, from) || isHole(board, to)) return l;
  const a = l.cells[from];
  // An empty cell onto a piece: that piece comes here
  if (!a) return l.cells[to] ? stackMove(l, to, from, items) : l;
  const shape = (u: string) => {
    const it = items.get(u);
    return it ? shapeOf(it) : SHAPES.one;
  };
  const cornerA = boxCorner(l, a);
  if (cornerA === to) return l;
  const stackA = stackAt(l, from);
  const out = clone(l);
  setPiece(out, topCells(out, a), []);
  const coverA = fitCells(out, shape(a), to);
  if (!coverA) return l;
  const hit = [...new Set(coverA.map((c) => out.cells[c]).filter((u): u is string => !!u))];
  if (hit.length > 1) return l;
  const b = hit[0];
  if (b !== undefined) {
    const stackB = stackAt(out, topCells(out, b)[0]!);
    setPiece(out, topCells(out, b), []);
    const coverB = fitCells(out, shape(b), cornerA);
    if (!coverB || coverB.some((c) => coverA.includes(c) || out.cells[c] !== null)) return l;
    setPiece(out, coverB, stackB);
  }
  setPiece(out, coverA, stackA);
  return out;
}

/** Take one item off the board; the item below it becomes the top */
export function stackTake(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  uid: string,
): Loadout {
  const out = clone(l);
  pull(out, uid);
  out.consumables = out.consumables.filter((u) => u !== uid);
  syncOrigins(out, items);
  return out;
}

/** Move an item one place up (+1) or down (-1) in its stack (on every cell of its piece) */
export function stackShift(l: Loadout, uid: string, delta: 1 | -1): Loadout {
  const cell = l.cells.findIndex((_, i) => stackAt(l, i).includes(uid));
  if (cell < 0) return l;
  const s = stackAt(l, cell);
  const i = s.indexOf(uid);
  const j = i + delta;
  if (j < 0 || j >= s.length) return l;
  const out = clone(l);
  const cells = topCells(out, s[s.length - 1]!);
  [s[i], s[j]] = [s[j]!, s[i]!];
  setPiece(out, cells, s);
  return out;
}

/** Where a layout of another size goes on a board: the old cells moved to its middle */
export function recenterOffset(
  from: { width: number; height: number },
  to: { width: number; height: number },
): { dx: number; dy: number } {
  return {
    dx: Math.floor((to.width - from.width) / 2),
    dy: Math.floor((to.height - from.height) / 2),
  };
}

/** A layout of another size, its cells moved to the middle of this size (cells off it are dropped) */
function recenter(rec: Loadout, width: number, height: number): Loadout {
  const { dx, dy } = recenterOffset(rec, { width, height });
  const cells = new Array<string | null>(width * height).fill(null);
  const under = cells.map((): string[] => []);
  rec.cells.forEach((u, i) => {
    const x = (i % rec.width) + dx;
    const y = Math.floor(i / rec.width) + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    cells[y * width + x] = u;
    under[y * width + x] = (rec.under?.[i] ?? []).slice();
  });
  return { ...rec, width, height, cells, under };
}

/**
 * A stored board against what the player owns now: items sold or used up drop out (the item below
 * moves up), consumables keep to the slots. Nothing stored: an empty board. Another size (the
 * boards grew on 2026-11-26): the old layout in the middle of the board
 */
export function restoreStackBoard(
  stored: Loadout | null,
  owned: ReadonlyMap<string, ItemInstance>,
  consumableSlots: number,
  board: BoardId = 'standard',
): Loadout {
  const def = getBoard(board);
  const { width, height } = boardSize(def);
  if (!stored) return emptyStackBoard(board);
  const rec =
    stored.width === width && stored.height === height ? stored : recenter(stored, width, height);
  const out = emptyStackBoard(board);
  const seen = new Set<string>();
  const ok = (u: string) => {
    const it = owned.get(u);
    if (!it || seen.has(u) || getItemDef(it.defId).kind === 'consumable') return false;
    seen.add(u);
    return true;
  };
  // Each piece once, at the top-left it had (a piece with a shape covers several cells)
  const done = new Set<string>();
  for (let i = 0; i < out.cells.length; i++) {
    const raw = stackAt(rec, i);
    const recTop = raw[raw.length - 1];
    if (recTop === undefined || done.has(recTop)) continue;
    done.add(recTop);
    const s = raw.filter((u) => owned.has(u));
    // Keep to the rules: an origin stone alone, otherwise the items that stack with the top (≤ max)
    const top = s[s.length - 1];
    if (top === undefined) continue;
    const topIt = owned.get(top)!;
    const fit = (
      stackGroup(topIt) === null
        ? [top]
        : s.filter((u) => sameStack(owned.get(u)!, topIt)).slice(-boardDepth(def))
    ).filter(ok);
    if (fit.length === 0) continue;
    // Nothing stays in a hole of the board's shape or over another piece
    const cover = fitCells(out, shapeOf(owned.get(fit[fit.length - 1]!)!), boxCorner(rec, recTop));
    if (cover && cover.every((c) => out.cells[c] === null)) setPiece(out, cover, fit);
  }
  syncOrigins(out, owned);
  // One origin stone (a board stored with more keeps the first)
  for (const u of out.originOrder.slice(1)) pull(out, u);
  syncOrigins(out, owned);
  out.consumables = rec.consumables
    .filter((u) => {
      const it = owned.get(u);
      if (!it || getItemDef(it.defId).kind !== 'consumable' || seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .slice(0, consumableSlots);
  if (rec.consumableAuto) out.consumableAuto = rec.consumableAuto.slice();
  return out;
}
