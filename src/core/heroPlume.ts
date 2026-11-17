// Erase the knight's red helmet plume from its sprite sheets, for head accessories that replace it
// (the flame plume). Pure: works on RGBA pixel data, no Phaser.
//
// In each frame, the plume is the red pixels above the head anchor (the dome's top edge), plus the
// dark outline pixels touching them (grown twice, diagonals included). Lone pixels left above the
// dome afterwards go too. The sword (white / grey) and the cape (below the head) stay.

function hsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const h =
    max === rr
      ? (gg - bb) / d + (gg < bb ? 6 : 0)
      : max === gg
        ? (bb - rr) / d + 2
        : (rr - gg) / d + 4;
  return [h * 60, s, l];
}

/** The plume's reds: the same hue band the recolor treats as the cape */
function isRed(data: Uint8ClampedArray, i: number): boolean {
  if (data[i + 3] === 0) return false;
  const [h, s, l] = hsl(data[i]!, data[i + 1]!, data[i + 2]!);
  return l >= 0.17 && s > 0.35 && (h >= 300 || h < 15);
}

function isDark(data: Uint8ClampedArray, i: number): boolean {
  if (data[i + 3] === 0) return false;
  return (
    (Math.max(data[i]!, data[i + 1]!, data[i + 2]!) +
      Math.min(data[i]!, data[i + 1]!, data[i + 2]!)) /
      2 /
      255 <
    0.17
  );
}

/**
 * Make the plume transparent in a horizontal strip of frames (in place). headY: the head anchor's
 * y in each frame; only the rows above it are touched
 */
export function erasePlume(
  data: Uint8ClampedArray,
  sheetWidth: number,
  frameWidth: number,
  frameHeight: number,
  headY: readonly number[],
): void {
  headY.forEach((hy, f) => {
    const x0 = f * frameWidth;
    const at = (x: number, y: number) => (y * sheetWidth + x0 + x) * 4;
    const inside = (x: number, y: number) => x >= 0 && x < frameWidth && y >= 0 && y < hy;
    const gone = new Set<number>();
    for (let y = 0; y < hy; y++)
      for (let x = 0; x < frameWidth; x++) if (isRed(data, at(x, y))) gone.add(y * frameWidth + x);
    for (let pass = 0; pass < 2; pass++) {
      const rim: number[] = [];
      for (const p of gone) {
        const px = p % frameWidth;
        const py = Math.floor(p / frameWidth);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            const q = ny * frameWidth + nx;
            if (inside(nx, ny) && !gone.has(q) && isDark(data, at(nx, ny))) rim.push(q);
          }
      }
      for (const q of rim) gone.add(q);
    }
    for (const p of gone) data[at(p % frameWidth, Math.floor(p / frameWidth)) + 3] = 0;
    eraseFloatingBits(data, at, frameWidth, frameHeight, hy);
  });
}

/** Pieces up to this many pixels, left floating above the dome, are plume leftovers */
const LEFTOVER_MAX = 6;

/**
 * Small pieces left above the dome that no longer reach the head line: bits of the plume's
 * outline too light to count as dark. Pieces that reach down to the head (the sword) stay
 */
function eraseFloatingBits(
  data: Uint8ClampedArray,
  at: (x: number, y: number) => number,
  frameWidth: number,
  frameHeight: number,
  hy: number,
): void {
  const opaque = (x: number, y: number) =>
    x >= 0 && x < frameWidth && y >= 0 && y < frameHeight && data[at(x, y) + 3]! > 0;
  const seen = new Set<number>();
  for (let y = 0; y < hy; y++)
    for (let x = 0; x < frameWidth; x++) {
      if (!opaque(x, y) || seen.has(y * frameWidth + x)) continue;
      // Flood the whole piece (diagonals included), so no part of a big piece is seen alone later
      const piece: number[] = [];
      const stack = [y * frameWidth + x];
      seen.add(stack[0]!);
      let attached = false;
      while (stack.length > 0) {
        const p = stack.pop()!;
        const px = p % frameWidth;
        const py = Math.floor(p / frameWidth);
        if (py >= hy) attached = true;
        piece.push(p);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const q = (py + dy) * frameWidth + px + dx;
            if ((dx || dy) && opaque(px + dx, py + dy) && !seen.has(q)) {
              seen.add(q);
              stack.push(q);
            }
          }
      }
      if (attached || piece.length > LEFTOVER_MAX) continue;
      for (const p of piece) data[at(p % frameWidth, Math.floor(p / frameWidth)) + 3] = 0;
    }
}
