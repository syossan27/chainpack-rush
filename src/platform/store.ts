// アプリ全体で共有するセーブデータ。操作の直後に保存する。
import type { SaveData } from '../core/save';
import { setMasterVolume } from '../audio/sfx';
import { setHapticsEnabled } from './haptics';
import { SIM } from '../config/balance';
import { debugSpeed } from './debug';
import { writeSave } from './storage';
import { leaveChallengeEdit } from '../core/challengeLoadout';

let current: SaveData | null = null;

export function setSave(save: SaveData): void {
  // 挑戦用の編成を編集したまま閉じていたら、ふだんの編成に戻す
  leaveChallengeEdit(save);
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

/** 今のゲームスピード（?speed= があればそれ、なければ設定） */
export function gameSpeed(): number {
  const v = debugSpeed() ?? current?.settings.gameSpeed ?? 1;
  return Math.min(SIM.maxSpeed, Math.max(0.1, v));
}
