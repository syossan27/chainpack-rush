import { describe, expect, it } from 'vitest';
import { sortItems } from '../../src/core/itemSort';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import type { ItemInstance, Rarity } from '../../src/core/types';

const item = (uid: string, defId: string, rarity: Rarity = 'common'): ItemInstance => ({
  uid,
  defId,
  rarity,
  exits: ['right'],
  rerollCount: 0,
});

const items: ItemInstance[] = [
  item('a', 'rally'),
  item('b', 'torch', 'rare'),
  item('c', 'sword', 'common'),
  item('d', 'wood_shield', 'epic'),
  item('e', 'sword', 'legendary'),
  item('f', 'origin_stone', 'rare'),
  item('g', 'flame_staff', 'common'),
  item('h', 'torch', 'common'),
  item('i', 'greatsword', 'rare'),
];

const order = (list: ItemInstance[]) => list.map((it) => it.uid).join('');

describe('倉庫の並び', () => {
  it('レア順: レアの高い順、同じレアの中は装備の種類で。消耗品は最後', () => {
    // legendary sword | epic wood_shield | rare greatsword, origin_stone, torch
    // | common flame_staff, sword, torch | consumable rally
    expect(order(sortItems(items, 'rarity'))).toBe('edifbgcha');
  });

  it('装備ごと: 起点 → 攻撃（属性ごと）→ 防御。同じ装備はレアをまたいでまとまり、中はレアの高い順', () => {
    // origin_stone | physical: greatsword, sword(L), sword(C) | fire: flame_staff, torch(R), torch(C)
    // | defense: wood_shield | consumable: rally
    expect(order(sortItems(items, 'gear'))).toBe('fiecgbhda');
  });

  it('元の一覧は並べ替えない', () => {
    const copy = items.slice();
    sortItems(items, 'gear');
    expect(items).toEqual(copy);
  });
});

describe('倉庫の並びの保存', () => {
  it('初めはレア順', () => {
    expect(createInitialSave().settings.itemSort).toBe('rarity');
  });

  it('装備ごとは、保存して読み直しても残る', () => {
    const s = createInitialSave();
    s.settings.itemSort = 'gear';
    expect(deserializeSave(serializeSave(s)).settings.itemSort).toBe('gear');
  });

  it('壊れた値はレア順に戻る', () => {
    const data = JSON.parse(serializeSave(createInitialSave())) as {
      settings: Record<string, unknown>;
    };
    data.settings.itemSort = 'name';
    expect(deserializeSave(JSON.stringify(data)).settings.itemSort).toBe('rarity');
  });
});
