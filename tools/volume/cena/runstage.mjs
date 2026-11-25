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
console.log('ok', ((performance.now() - t0) / 1000).toFixed(1) + 's');
