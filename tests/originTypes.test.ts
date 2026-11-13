import { describe, expect, it } from 'vitest';
import { POISON, STATUS } from '../src/config/balance';
import { defenseValue, planChain } from '../src/core/chain';
import type { ChainPlan } from '../src/core/types';
import { BASE_HERO_STATS, Combat } from '../src/core/combat';
import { estimateRoute } from '../src/core/estimate';
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
  it('効くのは、その発火の起点の線だけ（合流の先も、発火した起点の分だけ）', () => {
    const { loadout, items } = yShape('origin_fire', 'origin_heavy', 'torch');
    const p1 = planChain(loadout, items, 'o1');
    const p2 = planChain(loadout, items, 'o2');
    // Fire stone line: fire items +15%; heavy stone line: +20%
    expect(stepOf(p1, 'a').line?.damage).toBeCloseTo(1.15);
    expect(stepOf(p2, 'c').line?.damage).toBeCloseTo(1.2);
    // Origins fire one at a time, so the shared part takes the firing origin's stone only
    expect(stepOf(p1, 'J').line?.damage).toBeCloseTo(1.15);
    expect(stepOf(p1, 'f').line?.damage).toBeCloseTo(1.15);
    expect(stepOf(p2, 'J').line?.damage).toBeCloseTo(1.2);
    expect(stepOf(p1, 'J').origins).toEqual(['o1']);
  });

  it('属性の起点石は、その属性の装備だけに効く', () => {
    const { loadout, items } = yShape('origin_fire', 'origin_stone', 'sword');
    const plan = planChain(loadout, items, 'o1');
    expect(stepOf(plan, 'a').line).toBeUndefined();
    expect(stepOf(plan, 'J').line).toBeUndefined();
  });

  it('同じ種類の起点石どうしが合流しても、効果は1回分', () => {
    const { loadout, items } = yShape('origin_fire', 'origin_fire', 'torch');
    for (const o of ['o1', 'o2'])
      expect(stepOf(planChain(loadout, items, o), 'J').line?.damage).toBeCloseTo(1.15);
  });

  it('速の起点石は伝わるのが速く、重い起点石は遅い。合流の先も、その発火の起点石の速さ', () => {
    const swift = yShape('origin_swift', 'origin_stone', 'sword');
    const p1 = planChain(swift.loadout, swift.items, 'o1');
    expect(stepOf(p1, 'a').t).toBeCloseTo(0.15);
    expect(stepOf(p1, 'b').t).toBeCloseTo(0.3);

    const heavy = yShape('origin_heavy', 'origin_stone', 'sword');
    expect(stepOf(planChain(heavy.loadout, heavy.items, 'o1'), 'a').t).toBeCloseTo(0.25);

    // Swift and heavy routes meet at J: each firing keeps its own stone's speed after it
    const both = yShape('origin_swift', 'origin_heavy', 'sword');
    const s1 = planChain(both.loadout, both.items, 'o1');
    const s2 = planChain(both.loadout, both.items, 'o2');
    expect(stepOf(s1, 'e').t - stepOf(s1, 'J').t).toBeCloseTo(0.15);
    expect(stepOf(s2, 'e').t - stepOf(s2, 'J').t).toBeCloseTo(0.25);
    expect(stepOf(s1, 'J').line?.damage).toBeCloseTo(0.9);
    expect(stepOf(s2, 'J').line?.damage).toBeCloseTo(1.2);
  });

  it('盾の起点石: 線の防御装備の防御値が上がる（連鎖が途中で切れても、通った分にかかる）', () => {
    const plain = yShape('origin_stone', 'origin_stone', 'wood_shield');
    const shield = yShape('origin_shield', 'origin_stone', 'wood_shield');
    const base = planChain(plain.loadout, plain.items, 'o1');
    const up = planChain(shield.loadout, shield.items, 'o1');
    expect(up.defenseGain).toBeCloseTo(base.defenseGain * 1.25);
    // The cut path adds defenseValue per reached step
    const a = stepOf(up, 'a');
    const inst = shield.items.get('a')!;
    expect(defenseValue(inst, a.line)).toBeCloseTo(defenseValue(inst) * 1.25);
  });

  it('毒の起点石: 毒の毎秒ダメージが上がり、見積もりにも入る', () => {
    const run = (o1: string) => {
      const { loadout, items } = yShape(o1, 'origin_stone', 'poison_dagger');
      loadout.originOrder = ['o1'];
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: BASE_HERO_STATS,
        mode: 'dummy',
        luck: { critChance: 0, damageVariance: 0 },
      });
      c.fireNext();
      while (c.chain) c.step();
      return { dps: c.enemies[0]!.poisonDps, plan: planChain(loadout, items, 'o1'), items };
    };
    const plain = run('origin_stone');
    const poison = run('origin_poison');
    const up = getItemDef('origin_poison').line!.poison! / 100;
    expect(poison.dps).toBeCloseTo(plain.dps * (1 + up));
    const term = (r: ReturnType<typeof run>) => estimateRoute(r.plan, r.items, 1).total;
    // Only the poison part of the estimate grows
    const ratio = POISON.dpsRatio * STATUS.duration * 0.5;
    expect(term(poison) - term(plain)).toBeCloseTo(((term(plain) * ratio) / (1 + ratio)) * up);
  });

  it('吸血の起点石: 吸血で回復する量が上がる', () => {
    const run = (o1: string) => {
      const { loadout, items } = yShape(o1, 'origin_stone', 'vampire_sword');
      loadout.originOrder = ['o1'];
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: BASE_HERO_STATS,
        mode: 'dummy',
        luck: { critChance: 0, damageVariance: 0 },
      });
      c.hp = 10;
      c.fireNext();
      while (c.chain) c.step();
      return c.hp - 10;
    };
    const up = getItemDef('origin_vamp').line!.lifesteal! / 100;
    expect(run('origin_vamp')).toBeCloseTo(run('origin_stone') * (1 + up));
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
});
