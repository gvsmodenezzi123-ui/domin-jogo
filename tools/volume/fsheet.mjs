// node fsheet.mjs <out.png> [ss] [keys...] — a folha de contato dos bustos de frente
import { writeFileSync } from 'node:fs';
import { encodePNG } from './png.mjs';
import { cleanup, compose, pixelize, render } from './r3d.mjs';
import { frontCfg, FW } from './front.mjs';
import { paramsOf } from './cast.mjs';
import { frontDecals } from './fdecals.mjs';
const A = new URL('../../src/components/art/', import.meta.url).href;
const { PORTRAITS, NPC_PORTRAITS } = await import(A + 'portraitSpecs.js');
const all = { ...PORTRAITS, ...NPC_PORTRAITS };
const out = process.argv[2] ?? 'sheet.png';
const ss = Number(process.argv[3] ?? 1);
const keys = process.argv.slice(4).length ? process.argv.slice(4) : Object.keys(all);
const mood = process.env.MOOD ?? 'idle';
const cols = Math.min(6, keys.length);
const ch = 140;
const rows = Math.ceil(keys.length / cols);
const W = cols * FW;
const H = rows * ch;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i += 1) img.set([46, 35, 28, 255], i * 4);
let n = 0;
for (const k of keys) {
  const P = paramsOf(k, all[k]);
  const cfg = frontCfg(P, mood);
  const R = render(cfg, ss);
  const Px = pixelize(cfg, R);
  cleanup(cfg, Px);
  const im = compose(cfg, Px);
  if (!process.env.NODEC) frontDecals(im, Px, P, cfg.ramps, mood, n * 7 + 3);
  const ox = (n % cols) * FW;
  const oy = Math.floor(n / cols) * ch;
  for (let y = 0; y < ch; y += 1)
    for (let x = 0; x < FW; x += 1) {
      const i = (y * FW + x) * 4;
      if (!im[i + 3]) continue;
      img.set(im.subarray(i, i + 4), ((oy + y) * W + ox + x) * 4);
    }
  n += 1;
  process.stdout.write(k + ' ');
}
writeFileSync(out, encodePNG(W, H, img));
console.log('\nok');
