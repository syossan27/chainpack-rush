import { describe, expect, it } from 'vitest';
import { anchorAt, anchorToWorld, heroFrameOf, type AnchorTable } from '../../src/core/heroAnchors';
import { HERO_ANCHORS } from '../../src/data/heroAnchors';
import { UNIT_SPRITES } from '../../src/data/sprites';

/** The hero's animations with their frame data */
const HERO_ANIMS = Object.entries(UNIT_SPRITES.hero!.anims!).map(
  ([name, anim]) => [name, anim!] as const,
);

const table: AnchorTable = {
  knight: {
    special: {
      tip: [[90, 40], null, [100, 60]],
    },
  },
};

describe('勇者の位置の表', () => {
  it('表にあるコマの位置を返す', () => {
    expect(anchorAt(table, 'knight', 'special', 0, 'tip')).toEqual([90, 40]);
    expect(anchorAt(table, 'knight', 'special', 2, 'tip')).toEqual([100, 60]);
  });

  it.each([
    ['表で隠すコマ', 'knight', 'special', 1, 'tip'],
    ['範囲外のコマ（後ろ）', 'knight', 'special', 3, 'tip'],
    ['範囲外のコマ（負）', 'knight', 'special', -1, 'tip'],
    ['知らない衣装', 'dragon', 'special', 0, 'tip'],
    ['知らないアニメ', 'knight', 'idle', 0, 'tip'],
    ['知らない種類', 'knight', 'special', 0, 'head'],
  ] as const)('%sは null', (_, costume, anim, frame, kind) => {
    expect(anchorAt(table, costume, anim, frame, kind)).toBeNull();
  });

  it('コマの中の位置を画面の位置にする（原点・倍率に合わせる）', () => {
    const frame = { width: 160, height: 112 };
    const origin = { originX: 0.3187, originY: 0.7857 };
    const feet = anchorToWorld([51, 88], frame, origin, { x: 280, y: 548 }, 2);
    expect(feet.x).toBeCloseTo(280, 0);
    expect(feet.y).toBeCloseTo(548, 0);
    const tip = anchorToWorld([91, 48], frame, origin, { x: 280, y: 548 }, 2);
    expect(tip.x).toBeCloseTo(360, 0);
    expect(tip.y).toBeCloseTo(468, 0);
  });
});

describe('騎士の必殺の共通の動き', () => {
  it('騎士の共通の動きは 9コマ・14fps・決めは4（ほかの衣装の基準）', () => {
    expect(UNIT_SPRITES.hero!.anims!.special).toEqual({
      file: 'hero/hero_special.png',
      frames: 9,
      fps: 14,
      loop: false,
      frameWidth: 160,
      frameHeight: 112,
      originX: 0.3187,
      originY: 0.7857,
      impactFrame: 4,
    });
  });

  it('共通の動きの剣先が全コマにある', () => {
    const tips = HERO_ANCHORS.knight!.special!.tip!;
    expect(tips).toHaveLength(UNIT_SPRITES.hero!.anims!.special!.frames);
    expect(tips.every((p) => p !== null)).toBe(true);
  });

  it('勇者の必殺は共通の動きだけ', () => {
    const names = Object.keys(UNIT_SPRITES.hero!.anims!).filter((k) => k.startsWith('special'));
    expect(names).toEqual(['special']);
  });
});

describe('騎士の頭と背中の位置（小物の付け根）', () => {
  it('勇者のどのアニメにも、頭と背中の位置の表がある', () => {
    const missing = HERO_ANIMS.filter(([name]) => !HERO_ANCHORS.knight![name]);
    expect(missing.map(([name]) => name)).toEqual([]);
  });

  it.each(HERO_ANIMS)(
    '%s: 頭と背中の位置がコマ数ぶんある（背中を隠すコマは null）',
    (name, anim) => {
      const a = HERO_ANCHORS.knight![name]!;
      expect(a.head).toHaveLength(anim.frames);
      expect(a.back).toHaveLength(anim.frames);
    },
  );

  it.each(HERO_ANIMS)('%s: 頭はどのコマでも見える', (name) => {
    expect(HERO_ANCHORS.knight![name]!.head!.every((p) => p !== null)).toBe(true);
  });

  it.each(HERO_ANIMS)('%s: 頭と背中の点はコマの中', (name, anim) => {
    const a = HERO_ANCHORS.knight![name]!;
    const w = anim.frameWidth ?? UNIT_SPRITES.hero!.frameWidth;
    const h = anim.frameHeight ?? UNIT_SPRITES.hero!.frameHeight;
    const outside = [...a.head!, ...a.back!].filter(
      (p) => p && (p[0] < 0 || p[0] >= w || p[1] < 0 || p[1] >= h),
    );
    expect(outside).toEqual([]);
  });

  it('待機の1コマ目は頭も背中も見える（地域選択の小窓・拠点の静止画）', () => {
    expect(anchorAt(HERO_ANCHORS, 'knight', 'idle', 0, 'head')).not.toBeNull();
    expect(anchorAt(HERO_ANCHORS, 'knight', 'idle', 0, 'back')).not.toBeNull();
  });

  it.each([
    ['アニメのコマ', 'hero_run', 3, { anim: 'run', frame: 3 }],
    ['アニメのコマ（文字の番号）', 'hero_run', '3', { anim: 'run', frame: 3 }],
    ['静止画は待機の1コマ目', 'hero', '__BASE', { anim: 'idle', frame: 0 }],
    ['見た目を塗り替えた静止画', 'hero_look_hero_gold', '__BASE', null],
    ['ほかのユニットの絵', 'slime_idle', 0, null],
    ['負のコマ', 'hero_run', -1, null],
    ['整数でないコマ', 'hero_run', 1.5, null],
  ])('勇者の絵の今のコマ: %s', (_, texture, frame, expected) => {
    expect(heroFrameOf('hero', texture, frame)).toEqual(expected);
  });
});
