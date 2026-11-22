import { describe, expect, it } from 'vitest';
import { anchorAt, anchorToWorld, heroFrameOf, type AnchorTable } from '../../src/core/heroAnchors';
import { HERO_ANCHORS } from '../../src/data/heroAnchors';
import { UNIT_SPRITES } from '../../src/data/sprites';

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

  it('表で隠すコマ・範囲外のコマ・知らない衣装やアニメや種類は null', () => {
    expect(anchorAt(table, 'knight', 'special', 1, 'tip')).toBeNull();
    expect(anchorAt(table, 'knight', 'special', 3, 'tip')).toBeNull();
    expect(anchorAt(table, 'knight', 'special', -1, 'tip')).toBeNull();
    expect(anchorAt(table, 'dragon', 'special', 0, 'tip')).toBeNull();
    expect(anchorAt(table, 'knight', 'idle', 0, 'tip')).toBeNull();
    expect(anchorAt(table, 'knight', 'special', 0, 'head')).toBeNull();
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
    expect(tips).toHaveLength(9);
    expect(tips.every((p) => p !== null)).toBe(true);
  });

  it('勇者の必殺は共通の動きだけ', () => {
    const names = Object.keys(UNIT_SPRITES.hero!.anims!).filter((k) => k.startsWith('special'));
    expect(names).toEqual(['special']);
  });
});

describe('騎士の頭と背中の位置（小物の付け根）', () => {
  it('勇者の全アニメの全コマに頭と背中がある（背中を隠すコマは null）。点はコマの中', () => {
    const hero = UNIT_SPRITES.hero!;
    for (const [name, anim] of Object.entries(hero.anims!)) {
      const a = HERO_ANCHORS.knight![name]!;
      expect(a, name).toBeDefined();
      expect(a.head, name).toHaveLength(anim!.frames);
      expect(a.back, name).toHaveLength(anim!.frames);
      expect(
        a.head!.every((p) => p !== null),
        name,
      ).toBe(true);
      const w = anim!.frameWidth ?? hero.frameWidth;
      const h = anim!.frameHeight ?? hero.frameHeight;
      for (const p of [...a.head!, ...a.back!]) {
        if (!p) continue;
        expect(p[0], name).toBeGreaterThanOrEqual(0);
        expect(p[0], name).toBeLessThan(w);
        expect(p[1], name).toBeGreaterThanOrEqual(0);
        expect(p[1], name).toBeLessThan(h);
      }
    }
  });

  it('待機の1コマ目は頭も背中も見える（地域選択の小窓・拠点の静止画）', () => {
    expect(anchorAt(HERO_ANCHORS, 'knight', 'idle', 0, 'head')).not.toBeNull();
    expect(anchorAt(HERO_ANCHORS, 'knight', 'idle', 0, 'back')).not.toBeNull();
  });

  it('勇者の絵の今のコマ: アニメのコマ・静止画は待機の1コマ目・それ以外は null', () => {
    expect(heroFrameOf('hero', 'hero_run', 3)).toEqual({ anim: 'run', frame: 3 });
    expect(heroFrameOf('hero', 'hero_run', '3')).toEqual({ anim: 'run', frame: 3 });
    expect(heroFrameOf('hero', 'hero', '__BASE')).toEqual({ anim: 'idle', frame: 0 });
    expect(heroFrameOf('hero', 'hero_look_hero_gold', '__BASE')).toBeNull();
    expect(heroFrameOf('hero', 'slime_idle', 0)).toBeNull();
    expect(heroFrameOf('hero', 'hero_run', -1)).toBeNull();
    expect(heroFrameOf('hero', 'hero_run', 1.5)).toBeNull();
  });
});
