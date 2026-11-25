// An item's bonus: what is left of the random affixes (追加効果) removed on 2026-11-26. Gear rolled
// before then keeps their worth as one number (%); gear picked up since has none. Attack gear: its
// damage. Defense gear: its defense value. Origin stones: the wait after their chain is shorter.
import { getItemDef } from '../data/items';
import type { ItemInstance } from './types';

/** The most a bonus can be (%) */
export const BONUS_MAX = 100;
/** An origin stone's most: 速攻 (≤ 15) + 初撃 (≤ 50 × 0.2), so the wait never gets near 0 */
export const BONUS_ORIGIN_MAX = 25;

/** An item's bonus (%; 0 for none) */
export function itemBonus(it: ItemInstance): number {
  return it.bonus ?? 0;
}

/**
 * The bonus for an item's old affixes, worked out roughly (2026-11-26): the plain ones count in
 * full, the ones that worked only now and then by about how often they did. Crit chance counts by
 * the crit's extra damage (×2: +1 per point), healing by about 5% defense per HP
 */
const WORTH: Record<string, number> = {
  sharp: 1,
  keen: 1,
  vanguard: 0.3,
  finisher: 0.5,
  exploit: 0.4,
  slayer: 0.3,
  sturdy: 1,
  mend: 5,
  quick: 1,
  spark: 0.2,
};

export function bonusFromAffixes(
  affixes: readonly { id: string; value: number }[],
  origin = false,
): number {
  const sum = affixes.reduce((s, a) => s + (WORTH[a.id] ?? 0) * a.value, 0);
  return Math.min(origin ? BONUS_ORIGIN_MAX : BONUS_MAX, Math.round(sum));
}

/** Whether a bonus is one this item could have (for records sent to the ranking) */
export function validBonus(it: ItemInstance): boolean {
  if (it.bonus === undefined) return true;
  const def = getItemDef(it.defId);
  return (
    Number.isInteger(it.bonus) &&
    it.bonus > 0 &&
    it.bonus <= (def.kind === 'origin' ? BONUS_ORIGIN_MAX : BONUS_MAX) &&
    def.kind !== 'consumable' &&
    !def.artifact
  );
}
