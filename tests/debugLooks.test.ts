import { describe, expect, it } from 'vitest';
import { COSMETICS } from '../src/core/cosmetics';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { fixLook, looksAllOpen, rankingDeco, wardrobeCards } from '../src/core/wardrobe';

describe('設定の「デバッグ機能」（見た目を全部試せる）', () => {
  it('初めは OFF。壊れた値も OFF、ON は保存して読み直しても残る', () => {
    const s = createInitialSave();
    expect(s.settings.debug).toBe(false);
    const data = JSON.parse(serializeSave(s)) as { settings: Record<string, unknown> };
    data.settings.debug = 'yes';
    expect(deserializeSave(JSON.stringify(data)).settings.debug).toBe(false);
    delete data.settings.debug;
    expect(deserializeSave(JSON.stringify(data)).settings.debug).toBe(false);
    s.settings.debug = true;
    expect(deserializeSave(serializeSave(s)).settings.debug).toBe(true);
  });

  it('全部持っている扱いになるのは、ON で、しかもその版で使えるときだけ', () => {
    const s = createInitialSave();
    expect(looksAllOpen(s, true)).toBe(false);
    s.settings.debug = true;
    expect(looksAllOpen(s, true)).toBe(true);
    // The release build ignores a save that still has it on
    expect(looksAllOpen(s, false)).toBe(false);
    const cards = wardrobeCards(s, 'back', looksAllOpen(s, true));
    expect(cards.every((c) => c.owned)).toBe(true);
  });

  it('ON のあいだは持っていない見た目を着けて読み直しても外れず、OFF にすると外れる', () => {
    const s = createInitialSave();
    s.cosmetics = ['head_leaf_crown'];
    s.settings.debug = true;
    s.look = {
      ...s.look,
      hero: 'hero_gold',
      head: 'head_leaf_crown',
      back: 'back_star_ring',
      pet: 'pet_dragon',
      deco: 'deco_crown_gold',
    };
    const back = deserializeSave(serializeSave(s));
    fixLook(back, true);
    expect(back.look).toEqual(s.look);
    // Turned off: only the looks really owned stay
    back.settings.debug = false;
    fixLook(back, true);
    expect(back.look).toEqual({
      hero: null,
      head: 'head_leaf_crown',
      back: null,
      pet: null,
      deco: null,
    });
    // In the release build a save left on is treated as off
    s.settings.debug = true;
    fixLook(s, false);
    expect(s.look.back).toBeNull();
    expect(s.look.head).toBe('head_leaf_crown');
  });

  it('ランキングに送る名前の飾りは、本当に持っている物だけ', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    s.look.deco = 'deco_crown_gold';
    expect(rankingDeco(s)).toBeNull();
    s.cosmetics = ['deco_crown_gold'];
    expect(rankingDeco(s)).toBe('deco_crown_gold');
    s.look.deco = null;
    expect(rankingDeco(s)).toBeNull();
    expect(COSMETICS.some((c) => c.id === 'deco_crown_gold')).toBe(true);
  });
});
