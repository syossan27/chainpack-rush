// Trial 「拾って組む」 (debug only): bring an origin stone and a few pieces from the collection, pick
// up gear from normal enemies into a hand beside the board, and place it while the fight goes on.
// After each boss the run waits for a relic and a calm rearrange. Nothing is kept. Pure: no Phaser.
import { BUILD_RUN } from '../config/balance';
import { getItemDef } from '../data/items';
import type { RunConfig } from './combat';
import { heroStats } from './economy';
import { runMastery } from './mastery';
import type { SaveData } from './save';
import { emptyShapeBoard } from './shapes';
import type { ItemInstance } from './types';

const kindOf = (it: ItemInstance) => getItemDef(it.defId).kind;

/**
 * Tap an item in the pick list: it goes in or out. One origin stone (a new one replaces it) and
 * up to BUILD_RUN.bringGear pieces of gear; consumables can't be brought
 */
export function togglePick(picked: readonly ItemInstance[], it: ItemInstance): ItemInstance[] {
  if (picked.some((p) => p.uid === it.uid)) return picked.filter((p) => p.uid !== it.uid);
  const kind = kindOf(it);
  if (kind === 'consumable') return picked.slice();
  if (kind === 'origin') return [...picked.filter((p) => kindOf(p) !== 'origin'), it];
  if (picked.filter((p) => kindOf(p) !== 'origin').length >= BUILD_RUN.bringGear)
    return picked.slice();
  return [...picked, it];
}

/** A run needs an origin stone to fire */
export function canSetOut(picked: readonly ItemInstance[]): boolean {
  return picked.some((p) => kindOf(p) === 'origin');
}

/**
 * The run's settings: the trial's empty plain board (filled in the first arrange), copies of the
 * brought items (the save is never touched), the hero's upgrades, the mastery as it is
 */
export function buildRunConfig(
  save: SaveData,
  seed: number,
  picked: readonly ItemInstance[],
): RunConfig {
  return {
    seed,
    regionId: BUILD_RUN.regionId,
    loadout: emptyShapeBoard(BUILD_RUN.board.width, BUILD_RUN.board.height),
    items: new Map(picked.map((it) => [it.uid, structuredClone(it)])),
    hero: heroStats(save),
    consumableSlots: 0,
    rules: { keepCountOnKill: true },
    mastery: runMastery(save),
    relics: {},
    build: { groupMult: BUILD_RUN.groupMult, dropChance: BUILD_RUN.dropChance },
  };
}

/** The hand: fixed slots (left and right of the board, a row below), null where empty */
export type Hand = (ItemInstance | null)[];

/** The brought pieces fill the first slots */
export function startHand(
  brought: readonly ItemInstance[],
  size: number = BUILD_RUN.handSize,
): Hand {
  return Array.from({ length: size }, (_, i) => brought[i] ?? null);
}

/** A picked-up piece takes the first empty slot; with none left it is lost (kept: false) */
export function addToHand(hand: Hand, item: ItemInstance): { hand: Hand; kept: boolean } {
  const at = hand.indexOf(null);
  if (at < 0) return { hand, kept: false };
  const next = hand.slice();
  next[at] = item;
  return { hand: next, kept: true };
}
