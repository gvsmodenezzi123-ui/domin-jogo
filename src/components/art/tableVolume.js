/**
 * Prévia: a mesa em volume. O plano da mesa (visto de cima; o CSS inclina) como um relevo de
 * verdade: o aro de madeira com a quina boleada, o tampo com o filete de latão embutido e os
 * losangos de madrepérola, a tabela de feltro descendo até o pano, os cantos de latão; iluminado
 * pela lâmpada (difusa, brilho do verniz e do metal, a poça de luz no meio) e passado para pixel
 * art: tons por material (com o matiz puxando para o quente na luz e para o frio na sombra),
 * pontilhado só no pano, contornos nas quinas. No dobro da resolução da mesa antiga.
 */

const S = 2;

// ------------------------------------------------------------------ cores
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function toHsv([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}
function fromHsv(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const cl = (v) => Math.max(0, Math.min(1, v));
function toward(h, t, deg) {
  let d = ((t - h + 540) % 360) - 180;
  if (Math.abs(d) < deg) return t;
  return h + Math.sign(d) * deg;
}
/** 7 tons de um material: as sombras puxam para o roxo frio, as luzes para o amarelo quente. */
function ramp(base, metal = false) {
  const [h, s, v] = toHsv(hexRgb(base));
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    let vv;
    let ss;
    let hh;
    if (metal) {
      vv = v * [0.3, 0.48, 0.66, 0.82, 0.95, 1.06, 1.16][i];
      ss = s * [1.1, 1.12, 1.08, 1.02, 0.95, 0.72, 0.38][i];
      hh = toward(h, i < 4 ? 15 : 58, [18, 12, 7, 3, 0, 4, 8][i]);
    } else {
      vv = i < 4 ? v * [0.34, 0.52, 0.69, 0.85][i] : v + (1 - v) * [0.04, 0.14, 0.3][i - 4];
      ss = s * [1.15, 1.13, 1.1, 1.05, 1, 0.92, 0.8][i];
      hh = s < 0.08 ? h : i < 4 ? toward(h, 268, [16, 11, 6, 2][i]) : toward(h, 48, [0, 4, 9][i - 4]);
    }
    out.push(fromHsv(hh, cl(ss), cl(vv)));
  }
  return out;
}

// ------------------------------------------------------------------ ruído
function rngOf(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
function noiseOf(seed, cell) {
  const r = rngOf(seed);
  const N = 64;
  const g = Float32Array.from({ length: N * N }, () => r());
  const at = (i, j) => g[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = fx - i;
    const v = fy - j;
    const su = u * u * (3 - 2 * u);
    const sv = v * v * (3 - 2 * v);
    return at(i, j) * (1 - su) * (1 - sv) + at(i + 1, j) * su * (1 - sv) + at(i, j + 1) * (1 - su) * sv + at(i + 1, j + 1) * su * sv;
  };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

// ------------------------------------------------------------------ o relevo do aro
const WOOD = 14 * S; // a madeira
const RAIL = 18 * S; // madeira + a tabela de feltro
const TOP = 12; // a altura do tampo do aro
const CUSH = 6; // a altura da tabela de feltro encostada na madeira
/** [altura, inclinação (para dentro), material] a `d` px da borda de fora. */
function profile(d) {
  if (d < 5) {
    const t = 5 - d;
    const hgt = TOP - 5 + Math.sqrt(Math.max(0, 25 - t * t));
    return [hgt, t / Math.max(0.6, Math.sqrt(Math.max(0.36, 25 - t * t))), 'wood'];
  }
  if (d < WOOD - 5) {
    const t = (d - 5) / (WOOD - 10);
    const inlay = d >= WOOD - 9.5 && d < WOOD - 7;
    return [TOP + 0.7 * Math.sin(Math.PI * t) - (inlay ? 0.4 : 0), 0.7 * Math.PI * Math.cos(Math.PI * t) / (WOOD - 10), inlay ? 'brass' : 'wood'];
  }
  if (d < WOOD) {
    const t = d - (WOOD - 5);
    const hgt = CUSH + (TOP - CUSH) * Math.sqrt(Math.max(0, 1 - (t / 5) ** 2));
    return [hgt, -((TOP - CUSH) * (t / 25)) / Math.max(0.08, Math.sqrt(Math.max(0.0064, 1 - (t / 5) ** 2))), 'wood'];
  }
  if (d < RAIL) {
    const t = (d - WOOD) / (RAIL - WOOD);
    return [CUSH * (1 - t ** 1.7), (-CUSH * 1.7 * t ** 0.7) / (RAIL - WOOD), 'cushion'];
  }
  return [0, 0, 'felt'];
}

/**
 * O plano da mesa em volume, `w`×`h` px da mesa antiga (sai no dobro). `light`/`mid`/`dark`: o
 * feltro da sala; `mahogany`: o aro de mogno.
 */
export function paintTableVolume({ w, h, light = '#3a4a2a', mid = '#2c3a20', dark = '#1f2a17', seed = 11, mahogany = false }) {
  const W = w * S;
  const H = h * S;
  const data = new Uint8ClampedArray(W * H * 4);
  const R = {
    wood: ramp(mahogany ? '#6a2a18' : '#80502a'),
    brass: ramp('#e0b048', true),
    pearl: ramp('#efe6cc'),
    felt: ramp(mid),
  };
  const feltLight = hexRgb(light);
  const feltDark = hexRgb(dark);
  const grainN = noiseOf(seed * 7 + 3, 9 * S);
  const wearN = noiseOf(seed * 13 + 5, 26 * S);
  const fineN = noiseOf(seed * 3 + 1, 2.2);
  const r = rngOf(seed * 31 + 7);
  // as manchas de bebida e as marcas de copo (no pano)
  const blots = Array.from({ length: 2 }, () => [RAIL + 30 + r() * (W - RAIL * 2 - 60), RAIL + 30 + r() * (H - RAIL * 2 - 60), 12 + r() * 16]);
  const rings = Array.from({ length: 2 }, () => [W * (0.2 + r() * 0.6), H * (0.15 + r() * 0.5), r() * Math.PI * 2]);
  const lamp = [W / 2, H * 0.42, W * 0.62];
  const V = [0, 0.55, 0.835];
  const put = (x, y, c) => {
    const i = (y * W + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  };
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dT = y + 0.5;
      const dB = H - y - 0.5;
      const dL = x + 0.5;
      const dR = W - x - 0.5;
      const dmin = Math.min(dT, dB, dL, dR);
      let gx = 0;
      let gy = 0;
      let along;
      let sideLen;
      if (dmin === dT) {
        gy = 1;
        along = x;
        sideLen = W;
      } else if (dmin === dB) {
        gy = -1;
        along = x;
        sideLen = W;
      } else if (dmin === dL) {
        gx = 1;
        along = y;
        sideLen = H;
      } else {
        gx = -1;
        along = y;
        sideLen = H;
      }
      let [hgt, slope, mat] = profile(dmin);
      let nx = -slope * gx;
      let ny = -slope * gy;
      let nz = 1;
      // os cantos de latão (a chapa que cobre a emenda) e a emenda em meia-esquadria
      const cornerA = Math.min(dT, dB);
      const cornerB = Math.min(dL, dR);
      const inCorner = cornerA < WOOD && cornerB < WOOD;
      if (inCorner && cornerA + cornerB < WOOD * 1.5 && dmin > 1.5) {
        mat = 'brass';
        hgt += 0.8;
        // a chapa tem um chanfro na ponta
        const edge = WOOD * 1.5 - (cornerA + cornerB);
        if (edge < 2.5) {
          const sx = dL < dR ? 1 : -1;
          const sy = dT < dB ? 1 : -1;
          nx -= 0.5 * sx;
          ny -= 0.5 * sy;
        }
      }
      const seam = inCorner && Math.abs(cornerA - cornerB) < 0.8 && mat === 'wood' && dmin > 1;
      // os losangos de madrepérola no meio do tampo
      if (mat === 'wood' && dmin > 8 && dmin < WOOD - 9) {
        const mid = (5 + WOOD - 9.5) / 2;
        const step = sideLen / 8;
        const k = Math.round(along / step);
        if (k > 0 && k < 8) {
          const a = Math.abs(along - k * step);
          const b = Math.abs(dmin - mid);
          if (a / 3.4 + b / 2.2 < 1) {
            mat = 'pearl';
            hgt += 0.5;
            nx += (along - k * step) * 0.06 * (gx === 0 ? 1 : 0) + (dmin - mid) * 0.08 * gx;
            ny += (along - k * step) * 0.06 * (gy === 0 ? 1 : 0) + (dmin - mid) * 0.08 * gy;
          }
        }
      }
      // o pano: a trama em sarja levanta um tico a normal
      if (mat === 'felt' || mat === 'cushion') {
        const tw = (x + y) % 3 === 0 ? 0.1 : -0.04;
        nx += tw * 0.7;
        ny -= tw * 0.7;
      }
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      // a luz da lâmpada
      let lx = lamp[0] - x;
      let ly = lamp[1] - y;
      let lz = lamp[2] - hgt;
      const ld = Math.hypot(lx, ly, lz);
      lx /= ld;
      ly /= ld;
      lz /= ld;
      const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
      const pool = 1 / (1 + ((x - lamp[0]) ** 2 + ((y - lamp[1]) * 1.3) ** 2) / (W * 0.3) ** 2);
      let hx = lx + V[0];
      let hy = ly + V[1];
      let hz = lz + V[2];
      const hl = Math.hypot(hx, hy, hz);
      hx /= hl;
      hy /= hl;
      hz /= hl;
      const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
      // a sombra embaixo da tabela, no pano encostado nela
      let ao = 1;
      if (mat === 'felt') ao = 1 - 0.42 * Math.exp(-(dmin - RAIL) / 4.5);
      if (mat === 'cushion') ao = 0.82 + 0.18 * ((dmin - WOOD) / (RAIL - WOOD));
      let I = (0.3 + 0.9 * diff * (0.45 + 0.75 * pool)) * ao;
      let spec = 0;
      if (mat === 'wood') spec = 0.85 * nh ** 40 * (0.55 + 0.8 * pool);
      if (mat === 'brass') spec = 1.1 * nh ** 18;
      if (mat === 'pearl') spec = 0.7 * nh ** 12;
      I += spec;
      // o tom (contínuo) de cada material
      let t;
      let ramp7 = R[mat === 'cushion' ? 'felt' : mat];
      if (mat === 'wood') {
        // o veio: corre ao longo do lado, com os nós
        const g = Math.sin(along * 0.0175 + dmin * 0.62 + Math.sin(along * 0.006 + dmin * 0.25) * 2.2 + grainN(x, y) * 2.6);
        const grain = g > 0.86 ? -0.55 : g > 0.45 ? -0.22 : g < -0.85 ? 0.3 : 0;
        t = (I - 0.22) * 5 + 0.3 + grain;
        // a quina boleada de fora fica na sombra; o alto do aro, na luz
        if (dmin < 5) t -= (5 - dmin) * 0.45;
        // o verniz gasto onde se apoia o cotovelo (o lado de perto, no meio)
        if (gy === -1 && Math.abs(x - W / 2) < W * 0.22 && dmin > 6 && dmin < WOOD - 4) t += 0.25 * Math.max(0, wearN(x, y) - 0.45);
        if (seam) t = Math.min(t, 0.4);
      } else if (mat === 'brass') {
        t = (I - 0.2) * 4.6 + 0.8;
      } else if (mat === 'pearl') {
        t = (I - 0.2) * 4 + 1.6;
      } else {
        // o pano: a poça de luz pontilhada, o miolo gasto, as manchas, a estampa apagada
        const worn = 0.45 * Math.max(0, 1 - (((x - W / 2) / (W * 0.3)) ** 2 + ((y - H * 0.5) / (H * 0.28)) ** 2)) * (0.6 + 0.8 * wearN(x, y));
        t = (I - 0.3) * 4.4 + worn + (fineN(x, y) - 0.5) * 0.5;
        // a costura em volta do pano, tracejada, um palmo para dentro da tabela
        const ds = dmin - (RAIL + 10);
        if (mat === 'felt' && Math.abs(ds) < 0.6 && (Math.floor(along / 5) & 1)) t += 1.6;
        for (const [bx, by, br] of blots) {
          const q = Math.hypot(x - bx, (y - by) * 1.3) / br;
          if (q < 1) t -= 0.45 * (q > 0.82 ? 1.4 : 1);
        }
        for (const [rx, ry, a0] of rings) {
          const q = Math.hypot((x - rx) / 16, (y - ry) / 13);
          const a = (Math.atan2(y - ry, x - rx) - a0 + Math.PI * 4) % (Math.PI * 2);
          if (Math.abs(q - 1) < 0.08 && a < Math.PI * 1.6) t -= 0.5;
        }
        const u = (x + y) % 28;
        const v2 = (x - y + 2800) % 28;
        if ((u < 1 || v2 < 1) && mat === 'felt') t -= 0.55;
        else if (mat === 'felt' && u === 14 && v2 === 14) t += 0.8;
        if (mat === 'felt') t += bayer(x, y) - 0.5;
      }
      let tone = Math.round(t);
      tone = Math.max(0, Math.min(6, tone));
      let c = ramp7[tone];
      // o pano puxa para as cores da sala (claro na luz, escuro na sombra)
      if (mat === 'felt' || mat === 'cushion') {
        const k = tone >= 5 ? 0.25 : tone <= 1 ? 0.3 : 0;
        const tgt = tone >= 5 ? feltLight : feltDark;
        c = [c[0] + (tgt[0] - c[0]) * k, c[1] + (tgt[1] - c[1]) * k, c[2] + (tgt[2] - c[2]) * k];
      }
      // os contornos: a quina de fora, o encontro da madeira com a tabela, a tabela com o pano
      if (dmin < 1) c = ramp7[0].map((v) => v * 0.6);
      else if (Math.abs(dmin - WOOD) < 0.75) c = R.wood[0];
      put(x, y, c);
    }
  }
  // os fiapos e a poeira em cima do pano
  for (let i = 0; i < (W * H) / 900; i += 1) {
    const fx = Math.floor(RAIL + 4 + r() * (W - RAIL * 2 - 8));
    const fy = Math.floor(RAIL + 4 + r() * (H - RAIL * 2 - 8));
    const c = r() < 0.6 ? [210, 206, 188] : R.felt[5];
    const i0 = (fy * W + fx) * 4;
    const a = 0.25 + r() * 0.3;
    for (let k = 0; k < 3; k += 1) data[i0 + k] = data[i0 + k] + (c[k] - data[i0 + k]) * a;
  }
  return { w: W, h: H, S, data };
}

/** A frente da mesa (a saia de madeira), `w` px da mesa antiga de largura (sai no dobro). */
export function paintApronVolume(w, { mahogany = false, seed = 5 } = {}) {
  const W = w * S;
  const H = 12 * S;
  const data = new Uint8ClampedArray(W * H * 4);
  const WR = ramp(mahogany ? '#7a3420' : '#9a6634');
  const BR = ramp('#d0a040', true);
  const grainN = noiseOf(seed * 5 + 2, 8 * S);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let t;
      let R = WR;
      if (y < 7) {
        // o lábio do aro, boleado: pega a luz de cima
        const a = (y + 0.5) / 7;
        const ny = Math.cos(a * Math.PI * 0.9);
        t = 1.4 + ny * 3.4;
      } else if (y < 9) {
        t = 0.3; // o vão embaixo do lábio
      } else if (y < H - 3) {
        // a tábua: o veio deitado, escurecendo para baixo
        const g = Math.sin(x * 0.021 + y * 0.9 + grainN(x, y) * 2.4);
        t = 3.1 - ((y - 9) / (H - 12)) * 1.6 + (g > 0.8 ? -0.6 : g < -0.85 ? 0.35 : 0);
        // o friso de latão no meio da tábua
        if (y === 13 || y === 14) {
          R = BR;
          t = y === 13 ? 4.6 : 2.4;
        }
      } else t = 0.5;
      const tone = Math.max(0, Math.min(6, Math.round(t)));
      const c = R[tone];
      const i = (y * W + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  return { w: W, h: H, S, data };
}
