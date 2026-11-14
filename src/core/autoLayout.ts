// おまかせ配置: とても単純なルールで、持ち物からバックパックを並べ直す（純粋関数）
// Simple on purpose: it ignores combos, special moves, element matchups, affixes, sync and
// origin stone types, so a hand-made layout beats it once the player has plenty of gear.
import { RARITY } from '../config/balance';
import { getItemDef } from '../data/items';
import { defenseValue, neighborCell } from './chain';
import type { ItemInstance, Loadout } from './types';

const RARITY_RANK = ['common', 'rare', 'epic', 'legendary'];
/** When the gear does not all fit, how many defense items to keep (the best ones) */
const DEFENSE_KEEP = 2;

/** How strong an item is for the rule: one hit's base damage (gear that never attacks is 0) */
function strength(it: ItemInstance): number {
  const def = getItemDef(it.defId);
  if (def.kind !== 'attack') return 0;
  return (def.atk ?? 0) * RARITY[it.rarity].mult * (def.hits ?? 1);
}

const byUid = (a: ItemInstance, b: ItemInstance) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);

/**
 * Grow one origin's line from `start`: into each empty cell an exit points at, place the weakest
 * remaining item whose own exit leads on to another empty cell; when none does, place the
 * strongest remaining item to end that line. Branches grow the same way. Returns the cells used.
 */
function grow(
  l: Loadout,
  cells: (string | null)[],
  origin: ItemInstance,
  start: number,
  pool: ItemInstance[],
): number[] {
  const used: number[] = [];
  cells[start] = origin.uid;
  const queue: number[] = [];
  const push = (from: number, it: ItemInstance) => {
    for (const dir of it.exits) {
      const n = neighborCell(l, from, dir);
      if (n !== null && cells[n] === null) queue.push(n);
    }
  };
  const goesOn = (it: ItemInstance, at: number) =>
    it.exits.some((dir) => {
      const n = neighborCell(l, at, dir);
      return n !== null && n !== at && cells[n] === null;
    });
  push(start, origin);
  while (queue.length > 0 && pool.length > 0) {
    const at = queue.shift()!;
    if (cells[at] !== null) continue;
    // pool is weakest first
    let pick = pool.findIndex((it) => goesOn(it, at));
    if (pick < 0) pick = pool.length - 1;
    const it = pool.splice(pick, 1)[0]!;
    cells[at] = it.uid;
    used.push(at);
    push(at, it);
  }
  return used;
}

/**
 * おまかせ: clear the backpack and lay out the owned gear (not consumables) by the simple rule.
 * When it does not all fit, the strongest is used (and the best few defense items).
 * Origin stones go one at a time (more exits first, then rarity), each where its line takes the
 * most gear; the next origin starts only when gear and empty cells are left over. Consumable
 * slots stay as they are. Without an origin stone it changes nothing.
 */
export function autoLayout(base: Loadout, items: ReadonlyMap<string, ItemInstance>): Loadout {
  const all = [...items.values()].filter((it) => getItemDef(it.defId).kind !== 'consumable');
  const origins = all
    .filter((it) => getItemDef(it.defId).kind === 'origin')
    .sort(
      (a, b) =>
        b.exits.length - a.exits.length ||
        RARITY_RANK.indexOf(b.rarity) - RARITY_RANK.indexOf(a.rarity) ||
        byUid(a, b),
    );
  if (origins.length === 0) return base;
  let gear = all.filter((it) => getItemDef(it.defId).kind !== 'origin');
  // More gear than cells: use the strongest (and the best few defense items)
  const room = base.width * base.height - 1;
  if (gear.length > room) {
    const isDefense = (it: ItemInstance) => getItemDef(it.defId).kind === 'defense';
    const guards = gear
      .filter(isDefense)
      .sort((a, b) => defenseValue(b) - defenseValue(a) || byUid(a, b))
      .slice(0, DEFENSE_KEEP);
    const attacks = gear
      .filter((it) => !isDefense(it))
      .sort((a, b) => strength(b) - strength(a) || byUid(a, b))
      .slice(0, room - guards.length);
    gear = [...guards, ...attacks];
  }
  // Laid out weakest first, so the strongest end up late in the line
  const pool = gear.sort((a, b) => strength(a) - strength(b) || byUid(a, b));
  const cells = new Array<string | null>(base.width * base.height).fill(null);
  const originOrder: string[] = [];
  for (const origin of origins) {
    if (pool.length === 0) break;
    // Try every empty cell and keep the one whose line takes the most gear (first on a tie)
    let best = -1;
    let bestCount = 0;
    for (let c = 0; c < cells.length; c++) {
      if (cells[c] !== null) continue;
      const n = grow(base, cells.slice(), origin, c, pool.slice()).length;
      if (n > bestCount) {
        best = c;
        bestCount = n;
      }
    }
    if (best < 0) break;
    grow(base, cells, origin, best, pool);
    originOrder.push(origin.uid);
  }
  return {
    ...base,
    cells,
    originOrder,
    consumables: base.consumables.slice(),
    ...(base.consumableAuto ? { consumableAuto: base.consumableAuto.slice() } : {}),
  };
}
