// node ssheet.mjs <out.png> [ss] keys... — folha de contato do perfil sentado (tudo junto)
import { writeFileSync } from 'node:fs';
import { encodePNG } from './png.mjs';
import { cleanup, compose, pixelize, render } from './r3d.mjs';
import { SH, SW, seatCfg } from './seat.mjs';
import { paramsOf } from './cast.mjs';
const A = new URL('../../src/components/art/', import.meta.url).href;
const { PORTRAITS, NPC_PORTRAITS } = await import(A + 'portraitSpecs.js');
const all = { ...PORTRAITS, ...NPC_PORTRAITS };
const out = process.argv[2] ?? 'ssheet.png';
const ss = Number(process.argv[3] ?? 1);
const keys = process.argv.slice(4).length ? process.argv.slice(4) : Object.keys(all);
const mood = process.env.MOOD ?? 'idle';
const chair = process.env.CHAIR ?? 'madeira';
let dec = null;
try {
  dec = await import('./sdecals2.mjs');
} catch {}
const cols = Math.min(4, keys.length);
const rows = Math.ceil(keys.length / cols);
const W = cols * SW;
const H = rows * SH;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i += 1) img.set([46, 35, 28, 255], i * 4);
let n = 0;
for (const k of keys) {
  const P = paramsOf(k, all[k]);
  const cfg = seatCfg(P, 'all', mood, chair);
  const R = render(cfg, ss);
  const Px = pixelize(cfg, R);
  cleanup(cfg, Px);
  const im = compose(cfg, Px);
  if (dec && !process.env.NODEC) dec.sideDecals(im, Px, P, cfg.ramps, mood, 'all', n * 5 + 1);
  const ox = (n % cols) * SW;
  const oy = Math.floor(n / cols) * SH;
  for (let y = 0; y < SH; y += 1)
    for (let x = 0; x < SW; x += 1) {
      const i = (y * SW + x) * 4;
      if (!im[i + 3]) continue;
      img.set(im.subarray(i, i + 4), ((oy + y) * W + ox + x) * 4);
    }
  n += 1;
  process.stdout.write(k + ' ');
}
writeFileSync(out, encodePNG(W, H, img));
console.log('\nok');
