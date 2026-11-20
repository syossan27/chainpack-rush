// What each kind of run uses (stacked board, chain count across kills, mastery, relics, treasure
// goblin, charms). One table for the game, the bots and the ranking server. Pure: no Phaser.
import type { ChainRules } from '../config/balance';
import { ENDLESS } from '../data/regions';

export type RunKind = 'normal' | 'endless' | 'challenge' | 'demo' | 'dummy';

export interface RunFeatures {
  /** Which board the run uses: the chosen one, the challenge layout, or the scripted demo board */
  board: 'chosen' | 'challenge' | 'demo';
  /** The chain count goes on across kills */
  keepCount: boolean;
  /** grow: levels and sparks count; fixed: the current levels, no sparks; off: every technique fires */
  mastery: 'grow' | 'fixed' | 'off';
  /** A beaten boss offers run-only relics */
  relics: boolean;
  /** A fleeing treasure goblin may take a group's place */
  treasure: boolean;
  /** equipDrop: worn on the edge and may drop; equip: worn only; off: not used */
  charms: 'equipDrop' | 'equip' | 'off';
}

const TABLE: Record<RunKind, RunFeatures> = {
  normal: {
    board: 'chosen',
    keepCount: true,
    mastery: 'grow',
    relics: true,
    treasure: true,
    charms: 'equipDrop',
  },
  // Endless drops no loot: no goblin, no charm drops
  endless: {
    board: 'chosen',
    keepCount: true,
    mastery: 'grow',
    relics: true,
    treasure: false,
    charms: 'equip',
  },
  // Everyone on equal terms: the standard board and the chain rule only
  challenge: {
    board: 'challenge',
    keepCount: true,
    mastery: 'off',
    relics: false,
    treasure: false,
    charms: 'off',
  },
  demo: {
    board: 'demo',
    keepCount: true,
    mastery: 'off',
    relics: false,
    treasure: false,
    charms: 'off',
  },
  // The scarecrow tries the chosen board as it is: nothing is learned there
  dummy: {
    board: 'chosen',
    keepCount: true,
    mastery: 'fixed',
    relics: false,
    treasure: false,
    charms: 'equip',
  },
};

export function runFeatures(kind: RunKind): RunFeatures {
  return { ...TABLE[kind] };
}

/** The kind of a sortie (the scarecrow is never one) */
export function runKindOf(run: { regionId: string; challenge: boolean; demo: boolean }): RunKind {
  if (run.challenge) return 'challenge';
  if (run.demo) return 'demo';
  if (run.regionId === ENDLESS.id) return 'endless';
  return 'normal';
}

/** The chain rules a run's features ask for (undefined: the defaults) */
export function featureRules(f: RunFeatures): Partial<ChainRules> | undefined {
  return f.keepCount ? { keepCountOnKill: true } : undefined;
}
