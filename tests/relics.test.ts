import { describe, expect, it } from 'vitest';
import { RELIC } from '../src/config/balance';
import { canStickRelic, relicValue, rollRelicOffer } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import type { Dir, ItemInstance, Loadout } from '../src/core/types';
import { RELICS, type RelicId } from '../src/data/relics';

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

describe('試作「レリック」: 出てくる3つ', () => {
  it('ボスを倒すたびに、重ならない3種類が出る', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const offer = rollRelicOffer(new Rng(seed));
      expect(offer).toHaveLength(RELIC.offer);
      expect(new Set(offer).size).toBe(RELIC.offer);
      for (const id of offer) expect(RELICS.some((r) => r.id === id)).toBe(true);
    }
  });

  it('説明に入る値は RELIC の値（割合は % で）', () => {
    expect(relicValue('fist')).toBe(RELIC.fistMult);
    expect(relicValue('eye')).toBe(RELIC.eyeCrit * 100);
    expect(relicValue('fang')).toBe(RELIC.fangHeal * 100);
    expect(relicValue('pierce')).toBe(RELIC.pierce);
    expect(relicValue('feather')).toBe(RELIC.featherSteps);
    expect(relicValue('ward')).toBe(RELIC.wardDefense);
    expect(relicValue('bell')).toBeUndefined();
  });
});

describe('試作「レリック」: 貼れるマス', () => {
  const none = new Map<number, RelicId>();

  it('攻撃用は攻撃装備のマスだけ。どれでも用は装備のあるマスならどこでも', () => {
    expect(canStickRelic(loadout, items, none, 'fist', 1)).toBe(true);
    expect(canStickRelic(loadout, items, none, 'fist', 0)).toBe(false);
    expect(canStickRelic(loadout, items, none, 'fist', 2)).toBe(false);
    expect(canStickRelic(loadout, items, none, 'whistle', 0)).toBe(true);
    expect(canStickRelic(loadout, items, none, 'ward', 2)).toBe(true);
  });

  it('空きマス・盤面の外・もう貼ってあるマスには貼れない', () => {
    expect(canStickRelic(loadout, items, none, 'whistle', 3)).toBe(false);
    expect(canStickRelic(loadout, items, none, 'whistle', -1)).toBe(false);
    expect(canStickRelic(loadout, items, none, 'whistle', 9)).toBe(false);
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
