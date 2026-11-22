// 保存データのスキーマ（Preferences キー: bp30.save.v3。版2・版1は bp30.save.v2・bp30.save.v1 から読んで移す）。
// 読み書き自体は src/platform/storage.ts。
import { validName } from './names';
import { COSMETICS, NO_LOOK, validLook, type Look } from './cosmetics';
import { LANGS, type Lang } from '../i18n';
import { allowsRarity, lineItemFor, originRarity } from './loot';
import { isAffix } from './affixes';
import { DEMO_KEY, TUTORIAL_KEYS } from './tutorialKeys';
import { CONSUMABLE, SIM, UPGRADES, type UpgradeId } from '../config/balance';
import { STARTER_ITEMS, getItemDef } from '../data/items';
import { REGIONS } from '../data/regions';
import { getTechnique } from '../data/techniques';
import { isElement, type MasteryData } from './mastery';
import { ITEM_SORTS, type ItemSort } from './itemSort';
import { isBoardId, type BoardId } from '../data/boards';
import { isCharmId } from '../data/charms';
import type { CharmInstance } from './charms';
import { activeBoardId } from './boardSave';
import { migrateV1, type LegacyV1 } from './migrate';
import { emptyStackBoard, restoreStackBoard } from './stack';
import type { Dir, GimmickKind, ItemInstance, Loadout, Rarity } from './types';
import { DIRS, GIMMICK_KINDS, RARITIES } from './types';

/** 廃止したアイテム → 返金するゴールド（読み込み時に倉庫から外す） */
const REMOVED_ITEMS: Record<string, number> = {
  chrono_glass: 1000, // 時渡りの砂時計（起点のアーティファクト。強すぎたため廃止）
};

/**
 * Origin stones removed on 2026-11-21 (the flow stones replaced them) → the stone each becomes when
 * a save is read. Only the kind changes: uid, rarity, exits, affixes and lock stay
 */
const RENAMED_ITEMS: Record<string, string> = {
  origin_fire: 'origin_echo',
  origin_thunder: 'origin_echo',
  origin_blunt: 'origin_echo',
  origin_wind: 'origin_far',
  origin_light: 'origin_far',
  origin_dark: 'origin_far',
  origin_poison: 'origin_lead',
  origin_vamp: 'origin_lead',
};

export const SAVE_KEY = 'bp30.save.v3';
/**
 * 4 (2026-11-22): HP, attack interval and attack upgrades come in twice the steps at half the
 * effect, so an older save's levels of those are doubled on load (the same power)
 */
export const SAVE_VERSION = 4;
/** Upgrades whose steps were split in two in version 4 */
const SPLIT_IN_V4: readonly UpgradeId[] = ['maxHp', 'atb', 'attack'];

/**
 * Debug (development and trial builds): a second save to play from zero while the real one stays
 * as it is. Which one is in use is stored under SAVE_SLOT_KEY
 */
export type SaveSlot = 'main' | 'fresh';
export const FRESH_SAVE_KEY = 'bp30.save.v3.fresh';
export const SAVE_SLOT_KEY = 'bp30.slot';

export function saveKeyFor(slot: SaveSlot): string {
  return slot === 'fresh' ? FRESH_SAVE_KEY : SAVE_KEY;
}

/**
 * Where older versions were kept, newest first: read once to move them, never written again (an
 * older build still finds its own save as it was)
 */
export function olderKeysFor(slot: SaveSlot): string[] {
  const keys = ['bp30.save.v2', 'bp30.save.v1'];
  return slot === 'fresh' ? keys.map((k) => `${k}.fresh`) : keys;
}

/** The data to read: the first save found, the current key first (an older one is moved as it is read) */
export function pickSaveRaw(values: readonly (string | null)[]): string | null {
  return values.find((v) => v !== null) ?? null;
}

export interface SaveData {
  version: number;
  gold: number;
  nextUid: number;
  inventory: ItemInstance[];
  loadout: Loadout;
  upgrades: Record<UpgradeId, number>;
  progress: { unlocked: string[]; best: Record<string, number> };
  stats: { runs: number; maxStep: number; maxDamage: number };
  /** プレミアム（買い切り）を持っているか */
  premium: boolean;
  /** 見た初心者向けの案内（ui/tutorial.ts のキー） */
  tutorialSeen: string[];
  /** 達成した実績（data/achievements.ts の id） */
  achievements: string[];
  /** エンドレスの自己ベスト（到達周回と、その中で一番多かった合計ダメージ） */
  endless: { bestLoop: number; bestDamage: number };
  /** 2週替わりの挑戦の自己ベスト（期間の番号ごと。今の期間だけ残す） */
  challenge: { period: number; best: number; bestLoop: number };
  /** 挑戦用の配置（並べ方の記録。ふだんの盤面とは別。いつも標準の盤面） */
  challengeLoadout: Loadout | null;
  /**
   * The stacked boards: the chosen one (its layout is `loadout`), the other boards' layouts, and each
   * board's edge slots (charm uids; columns, then rows)
   */
  boards: {
    active: BoardId;
    layouts: Partial<Record<BoardId, Loadout>>;
    charms: Partial<Record<BoardId, (string | null)[]>>;
  };
  /** The charm case (charms carried home) */
  charms: CharmInstance[];
  /** The hero's mastery per element and the techniques learned (by a spark) */
  mastery: MasteryData;
  /** ランキングに送った自己ベスト（シーズンごと。'challenge-3' → スコア） */
  rankSent: Record<string, number>;
  /** ランキングの報酬でもらった称号（新しい順） */
  titles: string[];
  /** ランキングの表示名（言葉の番号）。初めて送るときに決める */
  rankName: { a: number; b: number; tag: number } | null;
  /** Cosmetics owned (ids) and what is worn */
  cosmetics: string[];
  look: Look;
  /** Owned looks not seen in the wardrobe yet (the NEW marks) */
  newCosmetics: string[];
  /** 配置画面で挑戦用の配置を編集中（loadout に挑戦用が入っている）。途中で閉じたら読み込み時に戻す */
  editingChallenge?: boolean;
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
    /** Display language ('auto' follows the device) */
    lang: Lang | 'auto';
    /** Which side of the board the run's consumable buttons sit on */
    consumableSide: 'left' | 'right';
    /**
     * Debug: every look in the wardrobe can be worn (only in development and trial builds; the
     * looks really owned stay as they are)
     */
    debug: boolean;
    /** The order of the storage lists (loadout, storage, fusion) */
    itemSort: ItemSort;
  };
}

/** Debug: a save from zero that keeps the player's settings (debug, sound, …) */
export function freshStartSave(from: SaveData): SaveData {
  const save = createInitialSave();
  save.settings = { ...from.settings };
  return save;
}

export function createInitialSave(): SaveData {
  const inventory: ItemInstance[] = STARTER_ITEMS.map((defId, i) => ({
    uid: `i${i + 1}`,
    defId,
    rarity: 'common',
    exits: getItemDef(defId).kind === 'consumable' ? [] : ['right'],
    rerollCount: 0,
  }));
  const loadout = emptyStackBoard('standard');
  // 最初の連鎖を迷わず組めるように、初期配置を入れておく（標準の盤面の真ん中の行）
  // 起点 → 剣（2つ重ね） → 斧 → 木の盾
  const byDef = (id: string, n = 0): string => inventory.filter((it) => it.defId === id)[n]!.uid;
  const row = loadout.width;
  loadout.cells[row] = byDef('origin_stone');
  loadout.under![row + 1] = [byDef('sword', 0)];
  loadout.cells[row + 1] = byDef('sword', 1);
  loadout.cells[row + 2] = byDef('axe');
  loadout.cells[row + 3] = byDef('wood_shield');
  loadout.originOrder = [byDef('origin_stone')];
  loadout.consumables = [byDef('potion')];
  loadout.consumableAuto = ['potion'];
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
      consumableSlots: 0,
      storage: 0,
    },
    progress: { unlocked: [REGIONS[0]!.id], best: {} },
    stats: { runs: 0, maxStep: 0, maxDamage: 0 },
    premium: false,
    tutorialSeen: [],
    achievements: [],
    endless: { bestLoop: 0, bestDamage: 0 },
    challenge: { period: -1, best: 0, bestLoop: 0 },
    challengeLoadout: null,
    boards: { active: 'standard', layouts: {}, charms: {} },
    charms: [],
    mastery: { points: {}, learned: [] },
    rankSent: {},
    titles: [],
    rankName: null,
    cosmetics: [],
    look: { ...NO_LOOK },
    newCosmetics: [],
    adLog: { date: '', counts: {} },
    settings: {
      volume: 0.7,
      haptics: true,
      shake: true,
      gameSpeed: 1,
      showRoutes: true,
      autoSell: 'off',
      autoSellKeepAffix: true,
      lang: 'auto',
      consumableSide: 'right',
      debug: false,
      itemSort: 'rarity',
    },
  };
}

function validLoadout(v: unknown): v is Loadout {
  if (!isObj(v) || !isNum(v.width) || !isNum(v.height) || !Array.isArray(v.cells)) return false;
  if (v.cells.length !== v.width * v.height) return false;
  return Array.isArray(v.originOrder) && Array.isArray(v.consumables);
}

/** 並べ方の記録の読み込み。壊れていたら null */
function readLoadoutRec(v: unknown): Loadout | null {
  return validLoadout(v)
    ? {
        width: v.width,
        height: v.height,
        cells: v.cells.map((c) => (typeof c === 'string' ? c : null)),
        originOrder: v.originOrder.filter((u): u is string => typeof u === 'string'),
        consumables: v.consumables.filter((u): u is string => typeof u === 'string'),
        ...autoOf(v),
        ...underOf(v),
        ...(isBoardId(v.board) ? { board: v.board } : {}),
        ...gimmicksOf(v as unknown as Record<string, unknown>),
      }
    : null;
}

/** Gimmick cells (trial): one kind or null per cell; anything else is dropped */
function gimmicksOf(v: Record<string, unknown>): Pick<Loadout, 'gimmicks'> {
  const g = v.gimmicks;
  if (!Array.isArray(g)) return {};
  return {
    gimmicks: g.map((k) =>
      typeof k === 'string' && (GIMMICK_KINDS as readonly string[]).includes(k)
        ? (k as GimmickKind)
        : null,
    ),
  };
}

/**
 * The stacked boards (version 1 kept them as the trial's `trialBoards`). A save from before the
 * board variants has one stacked board (trialLoadout): it becomes the standard board's layout
 */
function readBoards(data: Record<string, unknown>): SaveData['boards'] {
  const tb = data.boards ?? data.trialBoards;
  if (isObj(tb)) {
    const layouts: Partial<Record<BoardId, Loadout>> = {};
    if (isObj(tb.layouts))
      for (const [id, v] of Object.entries(tb.layouts)) {
        const l = isBoardId(id) ? readLoadoutRec(v) : null;
        if (l && isBoardId(id)) layouts[id] = l;
      }
    return {
      active: isBoardId(tb.active) ? tb.active : 'standard',
      layouts,
      charms: readBoardCharms(tb.charms) ?? {},
    };
  }
  const old = data.trialLoadout ? readLoadoutRec(data.trialLoadout) : null;
  return { active: 'standard', layouts: old ? { standard: old } : {}, charms: {} };
}

/** Each board's slots, as arrays of charm uids or null (checked again on use) */
function readBoardCharms(v: unknown): Partial<Record<BoardId, (string | null)[]>> | undefined {
  if (!isObj(v)) return undefined;
  const out: Partial<Record<BoardId, (string | null)[]>> = {};
  for (const [id, slots] of Object.entries(v))
    if (isBoardId(id) && Array.isArray(slots))
      out[id] = slots.map((u) => (typeof u === 'string' ? u : null));
  return out;
}

/** Known charms with a real rarity, each uid once */
function readCharms(v: unknown[]): CharmInstance[] {
  const seen = new Set<string>();
  const out: CharmInstance[] = [];
  for (const c of v) {
    if (!isObj(c) || typeof c.uid !== 'string' || seen.has(c.uid)) continue;
    if (!isCharmId(c.defId) || !RARITIES.includes(c.rarity as Rarity)) continue;
    seen.add(c.uid);
    out.push({ uid: c.uid, defId: c.defId, rarity: c.rarity as Rarity });
  }
  return out;
}

/** 消耗品の自動補充の記録（古いセーブにはない） */
/** The items under each cell's top, when the board has them */
function underOf(l: { under?: unknown; cells?: unknown }): { under?: string[][] } {
  if (!Array.isArray(l.under) || !Array.isArray(l.cells) || l.under.length !== l.cells.length)
    return {};
  return {
    under: l.under.map((s) =>
      Array.isArray(s) ? s.filter((u): u is string => typeof u === 'string') : [],
    ),
  };
}

function autoOf(l: { consumableAuto?: unknown }): { consumableAuto?: string[] } {
  return Array.isArray(l.consumableAuto)
    ? { consumableAuto: l.consumableAuto.filter((u): u is string => typeof u === 'string') }
    : {};
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Points per known element (non-negative numbers) and learned technique ids */
function readMastery(v: Record<string, unknown>): MasteryData {
  const points: MasteryData['points'] = {};
  if (isObj(v.points))
    for (const [el, n] of Object.entries(v.points))
      if (isElement(el) && isNum(n) && n >= 0) points[el] = n;
  // Only real techniques, once each
  const learned = Array.isArray(v.learned)
    ? [...new Set(v.learned.filter((t): t is string => typeof t === 'string' && !!getTechnique(t)))]
    : [];
  return { points, learned };
}

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

/** What only a version 1 save has, for the move (see core/migrate.ts) */
function legacyOf(data: Record<string, unknown>, save: SaveData): LegacyV1 {
  const editing = data.editingTrial === true || data.editingChallenge === true;
  // While a board or the challenge was being edited, the bag waited in the active preset
  const presets = Array.isArray(data.presets) ? data.presets : [];
  const active = isNum(data.activePreset) ? presets[Math.floor(data.activePreset)] : undefined;
  const bag = editing ? (isObj(active) ? readLoadoutRec(active.loadout) : null) : save.loadout;
  return {
    bag,
    editingBoard: data.editingTrial === true ? save.loadout : null,
    backpackLevel:
      isObj(data.upgrades) && isNum(data.upgrades.backpack) ? data.upgrades.backpack : 0,
    discoveredTechs: Array.isArray(data.discoveredTechs)
      ? data.discoveredTechs.filter((t): t is string => typeof t === 'string')
      : [],
    stackSortie:
      isObj(data.settings) && data.settings.debug === true && data.settings.trialStack === true,
  };
}

const itemMapOf = (save: SaveData) => new Map(save.inventory.map((i) => [i.uid, i]));

/** パース失敗やバージョン不一致なら初期値で始める */
export function deserializeSave(raw: string | null | undefined): SaveData {
  if (!raw) return createInitialSave();
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || ![1, 2, 3, SAVE_VERSION].includes(data.version as number))
      return createInitialSave();
    // Version 1 (the bag, trials as switches) is read and then moved to version 2. Version 2 differs
    // only in the origin stones it may hold (renamed below, as for any version)
    const v1 = data.version === 1;
    const base = createInitialSave();
    if (!isNum(data.gold) || !isNum(data.nextUid)) return base;
    if (!Array.isArray(data.inventory)) return base;
    // 廃止したアイテムは倉庫・配置から外し、売値ぶんのゴールドを返す
    let refund = 0;
    const inventory = (data.inventory as unknown[])
      .filter((v) => {
        const id = isObj(v) ? v.defId : undefined;
        if (typeof id === 'string' && id in REMOVED_ITEMS) {
          refund += REMOVED_ITEMS[id]!;
          return false;
        }
        return true;
      })
      .map((v) => {
        const id = isObj(v) ? v.defId : undefined;
        return typeof id === 'string' && id in RENAMED_ITEMS
          ? { ...(v as object), defId: RENAMED_ITEMS[id] }
          : v;
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
        ...autoOf(lo),
        ...underOf(lo),
        ...(isBoardId(lo.board) ? { board: lo.board } : {}),
        ...gimmicksOf(lo as unknown as Record<string, unknown>),
      },
      // Known upgrades only (the backpack upgrade of version 1 is paid back by the move)
      upgrades: Object.fromEntries(
        (Object.keys(base.upgrades) as UpgradeId[]).map((id) => {
          const v = isObj(data.upgrades) ? data.upgrades[id] : undefined;
          const split = (data.version as number) < 4 && SPLIT_IN_V4.includes(id) ? 2 : 1;
          return [id, isNum(v) ? v * split : base.upgrades[id]];
        }),
      ) as SaveData['upgrades'],
      progress: isObj(data.progress) ? (data.progress as SaveData['progress']) : base.progress,
      stats: {
        ...base.stats,
        ...(isObj(data.stats) ? (data.stats as Partial<SaveData['stats']>) : {}),
      },
      premium: data.premium === true,
      // 案内を入れる前のセーブで、もう遊んでいる人には案内を出さない
      tutorialSeen: Array.isArray(data.tutorialSeen)
        ? data.tutorialSeen.filter((t): t is string => typeof t === 'string')
        : isObj(data.stats) && isNum(data.stats.runs) && data.stats.runs > 0
          ? [...TUTORIAL_KEYS, DEMO_KEY]
          : [],
      endless:
        isObj(data.endless) && isNum(data.endless.bestLoop) && isNum(data.endless.bestDamage)
          ? { bestLoop: data.endless.bestLoop, bestDamage: data.endless.bestDamage }
          : { bestLoop: 0, bestDamage: 0 },
      challenge:
        isObj(data.challenge) &&
        isNum(data.challenge.period) &&
        isNum(data.challenge.best) &&
        isNum(data.challenge.bestLoop)
          ? {
              period: data.challenge.period,
              best: data.challenge.best,
              bestLoop: data.challenge.bestLoop,
            }
          : { period: -1, best: 0, bestLoop: 0 },
      challengeLoadout: readLoadoutRec(data.challengeLoadout),
      boards: readBoards(data),
      charms: Array.isArray(data.charms) ? readCharms(data.charms) : [],
      rankSent: isObj(data.rankSent)
        ? (Object.fromEntries(Object.entries(data.rankSent).filter(([, v]) => isNum(v))) as Record<
            string,
            number
          >)
        : {},
      rankName: validName(data.rankName) ? data.rankName : null,
      cosmetics: Array.isArray(data.cosmetics)
        ? COSMETICS.map((c) => c.id).filter((id) => (data.cosmetics as unknown[]).includes(id))
        : [],
      // With the debug setting on, looks not owned may be worn (the boot narrows it again when the
      // build does not allow it: fixLook)
      look: validLook(
        isObj(data.look) ? (data.look as Partial<Look>) : undefined,
        isObj(data.settings) && data.settings.debug === true
          ? COSMETICS.map((c) => c.id)
          : Array.isArray(data.cosmetics)
            ? (data.cosmetics as string[])
            : [],
      ),
      // Only owned looks can be new (older saves have none)
      newCosmetics: Array.isArray(data.newCosmetics)
        ? COSMETICS.map((c) => c.id).filter(
            (id) =>
              (data.newCosmetics as unknown[]).includes(id) &&
              Array.isArray(data.cosmetics) &&
              (data.cosmetics as unknown[]).includes(id),
          )
        : [],
      titles: Array.isArray(data.titles)
        ? data.titles.filter((t): t is string => typeof t === 'string').slice(0, 50)
        : [],
      ...(data.editingChallenge === true ? { editingChallenge: true } : {}),
      mastery: isObj(data.mastery) ? readMastery(data.mastery) : { points: {}, learned: [] },
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
      // Known settings only (the trial switches of version 1 are gone)
      settings: Object.fromEntries(
        Object.keys(base.settings).map((k) => {
          const v = isObj(data.settings) ? data.settings[k] : undefined;
          return [k, v === undefined ? base.settings[k as keyof SaveData['settings']] : v];
        }),
      ) as SaveData['settings'],
    };
    if (typeof save.settings.showRoutes !== 'boolean') save.settings.showRoutes = true;
    if (save.settings.lang !== 'auto' && !LANGS.includes(save.settings.lang))
      save.settings.lang = 'auto';
    if (!['off', 'common', 'rare', 'epic'].includes(save.settings.autoSell))
      save.settings.autoSell = 'off';
    if (typeof save.settings.autoSellKeepAffix !== 'boolean')
      save.settings.autoSellKeepAffix = true;
    if (save.settings.consumableSide !== 'left') save.settings.consumableSide = 'right';
    if (typeof save.settings.debug !== 'boolean') save.settings.debug = false;
    if (!ITEM_SORTS.includes(save.settings.itemSort)) save.settings.itemSort = 'rarity';
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
    // 消耗品枠の自動補充: 記録がない古いセーブは、今の枠の中身を覚える
    if (!save.loadout.consumableAuto) {
      const byUid = new Map(save.inventory.map((i) => [i.uid, i.defId]));
      save.loadout.consumableAuto = save.loadout.consumables
        .map((u) => byUid.get(u))
        .filter((d): d is string => !!d);
    }
    if (!Array.isArray(save.progress.unlocked) || !isObj(save.progress.best))
      save.progress = base.progress;
    if (v1) return migrateV1(save, legacyOf(data, save));
    // The board in loadout, put in order against the gear owned: the chosen board, or the standard
    // one while the challenge layout is being edited (the chosen board waits in boards.layouts)
    const slots =
      CONSUMABLE.baseSlots + UPGRADES.consumableSlots.effect * save.upgrades.consumableSlots;
    const board = save.editingChallenge ? 'standard' : activeBoardId(save);
    save.boards.active = activeBoardId(save);
    save.loadout = restoreStackBoard(save.loadout, itemMapOf(save), slots, board);
    return save;
  } catch {
    return createInitialSave();
  }
}
