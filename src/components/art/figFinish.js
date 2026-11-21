/**
 * Versão 2.46: o acabamento da figura em alta (HD). Cada parte é pintada numa CAMADA
 * (art/figKit.js, `layer`): o que vem na frente (o queixo, o cabelo, a aba do chapéu, o objeto
 * da mão) joga a sua sombra para baixo, no que está atrás (o pescoço, a testa, o peito), com a
 * luz da lâmpada vindo de cima e um pouco da esquerda. Depois a luz fria do neon recorta a borda
 * da direita (e o alto do lado direito), para a figura descolar do fundo escuro do boteco.
 */
import { hex, mix } from './figKit.js';

export const LAYER = { behind: 1, hatBack: 2, hairBack: 3, body: 4, neck: 5, ears: 6, head: 7, facial: 8, hair: 9, hat: 10, glasses: 11, front: 12 };

/** O comprimento (em finos) da sombra que cada camada joga nas de trás. */
const CAST = { [LAYER.head]: 6, [LAYER.facial]: 2, [LAYER.hair]: 4, [LAYER.hat]: 6, [LAYER.glasses]: 2, [LAYER.front]: 5, [LAYER.ears]: 2 };

const SHADE = hex('#24122e');
const RIM = hex('#a9c8ff');

export function finishHD(k, { rim = true, cast = true } = {}) {
  const { w, h, data, zbuf } = k;
  const alpha = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && data[(Y * w + X) * 4 + 3] > 0;
  if (cast) {
    const s = new Uint8Array(w * h);
    for (let Y = 0; Y < h; Y += 1) {
      for (let X = 0; X < w; X += 1) {
        const p = Y * w + X;
        if (!data[p * 4 + 3]) continue;
        const z = zbuf[p];
        let best = 0;
        for (let t = 1; t <= 7; t += 1) {
          const QX = X - Math.round(t * 0.35);
          const QY = Y - t;
          if (QY < 0 || QX < 0) break;
          const q = QY * w + QX;
          if (!data[q * 4 + 3]) continue;
          const zq = zbuf[q];
          if (zq <= z) continue;
          const len = CAST[zq] ?? 0;
          if (t > len) continue;
          best = Math.max(best, t <= Math.ceil(len / 2) ? 2 : 1);
        }
        s[p] = best;
      }
    }
    for (let p = 0; p < w * h; p += 1) {
      if (!s[p]) continue;
      const i = p * 4;
      const c = [data[i], data[i + 1], data[i + 2]];
      const dark = mix(mix(c, [0, 0, 0], 0.5), SHADE, 0.3);
      const d = mix(c, dark, s[p] === 2 ? 0.46 : 0.26);
      data[i] = d[0];
      data[i + 1] = d[1];
      data[i + 2] = d[2];
    }
  }
  if (rim) {
    // a borda da direita (e o alto, do meio para a direita) pega a luz fria
    const marks = [];
    for (let Y = 0; Y < h; Y += 1) {
      for (let X = Math.floor(w * 0.5); X < w; X += 1) {
        if (!alpha(X, Y)) continue;
        const right = !alpha(X + 1, Y);
        const top = !alpha(X, Y - 1) && X > w * 0.56;
        if (right) marks.push(X, Y, 0.3);
        else if (top) marks.push(X, Y, 0.16);
        if (right && alpha(X - 1, Y)) marks.push(X - 1, Y, 0.1);
      }
    }
    for (let i = 0; i < marks.length; i += 3) {
      const j = (marks[i + 1] * w + marks[i]) * 4;
      const d = mix([data[j], data[j + 1], data[j + 2]], RIM, marks[i + 2]);
      data[j] = d[0];
      data[j + 1] = d[1];
      data[j + 2] = d[2];
    }
  }
}
