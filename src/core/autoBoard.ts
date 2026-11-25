// Lay out a stacked board from what the player owns (for a migrated save, a board used for the
// first time, and the bots). Pure: no Phaser.
//
// Simple on purpose, like the old おまかせ: one origin stone, the same gear stacked up to the
// board's depth, and the line grown cell by cell (weak piles first, so the strong end up late in
// the chain). Every start cell is tried and the best estimate wins. Without an rng the result
// depends only on the gear; with one, the order and the top item vary (the bots search with it).
import { HERO, RARITY } from '../config/balance';
import { getBoard, type BoardId } from '../data/boards';
import { getItemDef } from '../data/items';
import { boardDepth, isHole } from './boards';
import { defenseValue, neighborCell, simulateChain } from './chain';
import { chainCycle, estimateRoute } from './estimate';
import type { Rng } from './rng';
import { coverCells, portCell, shapeOf, shapeOffsets, shapePower } from './shapes';
import { emptyStackBoard, stackGroup } from './stack';
import type { ItemInstance, Loadout } from './types';

const RARITY_RANK = ['common', 'rare', 'epic', 'legendary'];
/** When the piles do not all fit, how many defense piles to keep (the best ones) */
const DEFENSE_KEEP = 2;

/** Gear that goes on one cell together (bottom → top is decided when it is placed) */
interface Pile {
  items: ItemInstance[];
  strength: number;
  defense: number;
}

const byUid = (a: ItemInstance, b: ItemInstance) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
const byRarity = (a: ItemInstance, b: ItemInstance) =>
  RARITY_RANK.indexOf(b.rarity) - RARITY_RANK.indexOf(a.rarity) || byUid(a, b);

/** One hit's base damage (gear that never attacks is 0) */
function strength(it: ItemInstance): number {
  const def = getItemDef(it.defId);
  if (def.kind !== 'attack') return 0;
  return (def.atk ?? 0) * RARITY[it.rarity].mult * (def.hits ?? 1) * shapePower(it);
}

/** The same gear in piles of up to `depth` (the best first); a lone kind is one pile per item */
function makePiles(gear: readonly ItemInstance[], depth: number): Pile[] {
  const groups = new Map<string, ItemInstance[]>();
  const piles: ItemInstance[][] = [];
  for (const it of [...gear].sort(byRarity)) {
    const g = stackGroup(it);
    // The same gear of the same shape stacks
    const key = `${g}:${it.shape ?? 'one'}`;
    if (g === null) piles.push([it]);
    else groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  for (const list of groups.values())
    for (let i = 0; i < list.length; i += depth) piles.push(list.slice(i, i + depth));
  return piles.map((items) => ({
    items,
    strength: items.reduce((s, it) => s + strength(it), 0),
    defense: items.reduce((s, it) => s + defenseValue(it), 0),
  }));
}

/** The piles that fit in `room` cells: the best few defense piles, then the strongest */
function choosePiles(piles: Pile[], room: number): Pile[] {
  if (piles.length <= room) return piles;
  const first = (p: Pile) => p.items[0]!;
  const guards = piles
    .filter((p) => p.defense > 0 && p.strength === 0)
    .sort((a, b) => b.defense - a.defense || byUid(first(a), first(b)))
    .slice(0, DEFENSE_KEEP);
  const attacks = piles
    .filter((p) => !guards.includes(p))
    .sort((a, b) => b.strength - a.strength || byUid(first(a), first(b)))
    .slice(0, room - guards.length);
  return [...guards, ...attacks];
}

/**
 * Grow the line from the origin stone on `start`: each cell an arrow points at takes the weakest
 * pile with an item whose arrows lead on to another free cell (that item goes on top); when none
 * does, the strongest pile ends the line there
 */
function grow(
  base: Loadout,
  origin: ItemInstance,
  start: number,
  pool: Pile[],
  rng: Rng | undefined,
): Loadout {
  const def = getBoard(base.board);
  const l: Loadout = {
    ...base,
    cells: base.cells.slice(),
    under: base.cells.map(() => []),
    originOrder: [origin.uid],
    consumables: [],
  };
  const free = (c: number | null): c is number =>
    c !== null && !isHole(def, c) && l.cells[c] === null;
  /** The cells a piece takes so that `at` is one of them (its first fitting place), or null */
  const placeAt = (it: ItemInstance, at: number): number[] | null => {
    const sh = shapeOf(it);
    for (const [dx, dy] of shapeOffsets(sh)) {
      const x = (at % l.width) - dx;
      const y = Math.floor(at / l.width) - dy;
      if (x < 0 || y < 0) continue;
      const cover = coverCells(l, sh, y * l.width + x);
      if (cover?.every(free)) return cover;
    }
    return null;
  };
  l.cells[start] = origin.uid;
  const queue: number[] = [];
  const push = (cells: number[], it: ItemInstance) => {
    for (const dir of it.exits) {
      const from = cells.length > 1 ? portCell(it, cells, dir) : cells[0]!;
      const n = neighborCell(l, from, dir);
      if (free(n)) queue.push(n);
    }
  };
  push([start], origin);
  const left = pool.slice();
  while (queue.length > 0 && left.length > 0) {
    const at = queue.shift()!;
    if (!free(at)) continue;
    /** Whether the piece fits here and one of its arrows leads on to a free cell */
    const leads = (it: ItemInstance) => {
      const cells = placeAt(it, at);
      return (
        !!cells &&
        it.exits.some((dir) => {
          const n = neighborCell(l, cells.length > 1 ? portCell(it, cells, dir) : at, dir);
          return n !== null && !cells.includes(n) && free(n);
        })
      );
    };
    let pick = left.findIndex((p) => p.items.some(leads));
    // None leads on: the strongest pile that fits ends the line here
    for (let k = left.length - 1; pick < 0 && k >= 0; k--)
      if (placeAt(left[k]!.items[0]!, at)) pick = k;
    if (pick < 0) continue;
    const pile = left.splice(pick, 1)[0]!;
    const tops = pile.items.filter(leads);
    const top = tops.length === 0 ? pile.items[0]! : rng ? tops[rng.int(tops.length)]! : tops[0]!;
    const cells = placeAt(top, at)!;
    const under = pile.items.filter((it) => it !== top).map((it) => it.uid);
    for (const c of cells) {
      l.cells[c] = top.uid;
      l.under![c] = under.slice();
    }
    push(cells, top);
  }
  return l;
}

/** The first origin's line on one ordinary enemy, per chain (0: no line) */
function routeTotal(l: Loadout, items: ReadonlyMap<string, ItemInstance>): number {
  const plan = simulateChain(l, items).plans[0];
  return plan ? estimateRoute(plan, items, 1, l.board).total : 0;
}

/**
 * How strong a layout is: the first origin's line on one ordinary enemy, per second of the chain
 * and the wait after it (0: no line). Per chain would favour long lines that are slower overall
 */
export function boardScore(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  attackMult = 1,
  atbTime: number = HERO.atbTime,
): number {
  const plan = simulateChain(l, items).plans[0];
  if (!plan) return 0;
  const total = estimateRoute(plan, items, attackMult, l.board).total;
  return total / chainCycle(plan, items, atbTime * (getBoard(l.board).wait ?? 1));
}

/**
 * Lay out a board from the gear owned (consumable slots left empty). Without `rng` the same gear
 * always gives the same board and every start cell is tried; with `rng` the pile order and the top
 * item are shaken and one start cell is drawn (a bot tries many of these)
 */
export function autoBoard(inventory: readonly ItemInstance[], board: BoardId, rng?: Rng): Loadout {
  const base = emptyStackBoard(board);
  const def = getBoard(board);
  const origin = inventory
    .filter((it) => getItemDef(it.defId).kind === 'origin')
    .sort((a, b) => b.exits.length - a.exits.length || byRarity(a, b))[0];
  if (!origin) return base;
  const items = new Map(inventory.map((it) => [it.uid, it]));
  const gear = inventory.filter((it) => {
    const k = getItemDef(it.defId).kind;
    return k !== 'origin' && k !== 'consumable';
  });
  const cells = base.cells.map((_, c) => c).filter((c) => !isHole(def, c));
  const chosen = choosePiles(makePiles(gear, boardDepth(def)), cells.length - 1);
  const weight = (p: Pile) => p.strength * (rng ? 0.7 + rng.next() * 0.6 : 1);
  const pool = chosen
    .map((p) => ({ p, w: weight(p) }))
    .sort((a, b) => a.w - b.w || byUid(a.p.items[0]!, b.p.items[0]!))
    .map((x) => x.p);
  const starts = rng ? [cells[rng.int(cells.length)]!] : cells;
  let best: Loadout | null = null;
  let bestScore = -1;
  for (const c of starts) {
    const l = grow(base, origin, c, pool, rng);
    // Per chain on purpose: per second would leave gear (armor too) off the line to shorten the
    // wait, and this layout promises to use everything
    const score = routeTotal(l, items);
    if (score > bestScore) {
      best = l;
      bestScore = score;
    }
  }
  return best!;
}
