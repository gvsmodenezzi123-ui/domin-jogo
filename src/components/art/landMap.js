/**
 * Versão 2.11: o mapa deitado. As três regiões viram três folhas do caderno de fiado, presas
 * lado a lado na mesa do boteco com fita crepe (a teia corre da esquerda para a direita e as
 * folhas rolam de lado); à direita, a prancheta com a comanda, onde aparece o que tem no nó
 * escolhido. Cada folha tem o papel da sua região: o caderno pautado do Boteco da Esquina, o
 * bloco cinza-lilás do Clube da Sinuca (pauta ciano) e o talão rosado do Jogo do Bicho.
 *   paintMapBack: a mesa (tábuas, a luz da lâmpada), a prancheta com o prendedor e a comanda;
 *   paintMapPage: uma folha (350 × 184 px; ×2 no palco).
 */
import { paintKit } from './botecoScene.js';
import { glowLayer, relight, shifted, vignetteBox } from './lightPass.js';
import { pixelText } from './pixelFont.js';

const { hex, mixRgb, shift, rngOf, buffer, plank } = paintKit;

export const MAP_W = 500;
export const MAP_H = 225;
export const MAP_PAD = Object.freeze({ x: 24, y: 44 });
const PX = MAP_PAD.x;
const PY = MAP_PAD.y;
const X0 = -PX;
const X1 = MAP_W + PX;
const Y1 = MAP_H + PY;

/** A folha de cada região (px da pintura). */
export const PAGE_W = 350;
export const PAGE_H = 184;

const INK = hex('#0b0705');
const BLACK = [0, 0, 0];
const TABLE = { hi: hex('#8a5a32'), mid: hex('#62391c'), lo: hex('#40240f'), deep: hex('#1e1007') };

const LIGHTS = [
  { x: 170, y: -40, r: 330, c: [1, 0.86, 0.62], k: 1.15 },
  { x: 420, y: 40, r: 230, c: [1, 0.9, 0.72], k: 0.85 },
];
const AMBIENT = [0.2, 0.19, 0.24];

/** A mesa, a prancheta e a comanda (o papel do mapa vem por cima, em HTML). */
export function paintMapBack(seed = 31) {
  const raw = buffer(MAP_W + PX * 2, MAP_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  // as tábuas da mesa
  for (let y = -PY, i = 0; y < Y1; y += 18, i += 1) {
    plank(b, r, X0, y, X1 - X0, 18, { tone: i % 2 ? TABLE : { hi: shift(TABLE.hi, 8), mid: shift(TABLE.mid, 6), lo: TABLE.lo, deep: TABLE.deep } });
    b.rect(X0, y + 17, X1 - X0, 1, TABLE.deep);
    for (let k = 0; k < 4; k += 1) b.rect(X0 + r() * (X1 - X0), y + 1 + Math.floor(r() * 15), 10 + r() * 30, 1, TABLE.hi, 0.35);
  }
  // marcas de copo e uma queimadura de cigarro na madeira
  for (const [cx, cy, rr] of [
    [30, 14, 9],
    [326, 208, 8],
    [180, 222, 10],
  ]) {
    for (let a = 0; a < Math.PI * 1.8; a += 0.03) b.put(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8, hex('#2a1608'), 0.5);
  }
  b.ellipse(300, 18, 3, 2, hex('#1a0c04'), 0.8);
  // a prancheta (eucatex com o prendedor de metal)
  const bx0 = 346;
  const bx1 = 494;
  const by0 = 34;
  const by1 = 220;
  b.rect(bx0 + 3, by0 + 4, bx1 - bx0, by1 - by0, BLACK, 0.5);
  for (let y = by0; y < by1; y += 1) {
    for (let x = bx0; x < bx1; x += 1) {
      const corner = (x - bx0 < 3 || bx1 - 1 - x < 3) && (y - by0 < 3 || by1 - 1 - y < 3);
      if (corner && Math.hypot(Math.min(x - bx0, bx1 - 1 - x) - 3, Math.min(y - by0, by1 - 1 - y) - 3) > 3) continue;
      const n = r();
      b.put(x, y, n < 0.08 ? hex('#6a4a2c') : n > 0.94 ? hex('#a8845a') : hex('#8a6640'));
    }
  }
  b.rect(bx0, by0, bx1 - bx0, 1, hex('#b8946a'));
  // a comanda presa nela (fica de fora da luz: é onde se lê; o sombreado é pintado à mão)
  const sx0 = bx0 + 8;
  const sx1 = bx1 - 8;
  const sy0 = by0 + 14;
  const sy1 = by1 - 8;
  b.rect(sx0 + 1, sy0 + 2, sx1 - sx0, sy1 - sy0, BLACK, 0.35);
  for (let y = sy0; y < sy1; y += 1) {
    const t = (y - sy0) / (sy1 - sy0);
    for (let x = sx0; x < sx1; x += 1) {
      const n = r();
      const base = mixRgb(hex('#f8f2e2'), hex('#e6dcc0'), t * 0.6 + ((x - sx0) / (sx1 - sx0)) * 0.12);
      G.put(x, y, n < 0.02 ? shift(base, -6) : base);
    }
  }
  G.rect(sx0, sy0 + 2, sx1 - sx0, 12, hex('#b8261c'));
  G.rect(sx0, sy0 + 14, sx1 - sx0, 1, hex('#7a120c'));
  pixelText(b, 'COMANDA', sx0 + 6, sy0 + 5, hex('#fff2e0'), { put: G.put });
  pixelText(b, 'MESA 7', sx1 - 29, sy0 + 5, hex('#ffd2c0'), { put: G.put });
  // a pauta só no pé da comanda (onde não tem texto)
  for (let y = sy1 - 40; y < sy1 - 4; y += 10) G.rect(sx0 + 4, y, sx1 - sx0 - 8, 1, hex('#e0d8e6'));
  // o picote de baixo
  for (let x = sx0; x < sx1; x += 3) G.put(x, sy1 - 1, hex('#b8ab88'));
  // o prendedor
  const cx = Math.round((bx0 + bx1) / 2);
  b.rect(cx - 22, by0 - 6, 44, 14, hex('#3a3e42'));
  b.rect(cx - 22, by0 - 6, 44, 1, hex('#c8d0d6'));
  b.rect(cx - 20, by0 - 4, 40, 8, hex('#8a949a'));
  b.rect(cx - 20, by0 - 4, 40, 1, hex('#dfe6ea'));
  b.rect(cx - 6, by0 - 10, 12, 5, hex('#5a6066'));
  b.rect(cx - 4, by0 - 9, 8, 2, hex('#1a1c1e'));
  b.put(cx - 18, by0 + 5, hex('#2a2e30'));
  b.put(cx + 17, by0 + 5, hex('#2a2e30'));
  // a luz
  relight(raw, LIGHTS, { ambient: AMBIENT, mask: G.mask, ox: PX, oy: PY });
  vignetteBox(raw, PX, PY, MAP_W, MAP_H, 0.5, 0.4);
  return { w: raw.w, h: raw.h, data: raw.data };
}

const PAPERS = {
  boteco: { paper: '#ece2c4', edge: '#c8a86a', line: '#7f9fc4', margin: '#c8504a' },
  neon: { paper: '#dcd8e2', edge: '#a8a0b8', line: '#5ab8c8', margin: '#a050c0' },
  bicho: { paper: '#efd8c8', edge: '#c89478', line: '#c87a7a', margin: '#a02818' },
};

/** Uma folha do caderno: pauta, margem, furos da espiral arrancada, manchas, dobra e fita crepe. */
export function paintMapPage(seed = 1, atmosphere = 'boteco') {
  const w = PAGE_W;
  const h = PAGE_H;
  const b = buffer(w, h);
  const r = rngOf(seed);
  const P = PAPERS[atmosphere] ?? PAPERS.boteco;
  const paper = hex(P.paper);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const n = r();
      let c = n < 0.07 ? shift(paper, -12) : n > 0.95 ? shift(paper, 8) : paper;
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (edge < 14) c = mixRgb(c, hex(P.edge), (1 - edge / 14) * 0.4);
      b.put(x, y, c);
    }
  }
  // a pauta e a margem dupla
  for (let y = 30; y < h - 3; y += 9) for (let x = 0; x < w; x += 1) if (r() > 0.04) b.put(x, y, hex(P.line), 0.4);
  for (let y = 0; y < h; y += 1) {
    b.put(26, y, hex(P.margin), 0.55);
    b.put(28, y, hex(P.margin), 0.4);
  }
  // os furos da espiral (a folha foi arrancada)
  for (let y = 7; y < h - 4; y += 12) {
    b.ellipse(7, y, 2.4, 2.6, hex('#2a1608'));
    b.put(9, y - 2, hex('#fffaf0'));
    if (r() < 0.5) b.rect(0, y - 1, 6, 2, hex('#2a1608'));
  }
  // fibras do papel
  for (let i = 0; i < (w * h) / 140; i += 1) {
    const fx = Math.floor(r() * w);
    const fy = Math.floor(r() * h);
    b.line(fx, fy, fx + 2 + Math.floor(r() * 3), fy + (r() < 0.5 ? 0 : 1), shift(paper, -30), 0.35);
  }
  // a dobra do meio
  const fx = Math.round(w * 0.52);
  b.line(fx, 0, fx + 3, h, hex('#9a8256'), 0.35);
  b.line(fx + 1, 0, fx + 4, h, hex('#fffaf0'), 0.45);
  // manchas de gordura e marcas de copo
  for (let i = 0; i < 3; i += 1) {
    const cx = w * (0.15 + r() * 0.75);
    const cy = h * (0.2 + r() * 0.7);
    const rad = 5 + r() * 8;
    b.ellipse(cx, cy, rad, rad * 0.85, hex('#c8a45a'), 0.22);
    b.ellipse(cx, cy, rad * 0.7, rad * 0.6, hex('#b8944a'), 0.12);
  }
  for (let i = 0; i < 2; i += 1) {
    const cx = w * (0.2 + r() * 0.7);
    const cy = h * (0.25 + r() * 0.6);
    const rr = 9 + r() * 4;
    const start = r() * Math.PI * 2;
    for (let a = start; a < start + Math.PI * 1.7; a += 0.02) b.put(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, hex('#8a6a3a'), 0.35);
  }
  // rabiscos de caneta na margem de baixo (contas do fiado)
  const ink = hex('#26408a');
  for (let k = 0; k < 3; k += 1) {
    const x0 = 40 + Math.floor(r() * (w - 120));
    const y0 = h - 10;
    for (let x = 0; x < 16 + r() * 18; x += 1) b.put(x0 + x, y0 + Math.round(Math.sin(x * 1.3 + k) * 1.2), ink, 0.6);
  }
  // o canto de cima com a fita crepe (os dois cantos de cima)
  for (const tx of [w - 34, 34]) {
    for (let y = -2; y < 10; y += 1) for (let x = -12; x < 12; x += 1) if (Math.abs(x + (y - 4) * 0.5) < 11) b.put(tx + x, y, hex('#e6d8a0'), 0.75);
  }
  // encardido nas bordas
  b.light(0, 0, w, h, hex('#4a3a28'), (x, y) => Math.max(0, 1 - Math.min(x, y, w - 1 - x, h - 1 - y) / 12) * 0.45);
  // o contorno da folha
  for (let x = 0; x < w; x += 1) {
    b.put(x, 0, shift(paper, -40), 0.6);
    b.put(x, h - 1, INK, 0.5);
  }
  return { w, h, data: b.data };
}
