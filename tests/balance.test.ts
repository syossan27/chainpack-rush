import { describe, expect, it } from 'vitest';
import { runBalanceSim } from '../tools/simLib';

describe('balance（受け入れ基準3）', () => {
  it('混合型が最も高く、一本型と複数型は地域で順位が入れ替わり、どの型も8回以上発火する', () => {
    const r = runBalanceSim(20);
    expect(r.checks).toEqual({
      mixedBest: true,
      singleMultiSwap: true,
      noDominant: true,
      fires: true,
    });
  });
});
