// Cosmetics: rewards for adventure milestones and for ranking high in the biweekly challenge. They
// change looks only, never strength.
// Shared by the game and the server (the server checks name decorations, which other players see),
// so keep this file light: what earns a look from play is judged in cosmeticRewards.ts.
import { k } from '../i18n';
import type { RewardBand } from './names';

/** hero: the hero's colors; head / back: accessories worn on the hero; pet; deco: name decoration */
export type CosmeticKind = 'hero' | 'head' | 'back' | 'pet' | 'deco';

/** How a look is earned */
export type CosmeticSource =
  /** Challenge rank band (higher bands earn it too) */
  | { kind: 'rank'; band: Exclude<RewardBand, 'joined'> }
  /** Stars in one region */
  | { kind: 'regionStars'; region: string; stars: number }
  /** Reaching this loop in the endless mode */
  | { kind: 'endlessLoop'; n: number }
  /** Bought in the store (not listed until owned, until the store is connected) */
  | { kind: 'shop'; productId: string };

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  /** Japanese key; shown through t() */
  name: string;
  source: CosmeticSource;
}

export const COSMETICS: readonly CosmeticDef[] = [
  // Hero: armor and cape colors (the hero sprite with its colors swapped)
  {
    id: 'hero_azure',
    kind: 'hero',
    name: k('蒼のマント'),
    source: { kind: 'rank', band: 'top50' },
  },
  {
    id: 'hero_silver_royal',
    kind: 'hero',
    name: k('白銀の鎧'),
    source: { kind: 'rank', band: 'top10' },
  },
  { id: 'hero_gold', kind: 'hero', name: k('黄金の鎧'), source: { kind: 'rank', band: 'top1' } },
  // Accessories on the hero's head and back, one per region (in region order)
  {
    id: 'head_leaf_crown',
    kind: 'head',
    name: k('若葉の冠'),
    source: { kind: 'regionStars', region: 'grassland', stars: 1 },
  },
  {
    id: 'back_bat_wings',
    kind: 'back',
    name: k('コウモリの翼'),
    source: { kind: 'regionStars', region: 'cave', stars: 1 },
  },
  {
    id: 'back_knight_flag',
    kind: 'back',
    name: k('騎士の旗'),
    source: { kind: 'regionStars', region: 'rampart', stars: 1 },
  },
  {
    id: 'head_flame_plume',
    kind: 'head',
    name: k('炎の羽飾り'),
    source: { kind: 'regionStars', region: 'volcano', stars: 1 },
  },
  {
    id: 'head_ice_crystal',
    kind: 'head',
    name: k('氷の結晶'),
    source: { kind: 'regionStars', region: 'glacier', stars: 1 },
  },
  {
    id: 'back_demon_wings',
    kind: 'back',
    name: k('魔王の翼'),
    source: { kind: 'regionStars', region: 'demon_castle', stars: 1 },
  },
  // A ring of light standing behind the back (a halo)
  {
    id: 'back_star_ring',
    kind: 'back',
    name: k('星の輪'),
    source: { kind: 'endlessLoop', n: 10 },
  },
  // Pet: flies beside the hero
  {
    id: 'pet_dragon',
    kind: 'pet',
    name: k('ちびドラゴン'),
    source: { kind: 'rank', band: 'top1' },
  },
  // Name decoration: shown next to the name in the ranking
  {
    id: 'deco_medal',
    kind: 'deco',
    name: k('銅のメダル'),
    source: { kind: 'rank', band: 'top50' },
  },
  {
    id: 'deco_crown_silver',
    kind: 'deco',
    name: k('銀の王冠'),
    source: { kind: 'rank', band: 'top10' },
  },
  {
    id: 'deco_crown_gold',
    kind: 'deco',
    name: k('金の王冠'),
    source: { kind: 'rank', band: 'top1' },
  },
];

const BAND_RANK: Record<RewardBand, number> = { top1: 3, top10: 2, top50: 1, joined: 0 };

export function getCosmetic(id: string): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.id === id);
}

/** Cosmetics one challenge result earns (a better band also earns the lower bands' items) */
export function cosmeticsForBand(band: RewardBand): string[] {
  return COSMETICS.filter(
    (c) => c.source.kind === 'rank' && BAND_RANK[band] >= BAND_RANK[c.source.band],
  ).map((c) => c.id);
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

/** Whether the wardrobe lists a look: store looks only once owned (the store is not connected yet) */
export function shownInWardrobe(def: CosmeticDef, owned: readonly string[]): boolean {
  return def.source.kind !== 'shop' || owned.includes(def.id);
}

/** What the player is wearing (null = the normal look / nothing) */
export interface Look {
  hero: string | null;
  head: string | null;
  back: string | null;
  pet: string | null;
  deco: string | null;
}

export const NO_LOOK: Look = { hero: null, head: null, back: null, pet: null, deco: null };

/** Keep only worn items that are owned and of the right kind */
export function validLook(look: Partial<Look> | undefined, owned: readonly string[]): Look {
  const pick = (id: unknown, kind: CosmeticKind) =>
    typeof id === 'string' && owned.includes(id) && getCosmetic(id)?.kind === kind ? id : null;
  return {
    hero: pick(look?.hero, 'hero'),
    head: pick(look?.head, 'head'),
    back: pick(look?.back, 'back'),
    pet: pick(look?.pet, 'pet'),
    deco: pick(look?.deco, 'deco'),
  };
}
