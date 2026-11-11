// 最初の出撃の「体験ラン」用の配置: 伝説の装備とアーティファクトで組んだ、最終的な姿の一例。
// バックパックは最大（7×5）、起点は2つ。①は上半分、②は下半分を蛇行し、交互に発火する。
// どちらも循環の環（倍率上限×4）を通り、6つの必殺技すべてが出る。
// 装備は借り物（倉庫には入らない）。
import { clampRarity, originRarity } from '../core/loot';
import type { HeroStats } from '../core/combat';
import type { Dir, ItemInstance, Loadout } from '../core/types';
import { BACKPACK, HERO, UPGRADES } from '../config/balance';

const W = BACKPACK.maxWidth;
const H = BACKPACK.maxHeight;

// [x, y, defId, 出口]。出口は、次のマスか、もう通ったマス・枠の外だけを向ける
// （もう一方の連鎖のマスへ漏れないように）
// prettier-ignore
const CELLS: readonly (readonly [number, number, string, Dir[]])[] = [
  // ① 上半分: 右へ → 循環の環で折り返して左へ → 左下へ
  [0, 0, 'origin_stone', ['up', 'right', 'left']], // 出口3つ（エピック）。上と左は枠の外
  [1, 0, 'canteen', ['right']],
  [2, 0, 'thunder_staff', ['right']],
  [3, 0, 'thunder_spear', ['right']],         // トライ・サンダー
  [4, 0, 'sky_hammer', ['right', 'left']],
  [5, 0, 'wind_feather', ['right']],          // 以降の段数を1つ多く数える
  [6, 0, 'ouroboros', ['up', 'right', 'down', 'left']], // 角なので下へだけ。以降の倍率上限×4
  [6, 1, 'oil_bottle', ['left']],
  [5, 1, 'torch', ['left']],
  [4, 1, 'flame_staff', ['left']],            // クリムゾン・バースト
  [3, 1, 'ice_sword', ['left']],
  [2, 1, 'hammer', ['left']],
  [1, 1, 'iron_ball', ['left']],              // フロスト・ブレイカー
  [0, 1, 'sage_stone', ['down', 'right']],    // 濡れ・油・凍結をまとめて付ける
  [0, 2, 'thunder_bell', ['right']],
  [1, 2, 'greatsword', ['right']],
  [2, 2, 'dragon_fang', ['up']],              // 来た方を向けて、ここで終わり
  // ② 下半分: 右へ → 循環の環で上へ → 右の列を上下しながら左へ
  [0, 4, 'origin_stone', ['right', 'down', 'left']], // 出口3つ（エピック）。下と左は枠の外
  [1, 4, 'sword', ['right']],
  [2, 4, 'dagger', ['right']],
  [3, 4, 'holy_sword', ['right']],            // トリプル・スラッシュ
  [4, 4, 'wind_feather', ['right']],
  [5, 4, 'twin_blades', ['right']],
  [6, 4, 'ouroboros', ['up', 'right', 'down', 'left']], // 角なので上へだけ
  [6, 3, 'poison_dagger', ['up']],
  [6, 2, 'dagger', ['left']],
  [5, 2, 'vampire_sword', ['down']],          // ヴェノム・クロス
  [5, 3, 'axe', ['left']],
  [4, 3, 'axe', ['up']],
  [4, 2, 'war_axe', ['left']],                // サイクロン・アックス
  [3, 2, 'aegis_gate', ['down', 'right']],    // 連鎖中も無防備にならない（段数には数えない）
  [3, 3, 'venom_staff', ['left']],
  [2, 3, 'abyss_chalice', ['left', 'down', 'right']],
  [1, 3, 'spear', ['left']],
  [0, 3, 'dragon_fang', ['down']],            // 来た方（起点②）を向けて、ここで終わり
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
    items.set(uid, {
      uid,
      defId,
      // 系統で出せる一番上のレアリティ（松明はレア、短剣はレア など）
      rarity:
        defId === 'origin_stone' ? originRarity(exits.length) : clampRarity(defId, 'legendary'),
      exits: exits.slice(),
      rerollCount: 0,
    });
    cells[y * W + x] = uid;
    if (defId === 'origin_stone') originOrder.push(uid);
  });
  return { loadout: { width: W, height: H, cells, originOrder, consumables: [] }, items };
}
