// O Tio Zé em volume: a cabeça (a mesma de frente e de perfil), o acumulador da cena e os materiais.
// Coordenadas do modelo: x para a esquerda dele (a direita da tela de frente), y para baixo,
// z para a frente (para onde ele olha). O meio da cabeça em x = 88.
import { clamp, sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from './sdf.mjs';

export const M = {
  NONE: 0,
  SKIN: 1,
  LIP: 2,
  EYE: 3,
  HAIR: 4,
  STACHE: 5,
  BROW: 6,
  SHIRT: 7,
  COLLAR: 8,
  HAT: 9,
  BAND: 10,
  CIG: 11,
  EMBER: 12,
  NAIL: 13,
  ASH: 14,
  CHEST: 15,
  UNDER: 16,
  BUTTON: 17,
  PANTS: 18,
  BELT: 19,
  BUCKLE: 20,
  BOOT: 21,
  SOLE: 22,
  WOOD: 23,
  WOODD: 24,
  ARM: 25,
  PACK: 26,
  PANTSD: 27,
  BOOTD: 28,
  CUFF: 29,
  IRIS: 30,
};

// o acumulador: a menor distância e o material dela
export const acc = { D: 1e9, MAT: 0 };
export const reset = () => {
  acc.D = 1e9;
  acc.MAT = 0;
};
export const add = (d, m, k = 0) => {
  if (k > 0) {
    const nd = smin(acc.D, d, k);
    if (d < acc.D) acc.MAT = m;
    acc.D = nd;
  } else if (d < acc.D) {
    acc.D = d;
    acc.MAT = m;
  }
};

export const EYE_L = [76.5, 68.6, 18.2];
export const EYE_R = [99.5, 68.6, 18.2];
export const EYE_RAD = 6.2;
// a cara do momento: a pálpebra, as sobrancelhas ([dentro, fora] de cada uma: + desce), para onde
// o olho de perfil olha e se o cigarro está na boca
export const FACE = { lid: -2.3, brow: [[0, 0], [0, 0]], gaze: [0, 0.12, 1], cig: true };
export const LIDS = FACE;
export function setMood(mood) {
  FACE.lid = -2.3;
  FACE.brow = [[0, 0], [0, 0]];
  FACE.gaze = [0, 0.12, 1];
  FACE.cig = true;
  if (mood === 'blink') FACE.lid = 9;
  if (mood === 'thinking') {
    FACE.lid = -3;
    FACE.brow = [[0.6, 0.4], [-1.8, -3.2]];
    FACE.gaze = [0, -0.2, 0.98];
  }
  if (mood === 'smug') {
    FACE.lid = 0.6;
    FACE.brow = [[0.9, 0.2], [0.9, 0.2]];
  }
  if (mood === 'hurt') {
    FACE.lid = 9;
    FACE.brow = [[-2.6, 1.2], [-2.6, 1.2]];
    FACE.cig = false;
  }
}

function headD(x, y, z, side = false) {
  let d = sdEllipsoid(x, y, z, 88, 57, -1, 29.6, 31.5, 28.4);
  d = smin(d, side ? sdRoundBox(x, y, z, 88, 86.2, 5, 23.8, 14.6, 11, 8.5) : sdRoundBox(x, y, z, 88, 86.2, 1, 23.8, 14.6, 15, 9.5), 9); // o queixo quadrado
  const cr = side ? 9.4 : 11.5; // de perfil a maçã incha menos para o lado
  const cx0 = side ? 74.4 : 72.5;
  d = smin(d, sdEllipsoid(x, y, z, cx0, 78.5, 12, cr, 9.5, 9.5), 6); // maçãs
  d = smin(d, sdEllipsoid(x, y, z, 176 - cx0, 78.5, 12, cr, 9.5, 9.5), 6);
  d = smin(d, sdEllipsoid(x, y, z, 88, 61.6, 19.6, 23, 4.4, 7), 5); // o arco das sobrancelhas
  d = smax(d, -sdEllipsoid(x, y, z, 76.5, 68.5, 26.6, 7.6, 6, 6.2), 3); // órbitas
  d = smax(d, -sdEllipsoid(x, y, z, 99.5, 68.5, 26.6, 7.6, 6, 6.2), 3);
  // o nariz de batata: o dorso, a ponta, as asas e as narinas
  d = smin(d, sdRoundCone(x, y, z, 88, 63, 23.5, 88, 79, 30, 4, 5), 3);
  d = smin(d, sdEllipsoid(x, y, z, 88, 81.8, 30.6, 7.6, 6.2, 6.4), 2.5);
  d = smin(d, sdEllipsoid(x, y, z, 80.8, 84, 26, 4.2, 3.5, 4.2), 2);
  d = smin(d, sdEllipsoid(x, y, z, 95.2, 84, 26, 4.2, 3.5, 4.2), 2);
  d = smax(d, -sdEllipsoid(x, y, z, 84, 86.8, 28.4, 2, 1.3, 2.4), 0.8);
  d = smax(d, -sdEllipsoid(x, y, z, 92, 86.8, 28.4, 2, 1.3, 2.4), 0.8);
  // a boca e o queixo
  d = smin(d, sdEllipsoid(x, y, z, 88, 92.2, 19, 15.5, 9, 9), 6);
  d = smin(d, sdEllipsoid(x, y, z, 88, 101.4, 15, 10.5, 6.5, 8), 5);
  // as bolsas embaixo dos olhos (o cansado)
  d = smin(d, sdEllipsoid(x, y, z, 76, 75.4, 22, 6.2, 2.1, 2.3), 2);
  d = smin(d, sdEllipsoid(x, y, z, 100, 75.4, 22, 6.2, 2.1, 2.3), 2);
  // a nuca: o osso de trás da cabeça descendo até o pescoço
  d = smin(d, sdEllipsoid(x, y, z, 88, 74, -14, 22, 18, 14), 8);
  return d;
}

function eyelids(x, y, z, e, lidY) {
  const [cx, cy, cz] = e;
  const out = Math.sign(cx - 88);
  const line = cy + lidY + (x - cx) * out * 0.14;
  let up = sdSphere(x, y, z, cx, cy, cz, EYE_RAD + 0.85);
  up = smax(up, y - line, 0.6);
  let lo = sdSphere(x, y, z, cx, cy, cz, EYE_RAD + 0.55);
  lo = smax(lo, cy + 3.6 - y, 0.6);
  return Math.min(up, lo);
}

function earD(x, y, z, cx, side = false) {
  const s = Math.sign(cx - 88);
  let d = sdEllipsoid(x, y, z, cx, 74, -1.5, 4.4, 10.2, 7.2);
  if (!side) return smax(d, -sdEllipsoid(x, y, z, cx + s * 0.6, 74.5, 3.2, 2.5, 6.4, 3.4), 1.2); // a concha
  // de perfil a orelha mostra a face de fora (mais para trás que a de frente, atrás do queixo):
  // a hélice em volta, o lóbulo e a concha funda
  const ez = -8.5;
  d = sdEllipsoid(x, y, z, cx - s * 0.4, 74, ez, 3.4, 9.8, 6.2);
  d = smin(d, sdEllipsoid(x, y, z, cx + s * 0.6, 70.2, ez - 2.8, 3.4, 6.8, 3.2), 2);
  d = smin(d, sdEllipsoid(x, y, z, cx + s * 0.2, 82.2, ez + 1.6, 2.8, 3.2, 2.8), 1.5);
  d = smax(d, -sdEllipsoid(x, y, z, cx + s * 3.4, 75.6, ez + 2.2, 2.2, 4.4, 2.8), 1.1); // a concha
  d = smax(d, -sdEllipsoid(x, y, z, cx + s * 3.7, 69.6, ez - 0.4, 1.4, 3.6, 1.9), 0.8); // a fossa de cima
  return d;
}

function hairD(x, y, z) {
  // o cabelo curto que aparece embaixo do chapéu: as laterais, a nuca e a costeleta
  let d = sdEllipsoid(x, y, z, 88, 56.5, -2, 30.2, 32.6, 29.6);
  d = smin(d, sdEllipsoid(x, y, z, 88, 73, -14.5, 22.8, 17.5, 15), 6);
  const ax = Math.abs(x - 88);
  d = smax(d, 40 - y, 1); // embaixo do chapéu
  // até a costeleta dos lados; atrás desce até a nuca
  const back = clamp((-z - 6) / 10, 0, 1);
  const limit = (ax > 25.5 ? 81 : 74) + back * (88 - (ax > 25.5 ? 81 : 74));
  d = smax(d, y - limit, 1.5);
  d = smax(d, z - (13 - Math.max(0, 27 - ax) * 2.2), 1.2); // não cobre o rosto
  return d;
}

function hatD(x, y, z) {
  const a = 0.07;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const BASE = 41;
  const px0 = x - 88;
  const py0 = y - BASE;
  const px = px0 * ca + py0 * sa;
  const yy = -px0 * sa + py0 * ca + BASE;
  const pz = z + 0.5;
  const t = clamp((BASE - yy) / 25, 0, 1);
  const rx = 27.2 - 3.6 * t * t;
  const rz = 25.2 - 3 * t * t;
  const q = (Math.sqrt((px / rx) ** 2 + (pz / rz) ** 2) - 1) * Math.min(rx, rz);
  const top = BASE - 25.6 + (px * px) / 120 + (pz * pz) / 300;
  let crown = smax(q, smax(yy - (BASE + 1), top - yy, 2), 3);
  crown = smax(crown, -sdEllipsoid(px + 88, yy, z, 88, BASE - 27, -2, 5.5, 4.6, 20), 3.2);
  crown = smax(crown, -sdSphere(px + 88, yy, z, 73.5, BASE - 19, 23.2, 5.6), 3.2);
  crown = smax(crown, -sdSphere(px + 88, yy, z, 102.5, BASE - 19, 23.2, 5.6), 3.2);
  const bq = (Math.sqrt((px / (rx + 0.85)) ** 2 + (pz / (rz + 0.85)) ** 2) - 1) * Math.min(rx, rz);
  const band = smax(bq, Math.max(yy - (BASE + 0.8), BASE - 6.6 - yy), 0.8);
  // a aba: sobe nos lados, desce na frente (o "snap") e levanta um pouco atrás
  const r = Math.sqrt((px / 47.5) ** 2 + (pz / 41) ** 2);
  const lift = 0.0125 * Math.max(0, Math.abs(px) - 21) ** 2 + 0.0022 * Math.max(0, -pz - 12) ** 2;
  const dip = 0.0035 * Math.max(0, pz - 6) ** 2;
  const by = BASE + 1.6 - lift + dip;
  const brim = smax(Math.abs(yy - by) - 1.25 - 0.5 * clamp((r - 0.86) * 8, 0, 1), (r - 1) * 38, 1.4);
  return { crown, band, brim };
}

function stacheD(x, y, z, side = false) {
  if (side) {
    // de perfil: o bigodão caído por cima da boca, a ponta descendo até o canto
    let d = sdEllipsoid(x, y, z, 88, 88.6, 29.4, 6.4, 4.4, 4.2);
    d = smin(d, sdRoundCone(x, y, z, 85, 88.4, 29.4, 76.5, 95.6, 23.6, 4.8, 2.4), 2.4);
    d = smin(d, sdRoundCone(x, y, z, 91, 88.4, 29.4, 99.5, 95.6, 23.6, 4.8, 2.4), 2.4);
    d = smin(d, sdEllipsoid(x, y, z, 84.5, 92, 28.6, 4.6, 3.6, 3.4), 2);
    return d;
  }
  let d = sdEllipsoid(x, y, z, 88, 88.2, 29.6, 6, 3.8, 3.6);
  d = smin(d, sdRoundCone(x, y, z, 85.5, 88, 29.6, 74.5, 93, 25.2, 4.6, 2.6), 2.2);
  d = smin(d, sdRoundCone(x, y, z, 90.5, 88, 29.6, 101.5, 93, 25.2, 4.6, 2.6), 2.2);
  return d;
}
function browD(x, y, z) {
  const [[li, lo], [ri, ro]] = FACE.brow;
  const l = sdRoundCone(x, y, z, 84.8, 61 + li, 26.6, 67.6, 62.8 + lo, 22.4, 3.5, 2.5);
  const r = sdRoundCone(x, y, z, 91.2, 61 + ri, 26.6, 108.4, 62.8 + ro, 22.4, 3.5, 2.5);
  return Math.min(l, r);
}

/** O cigarro: de frente, no canto esquerdo da boca, apontando para fora; de perfil, para a frente. */
export const CIGS = {
  front: { a: [99.2, 94.4, 26.6], b: [111.6, 98.2, 32.8], c: [113.6, 98.8, 33.8], e: [114.2, 99, 34.1] },
  side: { a: [83.2, 96.2, 25.4], b: [83.8, 100.4, 40.6], c: [83.9, 100.9, 42.6], e: [84, 101.1, 43.4] },
};

/** A cabeça inteira (com o chapéu e o cigarro `cig`) no acumulador. */
export function headScene(x, y, z, cig = CIGS.front, side = false) {
  const hb = sdSphere(x, y, z, 88, 70, 4, 56);
  if (hb > 4) {
    add(hb, M.NONE);
    return;
  }
  add(headD(x, y, z, side), M.SKIN);
  add(eyelids(x, y, z, EYE_L, LIDS.lid), M.SKIN, 0.8);
  add(eyelids(x, y, z, EYE_R, LIDS.lid), M.SKIN, 0.8);
  const eye = Math.min(sdSphere(x, y, z, ...EYE_L, EYE_RAD), sdSphere(x, y, z, ...EYE_R, EYE_RAD));
  // de perfil a íris é do próprio olho (olhando para a frente, um tico para baixo)
  const [gx, gy, gz] = FACE.gaze;
  const g = Math.hypot(gx, gy, gz);
  const look = ((x - EYE_L[0]) * gx + (y - EYE_L[1]) * gy + (z - EYE_L[2]) * gz) / (EYE_RAD * g);
  add(eye, side && eye < acc.D && look > 0.76 ? M.IRIS : M.EYE);
  add(Math.min(earD(x, y, z, 59.4, side), earD(x, y, z, 116.6, side)), M.SKIN, 2.5);
  add(sdEllipsoid(x, y, z, 88, 95.4, 24.6, 7.8, 2.3, 2.6), M.LIP, 1.2);
  add(hairD(x, y, z), M.HAIR, 1);
  add(browD(x, y, z), M.BROW, 0.8);
  add(stacheD(x, y, z, side), M.STACHE, 0.6);
  const h = hatD(x, y, z);
  add(h.crown, M.HAT);
  add(h.band, M.BAND);
  add(h.brim, M.HAT, 0.6);
  if (!FACE.cig) return;
  add(sdCapsule(x, y, z, ...cig.a, ...cig.b, 1.35), M.CIG);
  add(sdCapsule(x, y, z, ...cig.b, ...cig.c, 1.38), M.ASH);
  add(sdSphere(x, y, z, ...cig.e, 1.25), M.EMBER);
}

export function neckD(x, y, z, lean = 0) {
  // `lean`: o pé do pescoço mais para trás (de perfil, o pescoço sai do tronco inclinado)
  let d = sdCapsule(x, y, z, 88, 96, -5, 88, 126, -8 - lean, 15.8);
  d = smin(d, sdRoundCone(x, y, z, 71, 89, -3, 84.5, 119, 6.5 - lean * 0.4, 3.8, 2.8), 4); // esternocleido
  d = smin(d, sdRoundCone(x, y, z, 105, 89, -3, 91.5, 119, 6.5 - lean * 0.4, 3.8, 2.8), 4);
  d = smin(d, sdEllipsoid(x, y, z, 88, 106.5, 9.6 - lean * 0.15, 3.2, 4.4, 3), 2); // o gogó
  return d;
}

