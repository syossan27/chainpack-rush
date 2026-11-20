import { describe, expect, it } from 'vitest';
import {
  boardCharmSlots,
  charmEquipped,
  charmSellPrice,
  equipCharm,
  sellCharm,
} from '../src/core/charmSave';
import { createInitialSave, deserializeSave, serializeSave, type SaveData } from '../src/core/save';
import { switchBoard } from '../src/core/boardSave';
import { runConfig } from '../src/core/runConfig';

function load(patch: (raw: Record<string, unknown>) => void): SaveData {
  const raw = JSON.parse(serializeSave(createInitialSave())) as Record<string, unknown>;
  patch(raw);
  return deserializeSave(JSON.stringify(raw));
}

/** A fresh save owning c1 (そろいの指輪, rare) and c2 (技の腕輪, epic) */
function owning(): SaveData {
  return load((raw) => {
    raw.charms = [
      { uid: 'c1', defId: 'match_ring', rarity: 'rare' },
      { uid: 'c2', defId: 'tech_bangle', rarity: 'epic' },
    ];
  });
}

describe('アクセサリー: セーブと盤面ごとのスロット', () => {
  it('古いセーブ（アクセサリーの項目なし）も読める', () => {
    const save = load((raw) => {
      delete raw.charms;
    });
    expect(save.charms).toEqual([]);
    expect(boardCharmSlots(save, 'standard')).toEqual(new Array(7).fill(null));
  });

  it('不正なアクセサリーと、売ったものを指すスロットは捨てる', () => {
    const save = load((raw) => {
      raw.charms = [
        { uid: 'c1', defId: 'match_ring', rarity: 'rare' },
        { uid: 'c2', defId: 'no_such_charm', rarity: 'rare' },
        { uid: 'c3', defId: 'match_ring', rarity: 'mythic' },
        { uid: 'c1', defId: 'tech_bangle', rarity: 'epic' },
        'junk',
      ];
      raw.boards = {
        active: 'standard',
        layouts: {},
        charms: { standard: ['c1', 'gone', null, 5], nowhere: ['c1'] },
      };
    });
    expect(save.charms).toEqual([{ uid: 'c1', defId: 'match_ring', rarity: 'rare' }]);
    const slots = boardCharmSlots(save, 'standard');
    expect(slots).toHaveLength(7);
    expect(slots[0]).toEqual({ uid: 'c1', defId: 'match_ring', rarity: 'rare' });
    expect(slots.slice(1)).toEqual(new Array(6).fill(null));
    expect(Object.keys(save.boards.charms)).toEqual(['standard']);
  });

  it('付け替え: 同じ盤面で別のスロットへ移す。知らないアクセサリーやないスロットは断る', () => {
    const save = owning();
    expect(equipCharm(save, 'standard', 0, 'c1')).toBe(true);
    expect(equipCharm(save, 'standard', 3, 'c1')).toBe(true);
    const slots = boardCharmSlots(save, 'standard');
    expect(slots[0]).toBeNull();
    expect(slots[3]?.uid).toBe('c1');
    expect(equipCharm(save, 'standard', 7, 'c2')).toBe(false);
    expect(equipCharm(save, 'standard', 1, 'nope')).toBe(false);
    // Another board keeps its own slots: the same charm may be on both
    expect(equipCharm(save, 'gale', 0, 'c1')).toBe(true);
    expect(boardCharmSlots(save, 'standard')[3]?.uid).toBe('c1');
    expect(boardCharmSlots(save, 'gale')).toHaveLength(7);
    expect(equipCharm(save, 'standard', 3, null)).toBe(true);
    expect(boardCharmSlots(save, 'standard')[3]).toBeNull();
  });

  it('付けているものは、どの盤面のものでも売れない', () => {
    const save = owning();
    equipCharm(save, 'gale', 2, 'c1');
    expect(charmEquipped(save, 'c1')).toBe(true);
    const gold = save.gold;
    expect(sellCharm(save, 'c1')).toBe(0);
    expect(save.charms?.map((c) => c.uid)).toEqual(['c1', 'c2']);
    const price = charmSellPrice(save.charms![1]!);
    expect(price).toBeGreaterThan(0);
    expect(sellCharm(save, 'c2')).toBe(price);
    expect(save.gold).toBe(gold + price);
    expect(save.charms?.map((c) => c.uid)).toEqual(['c1']);
    expect(sellCharm(save, 'nope')).toBe(0);
  });

  it('盤面を切り替えて戻っても、付けたアクセサリーは残る', () => {
    const save = owning();
    save.progress.unlocked.push('cave', 'rampart');
    equipCharm(save, 'standard', 1, 'c2');
    switchBoard(save, 'small');
    switchBoard(save, 'standard');
    expect(boardCharmSlots(save, 'standard')[1]?.uid).toBe('c2');
  });

  it('普通のランは付けたアクセサリーで出る。挑戦では使わない', () => {
    const save = owning();
    equipCharm(save, 'standard', 1, 'c2');
    expect(runConfig(save, 'normal', 'grassland', 1).charms![1]?.uid).toBe('c2');
    expect(runConfig(save, 'endless', 'endless', 1).charms![1]?.uid).toBe('c2');
    expect(runConfig(save, 'challenge', 'cave', 1).charms).toBeUndefined();
  });
});
