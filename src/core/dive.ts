// Trial (dive): a sortie goes down floors. Each floor is a map of rows to choose from, then the
// boss; a node is one fight (or a camp), HP carries over, and laws picked after elites and bosses
// bend the chain until the dive ends. The bag is brought home on the way back; falling keeps half.
// Pure: no Phaser.
import { DIVE, LAW } from '../config/balance';
import { getItemDef } from '../data/items';
import { LAWS, type LawId } from '../data/laws';
import type { HeroStats, RunResult, RunStats } from './combat';
import { Rng } from './rng';
import { stackAt, stackGroup } from './stack';
import type { ItemInstance, Loadout } from './types';

export type NodeKind = 'fight' | 'elite' | 'camp' | 'boss';

export interface DiveNode {
  kind: NodeKind;
  /** Columns of the next row this node leads to */
  next: number[];
}

/** Rows of nodes, the last row being the boss alone */
export type DiveMap = DiveNode[][];

export interface DivePos {
  row: number;
  col: number;
}

export interface DiveState {
  regionId: string;
  seed: number;
  floor: number;
  map: DiveMap;
  /** The node reached last on this floor (null: the floor has just begun) */
  pos: DivePos | null;
  /** The node at pos is to be fought now (false: its fight is over, or it is a camp) */
  fighting: boolean;
  hp: number;
  laws: LawId[];
  /** Fights won in this dive */
  wins: number;
  /** Gear picked up, brought home on the way back */
  bag: ItemInstance[];
  gold: number;
  /** Consumables used so far (they are gone from the slots for the rest of the dive) */
  used: string[];
  stats: RunStats;
  ticks: number;
  /** Fights started (each one gets its own seed) */
  fights: number;
}

function emptyStats(): RunStats {
  return {
    fires: 0,
    maxStep: 0,
    maxDamage: 0,
    totalDamage: 0,
    bossesDefeated: 0,
    timeGained: 0,
    gold: 0,
    sweeps: 0,
  };
}

/** A floor: DIVE.rows rows of 2–3 nodes to choose from, each leading to near nodes below, then the boss */
export function rollFloorMap(rng: Rng): DiveMap {
  const [lo, hi] = DIVE.rowSize;
  const w = DIVE.kindWeights;
  const rows: DiveNode[][] = [];
  for (let r = 0; r < DIVE.rows; r++) {
    const size = lo + rng.int(hi - lo + 1);
    const kinds: [NodeKind, number][] =
      r === 0
        ? [
            ['fight', w.fight],
            ['elite', w.elite],
          ]
        : [
            ['fight', w.fight],
            ['elite', w.elite],
            ['camp', w.camp],
          ];
    rows.push(Array.from({ length: size }, () => ({ kind: rng.weighted(kinds), next: [] })));
  }
  // At least one camp (not in the first row) and one elite on every floor
  const all = rows.flatMap((row, r) => row.map((n) => ({ n, r })));
  if (!all.some((x) => x.n.kind === 'camp')) rng.pick(all.filter((x) => x.r > 0)).n.kind = 'camp';
  if (!all.some((x) => x.n.kind === 'elite'))
    rng.pick(all.filter((x) => x.n.kind !== 'camp')).n.kind = 'elite';
  // Roads: a node leads to the two nodes of the next row nearest to it (always a choice), and
  // every node of the next row can be reached from somewhere
  const at = (i: number, n: number) => (i + 0.5) / n;
  for (let r = 0; r < DIVE.rows - 1; r++) {
    const a = rows[r]!;
    const b = rows[r + 1]!;
    const byDistance = (x: number) =>
      b
        .map((_, j) => j)
        .sort((p, q) => Math.abs(at(p, b.length) - x) - Math.abs(at(q, b.length) - x) || p - q);
    a.forEach((node, i) => {
      node.next = byDistance(at(i, a.length)).slice(0, 2);
    });
    b.forEach((_, j) => {
      if (a.some((n) => n.next.includes(j))) return;
      // The node of this row nearest to it takes the road too
      let best = 0;
      for (let i = 1; i < a.length; i++)
        if (
          Math.abs(at(i, a.length) - at(j, b.length)) <
          Math.abs(at(best, a.length) - at(j, b.length))
        )
          best = i;
      a[best]!.next.push(j);
    });
    for (const n of a) n.next.sort((x, y) => x - y);
  }
  for (const n of rows[DIVE.rows - 1]!) n.next = [0];
  rows.push([{ kind: 'boss', next: [] }]);
  return rows;
}

/** Where the dive can go next: the first row at the start of a floor, else the nodes this one leads to */
export function nextChoices(map: DiveMap, pos: DivePos | null): DivePos[] {
  if (!pos) return map[0]!.map((_, col) => ({ row: 0, col }));
  return map[pos.row]![pos.col]!.next.map((col) => ({ row: pos.row + 1, col }));
}

export function nodeAt(map: DiveMap, pos: DivePos): DiveNode {
  return map[pos.row]![pos.col]!;
}

function floorMap(seed: number, floor: number): DiveMap {
  return rollFloorMap(new Rng((seed ^ Math.imul(floor, 0x9e3779b1)) >>> 0));
}

export function newDive(regionId: string, seed: number, maxHp: number): DiveState {
  return {
    regionId,
    seed,
    floor: 1,
    map: floorMap(seed, 1),
    pos: null,
    fighting: false,
    hp: maxHp,
    laws: [],
    wins: 0,
    bag: [],
    gold: 0,
    used: [],
    stats: emptyStats(),
    ticks: 0,
    fights: 0,
  };
}

/** Down to the next floor: a new map, from its start */
export function nextFloor(d: DiveState): void {
  d.floor++;
  d.map = floorMap(d.seed, d.floor);
  d.pos = null;
  d.fighting = false;
}

/** The seed of the next fight (different for every fight of the dive) */
export function encounterSeed(d: DiveState): number {
  return (d.seed + Math.imul(d.fights + 1, 0x85ebca6b)) >>> 0;
}

/** After a fight: HP, wins, the bag, gold, used consumables and the run's numbers add up */
export function recordEncounter(d: DiveState, r: RunResult, hp: number): void {
  d.hp = hp;
  d.fighting = false;
  d.fights++;
  if (r.reason === 'cleared') d.wins++;
  d.bag.push(...r.drops);
  d.gold += r.stats.gold ?? 0;
  d.used.push(...r.usedConsumables);
  const s = d.stats;
  s.fires += r.stats.fires;
  s.maxStep = Math.max(s.maxStep, r.stats.maxStep);
  s.maxDamage = Math.max(s.maxDamage, r.stats.maxDamage);
  s.totalDamage += r.stats.totalDamage;
  s.bossesDefeated += r.stats.bossesDefeated;
  s.sweeps += r.stats.sweeps;
  d.ticks += r.ticks;
}

/** Falling: a random share of the bag (rounded down) comes home */
export function keepHalf(rng: Rng, bag: readonly ItemInstance[]): ItemInstance[] {
  return rng.sample(bag, Math.floor(bag.length * DIVE.deathKeep));
}

/** The dive as one run for the result screen: everything on the way back, half when fallen */
export function diveResult(d: DiveState, reason: 'retreat' | 'dead', rng: Rng): RunResult {
  const dead = reason === 'dead';
  return {
    reason,
    usedConsumables: d.used.slice(),
    progress: 0,
    reachedLoop: d.floor,
    drops: dead ? keepHalf(rng, d.bag) : d.bag.slice(),
    stats: { ...d.stats, gold: dead ? Math.floor(d.gold * DIVE.deathKeep) : d.gold },
    ticks: d.ticks,
  };
}

/** Up to DIVE.lawChoices laws not held yet (none when every law is held) */
export function offerLaws(rng: Rng, held: readonly LawId[]): LawId[] {
  return rng.sample(
    LAWS.map((l) => l.id).filter((id) => !held.includes(id)),
    DIVE.lawChoices,
  );
}

/** 早撃ち shortens the hero's attack interval (the wait after a chain scales with it) */
export function lawHero(hero: HeroStats, laws: readonly LawId[]): HeroStats {
  return laws.includes('quickFire') ? { ...hero, atbTime: hero.atbTime * LAW.quickFireAtb } : hero;
}

/** The laws of one fight, worked out against the board */
export interface LawFx {
  laws: ReadonlySet<LawId>;
  /** 重ねの極意: stack multipliers (undefined: the usual ones) */
  posMult?: readonly number[];
  /** 一色: every attack stack shares one element */
  mono: boolean;
  /** 四隅: uids ringing in a corner cell */
  corners: ReadonlySet<string>;
  wins: number;
}

export function lawsOf(
  laws: readonly LawId[],
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  wins: number,
): LawFx {
  const set = new Set(laws);
  const tops = loadout.cells.filter((u): u is string => !!u && items.has(u));
  const attackGroups = new Set(
    tops
      .map((u) => items.get(u)!)
      .filter((it) => getItemDef(it.defId).kind === 'attack')
      .map((it) => stackGroup(it)),
  );
  const { width: w, height: h } = loadout;
  const cornerCells = [0, w - 1, (h - 1) * w, h * w - 1];
  return {
    laws: set,
    ...(set.has('stack') ? { posMult: LAW.stackPosMult } : {}),
    mono: attackGroups.size === 1,
    corners: new Set(cornerCells.flatMap((c) => stackAt(loadout, c))),
    wins,
  };
}

/** One strike's damage multiplier from the laws */
export function lawStrikeMult(
  fx: LawFx,
  hit: { uid: string; step: number; tech: boolean },
): number {
  const has = (id: LawId) => fx.laws.has(id);
  let m = 1;
  if (has('longChain') && hit.step >= LAW.longChainFrom) m *= LAW.longChainMult;
  if (has('technique') && hit.tech) m *= LAW.techniqueMult;
  if (has('mono') && fx.mono) m *= LAW.monoMult;
  if (has('corners') && fx.corners.has(hit.uid)) m *= LAW.cornerMult;
  if (has('winStreak')) m *= 1 + fx.wins * LAW.winStreakPerWin;
  return m;
}
