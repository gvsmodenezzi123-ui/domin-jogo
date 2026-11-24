// Região 2, o Clube da Sinuca Clandestino, em volume e com a câmera alta (a mesma perspectiva do
// tampo): o porão de tijolo com a laje e os canos em cima, o neon SINUCA com a bola 8, o cartaz
// do torneio, o marcador de bolinhas, a régua dos tacos (um faltando, um quebrado) com a arandela
// de gaiola, a porta de ferro com a SAÍDA acesa, o parapeito com as long necks e o cinzeiro, e as
// duas mesas de sinuca dos lados, cada uma sob a sua luminária de três cúpulas, na fumaça.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { CAM, H, LAMP, OX, W, WR, acc, group, proj, tableD } from '../common.mjs';
import { beam, halo } from '../pixelpass.mjs';
import { dot, floorGrid, hash2, neonRing, neonText, nudge, smoke, stroke, textAt, textWidth } from '../decals.mjs';

export { CAM, H, OX, W, WR };
export const FLOOR = 194;

export const S = {
  BRICK: 60, BRICK_D: 61, BRICK_L: 62, MORTAR: 63, SLAB: 64, PIPE: 65, BRACKET: 66, FLOOR: 67,
  DOOR: 68, DOOR_FRAME: 69, GLASS: 70, BAR: 71, SIGN_RED: 72, SIGN_BOX: 73, RACK: 74, CUE: 75,
  CUE_BUTT: 76, CUE_TIP: 77, FERRULE: 78, CHALK: 79, BOARD: 80, WIRE: 81, BEAD: 82, BEAD_R: 83,
  LAMP_ARM: 84, BULB: 85, CAGE: 86, ACRYLIC: 87, POSTER: 88, POSTER_RED: 89, TAPE: 90, LEDGE: 91,
  BOTTLE: 92, BOTTLE_G: 93, LABEL: 94, CAP: 95, ASHTRAY: 96, EMBER: 97, CIG: 98, RAIL: 99,
  CUSHION: 100, FELT: 101, POCKET: 102, CABINET: 103, BALL_Y: 104, BALL_R: 105, BALL_W: 106,
  BALL_B: 107, BALL_K: 108, BALL_O: 109, BALL_P: 110, SHADE: 111, SHADE_RIM: 112, CHAIN: 113,
  LAMPBAR: 114, LAMPBULB: 115, TRIANGLE: 116, BOARD_BACK: 117, CORD: 118, OUTLET: 119, PLATE: 120,
};

const cylY = (x, y, z, cx, cy, cz, r, h) => Math.max(Math.hypot(x - cx, z - cz) - r, Math.abs(y - cy) - h);

// ------------------------------------------------------------------ a parede de tijolo
const WALL_TOP = 14;
const BW = 18;
const BH = 8;
const DOOR = { x0: 140, x1: 196, y0: 92 };
function wall(x, y, z) {
  if (z > 30) {
    add(z - 0.5, S.BRICK);
    return;
  }
  // o vão da porta (a porta mora mais funda, no batente)
  if (x > DOOR.x0 - 0.5 && x < DOOR.x1 + 0.5 && y > DOOR.y0 - 0.5) return;
  const row = Math.floor((y - WALL_TOP) / BH);
  const off = row & 1 ? BW / 2 : 0;
  const col = Math.floor((x + off) / BW);
  const fx = x + off - col * BW;
  const fy = y - WALL_TOP - row * BH;
  const e = Math.min(fx, BW - fx, fy, BH - fy);
  if (e < 1.3) {
    add(z + 1.5 - e * 0.45, S.MORTAR);
    return;
  }
  const h = hash2(col, row);
  const face = h * 0.7 - Math.max(0, 2.4 - e) * 0.3 + Math.sin(x * 1.7 + y * 2.3) * 0.07 + Math.sin(x * 0.53 - y * 1.1) * 0.06;
  add(z - face, h < 0.22 ? S.BRICK_D : h > 0.8 ? S.BRICK_L : S.BRICK);
}

// a laje do teto com os dois canos e as braçadeiras
function ceiling(x, y, z) {
  add(sdRoundBox(x, y, z, W / 2, 0, 4.5, W + 80, 14, 4.5, 1.5), S.SLAB);
  add(sdCapsule(x, y, z, -80, 4, 13, W + 80, 4, 13, 3.4), S.PIPE);
  add(sdCapsule(x, y, z, -80, 11.5, 10, W + 80, 11.5, 10, 2), S.PIPE);
  const bx = Math.round((x - 30) / 92) * 92 + 30;
  add(sdRoundBox(x, y, z, bx, 7.5, 11, 1.6, 8.5, 5.4, 0.6), S.BRACKET);
}

// ------------------------------------------------------------------ a porta de ferro com a SAÍDA
function door(x, y, z) {
  const cx = (DOOR.x0 + DOOR.x1) / 2;
  const hw = (DOOR.x1 - DOOR.x0) / 2;
  const cy = (DOOR.y0 + FLOOR) / 2;
  const hh = (FLOOR - DOOR.y0) / 2;
  // o batente de ferro, saltado da parede
  const frame = sdRoundBox(x, y, z, cx, cy - 1.5, 1.2, hw + 3.5, hh + 3.5, 1.8, 0.6);
  add(smax(frame, -sdRoundBox(x, y, z, cx, cy + 1, 1.2, hw, hh + 1, 4, 0.2), 0.4), S.DOOR_FRAME);
  // a folha, funda no batente, com o vidro aramado, a barra antipânico e a chapa de baixo
  let leaf = sdRoundBox(x, y, z, cx, cy, -1.6, hw - 0.3, hh, 0.9, 0.3);
  const win = sdRoundBox(x, y, z, cx, DOOR.y0 + 18, -0.9, hw - 9, 10, 0.8, 0.4);
  leaf = smax(leaf, -win, 0.3);
  add(leaf, S.DOOR);
  add(sdRoundBox(x, y, z, cx, DOOR.y0 + 18, -1.8, hw - 9, 10, 0.3, 0.2), S.GLASS);
  add(sdCapsule(x, y, z, DOOR.x0 + 6, DOOR.y0 + 50, 1.6, DOOR.x1 - 6, DOOR.y0 + 50, 1.6, 1.5), S.BAR);
  for (const bx of [DOOR.x0 + 6, DOOR.x1 - 6]) add(sdRoundBox(x, y, z, bx, DOOR.y0 + 50, 0, 1.8, 3, 1.6, 0.5), S.BAR);
  add(sdRoundBox(x, y, z, cx, FLOOR - 7, -0.6, hw - 2, 6, 0.3, 0.3), S.PLATE);
  // a placa de SAÍDA acesa em cima
  add(sdRoundBox(x, y, z, cx, DOOR.y0 - 14, 2.2, 22, 8, 2.2, 0.8), S.SIGN_BOX);
  add(sdRoundBox(x, y, z, cx, DOOR.y0 - 14, 4.6, 20, 6, 0.4, 0.3), S.SIGN_RED);
}

// ------------------------------------------------------------------ a régua dos tacos e a arandela
const RACK = { x0: 210, x1: 338, top: 89, bottom: 186 };
function cueRack(x, y, z) {
  const cx = (RACK.x0 + RACK.x1) / 2;
  const hw = (RACK.x1 - RACK.x0) / 2;
  add(sdRoundBox(x, y, z, cx, RACK.top, 5, hw, 3, 5, 1), S.RACK);
  add(sdRoundBox(x, y, z, cx, RACK.bottom, 5, hw, 3.5, 5, 1), S.RACK);
  for (let k = 0; k < 7; k += 1) {
    if (k === 2) continue;
    const qx = RACK.x0 + 8 + k * 19;
    if (Math.abs(x - qx) > 16) continue;
    if (k === 5) {
      // o quebrado: pendurado torto pelo cordão, a ponta lascada
      add(sdRoundCone(x, y, z, qx, RACK.top - 4, 7, qx + 13, 150, 8.5, 1.1, 1.6), y > 146 ? S.CUE_BUTT : S.CUE);
      add(sdCapsule(x, y, z, qx, RACK.top - 7, 6, qx, RACK.top - 3, 7, 0.5), S.WIRE);
      continue;
    }
    const butt = RACK.top + 46 + (k % 3) * 5;
    const m = y < RACK.top - 9.5 ? S.CUE_TIP : y < RACK.top - 8 ? S.FERRULE : y < butt ? S.CUE : S.CUE_BUTT;
    add(sdRoundCone(x, y, z, qx, RACK.top - 11, 6.5, qx, RACK.bottom + 1, 6.5, 1.05, 1.9), m);
  }
  // o giz azul em cima da régua
  add(sdRoundBox(x, y, z, RACK.x1 - 8, RACK.top - 5.2, 6, 2.4, 2.2, 2.4, 0.5), S.CHALK);
}
function sconce(x, y, z) {
  const cx = 275;
  add(sdCapsule(x, y, z, cx, 54, 0, cx, 54, 10, 1.3), S.LAMP_ARM);
  add(sdRoundBox(x, y, z, cx, 57.5, 10, 2.2, 2.6, 2.2, 0.6), S.LAMP_ARM);
  add(sdEllipsoid(x, y, z, cx, 65, 10, 3.2, 4.4, 3.2), S.BULB);
  // a gaiola de arame
  for (const [dx, dz] of [
    [4.8, 0],
    [-4.8, 0],
    [0, 4.8],
    [0, -4.8],
  ])
    add(sdCapsule(x, y, z, cx + dx, 59, 10 + dz, cx + dx * 0.8, 71, 10 + dz * 0.8, 0.45), S.CAGE);
  for (const ry of [59.5, 71])
    add(Math.max(Math.abs(Math.hypot(x - cx, z - 10) - (ry < 65 ? 4.8 : 3.9)) - 0.45, Math.abs(y - ry) - 0.45), S.CAGE);
}

// ------------------------------------------------------------------ o marcador de bolinhas
const BEADS = { x0: 296, x1: 370, y0: 16, y1: 42 };
function beadBoard(x, y, z) {
  const cx = (BEADS.x0 + BEADS.x1) / 2;
  const cy = (BEADS.y0 + BEADS.y1) / 2;
  const hw = (BEADS.x1 - BEADS.x0) / 2;
  const hh = (BEADS.y1 - BEADS.y0) / 2;
  add(smax(sdRoundBox(x, y, z, cx, cy, 2.6, hw, hh, 2.6, 1), -sdRoundBox(x, y, z, cx, cy, 4.5, hw - 2.6, hh - 2.6, 3, 0.4), 0.4), S.BOARD);
  add(sdRoundBox(x, y, z, cx, cy, 0.7, hw - 1, hh - 1, 0.7, 0.3), S.BOARD_BACK);
  for (const [wy, left] of [
    [cy - 4.5, 6],
    [cy + 4.5, 3],
  ]) {
    if (Math.abs(y - wy) > 6) continue;
    add(sdCapsule(x, y, z, BEADS.x0 + 2, wy, 3.2, BEADS.x1 - 2, wy, 3.2, 0.45), S.WIRE);
    for (let k = 0; k < 15; k += 1) {
      const bx = k < left ? BEADS.x0 + 6 + k * 4.4 : BEADS.x1 - 6 - (14 - k) * 4.4;
      if (Math.abs(x - bx) > 4) continue;
      add(sdEllipsoid(x, y, z, bx, wy, 3.2, 2, 2.3, 2), k % 5 === 4 ? S.BEAD_R : S.BEAD);
    }
  }
}

// ------------------------------------------------------------------ o neon, o cartaz e o parapeito
const NEON = { x0: 530, x1: 738, y0: 18, y1: 70 };
function neonBack(x, y, z) {
  const cx = (NEON.x0 + NEON.x1) / 2;
  const cy = (NEON.y0 + NEON.y1) / 2;
  add(sdRoundBox(x, y, z, cx, cy, 1.8, (NEON.x1 - NEON.x0) / 2, (NEON.y1 - NEON.y0) / 2, 1.2, 1.4), S.ACRYLIC);
  for (const [sx, sy] of [
    [NEON.x0 + 6, NEON.y0 + 6],
    [NEON.x1 - 6, NEON.y0 + 6],
    [NEON.x0 + 6, NEON.y1 - 6],
    [NEON.x1 - 6, NEON.y1 - 6],
  ])
    add(sdCapsule(x, y, z, sx, sy, 2.5, sx, sy, 4.2, 1.5), S.BRACKET);
  // o fio do neon descendo até a tomada, meio torto
  const wx = NEON.x1 - 10 + Math.sin(y * 0.16) * 2.2;
  if (y > NEON.y1 && y < 120) add(Math.hypot(x - wx, z - 1.6) - 1.1, S.CORD);
  add(sdRoundBox(x, y, z, NEON.x1 - 10, 123, 1.4, 4, 5, 1.4, 0.8), S.OUTLET);
}
const POSTER = { x0: 636, x1: 690, y0: 80, y1: 146 };
function poster(x, y, z) {
  const cx = (POSTER.x0 + POSTER.x1) / 2;
  const cy = (POSTER.y0 + POSTER.y1) / 2;
  // a ponta de baixo descolando (dobra para frente)
  const curl = Math.max(0, (x - (POSTER.x1 - 12)) + (y - (POSTER.y1 - 12))) * 0.22;
  add(sdRoundBox(x, y, z - curl, cx, cy, 0.5, (POSTER.x1 - POSTER.x0) / 2, (POSTER.y1 - POSTER.y0) / 2, 0.35, 0.2), y < POSTER.y0 + 16 ? S.POSTER_RED : S.POSTER);
  for (const tx of [POSTER.x0 + 2, POSTER.x1 - 2]) add(sdRoundBox(x, y, z, tx, POSTER.y0 + 0.5, 1, 4, 2, 0.3, 0.2), S.TAPE);
}
const LEDGE = { x0: 520, x1: 920, y: 150 };
function ledge(x, y, z) {
  add(sdRoundBox(x, y, z, (LEDGE.x0 + LEDGE.x1) / 2, LEDGE.y + 1.5, 7, (LEDGE.x1 - LEDGE.x0) / 2, 2.5, 7, 1), S.LEDGE);
  for (const bx of [560, 680, 800, 900]) {
    add(sdRoundBox(x, y, z, bx, LEDGE.y + 8, 1.4, 1.3, 5.5, 1.4, 0.4), S.BRACKET);
    add(sdRoundBox(x, y, z, bx, LEDGE.y + 5, 6, 1.3, 1.3, 5.5, 0.4), S.BRACKET);
  }
  const top = LEDGE.y - 1;
  for (const [bx, green] of [
    [552, false],
    [564, true],
    [771, false],
    [784, false],
  ]) {
    const body = sdRoundBox(x, y, z, bx, top - 7.5, 7, 3, 7.5, 3, 2.4);
    add(smin(body, sdRoundCone(x, y, z, bx, top - 14, 7, bx, top - 24, 7, 2.6, 1.05), 2), y > top - 11 && y < top - 4 ? S.LABEL : green ? S.BOTTLE_G : S.BOTTLE);
    add(sdRoundBox(x, y, z, bx, top - 24.5, 7, 1.4, 0.9, 1.4, 0.3), S.CAP);
  }
  // o cinzeiro com o cigarro aceso
  const ax = 806;
  add(smax(cylY(x, y, z, ax, top - 1.2, 8, 5.5, 1.2), -cylY(x, y, z, ax, top - 2.4, 8, 4, 1.2), 0.4), S.ASHTRAY);
  add(sdCapsule(x, y, z, ax - 3, top - 2.4, 8.5, ax + 6, top - 3.4, 10, 0.75), S.CIG);
  add(sdSphere(x, y, z, ax + 6.6, top - 3.5, 10.2, 0.95), S.EMBER);
}

// ------------------------------------------------------------------ as mesas de sinuca e as luminárias
const POOL_TOP = 140;
const POOL = [
  {
    cx: 32,
    cz: 78,
    len: 150,
    dep: 70,
    balls: [
      [0.62, 0.42, S.BALL_Y],
      [0.71, 0.66, S.BALL_R],
      [0.8, 0.3, S.BALL_W],
      [0.88, 0.58, S.BALL_B],
      [0.47, 0.75, S.BALL_O],
    ],
    cue: [
      [0.36, 0.86],
      [0.96, 0.2],
    ],
  },
  {
    cx: 848,
    cz: 78,
    len: 150,
    dep: 70,
    balls: [
      [0.12, 0.35, S.BALL_K],
      [0.22, 0.62, S.BALL_O],
      [0.3, 0.4, S.BALL_P],
      [0.17, 0.78, S.BALL_W],
    ],
    cue: null,
  },
];
function poolTable(x, y, z, T) {
  const { cx, cz, len, dep } = T;
  const top = POOL_TOP;
  const hl = len / 2;
  const hd = dep / 2;
  const pockets = [
    [cx - hl, cz - hd],
    [cx, cz - hd - 1.5],
    [cx + hl, cz - hd],
    [cx - hl, cz + hd],
    [cx, cz + hd + 1.5],
    [cx + hl, cz + hd],
  ];
  let holes = 1e9;
  for (const [px, pz] of pockets) holes = Math.min(holes, Math.hypot(x - px, z - pz) - 4.4);
  // a tabela de madeira (com os buracos das caçapas) e a borracha verde por dentro
  let rail = smax(sdRoundBox(x, y, z, cx, top - 1.5, cz, hl + 9, 3, hd + 9, 2), -sdRoundBox(x, y, z, cx, top - 3, cz, hl + 1, 4, hd + 1, 0.5), 0.6);
  rail = smax(rail, -Math.max(holes, Math.abs(y - top) - 6), 0.4);
  add(rail, S.RAIL);
  let cush = smax(sdRoundBox(x, y, z, cx, top - 1.2, cz, hl + 1.5, 1.6, hd + 1.5, 0.8), -sdRoundBox(x, y, z, cx, top - 1.2, cz, hl - 2.2, 3, hd - 2.2, 0.5), 0.5);
  cush = smax(cush, -holes, 0.3);
  add(cush, S.CUSHION);
  add(smax(sdRoundBox(x, y, z, cx, top + 1.5, cz, hl, 1.5, hd, 0.3), -holes, 0.3), S.FELT);
  // as caçapas: o buraco preto, um pouco abaixo da tabela
  add(Math.max(holes + 0.2, Math.abs(y - (top + 1.5)) - 1.6), S.POCKET);
  // o gabinete e os pés
  add(sdRoundBox(x, y, z, cx, top + 9, cz, hl + 6, 6, hd + 6, 1.5), S.CABINET);
  for (const [lx, lz] of [
    [cx - hl + 4, cz - hd + 4],
    [cx + hl - 4, cz - hd + 4],
    [cx - hl + 4, cz + hd - 4],
    [cx + hl - 4, cz + hd - 4],
  ])
    add(sdRoundBox(x, y, z, lx, (top + 15 + FLOOR) / 2, lz, 5, (FLOOR - top - 15) / 2, 5, 1.5), S.CABINET);
  // as bolas e o taco deitado
  for (const [fx, fz, m] of T.balls) {
    const bx = cx - hl + fx * len;
    const bz = cz - hd + fz * dep;
    add(sdSphere(x, y, z, bx, top - 2.7, bz, 2.7), m);
  }
  if (T.cue) {
    const [[ax, az], [bx2, bz2]] = T.cue;
    add(sdRoundCone(x, y, z, cx - hl + ax * len, top - 5.8, cz - hd + az * dep, cx - hl + bx2 * len, top - 1.2, cz - hd + bz2 * dep, 1.6, 0.9), S.CUE);
  }
}
function poolLamp(x, y, z, T) {
  const { cx, cz } = T;
  const barY = 58;
  for (const chx of [cx - 46, cx + 46]) add(sdCapsule(x, y, z, chx, -60, cz, chx, barY, cz, 0.8), S.CHAIN);
  add(sdRoundBox(x, y, z, cx, barY, cz, 62, 1.8, 2.4, 0.8), S.LAMPBAR);
  for (const sx of [cx - 42, cx, cx + 42]) {
    if (Math.abs(x - sx) > 22) continue;
    add(sdCapsule(x, y, z, sx, barY, cz, sx, barY + 3.5, cz, 0.9), S.LAMPBAR);
    let dome = smax(sdEllipsoid(x, y, z, sx, barY + 13.5, cz, 13, 9.5, 13), y - (barY + 13.5), 0.5);
    dome = smax(dome, -sdEllipsoid(x, y, z, sx, barY + 13.5, cz, 11.8, 8.3, 11.8), 0.3);
    add(dome, S.SHADE);
    add(Math.max(Math.abs(Math.hypot(x - sx, z - cz) - 12.4) - 1, Math.abs(y - (barY + 13.6)) - 0.8), S.SHADE_RIM);
    add(sdSphere(x, y, z, sx, barY + 11, cz, 3.2), S.LAMPBULB);
  }
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  group(x, y, z, [-90, -16, 0, W + 90, 16, 17], ceiling);
  wall(x, y, z);
  add(FLOOR - y, S.FLOOR);
  group(x, y, z, [DOOR.x0 - 26, DOOR.y0 - 26, -4, DOOR.x1 + 26, FLOOR, 8], door);
  group(x, y, z, [RACK.x0 - 4, RACK.top - 16, 0, RACK.x1 + 4, RACK.bottom + 5, 12], cueRack);
  group(x, y, z, [264, 50, 0, 286, 74, 17], sconce);
  group(x, y, z, [BEADS.x0 - 2, BEADS.y0 - 2, 0, BEADS.x1 + 2, BEADS.y1 + 2, 7], beadBoard);
  group(x, y, z, [NEON.x0 - 2, NEON.y0 - 2, 0, NEON.x1 + 2, 130, 6], neonBack);
  group(x, y, z, [POSTER.x0 - 4, POSTER.y0 - 3, 0, POSTER.x1 + 2, POSTER.y1 + 2, 6], poster);
  group(x, y, z, [LEDGE.x0 - 2, LEDGE.y - 30, 0, LEDGE.x1 + 2, LEDGE.y + 15, 16], ledge);
  for (const T of POOL) {
    group(x, y, z, [T.cx - T.len / 2 - 12, POOL_TOP - 9, T.cz - T.dep / 2 - 12, T.cx + T.len / 2 + 12, FLOOR, T.cz + T.dep / 2 + 12], (a, b, c) => poolTable(a, b, c, T));
    group(x, y, z, [T.cx - 66, -64, T.cz - 15, T.cx + 66, 74, T.cz + 15], (a, b, c) => poolLamp(a, b, c, T));
  }
  return acc.D;
}
export const shade = (x, y, z) => Math.min(scene(x, y, z), tableD(x, y, z));

// ------------------------------------------------------------------ as luzes
export const LIGHTS = [
  // o abajur da mesa (o jogo o desenha no alto da tela)
  { p: LAMP, c: [1, 0.84, 0.6], k: 1.8, R: 220, shadow: true },
  // as duas luminárias de sinuca (o facho para baixo: as cúpulas seguram a luz de cima)
  { p: [POOL[0].cx, 74, POOL[0].cz], c: [1, 0.95, 0.76], k: 2.4, R: 90, shadow: true, max: 330 },
  { p: [POOL[1].cx, 74, POOL[1].cz], c: [1, 0.95, 0.76], k: 2.4, R: 90, shadow: true, max: 330 },
  // o neon rosa e a bola azul
  { p: [614, 44, 18], c: [1, 0.3, 0.66], k: 2.1, R: 150 },
  { p: [713, 44, 12], c: [0.3, 0.8, 1], k: 1.1, R: 70, max: 300 },
  // a SAÍDA e a arandela de gaiola
  { p: [168, DOOR.y0 - 14, 10], c: [1, 0.16, 0.1], k: 0.9, R: 40, max: 200 },
  { p: [275, 65, 15], c: [1, 0.8, 0.5], k: 1.4, R: 75, max: 300 },
];
export const AMB = [0.06, 0.052, 0.1];
export const EMISSIVE = new Set([S.SIGN_RED, S.BULB, S.LAMPBULB, S.EMBER]);

// ------------------------------------------------------------------ a pixel art
const C = {
  [S.BRICK]: ['#5e2c1e'], [S.BRICK_D]: ['#482216'], [S.BRICK_L]: ['#703624'], [S.MORTAR]: ['#241a18'],
  [S.SLAB]: ['#4a4644'], [S.PIPE]: ['#5a6a6e', 'metal'], [S.BRACKET]: ['#3a3a3e', 'metal'], [S.FLOOR]: ['#2e2a2e'],
  [S.DOOR]: ['#2e4c40', 'metal'], [S.DOOR_FRAME]: ['#26282a', 'metal'], [S.GLASS]: ['#1c2c32', 'metal'], [S.BAR]: ['#9a9a94', 'metal'],
  [S.SIGN_RED]: ['#d8261a', 'glow'], [S.SIGN_BOX]: ['#1a1212'], [S.RACK]: ['#5a2e14'], [S.CUE]: ['#d4b070'],
  [S.CUE_BUTT]: ['#3a1a0c'], [S.CUE_TIP]: ['#3a6ac8'], [S.FERRULE]: ['#f0ece0'], [S.CHALK]: ['#3a6ac8'],
  [S.BOARD]: ['#4a240e'], [S.WIRE]: ['#a8a49a', 'metal'], [S.BEAD]: ['#e8d8b0'], [S.BEAD_R]: ['#c83a24'],
  [S.LAMP_ARM]: ['#2e2e2e', 'metal'], [S.BULB]: ['#ffe6a8', 'glow'], [S.CAGE]: ['#5a5a54', 'metal'], [S.ACRYLIC]: ['#141018', 'metal'],
  [S.POSTER]: ['#e8a0b4'], [S.POSTER_RED]: ['#b8281e'], [S.TAPE]: ['#d8d0b0'], [S.LEDGE]: ['#6a3a1a'],
  [S.BOTTLE]: ['#4a240e', 'metal'], [S.BOTTLE_G]: ['#1f4a2a', 'metal'], [S.LABEL]: ['#e6c34a'], [S.CAP]: ['#c8a040', 'metal'],
  [S.ASHTRAY]: ['#8e9c9e', 'metal'], [S.EMBER]: ['#ff8a32', 'glow'], [S.CIG]: ['#efe8d8'], [S.RAIL]: ['#5a2a12'],
  [S.CUSHION]: ['#1e6a3a'], [S.FELT]: ['#1f7a44'], [S.POCKET]: ['#0a0806'], [S.CABINET]: ['#4a220e'],
  [S.BALL_Y]: ['#e8c030', 'metal'], [S.BALL_R]: ['#c8281e', 'metal'], [S.BALL_W]: ['#f4f0e4', 'metal'], [S.BALL_B]: ['#2a4ab8', 'metal'],
  [S.BALL_K]: ['#1a1a1a', 'metal'], [S.BALL_O]: ['#e86a1e', 'metal'], [S.BALL_P]: ['#6a2a8a', 'metal'], [S.SHADE]: ['#1e6a3e', 'metal'],
  [S.SHADE_RIM]: ['#c8a040', 'metal'], [S.CHAIN]: ['#5a5a54', 'metal'], [S.LAMPBAR]: ['#6a4a1a', 'metal'], [S.LAMPBULB]: ['#fff2c8', 'glow'],
  [S.TRIANGLE]: ['#c8a46a'], [S.BOARD_BACK]: ['#24120a'], [S.CORD]: ['#141012'], [S.OUTLET]: ['#c8c0a8'], [S.PLATE]: ['#5a5e5c', 'metal'],
};
// as manchas de óleo no chão (x, z, raio x, raio z)
const STAINS = [[96, 150, 16, 7], [214, 40, 11, 5], [150, 222, 9, 4], [690, 60, 14, 6], [760, 170, 18, 7], [610, 214, 10, 4], [40, 24, 9, 4]];
const BRICKS = new Set([S.BRICK, S.BRICK_D, S.BRICK_L, S.MORTAR]);

function decals(ctx) {
  const { W: w, H: h, mat } = ctx;
  // a fuligem da fumaça no alto e a umidade embaixo, nos tijolos
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (!BRICKS.has(mat[p])) continue;
      const soot = Math.max(0, (70 - y) / 56);
      const damp = Math.max(0, (y - 160) / 34);
      const k = Math.min(1, soot + damp);
      if (k > ctx.bayer(x, y)) nudge(ctx, p, -1);
    }
  // o chão de cimento: as placas, as juntas, a umidade junto da parede, as manchas de óleo e as bitucas
  floorGrid(
    ctx,
    new Set([S.FLOOR]),
    FLOOR,
    96,
    96,
    (p, seam, col, run, wx, wz, x, y) => {
      const n = hash2(col, run);
      let t = ctx.tone[p];
      if (seam) t -= 2;
      else if (n > 0.66 && ctx.bayer(x, y) > 0.55) t += 1;
      else if (n < 0.25 && ctx.bayer(x, y) > 0.6) t -= 1;
      // as manchas (óleo) e a umidade do pé da parede
      for (const [sx, sz, rx, rz] of STAINS) if (((wx - sx) / rx) ** 2 + ((wz - sz) / rz) ** 2 + Math.sin(wx * 0.7 + wz * 0.4) * 0.12 < 1) t -= 1;
      if (wz < 7 && ctx.bayer(x, y) < (7 - wz) / 7) t -= 1;
      ctx.set(p, ctx.colorOf(p, ctx.RAMP[S.FLOOR], t));
      // as bitucas
      if (!seam && hash2(Math.floor(wx / 2.5), Math.floor(wz / 6)) > 0.9992) ctx.set(p, [216, 200, 144]);
    },
    () => 0,
  );
  // o vidro aramado da porta
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] === S.GLASS && (x % 4 === 0 || y % 4 === 0)) ctx.set(p, ctx.colorOf(p, ctx.RAMP[S.GLASS], ctx.tone[p] + 2));
    }
  // a pichação rosa na porta
  for (let i = 0; i < 26; i += 1) {
    const [px, py] = proj(DOOR.x0 + 10 + i * 1.4, DOOR.y0 + 38 + Math.sin(i * 0.7) * 2.5, -0.7);
    dot(ctx, px, py, [200, 58, 138]);
  }
  // a SAÍDA
  textAt(ctx, 'SAIDA', (DOOR.x0 + DOOR.x1) / 2, DOOR.y0 - 19, 4.8, [255, 240, 216], new Set([S.SIGN_RED]), 2);
  // o cartaz: SINUCA no alto, a bola 8 grande e 22H embaixo
  const pc = (POSTER.x0 + POSTER.x1) / 2;
  textAt(ctx, 'SINUCA', pc, POSTER.y0 + 5, 0.9, [248, 236, 200], new Set([S.POSTER_RED]), 1);
  {
    const [bx, by] = proj(pc, POSTER.y0 + 36, 0.9);
    for (let y = -11; y <= 11; y += 1)
      for (let x = -11; x <= 11; x += 1) {
        const d = Math.hypot(x, y);
        if (d > 10.5) continue;
        const c = d < 5 ? [244, 240, 228] : x < -4 && y < -4 && d < 9 ? [70, 70, 70] : [20, 20, 20];
        dot(ctx, bx + x, by + y, c);
      }
    textAt(ctx, '8', pc + 0.5, POSTER.y0 + 33.5, 1, [20, 20, 20], null, 1);
  }
  textAt(ctx, '22H', pc, POSTER.y1 - 15, 0.9, [184, 40, 30], new Set([S.POSTER]), 2);
}

function post(ctx) {
  // o neon: SINUCA em rosa, a bola 8 em azul e o taco sublinhando
  const [nx, ny] = proj(548, 28, 3.4);
  const S6 = 6;
  neonText(ctx, 'SINUCA', nx, ny, S6, [255, 61, 158], [255, 226, 242]);
  const [rx, ry] = proj(713, 43, 3.4);
  neonRing(ctx, rx, ry, 14, [58, 214, 255], [216, 248, 255]);
  neonText(ctx, '8', rx - 4.5, ry - 7.5, 3, [58, 214, 255], [232, 251, 255], 1.3);
  const uy = ny + 5 * S6 + 6;
  stroke(ctx, nx - 4, uy, nx + textWidth('SINUCA') * S6 - 4, uy, 1.2, [58, 214, 255]);
  stroke(ctx, nx + textWidth('SINUCA') * S6 - 4, uy, nx + textWidth('SINUCA') * S6 + 4, uy, 1.2, [244, 240, 232]);
  // a fumaça lilás no alto, os fachos das luminárias e os halos
  smoke(ctx, [154, 122, 184], 0.2, 250);
  for (const T of POOL) {
    const [lx, ly] = proj(T.cx, 72, T.cz);
    for (const dx of [-42, 0, 42]) beam(ctx, lx + dx, ly, 120, 10, 34, [255, 242, 200], 0.13);
    for (const dx of [-42, 0, 42]) halo(ctx, lx + dx, ly - 2, 22, [255, 242, 200], 0.4, 2.2);
  }
  halo(ctx, nx + (textWidth('SINUCA') * S6) / 2, ny + 15, 150, [255, 61, 158], 0.42, 1.7);
  halo(ctx, rx, ry, 40, [58, 214, 255], 0.45, 2);
  const [sx, sy] = proj(168, DOOR.y0 - 14, 5);
  halo(ctx, sx, sy, 30, [255, 48, 32], 0.5, 1.6);
  const [cx, cy] = proj(275, 65, 10);
  halo(ctx, cx, cy, 36, [255, 216, 144], 0.55, 2);
  const [ex, ey] = proj(812.6, LEDGE.y - 4.5, 10.2);
  halo(ctx, ex, ey, 7, [255, 138, 50], 0.6, 2);
}

export const PIXEL = {
  colors: C,
  dither: new Set([S.FLOOR, S.SLAB, S.FELT, S.DOOR, S.POSTER]),
  spec: new Set([S.PIPE, S.BRACKET, S.BAR, S.BOTTLE, S.BOTTLE_G, S.CAP, S.ASHTRAY, S.ACRYLIC, S.BALL_Y, S.BALL_R, S.BALL_W, S.BALL_B, S.BALL_K, S.BALL_O, S.BALL_P, S.SHADE, S.SHADE_RIM, S.GLASS, S.CUE, S.RAIL]),
  flats: new Set([S.FLOOR, S.BRICK, S.BRICK_D, S.BRICK_L, S.MORTAR, S.FELT]),
  noEdge: new Set([S.BRICK, S.BRICK_D, S.BRICK_L, S.MORTAR, S.FLOOR]),
  decals,
  post,
  vignette: { start: 0.45, k: 1.6, max: 0.85 },
};
