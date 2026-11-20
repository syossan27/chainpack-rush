import { describe, expect, it } from 'vitest';
import { CHAIN } from '../src/config/balance';
import { planChain } from '../src/core/chain';
import type { ChainPlan } from '../src/core/types';
import { pickDef } from '../src/core/loot';
import { Rng } from '../src/core/rng';
import { ITEM_DEFS, getItemDef } from '../src/data/items';
import { build, type Placed } from './helpers';

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

  it('速の起点石は伝わるのが速く、重い起点石は遅い。合流の先も、その発火の起点石の速さ', () => {
    const fast = CHAIN.relayDelay + SWIFT.relay!;
    const slow = CHAIN.relayDelay + HEAVY.relay!;
    expect(fast).toBeLessThan(CHAIN.relayDelay);
    expect(slow).toBeGreaterThan(CHAIN.relayDelay);
    const swift = yShape('origin_swift', 'origin_stone', 'sword');
    const p1 = planChain(swift.loadout, swift.items, 'o1');
    expect(stepOf(p1, 'a').t).toBeCloseTo(fast);
    expect(stepOf(p1, 'b').t).toBeCloseTo(fast * 2);

    const heavy = yShape('origin_heavy', 'origin_stone', 'sword');
    expect(stepOf(planChain(heavy.loadout, heavy.items, 'o1'), 'a').t).toBeCloseTo(slow);

    // Swift and heavy routes meet at J: each firing keeps its own stone's speed after it
    const both = yShape('origin_swift', 'origin_heavy', 'sword');
    const s1 = planChain(both.loadout, both.items, 'o1');
    const s2 = planChain(both.loadout, both.items, 'o2');
    expect(stepOf(s1, 'e').t - stepOf(s1, 'J').t).toBeCloseTo(fast);
    expect(stepOf(s2, 'e').t - stepOf(s2, 'J').t).toBeCloseTo(slow);
    expect(dmg(s1, 'J')).toBeCloseTo(SW);
    expect(dmg(s2, 'J')).toBeCloseTo(H);
  });

  it('戦利品: 起点石が出るときは半分がふつうの起点石。ほかの装備の出やすさは変わらない', () => {
    const origins = ITEM_DEFS.filter((d) => d.kind === 'origin' && !d.artifact);
    const rng = new Rng(7);
    let plain = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (pickDef(rng, origins).id === 'origin_stone') plain++;
    expect(plain / n).toBeGreaterThan(0.45);
    expect(plain / n).toBeLessThan(0.55);
    // Without origin stones in the pool, the pick is the same as a plain uniform pick
    const swords = ITEM_DEFS.filter((d) => d.kind === 'attack' && !d.artifact);
    const a = new Rng(3);
    const b = new Rng(3);
    for (let i = 0; i < 50; i++) expect(pickDef(a, swords)).toBe(b.pick(swords));
    expect(getItemDef('origin_swift').kind).toBe('origin');
  });

  it('種類つきは流れの石6種で、残りの半分を等分する', () => {
    const origins = ITEM_DEFS.filter((d) => d.kind === 'origin' && !d.artifact);
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
    const rng = new Rng(11);
    const got = new Map<string, number>();
    const n = 6000;
    for (let i = 0; i < n; i++) {
      const id = pickDef(rng, origins).id;
      got.set(id, (got.get(id) ?? 0) + 1);
    }
    for (const d of origins.filter((x) => x.line)) {
      expect((got.get(d.id) ?? 0) / n, d.id).toBeGreaterThan(0.06);
      expect((got.get(d.id) ?? 0) / n, d.id).toBeLessThan(0.11);
    }
  });
});
