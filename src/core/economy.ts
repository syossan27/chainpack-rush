// 売却、付け直し、永続強化、戦利品の受け取り（仕様書 第7章）
import {
  SYNTH,
  BACKPACK,
  CONSUMABLE,
  ECONOMY,
  HERO,
  LOOT,
  PROGRESS,
  RARITY,
  SIM,
  STORAGE,
  TIME_BONUS,
  UPGRADES,
  type UpgradeId,
} from '../config/balance';
import { getItemDef } from '../data/items';
import { REGIONS } from '../data/regions';
import type { HeroStats, RunResult } from './combat';
import { resizeLoadout } from './loadout';
import { createItem, rerollExits } from './loot';
import type { Rng } from './rng';
import type { SaveData } from './save';
import type { Dir, ItemInstance, Rarity } from './types';

export function heroStats(save: SaveData): HeroStats {
  const u = save.upgrades;
  return {
    maxHp: HERO.maxHp + UPGRADES.maxHp.effect * u.maxHp,
    atbTime: Math.max(HERO.minAtbTime, HERO.atbTime - UPGRADES.atb.effect * u.atb),
    attackMult: 1 + UPGRADES.attack.effect * u.attack,
    runTime: Math.min(TIME_BONUS.maxRunTime, SIM.runDuration + UPGRADES.runTime.effect * u.runTime),
  };
}

/** バックパック拡張: 列→行→列…と交互に広げる */
export function backpackSize(level: number): { width: number; height: number } {
  let width: number = BACKPACK.baseWidth;
  let height: number = BACKPACK.baseHeight;
  for (let i = 0; i < level; i++) {
    if (i % 2 === 0 && width < BACKPACK.maxWidth) width++;
    else if (height < BACKPACK.maxHeight) height++;
    else if (width < BACKPACK.maxWidth) width++;
  }
  return { width, height };
}

export function consumableSlots(save: SaveData): number {
  return CONSUMABLE.baseSlots + UPGRADES.consumableSlots.effect * save.upgrades.consumableSlots;
}

export function storageCapacity(save: SaveData): number {
  return STORAGE.baseCapacity + UPGRADES.storage.effect * save.upgrades.storage;
}

export function upgradeCost(id: UpgradeId, level: number): number | null {
  const def = UPGRADES[id];
  if (level >= def.maxLevel) return null;
  return Math.round(def.baseCost * Math.pow(def.growth, level));
}

export function buyUpgrade(save: SaveData, id: UpgradeId): boolean {
  const cost = upgradeCost(id, save.upgrades[id]);
  if (cost === null || save.gold < cost) return false;
  save.gold -= cost;
  save.upgrades[id]++;
  if (id === 'backpack') {
    const { width, height } = backpackSize(save.upgrades.backpack);
    save.loadout = resizeLoadout(save.loadout, width, height);
  }
  return true;
}

/** ロックの切り替え。消耗品はロックしない */
export function toggleLock(save: SaveData, uid: string): boolean {
  const it = save.inventory.find((i) => i.uid === uid);
  if (!it || getItemDef(it.defId).kind === 'consumable') return false;
  if (it.locked) delete it.locked;
  else it.locked = true;
  return true;
}

export function sellPrice(item: ItemInstance): number {
  const def = getItemDef(item.defId);
  if (def.kind === 'consumable') return LOOT.consumableSell;
  if (def.artifact) return LOOT.artifactSell;
  return RARITY[item.rarity].sell;
}

/** 装備中（バックパック・消耗品枠）のアイテム */
export function equippedUids(save: SaveData): Set<string> {
  const s = new Set<string>();
  for (const c of save.loadout.cells) if (c) s.add(c);
  for (const c of save.loadout.consumables) s.add(c);
  return s;
}

/** 倉庫に入っている数（装備中は数えない） */
export function storageCount(save: SaveData): number {
  const eq = equippedUids(save);
  return save.inventory.filter((i) => !eq.has(i.uid)).length;
}

/** 売る。ロック中のものは渡されても売らない */
export function sellItems(save: SaveData, uids: readonly string[]): number {
  const locked = new Set(save.inventory.filter((i) => i.locked).map((i) => i.uid));
  const set = new Set(uids.filter((u) => !locked.has(u)));
  let total = 0;
  save.inventory = save.inventory.filter((it) => {
    if (!set.has(it.uid)) return true;
    total += sellPrice(it);
    return false;
  });
  save.loadout.cells = save.loadout.cells.map((c) => (c && set.has(c) ? null : c));
  save.loadout.originOrder = save.loadout.originOrder.filter((u) => !set.has(u));
  save.loadout.consumables = save.loadout.consumables.filter((u) => !set.has(u));
  save.gold += total;
  return total;
}

/**
 * 倉庫があふれたときに売る候補: 装備中でないものを、安い順（コモン→…、消耗品は後回し）に、
 * ちょうど容量に収まる数だけ選ぶ。
 */
export function overflowSellPlan(save: SaveData): { uids: string[]; gold: number } {
  const over = storageCount(save) - storageCapacity(save);
  if (over <= 0) return { uids: [], gold: 0 };
  const eq = equippedUids(save);
  const picks = save.inventory
    .filter((i) => !eq.has(i.uid) && !i.locked)
    .map((i) => ({ i, consumable: getItemDef(i.defId).kind === 'consumable' ? 1 : 0 }))
    .sort((a, b) => a.consumable - b.consumable || sellPrice(a.i) - sellPrice(b.i))
    .slice(0, over)
    .map((x) => x.i);
  return { uids: picks.map((i) => i.uid), gold: picks.reduce((s, i) => s + sellPrice(i), 0) };
}

export type RerollMode = 'reroll' | 'specify';

export function rerollCost(item: ItemInstance, mode: RerollMode): number {
  const first = getItemDef(item.defId).artifact
    ? ECONOMY.artifactReroll
    : RARITY[item.rarity].reroll;
  const base = first * Math.pow(ECONOMY.rerollCostGrowth, item.rerollCount);
  return Math.round(base * (mode === 'specify' ? ECONOMY.specifyCostMult : 1));
}

export function canReorient(item: ItemInstance): boolean {
  const def = getItemDef(item.defId);
  return def.kind !== 'consumable' && item.exits.length > 0 && item.exits.length < 4;
}

export function rerollItem(save: SaveData, uid: string, rng: Rng): boolean {
  const it = save.inventory.find((i) => i.uid === uid);
  if (!it || !canReorient(it)) return false;
  const cost = rerollCost(it, 'reroll');
  if (save.gold < cost) return false;
  save.gold -= cost;
  it.exits = rerollExits(rng, it.exits);
  it.rerollCount++;
  return true;
}

export function specifyExits(save: SaveData, uid: string, exits: readonly Dir[]): boolean {
  const it = save.inventory.find((i) => i.uid === uid);
  if (!it || !canReorient(it)) return false;
  const uniq = Array.from(new Set(exits));
  if (uniq.length !== it.exits.length) return false;
  const cost = rerollCost(it, 'specify');
  if (save.gold < cost) return false;
  save.gold -= cost;
  it.exits = uniq;
  it.rerollCount++;
  return true;
}

/** ラン中に使った消耗品を倉庫と消耗品枠から取り除く */
export function consumeItems(save: SaveData, uids: readonly string[]): void {
  const set = new Set(uids);
  save.inventory = save.inventory.filter((it) => !set.has(it.uid));
  save.loadout.consumables = save.loadout.consumables.filter((u) => !set.has(u));
}

/** 戦利品を倉庫へ（容量を超えても全部受け取る）。正式な uid を振り直す */
const NEXT_RARITY: Partial<Record<Rarity, Rarity>> = {
  common: 'rare',
  rare: 'epic',
  epic: 'legendary',
};

export interface SynthPlan {
  /** 使う3つ（選んだ装備を含む） */
  uids: string[];
  /** 揃っている数（選んだ装備を含む） */
  have: number;
  to: Rarity | null;
  cost: number;
  /** 合成できないとき、その理由 */
  reason: string | null;
}

/**
 * 合成の計画: 選んだ装備と、同じ装備・同じレアリティで装備中でもロック中でもないものを3つ使う。
 * 一緒に使う2つは、追加効果が少なく付け直し回数の少ないものから選ぶ。
 */
export function synthPlan(save: SaveData, uid: string): SynthPlan {
  const it = save.inventory.find((i) => i.uid === uid);
  const none = (reason: string): SynthPlan => ({ uids: [], have: 0, to: null, cost: 0, reason });
  if (!it) return none('見つかりません');
  const def = getItemDef(it.defId);
  const to = NEXT_RARITY[it.rarity] ?? null;
  if (def.kind === 'consumable') return none('消耗品は合成できません');
  if (def.artifact || !to) return none('これ以上のレアリティはありません');
  const eq = equippedUids(save);
  const cost = SYNTH.cost[it.rarity as 'common' | 'rare' | 'epic'];
  if (eq.has(uid) || it.locked)
    return {
      uids: [],
      have: 0,
      to,
      cost,
      reason: eq.has(uid) ? '装備中は合成に使えません（外してから）' : 'ロック中は合成に使えません',
    };
  const mates = save.inventory
    .filter(
      (i) =>
        i.uid !== uid &&
        i.defId === it.defId &&
        i.rarity === it.rarity &&
        !i.locked &&
        !eq.has(i.uid),
    )
    .sort(
      (a, b) =>
        (a.affixes?.length ?? 0) - (b.affixes?.length ?? 0) || a.rerollCount - b.rerollCount,
    );
  const uids = [uid, ...mates.slice(0, SYNTH.count - 1).map((i) => i.uid)];
  const reason =
    uids.length < SYNTH.count
      ? `同じ装備があと${SYNTH.count - uids.length}つ必要`
      : save.gold < cost
        ? `${cost}G 必要`
        : null;
  return { uids, have: uids.length, to, cost, reason };
}

/** 合成する。できたら新しい装備を返す */
export function synthesize(save: SaveData, uid: string, rng: Rng): ItemInstance | null {
  const plan = synthPlan(save, uid);
  if (plan.reason || !plan.to) return null;
  const base = save.inventory.find((i) => i.uid === uid)!;
  const used = new Set(plan.uids);
  save.inventory = save.inventory.filter((i) => !used.has(i.uid));
  save.gold -= plan.cost;
  const made = createItem(rng, base.defId, plan.to, `i${save.nextUid++}`);
  save.inventory.push(made);
  return made;
}

export function acceptLoot(save: SaveData, drops: readonly ItemInstance[]): ItemInstance[] {
  const added = drops.map((d) => ({ ...d, exits: d.exits.slice(), uid: `i${save.nextUid++}` }));
  save.inventory.push(...added);
  return added;
}

export function recordRun(
  save: SaveData,
  regionId: string,
  result: RunResult,
): { unlocked: string | null } {
  save.stats.runs++;
  save.stats.maxStep = Math.max(save.stats.maxStep, result.stats.maxStep);
  save.stats.maxDamage = Math.max(save.stats.maxDamage, Math.round(result.stats.maxDamage));
  save.progress.best[regionId] = Math.max(save.progress.best[regionId] ?? 0, result.reachedLoop);
  let unlocked: string | null = null;
  if (result.stats.bossesDefeated >= PROGRESS.unlockLoop) {
    const idx = REGIONS.findIndex((r) => r.id === regionId);
    const next = REGIONS[idx + 1];
    if (next && !save.progress.unlocked.includes(next.id)) {
      save.progress.unlocked.push(next.id);
      unlocked = next.id;
    }
  }
  return { unlocked };
}

export type SortieBlock = 'noOrigin' | 'storageFull' | null;

export function sortieBlock(save: SaveData): SortieBlock {
  if (!save.loadout.originOrder.some((u) => save.loadout.cells.includes(u))) return 'noOrigin';
  if (storageCount(save) > storageCapacity(save)) return 'storageFull';
  return null;
}

export function itemMap(save: SaveData): Map<string, ItemInstance> {
  return new Map(save.inventory.map((i) => [i.uid, i]));
}
