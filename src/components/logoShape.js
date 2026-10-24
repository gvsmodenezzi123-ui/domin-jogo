// Forma das letras do logo BUXARIA (grade de 7x10 por letra, cantos chanfrados). Fica fora do
// componente para a abertura também usar (o letreiro de neon da rua).

const GLYPHS = {
  B: {
    w: 7,
    rings: [
      [[0, 0], [6, 0], [7, 1], [7, 4], [6, 5], [7, 6], [7, 9], [6, 10], [0, 10]],
      [[2, 2], [5, 2], [5, 4], [2, 4]],
      [[2, 6], [5, 6], [5, 8], [2, 8]],
    ],
  },
  U: { w: 7, rings: [[[0, 0], [2, 0], [2, 8], [5, 8], [5, 0], [7, 0], [7, 9], [6, 10], [1, 10], [0, 9]]] },
  X: {
    w: 7,
    rings: [[[0, 0], [2, 0], [3.5, 3.2], [5, 0], [7, 0], [4.6, 5], [7, 10], [5, 10], [3.5, 6.8], [2, 10], [0, 10], [2.4, 5]]],
  },
  A: {
    w: 7,
    rings: [
      [[1, 0], [6, 0], [7, 1], [7, 10], [5, 10], [5, 7], [2, 7], [2, 10], [0, 10], [0, 1]],
      [[2, 2], [5, 2], [5, 5], [2, 5]],
    ],
  },
  R: {
    w: 7,
    rings: [
      [[0, 0], [6, 0], [7, 1], [7, 5], [6, 6], [5.4, 6], [7, 10], [5, 10], [3.3, 6], [2, 6], [2, 10], [0, 10]],
      [[2, 2], [5, 2], [5, 4], [2, 4]],
    ],
  },
  I: { w: 6, rings: [[[0, 0], [6, 0], [6, 2], [4, 2], [4, 8], [6, 8], [6, 10], [0, 10], [0, 8], [2, 8], [2, 2], [0, 2]]] },
};

const WORD = 'BUXARIA';
const GAP = 1.4;

export const LETTERS = (() => {
  let x = 0;
  return Array.from(WORD, (ch, i) => {
    const glyph = GLYPHS[ch];
    const d = glyph.rings
      .map((ring) => `M${ring.map(([px, py]) => `${(px + x).toFixed(2)} ${py}`).join('L')}Z`)
      .join('');
    const letter = { key: `${ch}${i}`, d, x, w: glyph.w };
    x += glyph.w + GAP;
    return letter;
  });
})();
export const WIDTH = LETTERS.at(-1).x + LETTERS.at(-1).w;
export const WORD_D = LETTERS.map((l) => l.d).join('');
