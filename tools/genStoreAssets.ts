// アイコン（1024×1024）とスプラッシュ（2732×2732）の元画像を仮素材の勇者から作る（依存なしの PNG 書き出し）
// 使い方: npm run store-assets && npx @capacitor/assets generate
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { PALETTE, UNIT_SPRITES } from '../src/data/sprites';

const BG = 0x14121c;
const RING = 0x2e2840;

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size: number, pixel: (x: number, y: number) => number): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // フィルタなし
    for (let x = 0; x < size; x++) {
      const c = pixel(x, y);
      const o = row + 1 + x * 3;
      raw[o] = (c >> 16) & 0xff;
      raw[o + 1] = (c >> 8) & 0xff;
      raw[o + 2] = c & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function heroImage(size: number, dot: number): Buffer {
  const hero = UNIT_SPRITES.hero!.pixels;
  const w = hero[0]!.length * dot;
  const ox = Math.floor((size - w) / 2);
  const oy = Math.floor((size - hero.length * dot) / 2);
  const r2 = (dot * 11) ** 2;
  return png(size, (x, y) => {
    const hx = Math.floor((x - ox) / dot);
    const hy = Math.floor((y - oy) / dot);
    const ch = hero[hy]?.[hx];
    const col = ch !== undefined ? PALETTE[ch] : undefined;
    if (col !== undefined) return col;
    const dx = x - size / 2;
    const dy = y - size / 2;
    return dx * dx + dy * dy < r2 ? RING : BG;
  });
}

mkdirSync('assets', { recursive: true });
const icon = heroImage(1024, 48);
writeFileSync('assets/icon-only.png', icon);
writeFileSync('assets/icon-foreground.png', icon);
writeFileSync(
  'assets/icon-background.png',
  png(1024, () => BG),
);
const splash = heroImage(2732, 48);
writeFileSync('assets/splash.png', splash);
writeFileSync('assets/splash-dark.png', splash);
console.log('assets/icon-*.png と assets/splash*.png を作成しました');
