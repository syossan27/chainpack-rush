// Translation lookup. Keys are the Japanese source strings ("gettext style"), so untranslated
// text falls back to Japanese. Call t() only where text is drawn, never at module scope
// (otherwise the text freezes in the language that was active at load time).
// This module has no client dependencies so src/core (also bundled into functions/) can use it.

export type Lang = 'ja' | 'en' | 'zh-Hant' | 'ko';

export const LANGS: readonly Lang[] = ['ja', 'en', 'zh-Hant', 'ko'];

/** Each language's name in its own script (shown in the language picker) */
export const LANG_NAMES: Record<Lang, string> = {
  ja: '日本語',
  en: 'English',
  'zh-Hant': '繁體中文',
  ko: '한국어',
};

/** BCP 47 locale used for numbers and dates */
const LOCALES: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US', 'zh-Hant': 'zh-TW', ko: 'ko-KR' };

export type Params = Record<string, string | number>;

const dicts: Partial<Record<Lang, Readonly<Record<string, string>>>> = {};
let current: Lang = 'ja';

export function registerDict(lang: Lang, dict: Readonly<Record<string, string>>): void {
  dicts[lang] = dict;
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function lang(): Lang {
  return current;
}

export function locale(): string {
  return LOCALES[current];
}

/** Format a number for the current language (thousands separators) */
export function num(n: number): string {
  return Math.round(n).toLocaleString(LOCALES[current]);
}

/** Translate a Japanese source string and fill {name} placeholders */
export function t(key: string, params?: Params): string {
  const s = (current === 'ja' ? undefined : dicts[current]?.[key]) ?? key;
  return params ? fill(s, params) : s;
}

export function fill(s: string, params: Params): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Placeholder names used in a string (for tests) */
export function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

/** Pick the game language from a device language list (navigator.languages) */
export function detectLang(prefs: readonly string[], available: readonly Lang[]): Lang {
  for (const p of prefs) {
    const l = p.toLowerCase();
    let cand: Lang | null = null;
    if (l.startsWith('ja')) cand = 'ja';
    // Simplified Chinese readers can read Traditional; there is no Simplified version
    else if (l.startsWith('zh')) cand = 'zh-Hant';
    else if (l.startsWith('ko')) cand = 'ko';
    else if (l.startsWith('en')) cand = 'en';
    if (cand && available.includes(cand)) return cand;
  }
  return available.includes('en') ? 'en' : 'ja';
}
