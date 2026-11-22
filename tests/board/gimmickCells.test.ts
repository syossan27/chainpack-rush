import { describe, expect, it } from 'vitest';
import { gimmickCycle, planChain } from '../../src/core/chain';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../../src/core/combat';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { switchBoard } from '../../src/core/boardSave';
import { fitGimmicks, gimmicksLeft, ownedBoards } from '../../src/core/boards';
import { GIMMICK, NO_LUCK } from '../../src/config/balance';
import type { GimmickKind, Loadout } from '../../src/core/types';
import { build, type Placed } from '../helpers';

/** A stacked board (one item per cell) with gimmicks at the given cells */
function board(w: number, h: number, placed: Placed[], gimmicks: Record<number, GimmickKind>) {
  const all = build(w, h, placed);
  const loadout: Loadout = {
    ...all.loadout,
    under: all.loadout.cells.map(() => []),
    gimmicks: all.loadout.cells.map((_, i) => gimmicks[i] ?? null),
  };
  return { loadout, items: all.items };
}

const cellsOf = (plan: ReturnType<typeof planChain>) => plan.steps.slice(1).map((s) => s.uid);
const ringsPer = (plan: ReturnType<typeof planChain>) => {
  const n = new Map<string, number>();
  for (const s of plan.steps) n.set(s.uid, (n.get(s.uid) ?? 0) + 1);
  return n;
};

// 3×2: o → a → b ↓ c ← d ↑ (a loop a → b → c → d → a)
const loop = (aExits: Placed['exits']): Placed[] => [
  { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
  { uid: 'a', defId: 'sword', x: 1, y: 0, exits: aExits },
  { uid: 'b', defId: 'sword', x: 2, y: 0, exits: ['down'] },
  { uid: 'c', defId: 'sword', x: 2, y: 1, exits: ['left'] },
  { uid: 'd', defId: 'sword', x: 1, y: 1, exits: ['up'] },
];

describe('ギミックマス: 連鎖の進み方', () => {
  it('ギミックのない輪は1周で止まる（今と同じ）', () => {
    const { loadout, items } = board(3, 2, loop(['right']), {});
    const plan = planChain(loadout, items, 'o');
    expect(cellsOf(plan)).toEqual(['a', 'b', 'c', 'd']);
    expect(plan.maxStep).toBe(4);
  });

  describe('回転マスのある輪', () => {
    const { loadout, items } = board(3, 2, loop(['right']), { 1: 'rotate' });
    const plan = planChain(loadout, items, 'o');

    it('向きが変わるたびにもう一度鳴り、連鎖数が伸びる', () => {
      // a: right (→ b c d), then down (→ d), then left (→ the origin, which leads back to a), then up
      expect(cellsOf(plan)).toEqual(['a', 'b', 'c', 'd', 'a', 'd', 'a', 'o', 'a']);
      expect(plan.maxStep).toBe(8);
    });

    it('1マスが鳴るのは GIMMICK.maxVisits 回まで', () => {
      expect(Math.max(...ringsPer(plan).values())).toBe(GIMMICK.maxVisits);
    });

    it('4回回ると、はじめの向きに戻って終わる', () => {
      expect(plan.gimmickEnd?.[1]).toBe(0);
    });
  });

  it('向きの回り方は次の発火へ引き継ぐ', () => {
    const { loadout, items } = board(3, 2, loop(['right']), { 1: 'rotate' });
    const first = planChain(loadout, items, 'o', [0, 1, 0, 0, 0, 0]);
    // Starts facing down: a → d, then a faces left → the origin → a faces up (off the board)
    expect(cellsOf(first).slice(0, 2)).toEqual(['a', 'd']);
    expect(first.gimmickEnd?.[1]).not.toBe(1);
  });

  it('4方向の装備は回っても向きが変わらないので、輪にならない', () => {
    const { loadout, items } = board(3, 2, loop(['up', 'right', 'down', 'left']), { 1: 'rotate' });
    const plan = planChain(loadout, items, 'o');
    expect(Math.max(...ringsPer(plan).values())).toBe(1);
  });

  it('別の枝との合流は、ギミックを通っていても1回だけ', () => {
    // 3×3: o (1,0) goes left and right; both ways reach x (1,2). The left way passes a rotator
    const { loadout, items } = board(
      3,
      3,
      [
        { uid: 'o', defId: 'origin_stone', x: 1, y: 0, exits: ['left', 'right'] },
        { uid: 'l1', defId: 'sword', x: 0, y: 0, exits: ['down'] },
        { uid: 'l2', defId: 'sword', x: 0, y: 1, exits: ['down'] },
        { uid: 'l3', defId: 'sword', x: 0, y: 2, exits: ['right'] },
        { uid: 'r1', defId: 'sword', x: 2, y: 0, exits: ['down'] },
        { uid: 'r2', defId: 'sword', x: 2, y: 1, exits: ['down'] },
        { uid: 'r3', defId: 'sword', x: 2, y: 2, exits: ['left'] },
        { uid: 'x', defId: 'sword', x: 1, y: 2, exits: [] },
      ],
      { 3: 'rotate' },
    );
    const plan = planChain(loadout, items, 'o');
    expect(ringsPer(plan).get('x')).toBe(1);
  });

  it('切り替えマスは出口を1本ずつ順に使う（発火ごとに次の出口）', () => {
    const placed: Placed[] = [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 's', defId: 'sword', x: 1, y: 0, exits: ['right', 'down'] },
      { uid: 'r', defId: 'sword', x: 2, y: 0, exits: [] },
      { uid: 'd', defId: 'sword', x: 1, y: 1, exits: [] },
    ];
    const { loadout, items } = board(3, 2, placed, { 1: 'switch' });
    const a = planChain(loadout, items, 'o');
    expect(cellsOf(a)).toEqual(['s', 'r']);
    const b = planChain(loadout, items, 'o', a.gimmickEnd);
    expect(cellsOf(b)).toEqual(['s', 'd']);
  });

  it('ワープは対のマスへも伝わる。対から戻ってはこない', () => {
    // 4×1: o → w1 (no arrows); w2 at the far end leads on to nothing
    const { loadout, items } = board(
      4,
      2,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 'w1', defId: 'sword', x: 1, y: 0, exits: [] },
        { uid: 'w2', defId: 'sword', x: 3, y: 1, exits: ['left'] },
        { uid: 'z', defId: 'sword', x: 2, y: 1, exits: [] },
      ],
      { 1: 'warp', 7: 'warp' },
    );
    const plan = planChain(loadout, items, 'o');
    expect(cellsOf(plan)).toEqual(['w1', 'w2', 'z']);
  });

  it('残響の起点石は、最後のマスの最後の1回だけをもう一度鳴らす', () => {
    const placed = loop(['right']);
    placed[0] = { ...placed[0]!, defId: 'origin_echo' };
    const { loadout, items } = board(3, 2, placed, { 1: 'rotate' });
    const plan = planChain(loadout, items, 'o');
    const echoes = plan.steps.filter((s) => s.echo);
    expect(echoes.map((s) => s.uid)).toEqual(['a']);
  });
});

describe('ギミックマス: 盤面と保存・戦闘', () => {
  it('デバッグ機能が OFF なら、試作の盤面は持てず切り替えもできない', () => {
    const s = createInitialSave();
    expect(ownedBoards(s).some((b) => b.trial)).toBe(false);
    expect(switchBoard(s, 'spin')).toBe(false);
  });

  it('デバッグ機能が ON なら、試作の盤面（回転・切り替え・ワープ）を持てる', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    expect(
      ownedBoards(s)
        .filter((b) => b.trial)
        .map((b) => b.id),
    ).toEqual(['spin', 'turnout', 'link']);
  });

  describe('置いたギミック', () => {
    /** On the spin board (two rotators), with rotators put on cells 5 and 6 */
    const placedOnSpin = () => {
      const s = createInitialSave();
      s.settings.debug = true;
      switchBoard(s, 'spin');
      s.loadout.gimmicks![5] = 'rotate';
      s.loadout.gimmicks![6] = 'rotate';
      return s;
    };

    it('盤面ごとに置けるギミックの数が決まっている（回転の盤面は回転2つ）', () => {
      const s = createInitialSave();
      s.settings.debug = true;
      switchBoard(s, 'spin');
      expect(gimmicksLeft(s.loadout)).toEqual(['rotate', 'rotate']);
    });

    it('盤面の数より多く置いても、盤面の数に減らされる', () => {
      const s = placedOnSpin();
      s.loadout.gimmicks![7] = 'rotate';
      fitGimmicks(s.loadout);
      expect(s.loadout.gimmicks!.filter(Boolean)).toHaveLength(2);
    });

    it('保存して読み直しても残る', () => {
      const back = deserializeSave(serializeSave(placedOnSpin()));
      expect(back.loadout.gimmicks?.[5]).toBe('rotate');
    });

    it('ギミックのない盤面へ切り替えると外れる', () => {
      const s = placedOnSpin();
      switchBoard(s, 'standard');
      expect(s.loadout.gimmicks).toBeUndefined();
    });

    it('別の盤面へ切り替えて戻ると、置いた場所に残っている', () => {
      const s = placedOnSpin();
      switchBoard(s, 'standard');
      switchBoard(s, 'spin');
      expect([s.loadout.gimmicks?.[5], s.loadout.gimmicks?.[6]]).toEqual(['rotate', 'rotate']);
    });
  });

  describe('戦闘では発火ごとに、回った向きから線を計算し直す', () => {
    // A switch with two arrows alternates between them
    const sw = board(
      3,
      2,
      [
        { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
        { uid: 's', defId: 'sword', x: 1, y: 0, exits: ['right', 'down'] },
        { uid: 'r', defId: 'sword', x: 2, y: 0, exits: [] },
        { uid: 'd', defId: 'sword', x: 1, y: 1, exits: [] },
      ],
      { 1: 'switch' },
    );

    it('発火のたびに同じ向きへ戻る輪は、発火の型が1つ', () => {
      const { loadout, items } = board(3, 2, loop(['right']), { 1: 'rotate' });
      expect(gimmickCycle(loadout, items, 'o')).toHaveLength(1);
    });

    it('出口2本の切り替えマスは、発火の型が2つ交互', () => {
      expect(gimmickCycle(sw.loadout, sw.items, 'o').map(cellsOf)).toEqual([
        ['s', 'r'],
        ['s', 'd'],
      ]);
    });

    it('戦闘でも、切り替えマスの線が発火ごとに入れ替わる', () => {
      const c = new Combat({
        seed: 1,
        regionId: 'grassland',
        loadout: sw.loadout,
        items: sw.items,
        hero: BASE_HERO_STATS,
        luck: NO_LUCK,
      });
      const routes: string[][] = [];
      for (let i = 0; i < 60 * 30 && routes.length < 3 && !c.ended; i++) {
        c.step();
        for (const e of c.drainEvents()) if (e.type === 'chainStart') routes.push(cellsOf(e.plan));
      }
      expect(routes.slice(0, 3)).toEqual([
        ['s', 'r'],
        ['s', 'd'],
        ['s', 'r'],
      ]);
    });
  });
});

describe('長い連鎖の守り（よろめきの代わり）', () => {
  it('輪で戻ってきたマスは速く鳴る（2周目から次へ伝わる時間が短い）', () => {
    const { loadout, items } = board(3, 2, loop(['right']), { 1: 'rotate' });
    const plan = planChain(loadout, items, 'o');
    // a (pass 1) → b, and a (pass 2) → d: the second relay is shorter
    const gapAfter = (i: number) => plan.steps[i + 1]!.t - plan.steps[i]!.t;
    const a1 = plan.steps.findIndex((s) => s.uid === 'a');
    const a2 = plan.steps.findIndex((s, i) => i > a1 && s.uid === 'a');
    expect(gapAfter(a2)).toBeLessThan(gapAfter(a1));
    expect(gapAfter(a2)).toBeCloseTo(gapAfter(a1) * GIMMICK.passPace[1], 2);
  });

  describe('防具は鳴った瞬間に防御値を足す（連鎖の終わりを待たない）', () => {
    /** The rotator loop with a wooden shield on d, which comes round more than once */
    const run = () => {
      const placed = loop(['right']);
      placed[4] = { ...placed[4]!, defId: 'wood_shield' };
      const { loadout, items } = board(3, 2, placed, { 1: 'rotate' });
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
      const dRings = c.chain!.plan.steps.filter((s) => s.uid === 'd').length;
      const events: CombatEvent[] = [];
      while (c.chain) {
        c.step();
        events.push(...c.drainEvents());
      }
      const ups = events.flatMap((e) => (e.type === 'guardUp' ? [e.gain] : []));
      const endAt = events.findIndex((e) => e.type === 'chainEnd');
      const lastUpAt = events.map((e) => e.type).lastIndexOf('guardUp');
      const end = events[endAt];
      return {
        dRings,
        ups,
        lastUpAt,
        endAt,
        endGain: end?.type === 'chainEnd' ? end.defenseGain : -1,
      };
    };
    const r = run();

    it('防御値が入るのは、連鎖が終わる前', () => {
      expect(r.lastUpAt).toBeGreaterThanOrEqual(0);
      expect(r.lastUpAt).toBeLessThan(r.endAt);
    });

    it('輪で戻れば、戻るたびに足す', () => {
      expect(r.dRings).toBeGreaterThan(1);
      expect(r.ups).toHaveLength(r.dRings);
    });

    it('連鎖の終わりに出る防御値は、足した分の合計', () => {
      expect(r.endGain).toBe(r.ups.reduce((a, b) => a + b, 0));
    });
  });
});
