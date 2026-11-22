import { describe, expect, it } from 'vitest';
import { Combat } from '../../src/core/combat';
import { DEMO_HERO, DEMO_REGION, demoLoadout } from '../../src/data/demoLoadout';
import { simulateChain } from '../../src/core/chain';
import { featureRules, runFeatures } from '../../src/core/runRules';

describe('体験ラン（最初の出撃で伝説の装備を借りる）', () => {
  it('盤面は標準、起点は1つ。重ねた山があり、線は全部のマスを通る', () => {
    const { loadout, items } = demoLoadout();
    expect(loadout.board).toBe('standard');
    expect(loadout.originOrder).toHaveLength(1);
    expect(loadout.under!.some((u) => u.length > 0)).toBe(true);
    const plan = simulateChain(loadout, items).plans[0]!;
    expect(new Set(plan.steps.map((s) => s.cell)).size).toBe(loadout.cells.filter(Boolean).length);
  });

  it('力尽きずに時間いっぱい戦い、必殺技が3種類以上出る。戦利品と時間の延長はない', () => {
    const { loadout, items } = demoLoadout();
    const rules = featureRules(runFeatures('demo'));
    for (const seed of [1, 2, 3]) {
      const c = new Combat({
        seed,
        regionId: DEMO_REGION,
        loadout,
        items,
        hero: DEMO_HERO,
        demo: true,
        ...(rules ? { rules } : {}),
      });
      const techs = new Set<string>();
      while (!c.ended) {
        c.step();
        for (const e of c.drainEvents()) if (e.type === 'technique') techs.add(e.id);
      }
      const r = c.result();
      expect(r.reason).toBe('timeout');
      expect(r.drops).toHaveLength(0);
      expect(r.stats.timeGained).toBe(0);
      expect(techs.size).toBeGreaterThanOrEqual(3);
    }
  });
});
