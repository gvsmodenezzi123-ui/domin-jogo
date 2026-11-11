/**
 * Versão 2.9: o busto do rival sentado do outro lado da mesa deitada. A cabeça, o rosto, a
 * roupa e os objetos são os do retrato 64×64 de cada um (portraitPixels.js, sem a parede); o
 * busto ganha o tronco descendo até a beirada da mesa (o peito continua a roupa de cada um:
 * gravata, listras, avental) e os dois braços caídos ao lado do corpo, com o cotovelo abrindo
 * para fora, de quem está apoiado na mesa. A luz vem da lâmpada (de cima e da esquerda) e o
 * pé do busto escurece na sombra da beirada, que cobre o resto.
 *
 * `silhouette`: a figura escura com só o recorte da luz (o adversário do duelo on-line, que
 * não tem retrato).
 */
import { paintKit } from './botecoScene.js';
import { PORTRAIT_PX } from './portraitPixels.js';
import { paintFigure } from './figurePixels.js';

const { hex, buffer } = paintKit;

/** O retrato fica no meio, com 12 px de cada lado para os braços. */
const OX = 12;
export const BUST_W = PORTRAIT_PX + OX * 2;
/** O tronco desce 12 px abaixo do retrato (a beirada da mesa cobre o pé). */
export const BUST_H = PORTRAIT_PX + 12;
const G = PORTRAIT_PX;

const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const alphaAt = (b, x, y) => (x < 0 || y < 0 || x >= b.w || y >= b.h ? 0 : b.data[(y * b.w + x) * 4 + 3]);
const colorAt = (b, x, y) => {
  const i = (y * b.w + x) * 4;
  return [b.data[i], b.data[i + 1], b.data[i + 2]];
};

/** Só a silhueta: tudo escuro, com o recorte quente da lâmpada na borda esquerda e no alto. */
function silhouetteOf(b) {
  const out = buffer(b.w, b.h);
  const dark = hex('#0d0907');
  const rim = hex('#c99a5a');
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      const a = alphaAt(b, x, y);
      if (a < 200) continue;
      const edge = !alphaAt(b, x - 1, y) || !alphaAt(b, x, y - 1);
      const lum = (colorAt(b, x, y).reduce((s, v) => s + v, 0) / 765) * 0.12;
      out.put(x, y, edge && y < b.h - 8 ? mix(dark, rim, 0.55) : mix(dark, hex('#3a2a20'), lum));
    }
  }
  return out;
}

/**
 * O busto de `spec` no humor `mood` (os mesmos do retrato: idle, thinking, smug, hurt, blink) e
 * com a boca aberta enquanto fala (`speaking`). BUST_W×BUST_H, fundo transparente.
 */
export function paintBust(spec, mood = 'idle', speaking = false, { silhouette = false } = {}) {
  // versão 2.17: o busto é a figura nova inteira (art/figurePixels.js), já com os braços
  const out = paintFigure(spec, mood, speaking);
  // a beirada da mesa faz sombra no peito: o pé do busto escurece
  for (let y = G - 8; y < BUST_H; y += 1) {
    const k = ((y - (G - 8)) / (BUST_H - (G - 8))) * 0.42;
    for (let x = 0; x < BUST_W; x += 1) if (alphaAt(out, x, y)) out.put(x, y, [8, 5, 3], k);
  }
  return silhouette ? silhouetteOf(out) : out;
}
