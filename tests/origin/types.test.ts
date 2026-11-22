import { describe, expect, it } from 'vitest';
import { CHAIN, LOOT } from '../../src/config/balance';
import { planChain } from '../../src/core/chain';
import type { ChainPlan } from '../../src/core/types';
import { pickDef } from '../../src/core/loot';
import { Rng } from '../../src/core/rng';
import { ITEM_DEFS, getItemDef } from '../../src/data/items';
import { build, type Placed } from '../helpers';

/**
 * Y shape on a 5×3 grid (same as the merge tests), with the stones and items chosen per test:
 *   o1 a b
 *         J e f
 *   o2 c d
 */
function yShape(o1: string, o2: string, item: string, trunk = item) {
  const placed: Placed[] = [
    { uid: 'o1', defId: o1, x: 0, y: 0, exits: ['right'] },
    { uid: 'a', defId: item, x: 1, y: 0, exits: ['right'] },
    { uid: 'b', defId: item, x: 2, y: 0, exits: ['down'] },
    { uid: 'J', defId: trunk, x: 2, y: 1, exits: ['right'] },
    { uid: 'e', defId: trunk, x: 3, y: 1, exits: ['right'] },
    { uid: 'f', defId: trunk, x: 4, y: 1, exits: [] },
    { uid: 'o2', defId: o2, x: 0, y: 2, exits: ['right'] },
    { uid: 'c', defId: item, x: 1, y: 2, exits: ['right'] },
    { uid: 'd', defId: item, x: 2, y: 2, exits: ['up'] },
  ];
  return build(5, 3, placed);
}

const stepOf = (plan: ChainPlan, uid: string) => plan.steps.find((s) => s.uid === uid)!;

describe('起点石の種類', () => {
  const SWIFT = getItemDef('origin_swift').line!;
  const HEAVY = getItemDef('origin_heavy').line!;
  const SW = 1 + (SWIFT.damage ?? 0) / 100;
  const H = 1 + (HEAVY.damage ?? 0) / 100;
  const dmg = (plan: ChainPlan, uid: string) => stepOf(plan, uid).line?.damage ?? 1;

  it('効くのは、その発火の起点の線だけ（合流の先も、発火した起点の分だけ）', () => {
    const { loadout, items } = yShape('origin_swift', 'origin_heavy', 'torch');
    const p1 = planChain(loadout, items, 'o1');
    const p2 = planChain(loadout, items, 'o2');
    expect(dmg(p1, 'a')).toBeCloseTo(SW);
    expect(dmg(p2, 'c')).toBeCloseTo(H);
    // Origins fire one at a time, so the shared part takes the firing origin's stone only
    expect(dmg(p1, 'J')).toBeCloseTo(SW);
    expect(dmg(p1, 'f')).toBeCloseTo(SW);
    expect(dmg(p2, 'J')).toBeCloseTo(H);
    expect(stepOf(p1, 'J').origins).toEqual(['o1']);
  });

  it('同じ種類の起点石どうしが合流しても、効果は1回分', () => {
    const { loadout, items } = yShape('origin_heavy', 'origin_heavy', 'torch');
    for (const o of ['o1', 'o2']) expect(dmg(planChain(loadout, items, o), 'J')).toBeCloseTo(H);
  });

  const fast = CHAIN.relayDelay + SWIFT.relay!;
  const slow = CHAIN.relayDelay + HEAVY.relay!;

  it('速の起点石は、その線が伝わるのが速い', () => {
    expect(fast).toBeLessThan(CHAIN.relayDelay);
    const swift = yShape('origin_swift', 'origin_stone', 'sword');
    const p1 = planChain(swift.loadout, swift.items, 'o1');
    expect(stepOf(p1, 'a').t).toBeCloseTo(fast);
    expect(stepOf(p1, 'b').t).toBeCloseTo(fast * 2);
  });

  it('重い起点石は、その線が伝わるのが遅い', () => {
    expect(slow).toBeGreaterThan(CHAIN.relayDelay);
    const heavy = yShape('origin_heavy', 'origin_stone', 'sword');
    expect(stepOf(planChain(heavy.loadout, heavy.items, 'o1'), 'a').t).toBeCloseTo(slow);
  });

  it('合流の先も、その発火の起点石の速さで伝わる', () => {
    // Swift and heavy routes meet at J: each firing keeps its own stone's speed after it
    const both = yShape('origin_swift', 'origin_heavy', 'sword');
    const s1 = planChain(both.loadout, both.items, 'o1');
    const s2 = planChain(both.loadout, both.items, 'o2');
    expect(stepOf(s1, 'e').t - stepOf(s1, 'J').t).toBeCloseTo(fast);
    expect(stepOf(s2, 'e').t - stepOf(s2, 'J').t).toBeCloseTo(slow);
    expect(dmg(s1, 'J')).toBeCloseTo(SW);
    expect(dmg(s2, 'J')).toBeCloseTo(H);
  });

  const origins = ITEM_DEFS.filter((d) => d.kind === 'origin' && !d.artifact);
  /** Share of each origin stone over n picks among the origin stones */
  const shares = (seed: number, n: number) => {
    const rng = new Rng(seed);
    const got = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const id = pickDef(rng, origins).id;
      got.set(id, (got.get(id) ?? 0) + 1);
    }
    return (id: string) => (got.get(id) ?? 0) / n;
  };

  it('戦利品: 起点石が出るときは、決まった割合がふつうの起点石', () => {
    const plain = shares(7, 4000)('origin_stone');
    expect(plain).toBeGreaterThan(LOOT.plainOriginShare - 0.05);
    expect(plain).toBeLessThan(LOOT.plainOriginShare + 0.05);
  });

  it('戦利品: 起点石がない候補では、ほかの装備の出やすさは変わらない（ふつうの等しい選び方と同じ）', () => {
    const swords = ITEM_DEFS.filter((d) => d.kind === 'attack' && !d.artifact);
    const a = new Rng(3);
    const b = new Rng(3);
    const picked = Array.from({ length: 50 }, () => pickDef(a, swords));
    expect(picked).toEqual(Array.from({ length: 50 }, () => b.pick(swords)));
  });

  it('種類つきは流れの石6種（どれも起点石）', () => {
    expect(
      origins
        .filter((d) => d.line)
        .map((d) => d.id)
        .sort(),
    ).toEqual(
      [
        'origin_swift',
        'origin_heavy',
        'origin_shield',
        'origin_lead',
        'origin_echo',
        'origin_far',
      ].sort(),
    );
    expect(getItemDef('origin_swift').kind).toBe('origin');
  });

  it('種類つきの石は、ふつうの起点石の残りを等分する', () => {
    const share = shares(11, 6000);
    const typed = origins.filter((x) => x.line).map((d) => share(d.id));
    const mean = typed.reduce((a, b) => a + b, 0) / typed.length;
    expect(1 - share('origin_stone')).toBeGreaterThan(1 - LOOT.plainOriginShare - 0.05);
    expect(Math.max(...typed) - Math.min(...typed)).toBeLessThan(mean * 0.5);
  });
});
