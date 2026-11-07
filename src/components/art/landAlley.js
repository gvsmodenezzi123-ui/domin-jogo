/**
 * Versão 2.11: as cenas de rua e de porão deitadas, pintadas do zero (500 × 225 px e a sobra):
 *   paintAlleyBack('market'): o beco do Corvo: tijolo molhado, a porta de ferro com o neon
 *     vermelho em cima, o cano, os sacos de lixo, as poças refletindo o neon e, à direita, o
 *     forro do sobretudo aberto (cetim acolchoado com as presilhas de onde pendem os talismãs);
 *   paintAlleyBack('event'): o mesmo beco sem o Corvo: o poste de luz de sódio, os lambe-lambes
 *     e a janela gradeada (o cartão do imprevisto fica à direita, em HTML);
 *   paintCellarBack: o porão do Seu Tião: tijolo velho, canos enferrujados, teias, a grade do
 *     teto por onde desce o facho de luz, a prateleira de tralha e o chão de pedra.
 */
import { paintKit } from './botecoScene.js';
import { glowLayer, halo, relight, shifted, vignetteBox } from './lightPass.js';
import { pixelText, textWidth } from './pixelFont.js';

const { hex, mixRgb, shift, rngOf, bayer, buffer, plank } = paintKit;

export const ALLEY_W = 500;
export const ALLEY_H = 225;
export const ALLEY_PAD = Object.freeze({ x: 24, y: 44 });
const PX = ALLEY_PAD.x;
const PY = ALLEY_PAD.y;
const X0 = -PX;
const X1 = ALLEY_W + PX;
const Y1 = ALLEY_H + PY;
const BLACK = [0, 0, 0];

/** Onde o HTML encosta (px da pintura). */
export const ALLEY_GEO = Object.freeze({ ground: 176, door: { x0: 56, x1: 128, y0: 62 }, coat: { x0: 180, x1: 494, y0: 26, y1: 168 }, hooks: [233, 337, 441] });

/** Tijolo (aparente, com a argamassa) de `tones`, molhado: o brilho escorre de cima. */
function brickWall(b, r, x0, y0, x1, y1, tones, mortar) {
  b.rect(x0, y0, x1 - x0, y1 - y0, hex(mortar));
  for (let y = y0, row = 0; y < y1; y += 5, row += 1) {
    const off = row % 2 ? 5 : 0;
    for (let x = x0 - off; x < x1; x += 10) {
      const c = shift(hex(tones[Math.floor(r() * tones.length)]), Math.round((r() - 0.5) * 10));
      b.rect(x, y, 9, 4, c);
      b.rect(x, y, 9, 1, shift(c, 14), 0.7);
      if (r() < 0.12) b.rect(x + 2 + Math.floor(r() * 5), y + 1, 2, 2, shift(c, -22));
    }
  }
  // a água escorrendo: riscos claros e escuros descendo
  for (let i = 0; i < (x1 - x0) / 5; i += 1) {
    const x = x0 + Math.floor(r() * (x1 - x0));
    const len = 8 + Math.floor(r() * 40);
    const y = y0 + Math.floor(r() * (y1 - y0 - len));
    for (let k = 0; k < len; k += 1) b.put(x, y + k, k % 3 ? [10, 8, 8] : [200, 200, 210], 0.18 * (1 - k / len));
  }
}

/** O chão molhado do beco: asfalto com as poças (o reflexo pinta-se depois, por cima). */
function wetGround(b, r, top) {
  for (let y = top; y < Y1; y += 1) {
    const t = (y - top) / (Y1 - top);
    for (let x = X0; x < X1; x += 1) {
      const n = r();
      b.put(x, y, mixRgb(hex('#3e3c42'), hex('#545058'), n * 0.6 + t * 0.25));
    }
  }
  // o brilho molhado: riscos deitados claros
  for (let i = 0; i < 70; i += 1) {
    const x = X0 + Math.floor(r() * (X1 - X0));
    const y = top + 4 + Math.floor(r() * (Y1 - top - 6));
    b.rect(x, y, 6 + Math.floor(r() * 18), 1, hex('#8a8a96'), 0.45);
  }
  b.rect(X0, top, X1 - X0, 2, hex('#1a1818'));
  b.rect(X0, top + 2, X1 - X0, 1, hex('#5a5658'));
}

/** Uma poça: a parte que reflete (marca no `G` para não escurecer) com a cor do que brilha. */
function puddle(b, G, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y += 1) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x += 1) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1) continue;
      const base = mixRgb(hex('#141418'), color, Math.max(0, 0.75 - d) * (bayer(x, y) < 0.6 ? 1 : 0.6));
      G.put(x, y, base);
    }
  }
  b.line(cx - rx * 0.6, cy - ry * 0.3, cx + rx * 0.2, cy - ry * 0.3, [255, 255, 255], 0.25);
}

/** O saco de lixo preto amarrado. */
function trashBag(b, x, y, s = 1) {
  b.ellipse(x, y + 8 * s, 11 * s, 3 * s, BLACK, 0.5);
  b.ellipse(x, y, 10 * s, 9 * s, hex('#1c1c20'));
  b.ellipse(x - 3 * s, y - 3 * s, 5 * s, 4 * s, hex('#3a3a44'), 0.8);
  b.rect(x - 2 * s, y - 11 * s, 4 * s, 3 * s, hex('#141418'));
  b.put(x - 4 * s, y - 2 * s, hex('#8a8a9a'));
}

/** A porta de ferro com o batente, os rebites e a fresta de luz embaixo. */
function steelDoor(b, G, { x0, x1, y0 }, ground) {
  b.rect(x0 - 5, y0 - 5, x1 - x0 + 10, ground - y0 + 5, hex('#3a3430'));
  b.rect(x0 - 5, y0 - 5, x1 - x0 + 10, 2, hex('#6a605a'));
  b.rect(x0, y0, x1 - x0, ground - y0, hex('#3e4448'));
  for (let x = x0 + 2; x < x1 - 2; x += 6) b.rect(x, y0 + 2, 1, ground - y0 - 4, hex('#33383c'));
  for (const yy of [y0 + 6, y0 + 40, ground - 12]) for (let x = x0 + 4; x < x1 - 3; x += 8) b.put(x, yy, hex('#8a9298'));
  b.rect(x1 - 12, y0 + 52, 6, 3, hex('#9a8a6a'));
  G.rect(x0 + 2, ground - 2, x1 - x0 - 4, 1, hex('#ff5a3a'));
  // a janelinha de espiar (fechada)
  b.rect(Math.round((x0 + x1) / 2) - 8, y0 + 16, 16, 6, hex('#1a1c1e'));
  b.rect(Math.round((x0 + x1) / 2) - 8, y0 + 16, 16, 1, hex('#6a7278'));
}

/** O forro do sobretudo aberto: as abas de lã nas pontas e o cetim acolchoado no meio. */
function coatLining(b, r, { x0, x1, y0, y1 }, hooks) {
  b.rect(x0 + 4, y0 + 5, x1 - x0, y1 - y0, BLACK, 0.55);
  // as abas de lã (com a costura e os botões)
  for (const [ax, dir] of [
    [x0, 1],
    [x1 - 16, -1],
  ]) {
    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const n = r();
        b.put(ax + x, y, n < 0.2 ? hex('#1a1820') : n > 0.9 ? hex('#3a3644') : hex('#26232c'));
      }
    }
    const sx = dir > 0 ? ax + 13 : ax + 2;
    for (let y = y0; y < y1; y += 3) b.put(sx, y, hex('#5a5468'));
    for (let y = y0 + 20; y < y1 - 10; y += 34) {
      b.ellipse(dir > 0 ? ax + 7 : ax + 8, y, 2.5, 2.5, hex('#0e0c10'));
      b.put(dir > 0 ? ax + 6 : ax + 7, y - 1, hex('#6a6478'));
    }
  }
  // o cetim acolchoado (losangos costurados, brilho nas almofadinhas)
  const lx0 = x0 + 16;
  const lx1 = x1 - 16;
  for (let y = y0; y < y1; y += 1) {
    for (let x = lx0; x < lx1; x += 1) {
      const u = (x - lx0 + (y - y0)) % 20;
      const v = (x - lx0 - (y - y0) + 400) % 20;
      const seam = u === 0 || v === 0;
      const puff = Math.min(u, 20 - u, v, 20 - v) / 10;
      let c = mixRgb(hex('#2a0e2a'), hex('#6a2a5a'), puff * 0.9);
      if (seam) c = hex('#160614');
      if (!seam && u > 2 && u < 6 && v > 2 && v < 7) c = mixRgb(c, hex('#a85a8a'), 0.35);
      b.put(x, y, c);
    }
  }
  // a sombra das abas no cetim e as presilhas de couro com a argola de latão
  b.light(lx0, y0, 8, y1 - y0, BLACK, (x) => 0.6 - (x - lx0) * 0.07);
  b.light(lx1 - 8, y0, 8, y1 - y0, BLACK, (x) => 0.1 + (x - (lx1 - 8)) * 0.07);
  for (const hx of hooks) {
    b.rect(hx - 4, y0 + 4, 8, 10, hex('#4a2a14'));
    b.rect(hx - 4, y0 + 4, 8, 1, hex('#8a5a32'));
    b.ellipse(hx, y0 + 16, 3, 3, hex('#c9962e'));
    b.ellipse(hx, y0 + 16, 1.5, 1.5, hex('#2a0e2a'));
    b.put(hx - 1, y0 + 14, hex('#ffe08a'));
  }
}

/** O poste de luz de sódio (a lâmpada brilha por si). */
function streetLamp(b, G, x, ground) {
  b.rect(x - 2, 30, 4, ground - 30, hex('#2a2c2e'));
  b.rect(x - 2, 30, 1, ground - 30, hex('#5a5e62'));
  b.rect(x - 4, ground - 8, 8, 8, hex('#2a2c2e'));
  b.line(x, 30, x - 22, 22, hex('#2a2c2e'));
  b.line(x, 31, x - 22, 23, hex('#2a2c2e'));
  b.rect(x - 32, 20, 18, 4, hex('#3a3c3e'));
  G.rect(x - 30, 24, 14, 2, hex('#ffd27a'));
  G.rect(x - 28, 26, 10, 1, hex('#ffb84a'));
}

/** Lambe-lambes colados no tijolo, rasgados. */
function posters(b, r, x, y) {
  const list = [
    ['#e8d8b0', '#b8261c', ['FORRO', 'SÁBADO']],
    ['#f0d84a', '#1a1a1a', ['COMPRO', 'OURO']],
    ['#d8e0e8', '#1a4a9a', ['ALUGA-SE']],
  ];
  list.forEach(([paper, ink, lines], i) => {
    const px = x + i * 30;
    const py = y + (i % 2) * 8;
    const w = 26;
    const h = 8 + lines.length * 7;
    b.rect(px, py, w, h, hex(paper));
    lines.forEach((t, k) => pixelText(b, t, px + Math.round((w - textWidth(t)) / 2), py + 3 + k * 7, hex(ink)));
    // rasgado na ponta e encardido
    b.rect(px + w - 6, py + h - 4, 6, 4, hex('#3a2a24'));
    for (let k = 0; k < 18; k += 1) b.put(px + r() * w, py + r() * h, hex('#8a7a5a'), 0.4);
  });
}

/** A janela gradeada (o quarto lá dentro aceso, fraco). */
function barredWindow(b, G, x, y) {
  b.rect(x - 3, y - 3, 40, 32, hex('#3a3430'));
  for (let yy = 0; yy < 26; yy += 1) for (let xx = 0; xx < 34; xx += 1) G.put(x + xx, y + yy, mixRgb(hex('#e0a050'), hex('#7a4018'), yy / 26 + (bayer(xx, yy) - 0.5) * 0.2));
  b.rect(x + 2, y + 6, 12, 20, hex('#3a2010'), 0.8); // a silhueta de alguém lá dentro
  b.ellipse(x + 8, y + 6, 4, 4, hex('#3a2010'), 0.8);
  for (let k = 0; k < 6; k += 1) b.rect(x + 2 + k * 6, y - 3, 2, 32, hex('#1a1a1c'));
  b.rect(x - 3, y + 12, 40, 2, hex('#1a1a1c'));
}

export function paintAlleyBack(seed = 7, atmosphere = 'boteco', kind = 'market') {
  const raw = buffer(ALLEY_W + PX * 2, ALLEY_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  const { ground, door, coat, hooks } = ALLEY_GEO;
  // o céu de chuva lá em cima, com os fios
  for (let y = -PY; y < 6; y += 1) for (let x = X0; x < X1; x += 1) G.put(x, y, mixRgb(hex('#141c2c'), hex('#0a0e18'), (y + PY) / (PY + 6) + (bayer(x, y) - 0.5) * 0.2));
  for (const [ya, yb] of [
    [-30, -14],
    [-20, -2],
  ]) {
    for (let x = X0; x < X1; x += 1) {
      const t = (x - X0) / (X1 - X0);
      b.put(x, Math.round(ya + (yb - ya) * t + Math.sin(t * Math.PI) * 6), hex('#050505'));
    }
  }
  // o tijolo (o do Submundo é mais vermelho; o do Clube, mais escuro)
  const tones = atmosphere === 'bicho' ? ['#7a3424', '#6a2a1c', '#8a3e2a'] : atmosphere === 'neon' ? ['#4a3a3a', '#3e3030', '#56443e'] : ['#6a4030', '#5a3426', '#764a36'];
  brickWall(b, r, X0, 6, X1, ground, tones, '#2a201c');
  b.rect(X0, 4, X1 - X0, 3, hex('#3a3634'));
  b.rect(X0, 4, X1 - X0, 1, hex('#6a6460'));
  wetGround(b, r, ground);
  // o cano descendo e a calha
  const pipe = kind === 'market' ? 150 : 452;
  b.rect(pipe, 6, 5, ground - 6, hex('#4a4e50'));
  b.rect(pipe, 6, 1, ground - 6, hex('#8a9094'));
  for (let y = 20; y < ground; y += 34) b.rect(pipe - 2, y, 9, 2, hex('#2a2c2e'));
  b.rect(pipe - 4, ground - 4, 14, 4, hex('#3a3e40'));
  const lights = [];
  let glow;
  if (kind === 'market') {
    steelDoor(b, G, door, ground);
    trashBag(b, 24, ground - 6, 1.2);
    trashBag(b, 38, ground - 2, 0.9);
    coatLining(b, r, coat, hooks);
    // o neon vermelho acende o tijolo e as poças
    const red = [1, 0.18, 0.12];
    lights.push({ x: 92, y: 30, r: 200, c: red, k: 1.25 }, { x: 92, y: 120, r: 120, c: [1, 0.4, 0.3], k: 0.35 }, { x: 337, y: -20, r: 260, c: [0.75, 0.6, 0.95], k: 0.7 });
    puddle(b, G, 92, ground + 26, 46, 7, hex('#ff3a2a'));
    puddle(b, G, 30, ground + 42, 22, 5, hex('#c8283a'));
    glow = [255, 50, 40];
  } else {
    barredWindow(b, G, 22, 58);
    posters(b, r, 286, 60);
    streetLamp(b, G, 186, ground);
    trashBag(b, 250, ground - 6, 1);
    lights.push({ x: 164, y: 26, r: 230, c: [1, 0.72, 0.38], k: 1.3, cone: 0.85, out: 0.25 }, { x: 39, y: 72, r: 80, c: [1, 0.66, 0.36], k: 0.5 });
    puddle(b, G, 160, ground + 24, 50, 7, hex('#ffb84a'));
    glow = [255, 190, 90];
  }
  if (atmosphere === 'neon') lights.push({ x: 500, y: 60, r: 220, c: [0.6, 0.3, 1], k: 0.5 });
  if (atmosphere === 'bicho') lights.push({ x: 250, y: 260, r: 280, c: [1, 0.2, 0.1], k: 0.4 });
  relight(raw, lights, { ambient: [0.12, 0.13, 0.22], mask: G.mask, ox: PX, oy: PY });
  if (kind === 'market') halo(raw, 92 + PX, 34 + PY, 70, glow, 0.35, 1.6);
  else halo(raw, 164 + PX, 25 + PY, 46, glow, 0.6, 1.4);
  vignetteBox(raw, PX, PY, ALLEY_W, ALLEY_H, 0.6, 0.45);
  return { w: raw.w, h: raw.h, data: raw.data };
}

/** O porão do Seu Tião. */
export function paintCellarBack(seed = 9, atmosphere = 'boteco') {
  const raw = buffer(ALLEY_W + PX * 2, ALLEY_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  const floor = 178;
  // o teto de vigas, a parede de tijolo velho e o chão de pedra
  for (let y = -PY; y < 10; y += 8) plank(b, r, X0, y, X1 - X0, 8, { tone: { hi: hex('#5a3a20'), mid: hex('#3e2614'), lo: hex('#24150a'), deep: hex('#120a04') } });
  brickWall(b, r, X0, 10, X1, floor, ['#5a4636', '#4e3c2e', '#665040'], '#2a221c');
  b.rect(X0, floor, X1 - X0, Y1 - floor, hex('#262220'));
  for (let y = floor, row = 0; y < Y1; y += 9, row += 1) {
    for (let x = X0 - (row % 2) * 9; x < X1; x += 18) {
      const c = shift(hex('#4a4440'), Math.round((r() - 0.5) * 14));
      b.rect(x, y, 17, 8, c);
      b.rect(x, y, 17, 1, shift(c, 16));
    }
  }
  b.rect(X0, floor, X1 - X0, 2, hex('#1a1612'));
  // os canos enferrujados no alto
  for (const [y, c] of [
    [16, '#6a5a4a'],
    [24, '#7a4a2a'],
  ]) {
    b.rect(X0, y, X1 - X0, 4, hex(c));
    b.rect(X0, y, X1 - X0, 1, shift(hex(c), 40));
    for (let x = X0 + 30; x < X1; x += 90) b.rect(x, y - 1, 4, 6, hex('#3a3028'));
  }
  for (let i = 0; i < 14; i += 1) b.put(X0 + r() * (X1 - X0), 29 + r() * 30, hex('#7a3a14'), 0.6);
  // a grade do teto por onde desce a luz da rua
  const gx = 210;
  G.rect(gx - 22, 10, 44, 3, hex('#dce8f0'));
  for (let x = gx - 22; x < gx + 22; x += 5) b.rect(x, 9, 2, 5, hex('#1a1c1e'));
  // a prateleira de tralha à direita e as teias nos cantos
  plank(b, r, 330, 92, 150, 4, { tone: { hi: hex('#8a6a40'), mid: hex('#5e4426'), lo: hex('#3a2814'), deep: hex('#1e140a') } });
  for (let x = 336; x < 474; x += 14 + Math.floor(r() * 8)) {
    const h = 8 + Math.floor(r() * 10);
    const c = hex(['#3a5a3a', '#6a4a2a', '#8a8a8a', '#5a2a1a'][Math.floor(r() * 4)]);
    b.rect(x, 92 - h, 7, h, c);
    b.rect(x + 1, 92 - h, 1, h - 1, shift(c, 30));
  }
  for (const [cx, cy, dir] of [
    [X0 + 4, 30, 1],
    [X1 - 4, 30, -1],
  ]) {
    for (let k = 0; k < 6; k += 1) b.line(cx, cy, cx + dir * (10 + k * 6), cy + 24 - k * 4, [220, 220, 220], 0.25);
    for (let k = 1; k < 4; k += 1) b.line(cx + dir * k * 8, cy + 2, cx + dir * 4, cy + k * 7, [220, 220, 220], 0.2);
  }
  const lights = [
    { x: gx, y: 10, r: 230, c: [0.85, 0.92, 1], k: 1.2, cone: 0.42, out: 0.2 },
    { x: gx, y: 172, r: 110, c: [0.85, 0.92, 1], k: 0.55, sy: 2.2 },
    { x: 410, y: 60, r: 140, c: [1, 0.7, 0.4], k: 0.35 },
  ];
  if (atmosphere === 'neon') lights.push({ x: 520, y: 100, r: 240, c: [0.6, 0.3, 1], k: 0.45 });
  if (atmosphere === 'bicho') lights.push({ x: 250, y: 260, r: 260, c: [1, 0.2, 0.1], k: 0.45 });
  relight(raw, lights, { ambient: [0.16, 0.15, 0.19], mask: G.mask, ox: PX, oy: PY });
  halo(raw, gx + PX, 12 + PY, 40, [220, 236, 255], 0.5, 1.8);
  vignetteBox(raw, PX, PY, ALLEY_W, ALLEY_H, 0.65, 0.45);
  return { w: raw.w, h: raw.h, data: raw.data };
}
