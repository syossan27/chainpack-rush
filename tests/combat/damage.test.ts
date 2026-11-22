import { describe, expect, it } from 'vitest';
import { AREA, RARITY } from '../../src/config/balance';
import { chainMultiplier } from '../../src/core/chain';
import { computeDamage, effectiveArea, findCombo } from '../../src/core/damage';
import type { Rarity } from '../../src/core/types';

/** A plain hit: common, step 1, no combo, no upgrade */
const BASE = { atk: 10, rarity: 'common' as Rarity, step: 1 };

describe('damage', () => {
  it('素の一撃（コモン・1段目・コンボなし・強化なし）は攻撃力そのまま', () => {
    expect(computeDamage(BASE)).toBeCloseTo(BASE.atk);
  });

  it('攻撃力に比例する', () => {
    expect(computeDamage({ ...BASE, atk: 30 }) / computeDamage(BASE)).toBeCloseTo(3);
  });

  it.each(['rare', 'epic', 'legendary'] as const)('レアリティ倍率が掛かる（%s）', (rarity) => {
    expect(computeDamage({ ...BASE, rarity }) / computeDamage(BASE)).toBeCloseTo(
      RARITY[rarity].mult,
    );
  });

  it.each([2, 3, 6, 10])('段数の連鎖倍率が掛かる（%i段目）', (step) => {
    expect(computeDamage({ ...BASE, step }) / computeDamage(BASE)).toBeCloseTo(
      chainMultiplier(step),
    );
  });

  it('コンボ倍率が掛かる', () => {
    expect(computeDamage({ ...BASE, comboMult: 3 }) / computeDamage(BASE)).toBeCloseTo(3);
  });

  it('強化の攻撃倍率が掛かる', () => {
    expect(computeDamage({ ...BASE, upgradeMult: 1.1 }) / computeDamage(BASE)).toBeCloseTo(1.1);
  });

  it('倍率はすべて掛け合わさる', () => {
    const all = { atk: 10, rarity: 'rare' as Rarity, step: 3, comboMult: 3, upgradeMult: 1.1 };
    const product =
      (computeDamage({ ...BASE, rarity: all.rarity }) / computeDamage(BASE)) *
      (computeDamage({ ...BASE, step: all.step }) / computeDamage(BASE)) *
      all.comboMult *
      all.upgradeMult;
    expect(computeDamage(all) / computeDamage(BASE)).toBeCloseTo(product);
  });

  it('全体攻撃は威力が AREA.allMult 倍に下がる', () => {
    expect(AREA.allMult).toBeLessThan(1);
    expect(computeDamage({ ...BASE, area: 'all' }) / computeDamage(BASE)).toBeCloseTo(AREA.allMult);
  });
});

describe('状態コンボ', () => {
  it.each([
    ['thunder', 'wet', 'shock'],
    ['fire', 'oil', 'explode'],
    ['blunt', 'frozen', 'shatter'],
  ] as const)('%s で %s の敵を撃つとコンボ（%s）になり、威力が上がる', (element, status, name) => {
    const combo = findCombo(element, new Set([status]));
    expect(combo?.name).toBe(name);
    expect(combo!.mult).toBeGreaterThan(1);
  });

  it('爆発は単体攻撃を範囲攻撃に広げる', () => {
    expect(effectiveArea('single', findCombo('fire', new Set(['oil'])))).toBe('splash');
  });

  it('感電・粉砕は範囲を広げない', () => {
    expect(effectiveArea('single', findCombo('thunder', new Set(['wet'])))).toBe('single');
    expect(effectiveArea('single', findCombo('blunt', new Set(['frozen'])))).toBe('single');
  });

  it('物理はどの状態でもコンボにならない', () => {
    expect(findCombo('physical', new Set(['wet', 'oil', 'frozen']))).toBeNull();
  });

  it('属性と状態の組み合わせが合わなければコンボにならない', () => {
    expect(findCombo('thunder', new Set(['oil']))).toBeNull();
  });
});
