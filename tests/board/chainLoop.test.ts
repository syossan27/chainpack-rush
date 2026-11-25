import { describe, expect, it } from 'vitest';
import { planChain } from '../../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../../src/core/combat';
import { NO_LUCK } from '../../src/config/balance';
import type { Loadout } from '../../src/core/types';
import { build, type Placed } from '../helpers';

/** A stacked board with one item per cell */
function board(w: number, h: number, placed: Placed[]) {
  const all = build(w, h, placed);
  const loadout: Loadout = { ...all.loadout, under: all.loadout.cells.map(() => []) };
  return { loadout, items: all.items };
}

const cellsOf = (plan: ReturnType<typeof planChain>) => plan.steps.slice(1).map((s) => s.uid);

// 3×2: o → a → b ↓ c ← d ↑ (a loop a → b → c → d → a)
const loop = (): Placed[] => [
  { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
  { uid: 'a', defId: 'sword', x: 1, y: 0, exits: ['right'] },
  { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['down'] },
  { uid: 'c', defId: 'sword', x: 2, y: 1, exits: ['left'] },
  { uid: 'd', defId: 'sword', x: 1, y: 1, exits: ['up'] },
];

describe('輪になった線', () => {
  it('1周で止まる（同じマスは1回の連鎖で1回だけ鳴る）', () => {
    const { loadout, items } = board(3, 2, loop());
    const plan = planChain(loadout, items, 'o');
    expect([cellsOf(plan), plan.maxStep]).toEqual([['a', 'b', 'c', 'd'], 4]);
  });

  it('残響の起点石は、最後に鳴ったマスだけをもう一度鳴らす', () => {
    const placed = loop();
    placed[0] = { ...placed[0]!, defId: 'origin_echo' };
    const { loadout, items } = board(3, 2, placed);
    const plan = planChain(loadout, items, 'o');
    expect(plan.steps.filter((s) => s.echo).map((s) => s.uid)).toEqual(['d']);
  });
});

describe('防具は鳴った瞬間に防御値を足す（連鎖の終わりを待たない）', () => {
  /** The loop with a wooden shield on c */
  const run = () => {
    const placed = loop();
    placed[3] = { ...placed[3]!, defId: 'wood_shield' };
    const { loadout, items } = board(3, 2, placed);
    const c = new Combat({
      seed: 1,
      regionId: 'grassland',
      loadout,
      items,
      hero: BASE_HERO_STATS,
      luck: NO_LUCK,
      mode: 'dummy',
    });
    c.fireNext();
    const events: CombatEvent[] = [];
    while (c.chain) {
      c.step();
      events.push(...c.drainEvents());
    }
    const ups = events.flatMap((e) => (e.type === 'guardUp' ? [e.gain] : []));
    const endAt = events.findIndex((e) => e.type === 'chainEnd');
    const end = events[endAt];
    return {
      ups,
      lastUpAt: events.map((e) => e.type).lastIndexOf('guardUp'),
      endAt,
      endGain: end?.type === 'chainEnd' ? end.defenseGain : -1,
    };
  };
  const r = run();

  it('防御値が入るのは、連鎖が終わる前', () => {
    expect(r.lastUpAt).toBeGreaterThanOrEqual(0);
    expect(r.lastUpAt).toBeLessThan(r.endAt);
  });

  it('連鎖の終わりに出る防御値は、足した分の合計', () => {
    expect([r.ups.length, r.endGain]).toEqual([1, r.ups[0]]);
  });
});
