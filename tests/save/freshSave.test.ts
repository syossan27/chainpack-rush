import { describe, expect, it } from 'vitest';
import { createInitialSave, freshStartSave } from '../../src/core/save';

describe('デバッグ: 0から遊ぶ（別のセーブ）', () => {
  it('進み具合は最初の状態、設定だけ引き継ぐ', () => {
    const grown = createInitialSave();
    grown.gold = 99999;
    grown.progress.unlocked.push('cave', 'rampart');
    grown.inventory.push({
      uid: 'x',
      defId: 'greatsword',
      rarity: 'epic',
      exits: [],
      rerollCount: 0,
    });
    grown.settings = {
      ...grown.settings,
      debug: true,
      volume: 0.2,
      gameSpeed: 2,
      lang: 'en',
    };
    const fresh = freshStartSave(grown);
    const initial = createInitialSave();
    expect(fresh.gold).toBe(initial.gold);
    expect(fresh.progress).toEqual(initial.progress);
    expect(fresh.inventory).toEqual(initial.inventory);
    expect(fresh.settings).toEqual(grown.settings);
    // A copy: changing one save's settings leaves the other alone
    fresh.settings.volume = 1;
    expect(grown.settings.volume).toBe(0.2);
  });
});
