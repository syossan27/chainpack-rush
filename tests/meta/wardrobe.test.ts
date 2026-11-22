import { describe, expect, it } from 'vitest';
import { cosmeticCondition, cosmeticProgress, giveCosmetics } from '../../src/core/cosmeticRewards';
import { getCosmetic } from '../../src/core/cosmetics';
import { createInitialSave } from '../../src/core/save';
import {
  WARDROBE_TABS,
  firstTab,
  markSeen,
  newKinds,
  wardrobeCards,
} from '../../src/core/wardrobe';
import { t } from '../../src/i18n';

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

  it('タブの最初は「なし」で、何も着けていなければ着けている印が付く', () => {
    expect(wardrobeCards(createInitialSave(), 'head')[0]).toEqual({
      id: null,
      owned: true,
      worn: true,
      isNew: false,
      condition: null,
      progress: null,
    });
  });

  it('頭のタブ: なしのあとに若葉・炎・氷', () => {
    expect(wardrobeCards(createInitialSave(), 'head').map((c) => c.id)).toEqual([
      null,
      'head_leaf_crown',
      'head_flame_plume',
      'head_ice_crystal',
    ]);
  });

  it('持っていない小物は、もらい方の文と進み具合を出す', () => {
    const s = createInitialSave();
    s.progress.best.grassland = 3;
    const leaf = getCosmetic('head_leaf_crown')!;
    const p = cosmeticProgress(s, leaf.id)!;
    expect(wardrobeCards(s, 'head')[1]).toEqual({
      id: 'head_leaf_crown',
      owned: false,
      worn: false,
      isNew: false,
      condition: cosmeticCondition(leaf),
      progress: `${p.have}/${p.need}`,
    });
  });

  it('背中のタブ: なしのあとにコウモリ・旗・魔王・星の輪（後光）', () => {
    expect(wardrobeCards(createInitialSave(), 'back').map((c) => c.id)).toEqual([
      null,
      'back_bat_wings',
      'back_knight_flag',
      'back_demon_wings',
      'back_star_ring',
    ]);
  });

  it('星の輪は、エンドレスのもらい方の文と、着いた周回の進み具合を出す', () => {
    const s = createInitialSave();
    const ring = getCosmetic('back_star_ring')!;
    const p = cosmeticProgress(s, ring.id)!;
    expect(p.have).toBe(0);
    expect(wardrobeCards(s, 'back')[4]).toMatchObject({
      condition: cosmeticCondition(ring),
      progress: `0/${p.need}`,
    });
  });

  it('順位でもらう物は、もらい方の文だけで進み具合はない', () => {
    const pets = wardrobeCards(createInitialSave(), 'pet');
    expect(pets.map((c) => c.id)).toEqual([null, 'pet_dragon']);
    expect(pets[1]!.owned).toBe(false);
    expect(pets[1]!.condition).not.toBeNull();
    expect(pets[1]!.progress).toBeNull();
  });

  it('開発用の全部持ちでは、持っている扱いでもらい方の文を出さない', () => {
    expect(wardrobeCards(createInitialSave(), 'pet', true)[1]).toMatchObject({
      owned: true,
      condition: null,
      progress: null,
    });
  });

  it('着けている物には着用の印、もらったばかりの物には新しい印が付き、「なし」は外れる', () => {
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

  it('新しい印がなければ、勇者のタブから開く', () => {
    const s = createInitialSave();
    expect(newKinds(s)).toEqual([]);
    expect(firstTab(s)).toBe('hero');
  });

  it('新しい印は持っている種類のタブにだけ付き、印のあるいちばん左のタブから開く', () => {
    const s = createInitialSave();
    giveCosmetics(s, ['back_bat_wings', 'head_leaf_crown']);
    expect(newKinds(s)).toEqual(['head', 'back']);
    expect(firstTab(s)).toBe('head');
  });

  it('タブを見ると、そのタブの新しい印だけが消える', () => {
    const s = createInitialSave();
    giveCosmetics(s, ['back_bat_wings', 'head_leaf_crown']);
    markSeen(s, 'head');
    expect(s.newCosmetics).toEqual(['back_bat_wings']);
    expect(newKinds(s)).toEqual(['back']);
    expect(firstTab(s)).toBe('back');
  });
});
