// ドロップ、レアリティ、出口の抽選（仕様書 第6章）
import { LOOT, RARITY } from '../config/balance';
import { ITEM_DEFS, getItemDef } from '../data/items';
import type { Rng } from './rng';
import { rollAffixes } from './affixes';
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

/** 起点石の出口の数に対応するレアリティ */
export function originRarity(exitCount: number): Rarity {
  const n = Math.max(1, Math.min(4, exitCount));
  return RARITIES.find((r) => LOOT.originExits[r] === n) ?? 'common';
}

/** minExits 未満の数は抽選から外し、残りの確率の比はそのまま */
export function rollExits(rng: Rng, rarity: Rarity, minExits = 0): Dir[] {
  const counts = RARITY[rarity].exitCounts.filter(([n]) => n >= minExits);
  const count = rng.weighted(counts.length > 0 ? counts : RARITY[rarity].exitCounts);
  return rng.sample(DIRS, Math.max(count, minExits));
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
  // アーティファクト: 常にレジェンダリー、出口は決まった形で出る（向きは鍛冶屋で変えられる）、追加効果なし
  if (def.artifact)
    return { uid, defId, rarity: 'legendary', exits: def.artifact.exits.slice(), rerollCount: 0 };
  const exits =
    def.kind === 'consumable'
      ? []
      : def.kind === 'origin'
        ? rng.sample(DIRS, LOOT.originExits[rarity])
        : rollExits(rng, rarity);
  const r = def.kind === 'consumable' ? 'common' : rarity;
  const affixes = def.kind === 'consumable' ? [] : rollAffixes(rng, def, r);
  return {
    uid,
    defId,
    rarity: r,
    exits,
    rerollCount: 0,
    ...(affixes.length > 0 ? { affixes } : {}),
  };
}

export const ARTIFACT_DEFS = ITEM_DEFS.filter((d) => d.artifact);

export function rollLoot(rng: Rng, loop: number, uid: string, rareOrBetter = false): ItemInstance {
  // ごくまれにアーティファクト
  const artifactChance = rareOrBetter ? LOOT.artifactChanceRare : LOOT.artifactChance;
  if (rng.next() < artifactChance)
    return createItem(rng, rng.pick(ARTIFACT_DEFS).id, 'legendary', uid);
  let kind = rollKind(rng);
  // 消耗品にはレアリティがないので、レア以上確定のときは装備から選ぶ
  if (rareOrBetter && kind === 'consumable') kind = 'attack';
  const defs = ITEM_DEFS.filter((d) => d.kind === kind && !d.artifact);
  const def = rng.pick(defs);
  const rarity = rollRarity(rng, loop, rareOrBetter);
  return createItem(rng, def.id, rarity, uid);
}
