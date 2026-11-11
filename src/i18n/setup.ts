// Client-side language setup: registers the dictionaries and decides the language at boot.
import { EN } from './dicts/en';
import { KO } from './dicts/ko';
import { ZH_HANT } from './dicts/zh-Hant';
import { LANGS, detectLang, registerDict, setLang, type Lang } from './index';

registerDict('en', EN);
registerDict('zh-Hant', ZH_HANT);
registerDict('ko', KO);

/**
 * Languages players can pick (and auto-detection can choose).
 * A language is added here only once its translation is complete, so a deploy mid-way never
 * shows a half-translated UI.
 */
export const READY_LANGS: readonly Lang[] = ['ja'];

/** Setting value: a language, or 'auto' (follow the device) */
export type LangSetting = Lang | 'auto';

export function isLangSetting(v: unknown): v is LangSetting {
  return v === 'auto' || LANGS.includes(v as Lang);
}

/** Resolve the setting to a playable language and apply it */
export function applyLang(setting: LangSetting | undefined): Lang {
  const prefs =
    typeof navigator !== 'undefined'
      ? navigator.languages?.length
        ? navigator.languages
        : [navigator.language]
      : [];
  // Development: ?lang=en forces a language even before its translation is finished
  const forced =
    typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
  const l =
    forced && LANGS.includes(forced as Lang)
      ? (forced as Lang)
      : setting && setting !== 'auto' && READY_LANGS.includes(setting)
        ? setting
        : detectLang(prefs, READY_LANGS);
  setLang(l);
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  return l;
}
