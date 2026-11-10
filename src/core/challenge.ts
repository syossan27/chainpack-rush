// 2週替わりの挑戦の時刻・制限の判定（純粋な関数）
import {
  CHALLENGES,
  CHALLENGE_DAYS,
  type ChallengeDef,
  type ChallengeRules,
} from '../data/challenges';
import { getItemDef, RARITY_NAMES, ELEMENT_NAMES } from '../data/items';
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
    `レアリティは${RARITY_NAMES[r.maxRarity]}まで（起点は問わない）`,
    'アーティファクトは使えない',
  ];
  if (r.maxOrigins) out.push(`起点は${r.maxOrigins}つまで`);
  if (r.elements) out.push(`攻撃装備は ${r.elements.map((e) => ELEMENT_NAMES[e]).join('・')} だけ`);
  if (r.bannedKinds?.includes('defense')) out.push('防具は使えない');
  out.push('強化と★は使わない（勇者は最初の強さ）');
  return out;
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
    const d = getItemDef(it.defId);
    if (d.artifact) out.add(`アーティファクト（${d.name}）は使えない`);
    // 起点は道筋を作るだけなので、レアリティは問わない
    else if (d.kind !== 'origin' && RANK[it.rarity] > RANK[r.maxRarity])
      out.add(`${RARITY_NAMES[r.maxRarity]}より上の装備（${d.name}）がある`);
    if (d.kind === 'origin') origins++;
    if (r.elements && d.kind === 'attack' && !r.elements.includes(d.element ?? 'physical'))
      out.add(`使えない属性の装備（${d.name}）がある`);
    if (r.bannedKinds?.includes(d.kind)) out.add(`使えない種類の装備（${d.name}）がある`);
  }
  if (r.maxOrigins && origins > r.maxOrigins)
    out.add(`起点が${origins}つある（${r.maxOrigins}つまで）`);
  if (origins === 0) out.add('起点がない');
  return [...out];
}
