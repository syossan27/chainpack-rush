// Loadout for the first sortie ("demo run"): an example of the end-game look with legendary gear and artifacts.
// Max backpack (7x5) with two origins: ① snakes through the top half, ② through the bottom half, firing alternately.
// Both pass an ouroboros (mult cap x4), and all six techniques appear.
// The gear is borrowed (never enters storage).
import { clampRarity, originRarity } from '../core/loot';
import type { HeroStats } from '../core/combat';
import type { Dir, ItemInstance, Loadout } from '../core/types';
import { BACKPACK, HERO, UPGRADES } from '../config/balance';

const W = BACKPACK.maxWidth;
const H = BACKPACK.maxHeight;

// [x, y, defId, exits]. Exits point only to the next cell, an already visited cell, or off the grid
// (so neither chain leaks into the other one's cells)
// prettier-ignore
const CELLS: readonly (readonly [number, number, string, Dir[]])[] = [
  // ① top half: right → turn at the ouroboros → left → down-left
  [0, 0, 'origin_stone', ['up', 'right', 'left']], // 3 exits (epic); up and left are off the grid
  [1, 0, 'canteen', ['right']],
  [2, 0, 'thunder_staff', ['right']],
  [3, 0, 'thunder_spear', ['right']],         // トライ・サンダー
  [4, 0, 'sky_hammer', ['right', 'left']],
  [5, 0, 'wind_feather', ['right']],          // counts the following steps one higher
  [6, 0, 'ouroboros', ['up', 'right', 'down', 'left']], // corner: only down continues; cap x4 from here
  [6, 1, 'oil_bottle', ['left']],
  [5, 1, 'torch', ['left']],
  [4, 1, 'flame_staff', ['left']],            // クリムゾン・バースト
  [3, 1, 'ice_sword', ['left']],
  [2, 1, 'hammer', ['left']],
  [1, 1, 'iron_ball', ['left']],              // フロスト・ブレイカー
  [0, 1, 'sage_stone', ['down', 'right']],    // applies wet, oil and frozen at once
  [0, 2, 'thunder_bell', ['right']],
  [1, 2, 'greatsword', ['right']],
  [2, 2, 'dragon_fang', ['up']],              // points back to where it came from: chain ends here
  // ② bottom half: right → up at the ouroboros → zigzag through the right columns → left
  [0, 4, 'origin_stone', ['right', 'down', 'left']], // 3 exits (epic); down and left are off the grid
  [1, 4, 'sword', ['right']],
  [2, 4, 'dagger', ['right']],
  [3, 4, 'holy_sword', ['right']],            // トリプル・スラッシュ
  [4, 4, 'wind_feather', ['right']],
  [5, 4, 'twin_blades', ['right']],
  [6, 4, 'ouroboros', ['up', 'right', 'down', 'left']], // corner: only up continues
  [6, 3, 'poison_dagger', ['up']],
  [6, 2, 'dagger', ['left']],
  [5, 2, 'vampire_sword', ['down']],          // ヴェノム・クロス
  [5, 3, 'axe', ['left']],
  [4, 3, 'axe', ['up']],
  [4, 2, 'war_axe', ['left']],                // サイクロン・アックス
  [3, 2, 'aegis_gate', ['down', 'right']],    // never defenseless mid-chain (not counted as a step)
  [3, 3, 'venom_staff', ['left']],
  [2, 3, 'abyss_chalice', ['left', 'down', 'right']],
  [1, 3, 'spear', ['left']],
  [0, 3, 'dragon_fang', ['down']],            // points back to origin ②: chain ends here
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
