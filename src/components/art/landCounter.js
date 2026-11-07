/**
 * Versão 2.11: o Balcão de Maletas deitado, pintado do zero (500 × 225 px e a sobra em volta,
 * como a tela inicial). Um canhão de luz no teto acende a maleta do meio do carrossel (o
 * carrossel é HTML, por cima); à direita, o quadro-negro grande com a ficha, com a luminária
 * de quadro em cima; à esquerda, as prateleiras com garrafas; embaixo, o balcão comprido.
 * A dificuldade muda a luz da sala inteira: Peças Pretas esfriam tudo (madrugada), Peças
 * Prateadas acendem o inferno (vermelho subindo do chão).
 */
import { paintKit } from './botecoScene.js';
import { landKit } from './landScenes.js';
import { glowLayer, halo, relight, shifted, vignetteBox } from './lightPass.js';

const { hex, mixRgb, rngOf, buffer, plank, shelf } = paintKit;
const { plaster, floorBoards } = landKit;

export const COUNTER_W = 500;
export const COUNTER_H = 225;
export const COUNTER_PAD = Object.freeze({ x: 24, y: 44 });
const PX = COUNTER_PAD.x;
const PY = COUNTER_PAD.y;
const X0 = -PX;
const X1 = COUNTER_W + PX;
const Y1 = COUNTER_H + PY;

/** Onde o HTML encosta (px da pintura): o meio do carrossel, o tampo do balcão e o quadro. */
export const COUNTER_GEO = Object.freeze({ cx: 160, top: 158, board: { x0: 314, y0: 6, x1: 492, y1: 154 } });

const INK = hex('#0b0705');
const BLACK = [0, 0, 0];
const BAR_WOOD = { hi: hex('#9a6436'), mid: hex('#6a3e1e'), lo: hex('#40240f'), deep: hex('#1e1007') };
const FRAME_WOOD = { hi: hex('#a8743e'), mid: hex('#764822'), lo: hex('#4a2a12'), deep: hex('#221207') };

const WARM = [1, 0.84, 0.6];
const MODES = {
  normal: { ambient: [0.15, 0.16, 0.23], tint: WARM, board: [1, 0.92, 0.76], neon: [1, 0.36, 0.58], k: 1, floor: null },
  hard: { ambient: [0.08, 0.1, 0.19], tint: [0.6, 0.76, 1], board: [0.7, 0.82, 1], neon: [0.4, 0.8, 1], k: 0.88, floor: null },
  inferno: { ambient: [0.17, 0.06, 0.04], tint: [1, 0.46, 0.24], board: [1, 0.62, 0.42], neon: [1, 0.3, 0.18], k: 0.95, floor: [1, 0.24, 0.08] },
};

function lightsOf(mode) {
  const m = MODES[mode] ?? MODES.normal;
  const lights = [
    // o canhão do teto sobre a maleta do meio, e a mancha dele no balcão
    { x: COUNTER_GEO.cx, y: 9, r: 235, c: m.tint, k: 1.35 * m.k, cone: 0.42, out: 0.24 },
    { x: COUNTER_GEO.cx, y: 162, r: 125, c: m.tint, k: 0.75 * m.k, sy: 2.4 },
    // a luminária do quadro
    { x: 403, y: 4, r: 190, c: m.board, k: 0.78 * m.k, cone: 0.95, out: 0.2 },
    // a luz que bate nas prateleiras e o neon do letreiro
    { x: 60, y: 60, r: 115, c: m.tint, k: 0.5 * m.k },
    { x: 150, y: 20, r: 150, c: m.neon, k: 0.32 },
    // o resto do salão, fora da tela à direita
    { x: 540, y: 190, r: 200, c: m.tint, k: 0.25 * m.k },
  ];
  if (m.floor) lights.push({ x: 250, y: 270, r: 300, c: m.floor, k: 0.85 });
  return { lights, ambient: m.ambient };
}

/** Azulejo de metrô (retângulos creme desencontrados, rejunte escuro), encardindo para baixo. */
function subwayTiles(b, r, x0, y0, x1, y1) {
  const grout = hex('#4a463a');
  b.rect(x0, y0, x1 - x0, y1 - y0, grout);
  const tw = 14;
  const th = 7;
  for (let row = 0, y = y0; y < y1; row += 1, y += th) {
    for (let x = x0 - (row % 2 ? tw / 2 : 0); x < x1; x += tw) {
      const dirt = (y - y0) / (y1 - y0);
      const base = mixRgb(hex('#d9d2b8'), hex('#a39a7c'), dirt * 0.7 + (r() - 0.5) * 0.12);
      b.rect(x, y, tw - 1, th - 1, base);
      b.rect(x, y, tw - 1, 1, mixRgb(base, [255, 255, 255], 0.35));
      b.rect(x, y + th - 2, tw - 1, 1, mixRgb(base, BLACK, 0.12));
      if (r() < 0.35) b.rect(x + 2, y + 1, 3, 1, [255, 255, 255], 0.5); // o brilho do esmalte
    }
  }
  // a faixa de cima (friso) e o escorrido de gordura
  b.rect(x0, y0 - 3, x1 - x0, 3, hex('#2f5560'));
  b.rect(x0, y0 - 3, x1 - x0, 1, hex('#5a8a96'));
  for (let i = 0; i < (x1 - x0) / 9; i += 1) {
    const x = x0 + Math.floor(r() * (x1 - x0));
    const len = 4 + Math.floor(r() * (y1 - y0) * 0.35);
    const y = y0 + Math.floor(r() * (y1 - y0 - len));
    for (let k = 0; k < len; k += 1) b.put(x, y + k, hex('#3a2a14'), 0.25 * (1 - k / len));
  }
}

/** O canhão de luz preso na viga: a lata preta virada para baixo, com a boca acesa. */
function canLight(b, G, x) {
  b.rect(x - 2, 5, 4, 3, hex('#2a2a2a'));
  for (let k = 0; k < 7; k += 1) {
    const half = 4 + Math.floor(k / 2);
    b.rect(x - half, 8 + k, half * 2, 1, k === 0 ? hex('#4a4a48') : hex('#222222'));
    b.put(x - half, 8 + k, hex('#6a6a66'));
  }
  G.rect(x - 6, 15, 12, 1, hex('#fff4d0'));
  G.rect(x - 4, 16, 8, 1, hex('#ffd98a'));
}

/** O quadro-negro grande, com a moldura e a luminária de latão em cima. */
function chalkBoard(b, r, G, { x0, y0, x1, y1 }) {
  b.rect(x0 + 2, y0 + 3, x1 - x0, y1 - y0, BLACK, 0.5);
  plank(b, r, x0, y0, x1 - x0, 4, { tone: FRAME_WOOD });
  plank(b, r, x0, y1 - 4, x1 - x0, 4, { tone: FRAME_WOOD });
  plank(b, r, x0, y0, 4, y1 - y0, { tone: FRAME_WOOD, vertical: true });
  plank(b, r, x1 - 4, y0, 4, y1 - y0, { tone: FRAME_WOOD, vertical: true });
  b.rect(x0, y0, x1 - x0, 1, FRAME_WOOD.hi);
  // a ardósia, com o pó de giz e as marcas do apagador
  const slate = hex('#26302b');
  b.rect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8, slate);
  for (let i = 0; i < 9; i += 1) b.ellipse(x0 + 14 + r() * (x1 - x0 - 28), y0 + 12 + r() * (y1 - y0 - 24), 10 + r() * 16, 3 + r() * 4, hex('#3a4640'), 0.35);
  for (let i = 0; i < 700; i += 1) b.put(x0 + 4 + r() * (x1 - x0 - 8), y0 + 4 + r() * (y1 - y0 - 8), hex('#4a5650'), 0.5);
  // o canto de baixo com a calha e o toco de giz
  b.rect(x0 + 4, y1 - 7, x1 - x0 - 8, 3, FRAME_WOOD.lo);
  b.rect(x0 + 4, y1 - 7, x1 - x0 - 8, 1, FRAME_WOOD.hi);
  b.rect(x1 - 30, y1 - 9, 7, 2, hex('#efe9da'));
  b.rect(x1 - 42, y1 - 9, 5, 2, hex('#e8a0a0'));
  // a luminária de quadro (braço e cúpula de latão)
  const lx = Math.round((x0 + x1) / 2);
  b.rect(lx - 1, y0 - 2, 2, 5, hex('#5a4214'));
  b.rect(lx - 18, y0 + 3, 36, 3, hex('#b08a2e'));
  b.rect(lx - 18, y0 + 3, 36, 1, hex('#ffe08a'));
  b.rect(lx - 18, y0 + 5, 36, 1, hex('#5a4214'));
  G.rect(lx - 16, y0 + 6, 32, 1, hex('#fff2cc'));
}

/** Balcão comprido: o tampo envernizado com a quina de latão, a frente de almofadas e o varão. */
function longCounter(b, r, top) {
  // o tampo, visto um pouco de cima
  plank(b, r, X0, top, X1 - X0, 8, { tone: BAR_WOOD });
  b.rect(X0, top, X1 - X0, 1, hex('#c88a4e'));
  for (let i = 0; i < 30; i += 1) b.rect(X0 + r() * (X1 - X0), top + 2 + Math.floor(r() * 4), 6 + r() * 14, 1, hex('#b07a46'), 0.5);
  b.rect(X0, top + 8, X1 - X0, 2, hex('#d9a83a'));
  b.rect(X0, top + 8, X1 - X0, 1, hex('#ffe08a'));
  // a frente
  b.rect(X0, top + 10, X1 - X0, Y1 - top - 10, BAR_WOOD.lo);
  for (let x = X0 + 6; x < X1 - 6; x += 34) {
    const py = top + 16;
    const ph = 38;
    b.rect(x, py, 28, ph, BAR_WOOD.mid);
    b.rect(x, py, 28, 1, BAR_WOOD.deep);
    b.rect(x, py, 1, ph, BAR_WOOD.deep);
    b.rect(x, py + ph - 1, 28, 1, BAR_WOOD.hi);
    b.rect(x + 27, py, 1, ph, BAR_WOOD.hi);
    for (let k = 0; k < ph - 4; k += 3) if (r() < 0.4) b.rect(x + 2 + Math.floor(r() * 24), py + 2 + k, 2, 1, BAR_WOOD.lo, 0.6);
  }
  // o varão de latão do pé e a sombra no chão
  const ry = top + 60;
  b.rect(X0, ry, X1 - X0, 2, hex('#c9962e'));
  b.rect(X0, ry, X1 - X0, 1, hex('#ffe08a'));
  for (let x = X0 + 20; x < X1; x += 64) b.rect(x, ry - 1, 2, 6, hex('#7a5a14'));
  b.rect(X0, ry + 6, X1 - X0, Y1 - ry - 6, BAR_WOOD.deep);
  b.light(X0, ry + 6, X1 - X0, Y1 - ry - 6, BLACK, (x, y) => Math.min(0.8, (y - ry - 6) * 0.05));
}

export function paintCounterBack(seed = 23, mode = 'normal') {
  const raw = buffer(COUNTER_W + PX * 2, COUNTER_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  // o teto, a parede de reboco e o azulejo atrás do balcão
  for (let y = -PY; y < 0; y += 6) plank(b, r, X0, y, X1 - X0, 6, { tone: { hi: hex('#4a2e18'), mid: hex('#36210f'), lo: hex('#24150a'), deep: hex('#140b05') } });
  plaster(b, r, X0, 0, X1, 66, { base: '#5f7866', dark: '#3e5044' });
  subwayTiles(b, r, X0, 69, X1, COUNTER_GEO.top);
  plank(b, r, X0, 0, X1 - X0, 5, { tone: BAR_WOOD });
  b.rect(X0, 5, X1 - X0, 1, INK);
  floorBoards(b, r, Y1 - 4, Y1, { x0: X0, x1: X1 });
  // as prateleiras da esquerda, com a arandela
  shelf(b, r, 8, 74, 104, [3, 0, 'mug', 5, 1, 4, 2]);
  shelf(b, r, 8, 106, 104, [2, 'mug', 4, 0, 3, 5, 1]);
  // o canhão sobre o carrossel e o quadro da ficha
  canLight(b, G, COUNTER_GEO.cx);
  chalkBoard(b, r, G, COUNTER_GEO.board);
  // o balcão
  longCounter(b, r, COUNTER_GEO.top);
  // a luz da dificuldade
  const { lights, ambient } = lightsOf(mode);
  relight(raw, lights, { ambient, mask: G.mask, ox: PX, oy: PY });
  const m = MODES[mode] ?? MODES.normal;
  const glow = m.tint.map((v) => Math.round(v * 255));
  halo(raw, COUNTER_GEO.cx + PX, 15 + PY, 34, glow, 0.6, 1.5);
  halo(raw, 403 + PX, 10 + PY, 40, glow, 0.35, 2);
  if (m.floor) halo(raw, 250 + PX, 240 + PY, 260, [255, 70, 20], 0.35, 2.5);
  vignetteBox(raw, PX, PY, COUNTER_W, COUNTER_H, 0.6, 0.45);
  return { w: raw.w, h: raw.h, data: raw.data };
}

/** As peças desta cena que as outras telas deitadas também usam (a loja, o beco). */
export const counterKit = Object.freeze({ subwayTiles, longCounter, canLight });
