import { describe, expect, it } from 'vitest';
import { MONETIZE } from '../src/config/balance';
import { BASE_HERO_STATS, Combat } from '../src/core/combat';
import { adRemaining, itemMap, recordAd, rerollItem, rollExtraLoot } from '../src/core/economy';
import { Rng } from '../src/core/rng';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';

describe('報酬つき広告の回数', () => {
  it('1日の回数まで。日付が変わると戻る。保存される', () => {
    const s = createInitialSave();
    const day1 = new Date(2026, 10, 10, 9);
    const day2 = new Date(2026, 10, 11, 9);
    expect(adRemaining(s, 'extraLoot', day1)).toBe(MONETIZE.dailyCaps.extraLoot);
    for (let i = 0; i < MONETIZE.dailyCaps.extraLoot; i++) recordAd(s, 'extraLoot', day1);
    expect(adRemaining(s, 'extraLoot', day1)).toBe(0);
    expect(adRemaining(s, 'smithReroll', day1)).toBe(MONETIZE.dailyCaps.smithReroll);
    expect(adRemaining(s, 'extraLoot', day2)).toBe(MONETIZE.dailyCaps.extraLoot);
    const loaded = deserializeSave(serializeSave(s));
    expect(adRemaining(loaded, 'extraLoot', day1)).toBe(0);
    expect(loaded.premium).toBe(false);
  });

  it('無料の付け直しは、お金も付け直し回数（次の料金）も増やさない', () => {
    const s = createInitialSave();
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    expect(rerollItem(s, sword.uid, new Rng(1), true)).toBe(true);
    expect(s.gold).toBe(0);
    expect(sword.rerollCount).toBe(0);
    expect(rerollItem(s, sword.uid, new Rng(1))).toBe(false); // 有料はお金が要る
  });

  it('戦利品をもう1回: 今回と同じくらいの数（範囲内）を倉庫に受け取る', () => {
    const s = createInitialSave();
    const n = s.inventory.length;
    expect(rollExtraLoot(s, 'cave', 2, 0, new Rng(3))).toHaveLength(MONETIZE.extraLootMin);
    expect(rollExtraLoot(s, 'cave', 2, 4, new Rng(3))).toHaveLength(4);
    expect(rollExtraLoot(s, 'cave', 2, 99, new Rng(3))).toHaveLength(MONETIZE.extraLootMax);
    expect(s.inventory.length).toBe(n + MONETIZE.extraLootMin + 4 + MONETIZE.extraLootMax);
  });
});

describe('再開', () => {
  it('力尽きたら1回だけ、HP全回復＋時間で再開できる', () => {
    const s = createInitialSave();
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout: s.loadout,
      items: itemMap(s),
      hero: { ...BASE_HERO_STATS, maxHp: 5 },
    });
    while (!c.ended) c.step();
    expect(c.ended).toBe('dead');
    const before = c.maxTicks;
    expect(c.revive(MONETIZE.reviveSeconds)).toBe(true);
    expect(c.ended).toBeNull();
    expect(c.hp).toBe(c.maxHp);
    expect(c.maxTicks).toBe(before + MONETIZE.reviveSeconds * 60);
    expect(c.drainEvents().some((e) => e.type === 'revive')).toBe(true);
    while (!c.ended) c.step();
    expect(c.revive(MONETIZE.reviveSeconds)).toBe(false); // 2回目はない
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
