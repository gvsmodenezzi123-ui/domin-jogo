// Os desenhos por cima do render (letras pintadas, neon, juntas do chão), em px da tela.
import { CAM, planeAt, proj } from './common.mjs';
import { bayer } from './pixelpass.mjs';
import { pixelText, textWidth } from '../../../src/components/art/pixelFont.js';

export { textWidth };

/** Escreve `text` (letra 3×5, escala s) centrado em x, com o alto em y, no plano z (projetado). */
export function textAt(ctx, text, cx, ty, z, color, allow = null, s = 2) {
  const [px, py] = proj(cx, ty, z);
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
  pixelText(buf, text, Math.round(px - w / 2), Math.round(py), null, { s });
}

/** Os pixels acesos de `text` na letra 3×5 (escala 1): [[col, row], ...] e a largura. */
export function glyphCells(text) {
  const cells = [];
  pixelText({ put: (x, y) => cells.push([x, y]) }, text, 0, 0, null, { s: 1 });
  return { cells, w: textWidth(text, 1) };
}

/** Pinta um pixel da tela por cima (só onde já tem coisa, a menos que `any`). */
export function dot(ctx, x, y, c, any = false) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= ctx.W || y >= ctx.H) return;
  const q = y * ctx.W + x;
  if (!any && !ctx.img[q * 4 + 3]) return;
  ctx.set(q, c);
}
/** Uma linha grossa (disco arrastado) de (x0, y0) a (x1, y1). */
export function stroke(ctx, x0, y0, x1, y1, r, c, any = false) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  const seen = new Set();
  for (let i = 0; i <= n; i += 1) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 1) {
        if (dx * dx + dy * dy > r * r + 0.25) continue;
        const k = `${Math.round(x + dx)},${Math.round(y + dy)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        dot(ctx, x + dx, y + dy, c, any);
      }
  }
}

/**
 * O letreiro de neon: as letras 3×5 viram tubos (cada pixel aceso, um nó; vizinhos ligados), a
 * casca colorida e o miolo quase branco. (x, y): o alto à esquerda na tela; S: px por pixel da letra.
 */
export function neonText(ctx, text, x, y, S, outer, core, r = 2.2) {
  const { cells } = glyphCells(text);
  const on = new Set(cells.map(([cx, cy]) => `${cx},${cy}`));
  const at = (cx, cy) => [x + cx * S + S / 2, y + cy * S + S / 2];
  for (const pass of [0, 1])
    for (const [cx, cy] of cells) {
      const [ax, ay] = at(cx, cy);
      const rr = pass ? r * 0.45 : r;
      const c = pass ? core : outer;
      stroke(ctx, ax, ay, ax, ay, rr, c);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [1, 1],
        [-1, 1],
      ]) {
        if (!on.has(`${cx + dx},${cy + dy}`)) continue;
        // (a diagonal só liga quando não tem caminho reto entre os dois: o S, o C e o 2 viram tubo)
        if (dx && dy && (on.has(`${cx + dx},${cy}`) || on.has(`${cx},${cy + dy}`))) continue;
        const [bx, by] = at(cx + dx, cy + dy);
        stroke(ctx, ax, ay, bx, by, rr, c);
      }
    }
}

/** Um anel de neon (centro, raio, grossura). */
export function neonRing(ctx, cx, cy, rad, outer, core, r = 2) {
  const n = Math.ceil(rad * 8);
  for (const pass of [0, 1])
    for (let i = 0; i <= n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      stroke(ctx, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, pass ? r * 0.45 : r, pass ? core : outer);
    }
}

/**
 * As juntas de um chão (tábuas, placas, lajotas) no plano y = floorY, pixel a pixel: a junta é o
 * pixel por onde passa a divisa (sem falhar nem engordar). `pw` × `pl`: o tamanho da peça (x × z);
 * `stagger(col)`: o desencontro de cada coluna. `paint(p, seam, col, run, wx, wz)` decide a cor.
 */
export function floorGrid(ctx, matSet, floorY, pw, pl, paint, stagger = (col) => ((((col * 53) % pl) + pl) % pl)) {
  const { W, H, mat } = ctx;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!matSet.has(mat[p]) || y <= CAM[1]) continue;
      const [wx, wz] = planeAt(x + 0.5, y + 0.5, floorY);
      const col = Math.floor(wx / pw);
      const off = stagger(col);
      const run = Math.floor((wz + off) / pl);
      const seamX = Math.floor(planeAt(x, y + 0.5, floorY)[0] / pw) !== Math.floor(planeAt(x + 1, y + 0.5, floorY)[0] / pw);
      const seamZ = Math.floor((planeAt(x + 0.5, y, floorY)[1] + off) / pl) !== Math.floor((planeAt(x + 0.5, y + 1, floorY)[1] + off) / pl);
      paint(p, seamX || seamZ, col, run, wx, wz, x, y);
    }
}

/** Escurece (k < 0) ou clareia (k > 0) o tom do pixel, em pontilhado quando `dither`. */
export function nudge(ctx, p, k, dither = false, x = 0, y = 0) {
  if (dither && bayer(x, y) > Math.abs(k % 1 || 1) * 0.999) return;
  ctx.set(p, ctx.colorOf(p, ctx.RAMP[ctx.mat[p]], ctx.tone[p] + Math.trunc(k) + (k % 1 && !dither ? Math.sign(k) : 0)));
}

/** Um hash 0..1 de inteiros. */
export const hash2 = (a, b) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Uma névoa por cima (a fumaça), mais forte em cima, em pontilhado. */
export function smoke(ctx, color, amount, yEnd) {
  const { W, H, img } = ctx;
  for (let y = 0; y < Math.min(H, yEnd); y += 1)
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!img[p * 4 + 3]) continue;
      const a = amount * (1 - y / yEnd) * (0.75 + 0.25 * Math.sin(x * 0.021 + y * 0.05) * Math.sin(x * 0.007 - y * 0.03));
      if (a < bayer(x, y) * 0.06) continue;
      for (let c = 0; c < 3; c += 1) img[p * 4 + c] = img[p * 4 + c] + (color[c] - img[p * 4 + c]) * a;
    }
}
