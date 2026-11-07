import { describe, expect, it } from 'vitest';
import { computeDamage, effectiveArea, findCombo } from '../src/core/damage';

describe('damage', () => {
  it('D = ATK × R × 1.2^(n−1) × C × U', () => {
    expect(computeDamage({ atk: 10, rarity: 'common', step: 1 })).toBeCloseTo(10);
    expect(
      computeDamage({ atk: 10, rarity: 'rare', step: 3, comboMult: 3, upgradeMult: 1.1 }),
    ).toBeCloseTo(10 * 1.5 * 1.44 * 3 * 1.1);
    expect(computeDamage({ atk: 10, rarity: 'legendary', step: 2 })).toBeCloseTo(48);
  });

  it('全体攻撃は威力×0.4', () => {
    expect(computeDamage({ atk: 8, rarity: 'common', step: 1, area: 'all' })).toBeCloseTo(3.2);
  });

  it('状態コンボ: 濡れ×雷=感電×3、油×炎=爆発×2(範囲に拡大)、凍結×打撃=粉砕×2.5', () => {
    expect(findCombo('thunder', new Set(['wet']))?.mult).toBe(3);
    const ex = findCombo('fire', new Set(['oil']));
    expect(ex?.mult).toBe(2);
    expect(effectiveArea('single', ex)).toBe('splash');
    expect(findCombo('blunt', new Set(['frozen']))?.mult).toBe(2.5);
    expect(findCombo('physical', new Set(['wet', 'oil', 'frozen']))).toBeNull();
    expect(findCombo('thunder', new Set(['oil']))).toBeNull();
  });
});
