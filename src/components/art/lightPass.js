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

/**
 * Versão 2.46: a cena em alta. A sala é pintada na grade de sempre (cada pixel = 2 px de CSS) e
 * ampliada `S` vezes em blocos (`upscale`); a LUZ é que passa no fino: cada pixel fino recebe a
 * conta da lâmpada no meio dele, com o pontilhado na grade fina e o dobro de degraus, então o
 * facho, os halos e a vinheta saem lisos em cima do desenho de pixel.
 */
/** Quantos pixels finos cada pixel das telas deitadas ganha (a luz delas passa no fino). */
export const LAND_HD = 2;

export function upscale(b, S, mask = null) {
  const W = b.w * S;
  const H = b.h * S;
  const data = new Uint8ClampedArray(W * H * 4);
  const src = new Uint32Array(b.data.buffer, b.data.byteOffset, b.w * b.h);
  const dst = new Uint32Array(data.buffer);
  const m2 = mask ? new Uint8Array(W * H) : null;
  for (let y = 0; y < b.h; y += 1) {
    const row = y * S * W;
    for (let x = 0; x < b.w; x += 1) {
      const v = src[y * b.w + x];
      const m = m2 ? mask[y * b.w + x] : 0;
      for (let k = 0; k < S; k += 1) {
        dst[row + x * S + k] = v;
        if (m) m2[row + x * S + k] = m;
      }
    }
    for (let j = 1; j < S; j += 1) {
      dst.copyWithin(row + j * W, row, row + W);
      if (m2) m2.copyWithin(row + j * W, row, row + W);
    }
  }
  return { w: W, h: H, data, mask: m2, S, lw: b.w, lh: b.h };
}

/**
 * O buffer fino visto na grade lógica: `put`, `rect`, `ellipse` e `line` pintam blocos S×S; a
 * `light` (luz, sombra, vinheta) passa no fino, com a conta em coordenadas lógicas contínuas.
 */
export function logicalView(B) {
  const { S, lw, lh, data } = B;
  const W = B.w;
  const pput = (X, Y, c, a = 1) => {
    if (X < 0 || Y < 0 || X >= W || Y >= B.h || a <= 0) return;
    const i = (Y * W + X) * 4;
    if (a >= 1) {
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
      return;
    }
    const keep = data[i + 3] / 255;
    const out = a + keep * (1 - a);
    data[i] = (c[0] * a + data[i] * keep * (1 - a)) / out;
    data[i + 1] = (c[1] * a + data[i + 1] * keep * (1 - a)) / out;
    data[i + 2] = (c[2] * a + data[i + 2] * keep * (1 - a)) / out;
    data[i + 3] = out * 255;
  };
  const put = (x, y, c, a = 1) => {
    const X = Math.floor(x) * S;
    const Y = Math.floor(y) * S;
    for (let j = 0; j < S; j += 1) for (let k = 0; k < S; k += 1) pput(X + k, Y + j, c, a);
  };
  const rect = (x, y, w, h, c, a = 1) => {
    for (let yy = Math.max(0, y | 0); yy < Math.min(lh, (y + h) | 0); yy += 1) for (let xx = Math.max(0, x | 0); xx < Math.min(lw, (x + w) | 0); xx += 1) put(xx, yy, c, a);
  };
  const ellipse = (cx, cy, rx, ry, c, a = 1) => {
    for (let Y = Math.floor((cy - ry) * S) - 1; Y <= Math.ceil((cy + ry) * S) + 1; Y += 1) {
      for (let X = Math.floor((cx - rx) * S) - 1; X <= Math.ceil((cx + rx) * S) + 1; X += 1) {
        const dx = ((X + 0.5) / S - cx) / rx;
        const dy = ((Y + 0.5) / S - cy) / ry;
        if (dx * dx + dy * dy <= 1) pput(X, Y, c, a);
      }
    }
  };
  const line = (x0, y0, x1, y1, c, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i += 1) put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c, a);
  };
  /** A luz no fino: `amount(x, y)` em coordenadas lógicas contínuas; o pontilhado é o do fino. */
  const light = (x, y, rw, rh, tint, amount) => {
    for (let Y = Math.max(0, Math.floor(y * S)); Y < Math.min(B.h, Math.ceil((y + rh) * S)); Y += 1) {
      for (let X = Math.max(0, Math.floor(x * S)); X < Math.min(W, Math.ceil((x + rw) * S)); X += 1) {
        FINE_AT[0] = X;
        FINE_AT[1] = Y;
        const t = amount((X + 0.5) / S - 0.5, (Y + 0.5) / S - 0.5);
        if (t > 0) pput(X, Y, tint, Math.min(1, t) * 0.9);
      }
    }
    FINE_AT[0] = -1;
  };
  const get = (x, y) => {
    const i = ((Math.floor(y) * S) * W + Math.floor(x) * S) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  return { w: lw, h: lh, S, data, fine: B, put, pput, rect, ellipse, line, light, get };
}

/** O fino que a `light` da vista lógica está pintando (para o pontilhado fino), ou −1. */
export const FINE_AT = [-1, -1];
/** O pontilhado: no fino quando a vista lógica está pintando, senão no pixel dado. */
export const fineBayer = (x, y) => (FINE_AT[0] >= 0 ? bayer(FINE_AT[0], FINE_AT[1]) : bayer(x, y));

/** A luz no fino (veja `upscale`): as fontes e a ambiente em coordenadas lógicas. */
export function relightHD(B, lights, { ambient = [0.2, 0.2, 0.26], mask = null, bands = 7, cap = 1.45, ox = 0, oy = 0 } = {}) {
  const { w, h, data, S } = B;
  const nb = bands * 2;
  // a luz é lisa: conta-se no meio de cada pixel lógico e o fino interpola entre os quatro
  const lw = Math.ceil(w / S);
  const lh = Math.ceil(h / S);
  const grid = new Float32Array(lw * lh * 3);
  for (let y = 0; y < lh; y += 1) {
    for (let x = 0; x < lw; x += 1) {
      const l = lightAt(lights, x - ox, y - oy, ambient);
      const g = (y * lw + x) * 3;
      grid[g] = l[0];
      grid[g + 1] = l[1];
      grid[g + 2] = l[2];
    }
  }
  // os pesos de cada coluna fina (a vizinha da esquerda, a da direita e a fração)
  const cx0 = new Int32Array(w);
  const cx1 = new Int32Array(w);
  const cfx = new Float32Array(w);
  for (let X = 0; X < w; X += 1) {
    const x = Math.min(lw - 1, Math.max(0, (X + 0.5) / S - 0.5));
    cx0[X] = Math.floor(x) * 3;
    cx1[X] = Math.min(lw - 1, Math.floor(x) + 1) * 3;
    cfx[X] = x - Math.floor(x);
  }
  for (let Y = 0; Y < h; Y += 1) {
    const y = Math.min(lh - 1, Math.max(0, (Y + 0.5) / S - 0.5));
    const r0 = Math.floor(y) * lw * 3;
    const r1 = Math.min(lh - 1, Math.floor(y) + 1) * lw * 3;
    const fy = y - Math.floor(y);
    const by = (Y & 3) * 4;
    for (let X = 0; X < w; X += 1) {
      const p = Y * w + X;
      const i = p * 4;
      if (!data[i + 3] || (mask && mask[p])) continue;
      const a0 = r0 + cx0[X];
      const a1 = r0 + cx1[X];
      const b0 = r1 + cx0[X];
      const b1 = r1 + cx1[X];
      const fx = cfx[X];
      const top0 = grid[a0] + (grid[a1] - grid[a0]) * fx;
      const bot0 = grid[b0] + (grid[b1] - grid[b0]) * fx;
      const top1 = grid[a0 + 1] + (grid[a1 + 1] - grid[a0 + 1]) * fx;
      const bot1 = grid[b0 + 1] + (grid[b1 + 1] - grid[b0 + 1]) * fx;
      const top2 = grid[a0 + 2] + (grid[a1 + 2] - grid[a0 + 2]) * fx;
      const bot2 = grid[b0 + 2] + (grid[b1 + 2] - grid[b0 + 2]) * fx;
      const l0 = top0 + (bot0 - top0) * fy;
      const l1 = top1 + (bot1 - top1) * fy;
      const l2 = top2 + (bot2 - top2) * fy;
      const top = Math.max(l0, l1, l2, 0.0001);
      const q = Math.min(cap, Math.max(0, Math.round(top * nb + BAYER16[by + (X & 3)] - 0.5) / nb));
      const k = q / top;
      data[i] = data[i] * l0 * k;
      data[i + 1] = data[i + 1] * l1 * k;
      data[i + 2] = data[i + 2] * l2 * k;
    }
  }
}

const BAYER16 = Float32Array.from([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], (v) => (v + 0.5) / 16);

/** Passa a luz por cima de `b` (só nos pixels pintados; o que está em `mask` fica como está). */
export function relight(b, lights, { ambient = [0.2, 0.2, 0.26], mask = null, bands = 7, cap = 1.45, ox = 0, oy = 0 } = {}) {
  if ((b.S ?? 1) > 1) {
    relightHD(b, lights, { ambient, mask, bands, cap, ox, oy });
    return;
  }
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
  if ((b.S ?? 1) > 1) {
    // na HD: o halo no fino, com o dobro de degraus e o pontilhado fino
    const F = b.fine ?? b;
    const S = b.S;
    const X0 = Math.max(0, Math.floor((cx - radius) * S));
    const X1 = Math.min(F.w, Math.ceil((cx + radius) * S));
    const Y0 = Math.max(0, Math.floor((cy - radius / sy) * S));
    const Y1 = Math.min(F.h, Math.ceil((cy + radius / sy) * S));
    for (let Y = Y0; Y < Y1; Y += 1) {
      for (let X = X0; X < X1; X += 1) {
        const d = Math.hypot((X + 0.5) / S - 0.5 - cx, ((Y + 0.5) / S - 0.5 - cy) * sy) / radius;
        if (d >= 1) continue;
        const t = (1 - d) * (1 - d) * amount;
        const steps = Math.round(t * 12 + bayer(X, Y) - 0.5) / 12;
        if (steps <= 0) continue;
        const i = (Y * F.w + X) * 4;
        if (!F.data[i + 3]) continue;
        for (let c = 0; c < 3; c += 1) F.data[i + c] = 255 - ((255 - F.data[i + c]) * (255 - color[c] * steps)) / 255;
      }
    }
    return;
  }
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
  if ((b.S ?? 1) > 1) {
    // na HD: a vinheta lisa, no fino (coordenadas lógicas contínuas)
    const S = b.S;
    const d = b.data;
    const dx2 = new Float32Array(b.w);
    for (let X = 0; X < b.w; X += 1) {
      const dx = ((X + 0.5) / S - 0.5 - x0 - w / 2) / (w * 0.62);
      dx2[X] = dx * dx;
    }
    for (let Y = 0; Y < b.h; Y += 1) {
      const dy = ((Y + 0.5) / S - 0.5 - y0 - h * cy) / (h * 0.8);
      const dy2 = dy * dy;
      for (let X = 0; X < b.w; X += 1) {
        const r2 = dx2[X] + dy2;
        if (r2 <= 0.2025) continue;
        const t = (Math.sqrt(r2) - 0.45) * strength * 1.6;
        const a = Math.min(1, t) * 0.9;
        const i = (Y * b.w + X) * 4;
        if (!d[i + 3]) continue;
        d[i] *= 1 - a;
        d[i + 1] *= 1 - a;
        d[i + 2] *= 1 - a;
      }
    }
    return;
  }
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      const dx = (x - x0 - w / 2) / (w * 0.62);
      const dy = (y - y0 - h * cy) / (h * 0.8);
      const t = Math.max(0, Math.hypot(dx, dy) - 0.45) * strength * 1.6;
      if (t > 0) b.put(x, y, [0, 0, 0], Math.min(1, t) * 0.9);
    }
  }
}
