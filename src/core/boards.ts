// Trial (stacked board): the boards' shapes and traits, and which boards the player has. Pure: no
// Phaser.
import { PROGRESS, STACK } from '../config/balance';
import { BOARDS, getBoard, type BoardDef } from '../data/boards';
import { REGIONS } from '../data/regions';
import type { SaveData } from './save';
import type { Element, Loadout } from './types';

export function boardSize(def: BoardDef): { width: number; height: number } {
  return { width: def.mask[0]?.length ?? 0, height: def.mask.length };
}

/** A cell outside the board's shape (nothing can go there) */
export function isHole(def: BoardDef, cell: number): boolean {
  const { width } = boardSize(def);
  const row = def.mask[Math.floor(cell / width)];
  return cell < 0 || row === undefined || row[cell % width] !== 'X';
}

/** A hole of this loadout's board (an ordinary bag names no board and has none) */
export function holeIn(l: Loadout, cell: number): boolean {
  return l.board !== undefined && isHole(getBoard(l.board), cell);
}

/** Items per cell */
export function boardDepth(def: BoardDef): number {
  return def.depth ?? STACK.max;
}

/** Damage / defense multiplier by position from the bottom */
export function boardPosMult(def: BoardDef): readonly number[] {
  return boardDepth(def) > STACK.max ? STACK.deepPosMult : STACK.posMult;
}

/** All damage, and the damage of this element */
export function boardDamageMult(def: BoardDef, element: Element | undefined): number {
  return (def.damage ?? 1) * (def.elements?.[element ?? 'physical'] ?? 1);
}

/** The number shown for {v} in the trait's text */
export function boardValue(def: BoardDef): number | undefined {
  if (def.wait !== undefined) return def.wait;
  if (def.damage !== undefined) return def.damage;
  const el = def.elements ? Object.values(def.elements)[0] : undefined;
  if (el !== undefined) return el;
  return def.depth;
}

/** The region is cleared: the next one is open, or (the last region) loop 3's boss was beaten */
export function regionCleared(save: SaveData, regionId: string): boolean {
  const i = REGIONS.findIndex((r) => r.id === regionId);
  const next = REGIONS[i + 1];
  if (next && save.progress.unlocked.includes(next.id)) return true;
  return (save.progress.best[regionId] ?? 0) > PROGRESS.unlockLoop;
}

/** The boards the player has: the standard one, and each cleared region's reward */
export function ownedBoards(save: SaveData): BoardDef[] {
  return BOARDS.filter((b) => !b.reward || regionCleared(save, b.reward));
}
