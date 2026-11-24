// A Calçada do Bar, em volume e com a câmera alta (a frente da sala: o céu, o sol e as nuvens ficam
// na camada de trás do jogo). A casa azul com a janela e a floreira, a fachada amarela do BAR DO
// CANTO com o rodapé vermelho, a porta de enrolar aberta mostrando o balcão e as prateleiras, o
// toldo listrado, a placa pintada, a lousa do HOJE, a plaquinha do FIADO, o poste com os fios e as
// bandeirinhas, a calçada de pedra portuguesa em ondas, a pilha de cadeiras brancas, os engradados,
// a cadeira vermelha e a moto.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdEllipsoid, sdPoly2, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { CAM, H, OX, W, WR, acc, group, planeAt, proj, tableD } from '../common.mjs';
import { bayer } from '../pixelpass.mjs';
import { hash2, nudge, textAt } from '../decals.mjs';
import { chairStack, crate, plasticChair } from './props.mjs';

export { CAM, H, OX, W, WR };
export const FLOOR = 194;

export const S = {
  WALL_BLUE: 60, WALL_YEL: 61, WALL_GREY: 62, CORNICE: 63, TRIM_RED: 64, WINDOW: 65, WIN_FRAME: 66, SILL: 67,
  LEAF: 68, FLOWER: 69, INSIDE: 70, SHELF: 71, BOTTLE_G: 72, BOTTLE_B: 73, LABEL: 74, COUNTER: 75, COUNTER_TOP: 76,
  SHUTTER: 77, RAIL: 78, AWN_R: 79, AWN_W: 80, SIGN: 81, SIGN_EDGE: 82, CHALK: 83, CHALK_FRAME: 84, FIADO: 85,
  STRING: 86, NAIL: 87, POLE: 88, WIRE: 89, FLAG_R: 90, FLAG_Y: 91, FLAG_G: 92, FLAG_B: 93, FLAG_O: 94,
  STONE: 95, CHAIR_W: 96, CHAIR_R: 97, CRATE: 98, CRATE_BOTTLE: 99, MOTO: 100, TIRE: 101, CHROME: 102, SEAT: 103,
  LAMP_GLASS: 104, FILTER: 105, GLASS: 106, STONE_D: 107,
};

// ------------------------------------------------------------------ as paredes
const FACADE = { x0: 204, x1: 870, top: 17 };
const DOOR = { x0: 318, x1: 578, top: 42, depth: 44 };
function walls(x, y, z) {
  // só existem do chão para cima até o alto de cada uma (acima é céu: buraco)
  const inDoor = x > DOOR.x0 && x < DOOR.x1 && y > DOOR.top;
  if (x < FACADE.x0) add(Math.max(z + Math.sin(y * 0.9) * 0.05, 30 - y, -z - 6), S.WALL_BLUE);
  else if (x > FACADE.x1) add(Math.max(z, 30 - y, -z - 6), S.WALL_GREY);
  else if (!inDoor) add(Math.max(z + Math.sin(x * 0.3 + y * 0.7) * 0.06, FACADE.top - y, -z - 6), S.WALL_YEL);
  // as cornijas: a de terracota da casa e a marrom do bar
  add(sdRoundBox(x, y, z, FACADE.x0 / 2 - 80, 31, 2, FACADE.x0 / 2 + 80, 3, 3, 1), S.CORNICE);
  add(sdRoundBox(x, y, z, (FACADE.x0 + FACADE.x1) / 2, FACADE.top + 2, 2.5, (FACADE.x1 - FACADE.x0) / 2 + 2, 3.5, 3.5, 1), S.CORNICE);
  add(sdRoundBox(x, y, z, FACADE.x1 + 120, 31, 2, 122, 3, 3, 1), S.CORNICE);
}
// a janela da casa azul e a floreira
function houseWindow(x, y, z) {
  add(smax(sdRoundBox(x, y, z, 68, 90, 1.5, 34, 28, 1.8, 0.6), -sdRoundBox(x, y, z, 68, 90, 2, 29, 23, 3, 0.3), 0.3), S.WIN_FRAME);
  add(sdRoundBox(x, y, z, 68, 90, -2, 30, 24, 0.6, 0.2), S.WINDOW);
  for (const wx of [53, 68, 83]) add(sdRoundBox(x, y, z, wx, 90, -1, 0.9, 24, 1, 0.3), S.WIN_FRAME);
  add(sdRoundBox(x, y, z, 68, 90, -1, 30, 0.9, 1, 0.3), S.WIN_FRAME);
  add(sdRoundBox(x, y, z, 68, 120, 4, 34, 3, 5, 1), S.SILL);
  for (let k = 0; k < 7; k += 1) {
    const fx = 40 + k * 9.5;
    add(sdEllipsoid(x, y, z, fx, 113 - (k % 2) * 2, 5, 6, 5, 4.5), S.LEAF);
    if (k % 2) add(sdSphere(x, y, z, fx + 1, 108, 7, 2.2), S.FLOWER);
  }
}
// a porta de enrolar aberta: o vão com o fundo escuro, as prateleiras, o balcão e a lona enrolada
function barDoor(x, y, z) {
  const { x0, x1, top, depth } = DOOR;
  const cx = (x0 + x1) / 2;
  if (x > x0 - 2 && x < x1 + 2) {
    // o fundo, o teto e as laterais do vão
    add(Math.max(z + depth, top - y, x0 - x, x - x1), S.INSIDE);
    add(Math.max(Math.abs(y - (top - 3)) - 3, -z - depth, z, x0 - x, x - x1), S.INSIDE);
  }
  for (const sx of [x0, x1]) add(Math.max(Math.abs(x - sx) - 2, top - y, Math.abs(z + depth / 2) - depth / 2), S.INSIDE);
  // as prateleiras com as garrafas
  for (const sy of [124, 148]) {
    add(sdRoundBox(x, y, z, cx, sy + 2, -depth + 8, (x1 - x0) / 2 - 4, 2, 8, 0.6), S.SHELF);
    for (let k = 0; k < 18; k += 1) {
      const bx = x0 + 12 + k * 14 + (sy > 130 ? 5 : 0);
      if (Math.abs(x - bx) > 8) continue;
      const tall = (k * 7 + sy) % 3;
      const h = 18 + tall * 3;
      add(smin(sdRoundBox(x, y, z, bx, sy - h / 2 + 4, -depth + 8, 3.4, h / 2 - 4, 3.4, 2.6), sdRoundCone(x, y, z, bx, sy - h + 9, -depth + 8, bx, sy - h + 1, -depth + 8, 2.8, 1.1), 2), y > sy - 9 && y < sy - 4 ? S.LABEL : k % 3 ? S.BOTTLE_G : S.BOTTLE_B);
    }
  }
  // o balcão (com o tampo claro), o filtro de barro e os copos americanos
  add(sdRoundBox(x, y, z, cx, (150 + FLOOR) / 2 + 2, -10, (x1 - x0) / 2 - 3, (FLOOR - 150) / 2 - 2, 10, 1), S.COUNTER);
  add(sdRoundBox(x, y, z, cx, 150, -10, (x1 - x0) / 2 - 1, 2.4, 12, 1), S.COUNTER_TOP);
  add(sdRoundBox(x, y, z, x0 + 34, 138, -12, 7, 10, 7, 3.5), S.FILTER);
  for (const gx of [x1 - 46, x1 - 36, x1 - 26]) add(smax(sdRoundCone(x, y, z, gx, 147, -6, gx, 136, -6, 3, 3.6), -sdRoundCone(x, y, z, gx, 145, -6, gx, 134, -6, 2.3, 2.9), 0.3), S.GLASS);
  // a porta de aço enrolada em cima e os trilhos
  add(sdCapsule(x, y, z, x0 - 6, top - 6, 6, x1 + 6, top - 6, 6, 7), S.SHUTTER);
  for (const sx of [x0 - 3, x1 + 3]) add(sdRoundBox(x, y, z, sx, (top + FLOOR) / 2, 1.5, 2.2, (FLOOR - top) / 2, 1.5, 0.5), S.RAIL);
}
// o toldo listrado por cima da porta
function awning(x, y, z) {
  const x0 = 300;
  const x1 = 596;
  const t = Math.max(0, Math.min(1, z / 36));
  const yy = 24 + t * 20;
  const scal = 36 + Math.abs(Math.sin(((x - x0) / 18.5) * Math.PI)) * 3;
  const d = Math.max(x0 - x, x - x1, Math.abs(y - yy) - 1.2, -z, z - scal);
  add(d * 0.9, Math.floor((x - x0) / 18.5) % 2 ? S.AWN_W : S.AWN_R);
  for (const sx of [x0 + 4, x1 - 4]) add(sdCapsule(x, y, z, sx, 24, 0, sx, 44, 34, 0.9), S.RAIL);
}
// as placas: a pintada do BAR DO CANTO, a lousa do HOJE e o FIADO
const SIGN = { x0: 608, x1: 826, y0: 36, y1: 80 };
const CHALK = { x0: 636, x1: 708, y0: 98, y1: 162 };
const FIADO = { x0: 218, x1: 306, y0: 82, y1: 112 };
function signs(x, y, z) {
  add(sdRoundBox(x, y, z, (SIGN.x0 + SIGN.x1) / 2, (SIGN.y0 + SIGN.y1) / 2, 1.4, (SIGN.x1 - SIGN.x0) / 2, (SIGN.y1 - SIGN.y0) / 2, 1.4, 0.8), S.SIGN_EDGE);
  add(sdRoundBox(x, y, z, (SIGN.x0 + SIGN.x1) / 2, (SIGN.y0 + SIGN.y1) / 2, 2.4, (SIGN.x1 - SIGN.x0) / 2 - 3, (SIGN.y1 - SIGN.y0) / 2 - 3, 0.6, 0.4), S.SIGN);
  add(sdRoundBox(x, y, z, (CHALK.x0 + CHALK.x1) / 2, (CHALK.y0 + CHALK.y1) / 2, 1.6, (CHALK.x1 - CHALK.x0) / 2, (CHALK.y1 - CHALK.y0) / 2, 1.6, 0.8), S.CHALK_FRAME);
  add(sdRoundBox(x, y, z, (CHALK.x0 + CHALK.x1) / 2, (CHALK.y0 + CHALK.y1) / 2, 3, (CHALK.x1 - CHALK.x0) / 2 - 3.5, (CHALK.y1 - CHALK.y0) / 2 - 3.5, 0.6, 0.3), S.CHALK);
  const fc = (FIADO.x0 + FIADO.x1) / 2;
  add(sdRoundBox(x, y, z, fc, (FIADO.y0 + FIADO.y1) / 2, 4, (FIADO.x1 - FIADO.x0) / 2, (FIADO.y1 - FIADO.y0) / 2, 1.6, 1), S.FIADO);
  add(sdSphere(x, y, z, fc, FIADO.y0 - 14, 2, 2), S.NAIL);
  add(sdCapsule(x, y, z, FIADO.x0 + 10, FIADO.y0 + 1, 5, fc, FIADO.y0 - 14, 3, 0.7), S.STRING);
  add(sdCapsule(x, y, z, FIADO.x1 - 10, FIADO.y0 + 1, 5, fc, FIADO.y0 - 14, 3, 0.7), S.STRING);
}
// o poste, os fios e as bandeirinhas de festa
const POLE = { x: 858, z: 24 };
const wireY = (x, y0, y1, sag) => {
  const t = Math.max(0, Math.min(1, (x + 80) / (POLE.x + 80)));
  return y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
};
function poleWires(x, y, z) {
  add(sdRoundCone(x, y, z, POLE.x, FLOOR, POLE.z, POLE.x, -60, POLE.z, 6.5, 4.5), S.POLE);
  add(sdRoundBox(x, y, z, POLE.x - 3, -24, POLE.z, 8, 1.5, 1.5, 0.5), S.POLE);
  if (x < POLE.x + 4) {
    add(Math.hypot(y - wireY(x, -36, -20, 10), z - POLE.z) - 0.8, S.WIRE);
    add(Math.hypot(y - wireY(x, -24, -10, 8), z - POLE.z) - 0.8, S.WIRE);
  }
}
const FLAGS = [S.FLAG_R, S.FLAG_Y, S.FLAG_G, S.FLAG_B, S.FLAG_O];
function bunting(x, y, z) {
  const x0 = 212;
  const x1 = 850;
  const fz = 30;
  const t = (x - x0) / (x1 - x0);
  const sag = -22 + Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 8;
  if (x > x0 - 4 && x < x1 + 4) add(Math.hypot(y - sag, z - fz) - 0.6, S.WIRE);
  const n = 20;
  const k = Math.round(t * (n + 1));
  if (k < 1 || k > n) return;
  const fx = x0 + ((x1 - x0) * k) / (n + 1);
  const fy = -22 + Math.sin((k / (n + 1)) * Math.PI) * 8;
  const tri = sdPoly2(
    [
      [fx - 6, fy],
      [fx + 6, fy],
      [fx, fy + 12],
    ],
    x,
    y,
  );
  add(Math.max(tri, Math.abs(z - fz - Math.sin(x * 0.3) * 0.6) - 0.6), FLAGS[k % 5]);
}

// ------------------------------------------------------------------ a moto parada de lado
const MOTO = { x: 834, z: 96 };
function torusZ(x, y, z, cx, cy, cz, R, r) {
  return Math.hypot(Math.hypot(x - cx, y - cy) - R, z - cz) - r;
}
function moto(x, y, z) {
  const { x: mx, z: mz } = MOTO;
  for (const wx of [mx - 30, mx + 28]) {
    add(torusZ(x, y, z, wx, FLOOR - 12, mz, 9, 3.4), S.TIRE);
    add(Math.max(Math.hypot(x - wx, y - (FLOOR - 12)) - 5.5, Math.abs(z - mz) - 1.4), S.CHROME);
  }
  // o corpo, o banco, o tanque, o motor e o escapamento
  add(sdRoundBox(x, y, z, mx, FLOOR - 32, mz, 24, 7, 5.5, 4), S.MOTO);
  add(sdRoundBox(x, y, z, mx + 12, FLOOR - 41, mz, 15, 3, 6, 2.6), S.SEAT);
  add(sdEllipsoid(x, y, z, mx - 10, FLOOR - 40, mz, 11, 5, 6), S.MOTO);
  add(sdRoundBox(x, y, z, mx, FLOOR - 20, mz, 9, 6, 4.5, 2), S.CHROME);
  add(sdCapsule(x, y, z, mx - 6, FLOOR - 14, mz + 6, mx + 34, FLOOR - 16, mz + 6, 2), S.CHROME);
  // os para-lamas
  for (const wx of [mx - 30, mx + 28]) add(Math.max(Math.abs(Math.hypot(x - wx, y - (FLOOR - 12)) - 13.6) - 1.3, y - (FLOOR - 15), Math.abs(z - mz) - 3.6), S.MOTO);
  // o garfo, o guidão, o farol e o retrovisor
  add(sdCapsule(x, y, z, mx - 30, FLOOR - 12, mz, mx - 24, FLOOR - 52, mz, 1.6), S.CHROME);
  add(sdCapsule(x, y, z, mx - 24, FLOOR - 54, mz - 12, mx - 24, FLOOR - 54, mz + 12, 1.3), S.CHROME);
  add(sdSphere(x, y, z, mx - 29, FLOOR - 49, mz, 4.2), S.LAMP_GLASS);
  add(sdCapsule(x, y, z, mx - 24, FLOOR - 54, mz - 10, mx - 22, FLOOR - 62, mz - 12, 0.7), S.CHROME);
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  // o chão só para a frente da fachada (atrás é céu)
  add(Math.max(FLOOR - y, -z - 0.5), S.STONE);
  group(x, y, z, [-90, 10, -8, W + 90, FLOOR, 8], walls);
  group(x, y, z, [26, 58, -4, 110, 126, 12], houseWindow);
  group(x, y, z, [DOOR.x0 - 16, DOOR.top - 16, -DOOR.depth - 2, DOOR.x1 + 16, FLOOR, 16], barDoor);
  group(x, y, z, [296, 20, -2, 600, 48, 42], awning);
  group(x, y, z, [FIADO.x0 - 2, SIGN.y0 - 2, 0, SIGN.x1 + 2, CHALK.y1 + 2, 8], signs);
  group(x, y, z, [-90, -64, POLE.z - 10, POLE.x + 14, FLOOR, POLE.z + 10], poleWires);
  group(x, y, z, [206, -26, 26, 856, 2, 34], bunting);
  group(x, y, z, [48, FLOOR - 120, 12, 116, FLOOR, 72], (a, b, c) => chairStack(a, b, c, 82, 42, 5, S.CHAIR_W));
  group(x, y, z, [116, FLOOR - 76, 24, 176, FLOOR, 74], (a, b, c) => {
    crate(a, b, c, 146, FLOOR, 48, S.CRATE, S.CRATE_BOTTLE);
    crate(a, b, c, 146, FLOOR - 19, 48, S.CRATE);
  });
  group(x, y, z, [756, FLOOR - 80, 34, 816, FLOOR, 92], (a, b, c) => plasticChair(a, b, c, 786, 62, S.CHAIR_R));
  group(x, y, z, [MOTO.x - 50, FLOOR - 66, MOTO.z - 16, MOTO.x + 50, FLOOR, MOTO.z + 16], moto);
  return acc.D;
}
export const shade = (x, y, z) => Math.min(scene(x, y, z), tableD(x, y, z));

// ------------------------------------------------------------------ o sol (alto, à esquerda, na frente) e o céu
export const LIGHTS = [
  { p: [-1500, -2700, 1700], c: [1, 0.95, 0.82], k: 0.8, R: 1e7, shadow: true },
  // a lâmpada lá dentro do bar
  { p: [(DOOR.x0 + DOOR.x1) / 2, 60, -40], c: [1, 0.82, 0.55], k: 0.9, R: 70, max: 220 },
];
export const AMB = [0.5, 0.53, 0.58];
export const EMISSIVE = new Set();

const C = {
  [S.WALL_BLUE]: ['#4a8ebc'], [S.WALL_YEL]: ['#e8a83a'], [S.WALL_GREY]: ['#a8b4a2'], [S.CORNICE]: ['#8a4a1a'],
  [S.TRIM_RED]: ['#b8301e'], [S.WINDOW]: ['#8ab8d4', 'metal'], [S.WIN_FRAME]: ['#f0ece0'], [S.SILL]: ['#d8d4c8'],
  [S.LEAF]: ['#3a9a4a'], [S.FLOWER]: ['#e84a6a'], [S.INSIDE]: ['#3a2a20'], [S.SHELF]: ['#6a4220'],
  [S.BOTTLE_G]: ['#2a7a3a', 'metal'], [S.BOTTLE_B]: ['#5a2e14', 'metal'], [S.LABEL]: ['#e8c040'], [S.COUNTER]: ['#8a3a24'],
  [S.COUNTER_TOP]: ['#d8d0c0'], [S.SHUTTER]: ['#9aa4a8', 'metal'], [S.RAIL]: ['#6a7478', 'metal'], [S.AWN_R]: ['#d8301e'],
  [S.AWN_W]: ['#f4ece0'], [S.SIGN]: ['#f4ead0'], [S.SIGN_EDGE]: ['#3a2410'], [S.CHALK]: ['#1e3a26'], [S.CHALK_FRAME]: ['#8a6a3a'],
  [S.FIADO]: ['#2e5a3a'], [S.STRING]: ['#c8b890'], [S.NAIL]: ['#8a8a8a', 'metal'], [S.POLE]: ['#b8b4a8'], [S.WIRE]: ['#1a1a22'],
  [S.FLAG_R]: ['#e8261c'], [S.FLAG_Y]: ['#f8c830'], [S.FLAG_G]: ['#2a9a4a'], [S.FLAG_B]: ['#2a6ad8'], [S.FLAG_O]: ['#f86a2a'],
  [S.STONE]: ['#e4e0d4'], [S.STONE_D]: ['#3a3a42'], [S.CHAIR_W]: ['#f0f0ec'], [S.CHAIR_R]: ['#c82a22'], [S.CRATE]: ['#e8b820'], [S.CRATE_BOTTLE]: ['#5a2e14', 'metal'],
  [S.MOTO]: ['#c8261c', 'metal'], [S.TIRE]: ['#1a1a1c'], [S.CHROME]: ['#c8ccd0', 'metal'], [S.SEAT]: ['#2a2420'],
  [S.LAMP_GLASS]: ['#f4f0d8', 'metal'], [S.FILTER]: ['#b8643a'], [S.GLASS]: ['#d8e8e8', 'metal'],
};

function decals(ctx) {
  const { W: w, H: h, mat } = ctx;
  // a calçada de pedra portuguesa em ondas (preto e branco), com as pedrinhas
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.STONE) continue;
      const [wx, wz] = planeAt(x + 0.5, y + 0.5, FLOOR);
      const v = wz + 11 * Math.sin(wx * 0.055) + 3 * Math.sin(wx * 0.13 + 1);
      const band = (((Math.floor(v / 19) % 2) + 2) % 2) === 0;
      const stone = hash2(Math.floor(wx / 3.2), Math.floor(wz / 3.2));
      const gap = (wx / 3.2) % 1 < 0.18 || (wz / 3.2) % 1 < 0.18;
      let t = ctx.tone[p] + (gap ? -1 : stone > 0.75 ? 1 : 0);
      if (wz < 2) t -= 2;
      ctx.set(p, band ? ctx.colorOf(p, ctx.RAMP[S.STONE_D], t) : ctx.colorOf(p, ctx.RAMP[S.STONE], t));
    }
  // o rodapé vermelho da fachada e as manchas de chuva escorrendo
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.WALL_YEL) continue;
      if (y > FLOOR - 26) ctx.set(p, ctx.colorOf(p, ctx.RAMP[S.TRIM_RED], y < FLOOR - 24 ? ctx.tone[p] + 1 : ctx.tone[p]));
      else if (hash2(Math.floor(x / 3), 1) > 0.86 && y < 26 + hash2(Math.floor(x / 3), 2) * 40) nudge(ctx, p, -1);
    }
  // as letras: a placa pintada, a lousa e o fiado
  const sc = (SIGN.x0 + SIGN.x1) / 2;
  textAt(ctx, 'BAR DO CANTO', sc, SIGN.y0 + 8, 3, [184, 38, 28], new Set([S.SIGN]), 3);
  textAt(ctx, 'DESDE 1978', sc, SIGN.y0 + 28, 3, [42, 74, 138], new Set([S.SIGN]), 2);
  const cc = (CHALK.x0 + CHALK.x1) / 2;
  textAt(ctx, 'HOJE', cc, CHALK.y0 + 8, 3.3, [244, 230, 176], new Set([S.CHALK]), 2);
  textAt(ctx, 'TORRESMO', cc, CHALK.y0 + 22, 3.3, [255, 255, 255], new Set([S.CHALK]), 1);
  textAt(ctx, 'PASTEL', cc, CHALK.y0 + 32, 3.3, [255, 255, 255], new Set([S.CHALK]), 1);
  textAt(ctx, 'CALDO', cc, CHALK.y0 + 42, 3.3, [248, 208, 80], new Set([S.CHALK]), 1);
  const fc = (FIADO.x0 + FIADO.x1) / 2;
  textAt(ctx, 'FIADO', fc, FIADO.y0 + 5, 5.7, [244, 230, 176], new Set([S.FIADO]), 2);
  textAt(ctx, 'SO AMANHA', fc, FIADO.y0 + 18, 5.7, [232, 192, 80], new Set([S.FIADO]), 1);
}

export const PIXEL = {
  colors: C,
  steps: [0.2, 0.34, 0.48, 0.62, 0.84],
  dither: new Set([S.WALL_YEL, S.WALL_BLUE, S.WALL_GREY, S.STONE, S.INSIDE, S.AWN_R, S.AWN_W]),
  spec: new Set([S.WINDOW, S.BOTTLE_G, S.BOTTLE_B, S.SHUTTER, S.RAIL, S.MOTO, S.CHROME, S.LAMP_GLASS, S.GLASS, S.NAIL]),
  flats: new Set([S.STONE, S.WALL_YEL, S.WALL_BLUE, S.WALL_GREY]),
  noEdge: new Set([S.STONE, S.WALL_YEL, S.WALL_BLUE, S.WALL_GREY, S.TRIM_RED]),
  decals,
  skyEdge: true,
  vignette: { start: 0.62, k: 1.1, max: 0.45 },
};
