import { describe, expect, it } from 'vitest';
import { CHARM } from '../src/config/balance';
import {
  applyCharmEvent,
  charmContext,
  charmLit,
  slotCells,
  slotOpen,
  slotsOfCell,
  type CharmContext,
  type CharmInstance,
  type CharmSlots,
} from '../src/core/charms';
import { simulateChain } from '../src/core/chain';
import { estimateRoute } from '../src/core/estimate';
import type { Dir, ItemInstance, Loadout } from '../src/core/types';
import type { BoardDef, BoardId } from '../src/data/boards';
import { getCharm, type CharmId } from '../src/data/charms';
import { build } from './helpers';

const charm = (defId: CharmId, rarity: CharmInstance['rarity'] = 'rare'): CharmInstance => ({
  uid: `c-${defId}-${rarity}`,
  defId,
  rarity,
});

/** Slots for a width x height board with the given charms placed */
function slots(width: number, height: number, placed: Record<number, CharmInstance>): CharmSlots {
  return Array.from({ length: width + height }, (_, i) => placed[i] ?? null);
}

/** A 4x1 row of these items (left to right, no exits needed), slot 4 holding a ring */
function row(defIds: string[]) {
  const b = build(
    4,
    1,
    defIds.map((defId, x) => ({ uid: `u${x}`, defId, x, y: 0, exits: [] })),
  );
  return charmContext(slots(4, 1, { 4: charm('match_ring') }), b.loadout, b.items);
}

/** A stacked board whose cell 0 holds `count` swords */
function stacked(board: BoardId, width: number, height: number, count: number) {
  const items = new Map<string, ItemInstance>();
  const uids = Array.from({ length: count }, (_, i) => `s${i}`);
  for (const uid of uids)
    items.set(uid, { uid, defId: 'sword', rarity: 'common', exits: [], rerollCount: 0 });
  const cells = new Array<string | null>(width * height).fill(null);
  cells[0] = uids[uids.length - 1]!;
  const under = cells.map(() => [] as string[]);
  under[0] = uids.slice(0, -1);
  const loadout: Loadout = { width, height, cells, under, originOrder: [], consumables: [], board };
  return charmContext(slots(width, height, {}), loadout, items);
}

/** A hand-made context on a 4x3 board */
function ctx(placed: Record<number, CharmInstance>, matched: number[] = []): CharmContext {
  return {
    slots: slots(4, 3, placed),
    width: 4,
    matched: new Set(matched),
    full: new Set(),
    depth: 3,
  };
}

describe('試作アクセサリー: スロットと判定', () => {
  it('スロットの番号: 列が先、行が後', () => {
    expect(slotsOfCell(5, 4)).toEqual([1, 5]);
    expect(slotCells(0, 4, 3)).toEqual([0, 4, 8]);
    expect(slotCells(4, 4, 3)).toEqual([0, 1, 2, 3]);
  });

  it('全部が穴の線にはスロットがない', () => {
    const b: BoardDef = { id: 'standard', name: '', mask: ['X.', 'X.'] };
    expect(slotOpen(1, b)).toBe(false);
    expect(slotOpen(0, b)).toBe(true);
    expect(slotOpen(2, b)).toBe(true);
  });

  it('そろい: 攻撃装備2つ以上・全部同じ属性', () => {
    expect(row(['origin_stone', 'torch', 'flame_staff']).matched.has(4)).toBe(true);
    expect(row(['origin_stone', 'torch']).matched.has(4)).toBe(false);
    // physical and blunt are different elements
    expect(row(['sword', 'hammer']).matched.has(4)).toBe(false);
    // a shield is not attack gear: one attack item is not enough
    expect(row(['torch', 'wood_shield']).matched.has(4)).toBe(false);
  });

  it('そろった重ね: 標準は3つ、深い盤面は4つ', () => {
    expect(stacked('standard', 4, 3, 3).full.has(0)).toBe(true);
    expect(stacked('standard', 4, 3, 2).full.has(0)).toBe(false);
    expect(stacked('deep', 3, 3, 3).full.has(0)).toBe(false);
    expect(stacked('deep', 3, 3, 4).full.has(0)).toBe(true);
  });

  it('列と行が同じ出来事に反応すると、列→行の順に2件', () => {
    const v = getCharm('match_ring')!.values.rare;
    const r = applyCharmEvent(
      1,
      'hit',
      0,
      ctx({ 0: charm('match_ring'), 4: charm('match_ring') }, [0, 4]),
    );
    expect(r.m).toBeCloseTo(1 + 2 * v, 10);
    expect(r.fired.map((f) => f.slot)).toEqual([0, 4]);
    expect(r.fired[0]!.m).toBeCloseTo(1 + v, 10);
    expect(r.fired[1]!.m).toBeCloseTo(1 + 2 * v, 10);
    expect(r.fired[0]!.op).toBe('+');
    expect(r.fired[0]!.value).toBe(v);
  });

  it('×型は掛け算', () => {
    const b = getCharm('combo_necklace')!.values.epic;
    const r = applyCharmEvent(2, 'combo', 0, ctx({ 0: charm('combo_necklace', 'epic') }));
    expect(r.m).toBeCloseTo(2 * b, 10);
    expect(r.fired).toEqual([{ slot: 0, op: '×', value: b, m: r.m }]);
  });

  it('上限がある', () => {
    const r = applyCharmEvent(
      CHARM.cap - 1,
      'combo',
      0,
      ctx({ 0: charm('combo_necklace', 'epic') }),
    );
    expect(r.m).toBe(CHARM.cap);
  });

  it('そろっていない線の指輪は反応しない。ほかの出来事にも反応しない', () => {
    const c = ctx({ 0: charm('match_ring') });
    expect(applyCharmEvent(1.5, 'hit', 0, c)).toEqual({ m: 1.5, fired: [] });
    expect(applyCharmEvent(1.5, 'combo', 0, ctx({ 0: charm('match_ring') }, [0]))).toEqual({
      m: 1.5,
      fired: [],
    });
  });

  it('配置画面で光る: そろいは線がそろったとき、重ねの護符は線にそろった重ねがあるとき', () => {
    const c: CharmContext = {
      ...ctx({ 0: charm('match_ring'), 1: charm('stack_charm'), 2: charm('stack_charm') }, [0]),
      full: new Set([5]),
    };
    expect(charmLit(0, c)).toBe(true);
    // cell 5 is on column 1, not column 2
    expect(charmLit(1, c)).toBe(true);
    expect(charmLit(2, c)).toBe(false);
    // other charms never glow, nor does an empty slot
    expect(charmLit(3, { ...c, slots: slots(4, 3, { 3: charm('tech_bangle') }) })).toBe(false);
    expect(charmLit(6, c)).toBe(false);
  });

  it('マスの線にないスロットは反応しない', () => {
    // cell 5 is on column 1 and row 1 (slot 5): slot 0 and slot 4 are elsewhere
    const c = ctx({ 0: charm('tech_bangle'), 4: charm('tech_bangle') });
    expect(applyCharmEvent(1, 'tech', 5, c).fired).toEqual([]);
  });
});

/** origin → these items to the right (4 wide), estimated with the given charms on the row */
function estimateRow(defIds: string[], onRow: CharmId[] = []) {
  const b = build(4, 1, [
    { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    ...defIds.map((defId, i) => ({
      uid: `i${i}`,
      defId,
      x: i + 1,
      y: 0,
      exits: i + 1 < defIds.length ? (['right'] as Dir[]) : [],
    })),
  ]);
  const plan = simulateChain(b.loadout, b.items).plans[0]!;
  // The row slot (4) only: several charms there would replace each other, so one per call
  const ctx = onRow.length
    ? charmContext(slots(4, 1, { 4: charm(onRow[0]!) }), b.loadout, b.items)
    : undefined;
  return estimateRoute(plan, b.items, 1, undefined, ctx);
}

describe('試作アクセサリー: 配置画面の予想', () => {
  it('予想にもそろいの指輪が入る', () => {
    const v = getCharm('match_ring')!.values.rare;
    const row = ['torch', 'flame_staff', 'torch'];
    // Each step's own estimate: the route cut after it, minus the route cut before it
    const upTo = (n: number) => (n === 0 ? 0 : estimateRow(row.slice(0, n)).total);
    const [t1, t2, t3] = [1, 2, 3].map((n) => upTo(n) - upTo(n - 1));
    const est = estimateRow(row, ['match_ring']);
    expect(est.total).toBeCloseTo(t1! + (1 + v) * t2! + (1 + 2 * v) * t3!, 6);
    expect(est.charmPeak).toBeCloseTo(1 + 3 * v, 10);
    expect(estimateRow(row).charmPeak).toBe(1);
  });

  it('会心ととどめは予想に入れない', () => {
    const row = ['torch', 'flame_staff', 'torch'];
    const off = estimateRow(row).total;
    for (const id of ['crit_earring', 'finish_pin'] as const) {
      const est = estimateRow(row, [id]);
      expect(est.total).toBeCloseTo(off, 6);
      expect(est.charmPeak).toBe(1);
    }
  });
});
