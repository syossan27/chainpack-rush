import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat, type RunConfig } from '../src/core/combat';
import { createInitialSave } from '../src/core/save';
import { heroStats, itemMap, totalStars } from '../src/core/economy';
import { currentChallenge } from '../src/core/challenge';
import { buildSubmission, endlessSeason, rankScore, verifySubmission } from '../src/core/ranking';

const START = Date.UTC(2027, 0, 1);
const NOW = START + 3 * 86_400_000;

function playChallenge() {
  const s = createInitialSave();
  const ch = currentChallenge(NOW, START)!;
  const cfg: RunConfig = {
    seed: ch.seed,
    regionId: ch.def.regionId,
    loadout: s.loadout,
    items: itemMap(s),
    hero: BASE_HERO_STATS,
    consumableSlots: 3,
    noLoot: true,
  };
  const c = new Combat(cfg);
  while (!c.ended) {
    if (c.tick === 200) c.useConsumable(0);
    c.step();
  }
  return buildSubmission('challenge', ch.period, cfg, c.result(), s, 0);
}

describe('ランキングの記録の確認', () => {
  it('正しい挑戦の記録は通り、スコアは合計ダメージ', () => {
    const sub = playChallenge();
    const v = verifySubmission(JSON.parse(JSON.stringify(sub)), NOW, START);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.score).toBe(Math.floor(sub.claim.totalDamage));
  });

  it('結果を盛る・装備を強くする・期間や種を変えると、はじく', () => {
    const sub = playChallenge();
    const fake = (f: (x: typeof sub) => void) => {
      const x = JSON.parse(JSON.stringify(sub)) as typeof sub;
      f(x);
      return verifySubmission(x, NOW, START);
    };
    expect(fake((x) => (x.claim.totalDamage *= 2))).toEqual({ ok: false, reason: 'mismatch' });
    expect(fake((x) => (x.items[2]!.rarity = 'legendary'))).toMatchObject({ ok: false });
    expect(fake((x) => (x.season = 5))).toEqual({ ok: false, reason: 'season' });
    expect(fake((x) => (x.seed += 1))).toEqual({ ok: false, reason: 'challenge' });
    expect(fake((x) => (x.hero = { maxHp: 0, atb: 0, attack: 0, runTime: 0, stars: 0 }))).toEqual({
      ok: false,
      reason: 'hero',
    });
    expect(
      fake((x) => (x.items[0]!.affixes = [{ id: 'sharp' as never, value: 999 }])),
    ).toMatchObject({ ok: false });
  });

  it('エンドレス: 強化が上限を超える記録ははじき、正しい記録はシーズンで通る', () => {
    const s = createInitialSave();
    const cfg: RunConfig = {
      seed: 77,
      regionId: 'endless',
      loadout: s.loadout,
      items: itemMap(s),
      hero: heroStats(s),
      consumableSlots: 3,
    };
    const c = new Combat(cfg);
    while (!c.ended) c.step();
    const sub = buildSubmission('endless', endlessSeason(NOW), cfg, c.result(), s, totalStars(s));
    expect(verifySubmission(JSON.parse(JSON.stringify(sub)), NOW, START).ok).toBe(true);
    const cheat = JSON.parse(JSON.stringify(sub));
    cheat.hero.attack = 999;
    expect(verifySubmission(cheat, NOW, START)).toEqual({ ok: false, reason: 'hero' });
    expect(rankScore('endless', { reachedLoop: 3, totalDamage: 5 })).toBeGreaterThan(
      rankScore('endless', { reachedLoop: 2, totalDamage: 1e9 }),
    );
  });
});
