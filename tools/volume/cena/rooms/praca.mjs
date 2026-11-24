// A Praça do Coreto, em volume e com a câmera alta (a frente da sala: o céu, o sol e as nuvens ficam
// na camada de trás do jogo). A igrejinha branca lá atrás (atrás da Dona Neide), o coreto com o
// telhado de telha, a sebe e a grama, as duas árvores grandes com a sombra rendada no chão, os dois
// lampiões coloniais, o banco de praça verde, o carrinho de PIPOCA, os pombos e a calçada de pedra
// portuguesa em ondas.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdEllipsoid, sdPoly2, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { CAM, H, OX, W, WR, acc, group, planeAt, proj, tableD } from '../common.mjs';
import { bayer } from '../pixelpass.mjs';
import { hash2, nudge, textAt } from '../decals.mjs';

export { CAM, H, OX, W, WR };
export const FLOOR = 194;
const GRASS_Z = 26;

export const S = {
  STONE: 60, STONE_D: 61, GRASS: 62, HEDGE: 63, CHURCH: 64, CHURCH_TRIM: 65, CHURCH_BLUE: 66, ROOF: 67,
  CORETO_W: 68, CORETO_ROOF: 69, LEAF: 70, LEAF_D: 71, TRUNK: 72, IRON: 73, LANTERN: 74, BENCH: 75,
  CART: 76, CART_RED: 77, CART_GLASS: 78, POPCORN: 79, TIRE: 80, CANVAS_R: 81, CANVAS_W: 82, PIGEON: 83,
  PIGEON_NECK: 84, CROSS: 85, BELL: 86,
};

// ------------------------------------------------------------------ o chão: a grama de trás e a calçada
function ground(x, y, z) {
  add(Math.max(FLOOR - y, -z), z < GRASS_Z ? S.GRASS : S.STONE);
  // a sebe ao longo do fundo (as folhas em bolotas)
  const bump = Math.sin(x * 0.21) * 2 + Math.sin(x * 0.53 + 1) * 1.2 + Math.sin(x * 1.3 + y * 0.7) * 0.6;
  add(Math.max(sdRoundBox(x, y, z, W / 2, 176, 7, W + 120, 18, 7, 6) - bump * 0.5, -z), S.HEDGE);
}

// ------------------------------------------------------------------ a igrejinha e o coreto (lá atrás)
const CH = { cx: W / 2, z: -34, base: 182, w: 184, top: 72 };
function church(x, y, z) {
  const { cx, z: cz, base, w, top } = CH;
  // a fachada com o frontão em triângulo, o óculo e a porta, e a torrinha com o sino
  const body = sdRoundBox(x, y, z, cx, (top + base) / 2, cz, w / 2, (base - top) / 2, 8, 1);
  const gable = Math.max(sdPoly2([[cx - w / 2 + 6, top + 1], [cx + w / 2 - 6, top + 1], [cx, top - 34]], x, y), Math.abs(z - cz) - 7);
  add(Math.min(body, gable), S.CHURCH);
  add(sdRoundBox(x, y, z, cx, top + 2, cz + 7, w / 2 + 3, 3, 2.5, 1), S.CHURCH_TRIM);
  for (const px of [cx - w / 2 + 6, cx + w / 2 - 6]) add(sdRoundBox(x, y, z, px, (top + base) / 2, cz + 8, 6, (base - top) / 2, 2.2, 1), S.CHURCH_TRIM);
  add(smax(sdRoundBox(x, y, z, cx, base - 34, cz + 8.5, 15, 36, 1, 6), -(base - 70 - y + 15), 0.3), S.CHURCH_BLUE);
  for (const wx of [cx - 52, cx + 52]) add(sdRoundBox(x, y, z, wx, top + 40, cz + 8.5, 9, 16, 1, 5), S.CHURCH_BLUE);
  add(Math.max(Math.hypot(x - cx, y - (top - 12)) - 7, Math.abs(z - (cz + 7.5)) - 1), S.CHURCH_BLUE);
  add(sdRoundBox(x, y, z, cx, top - 50, cz, 14, 16, 8, 1), S.CHURCH);
  add(Math.max(sdPoly2([[cx - 17, top - 65], [cx + 17, top - 65], [cx, top - 86]], x, y), Math.abs(z - cz) - 9), S.ROOF);
  add(sdRoundBox(x, y, z, cx, top - 52, cz + 8, 6, 8, 1, 4), S.CHURCH_BLUE);
  add(sdSphere(x, y, z, cx, top - 50, cz + 9, 3.4), S.BELL);
  add(Math.min(sdRoundBox(x, y, z, cx, top - 93, cz, 1.2, 7, 1.2, 0.3), sdRoundBox(x, y, z, cx, top - 95, cz, 5, 1.2, 1.2, 0.3)), S.CROSS);
}
const CO = { cx: 246, cz: -16, floor: 176, r: 36, eave: 116, apex: 78 };
function coreto(x, y, z) {
  const { cx, cz, floor, r, eave, apex } = CO;
  const ang = Math.atan2(z - cz, x - cx);
  const oct = Math.cos(Math.PI / 8) / Math.cos(((((ang + Math.PI / 8) % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4)) - Math.PI / 8);
  const rr = Math.hypot(x - cx, z - cz) / oct;
  // o telhado: um cone de telha com a ponta de bico, e a beira de lambrequim branco
  const roof = Math.max(y - (eave - (eave - apex) * Math.max(0, 1 - rr / (r + 10)) + 2), eave - (eave - apex) * Math.max(0, 1 - rr / (r + 10)) - 3 - y, rr - r - 10);
  add(roof * 0.7, S.CORETO_ROOF);
  add(sdRoundCone(x, y, z, cx, apex + 2, cz, cx, apex - 12, cz, 2.6, 0.6), S.CORETO_W);
  add(Math.max(Math.abs(rr - r - 8) - 2, Math.abs(y - eave - 3) - 3), S.CORETO_W);
  // as colunas e o guarda-corpo
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    const px = cx + Math.cos(a) * r;
    const pz = cz + Math.sin(a) * r * 0.9;
    add(sdCapsule(x, y, z, px, eave + 2, pz, px, floor, pz, 2.2), S.CORETO_W);
  }
  add(Math.max(Math.abs(rr - r) - 1.6, Math.abs(y - (floor - 14)) - 1.6), S.CORETO_W);
  add(Math.max(rr - r - 4, Math.abs(y - floor - 4) - 4), S.CORETO_W);
}

// ------------------------------------------------------------------ as árvores, os lampiões
const TREES = [
  { cx: 66, cz: 36, cy: 54, r: 74, trunk: 74 },
  { cx: 836, cz: 40, cy: 60, r: 74, trunk: 830 },
];
const BLOBS = [
  [0, 0, 0, 52],
  [-46, 10, 8, 34],
  [44, 12, 6, 36],
  [-24, -26, 4, 34],
  [26, -24, 10, 32],
  [-8, 26, 22, 34],
  [56, -6, -12, 28],
  [-58, -8, -8, 28],
  [6, -40, -6, 26],
];
function tree(x, y, z, T) {
  // o tronco e os galhos
  const tx = T.trunk;
  add(sdRoundCone(x, y, z, tx, FLOOR, T.cz, tx + (T.cx - tx) * 0.4, T.cy + 30, T.cz, 7, 4.6), S.TRUNK);
  for (const [dx, dy] of [
    [-26, -6],
    [24, -2],
    [-6, -24],
  ])
    add(sdCapsule(x, y, z, tx + (T.cx - tx) * 0.4, T.cy + 34, T.cz, T.cx + dx, T.cy + dy, T.cz + 4, 2.2), S.TRUNK);
  // a copa: as bolotas juntas e as folhas mexidas
  let d = 1e9;
  for (const [ox, oy, oz, r] of BLOBS) d = smin(d, sdSphere(x, y, z, T.cx + ox, T.cy + oy, T.cz + oz, r * (T.r / 74)), 10);
  d += Math.sin(x * 0.45) * Math.sin(y * 0.52 + z * 0.3) * Math.sin(z * 0.47 + x * 0.21) * 3.2;
  add(d * 0.7, hash2(Math.floor(x / 7), Math.floor(y / 7)) > 0.5 ? S.LEAF : S.LEAF_D);
}
const LAMPS = [148, 748];
function lampPost(x, y, z, lx) {
  const lz = GRASS_Z + 14;
  add(sdRoundBox(x, y, z, lx, FLOOR - 5, lz, 6, 5, 6, 1.5), S.IRON);
  add(sdRoundCone(x, y, z, lx, FLOOR - 8, lz, lx, 96, lz, 3, 2), S.IRON);
  add(sdRoundBox(x, y, z, lx, 92, lz, 5, 2, 5, 1), S.IRON);
  // a lanterna: o vidro com as quinas de ferro e o chapéu
  add(sdRoundBox(x, y, z, lx, 80, lz, 6, 10, 6, 2), S.LANTERN);
  for (const [dx, dz] of [
    [-6, -6],
    [6, -6],
    [-6, 6],
    [6, 6],
  ])
    add(sdCapsule(x, y, z, lx + dx, 70, lz + dz, lx + dx * 0.8, 90, lz + dz * 0.8, 0.9), S.IRON);
  add(Math.max(sdPoly2([[lx - 10, 70], [lx + 10, 70], [lx, 58]], x, y), Math.abs(z - lz) - 9 + Math.abs(x - lx) * 0.2), S.IRON);
  add(sdSphere(x, y, z, lx, 56, lz, 2), S.IRON);
}

// ------------------------------------------------------------------ o banco, o carrinho de pipoca, os pombos
function bench(x, y, z) {
  const bx = 92;
  const bz = 74;
  for (let k = 0; k < 4; k += 1) add(sdRoundBox(x, y, z, bx, FLOOR - 26, bz - 9 + k * 6, 50, 1.4, 2.4, 0.8), S.BENCH);
  for (let k = 0; k < 3; k += 1) add(sdRoundBox(x, y, z, bx, FLOOR - 33 - k * 7, bz - 14 - k * 0.6, 50, 2.2, 1.2, 0.8), S.BENCH);
  for (const lx of [bx - 42, bx + 42]) {
    add(sdCapsule(x, y, z, lx, FLOOR, bz + 8, lx, FLOOR - 26, bz + 6, 1.6), S.IRON);
    add(sdCapsule(x, y, z, lx, FLOOR, bz - 10, lx, FLOOR - 52, bz - 15, 1.6), S.IRON);
    add(sdCapsule(x, y, z, lx, FLOOR - 26, bz + 8, lx, FLOOR - 26, bz - 11, 1.4), S.IRON);
  }
}
const CART = { cx: 784, cz: 80 };
function cart(x, y, z) {
  const { cx, cz } = CART;
  // a caixa vermelha, a vitrine com a pipoca, a placa e o guarda-sol listrado
  add(sdRoundBox(x, y, z, cx, FLOOR - 34, cz, 26, 18, 14, 2), S.CART_RED);
  add(sdRoundBox(x, y, z, cx, FLOOR - 66, cz, 24, 14, 13, 1.5), S.CART_GLASS);
  add(sdRoundBox(x, y, z, cx, FLOOR - 62, cz, 21, 9, 10, 4) + Math.sin(x * 1.3) * Math.sin(z * 1.1) * 0.8, S.POPCORN);
  add(sdRoundBox(x, y, z, cx, FLOOR - 81, cz, 26, 1.6, 15, 1), S.CART);
  add(sdCapsule(x, y, z, cx, FLOOR - 82, cz, cx, FLOOR - 104, cz, 1), S.CART);
  const rr = Math.hypot(x - cx, z - cz);
  const cone = Math.max(y - (FLOOR - 104 + rr * 0.3 + 2), FLOOR - 104 + rr * 0.3 - 1 - y, rr - 34);
  const seg = Math.floor(((Math.atan2(z - cz, x - cx) + Math.PI) / (Math.PI * 2)) * 10);
  add(cone * 0.8, seg % 2 ? S.CANVAS_W : S.CANVAS_R);
  for (const wx of [cx - 18, cx + 18]) add(Math.max(Math.hypot(x - wx, y - (FLOOR - 7)) - 7, Math.abs(z - cz - 15) - 2.4), S.TIRE);
  add(sdCapsule(x, y, z, cx + 26, FLOOR - 40, cz, cx + 40, FLOOR - 48, cz, 1.3), S.CART);
}
const PIGEONS = [
  [182, 96, 1],
  [204, 110, -1],
  [700, 104, 1],
];
function pigeons(x, y, z) {
  for (const [px, pz, dir] of PIGEONS) {
    if (Math.abs(x - px) > 12) continue;
    add(sdEllipsoid(x, y, z, px, FLOOR - 6, pz, 7, 4.6, 4.4), S.PIGEON);
    add(sdSphere(x, y, z, px + dir * 6, FLOOR - 11, pz, 3), S.PIGEON_NECK);
    add(sdEllipsoid(x, y, z, px - dir * 8, FLOOR - 7, pz, 4, 1.4, 2.6), S.PIGEON);
  }
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  ground(x, y, z);
  group(x, y, z, [CH.cx - CH.w / 2 - 6, CH.top - 104, CH.z - 12, CH.cx + CH.w / 2 + 6, CH.base + 2, CH.z + 12], church);
  group(x, y, z, [CO.cx - CO.r - 12, CO.apex - 16, CO.cz - CO.r - 12, CO.cx + CO.r + 12, CO.floor + 10, CO.cz + CO.r + 12], coreto);
  for (const T of TREES) group(x, y, z, [T.cx - 120, T.cy - 80, T.cz - 80, T.cx + 120, FLOOR, T.cz + 80], (a, b, c) => tree(a, b, c, T));
  for (const lx of LAMPS) group(x, y, z, [lx - 14, 52, GRASS_Z, lx + 14, FLOOR, GRASS_Z + 28], (a, b, c) => lampPost(a, b, c, lx));
  group(x, y, z, [36, FLOOR - 64, 54, 148, FLOOR, 90], bench);
  group(x, y, z, [CART.cx - 40, FLOOR - 110, CART.cz - 38, CART.cx + 44, FLOOR, CART.cz + 38], cart);
  group(x, y, z, [166, FLOOR - 16, 86, 716, FLOOR, 118], pigeons);
  return acc.D;
}
export const shade = (x, y, z) => Math.min(scene(x, y, z), tableD(x, y, z));

// ------------------------------------------------------------------ o sol (alto, à direita, na frente) e o céu
export const LIGHTS = [{ p: [1500, -2800, -1500], c: [1, 0.95, 0.82], k: 0.8, R: 1e7, shadow: true }];
export const AMB = [0.5, 0.54, 0.58];
export const EMISSIVE = new Set();

const C = {
  [S.STONE]: ['#e4e0d4'], [S.STONE_D]: ['#3a3a42'], [S.GRASS]: ['#5ab04a'], [S.HEDGE]: ['#3a8a3a'],
  [S.CHURCH]: ['#f4f0e4'], [S.CHURCH_TRIM]: ['#e8c050'], [S.CHURCH_BLUE]: ['#3a6ab8'], [S.ROOF]: ['#b8502a'],
  [S.CORETO_W]: ['#f4f0e8'], [S.CORETO_ROOF]: ['#d0602a'], [S.LEAF]: ['#3a9a3a'], [S.LEAF_D]: ['#2a7a30'],
  [S.TRUNK]: ['#6a4a2e'], [S.IRON]: ['#24282a', 'metal'], [S.LANTERN]: ['#f4e8b0', 'metal'], [S.BENCH]: ['#2a7a4a'],
  [S.CART]: ['#c8c8c0', 'metal'], [S.CART_RED]: ['#d8261c'], [S.CART_GLASS]: ['#d8eef0', 'metal'], [S.POPCORN]: ['#f8e090'],
  [S.TIRE]: ['#1a1a1c'], [S.CANVAS_R]: ['#d8261c'], [S.CANVAS_W]: ['#f4ece0'], [S.PIGEON]: ['#8a90a0'],
  [S.PIGEON_NECK]: ['#6a8a8a'], [S.CROSS]: ['#e8c050', 'metal'], [S.BELL]: ['#c8962c', 'metal'],
};

function decals(ctx) {
  const { W: w, H: h, mat } = ctx;
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const m = mat[p];
      if (m === S.STONE) {
        // a calçada de pedra portuguesa em ondas
        const [wx, wz] = planeAt(x + 0.5, y + 0.5, FLOOR);
        const v = wz + 11 * Math.sin(wx * 0.055) + 3 * Math.sin(wx * 0.13 + 1);
        const band = (((Math.floor(v / 19) % 2) + 2) % 2) === 0;
        const stone = hash2(Math.floor(wx / 3.2), Math.floor(wz / 3.2));
        const gap = (wx / 3.2) % 1 < 0.18 || (wz / 3.2) % 1 < 0.18;
        let t = ctx.tone[p] + (gap ? -1 : stone > 0.75 ? 1 : 0);
        if (wz < GRASS_Z + 2) t -= 1;
        ctx.set(p, ctx.colorOf(p, ctx.RAMP[band ? S.STONE_D : S.STONE], t));
      } else if (m === S.GRASS || m === S.HEDGE) {
        // as folhinhas da grama e da sebe
        const n = hash2(x, Math.floor(y / 2));
        if (n > 0.8) nudge(ctx, p, 1);
        else if (n < 0.2) nudge(ctx, p, -1);
      } else if (m === S.LEAF || m === S.LEAF_D) {
        const n = hash2(Math.floor(x / 2), Math.floor(y / 2));
        if (n > 0.86) nudge(ctx, p, 1);
        else if (n < 0.14) nudge(ctx, p, -1);
      } else if (m === S.CORETO_ROOF && (y % 3 === 0 || Math.abs(((Math.atan2(y - 100, x - OX - CO.cx) * 8) / Math.PI) % 1) < 0.08)) nudge(ctx, p, -1);
    }
  textAt(ctx, 'PIPOCA', CART.cx, FLOOR - 40, CART.cz + 14.6, [255, 248, 224], new Set([S.CART_RED]), 2);
}

export const PIXEL = {
  colors: C,
  steps: [0.2, 0.34, 0.48, 0.62, 0.84],
  dither: new Set([S.STONE, S.GRASS, S.HEDGE, S.LEAF, S.LEAF_D, S.CHURCH]),
  spec: new Set([S.IRON, S.LANTERN, S.CART_GLASS, S.CART, S.CROSS, S.BELL]),
  flats: new Set([S.STONE, S.GRASS]),
  noEdge: new Set([S.STONE, S.STONE_D, S.GRASS, S.LEAF, S.LEAF_D, S.HEDGE]),
  decals,
  skyEdge: true,
  vignette: { start: 0.62, k: 1.1, max: 0.45 },
};
