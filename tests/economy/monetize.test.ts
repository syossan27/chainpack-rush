import { describe, expect, it } from 'vitest';
import { MONETIZE, SIM } from '../../src/config/balance';
import { BASE_HERO_STATS, Combat } from '../../src/core/combat';
import { adRemaining, doubleLoot, itemMap, recordAd, rerollItem } from '../../src/core/economy';
import { Rng } from '../../src/core/rng';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';

describe('報酬つき広告の回数', () => {
  const day1 = new Date(2026, 10, 10, 9);
  const day2 = new Date(2026, 10, 11, 9);
  /** A save that used up today's extraLoot ads */
  const usedUp = () => {
    const s = createInitialSave();
    for (let i = 0; i < MONETIZE.dailyCaps.extraLoot; i++) recordAd(s, 'extraLoot', day1);
    return s;
  };

  it('1日の回数まで見られる', () => {
    expect(adRemaining(createInitialSave(), 'extraLoot', day1)).toBe(MONETIZE.dailyCaps.extraLoot);
    expect(adRemaining(usedUp(), 'extraLoot', day1)).toBe(0);
  });

  it('回数は広告の種類ごとに別', () => {
    expect(adRemaining(usedUp(), 'smithReroll', day1)).toBe(MONETIZE.dailyCaps.smithReroll);
  });

  it('日付が変わると回数が戻る', () => {
    expect(adRemaining(usedUp(), 'extraLoot', day2)).toBe(MONETIZE.dailyCaps.extraLoot);
  });

  it('見た回数は保存される', () => {
    const loaded = deserializeSave(serializeSave(usedUp()));
    expect(adRemaining(loaded, 'extraLoot', day1)).toBe(0);
  });

  it('広告の記録は、広告なしの購入（premium）にはならない', () => {
    expect(deserializeSave(serializeSave(usedUp())).premium).toBe(false);
  });

  it('無料の付け直しは、お金も付け直し回数（次の料金）も増やさない', () => {
    const s = createInitialSave();
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    expect(rerollItem(s, sword.uid, new Rng(1), true)).toBe(true);
    expect(s.gold).toBe(0);
    expect(sword.rerollCount).toBe(0);
    expect(rerollItem(s, sword.uid, new Rng(1))).toBe(false); // 有料はお金が要る
  });

  it('戦利品2倍: 今回と同じ数だけ、別々のアイテムとして受け取る', () => {
    const s = createInitialSave();
    const n = s.inventory.length;
    const more = doubleLoot(s, 5, 'rampart', 3, new Rng(3));
    expect(more).toHaveLength(5);
    expect(new Set(more.map((i) => i.uid)).size).toBe(5);
    expect(s.inventory.length).toBe(n + 5);
  });

  it('戦利品2倍: 今回の戦利品が0なら何も受け取らない', () => {
    expect(doubleLoot(createInitialSave(), 0, 'grassland', 1, new Rng(1))).toHaveLength(0);
  });

  it('戦利品2倍: 抽選し直すので、いろいろな種類・レアリティが出る', () => {
    const many = doubleLoot(createInitialSave(), 60, 'cave', 2, new Rng(9));
    expect(new Set(many.map((i) => i.defId)).size).toBeGreaterThan(5);
    expect(new Set(many.map((i) => i.rarity)).size).toBeGreaterThan(1);
  });
});

describe('再開', () => {
  /** A run that dies quickly */
  const dead = () => {
    const s = createInitialSave();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout: s.loadout,
      items: itemMap(s),
      hero: { ...BASE_HERO_STATS, maxHp: 5 },
    });
    while (!c.ended) c.step();
    return c;
  };

  it('力尽きたら、HP全回復＋時間つきで再開できる', () => {
    const c = dead();
    expect(c.ended).toBe('dead');
    const before = c.maxTicks;
    expect(c.revive(MONETIZE.reviveSeconds)).toBe(true);
    expect(c.ended).toBeNull();
    expect(c.hp).toBe(c.maxHp);
    expect(c.maxTicks).toBe(before + MONETIZE.reviveSeconds * SIM.ticksPerSecond);
    expect(c.drainEvents().some((e) => e.type === 'revive')).toBe(true);
  });

  it('再開は1回だけ', () => {
    const c = dead();
    c.revive(MONETIZE.reviveSeconds);
    while (!c.ended) c.step();
    expect(c.revive(MONETIZE.reviveSeconds)).toBe(false);
  });

  it('時間切れや撤退では再開できない', () => {
    const s = createInitialSave();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout: s.loadout,
      items: itemMap(s),
      hero: BASE_HERO_STATS,
    });
    c.retreat();
    expect(c.revive(10)).toBe(false);
  });
});
