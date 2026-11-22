import { describe, expect, it, vi } from 'vitest';
import { chainMultiplier, simulateChain } from '../../src/core/chain';
import { build } from '../helpers';

const r2 = (x: number) => Math.round(x * 100) / 100;

describe('連鎖倍率（上限なし）', () => {
  it('1〜6段は今までと同じ（×1.2 ずつ）', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => r2(chainMultiplier(n)))).toEqual([
      1, 1.2, 1.44, 1.73, 2.07, 2.49,
    ]);
  });

  it('7段から先は 2.49×(段/6)^0.5 で伸び続ける', () => {
    expect([8, 10, 12, 15, 20, 25].map((n) => r2(chainMultiplier(n)))).toEqual([
      2.87, 3.21, 3.52, 3.93, 4.54, 5.08,
    ]);
  });

  it('100段まで単調に増え、有限', () => {
    for (let n = 2; n <= 100; n++) {
      expect(chainMultiplier(n)).toBeGreaterThan(chainMultiplier(n - 1));
      expect(Number.isFinite(chainMultiplier(n))).toBe(true);
    }
  });

  it('循環の環: ×4.0 まで ×1.2 ずつ（9段目で ×4.0）、その先は 4.0×(段/9)^0.5', () => {
    expect([6, 8, 9, 12, 20].map((n) => r2(chainMultiplier(n, 4)))).toEqual([
      2.49, 3.58, 4, 4.62, 5.96,
    ]);
    for (let n = 2; n <= 60; n++)
      expect(chainMultiplier(n, 4)).toBeGreaterThanOrEqual(chainMultiplier(n));
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
    for (const s of plan.steps)
      if (s.step !== null) expect(s.mult).toBeCloseTo(chainMultiplier(s.step, 4));
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
