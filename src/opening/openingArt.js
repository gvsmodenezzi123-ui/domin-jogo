/**
 * Versão 2.12: a pintura da abertura "Efeito Dominó". O salão inteiro do boteco fechado, de
 * madrugada, numa tira larga (PANO_W × 225 e a sobra), pintado uma vez e iluminado pelas
 * lâmpadas que ficaram acesas: o pendente do balcão, o do meio do salão, a vela do santo, a
 * jukebox, a luminária da sinuca, a geladeira e a rua azul entrando por baixo da porta de aço.
 * O que se mexe (as pedras, a tampinha, o gato, as bandeirinhas, o neon) é desenhado por cima a
 * cada quadro em OpeningScene.jsx; aqui ficam também os desenhinhos prontos deles.
 */
import { paintKit } from '../components/art/botecoScene.js';
import { glowLayer, halo, lightAt, relight, shifted } from '../components/art/lightPass.js';
import { pixelText, textWidth } from '../components/art/pixelFont.js';
import { BOTTLE, CAT, FLOORS, GIANT, NEON, PAD, PANO_W, TILE_H, TILE_W, VIEW_H } from './openingPlan.js';

const { hex, mixRgb, shift, rngOf, buffer, plank, bottle, bayer } = paintKit;

const X0 = -PAD.x;
const X1 = PANO_W + PAD.x;
const Y0 = -PAD.y;
const BLACK = [0, 0, 0];
const WARM = [1, 0.8, 0.54];

/** As luzes que ficaram acesas no salão (a do neon entra só no fim, por cima). */
export const LIGHTS = Object.freeze([
  { x: 140, y: 30, r: 190, c: WARM, k: 1.45, cone: 0.85, out: 0.3 },
  { x: 239, y: 36, r: 46, c: [1, 0.36, 0.22], k: 0.7 },
  { x: 382, y: 36, r: 190, c: WARM, k: 1.4, cone: 0.85, out: 0.3 },
  { x: 600, y: 60, r: 120, c: [1, 0.86, 0.66], k: 0.35 },
  { x: 660, y: 150, r: 120, c: [1, 0.42, 0.72], k: 0.85 },
  { x: 772, y: 74, r: 140, c: [0.72, 1, 0.7], k: 0.95, cone: 1.05, out: 0.15 },
  { x: 928, y: 150, r: 130, c: [0.7, 0.86, 1], k: 0.95 },
  { x: 1110, y: 98, r: 80, c: [1, 0.86, 0.6], k: 0.4 },
  { x: 1336, y: 192, r: 200, c: [0.42, 0.58, 1], k: 1.05, sy: 1.6 },
]);
export const AMBIENT = Object.freeze([0.17, 0.18, 0.27]);

const WOOD = { hi: hex('#7a4a24'), mid: hex('#4e2d15'), lo: hex('#2b170b'), deep: hex('#160b05') };
const CEIL = { hi: hex('#3a2616'), mid: hex('#26180c'), lo: hex('#160d06'), deep: hex('#0a0603') };

/** A parede pintada de verde-água descascando, com o barrado vermelho. */
function wall(b, r) {
  const A = hex('#4a8474');
  const B = hex('#30584c');
  for (let y = 8; y < 150; y += 1) {
    for (let x = X0; x < X1; x += 1) {
      const n = Math.sin(x * 0.05 + Math.sin(y * 0.11) * 2) + Math.sin(y * 0.17 + x * 0.013);
      b.put(x, y, mixRgb(A, B, Math.max(0, Math.min(1, 0.5 + n * 0.2 + (r() - 0.5) * 0.14))));
    }
  }
  // a tinta descascando: manchas do reboco claro por baixo
  for (let i = 0; i < 70; i += 1) {
    const cx = X0 + r() * (X1 - X0);
    const cy = 14 + r() * 128;
    b.ellipse(cx, cy, 2 + r() * 6, 1 + r() * 3, hex('#8a8670'), 0.5);
    b.ellipse(cx + 1, cy + 1, 1 + r() * 3, 1 + r() * 2, hex('#5e5a48'), 0.5);
  }
  b.rect(X0, 144, X1 - X0, 5, hex('#7a2218'));
  b.rect(X0, 144, X1 - X0, 1, hex('#a83a28'));
  b.rect(X0, 149, X1 - X0, 1, hex('#3a0e08'));
}

/** O azulejo branco com a florzinha azul, da altura da cintura até o chão. */
function azulejo(b, r, x0, x1) {
  const grout = hex('#77735f');
  b.rect(x0, 150, x1 - x0, 56, grout);
  for (let y = 150; y < 204; y += 9) {
    for (let x = x0 - ((y / 9) % 2) * 4; x < x1; x += 9) {
      const c = r() < 0.08 ? hex('#bdb6a0') : hex('#d6d0ba');
      b.rect(x + 1, y + 1, 8, 8, c);
      b.rect(x + 1, y + 1, 8, 1, hex('#ece6d2'));
      if ((Math.round(x / 9) + Math.round(y / 9)) % 2 === 0) {
        b.rect(x + 4, y + 3, 2, 4, hex('#2e5a8a'));
        b.rect(x + 3, y + 4, 4, 2, hex('#2e5a8a'));
        b.put(x + 4, y + 4, hex('#d8b040'));
      }
      if (r() < 0.04) b.line(x + 2, y + 2, x + 7, y + 7, hex('#6a665a'));
    }
  }
  b.rect(x0, 202, x1 - x0, 4, hex('#3a2a20'));
  b.rect(x0, 202, x1 - x0, 1, hex('#5a4434'));
}

/** O ladrilho hidráulico do chão, em quadros que crescem para perto. */
function ladrilho(b) {
  const rows = [5, 7, 9, 11, 13, 15, 17];
  const red = hex('#8e2f22');
  const cream = hex('#d4c4a2');
  const ink = hex('#2a1610');
  let y = FLOORS.ground;
  rows.forEach((h, k) => {
    const w = h * 2;
    for (let x = X0 - ((k % 2) * w) / 2; x < X1; x += w) {
      const odd = Math.round((x - X0) / w) % 2 === 0;
      b.rect(x, y, w, h, odd ? red : cream);
      // a florzinha do meio, na cor do vizinho
      const cx = x + w / 2;
      const cy = y + h / 2;
      for (let d = 0; d <= h / 3; d += 1) b.rect(cx - (h / 3 - d) * 1.6, cy - d, (h / 3 - d) * 3.2, 1, odd ? cream : red);
      for (let d = 0; d <= h / 3; d += 1) b.rect(cx - (h / 3 - d) * 1.6, cy + d, (h / 3 - d) * 3.2, 1, odd ? cream : red);
      b.rect(x, y, 1, h, ink, 0.6);
    }
    b.rect(X0, y, X1 - X0, 1, ink, 0.6);
    y += h;
  });
}

function ceiling(b, r) {
  for (let y = Y0; y < 8; y += 6) plank(b, r, X0, y, X1 - X0, 6, { tone: CEIL });
  b.rect(X0, 6, X1 - X0, 3, hex('#1a0f07'));
  b.rect(X0, 9, X1 - X0, 1, BLACK, 0.5);
}

/** O pendente de bar: o fio do teto, a cúpula de esmalte e a lâmpada acesa. */
function pendant(b, G, x, y, tone = '#2f6a4a') {
  b.rect(x, 0, 1, y - 4, hex('#151515'));
  const c = hex(tone);
  for (let k = 0; k < 8; k += 1) {
    const half = 3 + k;
    b.rect(x - half, y - 4 + k, half * 2 + 1, 1, k === 0 ? shift(c, 40) : k > 5 ? shift(c, -30) : c);
  }
  b.rect(x - 11, y + 4, 23, 1, hex('#e8e0c8'));
  G.rect(x - 3, y + 4, 7, 2, hex('#fff6d0'));
}

/** Os engradados de cerveja empilhados (a escadinha): plástico vermelho e as tampinhas em cima. */
function crateStack(b, r, x, w, top) {
  const red = hex('#cc3424');
  for (let y = top; y < FLOORS.ground; y += 11) {
    const h = Math.min(11, FLOORS.ground - y);
    b.rect(x, y, w, h, red);
    b.rect(x, y, w, 1, hex('#d8463a'));
    b.rect(x + 2, y + 3, w - 4, 2, hex('#5a0c08'));
    b.rect(x + 2, y + 7, w - 4, 1, hex('#5a0c08'));
    b.rect(x, y + h - 1, w, 1, hex('#3a0604'));
    b.rect(x + w - 1, y, 1, h, hex('#6a120c'));
  }
  // as tampinhas das garrafas vazias no alto do engradado
  for (let k = 2; k < w - 2; k += 3) b.rect(x + k, top - 1, 2, 1, hex('#c9a24a'));
}

/** O balcão da esquerda: tampo de granito, frente de ripas, o caixa, o santo e a prateleira. */
function counter(b, r, G) {
  // a prateleira de garrafas na parede, atrás
  for (const sy of [56, 88]) {
    plank(b, r, X0, sy, 254 - X0, 3, { tone: WOOD });
    b.rect(X0, sy + 3, 254 - X0, 2, BLACK, 0.4);
    let x = X0 + 4;
    while (x < 246) {
      const bw = bottle(b, r, x, sy, Math.floor(r() * 6));
      x += bw + 2 + Math.floor(r() * 3);
    }
  }
  // o quadro do time de várzea
  b.rect(160, 16, 50, 30, hex('#3a2412'));
  b.rect(162, 18, 46, 26, hex('#c8b890'));
  b.rect(162, 32, 46, 12, hex('#3a6a2a'));
  for (let k = 0; k < 7; k += 1) {
    b.rect(165 + k * 6, 24, 3, 3, hex('#c88a5a'));
    b.rect(164 + k * 6, 27, 5, 6, k % 2 ? hex('#d8d8d8') : hex('#2a2a2a'));
  }
  // o santinho com a vela vermelha
  b.rect(230, 44, 20, 2, hex('#6a4220'));
  b.rect(236, 32, 7, 12, hex('#3a5a9a'));
  b.rect(237, 29, 5, 4, hex('#d8b088'));
  b.rect(236, 27, 7, 2, hex('#e8c860'));
  b.rect(245, 38, 3, 6, hex('#b8201a'));
  G.rect(246, 35, 1, 3, hex('#ffd060'));
  // o tampo de granito e a frente de ripas
  for (let x = X0; x < 262; x += 1) {
    for (let y = FLOORS.counter; y < FLOORS.counter + 6; y += 1) b.put(x, y, r() < 0.3 ? hex('#5a5652') : r() < 0.5 ? hex('#3a3634') : hex('#46423e'));
  }
  b.rect(X0, FLOORS.counter, 262 - X0, 1, hex('#8a8682'));
  b.rect(X0, FLOORS.counter + 6, 262 - X0, 2, hex('#1e1c1a'));
  for (let x = X0; x < 262; x += 8) plank(b, r, x, FLOORS.counter + 8, Math.min(8, 262 - x), FLOORS.ground - FLOORS.counter - 8, { tone: WOOD, vertical: true });
  b.rect(X0, 194, 262 - X0, 3, hex('#9aa0a2'));
  b.rect(X0, 194, 262 - X0, 1, hex('#e0e6e8'));
  b.rect(261, FLOORS.counter, 1, FLOORS.ground - FLOORS.counter, hex('#120a04'));
  // a caixa registradora e a gelada (a tampinha dela é desenhada por cima, até estourar)
  b.rect(4, 100, 26, 18, hex('#5a5a56'));
  b.rect(6, 96, 22, 6, hex('#7a7a74'));
  b.rect(8, 97, 18, 3, hex('#1a2a1a'));
  G.rect(9, 98, 8, 1, hex('#7aff8a'));
  for (let k = 0; k < 4; k += 1) b.rect(8 + k * 5, 106, 3, 2, hex('#d8d4c8'));
  const gx = BOTTLE.x;
  const gy = BOTTLE.y;
  b.rect(gx, gy - 14, 7, 14, hex('#5a2c0e'));
  b.rect(gx + 1, gy - 15, 5, 1, hex('#5a2c0e'));
  b.rect(gx + 2, gy - 21, 3, 6, hex('#5a2c0e'));
  b.rect(gx, gy - 10, 7, 5, hex('#e6c34a'));
  b.rect(gx + 1, gy - 9, 5, 1, hex('#b8322a'));
  b.rect(gx + 1, gy - 13, 1, 11, hex('#a5622a'));
  b.rect(gx + 2, gy - 20, 1, 4, hex('#a5622a'));
}

/** A mesa de lata amarela, as cadeiras de plástico empilhadas atrás. */
function tinTable(b) {
  const top = FLOORS.table;
  // as cadeiras vermelhas empilhadas, atrás da mesa
  for (let k = 0; k < 4; k += 1) {
    const x = 330 + k * 3;
    const y = 118 - k * 3;
    b.rect(x, y, 30, 4, hex('#b8281e'));
    b.rect(x, y, 30, 1, hex('#e04a3a'));
    b.rect(x + 2, y + 4, 3, top - y - 4, hex('#8a1a12'));
    b.rect(x + 25, y + 4, 3, top - y - 4, hex('#8a1a12'));
    for (let s = 0; s < 3; s += 1) b.rect(x + 7 + s * 7, y + 6, 3, 14, hex('#9a2016'));
  }
  // as pernas de trás e a sombra
  b.rect(306, top + 8, 2, FLOORS.ground - top - 8, hex('#6a5410'));
  b.rect(456, top + 8, 2, FLOORS.ground - top - 8, hex('#6a5410'));
  b.ellipse(382, FLOORS.ground + 2, 92, 3, BLACK, 0.5);
  b.rect(292, top, 180, 3, hex('#e8c030'));
  b.rect(292, top, 180, 1, hex('#fff0a0'));
  b.rect(292, top + 3, 180, 6, hex('#c89a18'));
  b.rect(292, top + 5, 180, 1, hex('#e8c030'));
  b.rect(292, top + 9, 180, 1, hex('#5a4408'));
  for (const lx of [296, 466]) {
    b.rect(lx, top + 9, 3, FLOORS.ground - top - 9, hex('#b08814'));
    b.rect(lx, top + 9, 1, FLOORS.ground - top - 9, hex('#f0d050'));
  }
}

/** A jukebox de arco, com os tubos acesos (as cores correm por cima, em OpeningScene). */
function jukebox(b, G) {
  const x0 = 636;
  const x1 = 684;
  const top = 124;
  b.rect(x0 + 3, top + 6, x1 - x0, FLOORS.ground - top - 6, BLACK, 0.5);
  b.rect(x0, top + 14, x1 - x0, FLOORS.ground - top - 14, hex('#5a2a14'));
  for (let k = 0; k < 16; k += 1) {
    const half = Math.round(Math.sqrt(Math.max(0, 256 - (16 - k) * (16 - k))) * 1.5);
    b.rect(660 - half, top + k, half * 2, 1, hex('#6a3418'));
  }
  // o arco de tubos e a vitrine dos discos
  for (let k = 0; k < 12; k += 1) {
    const half = Math.round(Math.sqrt(Math.max(0, 144 - (12 - k) * (12 - k))) * 1.7);
    G.rect(660 - half, top + 4 + k, 2, 1, hex('#ffd8a0'));
    G.rect(660 + half - 2, top + 4 + k, 2, 1, hex('#ffd8a0'));
  }
  G.rect(644, 146, 32, 14, hex('#ffe8b8'));
  for (let k = 0; k < 6; k += 1) G.solid().rect(646 + k * 5, 148, 3, 10, hex('#2a1a10'));
  b.rect(642, 166, 36, 22, hex('#2a1408'));
  for (let y = 168; y < 186; y += 2) b.rect(644, y, 32, 1, hex('#b8a888'));
  b.rect(x0, 190, x1 - x0, 3, hex('#c8ccd0'));
  b.rect(x0, top + 14, 2, FLOORS.ground - top - 14, hex('#c8ccd0'));
  b.rect(x1 - 2, top + 14, 2, FLOORS.ground - top - 14, hex('#8a8e92'));
}

/** A sinuca do fundo, com a luminária comprida em cima e as bolas paradas. */
function poolTable(b, r, G) {
  b.rect(771, 0, 1, 62, hex('#151515'));
  b.rect(740, 62, 64, 6, hex('#1e4a2a'));
  b.rect(740, 62, 64, 1, hex('#3a7a4a'));
  G.rect(744, 68, 56, 1, hex('#f0ffe0'));
  b.rect(712, 164, 120, 6, hex('#3a2010'));
  for (let y = 158; y < 164; y += 1) b.rect(712 + (164 - y), y, 120 - (164 - y) * 2, 1, hex('#1e6a34'));
  b.rect(712, 164, 120, 1, hex('#6a4220'));
  for (const lx of [718, 822]) b.rect(lx, 170, 5, FLOORS.ground - 170, hex('#2a160a'));
  b.rect(712, 170, 120, 5, hex('#4a2a14'));
  const balls = ['#e8e0c8', '#d82a1e', '#e8c030', '#2a4ab8', '#1a1a1a', '#e87a1e'];
  balls.forEach((c, k) => {
    b.rect(744 + k * 9 + (k % 2) * 3, 158 + (k % 3), 3, 2, hex(c));
  });
  b.line(760, 156, 812, 161, hex('#c8a060'));
}

/** O gato dorme num saco de juta; a geladeira de cerveja acesa do lado. */
function sackAndFridge(b, r, G) {
  for (let x = CAT.x - 14; x < CAT.x + 16; x += 1) {
    for (let y = FLOORS.ground - 6; y < FLOORS.ground; y += 1) b.put(x, y, (x + y) % 2 ? hex('#8a7044') : hex('#6a5432'));
  }
  b.rect(CAT.x - 14, FLOORS.ground - 6, 30, 1, hex('#a88a54'));
  const x0 = 900;
  const x1 = 956;
  const top = CAT.fridgeTop + 2;
  b.rect(x0 + 3, top + 4, x1 - x0, FLOORS.ground - top - 4, BLACK, 0.5);
  b.rect(x0, top, x1 - x0, FLOORS.ground - top, hex('#d8d4cc'));
  b.rect(x0, top, x1 - x0, 12, hex('#b8261c'));
  b.rect(x0 + 2, top + 3, x1 - x0 - 4, 6, hex('#8a140e'));
  G.rect(x0 + 6, top + 5, x1 - x0 - 12, 2, hex('#ffd8c8'));
  // a porta de vidro: as prateleiras de garrafas na luz fria
  G.rect(x0 + 4, top + 15, x1 - x0 - 8, FLOORS.ground - top - 24, hex('#d8ecff'));
  for (let s = 0; s < 5; s += 1) {
    const sy = top + 30 + s * 15;
    G.solid().rect(x0 + 4, sy, x1 - x0 - 8, 1, hex('#8aa0b0'));
    for (let k = 0; k < 8; k += 1) {
      const bx = x0 + 6 + k * 6;
      G.solid().rect(bx, sy - 11, 4, 11, k % 3 === 0 ? hex('#3d5a2a') : hex('#5a2c0e'));
      G.solid().rect(bx + 1, sy - 13, 2, 2, hex('#c9a24a'));
      G.solid().rect(bx, sy - 7, 4, 3, hex('#e6c34a'));
    }
  }
  b.rect(x1 - 7, top + 40, 2, 22, hex('#8a8a88'));
  b.rect(x0, FLOORS.ground - 8, x1 - x0, 8, hex('#3a3a38'));
}

/** As medalhas e troféus do campeonato de dominó, na prateleira debaixo do neon. */
function trophies(b, r) {
  plank(b, r, 1040, 108, 140, 3, { tone: WOOD });
  b.rect(1040, 111, 140, 2, BLACK, 0.4);
  const gold = hex('#d8a83a');
  [1050, 1074, 1100, 1128, 1156].forEach((x, k) => {
    const h = 10 + (k % 3) * 4;
    b.rect(x, 104, 10, 4, hex('#3a2a1a'));
    b.rect(x + 3, 104 - h + 6, 4, h - 6, gold);
    b.rect(x + 1, 104 - h, 8, 6, gold);
    b.rect(x + 1, 104 - h, 8, 1, hex('#ffe08a'));
    b.rect(x - 1, 104 - h + 1, 2, 3, gold);
    b.rect(x + 9, 104 - h + 1, 2, 3, gold);
  });
}

/* ---------- o neon do BUXARIA: tubos de 2 px seguindo o desenho das letras ---------- */

const NEON_CELL = 6;
const NEON_WORD = 'BUXARIA';
const NEON_SUB = 'DOMINÓ DE BOTECO';
const LETTER_GAP = 7;
const GLYPH = {
  B: ['110', '101', '110', '101', '110'],
  U: ['101', '101', '101', '101', '111'],
  X: ['101', '101', '010', '101', '101'],
  A: ['010', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
};

/** O desenho de uma letra em tubo: os centros das células acesas ligados aos vizinhos. */
function tubeSegments(ch) {
  const g = GLYPH[ch];
  const on = (cx, cy) => g[cy]?.[cx] === '1';
  const segs = [];
  for (let cy = 0; cy < 5; cy += 1) {
    for (let cx = 0; cx < 3; cx += 1) {
      if (!on(cx, cy)) continue;
      segs.push([cx, cy, cx, cy]);
      if (on(cx + 1, cy)) segs.push([cx, cy, cx + 1, cy]);
      if (on(cx, cy + 1)) segs.push([cx, cy, cx, cy + 1]);
      // as diagonais (o X e o A) quando não há ligação reta
      if (on(cx + 1, cy + 1) && !on(cx + 1, cy) && !on(cx, cy + 1)) segs.push([cx, cy, cx + 1, cy + 1]);
      if (on(cx - 1, cy + 1) && !on(cx - 1, cy) && !on(cx, cy + 1)) segs.push([cx, cy, cx - 1, cy + 1]);
    }
  }
  return segs;
}

/** A largura do letreiro e onde começa cada letra (px, a partir da esquerda do letreiro). */
export const NEON_LAYOUT = (() => {
  const lw = NEON_CELL * 2 + 2;
  const xs = [...NEON_WORD].map((_, i) => i * (lw + LETTER_GAP));
  return { lw, lh: NEON_CELL * 4 + 2, xs, w: xs[xs.length - 1] + lw };
})();
export const NEON_BOX = Object.freeze({ x: Math.round(NEON.x - NEON_LAYOUT.w / 2), y: NEON.y - 18, w: NEON_LAYOUT.w, h: NEON_LAYOUT.lh });

function drawTube(put, ch, ox, oy, color, core) {
  for (const [ax, ay, bx, by] of tubeSegments(ch)) {
    const steps = Math.max(1, Math.abs(bx - ax) * NEON_CELL, Math.abs(by - ay) * NEON_CELL);
    for (let s = 0; s <= steps; s += 1) {
      const x = Math.round(ox + (ax + ((bx - ax) * s) / steps) * NEON_CELL);
      const y = Math.round(oy + (ay + ((by - ay) * s) / steps) * NEON_CELL);
      put(x, y, color);
      put(x + 1, y, color);
      put(x, y + 1, color);
      put(x + 1, y + 1, core ?? color);
    }
  }
}

/** O letreiro apagado (o vidro opaco nos suportes), pintado na parede. */
function neonOff(b) {
  const { x, y, w, h } = NEON_BOX;
  b.rect(x - 8, y - 7, w + 16, h + 14, hex('#141012'));
  b.rect(x - 8, y - 7, w + 16, 1, hex('#2a2224'));
  for (const [sx, sy] of [
    [x - 6, y - 5],
    [x + w + 5, y - 5],
    [x - 6, y + h + 5],
    [x + w + 5, y + h + 5],
  ])
    b.rect(sx, sy, 2, 2, hex('#a8843a'));
  [...NEON_WORD].forEach((ch, i) => drawTube(b.put, ch, x + NEON_LAYOUT.xs[i], y, hex('#5a3442')));
  const sw = textWidth(NEON_SUB, 1);
  pixelText(b, NEON_SUB, NEON.x - sw / 2, y + h + 9, hex('#4a3a24'));
}

/** As letras acesas do neon, uma camada por letra (acendem em sequência) e o halo de todas. */
export function paintNeonLetters() {
  const pad = 10;
  const w = NEON_LAYOUT.lw + pad * 2;
  const h = NEON_LAYOUT.lh + pad * 2;
  return [...NEON_WORD].map((ch) => {
    const raw = buffer(w, h);
    drawTube(raw.put, ch, pad, pad, hex('#ff4f9a'), hex('#fff0f6'));
    const glow = buffer(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let near = 99;
        for (let dy = -6; dy <= 6; dy += 1) {
          for (let dx = -6; dx <= 6; dx += 1) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h || !raw.data[(yy * w + xx) * 4 + 3]) continue;
            near = Math.min(near, Math.hypot(dx, dy));
          }
        }
        if (near > 6.5) continue;
        const a = Math.max(0, 1 - near / 6.5) * 0.6;
        if (a > (bayer(x, y) + 0.5) / 8) glow.put(x, y, hex('#ff3f8a'), Math.min(1, a + 0.2));
      }
    }
    for (let i = 0; i < raw.data.length; i += 4) {
      if (!raw.data[i + 3]) continue;
      glow.data[i] = raw.data[i];
      glow.data[i + 1] = raw.data[i + 1];
      glow.data[i + 2] = raw.data[i + 2];
      glow.data[i + 3] = 255;
    }
    return { w, h, data: glow.data, pad };
  });
}

/** A linha de baixo (DOMINÓ DE BOTECO), em neon âmbar. */
export function paintNeonSub() {
  const sw = textWidth(NEON_SUB, 1);
  const raw = buffer(sw + 6, 11);
  pixelText(raw, NEON_SUB, 3, 3, hex('#ffd27a'));
  const out = buffer(sw + 6, 11);
  for (let y = 0; y < 11; y += 1) {
    for (let x = 0; x < sw + 6; x += 1) {
      let lit = false;
      for (let d = -2; d <= 2 && !lit; d += 1) for (let e = -2; e <= 2 && !lit; e += 1) if (raw.data[((y + d) * (sw + 6) + x + e) * 4 + 3]) lit = (bayer(x, y) + 0.5) / 8 < 0.45;
      if (lit) out.put(x, y, hex('#ff9a2a'), 0.55);
    }
  }
  for (let i = 0; i < raw.data.length; i += 4) {
    if (!raw.data[i + 3]) continue;
    out.data[i] = 255;
    out.data[i + 1] = 214;
    out.data[i + 2] = 140;
    out.data[i + 3] = 255;
  }
  return { w: sw + 6, h: 11, data: out.data, x: Math.round(NEON.x - sw / 2) - 3, y: NEON_BOX.y + NEON_BOX.h + 6 };
}

/** O rosa do neon espalhando pela parede e pelo chão (em pontilhado), quando ele acende. */
export function paintNeonSpill() {
  const w = 420;
  const h = VIEW_H + PAD.y * 2;
  const out = buffer(w, h);
  const cx = w / 2;
  const cy = NEON.y - 6 + PAD.y;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.hypot((x - cx) / 1.25, y - cy);
      const a = Math.max(0, 1 - d / 190) ** 1.6;
      const q = Math.round(a * 6 + bayer(x, y) - 0.5) / 6;
      if (q > 0) out.put(x, y, [255, 70, 140], q * 0.55);
    }
  }
  return { w, h, data: out.data, x: Math.round(NEON.x - w / 2) };
}

/** A porta de aço baixada até perto do chão, com a rua azul e molhada aparecendo por baixo. */
function steelDoor(b, G) {
  const x0 = 1250;
  const gap = 174;
  G.rect(x0, gap, X1 - x0, FLOORS.ground - gap, hex('#2a3c6a'));
  G.rect(x0, gap + 18, X1 - x0, FLOORS.ground - gap - 18, hex('#5a6a8a'));
  for (let x = x0 + 4; x < X1; x += 9) G.rect(x, gap + 22, 4, 1, hex('#9ab0d8'));
  b.rect(x0 - 6, 8, 6, FLOORS.ground - 8, hex('#3a3a3a'));
  for (let y = 10; y < gap; y += 4) {
    b.rect(x0, y, X1 - x0, 3, hex('#7a7e80'));
    b.rect(x0, y, X1 - x0, 1, hex('#a8aeb0'));
    b.rect(x0, y + 3, X1 - x0, 1, hex('#3a3c3e'));
  }
  b.rect(x0, gap - 4, X1 - x0, 4, hex('#4a4c4e'));
  b.rect(x0 + 60, gap - 3, 14, 2, hex('#c8ccd0'));
}


/** O quadro de preços pintado à mão, o ventilador de parede (as pás giram em OpeningScene) e as
 * flâmulas dos times de várzea. */
export const FAN = Object.freeze({ x: 714, y: 38 });
function wallDecor(b) {
  // o quadro de preços
  b.rect(428, 34, 96, 62, hex('#4a2a14'));
  b.rect(431, 37, 90, 56, hex('#1c2420'));
  b.rect(428, 34, 96, 1, hex('#8a5a2a'));
  [['PF', '12'], ['CHOPP', '6'], ['TORRESMO', '9'], ['CALDO', '8'], ['PINGA', '3']].forEach(([item, price], k) => {
    const y = 41 + k * 10;
    pixelText(b, item, 436, y, hex('#e8e0c8'));
    pixelText(b, price, 516 - textWidth(price, 1), y, hex('#ffd27a'));
    for (let x = 438 + textWidth(item, 1); x < 512 - textWidth(price, 1); x += 3) b.put(x, y + 4, hex('#6a6a5a'));
  });
  // o ventilador de parede: o suporte e a grade (as pás são desenhadas por cima)
  b.rect(FAN.x - 2, FAN.y + 10, 4, 14, hex('#3a3a38'));
  b.rect(FAN.x - 6, FAN.y + 22, 12, 4, hex('#4a4a46'));
  for (let a = 0; a < Math.PI * 2; a += 0.08) b.put(FAN.x + Math.cos(a) * 11, FAN.y + Math.sin(a) * 11, hex('#8a8a84'));
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) b.line(FAN.x, FAN.y, FAN.x + Math.cos(a) * 11, FAN.y + Math.sin(a) * 11, hex('#5a5a56'));
  b.rect(FAN.x - 1, FAN.y - 1, 3, 3, hex('#2a2a2a'));
  // as flâmulas
  [
    ['#1a1a1a', '#e8e0c8'],
    ['#2a6a2a', '#e8e0c8'],
    ['#a8201a', '#1a1a1a'],
    ['#2a3a9a', '#e8c030'],
  ].forEach(([a, c], k) => {
    const x0 = 796 + k * 22;
    b.rect(x0 + 8, 30, 1, 4, hex('#2a2a2a'));
    for (let y = 0; y < 30; y += 1) {
      const half = Math.max(0, Math.round(9 * (1 - y / 30)));
      b.rect(x0 + 9 - half, 34 + y, half * 2, 1, hex(a));
    }
    b.rect(x0 + 2, 38, 14, 2, hex(c));
    b.rect(x0 + 6, 44, 6, 2, hex(c));
  });
}

/** O salão inteiro (PANO_W + a sobra) já iluminado. */
export function paintPanorama(seed = 2012) {
  const raw = buffer(PANO_W + PAD.x * 2, VIEW_H + PAD.y * 2);
  const b = shifted(raw, PAD.x, PAD.y);
  const r = rngOf(seed);
  const G = glowLayer(raw, PAD.x, PAD.y);
  ceiling(b, r);
  wall(b, r);
  azulejo(b, r, 262, X1);
  ladrilho(b);
  // o calendário de parede com a praia
  b.rect(560, 30, 36, 50, hex('#e8e0cc'));
  b.rect(562, 32, 32, 18, hex('#3a8ac8'));
  b.rect(562, 44, 32, 6, hex('#e8c87a'));
  b.ellipse(586, 37, 3, 3, hex('#ffe08a'));
  for (let k = 0; k < 20; k += 1) b.rect(563 + (k % 5) * 6, 54 + Math.floor(k / 5) * 6, 4, 4, k === 13 ? hex('#c8281e') : hex('#9a9484'));
  b.rect(577, 27, 2, 4, hex('#1a1a1a'));
  wallDecor(b);
  pendant(b, G, 140, 26);
  pendant(b, G, 382, 30, '#8a2a1a');
  counter(b, r, G);
  crateStack(b, r, 262, 15, 129);
  crateStack(b, r, 277, 15, 140);
  tinTable(b);
  crateStack(b, r, 474, 15, 161);
  crateStack(b, r, 489, 15, 172);
  crateStack(b, r, 504, 15, 183);
  crateStack(b, r, 519, 15, 194);
  jukebox(b, G);
  poolTable(b, r, G);
  sackAndFridge(b, r, G);
  trophies(b, r);
  neonOff(b);
  steelDoor(b, G);
  relight(raw, LIGHTS, { ambient: AMBIENT, mask: G.mask, ox: PAD.x, oy: PAD.y });
  halo(raw, 140 + PAD.x, 31 + PAD.y, 26, hex('#ffd98a'), 0.5, 1.4);
  halo(raw, 382 + PAD.x, 35 + PAD.y, 26, hex('#ffd98a'), 0.5, 1.4);
  halo(raw, 246 + PAD.x, 36 + PAD.y, 9, hex('#ff8a3a'), 0.6);
  halo(raw, 660 + PAD.x, 136 + PAD.y, 34, hex('#ff8ac0'), 0.35);
  halo(raw, 928 + PAD.x, 150 + PAD.y, 44, hex('#bcdcff'), 0.28, 0.8);
  halo(raw, 1336 + PAD.x, 192 + PAD.y, 80, hex('#7a9aff'), 0.3, 2.4);
  return { w: raw.w, h: raw.h, data: raw.data };
}

/* ---------- os desenhinhos que se mexem ---------- */

/** A cor que a luz do salão dá num ponto (para as pedras e o gato combinarem com a pintura). */
export function tintAt(x, y) {
  return lightAt(LIGHTS, x, y, AMBIENT).map((v) => Math.min(1.35, v));
}

/** As pintas de 0 a 6 numa metade de 3 × 5 (tl, tr, ml, c, mr, bl, br). */
const SPOT = { tl: [0, 0], tr: [2, 0], ml: [0, 2], c: [1, 2], mr: [2, 2], bl: [0, 4], br: [2, 4] };
const PIPS = [[], ['c'], ['tl', 'br'], ['tl', 'c', 'br'], ['tl', 'tr', 'bl', 'br'], ['tl', 'tr', 'c', 'bl', 'br'], ['tl', 'tr', 'ml', 'mr', 'bl', 'br']];

/** Uma pedra de lado (4 × 12): a face marfim com as pintas, a espessura e o friso do meio. */
export function paintTile(top, bottom, tint) {
  const out = buffer(TILE_W, TILE_H);
  // a pedra é a estrela: nunca some no escuro (a luz do lugar só puxa a cor)
  const k = tint.map((v) => Math.min(1.25, 0.62 + v * 0.55));
  const lit = (c) => c.map((v, i) => Math.min(255, v * k[i]));
  const ivory = lit(hex('#f2e9d0'));
  const side = lit(hex('#a89a78'));
  const pip = lit(hex('#24160c'));
  out.rect(0, 0, 3, TILE_H, ivory);
  out.rect(3, 0, 1, TILE_H, side);
  out.rect(0, 0, 3, 1, lit(hex('#fffaea')));
  out.rect(0, 6, 3, 1, lit(hex('#6a5a44')));
  for (const s of PIPS[top % 7]) out.put(SPOT[s][0], 1 + SPOT[s][1], pip);
  for (const s of PIPS[bottom % 7]) out.put(SPOT[s][0], 7 + SPOT[s][1], pip);
  return { w: TILE_W, h: TILE_H, data: out.data };
}

/** O carretão gigante, de frente (13 × 44): marfim, as duas senas em pintas vermelhas. */
export function paintGiant() {
  const { w, h } = GIANT;
  const out = buffer(w, h);
  const tint = tintAt(GIANT.x + w / 2, GIANT.y - h / 2).map((v) => Math.max(0.75, v));
  const lit = (c) => c.map((v, k) => Math.min(255, v * tint[k]));
  out.rect(0, 0, w, h, lit(hex('#efe6cc')));
  out.rect(0, 0, w, 1, lit(hex('#fffaea')));
  out.rect(0, 0, 1, h, lit(hex('#fffaea')));
  out.rect(w - 1, 0, 1, h, lit(hex('#a89a78')));
  out.rect(0, h - 1, w, 1, lit(hex('#a89a78')));
  out.rect(2, Math.floor(h / 2) - 1, w - 4, 2, lit(hex('#4a3a2a')));
  out.rect(Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, 2, 2, lit(hex('#d8a83a')));
  for (const half of [0, 1]) {
    const y0 = half ? Math.floor(h / 2) + 3 : 3;
    for (let row = 0; row < 3; row += 1) {
      for (const col of [0, 1]) {
        const px = 2 + col * 6;
        const py = y0 + row * 6;
        out.rect(px, py, 3, 3, lit(hex('#b8201a')));
        out.put(px, py, lit(hex('#e8504a')));
      }
    }
  }
  return { w, h, data: out.data };
}

/** O gato preto em cada pose (máscaras de pixels: g = pelo, e = olho, d = escuro). */
export const CAT_POSES = Object.freeze({
  sleep: ['  gggggggg  ', ' gggggggggg ', 'gggggggggggg', 'ggggggggggdd', ' gggggggggdd'],
  alert: ['g g         ', 'ggg         ', 'geg  ggggg  ', 'gggggggggggg', 'gggggggggggg', 'gggggggggggd', ' gggggggggdd'],
  leap: ['g g            ', 'geggg        gg', 'ggggggggggggg  ', ' ggggggggggg   ', ' g  g    g  g  '],
  perch: ['g g    ', 'geg    ', 'ggg   g', 'gggg  g', 'ggggg g', 'gggggg ', 'gggggg ', 'gg  gg '],
});
