// node daycomp.mjs <landpraia> <front.png> <out.png> — junta a camada de trás do jogo (céu, sol,
// mar, nuvens e cristas, pintadas em meia resolução) com a frente em volume, para conferir.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { encodePNG } from '../png.mjs';
import * as OLD from '../../../src/components/art/landRooms.js';

const [room, frontPath, out] = process.argv.slice(2);

function readPNG(path) {
  const buf = readFileSync(path);
  let pos = 8;
  let w = 0;
  let h = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const px = new Uint8ClampedArray(w * h * 4);
  const stride = w * 4;
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= 4 ? cur[i - 4] : 0;
      const b = prev[i];
      const c = i >= 4 ? prev[i - 4] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    px.set(cur, y * stride);
    prev = cur;
  }
  return { w, h, data: px };
}

const front = readPNG(frontPath);
const L = OLD.paintDayLayers(room, front.w / 2, front.h / 2, 1955);
const W = front.w;
const H = front.h;
const img = new Uint8ClampedArray(W * H * 4);
const over = (x, y, r, g, b, a) => {
  const i = (y * W + x) * 4;
  const t = a / 255;
  img[i] = img[i] * (1 - t) + r * t;
  img[i + 1] = img[i + 1] * (1 - t) + g * t;
  img[i + 2] = img[i + 2] * (1 - t) + b * t;
  img[i + 3] = 255;
};
const layer = (Ly, ox = 0, oy = 0) => {
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const sx = Math.floor(x / 2) - ox;
      const sy = Math.floor(y / 2) - oy;
      if (sx < 0 || sy < 0 || sx >= Ly.w || sy >= Ly.h) continue;
      const i = (sy * Ly.w + sx) * 4;
      if (Ly.data[i + 3]) over(x, y, Ly.data[i], Ly.data[i + 1], Ly.data[i + 2], Ly.data[i + 3]);
    }
};
layer(L.back);
layer(L.clouds);
for (const wv of L.waves) layer(wv, 0, -wv.y);
for (let y = 0; y < H; y += 1)
  for (let x = 0; x < W; x += 1) {
    const i = (y * W + x) * 4;
    if (front.data[i + 3]) over(x, y, front.data[i], front.data[i + 1], front.data[i + 2], front.data[i + 3]);
  }
writeFileSync(out, encodePNG(W, H, img));
console.log('ok', W, H);
