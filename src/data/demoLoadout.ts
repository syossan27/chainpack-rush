// 最初の出撃の「体験ラン」用の配置: 伝説の装備とアーティファクトで組んだ、最終的な姿の一例。
// 草原 → 起点から1本の長い連鎖が蛇行し、5つの必殺技すべてと循環の環（倍率上限×4）を通る。
// 装備は借り物（倉庫には入らない）。
import { clampRarity, originRarity } from '../core/loot';
import { getItemDef } from './items';
import type { HeroStats } from '../core/combat';
import type { Dir, ItemInstance, Loadout } from '../core/types';
import { HERO, UPGRADES } from '../config/balance';

const W = 5;
const H = 4;

// [x, y, defId, 出口]（出口が null ならアーティファクトの決まった出口）
// prettier-ignore
const CELLS: readonly (readonly [number, number, string, Dir[] | null])[] = [
  [0, 0, 'origin_stone', ['right']],
  [1, 0, 'oil_bottle', ['right']],
  [2, 0, 'torch', ['right']],
  [3, 0, 'flame_staff', ['right']],       // クリムゾン・バースト
  [4, 0, 'ouroboros', null],              // 四方 → 下へ。以降の倍率上限×4
  [4, 1, 'canteen', ['left']],
  [3, 1, 'thunder_staff', ['left']],
  [2, 1, 'thunder_spear', ['left']],      // トライ・サンダー
  [1, 1, 'sky_hammer', null],             // 左右 → 左へ
  [0, 1, 'ice_sword', ['down']],
  [0, 2, 'hammer', ['right']],
  [1, 2, 'iron_ball', ['right']],         // フロスト・ブレイカー
  [2, 2, 'sword', ['right']],
  [3, 2, 'dagger', ['right']],
  [4, 2, 'holy_sword', ['down']],         // トリプル・スラッシュ
  [4, 3, 'axe', ['left']],
  [3, 3, 'axe', ['left']],
  [2, 3, 'war_axe', ['left']],            // サイクロン・アックス
  [1, 3, 'dragon_fang', null],            // 右（来た方）→ ここで終わり
  [0, 3, 'aegis_gate', null],             // 置いてあるだけで、連鎖中も無防備にならない
];

export const DEMO_REGION = 'grassland';

/** 体験ランの勇者: 強化しきった姿。時間は短め（延長なし） */
export const DEMO_HERO: HeroStats = {
  maxHp: HERO.maxHp + UPGRADES.maxHp.effect * UPGRADES.maxHp.maxLevel,
  atbTime: Math.max(HERO.minAtbTime, HERO.atbTime - UPGRADES.atb.effect * UPGRADES.atb.maxLevel),
  attackMult: 1 + UPGRADES.attack.effect * UPGRADES.attack.maxLevel,
  runTime: 20,
};

export function demoLoadout(): { loadout: Loadout; items: Map<string, ItemInstance> } {
  const items = new Map<string, ItemInstance>();
  const cells: (string | null)[] = new Array<string | null>(W * H).fill(null);
  const originOrder: string[] = [];
  CELLS.forEach(([x, y, defId, exits], i) => {
    const uid = `demo_${i}`;
    const fixed = exits ?? getItemDef(defId).artifact!.exits.slice();
    items.set(uid, {
      uid,
      defId,
      // 系統で出せる一番上のレアリティ（松明はレア、短剣はレア など）
      rarity:
        defId === 'origin_stone' ? originRarity(fixed.length) : clampRarity(defId, 'legendary'),
      exits: fixed,
      rerollCount: 0,
    });
    cells[y * W + x] = uid;
    if (defId === 'origin_stone') originOrder.push(uid);
  });
  return { loadout: { width: W, height: H, cells, originOrder, consumables: [] }, items };
}
