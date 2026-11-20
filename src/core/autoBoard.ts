// Lay out a stacked board from what the player owns (for a migrated save, a board used for the
// first time, and the bots). Pure: no Phaser.
//
// Simple on purpose, like the old おまかせ: one origin stone, the same gear stacked up to the
// board's depth, and the line grown cell by cell (weak piles first, so the strong end up late in
// the chain). Every start cell is tried and the best estimate wins. Without an rng the result
// depends only on the gear; with one, the order and the top item vary (the bots search with it).
import { RARITY } from '../config/balance';
import { getBoard, type BoardId } from '../data/boards';
import { getItemDef } from '../data/items';
import { boardDepth, isHole } from './boards';
import { defenseValue, neighborCell, simulateChain } from './chain';
import { estimateRoute } from './estimate';
import type { Rng } from './rng';
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
  return (def.atk ?? 0) * RARITY[it.rarity].mult * (def.hits ?? 1);
}

/** The same gear in piles of up to `depth` (the best first); a lone kind is one pile per item */
function makePiles(gear: readonly ItemInstance[], depth: number): Pile[] {
  const groups = new Map<string, ItemInstance[]>();
  const piles: ItemInstance[][] = [];
  for (const it of [...gear].sort(byRarity)) {
    const g = stackGroup(it);
    if (g === null) piles.push([it]);
    else groups.set(g, [...(groups.get(g) ?? []), it]);
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
  l.cells[start] = origin.uid;
  const queue: number[] = [];
  const push = (from: number, it: ItemInstance) => {
    for (const dir of it.exits) {
      const n = neighborCell(l, from, dir);
      if (free(n)) queue.push(n);
    }
  };
  push(start, origin);
  const left = pool.slice();
  while (queue.length > 0 && left.length > 0) {
    const at = queue.shift()!;
    if (!free(at)) continue;
    const leads = (it: ItemInstance) =>
      it.exits.some((dir) => {
        const n = neighborCell(l, at, dir);
        return n !== at && free(n);
      });
    let pick = left.findIndex((p) => p.items.some(leads));
    if (pick < 0) pick = left.length - 1;
    const pile = left.splice(pick, 1)[0]!;
    const tops = pile.items.filter(leads);
    const top = tops.length === 0 ? pile.items[0]! : rng ? tops[rng.int(tops.length)]! : tops[0]!;
    l.cells[at] = top.uid;
    l.under![at] = pile.items.filter((it) => it !== top).map((it) => it.uid);
    push(at, top);
  }
  return l;
}

/** How strong a layout is: the first origin's line, estimated on one ordinary enemy (0: no line) */
export function boardScore(
  l: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  attackMult = 1,
): number {
  const plan = simulateChain(l, items).plans[0];
  return plan ? estimateRoute(plan, items, attackMult, l.board).total : 0;
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
    const score = boardScore(l, items);
    if (score > bestScore) {
      best = l;
      bestScore = score;
    }
  }
  return best!;
}
