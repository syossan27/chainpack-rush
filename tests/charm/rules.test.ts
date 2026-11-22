import { describe, expect, it } from 'vitest';
import { CHARM, COMBOS, POISON } from '../../src/config/balance';
import { boardDepth } from '../../src/core/boards';
import {
  applyCharmEvent,
  charmContext,
  charmLit,
  comboWeight,
  slotCells,
  slotOpen,
  slotsOfCell,
  type CharmContext,
  type CharmInstance,
  type CharmSlots,
} from '../../src/core/charms';
import { simulateChain } from '../../src/core/chain';
import { estimateRoute } from '../../src/core/estimate';
import type { Dir, ItemInstance, Loadout } from '../../src/core/types';
import { getBoard, type BoardDef, type BoardId } from '../../src/data/boards';
import { getCharm, type CharmId } from '../../src/data/charms';
import { build } from '../helpers';

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
    rings: new Array(12).fill(1),
  };
}

describe('アクセサリー: スロットと判定', () => {
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

  it.each([
    ['standard', 4, 3],
    ['deep', 3, 3],
  ] as const)('そろった重ね（%s）: 盤面の深さまで重なったマスだけ', (id, w, h) => {
    const depth = boardDepth(getBoard(id));
    expect(stacked(id, w, h, depth).full.has(0)).toBe(true);
    expect(stacked(id, w, h, depth - 1).full.has(0)).toBe(false);
  });

  it('列と行が同じ出来事に反応すると、列→行の順に2件', () => {
    const v = getCharm('match_ring')!.values.rare;
    const r = applyCharmEvent(
      1,
      'cell',
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

  const strongest = COMBOS.reduce((a, b) => (b.mult > a.mult ? b : a));

  it('連鎖の首飾りの伸び幅: 一番強いコンボ（感電）と毒爆で満額', () => {
    expect(strongest.name).toBe('shock');
    expect(comboWeight(strongest.name)).toBe(1);
    expect(comboWeight(POISON.burstName)).toBe(1);
  });

  it('連鎖の首飾りの伸び幅: 弱いコンボほど小さい（コンボの倍率と同じ順。同じ倍率なら同じ）', () => {
    const pairs = COMBOS.flatMap((x) => COMBOS.map((y) => [x, y] as const));
    const multOrder = pairs.map(([x, y]) => Math.sign(x.mult - y.mult));
    const weightOrder = pairs.map(([x, y]) => Math.sign(comboWeight(x.name) - comboWeight(y.name)));
    expect(weightOrder).toEqual(multOrder);
    expect(Math.min(...COMBOS.map((r) => comboWeight(r.name)))).toBeGreaterThan(0);
  });

  it('連鎖の首飾りの伸び幅: 光と闇のコンボ（浄化・封印）は同じで、満額より小さい', () => {
    expect(comboWeight('purify')).toBeCloseTo(comboWeight('seal'), 10);
    expect(comboWeight('seal')).toBeLessThan(1);
  });

  it('×型の伸び幅は、コンボの重みの分だけ小さくなる', () => {
    const b = getCharm('combo_necklace')!.values.epic;
    const w = comboWeight('seal');
    const r = applyCharmEvent(2, 'combo', 0, ctx({ 0: charm('combo_necklace', 'epic') }), w);
    const step = 1 + (b - 1) * w;
    expect(r.m).toBeCloseTo(2 * step, 10);
    expect(r.fired).toHaveLength(1);
    expect(r.fired[0]!.value).toBeCloseTo(step, 10);
    expect(r.fired[0]!.value).toBeLessThan(b);
    expect(r.fired[0]!.m).toBeCloseTo(r.m, 10);
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

  it('そろっていない線の指輪は反応しない', () => {
    const c = ctx({ 0: charm('match_ring') });
    expect(applyCharmEvent(1.5, 'cell', 0, c)).toEqual({ m: 1.5, fired: [] });
  });

  it('そろいの指輪は、マスが鳴ること以外には反応しない', () => {
    expect(applyCharmEvent(1.5, 'combo', 0, ctx({ 0: charm('match_ring') }, [0]))).toEqual({
      m: 1.5,
      fired: [],
    });
  });

  describe('配置画面で光る', () => {
    const c: CharmContext = {
      ...ctx({ 0: charm('match_ring'), 1: charm('stack_charm'), 2: charm('stack_charm') }, [0]),
      full: new Set([5]),
    };

    it('そろいの指輪は、線がそろったとき', () => {
      expect(charmLit(0, c)).toBe(true);
    });

    it('重ねの護符は、線にそろった重ねがあるとき', () => {
      // cell 5 is on column 1, not column 2
      expect(charmLit(1, c)).toBe(true);
      expect(charmLit(2, c)).toBe(false);
    });

    it('ほかのアクセサリーと空のスロットは光らない', () => {
      expect(charmLit(3, { ...c, slots: slots(4, 3, { 3: charm('tech_bangle') }) })).toBe(false);
      expect(charmLit(6, c)).toBe(false);
    });
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

describe('アクセサリー: 配置画面の予想', () => {
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

  it.each(['crit_earring', 'finish_pin'] as const)('%s（会心・とどめ）は予想に入れない', (id) => {
    const row = ['torch', 'flame_staff', 'torch'];
    const est = estimateRow(row, [id]);
    expect(est.total).toBeCloseTo(estimateRow(row).total, 6);
    expect(est.charmPeak).toBe(1);
  });
});
