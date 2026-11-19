// Trial (relics): which relics a beaten boss offers, which cells take them, and the value in each
// relic's text. Pure: no Phaser.
import { RELIC } from '../config/balance';
import { getItemDef } from '../data/items';
import { RELICS, getRelic, type RelicId } from '../data/relics';
import type { Rng } from './rng';
import { stackAt } from './stack';
import type { ItemInstance, Loadout } from './types';

/** The relics a beaten boss offers (all different) */
export function rollRelicOffer(rng: Rng): RelicId[] {
  return rng.sample(
    RELICS.map((r) => r.id),
    RELIC.offer,
  );
}

/** The number shown for {v} in a relic's text (percentages as %), or undefined */
export function relicValue(id: RelicId): number | undefined {
  switch (id) {
    case 'pierce':
      return RELIC.pierce;
    case 'fist':
      return RELIC.fistMult;
    case 'eye':
      return Math.round(RELIC.eyeCrit * 100);
    case 'feather':
      return RELIC.featherSteps;
    case 'fang':
      return Math.round(RELIC.fangHeal * 100);
    case 'ward':
      return RELIC.wardDefense;
    default:
      return undefined;
  }
}

/** A relic can go on a cell with gear and no relic yet; an attack relic needs attack gear there */
export function canStickRelic(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  stuck: ReadonlyMap<number, RelicId>,
  id: RelicId,
  cell: number,
): boolean {
  const def = getRelic(id);
  if (!def || cell < 0 || cell >= loadout.cells.length || stuck.has(cell)) return false;
  const gear = stackAt(loadout, cell)
    .map((u) => items.get(u))
    .filter((it): it is ItemInstance => !!it);
  if (gear.length === 0) return false;
  return def.target === 'any' || gear.some((it) => getItemDef(it.defId).kind === 'attack');
}
