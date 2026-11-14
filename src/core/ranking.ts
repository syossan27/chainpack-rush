// ランキングに送る記録と、その確認（純粋な関数。サーバーの Cloud Functions も同じものを使う）
//
// 送るもの: 乱数の種・地域・配置・置いた装備・勇者の強化と★・操作の記録・結果。
// サーバーは装備と強化が正しい範囲かを確かめ、同じランを最初から再生して、結果が一致したときだけ記録する。
import { BACKPACK, CONSUMABLE, PROGRESS, UPGRADES } from '../config/balance';
import { AFFIX_COUNT, affixCandidates } from './affixes';
import { checkRules, currentChallenge } from './challenge';
import { BASE_HERO_STATS, type RunConfig, type RunInput, type RunResult } from './combat';
import { heroFrom } from './economy';
import { allowsRarity } from './loot';
import { replayRun, sameResult } from './replay';
import type { SaveData } from './save';
import { DIRS, type ItemInstance, type Loadout } from './types';
import { getItemDef } from '../data/items';
import { k, locale, t } from '../i18n';
import type { RewardBand } from './names';
import { REGIONS } from '../data/regions';

export const SUBMISSION_VERSION = 1;

export type RankMode = 'challenge' | 'endless';

/** 勇者の強さのもとになる強化（エンドレスだけ。挑戦は最初の強さ） */
export interface HeroBasis {
  maxHp: number;
  atb: number;
  attack: number;
  runTime: number;
  stars: number;
}

export interface ScoreSubmission {
  v: number;
  mode: RankMode;
  /** 挑戦の期間の番号、またはエンドレスのシーズン（月） */
  season: number;
  seed: number;
  regionId: string;
  loadout: Loadout;
  /** 配置と消耗品枠に置いた装備だけ */
  items: ItemInstance[];
  consumableSlots: number;
  hero: HeroBasis | null;
  inputs: RunInput[];
  /** 端末で出た結果 */
  claim: { totalDamage: number; reachedLoop: number; ticks: number; maxStep: number };
}

/** エンドレスのシーズン（UTC の年×12＋月）。毎月切り替わる */
export function endlessSeason(now: number): number {
  const d = new Date(now);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** 並べ替えの値（大きいほど上）。挑戦は合計ダメージ、エンドレスは到達周回→合計ダメージ */
export function rankScore(mode: RankMode, r: { totalDamage: number; reachedLoop: number }): number {
  const dmg = Math.floor(r.totalDamage);
  return mode === 'challenge' ? dmg : r.reachedLoop * 1e12 + Math.min(dmg, 1e12 - 1);
}

/** 端末側: 終わったランから、送る記録を作る */
export function buildSubmission(
  mode: RankMode,
  season: number,
  cfg: RunConfig,
  result: RunResult,
  save: SaveData,
  stars: number,
): ScoreSubmission {
  const uids = new Set<string>();
  for (const u of cfg.loadout.cells) if (u) uids.add(u);
  for (const u of cfg.loadout.consumables) uids.add(u);
  const items = [...uids].map((u) => cfg.items.get(u)).filter((i): i is ItemInstance => !!i);
  return {
    v: SUBMISSION_VERSION,
    mode,
    season,
    seed: cfg.seed,
    regionId: cfg.regionId,
    loadout: cfg.loadout,
    items: items.map((i) => ({ ...i, locked: undefined })).map(stripUndefined),
    consumableSlots: cfg.consumableSlots ?? 0,
    hero:
      mode === 'endless'
        ? {
            maxHp: save.upgrades.maxHp,
            atb: save.upgrades.atb,
            attack: save.upgrades.attack,
            runTime: save.upgrades.runTime,
            stars,
          }
        : null,
    inputs: result.inputs ?? [],
    claim: {
      totalDamage: result.stats.totalDamage,
      reachedLoop: result.reachedLoop,
      ticks: result.ticks,
      maxStep: result.stats.maxStep,
    },
  };
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export type VerifyResult =
  | { ok: true; score: number; totalDamage: number; reachedLoop: number }
  | { ok: false; reason: string };

/**
 * サーバー側: 送られた記録を確かめる。now は受け付けた時刻、challengeStart は挑戦の開始日時（ミリ秒）
 */
export function verifySubmission(
  sub: ScoreSubmission,
  now: number,
  challengeStart: number | null,
): VerifyResult {
  const no = (reason: string): VerifyResult => ({ ok: false, reason });
  if (sub.v !== SUBMISSION_VERSION) return no('version');
  if (!Number.isInteger(sub.seed) || sub.seed < 0) return no('seed');

  // 期間と地域
  if (sub.mode === 'challenge') {
    const ch = currentChallenge(now, challengeStart);
    // 期間の切り替わりの直前に出撃した分は、前の期間として受け付ける（10分まで）
    const prev = currentChallenge(now - 10 * 60 * 1000, challengeStart);
    const okCh = [ch, prev].find((c) => c && c.period === sub.season);
    if (!okCh) return no('season');
    if (sub.seed !== okCh.seed || sub.regionId !== okCh.def.regionId) return no('challenge');
    if (sub.hero !== null) return no('hero');
  } else if (sub.mode === 'endless') {
    const s = endlessSeason(now);
    if (sub.season !== s && sub.season !== endlessSeason(now - 10 * 60 * 1000)) return no('season');
    if (sub.regionId !== 'endless') return no('region');
    if (!sub.hero || !validHero(sub.hero)) return no('hero');
  } else return no('mode');

  // 装備と配置
  const items = new Map<string, ItemInstance>();
  for (const it of sub.items) {
    if (!validItem(it) || items.has(it.uid)) return no('item');
    items.set(it.uid, it);
  }
  const lo = sub.loadout;
  if (!validLoadout(lo, items)) return no('loadout');
  const maxSlots =
    CONSUMABLE.baseSlots + UPGRADES.consumableSlots.effect * UPGRADES.consumableSlots.maxLevel;
  if (
    !Number.isInteger(sub.consumableSlots) ||
    sub.consumableSlots < 0 ||
    sub.consumableSlots > maxSlots
  )
    return no('slots');
  if (lo.consumables.length > sub.consumableSlots) return no('slots');
  if (sub.mode === 'challenge') {
    const ch =
      currentChallenge(now, challengeStart) ??
      currentChallenge(now - 10 * 60 * 1000, challengeStart);
    if (ch && checkRules(lo, items, ch.def.rules).length > 0) return no('rules');
  }

  // 再生して、結果が同じか
  if (!Array.isArray(sub.inputs) || sub.inputs.length > 200) return no('inputs');
  const hero = sub.hero ? heroFrom(sub.hero, sub.hero.stars) : BASE_HERO_STATS;
  const cfg: RunConfig = {
    seed: sub.seed,
    regionId: sub.regionId,
    loadout: lo,
    items,
    hero,
    consumableSlots: sub.consumableSlots,
    noLoot: true,
  };
  const r = replayRun(cfg, sub.inputs);
  if (!r) return no('replay');
  const claimed = {
    ...r,
    reachedLoop: sub.claim.reachedLoop,
    ticks: sub.claim.ticks,
    stats: { ...r.stats, totalDamage: sub.claim.totalDamage, maxStep: sub.claim.maxStep },
  };
  if (!sameResult(claimed, r)) return no('mismatch');
  return {
    ok: true,
    score: rankScore(sub.mode, { totalDamage: r.stats.totalDamage, reachedLoop: r.reachedLoop }),
    totalDamage: r.stats.totalDamage,
    reachedLoop: r.reachedLoop,
  };
}

function validHero(h: HeroBasis): boolean {
  const late = REGIONS.length - 3;
  const ok = (v: number, id: 'maxHp' | 'atb' | 'attack' | 'runTime') => {
    const d = UPGRADES[id];
    const max = d.maxLevel + (d.perRegionLevels ?? 0) * late;
    return Number.isInteger(v) && v >= 0 && v <= max;
  };
  const maxStars = REGIONS.length * PROGRESS.starLoops.length;
  return (
    ok(h.maxHp, 'maxHp') &&
    ok(h.atb, 'atb') &&
    ok(h.attack, 'attack') &&
    ok(h.runTime, 'runTime') &&
    Number.isInteger(h.stars) &&
    h.stars >= 0 &&
    h.stars <= maxStars
  );
}

function validItem(it: ItemInstance): boolean {
  if (!it || typeof it.uid !== 'string' || typeof it.defId !== 'string') return false;
  let def;
  try {
    def = getItemDef(it.defId);
  } catch {
    return false;
  }
  if (!allowsRarity(it.defId, it.rarity)) return false;
  if (!Array.isArray(it.exits) || new Set(it.exits).size !== it.exits.length) return false;
  if (!it.exits.every((d) => DIRS.includes(d))) return false;
  // 出口の数: 消耗品は0、アーティファクトは決まった数、ほかは4つまで（合成で増えることがある）
  if (def.kind === 'consumable' && it.exits.length !== 0) return false;
  if (def.artifact && it.exits.length !== def.artifact.exits.length) return false;
  if (def.artifact && (it.affixes?.length ?? 0) > 0) return false;
  const aff = it.affixes ?? [];
  const cands = affixCandidates(def);
  const c = AFFIX_COUNT[it.rarity];
  if (aff.length > Math.min(cands.length, c.base + 1)) return false;
  const seen = new Set<string>();
  for (const a of aff) {
    const d = cands.find((x) => x.id === a.id);
    if (!d || seen.has(a.id) || !Number.isInteger(a.value) || a.value < d.min || a.value > d.max)
      return false;
    seen.add(a.id);
  }
  return true;
}

function validLoadout(lo: Loadout, items: ReadonlyMap<string, ItemInstance>): boolean {
  if (!lo || !Number.isInteger(lo.width) || !Number.isInteger(lo.height)) return false;
  if (
    lo.width < 1 ||
    lo.height < 1 ||
    lo.width > BACKPACK.maxWidth ||
    lo.height > BACKPACK.maxHeight
  )
    return false;
  if (!Array.isArray(lo.cells) || lo.cells.length !== lo.width * lo.height) return false;
  const used = new Set<string>();
  for (const u of lo.cells) {
    if (u === null) continue;
    const it = items.get(u);
    if (!it || used.has(u) || getItemDef(it.defId).kind === 'consumable') return false;
    used.add(u);
  }
  if (!Array.isArray(lo.originOrder) || !lo.originOrder.every((u) => used.has(u))) return false;
  if (!Array.isArray(lo.consumables)) return false;
  for (const u of lo.consumables) {
    const it = items.get(u);
    if (!it || used.has(u) || getItemDef(it.defId).kind !== 'consumable') return false;
    used.add(u);
  }
  return true;
}

/** Season name in the current language ('challenge-3' → '挑戦 第4回', 'endless-24323' → 'エンドレス 2026年12月') */
export function seasonLabel(sid: string): string {
  const [mode, n] = sid.split('-');
  const v = Number(n);
  if (mode === 'challenge') return t('挑戦 第{n}回', { n: v + 1 });
  const month = new Date(Date.UTC(Math.floor(v / 12), v % 12, 1)).toLocaleDateString(locale(), {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  return t('エンドレス {month}', { month });
}

/** Reward per rank band (nothing that makes you stronger: gold and a title). Text goes through t() */
export const RANK_REWARDS: Record<
  RewardBand,
  { gold: number; title: string | null; label: string }
> = {
  top1: { gold: 30000, title: k('上位1%'), label: k('上位1%') },
  top10: { gold: 15000, title: k('上位10%'), label: k('上位10%') },
  top50: { gold: 8000, title: k('上位50%'), label: k('上位50%') },
  joined: { gold: 3000, title: null, label: k('参加') },
};

/** A title is saved as an id ('challenge-3|top1') and shown in the current language */
export function titleId(season: string, band: RewardBand): string {
  return `${season}|${band}`;
}

export function titleText(id: string): string {
  const [season, band] = id.split('|');
  const title = RANK_REWARDS[band as RewardBand]?.title;
  if (!season || !title) return id;
  return t('{season} {title}', { season: seasonLabel(season), title: t(title) });
}
