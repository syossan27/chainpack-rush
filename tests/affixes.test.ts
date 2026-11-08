import { describe, expect, it } from 'vitest';
import { AFFIXES, AFFIX_COUNT, affixCandidates, affixValue } from '../src/core/affixes';
import { BASE_HERO_STATS, Combat } from '../src/core/combat';
import { createItem } from '../src/core/loot';
import { Rng } from '../src/core/rng';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';
import { NO_LUCK } from '../src/config/balance';
import { getItemDef } from '../src/data/items';
import { build } from './helpers';

describe('追加効果', () => {
  it('レアリティごとの数・種類に合ったもの・値は範囲内。消耗品には付かない', () => {
    const rng = new Rng(4);
    for (const defId of ['sword', 'iron_shield', 'origin_stone', 'oil_bottle', 'potion']) {
      const def = getItemDef(defId);
      for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
        for (let i = 0; i < 200; i++) {
          const it = createItem(rng, defId, r, 'x');
          const n = it.affixes?.length ?? 0;
          if (def.kind === 'consumable') {
            expect(n).toBe(0);
            continue;
          }
          const max = Math.min(affixCandidates(def).length, AFFIX_COUNT[r].base + 1);
          expect(n).toBeLessThanOrEqual(max);
          expect(n).toBeGreaterThanOrEqual(
            Math.min(affixCandidates(def).length, AFFIX_COUNT[r].base),
          );
          const ids = (it.affixes ?? []).map((a) => a.id);
          expect(new Set(ids).size).toBe(ids.length);
          for (const a of it.affixes ?? []) {
            const d = AFFIXES[a.id];
            expect(d.kind).toBe(def.kind);
            expect(a.value).toBeGreaterThanOrEqual(d.min);
            expect(a.value).toBeLessThanOrEqual(d.max);
          }
        }
      }
    }
    // 油瓶（ATKあり）には攻撃系が付く。ATK 0 の装備はない
    expect(affixCandidates(getItemDef('oil_bottle')).length).toBeGreaterThan(0);
  });

  it('鋭い +30% はダメージに乗る。初撃は起点の1段目に乗る', () => {
    const run = (
      swordAffix?: { id: 'sharp'; value: number },
      originAffix?: { id: 'spark'; value: number },
    ) => {
      const { loadout, items } = build(2, 1, [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 's', defId: 'sword', x: 1, y: 0, exits: [] },
      ]);
      if (swordAffix) items.get('s')!.affixes = [swordAffix];
      if (originAffix) items.get('o')!.affixes = [originAffix];
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout,
        items,
        hero: BASE_HERO_STATS,
        mode: 'dummy',
        luck: NO_LUCK,
      });
      c.fireNext();
      while (c.chain) c.step();
      const h = c.drainEvents().find((e) => e.type === 'hit');
      return h?.type === 'hit' ? h.damage : 0;
    };
    expect(run()).toBeCloseTo(10);
    expect(run({ id: 'sharp', value: 30 })).toBeCloseTo(13);
    expect(run(undefined, { id: 'spark', value: 50 })).toBeCloseTo(15);
  });

  it('セーブに残り、壊れた追加効果はセーブごと初期値に戻す', () => {
    const s = createInitialSave();
    s.inventory[0]!.affixes = [{ id: 'sharp', value: 12 }];
    const loaded = deserializeSave(serializeSave(s));
    expect(affixValue(loaded.inventory[0]!, 'sharp')).toBe(12);
    const bad = JSON.parse(serializeSave(s));
    bad.inventory[0].affixes = [{ id: 'nope', value: 1 }];
    expect(deserializeSave(JSON.stringify(bad)).inventory[0]!.affixes).toBeUndefined();
  });
});
