// O Tio Zé de frente (o busto atrás da mesa), com os braços caídos ao lado do corpo.
import { R7 } from './r3d.mjs';
import { CIGS, M, acc, add, headScene, neckD, reset } from './model.mjs';
import { norm, sdEllipsoid, sdPoly2, sdRoundCone, smax, smin, sdCapsule } from './sdf.mjs';

export const W = 176;
export const H = 168;
export const RAIL = 136;
export const EYES = { L: [76.5, 68.6], R: [99.5, 68.6] };

const VEE = [
  [73.5, 103],
  [102.5, 103],
  [95.5, 120],
  [88, 133],
  [80.5, 120],
];
const LEAF_L = [
  [71, 100.5],
  [55, 112.5],
  [79.5, 128.5],
  [77.5, 110],
];
const LEAF_R = LEAF_L.map(([x, y]) => [176 - x, y]);

function torsoD(x, y, z) {
  // o tronco (mais estreito: os braços descem dos lados dele), o peito e o trapézio
  let d = sdEllipsoid(x, y, z, 88, 160, -12, 38.5, 46, 25);
  d = smin(d, sdEllipsoid(x, y, z, 73, 136.5, 2, 15.5, 11.5, 10.5), 7);
  d = smin(d, sdEllipsoid(x, y, z, 103, 136.5, 2, 15.5, 11.5, 10.5), 7);
  d = smin(d, sdRoundCone(x, y, z, 79, 104, -10, 50, 121, -8, 9, 7), 8);
  d = smin(d, sdRoundCone(x, y, z, 97, 104, -10, 126, 121, -8, 9, 7), 8);
  return d;
}
function armsD(x, y, z) {
  // o deltoide redondo e o braço caído ao lado do tronco (o cotovelo fica embaixo da mesa)
  const arm = (s) => {
    const X = (v) => 88 + s * (v - 88);
    let d = sdEllipsoid(x, y, z, X(45), 131, -5.5, 12.4, 14, 12.4);
    d = smin(d, sdRoundCone(x, y, z, X(44.4), 133, -5.5, X(43.4), 200, -2.5, 11.6, 9.6), 6);
    return d;
  };
  return Math.min(arm(1), arm(-1));
}
function clavD(x, y, z) {
  return Math.min(sdCapsule(x, y, z, 86, 117, 8.6, 62, 119.5, 3, 2.1), sdCapsule(x, y, z, 90, 117, 8.6, 114, 119.5, 3, 2.1));
}

export function scene(x, y, z) {
  reset();
  headScene(x, y, z, CIGS.front);
  if (y > 86) {
    add(neckD(x, y, z), M.SKIN, 3);
    const tor = smin(torsoD(x, y, z), clavD(x, y, z), 2.2);
    add(tor, M.CHEST, 3);
    // a camisa: o tronco e os braços engordados (a axila num vinco), aberta em V no pescoço
    const body = smin(tor, armsD(x, y, z), 1.6);
    let shirt = body - 2.1;
    const vee = sdPoly2(VEE, x, y);
    shirt = smax(shirt, -Math.max(vee, -z - 4), 1);
    add(shirt, M.SHIRT);
    const onShirt = Math.abs(body - 2.1 - 1.15) - 1.05;
    const leaves = Math.min(sdPoly2(LEAF_L, x, y), sdPoly2(LEAF_R, x, y));
    add(smax(leaves, onShirt, 0.5), M.COLLAR, 0.3);
    const nk = neckD(x, y, z);
    const stand = smax(Math.abs(nk - 1.4) - 1.1, Math.max(y - 109.5 + Math.max(0, z) * 0.2, 101.5 - y), 0.6);
    add(smax(stand, z - 5.5, 0.8), M.COLLAR, 0.3);
    add(sdEllipsoid(x, y, z, 88, 134.2, 14.4, 1.7, 1.6, 1), M.BUTTON);
  }
  return acc.D;
}

export const RAMPS = {
  [M.SKIN]: R7('#2e1614', '#552a20', '#7c4130', '#a05a3c', '#bf774e', '#d79766', '#ecbc8c'),
  [M.LIP]: R7('#3a1618', '#5c2626', '#7e3a36', '#9c4e46', '#b66456', '#ca7e68', '#e2a088'),
  [M.EYE]: R7('#4a3c3e', '#7a6664', '#a89490', '#ccbab4', '#e2d6d0', '#f2ebe6', '#ffffff'),
  [M.HAIR]: R7('#0e0808', '#1a100c', '#281a12', '#3a2618', '#4e3420', '#644428', '#7a5634'),
  [M.STACHE]: R7('#0e0808', '#1a100c', '#2a1a12', '#3c2818', '#523620', '#6a482a', '#846038'),
  [M.BROW]: R7('#0a0606', '#140c0a', '#1e140e', '#2c1c12', '#3c2818', '#523620', '#6a482a'),
  [M.SHIRT]: R7('#121014', '#1c1a1e', '#2a2628', '#3a3534', '#4c4542', '#605650', '#776a60'),
  [M.COLLAR]: R7('#2a2624', '#3e3834', '#554c46', '#6e645a', '#887c70', '#a29486', '#bcae9e'),
  [M.HAT]: R7('#1a0e0a', '#2e1a10', '#462818', '#5e3820', '#784a2a', '#925e36', '#ae7848'),
  [M.BAND]: R7('#0c0606', '#160c0a', '#22140e', '#2e1c12', '#3c2618', '#4e3220', '#64422a'),
  [M.CIG]: R7('#6a645c', '#9a948a', '#c4beb2', '#e2ddd2', '#f2eee6', '#faf8f2', '#ffffff'),
  [M.ASH]: R7('#2a2626', '#4a4444', '#6a6262', '#8a8282', '#a8a0a0', '#c0b8b8', '#d8d0d0'),
  [M.EMBER]: R7('#6a1a0a', '#a02a0a', '#d8460e', '#ff7a1a', '#ffb040', '#ffe08a', '#fff6d0'),
  [M.NAIL]: R7('#5a3030', '#7a4440', '#9a5e56', '#b67a6c', '#cc9684', '#deb09c', '#f0cab4'),
  [M.BUTTON]: R7('#1a1614', '#2e2824', '#4a423c', '#6a6058', '#8c8278', '#b0a69a', '#d8cec0'),
};
RAMPS[M.CHEST] = RAMPS[M.SKIN];

export const CFG = {
  W,
  H,
  scene,
  mat: () => acc.MAT,
  origin: (sx, sy) => [sx, sy, 95],
  dir: [0, 0, -1],
  maxT: 175,
  key: norm(-0.42, -0.6, 0.68),
  fill: norm(0.8, -0.15, 0.55),
  back: norm(0.62, -0.35, -0.7),
  w: { key: 1, fill: 0.2, back: 0.45, amb: 0.12 },
  steps: [0.11, 0.23, 0.39, 0.6, 0.86],
  smooth: 1.05,
  specMats: new Set([M.SKIN, M.EYE, M.BAND, M.NAIL, M.LIP, M.BUTTON]),
  ramps: RAMPS,
  edge: new Set([M.SHIRT, M.SKIN, M.CHEST, M.HAT, M.HAIR]),
  soft: new Set([`${M.SKIN}-${M.CHEST}`, `${M.CHEST}-${M.SKIN}`, `${M.SKIN}-${M.LIP}`, `${M.SKIN}-${M.EYE}`, `${M.SKIN}-${M.BROW}`, `${M.SKIN}-${M.NAIL}`, `${M.HAT}-${M.BAND}`]),
  litEdge: (x) => x < W * 0.55,
};
