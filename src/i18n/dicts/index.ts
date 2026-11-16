// Every translation, by language (Japanese is the source and has no dictionary)
import type { Lang } from '../index';
import { PARTS as DE } from './de';
import { PARTS as EN } from './en';
import { PARTS as ES } from './es';
import { PARTS as FR } from './fr';
import { PARTS as ID } from './id';
import { PARTS as KO } from './ko';
import { PARTS as PT_BR } from './pt-BR';
import type { Dict, DictParts } from './types';
import { PARTS as ZH_HANT } from './zh-Hant';

export type TargetLang = Exclude<Lang, 'ja'>;

export const DICT_PARTS: Record<TargetLang, DictParts> = {
  en: EN,
  'zh-Hant': ZH_HANT,
  ko: KO,
  'pt-BR': PT_BR,
  es: ES,
  de: DE,
  fr: FR,
  id: ID,
};

export const DICTS = Object.fromEntries(
  Object.entries(DICT_PARTS).map(([l, p]) => [l, { ...p.ui, ...p.data }]),
) as Record<TargetLang, Dict>;
