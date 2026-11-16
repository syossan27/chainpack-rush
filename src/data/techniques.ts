// 必殺技: 連鎖のルートで、決まった装備が順に3つ並んで通ると、3つ目の一撃が必殺技になる（ダメージ増）。
// 演出は止めずに、勇者の踏み込みと特大の属性演出だけ（テンポを崩さない）
import type { Element } from '../core/types';

export interface TechniqueDef {
  id: string;
  name: string;
  /** 並び（1つ目→2つ目→3つ目）。各段はどれか1つでよい */
  seq: [string[], string[], string[]];
  /** 演出の属性 */
  element: Element;
  hint: string;
  /** まだ見つけていないときのヒント */
  teaser: string;
}

/** 必殺技の一撃のダメージ倍率 */
export const TECHNIQUE_MULT = 2.5;

export const TECHNIQUES: readonly TechniqueDef[] = [
  {
    id: 'crimson',
    name: 'クリムゾン・バースト',
    seq: [['oil_bottle'], ['torch', 'flame_staff'], ['flame_staff']],
    element: 'fire',
    hint: '油瓶 → 松明か炎の杖 → 炎の杖',
    teaser: '油と炎の気配がする…',
  },
  {
    id: 'thunder',
    name: 'トライ・サンダー',
    seq: [
      ['canteen', 'raincloud_staff'],
      ['thunder_staff', 'thunder_spear', 'thunder_bell'],
      ['thunder_staff', 'thunder_spear', 'thunder_bell'],
    ],
    element: 'thunder',
    hint: '水竜の瓶か雨雲の杖 → 雷の装備 → 雷の装備',
    teaser: '水と雷の気配がする…',
  },
  {
    id: 'frost',
    name: 'フロスト・ブレイカー',
    seq: [
      ['ice_sword', 'frost_staff'],
      ['hammer', 'iron_ball'],
      ['hammer', 'iron_ball'],
    ],
    element: 'ice',
    hint: '氷の剣か氷の杖 → ハンマーか鉄球 → ハンマーか鉄球',
    teaser: '氷と打撃の気配がする…',
  },
  {
    id: 'triple',
    name: 'トリプル・スラッシュ',
    seq: [
      ['sword', 'dagger'],
      ['sword', 'dagger'],
      ['greatsword', 'holy_sword'],
    ],
    element: 'physical',
    hint: '剣か短剣 → 剣か短剣 → 大剣か聖剣',
    teaser: '剣が三つ重なる…',
  },
  {
    id: 'whirl',
    name: 'サイクロン・アックス',
    seq: [['axe'], ['axe', 'war_axe'], ['war_axe']],
    element: 'physical',
    hint: '斧 → 斧か大斧 → 大斧',
    teaser: '斧が三つ重なる…',
  },
  {
    id: 'venom',
    name: 'ヴェノム・クロス',
    seq: [['poison_dagger'], ['dagger', 'poison_dagger'], ['vampire_sword']],
    element: 'physical',
    hint: '毒の短剣 → 短剣か毒の短剣 → 吸血の剣',
    teaser: '毒と血の気配がする…',
  },
];

export function getTechnique(id: string): TechniqueDef | undefined {
  return TECHNIQUES.find((t) => t.id === id);
}
