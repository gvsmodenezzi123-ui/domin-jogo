/**
 * Versão 2.0: as 5 maletas do Balcão em 128×128, pintadas em pixel art de alta densidade
 * (o mesmo buffer da mesa, art/botecoScene.js → paintKit), vistas de frente e do alto (2.5D):
 *
 *   fechada   o tampo (a tampa por fora) em perspectiva, a frente com o friso da tampa, os
 *             fechos, a alça, as cantoneiras e o emblema
 *   tampa     a tampa aberta, de pé, por dentro: a moldura da casca e o forro (é nela que
 *             ficam presas as fichas de dificuldade)
 *   bandeja   a base aberta vista do alto: o forro com os compartimentos e o que vem dentro
 *             (pedras na Clássica, maços de nota no Bicheiro, chumbo e ferramenta na
 *             Borracharia, cartas e fundo falso no Trapaceiro, cantil e charque na Seca)
 *
 * A aberta é a tampa (em cima) mais a bandeja (embaixo): no CSS a tampa gira em rotateX a
 * partir da dobradiça (2.5D). Também a corrente e o cadeado das trancadas, e as fichas.
 */
import { paintKit } from './botecoScene.js';

const { hex, shift, rngOf, buffer } = paintKit;

export const CASE_PX = 128;
/** A dobradiça: a linha onde a tampa encontra a base (fundo do tampo / da bandeja). */
export const HINGE_Y = 50;
const FRONT_Y = 90;
const BOTTOM_Y = 118;
const INK = hex('#0b0705');

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v) => Math.max(0, Math.min(255, v));
const clampRgb = (c) => [clamp(c[0]), clamp(c[1]), clamp(c[2])];

/** Contorno de 1 px (vizinhança de 4) em volta do que foi pintado. */
function outline(b) {
  const marks = [];
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      if (b.data[(y * b.w + x) * 4 + 3] > 0) continue;
      const near = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => nx >= 0 && ny >= 0 && nx < b.w && ny < b.h && b.data[(ny * b.w + nx) * 4 + 3] > 200);
      if (near) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) b.put(x, y, INK);
}

/** O tampo/bandeja em perspectiva: de y0 (fundo, mais estreito) a y1 (frente, mais largo). */
const TOP = { y0: HINGE_Y, y1: FRONT_Y, l0: 14, r0: 113, l1: 8, r1: 119 };
const edgesAt = (y) => {
  const t = (y - TOP.y0) / (TOP.y1 - TOP.y0);
  return [Math.round(TOP.l0 + (TOP.l1 - TOP.l0) * t), Math.round(TOP.r0 + (TOP.r1 - TOP.r0) * t)];
};

function trapezoid(b, y0, y1, fn) {
  for (let y = y0; y < y1; y += 1) {
    const [l, r] = edgesAt(y);
    for (let x = l; x <= r; x += 1) fn(x, y, (x - l) / (r - l), (y - y0) / Math.max(1, y1 - y0 - 1), l, r);
  }
}

// ---------------------------------------------------------------------------
// Materiais das cascas
// ---------------------------------------------------------------------------

const MAT = {
  classica: {
    shell: ['#f4e8c8', '#d9c8a0', '#a8946a', '#5a4a30'],
    trim: ['#fff0a8', '#d9a531', '#8a6214', '#3a2808'],
    lining: ['#a02838', '#741826', '#4a0c16'],
    texture: (x, y, r) => (Math.sin(y * 0.9 + Math.sin(x * 0.08) * 2) > 0.8 ? -14 : 0) + (r() - 0.5) * 6,
  },
  bicheiro: {
    shell: ['#5aa05a', '#2f6a34', '#1e4a22', '#0c2410'],
    trim: ['#fff0a8', '#d9a531', '#8a6214', '#3a2808'],
    lining: ['#3a6a3a', '#244a26', '#123016'],
    // couro de crocodilo: escamas em grade desencontrada
    texture: (x, y, r) => {
      // escama arredondada: borda funda, miolo estufado com o brilho em cima
      const row = Math.floor(y / 5);
      const u = ((x + (row % 2) * 3) % 6) - 2.5;
      const v = (y % 5) - 2;
      const d = (u * u) / 7 + (v * v) / 5;
      if (d > 1) return -30;
      return (v < 0 && Math.abs(u) < 1.5 ? 20 : 4) - d * 14 + (r() - 0.5) * 5;
    },
  },
  borracharia: {
    shell: ['#5a5e62', '#2e3134', '#1c1e20', '#0a0b0c'],
    trim: ['#d8a070', '#9a5a2a', '#5a3214', '#2a1408'],
    lining: ['#6a6a60', '#4a4a42', '#2c2c26'],
    // borracha com o sulco de pneu em V
    texture: (x, y) => {
      const v = (x + Math.abs((y % 10) - 5) * 2) % 12;
      return v < 2 ? -22 : v === 2 ? 14 : 0;
    },
  },
  trapaceiro: {
    shell: ['#9a5ac8', '#5e2a8a', '#3e1660', '#1c0830'],
    trim: ['#fff0a8', '#d9a531', '#8a6214', '#3a2808'],
    lining: ['#2a2a34', '#1a1a22', '#0c0c12'],
    // veludo: um brilho que corre em diagonal
    texture: (x, y, r) => Math.sin((x + y) * 0.21) * 10 + (r() - 0.5) * 5,
  },
  seca: {
    shell: ['#e0b07a', '#b8844a', '#8a5a2c', '#4a2e12'],
    trim: ['#d0c8b8', '#9a9286', '#5e5850', '#2a2622'],
    lining: ['#b8a47a', '#948058', '#6a5838'],
    // couro cru rachado de sol
    texture: (x, y, r) => {
      const crack = Math.abs(Math.sin(x * 0.37 + Math.sin(y * 0.21) * 3)) < 0.05 || Math.abs(Math.sin(y * 0.43 + x * 0.05)) < 0.04;
      return crack ? -34 : (r() - 0.5) * 9;
    },
  },
};

function matOf(id) {
  const m = MAT[id] ?? MAT.classica;
  return { ...m, shell: m.shell.map(hex), trim: m.trim.map(hex), lining: m.lining.map(hex) };
}

// ---------------------------------------------------------------------------
// Peças comuns
// ---------------------------------------------------------------------------

/** A frente da maleta: friso (da tampa, se fechada), costura, sombra embaixo e as pontas. */
function paintFront(b, m, r, { closed }) {
  const [hi, mid, lo, deep] = m.shell;
  for (let y = FRONT_Y; y < BOTTOM_Y; y += 1) {
    for (let x = TOP.l1; x <= TOP.r1; x += 1) {
      let c;
      if (y === FRONT_Y) c = mix(hi, hex('#ffffff'), 0.25);
      else if (y === FRONT_Y + 1) c = hi;
      else if (y >= BOTTOM_Y - 3) c = y === BOTTOM_Y - 1 ? deep : lo;
      else if (x <= TOP.l1 + 1) c = mix(hi, mid, 0.5);
      else if (x >= TOP.r1 - 1) c = lo;
      else c = shift(mid, Math.round(m.texture(x, y, r)));
      // a frente fica um pouco mais escura que o tampo (a luz vem de cima)
      c = mix(c, lo, 0.18);
      b.put(x, y, clampRgb(c));
    }
  }
  // friso entre a tampa e a base (só fechada) e a costura em volta
  if (closed) {
    b.rect(TOP.l1 + 1, FRONT_Y + 7, TOP.r1 - TOP.l1 - 1, 1, deep);
    b.rect(TOP.l1 + 1, FRONT_Y + 8, TOP.r1 - TOP.l1 - 1, 1, mix(hi, mid, 0.4));
  }
  for (let x = TOP.l1 + 4; x < TOP.r1 - 3; x += 3) {
    b.put(x, BOTTOM_Y - 5, mix(hi, mid, 0.3), 0.8);
    if (closed) b.put(x, FRONT_Y + 4, mix(hi, mid, 0.3), 0.8);
  }
}

/** Cantoneira de metal num canto (`sx`, `sy`: para que lado ela abre). */
function cornerCap(b, x, y, sx, sy, trim) {
  const [hi, mid, lo] = trim;
  for (let k = 0; k < 6; k += 1) {
    for (let j = 0; j < 6 - k; j += 1) b.put(x + sx * j, y + sy * k, k === 0 || j === 0 ? hi : j + k > 4 ? lo : mid);
  }
  b.put(x + sx * 2, y + sy * 2, hex('#1a1008'));
}

/** Fecho: a chapa presa na base e a lingueta (fechada por cima do friso, ou virada aberta). */
function latch(b, x, trim, { open }) {
  const [hi, mid, lo, deep] = trim;
  const y = FRONT_Y + 2;
  // chapa da base
  b.rect(x - 5, y + 6, 11, 9, deep);
  b.rect(x - 4, y + 7, 9, 7, mid);
  b.rect(x - 4, y + 7, 9, 1, hi);
  b.rect(x - 4, y + 13, 9, 1, lo);
  b.put(x - 3, y + 8, hex('#fff6c8'));
  if (open) {
    // lingueta virada para baixo, solta
    b.rect(x - 3, y + 15, 7, 5, deep);
    b.rect(x - 2, y + 15, 5, 4, lo);
    b.rect(x - 2, y + 15, 5, 1, mid);
  } else {
    // lingueta fechada por cima do friso da tampa, com o pino
    b.rect(x - 3, y - 1, 7, 9, deep);
    b.rect(x - 2, y, 5, 8, mid);
    b.rect(x - 2, y, 5, 1, hi);
    b.rect(x - 2, y + 7, 5, 1, lo);
    b.put(x, y + 3, deep);
    b.put(x, y + 4, hex('#fff6c8'));
  }
}

/** A alça de couro na frente, com as duas presilhas de metal. */
function handle(b, trim, r) {
  const leather = [hex('#6a3a1a'), hex('#3a1e0c'), hex('#9a5a2a'), hex('#1a0c04')];
  const y = FRONT_Y + 9;
  for (let x = 50; x <= 78; x += 1) {
    const t = Math.abs(x - 64) / 14;
    const yy = Math.round(y + 3 + (1 - t * t) * 6);
    b.rect(x, yy - 3, 1, 4, leather[0]);
    b.put(x, yy - 3, leather[2]);
    b.put(x, yy, leather[3]);
    if (r() < 0.2) b.put(x, yy - 2, leather[1]);
  }
  for (const x of [48, 76]) {
    b.rect(x, y, 5, 6, trim[3]);
    b.rect(x + 1, y + 1, 3, 4, trim[1]);
    b.put(x + 1, y + 1, trim[0]);
  }
}

/** O tampo da maleta fechada: casca com textura, a luz da lâmpada, o friso e o emblema. */
function paintLidTop(b, id, m, r) {
  const [hi, mid, lo, deep] = m.shell;
  trapezoid(b, TOP.y0, TOP.y1, (x, y, u, v, l, rr) => {
    let c;
    if (y === TOP.y0) c = deep;
    else if (y === TOP.y0 + 1) c = mix(hi, mid, 0.3);
    else if (x === l || x === rr) c = deep;
    else if (x === l + 1) c = hi;
    else if (x === rr - 1) c = lo;
    else {
      c = shift(mid, Math.round(m.texture(x, y, r)));
      // a lâmpada bate no meio do tampo (mais claro em cima, perto da luz)
      const glow = Math.max(0, 1 - Math.hypot((u - 0.45) * 1.6, v * 1.1)) * 0.35;
      c = mix(c, hi, glow);
      if (v > 0.8) c = mix(c, hi, 0.25); // a quina boleada da frente
    }
    b.put(x, y, clampRgb(c));
  });
  // friso/costura por dentro da borda do tampo
  trapezoid(b, TOP.y0 + 4, TOP.y1 - 3, (x, y, u, v, l, rr) => {
    if ((x === l + 4 || x === rr - 4) && y % 2 === 0) b.put(x, y, mix(hi, deep, 0.35), 0.9);
  });
  for (let x = edgesAt(TOP.y0 + 4)[0] + 5; x < edgesAt(TOP.y0 + 4)[1] - 4; x += 2) b.put(x, TOP.y0 + 4, mix(hi, deep, 0.35), 0.9);
  EMBLEM[id]?.(b, m, r);
}

/** Emblemas do tampo (no meio, um pouco abaixo do centro do trapézio). */
const EMBLEM = {
  classica: (b, m) => {
    // plaqueta de latão com a pedra [2|3]
    const [hi, mid, lo, deep] = m.trim;
    b.rect(50, 63, 29, 15, deep);
    b.rect(51, 64, 27, 13, mid);
    b.rect(51, 64, 27, 1, hi);
    b.rect(51, 76, 27, 1, lo);
    b.rect(54, 66, 21, 9, hex('#f2e8c8'));
    b.rect(54, 66, 21, 1, hex('#fffaf0'));
    b.rect(64, 66, 1, 9, hex('#6a5432'));
    for (const [px, py] of [
      [57, 68],
      [61, 72],
      [67, 68],
      [69, 70],
      [71, 72],
    ])
      b.rect(px, py, 2, 2, hex('#1a1008'));
  },
  bicheiro: (b, m) => {
    const [hi, mid, lo, deep] = m.trim;
    b.rect(54, 61, 21, 19, deep);
    b.rect(55, 62, 19, 17, mid);
    b.rect(55, 62, 19, 1, hi);
    b.rect(55, 78, 19, 1, lo);
    // o "$" em relevo
    const ink = hex('#5a3a08');
    b.rect(60, 65, 9, 2, ink);
    b.rect(60, 67, 2, 3, ink);
    b.rect(60, 69, 9, 2, ink);
    b.rect(67, 71, 2, 3, ink);
    b.rect(60, 73, 9, 2, ink);
    b.rect(64, 63, 2, 14, ink);
    b.rect(60, 65, 9, 1, hi);
  },
  borracharia: (b, m) => {
    // pneu em relevo com a calota de ferro enferrujado
    b.ellipse(64.5, 70, 13, 9, hex('#121314'));
    b.ellipse(64.5, 70, 11, 7.5, hex('#2a2c2e'));
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) b.put(64.5 + Math.cos(a) * 12, 70 + Math.sin(a) * 8.2, hex('#3e4144'));
    b.ellipse(64.5, 70, 6, 4, m.trim[1]);
    b.ellipse(64.5, 70, 3, 2, m.trim[3]);
    b.put(62, 68, m.trim[0]);
  },
  trapaceiro: (b, m) => {
    // carta: o ás de espadas, com a borda dourada
    b.rect(56, 59, 17, 23, m.trim[3]);
    b.rect(57, 60, 15, 21, hex('#f6f0e0'));
    b.rect(57, 60, 15, 1, hex('#ffffff'));
    const ink = hex('#101018');
    b.put(64, 65, ink);
    b.rect(63, 66, 3, 1, ink);
    b.rect(62, 67, 5, 1, ink);
    b.rect(61, 68, 7, 3, ink);
    b.rect(63, 71, 3, 2, ink);
    b.rect(62, 73, 5, 1, ink);
    b.put(58, 61, ink);
    b.put(70, 79, ink);
  },
  seca: (b, m) => {
    // sol queimado a ferro na casca
    const burn = hex('#4a2208');
    b.ellipse(64.5, 70, 5.5, 4, burn);
    b.ellipse(64.5, 70, 3.5, 2.4, hex('#7a3a10'));
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      b.line(64.5 + Math.cos(a) * 7, 70 + Math.sin(a) * 5, 64.5 + Math.cos(a) * 10, 70 + Math.sin(a) * 7.2, burn);
    }
    void m;
  },
};

// ---------------------------------------------------------------------------
// Por dentro: o forro da tampa e o que vem na bandeja
// ---------------------------------------------------------------------------

const LID = { y0: 3, y1: HINGE_Y, l: 16, r: 111 };

/** A tampa aberta, de pé: moldura da casca e o forro com o bolso e as tiras de elástico. */
function paintLidInside(b, id, m, r) {
  const [hi, mid, lo, deep] = m.shell;
  const [lhi, lmid, llo] = m.lining;
  for (let y = LID.y0; y < LID.y1; y += 1) {
    // perspectiva: o alto da tampa (longe) um pouco mais estreito
    const t = (y - LID.y0) / (LID.y1 - LID.y0);
    const inset = Math.round((1 - t) * 3);
    const l = LID.l + inset;
    const rr = LID.r - inset;
    for (let x = l; x <= rr; x += 1) {
      const d = Math.min(x - l, rr - x, y - LID.y0);
      let c;
      if (d === 0) c = deep;
      else if (d === 1) c = y - LID.y0 === 1 ? hi : x - l === 1 ? mix(hi, mid, 0.4) : lo;
      else if (d <= 4) c = shift(mid, Math.round(m.texture(x, y, r)) - (d === 4 ? 18 : 0));
      else if (d === 5) c = mix(llo, hex('#000000'), 0.4);
      else {
        // forro: veludo/tecido com a sombra da moldura em cima e o brilho no meio
        const glow = Math.max(0, 1 - Math.abs(t - 0.55) * 2.2) * 0.3;
        c = mix(lmid, lhi, glow);
        if (d === 6) c = mix(c, llo, 0.6);
        c = shift(c, Math.round((r() - 0.5) * 8 + Math.sin(x * 0.9) * 3));
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // costura do forro
  for (let x = LID.l + 9; x < LID.r - 8; x += 3) {
    b.put(x, LID.y0 + 8, mix(lhi, hex('#ffffff'), 0.2), 0.7);
    b.put(x, LID.y1 - 6, mix(lhi, hex('#ffffff'), 0.2), 0.7);
  }
  // tira de elástico atravessada (onde as fichas de dificuldade ficam presas)
  b.rect(LID.l + 6, 20, LID.r - LID.l - 11, 3, mix(llo, hex('#000000'), 0.3));
  b.rect(LID.l + 6, 20, LID.r - LID.l - 11, 1, lhi);
  // dobradiças na base da tampa
  for (const hx of [32, 92]) {
    b.rect(hx, LID.y1 - 3, 9, 6, m.trim[3]);
    b.rect(hx + 1, LID.y1 - 2, 7, 4, m.trim[1]);
    b.rect(hx + 1, LID.y1 - 2, 7, 1, m.trim[0]);
    b.rect(hx + 4, LID.y1 - 3, 1, 6, m.trim[2]);
  }
  LID_EXTRA[id]?.(b, m, r);
}

const LID_EXTRA = {
  bicheiro: (b) => {
    // a tabela do bicho presa no forro, embaixo da tira
    b.rect(28, 28, 26, 16, hex('#e8dcb8'));
    b.rect(28, 28, 26, 1, hex('#fff6e0'));
    for (let y = 31; y < 43; y += 3) b.rect(30, y, 22, 1, hex('#8a7a58'), 0.8);
  },
  trapaceiro: (b) => {
    // o bolso do fundo falso, entreaberto
    b.rect(74, 30, 26, 14, hex('#0a0a10'));
    b.rect(74, 30, 26, 1, hex('#d9a531'));
    b.rect(78, 31, 7, 11, hex('#f6f0e0'));
    b.rect(79, 32, 2, 2, hex('#b8261c'));
  },
  borracharia: (b) => {
    // mancha de graxa no forro e o calendário de borracharia
    b.ellipse(36, 37, 8, 5, hex('#1a1a14'), 0.5);
    b.rect(76, 28, 20, 16, hex('#e8e0cc'));
    b.rect(76, 28, 20, 4, hex('#b8261c'));
    for (let y = 34; y < 43; y += 3) for (let x = 78; x < 94; x += 4) b.rect(x, y, 2, 1, hex('#6a6a60'));
  },
  seca: (b, m) => {
    // forro de juta remendado
    b.rect(30, 30, 14, 10, mix(m.lining[0], hex('#ffffff'), 0.2));
    for (let x = 30; x < 44; x += 2) b.put(x, 30, hex('#5a4a2c'));
  },
};

/** A bandeja: borda da casca, o forro e os compartimentos com o que vem dentro. */
function paintTray(b, id, m, r) {
  const [hi, mid, , deep] = m.shell;
  const [lhi, lmid, llo] = m.lining;
  trapezoid(b, TOP.y0, TOP.y1, (x, y, u, v, l, rr) => {
    const d = Math.min(x - l, rr - x, y - TOP.y0, TOP.y1 - 1 - y);
    let c;
    if (d === 0) c = deep;
    else if (d <= 3) c = shift(y >= TOP.y1 - 4 ? hi : mid, Math.round(m.texture(x, y, r)));
    else if (d === 4) c = mix(llo, hex('#000000'), 0.45);
    else {
      c = mix(lmid, lhi, Math.max(0, 0.3 - v * 0.3));
      if (y - TOP.y0 < 8) c = mix(c, llo, 0.5); // a parede de trás faz sombra
      c = shift(c, Math.round((r() - 0.5) * 8));
    }
    b.put(x, y, clampRgb(c));
  });
  TRAY[id]?.(b, m, r);
}

/** Divisórias do forro (paredinhas em pé, com a luz em cima). */
function divider(b, x0, y0, x1, y1, m) {
  b.line(x0, y0, x1, y1, mix(m.lining[2], hex('#000000'), 0.35));
  b.line(x0, y0 - 1, x1, y1 - 1, m.lining[0]);
}

function miniBone(b, x, y, w, h, a, c2) {
  b.rect(x, y + h, w, 2, hex('#7a6a48'));
  b.rect(x, y, w, h, hex('#efe4c4'));
  b.rect(x, y, w, 1, hex('#fffaf0'));
  b.rect(x, y + Math.floor(h / 2), w, 1, hex('#8a7650'));
  const pip = hex('#1a1008');
  const dots = { 0: [], 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]] };
  for (const [half, n] of [
    [0, a],
    [1, c2],
  ]) {
    for (const [px, py] of dots[n] ?? []) {
      b.put(x + Math.round(px * (w - 1)), y + half * (Math.floor(h / 2) + 1) + Math.round(py * (Math.floor(h / 2) - 1)), pip);
    }
  }
}

const TRAY = {
  classica: (b, m) => {
    // 14 pedras de osso em pé, em duas fileiras de compartimentos
    const faces = [3, 1, 2, 2, 0, 3, 1, 1, 3, 2, 0, 1, 2, 3, 1, 0, 3, 3, 2, 0, 1, 2, 0, 2, 3, 1, 2, 1];
    let k = 0;
    for (const [y, x0, w, gap] of [
      [57, 22, 9, 3],
      [71, 19, 10, 3],
    ]) {
      for (let i = 0; i < 7; i += 1) {
        const x = x0 + i * (w + gap);
        miniBone(b, x, y, w, 11, faces[k], faces[k + 1]);
        k += 2;
      }
    }
    divider(b, 18, 69, 110, 69, m);
  },
  bicheiro: (b, m) => {
    // maços de notas com a cinta de papel, empilhados
    const note = [hex('#c8d8a8'), hex('#9ab07a'), hex('#5a7a48')];
    for (const [x, y] of [
      [20, 60],
      [44, 58],
      [68, 60],
      [22, 72],
      [46, 74],
      [72, 72],
    ]) {
      for (let s = 2; s >= 0; s -= 1) {
        b.rect(x, y + s * 2, 22, 8, note[2]);
        b.rect(x, y + s * 2, 22, 7, note[s === 0 ? 0 : 1]);
      }
      b.rect(x + 9, y, 4, 8, hex('#f0e8d0'));
      b.rect(x + 9, y, 4, 1, hex('#ffffff'));
      b.ellipse(x + 4, y + 3, 2, 2, note[2]);
    }
    // o dado e a caderneta
    b.rect(96, 61, 9, 9, hex('#f6f0e0'));
    b.put(98, 63, hex('#b8261c'));
    b.put(102, 67, hex('#b8261c'));
    b.rect(96, 74, 12, 11, hex('#7a1a10'));
    b.rect(96, 74, 12, 1, hex('#b8402a'));
    void m;
  },
  borracharia: (b, m) => {
    // pedras de chumbo (cinza com pips escuros) num lado, chave e remendo no outro
    for (let i = 0; i < 4; i += 1) {
      const x = 20 + (i % 2) * 13;
      const y = 57 + Math.floor(i / 2) * 15;
      b.rect(x, y + 11, 10, 2, hex('#2a2c2e'));
      b.rect(x, y, 10, 11, hex('#8a9096'));
      b.rect(x, y, 10, 1, hex('#c0c8ce'));
      b.rect(x, y + 5, 10, 1, hex('#4a4e52'));
      b.put(x + 2, y + 2, hex('#1a1c1e'));
      b.put(x + 7, y + 8, hex('#1a1c1e'));
      b.put(x + 5, y + 2, hex('#1a1c1e'));
    }
    divider(b, 48, 55, 48, 88, m);
    // chave de boca
    b.line(56, 82, 96, 62, hex('#9aa2a8'));
    b.line(56, 83, 96, 63, hex('#5a6066'));
    b.ellipse(97, 61, 4, 3, hex('#9aa2a8'));
    b.rect(96, 59, 3, 2, m.lining[1]);
    b.ellipse(55, 83, 3, 2.5, hex('#9aa2a8'));
    // remendo de pneu e parafusos
    b.ellipse(80, 80, 7, 4, hex('#1a1a1a'));
    b.ellipse(80, 79.5, 5, 2.5, hex('#c86a2a'));
    for (const [sx, sy] of [
      [60, 62],
      [64, 66],
      [70, 61],
      [102, 82],
    ]) {
      b.rect(sx, sy, 3, 2, hex('#c8a040'));
      b.put(sx, sy, hex('#fff0a0'));
    }
  },
  trapaceiro: (b, m) => {
    // cartas em leque e fichas de pôquer
    const card = hex('#f6f0e0');
    for (let i = 0; i < 5; i += 1) {
      const x = 24 + i * 7;
      const y = 58 + Math.abs(i - 2) * 2;
      b.rect(x, y, 14, 20, hex('#2a2a34'));
      b.rect(x + 1, y + 1, 12, 18, card);
      b.rect(x + 1, y + 1, 12, 1, hex('#ffffff'));
      b.put(x + 3, y + 3, i % 2 ? hex('#b8261c') : hex('#101018'));
    }
    // ás de espadas por cima
    b.rect(60, 62, 14, 20, hex('#2a2a34'));
    b.rect(61, 63, 12, 18, card);
    b.rect(66, 69, 3, 4, hex('#101018'));
    b.rect(65, 70, 5, 2, hex('#101018'));
    // fichas
    for (const [x, y, c] of [
      [86, 60, '#b8261c'],
      [96, 64, '#2f5f9a'],
      [88, 74, '#e6c34a'],
      [100, 78, '#1a1a1a'],
    ]) {
      b.ellipse(x, y + 2, 6, 3, hex('#000000'), 0.4);
      b.ellipse(x, y, 6, 3, hex(c));
      b.ellipse(x, y, 3.5, 1.6, hex('#f6f0e0'));
      b.ellipse(x, y, 2, 0.9, hex(c));
    }
    void m;
  },
  seca: (b, m) => {
    // cantil de lata com a alça de couro, charque e as pedras desbotadas de sol
    b.ellipse(36, 72, 14, 12, hex('#5a6066'));
    b.ellipse(36, 71, 12.5, 10.5, hex('#9aa2a8'));
    b.ellipse(33, 67, 5, 3, hex('#d8e0e4'));
    b.rect(34, 57, 5, 4, hex('#3a3a3a'));
    b.line(24, 62, 48, 62, hex('#6a3a1a'));
    // charque
    b.rect(58, 58, 22, 10, hex('#8a2a1a'));
    b.rect(58, 58, 22, 2, hex('#c05a3a'));
    for (let x = 60; x < 80; x += 4) b.put(x, 63, hex('#f0e0c8'));
    // pedras desbotadas
    for (let i = 0; i < 3; i += 1) miniBone(b, 60 + i * 13, 72, 10, 11, (i + 1) % 4, (i + 2) % 4);
    // areia no fundo
    for (let i = 0; i < 26; i += 1) b.put(20 + ((i * 37) % 88), 82 + (i % 5), hex('#e8c890'), 0.6);
    void m;
  },
};

// ---------------------------------------------------------------------------
// As três pinturas de cada maleta
// ---------------------------------------------------------------------------

/** A maleta fechada (128×128). */
export function paintCaseClosed(id = 'classica', seed = 5) {
  const b = buffer(CASE_PX, CASE_PX);
  const r = rngOf(seed + id.length * 31);
  const m = matOf(id);
  b.ellipse(64, BOTTOM_Y + 3, 60, 6, [0, 0, 0], 0.5);
  paintFront(b, m, r, { closed: true });
  paintLidTop(b, id, m, r);
  for (const x of [32, 96]) latch(b, x, m.trim, { open: false });
  handle(b, m.trim, r);
  cornerCap(b, TOP.l0, TOP.y0, 1, 1, m.trim);
  cornerCap(b, TOP.r0, TOP.y0, -1, 1, m.trim);
  cornerCap(b, TOP.l1, BOTTOM_Y - 1, 1, -1, m.trim);
  cornerCap(b, TOP.r1, BOTTOM_Y - 1, -1, -1, m.trim);
  outline(b);
  return b;
}

/** A tampa aberta, de pé (só a faixa de cima: y de 0 até a dobradiça). */
export function paintCaseLid(id = 'classica', seed = 5) {
  const b = buffer(CASE_PX, HINGE_Y + 2);
  const r = rngOf(seed + id.length * 13);
  paintLidInside(b, id, matOf(id), r);
  outline(b);
  return b;
}

/** A base aberta: a bandeja com o que vem dentro, a frente com os fechos soltos e a alça. */
export function paintCaseTray(id = 'classica', seed = 5) {
  const b = buffer(CASE_PX, CASE_PX);
  const r = rngOf(seed + id.length * 7);
  const m = matOf(id);
  b.ellipse(64, BOTTOM_Y + 3, 60, 6, [0, 0, 0], 0.5);
  paintFront(b, m, r, { closed: false });
  paintTray(b, id, m, r);
  for (const x of [32, 96]) latch(b, x, m.trim, { open: true });
  handle(b, m.trim, r);
  cornerCap(b, TOP.l1, BOTTOM_Y - 1, 1, -1, m.trim);
  cornerCap(b, TOP.r1, BOTTOM_Y - 1, -1, -1, m.trim);
  outline(b);
  return b;
}

// ---------------------------------------------------------------------------
// Corrente e cadeado das trancadas
// ---------------------------------------------------------------------------

function link(b, x, y, horizontal) {
  const steel = [hex('#c8d0d6'), hex('#7a848c'), hex('#3a4046')];
  const w = horizontal ? 7 : 4;
  const h = horizontal ? 4 : 7;
  b.rect(x, y, w, h, steel[2]);
  b.rect(x + 1, y + 1, w - 2, h - 2, [0, 0, 0], 0);
  b.rect(x, y, w, 1, steel[0]);
  b.rect(x, y, 1, h, steel[1]);
  // o furo do elo
  for (let yy = y + 1; yy < y + h - 1; yy += 1) for (let xx = x + 1; xx < x + w - 1; xx += 1) b.data[(yy * b.w + xx) * 4 + 3] = 0;
}

/** Duas correntes em X por cima da maleta (128×128). */
export function paintCaseChains() {
  const b = buffer(CASE_PX, CASE_PX);
  for (const [x0, y0, x1, y1] of [
    [6, 46, 122, 116],
    [122, 46, 6, 116],
  ]) {
    const n = 22;
    for (let i = 0; i <= n; i += 1) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n + Math.sin((i / n) * Math.PI) * 6);
      link(b, x - 3, y - 2, i % 2 === 0);
    }
  }
  outline(b);
  return b;
}

/** O cadeado grande no cruzamento (aberto: a argola levantada). */
export function paintCaseLock(open = false) {
  const b = buffer(CASE_PX, CASE_PX);
  const cx = 64;
  const cy = 86;
  const steel = [hex('#e0e6ea'), hex('#8a949c'), hex('#3a4046')];
  // argola
  const lift = open ? 7 : 0;
  for (let a = Math.PI; a <= Math.PI * 2; a += 0.02) {
    for (let t = 0; t < 3; t += 1) {
      const rr = 9 - t;
      b.put(cx + Math.cos(a) * rr + (open ? 3 : 0), cy - 6 - lift + Math.sin(a) * rr * 1.1, t === 0 ? steel[2] : t === 1 ? steel[1] : steel[0]);
    }
  }
  b.rect(cx - 9 + (open ? 3 : 0), cy - 6 - lift, 3, 6 + lift, steel[1]);
  if (!open) b.rect(cx + 7, cy - 6, 3, 6, steel[1]);
  // corpo de latão
  b.rect(cx - 12, cy - 2, 25, 22, hex('#3a2808'));
  b.rect(cx - 11, cy - 1, 23, 20, hex('#c9962e'));
  b.rect(cx - 11, cy - 1, 23, 2, hex('#ffe08a'));
  b.rect(cx - 11, cy + 16, 23, 3, hex('#8a6214'));
  b.rect(cx - 11, cy - 1, 2, 20, hex('#e8b850'));
  // buraco da chave
  b.ellipse(cx + 0.5, cy + 6, 2.5, 2.5, hex('#1a1008'));
  b.rect(cx, cy + 7, 2, 6, hex('#1a1008'));
  // rebites e um arranhão
  for (const [rx, ry] of [
    [cx - 8, cy + 2],
    [cx + 8, cy + 2],
    [cx - 8, cy + 14],
    [cx + 8, cy + 14],
  ]) {
    b.put(rx, ry, hex('#fff0b0'));
    b.put(rx + 1, ry + 1, hex('#5a4210'));
  }
  b.line(cx - 6, cy + 10, cx - 2, cy + 12, hex('#fff0b0'), 0.6);
  outline(b);
  return b;
}

// ---------------------------------------------------------------------------
// Fichas de dificuldade (presas na tampa): osso, ébano com latão e prata
// ---------------------------------------------------------------------------

export const TOKEN_SIZE = Object.freeze({ w: 26, h: 30 });

/** A ficha da dificuldade: chapa com parafusos, a pedrinha [5|3] gravada e o brilho. */
export function paintDifficultyToken(mode = 'normal', { on = false, locked = false } = {}) {
  const { w, h } = TOKEN_SIZE;
  const b = buffer(w, h);
  const P = {
    normal: { face: ['#fff6dc', '#e8dcb8', '#b4a078', '#5a4a30'], pip: '#1a1008', frame: ['#fff0a8', '#d9a531', '#8a6214'] },
    hard: { face: ['#5a4a3c', '#2e2219', '#1a120c', '#0a0604'], pip: '#e8dcb8', frame: ['#fff0a8', '#d9a531', '#8a6214'] },
    inferno: { face: ['#ffffff', '#c8d0d6', '#8a949c', '#3a4046'], pip: '#7a1010', frame: ['#ff9a7a', '#c0302a', '#5a0c08'] },
  }[mode];
  const face = P.face.map(hex);
  const frame = P.frame.map(hex);
  // sombra na tampa
  b.rect(2, 3, w - 2, h - 2, [0, 0, 0], 0.45);
  for (let y = 0; y < h - 2; y += 1) {
    for (let x = 0; x < w - 2; x += 1) {
      const d = Math.min(x, y, w - 3 - x, h - 3 - y);
      let c;
      if (d === 0) c = frame[2];
      else if (d === 1) c = y === 1 || x === 1 ? frame[0] : frame[1];
      else if (d === 2) c = frame[2];
      else c = mix(face[1], face[0], Math.max(0, 0.5 - (y / h) * 0.8));
      b.put(x, y, c);
    }
  }
  // a pedrinha [5|3] gravada no meio
  const pip = hex(P.pip);
  const tx = 6;
  const ty = 6;
  b.rect(tx, ty, 12, 16, face[2]);
  b.rect(tx + 1, ty + 1, 10, 14, face[1]);
  b.rect(tx + 1, ty + 7, 10, 1, face[3]);
  for (const [px, py] of [
    [3, 3],
    [8, 3],
    [5, 5],
    [3, 7 - 2],
    [8, 7 - 2],
  ].slice(0, 5))
    b.put(tx + px, ty + py - 1, pip);
  for (const [px, py] of [
    [3, 10],
    [5, 12],
    [8, 14],
  ])
    b.put(tx + px, ty + py - 1, pip);
  // parafusos nos cantos
  for (const [sx, sy] of [
    [3, 3],
    [w - 6, 3],
    [3, h - 6],
    [w - 6, h - 6],
  ]) {
    b.put(sx, sy, frame[2]);
    b.put(sx, sy - 1 < 0 ? sy : sy, frame[2]);
  }
  if (on) {
    // escolhida: o brilho dourado em volta e a chapa mais clara
    for (let x = 0; x < w - 2; x += 1) {
      b.put(x, 0, hex('#ffe58a'));
      b.put(x, h - 3, hex('#ffe58a'));
    }
    for (let y = 0; y < h - 2; y += 1) {
      b.put(0, y, hex('#ffe58a'));
      b.put(w - 3, y, hex('#ffe58a'));
    }
  }
  if (locked) {
    // trancada: escurece e ganha o cadeadinho
    for (let i = 3; i < b.data.length; i += 4) if (b.data[i] > 0) {
      b.data[i - 3] *= 0.45;
      b.data[i - 2] *= 0.45;
      b.data[i - 1] *= 0.45;
    }
    b.rect(8, 15, 9, 8, hex('#3a2808'));
    b.rect(9, 16, 7, 6, hex('#c9962e'));
    b.rect(9, 16, 7, 1, hex('#ffe08a'));
    b.rect(10, 11, 1, 5, hex('#8a949c'));
    b.rect(14, 11, 1, 5, hex('#8a949c'));
    b.rect(10, 11, 5, 1, hex('#c8d0d6'));
    b.put(12, 18, hex('#1a1008'));
    b.put(12, 19, hex('#1a1008'));
  }
  return b;
}
