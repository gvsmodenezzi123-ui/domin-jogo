/**
 * Versão 2.11: a letra miúda 3×5 das placas pintadas (FIADO SÓ AMANHÃ, o neon do BOTECO, os
 * preços a giz). Cada letra são 5 linhas de 3 bits (o M e o W, de 5); os acentos caem na
 * letra sem acento.
 */
const GLYPHS = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '1000111011101011000110001',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101110011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '1000110001101011101110001',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  0: '111101101101111',
  1: '010110010010111',
  2: '110001010100111',
  3: '110001010001110',
  4: '101101111001001',
  5: '111100110001110',
  6: '011100110101010',
  7: '111001010010010',
  8: '010101010101010',
  9: '010101011001110',
  $: '011110010011110',
  '.': '000000000000010',
  ',': '000000000010100',
  '!': '010010010000010',
  '?': '110001010000010',
  '-': '000000111000000',
  ':': '000010000010000',
  '/': '001001010100100',
  '+': '000010111010000',
  '%': '101001010100101',
  ' ': '000000000000000',
};

const PLAIN = { Á: 'A', À: 'A', Â: 'A', Ã: 'A', É: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Õ: 'O', Ú: 'U', Ç: 'C' };

const glyphOf = (raw) => GLYPHS[PLAIN[raw] ?? raw] ?? GLYPHS[' '];
const widthOf = (g) => g.length / 5;

/** Largura (px) de `text` na letra 3×5 com escala `s`. */
export const textWidth = (text, s = 1) => Math.max(0, [...text.toUpperCase()].reduce((sum, ch) => sum + (widthOf(glyphOf(ch)) + 1) * s, 0) - s);

/**
 * Escreve `text` em `b` a partir de (x, y), com `put(x, y, cor, alfa)` (o do buffer, ou um que
 * também marque o que brilha). Devolve a largura.
 */
export function pixelText(b, text, x, y, color, { s = 1, alpha = 1, put = b.put } = {}) {
  let cx = Math.round(x);
  for (const raw of text.toUpperCase()) {
    const g = glyphOf(raw);
    const gw = widthOf(g);
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < gw; col += 1) {
        if (g[row * gw + col] !== '1') continue;
        for (let dy = 0; dy < s; dy += 1) for (let dx = 0; dx < s; dx += 1) put(cx + col * s + dx, Math.round(y) + row * s + dy, color, alpha);
      }
    }
    cx += (gw + 1) * s;
  }
  return textWidth(text, s);
}
