/**
 * Versão 2.11: a Loja do Valtinho deitada, pintada do zero (500 × 225 px e a sobra em volta).
 * À esquerda, o canto do Valtinho atrás do balcão, sob a lâmpada dele, com a prateleira de
 * garrafas e o cartaz na parede; à direita, a estante maciça da mercadoria: a fileira de cima
 * forrada de veludo vermelho (os talismãs, cada um sob o seu foquinho), embaixo o quadro de
 * cortiça dos bilhetes das pedras de grife e a prateleira dos pacotes lacrados; e o balcão
 * comprido na frente (a bolsa, o copo de dados e a saída ficam nele, em HTML).
 * A região muda a luz: o Clube da Sinuca puxa para o roxo do neon, o Submundo para o vermelho.
 */
import { paintKit } from './botecoScene.js';
import { landKit } from './landScenes.js';
import { counterKit } from './landCounter.js';
import { glowLayer, halo, relight, shifted, vignetteBox } from './lightPass.js';
import { pixelText, textWidth } from './pixelFont.js';

const { hex, mixRgb, rngOf, bayer, buffer, plank, shelf } = paintKit;
const { plaster } = landKit;
const { subwayTiles, longCounter } = counterKit;

export const SHOP_W = 500;
export const SHOP_H = 225;
export const SHOP_PAD = Object.freeze({ x: 24, y: 44 });
const PX = SHOP_PAD.x;
const PY = SHOP_PAD.y;
const X0 = -PX;
const X1 = SHOP_W + PX;

/** Onde o HTML encosta (px da pintura): a estante, as fileiras e o tampo do balcão. */
export const SHOP_GEO = Object.freeze({ npc: 84, case: { x0: 176, x1: 494, y0: 26, y1: 164 }, row1: [36, 93], row2: [99, 160], cork: [182, 330], top: 164 });

const BLACK = [0, 0, 0];
const MAHOGANY = { hi: hex('#9a4e2a'), mid: hex('#6a2e14'), lo: hex('#40180a'), deep: hex('#1e0a04') };

const ATMO = {
  boteco: { ambient: [0.16, 0.16, 0.22], tint: [1, 0.84, 0.6], extra: null },
  neon: { ambient: [0.14, 0.12, 0.24], tint: [1, 0.8, 0.7], extra: { x: -10, y: 40, r: 260, c: [0.7, 0.35, 1], k: 0.55 } },
  bicho: { ambient: [0.18, 0.1, 0.09], tint: [1, 0.74, 0.52], extra: { x: 250, y: 280, r: 300, c: [1, 0.25, 0.12], k: 0.6 } },
};

/** O veludo vermelho com as dobras (as dobras em pontilhado). */
function velvet(b, x0, y0, x1, y1) {
  const hi = hex('#b0303a');
  const mid = hex('#7e1a24');
  const lo = hex('#4a0a12');
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const fold = Math.sin((x - x0) * 0.33) * 0.5 + 0.5;
      const t = fold * 0.8 + ((y - y0) / (y1 - y0)) * -0.25;
      const q = Math.round(t * 3 + bayer(x, y) - 0.5);
      b.put(x, y, q >= 3 ? hi : q === 2 ? mixRgb(hi, mid, 0.5) : q === 1 ? mid : lo);
    }
  }
}

/** A cortiça do quadro de bilhetes: grão claro e escuro, furinhos de alfinete velhos. */
function cork(b, r, x0, y0, x1, y1) {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const n = r();
      b.put(x, y, n < 0.18 ? hex('#8a5a2a') : n < 0.36 ? hex('#c8925a') : n < 0.4 ? hex('#5a3412') : hex('#aa7440'));
    }
  }
  for (let i = 0; i < 26; i += 1) b.put(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), hex('#3a2008'));
}

/** O cartaz velho na parede do Valtinho (papel amarelado, letra de pincel). */
function poster(b, r, x, y, w, h, lines, color) {
  b.rect(x + 1, y + 2, w, h, BLACK, 0.4);
  b.rect(x, y, w, h, hex('#e6d6a8'));
  for (let i = 0; i < (w * h) / 8; i += 1) b.put(x + r() * w, y + r() * h, hex('#c8b484'), 0.6);
  lines.forEach((t, i) => pixelText(b, t, x + Math.round((w - textWidth(t)) / 2), y + 3 + i * 7, hex(color)));
  b.rect(x, y, w, 1, hex('#f4ead0'));
  b.put(x + 1, y + 1, hex('#c42a1e'));
  b.put(x + w - 2, y + 1, hex('#c42a1e'));
  // a ponta descolando
  b.rect(x + w - 4, y + h - 3, 4, 3, hex('#b8a274'));
}

export function paintShopBack(seed = 41, atmosphere = 'boteco') {
  const raw = buffer(SHOP_W + PX * 2, SHOP_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  const A = ATMO[atmosphere] ?? ATMO.boteco;
  const { case: C, top } = SHOP_GEO;
  // o teto, a parede e o azulejo
  for (let y = -PY; y < 0; y += 6) plank(b, r, X0, y, X1 - X0, 6, { tone: { hi: hex('#4a2e18'), mid: hex('#36210f'), lo: hex('#24150a'), deep: hex('#140b05') } });
  plaster(b, r, X0, 0, X1, 72, { base: '#6a5a46', dark: '#4a3e30' });
  subwayTiles(b, r, X0, 75, X1, top);
  plank(b, r, X0, 0, X1 - X0, 5, { tone: MAHOGANY });
  // o canto do Valtinho: prateleira de garrafas, cartazes e o relógio de ponto
  shelf(b, r, 14, 66, 140, [3, 0, 'mug', 5, 1, 4, 2, 'mug', 0]);
  poster(b, r, 18, 16, 40, 17, ['PROIBIDO', 'FIADO'], '#2a1a08');
  poster(b, r, 112, 12, 46, 24, ['NÃO', 'ACEITAMOS', 'DEVOLUÇÃO'], '#9a1a10');
  // a estante maciça
  b.rect(C.x0 + 3, C.y0 + 4, C.x1 - C.x0, C.y1 - C.y0, BLACK, 0.5);
  plank(b, r, C.x0, C.y0, C.x1 - C.x0, C.y1 - C.y0, { tone: MAHOGANY, vertical: true });
  // a cornija com a placa
  plank(b, r, C.x0 - 4, C.y0 - 2, C.x1 - C.x0 + 8, 10, { tone: MAHOGANY });
  b.rect(C.x0 - 4, C.y0 - 2, C.x1 - C.x0 + 8, 1, MAHOGANY.hi);
  b.rect(C.x0 - 4, C.y0 + 7, C.x1 - C.x0 + 8, 1, MAHOGANY.deep);
  // fileira 1: o veludo dos talismãs, com os foquinhos de latão
  const [r1a, r1b] = SHOP_GEO.row1;
  b.rect(C.x0 + 6, r1a - 1, C.x1 - C.x0 - 12, r1b - r1a + 2, MAHOGANY.deep);
  velvet(b, C.x0 + 7, r1a, C.x1 - 7, r1b);
  b.light(C.x0 + 7, r1a, C.x1 - C.x0 - 14, 6, BLACK, (x, y) => 0.6 - (y - r1a) * 0.1);
  const slots = [0, 1, 2].map((i) => Math.round(C.x0 + ((C.x1 - C.x0) * (i + 0.5)) / 3));
  for (const sx of slots) {
    b.rect(sx - 4, r1a, 8, 3, hex('#b08a2e'));
    b.rect(sx - 4, r1a, 8, 1, hex('#ffe08a'));
    G.rect(sx - 3, r1a + 3, 6, 1, hex('#fff2cc'));
  }
  // o tampo da fileira 1 (a prateleira) com a beirada
  plank(b, r, C.x0 + 4, r1b, C.x1 - C.x0 - 8, 5, { tone: MAHOGANY });
  b.rect(C.x0 + 4, r1b, C.x1 - C.x0 - 8, 1, hex('#c8784a'));
  // fileira 2: a cortiça dos bilhetes e a prateleira dos pacotes
  const [r2a, r2b] = SHOP_GEO.row2;
  const [ck0, ck1] = SHOP_GEO.cork;
  b.rect(ck0 - 2, r2a - 1, ck1 - ck0 + 4, r2b - r2a + 2, MAHOGANY.deep);
  cork(b, r, ck0, r2a, ck1, r2b);
  b.rect(ck1 + 2, r2a, 2, r2b - r2a, MAHOGANY.lo);
  b.rect(ck1 + 4, r2a, C.x1 - 7 - ck1 - 4, r2b - r2a, hex('#2a1208'));
  b.light(ck1 + 4, r2a, C.x1 - 7 - ck1 - 4, r2b - r2a, hex('#5a2a10'), (x, y) => 0.4 - ((y - r2a) / (r2b - r2a)) * 0.3);
  b.light(C.x0 + 7, r2a, C.x1 - C.x0 - 14, 5, BLACK, (x, y) => 0.6 - (y - r2a) * 0.12);
  // o balcão comprido
  longCounter(b, r, top);
  // a luz
  const lights = [
    { x: SHOP_GEO.npc, y: 26, r: 220, c: A.tint, k: 1.25, cone: 0.62, out: 0.3 },
    ...slots.map((sx) => ({ x: sx, y: r1a + 3, r: 70, c: [1, 0.9, 0.72], k: 0.75, cone: 0.9, out: 0.25 })),
    { x: 336, y: 112, r: 170, c: A.tint, k: 0.45 },
    { x: 330, y: -30, r: 230, c: A.tint, k: 0.5 },
  ];
  if (A.extra) lights.push(A.extra);
  relight(raw, lights, { ambient: A.ambient, mask: G.mask, ox: PX, oy: PY });
  for (const sx of slots) halo(raw, sx + PX, r1a + 4 + PY, 14, [255, 230, 170], 0.5, 1.4);
  halo(raw, SHOP_GEO.npc + PX, 30 + PY, 40, [255, 220, 150], 0.3, 1.2);
  vignetteBox(raw, PX, PY, SHOP_W, SHOP_H, 0.55, 0.45);
  return { w: raw.w, h: raw.h, data: raw.data };
}
