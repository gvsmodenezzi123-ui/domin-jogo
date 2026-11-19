/**
 * Versão 2.45: o joinha redesenhado pixel a pixel (os quatro dedos dobrados empilhados na frente
 * do punho, o polegar subindo do lado de fora), a mão espalmada no peito da risada e as formas
 * exportadas (gridOf) para os personagens fazerem os gestos com a própria mão (figGesture.js).
 *
 * Versão 2.41: os emotes da roda são GESTOS do personagem: a mão dele sobe ao lado do rosto, na
 * cor da pele e com o punho da roupa dele, e faz o gesto (o joinha, o joinha para baixo, o dedo do
 * meio, o aceno, as palmas); na risada ele ri. Antes eram carinhas amarelas soltas.
 *
 * Cada mão é pixel art feita por código: os blocos de pele e do punho numa grade, com o contorno
 * escuro em volta, a sombra do lado de baixo e da direita e o brilho em cima, tudo tirado da cor
 * da pele de cada um. Sai como retângulos SVG nítidos.
 */
import { memo } from 'react';

const W = 18;
const H = 20;

/** Clareia (k > 0) ou escurece (k < 0) uma cor #rrggbb. */
function tone(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * As formas de cada gesto: `skin` e `cuff` são blocos [x, y, largura, altura]; `lines` são os
 * riscos escuros por dentro (as dobras dos dedos).
 */
const SHAPES = {
  // o punho fechado com o polegar para cima: os quatro dedos dobrados empilhados na frente do
  // punho (as pontas arredondadas à esquerda) e o polegar subindo do lado direito
  joinha: {
    map: [
      '...........kkk....',
      '..........khhsk...',
      '..........khssk...',
      '..........khsdk...',
      '..........khsdk...',
      '..........khsdk...',
      '....kkkkkkkhsdk...',
      '...khhhhhhhssdk...',
      '..khssssssssssdk..',
      '..kddddddddsssdk..',
      '..khssssssssssdk..',
      '..kddddddddsssdk..',
      '...khsssssssssdk..',
      '...kdddddddsssdk..',
      '....khssssssssdk..',
      '....kkddddddddk...',
      '.....kcccccccCk...',
      '.....kcccccccCk...',
      '.....kcccccccCk...',
      '.....kkkkkkkkkk...',
    ],
  },
  // o mesmo punho virado: o polegar para baixo, o braço vindo de lado
  negativo: {
    skin: [
      [2, 4, 11, 8],
      [1, 5, 1, 6],
      [4, 11, 3, 8],
      [3, 11, 5, 3],
    ],
    lines: [
      [1, 5, 6, 1],
      [1, 7, 6, 1],
      [1, 9, 6, 1],
      [7, 5, 1, 6],
    ],
    cuff: [[14, 5, 4, 6]],
  },
  // o punho fechado com o dedo do meio em pé
  dedo: {
    skin: [
      [3, 9, 11, 7],
      [7, 1, 3, 9],
      [4, 8, 2, 2],
      [11, 8, 2, 2],
      [2, 11, 2, 4],
    ],
    lines: [
      [6, 9, 1, 3],
      [10, 9, 1, 3],
      [4, 13, 6, 1],
    ],
    cuff: [[4, 17, 9, 3]],
  },
  // a mão aberta
  aceno: {
    skin: [
      [4, 9, 10, 7],
      [4, 3, 2, 7],
      [7, 1, 2, 9],
      [10, 2, 2, 8],
      [13, 4, 2, 6],
      [1, 8, 2, 5],
      [2, 11, 3, 4],
    ],
    lines: [],
    cuff: [[5, 17, 8, 3]],
  },
};
SHAPES.palmas = SHAPES.aceno;
// a mão espalmada de lado, os dedos para a esquerda (a mão no peito da risada)
SHAPES.peito = {
  skin: [
    [5, 7, 9, 7],
    [1, 7, 4, 2],
    [0, 9, 5, 2],
    [1, 11, 4, 2],
    [6, 4, 4, 3],
  ],
  lines: [
    [1, 9, 4, 1],
    [1, 11, 4, 1],
  ],
  cuff: [[14, 7, 4, 7]],
};

const CACHE = new Map();

/** A grade pintada de um gesto: 's' pele, 'd' sombra, 'h' brilho, 'k' contorno, 'c'/'C' punho. */
export function gridOf(id) {
  let g = CACHE.get(id);
  if (g) return g;
  const shape = SHAPES[id] ?? SHAPES.joinha;
  if (shape.map) {
    const rects = [];
    shape.map.forEach((row, y) => {
      for (let x = 0; x < row.length; ) {
        const c = row[x];
        let w = 1;
        while (x + w < row.length && row[x + w] === c) w += 1;
        if (c !== '.') rects.push({ x, y, w, c });
        x += w;
      }
    });
    CACHE.set(id, rects);
    return rects;
  }
  g = Array.from({ length: H }, () => Array(W).fill('.'));
  const fill = (blocks, ch) => {
    for (const [x, y, w, h] of blocks) for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) if (yy >= 0 && yy < H && xx >= 0 && xx < W) g[yy][xx] = ch;
  };
  fill(shape.cuff, 'c');
  fill(shape.skin, 's');
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? g[y][x] : '.');
  const solid = (c) => c === 's' || c === 'c';
  // a luz vem de cima e da esquerda: brilho na quina de cima, sombra embaixo e à direita
  const shade = g.map((row) => row.slice());
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const c = g[y][x];
      if (!solid(c)) continue;
      const openRight = !solid(at(x + 1, y));
      const openDown = !solid(at(x, y + 1));
      const openUp = !solid(at(x, y - 1));
      const openLeft = !solid(at(x - 1, y));
      if (c === 's') shade[y][x] = openRight || openDown ? 'd' : openUp && openLeft ? 'h' : openLeft && !solid(at(x - 1, y - 1)) ? 'h' : 's';
      else shade[y][x] = openRight || openDown ? 'C' : 'c';
    }
  }
  fill(shape.lines, 'k');
  for (const [x, y, w, h] of shape.lines) for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) shade[yy][xx] = 'k';
  // o contorno: toda casa vazia encostada na mão
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (g[y][x] !== '.') continue;
      if (solid(at(x + 1, y)) || solid(at(x - 1, y)) || solid(at(x, y + 1)) || solid(at(x, y - 1))) shade[y][x] = 'k';
    }
  }
  // junta os iguais em sequência num retângulo só
  const rects = [];
  shade.forEach((row, y) => {
    for (let x = 0; x < W; ) {
      const c = row[x];
      let w = 1;
      while (x + w < W && row[x + w] === c) w += 1;
      if (c !== '.') rects.push({ x, y, w, c });
      x += w;
    }
  });
  CACHE.set(id, rects);
  return rects;
}

/** A pele e a manga de quem não tem retrato (o seu próprio emote, os ícones do menu). */
export const DEFAULT_SKIN = '#d89a6a';
export const DEFAULT_SLEEVE = '#3a5a8a';

/** Uma mão fazendo o gesto, na pele e na manga pedidas. `flip`: espelhada. */
export const GestureHand = memo(function GestureHand({ id, skin = DEFAULT_SKIN, sleeve = DEFAULT_SLEEVE, size = 36, flip = false, className = '' }) {
  const pal = { s: skin, d: tone(skin, -0.2), h: tone(skin, 0.22), k: tone(skin, -0.68), c: sleeve, C: tone(sleeve, -0.28) };
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      className={`gesture-hand ${className}`}
      style={{ shapeRendering: 'crispEdges', transform: flip ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      {gridOf(id).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={pal[r.c]} />
      ))}
    </svg>
  );
});

/** O ícone de um emote (o botão e o menu): a mão do gesto, ou o "HA" da risada. */
export const EmoteIcon = memo(function EmoteIcon({ id, size = 28, className = '' }) {
  if (id === 'risada')
    return (
      <span className={`emote-icon emote-icon-ha ${className}`} style={{ width: size, height: size, fontSize: Math.max(7, Math.round(size * 0.36)) }} aria-hidden="true">
        HA
        <br />
        HA
      </span>
    );
  // versão 2.45: o "calma aí": as duas mãos abertas
  if (id === 'calma')
    return (
      <span className={`emote-icon emote-icon-pair ${className}`} style={{ width: size, height: size }} aria-hidden="true">
        <GestureHand id="aceno" size={Math.round(size * 0.5)} flip />
        <GestureHand id="aceno" size={Math.round(size * 0.5)} />
      </span>
    );
  return (
    <span className={`emote-icon ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <GestureHand id={id} size={Math.round(size * 0.86)} />
    </span>
  );
});
