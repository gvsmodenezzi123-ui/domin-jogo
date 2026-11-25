// A Loja do Valtinho do visual novo em volume (o palco de 896 × 414, de frente): a parede verde do
// boteco com as prateleiras de garrafa atrás do Valtinho, a lâmpada dele, o letreiro de neon
// ABERTO, o quadro-negro (o texto vem por cima), o vaso de planta, o copo de dados, o balcão de
// ponta a ponta (a frente almofadada embaixo) e, à direita, o mostruário: o toldo listrado, as três
// lampadinhas e o fundo de madeira. O balcão, a planta e o copo saem também numa faixa à parte
// (FRONT), que o jogo põe por cima do Valtinho.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { acc, group } from '../common.mjs';
import { hash2, neonRing, neonText } from '../decals.mjs';
import { bayer, halo } from '../pixelpass.mjs';
import { CAM, H, W, rot } from './stage.mjs';

export { CAM, H, W };

export const S = {
  WALL: 60, WAINSCOT: 61, SHELF: 62, BRACKET: 63, GLASS_G: 64, GLASS_A: 65, GLASS_B: 66, GLASS_C: 67,
  LABEL_R: 68, LABEL_Y: 69, CAP: 70, SHADE: 71, BULB: 72, CORD: 73, NEON_BACK: 74, NEON: 75,
  BOARD_FRAME: 76, SLATE: 77, POT: 78, LEAF: 79, LEAF_D: 80, SOIL: 81, COUNTER: 82, COUNTER_FRONT: 83,
  CUP: 84, CUP_RIM: 85, DIE: 86, PIP: 87, AWN_R: 88, AWN_W: 89, CABINET: 90, CABINET_LIP: 91, PANEL: 92,
  BRASS: 93, NAIL: 94,
};

const WALL_Z = -40;
const COUNTER_Y = 222;
const AWN = { x0: 388, x1: 890, y0: 52, y1: 74 };

// ------------------------------------------------------------------ a parede e as prateleiras
function wall(x, y, z) {
  // a parede verde em cima, o lambri de madeira escura embaixo (atrás do balcão)
  add(z - WALL_Z, y < 168 ? S.WALL : S.WAINSCOT);
  if (Math.abs(y - 168) < 3) add(sdRoundBox(x, y, z, 190, 168, WALL_Z + 1, 200, 1.6, 1.6, 0.8), S.SHELF);
}

const SHELVES = [64, 122];
function shelves(x, y, z) {
  for (const sy of SHELVES) {
    add(sdRoundBox(x, y, z, 118, sy + 3, WALL_Z + 8, 128, 3, 8, 1.2), S.SHELF);
    for (const bx of [16, 118, 220]) add(sdRoundBox(x, y, z, bx, sy + 9, WALL_Z + 3, 2, 6, 3, 0.8), S.BRACKET);
  }
}

const GLASS = [S.GLASS_G, S.GLASS_A, S.GLASS_B, S.GLASS_C];
function bottles(x, y, z) {
  for (let r = 0; r < SHELVES.length; r += 1) {
    const sy = SHELVES[r];
    if (y > sy + 1 || y < sy - 36) continue;
    const k = Math.round((x - 6) / 13);
    for (let i = k - 1; i <= k + 1; i += 1) {
      if (i < 0 || i > 18) continue;
      const bx = 6 + i * 13 + (hash2(i, r) - 0.5) * 3;
      const tall = 20 + Math.floor(hash2(i, r + 7) * 3) * 4;
      const bz = WALL_Z + 9;
      const g = GLASS[Math.floor(hash2(i, r + 3) * 4)];
      const body = sdRoundBox(x, y, z, bx, sy - tall / 3, bz, 4, tall / 3, 4, 3.4);
      const neck = sdRoundCone(x, y, z, bx, sy - tall * 0.62, bz, bx, sy - tall, bz, 2.6, 1.3);
      add(smin(body, neck, 1.6), g);
      add(sdRoundBox(x, y, z, bx, sy - tall / 3, bz + 3.6, 3.2, tall / 6, 0.6, 0.5), hash2(i, r + 11) > 0.5 ? S.LABEL_R : S.LABEL_Y);
      add(sdSphere(x, y, z, bx, sy - tall - 0.6, bz, 1.6), S.CAP);
    }
  }
}

// ------------------------------------------------------------------ a lâmpada do Valtinho
function lamp(x, y, z) {
  add(sdCapsule(x, y, z, 127, -10, -6, 127, 26, -6, 0.9), S.CORD);
  // o chapéu verde (uma cúpula aberta embaixo) e a lâmpada aparecendo
  add(Math.max(sdEllipsoid(x, y, z, 127, 40, -6, 23, 15, 23), y - 40) - 0.4, S.SHADE);
  add(sdRoundBox(x, y, z, 127, 24.5, -6, 3, 1.6, 3, 0.8), S.BRASS);
  add(sdSphere(x, y, z, 127, 42, -6, 5.4), S.BULB);
}

// ------------------------------------------------------------------ o letreiro de neon e o quadro
const NEON = { cx: 294, cy: 69, w: 84, h: 26, ang: (-4 * Math.PI) / 180 };
function neonSign(x, y, z) {
  const [lx, ly] = rot(x, y, NEON.cx, NEON.cy, NEON.ang);
  add(sdRoundBox(lx, ly, z, 0, 0, WALL_Z + 3, NEON.w / 2, NEON.h / 2, 2, 3), S.NEON_BACK);
  // os parafusos nos cantos
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(sdSphere(lx, ly, z, sx * (NEON.w / 2 - 4), sy * (NEON.h / 2 - 4), WALL_Z + 5, 1.5), S.NAIL);
}

const BOARD = { cx: 304, cy: 171, w: 112, h: 50, ang: (2 * Math.PI) / 180 };
function chalkboard(x, y, z) {
  const [lx, ly] = rot(x, y, BOARD.cx, BOARD.cy, BOARD.ang);
  const frame = sdRoundBox(lx, ly, z, 0, 0, WALL_Z + 4, BOARD.w / 2, BOARD.h / 2, 3, 1.6);
  const hole = sdRoundBox(lx, ly, z, 0, 0, WALL_Z + 6, BOARD.w / 2 - 5, BOARD.h / 2 - 5, 3, 0.8);
  add(smax(frame, -hole, 0.6), S.BOARD_FRAME);
  add(sdRoundBox(lx, ly, z, 0, 0, WALL_Z + 2.5, BOARD.w / 2 - 4, BOARD.h / 2 - 4, 1, 0.5), S.SLATE);
  // o prego e o barbante que seguram o quadro
  add(sdSphere(lx, ly, z, 0, -BOARD.h / 2 - 12, WALL_Z + 2, 1.8), S.NAIL);
  for (const sx of [-1, 1]) add(sdCapsule(lx, ly, z, 0, -BOARD.h / 2 - 12, WALL_Z + 2, sx * (BOARD.w / 2 - 12), -BOARD.h / 2 + 1, WALL_Z + 6, 0.55), S.CORD);
}

// ------------------------------------------------------------------ o vaso, o copo de dados, o balcão
function plant(x, y, z) {
  // o vaso de barro em cima do balcão
  add(sdRoundCone(x, y, z, 30, COUNTER_Y - 2, 4, 30, COUNTER_Y - 18, 4, 9, 12), S.POT);
  add(sdRoundBox(x, y, z, 30, COUNTER_Y - 19, 4, 13.5, 2.2, 13.5, 1.4), S.POT);
  add(sdEllipsoid(x, y, z, 30, COUNTER_Y - 20, 4, 11, 2, 11), S.SOIL);
  // as folhas: uma touceira de gotas verdes caindo para os lados
  for (let i = 0; i < 11; i += 1) {
    const a = -Math.PI / 2 + (i - 5) * 0.27;
    const len = 18 + (i % 3) * 6;
    const tx = 30 + Math.cos(a) * len * 1.05;
    const ty = COUNTER_Y - 22 + Math.sin(a) * len;
    add(sdRoundCone(x, y, z, 30, COUNTER_Y - 22, 4 + (i % 2) * 3, tx, ty, 6 + (i % 3) * 2, 2.2, 4.2), i % 2 ? S.LEAF : S.LEAF_D);
  }
}

function diceCup(x, y, z) {
  // o copo de couro emborcado e os dois dados do lado
  add(sdRoundCone(x, y, z, 240, COUNTER_Y - 3, 6, 240, COUNTER_Y - 24, 6, 10.5, 8.5), S.CUP);
  add(sdRoundBox(x, y, z, 240, COUNTER_Y - 4, 6, 11.4, 2, 11.4, 1), S.CUP_RIM);
  for (const [dx, dz, s] of [
    [256, 8, 4.2],
    [264, 2, 3.8],
  ]) {
    const die = sdRoundBox(x, y, z, dx, COUNTER_Y - s, dz, s, s, s, 1.2);
    add(die, S.DIE);
  }
}

function counter(x, y, z) {
  // o tampo (a beirada boleada, 16 px) e a frente almofadada até o chão
  add(sdRoundBox(x, y, z, W / 2, COUNTER_Y + 8, 0, W / 2 + 20, 8, 10, 5), S.COUNTER);
  add(sdRoundBox(x, y, z, W / 2, (COUNTER_Y + 16 + H + 20) / 2, -8, W / 2 + 20, (H + 20 - COUNTER_Y - 16) / 2, 6, 1), S.COUNTER_FRONT);
  // as almofadas da frente: quadros rebaixados de 64 em 64
  const k = Math.floor(x / 64);
  for (let i = k - 1; i <= k + 1; i += 1) {
    const px = i * 64 + 32;
    const panel = sdRoundBox(x, y, z, px, 330, -1.4, 26, 78, 1.2, 2);
    add(panel, S.PANEL);
  }
}

// ------------------------------------------------------------------ o mostruário
function awning(x, y, z) {
  // o pano listrado descendo para a frente, com a barra de gomos embaixo
  const t = (y - AWN.y0) / (AWN.y1 - AWN.y0);
  const zz = -14 + t * 14;
  const stripe = Math.floor((x - AWN.x0) / 22) % 2;
  const top = Math.max(Math.abs(z - zz) - 1.3, AWN.y0 - y, y - AWN.y1, AWN.x0 - x, x - AWN.x1) * 0.8;
  // os gomos: meio-círculos pendurados
  const cx = AWN.x0 + 11 + Math.round((x - AWN.x0 - 11) / 22) * 22;
  const scal = Math.max(Math.hypot(x - cx, y - AWN.y1) - 10, AWN.y1 - y, Math.abs(z - 0.5) - 1.3, AWN.x0 - x, x - AWN.x1);
  add(Math.min(top, scal), stripe ? S.AWN_W : S.AWN_R);
  // o cano de ferro na beirada
  add(sdCapsule(x, y, z, AWN.x0 - 2, AWN.y1 - 1, 1.6, AWN.x1 + 2, AWN.y1 - 1, 1.6, 1.6), S.BRASS);
}

function cabinet(x, y, z) {
  // o fundo do mostruário (tábuas deitadas), a moldura e o rodapé onde as peças se apoiam
  add(sdRoundBox(x, y, z, (AWN.x0 + AWN.x1) / 2, 150, WALL_Z + 6, (AWN.x1 - AWN.x0) / 2 + 2, 78, 6, 1), S.CABINET);
  add(sdRoundBox(x, y, z, (AWN.x0 + AWN.x1) / 2, 217, WALL_Z + 14, (AWN.x1 - AWN.x0) / 2 + 2, 5, 14, 1.4), S.CABINET_LIP);
  for (const sx of [AWN.x0 - 1, AWN.x1 + 1]) add(sdRoundBox(x, y, z, sx, 148, WALL_Z + 12, 4, 80, 12, 1.4), S.CABINET_LIP);
  // as três lampadinhas debaixo do toldo
  for (const lx of [493, 663, 823]) {
    add(sdRoundCone(x, y, z, lx, AWN.y1 + 2, -2, lx, AWN.y1 + 8, -2, 2, 6), S.SHADE);
    add(sdSphere(x, y, z, lx, AWN.y1 + 8.5, -2, 2.4), S.BULB);
  }
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  wall(x, y, z);
  group(x, y, z, [-10, 20, WALL_Z - 1, 250, 132, WALL_Z + 18], shelves);
  group(x, y, z, [-10, 20, WALL_Z - 1, 250, 128, WALL_Z + 16], bottles);
  group(x, y, z, [96, -12, -14, 158, 48, 2], lamp);
  group(x, y, z, [246, 46, WALL_Z - 1, 342, 92, WALL_Z + 8], neonSign);
  group(x, y, z, [240, 120, WALL_Z - 1, 368, 204, WALL_Z + 10], chalkboard);
  group(x, y, z, [-6, COUNTER_Y - 58, -10, 70, COUNTER_Y + 1, 16], plant);
  group(x, y, z, [224, COUNTER_Y - 30, -8, 272, COUNTER_Y + 1, 18], diceCup);
  group(x, y, z, [-30, COUNTER_Y - 2, -20, W + 30, H + 30, 14], counter);
  group(x, y, z, [AWN.x0 - 6, AWN.y0 - 4, -18, AWN.x1 + 6, AWN.y1 + 14, 6], awning);
  group(x, y, z, [AWN.x0 - 8, AWN.y1 - 2, WALL_Z - 1, AWN.x1 + 8, COUNTER_Y, 2], cabinet);
  return acc.D;
}
export const shade = scene;

export const LIGHTS = [
  // a lâmpada do Valtinho, o neon rosa, as três lampadinhas do mostruário e a luz geral do salão
  { p: [127, 46, -4], c: [1, 0.84, 0.56], k: 1.5, R: 150, shadow: true },
  { p: [294, 72, -28], c: [1, 0.42, 0.8], k: 0.55, R: 70, shadow: false },
  { p: [493, 84, 2], c: [1, 0.85, 0.6], k: 0.7, R: 110, shadow: true },
  { p: [663, 84, 2], c: [1, 0.85, 0.6], k: 0.7, R: 110, shadow: true },
  { p: [823, 84, 2], c: [1, 0.85, 0.6], k: 0.7, R: 110, shadow: true },
  { p: [448, -200, 300], c: [0.9, 0.85, 0.8], k: 0.35, R: 1e9, shadow: false },
];
export const AMB = [0.14, 0.12, 0.12];
export const EMISSIVE = new Set([S.BULB, S.NEON]);

const COLORS = {
  [S.WALL]: ['#3c5a46'], [S.WAINSCOT]: ['#4a2812'], [S.SHELF]: ['#6a3a18'], [S.BRACKET]: ['#5a5a5e', 'metal'],
  [S.GLASS_G]: ['#2a7a3a', 'metal'], [S.GLASS_A]: ['#b8701c', 'metal'], [S.GLASS_B]: ['#5a2e14', 'metal'], [S.GLASS_C]: ['#a8c8bc', 'metal'],
  [S.LABEL_R]: ['#c8302a'], [S.LABEL_Y]: ['#e8c040'], [S.CAP]: ['#d0a040', 'metal'], [S.SHADE]: ['#2e5a3a', 'metal'],
  [S.BULB]: ['#fff0c0', 'glow'], [S.CORD]: ['#1e1a16'], [S.NEON_BACK]: ['#24141e'], [S.NEON]: ['#ff7ac8', 'glow'],
  [S.BOARD_FRAME]: ['#7a4a22'], [S.SLATE]: ['#22302a'], [S.POT]: ['#b0582a'], [S.LEAF]: ['#3aa648'], [S.LEAF_D]: ['#2a7a34'],
  [S.SOIL]: ['#3a2416'], [S.COUNTER]: ['#c07a38', 'metal'], [S.COUNTER_FRONT]: ['#5a2e12'], [S.CUP]: ['#6a3418'],
  [S.CUP_RIM]: ['#4a2210'], [S.DIE]: ['#f4ecd8'], [S.PIP]: ['#1a0a02'], [S.AWN_R]: ['#c8382a'], [S.AWN_W]: ['#f6e2b0'],
  [S.CABINET]: ['#3e200c'], [S.CABINET_LIP]: ['#6e3e1c'], [S.PANEL]: ['#4e2810'], [S.BRASS]: ['#c9902e', 'metal'],
  [S.NAIL]: ['#a8a49a', 'metal'],
};

function decals(ctx) {
  const { W: w, H: h, mat, tone, RAMP } = ctx;
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const m = mat[p];
      if (m === S.WALL) {
        // o reboco manchado de umidade
        const n = Math.sin(x * 0.07 + Math.sin(y * 0.09) * 2) + Math.sin(y * 0.13 + x * 0.02);
        if (n > 1.2 && bayer(x, y) > 0.5) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
      } else if (m === S.WAINSCOT || m === S.CABINET || m === S.COUNTER_FRONT || m === S.PANEL) {
        // o veio da madeira (em pé no lambri e na frente do balcão; deitado no mostruário)
        const along = m === S.CABINET ? x : y;
        const across = m === S.CABINET ? y : x;
        const g = Math.sin(across * 0.9 + Math.sin(along * 0.05 + across * 0.3) * 1.8 + hash2(Math.floor(across / 6), 3) * 5);
        if (g > 0.88) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
        if (m === S.WAINSCOT && x % 24 === 0) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 2));
        if (m === S.CABINET && (y - 74) % 18 === 0) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 2));
      } else if (m === S.SLATE) {
        // o giz apagado no quadro
        if (hash2(Math.floor(x / 3), Math.floor(y / 2)) > 0.9 && bayer(x, y) > 0.4) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] + 1));
      } else if (m === S.DIE) {
        // as pintas dos dados (o de cima mostra 5, o outro 3)
        const near = (cx, cy) => Math.hypot(x - cx, y - cy) < 0.9;
        if (near(256, 218) || near(254, 216) || near(258, 216) || near(254, 220) || near(258, 220) || near(264, 218) || near(262, 216) || near(266, 220)) ctx.set(p, [26, 10, 2]);
      }
    }
  // o neon ABERTO: os tubos rosa com o miolo claro e a moldura de tubo
  neonText(ctx, 'ABERTO', 266, 62, 2, [255, 90, 190], [255, 225, 245], 1.6);
  for (let a = 0; a < 1; a += 0.004) {
    // a moldura de tubo em volta (retângulo de cantos redondos, girado)
    const per = 2 * (NEON.w - 10) + 2 * (NEON.h - 8);
    let d = a * per;
    let lx;
    let ly;
    const hw = (NEON.w - 10) / 2;
    const hh = (NEON.h - 8) / 2;
    if (d < 2 * hw) [lx, ly] = [-hw + d, -hh];
    else if ((d -= 2 * hw) < 2 * hh) [lx, ly] = [hw, -hh + d];
    else if ((d -= 2 * hh) < 2 * hw) [lx, ly] = [hw - d, hh];
    else [lx, ly] = [-hw, hh - (d - 2 * hw)];
    const c = Math.cos(-NEON.ang);
    const s = Math.sin(-NEON.ang);
    const X = Math.round(NEON.cx + lx * c + ly * s);
    const Y = Math.round(NEON.cy - lx * s + ly * c);
    if (X >= 0 && Y >= 0 && X < w && Y < h) ctx.set(Y * w + X, [255, 120, 200]);
  }
  void neonRing;
}

function post(ctx) {
  halo(ctx, 294, 68, 70, [255, 80, 180], 0.35);
  halo(ctx, 127, 46, 120, [255, 200, 120], 0.3);
  for (const lx of [493, 663, 823]) halo(ctx, lx, 84, 46, [255, 210, 140], 0.3);
}

export const PIXEL = {
  colors: COLORS,
  dither: new Set([S.WALL, S.WAINSCOT, S.CABINET, S.COUNTER_FRONT, S.PANEL, S.SLATE, S.AWN_R, S.AWN_W]),
  spec: new Set([S.GLASS_G, S.GLASS_A, S.GLASS_B, S.GLASS_C, S.CAP, S.BRACKET, S.COUNTER, S.BRASS, S.NAIL, S.SHADE]),
  flats: new Set([S.WALL, S.WAINSCOT, S.CABINET, S.COUNTER_FRONT, S.SLATE]),
  noEdge: new Set([S.WALL, S.WAINSCOT, S.CABINET, S.COUNTER_FRONT, S.PANEL]),
  decals,
  post,
  vignette: { cx: 300, cy: 150, rx: 700, ry: 380, start: 0.45, k: 1.2, max: 0.55 },
};

/** A faixa da frente (por cima do Valtinho): o balcão, a planta e o copo. */
export const FRONT = { mats: [S.COUNTER, S.POT, S.SOIL, S.LEAF, S.LEAF_D, S.CUP, S.CUP_RIM, S.DIE], y0: 176, y1: 246 };
