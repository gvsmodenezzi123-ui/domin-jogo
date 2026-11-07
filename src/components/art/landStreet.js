/**
 * Versão 2.11: a mesa online deitada, pintada do zero (500 × 225 px e a sobra). A calçada em
 * frente ao boteco, de noite e com chuva: o muro ocre à esquerda, o poste,
 * o orelhão (é por ele que se chama quem está longe), a fachada do bar com a porta de enrolar
 * meio aberta e a luz de dentro vazando, a calçada de pedra portuguesa em ondas, o meio-fio e o
 * asfalto molhado. O cavalete de giz na frente da porta é onde ficam o criar, o código e o
 * entrar (em HTML, na ardósia).
 */
import { paintKit } from './botecoScene.js';
import { glowLayer, halo, relight, shifted, vignetteBox } from './lightPass.js';
import { pixelText, textWidth } from './pixelFont.js';

const { hex, mixRgb, shift, rngOf, bayer, buffer, plank } = paintKit;

export const STREET_PAD = Object.freeze({ x: 24, y: 44 });
const W = 500;
const H = 225;
const PX = STREET_PAD.x;
const PY = STREET_PAD.y;
const X0 = -PX;
const X1 = W + PX;
const Y1 = H + PY;
const BLACK = [0, 0, 0];

/** A ardósia do cavalete (px da pintura): o HTML escreve aqui dentro. */
export const STREET_GEO = Object.freeze({ board: { x0: 304, y0: 30, x1: 490, y1: 184 }, walk: 156, curb: 200 });

const FRAME = { hi: hex('#a8743e'), mid: hex('#764822'), lo: hex('#4a2a12'), deep: hex('#221207') };

/** O muro de reboco ocre, manchado de chuva, com o rodapé encardido. */
function ochreWall(b, r, x0, y0, x1, y1) {
  const A = hex('#b08a4a');
  const B = hex('#7a5a2a');
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const n = Math.sin(x * 0.05 + Math.sin(y * 0.07) * 2) + Math.sin(y * 0.11 + x * 0.03);
      b.put(x, y, mixRgb(A, B, Math.max(0, Math.min(1, 0.45 + n * 0.2 + (r() - 0.5) * 0.12 + ((y - y0) / (y1 - y0)) * 0.25))));
    }
  }
  for (let i = 0; i < (x1 - x0) / 4; i += 1) {
    const x = x0 + Math.floor(r() * (x1 - x0));
    const len = 10 + Math.floor(r() * 50);
    for (let k = 0; k < len; k += 1) b.put(x, y0 + k, [40, 30, 20], 0.25 * (1 - k / len));
  }
  b.rect(x0, y1 - 8, x1 - x0, 8, hex('#4a3a2a'));
  b.rect(x0, y1 - 8, x1 - x0, 1, hex('#8a7050'));
}

/** O orelhão: o poste, a concha laranja de fibra e o telefone cinza com o fone no gancho. */
function orelhao(b, G, cx, walk) {
  const top = 66;
  b.rect(cx - 2, top + 30, 4, walk - top - 30, hex('#5a5e62'));
  b.rect(cx - 2, top + 30, 1, walk - top - 30, hex('#9aa0a4'));
  b.rect(cx - 6, walk - 3, 12, 3, hex('#3a3e40'));
  // a concha (meia casca de ovo, vista de frente e um pouco de lado)
  for (let y = 0; y < 40; y += 1) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 22) / 24) ** 2)) * 22);
    for (let x = -half; x <= half; x += 1) {
      const t = (x + half) / (2 * half + 1);
      let c = mixRgb(hex('#ffa040'), hex('#c85a14'), t * 0.9 + (y / 40) * 0.2);
      if (x === -half || x === half || y === 0) c = hex('#6a2a08');
      b.put(cx + x, top + y, c);
    }
  }
  // o oco da concha, escuro, e a luzinha lá dentro
  b.ellipse(cx, top + 26, 15, 13, hex('#2a1408'));
  G.rect(cx - 6, top + 14, 12, 1, hex('#fff4dc'));
  // o telefone
  b.rect(cx - 6, top + 18, 12, 18, hex('#8a9094'));
  b.rect(cx - 6, top + 18, 12, 1, hex('#c8d0d4'));
  b.rect(cx - 4, top + 22, 8, 6, hex('#3a3e40'));
  for (let k = 0; k < 3; k += 1) for (let j = 0; j < 3; j += 1) b.put(cx - 3 + j * 3, top + 23 + k * 2, hex('#c8d0d4'));
  b.rect(cx - 8, top + 19, 3, 13, hex('#2a2c2e'));
  b.rect(cx - 8, top + 19, 1, 13, hex('#5a5e62'));
  b.line(cx - 7, top + 32, cx - 3, top + 40, hex('#1a1a1a'));
  b.line(cx - 3, top + 40, cx + 1, top + 36, hex('#1a1a1a'));
  // o brilho de fibra molhada
  b.line(cx - 14, top + 10, cx - 6, top + 4, hex('#ffd8a0'), 0.8);
}

/** A fachada do bar: azulejo azul embaixo, a placa em cima e a porta de enrolar meio aberta. */
function barFront(b, r, G, x0, x1, walk) {
  // a parede de cima (reboco azul) e o azulejo de baixo
  for (let y = 0; y < walk; y += 1) for (let x = x0; x < x1; x += 1) b.put(x, y, mixRgb(hex('#3a5a7a'), hex('#2a4058'), (r() - 0.5) * 0.2 + 0.5));
  for (let y = 100; y < walk; y += 6) {
    for (let x = x0; x < x1; x += 6) {
      const c = shift(hex(r() < 0.5 ? '#d8dce4' : '#5a86b8'), Math.round((r() - 0.5) * 12));
      b.rect(x, y, 5, 5, c);
      b.rect(x, y, 5, 1, shift(c, 20), 0.7);
    }
  }
  // a placa pintada em cima da porta, com os dois foquinhos
  const sx0 = x0 + 28;
  const sx1 = x1 - 8;
  b.rect(sx0, 5, sx1 - sx0, 18, hex('#1e2a1e'));
  b.rect(sx0, 5, sx1 - sx0, 1, hex('#5a7a5a'));
  const label = 'BAR DO TIO ZÉ';
  pixelText(b, label, Math.round((sx0 + sx1) / 2 - textWidth(label, 2) / 2), 9, hex('#f4e2a8'), { s: 2 });
  for (const lx of [sx0 + 12, sx1 - 12]) {
    b.rect(lx - 1, 0, 2, 4, hex('#2a2a2a'));
    G.rect(lx - 3, 4, 6, 1, hex('#fff2cc'));
  }
  // a porta de enrolar: as lâminas de aço em cima, a fresta aberta embaixo com a luz de dentro
  const dx0 = x0 + 40;
  const dx1 = x1 - 20;
  const open = 108;
  b.rect(dx0 - 4, 32, dx1 - dx0 + 8, walk - 32, hex('#2a2c2e'));
  for (let y = 34; y < open; y += 1) {
    const c = (y - 34) % 4 === 0 ? hex('#4a4e52') : (y - 34) % 4 === 1 ? hex('#8a9094') : hex('#6a7074');
    b.rect(dx0, y, dx1 - dx0, 1, c);
  }
  b.rect(dx0, open - 2, dx1 - dx0, 2, hex('#2a2c2e'));
  for (let y = open; y < walk; y += 1) {
    for (let x = dx0; x < dx1; x += 1) {
      const t = (y - open) / (walk - open);
      G.put(x, y, mixRgb(hex('#ffd58a'), hex('#c87a2a'), t * 0.8 + (bayer(x, y) - 0.5) * 0.15));
    }
  }
  // gente lá dentro, contra a luz: duas silhuetas na mesa e as pernas das banquetas
  for (const [px, pw] of [
    [dx0 + 22, 12],
    [dx0 + 70, 14],
  ]) {
    b.rect(px, open + 6, pw, walk - open - 6, hex('#3a2010'));
    b.ellipse(px + pw / 2, open + 4, 4, 5, hex('#3a2010'));
  }
  b.rect(dx0 + 40, open + 26, 24, 3, hex('#3a2010'));
  b.rect(dx0 + 44, open + 29, 2, walk - open - 29, hex('#3a2010'));
  b.rect(dx0 + 58, open + 29, 2, walk - open - 29, hex('#3a2010'));
}

/** A calçada de pedra portuguesa em ondas pretas e brancas, o meio-fio e o asfalto molhado. */
function sidewalk(b, r, G, walk, curb) {
  const white = hex('#d8d2c2');
  const black = hex('#2a2a2c');
  const grout = hex('#5a5650');
  for (let y = walk; y < curb; y += 1) {
    for (let x = X0; x < X1; x += 1) {
      const cx = Math.floor(x / 3);
      const cy = Math.floor((y - walk) / 3);
      const edge = x % 3 === 0 || (y - walk) % 3 === 0;
      // as ondas de Copacabana: a faixa branca sobe e desce ao longo da calçada
      const band = (((cy + 2.6 * Math.sin(cx * 0.21)) % 10) + 10) % 10;
      const base = band < 5 ? white : black;
      b.put(x, y, edge ? grout : shift(base, ((cx * 7 + cy * 13) % 5) * 3 - 6));
    }
  }
  b.light(X0, walk, X1 - X0, 4, BLACK, (x, y) => 0.5 - (y - walk) * 0.12);
  b.rect(X0, curb, X1 - X0, 5, hex('#8a8680'));
  b.rect(X0, curb, X1 - X0, 1, hex('#c8c4bc'));
  b.rect(X0, curb + 5, X1 - X0, 1, hex('#2a2828'));
  for (let y = curb + 6; y < Y1; y += 1) for (let x = X0; x < X1; x += 1) b.put(x, y, mixRgb(hex('#2e2c32'), hex('#3e3c44'), r() * 0.6));
  // as poças refletindo o poste e a porta
  for (const [cx, cy, rx, color] of [
    [176, curb + 22, 40, '#ffc870'],
    [396, curb + 30, 60, '#ffb850'],
  ]) {
    for (let y = cy - 5; y <= cy + 5; y += 1) {
      for (let x = cx - rx; x <= cx + rx; x += 1) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / 5);
        if (d > 1) continue;
        G.put(x, y, mixRgb(hex('#16161a'), hex(color), Math.max(0, 0.7 - d) * (bayer(x, y) < 0.6 ? 1 : 0.5)));
      }
    }
  }
}

/** O cavalete de giz em pé na calçada (a ardósia fica para o HTML). */
function chalkStand(b, r, { x0, y0, x1, y1 }, walk) {
  // as pernas de trás e a corrente
  b.line(x0 + 10, y1, x0 + 2, walk + 30, FRAME.lo);
  b.line(x1 - 10, y1, x1 - 2, walk + 30, FRAME.lo);
  b.rect(x0 + 1, y0 + 2, x1 - x0, y1 - y0, BLACK, 0.5);
  plank(b, r, x0 - 4, y0 - 4, x1 - x0 + 8, 6, { tone: FRAME });
  plank(b, r, x0 - 4, y1 - 2, x1 - x0 + 8, 6, { tone: FRAME });
  plank(b, r, x0 - 4, y0 - 4, 6, y1 - y0 + 8, { tone: FRAME, vertical: true });
  plank(b, r, x1 - 2, y0 - 4, 6, y1 - y0 + 8, { tone: FRAME, vertical: true });
  b.rect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, hex('#232c27'));
  for (let i = 0; i < 9; i += 1) b.ellipse(x0 + 14 + r() * (x1 - x0 - 28), y0 + 12 + r() * (y1 - y0 - 24), 10 + r() * 16, 3 + r() * 4, hex('#36423c'), 0.35);
  for (let i = 0; i < 500; i += 1) b.put(x0 + 2 + r() * (x1 - x0 - 4), y0 + 2 + r() * (y1 - y0 - 4), hex('#46524c'), 0.5);
  // as pernas da frente, apoiadas na calçada
  for (const lx of [x0 + 4, x1 - 8]) {
    b.rect(lx, y1 + 4, 4, walk + 24 - y1 - 4, FRAME.mid);
    b.rect(lx, y1 + 4, 1, walk + 24 - y1 - 4, FRAME.hi);
  }
}

export function paintStreetBack(seed = 17) {
  const raw = buffer(W + PX * 2, H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  const { board, walk, curb } = STREET_GEO;
  // o céu de chuva e o alto dos prédios
  for (let y = -PY; y < 0; y += 1) for (let x = X0; x < X1; x += 1) G.put(x, y, mixRgb(hex('#141c2c'), hex('#0a0e18'), (y + PY) / PY + (bayer(x, y) - 0.5) * 0.2));
  // o muro ocre com a janela gradeada e os lambe-lambes
  ochreWall(b, r, X0, 0, 300, walk);
  // um lambe-lambe velho perto do poste
  b.rect(205, 100, 25, 22, hex('#d8c8a0'));
  pixelText(b, 'SAMBA', 207, 104, hex('#9a1a10'));
  pixelText(b, 'SEXTA', 207, 112, hex('#2a1a08'));
  b.rect(224, 116, 6, 6, hex('#7a5a2a'));
  // o poste e o orelhão
  b.rect(196, 18, 4, walk - 18, hex('#2a2c2e'));
  b.rect(196, 18, 1, walk - 18, hex('#5a5e62'));
  b.line(198, 18, 216, 10, hex('#2a2c2e'));
  b.line(198, 19, 216, 11, hex('#2a2c2e'));
  b.rect(212, 8, 18, 4, hex('#3a3c3e'));
  G.rect(214, 12, 14, 2, hex('#ffd27a'));
  orelhao(b, G, 254, walk);
  // a fachada do bar à direita
  barFront(b, r, G, 300, X1, walk);
  sidewalk(b, r, G, walk, curb);
  chalkStand(G.solid(), r, board, walk);
  const lights = [
    { x: 221, y: 14, r: 230, c: [1, 0.74, 0.42], k: 1.25, cone: 0.8, out: 0.25 },
    { x: 410, y: 140, r: 200, c: [1, 0.72, 0.4], k: 0.9 },
    { x: 254, y: 82, r: 70, c: [1, 0.95, 0.85], k: 0.5 },
    { x: 397, y: 2, r: 110, c: [1, 0.9, 0.7], k: 0.7, cone: 1.1, out: 0.2 },
  ];
  relight(raw, lights, { ambient: [0.13, 0.15, 0.24], mask: G.mask, ox: PX, oy: PY });
  halo(raw, 221 + PX, 13 + PY, 40, [255, 210, 130], 0.55, 1.5);
  vignetteBox(raw, PX, PY, W, H, 0.55, 0.45);
  return { w: raw.w, h: raw.h, data: raw.data };
}
