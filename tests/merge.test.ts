import { describe, expect, it } from 'vitest';
import { LUCK, MERGE, SIM } from '../src/config/balance';
import {
  mergeArrivals,
  mergeBonusOf,
  planChain,
  simulateChain,
  syncPoints,
} from '../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../src/core/combat';
import { estimateRoute } from '../src/core/estimate';
import type { ChainPlan } from '../src/core/types';
import { build, type Placed } from './helpers';

const NO_LUCK = { critChance: 0, damageVariance: 0 };

/**
 * Y shape on a 5×3 grid: two routes of two swords meet at J, then two more swords.
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

function stepOf(plan: ChainPlan, uid: string) {
  return plan.steps.find((s) => s.uid === uid)!;
}

function dummy(l: ReturnType<typeof yShape>) {
  return new Combat({
    seed: 1,
    regionId: 'grassland',
    loadout: l.loadout,
    items: l.items,
    hero: BASE_HERO_STATS,
    mode: 'dummy',
    luck: NO_LUCK,
  });
}

describe('シンクロ（合流）', () => {
  it('起点は、シンクロしていても1つずつ発火する', () => {
    const { loadout, items } = yShape();
    const preview = simulateChain(loadout, items);
    expect(preview.plans.map((p) => p.originUids)).toEqual([['o1'], ['o2']]);
    // Each firing runs its own route and the shared part, not the other route
    expect(preview.plans[0]!.steps.map((s) => s.uid)).toEqual(['o1', 'a', 'b', 'J', 'e', 'f']);
    expect(preview.plans[1]!.steps.map((s) => s.uid)).toEqual(['o2', 'c', 'd', 'J', 'e', 'f']);

    const c = dummy(yShape());
    const starts: string[] = [];
    for (let i = 0; i < 2; i++) {
      c.fireNext();
      for (const e of c.drainEvents()) if (e.type === 'chainStart') starts.push(e.originUid);
      while (c.chain) c.step();
    }
    expect(starts).toEqual(['o1', 'o2']);
    expect(c.stats.fires).toBe(2);
  });

  it('合流マスには、それぞれのルートで何段目かを出す。その先は1も2も長い方の段数', () => {
    const { loadout, items } = tJoin();
    const [p1, p2] = simulateChain(loadout, items).plans;
    for (const p of [p1!, p2!]) {
      const j = stepOf(p, 'J');
      // Route ① reaches J as its 3rd step, route ② as its 4th: 3+4, not an exact sync
      expect(j.mergeArrived).toEqual([3, 4]);
      // Both firings go on from the longer route: J is the 4th step, then 5
      expect(j.step).toBe(4);
      expect(stepOf(p, 'e').step).toBe(5);
      expect(j.mergeBonus).toBeCloseTo(mergeBonusOf([3, 4]));
      expect(stepOf(p, 'e').mergeBonus).toBeCloseTo(mergeBonusOf([3, 4]));
    }
    // Before the merge each route counts its own steps, without the bonus
    expect(stepOf(p1!, 'b').step).toBe(2);
    expect(stepOf(p2!, 'g').step).toBe(3);
    expect(stepOf(p2!, 'g').mergeBonus).toBeUndefined();
  });

  it('同じ段目で届けば、ぴったりシンクロ。ボーナスは合流マスから先にかかる', () => {
    const { loadout, items } = yShape();
    const sync = syncPoints(loadout, items);
    expect([...sync.keys()]).toHaveLength(1);
    for (const p of simulateChain(loadout, items).plans) {
      const j = stepOf(p, 'J');
      expect(j.mergeArrived).toEqual([3, 3]);
      expect(j.step).toBe(3);
      expect(stepOf(p, 'e').step).toBe(4);
      const bonus = mergeBonusOf([3, 3]);
      expect(bonus).toBeGreaterThan(0);
      expect(j.mergeBonus).toBeCloseTo(bonus);
      expect(stepOf(p, 'f').mergeBonus).toBeCloseTo(bonus);
    }
    // Before the merge there is no bonus
    expect(stepOf(planChain(loadout, items, 'o1'), 'b').mergeBonus).toBeUndefined();
  });

  it('シンクロの段数: 合流マスがそれぞれのルートで何段目か', () => {
    expect(mergeArrivals([2, 3], true)).toEqual([3, 4]);
    expect(mergeArrivals([2, 2], true)).toEqual([3, 3]);
    // A route with nothing before the cell (its origin stone right next to it) shows 0: no bonus
    expect(mergeArrivals([2, 0], true)).toEqual([3, 0]);
    expect(mergeArrivals([0, 0], true)).toEqual([0, 0]);
    expect(mergeBonusOf(mergeArrivals([0, 0], true))).toBe(0);
    // A cell without a step of its own (a shield): the routes bring their steps as they are
    expect(mergeArrivals([2, 2], false)).toEqual([2, 2]);
  });

  it('シンクロしたあとの本流に別のルートがつながっても、本流は1本として数える', () => {
    // ① o1 a J t K u / ② o2 b↑J (J: 2+2) / ③ o3 c↑K. K is met by the trunk and ③: 4+2, not 4+4+2
    const { loadout, items } = build(7, 3, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'J', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 't', defId: 'sword', x: 3, y: 0, exits: ['right'] },
      { uid: 'K', defId: 'sword', x: 4, y: 0, exits: ['right'] },
      { uid: 'u', defId: 'sword', x: 5, y: 0, exits: [] },
      { uid: 'o2', defId: 'origin_stone', x: 1, y: 1, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 1, exits: ['up'] },
      { uid: 'o3', defId: 'origin_stone', x: 4, y: 2, exits: ['up'] },
      { uid: 'c', defId: 'sword', x: 4, y: 1, exits: ['up'] },
    ]);
    const sync = syncPoints(loadout, items);
    expect(sync.get(2)!.arrived).toEqual([2, 2]);
    const k = sync.get(4)!;
    expect(k.arrived).toEqual([4, 2]);
    expect(k.from.sort((x, y) => x - y)).toEqual([3, 11]);
    expect(k.bonus).toBeCloseTo(mergeBonusOf([4, 2]));
    for (const p of simulateChain(loadout, items).plans) expect(stepOf(p, 'K').step).toBe(4);
  });

  it('ボーナスは「合計 ×（短い線 ÷ 長い線）− 引く分」。起点を合流マスの隣に置くだけでは出ない', () => {
    const pts = (p: number) => Math.min(MERGE.cap, Math.max(0, p - MERGE.offset) * MERGE.perPoint);
    expect(mergeBonusOf([4, 4])).toBeCloseTo(pts(8));
    expect(mergeBonusOf([3, 4])).toBeCloseTo(pts(7 * (3 / 4)));
    expect(mergeBonusOf([2, 2])).toBeCloseTo(pts(4));
    // Longer exact syncs pay more than a tiny one
    expect(mergeBonusOf([4, 4])).toBeGreaterThan(mergeBonusOf([2, 2]) * 3);
    // A tiny route stuck onto a long one gets nothing
    expect(mergeBonusOf([6, 2])).toBe(0);
    expect(mergeBonusOf([8, 0])).toBe(0);
    expect(mergeBonusOf([30, 30])).toBe(MERGE.cap);

    const { loadout, items } = yShape('none');
    for (const p of simulateChain(loadout, items).plans) {
      const j = stepOf(p, 'J');
      expect(j.mergeArrived).toEqual([3, 0]);
      expect(j.step).toBe(3);
      expect(j.mergeBonus).toBeUndefined();
    }
  });

  it('戦闘: 合流マスの段数とボーナスがダメージに乗る（どちらの起点の発火でも）', () => {
    const c = dummy(yShape());
    const bonus = mergeBonusOf([3, 3]);
    for (let i = 0; i < 2; i++) {
      c.fireNext();
      const evs: CombatEvent[] = [];
      while (c.chain) {
        c.step();
        evs.push(...c.drainEvents());
      }
      const merge = evs.find((e) => e.type === 'merge');
      expect(merge?.type === 'merge' && merge.arrived).toEqual([3, 3]);
      expect(merge?.type === 'merge' && merge.bonus).toBeCloseTo(bonus);
      const jHit = evs.find((e) => e.type === 'hit' && e.itemUid === 'J');
      // J: sword 10 × 1.2^2 (3rd step) × (1 + bonus)
      expect(jHit?.type === 'hit' && jHit.damage).toBeCloseTo(10 * 1.2 ** 2 * (1 + bonus / 100), 1);
      expect(jHit?.type === 'hit' && jHit.step).toBe(3);
    }
    expect(c.stats.fires).toBe(2);
  });

  it('戦闘: 合流の先は、短いルートの発火でも長い方の段数で撃つ', () => {
    const c = dummy(tJoin());
    const steps = new Map<string, number[]>();
    for (let i = 0; i < 2; i++) {
      c.fireNext();
      while (c.chain) {
        c.step();
        for (const e of c.drainEvents())
          if (e.type === 'hit') steps.set(e.itemUid, [...(steps.get(e.itemUid) ?? []), e.step]);
      }
    }
    expect(steps.get('J')).toEqual([4, 4]);
    expect(steps.get('e')).toEqual([5, 5]);
  });

  it('戦闘: 合流マスより前で敵を倒して段数が1に戻ったら、合流マスで長い方の段数に戻さない', () => {
    // ① o1 a b c d J e (J is step 5) / ② o2 f g↑J (J is step 3) → J goes on from 5 when on plan.
    // The slime (30HP) falls at c (10+12+14.4), so d restarts at 1 on the next enemy.
    const { loadout, items } = build(7, 2, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 3, y: 0, exits: ['right'] },
      { uid: 'd', defId: 'sword', x: 4, y: 0, exits: ['right'] },
      { uid: 'J', defId: 'sword', x: 5, y: 0, exits: ['right'] },
      { uid: 'e', defId: 'sword', x: 6, y: 0, exits: [] },
      { uid: 'o2', defId: 'origin_stone', x: 3, y: 1, exits: ['right'] },
      { uid: 'f', defId: 'sword', x: 4, y: 1, exits: ['right'] },
      { uid: 'g', defId: 'sword', x: 5, y: 1, exits: ['up'] },
    ]);
    const plan = simulateChain(loadout, items).plans[0]!;
    expect(stepOf(plan, 'J').step).toBe(5);
    expect(stepOf(plan, 'J').mergeArrived).toEqual([5, 3]);
    const c = new Combat({ seed: 1, regionId: 'grassland', loadout, items, hero: BASE_HERO_STATS });
    const evs: CombatEvent[] = [];
    while (!evs.some((e) => e.type === 'chainEnd')) {
      c.step();
      evs.push(...c.drainEvents());
    }
    const steps = evs.flatMap((e) => (e.type === 'step' && e.step !== null ? [e.step] : []));
    expect(steps).toEqual([1, 2, 3, 1, 2, 3]);
  });

  it('戦闘: 待ちは、その発火で撃った装備（起点を除く）の数で決まる', () => {
    for (const second of [false, true]) {
      const { loadout, items } = yShape();
      if (!second) loadout.originOrder = ['o1'];
      const c = dummy({ loadout, items });
      c.fireNext();
      while (c.chain) c.step();
      // ①'s firing: a, b, J, e, f
      const factor = Math.min(2, Math.max(0.25, 5 / 6));
      // The gauge starts filling in the same step the chain ends (+1 tick)
      expect(c.atb).toBeCloseTo(BASE_HERO_STATS.atbTime * (1 - factor) + SIM.fixedStep);
    }
  });

  it('ほかの起点の線が届く起点は「通すだけ」。その起点石の種類もそこから効き、その起点も自分の番に撃つ', () => {
    const { loadout, items } = build(6, 1, [
      { uid: 'o1', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
      { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['right'] },
      { uid: 'o2', defId: 'origin_heavy', x: 3, y: 0, exits: ['right'] },
      { uid: 'c', defId: 'sword', x: 4, y: 0, exits: ['right'] },
      { uid: 'd', defId: 'sword', x: 5, y: 0, exits: [] },
    ]);
    const [p1, p2] = simulateChain(loadout, items).plans;
    expect(p1!.originUids).toEqual(['o1']);
    expect(stepOf(p1!, 'o2').from).toBe('b');
    expect(stepOf(p1!, 'c').step).toBe(3);
    expect(stepOf(p1!, 'd').step).toBe(4);
    // The heavy stone counts from where the line passes it
    expect(stepOf(p1!, 'b').line).toBeUndefined();
    expect(stepOf(p1!, 'c').line?.damage).toBeCloseTo(1.2);
    expect(stepOf(p1!, 'd').origins).toEqual(['o1', 'o2']);
    // An origin stone is not a sync point: ② starts its own route from 0
    expect(syncPoints(loadout, items).size).toBe(0);
    expect(p2!.originUids).toEqual(['o2']);
    expect(stepOf(p2!, 'c').step).toBe(1);
    expect(stepOf(p2!, 'd').step).toBe(2);

    // Combat: ①'s firing waits for its 4 swords (not the stones)
    const c = dummy({ loadout, items });
    c.fireNext();
    while (c.chain) c.step();
    expect(c.stats.maxStep).toBe(4);
    const factor = Math.min(2, Math.max(0.25, 4 / 6));
    expect(c.atb).toBeCloseTo(BASE_HERO_STATS.atbTime * (1 - factor) + SIM.fixedStep);
  });

  it('配置画面の見積もりにも合流ボーナスが入る', () => {
    const { loadout, items } = yShape();
    const plan = planChain(loadout, items, 'o1');
    const crit = 1 + LUCK.critChance * (LUCK.critMult - 1);
    const b = 1 + mergeBonusOf([3, 3]) / 100;
    const expected = 10 * crit * (1 + 1.2 + (1.2 ** 2 + 1.2 ** 3 + 1.2 ** 4) * b);
    expect(estimateRoute(plan, items, 1).total).toBeCloseTo(expected);
  });
});
