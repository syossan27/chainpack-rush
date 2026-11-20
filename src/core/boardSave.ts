// The stacked boards in the save. The chosen board's layout sits in `loadout` (so equipped gear,
// consumables, the share card and the aura read it as they are); the other boards' layouts wait in
// `boards.layouts`. Pure: no Phaser.
import type { BoardId } from '../data/boards';
import { autoBoard } from './autoBoard';
import { ownedBoards } from './boards';
import type { SaveData } from './save';
import { boardUids, restoreStackBoard } from './stack';
import type { Loadout } from './types';

/** The chosen board (the standard one if that board is not owned) */
export function activeBoardId(save: SaveData): BoardId {
  const id = save.boards.active;
  return ownedBoards(save).some((b) => b.id === id) ? id : 'standard';
}

const copy = (l: Loadout): Loadout => JSON.parse(JSON.stringify(l)) as Loadout;

/**
 * Choose another owned board: the layout in use is kept as its board's, and the new board's layout
 * comes in (laid out from the gear the first time). The consumable slots stay as they are: they go
 * with the player, not the board. False if the board is not owned
 */
export function switchBoard(save: SaveData, id: BoardId): boolean {
  if (!ownedBoards(save).some((b) => b.id === id)) return false;
  const now = save.loadout.board ?? 'standard';
  save.boards.active = id;
  if (id === now) return true;
  save.boards.layouts[now] = copy(save.loadout);
  const rec = save.boards.layouts[id];
  delete save.boards.layouts[id];
  const owned = new Map(save.inventory.map((i) => [i.uid, i]));
  const board = rec ? restoreStackBoard(rec, owned, 0, id) : autoBoard(save.inventory, id);
  save.loadout = {
    ...board,
    consumables: save.loadout.consumables.slice(),
    ...(save.loadout.consumableAuto ? { consumableAuto: save.loadout.consumableAuto.slice() } : {}),
  };
  return true;
}

/** Gear used on a board other than the one in `loadout` → those boards (consumables not counted) */
export function otherBoardUse(save: SaveData): Map<string, BoardId[]> {
  const out = new Map<string, BoardId[]>();
  const here = save.loadout.board ?? 'standard';
  for (const [id, l] of Object.entries(save.boards.layouts) as [BoardId, Loadout | undefined][]) {
    if (!l || id === here) continue;
    for (const u of boardUids(l)) {
      const list = out.get(u) ?? [];
      if (!list.includes(id)) list.push(id);
      out.set(u, list);
    }
  }
  return out;
}
