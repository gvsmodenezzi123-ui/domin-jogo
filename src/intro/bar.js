// Cena 3: dentro do boteco. A câmera entra pela porta e desliza até a mesa: o Valtinho no
// balcão (com a estufa de salgados e o vidro de ovo colorido), as garrafas, a placa FIADO SÓ
// AMANHÃ, o relógio marcando 1h47, o rádio tocando, o retrato do Comendador, as fotos do Tonho,
// da Cida e do Beto e a TV no canto. Debaixo da lâmpada, na fumaça, o Tio Zé ergue os olhos:
// "Senta, menino. A mesa tá posta." — e levanta a bucha de seis.
//
// Versão 2.3: no modelo novo do jogo. O Tio Zé, o Valtinho, o Comendador e as fotos são os
// retratos 64×64 (desenhados na resolução da tela, com o detalhe deles), a mesa tem o feltro
// pintado com a luz da lâmpada, as pedras têm espessura e pontos cavados, o dorme é o mesmo
// da partida e a fala é o balão de papel da mesa. Copo, garrafa, cinzeiro e tampinhas saíram
// da mesa (como na partida).
import {
  bands,
  boxBlur,
  clamp,
  copyCanvas,
  easeInOut,
  easeOut,
  ellipse,
  hash,
  line,
  makeCanvas,
  mix,
  pix,
  poly,
  rect,
  smooth,
  span,
  text5,
  text5Width,
  tint,
  wobble,
} from './core.js';
import { beam, fill, glow, glowEllipse, makeCamera, vignette, withRoll } from './stage.js';

export const BAR_LEN = 2.98;
export const SPEECH = 'Senta, menino. A mesa tá posta.';
/** Quando a fala começa e o ritmo das letras (s), dentro da cena. */
export const SPEECH_AT = 1.3;
export const SPEECH_CHAR = 0.045;
/** Tio Zé levanta os olhos. */
const LOOK_AT = 1.12;
/** Ele ergue a bucha (a cena corta para o close na batida). */
const RAISE_AT = 2.42;

const BACK = { ox: -60, oy: -50, w: 300, h: 260, depth: 1.22 };
const MID = { ox: -50, oy: -50, w: 280, h: 420, depth: 1 };
const FRONT = { ox: 130, oy: 240, w: 70, h: 140, depth: 0.72 };

const WALL_FLOOR = 196;
const LAMP = { x: 138, y: 140 };
/** O Tio Zé: o retrato de 64 ocupa 48×48 pixels de arte (U = 0,75 pixel de arte por pixel dele). */
const TIO = { x: 113, y: 175, size: 48 };
const U = TIO.size / 64;
const VALTINHO = { x: 16, y: 98, size: 52 };

// ---------------------------------------------------------------------------------

/** O fundo é pintado em 2× (os retratos da parede ficam nítidos); o resto é a mesma arte. */
const BACK_RES = 2;

function backArt(sprites) {
  const c = makeCanvas(BACK.w * BACK_RES, BACK.h * BACK_RES);
  const g = pix(c);
  g.scale(BACK_RES, BACK_RES);
  g.translate(-BACK.ox, -BACK.oy);
  // teto de tábua com as vigas
  rect(g, -60, -50, 300, 72, '#1e130b');
  for (let x = -60; x < 240; x += 26) {
    rect(g, x, -50, 8, 72, '#2d1d11');
    rect(g, x, -50, 1, 72, '#3c2716');
  }
  rect(g, -60, 18, 300, 4, '#3a2416');
  rect(g, -60, 21, 300, 1, '#120b06');
  // parede encardida de fumaça (mais clara no meio, onde a lâmpada bate)
  for (let y = 22; y < 152; y += 1) {
    for (let x = -60; x < 240; x += 1) {
      const d = Math.hypot((x - 120) / 150, (y - 120) / 120);
      const base = mix('#6a4526', '#24160c', clamp(d * 0.95));
      const n = hash(x * 13 + y * 7, 1);
      rect(g, x, y, 1, 1, n > 0.92 ? mix(base, '#000000', 0.18) : n < 0.05 ? mix(base, '#ffffff', 0.06) : base);
    }
  }
  // manchas de umidade
  for (let i = 0; i < 18; i += 1) {
    const x = -60 + hash(i, 2) * 300;
    const y = 24 + hash(i, 3) * 40;
    rect(g, x, y, 1 + Math.floor(hash(i, 4) * 2), 10 + hash(i, 5) * 30, '#3a2414');
  }
  // barra de azulejo verde até o chão
  for (let y = 152; y < WALL_FLOOR; y += 1) {
    for (let x = -60; x < 240; x += 1) {
      const tx = (x + 600) % 8;
      const ty = (y - 152) % 8;
      let col = '#2f6450';
      if (tx === 0 || ty === 0) col = '#16281f';
      else if ((tx === 4 && ty > 1 && ty < 7) || (ty === 4 && tx > 1 && tx < 7)) col = '#7fb89a';
      else if (tx === 1 && ty === 1) col = '#4f8a70';
      rect(g, x, y, 1, 1, col);
    }
  }
  rect(g, -60, 150, 300, 2, '#4a301a');
  rect(g, -60, 150, 300, 1, '#6a4526');
  rect(g, -60, WALL_FLOOR - 3, 300, 3, '#1a100a');

  // prateleiras de garrafas (atrás do balcão)
  const shelves = [74, 102, 128];
  for (const sy of shelves) {
    rect(g, -40, sy, 120, 3, '#5a341a');
    rect(g, -40, sy, 120, 1, '#80502a');
    rect(g, -40, sy + 3, 120, 1, '#1a0f07');
    for (let i = 0; i < 17; i += 1) {
      const bx = -38 + i * 7 + Math.floor(hash(i, sy) * 2);
      const kind = Math.floor(hash(i, sy + 1) * 5);
      const tall = [16, 13, 18, 10, 15][kind];
      const col = ['#8a4e16', '#2e5a26', '#b9c2b0', '#6a1e1a', '#c88a2a'][Math.floor(hash(i, sy + 2) * 5)];
      const neck = kind === 3 ? 2 : 4;
      rect(g, bx, sy - tall, 5, tall - neck, col);
      rect(g, bx + 1, sy - tall - neck + 1, 3, neck, col);
      rect(g, bx + 1, sy - tall - neck, 3, 1, '#c9b27a');
      rect(g, bx + 1, sy - tall + 3, 1, tall - neck - 4, mix(col, '#ffffff', 0.45));
      rect(g, bx + 4, sy - tall, 1, tall - neck, mix(col, '#000000', 0.4));
      if (kind !== 2) rect(g, bx, sy - Math.round(tall * 0.55), 5, 4, hash(i, sy + 3) > 0.5 ? '#e3d6b0' : '#d8c28a');
    }
  }
  // placa FIADO SÓ AMANHÃ
  const plaque = 'FIADO SÓ AMANHÃ';
  const pw = text5Width(plaque) + 8;
  rect(g, -14, 34, pw, 13, '#3a2416');
  rect(g, -13, 35, pw - 2, 11, '#e2cf9c');
  rect(g, -13, 35, pw - 2, 1, '#f3e5bd');
  text5(g, plaque, -10, 39, '#7a1f14');
  rect(g, -14 + Math.floor(pw / 2), 28, 1, 6, '#2a1a0e');
  // relógio: 1h47
  const cx = 96;
  const cy = 50;
  ellipse(g, cx, cy, 11, 11, '#3a2416');
  ellipse(g, cx, cy, 9.5, 9.5, '#ece4cc');
  for (let h = 0; h < 12; h += 1) {
    const a = (h / 12) * Math.PI * 2;
    rect(g, Math.round(cx + Math.sin(a) * 8 - 0.5), Math.round(cy - Math.cos(a) * 8 - 0.5), 1, 1, '#3a2a1e');
  }
  const hourA = ((1 + 47 / 60) / 12) * Math.PI * 2;
  const minA = (47 / 60) * Math.PI * 2;
  line(g, cx, cy, cx + Math.sin(hourA) * 5, cy - Math.cos(hourA) * 5, '#1a120c', 1);
  line(g, cx, cy, cx + Math.sin(minA) * 7.5, cy - Math.cos(minA) * 7.5, '#1a120c', 1);
  rect(g, cx, cy, 1, 1, '#7a1f14');
  // o retrato do Comendador na parede (o retrato do jogo, com a parede vermelha e a moldura de ouro)
  rect(g, 136, 28, 40, 40, '#3a2808');
  rect(g, 137, 29, 38, 38, '#c9962e');
  rect(g, 137, 29, 38, 1, '#ffe08a');
  rect(g, 137, 29, 1, 38, '#e2b84a');
  rect(g, 174, 29, 1, 38, '#5a3c08');
  rect(g, 137, 66, 38, 1, '#5a3c08');
  g.drawImage(sprites.comendador, 140, 32, 32, 32);
  rect(g, 146, 70, 20, 5, '#c8962e');
  rect(g, 147, 71, 18, 3, '#6a4a14');
  // mural de fotos (Tonho, Cida, Beto): polaroides com percevejo vermelho
  sprites.photos.forEach((photo, i) => {
    const px = 102 + i * 13;
    const py = 86 + (i % 2) * 5;
    rect(g, px + 1, py + 1, 16, 20, 'rgba(0,0,0,0.45)');
    rect(g, px, py, 16, 20, '#efe8d6');
    rect(g, px, py + 19, 16, 1, '#a89e88');
    g.save();
    g.imageSmoothingEnabled = true;
    g.drawImage(photo, 0, 0, 64, 64, px + 1, py + 1, 14, 14);
    g.restore();
    rect(g, px + 7, py - 1, 2, 2, '#c8261d');
    rect(g, px + 7, py - 1, 1, 1, '#ff8a7a');
  });
  // o rádio na prateleira de canto
  rect(g, 186, 106, 34, 3, '#5a341a');
  rect(g, 188, 90, 28, 16, '#6a3a1a');
  rect(g, 188, 90, 28, 1, '#8a5428');
  rect(g, 190, 93, 12, 10, '#3a2010');
  for (let y = 94; y < 103; y += 2) rect(g, 191, y, 10, 1, '#24140a');
  rect(g, 204, 93, 10, 4, '#e8b04a');
  rect(g, 205, 99, 3, 3, '#c8b088');
  rect(g, 210, 99, 3, 3, '#c8b088');
  rect(g, 214, 84, 1, 6, '#9a9aa2');
  // TV no suporte, lá no alto do canto
  rect(g, 196, 26, 40, 30, '#141418');
  rect(g, 198, 28, 36, 24, '#2a6a3a');
  rect(g, 210, 56, 4, 6, '#2a2a30');
  return c;
}

/** Chão de ladrilho preto e branco em perspectiva (amostrado 2x2 para o fundo não serrilhar). */
function floorArt(g) {
  const vx = 100;
  const hy = 150;
  for (let y = WALL_FLOOR; y < 370; y += 1) {
    for (let x = -50; x < 230; x += 1) {
      let light = 0;
      for (const sy of [0.25, 0.75]) {
        for (const sx of [0.25, 0.75]) {
          const d = y + sy - hy;
          const u = ((x + sx - vx) * 7) / d;
          const v = 1400 / d;
          light += (Math.floor(u) + Math.floor(v)) & 1 ? 0.25 : 0;
        }
      }
      const n = hash(x * 7 + y * 3, 9);
      let col = mix('#140e0a', '#4e4436', light);
      if (n > 0.9) col = mix(col, '#000000', 0.3);
      const near = clamp((y - WALL_FLOOR) / 150);
      rect(g, x, y, 1, 1, mix('#0c0805', col, 0.35 + near * 0.65));
    }
  }
}

function midArt() {
  const c = makeCanvas(MID.w, MID.h);
  const g = pix(c);
  g.translate(-MID.ox, -MID.oy);
  floorArt(g);
  // rodapé encostado na parede (o chão começa aqui)
  rect(g, -50, WALL_FLOOR, 280, 1, '#0c0805');

  // ---- balcão (lado esquerdo)
  const top = 150;
  rect(g, -50, top, 124, 6, '#8a7a68');
  rect(g, -50, top, 124, 1, '#c4b49a');
  rect(g, -50, top + 5, 124, 1, '#4a4034');
  // frente de madeira com frisos e a chapa de baixo
  rect(g, -50, top + 6, 120, 78, '#4a2a14');
  for (let x = -48; x < 70; x += 10) {
    rect(g, x, top + 10, 8, 62, '#5a341a');
    rect(g, x, top + 10, 8, 1, '#6e4222');
    rect(g, x, top + 71, 8, 1, '#2a170a');
  }
  rect(g, -50, top + 74, 120, 10, '#6a6a70');
  rect(g, -50, top + 74, 120, 1, '#9a9aa2');
  rect(g, 70, top + 6, 4, 78, '#2a170a');
  // banquinhos cromados com assento vermelho
  for (const sx of [10, 46]) {
    rect(g, sx + 4, 206, 2, 34, '#8a9098');
    rect(g, sx + 4, 206, 1, 34, '#c4cad2');
    ellipse(g, sx + 5, 204, 8, 2.5, '#9a2620');
    ellipse(g, sx + 5, 203.5, 7, 1.6, '#c8382e');
    ellipse(g, sx + 5, 240, 6, 1.5, '#5a5e66');
  }
  // estufa de salgados (coxinha e pastel) no balcão
  rect(g, -36, 128, 34, 22, '#9aa2aa');
  rect(g, -35, 129, 32, 20, '#ffd892');
  bands(g, -35, 32, [
    [129, '#ffe2a8'],
    [149, '#e8a85a'],
  ]);
  rect(g, -35, 139, 32, 1, '#c8c8c8');
  for (let i = 0; i < 5; i += 1) {
    const x = -33 + i * 6;
    // coxinha: gota com bico
    rect(g, x + 1, 133, 3, 1, '#c8782e');
    rect(g, x, 134, 5, 4, '#c8782e');
    rect(g, x + 1, 134, 2, 2, '#f0b060');
    rect(g, x + 2, 132, 1, 1, '#a85a1e');
  }
  for (let i = 0; i < 4; i += 1) {
    const x = -33 + i * 8;
    rect(g, x, 145, 7, 3, '#d8a050');
    rect(g, x + 1, 144, 5, 1, '#e8b868');
    rect(g, x, 147, 7, 1, '#a8701e');
  }
  rect(g, -36, 128, 34, 1, '#d8dde2');
  // vidro de ovo colorido
  rect(g, 50, 132, 11, 18, '#5a6a66');
  rect(g, 51, 133, 9, 16, '#9ab0a8');
  rect(g, 50, 130, 11, 2, '#c8c8c8');
  for (const [x, y, col] of [
    [52, 145, '#e86a9a'],
    [56, 145, '#5a9ae8'],
    [52, 140, '#e8d24a'],
    [56, 140, '#6ac86a'],
    [54, 135, '#e86a9a'],
  ]) {
    rect(g, x, y, 3, 4, col);
    rect(g, x, y, 1, 1, '#ffffff');
  }
  rect(g, 51, 133, 1, 16, '#d8e8e0');
  // copos americanos virados e o paninho
  for (let i = 0; i < 3; i += 1) {
    rect(g, 30 + i * 5, 143, 4, 7, '#6a7e84');
    rect(g, 30 + i * 5, 143, 4, 1, '#aac0c6');
    rect(g, 30 + i * 5, 146, 4, 1, '#5a6e74');
  }

  // ---- a mesa debaixo da lâmpada: feltro pintado (a luz da lâmpada no meio, fiapos, uma
  // queimadura de cigarro) e a borda de mogno com o friso aceso
  drawTable(g);
  return c;
}

/** Feltro em perspectiva: miolo claro onde a lâmpada bate, escurecendo para as beiradas. */
const FELT = { hi: '#5a7a46', mid: '#3a5a30', lo: '#24381e', deep: '#142212' };

function drawTable(g) {
  // a borda de madeira (tampo) e a espessura
  poly(
    g,
    [
      [91, 221],
      [187, 221],
      [195, 251],
      [83, 251],
    ],
    '#3a1c0c',
  );
  poly(
    g,
    [
      [92, 221],
      [186, 221],
      [187, 223],
      [91, 223],
    ],
    '#a8683a',
  );
  // o feltro, pixel a pixel
  for (let y = 224; y < 248; y += 1) {
    const k = (y - 224) / 24;
    const x0 = Math.round(95 - k * 7);
    const x1 = Math.round(183 + k * 7);
    for (let x = x0; x < x1; x += 1) {
      const d = Math.hypot((x - 138) / 52, (y - 236) / 16);
      const n = hash(x * 31 + y * 17, 5);
      const v = 0.75 - d * 0.95 + (n - 0.5) * 0.28;
      let col = v > 0.42 ? FELT.hi : v > 0.02 ? FELT.mid : v > -0.38 ? FELT.lo : FELT.deep;
      if (n > 0.965) col = mix(col, '#a8c088', 0.35); // fiapo claro
      rect(g, x, y, 1, 1, col);
    }
  }
  // queimadura de cigarro e a mancha de copo antiga
  rect(g, 171, 241, 2, 1, '#1a1208');
  rect(g, 172, 240, 1, 1, '#3a2a14');
  for (let a = 0; a < Math.PI * 2; a += 0.35) rect(g, Math.round(103 + Math.cos(a) * 4), Math.round(230 + Math.sin(a) * 1.5), 1, 1, '#2a4022');
  // a frente da borda (mogno) com o friso de luz e a sombra embaixo
  rect(g, 83, 250, 112, 9, '#4a2410');
  rect(g, 83, 250, 112, 1, '#c8844a');
  rect(g, 83, 251, 112, 1, '#7a3c1c');
  rect(g, 83, 258, 112, 1, '#1a0a04');
  for (let x = 86; x < 192; x += 13) rect(g, x, 253, 6, 1, '#5a2c14');
  rect(g, 90, 259, 5, 50, '#3a2010');
  rect(g, 90, 259, 1, 50, '#6a3a1c');
  rect(g, 183, 259, 5, 50, '#2a170a');
  // a fileira de pedras deitada na mesa: [2|4][4|6] com espessura e pontos cavados
  flatTile(g, 106, 238, 2, 4);
  flatTile(g, 121, 238, 4, 6);
}

const PIPS5 = {
  1: [[3, 2]],
  2: [
    [1, 1],
    [5, 3],
  ],
  4: [
    [1, 1],
    [5, 1],
    [1, 3],
    [5, 3],
  ],
  6: [
    [1, 1],
    [3, 1],
    [5, 1],
    [1, 3],
    [3, 3],
    [5, 3],
  ],
};

/** Pedra deitada de 14×5 vista de cima, com a lateral (espessura) e os pontos fundos. */
function flatTile(g, x, y, a, b) {
  rect(g, x + 1, y + 2, 14, 6, 'rgba(0,0,0,0.5)'); // sombra no feltro
  rect(g, x, y + 5, 14, 2, '#a8946a'); // a lateral (espessura)
  rect(g, x, y + 6, 14, 1, '#6a5838');
  rect(g, x, y, 14, 5, '#ece2c6');
  rect(g, x, y, 14, 1, '#fffaf0');
  rect(g, x, y, 1, 5, '#f8f0dc');
  rect(g, x + 13, y, 1, 5, '#cdbf98');
  rect(g, x + 7, y, 1, 5, '#8a7a5a');
  rect(g, x + 8, y, 1, 5, '#f4ecd6');
  const face = (ox, n) => {
    for (const [px, py] of PIPS5[n]) {
      rect(g, x + ox + px, y + py, 1, 1, '#1e140c');
    }
  };
  face(0, a);
  face(7, b);
}

function frontArt() {
  // a cadeira vazia do lado de cá da mesa, puxada (a nossa), vista de costas
  const c = makeCanvas(FRONT.w, FRONT.h);
  const g = pix(c);
  g.translate(-FRONT.ox, -FRONT.oy);
  const wood = '#3a200e';
  const light = '#6e4222';
  const lit = '#a8703a';
  for (const x of [146, 176]) {
    rect(g, x, 256, 5, 124, wood);
    rect(g, x, 256, 1, 124, light);
  }
  rect(g, 143, 252, 40, 8, wood);
  rect(g, 143, 252, 40, 1, lit);
  rect(g, 143, 253, 40, 1, light);
  rect(g, 149, 272, 28, 4, wood);
  rect(g, 149, 272, 28, 1, light);
  rect(g, 149, 290, 28, 3, wood);
  return c;
}

/** Fumaça do cigarro em pixels: fiapos que sobem, se enrolam e somem. */
function drawSmoke(g, t, x0, y0) {
  for (let i = 0; i < 40; i += 1) {
    const life = 2.6;
    const age = (t + (i / 40) * life) % life;
    const k = age / life;
    const x = x0 + Math.sin(age * 2.2 + i) * (2 + k * 7) + k * 6;
    const y = y0 - age * 22;
    const a = (1 - k) * 0.55;
    if (a <= 0.02) continue;
    g.globalAlpha = a;
    rect(g, x, y, k > 0.5 ? 2 : 1, 1, '#d8d4cc');
  }
  g.globalAlpha = 1;
}

const SUIT = '#2a2622';
const SUIT_LIT = '#4e463e';
const SUIT_DEEP = '#100d0a';
const SKIN = '#c88a5a';
const SKIN_DARK = '#9a6038';
const SKIN_LIT = '#eab082';

/** O encosto da cadeira dele, atrás (na arte da cena). */
function drawTioChair(g) {
  const { x, y, size } = TIO;
  rect(g, x + 1, y + 10, 4, size - 12, '#3a200e');
  rect(g, x + 1, y + 10, 1, size - 12, '#7a4a26');
  rect(g, x + size - 5, y + 10, 4, size - 12, '#2a170a');
  rect(g, x, y + 8, size, 4, '#4a2a14');
  rect(g, x, y + 8, size, 1, '#8a5a30');
}

/** Pinta em "pixels do retrato" (U de arte), alinhado ao Tio Zé: braços e mãos com a mesma densidade dele. */
const pp = (g, x, y, w, h, color) => {
  g.fillStyle = color;
  g.fillRect(TIO.x + x * U, TIO.y + y * U, w * U, h * U);
};

/** Braço: a manga grossa (com a quina de cima acesa pela lâmpada) de um ponto ao outro. */
function arm(g, pts, w) {
  const path = (lw, color, dy = 0) => {
    g.beginPath();
    pts.forEach(([px, py], i) => {
      const X = TIO.x + px * U;
      const Y = TIO.y + (py + dy) * U;
      if (i) g.lineTo(X, Y);
      else g.moveTo(X, Y);
    });
    g.lineWidth = lw * U;
    g.strokeStyle = color;
    g.stroke();
  };
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  path(w + 1.5, SUIT_DEEP);
  path(w, SUIT);
  path(1.5, SUIT_LIT, -w / 2 + 1.2);
  g.restore();
}

/** Mão (vista de cima, dedos para a frente), em pixels do retrato. */
function hand(g, x, y, flip = false) {
  pp(g, x - 1, y - 1, 10, 8, '#1a100a');
  pp(g, x, y, 8, 6, SKIN);
  pp(g, x, y, 8, 1, SKIN_LIT);
  pp(g, flip ? x : x + 7, y + 1, 1, 5, SKIN_DARK);
  for (const fx of [1, 3, 5]) pp(g, x + fx + 1, y + 2, 1, 4, SKIN_DARK);
  pp(g, flip ? x + 7 : x - 1, y + 2, 2, 3, SKIN);
  pp(g, x + 1, y + 5, 6, 1, SKIN_DARK);
}

/** As pedras dele em pé na beira da mesa (vemos as costas de ébano, com o chanfro). */
function standingTiles(g) {
  for (let i = 0; i < 6; i += 1) {
    const tx = 17 + i * 5.2;
    pp(g, tx - 0.5, 64.5, 5, 15, '#0a0604');
    pp(g, tx, 65, 4, 14, '#2e1c12');
    pp(g, tx, 65, 4, 1, '#8a6a48');
    pp(g, tx, 65, 1, 14, '#5a4030');
    pp(g, tx + 3, 66, 1, 13, '#140c08');
    pp(g, tx + 1, 70, 2, 2, '#c8a040');
  }
}

/** A bucha [6|6] erguida (osso com a lateral e os pontos cavados). */
function raisedBucha(g, x, y) {
  pp(g, x - 1, y - 1, 12, 23, '#140c06');
  pp(g, x, y, 10, 21, '#ece2c6');
  pp(g, x, y, 10, 1, '#ffffff');
  pp(g, x, y, 1, 21, '#fff6e2');
  pp(g, x + 8, y + 1, 2, 20, '#bba878');
  pp(g, x + 1, y + 10, 8, 1, '#8a7a5a');
  for (const [px, py] of [
    [2, 2],
    [2, 5],
    [2, 7],
    [6, 2],
    [6, 5],
    [6, 7],
    [2, 12],
    [2, 15],
    [2, 17],
    [6, 12],
    [6, 15],
    [6, 17],
  ]) {
    pp(g, x + px, y + py, 2, 2, '#1e140c');
    pp(g, x + px, y + py + 2, 2, 0.5, '#fffaf0');
  }
}

/** O Tio Zé na frente da mesa: as pedras dele, os braços e as mãos (e a bucha, quando ergue). */
function drawTioFront(g, raise) {
  standingTiles(g);
  // braço do lado esquerdo da tela: ombro → cotovelo → mão nas pedras
  arm(g, [
    [17, 55],
    [11, 68],
    [17, 74],
  ], 8);
  hand(g, 15, 71);
  // o outro: em repouso, ou erguendo a bucha [6|6] para a gente ver
  const hx = 41 + raise * 16;
  const hy = 71 - raise * 43;
  arm(g, [
    [47, 55],
    [53 + raise * 4, 68 - raise * 18],
    [hx + 4, hy + 3],
  ], 8);
  if (raise > 0.05) raisedBucha(g, hx - 1, hy - 21);
  hand(g, hx, hy, true);
}

export function buildBar(sprites) {
  const back = backArt(sprites);
  const backBlur = boxBlur(copyCanvas(back), 1.6 * BACK_RES, 3);
  const mid = midArt();
  const front = frontArt();
  const frontBlur = boxBlur(copyCanvas(front, 4), 2, 3);
  const frame = makeCanvas(MID.w, MID.h);
  const valtinho = { open: tint(sprites.valtinho.open, '#ffd8a8', 0.3), blink: tint(sprites.valtinho.blink, '#ffd8a8', 0.3) };
  const dorme = tint(sprites.boneyard, '#ffd8a8', 0.2);
  const warm = (c) => tint(c, '#ffd0a0', 0.22);
  const tio = Object.fromEntries(Object.entries(sprites.tio).map(([k, c]) => [k, warm(c)]));
  const lampSprite = sprites.lamp;

  /** Câmera: entra pela porta e desliza até o Tio Zé. */
  const camera = (F, t, extra = {}) => {
    const k = easeInOut(span(t, 0, 1.45));
    const drift = span(t, 1.45, BAR_LEN) * 0.03;
    const settle = F.reduced ? 0 : wobble(t * 0.7, 3) * 0.6;
    return makeCamera(F, {
      fx: 90 + (136 - 90) * k + settle,
      fy: 176 + (199 - 176) * k + wobble(t * 0.6, 4) * 0.4,
      ax: 90,
      ay: 176,
      f: 0.43 * k + drift,
      roll: F.reduced ? 0 : (1 - k) * Math.sin(t * 4.4) * 0.005,
      ...extra,
    });
  };

  const tioSprite = (t) => {
    if (t > 0.62 && t < 0.72) return tio.blink;
    if (t < LOOK_AT) return tio.idle;
    const typed = Math.floor((t - SPEECH_AT) / SPEECH_CHAR);
    if (t >= SPEECH_AT && typed < SPEECH.length) {
      const ch = SPEECH[typed] ?? ' ';
      if (!' .,'.includes(ch) && typed % 2 === 0) return tio.talk;
    }
    return tio.smug;
  };

  const draw = (F) => {
    const { out, t } = F;
    const cam = camera(F, t);
    const focus = smooth(span(t, 0.9, 1.6));

    // ---- plano do meio (pixel art refeita a cada quadro)
    const g = pix(frame);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, frame.width, frame.height);
    g.drawImage(mid, 0, 0);
    g.translate(-MID.ox, -MID.oy);
    // a cadeira do Tio Zé (atrás dele)
    drawTioChair(g);
    const vBlink = (t > 0.55 && t < 0.66) || (t > 2.1 && t < 2.2);
    const breathe = Math.sin(t * 2.6) * 0.5 + 0.5;
    const raise = easeOut(span(t, RAISE_AT, RAISE_AT + 0.4));
    // lâmpada (o mesmo abajur da tela inicial)
    rect(g, LAMP.x, -50, 1, LAMP.y - 20 + 50, '#120b06');
    g.drawImage(lampSprite, LAMP.x - 20, LAMP.y - 20);
    // ventilador de teto girando
    const fx = 56;
    const fy = 6;
    rect(g, fx, -50, 2, 50 + fy, '#1a100a');
    const phase = Math.floor(t * 18) % 3;
    const blades = [
      [-22, 0, 22, 0],
      [-18, 3, 18, -3],
      [-18, -3, 18, 3],
    ][phase];
    line(g, fx + 1 + blades[0], fy + 4 + blades[1], fx + 1 + blades[2], fy + 4 + blades[3], '#2a1a10', 2);
    rect(g, fx - 3, fy + 2, 8, 5, '#3a2416');
    g.setTransform(1, 0, 0, 1, 0, 0);

    withRoll(out, F, cam.roll, () => {
      const sc = cam.scale(1);
      // fundo: parede (vai desfocando quando a câmera para no Tio Zé)
      cam.blitScaled(out, back, BACK.ox, BACK.oy, BACK.w, BACK.h, BACK.depth);
      cam.blitScaled(out, backBlur, BACK.ox, BACK.oy, BACK.w, BACK.h, BACK.depth, focus * 0.85, true);
      // a TV piscando e o mostrador do rádio
      const tvFlick = 0.5 + 0.5 * wobble(t * 6, 7);
      const [tx, ty] = cam.toScreen(216, 40, BACK.depth);
      glow(out, tx, ty, cam.scale(BACK.depth) * 26, 'rgba(90,220,140,0.6)', 0.35 + tvFlick * 0.25);
      const [rx, ry] = cam.toScreen(209, 95, BACK.depth);
      glow(out, rx, ry, cam.scale(BACK.depth) * 10, 'rgba(255,190,90,0.8)', 0.6);
      // luz quente lavando a parede e a do retrato do Comendador
      const [wx, wy] = cam.toScreen(120, 90, BACK.depth);
      glowEllipse(out, wx, wy, sc * 140, sc * 90, 'rgba(255,170,90,0.35)', 0.35);
      const [cx, cy] = cam.toScreen(158, 50, BACK.depth);
      glow(out, cx, cy, cam.scale(BACK.depth) * 26, 'rgba(255,200,120,0.5)', 0.35);
      // bokeh das garrafas quando a parede desfoca
      if (focus > 0.05) {
        for (let i = 0; i < 16; i += 1) {
          const bx = -36 + hash(i, 61) * 116;
          const by = 60 + hash(i, 62) * 70;
          const [x, y] = cam.toScreen(bx, by, BACK.depth);
          const col = ['rgba(255,190,110,0.5)', 'rgba(160,230,150,0.45)', 'rgba(255,230,190,0.5)'][i % 3];
          glow(out, x, y, sc * (2.5 + hash(i, 63) * 3), col, focus * 0.55);
        }
      }
      cam.blit(out, frame, MID.ox, MID.oy, MID.depth);
      // estufa e ovos brilhando
      const [ex, ey] = cam.toScreen(-19, 139);
      glowEllipse(out, ex, ey, sc * 30, sc * 16, 'rgba(255,200,120,0.7)', 0.5);
      // facho da lâmpada atravessando a fumaça + a mancha de luz no feltro
      const flick = 0.92 + wobble(t * 7, 9) * 0.06;
      const [bx0, by0] = cam.toScreen(LAMP.x, LAMP.y + 9);
      const [bx1, by1] = cam.toScreen(LAMP.x, 250);
      beam(out, bx0, by0, sc * 14, bx1, by1, sc * 62, 'rgba(255,214,150,0.55)', 0.42 * flick);
      const [px, py] = cam.toScreen(LAMP.x, 236);
      glowEllipse(out, px, py, sc * 56, sc * 16, 'rgba(255,220,160,0.7)', 0.5 * flick);
      glow(out, bx0, by0, sc * 34, 'rgba(255,236,190,0.95)', 0.85 * flick);
      // Versão 2.3: os personagens na resolução da tela (o retrato de 64 com o detalhe dele)
      // o Valtinho atrás do balcão, cortado na altura do tampo
      {
        const [cx0, cy0] = cam.toScreen(-50, -50);
        const [cx1, cy1] = cam.toScreen(230, 150);
        out.save();
        out.beginPath();
        out.rect(cx0, cy0, cx1 - cx0, cy1 - cy0);
        out.clip();
        cam.blitScaled(out, vBlink ? valtinho.blink : valtinho.open, VALTINHO.x, VALTINHO.y, VALTINHO.size, VALTINHO.size);
        out.restore();
      }
      // o Tio Zé respirando, o dorme na mesa e, na frente, as pedras dele, os braços e as mãos
      cam.blitScaled(out, tioSprite(t), TIO.x, TIO.y - breathe * U, TIO.size, TIO.size);
      cam.blitScaled(out, dorme, 158, 216, 28, 20);
      {
        const [ox0, oy0] = cam.toScreen(0, 0);
        const k = cam.scale(1);
        out.save();
        out.translate(ox0, oy0);
        out.scale(k, k);
        // o copo e o paninho do Valtinho (na frente dele)
        const wipe = t * 7;
        rect(out, 36 + Math.round(Math.cos(wipe) * 2), 138 + Math.round(Math.sin(wipe) * 1), 6, 8, '#7a8e94');
        rect(out, 36 + Math.round(Math.cos(wipe) * 2), 138 + Math.round(Math.sin(wipe) * 1), 6, 1, '#c8dadf');
        rect(out, 34 + Math.round(Math.cos(wipe + 1) * 3), 142 + Math.round(Math.sin(wipe + 1) * 2), 5, 4, '#e8e2d2');
        drawTioFront(out, raise);
        // a fumaça do cigarro dele (sai da brasa, no canto da boca)
        drawSmoke(out, t, TIO.x + 46 * U, TIO.y + 38 * U - breathe * U);
        out.restore();
      }
      // poeira dançando no facho
      out.save();
      out.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 34; i += 1) {
        const px0 = LAMP.x - 34 + hash(i, 71) * 68;
        const py0 = LAMP.y + 14 + ((hash(i, 72) * 90 + t * (3 + hash(i, 73) * 4)) % 90);
        const spread = (py0 - LAMP.y) / 100;
        const x = LAMP.x + (px0 - LAMP.x) * spread + Math.sin(t * 1.3 + i) * 2;
        const [sx, sy] = cam.toScreen(x, py0);
        const a = 0.25 + 0.5 * Math.abs(Math.sin(t * 2 + i));
        out.fillStyle = `rgba(255,230,180,${a * 0.6})`;
        out.beginPath();
        out.arc(sx, sy, sc * (0.35 + hash(i, 74) * 0.4), 0, Math.PI * 2);
        out.fill();
      }
      // névoa de fumaça pairando (camadas largas e lentas)
      for (let i = 0; i < 5; i += 1) {
        const hx2 = -40 + ((hash(i, 81) * 260 + t * (4 + i)) % 260);
        const hy2 = 110 + hash(i, 82) * 100;
        const [x, y] = cam.toScreen(hx2, hy2);
        glowEllipse(out, x, y, sc * 70, sc * 18, 'rgba(200,170,140,0.25)', 0.18);
      }
      out.restore();
      // a cadeira vazia (bem perto: desfocada)
      cam.blit(out, front, FRONT.ox, FRONT.oy, FRONT.depth, 1 - focus);
      cam.blit(out, frontBlur, FRONT.ox - 4, FRONT.oy - 4, FRONT.depth, focus);
    });
    vignette(out, F, 0.9);
    // fala do Tio Zé
    speech(out, F, cam, t);
    // chegou da luz estourada da porta
    fill(out, F, '#ffe6b8', 1 - smooth(span(t, 0, 0.3)));
  };

  return { draw, camera };
}

/** Balão de fala igual ao da mesa (papel pautado, borda de tinta), com a fala letra a letra. */
function speech(g, F, cam, t) {
  if (t < SPEECH_AT - 0.05) return;
  const typed = clamp(Math.floor((t - SPEECH_AT) / SPEECH_CHAR) + 1, 0, SPEECH.length);
  const appear = easeOut(span(t, SPEECH_AT - 0.05, SPEECH_AT + 0.12));
  const unit = F.s;
  const fontSize = Math.round(unit * 8.6);
  const pad = unit * 4;
  g.save();
  g.font = `${fontSize}px VT323, ui-monospace, monospace`;
  // quebra em duas linhas fixas (o balão não pula enquanto digita)
  const lines = ['Senta, menino.', 'A mesa tá posta.'];
  const widths = lines.map((l) => g.measureText(l).width);
  const bw = Math.max(...widths) + pad * 2;
  const bh = fontSize * 2.05 + pad * 1.6;
  const [mx, my] = cam.toScreen(TIO.x + 24, TIO.y + 2);
  const x = Math.max(unit * 6, Math.min(F.W - bw - unit * 6, mx - bw * 0.62));
  const y = my - bh - unit * 12;
  g.translate(x + bw / 2, y + bh);
  g.scale(0.85 + 0.15 * appear, 0.85 + 0.15 * appear);
  g.translate(-(x + bw / 2), -(y + bh));
  g.globalAlpha = appear;
  // Versão 2.3: o balão de papel da mesa (pautado, borda de tinta marrom, sombra embaixo)
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(x + unit, y + unit * 2.5, bw, bh);
  g.fillStyle = '#eadcbc';
  g.fillRect(x, y, bw, bh);
  g.fillStyle = 'rgba(120,90,50,0.14)';
  for (let ly = y + pad * 0.7 + fontSize * 0.98; ly < y + bh - 2; ly += fontSize) g.fillRect(x + unit, ly, bw - unit * 2, Math.max(1, unit * 0.45));
  g.strokeStyle = '#4a3418';
  g.lineWidth = Math.max(1.5, unit * 0.9);
  g.strokeRect(x, y, bw, bh);
  // rabicho em degraus apontando para a boca
  const tx = Math.min(x + bw - unit * 8, Math.max(x + unit * 8, mx));
  g.fillStyle = '#4a3418';
  for (let i = 0; i < 4; i += 1) g.fillRect(tx - unit * (4 - i), y + bh + unit * i * 1.2, unit * (8 - i * 2), unit * 1.3);
  g.fillStyle = '#eadcbc';
  for (let i = 0; i < 3; i += 1) g.fillRect(tx - unit * (3 - i), y + bh - unit * 0.5 + unit * i * 1.2, unit * (6 - i * 2), unit * 1.2);
  // nome
  g.font = `${Math.round(unit * 4.6)}px "Press Start 2P", monospace`;
  g.fillStyle = '#1a0a03';
  g.fillText('TIO ZÉ', x + pad * 0.6 + unit * 0.5, y - unit * 1.7);
  g.fillStyle = '#ffd36b';
  g.fillText('TIO ZÉ', x + pad * 0.6, y - unit * 2.2);
  // texto digitado
  g.font = `${fontSize}px VT323, ui-monospace, monospace`;
  g.fillStyle = '#2a1a0a';
  g.textBaseline = 'top';
  let left = typed;
  lines.forEach((l, i) => {
    const part = l.slice(0, Math.max(0, left));
    left -= l.length + 1;
    g.fillText(part, x + pad, y + pad * 0.7 + i * fontSize * 1.0);
  });
  g.restore();
}
