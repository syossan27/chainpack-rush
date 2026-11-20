import { describe, expect, it } from 'vitest';
import { MASTERY } from '../src/config/balance';
import {
  masteryLevel,
  pointsForLevel,
  recordMastery,
  runMastery,
  sparkChance,
} from '../src/core/mastery';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { masterySwitchOn, usesMastery } from '../src/core/trial';

const regular = { challenge: false, demo: false, regionId: 'grassland' };

describe('試作「熟練と閃き」: 熟練のレベル', () => {
  it('レベルに要る熟練は 50 → 150 → 300 …と増える（1つ手前では上がらない）', () => {
    expect(pointsForLevel(0)).toBe(0);
    expect(pointsForLevel(1)).toBe(MASTERY.base);
    expect(pointsForLevel(2)).toBe(MASTERY.base * 3);
    expect(pointsForLevel(3)).toBe(MASTERY.base * 6);
    expect(masteryLevel(0)).toBe(0);
    expect(masteryLevel(pointsForLevel(1) - 1)).toBe(0);
    expect(masteryLevel(pointsForLevel(1))).toBe(1);
    expect(masteryLevel(pointsForLevel(3) + 1)).toBe(3);
  });

  it('上限は Lv30（ダメージ +90%）: 際限なく強くならない', () => {
    expect(MASTERY.maxLevel).toBe(30);
    expect(MASTERY.maxLevel * MASTERY.dmgPerLevel).toBeCloseTo(0.9, 10);
  });

  it('レベルの境目は数え上げと同じ。どんなに大きな値でも上限で止まる', () => {
    for (let p = 0; p <= pointsForLevel(12) + 1; p++) {
      let slow = 0;
      while (p >= pointsForLevel(slow + 1)) slow++;
      expect(masteryLevel(p)).toBe(slow);
    }
    const top = MASTERY.maxLevel;
    expect(masteryLevel(pointsForLevel(top) - 1)).toBe(top - 1);
    expect(masteryLevel(pointsForLevel(top))).toBe(top);
    expect(masteryLevel(pointsForLevel(top + 5))).toBe(top);
    // A broken save with a huge number: no freeze, no wrong level
    expect(masteryLevel(1e35)).toBe(top);
    expect(masteryLevel(Number.MAX_VALUE)).toBe(top);
    expect(masteryLevel(Infinity)).toBe(top);
  });

  it('閃きの確率は 熟練レベル × 15%（0 なら閃かない、100% まで）', () => {
    expect(sparkChance(0)).toBe(0);
    expect(sparkChance(1)).toBeCloseTo(MASTERY.sparkPerLevel);
    expect(sparkChance(3)).toBeCloseTo(MASTERY.sparkPerLevel * 3);
    expect(sparkChance(50)).toBe(1);
  });
});

describe('試作「熟練と閃き」: 出撃の結果をためる', () => {
  it('鳴った回数を属性ごとに足し、上がったレベルと閃いた必殺技を返す', () => {
    const s = createInitialSave();
    const first = recordMastery(s, { physical: 60, fire: 10 }, ['triple']);
    expect(s.mastery!.points).toEqual({ physical: 60, fire: 10 });
    expect(s.mastery!.learned).toEqual(['triple']);
    expect(first.gains).toEqual([
      { element: 'physical', added: 60, levelBefore: 0, levelAfter: 1 },
      { element: 'fire', added: 10, levelBefore: 0, levelAfter: 0 },
    ]);
    expect(first.learned).toEqual(['triple']);
    // The same technique is not learned twice
    const second = recordMastery(s, { physical: 100 }, ['triple', 'whirl']);
    expect(s.mastery!.points.physical).toBe(160);
    expect(s.mastery!.learned).toEqual(['triple', 'whirl']);
    expect(second.learned).toEqual(['whirl']);
    expect(second.gains).toEqual([
      { element: 'physical', added: 100, levelBefore: 1, levelAfter: 2 },
    ]);
  });

  it('出撃に渡すのは、属性ごとのレベルと覚えた必殺技', () => {
    const s = createInitialSave();
    expect(runMastery(s)).toEqual({ levels: {}, learned: [] });
    recordMastery(s, { physical: pointsForLevel(2), thunder: 5 }, ['thunder']);
    expect(runMastery(s)).toEqual({ levels: { physical: 2, thunder: 0 }, learned: ['thunder'] });
  });
});

describe('試作「熟練と閃き」: 切り替えと保存', () => {
  it('切り替えは初めは OFF。壊れた値も OFF、ON は保存して読み直しても残る', () => {
    const s = createInitialSave();
    expect(s.settings.trialMastery).toBe(false);
    const data = JSON.parse(serializeSave(s)) as { settings: Record<string, unknown> };
    data.settings.trialMastery = 'yes';
    expect(deserializeSave(JSON.stringify(data)).settings.trialMastery).toBe(false);
    s.settings.trialMastery = true;
    expect(deserializeSave(serializeSave(s)).settings.trialMastery).toBe(true);
  });

  it('熟練と覚えた必殺技は保存して読み直しても残る。壊れた値は捨てる', () => {
    const s = createInitialSave();
    expect(deserializeSave(serializeSave(s)).mastery).toBeUndefined();
    recordMastery(s, { physical: 70 }, ['triple']);
    expect(deserializeSave(serializeSave(s)).mastery).toEqual({
      points: { physical: 70 },
      learned: ['triple'],
    });
    const data = JSON.parse(serializeSave(s)) as { mastery: unknown };
    data.mastery = {
      points: { physical: 'x', fire: 12, nope: 3 },
      learned: ['triple', 5, 'no_such_tech', 'triple'],
    };
    expect(deserializeSave(JSON.stringify(data)).mastery).toEqual({
      points: { fire: 12 },
      learned: ['triple'],
    });
  });

  it('熟練と閃きで出撃するのは、使える版でデバッグ機能と切り替えが ON の、ふつうの出撃だけ', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    s.settings.trialMastery = true;
    expect(masterySwitchOn(s, true)).toBe(true);
    expect(usesMastery(s, true, regular)).toBe(true);
    expect(usesMastery(s, false, regular)).toBe(false);
    expect(usesMastery(s, true, { ...regular, challenge: true })).toBe(false);
    expect(usesMastery(s, true, { ...regular, regionId: 'endless' })).toBe(false);
    expect(usesMastery(s, true, { ...regular, demo: true })).toBe(false);
    s.settings.debug = false;
    expect(usesMastery(s, true, regular)).toBe(false);
  });
});
