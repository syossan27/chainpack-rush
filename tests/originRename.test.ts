import { describe, expect, it } from 'vitest';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { boardUids } from '../src/core/stack';
import type { ItemInstance } from '../src/core/types';
import { getItemDef } from '../src/data/items';

/** A version 2 save as stored: its origin stone on the board is `onBoard`; `more` adds stones to storage */
function v2(onBoard: string, more: [string, string][] = []) {
  const data = JSON.parse(serializeSave(createInitialSave())) as {
    version: number;
    inventory: ItemInstance[];
    loadout: { cells: (string | null)[] };
  };
  data.version = 2;
  const origin = data.inventory.find((i) => i.defId === 'origin_stone')!;
  origin.defId = onBoard;
  origin.exits = ['up', 'right'];
  origin.rarity = 'rare';
  origin.locked = true;
  origin.affixes = [{ id: 'quick', value: 10 }];
  for (const [uid, defId] of more)
    data.inventory.push({ uid, defId, rarity: 'common', exits: ['right'], rerollCount: 0 });
  return { raw: JSON.stringify(data), originUid: origin.uid, cells: data.loadout.cells.slice() };
}

const REMOVED = [
  'origin_fire',
  'origin_thunder',
  'origin_blunt',
  'origin_wind',
  'origin_light',
  'origin_dark',
  'origin_poison',
  'origin_vamp',
];

describe('なくした起点石の置きかえ（セーブ版3）', () => {
  it('8種の起点石はもうない', () => {
    for (const id of REMOVED) expect(() => getItemDef(id), id).toThrow();
  });

  it('版2のセーブ: 表のとおりに置きかわり、uid・出口・追加効果・ロック・配置は残る', () => {
    const { raw, originUid, cells } = v2('origin_fire', [
      ['t', 'origin_thunder'],
      ['b', 'origin_blunt'],
      ['w', 'origin_wind'],
      ['l', 'origin_light'],
      ['d', 'origin_dark'],
      ['p', 'origin_poison'],
      ['v', 'origin_vamp'],
      ['sh', 'origin_shield'],
    ]);
    const s = deserializeSave(raw);
    const def = (uid: string) => s.inventory.find((i) => i.uid === uid)?.defId;
    // fire, thunder, blunt → echo; wind, light, dark → far; poison, vamp → lead
    expect([def(originUid), def('t'), def('b')]).toEqual(new Array(3).fill('origin_echo'));
    expect([def('w'), def('l'), def('d')]).toEqual(new Array(3).fill('origin_far'));
    expect([def('p'), def('v')]).toEqual(new Array(2).fill('origin_lead'));
    expect(def('sh')).toBe('origin_shield');
    expect(s.inventory.find((i) => i.uid === originUid)).toMatchObject({
      exits: ['up', 'right'],
      rarity: 'rare',
      locked: true,
      affixes: [{ id: 'quick', value: 10 }],
    });
    // The board is as it was (a reset would have laid out a new one)
    expect(s.loadout.cells).toEqual(cells);
    expect(boardUids(s.loadout)).toContain(originUid);
    expect(s.version).toBe(3);
    expect((JSON.parse(serializeSave(s)) as { version: number }).version).toBe(3);
  });
});
