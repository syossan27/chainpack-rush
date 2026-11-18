// Trial (mastery): the hero's mastery per element grows with every ring of attack gear; a level
// adds a little damage to that element. Techniques are not known until they spark in a run (see
// Combat). Pure: no Phaser.
import { MASTERY } from '../config/balance';
import { ELEMENT_NAMES } from '../data/items';
import type { RunMastery } from './combat';
import type { SaveData } from './save';
import type { Element } from './types';

/** What the trial keeps between runs */
export interface MasteryData {
  /** Rings so far, per element */
  points: Partial<Record<Element, number>>;
  /** Techniques learned by a spark */
  learned: string[];
}

export function isElement(s: string): s is Element {
  return s in ELEMENT_NAMES;
}

/** Rings needed in all to reach this level */
export function pointsForLevel(level: number): number {
  return (MASTERY.base * level * (level + 1)) / 2;
}

export function masteryLevel(points: number): number {
  let level = 0;
  while (points >= pointsForLevel(level + 1)) level++;
  return level;
}

/** The chance that a technique of an element at this level sparks when its line-up comes */
export function sparkChance(level: number): number {
  return Math.min(1, level * MASTERY.sparkPerLevel);
}

/** The levels and learned techniques a run starts with */
export function runMastery(save: SaveData): RunMastery {
  const m = save.mastery;
  const levels: Partial<Record<Element, number>> = {};
  for (const [el, pts] of Object.entries(m?.points ?? {}))
    if (isElement(el)) levels[el] = masteryLevel(pts ?? 0);
  return { levels, learned: (m?.learned ?? []).slice() };
}

export interface MasteryGain {
  element: Element;
  added: number;
  levelBefore: number;
  levelAfter: number;
}

/** A run's rings and sparks are kept; returns what grew and what was newly learned */
export function recordMastery(
  save: SaveData,
  rings: Partial<Record<Element, number>>,
  sparks: readonly string[],
): { gains: MasteryGain[]; learned: string[] } {
  const m = (save.mastery ??= { points: {}, learned: [] });
  const gains: MasteryGain[] = [];
  for (const [el, n] of Object.entries(rings)) {
    if (!isElement(el) || !n) continue;
    const before = m.points[el] ?? 0;
    m.points[el] = before + n;
    gains.push({
      element: el,
      added: n,
      levelBefore: masteryLevel(before),
      levelAfter: masteryLevel(before + n),
    });
  }
  const learned = [...new Set(sparks)].filter((id) => !m.learned.includes(id));
  m.learned.push(...learned);
  return { gains, learned };
}
