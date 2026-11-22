import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat, type RunConfig, type RunMastery } from '../src/core/combat';
import { createInitialSave } from '../src/core/save';
import { consumeItems, heroFrom, itemMap, refillConsumables } from '../src/core/economy';
import { runConfig } from '../src/core/runConfig';
import { currentChallenge } from '../src/core/challenge';
import { autoBoard } from '../src/core/autoBoard';
import { allowsRarity } from '../src/core/loot';
import { featureRules, runFeatures } from '../src/core/runRules';
import { emptyStackBoard, stackPut } from '../src/core/stack';
import type { CharmSlots } from '../src/core/charms';
import type { Dir, ItemInstance } from '../src/core/types';
import {
  buildSubmission,
  endlessSeason,
  rankScore,
  verifySubmission,
  type ScoreSubmission,
} from '../src/core/ranking';

const START = Date.UTC(2027, 0, 1);
const NOW = START + 3 * 86_400_000;

/** The first save's gear on the standard stacked board (common only: fits every challenge) */
function playChallenge() {
  const s = createInitialSave();
  const ch = currentChallenge(NOW, START)!;
  const loadout = { ...autoBoard(s.inventory, 'standard'), consumables: s.loadout.consumables };
  const cfg: RunConfig = {
    seed: ch.seed,
    regionId: ch.def.regionId,
    loadout,
    items: itemMap(s),
    hero: BASE_HERO_STATS,
    consumableSlots: 3,
    noLoot: true,
    rules: featureRules(runFeatures('challenge')),
  };
  const c = new Combat(cfg);
  while (!c.ended) {
    if (c.tick === 200) c.useConsumable(0);
    c.step();
  }
  return buildSubmission('challenge', ch.period, cfg, c.result(), s, 0);
}

const best = (d: string) =>
  (['legendary', 'epic', 'rare', 'common'] as const).find((r) => allowsRarity(d, r))!;

/**
 * A strong endless run: a snake over the standard board (three of each gear per cell, the best
 * rarity it comes in, two cells of armor so the hero lasts), a maxed hero and physical mastery
 * Lv30. With seed 78 it beats a boss, takes the relic offered, and sparks トリプル・スラッシュ on the way
 */
function playEndless(): { sub: ScoreSubmission; sparks: string[]; relics: number } {
  const path: [number, string, Dir][] = [
    [0, 'origin_stone', 'right'],
    [1, 'sword', 'right'],
    [2, 'sword', 'right'],
    [3, 'greatsword', 'down'],
    [7, 'steel_armor', 'left'],
    [6, 'war_axe', 'left'],
    [5, 'greatsword', 'left'],
    [4, 'steel_armor', 'down'],
    [8, 'war_axe', 'right'],
    [9, 'greatsword', 'right'],
    [10, 'spear', 'right'],
    [11, 'greatsword', 'right'],
  ];
  const s = createInitialSave();
  const items = new Map<string, ItemInstance>();
  let loadout = emptyStackBoard('standard');
  for (const [cell, d, dir] of path) {
    for (let k = 0; k < (d === 'origin_stone' ? 1 : 3); k++) {
      const it: ItemInstance = {
        uid: `${d}${cell}_${k}`,
        defId: d,
        rarity: d === 'origin_stone' ? 'common' : best(d),
        exits: [dir],
        rerollCount: 0,
      };
      items.set(it.uid, it);
      loadout = stackPut(loadout, items, it.uid, cell).loadout;
    }
  }
  s.upgrades = { ...s.upgrades, maxHp: 50, atb: 20, attack: 100, runTime: 5 };
  const mastery: RunMastery = { levels: { physical: 30 }, learned: [] };
  const charms: CharmSlots = [
    { uid: 'c1', defId: 'combo_necklace', rarity: 'rare' },
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  const cfg: RunConfig = {
    seed: 78,
    regionId: 'endless',
    loadout,
    items,
    hero: heroFrom(s.upgrades, 18),
    consumableSlots: 0,
    noLoot: true,
    rules: featureRules(runFeatures('endless')),
    mastery,
    relics: {},
    charms,
  };
  const c = new Combat(cfg);
  let relics = 0;
  while (!c.ended) {
    if (c.relicOffer) {
      const id = c.relicOffer.ids[0]!;
      if (c.placeRelic(id, 1)) relics++;
      else c.skipRelic();
    }
    c.step();
  }
  const r = c.result();
  const sub = buildSubmission('endless', endlessSeason(NOW), cfg, r, s, 18);
  return { sub, sparks: r.stats.sparks ?? [], relics };
}

const verify = (sub: ScoreSubmission) =>
  verifySubmission(JSON.parse(JSON.stringify(sub)), NOW, START);
const fake = (sub: ScoreSubmission, f: (x: ScoreSubmission) => void) => {
  const x = JSON.parse(JSON.stringify(sub)) as ScoreSubmission;
  f(x);
  return verifySubmission(x, NOW, START);
};

describe('ランキングの記録の確認', () => {
  it('v4: 挑戦の記録が確認を通る（重ねる標準盤面）。スコアは合計ダメージ', () => {
    const sub = playChallenge();
    expect(sub.v).toBe(4);
    expect(sub.loadout.board).toBe('standard');
    expect(sub.mastery).toBeNull();
    expect(sub.charms).toBeNull();
    const v = verify(sub);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.score).toBe(Math.floor(sub.claim.totalDamage));
  });

  it('結果を盛る・装備を強くする・期間や種を変えると、はじく', () => {
    const sub = playChallenge();
    expect(fake(sub, (x) => (x.claim.totalDamage *= 2))).toEqual({ ok: false, reason: 'mismatch' });
    expect(fake(sub, (x) => (x.items[2]!.rarity = 'legendary'))).toMatchObject({ ok: false });
    expect(fake(sub, (x) => (x.season = 5))).toEqual({ ok: false, reason: 'season' });
    expect(fake(sub, (x) => (x.seed += 1))).toEqual({ ok: false, reason: 'challenge' });
    expect(
      fake(sub, (x) => (x.hero = { maxHp: 0, atb: 0, attack: 0, runTime: 0, stars: 0 })),
    ).toEqual({ ok: false, reason: 'hero' });
    expect(
      fake(sub, (x) => (x.items[0]!.affixes = [{ id: 'sharp' as never, value: 999 }])),
    ).toMatchObject({ ok: false });
  });

  it('∞ の記録は、結果の画面が薬を減らし補充したあとに送っても通る（ランを始めたときの配置のまま）', () => {
    const s = createInitialSave();
    s.upgrades = { ...s.upgrades, maxHp: 50, atb: 20, attack: 100, runTime: 5 };
    // A spare potion in storage, so the refill puts one back into the slot
    s.inventory.push({
      uid: 'spare',
      defId: 'potion',
      rarity: 'common',
      exits: [],
      rerollCount: 0,
    });
    const cfg = runConfig(s, 'endless', 'endless', 12345);
    const c = new Combat(cfg);
    let used = false;
    while (!c.ended) {
      if (c.tick === 100 && !used) used = c.useConsumable(0);
      if (c.relicOffer) c.skipRelic();
      c.step();
    }
    expect(used).toBe(true);
    const r = c.result();
    const sub = buildSubmission('endless', endlessSeason(NOW), cfg, r, s, 0);
    // What the result screen does before it sends the record
    consumeItems(s, r.usedConsumables);
    refillConsumables(s);
    expect(verify(sub)).toMatchObject({ ok: true });
  });

  it('v2: ∞ の記録が通る。途中で閃き、遺物を選んだランでも一致する', () => {
    const { sub, sparks, relics } = playEndless();
    expect(sparks).toContain('triple');
    expect(relics).toBeGreaterThanOrEqual(1);
    // The run's start: the technique sparked mid-run is not in what was sent
    expect(sub.mastery).toEqual({ levels: { physical: 30 }, learned: [] });
    expect(sub.charms![0]).toMatchObject({ defId: 'combo_necklace' });
    expect(verify(sub).ok).toBe(true);
    const cheat = JSON.parse(JSON.stringify(sub)) as ScoreSubmission;
    cheat.hero!.attack = 999;
    expect(verifySubmission(cheat, NOW, START)).toEqual({ ok: false, reason: 'hero' });
    expect(rankScore('endless', { reachedLoop: 3, totalDamage: 5 })).toBeGreaterThan(
      rankScore('endless', { reachedLoop: 2, totalDamage: 1e9 }),
    );
  });

  it('おかしな盤面ははじく（違う装備を重ねる・深さ超え・起点2つ・穴・ない盤面）', () => {
    const sub = playChallenge();
    const add = (x: ScoreSubmission, it: Partial<ItemInstance> & { uid: string; defId: string }) =>
      x.items.push({ rarity: 'common', exits: ['right'], rerollCount: 0, ...it } as ItemInstance);
    const top = (x: ScoreSubmission) =>
      x.loadout.cells.findIndex((u, i) => u && i > 0 && x.loadout.under![i]!.length === 0);
    // Another kind of gear under a top
    expect(
      fake(sub, (x) => {
        add(x, { uid: 'zz', defId: 'greatsword', rarity: best('greatsword') });
        x.loadout.under![top(x)]!.push('zz');
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
    // Deeper than the board allows: four of the same gear
    expect(
      fake(sub, (x) => {
        const i = top(x);
        const defId = x.items.find((it) => it.uid === x.loadout.cells[i])!.defId;
        for (const u of ['d1', 'd2', 'd3']) {
          add(x, { uid: u, defId });
          x.loadout.under![i]!.push(u);
        }
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
    // A second origin stone
    expect(
      fake(sub, (x) => {
        add(x, { uid: 'o2', defId: 'origin_stone' });
        const free = x.loadout.cells.indexOf(null);
        x.loadout.cells[free] = 'o2';
        x.loadout.originOrder.push('o2');
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
    // A board that does not exist
    expect(fake(sub, (x) => (x.loadout.board = 'nope' as never))).toEqual({
      ok: false,
      reason: 'loadout',
    });
    // Gear in a hole: the crystal board (5×4) with the origin stone on its corner
    const { sub: e } = playEndless();
    expect(
      fake(e, (x) => {
        const l = emptyStackBoard('crystal');
        const o = x.items.find((it) => it.defId === 'origin_stone')!.uid;
        l.cells[0] = o;
        l.originOrder = [o];
        x.loadout = l;
        x.charms = new Array(l.width + l.height).fill(null);
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
  });

  it('挑戦で標準以外の盤面ははじく', () => {
    const sub = playChallenge();
    expect(
      fake(sub, (x) => {
        const l = emptyStackBoard('small');
        const o = x.items.find((it) => it.defId === 'origin_stone')!.uid;
        l.cells[0] = o;
        l.originOrder = [o];
        l.consumables = x.loadout.consumables;
        x.loadout = l;
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
  });

  it('熟練: 31 や負の数、知らない属性、知らない技、重複した技ははじく', () => {
    const { sub } = playEndless();
    for (const f of [
      (x: ScoreSubmission) => (x.mastery!.levels.physical = 31),
      (x: ScoreSubmission) => (x.mastery!.levels.physical = -1),
      (x: ScoreSubmission) => (x.mastery!.levels.physical = 1.5),
      (x: ScoreSubmission) => ((x.mastery!.levels as Record<string, number>).nope = 1),
      (x: ScoreSubmission) => (x.mastery!.learned = ['nope']),
      (x: ScoreSubmission) => (x.mastery!.learned = ['triple', 'triple']),
      (x: ScoreSubmission) => (x.mastery = null),
    ])
      expect(fake(sub, f)).toEqual({ ok: false, reason: 'mastery' });
  });

  it('アクセサリー: 知らないもの、二重の uid、スロット数の違いははじく', () => {
    const { sub } = playEndless();
    for (const f of [
      (x: ScoreSubmission) =>
        ((x.charms as unknown[])[0] = { uid: 'c1', defId: 'nope', rarity: 'rare' }),
      (x: ScoreSubmission) =>
        ((x.charms as unknown[])[0] = { uid: 'c1', defId: 'combo_necklace', rarity: 'bad' }),
      (x: ScoreSubmission) =>
        ((x.charms as unknown[])[1] = { uid: 'c1', defId: 'match_ring', rarity: 'rare' }),
      (x: ScoreSubmission) => (x.charms = [...x.charms!, null]),
      (x: ScoreSubmission) => (x.charms = null),
    ])
      expect(fake(sub, f)).toEqual({ ok: false, reason: 'charms' });
  });

  it('挑戦で熟練やアクセサリーが付いていたらはじく', () => {
    const sub = playChallenge();
    expect(fake(sub, (x) => (x.mastery = { levels: {}, learned: [] }))).toEqual({
      ok: false,
      reason: 'mastery',
    });
    expect(fake(sub, (x) => (x.charms = new Array(7).fill(null)))).toEqual({
      ok: false,
      reason: 'charms',
    });
  });

  it('版 1 は受け付けない', () => {
    const sub = playChallenge();
    expect(fake(sub, (x) => (x.v = 1))).toEqual({ ok: false, reason: 'version' });
  });

  it('記録の版は 4。連鎖倍率に上限があった版 3 と、その前の版 2 は受け付けない', () => {
    const sub = playChallenge();
    expect(sub.v).toBe(4);
    expect(fake(sub, (x) => (x.v = 3))).toEqual({ ok: false, reason: 'version' });
    expect(fake(sub, (x) => (x.v = 2))).toEqual({ ok: false, reason: 'version' });
  });
});

describe('シーズンの呼び名と報酬', () => {
  it('挑戦は回、エンドレスは年月', async () => {
    const { seasonLabel, endlessSeason } = await import('../src/core/ranking');
    expect(seasonLabel('challenge-3')).toBe('挑戦 第4回');
    expect(seasonLabel(`endless-${endlessSeason(Date.UTC(2026, 11, 5))}`)).toBe(
      'エンドレス 2026年12月',
    );
  });
  it('順位帯', async () => {
    const { rewardBand } = await import('../src/core/names');
    expect(rewardBand(1, 1000)).toBe('top1');
    expect(rewardBand(50, 1000)).toBe('top10');
    expect(rewardBand(400, 1000)).toBe('top50');
    expect(rewardBand(900, 1000)).toBe('joined');
  });
});
