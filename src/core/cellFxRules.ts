// Which effect each piece of gear plays on its cell as the chain rings it, and how the chain's
// heat grows with its steps (pure: the drawing is ui/cellFx.ts)
import type { ItemDef } from './types';

export type CellFxKind =
  | 'fire'
  | 'ice'
  | 'thunder'
  | 'wind'
  | 'slash'
  | 'blunt'
  | 'water'
  | 'oil'
  | 'light'
  | 'dark'
  | 'poison'
  | 'guard';

export const CELL_FX = {
  /** Chain steps where the heat goes up a level (5 → 1, 10 → 2, 20 → 3, 40 → 4) */
  heatSteps: [5, 10, 20, 40],
  /** Art size at each heat level (× the base size) */
  heatScale: [1, 1.15, 1.3, 1.5, 1.7],
  /** At most this many cell effects in 100 ms (a stack rings three times in a row) */
  budget: 8,
} as const;

/** The chain's heat at this step (0 … 4) */
export function chainHeat(step: number): number {
  return CELL_FX.heatSteps.filter((s) => step >= s).length;
}

/** Which effect a piece of gear plays on its cell (null: none, e.g. an origin stone) */
export function cellFxKind(def: ItemDef): CellFxKind | null {
  if (def.kind === 'defense') return 'guard';
  if (def.kind !== 'attack') return null;
  if (def.applies === 'poison') return 'poison';
  switch (def.element) {
    case 'fire':
      return 'fire';
    case 'ice':
      return 'ice';
    case 'thunder':
      return 'thunder';
    case 'wind':
      return 'wind';
    case 'blunt':
      return 'blunt';
    case 'water':
      return 'water';
    case 'oil':
      return 'oil';
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    default:
      return 'slash';
  }
}
