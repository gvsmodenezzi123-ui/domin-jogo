/**
 * Versão 2.13: as velas do Dono da Noite, em pixel art. Cada uma senta num castiçal de latão
 * cravado no canto do aro da mesa: o prato largo (com a poça de cera), o pé torneado com o nó,
 * o copinho e a vela de cera velha, com a boca derretida, o pavio e os escorridos (um desce até
 * o prato). A chama é uma tira de quadros que o CSS passa em degraus (tremendo sem custo), e a
 * mesa (tablePixels.js) pinta a cera derramada no aro e a luz quente em volta de cada canto.
 *
 * Medidas em px da pintura (1 px = 2 px de CSS na escala 1): o meio do prato fica em
 * CANDLE_FOOT acima da beirada de baixo do desenho.
 */
import { paintKit } from './botecoScene.js';

const { hex, buffer } = paintKit;

export const CANDLE_SIZE = Object.freeze({ w: 18, h: 44 });
/** O meio do prato do castiçal, em px da pintura a partir de baixo. */
export const CANDLE_FOOT = 3.5;
/** A chama: cada quadro e quantos quadros tem a tira. */
export const FLAME_SIZE = Object.freeze({ w: 7, h: 14 });
export const FLAME_FRAMES = 6;
/** Do pé do castiçal ao meio da chama, em px de CSS (escala 1), para a luz da sala. */
export const CANDLE_FLAME = 76;

/** A altura do toco de cada vela (cada uma queimou de um jeito) e a ponta do pavio. */
export const candleTop = (seed) => 10 + (seed % 3) * 2;
export const candleWick = (seed) => candleTop(seed) - 3;

const BRASS = ['#3a2408', '#6a4612', '#a87424', '#d8a440', '#f8d878', '#fff4c0'].map(hex);
const WAX = ['#8a7450', '#b8a47a', '#dccaa0', '#f2e4c0', '#fff6e0', '#fffcf2'].map(hex);

export function paintCandle(seed = 0) {
  const { w, h } = CANDLE_SIZE;
  const b = buffer(w, h);
  const cx = 9;
  const fy = h - CANDLE_FOOT;
  const ell = (ex, ey, rx, ry, pick) => {
    for (let y = Math.floor(ey - ry); y <= Math.ceil(ey + ry); y += 1) {
      for (let x = Math.floor(ex - rx); x <= Math.ceil(ex + rx); x += 1) {
        const dx = (x + 0.5 - ex) / rx;
        const dy = (y + 0.5 - ey) / ry;
        const d = dx * dx + dy * dy;
        if (d <= 1) b.put(x, y, pick(dx, dy, d, x, y));
      }
    }
  };
  // o prato: a borda de baixo escura, o tampo de latão com o fundo cavado e a poça de cera
  ell(cx, fy + 1, 6.8, 2.2, (dx) => (dx < -0.6 ? BRASS[2] : dx > 0.5 ? BRASS[0] : BRASS[1]));
  ell(cx, fy, 6.8, 2.2, (dx, dy) => (dy < -0.55 ? BRASS[dx < 0 ? 5 : 4] : dx < -0.7 ? BRASS[4] : dx > 0.7 ? BRASS[2] : BRASS[3]));
  ell(cx, fy + 0.2, 5.1, 1.4, (dx) => (dx < -0.3 ? BRASS[2] : BRASS[1]));
  ell(cx + 1.5, fy + 0.3, 2.6, 0.9, (dx, dy) => (dy < -0.3 ? WAX[4] : WAX[3]));
  b.put(cx - 4, fy + 1, WAX[3]);
  b.put(cx - 4, fy + 2, WAX[2]);
  // o pé torneado: o colarinho, o pescoço, o nó e o copinho
  const stem = (y, half) => {
    for (let x = cx - half; x < cx + half; x += 1) {
      const t = (x - (cx - half)) / Math.max(1, half * 2 - 1);
      b.put(x, y, t < 0.25 ? BRASS[4] : t < 0.55 ? BRASS[3] : t < 0.8 ? BRASS[2] : BRASS[1]);
    }
  };
  stem(fy - 2, 3);
  stem(fy - 3, 2);
  for (let y = fy - 7; y < fy - 3; y += 1) stem(y, 1);
  stem(fy - 9, 2);
  stem(fy - 8, 3);
  b.put(cx - 3, fy - 8, BRASS[5]);
  stem(fy - 10, 1);
  stem(fy - 11, 1);
  // o copinho
  ell(cx, fy - 12.5, 4.6, 1.4, (dx, dy) => (dy < -0.4 ? BRASS[dx < 0 ? 5 : 4] : dx > 0.5 ? BRASS[1] : BRASS[2]));
  b.rect(cx - 4, fy - 12, 9, 1, BRASS[1]);
  // a vela: o cilindro de cera, a luz da chama clareando a boca
  const top = candleTop(seed);
  const base = Math.floor(fy - 13);
  const cols = [WAX[2], WAX[3], WAX[4], WAX[3], WAX[2], WAX[1]];
  for (let y = top; y <= base; y += 1) {
    const glow = y - top < 4 ? 1 : 0;
    for (let k = 0; k < 6; k += 1) {
      let c = cols[k];
      if (glow && k < 5) c = k === 4 ? WAX[3] : WAX[Math.min(5, 3 + (k < 3 ? 2 : 1))];
      if (y > base - 2 && k > 3) c = WAX[0];
      b.put(cx - 3 + k, y, c);
    }
  }
  // a boca derretida: a beirada mais alta à esquerda, a poça funda e o pavio com a brasa
  b.rect(cx - 2, top, 4, 1, hex('#c8a868'));
  b.put(cx - 1, top, hex('#e0c080'));
  b.put(cx - 3, top - 1, WAX[5]);
  b.put(cx - 3, top, WAX[5]);
  b.put(cx + 2, top, WAX[3]);
  b.rect(cx - 1, top - 3, 1, 3, hex('#1a1010'));
  b.put(cx - 1, top - 3, hex('#8a3a1a'));
  b.put(cx, top - 2, hex('#2a1a14'));
  // os escorridos: dois curtos na frente e um comprido que desce até o copinho e pinga no prato
  const drips = [
    [cx - 2, 3 + (seed % 3)],
    [cx + 1, 5 + ((seed * 3) % 4)],
  ];
  for (const [x, len] of drips) {
    b.rect(x, top + 1, 1, len, WAX[5]);
    b.put(x + 1, top + 1, WAX[4]);
    b.rect(x, top + 1 + len, 2, 1, WAX[4]);
    b.put(x + 1, top + 2 + len, WAX[2]);
  }
  const lx = cx + 2;
  b.rect(lx, top + 1, 1, base - top + 2, WAX[4]);
  b.rect(lx + 1, top + 2, 1, base - top, WAX[2]);
  b.rect(lx, base + 2, 2, 2, WAX[4]);
  b.put(lx + 1, base + 4, WAX[3]);
  b.put(lx + 1, base + 5, WAX[2]);
  // a cera que caiu no prato, embaixo do pingo
  b.rect(lx, fy - 1, 3, 1, WAX[4]);
  return { w, h, data: b.data };
}

/** Os quadros da chama, desenhados à mão (7 × 14): r ponta, o laranja, y amarelo, w miolo, b o azul do pé. */
const FLAMES = [
  ['.......', '.......', '...r...', '...o...', '..ooo..', '..oyo..', '.ooyoo.', '.oyyyo.', '.oywyo.', '.oywyo.', '.oywyo.', '..ywy..', '..bwb..', '...b...'],
  ['....r..', '....o..', '...oo..', '...oo..', '..ooy..', '..oyyo.', '.ooyyo.', '.oyyyo.', '.oywyo.', '.oywyo.', '.oywyo.', '..ywy..', '..bwb..', '...b...'],
  ['...r...', '...o...', '...o...', '..ooo..', '..oyo..', '..oyo..', '.ooyoo.', '.oyyyo.', '.oywyo.', '.oywyo.', '.oywwo.', '..yww..', '..bwb..', '...b...'],
  ['..r....', '..o....', '..oo...', '..ooo..', '..oyo..', '.ooyo..', '.oyyoo.', '.oyyyo.', '.oywyo.', '.oywyo.', '.oywyo.', '..ywy..', '..bwb..', '...b...'],
  ['.......', '.......', '.......', '...r...', '..oo...', '..ooo..', '..oyo..', '.oyyyo.', '.oywyo.', '.oywyo.', '.oywyo.', '..ywy..', '..bwb..', '...b...'],
  ['.......', '....r..', '...oo..', '...oo..', '..ooo..', '..oyoo.', '.ooyyo.', '.oyyyo.', '.oywyo.', '.oywyo.', '.oywyo.', '..ywy..', '..bwb..', '...b...'],
];
const FLAME_INK = { r: hex('#d8461a'), o: hex('#ff9426'), y: hex('#ffd65a'), w: hex('#fffbe8'), b: hex('#4a5ad8') };

/** A tira da chama: `FLAME_FRAMES` quadros lado a lado, cada um com a sua altura e o seu balanço. */
export function paintFlameStrip() {
  const { w, h } = FLAME_SIZE;
  const b = buffer(w * FLAME_FRAMES, h);
  FLAMES.forEach((rows, f) => {
    rows.forEach((line, y) => {
      for (let x = 0; x < w; x += 1) {
        const ink = FLAME_INK[line[x]];
        if (ink) b.put(f * w + x, y, ink, line[x] === 'b' ? 0.75 : 1);
      }
    });
  });
  return { w: w * FLAME_FRAMES, h, data: b.data };
}
