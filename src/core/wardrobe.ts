// What the wardrobe screen shows: its tabs, one card per look in a tab, and the NEW marks.
// Pure: no Phaser (the screen itself is BaseScene.renderWardrobe).
import { k } from '../i18n';
import { cosmeticCondition, cosmeticProgress } from './cosmeticRewards';
import { COSMETICS, getCosmetic, shownInWardrobe, validLook, type CosmeticKind } from './cosmetics';
import type { SaveData } from './save';

/** The tabs, left to right. `label` is a Japanese key shown through t() */
export const WARDROBE_TABS: readonly { kind: CosmeticKind; label: string }[] = [
  { kind: 'hero', label: k('勇者') },
  { kind: 'head', label: k('頭') },
  { kind: 'back', label: k('背中') },
  { kind: 'pet', label: k('ペット') },
  { kind: 'deco', label: k('名前の飾り') },
];

export interface WardrobeCard {
  /** null = the normal look / nothing worn there */
  id: string | null;
  owned: boolean;
  worn: boolean;
  /** Owned but not seen in the wardrobe yet */
  isNew: boolean;
  /** How to earn it (only for looks not owned) */
  condition: string | null;
  /** 'have/need' (only for looks not owned that have a count) */
  progress: string | null;
}

/** The cards of one tab: "nothing" first, then the listed looks in catalog order */
export function wardrobeCards(save: SaveData, kind: CosmeticKind, ownsAll = false): WardrobeCard[] {
  const none: WardrobeCard = {
    id: null,
    owned: true,
    worn: save.look[kind] === null,
    isNew: false,
    condition: null,
    progress: null,
  };
  const looks = COSMETICS.filter(
    (c) => c.kind === kind && (ownsAll || shownInWardrobe(c, save.cosmetics)),
  );
  return [
    none,
    ...looks.map((c) => {
      const owned = ownsAll || save.cosmetics.includes(c.id);
      const p = owned ? null : cosmeticProgress(save, c.id);
      return {
        id: c.id,
        owned,
        worn: save.look[kind] === c.id,
        isNew: save.newCosmetics.includes(c.id),
        condition: owned ? null : cosmeticCondition(c),
        progress: p ? `${p.have}/${p.need}` : null,
      };
    }),
  ];
}

/** Tabs (kinds) that hold looks not seen yet, in tab order */
export function newKinds(save: SaveData): CosmeticKind[] {
  const kinds = new Set(save.newCosmetics.map((id) => getCosmetic(id)?.kind));
  return WARDROBE_TABS.map((tab) => tab.kind).filter((kind) => kinds.has(kind));
}

/** The looks of this kind have been seen (their tab was shown) */
export function markSeen(save: SaveData, kind: CosmeticKind): void {
  save.newCosmetics = save.newCosmetics.filter((id) => getCosmetic(id)?.kind !== kind);
}

/** The tab to open on: the leftmost one with new looks, else the hero */
export function firstTab(save: SaveData): CosmeticKind {
  return newKinds(save)[0] ?? 'hero';
}

/**
 * Every look counts as owned: the debug setting is on and this build allows it (`allowed`:
 * development and trial builds). The looks really owned are not changed
 */
export function looksAllOpen(save: SaveData, allowed: boolean): boolean {
  return allowed && save.settings.debug;
}

/** Take off worn looks that may not be worn now (after the debug setting went off, or on boot) */
export function fixLook(save: SaveData, allowed: boolean): void {
  const wearable = looksAllOpen(save, allowed) ? COSMETICS.map((c) => c.id) : save.cosmetics;
  save.look = validLook(save.look, wearable);
}

/** The name decoration to send to the ranking: only one really owned (the server checks it) */
export function rankingDeco(save: SaveData): string | null {
  const id = save.look.deco;
  return id && save.cosmetics.includes(id) ? id : null;
}
