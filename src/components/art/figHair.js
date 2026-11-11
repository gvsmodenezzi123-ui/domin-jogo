/**
 * Versão 2.17: o cabelo e o chapéu dos personagens novos. O cabelo cheio é feito de MECHAS
 * (bolas com a luz em cima e à esquerda e a borda escura, uma por cima da outra); o cabelo curto
 * segue a cabeça, com os fios saindo do alto. Cada chapéu tem copa, aba, fita e a sombra que
 * joga na testa.
 */
import { ball, ell, hash, hex, mix, rampOf, tube } from './figKit.js';
import { mir } from './figHead.js';

/**
 * Uma mecha: uma bola com a luz em cima e à esquerda. Só a borda de baixo e da direita escurece
 * (a de cima fica acesa), então cada mecha pintada por cima da outra deixa o risco escuro da
 * separação embaixo dela, como um rolo de cabelo apoiado no outro.
 */
const lobe = (k, R, cx, cy, rx, ry, lo = -0.6, hi = 6.4, seed = 2) =>
  k.form(ell(cx, cy, rx, ry), ball(cx, cy, rx, ry, lo, hi), R, { edge: 1, rim: 6, noise: 0.45, seed, x0: Math.floor(cx - rx - 1), y0: Math.floor(cy - ry - 1), x1: Math.ceil(cx + rx + 1), y1: Math.ceil(cy + ry + 1) });

/**
 * As mechas em pares espelhados: [cx, cy, rx, ry] (um `cx` de 44 não espelha). As da direita
 * ficam um tom mais na sombra. A ordem de pintura vai de baixo para cima e da direita para a
 * esquerda: a de cima sempre cobre a de baixo.
 */
const lobes = (k, R, list, seed = 2) => {
  const all = [];
  for (const [cx, cy, rx, ry = rx] of list) {
    all.push([cx, cy, rx, ry, -0.6, 6.4]);
    if (Math.abs(cx - 44) > 0.6) all.push([88 - cx, cy, rx, ry, -0.9, 5.6]);
  }
  all.sort((a, b) => b[1] + b[0] * 0.3 - (a[1] + a[0] * 0.3));
  all.forEach(([cx, cy, rx, ry, lo, hi], i) => lobe(k, R, cx, cy, rx, ry, lo, hi, seed + (i % 5)));
};

/** A touca de cabelo que segue a cabeça: `t` a espessura dos lados, `tt` a do alto. */
const capTest = (geo, t, tt, hairline, burn = 33) => (x, y) => {
  const dx = x + 0.5 - 44;
  const ax = Math.abs(dx);
  if (y > 27) return y <= burn && ax >= geo.cw - 1.4 - (y > burn - 3 ? -0.6 : 0) && ax <= geo.cw + t - (y > burn - 2 ? 1 : 0);
  if ((dx / (geo.cw + t)) ** 2 + ((27 - (y + 0.5)) / (15.5 + tt)) ** 2 > 1) return false;
  return y + 0.5 <= hairline(dx) || ax >= geo.cw - 1.4;
};

const strandsFrom = (px, py, n, depth = 1.1) => (x, y) => (Math.sin(Math.atan2(y + 0.5 - py, x + 0.5 - px) * n) > 0.55 ? -depth : 0);

/** O cabelo que fica ATRÁS da cabeça (o coque, as mechas dos lados, o cabelo comprido). */
export function paintHairBack(k, spec) {
  const h = spec.hair;
  if (!h || h.style === 'none' || !h.color) return;
  const R = rampOf(h.color, 'hair');
  const style = h.style;
  if (style === 'bun') {
    // o fundo (a sombra entre as mechas) e os três rolos de cada lado, do queixo à têmpora
    k.form(ell(44, 28, 23.5, 19.5), 0.7, R, { edge: 0, noise: 0.25, y1: 47 });
    lobes(k, R, [
      [27.5, 45.2, 5, 4.6],
      [24.5, 38.2, 5.6, 4.4],
      [24, 30.6, 6.2, 4.8],
    ]);
    return;
  }
  if (style === 'curly' || style === 'volume') {
    const long = style === 'curly';
    k.form(ell(44, 26, 21.5, long ? 22 : 17), 1.5, R, { edge: 1, noise: 0.3 });
    lobes(
      k,
      R,
      long
        ? [
            [28, 53, 5],
            [24, 46.5, 5.2],
            [21.5, 39, 5.2],
            [20.5, 31, 5.2],
            [22, 23.5, 5.2],
            [26.5, 16.5, 5.4],
            [34, 11, 5.4],
          ]
        : [
            [25.5, 41, 4.6],
            [22.5, 34.5, 5],
            [21.5, 27, 5.2],
            [24, 19.5, 5.4],
            [30, 13.5, 5.4],
            [38, 10, 5.4],
          ],
      6,
    );
    lobe(k, R, 44, 9.2, 5.6, 5, 1.8, 6.4, 8);
    return;
  }
  if (style === 'long') {
    const half = (y) => (y < 24 ? 0 : y < 52 ? 19.5 : 19.5 - (y - 52) * 0.22) + Math.sin(y * 0.9) * 0.5;
    k.form(
      (x, y) => y >= 14 && y <= 68 && (y < 24 ? ((x + 0.5 - 44) / 19.5) ** 2 + ((24 - y) / 12) ** 2 <= 1 : Math.abs(x + 0.5 - 44) <= half(y)),
      (x, y) => tube(22, 68, 1.2, 5.2)(x) + (Math.sin((x + Math.sin(y * 0.35) * 1.6) * 1.5) > 0.45 ? -1.2 : 0),
      R,
      { edge: 1, noise: 0.25, seed: 6 },
    );
    return;
  }
  if (style === 'bob') {
    k.form(
      (x, y) => {
        const dx = Math.abs(x + 0.5 - 44);
        if (y < 9 || y > 53) return false;
        if (y < 27) return (dx / 19.5) ** 2 + ((27 - y) / 18) ** 2 <= 1;
        return dx <= 19.5 - Math.max(0, y - 46) ** 1.5 * 0.42;
      },
      (x, y) => tube(22, 68, 1.4, 5.4)(x) + (Math.sin((x + 0.5) * 1.6) > 0.5 ? -1 : 0) - (y > 48 ? 0.8 : 0),
      R,
      { edge: 1, noise: 0.2, seed: 6 },
    );
  }
}

/** O cabelo que fica NA FRENTE da testa e dos lados (por cima da cabeça já pintada). */
export function paintHairFront(k, spec, geo) {
  const h = spec.hair;
  if (!h || h.style === 'none' || !h.color) return;
  const R = rampOf(h.color, 'hair');
  const style = h.style;
  const dome = ball(44, 21, geo.cw + 5, 13, 1.5, 5.8);
  if (style === 'bun') {
    // a coroa de mechas por cima da testa e o coque no alto, com o grampo de ponta dourada
    lobes(k, R, [
      [25.8, 22, 5.2, 5.6],
      [30, 17.5, 5.2, 5.6],
      [36.8, 16.6, 4.2, 5.6],
      [43.5, 16.2, 5, 6],
    ]);
    k.form(ell(43, 7, 9.7, 4.9), ball(43, 7, 9.7, 4.9, 0, 6.5), R, { edge: 1, rim: 6, noise: 0.35, seed: 4 });
    for (const [x, y, t] of [
      [35, 6, 3],
      [36, 5, 3],
      [37, 4, 3],
      [39, 9, 2],
      [40, 8, 2],
      [41, 7, 2],
      [42, 7, 3],
      [45, 5, 3],
      [46, 6, 3],
      [47, 7, 2],
      [48, 9, 2],
      [49, 8, 1],
    ])
      k.put(x, y, R[t]);
    const G = rampOf('#d78d3a', 'metal');
    k.line(52, 4, 54, 10, G[2]);
    k.put(52, 2, G[6]);
    k.put(52, 3, G[4]);
    k.put(53, 2, G[3]);
    k.put(53, 3, G[2]);
    return;
  }
  if (style === 'curly' || style === 'volume') {
    lobes(
      k,
      R,
      [
        [27.5, 22.5, 4.4],
        [31.5, 17.6, 4.8],
        [38, 15, 4.8],
      ],
      9,
    );
    lobe(k, R, 44, 14.4, 4.6, 4.6, 1.8, 6.5, 10);
    if (style === 'curly') lobes(k, R, [[26, 29.5, 3.6]], 12);
    return;
  }
  if (style === 'bald') {
    lobes(k, R, [
      [29.4, 31.4, 2.7, 3],
      [28.8, 26.6, 3, 3.4],
    ]);
    return;
  }
  if (style === 'thin') {
    k.form(
      (x, y) => {
        const ax = Math.abs(x + 0.5 - 44);
        return y >= 19 && y <= 33 && ax >= geo.half(Math.min(y, 27)) - 3.2 + Math.max(0, y - 28) * 0.5 && ax <= geo.half(Math.min(y, 27)) + 1.4;
      },
      (x, y) => dome(x, y) + strandsFrom(44, 4, 22)(x, y),
      R,
      { edge: 1, noise: 0.2 },
    );
    for (const [x0, x1, y] of [
      [35, 41, 15],
      [39, 49, 13],
      [46, 53, 15],
    ])
      for (let x = x0; x <= x1; x += 1) k.put(x, y + (Math.abs(x - 44) > 5 ? 1 : 0), R[x % 3 ? 3 : 2]);
    return;
  }
  if (style === 'long') {
    k.form(
      capTest(geo, 2.4, 2.6, (dx) => 20.5 + Math.abs(dx) * 0.42, 27),
      (x, y) => dome(x, y) + (Math.sin((Math.abs(x + 0.5 - 44) - (y - 10) * 0.35) * 1.5) > 0.5 ? -1.1 : 0),
      R,
      { edge: 1, noise: 0.2 },
    );
    // as mechas que descem na frente dos ombros
    for (const side of [-1, 1]) {
      const X0 = 44 - geo.cw - 3.4;
      k.form(
        (x, y) => {
          const u = side < 0 ? x + 0.5 : 88 - (x + 0.5);
          return y >= 26 && y <= 64 && u >= X0 - 2.2 + Math.sin(y * 0.5) * 0.6 && u <= X0 + 2.6 - Math.max(0, y - 56) * 0.3;
        },
        (x, y) => (side < 0 ? 4.6 : 3.6) + (Math.sin((x + Math.sin(y * 0.4)) * 1.9) > 0.3 ? -1.2 : 0.4),
        R,
        { edge: 1, noise: 0.2, seed: 7 },
      );
    }
    return;
  }
  if (style === 'bob') {
    // a franja reta e os dois lados caindo até o queixo
    k.form(
      (x, y) => {
        const dx = x + 0.5 - 44;
        const ax = Math.abs(dx);
        if (y < 27 && (dx / (geo.cw + 5)) ** 2 + ((27 - (y + 0.5)) / 18.5) ** 2 > 1) return false;
        if (y < 9) return false;
        if (ax >= geo.cw - 2.6) return y <= 51 && ax <= geo.cw + 5 - Math.max(0, y - 45) ** 1.5 * 0.4 && ax >= geo.cw - 2.6 + Math.max(0, y - 47) * 0.9;
        return y <= 26 - (Math.round(ax) % 5 === 4 ? 1 : 0);
      },
      (x, y) => {
        const dx = x + 0.5 - 44;
        const shine = y >= 13 && y <= 15 + Math.abs(dx) * 0.12 && dx > -15 && dx < 9 ? 1.5 : 0;
        return tube(21, 67, 2, 5.2)(x) + (Math.sin((x + 0.5) * 1.7) > 0.45 ? -1 : 0) + shine - (y > 44 ? 0.6 : 0);
      },
      R,
      { edge: 1, noise: 0.15, seed: 8 },
    );
    return;
  }
  const P = {
    short: { t: 1.7, tt: 2.3, line: (dx) => 21.8 + 0.022 * dx * dx, burn: 33 },
    crew: { t: 0.9, tt: 1.3, line: (dx) => 20.8 + 0.012 * dx * dx, burn: 31 },
    slick: { t: 1.1, tt: 1.7, line: (dx) => 19.4 + 0.032 * dx * dx + 2.2 * Math.exp((-dx * dx) / 7), burn: 32 },
    side: { t: 2, tt: 2.8, line: (dx) => (dx < -6 ? 20.6 + 0.05 * (dx + 6) ** 2 : 22.4 + 2.4 * Math.sin(((dx + 6) / 21) * Math.PI)), burn: 33 },
  }[style] ?? { t: 1.7, tt: 2.3, line: (dx) => 21.8 + 0.022 * dx * dx, burn: 33 };
  const strands =
    style === 'slick'
      ? (x, y) => (Math.sin((x + 0.5 - 44) * 2.3) > 0.45 ? -1 : 0) + (y >= 12 && y <= 14.5 + Math.abs(x - 40) * 0.1 && x > 31 && x < 49 ? 1.7 : 0)
      : style === 'side'
        ? (x, y) => (Math.sin((x + 0.5 - 44 - (y - 9) * 0.55) * 1.5) > 0.5 ? -1.1 : 0) + (x >= 37 && x <= 38 && y >= 10 && y <= 20 ? -1.6 : 0)
        : style === 'crew'
          ? (x, y) => (hash(x, y, 3) < 0.2 ? -0.9 : 0)
          : strandsFrom(44, 5, 20);
  k.form(capTest(geo, P.t, P.tt, P.line, P.burn), (x, y) => dome(x, y) + strands(x, y), R, { edge: 1, noise: 0.22, seed: 5 });
}

/** A sombra que a aba joga na testa. */
function brimShade(k, geo, y0, y1, a) {
  for (let y = y0; y <= y1; y += 1) for (let x = 26; x <= 61; x += 1) if (geo.inFace(x, y)) k.tint(x, y, [20, 6, 10], a * (1 - ((y - y0) / (y1 - y0 + 1)) * 0.6));
}

function brimmed(k, spec, geo, o) {
  const hat = spec.hat;
  const R = rampOf(hat.color);
  const B = rampOf(hat.band ?? hat.color);
  const top = o.top;
  const base = o.base;
  const crownHalf = (y) => {
    const f = (y - top) / (base - top);
    const r = o.round ? Math.sqrt(Math.max(0, 1 - (1 - f) ** 2)) : Math.min(1, 0.72 + f * 2.2);
    return (o.w0 + (o.w1 - o.w0) * f) * (o.round ? 0.25 + 0.75 * r : r);
  };
  k.form(
    (x, y) => {
      const dx = Math.abs(x + 0.5 - 44);
      if (y < top || y > base) return false;
      if (o.pinch && y < top + 2 && dx < 2.6) return false;
      return dx <= crownHalf(y);
    },
    (x, y) => {
      const dx = x + 0.5 - 44;
      let t = tube(44 - o.w1 - 1, 44 + o.w1 + 1, 1.4, 5.8)(x) - (y - top) * 0.05;
      if (o.pinch && Math.abs(dx) < 1.6 && y < top + 8) t -= 1.6;
      if (o.pinch && Math.abs(Math.abs(dx) - 6.5) < 1.2 && y > top + 2 && y < top + 9) t -= 0.7;
      if (o.weave) t += (x + y) % 3 === 0 ? -1 : (x - y + 40) % 4 === 0 ? 0.6 : 0;
      return t;
    },
    R,
    { edge: 1, rim: 4, noise: 0.25, seed: 14 },
  );
  // a fita
  if (hat.band) {
    k.form(
      (x, y) => y >= base - o.band + 1 && y <= base && Math.abs(x + 0.5 - 44) <= crownHalf(y),
      (x) => tube(44 - o.w1 - 1, 44 + o.w1 + 1, 1.6, 5.6)(x),
      B,
      { edge: 1, noise: 0.1 },
    );
  }
  // a aba: o de cima pega a luz, a beirada de baixo fica na sombra
  const by = o.brimY;
  const droop = o.droop ?? 0;
  const yb = (dx) => by + droop * dx * dx;
  k.form(
    (x, y) => {
      const dx = x + 0.5 - 44;
      return ((dx / o.rx) ** 2 + ((y + 0.5 - yb(dx)) / o.ry) ** 2 <= 1);
    },
    (x, y) => {
      const dx = x + 0.5 - 44;
      let t = (y + 0.5 - yb(dx) < 0.4 ? 5.2 : 2.6) - dx * 0.035;
      if (o.weave) t += (x + y) % 3 === 0 ? -0.9 : (x - y + 40) % 4 === 0 ? 0.6 : 0;
      return t;
    },
    R,
    { edge: 1, rim: 5, noise: 0.25, seed: 15, y0: Math.floor(by - o.ry - 1), y1: Math.ceil(by + o.ry + droop * o.rx * o.rx + 1) },
  );
  brimShade(k, geo, Math.round(by + o.ry), Math.round(by + o.ry) + (o.deep ?? 2), o.shade ?? 0.3);
}

/** O chapéu (por cima do cabelo). */
export function paintHat(k, spec, geo) {
  const hat = spec.hat;
  if (!hat) return;
  const type = hat.type;
  const R = hat.color ? rampOf(hat.color) : null;
  if (type === 'fedora' || type === 'panama') return brimmed(k, spec, geo, { top: 2, base: 18, w0: 9.8, w1: 13.6, pinch: true, band: 3, brimY: 20, rx: 24.5, ry: 3.3 });
  if (type === 'wide') return brimmed(k, spec, geo, { top: 4, base: 18, w0: 10.6, w1: 14, pinch: true, band: 3, brimY: 20.6, rx: 34, ry: 4, shade: 0.5, deep: 6 });
  if (type === 'safari') return brimmed(k, spec, geo, { top: 3, base: 18, w0: 13.2, w1: 13.8, round: true, band: 3, brimY: 20, rx: 22, ry: 3, droop: 0.006 });
  if (type === 'straw') return brimmed(k, spec, geo, { top: 4, base: 18, w0: 11.4, w1: 13.4, band: 3, brimY: 20.2, rx: 30, ry: 4.2, weave: true, droop: 0.002 });
  if (type === 'cap') {
    const V = rampOf(hat.visor ?? hat.color);
    k.form(
      (x, y) => y <= 21 && ((x + 0.5 - 44) / 15.4) ** 2 + ((y + 0.5 - 17) / 13) ** 2 <= 1,
      (x, y) => ball(44, 17, 15.4, 13, 1.4, 6.2)(x, y) + (Math.abs(Math.abs(x + 0.5 - 44) - (6.4 + (y - 4) * 0.14)) < 0.6 ? -1.3 : 0),
      R,
      { edge: 1, rim: 4, noise: 0.2, seed: 16 },
    );
    k.put(43, 3, R[5]);
    k.put(44, 3, R[3]);
    if (hat.emblem) {
      const E = rampOf(hat.emblem);
      k.form(ell(44, 12.4, 3.6, 3.4), ball(44, 12.4, 3.6, 3.4, 2.5, 6.4), E, { edge: 1, noise: 0 });
    }
    k.form(
      (x, y) => {
        const dx = x + 0.5 - 44;
        return Math.abs(dx) <= 16.6 && y + 0.5 >= 19.6 - 0.004 * dx * dx && y + 0.5 <= 24.6 - 0.0135 * dx * dx;
      },
      (x, y) => (y <= 21 ? 5 : 2.8) - (x - 44) * 0.04,
      V,
      { edge: 1, rim: 5, noise: 0.15, seed: 17 },
    );
    if (hat.ticket) {
      k.rect(53, 8, 5, 8, hex('#f4e8b0'));
      k.rect(53, 8, 5, 2, hex('#b8261c'));
      for (let y = 11; y <= 14; y += 2) k.rect(54, y, 3, 1, hex('#8a7a48'));
      for (let y = 8; y <= 15; y += 1) k.put(58, y, hex('#3a2a10'));
    }
    return brimShade(k, geo, 24, 26, 0.28);
  }
  if (type === 'beanie') {
    const half = (y) => 15.4 * Math.sqrt(Math.max(0, 1 - ((19 - y) / 15.5) ** 2));
    k.form(
      (x, y) => y >= 3 && y <= 19 && Math.abs(x + 0.5 - 44) <= half(y),
      (x, y) => ball(44, 17, 15.4, 14, 1.5, 5.8)(x, y) + (Math.sin(((x + 0.5 - 44) / Math.max(4, half(y))) * 14) > 0.2 ? -1.1 : 0.2),
      R,
      { edge: 1, rim: 4, noise: 0.15, seed: 18 },
    );
    k.form(
      (x, y) => y >= 18 && y <= 23 && Math.abs(x + 0.5 - 44) <= 16 - (y > 22 ? 0.8 : 0),
      (x) => tube(27, 61, 2, 6)(x) + (x % 2 ? -1.2 : 0),
      R,
      { edge: 1, rim: 4, noise: 0.1 },
    );
    return brimShade(k, geo, 24, 25, 0.2);
  }
  if (type === 'crown') {
    const G = rampOf('#e2b23a', 'metal');
    k.form(
      (x, y) => {
        const dx = Math.abs(x + 0.5 - 44);
        if (dx > 13.5 || y > 14) return false;
        if (y >= 10) return true;
        const tooth = Math.abs(((dx + 3.25) % 6.5) - 3.25);
        return y >= 3 + tooth * 2.3;
      },
      (x, y) => tube(29, 59, 1.8, 6.4)(x) + (y === 10 || y === 14 ? -1.4 : 0) + (y === 11 ? 0.6 : 0),
      G,
      { edge: 1, rim: 5, noise: 0.2, seed: 19 },
    );
    for (const [x, c] of [
      [37, '#3a8ad8'],
      [43, '#d8283a'],
      [50, '#3ab86a'],
    ]) {
      const J = rampOf(c);
      k.put(x, 11, J[6]);
      k.put(x + 1, 11, J[4]);
      k.put(x, 12, J[4]);
      k.put(x + 1, 12, J[2]);
    }
    for (const x of [30, 37, 43, 50, 56]) {
      k.put(x, 2, hex('#ffffff'));
      k.put(x + 1, 2, hex('#e8dcc8'));
    }
    return undefined;
  }
  if (type === 'helmet') {
    k.form(
      (x, y) => y >= 3 && y <= 19 && ((x + 0.5 - 44) / 15.8) ** 2 + ((19 - y) / 16) ** 2 <= 1,
      (x, y) => {
        const dx = Math.abs(x + 0.5 - 44);
        return ball(44, 17, 15.8, 14.5, 1.6, 6.2)(x, y) + (dx < 2.2 ? 0.9 : dx < 3.2 ? -1.4 : 0);
      },
      R,
      { edge: 1, rim: 5, noise: 0.12, seed: 20 },
    );
    if (hat.band) {
      const B = rampOf(hat.band);
      for (let x = 29; x <= 58; x += 1) if (k.has(x, 16)) {
          k.put(x, 16, B[x < 40 ? 4 : 2]);
          k.put(x, 17, B[x < 40 ? 3 : 1]);
        }
    }
    k.form(ell(44, 20.2, 19, 2.7), (x, y) => (y <= 19 ? 5.6 : 3) - (x - 44) * 0.04, R, { edge: 1, rim: 6, noise: 0.1 });
    k.put(35, 8, R[6]);
    k.put(36, 7, R[6]);
    k.put(37, 7, R[6]);
    return brimShade(k, geo, 23, 25, 0.26);
  }
  if (type === 'turban') {
    k.form(
      (x, y) => {
        const dx = x + 0.5 - 44;
        return y >= 1 && ((dx / 17.4) ** 2 + ((y + 0.5 - 14) / 13) ** 2 <= 1) && y + 0.5 <= 24.4 - Math.abs(dx) * 0.1;
      },
      (x, y) => {
        const dx = x + 0.5 - 44;
        return ball(44, 14, 17.4, 13, 1.6, 6)(x, y) + Math.sin((Math.abs(dx) * 0.95 - y * 1.05) * 0.8) * 1.25;
      },
      R,
      { edge: 1, rim: 4, noise: 0.2, seed: 21 },
    );
    const G = rampOf('#e2b23a', 'metal');
    k.form(ell(44, 17.5, 3.4, 4), ball(44, 17.5, 3.4, 4, 2, 6.6), G, { edge: 1, noise: 0 });
    const J = rampOf('#d8283a');
    k.put(43, 17, J[6]);
    k.put(44, 17, J[4]);
    k.put(43, 18, J[4]);
    k.put(44, 18, J[2]);
    return brimShade(k, geo, 24, 25, 0.18);
  }
  if (type === 'goggles') {
    const L = rampOf('#4a3420');
    const G = rampOf('#c9962e', 'metal');
    const C = rampOf('#6aa6c4');
    k.form(
      (x, y) => y >= 17 && y <= 21 && Math.abs(x + 0.5 - 44) <= geo.half(Math.min(27, y)) + 2,
      (x) => tube(27, 61, 1.6, 5)(x),
      L,
      { edge: 1, noise: 0.15 },
    );
    for (const cx of [37, 51]) {
      k.form(ell(cx, 19, 5.6, 5.2), ball(cx, 19, 5.6, 5.2, 2, 6.6), G, { edge: 1, noise: 0 });
      k.form(ell(cx, 19, 3.7, 3.4), (x, y) => (x + y < cx + 17 ? 6 : x + y < cx + 20 ? 4 : 2), C, { edge: 1, noise: 0 });
      k.put(Math.round(cx - 2), 17, hex('#ffffff'));
      k.put(Math.round(cx - 1), 17, hex('#ffffff'), 0.7);
    }
    for (let x = 42; x <= 45; x += 1) k.put(x, 19, G[x < 44 ? 5 : 2]);
    return undefined;
  }
  if (type === 'flatcap') {
    k.form(
      (x, y) => {
        const dx = x + 0.5 - 44;
        return y <= 21 && (dx / 18.2) ** 2 + ((y + 0.5 - 16.5) / 8.2) ** 2 <= 1;
      },
      (x, y) => ball(44, 16.5, 18.2, 8.2, 1.6, 6)(x, y) + ((x + 2 * y) % 4 === 0 ? -0.9 : 0),
      R,
      { edge: 1, rim: 4, noise: 0.2, seed: 22 },
    );
    k.form(ell(44, 21.6, 12.6, 2.7), (x, y) => (y <= 21 ? 4.8 : 2.4) - (x - 44) * 0.05, R, { edge: 1, rim: 5, noise: 0.1 });
    k.put(43, 9, R[5]);
    k.put(44, 9, R[3]);
    return brimShade(k, geo, 24, 25, 0.24);
  }
  if (type === 'headband') {
    k.form(
      (x, y) => y >= 18 && y <= 21 && Math.abs(x + 0.5 - 44) <= geo.half(Math.min(27, y)) + 1.8,
      (x, y) => tube(28, 60, 2.4, 6.4)(x) - (y === 21 ? 1 : 0),
      R,
      { edge: 2, noise: 0.1 },
    );
    for (const [x, y, t] of [
      [60, 21, 4],
      [61, 22, 4],
      [62, 23, 3],
      [62, 24, 3],
      [61, 23, 2],
      [60, 22, 2],
      [63, 21, 3],
      [64, 22, 2],
    ])
      k.put(x, y, R[t]);
    return undefined;
  }
  if (type === 'police') {
    const V = rampOf(hat.visor ?? '#101014');
    const B = rampOf(hat.band ?? hat.color);
    k.form(
      (x, y) => {
        const dx = Math.abs(x + 0.5 - 44);
        const top = 2.6 + dx * dx * 0.012;
        return y + 0.5 >= top && y <= 15 && dx <= 18.6 - (y - 3) * 0.4 - (y < 5 ? (5 - y) * 2 : 0);
      },
      (x, y) => tube(25, 63, 1.5, 5.8)(x) - (y > 9 ? 0.5 : 0) + (y < 5 ? 0.6 : 0),
      R,
      { edge: 1, rim: 4, noise: 0.2, seed: 23 },
    );
    k.form((x, y) => y >= 15 && y <= 18 && Math.abs(x + 0.5 - 44) <= 14, (x) => tube(29, 59, 1.4, 5)(x), B, { edge: 1, noise: 0.1 });
    const G = rampOf(hat.emblem ?? '#e6c34a', 'metal');
    k.form(
      (x, y) => y >= 6 && y <= 13 && Math.abs(x + 0.5 - 44) <= (y < 11 ? 3.4 : 3.4 - (y - 10) * 1.1),
      (x, y) => (x < 44 ? 6 : 4) - (y > 10 ? 1 : 0),
      G,
      { edge: 1, noise: 0 },
    );
    k.put(43, 9, hex('#fff6d0'));
    k.form(
      (x, y) => {
        const dx = x + 0.5 - 44;
        return Math.abs(dx) <= 15 && y >= 19 && y + 0.5 <= 24.2 - 0.02 * dx * dx;
      },
      (x, y) => (y === 20 && x > 33 && x < 42 ? 6 : y <= 20 ? 3.4 : 1.6),
      V,
      { edge: 0, noise: 0 },
    );
    return brimShade(k, geo, 24, 26, 0.3);
  }
  if (type === 'hood') {
    k.form(
      (x, y) => {
        const dx = x + 0.5 - 44;
        const out = (dx / 21.5) ** 2 + ((y + 0.5 - 30) / 27.5) ** 2 <= 1;
        const hole = (dx / (geo.cw - 0.5)) ** 2 + ((y + 0.5 - 37) / 17.5) ** 2 <= 1;
        return out && !hole && y <= 56;
      },
      (x, y) => {
        const dx = x + 0.5 - 44;
        const inner = (dx / (geo.cw + 2.5)) ** 2 + ((y + 0.5 - 36) / 20) ** 2 <= 1;
        return ball(44, 30, 21.5, 27.5, 1.4, 5.6)(x, y) + (inner ? -1.6 : 0) + (Math.sin(Math.atan2(y - 30, dx) * 9) > 0.7 ? -0.8 : 0);
      },
      R,
      { edge: 1, rim: 4, noise: 0.25, seed: 24 },
    );
    for (let y = 19; y <= geo.by; y += 1) for (let x = 28; x <= 59; x += 1) if (geo.inFace(x, y)) k.tint(x, y, [6, 2, 6], 0.34);
    return undefined;
  }
  return undefined;
}

/** O capuz e outros chapéus têm uma parte ATRÁS da cabeça. */
export function paintHatBack(k, spec) {
  const hat = spec.hat;
  if (hat?.type !== 'hood') return;
  const R = rampOf(hat.color);
  k.form(ell(44, 30, 21.5, 27.5), 1.2, R, { edge: 0, noise: 0.2, y1: 58 });
}

export const hairTools = { lobe, lobes, mir, mix };
