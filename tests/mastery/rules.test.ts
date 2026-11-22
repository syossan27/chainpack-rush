import { describe, expect, it } from 'vitest';
import { MASTERY } from '../../src/config/balance';
import {
  masteryLevel,
  pointsForLevel,
  recordMastery,
  runMastery,
  sparkChance,
} from '../../src/core/mastery';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';

const top = MASTERY.maxLevel;

describe('熟練と閃き: 熟練のレベル', () => {
  it('Lv1 に要る熟練は MASTERY.base', () => {
    expect(pointsForLevel(1)).toBe(MASTERY.base);
  });

  it('熟練が0なら Lv0', () => {
    expect(pointsForLevel(0)).toBe(0);
    expect(masteryLevel(0)).toBe(0);
  });

  it.each([2, 3, 4, 10])('Lv%i に上がるのに要る熟練は、Lv1 に要る熟練の Lv 倍', (n) => {
    const step = pointsForLevel(n) - pointsForLevel(n - 1);
    expect(step).toBe(n * pointsForLevel(1));
  });

  it.each([...Array.from({ length: 12 }, (_, i) => i + 1), top - 1, top])(
    'Lv%i の境目: 要る熟練の1つ手前では上がらず、ちょうどで上がる',
    (level) => {
      expect(masteryLevel(pointsForLevel(level) - 1)).toBe(level - 1);
      expect(masteryLevel(pointsForLevel(level))).toBe(level);
    },
  );

  it('どの熟練の値でも、レベルは1つずつ数え上げたものと同じ', () => {
    // Slow reference: count the levels whose total is reached
    const counted = (p: number) => {
      let level = 0;
      while (p >= pointsForLevel(level + 1)) level++;
      return level;
    };
    const points = Array.from({ length: pointsForLevel(12) + 2 }, (_, p) => p);
    expect(points.filter((p) => masteryLevel(p) !== counted(p))).toEqual([]);
  });

  it('レベルの上限がある: 際限なく強くならない', () => {
    expect(Number.isInteger(top)).toBe(true);
    expect(top).toBeGreaterThan(0);
    expect(masteryLevel(pointsForLevel(top + 5))).toBe(top);
  });

  it.each([1e35, Number.MAX_VALUE, Infinity])(
    '壊れたセーブの大きな値 (%s) でも、固まらずに上限のレベルになる',
    (points) => {
      expect(masteryLevel(points)).toBe(top);
    },
  );

  it('熟練が0なら閃かない', () => {
    expect(sparkChance(0)).toBe(0);
  });

  it('閃きの確率は熟練レベルに比例する', () => {
    expect(sparkChance(1)).toBeCloseTo(MASTERY.sparkPerLevel);
    expect(sparkChance(3)).toBeCloseTo(sparkChance(1) * 3);
  });

  it('閃きの確率は 100% で止まる', () => {
    expect(sparkChance(1000)).toBe(1);
  });
});

describe('熟練と閃き: 出撃の結果をためる', () => {
  it('鳴った回数を属性ごとに足し、上がったレベルを返す', () => {
    const s = createInitialSave();
    const firstPhysical = pointsForLevel(1) + 10;
    const fewFire = pointsForLevel(1) - 1;

    const first = recordMastery(s, { physical: firstPhysical, fire: fewFire }, []);

    expect(s.mastery!.points).toEqual({ physical: firstPhysical, fire: fewFire });
    expect(first.gains).toEqual([
      { element: 'physical', added: firstPhysical, levelBefore: 0, levelAfter: 1 },
      { element: 'fire', added: fewFire, levelBefore: 0, levelAfter: 0 },
    ]);
  });

  it('次の出撃の分は、今までの熟練に足される', () => {
    const s = createInitialSave();
    const firstPhysical = pointsForLevel(1) + 10;
    const more = pointsForLevel(2) - firstPhysical;
    recordMastery(s, { physical: firstPhysical }, []);

    const second = recordMastery(s, { physical: more }, []);

    expect(s.mastery!.points.physical).toBe(pointsForLevel(2));
    expect(second.gains).toEqual([
      { element: 'physical', added: more, levelBefore: 1, levelAfter: 2 },
    ]);
  });

  it('閃いた必殺技を覚え、新しく覚えた技を返す', () => {
    const s = createInitialSave();

    const r = recordMastery(s, {}, ['triple']);

    expect(s.mastery!.learned).toEqual(['triple']);
    expect(r.learned).toEqual(['triple']);
  });

  it('同じ必殺技は二度覚えない', () => {
    const s = createInitialSave();
    recordMastery(s, {}, ['triple']);

    const r = recordMastery(s, {}, ['triple', 'whirl']);

    expect(s.mastery!.learned).toEqual(['triple', 'whirl']);
    expect(r.learned).toEqual(['whirl']);
  });

  it('まだ何もためていなければ、出撃に渡すものは空', () => {
    expect(runMastery(createInitialSave())).toEqual({ levels: {}, learned: [] });
  });

  it('出撃に渡すのは、属性ごとのレベルと覚えた必殺技', () => {
    const s = createInitialSave();
    recordMastery(s, { physical: pointsForLevel(2), thunder: pointsForLevel(1) - 1 }, ['thunder']);
    expect(runMastery(s)).toEqual({ levels: { physical: 2, thunder: 0 }, learned: ['thunder'] });
  });
});

describe('熟練と閃き: 保存', () => {
  it('はじめのセーブの熟練は空', () => {
    const s = createInitialSave();
    expect(deserializeSave(serializeSave(s)).mastery).toEqual({ points: {}, learned: [] });
  });

  it('熟練と覚えた必殺技は保存して読み直しても残る', () => {
    const s = createInitialSave();
    recordMastery(s, { physical: 70 }, ['triple']);
    expect(deserializeSave(serializeSave(s)).mastery).toEqual({
      points: { physical: 70 },
      learned: ['triple'],
    });
  });

  it('壊れた熟練の値・知らない属性・知らない技・重複は、読み直すときに捨てる', () => {
    const data = JSON.parse(serializeSave(createInitialSave())) as { mastery: unknown };
    data.mastery = {
      points: { physical: 'x', fire: 12, nope: 3 },
      learned: ['triple', 5, 'no_such_tech', 'triple'],
    };
    expect(deserializeSave(JSON.stringify(data)).mastery).toEqual({
      points: { fire: 12 },
      learned: ['triple'],
    });
  });
});
