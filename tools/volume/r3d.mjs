// O motor genérico: raios ortográficos num modelo de distância com sinal, a luz, e a passagem para
// pixel art (tons por material, limpeza, contornos). Serve para a frente e para o perfil.
import { clamp, norm } from './sdf.mjs';
import { hex, mix } from '../../src/components/art/figKit.js';

export const INK = hex('#120a0a');
export const R7 = (...c) => c.map(hex);

/**
 * cfg:
 *   W, H                 o quadro (pixels finais)
 *   scene(x, y, z)       a distância (o material fica em cfg.mat())
 *   mat()                o material do último ponto avaliado
 *   shade(x, y, z)       (opcional) a cena usada para sombra e oclusão (padrão: scene)
 *   origin(sx, sy)       o ponto de partida do raio no modelo, [x, y, z]
 *   dir                  a direção do raio (unitária, no modelo)
 *   maxT                 o comprimento do raio
 *   key, fill, back      as luzes (direção do ponto para a luz, no modelo)
 *   w: { key, fill, back, amb }
 */
export function render(cfg, ss = 2) {
  const { W, H, scene, origin, dir, maxT } = cfg;
  const shadeScene = cfg.shade ?? scene;
  const view = [-dir[0], -dir[1], -dir[2]];
  const L = cfg.key;
  const F = cfg.fill;
  const B = cfg.back;
  const w = { key: 1, fill: 0.2, back: 0.45, amb: 0.12, ...(cfg.w ?? {}) };
  const hv = norm(L[0] + view[0], L[1] + view[1], L[2] + view[2]);
  const n = W * H * ss * ss;
  const out = { ss, mat: new Uint8Array(n), lit: new Float32Array(n), z: new Float32Array(n).fill(-1e9), spec: new Float32Array(n) };
  const normal = (x, y, z) => {
    const e = 0.12;
    const dx = scene(x + e, y, z) - scene(x - e, y, z);
    const dy = scene(x, y + e, z) - scene(x, y - e, z);
    const dz = scene(x, y, z + e) - scene(x, y, z - e);
    return norm(dx, dy, dz);
  };
  const softShadow = (x, y, z) => {
    let res = 1;
    let t = 0.6;
    for (let i = 0; i < 64 && t < 110; i += 1) {
      const h = shadeScene(x + L[0] * t, y + L[1] * t, z + L[2] * t);
      if (h < 0.02) return 0;
      res = Math.min(res, (9 * h) / t);
      t += clamp(h, 0.25, 4);
    }
    return clamp(res, 0, 1);
  };
  const occlusion = (x, y, z, nn) => {
    let occ = 0;
    let wt = 1;
    for (let i = 1; i <= 5; i += 1) {
      const d = i * 1.35;
      occ += (d - shadeScene(x + nn[0] * d, y + nn[1] * d, z + nn[2] * d)) * wt;
      wt *= 0.62;
    }
    return clamp(1 - occ * 0.14, 0, 1);
  };
  for (let j = 0; j < H * ss; j += 1) {
    const sy = (j + 0.5) / ss;
    for (let i = 0; i < W * ss; i += 1) {
      const sx = (i + 0.5) / ss;
      const o = origin(sx, sy);
      let t = 0;
      let hit = false;
      for (let s = 0; s < 260 && t < maxT; s += 1) {
        const d = scene(o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t);
        if (d < 0.03) {
          hit = true;
          break;
        }
        t += Math.max(d * 0.8, 0.04);
      }
      if (!hit) continue;
      const x = o[0] + dir[0] * t;
      const y = o[1] + dir[1] * t;
      const z = o[2] + dir[2] * t;
      scene(x, y, z);
      const m = cfg.mat();
      const k = j * W * ss + i;
      const nn = normal(x, y, z);
      const px = x + nn[0] * 0.25;
      const py = y + nn[1] * 0.25;
      const pz = z + nn[2] * 0.25;
      const dif = Math.max(0, nn[0] * L[0] + nn[1] * L[1] + nn[2] * L[2]);
      const sh = dif > 0 ? softShadow(px, py, pz) : 0;
      const ao = occlusion(x, y, z, nn);
      const fill = Math.max(0, nn[0] * F[0] + nn[1] * F[1] + nn[2] * F[2]);
      const back = Math.max(0, nn[0] * B[0] + nn[1] * B[1] + nn[2] * B[2]);
      const facing = 1 - Math.max(0, nn[0] * view[0] + nn[1] * view[1] + nn[2] * view[2]);
      const spec = Math.max(0, nn[0] * hv[0] + nn[1] * hv[1] + nn[2] * hv[2]) ** 28 * sh;
      out.mat[k] = m;
      out.z[k] = -t;
      out.spec[k] = spec;
      out.lit[k] = w.key * dif * (0.25 + 0.75 * sh) * (0.6 + 0.4 * ao) + fill * w.fill * ao + w.amb * ao + back * facing * w.back;
    }
  }
  return out;
}

/**
 * cfg (pixel): W, H, steps (limiares dos tons 1..5), smooth, specMats (Set: quem sobe para o 6),
 * matSmooth (opcional: {mat: sigma}).
 */
export function pixelize(cfg, R) {
  const { W, H } = cfg;
  const { ss } = R;
  const STEPS = cfg.steps ?? [0.11, 0.23, 0.39, 0.6, 0.86];
  const n = W * H;
  const mat = new Uint8Array(n);
  const tone = new Int8Array(n).fill(-1);
  const z = new Float32Array(n).fill(-1e9);
  const lit = new Float32Array(n);
  const spec = new Float32Array(n);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const count = new Map();
      for (let j = 0; j < ss; j += 1)
        for (let i = 0; i < ss; i += 1) {
          const k = (y * ss + j) * W * ss + x * ss + i;
          const m = R.mat[k];
          if (!m) continue;
          const c = count.get(m) ?? { n: 0, lit: 0, z: -1e9, spec: 0 };
          c.n += 1;
          c.lit += R.lit[k];
          c.spec = Math.max(c.spec, R.spec[k]);
          c.z = Math.max(c.z, R.z[k]);
          count.set(m, c);
        }
      let best = null;
      let bm = 0;
      let total = 0;
      for (const [m, c] of count) {
        total += c.n;
        if (!best || c.n > best.n || (c.n === best.n && c.z > best.z)) {
          best = c;
          bm = m;
        }
      }
      if (!best || total * 2 < ss * ss) continue;
      const p = y * W + x;
      mat[p] = bm;
      z[p] = best.z;
      lit[p] = best.lit / best.n;
      spec[p] = best.spec;
    }
  }
  const sm = cfg.smooth ?? 1.05;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!mat[p]) continue;
      const sig = cfg.matSmooth?.[mat[p]] ?? sm;
      let sum = 0;
      let wsum = 0;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const qx = x + dx;
          const qy = y + dy;
          if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
          const q = qy * W + qx;
          if (mat[q] !== mat[p] || Math.abs(z[q] - z[p]) > 2.2) continue;
          const wt = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
          sum += lit[q] * wt;
          wsum += wt;
        }
      }
      const I = sum / wsum;
      let t = 0;
      while (t < STEPS.length && I >= STEPS[t]) t += 1;
      if (spec[p] > 0.45 && cfg.specMats?.has(mat[p])) t = 6;
      tone[p] = t;
    }
  }
  return { mat, tone, z, lit };
}

/** Tira os pixels soltos (tom diferente de todos os vizinhos do mesmo material). */
export function cleanup(cfg, P, passes = 2) {
  const { W, H } = cfg;
  const { mat } = P;
  for (let pass = 0; pass < passes; pass += 1) {
    const tone = P.tone;
    const next = Int8Array.from(tone);
    for (let y = 1; y < H - 1; y += 1) {
      for (let x = 1; x < W - 1; x += 1) {
        const p = y * W + x;
        if (!mat[p] || tone[p] === 6) continue;
        const nb = [p - 1, p + 1, p - W, p + W].filter((q) => mat[q] === mat[p]);
        if (nb.length < 3) continue;
        if (nb.every((q) => tone[q] !== tone[p])) {
          const votes = new Map();
          for (const q of nb) votes.set(tone[q], (votes.get(tone[q]) ?? 0) + 1);
          next[p] = [...votes.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
        }
      }
    }
    P.tone = next;
  }
}

/**
 * A imagem final. cfg: W, H, ramps ({mat: [7 cores]}), edge (Set: quem ganha a linha fina na troca
 * de material), soft (Set "a-b": trocas sem linha), litEdge(x, y) (a borda de cima pega luz?),
 * noCrease (Set: materiais sem o detector de vinco).
 */
export function compose(cfg, P) {
  const { W, H, ramps } = cfg;
  const { mat, tone, z } = P;
  const img = new Uint8ClampedArray(W * H * 4);
  const col = (p) => ramps[mat[p]][clamp(tone[p], 0, 6)];
  const set = (p, c, a = 255) => {
    img[p * 4] = c[0];
    img[p * 4 + 1] = c[1];
    img[p * 4 + 2] = c[2];
    img[p * 4 + 3] = a;
  };
  for (let p = 0; p < W * H; p += 1) if (mat[p]) set(p, col(p));
  const jumpLine = cfg.jump ?? 3.2;
  const lineOf = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!mat[p]) continue;
      let line = 0;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const qx = x + dx;
        const qy = y + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const q = qy * W + qx;
        if (!mat[q]) continue;
        const jump = z[q] - z[p];
        if (jump > jumpLine) line = Math.max(line, jump > 7 ? 2 : 1);
        else if (mat[q] !== mat[p] && jump > -0.6 && cfg.edge.has(mat[p]) && !cfg.soft.has(`${mat[p]}-${mat[q]}`)) line = Math.max(line, 1);
      }
      if (!line && x > 0 && y > 0 && x < W - 1 && y < H - 1 && !cfg.noCrease?.has(mat[p])) {
        const valleyH = mat[p - 1] && mat[p + 1] && z[p - 1] - z[p] > 0.55 && z[p + 1] - z[p] > 0.55;
        const valleyV = mat[p - W] && mat[p + W] && z[p - W] - z[p] > 0.55 && z[p + W] - z[p] > 0.55;
        if (valleyH || valleyV) line = 1;
      }
      if (line) {
        lineOf[p] = line;
        const r = ramps[mat[p]];
        set(p, line === 2 ? mix(r[0], INK, 0.55) : mix(r[0], r[1], 0.3));
      }
    }
  }
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!mat[p]) continue;
      const empty = (qx, qy) => qx < 0 || qy < 0 || qx >= W || qy >= H || !mat[qy * W + qx];
      if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) {
        const r = ramps[mat[p]];
        const lit = empty(x, y - 1) && !empty(x, y + 1) && cfg.litEdge(x, y);
        set(p, lit ? mix(r[1], INK, 0.35) : mix(r[0], INK, 0.6));
      }
    }
  }
  P.line = lineOf;
  return img;
}
