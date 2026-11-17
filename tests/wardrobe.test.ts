import { describe, expect, it } from 'vitest';
import { giveCosmetics } from '../src/core/cosmeticRewards';
import { createInitialSave } from '../src/core/save';
import { WARDROBE_TABS, firstTab, markSeen, newKinds, wardrobeCards } from '../src/core/wardrobe';
import { t } from '../src/i18n';

describe('着せ替え画面', () => {
  it('タブは 勇者・頭・背中・ペット・名前の飾り の順', () => {
    expect(WARDROBE_TABS.map((tab) => tab.kind)).toEqual(['hero', 'head', 'back', 'pet', 'deco']);
    expect(WARDROBE_TABS.map((tab) => t(tab.label))).toEqual([
      '勇者',
      '頭',
      '背中',
      'ペット',
      '名前の飾り',
    ]);
  });

  it('頭のタブ: なしのあとに若葉・炎・氷。持っていない物は条件と進み具合', () => {
    const s = createInitialSave();
    s.progress.best.grassland = 3;
    const cards = wardrobeCards(s, 'head');
    expect(cards.map((c) => c.id)).toEqual([
      null,
      'head_leaf_crown',
      'head_flame_plume',
      'head_ice_crystal',
    ]);
    expect(cards[0]).toEqual({
      id: null,
      owned: true,
      worn: true,
      isNew: false,
      condition: null,
      progress: null,
    });
    expect(cards[1]).toEqual({
      id: 'head_leaf_crown',
      owned: false,
      worn: false,
      isNew: false,
      condition: '草原で★1（3周目のボスを倒す）',
      progress: '2/3',
    });
  });

  it('背中のタブ: なしのあとにコウモリ・旗・魔王・星の輪（後光）', () => {
    const s = createInitialSave();
    const cards = wardrobeCards(s, 'back');
    expect(cards.map((c) => c.id)).toEqual([
      null,
      'back_bat_wings',
      'back_knight_flag',
      'back_demon_wings',
      'back_star_ring',
    ]);
    expect(cards[4]).toMatchObject({ condition: 'エンドレスで10周目に着く', progress: '0/10' });
  });

  it('順位でもらう物は条件だけ（進み具合はない）。開発用の全部持ちでは条件を出さない', () => {
    const s = createInitialSave();
    const pets = wardrobeCards(s, 'pet');
    expect(pets.map((c) => c.id)).toEqual([null, 'pet_dragon']);
    expect(pets[1]!.owned).toBe(false);
    expect(pets[1]!.condition).not.toBeNull();
    expect(pets[1]!.progress).toBeNull();
    expect(wardrobeCards(s, 'pet', true)[1]).toMatchObject({
      owned: true,
      condition: null,
      progress: null,
    });
  });

  it('着けている物・新しい物の印', () => {
    const s = createInitialSave();
    giveCosmetics(s, ['head_ice_crystal']);
    s.look.head = 'head_ice_crystal';
    const cards = wardrobeCards(s, 'head');
    expect(cards[0]).toMatchObject({ id: null, worn: false });
    expect(cards[3]).toMatchObject({
      id: 'head_ice_crystal',
      owned: true,
      worn: true,
      isNew: true,
      condition: null,
      progress: null,
    });
  });

  it('新しい印は持っている種類のタブにだけ付き、そのタブを見ると消える', () => {
    const s = createInitialSave();
    expect(newKinds(s)).toEqual([]);
    expect(firstTab(s)).toBe('hero');
    giveCosmetics(s, ['back_bat_wings', 'head_leaf_crown']);
    expect(newKinds(s)).toEqual(['head', 'back']);
    expect(firstTab(s)).toBe('head');
    markSeen(s, 'head');
    expect(s.newCosmetics).toEqual(['back_bat_wings']);
    expect(newKinds(s)).toEqual(['back']);
    expect(firstTab(s)).toBe('back');
  });
});
