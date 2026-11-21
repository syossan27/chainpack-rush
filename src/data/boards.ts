// The boards to arrange gear on. Each has a shape (cells outside it are holes)
// and one trait. A region's reward board helps in the next region.
import type { Element, GimmickKind } from '../core/types';

export type BoardId =
  | 'standard'
  | 'gale'
  | 'small'
  | 'crystal'
  | 'flame'
  | 'lightning'
  | 'deep'
  | 'spin'
  | 'turnout'
  | 'link';

export interface BoardDef {
  id: BoardId;
  name: string;
  /** Rows of the shape: X is a cell, . is a hole */
  mask: readonly string[];
  /** The region that gives it the first time it is cleared (none: owned from the start) */
  reward?: string;
  /** What the trait does, for the screen ({v} is the trait's value) */
  text?: string;
  /** All damage × this */
  damage?: number;
  /** Damage of these elements × the value */
  elements?: Partial<Record<Element, number>>;
  /** The wait before the next chain × this */
  wait?: number;
  /** Items per cell (3 when absent) */
  depth?: number;
  /** Gimmick cells (trial): the gimmicks the player may put on cells of this board, in order */
  gimmicks?: readonly GimmickKind[];
  /** Trial: owned only with the debug setting on */
  trial?: boolean;
}

// prettier-ignore
export const BOARDS: readonly BoardDef[] = [
  { id: 'standard', name: '標準の盤面', mask: ['XXXX', 'XXXX', 'XXXX'] },
  {
    id: 'gale', name: '疾風の盤面', reward: 'grassland', wait: 0.7,
    text: '次の連鎖までの待ち ×{v}', mask: ['XXXXX', 'XXXXX'],
  },
  {
    id: 'small', name: '小さな盤面', reward: 'cave', damage: 1.25,
    text: 'ダメージ ×{v}', mask: ['XXX', 'XXX'],
  },
  {
    id: 'crystal', name: '結晶の盤面', reward: 'rampart', elements: { ice: 2, water: 2 },
    text: '氷と水の攻撃力 ×{v}', mask: ['..X..', '.XXX.', 'XXXXX', '.XXX.'],
  },
  {
    id: 'flame', name: '炎の盤面', reward: 'volcano', elements: { fire: 2 },
    text: '炎の攻撃力 ×{v}', mask: ['..X.', '.XX.', '.XXX', 'XXXX'],
  },
  {
    id: 'lightning', name: '稲妻の盤面', reward: 'glacier', elements: { thunder: 2 },
    text: '雷の攻撃力 ×{v}', mask: ['..XX', '.XX.', 'XXXX', '.XX.', 'XX..'],
  },
  {
    id: 'deep', name: '深い盤面', reward: 'demon_castle', depth: 4,
    text: '1マスに{v}つまで重ねられる', mask: ['XXX', 'XXX', 'XXX'],
  },
  // Gimmick cells (trial, debug only): they change only where the chain goes
  {
    id: 'spin', name: '回る盤面', trial: true, gimmicks: ['rotate', 'rotate'],
    text: '回転マスを2つ置ける', mask: ['XXXX', 'XXXX', 'XXXX'],
  },
  {
    id: 'turnout', name: '切り替えの盤面', trial: true, gimmicks: ['switch', 'switch'],
    text: '切り替えマスを2つ置ける', mask: ['XXXX', 'XXXX', 'XXXX'],
  },
  {
    id: 'link', name: 'つなぐ盤面', trial: true, gimmicks: ['warp', 'warp', 'rotate'],
    text: 'ワープ1組と回転マスを置ける', mask: ['XXXX', 'XXXX', 'XXXX'],
  },
];

export function getBoard(id: string | undefined): BoardDef {
  return BOARDS.find((b) => b.id === id) ?? BOARDS[0]!;
}

export function isBoardId(id: unknown): id is BoardId {
  return typeof id === 'string' && BOARDS.some((b) => b.id === id);
}
