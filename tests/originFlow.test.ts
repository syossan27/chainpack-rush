import { describe, expect, it } from 'vitest';
import { planChain } from '../src/core/chain';
import { estimateRoute } from '../src/core/estimate';
import type { ChainPlan, Loadout } from '../src/core/types';
import { getItemDef, itemDescVars } from '../src/data/items';
import { build, type Placed } from './helpers';

/** A stacked board: `extra` puts more of the same gear under a placed item (bottom first) */
function stacked(
  width: number,
  height: number,
  placed: Placed[],
  extra: Record<string, number> = {},
) {
  const b = build(width, height, placed);
  const under: string[][] = b.loadout.cells.map(() => []);
  for (const p of placed) {
    const cell = p.y * width + p.x;
    for (let k = 0; k < (extra[p.uid] ?? 0); k++) {
      const uid = `${p.uid}${k}`;
      b.items.set(uid, { uid, defId: p.defId, rarity: 'common', exits: [], rerollCount: 0 });
      under[cell]!.push(uid);
    }
  }
  const loadout: Loadout = { ...b.loadout, under };
  return { loadout, items: b.items };
}

const stepOf = (plan: ChainPlan, uid: string) => plan.steps.find((s) => s.uid === uid)!;

describe('一番槍の起点石', () => {
  const LEAD = getItemDef('origin_lead').line!.lead!;
  const up = 1 + LEAD.damage / 100;

  /** o → a (sword, a stack of 3) → d (wood shield) → b (sword) → c (sword); cells ring a, d, b, c */
  const line = (origin: string) =>
    stacked(
      5,
      1,
      [
        { uid: 'o', defId: origin, x: 0, y: 0, exits: ['right'] },
        { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
        { uid: 'd', defId: 'wood_shield', x: 2, y: 0, exits: ['right'] },
        { uid: 'b', defId: 'sword', x: 3, y: 0, exits: ['right'] },
        { uid: 'c', defId: 'sword', x: 4, y: 0, exits: [] },
      ],
      { a: 2 },
    );

  it('最初に鳴る3マス（防具のマスも数え、起点は数えない）の攻撃だけ強い。重ねの全段に効く', () => {
    const { loadout, items } = line('origin_lead');
    const plan = planChain(loadout, items, 'o');
    const aRings = plan.steps.filter((s) => s.cell === 1);
    expect(aRings).toHaveLength(3);
    for (const s of aRings) expect(s.line?.damage).toBeCloseTo(up);
    expect(stepOf(plan, 'b').line?.damage).toBeCloseTo(up);
    // The fourth cell is past the first three
    expect(stepOf(plan, 'c').line).toBeUndefined();
  });
});

describe('彼方の起点石', () => {
  const X = getItemDef('origin_far').line!.far! / 100;

  /**
   * o (exits right, down) → right: a (wood shield, d=1) → b (sword, d=2)
   *                       → down:  c (sword ×2, d=1) → e (sword, d=2)
   */
  const fork = (origin: string) =>
    stacked(
      3,
      2,
      [
        { uid: 'o', defId: origin, x: 0, y: 0, exits: ['right', 'down'] },
        { uid: 'a', defId: 'wood_shield', x: 1, y: 0, exits: ['right'] },
        { uid: 'b', defId: 'sword', x: 2, y: 0, exits: [] },
        { uid: 'c', defId: 'sword', x: 0, y: 1, exits: ['right'] },
        { uid: 'e', defId: 'sword', x: 1, y: 1, exits: [] },
      ],
      { c: 1 },
    );

  it('攻撃は起点からのマス数 d で ×(1+X·d)。防具のマスも数え、枝の先はその枝の道のりで数える', () => {
    const { loadout, items } = fork('origin_far');
    const plan = planChain(loadout, items, 'o');
    expect(stepOf(plan, 'b').line?.damage).toBeCloseTo(1 + X * 2);
    for (const s of plan.steps.filter((x) => x.cell === 3))
      expect(s.line?.damage).toBeCloseTo(1 + X * 1);
    expect(stepOf(plan, 'e').line?.damage).toBeCloseTo(1 + X * 2);
    // The estimate (and so the bot's layout score) reads it
    const plain = fork('origin_stone');
    expect(estimateRoute(plan, items, 1).total).toBeGreaterThan(
      estimateRoute(planChain(plain.loadout, plain.items, 'o'), plain.items, 1).total,
    );
  });
});

describe('起点石の説明文', () => {
  it('数値はデータから差し込む', () => {
    const lead = getItemDef('origin_lead').line!.lead!;
    expect(itemDescVars(getItemDef('origin_lead'))).toEqual({ cells: lead.cells, v: lead.damage });
    expect(itemDescVars(getItemDef('origin_far'))).toEqual({
      v: getItemDef('origin_far').line!.far,
    });
    expect(itemDescVars(getItemDef('sword'))).toEqual({});
  });
});
