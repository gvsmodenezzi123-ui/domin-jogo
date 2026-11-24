// A mão articulada: a palma, os quatro dedos (três falanges cada, dobrando para o lado da palma) e
// o polegar, num quadro local (u: do polegar para o mindinho, v: do pulso para os dedos, w: para
// fora da palma). As poses dos gestos e de segurar os objetos. Unidades: pixels finos.
import { apply, mul, rotation, toLocal } from './kit.mjs';
import { sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smin } from './sdf.mjs';

const D = Math.PI / 180;
// os dedos: [u da junta, raio, comprimentos das 3 falanges]
const FINGERS = [
  [-5.1, 2.15, [7.8, 4.8, 3.8]],
  [-1.7, 2.25, [8.6, 5.2, 4]],
  [1.8, 2.1, [8, 4.8, 3.8]],
  [5, 1.85, [6.4, 3.8, 3.2]],
];

/** As poses: ângulos (graus) de cada dedo [junta1, junta2, junta3, abertura] e os pontos do polegar. */
const TH = {
  open: [[-6, 4.5, 1.2], [-10, 8.8, 2.2], [-13, 12.4, 2.8], [-15.4, 15.6, 3.2]],
  wave: [[-6, 4.5, 1.2], [-10.4, 8.2, 2], [-13.8, 11.2, 2.4], [-16.4, 14.2, 2.6]],
  relaxed: [[-6, 4.5, 1.2], [-9, 8.6, 3.2], [-10.6, 12, 4.6], [-11.2, 15, 5.8]],
  fist: [[-6, 4.5, 1.2], [-7, 9, 4.6], [-3.6, 12.6, 7.4], [0.4, 14, 8.6]],
  thumbsUp: [[-6, 5, 1.2], [-11.4, 7.2, 2], [-17, 8.6, 2.4], [-22, 9.6, 2.4]],
  hold: [[-6, 4.5, 1.2], [-7.2, 9.2, 4.6], [-5.4, 12.8, 7.6], [-2.8, 15, 9.4]],
  pinch: [[-6, 4.5, 1.2], [-8.4, 9.6, 3.8], [-8.6, 14, 6.4], [-7.2, 17.4, 8.4]],
  cup: [[-6, 4.5, 1.2], [-9.6, 8.6, 3.4], [-11.6, 12, 5.2], [-12.4, 15.2, 6.6]],
  chest: [[-6, 4.5, 1], [-9.4, 8.6, 1.6], [-12, 12, 1.8], [-13.8, 15.2, 1.8]],
};
export const POSES = {
  open: { f: [[2, 4, 2, -6], [0, 3, 2, -1], [2, 4, 2, 4], [4, 6, 3, 10]], thumb: TH.open },
  wave: { f: [[0, 3, 2, -8], [0, 2, 1, -2], [0, 3, 2, 5], [2, 4, 2, 12]], thumb: TH.wave },
  relaxed: { f: [[14, 20, 10, -4], [16, 24, 12, 0], [18, 26, 12, 4], [22, 28, 14, 8]], thumb: TH.relaxed },
  fist: { f: [[86, 100, 62, -2], [88, 102, 62, 0], [88, 102, 62, 2], [86, 100, 60, 4]], thumb: TH.fist },
  thumbsUp: { f: [[86, 100, 62, -2], [88, 102, 62, 0], [88, 102, 62, 2], [86, 100, 60, 4]], thumb: TH.thumbsUp },
  middle: { f: [[86, 100, 62, -2], [0, 2, 2, 0], [88, 102, 62, 2], [86, 100, 60, 4]], thumb: TH.fist },
  hold: { f: [[62, 74, 42, -2], [64, 76, 42, 0], [66, 78, 42, 2], [68, 78, 40, 4]], thumb: TH.hold },
  pinch: { f: [[42, 48, 26, -4], [58, 72, 40, 0], [70, 80, 46, 3], [76, 84, 48, 6]], thumb: TH.pinch },
  cup: { f: [[22, 28, 14, -6], [24, 30, 16, -1], [26, 32, 16, 4], [28, 34, 18, 9]], thumb: TH.cup },
  chest: { f: [[8, 10, 6, -5], [6, 8, 5, -1], [8, 10, 6, 4], [10, 12, 6, 8]], thumb: TH.chest },
};

/** A mão `pose` (com `k` de escala), em coordenadas locais. Devolve a distância. */
export function handLocal(u, v, w, pose, k = 1) {
  u /= k;
  v /= k;
  w /= k;
  let d = sdRoundBox(u, v, w, 0, 8, 0.4, 7.4, 7.8, 2.7, 2.6);
  // o volume da base do polegar (tenar) e do pulso
  d = smin(d, sdEllipsoid(u, v, w, -4.6, 4.4, 1.6, 3.4, 4.4, 3), 2);
  d = smin(d, sdEllipsoid(u, v, w, 0, 0.4, 0, 6.2, 2.6, 3.4), 2);
  let f = 1e9;
  for (let i = 0; i < 4; i += 1) {
    const [fu, r, L] = FINGERS[i];
    const [a1, a2, a3, sp] = pose.f[i];
    // cada falange gira em volta de u (dobra para +w); a abertura gira em volta de w
    let p = [fu, 15.4, 0.2];
    let ang = 0;
    const sa = Math.sin(sp * D);
    const ca = Math.cos(sp * D);
    for (let j = 0; j < 3; j += 1) {
      ang += [a1, a2, a3][j] * D;
      const dv = Math.cos(ang) * L[j];
      const dw = Math.sin(ang) * L[j];
      const q = [p[0] + sa * dv, p[1] + ca * dv, p[2] + dw];
      const rr = r * [1, 0.92, 0.84][j];
      f = Math.min(f, sdRoundCone(u, v, w, ...p, ...q, rr, rr * 0.93));
      p = q;
    }
  }
  d = smin(d, f, 1.2);
  const T = pose.thumb;
  const R = [2.9, 2.5, 2.2];
  let th = 1e9;
  for (let j = 0; j < 3; j += 1) th = Math.min(th, sdRoundCone(u, v, w, ...T[j], ...T[j + 1], R[j], R[j] * 0.92));
  d = smin(d, th, 1.6);
  return d * k;
}

/** A base da mão no mundo: o pulso `W`, para onde os dedos apontam (`fwd`) e a palma (`palm`). */
export function handFrame(W, fwd, palm) {
  const n = (a) => {
    const l = Math.hypot(...a) || 1;
    return a.map((c) => c / l);
  };
  const v = n(fwd);
  // w: a palma, tirando a parte que vai na direção dos dedos
  const d0 = palm[0] * v[0] + palm[1] * v[1] + palm[2] * v[2];
  const w = n([palm[0] - d0 * v[0], palm[1] - d0 * v[1], palm[2] - d0 * v[2]]);
  const u = [v[1] * w[2] - v[2] * w[1], v[2] * w[0] - v[0] * w[2], v[0] * w[1] - v[1] * w[0]];
  // R: as colunas são u, v, w no mundo
  const R = [
    [u[0], v[0], w[0]],
    [u[1], v[1], w[1]],
    [u[2], v[2], w[2]],
  ];
  return { R, W };
}

/** A distância da mão no mundo. `mirror`: a mão esquerda (espelha o u). */
export function handWorld(x, y, z, frame, pose, k = 1, mirror = false) {
  // a esfera que envolve a mão: longe dela, a distância até a esfera basta
  if (!frame.c) {
    const v = [frame.R[0][1], frame.R[1][1], frame.R[2][1]];
    frame.c = [frame.W[0] + v[0] * 13 * k, frame.W[1] + v[1] * 13 * k, frame.W[2] + v[2] * 13 * k];
  }
  const db = Math.hypot(x - frame.c[0], y - frame.c[1], z - frame.c[2]) - 25 * k;
  if (db > 3) return db;
  const [u, v, w] = toLocal(frame.R, frame.W, x, y, z);
  return handLocal(mirror ? -u : u, v, w, POSES[pose] ?? pose, k);
}

export { apply, mul, rotation };
