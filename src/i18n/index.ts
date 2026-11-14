// Translation lookup. Keys are the Japanese source strings ("gettext style"), so untranslated
// text falls back to Japanese. Call t() only where text is drawn, never at module scope
// (otherwise the text freezes in the language that was active at load time).
// This module has no client dependencies so src/core (also bundled into functions/) can use it.

export type Lang = 'ja' | 'en' | 'zh-Hant' | 'ko' | 'pt-BR' | 'es' | 'de' | 'fr' | 'id';

export const LANGS: readonly Lang[] = [
  'ja',
  'en',
  'zh-Hant',
  'ko',
  'pt-BR',
  'es',
  'de',
  'fr',
  'id',
];

/** Each language's name in its own script (shown in the language picker) */
export const LANG_NAMES: Record<Lang, string> = {
  ja: '日本語',
  en: 'English',
  'zh-Hant': '繁體中文',
  ko: '한국어',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  id: 'Bahasa Indonesia',
};

/** BCP 47 locale used for numbers and dates */
const LOCALES: Record<Lang, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  'zh-Hant': 'zh-TW',
  ko: 'ko-KR',
  'pt-BR': 'pt-BR',
  es: 'es-419',
  de: 'de-DE',
  fr: 'fr-FR',
  id: 'id-ID',
};

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

/**
 * Translate a Japanese source string and fill {name} placeholders.
 * A key may carry a context after '|' ('出撃|stat') when the same Japanese means different things;
 * the context is dropped when the Japanese text itself is shown.
 */
export function t(key: string, params?: Params): string {
  const s = (current === 'ja' ? undefined : dicts[current]?.[key]) ?? stripContext(key);
  return params ? fill(s, params) : s;
}

/**
 * Mark a Japanese string as a translation key without translating it yet.
 * For constants defined at module scope; pass the value through t() where it is drawn.
 */
export function k<S extends string>(key: S): S {
  return key;
}

export function stripContext(key: string): string {
  const i = key.indexOf('|');
  return i < 0 ? key : key.slice(0, i);
}

export function fill(s: string, params: Params): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Placeholder names used in a string (for tests) */
export function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

/** Device language prefix → game language */
const DETECT: readonly [string, Lang][] = [
  ['ja', 'ja'],
  // Simplified Chinese readers can read Traditional; there is no Simplified version
  ['zh', 'zh-Hant'],
  ['ko', 'ko'],
  ['en', 'en'],
  // European Portuguese readers can read the Brazilian version
  ['pt', 'pt-BR'],
  ['es', 'es'],
  ['de', 'de'],
  ['fr', 'fr'],
  // 'in' is the legacy code for Indonesian (older Android); Malay is close enough to read it
  ['id', 'id'],
  ['in', 'id'],
  ['ms', 'id'],
];

/** Pick the game language from a device language list (navigator.languages) */
export function detectLang(prefs: readonly string[], available: readonly Lang[]): Lang {
  for (const p of prefs) {
    const l = p.toLowerCase();
    const hit = DETECT.find(([prefix]) => l === prefix || l.startsWith(`${prefix}-`));
    if (hit && available.includes(hit[1])) return hit[1];
  }
  return available.includes('en') ? 'en' : 'ja';
}
