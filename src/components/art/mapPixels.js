/**
 * Versão 2.0: os nós do mapa viram objetos em pixel art (CampaignMap.jsx), pintados no buffer
 * do cenário (art/botecoScene.js → paintKit):
 *
 *   tampinha   a carica de cerveja amassada das mesas comuns (o rival aparece no miolo)
 *   engradado  o engradado de cerveja da Loja do Valtinho (no CSS ele treme)
 *   beco       o beco do evento [?]: parede de tijolo, poça, lâmpada; a chuva e a neblina
 *              são camadas do CSS por cima
 *   moedas     a pilha de moedas do Seu Tião
 *   porta      a porta escura do Mercado Negro, com a luz vermelha
 *   grampo     o grampo enferrujado que prende a polaroide do chefe
 */
import { paintKit } from './botecoScene.js';

const { hex, rngOf, buffer } = paintKit;
const INK = hex('#0b0705');

function outline(b) {
  const marks = [];
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      if (b.data[(y * b.w + x) * 4 + 3] > 0) continue;
      const near = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => nx >= 0 && ny >= 0 && nx < b.w && ny < b.h && b.data[(ny * b.w + nx) * 4 + 3] > 200);
      if (near) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) b.put(x, y, INK);
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Cores das tampinhas: vermelha, verde, azul, dourada, preta (a semente do nó escolhe). */
const CAP_COLORS = [
  ['#e0483a', '#b8261c', '#6e120c'],
  ['#6ab06a', '#2f7a34', '#123a16'],
  ['#5a8ad0', '#2f5f9a', '#14284a'],
  ['#f0d27a', '#c9a24a', '#6a4a12'],
  ['#6a6a6a', '#303030', '#101010'],
];

export const CAP_SIZE = Object.freeze({ w: 40, h: 38 });

/**
 * Tampinha de garrafa amassada, vista de cima e meio de lado: a saia com os 21 dentes
 * (amassados de um lado), o tampo com o brilho de metal e a dobra do amassado. O miolo fica
 * liso (é ali que o rival aparece).
 */
export function paintBottleCap(variant = 0, seed = 1) {
  const { w, h } = CAP_SIZE;
  const b = buffer(w, h);
  const r = rngOf(seed * 13 + variant);
  const [hi, mid, lo] = CAP_COLORS[variant % CAP_COLORS.length].map(hex);
  const cx = 20;
  const cy = 17;
  // sombra
  b.ellipse(cx + 1, cy + 4, 18, 15, [0, 0, 0], 0.4);
  // a saia com os dentes: raio que sobe e desce, e um lado achatado (o amassado)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = x - cx;
      const dy = (y - cy) * 1.08;
      const a = Math.atan2(dy, dx);
      const dent = a > 0.3 && a < 1.6 ? 1.8 : 0; // o amassado embaixo à direita
      const tooth = Math.cos(a * 21) > 0.2 ? 1.4 : 0;
      const R = 15.5 + tooth - dent;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      let c;
      if (d > 12.5) {
        // a saia: dente claro, vão escuro, luz vem de cima à esquerda
        const lit = Math.cos(a + 2.3);
        c = tooth ? mix(mid, hi, 0.3 + lit * 0.3) : mix(lo, mid, 0.4 + lit * 0.2);
      } else {
        // o tampo: o brilho de metal em cima à esquerda, escuro embaixo
        const lit = -(dx + dy) / 20;
        c = mix(mid, hi, Math.max(0, Math.min(1, 0.35 + lit * 0.5)));
        if (d > 11.5) c = lo; // a borda do tampo
      }
      b.put(x, y, mix(c, [0, 0, 0], r() * 0.06));
    }
  }
  // a dobra do amassado e os riscos
  b.line(cx + 4, cy + 3, cx + 12, cy + 9, mix(lo, [0, 0, 0], 0.3));
  b.line(cx + 4, cy + 2, cx + 12, cy + 8, hi, 0.7);
  for (let i = 0; i < 4; i += 1) {
    const sx = cx - 8 + r() * 14;
    const sy = cy - 8 + r() * 12;
    b.line(sx, sy, sx + 2 + r() * 3, sy + r() * 2, hex('#ffffff'), 0.25);
  }
  b.put(cx - 7, cy - 7, hex('#ffffff'));
  b.put(cx - 6, cy - 7, hex('#ffffff'), 0.6);
  outline(b);
  return b;
}

export const CRATE_SIZE = Object.freeze({ w: 44, h: 40 });

/** Engradado de cerveja de madeira com seis garrafas âmbar e as tampinhas. */
export function paintCrate() {
  const { w, h } = CRATE_SIZE;
  const b = buffer(w, h);
  const wood = [hex('#d89a5a'), hex('#a06a38'), hex('#7a4a24'), hex('#4a2a12')];
  b.ellipse(23, h - 3, 20, 4, [0, 0, 0], 0.45);
  // garrafas (atrás da ripa da frente)
  for (let i = 0; i < 5; i += 1) {
    const x = 7 + i * 7;
    const top = 2 + (i % 2) * 2;
    b.rect(x + 1, top, 3, 3, hex('#d9a531'));
    b.put(x + 1, top, hex('#fff0a0'));
    b.rect(x + 1, top + 3, 3, 5, hex('#5a2a06'));
    b.rect(x, top + 8, 5, 14, hex('#7a3a08'));
    b.rect(x, top + 8, 1, 14, hex('#c87a28'));
    b.rect(x + 1, top + 12, 3, 4, hex('#e8dcb8'));
  }
  // o engradado: laterais, ripas na frente com o vão, a alça vazada
  b.rect(3, 16, 38, 21, wood[2]);
  for (const y of [16, 24, 31]) {
    b.rect(3, y, 38, 6, wood[1]);
    b.rect(3, y, 38, 1, wood[0]);
    b.rect(3, y + 5, 38, 1, wood[3]);
  }
  b.rect(3, 16, 3, 21, wood[3]);
  b.rect(38, 16, 3, 21, wood[3]);
  b.rect(4, 16, 1, 21, wood[1]);
  b.rect(16, 18, 12, 3, hex('#1a0c04'));
  // marca a ferro e os pregos
  b.rect(18, 26, 8, 3, hex('#3a1a08'));
  for (const [nx, ny] of [
    [7, 18],
    [36, 18],
    [7, 33],
    [36, 33],
  ])
    b.put(nx, ny, hex('#e0e0d8'));
  outline(b);
  return b;
}

export const ALLEY_SIZE = Object.freeze({ w: 40, h: 42 });

/**
 * O beco do evento: duas paredes de tijolo em perspectiva, o chão molhado com a poça
 * refletindo a lâmpada, a porta no fundo e a lâmpada acesa. (A chuva e a neblina são CSS.)
 */
export function paintAlley(seed = 4) {
  const { w, h } = ALLEY_SIZE;
  const b = buffer(w, h);
  const r = rngOf(seed);
  // moldura de placa (o beco cabe numa plaqueta de rua)
  b.rect(0, 0, w, h, hex('#1a1a20'));
  // céu escuro no fundo
  b.rect(2, 2, w - 4, 12, hex('#1e2436'));
  for (let x = 2; x < w - 2; x += 1) b.put(x, 2 + Math.floor(r() * 3), hex('#2a3248'));
  // paredes: tijolo da esquerda e da direita afunilando até o fundo
  const brick = [hex('#7a3a2a'), hex('#5a2a1e'), hex('#3a1a12')];
  for (let y = 2; y < h - 2; y += 1) {
    const t = (y - 2) / (h - 4);
    const lw = Math.round(6 + t * 8);
    for (let x = 2; x < 2 + lw; x += 1) b.put(x, y, (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0) ? brick[2] : brick[t > 0.5 ? 1 : 0]);
    for (let x = w - 2 - lw; x < w - 2; x += 1) b.put(x, y, (y % 4 === 1 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 2) ? brick[2] : brick[1]);
  }
  // a porta no fundo com a fresta de luz
  b.rect(17, 12, 7, 12, hex('#14100c'));
  b.rect(18, 13, 5, 11, hex('#2a1e14'));
  b.rect(23, 13, 1, 11, hex('#ffb04a'), 0.7);
  // a lâmpada da parede e o halo
  b.ellipse(27, 9, 7, 6, hex('#ffd67a'), 0.18);
  b.rect(26, 8, 3, 2, hex('#ffe9a8'));
  b.put(27, 7, hex('#3a3a3a'));
  // chão molhado com a poça
  b.rect(8, 26, 24, 14, hex('#22262e'));
  b.ellipse(21, 33, 9, 3, hex('#3a4458'));
  b.ellipse(23, 33, 3, 1, hex('#ffd67a'), 0.7);
  // a lixeira e o gato
  b.rect(9, 28, 5, 7, hex('#3a4a3a'));
  b.rect(9, 28, 5, 1, hex('#5a6a5a'));
  b.rect(29, 31, 4, 3, hex('#0a0a0a'));
  b.put(29, 30, hex('#0a0a0a'));
  b.put(32, 30, hex('#0a0a0a'));
  b.put(30, 31, hex('#c8e04a'));
  // a placa: borda de metal
  for (let x = 0; x < w; x += 1) {
    b.put(x, 0, hex('#8a949c'));
    b.put(x, 1, hex('#3a4046'));
    b.put(x, h - 1, hex('#14171a'));
    b.put(x, h - 2, hex('#3a4046'));
  }
  for (let y = 0; y < h; y += 1) {
    b.put(0, y, hex('#6a737a'));
    b.put(1, y, hex('#3a4046'));
    b.put(w - 1, y, hex('#14171a'));
    b.put(w - 2, y, hex('#3a4046'));
  }
  outline(b);
  return b;
}

export const COINS_SIZE = Object.freeze({ w: 40, h: 38 });

/** A pilha de moedas do Seu Tião: três torres desencontradas e uma moeda caída de lado. */
export function paintCoinStack() {
  const { w, h } = COINS_SIZE;
  const b = buffer(w, h);
  const gold = [hex('#fff0a0'), hex('#e6c34a'), hex('#b8901e'), hex('#6a4a08')];
  b.ellipse(20, h - 4, 18, 4, [0, 0, 0], 0.45);
  const coin = (x, y) => {
    b.ellipse(x, y + 1.5, 7, 3, gold[3]);
    b.ellipse(x, y + 1, 7, 3, gold[2]);
    b.ellipse(x, y, 7, 3, gold[1]);
    b.ellipse(x - 1, y - 0.5, 4, 1.5, gold[0]);
  };
  for (const [x, n, base] of [
    [11, 5, 30],
    [27, 7, 31],
    [19, 4, 33],
  ]) {
    for (let i = 0; i < n; i += 1) coin(x + (i % 2 ? 1 : 0), base - i * 3);
  }
  // moeda caída de pé
  b.ellipse(35, 30, 2.5, 5, gold[2]);
  b.ellipse(34.5, 30, 1.5, 4, gold[1]);
  b.put(34, 27, gold[0]);
  outline(b);
  return b;
}

export const DOOR_SIZE = Object.freeze({ w: 36, h: 42 });

/** A porta de ferro do Mercado Negro: rebites, a portinhola fechada e a lâmpada vermelha. */
export function paintBlackDoor() {
  const { w, h } = DOOR_SIZE;
  const b = buffer(w, h);
  b.rect(2, 4, w - 4, h - 5, hex('#2a1418'));
  b.ellipse(18, 3, 10, 5, hex('#ff2a1a'), 0.25);
  b.rect(15, 1, 6, 3, hex('#c8261d'));
  b.rect(16, 1, 3, 1, hex('#ff8a6a'));
  // a porta
  b.rect(6, 8, 24, h - 10, hex('#3a3e44'));
  b.rect(6, 8, 24, 1, hex('#6a737a'));
  b.rect(6, 8, 1, h - 10, hex('#5a6168'));
  b.rect(29, 8, 1, h - 10, hex('#1a1d20'));
  for (let y = 11; y < h - 3; y += 6) {
    b.put(8, y, hex('#9aa2a8'));
    b.put(27, y, hex('#9aa2a8'));
  }
  // portinhola
  b.rect(13, 14, 10, 4, hex('#14171a'));
  b.rect(13, 14, 10, 1, hex('#5a6168'));
  b.rect(14, 16, 8, 1, hex('#ff2a1a'), 0.6);
  // maçaneta e ferrugem
  b.rect(25, 26, 2, 3, hex('#c8a040'));
  b.ellipse(11, 34, 3, 2, hex('#7a3a1a'), 0.6);
  b.ellipse(22, 22, 2, 2, hex('#7a3a1a'), 0.5);
  outline(b);
  return b;
}

export const STAPLE_SIZE = Object.freeze({ w: 12, h: 6 });

/** O grampo enferrujado que prende a polaroide do chefe. */
export function paintStaple() {
  const { w, h } = STAPLE_SIZE;
  const b = buffer(w, h);
  b.rect(1, 1, 10, 2, hex('#8a6a4a'));
  b.rect(1, 1, 10, 1, hex('#c8b8a0'));
  b.rect(1, 1, 1, 4, hex('#6a4a2a'));
  b.rect(10, 1, 1, 4, hex('#6a4a2a'));
  b.put(4, 2, hex('#a04a1a'));
  b.put(7, 1, hex('#c05a1a'));
  b.put(8, 2, hex('#7a3a12'));
  b.rect(2, 4, 8, 1, [0, 0, 0], 0.35);
  return b;
}
