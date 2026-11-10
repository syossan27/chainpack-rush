import { describe, expect, it } from 'vitest';
import { diagnose } from '../src/core/diagnose';
import type { ItemInstance, Loadout } from '../src/core/types';

const item = (
  uid: string,
  defId: string,
  rarity: ItemInstance['rarity'],
  exits: ItemInstance['exits'],
): ItemInstance => ({
  uid,
  defId,
  rarity,
  exits,
  rerollCount: 0,
});

describe('配置の診断', () => {
  it('強い装備が前の段にあるときは、後ろと入れ替える手を出す。やってみると推定が伸びる', () => {
    // 起点 → 大剣（強い）→ 短剣 → 短剣 → 短剣（右へ1列）
    const inv = [
      item('o', 'origin_stone', 'common', ['right']),
      item('g', 'greatsword', 'legendary', ['right']),
      item('d1', 'dagger', 'common', ['right']),
      item('d2', 'dagger', 'common', ['right']),
      item('d3', 'dagger', 'common', ['right']),
    ];
    const loadout: Loadout = {
      width: 5,
      height: 1,
      cells: ['o', 'g', 'd1', 'd2', 'd3'],
      originOrder: ['o'],
      consumables: [],
    };
    const res = diagnose(loadout, inv, 1, []);
    const swap = res.advices.find((a) => a.kind === 'swap');
    expect(swap).toBeDefined();
    expect(swap!.gain).toBeGreaterThan(0);
    expect(swap!.apply!.cells[4]).toBe('g'); // 一番後ろへ
    const after = diagnose(swap!.apply!, inv, 1, []);
    expect(after.total).toBeGreaterThan(res.total);
  });

  it('どの起点からも届いていない装備を知らせる', () => {
    const inv = [
      item('o', 'origin_stone', 'common', ['right']),
      item('s', 'sword', 'common', ['right']),
    ];
    const loadout: Loadout = {
      width: 3,
      height: 2,
      cells: ['o', null, null, null, null, 's'],
      originOrder: ['o'],
      consumables: [],
    };
    const res = diagnose(loadout, inv, 1, []);
    expect(res.advices.some((a) => a.kind === 'unreached' && a.cells.includes(5))).toBe(true);
  });
});
