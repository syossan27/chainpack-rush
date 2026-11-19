// Trial (charms): the charm case and each board's edge slots in the save. The slots are kept per
// board beside the board layouts (never in Loadout, which presets, ranking and 全部外す use).
import { CHARM } from '../config/balance';
import { getBoard, type BoardId } from '../data/boards';
import { boardSize } from './boards';
import { slotOpen, type CharmInstance, type CharmSlots } from './charms';
import type { SaveData } from './save';

/** A board's slots as stored: one per column then row, unknown charms and missing slots empty */
function storedUids(save: SaveData, id: BoardId): (string | null)[] {
  const board = getBoard(id);
  const { width, height } = boardSize(board);
  const owned = new Set((save.charms ?? []).map((c) => c.uid));
  const raw = save.trialBoards?.charms?.[id] ?? [];
  return Array.from({ length: width + height }, (_, slot) => {
    const uid = raw[slot];
    return typeof uid === 'string' && owned.has(uid) && slotOpen(slot, board) ? uid : null;
  });
}

/** The charm in each slot of a board (columns first, then rows) */
export function boardCharmSlots(save: SaveData, id: BoardId): CharmSlots {
  const byUid = new Map((save.charms ?? []).map((c) => [c.uid, c]));
  return storedUids(save, id).map((u) => (u ? (byUid.get(u) ?? null) : null));
}

/**
 * Put a charm in a board's slot (null takes it off). On the same board it moves out of the slot it
 * was in. False for a slot the board does not have or a charm not owned
 */
export function equipCharm(save: SaveData, id: BoardId, slot: number, uid: string | null): boolean {
  const board = getBoard(id);
  if (!slotOpen(slot, board)) return false;
  if (uid !== null && !(save.charms ?? []).some((c) => c.uid === uid)) return false;
  const slots = storedUids(save, id).map((u) => (u === uid ? null : u));
  slots[slot] = uid;
  save.trialBoards = {
    active: save.trialBoards?.active ?? 'standard',
    layouts: save.trialBoards?.layouts ?? {},
    ...save.trialBoards,
    charms: { ...save.trialBoards?.charms, [id]: slots },
  };
  return true;
}

/** Worn on any board */
export function charmEquipped(save: SaveData, uid: string): boolean {
  return Object.values(save.trialBoards?.charms ?? {}).some((slots) => slots?.includes(uid));
}

export function charmSellPrice(c: CharmInstance): number {
  return CHARM.sell[c.rarity];
}

/** Sell a charm from the case (0: worn somewhere, or not owned) */
export function sellCharm(save: SaveData, uid: string): number {
  const c = (save.charms ?? []).find((x) => x.uid === uid);
  if (!c || charmEquipped(save, uid)) return 0;
  save.charms = (save.charms ?? []).filter((x) => x.uid !== uid);
  const price = charmSellPrice(c);
  save.gold += price;
  return price;
}

/**
 * The charms a run picked up go into the case, in the order they dropped. When the case is full the
 * rest are sold for gold (said on the result screen)
 */
export function acceptCharms(
  save: SaveData,
  drops: readonly CharmInstance[],
): { added: CharmInstance[]; sold: CharmInstance[]; gold: number } {
  const added: CharmInstance[] = [];
  const sold: CharmInstance[] = [];
  const owned = (save.charms ??= []);
  for (const d of drops) {
    if (owned.length < CHARM.capacity) {
      const c: CharmInstance = { uid: `c${save.nextUid++}`, defId: d.defId, rarity: d.rarity };
      owned.push(c);
      added.push(c);
    } else sold.push(d);
  }
  const gold = sold.reduce((sum, c) => sum + charmSellPrice(c), 0);
  save.gold += gold;
  return { added, sold, gold };
}
