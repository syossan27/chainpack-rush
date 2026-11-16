// Build the app icon and splash source images from the 64px PixelLab hero bust (assets/app-icon/hero_bust.png).
// Writes assets/icon-*.png (1024), assets/splash*.png (2732) and the web icons public/icon-{512,192,180}.png.
// Usage: npm run store-assets && npm run assets
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const BG = 0x14121c;
const RING = 0x2e2840;
const ART = 'assets/app-icon/hero_bust.png';

interface Canvas {
  size: number;
  /** RGBA, row-major */
  data: Uint8Array;
}

interface Art {
  width: number;
  height: number;
  data: Uint8Array;
}

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

/** Encode as RGB (opaque, for iOS icons) or RGBA (for the adaptive icon foreground). */
function encodePng(c: Canvas, alpha: boolean): Buffer {
  const ch = alpha ? 4 : 3;
  const stride = c.size * ch + 1;
  const raw = Buffer.alloc(stride * c.size);
  for (let y = 0; y < c.size; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < c.size; x++) {
      const i = (y * c.size + x) * 4;
      const o = y * stride + 1 + x * ch;
      for (let k = 0; k < ch; k++) raw[o + k] = c.data[i + k]!;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.size, 0);
  ihdr.writeUInt32BE(c.size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = alpha ? 6 : 2; // RGBA / RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Minimal decoder: 8-bit RGBA, non-interlaced (the format the source art is saved in). */
function decodePng(file: string): Art {
  const buf = readFileSync(file);
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[9] !== 6 || body[12] !== 0) {
        throw new Error(`${file}: expected 8-bit RGBA non-interlaced PNG`);
      }
    } else if (type === 'IDAT') {
      idat.push(body);
    }
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const data = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= 4 ? data[y * stride + x - 4]! : 0;
      const b = y > 0 ? data[(y - 1) * stride + x]! : 0;
      const c = x >= 4 && y > 0 ? data[(y - 1) * stride + x - 4]! : 0;
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      data[y * stride + x] = (v + pred) & 0xff;
    }
  }
  return { width, height, data };
}

function canvas(size: number, color?: number): Canvas {
  const data = new Uint8Array(size * size * 4);
  if (color !== undefined) {
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = (color >> 16) & 0xff;
      data[i * 4 + 1] = (color >> 8) & 0xff;
      data[i * 4 + 2] = color & 0xff;
      data[i * 4 + 3] = 255;
    }
  }
  return { size, data };
}

function setPixel(c: Canvas, x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || y < 0 || x >= c.size || y >= c.size) return;
  const i = (y * c.size + x) * 4;
  c.data[i] = r;
  c.data[i + 1] = g;
  c.data[i + 2] = b;
  c.data[i + 3] = 255;
}

function disc(c: Canvas, cx: number, cy: number, r: number, color: number): void {
  for (let y = 0; y < c.size; y++) {
    for (let x = 0; x < c.size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy < r * r)
        setPixel(c, x, y, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
    }
  }
}

/** Opaque bounds of the art: [x0, y0, x1, y1) */
function bounds(art: Art): [number, number, number, number] {
  let x0 = art.width;
  let y0 = art.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < art.height; y++) {
    for (let x = 0; x < art.width; x++) {
      if (art.data[(y * art.width + x) * 4 + 3]! < 128) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + 1);
      y1 = Math.max(y1, y + 1);
    }
  }
  return [x0, y0, x1, y1];
}

/**
 * Nearest-neighbour blit at an integer scale: the art is centered horizontally on its bounds,
 * and the bottom of its bounds sits at `bottom`. `clip` keeps only pixels inside that circle.
 */
function blit(
  c: Canvas,
  art: Art,
  scale: number,
  bottom: number,
  clip?: { cx: number; cy: number; r: number },
): void {
  const [x0, , x1, y1] = bounds(art);
  const ox = Math.round(c.size / 2 - ((x0 + x1) / 2) * scale);
  const oy = Math.round(bottom - y1 * scale);
  for (let ay = 0; ay < art.height; ay++) {
    for (let ax = 0; ax < art.width; ax++) {
      const i = (ay * art.width + ax) * 4;
      if (art.data[i + 3]! < 128) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const x = ox + ax * scale + sx;
          const y = oy + ay * scale + sy;
          if (clip) {
            const dx = x + 0.5 - clip.cx;
            const dy = y + 0.5 - clip.cy;
            if (dx * dx + dy * dy >= clip.r * clip.r) continue;
          }
          setPixel(c, x, y, art.data[i]!, art.data[i + 1]!, art.data[i + 2]!);
        }
      }
    }
  }
}

/** Full-bleed square icon (iOS, web): dark background, lighter ring, bust standing on the bottom edge. */
function fullBleed(art: Art, size: number, scale: number): Canvas {
  const c = canvas(size, BG);
  disc(c, size / 2, size / 2, size * 0.4, RING);
  blit(c, art, scale, size);
  return c;
}

// Android adaptive icon. @capacitor/assets wraps both layers in a 16.7% inset
// (mipmap-anydpi-v26/ic_launcher.xml), so each PNG covers the 72dp visible area,
// and the 66dp safe circle is a radius of 1024 * 66/72 / 2 = 469px.
const ADAPTIVE = 1024;

function adaptiveForeground(art: Art): Canvas {
  const c = canvas(ADAPTIVE);
  // Like the full-bleed icon: the chest sits on the bottom edge and the mask cuts it.
  // x16 keeps the helmet and the sword tip inside the safe circle (max 432px from the center)
  blit(c, art, 16, ADAPTIVE);
  return c;
}

function adaptiveBackground(): Canvas {
  const c = canvas(ADAPTIVE, BG);
  disc(c, ADAPTIVE / 2, ADAPTIVE / 2, ADAPTIVE * 0.4, RING);
  return c;
}

/** Splash: the bust inside a round medallion, centered so it survives the portrait crop. */
function splash(art: Art): Canvas {
  const size = 2732;
  const r = 500;
  const c = canvas(size, BG);
  disc(c, size / 2, size / 2, r, RING);
  blit(c, art, 16, size / 2 + r, { cx: size / 2, cy: size / 2, r });
  return c;
}

const art = decodePng(ART);
mkdirSync('assets', { recursive: true });
const icon = encodePng(fullBleed(art, 1024, 17), false);
writeFileSync('assets/icon-only.png', icon);
writeFileSync('assets/icon-foreground.png', encodePng(adaptiveForeground(art), true));
writeFileSync('assets/icon-background.png', encodePng(adaptiveBackground(), false));
const sp = encodePng(splash(art), false);
writeFileSync('assets/splash.png', sp);
writeFileSync('assets/splash-dark.png', sp);
writeFileSync('public/icon-512.png', encodePng(fullBleed(art, 512, 8), false));
writeFileSync('public/icon-192.png', encodePng(fullBleed(art, 192, 3), false));
writeFileSync('public/icon-180.png', encodePng(fullBleed(art, 180, 3), false));
console.log('Wrote assets/icon-*.png, assets/splash*.png and public/icon-*.png');
