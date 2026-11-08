// 自動プレイ用のボット（プレイヤーの代わりに、配置・消耗品・売却・強化を決める）
// 人間の遊び方とは違うので、結果は「目安」として読む。
import { AREA, RARITY, STATUS, type UpgradeId } from '../src/config/balance';
import { planChain, simulateChain } from '../src/core/chain';
import type { Combat } from '../src/core/combat';
import { computeDamage, findCombo } from '../src/core/damage';
import {
  consumableSlots,
  equippedUids,
  heroStats,
  itemMap,
  sellItems,
  storageCapacity,
  storageCount,
  upgradeCost,
  buyUpgrade,
} from '../src/core/economy';
import { neighborCell } from '../src/core/chain';
import { Rng } from '../src/core/rng';
import type { SaveData } from '../src/core/save';
import type { Dir, ItemInstance, Loadout, Status } from '../src/core/types';
import { DIRS } from '../src/core/types';
import { getItemDef } from '../src/data/items';

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

/** 群れ相手を想定した範囲攻撃の重み（単体=1） */
const AREA_WEIGHT = { single: 1, sweep: 2.5, splash: 1.8, all: 3 * AREA.allMult } as const;
const DEFENSE_WEIGHT = 0.6; // 防御値1あたりをダメージ何点ぶんとみなすか

function power(it: ItemInstance): number {
  const def = getItemDef(it.defId);
  const r = RARITY[it.rarity].mult;
  if (def.kind === 'attack')
    return (def.atk ?? 0) * r * AREA_WEIGHT[def.area ?? 'single'] + (def.applies ? 8 : 0);
  if (def.kind === 'defense') return (def.defense ?? 0) * r * DEFENSE_WEIGHT;
  return 0;
}

/**
 * 配置の評価: 起点ごとに、1体の強い相手へ連鎖を撃ったときのダメージを見積もり（状態コンボを順に数える）、
 * 1秒あたりにならす。防御値も少し加点する。
 */
export function scoreLoadout(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  atbTime: number,
  attackMult: number,
): number {
  const plans = simulateChain(loadout, items).plans;
  if (plans.length === 0) return 0;
  let damage = 0;
  let time = 0;
  let defense = 0;
  const statuses = new Set<Status>(); // 連鎖をまたいで残る状態（5秒以内に次が撃たれる想定）
  for (const plan of plans) {
    for (const s of plan.steps) {
      if (s.step === null) continue;
      const it = items.get(s.uid)!;
      const def = getItemDef(it.defId);
      const combo = findCombo(def.element, statuses);
      if (combo) statuses.delete(combo.status);
      const d = computeDamage({
        atk: def.atk ?? 0,
        rarity: it.rarity,
        step: s.step,
        comboMult: combo?.mult ?? (statuses.size > 0 ? STATUS.exposedMult : 1),
        upgradeMult: attackMult,
        area: def.area === 'all' ? 'all' : undefined,
      });
      damage += d * AREA_WEIGHT[def.area ?? 'single'];
      if (def.applies) statuses.add(def.applies);
    }
    time += atbTime + plan.duration;
    defense += plan.defenseGain;
  }
  return (damage + defense * DEFENSE_WEIGHT) / time;
}

/** 出口の向きをたどって、空いているマスへ装備をつないでいく（1回分の試行） */
function buildOnce(save: SaveData, rng: Rng): Loadout {
  const { width, height } = save.loadout;
  const loadout: Loadout = {
    width,
    height,
    cells: new Array(width * height).fill(null),
    originOrder: [],
    consumables: [],
  };
  const all = save.inventory.filter((i) => getItemDef(i.defId).kind !== 'consumable');
  const origins = all
    .filter((i) => getItemDef(i.defId).kind === 'origin' && i.exits.length > 0)
    .sort((a, b) => b.exits.length - a.exits.length || rng.next() - 0.5);
  // 強い順（少しランダム）に並べた装備の山
  const pool = all
    .filter((i) => getItemDef(i.defId).kind !== 'origin')
    .map((i) => ({ i, k: power(i) * (0.7 + rng.next() * 0.6) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.i);
  const useOrigins = Math.min(origins.length, 1 + rng.int(3));
  const free = (c: number | null): c is number => c !== null && loadout.cells[c] === null;
  for (const o of origins.slice(0, useOrigins)) {
    const starts = loadout.cells
      .map((_, c) => c)
      .filter(
        (c) => loadout.cells[c] === null && o.exits.some((d) => free(neighborCell(loadout, c, d))),
      );
    if (starts.length === 0) break;
    const start = rng.pick(starts);
    loadout.cells[start] = o.uid;
    loadout.originOrder.push(o.uid);
    const maxLen = 3 + rng.int(9);
    let placed = 0;
    const queue: number[] = o.exits.map((d) => neighborCell(loadout, start, d)).filter(free);
    while (queue.length > 0 && pool.length > 0 && placed < maxLen) {
      const cell = queue.shift()!;
      if (loadout.cells[cell] !== null) continue;
      const leads = (it: ItemInstance) =>
        it.exits.filter((d: Dir) => free(neighborCell(loadout, cell, d))).length;
      // 続けられる向きの装備を優先。長さの上限が近いか、続けられる装備がなければ末端でもよい
      const wantEnd = placed >= maxLen - 1;
      let idx = pool.findIndex((it) => (wantEnd ? true : leads(it) > 0));
      if (idx < 0) idx = 0;
      const it = pool.splice(idx, 1)[0]!;
      loadout.cells[cell] = it.uid;
      placed++;
      for (const d of DIRS) {
        if (!it.exits.includes(d)) continue;
        const n = neighborCell(loadout, cell, d);
        if (free(n)) queue.push(n);
      }
    }
  }
  return loadout;
}

/** 配置を組み直す: 何度か試して評価が一番高いものを使う。消耗品は枠に詰める */
export function optimizeLoadout(save: SaveData, rng: Rng, tries = 24): void {
  const items = itemMap(save);
  const hs = heroStats(save);
  let best = save.loadout;
  let bestScore = scoreLoadout(save.loadout, items, hs.atbTime, hs.attackMult);
  for (let t = 0; t < tries; t++) {
    const l = buildOnce(save, rng);
    const sc = scoreLoadout(l, items, hs.atbTime, hs.attackMult);
    if (sc > bestScore) {
      best = l;
      bestScore = sc;
    }
  }
  const slots = consumableSlots(save);
  const cons = save.inventory
    .filter((i) => getItemDef(i.defId).kind === 'consumable')
    .sort((a, b) => CONSUMABLE_PRIORITY.indexOf(a.defId) - CONSUMABLE_PRIORITY.indexOf(b.defId));
  save.loadout = { ...best, consumables: cons.slice(0, slots).map((i) => i.uid) };
}

const CONSUMABLE_PRIORITY = [
  'potion',
  'time_sand',
  'rally',
  'rain_charm',
  'oil_barrel',
  'time_stop',
];

/** ラン中の消耗品の使い方（簡単なルール）。使ったら defId を返す */
export function useConsumables(c: Combat, items: ReadonlyMap<string, ItemInstance>): string | null {
  for (let i = 0; i < c.consumables.length; i++) {
    const uid = c.consumables[i];
    if (!uid) continue;
    const def = getItemDef(items.get(uid)!.defId);
    const engaged = c.engagedEnemies().length;
    const want =
      (def.effect === 'heal' && c.hp < c.maxHp * 0.4) ||
      (def.effect === 'addTime' && c.remaining < 3 && c.engaged) ||
      (def.effect === 'rally' && !c.chain && engaged > 0 && c.atbRatio < 0.5) ||
      (def.effect === 'timeStop' && engaged > 0 && c.hp < c.maxHp * 0.5) ||
      ((def.effect === 'wetAll' || def.effect === 'oilAll') && engaged >= 3);
    if (want && c.useConsumable(i)) return def.id;
  }
  return null;
}

/** 売却: 装備中と、種類ごとに価値の高い上位だけ残す。倉庫に余裕を持たせる */
export function sellJunk(save: SaveData): number {
  const eq = equippedUids(save);
  const keepPerDef = 3;
  const byDef = new Map<string, ItemInstance[]>();
  for (const it of save.inventory) {
    if (eq.has(it.uid)) continue;
    const list = byDef.get(it.defId) ?? [];
    list.push(it);
    byDef.set(it.defId, list);
  }
  const sell: string[] = [];
  for (const [defId, list] of byDef) {
    const kind = getItemDef(defId).kind;
    list.sort(
      (a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || b.exits.length - a.exits.length,
    );
    const keep = kind === 'consumable' ? 4 : keepPerDef;
    sell.push(...list.slice(keep).map((i) => i.uid));
  }
  let gold = sellItems(save, sell);
  // それでもあふれていたら、価値の低い順に売る
  const cap = storageCapacity(save) - 4;
  if (storageCount(save) > cap) {
    const eq2 = equippedUids(save);
    const rest = save.inventory
      .filter((i) => !eq2.has(i.uid))
      .sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]);
    gold += sellItems(
      save,
      rest.slice(0, storageCount(save) - cap).map((i) => i.uid),
    );
  }
  return gold;
}

/** 強化: 優先順に、買えるものを買えるだけ */
const UPGRADE_PRIORITY: UpgradeId[] = [
  'attack',
  'maxHp',
  'atb',
  'backpack',
  'runTime',
  'consumableSlots',
  'storage',
];

export function buyUpgrades(save: SaveData): UpgradeId[] {
  const bought: UpgradeId[] = [];
  for (;;) {
    const options = UPGRADE_PRIORITY.map((id) => ({ id, cost: upgradeCost(id, save.upgrades[id]) }))
      .filter((o): o is { id: UpgradeId; cost: number } => o.cost !== null && o.cost <= save.gold)
      .sort((a, b) => a.cost - b.cost);
    const pick = options[0];
    if (!pick || !buyUpgrade(save, pick.id)) break;
    bought.push(pick.id);
  }
  return bought;
}

export function chainSummary(save: SaveData): { origins: number; longest: number; placed: number } {
  const items = itemMap(save);
  const plans = save.loadout.originOrder
    .filter((u) => save.loadout.cells.includes(u))
    .map((u) => planChain(save.loadout, items, u));
  return {
    origins: plans.length,
    longest: Math.max(0, ...plans.map((p) => p.maxStep)),
    placed: save.loadout.cells.filter(Boolean).length,
  };
}
