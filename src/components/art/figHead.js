/**
 * Versão 2.17: a cabeça dos personagens novos. O rosto é grande (28 px de bochecha a bochecha,
 * num desenho de 88×84), com olho de verdade (branco, íris de três tons, pupila, cílios), nariz
 * com luz e sombra, boca com lábio e as linhas de separação no tom escuro da própria pele.
 * O eixo passa ENTRE as colunas 43 e 44: o espelho de x é 87 − x.
 */
import { ball, clamp, ell, hash, hex, mix, rampOf, vnoise } from './figKit.js';

export const mir = (x) => 87 - x;
export const INK = hex('#0b0507');
const WHITE = hex('#fbf8f6');

const JAWS = {
  round: { cw: 14, ty: 40, by: 51, ch: 6, p: 1.5 },
  square: { cw: 14, ty: 43, by: 51, ch: 9.5, p: 2.4 },
  heavy: { cw: 15, ty: 44, by: 53, ch: 10, p: 2.2, jowl: 1 },
  long: { cw: 13, ty: 38, by: 54, ch: 5.5, p: 1.5 },
  thin: { cw: 13, ty: 36, by: 52, ch: 4.5, p: 1.35 },
};

/** A geometria do rosto de `spec`: a meia-largura em cada linha, o teste de dentro e as medidas. */
export function geoOf(spec) {
  const j0 = JAWS[spec.jaw] ?? JAWS.round;
  // versão 2.18: o rosto feminino é mais estreito, com o queixo fino e delicado
  const j = spec.fem ? { ...j0, cw: 13, ty: Math.min(j0.ty, 38), ch: Math.min(j0.ch, 4.2), p: 1.3 } : j0;
  const cw = j.cw;
  const half = (y) => {
    if (y < 13 || y > j.by) return 0;
    if (y <= 27) return cw * Math.sqrt(Math.max(0, 1 - ((27 - y) / 15.5) ** 2));
    const bulge = j.jowl ? j.jowl * Math.max(0, Math.sin(((y - 34) / (j.by - 34)) * Math.PI)) : 0;
    if (y <= j.ty) return cw + bulge;
    const t = (y - j.ty) / (j.by - j.ty);
    return j.ch + (cw + bulge - j.ch) * (1 - t ** j.p);
  };
  const inFace = (x, y) => {
    const h = Math.round(half(y));
    return h > 0 && x >= 44 - h && x <= 43 + h;
  };
  const bigStache = ['big', 'gold', 'handlebar'].includes(spec.facial?.mustache);
  // quantos pixels cada ponto do rosto está da borda (a volta do queixo escurece por ela)
  const W = 88;
  const H = 84;
  const far = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) far[y * W + x] = inFace(x, y) ? 99 : 0;
  for (let y = 1; y < H; y += 1) for (let x = 1; x < W; x += 1) far[y * W + x] = Math.min(far[y * W + x], far[y * W + x - 1] + 1, far[(y - 1) * W + x] + 1);
  for (let y = H - 2; y >= 0; y -= 1) for (let x = W - 2; x >= 0; x -= 1) far[y * W + x] = Math.min(far[y * W + x], far[y * W + x + 1] + 1, far[(y + 1) * W + x] + 1);
  const depth = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : far[y * W + x]);
  return { ...j, cw, half, inFace, depth, my: bigStache ? 47 : 46, neck: spec.broad ? 9.5 : spec.fem ? 5 : j.cw >= 14 ? 7 : 6 };
}

/** O pescoço: na sombra do queixo, mais claro à esquerda. */
export function paintNeck(k, S, geo, bottom = 62) {
  const n = geo.neck;
  k.form(
    (x, y) => y >= geo.by - 4 && y <= bottom && x >= 44 - n && x <= 43 + n,
    (x, y) => {
      const d = (x + 0.5 - 44) / n;
      let t = 4.2 - d * 1.1;
      if (y <= geo.by + 2) t = 1.6;
      else if (y <= geo.by + 4) t -= 1.1;
      return t;
    },
    S,
    { edge: 2, noise: 0.2, seed: 5 },
  );
}

const EAR = ['.665', '6414', '5131', '5243', '4231', '2424', '.232', '..23'];

/**
 * As orelhas (linhas 33–40): a hélice clara, a dobra escura por dentro e o lóbulo; a da direita
 * um tom mais na sombra. Devolve a coluna onde a orelha esquerda começa.
 */
export function paintEars(k, S, geo) {
  const x0 = 44 - Math.round(geo.half(36)) - 4;
  for (const side of [-1, 1]) {
    EAR.forEach((row, j) => {
      for (let i = 0; i < 4; i += 1) {
        if (row[i] === '.') continue;
        const t = Number(row[i]);
        k.put(side < 0 ? x0 + i : mir(x0 + i), 33 + j, S[side < 0 ? t : Math.max(0, t - 1)]);
      }
    });
  }
  return x0;
}

/**
 * A cabeça (pele) com a luz da lâmpada vindo de cima e da esquerda: o meio do rosto claro, a
 * bochecha esquerda um tom abaixo, uma faixa de sombra na direita, do nariz para baixo a metade
 * direita escurece e a volta do queixo cai em dois ou três tons até a linha escura da borda.
 */
export function paintSkull(k, S, geo, spec) {
  const dark = spec.shade ?? 0;
  k.form(
    geo.inFace,
    (x, y) => {
      const h = geo.half(y) || 1;
      const d = (x + 0.5 - 44) / h;
      const e = geo.depth(x, y);
      let t = 5.25 - dark;
      if (d > 0.42) t -= ((d - 0.42) / 0.58) * (spec.fem ? 2.3 : 3.6);
      else if (d < -0.55) t -= ((-d - 0.55) / 0.45) * 0.8;
      if (y >= 36 && y <= 45 && d < -0.45) t -= 0.75;
      if (y >= 43) {
        if (d > 0.1) t -= spec.fem ? 0.25 + (d - 0.1) * 1.2 : 0.7 + (d - 0.1) * 2.1;
        t -= (y - 43) * 0.05;
      }
      if (y >= 40 && e < 4) t -= (4 - e) * (spec.fem ? 0.4 : 0.62);
      else if (e < 3) t -= (3 - e) * 0.3;
      // a testa pega a luz; a órbita dos olhos e a maçã do rosto
      if (y >= 16 && y <= 26 && d > -0.6 && d < 0.1) t += 0.25;
      if (y >= 29 && y <= 30 && Math.abs(Math.abs(x - 43.5) - 7) < 4.6) t -= 0.6;
      if (y >= 35 && y <= 36 && Math.abs(Math.abs(x - 43.5) - 7) < 3.4) t -= 0.45;
      if (((x - 34.5) / 2.8) ** 2 + ((y - 38.6) / 1.5) ** 2 < 1) t += 0.5;
      return t;
    },
    S,
    { edge: 1, noise: 0.3, seed: spec.seed ?? 1 },
  );
  // a luz do queixo
  k.put(42, geo.by - 1, S[6]);
  k.put(41, geo.by - 1, S[5]);
  k.put(42, geo.by - 2, S[5]);
}

const BROWS = {
  flat: { 33: 28, 34: 27, 35: 27, 36: 27, 37: 27, 38: 27, 39: 27 },
  soft: { 33: 28, 34: 27, 35: 27, 36: 27, 37: 27, 38: 27, 39: 28 },
  arched: { 33: 28, 34: 27, 35: 26, 36: 26, 37: 26, 38: 27, 39: 27 },
  angry: { 33: 26, 34: 26, 35: 27, 36: 27, 37: 28, 38: 28, 39: 29, 40: 29 },
  sad: { 33: 29, 34: 28, 35: 28, 36: 27, 37: 27, 38: 26, 39: 26 },
  pain: { 33: 29, 34: 29, 35: 28, 36: 27, 37: 26, 38: 26, 39: 25 },
  fem: { 32: 27, 33: 26, 34: 25, 35: 25, 36: 25, 37: 25, 38: 26, 39: 26 },
};

function paintBrows(k, spec, mood, color, S) {
  const shape = mood === 'hurt' ? BROWS.pain : spec.fem ? BROWS.fem : (BROWS[spec.browShape] ?? BROWS.flat);
  for (const side of [-1, 1]) {
    const lift = mood === 'thinking' && side > 0 ? -2 : mood === 'smug' && side < 0 ? -1 : 0;
    for (const [xs, y0] of Object.entries(shape)) {
      const x = side < 0 ? Number(xs) : mir(Number(xs));
      const y = y0 + lift;
      k.put(x, y, color);
      if (spec.thickBrows && Number(xs) >= 34) k.put(x, y + 1, color);
      else if (!spec.fem && Number(xs) >= 35 && Number(xs) <= 38) k.put(x, y + 1, S[4], 0.55);
    }
  }
  if (mood === 'hurt') {
    k.put(42, 28, S[2]);
    k.put(45, 28, S[2]);
  }
}

/** Um olho. `side`: −1 o da esquerda. As células usam `u` (para fora do rosto) e `dy`. */
function paintEye(k, side, spec, mood, S, ir) {
  const cx = side < 0 ? 37 : 50;
  const cy = 33;
  const at = (u, dy) => [cx + side * u, cy + dy];
  const P = (u, dy, c, a = 1) => k.put(cx + side * u, cy + dy, c, a);
  const K = INK;
  const corner = mix(S[0], INK, 0.45);
  const type = spec.eyes ?? 'open';
  if (spec.eyesGlow) {
    if (mood === 'blink') {
      for (let u = -2; u <= 3; u += 1) P(u, 0, S[0]);
      return;
    }
    const g = hex(spec.eyesGlow);
    const dy = mood === 'hurt' ? 1 : 0;
    for (let u = -3; u <= 4; u += 1) for (let j = -2; j <= 2; j += 1) if (Math.abs(u - 0.5) / 4 + Math.abs(j) / 2.4 <= 1) P(u, j + dy, g, 0.32);
    for (let u = -2; u <= 3; u += 1) P(u, dy, g);
    for (let u = -1; u <= 2; u += 1) P(u, dy - 1, mood === 'smug' || mood === 'hurt' ? mix(g, S[1], 0.6) : g);
    for (let u = -1; u <= 2; u += 1) P(u, dy, hex('#ffd9a8'));
    P(0, dy, hex('#fff6e0'));
    return;
  }
  if (mood === 'blink') {
    for (let u = -2; u <= 3; u += 1) for (let dy = -1; dy <= 1; dy += 1) P(u, dy, S[dy < 0 ? 4 : 5]);
    P(3, 0, K);
    for (let u = -1; u <= 2; u += 1) P(u, 1, K);
    P(-2, 0, K);
    if (type === 'lashes') P(4, -1, K);
    P(0, 2, S[3]);
    P(1, 2, S[3]);
    return;
  }
  if (mood === 'hurt') {
    for (let u = -2; u <= 3; u += 1) for (let dy = -2; dy <= 2; dy += 1) P(u, dy, S[4]);
    for (const [u, dy] of [
      [3, -2],
      [2, -2],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-2, 0],
      [0, 1],
      [1, 1],
      [2, 2],
      [3, 2],
    ])
      P(u, dy, K);
    return;
  }
  const narrow = type === 'narrow';
  const half = narrow || type === 'sleepy' || mood === 'smug';
  // a abertura: [dy, uMin, uMax]
  const open = narrow
    ? [[0, -2, 3]]
    : half
      ? [
          [0, -2, 3],
          [1, -2, 2],
        ]
      : [
          [-1, -1, 2],
          [0, -2, 3],
          [1, -2, 2],
        ];
  const cells = new Map();
  for (const [dy, a, b] of open) {
    for (let u = a; u <= b; u += 1) {
      let c = WHITE;
      if (dy === open[0][0]) c = hex(half ? '#d9c6c2' : '#c7a8a2');
      if (dy === 0 && u === 3) c = hex('#c9b6b6');
      if (dy === 0 && u === -2) c = hex('#ddcbc6');
      cells.set(`${at(u, dy)[0]},${cy + dy}`, c);
    }
  }
  // a íris 3×3: clara em cima (a luz entra pela esquerda), a pupila no meio, funda embaixo
  const look = mood === 'thinking' ? [-1, -1] : [0, 0];
  const icx = cx + look[0];
  const icy = cy + look[1];
  const deep = mix(ir[0], INK, 0.5);
  for (let ay = -1; ay <= 1; ay += 1) {
    for (let ax = -1; ax <= 1; ax += 1) {
      const key = `${icx + ax},${icy + ay}`;
      if (!cells.has(key)) continue;
      let c = ay < 0 ? (ax === 0 ? ir[3] : ir[4]) : ay > 0 ? (ax > 0 ? ir[2] : deep) : ax < 0 ? ir[5] : ax > 0 ? ir[1] : INK;
      if (ay < 0 && half) c = ax === 0 ? ir[2] : ir[3];
      cells.set(key, c);
    }
  }
  for (const [key, c] of cells) {
    const [x, y] = key.split(',').map(Number);
    k.put(x, y, c);
  }
  // os cílios e os cantos
  const top = open[0][0];
  for (let u = top === -1 ? -1 : -2; u <= (top === -1 ? 2 : 3); u += 1) P(u, top - 1, K);
  if (top === -1) {
    P(3, -1, K);
    P(-2, -1, K);
  } else if (!narrow) {
    for (let u = -1; u <= 2; u += 1) P(u, top - 2, S[4]);
    for (let u = -1; u <= 2; u += 1) P(u, top - 3, S[3], 0.7);
  }
  P(4, 0, K);
  P(-3, 0, corner);
  if (type === 'lashes' || spec.fem) {
    P(3, top - 1, K);
    P(4, top, K);
    P(5, top - 1, K);
    P(4, top - 2, K);
  }
  if (spec.fem && !narrow && top === -1) {
    // a pálpebra pintada e o brilho no olho
    const shade = spec.lip ? mix(S[3], hex(spec.lip), 0.45) : S[3];
    for (let u = -1; u <= 3; u += 1) P(u, top - 2, shade, 0.75);
    k.put(icx - 1, icy - 1, WHITE);
  }
  if (narrow) {
    for (let u = -1; u <= 2; u += 1) P(u, 1, S[2]);
  } else {
    P(0, 2, S[2]);
    P(1, 2, S[2]);
    P(-1, 2, S[3]);
  }
  if (type === 'tired') {
    for (let u = -2; u <= 2; u += 1) P(u, 2, S[3]);
    for (let u = -1; u <= 2; u += 1) P(u, 3, S[4]);
    P(2, 3, S[3]);
  }
}

function paintNose(k, spec, S) {
  const kind = spec.nose ?? 'plain';
  if (kind === 'big') {
    k.form(ell(44, 41.2, 4.6, 3.3), ball(44, 41.2, 4.6, 3.3, 3.2, 6.6), S, { edge: null, noise: 0, x0: 38, y0: 37, x1: 50, y1: 45 });
    for (let y = 34; y <= 38; y += 1) k.put(46, y, S[4]);
    k.put(47, 39, S[3]);
    k.put(48, 40, S[3]);
    k.put(48, 41, S[2]);
    k.put(48, 42, S[2]);
    k.put(39, 42, S[3]);
    for (const x of [40, 41]) k.put(x, 43, S[0]);
    for (const x of [46, 47]) k.put(x, 43, S[0]);
    for (let x = 42; x <= 45; x += 1) k.put(x, 44, S[2]);
    k.put(42, 39, S[6]);
    k.put(42, 40, S[6]);
    k.put(43, 40, S[6]);
    return;
  }
  const put = (x, y, t) => k.put(x, y, S[t]);
  if (spec.fem && kind !== 'hook') {
    // o nariz feminino: pequeno, só a luz da ponta, a sombra leve do lado e as narinas
    put(45, 38, 4);
    put(45, 39, 4);
    put(46, 40, 3);
    put(43, 39, 6);
    put(43, 40, 6);
    put(44, 40, 5);
    put(42, 41, 2);
    put(43, 41, 4);
    put(44, 41, 3);
    put(45, 41, 2);
    put(43, 42, 3);
    put(44, 42, 3);
    return;
  }
  const o = kind === 'hook' ? 1 : 0; // o adunco desce um pixel a mais
  // a sombra do dorso, à direita, que desce até a asa
  for (let y = kind === 'hook' ? 32 : 34; y <= 37 + o; y += 1) put(45, y, y < 36 ? 4 : 3);
  if (kind === 'hook') {
    for (let y = 33; y <= 38; y += 1) put(46, y, y < 36 ? 3 : 2);
    put(44, 34, 6);
    put(44, 35, 6);
    put(44, 36, 6);
    put(47, 37, 3);
    put(47, 38, 2);
  }
  put(45, 38 + o, 2);
  put(46, 38 + o, 1);
  put(46, 39 + o, 3);
  put(47, 39 + o, 1);
  put(45, 40 + o, 3);
  put(46, 40 + o, 2);
  put(47, 40 + o, 2);
  put(45, 41 + o, 3);
  put(46, 41 + o, 4);
  put(47, 41 + o, 0);
  // a luz na ponta
  put(43, 39 + o, 6);
  put(43, 40 + o, 6);
  put(43, 41 + o, 6);
  put(44, 40 + o, 5);
  put(42, 41 + o, 6);
  // a asa esquerda, as narinas e a sombra embaixo
  put(40, 40 + o, 3);
  put(39, 41 + o, 3);
  put(40, 42 + o, 4);
  put(41, 42 + o, 0);
  put(42, 42 + o, 0);
  put(43, 42 + o, 3);
  put(44, 42 + o, 2);
  put(45, 42 + o, 0);
  put(46, 42 + o, 0);
  put(47, 42 + o, 2);
  put(42, 43 + o, 3);
  put(43, 43 + o, 1);
  put(44, 43 + o, 1);
  put(45, 43 + o, 1);
  put(46, 43 + o, 2);
}

function paintMouth(k, spec, mood, speaking, S, geo) {
  const my = geo.my;
  const L = spec.lip ? rampOf(spec.lip) : null;
  const dark = L ? mix(L[0], INK, 0.25) : mix(S[0], INK, 0.35);
  const lipTone = (i) => (L ? L[i] : mix(S[Math.max(0, i - 2)], hex('#b8504c'), 0.34));
  const tooth = hex('#f6efe2');
  const gold = hex('#f0c24a');
  const lower = (x0, x1, y) => {
    for (let x = x0; x <= x1; x += 1) {
      const f = (x - x0) / Math.max(1, x1 - x0);
      k.put(x, y, lipTone(L ? (f < 0.15 ? 4 : f < 0.3 ? 5 : f < 0.45 ? 6 : f < 0.62 ? 5 : f < 0.8 ? 4 : 3) : f < 0.25 ? 5 : f < 0.45 ? 6 : f < 0.7 ? 5 : 4));
    }
  };
  if (mood === 'hurt') {
    for (let x = 39; x <= 48; x += 1) {
      k.put(x, my - 1, dark);
      k.put(x, my + 2, dark);
    }
    for (let y = my; y <= my + 1; y += 1) {
      k.put(38, y, dark);
      k.put(49, y, dark);
    }
    for (let x = 39; x <= 48; x += 1) {
      k.put(x, my, x === 46 && spec.goldTooth ? gold : tooth);
      k.put(x, my + 1, x % 2 ? mix(tooth, dark, 0.25) : tooth);
    }
    k.put(43, my, mix(tooth, dark, 0.4));
    k.put(44, my + 1, mix(tooth, dark, 0.5));
    k.put(37, my + 2, S[2]);
    k.put(50, my + 2, S[2]);
    lower(41, 46, my + 3);
    return;
  }
  if (speaking) {
    for (let x = 41; x <= 46; x += 1) k.put(x, my - 1, dark);
    for (let x = 40; x <= 47; x += 1) {
      k.put(x, my, x === 40 || x === 47 ? dark : x === 46 && spec.goldTooth ? gold : tooth);
      k.put(x, my + 1, x >= 42 && x <= 45 ? hex('#b0403e') : hex('#3a0c12'));
    }
    k.put(39, my, dark);
    k.put(48, my, dark);
    for (let x = 41; x <= 46; x += 1) k.put(x, my + 2, dark);
    lower(41, 46, my + 3);
    for (let x = 42; x <= 45; x += 1) k.put(x, my + 4, S[3]);
    return;
  }
  if (mood === 'smug') {
    for (let x = 40; x <= 45; x += 1) k.put(x, my, dark);
    k.put(39, my, S[1]);
    if (spec.goldTooth) {
      k.put(46, my, tooth);
      k.put(47, my, gold);
      k.put(48, my, dark);
      for (let x = 46; x <= 48; x += 1) k.put(x, my - 1, dark);
      k.put(49, my - 2, dark);
      lower(41, 47, my + 1);
    } else {
      k.put(46, my, dark);
      k.put(47, my - 1, dark);
      k.put(48, my - 1, dark);
      k.put(49, my - 2, dark);
      lower(41, 46, my + 1);
    }
    k.put(50, my - 3, S[3]);
    k.put(51, my - 2, S[3]);
    for (let x = 42; x <= 46; x += 1) k.put(x, my + 2, S[3]);
    return;
  }
  if (mood === 'thinking') {
    for (let x = 42; x <= 47; x += 1) k.put(x, my, dark);
    k.put(48, my - 1, dark);
    k.put(41, my, S[1]);
    lower(43, 46, my + 1);
    for (let x = 43; x <= 46; x += 1) k.put(x, my + 2, S[3]);
    return;
  }
  // parada: a linha da boca, os cantos e o lábio de baixo
  const smile = Boolean(L) || spec.smile;
  const x0 = L ? 39 : 40;
  const x1 = L ? 48 : 47;
  for (let x = x0; x <= x1; x += 1) k.put(x, my, dark);
  if (smile) {
    k.put(x0 - 1, my - 1, S[1]);
    k.put(x1 + 1, my - 1, S[1]);
  } else {
    k.put(x0 - 1, my, S[2]);
    k.put(x1 + 1, my, S[2]);
  }
  lower(x0 + 1, x1 - 1, my + 1);
  if (spec.fem && L) {
    // o lábio de cima (o arco) e o de baixo cheio, em duas linhas
    for (const x of [40, 41, 42, 45, 46, 47]) k.put(x, my - 1, L[x === 42 || x === 45 ? 4 : 3]);
    k.put(43, my - 1, L[2]);
    k.put(44, my - 1, L[2]);
    for (let x = 41; x <= 46; x += 1) k.put(x, my + 2, L[x < 43 ? 4 : x < 45 ? 3 : 2]);
    k.put(42, my + 1, L[6]);
    k.put(43, my + 1, mix(L[6], WHITE, 0.5));
    for (let x = 42; x <= 45; x += 1) k.put(x, my + 3, S[2]);
    return;
  }
  for (let x = 42; x <= 46; x += 1) k.put(x, my + 2, S[L ? 1 : 2]);
  k.put(41, my + 2, S[3]);
  k.put(47, my + 2, S[2]);
}

function paintWrinkles(k, S) {
  for (let x = 37; x <= 41; x += 1) k.put(x, 24, S[4]);
  for (let x = 44; x <= 49; x += 1) k.put(x, 25, S[4]);
  for (let x = 39; x <= 44; x += 1) k.put(x, 22, S[4]);
  for (const [x, y, t] of [
    [31, 35, 3],
    [32, 36, 4],
    [56, 35, 2],
    [55, 36, 3],
    [34, 37, 4],
    [35, 37, 4],
    [52, 37, 3],
    [53, 37, 3],
    [39, 42, 3],
    [38, 43, 3],
    [38, 44, 3],
    [37, 45, 3],
    [48, 42, 3],
    [49, 43, 2],
    [49, 44, 2],
    [50, 45, 2],
    [33, 43, 4],
    [34, 44, 3],
    [33, 46, 4],
    [34, 47, 3],
    [53, 44, 3],
    [54, 46, 3],
  ])
    k.put(x, y, S[t]);
}

/** O rosto inteiro por cima da cabeça já pintada. */
export function paintFace(k, spec, mood, speaking, S, geo, browColor) {
  if (spec.blush) {
    const b = hex(spec.blush);
    for (const cx of [34.5, 53.5]) for (let y = 38; y <= 42; y += 1) for (let x = Math.floor(cx - 4); x <= cx + 4; x += 1) if (geo.inFace(x, y) && ((x + 0.5 - cx) / 3.6) ** 2 + ((y + 0.5 - 40.6) / 2) ** 2 <= 1) k.tint(x, y, b, 0.3);
  }
  if (spec.wrinkles) paintWrinkles(k, S);
  paintNose(k, spec, S);
  const ir = rampOf(spec.iris ?? '#6a3a22');
  paintEye(k, -1, spec, mood, S, ir);
  paintEye(k, 1, spec, mood, S, ir);
  paintBrows(k, spec, mood, browColor, S);
  paintMouth(k, spec, mood, speaking, S, geo);
  if (spec.scar) {
    for (const [x, y] of [
      [51, 36],
      [52, 37],
      [52, 38],
      [53, 39],
      [53, 40],
      [54, 41],
      [54, 42],
    ]) {
      k.put(x, y, mix(S[1], hex('#a03a3a'), 0.4));
      k.put(x - 1, y, S[6], 0.6);
    }
    k.put(51, 38, S[2]);
    k.put(54, 39, S[2]);
    k.put(52, 41, S[2]);
  }
  if (mood === 'hurt') {
    // a bochecha marcada e a gota de suor
    for (const [x, y] of [
      [52, 39],
      [53, 40],
      [54, 39],
      [53, 41],
      [52, 42],
    ])
      k.tint(x, y, hex('#d03a3a'), 0.5);
    k.put(33, 23, hex('#bfe6ff'));
    k.put(33, 24, hex('#8ac8f0'));
    k.put(32, 24, hex('#e8f8ff'));
    k.put(33, 25, hex('#5aa0d8'));
  }
}

/** A barba por fazer: a pele do queixo e do buço puxa para a cor do pelo. */
function paintStubble(k, F, geo) {
  for (let y = 41; y <= geo.by; y += 1) {
    for (let x = 28; x <= 59; x += 1) {
      if (!geo.inFace(x, y)) continue;
      const lips = y >= geo.my - 1 && y <= geo.my + 1 && x >= 39 && x <= 48;
      const cheek = y < 44 && Math.abs(x - 43.5) < 9;
      if (lips || cheek) continue;
      if (y === 43 && Math.abs(x - 43.5) < 2) continue;
      k.tint(x, y, F[2], 0.2 + (vnoise(x, y, 2, 9) > 0 ? 0.1 : 0) + (hash(x, y, 4) < 0.16 ? 0.16 : 0));
    }
  }
}

function paintMustache(k, kind, F, geo) {
  const y0 = geo.my;
  if (kind === 'thin') {
    for (let x = 38; x <= 42; x += 1) k.put(x, y0 - 2, F[1]);
    for (let x = 45; x <= 49; x += 1) k.put(x, y0 - 2, F[1]);
    k.put(37, y0 - 1, F[1]);
    k.put(50, y0 - 1, F[1]);
    k.put(39, y0 - 3, F[2], 0.5);
    k.put(48, y0 - 3, F[2], 0.5);
    return;
  }
  const cy = y0 - 2.1;
  const test = (x, y) => {
    const dx = Math.abs(x + 0.5 - 44);
    const sag = y - cy - dx * 0.16;
    return dx <= 10.5 && sag >= -2.1 + (dx < 1.2 ? 1 : 0) && sag <= 1.9 - dx * 0.07 && dx * 0.2 + Math.abs(sag) * 0.6 < 2.6;
  };
  k.form(
    test,
    (x, y) => {
      const dx = x + 0.5 - 44;
      const strand = Math.sin((dx * 1.25 + (y - cy) * 0.9 * Math.sign(dx)) * 1.7) > 0.55 ? -1.4 : 0;
      return 4.6 - (y - cy) * 0.8 - (dx > 0 ? dx * 0.16 : -dx * 0.03) + strand;
    },
    F,
    { edge: 1, noise: 0.2, seed: 11 },
  );
  if (kind === 'handlebar') {
    for (const side of [-1, 1]) {
      const X = (u) => (side < 0 ? 44 - 11 - u : 43 + 11 + u);
      k.put(X(0), y0 - 1, F[2]);
      k.put(X(1), y0 - 2, F[3]);
      k.put(X(2), y0 - 3, F[4]);
      k.put(X(2), y0 - 4, F[3]);
      k.put(X(1), y0 - 5, F[2]);
      k.put(X(1), y0 - 1, F[1]);
      k.put(X(2), y0 - 2, F[1]);
    }
  }
}

function paintBeard(k, kind, F, geo, hasStache) {
  const my = geo.my;
  const long = kind === 'long';
  const bottom = geo.by + (long ? 15 : 4);
  const outer = (y) => {
    if (y <= geo.by - 2) return geo.half(y) + 1.6;
    const h0 = geo.half(geo.by - 2) + 1.6;
    const t = (y - (geo.by - 2)) / (bottom - (geo.by - 2));
    return long ? h0 + (2.2 - h0) * t ** 1.25 + Math.sin(y * 1.3) * 0.7 : h0 * Math.sqrt(Math.max(0, 1 - t * t * 0.86));
  };
  const test = (x, y) => {
    if (y < 33 || y > bottom) return false;
    const dx = Math.abs(x + 0.5 - 44);
    if (dx > outer(y)) return false;
    if (y < 37 && dx < geo.half(y) - 2.2) return false;
    const win = (dx / 10.6) ** 2 + ((y + 0.5 - (my - 5.6)) / 7.2) ** 2 <= 1;
    if (win && !(!hasStache && y >= my - 3 && y <= my - 2 && dx > 1 && dx < 7)) return false;
    return true;
  };
  k.form(
    test,
    (x, y) => {
      const dx = x + 0.5 - 44;
      const strand = Math.sin((dx + Math.sin(y * 0.8) * 1.3) * 1.9) > 0.5 ? -1.3 : 0;
      const depth = long && y > geo.by ? 0.6 : 0;
      return 4.7 - dx * 0.15 - Math.max(0, y - (geo.by - 4)) * (long ? 0.13 : 0.3) + strand + depth;
    },
    F,
    { edge: 1, noise: 0.3, seed: 13 },
  );
}

export function paintFacialHair(k, spec, geo) {
  const f = spec.facial;
  if (!f) return;
  const F = rampOf(f.color ?? '#2a1a12', 'hair');
  if (f.stubble) paintStubble(k, F, geo);
  if (f.beard) paintBeard(k, f.beard, F, geo, Boolean(f.mustache));
  if (f.mustache) paintMustache(k, f.mustache, F, geo);
}

/** Os óculos por cima de tudo: a armação no tom da ficha, com os cantos acesos e o reflexo. */
export function paintGlasses(k, spec, earX) {
  const gl = spec.glasses;
  if (!gl) return;
  const G = rampOf(gl.color ?? '#3a3a3a', gl.type === 'gold' || gl.type === 'monocle' ? 'metal' : 'cloth');
  const shine = mix(G[6], WHITE, 0.4);
  const lens = (x, y, a = 0.05) => k.tint(x, y, hex('#fff0e8'), a);
  if (gl.type === 'monocle') {
    const cx = 50.5;
    const cy = 33.5;
    for (let y = 28; y <= 39; y += 1) {
      for (let x = 45; x <= 56; x += 1) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= 5.6 && d > 4.5) k.put(x, y, G[x + y < cx + cy - 2 ? 6 : x + y > cx + cy + 3 ? 2 : 4]);
        else if (d <= 4.5) lens(x, y, 0.16);
      }
    }
    k.put(48, 30, WHITE);
    k.put(47, 31, WHITE, 0.7);
    for (let i = 0; i < 16; i += 1) k.put(56 + Math.round(Math.sin(i * 0.35) * 1.2) + Math.floor(i / 5), 36 + i, i % 2 ? G[5] : G[2]);
    return;
  }
  if (gl.type === 'round') {
    for (const cx of [36.5, 50.5]) {
      for (let y = 28; y <= 39; y += 1) {
        for (let x = Math.floor(cx - 6); x <= cx + 6; x += 1) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - 33.6);
          if (d <= 5.5 && d > 4.4) k.put(x, y, G[x + y < cx + 31 ? 5 : x + y > cx + 36 ? 2 : 4]);
          else if (d <= 4.4) lens(x, y);
        }
      }
      k.put(Math.round(cx - 3.5), 31, WHITE, 0.8);
    }
    for (let x = 42; x <= 45; x += 1) k.put(x, 32, G[x < 44 ? 5 : 3]);
    for (let x = earX + 2; x <= 30; x += 1) k.put(x, 32, G[3]);
    for (let x = 57; x <= mir(earX + 2); x += 1) k.put(x, 32, G[2]);
    return;
  }
  const thin = gl.type === 'gold';
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : mir(x));
    const y0 = 30;
    const y1 = 37;
    for (let x = 31; x <= 41; x += 1) {
      k.put(X(x), y0, x === 31 || x === 41 ? G[5] : G[side < 0 ? 4 : 3]);
      if (!thin) k.tint(X(x), y0 + 1, G[2], x === 31 || x === 41 ? 1 : 0);
    }
    for (let y = y0 + 1; y < y1; y += 1) {
      k.put(X(31), y, G[side < 0 ? 4 : 2]);
      k.put(X(41), y, G[side < 0 ? 3 : 4]);
    }
    for (let x = 32; x <= 40; x += 1) k.put(X(x), y1, G[thin ? 3 : 2]);
    if (thin) {
      k.put(X(31), y1 - 1, G[3]);
      k.put(X(41), y1 - 1, G[3]);
    }
    for (let y = y0 + 1; y < y1; y += 1) for (let x = 32; x <= 40; x += 1) lens(X(x), y, gl.type === 'dark' ? 0 : 0.04);
    if (gl.type === 'dark') for (let y = y0 + 1; y < y1; y += 1) for (let x = 32; x <= 40; x += 1) k.put(X(x), y, mix(G[0], INK, 0.3 + (x + y < 68 ? 0 : 0.3)));
    k.put(X(32), y1 - 1, mix(G[5], WHITE, 0.45));
    k.put(side < 0 ? 33 : 47, y0 + 1, shine, 0.55);
    // a haste até a orelha
    const ear = side < 0 ? earX + 2 : mir(earX + 2);
    k.put(X(30), y0 + 1, G[4]);
    for (let x = Math.min(X(30), ear); x <= Math.max(X(30), ear); x += 1) k.put(x, y0 + 2, G[side < 0 ? 3 : 2]);
  }
  for (let x = 42; x <= 45; x += 1) {
    k.put(x, 31, G[x < 44 ? 6 : 5]);
    k.put(x, 32, G[1]);
  }
}

/** Brincos: pérola (com o contorno escuro) ou argola de ouro, embaixo de cada orelha. */
export function paintEarrings(k, kind, earX, color) {
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? earX + 2 : mir(earX + 2) - 1;
    if (kind === 'pearl') {
      const o = hex('#51424f');
      for (const [dx, dy] of [
        [-1, 0],
        [-1, 1],
        [2, 0],
        [2, 1],
        [0, 2],
        [1, 2],
        [0, -1],
        [1, -1],
      ])
        k.put(x0 + dx, 42 + dy, o);
      k.put(side < 0 ? x0 + 1 : x0, 41, hex('#807083'));
      k.put(x0, 42, hex('#ffffff'));
      k.put(x0 + 1, 42, hex('#dfd5dc'));
      k.put(x0, 43, hex('#b9aab8'));
      k.put(x0 + 1, 43, hex('#807083'));
    } else {
      const G = rampOf(color ?? '#e6c34a', 'metal');
      for (const [dx, dy, t] of [
        [0, 0, 6],
        [1, 0, 5],
        [-1, 1, 6],
        [2, 1, 3],
        [-1, 2, 5],
        [2, 2, 2],
        [-1, 3, 4],
        [2, 3, 2],
        [0, 4, 3],
        [1, 4, 2],
      ])
        k.put(x0 + dx, 41 + dy, G[t]);
    }
  }
}

export { clamp };
