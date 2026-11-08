// 保存データのスキーマ（Preferences キー: bp30.save.v1）。読み書き自体は src/platform/storage.ts。
import { originRarity } from './loot';
import { isAffix } from './affixes';
import { BACKPACK, CONSUMABLE, SIM, type UpgradeId } from '../config/balance';
import { STARTER_ITEMS, getItemDef } from '../data/items';
import { REGIONS } from '../data/regions';
import type { Dir, ItemInstance, Loadout, Rarity } from './types';
import { DIRS, RARITIES } from './types';

export const SAVE_KEY = 'bp30.save.v1';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  gold: number;
  nextUid: number;
  inventory: ItemInstance[];
  loadout: Loadout;
  upgrades: Record<UpgradeId, number>;
  progress: { unlocked: string[]; best: Record<string, number> };
  stats: { runs: number; maxStep: number; maxDamage: number };
  settings: { volume: number; haptics: boolean; shake: boolean; gameSpeed: number };
}

export function emptyLoadout(
  width: number = BACKPACK.baseWidth,
  height: number = BACKPACK.baseHeight,
): Loadout {
  return {
    width,
    height,
    cells: new Array<string | null>(width * height).fill(null),
    originOrder: [],
    consumables: [],
  };
}

export function createInitialSave(): SaveData {
  const inventory: ItemInstance[] = STARTER_ITEMS.map((defId, i) => ({
    uid: `i${i + 1}`,
    defId,
    rarity: 'common',
    exits: getItemDef(defId).kind === 'consumable' ? [] : ['right'],
    rerollCount: 0,
  }));
  const loadout = emptyLoadout();
  // 最初の連鎖を迷わず組めるように、初期配置を入れておく
  // 行0: 起点1 → 剣 → 斧 / 行1: 起点2 → 剣 → 木の盾
  const byDef = (id: string, n = 0): string => inventory.filter((it) => it.defId === id)[n]!.uid;
  const w = loadout.width;
  loadout.cells[0] = byDef('origin_stone', 0);
  loadout.cells[1] = byDef('sword', 0);
  loadout.cells[2] = byDef('axe');
  loadout.cells[w] = byDef('origin_stone', 1);
  loadout.cells[w + 1] = byDef('sword', 1);
  loadout.cells[w + 2] = byDef('wood_shield');
  loadout.originOrder = [byDef('origin_stone', 0), byDef('origin_stone', 1)];
  loadout.consumables = [byDef('potion')];
  return {
    version: SAVE_VERSION,
    gold: 0,
    nextUid: inventory.length + 1,
    inventory,
    loadout,
    upgrades: {
      maxHp: 0,
      atb: 0,
      attack: 0,
      runTime: 0,
      backpack: 0,
      consumableSlots: 0,
      storage: 0,
    },
    progress: { unlocked: [REGIONS[0]!.id], best: {} },
    stats: { runs: 0, maxStep: 0, maxDamage: 0 },
    settings: { volume: 0.7, haptics: true, shake: true, gameSpeed: 1 },
  };
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validItem(v: unknown): v is ItemInstance {
  if (!isObj(v)) return false;
  if (typeof v.uid !== 'string' || typeof v.defId !== 'string') return false;
  if (!RARITIES.includes(v.rarity as Rarity)) return false;
  if (!Array.isArray(v.exits) || !v.exits.every((d) => DIRS.includes(d as Dir))) return false;
  if (!isNum(v.rerollCount)) return false;
  if (v.affixes !== undefined && (!Array.isArray(v.affixes) || !v.affixes.every(isAffix)))
    return false;
  try {
    getItemDef(v.defId);
  } catch {
    return false;
  }
  return true;
}

/** パース失敗やバージョン不一致なら初期値で始める */
export function deserializeSave(raw: string | null | undefined): SaveData {
  if (!raw) return createInitialSave();
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || data.version !== SAVE_VERSION) return createInitialSave();
    const base = createInitialSave();
    if (!isNum(data.gold) || !isNum(data.nextUid)) return base;
    if (!Array.isArray(data.inventory) || !data.inventory.every(validItem)) return base;
    const lo = data.loadout;
    if (!isObj(lo) || !isNum(lo.width) || !isNum(lo.height) || !Array.isArray(lo.cells))
      return base;
    if (lo.cells.length !== lo.width * lo.height) return base;
    if (!Array.isArray(lo.originOrder) || !Array.isArray(lo.consumables)) return base;
    const save: SaveData = {
      version: SAVE_VERSION,
      gold: data.gold,
      nextUid: data.nextUid,
      inventory: data.inventory,
      loadout: {
        width: lo.width,
        height: lo.height,
        cells: lo.cells.map((c) => (typeof c === 'string' ? c : null)),
        originOrder: lo.originOrder.filter((u): u is string => typeof u === 'string'),
        consumables: lo.consumables.filter((u): u is string => typeof u === 'string'),
      },
      upgrades: {
        ...base.upgrades,
        ...(isObj(data.upgrades) ? (data.upgrades as Partial<SaveData['upgrades']>) : {}),
      },
      progress: isObj(data.progress) ? (data.progress as SaveData['progress']) : base.progress,
      stats: {
        ...base.stats,
        ...(isObj(data.stats) ? (data.stats as Partial<SaveData['stats']>) : {}),
      },
      settings: {
        ...base.settings,
        ...(isObj(data.settings) ? (data.settings as Partial<SaveData['settings']>) : {}),
      },
    };
    const sp = save.settings.gameSpeed;
    if (typeof sp !== 'number' || !Number.isFinite(sp) || sp <= 0 || sp > SIM.maxSpeed)
      save.settings.gameSpeed = 1;
    // 起点石: 出口0（以前の抽選で出たもの）は右向き1方向にし、レアリティは出口の数に合わせる
    for (const it of save.inventory) {
      const d = getItemDef(it.defId);
      // アーティファクトは出口・レアリティ固定、追加効果なし
      if (d.artifact) {
        it.exits = d.artifact.exits.slice();
        it.rarity = 'legendary';
        delete it.affixes;
        continue;
      }
      if (d.kind !== 'origin') continue;
      if (it.exits.length === 0) it.exits = ['right'];
      it.rarity = originRarity(it.exits.length);
    }
    // 参照の整合性: 倉庫にない uid は配置から外す
    const owned = new Set(save.inventory.map((i) => i.uid));
    save.loadout.cells = save.loadout.cells.map((c) => (c && owned.has(c) ? c : null));
    save.loadout.originOrder = save.loadout.originOrder.filter((u) =>
      save.loadout.cells.includes(u),
    );
    save.loadout.consumables = save.loadout.consumables
      .filter((u) => owned.has(u))
      .slice(0, CONSUMABLE.baseSlots + 2);
    if (!Array.isArray(save.progress.unlocked) || !isObj(save.progress.best))
      save.progress = base.progress;
    return save;
  } catch {
    return createInitialSave();
  }
}
