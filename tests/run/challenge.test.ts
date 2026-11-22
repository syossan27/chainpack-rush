import { describe, expect, it } from 'vitest';
import { BASE_HERO_STATS, Combat } from '../../src/core/combat';
import { createInitialSave } from '../../src/core/save';
import { itemMap } from '../../src/core/economy';
import { checkRules, currentChallenge, rulesText } from '../../src/core/challenge';
import { getItemDef } from '../../src/data/items';
import { CHALLENGES, CHALLENGE_DAYS } from '../../src/data/challenges';
import { emptyStackBoard, stackPut } from '../../src/core/stack';
import type { ItemInstance, Loadout } from '../../src/core/types';
import { t } from '../../src/i18n';

const DAY = 86_400_000;

describe('2週替わりの挑戦', () => {
  it('始まる前は無し。2週間ごとに順に入れ替わり、種は期間で決まる', () => {
    const start = Date.UTC(2027, 0, 1);
    expect(currentChallenge(start - 1, start)).toBeNull();
    expect(currentChallenge(start, null)).toBeNull();
    const a = currentChallenge(start + 3 * DAY, start)!;
    expect(a.period).toBe(0);
    expect(a.def.id).toBe(CHALLENGES[0]!.id);
    expect(a.endsAt - a.startsAt).toBe(CHALLENGE_DAYS * DAY);
    const b = currentChallenge(start + CHALLENGE_DAYS * DAY, start)!;
    expect(b.period).toBe(1);
    expect(b.def.id).toBe(CHALLENGES[1]!.id);
    expect(b.seed).not.toBe(a.seed);
    expect(currentChallenge(start + 5 * DAY, start)!.seed).toBe(a.seed);
    const loop = currentChallenge(start + CHALLENGES.length * CHALLENGE_DAYS * DAY, start)!;
    expect(loop.def.id).toBe(CHALLENGES[0]!.id);
  });

  it('制限に合わない装備を挙げる', () => {
    const s = createInitialSave();
    const items = itemMap(s);
    for (const c of CHALLENGES) {
      expect(rulesText(c.rules).length).toBeGreaterThan(1);
    }
    // 最初の編成はコモンだけなので、レアまでの制限なら通る
    expect(checkRules(s.loadout, items, CHALLENGES[0]!.rules)).toEqual([]);
    // 上のレアリティを混ぜるとはじく
    const uid = s.loadout.cells.find(
      (u) => u && getItemDef(items.get(u)!.defId).kind !== 'origin',
    )!;
    items.get(uid)!.rarity = 'legendary';
    expect(checkRules(s.loadout, items, CHALLENGES[0]!.rules).length).toBeGreaterThan(0);
    // 空の編成は起点がない
    const empty = { ...s.loadout, cells: s.loadout.cells.map(() => null) };
    expect(checkRules(empty, items, CHALLENGES[0]!.rules)).toContain('起点がない');
  });

  it('下に重ねた装備も制限で見る', () => {
    const { loadout, items } = stacked([
      ['o', 'origin_stone', 'common', 0],
      ['e', 'sword', 'epic', 1],
      ['c', 'sword', 'common', 1],
    ]);
    // The epic sword sits under a common one: still over the rare limit
    expect(loadout.under![1]).toEqual(['e']);
    expect(checkRules(loadout, items, { maxRarity: 'rare' }).length).toBeGreaterThan(0);
  });

  it('重ねない連鎖: 重ねたマスがあれば「重ねた装備がある」', () => {
    const { loadout, items } = stacked([
      ['o', 'origin_stone', 'common', 0],
      ['a', 'sword', 'common', 1],
      ['b', 'sword', 'common', 1],
    ]);
    const rules = { maxRarity: 'epic' as const, noStack: true };
    expect(checkRules(loadout, items, rules)).toContain(t('重ねた装備がある'));
    const flat = stacked([
      ['o', 'origin_stone', 'common', 0],
      ['a', 'sword', 'common', 1],
      ['b', 'sword', 'common', 2],
    ]);
    expect(checkRules(flat.loadout, flat.items, rules)).toEqual([]);
    expect(rulesText(rules)).toContain(t('1マスに1つだけ（重ねない）'));
  });

  it('挑戦の2番目は重ねない連鎖（城壁、エピックまで）', () => {
    expect(CHALLENGES[1]).toEqual({
      id: 'no_stack',
      name: '重ねない連鎖',
      text: '1マスに1つだけ。重ねずに、矢印の道筋で城壁に挑む',
      regionId: 'rampart',
      rules: { maxRarity: 'epic', noStack: true },
    });
  });

  it('挑戦のランは装備もゴールドも落とさず、同じ種なら同じ結果', () => {
    const s = createInitialSave();
    const run = () => {
      const c = new Combat({
        seed: 12345,
        regionId: 'cave',
        loadout: s.loadout,
        items: itemMap(s),
        hero: BASE_HERO_STATS,
        noLoot: true,
      });
      while (!c.ended) c.step();
      return c.result();
    };
    const r1 = run();
    const r2 = run();
    expect(r1.drops).toHaveLength(0);
    expect(r1.stats.gold ?? 0).toBe(0);
    expect(r2.stats.totalDamage).toBe(r1.stats.totalDamage);
  });
});

/** A standard stacked board: [uid, defId, rarity, cell] placed in order (later ones go on top) */
function stacked(list: [string, string, ItemInstance['rarity'], number][]): {
  loadout: Loadout;
  items: Map<string, ItemInstance>;
} {
  const items = new Map<string, ItemInstance>(
    list.map(([uid, defId, rarity]) => [
      uid,
      { uid, defId, rarity, exits: ['right'], rerollCount: 0 },
    ]),
  );
  let loadout = emptyStackBoard('standard');
  for (const [uid, , , cell] of list) loadout = stackPut(loadout, items, uid, cell).loadout;
  return { loadout, items };
}
