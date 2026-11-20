// Moving a version 1 save (the free-placement bag, with trials as switches) to version 2 (the
// stacked board as the main game). Pure: no Phaser. See the spec of 2026-11-20 (trials-to-main) 1.2
import { getTechnique } from '../data/techniques';
import { getItemDef } from '../data/items';
import { autoBoard } from './autoBoard';
import { activeBoardId } from './boardSave';
import { consumableSlots, itemMap } from './economy';
import type { SaveData } from './save';
import { boardUids, restoreStackBoard } from './stack';
import type { Loadout } from './types';

/** What only a version 1 save has, read and checked by deserializeSave */
export interface LegacyV1 {
  /** The bag's layout (the active preset's when a board was left being edited), or null */
  bag: Loadout | null;
  /** The stacked board left being edited (it sat in loadout), or null */
  editingBoard: Loadout | null;
  backpackLevel: number;
  /** Techniques found (the old 図鑑) */
  discoveredTechs: string[];
  /** Sorties used the stacked board (the debug setting and its trial switch were on), not the bag */
  stackSortie: boolean;
}

/** Gold paid for the backpack upgrade by level (300, then 600, then 1200): given back */
export const BACKPACK_REFUND: readonly number[] = [0, 300, 900, 2100];

/**
 * Version 1 → 2: the chosen stacked board (laid out from the gear when there is none) goes into
 * loadout, the bag and presets go (the gear never left storage), the backpack upgrade is paid back,
 * found techniques count as learned, the challenge layout is made again on its next use, and the
 * bag screen's guides are forgotten. Records, achievements, stars and unlocks stay
 */
export function migrateV1(save: SaveData, legacy: LegacyV1): SaveData {
  if (legacy.editingBoard)
    save.boards.layouts[legacy.editingBoard.board ?? 'standard'] = legacy.editingBoard;
  const id = activeBoardId(save);
  save.boards.active = id;
  const owned = itemMap(save);
  const slots = consumableSlots(save);
  const rec = save.boards.layouts[id];
  delete save.boards.layouts[id];
  const kept = rec ? restoreStackBoard(rec, owned, slots, id) : null;
  // The consumable slots follow the player: the bag's, unless sorties used the kept board
  const bag = legacy.bag;
  const bagSlots = {
    consumables: (bag?.consumables ?? [])
      .filter((u) => {
        const it = owned.get(u);
        return !!it && getItemDef(it.defId).kind === 'consumable';
      })
      .slice(0, slots),
    ...(bag?.consumableAuto ? { consumableAuto: bag.consumableAuto.slice() } : {}),
  };
  if (kept && boardUids(kept).length > 0) {
    if (legacy.stackSortie) save.loadout = kept;
    else {
      save.loadout = { ...kept, ...bagSlots };
      if (!bagSlots.consumableAuto) delete save.loadout.consumableAuto;
    }
  } else save.loadout = { ...autoBoard(save.inventory, id), ...bagSlots };
  const level = Math.max(
    0,
    Math.min(BACKPACK_REFUND.length - 1, Math.floor(legacy.backpackLevel) || 0),
  );
  save.gold += BACKPACK_REFUND[level]!;
  save.mastery.learned = [...new Set([...save.mastery.learned, ...legacy.discoveredTechs])].filter(
    (t) => !!getTechnique(t),
  );
  save.challengeLoadout = null;
  delete save.editingChallenge;
  save.tutorialSeen = save.tutorialSeen.filter((k) => k !== 'merge' && k !== 'loadout');
  return save;
}
