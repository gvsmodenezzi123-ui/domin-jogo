// Região 1, o Boteco da Esquina, no mesmo encanamento das outras salas (a cena é a de boteco3d.mjs;
// aqui ficam a pixel art e os desenhos por cima: o azulejo, o letreiro, o relógio, a flâmula, o
// taco, as manchas, os halos), já na imagem larga.
import { CAM, H, OX, W, WR, planeAt, proj } from '../common.mjs';
import { bayer, halo } from '../pixelpass.mjs';
import { textAt } from '../decals.mjs';
import { AMB, EMISSIVE, FLOOR, LIGHTS, S, scene, shade } from '../boteco3d.mjs';

export { AMB, CAM, EMISSIVE, H, LIGHTS, OX, W, WR, scene, shade };

const C = {
  [S.PLASTER]: ['#4a6a52'], [S.PLASTER_EDGE]: ['#9ab09a'], [S.BRICK]: ['#8a4a32'], [S.BEAM]: ['#3a2414'],
  [S.PIPE]: ['#7a8478', 'metal'], [S.TILE]: ['#e6e2d6'], [S.TRIM]: ['#2a4a8a'], [S.FLOOR]: ['#5a3418'],
  [S.SHELF]: ['#7a4a26'], [S.BRACKET]: ['#4a4a50', 'metal'], [S.GLASS_G]: ['#2a7a3a', 'metal'], [S.GLASS_A]: ['#b8701c', 'metal'],
  [S.GLASS_C]: ['#a8c8bc', 'metal'], [S.GLASS_B]: ['#5a2e14', 'metal'], [S.LABEL_R]: ['#c8302a'], [S.LABEL_Y]: ['#e8c040'],
  [S.LABEL_W]: ['#efe8d8'], [S.LABEL_B]: ['#3a5ab0'], [S.CAP]: ['#d0a040', 'metal'], [S.BEER]: ['#e0a020'],
  [S.FOAM]: ['#f4ecd8'], [S.MUG]: ['#c8d4cc', 'metal'], [S.SIGN_FRAME]: ['#2a2a2e', 'metal'], [S.SIGN_FACE]: ['#fff2d0', 'glow'],
  [S.SIGN_RED]: ['#e0301e', 'glow'], [S.CLOCK_RIM]: ['#b8261c'], [S.CLOCK_FACE]: ['#efe6cc'], [S.PENNANT]: ['#f0ece0'],
  [S.STICK]: ['#c8a46a'], [S.BOARD]: ['#2e5a3a'], [S.STRING]: ['#c8b890'], [S.NAIL]: ['#8a8a8a', 'metal'],
  [S.BULB]: ['#fff0c0', 'glow'], [S.SOCKET]: ['#2a2a2a', 'metal'], [S.CORD]: ['#1e1a16'], [S.CRATE]: ['#e8b820'],
  [S.CRATE_BOTTLE]: ['#5a2e14', 'metal'], [S.CHAIR]: ['#c82a22'], [S.FREEZER]: ['#e8ecec'], [S.FREEZER_RED]: ['#c8281e'],
  [S.FREEZER_LID]: ['#9aa4a8', 'metal'], [S.BASE]: ['#3a2010'], [S.METER]: ['#6a6e68', 'metal'], [S.WIRE]: ['#141210'],
};
const BLUE_HEX = '#2a58b0';

function decals(ctx) {
  const { W: w, H: h, mat, tone, RAMP } = ctx;
  // o azulejo: a flor azul de quatro pétalas e os quartos de círculo nos cantos (no plano da parede)
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.TILE) continue;
      const wx = x - OX;
      const gx = (((wx % 20) + 20) % 20) - 10;
      const gy = ((((y - 108) % 20) + 20) % 20) - 10;
      const ax = Math.abs(gx);
      const ay = Math.abs(gy);
      const petal = (ax + ay < 6.2 && ax + ay > 3.6) || (ax < 1.1 && ay < 7.4) || (ay < 1.1 && ax < 7.4);
      const corner = Math.hypot(10 - ax, 10 - ay) < 4.6 && Math.hypot(10 - ax, 10 - ay) > 2.8;
      const dot = ax < 1.4 && ay < 1.4;
      if (petal || corner || dot) ctx.set(p, ctx.colorOf(p, RAMP.blue, tone[p] - (dot ? 1 : 0)));
    }
  // o letreiro, o fiado, o relógio
  textAt(ctx, 'CERVEJA GELADA', 600, 20, 8.4, [168, 22, 16], new Set([S.SIGN_FACE]), 2);
  textAt(ctx, 'FIADO', 162, 80, 6.8, [244, 230, 176], new Set([S.BOARD]), 2);
  textAt(ctx, 'SO AMANHA', 162, 95, 6.8, [232, 192, 80], new Set([S.BOARD]), 2);
  {
    const [cx, cy] = proj(348, 34, 5.4);
    const face = new Set([S.CLOCK_FACE]);
    for (let hh = 0; hh < 12; hh += 1) {
      const a = (hh / 12) * Math.PI * 2;
      const q = Math.round(cy - Math.cos(a) * 11.5) * w + Math.round(cx + Math.sin(a) * 11.5);
      if (face.has(mat[q])) ctx.set(q, [42, 36, 32]);
    }
    for (const [len, ang] of [
      [8, 0.75],
      [10.5, 3.4],
    ])
      for (let s2 = 0; s2 <= len; s2 += 0.5) {
        const q = Math.round(cy - Math.cos(ang) * s2) * w + Math.round(cx + Math.sin(ang) * s2);
        if (face.has(mat[q])) ctx.set(q, [26, 20, 16]);
      }
  }
  // a flâmula: as listras pretas e o escudo vermelho
  const [shieldX, shieldY] = proj(316, 74, 3);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.PENNANT) continue;
      if ((((x - OX - 280) % 8) + 8) % 8 < 4) ctx.set(p, ctx.colorOf(p, RAMP[S.SIGN_FRAME]));
      if (Math.abs(x - shieldX) < 5 && Math.abs(y + 0.5 - shieldY) < 4) ctx.set(p, ctx.colorOf(p, RAMP[S.CLOCK_RIM]));
    }
  // as tábuas do taco: a emenda é o pixel por onde passa a divisa
  const PW = 30;
  const PL = 90;
  const runOff = (col) => (((col * 53) % PL) + PL) % PL;
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.FLOOR || y <= CAM[1]) continue;
      const [wx, wz] = planeAt(x + 0.5, y + 0.5, FLOOR);
      const col = Math.floor(wx / PW);
      const run = Math.floor((wz + runOff(col)) / PL);
      const seamX = Math.floor(planeAt(x, y + 0.5, FLOOR)[0] / PW) !== Math.floor(planeAt(x + 1, y + 0.5, FLOOR)[0] / PW);
      const seamZ = Math.floor((planeAt(x + 0.5, y, FLOOR)[1] + runOff(col)) / PL) !== Math.floor((planeAt(x + 0.5, y + 1, FLOOR)[1] + runOff(col)) / PL);
      if (seamX || seamZ) ctx.set(p, ctx.colorOf(p, RAMP[S.FLOOR], tone[p] - 2));
      else if ((col + run) % 2) ctx.set(p, ctx.colorOf(p, RAMP[S.FLOOR], tone[p] + (bayer(x, y) > 0.7 ? 1 : 0)));
    }
  // as manchas de umidade escorrendo no reboco
  {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 100; i += 1) {
      const x = Math.floor(rnd() * w);
      const y0 = Math.floor(rnd() * 50);
      const len = 10 + Math.floor(rnd() * 50);
      for (let k = 0; k < len; k += 1) {
        const q = (y0 + k) * w + x + (k % 9 === 0 ? 1 : 0);
        if (mat[q] === S.PLASTER && rnd() < 0.8 * (1 - k / len)) ctx.set(q, ctx.colorOf(q, RAMP[S.PLASTER], tone[q] - 1));
      }
    }
  }
}

function post(ctx) {
  halo(ctx, ...proj(714, 47, 20), 46, [255, 210, 140], 0.5);
  halo(ctx, ...proj(600, 25, 8), 90, [255, 200, 120], 0.22);
}

export const PIXEL = {
  colors: { ...C, blue: [BLUE_HEX] },
  dither: new Set([S.PLASTER, S.TILE, S.FLOOR, S.BRICK, S.FREEZER, S.TRIM]),
  spec: new Set([S.GLASS_G, S.GLASS_A, S.GLASS_C, S.GLASS_B, S.CAP, S.MUG, S.PIPE, S.BRACKET, S.FREEZER_LID, S.NAIL, S.CLOCK_FACE, S.SIGN_FRAME, S.CRATE_BOTTLE, S.SHELF, S.FLOOR, S.TILE]),
  flats: new Set([S.FLOOR, S.TILE, S.PLASTER]),
  noEdge: new Set([S.PLASTER, S.TILE, S.FLOOR, S.BRICK, S.PLASTER_EDGE, S.TRIM]),
  decals,
  post,
};
