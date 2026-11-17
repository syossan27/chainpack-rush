// Earning looks from play (region stars, endless loops): what the save has earned, how far along a
// look is, the condition text, and handing looks over. Pure: no Phaser. Kept out of cosmetics.ts,
// which the server also bundles.
import { PROGRESS } from '../config/balance';
import { getRegion } from '../data/regions';
import { t } from '../i18n';
import { COSMETICS, getCosmetic, type CosmeticDef, type CosmeticSource } from './cosmetics';
import { regionStars } from './economy';
import { RANK_REWARDS } from './ranking';
import type { SaveData } from './save';

function earned(save: SaveData, s: CosmeticSource): boolean {
  switch (s.kind) {
    case 'regionStars':
      return regionStars(save, s.region) >= s.stars;
    case 'endlessLoop':
      return save.endless.bestLoop >= s.n;
    case 'rank':
    case 'shop':
      return false;
  }
}

/** Looks whose play condition the save meets (catalog order; rank and store looks never) */
export function earnedCosmetics(save: SaveData): string[] {
  return COSMETICS.filter((c) => earned(save, c.source)).map((c) => c.id);
}

/**
 * How far along a look is: region stars count the loops cleared (a loop-3 boss for ★1), endless
 * counts the loop reached. Null for looks without a count (rank, store) and unknown ids
 */
export function cosmeticProgress(
  save: SaveData,
  id: string,
): { have: number; need: number } | null {
  const s = getCosmetic(id)?.source;
  if (s?.kind === 'regionStars') {
    const need = PROGRESS.starLoops[s.stars - 1] ?? 0;
    const best = save.progress.best[s.region] ?? 0;
    return { have: Math.min(Math.max(0, best - 1), need), need };
  }
  if (s?.kind === 'endlessLoop') return { have: Math.min(save.endless.bestLoop, s.n), need: s.n };
  return null;
}

/** How to earn a look, as shown in the wardrobe */
export function cosmeticCondition(def: CosmeticDef): string {
  const s = def.source;
  switch (s.kind) {
    case 'rank':
      return t('{band}でもらえる', { band: t(RANK_REWARDS[s.band].label) });
    case 'regionStars':
      return t('{region}で★{stars}（{loop}周目のボスを倒す）', {
        region: t(getRegion(s.region).name),
        stars: s.stars,
        loop: PROGRESS.starLoops[s.stars - 1] ?? 0,
      });
    case 'endlessLoop':
      return t('エンドレスで{n}周目に着く', { n: s.n });
    case 'shop':
      return '';
  }
}

/** Add the looks the player does not own yet, marked as new; returns the ones added */
export function giveCosmetics(save: SaveData, ids: readonly string[]): string[] {
  const added = [...new Set(ids)].filter((id) => !save.cosmetics.includes(id));
  save.cosmetics.push(...added);
  save.newCosmetics.push(...added.filter((id) => !save.newCosmetics.includes(id)));
  return added;
}

/** Hand over every look the save has earned from play (after a run, and at startup for older saves) */
export function grantCosmetics(save: SaveData): string[] {
  return giveCosmetics(save, earnedCosmetics(save));
}
