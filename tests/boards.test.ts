import { describe, expect, it } from 'vitest';
import { PROGRESS, STACK } from '../src/config/balance';
import {
  boardDamageMult,
  boardDepth,
  boardPosMult,
  boardSize,
  boardValue,
  holeIn,
  isHole,
  ownedBoards,
} from '../src/core/boards';
import { createInitialSave } from '../src/core/save';
import { BOARDS, getBoard } from '../src/data/boards';
import { REGIONS } from '../src/data/regions';

describe('試作「盤面の種類」: 一覧', () => {
  it('形はこわれていない（行の長さがそろい、画面に収まり、マスが4つ以上）', () => {
    for (const b of BOARDS) {
      const { width, height } = boardSize(b);
      expect(
        b.mask.every((r) => r.length === width),
        b.id,
      ).toBe(true);
      expect(width).toBeLessThanOrEqual(5);
      expect(height).toBeLessThanOrEqual(5);
      expect(
        b.mask
          .join('')
          .split('')
          .filter((c) => c === 'X').length,
      ).toBeGreaterThanOrEqual(4);
      expect(/^[X.]+$/.test(b.mask.join('')), b.id).toBe(true);
    }
  });

  it('ご褒美は地域ごとに1つずつ。標準だけは最初から', () => {
    const rewards = BOARDS.filter((b) => b.reward).map((b) => b.reward);
    expect(new Set(rewards).size).toBe(rewards.length);
    expect(rewards.sort()).toEqual(REGIONS.map((r) => r.id).sort());
    expect(BOARDS.filter((b) => !b.reward).map((b) => b.id)).toEqual(['standard']);
  });

  it('形の外は穴。知らない盤面は標準として扱う', () => {
    const crystal = getBoard('crystal');
    expect(isHole(crystal, 0)).toBe(true);
    expect(isHole(crystal, 2)).toBe(false);
    expect(isHole(getBoard('standard'), 0)).toBe(false);
    expect(isHole(crystal, 99)).toBe(true);
    expect(getBoard('nope').id).toBe('standard');
  });

  it('普通のバックパック（盤面の指定なし）には穴がない。重ねる盤面は形どおり', () => {
    const bag = {
      width: 7,
      height: 5,
      cells: Array(35).fill(null),
      originOrder: [],
      consumables: [],
    };
    expect(holeIn(bag, 34)).toBe(false);
    expect(holeIn({ ...bag, width: 5, height: 4, board: 'crystal' }, 0)).toBe(true);
    expect(holeIn({ ...bag, width: 5, height: 4, board: 'crystal' }, 2)).toBe(false);
  });
});

describe('試作「盤面の種類」: 特徴', () => {
  it('ダメージの倍率は、盤面全体の倍率と属性の倍率をかけたもの', () => {
    expect(boardDamageMult(getBoard('standard'), 'fire')).toBe(1);
    expect(boardDamageMult(getBoard('small'), 'physical')).toBe(getBoard('small').damage);
    expect(boardDamageMult(getBoard('flame'), 'fire')).toBe(getBoard('flame').elements!.fire);
    expect(boardDamageMult(getBoard('flame'), 'ice')).toBe(1);
    expect(boardDamageMult(getBoard('crystal'), 'water')).toBe(getBoard('crystal').elements!.water);
    expect(boardDamageMult(getBoard('lightning'), undefined)).toBe(1);
  });

  it('深い盤面は1マスに4つまで、位置の倍率は ×1・×1.25・×1.5・×2。ほかは3つまで', () => {
    expect(boardDepth(getBoard('deep'))).toBe(4);
    expect(boardPosMult(getBoard('deep'))).toEqual([1, 1.25, 1.5, 2]);
    expect(boardDepth(getBoard('standard'))).toBe(STACK.max);
    expect(boardPosMult(getBoard('gale'))).toEqual(STACK.posMult);
  });

  it('説明に入る値', () => {
    expect(boardValue(getBoard('gale'))).toBe(0.7);
    expect(boardValue(getBoard('small'))).toBe(getBoard('small').damage);
    expect(boardValue(getBoard('crystal'))).toBe(getBoard('crystal').elements!.ice);
    expect(boardValue(getBoard('deep'))).toBe(4);
    expect(boardValue(getBoard('standard'))).toBeUndefined();
  });
});

describe('試作「盤面の種類」: 持っている盤面', () => {
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
