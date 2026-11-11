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

export function nameText(n: DisplayName): string {
  return `${NAME_FIRST[n.a]}${NAME_SECOND[n.b]}#${String(n.tag).padStart(4, '0')}`;
}

/** ランキングの報酬の順位帯（上位から）。報酬の中身はゲーム側で決める */
export type RewardBand = 'top1' | 'top10' | 'top50' | 'joined';

export function rewardBand(rank: number, total: number): RewardBand {
  const p = rank / Math.max(1, total);
  return p <= 0.01 ? 'top1' : p <= 0.1 ? 'top10' : p <= 0.5 ? 'top50' : 'joined';
}
