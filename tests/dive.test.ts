import { describe, expect, it } from 'vitest';
import { DIVE, LAW } from '../src/config/balance';
import { BASE_HERO_STATS, type RunResult } from '../src/core/combat';
import {
  diveResult,
  keepHalf,
  lawHero,
  lawStrikeMult,
  lawsOf,
  newDive,
  nextChoices,
  nextFloor,
  offerLaws,
  recordEncounter,
  rollFloorMap,
} from '../src/core/dive';
import { Rng } from '../src/core/rng';
import type { ItemInstance } from '../src/core/types';
import { LAWS, type LawId } from '../src/data/laws';
import { build } from './helpers';

const item = (uid: string): ItemInstance => ({
  uid,
  defId: 'sword',
  rarity: 'common',
  exits: [],
  rerollCount: 0,
});

function fightResult(over: Partial<RunResult> = {}): RunResult {
  return {
    reason: 'cleared',
    usedConsumables: [],
    progress: 0,
    reachedLoop: 1,
    drops: [],
    stats: {
      fires: 3,
      maxStep: 5,
      maxDamage: 40,
      totalDamage: 200,
      bossesDefeated: 0,
      timeGained: 0,
      gold: 4,
      sweeps: 0,
    },
    ticks: 600,
    ...over,
  };
}

describe('試作「潜る」: 地図', () => {
  it('選ぶ段が3つ（2〜3マス）と、最後にボス1つ。1段目に野営はない', () => {
    for (let s = 0; s < 200; s++) {
      const map = rollFloorMap(new Rng(s));
      expect(map.length).toBe(DIVE.rows + 1);
      for (const row of map.slice(0, DIVE.rows)) {
        expect(row.length).toBeGreaterThanOrEqual(2);
        expect(row.length).toBeLessThanOrEqual(3);
        expect(row.some((n) => n.kind === 'boss')).toBe(false);
      }
      expect(map[DIVE.rows]!.map((n) => n.kind)).toEqual(['boss']);
      expect(map[0]!.some((n) => n.kind === 'camp')).toBe(false);
    }
  });

  it('1階に精鋭と野営が少なくとも1つずつある', () => {
    for (let s = 0; s < 200; s++) {
      const kinds = rollFloorMap(new Rng(s))
        .flat()
        .map((n) => n.kind);
      expect(kinds).toContain('elite');
      expect(kinds).toContain('camp');
    }
  });

  it('どのマスにも次の段への道があり、どのマスにも前の段から来られる', () => {
    for (let s = 0; s < 200; s++) {
      const map = rollFloorMap(new Rng(s));
      for (let r = 0; r < map.length - 1; r++) {
        const reached = new Set<number>();
        for (const n of map[r]!) {
          expect(n.next.length).toBeGreaterThan(0);
          for (const j of n.next) {
            expect(j).toBeGreaterThanOrEqual(0);
            expect(j).toBeLessThan(map[r + 1]!.length);
            reached.add(j);
          }
        }
        expect(reached.size).toBe(map[r + 1]!.length);
      }
      expect(map[map.length - 1]![0]!.next).toEqual([]);
    }
  });

  it('ボスの段の手前の段より前は、どのマスからも行き先が2つ以上ある（一本道にしない）', () => {
    for (let s = 0; s < 200; s++) {
      const map = rollFloorMap(new Rng(s));
      for (let r = 0; r < DIVE.rows - 1; r++)
        for (const n of map[r]!) expect(n.next.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('行き先: 階の始めは1段目のすべて、そのあとは今のマスからつながるマス', () => {
    const map = rollFloorMap(new Rng(7));
    expect(nextChoices(map, null)).toEqual(map[0]!.map((_, col) => ({ row: 0, col })));
    const next = nextChoices(map, { row: 0, col: 0 });
    expect(next).toEqual(map[0]![0]!.next.map((col) => ({ row: 1, col })));
    expect(nextChoices(map, { row: DIVE.rows, col: 0 })).toEqual([]);
  });

  it('次の階: 階が1つ増え、新しい地図の始めから', () => {
    const d = newDive('cave', 99, 100);
    d.pos = { row: DIVE.rows, col: 0 };
    nextFloor(d);
    expect(d.floor).toBe(2);
    expect(d.pos).toBeNull();
    expect(d.map.length).toBe(DIVE.rows + 1);
  });
});

describe('試作「潜る」: 掟', () => {
  it('3択は持っていない掟から、重ならずに。残りが少なければその数だけ', () => {
    const all = LAWS.map((l) => l.id);
    const three = offerLaws(new Rng(1), []);
    expect(three.length).toBe(3);
    expect(new Set(three).size).toBe(3);
    const held = all.slice(0, all.length - 2);
    const two = offerLaws(new Rng(2), held);
    expect(two.sort()).toEqual(all.slice(all.length - 2).sort());
    expect(offerLaws(new Rng(3), all)).toEqual([]);
  });

  it('早撃ち: 勇者の攻撃間隔が ×0.6、ほかは変わらない', () => {
    expect(lawHero(BASE_HERO_STATS, [])).toEqual(BASE_HERO_STATS);
    const h = lawHero(BASE_HERO_STATS, ['quickFire']);
    expect(h.atbTime).toBeCloseTo(BASE_HERO_STATS.atbTime * LAW.quickFireAtb);
    expect(h.maxHp).toBe(BASE_HERO_STATS.maxHp);
  });

  it('一撃の倍率: 大連鎖は10連鎖目から、必殺の冴えは必殺技だけ、勝ち癖は勝った数だけ重なる', () => {
    const { loadout, items } = build(4, 3, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 's', defId: 'sword', x: 1, y: 0, exits: [] },
    ]);
    const fx = (laws: LawId[], wins = 0) => lawsOf(laws, loadout, items, wins);
    const hit = { uid: 's', step: 9, tech: false };
    expect(lawStrikeMult(fx([]), hit)).toBe(1);
    expect(lawStrikeMult(fx(['longChain']), hit)).toBe(1);
    expect(lawStrikeMult(fx(['longChain']), { ...hit, step: 10 })).toBe(LAW.longChainMult);
    expect(lawStrikeMult(fx(['technique']), hit)).toBe(1);
    expect(lawStrikeMult(fx(['technique']), { ...hit, tech: true })).toBe(LAW.techniqueMult);
    expect(lawStrikeMult(fx(['winStreak'], 3), hit)).toBeCloseTo(1 + 3 * LAW.winStreakPerWin);
  });

  it('四隅: 四隅のマスで鳴る装備（重ねの下も）だけ ×2', () => {
    const { loadout, items } = build(4, 3, [
      { uid: 'o', defId: 'origin_stone', x: 1, y: 0, exits: ['left'] },
      { uid: 'corner', defId: 'sword', x: 0, y: 0, exits: [] },
      { uid: 'mid', defId: 'sword', x: 2, y: 0, exits: [] },
      { uid: 'low', defId: 'dagger', x: 3, y: 2, exits: [] },
    ]);
    // 'low' sits under the corner's top
    const board = { ...loadout, cells: loadout.cells.map((u) => (u === 'low' ? null : u)) };
    board.under = board.cells.map((_, i) => (i === 0 ? ['low'] : []));
    const fx = lawsOf(['corners'], board, items, 0);
    expect(lawStrikeMult(fx, { uid: 'corner', step: 1, tech: false })).toBe(LAW.cornerMult);
    expect(lawStrikeMult(fx, { uid: 'low', step: 1, tech: false })).toBe(LAW.cornerMult);
    expect(lawStrikeMult(fx, { uid: 'mid', step: 1, tech: false })).toBe(1);
  });

  it('一色: 攻撃の重ねがすべて同じ属性のときだけ、全部 ×1.6', () => {
    const one = build(4, 3, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: [] },
      { uid: 'b', defId: 'axe', x: 2, y: 0, exits: [] },
      { uid: 'sh', defId: 'wood_shield', x: 3, y: 0, exits: [] },
    ]);
    const mixed = build(4, 3, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
      { uid: 'a', defId: 'sword', x: 1, y: 0, exits: [] },
      { uid: 'f', defId: 'torch', x: 2, y: 0, exits: [] },
    ]);
    const hit = { uid: 'a', step: 1, tech: false };
    expect(lawStrikeMult(lawsOf(['mono'], one.loadout, one.items, 0), hit)).toBe(LAW.monoMult);
    expect(lawStrikeMult(lawsOf(['mono'], mixed.loadout, mixed.items, 0), hit)).toBe(1);
  });

  it('重ねの極意: 重ねの倍率が ×1.5 / ×2 / ×3 になる', () => {
    const { loadout, items } = build(2, 1, [
      { uid: 'o', defId: 'origin_stone', x: 0, y: 0, exits: ['right'] },
    ]);
    expect(lawsOf([], loadout, items, 0).posMult).toBeUndefined();
    expect(lawsOf(['stack'], loadout, items, 0).posMult).toEqual(LAW.stackPosMult);
  });
});

describe('試作「潜る」: 袋と結果', () => {
  it('倒れたら袋の半分（端数切り捨て）を持ち帰る。どれも袋の中の物で、重ならない', () => {
    const bag = ['a', 'b', 'c', 'd', 'e'].map(item);
    const kept = keepHalf(new Rng(5), bag);
    expect(kept.length).toBe(Math.floor(bag.length * DIVE.deathKeep));
    expect(new Set(kept.map((i) => i.uid)).size).toBe(kept.length);
    for (const k of kept) expect(bag).toContain(k);
    expect(keepHalf(new Rng(5), [])).toEqual([]);
  });

  it('1戦ごとに、HP・勝ち数・拾った物・ゴールド・使った消耗品・記録をためる', () => {
    const d = newDive('grassland', 1, 120);
    expect(d.hp).toBe(120);
    recordEncounter(d, fightResult({ drops: [item('x')], usedConsumables: ['p1'] }), 80);
    recordEncounter(
      d,
      fightResult({
        drops: [item('y'), item('z')],
        stats: { ...fightResult().stats, maxStep: 9, gold: 6, bossesDefeated: 1 },
      }),
      60,
    );
    expect(d.hp).toBe(60);
    expect(d.wins).toBe(2);
    expect(d.bag.map((i) => i.uid)).toEqual(['x', 'y', 'z']);
    expect(d.gold).toBe(10);
    expect(d.used).toEqual(['p1']);
    expect(d.stats.maxStep).toBe(9);
    expect(d.stats.totalDamage).toBe(400);
    expect(d.stats.bossesDefeated).toBe(1);
    expect(d.ticks).toBe(1200);
  });

  it('帰ると袋を全部、倒れると半分（ゴールドも半分）。到達は何階まで', () => {
    const d = newDive('grassland', 1, 120);
    recordEncounter(d, fightResult({ drops: ['a', 'b', 'c', 'd'].map(item) }), 50);
    d.floor = 3;
    const home = diveResult(d, 'retreat', new Rng(1));
    expect(home.reason).toBe('retreat');
    expect(home.drops.length).toBe(4);
    expect(home.stats.gold).toBe(4);
    expect(home.reachedLoop).toBe(3);
    const dead = diveResult(d, 'dead', new Rng(1));
    expect(dead.reason).toBe('dead');
    expect(dead.drops.length).toBe(2);
    expect(dead.stats.gold).toBe(2);
  });
});
