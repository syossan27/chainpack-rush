import { describe, expect, it, vi } from 'vitest';
import { CHAIN } from '../../src/config/balance';
import { chainMultiplier, simulateChain } from '../../src/core/chain';
import { getItemDef } from '../../src/data/items';
import { build } from '../helpers';

/** The ring's ceiling (循環の環) */
const RING = getItemDef('ouroboros').riseTo!;

/** Steps 2..n */
const stepsUpTo = (n: number) => Array.from({ length: n - 1 }, (_, i) => i + 2);

describe('連鎖倍率（上限なし）', () => {
  it('1段目は ×1', () => {
    expect(chainMultiplier(1)).toBe(1);
  });

  it.each(stepsUpTo(CHAIN.riseSteps))(
    'riseSteps 段目までは1段ごとに CHAIN.multBase 倍（%i段目）',
    (n) => {
      expect(chainMultiplier(n) / chainMultiplier(n - 1)).toBeCloseTo(CHAIN.multBase);
    },
  );

  it.each([CHAIN.riseSteps, CHAIN.riseSteps + 2, CHAIN.riseSteps + 5])(
    'riseSteps 段目から先は段数の平方根に比例して伸び続ける（%i段目の4倍の段で2倍）',
    (n) => {
      expect(chainMultiplier(4 * n) / chainMultiplier(n)).toBeCloseTo(2);
    },
  );

  it('100段まで単調に増え、有限', () => {
    for (let n = 2; n <= 100; n++) {
      expect(chainMultiplier(n)).toBeGreaterThan(chainMultiplier(n - 1));
      expect(Number.isFinite(chainMultiplier(n))).toBe(true);
    }
  });

  describe('循環の環', () => {
    /** The first step whose multiplier reaches the ring's ceiling */
    const knee = stepsUpTo(60).find((n) => chainMultiplier(n, RING) >= RING - 1e-9)!;

    it('環の上限に届くまでは1段ごとに CHAIN.multBase 倍', () => {
      const ratios = stepsUpTo(knee - 1).map(
        (n) => chainMultiplier(n, RING) / chainMultiplier(n - 1, RING),
      );
      expect(ratios.length).toBeGreaterThan(0);
      expect(ratios.every((r) => Math.abs(r - CHAIN.multBase) < 1e-9)).toBe(true);
    });

    it('上限に届いた段で、ちょうど環の上限の値になる', () => {
      expect(chainMultiplier(knee, RING)).toBeCloseTo(RING);
    });

    it('上限に届いた段から先は段数の平方根に比例して伸び続ける', () => {
      expect(chainMultiplier(4 * knee, RING) / chainMultiplier(knee, RING)).toBeCloseTo(2);
    });

    it('どの段でも、環なしの倍率を下回らない', () => {
      for (let n = 2; n <= 60; n++)
        expect(chainMultiplier(n, RING)).toBeGreaterThanOrEqual(chainMultiplier(n));
    });
  });

  it('環を通る線と通らない線が同じ発火にあると、計画全体が環の伸び方', () => {
    // o → ring → s1..s8 down the first row; o → t1..t3 on the second row (no ring)
    const { loadout, items } = build(10, 2, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right', 'down'] },
      { uid: 'r', defId: 'ouroboros', x: 1, y: 0, exits: ['right'] },
      ...[2, 3, 4, 5, 6, 7, 8, 9].map((x) => ({
        uid: `s${x}`,
        defId: 'sword',
        x,
        y: 0,
        exits: (x === 9 ? [] : ['right']) as ('right' | 'down')[],
      })),
      { uid: 't0', defId: 'sword', x: 0, y: 1, exits: ['right'] },
      { uid: 't1', defId: 'sword', x: 1, y: 1, exits: [] },
    ]);
    const plan = simulateChain(loadout, items).plans[0]!;
    const counted = plan.steps.filter((s) => s.step !== null);
    expect(counted.length).toBeGreaterThan(0);
    expect(counted.map((s) => s.mult)).toEqual(counted.map((s) => chainMultiplier(s.step!, RING)));
  });

  it('Math.pow を使わない（端末ごとに最後の桁がずれると、記録の再生が合わない）', () => {
    const pow = vi.spyOn(Math, 'pow');
    for (let n = 1; n <= 40; n++) {
      chainMultiplier(n);
      chainMultiplier(n, 4);
    }
    expect(pow).not.toHaveBeenCalled();
    pow.mockRestore();
  });
});
