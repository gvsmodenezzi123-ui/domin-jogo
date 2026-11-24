// Do render em volume (render.mjs) para a pixel art: o material da maioria em cada pixel, a luz
// suavizada dentro do mesmo material, os degraus de tom (pontilhados nas superfícies grandes),
// a cor da luz puxando a tinta, os desenhos por cima (decals), os contornos, os halos e a vinheta.
import { ramp } from '../kit.mjs';

export const STEPS = [0.15, 0.26, 0.39, 0.56, 0.8];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * cfg: W, H, colors {mat: [hex, kind]}, dither (Set), spec (Set), emissive (Set),
 * flats (Set: planos sem quina entre vizinhos do mesmo material), noEdge (Set: sem contorno de
 * material), steps, decals(ctx) (antes dos contornos), post(ctx) (depois), vignette (obj|false),
 * tintK (o quanto a cor da luz puxa a tinta; 0.3).
 */
export function pixelPass(R, cfg) {
  const { W, H } = cfg;
  const ss = R.ss;
  const steps = cfg.steps ?? STEPS;
  const DITHER = cfg.dither ?? new Set();
  const SPEC = cfg.spec ?? new Set();
  const EMISSIVE = cfg.emissive ?? new Set();
  const FLATS = cfg.flats ?? new Set();
  const NOEDGE = cfg.noEdge ?? new Set();
  const tintK = cfg.tintK ?? 0.3;
  const RAMP = {};
  for (const [m, [c, kind]] of Object.entries(cfg.colors)) RAMP[m] = ramp(c, kind ?? 'cloth');

  const n = W * H;
  const mat = new Uint8Array(n);
  const lit = new Float32Array(n);
  const tint = new Float32Array(n * 3);
  const z = new Float32Array(n).fill(-1e9);
  const spec = new Float32Array(n);
  const cover = new Float32Array(n);
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const counts = new Map();
      let hits = 0;
      for (let j = 0; j < ss; j += 1)
        for (let i = 0; i < ss; i += 1) {
          const k = (y * ss + j) * W * ss + x * ss + i;
          const m = R.mat[k];
          if (!m) continue;
          hits += 1;
          const c = counts.get(m) ?? { n: 0, lit: 0, t: [0, 0, 0], z: -1e9, spec: 0 };
          c.n += 1;
          c.lit += R.lit[k];
          c.t[0] += R.tint[k * 3];
          c.t[1] += R.tint[k * 3 + 1];
          c.t[2] += R.tint[k * 3 + 2];
          c.z = Math.max(c.z, R.z[k]);
          c.spec = Math.max(c.spec, R.spec[k]);
          counts.set(m, c);
        }
      let best = null;
      let bm = 0;
      for (const [m, c] of counts) if (!best || c.n > best.n) [best, bm] = [c, m];
      // (nas salas de dia, o pixel que é mais céu do que coisa fica vazio: o céu de trás aparece)
      if (!best || hits * 2 < ss * ss) continue;
      const p = y * W + x;
      mat[p] = bm;
      cover[p] = hits / (ss * ss);
      lit[p] = best.lit / best.n;
      tint[p * 3] = best.t[0] / best.n;
      tint[p * 3 + 1] = best.t[1] / best.n;
      tint[p * 3 + 2] = best.t[2] / best.n;
      z[p] = best.z;
      spec[p] = best.spec;
    }
  const tone = new Int8Array(n);
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!mat[p]) continue;
      let sum = 0;
      let ws = 0;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const q = (y + dy) * W + x + dx;
          if (x + dx < 0 || y + dy < 0 || x + dx >= W || y + dy >= H || mat[q] !== mat[p] || Math.abs(z[q] - z[p]) > 3) continue;
          const wt = dx || dy ? 0.6 : 1;
          sum += lit[q] * wt;
          ws += wt;
        }
      const I = sum / ws;
      let t = 0;
      while (t < steps.length && I >= steps[t]) t += 1;
      if (DITHER.has(mat[p]) && t < steps.length) {
        const lo = t ? steps[t - 1] : 0;
        const f = (I - lo) / (steps[t] - lo);
        if (f > 0.5 + (bayer(x, y) - 0.5) * 0.9 && f > 0.55) t += 1;
      }
      if (EMISSIVE.has(mat[p])) t = 5;
      if (spec[p] > 0.42 && SPEC.has(mat[p])) t = 6;
      tone[p] = Math.min(6, t);
    }
  const img = new Uint8ClampedArray(n * 4);
  const colorOf = (p, rampArr = RAMP[mat[p]], tn = tone[p]) => {
    const c = rampArr[Math.max(0, Math.min(6, tn))];
    if (EMISSIVE.has(mat[p])) return c;
    const tr = tint[p * 3];
    const tg = tint[p * 3 + 1];
    const tb = tint[p * 3 + 2];
    return [c[0] * (1 - tintK + tintK * tr), c[1] * (1 - tintK + tintK * tg), c[2] * (1 - tintK + tintK * tb)];
  };
  const set = (p, c, a = 255) => {
    img[p * 4] = c[0];
    img[p * 4 + 1] = c[1];
    img[p * 4 + 2] = c[2];
    img[p * 4 + 3] = a;
  };
  for (let p = 0; p < n; p += 1) if (mat[p]) set(p, colorOf(p));

  const ctx = { W, H, mat, lit, tint, z, spec, tone, img, RAMP, set, colorOf, bayer, cover, EMISSIVE };
  cfg.decals?.(ctx);

  // os contornos: a quina (salto de profundidade) e a divisa de dois materiais
  const INK = cfg.ink ?? [14, 9, 8];
  const line = new Uint8Array(n);
  for (let y = 1; y < H - 1; y += 1)
    for (let x = 1; x < W - 1; x += 1) {
      const p = y * W + x;
      if (!mat[p]) continue;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (!mat[q]) {
          // (a borda contra o céu também ganha o traço)
          if (cfg.skyEdge) line[p] = Math.max(line[p], 1);
          continue;
        }
        const jump = z[q] - z[p];
        if (mat[q] === mat[p] && FLATS.has(mat[p])) continue;
        if (jump > 3) line[p] = Math.max(line[p], jump > 10 ? 2 : 1);
        else if (mat[q] !== mat[p] && jump > -0.5 && !NOEDGE.has(mat[p]) && !NOEDGE.has(mat[q]) && !EMISSIVE.has(mat[p])) line[p] = Math.max(line[p], 1);
      }
    }
  for (let p = 0; p < n; p += 1) {
    if (!line[p] || EMISSIVE.has(mat[p])) continue;
    const r = RAMP[mat[p]];
    set(p, line[p] === 2 ? mix(r[0], INK, 0.6) : mix(r[0], r[1], 0.25), img[p * 4 + 3]);
  }
  cfg.post?.(ctx);
  // a vinheta
  const v = cfg.vignette === false ? null : { cx: W / 2, cy: H * 0.4, rx: W * 0.62, ry: H * 0.85, start: 0.55, k: 1.4, max: 0.8, ...(cfg.vignette ?? {}) };
  if (v)
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        const t = Math.max(0, Math.hypot((x - v.cx) / v.rx, (y - v.cy) / v.ry) - v.start) * v.k;
        if (t > bayer(x, y) * 0.25) for (let c = 0; c < 3; c += 1) img[p * 4 + c] *= 1 - Math.min(v.max, t);
      }
  return ctx;
}

/** Soma o halo de uma luz por cima (pontilhado nas bordas). */
export function halo(ctx, hx, hy, rad, c, amt, power = 2) {
  const { W, H, img } = ctx;
  for (let y = Math.max(0, Math.floor(hy - rad)); y < Math.min(H, hy + rad); y += 1)
    for (let x = Math.max(0, Math.floor(hx - rad)); x < Math.min(W, hx + rad); x += 1) {
      const d = Math.hypot(x - hx, y - hy) / rad;
      if (d >= 1) continue;
      const a = amt * (1 - d) ** power;
      if (a < bayer(x, y) * 0.12) continue;
      const p = y * W + x;
      if (!img[p * 4 + 3]) continue;
      img[p * 4] = Math.min(255, img[p * 4] + c[0] * a);
      img[p * 4 + 1] = Math.min(255, img[p * 4 + 1] + c[1] * a);
      img[p * 4 + 2] = Math.min(255, img[p * 4 + 2] + c[2] * a);
    }
}

/** Um facho de luz em cone (de cima para baixo) somado por cima, como na fumaça. */
export function beam(ctx, lx, ly, len, spread0, spread1, c, amt) {
  const { W, H, img } = ctx;
  for (let y = Math.max(0, Math.floor(ly)); y < Math.min(H, ly + len); y += 1) {
    const t = (y - ly) / len;
    const half = spread0 + (spread1 - spread0) * t;
    for (let x = Math.max(0, Math.floor(lx - half)); x < Math.min(W, lx + half); x += 1) {
      const d = Math.abs(x - lx) / half;
      const a = amt * (1 - d) * (1 - t) ** 1.2;
      if (a < bayer(x, y) * 0.08) continue;
      const p = y * W + x;
      if (!img[p * 4 + 3]) continue;
      img[p * 4] = Math.min(255, img[p * 4] + c[0] * a);
      img[p * 4 + 1] = Math.min(255, img[p * 4 + 1] + c[1] * a);
      img[p * 4 + 2] = Math.min(255, img[p * 4 + 2] + c[2] * a);
    }
  }
}
