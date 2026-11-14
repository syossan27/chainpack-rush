import { describe, expect, it } from 'vitest';
import { Combat } from '../src/core/combat';
import { consumableSlots, heroStats, itemMap } from '../src/core/economy';
import { createInitialSave } from '../src/core/save';
import { getItemDef } from '../src/data/items';

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
  it('戦利品が必ず1つ以上あり、最初の1つは消耗品ではない', () => {
    let emptyBefore = 0;
    for (let seed = 1; seed <= 120; seed++) {
      if (firstRun(seed, false).drops.length === 0) emptyBefore++;
      const r = firstRun(seed, true);
      expect(r.drops.length).toBeGreaterThanOrEqual(1);
      expect(getItemDef(r.drops[0]!.defId).kind).not.toBe('consumable');
    }
    // Without the promise some first runs end with nothing (this is what the flag fixes)
    expect(emptyBefore).toBeGreaterThan(0);
  });
});
