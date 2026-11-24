// Prévia: o fundo do boteco (a sala da região 1) em volume. A parede, o friso, o azulejo, as
// prateleiras com as garrafas e as canecas, o letreiro da cerveja, o relógio, a flâmula, a placa do
// fiado, os canos, a caixa de luz, a lâmpada nua, o chão de taco em perspectiva, os engradados, a
// cadeira de plástico e o freezer, modelados por distância com sinal e iluminados pelas lâmpadas.
// Medidas em px da tela grande (o dobro da cena antiga), para a tela deitada de 896 × 414.
import { acc, add, reset } from '../kit.mjs';
import { clamp, sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../sdf.mjs';

export const W = 896;
export const H = 414;
// a parede fica em z = 0; o chão em y = FLOOR
export const FLOOR = 194;
// A câmera alta, olhando de cima, com a MESMA perspectiva do tampo que o jogo desenha
// (seatGeometry.js: tombo de 28°, perspectiva de 1000 px, a beirada de perto em 87% da altura).
// Assim o chão e o tampo ficam paralelos: as tábuas fogem para o mesmo ponto que as beiradas da
// mesa (bem lá em cima, fora da tela) e a mesa fica deitada, em vez de parecer de pé na parede.
const TILT = (28 * Math.PI) / 180;
const PERSP = 1000;
const Y_NEAR = Math.round(H * 0.87);
const T_NEAR_W = Math.round(Math.min(W * 0.44, H * 0.98));
const T_DEPTH = Math.round(((Y_NEAR - Math.round(H * 0.37)) * PERSP) / (PERSP * Math.cos(TILT) - (Y_NEAR - Math.round(H * 0.37)) * Math.sin(TILT)));
export const CAM = [W / 2, Y_NEAR - PERSP / Math.tan(TILT), PERSP / Math.sin(TILT)];
// O tampo na cena (só para a sombra; o jogo o desenha por cima): o retângulo deitado que esta
// câmera põe exatamente em cima do tampo do jogo. A largura de verdade escolhe a altura dele.
const T_W = 331;
const T_U = T_NEAR_W / T_W;
const T_ZN = CAM[2] * (1 - 1 / T_U);
const T_ZF = T_ZN - T_DEPTH / T_U;
const T_Y = CAM[1] + (Y_NEAR - CAM[1]) / T_U;
// o abajur que o jogo pendura no alto da tela (y ≈ 16), em cima do meio do tampo
const LAMP_Z = (T_ZN + T_ZF) / 2;
const LAMP = [W / 2, CAM[1] + (16 - CAM[1]) * (1 - LAMP_Z / CAM[2]), LAMP_Z];
export const TABLE3D = { w: T_W, y: T_Y, zNear: T_ZN, zFar: T_ZF, lamp: LAMP };

export const S = {
  PLASTER: 60, BRICK: 61, BEAM: 62, PIPE: 63, TILE: 64, TRIM: 65, FLOOR: 66, SHELF: 67, BRACKET: 68,
  GLASS_G: 69, GLASS_A: 70, GLASS_C: 71, GLASS_B: 72, LABEL_R: 73, LABEL_Y: 74, LABEL_W: 75, CAP: 76,
  BEER: 77, FOAM: 78, MUG: 79, SIGN_FRAME: 80, SIGN_FACE: 81, CLOCK_RIM: 82, CLOCK_FACE: 83,
  PENNANT: 84, STICK: 85, BOARD: 86, STRING: 87, NAIL: 88, BULB: 89, SOCKET: 90, CORD: 91,
  CRATE: 92, CRATE_BOTTLE: 93, CHAIR: 94, FREEZER: 95, FREEZER_RED: 96, FREEZER_LID: 97,
  BASE: 98, METER: 99, WIRE: 100, JAR: 101, EGG: 102, PLASTER_EDGE: 103, LABEL_B: 104,
};

// ------------------------------------------------------------------ as garrafas e as canecas
// [x, tipo] por prateleira; tipo: 0 verde, 1 âmbar, 2 cristal, 3 marrom, 4 verde baixa, 5 cristal alta, 'mug'
const SHELF_Y = [80, 132];
const SHELF_X0 = 536;
const ROW1 = [[548, 2], [566, 0], [585, 4], [604, 'mug'], [626, 1], [646, 3], [665, 5], [685, 0], [705, 2], [726, 'mug'], [750, 4], [770, 1], [792, 3], [812, 5], [834, 0], [856, 'mug'], [880, 2], [902, 1], [922, 4], [942, 'mug'], [964, 0]];
const ROW2 = [[550, 0], [570, 3], [592, 'mug'], [616, 5], [636, 2], [656, 1], [676, 'mug'], [700, 4], [720, 3], [742, 0], [764, 5], [786, 'mug'], [808, 2], [830, 1], [852, 4], [874, 3], [896, 5], [918, 2], [940, 0], [962, 'mug']];
const BOTTLE = [
  { glass: 'GLASS_G', h: 40, r: 5.4, neck: 12, label: 'LABEL_Y' },
  { glass: 'GLASS_A', h: 34, r: 6, neck: 9, label: 'LABEL_R' },
  { glass: 'GLASS_C', h: 38, r: 5, neck: 13, label: 'LABEL_W' },
  { glass: 'GLASS_B', h: 30, r: 6.4, neck: 8, label: 'LABEL_R' },
  { glass: 'GLASS_G', h: 26, r: 6.8, neck: 7, label: 'LABEL_B' },
  { glass: 'GLASS_C', h: 46, r: 4.6, neck: 15, label: 'LABEL_Y' },
];
const Z_ITEM = 11; // o meio da prateleira (de fundo)

function bottle(x, y, z, bx, base, kind) {
  const B = BOTTLE[kind];
  const top = base - B.h;
  const bodyTop = top + B.neck + 4;
  // o bojo, o ombro e o gargalo; o rótulo é uma faixa no bojo
  let d = sdRoundBox(x, y, z, bx, (base + bodyTop) / 2, Z_ITEM, B.r, (base - bodyTop) / 2, B.r, B.r * 0.9);
  d = smin(d, sdRoundCone(x, y, z, bx, bodyTop + 1, Z_ITEM, bx, top + 2, Z_ITEM, B.r * 0.92, 1.9), 3);
  const glass = S[B.glass];
  const ly0 = base - (base - bodyTop) * 0.72;
  const ly1 = base - (base - bodyTop) * 0.22;
  const onLabel = y > ly0 && y < ly1 && z > Z_ITEM - 1;
  add(d, onLabel ? S[B.label] : glass);
  add(sdRoundBox(x, y, z, bx, top + 1.2, Z_ITEM, 2.3, 1.5, 2.3, 0.6), S.CAP);
}
function mug(x, y, z, mx, base) {
  const h = 22;
  let d = sdRoundBox(x, y, z, mx, base - h / 2, Z_ITEM, 7.2, h / 2, 7.2, 2.2);
  const handle = smax(Math.abs(Math.hypot(x - (mx + 9.5), y - (base - h / 2)) - 4.6) - 1.6, Math.abs(z - Z_ITEM) - 1.6, 0.6);
  add(handle, S.MUG);
  // o chope dentro (âmbar) e a espuma em cima
  const foamY = base - h + 3;
  add(smax(d, foamY - y, 0.8), S.BEER);
  add(smax(d - 0.4, Math.max(y - foamY - 1, base - h - 2.4 - y), 0.6) + Math.sin(x * 1.9) * 0.25, S.FOAM, 1.2);
}
function shelfRow(x, y, z, sy, row) {
  // a tábua com a borda boleada e as mãos-francesas de ferro
  add(sdRoundBox(x, y, z, (SHELF_X0 + W + 120) / 2, sy + 3, 11, (W + 120 - SHELF_X0) / 2, 3, 12, 1.4), S.SHELF);
  for (const bx of [SHELF_X0 + 18, 720, 868, 990]) {
    add(sdRoundBox(x, y, z, bx, sy + 10, 2, 1.6, 7, 1.4, 0.6), S.BRACKET);
    add(sdRoundBox(x, y, z, bx, sy + 7, 9, 1.4, 1.2, 8, 0.6), S.BRACKET);
  }
  if (y > sy + 1) return;
  for (const [ix, kind] of row) {
    const bd = Math.abs(x - ix) - 10;
    if (bd > 4) {
      add(bd, 0);
      continue;
    }
    if (kind === 'mug') mug(x, y, z, ix, sy);
    else bottle(x, y, z, ix, sy, kind);
  }
}

// ------------------------------------------------------------------ a parede
const TILE_TOP = 108;
const TRIM_Y = [102, 108];
function wall(x, y, z) {
  // o reboco em cima (com o descascado mostrando o tijolo), o friso azul e o azulejo embaixo
  if (y < TRIM_Y[0]) {
    let bump = Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2) * 0.35 + Math.sin(y * 0.19 + x * 0.05) * 0.25;
    let mat = S.PLASTER;
    // os buracos do reboco
    for (const [cx, cy, rx, ry] of [[280, 40, 18, 10], [140, 54, 24, 12], [574, 66, 16, 9], [846, 82, 20, 10]]) {
      const q = Math.hypot((x - cx) / rx, (y - cy) / ry) + Math.sin(x * 0.9 + cy) * 0.16 + Math.sin(y * 1.3 + x * 0.4) * 0.12;
      if (q < 1) {
        if (q > 0.86) {
          mat = S.PLASTER_EDGE;
          bump += 0.6;
        } else {
          mat = S.BRICK;
          const row = Math.floor(y / 7);
          const mortar = (y % 7) < 1.6 || ((x + (row % 2 ? 8 : 0)) % 16) < 1.6;
          bump = mortar ? -3.4 : -1.6;
        }
      }
    }
    add(z - bump, mat);
    return;
  }
  if (y < TRIM_Y[1]) {
    add(sdRoundBox(x, y, z, W / 2, (TRIM_Y[0] + TRIM_Y[1]) / 2, 0.6, W, (TRIM_Y[1] - TRIM_Y[0]) / 2, 2.2, 1.2), S.TRIM);
    add(z, S.TRIM);
    return;
  }
  // o azulejo: quadrados de 20 px, almofadados, com o rejunte fundo
  const gx = ((x % 20) + 20) % 20;
  const gy = (((y - TILE_TOP) % 20) + 20) % 20;
  const e = Math.min(gx, 20 - gx, gy, 20 - gy);
  const bump = e < 1.4 ? -1.2 + e * 0.5 : -0.5 + Math.min(1, (e - 1.4) / 3) * 0.5;
  add(z - bump, S.TILE);
}

// ------------------------------------------------------------------ o chão de taco
function floor(x, y, z) {
  add(FLOOR - y, S.FLOOR);
  // o rodapé de madeira escura
  if (z < 12 && y > FLOOR - 14) add(sdRoundBox(x, y, z, W / 2, FLOOR - 4, 1.5, W, 4, 2.5, 1), S.BASE);
}

// ------------------------------------------------------------------ as coisas da parede
function pipes(x, y, z) {
  for (const px of [258, 858]) {
    if (Math.abs(x - px) > 14) continue;
    add(sdCapsule(x, y, z, px, -10, 7, px, FLOOR, 7, 4.2), S.PIPE);
    for (let cy = 24; cy < FLOOR; cy += 48) add(sdRoundBox(x, y, z, px, cy, 7, 5.6, 2, 5.6, 1), S.BRACKET);
  }
}
function meterBox(x, y, z) {
  if (x < 210 || x > 262 || y > 120) return;
  add(sdRoundBox(x, y, z, 230, 32, 4, 11, 13, 4, 1.4), S.METER);
  add(sdRoundBox(x, y, z, 230, 30, 8.4, 6, 3.4, 0.8, 0.6), S.SOCKET);
  // o fio descendo, meio torto
  const wx = 232 + Math.sin(y * 0.15) * 3;
  if (y > 44 && y < 104) add(Math.hypot(x - wx, z - 2.4) - 1.3, S.WIRE);
}
function fiado(x, y, z) {
  const x0 = 118;
  const y0 = 76;
  if (x < x0 - 6 || x > x0 + 96 || y < y0 - 22 || y > y0 + 42) return;
  // a tábua pintada de verde, um tico torta, pendurada pelo barbante no prego
  add(sdRoundBox(x, y, z, x0 + 44, y0 + 17, 5, 44, 17, 1.8, 1.2) + Math.sin(x * 0.6) * 0.05, S.BOARD);
  add(sdSphere(x, y, z, x0 + 44, y0 - 13, 2, 2.2), S.NAIL);
  add(sdCapsule(x, y, z, x0 + 12, y0 + 1, 6.5, x0 + 44, y0 - 13, 3, 0.8), S.STRING);
  add(sdCapsule(x, y, z, x0 + 76, y0 + 1, 6.5, x0 + 44, y0 - 13, 3, 0.8), S.STRING);
}
function pennant(x, y, z) {
  const x0 = 298;
  const y0 = 64;
  if (x < x0 - 6 || x > x0 + 40 || y < y0 - 6 || y > y0 + 48) return;
  add(sdCapsule(x, y, z, x0 - 2, y0, 4, x0 + 36, y0, 4, 1.4), S.STICK);
  // o triângulo de pano, ondulado
  const k = (y - y0) / 42;
  const half = 17 * (1 - k);
  const wave = Math.sin(x * 0.25 + y * 0.12) * 0.8;
  const tri = Math.max(Math.abs(x - (x0 + 17)) - half, y0 + 1 - y, y - (y0 + 42));
  add(Math.max(tri, Math.abs(z - 3 - wave) - 0.9), S.PENNANT);
}
function clock(x, y, z) {
  const cx = 348;
  const cy = 34;
  if (Math.abs(x - cx) > 22 || Math.abs(y - cy) > 22) return;
  const r = Math.hypot(x - cx, y - cy);
  const disc = Math.max(r - 17, Math.abs(z - 3) - 3);
  add(smax(disc, -Math.max(r - 14.5, -(z - 5.2)), 0.6), S.CLOCK_RIM);
  add(Math.max(r - 14.6, Math.abs(z - 3) - 2.4), S.CLOCK_FACE);
}
function lightbox(x, y, z) {
  const x0 = 530;
  const y0 = 12;
  const w = 140;
  const h = 26;
  if (x < x0 - 6 || x > x0 + w + 6 || y < y0 - 6 || y > y0 + h + 12) return;
  add(sdRoundBox(x, y, z, x0 + w / 2, y0 + h / 2, 4, w / 2 + 2, h / 2 + 2, 4, 1.4), S.SIGN_FRAME);
  // a frente de acrílico acesa (as faixas vermelhas em cima e embaixo)
  const face = sdRoundBox(x, y, z, x0 + w / 2, y0 + h / 2, 8.4, w / 2 - 1, h / 2 - 1, 0.6, 0.4);
  add(face, y < y0 + 4 || y > y0 + h - 4 ? S.SIGN_RED : S.SIGN_FACE);
  for (const sx of [x0 + 10, x0 + w - 10]) add(sdCapsule(x, y, z, sx, y0 + h + 2, 2, sx, y0 + h + 9, 2, 1), S.BRACKET);
}
function bareBulb(x, y, z) {
  const bx = 714;
  if (Math.abs(x - bx) > 10 || y > 56) return;
  add(sdCapsule(x, y, z, bx, -4, 20, bx, 34, 20, 0.9), S.CORD);
  add(sdRoundBox(x, y, z, bx, 37, 20, 3.4, 4, 3.4, 1.2), S.SOCKET);
  add(sdEllipsoid(x, y, z, bx, 47, 20, 5.6, 7.4, 5.6), S.BULB);
}

// ------------------------------------------------------------------ o chão: engradados, cadeira, freezer
function crate(x, y, z, cx, baseY, cz, bottles = true) {
  // o engradado de plástico amarelo (vazado nas laterais) com as garrafas marrons
  const w = 26;
  const h = 18;
  const dd = 20;
  let d = sdRoundBox(x, y, z, cx, baseY - h / 2, cz, w, h / 2, dd, 1.6);
  const hollow = sdRoundBox(x, y, z, cx, baseY - h / 2 - 2, cz, w - 2.4, h / 2, dd - 2.4, 1);
  d = smax(d, -hollow, 0.6);
  // as janelas da lateral
  const win = Math.max(Math.abs(((x - cx + 100) % 10) - 5) - 3, Math.abs(y - (baseY - h / 2)) - 4.5);
  d = smax(d, -Math.max(win, -(z - (cz + dd - 3))), 0.4);
  add(d, S.CRATE);
  if (!bottles) return;
  for (let i = 0; i < 4; i += 1)
    for (let j = 0; j < 2; j += 1) {
      const bx = cx - 18 + i * 12;
      const bz = cz - 8 + j * 16;
      if (Math.abs(x - bx) > 8 || Math.abs(z - bz) > 8) continue;
      add(Math.min(sdRoundCone(x, y, z, bx, baseY - 4, bz, bx, baseY - 22, bz, 5, 4.6), sdRoundCone(x, y, z, bx, baseY - 22, bz, bx, baseY - 34, bz, 4.6, 1.9)), S.CRATE_BOTTLE);
    }
}
function chair(x, y, z) {
  // a cadeira de plástico vermelha (de bar), de frente, encostada na parede: o assento, o encosto
  // curvo com as duas frestas e as quatro pernas abertas. (Fora da caixa dela, a distância até a
  // caixa: vista de cima, sem isso o raio pulava para dentro do encosto e comia a quina.)
  const cx = 118;
  const cz = 46;
  const b = boxD(x, y, z, cx - 30, FLOOR - 80, cz - 28, cx + 30, FLOOR, cz + 26);
  if (b > 1) {
    add(b, 0);
    return;
  }
  const seatY = FLOOR - 36;
  add(sdRoundBox(x, y, z, cx, seatY, cz, 24, 2.4, 22, 2), S.CHAIR);
  const bend = ((x - cx) / 23) ** 2 * 3;
  let back = sdRoundBox(x, y, z - bend, cx, seatY - 22, cz - 21, 23, 18, 2, 3);
  for (const sy of [seatY - 34, seatY - 27]) back = smax(back, -sdRoundBox(x, y, z - bend, cx, sy, cz - 21, 15, 1.6, 8, 1.2), 0.5);
  add(back, S.CHAIR);
  for (const [lx, lz] of [[cx - 21, cz - 18], [cx + 21, cz - 18], [cx - 22, cz + 19], [cx + 22, cz + 19]]) add(sdRoundCone(x, y, z, lx, seatY + 2, lz, lx + Math.sign(lx - cx) * 3, FLOOR, lz + Math.sign(lz - cz) * 3, 2.4, 2.2), S.CHAIR);
}
function freezer(x, y, z) {
  // o freezer horizontal branco com a faixa vermelha e a tampa de correr
  const x0 = 744;
  const x1 = 892;
  const cz = 44;
  const top = FLOOR - 64;
  if (x < x0 - 6) return;
  add(sdRoundBox(x, y, z, (x0 + x1) / 2, (top + FLOOR) / 2, cz, (x1 - x0) / 2, (FLOOR - top) / 2, 26, 4), y > top + 34 && y < top + 44 ? S.FREEZER_RED : S.FREEZER);
  add(sdRoundBox(x, y, z, (x0 + x1) / 2, top - 1.5, cz, (x1 - x0) / 2 - 3, 2, 23, 1.4), S.FREEZER_LID);
}

const boxD = (x, y, z, x0, y0, z0, x1, y1, z1) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1), Math.max(z0 - z, 0, z - z1));
/** Só olha de perto o que está dentro da caixa; de longe, a distância até a caixa basta. */
function group(x, y, z, box, fn) {
  const b = boxD(x, y, z, ...box);
  if (b > 2) add(b, 0);
  else fn(x, y, z);
}

function beam(x, y, z) {
  add(sdRoundBox(x, y, z, W / 2, -2, 6, W / 2 + 128, 9, 6, 1.4), S.BEAM);
  // o fio que corre embaixo da viga, preso de palmo em palmo
  const wy = 10 + Math.sin(x / 44) * 1.6;
  add(Math.hypot(y - wy, z - 3) - 1.1, S.WIRE);
}

/** A cena inteira: devolve a distância (e deixa o material em acc.MAT). */
export function scene(x, y, z) {
  reset();
  group(x, y, z, [-130, -14, 0, W + 130, 14, 14], beam);
  if (z < 40) wall(x, y, z);
  else add(z - 0.5, S.PLASTER);
  floor(x, y, z);
  group(x, y, z, [250, -12, 0, 268, FLOOR, 14], pipes);
  group(x, y, z, [850, -12, 0, 868, FLOOR, 14], pipes);
  group(x, y, z, [214, 16, 0, 246, 108, 10], meterBox);
  group(x, y, z, [112, 58, 0, 214, 114, 10], fiado);
  group(x, y, z, [292, 58, 0, 340, 110, 8], pennant);
  group(x, y, z, [328, 14, 0, 368, 54, 8], clock);
  group(x, y, z, [524, 6, 0, 676, 50, 10], lightbox);
  group(x, y, z, [SHELF_X0 - 12, SHELF_Y[0] - 50, 0, W + 124, SHELF_Y[0] + 18, 26], (a, b, c) => shelfRow(a, b, c, SHELF_Y[0], ROW1));
  group(x, y, z, [SHELF_X0 - 12, SHELF_Y[1] - 50, 0, W + 124, SHELF_Y[1] + 18, 26], (a, b, c) => shelfRow(a, b, c, SHELF_Y[1], ROW2));
  group(x, y, z, [702, -8, 12, 726, 56, 28], bareBulb);
  group(x, y, z, [20, FLOOR - 76, 16, 86, FLOOR, 64], (a, b, c) => {
    crate(a, b, c, 52, FLOOR, 40);
    crate(a, b, c, 52, FLOOR - 19, 40, false);
  });
  group(x, y, z, [80, FLOOR - 80, 20, 156, FLOOR, 72], chair);
  group(x, y, z, [740, FLOOR - 104, 14, 896, FLOOR, 74], (a, b, c) => {
    freezer(a, b, c);
    crate(a, b, c, 800, FLOOR - 66, 40);
  });
  return acc.D;
}

// ------------------------------------------------------------------ as luzes
export const LIGHTS = [
  // a lâmpada da mesa (o abajur pendurado em cima do rival): a luz principal
  { p: LAMP, c: [1, 0.84, 0.6], k: 3.6, R: 280, shadow: true },
  // a lâmpada nua das prateleiras
  { p: [714, 47, 40], c: [1, 0.82, 0.52], k: 0.95, R: 120, shadow: true },
  // o letreiro aceso
  { p: [600, 26, 30], c: [1, 0.92, 0.7], k: 0.45, R: 90, shadow: false },
  // a rua pela porta (à esquerda, fria) e o freezer
  { p: [-60, 120, 160], c: [0.55, 0.68, 0.95], k: 0.55, R: 260, shadow: false },
];
export const AMB = [0.13, 0.14, 0.16];
export const EMISSIVE = new Set([S.SIGN_FACE, S.SIGN_RED, S.BULB]);
export { clamp };

// a mesa da partida (o jogo a desenha por cima): só faz sombra, embaixo e em volta dela
export function shade(x, y, z) {
  const d = scene(x, y, z);
  // o tampo com o aro e a saia (uns 12 px para baixo)
  const table = sdRoundBox(x, y, z, W / 2, T_Y + 6, (T_ZN + T_ZF) / 2, T_W / 2, 6, (T_ZN - T_ZF) / 2, 2);
  return Math.min(d, table);
}
