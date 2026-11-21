// The boards' shapes and traits, and which boards the player has. Pure: no
// Phaser.
import { PROGRESS, STACK } from '../config/balance';
import { BOARDS, getBoard, type BoardDef } from '../data/boards';
import { REGIONS } from '../data/regions';
import type { SaveData } from './save';
import type { Element, GimmickKind, Loadout } from './types';

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

/** The boards the player has: the standard one, each cleared region's reward, and (debug) trials */
export function ownedBoards(save: SaveData): BoardDef[] {
  return BOARDS.filter((b) =>
    b.trial ? save.settings.debug : !b.reward || regionCleared(save, b.reward),
  );
}

/**
 * Gimmick cells (trial): a layout's gimmicks kept to its board — the right length, only on cells
 * of the shape, and no more of a kind than the board has. Boards without gimmicks: none
 */
export function fitGimmicks(l: Loadout): void {
  const kinds = l.board ? getBoard(l.board).gimmicks : undefined;
  if (!kinds) {
    delete l.gimmicks;
    return;
  }
  const left = new Map<GimmickKind, number>();
  for (const k of kinds) left.set(k, (left.get(k) ?? 0) + 1);
  l.gimmicks = l.cells.map((_, i) => {
    const g = l.gimmicks?.[i] ?? null;
    if (!g || holeIn(l, i) || (left.get(g) ?? 0) <= 0) return null;
    left.set(g, left.get(g)! - 1);
    return g;
  });
}

/** Gimmick cells: the board's gimmicks not yet on a cell, in the board's order */
export function gimmicksLeft(l: Loadout): GimmickKind[] {
  const left = [...((l.board ? getBoard(l.board).gimmicks : undefined) ?? [])];
  for (const g of l.gimmicks ?? []) {
    const i = g ? left.indexOf(g) : -1;
    if (i >= 0) left.splice(i, 1);
  }
  return left;
}
