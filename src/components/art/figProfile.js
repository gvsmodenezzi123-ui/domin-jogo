/**
 * Versão 2.18: os personagens DE LADO (perfil), para quem senta nas laterais da roda de 4. A
 * mesma ficha (art/portraitSpecs.js) e os mesmos materiais da figura de frente (figKit.js:
 * rampas de sete tons, formas com borda escura, contorno de tinta), no mesmo quadro de 88×84.
 * O desenho olha para a DIREITA; quem senta à direita da mesa usa o espelho (`facing: 'left'`).
 *
 * As medidas (olhando para a direita): o crânio em (40, 29), a frente do rosto na coluna 54–58
 * (a ponta do nariz na 58), a orelha em (38, 35), o pescoço de 31 a 46 e o tronco de perfil do
 * ombro (linha 55) até o pé do quadro, com o braço caído na frente dele.
 */
import { any, ball, board, box, ell, hash, hex, mix, poly, rampOf, tube } from './figKit.js';
import { INK } from './figHead.js';

const W = 88;
const H = 84;
const WHITE = hex('#fbf8f6');
const MOUTH_DARK = hex('#3a0c12');
const TOOTH = hex('#f6efe2');

/** A frente do rosto (a coluna mais à direita da pele) em cada linha, do alto da testa ao queixo. */
const FRONT = {
  15: 47, 16: 49, 17: 51, 18: 52, 19: 53, 20: 53, 21: 54, 22: 54, 23: 54, 24: 54, 25: 54, 26: 55, 27: 55, 28: 55,
  29: 56, 30: 55, 31: 54, 32: 54, 33: 55, 34: 55, 35: 56, 36: 56, 37: 57, 38: 58, 39: 58, 40: 57, 41: 56, 42: 55,
  43: 56, 44: 56, 45: 55, 46: 56, 47: 55, 48: 54, 49: 55, 50: 55, 51: 54, 52: 52,
};

const CHIN = { round: 0, square: 1, heavy: 1, long: 2, thin: 1 };

/** A geometria do perfil de `spec`: a frente do rosto, a linha do queixo e o teste da cabeça. */
function profileGeo(spec) {
  const drop = spec.fem ? 0 : (CHIN[spec.jaw] ?? 0);
  const nose = spec.nose ?? 'plain';
  const front = (y) => {
    let f = FRONT[y];
    if (y > 44 && drop) f = FRONT[Math.max(45, y - drop)] ?? FRONT[52];
    if (f == null) return -1;
    if (nose === 'big' && y >= 35 && y <= 41) f += y >= 37 && y <= 40 ? 2 : 1;
    if (nose === 'hook') {
      if (y >= 32 && y <= 36) f += 1;
      if (y === 41) f += 1;
    }
    if (spec.jaw === 'thin' && !spec.fem && (y < 33 || y > 42)) f -= 1;
    if (spec.fem) {
      if (y >= 36 && y <= 40 && nose !== 'hook') f -= 1;
      if (y >= 47) f -= 1;
      if (y === 29) f -= 1;
    }
    if (spec.jaw === 'heavy' && y >= 46) f += 1;
    return f;
  };
  const chinY = 52 + drop;
  // a mandíbula: desce da orelha, faz a quina e segue quase reta até o queixo
  const jaw = (x) => (x < 36 ? 43 : x < 42 ? 45 + ((x - 36) * (chinY - 46)) / 6 : chinY - (x < 46 ? 1 : 0));
  const skull = ell(40, 29, 15.2, 17);
  const inFace = (x, y) => y >= 15 && y <= chinY && x >= 34 && x <= front(y) && y <= jaw(x);
  const inHead = (x, y) => (skull(x, y) && y <= 41) || inFace(x, y);
  const my = 45 + (drop > 1 ? 1 : 0);
  return { front, jaw, chinY, inFace, inHead, my, neck: spec.broad ? 1.5 : spec.fem ? -1.5 : 0 };
}

// --- o tronco ------------------------------------------------------------------------------

/**
 * O tronco em três quartos (como no desenho de referência): os dois ombros aparecem, o peito
 * vira para a direita. A costura da manga de cá fica na coluna 21 e a de lá na 61; a linha do
 * meio do peito (botões, gravata, renda) desce inclinada perto da coluna 49.
 */
function bodyGeo(spec) {
  const add = spec.broad ? 3 : spec.fem ? -4 : spec.jaw === 'thin' ? -2 : 0;
  const half = 37 + add;
  const top = (x) => 55.5 + (Math.abs(x + 0.5 - 40) / half) ** 2.2 * 15;
  const inBody = (x, y) => y <= 83 && Math.abs(x + 0.5 - 40) <= half && y >= top(x);
  const seamL = 21 - add * 0.5;
  const seamR = 61 + add * 0.5;
  const mid = (y) => 48 + (y - 54) * 0.16;
  return { top, inBody, seamL, seamR, mid, add };
}

function paintNeck(k, S, g) {
  k.form(
    poly([
      [31.5 - g.neck, 39],
      [44, 44],
      [47 + g.neck * 0.5, 60],
      [30 - g.neck, 60],
    ]),
    (x, y) => 2.4 + ((x - 30) / 16) * 1.6 - (y < 50 ? 0.7 : 0),
    S,
    { edge: 1, noise: 0.2, seed: 5 },
  );
}

function pattern(k, has, o) {
  if (!o.plaid && !(o.stripes && o.type === 'shirt')) return;
  const c = hex(o.plaid ?? o.stripes);
  for (let y = 52; y <= 83; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!has(x, y)) continue;
      if (o.plaid) {
        const v = x % 7 === 2;
        const h = y % 7 === 3;
        if (v || h) k.put(x, y, c, v && h ? 0.75 : 0.42);
        else if (x % 7 === 3 || y % 7 === 4) k.put(x, y, c, 0.14);
      } else if (x % 4 === 1) k.put(x, y, c, 0.8);
    }
  }
}

const button = (k, x, y, R) => {
  k.put(x, y, R[6]);
  k.put(x + 1, y, R[4]);
  k.put(x, y + 1, R[4]);
  k.put(x + 1, y + 1, R[1]);
};

function paintBody(k, spec, S, g) {
  const o = spec.outfit ?? { type: 'shirt', color: '#5a5a5a' };
  const b = bodyGeo(spec);
  const R = rampOf(o.color ?? '#5a5a5a');
  const type = o.type;
  const skinArms = type === 'tank';
  const M = (y) => Math.round(b.mid(y));
  const tone = (x, y) => {
    if (x < b.seamL) return ball((b.seamL + 3) / 2, 74, b.seamL / 2 + 6, 15, 1.6, 6.3)(x, y); // a manga de cá
    if (x > b.seamR) return ball((b.seamR + 80) / 2, 74, (80 - b.seamR) / 2 + 5, 15, 1, 4.6)(x, y); // a de lá, na sombra
    return tube(b.seamL - 6, b.seamR + 8, 1.8, 5.4)(x) - (y < 60 ? 0 : 0.2);
  };
  paintNeck(k, S, g);
  const body = k.form(b.inBody, tone, skinArms ? S : R, { edge: 1, rim: 4, noise: type === 'cardigan' ? 0.7 : 0.3, seed: 33 });
  if (type === 'cardigan') {
    for (let y = 55; y <= 83; y += 1) for (let x = Math.ceil(b.seamL) + 1; x < b.seamR; x += 1) if (body.has(x, y) && x % 4 === 0) k.put(x, y, R[Math.max(1, Math.round(tone(x, y) - 2.6))]);
  }
  if (!skinArms) pattern(k, body.has, o);
  // as costuras das mangas
  const seamC = skinArms ? S[1] : R[0];
  for (let y = 58; y <= 83; y += 1) {
    if (body.has(Math.round(b.seamL), y) && y >= b.top(b.seamL) + 3) k.put(Math.round(b.seamL), y, seamC);
    if (body.has(Math.round(b.seamR), y) && y >= b.top(b.seamR) + 3) k.put(Math.round(b.seamR), y, seamC);
  }
  if (skinArms) {
    const Wt = rampOf(o.shirt ?? o.color);
    k.form((x, y) => body.has(x, y) && x > b.seamL + 4 && x < b.seamR - 3 && !(y < 66 && Math.abs(x - M(y) + 3) < 8 - (y - 56) * 0.6) && (y > 62 || x < 36 || x > 55), (x) => tube(b.seamL, b.seamR + 6, 2.6, 6.2)(x), Wt, { edge: 2, rim: 5, noise: 0.2, seed: 32 });
    if (o.chain) for (let i = -6; i <= 6; i += 1) k.put(M(60) - 3 + i, Math.round(64 - (Math.abs(i) / 6) ** 1.7 * 7), hex(i % 2 ? '#fae167' : '#bf7f12'));
    return;
  }
  if (o.stripes && type === 'uniform') {
    const V = rampOf(o.stripes, 'metal');
    for (let x = 0; x < W; x += 1) for (let y = 71; y <= 73; y += 1) if (body.has(x, y)) k.put(x, y, V[y === 71 ? 6 : y === 72 ? 5 : 3]);
  }
  if (type === 'suit' || type === 'coat') {
    const coat = type === 'coat';
    const A = rampOf(o.accent ?? o.color);
    const Wt = rampOf(o.shirt ?? '#f0f0f0');
    const end = coat ? 72 : 77;
    const v = (y) => (end - y) * 0.36;
    k.form((x, y) => y >= 53 && y <= end && Math.abs(x + 0.5 - b.mid(y)) <= v(y) && body.has(x, y), (x, y) => 5.4 - (x > b.mid(y) ? 1.2 : 0), Wt, { edge: 2, noise: 0.12, seed: 34 });
    k.form(
      (x, y) => {
        const ax = Math.abs(x + 0.5 - b.mid(y));
        return y >= 54 && y <= end && ax > v(y) && ax <= v(y) + (coat ? 6 : 4.6) - (y - 54) * 0.12 && body.has(x, y);
      },
      (x, y) => (x < b.mid(y) ? 5.2 : 3.8),
      A,
      { edge: 1, rim: 5, noise: 0.15, seed: 35 },
    );
    if (o.tie) {
      const T = rampOf(o.tie);
      k.form((x, y) => y >= 56 && y <= end - 1 && Math.abs(x + 0.5 - b.mid(y)) <= Math.min(1.6 + (y - 58) * 0.12, (end - y) * 0.8 + 0.4), (x, y) => (x < b.mid(y) ? 5.4 : 3.4) - (y === 59 ? 1.5 : 0), T, { edge: 1, noise: 0.1 });
    }
    if (o.bow) {
      const T = rampOf(o.bow);
      k.form((x, y) => y >= 55 && y <= 59 && Math.abs(x + 0.5 - b.mid(57)) <= 5 && Math.abs(y - 57) <= 0.6 + Math.abs(x + 0.5 - b.mid(57)) * 0.42, (x) => 5 - Math.abs(x - b.mid(57)) * 0.2, T, { edge: 1, noise: 0 });
    }
    if (coat) {
      k.form(poly([[29, 49], [41, 51.5], [45, 58], [30, 58]]), 4.4, A, { edge: 1, rim: 6, noise: 0.15 });
      for (const y of [75, 80]) {
        button(k, M(y) - 5, y, A);
        button(k, M(y) + 4, y, A);
      }
    } else button(k, M(79), 79, R);
  } else if (type === 'jacket') {
    const A = rampOf(o.accent ?? o.color);
    const Wt = rampOf(o.shirt ?? '#e8e0d0');
    k.form((x, y) => y >= 53 && Math.abs(x + 0.5 - b.mid(y)) <= 4.6 + Math.max(0, 62 - y) * 0.5 && body.has(x, y), (x, y) => 5 - (x > b.mid(y) ? 1.1 : 0), Wt, { edge: 2, noise: 0.15, seed: 38 });
    k.form(poly([[29, 49], [42, 51.5], [46, 58], [38, 62], [30, 58]]), 4.8, A, { edge: 1, rim: 6, noise: 0.15 });
    k.form(poly([[52, 54], [57, 55.5], [58, 63], [53, 60]]), 3.6, A, { edge: 1, noise: 0.15 });
    const Z = rampOf('#a8b0b6', 'metal');
    for (let y = 62; y <= 83; y += 1) {
      k.put(M(y) - 5, y, Z[y % 2 ? 5 : 2]);
      k.put(M(y) + 5, y, Z[y % 2 ? 4 : 1]);
    }
  } else if (type === 'apron') {
    const A = rampOf(o.accent ?? '#f0f0f0');
    k.form((x, y) => body.has(x, y) && ((y >= 65 && Math.abs(x + 0.5 - b.mid(y)) <= 11 + (y - 65) * 0.25) || (y < 65 && y >= 56 && Math.abs(Math.abs(x + 0.5 - b.mid(y)) - 9) <= 1.3)), (x, y) => tube(30, 68, 2.6, 6.4)(x) - (y === 65 ? 1.2 : 0), A, { edge: 2, rim: 6, noise: 0.15, seed: 37 });
  } else if (type === 'robe') {
    const C = rampOf(o.collar ?? '#e6c34a');
    const v = (y) => Math.min((70 - y) * 0.55, 9);
    k.form((x, y) => y >= 53 && y <= 70 && Math.abs(x + 0.5 - b.mid(y)) <= v(y) && body.has(x, y), (x, y) => 4.6 - (x - b.mid(y)) * 0.12 - (y < 57 ? 1.2 : 0), S, { edge: 2, noise: 0.2, seed: 39 });
    k.form(
      (x, y) => {
        const ax = Math.abs(x + 0.5 - b.mid(y));
        if (!body.has(x, y)) return false;
        if (y <= 70) return ax > v(y) && ax <= v(y) + 3;
        return Math.abs(x + 0.5 - b.mid(y) - (y - 70) * 0.5) <= 1.7;
      },
      (x, y) => (x < b.mid(y) ? 5.8 : 4),
      C,
      { edge: 1, rim: 6, noise: 0.1 },
    );
    if (o.boa) {
      const F = rampOf(o.boa, 'hair');
      for (const [cx, cy] of [[66, 61], [26, 58], [61, 63.5], [31, 60.5], [56, 66], [37, 63.5], [50, 67.5], [43, 66]]) k.form(ell(cx, cy, 4.2, 3.8), ball(cx, cy, 4.2, 3.8, cx > 48 ? 1.6 : 2.2, cx > 48 ? 5.4 : 6.5), F, { edge: 1, noise: 0.4, seed: 40, x0: cx - 6, x1: cx + 6, y0: cy - 6, y1: cy + 6 });
    }
  } else if (type === 'jersey') {
    const C = rampOf(o.collar ?? '#ffffff');
    k.form((x, y) => y >= 53 && y <= 64 && Math.abs(Math.abs(x + 0.5 - b.mid(y)) * 0.95 + (y - 54) - 9) <= 1.3 && body.has(x, y), (x, y) => (x < b.mid(y) ? 5.6 : 4), C, { edge: 2, noise: 0 });
    for (let x = 4; x < 80; x += 1) {
      if (x > b.seamL - 2 && x < b.seamR + 2) continue;
      const y = Math.ceil(b.top(x)) + 2;
      if (body.has(x, y + 1)) {
        k.put(x, y, C[x < 40 ? 5 : 3]);
        k.put(x, y + 1, C[x < 40 ? 4 : 2]);
      }
    }
  } else {
    // camisa, uniforme e cardigã: a gola e a carcela com os botões
    const C = rampOf(o.collar ?? o.color);
    if (type === 'cardigan' && o.jabot) {
      const L = rampOf('#f3e3de');
      k.form(poly([[31, 49.5], [43, 51.5], [52, 55], [57, 58], [55, 62], [47, 60], [38, 57], [31, 55]]), (x, y) => (x < 46 ? 5.8 : 4.8) - ((x + y * 2) % 5 === 0 ? 1.5 : 0), L, { edge: 2, rim: 6, noise: 0.2, seed: 42 });
      k.form(
        (x, y) => y >= 59 && y <= 78 && Math.abs(x + 0.5 - b.mid(y) - 1) <= Math.max(1.2, 7 - Math.abs(y - 64) * 0.45) + (y % 3 === 0 ? 0.6 : 0),
        (x, y) => (x < b.mid(y) ? 5.8 : 4.9) + (Math.sin((x + Math.sin(y * 0.7) * 0.8) * 1.45) > 0.62 ? -2 : 0),
        L,
        { edge: 2, rim: 6, noise: 0.25, seed: 41 },
      );
      const G = rampOf('#d78d3a', 'metal');
      k.form(ell(b.mid(60) + 0.5, 60, 2.3, 2.3), ball(b.mid(60) + 0.5, 60, 2.3, 2.3, 2, 6.4), G, { edge: 0, noise: 0 });
      k.put(M(60) - 1, 59, hex('#fdf9f5'));
      k.form(ell(M(79) + 3, 79.5, 2, 1.8), ball(M(79) + 3, 79.5, 2, 1.8, 2, 6.6), G, { edge: 0, noise: 0 });
    } else {
      for (let y = 62; y <= 83; y += 1) {
        k.put(M(y) + 1, y, R[1]);
        k.put(M(y) - 2, y, R[5], 0.6);
      }
      const A = rampOf(o.accent ?? mix(hex(o.color), hex('#ffffff'), 0.6));
      for (const y of [67, 74, 81]) button(k, M(y) - 1, y, A);
      k.form(poly([[30, 49.5], [43, 51.5], [47.5, 61], [42, 63.5], [31, 56]]), (x) => 5.2 - (x < 34 ? 1 : 0), C, { edge: 1, rim: 6, noise: 0.15 });
      k.form(poly([[45.5, 52.5], [50, 54], [55, 58], [53.5, 63], [48.5, 61]]), 4, C, { edge: 1, noise: 0.15 });
    }
    if (o.pearls) for (let i = -6; i <= 6; i += 1) k.put(M(58) + i, Math.round(63 - (Math.abs(i) / 6) ** 1.8 * 6), hex(i % 2 ? '#ffffff' : '#b9aab8'));
    if (type === 'uniform') {
      for (let u = 0; u <= 8; u += 1) {
        k.put(12 + u, Math.round(b.top(12 + u)) + 2, R[6]);
        k.put(12 + u, Math.round(b.top(12 + u)) + 3, R[1]);
      }
      if (o.patch) k.form(box(8, 68, 14, 73), (x, y) => (y < 70 ? 6 : 4), rampOf(o.patch), { edge: 1, noise: 0 });
      for (let x = M(68) + 5; x <= M(68) + 12; x += 1) {
        k.put(x, 67, R[1]);
        k.put(x, 75, R[1]);
      }
    }
  }
  if (o.chain) {
    const yb = type === 'suit' || type === 'coat' ? 67 : 63;
    for (let i = -6; i <= 6; i += 1) k.put(M(60) + i, Math.round(yb - (Math.abs(i) / 6) ** 1.7 * (yb - 55)), hex(i % 2 ? '#fae167' : '#bf7f12'));
    if (o.medal) {
      const G = rampOf('#e2b23a', 'metal');
      k.form(ell(M(60) + 0.5, yb + 3.5, 3, 3), ball(M(60) + 0.5, yb + 3.5, 3, 3, 2, 6.6), G, { edge: 1, noise: 0 });
    }
  }
  if (o.badge) {
    const G = rampOf(type === 'uniform' ? '#e6c34a' : '#e8e8e8', 'metal');
    const bx = type === 'uniform' ? 31.5 : M(66) + 9;
    k.form((x, y) => y >= 64 && y <= 71 && Math.abs(x + 0.5 - bx) <= (y < 69 ? 3 : 3 - (y - 68) * 1.05), (x, y) => (x + 0.5 < bx ? 6 : 4) - (y > 68 ? 1 : 0), G, { edge: 1, noise: 0 });
  }
  if (o.scarf) {
    const C = rampOf(o.scarf);
    k.form((x, y) => (y >= 48 && y <= 56 && x >= 29 && x <= 50 - (y - 48) * 0.2) || (y > 55 && y <= 74 && x >= 46 && x <= 51 && !(y === 74 && x % 2)), (x, y) => 4.8 + (Math.sin(x * 0.9 + y * 1.3) > 0.5 ? -1.2 : 0) - (x > 48 ? 0.8 : 0), C, { edge: 1, rim: 5, noise: 0.2 });
  }
  if (o.tears) {
    const P = rampOf(mix(hex(o.color), hex('#c8b898'), 0.5));
    k.form(box(26, 70, 32, 76), 4.6, P, { edge: 1, noise: 0.3 });
    k.form(box(8, 74, 12, 78), 5, P, { edge: 1, noise: 0.2 });
  }
}

// --- a cabeça ------------------------------------------------------------------------------

const EAR = ['.20545 .', '10565550', '05401154', '05412205', '05424015', '.5433205', '.4433005', '.252320.', '.0451220', '..02353.'];

/** A orelha de perfil (linhas 30–39), por cima do cabelo curto. */
function paintEar(k, spec, S) {
  if (['curly', 'bob'].includes(spec.hair?.style) || spec.hat?.type === 'hood') return;
  EAR.forEach((row, j) => {
    for (let i = 0; i < row.length; i += 1) if (row[i] !== '.' && row[i] !== ' ') k.put(30 + i, 30 + j, S[Number(row[i])]);
  });
}

function paintHead(k, spec, S, g, hairColor) {
  const dark = spec.shade ?? 0;
  k.form(
    g.inHead,
    (x, y) => {
      let t = 5.1 - dark;
      if (x < 42) t -= (42 - x) * 0.13;
      if (y > 44) t -= (y - 44) * 0.14;
      if (y >= 33 && y <= 38 && x >= 45 && x <= 51) t += 0.35; // a maçã do rosto
      if (y === 29 && x >= 46 && x <= 53) t -= 0.5; // a órbita
      if (y >= 41 && y <= 43 && x >= g.front(y) - 2) t -= 0.7; // embaixo do nariz
      if (y >= g.chinY - 1) t -= 0.8;
      if (y <= 22 && x >= 44) t += 0.3; // a testa
      return t;
    },
    S,
    { edge: 1, noise: 0.28, seed: spec.seed ?? 1 },
  );
  // a luz na ponta do nariz e a narina
  const tip = spec.nose === 'big' ? 39 : 38;
  k.put(g.front(tip) - 1, tip, S[6]);
  k.put(g.front(tip) - 1, tip - 1, S[6]);
  k.put(g.front(41) - 1, 41, S[0]);
  k.put(g.front(41) - 2, 41, S[1]);
  k.put(g.front(40) - 3, 40, S[2]);
  // a dobra do nariz até o canto da boca
  k.put(g.front(42) - 4, 42, S[2]);
  k.put(g.front(43) - 5, 43, S[3]);
  if (spec.wrinkles) {
    for (const [x, y] of [
      [47, 22],
      [48, 22],
      [49, 22],
      [46, 24],
      [47, 24],
      [48, 24],
      [51, 34],
      [50, 35],
      [47, 44],
      [48, 46],
    ])
      k.put(x, y, S[3]);
  }
  if (spec.blush) {
    const c = hex(spec.blush);
    for (let y = 37; y <= 40; y += 1) for (let x = 45; x <= 50; x += 1) if (((x - 47.5) / 3) ** 2 + ((y - 38.5) / 1.8) ** 2 <= 1) k.tint(x, y, c, 0.3);
  }
  if (spec.scar) for (let i = 0; i < 6; i += 1) k.put(45 + i * 0.5, 34 + i, mix(S[1], hex('#a03a3a'), 0.4));
  // a sobrancelha
  const brow = hairColor ? rampOf(hairColor, 'hair')[1] : S[0];
  const lift = spec.__mood === 'thinking' ? -1 : 0;
  const angry = spec.browShape === 'angry' || spec.__mood === 'hurt';
  for (let x = 46; x <= 53; x += 1) {
    let y = 28 + lift + (angry && x >= 51 ? 1 : 0) + (spec.browShape === 'sad' && x >= 51 ? -1 : 0);
    if (spec.fem) y = 27 + lift + (x <= 47 || x >= 53 ? 1 : 0);
    else if (x === 46) y += 1;
    k.put(x, y, brow);
    if (spec.thickBrows && !spec.fem) k.put(x, y + 1, brow);
  }
}

function paintEye(k, spec, mood, S) {
  const ir = rampOf(spec.iris ?? '#6a3a22');
  const P = (x, y, c) => k.put(x, y, c);
  if (spec.redEyes) {
    if (mood === 'blink') {
      for (let x = 48; x <= 52; x += 1) P(x, 32, S[0]);
      return;
    }
    const red = hex('#ff2a1a');
    for (let x = 45; x <= 54; x += 1) for (let y = 29; y <= 35; y += 1) if (((x - 50) / 4.6) ** 2 + ((y - 32) / 2.8) ** 2 <= 1) k.tint(x, y, red, 0.3);
    for (let x = 48; x <= 52; x += 1) P(x, 32, red);
    for (let x = 49; x <= 51; x += 1) P(x, 31, mood === 'smug' ? hex('#a0140c') : red);
    P(50, 32, hex('#ffb070'));
    P(51, 32, hex('#fff0d0'));
    return;
  }
  if (spec.eyesGlow) {
    const g = hex(spec.eyesGlow);
    for (let x = 48; x <= 52; x += 1) P(x, 32, mood === 'blink' ? S[0] : g);
    return;
  }
  if (mood === 'blink') {
    for (let x = 47; x <= 52; x += 1) P(x, 32, x === 47 ? S[1] : INK);
    P(53, 31, INK);
    P(50, 33, S[3]);
    return;
  }
  if (mood === 'hurt') {
    for (const [x, y] of [[47, 30], [48, 31], [49, 31], [50, 32], [51, 32], [52, 32], [49, 33], [48, 34], [47, 34]]) P(x, y, INK);
    // o suor
    k.put(46, 20, hex('#bfe6ff'));
    k.put(46, 21, hex('#8ac8f0'));
    k.put(46, 22, hex('#5aa0d8'));
    return;
  }
  const half = mood === 'smug' || spec.eyes === 'sleepy' || spec.eyes === 'narrow';
  const deep = mix(ir[0], INK, 0.5);
  const look = mood === 'thinking';
  if (half) {
    for (let x = 47; x <= 52; x += 1) P(x, 30, S[3]);
    for (let x = 47; x <= 53; x += 1) P(x, 31, INK);
    P(48, 32, S[1]);
    P(49, 32, WHITE);
    P(50, 32, deep);
    P(51, 32, INK);
    P(52, 32, ir[3]);
    P(50, 33, S[2]);
    P(51, 33, S[2]);
    return;
  }
  // os cílios em cima, o branco atrás, a íris e a pupila na frente (o olho olha para a mesa)
  for (let x = 47; x <= 52; x += 1) P(x, 30, INK);
  P(53, 31, INK);
  if (spec.eyes === 'lashes' || spec.fem) {
    P(46, 30, INK);
    P(45, 29, INK);
    P(53, 30, INK);
    if (spec.lip) for (let x = 47; x <= 52; x += 1) k.put(x, 29, mix(S[3], hex(spec.lip), 0.45), 0.7);
  }
  P(48, 31, INK);
  P(49, 31, hex('#c9b6b6'));
  P(50, 31, look ? ir[4] : WHITE);
  P(51, 31, look ? INK : ir[4]);
  P(52, 31, ir[3]);
  P(47, 32, INK);
  P(48, 32, S[1]);
  P(49, 32, WHITE);
  P(50, 32, look ? WHITE : deep);
  P(51, 32, look ? hex('#ddcbc6') : INK);
  P(52, 32, look ? S[4] : ir[4]);
  P(49, 33, hex('#ddcbc6'));
  P(50, 33, look ? hex('#ddcbc6') : deep);
  P(51, 33, look ? S[3] : ir[1]);
  P(52, 33, look ? S[3] : ir[2]);
  P(50, 34, S[2]);
  P(51, 34, S[2]);
  if (spec.fem) P(50, 31, WHITE);
  if (spec.eyes === 'tired') for (let x = 49; x <= 52; x += 1) k.put(x, 35, S[3]);
}

function paintMouth(k, spec, mood, speaking, S, g) {
  const my = g.my;
  const fx = g.front(my);
  const L = spec.lip ? rampOf(spec.lip) : null;
  const dark = L ? mix(L[0], INK, 0.25) : mix(S[0], INK, 0.35);
  const lip = (i) => (L ? L[i] : mix(S[Math.max(0, i - 2)], hex('#b8504c'), 0.34));
  const gold = hex('#f0c24a');
  if (mood === 'hurt' || speaking) {
    for (let x = fx - 3; x <= fx; x += 1) {
      k.put(x, my - 1, x === fx - 1 && spec.goldTooth ? gold : TOOTH);
      k.put(x, my, MOUTH_DARK);
      k.put(x, my + 1, MOUTH_DARK);
    }
    k.put(fx - 4, my, dark);
    k.put(fx, my + 2, lip(5));
    k.put(fx - 1, my + 2, lip(4));
    return;
  }
  const corner = mood === 'smug' || spec.smile || L ? my - 1 : my;
  for (let x = fx - 3; x <= fx - 1; x += 1) k.put(x, my, dark);
  k.put(fx - 4, corner, dark);
  if (mood === 'smug' && spec.goldTooth) k.put(fx - 2, my, gold);
  k.put(fx, my - 1, lip(4));
  k.put(fx, my + 1, lip(5));
  k.put(fx - 1, my + 1, lip(4));
  if (spec.fem && L) {
    k.put(fx - 1, my - 1, L[3]);
    k.put(fx - 2, my - 1, L[2]);
    k.put(fx + 1, my + 1, L[5]);
    k.put(fx - 2, my + 1, L[3]);
    k.put(fx, my + 2, L[3]);
    k.put(fx - 1, my + 2, L[2]);
  }
  k.put(fx - 2, my + 2, S[2]);
}

function paintFacialHair(k, spec, g) {
  const f = spec.facial;
  if (!f) return;
  const F = rampOf(f.color ?? '#2a1a12', 'hair');
  const my = g.my;
  if (f.stubble) for (let y = 38; y <= g.chinY; y += 1) for (let x = 38; x <= 58; x += 1) if (g.inFace(x, y) && !(y >= my - 1 && y <= my + 1 && x >= g.front(my) - 3)) k.tint(x, y, F[2], 0.24 + (hash(x, y, 4) < 0.18 ? 0.2 : 0));
  if (f.beard) {
    const long = f.beard === 'long';
    const bottom = g.chinY + (long ? 14 : 3);
    k.form(
      (x, y) => {
        if (y < 36 || y > bottom) return false;
        if (y >= my - 1 && y <= my + 1 && x >= g.front(my) - 3) return false;
        if (y <= g.chinY) return x >= 39 && x <= g.front(y) + 1 && y >= 36 + Math.max(0, (x - 41) * 0.25) && (y > 40 || x < 44);
        const t = (y - g.chinY) / (bottom - g.chinY);
        return x >= 42 + t * (long ? 6 : 3) && x <= g.front(g.chinY) + 2 - t * (long ? 4 : 2);
      },
      (x, y) => 4.4 + (x - 46) * 0.06 - Math.max(0, y - g.chinY) * 0.12 + (Math.sin((x + Math.sin(y * 0.8)) * 1.9) > 0.5 ? -1.3 : 0),
      F,
      { edge: 1, noise: 0.3, seed: 13 },
    );
  }
  if (f.mustache === 'thin') {
    for (let x = g.front(my) - 4; x <= g.front(my); x += 1) k.put(x, my - 2, F[1]);
  } else if (f.mustache) {
    const x1 = g.front(my - 2) + 1;
    k.form((x, y) => y >= my - 3 && y <= my - 1 && x >= x1 - 6 + (y === my - 3 ? 1 : 0) && x <= x1 - (y === my - 1 ? 1 : 0), (x, y) => 5 - (y - my + 3) * 0.9, F, { edge: 1, noise: 0.2, seed: 11 });
    if (f.mustache === 'handlebar') {
      k.put(x1 + 1, my - 2, F[3]);
      k.put(x1 + 2, my - 3, F[4]);
      k.put(x1 + 2, my - 4, F[3]);
      k.put(x1 + 1, my - 5, F[2]);
    }
  }
}

function paintGlasses(k, spec) {
  const gl = spec.glasses;
  if (!gl) return;
  const G = rampOf(gl.color ?? '#3a3a3a', gl.type === 'gold' || gl.type === 'monocle' ? 'metal' : 'cloth');
  if (gl.type === 'monocle') {
    for (let x = 49; x <= 56; x += 1) for (let y = 29; y <= 36; y += 1) {
      const d = Math.hypot(x + 0.5 - 52.5, y + 0.5 - 32.5);
      if (d <= 3.4 && d > 2.4) k.put(x, y, G[x + y < 84 ? 6 : 3]);
    }
    for (let i = 0; i < 12; i += 1) k.put(53 - Math.floor(i / 3), 36 + i, i % 2 ? G[5] : G[2]);
    return;
  }
  if (gl.type === 'round') {
    for (let x = 49; x <= 57; x += 1) for (let y = 28; y <= 37; y += 1) {
      const d = Math.hypot(x + 0.5 - 53, y + 0.5 - 32.5);
      if (d <= 3.3 && d > 2.3 && x >= 51) k.put(x, y, G[y < 32 ? 5 : 3]);
    }
  } else {
    for (let y = 28; y <= 35; y += 1) k.put(55, y, G[y < 31 ? 5 : 3]);
    for (let y = 29; y <= 34; y += 1) k.put(45, y, G[3]);
    for (let x = 45; x <= 55; x += 1) {
      k.put(x, 28, G[x > 52 ? 5 : 4]);
      if (gl.type !== 'gold') k.put(x, 35, G[2]);
    }
    if (gl.type === 'dark') for (let y = 29; y <= 34; y += 1) for (let x = 46; x <= 54; x += 1) k.put(x, y, mix(G[0], INK, 0.3));
    k.put(54, 29, mix(G[6], WHITE, 0.5));
  }
  // a haste até a orelha
  for (let x = 36; x <= 44; x += 1) k.put(x, 29 + (x < 40 ? 1 : 0), G[x < 40 ? 2 : 3]);
}

function paintEarrings(k, kind, color) {
  if (kind === 'pearl') {
    const o = hex('#51424f');
    for (const [x, y] of [[34, 40], [35, 40], [33, 41], [36, 41], [33, 42], [36, 42], [34, 43], [35, 43]]) k.put(x, y, o);
    k.put(34, 41, hex('#ffffff'));
    k.put(35, 41, hex('#dfd5dc'));
    k.put(34, 42, hex('#b9aab8'));
    k.put(35, 42, hex('#807083'));
    return;
  }
  const G = rampOf(color ?? '#e6c34a', 'metal');
  for (const [x, y, t] of [[34, 40, 6], [35, 40, 5], [33, 41, 6], [36, 41, 3], [33, 42, 5], [36, 42, 2], [33, 43, 4], [36, 43, 2], [34, 44, 3], [35, 44, 2]]) k.put(x, y, G[t]);
}

// --- o cabelo e o chapéu -------------------------------------------------------------------

/** Uma mecha (a mesma bola da figura de frente: borda escura embaixo, acesa em cima). */
const lobe = (k, R, cx, cy, rx, ry = rx, seed = 2) =>
  k.form(ell(cx, cy, rx, ry), ball(cx, cy, rx, ry, -0.6, 6.4), R, { edge: 1, rim: 6, noise: 0.45, seed, x0: Math.floor(cx - rx - 1), y0: Math.floor(cy - ry - 1), x1: Math.ceil(cx + rx + 1), y1: Math.ceil(cy + ry + 1) });

/** A touca de cabelo de perfil: `t` a espessura; a linha do cabelo sobe da costeleta até a testa. */
const capTest = (g, t, nape = 44, line = 0) => {
  const outer = ell(39.5, 28.5, 15.8 + t, 17.6 + t);
  return (x, y) => {
    if (!outer(x, y) || y > nape) return false;
    if (x <= 36) return true;
    if (y <= 17 + line) return true;
    // a frente: da testa (alto) até a costeleta (atrás da orelha)
    const hairline = 52 - (y - 17 - line) * 1.25;
    return x <= hairline && y <= 33 + line;
  };
};

function paintHairBack(k, spec) {
  const h = spec.hair;
  if (!h || h.style === 'none' || !h.color) return;
  const R = rampOf(h.color, 'hair');
  if (h.style === 'long') {
    k.form(poly([[22, 20], [38, 22], [40, 50], [42, 68], [24, 70], [18, 54]]), (x, y) => 2.4 + (x - 20) * 0.1 + (Math.sin((x + Math.sin(y * 0.35) * 1.6) * 1.5) > 0.45 ? -1.2 : 0), R, { edge: 1, noise: 0.25, seed: 6 });
  }
  if (h.style === 'bun' || h.style === 'curly' || h.style === 'volume') {
    const curly = h.style === 'curly';
    k.form(ell(36, 28, 19, 20 + (curly ? 4 : 0)), 0.7, R, { edge: 0, noise: 0.25, y1: curly ? 56 : 48 });
    const back = curly
      ? [[27, 52, 5], [22, 45, 5.4], [20, 37, 5.6], [21, 29, 5.6], [36, 50, 5]]
      : [[30, 45.5, 4.8], [24.5, 39.5, 5.2], [22, 32, 5.6]];
    for (const [cx, cy, r] of back) lobe(k, R, cx, cy, r, r * 0.9, 3);
  }
  if (h.style === 'bob') {
    k.form((x, y) => y >= 10 && y <= 50 && ell(39, 30, 18, 21)(x, y) && x <= 44 - Math.max(0, y - 30) * 0.2, (x, y) => tube(20, 56, 1.4, 5.2)(x) + (Math.sin((y + 0.5) * 1.6) > 0.5 ? -1 : 0) - (y > 46 ? 0.8 : 0), R, { edge: 1, noise: 0.2, seed: 6 });
  }
}

function paintHairFront(k, spec, g) {
  const h = spec.hair;
  if (!h || h.style === 'none' || !h.color) return;
  const R = rampOf(h.color, 'hair');
  const style = h.style;
  const dome = ball(40, 22, 18, 14, 1.4, 6);
  if (style === 'bun' || style === 'curly' || style === 'volume') {
    const ring = [[25, 24, 5.6], [29, 16, 5.6], [37, 12, 5.6], [45.5, 14, 5.2], [50.5, 19, 4.2], [34, 22, 5], [41.5, 20.5, 4.6]];
    for (const [cx, cy, r] of ring) lobe(k, R, cx, cy, r, r * 0.95, 5);
    if (style === 'bun') {
      k.form(ell(31, 6.5, 8.6, 4.8), ball(31, 6.5, 8.6, 4.8, 0, 6.5), R, { edge: 1, rim: 6, noise: 0.35, seed: 4 });
      for (const [x, y] of [[26, 6], [27, 5], [28, 4], [32, 8], [33, 7], [34, 6]]) k.put(x, y, R[2]);
      const G = rampOf('#d78d3a', 'metal');
      k.line(22, 2, 26, 9, G[2]);
      k.put(21, 1, G[6]);
      k.put(22, 1, G[4]);
      k.put(21, 2, G[3]);
    }
    return;
  }
  if (style === 'bald') {
    lobe(k, R, 33, 30, 3, 3.4, 2);
    lobe(k, R, 31.5, 36, 3, 3.4, 3);
    return;
  }
  if (style === 'bob') {
    k.form(capTest(g, 2.6, 50, 4), (x, y) => tube(22, 58, 2, 5.2)(x) + (Math.sin((y + 0.5) * 1.7) > 0.45 ? -1 : 0) + (y >= 13 && y <= 15 ? 1.4 : 0), R, { edge: 1, noise: 0.15, seed: 8 });
    // a franja reta
    k.form((x, y) => y >= 15 && y <= 23 && x >= 44 && x <= g.front(y) + 1 && y <= 23 - (x % 4 === 3 ? 1 : 0), (x) => 4.8 - (x - 44) * 0.08, R, { edge: 1, noise: 0.1 });
    return;
  }
  const P = { short: [1.7, 44], crew: [0.9, 42], slick: [1.2, 43], side: [2, 44], thin: [0.6, 40], long: [2.2, 44] }[style] ?? [1.7, 44];
  const strands =
    style === 'slick'
      ? (x, y) => (Math.sin((y + 0.5) * 2.3) > 0.45 ? -1 : 0) + (y >= 12 && y <= 14 && x > 34 && x < 50 ? 1.7 : 0)
      : style === 'crew'
        ? (x, y) => (hash(x, y, 3) < 0.2 ? -0.9 : 0)
        : (x, y) => (Math.sin(Math.atan2(y + 0.5 - 6, x + 0.5 - 52) * 18) > 0.55 ? -1.1 : 0);
  k.form(capTest(g, P[0], P[1]), (x, y) => dome(x, y) + strands(x, y) - (style === 'thin' && hash(x, y, 7) < 0.4 ? 1.5 : 0), R, { edge: 1, noise: 0.22, seed: 5 });
  if (style === 'side') k.form(ell(48, 17, 6, 3.4), (x) => 5 - (x - 44) * 0.1, R, { edge: 1, noise: 0.2 });
}

function brimShade(k, g, y0, y1, a) {
  for (let y = y0; y <= y1; y += 1) for (let x = 34; x <= 60; x += 1) if (g.inFace(x, y)) k.tint(x, y, [20, 6, 10], a * (1 - ((y - y0) / (y1 - y0 + 1)) * 0.6));
}

function paintHat(k, spec, g, back) {
  const hat = spec.hat;
  if (!hat) return;
  const type = hat.type;
  const R = hat.color ? rampOf(hat.color) : null;
  if (type === 'hood') {
    if (back) k.form(ell(37, 33, 21, 27), 1.2, R, { edge: 0, noise: 0.2, y1: 62 });
    else {
      k.form(
        (x, y) => ell(37, 33, 21, 27)(x, y) && y <= 60 && !(x >= 43 && y >= 17 && y <= 54 && x <= g.front(Math.min(52, Math.max(15, y))) + 2),
        (x, y) => ball(37, 30, 21, 27, 1.4, 5.6)(x, y) + (Math.sin(Math.atan2(y - 33, x - 37) * 9) > 0.7 ? -0.8 : 0),
        R,
        { edge: 1, rim: 4, noise: 0.25, seed: 24 },
      );
      for (let y = 15; y <= g.chinY; y += 1) for (let x = 40; x <= 60; x += 1) if (g.inFace(x, y)) k.tint(x, y, [6, 2, 6], 0.34);
    }
    return;
  }
  if (back) return;
  const brimmed = { fedora: [24.5, 2, 1], panama: [24.5, 2, 1], wide: [34, 4, 1], safari: [21, 3, 0], straw: [28, 4, 0] }[type];
  if (brimmed) {
    const [rx, top, pinch] = brimmed;
    const B = rampOf(hat.band ?? hat.color);
    k.form(
      (x, y) => y >= top && y <= 18 && Math.abs(x + 0.5 - 40) <= 12.5 - (y < top + 3 ? (top + 3 - y) * 1.4 : 0) && !(pinch && y < top + 2 && Math.abs(x + 0.5 - 40) < 3),
      (x, y) => tube(26, 56, 1.4, 5.8)(x) - (y - top) * 0.05 + (type === 'straw' && (x + y) % 3 === 0 ? -1 : 0),
      R,
      { edge: 1, rim: 4, noise: 0.25, seed: 14 },
    );
    if (hat.band) k.form((x, y) => y >= 15 && y <= 18 && Math.abs(x + 0.5 - 40) <= 12.5, (x) => tube(26, 56, 1.6, 5.6)(x), B, { edge: 1, noise: 0.1 });
    k.form(ell(41, 19.6, rx, 2.1), (x, y) => (y <= 19 ? 5.2 : 2.6) + (type === 'straw' && (x + y) % 3 === 0 ? -0.9 : 0), R, { edge: 1, rim: 5, noise: 0.2, seed: 15 });
    brimShade(k, g, 21, type === 'wide' ? 28 : 23, type === 'wide' ? 0.5 : 0.3);
    return;
  }
  if (type === 'cap' || type === 'police') {
    const V = rampOf(hat.visor ?? hat.color);
    if (type === 'cap') k.form((x, y) => y <= 20 && ell(40, 19, 15.6, 13)(x, y), (x, y) => ball(40, 18, 15.6, 13, 1.4, 6.2)(x, y), R, { edge: 1, rim: 4, noise: 0.2, seed: 16 });
    else {
      k.form(poly([[23, 5], [58, 2.5], [55, 16], [26, 16]]), (x, y) => tube(22, 60, 1.5, 5.8)(x) + (y < 6 ? 0.6 : 0), R, { edge: 1, rim: 4, noise: 0.2, seed: 23 });
      k.form(box(26, 13, 55, 16), (x) => tube(24, 58, 1.4, 5)(x), rampOf(hat.band ?? hat.color), { edge: 1, noise: 0.1 });
      k.form(box(50, 6, 53, 10), (x) => (x < 52 ? 6 : 4), rampOf(hat.emblem ?? '#e6c34a', 'metal'), { edge: 1, noise: 0 });
    }
    k.form(poly([[50, type === 'cap' ? 17.5 : 15.5], [66, type === 'cap' ? 19 : 17.5], [65, 21], [50, 20.5]]), (x, y) => (y <= 19 ? 5 : 2.8), V, { edge: 1, rim: 5, noise: 0.15, seed: 17 });
    if (hat.emblem && type === 'cap') k.form(ell(41, 11, 3, 3), ball(41, 11, 3, 3, 2.5, 6.4), rampOf(hat.emblem), { edge: 1, noise: 0 });
    if (hat.ticket) {
      k.rect(30, 7, 5, 7, hex('#f4e8b0'));
      k.rect(30, 7, 5, 2, hex('#b8261c'));
    }
    brimShade(k, g, 21, 24, 0.28);
    return;
  }
  if (type === 'beanie') {
    k.form((x, y) => y >= 3 && y <= 20 && ell(40, 20, 16.8, 16)(x, y), (x, y) => ball(40, 17, 16.8, 14, 1.5, 5.8)(x, y) + (Math.sin((x + 0.5) * 1.4) > 0.3 ? -1 : 0.2), R, { edge: 1, rim: 4, noise: 0.15, seed: 18 });
    k.form((x, y) => y >= 18 && y <= 23 && x >= 23 && x <= 55, (x) => tube(22, 57, 2, 6)(x) + (x % 2 ? -1.2 : 0), R, { edge: 1, rim: 4, noise: 0.1 });
    return;
  }
  if (type === 'crown') {
    const G = rampOf('#e2b23a', 'metal');
    k.form((x, y) => x >= 28 && x <= 52 && y <= 12 && (y >= 8 || y >= 2 + Math.abs(((x - 28) % 6) - 3) * 2), (x, y) => tube(27, 53, 1.8, 6.4)(x) + (y === 8 || y === 12 ? -1.4 : 0), G, { edge: 1, rim: 5, noise: 0.2, seed: 19 });
    const J = rampOf('#d8283a');
    k.put(45, 10, J[6]);
    k.put(46, 10, J[3]);
    return;
  }
  if (type === 'helmet') {
    k.form((x, y) => y >= 2 && y <= 19 && ell(40, 19, 17, 16.5)(x, y), (x, y) => ball(40, 16, 17, 14.5, 1.6, 6.2)(x, y), R, { edge: 1, rim: 5, noise: 0.12, seed: 20 });
    if (hat.band) for (let x = 24; x <= 56; x += 1) if (k.has(x, 15)) k.put(x, 15, rampOf(hat.band)[x < 40 ? 4 : 2]);
    k.form(ell(42, 19.8, 21, 2.2), (x, y) => (y <= 19 ? 5.6 : 3), R, { edge: 1, rim: 6, noise: 0.1 });
    brimShade(k, g, 22, 24, 0.26);
    return;
  }
  if (type === 'turban') {
    k.form((x, y) => y >= 1 && ell(39, 15, 19, 13)(x, y) && y <= 24 - Math.max(0, x - 44) * 0.2, (x, y) => ball(39, 14, 19, 13, 1.6, 6)(x, y) + Math.sin((x * 0.9 - y * 1.1) * 0.8) * 1.25, R, { edge: 1, rim: 4, noise: 0.2, seed: 21 });
    k.form(ell(55, 16, 2.6, 3.2), ball(55, 16, 2.6, 3.2, 2, 6.6), rampOf('#e2b23a', 'metal'), { edge: 1, noise: 0 });
    k.put(55, 16, rampOf('#d8283a')[4]);
    return;
  }
  if (type === 'goggles') {
    k.form((x, y) => y >= 16 && y <= 19 && x >= 24 && x <= 54, (x) => tube(22, 56, 1.6, 5)(x), rampOf('#4a3420'), { edge: 1, noise: 0.15 });
    k.form(ell(54, 17.5, 3.6, 4.2), ball(54, 17.5, 3.6, 4.2, 2, 6.6), rampOf('#c9962e', 'metal'), { edge: 1, noise: 0 });
    k.form(ell(55, 17.5, 1.8, 2.6), (x, y) => (y < 17 ? 6 : 3), rampOf('#6aa6c4'), { edge: 1, noise: 0 });
    return;
  }
  if (type === 'flatcap') {
    k.form((x, y) => y <= 20 && ell(40, 17, 17.5, 8.5)(x, y), (x, y) => ball(40, 17, 17.5, 8.5, 1.6, 6)(x, y) + ((x + 2 * y) % 4 === 0 ? -0.9 : 0), R, { edge: 1, rim: 4, noise: 0.2, seed: 22 });
    k.form(poly([[50, 17.5], [61, 19.5], [59, 21.5], [50, 21]]), (x, y) => (y <= 19 ? 4.8 : 2.4), R, { edge: 1, rim: 5, noise: 0.1 });
    brimShade(k, g, 22, 23, 0.24);
    return;
  }
  if (type === 'headband') {
    k.form((x, y) => y >= 17 && y <= 20 && g.inHead(x, y + 0) && x >= 24, (x) => tube(24, 56, 2.4, 6.4)(x), R, { edge: 2, noise: 0.1 });
    for (const [x, y] of [[23, 19], [22, 20], [21, 21], [22, 22], [21, 23]]) k.put(x, y, R[3]);
  }
}

// --- os objetos de quem fuma ---------------------------------------------------------------

function paintSmoke(k, spec, mood, g) {
  if (!spec.smokes || mood === 'hurt') return;
  const y = g.my;
  const x0 = g.front(y) - 1;
  const len = spec.smokes === 'cigar' ? 9 : 8;
  if (spec.smokes === 'cigar') {
    k.rect(x0, y - 1, len, 1, hex('#9a6a34'));
    k.rect(x0, y, len, 1, hex('#6a4220'));
    k.rect(x0 + 2, y - 1, 2, 2, hex('#e2b23a'));
  } else {
    k.rect(x0, y, len, 1, hex('#f6f2e8'));
    k.rect(x0, y + 1, len, 1, hex('#c9c0ae'));
    k.rect(x0, y, 2, 2, hex('#d9a046'));
  }
  k.put(x0 + len, y, hex('#ff6a1a'));
  k.put(x0 + len, y - (spec.smokes === 'cigar' ? 1 : -1), hex('#ffd04a'));
}

/** Onde fica a brasa e o olho no perfil (na grade de 88×84, olhando para a direita). */
export const PROFILE_SPOTS = Object.freeze({ eye: Object.freeze({ x: 50.5, y: 32.5 }), ember: Object.freeze({ x: 63, y: 45 }) });

/**
 * O personagem `spec` de perfil, no humor `mood` (idle, thinking, smug, hurt, blink) e com a
 * boca aberta se `speaking`. `facing`: 'right' (o desenho) ou 'left' (o espelho, para quem senta
 * do lado direito da mesa). 88×84, fundo transparente.
 */
export function paintProfile(spec, mood = 'idle', speaking = false, facing = 'right') {
  const k = board(W, H);
  const g = profileGeo(spec);
  const S = rampOf(spec.skin ?? '#d8a070', 'skin');
  const hairColor = spec.hair?.color ?? spec.facial?.color;
  paintHat(k, spec, g, true);
  paintHairBack(k, spec);
  paintBody(k, spec, S, g);
  paintHead(k, { ...spec, __mood: mood }, S, g, hairColor);
  paintEye(k, spec, mood, S);
  paintMouth(k, spec, mood, speaking, S, g);
  paintFacialHair(k, spec, g);
  paintHairFront(k, spec, g);
  paintEar(k, spec, S);
  paintHat(k, spec, g, false);
  paintGlasses(k, spec);
  if (spec.earrings && spec.hat?.type !== 'hood') paintEarrings(k, spec.earrings, spec.earringColor);
  paintSmoke(k, spec, mood, g);
  return finish(k, spec, facing);
}

/** O recorte de luz (`spec.rim`), o contorno de tinta e o espelho para quem olha para a esquerda. */
function finish(k, spec, facing) {
  const { w, h } = k;
  if (spec.rim) {
    const rim = hex(spec.rim);
    const marks = [];
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (k.has(x, y) && (!k.has(x + 1, y) || !k.has(x, y - 1))) marks.push(x, y);
    for (let i = 0; i < marks.length; i += 2) k.put(marks[i], marks[i + 1], rim, 0.55);
  }
  k.ink(INK);
  if (facing === 'left') {
    const d = k.data;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w / 2; x += 1) {
        const a = (y * w + x) * 4;
        const b = (y * w + (w - 1 - x)) * 4;
        for (let c = 0; c < 4; c += 1) {
          const t = d[a + c];
          d[a + c] = d[b + c];
          d[b + c] = t;
        }
      }
    }
  }
  return k;
}

// --- versão 2.32: o corpo inteiro, sentado de lado na cadeira ---------------------------------
// A cabeça é a mesma do perfil e fica no mesmo lugar do quadro (o crânio em 40, 29); embaixo
// dela, o tronco de perfil, o braço com o antebraço apoiado para a frente (a mão na beirada da
// mesa), a coxa deitada no assento até o joelho, a canela, o sapato e a cadeira.

export const SEATED_W = 120;
export const SEATED_H = 164;

/** A cadeira de lado: 'madeira' (a de boteco) ou 'plastico' (a branca de bar). `back`: a parte de trás. */
function paintChair(k, kind, back) {
  if (kind === 'plastico') {
    const P = rampOf('#e9ebe4');
    const far = rampOf('#b4b8b0');
    if (back) {
      // os pés de lá (abertos), o encosto curvo inclinado para trás
      k.form(poly([[24, 118], [28, 118], [20, 161], [16, 161]]), 2.6, far, { edge: 1, noise: 0.15 });
      k.form(poly([[74, 118], [78, 118], [86, 160], [82, 160]]), 2.6, far, { edge: 1, noise: 0.15 });
      k.form(poly([[14, 60], [22, 61], [26, 116], [18, 116], [15, 90]]), (x, y) => tube(13, 26, 2.6, 5.8)(x) - (y % 6 === 0 && y < 100 ? 1 : 0), P, { edge: 1, rim: 6, noise: 0.12, seed: 77 });
      return;
    }
    k.form(poly([[12, 112], [77, 112], [78, 117], [74, 120], [14, 120], [11, 116]]), (x, y) => (y < 115 ? 5.8 : 3.4), P, { edge: 1, rim: 6, noise: 0.12, seed: 78 });
    k.form(poly([[18, 119], [24, 119], [16, 162], [10.5, 162]]), (x) => tube(10, 25, 2.6, 5.6)(x), P, { edge: 1, rim: 6, noise: 0.12, seed: 79 });
    k.form(poly([[68, 119], [74, 119], [82, 162], [76.5, 162]]), (x) => tube(68, 83, 2.6, 5.6)(x), P, { edge: 1, rim: 6, noise: 0.12, seed: 80 });
    return;
  }
  const Wd = rampOf('#8a5a34');
  const far = rampOf(mix(hex('#8a5a34'), hex('#2a1810'), 0.45));
  if (back) {
    // os pés de lá (mais escuros), o pé de trás subindo até o encosto, o travessão e uma ripa
    k.form(poly([[21, 118], [25, 118], [26, 161], [22, 161]]), 2.4, far, { edge: 1, noise: 0.2 });
    k.form(poly([[75, 118], [79, 118], [80, 160], [76, 160]]), 2.4, far, { edge: 1, noise: 0.2 });
    k.form(poly([[13, 62], [18.5, 62], [20, 162], [14.5, 162]]), (x) => tube(13, 20, 2.2, 5.4)(x), Wd, { edge: 1, rim: 5, noise: 0.25, seed: 71 });
    k.form(poly([[10, 58], [21, 58], [21, 63], [10, 63]]), (x, y) => (y < 60 ? 5.6 : 3.6), Wd, { edge: 1, rim: 6, noise: 0.2, seed: 72 });
    k.form(poly([[11, 80], [20, 80], [20, 84], [11, 84]]), 3.6, Wd, { edge: 1, noise: 0.2, seed: 73 });
    return;
  }
  k.form(poly([[11, 113], [76, 113], [76, 119], [11, 119]]), (x, y) => (y < 115 ? 5.6 : 3.2), Wd, { edge: 1, rim: 6, noise: 0.25, seed: 74 });
  k.form(poly([[68, 119], [73, 119], [74.5, 162], [69.5, 162]]), (x) => tube(68, 75, 2.2, 5.2)(x), Wd, { edge: 1, rim: 5, noise: 0.25, seed: 75 });
  k.form(poly([[19, 138], [70, 138], [70, 141], [19, 141]]), 3.4, Wd, { edge: 1, noise: 0.2, seed: 76 });
}

/** O que vai nas pernas: a saia até o joelho, o vestido até o tornozelo (túnica) ou a calça. */
function lowerOf(spec) {
  const o = spec.outfit ?? {};
  if (o.type === 'robe') return { kind: 'robe', color: o.color };
  if (spec.fem) return { kind: 'skirt', color: o.skirt ?? '#3a3444' };
  // a calça: a do terno e a do uniforme combinam; as outras variam (jeans, cáqui, cinza, marrom)
  const loose = ['#3e3a36', '#2e3e5e', '#5a4e38', '#3a3a48', '#4a3424'][(spec.seed ?? 0) % 5];
  const pants = o.pants ?? (o.type === 'uniform' || o.type === 'suit' || o.type === 'coat' ? o.color : o.type === 'jacket' ? '#2e3e5e' : loose);
  return { kind: 'pants', color: pants };
}

/** O tronco de perfil: as costas à esquerda, o peito, a barriga e o quadril sentado. */
function seatedTorso(spec) {
  const add = spec.broad ? 3 : spec.fem ? -1 : 0;
  const base = poly([[28, 55], [35, 51], [45, 51.5], [52, 56], [56 + add, 64], [58 + add, 74], [58.5 + add, 86], [58 + add, 98], [56, 106], [48, 110], [30, 110], [25, 104], [24, 90], [24.5, 76], [26, 64]]);
  return spec.fem ? any(base, ell(56, 70, 4.6, 6.4)) : base;
}

function paintSeatedBody(k, spec, S, chair) {
  const o = spec.outfit ?? { type: 'shirt', color: '#5a5a5a' };
  const Top = rampOf(o.color ?? '#5a5a5a');
  const low = lowerOf(spec);
  const Low = rampOf(low.color);
  const Shoe = rampOf(spec.fem ? '#4a1c24' : '#2e1e16');
  const skinArms = o.type === 'tank';
  const tone = (x, y) => ball(40, 74, 19, 34, 1.6, 5.8)(x, y);
  // a canela descendo do joelho e o sapato (a coxa vem por cima, depois do assento)
  const shin = low.kind === 'skirt' ? S : Low;
  k.form(poly([[86, 106], [100, 104], [101, 114], [98, 150], [88, 150], [87, 114]]), (x) => tube(86, 102, 1.8, 5.2)(x), shin, { edge: 1, rim: 5, noise: 0.2, seed: 81 });
  k.form(poly([[84, 148], [99, 147], [108, 150.5], [109, 156], [84, 156]]), (x, y) => (y < 151 ? 4.6 : 2.6), Shoe, { edge: 1, rim: 6, noise: 0.15, seed: 82 });
  paintChair(k, chair, false);
  if (low.kind === 'robe') {
    k.form(
      poly([[25, 98], [58, 98], [86, 100], [100, 103], [102, 116], [104, 148], [84, 149], [86, 118], [30, 118], [24, 110]]),
      (x, y) => (y < 106 ? 5 : 4) - (x > 86 && y > 112 ? 0.8 : 0) + (Math.sin(x * 0.8 + y * 0.15) > 0.7 && y > 112 ? -1.4 : 0),
      Low,
      { edge: 1, rim: 5, noise: 0.25, seed: 83 },
    );
    const Gd = rampOf(o.collar ?? '#e6c34a', 'metal');
    for (let x = 84; x <= 103; x += 1) k.put(x, 146 + (x > 93 ? 1 : 0), Gd[x % 2 ? 5 : 3]);
  } else {
    k.form(
      poly([[25, 99], [56, 99], [88, 101], [99, 104], [100.5, 112], [94, 117], [30, 117.5], [24.5, 110]]),
      (x, y) => 5.2 - (y - 99) * 0.17 - (x > 94 ? 0.6 : 0),
      Low,
      { edge: 1, rim: 6, noise: 0.25, seed: 84 },
    );
    if (low.kind === 'skirt') for (let y = 105; y <= 116; y += 1) k.put(101, y, Low[1]);
    else for (let x = 34; x <= 92; x += 1) k.put(x, 102 + Math.round((x - 34) * 0.03), Low[2]);
  }
  // o tronco
  const body = k.form(seatedTorso(spec), (x, y) => tone(x, y) - (y > 104 ? 0.6 : 0), Top, { edge: 1, rim: 5, noise: o.type === 'cardigan' ? 0.6 : 0.3, seed: 85 });
  if (o.type === 'cardigan') {
    for (let y = 55; y <= 110; y += 1) for (let x = 24; x < 64; x += 1) if (body.has(x, y) && x % 4 === 0) k.put(x, y, Top[Math.max(1, Math.round(tone(x, y) - 2.4))]);
  }
  if (o.plaid) {
    const c = hex(o.plaid);
    for (let y = 52; y <= 110; y += 1) for (let x = 20; x < 64; x += 1) if (body.has(x, y) && (x % 7 === 2 || y % 7 === 3)) k.put(x, y, c, 0.4);
  }
  if (low.kind === 'pants') {
    const B = rampOf('#2a1c14');
    for (let x = 24; x <= 62; x += 1) {
      if (!body.has(x, 103)) continue;
      k.put(x, 103, B[2]);
      k.put(x, 104, B[1]);
    }
  }
  const frontX = (y) => {
    let x = 64;
    while (x > 30 && !body.has(x, y)) x -= 1;
    return x;
  };
  if (o.type === 'robe') {
    const Gd = rampOf(o.collar ?? '#e6c34a', 'metal');
    for (let y = 52; y <= 108; y += 1) {
      const x = Math.round(43 + (y - 52) * 0.24);
      if (!body.has(x, y)) continue;
      k.put(x, y, Gd[5]);
      k.put(x + 1, y, Gd[3]);
    }
  } else if (o.jabot) {
    const L = rampOf('#f3e3de');
    k.form(poly([[44, 51.5], [52, 54], [57, 61], [57, 70], [53, 74], [49, 67], [45, 58]]), (x, y) => 5.6 - ((x + y * 2) % 5 === 0 ? 1.6 : 0), L, { edge: 2, rim: 6, noise: 0.2, seed: 86 });
    const Gm = rampOf('#d78d3a', 'metal');
    k.form(ell(52, 59, 1.8, 1.8), ball(52, 59, 1.8, 1.8, 2, 6.4), Gm, { edge: 0, noise: 0 });
    const Bt = rampOf(o.accent ?? '#d8b860', 'metal');
    for (const y of [80, 89, 98]) {
      const x = frontX(y) - 2;
      k.put(x, y, Bt[6]);
      k.put(x, y + 1, Bt[3]);
    }
  } else if (o.type === 'suit' || o.type === 'coat' || o.type === 'jacket') {
    // o terno, o sobretudo e a jaqueta: a camisa no V do peito, a lapela e a gravata
    const Wt = rampOf(o.shirt ?? '#f0f0f0');
    const A = rampOf(o.accent ?? o.color);
    const end = o.type === 'jacket' ? 66 : 80;
    const vx = (y) => frontX(y) - 1 - (y - 52) * (o.type === 'jacket' ? 0.16 : 0.22);
    k.form((x, y) => y >= 52 && y <= end && x >= vx(y) && body.has(x, y), (x) => 5 - (x > 55 ? 1 : 0), Wt, { edge: 2, noise: 0.12, seed: 91 });
    k.form((x, y) => y >= 52 && y <= end + 6 && x >= vx(y) - 4 && x < vx(y) && body.has(x, y), (x, y) => 4.8 - (y > end ? 1 : 0), A, { edge: 1, rim: 6, noise: 0.15, seed: 92 });
    if (o.tie) {
      const T = rampOf(o.tie);
      k.form((x, y) => y >= 55 && y <= end - 2 && x >= frontX(y) - 3 && x <= frontX(y) - 1 && body.has(x, y), (x, y) => (y === 56 ? 3 : 4.8), T, { edge: 1, noise: 0.1 });
    }
    if (o.bow) {
      const T = rampOf(o.bow);
      k.form(any(ell(frontX(56) - 2, 56, 2.4, 2), ell(frontX(56) - 2, 56, 1.2, 2.6)), 4.6, T, { edge: 1, noise: 0 });
    }
    if (o.type === 'jacket') {
      const Z = rampOf('#a8b0b6', 'metal');
      for (let y = 66; y <= 104; y += 1) k.put(frontX(y) - 2, y, Z[y % 2 ? 5 : 2]);
    } else {
      const B = rampOf(o.type === 'coat' ? (o.accent ?? o.color) : mix(hex(o.color), hex('#000000'), 0.25));
      for (const y of [88, 97]) {
        k.put(frontX(y) - 3, y, B[6]);
        k.put(frontX(y) - 2, y, B[3]);
      }
    }
  } else if (o.type === 'jersey') {
    // a camisa de time: a gola redonda e a faixa da manga
    const C = rampOf(o.collar ?? '#ffffff');
    k.form((x, y) => body.has(x, y) && y >= 51 && y <= 55 && x >= 30 && x <= frontX(y), (x) => (x > 50 ? 4 : 5.6), C, { edge: 1, noise: 0 });
  } else if (!skinArms) {
    const C = rampOf(o.collar ?? o.color);
    k.form(poly([[42, 50], [51, 52.5], [55, 59], [49, 60], [43, 55]]), 4.6, C, { edge: 1, rim: 6, noise: 0.15, seed: 87 });
    if (o.stripes && o.type === 'shirt') {
      const c = hex(o.stripes);
      for (let y = 60; y <= 110; y += 1) for (let x = 24; x < 64; x += 1) if (body.has(x, y) && x % 4 === 1) k.put(x, y, c, 0.7);
    }
    const A = rampOf(o.accent ?? mix(hex(o.color), hex('#ffffff'), 0.6));
    for (let y = 61; y <= 101; y += 1) k.put(frontX(y) - 3, y, Top[1]);
    for (const y of [67, 77, 87, 97]) {
      const x = frontX(y) - 2;
      k.put(x, y, A[6]);
      k.put(x + 1, y, A[4]);
      k.put(x, y + 1, A[3]);
    }
    if (o.type === 'apron') {
      // o avental na frente: do peito até o colo, com a alça no pescoço
      const Ap = rampOf(o.accent ?? '#f0f0f0');
      k.form((x, y) => body.has(x, y) && y >= 64 && x >= frontX(y) - 13, (x, y) => tube(40, 62, 2.6, 6.2)(x) - (y === 64 ? 1 : 0), Ap, { edge: 2, rim: 6, noise: 0.15, seed: 93 });
      k.form((x, y) => y >= 98 && y <= 112 && x >= 46 && x <= 64 - (y - 98) * 0.2, 5, Ap, { edge: 2, noise: 0.15, seed: 94 });
      for (let y = 52; y <= 64; y += 1) k.put(Math.round(47 + (y - 52) * 0.5), y, Ap[2]);
    }
  }
  // os enfeites: as faixas refletivas, o emblema, o distintivo, as pérolas, a medalha, o boá
  if (o.stripes && o.type === 'uniform') {
    const V = rampOf(o.stripes, 'metal');
    for (let x = 0; x < SEATED_W; x += 1) for (let y = 86; y <= 88; y += 1) if (body.has(x, y)) k.put(x, y, V[y === 86 ? 6 : y === 87 ? 5 : 3]);
  }
  if (o.patch) k.form(box(35, 64, 40, 69), (x, y) => (y < 66 ? 6 : 4), rampOf(o.patch), { edge: 1, noise: 0 });
  if (o.badge) {
    const G = rampOf(o.type === 'uniform' ? '#e6c34a' : '#e8e8e8', 'metal');
    const bx = frontX(68) - 5.5;
    k.form((x, y) => y >= 65 && y <= 71 && Math.abs(x + 0.5 - bx) <= (y < 69 ? 2.6 : 2.6 - (y - 68) * 0.9), (x) => (x + 0.5 < bx ? 6 : 4), G, { edge: 1, noise: 0 });
  }
  if (o.pearls) for (let i = 0; i <= 8; i += 1) k.put(Math.round(46 + i * 1.2), Math.round(53 + Math.sin((i / 8) * Math.PI) * 3), hex(i % 2 ? '#ffffff' : '#b9aab8'));
  if (o.boa) {
    const F = rampOf(o.boa, 'hair');
    for (const [cx, cy] of [[30, 54], [36, 56], [42, 56.5], [48, 56], [53, 59], [55, 65]]) k.form(ell(cx, cy, 3.6, 3.2), ball(cx, cy, 3.6, 3.2, 2, 6), F, { edge: 1, noise: 0.4, seed: 40, x0: cx - 5, x1: cx + 5, y0: cy - 5, y1: cy + 5 });
  }
  if (o.chain) {
    for (let i = 0; i <= 8; i += 1) k.put(47 + i * 0.6, 53 + i * 1.1, hex(i % 2 ? '#fae167' : '#bf7f12'));
    if (o.medal) {
      const G = rampOf('#e2b23a', 'metal');
      k.form(ell(52.5, 65.5, 2.6, 2.6), ball(52.5, 65.5, 2.6, 2.6, 2, 6.6), G, { edge: 1, noise: 0 });
    }
  }
  if (o.scarf) {
    const C = rampOf(o.scarf);
    k.form(any(poly([[30, 49], [50, 51], [52, 57], [31, 56]]), poly([[46, 55], [52, 55], [53, 78], [47, 78]])), (x, y) => 4.8 + (Math.sin(x * 0.9 + y * 1.3) > 0.5 ? -1.2 : 0), C, { edge: 1, rim: 5, noise: 0.2 });
  }
  // o braço de cá: o ombro, o cotovelo para trás e o antebraço para a frente, a mão na beirada
  const Sl = skinArms ? S : Top;
  k.form(any(poly([[32, 58], [46, 57], [49.5, 84], [46.5, 91], [38, 90], [33.5, 72]]), ell(39.5, 61, 8.2, 7.4)), (x, y) => ball(39, 66, 10, 22, 2, 5.8)(x, y), Sl, { edge: 1, rim: 5, noise: 0.25, seed: 88 });
  k.form(poly([[41, 84], [48, 83], [68, 81], [69.5, 88], [48, 92], [42, 92]]), (x, y) => 5 - (y - 82) * 0.3, Sl, { edge: 1, rim: 6, noise: 0.2, seed: 89 });
  if (!skinArms) for (let y = 81; y <= 88; y += 1) k.put(67, y, Top[1]);
  k.form(any(ell(73, 85.5, 4.8, 4), ell(76.5, 83, 2.2, 1.6)), ball(73, 85, 4.8, 4, 2.2, 5.8), S, { edge: 1, rim: 5, noise: 0.1, seed: 90 });
  for (const x of [72, 74, 76]) k.put(x, 88, S[2]);
}

/**
 * O personagem `spec` de corpo inteiro, sentado de lado na cadeira (`chair`: 'madeira' ou
 * 'plastico'), no humor `mood` e com a boca aberta se `speaking`. `facing` como no perfil.
 * SEATED_W×SEATED_H, fundo transparente; a cabeça no mesmo lugar do perfil de 88×84.
 */
export function paintSeatedProfile(spec, mood = 'idle', speaking = false, facing = 'right', chair = 'madeira') {
  const k = board(SEATED_W, SEATED_H);
  const g = profileGeo(spec);
  const S = rampOf(spec.skin ?? '#d8a070', 'skin');
  const hairColor = spec.hair?.color ?? spec.facial?.color;
  paintChair(k, chair, true);
  // a cabeça é desenhada para o quadro de 88×84: as formas dela só varrem esse canto
  k.setLimit([0, 0, W - 1, H - 1]);
  paintHat(k, spec, g, true);
  paintHairBack(k, spec);
  paintNeck(k, S, g);
  k.setLimit(null);
  paintSeatedBody(k, spec, S, chair);
  k.setLimit([0, 0, W - 1, H - 1]);
  paintHead(k, { ...spec, __mood: mood }, S, g, hairColor);
  paintEye(k, spec, mood, S);
  paintMouth(k, spec, mood, speaking, S, g);
  paintFacialHair(k, spec, g);
  paintHairFront(k, spec, g);
  paintEar(k, spec, S);
  paintHat(k, spec, g, false);
  paintGlasses(k, spec);
  if (spec.earrings && spec.hat?.type !== 'hood') paintEarrings(k, spec.earrings, spec.earringColor);
  paintSmoke(k, spec, mood, g);
  k.setLimit(null);
  return finish(k, spec, facing);
}
