import { describe, expect, it } from 'vitest';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { equippedUids, sortieBlock } from '../src/core/economy';
import { clearLoadout, setConsumable } from '../src/core/loadout';
import { stackAt, stackPut } from '../src/core/stack';
import {
  enterTrialEdit,
  leaveTrialEdit,
  sortieBoard,
  stackBoardOf,
  trialRules,
  usesStackBoard,
} from '../src/core/trial';
import { itemMap } from '../src/core/economy';
import type { SaveData } from '../src/core/save';

const regular = { challenge: false, demo: false, regionId: 'grassland' };

function withSwords(): SaveData {
  const s = createInitialSave();
  for (const n of [1, 2, 3])
    s.inventory.push({
      uid: `sw${n}`,
      defId: 'sword',
      rarity: 'common',
      exits: ['right'],
      rerollCount: 0,
    });
  return s;
}

describe('試作「重ねる盤面」の切り替えと専用の編成', () => {
  it('切り替えは初めは OFF。壊れた値も OFF、ON は保存して読み直しても残る', () => {
    const s = createInitialSave();
    expect(s.settings.trialStack).toBe(false);
    const data = JSON.parse(serializeSave(s)) as { settings: Record<string, unknown> };
    data.settings.trialStack = 1;
    expect(deserializeSave(JSON.stringify(data)).settings.trialStack).toBe(false);
    s.settings.trialStack = true;
    expect(deserializeSave(serializeSave(s)).settings.trialStack).toBe(true);
  });

  it('重ねる盤面で出撃するのは、使える版でデバッグ機能と切り替えが ON の、ふつうの出撃だけ。倒しても連鎖が続く', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    s.settings.trialStack = true;
    expect(usesStackBoard(s, true, regular)).toBe(true);
    expect(trialRules(s, true, regular)).toEqual({ keepCountOnKill: true });
    expect(usesStackBoard(s, false, regular)).toBe(false);
    expect(usesStackBoard(s, true, { ...regular, challenge: true })).toBe(false);
    expect(usesStackBoard(s, true, { ...regular, regionId: 'endless' })).toBe(false);
    expect(usesStackBoard(s, true, { ...regular, demo: true })).toBe(false);
    s.settings.debug = false;
    expect(usesStackBoard(s, true, regular)).toBe(false);
  });

  it('編集中はふだんの編成と入れ替わり、終えると専用の編成に残ってふだんの編成に戻る', () => {
    const s = withSwords();
    const before = JSON.stringify(s.loadout);
    enterTrialEdit(s);
    expect([s.loadout.width, s.loadout.height]).toEqual([4, 3]);
    expect(s.loadout.under).toBeDefined();
    const items = itemMap(s);
    for (const u of ['sw1', 'sw2']) s.loadout = stackPut(s.loadout, items, u, 5).loadout;
    // Stacked items count as placed (not offered again, not sold)
    expect(equippedUids(s).has('sw1')).toBe(true);
    leaveTrialEdit(s);
    expect(JSON.stringify(s.loadout)).toBe(before);
    expect(stackAt(stackBoardOf(s), 5)).toEqual(['sw1', 'sw2']);
    // Kept through a save and reload, also while editing
    expect(stackAt(stackBoardOf(deserializeSave(serializeSave(s))), 5)).toEqual(['sw1', 'sw2']);
    enterTrialEdit(s);
    const back = deserializeSave(serializeSave(s));
    expect(back.editingTrial).toBe(true);
    expect(stackAt(back.loadout, 5)).toEqual(['sw1', 'sw2']);
    leaveTrialEdit(back);
    expect(JSON.stringify(back.loadout)).toBe(before);
  });

  it('出撃前の確認は、重ねる盤面で出るときはその盤面の起点を見る', () => {
    const s = withSwords();
    s.settings.debug = true;
    s.settings.trialStack = true;
    // The ordinary loadout has origin stones, the stacked board is still empty
    expect(sortieBlock(s)).toBeNull();
    expect(sortieBlock(s, sortieBoard(s, true, 'grassland'))).toBe('noOrigin');
    // Endless keeps the ordinary loadout
    expect(sortieBoard(s, true, 'endless')).toBe(s.loadout);
    enterTrialEdit(s);
    const origin = s.inventory.find((i) => i.defId === 'origin_stone')!;
    s.loadout = stackPut(s.loadout, itemMap(s), origin.uid, 0).loadout;
    leaveTrialEdit(s);
    expect(sortieBlock(s, sortieBoard(s, true, 'grassland'))).toBeNull();
  });

  it('消耗品枠の変更と「全部外す」でも、重ねる盤面のまま', () => {
    const s = withSwords();
    enterTrialEdit(s);
    s.loadout = stackPut(s.loadout, itemMap(s), 'sw1', 2).loadout;
    const potion = s.inventory.find((i) => i.defId === 'potion')!;
    const withPotion = setConsumable(s.loadout, 0, potion.uid, 3);
    expect(withPotion.under).toBeDefined();
    expect(stackAt(withPotion, 2)).toEqual(['sw1']);
    const cleared = clearLoadout(withPotion);
    expect(cleared.under).toEqual(cleared.cells.map(() => []));
  });
});
