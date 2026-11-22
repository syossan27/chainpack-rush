import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  TECH_FX,
  bodyOrigin,
  flyFormation,
  flyStart,
  scaleMs,
  specialTimeline,
  spikeTrail,
  strikePoint,
  techFxFor,
} from '../../src/data/techFx';
import { TECHNIQUES } from '../../src/data/techniques';

// The knight's shared special motion: 9 frames at 14 fps, the swing lands on frame 4
const body = { frames: 9, fps: 14, impactFrame: 4 };

describe('必殺技の演出', () => {
  it('すべての技に演出がある', () => {
    for (const t of TECHNIQUES) expect(techFxFor(t.id)?.techId).toBe(t.id);
  });

  it('着弾の演出は技ごとにすべて違う', () => {
    const impacts = Object.values(TECH_FX).map((f) => f.impact);
    expect(new Set(impacts).size).toBe(impacts.length);
  });

  it('騎士の共通の動きで、振り抜きは約0.29秒、着弾は約0.45秒', () => {
    const t = specialTimeline(body, TECH_FX.crimson!, 240);
    expect(t.releaseMs).toBeCloseTo(285.7, 0);
    expect(t.landMs).toBeGreaterThanOrEqual(400);
    expect(t.landMs).toBeLessThanOrEqual(500);
  });

  it('どの技も、敵まで 240px なら全体は 0.8 秒以内', () => {
    for (const fx of Object.values(TECH_FX))
      expect(specialTimeline(body, fx, 240).endMs).toBeLessThanOrEqual(800);
  });

  it('雷は3本目が落ちたところで大きな演出', () => {
    expect(specialTimeline(body, TECH_FX.thunder!, 240).landMs).toBeCloseTo(285.7 + 60 + 160, 0);
  });

  it('とても近くても、飛ぶ時間は 90ms より短くならない', () => {
    const near = specialTimeline(body, TECH_FX.crimson!, 10);
    expect(near.landMs - near.releaseMs).toBeCloseTo(90, 5);
  });

  it('とても遠くても、飛ぶ時間は 260ms より長くならない', () => {
    const far = specialTimeline(body, TECH_FX.crimson!, 5000);
    expect(far.landMs - far.releaseMs).toBeCloseTo(260, 5);
  });

  it('演出の時間はゲームの速さで割る', () => {
    expect(scaleMs(600, 2)).toBe(300);
  });

  it('ゲームを止めているときは 0.1 倍速として扱う', () => {
    expect(scaleMs(600, 0)).toBe(6000);
  });

  it('飛ぶ本体は剣先の前から、敵と同じ高さで真横に飛ぶ', () => {
    expect(flyStart({ x: 300, y: 560 }, { x: 520, y: 470 })).toEqual({ x: 300, y: 470 });
  });

  it.each([
    ['sky', { x: 0.5, y: 1 }],
    ['ground', { x: 0.5, y: 1 }],
  ] as const)('落ちる本体・地面を走る本体（%s）は下の端で位置を合わせる', (path, origin) => {
    expect(bodyOrigin(path)).toEqual(origin);
  });

  it('飛ぶ本体は真ん中で位置を合わせる', () => {
    expect(bodyOrigin('fly')).toEqual({ x: 0.5, y: 0.5 });
  });

  it('空から落ちる本体は敵の足元まで落ちる', () => {
    expect(strikePoint({ x: 500, y: 471, footY: 548 })).toEqual({ x: 500, y: 548 });
  });

  it('敵の足元がわからなければ、当たる位置まで落ちる', () => {
    expect(strikePoint({ x: 500, y: 471 })).toEqual({ x: 500, y: 471 });
  });

  it('氷のトゲは剣先から敵へ、等しい間をあけて順に出る', () => {
    const t = spikeTrail(100, 400);
    expect(t.map((s) => Math.round(s.x))).toEqual([200, 300]);
    expect(t.map((s) => s.at)).toEqual([1 / 3, 2 / 3]);
  });

  it('氷のトゲはだんだん大きくなるが、着弾の結晶より小さい', () => {
    const t = spikeTrail(100, 400);
    expect(t[0]!.scale).toBeLessThan(t[1]!.scale);
    expect(t[1]!.scale).toBeLessThan(1);
  });

  it('氷のトゲは敵が近くても2本出る', () => {
    expect(spikeTrail(300, 340)).toHaveLength(2);
  });

  it('トリプルの3本は「>」の形（真ん中が先頭、上下は少し後ろ）', () => {
    expect(flyFormation(3)).toEqual([
      { dx: -36, dy: -36 },
      { dx: 0, dy: 0 },
      { dx: -36, dy: 36 },
    ]);
  });

  it('1本だけなら、ずらさずに飛ぶ', () => {
    expect(flyFormation(1)).toEqual([{ dx: 0, dy: 0 }]);
  });

  it('トリプルの3本はそろって飛ぶ（間をあけない）', () => {
    expect(TECH_FX.triple!.body.gapMs).toBe(0);
  });

  it('ヴェノムの X は明るい1コマだけ（暗い赤は残さない）', () => {
    expect(TECH_FX.venom!.body.frames).toBe(1);
  });

  it('ヴェノムの X は当たると光って広がりながら消える', () => {
    expect(TECH_FX.venom!.body.burst).toBe(true);
  });

  it('ほかの技（クリムゾン・バースト）の本体は、当たっても広がらない', () => {
    expect(TECH_FX.crimson!.body.burst).toBeFalsy();
  });

  it('知らない技は演出なし', () => {
    expect(techFxFor('nope')).toBeUndefined();
    expect(techFxFor(undefined)).toBeUndefined();
  });

  it('クリムゾン・バーストの本体の絵がある', () => {
    expect(existsSync(spritePath(TECH_FX.crimson!.body.file))).toBe(true);
  });

  it.each(
    Object.values(TECH_FX)
      .filter((fx) => existsSync(spritePath(fx.body.file)))
      .map((fx) => [fx.techId, fx] as const),
  )('置いてある本体の絵 %s は、表の枠とコマ数に合う（横並び）', (_, fx) => {
    expect(pngSize(spritePath(fx.body.file))).toEqual([
      fx.body.frameWidth * fx.body.frames,
      fx.body.frameHeight,
    ]);
  });
});

function spritePath(file: string): URL {
  return new URL(`../../assets/sprites/${file}`, import.meta.url);
}

/** Width and height from a PNG's IHDR chunk */
function pngSize(path: URL): [number, number] {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
