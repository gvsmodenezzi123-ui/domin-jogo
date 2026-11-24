/**
 * Prévia: as mesas de dia em volume (no dobro da resolução, como a de feltro em tableVolume.js).
 * O mesmo jeito: o tampo visto de cima como um relevo (altura e inclinação a cada pixel), a luz do
 * sol (de trás, alta e mansa, quase sem diferença do meio para as pontas) e os tons por material
 * (as sombras puxando para o frio, as luzes para o quente), pontilhado só onde o material pede.
 *
 *   plastico  a mesa de plástico branca da calçada: o lábio boleado grosso com o brilho em cima,
 *             o sulco, o friso em relevo por dentro, o fosco do plástico e as marcas de copo.
 *   concreto  a mesa de concreto da praça: a borda de cimento gasta e áspera, o tampo pintado de
 *             verde com a pincelada, as lascas mostrando o cimento e a sombra rendada da copa.
 *   tabua     a mesa de tábua do quiosque: a moldura de tábuas em meia-esquadria, as tábuas
 *             deitadas um tico abauladas com as frestas, o azul gasto mostrando a madeira e os pregos.
 */
const S = 2;

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
  const d = ((t - h + 540) % 360) - 180;
  if (Math.abs(d) < deg) return t;
  return h + Math.sign(d) * deg;
}
/** 7 tons: as sombras puxam para o azul frio (é de dia), as luzes para o amarelo do sol. */
function ramp(base) {
  const [h, s, v] = toHsv(hexRgb(base));
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const vv = i < 4 ? v * [0.42, 0.58, 0.73, 0.87][i] : v + (1 - v) * [0.04, 0.16, 0.34][i - 4];
    let ss = s * [1.12, 1.1, 1.07, 1.03, 1, 0.9, 0.75][i];
    const hh = s < 0.08 ? (i < 4 ? 218 : 48) : i < 4 ? toward(h, 225, [14, 9, 5, 2][i]) : toward(h, 50, [0, 4, 8][i - 4]);
    if (s < 0.08) ss = [0.12, 0.09, 0.06, 0.035, s, s * 0.8, 0.05][i];
    out.push(fromHsv(hh, cl(ss), cl(vv)));
  }
  return out;
}
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

// o sol: de trás (do lado de lá da mesa), alto
const SUN = (() => {
  const v = [0.18, -0.42, 0.89];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
})();
const VIEW = [0, 0.55, 0.835];

/** A borda mais perto de (x, y): a distância e a direção para dentro (gx, gy) e o "ao longo". */
function edge(x, y, W, H) {
  const dT = y + 0.5;
  const dB = H - y - 0.5;
  const dL = x + 0.5;
  const dR = W - x - 0.5;
  const d = Math.min(dT, dB, dL, dR);
  if (d === dT) return { d, gx: 0, gy: 1, along: x, len: W, cornerA: Math.min(dT, dB), cornerB: Math.min(dL, dR) };
  if (d === dB) return { d, gx: 0, gy: -1, along: x, len: W, cornerA: Math.min(dT, dB), cornerB: Math.min(dL, dR) };
  if (d === dL) return { d, gx: 1, gy: 0, along: y, len: H, cornerA: Math.min(dT, dB), cornerB: Math.min(dL, dR) };
  return { d, gx: -1, gy: 0, along: y, len: H, cornerA: Math.min(dT, dB), cornerB: Math.min(dL, dR) };
}
/** A luz de um pixel com a normal (nx, ny, nz): o céu (ambiente), o sol difuso e o brilho. */
function light(nx, ny, nz, shine = 0, power = 24) {
  const l = Math.hypot(nx, ny, nz);
  nx /= l;
  ny /= l;
  nz /= l;
  const diff = Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);
  let hx = SUN[0] + VIEW[0];
  let hy = SUN[1] + VIEW[1];
  let hz = SUN[2] + VIEW[2];
  const hl = Math.hypot(hx, hy, hz);
  hx /= hl;
  hy /= hl;
  hz /= hl;
  const spec = shine * Math.max(0, nx * hx + ny * hy + nz * hz) ** power;
  return 0.5 + 0.55 * diff + spec;
}
/** O tom (0 a 6) de uma luz `I` com o deslocamento `t0`, em pontilhado entre um e outro. */
function toneOf(I, t0, x, y, dither) {
  const t = (I - 0.62) * 6 + t0;
  return Math.max(0, Math.min(6, dither ? Math.floor(t + bayer(x, y)) : Math.round(t)));
}

// ---------------------------------------------------------------------------
// A mesa de plástico branca
// ---------------------------------------------------------------------------
function plastico(W, H, put, seed) {
  const P = ramp('#e8eae4');
  const matte = noiseOf(seed * 7 + 1, 1.6);
  const soft = noiseOf(seed * 5 + 3, 40);
  const r = rngOf(seed * 31 + 9);
  const rings = Array.from({ length: 3 }, () => [W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.55), r() * Math.PI * 2]);
  const LIP = 26;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const e = edge(x, y, W, H);
      const { d } = e;
      let slope = 0;
      let t0 = 2.3;
      let shine = 0.25;
      if (d < LIP) {
        // o lábio boleado: meia-cana grossa (a quina de fora caindo, o brilho no alto)
        const u = (d - LIP / 2) / (LIP / 2);
        slope = (-u / Math.max(0.25, Math.sqrt(Math.max(0.0625, 1 - u * u)))) * 1.4;
        shine = 0.6;
        t0 = 2.6;
      } else if (d < LIP + 4) {
        slope = (d - LIP - 2) * 0.35;
        t0 = 1.4;
      } else if (d < LIP + 12) {
        // o friso em relevo
        const u = (d - LIP - 8) / 4;
        slope = -u * 1.3;
        shine = 0.35;
        t0 = 2.4;
      }
      // os cantos arredondados do molde
      const nx = -slope * e.gx + (matte(x, y) - 0.5) * 0.08;
      const ny = -slope * e.gy + (matte(y, x) - 0.5) * 0.08;
      let I = light(nx, ny, 1, shine, 18);
      if (d < 1.5) I -= 0.3;
      if (d >= LIP + 12) {
        I += (soft(x, y) - 0.5) * 0.06;
        for (const [rx, ry, a0] of rings) {
          const q = Math.hypot((x - rx) / 17, (y - ry) / 14);
          const a = (Math.atan2(y - ry, x - rx) - a0 + Math.PI * 4) % (Math.PI * 2);
          if (Math.abs(q - 1) < 0.07 && a < Math.PI * 1.7) I -= 0.09;
        }
      }
      put(x, y, P[toneOf(I, t0, x, y, d >= LIP + 12)]);
    }
}

// ---------------------------------------------------------------------------
// A mesa de concreto com o tampo pintado de verde
// ---------------------------------------------------------------------------
function concreto(W, H, put, seed) {
  const CEM = ramp('#b8b4a8');
  const PAINT = ramp('#2e8446');
  const rough = noiseOf(seed * 3 + 5, 2.2);
  const chipN = noiseOf(seed * 11 + 7, 10);
  const chipF = noiseOf(seed * 13 + 1, 3.2);
  const brush = noiseOf(seed * 17 + 3, 7);
  const leaves = noiseOf(seed * 19 + 11, 22);
  const leavesF = noiseOf(seed * 23 + 2, 7);
  const BORDER = 24;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const e = edge(x, y, W, H);
      const { d } = e;
      // a borda de cimento: a quina boleada e áspera
      let slope = 0;
      if (d < 10) {
        const t = 10 - d;
        slope = t / Math.max(0.6, Math.sqrt(Math.max(0.36, 100 - t * t)));
      }
      const rx = (rough(x, y) - 0.5) * 0.5;
      const ry = (rough(y + 99, x) - 0.5) * 0.5;
      const paintEdge = BORDER + Math.sin(e.along * 0.09) * 1.6 + (chipF(x, y) - 0.5) * 6;
      const chipV = chipN(x, y) * 0.7 + chipF(x, y) * 0.3;
      const chip = chipV > 0.8 - Math.max(0, 1 - (d - BORDER) / 40) * 0.16;
      const painted = d > paintEdge && !chip;
      let nx = -slope * e.gx + (painted ? 0 : rx);
      let ny = -slope * e.gy + (painted ? 0 : ry);
      // a pincelada: estrias ao comprido, a tinta um tico mais alta que a lasca
      if (painted) {
        const b = brush(x * 0.25, y * 2.2);
        ny += (b - 0.5) * 0.18;
      }
      let I = light(nx, ny, 1, painted ? 0.12 : 0.04, 10);
      // a beirada da lasca: a quina da tinta faz sombra de um lado e brilha do outro
      if (!painted && d > paintEdge - 1) {
        const near = Math.abs(chipV - 0.8) < 0.02;
        if (near) I -= 0.18;
      }
      if (d < 1.5) I -= 0.25;
      // a sombra rendada da copa da árvore
      const leaf = leaves(x, y) * 0.65 + leavesF(x, y) * 0.35;
      if (leaf > 0.58) I -= 0.13;
      put(x, y, (painted ? PAINT : CEM)[toneOf(I, painted ? 2.7 : 3.1, x, y, true)]);
    }
}

// ---------------------------------------------------------------------------
// A mesa de tábua do quiosque, pintada de azul
// ---------------------------------------------------------------------------
function tabua(W, H, put, seed) {
  const BLUE = ramp('#2a6ab8');
  const WOODR = ramp('#a87c4c');
  const wear = noiseOf(seed * 5 + 1, 14);
  const wearF = noiseOf(seed * 7 + 9, 4);
  const grainN = noiseOf(seed * 3 + 7, 30);
  const FRAME = 30;
  const PLANK = 26;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const e = edge(x, y, W, H);
      const { d } = e;
      let slope = 0;
      let gap = false;
      let along;
      let across;
      let nail = false;
      if (d < FRAME) {
        // a moldura: a tábua de cada lado, a quina boleada, a meia-esquadria nos cantos
        const u = (d - FRAME / 2) / (FRAME / 2);
        slope = -u * 0.5;
        if (d < 4) slope = (4 - d) * 0.35;
        if (d > FRAME - 2.5) gap = true;
        if (Math.abs(e.cornerA - e.cornerB) < 1 && e.cornerA < FRAME && e.cornerB < FRAME) gap = true;
        along = e.along;
        across = d;
        nail = Math.abs(d - FRAME / 2) < 1.8 && Math.abs(((e.along + 30) % 90) - 45) < 1.8;
      } else {
        // as tábuas deitadas: abauladas, com a fresta entre uma e outra
        const v = (y - FRAME) / PLANK;
        const f = v - Math.floor(v);
        slope = (f - 0.5) * 0.7;
        gap = f < 0.1;
        along = x + Math.floor(v) * 57;
        across = f * PLANK;
        nail = (Math.abs(x - FRAME - 14) < 1.8 || Math.abs(W - FRAME - 14 - x) < 1.8) && Math.abs(f - 0.5) < 0.09;
      }
      const ny = d < FRAME ? -slope * e.gy : -slope;
      const nx = d < FRAME ? -slope * e.gx : 0;
      let I = light(nx, ny, 1, 0.08, 10);
      // o azul gasto: onde a tinta saiu aparece a madeira com o veio
      const edgeK = d < FRAME ? Math.max(0, 1 - Math.min(d, FRAME - d) / 6) : Math.max(0, 1 - Math.min(across, PLANK - across) / 5);
      const worn = wear(x, y) * 0.7 + wearF(x, y) * 0.3 > 0.72 - edgeK * 0.16;
      let R = BLUE;
      let t0 = 2.9;
      if (worn) {
        R = WOODR;
        const g = Math.sin(along * 0.05 + across * 0.9 + grainN(x, y) * 4);
        t0 = 3 + (g > 0.75 ? -0.8 : 0);
      } else if (Math.sin(along * 0.04 + across * 0.7 + grainN(x, y) * 3) > 0.92) t0 -= 0.5;
      if (gap) {
        I = 0.2;
        R = WOODR;
      }
      if (nail) {
        R = WOODR;
        I = 0.35;
      }
      if (d < 1.5) I -= 0.3;
      put(x, y, R[toneOf(I, t0, x, y, !gap)]);
    }
}

const PAINTERS = { plastico, concreto, tabua };

/** O tampo do material `kind` em volume: `w` × `h` px da mesa (sai no dobro). */
export function paintTableKindVolume(kind, { w, h, seed = 11 }) {
  const W = w * S;
  const H = h * S;
  const data = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, c) => {
    const i = (y * W + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  };
  PAINTERS[kind](W, H, put, seed);
  return { w: W, h: H, S, data };
}

/** A frente da mesa (a saia) no mesmo material, em volume: `w` px da mesa, `h` de altura (sai no dobro). */
export function paintApronKindVolume(kind, w, h, seed = 5) {
  const W = w * S;
  const Hh = h * S;
  const data = new Uint8ClampedArray(W * Hh * 4);
  const base = kind === 'plastico' ? '#e8eae4' : kind === 'concreto' ? '#b8b4a8' : '#2a6ab8';
  const R = ramp(base);
  const rough = noiseOf(seed * 3 + 1, 2.5);
  const wear = noiseOf(seed * 7 + 5, 12);
  const WOODR = ramp('#a87c4c');
  for (let y = 0; y < Hh - 4; y += 1)
    for (let x = 0; x < W; x += 1) {
      // a quina de cima pega o sol; a face de frente, de pé, fica na sombra do tampo
      let t = y < 2 ? 5 : y < 4 ? 4 : y < 6 ? 2 : 2.6 - (y / Hh) * 1.2;
      if (kind === 'concreto') t += (rough(x, y) - 0.5) * 1.2;
      let r7 = R;
      if (kind === 'tabua' && y > 5 && wear(x, y) > 0.66) r7 = WOODR;
      if (kind === 'tabua' && y > 5 && (x % 90) < 2) t -= 1.5;
      if (kind === 'plastico' && Math.abs(y - 12) < 1) t += 1;
      const c = r7[Math.max(0, Math.min(6, Math.floor(t + bayer(x, y) * 0.9)))];
      const i = (y * W + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  // a sombra no chão, embaixo da beirada
  for (let y = Hh - 4; y < Hh; y += 1)
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      data[i + 3] = Math.round(110 * (1 - (y - (Hh - 4)) / 4));
    }
  return { w: W, h: Hh, S, data };
}
