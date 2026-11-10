import { describe, expect, it } from 'vitest';
import { checkAchievements } from '../src/core/achievements';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { ACHIEVEMENTS } from '../src/data/achievements';
import type { RunResult } from '../src/core/combat';

const run = (p: Partial<RunResult['stats']> & { loop?: number }): RunResult => ({
  reason: 'timeout',
  usedConsumables: [],
  progress: 0,
  reachedLoop: p.loop ?? 1,
  drops: [],
  ticks: 0,
  stats: {
    fires: 0,
    maxStep: 0,
    maxDamage: 0,
    totalDamage: 0,
    bossesDefeated: 0,
    timeGained: 0,
    sweeps: 0,
    ...p,
  },
});

describe('実績', () => {
  it('id は重ならない', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('条件を満たすと1回だけ達成になり、報酬のゴールドが入る', () => {
    const s = createInitialSave();
    s.stats.runs = 1;
    s.stats.maxStep = 10;
    const g = s.gold;
    const got = checkAchievements(s, run({ bossesDefeated: 1 })).map((a) => a.id);
    expect(got).toEqual(expect.arrayContaining(['runs_1', 'step_6', 'step_10', 'boss_1']));
    expect(got).not.toContain('step_14');
    const reward = ACHIEVEMENTS.filter((a) => got.includes(a.id)).reduce((t, a) => t + a.reward, 0);
    expect(s.gold).toBe(g + reward);
    expect(checkAchievements(s, run({ bossesDefeated: 1 }))).toHaveLength(0);
  });

  it('ランの中の条件（周目・一網打尽）は、そのランの結果があるときだけ', () => {
    const s = createInitialSave();
    expect(checkAchievements(s).map((a) => a.id)).not.toContain('loop_5');
    expect(checkAchievements(s, run({ loop: 5, sweeps: 5 })).map((a) => a.id)).toEqual(
      expect.arrayContaining(['loop_5', 'sweep_5']),
    );
  });

  it('アーティファクトとレジェンダリーは別に数える', () => {
    const s = createInitialSave();
    s.inventory.push({
      uid: 'x1',
      defId: 'ouroboros',
      rarity: 'legendary',
      exits: [],
      rerollCount: 0,
    });
    const got = checkAchievements(s).map((a) => a.id);
    expect(got).toContain('own_artifact');
    expect(got).not.toContain('own_legendary');
  });

  it('達成した実績は保存される', () => {
    const s = createInitialSave();
    s.achievements = ['runs_1'];
    expect(deserializeSave(serializeSave(s)).achievements).toEqual(['runs_1']);
  });
});
