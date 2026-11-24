// node runroom.mjs <sala> <out.png> [ss] [x0,y0,x1,y1] — renderiza a sala rooms/<sala>.mjs em
// volume e passa para pixel art (pixelpass.mjs). Com a região, só aquele pedaço (para conferir).
import { writeFileSync } from 'node:fs';
import { encodePNG } from '../png.mjs';
import { renderScene } from './render.mjs';
import { pixelPass } from './pixelpass.mjs';

const [room, out, ssArg, regionArg] = process.argv.slice(2);
const ss = Number(ssArg ?? 1);
const R = await import(`./rooms/${room}.mjs`);
const t0 = performance.now();
const region = regionArg ? regionArg.split(',').map(Number) : undefined;
const WR = R.WR ?? R.W;
const res = renderScene({ W: WR, H: R.H, ox: R.OX ?? 0, scene: R.scene, shade: R.shade, cam: R.CAM, lights: R.LIGHTS, amb: R.AMB, emissive: R.EMISSIVE, region }, ss);
console.log('render', ((performance.now() - t0) / 1000).toFixed(1) + 's');
const ctx = pixelPass(res, { W: WR, H: R.H, emissive: R.EMISSIVE, ...R.PIXEL });
writeFileSync(out, encodePNG(WR, R.H, ctx.img));
console.log('ok', ((performance.now() - t0) / 1000).toFixed(1) + 's');
