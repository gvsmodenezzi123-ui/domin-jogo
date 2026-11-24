// Região 3, o Submundo do Jogo do Bicho, em volume e com a câmera alta: o escritório do bicheiro,
// o papel de parede vinho em ogiva, a sanca e o lambri de mogno com o friso dourado, o retrato do
// patrão e a tabela dos 25 bichos sob as luzes de quadro, a poltrona chesterfield de couro com o
// abajur de pé e o charuto aceso, o cofre verde com o segredo, a mesa do bicheiro com a luminária
// de banqueiro, os maços e o telefone, o tapete vermelho no taco e a luz vermelha da rua entrando
// pela persiana.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { CAM, H, LAMP, OX, W, WR, acc, group, planeAt, proj, tableD } from '../common.mjs';
import { bayer, halo } from '../pixelpass.mjs';
import { dot, floorGrid, hash2, nudge } from '../decals.mjs';

import { bichoChart, patronPortrait } from '../../../../src/components/art/landRooms.js';
import { paintKit } from '../../../../src/components/art/botecoScene.js';

export { CAM, H, OX, W, WR };
export const FLOOR = 194;

export const S = {
  PAPER_WALL: 60, CROWN: 61, GOLD: 62, WAINSCOT: 63, PANEL: 64, BASEBOARD: 65, FLOOR: 66, RUG: 67,
  FRAME_GOLD: 68, CANVAS: 69, CHART_FRAME: 70, CHART_PAPER: 71, BRASS: 72, PIC_BULB: 73,
  LEATHER: 74, LEATHER_BACK: 75, BUN: 76, SHADE_GLOW: 77, POLE: 78, ASHTRAY: 79, CIGAR: 80, EMBER: 81,
  SAFE: 82, SAFE_DOOR: 83, DIAL: 84, HANDLE: 85, HINGE: 86, DESK: 87, DESK_TOP: 88, DESK_FELT: 89,
  PULL: 90, BANKER_GLASS: 91, BANKER_BULB: 92, MONEY: 93, BAND: 94, NOTEPAD: 95, PHONE: 96, PHONE_DIAL: 97,
};

const cylY = (x, y, z, cx, cy, cz, r, h) => Math.max(Math.hypot(x - cx, z - cz) - r, Math.abs(y - cy) - h);
const cylZ = (x, y, z, cx, cy, cz, r, h) => Math.max(Math.hypot(x - cx, y - cy) - r, Math.abs(z - cz) - h);

// ------------------------------------------------------------------ a parede
const CROWN_Y = 12;
const RAIL_Y = 148;
const BASE_Y = 186;
const PANEL_W = 64;
function wall(x, y, z) {
  if (z > 30) {
    add(z - 0.5, S.PAPER_WALL);
    return;
  }
  // a sanca de mogno com o filete dourado
  if (y < CROWN_Y + 4) {
    add(sdRoundBox(x, y, z, W / 2, CROWN_Y - 14, 4.5, W + 80, 14, 4.5, 2) + Math.max(0, y - (CROWN_Y - 6)) * 0.35, S.CROWN);
    add(sdCapsule(x, y, z, -80, CROWN_Y - 3, 8.6, W + 80, CROWN_Y - 3, 8.6, 1.3), S.GOLD);
  }
  if (y < RAIL_Y - 2) {
    add(z + Math.sin(x * 0.9) * 0.04, S.PAPER_WALL);
    return;
  }
  // o friso dourado, o lambri com as almofadas e o rodapé
  add(sdCapsule(x, y, z, -80, RAIL_Y + 1, 1.6, W + 80, RAIL_Y + 1, 1.6, 2.6), S.GOLD);
  if (y > BASE_Y - 1) {
    add(sdRoundBox(x, y, z, W / 2, (BASE_Y + FLOOR) / 2 + 1, 2, W + 80, (FLOOR - BASE_Y) / 2 + 1, 2.4, 0.6), S.BASEBOARD);
    return;
  }
  const cx = ((x % PANEL_W) + PANEL_W) % PANEL_W;
  const ex = Math.min(cx - 7, PANEL_W - 7 - cx);
  const ey = Math.min(y - (RAIL_Y + 9), BASE_Y - 6 - y);
  const e = Math.min(ex, ey);
  if (e < 0) {
    add(z - 2, S.WAINSCOT);
    return;
  }
  // a almofada: o sulco, o chanfro subindo e o campo
  const h = e < 1.5 ? 1.1 : e < 5 ? 1.1 + ((e - 1.5) / 3.5) * 2 : 3.1;
  add(z - h, e < 5 ? S.WAINSCOT : S.PANEL);
}

// ------------------------------------------------------------------ o retrato e a tabela
const PORTRAIT = { x0: 308, y0: 21, x1: 372, y1: 113 };
const CHART = { x0: 531, y0: 21, x1: 707, y1: 149 };
function frames(x, y, z) {
  {
    const { x0, y0, x1, y1 } = PORTRAIT;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const ring = smax(sdRoundBox(x, y, z, cx, cy, 2.6, (x1 - x0) / 2, (y1 - y0) / 2, 2.6, 1.2), -sdRoundBox(x, y, z, cx, cy, 3, (x1 - x0) / 2 - 10, (y1 - y0) / 2 - 10, 4, 0.3), 0.4);
    // (o entalhe: o meio da moldura mais alto, as bordas caindo)
    add(ring + Math.sin(x * 0.9 + y * 0.9) * 0.15, S.FRAME_GOLD);
    add(sdRoundBox(x, y, z, cx, cy, 0.8, (x1 - x0) / 2 - 9, (y1 - y0) / 2 - 9, 0.8, 0.2), S.CANVAS);
  }
  {
    const { x0, y0, x1, y1 } = CHART;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    add(smax(sdRoundBox(x, y, z, cx, cy, 1.8, (x1 - x0) / 2, (y1 - y0) / 2, 1.8, 0.8), -sdRoundBox(x, y, z, cx, cy, 2.5, (x1 - x0) / 2 - 4, (y1 - y0) / 2 - 4, 2.5, 0.2), 0.3), S.CHART_FRAME);
    add(sdRoundBox(x, y, z, cx, cy, 0.6, (x1 - x0) / 2 - 3.5, (y1 - y0) / 2 - 3.5, 0.6, 0.2), S.CHART_PAPER);
  }
  // as luzes de quadro: o braço de latão e a barra
  for (const [lx0, lx1, ly] of [
    [PORTRAIT.x0 + 12, PORTRAIT.x1 - 12, PORTRAIT.y0 - 5],
    [CHART.x0 + 30, CHART.x1 - 30, CHART.y0 - 5],
  ]) {
    const mx = (lx0 + lx1) / 2;
    add(sdCapsule(x, y, z, mx, ly - 2, 0, mx, ly - 2, 10, 1.1), S.BRASS);
    add(sdCapsule(x, y, z, lx0, ly, 11, lx1, ly, 11, 2.3), S.BRASS);
    add(sdCapsule(x, y, z, lx0 + 2, ly + 1.6, 11.6, lx1 - 2, ly + 1.6, 11.6, 1), S.PIC_BULB);
  }
}

// ------------------------------------------------------------------ a poltrona, o abajur e o charuto
const CHAIR = { cx: 86, cz: 56 };
function chesterfield(x, y, z) {
  const { cx, cz } = CHAIR;
  // a base e o assento
  add(sdRoundBox(x, y, z, cx, 172, cz + 4, 54, 11, 33, 4), S.LEATHER);
  add(sdRoundBox(x, y, z, cx, 157.5, cz + 8, 40, 5, 27, 4.5), S.LEATHER);
  // o encosto alto capitonê, com o rolo em cima
  add(smin(sdRoundBox(x, y, z, cx, 140, cz - 26, 52, 22, 8, 6), sdCapsule(x, y, z, cx - 46, 121, cz - 26, cx + 46, 121, cz - 26, 9), 4), S.LEATHER_BACK);
  // os braços enrolados
  for (const side of [-1, 1]) {
    const ax = cx + side * 47;
    add(smin(sdRoundBox(x, y, z, ax, 150, cz + 4, 8, 16, 33, 5), sdCapsule(x, y, z, ax + side * 1.5, 135, cz - 24, ax + side * 1.5, 135, cz + 36, 9.5), 3), S.LEATHER);
  }
  // os pés de bolacha
  for (const [fx, fz] of [
    [cx - 48, cz - 24],
    [cx + 48, cz - 24],
    [cx - 48, cz + 33],
    [cx + 48, cz + 33],
  ])
    add(sdEllipsoid(x, y, z, fx, 189.5, fz, 4, 4.5, 4), S.BUN);
  // o cinzeiro no braço da direita e o charuto aceso
  const ax = cx + 48;
  add(smax(cylY(x, y, z, ax, 125, cz + 22, 6, 1.4), -cylY(x, y, z, ax, 123.6, cz + 22, 4.4, 1.4), 0.4), S.ASHTRAY);
  add(sdCapsule(x, y, z, ax - 4, 122.8, cz + 20, ax + 7, 121.5, cz + 26, 1.4), S.CIGAR);
  add(sdSphere(x, y, z, ax + 7.8, 121.4, cz + 26.4, 1.45), S.EMBER);
}
const FLAMP = { x: 178, z: 46, top: 102 };
function floorLamp(x, y, z) {
  const { x: lx, z: lz, top } = FLAMP;
  add(cylY(x, y, z, lx, FLOOR - 1.5, lz, 11, 1.5) - 0.5, S.BRASS);
  add(sdCapsule(x, y, z, lx, top + 16, lz, lx, FLOOR - 2, lz, 1.3), S.POLE);
  // a cúpula de pano (um tronco de cone) acesa por dentro, com a franja dourada
  const t = Math.max(0, Math.min(1, (y - top) / 22));
  const r = 9 + t * 7;
  const cone = Math.max(Math.abs(Math.hypot(x - lx, z - lz) - r) - 0.9, Math.abs(y - (top + 11)) - 11);
  add(cone, S.SHADE_GLOW);
  add(Math.max(Math.abs(Math.hypot(x - lx, z - lz) - 16.4) - 1, Math.abs(y - (top + 23)) - 1.4), S.GOLD);
}

// ------------------------------------------------------------------ o cofre e a mesa do bicheiro
const SAFE = { x0: 772, x1: 884, y0: 102, z1: 52 };
function safeBox(x, y, z) {
  const { x0, x1, y0, z1 } = SAFE;
  const cx = (x0 + x1) / 2;
  add(sdRoundBox(x, y, z, cx, (y0 + FLOOR - 4) / 2, z1 / 2, (x1 - x0) / 2, (FLOOR - 4 - y0) / 2, z1 / 2, 3), S.SAFE);
  // a porta, um pouco funda no corpo, e o segredo, a roda de travas e as dobradiças
  add(sdRoundBox(x, y, z, cx, (y0 + FLOOR) / 2 - 2, z1 + 0.2, (x1 - x0) / 2 - 7, (FLOOR - y0) / 2 - 11, 0.9, 1), S.SAFE_DOOR);
  const dy = y0 + 38;
  add(cylZ(x, y, z, x0 + 40, dy, z1 + 2, 9, 1.6) - 0.4, S.DIAL);
  add(cylZ(x, y, z, x0 + 40, dy, z1 + 4, 4.5, 1.2), S.DIAL);
  const hx = x0 + 76;
  for (let a = 0; a < 3; a += 1) {
    const ang = (a * Math.PI * 2) / 3 - Math.PI / 2;
    add(sdCapsule(x, y, z, hx, dy, z1 + 3, hx + Math.cos(ang) * 11, dy + Math.sin(ang) * 11, z1 + 3, 1.3), S.HANDLE);
    add(sdSphere(x, y, z, hx + Math.cos(ang) * 11, dy + Math.sin(ang) * 11, z1 + 3, 2.2), S.HANDLE);
  }
  add(cylZ(x, y, z, hx, dy, z1 + 2.5, 3.6, 1.4), S.HANDLE);
  for (const hy of [y0 + 16, FLOOR - 28]) add(cylY(x, y, z, x0 + 2, hy, z1 - 4, 2.6, 6), S.HINGE);
  for (const fx of [x0 + 6, x1 - 6]) add(sdRoundBox(x, y, z, fx, FLOOR - 2, z1 / 2, 4, 2, z1 / 2 - 4, 0.6), S.HINGE);
}
const DESK = { x0: 706, x1: 900, top: 142, z0: 72, z1: 122 };
function desk(x, y, z) {
  const { x0, x1, top, z0, z1 } = DESK;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  // o tampo com o couro verde embutido
  add(smax(sdRoundBox(x, y, z, cx, top + 3, cz, (x1 - x0) / 2, 3, (z1 - z0) / 2, 1.5), -sdRoundBox(x, y, z, cx, top - 0.4, cz, (x1 - x0) / 2 - 9, 1.2, (z1 - z0) / 2 - 7, 0.4), 0.3), S.DESK_TOP);
  add(sdRoundBox(x, y, z, cx, top + 1.4, cz, (x1 - x0) / 2 - 9, 0.6, (z1 - z0) / 2 - 7, 0.3), S.DESK_FELT);
  // o corpo com as três gavetas e os puxadores dourados
  let body = sdRoundBox(x, y, z, cx, (top + 6 + FLOOR) / 2, cz - 2, (x1 - x0) / 2 - 3, (FLOOR - top - 6) / 2, (z1 - z0) / 2 - 3, 1.2);
  const dw = (x1 - x0 - 18) / 3;
  for (let k = 0; k < 3; k += 1) {
    const dxc = x0 + 9 + dw * (k + 0.5);
    body = smax(body, -sdRoundBox(x, y, z, dxc, top + 18, z1 - 2, dw / 2 - 2, 7, 1, 0.5), 0.4);
    add(sdCapsule(x, y, z, dxc - 4, top + 18, z1 - 1.2, dxc + 4, top + 18, z1 - 1.2, 0.9), S.PULL);
  }
  body = smax(body, -sdRoundBox(x, y, z, cx, top + 37, z1 - 2, (x1 - x0) / 2 - 12, 9, 1, 0.5), 0.4);
  add(body, S.DESK);
  // a luminária de banqueiro (o vidro verde em cima, a base de latão)
  const bx = x0 + 22;
  const bz = cz - 4;
  add(cylY(x, y, z, bx, top - 1.2, bz, 7, 1.2) - 0.4, S.BRASS);
  add(sdCapsule(x, y, z, bx, top - 2, bz, bx, top - 15, bz, 1.1), S.BRASS);
  const glass = smax(sdEllipsoid(x, y, z, bx, top - 16, bz + 2, 13, 6.5, 6.5), -sdEllipsoid(x, y, z, bx, top - 15, bz + 2, 12, 5.4, 5.4), 0.3);
  add(smax(glass, y - (top - 15.5), 0.4), S.BANKER_GLASS);
  add(sdCapsule(x, y, z, bx - 7, top - 18, bz + 2, bx + 7, top - 18, bz + 2, 1.4), S.BANKER_BULB);
  // os maços de dinheiro (com a cinta) e o bloco de apostas
  for (const [mx, mz, n] of [
    [x0 + 52, cz - 6, 3],
    [x0 + 72, cz + 4, 2],
    [x0 + 66, cz - 12, 1],
  ])
    for (let k = 0; k < n; k += 1) {
      const my = top - 1.6 - k * 3.2;
      add(sdRoundBox(x, y, z, mx, my, mz, 9, 1.5, 4.5, 0.6), Math.abs(x - mx) < 2.2 ? S.BAND : S.MONEY);
    }
  add(sdRoundBox(x, y, z, x0 + 104, top - 0.9, cz + 2, 10, 0.8, 7, 0.3), S.NOTEPAD);
  // o telefone de disco
  const px = x1 - 30;
  add(sdRoundBox(x, y, z, px, top - 4, cz, 10, 4, 8, 3), S.PHONE);
  add(smin(sdCapsule(x, y, z, px - 9, top - 10, cz - 2, px + 9, top - 10, cz - 2, 2.4), Math.min(sdSphere(x, y, z, px - 10, top - 9, cz - 2, 3.4), sdSphere(x, y, z, px + 10, top - 9, cz - 2, 3.4)), 1.5), S.PHONE);
  add(cylY(x, y, z, px, top - 8.2, cz + 3, 4.2, 0.5), S.PHONE_DIAL);
}

// ------------------------------------------------------------------ o tapete
const RUG = { x0: 150, x1: 746, z0: 14, z1: 320 };
function rug(x, y, z) {
  add(sdRoundBox(x, y, z, (RUG.x0 + RUG.x1) / 2, FLOOR - 0.6, (RUG.z0 + RUG.z1) / 2, (RUG.x1 - RUG.x0) / 2, 0.6, (RUG.z1 - RUG.z0) / 2, 0.4), S.RUG);
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  wall(x, y, z);
  add(FLOOR - y, S.FLOOR);
  group(x, y, z, [RUG.x0 - 2, FLOOR - 3, RUG.z0 - 2, RUG.x1 + 2, FLOOR + 1, RUG.z1 + 2], rug);
  group(x, y, z, [PORTRAIT.x0 - 4, 10, 0, CHART.x1 + 4, CHART.y1 + 2, 15], frames);
  group(x, y, z, [CHAIR.cx - 64, 108, CHAIR.cz - 38, CHAIR.cx + 64, FLOOR, CHAIR.cz + 42], chesterfield);
  group(x, y, z, [FLAMP.x - 19, FLAMP.top - 2, FLAMP.z - 19, FLAMP.x + 19, FLOOR, FLAMP.z + 19], floorLamp);
  group(x, y, z, [SAFE.x0 - 4, SAFE.y0 - 4, 0, SAFE.x1 + 4, FLOOR, SAFE.z1 + 8], safeBox);
  group(x, y, z, [DESK.x0 - 4, DESK.top - 24, DESK.z0 - 4, DESK.x1 + 4, FLOOR, DESK.z1 + 4], desk);
  return acc.D;
}
export const shade = (x, y, z) => Math.min(scene(x, y, z), tableD(x, y, z));

// ------------------------------------------------------------------ as luzes
export const LIGHTS = [
  { p: LAMP, c: [1, 0.8, 0.55], k: 2.2, R: 240, shadow: true },
  // o abajur de pé, morno
  { p: [FLAMP.x, FLAMP.top + 14, FLAMP.z], c: [1, 0.66, 0.36], k: 2, R: 100, shadow: true, max: 380 },
  // as luzes de quadro
  { p: [(PORTRAIT.x0 + PORTRAIT.x1) / 2, PORTRAIT.y0 + 2, 16], c: [1, 0.86, 0.6], k: 1.2, R: 45, max: 180 },
  { p: [(CHART.x0 + CHART.x1) / 2, CHART.y0 + 2, 16], c: [1, 0.86, 0.6], k: 1.3, R: 70, max: 230 },
  // a luminária de banqueiro (verde) e o reflexo morno no cofre
  { p: [DESK.x0 + 22, DESK.top - 10, (DESK.z0 + DESK.z1) / 2 + 4], c: [0.8, 1, 0.66], k: 1.6, R: 55, max: 240 },
];
export const AMB = [0.12, 0.065, 0.06];
export const EMISSIVE = new Set([S.PIC_BULB, S.SHADE_GLOW, S.EMBER, S.BANKER_BULB]);

// ------------------------------------------------------------------ a pixel art
const C = {
  [S.PAPER_WALL]: ['#6a1420'], [S.CROWN]: ['#4a1c0c'], [S.GOLD]: ['#c8962c', 'metal'], [S.WAINSCOT]: ['#4a1c0c'],
  [S.PANEL]: ['#5a2410'], [S.BASEBOARD]: ['#2c0e06'], [S.FLOOR]: ['#5a3418'], [S.RUG]: ['#6e1612'],
  [S.FRAME_GOLD]: ['#c8962c', 'metal'], [S.CANVAS]: ['#2a1a10'], [S.CHART_FRAME]: ['#24100a'], [S.CHART_PAPER]: ['#e8d8b0'],
  [S.BRASS]: ['#b8862c', 'metal'], [S.PIC_BULB]: ['#fff2c0', 'glow'], [S.LEATHER]: ['#8a4a26'], [S.LEATHER_BACK]: ['#7a3e1e'],
  [S.BUN]: ['#2c0e06'], [S.SHADE_GLOW]: ['#f0a050', 'glow'], [S.POLE]: ['#8a6420', 'metal'], [S.ASHTRAY]: ['#8e9c9e', 'metal'],
  [S.CIGAR]: ['#5a3418'], [S.EMBER]: ['#ff8a32', 'glow'], [S.SAFE]: ['#1e2c26', 'metal'], [S.SAFE_DOOR]: ['#22322a', 'metal'],
  [S.DIAL]: ['#c8a040', 'metal'], [S.HANDLE]: ['#c8a040', 'metal'], [S.HINGE]: ['#3a4a42', 'metal'], [S.DESK]: ['#4a1c0c'],
  [S.DESK_TOP]: ['#5a2410'], [S.DESK_FELT]: ['#1e3a26'], [S.PULL]: ['#e8c060', 'metal'], [S.BANKER_GLASS]: ['#2a8a4a', 'metal'],
  [S.BANKER_BULB]: ['#f0ffd0', 'glow'], [S.MONEY]: ['#5a8a52'], [S.BAND]: ['#e8dcc0'], [S.NOTEPAD]: ['#e8e0c8'],
  [S.PHONE]: ['#18141a', 'metal'], [S.PHONE_DIAL]: ['#c8c0b0', 'metal'],
};

// as pinturas antigas (o retrato e a tabela), coladas na tela e no papel, em 2×
function paintOld(fn, w, h) {
  const b = paintKit.buffer(w, h);
  fn(b);
  return b;
}
const PORTRAIT_PX = paintOld((b) => patronPortrait(b, 0, 0, 2), 64, 92);
const CHART_PX = paintOld((b) => bichoChart(b, 4, 4, 2), 180, 132);

function pasteOld(ctx, src, sx0, sy0, sw, sh, dx0, dy0, allow) {
  for (let y = 0; y < sh; y += 1)
    for (let x = 0; x < sw; x += 1) {
      const i = ((sy0 + y) * src.w + sx0 + x) * 4;
      if (!src.data[i + 3]) continue;
      const X = Math.round(dx0 + x);
      const Y = Math.round(dy0 + y);
      if (X < 0 || Y < 0 || X >= ctx.W || Y >= ctx.H) continue;
      const p = Y * ctx.W + X;
      if (!allow.has(ctx.mat[p])) continue;
      // (a luz da sala pesa em cima da pintura: o tom do pixel do render vira um fator)
      const k = [0.42, 0.55, 0.68, 0.8, 0.92, 1, 1.08][Math.max(0, Math.min(6, ctx.tone[p]))];
      ctx.set(p, [src.data[i] * k, src.data[i + 1] * k, src.data[i + 2] * k]);
    }
}

function decals(ctx) {
  const { W: w, H: h, mat } = ctx;
  // o papel de parede em ogiva: as curvas douradas apagadas e a florzinha no meio de cada gomo
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.PAPER_WALL) continue;
      const row = Math.floor(y / 36);
      const ox = x + (row % 2 ? 14 : 0);
      const a = (((ox % 28) + 28) % 28) - 14;
      const b = (((y % 36) + 36) % 36) - 18;
      const curve = 12.5 * Math.cos((Math.PI * b) / 36);
      const onCurve = Math.abs(Math.abs(a) - curve) < 0.9;
      const flower = Math.abs(a) + Math.abs(b + 1) < 3 && (Math.abs(a) === 0 || Math.abs(b + 1) === 0);
      if (onCurve || flower) ctx.set(p, ctx.colorOf(p, ctx.RAMP[S.GOLD], ctx.tone[p] - 2));
      else if ((x + y) % 2 === 0 && Math.abs(a) < curve - 3 && bayer(x, y) > 0.8) nudge(ctx, p, 1);
    }
  // o veio do mogno
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const m = mat[p];
      if (m !== S.WAINSCOT && m !== S.PANEL && m !== S.DESK && m !== S.CROWN) continue;
      const g = Math.sin(y * 0.9 + Math.sin(x * 0.05) * 4) + Math.sin(y * 0.33 + x * 0.02) * 0.6;
      if (g > 1.25) nudge(ctx, p, -1);
    }
  // o taco (em espinha de peixe, tábuas de 12 × 48) e o tapete persa
  floorGrid(
    ctx,
    new Set([S.FLOOR]),
    FLOOR,
    12,
    48,
    (p, seam, col, run, wx, wz, x, y) => {
      const n = hash2(col, run);
      let t = ctx.tone[p] + (seam ? -2 : n > 0.7 && bayer(x, y) > 0.5 ? 1 : n < 0.2 && bayer(x, y) > 0.5 ? -1 : 0);
      if (wz < 6) t -= 1;
      ctx.set(p, ctx.colorOf(p, ctx.RAMP[S.FLOOR], t));
    },
    (col) => (col % 2 ? 24 : 0),
  );
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.RUG) continue;
      const [wx, wz] = planeAt(x + 0.5, y + 0.5, FLOOR - 1.2);
      const u = wx - RUG.x0;
      const v = wz - RUG.z0;
      const e = Math.min(u, v, RUG.x1 - wx, RUG.z1 - wz);
      let c = null;
      if (e < 3) c = [214, 176, 96];
      else if (e < 12) c = (Math.floor(u / 6) + Math.floor(v / 6)) % 2 ? [32, 22, 48] : [190, 150, 70];
      else if (e < 15) c = [214, 176, 96];
      else {
        // o campo vinho com os losangos
        const du = (((u - 15) % 40) + 40) % 40 - 20;
        const dv = (((v - 15) % 40) + 40) % 40 - 20;
        const dd = Math.abs(du) + Math.abs(dv);
        if (Math.abs(dd - 14) < 1.3) c = [214, 176, 96];
        else if (dd < 6) c = [32, 22, 48];
      }
      if (c) {
        const k = [0.42, 0.55, 0.68, 0.8, 0.92, 1, 1.08][Math.max(0, Math.min(6, ctx.tone[p]))];
        ctx.set(p, [c[0] * k, c[1] * k, c[2] * k]);
      }
    }
  // o retrato e a tabela (as pinturas antigas, em 2×)
  {
    const [ox, oy] = proj(PORTRAIT.x0 + 10, PORTRAIT.y0 + 10, 1.6);
    pasteOld(ctx, PORTRAIT_PX, 8, 8, 44, 72, ox - 1, oy - 1, new Set([S.CANVAS]));
    const [cx, cy] = proj(CHART.x0 + 4, CHART.y0 + 4, 1.2);
    pasteOld(ctx, CHART_PX, 4, 4, 168, 120, cx, cy, new Set([S.CHART_PAPER]));
  }
  // o capitonê do encosto: os botões e os vincos em losango
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.LEATHER_BACK) continue;
      const r = Math.floor(y / 7);
      const bx = (((x + (r % 2 ? 4 : 0)) % 8) + 8) % 8;
      const by = ((y % 7) + 7) % 7;
      if (bx === 4 && by === 3) ctx.set(p, [28, 6, 4]);
      else if (Math.abs(bx - 4) + Math.abs(by - 3) === 3) nudge(ctx, p, -1);
      else if (Math.abs(bx - 4) + Math.abs(by - 3) === 1) nudge(ctx, p, 1);
    }
  // o filete dourado da porta do cofre, os números do segredo e o brasão
  {
    const [fx0, fy0] = proj(SAFE.x0 + 12, SAFE.y0 + 14, SAFE.z1 + 1.1);
    const [fx1, fy1] = proj(SAFE.x1 - 12, FLOOR - 16, SAFE.z1 + 1.1);
    const onDoor = (x, y, c) => {
      const q = Math.round(y) * w + Math.round(x);
      if (mat[q] === S.SAFE_DOOR) ctx.set(q, c);
    };
    for (let x = Math.round(fx0); x <= Math.round(fx1); x += 1) {
      onDoor(x, fy0, [200, 160, 64]);
      onDoor(x, fy1, [176, 138, 58]);
    }
    for (let y = Math.round(fy0); y <= Math.round(fy1); y += 1) {
      onDoor(fx0, y, [200, 160, 64]);
      onDoor(fx1, y, [176, 138, 58]);
    }
    const [ex, ey] = proj((SAFE.x0 + SAFE.x1) / 2, SAFE.y0 + 18, SAFE.z1 + 1.1);
    for (let k = -6; k <= 6; k += 1) dot(ctx, ex + k, ey, [232, 192, 96]);
  }
  // as notas: a tinta verde com o retrato claro no meio
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] === S.NOTEPAD && y % 3 === 0) ctx.set(p, [60, 80, 150]);
      if (mat[p] === S.MONEY && (x + y) % 5 === 0) nudge(ctx, p, 1);
    }
}

const BLIND_ON = new Set([S.PAPER_WALL, S.WAINSCOT, S.PANEL, S.GOLD, S.FLOOR, S.RUG, S.CROWN, S.BASEBOARD]);
function post(ctx) {
  const { W: w, H: h, img, mat } = ctx;
  // a luz vermelha da rua pela persiana, de lado, riscando a parede e o chão da esquerda
  for (let y = 10; y < Math.min(h, 300); y += 1)
    for (let x = 0; x < 400 + OX; x += 1) {
      const p = y * w + x;
      if (!img[p * 4 + 3] || !BLIND_ON.has(mat[p])) continue;
      const wx = Math.max(0, x - OX);
      const yy = y - wx * 0.42;
      if (((Math.floor(yy / 9) % 2) + 2) % 2) continue;
      const a = 0.32 * (1 - wx / 400) * Math.min(1, (y - 10) / 30);
      if (a < bayer(x, y) * 0.5) continue;
      img[p * 4] = Math.min(255, img[p * 4] + 255 * a * 0.7);
      img[p * 4 + 1] = Math.min(255, img[p * 4 + 1] + 58 * a * 0.4);
      img[p * 4 + 2] = Math.min(255, img[p * 4 + 2] + 42 * a * 0.4);
    }
  // a fumaça do charuto subindo
  const [ex, ey] = proj(CHAIR.cx + 55.8, 121.4, CHAIR.cz + 26.4);
  for (let k = 0; k < 46; k += 1) {
    const x = ex + Math.sin(k * 0.19) * 3 * (k / 46) + k * 0.12;
    const y = ey - 2 - k;
    const p = Math.round(y) * w + Math.round(x);
    if (bayer(Math.round(x), Math.round(y)) > 0.7 * (1 - k / 46)) continue;
    for (let c = 0; c < 3; c += 1) img[p * 4 + c] = img[p * 4 + c] + ([200, 184, 176][c] - img[p * 4 + c]) * 0.45;
  }
  halo(ctx, ex, ey, 6, [255, 138, 50], 0.6, 2);
  const [lx, ly] = proj(FLAMP.x, FLAMP.top + 12, FLAMP.z);
  halo(ctx, lx, ly, 52, [255, 192, 112], 0.45, 1.4);
  const [bx, by] = proj(DESK.x0 + 22, DESK.top - 14, (DESK.z0 + DESK.z1) / 2 - 2);
  halo(ctx, bx, by + 4, 34, [154, 255, 154], 0.32, 1.6);
  for (const [x0, x1, y0] of [
    [PORTRAIT.x0 + 12, PORTRAIT.x1 - 12, PORTRAIT.y0 - 5],
    [CHART.x0 + 30, CHART.x1 - 30, CHART.y0 - 5],
  ]) {
    const [px, py] = proj((x0 + x1) / 2, y0 + 2, 12);
    halo(ctx, px, py, (x1 - x0) * 0.55, [255, 240, 192], 0.3, 2.4);
  }
}

export const PIXEL = {
  colors: C,
  dither: new Set([S.FLOOR, S.PAPER_WALL, S.RUG, S.WAINSCOT, S.PANEL, S.SAFE, S.SAFE_DOOR, S.LEATHER, S.LEATHER_BACK, S.DESK_FELT]),
  spec: new Set([S.GOLD, S.FRAME_GOLD, S.BRASS, S.POLE, S.SAFE, S.DIAL, S.HANDLE, S.PULL, S.BANKER_GLASS, S.PHONE, S.ASHTRAY, S.LEATHER, S.DESK_TOP]),
  flats: new Set([S.FLOOR, S.PAPER_WALL, S.RUG, S.WAINSCOT, S.PANEL]),
  noEdge: new Set([S.PAPER_WALL, S.FLOOR, S.WAINSCOT, S.PANEL]),
  decals,
  post,
  vignette: { start: 0.5, k: 1.5, max: 0.85 },
};
