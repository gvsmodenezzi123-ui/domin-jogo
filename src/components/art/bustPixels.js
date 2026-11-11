/**
 * Versão 2.17: o busto do rival sentado do outro lado da mesa é a figura nova inteira
 * (art/figurePixels.js, 88×84: a cabeça grande, os ombros e o peito, com o objeto de cada um).
 * O pé do busto escurece na sombra da beirada da mesa, que cobre o resto.
 *
 * `silhouette`: a figura escura com só o recorte da luz (o adversário do duelo on-line, que
 * não tem retrato).
 */
import { paintKit } from './botecoScene.js';
import { FIG_H, FIG_MOUTH, FIG_SHOULDER, FIG_W, paintFigure } from './figurePixels.js';

const { hex, buffer } = paintKit;

export const BUST_W = FIG_W;
export const BUST_H = FIG_H;
/** A linha que senta na beirada da mesa (um pouco abaixo dos ombros) e a da boca. */
export const BUST_RAIL = FIG_SHOULDER + 8;
export const BUST_MOUTH = FIG_MOUTH;

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
  const out = paintFigure(spec, mood, speaking);
  // a beirada da mesa faz sombra no peito: o pé do busto escurece
  for (let y = BUST_RAIL - 8; y < BUST_H; y += 1) {
    const k = ((y - (BUST_RAIL - 8)) / (BUST_H - (BUST_RAIL - 8))) * 0.42;
    for (let x = 0; x < BUST_W; x += 1) if (alphaAt(out, x, y)) out.put(x, y, [8, 5, 3], k);
  }
  return silhouette ? silhouetteOf(out) : out;
}
