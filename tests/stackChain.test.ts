import { describe, expect, it } from 'vitest';
import { firedPieces, planChain } from '../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { NO_LUCK } from '../src/config/balance';
import { getItemDef } from '../src/data/items';
import type { Loadout } from '../src/core/types';
import { build, type Placed } from './helpers';

/** A board with stacks: `stacks` maps a cell's top uid to the uids under it (bottom first) */
function stacked(w: number, h: number, placed: Placed[], stacks: Record<string, string[]>) {
  const all = build(w, h, placed);
  const under = all.loadout.cells.map((u) => (u && stacks[u] ? stacks[u]! : []));
  // Items under a top are not on the board themselves
  const hidden = new Set(Object.values(stacks).flat());
  const loadout: Loadout = {
    ...all.loadout,
    cells: all.loadout.cells.map((u) => (u && hidden.has(u) ? null : u)),
    under,
  };
  return { loadout, items: all.items };
}

const off = (uid: string, defId: string, exits: Placed['exits'] = []): Placed => ({
  uid,
  defId,
  x: 0,
  y: 2,
  exits,
});

describe('重ねる盤面（試作）: 連鎖', () => {
  it('重ねは下から順に鳴り、1つごとに数える。中は0.1秒、位置で ×1 / ×1.5 / ×2。矢印は一番上だけ', () => {
    const { loadout, items } = stacked(
      3,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'top', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'next', defId: 'sword', x: 2, y: 0, exits: [] },
        // Would fire if the under items' arrows counted
        { uid: 'below', defId: 'sword', x: 1, y: 1, exits: [] },
        off('a', 'sword', ['down']),
        off('b', 'dagger', ['down']),
      ],
      { top: ['a', 'b'] },
    );
    const plan = planChain(loadout, items, 'o');
    const rows = plan.steps.slice(1).map((s) => [s.uid, s.step, s.t, s.ring, s.stackMult]);
    expect(rows).toEqual([
      ['a', 1, 0.2, 0, 1],
      ['b', 2, 0.3, 1, 1.5],
      ['top', 3, 0.4, 2, 2],
      ['next', 4, 0.6, 0, 1],
    ]);
  });

  it('必殺技は、道で続く3マスの一番上でそろえる（重ねの中でそろっても出ない）', () => {
    // One cell [sword, sword, greatsword]: the rings line up, the tops do not
    const one = stacked(
      2,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'g', defId: 'greatsword', x: 1, y: 0, exits: [] },
        off('s1', 'sword'),
        off('s2', 'sword'),
      ],
      { g: ['s1', 's2'] },
    );
    expect(planChain(one.loadout, one.items, 'o').steps.some((s) => s.tech)).toBe(false);
    // Tops sword → sword → greatsword along the route, axes in between
    const three = stacked(
      4,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 't1', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 't2', defId: 'sword', x: 2, y: 0, exits: ['right'] },
        { uid: 't3', defId: 'greatsword', x: 3, y: 0, exits: [] },
        off('x2', 'axe'),
        off('x3', 'axe'),
      ],
      { t2: ['x2'], t3: ['x3'] },
    );
    const steps = planChain(three.loadout, three.items, 'o').steps;
    expect(steps.filter((s) => s.tech).map((s) => [s.uid, s.tech])).toEqual([['t3', 'triple']]);
  });

  it('［剣］→［剣・大剣］は、鳴る順がそろっても必殺技にならない（一番上は2マスだけ）', () => {
    const { loadout, items } = stacked(
      3,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 's', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'g', defId: 'greatsword', x: 2, y: 0, exits: [] },
        off('s2', 'sword'),
      ],
      { g: ['s2'] },
    );
    expect(planChain(loadout, items, 'o').steps.some((s) => s.tech)).toBe(false);
  });

  it('戦闘で無防備になるのは3マス目から（重ねの中で3つ鳴っても1マス）', () => {
    const { loadout, items } = stacked(
      5,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 't1', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 't2', defId: 'sword', x: 2, y: 0, exits: ['right'] },
        { uid: 't3', defId: 'sword', x: 3, y: 0, exits: ['right'] },
        { uid: 't4', defId: 'sword', x: 4, y: 0, exits: [] },
        off('u1', 'sword'),
        off('u2', 'sword'),
      ],
      { t1: ['u1', 'u2'] },
    );
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      luck: NO_LUCK,
    });
    const seen: [number, boolean][] = [];
    const cells = new Set<number>();
    let on = false;
    let ended = false;
    while (!ended) {
      c.step();
      for (const e of c.drainEvents()) {
        if (e.type === 'chainStart') on = true;
        if (e.type === 'step' && e.step !== null) cells.add(e.cell);
        if (e.type === 'chainEnd') ended = true;
      }
      if (on && !ended) seen.push([cells.size, c.unguarded]);
    }
    expect(seen.filter(([n]) => n < 3).every(([, u]) => !u)).toBe(true);
    expect(seen.some(([n, u]) => n >= 3 && u)).toBe(true);
  });

  it('防御の重ねも位置の倍率がかかる', () => {
    const { loadout, items } = stacked(
      2,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'top', defId: 'wood_shield', x: 1, y: 0, exits: [] },
        off('low', 'wood_shield'),
      ],
      { top: ['low'] },
    );
    const d = getItemDef('wood_shield').defense!;
    expect(planChain(loadout, items, 'o').defenseGain).toBeCloseTo(d * 1 + d * 1.5);
  });

  it('待ちと無防備はマスで数える（重ねは何個でも1マス）。ふつうの盤面は今までどおり1個ずつ', () => {
    const { loadout, items } = stacked(
      3,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'top', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'next', defId: 'sword', x: 2, y: 0, exits: [] },
        off('a', 'sword'),
        off('b', 'sword'),
      ],
      { top: ['a', 'b'] },
    );
    const plan = planChain(loadout, items, 'o');
    const originIn = (m: typeof items) => (uid: string) =>
      getItemDef(m.get(uid)!.defId).kind === 'origin';
    expect(firedPieces(plan.steps, originIn(items))).toBe(2);
    const flat = build(4, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 3, y: 0, exits: [] },
    ]);
    const flatPlan = planChain(flat.loadout, flat.items, 'o');
    expect(firedPieces(flatPlan.steps, originIn(flat.items))).toBe(3);
  });

  it('待ちの数え方は、起点石でない装備が鳴ったマスを1つと数える（一番下が何でも）', () => {
    const step = (uid: string, cell: number, ring: number) => ({
      t: 0,
      uid,
      step: null,
      branch: 0,
      mult: 1,
      from: null,
      parentIndex: -1,
      cell,
      ring,
    });
    const isOrigin = (uid: string) => uid.startsWith('o');
    // A cell whose bottom is an origin stone still counts once for the sword above it
    expect(firedPieces([step('o', 0, 0), step('s', 0, 1)], isOrigin)).toBe(1);
    expect(firedPieces([step('o', 0, 0), step('a', 1, 0), step('b', 1, 1)], isOrigin)).toBe(1);
  });

  it('戦闘のダメージに位置の倍率がかかる（2つ目は 連鎖×1.2 と 位置×1.5）', () => {
    const { loadout, items } = stacked(
      2,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'top', defId: 'sword', x: 1, y: 0, exits: [] },
        off('a', 'sword'),
      ],
      { top: ['a'] },
    );
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      luck: NO_LUCK,
    });
    const evs: CombatEvent[] = [];
    while (!evs.some((e) => e.type === 'chainEnd')) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const hits = evs.filter((e) => e.type === 'hit' && !e.dot) as {
      step: number;
      damage: number;
    }[];
    const at = (n: number) => hits.find((h) => h.step === n)!.damage;
    expect(at(2) / at(1)).toBeCloseTo(1.2 * 1.5);
  });
});

describe('重ねる盤面（試作）: アーティファクトは1個で山3つぶん', () => {
  it('重ねる盤面では、ひとりで3回鳴る（×1 / ×1.5 / ×2）。ふつうの盤面では1回', () => {
    const placed: Placed[] = [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'art', defId: 'dragon_fang', x: 1, y: 0, exits: ['right'], rarity: 'legendary' },
      { uid: 'next', defId: 'sword', x: 2, y: 0, exits: [] },
    ];
    const { loadout, items } = stacked(3, 1, placed, {});
    const rows = planChain(loadout, items, 'o')
      .steps.slice(1)
      .map((s) => [s.uid, s.step, s.ring, s.stackMult]);
    expect(rows).toEqual([
      ['art', 1, 0, 1],
      ['art', 2, 1, 1.5],
      ['art', 3, 2, 2],
      ['next', 4, 0, 1],
    ]);
    const plain = build(3, 1, placed);
    expect(planChain(plain.loadout, plain.items, 'o').steps.map((s) => s.uid)).toEqual([
      'o',
      'art',
      'next',
    ]);
  });
});

describe('試作「盤面の種類」: 深い盤面の連鎖', () => {
  it('深い盤面では、4つの山が ×1・×1.25・×1.5・×2 で鳴り、アーティファクトはひとりで4回鳴る', () => {
    const placed: Placed[] = [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'top', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'art', defId: 'dragon_fang', x: 2, y: 0, exits: [], rarity: 'legendary' },
      off('a', 'sword'),
      off('b', 'sword'),
      off('c', 'sword'),
    ];
    const s = stacked(3, 3, placed, { top: ['a', 'b', 'c'] });
    const loadout = { ...s.loadout, board: 'deep' as const };
    const rows = planChain(loadout, s.items, 'o')
      .steps.slice(1)
      .map((x) => [x.uid, x.stackMult]);
    expect(rows).toEqual([
      ['a', 1],
      ['b', 1.25],
      ['c', 1.5],
      ['top', 2],
      ['art', 1],
      ['art', 1.25],
      ['art', 1.5],
      ['art', 2],
    ]);
  });
});
