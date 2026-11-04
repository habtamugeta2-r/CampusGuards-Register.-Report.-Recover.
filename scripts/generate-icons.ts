/**
 * Generates the PWA icons without adding an image-library dependency.
 * Pure Node: rasterise a shield glyph and write PNGs with zlib.
 *
 *   npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'icons');

const BRAND = [0x4f, 0x46, 0xe5]; // #4f46e5
const WHITE = [0xff, 0xff, 0xff];

function crc32(buffer: Buffer): number {
  let table = (crc32 as unknown as { table?: number[] }).table;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as unknown as { table: number[] }).table = table;
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < width * 4; x++) {
      raw[offset++] = rgba[y * width * 4 + x]!;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Shield: flat top, straight sides, tapering point. */
function insideShield(nx: number, ny: number, padding: number): boolean {
  const top = padding;
  const bottom = 1 - padding;
  if (ny < top || ny > bottom) return false;
  const shoulder = 0.5;
  let halfWidth: number;
  if (ny <= shoulder) {
    halfWidth = 0.5 - padding;
  } else {
    const t = (ny - shoulder) / (bottom - shoulder);
    halfWidth = (0.5 - padding) * (1 - t * t);
  }
  return Math.abs(nx - 0.5) <= halfWidth;
}

/** Tick mark drawn inside the shield. */
function insideCheck(nx: number, ny: number): boolean {
  const x0 = 0.36;
  const y0 = 0.5;
  const x1 = 0.46;
  const y1 = 0.6;
  const x2 = 0.64;
  const y2 = 0.4;

  const onSegment = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((nx - ax) * dx + (ny - ay) * dy) / length2));
    const px = ax + t * dx;
    const py = ay + t * dy;
    return Math.hypot(nx - px, ny - py) <= 0.028;
  };

  return onSegment(x0, y0, x1, y1) || onSegment(x1, y1, x2, y2);
}

function render(size: number, maskable = false): Buffer {
  const data = new Uint8Array(size * size * 4);
  const padding = maskable ? 0.24 : 0.14;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      const shield = insideShield(nx, ny, padding);
      const check = shield && insideCheck(nx, ny);
      const [r, g, b] = check ? BRAND : shield ? WHITE : BRAND;
      const index = (y * size + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 0xff;
    }
  }
  return png(size, size, data);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'icon-192.png'), render(192));
writeFileSync(path.join(OUT, 'icon-512.png'), render(512));
writeFileSync(path.join(OUT, 'icon-maskable-512.png'), render(512, true));

// Favicon for browsers that still ask for one.
writeFileSync(path.join(OUT, 'favicon-32.png'), render(32));

console.log('Icons written to public/icons/');
