// 呼応 (2026-11-26): gear's random orders on the chain around it, in place of the old affixes. Each
// is "when the piece rung just before (or a piece rung just after) is X, this one is stronger".
// Before: the top of the cell the chain came from. After: a cell the chain went on to from here.
// The pieces of one stack never count for each other. Decided in planChain, so the board screen,
// the estimate and the battle agree. Pure: no Phaser.
import { CALL } from '../config/balance';
import { getItemDef } from '../data/items';
import type { Rng } from './rng';
import type { Element, ItemDef, ItemInstance, Rarity } from './types';

/** Which piece it looks at */
export type CallSide = 'prev' | 'next';
/** What that piece must be: an attack of this element, defense gear, an origin stone, or the same gear */
export type CallWant = Element | 'defense' | 'origin' | 'same';

export interface Call {
  side: CallSide;
  want: CallWant;
  /** The bonus when it holds (%): damage for attack gear, defense for defense gear */
  v: number;
}

const ELEMENTS: readonly Element[] = [
  'physical',
  'blunt',
  'fire',
  'thunder',
  'ice',
  'water',
  'oil',
  'wind',
  'light',
  'dark',
];

const WANTS: readonly CallWant[] = [...ELEMENTS, 'defense', 'origin', 'same'];

/** Whether a piece is what a call wants (`me`: the piece with the call) */
function matches(want: CallWant, other: ItemInstance, me: ItemInstance): boolean {
  const d = getItemDef(other.defId);
  if (want === 'same') return other.defId === me.defId;
  if (want === 'defense' || want === 'origin') return d.kind === want;
  return d.kind === 'attack' && (d.element ?? 'physical') === want;
}

/**
 * The multiplier a piece's calls give it (1: none hold). `prev`: the top of the cell before (null
 * at the first cell, or none), `next`: the tops of the cells the chain went on to
 */
export function callMult(
  me: ItemInstance,
  prev: ItemInstance | null,
  next: readonly ItemInstance[],
): number {
  let m = 1;
  for (const c of me.calls ?? []) {
    const ok =
      c.side === 'prev'
        ? !!prev && matches(c.want, prev, me)
        : next.some((n) => matches(c.want, n, me));
    if (ok) m *= 1 + c.v / 100;
  }
  return m;
}

/** The calls a piece of gear can roll (origin stones, consumables and artifacts: none) */
function canCall(def: ItemDef): boolean {
  return !def.artifact && (def.kind === 'attack' || def.kind === 'defense');
}

/** The sides and wants this gear may roll ('origin' only before: nothing rings an origin after) */
function choices(def: ItemDef): { side: CallSide; want: CallWant }[] {
  const out: { side: CallSide; want: CallWant }[] = [];
  for (const side of ['prev', 'next'] as const)
    for (const want of WANTS) {
      if (want === 'origin' && side === 'next') continue;
      if (want === 'same' && def.kind !== 'attack') continue;
      out.push({ side, want });
    }
  return out;
}

/** Calls for gear just picked up: how many by rarity, each a different one */
export function rollCalls(rng: Rng, defId: string, rarity: Rarity): Call[] {
  const def = getItemDef(defId);
  if (!canCall(def)) return [];
  const c = CALL.count[rarity];
  const n = c.base + (rng.next() < c.extraChance ? 1 : 0);
  return rng.sample(choices(def), n).map((x) => ({
    ...x,
    v: CALL.min + rng.int(CALL.max - CALL.min + 1),
  }));
}

/** Whether a call is one this gear could have (saves and records sent to the ranking) */
export function validCalls(it: ItemInstance): boolean {
  const list = it.calls;
  if (list === undefined) return true;
  const def = getItemDef(it.defId);
  if (!canCall(def) || !Array.isArray(list) || list.length === 0) return false;
  if (list.length > CALL.count[it.rarity].base + 1) return false;
  const ok = choices(def);
  const seen = new Set<string>();
  for (const c of list) {
    const key = `${c.side}:${c.want}`;
    if (seen.has(key) || !ok.some((x) => x.side === c.side && x.want === c.want)) return false;
    if (!Number.isInteger(c.v) || c.v < CALL.min || c.v > CALL.max) return false;
    seen.add(key);
  }
  return true;
}

export function isCallShape(v: unknown): v is Call {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    (c.side === 'prev' || c.side === 'next') &&
    WANTS.includes(c.want as CallWant) &&
    typeof c.v === 'number'
  );
}
