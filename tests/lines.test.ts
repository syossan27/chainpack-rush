import { describe, expect, it } from 'vitest';
import { allowsRarity, lineItemFor, rollLoot } from '../src/core/loot';
import { Rng } from '../src/core/rng';
import { ITEM_DEFS, getItemDef } from '../src/data/items';
import { TECHNIQUES } from '../src/data/techniques';
import { RARITIES } from '../src/core/types';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { synthPlan } from '../src/core/economy';

describe('系統（装備ごとに出るレアリティの幅）', () => {
  it('戦利品は、その装備が出るレアリティでしか出ない', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 4000; i++) {
      const it = rollLoot(rng, 1 + (i % 10), `u${i}`, i % 3 === 0, {
        rarityShift: 0.3,
        artifactMult: 1,
      });
      expect(allowsRarity(it.defId, it.rarity)).toBe(true);
    }
  });

  it('次の装備は、つながっている（上限の次のレアリティを持つ）', () => {
    const rank = (r: string) => RARITIES.indexOf(r as never);
    for (const d of ITEM_DEFS) {
      if (!d.next) continue;
      const n = getItemDef(d.next);
      const hi = rank(d.rarities![1]);
      // 上限がレジェンダリーの装備の next は、下のレアリティから戻るときだけに使う
      if (hi >= RARITIES.length - 1) continue;
      expect(allowsRarity(n.id, RARITIES[hi + 1]!), `${d.id} → ${n.id}`).toBe(true);
    }
  });

  it('すべてのレアリティで、どの種類の装備も出せる', () => {
    for (const r of RARITIES)
      for (const kind of ['attack', 'defense', 'origin'] as const)
        expect(ITEM_DEFS.some((d) => d.kind === kind && !d.artifact && allowsRarity(d.id, r))).toBe(
          true,
        );
  });

  it('5つの必殺技は、どれかのレアリティで3つとも揃えられる', () => {
    for (const t of TECHNIQUES) {
      const ok = RARITIES.some((r) =>
        t.seq.every((slot) => slot.some((id) => allowsRarity(id, r))),
      );
      expect(ok, t.id).toBe(true);
    }
  });

  it('合成で幅を超えると、系統の次の装備になる（革鎧のレア → 鎖帷子のエピック）', () => {
    expect(lineItemFor('leather_armor', 'epic')).toBe('chainmail');
    expect(lineItemFor('leather_armor', 'legendary')).toBe('steel_armor');
    expect(lineItemFor('holy_sword', 'common')).toBe('sword');
    const s = createInitialSave();
    s.gold = 99999;
    for (let i = 0; i < 3; i++)
      s.inventory.push({
        uid: `la${i}`,
        defId: 'leather_armor',
        rarity: 'rare',
        exits: ['right'],
        rerollCount: 0,
      });
    const plan = synthPlan(s, 'la0');
    expect(plan.reason).toBeNull();
    expect(plan.to).toBe('epic');
    expect(plan.toDefId).toBe('chainmail');
  });

  it('古いセーブの「幅の外」の装備は、系統の装備に置きかわる', () => {
    const s = createInitialSave();
    s.inventory.push({
      uid: 'old1',
      defId: 'leather_armor',
      rarity: 'legendary',
      exits: ['up'],
      rerollCount: 0,
    });
    s.inventory.push({
      uid: 'old2',
      defId: 'greatsword',
      rarity: 'common',
      exits: ['up'],
      rerollCount: 0,
    });
    const t = deserializeSave(serializeSave(s));
    expect(t.inventory.find((i) => i.uid === 'old1')!.defId).toBe('steel_armor');
    expect(t.inventory.find((i) => i.uid === 'old2')!.defId).toBe('sword');
  });
});
