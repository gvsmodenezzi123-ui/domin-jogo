// O porão do Seu Tião em volume, no palco das telas deitadas (LandStage: 1000 × 450 unidades, com a
// sobra de 48 × 88 de cada lado para as telas mais altas ou mais largas: a imagem tem 1096 × 626 e
// 1 pixel = 1 unidade). A parede de tijolo úmido, a calha de luz fria no meio do teto (o facho cai
// no Seu Tião e faz a poça de luz no chão de cimento), os canos, as prateleiras de tralha nos
// cantos escuros e a tábua do letreiro. A caixa de ferramentas vermelha, na frente dele, é uma peça
// à parte (novo/kit.mjs: 'toolbox').
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { acc, group } from '../common.mjs';
import { hash2 } from '../decals.mjs';
import { bayer, halo } from '../pixelpass.mjs';

export const PAD = { x: 48, y: 88 };
export const W = 1000 + PAD.x * 2;
export const H = 450 + PAD.y * 2;
export const CAM = [W / 2, H / 2, 1e5];

export const S = {
  BRICK: 60, BRICK_D: 61, MORTAR: 62, FLOOR: 63, PIPE: 64, PIPE_D: 65, HOUSING: 66, TUBE: 67, WIRE: 68,
  SHELF: 69, JAR: 70, CAN: 71, CAN_R: 72, BOTTLE: 73, SIGN: 74, NAIL: 75, BEAM: 76, MOSS: 77, PUDDLE: 78,
  BOX: 79, RAG: 80,
};

const WALL_Z = -40;
const FLOOR_Y = 330; // (unidades do palco) onde a parede encontra o chão
const LAMP = { x: 420, y: 22 };

// as coordenadas do palco a partir das da imagem
const st = (x, y) => [x - PAD.x, y - PAD.y];

function wall(X, Y, z) {
  const bw = 26;
  const bh = 12;
  const row = Math.floor(Y / bh);
  const off = row % 2 ? bw / 2 : 0;
  const col = Math.floor((X + off) / bw);
  const lx = ((X + off) % bw + bw) % bw - bw / 2;
  const ly = (Y % bh + bh) % bh - bh / 2;
  const jut = (hash2(col, row + 50) - 0.5) * 1;
  add(sdRoundBox(lx, ly, z, 0, 0, WALL_Z + 1 + jut, bw / 2 - 1.2, bh / 2 - 1.2, 1.6, 1.4), (col * 7 + row * 3) % 6 === 0 ? S.BRICK_D : S.BRICK);
  add(z - (WALL_Z - 0.8), S.MORTAR);
}

function floor(X, Y, z) {
  // o chão de cimento subindo para a frente (o palco é visto de frente: a rampa faz o chão aparecer)
  if (Y < FLOOR_Y - 4) return;
  const zz = WALL_Z + (Y - FLOOR_Y) * 0.9;
  add((z - zz) * 0.7, S.FLOOR);
}

function pipes(X, Y, z) {
  add(sdCapsule(X, Y, z, -60, 62, WALL_Z + 8, 1060, 62, WALL_Z + 8, 5), S.PIPE);
  add(sdCapsule(X, Y, z, -60, 78, WALL_Z + 6, 1060, 78, WALL_Z + 6, 2.6), S.PIPE_D);
  for (const cx of [90, 300, 560, 780, 960]) add(sdRoundBox(X, Y, z, cx, 66, WALL_Z + 8, 2.6, 9, 6, 1), S.PIPE_D);
  // o cano que desce pela direita até o chão
  add(sdCapsule(X, Y, z, 660, 62, WALL_Z + 8, 660, FLOOR_Y + 10, WALL_Z + 8, 4), S.PIPE);
  add(sdSphere(X, Y, z, 660, 62, WALL_Z + 8, 6), S.PIPE_D);
}

function lamp(X, Y, z) {
  // a calha de luz fria: o corpo de metal, o tubo aceso e os dois arames do teto
  add(sdRoundBox(X, Y, z, LAMP.x, LAMP.y, -8, 50, 5, 7, 2), S.HOUSING);
  add(sdCapsule(X, Y, z, LAMP.x - 44, LAMP.y + 5.5, -4, LAMP.x + 44, LAMP.y + 5.5, -4, 2.6), S.TUBE);
  for (const sx of [-34, 34]) add(sdCapsule(X, Y, z, LAMP.x + sx, -100, -8, LAMP.x + sx, LAMP.y - 4, -8, 0.7), S.WIRE);
}

function shelves(X, Y, z) {
  // duas prateleiras de cada lado, nos cantos escuros, com potes, latas e garrafas
  for (const [x0, x1] of [
    [-40, 170],
    [700, 1040],
  ])
    for (const sy of [150, 232]) {
      add(sdRoundBox(X, Y, z, (x0 + x1) / 2, sy, WALL_Z + 9, (x1 - x0) / 2, 3, 9, 1.2), S.SHELF);
      const n = Math.floor((x1 - x0) / 22);
      const k = Math.round((X - x0 - 11) / 22);
      for (let i = Math.max(0, k - 1); i <= Math.min(n - 1, k + 1); i += 1) {
        const ix = x0 + 11 + i * 22 + (hash2(i, sy) - 0.5) * 6;
        const kind = Math.floor(hash2(i, sy + 3) * 4);
        const bz = WALL_Z + 9;
        if (kind === 0) add(sdRoundBox(X, Y, z, ix, sy - 11, bz, 7, 8, 6, 3), S.JAR);
        else if (kind === 1) add(sdRoundBox(X, Y, z, ix, sy - 9, bz, 6, 6, 6, 1.4), hash2(i, sy + 9) > 0.5 ? S.CAN : S.CAN_R);
        else if (kind === 2) add(smin(sdRoundBox(X, Y, z, ix, sy - 10, bz, 4, 7, 4, 3.4), sdCapsule(X, Y, z, ix, sy - 17, bz, ix, sy - 24, bz, 1.4), 1.4), S.BOTTLE);
        else add(sdRoundBox(X, Y, z, ix, sy - 7, bz, 9, 4, 8, 1.5), S.BOX);
      }
    }
}

function sign(X, Y, z) {
  // a tábua escura atrás do letreiro, pregada no tijolo
  add(sdRoundBox(X, Y, z, 172, 54, WALL_Z + 3, 158, 30, 2.6, 2), S.SIGN);
  for (const nx of [20, 324]) for (const ny of [30, 78]) add(sdSphere(X, Y, z, nx, ny, WALL_Z + 5.4, 1.8), S.NAIL);
}

export function scene(x, y, z) {
  reset();
  const [X, Y] = st(x, y);
  wall(X, Y, z);
  floor(X, Y, z);
  group(X, Y, z, [-70, 50, WALL_Z - 1, 1070, FLOOR_Y + 16, WALL_Z + 16], pipes);
  group(X, Y, z, [360, -110, -18, 480, 34, 2], lamp);
  group(X, Y, z, [-50, 110, WALL_Z - 1, 1050, 240, WALL_Z + 20], shelves);
  group(X, Y, z, [10, 20, WALL_Z - 1, 334, 88, WALL_Z + 8], sign);
  return acc.D;
}
export const shade = scene;

// as luzes ficam na imagem (somar a sobra)
const L = (x, y, zz) => [x + PAD.x, y + PAD.y, zz];
export const LIGHTS = [
  // a calha fria em cima do Seu Tião (o facho) e um resto de luz quente vindo da escada, à esquerda
  { p: L(LAMP.x, LAMP.y + 14, -6), c: [0.86, 0.92, 1], k: 2.1, R: 230, shadow: true },
  { p: L(-40, 200, 40), c: [1, 0.7, 0.4], k: 0.5, R: 300, shadow: false },
  // a poça de luz no chão, debaixo do facho
  { p: L(LAMP.x, FLOOR_Y - 10, 70), c: [0.82, 0.9, 1], k: 1.1, R: 170, shadow: false },
];
export const AMB = [0.07, 0.07, 0.09];
export const EMISSIVE = new Set([S.TUBE]);

const COLORS = {
  [S.BRICK]: ['#4a3a34'], [S.BRICK_D]: ['#3a2c28'], [S.MORTAR]: ['#141010'], [S.FLOOR]: ['#4a4a4c'],
  [S.PIPE]: ['#5a5e66', 'metal'], [S.PIPE_D]: ['#3a3c42', 'metal'], [S.HOUSING]: ['#8a8e96', 'metal'], [S.TUBE]: ['#eaf4ff', 'glow'],
  [S.WIRE]: ['#1a1a1c'], [S.SHELF]: ['#4a2e18'], [S.JAR]: ['#8aa070', 'metal'], [S.CAN]: ['#8a8a90', 'metal'], [S.CAN_R]: ['#a83a2a', 'metal'],
  [S.BOTTLE]: ['#2a6a3a', 'metal'], [S.SIGN]: ['#3e2616'], [S.NAIL]: ['#8a8680', 'metal'], [S.MOSS]: ['#3a5a30'], [S.BOX]: ['#7a5a36'],
};

function decals(ctx) {
  const { W: w, H: h, mat, tone, RAMP } = ctx;
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const m = mat[p];
      const [X, Y] = st(x, y);
      if (m === S.BRICK || m === S.BRICK_D) {
        // a umidade subindo do chão e o musgo nas juntas de baixo
        if (Y > FLOOR_Y - 60 && bayer(x, y) < (Y - (FLOOR_Y - 60)) / 120) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
        if (Y > FLOOR_Y - 30 && hash2(x, y) > 0.94) ctx.set(p, ctx.colorOf(p, RAMP[S.MOSS], tone[p]));
      } else if (m === S.FLOOR) {
        // o cimento: as rachaduras e as manchas
        const crack = Math.abs(Math.sin(X * 0.021 + Math.sin(Y * 0.05) * 1.7) * 30 - (Y - FLOOR_Y)) < 0.6;
        if (crack) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 2));
        else if (hash2(Math.floor(X / 5), Math.floor(Y / 3)) > 0.86 && bayer(x, y) > 0.5) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
        // a poça debaixo do cano
        const pd = Math.hypot((X - 690) / 2.6, Y - (FLOOR_Y + 40));
        if (pd < 16) ctx.set(p, ctx.colorOf(p, RAMP[S.PIPE], tone[p] + (pd < 9 ? 1 : 0)));
      } else if (m === S.SIGN) {
        const g = Math.sin(Y * 0.9 + Math.sin(X * 0.04) * 2 + hash2(Math.floor(Y / 6), 3) * 4);
        if (g > 0.9) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
      }
    }
}

function post(ctx) {
  halo(ctx, LAMP.x + PAD.x, LAMP.y + PAD.y + 6, 160, [200, 225, 255], 0.28);
}

export const PIXEL = {
  colors: COLORS,
  dither: new Set([S.BRICK, S.BRICK_D, S.FLOOR, S.SIGN, S.MORTAR]),
  spec: new Set([S.PIPE, S.PIPE_D, S.HOUSING, S.JAR, S.CAN, S.CAN_R, S.BOTTLE, S.NAIL]),
  flats: new Set([S.FLOOR, S.SIGN]),
  noEdge: new Set([S.MORTAR, S.FLOOR]),
  decals,
  post,
  vignette: { cx: LAMP.x + PAD.x, cy: 300, rx: 620, ry: 420, start: 0.35, k: 1.3, max: 0.7 },
};
