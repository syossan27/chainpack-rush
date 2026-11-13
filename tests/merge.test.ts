import { describe, expect, it } from 'vitest';
import { LUCK, MERGE, SIM } from '../src/config/balance';
import {
  linkedGroups,
  mergeArrivals,
  mergeBonusOf,
  planUnit,
  simulateChain,
} from '../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { estimateRoute } from '../src/core/estimate';
import { build, type Placed } from './helpers';

const NO_LUCK = { critChance: 0, damageVariance: 0 };

/**
 * Y shape on a 5×3 grid: two lines of two swords meet at J, then two more swords.
 *   o1 a b
 *         J e f
 *   o2 c d
 */
function yShape(secondLine: 'long' | 'none' = 'long') {
  const placed: Placed[] = [
    { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['down'] },
    { uid: 'J', defId: 'sword', x: 2, y: 1, exits: ['right'] },
    { uid: 'e', defId: 'sword', x: 3, y: 1, exits: ['right'] },
    { uid: 'f', defId: 'sword', x: 4, y: 1, exits: [] },
  ];
  if (secondLine === 'long')
    placed.push(
      { uid: 'o2', defId: 'origin_stone', x: 0, y: 2, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 1, y: 2, exits: ['right'] },
      { uid: 'd', defId: 'sword', x: 2, y: 2, exits: ['up'] },
    );
  // The cheat: the second origin stone right next to the merge cell
  else placed.push({ uid: 'o2', defId: 'origin_stone', x: 2, y: 2, exits: ['up'] });
  return build(5, 3, placed);
}

/**
 * The case from play: J is the first route's 3rd step and the second route's 4th step.
 *   o1 a b J e
 *   o2 c d g
 */
function tJoin() {
  return build(5, 2, [
    { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
    { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
    { uid: 'J', defId: 'sword', x: 3, y: 0, exits: ['right'] },
    { uid: 'e', defId: 'sword', x: 4, y: 0, exits: [] },
    { uid: 'o2', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
    { uid: 'c', defId: 'sword', x: 1, y: 1, exits: ['right'] },
    { uid: 'd', defId: 'sword', x: 2, y: 1, exits: ['right'] },
    { uid: 'g', defId: 'sword', x: 3, y: 1, exits: ['up'] },
  ]);
}

function stepOf(plan: ReturnType<typeof planUnit>, uid: string) {
  return plan.steps.find((s) => s.uid === uid)!;
}

describe('合流', () => {
  it('線がつながった起点は1つの発火にまとまる。つながらなければ別々', () => {
    const { loadout, items } = yShape();
    expect(linkedGroups(loadout, items, ['o1', 'o2'])).toEqual([['o1', 'o2']]);
    const preview = simulateChain(loadout, items);
    expect(preview.plans).toHaveLength(1);
    expect(preview.plans[0]!.originUids).toEqual(['o1', 'o2']);

    const apart = build(3, 2, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: [] },
      { uid: 'o2', defId: 'origin_stone', x: 0, y: 1, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 1, y: 1, exits: [] },
    ]);
    expect(linkedGroups(apart.loadout, apart.items, ['o1', 'o2'])).toEqual([['o1'], ['o2']]);
  });

  it('合流点には、それぞれのルートで何段目かを出す（ルートの順）。合流点は大きい方の段', () => {
    const { loadout, items } = tJoin();
    const plan = planUnit(loadout, items, ['o1', 'o2']);
    const j = stepOf(plan, 'J');
    expect(j.mergeParents).toHaveLength(2);
    // Route ① reaches J as its 3rd step, route ② as its 4th: 3+4, not an exact sync
    expect(j.mergeArrived).toEqual([3, 4]);
    // The chain goes on from the larger: J is the 4th step, then 5
    expect(j.step).toBe(4);
    expect(stepOf(plan, 'e').step).toBe(5);
    expect(j.mergeBonus).toBeCloseTo(mergeBonusOf([3, 4]));
    expect(stepOf(plan, 'e').mergeBonus).toBeCloseTo(mergeBonusOf([3, 4]));
  });

  it('合流点は両方の線が届いてから発動し、その先の本流にボーナスがかかる', () => {
    const { loadout, items } = yShape();
    const plan = planUnit(loadout, items, ['o1', 'o2']);
    const j = stepOf(plan, 'J');
    expect(j.mergeParents).toHaveLength(2);
    // Two 2-step routes into a new cell: it is the 3rd step of both, an exact sync
    expect(j.mergeArrived).toEqual([3, 3]);
    expect(j.step).toBe(3);
    expect(stepOf(plan, 'e').step).toBe(4);
    const bonus = mergeBonusOf([3, 3]);
    expect(bonus).toBeGreaterThan(0);
    expect(j.mergeBonus).toBeCloseTo(bonus);
    expect(stepOf(plan, 'f').mergeBonus).toBeCloseTo(bonus);
    // Before the merge there is no bonus
    expect(stepOf(plan, 'b').mergeBonus).toBeUndefined();
    // Every cell fires once, in time order
    expect(plan.steps).toHaveLength(9);
    for (let i = 1; i < plan.steps.length; i++)
      expect(plan.steps[i]!.t).toBeGreaterThanOrEqual(plan.steps[i - 1]!.t);
  });

  it('シンクロの段数: 合流点がそれぞれのルートで何段目か', () => {
    expect(mergeArrivals([2, 3], true)).toEqual([3, 4]);
    expect(mergeArrivals([2, 2], true)).toEqual([3, 3]);
    // A route with nothing before the cell (its origin stone right next to it) shows 0: no bonus
    expect(mergeArrivals([2, 0], true)).toEqual([3, 0]);
    expect(mergeArrivals([0, 0], true)).toEqual([0, 0]);
    expect(mergeBonusOf(mergeArrivals([0, 0], true))).toBe(0);
    // A cell without a step of its own (a shield): the routes bring their steps as they are
    expect(mergeArrivals([2, 2], false)).toEqual([2, 2]);
  });

  it('ボーナスは「合計 ×（短い線 ÷ 長い線）」。起点を合流点の隣に置くだけでは出ない', () => {
    expect(mergeBonusOf([6, 6])).toBeCloseTo(Math.min(MERGE.cap, 12 * MERGE.perPoint));
    expect(mergeBonusOf([6, 2])).toBeCloseTo(8 * (2 / 6) * MERGE.perPoint);
    expect(mergeBonusOf([8, 0])).toBe(0);
    expect(mergeBonusOf([30, 30])).toBe(MERGE.cap);

    const { loadout, items } = yShape('none');
    const plan = planUnit(loadout, items, ['o1', 'o2']);
    const j = stepOf(plan, 'J');
    expect(j.step).toBe(3);
    expect(j.mergeArrived).toEqual([3, 0]);
    expect(j.mergeBonus).toBeUndefined();
  });

  it('戦闘: 一緒に撃ち、合流点の段数とボーナスがダメージに乗る', () => {
    const { loadout, items } = yShape();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
      luck: NO_LUCK,
    });
    c.fireNext();
    const evs: CombatEvent[] = [];
    while (c.chain) {
      c.step();
      evs.push(...c.drainEvents());
    }
    expect(c.stats.fires).toBe(1);
    const merge = evs.find((e) => e.type === 'merge');
    const bonus = mergeBonusOf([3, 3]);
    expect(merge?.type === 'merge' && merge.arrived).toEqual([3, 3]);
    expect(merge?.type === 'merge' && merge.bonus).toBeCloseTo(bonus);
    const hits = evs.filter((e) => e.type === 'hit');
    // J: sword 10 × 1.2^2 (3rd step) × (1 + bonus)
    const jHit = hits.find((e) => e.type === 'hit' && e.itemUid === 'J');
    expect(jHit?.type === 'hit' && jHit.damage).toBeCloseTo(10 * 1.2 ** 2 * (1 + bonus / 100), 1);
    expect(jHit?.type === 'hit' && jHit.step).toBe(3);
  });

  it('戦闘: 待ちは起点を除いた装備の数で決まり、守りが残る段数も起点の数に左右されない', () => {
    const run = (secondOrigin: boolean) => {
      const { loadout, items } = yShape();
      if (!secondOrigin) loadout.originOrder = ['o1'];
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: BASE_HERO_STATS,
        mode: 'dummy',
        luck: NO_LUCK,
      });
      c.fireNext();
      const origins = c.chain!.plan.originUids.length;
      let guardedItems = 0;
      while (c.chain) {
        if (!c.unguarded) guardedItems = Math.max(0, c.chain.next - origins);
        c.step();
      }
      return { atb: c.atb, guardedItems, items: origins === 2 ? 7 : 5 };
    };
    for (const second of [false, true]) {
      const r = run(second);
      const factor = Math.min(2, Math.max(0.25, r.items / 6));
      // The gauge starts filling in the same step the chain ends (+1 tick)
      expect(r.atb).toBeCloseTo(BASE_HERO_STATS.atbTime * (1 - factor) + SIM.fixedStep);
    }
    expect(run(true).guardedItems).toBe(run(false).guardedItems);
  });

  it('ほかの起点の線が届く起点は「通すだけ」。段数はそのまま先へ続き、その起点石の種類もそこから効く', () => {
    const { loadout, items } = build(6, 1, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'o2', defId: 'origin_heavy', x: 3, y: 0, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 4, y: 0, exits: ['right'] },
      { uid: 'd', defId: 'sword', x: 5, y: 0, exits: [] },
    ]);
    const preview = simulateChain(loadout, items);
    expect(preview.plans).toHaveLength(1);
    const plan = preview.plans[0]!;
    expect(plan.originUids).toEqual(['o1', 'o2']);
    // Only o1 starts a line; o2 is reached through b
    expect(plan.steps.filter((s) => s.parentIndex < 0).map((s) => s.uid)).toEqual(['o1']);
    expect(stepOf(plan, 'o2').from).toBe('b');
    expect(stepOf(plan, 'c').step).toBe(3);
    expect(stepOf(plan, 'd').step).toBe(4);
    // The heavy stone counts from where the line passes it
    expect(stepOf(plan, 'b').line).toBeUndefined();
    expect(stepOf(plan, 'c').line?.damage).toBeCloseTo(1.2);
    expect(stepOf(plan, 'd').origins).toEqual(['o1', 'o2']);

    // Combat: one firing, the wait counts the 4 swords (not the stones)
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      mode: 'dummy',
      luck: NO_LUCK,
    });
    c.fireNext();
    expect(c.unguarded).toBe(false);
    while (c.chain) c.step();
    expect(c.stats.fires).toBe(1);
    expect(c.stats.maxStep).toBe(4);
    const factor = Math.min(2, Math.max(0.25, 4 / 6));
    expect(c.atb).toBeCloseTo(BASE_HERO_STATS.atbTime * (1 - factor) + SIM.fixedStep);
  });

  it('配置画面の見積もりにも合流ボーナスが入る', () => {
    const { loadout, items } = yShape();
    const plan = planUnit(loadout, items, ['o1', 'o2']);
    const crit = 1 + LUCK.critChance * (LUCK.critMult - 1);
    const b = 1 + mergeBonusOf([3, 3]) / 100;
    const expected = 10 * crit * (1 + 1 + 1.2 + 1.2 + (1.2 ** 2 + 1.2 ** 3 + 1.2 ** 4) * b);
    expect(estimateRoute(plan, items, 1).total).toBeCloseTo(expected);
  });
});
