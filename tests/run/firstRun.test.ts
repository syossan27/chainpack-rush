import { describe, expect, it } from 'vitest';
import { Combat } from '../../src/core/combat';
import { consumableSlots, heroStats, itemMap } from '../../src/core/economy';
import { createInitialSave } from '../../src/core/save';
import { getItemDef } from '../../src/data/items';

function firstRun(seed: number, firstRun: boolean) {
  const save = createInitialSave();
  const c = new Combat({
    seed,
    regionId: save.progress.unlocked[0]!,
    loadout: save.loadout,
    items: itemMap(save),
    hero: heroStats(save),
    consumableSlots: consumableSlots(save),
    firstRun,
  });
  while (!c.ended) c.step();
  return c.result();
}

describe('最初の自分のラン', () => {
  const seeds = Array.from({ length: 120 }, (_, i) => i + 1);
  let promised: ReturnType<typeof firstRun>[] | undefined;
  const promisedRuns = () => (promised ??= seeds.map((seed) => firstRun(seed, true)));

  it('約束がなければ、何も出ずに終わる最初のランがある（約束が直すこと）', () => {
    const empty = seeds.filter((seed) => firstRun(seed, false).drops.length === 0);
    expect(empty.length).toBeGreaterThan(0);
  });

  it('戦利品が必ず1つ以上ある', () => {
    const empty = promisedRuns().filter((r) => r.drops.length === 0);
    expect(empty).toEqual([]);
  });

  it('最初の戦利品は消耗品ではない', () => {
    const kinds = promisedRuns().map((r) => getItemDef(r.drops[0]!.defId).kind);
    expect(kinds).not.toContain('consumable');
  });
});
