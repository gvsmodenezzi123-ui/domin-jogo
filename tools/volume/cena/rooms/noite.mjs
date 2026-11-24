// O Dono da Noite, em volume e com a câmera alta: a parede de pedra lavrada, a janela gótica com
// a lua cheia presa na rosácea (atrás da cabeça dele), as cortinas de veludo amarradas com o bandô
// e a franja dourada, a coleção de corações nas redomas (a última vazia, esperando), o relógio-
// armário parado à meia-noite, a corrente pendurada e o mármore preto em xadrez. Quem acende a
// sala são as quatro velas da mesa (o jogo as desenha) e a lua.
import { add, reset } from '../../kit.mjs';
import { sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { CAM, H, OX, TABLE3D, W, WR, acc, group, planeAt, proj, tableD } from '../common.mjs';
import { bayer, halo, mix } from '../pixelpass.mjs';
import { dot, floorGrid, hash2, nudge, stroke } from '../decals.mjs';

export { CAM, H, OX, W, WR };
export const FLOOR = 194;

export const S = {
  STONE: 60, STONE_D: 61, STONE_L: 62, JOINT: 63, FRAME: 64, SKY: 65, MOON: 66, FLOOR_A: 67, FLOOR_B: 68,
  VELVET: 69, VELVET_D: 70, GOLD: 71, ROD: 72, SHELF: 73, JAR_BASE: 74, HEART: 75, CLOCK: 76, CLOCK_D: 77,
  DIAL: 78, BRASS: 79, PEND_GLASS: 80, CHAIN: 81, TASSEL: 82,
};

// ------------------------------------------------------------------ a janela gótica
const WIN = { cx: W / 2, w: 170, apex: 8.5, sill: FLOOR };
const WIN_R = WIN.w * 0.62;
const SPRING = WIN.apex + Math.sqrt(WIN_R * WIN_R - (WIN_R - WIN.w / 2) ** 2);
const MOON = { x: W / 2, y: 64, r: 36 };
/** A distância 2D (x, y) até o vão da janela (negativa por dentro). */
function openD(x, y) {
  const rect = Math.max(Math.abs(x - WIN.cx) - WIN.w / 2, SPRING - y, y - WIN.sill);
  const c1 = Math.hypot(x - (WIN.cx + WIN.w / 2 - WIN_R), y - SPRING) - WIN_R;
  const c2 = Math.hypot(x - (WIN.cx - WIN.w / 2 + WIN_R), y - SPRING) - WIN_R;
  const lens = Math.max(c1, c2, y - SPRING);
  return Math.min(rect, lens);
}

// ------------------------------------------------------------------ a parede de pedra lavrada
const BW = 34;
const BH = 17;
function wall(x, y, z) {
  const o = openD(x, y);
  if (z > 30) {
    add(Math.max(z - 0.5, -o), S.STONE);
    return;
  }
  const row = Math.floor(y / BH);
  const off = row & 1 ? BW / 2 : 0;
  const col = Math.floor((x + off) / BW);
  const fx = x + off - col * BW;
  const fy = y - row * BH;
  const e = Math.min(fx, BW - fx, fy, BH - fy);
  const h = hash2(col + 300, row);
  let surf;
  let m;
  if (e < 1.6) {
    surf = -2 + e * 0.5;
    m = S.JOINT;
  } else {
    surf = 0.6 + h * 0.9 - Math.max(0, 3 - e) * 0.45 + Math.sin(x * 0.7 + y * 1.3) * 0.12 + Math.sin(x * 0.23 - y * 0.41) * 0.18;
    m = h < 0.25 ? S.STONE_D : h > 0.78 ? S.STONE_L : S.STONE;
  }
  // o vão da janela fura a parede; a moldura de pedra em volta dele
  add(Math.max(z - surf, -o), m);
  const band = Math.abs(o - 7) - 7;
  if (band < 4) add(Math.max(band, z - 5 + Math.max(0, Math.abs(o - 7) - 3) * 0.35, -z - 2), S.FRAME);
}
// o fundo da janela: o céu da noite (aceso) e a lua; a rosácea e o mainel de pedra na frente
function windowParts(x, y, z) {
  const o = openD(x, y);
  add(Math.max(Math.abs(z + 30) - 1, o - 2), S.SKY);
  add(Math.max(Math.hypot(x - MOON.x, y - MOON.y) - MOON.r, Math.abs(z + 28.5) - 0.8), S.MOON);
  const ring = Math.abs(Math.hypot(x - MOON.x, y - MOON.y) - (MOON.r + 6)) - 3;
  add(Math.max(ring, Math.abs(z + 2) - 3, o), S.FRAME);
  add(Math.max(Math.abs(x - WIN.cx) - 3, MOON.y + MOON.r + 9 - y, Math.abs(z + 2) - 3, y - WIN.sill), S.FRAME);
  // os dois arquinhos do rendilhado embaixo da rosácea
  for (const side of [-1, 1]) {
    const ax = WIN.cx + side * 43;
    const ay = MOON.y + MOON.r + 34;
    const arc = Math.max(Math.abs(Math.hypot(x - ax, y - ay) - 40) - 2.4, y - ay, Math.abs(z + 2) - 2.5, o);
    add(arc, S.FRAME);
  }
}

// ------------------------------------------------------------------ as cortinas, o bandô e a varão
const CURT = [
  { x0: 250, x1: 370, tie: 297, side: -1 },
  { x0: 526, x1: 646, tie: 599, side: 1 },
];
const TIE_Y = 123;
const CURT_TOP = 4;
const CURT_BOT = FLOOR + 1;
function curtain(x, y, z, Cu) {
  const { x0, x1, tie, side } = Cu;
  const inner = side < 0 ? x1 : x0;
  const t = y < TIE_Y ? (y - CURT_TOP) / (TIE_Y - CURT_TOP) : 1 - ((y - TIE_Y) / (CURT_BOT - TIE_Y)) * 0.35;
  const edge = inner + (tie - inner) * Math.sin(Math.max(0, Math.min(1, t)) * Math.PI * 0.5);
  const xa = side < 0 ? x0 : edge;
  const xb = side < 0 ? edge : x1;
  const pinch = 1 + Math.max(0, 1 - Math.abs(y - TIE_Y) / 64) * 1.4;
  const u = (x - tie) * pinch;
  const fold = Math.sin(u * 0.2) * 2.6 + Math.sin(u * 0.07 + 1.3) * 1.6;
  const zc = 8 + fold + Math.max(0, 1 - Math.abs(y - TIE_Y) / 30) * 4;
  const d = Math.max(xa - x, x - xb, Math.abs(z - zc) - 2.2, CURT_TOP - y, y - CURT_BOT) * 0.6;
  add(d, Math.sin(u * 0.2) < -0.35 ? S.VELVET_D : S.VELVET);
  // a braçadeira dourada e a borla
  const tx = side < 0 ? (x0 + edge) / 2 : (edge + x1) / 2;
  add(sdCapsule(x, y, z, side < 0 ? x0 : edge - 2, TIE_Y + 1, zc + 2.6, side < 0 ? edge + 2 : x1, TIE_Y + 1, zc + 2.6, 1.8), S.GOLD);
  const bx = side < 0 ? edge - 2 : edge + 2;
  add(sdSphere(x, y, z, bx, TIE_Y + 7, 14, 2.8), S.GOLD);
  add(sdRoundCone(x, y, z, bx, TIE_Y + 9, 14, bx, TIE_Y + 26, 14, 2, 5), S.TASSEL);
  void tx;
}
function valance(x, y, z) {
  for (const [x0, x1] of [
    [242, 374],
    [522, 654],
  ]) {
    if (x < x0 - 4 || x > x1 + 4) continue;
    const sw = 44;
    const uu = (((x - x0) % sw) + sw) % sw / sw;
    const hang = 8 + Math.sin(uu * Math.PI) * 16;
    const d = Math.max(x0 - x, x - x1, -2 - y + 0, y - hang, Math.abs(z - 14 - Math.sin(uu * Math.PI) * 3) - 3) * 0.7;
    add(d, S.VELVET);
    add(Math.max(x0 - x, x - x1, Math.abs(y - hang - 1.6) - 1.8, Math.abs(z - 15 - Math.sin(uu * Math.PI) * 3) - 3.2) * 0.7, S.GOLD);
  }
  add(sdCapsule(x, y, z, 232, 1, 10, 664, 1, 10, 2.2), S.ROD);
  for (const fx of [228, 668]) add(sdSphere(x, y, z, fx, 1, 10, 4), S.GOLD);
}

// ------------------------------------------------------------------ as redomas dos corações
const JARS = { x0: 64, x1: 250, y: 144, n: 5, step: 34 };
const jarX = (k) => JARS.x0 + 21 + k * JARS.step;
function sdHeart(x, y, z, cx, cy, cz, s) {
  const a = sdSphere(x, y, z, cx - 0.5 * s, cy - 0.25 * s, cz, 0.56 * s);
  const b = sdSphere(x, y, z, cx + 0.5 * s, cy - 0.25 * s, cz, 0.56 * s);
  const c = sdRoundCone(x, y, z, cx, cy - 0.05 * s, cz, cx, cy + 0.95 * s, cz, 0.78 * s, 0.1 * s);
  return smin(smin(a, b, 0.25 * s), c, 0.3 * s);
}
function jars(x, y, z) {
  add(sdRoundBox(x, y, z, (JARS.x0 + JARS.x1) / 2, JARS.y + 2, 9, (JARS.x1 - JARS.x0) / 2, 2.4, 9, 1), S.SHELF);
  for (const bx of [JARS.x0 + 12, JARS.x1 - 12]) add(sdRoundBox(x, y, z, bx, JARS.y + 10, 2, 2, 7, 2, 0.6), S.SHELF);
  for (let k = 0; k < JARS.n; k += 1) {
    const jx = jarX(k);
    if (Math.abs(x - jx) > 16) continue;
    add(Math.max(Math.hypot(x - jx, z - 10) - 10, Math.abs(y - (JARS.y - 1.5)) - 1.5) - 0.4, S.JAR_BASE);
    if (k < JARS.n - 1) add(sdHeart(x, y, z, jx, JARS.y - 15, 10, 6.5), S.HEART);
  }
}

// ------------------------------------------------------------------ o relógio-armário e a corrente
const CLK = { x: 680, top: 34, w: 52, z: 12 };
function clock(x, y, z) {
  const { x: cx, top, w, z: hz } = CLK;
  // o capitel em arco, o corpo, a base e a porta do pêndulo
  add(sdRoundBox(x, y, z, cx, top + 26, hz, w / 2 + 2, 24, hz, 1.5), S.CLOCK);
  add(Math.max(sdEllipsoid(x, y, z, cx, top + 6, hz, w / 2 - 2, 10, hz - 1), y - (top + 8)), S.CLOCK);
  for (const px of [cx - w / 2 + 2, cx + w / 2 - 2]) add(sdSphere(x, y, z, px, top + 1, hz, 2.4), S.BRASS);
  add(sdRoundBox(x, y, z, cx, (top + 52 + FLOOR - 16) / 2, hz - 2, w / 2 - 6, (FLOOR - 16 - top - 52) / 2, hz - 2, 1.5), S.CLOCK_D);
  add(sdRoundBox(x, y, z, cx, FLOOR - 8, hz, w / 2 + 2, 8, hz + 1, 1.5), S.CLOCK);
  add(sdRoundBox(x, y, z, cx, top + 110, 2 * hz - 3.2, 9, 44, 0.6, 0.4), S.PEND_GLASS);
  // o mostrador
  add(Math.max(Math.hypot(x - cx, y - (top + 30)) - 17, Math.abs(z - (2 * hz + 0.6)) - 0.8), S.BRASS);
  add(Math.max(Math.hypot(x - cx, y - (top + 30)) - 15, Math.abs(z - (2 * hz + 1.2)) - 0.8), S.DIAL);
}
function chain(x, y, z) {
  const cx = 858;
  for (let k = 0; k < 22; k += 1) {
    const ly = 66 + k * 5;
    const wob = Math.sin(k * 0.5) * 1.2;
    if (Math.abs(y - ly) > 6) continue;
    const ring = k % 2 ? Math.max(Math.abs(Math.hypot(y - ly, z - 8) - 2.4) - 0.7, Math.abs(x - cx - wob) - 0.7) : Math.max(Math.abs(Math.hypot(x - cx - wob, y - ly) - 2.4) - 0.7, Math.abs(z - 8) - 0.7);
    add(ring, S.CHAIN);
  }
  add(sdRoundBox(x, y, z, cx, 62, 4, 3, 2, 4, 0.6), S.CHAIN);
}

// ------------------------------------------------------------------ a cena
export function scene(x, y, z) {
  reset();
  wall(x, y, z);
  add(FLOOR - y, S.FLOOR_A);
  group(x, y, z, [WIN.cx - WIN.w / 2 - 4, 0, -33, WIN.cx + WIN.w / 2 + 4, FLOOR, 2], windowParts);
  group(x, y, z, [224, -4, 0, 672, 30, 22], valance);
  for (const Cu of CURT) group(x, y, z, [Cu.x0 - 6, CURT_TOP - 2, 0, Cu.x1 + 6, CURT_BOT + 1, 22], (a, b, c) => curtain(a, b, c, Cu));
  group(x, y, z, [JARS.x0 - 2, JARS.y - 30, 0, JARS.x1 + 2, JARS.y + 18, 21], jars);
  group(x, y, z, [CLK.x - CLK.w / 2 - 4, CLK.top - 4, 0, CLK.x + CLK.w / 2 + 4, FLOOR, 2 * CLK.z + 3], clock);
  group(x, y, z, [850, 58, 0, 866, 180, 12], chain);
  return acc.D;
}
export const shade = (x, y, z) => Math.min(scene(x, y, z), tableD(x, y, z));

// ------------------------------------------------------------------ as luzes
// as quatro velas da mesa (o jogo as desenha nos cantos do tampo): a chama, de volta na cena
const FLAMES = [
  [281.9, 93.2, TABLE3D.zFar + 9],
  [614.1, 93.2, TABLE3D.zFar + 9],
  [263.2, 274.5, TABLE3D.zNear - 9],
  [632.8, 274.5, TABLE3D.zNear - 9],
].map(([sx, sy, z]) => {
  const k = CAM[2] / (CAM[2] - z);
  return [CAM[0] + (sx - CAM[0]) / k, CAM[1] + (sy - CAM[1]) / k, z];
});
export const LIGHTS = [
  // a lua pela janela (a parede segura a luz: só passa pelo vão)
  { p: [MOON.x, MOON.y + 10, -26], c: [0.5, 0.58, 1], k: 1.9, R: 210, shadow: true },
  ...FLAMES.map((p, i) => ({ p, c: [1, 0.6, 0.28], k: i < 2 ? 1.4 : 1.25, R: 100 })),
  // o vermelho dos corações nas redomas
  { p: [jarX(2), JARS.y - 15, 16], c: [1, 0.12, 0.18], k: 1, R: 60, max: 260 },
];
export const AMB = [0.05, 0.045, 0.09];
export const EMISSIVE = new Set([S.SKY, S.MOON, S.HEART]);

// ------------------------------------------------------------------ a pixel art
const C = {
  [S.STONE]: ['#2e2838'], [S.STONE_D]: ['#241f2e'], [S.STONE_L]: ['#383046'], [S.JOINT]: ['#0e0c12'],
  [S.FRAME]: ['#3a3448'], [S.SKY]: ['#141a3a', 'glow'], [S.MOON]: ['#e8ecff', 'glow'], [S.FLOOR_A]: ['#16121c'],
  [S.FLOOR_B]: ['#2c2438'], [S.VELVET]: ['#6e1022'], [S.VELVET_D]: ['#4a0816'], [S.GOLD]: ['#c8962c', 'metal'],
  [S.ROD]: ['#3a3444', 'metal'], [S.SHELF]: ['#3a2010'], [S.JAR_BASE]: ['#2a160c'], [S.HEART]: ['#d8141e', 'glow'],
  [S.CLOCK]: ['#4a2210'], [S.CLOCK_D]: ['#341608'], [S.DIAL]: ['#d8ccaa'], [S.BRASS]: ['#b8862c', 'metal'],
  [S.PEND_GLASS]: ['#0e0a10', 'metal'], [S.CHAIN]: ['#4a4450', 'metal'], [S.TASSEL]: ['#a87a24'],
};
const STONES = new Set([S.STONE, S.STONE_D, S.STONE_L, S.JOINT]);

function decals(ctx) {
  const { W: w, H: h, mat } = ctx;
  // o mármore em xadrez: preto e roxo, com o veio
  floorGrid(
    ctx,
    new Set([S.FLOOR_A]),
    FLOOR,
    48,
    48,
    (p, seam, col, run, wx, wz, x, y) => {
      const dark = (((col + run) % 2) + 2) % 2 === 0;
      const ramp = dark ? ctx.RAMP[S.FLOOR_A] : ctx.RAMP[S.FLOOR_B];
      let t = ctx.tone[p] + (hash2(col, run) > 0.7 && bayer(x, y) > 0.6 ? 1 : 0);
      const vein = Math.abs(Math.sin(wx * 0.09 + wz * 0.05 + Math.sin(wz * 0.11 + col) * 2.5)) < 0.035;
      if (vein) t += dark ? 1 : -1;
      if (seam) t = 0;
      ctx.set(p, ctx.colorOf(p, ramp, t));
    },
    () => 0,
  );
  // as rachaduras na pedra
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (!STONES.has(mat[p])) continue;
      if (Math.abs(Math.sin(x * 0.13 + Math.sin(y * 0.2) * 2) * 30 - (y % 60)) < 0.6 && hash2(Math.floor(x / 34), Math.floor(y / 17)) > 0.8) nudge(ctx, p, -2);
    }
  // o céu: o brilho em volta da lua, as estrelas, as nuvens e o chumbo em losangos no vidro
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const wx = x - OX;
      if (mat[p] === S.MOON) {
        const crater = Math.sin(wx * 0.45) * Math.sin(y * 0.55 + wx * 0.15) > 0.6 || Math.hypot(wx - MOON.x + 10, y - MOON.y + 6) < 8 || Math.hypot(wx - MOON.x - 8, y - MOON.y - 12) < 6;
        const shade = Math.max(0, (wx - MOON.x) / MOON.r);
        ctx.set(p, ctx.RAMP[S.MOON][crater ? 3 : shade > 0.55 ? 4 : shade > 0.2 ? 5 : 6]);
        continue;
      }
      if (mat[p] !== S.SKY) continue;
      const d = Math.hypot(wx - MOON.x, y - MOON.y) - MOON.r;
      const glow = Math.max(0, 1 - d / 90);
      let t = glow > 0.75 ? 4 : glow > 0.45 ? 3 : glow > 0.2 ? 2 : glow > 0.05 ? 1 : 0;
      if (t < 4 && bayer(x, y) < ((glow * 4) % 1) * 0.6) t += 1;
      let c = ctx.RAMP[S.SKY][t];
      if (hash2(x, y) > 0.993 && glow < 0.3) c = [216, 224, 255];
      // as nuvens passando
      for (const [ox, oy, rx, ry] of [
        [-48, 92, 18, 6],
        [-30, 88, 14, 7],
        [34, 104, 20, 6],
        [52, 100, 12, 6],
        [-10, 134, 24, 6],
        [16, 130, 16, 7],
      ]) {
        const dd = Math.hypot((wx - WIN.cx - ox) / rx, (y - oy) / ry);
        if (dd < 1) c = y < oy - ry * 0.35 && dd > 0.55 ? [154, 162, 196] : mix([40, 44, 72], [90, 96, 130], 1 - dd);
      }
      const a = (wx - WIN.cx + y * 0.62) / 14;
      const b2 = (wx - WIN.cx - y * 0.62) / 14;
      if (d > 4 && (Math.abs(a - Math.round(a)) < 0.06 || Math.abs(b2 - Math.round(b2)) < 0.06)) c = [6, 5, 10];
      ctx.set(p, c);
    }
  // os ponteiros parados à meia-noite e as marcas das horas
  {
    const [fx, fy] = proj(CLK.x, CLK.top + 30, 2 * CLK.z + 2);
    for (let hh = 0; hh < 12; hh += 1) {
      const a = (hh / 12) * Math.PI * 2;
      const q = Math.round(fy - Math.cos(a) * 12.5) * w + Math.round(fx + Math.sin(a) * 12.5);
      if (mat[q] === S.DIAL) ctx.set(q, [42, 26, 16]);
    }
    stroke(ctx, fx, fy, fx, fy - 12, 0.6, [20, 8, 10]);
    stroke(ctx, fx - 1, fy, fx - 1, fy - 8, 0.6, [20, 8, 10]);
  }
}

function post(ctx) {
  const { W: w, img } = ctx;
  // as redomas de vidro: o contorno claro, o brilho de um lado e a tampa
  for (let k = 0; k < JARS.n; k += 1) {
    const jx = jarX(k);
    const pts = [];
    for (let yy = JARS.y - 3; yy > JARS.y - 26; yy -= 0.5) pts.push([jx - 10, yy], [jx + 10, yy]);
    for (let a = 0; a <= Math.PI; a += 0.04) pts.push([jx - Math.cos(a) * 10, JARS.y - 26 - Math.sin(a) * 8]);
    for (const [px, py] of pts) {
      const [sx, sy] = proj(px, py, 10);
      const p = Math.round(sy) * w + Math.round(sx);
      for (let c = 0; c < 3; c += 1) img[p * 4 + c] = img[p * 4 + c] + ([150, 166, 196][c] - img[p * 4 + c]) * 0.5;
    }
    for (let yy = JARS.y - 6; yy > JARS.y - 24; yy -= 1) {
      if (yy % 3 === 0) continue;
      const [sx, sy] = proj(jx - 7, yy, 18);
      const p = Math.round(sy) * w + Math.round(sx);
      for (let c = 0; c < 3; c += 1) img[p * 4 + c] = img[p * 4 + c] + (232 - img[p * 4 + c]) * 0.45;
    }
    if (k < JARS.n - 1) {
      const [hx, hy] = proj(jx, JARS.y - 15, 10);
      halo(ctx, hx, hy, 14, [255, 48, 64], 0.45, 2);
    }
  }
  halo(ctx, MOON.x + OX, MOON.y, 120, [184, 196, 255], 0.3, 1.2);
  for (const [x, y, z] of FLAMES) {
    const [sx, sy] = proj(x, y, z);
    halo(ctx, sx, sy, 34, [255, 176, 96], 0.35, 1.2);
  }
  // a névoa roxa rente ao chão
  for (let y = FLOOR - 12; y < Math.min(ctx.H, FLOOR + 50); y += 1)
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const n = Math.sin(x * 0.05 + y * 0.2) * 0.5 + Math.sin(x * 0.017 - y * 0.05) * 0.5;
      const band = Math.max(0, 1 - Math.abs(y - FLOOR - 10) / 32);
      const t = Math.max(0, n) * band * 0.3;
      if (t < bayer(x, y) * 0.12) continue;
      for (let c = 0; c < 3; c += 1) img[p * 4 + c] = img[p * 4 + c] + ([90, 74, 138][c] - img[p * 4 + c]) * t;
    }
}

export const PIXEL = {
  colors: C,
  dither: new Set([S.STONE, S.STONE_D, S.STONE_L, S.FLOOR_A, S.VELVET, S.VELVET_D, S.CLOCK, S.CLOCK_D, S.FRAME]),
  spec: new Set([S.GOLD, S.ROD, S.BRASS, S.PEND_GLASS, S.CHAIN]),
  flats: new Set([S.FLOOR_A, S.STONE, S.STONE_D, S.STONE_L, S.JOINT, S.SKY]),
  noEdge: new Set([S.STONE, S.STONE_D, S.STONE_L, S.JOINT, S.FLOOR_A, S.SKY, S.MOON]),
  decals,
  post,
  vignette: { start: 0.42, k: 1.6, max: 0.88 },
};
