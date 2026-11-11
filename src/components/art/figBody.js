/**
 * Versão 2.17: o tronco e a roupa dos personagens novos (os ombros caem do pescoço até a borda
 * do desenho; as mangas são separadas do peito pela costura escura). Cada tipo de roupa tem o
 * seu decote, a sua gola e os seus detalhes (gravata, botões, renda, número, corrente...).
 */
import { ball, ell, hex, mix, poly, rampOf, tube } from './figKit.js';

const HALF = [17.5, 20.5, 22.5, 24.5, 26.5, 29.5, 32.5, 34, 35, 36, 36, 36, 37, 37, 37.5, 38.5, 38.5, 39, 39.5, 39.5, 40.5, 40.5, 40.5, 41.5, 41.5, 42, 42];
const BOTTOM = 83;

export function bodyOf(spec, geo) {
  const up = spec.broad ? 2 : 0;
  const add = spec.broad ? 2 : spec.fem ? -4 : spec.jaw === 'thin' ? -2.5 : 0;
  const half = (y) => {
    const i = y - 57 + up;
    if (i < -3) return 0;
    if (i < 0) return geo.neck + 2 + (i + 3) * 2.6;
    return Math.min(43.6, HALF[Math.min(i, HALF.length - 1)] + add);
  };
  const seam = 25.5 + add * 0.5;
  return { half, seam, top: 54 - up, inBody: (x, y) => y >= 54 - up && y <= BOTTOM && Math.abs(x + 0.5 - 44) <= half(y) };
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

/** O tom do tronco (cilindro largo) e das mangas (um cilindro de cada lado; a direita na sombra). */
const bodyTone = (b) => (x, y) => {
  const dx = x + 0.5 - 44;
  if (Math.abs(dx) > b.seam) {
    // a manga: bufante no ombro (a bola pega a luz em cima) e cilindro para baixo
    const h = b.half(y);
    const cx = dx < 0 ? 44 - (b.seam + h) / 2 : 44 + (b.seam + h) / 2;
    const puff = ball(cx, 73, (h - b.seam) / 2 + 3.5, 13, 0, 1)(x, y);
    return dx < 0 ? 2.2 + puff * 3.6 : 1.4 + puff * 2.9;
  }
  return tube(44 - b.seam - 4, 44 + b.seam + 7, 1.8, 5.2)(x) - (y < 60 ? 0 : 0.2);
};

function mirrored(k, pts, tone, R, opt = {}) {
  k.form(poly(pts.map(([x, y]) => [88 - x, y])), (x, y) => tone(x, y) - 1.3, R, { edge: 1, noise: 0.15, ...opt });
  k.form(poly(pts), tone, R, { edge: 1, noise: 0.15, ...opt });
}

/** A costura das mangas: o risco escuro do ombro para baixo. */
function seams(k, b, c) {
  let first = true;
  for (let y = 58; y <= BOTTOM; y += 1) {
    if (b.half(y) < b.seam + 3.5) continue;
    const xl = Math.round(44 - b.seam - 0.5);
    const xr = Math.round(43 + b.seam + 0.5);
    if (first) {
      // a costura entra curvando no ombro
      k.put(xl + 2, y - 2, c);
      k.put(xl + 1, y - 1, c);
      k.put(xr - 2, y - 2, c);
      k.put(xr - 1, y - 1, c);
      first = false;
    }
    k.put(xl, y, c);
    k.put(xr, y, c);
  }
}

const button = (k, x, y, R) => {
  k.put(x, y, R[6]);
  k.put(x + 1, y, R[4]);
  k.put(x, y + 1, R[4]);
  k.put(x + 1, y + 1, R[1]);
};

/** A corrente de ouro em U no peito (com o pingente, se `medal`). */
function chain(k, y0, yb, w, medal) {
  const G = rampOf('#e2b23a', 'metal');
  for (let i = -w; i <= w; i += 1) {
    const y = Math.round(yb - (Math.abs(i) / w) ** 1.7 * (yb - y0));
    const x = 44 + i - (i > 0 ? 1 : 0);
    k.put(x, y, G[(i + 40) % 2 ? 6 : 3]);
  }
  if (medal) {
    k.form(ell(44, yb + 4, 3.4, 3.4), ball(44, yb + 4, 3.4, 3.4, 2, 6.6), G, { edge: 1, noise: 0 });
    k.put(43, yb + 3, hex('#fff6d0'));
  } else {
    k.put(43, yb + 1, G[5]);
    k.put(44, yb + 1, G[2]);
  }
}

function pattern(k, mask, o) {
  if (!o.plaid && !(o.stripes && o.type === 'shirt')) return;
  const c = hex(o.plaid ?? o.stripes);
  for (let y = 52; y <= BOTTOM; y += 1) {
    for (let x = 0; x < 88; x += 1) {
      if (!mask.has(x, y)) continue;
      if (o.plaid) {
        const v = x % 7 === 2;
        const h = y % 7 === 3;
        if (v || h) k.put(x, y, c, v && h ? 0.75 : 0.42);
        else if (x % 7 === 3 || y % 7 === 4) k.put(x, y, c, 0.14);
      } else if (x % 4 === 1) k.put(x, y, c, 0.8);
    }
  }
}

/** A gola de camisa: duas folhas que descem do pescoço e se encontram no meio. */
function shirtCollar(k, R, geo, drop = 0) {
  const n = geo.neck;
  const y = geo.by + 2 + drop;
  mirrored(
    k,
    [
      [44 - n - 1, y],
      [43.8, y + 8.6],
      [40.4, y + 12.6],
      [44 - n - 6, y + 4.6],
    ],
    () => 5.2,
    R,
  );
}

/** Roupa (e o pescoço por baixo). Devolve onde termina o corpo. */
export function paintBody(k, spec, geo, S, paintNeck) {
  const o = spec.outfit ?? { type: 'shirt', color: '#5a5a5a' };
  const b = bodyOf(spec, geo);
  const R = rampOf(o.color ?? '#5a5a5a');
  const tone = bodyTone(b);
  const type = o.type;
  const n = geo.neck;
  const by = geo.by;
  const dxOf = (x) => x + 0.5 - 44;

  if (type === 'tank') {
    // o corpo é pele: ombros e braços de fora
    k.form(b.inBody, (x, y) => tone(x, y) - 0.4, S, { edge: 2, rim: 5, noise: 0.25, seed: 31 });
    paintNeck(64);
    seams(k, b, S[1]);
    for (let x = 30; x <= 38; x += 1) {
      k.put(x, 58 + Math.round((38 - x) * 0.12), S[3]);
      k.put(87 - x, 58 + Math.round((38 - x) * 0.12), S[2]);
    }
    const W = rampOf(o.shirt ?? o.color);
    k.form(
      (x, y) => {
        const ax = Math.abs(dxOf(x));
        if (!b.inBody(x, y)) return false;
        if ((dxOf(x) / 9.4) ** 2 + ((y + 0.5 - (by + 3)) / 10) ** 2 <= 1) return false;
        if (y < by + 9) return ax >= 8.6 && ax <= 13.6;
        return ax <= 13.6 + Math.min(4.4, (y - by - 9) * 0.55);
      },
      (x, y) => tube(22, 68, 2.6, 6.2)(x) + (Math.sin(x * 0.9 + y * 0.12) > 0.82 ? -1 : 0),
      W,
      { edge: 2, rim: 5, noise: 0.2, seed: 32 },
    );
    if (o.chain) chain(k, by + 3, by + 12, 7, false);
    return b;
  }

  const body = k.form(b.inBody, tone, R, { edge: 1, rim: 4, noise: type === 'cardigan' ? 0.75 : 0.3, seed: 33 });
  pattern(k, body, o);

  if (type === 'cardigan') {
    // as nervuras do tricô no peito
    for (let y = b.top; y <= BOTTOM; y += 1) {
      for (let x = 0; x < 88; x += 1) {
        if (!body.has(x, y) || Math.abs(dxOf(x)) >= b.seam) continue;
        const lit = tube(44 - b.seam - 4, 44 + b.seam + 7, 3, 6.2)(x);
        k.put(x, y, R[Math.round(x % 4 === 0 ? Math.max(1, lit - 3.2) : x % 4 === 3 ? lit - 1.2 : lit)]);
      }
    }
  }
  seams(k, b, R[0]);
  if (o.stripes && type === 'uniform') {
    const V = rampOf(o.stripes, 'metal');
    for (let x = 0; x < 88; x += 1) {
      for (let y = 70; y <= 72; y += 1) if (body.has(x, y)) k.put(x, y, V[y === 70 ? 6 : y === 71 ? 5 : 3]);
      const ax = Math.abs(dxOf(x));
      if (ax >= 12 && ax <= 14.5) for (let y = b.top; y < 70; y += 1) if (body.has(x, y)) k.put(x, y, V[dxOf(x) < 0 ? 5 : 3]);
    }
  }

  if (type === 'suit' || type === 'coat') {
    const coat = type === 'coat';
    const W = rampOf(o.shirt ?? '#f0f0f0');
    const A = rampOf(o.accent ?? o.color);
    const end = coat ? 73 : 77;
    const k0 = coat ? 0.36 : 0.42;
    const v = (y) => (end - y) * k0;
    paintNeck(57);
    k.form(
      (x, y) => y >= by + 1 && y <= end && Math.abs(dxOf(x)) <= v(y) && !(y < by + 5 && Math.abs(dxOf(x)) < n - 1.5 - (by + 5 - y) * 0.2 && y < by + 4 - Math.abs(dxOf(x)) * 0.5),
      (x) => 5.4 - (dxOf(x) > 1 ? 1.2 : 0),
      W,
      { edge: 2, noise: 0.12, seed: 34 },
    );
    // as lapelas
    const lw = (y) => (coat ? 7.6 - (y - 54) * 0.24 : y < 63 ? 5.6 : 5.2 - (y - 63) * 0.36);
    k.form(
      (x, y) => {
        const ax = Math.abs(dxOf(x));
        if (y < by + 1 || y > end || ax <= v(y) || ax > v(y) + lw(y)) return false;
        return !((y === 62 || y === 63) && ax > v(y) + (coat ? 4 : 2.6));
      },
      (x, y) => (dxOf(x) < 0 ? 5.2 : 3.6) - (y > 66 ? 0.4 : 0),
      A,
      { edge: 1, rim: 5, noise: 0.15, seed: 35 },
    );
    if (coat) {
      // a gola alta dos dois lados do pescoço e os botões
      mirrored(
        k,
        [
          [44 - n - 5, by - 2.5],
          [44 - n - 0.2, by - 0.6],
          [44 - n + 0.8, by + 6],
          [44 - n - 6.5, by + 7.5],
        ],
        () => 4.6,
        A,
      );
      for (const y of [76, 81]) {
        button(k, 37, y, A);
        button(k, 49, y, A);
      }
    } else {
      mirrored(
        k,
        [
          [44 - n - 0.5, by + 1.5],
          [43, by + 6.6],
          [40.4, by + 8.6],
          [44 - n - 2, by + 4.6],
        ],
        () => 5.8,
        W,
      );
      button(k, 43, 79, R);
      k.rect(54, 67, 5, 1, W[6]);
      k.rect(54, 68, 5, 1, W[3]);
    }
    if (o.tie) {
      const T = rampOf(o.tie);
      k.form(
        (x, y) => {
          const ax = Math.abs(dxOf(x));
          if (y >= by + 6 && y <= by + 9) return ax <= 2.7 - (y - by - 6) * 0.25;
          return y > by + 9 && y <= end - 1 && ax <= Math.min(1.7 + (y - by - 9) * 0.17, (end - y) * 0.9 + 0.4);
        },
        (x, y) => (dxOf(x) < 0 ? 5.4 : 3.4) + ((x + y) % 4 === 0 ? 1 : 0) - (y === by + 9 ? 1.6 : 0),
        T,
        { edge: 1, noise: 0.1 },
      );
    }
    if (o.bow) {
      const T = rampOf(o.bow);
      mirrored(
        k,
        [
          [43.4, by + 7.4],
          [36.6, by + 4.8],
          [36.6, by + 11.2],
          [43.4, by + 9],
        ],
        (x) => 5 - Math.abs(dxOf(x)) * 0.12,
        T,
      );
      k.form((x, y) => y >= by + 6 && y <= by + 9 && Math.abs(dxOf(x)) <= 1.6, (x) => (dxOf(x) < 0 ? 6 : 4), T, { edge: 1, noise: 0 });
    }
    if (o.chain) chain(k, by + 3, coat ? 66 : 68, 7, o.medal);
    if (o.scarf) {
      const C = rampOf(o.scarf);
      k.form(
        (x, y) => (y >= by - 1 && y <= by + 6 && Math.abs(dxOf(x)) <= n + 4.4 - Math.abs(y - by - 2.5) * 0.3) || (y > by + 5 && y <= 75 && x >= 46 && x <= 52 && !(y === 75 && x % 2)),
        (x, y) => (y <= by + 6 ? tube(44 - n - 5, 44 + n + 6, 2.2, 6.2)(x) + (Math.sin(x * 0.9 + y * 1.3) > 0.5 ? -1.2 : 0) : (x < 49 ? 5.2 : 3.6) + (y % 4 === 0 ? -1.2 : 0)),
        C,
        { edge: 1, rim: 5, noise: 0.2, seed: 36 },
      );
    }
    if (o.tears) {
      const P = rampOf(mix(hex(o.color), hex('#c8b898'), 0.5));
      k.form((x, y) => x >= 25 && x <= 31 && y >= 70 && y <= 76, 4.6, P, { edge: 1, noise: 0.3 });
      for (const [x, y] of [
        [24, 71],
        [24, 74],
        [32, 72],
        [32, 75],
        [27, 69],
        [30, 77],
      ])
        k.put(x, y, hex('#e8dcc0'));
      for (const [x, y] of [
        [60, 66],
        [61, 67],
        [60, 68],
        [61, 69],
        [62, 70],
      ])
        k.put(x, y, R[0]);
      k.form((x, y) => x >= 8 && x <= 12 && y >= 75 && y <= 79 && b.inBody(x, y), 5, P, { edge: 1, noise: 0.2 });
    }
    return b;
  }

  if (type === 'jersey') {
    const C = rampOf(o.collar ?? '#ffffff');
    paintNeck(62);
    const vy = (ax) => by + 10 - ax * 0.95;
    k.form(
      (x, y) => y >= by + 1 && Math.abs(dxOf(x)) <= n + 3 && y + 0.5 > vy(Math.abs(dxOf(x))) && y + 0.5 <= vy(Math.abs(dxOf(x))) + 2.6,
      (x) => (dxOf(x) < 0 ? 5.6 : 4),
      C,
      { edge: 2, noise: 0 },
    );
    for (let y = by + 2; y <= by + 14; y += 1) for (let x = 30; x <= 57; x += 1) if (body.has(x, y) && y + 0.5 > vy(Math.abs(dxOf(x))) + 2.6 && !k.has(x, y)) k.put(x, y, R[4]);
    // o filete do ombro e o número
    for (let x = 4; x < 84; x += 1) {
      const ax = Math.abs(dxOf(x));
      if (ax < n + 6) continue;
      for (let y = b.top; y < 76; y += 1) {
        if (!body.has(x, y)) continue;
        if (body.has(x, y + 3)) {
          k.put(x, y + 2, C[dxOf(x) < 0 ? 5 : 3]);
          k.put(x, y + 3, C[dxOf(x) < 0 ? 4 : 2]);
        }
        break;
      }
    }
    const digits = String(o.number ?? '').split('');
    const wAll = digits.length * 6 + (digits.length - 1) * 2;
    digits.forEach((d, i) => {
      const x0 = Math.round(44 - wAll / 2) + i * 8;
      (DIG[d] ?? []).forEach((row, j) => {
        for (let q = 0; q < 3; q += 1) {
          if (row[q] !== '1') continue;
          for (let a = 0; a < 2; a += 1) for (let c = 0; c < 2; c += 1) k.put(x0 + q * 2 + a + 1, 68 + j * 2 + c + 1, R[0]);
        }
      });
      (DIG[d] ?? []).forEach((row, j) => {
        for (let q = 0; q < 3; q += 1) {
          if (row[q] !== '1') continue;
          for (let a = 0; a < 2; a += 1) for (let c = 0; c < 2; c += 1) k.put(x0 + q * 2 + a, 68 + j * 2 + c, C[x0 + q * 2 + a < 44 ? 6 : 5]);
        }
      });
    });
    return b;
  }

  if (type === 'apron') {
    const A = rampOf(o.accent ?? '#f0f0f0');
    paintNeck(64);
    // o decote redondo e as bolinhas da blusa
    for (let y = by; y <= by + 12; y += 1) {
      for (let x = 28; x <= 59; x += 1) {
        const d = (dxOf(x) / (n + 4.6)) ** 2 + ((y + 0.5 - (by + 3)) / 8.6) ** 2;
        if (d > 1 && d <= 1.42 && body.has(x, y) && y > by + 3) k.put(x, y, R[dxOf(x) < 0 ? 6 : 4]);
      }
    }
    k.form(
      (x, y) => {
        const ax = Math.abs(dxOf(x));
        if (!body.has(x, y)) return false;
        if (y >= 65) return ax <= 12 + (y - 65) * 0.28;
        return ax >= 9 && ax <= 11.6 && (dxOf(x) / (n + 4.6)) ** 2 + ((y + 0.5 - (by + 3)) / 8.6) ** 2 > 1.42;
      },
      (x, y) => tube(26, 64, 2.6, 6.4)(x) - (y === 65 || y === 66 ? 1.2 : 0),
      A,
      { edge: 2, rim: 6, noise: 0.15, seed: 37 },
    );
    for (let x = 32; x <= 55; x += 1) if ((x + 1) % 4 < 2) k.put(x, 64, A[dxOf(x) < 0 ? 6 : 4]);
    for (let x = 37; x <= 50; x += 1) k.put(x, 76, A[2]);
    for (let y = 77; y <= BOTTOM; y += 1) {
      k.put(37, y, A[2]);
      k.put(50, y, A[2]);
    }
    return b;
  }

  if (type === 'jacket') {
    const W = rampOf(o.shirt ?? '#e8e0d0');
    const A = rampOf(o.accent ?? o.color);
    paintNeck(59);
    const open = (y) => 5.6 + Math.max(0, 63 - y) * 0.62;
    k.form(
      (x, y) => y >= by + 1 && Math.abs(dxOf(x)) <= open(y) && y + 0.5 > by + 5.6 - dxOf(x) ** 2 * 0.05 && body.has(x, y),
      (x, y) => 5.2 - (dxOf(x) > 1 ? 1.1 : 0) - (y === by + 6 ? 1 : 0),
      W,
      { edge: 2, noise: 0.15, seed: 38 },
    );
    mirrored(
      k,
      [
        [44 - n - 3, by + 0.5],
        [38.6, by + 8],
        [37.6, by + 15.5],
        [44 - n - 9, by + 9],
        [44 - n - 7, by + 3],
      ],
      () => 5,
      A,
    );
    const Z = rampOf('#a8b0b6', 'metal');
    for (let y = by + 15; y <= BOTTOM; y += 1) {
      k.put(37, y, Z[y % 2 ? 5 : 2]);
      k.put(50, y, Z[y % 2 ? 4 : 1]);
    }
    if (o.chain) chain(k, by + 3, by + 11, 6, false);
    return b;
  }

  if (type === 'robe') {
    const C = rampOf(o.collar ?? '#e6c34a');
    paintNeck(70);
    const v = (y) => (70 - y) * 0.6;
    // o peito no V e a barra da gola cruzada
    k.form((x, y) => y >= by + 1 && y <= 70 && Math.abs(dxOf(x)) <= Math.min(v(y), n + 3), (x, y) => 4.6 - dxOf(x) * 0.12 - (y < by + 5 ? 1.4 : 0), S, { edge: 2, noise: 0.2, seed: 39 });
    k.form(
      (x, y) => {
        const ax = Math.abs(dxOf(x));
        if (!body.has(x, y)) return false;
        if (y <= 70) return ax > Math.min(v(y), n + 3) && ax <= Math.min(v(y), n + 3) + 3.4;
        return Math.abs(dxOf(x) - (y - 70) * 0.5) <= 1.8;
      },
      (x) => (dxOf(x) < 0 ? 5.8 : 4),
      C,
      { edge: 1, rim: 6, noise: 0.1 },
    );
    if (o.boa) {
      const F = rampOf(o.boa, 'hair');
      for (const [cx, cy] of [
        [64.5, 59.5],
        [23.5, 59.5],
        [60, 62.5],
        [28, 62.5],
        [55, 65],
        [33, 65],
        [49.6, 66.6],
        [38.4, 66.6],
        [44, 67.4],
      ])
        k.form(ell(cx, cy, 4.3, 4), ball(cx, cy, 4.3, 4, cx > 44 ? 1.6 : 2.2, cx > 44 ? 5.4 : 6.5), F, { edge: 1, noise: 0.4, seed: 40, x0: Math.floor(cx - 6), x1: Math.ceil(cx + 6), y0: Math.floor(cy - 6), y1: Math.ceil(cy + 6) });
    }
    return b;
  }

  // camisa, uniforme e cardigã: a gola
  const C = rampOf(o.collar ?? o.color);
  if (type === 'cardigan' && o.jabot) {
    paintNeck(60);
    const Lc = rampOf('#f3e3de');
    const Rb = rampOf('#ad8e89');
    const Gd = rampOf('#d78d3a', 'metal');
    // a fita cinza por baixo da gola
    k.form((x, y) => y >= by + 8 && y <= by + 11 && Math.abs(dxOf(x)) <= 10, (x) => tube(33, 55, 1.6, 4.6)(x), Rb, { edge: 0, noise: 0.2 });
    // o jabô: a cascata de renda no peito
    const jh = (y) => {
      const t = y - (by + 11);
      return t < 0 ? 0 : t < 3 ? 6 + t * 0.7 : t < 5 ? 8 : 8 - (t - 4) * 0.5 - Math.max(0, t - 10) * 0.42;
    };
    k.form(
      (x, y) => y >= by + 11 && y <= by + 28 && Math.abs(dxOf(x)) <= Math.max(1.4, jh(y)) + (y % 3 === 0 ? 0.6 : 0),
      (x, y) => {
        const dx = dxOf(x);
        const fold = Math.sin((dx + Math.sin(y * 0.7) * 0.8) * 1.45) > 0.62 ? -2 : 0;
        return (dx < 0 ? 5.8 : 4.9) + fold - (y > by + 24 ? 0.5 : 0);
      },
      Lc,
      { edge: 2, rim: 6, noise: 0.25, seed: 41 },
    );
    // as duas folhas da gola de renda, com a beirada recortada
    for (const side of [1, -1]) {
      k.form(
        (x, y) => {
          const u = side < 0 ? x + 0.5 : 88 - (x + 0.5);
          const dy = y + 0.5 - by;
          if (dy < 1.2 || u > 43.9 || u < 30.4) return false;
          const top = 1.4 + (u < 37 ? (37 - u) * 0.95 : 0) + Math.max(0, u - 38) * 0.72;
          const bottom = 10.6 - Math.max(0, 35 - u) * 0.5 - Math.max(0, u - 41) * 0.5 + (Math.round(u) % 3 === 0 ? -1 : 0);
          return dy >= top && dy <= bottom;
        },
        (x, y) => (side < 0 ? 5.9 : 4.6) - ((x + y * 2) % 5 === 0 ? 1.6 : 0) - (y > by + 8 ? 0.6 : 0),
        Lc,
        { edge: 2, rim: 6, noise: 0.2, seed: 42 },
      );
    }
    // o broche dourado
    k.form((x, y) => x >= 42 && x <= 45 && y >= by + 9 && y <= by + 12, ball(44, by + 11, 2.4, 2.4, 2, 6.4), Gd, { edge: null, noise: 0 });
    for (const [x, y] of [
      [41, by + 10],
      [41, by + 11],
      [46, by + 10],
      [46, by + 11],
      [43, by + 8],
      [44, by + 8],
      [43, by + 13],
      [44, by + 13],
      [42, by + 9],
      [45, by + 9],
      [42, by + 12],
      [45, by + 12],
    ])
      k.put(x, y, Gd[0]);
    k.put(43, by + 10, hex('#fdf9f5'));
    // o botão de baixo
    k.form(ell(49, 79.5, 2.3, 2), ball(49, 79.5, 2.3, 2, 2, 6.6), Gd, { edge: 0, noise: 0 });
    return b;
  }

  const deep = type === 'cardigan';
  paintNeck(deep ? 66 : 61);
  if (deep) {
    // o decote em V do cardigã, com a camisa por baixo e os botões
    const v = (y) => (72 - y) * 0.48;
    k.form((x, y) => y >= by + 2 && y <= 72 && Math.abs(dxOf(x)) <= v(y) && y + 0.5 > by + 9 - Math.abs(dxOf(x)) * 0.9, (x) => 5.4 - (dxOf(x) > 1 ? 1.1 : 0), C, { edge: 2, noise: 0.15 });
    k.form(
      (x, y) => y >= by + 1 && y <= 72 && Math.abs(dxOf(x)) > v(y) && Math.abs(dxOf(x)) <= v(y) + 2.6 && body.has(x, y),
      (x) => (dxOf(x) < 0 ? 5.2 : 3.4),
      R,
      { edge: 1, noise: 0.1 },
    );
    for (const y of [73, 78]) button(k, 43, y, rampOf(mix(hex(o.color), hex('#3a2a10'), 0.5)));
    if (o.pearls) for (let i = -7; i <= 7; i += 1) k.put(44 + i - (i > 0 ? 1 : 0), Math.round(by + 10 - (Math.abs(i) / 7) ** 1.8 * 6), hex(i % 2 ? '#ffffff' : '#b9aab8'));
  } else {
    // o V aberto da camisa (a pele) e a carcela com os botões
    for (let y = 62; y <= BOTTOM; y += 1) {
      k.put(45, y, R[1]);
      k.put(42, y, R[5], 0.6);
    }
    const A = rampOf(o.accent ?? mix(hex(o.color), hex('#ffffff'), 0.6));
    for (const y of [67, 74, 81]) button(k, 43, y, A);
    if (o.chain) chain(k, by + 3, by + 10, 5, false);
  }
  shirtCollar(k, C, geo, deep ? 0 : 0);
  if (type === 'uniform') {
    // o bolso com a tampa e as ombreiras
    for (let x = 51; x <= 59; x += 1) {
      k.put(x, 67, R[1]);
      k.put(x, 69, R[2]);
    }
    for (let y = 67; y <= 75; y += 1) {
      k.put(51, y, R[1]);
      k.put(59, y, R[1]);
    }
    for (let x = 51; x <= 59; x += 1) k.put(x, 75, R[1]);
    k.put(55, 70, R[6]);
    for (const side of [-1, 1]) {
      const X = (u) => (side < 0 ? u : 87 - u);
      for (let u = 22; u <= 30; u += 1) {
        const y = 59 + Math.round((30 - u) * 0.36);
        k.put(X(u), y, R[side < 0 ? 6 : 4]);
        k.put(X(u), y + 1, R[1]);
      }
    }
    if (o.patch) {
      const Pt = rampOf(o.patch);
      k.form((x, y) => x >= 28 && x <= 34 && y >= 67 && y <= 72, (x, y) => (y < 69 ? 6 : 4), Pt, { edge: 1, noise: 0 });
    }
  }
  if (o.badge) {
    const G = rampOf(type === 'uniform' ? '#e6c34a' : '#e8e8e8', 'metal');
    const bx = type === 'uniform' ? 30.5 : 55;
    k.form(
      (x, y) => y >= 64 && y <= 71 && Math.abs(x + 0.5 - bx) <= (y < 69 ? 3.2 : 3.2 - (y - 68) * 1.05),
      (x, y) => (x + 0.5 < bx ? 6 : 4) - (y > 68 ? 1 : 0),
      G,
      { edge: 1, noise: 0 },
    );
    k.put(Math.round(bx - 1.5), 66, hex('#fff6d0'));
  }
  return b;
}
