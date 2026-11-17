import { describe, expect, it } from 'vitest';
import {
  countsForPick,
  PICK_EVERY_KILLS,
  placeItem,
  protoChoices,
  protoStart,
  rotateExits,
} from '../src/core/proto';
import { Rng } from '../src/core/rng';
import { getItemDef } from '../src/data/items';

// Prototype (roguelite): grow the line during the run
describe('試作: ランの中で線を育てる', () => {
  it('起点石（右向き）→剣→木の盾の短い線で始まる', () => {
    const { loadout, items } = protoStart();
    const placed = loadout.cells.filter((u) => u !== null).map((u) => items.get(u!)!.defId);
    expect(placed).toEqual(['origin_stone', 'sword', 'wood_shield']);
    expect(loadout.originOrder).toHaveLength(1);
    expect(items.get(loadout.originOrder[0]!)!.exits).toEqual(['right']);
  });

  it('3択は置ける装備だけ（消耗品なし）。いつもレア以上。名前（uid）は毎回ちがう', () => {
    const rng = new Rng(7);
    const seen = new Set<string>();
    for (let n = 0; n < 200; n++) {
      const picks = protoChoices(rng, 1, n);
      expect(picks).toHaveLength(3);
      for (const p of picks) {
        expect(getItemDef(p.defId).kind).not.toBe('consumable');
        expect(p.rarity).not.toBe('common');
        expect(seen.has(p.uid)).toBe(false);
        seen.add(p.uid);
      }
    }
  });

  it('2体倒すごとに選べる。ボス（別に選べる）と逃げた敵は数えない', () => {
    expect(PICK_EVERY_KILLS).toBe(2);
    expect(countsForPick({ boss: false, fled: false })).toBe(true);
    expect(countsForPick({ boss: true, fled: false })).toBe(false);
    expect(countsForPick({ boss: false, fled: true })).toBe(false);
  });

  it('タップで矢印が時計回りに回る', () => {
    const { items } = protoStart();
    const it = [...items.values()].find((i) => i.defId === 'sword')!;
    it.exits = ['up', 'left'];
    rotateExits(it);
    expect(it.exits).toEqual(['right', 'up']);
  });

  it('空いたマスにだけ置ける。起点石は発火順の最後に入る', () => {
    const { loadout, items } = protoStart();
    const stone = protoChoices(new Rng(1), 1, 0)[0]!;
    stone.defId = 'origin_stone';
    const used = loadout.cells.findIndex((u) => u !== null);
    expect(placeItem(loadout, items, stone, used)).toBe(false);
    expect(placeItem(loadout, items, stone, 15)).toBe(true);
    expect(loadout.cells[15]).toBe(stone.uid);
    expect(items.get(stone.uid)).toBe(stone);
    expect(loadout.originOrder.at(-1)).toBe(stone.uid);
  });
});
