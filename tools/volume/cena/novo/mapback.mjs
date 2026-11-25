// O mapa da campanha do visual novo em volume, visto de cima (o palco de 896 × 414): a mesa do
// boteco (tábuas escuras e a luz da lâmpada), o caderno de fiado (a capa de papelão, o maço de
// folhas, a folha de cima um pouco ondulada, a espiral, a fita crepe e o clipe), a tábua da
// direita pendurada nas duas correntes, a tábua do topo, as tampinhas e o lápis. O que muda
// (os pontos, as linhas, os textos) o jogo põe por cima.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdRoundBox, sdSphere, smax, smin } from '../../sdf.mjs';
import { acc, group } from '../common.mjs';
import { hash2 } from '../decals.mjs';
import { bayer } from '../pixelpass.mjs';

export const W = 896;
export const H = 414;
export const CAM = [W / 2, H / 2, 1e5];

export const S = {
  TABLE: 60, TABLE_B: 61, NAIL: 62, COVER: 63, PAGES: 64, PAPER: 65, SPIRAL: 66, HOLE: 67,
  TAPE: 68, CLIP: 69, BOARD: 70, BOARD_B: 71, DARK: 72, CHAIN: 73, CAP_R: 74, CAP_G: 75,
  PENCIL: 76, WOOD_TIP: 77, LEAD: 78, FERRULE: 79, ERASER: 80, LINER: 81, GAP: 82,
};

// ------------------------------------------------------------------ a mesa
const PLANK = 46;
const TABLE_Z = 0;
function table(x, y, z) {
  // o fundo das frestas
  add(z - (TABLE_Z - 7), S.GAP);
  // as tábuas deitadas no comprido, uma fresta entre elas, cada uma num tom e num nível
  const row = Math.floor(y / PLANK);
  for (let r = row - 1; r <= row + 1; r += 1) {
    const cy = r * PLANK + PLANK / 2;
    // as emendas das tábuas no comprido, desencontradas de uma fileira para a outra
    const off = (r * 211) % 300;
    const seg = Math.floor((x + off) / 300);
    const cx = seg * 300 - off + 150;
    const lift = (hash2(r, seg) - 0.5) * 0.6;
    const d = sdRoundBox(x, y, z, cx, cy, TABLE_Z - 4 + lift, 149.4, PLANK / 2 - 0.7, 4, 1.6);
    add(d, (r + seg) % 2 ? S.TABLE : S.TABLE_B);
  }
  // os pregos nas pontas de cada tábua
  for (let r = row - 1; r <= row + 1; r += 1) {
    const off = (r * 211) % 300;
    const seg = Math.round((x + off) / 300);
    const ex = seg * 300 - off;
    for (const side of [-7, 7]) for (const dy of [-12, 12]) add(sdSphere(x, y, z, ex + side, r * PLANK + PLANK / 2 + dy, TABLE_Z - 1.2, 2), S.NAIL);
  }
}

// ------------------------------------------------------------------ o caderno
const BOOK = { x0: 24, y0: 62, x1: 624, y1: 362 };
const COVER_Z = 2.2;
const PAGES_Z = 4.6;
const PAPER_Z = 5.6;
/** A borda rasgada da folha de cima (um serrilhado leve, fixo). */
const ragged = (x, y) => (Math.sin(x * 0.9) * 0.35 + Math.sin(y * 1.3 + 1) * 0.35 + (hash2(Math.floor(x / 3), Math.floor(y / 3)) - 0.5) * 0.7) * 0.8;
function notebook(x, y, z) {
  const cx = (BOOK.x0 + BOOK.x1) / 2;
  const cy = (BOOK.y0 + BOOK.y1) / 2;
  const hw = (BOOK.x1 - BOOK.x0) / 2;
  const hh = (BOOK.y1 - BOOK.y0) / 2;
  // a capa de papelão, um pouco maior que as folhas
  add(sdRoundBox(x, y, z, cx + 1, cy + 1.5, COVER_Z / 2, hw + 5, hh + 5, COVER_Z / 2, 1.2), S.COVER);
  // o maço de folhas (as bordas aparecem em degraus por baixo da de cima)
  add(sdRoundBox(x, y, z, cx + 1.4, cy + 1.8, (COVER_Z + PAGES_Z) / 2, hw + 1.6, hh + 1.8, (PAGES_Z - COVER_Z) / 2, 0.8), S.PAGES);
  // a folha de cima: fina, ondulada de leve, com a borda rasgada
  const wave = Math.sin(x * 0.045 + y * 0.012) * 0.32 + Math.sin(y * 0.06 - x * 0.02) * 0.24;
  const edge = Math.max(Math.abs(x - cx) - hw, Math.abs(y - cy) - hh) + ragged(x, y);
  const sheet = Math.max(edge, Math.abs(z - (PAPER_Z + wave)) - 0.55);
  // os furos da espiral na folha
  let holes = 1e9;
  const k = Math.round((y - (BOOK.y0 + 14)) / 22);
  for (let j = k - 1; j <= k + 1; j += 1) {
    const hy = BOOK.y0 + 14 + j * 22;
    if (hy < BOOK.y0 + 8 || hy > BOOK.y1 - 8) continue;
    holes = Math.min(holes, Math.hypot((x - (BOOK.x0 + 11)) / 1.4, y - hy) - 2.8);
  }
  add(smax(sheet, -holes, 0.4), S.PAPER);
  // o fundo dos furos (o papelão lá embaixo)
  add(Math.max(holes + 0.6, Math.abs(z - (PAGES_Z - 0.4)) - 0.3), S.HOLE);
}

/** A espiral de arame: um anel por furo, passando por cima da borda esquerda. */
function spiral(x, y, z) {
  const k = Math.round((y - (BOOK.y0 + 14)) / 22);
  for (let j = k - 1; j <= k + 1; j += 1) {
    const hy = BOOK.y0 + 14 + j * 22;
    if (hy < BOOK.y0 + 8 || hy > BOOK.y1 - 8) continue;
    // o anel deitado no plano x–z (o eixo ao longo de y), um pouco torto como arame de verdade
    const ax = x - (BOOK.x0 + 2);
    const az = z - (PAPER_Z - 1.5);
    const ay = y - hy - ax * 0.14;
    const ring = Math.hypot(Math.hypot(ax / 1.2, az) - 8, ay) - 1.6;
    add(ring, S.SPIRAL);
  }
}

/** A fita crepe no alto da folha (torta, com as pontas rasgadas). */
function tape(x, y, z, cx, cy, w, h, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const lx = (x - cx) * c + (y - cy) * s;
  const ly = -(x - cx) * s + (y - cy) * c;
  const torn = Math.abs(lx) - w / 2 + (hash2(Math.floor(ly * 1.5) + 7, 3) - 0.5) * 1.6;
  const d = Math.max(torn, Math.abs(ly) - h / 2, Math.abs(z - (PAPER_Z + 1.1)) - 0.45);
  add(d - 0.15, S.TAPE);
}

/** O clipe de papel prendendo a folha (a volta de arame). */
function clip(x, y, z) {
  const cx = 558;
  const top = 50;
  const zz = PAPER_Z + 1.4;
  // as duas voltas do arame: a de fora (12 × 34) e a de dentro
  const loop = (hx, hy, r, oy) => {
    const qx = Math.abs(x - cx) - (hx - r);
    const qy = Math.abs(y - (top + hy + oy)) - (hy - r);
    const d2 = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    return Math.hypot(d2, z - zz) - 1.05;
  };
  add(Math.min(loop(6, 17, 5.5, 0), loop(3.6, 11, 3.4, 4)), S.CLIP);
}

// ------------------------------------------------------------------ a tábua da direita e a do topo
const SIDE = { x0: 650, y0: 62, x1: 876, y1: 362 };
function sideBoard(x, y, z) {
  // quatro tábuas em pé, com a fresta entre elas
  const n = 4;
  const pw = (SIDE.x1 - SIDE.x0) / n;
  const i = Math.max(0, Math.min(n - 1, Math.floor((x - SIDE.x0) / pw)));
  for (let k = Math.max(0, i - 1); k <= Math.min(n - 1, i + 1); k += 1) {
    const cx = SIDE.x0 + pw * (k + 0.5);
    const lift = (hash2(k, 9) - 0.5) * 0.5;
    add(sdRoundBox(x, y, z, cx, (SIDE.y0 + SIDE.y1) / 2, 4 + lift, pw / 2 - 0.6, (SIDE.y1 - SIDE.y0) / 2, 4, 2.2), k % 2 ? S.BOARD : S.BOARD_B);
  }
  // os pregos: em cima e embaixo de cada tábua
  for (let k = 0; k < n; k += 1) {
    const cx = SIDE.x0 + pw * (k + 0.5);
    for (const ny of [SIDE.y0 + 9, SIDE.y1 - 9]) add(sdSphere(x, y, z, cx, ny, 8.2, 2.3), S.NAIL);
  }
}

/** As correntes de latão subindo das duas argolas da tábua. */
function chains(x, y, z) {
  for (const cxx of [696, 830]) {
    if (Math.abs(x - cxx) > 8) continue;
    // a argola presa na tábua
    add(Math.hypot(Math.hypot(x - cxx, y - (SIDE.y0 + 3)) - 3.6, z - 9) - 1.1, S.CHAIN);
    // os elos, alternando deitado e de pé
    const k = Math.round((SIDE.y0 - 4 - y) / 5.2);
    for (let j = Math.max(0, k - 1); j <= Math.min(7, k + 1); j += 1) {
      const ly = SIDE.y0 - 4 - j * 5.2;
      const zz = 9 + j * 0.2;
      if (j % 2 === 0) {
        // deitado: um oval no plano x–y
        const ox = (x - cxx) / 1.6;
        add(Math.hypot(Math.hypot(ox, (y - ly) / 3.2) * 2.6 - 2.6, z - zz) - 0.95, S.CHAIN);
      } else {
        // de pé: um oval no plano y–z (de cima, um risco)
        add(Math.hypot(Math.hypot((y - ly) / 3.2, (z - zz) / 1.6) * 2.6 - 2.6, x - cxx) - 0.95, S.CHAIN);
      }
    }
  }
}

const TOP = { x0: 236, y0: 9, x1: 660, y1: 43 };
function topBoard(x, y, z) {
  add(sdRoundBox(x, y, z, (TOP.x0 + TOP.x1) / 2, (TOP.y0 + TOP.y1) / 2, 3.5, (TOP.x1 - TOP.x0) / 2, (TOP.y1 - TOP.y0) / 2, 3.5, 2), S.DARK);
  for (const nx of [TOP.x0 + 6, TOP.x1 - 6]) add(sdSphere(x, y, z, nx, TOP.y0 + 6, 7, 2), S.NAIL);
  for (const nx of [TOP.x0 + 6, TOP.x1 - 6]) add(sdSphere(x, y, z, nx, TOP.y1 - 6, 7, 2), S.NAIL);
}

// ------------------------------------------------------------------ as tampinhas e o lápis
function cap(x, y, z, cx, cy, mat) {
  const r = Math.hypot(x - cx, y - cy);
  const a = Math.atan2(y - cy, x - cx);
  // a saia franzida (21 dentes) e o tampo um pouco fundo no meio
  const skirt = 10 + Math.cos(a * 21) * 0.7 * Math.min(1, Math.max(0, (3.2 - z) / 2));
  const body = Math.max(r - skirt, Math.abs(z - 1.8) - 1.8);
  const dish = sdSphere(x, y, z, cx, cy, 3.6 + 30, 30.2);
  add(smax(body, -dish, 0.6), mat);
}

function pencil(x, y, z) {
  // o lápis torto (−8°), a ponta à esquerda
  const cx = 515;
  const cy = 388;
  const ang = (-8 * Math.PI) / 180;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const lx = (x - cx) * c + (y - cy) * s;
  const ly = -(x - cx) * s + (y - cy) * c;
  const lz = z - 4;
  const R = 4;
  // o corpo sextavado
  const a = Math.atan2(lz, ly);
  const hex = Math.hypot(ly, lz) * Math.cos(((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6) - R * 0.93;
  const body = Math.max(hex, Math.abs(lx - 3) - 34);
  add(body, S.PENCIL);
  // a ponta apontada (a madeira e, no bico, o grafite)
  const rr = R * 0.93 * Math.max(0.08, Math.min(1, (lx + 44) / 13));
  const cone = Math.max(Math.hypot(ly, lz) - rr, lx + 31, -44 - lx) * 0.8;
  add(cone, lx < -40 ? S.LEAD : S.WOOD_TIP);
  // a virola de metal e a borracha
  add(Math.max(Math.hypot(ly, lz) - R - 0.3, Math.abs(lx - 40) - 3), S.FERRULE);
  add(Math.max(Math.hypot(ly, lz) - R + 0.2, Math.abs(lx - 46.5) - 3.5) - 0.3, S.ERASER);
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  table(x, y, z);
  group(x, y, z, [BOOK.x0 - 8, BOOK.y0 - 8, -1, BOOK.x1 + 8, BOOK.y1 + 8, 8], notebook);
  group(x, y, z, [BOOK.x0 - 12, BOOK.y0, -1, BOOK.x0 + 16, BOOK.y1, 18], spiral);
  group(x, y, z, [240, 44, 3, 308, 70, 10], (a, b, c) => tape(a, b, c, 274, 57, 46, 14, (3 * Math.PI) / 180));
  group(x, y, z, [548, 44, 3, 568, 90, 10], clip);
  group(x, y, z, [SIDE.x0 - 2, SIDE.y0 - 2, -1, SIDE.x1 + 2, SIDE.y1 + 2, 12], sideBoard);
  group(x, y, z, [680, 20, 2, 846, 70, 14], chains);
  group(x, y, z, [TOP.x0 - 2, TOP.y0 - 2, -1, TOP.x1 + 2, TOP.y1 + 2, 10], topBoard);
  group(x, y, z, [596, 380, -1, 622, 406, 6], (a, b, c) => cap(a, b, c, 609, 393, S.CAP_R));
  group(x, y, z, [624, 370, -1, 650, 396, 6], (a, b, c) => cap(a, b, c, 637, 383, S.CAP_G));
  group(x, y, z, [462, 372, -1, 570, 404, 10], pencil);
  return acc.D;
}

// a sombra: a mesma cena
export const shade = scene;

export const LIGHTS = [
  // a lâmpada em cima do caderno (quente) e a luz que vaza na tábua da direita
  { p: [318, 70, 300], c: [1, 0.84, 0.58], k: 1.7, R: 330, shadow: true },
  { p: [770, 120, 260], c: [1, 0.8, 0.55], k: 0.55, R: 260, shadow: true },
];
export const AMB = [0.13, 0.11, 0.13];
export const EMISSIVE = new Set();

const COLORS = {
  [S.TABLE]: ['#4e2a12'], [S.TABLE_B]: ['#45240f'], [S.NAIL]: ['#9a968c', 'metal'], [S.COVER]: ['#6a4c30'],
  [S.PAGES]: ['#d6c094'], [S.PAPER]: ['#f2d9a2'], [S.SPIRAL]: ['#a9aeb6', 'metal'], [S.HOLE]: ['#2e2014'],
  [S.TAPE]: ['#e6d3a0'], [S.CLIP]: ['#c4c8d0', 'metal'], [S.BOARD]: ['#7a4520'], [S.BOARD_B]: ['#6e3d1b'],
  [S.DARK]: ['#43240f'], [S.CHAIN]: ['#c9902e', 'metal'], [S.CAP_R]: ['#c8281c', 'metal'], [S.CAP_G]: ['#2a7a34', 'metal'],
  [S.PENCIL]: ['#f2c230'], [S.WOOD_TIP]: ['#e8c090'], [S.LEAD]: ['#3a3a3a', 'metal'], [S.FERRULE]: ['#c0c0c8', 'metal'],
  [S.ERASER]: ['#e89a9a'], [S.LINER]: ['#8090b0'], [S.GAP]: ['#1c0d05'],
};

function decals(ctx) {
  const { W: w, H: h, mat, tone, RAMP } = ctx;
  const lineRamp = RAMP[S.LINER];
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const m = mat[p];
      if (m === S.TABLE || m === S.TABLE_B || m === S.BOARD || m === S.BOARD_B || m === S.DARK) {
        // o veio da madeira: linhas onduladas no comprido da tábua (em pé na tábua da direita)
        const along = m === S.BOARD || m === S.BOARD_B ? y : x;
        const across = m === S.BOARD || m === S.BOARD_B ? x : y;
        const g = Math.sin(across * 0.9 + Math.sin(along * 0.035 + across * 0.2) * 2.2 + hash2(Math.floor(across / 7), 5) * 6);
        if (g > 0.86) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
        else if (g < -0.93 && bayer(x, y) > 0.5) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] + 1));
      } else if (m === S.PAPER) {
        // as pautas (azuis, de 22 em 22) e a margem vermelha
        const ry = y - BOOK.y0;
        if (ry > 20 && (ry - 21) % 22 === 0) ctx.set(p, ctx.colorOf(p, lineRamp, tone[p] - 1));
        if (x === BOOK.x0 + 41 || x === BOOK.x0 + 42) ctx.set(p, ctx.colorOf(p, RAMP[S.CAP_R], tone[p] + (x === BOOK.x0 + 41 ? 0 : -1)));
        // a mancha de café no pé da folha
        const r = Math.hypot((x - (BOOK.x0 + 108)) / 1.1, y - (BOOK.y0 + 234));
        if (r < 27 && r > 24.5 && bayer(x, y) > 0.35) ctx.set(p, ctx.colorOf(p, RAMP[S.COVER], tone[p]));
        else if (r < 24.5 && bayer(x, y) > 0.82) ctx.set(p, ctx.colorOf(p, RAMP[S.PAPER], tone[p] - 1));
      } else if (m === S.TAPE) {
        // o crepe da fita: riscos finos de través
        if ((x * 2 + y * 5) % 7 === 0) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
      } else if (m === S.PAGES) {
        // as bordas das folhas embaixo (riscos finos)
        if ((x + y) % 2 === 0) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 1));
      } else if (m === S.PENCIL) {
        // as letras gravadas no lápis (um traço escuro no meio)
        const lx = (x - 515) * Math.cos(-0.14) + (y - 388) * Math.sin(-0.14);
        const ly = -(x - 515) * Math.sin(-0.14) + (y - 388) * Math.cos(-0.14);
        if (Math.abs(ly) < 0.6 && lx > -20 && lx < 10 && (Math.floor(lx) % 4 !== 0)) ctx.set(p, ctx.colorOf(p, RAMP[m], tone[p] - 2));
      }
    }
  // as marcas de copo na mesa (fora do caderno)
  for (const [cx, cy, rr] of [
    [130, 392, 17],
    [880, 392, 15],
  ])
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      const x = Math.round(cx + Math.cos(a) * rr);
      const y = Math.round(cy + Math.sin(a) * rr * 0.9);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = y * w + x;
      if ((mat[p] === S.TABLE || mat[p] === S.TABLE_B) && Math.sin(a * 3) > -0.6) ctx.set(p, ctx.colorOf(p, RAMP[mat[p]], tone[p] - 1));
    }
}

export const PIXEL = {
  colors: COLORS,
  dither: new Set([S.TABLE, S.TABLE_B, S.PAPER, S.BOARD, S.BOARD_B, S.DARK, S.COVER]),
  spec: new Set([S.NAIL, S.SPIRAL, S.CLIP, S.CHAIN, S.CAP_R, S.CAP_G, S.FERRULE, S.LEAD, S.PENCIL]),
  flats: new Set([S.PAPER, S.TABLE, S.TABLE_B, S.BOARD, S.BOARD_B, S.DARK]),
  noEdge: new Set([S.PAPER, S.TAPE]),
  decals,
  vignette: { cx: 330, cy: 200, rx: 640, ry: 330, start: 0.5, k: 1.2, max: 0.6 },
};
