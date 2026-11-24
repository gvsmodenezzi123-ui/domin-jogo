// node bakechairs.mjs <outDir> — as duas cadeiras (de madeira e de plástico), iguais para todos
import { writeFileSync } from 'node:fs';
import { cleanup, compose, pixelize, render } from './r3d.mjs';
import { SH, SW, seatCfg } from './seat.mjs';
import { paramsOf } from './cast.mjs';
import { sideDecals } from './sdecals2.mjs';
const A = new URL('../../src/components/art/', import.meta.url).href;
const { PORTRAITS } = await import(A + 'portraitSpecs.js');
const outDir = process.argv[2];
const P = paramsOf('tioZe', PORTRAITS.tioZe);
const data = {};
for (const kind of ['madeira', 'plastico']) {
  const cfg = seatCfg(P, 'chair', 'idle', kind);
  cfg.shade = cfg.scene; // sem a sombra de ninguém
  const R = render(cfg, 3);
  const Px = pixelize(cfg, R);
  cleanup(cfg, Px);
  const img = compose(cfg, Px);
  sideDecals(img, Px, P, cfg.ramps, 'idle', 'chair', 5);
  const pal = new Map([['t', 0], ['k', 1]]);
  const idx = new Uint16Array(SW * SH);
  for (let p = 0; p < SW * SH; p += 1) {
    const key = img[p * 4 + 3] ? `${img[p * 4]},${img[p * 4 + 1]},${img[p * 4 + 2]},${img[p * 4 + 3]}` : 't';
    if (!pal.has(key)) pal.set(key, pal.size);
    idx[p] = pal.get(key);
  }
  const wide = pal.size > 255;
  const bytes = [];
  for (let p = 0; p < idx.length; ) {
    let n = 1;
    while (p + n < idx.length && idx[p + n] === idx[p] && n < 255) n += 1;
    bytes.push(n);
    if (wide) bytes.push(idx[p] >> 8, idx[p] & 255);
    else bytes.push(idx[p]);
    p += n;
  }
  const palBytes = [];
  for (const k of pal.keys()) palBytes.push(...(k === 't' || k === 'k' ? [0, 0, 0, 0] : k.split(',').map(Number)));
  data[kind] = { x: 0, y: 0, w: SW, h: SH, i: wide ? 2 : 1, p: Buffer.from(palBytes).toString('base64'), d: Buffer.from(bytes).toString('base64') };
}
writeFileSync(`${outDir}/chairs.js`, `// gerado por tools/volume (não editar à mão): as cadeiras da roda, de madeira e de plástico.\nexport default ${JSON.stringify(data)};\n`);
console.log('ok');
