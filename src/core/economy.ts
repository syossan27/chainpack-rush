// 売却、付け直し、永続強化、戦利品の受け取り（仕様書 第7章）
import {
  MONETIZE,
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
import { ITEM_DEFS, getItemDef } from '../data/items';
import { REGIONS } from '../data/regions';
import type { HeroStats, RunResult } from './combat';
import { resizeLoadout } from './loadout';
import { createItem, rerollExits, rollLoot } from './loot';
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

/** ほかの編成（今の編成以外）で使っている装備 → 使っている編成の番号（0始まり） */
export function otherPresetUse(save: SaveData): Map<string, number[]> {
  const out = new Map<string, number[]>();
  save.presets.forEach((p, i) => {
    if (i === save.activePreset || !p.loadout) return;
    for (const u of [...p.loadout.cells, ...p.loadout.consumables]) {
      if (!u) continue;
      const list = out.get(u) ?? [];
      if (!list.includes(i)) list.push(i);
      out.set(u, list);
    }
  });
  return out;
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
  const inPresets = otherPresetUse(save);
  const picks = save.inventory
    .filter((i) => !eq.has(i.uid) && !i.locked && !inPresets.has(i.uid))
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

/** free: 広告の報酬で付け直す（お金を払わず、付け直し回数＝次の料金も増やさない） */
export function rerollItem(save: SaveData, uid: string, rng: Rng, free = false): boolean {
  const it = save.inventory.find((i) => i.uid === uid);
  if (!it || !canReorient(it)) return false;
  if (!free) {
    const cost = rerollCost(it, 'reroll');
    if (save.gold < cost) return false;
    save.gold -= cost;
  }
  it.exits = rerollExits(rng, it.exits);
  if (!free) it.rerollCount++;
  return true;
}

// ---- 報酬つき広告の回数 ----

export type AdPlacement = 'extraLoot' | 'smithReroll';

function todayKey(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** 今日あと何回受け取れるか */
export function adRemaining(save: SaveData, p: AdPlacement, now = new Date()): number {
  const used = save.adLog.date === todayKey(now) ? (save.adLog.counts[p] ?? 0) : 0;
  return Math.max(0, MONETIZE.dailyCaps[p] - used);
}

/** 受け取った回数を数える */
export function recordAd(save: SaveData, p: AdPlacement, now = new Date()): void {
  const key = todayKey(now);
  if (save.adLog.date !== key) save.adLog = { date: key, counts: {} };
  save.adLog.counts[p] = (save.adLog.counts[p] ?? 0) + 1;
}

/** 「戦利品をもう1回」: 今回の戦利品と同じくらいの数を、同じ地域・周回で抽選し直して受け取る */
export function rollExtraLoot(
  save: SaveData,
  regionId: string,
  loop: number,
  count: number,
  rng: Rng,
): ItemInstance[] {
  const region = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0]!;
  const n = Math.min(MONETIZE.extraLootMax, Math.max(MONETIZE.extraLootMin, count));
  const drops = Array.from({ length: n }, (_, i) =>
    rollLoot(rng, Math.max(1, loop), `extra-${i}`, false, region.loot),
  );
  return acceptLoot(save, drops);
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
  const inPresets = otherPresetUse(save);
  const mates = save.inventory
    .filter(
      (i) =>
        i.uid !== uid &&
        i.defId === it.defId &&
        i.rarity === it.rarity &&
        !i.locked &&
        !eq.has(i.uid) &&
        !inPresets.has(i.uid),
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

/** 合成の成功率（そのレアリティから1つ上へ） */
export function synthRate(rarity: Rarity): number {
  return rarity === 'legendary' ? 0 : SYNTH.successRate[rarity];
}

export interface SynthResult {
  item: ItemInstance;
  success: boolean;
}

/**
 * 合成する。成功なら同じ装備の1つ上のレアリティ、失敗なら材料と同じレアリティのランダムな装備。
 * どちらでも材料3つと費用は使う
 */
export function synthesize(save: SaveData, uid: string, rng: Rng): SynthResult | null {
  const plan = synthPlan(save, uid);
  if (plan.reason || !plan.to) return null;
  const base = save.inventory.find((i) => i.uid === uid)!;
  const from = base.rarity as 'common' | 'rare' | 'epic';
  const used = new Set(plan.uids);
  save.inventory = save.inventory.filter((i) => !used.has(i.uid));
  save.gold -= plan.cost;
  const success = rng.next() < SYNTH.successRate[from];
  const newUid = `i${save.nextUid++}`;
  let item: ItemInstance;
  if (success) item = createItem(rng, base.defId, plan.to, newUid);
  else {
    const pool = ITEM_DEFS.filter((d) => d.kind !== 'consumable' && !d.artifact);
    item = createItem(rng, rng.pick(pool).id, from, newUid);
  }
  save.inventory.push(item);
  return { item, success };
}

const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/**
 * 自動売却: 受け取ったばかりの戦利品のうち、設定したレアリティ以下の装備を売る。
 * 消耗品・アーティファクトは売らない。設定で追加効果（✦）つきは残せる
 */
export function autoSellDrops(
  save: SaveData,
  added: readonly ItemInstance[],
): { uids: string[]; gold: number } {
  const max = save.settings.autoSell;
  if (max === 'off') return { uids: [], gold: 0 };
  const uids = added
    .filter((i) => {
      const d = getItemDef(i.defId);
      if (d.kind === 'consumable' || d.artifact || i.locked) return false;
      if (save.settings.autoSellKeepAffix && (i.affixes?.length ?? 0) > 0) return false;
      return RARITY_RANK[i.rarity] <= RARITY_RANK[max];
    })
    .map((i) => i.uid);
  const gold = sellItems(save, uids);
  return { uids, gold };
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
