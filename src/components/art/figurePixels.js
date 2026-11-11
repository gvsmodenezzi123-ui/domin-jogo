/**
 * Versão 2.17: os personagens REFEITOS do zero. A figura inteira (cabeça, rosto, cabelo, chapéu,
 * roupa, braços e os objetos de cada um) é pintada aqui, no tamanho do busto (88×76), a partir da
 * mesma ficha de sempre (art/portraitSpecs.js); o retrato 64×64 é o recorte do meio.
 *
 * O jeito de pintar é outro: cada parte é uma FORMA com volume (a luz da lâmpada vem de cima e
 * da esquerda e escolhe um dos cinco tons do material, em degraus limpos), a borda de cada forma
 * sai no tom mais escuro do próprio material (o contorno colorido, não um risco preto) e a
 * silhueta inteira ganha o contorno de tinta no fim. Os detalhes (olhos, boca, botões, fios do
 * cabelo, costuras) são postos pixel a pixel por cima.
 */
import { paintKit } from './botecoScene.js';

const { hex, buffer } = paintKit;

export const FIG_W = 88;
export const FIG_H = 76;
/** O retrato 64×64 começa 12 px para dentro da figura. */
export const FIG_OX = 12;
const W = FIG_W;
const H = FIG_H;
/** O eixo da figura passa ENTRE os pixels 43 e 44. */
const AX = 44;
const INK = hex('#170c0a');
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

/** Os cinco tons de um material: sombra funda, sombra, base, luz e brilho. */
export function rampOf(base) {
  const c = typeof base === 'string' ? hex(base) : base;
  const lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
  // materiais muito escuros acendem mais na luz; os muito claros escurecem mais na sombra
  return [mix(c, hex('#12060c'), 0.66), mix(c, hex('#2a1018'), 0.36 + lum * 0.1), c, mix(c, hex('#fff0d6'), 0.24 + (1 - lum) * 0.08), mix(c, hex('#fff8ea'), 0.46 + (1 - lum) * 0.1)];
}

/** A meia-largura do rosto na altura t (0 testa .. 1 queixo), por tipo de queixo. */
const FACE = { top: 13, bottom: 44, half: 12.5 };
function halfAt(jaw, t) {
  const Hf = FACE.half;
  if (t < 0 || t > 1) return 0;
  const crown = Math.sqrt(Math.max(0, 1 - ((0.42 - Math.min(t, 0.42)) / 0.42) ** 2));
  if (jaw === 'square') return Hf * (t < 0.42 ? crown : t < 0.82 ? 1 : 1 - ((t - 0.82) / 0.18) ** 1.6 * 0.5);
  if (jaw === 'heavy') return Hf * (t < 0.42 ? crown : t < 0.86 ? 1 + Math.sin(((t - 0.42) / 0.44) * Math.PI) * 0.1 : 1.04 - ((t - 0.86) / 0.14) ** 1.4 * 0.46);
  if (jaw === 'long') return Hf * 0.9 * (t < 0.42 ? crown : 1 - ((t - 0.42) / 0.58) ** 2.2 * 0.6);
  if (jaw === 'thin') return Hf * 0.86 * (t < 0.42 ? crown : 1 - ((t - 0.42) / 0.58) ** 1.6 * 0.68);
  return Hf * (t < 0.42 ? crown : 1 - ((t - 0.42) / 0.58) ** 1.8 * 0.62);
}

const DIG = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function rngOf(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** A prancheta: o buffer do jogo com as formas de volume por cima. */
function board() {
  const b = buffer(W, H);
  const alpha = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : b.data[(y * W + x) * 4 + 3]);
  const P = (x, y, c, a = 1) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    b.put(px, py, c, a);
  };
  /**
   * Uma forma: `test(x, y)` diz quem é dela; `vol` (cx, cy, rx, ry) é o volume que a luz
   * enxerga. Devolve a máscara (para os detalhes só caírem onde a forma está).
   */
  const form = (test, vol, R, { bias = 0, edge = true, lightFn = null } = {}) => {
    const mask = new Uint8Array(W * H);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (test(x, y)) mask[y * W + x] = 1;
    const m = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (!mask[y * W + x]) continue;
        const nx = (x + 0.5 - vol.cx) / vol.rx;
        const ny = (y + 0.5 - vol.cy) / vol.ry;
        let l = 0.52 - 0.5 * (nx * 0.58 + ny * 0.7) + bias;
        if (lightFn) l += lightFn(x, y, nx, ny);
        let idx = Math.floor(l * 5 + (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 0.12);
        idx = Math.max(0, Math.min(4, idx));
        if (edge && (!m(x - 1, y) || !m(x + 1, y) || !m(x, y - 1) || !m(x, y + 1))) idx = l > 0.62 ? Math.max(1, idx - 2) : Math.max(0, Math.min(idx - 1, 1));
        b.put(x, y, R[idx]);
      }
    }
    return mask;
  };
  const line = (x0, y0, x1, y1, c, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i += 1) P(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
  };
  const rect = (x, y, w, h, c, a = 1) => {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) P(x + i, y + j, c, a);
  };
  const bezier = (p0, p1, p2, fn) => {
    let last = null;
    for (let i = 0; i <= 48; i += 1) {
      const t = i / 48;
      const x = Math.round((1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]);
      const y = Math.round((1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]);
      if (last && last[0] === x && last[1] === y) continue;
      last = [x, y];
      fn(x, y, t);
    }
  };
  /** Par espelhado: k = 0 são os dois pixels do eixo (43 e 44). */
  const sym = (k, y, c, a = 1) => {
    P(AX - 1 - k, y, c, a);
    P(AX + k, y, c, a);
  };
  const inkOutline = () => {
    const marks = [];
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (!alpha(x, y) && (alpha(x - 1, y) > 200 || alpha(x + 1, y) > 200 || alpha(x, y - 1) > 200 || alpha(x, y + 1) > 200)) marks.push([x, y]);
    for (const [x, y] of marks) b.put(x, y, INK);
  };
  return { b, P, form, line, rect, bezier, sym, alpha, inkOutline };
}

const ell = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const poly = (pts) => (x, y) => {
  let inside = false;
  const px = x + 0.5;
  const py = y + 0.5;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/* ------------------------------------------------------------------ o corpo */
function paintBody(k, spec) {
  const { form, P, line, rect, sym } = k;
  const o = spec.outfit ?? {};
  const type = o.type ?? 'shirt';
  const cloth = rampOf(o.color ?? '#3a4a6a');
  const skin = rampOf(spec.skin ?? '#c88a5a');
  const accent = o.accent ? rampOf(o.accent) : cloth;
  const S = spec.broad ? 33 : 30;
  const top = (dxIn) => {
    const a = Math.abs(dxIn);
    if (a <= 6) return 47;
    if (a <= S - 6) return 47 + ((a - 6) / (S - 12)) ** 1.6 * 9;
    return 56 + ((a - (S - 6)) / 6) ** 2 * 14;
  };
  const dxOf = (x) => x + 0.5 - AX;
  const inBody = (x, y) => Math.abs(dxOf(x)) <= S && y >= top(dxOf(x));
  const tank = type === 'tank';
  // a sombra que a cabeça faz no peito
  const chinShade = (x, y) => {
    const d = ((x + 0.5 - AX - 2) / 12) ** 2 + ((y - 47) / 7) ** 2;
    return d < 1 ? -0.3 * (1 - d) : 0;
  };
  // o pescoço
  form((x, y) => Math.abs(dxOf(x)) <= 5.6 && y >= 37 && y <= 50, { cx: AX, cy: 47, rx: 7, ry: 8 }, skin, { bias: -0.2, lightFn: (x, y) => (y < 46 ? -0.28 : 0) });
  // o tronco e os ombros
  // (o tronco é largo e quase chato: a luz cai de cima, com a lateral direita virando sombra)
  const bodyLight = (x, y, nx) => chinShade(x, y) - (nx > 0 ? nx * nx * 0.5 : nx * nx * 0.12);
  const torso = form(inBody, { cx: AX, cy: 64, rx: S * 2.4, ry: 22 }, tank ? skin : cloth, { bias: 0.0, lightFn: bodyLight });
  // os braços: cilindros colados no tronco, com a dobra da cava
  for (const s of [-1, 1]) {
    form((x, y) => dxOf(x) * s >= S - 9 && dxOf(x) * s <= S && y >= Math.max(top(dxOf(x)), 59), { cx: AX + s * (S - 4.5), cy: 72, rx: 5.5, ry: 22 }, tank ? skin : cloth, { edge: false });
    line(AX + s * (S - 9) - (s < 0 ? 1 : 0), 61, AX + s * (S - 9) - (s < 0 ? 1 : 0), H - 1, (tank ? skin : cloth)[0]);
    P(AX + s * (S - 8) - (s < 0 ? 1 : 0), 60, (tank ? skin : cloth)[0]);
  }
  const on = (x, y) => torso[y * W + x] === 1;

  if (tank) {
    // a regata: o pano no meio e as alças
    const under = rampOf(o.shirt ?? o.color ?? '#efefe8');
    form((x, y) => on(x, y) && ((Math.abs(dxOf(x)) <= 12.5 && y >= 51 + (Math.abs(dxOf(x)) < 5 ? 2 : 0)) || (Math.abs(dxOf(x)) >= 8 && Math.abs(dxOf(x)) <= 12.5 && y >= 47)), { cx: AX, cy: 66, rx: 14, ry: 22 }, under, { lightFn: chinShade });
  } else if (type === 'suit' || type === 'jacket' || type === 'coat') {
    // a camisa no V, as lapelas, a gravata ou a borboleta
    const shirt = rampOf(o.shirt ?? '#e8e4d8');
    const vee = (y) => Math.min(7.5, (y - 46) * 0.62);
    form((x, y) => on(x, y) && y >= 47 && Math.abs(dxOf(x)) <= vee(y), { cx: AX, cy: 60, rx: 20, ry: 30 }, shirt, { bias: 0.06, edge: false, lightFn: chinShade });
    for (const s of [-1, 1]) {
      form(
        (x, y) => {
          const d = dxOf(x) * s;
          const e = vee(y);
          return on(x, y) && y >= 47 && d > e && d <= e + (y < 52 ? 3 + (y - 47) * 0.5 : y < 61 ? 5.5 - (y - 52) * 0.5 : 1);
        },
        { cx: AX + s * 9, cy: 56, rx: 9, ry: 12 },
        o.accent ? accent : cloth,
        { bias: 0.1 },
      );
    }
    if (o.tie) {
      const tie = rampOf(o.tie);
      form((x, y) => y >= 48 && y <= 50 && Math.abs(dxOf(x)) <= 2, { cx: AX, cy: 49, rx: 3, ry: 2 }, tie, { bias: 0.1 });
      form((x, y) => y >= 51 && Math.abs(dxOf(x)) <= Math.min(3, 1.4 + (y - 51) * 0.16), { cx: AX, cy: 62, rx: 6, ry: 22 }, tie);
    }
    if (o.bow) {
      const bow = rampOf(o.bow);
      for (const s of [-1, 1]) form(poly([[AX + s * 1, 48.5], [AX + s * 5.5, 46.5], [AX + s * 5.5, 51.5], [AX + s * 1, 49.5]]), { cx: AX + s * 3, cy: 49, rx: 3, ry: 3 }, bow, { bias: 0.1 });
      sym(0, 48, bow[1]);
      sym(0, 49, bow[0]);
    } else if (!o.tie) {
      // os botões da camisa
      for (let y = 52; y < H; y += 5) sym(0, y, shirt[1]);
    }
    if (type === 'coat') for (const y of [60, 67, 74]) P(AX - 9 - (y - 60) * 0.1, y, accent[4]);
  } else {
    // camisa, uniforme, cardigã, avental, túnica, camisa de time
    const collar = rampOf(o.collar ?? o.color ?? '#3a4a6a');
    if (type === 'cardigan') {
      form((x, y) => on(x, y) && y >= 47 && y <= 62 && Math.abs(dxOf(x)) <= (62 - y) * 0.46, { cx: AX, cy: 54, rx: 8, ry: 9 }, collar, { bias: -0.06, edge: false, lightFn: chinShade });
      for (let y = 48; y <= 62; y += 1) for (const s of [-1, 1]) P(AX + (s > 0 ? 0 : -1) + s * Math.round((62 - y) * 0.46 + 1), y, cloth[4]);
      line(AX - 1, 63, AX - 1, H - 1, cloth[0]);
      for (let y = 53; y < H; y += 1) for (let x = AX - S + 1; x < AX + S; x += 3) if (on(x, y) && Math.abs(dxOf(x)) > (62 - y) * 0.46 + 2) P(x, y, cloth[0], 0.3);
      for (const y of [66, 73]) {
        P(AX - 1, y, hex('#f6d470'));
        P(AX, y, hex('#a67a1e'));
      }
    }
    if (type === 'jersey' || type === 'robe') {
      // a gola redonda
      form((x, y) => on(x, y) && y <= 52 && ((dxOf(x) / 8.5) ** 2 + ((y - 46) / 5.5) ** 2 <= 1) && !((dxOf(x) / 5.5) ** 2 + ((y - 45.5) / 3.6) ** 2 <= 1), { cx: AX, cy: 49, rx: 9, ry: 5 }, collar, { bias: 0.12 });
      if (type === 'robe') form((x, y) => on(x, y) && y >= 50 && Math.abs(dxOf(x)) <= 2.2, { cx: AX, cy: 62, rx: 3, ry: 14 }, accent, { bias: 0.08 });
    } else if (type !== 'cardigan' || o.collar) {
      // as duas pontas da gola
      for (const s of [-1, 1]) form(poly([[AX + s * 5.5, 45.5], [AX + s * 0.6, 49.5], [AX + s * 3.6, 55.5], [AX + s * 10.5, 51]]), { cx: AX + s * 6, cy: 50, rx: 6, ry: 6 }, collar, { bias: 0.1 });
      if (type !== 'cardigan') line(AX - 1, 52, AX - 1, H - 1, cloth[0], 0.7);
    }
    if (type === 'apron') {
      const ap = rampOf(o.accent ?? '#e8e0d0');
      form((x, y) => on(x, y) && y >= 54 && Math.abs(dxOf(x)) <= 12, { cx: AX, cy: 66, rx: 13, ry: 14 }, ap, { bias: 0.02 });
      for (const s of [-1, 1]) line(AX + s * 11, 54, AX + s * 16, 49, ap[1]);
      rect(AX - 5, 60, 10, 1, ap[1]);
    }
    if (o.buttons) for (let y = 52; y < H; y += 5) P(AX - 1, y, accent[4]);
    if (o.stripes) {
      const st = hex(o.stripes);
      for (let y = 46; y < H; y += 1) for (let x = 0; x < W; x += 1) if (on(x, y) && Math.floor((x + 1) / 3) % 2 === 0 && Math.abs(dxOf(x)) > 4.5 && !(type !== 'jersey' && y < 56 && Math.abs(dxOf(x)) < 11)) P(x, y, mix(st, INK, Math.max(0, (x - AX) / 90 + (y - 60) / 60)));
    }
    if (o.plaid) {
      const pl = hex(o.plaid);
      for (let y = 46; y < H; y += 1) for (let x = 0; x < W; x += 1) if (on(x, y) && Math.abs(dxOf(x)) > 3 && (x % 6 === 0 || y % 6 === 0)) P(x, y, pl, 0.55);
    }
    if (o.number) {
      String(o.number)
        .split('')
        .forEach((ch, i) => (DIG[ch] ?? []).forEach((row, ry) => row.split('').forEach((bit, rx) => bit === '1' && P(AX + 6 + i * 4 + rx, 55 + ry, hex('#f8f4ea')))));
    }
    if (o.badge) {
      rect(AX + 9, 54, 5, 6, hex('#a67a1e'));
      rect(AX + 10, 55, 3, 4, hex('#ffe08a'));
      P(AX + 11, 56, hex('#6a4a10'));
      P(AX + 10, 55, hex('#fffbe0'));
    }
    if (o.patch) {
      rect(AX - 17, 55, 8, 4, hex('#f4f0e6'));
      line(AX - 16, 57, AX - 11, 57, hex(o.patch));
      line(AX - 17, 59, AX - 10, 59, cloth[0], 0.6);
    }
  }
  if (o.scarf) {
    const sc = rampOf(o.scarf);
    form((x, y) => (y >= 43 && y < 48 && Math.abs(dxOf(x)) < 10 - (y - 43) * 0.3) || (y >= 48 && y <= 57 && Math.abs(dxOf(x)) < 9 - (y - 48) * 1.0), { cx: AX, cy: 48, rx: 10, ry: 8 }, sc, { bias: 0.06 });
    form(ell(AX + 7.5, 46.5, 2.4, 2), { cx: AX + 7.5, cy: 46.5, rx: 3, ry: 3 }, sc, { bias: -0.1 });
    line(AX + 8, 48, AX + 11, 53, sc[1]);
  }
  if (o.tears) {
    const patch = rampOf(o.patchColor ?? '#8a6a3a');
    rect(AX - 21, 56, 5, 4, patch[2]);
    for (let x = AX - 21; x < AX - 16; x += 2) P(x, 55, patch[4]);
    P(AX - 22, 57, patch[0]);
    P(AX - 16, 58, patch[0]);
    line(AX + 15, 54, AX + 19, 60, cloth[0]);
    line(AX + 16, 54, AX + 20, 60, cloth[4], 0.6);
    line(AX - 26, 63, AX - 23, 66, cloth[0]);
  }
  if (o.chain) {
    const gold = rampOf('#e6c34a');
    let i = 0;
    for (let a = 0.12; a < Math.PI - 0.12; a += 0.11) {
      i += 1;
      P(AX - 0.5 + Math.cos(a) * 9, 46 + Math.sin(a) * 8, i % 2 ? gold[4] : gold[1]);
    }
    if (o.medal) {
      form(ell(AX, 56, 2.6, 2.6), { cx: AX, cy: 56, rx: 3, ry: 3 }, gold, { bias: 0.1 });
    }
  }
  if (o.boa) {
    const boa = rampOf(o.boa);
    const r = rngOf(17);
    for (let i = 0; i < 46; i += 1) {
      const a = (i / 45) * Math.PI;
      const cx = AX + Math.cos(a) * 19 + (r() - 0.5) * 3;
      const cy = 50 + Math.sin(a) * 6 + (r() - 0.5) * 3;
      form(ell(cx, cy, 2.6, 2.3), { cx, cy, rx: 3, ry: 3 }, boa, { bias: i % 3 ? 0 : 0.14, edge: i % 2 === 0 });
    }
  }
  if (o.pearls) {
    for (let d = -5; d <= 4; d += 1) {
      const y = 44 + Math.round(3.4 * (1 - ((d + 0.5) / 5.6) ** 2));
      P(AX + d, y, d & 1 ? hex('#b9b3a8') : hex('#fffdf6'));
      P(AX + d, y + 1, skin[0], 0.5);
    }
  }
}

/* ------------------------------------------------------------------ a cabeça */
function paintHead(k, spec, mood) {
  const { form, P, line, sym } = k;
  const skin = rampOf(spec.skin ?? '#c88a5a');
  const jaw = spec.jaw ?? 'round';
  const top = FACE.top;
  const bottom = FACE.bottom + (jaw === 'long' ? 2 : 0);
  const span = bottom - top;
  const half = (y) => halfAt(jaw, (y + 0.5 - top) / span);
  // as orelhas
  for (const s of [-1, 1]) {
    const ex = AX + s * (halfAt(jaw, 0.45) + 0.8);
    form(ell(ex, 29.5, 2.4, 3.8), { cx: ex, cy: 29.5, rx: 3, ry: 4.4 }, skin, { bias: -0.06 });
    P(ex - 0.5 + s * 0.2, 29, skin[1]);
    P(ex - 0.5 - s * 0.4, 30, skin[1]);
  }
  // o rosto
  form((x, y) => y >= top && y <= bottom && Math.abs(x + 0.5 - AX) <= half(y), { cx: AX, cy: 28, rx: 14.5, ry: 18 }, skin, {
    bias: 0.08,
    lightFn: (x, y, nx, ny) => (ny > 0.72 ? -(ny - 0.72) * 1.1 : 0) + (((nx + 0.42) / 0.3) ** 2 + ((ny - 0.42) / 0.14) ** 2 < 1 ? 0.12 : 0),
  });
  if (spec.blush) {
    const bl = hex(spec.blush);
    for (const s of [-1, 1]) for (let dy = -1; dy <= 2; dy += 1) for (let dx = -3; dx <= 2; dx += 1) if ((dx + 0.5) ** 2 + dy * dy * 2.2 <= 8 && ((dx + dy) & 1) === 0) P(AX - 0.5 + s * 8.5 + dx + 0.5, 33 + dy, bl, 0.42);
  }
  if (spec.wrinkles) {
    for (const [d, y, a] of [[4, 34, 0.9], [5, 35, 0.9], [5, 36, 0.6]]) sym(d, y, skin[1], a);
    for (let d = 0; d <= 3; d += 1) sym(d, 19, skin[1], 0.45);
    sym(9, 31, skin[1], 0.5);
  }
  if (spec.scar) {
    line(AX + 6, 25, AX + 9, 33, hex('#a05040'));
    for (let i = 0; i < 3; i += 1) P(AX + 7 + i, 27 + i * 2, hex('#f0c0a8'));
  }
  // o nariz
  const big = spec.nose === 'big';
  const hook = spec.nose === 'hook';
  for (let y = 28; y <= 32; y += 1) P(AX + 1, y, skin[1], 0.75);
  P(AX - 1, 30, skin[4], 0.7);
  P(AX - 1, 31, skin[4], 0.7);
  sym(0, 33, skin[3]);
  P(AX - 1, 33, skin[4]);
  if (big) {
    sym(1, 33, skin[3]);
    sym(2, 34, skin[1]);
    sym(1, 34, skin[2]);
  }
  sym(big ? 2 : 1, 34 + (big ? 1 : 0) - (big ? 1 : 0), skin[0]);
  sym(0, 35, skin[1]);
  if (hook) {
    P(AX + 2, 31, skin[1]);
    P(AX + 2, 32, skin[1]);
    P(AX + 1, 34, skin[0]);
  }
  void mood;
}

function paintEyes(k, spec, mood) {
  const { P, sym } = k;
  const skin = rampOf(spec.skin ?? '#c88a5a');
  const brow = hex(spec.brow ?? spec.facial?.color ?? spec.hair?.color ?? '#2a1a10');
  const iris = hex(spec.iris ?? '#4a2c14');
  const white = hex('#f8f2e6');
  const dark = hex('#140a08');
  const ey = 27;
  for (const s of [-1, 1]) {
    // o olho ocupa 5 pixels: de fora (k = 0) para dentro (k = 4)
    const X = (i) => (s < 0 ? AX - 9 + i : AX + 8 - i);
    const by = ey - 4;
    const browAt = (i, y, a = 1) => P(X(i), y, brow, a);
    const shape = spec.browShape;
    // as sobrancelhas: o jeito de cada um e o do humor
    for (let i = -1; i <= 5; i += 1) {
      let y = by;
      if (mood === 'hurt') y = by + (i <= 1 ? 1 : i >= 4 ? -1 : 0);
      else if (mood === 'thinking' && s > 0) y = by - 2 + (i <= 0 ? 1 : 0);
      else if (mood === 'smug') y = by + 1 - (s > 0 ? (i >= 3 ? 0 : 1) : i >= 3 ? 1 : 0);
      else if (shape === 'angry') y = by - 1 + (i >= 4 ? 2 : i >= 2 ? 1 : 0);
      else if (shape === 'sad') y = by + 1 - (i >= 4 ? 2 : i >= 2 ? 1 : 0);
      else if (shape === 'arched') y = by + (i <= 0 || i >= 5 ? 1 : i >= 1 && i <= 3 ? -1 : 0);
      browAt(i, y);
      if (spec.thickBrows) browAt(i, y - 1);
    }
    if (mood === 'blink') {
      for (let i = 0; i < 5; i += 1) P(X(i), ey + 1, dark);
      for (let i = 0; i < 5; i += 1) P(X(i), ey, skin[1], 0.7);
      continue;
    }
    if (mood === 'hurt') {
      // apertados: > e <
      for (const [i, y] of [[0, ey - 1], [1, ey - 1], [2, ey], [3, ey], [0, ey + 1], [1, ey + 1]]) P(X(i), y, dark);
      continue;
    }
    const sleepy = mood === 'smug' || spec.eyes === 'sleepy';
    const lidY = sleepy ? ey : ey - 1;
    // a sombra da órbita
    for (let i = 0; i < 5; i += 1) P(X(i), lidY - 1, skin[1], 0.5);
    // o branco
    for (let i = 0; i < 5; i += 1) for (let y = lidY; y <= ey + 1; y += 1) P(X(i), y, white);
    P(X(0), ey + 1, skin[2]);
    P(X(4), lidY, skin[1]);
    if (spec.eyes === 'narrow') for (let i = 0; i < 5; i += 1) P(X(i), ey + 1, skin[2]);
    // a íris: para onde olha
    let look = 2;
    if (mood === 'thinking') look = s < 0 ? 1 : 3;
    else if (mood === 'smug') look = s < 0 ? 3 : 1;
    const ix = (i) => (s < 0 ? AX - 9 + i : AX + 4 + i); // em coordenada de tela (a íris não espelha)
    const iy0 = mood === 'thinking' && !sleepy ? lidY : Math.max(lidY, ey - 1);
    for (let y = iy0; y <= Math.min(iy0 + 2, ey + 1 - (spec.eyes === 'narrow' ? 1 : 0)); y += 1) {
      P(ix(look - 1 + (s < 0 ? 1 : 0)), y, iris);
      P(ix(look + (s < 0 ? 1 : 0)), y, y === iy0 ? iris : dark);
    }
    P(ix(look - 1 + (s < 0 ? 1 : 0)), iy0, hex('#ffffff'), 0.85);
    // a pálpebra de cima: o traço escuro (o canto de dentro some na pele) e a dobra em cima
    for (let i = 0; i < 4; i += 1) P(X(i), lidY - 1, dark);
    if (sleepy) for (let i = 0; i < 5; i += 1) P(X(i), lidY - 2, skin[1], 0.6);
    if (spec.eyes === 'lashes') {
      P(X(-1), lidY - 1, dark);
      P(X(-1), lidY - 2, dark);
    }
    // a pálpebra de baixo e as olheiras
    for (let i = 1; i <= 3; i += 1) P(X(i), ey + 2, skin[1], 0.55);
    if (spec.wrinkles || spec.eyes === 'tired') {
      for (let i = 0; i <= 3; i += 1) P(X(i), ey + 3, skin[1], 0.75);
      P(X(4), ey + 2, skin[1], 0.6);
    }
  }
  void sym;
}

function paintMouth(k, spec, moodIn, speaking) {
  const { P, sym, line } = k;
  const mood = moodIn === 'blink' ? (spec.restMood ?? 'idle') : moodIn;
  const skin = rampOf(spec.skin ?? '#c88a5a');
  const lipBase = spec.lip ? hex(spec.lip) : mix(hex(spec.skin ?? '#c88a5a'), hex('#6a1a1a'), 0.46);
  const lipLine = mix(lipBase, hex('#2a0608'), 0.5);
  const lipHi = mix(lipBase, hex('#ffd8d0'), 0.35);
  const inside = hex('#2a080a');
  const teeth = hex('#f8f2e6');
  const my = 38;
  const gold = () => spec.goldTooth && P(AX + 1, my, hex('#ffd04a'));
  if (mood === 'hurt') {
    for (let d = 0; d <= 3; d += 1) {
      sym(d, my - 1, lipLine);
      sym(d, my, teeth);
      sym(d, my + 1, teeth);
      sym(d, my + 2, lipBase);
    }
    sym(1, my + 1, inside, 0.5);
    sym(3, my + 1, inside, 0.5);
    sym(4, my, lipLine);
    sym(4, my + 1, lipLine);
    gold();
    return;
  }
  if (speaking) {
    for (let d = 0; d <= 2; d += 1) {
      sym(d, my - 1, lipBase);
      sym(d, my, d < 2 ? teeth : inside);
      sym(d, my + 1, inside);
      sym(d, my + 2, d < 2 ? hex('#c4525e') : inside);
      sym(d, my + 3, lipBase);
    }
    sym(0, my + 3, lipHi);
    for (let y = my; y <= my + 2; y += 1) sym(3, y, lipLine);
    gold();
    return;
  }
  if (mood === 'smug') {
    for (let d = 0; d <= 2; d += 1) sym(d, my, lipLine);
    P(AX - 4, my, lipLine);
    P(AX + 3, my - 1, lipLine);
    P(AX + 4, my - 2, lipLine);
    for (let d = 0; d <= 1; d += 1) sym(d, my + 1, spec.lip ? lipBase : skin[1], spec.lip ? 1 : 0.6);
    if (spec.goldTooth) P(AX + 2, my, hex('#ffd04a'));
    return;
  }
  if (mood === 'thinking') {
    for (let x = AX - 1; x <= AX + 2; x += 1) P(x, my, lipLine);
    P(AX + 3, my - 1, lipLine);
    P(AX - 2, my, lipLine, 0.6);
    for (let x = AX - 1; x <= AX + 2; x += 1) P(x, my + 1, spec.lip ? lipBase : skin[1], spec.lip ? 1 : 0.5);
    return;
  }
  for (let d = 0; d <= 2; d += 1) sym(d, my, lipLine);
  sym(3, my - (spec.restMood === 'smug' ? 0 : 0), lipLine, 0.9);
  if (spec.lip) {
    for (let d = 0; d <= 1; d += 1) sym(d, my - 1, lipBase);
    for (let d = 0; d <= 2; d += 1) sym(d, my + 1, d === 0 ? lipHi : lipBase);
  } else {
    for (let d = 0; d <= 1; d += 1) sym(d, my + 1, skin[1], 0.45);
    for (let d = 0; d <= 1; d += 1) sym(d, my + 2, skin[1], 0.4);
  }
  void line;
}

function paintFacialHair(k, spec) {
  const { form, P, sym } = k;
  const fh = spec.facial;
  if (!fh) return;
  const R = rampOf(fh.color ?? spec.hair?.color ?? '#2a1a10');
  const jaw = spec.jaw ?? 'round';
  const top = FACE.top;
  const bottom = FACE.bottom + (jaw === 'long' ? 2 : 0);
  const span = bottom - top;
  const half = (y) => halfAt(jaw, Math.min(1, (y + 0.5 - top) / span));
  if (fh.beard || fh.stubble) {
    const long = fh.beard === 'long';
    const test = (x, y) => {
      const dx = Math.abs(x + 0.5 - AX);
      if (y < 31) return false;
      if (y > bottom) return long && y <= bottom + 6 && dx <= 7.5 - (y - bottom) * 0.9;
      const nx = dx / Math.max(1, half(y));
      if (nx > 1.06) return false;
      if (dx < 4 && y >= 37 && y <= 39 && !fh.coverMouth) return false;
      if (y < 35 && nx < 0.62) return false;
      if (y < 37 && nx < 0.5) return false;
      return true;
    };
    if (fh.stubble) {
      for (let y = 31; y <= bottom; y += 1) for (let x = 0; x < W; x += 1) if (test(x, y) && (x + y) % 2 === 0) P(x, y, R[1], y > 39 ? 0.5 : 0.32);
    } else {
      form(test, { cx: AX, cy: 40, rx: 14, ry: 11 }, R, { bias: 0.04 });
      // os fios da barba
      const r = rngOf((spec.seed ?? 3) * 17 + 2);
      for (let i = 0; i < 14; i += 1) {
        const x = Math.round(AX - 10 + r() * 20);
        const y = Math.round(37 + r() * (bottom - 37 + (long ? 4 : 0)));
        if (test(x, y) && test(x, y + 1) && test(x - 1, y) && test(x + 1, y)) {
          P(x, y, i % 3 ? R[1] : R[4], 0.7);
          P(x, y + 1, i % 3 ? R[1] : R[4], 0.5);
        }
      }
    }
  }
  if (fh.mustache) {
    const bigM = fh.mustache === 'big' || fh.mustache === 'handlebar' || fh.mustache === 'gold';
    const wM = bigM ? 7.5 : 5;
    form(
      (x, y) => {
        const d = Math.abs(x + 0.5 - AX);
        if (d > wM) return false;
        const y0 = 35 + (d > wM - 2 ? 1 : 0);
        const y1 = bigM ? 37 + (d > 2 ? 0.6 : 0) : 36;
        return y >= y0 && y <= y1;
      },
      { cx: AX, cy: 36, rx: 8, ry: 2.5 },
      R,
      { bias: 0.12 },
    );
    sym(0, 35, R[1]);
    if (fh.mustache === 'handlebar' || fh.mustache === 'gold') {
      sym(8, 36, R[2]);
      sym(9, 35, R[2]);
      sym(9, 34, R[4]);
    }
  }
  if (fh.goatee) form((x, y) => y >= 40 && y <= 43 && Math.abs(x + 0.5 - AX) <= (y === 43 ? 1.5 : 2.5), { cx: AX, cy: 41.5, rx: 3, ry: 3 }, R);
}

function paintHair(k, spec, layer) {
  const { form, P, bezier, line } = k;
  const h = spec.hair;
  if (!h || h.style === 'none') return;
  const R = rampOf(h.color ?? '#2a1a10');
  const jaw = spec.jaw ?? 'round';
  const top = FACE.top;
  const span = FACE.bottom - top;
  const style = h.style;
  const dxOf = (x) => x + 0.5 - AX;
  if (layer === 'back') {
    if (style === 'long' || style === 'bob' || style === 'bun' || style === 'volume') {
      const reach = style === 'long' ? 56 : style === 'bob' ? 43 : style === 'volume' ? 40 : 37;
      const extra = style === 'volume' ? 5 : 3.6;
      form(
        (x, y) => {
          if (y < top - 4 || y > reach) return false;
          const yy = Math.max(top, Math.min(FACE.bottom, y));
          const w = halfAt(jaw, (yy + 0.5 - top) / span) + extra - (y > reach - 3 ? (y - reach + 3) * 0.8 : 0);
          return Math.abs(dxOf(x)) <= w && y >= top - 4 + Math.abs(dxOf(x)) * 0.16;
        },
        { cx: AX, cy: 24, rx: 18, ry: 20 },
        R,
        { bias: -0.1 },
      );
    }
    if (style === 'bun') {
      form(ell(AX, top - 4.5, 6.4, 5.4), { cx: AX, cy: top - 4.5, rx: 7, ry: 6 }, R, { bias: 0.04 });
      bezier([AX - 4, top - 5], [AX, top - 10], [AX + 3, top - 4], (x, y) => P(x, y, R[1]));
      bezier([AX - 2, top - 2], [AX + 1, top - 5], [AX + 2, top - 1], (x, y) => P(x, y, R[1]));
    }
    return;
  }
  const cover = style === 'bald' ? 0 : style === 'thin' ? 0.12 : style === 'slick' || style === 'short' || style === 'crew' ? 0.2 : style === 'bob' ? 0.36 : 0.25;
  const puff = style === 'curly' || style === 'volume';
  const lift = puff ? 3.4 : style === 'slick' ? 1.6 : style === 'crew' ? 0.8 : 1.2;
  const test = (x, y) => {
    if (y < top - 5 || y > FACE.bottom) return false;
    const tt = (y + 0.5 - top) / span;
    const dx = dxOf(x);
    const w = halfAt(jaw, Math.max(0.02, tt)) + 1.3 + (puff ? 2 : 0);
    const wTop = halfAt(jaw, 0.12) + 1.3 + (puff ? 2 : 0);
    const ww = tt < 0.12 ? wTop * Math.sqrt(Math.max(0, 1 - ((0.12 - tt) / (0.12 + (lift + 0.4) / span)) ** 2)) : w;
    if (Math.abs(dx) > ww) return false;
    if (puff && style === 'curly' && tt < 0 && Math.sin(x * 1.5) * 0.9 + top - lift > y) return false;
    const edge = Math.abs(dx) / Math.max(1, w);
    let inHair = tt < cover;
    // a linha do cabelo: repartido de lado ou reto
    if (style === 'side') inHair = tt < cover + (dx > -4 ? Math.min(0.14, (dx + 4) * 0.012) : 0);
    if (style === 'bob' || style === 'long') inHair = tt < cover - 0.1 + Math.min(0.12, Math.abs(dx + 3) * 0.012);
    if (style !== 'bald' && edge > 0.84 && tt < 0.47) inHair = true; // as costeletas
    if (style === 'bald' && edge > 0.88 && tt > 0.2 && tt < 0.46) inHair = true;
    if ((style === 'bob' || style === 'long') && edge > 0.8) inHair = true;
    return inHair;
  };
  const mask = form(test, { cx: AX, cy: top + 3, rx: 16, ry: 11 }, R, { bias: 0.1 });
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;
  const onIn = (x, y) => on(x, y) && on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1);
  if (style !== 'bald') {
    // os fios: do repartido (ou do alto) para os lados; o brilho no alto
    const px = style === 'side' || style === 'slick' ? AX - 4 : AX - 1;
    for (const [ex, mx] of [[-13, -9], [-8, -7], [-3, -3], [4, 3], [9, 7], [13, 11]]) {
      bezier([px, top - lift], [AX + mx, top - lift + 1], [AX + ex, top + 7 + Math.abs(ex) * 0.3], (x, y, t) => t > 0.2 && onIn(x, y) && P(x, y, R[1], 0.75));
    }
    for (let d = -8; d <= 5; d += 1) if (onIn(AX + d, Math.round(top - lift + 2 + Math.abs(d + 2) * 0.14)) && (d & 1 || Math.abs(d + 2) < 3)) P(AX + d, Math.round(top - lift + 2 + Math.abs(d + 2) * 0.14), R[4], 0.85);
    if (style === 'curly') {
      for (let y = top - 5; y < top + 8; y += 1) for (let x = AX - 16; x < AX + 16; x += 1) if (onIn(x, y) && (x * 7 + y * 13) % 5 === 0) P(x, y, R[1], 0.8);
    }
    if (style === 'slick' || style === 'side') line(AX - 5, top - 1, AX - 4, top + 3, R[0], 0.8);
  } else {
    P(AX - 5, top + 2, hex('#ffffff'), 0.6);
    P(AX - 4, top + 2, hex('#ffffff'), 0.35);
    P(AX - 5, top + 3, hex('#ffffff'), 0.3);
  }
}

function paintHat(k, spec) {
  const { form, P, rect, line } = k;
  const hat = spec.hat;
  if (!hat) return;
  const R = rampOf(hat.color ?? '#5a3a22');
  const band = hat.band ? rampOf(hat.band) : null;
  const top = FACE.top;
  const kind = hat.type;
  const dxOf = (x) => x + 0.5 - AX;
  if (kind === 'fedora' || kind === 'panama' || kind === 'straw' || kind === 'wide' || kind === 'safari') {
    const brimHalf = kind === 'wide' ? 24 : kind === 'safari' || kind === 'straw' ? 21 : 18;
    const brimY = top + 3;
    const crownTop = top - (kind === 'safari' ? 8 : 9);
    const brim = form(
      (x, y) => {
        const d = Math.abs(dxOf(x)) / brimHalf;
        if (d > 1) return false;
        const yy = brimY + d * d * 1.6;
        return y >= yy - 1.2 && y <= yy + 1.6;
      },
      { cx: AX, cy: brimY + 1, rx: brimHalf, ry: 3 },
      R,
      { bias: 0.04 },
    );
    const crown = form(
      (x, y) => {
        if (y < crownTop || y > brimY) return false;
        const w = 9.6 - ((brimY - y) / (brimY - crownTop)) * 1.6 - (y === crownTop ? 1.2 : 0);
        if (Math.abs(dxOf(x)) > w) return false;
        return !(kind !== 'safari' && kind !== 'straw' && y < crownTop + 2 && Math.abs(dxOf(x)) < 2.6);
      },
      { cx: AX, cy: top - 3, rx: 11, ry: 8 },
      R,
      { bias: 0.08 },
    );
    if (kind !== 'safari' && kind !== 'straw') for (let y = crownTop + 2; y < crownTop + 6; y += 1) P(AX - 1, y, R[1]);
    if (band) {
      for (let x = AX - 9; x <= AX + 8; x += 1) {
        P(x, brimY - 2, band[x < AX - 3 ? 3 : x > AX + 4 ? 1 : 2]);
        P(x, brimY - 1, band[x > AX + 4 ? 0 : 1]);
      }
    }
    if (kind === 'straw' || kind === 'panama') {
      for (let y = crownTop; y <= brimY + 4; y += 1) for (let x = 0; x < W; x += 1) if ((brim[y * W + x] || crown[y * W + x]) && (x + y * 2) % 4 === 0 && !(band && y >= brimY - 2 && y <= brimY - 1)) P(x, y, R[1], 0.7);
    }
    if (hat.ticket) {
      rect(AX + 4, brimY - 7, 5, 4, hex('#f4e8b0'));
      P(AX + 5, brimY - 6, hex('#b8261c'));
      P(AX + 7, brimY - 5, hex('#b8261c'));
    }
    return;
  }
  if (kind === 'cap' || kind === 'police' || kind === 'helmet' || kind === 'captain') {
    const capTop = top - (kind === 'helmet' ? 7 : 5);
    form(
      (x, y) => {
        if (y > top + 4 || y < capTop) return false;
        const w = 12.6 * Math.sqrt(Math.max(0, 1 - ((top + 4 - y) / (top + 4 - capTop + 1)) ** 2)) + 0.6;
        return Math.abs(dxOf(x)) <= w;
      },
      { cx: AX, cy: top, rx: 14, ry: 7 },
      R,
      { bias: 0.08 },
    );
    const visor = hat.visor ? rampOf(hat.visor) : R;
    form((x, y) => y >= top + 5 && y <= top + 7 && Math.abs(dxOf(x)) <= 13 - (y - top - 5) * 1.6, { cx: AX, cy: top + 6, rx: 13, ry: 2 }, visor, { bias: -0.08 });
    if (band) for (let x = AX - 12; x <= AX + 11; x += 1) {
      P(x, top + 2, band[x < AX ? 3 : 2]);
      P(x, top + 3, band[1]);
    }
    if (hat.emblem) {
      const em = rampOf(hat.emblem);
      form(ell(AX, top - 0.5, 2.6, 2.6), { cx: AX, cy: top - 0.5, rx: 3, ry: 3 }, em, { bias: 0.12 });
    }
    if (kind === 'helmet') for (let y = capTop + 1; y < top + 4; y += 1) P(AX - 1, y, R[4], 0.6);
    return;
  }
  if (kind === 'beanie') {
    const m = form(
      (x, y) => {
        if (y > top + 6 || y < top - 8) return false;
        const w = 13 * Math.sqrt(Math.max(0, 1 - ((top + 3 - y) / 11.5) ** 2)) + 0.6;
        return Math.abs(dxOf(x)) <= w;
      },
      { cx: AX, cy: top, rx: 14, ry: 9 },
      R,
      { bias: 0.06 },
    );
    for (let y = top - 7; y <= top + 2; y += 1) for (let x = AX - 13; x < AX + 13; x += 3) if (m[y * W + x]) P(x, y, R[0], 0.35);
    for (let x = AX - 13; x <= AX + 12; x += 1) if (m[(top + 3) * W + x]) P(x, top + 3, R[0], 0.6);
    return;
  }
  if (kind === 'flatcap') {
    form(
      (x, y) => {
        if (y < top - 5 || y > top + 5) return false;
        const dx = dxOf(x);
        const w = 13.4 + (y > top + 1 ? 2 : 0);
        return Math.abs(dx) <= w && y >= top - 5 + Math.abs(dx) * 0.16 && !(y > top + 3 && Math.abs(dx) < w - (y - top - 3) * 5 && false);
      },
      { cx: AX, cy: top, rx: 15, ry: 6 },
      R,
      { bias: 0.06 },
    );
    for (let x = AX - 14; x <= AX + 13; x += 1) P(x, top + 2, R[0], 0.5);
    P(AX - 1, top - 4, R[4]);
    return;
  }
  if (kind === 'turban') {
    const m = form(
      (x, y) => {
        if (y > top + 6 || y < top - 10) return false;
        const w = 14 * Math.sqrt(Math.max(0, 1 - ((top - 1 - y) / 9.4) ** 2)) + 0.6;
        return Math.abs(dxOf(x)) <= w;
      },
      { cx: AX, cy: top - 2, rx: 15, ry: 9 },
      R,
      { bias: 0.06 },
    );
    // as voltas do pano
    for (const off of [-9, -4, 1, 6, 11]) for (let i = -8; i <= 8; i += 1) {
      const x = Math.round(AX + off + i * 0.9);
      const y = Math.round(top - 2 - i * 0.75);
      if (m[y * W + x] && m[(y - 1) * W + x] && m[(y + 1) * W + x]) P(x, y, R[1], 0.8);
    }
    const gem = rampOf('#3ae0a0');
    form(ell(AX, top - 1, 2.6, 3), { cx: AX, cy: top - 1, rx: 3, ry: 3.4 }, gem, { bias: 0.14 });
    rect(AX - 2, top + 2, 4, 2, hex('#e6c34a'));
    rect(AX - 2, top + 3, 4, 1, hex('#a67a1e'));
    return;
  }
  if (kind === 'crown') {
    const gold = rampOf('#e6c34a');
    form(
      (x, y) => {
        if (y < top - 9 || y > top - 1 || Math.abs(dxOf(x)) > 9.6) return false;
        const u = (((x - (AX - 10)) % 5) + 5) % 5;
        return y >= top - 4 || u === 2 || (y >= top - 7 && (u === 1 || u === 3));
      },
      { cx: AX, cy: top - 4, rx: 10, ry: 5 },
      gold,
      { bias: 0.12 },
    );
    for (const gx of [-8, -3, 2, 7]) P(AX + gx, top - 9, hex('#fff8d0'));
    for (const gx of [-6, -1, 4]) {
      P(AX + gx, top - 3, hex('#d02a2a'));
      P(AX + gx, top - 2, hex('#7a1010'));
    }
    return;
  }
  if (kind === 'headband') {
    const hb = rampOf(hat.color ?? '#f4f0e6');
    for (let x = AX - 13; x <= AX + 12; x += 1) {
      P(x, top + 2, hb[x < AX - 4 ? 4 : 3]);
      P(x, top + 3, hb[2]);
      P(x, top + 4, hb[x > AX + 4 ? 0 : 1]);
    }
    return;
  }
  if (kind === 'hood') {
    const opening = (x, y) => (dxOf(x) / 10.5) ** 2 + ((y + 0.5 - 32) / 13.5) ** 2 < 1 && y > top + 4;
    const m = form((x, y) => (dxOf(x) / 19.5) ** 2 + ((y + 0.5 - (top + 17)) / 25) ** 2 <= 1 && !opening(x, y) && y <= 54, { cx: AX, cy: top + 10, rx: 20, ry: 24 }, R, { bias: 0.02 });
    for (const off of [-13, -7, 8, 14]) for (let y = top - 4; y < 52; y += 1) {
      const x = Math.round(AX + off + Math.sin(y * 0.2) * 1.2 + (off < 0 ? -1 : 1) * (y - top) * 0.06);
      if (m[y * W + x] && m[y * W + x - 1] && m[y * W + x + 1]) P(x, y, R[1], 0.7);
    }
    for (let y = top; y < 42; y += 1) for (let x = AX - 12; x <= AX + 12; x += 1) if (opening(x, y)) P(x, y, hex('#050304'), Math.max(0, Math.min(0.88, 0.95 - (y - top) * 0.045)));
    return;
  }
  if (kind === 'goggles') {
    const strap = rampOf('#5a3a22');
    for (let x = AX - 14; x <= AX + 13; x += 1) {
      P(x, top + 1, strap[3]);
      P(x, top + 2, strap[1]);
    }
    for (const gx of [-6.5, 6.5]) {
      form(ell(AX + gx, top + 2, 4, 3.4), { cx: AX + gx, cy: top + 2, rx: 4.5, ry: 4 }, rampOf('#6a6a70'), { bias: 0.08 });
      form(ell(AX + gx, top + 2, 2.6, 2.1), { cx: AX + gx, cy: top + 2, rx: 3, ry: 2.6 }, rampOf('#7ab0c8'), { bias: 0.14, edge: false });
      P(AX + gx - 1.5, top + 1, hex('#f0fbff'));
    }
  }
  void line;
}

function paintGlasses(k, spec) {
  const { P, line } = k;
  const g = spec.glasses;
  if (!g) return;
  const F = rampOf(g.color ?? '#2a1a10');
  const ey = 27;
  if (g.type === 'monocle') {
    const cx = AX + 6;
    for (let a = 0; a < Math.PI * 2; a += 0.2) P(cx + Math.cos(a) * 3.8, ey + 0.5 + Math.sin(a) * 3.8, a > 2.6 && a < 5 ? F[4] : F[2]);
    for (let y = ey - 2; y <= ey + 3; y += 1) for (let x = cx - 2; x <= cx + 2; x += 1) if ((x - cx) ** 2 + (y - ey - 0.5) ** 2 < 8) P(x, y, [220, 240, 250], 0.16);
    P(cx - 1, ey - 1, [255, 255, 255], 0.7);
    line(cx + 3, ey + 3, cx + 6, 41, hex('#e6c34a'));
    return;
  }
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? AX - 11 : AX + 4;
    const x1 = x0 + 6;
    if (g.type === 'dark' || g.type === 'gold') {
      const lens = g.type === 'gold' ? hex('#2a1a08') : hex('#0e0e14');
      for (let y = ey - 2; y <= ey + 2; y += 1) for (let x = x0; x <= x1; x += 1) if (!((y === ey + 2 || y === ey - 2) && (x === x0 || x === x1) && y === ey + 2)) P(x, y, lens);
      for (let x = x0; x <= x1; x += 1) P(x, ey - 3, F[x < x0 + 3 ? 4 : 3]);
      P(x0 + 1, ey - 1, [150, 170, 190]);
      P(x0 + 2, ey - 1, [110, 125, 145], 0.8);
      P(x0 + 1, ey, [110, 125, 145], 0.6);
      continue;
    }
    if (g.type === 'round') {
      for (let a = 0; a < Math.PI * 2; a += 0.2) P(x0 + 3 + Math.cos(a) * 3.6, ey + 0.5 + Math.sin(a) * 3.3, a > 2.8 && a < 5 ? F[4] : F[2]);
    } else {
      for (let x = x0; x <= x1; x += 1) {
        P(x, ey - 3, F[3]);
        P(x, ey + 3, F[1]);
      }
      for (let y = ey - 3; y <= ey + 3; y += 1) {
        P(x0, y, y < ey - 1 ? F[3] : F[2]);
        P(x1, y, F[1]);
      }
      P(x0, ey - 3, F[4]);
    }
    for (let y = ey - 2; y <= ey + 2; y += 1) for (let x = x0 + 1; x < x1; x += 1) P(x, y, [236, 246, 255], 0.1);
    P(x0 + 1, ey - 2, [255, 255, 255], 0.6);
    P(x0 + 2, ey - 2, [255, 255, 255], 0.3);
    // a haste até a orelha
    P(s < 0 ? x0 - 1 : x1 + 1, ey - 2, F[2]);
    P(s < 0 ? x0 - 2 : x1 + 2, ey - 1, F[1]);
  }
  const by = g.type === 'dark' || g.type === 'gold' ? ey - 3 : ey - 2;
  for (let x = AX - 4; x <= AX + 3; x += 1) P(x, by + (x === AX - 4 || x === AX + 3 ? 1 : 0), F[3]);
}

/** O `b` que os objetos de cada ficha conhecem (a grade 64 do retrato), por cima da figura. */
function propBuffer(k) {
  const off = FIG_OX;
  return {
    w: 64,
    h: 64,
    data: k.b.data,
    put: (x, y, c, a = 1) => k.P(x + off, y, c, a),
    rect: (x, y, w, h, c, a = 1) => k.rect(Math.round(x) + off, Math.round(y), Math.round(w), Math.round(h), c, a),
    line: (x0, y0, x1, y1, c, a = 1) => k.line(x0 + off, y0, x1 + off, y1, c, a),
    ellipse: (cx, cy, rx, ry, c, a = 1) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) k.P(x + off, y, c, a);
    },
  };
}

const propTones = (base) => {
  const R = rampOf(base);
  return { top: R[4], hi: R[3], mid: R[2], lo: R[1], deep: R[0] };
};

/**
 * A figura de `spec` no humor `mood` (idle, blink, thinking, smug, hurt), com a boca aberta
 * enquanto fala. 88×76, fundo transparente, com o contorno de tinta.
 */
export function paintFigure(spec, mood = 'idle', speaking = false) {
  const k = board();
  const pb = propBuffer(k);
  const fill = (b, x0, y0, x1, y1, fn) => {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(63, Math.ceil(y1)); y += 1) {
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(63, Math.ceil(x1)); x += 1) {
        const c = fn(x, y);
        if (c) b.put(x, y, c);
      }
    }
  };
  const lit = (t, light) => (light > 0.7 ? t.top : light > 0.38 ? t.hi : light > -0.12 ? t.mid : light > -0.52 ? t.lo : t.deep);
  const ctx = { mood, speaking, tones: propTones, mix, hex, G: 64, CX: 32, fill, lit };
  spec.behind?.(pb, ctx);
  paintHair(k, spec, 'back');
  paintBody(k, spec);
  paintHead(k, spec, mood);
  paintEyes(k, spec, mood);
  paintMouth(k, spec, mood, speaking && mood !== 'hurt');
  paintFacialHair(k, spec);
  paintHair(k, spec, 'front');
  paintHat(k, spec);
  paintGlasses(k, spec);
  spec.front?.(pb, ctx);
  if (mood === 'hurt') {
    // a gota de suor e a bochecha vermelha do golpe
    const x = AX + 12;
    k.P(x, 20, hex('#bfe6ff'));
    k.P(x, 21, hex('#bfe6ff'));
    k.P(x + 1, 21, hex('#6aa8e0'));
    k.P(x, 22, hex('#6aa8e0'));
    k.P(x - 1, 21, hex('#ffffff'));
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -2; dx <= 2; dx += 1) if ((dx + dy) & 1) k.P(AX + 7 + dx, 34 + dy, hex('#e04a3a'), 0.4);
  }
  // a luz de trás (a cor de cada um) na borda direita da silhueta
  if (spec.rim || spec.glow) {
    const rim = hex(spec.rim ?? spec.glow);
    for (let y = 0; y < H - 10; y += 1) for (let x = 0; x < W; x += 1) if (k.alpha(x, y) > 200 && !k.alpha(x + 1, y)) k.b.put(x, y, rim, 0.5);
  }
  k.inkOutline();
  return k.b;
}
