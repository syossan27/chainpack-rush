import { describe, expect, it } from 'vitest';
import { PROGRESS, STACK } from '../../src/config/balance';
import {
  boardDamageMult,
  boardDepth,
  boardPosMult,
  boardSize,
  boardValue,
  holeIn,
  isHole,
  ownedBoards,
} from '../../src/core/boards';
import { createInitialSave } from '../../src/core/save';
import { recenterOffset } from '../../src/core/stack';
import { BOARDS, getBoard } from '../../src/data/boards';
import { REGIONS } from '../../src/data/regions';

describe('盤面の種類: 一覧', () => {
  it.each(BOARDS.map((b) => [b.id, b] as const))(
    '%s: 形はこわれていない（行の長さがそろい、画面に収まり、マスが4つ以上）',
    (_, b) => {
      const { width, height } = boardSize(b);
      expect(b.mask.every((r) => r.length === width)).toBe(true);
      expect(width).toBeLessThanOrEqual(6);
      expect(height).toBeLessThanOrEqual(5);
      expect(
        b.mask
          .join('')
          .split('')
          .filter((c) => c === 'X').length,
      ).toBeGreaterThanOrEqual(4);
      expect(/^[X.]+$/.test(b.mask.join(''))).toBe(true);
    },
  );

  it('ご褒美の盤面は地域ごとに1つずつ', () => {
    const rewards = BOARDS.filter((b) => b.reward).map((b) => b.reward);
    expect(new Set(rewards).size).toBe(rewards.length);
    expect(rewards.sort()).toEqual(REGIONS.map((r) => r.id).sort());
  });

  it('最初から持っている盤面は標準だけ', () => {
    expect(BOARDS.filter((b) => !b.reward).map((b) => b.id)).toEqual(['standard']);
  });

  it('形の外は穴', () => {
    const crystal = getBoard('crystal');
    expect(isHole(crystal, 0)).toBe(true);
    expect(isHole(crystal, 2)).toBe(false);
    expect(isHole(getBoard('standard'), 0)).toBe(false);
    expect(isHole(crystal, 99)).toBe(true);
  });

  it('知らない盤面は標準として扱う', () => {
    expect(getBoard('nope').id).toBe('standard');
  });

  const bag = {
    width: 7,
    height: 5,
    cells: Array(35).fill(null),
    originOrder: [],
    consumables: [],
  };

  it('普通のバックパック（盤面の指定なし）には穴がない', () => {
    expect(holeIn(bag, 34)).toBe(false);
  });

  it('重ねる盤面の穴は形どおり', () => {
    expect(holeIn({ ...bag, width: 5, height: 4, board: 'crystal' }, 0)).toBe(true);
    expect(holeIn({ ...bag, width: 5, height: 4, board: 'crystal' }, 2)).toBe(false);
  });
});

describe('盤面の種類: 特徴', () => {
  it('ダメージの倍率は、盤面全体の倍率と属性の倍率をかけたもの', () => {
    expect(boardDamageMult(getBoard('standard'), 'fire')).toBe(1);
    expect(boardDamageMult(getBoard('small'), 'physical')).toBe(getBoard('small').damage);
    expect(boardDamageMult(getBoard('flame'), 'fire')).toBe(getBoard('flame').elements!.fire);
    expect(boardDamageMult(getBoard('flame'), 'ice')).toBe(1);
    expect(boardDamageMult(getBoard('crystal'), 'water')).toBe(getBoard('crystal').elements!.water);
    expect(boardDamageMult(getBoard('lightning'), undefined)).toBe(1);
  });

  it('深い盤面はふつうの盤面より多く重ねられる。ほかの盤面はふつうの深さ', () => {
    expect(boardDepth(getBoard('deep'))).toBe(getBoard('deep').depth);
    expect(boardDepth(getBoard('deep'))).toBeGreaterThan(STACK.max);
    expect(boardDepth(getBoard('standard'))).toBe(STACK.max);
  });

  it('深い盤面の位置の倍率は深さの数だけあり、一番上はふつうの盤面と同じ。ほかの盤面はふつうの倍率', () => {
    const deep = boardPosMult(getBoard('deep'));
    expect(deep).toEqual(STACK.deepPosMult);
    expect(deep).toHaveLength(boardDepth(getBoard('deep')));
    expect(deep.at(-1)).toBe(STACK.posMult.at(-1));
    expect(boardPosMult(getBoard('gale'))).toEqual(STACK.posMult);
  });

  it('説明に入る値は、その盤面の特徴の値', () => {
    expect(boardValue(getBoard('gale'))).toBe(getBoard('gale').wait);
    expect(boardValue(getBoard('small'))).toBe(getBoard('small').damage);
    expect(boardValue(getBoard('crystal'))).toBe(getBoard('crystal').elements!.ice);
    expect(boardValue(getBoard('deep'))).toBe(getBoard('deep').depth);
    expect(boardValue(getBoard('standard'))).toBeUndefined();
  });
});

describe('盤面の種類: 持っている盤面', () => {
  it('初めは標準だけ。地域を抜ける（次が開く）とその地域のご褒美が増える', () => {
    const s = createInitialSave();
    expect(ownedBoards(s).map((b) => b.id)).toEqual(['standard']);
    s.progress.unlocked.push('cave');
    expect(ownedBoards(s).map((b) => b.id)).toEqual(['standard', 'gale']);
  });

  it('次の地域がない魔王城は、最高到達で抜けたかを見る', () => {
    const s = createInitialSave();
    s.progress.best.demon_castle = PROGRESS.unlockLoop;
    expect(ownedBoards(s).some((b) => b.id === 'deep')).toBe(false);
    s.progress.best.demon_castle = PROGRESS.unlockLoop + 1;
    expect(ownedBoards(s).some((b) => b.id === 'deep')).toBe(true);
  });
});

describe('盤面が大きくなった（2026-11-26）', () => {
  // The masks before the boards grew
  const OLD: Record<string, readonly string[]> = {
    standard: ['XXXX', 'XXXX', 'XXXX'],
    gale: ['XXXXX', 'XXXXX'],
    small: ['XXX', 'XXX'],
    crystal: ['..X..', '.XXX.', 'XXXXX', '.XXX.'],
    flame: ['..X.', '.XX.', '.XXX', 'XXXX'],
    lightning: ['..XX', '.XX.', 'XXXX', '.XX.', 'XX..'],
    deep: ['XXX', 'XXX', 'XXX'],
  };

  it.each(BOARDS.map((b) => [b.id, b] as const))(
    '%s: 古い形のマスは、真ん中へ寄せるとすべて新しい形の内側に入る',
    (id, b) => {
      const old = OLD[id]!;
      const size = boardSize(b);
      const { dx, dy } = recenterOffset({ width: old[0]!.length, height: old.length }, size);
      const outside = old.flatMap((row, y) =>
        [...row].flatMap((c, x) =>
          c === 'X' && isHole(b, (y + dy) * size.width + x + dx) ? [[x, y]] : [],
        ),
      );
      expect(outside).toEqual([]);
    },
  );

  it('大きくなった盤面はどれも、前より広い', () => {
    const cellsOf = (m: readonly string[]) => m.join('').split('X').length - 1;
    expect(BOARDS.filter((b) => cellsOf(b.mask) <= cellsOf(OLD[b.id]!)).map((b) => b.id)).toEqual(
      [],
    );
  });
});
