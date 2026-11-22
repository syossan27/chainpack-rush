import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { boardUids } from '../../src/core/stack';
import type { ItemInstance } from '../../src/core/types';
import { getItemDef } from '../../src/data/items';

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
  it.each(REMOVED)('%s はもうない', (id) => {
    expect(() => getItemDef(id)).toThrow();
  });

  const fullV2 = () =>
    v2('origin_fire', [
      ['t', 'origin_thunder'],
      ['b', 'origin_blunt'],
      ['w', 'origin_wind'],
      ['l', 'origin_light'],
      ['d', 'origin_dark'],
      ['p', 'origin_poison'],
      ['v', 'origin_vamp'],
      ['sh', 'origin_shield'],
    ]);

  it('版2のセーブ: なくした起点石は表のとおりに置きかわり、残っている石はそのまま', () => {
    const { raw, originUid } = fullV2();
    const s = deserializeSave(raw);
    const def = (uid: string) => s.inventory.find((i) => i.uid === uid)?.defId;
    // fire, thunder, blunt → echo; wind, light, dark → far; poison, vamp → lead
    expect([def(originUid), def('t'), def('b')]).toEqual(new Array(3).fill('origin_echo'));
    expect([def('w'), def('l'), def('d')]).toEqual(new Array(3).fill('origin_far'));
    expect([def('p'), def('v')]).toEqual(new Array(2).fill('origin_lead'));
    expect(def('sh')).toBe('origin_shield');
  });

  it('置きかえても uid・出口・追加効果・ロックは残る', () => {
    const { raw, originUid } = fullV2();
    const s = deserializeSave(raw);
    expect(s.inventory.find((i) => i.uid === originUid)).toMatchObject({
      exits: ['up', 'right'],
      rarity: 'rare',
      locked: true,
      affixes: [{ id: 'quick', value: 10 }],
    });
  });

  it('置きかえても盤面の配置は残る（作り直さない）', () => {
    const { raw, originUid, cells } = fullV2();
    const s = deserializeSave(raw);
    expect(s.loadout.cells).toEqual(cells);
    expect(boardUids(s.loadout)).toContain(originUid);
  });

  it('移したセーブは今の版になり、今の版で書き出す', () => {
    const s = deserializeSave(fullV2().raw);
    expect(s.version).toBe(SAVE_VERSION);
    expect((JSON.parse(serializeSave(s)) as { version: number }).version).toBe(SAVE_VERSION);
  });
});
