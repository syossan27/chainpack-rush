// Cosmetics: rewards for ranking high in the biweekly challenge. They change looks only, never strength.
// Shared by the game and the server (the server checks name decorations, which other players see).
import { k } from '../i18n';
import type { RewardBand } from './names';

export type CosmeticKind = 'hero' | 'pet' | 'deco';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  /** Japanese key; shown through t() */
  name: string;
  /** Lowest challenge rank band that earns it (higher bands earn it too) */
  band: Exclude<RewardBand, 'joined'>;
}

export const COSMETICS: readonly CosmeticDef[] = [
  // Hero: armor and cape colors (the hero sprite with its colors swapped)
  { id: 'hero_azure', kind: 'hero', name: k('蒼のマント'), band: 'top50' },
  { id: 'hero_silver_royal', kind: 'hero', name: k('白銀の鎧'), band: 'top10' },
  { id: 'hero_gold', kind: 'hero', name: k('黄金の鎧'), band: 'top1' },
  // Pet: flies beside the hero
  { id: 'pet_dragon', kind: 'pet', name: k('ちびドラゴン'), band: 'top1' },
  // Name decoration: shown next to the name in the ranking
  { id: 'deco_medal', kind: 'deco', name: k('銅のメダル'), band: 'top50' },
  { id: 'deco_crown_silver', kind: 'deco', name: k('銀の王冠'), band: 'top10' },
  { id: 'deco_crown_gold', kind: 'deco', name: k('金の王冠'), band: 'top1' },
];

const BAND_RANK: Record<RewardBand, number> = { top1: 3, top10: 2, top50: 1, joined: 0 };

export function getCosmetic(id: string): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.id === id);
}

/** Cosmetics one challenge result earns (a better band also earns the lower bands' items) */
export function cosmeticsForBand(band: RewardBand): string[] {
  return COSMETICS.filter((c) => BAND_RANK[band] >= BAND_RANK[c.band]).map((c) => c.id);
}

/** Season ids look like 'challenge-3' / 'endless-24323'; only the challenge gives cosmetics */
export function isChallengeSeason(season: string): boolean {
  return season.startsWith('challenge-');
}

/** Everything earned from a list of rank rewards */
export function ownedFromRewards(rewards: readonly { season: string; band: string }[]): string[] {
  const out = new Set<string>();
  for (const r of rewards) {
    if (!isChallengeSeason(r.season) || !(r.band in BAND_RANK)) continue;
    for (const id of cosmeticsForBand(r.band as RewardBand)) out.add(id);
  }
  return COSMETICS.map((c) => c.id).filter((id) => out.has(id));
}

/** What the player is wearing (null = the normal look) */
export interface Look {
  hero: string | null;
  pet: string | null;
  deco: string | null;
}

export const NO_LOOK: Look = { hero: null, pet: null, deco: null };

/** Keep only worn items that are owned and of the right kind */
export function validLook(look: Partial<Look> | undefined, owned: readonly string[]): Look {
  const pick = (id: unknown, kind: CosmeticKind) =>
    typeof id === 'string' && owned.includes(id) && getCosmetic(id)?.kind === kind ? id : null;
  return {
    hero: pick(look?.hero, 'hero'),
    pet: pick(look?.pet, 'pet'),
    deco: pick(look?.deco, 'deco'),
  };
}
