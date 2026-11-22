import { describe, expect, it } from 'vitest';
import { firedPieces, planChain } from '../../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../../src/core/combat';
import { CHAIN, CHAIN_RULES, NO_LUCK, STACK } from '../../src/config/balance';
import { getItemDef } from '../../src/data/items';
import type { Loadout } from '../../src/core/types';
import { build, type Placed } from '../helpers';

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

const [POS0, POS1, POS2] = STACK.posMult;

/**
 * o → [a (sword), b (dagger), top (sword)] → next. The items under the top have arrows
 * pointing down to `below`, which would ring if the under items' arrows counted
 */
function mixedStack() {
  return stacked(
    3,
    3,
    [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'top', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'next', defId: 'sword', x: 2, y: 0, exits: [] },
      { uid: 'below', defId: 'sword', x: 1, y: 1, exits: [] },
      off('a', 'sword', ['down']),
      off('b', 'dagger', ['down']),
    ],
    { top: ['a', 'b'] },
  );
}

/** Every event until the first chain ends */
function firstChainEvents(loadout: Loadout, items: ReturnType<typeof stacked>['items']) {
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
  return evs;
}

/** Damage of the first hit of each step */
function damageByStep(evs: CombatEvent[]) {
  const hits = evs.filter((e) => e.type === 'hit' && !e.dot) as { step: number; damage: number }[];
  return (n: number) => hits.find((h) => h.step === n)!.damage;
}

describe('重ねる盤面: 連鎖', () => {
  it('重ねは下から順に鳴り、1つごとに段を数える', () => {
    const { loadout, items } = mixedStack();
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps.slice(1).map((s) => [s.uid, s.step])).toEqual([
      ['a', 1],
      ['b', 2],
      ['top', 3],
      ['next', 4],
    ]);
  });

  it('重ねの中は決まった短い間隔で鳴り、次のマスへは装備の伝わる時間で進む', () => {
    const { loadout, items } = mixedStack();
    const plan = planChain(loadout, items, 'o');
    const t = (uid: string) => plan.steps.find((s) => s.uid === uid)!.t;
    const relay = getItemDef('sword').relayDelay ?? CHAIN.relayDelay;
    expect(t('b') - t('a')).toBeCloseTo(STACK.ringRelay);
    expect(t('top') - t('b')).toBeCloseTo(STACK.ringRelay);
    expect(t('next') - t('top')).toBeCloseTo(relay);
    expect(STACK.ringRelay).toBeLessThan(relay);
  });

  it('重ねの位置で倍率がかかる（下から順に大きく、重ねていないマスは一番下と同じ）', () => {
    const { loadout, items } = mixedStack();
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps.slice(1).map((s) => [s.uid, s.ring, s.stackMult])).toEqual([
      ['a', 0, POS0],
      ['b', 1, POS1],
      ['top', 2, POS2],
      ['next', 0, POS0],
    ]);
    expect(POS0).toBeLessThan(POS1);
    expect(POS1).toBeLessThan(POS2);
  });

  it('矢印は一番上だけ（下の装備の矢印の先は鳴らない）', () => {
    const { loadout, items } = mixedStack();
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps.map((s) => s.uid)).not.toContain('below');
  });

  it('重ねの中で鳴る順がそろっても、必殺技は出ない', () => {
    // One cell [sword, sword, greatsword]: the rings line up, the tops do not
    const { loadout, items } = stacked(
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
    expect(planChain(loadout, items, 'o').steps.some((s) => s.tech)).toBe(false);
  });

  it('必殺技は、道で続く3マスの一番上でそろえる', () => {
    // Tops sword → sword → greatsword along the route, axes in between
    const { loadout, items } = stacked(
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
    const steps = planChain(loadout, items, 'o').steps;
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

  it('戦闘で無防備になるのは、守りの段数ぶんのマスが鳴ってから（重ねの中でいくつ鳴っても1マス）', () => {
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
    const guard = CHAIN_RULES.guardSteps;
    expect(seen.filter(([n]) => n < guard).every(([, u]) => !u)).toBe(true);
    expect(seen.some(([n, u]) => n >= guard && u)).toBe(true);
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
    expect(planChain(loadout, items, 'o').defenseGain).toBeCloseTo(d * POS0 + d * POS1);
  });

  it('重ねる盤面では、待ちと無防備はマスで数える（重ねは何個でも1マス）', () => {
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
    const isOrigin = (uid: string) => getItemDef(items.get(uid)!.defId).kind === 'origin';
    expect(firedPieces(planChain(loadout, items, 'o').steps, isOrigin)).toBe(2);
  });

  it('ふつうの盤面では、待ちと無防備は鳴った装備を1個ずつ数える', () => {
    const { loadout, items } = build(4, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 3, y: 0, exits: [] },
    ]);
    const isOrigin = (uid: string) => getItemDef(items.get(uid)!.defId).kind === 'origin';
    expect(firedPieces(planChain(loadout, items, 'o').steps, isOrigin)).toBe(3);
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

  it('戦闘のダメージに位置の倍率がかかる（連鎖の倍率に掛け合わさる）', () => {
    const origin: Placed = { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] };
    // The same two swords, stacked in one cell or side by side in two cells
    const inStack = stacked(
      2,
      3,
      [origin, { uid: 'top', defId: 'sword', x: 1, y: 0, exits: [] }, off('a', 'sword')],
      { top: ['a'] },
    );
    const sideBySide = stacked(
      3,
      3,
      [
        origin,
        { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'b', defId: 'sword', x: 2, y: 0, exits: [] },
      ],
      {},
    );
    const st = damageByStep(firstChainEvents(inStack.loadout, inStack.items));
    const flat = damageByStep(firstChainEvents(sideBySide.loadout, sideBySide.items));
    // Both rise by the chain multiplier; the stacked one also by its position
    expect(st(2) / st(1) / (flat(2) / flat(1))).toBeCloseTo(POS1 / POS0);
    expect(flat(2)).toBeGreaterThan(flat(1));
  });
});

describe('重ねる盤面: アーティファクトは1個で重ね1マスぶん', () => {
  const placed: Placed[] = [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'art', defId: 'dragon_fang', x: 1, y: 0, exits: ['right'], rarity: 'legendary' },
    { uid: 'next', defId: 'sword', x: 2, y: 0, exits: [] },
  ];

  it('重ねる盤面では、ひとりで重ねの数だけ鳴り、位置の倍率も重ねと同じ', () => {
    const { loadout, items } = stacked(3, 1, placed, {});
    const rows = planChain(loadout, items, 'o')
      .steps.slice(1)
      .map((s) => [s.uid, s.step, s.ring, s.stackMult]);
    expect(rows).toEqual([
      ['art', 1, 0, POS0],
      ['art', 2, 1, POS1],
      ['art', 3, 2, POS2],
      ['next', 4, 0, POS0],
    ]);
  });

  it('ふつうの盤面では1回だけ鳴る', () => {
    const plain = build(3, 1, placed);
    expect(planChain(plain.loadout, plain.items, 'o').steps.map((s) => s.uid)).toEqual([
      'o',
      'art',
      'next',
    ]);
  });
});

describe('盤面の種類: 深い盤面の連鎖', () => {
  const placed: Placed[] = [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'top', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'art', defId: 'dragon_fang', x: 2, y: 0, exits: [], rarity: 'legendary' },
    off('a', 'sword'),
    off('b', 'sword'),
    off('c', 'sword'),
  ];
  const deepPlan = () => {
    const s = stacked(3, 3, placed, { top: ['a', 'b', 'c'] });
    return planChain({ ...s.loadout, board: 'deep' }, s.items, 'o');
  };

  it('深い盤面では、4つの重ねが深い盤面の位置の倍率で鳴る', () => {
    const rows = deepPlan()
      .steps.filter((x) => x.cell === 1)
      .map((x) => [x.uid, x.stackMult]);
    expect(rows).toEqual([
      ['a', STACK.deepPosMult[0]],
      ['b', STACK.deepPosMult[1]],
      ['c', STACK.deepPosMult[2]],
      ['top', STACK.deepPosMult[3]],
    ]);
  });

  it('深い盤面では、アーティファクトはひとりで4回、深い盤面の位置の倍率で鳴る', () => {
    const rows = deepPlan()
      .steps.filter((x) => x.uid === 'art')
      .map((x) => x.stackMult);
    expect(rows).toEqual(STACK.deepPosMult);
  });
});
