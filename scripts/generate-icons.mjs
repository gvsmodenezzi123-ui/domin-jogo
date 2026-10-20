/**
 * Gera os ícones PWA, a apple-touch-icon, o favicon e as splash screens
 * do iOS a partir de uma arte em pixel 32x32 desenhada aqui mesmo.
 * Sem dependências: o PNG é montado à mão com zlib.
 *
 *   npm run icons
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(image) {
  const { width, height, data } = image;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Imagem RGBA mínima
// ---------------------------------------------------------------------------

function hex(color) {
  const v = color.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), 255];
}

function createImage(width, height, background) {
  const data = Buffer.alloc(width * height * 4);
  const image = { width, height, data };
  fillRect(image, 0, 0, width, height, background);
  return image;
}

function fillRect(image, x, y, w, h, color) {
  const rgba = hex(color);
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(image.width, Math.floor(x + w));
  const y1 = Math.min(image.height, Math.floor(y + h));
  if (x1 <= x0 || y1 <= y0) return;
  const row = Buffer.alloc((x1 - x0) * 4);
  for (let i = 0; i < x1 - x0; i += 1) row.set(rgba, i * 4);
  for (let yy = y0; yy < y1; yy += 1) row.copy(image.data, (yy * image.width + x0) * 4);
}

// ---------------------------------------------------------------------------
// Arte 32x32: bucha 6|6 amaldiçoada sobre feltro, debaixo da lâmpada
// ---------------------------------------------------------------------------

const C = {
  bg: '#0d0a07',
  felt: '#2c3a20',
  feltLight: '#36472a',
  feltRim: '#1a2413',
  outline: '#1a1006',
  bone: '#e2d1a2',
  boneLight: '#f3e9c9',
  boneShadow: '#bba366',
  edge: '#6f5a33',
  shadow: '#070504',
  pip: '#120c08',
  blood: '#b3261e',
  divider: '#6e5a32',
};

function drawArt({ felt = true } = {}) {
  const px = new Map();
  const set = (x, y, color) => px.set(`${x},${y}`, color);

  if (felt) {
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
        if (d <= 14.6) {
          const lit = Math.hypot(x + 0.5 - 16, y + 0.5 - 11) < 8;
          set(x, y, d > 13.4 ? C.feltRim : lit && (x + y) % 2 === 0 ? C.feltLight : C.felt);
        }
      }
    }
  }

  // sombra da pedra
  for (let y = 5; y <= 29; y += 1) for (let x = 12; x <= 23; x += 1) set(x, y, C.shadow);

  // corpo: x 10..21, y 3..27 (+ espessura em 28)
  for (let y = 3; y <= 28; y += 1) {
    for (let x = 10; x <= 21; x += 1) {
      const border = x === 10 || x === 21 || y === 3 || y === 28;
      let color = C.bone;
      if (border) color = C.outline;
      else if (y === 27) color = C.edge;
      else if (x === 11 || y === 4) color = C.boneLight;
      else if (x === 20 || y === 26) color = C.boneShadow;
      set(x, y, color);
    }
  }
  // divisória
  for (let x = 12; x <= 19; x += 1) set(x, 15, C.divider);

  // pips 2x2: metade de cima preta, de baixo cor de sangue
  const pip = (x, y, color) => {
    set(x, y, color);
    set(x + 1, y, color);
    set(x, y + 1, color);
    set(x + 1, y + 1, color);
  };
  for (const y of [5, 8, 11]) {
    pip(12, y, C.pip);
    pip(18, y, C.pip);
  }
  for (const y of [18, 21, 24]) {
    pip(12, y, C.blood);
    pip(18, y, C.blood);
  }
  return px;
}

function paintArt(image, art, scale, ox, oy) {
  for (const [k, color] of art) {
    const [x, y] = k.split(',').map(Number);
    fillRect(image, ox + x * scale, oy + y * scale, scale, scale, color);
  }
}

// ---------------------------------------------------------------------------
// Texto 5x7 para a splash
// ---------------------------------------------------------------------------

const GLYPHS = {
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
};

function textWidth(text, scale) {
  return (text.length * 6 - 1) * scale;
}

function paintText(image, text, scale, ox, oy, color, shadow) {
  const drop = Math.max(1, Math.round(scale * 0.35));
  [...text].forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    glyph.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell !== '#') return;
        const gx = ox + (i * 6 + x) * scale;
        const gy = oy + y * scale;
        if (shadow) fillRect(image, gx + drop, gy + drop, scale, scale, shadow);
      });
    });
  });
  [...text].forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '#') fillRect(image, ox + (i * 6 + x) * scale, oy + y * scale, scale, scale, color);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Saídas
// ---------------------------------------------------------------------------

function write(path, buffer) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
  console.log(`  ${path.replace(`${ROOT}/`, '')} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

function icon(size, { padding = 0 } = {}) {
  const art = drawArt();
  const scale = Math.floor((size - padding * 2) / 32);
  const offset = Math.floor((size - scale * 32) / 2);
  const image = createImage(size, size, C.bg);
  paintArt(image, art, scale, offset, offset);
  return encodePng(image);
}

function splash(width, height) {
  const image = createImage(width, height, C.bg);
  const art = drawArt();
  const scale = Math.max(4, Math.floor((width * 0.42) / 32));
  const artSize = scale * 32;
  const textScale = Math.max(4, Math.floor((width * 0.62) / (7 * 6 - 1)));
  const gap = scale * 4;
  const total = artSize + gap + textScale * 7;
  const top = Math.floor((height - total) / 2);
  paintArt(image, art, scale, Math.floor((width - artSize) / 2), top);
  paintText(image, 'BUXARIA', textScale, Math.floor((width - textWidth('BUXARIA', textScale)) / 2), top + artSize + gap, '#f4ecd2', C.blood);
  return encodePng(image);
}

/** Splash screens do iOS: [largura CSS, altura CSS, pixel ratio]. */
export const IOS_SPLASHES = [
  [440, 956, 3],
  [402, 874, 3],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [414, 896, 3],
  [375, 812, 3],
  [414, 896, 2],
  [375, 667, 2],
];

console.log('Gerando ícones Buxaria:');
write(join(PUBLIC, 'icons/icon-192.png'), icon(192));
write(join(PUBLIC, 'icons/icon-512.png'), icon(512));
write(join(PUBLIC, 'icons/icon-maskable-512.png'), icon(512, { padding: 64 }));
write(join(PUBLIC, 'icons/apple-touch-icon.png'), icon(180));
write(join(PUBLIC, 'icons/favicon-32.png'), icon(32));

for (const [w, h, ratio] of IOS_SPLASHES) {
  write(join(PUBLIC, `splash/splash-${w * ratio}x${h * ratio}.png`), splash(w * ratio, h * ratio));
}

console.log('\nTags <link> das splash screens:');
for (const [w, h, ratio] of IOS_SPLASHES) {
  console.log(
    `    <link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)" href="/splash/splash-${w * ratio}x${h * ratio}.png" />`,
  );
}
