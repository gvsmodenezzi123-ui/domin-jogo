/**
 * Versão 2.1: a ficha de cada retrato (art/portraitPixels.js), pela chave `art` dos rivais.
 * Mantém a cara de cada um dos retratos antigos (cores, chapéu, bigode, o objeto da mão) e
 * agora enche a foto da polaroide inteira, com a parede de cada um atrás.
 *
 *   bg / bgPattern  a parede (plain, tiles, wood, brick, stripes, curtain, stars, frame, neon)
 *   skin, jaw       pele e o formato do queixo (round, square, heavy, long, thin)
 *   hair, hat       { style | type, color, band... }
 *   facial          { mustache, beard, stubble, goatee, color }
 *   glasses         { type: round | square | dark | gold | monocle, color }
 *   outfit          { type, color, accent, shirt, tie, bow, chain, badge, number, ... }
 *   behind / front  o objeto de cada um, desenhado atrás ou na frente do personagem
 */

// ---------------------------------------------------------------------------
// Objetos (versão 2.17: na grade da figura nova, 88×84, com as rampas de tom do figKit)
// `k` é a prancheta (put, rect, line, form); `c` traz hex, rampOf, ell, ball, tube, geo, mood.
// ---------------------------------------------------------------------------

const disc = (k, c, cx, cy, rx, ry, color, kind, lo = 1.2, hi = 6.5) => k.form(c.ell(cx, cy, rx, ry), c.ball(cx, cy, rx, ry, lo, hi), c.rampOf(color, kind), { edge: 1, rim: 5, noise: 0.15, x0: Math.floor(cx - rx - 1), x1: Math.ceil(cx + rx + 1), y0: Math.floor(cy - ry - 1), y1: Math.ceil(cy + ry + 1) });
/** Um bastão de 2–3 px de largura entre dois pontos: claro de um lado, escuro do outro. */
const rod = (k, c, x0, y0, x1, y1, color, kind, wide = false) => {
  const R = c.rampOf(color, kind);
  k.line(x0, y0, x1, y1, R[5]);
  k.line(x0 + 1, y0, x1 + 1, y1, R[wide ? 3 : 1]);
  if (wide) k.line(x0 + 2, y0, x1 + 2, y1, R[1]);
};
const slab = (k, c, x0, y0, x1, y1, color, kind, tone = () => 4.6) => k.form(c.box(x0, y0, x1, y1), tone, c.rampOf(color, kind), { edge: 1, rim: 6, noise: 0.15, x0, y0, x1, y1 });

/** Cigarro no canto da boca (aceso): a brasa fica em PORTRAIT_EMBER. */
const cigarette = (k, c) => {
  if (c.mood === 'hurt') return;
  const y = c.geo.my;
  k.rect(48, y, 9, 1, c.hex('#f6f2e8'));
  k.rect(48, y + 1, 9, 1, c.hex('#c9c0ae'));
  k.rect(48, y, 2, 2, c.hex('#d9a046'));
  k.put(48, y + 1, c.hex('#a8742a'));
  k.rect(57, y, 1, 2, c.hex('#ff6a1a'));
  k.put(58, y, c.hex('#ffd04a'));
  k.put(58, y + 1, c.hex('#c8380a'));
};

const cigar = (k, c) => {
  if (c.mood === 'hurt') return;
  const y = c.geo.my - 1;
  k.rect(48, y, 11, 1, c.hex('#9a6a34'));
  k.rect(48, y + 1, 11, 1, c.hex('#6a4220'));
  k.rect(48, y + 2, 11, 1, c.hex('#3e2410'));
  k.rect(51, y, 2, 3, c.hex('#e2b23a'));
  k.put(51, y + 2, c.hex('#9a5d0a'));
  k.rect(59, y, 1, 3, c.hex('#ff6a1a'));
  k.put(60, y + 1, c.hex('#ffd04a'));
};

/** Botijão de gás azul atrás do ombro (Tonho). */
const gasCylinder = (k, c) => {
  const R = c.rampOf('#4a6ad0');
  const lit = c.tube(1, 19, 1.2, 6.2);
  k.form((x, y) => x >= 2 && x <= 17 && y >= 44 && y <= 83 && !(y < 47 && (x < 4 + (47 - y) || x > 15 - (47 - y))), (x, y) => lit(x) - (y === 58 || y === 59 ? 1.6 : 0), R, { edge: 1, rim: 5, noise: 0.2 });
  slab(k, c, 7, 38, 12, 43, '#9aa2a8', 'metal', (x) => (x < 10 ? 5.6 : 3));
  k.rect(5, 40, 10, 1, c.rampOf('#9aa2a8', 'metal')[6]);
  k.rect(4, 61, 12, 2, c.hex('#f0e8d0'));
  k.rect(4, 63, 12, 1, c.hex('#b8ac8a'));
};

/** Taco de sinuca em pé, com o giz azul (Baiano). */
const cue = (k, c) => {
  rod(k, c, 72, 83, 78, 6, '#c8a060');
  k.rect(77, 2, 3, 4, c.hex('#f4f0e6'));
  k.rect(77, 1, 3, 2, c.hex('#3a6ad0'));
  k.put(77, 1, c.hex('#8ab0ff'));
  slab(k, c, 68, 66, 74, 70, '#3a6ad0');
};

/** Pneu atrás do ombro direito (Valdir). */
const tire = (k, c) => {
  const R = c.rampOf('#2a2a2e');
  k.form(c.ell(72, 56, 14, 15), (x, y) => c.ball(72, 56, 14, 15, 1, 5.6)(x, y) + (Math.sin(Math.atan2(y - 56, x - 72) * 14) > 0.3 ? -1.2 : 0.5), R, { edge: 0, rim: 5, noise: 0.2 });
  disc(k, c, 72, 56, 7.4, 8, '#16161a', 'cloth', 0, 2);
  disc(k, c, 72, 56, 5, 5.4, '#9aa2a8', 'metal');
  disc(k, c, 72, 56, 1.8, 1.8, '#3a3e44', 'metal', 0, 3);
};

/** Pedra de dominó grande na mão (Seu Arlindo). */
const bigTile = (k, c) => {
  k.rect(3, 48, 14, 28, c.hex('#1a0e06'));
  slab(k, c, 4, 49, 15, 74, '#f2e8c8', 'cloth', (x, y) => 5.4 - (x > 12 ? 1.4 : 0) - (y > 71 ? 1.2 : 0));
  k.rect(5, 61, 10, 1, c.hex('#6a5638'));
  k.rect(5, 62, 10, 1, c.hex('#fffaf0'));
  for (const [px, py] of [
    [6, 51],
    [12, 51],
    [6, 57],
    [12, 57],
    [9, 54],
    [6, 65],
    [9, 68],
    [12, 71],
  ]) {
    k.rect(px, py, 2, 2, c.hex('#1a1008'));
    k.put(px + 1, py + 1, c.hex('#4a3a2a'));
  }
};

/** Gancho de guincho com a corrente (Marcão). */
const towHook = (k, c) => {
  const R = c.rampOf('#8a949c', 'metal');
  for (let y = 36; y < 62; y += 4) {
    k.rect(7, y, 4, 3, R[2]);
    k.rect(7, y, 3, 1, R[6]);
    k.put(8, y + 1, R[0]);
    k.rect(8, y + 3, 2, 1, R[1]);
  }
  k.form((x, y) => Math.abs(Math.hypot(x + 0.5 - 9, y + 0.5 - 67) - 4.6) <= 1.6 && !(x > 9 && y < 66), (x, y) => (x < 8 ? 5.6 : 3) - (y > 68 ? 1 : 0), R, { edge: 1, noise: 0.1 });
};

/** Concha de feijão (Cida). */
const ladle = (k, c) => {
  rod(k, c, 70, 83, 76, 46, '#9aa2a8', 'metal');
  disc(k, c, 76.5, 41, 6.4, 4.6, '#9aa2a8', 'metal');
  disc(k, c, 76.5, 40.2, 4.6, 2.6, '#5a2a14', 'cloth', 1, 4.6);
};

/** Caneta atrás da orelha. */
const earPen = (color) => (k, c) => {
  const R = c.rampOf(color);
  k.line(58, 31, 64, 21, R[5]);
  k.line(59, 31, 65, 21, R[2]);
  k.put(65, 20, c.hex('#f4f0e6'));
  k.put(64, 20, c.hex('#c8c0b0'));
};

/** A navalha (Tião). */
const razor = (k, c) => {
  slab(k, c, 5, 62, 8, 76, '#3a2010');
  k.line(7, 61, 13, 46, c.hex('#eef4f8'));
  k.line(8, 61, 14, 46, c.hex('#aab4bc'));
  k.line(9, 61, 15, 47, c.hex('#5a6168'));
  k.put(14, 45, c.hex('#ffffff'));
};

const fingers = (k, c, x, y, n = 3) => {
  for (let i = 0; i < n; i += 1) {
    k.rect(x + i * 3, y, 2, 4, c.S[i === 0 ? 5 : 4]);
    k.put(x + i * 3 + 2, y + 1, c.S[1]);
    k.rect(x + i * 3, y + 4, 2, 1, c.S[2]);
  }
};

/** Moeda de ouro entre os dedos (Beto). */
const goldCoin = (k, c) => {
  disc(k, c, 70.5, 70, 3.8, 3.8, '#e6c34a', 'metal');
  k.put(69, 68, c.hex('#fff6d0'));
  k.form(c.ell(71, 78, 6, 4.6), c.ball(71, 78, 6, 4.6, 1.5, 5.4), c.S, { edge: 1, noise: 0.15 });
  fingers(k, c, 66, 72);
};

/** Carteira saindo do bolso (Carlinhos). */
const wallet = (k, c) => {
  slab(k, c, 62, 64, 71, 68, '#6a9a5a', 'cloth', (x, y) => (y === 65 ? 6 : 4.4));
  slab(k, c, 60, 68, 74, 78, '#5a3418', 'cloth', (x, y) => (y < 71 ? 5.6 : 4) - (x > 70 ? 1 : 0));
  k.put(67, 73, c.hex('#e6c34a'));
};

/** Bola de cristal (Madama Sofia). */
const crystalBall = (k, c) => {
  slab(k, c, 20, 80, 40, 83, '#5a3a12');
  const R = c.rampOf('#8a6ae0');
  k.form(c.ell(30, 71, 10.5, 10), (x, y) => c.ball(30, 71, 10.5, 10, 1.4, 6.2)(x, y) + (Math.sin(x * 0.7 + y * 0.9) > 0.75 ? 1 : 0), R, { edge: 1, rim: 6, noise: 0.35, seed: 3 });
  k.put(25, 65, c.hex('#ffffff'));
  k.put(26, 64, c.hex('#ffffff'));
  k.put(26, 65, c.hex('#f0e8ff'));
  k.put(27, 64, c.hex('#f0e8ff'));
  k.put(34, 76, c.hex('#d0b8ff'));
};

/** Frasco de poção (Doutor Fausto). */
const potion = (k, c) => {
  slab(k, c, 69, 58, 72, 63, '#d8e0e4', 'metal');
  k.rect(68, 57, 6, 1, c.hex('#8a5a2a'));
  disc(k, c, 70.5, 70.5, 6.4, 7, '#3ae06a', 'cloth', 1.4, 6.2);
  k.rect(65, 64, 11, 2, c.hex('#c8ecd4'));
  k.put(67, 67, c.hex('#f0fff0'));
  k.put(68, 66, c.hex('#f0fff0'));
};

/** Chave inglesa (Alemão). */
const wrench = (k, c) => {
  rod(k, c, 68, 83, 77, 54, '#9aa2a8', 'metal', true);
  const R = c.rampOf('#9aa2a8', 'metal');
  k.form((x, y) => Math.hypot(x + 0.5 - 78.5, y + 0.5 - 49) <= 5.4 && !(x >= 77 && x <= 79 && y < 49), (x, y) => (x < 78 ? 5.8 : 3.2) - (y > 50 ? 1 : 0), R, { edge: 1, noise: 0.1 });
};

/** Pá de coveiro (Geraldo). */
const shovel = (k, c) => {
  rod(k, c, 72, 83, 76, 44, '#6a4a2a', 'cloth', true);
  const R = c.rampOf('#7a848c', 'metal');
  k.form((x, y) => x >= 70 && x <= 84 && y >= 24 && y <= 44 && !(y < 28 && Math.abs(x - 77) > 3 + (y - 24) * 1.4) && !(y > 40 && Math.abs(x - 77) > 7 - (y - 40) * 1.5), (x, y) => (x < 77 ? 5.4 : 3.4) - (x === 77 ? 1.8 : 0) - (y > 38 ? 0.6 : 0), R, { edge: 1, rim: 6, noise: 0.25 });
};

/** Chicote enrolado (Zeca). */
const whip = (k, c) => {
  const R = c.rampOf('#8a5a2a');
  for (let a = 0; a < Math.PI * 4.4; a += 0.06) {
    const r = 2.5 + a * 0.62;
    const x = 71 + Math.cos(a) * r;
    const y = 66 + Math.sin(a) * r * 0.9;
    k.put(x, y, R[Math.sin(a) < -0.2 ? 6 : Math.cos(a) > 0.3 ? 2 : 4]);
  }
  slab(k, c, 69, 74, 72, 83, '#5a3418');
};

/** Talão de rifa (Genésio). */
const raffle = (k, c) => {
  slab(k, c, 60, 64, 75, 77, '#f4e8b0', 'cloth', (x, y) => 5.6 - (x > 72 ? 1.2 : 0) - (y > 75 ? 1.4 : 0));
  k.rect(61, 65, 14, 2, c.hex('#b8261c'));
  k.rect(61, 65, 14, 1, c.hex('#e04a3a'));
  for (let x = 62; x < 74; x += 2) k.put(x, 71, c.hex('#3a2a10'));
  for (let x = 62; x < 72; x += 2) k.put(x, 74, c.hex('#8a7a48'));
};

/** Chave da van com o chaveiro (Marquinhos). */
const vanKey = (k, c) => {
  disc(k, c, 66, 71, 3.6, 3.6, '#c9962e', 'metal');
  k.put(66, 71, c.hex('#3a2408'));
  const R = c.rampOf('#9aa2a8', 'metal');
  k.rect(69, 70, 8, 1, R[6]);
  k.rect(69, 71, 8, 1, R[2]);
  k.rect(74, 72, 1, 2, R[3]);
  k.rect(76, 72, 1, 1, R[3]);
};

/** O cassetete (Brandão). */
const baton = (k, c) => rod(k, c, 70, 83, 79, 52, '#3a3a40', 'metal', true);

/** Caderninho de pontos e o lápis (Nelsinho). */
const scorePad = (k, c) => {
  slab(k, c, 60, 62, 73, 79, '#f4f0e6', 'cloth', (x, y) => 5.8 - (x > 70 ? 1 : 0) - (y > 77 ? 1.4 : 0));
  for (let y = 66; y < 78; y += 3) k.rect(62, y, 10, 1, c.hex('#8aa8c8'));
  k.rect(63, 68, 3, 1, c.hex('#1a1a1a'));
  k.rect(63, 74, 6, 1, c.hex('#1a1a1a'));
  rod(k, c, 75, 80, 78, 60, '#e6c34a');
  k.put(78, 59, c.hex('#f0b0a0'));
};

/** Livro-caixa da agiota (Odete). */
const ledger = (k, c) => {
  slab(k, c, 58, 64, 76, 80, '#6a1e30', 'cloth', (x, y) => (y < 67 ? 6 : 4.4) - (x > 72 ? 1.2 : 0));
  k.rect(75, 66, 1, 14, c.hex('#f4f0e6'));
  k.rect(63, 70, 8, 1, c.hex('#f0ca4d'));
  k.rect(63, 71, 8, 1, c.hex('#9a5d0a'));
};

/** O pano de balcão no ombro (Valtinho Renegado). */
const barTowel = (k, c) => {
  const tone = (x, y) => 5.8 - (x > 66 ? 1.2 : 0) - ((x + y) % 5 === 0 ? 1 : 0);
  slab(k, c, 55, 58, 71, 63, '#e8e0d0', 'cloth', tone);
  slab(k, c, 58, 63, 66, 76, '#e8e0d0', 'cloth', tone);
  k.rect(56, 60, 15, 1, c.hex('#b8261c'));
  k.rect(59, 72, 7, 1, c.hex('#b8261c'));
};

/** Os olhos vermelhos que brilham no escuro (o Dono da Noite e o Corvo). */
const nightEyes = (k, c) => {
  if (c.mood === 'blink') return; // os olhos vermelhos apagam
  const y = c.mood === 'hurt' ? 34 : 33;
  const red = c.hex('#ff2a1a');
  for (const x0 of [35, 48]) {
    for (let x = x0 - 2; x <= x0 + 6; x += 1) for (let dy = -2; dy <= 2; dy += 1) if (Math.abs(x - x0 - 2) / 4.5 + Math.abs(dy) / 2.6 <= 1) k.tint(x, y + dy, red, 0.3);
    k.rect(x0, y, 5, 1, red);
    k.rect(x0 + 1, y - 1, 3, 1, c.mood === 'smug' ? c.hex('#a0140c') : red);
    k.rect(x0 + 1, y, 3, 1, c.hex('#ffb070'));
    k.put(x0 + 2, y, c.hex('#fff0d0'));
  }
};

/** O mesmo objeto `dy` pixels mais para cima (o que está na mão sobe para aparecer acima da mesa). */
const raised = (fn, dy) => (k, c) => {
  const up = {
    ...k,
    put: (x, y, col, a) => k.put(x, y - dy, col, a),
    tint: (x, y, col, a) => k.tint(x, y - dy, col, a),
    rect: (x, y, w, h, col, a) => k.rect(x, y - dy, w, h, col, a),
    line: (x0, y0, x1, y1, col, a) => k.line(x0, y0 - dy, x1, y1 - dy, col, a),
    form: (test, tone, R, o = {}) => k.form((x, y) => test(x, y + dy), typeof tone === 'function' ? (x, y) => tone(x, y + dy) : tone, R, { ...o, y0: o.y0 == null ? undefined : o.y0 - dy, y1: o.y1 == null ? undefined : o.y1 - dy }),
  };
  fn(up, c);
};

// ---------------------------------------------------------------------------
// As fichas
// ---------------------------------------------------------------------------

export const PORTRAITS = {
  tioZe: {
    nose: 'big', eyes: 'tired',
    seed: 1,
    bg: ['#4a3420', '#1e140c'],
    bgPattern: 'wood',
    skin: '#c88a5a',
    jaw: 'square',
    hair: { style: 'short', color: '#2a1a10' },
    hat: { type: 'fedora', color: '#5a3a22', band: '#2a1a10' },
    facial: { mustache: 'big', color: '#2a1a10' },
    outfit: { type: 'shirt', color: '#2e2a26', collar: '#4a443e' },
    front: cigarette,
  },
  tonho: {
    browShape: 'arched',
    seed: 2,
    bg: ['#2a3a6a', '#101830'],
    bgPattern: 'brick',
    skin: '#d89a6a',
    jaw: 'round',
    hair: { style: 'short', color: '#3a2412' },
    hat: { type: 'cap', color: '#2f4fb0', visor: '#1e3480', emblem: '#ff8a2a' },
    facial: { mustache: 'thin', color: '#3a2412' },
    outfit: { type: 'uniform', color: '#2f4fb0', collar: '#1e3480', patch: '#ff8a2a', buttons: true, accent: '#e8e0c8' },
    behind: gasCylinder,
  },
  baiano: {
    eyes: 'sleepy',
    seed: 3,
    bg: ['#3a4a22', '#141c0c'],
    bgPattern: 'stripes',
    skin: '#7a4a2a',
    jaw: 'long',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'safari', color: '#e0d0a8', band: '#5a3a22' },
    facial: { stubble: true, color: '#1a1008' },
    outfit: { type: 'shirt', color: '#6a7a3a', collar: '#4a5a2a', buttons: true, accent: '#e6c34a' },
    iris: '#2a1a0a',
    front: cue,
  },
  valdir: {
    nose: 'big', browShape: 'angry',
    seed: 4,
    bg: ['#4a4e52', '#1a1c1e'],
    bgPattern: 'brick',
    skin: '#c08060',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'short', color: '#2a2a2a' },
    hat: { type: 'beanie', color: '#6a6e72' },
    facial: { stubble: true, color: '#2a2018' },
    outfit: { type: 'uniform', color: '#8a8e92', collar: '#5a5e62', patch: '#d02a2a' },
    behind: tire,
    front: (b, ctx) => {
      if (ctx.mood === 'hurt') return;
      b.line(36, 38, 42, 36, ctx.hex('#e0c890'));
    },
  },
  neide: {
    browShape: 'soft', eyes: 'lashes', earrings: 'pearl',
    seed: 5,
    bg: ['#5a1e2a', '#200a10'],
    bgPattern: 'curtain',
    skin: '#e0aa88',
    jaw: 'round',
    hair: { style: 'bun', color: '#c8c8c8' },
    glasses: { type: 'square', color: '#a8141c' },
    lip: '#c3254a',
    blush: '#e06a6a',
    wrinkles: true,
    outfit: { type: 'cardigan', color: '#6a1a2a', collar: '#f0e8d8', jabot: true },
  },
  arlindo: {
    nose: 'big',
    seed: 6,
    bg: ['#6a4a1a', '#2a1a08'],
    bgPattern: 'frame',
    skin: '#e0a888',
    jaw: 'round',
    hair: { style: 'volume', color: '#e8e8e8' },
    hat: { type: 'crown' },
    facial: { mustache: 'big', beard: 'full', color: '#f0f0f0' },
    wrinkles: true,
    outfit: { type: 'suit', color: '#e8e4d8', accent: '#d8d0c0', shirt: '#ffffff', bow: '#c02a2a' },
    behind: bigTile,
  },
  marcao: {
    browShape: 'angry', thickBrows: true,
    seed: 7,
    bg: ['#5a4a1a', '#1e1808'],
    bgPattern: 'stripes',
    skin: '#a06a42',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'helmet', color: '#e88a1a', band: '#2a2a2a' },
    facial: { beard: 'full', color: '#1a1008' },
    outfit: { type: 'uniform', color: '#e8b81a', collar: '#c8981a', stripes: '#e8e8e8' },
    behind: towHook,
  },
  serginho: {
    browShape: 'arched',
    seed: 8,
    bg: ['#6a3a1a', '#24120a'],
    bgPattern: 'tiles',
    skin: '#d8a070',
    jaw: 'thin',
    hair: { style: 'short', color: '#2a1a10' },
    hat: { type: 'cap', color: '#d82a2a', visor: '#a01a1a', emblem: '#ffffff' },
    outfit: { type: 'jersey', color: '#e8781a', collar: '#ffffff', number: '22' },
    front: earPen('#2a6ad0'),
  },
  cida: {
    eyes: 'lashes',
    seed: 9,
    bg: ['#4a1a3a', '#1a0a16'],
    bgPattern: 'tiles',
    skin: '#e8b090',
    jaw: 'round',
    hair: { style: 'curly', color: '#e86a2a' },
    lip: '#c03a4a',
    blush: '#e86a6a',
    outfit: { type: 'apron', color: '#8a2a6a', accent: '#f0e0f0', plaid: '#f0c0e0' },
    behind: ladle,
  },
  paulinho: {
    eyes: 'narrow',
    seed: 10,
    bg: ['#1a4a4a', '#081818'],
    bgPattern: 'plain',
    skin: '#a87048',
    jaw: 'long',
    hair: { style: 'slick', color: '#141414' },
    facial: { mustache: 'thin', color: '#141414' },
    thickBrows: true,
    iris: '#1a3a2a',
    outfit: { type: 'shirt', color: '#2a7a7a', collar: '#1a5a5a', badge: true },
    front: earPen('#e6c34a'),
  },
  tiao: {
    nose: 'hook', browShape: 'angry', eyes: 'narrow',
    seed: 11,
    bg: ['#5a1a1a', '#1e0808'],
    bgPattern: 'stripes',
    skin: '#c08058',
    jaw: 'long',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'panama', color: '#f0ecd8', band: '#c02a2a' },
    facial: { mustache: 'thin', color: '#1a1008' },
    scar: true,
    goldTooth: true,
    outfit: { type: 'shirt', color: '#f0ecd8', collar: '#ffffff', stripes: '#c02a2a' },
    behind: razor,
  },
  beto: {
    browShape: 'angry',
    seed: 12,
    bg: ['#1a1e4a', '#08081e'],
    bgPattern: 'curtain',
    skin: '#a06a42',
    jaw: 'square',
    hair: { style: 'long', color: '#141018' },
    hat: { type: 'fedora', color: '#1e2460', band: '#e6c34a' },
    facial: { beard: 'full', mustache: 'big', color: '#141018' },
    iris: '#2aa060',
    outfit: { type: 'suit', color: '#1e2460', accent: '#2a3480', shirt: '#4a2a8a', chain: true, medal: true },
    earrings: 'hoop',
    front: raised(goldCoin, 12),
  },
  carlinhos: {
    eyes: 'narrow', browShape: 'arched',
    seed: 13,
    bg: ['#1e3a24', '#08140a'],
    bgPattern: 'brick',
    skin: '#a87048',
    jaw: 'thin',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'beanie', color: '#2a7a3a' },
    facial: { stubble: true, color: '#1a1008' },
    outfit: { type: 'jacket', color: '#2a3a2a', accent: '#3a4a3a', shirt: '#4a4a4a' },
    front: raised(wallet, 12),
  },
  bigode: {
    nose: 'big',
    seed: 14,
    bg: ['#4a3a0a', '#1a1404'],
    bgPattern: 'frame',
    skin: '#d8a070',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'slick', color: '#141414' },
    glasses: { type: 'gold', color: '#e6c34a' },
    facial: { mustache: 'gold', color: '#e6b82a' },
    goldTooth: true,
    outfit: { type: 'shirt', color: '#c8981a', collar: '#e6c34a', plaid: '#5a3a08', chain: true },
  },
  sofia: {
    eyes: 'lashes', browShape: 'arched',
    seed: 15,
    bg: ['#2a1a4a', '#0a0618'],
    bgPattern: 'stars',
    skin: '#c88a6a',
    jaw: 'thin',
    hair: { style: 'long', color: '#1a1020' },
    hat: { type: 'turban', color: '#7a3ac8' },
    lip: '#a02a5a',
    iris: '#6a3ac8',
    outfit: { type: 'robe', color: '#5a2aa8', collar: '#e6c34a' },
    earrings: 'hoop',
    front: raised(crystalBall, 12),
  },
  fausto: {
    nose: 'hook', browShape: 'arched', eyes: 'tired',
    seed: 16,
    bg: ['#2a2a30', '#0a0a0e'],
    bgPattern: 'curtain',
    skin: '#e0dcd0',
    jaw: 'long',
    hair: { style: 'slick', color: '#0e0e12' },
    iris: '#4ad0e0',
    lip: '#7a3a4a',
    outfit: { type: 'suit', color: '#1a1a1e', accent: '#2a2a30', shirt: '#f0f0f0', tie: '#a01a2a' },
    front: raised(potion, 12),
  },
  alemao: {
    nose: 'big', thickBrows: true,
    seed: 17,
    bg: ['#4a3420', '#1a120a'],
    bgPattern: 'brick',
    skin: '#e8b090',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'short', color: '#e8c050' },
    hat: { type: 'goggles' },
    facial: { beard: 'long', mustache: 'big', color: '#e0b840' },
    iris: '#3a6ab0',
    blush: '#e07a6a',
    outfit: { type: 'jacket', color: '#6a4220', accent: '#8a5a2a', shirt: '#3a3a3a' },
    front: wrench,
  },
  comendador: {
    nose: 'hook', eyes: 'sleepy',
    seed: 18,
    bg: ['#5a1010', '#1e0404'],
    bgPattern: 'frame',
    skin: '#e8b898',
    jaw: 'square',
    hair: { style: 'slick', color: '#e0e0e0' },
    facial: { mustache: 'handlebar', color: '#f0f0f0' },
    glasses: { type: 'monocle', color: '#e6c34a' },
    wrinkles: true,
    outfit: { type: 'suit', color: '#8a1a1a', accent: '#e6c34a', shirt: '#ffffff', bow: '#1a1a1a' },
    front: cigar,
  },
  donoDaNoite: {
    rim: '#ff3a1a',
    seed: 19,
    bg: ['#2a0808', '#060202'],
    bgPattern: 'curtain',
    glow: '#ff2a1a',
    skin: '#0e0a0a',
    jaw: 'long',
    hair: { style: 'short', color: '#060606' },
    hat: { type: 'wide', color: '#0e0a0a', band: '#4a0a0a' },
    iris: '#0e0a0a',
    lip: '#0e0a0a',
    outfit: { type: 'coat', color: '#0e0a0a', accent: '#1e1414', shirt: '#2a0a0a' },
    front: nightEyes,
  },
  voJuca: {
    nose: 'big', browShape: 'sad',
    seed: 20,
    bg: ['#3a4a2a', '#141a0e'],
    bgPattern: 'wood',
    skin: '#e0a888',
    jaw: 'round',
    hair: { style: 'bald', color: '#e8e8e8' },
    hat: { type: 'flatcap', color: '#8a6a3a' },
    facial: { mustache: 'big', color: '#f0f0f0' },
    glasses: { type: 'round', color: '#c9962e' },
    wrinkles: true,
    outfit: { type: 'cardigan', color: '#c8a868', collar: '#2a6a3a' },
  },
  juvenal: {
    eyes: 'tired',
    seed: 21,
    bg: ['#3a3a40', '#121216'],
    bgPattern: 'stripes',
    skin: '#d8a888',
    jaw: 'square',
    hair: { style: 'side', color: '#2a2018' },
    glasses: { type: 'square', color: '#3a3a3a' },
    outfit: { type: 'suit', color: '#5a5e66', accent: '#6a6e76', shirt: '#f0f0f0', tie: '#2a3a8a' },
    front: earPen('#2a3a8a'),
  },
  zeca: {
    browShape: 'angry',
    seed: 22,
    bg: ['#4a3a1e', '#1a140a'],
    bgPattern: 'wood',
    skin: '#c08058',
    jaw: 'round',
    hair: { style: 'short', color: '#3a2412' },
    hat: { type: 'straw', color: '#e0c070', band: '#8a2a1a' },
    facial: { mustache: 'big', color: '#3a2412' },
    outfit: { type: 'shirt', color: '#5a7ab0', collar: '#d02a2a', plaid: '#2a3a6a' },
    front: raised(whip, 12),
  },
  genesio: {
    eyes: 'sleepy',
    seed: 23,
    bg: ['#5a3a1a', '#1e1208'],
    bgPattern: 'tiles',
    skin: '#e0a888',
    jaw: 'round',
    hair: { style: 'short', color: '#4a2a12' },
    hat: { type: 'cap', color: '#b8261c', visor: '#8a1a10', ticket: true },
    facial: { mustache: 'thin', color: '#4a2a12' },
    goldTooth: true,
    outfit: { type: 'shirt', color: '#c8981a', collar: '#2a8a4a', plaid: '#5a3a08' },
    front: raised(raffle, 12),
  },
  marquinhos: {
    eyes: 'sleepy', browShape: 'arched',
    seed: 24,
    bg: ['#3a2a1a', '#140e08'],
    bgPattern: 'brick',
    skin: '#8a5a38',
    jaw: 'thin',
    hair: { style: 'short', color: '#141414' },
    hat: { type: 'cap', color: '#d82a2a', visor: '#a01a1a' },
    goldTooth: true,
    outfit: { type: 'tank', color: '#f0f0f0', shirt: '#f0f0f0', chain: true },
    front: raised(vanKey, 12),
  },
  nelsinho: {
    browShape: 'sad',
    seed: 25,
    bg: ['#1a3a24', '#08140c'],
    bgPattern: 'stripes',
    skin: '#d8a070',
    jaw: 'round',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'headband', color: '#f4f0e6' },
    outfit: { type: 'jersey', color: '#2a8a3a', collar: '#ffffff', number: '71' },
    front: raised(scorePad, 12),
  },
  soro: {
    eyes: 'lashes', browShape: 'arched',
    seed: 26,
    bg: ['#4a1a3a', '#1a0814'],
    bgPattern: 'neon',
    neon: '#ff4ad0',
    skin: '#f0c0a0',
    jaw: 'thin',
    hair: { style: 'bob', color: '#a83ad0' },
    lip: '#e02a6a',
    iris: '#6a2aa8',
    blush: '#ff7aa0',
    outfit: { type: 'robe', color: '#2a1a2a', collar: '#ff8ad0', boa: '#ff9ad8' },
  },
  brandao: {
    browShape: 'angry', thickBrows: true,
    seed: 27,
    bg: ['#1e2a4a', '#080c1a'],
    bgPattern: 'brick',
    skin: '#c88a5a',
    jaw: 'square',
    broad: true,
    hair: { style: 'crew', color: '#1a1008' },
    hat: { type: 'police', color: '#1e2a5a', visor: '#0e1430', band: '#0e1430', emblem: '#e6c34a' },
    facial: { mustache: 'big', color: '#1a1008' },
    outfit: { type: 'uniform', color: '#1e2a5a', collar: '#2a3a7a', badge: true, buttons: true, accent: '#e6c34a' },
    behind: baton,
  },
  geraldo: {
    browShape: 'sad', eyes: 'tired', nose: 'hook',
    seed: 28,
    bg: ['#2a2e2a', '#0a0c0a'],
    bgPattern: 'stars',
    glow: '#a0b0a0',
    skin: '#b8b8a8',
    jaw: 'long',
    hair: { style: 'thin', color: '#5a5a54' },
    hat: { type: 'fedora', color: '#2a2a2a', band: '#1a1a1a' },
    iris: '#4a4a40',
    outfit: { type: 'coat', color: '#2a2e2a', accent: '#3a3e3a', shirt: '#5a5e5a' },
    behind: shovel,
  },
  odete: {
    eyes: 'narrow', browShape: 'arched', nose: 'hook',
    seed: 29,
    bg: ['#2a1a3a', '#0e0814'],
    bgPattern: 'curtain',
    skin: '#e0b098',
    jaw: 'thin',
    hair: { style: 'bun', color: '#b8b8c0' },
    glasses: { type: 'square', color: '#a02a8a' },
    lip: '#8a2a5a',
    wrinkles: true,
    outfit: { type: 'cardigan', color: '#4a1a5a', collar: '#2a0e34', pearls: true },
    front: raised(ledger, 12),
  },
  valtinhoRenegado: {
    browShape: 'angry',
    seed: 30,
    bg: ['#3a2a1a', '#140e08'],
    bgPattern: 'wood',
    skin: '#c88a5a',
    jaw: 'square',
    hair: { style: 'side', color: '#1a1008' },
    facial: { mustache: 'big', stubble: true, color: '#1a1008' },
    scar: true,
    outfit: { type: 'jacket', color: '#5a3418', accent: '#3a2010', shirt: '#e8e0d0' },
    front: barTowel,
  },
};

/** De onde sai a fumaça (na grade do retrato, 64) de quem fuma; no hurt o cigarro cai. */
export const PORTRAIT_EMBER = Object.freeze({
  tioZe: Object.freeze({ x: 46, y: 47, grid: 64, moods: ['idle', 'thinking', 'smug'] }),
  comendador: Object.freeze({ x: 48, y: 47, grid: 64, moods: ['idle', 'thinking', 'smug'] }),
});

/**
 * Versão 2.17: os olhos que brilham de verdade (uma luz vermelha que pulsa por cima do desenho),
 * na grade do retrato (64): o chefe secreto, o Dono da Noite.
 */
export const PORTRAIT_GLOW = Object.freeze({
  donoDaNoite: Object.freeze({ color: '#ff2a1a', grid: 64, eyes: Object.freeze([Object.freeze({ x: 25.5, y: 33.5 }), Object.freeze({ x: 38.5, y: 33.5 })]) }),
});

/** A mão do Seu Tião (a esquerda dele) segurando a moeda de ouro reluzente. */
const coinHand = (k, c) => {
  k.form(c.ell(70, 76, 6.4, 5), c.ball(70, 76, 6.4, 5, 1.5, 5.6), c.S, { edge: 1, noise: 0.15 });
  fingers(k, c, 65, 69, 4);
  disc(k, c, 70.5, 65, 4.6, 4.6, '#e6c34a', 'metal');
  k.put(69, 63, c.hex('#fff6d0'));
  k.put(68, 64, c.hex('#fff6d0'));
  k.put(75, 59, c.hex('#ffffff'));
  k.put(76, 58, c.hex('#fff6c0'), 0.7);
};

/** Versão 2.2: os atendentes (Loja do Valtinho, Seu Tião no porão, o Corvo no beco), só a figura. */
export const NPC_PORTRAITS = {
  valtinho: {
    seed: 41,
    skin: '#c8875a',
    jaw: 'square',
    hair: { style: 'slick', color: '#141010' },
    facial: { mustache: 'thin', stubble: true, color: '#141010' },
    eyes: 'sleepy',
    browShape: 'arched',
    restMood: 'smug',
    goldTooth: true,
    rim: '#ffd890',
    outfit: { type: 'tank', color: '#efefe8', shirt: '#efefe8', chain: true },
    front: cigarette,
  },
  seuTiao: {
    seed: 42,
    skin: '#d8a07a',
    jaw: 'long',
    hair: { style: 'thin', color: '#e8e8e8' },
    hat: { type: 'fedora', color: '#7a7c80', band: '#3a3a3e' },
    facial: { beard: 'long', mustache: 'big', color: '#f0f0ec' },
    wrinkles: true,
    eyes: 'tired',
    nose: 'big',
    browShape: 'sad',
    restMood: 'smug',
    rim: '#ffe2a8',
    outfit: { type: 'coat', color: '#6a4422', accent: '#5a381a', shirt: '#c8b898', scarf: '#c42a22', tears: true },
    front: raised(coinHand, 12),
  },
  corvo: {
    seed: 43,
    skin: '#3a2a2a',
    jaw: 'long',
    hair: { style: 'none' },
    hat: { type: 'hood', color: '#22202a' },
    iris: '#120a0a',
    lip: '#1a0e0e',
    goldTooth: true,
    restMood: 'smug',
    rim: '#ff3a2a',
    outfit: { type: 'coat', color: '#1e1c24', accent: '#2c2834', shirt: '#3a1626' },
    front: nightEyes,
  },
};

/** Onde fica a brasa do cigarro do Valtinho e a moeda do Seu Tião (na grade do retrato, 64). */
export const NPC_SPOTS = Object.freeze({ valtinhoEmber: Object.freeze({ x: 46, y: 46 }), tiaoCoin: Object.freeze({ x: 58, y: 53 }) });
