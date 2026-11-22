import { describe, expect, it } from 'vitest';
import { PROGRESS } from '../../src/config/balance';
import { Combat } from '../../src/core/combat';
import { createInitialSave } from '../../src/core/save';
import { endlessUnlocked, itemMap, recordRun } from '../../src/core/economy';
import { checkAchievements } from '../../src/core/achievements';

describe('エンドレス', () => {
  const play = () => {
    const s = createInitialSave();
    const c = new Combat({
      seed: 3,
      regionId: 'endless',
      loadout: s.loadout,
      items: itemMap(s),
      hero: { maxHp: 1e6, atbTime: 1, attackMult: 50, runTime: 30 },
    });
    while (!c.ended) c.step();
    return { s, r: c.result() };
  };

  it('装備もゴールドも落とさない', () => {
    const { r } = play();
    expect(r.reachedLoop).toBeGreaterThanOrEqual(1);
    expect(r.drops).toHaveLength(0);
    expect(r.stats.gold ?? 0).toBe(0);
  });

  it('記録は地域とは別に残る', () => {
    const { s, r } = play();
    recordRun(s, 'endless', r);
    expect(s.endless.bestLoop).toBe(r.reachedLoop);
    expect(s.progress.best.endless).toBeUndefined();
  });

  it('はじめは開放されていない', () => {
    expect(endlessUnlocked(createInitialSave())).toBe(false);
  });

  it('魔王（魔王城の★1つ目のボス）を倒すと開放', () => {
    const s = createInitialSave();
    s.progress.best.demon_castle = PROGRESS.starLoops[0] + 1;
    expect(endlessUnlocked(s)).toBe(true);
  });

  it('魔王の撃破と、エンドレスの節目に実績がある', () => {
    const s = createInitialSave();
    s.progress.best.demon_castle = PROGRESS.starLoops[0] + 1;
    s.endless.bestLoop = 10;
    const got = checkAchievements(s).map((a) => a.id);
    expect(got).toEqual(expect.arrayContaining(['demon_lord', 'endless_5', 'endless_10']));
  });
});
