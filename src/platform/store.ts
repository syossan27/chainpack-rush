// アプリ全体で共有するセーブデータ。操作の直後に保存する。
import type { SaveData } from '../core/save';
import { setMasterVolume } from '../audio/sfx';
import { setHapticsEnabled } from './haptics';
import { writeSave } from './storage';

let current: SaveData | null = null;

export function setSave(save: SaveData): void {
  current = save;
  applySettings();
}

export function getSave(): SaveData {
  if (!current) throw new Error('save not loaded');
  return current;
}

export function persist(): void {
  if (current) void writeSave(current);
}

export function applySettings(): void {
  if (!current) return;
  setHapticsEnabled(current.settings.haptics);
  setMasterVolume(current.settings.volume);
}
