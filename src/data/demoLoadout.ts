// Loadout for the first sortie ("demo run"): an example of the end-game look with legendary gear.
// The standard stacked board (4×3) with one origin: the chain snakes through every cell. A
// technique is judged on the tops of three cells in a row, so three of them fit, then the finish.
// A wave often falls before a long chain ends, so the techniques come first (by step 11) and the
// big stacks after them.
// The gear is borrowed (never enters storage).
import { clampRarity, originRarity } from '../core/loot';
import type { HeroStats } from '../core/combat';
import type { Dir, ItemInstance, Loadout } from '../core/types';
import { HERO, UPGRADES } from '../config/balance';
import { emptyStackBoard, stackPut } from '../core/stack';

// [cell, defId, count, exits]: cells of the 4-wide board, the stack's item and size, the top's
// exits. The route: row 0 → right, row 1 ← left, row 2 → right
// prettier-ignore
const STACKS: readonly (readonly [number, string, number, Dir[]])[] = [
  [0, 'origin_stone', 1, ['up', 'right', 'left']], // 3 exits (epic); up and left are off the grid
  [1, 'canteen', 1, ['right']],
  [2, 'thunder_spear', 1, ['right']],
  [3, 'thunder_staff', 2, ['down']],                // トライ・サンダー
  [7, 'oil_bottle', 1, ['left']],
  [6, 'flame_staff', 1, ['left']],
  [5, 'flame_staff', 2, ['left']],                  // クリムゾン・バースト
  [4, 'sword', 1, ['down']],
  [8, 'sword', 1, ['right']],
  [9, 'holy_sword', 1, ['right']],                  // トリプル・スラッシュ
  [10, 'war_axe', 3, ['right']],
  [11, 'dragon_fang', 1, ['right', 'down']],        // artifact finish (rings 3 times); exits leave
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
  let loadout = emptyStackBoard('standard');
  let n = 0;
  for (const [cell, defId, count, exits] of STACKS) {
    for (let k = 0; k < count; k++) {
      const uid = `demo_${n++}`;
      items.set(uid, {
        uid,
        defId,
        // 系統で出せる一番上のレアリティ（松明はレア、短剣はレア など）
        rarity:
          defId === 'origin_stone' ? originRarity(exits.length) : clampRarity(defId, 'legendary'),
        exits: exits.slice(),
        rerollCount: 0,
      });
      const r = stackPut(loadout, items, uid, cell);
      if (r.block) throw new Error(`demo stack ${defId} on ${cell}: ${r.block}`);
      loadout = r.loadout;
    }
  }
  return { loadout: { ...loadout, consumables: [] }, items };
}
