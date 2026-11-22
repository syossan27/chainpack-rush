import { describe, expect, it } from 'vitest';
import { Combat } from '../../src/core/combat';
import { DEMO_HERO, DEMO_REGION, demoLoadout } from '../../src/data/demoLoadout';
import { simulateChain } from '../../src/core/chain';
import { featureRules, runFeatures } from '../../src/core/runRules';

describe('体験ラン（最初の出撃で伝説の装備を借りる）', () => {
  it('盤面は標準', () => {
    expect(demoLoadout().loadout.board).toBe('standard');
  });

  it('起点は1つ', () => {
    expect(demoLoadout().loadout.originOrder).toHaveLength(1);
  });

  it('重ねた山がある', () => {
    expect(demoLoadout().loadout.under!.some((u) => u.length > 0)).toBe(true);
  });

  it('線は全部のマスを通る', () => {
    const { loadout, items } = demoLoadout();
    const plan = simulateChain(loadout, items).plans[0]!;
    expect(new Set(plan.steps.map((s) => s.cell)).size).toBe(loadout.cells.filter(Boolean).length);
  });

  /** The demo run with each of these seeds, to the end */
  const play = (seed: number) => {
    const { loadout, items } = demoLoadout();
    const rules = featureRules(runFeatures('demo'));
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
    return { r: c.result(), techs };
  };
  let runs: ReturnType<typeof play>[] | undefined;
  const demoRuns = () => (runs ??= [1, 2, 3].map(play));

  it('力尽きずに時間いっぱい戦う', () => {
    expect(demoRuns().map(({ r }) => r.reason)).toEqual(['timeout', 'timeout', 'timeout']);
  });

  it('必殺技が3種類以上出る', () => {
    for (const { techs } of demoRuns()) expect(techs.size).toBeGreaterThanOrEqual(3);
  });

  it('戦利品は出ない', () => {
    expect(demoRuns().map(({ r }) => r.drops.length)).toEqual([0, 0, 0]);
  });

  it('時間の延長はない', () => {
    expect(demoRuns().map(({ r }) => r.stats.timeGained)).toEqual([0, 0, 0]);
  });
});
