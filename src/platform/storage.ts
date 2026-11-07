// 保存は @capacitor/preferences（WebView の localStorage は OS に消されることがあるため直接使わない）
import { Preferences } from '@capacitor/preferences';
import { SAVE_KEY, deserializeSave, serializeSave, type SaveData } from '../core/save';

export async function loadSave(): Promise<SaveData> {
  try {
    const { value } = await Preferences.get({ key: SAVE_KEY });
    return deserializeSave(value);
  } catch {
    return deserializeSave(null);
  }
}

let pending: Promise<void> = Promise.resolve();

/** 書き込みは順番に行う（連続した保存で古い内容が後から書かれないように） */
export function writeSave(save: SaveData): Promise<void> {
  const value = serializeSave(save);
  pending = pending.then(() => Preferences.set({ key: SAVE_KEY, value })).catch(() => undefined);
  return pending;
}
