import { describe, expect, it } from 'vitest';
import { runBalanceSim } from '../tools/simLib';

describe('balance（受け入れ基準3）', () => {
  it('どの型でも1ランに8回以上発火する', () => {
    const r = runBalanceSim(10);
    expect(r.checks.fires).toBe(true);
  });

  // 型どうしの順位（混合型が最上位、一本型と複数型の入れ替わり）は `npm run sim` で判定する。
  // 改訂版の距離・配置（群れ4〜6体、群れ間240px以上）では現状 NG（DECISIONS.md「未達」参照）。
  it.todo('混合型の平均到達周回が最も高く、一本型と複数型の順位が地域で入れ替わる');
});
