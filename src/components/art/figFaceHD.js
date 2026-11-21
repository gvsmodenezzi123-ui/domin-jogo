/**
 * Versão 2.46: o rosto em alta (HD). A figura passou a ser pintada no dobro da resolução
 * (figKit.board com escala 2) e o rosto é redesenhado direto nos pixels finos: o olho com a
 * pálpebra e a linha dos cílios curvas, o branco sombreado pela pálpebra, a íris redonda de
 * quatro tons com a pupila e dois brilhos; a sobrancelha como um traço que afina para fora, com
 * os fios; o nariz com a ponta em bola, as asas e as narinas; a boca com o lábio de cima, a
 * linha, o de baixo com brilho e a sombra embaixo; a orelha com a hélice e a concha.
 *
 * Coordenadas: X, Y são pixels finos (0..175, 0..167). O eixo do rosto passa entre os finos 87
 * e 88: o espelho é 175 − X. A luz vem de cima e da esquerda; o lado direito do rosto está na
 * sombra (o olho, a sobrancelha e a orelha da direita saem um tom abaixo).
 */
import { ball, clamp, ell, hash, hex, mix, rampOf, vnoise } from './figKit.js';

const INK = hex('#0b0507');
const WHITE = hex('#fbf8f6');
const FX = (X) => 175 - X;

const EYE_X = 75; // o centro (contínuo, em finos) do olho esquerdo; o direito em 176 − 75
const EYE_Y = 67;

/** A forma do olho de `spec` no humor `mood` (o, d: para fora do rosto e para baixo, em finos). */
function eyeGeo(spec, mood) {
  const type = spec.eyes ?? 'open';
  let g = { oi: -5.8, oo: 7.4, hu: 3.5, hl: 2.5, pu: 0.4, pl: 1.6, drop: 0, ri: 3.45, look: [0, 0], lid: 2 };
  if (spec.fem) g = { ...g, oo: 7.8, hu: 3.8, hl: 2.6, ri: 3.55 };
  if (type === 'narrow') g = { ...g, hu: 2.0, hl: 1.7, ri: 2.9, drop: 0 };
  if (type === 'sleepy') g = { ...g, drop: 1.5 };
  if (mood === 'smug') g = { ...g, drop: g.drop + 1.7 };
  if (mood === 'thinking') g = { ...g, look: [-1.5, -1.3] };
  return g;
}

const bump = (o, p, a, b) => {
  const t = o > p ? (o - p) / (b - p) : (p - o) / (p - a);
  return t >= 1 ? 0 : (1 - t * t) ** 0.62;
};

/**
 * Um olho (`side` −1 o da esquerda, na luz; +1 o da direita, na sombra). Pinta direto nos finos.
 */
export function eyeHD(k, side, spec, mood, S, ir) {
  const cx = side < 0 ? EYE_X : 176 - EYE_X;
  const g = eyeGeo(spec, mood);
  const lit = side < 0;
  const oOf = (X) => (side < 0 ? cx - (X + 0.5) : X + 0.5 - cx);
  const dOf = (Y) => Y + 0.5 - EYE_Y;
  const U0 = (o) => -g.hu * bump(o, g.pu, g.oi, g.oo);
  const U = (o) => U0(o) + g.drop * bump(o, g.pu, g.oi, g.oo) ** 0.5;
  const L = (o) => g.hl * bump(o, g.pl, g.oi, g.oo);
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const X0 = cx - 11;
  const X1 = cx + 11;
  const cols = [];
  for (let X = Math.floor(X0); X <= X1; X += 1) cols.push(X);
  const lidInk = lit ? INK : mix(INK, S[0], 0.12);
  const crease = lit ? S[3] : S[2];
  const type = spec.eyes ?? 'open';

  if (spec.eyesGlow) {
    glowEye(k, side, spec, mood, S, cx, cols, U0, L, g);
    return;
  }
  if (mood === 'blink' || mood === 'out') {
    closedEye(k, side, spec, mood, S, cx, cols, oOf, dOf, U0, L, g);
    return;
  }
  if (mood === 'hurt') {
    hurtEye(k, side, spec, S, cx, cols, oOf, dOf, g);
    return;
  }

  // coluna a coluna: as linhas da abertura (do primeiro ao último fino dentro das pálpebras)
  const spans = new Map();
  for (const X of cols) {
    const o = oOf(X);
    const u = U(o);
    const l = L(o);
    let top = null;
    let bot = null;
    for (let Y = EYE_Y - 6; Y <= EYE_Y + 5; Y += 1) {
      const d = dOf(Y);
      if (d > u && d < l) {
        if (top == null) top = Y;
        bot = Y;
      }
    }
    if (top != null) spans.set(X, { o, top, bot });
  }
  const xs = [...spans.keys()].sort((a, b) => a - b);
  const outerX = side < 0 ? xs[0] : xs[xs.length - 1];
  const innerX = side < 0 ? xs[xs.length - 1] : xs[0];
  const lash = spec.fem || type === 'lashes';
  // a dobra da pálpebra (o vinco suave acima da linha dos cílios)
  if (type !== 'narrow') {
    for (const [X, sp] of spans) {
      if (sp.o < g.oi + 1.8 || sp.o > g.oo - 1.2) continue;
      const w = sp.o < g.oi + 2.2 ? 1 : sp.o > 1.5 ? (lash ? 3 : 2) + (sp.o > 3.5 ? 1 : 0) : 2;
      P(X, sp.top - w - (type === 'sleepy' || mood === 'smug' ? 1 : 2), crease, sp.o > g.oo - 2.6 || sp.o < g.oi + 2.8 ? 0.28 : 0.5);
    }
  }
  // a sombra da pálpebra pintada (as moças) entre o vinco e os cílios
  if (spec.fem && spec.lip && type !== 'narrow') {
    const shade = mix(S[3], hex(spec.lip), 0.5);
    for (const [X, sp] of spans) {
      if (sp.o < g.oi + 1.4) continue;
      for (let j = 3; j <= 4; j += 1) P(X, sp.top - j, shade, j === 3 ? 0.55 : 0.3);
    }
  }
  // a abertura: o branco, a íris, a pupila
  const io = side < 0 ? -g.look[0] : g.look[0];
  const id = 0.75 + g.look[1];
  const whiteLit = lit ? hex('#efe6e1') : hex('#d6c8c3');
  const whiteShade = lit ? hex('#c4a8a2') : hex('#ab8f89');
  const whiteSide = lit ? hex('#dccbc6') : hex('#c2aea9');
  const ringC = lit ? mix(ir[0], INK, 0.35) : mix(ir[0], INK, 0.5);
  for (const [X, sp] of spans) {
    const { o, top, bot } = sp;
    for (let Y = top; Y <= bot; Y += 1) {
      const d = dOf(Y);
      let c = Y === top ? whiteShade : o < g.oi + 1.6 || o > g.oo - 1.8 ? whiteSide : whiteLit;
      const r = Math.hypot(o - io, d - id);
      if (r < g.ri) {
        const rel = (d - id) / g.ri;
        if (Y === top) c = lit ? ir[1] : ir[0];
        else if (r > g.ri - 0.85) c = ringC;
        else if (rel < -0.2) c = lit ? ir[2] : ir[1];
        else if (rel < 0.35) c = lit ? ir[3] : ir[2];
        else c = lit ? ir[5] : ir[4];
        if (Math.hypot((o - io) / 1.6, (d - id + 0.1) / 1.75) < 1) c = INK;
      }
      P(X, Y, c);
    }
  }
  // os brilhos: o grande 2×2 em cima e à esquerda da pupila (na tela), o pequeno embaixo à direita
  const toX = (o) => Math.floor(side < 0 ? cx - o : cx + o);
  const sx = side < 0 ? 1 : -1; // "esquerda na tela", em o
  const hx = toX(io + sx * 1.5);
  const hy = Math.floor(EYE_Y + id - 1.9);
  const inOpen = (X, Y) => spans.has(X) && Y >= spans.get(X).top && Y <= spans.get(X).bot;
  for (const [dx, dy, c] of [
    [0, 0, WHITE],
    [0, 1, mix(WHITE, ir[4], 0.25)],
    [side < 0 ? 1 : -1, 0, mix(WHITE, ir[4], 0.4)],
  ]) {
    if (inOpen(hx + dx, hy + dy)) P(hx + dx, hy + dy, c, lit ? 1 : 0.88);
  }
  const lx = toX(io - sx * 1.6);
  const ly = Math.floor(EYE_Y + id + 1.4);
  if (inOpen(lx, ly)) P(lx, ly, mix(ir[6], WHITE, 0.5), 0.85);

  // a linha dos cílios: 2 finos (3 nas moças, por fora), 1 perto do nariz, colada na abertura
  for (const [X, sp] of spans) {
    const w = sp.o < g.oi + 2.2 ? 1 : sp.o > 1.5 ? (lash ? 3 : 2) + (sp.o > 3.5 ? 1 : 0) : 2;
    for (let j = 1; j <= w; j += 1) P(X, sp.top - j, j === 1 ? lidInk : j === w && w > 2 ? mix(lidInk, S[1], 0.45) : mix(lidInk, S[1], 0.15));
  }
  // a quina de fora: a linha passa um pouco da abertura (a asinha)
  {
    const ox = side < 0 ? -1 : 1;
    const sp = spans.get(outerX);
    const yq = sp.top + Math.round((sp.bot - sp.top) * 0.4);
    P(outerX + ox, yq, lidInk);
    P(outerX + ox, yq - 1, lidInk);
    if (lash) {
      P(outerX + ox * 2, yq - 2, INK);
      P(outerX + ox * 3, yq - 3, INK, 0.7);
      P(outerX + ox * 2, yq - 1, INK);
    } else P(outerX + ox * 2, yq, mix(lidInk, S[1], 0.5), 0.7);
  }
  // a pálpebra de baixo: a linha de pele escura, mais forte por fora
  for (const [X, sp] of spans) {
    if (sp.o < g.oi + 1.2) continue;
    P(X, sp.bot + 1, sp.o > g.oo - 2.2 ? mix(S[1], INK, 0.2) : sp.o > -0.5 ? S[2] : S[3], sp.o > 0 ? 0.95 : 0.65);
  }
  // o canal da lágrima (o rosinha do canto de dentro)
  {
    const ix = side < 0 ? 1 : -1;
    const sp = spans.get(innerX);
    const yq = sp.top + Math.round((sp.bot - sp.top) * 0.5);
    P(innerX + ix, yq, mix(S[2], hex('#d05a5a'), 0.3));
    P(innerX + ix, yq + 1, mix(S[2], hex('#d05a5a'), 0.2), 0.6);
  }
  if (lash) {
    // dois cílios soltos em cima, para fora
    for (const f of [0.25, 0.55]) {
      const X = Math.round(outerX + (innerX - outerX) * f);
      const sp = spans.get(X);
      if (sp) P(X + (side < 0 ? -1 : 1), sp.top - 4, INK, 0.75);
    }
  }
  // o olho cansado: a olheira em duas dobras
  if (type === 'tired') {
    for (const [X, sp] of spans) {
      if (sp.o < g.oi + 1.4 || sp.o > g.oo - 0.6) continue;
      P(X, sp.bot + 3, lit ? S[3] : S[2], 0.8);
      if (sp.o > -1) P(X, sp.bot + 5, lit ? S[3] : S[2], 0.45);
    }
  }
  // o sonolento (e o convencido): a pálpebra pesada, uma dobra de pele em cima dos cílios
  if (type === 'sleepy' || mood === 'smug') {
    for (const [X, sp] of spans) {
      if (sp.o < g.oi + 1.2) continue;
      const w = sp.o < g.oi + 2.2 ? 1 : sp.o > 1.5 ? (lash ? 3 : 2) + (sp.o > 3.5 ? 1 : 0) : 2;
      P(X, sp.top - w - 1, lit ? S[3] : S[2], 0.6);
    }
  }
}

/** O olho fechado: piscando (a curva dos cílios para baixo) ou desmaiado (caída para fora). */
function closedEye(k, side, spec, mood, S, cx, cols, oOf, dOf, U0, L, g) {
  const lit = side < 0;
  const out = mood === 'out';
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  // a pálpebra cobre a abertura
  for (const X of cols) {
    const o = oOf(X);
    const u = U0(o);
    const l = L(o);
    if (l <= 0) continue;
    for (let Y = EYE_Y - 5; Y <= EYE_Y + 4; Y += 1) {
      const d = dOf(Y);
      if (d <= u - 0.5 || d >= l + 0.5) continue;
      P(X, Y, d < (u + l) / 2 ? (lit ? S[4] : S[3]) : lit ? S[5] : S[4]);
    }
  }
  // o vinco de cima
  for (const X of cols) {
    const o = oOf(X);
    if (o < g.oi + 1.6 || o > g.oo - 0.8) continue;
    P(X, Math.round(EYE_Y + U0(o) - 0.5), lit ? S[3] : S[2], 0.6);
  }
  // a curva dos cílios fechados
  const lineAt = (o) => {
    const base = L(o) * 0.42 + 0.4;
    return out ? base + Math.max(0, o) * 0.24 : base;
  };
  for (const X of cols) {
    const o = oOf(X);
    if (o < g.oi - 0.2 || o > g.oo + (out ? 1.6 : 0.8)) continue;
    const y = lineAt(o);
    const Y = Math.round(EYE_Y + y - 0.5);
    P(X, Y, INK);
    if (o > g.oi + 2.2 && o < g.oo - 1) P(X, Y + 1, mix(INK, S[1], 0.45));
  }
  if (spec.fem || (spec.eyes ?? '') === 'lashes') {
    const ox = side < 0 ? -1 : 1;
    const X = side < 0 ? Math.floor(cx - g.oo) : Math.floor(cx + g.oo);
    const Y = Math.round(EYE_Y + lineAt(g.oo) - 0.5);
    P(X + ox, Y + 1, INK);
    P(X + ox * 2, Y + 2, INK, 0.7);
    const X2 = side < 0 ? Math.floor(cx - g.oo + 3) : Math.floor(cx + g.oo - 3);
    P(X2, Y + 2, INK, 0.75);
  }
  if (out) {
    // a olheira roxa do desmaio
    const bag = mix(S[3], hex('#5a3a5a'), 0.35);
    for (const X of cols) {
      const o = oOf(X);
      if (o < g.oi + 1.2 || o > g.oo - 0.4) continue;
      const Y = Math.round(EYE_Y + L(o) + 1.4);
      P(X, Y, bag, 0.85);
      P(X, Y + 1, bag, 0.4);
    }
  }
}

/** Os olhos apertados de dor: o "> <" com a pele franzida em volta. */
function hurtEye(k, side, spec, S, cx, cols, oOf, dOf, g) {
  const lit = side < 0;
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  for (const X of cols) {
    const o = oOf(X);
    if (o < g.oi - 0.5 || o > g.oo + 0.5) continue;
    for (let Y = EYE_Y - 5; Y <= EYE_Y + 4; Y += 1) {
      const d = dOf(Y);
      if (Math.abs(d) < 3.2 - Math.abs(o - 0.8) * 0.18) P(X, Y, lit ? S[4] : S[3]);
    }
  }
  const tip = g.oi + 1.2;
  const seg = (o0, d0, o1, d1, c) => {
    const n = 24;
    for (let i = 0; i <= n; i += 1) {
      const o = o0 + ((o1 - o0) * i) / n;
      const d = d0 + ((d1 - d0) * i) / n;
      const X = Math.floor(side < 0 ? cx - o : cx + o);
      const Y = Math.floor(EYE_Y + d);
      P(X, Y, c);
    }
  };
  seg(g.oo, -2.6, tip, -0.2, INK);
  seg(g.oo - 0.4, -1.8, tip + 0.6, 0.2, mix(INK, S[1], 0.4));
  seg(tip, 0.5, g.oo, 2.6, INK);
  // as rugas do canto de fora
  seg(g.oo + 1.2, -3.6, g.oo + 2.6, -4.6, lit ? S[2] : S[1]);
  seg(g.oo + 1.4, 3.2, g.oo + 2.8, 4.2, lit ? S[2] : S[1]);
}

/** Os olhos acesos (quem tem o brilho): o halo, o miolo claro e o centro quase branco. */
function glowEye(k, side, spec, mood, S, cx, cols, U0, L, g) {
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const glow = hex(spec.eyesGlow);
  const oOf = (X) => (side < 0 ? cx - (X + 0.5) : X + 0.5 - cx);
  if (mood === 'blink' || mood === 'out') {
    for (const X of cols) {
      const o = oOf(X);
      if (o < g.oi || o > g.oo) continue;
      P(X, EYE_Y, S[0]);
    }
    return;
  }
  const dy = mood === 'hurt' ? 2 : 0;
  for (let Y = EYE_Y - 7; Y <= EYE_Y + 7; Y += 1) {
    for (const X of cols) {
      const o = oOf(X) - 0.8;
      const d = Y + 0.5 - EYE_Y - dy;
      const r = (o / 8.4) ** 2 + (d / 5.2) ** 2;
      if (r < 1) P(X, Y, glow, 0.34 * (1 - r) + 0.08);
    }
  }
  for (const X of cols) {
    const o = oOf(X);
    const u = U0(o) * 0.62;
    const l = L(o) * 0.55;
    if (l <= 0) continue;
    for (let Y = EYE_Y - 4; Y <= EYE_Y + 3; Y += 1) {
      const d = Y + 0.5 - EYE_Y - dy;
      if (d <= u || d >= l) continue;
      const core = Math.abs(o - 0.6) < 3.6 && Math.abs(d) < 1.2;
      P(X, Y, core ? (Math.abs(o - 0.6) < 1.4 ? hex('#fff6e0') : hex('#ffd9a8')) : mood === 'smug' && d < 0 ? mix(glow, S[1], 0.6) : glow);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Sobrancelhas
// ---------------------------------------------------------------------------------------------

/** A sobrancelha como um traço: grossa perto do nariz, afinando para fora, com os fios. */
export function browHD(k, spec, mood, color, S, shape, side) {
  const lift = mood === 'thinking' && side > 0 ? -4 : mood === 'smug' && side < 0 ? -2 : 0;
  const pts = Object.entries(shape).map(([xs, y]) => [2 * Number(xs) + 1, 2 * y + 1 + lift]);
  pts.sort((a, b) => a[0] - b[0]);
  const xMin = pts[0][0] - 1;
  const xMax = pts[pts.length - 1][0] + 1;
  const yAt = (X) => {
    if (X <= pts[0][0]) return pts[0][1] + (pts[0][0] - X) * 0.35;
    for (let i = 1; i < pts.length; i += 1) {
      if (X <= pts[i][0]) {
        const t = (X - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
      }
    }
    return pts[pts.length - 1][1];
  };
  const lit = side < 0;
  const base = typeof color === 'string' ? hex(color) : color;
  const dark = mix(base, INK, 0.42);
  const light = mix(base, lit ? S[5] : S[3], 0.38);
  const thick = spec.thickBrows ? 1.4 : 0;
  const fem = Boolean(spec.fem);
  for (let X = xMin; X <= xMax; X += 1) {
    // f: 0 na ponta de fora .. 1 perto do nariz
    const f = (X - xMin) / (xMax - xMin);
    const w = fem ? 1.6 + f * 1.4 : 2.2 + f * 2.0 + thick;
    const yc = yAt(X);
    const top = yc - w / 2;
    const XX = side < 0 ? X : FX(X);
    for (let Y = Math.floor(top); Y <= Math.ceil(yc + w / 2); Y += 1) {
      const cover = Math.min(Y + 1, yc + w / 2) - Math.max(Y, top);
      if (cover <= 0.3) continue;
      let c = base;
      if (Y + 0.5 > yc + w / 2 - 1) c = dark;
      else if (Y < top + 0.8 && hash(X, Y, 21) < 0.55) c = light;
      if (f > 0.86 && hash(X, Y, 23) < 0.4) c = light;
      k.px(XX, Y, c, cover > 0.75 ? 1 : 0.7);
    }
  }
  // o osso da sobrancelha pega luz embaixo dela (o lado da luz)
  if (!fem && lit) {
    for (let X = xMin + 3; X <= xMax - 2; X += 1) {
      const Y = Math.round(yAt(X) + (1.3 + thick) + 1.2);
      k.ftint(X, Y, S[5], 0.35);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Nariz
// ---------------------------------------------------------------------------------------------

export function noseHD(k, spec, S) {
  const kind = spec.nose ?? 'plain';
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const tone = (t) => S[clamp(Math.round(t), 0, 6)];
  // a cabeça esculpida já dá o volume do nariz: aqui só o brilho, as asas e as narinas
  {
    const big = kind === 'big' ? 1 : 0;
    const o = kind === 'hook' ? 1 : 0;
    const fem = spec.fem && kind !== 'hook';
    const w = big ? 2 : fem ? -1 : 0;
    // o brilho da ponta
    P(86, 79 + o + big, S[6]);
    if (!fem) P(87, 79 + o + big, S[6], 0.7);
    P(86, 78 + o + big, S[6], 0.5);
    if (kind === 'hook') {
      P(88, 69, S[6], 0.7);
      P(88, 70, S[6], 0.5);
    }
    // a dobra das asas (o risco curvo que separa a asa da bochecha)
    const crease = [
      [79 - w, 82 + o + big, 3, 0.55],
      [79 - w, 83 + o + big, 2, 0.7],
      [80 - w, 84 + o + big, 2, 0.6],
      [96 + w, 82 + o + big, 2, 0.7],
      [96 + w, 83 + o + big, 1, 0.85],
      [95 + w, 84 + o + big, 1, 0.7],
    ];
    for (const [X, Y, t, a] of crease) if (!fem || a > 0.6) P(X, Y, S[t], fem ? a * 0.7 : a);
    // as narinas
    const nl = mix(S[0], INK, 0.3);
    const y = 84 + o + big;
    if (fem) {
      P(84, y, S[2], 0.85);
      P(85, y, S[2], 0.6);
      P(91, y, S[1], 0.9);
      P(90, y, S[2], 0.6);
    } else {
      P(82 - big, y, S[1], 0.8);
      P(83 - big, y, nl);
      P(84 - big, y, nl, 0.85);
      P(91 + big, y, nl, 0.85);
      P(92 + big, y, nl);
      P(93 + big, y, S[0], 0.8);
    }
    return;
  }
  if (kind === 'big') {
    // a batata: a bola grande com as asas e a sombra embaixo
    k.form(ell(44, 41.2, 4.7, 3.4), ball(44, 41.2, 4.7, 3.4, 2.9, 6.6), S, { edge: null, noise: 0, fine: true, x0: 38, y0: 37, x1: 50, y1: 45 });
    for (let Y = 68; Y <= 77; Y += 1) P(92, Y, S[4], 0.6);
    nostrils(k, S, 0, 1);
    for (let X = 82; X <= 95; X += 1) P(X, 90, S[2], 0.55 + (X > 88 ? 0.2 : 0));
    P(84, 78, S[6]);
    P(85, 78, S[6], 0.7);
    P(84, 79, S[6], 0.6);
    return;
  }
  if (spec.fem && kind !== 'hook') {
    // pequeno: a luz da ponta, a sombra leve do lado e as narinas delicadas
    k.form(ell(44.3, 40.4, 2.6, 1.8), ball(44.3, 40.4, 2.6, 1.8, 3.6, 6.2), S, { edge: null, noise: 0, fine: true, x0: 40, y0: 37, x1: 48, y1: 43 });
    for (let Y = 74; Y <= 78; Y += 1) P(91, Y, S[4], 0.55);
    P(85, 80, S[6]);
    P(86, 79, S[6], 0.7);
    P(84, 83, S[2], 0.8);
    P(85, 84, S[3], 0.7);
    P(91, 83, S[2], 0.9);
    P(90, 84, S[3], 0.7);
    for (let X = 86; X <= 90; X += 1) P(X, 85, S[3], 0.45);
    return;
  }
  const hook = kind === 'hook';
  const o = hook ? 2 : 0;
  // o dorso: a luz fina à esquerda e a sombra à direita, descendo até a ponta
  for (let Y = hook ? 64 : 67; Y <= 77 + o; Y += 1) {
    const f = (Y - 66) / 12;
    P(91 + (hook && Y < 72 ? 1 : 0), Y, tone(4.6 - f * 1.2), 0.85);
    if (Y > 69) P(92 + (hook && Y < 72 ? 1 : 0), Y, tone(3.6 - f), 0.5);
    if (Y > 68 && Y < 76) P(86, Y, S[6], 0.32);
  }
  if (hook) {
    // a corcova do adunco
    for (let Y = 66; Y <= 72; Y += 1) P(93, Y, S[3], 0.7);
    P(88, 68, S[6], 0.8);
    P(88, 69, S[6], 0.6);
  }
  // a ponta em bola
  k.form(ell(44.4, 40.3 + o / 2, 3.3, 2.3), ball(44.4, 40.3 + o / 2, 3.3, 2.3, 3.2, 6.4), S, { edge: null, noise: 0, fine: true, x0: 39, y0: 36, x1: 49, y1: 45 });
  // as asas
  k.form(ell(40.6, 41.6 + o / 2, 1.9, 1.5), (x, y) => 4.2 - (y - 41) * 0.6, S, { edge: null, noise: 0, fine: true, x0: 37, y0: 39, x1: 44, y1: 45 });
  k.form(ell(48.1, 41.4 + o / 2, 1.9, 1.5), (x, y) => 2.6 - (y - 41) * 0.5, S, { edge: null, noise: 0, fine: true, x0: 45, y0: 39, x1: 51, y1: 45 });
  // a dobra da asa (o risco curvo que separa a asa da bochecha)
  for (const [X, Y, t, a] of [
    [78, 82 + o, 2, 0.8],
    [78, 83 + o, 2, 0.9],
    [79, 84 + o, 2, 0.9],
    [80, 85 + o, 3, 0.7],
    [98, 81 + o, 1, 0.9],
    [98, 82 + o, 1, 1],
    [97, 83 + o, 1, 1],
    [97, 84 + o, 1, 0.9],
    [96, 85 + o, 2, 0.7],
  ])
    P(X, Y, S[t], a);
  // o brilho na ponta
  P(86, 79 + o, S[6]);
  P(87, 79 + o, S[6], 0.8);
  P(86, 80 + o, mix(S[6], WHITE, 0.25), 0.9);
  nostrils(k, S, o, 0);
  // a sombra embaixo do nariz (cai para a direita)
  for (let X = 83; X <= 95; X += 1) P(X, 87 + o, S[X > 88 ? 2 : 3], X > 88 ? 0.75 : 0.45);
  for (let X = 88; X <= 94; X += 1) P(X, 88 + o, S[2], 0.35);
}

function nostrils(k, S, o, big) {
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const nl = mix(S[0], INK, 0.3);
  const y = 84 + o + big * 2;
  // as narinas: curvas escuras, a da direita mais funda
  P(82 - big, y, S[1]);
  P(83 - big, y, nl);
  P(84 - big, y, nl);
  P(84 - big, y + 1, S[1], 0.8);
  P(85 - big, y + 1, S[2], 0.6);
  P(91 + big, y, nl);
  P(92 + big, y, nl);
  P(93 + big, y, S[0]);
  P(91 + big, y + 1, S[1], 0.8);
  P(90 + big, y + 1, S[2], 0.6);
  // a columela (o meio, entre as narinas) pega um pouco de luz
  P(87, y + 1, S[4], 0.7);
  P(88, y + 1, S[3], 0.7);
}

// ---------------------------------------------------------------------------------------------
// Boca
// ---------------------------------------------------------------------------------------------

export function mouthHD(k, spec, mood, speaking, S, geo) {
  const my = geo.my;
  const Y0 = my * 2; // a linha de cima do pixel lógico da boca
  const L = spec.lip ? rampOf(spec.lip) : null;
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const dark = L ? mix(L[0], INK, 0.3) : mix(S[0], INK, 0.38);
  const lipTone = (i) => (L ? L[clamp(i, 0, 6)] : mix(S[clamp(i - 2, 0, 6)], hex('#b8504c'), 0.3));
  const tooth = hex('#f6efe2');
  const toothShade = hex('#cbbfae');
  const gold = hex('#f0c24a');
  const cavity = hex('#3a0c12');
  const tongue = hex('#b0403e');

  /** O lábio de baixo entre X0 e X1, na linha Y (2 finos), com o brilho à esquerda do meio. */
  const lowerLip = (X0, X1, Y, rows = 2) => {
    for (let X = X0; X <= X1; X += 1) {
      const f = (X - X0) / Math.max(1, X1 - X0);
      for (let r = 0; r < rows; r += 1) {
        const edge = X === X0 || X === X1;
        let t = f < 0.2 ? 4 : f < 0.42 ? 5 : f < 0.6 ? 5 : f < 0.8 ? 4 : 3;
        if (r === rows - 1) t -= 1;
        if (edge) t -= 1;
        P(X, Y + r, lipTone(L ? t + 1 : t), edge && r === rows - 1 ? 0.6 : 1);
      }
    }
    const hx = Math.round(X0 + (X1 - X0) * 0.32);
    P(hx, Y, L ? mix(L[6], WHITE, 0.45) : S[6], 0.9);
    P(hx + 1, Y, L ? L[6] : S[6], 0.7);
    // a sombra embaixo do lábio
    for (let X = X0 + 1; X <= X1 - 1; X += 1) P(X, Y + rows, S[2], X > (X0 + X1) / 2 ? 0.7 : 0.45);
  };

  if (mood === 'hurt') {
    // a careta: os dentes trincados, os lábios esticados
    for (let X = 78; X <= 97; X += 1) {
      P(X, Y0 - 2, dark);
      P(X, Y0 + 5, dark);
    }
    for (let Y = Y0 - 1; Y <= Y0 + 4; Y += 1) {
      P(77, Y, dark);
      P(98, Y, dark);
      for (let X = 78; X <= 97; X += 1) {
        const seam = Y === Y0 + 1 || Y === Y0 + 2;
        let c = (X - 78) % 4 === 3 ? toothShade : tooth;
        if (spec.goldTooth && X >= 91 && X <= 93 && Y < Y0 + 1) c = gold;
        if (seam) c = Y === Y0 + 1 ? mix(tooth, dark, 0.65) : mix(tooth, dark, 0.3);
        P(X, Y, c);
      }
    }
    for (let X = 79; X <= 96; X += 1) P(X, Y0 - 1, toothShade, 0.6);
    P(75, Y0 + 5, S[2]);
    P(76, Y0 + 6, S[2]);
    P(100, Y0 + 5, S[2]);
    P(99, Y0 + 6, S[2]);
    lowerLip(82, 93, Y0 + 6, 2);
    return;
  }
  if (mood === 'out') {
    // desmaiado: a boca mole, entreaberta e torta, com o fio de baba no canto
    for (let X = 82; X <= 91; X += 1) P(X, Y0, dark);
    for (let Y = Y0 + 1; Y <= Y0 + 3; Y += 1) for (let X = 82; X <= 93; X += 1) P(X, Y, X === 82 || X === 93 ? dark : cavity);
    for (let X = 84; X <= 92; X += 1) P(X, Y0 + 3, X > 85 && X < 91 ? tongue : cavity);
    for (let X = 83; X <= 93; X += 1) P(X, Y0 + 4, dark);
    lowerLip(84, 92, Y0 + 5, 2);
    P(95, Y0 + 3, hex('#dff2ff'));
    P(95, Y0 + 4, hex('#bfe0f4'), 0.9);
    P(95, Y0 + 5, hex('#bfe0f4'), 0.75);
    P(95, Y0 + 6, hex('#9cc8e8'), 0.55);
    P(95, Y0 + 7, hex('#9cc8e8'), 0.35);
    return;
  }
  if (speaking) {
    // aberta: os dentes de cima, o escuro e a língua; o lábio de cima por cima
    const w = (Y) => (Y <= Y0 ? 7 : Y <= Y0 + 2 ? 8 : Y <= Y0 + 3 ? 7 : 5);
    for (let Y = Y0 - 1; Y <= Y0 + 4; Y += 1) {
      const h = w(Y);
      for (let X = 88 - h; X <= 87 + h; X += 1) {
        const edge = X === 88 - h || X === 87 + h;
        let c = cavity;
        if (Y <= Y0) c = spec.goldTooth && X >= 91 && X <= 93 ? gold : X % 3 === 0 ? toothShade : tooth;
        else if (Y >= Y0 + 3 && Math.abs(X - 87.5) < 4.5) c = tongue;
        P(X, Y, edge ? dark : c);
      }
    }
    for (let X = 81; X <= 94; X += 1) P(X, Y0 - 2, dark);
    if (L) for (let X = 81; X <= 94; X += 1) P(X, Y0 - 3, L[X < 88 ? 3 : 2]);
    for (let X = 83; X <= 92; X += 1) P(X, Y0 + 5, dark);
    lowerLip(83, 92, Y0 + 6, 2);
    return;
  }
  if (mood === 'smug') {
    // o sorriso de canto: a linha reta à esquerda que sobe à direita, com a covinha
    for (let X = 80; X <= 91; X += 1) P(X, Y0 + 1, dark);
    P(79, Y0 + 1, S[1]);
    if (spec.goldTooth) {
      for (let X = 92; X <= 95; X += 1) P(X, Y0 + 1, X === 95 ? dark : X > 92 ? gold : tooth);
      for (let X = 92; X <= 96; X += 1) P(X, Y0, dark);
      P(97, Y0 - 1, dark);
      P(98, Y0 - 2, dark);
    } else {
      P(92, Y0 + 1, dark);
      P(93, Y0, dark);
      P(94, Y0, dark);
      P(95, Y0 - 1, dark);
      P(96, Y0 - 1, dark);
      P(97, Y0 - 2, dark);
    }
    P(99, Y0 - 4, S[3]);
    P(100, Y0 - 3, S[3]);
    P(100, Y0 - 2, S[3], 0.6);
    lowerLip(82, 93, Y0 + 2, 2);
    return;
  }
  if (mood === 'thinking') {
    for (let X = 84; X <= 95; X += 1) P(X, Y0 + 1, dark);
    P(96, Y0 + 2, dark);
    P(97, Y0 + 2, dark, 0.7);
    P(83, Y0 + 1, S[1]);
    lowerLip(86, 94, Y0 + 2, 2);
    return;
  }
  // parada: o lábio de cima (a sombra), a linha, o lábio de baixo
  const smile = Boolean(L) || spec.smile;
  const X0 = L ? 78 : 80;
  const X1 = L ? 97 : 95;
  if (spec.fem && L) {
    // o arco do lábio de cima (o arco do cupido) e o de baixo cheio
    for (let X = X0 + 2; X <= X1 - 2; X += 1) {
      const c = Math.abs(X - 87.5);
      const top = c < 1 ? Y0 - 1 : c < 4 ? Y0 - 2 : c < 7 ? Y0 - 1 : Y0;
      for (let Y = top; Y <= Y0; Y += 1) P(X, Y, L[Y === top ? 2 : X < 88 ? 4 : 3]);
    }
    for (let X = X0; X <= X1; X += 1) P(X, Y0 + 1, X === X0 || X === X1 ? S[1] : dark);
    if (smile) {
      P(X0 - 1, Y0, S[1], 0.8);
      P(X1 + 1, Y0, S[1], 0.8);
    }
    lowerLip(X0 + 2, X1 - 2, Y0 + 2, 3);
    return;
  }
  // o lábio de cima: a faixa escura curta em cima da linha
  for (let X = X0 + 3; X <= X1 - 3; X += 1) P(X, Y0, S[X < 88 ? 3 : 2], 0.75);
  for (let X = X0; X <= X1; X += 1) P(X, Y0 + 1, dark);
  if (smile) {
    P(X0 - 1, Y0, S[1]);
    P(X1 + 1, Y0, S[1]);
  } else {
    P(X0 - 1, Y0 + 1, S[2]);
    P(X1 + 1, Y0 + 1, S[2]);
  }
  lowerLip(X0 + 2, X1 - 2, Y0 + 2, 2);
}

// ---------------------------------------------------------------------------------------------
// Orelhas
// ---------------------------------------------------------------------------------------------

/**
 * A orelha esquerda nos finos (8 × 16): a hélice clara por fora, a dobra (anti-hélice), a concha
 * funda e o lóbulo. A da direita é o espelho, um tom mais na sombra.
 */
const EAR_HD = [
  '...4554.',
  '..456655',
  '.4562235',
  '.4521124',
  '45311223',
  '45213323',
  '45212433',
  '45202433',
  '45211333',
  '45321123',
  '.4532223',
  '.4453332',
  '..44433.',
  '..45542.',
  '...4432.',
  '....22..',
];

export function earsHD(k, S, x0) {
  const X0 = x0 * 2;
  for (const side of [-1, 1]) {
    EAR_HD.forEach((row, j) => {
      for (let i = 0; i < 8; i += 1) {
        if (row[i] === '.') continue;
        const t = Number(row[i]);
        const X = side < 0 ? X0 + i : FX(X0 + i);
        k.px(X, 66 + j, S[side < 0 ? t : Math.max(0, t - 1)]);
      }
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Detalhes: rugas, cicatriz, bochecha corada, a dor (o vermelho e a gota de suor)
// ---------------------------------------------------------------------------------------------

export function wrinklesHD(k, S) {
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  // a testa: três rugas finas e curvas
  const arc = (X0, X1, Y, sag, t, a) => {
    for (let X = X0; X <= X1; X += 1) {
      const f = (X - X0) / (X1 - X0);
      P(X, Math.round(Y + Math.sin(f * Math.PI) * -sag), S[t], a * (f < 0.12 || f > 0.88 ? 0.55 : 1));
    }
  };
  arc(74, 84, 48, 1.2, 4, 0.9);
  arc(88, 99, 50, 1.2, 3, 0.85);
  arc(78, 89, 44, 1, 4, 0.75);
  // os pés de galinha
  for (const [X, Y] of [
    [62, 70],
    [63, 71],
    [62, 73],
    [63, 73],
    [63, 75],
  ])
    P(X, Y, S[3], 0.8);
  for (const [X, Y] of [
    [113, 70],
    [112, 71],
    [113, 73],
    [112, 73],
    [112, 75],
  ])
    P(X, Y, S[2], 0.85);
  // o bigode chinês (do nariz ao canto da boca)
  for (let i = 0; i < 8; i += 1) {
    P(78 - Math.round(i * 0.4), 84 + i, S[3], 0.75);
    P(98 + Math.round(i * 0.4), 84 + i, S[2], 0.8);
  }
  // a papada da bochecha
  for (const [X, Y, t] of [
    [66, 86, 4],
    [67, 88, 3],
    [66, 92, 4],
    [67, 94, 3],
    [107, 88, 3],
    [108, 92, 3],
  ])
    P(X, Y, S[t], 0.7);
}

export function scarHD(k, S) {
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const red = mix(S[1], hex('#a03a3a'), 0.42);
  for (let i = 0; i <= 13; i += 1) {
    const X = 102 + Math.round(i * 0.5);
    const Y = 72 + i;
    P(X, Y, red);
    P(X - 1, Y, S[6], 0.55);
  }
  // os pontos
  for (const Y of [75, 79, 83]) {
    const X = 102 + Math.round((Y - 72) * 0.5);
    P(X - 2, Y, S[1], 0.8);
    P(X + 2, Y, S[1], 0.8);
  }
}

export function blushHD(k, geo, color) {
  const b = hex(color);
  for (const cx of [69, 107]) {
    for (let Y = 76; Y <= 86; Y += 1) {
      for (let X = cx - 9; X <= cx + 9; X += 1) {
        const r = ((X + 0.5 - cx) / 7.6) ** 2 + ((Y + 0.5 - 81.2) / 4.2) ** 2;
        if (r <= 1 && geo.inFace((X + 0.5) / 2 - 0.5, (Y + 0.5) / 2 - 0.5)) k.ftint(X, Y, b, 0.34 * (1 - r * 0.7));
      }
    }
  }
}

export function hurtMarksHD(k) {
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const red = hex('#d03a3a');
  for (let Y = 77; Y <= 85; Y += 1) for (let X = 102; X <= 110; X += 1) if (((X - 106) / 4.4) ** 2 + ((Y - 81) / 3.8) ** 2 < 1) k.ftint(X, Y, red, 0.4);
  // a gota de suor
  const drop = ['.a.', '.a.', 'abc', 'bcd', 'cdd', '.d.'];
  const pal = { a: hex('#e8f8ff'), b: hex('#bfe6ff'), c: hex('#8ac8f0'), d: hex('#5aa0d8') };
  drop.forEach((row, j) => {
    for (let i = 0; i < 3; i += 1) if (pal[row[i]]) P(64 + i, 44 + j, pal[row[i]]);
  });
  P(64, 50, INK, 0.5);
  P(66, 50, INK, 0.5);
}

// ---------------------------------------------------------------------------------------------
// Pelos: barba por fazer e bigode fino
// ---------------------------------------------------------------------------------------------

export function stubbleHD(k, F, geo) {
  for (let Y = 82; Y <= geo.by * 2 + 1; Y += 1) {
    for (let X = 56; X <= 119; X += 1) {
      const x = (X + 0.5) / 2 - 0.5;
      const y = (Y + 0.5) / 2 - 0.5;
      if (!geo.inFace(x, y)) continue;
      const lips = Y >= geo.my * 2 - 2 && Y <= geo.my * 2 + 3 && X >= 78 && X <= 97;
      const cheek = Y < 88 && Math.abs(X - 87.5) < 18;
      if (lips || cheek) continue;
      if (Y >= 84 && Y <= 87 && Math.abs(X - 87.5) < 5) continue;
      k.ftint(X, Y, F[2], 0.16 + (vnoise(x, y, 2, 9) > 0 ? 0.08 : 0) + (hash(X, Y, 4) < 0.22 ? 0.22 : 0));
    }
  }
}

export function thinMustacheHD(k, F, geo) {
  const Y = geo.my * 2 - 3;
  const P = (X, YY, c, a = 1) => k.px(X, YY, c, a);
  for (let X = 76; X <= 85; X += 1) {
    P(X, Y, F[1]);
    P(X, Y + 1, F[2], X > 78 ? 0.9 : 0.5);
    P(FX(X), Y, F[1]);
    P(FX(X), Y + 1, F[1], X > 78 ? 0.9 : 0.5);
  }
  P(74, Y + 2, F[1]);
  P(75, Y + 1, F[1]);
  P(101, Y + 2, F[1]);
  P(100, Y + 1, F[1]);
  for (const X of [78, 81, 84]) P(X, Y - 1, F[3], 0.6);
  for (const X of [91, 94, 97]) P(X, Y - 1, F[2], 0.6);
}

export function handlebarHD(k, F, geo) {
  const y0 = geo.my * 2;
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  for (const side of [-1, 1]) {
    const X = (u) => (side < 0 ? 66 - u : FX(66 - u));
    // a ponta enrolada para cima
    const curl = [
      [0, -1, 2],
      [1, -2, 3],
      [2, -3, 4],
      [3, -4, 4],
      [3, -5, 5],
      [3, -6, 4],
      [2, -7, 3],
      [1, -7, 2],
      [1, -6, 1],
      [0, -2, 1],
      [1, -3, 2],
      [2, -4, 2],
    ];
    for (const [u, dy, t] of curl) P(X(u), y0 + dy, F[side < 0 ? t : Math.max(0, t - 1)]);
  }
}

// ---------------------------------------------------------------------------------------------
// Óculos e brincos
// ---------------------------------------------------------------------------------------------

export function glassesHD(k, spec, earX) {
  const gl = spec.glasses;
  const G = rampOf(gl.color ?? '#3a3a3a', gl.type === 'gold' || gl.type === 'monocle' ? 'metal' : 'cloth');
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  const lensTint = (X, Y, a = 0.06) => k.ftint(X, Y, hex('#fff0e8'), a);
  const glare = (X0, Y0, n) => {
    for (let i = 0; i < n; i += 1) {
      P(X0 + i, Y0 + n - 1 - i, WHITE, 0.32);
      if (i < n - 2) P(X0 + i + 2, Y0 + n - 1 - i, WHITE, 0.18);
    }
  };
  if (gl.type === 'monocle') {
    const cx = 101;
    const cy = 67;
    for (let Y = 54; Y <= 80; Y += 1) {
      for (let X = 88; X <= 114; X += 1) {
        const d = Math.hypot(X + 0.5 - cx, Y + 0.5 - cy);
        if (d <= 11.2 && d > 9.2) P(X, Y, G[X + Y < cx + cy - 4 ? 6 : X + Y > cx + cy + 6 ? 2 : 4]);
        else if (d <= 9.2) lensTint(X, Y, 0.18);
      }
    }
    glare(93, 59, 6);
    // a corrente
    for (let i = 0; i < 34; i += 1) {
      const X = 112 + Math.round(Math.sin(i * 0.18) * 2.4) + Math.floor(i / 6);
      P(X, 73 + i, i % 3 === 0 ? G[6] : i % 3 === 1 ? G[4] : G[2]);
    }
    return;
  }
  if (gl.type === 'round') {
    for (const cx of [73, 101]) {
      for (let Y = 56; Y <= 79; Y += 1) {
        for (let X = cx - 12; X <= cx + 12; X += 1) {
          const d = Math.hypot(X + 0.5 - cx, Y + 0.5 - 67.2);
          if (d <= 11 && d > 9.2) P(X, Y, G[X + Y < cx + 62 ? 5 : X + Y > cx + 72 ? 2 : 4]);
          else if (d <= 9.2) lensTint(X, Y);
        }
      }
      glare(cx - 7, 60, 5);
    }
    for (let X = 84; X <= 91; X += 1) P(X, 64, G[X < 88 ? 5 : 3]);
    for (let X = 84; X <= 91; X += 1) P(X, 65, G[1], 0.7);
    for (let X = earX * 2 + 4; X <= 61; X += 1) P(X, 64, G[3]);
    for (let X = 114; X <= FX(earX * 2 + 4); X += 1) P(X, 64, G[2]);
    return;
  }
  const thin = gl.type === 'gold';
  const darkLens = gl.type === 'dark';
  for (const side of [-1, 1]) {
    const XS = (X) => (side < 0 ? X : FX(X));
    const X0 = 62;
    const X1 = 83;
    const Y0 = 60;
    const Y1 = 75;
    // a lente
    for (let Y = Y0 + 2; Y < Y1; Y += 1) {
      for (let X = X0 + 2; X < X1 - 1; X += 1) {
        if (darkLens) P(XS(X), Y, mix(G[0], INK, 0.3 + ((X + Y) / (X1 + Y1) > 0.82 ? 0.25 : 0)));
        else lensTint(XS(X), Y, 0.05);
      }
    }
    if (darkLens) {
      for (let i = 0; i < 6; i += 1) P(XS(X0 + 3 + i), Y0 + 8 - i, hex('#5a5560'), 0.8);
    } else glare(XS(side < 0 ? X0 + 3 : X0 + 3 + 5) - (side < 0 ? 0 : 5), Y0 + 3, 5);
    // o aro: 2 finos em cima, 1 a 2 nos lados e embaixo
    const w = thin ? 1 : 2;
    for (let X = X0; X <= X1; X += 1) {
      for (let j = 0; j < w; j += 1) P(XS(X), Y0 + j, G[j === 0 ? (side < 0 ? 5 : 4) : 2]);
      P(XS(X), Y1, G[thin ? 3 : 2]);
      if (!thin) P(XS(X), Y1 - 1, G[1], X > X0 && X < X1 ? 0.6 : 1);
    }
    for (let Y = Y0; Y <= Y1; Y += 1) {
      for (let j = 0; j < w; j += 1) {
        P(XS(X0 + j), Y, G[side < 0 ? (j ? 3 : 5) : 2]);
        P(XS(X1 - j), Y, G[side < 0 ? (j ? 2 : 3) : j ? 3 : 4]);
      }
    }
    P(XS(X0), Y0, G[6]);
    P(XS(X0 + 1), Y0, mix(G[6], WHITE, 0.35));
    // a haste até a orelha
    const ear = side < 0 ? earX * 2 + 4 : FX(earX * 2 + 4);
    for (let X = Math.min(XS(X0 - 1), ear); X <= Math.max(XS(X0 - 1), ear); X += 1) P(X, Y0 + 3, G[side < 0 ? 3 : 2]);
  }
  // a ponte
  for (let X = 84; X <= 91; X += 1) {
    P(X, 62, G[X < 88 ? 6 : 5]);
    P(X, 63, G[3]);
    P(X, 64, G[1], 0.8);
  }
}

export function earringsHD(k, kind, earX, color) {
  const P = (X, Y, c, a = 1) => k.px(X, Y, c, a);
  for (const side of [-1, 1]) {
    const X0 = side < 0 ? earX * 2 + 4 : FX(earX * 2 + 4) - 3;
    if (kind === 'pearl') {
      const pearl = ['.abb.', 'aceeb', 'bdeeb', 'bdddb', '.bbb.'];
      const pal = { a: hex('#51424f'), b: hex('#51424f'), c: hex('#ffffff'), d: hex('#b9aab8'), e: hex('#dfd5dc') };
      P(X0 + 2, 82, hex('#807083'));
      P(X0 + 2, 83, hex('#807083'));
      pearl.forEach((row, j) => {
        for (let i = 0; i < 5; i += 1) if (pal[row[i]]) P(X0 + i, 84 + j, pal[row[i]]);
      });
    } else {
      const G = rampOf(color ?? '#e6c34a', 'metal');
      for (let a = 0; a < 40; a += 1) {
        const t = (a / 40) * Math.PI * 2;
        const X = Math.round(X0 + 2 + Math.cos(t) * 3.2);
        const Y = Math.round(88 + Math.sin(t) * 4.2);
        const lit = Math.cos(t) < 0 && Math.sin(t) < 0.4;
        P(X, Y, G[lit ? 6 : Math.sin(t) > 0 ? 2 : 4]);
      }
      P(X0 + 2, 83, G[5]);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// A cabeça esculpida: um relevo (testa, arco das sobrancelhas, órbitas, nariz, maçãs, boca,
// queixo) iluminado pela lâmpada; o tom sai da luz em cada pixel fino.
// ---------------------------------------------------------------------------------------------

const G1 = (v, s) => Math.exp(-(v * v) / (2 * s * s));
const c01 = (v) => Math.max(0, Math.min(1, v));
const norm3 = (x, y, z) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};
const LAMP = norm3(-0.5, -0.66, 0.58);

/** O relevo do rosto de `spec` (z em pixels lógicos, para a frente). */
export function headRelief(spec, geo) {
  const my = geo.my;
  const nk = spec.nose === 'big' ? 1.35 : spec.fem ? 0.62 : spec.nose === 'hook' ? 1.12 : 1;
  return (x, y) => {
    const dx = x + 0.5 - 44;
    const yy = y + 0.5;
    const hw = Math.max(1, geo.half(Math.min(Math.max(y, 13), geo.by)));
    const u = dx / (hw + 0.8);
    const zc = Math.sqrt(Math.max(0, 1 - u * u));
    const v = (yy - 31) / 22;
    const zv = Math.sqrt(Math.max(0, 1 - v * v * 0.75));
    let h = 10.5 * zc * zv;
    h += 1.4 * G1(yy - 29.4, 1.4) * G1(dx, 10.5); // o arco das sobrancelhas
    h -= 1.9 * G1(Math.abs(dx) - 6.6, 3.1) * G1(yy - 33.3, 2.2); // as órbitas
    h += 3.0 * nk * G1(dx + (spec.nose === 'hook' ? -0.4 : 0), 1.6 * nk) * c01((yy - 30.5) / 9) * (yy < 42.2 ? 1 : G1(yy - 42.2, 0.9));
    h += 1.9 * nk * G1(dx - 0.4, 2.3 * nk) * G1(yy - 40.5, 1.6); // a ponta do nariz
    h += 0.8 * nk * G1(Math.abs(dx) - 3.8 * nk, 1.1) * G1(yy - 41.8, 1.1); // as asas
    h += (spec.fem ? 0.55 : 1.1) * G1(Math.abs(dx) - 9.6, 2.7) * G1(yy - 38.6, 2.3); // as maçãs do rosto
    if (spec.fem || spec.jaw === 'round') h += 0.9 * G1(Math.abs(dx) - 8.2, 3.4) * G1(yy - 41.5, 3); // a bochecha cheia
    h += (spec.fem ? 0.9 : 1.2) * G1(dx, 6.4) * G1(yy - (my + 0.6), 3.1); // o focinho (a boca)
    h -= 0.35 * G1(dx, 0.9) * G1(yy - (my - 2.6), 1.2); // o sulco do buço
    h -= 0.6 * G1(dx, 4.2) * G1(yy - (my + 3.1), 0.8); // a dobra embaixo do lábio
    h += 1.3 * G1(dx, 4.6) * G1(yy - (geo.by - 2.6), 2.1); // o queixo
    h -= 0.7 * G1(Math.abs(dx) - 12.2, 1.8) * G1(yy - 28.5, 3.4); // as têmporas
    return h;
  };
}

/** O tom da pele em (x, y) pela luz da lâmpada no relevo (0 a sombra funda .. 6 o brilho). */
export function headToneHD(spec, geo) {
  const z = headRelief(spec, geo);
  const dark = spec.shade ?? 0;
  return (x, y) => {
    const e = 0.3;
    const dzx = (z(x + e, y) - z(x - e, y)) / (2 * e);
    const dzy = (z(x, y + e) - z(x, y - e)) / (2 * e);
    const n = norm3(-dzx * 0.9, -dzy * 0.9, 1);
    const lam = (n[0] * LAMP[0] + n[1] * LAMP[1] + n[2] * LAMP[2] + 0.22) / 1.22;
    // a luz fria de trás pega a borda da direita
    const back = c01(n[0] * 1.4 - 0.55) * 0.9;
    let t = 0.85 + 5.55 * c01(lam) ** 1.1 + back - dark;
    // embaixo do queixo a pele recolhe (o pescoço faz sombra no próprio queixo)
    const yy = y + 0.5;
    if (yy > geo.by - 1.2) t -= (yy - (geo.by - 1.2)) * 0.8;
    return t;
  };
}
