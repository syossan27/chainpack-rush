import { describe, expect, it } from 'vitest';
import { MONETIZE } from '../src/config/balance';
import { BASE_HERO_STATS, Combat } from '../src/core/combat';
import { adRemaining, doubleLoot, itemMap, recordAd, rerollItem } from '../src/core/economy';
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

  it('戦利品2倍: 今回と同じ数だけ、同じ地域・周回で抽選し直して受け取る（種類もレアリティも新しく）', () => {
    const s = createInitialSave();
    const n = s.inventory.length;
    const more = doubleLoot(s, 5, 'rampart', 3, new Rng(3));
    expect(more).toHaveLength(5);
    expect(new Set(more.map((i) => i.uid)).size).toBe(5);
    expect(s.inventory.length).toBe(n + 5);
    expect(doubleLoot(s, 0, 'grassland', 1, new Rng(1))).toHaveLength(0);
    // 抽選し直すので、いろいろな種類が出る
    const many = doubleLoot(createInitialSave(), 60, 'cave', 2, new Rng(9));
    expect(new Set(many.map((i) => i.defId)).size).toBeGreaterThan(5);
    expect(new Set(many.map((i) => i.rarity)).size).toBeGreaterThan(1);
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
