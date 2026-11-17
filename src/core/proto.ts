// Prototype (roguelite): a run that starts with a tiny line and grows it with gear picked every
// few kills and after each boss. Throwaway: kept apart from the main game (nothing here touches the save).
// Pure: no Phaser.
import { getItemDef } from '../data/items';
import { getRegion } from '../data/regions';
import { rollLoot } from './loot';
import type { Rng } from './rng';
import type { Dir, ItemInstance, Loadout } from './types';

export const PROTO_REGION = 'grassland';
const WIDTH = 5;
const HEIGHT = 4;
/** Choices shown at each pick */
const CHOICES = 3;
/** A pick comes every this many kills (bots: ~10 picks a run, mostly into loop 2) */
export const PICK_EVERY_KILLS = 2;
/** HP back at each pick, so a growing line is not cut short by early chip damage */
export const PICK_HEAL = 15;

/** Kills that count toward the next pick: bosses give a pick of their own, fled enemies are not kills */
export const countsForPick = (ev: { boss: boolean; fled: boolean }): boolean =>
  !ev.boss && !ev.fled;

const item = (uid: string, defId: string, exits: Dir[]): ItemInstance => ({
  uid,
  defId,
  rarity: 'common',
  exits,
  rerollCount: 0,
});

/** A short line on the second row from the left: origin stone → sword → wooden shield (all pointing right) */
export function protoStart(): { loadout: Loadout; items: Map<string, ItemInstance> } {
  const origin = item('proto-origin', 'origin_stone', ['right']);
  const sword = item('proto-sword', 'sword', ['right']);
  // Without a shield the hero falls to the first group before the first pick
  const shield = item('proto-shield', 'wood_shield', ['right']);
  const cells = new Array<string | null>(WIDTH * HEIGHT).fill(null);
  cells[1 * WIDTH + 0] = origin.uid;
  cells[1 * WIDTH + 1] = sword.uid;
  cells[1 * WIDTH + 2] = shield.uid;
  return {
    loadout: {
      width: WIDTH,
      height: HEIGHT,
      cells,
      originOrder: [origin.uid],
      consumables: [],
    },
    items: new Map([
      [origin.uid, origin],
      [sword.uid, sword],
      [shield.uid, shield],
    ]),
  };
}

/** The gear to pick from: drawn like a boss's drops (rare or better), no consumables */
export function protoChoices(rng: Rng, loop: number, serial: number): ItemInstance[] {
  const loot = getRegion(PROTO_REGION).loot;
  return Array.from({ length: CHOICES }, (_, i) =>
    rollLoot(rng, loop, `proto-${serial}-${i}`, true, loot, true),
  );
}

const CLOCKWISE: Record<Dir, Dir> = { up: 'right', right: 'down', down: 'left', left: 'up' };

/** Turn the arrows a quarter clockwise (free in the prototype) */
export function rotateExits(it: ItemInstance): void {
  it.exits = it.exits.map((d) => CLOCKWISE[d]);
}

/** Put the gear in an empty cell; an origin stone fires last. False when the cell is taken */
export function placeItem(
  loadout: Loadout,
  items: Map<string, ItemInstance>,
  it: ItemInstance,
  cell: number,
): boolean {
  if (cell < 0 || cell >= loadout.cells.length || loadout.cells[cell] !== null) return false;
  loadout.cells[cell] = it.uid;
  items.set(it.uid, it);
  if (getItemDef(it.defId).kind === 'origin') loadout.originOrder.push(it.uid);
  return true;
}
