// 装備・起点・消耗品の定義（仕様書 第6章）
import type { ItemDef } from '../core/types';

export const ITEM_DEFS: readonly ItemDef[] = [
  {
    id: 'origin_stone',
    name: '起点石',
    kind: 'origin',
    description:
      '連鎖の始まり。攻撃力なし。レアリティで出口の数が決まる（コモン1・レア2・エピック3・レジェンダリー4）。',
  },

  {
    id: 'sword',
    name: '剣',
    kind: 'attack',
    element: 'physical',
    area: 'single',
    atk: 10,
    description: '基本の単体攻撃。',
  },
  {
    id: 'greatsword',
    name: '大剣',
    kind: 'attack',
    element: 'physical',
    area: 'single',
    atk: 22,
    relayDelay: 0.4,
    description: '強力な単体攻撃。ただし次への伝達に0.4秒かかる。',
  },
  {
    id: 'spear',
    name: '槍',
    kind: 'attack',
    element: 'physical',
    area: 'single',
    atk: 14,
    pierce: 1,
    description: '狙いの後ろの1体にも同じダメージ。',
  },
  {
    id: 'axe',
    name: '斧',
    kind: 'attack',
    element: 'physical',
    area: 'sweep',
    atk: 8,
    description: '交戦範囲の全敵を薙ぎ払う。',
  },
  {
    id: 'hammer',
    name: 'ハンマー',
    kind: 'attack',
    element: 'blunt',
    area: 'single',
    atk: 15,
    description: '打撃。凍結した敵を粉砕（×2.5）。',
  },
  {
    id: 'iron_ball',
    name: '鉄球',
    kind: 'attack',
    element: 'blunt',
    area: 'splash',
    atk: 9,
    description: '打撃の範囲攻撃。凍結した敵を粉砕（×2.5）。',
  },
  {
    id: 'torch',
    name: '松明',
    kind: 'attack',
    element: 'fire',
    area: 'single',
    atk: 6,
    description: '炎。油まみれの敵を爆発させる（×2、範囲に拡大）。',
  },
  {
    id: 'flame_staff',
    name: '炎の杖',
    kind: 'attack',
    element: 'fire',
    area: 'splash',
    atk: 10,
    description: '炎の範囲攻撃。油まみれの敵を爆発させる。',
  },
  {
    id: 'thunder_staff',
    name: '雷の杖',
    kind: 'attack',
    element: 'thunder',
    area: 'single',
    atk: 12,
    description: '雷。濡れた敵を感電させる（×3）。',
  },
  {
    id: 'thunder_bell',
    name: '雷鳴の鈴',
    kind: 'attack',
    element: 'thunder',
    area: 'all',
    atk: 8,
    description: '画面内の全敵に雷（威力×0.4）。濡れた敵を感電させる。',
  },
  {
    id: 'ice_sword',
    name: '氷の剣',
    kind: 'attack',
    element: 'ice',
    area: 'single',
    atk: 8,
    applies: 'frozen',
    description: '狙いを凍結させる。打撃で粉砕できる。',
  },
  {
    id: 'canteen',
    name: '水筒',
    kind: 'attack',
    element: 'water',
    area: 'single',
    atk: 4,
    applies: 'wet',
    description: '狙いを濡らす。雷で感電させられる。状態がついた敵へのダメージ×1.2。',
  },
  {
    id: 'raincloud_staff',
    name: '雨雲の杖',
    kind: 'attack',
    element: 'water',
    area: 'all',
    atk: 2,
    applies: 'wet',
    description: '画面内の全敵を濡らす。状態がついた敵へのダメージ×1.2。',
  },
  {
    id: 'oil_bottle',
    name: '油瓶',
    kind: 'attack',
    element: 'oil',
    area: 'single',
    atk: 3,
    applies: 'oil',
    description: '狙いに油をかける。炎で爆発させられる。状態がついた敵へのダメージ×1.2。',
  },

  {
    id: 'wood_shield',
    name: '木の盾',
    kind: 'defense',
    defense: 8,
    description: '連鎖が通ると、終了時に防御値+8。',
  },
  {
    id: 'chainmail',
    name: '鎖帷子',
    kind: 'defense',
    defense: 12,
    description: '連鎖が通ると、終了時に防御値+12。',
  },
  {
    id: 'dagger',
    name: '短剣',
    kind: 'attack',
    element: 'physical',
    area: 'single',
    atk: 6,
    relayDelay: 0.1,
    description: '軽い一撃。次の装備へすぐ伝わる。',
  },
  {
    id: 'twin_blades',
    name: '双剣',
    kind: 'attack',
    element: 'physical',
    area: 'single',
    atk: 6,
    hits: 2,
    description: '1段で2回斬る。',
  },
  {
    id: 'bow',
    name: '弓',
    kind: 'attack',
    element: 'physical',
    area: 'single',
    atk: 8,
    pierce: 2,
    description: '狙いの後ろ2体まで射抜く。',
  },
  {
    id: 'war_axe',
    name: '大斧',
    kind: 'attack',
    element: 'physical',
    area: 'sweep',
    atk: 12,
    relayDelay: 0.4,
    description: '目の前の敵をまとめて薙ぎ払う重い一撃。次へ伝わるのが遅い。',
  },
  {
    id: 'holy_sword',
    name: '聖剣',
    kind: 'attack',
    element: 'physical',
    area: 'single',
    atk: 14,
    critBonus: 0.2,
    description: '会心が出やすい（会心率+20%）。',
  },
  {
    id: 'thunder_spear',
    name: '雷の槍',
    kind: 'attack',
    element: 'thunder',
    area: 'single',
    atk: 11,
    pierce: 1,
    description: '雷の突き。狙いの後ろ1体にも届く。濡れた敵を感電させる。',
  },
  {
    id: 'frost_staff',
    name: '氷の杖',
    kind: 'attack',
    element: 'ice',
    area: 'splash',
    atk: 6,
    applies: 'frozen',
    description: '狙いの周りをまとめて凍結させる。打撃で粉砕できる。',
  },

  {
    id: 'leather_armor',
    name: '革鎧',
    kind: 'defense',
    defense: 6,
    relayDelay: 0.1,
    description: '連鎖が通ると、終了時に防御値+6。軽く、次へすぐ伝わる。',
  },
  {
    id: 'tower_shield',
    name: '大盾',
    kind: 'defense',
    defense: 26,
    relayDelay: 0.4,
    description: '連鎖が通ると、終了時に防御値+26。重く、次へ伝わるのが遅い。',
  },
  {
    id: 'iron_shield',
    name: '鉄の盾',
    kind: 'defense',
    defense: 18,
    description: '連鎖が通ると、終了時に防御値+18。',
  },

  {
    id: 'rally',
    name: '号令',
    kind: 'consumable',
    effect: 'rally',
    description: 'ATBを即満タンにし、次の起点を今すぐ発火。連鎖中は使えない。',
  },
  {
    id: 'time_stop',
    name: '時止め',
    kind: 'consumable',
    effect: 'timeStop',
    description: '3秒間、敵の行動を止める。',
  },
  {
    id: 'oil_barrel',
    name: '油の大樽',
    kind: 'consumable',
    effect: 'oilAll',
    description: '画面内の全敵に油を付与。',
  },
  {
    id: 'rain_charm',
    name: '雨乞いの符',
    kind: 'consumable',
    effect: 'wetAll',
    description: '画面内の全敵に濡れを付与。',
  },
  {
    id: 'time_sand',
    name: '時の砂',
    kind: 'consumable',
    effect: 'addTime',
    description: '出撃時間を5秒のばす（上限60秒）。',
  },
  {
    id: 'bomb',
    name: '爆弾',
    kind: 'consumable',
    effect: 'bombAll',
    description: '画面内の全敵に60ダメージ（攻撃倍率の強化が乗る）。',
  },
  {
    id: 'lucky_coin',
    name: '幸運の硬貨',
    kind: 'consumable',
    effect: 'critUp',
    description: '8秒間、会心率+30%。',
  },
  { id: 'potion', name: '回復薬', kind: 'consumable', effect: 'heal', description: 'HPを40回復。' },
];

const BY_ID = new Map(ITEM_DEFS.map((d) => [d.id, d]));

export function getItemDef(id: string): ItemDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`unknown item def: ${id}`);
  return def;
}

export function defsOfKind(kind: ItemDef['kind']): ItemDef[] {
  return ITEM_DEFS.filter((d) => d.kind === kind);
}

export const ELEMENT_NAMES: Record<string, string> = {
  physical: '物理',
  blunt: '打撃',
  fire: '炎',
  thunder: '雷',
  ice: '氷',
  water: '水',
  oil: '油',
};

export const AREA_NAMES: Record<string, string> = {
  single: '単体',
  sweep: '薙ぎ払い',
  splash: '範囲',
  all: '全体',
};

export const STATUS_NAMES: Record<string, string> = {
  wet: '濡れ',
  oil: '油',
  frozen: '凍結',
};

export const RARITY_NAMES: Record<string, string> = {
  common: 'コモン',
  rare: 'レア',
  epic: 'エピック',
  legendary: 'レジェンド',
};

// 初期所持品: すべてコモン、出口はすべて「右」
export const STARTER_ITEMS: readonly string[] = [
  'origin_stone',
  'origin_stone',
  'sword',
  'sword',
  'axe',
  'wood_shield',
  'potion',
];
