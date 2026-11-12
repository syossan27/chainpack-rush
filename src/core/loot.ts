// ドロップ、レアリティ、出口の抽選（仕様書 第6章）
import { LOOT, RARITY } from '../config/balance';
import { ITEM_DEFS, getItemDef } from '../data/items';
import type { Rng } from './rng';
import { rollAffixes } from './affixes';
import type { Dir, ItemInstance, ItemKind, Rarity } from './types';
import { DIRS, RARITIES } from './types';

/** 周回ごとにコモンの確率を下げ、その分をレア以上へ元の比率で振り分ける */
export function rarityWeights(
  loop: number,
  rareOrBetter = false,
  regionShift = 0,
): [Rarity, number][] {
  const shift = Math.min(
    RARITY.common.baseRate,
    LOOT.commonShiftPerLoop * Math.max(0, loop - 1) + regionShift,
  );
  const common = rareOrBetter ? 0 : RARITY.common.baseRate - shift;
  const upperBase = 1 - RARITY.common.baseRate;
  const scale = (upperBase + shift) / upperBase;
  return RARITIES.map((r): [Rarity, number] =>
    r === 'common' ? [r, common] : [r, RARITY[r].baseRate * scale],
  );
}

export function rollRarity(rng: Rng, loop: number, rareOrBetter = false, regionShift = 0): Rarity {
  return rng.weighted(rarityWeights(loop, rareOrBetter, regionShift));
}

// ---- 系統（装備ごとに出るレアリティの幅。革鎧はコモン〜レア、鋼の鎧はエピック〜レジェンダリー など） ----

const RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** その装備がこのレアリティで出るか */
export function allowsRarity(defId: string, r: Rarity): boolean {
  const d = getItemDef(defId);
  if (!d.rarities) return true;
  return RANK[r] >= RANK[d.rarities[0]] && RANK[r] <= RANK[d.rarities[1]];
}

/** このレアリティで出せる、系統の装備（自分 → 上位 → … の順に探す。上がない・下すぎるときは前の装備） */
export function lineItemFor(defId: string, r: Rarity): string | null {
  let id: string | undefined = defId;
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    if (allowsRarity(id, r)) return id;
    const d = getItemDef(id);
    // 下限より下なら、系統の前の装備へ
    if (d.rarities && RANK[r] < RANK[d.rarities[0]]) {
      const prev = ITEM_DEFS.find((x) => x.next === id);
      id = prev?.id;
    } else id = d.next;
  }
  return null;
}

/** 幅の外のレアリティを、幅の端に寄せる（体験ランの見本など） */
export function clampRarity(defId: string, r: Rarity): Rarity {
  const d = getItemDef(defId);
  if (!d.rarities) return r;
  const [lo, hi] = d.rarities;
  return RANK[r] < RANK[lo] ? lo : RANK[r] > RANK[hi] ? hi : r;
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

/** 地域ごとの戦利品の上乗せ（奥の地域ほどレア以上・アーティファクトが出やすい） */
export interface RegionLoot {
  rarityShift: number;
  artifactMult: number;
}

export function rollLoot(
  rng: Rng,
  loop: number,
  uid: string,
  rareOrBetter = false,
  region: RegionLoot = { rarityShift: 0, artifactMult: 1 },
  /** Never a consumable (the first own run's promised drop goes into the backpack) */
  equipOnly = false,
): ItemInstance {
  // ごくまれにアーティファクト
  const artifactChance =
    (rareOrBetter ? LOOT.artifactChanceRare : LOOT.artifactChance) * region.artifactMult;
  if (rng.next() < artifactChance)
    return createItem(rng, rng.pick(ARTIFACT_DEFS).id, 'legendary', uid);
  let kind = rollKind(rng);
  // 消耗品にはレアリティがないので、レア以上確定のときは装備から選ぶ
  if ((rareOrBetter || equipOnly) && kind === 'consumable') kind = 'attack';
  // レアリティを先に決め、そのレアリティで出る装備から選ぶ（系統）
  const rarity = rollRarity(rng, loop, rareOrBetter, region.rarityShift);
  const defs = ITEM_DEFS.filter(
    (d) => d.kind === kind && !d.artifact && (kind === 'consumable' || allowsRarity(d.id, rarity)),
  );
  const def = rng.pick(defs);
  return createItem(rng, def.id, rarity, uid);
}
