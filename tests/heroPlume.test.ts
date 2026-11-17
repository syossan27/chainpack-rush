import { describe, expect, it } from 'vitest';
import { erasePlume } from '../src/core/heroPlume';

// A tiny sheet of RGBA pixels, frames side by side. '.' empty, 'R' plume red, 'K' outline,
// 'A' armor grey, 'S' sword white, 'M' the plume's mid outline (too light to count as dark)
const COLORS: Record<string, [number, number, number]> = {
  R: [200, 30, 60],
  K: [20, 16, 24],
  M: [49, 47, 61],
  A: [150, 150, 160],
  S: [235, 235, 240],
};

function sheet(rows: string[]): { data: Uint8ClampedArray; width: number } {
  const width = rows[0]!.length;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = COLORS[ch];
      if (!c) return;
      data.set([...c, 255], (y * width + x) * 4);
    }),
  );
  return { data, width };
}

function picture(data: Uint8ClampedArray, width: number): string[] {
  const out: string[] = [];
  for (let y = 0; y < data.length / 4 / width; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) row += '.';
      else {
        const hit = Object.entries(COLORS).find(
          ([, c]) => c[0] === data[i] && c[1] === data[i + 1],
        );
        row += hit ? hit[0] : '?';
      }
    }
    out.push(row);
  }
  return out;
}

describe('勇者の赤い羽飾りを消す（炎の羽飾りを着けているとき）', () => {
  it('頭の位置より上の赤とその輪郭だけを消し、剣・鎧・下のマントの赤は残す', () => {
    // Two 6x7 frames; the head (dome top) is at y=4 in the first and y=3 in the second
    const { data, width } = sheet([
      '.KK.....KK..',
      'KRRK.S.KRRKS',
      'KRRK.S.KRRKS',
      '.KK..S.AKKAS',
      'AAAAAAAAAAAA',
      'ARRA..ARRA..',
      'AAAA..AAAA..',
    ]);
    erasePlume(data, width, 6, 7, [4, 3]);
    expect(picture(data, width)).toEqual([
      '............',
      '.....S.....S',
      '.....S.....S',
      '.....S.AKKAS',
      'AAAAAAAAAAAA',
      'ARRA..ARRA..',
      'AAAA..AAAA..',
    ]);
  });

  it('羽を消したあとに離れて残った点も消す', () => {
    // The lone outline pixel at the top left is not next to the plume, only left alone by it
    const { data, width } = sheet(['K.....', '...KRK', '......', 'AAAAAA']);
    erasePlume(data, width, 6, 4, [3]);
    expect(picture(data, width)).toEqual(['......', '......', '......', 'AAAAAA']);
  });

  it('頭より上に浮いて残った小さなかけら（2〜6点）も消す。体につながる物は残す', () => {
    // A 2-px piece of the plume's outline floats above the head line (y=3); the sword tip above
    // the line reaches down to the body, and a 7-px piece is too big to be a leftover
    const { data, width } = sheet(['.MM.S...', '....S.MM', '....S.MM', 'AAAAS.MM', 'AAAAAA.M']);
    erasePlume(data, width, 8, 5, [3]);
    expect(picture(data, width)).toEqual([
      '....S...',
      '....S.MM',
      '....S.MM',
      'AAAAS.MM',
      'AAAAAA.M',
    ]);
    const { data: d2, width: w2 } = sheet(['MMMMMMM.', '........', '........', 'AAAAAAAA']);
    erasePlume(d2, w2, 8, 4, [3]);
    expect(picture(d2, w2)[0]).toBe('MMMMMMM.');
  });
});
