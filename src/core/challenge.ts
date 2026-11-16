// 2週替わりの挑戦の時刻・制限の判定（純粋な関数）
import {
  CHALLENGES,
  CHALLENGE_DAYS,
  type ChallengeDef,
  type ChallengeRules,
} from '../data/challenges';
import { getItemDef, RARITY_NAMES, ELEMENT_NAMES } from '../data/items';
import { t } from '../i18n';
import type { ItemInstance, Loadout, Rarity } from './types';

/**
 * 最初の挑戦が始まる日時（リリースの2週間後に合わせて設定する）。null の間は「リリースから2週間後に開放」の予告だけ出す。
 * 開発中は URL に ?challenge=open を付けると、今日から始まったことにして遊べる
 */
export const CHALLENGE_START: string | null = null;

const DAY = 24 * 60 * 60 * 1000;
const RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export interface ChallengeNow {
  def: ChallengeDef;
  /** 期間の番号（0から）。乱数の種とランキングの区切りに使う */
  period: number;
  seed: number;
  startsAt: number;
  endsAt: number;
}

/** 開始日時（ミリ秒）。まだ決まっていなければ null */
export function challengeStart(forceOpenFrom?: number): number | null {
  if (forceOpenFrom !== undefined) return forceOpenFrom;
  return CHALLENGE_START ? Date.parse(CHALLENGE_START) : null;
}

/** 今の挑戦（まだ始まっていなければ null） */
export function currentChallenge(now: number, start: number | null): ChallengeNow | null {
  if (start === null || now < start) return null;
  const period = Math.floor((now - start) / (CHALLENGE_DAYS * DAY));
  const def = CHALLENGES[period % CHALLENGES.length]!;
  const startsAt = start + period * CHALLENGE_DAYS * DAY;
  return {
    def,
    period,
    seed: seedOf(`${def.id}:${period}`),
    startsAt,
    endsAt: startsAt + CHALLENGE_DAYS * DAY,
  };
}

/** 最初の挑戦（予告に出す） */
export function firstChallenge(): ChallengeDef {
  return CHALLENGES[0]!;
}

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647 || 1;
}

/** 制限のひとこと（画面に出す） */
export function rulesText(r: ChallengeRules): string[] {
  const out = [
    t('レアリティは{rarity}まで（起点は問わない）', { rarity: t(RARITY_NAMES[r.maxRarity] ?? '') }),
    t('アーティファクトは使えない'),
  ];
  if (r.maxOrigins) out.push(t('起点は{n}つまで', { n: r.maxOrigins }));
  if (r.elements)
    out.push(
      t('攻撃装備は {elements} だけ', {
        elements: r.elements.map((e) => t(ELEMENT_NAMES[e] ?? '')).join(t('・|sep')),
      }),
    );
  if (r.bannedKinds?.includes('defense')) out.push(t('防具は使えない'));
  out.push(t('強化と★は使わない（勇者は最初の強さ）'));
  return out;
}

/** この装備を挑戦で置けるか。置けなければ理由（起点の数は見ない） */
export function itemViolation(it: ItemInstance, r: ChallengeRules): string | null {
  const d = getItemDef(it.defId);
  const item = t(d.name);
  if (d.artifact) return t('アーティファクト（{item}）は使えない', { item });
  // 起点は道筋を作るだけなので、レアリティは問わない
  if (d.kind !== 'origin' && RANK[it.rarity] > RANK[r.maxRarity])
    return t('{rarity}より上の装備（{item}）がある', {
      rarity: t(RARITY_NAMES[r.maxRarity] ?? ''),
      item,
    });
  if (r.elements && d.kind === 'attack' && !r.elements.includes(d.element ?? 'physical'))
    return t('使えない属性の装備（{item}）がある', { item });
  if (r.bannedKinds?.includes(d.kind)) return t('使えない種類の装備（{item}）がある', { item });
  return null;
}

/** 並べ方が制限に合っているか。合っていなければ、その理由（空なら出撃できる） */
export function checkRules(
  loadout: Loadout,
  items: ReadonlyMap<string, ItemInstance>,
  r: ChallengeRules,
): string[] {
  const out = new Set<string>();
  let origins = 0;
  for (const uid of loadout.cells) {
    if (!uid) continue;
    const it = items.get(uid);
    if (!it) continue;
    const v = itemViolation(it, r);
    if (v) out.add(v);
    if (getItemDef(it.defId).kind === 'origin') origins++;
  }
  if (r.maxOrigins && origins > r.maxOrigins)
    out.add(t('起点が{n}つある（{max}つまで）', { n: origins, max: r.maxOrigins }));
  if (origins === 0) out.add(t('起点がない'));
  return [...out];
}
