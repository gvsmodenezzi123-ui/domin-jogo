/**
 * Versão 2.11: a luz das cenas deitadas. Pinta-se a cena "de dia" (as cores de verdade de cada
 * coisa) e depois a luz passa por cima: cada pixel recebe a luz ambiente (a noite, fria) mais a
 * de cada lâmpada, neon, TV ou janela, que cai com a distância (e, nas pendentes, mais forte
 * dentro do cone). A conta sai em degraus pontilhados (Bayer), como a luz dos jogos de 16 bits.
 * O que brilha por si (o bulbo, o neon, a tela da TV, o vidro da janela) fica marcado e não
 * escurece.
 */
import { paintKit } from './botecoScene.js';

const { bayer } = paintKit;

/**
 * Um buffer que pinta no `b` deslocado de (ox, oy) (a pintura com sobra em volta do palco, para
 * telas mais altas ou mais largas que 16:9: as coordenadas continuam as do palco, e a sobra fica
 * nas negativas e depois de 500 × 225) e chama `mark(i, a)` em cada pixel pintado (as máscaras).
 */
function proxy(b, mark, ox = 0, oy = 0) {
  const put = (x, y, c, a = 1) => {
    const xi = Math.floor(x) + ox;
    const yi = Math.floor(y) + oy;
    if (xi < 0 || yi < 0 || xi >= b.w || yi >= b.h || a <= 0) return;
    b.put(xi, yi, c, a);
    mark(yi * b.w + xi, a);
  };
  const rect = (x, y, w, h, c, a = 1) => {
    for (let yy = Math.max(-oy, y | 0); yy < Math.min(b.h - oy, (y + h) | 0); yy += 1) for (let xx = Math.max(-ox, x | 0); xx < Math.min(b.w - ox, (x + w) | 0); xx += 1) put(xx, yy, c, a);
  };
  const ellipse = (cx, cy, rx, ry, c, a = 1) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) put(x, y, c, a);
      }
    }
  };
  const line = (x0, y0, x1, y1, c, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i += 1) put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c, a);
  };
  const light = (x, y, rw, rh, tint, amount) => {
    for (let yy = Math.max(-oy, y | 0); yy < Math.min(b.h - oy, (y + rh) | 0); yy += 1) {
      for (let xx = Math.max(-ox, x | 0); xx < Math.min(b.w - ox, (x + rw) | 0); xx += 1) {
        const t = amount(xx, yy);
        if (t > 0) b.put(xx + ox, yy + oy, tint, Math.min(1, t) * 0.9);
      }
    }
  };
  const get = (x, y) => b.get(x + ox, y + oy);
  return { w: b.w - ox, h: b.h - oy, data: b.data, get, put, rect, ellipse, line, light };
}

/** O buffer com a sobra: pinta-se em coordenadas do palco (veja `proxy`). */
export const shifted = (b, ox, oy) => proxy(b, () => {}, ox, oy);

/**
 * O que brilha por si: um buffer que pinta e marca na máscara (`mask`). Quem é pintado por cima
 * com `solidOver` volta a receber a luz da sala.
 */
export function glowLayer(b, ox = 0, oy = 0) {
  const mask = new Uint8Array(b.w * b.h);
  const g = proxy(
    b,
    (i, a) => {
      if (a >= 0.5) mask[i] = 1;
    },
    ox,
    oy,
  );
  /** Pinta por cima do que brilha, devolvendo o pixel à luz da sala (garrafas na frente do fundo aceso). */
  const solid = () =>
    proxy(
      b,
      (i, a) => {
        if (a >= 0.5) mask[i] = 0;
      },
      ox,
      oy,
    );
  return { ...g, mask, solid };
}

/**
 * Luz que chega em (x, y): a ambiente mais a de cada fonte.
 *   { x, y, r, c: [r, g, b], k, sy?, cone?, out? }
 *   r: alcance (px); k: força; sy: achata o círculo na vertical (> 1 = mais curto em cima/embaixo)
 *   cone: meia-abertura (rad) do facho para baixo; out: quanto sobra fora do facho (0..1)
 */
export function lightAt(lights, x, y, ambient) {
  let lr = ambient[0];
  let lg = ambient[1];
  let lb = ambient[2];
  for (const L of lights) {
    const dx = x - L.x;
    // versão 2.13: descarta antes da raiz quem está fora do alcance (a conta é a mesma)
    if (dx >= L.r || dx <= -L.r) continue;
    const dy = (y - L.y) * (L.sy ?? 1);
    if (dy >= L.r || dy <= -L.r) continue;
    const d2 = dx * dx + dy * dy;
    if (d2 >= L.r * L.r) continue;
    const d = Math.sqrt(d2);
    let f = 1 - d / L.r;
    f *= f;
    if (L.cone) {
      const below = y - L.y;
      const ang = below > 0 ? Math.abs(Math.atan2(dx, below)) : Math.PI;
      const inCone = ang <= L.cone ? 1 : Math.max(0, 1 - (ang - L.cone) / 0.2);
      const out = L.out ?? 0.3;
      f *= out + (1 - out) * inCone;
    }
    lr += L.c[0] * f * L.k;
    lg += L.c[1] * f * L.k;
    lb += L.c[2] * f * L.k;
  }
  return [lr, lg, lb];
}

/** Passa a luz por cima de `b` (só nos pixels pintados; o que está em `mask` fica como está). */
export function relight(b, lights, { ambient = [0.2, 0.2, 0.26], mask = null, bands = 7, cap = 1.45, ox = 0, oy = 0 } = {}) {
  const { w, h, data } = b;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      const i = p * 4;
      if (!data[i + 3] || (mask && mask[p])) continue;
      const l = lightAt(lights, x - ox, y - oy, ambient);
      const top = Math.max(l[0], l[1], l[2], 0.0001);
      const q = Math.min(cap, Math.max(0, Math.round(top * bands + bayer(x, y) - 0.5) / bands));
      const k = q / top;
      data[i] = Math.min(255, data[i] * l[0] * k);
      data[i + 1] = Math.min(255, data[i + 1] * l[1] * k);
      data[i + 2] = Math.min(255, data[i + 2] * l[2] * k);
    }
  }
}

/** Halo de quem brilha: clareia em volta (modo "tela"), em pontilhado. */
export function halo(b, cx, cy, radius, color, amount = 0.5, sy = 1) {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(b.w, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius / sy));
  const y1 = Math.min(b.h, Math.ceil(cy + radius / sy));
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const d = Math.hypot(x - cx, (y - cy) * sy) / radius;
      if (d >= 1) continue;
      const t = (1 - d) * (1 - d) * amount;
      const steps = Math.round(t * 6 + bayer(x, y) - 0.5) / 6;
      if (steps <= 0) continue;
      const i = (y * b.w + x) * 4;
      if (!b.data[i + 3]) continue;
      for (let c = 0; c < 3; c += 1) b.data[i + c] = 255 - ((255 - b.data[i + c]) * (255 - color[c] * steps)) / 255;
    }
  }
}

/** Vinheta: escurece em volta do retângulo do palco (x0, y0, w, h em px do buffer). */
export function vignetteBox(b, x0, y0, w, h, strength = 0.6, cy = 0.42) {
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      const dx = (x - x0 - w / 2) / (w * 0.62);
      const dy = (y - y0 - h * cy) / (h * 0.8);
      const t = Math.max(0, Math.hypot(dx, dy) - 0.45) * strength * 1.6;
      if (t > 0) b.put(x, y, [0, 0, 0], Math.min(1, t) * 0.9);
    }
  }
}
