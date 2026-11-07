/**
 * Versão 2.11: o fim da run deitado (500 × 225 px e a sobra em volta). O boteco fechando: à
 * esquerda, quem acabou com a run (ou quem você nocauteou) atrás do balcãozinho, sob a luz;
 * no meio, a lousa grande com os números da tentativa; à direita, o quadro de letras da Conta
 * do Boteco, pendurado na corrente. Perdeu: a sala fria, com o vermelho do letreiro da rua
 * entrando pela esquerda. Ganhou: a sala quente, com o dia raiando pela direita.
 *   paintEndBack:  a parede, as duas lousas e o chão (o rival é HTML, por cima)
 *   paintEndFront: o balcãozinho da esquerda, por cima do busto
 */
import { paintKit } from './botecoScene.js';
import { counterKit } from './landCounter.js';
import { landKit } from './landScenes.js';
import { glowLayer, halo, relight, shifted, vignetteBox } from './lightPass.js';

const { hex, rngOf, buffer, plank, looseTile, beerGlass } = paintKit;
const { plaster, woodWall, floorBoards } = landKit;
const { chalkBoard } = counterKit;

export const END_W = 500;
export const END_H = 225;
export const END_PAD = Object.freeze({ x: 24, y: 44 });
const PX = END_PAD.x;
const PY = END_PAD.y;
const X0 = -PX;
const X1 = END_W + PX;
const Y1 = END_H + PY;
const BLACK = [0, 0, 0];
const INK = hex('#0b0705');

/** px da pintura: a beirada do balcão, a lousa e o quadro de letras. */
export const END_GEO = Object.freeze({ rail: 131, slate: { x0: 156, y0: 10, x1: 330, y1: 214 }, letters: { x0: 340, y0: 14, x1: 492, y1: 214 } });

const BAR_WOOD = { hi: hex('#9a6436'), mid: hex('#6a3e1e'), lo: hex('#40240f'), deep: hex('#1e1007') };
const FRAME_WOOD = { hi: hex('#a8743e'), mid: hex('#764822'), lo: hex('#4a2a12'), deep: hex('#221207') };
const WAINSCOT = { hi: hex('#86562f'), mid: hex('#603c20'), lo: hex('#3e2614'), deep: hex('#20130a') };

function lightsOf(won) {
  const warm = won ? [1, 0.86, 0.6] : [1, 0.8, 0.58];
  const lights = [
    // a luz em cima do rival e a mancha dela no balcão
    { x: 75, y: 6, r: 200, c: warm, k: won ? 1.2 : 1.05, cone: 0.62, out: 0.3 },
    { x: 75, y: 137, r: 110, c: warm, k: 0.7, sy: 2.2 },
    // a luminária da lousa e a do quadro de letras
    { x: 243, y: 6, r: 230, c: [1, 0.93, 0.78], k: 0.85, cone: 1, out: 0.22 },
    { x: 416, y: 2, r: 220, c: [1, 0.9, 0.72], k: 0.7, cone: 1, out: 0.25 },
  ];
  if (won) lights.push({ x: 560, y: 80, r: 330, c: [1, 0.7, 0.42], k: 0.55 });
  else lights.push({ x: -40, y: 40, r: 180, c: [1, 0.26, 0.26], k: 0.55 });
  return { lights, ambient: won ? [0.2, 0.17, 0.17] : [0.11, 0.12, 0.19] };
}

/** O quadro de letras de bar: moldura de madeira, o feltro preto com as canaletas, a corrente. */
function letterBoard(b, r, G, { x0, y0, x1, y1 }) {
  const cx = Math.round((x0 + x1) / 2);
  // a corrente até o prego
  for (let k = 0; k <= 16; k += 1) {
    const t = k / 16;
    const lx = Math.round(x0 + 18 + (cx - x0 - 18) * t);
    const rx = Math.round(x1 - 18 - (x1 - 18 - cx) * t);
    const y = Math.round(y0 - 12 * t);
    b.put(lx, y, k % 2 ? hex('#8a8a80') : hex('#c8c8bc'));
    b.put(rx, y, k % 2 ? hex('#8a8a80') : hex('#c8c8bc'));
  }
  b.rect(cx - 1, y0 - 14, 3, 3, hex('#5a5048'));
  b.put(cx, y0 - 14, hex('#c8c0b0'));
  b.rect(x0 + 3, y0 + 4, x1 - x0, y1 - y0, BLACK, 0.5);
  plank(b, r, x0, y0, x1 - x0, 5, { tone: FRAME_WOOD });
  plank(b, r, x0, y1 - 5, x1 - x0, 5, { tone: FRAME_WOOD });
  plank(b, r, x0, y0, 5, y1 - y0, { tone: FRAME_WOOD, vertical: true });
  plank(b, r, x1 - 5, y0, 5, y1 - y0, { tone: FRAME_WOOD, vertical: true });
  b.rect(x0, y0, x1 - x0, 1, FRAME_WOOD.hi);
  // o feltro: as canaletas onde as letras de plástico encaixam
  for (let y = y0 + 5; y < y1 - 5; y += 1) {
    const row = (y - y0 - 5) % 4;
    const c = row === 0 ? hex('#262426') : row === 3 ? hex('#0c0b0c') : hex('#171617');
    b.rect(x0 + 5, y, x1 - x0 - 10, 1, c);
  }
  for (let i = 0; i < 260; i += 1) b.put(x0 + 6 + r() * (x1 - x0 - 12), y0 + 6 + r() * (y1 - y0 - 12), hex('#2e2a2c'), 0.6);
  // as letras que sobraram, soltas no pé do quadro
  const spare = [hex('#e8e4da'), hex('#e8e4da'), hex('#d84a3a')];
  for (let i = 0; i < 3; i += 1) b.rect(x1 - 30 + i * 7, y1 - 12, 4, 5, spare[i]);
  // a lampadinha de quadro, de latão
  b.rect(cx - 1, y0 - 4, 2, 5, hex('#5a4214'));
  b.rect(cx - 14, y0 + 1, 28, 3, hex('#b08a2e'));
  b.rect(cx - 14, y0 + 1, 28, 1, hex('#ffe08a'));
  G.rect(cx - 12, y0 + 4, 24, 1, hex('#fff2cc'));
}

/** A sala atrás de tudo: a parede, o lambri, o chão, a lousa e o quadro de letras. */
export function paintEndBack(won = false, seed = 61) {
  const raw = buffer(END_W + PX * 2, END_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  for (let y = -PY; y < 0; y += 6) plank(b, r, X0, y, X1 - X0, 6, { tone: { hi: hex('#4a2e18'), mid: hex('#36210f'), lo: hex('#24150a'), deep: hex('#140b05') } });
  plaster(b, r, X0, 0, X1, 150, won ? { base: '#6a6a54', dark: '#46483a' } : { base: '#4e6458', dark: '#33433a' });
  plank(b, r, X0, 0, X1 - X0, 5, { tone: BAR_WOOD });
  b.rect(X0, 5, X1 - X0, 1, INK);
  woodWall(b, r, X0, 150, X1, 196, WAINSCOT);
  plank(b, r, X0, 146, X1 - X0, 4, { tone: WAINSCOT });
  b.rect(X0, 146, X1 - X0, 1, hex('#b07a46'));
  floorBoards(b, r, 196, Y1, { a: '#4a2e18', c: '#563620', seam: '#1e1008', x0: X0, x1: X1, cx: END_W / 2, half: END_W / 2 });
  b.rect(X0, 192, X1 - X0, 4, WAINSCOT.deep);
  chalkBoard(b, r, G, END_GEO.slate);
  letterBoard(b, r, G, END_GEO.letters);
  const { lights, ambient } = lightsOf(won);
  relight(raw, lights, { ambient, mask: G.mask, ox: PX, oy: PY });
  halo(raw, 243 + PX, 14 + PY, 40, hex('#ffe8b0'), 0.3, 2);
  halo(raw, 416 + PX, 18 + PY, 34, hex('#ffe8b0'), 0.3, 2);
  vignetteBox(raw, PX, PY, END_W, END_H, 0.5, 0.42);
  return { w: raw.w, h: raw.h, data: raw.data };
}

/** O balcãozinho da esquerda, por cima do busto: o tampo com a quina de latão e a frente. */
export function paintEndFront(won = false, seed = 67) {
  const raw = buffer(END_W + PX * 2, END_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const top = END_GEO.rail;
  const x0 = X0;
  const x1 = 150;
  // a sombra que o balcão faz na lousa
  b.light(x1, top + 6, 6, Y1 - top, BLACK, () => 0.45);
  // o tampo, visto um pouco de cima
  plank(b, r, x0, top, x1 - x0, 9, { tone: BAR_WOOD });
  b.rect(x0, top, x1 - x0, 1, hex('#c88a4e'));
  for (let i = 0; i < 10; i += 1) b.rect(x0 + r() * (x1 - x0 - 16), top + 2 + Math.floor(r() * 5), 6 + r() * 12, 1, hex('#b07a46'), 0.5);
  b.rect(x0, top + 9, x1 - x0, 2, hex('#d9a83a'));
  b.rect(x0, top + 9, x1 - x0, 1, hex('#ffe08a'));
  b.rect(x1 - 1, top, 1, 11, hex('#7a5a14'));
  // o que ficou em cima do balcão
  if (won) {
    for (let i = 0; i < 4; i += 1) {
      const cy = top + 4 - i * 2;
      b.ellipse(118, cy + 1, 5, 2, hex('#6a4a10'));
      b.ellipse(118, cy, 5, 2, hex('#d9a83a'));
      b.rect(115, cy - 1, 4, 1, hex('#ffe08a'));
    }
    b.ellipse(132, top + 3, 5, 2, hex('#d9a83a'));
  } else {
    beerGlass(b, r, 112, top - 12, 0.8);
  }
  looseTile(b, 14, top + 1, 6, 6);
  looseTile(b, 34, top + 2, 1, 4);
  // a frente de almofadas
  b.rect(x0, top + 11, x1 - x0, Y1 - top - 11, BAR_WOOD.lo);
  for (let x = x0 + 6; x < x1 - 8; x += 34) {
    const py = top + 16;
    const ph = 56;
    const pw = Math.min(28, x1 - 6 - x);
    b.rect(x, py, pw, ph, BAR_WOOD.mid);
    b.rect(x, py, pw, 1, BAR_WOOD.deep);
    b.rect(x, py, 1, ph, BAR_WOOD.deep);
    b.rect(x, py + ph - 1, pw, 1, BAR_WOOD.hi);
    b.rect(x + pw - 1, py, 1, ph, BAR_WOOD.hi);
    for (let k = 0; k < ph - 4; k += 3) if (r() < 0.4) b.rect(x + 2 + Math.floor(r() * (pw - 4)), py + 2 + k, 2, 1, BAR_WOOD.lo, 0.6);
  }
  b.rect(x1 - 4, top + 11, 4, Y1 - top - 11, BAR_WOOD.deep);
  const { lights, ambient } = lightsOf(won);
  relight(raw, lights, { ambient, ox: PX, oy: PY });
  return { w: raw.w, h: raw.h, data: raw.data };
}
