// The rules of the combo multiplier, shared by the battle (combat.ts) and the
// loadout screen's estimate (estimate.ts) so the two never drift. Pure: no Phaser.
//
// Slots: one per column (0..width-1), then one per row (width..width+height-1). A charm reacts to
// events in the cells of its line. When one event reaches two charms (the cell where a column and a
// row cross), the column's goes first. The multiplier starts at ×1 every chain and never goes
// above CHARM.cap.
import { CHARM, COMBOS, POISON } from '../config/balance';
import { getBoard, type BoardDef } from '../data/boards';
import { CHARMS, getCharm, type CharmId, type CharmTrigger } from '../data/charms';
import { getItemDef } from '../data/items';
import { boardDepth, boardSize, isHole } from './boards';
import { rollRarity, type RegionLoot } from './loot';
import type { Rng } from './rng';
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
  /** How many times each cell rings (its stack; 1 for a cell of an ordinary bag) */
  rings: readonly number[];
}

export interface CharmFire {
  slot: number;
  op: '+' | '×';
  /** What it added this time (a weaker combo adds less than the charm's value) */
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
  const rings = loadout.cells.map((_, cell) => cellRings(loadout, items, cell).length);
  // An ordinary bag has no stacks (an artifact there is not a full stack)
  if (loadout.under)
    rings.forEach((n, cell) => {
      if (n >= depth) full.add(cell);
    });
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
  return { slots, width, matched, full, depth, rings };
}

/** The step is the last ring of its cell (always, on an ordinary bag) */
export function cellTop(step: ChainStep, ctx: CharmContext): boolean {
  return step.ring === undefined || step.ring === (ctx.rings[step.cell] ?? 1) - 1;
}

/** The step is the top of a full stack (the stack has rung all the way up) */
export function stackTop(step: ChainStep, ctx: CharmContext): boolean {
  return ctx.full.has(step.cell) && step.ring === ctx.depth - 1;
}

const STRONGEST_COMBO = Math.max(...COMBOS.map((r) => r.mult));

/**
 * How much of a combo charm's value a combo is worth (0..1): the strongest status combo (感電) and
 * 毒爆 (it takes five wind hits to build) count in full, weaker ones by how much they multiply —
 * so light ↔ dark, a combo on every link, cannot pin the cap every chain
 */
export function comboWeight(name: string): number {
  if (name === POISON.burstName) return 1;
  const rule = COMBOS.find((r) => r.name === name);
  return rule ? (rule.mult - 1) / (STRONGEST_COMBO - 1) : 1;
}

/**
 * One event in a cell: the charms of its column and row that react, in that order. `weight` scales
 * what each charm adds (a combo's comboWeight; 1 for every other event)
 */
export function applyCharmEvent(
  m: number,
  trigger: CharmTrigger,
  cell: number,
  ctx: CharmContext,
  weight = 1,
): { m: number; fired: CharmFire[] } {
  const fired: CharmFire[] = [];
  for (const slot of slotsOfCell(cell, ctx.width)) {
    const c = ctx.slots[slot];
    const def = c ? getCharm(c.defId) : undefined;
    if (!c || !def || def.trigger !== trigger) continue;
    if (def.id === 'match_ring' && !ctx.matched.has(slot)) continue;
    const full = charmValue(c);
    const value = def.op === '+' ? full * weight : 1 + (full - 1) * weight;
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

/**
 * A charm drop for one dropped item, or null. `rareOrBetter`: a boss, golden elite or treasure
 * goblin (likelier, and rare or better). `sure`: always drops (the first boss for a player with no
 * charms). The uid is left empty for the run to fill
 */
export function rollCharmDrop(
  rng: Rng,
  loop: number,
  rareOrBetter: boolean,
  region: RegionLoot,
  sure: boolean,
): CharmInstance | null {
  // Not the region's artifact multiplier (×10 at the castle made charms pour out): the same
  // chance everywhere, the region only shifts the rarity
  const chance = rareOrBetter ? CHARM.dropChanceRare : CHARM.dropChance;
  // Always drawn, so a sure drop does not shift what comes after it
  const roll = rng.next();
  if (!sure && roll >= chance) return null;
  const rarity = rollRarity(rng, loop, rareOrBetter, region.rarityShift);
  return { uid: '', defId: rng.pick(CHARMS).id, rarity };
}
