import { describe, expect, it } from 'vitest';
import { listGesture } from '../src/core/listGesture';

const base = { onItem: true, canScroll: true, heldMs: 0, dx: 0, dy: -40 };

describe('倉庫の一覧: 押して動かしたときにドラッグかスクロールか', () => {
  it('スクロールできる一覧で、すばやく縦に払ったらスクロール', () => {
    expect(listGesture(base)).toBe('scroll');
  });

  it('少し押さえてから動かしたらドラッグ', () => {
    expect(listGesture({ ...base, heldMs: 150 })).toBe('drag');
  });

  it('横へ動かしたらドラッグ', () => {
    expect(listGesture({ ...base, dx: 40, dy: -10 })).toBe('drag');
  });

  it('スクロールできない一覧（装備が少ない）では、すばやく縦に動かしてもドラッグ', () => {
    expect(listGesture({ ...base, canScroll: false })).toBe('drag');
  });

  it('装備のないところを押したら、スクロールできなくてもドラッグにしない', () => {
    expect(listGesture({ ...base, onItem: false, canScroll: false })).toBe('scroll');
    expect(listGesture({ ...base, onItem: false, heldMs: 500 })).toBe('scroll');
  });
});
