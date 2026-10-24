// Cena 4: o close da bucha. A mão do Tio Zé desce com o [6|6] e bate no feltro: quadro de
// impacto, tremor, as outras pedras pulam, as tampinhas saltam, a cerveja respinga, a poeira
// sobe e a lâmpada balança. A luz falha duas vezes e apaga.
import { clamp, easeIn, ellipse, hash, makeCanvas, mix, pix, poly, rect, rimLight, silhouette, span } from './core.js';
import { fill, glow, glowEllipse, makeCamera, vignette, withRoll } from './stage.js';

export const SLAM_LEN = 1.0;
/** O instante da batida, dentro da cena. */
export const SLAM_HIT = 0.13;
/** A lâmpada apaga. */
export const SLAM_DARK = 0.8;

const WORLD = { ox: -40, oy: -40, w: 260, h: 400 };
const HALF = 26;
const PIPS = {
  0: [],
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 1],
    [0, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

/** Pedra grande, de cima: marfim com chanfro, divisória e pintas fundas. */
function tileArt(a, b, vertical) {
  const w = vertical ? HALF : HALF * 2;
  const h = vertical ? HALF * 2 : HALF;
  const c = makeCanvas(w + 2, h + 3);
  const g = pix(c);
  // espessura (a lateral da pedra aparece embaixo)
  rect(g, 1, 3, w, h, '#8a7a5a');
  rect(g, 0, 0, w, h, '#efe6cf');
  for (let y = 0; y < h; y += 1) rect(g, 0, y, w, 1, mix('#fbf5e6', '#ded2b2', y / h));
  rect(g, 0, 0, w, 1, '#ffffff');
  rect(g, 0, 0, 1, h, '#fffaf0');
  rect(g, w - 1, 0, 1, h, '#c4b590');
  rect(g, 0, h - 1, w, 1, '#b8a882');
  rect(g, 0, h, w, 3, '#6a5a3e');
  rect(g, 0, h, w, 1, '#a08e6a');
  // divisória com o rebite no meio
  if (vertical) rect(g, 3, HALF - 1, w - 6, 2, '#8a7a5a');
  else rect(g, HALF - 1, 3, 2, h - 6, '#8a7a5a');
  rect(g, vertical ? w / 2 - 1 : HALF - 1, vertical ? HALF - 1 : h / 2 - 1, 2, 2, '#c8a23a');
  const face = (ox, oy, n) => {
    for (const [px, py] of PIPS[n]) {
      const cx = ox + 6 + px * 7;
      const cy = oy + 6 + py * 7;
      rect(g, cx, cy, 4, 4, '#2a1d14');
      rect(g, cx + 1, cy - 1, 2, 1, '#2a1d14');
      rect(g, cx + 1, cy + 4, 2, 1, '#5a4a36');
      rect(g, cx - 1, cy + 1, 1, 2, '#2a1d14');
      rect(g, cx + 4, cy + 1, 1, 2, '#5a4a36');
      rect(g, cx + 2, cy + 2, 1, 1, '#4a3a2a');
    }
  };
  if (vertical) {
    face(0, 0, a);
    face(0, HALF, b);
  } else {
    face(0, 0, a);
    face(HALF, 0, b);
  }
  return c;
}

function feltArt() {
  const c = makeCanvas(WORLD.w, WORLD.h);
  const g = pix(c);
  g.translate(-WORLD.ox, -WORLD.oy);
  // o escuro do outro lado da mesa (o paletó do Tio Zé)
  rect(g, -40, -40, 260, 60, '#0d0a08');
  // a borda de madeira do lado de lá
  rect(g, -40, 14, 260, 10, '#5a341a');
  rect(g, -40, 14, 260, 2, '#7a4a26');
  rect(g, -40, 23, 260, 2, '#2a170a');
  // feltro
  for (let y = 25; y < 360; y += 1) {
    for (let x = -40; x < 220; x += 1) {
      const d = Math.hypot((x - 90) / 170, (y - 170) / 230);
      const base = mix('#3a6b48', '#16301f', clamp(d));
      const n = hash(x * 17 + y * 5, 1);
      rect(g, x, y, 1, 1, n > 0.82 ? mix(base, '#000000', 0.12) : n < 0.1 ? mix(base, '#ffffff', 0.05) : base);
    }
  }
  // fiapos do feltro
  for (let i = 0; i < 120; i += 1) {
    const x = -40 + hash(i, 2) * 260;
    const y = 25 + hash(i, 3) * 335;
    rect(g, x, y, 2, 1, '#2a4f36');
  }
  // copo americano de cerveja (de cima, um pouco inclinado)
  ellipse(g, 22, 86, 15, 5, '#1a1208');
  rect(g, 8, 46, 28, 40, '#c88a22');
  for (let x = 8; x < 36; x += 4) rect(g, x, 50, 2, 34, '#d89a2a');
  rect(g, 9, 48, 2, 36, '#f8d27a');
  rect(g, 33, 48, 2, 36, '#8a5a14');
  ellipse(g, 22, 46, 14, 5, '#f4efe2');
  ellipse(g, 22, 45, 12, 3.5, '#ffffff');
  ellipse(g, 22, 86, 14, 4, '#a8701e');
  // cinzeiro com o cigarro
  ellipse(g, 156, 60, 18, 7, '#6a6e76');
  ellipse(g, 156, 59, 14, 5, '#2a2c30');
  rect(g, 146, 56, 20, 3, '#f4ece1');
  rect(g, 166, 56, 3, 3, '#ea580c');
  rect(g, 168, 57, 1, 1, '#fef08a');
  // monte de compra (pedras viradas) à direita
  for (let i = 0; i < 5; i += 1) {
    const x = 176 + (i % 2) * 18 + Math.floor(hash(i, 4) * 4);
    const y = 96 + i * 30 + Math.floor(hash(i, 5) * 6);
    rect(g, x + 1, y + 2, 16, 30, '#0c0805');
    rect(g, x, y, 16, 30, '#2a1a12');
    rect(g, x, y, 16, 1, '#4a3424');
    rect(g, x + 6, y + 13, 4, 4, '#7a5a3a');
  }
  return c;
}

/** Tampinhas e moedas da aposta (pulam na batida). */
const BETS = [
  [44, 244, 'cap', '#c8382e'],
  [58, 252, 'cap', '#c8a23a'],
  [72, 240, 'coin', '#e8c04a'],
  [96, 256, 'cap', '#3a8a4a'],
  [110, 244, 'coin', '#e8c04a'],
  [124, 254, 'cap', '#c8382e'],
  [30, 262, 'coin', '#d8b03a'],
  [140, 240, 'cap', '#c8a23a'],
];

function betArt(kind, col) {
  const c = makeCanvas(10, 8);
  const g = pix(c);
  if (kind === 'cap') {
    ellipse(g, 5, 4, 5, 3.5, mix(col, '#000000', 0.35));
    ellipse(g, 5, 3.5, 4, 2.6, col);
    ellipse(g, 5, 3.5, 2.4, 1.4, mix(col, '#ffffff', 0.25));
    for (let i = 0; i < 6; i += 1) rect(g, 1 + i * 1.6, 6, 1, 1, mix(col, '#000000', 0.5));
  } else {
    ellipse(g, 5, 4, 4.5, 3, '#8a6a1a');
    ellipse(g, 5, 3.5, 4, 2.4, col);
    rect(g, 3, 2, 2, 1, '#fff4c0');
  }
  return c;
}

/** A mão do Tio Zé vindo de cima (manga escura, punho da camisa), dedos apertando a pedra. */
function handArt() {
  const W = 44;
  const H = 122;
  const c = makeCanvas(W, H);
  const g = pix(c);
  // manga do paletó
  poly(
    g,
    [
      [9, 0],
      [35, 0],
      [34, 76],
      [10, 76],
    ],
    '#1c1917',
  );
  rect(g, 10, 0, 3, 76, '#36312c');
  rect(g, 29, 0, 5, 76, '#100e0d');
  for (let y = 12; y < 76; y += 16) rect(g, 13, y, 15, 1, '#141210');
  // punho da camisa com a abotoadura
  rect(g, 9, 74, 27, 7, '#e7e5e4');
  rect(g, 9, 74, 27, 1, '#ffffff');
  rect(g, 9, 80, 27, 1, '#a8a29e');
  rect(g, 30, 76, 3, 2, '#c8a23a');
  // costas da mão (mais larga que o punho)
  const skin = '#c8895a';
  const lit = '#e3a676';
  const shade = '#9a6038';
  poly(
    g,
    [
      [10, 81],
      [35, 81],
      [38, 92],
      [37, 101],
      [7, 101],
      [6, 90],
    ],
    skin,
  );
  rect(g, 11, 82, 18, 3, lit);
  rect(g, 33, 84, 4, 16, shade);
  for (const vx of [16, 22, 28]) rect(g, vx, 88, 1, 9, shade);
  // nós dos dedos
  for (let i = 0; i < 4; i += 1) {
    rect(g, 8 + i * 7, 98, 6, 3, lit);
    rect(g, 8 + i * 7, 101, 6, 1, shade);
  }
  // dedos apontando para nós, apertando a pedra (curtos: vêm na nossa direção)
  for (let i = 0; i < 4; i += 1) {
    const x = 8 + i * 7;
    const len = [15, 17, 16, 12][i];
    rect(g, x, 102, 6, len, skin);
    rect(g, x, 102, 1, len, lit);
    rect(g, x + 5, 102, 1, len, shade);
    rect(g, x + 1, 102 + len - 3, 4, 2, '#e8c0a0');
    rect(g, x + 1, 102 + len, 4, 1, shade);
  }
  // polegar por fora, à esquerda
  poly(
    g,
    [
      [8, 86],
      [3, 96],
      [1, 108],
      [5, 110],
      [8, 100],
    ],
    skin,
  );
  rect(g, 1, 106, 4, 2, '#e8c0a0');
  // anel de ouro
  rect(g, 29, 104, 6, 2, '#e8c04a');
  rect(g, 29, 104, 6, 1, '#fff0a0');
  const rim = rimLight(c, '#ffd8a0', [[-1, 0]]);
  g.globalAlpha = 0.55;
  g.drawImage(rim, 0, 0);
  g.globalAlpha = 1;
  return c;
}

export function buildSlam() {
  const felt = feltArt();
  const t24 = tileArt(2, 4, false);
  const t46 = tileArt(4, 6, false);
  const t66 = tileArt(6, 6, true);
  const hand = handArt();
  const bets = BETS.map(([, , kind, col]) => betArt(kind, col));
  const t66White = silhouette(t66, '#ffffff');
  const handWhite = silhouette(hand, '#ffffff');
  const frame = makeCanvas(WORLD.w, WORLD.h);

  const draw = (F) => {
    const { out, t } = F;
    const hit = span(t, SLAM_HIT, SLAM_HIT + 0.42);
    const decay = t < SLAM_HIT ? 0 : (1 - hit) ** 2;
    const shake = F.reduced ? 0 : decay * 7;
    const shakeX = Math.sin(t * 90) * shake * F.s * 0.6;
    const shakeY = Math.cos(t * 77) * shake * F.s * 0.5;
    const push = t < SLAM_HIT ? 0 : 0.05 * (1 - hit);
    const cam = makeCamera(F, {
      fx: 92,
      fy: 166,
      f: 0.06 + t * 0.05 + push,
      shakeX,
      shakeY,
      roll: F.reduced ? 0 : -0.01 + decay * Math.sin(t * 50) * 0.01,
    });
    // pedra descendo (com a mão) até a batida; depois a mão solta e sobe um pouco
    const fallK = easeIn(span(t, 0, SLAM_HIT));
    const tileY = t < SLAM_HIT ? -120 + fallK * (137 + 120) : 137;
    const lift = span(t, SLAM_HIT + 0.2, SLAM_HIT + 0.6);
    const handY = tileY - 104 - lift * 20;
    const hop = t > SLAM_HIT && t < SLAM_HIT + 0.12 ? Math.round(Math.sin(((t - SLAM_HIT) / 0.12) * Math.PI) * 3) : 0;

    const g = pix(frame);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, frame.width, frame.height);
    g.drawImage(felt, 0, 0);
    g.translate(-WORLD.ox, -WORLD.oy);
    // sombras das pedras no feltro
    g.globalAlpha = 0.45;
    rect(g, -27, 152, 104, 28, '#0a140d');
    const near = clamp(1 - (137 - tileY) / 160);
    g.globalAlpha = 0.45 * near;
    const grow = Math.round((1 - near) * 6);
    rect(g, 79 - grow, 140 - grow, 26 + grow * 2, 54 + grow * 2, '#0a140d');
    g.globalAlpha = 1;
    // a fileira [2|4][4|6] (pula na batida)
    g.drawImage(t24, -29, 150 - hop);
    g.drawImage(t46, 24, 150 - hop);
    // apostas
    BETS.forEach(([x, y], i) => {
      const jump = t > SLAM_HIT ? Math.max(0, Math.sin(((t - SLAM_HIT) / (0.18 + hash(i, 9) * 0.08)) * Math.PI)) * (4 + hash(i, 8) * 5) : 0;
      const live = t > SLAM_HIT && t < SLAM_HIT + 0.26;
      g.drawImage(bets[i], x + (live ? Math.round((hash(i, 7) - 0.5) * 3 * span(t, SLAM_HIT, SLAM_HIT + 0.2)) : 0), y - Math.round(live ? jump : 0));
    });
    // a bucha
    g.drawImage(t66, 77, Math.round(tileY));
    // a mão em cima da pedra
    if (handY > -200) g.drawImage(hand, 68, Math.round(handY));
    // poeira saindo de baixo da pedra
    if (t > SLAM_HIT) {
      const pk = span(t, SLAM_HIT, SLAM_HIT + 0.5);
      for (let i = 0; i < 46; i += 1) {
        const ang = hash(i, 11) * Math.PI * 2;
        const dist = (10 + hash(i, 12) * 34) * Math.sqrt(pk);
        const x = 90 + Math.cos(ang) * (13 + dist);
        const y = 163 + Math.sin(ang) * (26 + dist * 0.7) - pk * 8;
        g.globalAlpha = (1 - pk) * 0.8;
        rect(g, x, y, hash(i, 13) > 0.6 ? 2 : 1, 1, hash(i, 14) > 0.5 ? '#c8c2b0' : '#8a947e');
      }
      // respingo da cerveja
      for (let i = 0; i < 12; i += 1) {
        const k = span(t, SLAM_HIT + 0.02, SLAM_HIT + 0.38);
        if (k <= 0 || k >= 1) continue;
        const vx = (hash(i, 21) - 0.5) * 30;
        const vy = -20 - hash(i, 22) * 24;
        const x = 22 + vx * k;
        const y = 44 + vy * k + 60 * k * k;
        g.globalAlpha = 1 - k;
        rect(g, x, y, 1, 1, hash(i, 23) > 0.4 ? '#fff6dc' : '#f0b040');
      }
      g.globalAlpha = 1;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);

    // a lâmpada balançando depois da batida: a mancha de luz vai e vem
    const swing = t < SLAM_HIT ? 0 : Math.sin((t - SLAM_HIT) * 7.5) * 34 * (1 - span(t, SLAM_HIT, 1.6) * 0.5);
    const flicker = !F.reduced && t > 0.62 && t < 0.67;
    const light = t >= SLAM_DARK ? 0 : flicker ? 0.45 : 1;

    withRoll(out, F, cam.roll, () => {
      cam.blit(out, frame, WORLD.ox, WORLD.oy);
      const sc = cam.scale(1);
      // tudo fora da luz fica bem escuro
      const [lx, ly] = cam.toScreen(92 + swing, 150);
      out.save();
      const grad = out.createRadialGradient(lx, ly, sc * 40, lx, ly, sc * 190);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.82)');
      out.fillStyle = grad;
      out.fillRect(0, 0, F.W, F.H);
      out.restore();
      glowEllipse(out, lx, ly + sc * 10, sc * 100, sc * 120, 'rgba(255,214,150,0.5)', 0.4 * light);
      // a onda de choque na batida
      if (t > SLAM_HIT && t < SLAM_HIT + 0.25) {
        const k = (t - SLAM_HIT) / 0.25;
        const [cx, cy] = cam.toScreen(90, 166);
        out.save();
        out.strokeStyle = `rgba(255,240,210,${0.7 * (1 - k)})`;
        out.lineWidth = sc * (3 - k * 2);
        out.beginPath();
        out.ellipse(cx, cy, sc * (20 + k * 90), sc * (14 + k * 60), 0, 0, Math.PI * 2);
        out.stroke();
        out.restore();
        glow(out, cx, cy, sc * 60 * (1 - k * 0.5), 'rgba(255,230,180,0.8)', 0.6 * (1 - k));
      }
      // riscos de velocidade da descida
      if (t < SLAM_HIT) {
        out.save();
        out.strokeStyle = 'rgba(255,240,220,0.35)';
        out.lineWidth = sc * 0.8;
        for (let i = 0; i < 7; i += 1) {
          const x = 77 + i * 4.5;
          const [sx, sy] = cam.toScreen(x, tileY - 30 - hash(i, 31) * 40);
          out.beginPath();
          out.moveTo(sx, sy);
          out.lineTo(sx, sy - sc * (30 + hash(i, 32) * 40));
          out.stroke();
        }
        out.restore();
      }
    });
    // quadro de impacto: silhuetas brancas no preto (2 quadros)
    if (!F.reduced && t >= SLAM_HIT && t < SLAM_HIT + 0.034) {
      fill(out, F, '#000', 1);
      cam.blit(out, t66White, 77, 137);
      cam.blit(out, handWhite, 68, handY);
    } else if (!F.reduced && t >= SLAM_HIT + 0.034 && t < SLAM_HIT + 0.12) {
      fill(out, F, '#fff4dc', 0.5 * (1 - (t - SLAM_HIT - 0.034) / 0.086), 'lighter');
    }
    vignette(out, F, 0.9);
    // a luz falhando e apagando
    if (light < 1) fill(out, F, '#000', t >= SLAM_DARK ? 1 : 0.55);
    // apagando: o filamento ainda brilha um instante
    if (t >= SLAM_DARK - 0.06 && t < SLAM_DARK) fill(out, F, '#000', (t - (SLAM_DARK - 0.06)) / 0.06);
  };

  return { draw };
}
