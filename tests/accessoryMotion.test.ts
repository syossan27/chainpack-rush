import { describe, expect, it } from 'vitest';
import { glintAt, GLINT_MS, pulseAt } from '../src/core/accessoryMotion';

describe('小物の動き', () => {
  it('キラッは everyMs ごとに一瞬だけ（真ん中でいちばん強く、ほかは 0）', () => {
    expect(glintAt(0, 2600)).toBe(0);
    expect(glintAt(GLINT_MS / 2, 2600)).toBeCloseTo(1);
    expect(glintAt(GLINT_MS + 1, 2600)).toBe(0);
    expect(glintAt(2600 + GLINT_MS / 2, 2600)).toBeCloseTo(1);
  });

  it('明るさの波は 1 から始まり、半周期で min まで下がって戻る', () => {
    const p = { min: 0.7, ms: 2000 };
    expect(pulseAt(0, p)).toBeCloseTo(1);
    expect(pulseAt(500, p)).toBeCloseTo(0.85);
    expect(pulseAt(1000, p)).toBeCloseTo(0.7);
    expect(pulseAt(2000, p)).toBeCloseTo(1);
    for (let t = 0; t < 4000; t += 37) {
      expect(pulseAt(t, p)).toBeGreaterThanOrEqual(0.7 - 1e-9);
      expect(pulseAt(t, p)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
