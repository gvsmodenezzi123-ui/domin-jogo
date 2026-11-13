/**
 * Versão 2.30: as mesas que não são de feltro, uma para cada cenário novo. A mesma geometria da
 * mesa de sempre (o aro de RAIL px em volta, o tampo por dentro), outro material:
 *
 *   plastico  a mesa de plástico branca da calçada do bar: o tampo moldado com a borda boleada
 *             (o lábio grosso com o brilho em cima), o friso em relevo por dentro, a textura
 *             fosca do plástico e as marcas leves de copo.
 *   concreto  a mesa de concreto da praça, com o tampo pintado de verde: a tinta com a pincelada,
 *             as lascas mostrando o cimento por baixo e a borda de cimento gasta.
 *   tabua     a mesa de tábua do quiosque da praia, pintada de azul: as tábuas na horizontal com
 *             as frestas, o veio aparecendo onde a tinta gastou, os pregos e a moldura de tábua.
 *
 * São mesas de dia (a luz do sol, quase sem diferença do meio para as pontas, só a vinheta de
 * leve), e a da praça leva a sombra rendada da copa da árvore. A frente (a saia) no mesmo material.
 */
import { paintKit } from './botecoScene.js';

const { hex, shift, rngOf, buffer, bayer } = paintKit;

export const TABLE_KINDS = Object.freeze(['plastico', 'concreto', 'tabua']);

const RAIL = 18;
const LIP = 14;

const clamp255 = (v) => Math.max(0, Math.min(255, v));
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clampRgb = (c) => [clamp255(c[0]), clamp255(c[1]), clamp255(c[2])];

/** Ruído suave (grade `cell` interpolada), já amostrado: Float32Array w×h. */
function field(w, h, cell, r) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i += 1) g[i] = r();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const fy = y / cell;
    const y0 = fy | 0;
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < w; x += 1) {
      const fx = x / cell;
      const x0 = fx | 0;
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const i0 = y0 * gw + x0;
      const top = g[i0] + (g[i0 + 1] - g[i0]) * sx;
      const bot = g[i0 + gw] + (g[i0 + gw + 1] - g[i0 + gw]) * sx;
      out[y * w + x] = top + (bot - top) * sy;
    }
  }
  return out;
}

/**
 * A luz da lâmpada por cima de tudo (em degraus pontilhados): o miolo quente perto do meio de
 * perto, caindo para as pontas, e a vinheta dos cantos. `warm` é a cor da luz.
 */
function lampLight(b, { ambient = 0.62, peak = 0.62, warm = [1, 0.9, 0.74], bands = 9 } = {}) {
  const { w, h, data } = b;
  const cx = w / 2;
  const cy = h * 0.6;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = (x - cx) / (w * 0.5);
      const dy = (y - cy) / (h * 0.7);
      const d = Math.sqrt(dx * dx + dy * dy);
      const f = Math.max(0, 1 - d) ** 1.6;
      const vg = Math.max(0, Math.hypot((x - cx) / (w * 0.55), (y - cy) / (h * 0.62)) - 0.6) * 0.8;
      const lvl = Math.max(0, ambient + peak * f - vg);
      const q = Math.round(lvl * bands + bayer(x, y) - 0.5) / bands;
      const i = (y * w + x) * 4;
      const lr = q * (1 + (warm[0] - 1) * f);
      const lg = q * (1 + (warm[1] - 1) * f);
      const lb = q * (1 + (warm[2] - 1) * f);
      data[i] = Math.min(255, data[i] * lr);
      data[i + 1] = Math.min(255, data[i + 1] * lg);
      data[i + 2] = Math.min(255, data[i + 2] * lb);
    }
  }
}

/** Distância até a borda de fora e qual lado ('top'|'bottom'|'left'|'right'). */
function edgeOf(x, y, w, h) {
  const dT = y;
  const dB = h - 1 - y;
  const dL = x;
  const dR = w - 1 - x;
  const d = Math.min(dT, dB, dL, dR);
  const horizontal = Math.min(dT, dB) <= Math.min(dL, dR);
  const side = horizontal ? (dT <= dB ? 'top' : 'bottom') : dL <= dR ? 'left' : 'right';
  return { d, side };
}

// ---------------------------------------------------------------------------
// A mesa de plástico branca
// ---------------------------------------------------------------------------

const PLASTIC = { hi: hex('#ffffff'), lit: hex('#f6f7f2'), mid: hex('#e6e8e2'), lo: hex('#c6cac2'), shade: hex('#9ea29a'), deep: hex('#5e625b') };

function plastico(b, r) {
  const { w, h } = b;
  const grain = field(w, h, 3, r);
  const soft = field(w, h, 26, r);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const { d, side } = edgeOf(x, y, w, h);
      let c;
      if (d < LIP) {
        // o lábio boleado: a quina de fora escura, o brilho no alto da curva e a descida para o tampo
        const k = d / (LIP - 1);
        if (d === 0) c = PLASTIC.deep;
        else if (d === 1) c = PLASTIC.shade;
        else if (k < 0.32) c = lerp(PLASTIC.lo, PLASTIC.mid, k / 0.32);
        else if (k < 0.5) c = side === 'bottom' ? PLASTIC.lit : PLASTIC.hi;
        else if (k < 0.8) c = lerp(PLASTIC.lit, PLASTIC.mid, (k - 0.5) / 0.3);
        else c = lerp(PLASTIC.mid, PLASTIC.shade, (k - 0.8) / 0.2);
        if (side === 'bottom') c = lerp(c, PLASTIC.lo, 0.18);
        if (side === 'top') c = lerp(c, PLASTIC.hi, 0.1);
      } else if (d < RAIL) {
        // o degrau do lábio para o tampo: a sombra embaixo da borda
        const k = d - LIP;
        c = k === 0 ? PLASTIC.shade : k === 1 ? PLASTIC.lo : lerp(PLASTIC.lo, PLASTIC.mid, (k - 1) / 3);
      } else {
        // o tampo fosco: a textura do molde e manchas grandes bem leves
        const j = y * w + x;
        c = shift(PLASTIC.mid, Math.round((grain[j] - 0.5) * 7 + (soft[j] - 0.5) * 10));
        // o friso em relevo 7 px para dentro (o brilho em cima, a sombra embaixo)
        const di = d - RAIL;
        if (di === 7) c = lerp(c, PLASTIC.hi, 0.45);
        if (di === 8) c = lerp(c, PLASTIC.shade, 0.35);
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // as marcas de copo, bem apagadas (o fundo da garrafa que suou na mesa)
  {
    const sx = w * (0.72 + r() * 0.1);
    const sy = h * (0.2 + r() * 0.15);
    const rx = 7;
    const start = r() * Math.PI * 2;
    for (let a = start; a < start + Math.PI * 1.5; a += 0.025) b.put(sx + Math.cos(a) * rx, sy + Math.sin(a) * rx * 0.82, hex('#b4aa8c'), 0.1 + 0.06 * Math.sin((a - start) * 3));
  }
  // os riscos finos do uso (claros, de leve)
  for (let i = 0; i < 9; i += 1) {
    const x0 = RAIL + 10 + r() * (w - RAIL * 2 - 20);
    const y0 = RAIL + 10 + r() * (h - RAIL * 2 - 20);
    const len = 4 + r() * 9;
    const a = (r() - 0.5) * 0.8;
    b.line(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, PLASTIC.lo, 0.18);
  }
  // a sombra que o lábio faz no tampo (mais forte em cima: a luz vem do alto)
  for (let k = 0; k < 4; k += 1) {
    const a = (4 - k) * 0.06;
    b.rect(RAIL, RAIL + k, w - RAIL * 2, 1, [0, 0, 0], a * 1.3);
    b.rect(RAIL + k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a * 0.7);
    b.rect(w - RAIL - 1 - k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a * 0.7);
  }
  lampLight(b, { ambient: 0.96, peak: 0.1, warm: [1, 0.98, 0.94] });
}

/** A sombra rendada da copa da árvore no tampo (a praça), em manchas macias nos cantos de lá. */
function leafShade(b, r) {
  const { w, h } = b;
  const leaves = field(w, h, 7, r);
  const big = field(w, h, 40, r);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const j = y * w + x;
      const zone = Math.max(0, big[j] - 0.48) * 2.4 * (1 - y / h);
      const t = leaves[j] > 0.5 ? zone * 0.34 : 0;
      if (t > bayer(x, y) * 0.3) b.put(x, y, [10, 30, 20], Math.min(0.32, t));
    }
  }
}

// ---------------------------------------------------------------------------
// A mesa de concreto da praça, pintada de verde
// ---------------------------------------------------------------------------

const PAINT_G = { hi: hex('#5aa86a'), mid: hex('#2f7a45'), lo: hex('#1f5a32'), deep: hex('#123a20') };
const CEMENT = { hi: hex('#c8c4b8'), mid: hex('#9a968a'), lo: hex('#6e6a60'), deep: hex('#3a3830') };

function concreto(b, r) {
  const { w, h } = b;
  const grain = field(w, h, 2, r);
  const blot = field(w, h, 18, r);
  const chips = field(w, h, 9, r);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const j = y * w + x;
      const { d, side } = edgeOf(x, y, w, h);
      const speck = (grain[j] - 0.5) * 18;
      let c;
      if (d < LIP) {
        // a borda de cimento boleada, com a tinta verde gasta só no alto
        const k = d / (LIP - 1);
        c = d === 0 ? CEMENT.deep : k < 0.3 ? CEMENT.lo : k < 0.5 ? CEMENT.hi : k < 0.85 ? CEMENT.mid : CEMENT.lo;
        if (k > 0.45 && k < 0.95 && chips[j] < 0.74) c = lerp(PAINT_G.mid, PAINT_G.hi, k < 0.6 ? 0.5 : 0.1);
        if (side === 'top') c = lerp(c, CEMENT.hi, 0.12);
        if (side === 'bottom') c = lerp(c, CEMENT.deep, 0.12);
        c = shift(c, Math.round(speck * 0.6));
      } else if (d < RAIL) {
        const k = d - LIP;
        c = k === 0 ? PAINT_G.deep : k === 1 ? PAINT_G.lo : PAINT_G.mid;
        c = shift(c, Math.round(speck * 0.4));
      } else {
        // o tampo pintado: a pincelada na horizontal, as manchas da tinta e as lascas
        const brush = Math.sin(y * 1.7 + Math.sin(x * 0.05) * 2) * 3 + Math.sin(x * 0.9 + y * 0.3) * 1.2;
        c = shift(lerp(PAINT_G.mid, PAINT_G.lo, Math.max(0, blot[j] - 0.55) * 1.2), Math.round(brush + speck * 0.35));
        const chip = chips[j] > 0.87 && blot[j] > 0.52;
        if (chip) c = shift(CEMENT.mid, Math.round(speck * 0.7));
        else if (chips[j] > 0.85 && blot[j] > 0.5) c = PAINT_G.deep; // a beirada da lasca
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // o tabuleiro de damas pintado num canto de lá (a praça joga de tudo), bem desbotado
  {
    const s = 5;
    const ox = w - RAIL - 8 * s - 10;
    const oy = RAIL + 8;
    for (let gy = 0; gy < 6; gy += 1) for (let gx = 0; gx < 8; gx += 1) if ((gx + gy) % 2 === 0) b.rect(ox + gx * s, oy + gy * s, s, s, hex('#e8e4d4'), 0.16);
    b.rect(ox - 1, oy - 1, 8 * s + 2, 1, hex('#e8e4d4'), 0.18);
    b.rect(ox - 1, oy + 6 * s, 8 * s + 2, 1, hex('#e8e4d4'), 0.18);
  }
  for (let k = 0; k < 4; k += 1) {
    const a = (4 - k) * 0.07;
    b.rect(RAIL, RAIL + k, w - RAIL * 2, 1, [0, 0, 0], a * 1.3);
    b.rect(RAIL + k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a * 0.7);
    b.rect(w - RAIL - 1 - k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a * 0.7);
  }
  leafShade(b, r);
  lampLight(b, { ambient: 0.96, peak: 0.12, warm: [1, 0.98, 0.92] });
}

// ---------------------------------------------------------------------------
// A mesa de tábua do quiosque, pintada de azul
// ---------------------------------------------------------------------------

const PAINT_B = { hi: hex('#6aa8e0'), mid: hex('#2e6aaa'), lo: hex('#1f4c80'), deep: hex('#0f2a4a') };
const PINE = { hi: hex('#e8c48a'), mid: hex('#b88a52'), lo: hex('#7a5430'), deep: hex('#3a2410') };

function tabua(b, r) {
  const { w, h } = b;
  const grain = field(w, h, 2, r);
  const wear = field(w, h, 6, r);
  const PLANK = 11;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const j = y * w + x;
      const { d, side } = edgeOf(x, y, w, h);
      let c;
      if (d < LIP) {
        // a moldura de tábua em volta, também pintada, com a quina gasta mostrando a madeira
        const k = d / (LIP - 1);
        const along = side === 'top' || side === 'bottom' ? x : y;
        c = d === 0 ? PAINT_B.deep : k < 0.25 ? PAINT_B.lo : k < 0.45 ? (side === 'top' ? PAINT_B.hi : lerp(PAINT_B.mid, PAINT_B.hi, 0.5)) : k < 0.9 ? PAINT_B.mid : PAINT_B.lo;
        if (k > 0.2 && k < 0.5 && wear[j] > 0.78) c = lerp(PINE.mid, PINE.hi, 0.4);
        c = shift(c, Math.round(Math.sin(along * 0.4 + d) * 2 + (grain[j] - 0.5) * 6));
        // a emenda em meia-esquadria nos cantos
        const dT = Math.min(y, h - 1 - y);
        const dS = Math.min(x, w - 1 - x);
        if (Math.abs(dT - dS) === 0 && d > 0) c = PAINT_B.deep;
      } else if (d < RAIL) {
        const k = d - LIP;
        c = k === 0 ? PAINT_B.deep : k === 1 ? PAINT_B.lo : PAINT_B.mid;
      } else {
        // as tábuas na horizontal: a fresta escura entre elas, o veio por baixo da tinta
        const py = (y - RAIL) % PLANK;
        const plank = Math.floor((y - RAIL) / PLANK);
        const vein = Math.sin(x * 0.06 + plank * 2.1 + Math.sin(x * 0.017 + plank) * 2.4);
        c = lerp(PAINT_B.mid, PAINT_B.lo, vein > 0.7 ? 0.35 : 0);
        if (py === 0) c = PAINT_B.deep;
        else if (py === 1) c = lerp(PAINT_B.mid, PAINT_B.hi, 0.45);
        else if (py === PLANK - 1) c = PAINT_B.lo;
        // a tinta gasta mostrando o pinho (no meio, onde se apoia o braço, mais)
        const worn = wear[j] + (Math.abs(x - w / 2) < w * 0.25 && y > h * 0.62 ? 0.05 : 0);
        const edge = py === 2 || py === PLANK - 2;
        if ((edge && worn > 0.66) || worn > 0.9) c = lerp(PINE.mid, vein > 0.4 ? PINE.lo : PINE.hi, 0.35);
        c = shift(c, Math.round((grain[j] - 0.5) * 7));
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // os pregos: dois por tábua em cada ponta
  for (let py = RAIL; py < h - RAIL - 4; py += PLANK) {
    for (const px of [RAIL + 5, w - RAIL - 6]) {
      b.put(px, py + 5, hex('#2a2620'));
      b.put(px - 1, py + 4, hex('#c8c4b8'), 0.7);
    }
  }
  for (let k = 0; k < 4; k += 1) {
    const a = (4 - k) * 0.07;
    b.rect(RAIL, RAIL + k, w - RAIL * 2, 1, [0, 0, 0], a * 1.3);
    b.rect(RAIL + k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a * 0.7);
    b.rect(w - RAIL - 1 - k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a * 0.7);
  }
  lampLight(b, { ambient: 0.96, peak: 0.12, warm: [1, 0.98, 0.92] });
}

const PAINTERS = { plastico, concreto, tabua };

/** Pinta o tampo do material `kind` em `w` × `h` pixels da mesa. */
export function paintTableKind(kind, { w, h, seed = 11 }) {
  const b = buffer(w, h);
  PAINTERS[kind](b, rngOf(seed * 13 + kind.length));
  return b;
}

/** A frente da mesa (a saia) no mesmo material, `w` × `h` px. */
export function paintApronKind(kind, w, h, seed = 5) {
  const b = buffer(w, h);
  const r = rngOf(seed);
  const tones =
    kind === 'plastico'
      ? [hex('#ffffff'), hex('#dcdfd8'), hex('#b8bcb4'), hex('#9a9e96'), hex('#7a7e76')]
      : kind === 'concreto'
        ? [PAINT_G.hi, CEMENT.hi, CEMENT.mid, CEMENT.lo, CEMENT.deep]
        : [PAINT_B.hi, PAINT_B.mid, PAINT_B.lo, PAINT_B.deep, PAINT_B.deep];
  for (let y = 0; y < h - 3; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let c = y === 0 ? tones[0] : y === 1 ? tones[1] : y === 2 ? tones[3] : lerp(tones[2], tones[4], (y - 3) / Math.max(1, h - 6));
      if (kind === 'concreto') c = shift(c, Math.round((r() - 0.5) * 14));
      if (kind === 'tabua' && y > 3 && Math.sin(x * 0.05 + y * 2.1) > 0.8) c = lerp(c, PAINT_B.deep, 0.4);
      if (kind === 'plastico' && y === 6) c = lerp(c, tones[0], 0.4);
      b.put(x, y, clampRgb(c));
    }
  }
  if (kind === 'concreto') {
    for (let i = 0; i < Math.max(4, w / 24); i += 1) {
      const x = Math.floor(r() * (w - 6));
      b.rect(x, 3 + Math.floor(r() * 4), 2 + Math.floor(r() * 4), 1, CEMENT.deep, 0.6);
    }
  }
  if (kind === 'tabua') {
    for (let x = 14 + Math.floor(r() * 8); x < w - 10; x += 40 + Math.floor(r() * 16)) {
      b.put(x, 6, hex('#2a2620'));
      b.put(x, 5, hex('#c8c4b8'), 0.7);
    }
  }
  b.rect(0, h - 4, w, 1, tones[4]);
  for (let k = 0; k < 3; k += 1) b.rect(0, h - 3 + k, w, 1, [0, 0, 0], 0.6 - k * 0.18);
  // a luz: o meio mais claro (a lâmpada), as pontas no escuro
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.abs(x - w / 2) / (w * 0.6);
      const q = Math.round((0.72 + 0.32 * (1 - d * d)) * 8 + bayer(x, y) - 0.5) / 8;
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c += 1) b.data[i + c] = Math.min(255, b.data[i + c] * q);
    }
  }
  return b;
}
