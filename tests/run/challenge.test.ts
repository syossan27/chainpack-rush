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
  const start = Date.UTC(2027, 0, 1);
  const at = (days: number) => currentChallenge(start + days * DAY, start)!;

  it('始まる前は挑戦が無い', () => {
    expect(currentChallenge(start - 1, start)).toBeNull();
  });

  it('始まる日が決まっていなければ挑戦が無い', () => {
    expect(currentChallenge(start, null)).toBeNull();
  });

  it('最初の期間は1つ目の挑戦で、長さは CHALLENGE_DAYS 日', () => {
    const a = at(3);
    expect(a.period).toBe(0);
    expect(a.def.id).toBe(CHALLENGES[0]!.id);
    expect(a.endsAt - a.startsAt).toBe(CHALLENGE_DAYS * DAY);
  });

  it('期間が変わると、次の挑戦に順に入れ替わる', () => {
    const b = at(CHALLENGE_DAYS);
    expect(b.period).toBe(1);
    expect(b.def.id).toBe(CHALLENGES[1]!.id);
  });

  it('ひと回りしたら、1つ目の挑戦に戻る', () => {
    expect(at(CHALLENGES.length * CHALLENGE_DAYS).def.id).toBe(CHALLENGES[0]!.id);
  });

  it('種は期間で決まる: 同じ期間なら同じ、違う期間なら違う', () => {
    expect(at(5).seed).toBe(at(3).seed);
    expect(at(CHALLENGE_DAYS).seed).not.toBe(at(3).seed);
  });

  it.each(CHALLENGES.map((c) => [c.id, c] as const))('%s の制限には説明の文がある', (_, c) => {
    expect(rulesText(c.rules).length).toBeGreaterThan(1);
  });

  it('最初の編成（コモンだけ）は、レアまでの制限を通る', () => {
    const s = createInitialSave();
    expect(checkRules(s.loadout, itemMap(s), CHALLENGES[0]!.rules)).toEqual([]);
  });

  it('制限より上のレアリティを混ぜると、その装備を挙げる', () => {
    const s = createInitialSave();
    const items = itemMap(s);
    const uid = s.loadout.cells.find(
      (u) => u && getItemDef(items.get(u)!.defId).kind !== 'origin',
    )!;
    items.get(uid)!.rarity = 'legendary';
    expect(checkRules(s.loadout, items, CHALLENGES[0]!.rules).length).toBeGreaterThan(0);
  });

  it('空の編成は「起点がない」', () => {
    const s = createInitialSave();
    const empty = { ...s.loadout, cells: s.loadout.cells.map(() => null) };
    expect(checkRules(empty, itemMap(s), CHALLENGES[0]!.rules)).toContain('起点がない');
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

  const noStackRules = { maxRarity: 'epic' as const, noStack: true };

  it('重ねない連鎖: 重ねたマスがあれば「重ねた装備がある」', () => {
    const { loadout, items } = stacked([
      ['o', 'origin_stone', 'common', 0],
      ['a', 'sword', 'common', 1],
      ['b', 'sword', 'common', 1],
    ]);
    expect(checkRules(loadout, items, noStackRules)).toContain(t('重ねた装備がある'));
  });

  it('重ねない連鎖: 1マスに1つずつなら通る', () => {
    const flat = stacked([
      ['o', 'origin_stone', 'common', 0],
      ['a', 'sword', 'common', 1],
      ['b', 'sword', 'common', 2],
    ]);
    expect(checkRules(flat.loadout, flat.items, noStackRules)).toEqual([]);
  });

  it('重ねない連鎖の説明には「1マスに1つだけ（重ねない）」が入る', () => {
    expect(rulesText(noStackRules)).toContain(t('1マスに1つだけ（重ねない）'));
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

  const challengeRun = () => {
    const s = createInitialSave();
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

  it('挑戦のランは装備もゴールドも落とさない', () => {
    const r = challengeRun();
    expect(r.drops).toHaveLength(0);
    expect(r.stats.gold ?? 0).toBe(0);
  });

  it('挑戦のランは、同じ種なら同じ結果', () => {
    expect(challengeRun().stats.totalDamage).toBe(challengeRun().stats.totalDamage);
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
