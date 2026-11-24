// A cabeça paramétrica (a do Tio Zé generalizada): o crânio, o queixo de cada tipo, o nariz, os
// olhos e pálpebras, as sobrancelhas, as orelhas, a boca; o cabelo, o chapéu, o bigode e a barba,
// os óculos, os brincos e o cigarro. A mesma cabeça serve de frente e de perfil (`side`).
// Coordenadas: x para a esquerda dele (direita da tela de frente), y para baixo, z para a frente.
import { M, acc, add } from './kit.mjs';
import { clamp, sdCapsule, sdEllipsoid, sdPoly2, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from './sdf.mjs';

export const EYE_Y = 68.6;
export const EYE_Z = 18.2;

const JAWS = {
  // queixo: caixa [meio y, meio z, metades x y z, raio], maçã [x, raios], queixinho [y, z, raios],
  // focinho [y, raios], a boca (y) e o comprimento do rosto
  square: { box: [86.2, 1, 23.8, 14.6, 15, 9.5], cheek: [72.5, 11.5, 9.5, 9.5], chin: [101.4, 15, 10.5, 6.5, 8], muzzle: [92.2, 15.5, 9, 9], mouth: 95.4 },
  round: { box: [85.6, 1.5, 24.4, 13.8, 14.5, 12.5], cheek: [72, 12.6, 10.2, 10], chin: [99.8, 14.6, 11.6, 7.2, 8], muzzle: [91.6, 15.5, 9, 9.2], mouth: 94.6 },
  long: { box: [89, 1, 21.8, 16.6, 14.5, 9], cheek: [73.5, 10.4, 9.8, 9], chin: [105.4, 14.6, 9.6, 6.6, 7.6], muzzle: [94.4, 14.5, 9.4, 8.8], mouth: 97.6 },
  heavy: { box: [87, 1, 26.6, 15.4, 15.8, 9], cheek: [71, 12.4, 10, 10], chin: [102.2, 14.6, 13.4, 7.6, 8.6], muzzle: [92.8, 16.5, 9.4, 9.4], mouth: 96 },
  thin: { box: [87.4, 2, 20.4, 15, 13.4, 8.2], cheek: [74, 9.6, 8.6, 8.6], chin: [103.4, 15.6, 8.2, 6.6, 7.6], muzzle: [93.2, 13.4, 8.6, 8.6], mouth: 96.6 },
};

const NOSES = {
  // [dorso de, dorso até, raios] [ponta y z raios] [asas x y z raios]
  big: { bridge: [63, 23.5, 79, 30, 4, 5], tip: [81.8, 30.6, 7.6, 6.2, 6.4], wing: [7.2, 84, 26, 4.2, 3.5, 4.2], nost: [4, 86.8, 28.4] },
  hook: { bridge: [62.5, 23.6, 75, 32.6, 3.6, 4.8], bridge2: [75, 32.6, 82.6, 31, 4.6, 3.6], tip: [82.6, 30, 5.4, 5.2, 5], wing: [6, 84.8, 25.4, 3.6, 3, 3.6], nost: [3.4, 86.6, 27.4] },
  mid: { bridge: [63.5, 23.2, 78, 28.6, 3.4, 4.3], tip: [80.6, 28.8, 5.8, 4.8, 5.2], wing: [5.8, 82.8, 25, 3.6, 3, 3.6], nost: [3.2, 85, 26.6] },
  fem: { bridge: [64.5, 23, 78.4, 27.6, 2.8, 3.5], tip: [80.6, 27.6, 4.6, 4, 4.4], wing: [4.8, 82.6, 24.6, 3, 2.6, 3], nost: [2.8, 84.6, 25.6] },
};

const BROWS = {
  // [dentro x y z, meio x y, fora x y z, raios]
  tio: { a: [84.8, 61, 26.6], m: [76, 61.8], b: [67.6, 62.8, 22.4], r: [3.5, 2.5] },
  plain: { a: [84.6, 61.4, 26.4], m: [76, 61.2], b: [67.8, 62.6, 22.4], r: [2.7, 2.1] },
  arched: { a: [84.4, 61.8, 26.4], m: [76.4, 59, 26.4], b: [68, 61.8, 22.4], r: [2.4, 2] },
  angry: { a: [85, 63.6, 26.6], m: [76.5, 61.4], b: [68, 59.6, 22.6], r: [3, 2.3] },
  soft: { a: [84.4, 61.4, 26.2], m: [76.2, 60.2], b: [68.2, 62, 22.4], r: [1.9, 1.6] },
  sad: { a: [84.4, 59.4, 26.4], m: [76.4, 60.4], b: [68.2, 63.6, 22.4], r: [2.5, 2] },
};

/** A cara do momento (o humor): a pálpebra, as sobrancelhas, o olhar e o cigarro na boca. */
export function faceOf(P, mood) {
  const f = { lid: P.lid, lowLid: P.lowLid, brow: [[0, 0], [0, 0]], gaze: [0, 0.12, 1], cig: true, mood };
  if (mood === 'blink') f.lid = 9;
  if (mood === 'thinking') {
    f.lid = P.lid - 0.7;
    f.brow = [[0.6, 0.4], [-1.8, -3.2]];
    f.gaze = [0, -0.2, 0.98];
  }
  if (mood === 'smug') {
    f.lid = Math.max(P.lid, -0.4) + 1;
    f.brow = [[0.9, 0.2], [0.9, 0.2]];
  }
  if (mood === 'laugh') {
    f.lid = 9;
    f.brow = [[-0.8, -0.4], [-0.8, -0.4]];
  }
  if (mood === 'hurt') {
    f.lid = 9;
    f.brow = [[-2.6, 1.2], [-2.6, 1.2]];
    f.cig = false;
  }
  return f;
}

// os cachinhos do cabelo cacheado: [x, y, z, raio] (em volta do contorno e os caracóis dos lados)
const CURLS = (() => {
  const out = [];
  for (let i = 0; i < 11; i += 1) {
    const a = -Math.PI * 0.95 + (i / 10) * Math.PI * 0.9;
    out.push([88 + Math.cos(a) * 33 * (1 + (i % 2) * 0.04), 54 + Math.sin(a) * 33, -2 + (i % 3) * 3, 6.4 + (i % 2) * 1.2]);
  }
  for (const s of [-1, 1])
    for (const [dx, y, z, r] of [
      [27, 80, 2, 7.6],
      [31, 88, -4, 7.2],
      [28, 96, 0, 6.6],
      [32, 103, -6, 6.4],
      [27, 110, -2, 5.6],
      [22, 86, -10, 7],
    ])
      out.push([88 + s * dx, y, z, r]);
  return out;
})();

export function makeHead(P) {
  const J = JAWS[P.jaw] ?? JAWS.square;
  const N = NOSES[P.nose] ?? NOSES.mid;
  const B = BROWS[P.brow] ?? BROWS.plain;
  const fem = P.fem;
  const cr = fem ? [28.6, 30.6, 27.6] : [29.6, 31.5, 28.4];
  const eyeR = fem ? 6.5 : 6.2;
  const EL = [76.5, EYE_Y, EYE_Z];
  const ER = [99.5, EYE_Y, EYE_Z];
  const mouthY = J.mouth;
  const jawScale = fem ? 0.84 : 1;
  P.mouthY = mouthY;
  P.chinY = J.chin[0] + J.chin[3];

  function headD(x, y, z, side, F) {
    let d = sdEllipsoid(x, y, z, 88, 57, -1, ...cr);
    const [by, bz, hx, hy, hz, rr] = J.box;
    const hzS = side ? hz - 4 : hz;
    const bzS = side ? bz + 4 : bz;
    d = smin(d, sdRoundBox(x, y, z, 88, by, bzS, hx * jawScale, hy, hzS, rr), 9);
    const [cx, crr, cry, crz] = J.cheek;
    const cR = (side ? crr * 0.82 : crr) * (fem ? 0.84 : 1);
    const cX = (side ? cx + 1.8 : cx) + (fem ? 2.4 : 0);
    const cY = fem ? 76.5 : 78.5;
    d = smin(d, sdEllipsoid(x, y, z, cX, cY, 12, cR, cry * (fem ? 0.9 : 1), crz), 6);
    d = smin(d, sdEllipsoid(x, y, z, 176 - cX, cY, 12, cR, cry * (fem ? 0.9 : 1), crz), 6);
    d = smin(d, sdEllipsoid(x, y, z, 88, 61.6, 19.6, 23, fem ? 3.6 : 4.4, 7), 5); // o arco das sobrancelhas
    d = smax(d, -sdEllipsoid(x, y, z, EL[0], 68.5, 26.6, 7.6, 6, fem ? 5.4 : 6.2), 3); // órbitas
    d = smax(d, -sdEllipsoid(x, y, z, ER[0], 68.5, 26.6, 7.6, 6, fem ? 5.4 : 6.2), 3);
    // o nariz
    const [b0, bz0, b1, bz1, br0, br1] = N.bridge;
    d = smin(d, sdRoundCone(x, y, z, 88, b0, bz0, 88, b1, bz1, br0, br1), 3);
    if (N.bridge2) d = smin(d, sdRoundCone(x, y, z, 88, N.bridge2[0], N.bridge2[1], 88, N.bridge2[2], N.bridge2[3], N.bridge2[4], N.bridge2[5]), 2);
    const [ty, tz, trx, try_, trz] = N.tip;
    d = smin(d, sdEllipsoid(x, y, z, 88, ty, tz, trx, try_, trz), 2.5);
    const [wx, wy, wz, wrx, wry, wrz] = N.wing;
    d = smin(d, sdEllipsoid(x, y, z, 88 - wx, wy, wz, wrx, wry, wrz), 2);
    d = smin(d, sdEllipsoid(x, y, z, 88 + wx, wy, wz, wrx, wry, wrz), 2);
    const [nx, ny, nz] = N.nost;
    d = smax(d, -sdEllipsoid(x, y, z, 88 - nx, ny, nz, 2, 1.3, 2.4), 0.8);
    d = smax(d, -sdEllipsoid(x, y, z, 88 + nx, ny, nz, 2, 1.3, 2.4), 0.8);
    // a boca e o queixo
    const [my, mrx, mry, mrz] = J.muzzle;
    d = smin(d, sdEllipsoid(x, y, z, 88, my, 19, mrx * jawScale, mry, mrz), 6);
    const [chy, chz, chrx, chry, chrz] = J.chin;
    d = smin(d, sdEllipsoid(x, y, z, 88, chy - (fem ? 1 : 0), chz, chrx * jawScale * (fem ? 0.86 : 1), chry * (fem ? 0.92 : 1), chrz), 5);
    if (P.jaw === 'heavy') {
      // as bochechas caídas (papada) nos cantos do queixo
      d = smin(d, sdEllipsoid(x, y, z, 67.5, 93, 4, 6, 7, 8), 5);
      d = smin(d, sdEllipsoid(x, y, z, 108.5, 93, 4, 6, 7, 8), 5);
    }
    // o rosto jovem (delas): a bochecha cheia, sem o vão entre a maçã do rosto e o queixo
    if (P.youth) {
      d = smin(d, sdEllipsoid(x, y, z, 88, 85, 8.5, 17.6 * (side ? 0.92 : 1), 12.5, 14), 7);
      d = smin(d, sdEllipsoid(x, y, z, 74.8, 80.5, 14, 7.4, 6.8, 8), 6);
      d = smin(d, sdEllipsoid(x, y, z, 101.2, 80.5, 14, 7.4, 6.8, 8), 6);
    }
    // as bolsas embaixo dos olhos
    if (P.bags) {
      d = smin(d, sdEllipsoid(x, y, z, 76, 75.4, 22, 6.2, P.bags, 2.3), 2);
      d = smin(d, sdEllipsoid(x, y, z, 100, 75.4, 22, 6.2, P.bags, 2.3), 2);
    }
    // a nuca
    d = smin(d, sdEllipsoid(x, y, z, 88, 74, -14, 22, 18, 14), 8);
    // a boca aberta (falando, apanhando): um corte na frente da boca
    if (F.open) d = smax(d, -sdEllipsoid(x, y, z, 88, mouthY + 1.4, 25, F.open[0], F.open[1], 4), 1);
    return d;
  }

  function eyelids(x, y, z, e, F) {
    const [cx, cy, cz] = e;
    const out = Math.sign(cx - 88);
    const line = cy + F.lid + (x - cx) * out * (P.lidTilt ?? 0.14);
    let up = sdSphere(x, y, z, cx, cy, cz, eyeR + 0.85);
    up = smax(up, y - line, 0.6);
    let lo = sdSphere(x, y, z, cx, cy, cz, eyeR + 0.55);
    lo = smax(lo, cy + F.lowLid - y, 0.6);
    return Math.min(up, lo);
  }

  function earD(x, y, z, cx, side) {
    const s = Math.sign(cx - 88);
    const k = P.ear ?? 1;
    let d = sdEllipsoid(x, y, z, cx, 74, -1.5, 4.4 * k, 10.2 * k, 7.2 * k);
    if (!side) return smax(d, -sdEllipsoid(x, y, z, cx + s * 0.6, 74.5, 3.2, 2.5, 6.4 * k, 3.4), 1.2);
    const ez = -8.5;
    d = sdEllipsoid(x, y, z, cx - s * 0.4, 74, ez, 3.4, 9.8 * k, 6.2 * k);
    d = smin(d, sdEllipsoid(x, y, z, cx + s * 0.6, 70.2, ez - 2.8, 3.4, 6.8 * k, 3.2), 2);
    d = smin(d, sdEllipsoid(x, y, z, cx + s * 0.2, 82.2, ez + 1.6, 2.8, 3.2, 2.8), 1.5);
    d = smax(d, -sdEllipsoid(x, y, z, cx + s * 3.4, 75.6, ez + 2.2, 2.2, 4.4, 2.8), 1.1);
    d = smax(d, -sdEllipsoid(x, y, z, cx + s * 3.7, 69.6, ez - 0.4, 1.4, 3.6, 1.9), 0.8);
    return d;
  }

  function browD(x, y, z, F) {
    const [[li, lo], [ri, ro]] = F.brow;
    const t = P.thickBrows ? 1.22 : fem ? 0.72 : 1;
    const one = (s, inn, outr) => {
      const X = (v) => 88 + s * (v - 88);
      const a = [X(B.a[0]), B.a[1] + inn, B.a[2]];
      const m = [X(B.m[0]), B.m[1] + (inn + outr) / 2, (B.a[2] + B.b[2]) / 2 + 1.4];
      const b = [X(B.b[0]), B.b[1] + outr, B.b[2]];
      const rm = (B.r[0] + B.r[1]) / 2;
      return Math.min(sdRoundCone(x, y, z, ...a, ...m, B.r[0] * t, rm * t), sdRoundCone(x, y, z, ...m, ...b, rm * t, B.r[1] * t));
    };
    return Math.min(one(-1, li, lo), one(1, ri, ro));
  }

  // ------------------------------------------------------------------ bigode e barba
  function stacheD(x, y, z, side) {
    const st = P.stache;
    if (!st) return 1e9;
    const dy = mouthY - 95.4;
    if (st === 'thin') {
      const l = sdRoundCone(x, y, z, 87, 90.6 + dy, 27.6, 79, 92.6 + dy, 24.8, 1.5, 1);
      const r = sdRoundCone(x, y, z, 89, 90.6 + dy, 27.6, 97, 92.6 + dy, 24.8, 1.5, 1);
      return smin(l, r, 1);
    }
    if (st === 'handlebar') {
      let d = sdEllipsoid(x, y, z, 88, 89.8 + dy, 28.4, 4.6, 2.6, 2.8);
      for (const s of [-1, 1]) {
        const X = (v) => 88 + s * (v - 88);
        d = smin(d, sdRoundCone(x, y, z, X(85), 90 + dy, 28, X(77), 91.4 + dy, 25.4, 2.4, 1.6), 1.5);
        d = smin(d, sdRoundCone(x, y, z, X(77), 91.4 + dy, 25.4, X(71.6), 88.4 + dy, 22.6, 1.6, 1.1), 1);
        d = smin(d, sdSphere(x, y, z, X(71.4), 86.6 + dy, 22.2, 1.25), 0.8);
      }
      return d;
    }
    const big = st === 'gold' ? 1.12 : 1;
    if (side) {
      let d = sdEllipsoid(x, y, z, 88, 88.6 + dy, 29.4, 6.4 * big, 4.4 * big, 4.2);
      d = smin(d, sdRoundCone(x, y, z, 85, 88.4 + dy, 29.4, 76.5, 95.6 + dy, 23.6, 4.8 * big, 2.4), 2.4);
      d = smin(d, sdRoundCone(x, y, z, 91, 88.4 + dy, 29.4, 99.5, 95.6 + dy, 23.6, 4.8 * big, 2.4), 2.4);
      d = smin(d, sdEllipsoid(x, y, z, 84.5, 92 + dy, 28.6, 4.6, 3.6, 3.4), 2);
      return d;
    }
    let d = sdEllipsoid(x, y, z, 88, 88.2 + dy, 29.6, 6 * big, 3.8 * big, 3.6);
    d = smin(d, sdRoundCone(x, y, z, 85.5, 88 + dy, 29.6, 88 - 13.5 * big, 93 + dy, 25.2, 4.6 * big, 2.6), 2.2);
    d = smin(d, sdRoundCone(x, y, z, 90.5, 88 + dy, 29.6, 88 + 13.5 * big, 93 + dy, 25.2, 4.6 * big, 2.6), 2.2);
    return d;
  }
  function beardD(x, y, z, hd, side) {
    if (!P.beard) return 1e9;
    // uma casca em cima do queixo e das bochechas de baixo, com o vão da boca
    const ax = Math.abs(x - 88);
    const top = 82 + Math.max(0, 14 - ax) * 0.45 - (ax > 22 ? (ax - 22) * 0.9 : 0);
    let d = smax(Math.abs(hd - 1.8) - 2, top - y, 1.5);
    d = smax(d, -z - 9 + Math.max(0, y - 95) * 0.3, 1.5);
    d = smin(d, sdEllipsoid(x, y, z, 88, P.chinY + 1.2, 13.5, 11.5, 6.2, 8), 3);
    if (P.beard === 'long') d = smin(d, sdRoundCone(x, y, z, 88, P.chinY + 2, 12, 88, P.chinY + 22, 9, 10.5, 6.5), 5);
    // a boca fica livre
    d = smax(d, -sdEllipsoid(x, y, z, 88, mouthY + 0.8, 26, 6.5, 2.4, 6), 1);
    return d;
  }

  // ------------------------------------------------------------------ o cabelo
  const HC = P.hairStyle;
  const hatBase = P.hatBase ?? 99;
  function hairD(x, y, z, side) {
    if (!HC || HC === 'none') return 1e9;
    const ax = Math.abs(x - 88);
    const under = (d) => (P.hat ? smax(d, hatBase - 1 - y, 1) : d);
    // o rosto fica livre (a linha do cabelo na testa e as costeletas)
    const face = (d, front = 13, line = 45) => {
      d = smax(d, z - (front - Math.max(0, 27 - ax) * 2.2) - (y < line ? 40 : 0), 1.2);
      return d;
    };
    if (HC === 'bald') {
      // só a coroa dos lados e de trás, embaixo da careca
      let d = sdEllipsoid(x, y, z, 88, 58, -3, 30.6, 31.4, 29.4);
      d = smax(d, 54 - y + Math.max(0, -z - 10) * 0.2, 1.5);
      d = smax(d, y - 84, 1.5);
      d = smax(d, z - 4, 1.5);
      return under(d);
    }
    let shell = sdEllipsoid(x, y, z, 88, 56.5, -2, 30.4, 32.6, 29.8);
    shell = smin(shell, sdEllipsoid(x, y, z, 88, 73, -14.5, 22.8, 17.5, 15), 6);
    const back = clamp((-z - 6) / 10, 0, 1);
    const sideLim = (ax > 25.5 ? 81 : 74) + back * (88 - (ax > 25.5 ? 81 : 74));
    let d = smax(shell, y - sideLim, 1.5);
    // o rosto fica livre: na frente (z > 4), abaixo da linha do cabelo; dos lados a costeleta
    // vai até z 13
    const line = 43.5 + (P.hairLine ?? 0) + Math.max(0, ax - 10) * 0.16;
    const faceCut = (dd, ln = line) => smax(dd, Math.min(z - 4 - (ax > 24 ? 9 : 0), y - ln), 1.2);
    d = faceCut(d);
    if (HC === 'slick' || HC === 'side' || HC === 'thin' || HC === 'crew' || HC === 'short') {
      if (HC === 'slick') d = smin(d, faceCut(smax(sdEllipsoid(x, y, z, 88, 50, -4, 31.6, 27.6, 30.8), y - 62, 2), line - 1), 3);
      if (HC === 'side') {
        d = smin(d, faceCut(sdEllipsoid(x, y, z, 92, 37, 4, 25, 11, 23), line - 3), 4);
        d = smin(d, faceCut(smax(sdEllipsoid(x, y, z, 88, 50, -4, 31.2, 27.4, 30.4), y - 62, 2)), 3);
      }
      if (HC === 'short') d = smin(d, faceCut(smax(sdEllipsoid(x, y, z, 88, 52, -2, 31, 28.8, 30.4), y - 60, 2)), 3);
      if (HC === 'crew') d = smin(d, faceCut(smax(sdEllipsoid(x, y, z, 88, 54, -2, 30.5, 30.8, 29.7), y - 60, 2)), 3);
      if (HC === 'thin') d = smax(d, 50 - y + Math.max(0, -z) * 0.25, 2);
      return under(d);
    }
    if (HC === 'bun' || HC === 'volume' || HC === 'curly') {
      // o cabelo armado: uma casca grossa e cheia de cachos; o coque em cima
      const R = HC === 'volume' ? 1.14 : HC === 'curly' ? 1.18 : 1.12;
      let big = sdEllipsoid(x, y, z, 88, 52, -3, 30 * R, 30 * R, 29 * R);
      // os cachos: bolhas na superfície (fixas, por célula)
      const cell = 6.5;
      const bump = Math.sin(x / cell * 2.3) * Math.sin(y / cell * 2.1) * Math.sin((z + 3) / cell * 2.2) * 1.6;
      big += bump;
      const bottom = HC === 'curly' ? 110 : HC === 'volume' ? 86 : 80;
      big = smax(big, y - bottom + Math.max(0, z - 2) * (HC === 'curly' ? 1.4 : 0.9), 2);
      // a testa e o rosto livres
      big = smax(big, Math.min(z - 2 - (ax > 26 ? 12 : 0), y - line - 1), 1.4);
      if (HC === 'bun') big = smin(big, sdSphere(x, y, z, 88, 18.5, -8, 11.5) + bump * 0.6, 4);
      if (HC === 'curly') {
        // os cachos: cachinhos soltos em volta do contorno e os caracóis caindo dos lados até o ombro
        for (const [cx, cy, cz, r] of CURLS) big = smin(big, sdSphere(x, y, z, cx, cy, cz, r) + bump * 0.5, 2.2);
      }
      return under(big);
    }
    if (HC === 'long') {
      // o cabelo comprido: a casca da cabeça e as mechas descendo atrás dos ombros
      d = smin(d, faceCut(smax(sdEllipsoid(x, y, z, 88, 52, -2, 31, 28.8, 30.4), y - 60, 2)), 3);
      let fall = sdRoundBox(x, y, z, 88, 96, -12, 31.5, 30, 12, 9);
      fall = smax(fall, z - 6 + Math.max(0, 30 - ax) * 0.7, 2);
      fall += Math.sin(x * 0.9) * 0.7;
      d = smin(d, fall, 6);
      return under(d);
    }
    if (HC === 'bob') {
      // o chanel: volume no alto, a franja reta e cheia, as laterais caindo retas até o queixo (por
      // fora das bochechas, cobrindo as orelhas) e as pontas virando para dentro
      let b = sdEllipsoid(x, y, z, 88, 56, -2, 32.8, 33.5, 31.6);
      const flare = clamp((y - 62) / 34, 0, 1);
      b = smin(b, sdRoundBox(x, y, z, 88, 80, -5, 31.4 + flare * 1.8, 19, 20.5, 11), 7);
      // a barra na altura do queixo, um tico mais comprida na frente
      b = smax(b, y - 98.5 - clamp(z + 4, -26, 14) * 0.13, 2.5);
      // a janela do rosto: as laterais retas por fora das bochechas e a franja em cima das sobrancelhas
      const fr = 57.4 + Math.max(0, ax - 12) * 0.45 + Math.sin(x * 1.3) * 0.35;
      b = smax(b, -Math.max(ax - 22.4, fr - y, 6.5 - z), 1.2);
      // de lado: a frente das laterais desce em diagonal (mais comprida embaixo), sem tapar a bochecha
      b = smax(b, -Math.max(9.5 + Math.max(0, y - 58) * 0.14 - z, fr + 0.5 - y), 1.4);
      return under(b);
    }
    return under(d);
  }

  // ------------------------------------------------------------------ os chapéus
  const H = P.hat;
  function hatD(x, y, z) {
    if (!H) return null;
    const t = H.type;
    if (t === 'fedora' || t === 'panama') {
      const a = 0.07;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const BASE = 41;
      const px0 = x - 88;
      const py0 = y - BASE;
      const px = px0 * ca + py0 * sa;
      const yy = -px0 * sa + py0 * ca + BASE;
      const pz = z + 0.5;
      const tt = clamp((BASE - yy) / 25, 0, 1);
      const rx = 27.2 - 3.6 * tt * tt;
      const rz = 25.2 - 3 * tt * tt;
      const q = (Math.sqrt((px / rx) ** 2 + (pz / rz) ** 2) - 1) * Math.min(rx, rz);
      const top = BASE - (t === 'panama' ? 22.6 : 25.6) + (px * px) / 120 + (pz * pz) / 300;
      let crown = smax(q, smax(yy - (BASE + 1), top - yy, 2), 3);
      crown = smax(crown, -sdEllipsoid(px + 88, yy, z, 88, BASE - (t === 'panama' ? 24 : 27), -2, 5.5, 4.6, 20), 3.2);
      crown = smax(crown, -sdSphere(px + 88, yy, z, 73.5, BASE - 19, 23.2, 5.6), 3.2);
      crown = smax(crown, -sdSphere(px + 88, yy, z, 102.5, BASE - 19, 23.2, 5.6), 3.2);
      const bq = (Math.sqrt((px / (rx + 0.85)) ** 2 + (pz / (rz + 0.85)) ** 2) - 1) * Math.min(rx, rz);
      const band = smax(bq, Math.max(yy - (BASE + 0.8), BASE - 6.6 - yy), 0.8);
      const wide = t === 'panama' ? 0.9 : 1;
      const r = Math.sqrt((px / (47.5 * wide)) ** 2 + (pz / (41 * wide)) ** 2);
      const lift = 0.0125 * Math.max(0, Math.abs(px) - 21) ** 2 + 0.0022 * Math.max(0, -pz - 12) ** 2;
      const dip = 0.0035 * Math.max(0, pz - 6) ** 2;
      const by = BASE + 1.6 - lift + dip;
      const brim = smax(Math.abs(yy - by) - 1.25 - 0.5 * clamp((r - 0.86) * 8, 0, 1), (r - 1) * 38, 1.4);
      return { main: smin(crown, brim, 0.6), band };
    }
    if (t === 'cap' || t === 'police') {
      if (t === 'police') {
        // o quepe: a copa larga e chata, a fita, a pala preta e o distintivo
        let crown = sdRoundBox(x, y, z, 88, 30, 1, 33, 7.5, 31, 5);
        crown = smax(crown, Math.sqrt(((x - 88) / 33.5) ** 2 + ((z - 1) / 31.5) ** 2) * 31 - 31 + Math.max(0, y - 30) * 0.32, 1.5);
        const band = smax(Math.sqrt(((x - 88) / 31) ** 2 + ((z + 0.5) / 29.6) ** 2) * 29.6 - 29.6, Math.max(y - 46, 36.4 - y), 0.8);
        const visor = smax(Math.abs(y - 45.4 - Math.max(0, z - 20) * 0.22) - 1.1, smax(sdEllipsoid(x, y, z, 88, 45, 22, 22, 6, 22), -z + 14, 1), 1);
        return { main: smin(crown, band, 2), band: visor, badge: sdEllipsoid(x, y, z, 88, 33.5, 30.8, 3.2, 3.6, 1.2) };
      }
      // o boné: a cúpula sobre o crânio, o botão, a pala para a frente e o emblema
      let dome = sdEllipsoid(x, y, z, 88, 46, -1.5, 31.4, 23.5, 30.2);
      dome = smax(dome, y - 47.5 + Math.max(0, -z - 10) * 0.06, 1);
      const visorY = 46.6 + Math.max(0, z - 18) * 0.3 + ((x - 88) / 22) ** 2 * 1.6;
      let visor = smax(Math.abs(y - visorY) - 1.1, sdEllipsoid(x, y, z, 88, visorY, 26, 23, 8, 22), 0.8);
      visor = smax(visor, 16 - z, 1);
      return { main: dome, band: visor, badge: H.emblem ? sdEllipsoid(x, y, z, 88, 35.5, 26.6, 4.6, 4.6, 1.4) : 1e9, button: sdSphere(x, y, z, 88, 22.8, -1, 2.2), ticket: H.ticket ? sdRoundBox(x, y, z, 104, 37, 24, 4, 5.6, 0.6, 0.3) : 1e9 };
    }
    if (t === 'beanie') {
      let dome = sdEllipsoid(x, y, z, 88, 50, -1.5, 31.6, 30, 30.4);
      dome = smax(dome, y - 51 + Math.max(0, -z - 4) * 0.05, 1);
      const cuff = smax(sdEllipsoid(x, y, z, 88, 50, -1.5, 32.8, 30, 31.6), Math.max(y - 52, 42.5 - y), 1);
      return { main: smin(dome, cuff, 0.8), band: 1e9, knit: true };
    }
    if (t === 'helmet') {
      let dome = sdEllipsoid(x, y, z, 88, 44, -1, 32, 25, 31);
      dome = smax(dome, y - 44.6, 1);
      dome = smin(dome, smax(sdEllipsoid(x, y, z, 88, 32, -1, 4, 13.5, 31.5), y - 44, 1), 2); // a crista
      const brim = smax(Math.abs(y - 44.6) - 1.3, sdEllipsoid(x, y, z, 88, 44.6, 1, 36.5, 6, 36.5), 1);
      return { main: smin(dome, brim, 1), band: smax(Math.abs(sdEllipsoid(x, y, z, 88, 44, -1, 32.2, 25, 31.2)) - 0.8, Math.max(y - 44, 40 - y), 0.5) };
    }
    if (t === 'safari') {
      let dome = sdEllipsoid(x, y, z, 88, 45, -1, 31, 26, 30.5);
      dome = smax(dome, y - 45, 1);
      const rr = Math.hypot((x - 88) / 1.12, z + 1);
      const brimY = 44.5 + Math.max(0, rr - 26) * 0.32;
      const brim = smax(Math.abs(y - brimY) - 1.2, rr - 41, 1);
      const band = smax(Math.abs(sdEllipsoid(x, y, z, 88, 45, -1, 31.4, 26, 30.9)) - 0.9, Math.max(y - 44.4, 39.5 - y), 0.5);
      return { main: smin(dome, brim, 1.4), band, button: sdSphere(x, y, z, 88, 19.4, -1, 2) };
    }
    if (t === 'straw' || t === 'wide') {
      const wide = t === 'wide';
      const BASE = wide ? 40 : 41;
      const rx = wide ? 26 : 26.5;
      const q = (Math.sqrt(((x - 88) / rx) ** 2 + ((z + 0.5) / (rx - 1.5)) ** 2) - 1) * rx;
      const topY = BASE - (wide ? 14 : 18) + ((x - 88) ** 2) / 160;
      let crown = smax(q, smax(y - BASE - 1, topY - y, 2), 2.5);
      if (!wide) crown = smax(crown, -sdEllipsoid(x, y, z, 88, topY - 2, -1, 5, 4, 16), 2.4);
      const rr = Math.hypot((x - 88) / 1.15, (z + 0.5) / 1);
      const R0 = wide ? 52 : 46;
      const brimY = BASE + 1.4 + (wide ? 0 : Math.max(0, rr - 28) * 0.16) - (wide ? Math.max(0, Math.abs(x - 88) - 36) * 0.06 : 0);
      const brim = smax(Math.abs(y - brimY) - (wide ? 1.1 : 1.3), rr - R0, 1);
      const band = smax(q - 0.8, Math.max(y - BASE - 0.6, BASE - 5.6 - y), 0.6);
      return { main: smin(crown, brim, 1), band, straw: !wide };
    }
    if (t === 'flatcap') {
      let c = sdEllipsoid(x, y, z, 88, 40.5, 3.5, 33, 15, 33.5);
      c = smax(c, y - 46 + Math.max(0, z - 8) * 0.16, 1.2);
      c = smax(c, 29 - y + Math.max(0, z) * 0.02, 1.5);
      const visor = smax(Math.abs(y - 45.6 - Math.max(0, z - 22) * 0.08) - 1, smax(sdEllipsoid(x, y, z, 88, 45.6, 25, 22, 5, 16), 20 - z, 1), 0.8);
      return { main: smin(c, visor, 1.2), band: 1e9, button: sdSphere(x, y, z, 88, 29.6, 4, 1.8) };
    }
    if (t === 'turban') {
      let c = sdEllipsoid(x, y, z, 88, 40, 0, 34, 24, 33);
      c = smax(c, y - 50 + Math.max(0, -z) * 0.05, 1.5);
      // as voltas do pano
      c += Math.sin((y + (x - 88) * 0.5) * 0.55) * 0.9;
      c = smin(c, sdEllipsoid(x, y, z, 88, 22, -2, 21, 10, 20), 6);
      return { main: c, band: 1e9, jewel: sdEllipsoid(x, y, z, 88, 38.5, 33.4, 3.6, 4.4, 2), jewelRing: sdEllipsoid(x, y, z, 88, 38.5, 32.6, 4.8, 5.6, 1.8) };
    }
    if (t === 'goggles') {
      // os óculos de aviador na testa: a tira em volta e as duas lentes redondas
      const strap = smax(Math.abs(sdEllipsoid(x, y, z, 88, 50, -1, 30.6, 31, 29.4)) - 1.3, Math.abs(y - 46 + Math.max(0, z) * 0.06) - 2.6, 0.6);
      let lens = 1e9;
      let rims = 1e9;
      for (const s of [-1, 1]) {
        lens = Math.min(lens, sdEllipsoid(x, y, z, 88 + s * 9.6, 43, 27.6, 6.2, 5.8, 2.6));
        rims = Math.min(rims, smax(Math.abs(sdEllipsoid(x, y, z, 88 + s * 9.6, 43, 26.6, 7.6, 7.2, 3.6)) - 1, -sdEllipsoid(x, y, z, 88 + s * 9.6, 43, 30, 5.8, 5.4, 4), 0.5));
      }
      rims = Math.min(rims, sdCapsule(x, y, z, 84, 43, 28.6, 92, 43, 28.6, 1.3));
      return { main: rims, band: strap, lens };
    }
    if (t === 'headband') {
      const band = smax(Math.abs(sdEllipsoid(x, y, z, 88, 50, -1, 30.6, 31, 29.4)) - 1.6, Math.abs(y - 46.5 + Math.max(0, z) * 0.06) - 3.2, 0.6);
      return { main: band, band: 1e9, terry: true };
    }
    if (t === 'crown') {
      // a coroa de rei sentada em cima do cabelo armado: a faixa, as pontas e as pedras
      const rr = Math.hypot((x - 88) / 1.04, z + 1.5);
      const R0 = 21;
      let c = smax(Math.abs(rr - R0) - 1.5, Math.max(y - 27, 17 - y), 0.6);
      const ang = Math.atan2(z + 1.5, x - 88);
      const spikes = 7 + 9 * Math.abs(Math.sin(ang * 3.5));
      c = Math.min(smax(smax(Math.abs(rr - R0 + 0.6) - 1.3, Math.max(y - 20, spikes - y), 0.4), 0, 0), c);
      c = Math.min(c, smax(Math.abs(rr - R0 - 0.3) - 1.9, Math.abs(y - 25.6) - 1.6, 0.5));
      let gems = 1e9;
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2 + Math.PI / 2;
        gems = Math.min(gems, sdSphere(x, y, z, 88 + Math.cos(a) * (R0 + 1.4) * 1.04, 22, -1.5 + Math.sin(a) * (R0 + 1.4), 1.8));
      }
      let tips = 1e9;
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2 + Math.PI / 2 + Math.PI / 7;
        tips = Math.min(tips, sdSphere(x, y, z, 88 + Math.cos(a) * R0 * 1.04, 6.5, -1.5 + Math.sin(a) * R0, 1.6));
      }
      return { main: Math.min(c, tips), band: 1e9, gems, gold: true };
    }
    if (t === 'hood') {
      let h = sdEllipsoid(x, y, z, 88, 62, -4, 38, 44, 36);
      h = smax(h, -sdEllipsoid(x, y, z, 88, 62, -4, 34.6, 40.6, 32.6), 0.5);
      // a abertura do rosto
      h = smax(h, -sdRoundBox(x, y, z, 88, 78, 30, 24, 33, 20, 12), 2);
      h = smax(h, y - 120, 2);
      return { main: h, band: 1e9 };
    }
    return null;
  }

  // ------------------------------------------------------------------ óculos e brincos
  function glassesD(x, y, z) {
    const g = P.glasses;
    if (!g) return null;
    const t = g.type;
    let frame = 1e9;
    let lens = 1e9;
    const lensZ = 29;
    const one = (cx, s) => {
      if (t === 'round' || t === 'monocle' || t === 'gold') {
        const rx = t === 'gold' ? 7.4 : 6.6;
        const ry = t === 'gold' ? 5.6 : 6.4;
        const ring = smax(Math.abs(sdEllipsoid(x, y, z, cx, 69.2, lensZ, rx, ry, 1.4) + 0) - 0.65, Math.abs(z - lensZ) - 0.9, 0.3);
        frame = Math.min(frame, ring);
        lens = Math.min(lens, sdEllipsoid(x, y, z, cx, 69.2, lensZ - 0.3, rx - 0.7, ry - 0.7, 0.5));
      } else {
        const box = sdRoundBox(x, y, z, cx, 69.4, lensZ, 7.6, 5.6, 0.9, 1.6);
        const inner = sdRoundBox(x, y, z, cx, 69.4, lensZ, 6.4, 4.4, 3, 1.2);
        frame = Math.min(frame, smax(box, -inner, 0.2));
        lens = Math.min(lens, sdRoundBox(x, y, z, cx, 69.4, lensZ - 0.3, 6.6, 4.6, 0.4, 1.2));
      }
      // a haste até a orelha
      frame = Math.min(frame, sdCapsule(x, y, z, cx + s * 7.6, 68.6, lensZ - 0.6, 88 + s * 29.2, 70.5, 0.5, 0.75));
    };
    if (t === 'monocle') {
      one(ER[0], 1);
      // a correntinha descendo
      frame = Math.min(frame, sdCapsule(x, y, z, ER[0] + 5, 74, 25, ER[0] + 10, 96, 20, 0.45));
    } else {
      one(EL[0], -1);
      one(ER[0], 1);
      frame = Math.min(frame, sdRoundCone(x, y, z, EL[0] + 7.2, 68.4, lensZ, 88, 66.6, lensZ + 2.6, 0.8, 0.8)); // a ponte
      frame = Math.min(frame, sdRoundCone(x, y, z, 88, 66.6, lensZ + 2.6, ER[0] - 7.2, 68.4, lensZ, 0.8, 0.8));
    }
    return { frame, lens };
  }
  function earringsD(x, y, z) {
    const e = P.earrings;
    if (!e) return 1e9;
    let d = 1e9;
    for (const cx of [58.6, 117.4]) {
      if (e === 'pearl') d = Math.min(d, sdSphere(x, y, z, cx, 85.4, 0.5, 2.2));
      else d = Math.min(d, smax(Math.abs(sdEllipsoid(x, y, z, cx, 89.5, 0, 0.5, 5.4, 5.4)) - 0.85, Math.abs(x - cx) - 0.9, 0.3));
    }
    return d;
  }

  // ------------------------------------------------------------------ o cigarro / charuto
  function smokeD(x, y, z, side, F) {
    if (!P.smokes || !F.cig) return null;
    const cig = side ? P.cigSide : P.cigFront;
    const r = P.smokes === 'cigar' ? 2.1 : 1.35;
    return { stick: sdCapsule(x, y, z, ...cig.a, ...cig.b, r), ash: sdCapsule(x, y, z, ...cig.b, ...cig.c, r + 0.03), ember: sdSphere(x, y, z, ...cig.e, r - 0.1), band: P.smokes === 'cigar' ? smax(sdCapsule(x, y, z, ...cig.a, ...cig.b, r + 0.25), Math.abs(((x - cig.a[0]) * (cig.b[0] - cig.a[0]) + (y - cig.a[1]) * (cig.b[1] - cig.a[1]) + (z - cig.a[2]) * (cig.b[2] - cig.a[2])) / Math.hypot(cig.b[0] - cig.a[0], cig.b[1] - cig.a[1], cig.b[2] - cig.a[2]) - 4.5) - 1.3, 0.3) : 1e9 };
  }

  /** A cabeça inteira no acumulador. */
  function scene(x, y, z, side, F) {
    const hb = sdSphere(x, y, z, 88, 66, 2, P.headBound ?? 62);
    if (hb > 4) {
      add(hb, M.NONE);
      return;
    }
    const hd = headD(x, y, z, side, F);
    add(hd, M.SKIN);
    add(eyelids(x, y, z, EL, F), M.SKIN, 0.8);
    add(eyelids(x, y, z, ER, F), M.SKIN, 0.8);
    const eye = Math.min(sdSphere(x, y, z, ...EL, eyeR), sdSphere(x, y, z, ...ER, eyeR));
    const [gx, gy, gz] = F.gaze;
    const g = Math.hypot(gx, gy, gz);
    const look = ((x - EL[0]) * gx + (y - EL[1]) * gy + (z - EL[2]) * gz) / (eyeR * g);
    add(eye, side && eye < acc.D && look > 0.76 ? M.IRIS : M.EYE);
    if (HC !== 'bob') add(Math.min(earD(x, y, z, 59.4, side), earD(x, y, z, 116.6, side)), M.SKIN, 2.5);
    // os lábios (de quem não tem bigode, eles aparecem)
    const lipY = mouthY;
    if (!F.open) {
      add(sdEllipsoid(x, y, z, 88, lipY - 0.6, 25.8 + (fem ? 0.6 : 0), fem ? 6.8 : 7.4, fem ? 1.9 : 1.5, 2.4), M.LIP, 1);
      add(sdEllipsoid(x, y, z, 88, lipY + 1.8, 25.2 + (fem ? 0.8 : 0), fem ? 6.4 : 6.6, fem ? 2.3 : 1.8, 2.4), M.LIP, 1);
    } else {
      add(sdEllipsoid(x, y, z, 88, lipY + 1.4 + F.open[1], 23.6, F.open[0] * 0.9, 1.8, 2.4), M.LIP, 1);
      add(sdEllipsoid(x, y, z, 88, lipY - 0.2, 24.2, F.open[0] * 0.92, 1.4, 2.2), M.LIP, 1);
      add(sdEllipsoid(x, y, z, 88, lipY + 1.4, 20.6, F.open[0] * 0.9, F.open[1] * 0.92, 3), M.TEETH);
    }
    add(hairD(x, y, z, side), M.HAIR, 1);
    add(browD(x, y, z, F), M.BROW, 0.8);
    add(stacheD(x, y, z, side), M.STACHE, 0.6);
    if (P.beard) add(beardD(x, y, z, hd, side), M.BEARD, 0.8);
    const h = hatD(x, y, z);
    if (h) {
      add(h.main, h.gold ? M.GOLD : M.HAT, 0.6);
      if (h.band < 1e8) add(h.band, M.HATB);
      if (h.badge !== undefined && h.badge < 1e8) add(h.badge, M.GOLD);
      if (h.button !== undefined) add(h.button, H.type === 'safari' || H.type === 'flatcap' ? M.HAT : M.HATB);
      if (h.ticket !== undefined && h.ticket < 1e8) add(h.ticket, M.P5);
      if (h.lens !== undefined) add(h.lens, M.LENS);
      if (h.gems !== undefined) add(h.gems, M.P5);
      if (h.jewel !== undefined) {
        add(h.jewelRing, M.GOLD);
        add(h.jewel, M.P5);
      }
    }
    const gl = glassesD(x, y, z);
    if (gl) add(gl.frame, M.GLASSF);
    if (P.earrings) add(earringsD(x, y, z), P.earrings === 'pearl' ? M.SILVER : M.GOLD);
    const sm = smokeD(x, y, z, side, F);
    if (sm) {
      add(sm.stick, P.smokes === 'cigar' ? M.P4 : M.CIG);
      add(sm.ash, M.ASH);
      add(sm.ember, M.EMBER);
      if (sm.band < 1e8) add(sm.band, M.GOLD);
    }
  }

  return { scene, EL, ER, eyeR, mouthY };
}
