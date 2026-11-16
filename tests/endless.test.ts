import { describe, expect, it } from 'vitest';
import { Combat } from '../src/core/combat';
import { createInitialSave } from '../src/core/save';
import { endlessUnlocked, itemMap, recordRun } from '../src/core/economy';
import { checkAchievements } from '../src/core/achievements';

describe('エンドレス', () => {
  it('装備もゴールドも落とさず、記録は地域とは別に残る', () => {
    const s = createInitialSave();
    const c = new Combat({
      seed: 3,
      regionId: 'endless',
      loadout: s.loadout,
      items: itemMap(s),
      hero: { maxHp: 1e6, atbTime: 1, attackMult: 50, runTime: 30 },
    });
    while (!c.ended) c.step();
    const r = c.result();
    expect(r.drops).toHaveLength(0);
    expect(r.stats.gold ?? 0).toBe(0);
    expect(r.reachedLoop).toBeGreaterThanOrEqual(1);
    recordRun(s, 'endless', r);
    expect(s.endless.bestLoop).toBe(r.reachedLoop);
    expect(s.progress.best.endless).toBeUndefined();
  });

  it('魔王（魔王城の3周目のボス）を倒すと開放、節目の実績でゴールド', () => {
    const s = createInitialSave();
    expect(endlessUnlocked(s)).toBe(false);
    s.progress.best.demon_castle = 4;
    expect(endlessUnlocked(s)).toBe(true);
    s.endless.bestLoop = 10;
    const got = checkAchievements(s).map((a) => a.id);
    expect(got).toEqual(expect.arrayContaining(['demon_lord', 'endless_5', 'endless_10']));
  });
});
