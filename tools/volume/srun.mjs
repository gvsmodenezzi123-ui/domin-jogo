// node srun.mjs <prefix> <part> [ss] [mood] [nodec] — o perfil: render de uma camada
import { writeFileSync } from 'node:fs';
import { encodePNG } from './png.mjs';
import { cleanup, compose, pixelize, render } from './r3d.mjs';
import { H, W, cfgFor } from './side.mjs';
import { setMood } from './model.mjs';
const prefix = process.argv[2] ?? 'out';
const part = process.argv[3] ?? 'all';
const ss = Number(process.argv[4] ?? 1);
const mood = process.argv[5] ?? 'idle';
setMood(mood);
const cfg = cfgFor(part);
const t0 = performance.now();
const R = render(cfg, ss);
const P = pixelize(cfg, R);
cleanup(cfg, P);
const img = compose(cfg, P);
let dec = null;
if (process.argv[6] !== 'nodec') {
  try {
    dec = await import('./sdecals.mjs');
  } catch {}
  if (dec) dec.decals(img, P, { mood, part });
}
writeFileSync(`${prefix}.png`, encodePNG(W, H, img));
writeFileSync(`${prefix}.rgba`, Buffer.from(img.buffer));
writeFileSync(`${prefix}.mat`, Buffer.from(P.mat.buffer));
console.log('ok', part, ((performance.now() - t0) / 1000).toFixed(1), 's');
