// node runstage.mjs <cena.mjs> <out.png> [ss] [x0,y0,x1,y1] — renderiza uma tela do visual novo
// (novo/*.mjs: o palco fixo de 896 × 414, visto de cima) e passa para pixel art.
import { writeFileSync } from 'node:fs';
import { encodePNG } from '../png.mjs';
import { renderScene } from './render.mjs';
import { pixelPass } from './pixelpass.mjs';

const [file, out, ssArg, regionArg] = process.argv.slice(2);
const ss = Number(ssArg ?? 1);
const R = await import(new URL(file, import.meta.url));
const t0 = performance.now();
const region = regionArg ? regionArg.split(',').map(Number) : undefined;
const res = renderScene({ W: R.W, H: R.H, scene: R.scene, shade: R.shade, cam: R.CAM, lights: R.LIGHTS, amb: R.AMB, emissive: R.EMISSIVE, region, shadowStart: R.SHADOW_START ?? 0.6, normalOffset: R.NORMAL_OFFSET ?? 0.4 }, ss);
console.log('render', ((performance.now() - t0) / 1000).toFixed(1) + 's');
const ctx = pixelPass(res, { W: R.W, H: R.H, emissive: R.EMISSIVE, ...R.PIXEL });
writeFileSync(out, encodePNG(R.W, R.H, ctx.img));
// a faixa da frente (FRONT: os materiais que o jogo põe por cima de quem fica atrás do balcão)
if (R.FRONT) {
  const { mats, y0, y1 } = R.FRONT;
  const keep = new Set(mats);
  const fh = y1 - y0;
  const img = new Uint8ClampedArray(R.W * fh * 4);
  for (let y = y0; y < y1; y += 1)
    for (let x = 0; x < R.W; x += 1) {
      const p = y * R.W + x;
      if (!keep.has(ctx.mat[p])) continue;
      const q = ((y - y0) * R.W + x) * 4;
      for (let c = 0; c < 4; c += 1) img[q + c] = ctx.img[p * 4 + c];
    }
  writeFileSync(out.replace(/\.png$/, '-front.png'), encodePNG(R.W, fh, img));
}
console.log('ok', ((performance.now() - t0) / 1000).toFixed(1) + 's');
