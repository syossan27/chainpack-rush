import { t } from '../i18n';

// ランキングの表示名。不適切な名前を防ぐため、決まった言葉の組み合わせから選ぶ（自由入力にしない）
export const NAME_FIRST = [
  'はやての',
  'ひかりの',
  'ほのおの',
  'こおりの',
  'いかずちの',
  'かぜの',
  'やみの',
  'ほしの',
  'つきの',
  'たいようの',
  'まよなかの',
  'あかつきの',
  'しろがねの',
  'こがねの',
  'くろがねの',
  'みどりの',
  'あおぞらの',
  'ゆうやけの',
  'しずかな',
  'げんきな',
  'のんびり',
  'ちいさな',
  'おおきな',
  'まっすぐな',
] as const;

export const NAME_SECOND = [
  'ゆうしゃ',
  'けんし',
  'まほうつかい',
  'ぼうけんしゃ',
  'かじや',
  'たびびと',
  'きし',
  'かりゅうど',
  'スライム',
  'ドラゴン',
  'ゴーレム',
  'ねこ',
  'いぬ',
  'うさぎ',
  'ふくろう',
  'くま',
  'ほうせき',
  'たいまつ',
  'たて',
  'つるぎ',
  'おの',
  'やり',
  'ゆみ',
  'バックパック',
] as const;

/** 表示名（言葉の番号2つ ＋ 4桁の番号）。番号はかぶり分け */
export interface DisplayName {
  a: number;
  b: number;
  tag: number;
}

export function validName(n: unknown): n is DisplayName {
  if (typeof n !== 'object' || n === null) return false;
  const o = n as Record<string, unknown>;
  const int = (v: unknown, max: number) =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) < max;
  return int(o.a, NAME_FIRST.length) && int(o.b, NAME_SECOND.length) && int(o.tag, 10000);
}

/**
 * The name in the current language. Word order is per language ('{first}{second}|name'), and each
 * NAME_FIRST word must read naturally with any NAME_SECOND word (no gender/number agreement).
 */
export function nameText(n: DisplayName): string {
  const words = t('{first}{second}|name', {
    first: t(NAME_FIRST[n.a] ?? ''),
    second: t(NAME_SECOND[n.b] ?? ''),
  });
  return `${words}#${String(n.tag).padStart(4, '0')}`;
}

/** A ranking row's name; null means the player never picked one */
export function rowName(n: DisplayName | null): string {
  return n ? nameText(n) : t('名無しの冒険者');
}

export function sameName(a: DisplayName | null, b: DisplayName | null): boolean {
  return !!a && !!b && a.a === b.a && a.b === b.b && a.tag === b.tag;
}

/** ランキングの報酬の順位帯（上位から）。報酬の中身はゲーム側で決める */
export type RewardBand = 'top1' | 'top10' | 'top50' | 'joined';

export function rewardBand(rank: number, total: number): RewardBand {
  const p = rank / Math.max(1, total);
  return p <= 0.01 ? 'top1' : p <= 0.1 ? 'top10' : p <= 0.5 ? 'top50' : 'joined';
}
