import { describe, expect, it } from 'vitest';
import { AFFIXES, AFFIX_COUNT, affixCandidates, affixValue } from '../../src/core/affixes';
import { BASE_HERO_STATS, Combat } from '../../src/core/combat';
import { createItem } from '../../src/core/loot';
import { Rng } from '../../src/core/rng';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { NO_LUCK } from '../../src/config/balance';
import { getItemDef } from '../../src/data/items';
import { RARITIES } from '../../src/core/types';
import { build } from '../helpers';

describe('追加効果', () => {
  it('消耗品には付かない', () => {
    const rng = new Rng(4);
    const made = RARITIES.flatMap((r) =>
      Array.from({ length: 200 }, () => createItem(rng, 'potion', r, 'x')),
    );
    expect(made.filter((it) => (it.affixes?.length ?? 0) > 0)).toEqual([]);
  });

  describe.each(['sword', 'iron_shield', 'origin_stone', 'oil_bottle'])('%s', (defId) => {
    const def = getItemDef(defId);
    // Rolled inside each test (a throw fails that test, not the whole file)
    const made = () => {
      const rng = new Rng(4);
      return RARITIES.flatMap((r) =>
        Array.from({ length: 200 }, () => ({ r, it: createItem(rng, defId, r, 'x') })),
      );
    };
    const all = () => made().flatMap(({ it }) => it.affixes ?? []);

    it('数はレアリティごとの数（その1つ上まで。付けられる種類の数が上限）', () => {
      const outside = made().filter(({ r, it }) => {
        const n = it.affixes?.length ?? 0;
        const cands = affixCandidates(def).length;
        return n < Math.min(cands, AFFIX_COUNT[r].base) || n > Math.min(cands, AFFIX_COUNT[r].base + 1);
      });
      expect(outside).toEqual([]);
    });

    it('同じ追加効果は重ならない', () => {
      const dup = made().filter(({ it }) => {
        const ids = (it.affixes ?? []).map((a) => a.id);
        return new Set(ids).size !== ids.length;
      });
      expect(dup).toEqual([]);
    });

    it('装備の種類に合ったものだけが付く', () => {
      expect(all().filter((a) => AFFIXES[a.id].kind !== def.kind)).toEqual([]);
    });

    it('値は範囲内', () => {
      expect(
        all().filter((a) => a.value < AFFIXES[a.id].min || a.value > AFFIXES[a.id].max),
      ).toEqual([]);
    });
  });

  it('油瓶（ATKあり）には攻撃系が付く。ATK 0 の装備はない', () => {
    expect(affixCandidates(getItemDef('oil_bottle')).length).toBeGreaterThan(0);
  });

  describe('ダメージ', () => {
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

    it('鋭い（装備）は、値の % だけダメージを上げる', () => {
      expect(run({ id: 'sharp', value: 30 }) / run()).toBeCloseTo(1.3);
    });

    it('初撃（起点石）は、起点の1段目のダメージを値の % だけ上げる', () => {
      expect(run(undefined, { id: 'spark', value: 50 }) / run()).toBeCloseTo(1.5);
    });
  });

  it('追加効果はセーブに残る', () => {
    const s = createInitialSave();
    s.inventory[0]!.affixes = [{ id: 'sharp', value: 12 }];
    const loaded = deserializeSave(serializeSave(s));
    expect(affixValue(loaded.inventory[0]!, 'sharp')).toBe(12);
  });

  it('壊れた追加効果があると、セーブごと初期値に戻す', () => {
    const bad = JSON.parse(serializeSave(createInitialSave()));
    bad.inventory[0].affixes = [{ id: 'nope', value: 1 }];
    expect(deserializeSave(JSON.stringify(bad)).inventory[0]!.affixes).toBeUndefined();
  });
});
