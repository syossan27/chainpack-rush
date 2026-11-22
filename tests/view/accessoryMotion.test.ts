import { describe, expect, it } from 'vitest';
import { glintAt, GLINT_MS, pulseAt } from '../../src/core/accessoryMotion';

describe('小物の動き', () => {
  const every = 2600;

  it('キラッは光る時間の真ん中でいちばん強い', () => {
    expect(glintAt(GLINT_MS / 2, every)).toBeCloseTo(1);
  });

  it('キラッは光る時間の外では 0', () => {
    expect(glintAt(0, every)).toBe(0);
    expect(glintAt(GLINT_MS + 1, every)).toBe(0);
  });

  it('キラッは everyMs ごとにくり返す', () => {
    expect(glintAt(every + GLINT_MS / 2, every)).toBeCloseTo(1);
  });

  const pulse = { min: 0.7, ms: 2000 };

  it('明るさの波は 1 から始まり、半周期で min まで下がって1周期で戻る', () => {
    expect(pulseAt(0, pulse)).toBeCloseTo(1);
    expect(pulseAt(500, pulse)).toBeCloseTo(0.85);
    expect(pulseAt(1000, pulse)).toBeCloseTo(0.7);
    expect(pulseAt(2000, pulse)).toBeCloseTo(1);
  });

  it('明るさの波は min と 1 のあいだから出ない', () => {
    const values = Array.from({ length: 109 }, (_, i) => pulseAt(i * 37, pulse));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(pulse.min - 1e-9);
    expect(Math.max(...values)).toBeLessThanOrEqual(1 + 1e-9);
  });
});
