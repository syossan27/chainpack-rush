// Collect the characters each language draws and write src/ui/kit/glyphs.generated.ts.
// Fonts are split into unicode-range subsets, so at boot only the active language's set is preloaded.
// - ja: every non-ASCII character in src (except the translation dictionaries)
// - other languages: the characters in their dictionary, plus symbols used everywhere
// Every set also contains each language's own name (for the language picker).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANG_NAMES, LANGS, type Lang } from '../src/i18n';
import { EN } from '../src/i18n/dicts/en';
import { KO } from '../src/i18n/dicts/ko';
import { ZH_HANT } from '../src/i18n/dicts/zh-Hant';

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('glyphs.generated.ts')) out.push(p);
  }
}

const DICT_FILES: Record<Exclude<Lang, 'ja'>, string> = {
  en: 'src/i18n/dicts/en.ts',
  'zh-Hant': 'src/i18n/dicts/zh-Hant.ts',
  ko: 'src/i18n/dicts/ko.ts',
};

/** Kana, Han and Hangul: language-specific script */
const isScript = (cp: number) =>
  (cp >= 0x3040 && cp <= 0x30ff) || // kana
  (cp >= 0x3400 && cp <= 0x9fff) || // Han
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0xac00 && cp <= 0xd7af) || // Hangul syllables
  (cp >= 0x1100 && cp <= 0x11ff) ||
  (cp >= 0x3130 && cp <= 0x318f);

const files: string[] = [];
walk('src', files);
const dictPaths = new Set(Object.values(DICT_FILES));
const ja = new Set<string>();
const symbols = new Set<string>();
for (const f of files) {
  if (dictPaths.has(f)) continue;
  for (const ch of readFileSync(f, 'utf8')) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x7f) continue;
    ja.add(ch);
    if (!isScript(cp)) symbols.add(ch);
  }
}
const base = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-×%/.:,\'!?()[]{}&#"';
const names = Object.values(LANG_NAMES).join('');

const sets: Record<Lang, Set<string>> = {
  ja: new Set([...ja, ...base, ...names]),
  en: new Set([...symbols, ...base, ...names]),
  'zh-Hant': new Set([...symbols, ...base, ...names]),
  ko: new Set([...symbols, ...base, ...names]),
};
// Only the translated values (the keys are Japanese)
const DICTS: Record<Exclude<Lang, 'ja'>, Readonly<Record<string, string>>> = {
  en: EN,
  'zh-Hant': ZH_HANT,
  ko: KO,
};
for (const [l, dict] of Object.entries(DICTS) as [Lang, Record<string, string>][]) {
  for (const v of Object.values(dict))
    for (const ch of v) if (ch.codePointAt(0)! > 0x7f) sets[l].add(ch);
}

const out = Object.fromEntries(LANGS.map((l) => [l, [...sets[l]].sort().join('')]));
writeFileSync(
  'src/ui/kit/glyphs.generated.ts',
  `// 自動生成（tools/genGlyphs.ts）。編集しない\nexport const GLYPHS: Record<string, string> = ${JSON.stringify(out, null, 2)};\n`,
);
console.log(`glyphs: ${LANGS.map((l) => `${l} ${sets[l].size}`).join(', ')}`);
