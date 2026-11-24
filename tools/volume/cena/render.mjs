// O motor da cena: o mesmo dos personagens (r3d.mjs), com câmera em perspectiva (quem senta na
// mesa olhando a parede do boteco) e luzes de ponto (a lâmpada da mesa, a lâmpada nua, o letreiro,
// a rua), cada uma com a sua cor, a queda com a distância e a sombra macia das duas principais.
import { acc } from '../kit.mjs';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const norm = (x, y, z) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

/**
 * cfg: W, H, scene(x, y, z) (com acc.MAT), cam: [x, y, z] (a câmera; a parede z = 0 cai em cima da
 * tela 1:1), lights: [{ p, c: [r, g, b], k, R, shadow }], amb: [r, g, b], emissive: Set.
 * Devolve, por pixel (com `ss`×`ss` amostras): material, luz (a soma, em cinza), cor da luz, z.
 */
export function renderScene(cfg, ss = 1) {
  const { W, H, scene, cam, lights, amb } = cfg;
  // a sombra pode ver coisas que a câmera não vê (a mesa da partida, que o jogo desenha por cima)
  const shade = cfg.shade ?? scene;
  const n = W * H * ss * ss;
  const out = { ss, mat: new Uint8Array(n), lit: new Float32Array(n), tint: new Float32Array(n * 3), z: new Float32Array(n).fill(-1e9), spec: new Float32Array(n) };
  const normal = (x, y, z) => {
    const e = 0.15;
    return norm(scene(x + e, y, z) - scene(x - e, y, z), scene(x, y + e, z) - scene(x, y - e, z), scene(x, y, z + e) - scene(x, y, z - e));
  };
  const shadow = (x, y, z, lx, ly, lz, dist) => {
    let res = 1;
    let t = cfg.shadowStart ?? 2.5;
    for (let i = 0; i < 40 && t < dist - 2; i += 1) {
      const h = shade(x + lx * t, y + ly * t, z + lz * t);
      if (h < 0.03) return 0;
      res = Math.min(res, (7 * h) / t);
      t += clamp(h, 0.4, 9);
    }
    return clamp(res, 0, 1);
  };
  const occlusion = (x, y, z, nn) => {
    let occ = 0;
    let wt = 1;
    for (let i = 1; i <= 4; i += 1) {
      const d = i * 2.2;
      occ += (d - scene(x + nn[0] * d, y + nn[1] * d, z + nn[2] * d)) * wt;
      wt *= 0.6;
    }
    return clamp(1 - occ * 0.09, 0, 1);
  };
  const [rx0, ry0, rx1, ry1] = cfg.region ?? [0, 0, W, H];
  for (let j = ry0 * ss; j < ry1 * ss; j += 1) {
    const sy = (j + 0.5) / ss;
    for (let i = rx0 * ss; i < rx1 * ss; i += 1) {
      const sx = (i + 0.5) / ss - (cfg.ox ?? 0);
      // o raio sai da câmera e passa pelo ponto (sx, sy) da parede (z = 0)
      const d = norm(sx - cam[0], sy - cam[1], -cam[2]);
      let t = 0;
      let hit = false;
      const maxT = cam[2] * 1.7;
      for (let s = 0; s < 300 && t < maxT; s += 1) {
        const dd = scene(cam[0] + d[0] * t, cam[1] + d[1] * t, cam[2] + d[2] * t);
        if (dd < 0.04) {
          hit = true;
          break;
        }
        t += Math.max(dd * 0.85, 0.05);
      }
      if (!hit) continue;
      const x = cam[0] + d[0] * t;
      const y = cam[1] + d[1] * t;
      const z = cam[2] + d[2] * t;
      scene(x, y, z);
      const m = acc.MAT;
      const k = j * W * ss + i;
      const nn = normal(x, y, z);
      out.mat[k] = m;
      out.z[k] = z;
      if (cfg.emissive.has(m)) {
        out.lit[k] = 1.25;
        out.tint[k * 3] = out.tint[k * 3 + 1] = out.tint[k * 3 + 2] = 1;
        continue;
      }
      const ao = occlusion(x, y, z, nn);
      const off = cfg.normalOffset ?? 1.2;
      const px = x + nn[0] * off;
      const py = y + nn[1] * off;
      const pz = z + nn[2] * off;
      let r = amb[0] * ao;
      let g = amb[1] * ao;
      let b = amb[2] * ao;
      let spec = 0;
      for (const L of lights) {
        const lx0 = L.p[0] - px;
        const ly0 = L.p[1] - py;
        const lz0 = L.p[2] - pz;
        const dist = Math.hypot(lx0, ly0, lz0);
        // (a luz que não chega até aqui nem é olhada: poupa a sombra)
        if (L.max && dist > L.max) continue;
        const lx = lx0 / dist;
        const ly = ly0 / dist;
        const lz = lz0 / dist;
        const dif = nn[0] * lx + nn[1] * ly + nn[2] * lz;
        if (dif <= 0) continue;
        const fall = L.k / (1 + (dist / L.R) ** 2);
        if (fall < 0.01) continue;
        const sh = L.shadow ? shadow(px, py, pz, lx, ly, lz, dist) : 1;
        const e = dif * fall * (0.2 + 0.8 * sh) * (0.7 + 0.3 * ao);
        r += e * L.c[0];
        g += e * L.c[1];
        b += e * L.c[2];
        // o brilho (verniz, vidro, metal), visto da câmera
        const hx = lx - d[0];
        const hy = ly - d[1];
        const hz = lz - d[2];
        const hl = Math.hypot(hx, hy, hz);
        spec = Math.max(spec, Math.max(0, (nn[0] * hx + nn[1] * hy + nn[2] * hz) / hl) ** 30 * sh * Math.min(1, fall * 1.5));
      }
      const lum = 0.3 * r + 0.55 * g + 0.15 * b;
      out.lit[k] = lum;
      const s = lum > 1e-4 ? 1 / lum : 0;
      out.tint[k * 3] = r * s;
      out.tint[k * 3 + 1] = g * s;
      out.tint[k * 3 + 2] = b * s;
      out.spec[k] = spec;
    }
  }
  return out;
}
