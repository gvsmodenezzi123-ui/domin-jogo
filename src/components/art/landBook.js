/**
 * Versão 2.11: o Livro de Boteco e o Caderno de Fiado deitados, abertos em duas páginas na mesa
 * (500 × 225 px e a sobra), sob a luz da lâmpada:
 *   paintAlbumSpread:    o álbum de figurinhas de couro: a capa com a costura, as duas páginas
 *                        creme grossas e a sombra da lombada (as figurinhas e a ficha são HTML);
 *   paintNotebookSpread: o caderno de espiral de papel pardo: a pauta azul, a margem vermelha,
 *                        as argolas no meio e as cantoneiras de lata.
 */
import { paintKit } from './botecoScene.js';
import { relight, shifted, vignetteBox } from './lightPass.js';

const { hex, mixRgb, shift, rngOf, buffer, plank } = paintKit;

export const BOOK_PAD = Object.freeze({ x: 24, y: 44 });
const W = 500;
const H = 225;
const PX = BOOK_PAD.x;
const PY = BOOK_PAD.y;
const X0 = -PX;
const X1 = W + PX;
const Y1 = H + PY;
const BLACK = [0, 0, 0];
const TABLE = { hi: hex('#7a4e2a'), mid: hex('#5a3820'), lo: hex('#3a2414'), deep: hex('#1e120a') };

/** As duas páginas (px da pintura): a da esquerda e a da direita. */
export const BOOK_GEO = Object.freeze({ left: { x0: 44, y0: 26, x1: 246, y1: 210 }, right: { x0: 254, y0: 26, x1: 456, y1: 210 } });

const LIGHTS = [
  { x: 250, y: -30, r: 340, c: [1, 0.88, 0.66], k: 1.2 },
  { x: 250, y: 120, r: 200, c: [1, 0.9, 0.72], k: 0.35 },
  // o resto do salão, para os cantos de baixo das páginas não sumirem
  { x: 100, y: 200, r: 170, c: [1, 0.86, 0.66], k: 0.3 },
  { x: 400, y: 200, r: 170, c: [1, 0.86, 0.66], k: 0.3 },
];

function tableTop(b, r) {
  for (let y = -PY, i = 0; y < Y1; y += 18, i += 1) {
    plank(b, r, X0, y, X1 - X0, 18, { tone: i % 2 ? TABLE : { ...TABLE, hi: shift(TABLE.hi, 8), mid: shift(TABLE.mid, 6) } });
    b.rect(X0, y + 17, X1 - X0, 1, TABLE.deep);
  }
}

/** Uma página: o papel com o degradê para a lombada e a curva da folha. */
function page(b, r, { x0, y0, x1, y1 }, side, paper, edge) {
  const base = hex(paper);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const toSpine = side < 0 ? (x1 - x) / (x1 - x0) : (x - x0) / (x1 - x0);
      let c = mixRgb(base, hex(edge), Math.max(0, 0.18 - toSpine) * 3.2);
      if (r() < 0.05) c = shift(c, -10);
      b.put(x, y, c);
    }
  }
  // as folhas de baixo, na beirada de fora
  for (let k = 1; k <= 3; k += 1) {
    const ex = side < 0 ? x0 - k : x1 + k - 1;
    b.rect(ex, y0 + k, 1, y1 - y0 - k, shift(base, -18 * k));
  }
  b.rect(x0, y1, x1 - x0, 2, shift(base, -50));
}

export function paintAlbumSpread(seed = 37) {
  const raw = buffer(W + PX * 2, H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const { left: L, right: R } = BOOK_GEO;
  tableTop(b, r);
  // a capa de couro (mais larga que as páginas), com a costura
  const cx0 = L.x0 - 12;
  const cx1 = R.x1 + 12;
  const cy0 = L.y0 - 8;
  const cy1 = L.y1 + 10;
  b.rect(cx0 + 4, cy0 + 6, cx1 - cx0, cy1 - cy0, BLACK, 0.55);
  for (let y = cy0; y < cy1; y += 1) {
    for (let x = cx0; x < cx1; x += 1) {
      const n = r();
      b.put(x, y, n < 0.15 ? hex('#3a1c0e') : n > 0.92 ? hex('#6a3a1e') : hex('#4e2814'));
    }
  }
  for (let x = cx0 + 4; x < cx1 - 4; x += 3) {
    b.put(x, cy0 + 3, hex('#c8a46a'));
    b.put(x, cy1 - 4, hex('#c8a46a'));
  }
  for (let y = cy0 + 4; y < cy1 - 4; y += 3) {
    b.put(cx0 + 3, y, hex('#c8a46a'));
    b.put(cx1 - 4, y, hex('#c8a46a'));
  }
  // cantoneiras de latão
  for (const [x, y] of [
    [cx0, cy0],
    [cx1 - 10, cy0],
    [cx0, cy1 - 10],
    [cx1 - 10, cy1 - 10],
  ]) {
    b.rect(x, y, 10, 10, hex('#b08a2e'));
    b.rect(x + 1, y + 1, 8, 1, hex('#ffe08a'));
  }
  page(b, r, L, -1, '#efe4c6', '#8a7350');
  page(b, r, R, 1, '#efe4c6', '#8a7350');
  // a lombada
  b.rect(L.x1, L.y0 - 2, R.x0 - L.x1, L.y1 - L.y0 + 4, hex('#3a1c0e'));
  b.light(L.x1 - 10, L.y0, 10, L.y1 - L.y0, BLACK, (x) => (x - (L.x1 - 10)) * 0.05);
  b.light(R.x0, R.y0, 10, R.y1 - R.y0, BLACK, (x) => 0.5 - (x - R.x0) * 0.05);
  // o canto de página dobrado
  for (let k = 0; k < 9; k += 1) b.rect(R.x1 - 9 + k, R.y1 - 9 + k, 9 - k, 1, hex('#d8c8a0'));
  relight(raw, LIGHTS, { ambient: [0.36, 0.34, 0.34], ox: PX, oy: PY });
  vignetteBox(raw, PX, PY, W, H, 0.3, 0.45);
  return { w: raw.w, h: raw.h, data: raw.data };
}

export function paintNotebookSpread(seed = 43) {
  const raw = buffer(W + PX * 2, H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const { left: L, right: R } = BOOK_GEO;
  tableTop(b, r);
  b.rect(L.x0 + 4, L.y0 + 6, R.x1 - L.x0, L.y1 - L.y0, BLACK, 0.55);
  // a capa de papelão aparecendo em volta
  b.rect(L.x0 - 5, L.y0 - 5, R.x1 - L.x0 + 10, L.y1 - L.y0 + 10, hex('#5a4630'));
  page(b, r, L, -1, '#e2cfa2', '#9a7a48');
  page(b, r, R, 1, '#e2cfa2', '#9a7a48');
  // a pauta azul e a margem vermelha de cada folha
  for (const P of [L, R]) {
    for (let y = P.y0 + 18; y < P.y1 - 4; y += 9) for (let x = P.x0 + 2; x < P.x1 - 2; x += 1) if (r() > 0.05) b.put(x, y, hex('#7f9fc4'), 0.45);
    for (let y = P.y0; y < P.y1; y += 1) {
      b.put(P.x0 + 16, y, hex('#c8504a'), 0.6);
      b.put(P.x0 + 18, y, hex('#c8504a'), 0.4);
    }
  }
  // as argolas da espiral no meio
  b.rect(L.x1, L.y0, R.x0 - L.x1, L.y1 - L.y0, hex('#2a1e14'));
  for (let y = L.y0 + 4; y < L.y1 - 4; y += 8) {
    b.ellipse(L.x1 - 1, y + 2, 2, 1.5, hex('#1a120a'));
    b.ellipse(R.x0 + 1, y + 2, 2, 1.5, hex('#1a120a'));
    b.rect(L.x1 - 3, y, 11, 3, hex('#8a949a'));
    b.rect(L.x1 - 3, y, 11, 1, hex('#e0e8ec'));
    b.put(L.x1 - 3, y + 2, hex('#4a5054'));
  }
  // as cantoneiras de lata
  for (const [x, y, dx, dy] of [
    [L.x0 - 5, L.y0 - 5, 1, 1],
    [R.x1 - 7, R.y0 - 5, -1, 1],
    [L.x0 - 5, L.y1 - 7, 1, -1],
    [R.x1 - 7, R.y1 - 7, -1, -1],
  ]) {
    for (let k = 0; k < 12; k += 1) {
      b.rect(dx > 0 ? x : x + 12 - (12 - k), dy > 0 ? y + k : y + 12 - k, 12 - k, 1, hex('#9aa2a6'));
    }
    b.put(x + (dx > 0 ? 3 : 8), y + (dy > 0 ? 3 : 8), hex('#4a5054'));
  }
  // uma marca de copo no pé da folha da esquerda
  for (let a = 0; a < Math.PI * 1.7; a += 0.03) b.put(L.x1 - 34 + Math.cos(a) * 12, L.y1 - 26 + Math.sin(a) * 10, hex('#8a6a3a'), 0.35);
  relight(raw, LIGHTS, { ambient: [0.36, 0.34, 0.34], ox: PX, oy: PY });
  vignetteBox(raw, PX, PY, W, H, 0.3, 0.45);
  return { w: raw.w, h: raw.h, data: raw.data };
}
