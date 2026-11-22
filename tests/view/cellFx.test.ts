import { describe, expect, it } from 'vitest';
import { CELL_FX, cellFxKind, chainHeat } from '../../src/core/cellFxRules';
import { getItemDef } from '../../src/data/items';

describe('盤面のエフェクト', () => {
  it('連鎖の始めは熱くない', () => {
    expect(chainHeat(1)).toBe(0);
  });

  it.each(CELL_FX.heatSteps.map((step, i) => [step, i + 1]))(
    '連鎖が %i 段に届くと熱さが %i になる（1つ手前ではまだ上がらない）',
    (step, heat) => {
      expect(chainHeat(step)).toBe(heat);
      expect(chainHeat(step - 1)).toBe(heat - 1);
    },
  );

  it('最後の区切りより長い連鎖は、いちばん熱いまま', () => {
    const last = CELL_FX.heatSteps.at(-1)!;
    expect(chainHeat(last * 3)).toBe(CELL_FX.heatSteps.length);
  });

  it('熱さの段ごとに絵の大きさがある', () => {
    expect(CELL_FX.heatScale).toHaveLength(CELL_FX.heatSteps.length + 1);
  });

  it.each([
    ['flame_staff', 'fire'],
    ['frost_staff', 'ice'],
    ['ice_sword', 'ice'],
    ['thunder_staff', 'thunder'],
    ['sword', 'slash'],
    ['hammer', 'blunt'],
    ['venom_staff', 'poison'],
    ['tower_shield', 'guard'],
  ])('装備の属性でエフェクトが決まる: %s は %s', (id, kind) => {
    expect(cellFxKind(getItemDef(id))).toBe(kind);
  });

  it('起点石はエフェクトを出さない', () => {
    expect(cellFxKind(getItemDef('origin_stone'))).toBeNull();
  });
});
