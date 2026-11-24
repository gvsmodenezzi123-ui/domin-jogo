// O kit dos personagens em volume: os materiais (papéis), o acumulador da cena, as rampas de cor
// (7 tons com o matiz andando: sombra para o roxo/vermelho, luz para o amarelo) e a rotação.
import { smin } from './sdf.mjs';

export const M = {
  NONE: 0,
  SKIN: 1,
  LIP: 2,
  EYE: 3,
  IRIS: 4,
  HAIR: 5,
  BROW: 6,
  STACHE: 7,
  BEARD: 8,
  HAT: 9,
  HATB: 10,
  HATC: 11,
  TOP: 12,
  TOPB: 13,
  SHIRT: 14,
  COLLAR: 15,
  BUTTON: 16,
  TIE: 17,
  GOLD: 18,
  SILVER: 19,
  GLASSF: 20,
  LENS: 21,
  EARRING: 22,
  CIG: 23,
  ASH: 24,
  EMBER: 25,
  NAIL: 26,
  CHEST: 27,
  PANTS: 28,
  PANTSD: 29,
  BELT: 30,
  BUCKLE: 31,
  SHOE: 32,
  SHOED: 33,
  SOLE: 34,
  WOOD: 35,
  WOODD: 36,
  P1: 37,
  P2: 38,
  P3: 39,
  P4: 40,
  P5: 41,
  SCARF: 42,
  BOA: 43,
  APRON: 44,
  PACK: 45,
  TEETH: 46,
  CUFF: 47,
  SLEEVE: 48,
  PLASTIC: 49,
  PLASTICD: 50,
  SKIN2: 51,
};

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

// ------------------------------------------------------------------ as cores
export const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
export const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function toHsv([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}
function fromHsv(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255].map((v2) => Math.round(v2));
}
const toward = (h, t, deg) => {
  const d = ((t - h + 540) % 360) - 180;
  if (Math.abs(d) <= deg) return t;
  return h + Math.sign(d) * deg;
};
const cl = (v) => Math.max(0, Math.min(1, v));

/**
 * 7 tons a partir da cor de base (o tom 4 é a base). `kind`: 'skin' (a sombra puxa para o
 * vermelho), 'cloth' (para o roxo), 'metal' (o ouro: sombra marrom, luz quase branca), 'hair',
 * 'glow' (cores que brilham, sem sombra suja).
 */
export function ramp(base, kind = 'cloth') {
  const [h, s, v] = toHsv(hex(base));
  const out = [];
  const dark = v < 0.32;
  for (let i = 0; i < 7; i += 1) {
    let vv;
    let ss;
    let hh;
    if (kind === 'skin') {
      const m = v < 0.55 ? [0.25, 0.44, 0.63, 0.81, 0.96, 1.12, 1.3] : [0.23, 0.42, 0.62, 0.8, 0.957, 1.075, 1.18];
      vv = v * m[i];
      if (v < 0.3) vv = v * [0.3, 0.5, 0.68, 0.84, 1, 1.35, 1.8][i] + [0, 0, 0, 0, 0, 0.02, 0.06][i];
      ss = s * [1.03, 1.13, 1.11, 1.14, 1.07, 0.96, 0.74][i];
      hh = h + [-21, -15, -13, -8, -4, 0, 4][i];
      if (s < 0.08) hh = h;
    } else if (kind === 'metal') {
      vv = v * [0.3, 0.48, 0.66, 0.82, 0.95, 1.06, 1.14][i];
      ss = s * [1.1, 1.12, 1.08, 1.02, 0.95, 0.75, 0.42][i];
      hh = toward(h, i < 4 ? 15 : 58, [18, 12, 7, 3, 0, 4, 8][i]);
    } else if (v > 0.8) {
      // as cores claras: a base é o tom 5, as sombras se espalham embaixo
      vv = i < 5 ? v * [0.36, 0.54, 0.7, 0.84, 0.94][i] : i === 5 ? v : v + (1 - v) * 0.6;
      ss = s * [1.3, 1.25, 1.18, 1.1, 1.04, 1, 0.6][i] + (s < 0.08 ? [0.14, 0.11, 0.08, 0.05, 0.02, 0, 0][i] : 0);
      const tgt = kind === 'hair' ? 300 : 262;
      hh = s < 0.08 ? (i < 5 ? tgt : 50) : i < 5 ? toward(h, tgt, [16, 11, 7, 4, 1][i]) : toward(h, 50, [0, 6][i - 5]);
    } else {
      const lift = dark ? [0, 0, 0, 0, 0.02, 0.05, 0.07] : [0, 0, 0, 0, 0, 0, 0];
      vv = i < 4 ? v * [0.32, 0.5, 0.68, 0.84][i] : v + (1 - v) * [0.03, 0.12, 0.25][i - 4] + lift[i];
      if (dark) vv = Math.max(vv, [0.045, 0.07, 0.1, 0.14, 0, 0, 0][i]);
      ss = s * [1.15, 1.14, 1.1, 1.05, 1, 0.92, kind === 'hair' ? 0.86 : 0.8][i];
      const tgt = kind === 'hair' ? 300 : 272;
      hh = s < 0.08 ? tgt : i < 4 ? toward(h, tgt, [14, 10, 6, 3][i]) : toward(h, 50, [0, 3, 7][i - 4]);
      if (s < 0.08) ss = Math.max(ss, [0.16, 0.12, 0.09, 0.06, s, s * 0.9, s * 0.8][i]);
      if (kind === 'glow') {
        vv = i < 4 ? v * [0.45, 0.62, 0.78, 0.9][i] : Math.min(1, v + (1 - v) * [0.05, 0.35, 0.7][i - 4]);
        hh = h;
      }
    }
    out.push(fromHsv(hh, cl(ss), cl(vv)));
  }
  return out;
}

// ------------------------------------------------------------------ rotação
/** A matriz de rotação de Euler (x, depois y, depois z), em radianos. */
export function rotation(ax, ay, az) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)];
  // R = Rz * Ry * Rx
  return [
    [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
    [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
    [-sy, cy * sx, cy * cx],
  ];
}
/** O ponto do mundo `p` no quadro local (origem `o`, rotação `R`): Rᵀ (p − o). */
export function toLocal(R, o, x, y, z) {
  const dx = x - o[0];
  const dy = y - o[1];
  const dz = z - o[2];
  return [R[0][0] * dx + R[1][0] * dy + R[2][0] * dz, R[0][1] * dx + R[1][1] * dy + R[2][1] * dz, R[0][2] * dx + R[1][2] * dy + R[2][2] * dz];
}
export const mul = (A, B) => A.map((row, i) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
export const apply = (R, v) => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];
