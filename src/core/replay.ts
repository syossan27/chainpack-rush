// ランの再生: 同じ設定と同じ操作から、同じ結果になるかを確かめる（ランキングの不正対策。サーバーでも使う）
import { Combat, type RunConfig, type RunInput, type RunResult } from './combat';

/** 操作を順に当てながら、最初から最後まで計算する。操作が不正（順番が逆・使えない）なら null */
export function replayRun(cfg: RunConfig, inputs: readonly RunInput[]): RunResult | null {
  const c = new Combat(cfg);
  let i = 0;
  let last = -1;
  // 長すぎる記録ははじく（出撃時間の上限 + 再開1回 より十分長く）
  const LIMIT = 60 * 60 * 10;
  for (;;) {
    while (i < inputs.length && inputs[i]!.t === c.tick) {
      const inp = inputs[i]!;
      if (inp.t < last) return null;
      last = inp.t;
      const ok =
        inp.k === 'use'
          ? c.useConsumable(inp.slot)
          : inp.k === 'revive'
            ? c.revive(inp.s)
            : (c.retreat(), true);
      if (!ok) return null;
      i++;
    }
    if (c.ended) break;
    if (c.tick > LIMIT) return null;
    c.step();
  }
  // 使われなかった操作が残っていたら不正
  if (i < inputs.length) return null;
  return c.result();
}

/** 申告された結果と、再生した結果が同じか */
export function sameResult(a: RunResult, b: RunResult): boolean {
  return (
    a.reachedLoop === b.reachedLoop &&
    a.ticks === b.ticks &&
    a.reason === b.reason &&
    a.stats.totalDamage === b.stats.totalDamage &&
    a.stats.maxStep === b.stats.maxStep
  );
}
