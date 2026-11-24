// node bakelegs.mjs <dir> <keys...> — refaz só as pernas (sentado de lado) de cada um, nos dois pedaços
import { cleanup, compose, pixelize, render } from './r3d.mjs';
import { SH, SW, seatCfg } from './seat.mjs';
import { paramsOf } from './cast.mjs';
import { sideDecals } from './sdecals2.mjs';
import { readCast, writeCast } from './castio.mjs';
const A = new URL('../../src/components/art/', import.meta.url).href;
const { PORTRAITS, NPC_PORTRAITS } = await import(A + 'portraitSpecs.js');
const all = { ...PORTRAITS, ...NPC_PORTRAITS };
const [dir, ...keys] = process.argv.slice(2);
function rle(idx, wide) {
  const bytes = [];
  for (let p = 0; p < idx.length; ) {
    let n = 1;
    while (p + n < idx.length && idx[p + n] === idx[p] && n < 255) n += 1;
    bytes.push(n);
    if (wide) bytes.push(idx[p] >> 8, idx[p] & 255);
    else bytes.push(idx[p]);
    p += n;
  }
  return Buffer.from(bytes).toString('base64');
}
function full(img, W, H) {
  const pal = new Map([['t', 0], ['k', 1]]);
  const idx = new Uint16Array(W * H);
  for (let p = 0; p < W * H; p += 1) {
    const key = img[p * 4 + 3] ? `${img[p * 4]},${img[p * 4 + 1]},${img[p * 4 + 2]},${img[p * 4 + 3]}` : 't';
    if (!pal.has(key)) pal.set(key, pal.size);
    idx[p] = pal.get(key);
  }
  const wide = pal.size > 255;
  const palBytes = [];
  for (const k of pal.keys()) palBytes.push(...(k === 't' || k === 'k' ? [0, 0, 0, 0] : k.split(',').map(Number)));
  return { x: 0, y: 0, w: W, h: H, i: wide ? 2 : 1, p: Buffer.from(palBytes).toString('base64'), d: rle(idx, wide) };
}
for (const key of keys) {
  const t0 = performance.now();
  const P = paramsOf(key, all[key]);
  const data = await readCast(dir, key);
  const cfg = seatCfg(P, 'legs', 'idle');
  const R = render(cfg, 2);
  const Px = pixelize(cfg, R);
  cleanup(cfg, Px);
  const img = compose(cfg, Px);
  sideDecals(img, Px, P, cfg.ramps, 'idle', 'legs', 11);
  data.side.legs = full(img, SW, SH);
  const size = writeCast(dir, key, data);
  console.log(key, ((performance.now() - t0) / 1000).toFixed(0) + 's', (size / 1024).toFixed(0) + 'KB');
}
