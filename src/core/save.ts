// 保存データのスキーマ（Preferences キー: bp30.save.v1）。読み書き自体は src/platform/storage.ts。
import { allowsRarity, lineItemFor, originRarity } from './loot';
import { isAffix } from './affixes';
import { BACKPACK, CONSUMABLE, SIM, type UpgradeId } from '../config/balance';
import { STARTER_ITEMS, getItemDef } from '../data/items';
import { REGIONS } from '../data/regions';
import type { Dir, ItemInstance, Loadout, Rarity } from './types';
import { DIRS, RARITIES } from './types';

/** 廃止したアイテム → 返金するゴールド（読み込み時に倉庫から外す） */
const REMOVED_ITEMS: Record<string, number> = {
  chrono_glass: 1000, // 時渡りの砂時計（起点のアーティファクト。強すぎたため廃止）
};

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
  /** 編成（並べ方の記録）。今の並べ方は loadout で、presets[activePreset] は切り替えたときに更新する */
  presets: Preset[];
  activePreset: number;
  /** 見つけた必殺技（図鑑） */
  discoveredTechs: string[];
  /** プレミアム（買い切り）を持っているか */
  premium: boolean;
  /** 見た初心者向けの案内（ui/tutorial.ts のキー） */
  tutorialSeen: string[];
  /** 達成した実績（data/achievements.ts の id） */
  achievements: string[];
  /** 報酬つき広告の、今日の受け取り回数（日付が変わったら 0 から） */
  adLog: { date: string; counts: Record<string, number> };
  settings: {
    volume: number;
    haptics: boolean;
    shake: boolean;
    gameSpeed: number;
    /** 配置画面でルートの線・段数を出すか */
    showRoutes: boolean;
    /** ラン後に自動で売る戦利品のレアリティ（これ以下）。off は売らない */
    autoSell: 'off' | 'common' | 'rare' | 'epic';
    /** 自動売却で、追加効果（✦）つきは残すか */
    autoSellKeepAffix: boolean;
  };
}

export const PRESET_COUNT = 5;

/** 編成: 装備そのものは持たず、どの装備をどこに置くか（と消耗品の枠）だけを覚える */
export interface Preset {
  name: string;
  /** null はまだ一度も使っていない編成 */
  loadout: Loadout | null;
}

export function defaultPresets(): Preset[] {
  return Array.from({ length: PRESET_COUNT }, (_, i) => ({ name: `編成${i + 1}`, loadout: null }));
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
    presets: defaultPresets(),
    activePreset: 0,
    discoveredTechs: [],
    premium: false,
    tutorialSeen: [],
    achievements: [],
    adLog: { date: '', counts: {} },
    settings: {
      volume: 0.7,
      haptics: true,
      shake: true,
      gameSpeed: 1,
      showRoutes: true,
      autoSell: 'off',
      autoSellKeepAffix: true,
    },
  };
}

function validLoadout(v: unknown): v is Loadout {
  if (!isObj(v) || !isNum(v.width) || !isNum(v.height) || !Array.isArray(v.cells)) return false;
  if (v.cells.length !== v.width * v.height) return false;
  return Array.isArray(v.originOrder) && Array.isArray(v.consumables);
}

/** 編成の読み込み。壊れた分は空の編成にする */
function readPresets(v: unknown): Preset[] {
  const base = defaultPresets();
  if (!Array.isArray(v)) return base;
  return base.map((b, i) => {
    const p: unknown = v[i];
    if (!isObj(p)) return b;
    const name = typeof p.name === 'string' && p.name.length > 0 ? p.name.slice(0, 12) : b.name;
    const lo = validLoadout(p.loadout)
      ? {
          width: p.loadout.width,
          height: p.loadout.height,
          cells: p.loadout.cells.map((c) => (typeof c === 'string' ? c : null)),
          originOrder: p.loadout.originOrder.filter((u): u is string => typeof u === 'string'),
          consumables: p.loadout.consumables.filter((u): u is string => typeof u === 'string'),
        }
      : null;
    return { name, loadout: lo };
  });
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
  if (v.locked !== undefined && typeof v.locked !== 'boolean') return false;
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
    if (!Array.isArray(data.inventory)) return base;
    // 廃止したアイテムは倉庫・配置から外し、売値ぶんのゴールドを返す
    let refund = 0;
    const inventory = (data.inventory as unknown[]).filter((v) => {
      const id = isObj(v) ? v.defId : undefined;
      if (typeof id === 'string' && id in REMOVED_ITEMS) {
        refund += REMOVED_ITEMS[id]!;
        return false;
      }
      return true;
    });
    if (!inventory.every(validItem)) return base;
    const gold = data.gold + refund;
    const lo = data.loadout;
    if (!isObj(lo) || !isNum(lo.width) || !isNum(lo.height) || !Array.isArray(lo.cells))
      return base;
    if (lo.cells.length !== lo.width * lo.height) return base;
    if (!Array.isArray(lo.originOrder) || !Array.isArray(lo.consumables)) return base;
    const save: SaveData = {
      version: SAVE_VERSION,
      gold,
      nextUid: data.nextUid,
      inventory,
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
      presets: readPresets(data.presets),
      premium: data.premium === true,
      // 案内を入れる前のセーブで、もう遊んでいる人には案内を出さない
      tutorialSeen: Array.isArray(data.tutorialSeen)
        ? data.tutorialSeen.filter((t): t is string => typeof t === 'string')
        : isObj(data.stats) && isNum(data.stats.runs) && data.stats.runs > 0
          ? ['home', 'stage', 'run', 'demoEnd', 'result', 'loadout', 'smith', 'demo']
          : [],
      achievements: Array.isArray(data.achievements)
        ? data.achievements.filter((t): t is string => typeof t === 'string')
        : [],
      adLog:
        isObj(data.adLog) && typeof data.adLog.date === 'string' && isObj(data.adLog.counts)
          ? {
              date: data.adLog.date,
              counts: Object.fromEntries(
                Object.entries(data.adLog.counts).filter(([, v]) => isNum(v)),
              ) as Record<string, number>,
            }
          : { date: '', counts: {} },
      discoveredTechs: Array.isArray(data.discoveredTechs)
        ? data.discoveredTechs.filter((t): t is string => typeof t === 'string')
        : [],
      activePreset:
        isNum(data.activePreset) && data.activePreset >= 0 && data.activePreset < PRESET_COUNT
          ? Math.floor(data.activePreset)
          : 0,
      settings: {
        ...base.settings,
        ...(isObj(data.settings) ? (data.settings as Partial<SaveData['settings']>) : {}),
      },
    };
    if (typeof save.settings.showRoutes !== 'boolean') save.settings.showRoutes = true;
    if (!['off', 'common', 'rare', 'epic'].includes(save.settings.autoSell))
      save.settings.autoSell = 'off';
    if (typeof save.settings.autoSellKeepAffix !== 'boolean')
      save.settings.autoSellKeepAffix = true;
    const sp = save.settings.gameSpeed;
    if (typeof sp !== 'number' || !Number.isFinite(sp) || sp <= 0 || sp > SIM.maxSpeed)
      save.settings.gameSpeed = 1;
    // 起点石: 出口0（以前の抽選で出たもの）は右向き1方向にし、レアリティは出口の数に合わせる
    for (const it of save.inventory) {
      const d = getItemDef(it.defId);
      // アーティファクトは出口・レアリティ固定、追加効果なし
      if (d.artifact) {
        // 向きは鍛冶屋で変えられるが、出口の数は固定
        if (it.exits.length !== d.artifact.exits.length) it.exits = d.artifact.exits.slice();
        it.rarity = 'legendary';
        delete it.affixes;
        continue;
      }
      // 系統: その装備が出ないレアリティなら、系統の装備に置きかえる（レジェンダリーの革鎧 → 鋼の鎧）
      if (d.rarities && !allowsRarity(it.defId, it.rarity)) {
        const to = lineItemFor(it.defId, it.rarity);
        if (to) it.defId = to;
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
