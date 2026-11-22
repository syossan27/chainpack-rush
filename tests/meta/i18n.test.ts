import { afterEach, describe, expect, it } from 'vitest';
import { scan } from '../../tools/i18nScan';
import {
  LANGS,
  detectLang,
  placeholders,
  registerDict,
  setLang,
  stripContext,
  t,
} from '../../src/i18n';
import { DICT_PARTS, DICTS, type TargetLang } from '../../src/i18n/dicts';
import type { Domain } from '../../src/i18n/dicts/types';
import { READY_LANGS } from '../../src/i18n/setup';
import { BASE_HERO_STATS, Combat, type RunConfig } from '../../src/core/combat';
import { createInitialSave } from '../../src/core/save';
import { itemMap } from '../../src/core/economy';
import { replayRun, sameResult } from '../../src/core/replay';

const { keys, violations } = scan();
const TARGETS = Object.keys(DICT_PARTS) as TargetLang[];

afterEach(() => {
  for (const l of TARGETS) registerDict(l, DICTS[l]);
  setLang('ja');
});

describe('翻訳の準備', () => {
  it('画面に出る日本語は、すべて t() か k() を通っている', () => {
    const list = violations.map((v) => `${v.file}:${v.line} ${v.text.slice(0, 60)}`);
    expect(list).toEqual([]);
  });

  it('文の中の差し込みは {名前} の形（％記号などの書式は使わない）', () => {
    for (const k of keys.keys()) expect(k, k).not.toMatch(/%[sd]|\$\{/);
  });
});

describe.each(TARGETS)('辞書 %s', (l) => {
  const parts = DICT_PARTS[l];

  it('使われていない訳がない（元の文を変えたら訳も直す）', () => {
    const stale = (['ui', 'data'] as Domain[]).flatMap((d) =>
      Object.keys(parts[d])
        .filter((k) => keys.get(k)?.domain !== d)
        .map((k) => `[${d}] ${k}${keys.has(k) ? ` (belongs in ${keys.get(k)!.domain})` : ''}`),
    );
    expect(stale).toEqual([]);
  });

  it('空の訳がない', () => {
    const empty = (['ui', 'data'] as Domain[]).flatMap((d) =>
      Object.entries(parts[d])
        .filter(([, v]) => !v.trim())
        .map(([k]) => `[${d}] ${k}`),
    );
    expect(empty).toEqual([]);
  });

  it('差し込みの名前が元の文と同じ', () => {
    const bad = (['ui', 'data'] as Domain[]).flatMap((d) =>
      Object.entries(parts[d])
        .filter(
          ([k, v]) => v.trim() && placeholders(v).join() !== placeholders(stripContext(k)).join(),
        )
        .map(([k, v]) => `${k} → ${v}`),
    );
    expect(bad).toEqual([]);
  });

  it.runIf(READY_LANGS.includes(l))('すべての文が訳されている', () => {
    const missing = [...keys.values()]
      .filter((k) => !(k.key in parts[k.domain]))
      .map((k) => `[${k.domain}] ${k.key}  ${k.refs[0]}`);
    expect(missing).toEqual([]);
  });
});

describe('言語の選び方', () => {
  it.each([
    ['ja-JP', 'ja', '日本語'],
    ['zh-CN', 'zh-Hant', '中国語は繁体字'],
    ['zh-TW', 'zh-Hant', '中国語は繁体字'],
    ['ko-KR', 'ko', '韓国語'],
    ['pt-PT', 'pt-BR', 'ポルトガル語はブラジル版'],
    ['es-MX', 'es', '地域つきの符号は言語で'],
    ['de-AT', 'de', '地域つきの符号は言語で'],
    ['fr-CA', 'fr', '地域つきの符号は言語で'],
    ['in-ID', 'id', '古いインドネシア語の符号'],
    ['id', 'id', 'インドネシア語'],
  ])('端末の言語 %s からは %s を選ぶ（%s）', (device, lang) => {
    expect(detectLang([device], LANGS)).toBe(lang);
  });

  it('知らない言語は英語にする（it は id と取り違えない）', () => {
    expect(detectLang(['it-IT', 'ru'], LANGS)).toBe('en');
  });

  it('まだ出していない言語は選ばない', () => {
    expect(detectLang(['de-DE', 'en-US'], ['ja', 'en'])).toBe('en');
    expect(detectLang(['de-DE'], ['ja'])).toBe('ja');
  });

  it('同じ日本語で意味が違うときの印（|）は、日本語では見せない', () => {
    expect(t('出撃|stat')).toBe('出撃');
  });

  it('印（|）の付いた文も、ほかの言語では訳を出す', () => {
    registerDict('en', { '出撃|stat': 'Runs' });
    setLang('en');
    expect(t('出撃|stat')).toBe('Runs');
  });

  it('訳がない文は日本語で出す', () => {
    registerDict('en', { '出撃|stat': 'Runs' });
    setLang('en');
    expect(t('出撃 {n}回', { n: 3 })).toBe('出撃 3回');
  });
});

describe('言語を変えても勝負の結果は同じ（ランキングの検証が通る）', () => {
  it('どの言語で遊んでも、記録の再生結果は日本語のときと一致する', () => {
    const cfgOf = (seed: number): RunConfig => {
      const s = createInitialSave();
      return {
        seed,
        regionId: 'cave',
        loadout: s.loadout,
        items: itemMap(s),
        hero: { ...BASE_HERO_STATS, maxHp: 400 },
        consumableSlots: 2,
        noLoot: true,
      };
    };
    const play = () => {
      const c = new Combat(cfgOf(42));
      while (!c.ended) {
        if (c.tick === 300) c.useConsumable(0);
        c.step();
      }
      return c.result();
    };
    const ja = play();
    // A pseudo-translation that changes every string
    const pseudo = Object.fromEntries([...keys.keys()].map((k) => [k, `«${k}»`]));
    registerDict('de', pseudo);
    setLang('de');
    const de = play();
    expect(sameResult(ja, de)).toBe(true);
    const again = replayRun(cfgOf(42), de.inputs ?? []);
    expect(again && sameResult(ja, again)).toBe(true);
  });
});
