import { describe, expect, it } from 'vitest';
import { featureRules, runFeatures, runKindOf } from '../../src/core/runRules';

describe('ランの種類ごとに何が有効か', () => {
  it('普通のラン: 全部。アクセサリーは付けられて落ちる', () =>
    expect(runFeatures('normal')).toEqual({
      board: 'chosen',
      keepCount: true,
      mastery: 'grow',
      relics: true,
      treasure: true,
      charms: 'equipDrop',
    }));

  it('∞: ゴブリンなし、アクセサリーは付けられるが落ちない', () =>
    expect(runFeatures('endless')).toEqual({
      board: 'chosen',
      keepCount: true,
      mastery: 'grow',
      relics: true,
      treasure: false,
      charms: 'equip',
    }));

  it('挑戦: 標準の盤面と倒しても続くだけ', () =>
    expect(runFeatures('challenge')).toEqual({
      board: 'challenge',
      keepCount: true,
      mastery: 'off',
      relics: false,
      treasure: false,
      charms: 'off',
    }));

  it('体験ラン: 台本の盤面と倒しても続くだけ', () =>
    expect(runFeatures('demo')).toEqual({
      board: 'demo',
      keepCount: true,
      mastery: 'off',
      relics: false,
      treasure: false,
      charms: 'off',
    }));

  it('かかし: 選んだ盤面、今の熟練（閃かない）、アクセサリー', () =>
    expect(runFeatures('dummy')).toEqual({
      board: 'chosen',
      keepCount: true,
      mastery: 'fixed',
      relics: false,
      treasure: false,
      charms: 'equip',
    }));

  it('ランの種類: 挑戦 > 体験 > ∞ > 普通', () => {
    expect(runKindOf({ regionId: 'cave', challenge: true, demo: false })).toBe('challenge');
    expect(runKindOf({ regionId: 'grassland', challenge: false, demo: true })).toBe('demo');
    expect(runKindOf({ regionId: 'endless', challenge: false, demo: false })).toBe('endless');
    expect(runKindOf({ regionId: 'cave', challenge: false, demo: false })).toBe('normal');
  });

  it('倒しても続くルール', () => {
    expect(featureRules(runFeatures('normal'))).toEqual({ keepCountOnKill: true });
    expect(featureRules({ ...runFeatures('normal'), keepCount: false })).toBeUndefined();
  });
});
