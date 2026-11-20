// 保存は @capacitor/preferences（WebView の localStorage は OS に消されることがあるため直接使わない）
import { Preferences } from '@capacitor/preferences';
import {
  SAVE_SLOT_KEY,
  deserializeSave,
  freshStartSave,
  olderKeysFor,
  pickSaveRaw,
  saveKeyFor,
  serializeSave,
  type SaveData,
  type SaveSlot,
} from '../core/save';
import { debugMenuAllowed } from './debug';

/** The save in use (debug: 'fresh' is the second save played from zero) */
let slot: SaveSlot = 'main';

export function activeSlot(): SaveSlot {
  return slot;
}

export async function loadSave(): Promise<SaveData> {
  try {
    // The second save exists only where the debug menu does (never in a release build)
    if (debugMenuAllowed()) {
      const { value } = await Preferences.get({ key: SAVE_SLOT_KEY });
      slot = value === 'fresh' ? 'fresh' : 'main';
    }
    // Each version lives under its own key; an older save is read from its key and moved (an old key
    // is never written again, so an older build would still find its save as it was)
    const values: (string | null)[] = [];
    for (const key of [saveKeyFor(slot), ...olderKeysFor(slot)]) {
      values.push((await Preferences.get({ key })).value);
      if (values[values.length - 1] !== null) break;
    }
    return deserializeSave(pickSaveRaw(values));
  } catch {
    return deserializeSave(null);
  }
}

let pending: Promise<void> = Promise.resolve();

/** 書き込みは順番に行う（連続した保存で古い内容が後から書かれないように） */
export function writeSave(save: SaveData): Promise<void> {
  const value = serializeSave(save);
  const key = saveKeyFor(slot);
  pending = pending.then(() => Preferences.set({ key, value })).catch(() => undefined);
  return pending;
}

/**
 * Debug: switch to the other save and start the game again. Going to the fresh save keeps its
 * progress unless `restart` (or it does not exist yet), which makes a new one from zero with the
 * current settings. The real save is never touched
 */
export async function switchSlot(to: SaveSlot, current: SaveData, restart = false): Promise<void> {
  await pending;
  if (to === 'fresh') {
    let found = false;
    for (const key of [saveKeyFor('fresh'), ...olderKeysFor('fresh')])
      if ((await Preferences.get({ key })).value !== null) found = true;
    if (restart || !found) {
      await Preferences.set({
        key: saveKeyFor('fresh'),
        value: serializeSave(freshStartSave(current)),
      });
    }
  }
  await Preferences.set({ key: SAVE_SLOT_KEY, value: to });
  window.location.reload();
}
