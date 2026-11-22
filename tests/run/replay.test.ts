import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat, type RunConfig } from '../../src/core/combat';
import { createInitialSave } from '../../src/core/save';
import { itemMap } from '../../src/core/economy';
import { replayRun, sameResult } from '../../src/core/replay';
import { Rng } from '../../src/core/rng';

function cfgOf(seed: number, regionId = 'cave'): RunConfig {
  const s = createInitialSave();
  return {
    seed,
    regionId,
    loadout: s.loadout,
    items: itemMap(s),
    hero: { ...BASE_HERO_STATS, maxHp: 400 },
    consumableSlots: 2,
    noLoot: true,
  };
}

describe('ランの再生', () => {
  it.each([1, 7, 42, 999])(
    '操作を記録したランを、同じ設定で再生すると同じ結果になる（種 %i）',
    (seed) => {
      const c = new Combat(cfgOf(seed));
      const rng = new Rng(seed);
      while (!c.ended) {
        // ときどき消耗品を使う・ごくまれに撤退
        if (rng.next() < 0.002) c.useConsumable(0);
        if (c.tick > 600 && rng.next() < 0.0005) c.retreat();
        c.step();
        if (c.ended === 'dead' && !c.revived) c.revive(10);
      }
      const r = c.result();
      const again = replayRun(cfgOf(seed), r.inputs ?? []);
      expect(again).not.toBeNull();
      expect(sameResult(r, again!)).toBe(true);
    },
  );

  /** A recorded run with seed 5 that uses a consumable once */
  const recorded = () => {
    const c = new Combat(cfgOf(5));
    while (!c.ended) {
      if (c.tick === 300) c.useConsumable(0);
      c.step();
    }
    return c.result();
  };

  it('ダメージを盛った申告は、再生した結果と合わない', () => {
    const r = recorded();
    const fake = { ...r, stats: { ...r.stats, totalDamage: r.stats.totalDamage * 2 } };
    expect(sameResult(fake, replayRun(cfgOf(5), r.inputs ?? [])!)).toBe(false);
  });

  it('持っていない枠の消耗品を使った記録は、再生できない', () => {
    expect(replayRun(cfgOf(5), [{ t: 10, k: 'use', slot: 5 }])).toBeNull();
  });

  it('力尽きていないのに再開した記録は、再生できない', () => {
    expect(replayRun(cfgOf(5), [{ t: 10, k: 'revive', s: 10 }])).toBeNull();
  });

  it('違う種で再生すると、結果が合わないか再生できない', () => {
    const r = recorded();
    const other = replayRun(cfgOf(6), r.inputs ?? []);
    expect(other === null || !sameResult(r, other)).toBe(true);
  });
});
