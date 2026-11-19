// The order of the storage list: by rarity, or by gear (the same gear together, and the gear that
// can share a stack side by side). Pure: no Phaser.
import { ELEMENT_NAMES, getItemDef } from '../data/items';
import type { ItemInstance, ItemKind, Rarity } from './types';

export type ItemSort = 'rarity' | 'gear';

export const ITEM_SORTS: readonly ItemSort[] = ['rarity', 'gear'];

const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const KIND_ORDER: Record<ItemKind, number> = { origin: 0, attack: 1, defense: 2, consumable: 3 };
const ELEMENT_ORDER: readonly string[] = Object.keys(ELEMENT_NAMES);

function isConsumable(it: ItemInstance): boolean {
  return getItemDef(it.defId).kind === 'consumable';
}

function byRarity(a: ItemInstance, b: ItemInstance): number {
  return (
    // Consumables come after the gear (a separate group)
    Number(isConsumable(a)) - Number(isConsumable(b)) ||
    RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] ||
    a.defId.localeCompare(b.defId) ||
    a.uid.localeCompare(b.uid)
  );
}

/** Attack gear by element (the stacking group), then everything else by kind */
function gearGroup(it: ItemInstance): number {
  const def = getItemDef(it.defId);
  const kind = KIND_ORDER[def.kind] * 100;
  return def.kind === 'attack' ? kind + ELEMENT_ORDER.indexOf(def.element ?? 'physical') : kind;
}

function byGear(a: ItemInstance, b: ItemInstance): number {
  return (
    gearGroup(a) - gearGroup(b) ||
    a.defId.localeCompare(b.defId) ||
    RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] ||
    a.uid.localeCompare(b.uid)
  );
}

/** A sorted copy of the items */
export function sortItems(items: readonly ItemInstance[], mode: ItemSort): ItemInstance[] {
  return items.slice().sort(mode === 'gear' ? byGear : byRarity);
}
