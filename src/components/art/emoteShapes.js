/**
 * As formas das mãos dos gestos (EmoteArt.jsx e figGesture.js), em grade de pixels. Versão 2.45:
 * separadas do componente.
 */
export const EMOTE_W = 18;
export const EMOTE_H = 20;
const W = EMOTE_W;
const H = EMOTE_H;

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

