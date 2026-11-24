// O Quiosque da Praia, em volume e com a câmera alta: a frente da sala (o céu, o sol e o mar ficam
// na camada de trás do jogo, com as nuvens e as cristas andando; aqui é buraco). A faixa de areia
// com a espuma, o deque de tábuas, os quatro esteios com a viga e a franja de sapê, os varais de
// lâmpadas, a placa do QUIOSQUE ÁGUA DE COCO, os dois coqueiros, o guarda-sol na areia, o isopor
// do GELO, a prancha encostada, o monte de cocos e a cadeira de plástico vermelha, no sol.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { CAM, H, OX, W, WR, acc, group, planeAt, proj, tableD } from '../common.mjs';
import { bayer } from '../pixelpass.mjs';
import { floorGrid, hash2, nudge, textAt } from '../decals.mjs';
import { plasticChair } from './props.mjs';

export { CAM, H, OX, W, WR };
export const FLOOR = 194;
const SHORE = 170;
const DECK_Z = 30;

export const S = {
  SAND: 60, SAND_WET: 61, DECK: 62, POST: 63, BEAM: 64, THATCH: 65, WIRE: 66, BULB_R: 67, BULB_Y: 68,
  BULB_G: 69, BULB_B: 70, SIGN: 71, SIGN_EDGE: 72, ROPE: 73, TRUNK: 74, RING: 75, FROND: 76, FROND_D: 77,
  NUT: 78, PARASOL_R: 79, PARASOL_W: 80, POLE: 81, COOLER: 82, COOLER_LID: 83, SURF: 84, SURF_STRIPE: 85,
  CHAIR: 86, COCO: 87, STRAW: 88,
};

// ------------------------------------------------------------------ o chão: a areia e o deque
function ground(x, y, z) {
  // a areia de trás (de pé no plano do fundo, abaixo do mar) e o chão (só para a frente: atrás é céu)
  add(Math.max(Math.abs(z + 0.5) - 0.5, SHORE - y), S.SAND);
  add(Math.max(FLOOR - y, -z), z < DECK_Z ? S.SAND : S.DECK);
}

// ------------------------------------------------------------------ o quiosque: esteios, viga, sapê
const POSTS = [47, 217, 679, 853];
const POST_Z = DECK_Z + 6;
function kiosk(x, y, z) {
  for (const px of POSTS) {
    if (Math.abs(x - px) > 12) continue;
    add(sdRoundBox(x, y, z, px, (-4 + FLOOR) / 2, POST_Z, 5, (FLOOR + 4) / 2, 5, 1.2), S.POST);
  }
  add(sdRoundBox(x, y, z, W / 2, -6, POST_Z, W / 2 + 90, 5, 6, 1.2), S.BEAM);
  // a franja de sapê: fios de palha pendurados, a beirada de baixo desfiada
  if (y < 12) {
    const fray = 1 + Math.sin(x * 0.9) * 2.4 + Math.sin(x * 2.3 + 1) * 1.6 + (hash2(Math.floor(x / 3), 7) - 0.5) * 5;
    const d = Math.max(-70 - y, y - fray, Math.abs(z - (POST_Z + 9)) - 4 - Math.max(0, 8 - (y + 70) * 0.2));
    add(d * 0.8 + Math.sin(x * 1.7) * 0.15, S.THATCH);
  }
}
// os varais de lâmpadas entre os esteios de fora e os de dentro
const STRINGS = [
  [POSTS[0], POSTS[1]],
  [POSTS[2], POSTS[3]],
];
const BULBS = [S.BULB_R, S.BULB_Y, S.BULB_G, S.BULB_B];
function bulbStrings(x, y, z) {
  for (const [x0, x1] of STRINGS) {
    if (x < x0 - 6 || x > x1 + 6) continue;
    const t = (x - x0) / (x1 - x0);
    const sag = 6 + Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 14;
    add(Math.hypot(y - sag, z - (POST_Z + 3)) - 0.7, S.WIRE);
    const n = 9;
    const k = Math.round(t * (n + 1));
    if (k >= 1 && k <= n) {
      const bx = x0 + ((x1 - x0) * k) / (n + 1);
      const by = 6 + Math.sin((k / (n + 1)) * Math.PI) * 14;
      add(sdEllipsoid(x, y, z, bx, by + 4.5, POST_Z + 3, 2.4, 3.4, 2.4), BULBS[k % 4]);
    }
  }
}
// a placa do QUIOSQUE pendurada na viga
const SIGN = { x0: 692, x1: 842, y0: 22, y1: 62, z: POST_Z + 8 };
function sign(x, y, z) {
  const cx = (SIGN.x0 + SIGN.x1) / 2;
  add(sdRoundBox(x, y, z, cx, (SIGN.y0 + SIGN.y1) / 2, SIGN.z, (SIGN.x1 - SIGN.x0) / 2, (SIGN.y1 - SIGN.y0) / 2, 1.6, 1), S.SIGN_EDGE);
  add(sdRoundBox(x, y, z, cx, (SIGN.y0 + SIGN.y1) / 2, SIGN.z + 1.2, (SIGN.x1 - SIGN.x0) / 2 - 3, (SIGN.y1 - SIGN.y0) / 2 - 3, 0.6, 0.5), S.SIGN);
  for (const rx of [SIGN.x0 + 12, SIGN.x1 - 12]) add(sdCapsule(x, y, z, rx, -2, POST_Z + 2, rx, SIGN.y0 + 1, SIGN.z, 0.7), S.ROPE);
}

// ------------------------------------------------------------------ os coqueiros
const PALMS = [
  { x: 190, z: 10, top: 22, lean: -34, s: 1.35 },
  { x: 712, z: 12, top: 30, lean: 32, s: 1.2 },
];
function palmAt(t, P) {
  return [P.x + Math.sin(t * 1.4) * P.lean * t, FLOOR - t * (FLOOR - P.top), P.z + Math.sin(t * 2) * 4];
}
function palm(x, y, z, P) {
  // o tronco: gomos de cápsula seguindo a curva, os anéis
  let d = 1e9;
  const n = 12;
  for (let i = 0; i < n; i += 1) {
    const a = palmAt(i / n, P);
    const b = palmAt((i + 1) / n, P);
    const r = (5.4 - (i / n) * 2.2) * P.s * 0.8;
    d = Math.min(d, sdCapsule(x, y, z, ...a, ...b, r));
  }
  const ring = Math.sin(y * 0.8) > 0.6;
  add(d, ring ? S.RING : S.TRUNK);
  // a copa: as palmas caídas em volta (e os cocos no meio)
  const [cx, cy, cz] = palmAt(1, P);
  for (let f = 0; f < 12; f += 1) {
    const a = (f / 12) * Math.PI * 2 + 0.3;
    const len = (46 + (f % 3) * 10) * P.s;
    let fd = 1e9;
    let prev = [cx, cy, cz];
    for (let s = 1; s <= 6; s += 1) {
      const t = s / 6;
      const p = [cx + Math.cos(a) * len * t, cy - len * 0.26 * t + len * 0.58 * t * t, cz + Math.sin(a) * len * t * 0.7];
      fd = Math.min(fd, sdCapsule(x, y, z, ...prev, ...p, (4.2 - t * 3) * P.s));
      prev = p;
    }
    add(fd, f % 2 ? S.FROND : S.FROND_D);
  }
  for (const [dx, dz] of [
    [-3, 2],
    [3, 3],
    [0, -3],
  ])
    add(sdSphere(x, y, z, cx + dx, cy + 4, cz + dz, 3.4), S.NUT);
}

// ------------------------------------------------------------------ na areia e no deque
function parasol(x, y, z) {
  const px = 236;
  const pz = 8;
  add(sdCapsule(x, y, z, px, FLOOR, pz, px + 3, 132, pz, 1), S.POLE);
  // a copa: um cone raso com gomos vermelhos e brancos
  const r = Math.hypot(x - px - 3, z - pz);
  const top = 132;
  const cone = Math.max(y - (top + 3 + r * 0.42), top + 1 + r * 0.42 - y, r - 30);
  const seg = Math.floor(((Math.atan2(z - pz, x - px - 3) + Math.PI) / (Math.PI * 2)) * 8);
  add(cone * 0.8, seg % 2 ? S.PARASOL_W : S.PARASOL_R);
}
function cooler(x, y, z) {
  const cx = 86;
  const cz = 74;
  add(sdRoundBox(x, y, z, cx, FLOOR - 15, cz, 27, 15, 14, 2.5), S.COOLER);
  add(sdRoundBox(x, y, z, cx, FLOOR - 31, cz, 28, 2.6, 15, 2), S.COOLER_LID);
}
function surfboard(x, y, z) {
  // encostada no esteio de dentro, um pouco torta
  const cx = 150;
  const cz = DECK_Z + 18;
  const lean = (y - FLOOR) * 0.1;
  add(sdEllipsoid(x - lean, y, z, cx, FLOOR - 38, cz, 9, 38, 2.4), Math.abs(x - lean - cx) < 1.6 ? S.SURF_STRIPE : S.SURF);
}
function coconuts(x, y, z) {
  for (const [dx, dz, up] of [
    [0, 0, 0],
    [12, 3, 0],
    [24, -1, 0],
    [6, -8, 0],
    [18, -6, 0],
    [12, -2, 9],
  ])
    add(sdSphere(x, y, z, 780 + dx, FLOOR - 6.2 - up, 86 + dz, 6.4), S.COCO);
  add(sdCapsule(x, y, z, 792, FLOOR - 21, 84, 795, FLOOR - 28, 86, 0.8), S.STRAW);
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  ground(x, y, z);
  group(x, y, z, [-100, -74, POST_Z - 8, W + 100, FLOOR, POST_Z + 16], kiosk);
  group(x, y, z, [POSTS[0] - 8, -2, POST_Z - 2, POSTS[3] + 8, 28, POST_Z + 8], bulbStrings);
  group(x, y, z, [SIGN.x0 - 2, -4, POST_Z, SIGN.x1 + 2, SIGN.y1 + 2, SIGN.z + 3], sign);
  for (const P of PALMS) group(x, y, z, [Math.min(P.x, P.x + P.lean) - 86, P.top - 30, P.z - 60, Math.max(P.x, P.x + P.lean) + 86, FLOOR, P.z + 60], (a, b, c) => palm(a, b, c, P));
  group(x, y, z, [200, 120, -26, 272, FLOOR, 42], parasol);
  group(x, y, z, [56, FLOOR - 36, 57, 116, FLOOR, 91], cooler);
  group(x, y, z, [132, FLOOR - 80, DECK_Z + 12, 170, FLOOR, DECK_Z + 24], surfboard);
  group(x, y, z, [770, FLOOR - 30, 74, 812, FLOOR, 96], coconuts);
  group(x, y, z, [796, FLOOR - 80, 34, 852, FLOOR, 86], (a, b, c) => plasticChair(a, b, c, 824, 60, S.CHAIR));
  return acc.D;
}
export const shade = (x, y, z) => Math.min(scene(x, y, z), tableD(x, y, z));

// ------------------------------------------------------------------ o sol (de trás, alto) e o céu
export const LIGHTS = [{ p: [1100, -2900, -1300], c: [1, 0.95, 0.82], k: 0.78, R: 1e7, shadow: true }];
export const AMB = [0.5, 0.54, 0.6];
export const EMISSIVE = new Set();

const C = {
  [S.SAND]: ['#e8cc98'], [S.SAND_WET]: ['#c8a878'], [S.DECK]: ['#b08050'], [S.POST]: ['#8a5e34'], [S.BEAM]: ['#6a4220'],
  [S.THATCH]: ['#c8a050'], [S.WIRE]: ['#2a2a2a'], [S.BULB_R]: ['#e8463a', 'metal'], [S.BULB_Y]: ['#f8d050', 'metal'],
  [S.BULB_G]: ['#4ac86a', 'metal'], [S.BULB_B]: ['#4a8ae8', 'metal'], [S.SIGN]: ['#2a6ab8'], [S.SIGN_EDGE]: ['#0e2a4a'],
  [S.ROPE]: ['#c8a46a'], [S.TRUNK]: ['#9a7448'], [S.RING]: ['#6a4a2a'], [S.FROND]: ['#3a9a34'], [S.FROND_D]: ['#2a7a26'],
  [S.NUT]: ['#6a8a2a'], [S.PARASOL_R]: ['#d83a2a'], [S.PARASOL_W]: ['#f4ece0'], [S.POLE]: ['#e8e8e8', 'metal'],
  [S.COOLER]: ['#f0f0ec'], [S.COOLER_LID]: ['#2a6ad8'], [S.SURF]: ['#f4f0e8'], [S.SURF_STRIPE]: ['#d83a2a'],
  [S.CHAIR]: ['#c82a22'], [S.COCO]: ['#5aa83a'], [S.STRAW]: ['#f04a8a'],
};

function decals(ctx) {
  const { W: w, H: h, mat } = ctx;
  // a areia: o granulado, a espuma na beira do mar e a areia molhada logo abaixo dela
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.SAND) continue;
      const foam = SHORE + 1.5 + Math.sin(x * 0.12) * 1.2 + Math.sin(x * 0.031 + 2) * 1.5;
      if (y < foam + 1 && y > foam - 1.2) ctx.set(p, [250, 252, 248]);
      else if (y >= foam + 1 && y < foam + 6) ctx.set(p, ctx.colorOf(p, ctx.RAMP[S.SAND_WET], ctx.tone[p]));
      else if (hash2(x, y) > 0.82) nudge(ctx, p, hash2(y, x) > 0.5 ? 1 : -1);
    }
  // o deque: tábuas ao comprido (de lado a lado), as juntas e os pregos
  floorGrid(
    ctx,
    new Set([S.DECK]),
    FLOOR,
    120,
    18,
    (p, seam, col, run, wx, wz, x, y) => {
      let t = ctx.tone[p];
      const n = hash2(col, run);
      if (seam) t -= 2;
      else if (n > 0.66 && bayer(x, y) > 0.5) t += 1;
      else if (n < 0.2 && bayer(x, y) > 0.5) t -= 1;
      const fx = (((wx + (run % 2) * 60) % 120) + 120) % 120;
      const fz = (((wz - DECK_Z) % 18) + 18) % 18;
      if ((Math.abs(fx - 6) < 1.2 || Math.abs(fx - 114) < 1.2) && Math.abs(fz - 9) < 1.5) t -= 2;
      if (wz < DECK_Z + 1.5) t -= 2;
      ctx.set(p, ctx.colorOf(p, ctx.RAMP[S.DECK], t));
    },
    (col) => 0,
  );
  // o sapê: as fibras na vertical
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.THATCH) continue;
      const f = hash2(x, 3);
      if (f > 0.7) nudge(ctx, p, 1);
      else if (f < 0.25) nudge(ctx, p, -1);
    }
  // as palmas: a nervura clara e os recortes dos folíolos
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (mat[p] !== S.FROND && mat[p] !== S.FROND_D) continue;
      if ((x * 3 + y * 5) % 7 === 0) nudge(ctx, p, -1);
      else if ((x + y * 2) % 9 === 0) nudge(ctx, p, 1);
    }
  // a placa e o isopor
  textAt(ctx, 'QUIOSQUE', (SIGN.x0 + SIGN.x1) / 2, SIGN.y0 + 7, SIGN.z + 2, [255, 248, 224], new Set([S.SIGN]), 3);
  textAt(ctx, 'AGUA DE COCO', (SIGN.x0 + SIGN.x1) / 2, SIGN.y0 + 26, SIGN.z + 2, [255, 224, 138], new Set([S.SIGN]), 2);
  textAt(ctx, 'GELO', 86, FLOOR - 22, 88.2, [42, 106, 216], new Set([S.COOLER]), 2);
}

export const PIXEL = {
  colors: C,
  steps: [0.2, 0.34, 0.48, 0.62, 0.84],
  dither: new Set([S.DECK, S.SAND, S.THATCH, S.COOLER]),
  spec: new Set([S.BULB_R, S.BULB_Y, S.BULB_G, S.BULB_B, S.POLE, S.COCO, S.SURF]),
  flats: new Set([S.DECK, S.SAND]),
  noEdge: new Set([S.DECK, S.SAND, S.SAND_WET]),
  decals,
  skyEdge: true,
  vignette: { start: 0.62, k: 1.1, max: 0.45 },
};
