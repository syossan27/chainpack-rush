import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat, type RunConfig, type RunMastery } from '../../src/core/combat';
import { createInitialSave } from '../../src/core/save';
import { consumeItems, heroFrom, itemMap, refillConsumables } from '../../src/core/economy';
import { runConfig } from '../../src/core/runConfig';
import { currentChallenge } from '../../src/core/challenge';
import { autoBoard } from '../../src/core/autoBoard';
import { allowsRarity } from '../../src/core/loot';
import { featureRules, runFeatures } from '../../src/core/runRules';
import { emptyStackBoard, stackPut } from '../../src/core/stack';
import type { CharmSlots } from '../../src/core/charms';
import type { Dir, ItemInstance } from '../../src/core/types';
import {
  buildSubmission,
  endlessSeason,
  rankScore,
  verifySubmission,
  type ScoreSubmission,
} from '../../src/core/ranking';

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
  // Cells of a 4 × 3 block at the board's top-left
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
      const at = Math.floor(cell / 4) * loadout.width + (cell % 4);
      loadout = stackPut(loadout, items, it.uid, at).loadout;
    }
  }
  s.upgrades = { ...s.upgrades, maxHp: 50, atb: 20, attack: 100, runTime: 5 };
  const mastery: RunMastery = { levels: { physical: 30 }, learned: [] };
  const charms: CharmSlots = [
    { uid: 'c1', defId: 'combo_necklace', rarity: 'rare' },
    ...new Array<null>(10).fill(null),
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

// Both runs are deterministic and every check works on a copy, so each is played once
let challengeSub: ScoreSubmission | undefined;
const challenge = () => (challengeSub ??= playChallenge());
let endlessRun: ReturnType<typeof playEndless> | undefined;
const endless = () => (endlessRun ??= playEndless());

const verify = (sub: ScoreSubmission) =>
  verifySubmission(JSON.parse(JSON.stringify(sub)), NOW, START);
const fake = (sub: ScoreSubmission, f: (x: ScoreSubmission) => void) => {
  const x = JSON.parse(JSON.stringify(sub)) as ScoreSubmission;
  f(x);
  return verifySubmission(x, NOW, START);
};
/** A change made to a copy of a record before it is checked */
type Tamper = (x: ScoreSubmission) => void;
const add = (x: ScoreSubmission, it: Partial<ItemInstance> & { uid: string; defId: string }) =>
  x.items.push({ rarity: 'common', exits: ['right'], rerollCount: 0, ...it } as ItemInstance);
/** A cell (not the origin's) holding a single gear with nothing under it */
const top = (x: ScoreSubmission) =>
  x.loadout.cells.findIndex((u, i) => u && i > 0 && x.loadout.under![i]!.length === 0);

describe('ランキングの記録の確認', () => {
  it('v4: 挑戦の記録は重ねる標準盤面で、熟練とアクセサリーは付かない', () => {
    const sub = challenge();
    expect(sub.v).toBe(4);
    expect(sub.loadout.board).toBe('standard');
    expect(sub.mastery).toBeNull();
    expect(sub.charms).toBeNull();
  });

  it('挑戦の記録は確認を通り、スコアは合計ダメージ', () => {
    const sub = challenge();
    const v = verify(sub);
    expect(v).toMatchObject({ ok: true, score: Math.floor(sub.claim.totalDamage) });
  });

  it.each<[string, Tamper, string]>([
    ['結果を盛る', (x: ScoreSubmission) => (x.claim.totalDamage *= 2), 'mismatch'],
    ['期間を変える', (x: ScoreSubmission) => (x.season = 5), 'season'],
    ['種を変える', (x: ScoreSubmission) => (x.seed += 1), 'challenge'],
    [
      '勇者を変える',
      (x: ScoreSubmission) => (x.hero = { maxHp: 0, atb: 0, attack: 0, runTime: 0, stars: 0 }),
      'hero',
    ],
  ])('%s と、はじく', (_, f, reason) => {
    expect(fake(challenge(), f)).toEqual({ ok: false, reason });
  });

  it.each<[string, Tamper]>([
    ['装備を強くする', (x: ScoreSubmission) => (x.items[2]!.rarity = 'legendary')],
    [
      '装備の付加効果を盛る',
      (x: ScoreSubmission) => (x.items[0]!.affixes = [{ id: 'sharp' as never, value: 999 }]),
    ],
  ])('%s と、はじく', (_, f) => {
    expect(fake(challenge(), f)).toMatchObject({ ok: false });
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

  it('v2: 途中で閃き、遺物を選んだ ∞ の記録が確認を通る', () => {
    const { sub, sparks, relics } = endless();
    expect(sparks).toContain('triple');
    expect(relics).toBeGreaterThanOrEqual(1);
    expect(verify(sub).ok).toBe(true);
  });

  it('∞ の記録の熟練は、ランを始めたときのもの（途中で閃いた技は入らない）', () => {
    expect(endless().sub.mastery).toEqual({ levels: { physical: 30 }, learned: [] });
  });

  it('∞ の記録には、付けていたアクセサリーが入る', () => {
    expect(endless().sub.charms![0]).toMatchObject({ defId: 'combo_necklace' });
  });

  it('∞ の記録で勇者を強くすると、はじく', () => {
    const cheat = JSON.parse(JSON.stringify(endless().sub)) as ScoreSubmission;
    cheat.hero!.attack = 999;
    expect(verifySubmission(cheat, NOW, START)).toEqual({ ok: false, reason: 'hero' });
  });

  it('∞ のスコアは、ダメージより着いた周回が先', () => {
    expect(rankScore('endless', { reachedLoop: 3, totalDamage: 5 })).toBeGreaterThan(
      rankScore('endless', { reachedLoop: 2, totalDamage: 1e9 }),
    );
  });

  it('おかしな盤面ははじく: 違う装備を重ねる', () => {
    expect(
      fake(challenge(), (x) => {
        add(x, { uid: 'zz', defId: 'greatsword', rarity: best('greatsword') });
        x.loadout.under![top(x)]!.push('zz');
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
  });

  it('おかしな盤面ははじく: 盤面の深さを超えて重ねる（同じ装備4つ）', () => {
    expect(
      fake(challenge(), (x) => {
        const i = top(x);
        const defId = x.items.find((it) => it.uid === x.loadout.cells[i])!.defId;
        for (const u of ['d1', 'd2', 'd3']) {
          add(x, { uid: u, defId });
          x.loadout.under![i]!.push(u);
        }
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
  });

  it('おかしな盤面ははじく: 起点が2つ', () => {
    expect(
      fake(challenge(), (x) => {
        add(x, { uid: 'o2', defId: 'origin_stone' });
        const free = x.loadout.cells.indexOf(null);
        x.loadout.cells[free] = 'o2';
        x.loadout.originOrder.push('o2');
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
  });

  it('おかしな盤面ははじく: ない盤面', () => {
    expect(fake(challenge(), (x) => (x.loadout.board = 'nope' as never))).toEqual({
      ok: false,
      reason: 'loadout',
    });
  });

  it('おかしな盤面ははじく: 穴に装備がある（結晶の盤面の角に起点）', () => {
    expect(
      fake(endless().sub, (x) => {
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
    expect(
      fake(challenge(), (x) => {
        const l = emptyStackBoard('small');
        const o = x.items.find((it) => it.defId === 'origin_stone')!.uid;
        l.cells[0] = o;
        l.originOrder = [o];
        l.consumables = x.loadout.consumables;
        x.loadout = l;
      }),
    ).toEqual({ ok: false, reason: 'loadout' });
  });

  it.each([
    ['31', (x: ScoreSubmission) => (x.mastery!.levels.physical = 31)],
    ['負の数', (x: ScoreSubmission) => (x.mastery!.levels.physical = -1)],
    ['小数', (x: ScoreSubmission) => (x.mastery!.levels.physical = 1.5)],
    [
      '知らない属性',
      (x: ScoreSubmission) => ((x.mastery!.levels as Record<string, number>).nope = 1),
    ],
    ['知らない技', (x: ScoreSubmission) => (x.mastery!.learned = ['nope'])],
    ['重複した技', (x: ScoreSubmission) => (x.mastery!.learned = ['triple', 'triple'])],
    ['熟練がない', (x: ScoreSubmission) => (x.mastery = null)],
  ])('熟練: %s ははじく', (_, f) => {
    expect(fake(endless().sub, f)).toEqual({ ok: false, reason: 'mastery' });
  });

  it.each([
    [
      '知らないもの',
      (x: ScoreSubmission) =>
        ((x.charms as unknown[])[0] = { uid: 'c1', defId: 'nope', rarity: 'rare' }),
    ],
    [
      '知らないレアリティ',
      (x: ScoreSubmission) =>
        ((x.charms as unknown[])[0] = { uid: 'c1', defId: 'combo_necklace', rarity: 'bad' }),
    ],
    [
      '二重の uid',
      (x: ScoreSubmission) =>
        ((x.charms as unknown[])[1] = { uid: 'c1', defId: 'match_ring', rarity: 'rare' }),
    ],
    ['スロット数の違い', (x: ScoreSubmission) => (x.charms = [...x.charms!, null])],
    ['アクセサリーがない', (x: ScoreSubmission) => (x.charms = null)],
  ])('アクセサリー: %s ははじく', (_, f) => {
    expect(fake(endless().sub, f)).toEqual({ ok: false, reason: 'charms' });
  });

  it('挑戦で熟練が付いていたらはじく', () => {
    expect(fake(challenge(), (x) => (x.mastery = { levels: {}, learned: [] }))).toEqual({
      ok: false,
      reason: 'mastery',
    });
  });

  it('挑戦でアクセサリーが付いていたらはじく', () => {
    expect(fake(challenge(), (x) => (x.charms = new Array(7).fill(null)))).toEqual({
      ok: false,
      reason: 'charms',
    });
  });

  it('記録の版は 4', () => {
    expect(challenge().v).toBe(4);
  });

  it.each([
    [1, '最初の版'],
    [2, '版 3 の前の版'],
    [3, '連鎖倍率に上限があった版'],
  ])('版 %i（%s）は受け付けない', (v) => {
    expect(fake(challenge(), (x) => (x.v = v))).toEqual({ ok: false, reason: 'version' });
  });
});

describe('シーズンの呼び名と報酬', () => {
  it('挑戦のシーズンは「第○回」', async () => {
    const { seasonLabel } = await import('../../src/core/ranking');
    expect(seasonLabel('challenge-3')).toBe('挑戦 第4回');
  });

  it('エンドレスのシーズンは年月', async () => {
    const { seasonLabel, endlessSeason } = await import('../../src/core/ranking');
    expect(seasonLabel(`endless-${endlessSeason(Date.UTC(2026, 11, 5))}`)).toBe(
      'エンドレス 2026年12月',
    );
  });

  it.each([
    [1, 'top1'],
    [50, 'top10'],
    [400, 'top50'],
    [900, 'joined'],
  ])('1000人中 %i 位の順位帯は %s', async (rank, band) => {
    const { rewardBand } = await import('../../src/core/names');
    expect(rewardBand(rank, 1000)).toBe(band);
  });
});
