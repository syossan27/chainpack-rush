// ドロップ、レアリティ、出口の抽選（仕様書 第6章）
import { LOOT, RARITY } from '../config/balance';
import { ITEM_DEFS, getItemDef } from '../data/items';
import type { Rng } from './rng';
import type { Dir, ItemDef, ItemInstance, ItemKind, Rarity, RarityWeights } from './types';
import { DIRS, RARITIES } from './types';

/**
 * The region's rarity weights (its boss table for bosses, golden elites and the goblin), with each
 * loop past the first moving LOOT.commonShiftPerLoop of common up to the region's other rarities in
 * their proportions. A rarity the region never drops (weight 0) stays out, so early regions have a
 * ceiling. Below `floor` is cut; if nothing is left, the floor rarity itself
 */
export function rarityWeights(
  loop: number,
  rareOrBetter = false,
  region: Pick<RegionLoot, 'rarity' | 'bossRarity'> = DEFAULT_LOOT,
  /** Nothing below this rarity */
  floor: Rarity = 'common',
): [Rarity, number][] {
  const base = rareOrBetter ? region.bossRarity : region.rarity;
  const total = base.reduce((a, b) => a + b, 0);
  const w = base.map((x) => x / total);
  const shift = Math.min(w[0]!, LOOT.commonShiftPerLoop * Math.max(0, loop - 1));
  const upper = 1 - w[0]!;
  const scale = upper > 0 ? (upper + shift) / upper : 1;
  const below = RARITIES.indexOf(floor);
  const out = RARITIES.map((r, i): [Rarity, number] =>
    i < below ? [r, 0] : [r, i === 0 ? w[0]! - shift : w[i]! * scale],
  );
  if (out.every(([, x]) => x <= 0))
    return RARITIES.map((r): [Rarity, number] => [r, r === floor ? 1 : 0]);
  return out;
}

export function rollRarity(
  rng: Rng,
  loop: number,
  rareOrBetter = false,
  region: Pick<RegionLoot, 'rarity' | 'bossRarity'> = DEFAULT_LOOT,
  floor: Rarity = 'common',
): Rarity {
  return rng.weighted(rarityWeights(loop, rareOrBetter, region, floor));
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

/**
 * 候補から1つ選ぶ。起点石は種類が増えても合わせて1つ分の重みで、そのうち plainOriginShare が
 * ふつうの起点石（ほかの装備の出やすさは種類を足す前と同じ）
 */
export function pickDef(rng: Rng, defs: readonly ItemDef[]): ItemDef {
  const typed = defs.filter((d) => d.kind === 'origin' && d.line).length;
  const plain = defs.some((d) => d.kind === 'origin' && !d.line);
  const weight = (d: ItemDef): number => {
    if (d.kind !== 'origin' || typed === 0) return 1;
    if (!plain) return 1 / typed;
    return d.line ? (1 - LOOT.plainOriginShare) / typed : LOOT.plainOriginShare;
  };
  return rng.weighted(defs.map((d) => [d, weight(d)] as const));
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
  return {
    uid,
    defId,
    rarity: r,
    exits,
    rerollCount: 0,
  };
}

export const ARTIFACT_DEFS = ITEM_DEFS.filter((d) => d.artifact);

/** 地域ごとの戦利品（奥の地域ほど上のレアリティ・アーティファクトが出やすい） */
export interface RegionLoot {
  /** Rarity weights of a drop here (a 0 is a rarity this region never drops) */
  rarity: RarityWeights;
  /** ...for bosses, golden elites and the treasure goblin (no common) */
  bossRarity: RarityWeights;
  /** Every ordinary enemy's dropRate × this here (bosses always drop) */
  dropMult: number;
  artifactMult: number;
}

/** Where no region is given (tests, tools) */
export const DEFAULT_LOOT: RegionLoot = {
  rarity: LOOT.baseRarity,
  bossRarity: LOOT.baseBossRarity,
  dropMult: 1,
  artifactMult: 1,
};

export function rollLoot(
  rng: Rng,
  loop: number,
  uid: string,
  rareOrBetter = false,
  region: RegionLoot = DEFAULT_LOOT,
  /** Never a consumable (the first own run's promised drop goes into the backpack) */
  equipOnly = false,
  /** Nothing below this rarity (trial: the treasure goblin's first drop) */
  floor: Rarity = 'common',
  /** Artifacts the player already has (one of each type): they never drop again */
  ownedArtifacts?: ReadonlySet<string>,
): ItemInstance {
  // ごくまれにアーティファクト（持っていない種類から。全部持っていれば、ふつうの戦利品）
  const artifactChance =
    (rareOrBetter ? LOOT.artifactChanceRare : LOOT.artifactChance) * region.artifactMult;
  if (rng.next() < artifactChance) {
    const open = ARTIFACT_DEFS.filter((d) => !ownedArtifacts?.has(d.id));
    if (open.length > 0) return createItem(rng, rng.pick(open).id, 'legendary', uid);
  }
  let kind = rollKind(rng);
  // 消耗品にはレアリティがないので、レア以上確定のときは装備から選ぶ
  if ((rareOrBetter || equipOnly) && kind === 'consumable') kind = 'attack';
  // レアリティを先に決め、そのレアリティで出る装備から選ぶ（系統）
  const rarity = rollRarity(rng, loop, rareOrBetter, region, floor);
  const defs = ITEM_DEFS.filter(
    (d) => d.kind === kind && !d.artifact && (kind === 'consumable' || allowsRarity(d.id, rarity)),
  );
  const def = pickDef(rng, defs);
  return createItem(rng, def.id, rarity, uid);
}
