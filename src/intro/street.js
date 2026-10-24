// Cena 1: a rua, 1h47 da madrugada, chovendo. A gente vem andando na direção do boteco: o neon
// BUXARIA acorda piscando e se espelha no asfalto molhado, o Seu Tião joga a moeda sentado no
// engradado, os olhos vermelhos do Corvo aparecem na janela escura de cima, a lousa anuncia o
// dominó de hoje e a luz quente vaza pela cortina de fitas da porta.
import { WORD_D } from '../components/logoShape.js';
import {
  bands,
  boxBlur,
  clamp,
  copyCanvas,
  easeInOut,
  ellipse,
  hardAlpha,
  hash,
  line,
  makeCanvas,
  mix,
  outline,
  pix,
  rect,
  smooth,
  span,
  text5,
  text5Width,
  tint,
  wobble,
} from './core.js';
import { beam, glow, glowEllipse, makeCamera, vignette, withRoll, fill } from './stage.js';

// Camadas (em pixels de arte, no mundo da cena)
const SKY = { ox: -70, oy: -90, w: 320, h: 300, depth: 6 };
const HILL = { ox: -70, oy: 40, w: 320, h: 200, depth: 2.6 };
const MAIN = { ox: -40, oy: 30, w: 260, h: 350, depth: 1 };
const POST = { ox: -14, oy: 30, w: 56, h: 360, depth: 0.74 };

/** Onde o chão encontra a fachada (linha do espelho dos reflexos). */
const GROUND = 262;
/** Porta (vão da cortina de fitas). */
const DOOR = { x: 71, y: 203, w: 38, h: 59 };
/** Letreiro (painel). */
const SIGN = { x: 24, y: 150, w: 132, h: 30 };
/** Onde o tubo de neon fica (canto do canvas do tubo). */
const NEON_AT = { x: 31, y: 153 };
const TIAO_AT = { x: 110, y: 220 };
const CORVO_AT = { x: 105, y: 84 };
const CORVO_WINDOW = { x: 120, y: 87, w: 16, h: 38 };

const STRIP_COLORS = ['#e2493b', '#f3c13a', '#43b46e', '#4d84dc'];
const FLAG_COLORS = ['#b8332b', '#d9aa2c', '#33894a', '#3863b0', '#c9c1b0'];

// ---------------------------------------------------------------------------------
// tempo da cena (s, a partir do fim da tela preta)
export const STREET_END = 2.55;

/** Intensidade do neon: apagado, acorda piscando e depois só tremeluz. */
export function neonLevel(t) {
  if (t < 0.52) return 0;
  const seq = [
    [0.52, 1],
    [0.58, 0],
    [0.66, 1],
    [0.7, 0.15],
    [0.78, 1],
  ];
  let v = 0;
  for (const [at, level] of seq) if (t >= at) v = level;
  // tremulação leve depois de aceso
  if (t > 0.8) v = 0.9 + wobble(t * 9, 5) * 0.08 - (hash(Math.floor(t * 20), 9) > 0.97 ? 0.4 : 0);
  return clamp(v);
}

/** Relâmpago: um clarão forte no começo e um eco curto. */
export function lightning(t) {
  const a = t >= 0.08 && t < 0.2 ? 1 - (t - 0.08) / 0.12 : 0;
  const b = t >= 0.32 && t < 0.38 ? 0.6 * (1 - (t - 0.32) / 0.06) : 0;
  return Math.max(a, b);
}

// ---------------------------------------------------------------------------------
// Arte fixa

function skyArt(flash) {
  const c = makeCanvas(SKY.w, SKY.h);
  const g = pix(c);
  g.translate(-SKY.ox, -SKY.oy);
  const stops = flash
    ? [
        [-90, '#191c3c'],
        [40, '#383a74'],
        [130, '#6a62a6'],
        [210, '#7d6fae'],
      ]
    : [
        [-90, '#03050d'],
        [30, '#090e22'],
        [120, '#171a3a'],
        [210, '#2c2449'],
      ];
  bands(g, SKY.ox, SKY.w, stops);
  // estrelas
  for (let i = 0; i < 70; i += 1) {
    const x = SKY.ox + Math.floor(hash(i, 1) * SKY.w);
    const y = SKY.oy + Math.floor(hash(i, 2) * 170);
    const c1 = hash(i, 3) > 0.8 ? '#a9b0e0' : '#4d557f';
    rect(g, x, y, 1, 1, flash ? '#b9b8ea' : c1);
    if (hash(i, 4) > 0.94 && !flash) {
      rect(g, x - 1, y, 1, 1, '#2c3256');
      rect(g, x + 1, y, 1, 1, '#2c3256');
      rect(g, x, y - 1, 1, 1, '#2c3256');
      rect(g, x, y + 1, 1, 1, '#2c3256');
    }
  }
  // lua
  const mx = 150;
  const my = 20;
  ellipse(g, mx, my, 8.5, 8.5, flash ? '#fbf8ea' : '#e8e1c4');
  ellipse(g, mx - 2.5, my + 2, 6.5, 6.5, flash ? '#efe9d4' : '#cbc3a2');
  ellipse(g, mx + 1, my - 1, 6, 6, flash ? '#fbf8ea' : '#e8e1c4');
  for (const [x, y, r] of [
    [mx - 3, my - 3, 1.6],
    [mx + 3, my + 2, 1.2],
    [mx - 1, my + 4, 1],
    [mx + 4, my - 4, 0.9],
  ])
    ellipse(g, x, y, r, r, flash ? '#ddd6bd' : '#c2ba98');
  // nuvens: corpo escuro e borda de cima iluminada pela lua
  const cloud = (x, y, w, h) => {
    const parts = Math.max(3, Math.round(w / 9));
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < parts; i += 1) {
        const px = x + (i / (parts - 1)) * w;
        const py = y + Math.sin(i * 1.7 + x) * h * 0.25;
        const rx = w / parts + 4 + hash(i, x) * 6;
        const ry = h * (0.55 + hash(i, y) * 0.45);
        if (pass === 0) ellipse(g, px, py - 1, rx, ry, flash ? '#c9c3f0' : '#2a3158');
        else ellipse(g, px, py + 0.5, rx, ry, flash ? '#3d4278' : '#11152b');
      }
    }
  };
  cloud(-60, 42, 90, 9);
  cloud(40, 28, 70, 6);
  cloud(128, 31, 60, 5);
  cloud(170, 64, 80, 10);
  cloud(-30, 96, 120, 10);
  cloud(110, 104, 110, 9);
  if (flash) {
    // o raio
    let x = 56;
    let y = -90;
    const pts = [[x, y]];
    let i = 0;
    while (y < 118) {
      y += 6 + hash(i, 11) * 8;
      x += (hash(i, 12) - 0.5) * 12;
      pts.push([x, y]);
      i += 1;
    }
    for (let k = 1; k < pts.length; k += 1) {
      line(g, pts[k - 1][0] - 1, pts[k - 1][1], pts[k][0] - 1, pts[k][1], '#8d86ea');
      line(g, pts[k - 1][0] + 1, pts[k - 1][1], pts[k][0] + 1, pts[k][1], '#8d86ea');
    }
    for (let k = 1; k < pts.length; k += 1) line(g, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], '#ffffff');
    // galho
    let bx = pts[4][0];
    let by = pts[4][1];
    for (let k = 0; k < 6; k += 1) {
      const nx = bx + 4 + hash(k, 13) * 4;
      const ny = by + 5 + hash(k, 14) * 5;
      line(g, bx, by, nx, ny, '#dcd8ff');
      bx = nx;
      by = ny;
    }
  }
  return c;
}

function hillArt() {
  const c = makeCanvas(HILL.w, HILL.h);
  const g = pix(c);
  g.translate(-HILL.ox, -HILL.oy);
  // o morro da direita e o da esquerda, com as casinhas de luz acesa (a favela de madrugada)
  const ridge = (x) => {
    const right = 66 + ((x - 205) / 70) ** 2 * 30;
    const left = 92 + ((x + 18) / 46) ** 2 * 30;
    return Math.min(right, left, 150);
  };
  for (let x = HILL.ox; x < HILL.ox + HILL.w; x += 1) {
    const top = Math.round(ridge(x));
    rect(g, x, top, 1, HILL.oy + HILL.h - top, '#0a0c1b');
    rect(g, x, top, 1, 1, '#151933');
  }
  // casinhas empilhadas
  for (let i = 0; i < 420; i += 1) {
    const x = HILL.ox + Math.floor(hash(i, 21) * HILL.w);
    const top = ridge(x);
    const y = Math.floor(top + 2 + hash(i, 22) * 70);
    if (y > 200) continue;
    const w = 3 + Math.floor(hash(i, 23) * 4);
    const h = 2 + Math.floor(hash(i, 24) * 3);
    rect(g, x, y, w, h, hash(i, 25) > 0.5 ? '#10142a' : '#0d1022');
    rect(g, x, y, w, 1, '#171c38');
    if (hash(i, 26) > 0.55) {
      const lx = x + 1 + Math.floor(hash(i, 27) * (w - 2));
      const warm = hash(i, 28);
      rect(g, lx, y + 1, 1, 1, warm > 0.85 ? '#9fb2ff' : warm > 0.4 ? '#f2c063' : '#d98a3c');
    }
  }
  return c;
}

/** Pedra portuguesa em ondas (a calçada de Copacabana, aqui no bairro). */
function waveStone(x, y) {
  const band = Math.floor((y * 1.6 + Math.sin(x / 7.5) * 4.5) / 4);
  return band % 2 === 0;
}

function azulejo(g, x0, y0, w, h, dim = 1) {
  const base = mix('#1b2847', '#0e1528', 1 - dim);
  const motif = mix('#5a78ad', '#24345a', 1 - dim);
  const grout = '#0c1220';
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const tx = (x - x0) % 6;
      const ty = (y - y0) % 6;
      let col = base;
      if (tx === 0 || ty === 0) col = grout;
      else if ((tx === 3 && ty !== 0) || (ty === 3 && tx !== 0)) col = (tx === 3 && ty === 3) || hash(x * 7 + y, 31) > 0.25 ? motif : base;
      else if ((tx === 1 || tx === 5) && (ty === 1 || ty === 5)) col = motif;
      rect(g, x, y, 1, 1, col);
    }
  }
}

/** A fachada inteira, a calçada e a rua (sem nada que acenda). */
function mainArt(sprites) {
  const c = makeCanvas(MAIN.w, MAIN.h);
  const g = pix(c);
  g.translate(-MAIN.ox, -MAIN.oy);

  // ---- vizinho da esquerda (sobrado mais baixo, porta fechada e janela gradeada)
  rect(g, -40, 112, 58, GROUND - 112, '#1c1d2c');
  rect(g, -40, 112, 58, 3, '#2a2c40');
  rect(g, -40, 115, 58, 1, '#121320');
  for (let i = 0; i < 260; i += 1) rect(g, -40 + hash(i, 41) * 58, 116 + hash(i, 42) * 146, 1, 1, hash(i, 43) > 0.5 ? '#232538' : '#16172a');
  rect(g, -30, 140, 22, 30, '#0b0c14');
  for (let x = -29; x < -8; x += 3) rect(g, x, 140, 1, 30, '#2b2d40');
  rect(g, -32, 170, 26, 2, '#2e3044');
  rect(g, -26, 196, 24, 66, '#151622');
  rect(g, -26, 196, 24, 1, '#262839');
  for (let y = 200; y < 260; y += 4) rect(g, -25, y, 22, 1, '#1b1c2b');
  // ---- vizinho da direita (lojinha com porta de aço pichada e a caixa d'água no telhado)
  rect(g, 162, 150, 60, GROUND - 150, '#1a1f2b');
  rect(g, 162, 150, 60, 3, '#283043');
  rect(g, 182, 136, 18, 14, '#25427a');
  rect(g, 182, 136, 18, 2, '#3a5c9c');
  rect(g, 181, 138, 20, 1, '#1a2f5a');
  rect(g, 184, 132, 14, 4, '#2c4c88');
  rect(g, 168, 182, 50, 80, '#252a33');
  for (let y = 182; y < 262; y += 3) rect(g, 168, y, 50, 1, '#1b1f27');
  // pichação (riscos coloridos apagados)
  const tag = [
    [172, 214, 180, 206],
    [180, 206, 186, 216],
    [188, 212, 196, 204],
    [196, 204, 200, 216],
    [204, 210, 214, 208],
  ];
  for (const [x0, y0, x1, y1] of tag) line(g, x0, y0, x1, y1, '#5a3a6a');
  line(g, 172, 222, 212, 220, '#3a5a4a');
  rect(g, 162, 178, 60, 4, '#2c1d1a');

  // ---- o boteco: sobrado de dois andares, fachada verde-azulada descascando
  const F0 = 18;
  const F1 = 162;
  bands(g, F0, F1 - F0, [
    [60, '#2b4148'],
    [150, '#22363d'],
    [GROUND, '#1d2f35'],
  ]);
  // textura do reboco
  for (let i = 0; i < 900; i += 1) {
    const x = F0 + Math.floor(hash(i, 51) * (F1 - F0));
    const y = 66 + Math.floor(hash(i, 52) * (GROUND - 66));
    rect(g, x, y, 1, 1, hash(i, 53) > 0.5 ? '#2c444b' : '#1a2a2f');
  }
  // manchas de chuva escorrendo
  for (let i = 0; i < 26; i += 1) {
    const x = F0 + Math.floor(hash(i, 54) * (F1 - F0));
    const y = 68 + Math.floor(hash(i, 55) * 60);
    rect(g, x, y, 1, 10 + Math.floor(hash(i, 56) * 40), '#1a2a30');
  }
  // reboco caído mostrando o tijolo
  const bricks = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        const edge = Math.hypot((x - x0 - w / 2) / (w / 2), (y - y0 - h / 2) / (h / 2));
        if (edge > 1 - hash(x * 3 + y, 57) * 0.25) continue;
        const row = Math.floor((y - y0) / 2);
        const mortar = (y - y0) % 2 === 1 || (x - x0 + (row % 2) * 2) % 5 === 0;
        rect(g, x, y, 1, 1, mortar ? '#2b2224' : hash(x + y * 9, 58) > 0.5 ? '#5c3530' : '#4a2b28');
      }
    }
  };
  bricks(72, 96, 16, 11);
  bricks(140, 192, 12, 8);
  bricks(22, 236, 6, 8);
  // pilastras
  for (const px of [F0, F1 - 5]) {
    rect(g, px, 64, 5, GROUND - 64, '#2a4047');
    rect(g, px, 64, 1, GROUND - 64, '#37525a');
    rect(g, px + 4, 64, 1, GROUND - 64, '#16232a');
  }
  // platibanda com frontão e o ano
  rect(g, F0 - 2, 58, F1 - F0 + 4, 7, '#2f474e');
  rect(g, F0 - 2, 58, F1 - F0 + 4, 1, '#48656e');
  rect(g, F0 - 2, 64, F1 - F0 + 4, 1, '#132026');
  for (let y = 0; y < 8; y += 1) rect(g, 90 - 16 + y * 2, 50 + y, 32 - y * 4, 1, y === 0 ? '#48656e' : '#2f474e');
  rect(g, 74, 57, 32, 1, '#2f474e');
  text5(g, '1958', 82, 51, '#1a2a30');
  // faixa entre os andares
  rect(g, F0, 146, F1 - F0, 4, '#2f474e');
  rect(g, F0, 146, F1 - F0, 1, '#45626a');
  rect(g, F0, 149, F1 - F0, 1, '#142127');

  // ---- janelas de cima
  const shutter = (x, y, w, h) => {
    rect(g, x, y, w, h, '#2c4a34');
    rect(g, x, y, 1, h, '#3d6346');
    rect(g, x + w - 1, y, 1, h, '#1b2e21');
    for (let yy = y + 2; yy < y + h - 1; yy += 2) rect(g, x + 1, yy, w - 2, 1, '#1f3526');
  };
  const windowFrame = (x, y, w, h) => {
    rect(g, x, y, w, h, '#120d0b');
    rect(g, x + 1, y + 1, w - 2, h - 2, '#4a3424');
    rect(g, x + 3, y + 3, w - 6, h - 6, '#07080d');
    rect(g, x - 2, y + h, w + 4, 3, '#4b5b60');
    rect(g, x - 2, y + h, w + 4, 1, '#62767c');
    rect(g, x - 2, y + h + 3, w + 4, 1, '#111a1e');
  };
  // esquerda: acesa, cortina e o gato no peitoril
  windowFrame(34, 84, 28, 44);
  shutter(26, 84, 8, 44);
  shutter(62, 84, 8, 44);
  // direita: escura, uma folha meio fechada (o Corvo espia pela fresta)
  windowFrame(118, 84, 28, 44);
  shutter(110, 84, 8, 44);
  // o ar-condicionado velho pingando
  rect(g, 40, 133, 17, 9, '#3d454b');
  rect(g, 40, 133, 17, 1, '#56616a');
  for (let x = 42; x < 55; x += 2) rect(g, x, 135, 1, 5, '#262c31');
  rect(g, 40, 141, 17, 1, '#1d2226');
  // vaso no peitoril da esquerda
  rect(g, 37, 124, 5, 4, '#6a3a26');
  for (let i = 0; i < 9; i += 1) rect(g, 36 + hash(i, 61) * 7, 118 + hash(i, 62) * 6, 1, 2, hash(i, 63) > 0.5 ? '#2f5a2c' : '#3e7a36');

  // ---- letreiro (painel; o neon acende por cima)
  rect(g, 34, 147, 2, 4, '#15161c');
  rect(g, 144, 147, 2, 4, '#15161c');
  rect(g, SIGN.x, SIGN.y, SIGN.w, SIGN.h, '#2b1d18');
  rect(g, SIGN.x, SIGN.y, SIGN.w, 1, '#41302a');
  rect(g, SIGN.x + 2, SIGN.y + 2, SIGN.w - 4, SIGN.h - 4, '#100a0b');
  for (const [x, y] of [
    [SIGN.x + 1, SIGN.y + 1],
    [SIGN.x + SIGN.w - 2, SIGN.y + 1],
    [SIGN.x + 1, SIGN.y + SIGN.h - 2],
    [SIGN.x + SIGN.w - 2, SIGN.y + SIGN.h - 2],
  ])
    rect(g, x, y, 1, 1, '#5a463a');
  rect(g, SIGN.x, SIGN.y + SIGN.h, SIGN.w, 2, '#0f181b');

  // ---- térreo: balcão-janela, porta de aço, azulejo, cartaz, número
  // azulejo da barra de baixo
  azulejo(g, F0 + 5, 232, 70 - F0 - 5, GROUND - 232);
  azulejo(g, 112, 222, F1 - 5 - 112, GROUND - 222);
  rect(g, F0 + 5, 231, 70 - F0 - 5, 1, '#2f474e');
  rect(g, 112, 221, F1 - 5 - 112, 1, '#2f474e');
  // balcão-janela (por dentro: prateleira com garrafas; o ABERTO pendurado acende depois)
  rect(g, 27, 189, 37, 41, '#15171d');
  rect(g, 29, 191, 33, 37, '#3a2414');
  rect(g, 29, 210, 33, 2, '#24150c');
  rect(g, 29, 221, 33, 2, '#24150c');
  for (let i = 0; i < 11; i += 1) {
    const bx = 30 + i * 3;
    const tall = 5 + Math.floor(hash(i, 71) * 4);
    const col = ['#5a3a14', '#2e4a26', '#6a2a1c', '#4a4a3a'][i % 4];
    rect(g, bx, 210 - tall, 2, tall, col);
    rect(g, bx, 210 - tall - 2, 1, 2, col);
    if (i % 2 === 0) rect(g, bx, 221 - 6, 2, 6, ['#5a3a14', '#2e4a26'][i % 3 === 0 ? 0 : 1]);
  }
  rect(g, 25, 228, 41, 4, '#4f525a');
  rect(g, 25, 228, 41, 1, '#6c707a');
  rect(g, 25, 232, 41, 1, '#191b20');
  // porta: batente, caixa da porta de aço, aço enrolado até a metade
  rect(g, 68, 182, 44, GROUND - 182, '#1a1d23');
  rect(g, 70, 184, 40, 6, '#3d424a');
  rect(g, 70, 189, 40, 1, '#262a31');
  for (let y = 190; y < 201; y += 2) {
    rect(g, 70, y, 40, 1, '#4f555e');
    rect(g, 70, y + 1, 40, 1, '#2d3138');
  }
  rect(g, 70, 201, 40, 2, '#6b717b');
  rect(g, 80, 201, 3, 2, '#9aa0aa');
  rect(g, 97, 201, 3, 2, '#9aa0aa');
  rect(g, 69, 260, 42, 2, '#4a4a54');
  // placa de número esmaltada (147)
  rect(g, 113, 196, 13, 8, '#c7cfdc');
  rect(g, 114, 197, 11, 6, '#183c7a');
  text5(g, '147', 114, 197, '#c7cfdc', 0);
  // cartaz lambe-lambe do torneio
  rect(g, 128, 189, 26, 27, '#6d6352');
  rect(g, 128, 189, 26, 1, '#80765f');
  for (let i = 0; i < 4; i += 1) rect(g, 150 + i, 189, 4 - i, 1 + i, '#22363d');
  text5(g, 'DOMINÓ', 129, 193, '#2a1d14');
  rect(g, 135, 200, 12, 6, '#e9dfc4');
  rect(g, 141, 200, 1, 6, '#2a1d14');
  for (const [x, y] of [
    [137, 202],
    [138, 203],
    [136, 201],
    [143, 201],
    [145, 201],
    [143, 204],
    [145, 204],
  ])
    rect(g, x, y, 1, 1, '#2a1d14');
  text5(g, '22H', 135, 209, '#7a2a1c');
  for (let i = 0; i < 18; i += 1) rect(g, 128 + hash(i, 81) * 26, 189 + hash(i, 82) * 27, 1, 2, '#5a5244');
  // cano da calha descendo pela pilastra
  rect(g, 157, 66, 3, GROUND - 68, '#28323a');
  rect(g, 157, 66, 1, GROUND - 68, '#3a4850');
  for (let y = 90; y < GROUND; y += 40) rect(g, 156, y, 5, 2, '#1c242a');

  // ---- calçada de pedra portuguesa, meio-fio, sarjeta e asfalto
  for (let y = GROUND; y < 286; y += 1) {
    for (let x = -40; x < 220; x += 1) {
      const white = waveStone(x, y);
      let col = white ? '#33333f' : '#15151c';
      if (hash(x * 13 + y * 7, 91) > 0.9) col = white ? '#2a2a35' : '#1c1c25';
      rect(g, x, y, 1, 1, col);
    }
  }
  rect(g, -40, GROUND, 260, 1, '#0c0c12');
  rect(g, -40, 286, 260, 2, '#5d5d69');
  rect(g, -40, 286, 260, 1, '#73737f');
  rect(g, -40, 288, 260, 4, '#34343e');
  rect(g, -40, 292, 260, 2, '#07080d');
  for (let y = 294; y < 380; y += 1) {
    for (let x = -40; x < 220; x += 1) {
      const n = hash(x * 31 + y * 17, 92);
      rect(g, x, y, 1, 1, n > 0.86 ? '#141724' : n < 0.1 ? '#08090f' : '#0d0f18');
    }
  }
  // faixa pintada (apagada) e a tampa de bueiro
  for (let x = -36; x < 220; x += 22) rect(g, x, 352, 12, 2, '#3a3c48');
  ellipse(g, 146, 326, 11, 3, '#1c1f2a');
  ellipse(g, 146, 326, 9, 2.2, '#121520');
  for (let x = 139; x < 154; x += 3) rect(g, x, 326, 2, 1, '#252937');
  // poças (mais escuras e lisas; o reflexo pinta por cima)
  for (const [x, y, rx, ry] of PUDDLES) ellipse(g, x, y, rx, ry, '#06070c');

  // ---- mesa de plástico e cadeiras (do lado de fora, molhadas)
  const chair = (x, y, flip) => {
    const C = '#9c2a24';
    const L = '#c33a30';
    const D = '#64170f';
    rect(g, x, y, 12, 2, L);
    rect(g, x + (flip ? 10 : 0), y - 16, 2, 18, C);
    rect(g, x + (flip ? 0 : 2), y - 16, 10, 2, L);
    rect(g, x + (flip ? 0 : 2), y - 11, 10, 2, C);
    rect(g, x + (flip ? 0 : 2), y - 7, 10, 1, D);
    rect(g, x, y + 2, 2, 12, C);
    rect(g, x + 10, y + 2, 2, 12, D);
  };
  chair(-30, 256, false);
  chair(8, 256, true);
  rect(g, -16, 248, 26, 3, '#c33a30');
  rect(g, -16, 251, 26, 1, '#64170f');
  rect(g, -6, 252, 2, 18, '#9c2a24');
  rect(g, 3, 252, 2, 18, '#64170f');
  // garrafa e copo americano
  rect(g, -10, 236, 3, 12, '#5a3110');
  rect(g, -10, 233, 2, 3, '#5a3110');
  rect(g, -10, 232, 2, 1, '#9a9aa2');
  rect(g, -10, 240, 3, 4, '#b9a77a');
  rect(g, -9, 236, 1, 4, '#8a5422');
  rect(g, -2, 242, 4, 6, '#5f727a');
  rect(g, -2, 242, 4, 1, '#8aa0a8');
  rect(g, -1, 244, 2, 4, '#7a5a1e');

  // ---- lousa de cavalete: o dominó de hoje
  rect(g, 40, 234, 30, 34, '#4a3020');
  rect(g, 40, 234, 30, 1, '#6a4a32');
  rect(g, 42, 236, 26, 30, '#13201a');
  for (let i = 0; i < 24; i += 1) rect(g, 42 + hash(i, 101) * 26, 236 + hash(i, 102) * 30, 2, 1, '#1d2c25');
  const chalk = '#d6dacb';
  text5(g, 'HOJE', 55 - text5Width('HOJE') / 2, 239, chalk);
  text5(g, 'DOMINÓ', 55 - text5Width('DOMINÓ') / 2, 248, chalk);
  text5(g, '1x1', 55 - text5Width('1x1') / 2, 256, '#e9b44a');
  rect(g, 44, 263, 22, 1, '#7a8a80');
  rect(g, 41, 266, 3, 4, '#3a2418');
  rect(g, 66, 266, 3, 4, '#3a2418');

  // ---- Seu Tião no engradado, à direita da porta
  g.drawImage(tint(sprites.tiao, '#9aa6c8', 0.55), TIAO_AT.x, TIAO_AT.y);

  // tampinhas largadas na calçada (a moeda da meta)
  for (const [x, y] of [
    [30, 276],
    [98, 280],
    [104, 274],
    [-20, 280],
  ]) {
    rect(g, x, y, 2, 1, '#9a8a3a');
    rect(g, x, y + 1, 2, 1, '#5a4a1a');
  }
  return c;
}

const PUDDLES = [
  [36, 304, 24, 4],
  [118, 312, 34, 6],
  [70, 338, 42, 8],
  [170, 300, 16, 3],
  [0, 330, 20, 5],
  [128, 280, 14, 2],
  [52, 278, 10, 2],
];

/** Interior visto pela porta: luz quente com as silhuetas (lâmpada, a mesa e o Tio Zé de chapéu). */
function doorInteriorArt() {
  const c = makeCanvas(DOOR.w, DOOR.h);
  const g = pix(c);
  bands(g, 0, DOOR.w, [
    [0, '#ffd892'],
    [26, '#f3ae58'],
    [DOOR.h, '#b8692c'],
  ]);
  // lâmpada pendurada
  rect(g, 18, 0, 1, 5, '#6a3a18');
  rect(g, 15, 5, 7, 3, '#6a3a18');
  // Tio Zé de chapéu, sentado de frente
  const S = '#7a4520';
  rect(g, 21, 22, 12, 2, S);
  rect(g, 24, 18, 6, 4, S);
  rect(g, 24, 24, 6, 6, S);
  rect(g, 21, 30, 12, 12, S);
  // a mesa
  rect(g, 4, 40, 32, 3, '#6a3a18');
  rect(g, 6, 43, 2, 16, '#7a4520');
  rect(g, 32, 43, 2, 16, '#7a4520');
  return c;
}

/** Tubo de neon BUXARIA: máscara das letras (escala 2) → contorno de 1 px. */
function neonArt() {
  const scale = 2;
  const w = Math.ceil(56.4 * scale) + 4;
  const h = 10 * scale + 4;
  const mask = makeCanvas(w, h);
  const mg = mask.getContext('2d');
  mg.setTransform(scale, 0, 0, scale, 2, 2);
  mg.fillStyle = '#fff';
  mg.fill(new Path2D(WORD_D), 'evenodd');
  hardAlpha(mask);
  const tube = outline(mask, '#ffe2d6');
  const off = outline(mask, '#4a1f1c');
  // a cor do vidro em volta do miolo branco (fica por baixo, 1 px para fora)
  const halo = makeCanvas(w + 2, h + 2);
  const hg = halo.getContext('2d');
  const red = outline(mask, '#ff3b2c');
  for (const [dx, dy] of [
    [0, 1],
    [2, 1],
    [1, 0],
    [1, 2],
  ])
    hg.drawImage(red, dx, dy);
  return { tube, off, halo, w, h };
}

function postArt() {
  const c = makeCanvas(POST.w, POST.h);
  const g = pix(c);
  g.translate(-POST.ox, -POST.oy);
  // poste de concreto com o braço curvo e a luminária de vapor de sódio
  rect(g, 0, 70, 6, 320, '#353843');
  rect(g, 0, 70, 2, 320, '#575b68');
  rect(g, 5, 70, 1, 320, '#191a20');
  for (let y = 90; y < 380; y += 26) rect(g, 0, y, 6, 1, '#202228');
  // braço
  for (let i = 0; i < 26; i += 1) {
    const x = 3 + i;
    const y = Math.round(70 - Math.sin((i / 26) * Math.PI * 0.6) * 10);
    rect(g, x, y, 2, 2, '#353843');
    rect(g, x, y, 2, 1, '#575b68');
  }
  // luminária
  rect(g, 24, 59, 12, 4, '#1f2026');
  rect(g, 23, 62, 14, 2, '#30323a');
  rect(g, 25, 64, 10, 2, '#ffcf7a');
  rect(g, 27, 64, 6, 1, '#fff2c8');
  // placa de rua azul
  rect(g, 6, 120, 20, 8, '#c9d2e0');
  rect(g, 7, 121, 18, 6, '#1f3f86');
  text5(g, 'R.', 8, 122, '#c9d2e0', 0);
  text5(g, '7', 19, 122, '#c9d2e0');
  // fiação saindo do poste
  return c;
}

function maskArt() {
  // quanto o chão espelha: poças muito, asfalto médio, calçada pouco
  const c = makeCanvas(MAIN.w, MAIN.oy + MAIN.h - GROUND);
  const g = c.getContext('2d');
  g.translate(-MAIN.ox, -GROUND);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(-40, GROUND, 260, 286 - GROUND);
  g.fillStyle = 'rgba(255,255,255,0.42)';
  g.fillRect(-40, 292, 260, 120);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(-40, 292, 260, 2);
  for (const [x, y, rx, ry] of PUDDLES) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ---------------------------------------------------------------------------------

export function buildStreet(sprites) {
  const sky = skyArt(false);
  const skyFlash = skyArt(true);
  const hill = hillArt();
  const base = mainArt(sprites);
  const post = postArt();
  const interior = doorInteriorArt();
  const neon = neonArt();
  const wetMask = maskArt();
  const corvo = { open: tint(sprites.corvo.open, '#2a2a3a', 1), blink: tint(sprites.corvo.blink, '#2a2a3a', 1) };

  // fontes de luz (para o brilho borrado e para o reflexo no chão)
  const emitWarm = makeCanvas(MAIN.w, MAIN.h);
  {
    const g = pix(emitWarm);
    g.translate(-MAIN.ox, -MAIN.oy);
    g.drawImage(interior, DOOR.x, DOOR.y);
    rect(g, 37, 87, 22, 38, '#f0a24c');
    rect(g, 29, 191, 33, 19, '#a8642a');
  }
  const emitNeon = makeCanvas(MAIN.w, MAIN.h);
  {
    const g = pix(emitNeon);
    g.translate(-MAIN.ox, -MAIN.oy);
    g.drawImage(neon.halo, NEON_AT.x - 1, NEON_AT.y - 1);
    g.drawImage(neon.tube, NEON_AT.x, NEON_AT.y);
  }
  /** A cor mais forte de cada coluna (vira a listra do reflexo no asfalto). */
  const columnOf = (src, y0, y1) => {
    const c = makeCanvas(MAIN.w, 1);
    const d = src.getContext('2d').getImageData(0, y0 - MAIN.oy, MAIN.w, y1 - y0).data;
    const g = c.getContext('2d');
    const img = g.createImageData(MAIN.w, 1);
    for (let x = 0; x < MAIN.w; x += 1) {
      let r = 0;
      let gg = 0;
      let b = 0;
      let a = 0;
      for (let y = 0; y < y1 - y0; y += 1) {
        const i = (y * MAIN.w + x) * 4;
        if (d[i + 3] === 0) continue;
        r = Math.max(r, d[i]);
        gg = Math.max(gg, d[i + 1]);
        b = Math.max(b, d[i + 2]);
        a = Math.max(a, d[i + 3]);
      }
      img.data.set([r, gg, b, a], x * 4);
    }
    g.putImageData(img, 0, 0);
    return c;
  };
  const colNeon = columnOf(emitNeon, SIGN.y, SIGN.y + SIGN.h);
  const colWarm = columnOf(emitWarm, 84, GROUND);
  const bloomPad = 12;
  const bloomNeon = boxBlur(copyCanvas(emitNeon, bloomPad), 4, 3);
  const bloomWarm = boxBlur(copyCanvas(emitWarm, bloomPad), 5, 3);
  const frame = makeCanvas(MAIN.w, MAIN.h);
  const refl = makeCanvas(MAIN.w, wetMask.height);

  /** Janela da esquerda (acesa): cortina vermelha e o gato no peitoril. */
  const drawLitWindow = (g) => {
    rect(g, 37, 87, 22, 38, '#e09443');
    bands(g, 37, 22, [
      [87, '#ffc874'],
      [125, '#c8742e'],
    ]);
    rect(g, 37, 87, 6, 38, '#8a3326');
    rect(g, 39, 87, 1, 38, '#6a241a');
    rect(g, 53, 87, 6, 38, '#8a3326');
    rect(g, 56, 87, 1, 38, '#6a241a');
    rect(g, 37, 87, 22, 3, '#6a241a');
    rect(g, 48, 87, 1, 38, '#4a3424');
    rect(g, 37, 105, 22, 1, '#4a3424');
    // gato
    rect(g, 46, 119, 7, 6, '#2a150c');
    rect(g, 47, 116, 5, 3, '#2a150c');
    rect(g, 47, 115, 1, 1, '#2a150c');
    rect(g, 51, 115, 1, 1, '#2a150c');
    rect(g, 52, 122, 3, 1, '#2a150c');
  };

  /** Cortina de fitas: cada fita balança um pouco (mais embaixo). */
  const drawStrips = (g, t, push = 0) => {
    const n = 10;
    const sw = DOOR.w / n;
    for (let i = 0; i < n; i += 1) {
      const x0 = DOOR.x + i * sw;
      const phase = t * 2.3 + i * 0.9;
      for (let seg = 0; seg < 8; seg += 1) {
        const y = DOOR.y + Math.floor((seg * DOOR.h) / 8);
        const y1 = DOOR.y + Math.floor(((seg + 1) * DOOR.h) / 8);
        const k = (seg + 0.5) / 8;
        const off = Math.round((Math.sin(phase) * 0.8 + push) * k * k * 2);
        g.globalAlpha = 0.9;
        rect(g, x0 + off, y, Math.ceil(sw) - 1, y1 - y, STRIP_COLORS[i % 4]);
        g.globalAlpha = 0.28;
        rect(g, x0 + off, y, 1, y1 - y, '#ffffff');
        g.globalAlpha = 1;
      }
    }
  };

  /** Fios elétricos (a gambiarra da rua) com gotas penduradas. */
  const drawWires = (g, t) => {
    for (let w = 0; w < 4; w += 1) {
      const y0 = 36 + w * 6;
      const y1 = 46 + w * 5;
      const sag = 12 + w * 4;
      for (let x = -40; x < 220; x += 1) {
        const k = (x + 40) / 260;
        const y = Math.round(y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag);
        rect(g, x, y, 1, 1, '#06070d');
        if (hash(x, w + 120) > 0.985) {
          const drop = (t * 1.8 + hash(x, w + 121)) % 1;
          if (drop < 0.7) rect(g, x, y + 1 + Math.floor(drop * 3), 1, 1, '#6a7398');
        }
      }
    }
  };

  /** Bandeirinhas atravessando a fachada, batendo com o vento. */
  const drawBunting = (g, t) => {
    for (let s = 0; s < 2; s += 1) {
      const x0 = 18;
      const x1 = 162;
      const y0 = 68 + s * 2;
      const sag = 16 + s * 6;
      const phase = s * 2;
      for (let x = x0; x <= x1; x += 1) {
        const k = (x - x0) / (x1 - x0);
        rect(g, x, Math.round(y0 + Math.sin(k * Math.PI) * sag), 1, 1, '#0b0d14');
      }
      for (let i = 0; x0 + 3 + i * 6 < x1 - 2; i += 1) {
        const x = x0 + 3 + i * 6;
        const k = (x - x0) / (x1 - x0);
        const y = Math.round(y0 + Math.sin(k * Math.PI) * sag) + 1;
        const flap = Math.round(Math.sin(t * 6 + i * 1.3 + phase) * 0.7);
        const col = FLAG_COLORS[(i + s * 2) % FLAG_COLORS.length];
        rect(g, x + flap, y, 4, 2, col);
        rect(g, x + 1 + flap, y + 2, 2, 2, col);
        rect(g, x + flap, y, 4, 1, mix(col, '#ffffff', 0.15));
      }
    }
  };

  /** ABERTO pendurado no balcão-janela (pisca a borda de vez em quando). */
  const drawAberto = (g, t, on) => {
    const border = on && Math.floor(t * 2.5) % 5 !== 4 ? '#ff6fb5' : '#5a2440';
    rect(g, 32, 194, 27, 1, border);
    rect(g, 32, 203, 27, 1, border);
    rect(g, 32, 194, 1, 10, border);
    rect(g, 58, 194, 1, 10, border);
    text5(g, 'ABERTO', 34, 196, on ? '#9affd2' : '#1f4a3a');
  };

  const draw = (F) => {
    const { out, t } = F;
    const N = neonLevel(t);
    const L = F.reduced ? 0 : lightning(t);
    // câmera: a gente anda até a porta (aceleração leve), balançando a cabeça a cada passo
    const k = span(t, 0, STREET_END);
    const f = 0.64 * (0.3 * k + 0.7 * k * k);
    const step = t * 2.2;
    const bob = F.reduced ? 0 : Math.abs(Math.sin(step * Math.PI)) * -1.6 + 0.8;
    const sway = F.reduced ? 0 : Math.sin(step * Math.PI * 0.5) * 0.7;
    const cam = makeCamera(F, {
      fx: 90 + sway,
      fy: 160 + (DOOR.y + 24 - 160) * easeInOut(clamp(k * 1.15)) + bob,
      ax: 90,
      ay: 160,
      f,
      roll: F.reduced ? 0 : Math.sin(step * Math.PI * 0.5) * 0.006,
    });

    // ---- quadro do plano principal (pixel art, refeito a cada quadro)
    const g = pix(frame);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, frame.width, frame.height);
    g.drawImage(base, 0, 0);
    g.translate(-MAIN.ox, -MAIN.oy);
    drawLitWindow(g);
    // o Corvo na fresta da janela escura
    g.save();
    g.beginPath();
    g.rect(CORVO_WINDOW.x, CORVO_WINDOW.y, CORVO_WINDOW.w, CORVO_WINDOW.h);
    g.clip();
    const blink = (t > 1.55 && t < 1.66) || t < 0.85;
    g.drawImage(blink ? corvo.blink : corvo.open, CORVO_AT.x, CORVO_AT.y);
    g.restore();
    // a folha fechada da veneziana por cima da metade direita da janela
    rect(g, 136, 87, 10, 38, '#2c4a34');
    for (let y = 89; y < 124; y += 2) rect(g, 137, y, 8, 1, '#1f3526');
    rect(g, 136, 87, 1, 38, '#3d6346');
    // olhos do Corvo (acendem depois do relâmpago)
    if (!blink) {
      rect(g, CORVO_AT.x + 21, CORVO_AT.y + 20, 2, 1, '#ff2a2a');
      rect(g, CORVO_AT.x + 28, CORVO_AT.y + 20, 2, 1, '#ff2a2a');
    }
    // porta: luz quente com a cortina de fitas
    g.drawImage(interior, DOOR.x, DOOR.y);
    drawStrips(g, t);
    // neon
    if (N > 0.5) {
      g.drawImage(neon.halo, NEON_AT.x - 1, NEON_AT.y - 1);
      g.drawImage(neon.tube, NEON_AT.x, NEON_AT.y);
    } else {
      g.drawImage(neon.off, NEON_AT.x, NEON_AT.y);
    }
    drawAberto(g, t, t > 0.9);
    drawBunting(g, t);
    drawWires(g, t);
    // a moeda do Seu Tião: sobe girando e volta para a mão
    const coinT = span(t, 1.0, 1.62);
    if (coinT > 0 && coinT < 1) {
      const cx = TIAO_AT.x + 40 + coinT * 1;
      const cy = TIAO_AT.y + 23 - Math.sin(coinT * Math.PI) * 20;
      const spin = Math.floor(t * 22) % 3;
      rect(g, cx, cy, spin === 1 ? 1 : 2, 2, spin === 2 ? '#fff2a0' : '#e8b830');
    }
    // pingos caindo da marquise e do ar-condicionado
    for (let i = 0; i < 9; i += 1) {
      const x = [44, 48, 30, 64, 96, 120, 140, 150, 26][i];
      const y0 = i < 2 ? 142 : 182;
      const period = 0.55 + hash(i, 131) * 0.4;
      const ph = (t / period + hash(i, 132)) % 1;
      const y = y0 + ph * ph * (GROUND - y0);
      rect(g, x, y, 1, 2, '#7f8bb4');
    }
    // reflexo no chão molhado: na calçada, a porta espelhada; no asfalto, as luzes viram
    // listras compridas tremendo (como neon em rua molhada de verdade)
    const rg = refl.getContext('2d');
    rg.setTransform(1, 0, 0, 1, 0, 0);
    rg.globalCompositeOperation = 'source-over';
    rg.clearRect(0, 0, refl.width, refl.height);
    for (let r = 0; r < refl.height; r += 1) {
      const y = GROUND + r;
      const ripple = Math.round(Math.sin(y * 0.33 + t * 4.5) * (0.4 + r * 0.02) + Math.sin(y * 0.13 - t * 2.2) * 0.8);
      if (y < 286) {
        const sy = GROUND - (y - GROUND) - 1 - MAIN.oy;
        rg.globalAlpha = 0.9;
        rg.drawImage(emitWarm, 0, sy, MAIN.w, 1, ripple, r, MAIN.w, 1);
        continue;
      }
      // no asfalto: listras retas, quebradas em tracinhos que correm (água escorrendo)
      const fade = (1 - (y - 286) / (MAIN.oy + MAIN.h - 286)) ** 1.3;
      const dash = Math.sin(y * 0.9 - t * 11) * 0.5 + Math.sin(y * 0.37 + t * 5) * 0.5;
      const broken = dash > 0.35 ? 0.25 : 1;
      const sway = Math.round(Math.sin(y * 0.05 + t * 1.5) * 0.6);
      rg.globalAlpha = 0.75 * fade * broken;
      rg.drawImage(colWarm, 0, 0, MAIN.w, 1, sway, r, MAIN.w, 1);
      if (N > 0) {
        rg.globalAlpha = Math.min(1, (0.95 * fade + 0.1) * N * broken);
        rg.drawImage(colNeon, 0, 0, MAIN.w, 1, sway, r, MAIN.w, 1);
      }
    }
    rg.globalAlpha = 1;
    rg.globalCompositeOperation = 'destination-in';
    rg.drawImage(wetMask, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'lighter';
    g.drawImage(refl, 0, GROUND - MAIN.oy);
    g.globalCompositeOperation = 'source-over';
    // respingos da chuva no chão (coroinhas de 3 quadros)
    g.translate(-MAIN.ox, -MAIN.oy);
    for (let i = 0; i < 46; i += 1) {
      const period = 0.32 + hash(i, 141) * 0.35;
      const cyc = Math.floor(t / period + hash(i, 142));
      const ph = (t / period + hash(i, 142)) % 1;
      if (ph > 0.3) continue;
      const x = -40 + Math.floor(hash(i * 31 + cyc, 143) * 260);
      const y = GROUND + 2 + Math.floor(hash(i * 17 + cyc, 144) ** 0.7 * 116);
      const col = '#8e98c4';
      if (ph < 0.1) rect(g, x, y, 1, 1, '#c3cae8');
      else if (ph < 0.2) {
        rect(g, x - 1, y - 1, 1, 1, col);
        rect(g, x + 1, y - 1, 1, 1, col);
      } else {
        g.globalAlpha = 0.6;
        rect(g, x - 2, y, 1, 1, col);
        rect(g, x + 2, y, 1, 1, col);
        g.globalAlpha = 1;
      }
    }
    // a água jorrando do cano
    for (let i = 0; i < 4; i += 1) rect(g, 158 + (i % 2), GROUND - 2 - ((t * 30 + i * 3) % 6), 1, 1, '#9aa4cc');
    g.setTransform(1, 0, 0, 1, 0, 0);

    withRoll(out, F, cam.roll, () => {
      // céu, morro e a rua
      cam.blit(out, sky, SKY.ox, SKY.oy, SKY.depth);
      if (L > 0) cam.blit(out, skyFlash, SKY.ox, SKY.oy, SKY.depth, L);
      // halo da lua
      const [mx, my] = cam.toScreen(150, 20, SKY.depth);
      glow(out, mx, my, cam.scale(SKY.depth) * 34, 'rgba(160,170,230,0.5)', 0.55);
      cam.blit(out, hill, HILL.ox, HILL.oy, HILL.depth);
      cam.blit(out, frame, MAIN.ox, MAIN.oy, MAIN.depth);

      const sc = cam.scale(1);
      // brilho do neon (borrado) e a luz vermelha que ele joga na parede e no chão
      if (N > 0) {
        cam.glowBlit(out, bloomNeon, MAIN.ox - bloomPad, MAIN.oy - bloomPad, 1, 1.25 * N);
        const [nx, ny] = cam.toScreen(90, 165);
        glowEllipse(out, nx, ny, sc * 110, sc * 46, 'rgba(255,60,40,0.5)', 0.42 * N);
        const [rx, ry] = cam.toScreen(90, 312);
        glowEllipse(out, rx, ry, sc * 70, sc * 10, 'rgba(255,70,50,0.6)', 0.35 * N);
      }
      // luz quente da porta, das janelas e do balcão
      cam.glowBlit(out, bloomWarm, MAIN.ox - bloomPad, MAIN.oy - bloomPad, 1, 0.65);
      const [dx0, dy0] = cam.toScreen(DOOR.x + DOOR.w / 2, GROUND - 4);
      const [dx1, dy1] = cam.toScreen(DOOR.x + DOOR.w / 2, 300);
      beam(out, dx0, dy0, sc * 20, dx1, dy1, sc * 44, 'rgba(255,170,80,0.55)', 0.45);
      const [wx, wy] = cam.toScreen(48, 106);
      glow(out, wx, wy, sc * 34, 'rgba(255,170,80,0.5)', 0.4);
      // olhos do Corvo
      if (!blink) {
        const [ex, ey] = cam.toScreen(CORVO_AT.x + 25, CORVO_AT.y + 20.5);
        glow(out, ex, ey, sc * 7, 'rgba(255,30,30,0.9)', 0.6);
      }
      // brilho da moeda no alto
      if (coinT > 0.35 && coinT < 0.65) {
        const [cx, cy] = cam.toScreen(TIAO_AT.x + 41, TIAO_AT.y + 23 - Math.sin(coinT * Math.PI) * 20);
        glow(out, cx, cy, sc * 6, 'rgba(255,230,140,0.9)', 0.9);
        out.save();
        out.globalCompositeOperation = 'lighter';
        out.fillStyle = 'rgba(255,245,200,0.9)';
        out.fillRect(cx - sc * 3, cy - sc * 0.25, sc * 6, sc * 0.5);
        out.fillRect(cx - sc * 0.25, cy - sc * 3, sc * 0.5, sc * 6);
        out.restore();
      }
      // poste da frente (passa por nós) e o facho de sódio
      const [lx, ly] = cam.toScreen(30, 66, POST.depth);
      const [px0, py0] = cam.toScreen(30, 66, 1);
      const [px1, py1] = cam.toScreen(10, GROUND + 12, 1);
      beam(out, px0, py0, sc * 4, px1, py1, sc * 48, 'rgba(255,190,100,0.5)', 0.4);
      const [gx, gy] = cam.toScreen(10, GROUND + 10);
      glowEllipse(out, gx, gy, sc * 46, sc * 12, 'rgba(255,180,90,0.6)', 0.4);
      cam.blit(out, post, POST.ox, POST.oy, POST.depth);
      glow(out, lx, ly, cam.scale(POST.depth) * 22, 'rgba(255,200,120,0.8)', 0.7);
    });

    // névoa rasteira, vapor do bueiro e chuva (em alta resolução, por cima de tudo)
    mist(out, cam, t, N);
    rain(out, F, t, N);
    // relâmpago: clareia tudo
    if (L > 0) fill(out, F, 'rgb(170,180,255)', L * 0.32, 'lighter');
    // entrada: sai do preto
    fill(out, F, '#000', 1 - smooth(span(t, 0, 0.1)));
    vignette(out, F, 0.85);
  };

  return { draw };
}

/** Névoa baixa na rua e o vapor subindo do bueiro (puffs macios, em alta). */
function mist(g, cam, t, neon) {
  const sc = cam.scale(1);
  g.save();
  for (let i = 0; i < 9; i += 1) {
    const period = 2.4;
    const age = (t + (i / 9) * period) % period;
    const k = age / period;
    const [x, y] = cam.toScreen(146 + k * 14 + Math.sin(age * 2 + i) * 3, 324 - k * 46);
    const r = sc * (5 + k * 16);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const a = Math.sin(k * Math.PI) * 0.16;
    grad.addColorStop(0, `rgba(190,190,215,${a})`);
    grad.addColorStop(1, 'rgba(190,190,215,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // faixa de névoa rente ao chão, levemente tingida pelo neon
  const [, y0] = cam.toScreen(0, 270);
  const [, y1] = cam.toScreen(0, 320);
  const grad = g.createLinearGradient(0, y0, 0, y1);
  const tintR = Math.round(150 + 60 * neon);
  grad.addColorStop(0, `rgba(${tintR},140,190,0)`);
  grad.addColorStop(0.5, `rgba(${tintR},140,190,0.10)`);
  grad.addColorStop(1, `rgba(${tintR},140,190,0)`);
  g.fillStyle = grad;
  g.globalCompositeOperation = 'screen';
  g.fillRect(0, y0, g.canvas.width, y1 - y0);
  g.restore();
}

/** Chuva em três profundidades; a que passa na frente do neon fica avermelhada. */
function rain(g, F, t, neon) {
  const { W, H } = F;
  const unit = Math.min(W / 180, H / 320);
  const layers = [
    { n: 70, len: 7, speed: 520, width: 0.6, alpha: 0.16, salt: 1 },
    { n: 55, len: 13, speed: 820, width: 0.9, alpha: 0.24, salt: 2 },
    { n: 26, len: 26, speed: 1250, width: 1.5, alpha: 0.32, salt: 3 },
  ];
  g.save();
  g.lineCap = 'round';
  for (const L of layers) {
    const len = L.len * unit;
    const vx = -0.16;
    g.lineWidth = L.width * unit * 0.6;
    for (const tinted of [false, true]) {
      g.beginPath();
      for (let i = 0; i < L.n; i += 1) {
        const x0 = hash(i, L.salt * 7) * (W + 80) - 40;
        const speed = L.speed * unit * (0.85 + hash(i, L.salt * 9) * 0.3) * 0.32;
        const y = (hash(i, L.salt * 8) * (H + len) + t * speed * 3) % (H + len) - len;
        const x = x0 + vx * (y + len);
        const near = y > H * 0.38 && y < H * 0.62;
        if (near !== tinted) continue;
        g.moveTo(x, y);
        g.lineTo(x + vx * len, y + len);
      }
      g.strokeStyle = tinted && neon > 0.5 ? `rgba(255,140,120,${L.alpha * 1.2})` : `rgba(170,185,235,${L.alpha})`;
      g.stroke();
    }
  }
  g.restore();
}
