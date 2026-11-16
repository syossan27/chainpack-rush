// Font preloading per language
import { LANG_NAMES, LANGS, lang } from '../i18n';
import { GLYPHS } from './kit/glyphs.generated';
import { font } from './theme';

const FONT_TIMEOUT_MS = 2500;

/**
 * Preload the active language's font for the characters it draws, plus each language's own name
 * in its own font (language picker). Fonts are split into subsets, and canvas text drawn before
 * they arrive stays in a fallback font. Gives up after a timeout and continues with fallbacks.
 */
export function loadFonts(): Promise<unknown> {
  const l = lang();
  const loads = [
    ...['800', '500'].map((w) => document.fonts.load(`${w} 32px ${font(l)}`, GLYPHS[l])),
    ...LANGS.map((o) => document.fonts.load(`800 32px ${font(o)}`, LANG_NAMES[o])),
  ];
  const fonts = Promise.all(loads).catch(() => undefined);
  const timeout = new Promise((r) => setTimeout(r, FONT_TIMEOUT_MS));
  return Promise.race([fonts, timeout]);
}
