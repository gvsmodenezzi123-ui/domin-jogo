// Cena 3: dentro do boteco. A câmera entra pela porta e desliza até a mesa: o Valtinho no
// balcão (com a estufa de salgados e o vidro de ovo colorido), as garrafas, a placa FIADO SÓ
// AMANHÃ, o relógio marcando 1h47, o rádio tocando, o retrato do Comendador, as fotos do Tonho,
// da Cida e do Beto e a TV no canto. Debaixo da lâmpada, na fumaça, o Tio Zé ergue os olhos:
// "Senta, menino. A mesa tá posta." — e levanta a bucha de seis.
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
const TIO = { x: 117, y: 183 };
const VALTINHO = { x: 18, y: 103 };

// ---------------------------------------------------------------------------------

function backArt(sprites) {
  const c = makeCanvas(BACK.w, BACK.h);
  const g = pix(c);
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
  // o retrato do Comendador na parede, em moldura dourada
  rect(g, 136, 30, 44, 44, '#7a5418');
  rect(g, 136, 30, 44, 1, '#e2b84a');
  rect(g, 136, 30, 1, 44, '#c8962e');
  rect(g, 179, 30, 1, 44, '#4a3008');
  rect(g, 136, 73, 44, 1, '#4a3008');
  g.drawImage(sprites.comendador, 138, 32);
  rect(g, 148, 76, 20, 5, '#c8962e');
  rect(g, 149, 77, 18, 3, '#6a4a14');
  // mural de fotos (Tonho, Cida, Beto) com percevejo vermelho
  sprites.photos.forEach((photo, i) => {
    const px = 104 + i * 11;
    const py = 88 + (i % 2) * 5;
    rect(g, px, py, 14, 17, '#e9e2d0');
    rect(g, px, py + 16, 14, 1, '#a89e88');
    g.save();
    g.imageSmoothingEnabled = true;
    g.drawImage(photo, 4, 4, 32, 32, px + 1, py + 1, 12, 12);
    g.restore();
    rect(g, px + 6, py - 1, 2, 2, '#c8261d');
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

  // ---- a mesa de feltro verde debaixo da lâmpada
  poly(
    g,
    [
      [92, 222],
      [186, 222],
      [194, 250],
      [84, 250],
    ],
    '#5a341a',
  );
  poly(
    g,
    [
      [95, 224],
      [183, 224],
      [190, 248],
      [88, 248],
    ],
    '#2f5a3c',
  );
  // feltro: miolo mais claro e a textura
  for (let i = 0; i < 260; i += 1) {
    const x = 92 + hash(i, 31) * 96;
    const y = 225 + hash(i, 32) * 22;
    rect(g, x, y, 1, 1, hash(i, 33) > 0.5 ? '#36654a' : '#284f34');
  }
  rect(g, 84, 250, 110, 9, '#4a2a14');
  rect(g, 84, 250, 110, 1, '#6e4222');
  rect(g, 90, 259, 5, 50, '#3a2010');
  rect(g, 183, 259, 5, 50, '#2a170a');
  // pedras na mesa: a fileira deitada [2|4][4|6] e o monte de compra
  const tileFlat = (x, y, a, b) => {
    rect(g, x, y + 1, 14, 5, '#1a1208');
    rect(g, x, y, 14, 5, '#efe6cf');
    rect(g, x, y, 14, 1, '#fffaf0');
    rect(g, x + 7, y, 1, 5, '#8a7a5a');
    const pip = (px, py) => rect(g, px, py, 1, 1, '#2a1d14');
    const face = (ox, n) => {
      const P = {
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
      }[n];
      for (const [px, py] of P) pip(x + ox + px, y + py);
    };
    face(0, a);
    face(7, b);
  };
  tileFlat(106, 239, 2, 4);
  tileFlat(121, 239, 4, 6);
  for (let i = 0; i < 6; i += 1) {
    const x = 160 + (i % 3) * 7 + Math.floor(hash(i, 41) * 2);
    const y = 228 + Math.floor(i / 3) * 6;
    rect(g, x, y + 1, 6, 4, '#120c06');
    rect(g, x, y, 6, 4, '#2a1a12');
    rect(g, x, y, 6, 1, '#4a3424');
    rect(g, x + 2, y + 1, 2, 2, '#7a5a3a');
  }
  // apostas: tampinhas e moedas na beira
  for (const [x, y, col] of [
    [96, 244, '#c8a23a'],
    [100, 246, '#c8382e'],
    [93, 247, '#c8a23a'],
    [168, 244, '#d8b84a'],
    [172, 246, '#c8382e'],
  ]) {
    ellipse(g, x, y, 2, 1.2, col);
    rect(g, x - 1, y - 1, 1, 1, '#fff0b0');
  }
  // copo americano de cerveja e a garrafa
  rect(g, 95, 214, 6, 10, '#7a6a3a');
  rect(g, 95, 214, 6, 2, '#f4efe2');
  rect(g, 96, 217, 4, 7, '#d89a2a');
  rect(g, 96, 218, 1, 5, '#f8d27a');
  rect(g, 95, 222, 6, 1, '#a8701e');
  rect(g, 103, 200, 5, 22, '#4a2a0e');
  rect(g, 104, 194, 3, 6, '#4a2a0e');
  rect(g, 104, 193, 3, 1, '#c8a23a');
  rect(g, 103, 208, 5, 6, '#d8c89a');
  rect(g, 104, 202, 1, 18, '#8a5a24');
  // cinzeiro
  ellipse(g, 176, 226, 6, 2, '#5a5e66');
  ellipse(g, 176, 225.5, 4.5, 1.3, '#2a2c30');
  return c;
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

const SUIT = '#1c1917';
const SUIT_LIT = '#3a3530';
const SKIN = '#c8895a';
const SKIN_DARK = '#a46d42';
const SKIN_LIT = '#e8b080';

/** Manga do paletó de (x0,y0) a (x1,y1), grossa, com a luz da lâmpada na beira de cima. */
function sleeve(g, x0, y0, x1, y1, w) {
  line(g, x0, y0, x1, y1, SUIT, w);
  line(g, x0, y0, x1, y1 - 1, SUIT_LIT, 1);
}

function handAt(g, x, y) {
  rect(g, x - 1, y - 1, 2, 5, '#e7e5e4');
  rect(g, x + 1, y, 6, 5, SKIN);
  rect(g, x + 1, y, 6, 1, SKIN_LIT);
  rect(g, x + 6, y + 1, 1, 4, SKIN_DARK);
  rect(g, x + 2, y + 4, 4, 1, SKIN_DARK);
  rect(g, x + 3, y + 1, 1, 3, SKIN_DARK);
}

/** O Tio Zé à mesa: cadeira atrás, retrato do jogo, as pedras dele em pé e os braços apoiados. */
function drawTio(g, sprite, breathe, raise) {
  const { x, y } = TIO;
  // encosto da cadeira dele aparecendo dos lados
  rect(g, x + 2, y + 8, 3, 32, '#3a200e');
  rect(g, x + 35, y + 8, 3, 32, '#3a200e');
  rect(g, x + 1, y + 7, 38, 3, '#4a2a14');
  rect(g, x + 1, y + 7, 38, 1, '#7a4a26');
  g.drawImage(sprite, x, y - breathe);
  // as pedras dele em pé (vemos as costas)
  for (let i = 0; i < 5; i += 1) {
    const tx = x + 11 + i * 4;
    rect(g, tx, y + 44, 4, 9, '#2a1a12');
    rect(g, tx, y + 44, 4, 1, '#5a4030');
    rect(g, tx, y + 44, 1, 9, '#3e2a1c');
    rect(g, tx + 1, y + 48, 2, 1, '#6a5038');
  }
  // braço do lado esquerdo da tela: ombro → cotovelo → mão nas pedras
  sleeve(g, x + 9, y + 34, x + 5, y + 48, 6);
  sleeve(g, x + 5, y + 48, x + 10, y + 52, 5);
  handAt(g, x + 10, y + 49);
  // o outro: em repouso, ou erguendo a bucha [6|6] mostrando as pintas
  const ex = x + 36;
  const ey = y + 48;
  sleeve(g, x + 31, y + 34, ex, ey, 6);
  const hx = Math.round(x + 25 + raise * 14);
  const hy = Math.round(y + 51 - raise * 30);
  sleeve(g, ex, ey, hx + 3, hy + 3, 5);
  if (raise > 0.05) {
    const tx = hx;
    const ty = hy - 13;
    rect(g, tx, ty, 7, 14, '#f4ecd8');
    rect(g, tx, ty, 7, 1, '#ffffff');
    rect(g, tx + 6, ty, 1, 14, '#c4b590');
    rect(g, tx + 1, ty + 7, 5, 1, '#8a7a5a');
    for (const [px, py] of [
      [1, 1],
      [1, 3],
      [1, 5],
      [4, 1],
      [4, 3],
      [4, 5],
      [1, 8],
      [1, 10],
      [1, 12],
      [4, 8],
      [4, 10],
      [4, 12],
    ])
      rect(g, tx + px, ty + py, 2, 1, '#2a1d14');
  }
  handAt(g, hx, hy);
}

export function buildBar(sprites) {
  const back = backArt(sprites);
  const backBlur = boxBlur(copyCanvas(back), 1.6, 3);
  const mid = midArt();
  const front = frontArt();
  const frontBlur = boxBlur(copyCanvas(front, 4), 2, 3);
  const frame = makeCanvas(MID.w, MID.h);
  const valtinho = { open: tint(sprites.valtinho.open, '#ffd8a8', 0.35), blink: tint(sprites.valtinho.blink, '#ffd8a8', 0.35) };
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
    if (t < LOOK_AT) return sprites.tio.idle;
    const typed = Math.floor((t - SPEECH_AT) / SPEECH_CHAR);
    if (t >= SPEECH_AT && typed < SPEECH.length) {
      const ch = SPEECH[typed] ?? ' ';
      if (!' .,'.includes(ch) && typed % 2 === 0) return sprites.tio.talk;
    }
    return sprites.tio.smug;
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
    // Valtinho atrás do balcão, pano no copo
    const vBlink = (t > 0.55 && t < 0.66) || (t > 2.1 && t < 2.2);
    g.save();
    g.beginPath();
    g.rect(-50, -50, 280, 200);
    g.clip();
    g.drawImage(vBlink ? valtinho.blink : valtinho.open, VALTINHO.x, VALTINHO.y);
    g.restore();
    const wipe = t * 7;
    rect(g, 36 + Math.round(Math.cos(wipe) * 2), 138 + Math.round(Math.sin(wipe) * 1), 6, 8, '#7a8e94');
    rect(g, 36 + Math.round(Math.cos(wipe) * 2), 138 + Math.round(Math.sin(wipe) * 1), 6, 1, '#c8dadf');
    rect(g, 34 + Math.round(Math.cos(wipe + 1) * 3), 142 + Math.round(Math.sin(wipe + 1) * 2), 5, 4, '#e8e2d2');
    // Tio Zé (respirando), a cadeira dele, as pedras em pé e os braços na mesa
    const breathe = Math.round(Math.sin(t * 2.6) * 0.5 + 0.5);
    const raise = easeOut(span(t, RAISE_AT, RAISE_AT + 0.4));
    drawTio(g, tioSprite(t), breathe, raise);
    // fumaça do cigarro dele
    drawSmoke(g, t, TIO.x + 36, TIO.y + 26 - breathe);
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
      cam.blit(out, back, BACK.ox, BACK.oy, BACK.depth);
      cam.blit(out, backBlur, BACK.ox, BACK.oy, BACK.depth, focus * 0.85);
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

/** Balão de fala igual ao da mesa (veludo escuro, borda de osso/âmbar), com a fala letra a letra. */
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
  const [mx, my] = cam.toScreen(TIO.x + 20, TIO.y + 2);
  const x = Math.max(unit * 6, Math.min(F.W - bw - unit * 6, mx - bw * 0.62));
  const y = my - bh - unit * 12;
  g.translate(x + bw / 2, y + bh);
  g.scale(0.85 + 0.15 * appear, 0.85 + 0.15 * appear);
  g.translate(-(x + bw / 2), -(y + bh));
  g.globalAlpha = appear;
  // sombra, fundo, borda
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(x, y + unit * 2, bw, bh);
  g.fillStyle = 'rgba(24,24,27,0.95)';
  g.fillRect(x, y, bw, bh);
  g.strokeStyle = '#d9b56a';
  g.lineWidth = Math.max(1.5, unit * 0.7);
  g.strokeRect(x, y, bw, bh);
  // rabicho em degraus apontando para a boca
  const tx = Math.min(x + bw - unit * 8, Math.max(x + unit * 8, mx));
  g.fillStyle = '#d9b56a';
  for (let i = 0; i < 4; i += 1) g.fillRect(tx - unit * (4 - i), y + bh + unit * i * 1.2, unit * (8 - i * 2), unit * 1.3);
  g.fillStyle = '#18181b';
  for (let i = 0; i < 3; i += 1) g.fillRect(tx - unit * (3 - i), y + bh - unit * 0.3 + unit * i * 1.2, unit * (6 - i * 2), unit * 1.2);
  // nome
  g.font = `${Math.round(unit * 4.6)}px "Press Start 2P", monospace`;
  g.fillStyle = '#e9b44a';
  g.fillText('TIO ZÉ', x + pad * 0.6, y - unit * 2.2);
  // texto digitado
  g.font = `${fontSize}px VT323, ui-monospace, monospace`;
  g.fillStyle = '#f4ecd2';
  g.textBaseline = 'top';
  let left = typed;
  lines.forEach((l, i) => {
    const part = l.slice(0, Math.max(0, left));
    left -= l.length + 1;
    g.fillText(part, x + pad, y + pad * 0.7 + i * fontSize * 1.0);
  });
  g.restore();
}
