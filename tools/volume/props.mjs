// Os objetos de cada personagem, em volume (de frente): o botijão, o taco, o pneu, a pedra grande, o
// gancho, a caneta na orelha, a concha, a navalha, a moeda, a carteira, a bola de cristal, a poção,
// a chave inglesa, o chicote, a rifa, a chave da van, o caderninho, o cassetete, a pá, o livro-caixa
// e o pano de balcão. Os que vão na mão trazem o braço erguido (a mão de lá, à direita da tela).
import { M, add, ramp } from './kit.mjs';
import { handFrame } from './hands.mjs';
import { clamp, sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from './sdf.mjs';

const torus = (x, y, z, cx, cy, cz, R, r, axis = 'z') => {
  const dx = x - cx;
  const dy = y - cy;
  const dz = z - cz;
  const [a, b, c] = axis === 'z' ? [dx, dy, dz] : axis === 'x' ? [dy, dz, dx] : [dx, dz, dy];
  return Math.hypot(Math.hypot(a, b) - R, c) - r;
};
/** O braço de lá (s = 1) ou de cá (s = −1) erguido: o cotovelo embaixo da mesa, a mão em `wrist`. */
const arm = (s, wrist, fwd, palm, pose, k = 1.12) => ({ s, elbow: [88 + s * 62, 178, 12], wrist, hand: { frame: handFrame(wrist, fwd, palm), pose, k, mirror: s > 0 } });

export const PROPS = {
  tonho: {
    colors: { [M.P1]: '#4a6ad0', [M.P2]: '#f0e8d0' },
    scene(x, y, z) {
      if (x > 44) return;
      let b = sdRoundCone(x, y, z, 20, 104, -24, 20, 170, -24, 15, 15.5);
      add(b, M.P1);
      add(smax(sdRoundCone(x, y, z, 20, 104, -24, 20, 170, -24, 15.4, 15.9), Math.abs(y - 128) - 3.2, 0.5), M.P2);
      add(sdCapsule(x, y, z, 20, 86, -24, 20, 94, -24, 4.4), M.SILVER);
      add(torus(x, y, z, 20, 83, -24, 6.4, 1.5, 'x'), M.SILVER);
    },
  },
  baiano: {
    // o taco de sinuca em pé, seguro na mão: a ponteira azul de giz, o anel branco, a madeira clara
    // e o cabo escuro com o desenho
    colors: { [M.P1]: '#d8b070', [M.P2]: '#3a6ad0', [M.P3]: '#f4f0e6', [M.P4]: '#3a1e10' },
    arms: [arm(1, [146, 126, 22], [-0.1, -1, 0.1], [-1, 0, 0.2], 'hold')],
    scene(x, y, z) {
      if (x < 134 || x > 162) return;
      const A = [143.6, 178, 25.4];
      const B = [149.4, 12, 26.6];
      const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
      const [mx, my, mz] = at(0.36);
      add(sdRoundCone(x, y, z, ...A, mx, my, mz, 3.6, 2.9), M.P4);
      const [tx, ty, tz] = at(0.965);
      add(sdRoundCone(x, y, z, mx, my, mz, tx, ty, tz, 2.9, 1.9), M.P1);
      const [fx, fy, fz] = at(0.985);
      add(sdCapsule(x, y, z, tx, ty, tz, fx, fy, fz, 2), M.P3);
      add(sdCapsule(x, y, z, fx, fy, fz, ...B, 2.05), M.P2);
    },
  },
  valdir: {
    colors: { [M.P1]: '#2a2a2e', [M.P2]: '#16161a' },
    scene(x, y, z) {
      if (x < 116) return;
      const ang = Math.atan2(y - 104, x - 150);
      add(torus(x, y, z, 150, 104, -28, 21, 8.6) + (Math.sin(ang * 14) > 0.3 ? -0.5 : 0.4) * clamp((Math.hypot(x - 150, y - 104) - 24) / 5, 0, 1), M.P1);
      add(smax(sdEllipsoid(x, y, z, 150, 104, -28, 12.6, 12.6, 3.2), -sdEllipsoid(x, y, z, 150, 104, -24, 4, 4, 3), 0.5), M.SILVER);
      add(sdEllipsoid(x, y, z, 150, 104, -27, 3.6, 3.6, 2.4), M.P2);
    },
  },
  arlindo: {
    colors: { [M.P1]: '#f2e8c8', [M.P2]: '#1a1008' },
    arms: [arm(-1, [34, 132, 24], [0.15, -1, 0.25], [1, 0, 0.3], 'hold')],
    scene(x, y, z) {
      if (x > 56) return;
      let t = sdRoundBox(x, y, z, 30, 100, 27, 11.5, 21, 2.8, 2.6);
      // as pintas (buraquinhos) e o risco do meio
      let pips = 1e9;
      for (const [px, py] of [
        [25, 85],
        [35, 85],
        [30, 90],
        [25, 95],
        [35, 95],
        [25, 107],
        [30, 112],
        [35, 117],
      ])
        pips = Math.min(pips, sdSphere(x, y, z, px, py, 30.2, 2.1));
      t = smax(t, -pips, 0.4);
      t = smax(t, -smax(Math.abs(y - 101) - 0.6, z - 31.5 + 1.4, 0.2), 0.3);
      add(t, M.P1);
      add(smax(pips + 0.4, -sdRoundBox(x, y, z, 30, 100, 26.4, 11, 20.6, 2.6, 2.4), 0.2), M.P2);
    },
  },
  marcao: {
    colors: {},
    scene(x, y, z) {
      if (x > 34) return;
      for (let i = 0; i < 8; i += 1) add(torus(x, y, z, 16, 60 + i * 8.6, -22, 4.2, 1.5, i % 2 ? 'x' : 'z'), M.SILVER);
      let hook = smax(torus(x, y, z, 16.5, 138, -22, 6.4, 2.2), -smax(x - 16.5, 138 - y, 0.5), 0.5);
      hook = Math.min(hook, sdSphere(x, y, z, 23, 136, -22, 2.4));
      add(hook, M.SILVER);
    },
  },
  serginho: { colors: { [M.P1]: '#2a6ad0' }, scene: (x, y, z) => earPen(x, y, z) },
  paulinho: { colors: { [M.P1]: '#e6c34a' }, scene: (x, y, z) => earPen(x, y, z) },
  juvenal: { colors: { [M.P1]: '#2a3a8a' }, scene: (x, y, z) => earPen(x, y, z) },
  cida: {
    // a concha de sopa erguida na mão: o cabo de inox e a concha cheia de caldo
    colors: { [M.P2]: '#8a4a1c' },
    arms: [arm(1, [146, 130, 24], [-0.1, -1, 0.1], [-1, 0, 0.2], 'hold')],
    scene(x, y, z) {
      if (x < 128 || y > 150) return;
      add(sdCapsule(x, y, z, 146.4, 146, 25.6, 151.6, 86, 21, 2.3), M.SILVER);
      add(sdCapsule(x, y, z, 151.6, 86, 21, 153.4, 76.6, 17.4, 2.1), M.SILVER);
      // a concha: a metade de baixo de uma esfera oca, inclinada para a gente ver o caldo
      const rim = (y - 76) - (z - 27) * 0.32;
      const shell = Math.abs(sdSphere(x, y, z, 153, 76, 27, 12)) - 1.2;
      add(smax(shell, -rim, 0.6), M.SILVER);
      add(smax(sdSphere(x, y, z, 153, 76, 27, 11), Math.abs(rim - 2.4) - 0.8, 0.4), M.P2);
    },
  },
  tiao: {
    colors: { [M.P2]: '#3a2010' },
    arms: [arm(-1, [32, 134, 22], [0.1, -1, 0.3], [1, 0, 0.2], 'hold')],
    scene(x, y, z) {
      if (x > 60 || y > 140) return;
      add(sdRoundBox(x, y, z, 31, 124, 28, 2.6, 9, 2, 1.2), M.P2);
      add(smax(sdRoundCone(x, y, z, 32, 114, 28, 41, 88, 28, 2.6, 1.2), Math.abs(z - 28) - 0.8, 0.3), M.SILVER);
    },
  },
  beto: { colors: {}, arms: [arm(1, [146, 126, 24], [-0.25, -1, 0.15], [-0.2, 0, 1], 'pinch')], scene: (x, y, z) => coin(x, y, z, 138.4, 100.6) },
  seuTiao: { colors: {}, arms: [arm(1, [146, 126, 24], [-0.25, -1, 0.15], [-0.2, 0, 1], 'pinch')], scene: (x, y, z) => coin(x, y, z, 138.4, 100.6) },
  carlinhos: {
    colors: { [M.P1]: '#5a3418', [M.P2]: '#6a9a5a' },
    scene(x, y, z) {
      if (x < 100 || x > 130 || y > 140) return;
      add(sdRoundBox(x, y, z, 114, 124, 15.6, 7, 9, 1.6, 1.2), M.P1);
      add(sdRoundBox(x, y, z, 113, 113.5, 15.4, 5.6, 3.6, 0.6, 0.4), M.P2);
    },
  },
  sofia: {
    colors: { [M.P1]: '#8a6ae0', [M.P2]: '#5a3a12' },
    scene(x, y, z) {
      if (x > 80) return;
      add(sdSphere(x, y, z, 50, 108, 34, 19) + Math.sin(x * 0.5 + y * 0.6) * 0.15, M.P1);
      add(sdRoundBox(x, y, z, 50, 131, 34, 13, 4.5, 11, 2.4), M.P2);
    },
  },
  fausto: {
    colors: { [M.P1]: '#3ae06a', [M.P2]: '#8a5a2a', [M.P3]: '#d8e0e4' },
    scene(x, y, z) {
      if (x < 124) return;
      add(sdSphere(x, y, z, 144, 121, 32, 12), M.P1);
      add(sdCapsule(x, y, z, 144, 98, 32, 144, 110, 32, 3.8), M.P3);
      add(sdCapsule(x, y, z, 144, 94, 32, 144, 98, 32, 3.2), M.P2);
    },
  },
  alemao: {
    colors: {},
    scene(x, y, z) {
      if (x < 134) return;
      add(sdRoundCone(x, y, z, 142, 178, 26, 153.6, 108, 24, 3.4, 2.8), M.SILVER);
      let head = smax(sdEllipsoid(x, y, z, 157, 97, 24, 9, 10, 2.6), -sdRoundBox(x, y, z, 158, 88, 24, 3.4, 8, 4, 1), 0.6);
      add(head, M.SILVER);
    },
  },
  zeca: {
    colors: { [M.P1]: '#8a5a2a', [M.P2]: '#4a2a12' },
    arms: [arm(1, [146, 126, 22], [-0.1, -1, 0.1], [-1, 0, 0.2], 'hold')],
    scene(x, y, z) {
      if (x < 120 || y > 140) return;
      add(sdCapsule(x, y, z, 146, 114, 26, 146, 104, 26, 2.6), M.P2);
      for (let i = 0; i < 3; i += 1) add(torus(x, y, z, 145 + i * 0.6, 92 - i * 2.4, 25, 10 - i * 0.8, 1.9, 'z'), M.P1);
    },
  },
  genesio: {
    colors: { [M.P1]: '#f4e8b0', [M.P2]: '#b8261c' },
    arms: [arm(1, [146, 128, 24], [-0.25, -1, 0.15], [-0.2, 0, 1], 'pinch')],
    scene(x, y, z) {
      if (x < 120 || y > 132) return;
      add(sdRoundBox(x, y, z, 136, 104, 27.5, 10, 12.5, 1.6, 1), M.P1);
      add(smax(sdRoundBox(x, y, z, 136, 104, 27.5, 10.3, 12.8, 1.8, 1), Math.abs(y - 94.5) - 2.6, 0.3), M.P2);
    },
  },
  marquinhos: {
    colors: { [M.P1]: '#c9962e' },
    arms: [arm(1, [146, 124, 24], [-0.25, -1, 0.15], [-0.2, 0, 1], 'pinch')],
    scene(x, y, z) {
      if (x < 120 || y > 132) return;
      add(sdRoundBox(x, y, z, 139.6, 97, 28.8, 1.6, 5.6, 0.7, 0.4), M.SILVER);
      add(torus(x, y, z, 139.6, 90, 28.8, 3.6, 1.1), M.P1);
      add(sdEllipsoid(x, y, z, 136, 85, 28.8, 3.6, 4.6, 1.6), M.P1);
    },
  },
  nelsinho: {
    colors: { [M.P1]: '#f4f0e6', [M.P2]: '#e6c34a' },
    arms: [arm(1, [146, 128, 24], [-0.2, -1, 0.15], [-0.2, 0, 1], 'pinch')],
    scene(x, y, z) {
      earPen(x, y, z, M.P2);
      if (x < 120 || y > 132) return;
      add(sdRoundBox(x, y, z, 137, 102, 27.5, 9.5, 12.5, 1.4, 1), M.P1);
    },
  },
  brandao: {
    // o cassetete de borracha preta na mão, com a alça de couro pendurada no cabo
    colors: { [M.P1]: '#30303a', [M.P2]: '#6a3a1a' },
    kinds: { [M.P1]: 'metal' },
    arms: [arm(1, [146, 128, 24], [-0.1, -1, 0.1], [-1, 0, 0.2], 'hold')],
    scene(x, y, z) {
      if (x < 128 || y > 160) return;
      add(sdRoundCone(x, y, z, 145.6, 136, 26, 152.4, 58, 26.6, 4, 3.7), M.P1);
      add(sdSphere(x, y, z, 145.4, 138.6, 26, 4.8), M.P1);
      add(torus(x, y, z, 144.6, 147, 26, 5.2, 0.9, 'x'), M.P2);
    },
  },
  geraldo: {
    colors: { [M.P1]: '#7a848c', [M.P2]: '#6a4a2a' },
    scene(x, y, z) {
      if (x < 136) return;
      add(sdCapsule(x, y, z, 148, 178, 22, 154, 88, 20, 2.5), M.P2);
      let blade = smax(sdEllipsoid(x, y, z, 155, 66, 20, 7.6, 19, 4), Math.abs(z - 20 - ((x - 155) / 7.6) ** 2 * 2.6) - 0.9, 0.4);
      blade = smax(blade, y - 84, 0.8);
      add(blade, M.P1);
    },
  },
  odete: {
    colors: { [M.P1]: '#6a1e30', [M.P2]: '#f4f0e6' },
    arms: [arm(1, [146, 132, 22], [-0.3, -1, 0.1], [-1, 0, 0.3], 'hold')],
    scene(x, y, z) {
      if (x < 110 || y > 136) return;
      add(sdRoundBox(x, y, z, 132, 110, 23, 11, 15, 3.6, 1.4), M.P1);
      add(sdRoundBox(x, y, z, 132.6, 110, 23, 10.4, 14.4, 3, 0.6), M.P2);
    },
  },
  valtinhoRenegado: {
    colors: { [M.P1]: '#e8e0d0', [M.P2]: '#b8261c' },
    scene(x, y, z) {
      if (x < 104) return;
      add(smax(smax(sdEllipsoid(x, y, z, 128, 122, -4, 18, 8, 16), -sdEllipsoid(x, y, z, 128, 128, -4, 15, 9, 13), 1), y - 128, 1) + Math.sin(x * 0.9) * 0.3, M.P1);
      add(sdRoundBox(x, y, z, 124, 136, 9, 7, 14, 1.4, 1.6) + Math.sin(y * 0.8) * 0.25, M.P1);
    },
  },
};

function earPen(x, y, z, m = M.P1) {
  if (x < 110 || y > 76) return;
  add(sdCapsule(x, y, z, 121, 70, -5, 131, 44, -9, 1.5), m);
  add(sdCapsule(x, y, z, 121, 70, -5, 120.4, 72, -4.8, 1.1), M.SILVER);
}
function coin(x, y, z, cx, cy) {
  if (x < 120 || y > 130) return;
  add(smax(sdEllipsoid(x, y, z, cx, cy, 30, 7, 7, 1.2), Math.abs(z - 30) - 0.9, 0.3), M.GOLD);
}

/** As rampas das cores dos objetos de `key` (P1..P5). */
export function propRamps(key) {
  const out = {};
  const kinds = PROPS[key]?.kinds ?? {};
  for (const [m, c] of Object.entries(PROPS[key]?.colors ?? {})) out[m] = ramp(c, kinds[m] ?? (Number(m) === M.P1 && key === 'sofia' ? 'glow' : 'cloth'));
  return out;
}
