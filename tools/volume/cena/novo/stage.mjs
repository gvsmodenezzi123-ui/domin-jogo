// O que as telas do visual novo dividem: o palco fixo de 896 × 414 visto de frente (quase
// ortográfico: 1 unidade da cena = 1 px do palco), o giro no plano da tela e a letra 3×5 sem
// perspectiva.
import { pixelText, textWidth } from '../../../../src/components/art/pixelFont.js';

export const W = 896;
export const H = 414;
export const CAM = [W / 2, H / 2, 1e5];

/** O ponto (x, y) girado de `ang` (rad) em volta de (cx, cy): as coordenadas locais. */
export function rot(x, y, cx, cy, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [(x - cx) * c + (y - cy) * s, -(x - cx) * s + (y - cy) * c];
}

/** Escreve `text` (letra 3×5, escala s) centrado em cx, com o alto em ty, direto na tela. */
export function textFlat(ctx, text, cx, ty, color, allow = null, s = 2) {
  const w = textWidth(text, s);
  const buf = {
    put: (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= ctx.W || y >= ctx.H) return;
      const q = y * ctx.W + x;
      if (allow && !allow.has(ctx.mat[q])) return;
      ctx.set(q, typeof color === 'function' ? color(q) : color);
    },
  };
  pixelText(buf, text, Math.round(cx - w / 2), Math.round(ty), null, { s });
}
