// 自動プレイ用のボット（プレイヤーの代わりに、盤面・アクセサリー・遺物・消耗品・売却・強化を決める）
// 人間の遊び方とは違うので、結果は「目安」として読む。
import type { UpgradeId } from '../src/config/balance';
import { autoBoard, boardScore } from '../src/core/autoBoard';
import { activeBoardId, switchBoard } from '../src/core/boardSave';
import { ownedBoards } from '../src/core/boards';
import { simulateChain } from '../src/core/chain';
import { boardCharmSlots, equipCharm } from '../src/core/charmSave';
import { charmValue, slotOpen } from '../src/core/charms';
import type { Combat } from '../src/core/combat';
import {
  consumableSlots,
  equippedUids,
  heroStats,
  itemMap,
  sellItems,
  storageCapacity,
  storageCount,
  upgradeCost,
  upgradeMaxLevel,
  buyUpgrade,
  synthPlan,
  synthesize,
} from '../src/core/economy';
import { canStickRelic } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import type { SaveData } from '../src/core/save';
import { boardUids, stackAt } from '../src/core/stack';
import type { ItemInstance, Loadout } from '../src/core/types';
import { getBoard, type BoardId } from '../src/data/boards';
import { getItemDef } from '../src/data/items';
import type { RelicId } from '../src/data/relics';

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

/**
 * 盤面を組み直す: 持っている盤面ごとに autoBoard を決まった形で1回と、ゆらして tries 回組み、今の配置も
 * 合わせて、見積もり（boardScore）が一番高いものに切り替える。消耗品は枠に詰める
 */
export function optimizeBoard(save: SaveData, rng: Rng, tries = 24): void {
  const items = itemMap(save);
  const mult = heroStats(save).attackMult;
  let bestId: BoardId = activeBoardId(save);
  let best: Loadout = save.loadout;
  let bestScore = boardScore(save.loadout, items, mult);
  const consider = (id: BoardId, l: Loadout) => {
    const sc = boardScore(l, items, mult);
    if (sc > bestScore) {
      bestId = id;
      best = l;
      bestScore = sc;
    }
  };
  for (const b of ownedBoards(save)) {
    consider(b.id, autoBoard(save.inventory, b.id));
    for (let t = 0; t < tries; t++) consider(b.id, autoBoard(save.inventory, b.id, rng));
  }
  if (bestId !== activeBoardId(save)) switchBoard(save, bestId);
  const slots = consumableSlots(save);
  const cons = save.inventory
    .filter((i) => getItemDef(i.defId).kind === 'consumable')
    .sort((a, b) => CONSUMABLE_PRIORITY.indexOf(a.defId) - CONSUMABLE_PRIORITY.indexOf(b.defId));
  save.loadout = { ...best, consumables: cons.slice(0, slots).map((i) => i.uid) };
}

/** アクセサリー: 今の盤面の枠に、強い（charmValue の高い）順に付け直す */
export function equipBestCharms(save: SaveData): void {
  const id = activeBoardId(save);
  const board = getBoard(id);
  const open = boardCharmSlots(save, id)
    .map((_, slot) => slot)
    .filter((slot) => slotOpen(slot, board));
  const ranked = [...save.charms].sort((a, b) => charmValue(b) - charmValue(a));
  open.forEach((slot, k) => equipCharm(save, id, slot, ranked[k]?.uid ?? null));
}

/** 遺物の強さの順（盤面に最初から貼って測った順。見積もりには遺物の効き目が入らないため） */
const RELIC_ORDER: readonly RelicId[] = [
  'fist',
  'bell',
  'whistle',
  'fang',
  'ward',
  'eye',
  'pierce',
  'feather',
  'sweep',
  'claw',
];

/**
 * 遺物を選んで貼る: 出た候補を強さの順に見て、貼れるマスのうち一番高く重なったマス（同じなら道の後ろ）へ。
 * どれも貼れなければ見送る。貼れたら true
 */
export function pickRelic(
  c: Combat,
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
): boolean {
  const offer = c.relicOffer;
  if (!offer) return false;
  const plan = simulateChain(loadout, items).plans[0];
  const route = plan ? [...new Set(plan.steps.map((s) => s.cell))] : [];
  const ids = [
    ...RELIC_ORDER.filter((r) => offer.ids.includes(r)),
    ...offer.ids.filter((r) => !RELIC_ORDER.includes(r)),
  ];
  for (const id of ids) {
    let best = -1;
    let size = -1;
    for (const cell of route) {
      if (!canStickRelic(loadout, items, c.relics, id, cell)) continue;
      const n = stackAt(loadout, cell).length;
      if (n >= size) {
        best = cell;
        size = n;
      }
    }
    if (best >= 0 && c.placeRelic(id, best)) return true;
  }
  c.skipRelic();
  return false;
}

const CONSUMABLE_PRIORITY = [
  'potion',
  'time_sand',
  'rally',
  'rain_charm',
  'oil_barrel',
  'time_stop',
  'bomb',
  'lucky_coin',
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
      ((def.effect === 'wetAll' || def.effect === 'oilAll' || def.effect === 'bombAll') &&
        engaged >= 3) ||
      (def.effect === 'critUp' && !c.chain && engaged > 0 && c.atbRatio > 0.8);
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
  'runTime',
  'consumableSlots',
  'storage',
];

export function buyUpgrades(save: SaveData): UpgradeId[] {
  const bought: UpgradeId[] = [];
  for (;;) {
    const options = UPGRADE_PRIORITY.map((id) => ({
      id,
      cost: upgradeCost(id, save.upgrades[id], upgradeMaxLevel(save, id)),
    }))
      .filter((o): o is { id: UpgradeId; cost: number } => o.cost !== null && o.cost <= save.gold)
      .sort((a, b) => a.cost - b.cost);
    const pick = options[0];
    if (!pick || !buyUpgrade(save, pick.id)) break;
    bought.push(pick.id);
  }
  return bought;
}

export function chainSummary(save: SaveData): { board: BoardId; longest: number; placed: number } {
  const items = itemMap(save);
  const plans = simulateChain(save.loadout, items).plans;
  return {
    board: activeBoardId(save),
    longest: Math.max(0, ...plans.map((p) => p.maxStep)),
    placed: boardUids(save.loadout).length,
  };
}

/** 合成: 同じ装備・同じレアリティが3つ揃っていて、お金が足りれば合成する（レジェンダリー未満） */
export function synthAll(save: SaveData, rng: Rng): { tries: number; success: number } {
  let tries = 0;
  let success = 0;
  for (let guard = 0; guard < 20; guard++) {
    const target = save.inventory.find((i) => {
      const p = synthPlan(save, i.uid);
      return p.reason === null && p.to !== null;
    });
    if (!target) break;
    const res = synthesize(save, target.uid, rng);
    if (!res) break;
    tries++;
    if (res.success) success++;
  }
  return { tries, success };
}
