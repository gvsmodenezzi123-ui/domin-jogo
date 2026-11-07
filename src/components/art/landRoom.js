/**
 * Versão 2.11: o saguão da roda deitado, pintado do zero (500 × 225 px e a sobra): o salão dos
 * fundos visto de cima, como quem olha do alto da escada. O assoalho de tábuas, o tapete
 * gasto, a mesa quadrada de feltro sob a luz da lâmpada (as cadeiras em volta; os rostos e os
 * nomes vêm por cima, em HTML), o engradado de garrafas no canto e, à direita, a mesinha de
 * apoio com a folha das REGRAS DA CASA (as regras vêm por cima, na folha).
 */
import { paintKit } from './botecoScene.js';
import { glowLayer, relight, shifted, vignetteBox } from './lightPass.js';

const { hex, mixRgb, shift, rngOf, buffer, plank, felt } = paintKit;

export const ROOM_PAD = Object.freeze({ x: 24, y: 44 });
const W = 500;
const H = 225;
const PX = ROOM_PAD.x;
const PY = ROOM_PAD.y;
const X0 = -PX;
const X1 = W + PX;
const Y1 = H + PY;
const BLACK = [0, 0, 0];

/** A mesa (feltro, px da pintura), as cadeiras em volta e a mesinha das regras. */
export const ROOM_GEO = Object.freeze({ table: { x0: 95, y0: 57, x1: 205, y1: 167 }, side: { x0: 302, y0: 10, x1: 492, y1: 176 } });

const FLOOR = { hi: hex('#7a4e2a'), mid: hex('#5a3820'), lo: hex('#3a2414'), deep: hex('#1e120a') };
const RAIL = { hi: hex('#b07a46'), mid: hex('#7e4c26'), lo: hex('#4e2d15'), deep: hex('#2b170b') };
const FELT_TONE = { hi: hex('#47a062'), mid: hex('#34804c'), lo: hex('#215c36'), deep: hex('#143e24') };

/** Uma cadeira vista de cima: o assento quadrado e o encosto do lado de fora. */
function chair(b, r, cx, cy, side) {
  const s = 26;
  b.rect(cx - s / 2 + 2, cy - s / 2 + 3, s, s, BLACK, 0.45);
  plank(b, r, cx - s / 2, cy - s / 2, s, s, { tone: RAIL });
  b.rect(cx - s / 2, cy - s / 2, s, 1, RAIL.hi);
  b.rect(cx - s / 2 + 3, cy - s / 2 + 3, s - 6, s - 6, hex('#6a2a1c'));
  b.rect(cx - s / 2 + 3, cy - s / 2 + 3, s - 6, 1, hex('#9a4a32'));
  const back = { top: [cx - s / 2, cy - s / 2 - 5, s, 5], bottom: [cx - s / 2, cy + s / 2, s, 5], left: [cx - s / 2 - 5, cy - s / 2, 5, s], right: [cx + s / 2, cy - s / 2, 5, s] }[side];
  plank(b, r, back[0], back[1], back[2], back[3], { tone: RAIL, vertical: side === 'left' || side === 'right' });
}

/** O engradado de cerveja visto de cima: a grade com as tampinhas. */
function crateTop(b, x, y) {
  b.rect(x + 2, y + 3, 40, 28, BLACK, 0.45);
  b.rect(x, y, 40, 28, hex('#8a5a2a'));
  b.rect(x, y, 40, 1, hex('#b8844a'));
  for (let k = 0; k < 4; k += 1) {
    for (let j = 0; j < 6; j += 1) {
      const cx = x + 4 + j * 6;
      const cy = y + 4 + k * 6;
      b.rect(cx, cy, 5, 5, hex('#2a1608'));
      if ((k * 6 + j) % 7 !== 3) {
        b.ellipse(cx + 2.5, cy + 2.5, 2, 2, hex(['#c9a24a', '#c42a1e', '#d8d2c4'][(k + j) % 3]));
        b.put(cx + 2, cy + 1, hex('#fff2cc'));
      }
    }
  }
}

export function paintBackRoom(seed = 29) {
  const raw = buffer(W + PX * 2, H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  const { table: T, side: S } = ROOM_GEO;
  // o assoalho (tábuas compridas na vertical)
  for (let x = X0; x < X1; x += 14) {
    plank(b, r, x, -PY, 14, Y1 + PY, { tone: FLOOR, vertical: true });
    b.rect(x + 13, -PY, 1, Y1 + PY, FLOOR.deep);
    for (let y = -PY + ((x * 7) % 60); y < Y1; y += 70 + ((x * 3) % 30)) b.rect(x, y, 14, 1, FLOOR.deep);
  }
  // o tapete gasto debaixo da mesa
  const tcx = (T.x0 + T.x1) / 2;
  const tcy = (T.y0 + T.y1) / 2;
  for (let y = tcy - 98; y < tcy + 98; y += 1) {
    for (let x = tcx - 120; x < tcx + 120; x += 1) {
      const dx = Math.abs(x - tcx) / 120;
      const dy = Math.abs(y - tcy) / 98;
      if (dx > 1 || dy > 1) continue;
      const border = dx > 0.9 || dy > 0.88;
      const inner = dx > 0.82 || dy > 0.78;
      let c = border ? hex('#3a1410') : inner ? hex('#b8902a') : hex('#7a2418');
      if (!border && !inner && ((Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0)) c = shift(c, -12);
      if (r() < 0.08) c = shift(c, -20);
      b.put(x, y, c);
    }
  }
  // as cadeiras e a mesa
  chair(b, r, tcx, T.y1 + 26, 'bottom');
  chair(b, r, tcx, T.y0 - 26, 'top');
  chair(b, r, T.x0 - 26, tcy, 'left');
  chair(b, r, T.x1 + 26, tcy, 'right');
  b.rect(T.x0 - 7 + 3, T.y0 - 7 + 5, T.x1 - T.x0 + 14, T.y1 - T.y0 + 14, BLACK, 0.5);
  plank(b, r, T.x0 - 7, T.y0 - 7, T.x1 - T.x0 + 14, 7, { tone: RAIL });
  plank(b, r, T.x0 - 7, T.y1, T.x1 - T.x0 + 14, 7, { tone: RAIL });
  plank(b, r, T.x0 - 7, T.y0, 7, T.y1 - T.y0, { tone: RAIL, vertical: true });
  plank(b, r, T.x1, T.y0, 7, T.y1 - T.y0, { tone: RAIL, vertical: true });
  b.rect(T.x0 - 7, T.y0 - 7, T.x1 - T.x0 + 14, 1, RAIL.hi);
  felt(b, r, T.x0, T.y0, T.x1, T.y1, () => true, FELT_TONE);
  b.light(T.x0, T.y0, T.x1 - T.x0, 4, BLACK, (x, y) => 0.5 - (y - T.y0) * 0.12);
  // em cima da mesa: o cinzeiro e dois copos nos cantos
  b.ellipse(T.x0 + 12, T.y0 + 12, 7, 7, hex('#5d6a6c'));
  b.ellipse(T.x0 + 12, T.y0 + 12, 5, 5, hex('#2a2e2c'));
  for (const [gx, gy] of [
    [T.x1 - 12, T.y0 + 12],
    [T.x0 + 14, T.y1 - 12],
  ]) {
    b.ellipse(gx + 1, gy + 2, 6, 6, BLACK, 0.4);
    b.ellipse(gx, gy, 6, 6, hex('#d9a531'));
    b.ellipse(gx, gy, 4, 4, hex('#f4ecd2'));
  }
  crateTop(b, 10, 182);
  // a mesinha de apoio com a folha das regras
  b.rect(S.x0 + 3, S.y0 + 5, S.x1 - S.x0, S.y1 - S.y0, BLACK, 0.5);
  for (let y = S.y0; y < S.y1; y += 10) plank(b, r, S.x0, y, S.x1 - S.x0, Math.min(10, S.y1 - y), { tone: RAIL });
  b.rect(S.x0, S.y0, S.x1 - S.x0, 1, RAIL.hi);
  const p = { x0: S.x0 + 8, y0: S.y0 + 6, x1: S.x1 - 8, y1: S.y1 - 8 };
  b.rect(p.x0 + 2, p.y0 + 3, p.x1 - p.x0, p.y1 - p.y0, BLACK, 0.4);
  for (let y = p.y0; y < p.y1; y += 1) {
    for (let x = p.x0; x < p.x1; x += 1) {
      const base = mixRgb(hex('#e8ddc2'), hex('#cfc0a0'), ((y - p.y0) / (p.y1 - p.y0)) * 0.7 + ((x - p.x0) / (p.x1 - p.x0)) * 0.1);
      G.put(x, y, r() < 0.02 ? shift(base, -8) : base);
    }
  }
  G.rect(p.x0, p.y0 + 4, p.x1 - p.x0, 1, hex('#c8504a'));
  // a caneta largada
  b.line(S.x1 - 30, S.y1 - 4, S.x1 - 6, S.y1 - 12, hex('#1f4fa0'));
  b.line(S.x1 - 30, S.y1 - 3, S.x1 - 6, S.y1 - 11, hex('#163a78'));
  b.put(S.x1 - 31, S.y1 - 3, hex('#d8d2c4'));
  const lights = [
    { x: tcx, y: tcy, r: 210, c: [1, 0.86, 0.6], k: 1.3 },
    { x: 400, y: 40, r: 240, c: [1, 0.9, 0.72], k: 0.7 },
  ];
  relight(raw, lights, { ambient: [0.22, 0.2, 0.24], mask: G.mask, ox: PX, oy: PY });
  vignetteBox(raw, PX, PY, W, H, 0.55, 0.5);
  return { w: raw.w, h: raw.h, data: raw.data };
}
