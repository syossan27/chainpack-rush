import { describe, expect, it } from 'vitest';
import {
  equippedUids,
  overflowSellPlan,
  sellItems,
  storageCount,
  synthPlan,
  acceptLoot,
} from '../src/core/economy';
import { otherPresetUse, switchPreset } from '../src/core/presets';
import { PRESET_COUNT, createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { clearLoadout, placeItem } from '../src/core/loadout';
import { itemMap } from '../src/core/economy';

describe('編成', () => {
  it('切り替えると並べ方が入れ替わり、戻すと元の並べ方に戻る。装備は倉庫に残る', () => {
    const s = createInitialSave();
    const first = JSON.stringify(s.loadout);
    const n = s.inventory.length;
    expect(s.presets).toHaveLength(PRESET_COUNT);
    expect(switchPreset(s, 1)).toBe(true);
    expect(s.activePreset).toBe(1);
    expect(s.loadout.cells.every((c) => c === null)).toBe(true); // 未使用の編成は空
    // 編成2に剣だけ置く
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    const origin = s.inventory.find((i) => i.defId === 'origin_stone')!;
    s.loadout = placeItem(s.loadout, itemMap(s), origin.uid, 0);
    s.loadout = placeItem(s.loadout, itemMap(s), sword.uid, 1);
    switchPreset(s, 0);
    expect(JSON.stringify(s.loadout)).toBe(first);
    switchPreset(s, 1);
    expect(s.loadout.cells[1]).toBe(sword.uid);
    expect(s.inventory).toHaveLength(n);
  });

  it('今の編成の分だけが装備中。ほかの編成の装備は倉庫の数に入る', () => {
    const s = createInitialSave();
    const before = storageCount(s);
    switchPreset(s, 1);
    expect(equippedUids(s).size).toBe(0);
    expect(storageCount(s)).toBeGreaterThan(before);
    const uses = otherPresetUse(s);
    expect(uses.size).toBeGreaterThan(0);
    for (const v of uses.values()) expect(v).toEqual([0]);
  });

  it('売った装備は、その編成に戻したとき空きになる。起点の発火順もそろえる', () => {
    const s = createInitialSave();
    const sword = s.loadout.cells[1]!;
    const firstOrigin = s.loadout.originOrder[0]!;
    switchPreset(s, 1);
    sellItems(s, [sword, firstOrigin]);
    switchPreset(s, 0);
    expect(s.loadout.cells).not.toContain(sword);
    expect(s.loadout.originOrder).not.toContain(firstOrigin);
    expect(s.loadout.originOrder.every((u) => s.loadout.cells.includes(u))).toBe(true);
  });

  it('ほかの編成で使っている装備は、あふれた分の売却・合成の材料にしない', () => {
    const s = createInitialSave();
    const ids = s.loadout.cells.filter((c): c is string => !!c);
    switchPreset(s, 1);
    s.loadout = clearLoadout(s.loadout);
    acceptLoot(
      s,
      Array.from({ length: 45 }, (_, i) => ({
        uid: `d${i}`,
        defId: 'spear',
        rarity: 'common' as const,
        exits: [],
        rerollCount: 0,
      })),
    );
    const plan = overflowSellPlan(s);
    expect(plan.uids.some((u) => ids.includes(u))).toBe(false);
    // 剣は2本とも編成1で使っている → 合成の材料にならない
    const swords = s.inventory.filter((i) => i.defId === 'sword');
    s.inventory.push({ ...swords[0]!, uid: 'extra' });
    expect(synthPlan(s, 'extra').have).toBe(1);
  });

  it('保存して読み込むと編成も残る。古いセーブには空の編成を用意する', () => {
    const s = createInitialSave();
    switchPreset(s, 2);
    s.presets[2]!.name = '凍結';
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.activePreset).toBe(2);
    expect(loaded.presets[2]!.name).toBe('凍結');
    expect(loaded.presets[0]!.loadout).not.toBeNull();
    const old = JSON.parse(serializeSave(createInitialSave()));
    delete old.presets;
    delete old.activePreset;
    const o = deserializeSave(JSON.stringify(old));
    expect(o.presets).toHaveLength(PRESET_COUNT);
    expect(o.activePreset).toBe(0);
    expect(o.gold).toBe(0);
  });
});
