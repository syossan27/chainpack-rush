// ドロップ、レアリティ、出口の抽選（仕様書 第6章）
import { LOOT, RARITY } from '../config/balance';
import { ITEM_DEFS, getItemDef } from '../data/items';
import type { Rng } from './rng';
import type { Dir, ItemInstance, ItemKind, Rarity } from './types';
import { DIRS, RARITIES } from './types';

/** 周回ごとにコモンの確率を下げ、その分をレア以上へ元の比率で振り分ける */
export function rarityWeights(loop: number, rareOrBetter = false): [Rarity, number][] {
  const shift = Math.min(RARITY.common.baseRate, LOOT.commonShiftPerLoop * Math.max(0, loop - 1));
  const common = rareOrBetter ? 0 : RARITY.common.baseRate - shift;
  const upperBase = 1 - RARITY.common.baseRate;
  const scale = (upperBase + shift) / upperBase;
  return RARITIES.map((r): [Rarity, number] =>
    r === 'common' ? [r, common] : [r, RARITY[r].baseRate * scale],
  );
}

export function rollRarity(rng: Rng, loop: number, rareOrBetter = false): Rarity {
  return rng.weighted(rarityWeights(loop, rareOrBetter));
}

export function rollExits(rng: Rng, rarity: Rarity): Dir[] {
  const count = rng.weighted(RARITY[rarity].exitCounts);
  return rng.sample(DIRS, count);
}

/** 出口の数は変えず、方向だけを振り直す */
export function rerollExits(rng: Rng, exits: readonly Dir[]): Dir[] {
  return rng.sample(DIRS, exits.length);
}

export function rollKind(rng: Rng): ItemKind {
  const w = LOOT.kindWeights;
  return rng.weighted<ItemKind>([
    ['attack', w.attack],
    ['defense', w.defense],
    ['consumable', w.consumable],
    ['origin', w.origin],
  ]);
}

export function createItem(rng: Rng, defId: string, rarity: Rarity, uid: string): ItemInstance {
  const def = getItemDef(defId);
  const exits = def.kind === 'consumable' ? [] : rollExits(rng, rarity);
  return {
    uid,
    defId,
    rarity: def.kind === 'consumable' ? 'common' : rarity,
    exits,
    rerollCount: 0,
  };
}

export function rollLoot(rng: Rng, loop: number, uid: string, rareOrBetter = false): ItemInstance {
  let kind = rollKind(rng);
  // 消耗品にはレアリティがないので、レア以上確定のときは装備から選ぶ
  if (rareOrBetter && kind === 'consumable') kind = 'attack';
  const defs = ITEM_DEFS.filter((d) => d.kind === kind);
  const def = rng.pick(defs);
  const rarity = rollRarity(rng, loop, rareOrBetter);
  return createItem(rng, def.id, rarity, uid);
}
