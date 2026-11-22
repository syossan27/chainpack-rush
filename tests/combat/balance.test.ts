import { describe, expect, it } from 'vitest';
import { runBalanceSim } from '../../tools/simLib';

describe('balance（受け入れ基準3）', () => {
  it('どの型でも1ランに8回以上発火する', () => {
    const r = runBalanceSim(10);
    expect(r.checks.fires).toBe(true);
  });

  // 型どうしの順位（全地域で最上位の型がない）と盤面どうしの比べは `npm run sim` で判定する
});
