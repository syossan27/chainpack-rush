// 勇者のオーラの段階（置いている装備の強さ）。描画は src/ui/aura.ts
import type { ItemInstance, Loadout } from './types';
import { getItemDef } from '../data/items';

export type AuraTier = 'none' | 'rare' | 'epic' | 'legendary' | 'artifact';

const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;
/** この数以上置いていれば、その段階のオーラ */
const NEED = 3;

/** バックパックに置いている装備から、オーラの段階を決める */
export function auraTier(loadout: Loadout, items: ReadonlyMap<string, ItemInstance>): AuraTier {
  const placed = loadout.cells
    .map((u) => (u ? items.get(u) : undefined))
    .filter((i): i is ItemInstance => !!i);
  if (placed.some((i) => getItemDef(i.defId).artifact)) return 'artifact';
  const atLeast = (r: number) => placed.filter((i) => RANK[i.rarity] >= r).length;
  if (atLeast(3) >= NEED) return 'legendary';
  if (atLeast(2) >= NEED) return 'epic';
  if (atLeast(1) >= NEED) return 'rare';
  return 'none';
}
