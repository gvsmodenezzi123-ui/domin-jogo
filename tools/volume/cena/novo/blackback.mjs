// O Mercado Negro do visual novo em volume (o palco de 896 × 414, de frente): o beco de tijolo
// molhado atrás do Corvo, a lanterna vermelha dele, os canos, a janela gradeada com a luz roxa, o
// balcão de tábuas escuras de ponta a ponta (a frente de engradado embaixo) e, à direita, o
// mostruário: o quadro de veludo roxo capitonê na moldura de madeira, com o trilho de ferro em
// cima. O balcão sai também numa faixa à parte (FRONT), por cima do Corvo.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdRoundBox, sdRoundCone, sdSphere, smax } from '../../sdf.mjs';
import { acc, group } from '../common.mjs';
import { hash2 } from '../decals.mjs';
import { bayer, halo } from '../pixelpass.mjs';
import { CAM, H, W } from './stage.mjs';

export { CAM, H, W };

export const S = {
  BRICK: 60, BRICK_D: 61, MORTAR: 62, PIPE: 63, PIPE_D: 64, WINDOW: 65, BARS: 66, GLASS: 67,
  LANTERN: 68, LANTERN_GLOW: 69, HOOK: 70, COUNTER: 71, COUNTER_FRONT: 72, SLAT: 73, FRAME: 74,
  VELVET: 75, BUTTON: 76, RAIL: 77, BOLT: 78, PUDDLE: 79, POSTER: 80, CRATE: 81,
};

const WALL_Z = -40;
const COUNTER_Y = 222;
const VEL = { x0: 392, x1: 884, y0: 56, y1: 216 };

// ------------------------------------------------------------------ o beco
function wall(x, y, z) {
  // o tijolo: cada tijolo um tiquinho para fora ou para dentro (a argamassa funda)
  const bw = 22;
  const bh = 10;
  const row = Math.floor(y / bh);
  const off = row % 2 ? bw / 2 : 0;
  const col = Math.floor((x + off) / bw);
  const lx = ((x + off) % bw + bw) % bw - bw / 2;
  const ly = (y % bh + bh) % bh - bh / 2;
  const jut = (hash2(col, row) - 0.5) * 0.9;
  const brick = sdRoundBox(lx, ly, z, 0, 0, WALL_Z + 1 + jut, bw / 2 - 1, bh / 2 - 1, 1.5, 1.2);
  add(brick, (col + row * 3) % 5 === 0 ? S.BRICK_D : S.BRICK);
  add(z - (WALL_Z - 0.6), S.MORTAR);
}

function pipes(x, y, z) {
  // o cano grosso correndo no alto e descendo pela esquerda, com as braçadeiras
  add(sdCapsule(x, y, z, -10, 30, WALL_Z + 6, 380, 30, WALL_Z + 6, 4.4), S.PIPE);
  add(sdCapsule(x, y, z, 360, 30, WALL_Z + 6, 360, 240, WALL_Z + 6, 3.6), S.PIPE);
  add(sdSphere(x, y, z, 360, 30, WALL_Z + 6, 5.2), S.PIPE_D);
  for (const cx of [60, 170, 280]) add(sdRoundBox(x, y, z, cx, 30, WALL_Z + 6, 2.4, 5.6, 5.4, 1), S.PIPE_D);
  for (const cy of [90, 170]) add(sdRoundBox(x, y, z, 360, cy, WALL_Z + 6, 4.8, 2.2, 4.6, 1), S.PIPE_D);
}

function windowBarred(x, y, z) {
  // a janela gradeada no alto (a luz roxa vazando)
  const cx = 296;
  const cy = 110;
  const frame = smax(sdRoundBox(x, y, z, cx, cy, WALL_Z + 2, 30, 24, 3, 1), -sdRoundBox(x, y, z, cx, cy, WALL_Z + 4, 26, 20, 4, 0.5), 0.5);
  add(frame, S.BOLT);
  add(sdRoundBox(x, y, z, cx, cy, WALL_Z - 1, 26, 20, 0.8, 0.5), S.GLASS);
  for (let i = -2; i <= 2; i += 1) add(sdCapsule(x, y, z, cx + i * 9, cy - 20, WALL_Z + 3, cx + i * 9, cy + 20, WALL_Z + 3, 1.1), S.BARS);
  add(sdCapsule(x, y, z, cx - 26, cy, WALL_Z + 3, cx + 26, cy, WALL_Z + 3, 1), S.BARS);
}

function lantern(x, y, z) {
  // a lanterna vermelha pendurada no gancho, atrás do ombro do Corvo
  const cx = 150;
  add(sdCapsule(x, y, z, cx, 56, WALL_Z + 6, cx + 16, 56, WALL_Z + 6, 1.2), S.HOOK);
  add(sdCapsule(x, y, z, cx + 16, 56, WALL_Z + 6, cx + 16, 70, WALL_Z + 6, 0.7), S.HOOK);
  add(sdRoundBox(x, y, z, cx + 16, 72, WALL_Z + 8, 7, 2, 7, 1), S.HOOK);
  add(sdRoundBox(x, y, z, cx + 16, 86, WALL_Z + 8, 6, 12, 6, 2.6), S.LANTERN_GLOW);
  for (const sx of [-1, 1]) add(sdCapsule(x, y, z, cx + 16 + sx * 6.4, 74, WALL_Z + 14, cx + 16 + sx * 6.4, 98, WALL_Z + 14, 0.9), S.HOOK);
  add(sdRoundBox(x, y, z, cx + 16, 100, WALL_Z + 8, 7.4, 2, 7.4, 1), S.HOOK);
}

function poster(x, y, z) {
  // o cartaz rasgado de "PROCURA-SE" colado no tijolo, à direita do Corvo
  add(sdRoundBox(x, y, z, 258, 172, WALL_Z + 2.4, 18, 24, 0.6, 0.4) + (hash2(Math.floor(x / 3), Math.floor(y / 3)) > 0.93 ? 0.8 : 0), S.POSTER);
}

// ------------------------------------------------------------------ o balcão
function counter(x, y, z) {
  add(sdRoundBox(x, y, z, W / 2, COUNTER_Y + 8, 0, W / 2 + 20, 8, 10, 3), S.COUNTER);
  // a frente: tábuas de engradado pregadas em pé
  add(sdRoundBox(x, y, z, W / 2, (COUNTER_Y + 16 + H + 20) / 2, -8, W / 2 + 20, (H + 20 - COUNTER_Y - 16) / 2, 6, 1), S.COUNTER_FRONT);
  const k = Math.floor(x / 30);
  for (let i = k - 1; i <= k + 1; i += 1) {
    const sx = i * 30 + 15;
    const lift = (hash2(i, 41) - 0.5) * 0.8;
    add(sdRoundBox(x, y, z, sx, 330, -1.6 + lift, 13.6, 92, 1.4, 0.8), S.SLAT);
  }
  // as ripas deitadas que seguram as tábuas
  for (const ry of [262, 394]) add(sdRoundBox(x, y, z, W / 2, ry, 0.6, W / 2 + 20, 4, 1.4, 0.8), S.CRATE);
}

// ------------------------------------------------------------------ o mostruário
function velvetBoard(x, y, z) {
  const cx = (VEL.x0 + VEL.x1) / 2;
  const cy = (VEL.y0 + VEL.y1) / 2;
  const hw = (VEL.x1 - VEL.x0) / 2;
  const hh = (VEL.y1 - VEL.y0) / 2;
  // a moldura de madeira (7 px por fora) e o veludo capitonê (os gomos entre os botões)
  const frame = smax(sdRoundBox(x, y, z, cx, cy, WALL_Z + 6, hw + 7, hh + 7, 4, 2), -sdRoundBox(x, y, z, cx, cy, WALL_Z + 8, hw, hh, 6, 0.5), 0.6);
  add(frame, S.FRAME);
  const gx = ((x - VEL.x0) % 16 + 16) % 16 - 8;
  const gy = ((y - VEL.y0) % 16 + 16) % 16 - 8;
  const puff = (1 - (Math.abs(gx) + Math.abs(gy)) / 8) * 1.6;
  add(sdRoundBox(x, y, z, cx, cy, WALL_Z + 2 + Math.max(0, puff) / 2, hw, hh, 2 + Math.max(0, puff) / 2, 0.5), S.VELVET);
  // os botões nos cruzamentos do capitonê
  const bx = VEL.x0 + Math.round((x - VEL.x0) / 16) * 16;
  const by = VEL.y0 + Math.round((y - VEL.y0) / 16) * 16;
  if (bx > VEL.x0 && bx < VEL.x1 && by > VEL.y0 + 14 && by < VEL.y1) add(sdSphere(x, y, z, bx, by, WALL_Z + 3.4, 1.4), S.BUTTON);
  // o trilho de ferro de onde as peças pendem
  add(sdRoundBox(x, y, z, cx, VEL.y0 + 8, WALL_Z + 9, hw, 2, 2, 1), S.RAIL);
  for (const sx of [VEL.x0 + 6, VEL.x1 - 6]) add(sdSphere(x, y, z, sx, VEL.y0 + 8, WALL_Z + 11, 2.2), S.BOLT);
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  wall(x, y, z);
  group(x, y, z, [-20, 20, WALL_Z - 1, 372, 250, WALL_Z + 12], pipes);
  group(x, y, z, [262, 82, WALL_Z - 2, 330, 138, WALL_Z + 7], windowBarred);
  group(x, y, z, [140, 50, WALL_Z - 1, 180, 106, WALL_Z + 18], lantern);
  group(x, y, z, [236, 144, WALL_Z - 1, 280, 200, WALL_Z + 4], poster);
  group(x, y, z, [-30, COUNTER_Y - 2, -20, W + 30, H + 30, 14], counter);
  group(x, y, z, [VEL.x0 - 10, VEL.y0 - 10, WALL_Z - 1, VEL.x1 + 10, VEL.y1 + 10, WALL_Z + 14], velvetBoard);
  return acc.D;
}
export const shade = scene;

export const LIGHTS = [
  // a lanterna vermelha, a luz roxa da janela, a luz fria do alto (a rua) e o brilho no veludo
  { p: [166, 88, -20], c: [1, 0.25, 0.18], k: 1.6, R: 150, shadow: true },
  { p: [296, 110, -30], c: [0.6, 0.35, 1], k: 0.9, R: 110, shadow: false },
  { p: [640, 40, 30], c: [0.75, 0.55, 1], k: 0.75, R: 280, shadow: true },
  { p: [448, -300, 260], c: [0.6, 0.62, 0.8], k: 0.32, R: 1e9, shadow: false },
];
export const AMB = [0.1, 0.08, 0.12];
export const EMISSIVE = new Set([S.LANTERN_GLOW, S.GLASS]);

const COLORS = {
  [S.BRICK]: ['#5a2a30'], [S.BRICK_D]: ['#462026'], [S.MORTAR]: ['#1c1218'], [S.PIPE]: ['#5a5e66', 'metal'],
  [S.PIPE_D]: ['#3a3c42', 'metal'], [S.WINDOW]: ['#2a2030'], [S.BARS]: ['#2c2e34', 'metal'], [S.GLASS]: ['#a070e0', 'glow'],
  [S.LANTERN]: ['#3a1a14'], [S.LANTERN_GLOW]: ['#ff5a3a', 'glow'], [S.HOOK]: ['#2a2a30', 'metal'], [S.COUNTER]: ['#5e3a50', 'metal'],
  [S.COUNTER_FRONT]: ['#1c0e16'], [S.SLAT]: ['#2e1a24'], [S.FRAME]: ['#4a2a1a'], [S.VELVET]: ['#3a1848'],
  [S.BUTTON]: ['#8a6a9a', 'metal'], [S.RAIL]: ['#8a8e96', 'metal'], [S.BOLT]: ['#5a5e66', 'metal'], [S.PUDDLE]: ['#2a2a40', 'metal'],
  [S.POSTER]: ['#c8b890'], [S.CRATE]: ['#3a2230'],
};

function decals(ctx) {
  const { W: w, H: h, mat, tone, RAMP } = ctx;
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const m = mat[p];
      if (m === S.BRICK || m === S.BRICK_D) {
        // o tijolo molhado: as manchas escorrendo e os respingos claros
        const streak = Math.sin(x * 0.31 + Math.sin(y * 0.02) * 3) > 0.92 && hash2(Math.floor(x / 4), 7) > 0.5;
        if (streak && bayer(x, y) > 0.4) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
        else if (hash2(x, y) > 0.985) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] + 1));
      } else if (m === S.SLAT || m === S.COUNTER_FRONT) {
        const g = Math.sin(x * 1.1 + Math.sin(y * 0.06 + x * 0.3) * 2 + hash2(Math.floor(x / 5), 9) * 5);
        if (g > 0.9) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
      } else if (m === S.POSTER) {
        // o cartaz: o título em cima e o rosto riscado
        const lx = x - 240;
        const ly = y - 148;
        if (ly >= 4 && ly <= 6 && lx > 4 && lx < 32 && lx % 4 !== 3) ctx.set(p, [60, 30, 24]);
        if (Math.hypot(lx - 18, ly - 22) < 8 && Math.hypot(lx - 18, ly - 22) > 6.6) ctx.set(p, [70, 40, 30]);
        if (ly > 34 && ly < 44 && (lx + ly) % 5 === 0 && lx > 5 && lx < 31) ctx.set(p, [90, 60, 44]);
      }
    }
}

function post(ctx) {
  halo(ctx, 166, 88, 120, [255, 60, 40], 0.45);
  halo(ctx, 296, 110, 70, [170, 90, 255], 0.35);
}

export const PIXEL = {
  colors: COLORS,
  dither: new Set([S.BRICK, S.BRICK_D, S.VELVET, S.COUNTER_FRONT, S.SLAT, S.MORTAR]),
  spec: new Set([S.PIPE, S.PIPE_D, S.BARS, S.HOOK, S.RAIL, S.BOLT, S.BUTTON, S.COUNTER]),
  flats: new Set([S.VELVET, S.COUNTER_FRONT]),
  noEdge: new Set([S.MORTAR, S.VELVET, S.COUNTER_FRONT]),
  decals,
  post,
  vignette: { cx: 300, cy: 150, rx: 700, ry: 380, start: 0.4, k: 1.3, max: 0.65 },
};

/** A faixa da frente (por cima do Corvo): o tampo do balcão. */
export const FRONT = { mats: [S.COUNTER], y0: 218, y1: 246 };
