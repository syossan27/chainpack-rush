// Trial (charms): the rules of the combo multiplier, shared by the battle (combat.ts) and the
// loadout screen's estimate (estimate.ts) so the two never drift. Pure: no Phaser.
//
// Slots: one per column (0..width-1), then one per row (width..width+height-1). A charm reacts to
// events in the cells of its line. When one event reaches two charms (the cell where a column and a
// row cross), the column's goes first. The multiplier starts at ×1 every chain and never goes
// above CHARM.cap.
import { CHARM } from '../config/balance';
import { getBoard, type BoardDef } from '../data/boards';
import { getCharm, type CharmId, type CharmTrigger } from '../data/charms';
import { getItemDef } from '../data/items';
import { boardDepth, boardSize, isHole } from './boards';
import { cellRings } from './stack';
import type { ChainStep, ItemInstance, Loadout, Rarity } from './types';

export interface CharmInstance {
  uid: string;
  defId: CharmId;
  rarity: Rarity;
}

/** The charm in each slot (null: empty), columns first then rows */
export type CharmSlots = readonly (CharmInstance | null)[];

export interface CharmContext {
  slots: CharmSlots;
  width: number;
  /** Slots whose line is all one element (そろいの指輪 works there) */
  matched: ReadonlySet<number>;
  /** Cells whose stack is full (as many items as the board's depth) */
  full: ReadonlySet<number>;
  depth: number;
}

export interface CharmFire {
  slot: number;
  op: '+' | '×';
  value: number;
  /** The multiplier after this charm */
  m: number;
}

/** The column slot and the row slot a cell belongs to */
export function slotsOfCell(cell: number, width: number): [number, number] {
  return [cell % width, width + Math.floor(cell / width)];
}

/** The cells of a slot's line, top to bottom or left to right */
export function slotCells(slot: number, width: number, height: number): number[] {
  if (slot < width) return Array.from({ length: height }, (_, y) => y * width + slot);
  const y = slot - width;
  return Array.from({ length: width }, (_, x) => y * width + x);
}

/** A slot exists only where its line has at least one cell of the board's shape */
export function slotOpen(slot: number, board: BoardDef): boolean {
  const { width, height } = boardSize(board);
  if (slot < 0 || slot >= width + height) return false;
  return slotCells(slot, width, height).some((c) => !isHole(board, c));
}

export function charmValue(c: CharmInstance): number {
  return getCharm(c.defId)?.values[c.rarity] ?? 0;
}

/** What the charms can react to on this layout (decided once, when a run or estimate starts) */
export function charmContext(
  slots: CharmSlots,
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
): CharmContext {
  const { width, height } = loadout;
  const depth = boardDepth(getBoard(loadout.board));
  const full = new Set<number>();
  // An ordinary bag has no stacks (an artifact there is not a full stack)
  if (loadout.under)
    for (let cell = 0; cell < loadout.cells.length; cell++)
      if (cellRings(loadout, items, cell).length >= depth) full.add(cell);
  const matched = new Set<number>();
  for (let slot = 0; slot < width + height; slot++) {
    const elements: string[] = [];
    for (const cell of slotCells(slot, width, height))
      for (const uid of cellRings(loadout, items, cell)) {
        const def = getItemDef(items.get(uid)!.defId);
        if (def.kind === 'attack') elements.push(def.element ?? 'physical');
      }
    if (elements.length >= CHARM.minMatch && elements.every((e) => e === elements[0]))
      matched.add(slot);
  }
  return { slots, width, matched, full, depth };
}

/** The step is the top of a full stack (the stack has rung all the way up) */
export function stackTop(step: ChainStep, ctx: CharmContext): boolean {
  return ctx.full.has(step.cell) && step.ring === ctx.depth - 1;
}

/** One event in a cell: the charms of its column and row that react, in that order */
export function applyCharmEvent(
  m: number,
  trigger: CharmTrigger,
  cell: number,
  ctx: CharmContext,
): { m: number; fired: CharmFire[] } {
  const fired: CharmFire[] = [];
  for (const slot of slotsOfCell(cell, ctx.width)) {
    const c = ctx.slots[slot];
    const def = c ? getCharm(c.defId) : undefined;
    if (!c || !def || def.trigger !== trigger) continue;
    if (def.id === 'match_ring' && !ctx.matched.has(slot)) continue;
    const value = charmValue(c);
    m = Math.min(CHARM.cap, def.op === '+' ? m + value : m * value);
    fired.push({ slot, op: def.op, value, m });
  }
  return { m, fired };
}

/** The slot glows on the loadout screen: its condition is met by the layout itself */
export function charmLit(slot: number, ctx: CharmContext): boolean {
  const c = ctx.slots[slot];
  if (!c) return false;
  if (c.defId === 'match_ring') return ctx.matched.has(slot);
  if (c.defId === 'stack_charm') {
    const height = ctx.slots.length - ctx.width;
    return slotCells(slot, ctx.width, height).some((cell) => ctx.full.has(cell));
  }
  return false;
}
