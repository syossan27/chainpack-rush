import { describe, expect, it } from 'vitest';
import { CELL_FX, cellFxKind, chainHeat } from '../../src/core/cellFxRules';
import { getItemDef } from '../../src/data/items';

describe('盤面のエフェクト', () => {
  it('連鎖が伸びるほど熱くなる（5・10・20・40段で1段ずつ）', () => {
    expect([1, 4, 5, 9, 10, 19, 20, 39, 40, 99].map(chainHeat)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
    expect(CELL_FX.heatScale).toHaveLength(CELL_FX.heatSteps.length + 1);
  });

  it('装備の属性でエフェクトが決まる（起点石は出さない）', () => {
    expect(cellFxKind(getItemDef('flame_staff'))).toBe('fire');
    expect(cellFxKind(getItemDef('frost_staff'))).toBe('ice');
    expect(cellFxKind(getItemDef('ice_sword'))).toBe('ice');
    expect(cellFxKind(getItemDef('thunder_staff'))).toBe('thunder');
    expect(cellFxKind(getItemDef('sword'))).toBe('slash');
    expect(cellFxKind(getItemDef('hammer'))).toBe('blunt');
    expect(cellFxKind(getItemDef('venom_staff'))).toBe('poison');
    expect(cellFxKind(getItemDef('tower_shield'))).toBe('guard');
    expect(cellFxKind(getItemDef('origin_stone'))).toBeNull();
  });
});
