import { describe, expect, it } from 'vitest';
import { checkAchievements } from '../../src/core/achievements';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import type { RunResult } from '../../src/core/combat';

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

/** The achievements of one threshold kind, in catalog order, with their threshold */
function withThreshold(kind: 'maxStep' | 'maxDamage') {
  return ACHIEVEMENTS.flatMap((a) => (a.check.kind === kind ? [{ ...a, n: a.check.n }] : []));
}

describe('実績', () => {
  it('id は重ならない', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  describe.each(['maxStep', 'maxDamage'] as const)('%s の実績', (kind) => {
    const list = withThreshold(kind);
    const thresholds = list.map((a) => a.n);

    it('説明の数字が基準と同じ', () => {
      const wrong = list.filter((a) => !a.desc.includes(a.n.toLocaleString('en-US')));
      expect(wrong.map((a) => a.id)).toEqual([]);
    });

    it('基準は順に大きくなり、同じ基準はない', () => {
      expect(thresholds).toEqual([...thresholds].sort((x, y) => x - y));
      expect(new Set(thresholds).size).toBe(thresholds.length);
    });
  });

  describe('条件を満たしたとき', () => {
    // The chain achievements in order: reach the second one exactly, not the third
    const steps = withThreshold('maxStep');
    const setup = () => {
      const s = createInitialSave();
      s.stats.runs = 1;
      s.stats.maxStep = steps[1]!.n;
      return s;
    };

    it('満たした条件の実績が達成になり、まだの段は達成にならない', () => {
      const got = checkAchievements(setup(), run({ bossesDefeated: 1 })).map((a) => a.id);
      expect(got).toEqual(expect.arrayContaining(['runs_1', steps[0]!.id, steps[1]!.id, 'boss_1']));
      expect(got).not.toContain(steps[2]!.id);
    });

    it('達成した実績の報酬のゴールドが入る', () => {
      const s = setup();
      const g = s.gold;
      const got = checkAchievements(s, run({ bossesDefeated: 1 }));
      expect(s.gold).toBe(g + got.reduce((t, a) => t + a.reward, 0));
    });

    it('同じ実績は1回だけ達成になる', () => {
      const s = setup();
      checkAchievements(s, run({ bossesDefeated: 1 }));
      expect(checkAchievements(s, run({ bossesDefeated: 1 }))).toHaveLength(0);
    });
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
