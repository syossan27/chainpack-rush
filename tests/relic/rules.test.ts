import { describe, expect, it } from 'vitest';
import { RELIC } from '../../src/config/balance';
import { canStickRelic, relicValue, rollRelicOffer } from '../../src/core/relics';
import { Rng } from '../../src/core/rng';
import type { Dir, ItemInstance, Loadout } from '../../src/core/types';
import { RELICS, type RelicId } from '../../src/data/relics';

const mk = (uid: string, defId: string, exits: Dir[] = ['right']): ItemInstance => ({
  uid,
  defId,
  rarity: 'common',
  exits,
  rerollCount: 0,
});

// origin → sword → wood_shield, then an empty cell
const list = [mk('o', 'origin_stone'), mk('s', 'sword'), mk('sh', 'wood_shield')];
const items = new Map(list.map((i) => [i.uid, i]));
const loadout: Loadout = {
  width: 4,
  height: 1,
  cells: ['o', 's', 'sh', null],
  originOrder: ['o'],
  consumables: [],
};

describe('レリック: ボスのあとに出てくるもの', () => {
  const offers = Array.from({ length: 50 }, (_, i) => rollRelicOffer(new Rng(i + 1)));

  it('どの乱数でも、出てくる数は RELIC.offer', () => {
    expect(offers.map((o) => o.length)).toEqual(offers.map(() => RELIC.offer));
  });

  it('同じレリックが重ねて出ることはない', () => {
    expect(offers.map((o) => new Set(o).size)).toEqual(offers.map(() => RELIC.offer));
  });

  it('出てくるのは定義にあるレリックだけ', () => {
    const known = new Set(RELICS.map((r) => r.id));
    expect(offers.flat().filter((id) => !known.has(id))).toEqual([]);
  });
});

describe('レリック: 説明に入る値', () => {
  it.each([
    ['fist', RELIC.fistMult],
    ['pierce', RELIC.pierce],
    ['feather', RELIC.featherSteps],
    ['ward', RELIC.wardDefense],
  ] as const)('%s の説明には RELIC の値がそのまま入る', (id, value) => {
    expect(relicValue(id)).toBe(value);
  });

  it.each([
    ['eye', RELIC.eyeCrit],
    ['fang', RELIC.fangHeal],
  ] as const)('%s の説明には RELIC の割合が % で入る', (id, share) => {
    expect(relicValue(id)).toBe(share * 100);
  });

  it('値のないレリックの説明には何も入らない', () => {
    expect(relicValue('bell')).toBeUndefined();
  });
});

describe('レリック: 貼れるマス', () => {
  const none = new Map<number, RelicId>();

  it('攻撃用は攻撃装備のマスに貼れる', () => {
    expect(canStickRelic(loadout, items, none, 'fist', 1)).toBe(true);
  });

  it.each([
    ['起点', 0],
    ['防具', 2],
  ])('攻撃用は%sのマスには貼れない', (_, cell) => {
    expect(canStickRelic(loadout, items, none, 'fist', cell)).toBe(false);
  });

  it.each([
    ['whistle', '起点', 0],
    ['ward', '防具', 2],
  ] as const)('どれでも用 (%s) は、装備のあるマスならどこでも貼れる（%s）', (id, _, cell) => {
    expect(canStickRelic(loadout, items, none, id, cell)).toBe(true);
  });

  it.each([
    ['空きマス', 3],
    ['盤面の外（手前）', -1],
    ['盤面の外（奥）', 9],
  ])('%sには貼れない', (_, cell) => {
    expect(canStickRelic(loadout, items, none, 'whistle', cell)).toBe(false);
  });

  it('もう貼ってあるマスには貼れない', () => {
    const stuck = new Map<number, RelicId>([[1, 'bell']]);
    expect(canStickRelic(loadout, items, stuck, 'fist', 1)).toBe(false);
  });

  it('重ねる盤面では、山に攻撃装備があれば攻撃用を貼れる', () => {
    const more = new Map(items);
    more.set('s2', mk('s2', 'sword'));
    const stacked: Loadout = {
      ...loadout,
      cells: ['o', 's', 'sh', null],
      under: [[], ['s2'], [], []],
    };
    expect(canStickRelic(stacked, more, none, 'bell', 1)).toBe(true);
  });
});
