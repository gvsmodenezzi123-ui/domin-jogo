/**
 * Versão 2.13: a sala de cada região atrás da mesa deitada, pintada do zero como a tela inicial:
 * primeiro as cores de verdade de cada coisa, depois a luz (lightPass.js: a ambiente da sala, a
 * lâmpada da mesa, os neons, as luminárias, a lua, as velas), em degraus pontilhados, e o que
 * brilha por si (o neon, o bulbo, a lua, o vidro aceso) fica de fora da luz e ganha o halo.
 *
 *   landsinuca  Região 2, o Clube da Sinuca Clandestino: o porão de tijolo com a tubulação no
 *               teto, o neon SINUCA com a bola 8, a porta de ferro com a SAÍDA, a régua dos tacos
 *               (um quebrado), o marcador de bolinhas, o cartaz do torneio e as duas mesas de
 *               sinuca do fundo, cada uma sob a sua luminária, na fumaça.
 *   landbicho   Região 3, o Submundo do Jogo do Bicho: o escritório do bicheiro, papel de parede
 *               vinho em ogiva, lambri de mogno, o retrato do patrão e a tabela dos 25 bichos sob
 *               as luzes de quadro, a luz vermelha da rua entrando pela persiana, a poltrona de
 *               couro com o charuto, a mesa com a luminária de banqueiro, os maços e o telefone, e
 *               o cofre.
 *   landnoite   O Dono da Noite: a janela gótica com a lua cheia atrás dele, as cortinas de veludo,
 *               a coleção de corações nas redomas (com uma vazia), o relógio parado à meia-noite e
 *               o mármore preto; quem acende a sala são as quatro velas da mesa.
 *
 * A cena vale para qualquer tela deitada: tudo se mede pela altura (u = h / 195) e se prende ao
 * meio (o que fica atrás do rival), à esquerda ou à direita. Fora do HUD (o canto de cima à
 * esquerda, o dorme em cima à direita, a coluna dos consumíveis) e do busto do rival.
 */
import { paintKit } from './botecoScene.js';
import { glowLayer, halo, relight } from './lightPass.js';
import { pixelText, textWidth } from './pixelFont.js';
import { landCandleSpots, landCorners } from '../seatGeometry.js';
import { CANDLE_FLAME } from './candleArt.js';

const { mixRgb, shift, rngOf, bayer, buffer, shelf } = paintKit;

// as cores e as rampas são lidas uma vez só (a pintura pede a mesma cor em cada pixel)
const HEX = new Map();
const hex = (c) => {
  let v = HEX.get(c);
  if (!v) {
    v = paintKit.hex(c);
    HEX.set(c, v);
  }
  return v;
};

const BLACK = [0, 0, 0];

/** Qual sala cada clima de região usa na mesa deitada (a do boteco é a de sempre). */
export const LAND_ROOMS = Object.freeze({ boteco: 'landroom', neon: 'landsinuca', bicho: 'landbicho' });

// ---------------------------------------------------------------------------
// Ferramentas
// ---------------------------------------------------------------------------

/** Um tom da rampa `pal` (t de 0 a 1), em pontilhado entre dois vizinhos. */
function ramp(pal, t, x, y) {
  const n = pal.length - 1;
  const v = Math.max(0, Math.min(1, t)) * n;
  const i = Math.floor(v);
  return pal[Math.min(n, v - i > bayer(x, y) ? i + 1 : i)];
}

const PALS = new Map();
const pal = (...cs) => {
  const key = cs.join();
  let v = PALS.get(key);
  if (!v) {
    v = cs.map(hex);
    PALS.set(key, v);
  }
  return v;
};

/** As rampas de cor usadas pixel a pixel (lidas uma vez). */
const RAMP_1 = pal('#26406a', '#30508a', '#4064a0');
const RAMP_2 = pal('#9a9070', '#b8ae8a', '#cfc6a2', '#e0d8b8');
const RAMP_3 = pal('#3a3832', '#4a4840', '#5a564c');
const RAMP_4 = pal('#16301e', '#1e4028', '#285234');
const RAMP_5 = pal('#e8b030', '#f8d050', '#fff0a0');
const RAMP_6 = pal('#5a0a08', '#8a1810', '#b8261c', '#d84a30');
const RAMP_7 = pal('#4a2218', '#5e2c1e', '#723826');
const RAMP_8 = pal('#2a1608', '#3a2010', '#4a2c16', '#5a3820');
const RAMP_9 = pal('#0a2414', '#145a30', '#2a8a4a', '#6ac888');
const RAMP_10 = pal('#c8b48a', '#e2d2a8', '#efe2c0');
const RAMP_11 = pal('#1e1e22', '#26262a', '#2e2c30');
const RAMP_12 = pal('#3a0a10', '#4a1016', '#561419');
const RAMP_13 = pal('#100c08', '#1e180e', '#2c2414', '#3a301a');
const RAMP_14 = pal('#8a7e62', '#b8ac8c', '#e0d4b4', '#f4ecd4');
const RAMP_15 = pal('#b89a68', '#d4c094', '#e6d6ae', '#efe2c0');
const RAMP_16 = pal('#8a4a1a', '#d08a3a', '#f0c070', '#ffe2a0');
const RAMP_17 = pal('#0a3a1a', '#1a6a32', '#3aa858', '#8ae8a0');
const RAMP_18 = pal('#3e0a10', '#4e0e14', '#5a1218');
const RAMP_19 = pal('#1e1a26', '#2e2838', '#423a50', '#5a5068');
const RAMP_20 = pal('#a8a8b8', '#c8c8d4', '#e4e2e8', '#fbf8f0');
const RAMP_21 = pal('#05061a', '#0b1030', '#16204a', '#2a3a6a', '#4a5a8a');
const RAMP_22 = pal('#141a36', '#20284a', '#2e3860');
const RAMP_23 = pal('#040308', '#09070e', '#110d16');
const RAMP_24 = pal('#16121e', '#201a2a', '#2c2438');

/**
 * A geometria da sala: os cantos do tampo (seatGeometry.js, em px da cena: a cena tem metade dos
 * px de CSS) e os três jeitos de prender uma coisa: ao meio (`M`), à esquerda (`L`) e à direita
 * (`R`), sempre em px da tela de referência (422 × 195).
 */
function geometry(w, h) {
  const c = landCorners(w * 2, h * 2);
  const u = h / 195;
  const cx = w / 2;
  return {
    w,
    h,
    u,
    cx,
    yFar: c.yFar / 2,
    yNear: c.yNear / 2,
    farL: c.farL / 2,
    farR: c.farR / 2,
    nearL: c.nearL / 2,
    nearR: c.nearR / 2,
    floor: Math.round(h * 0.47),
    M: (x) => Math.round(cx + (x - 211) * u),
    L: (x) => Math.round(x * u),
    R: (x) => Math.round(w - (422 - x) * u),
    Y: (y) => Math.round(y * u),
    S: (v) => Math.max(1, Math.round(v * u)),
    /** A escala inteira dos desenhos miúdos (letras, bichos): 1 no celular. */
    k: Math.max(1, Math.round(u)),
  };
}

/**
 * Versão 2.38: a perspectiva do chão, uma só para todas as salas, do jeito que quem senta na
 * mesa vê: o chão foge para o fundo (o horizonte fica lá em cima, atrás da parede), tudo diminui
 * e as linhas convergem para o meio. Para cada pixel do chão devolve a posição no chão de
 * verdade, em "px de perto" (1 unidade = 1 px na última linha da tela): `x` para os lados e `z`
 * para o fundo. Antes cada sala pintava o chão chapado, como se fosse visto de cima.
 */
function groundOf(g) {
  const hy = g.floor - (g.h - g.floor) * 0.8;
  const near = g.h - hy;
  return {
    x: (px, py) => ((px - g.cx) * near) / (py - hy),
    z: (py) => (near * near) / (py - hy) - near,
    /** Quanto as coisas encolhem nesta linha (1 embaixo, ~0,45 no rodapé). */
    k: (py) => (py - hy) / near,
  };
}

/** Tijolo aparente: cada um no seu tom, a quina de cima pegando luz, lascas e fuligem. */
function brickWall(b, r, x0, y0, x1, y1, { bw = 9, bh = 4, tones, mortar }) {
  b.rect(x0, y0, x1 - x0, y1 - y0, mortar);
  for (let row = 0, y = y0; y < y1; row += 1, y += bh) {
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let x = x0 - off; x < x1; x += bw) {
      const c = shift(tones[Math.floor(r() * tones.length)], Math.round((r() - 0.5) * 9));
      const ww = bw - 1;
      const hh = bh - 1;
      b.rect(x, y, ww, hh, c);
      b.rect(x, y, ww, 1, shift(c, 13), 0.75);
      b.rect(x + ww - 1, y + 1, 1, hh - 1, shift(c, -12), 0.6);
      if (r() < 0.14) b.rect(x + (r() < 0.5 ? 0 : ww - 2), y + (r() < 0.5 ? 0 : hh - 1), 2, 1, mortar);
      if (r() < 0.07) b.rect(x + 1, y + 1, ww - 2, hh - 1, shift(c, -20), 0.55);
      if (r() < 0.05) b.put(x + 2 + Math.floor(r() * (ww - 4)), y + 1, shift(c, 24));
    }
  }
}

/**
 * Letreiro de neon com as letras de 3 × 5 (pixelFont.js) em tubo: cada ponto da letra vira um
 * bloco de `s` px na cor do tubo e o miolo branco corre pelo meio, ligando os pontos vizinhos.
 */
function neonText(G, text, x, y, s, tube, core) {
  const cells = [];
  pixelText({ put() {} }, text, 0, 0, BLACK, { put: (px, py) => cells.push([px, py]) });
  const has = new Set(cells.map(([a, c]) => `${a},${c}`));
  const m = Math.floor(s / 2);
  for (const [gx, gy] of cells) G.rect(x + gx * s, y + gy * s, s, s, tube);
  for (const [gx, gy] of cells) {
    const px = x + gx * s + m;
    const py = y + gy * s + m;
    G.put(px, py, core);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
    ]) {
      if (!has.has(`${gx + dx},${gy + dy}`)) continue;
      // na diagonal só liga se não houver o caminho reto
      if (dx && dy && (has.has(`${gx + dx},${gy}`) || has.has(`${gx},${gy + dy}`))) continue;
      for (let k = 1; k < s; k += 1) G.put(px + dx * k, py + dy * k, core);
      if (dx && dy) for (let k = 0; k <= s; k += 1) G.put(px + dx * k + (dx > 0 ? 0 : 0), py + dy * k - 1, tube, 0.9);
    }
  }
  return textWidth(text) * s;
}

/** Fumaça: faixas onduladas e claras, em pontilhado. */
function haze(b, x0, y0, x1, y1, color, amount, seed = 0) {
  b.light(x0, y0, x1 - x0, y1 - y0, hex(color), (x, y) => {
    const n = Math.sin(x * 0.045 + seed) * 0.5 + Math.sin(x * 0.013 - y * 0.08 + seed * 2) * 0.5 + Math.sin((x + y * 2) * 0.021 + seed) * 0.4;
    const t = Math.max(0, n) * amount;
    return t > bayer(x, y) * 0.35 ? t : 0;
  });
}

/** Sombra de contato embaixo de uma coisa no chão (elipse escura em pontilhado). */
function contact(b, cx, cy, rx, ry, a = 0.6) {
  b.light(cx - rx, cy - ry, rx * 2, ry * 2, BLACK, (x, y) => {
    const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
    return d < 1 ? (1 - d) * a * 1.6 : 0;
  });
}

// ---------------------------------------------------------------------------
// Região 1: o Boteco da Esquina
// ---------------------------------------------------------------------------

const PLASTER = pal('#1a2620', '#24342a', '#2e4034', '#3a4e40', '#4a6050');

/** Azulejo português: creme com o desenho azul (os quartos de círculo dos cantos fecham a roda entre as peças). */
function azulejo(b, r, x0, y0, x1, y1, g) {
  const T = g.S(10);
  const blue = RAMP_1;
  const cream = RAMP_2;
  for (let ty = y0; ty < y1; ty += T) {
    for (let tx = 0; tx < g.w; tx += T) {
      const missing = r() < 0.03;
      const tone = r() * 0.25;
      const stain = r() < 0.18 ? 0.25 + r() * 0.3 : 0;
      for (let yy = 0; yy < T - 1 && ty + yy < y1; yy += 1) {
        for (let xx = 0; xx < T - 1; xx += 1) {
          const x = tx + xx;
          const y = ty + yy;
          if (missing) {
            b.put(x, y, ramp(RAMP_3, 0.5 + Math.sin(x * 1.3 + y) * 0.3, x, y));
            continue;
          }
          const u = xx / (T - 1);
          const v = yy / (T - 1);
          const corner = Math.min(Math.hypot(u, v), Math.hypot(1 - u, v), Math.hypot(u, 1 - v), Math.hypot(1 - u, 1 - v));
          const center = Math.abs(u - 0.5) + Math.abs(v - 0.5);
          const motif = (corner > 0.28 && corner < 0.42) || center < 0.16 || (center > 0.3 && center < 0.36 && (Math.abs(u - 0.5) < 0.06 || Math.abs(v - 0.5) < 0.06));
          // o encardido: mais embaixo e onde respingou
          const dirt = (y - y0) / (y1 - y0) * 0.35 + stain * (Math.sin(xx * 0.9 + yy * 0.7) > 0 ? 1 : 0.5);
          let c = motif ? ramp(blue, 0.7 - dirt - tone, x, y) : ramp(cream, 0.85 - dirt - tone, x, y);
          if (xx === 0 || yy === 0) c = shift(c, 14);
          b.put(x, y, c);
        }
      }
      // a trinca
      if (!missing && r() < 0.06) b.line(tx + 1, ty + 2, tx + T - 2, ty + T - 3, hex('#4a443a'), 0.8);
    }
  }
  // o rejunte encardido
  for (let y = y0; y < y1; y += 1) for (let x = 0; x < g.w; x += 1) if ((x % T === T - 1) || ((y - y0) % T === T - 1)) b.put(x, y, hex('#2a2620'));
}

/** A placa pintada do FIADO SÓ AMANHÃ, pendurada no prego pelo barbante. */
function fiadoSign(b, x, y) {
  const W = 44;
  const H = 17;
  b.line(x + 6, y, x + W / 2, y - 6, hex('#c8b890'));
  b.line(x + W - 6, y, x + W / 2, y - 6, hex('#c8b890'));
  b.rect(x + W / 2 - 1, y - 7, 2, 2, hex('#6a6a6a'));
  b.rect(x + 2, y + 2, W, H, BLACK, 0.45);
  for (let yy = 0; yy < H; yy += 1) for (let xx = 0; xx < W; xx += 1) b.put(x + xx, y + yy, ramp(RAMP_4, 0.6 - (yy % 5 === 0 ? 0.3 : 0) + Math.sin(xx * 0.5) * 0.1, xx, yy));
  b.rect(x, y, W, 1, hex('#5a8a5a'));
  b.rect(x, y + H - 1, W, 1, hex('#0a140c'));
  pixelText(b, 'FIADO', x + Math.round((W - textWidth('FIADO')) / 2), y + 3, hex('#f4e6b0'));
  pixelText(b, 'SO AMANHA', x + Math.round((W - textWidth('SO AMANHA')) / 2), y + 10, hex('#e8c050'));
  b.put(x + 22, y + 8, hex('#e8c050'));
}

/** O relógio de parede de aro vermelho (parou faz tempo). */
function wallClock(b, x, y, rr) {
  b.ellipse(x + 1, y + 1, rr + 1, rr + 1, BLACK, 0.45);
  b.ellipse(x, y, rr + 1, rr + 1, hex('#5a0e0a'));
  b.ellipse(x, y, rr, rr, hex('#b8261c'));
  b.ellipse(x - 0.5, y - 0.5, rr - 2, rr - 2, hex('#efe6cc'));
  for (let hh = 0; hh < 12; hh += 1) {
    const a = (hh / 12) * Math.PI * 2;
    b.put(Math.round(x + Math.sin(a) * (rr - 3)), Math.round(y - Math.cos(a) * (rr - 3)), hex('#2a2420'));
  }
  b.line(x, y, x + 3, y - 3, hex('#1a1410'));
  b.line(x, y, x - 1, y + 5, hex('#1a1410'));
  b.put(x, y, hex('#b8261c'));
  b.put(x - rr + 2, y - rr + 3, hex('#ffffff'));
}

/** A flâmula do time, pendurada no palito. */
function pennant(b, x, y) {
  b.rect(x - 1, y, 18, 1, hex('#c8a46a'));
  for (let k = 0; k < 20; k += 1) {
    const half = Math.max(0, Math.round(8 - k * 0.42));
    for (let xx = -half; xx <= half; xx += 1) b.put(x + 8 + xx, y + 1 + k, Math.abs(xx) > half - 1 ? hex('#c8a040') : (xx + 20) % 6 < 3 ? hex('#141414') : hex('#f0ece0'));
  }
  b.rect(x + 6, y + 4, 5, 3, hex('#b8261c'));
}

/** O letreiro de acrílico iluminado por dentro: CERVEJA GELADA. */
function beerLightbox(b, G, x, y, w) {
  const h = 12;
  b.rect(x - 1, y - 1, w + 2, h + 2, hex('#2a2a2c'));
  for (let yy = 0; yy < h; yy += 1) for (let xx = 0; xx < w; xx += 1) G.put(x + xx, y + yy, ramp(RAMP_5, 0.9 - Math.abs(yy - h / 2) / h, xx, yy));
  G.rect(x, y, w, 2, hex('#c81e14'));
  G.rect(x, y + h - 2, w, 2, hex('#c81e14'));
  pixelText(G, 'CERVEJA GELADA', x + Math.round((w - textWidth('CERVEJA GELADA')) / 2), y + 4, hex('#a01410'));
  b.rect(x + 4, y + h + 1, 1, 3, hex('#3a3a3a'));
  b.rect(x + w - 5, y + h + 1, 1, 3, hex('#3a3a3a'));
}

/** O vidro de ovo colorido no balcão (rosa, azul, verde, amarelo) com a tampa de lata. */
function eggJar(b, x, base) {
  b.rect(x, base - 14, 12, 14, hex('#b8c8b8'), 0.35);
  const eggs = ['#e85a8a', '#4a8ad8', '#5ab85a', '#e8c040', '#e85a8a', '#4a8ad8'];
  eggs.forEach((c, k) => b.ellipse(x + 3 + (k % 2) * 5 + (k > 3 ? 1 : 0), base - 3 - Math.floor(k / 2) * 4, 2.2, 2, hex(c)));
  b.rect(x, base - 15, 12, 2, hex('#a8a8a0'));
  b.rect(x, base - 15, 12, 1, hex('#e8e8e0'));
  b.rect(x + 1, base - 13, 1, 11, hex('#ffffff'), 0.5);
}

/** A lâmpada nua pendurada no fio torto. */
function bareBulb(b, G, x, top, y) {
  for (let yy = top; yy < y - 4; yy += 1) b.put(x + Math.round(Math.sin(yy * 0.4) * 0.6), yy, hex('#1a1a1a'));
  b.rect(x - 1, y - 5, 3, 2, hex('#6a6a64'));
  G.ellipse(x + 0.5, y, 2.6, 3.2, hex('#ffe9a8'));
  G.rect(x, y - 1, 1, 2, hex('#ffffff'));
}

/** A cadeira de plástico vermelha de boteco e a pilha de engradados amarelos com os cascos. */
function plasticChair(b, x, y) {
  const red = RAMP_6;
  // o encosto com os rasgos e o assento
  for (let yy = 0; yy < 14; yy += 1) for (let xx = 0; xx < 18; xx += 1) b.put(x + xx, y + yy, ramp(red, 0.75 - xx / 40 - (yy > 11 ? 0.2 : 0), xx, yy));
  for (let k = 0; k < 3; k += 1) b.rect(x + 4 + k * 4, y + 3, 2, 6, hex('#2a0604'));
  b.rect(x - 1, y + 14, 20, 3, red[3]);
  b.rect(x - 1, y + 16, 20, 1, red[1]);
  for (const lx of [x, x + 16]) {
    b.line(lx + 1, y + 17, lx + (lx === x ? -1 : 3), y + 32, red[2]);
    b.line(lx + 2, y + 17, lx + (lx === x ? 0 : 4), y + 32, red[1]);
  }
  contact(b, x + 9, y + 32, 13, 2, 0.6);
}

function beerCrates(b, x, base, n) {
  for (let k = 0; k < n; k += 1) {
    const y = base - (k + 1) * 9;
    b.rect(x, y, 22, 9, hex('#c89a14'));
    b.rect(x, y, 22, 1, hex('#f0c840'));
    b.rect(x + 2, y + 3, 18, 3, hex('#8a6a0a'));
    for (let s = 0; s < 4; s += 1) b.rect(x + 3 + s * 5, y + 3, 2, 3, hex('#3d1d0b'));
    if (k === n - 1) for (let s = 0; s < 4; s += 1) {
      b.rect(x + 3 + s * 5, y - 6, 3, 6, hex('#3d1d0b'));
      b.rect(x + 4 + s * 5, y - 9, 1, 3, hex('#3d1d0b'));
      b.put(x + 3 + s * 5, y - 5, hex('#7d4419'));
    }
  }
  contact(b, x + 11, base, 14, 2, 0.6);
}

/** O freezer horizontal branco com a faixa vermelha e o puxador cromado. */
function chestFreezer(b, x, y, w, h) {
  b.rect(x, y, w, 5, hex('#d8dcd8'));
  b.rect(x, y, w, 1, hex('#ffffff'));
  b.rect(x, y + 5, w, h - 5, hex('#c8ccc8'));
  b.rect(x, y + 5, w, 1, hex('#8a8e8a'));
  b.rect(x, y + 9, w, 5, hex('#c81e14'));
  pixelText(b, 'GELADA', x + Math.round((w - textWidth('GELADA')) / 2), y + 9, hex('#ffffff'));
  b.rect(x + Math.round(w / 2) - 6, y + 4, 12, 2, hex('#e8ecec'));
  b.rect(x + Math.round(w / 2) - 6, y + 5, 12, 1, hex('#6a6e6e'));
  b.rect(x + w - 1, y, 1, h, hex('#8a8e8a'));
  b.rect(x + 2, y + h - 3, w - 4, 3, hex('#3a3c3a'));
  for (let k = 4; k < w - 4; k += 3) b.put(x + k, y + h - 2, hex('#1a1a1a'));
  contact(b, x + w / 2, y + h, w * 0.6, 3, 0.7);
}

function sceneBoteco(b, G, r, g) {
  const { w, h, M, L, R, Y, S, floor } = g;
  const band = Y(48);
  // o reboco verde: manchas de umidade, o descascado mostrando o tijolo e as rachaduras
  for (let y = 0; y < band; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const n = Math.sin(x * 0.07 + Math.sin(y * 0.09) * 2) + Math.sin(y * 0.13 + x * 0.02) + Math.sin(x * 0.31 + y * 0.17) * 0.3;
      b.put(x, y, ramp(PLASTER, 0.55 + n * 0.16 - (y < Y(10) ? 0.15 : 0), x, y));
    }
  }
  for (const [cx, cy, rx, ry] of [
    [M(132), Y(20), 9, 5],
    [L(70), Y(26), 12, 6],
    [M(270), Y(30), 8, 4],
    [R(400), Y(40), 10, 5],
  ]) {
    for (let y = Math.floor(cy - ry * g.u); y <= cy + ry * g.u; y += 1) {
      for (let x = Math.floor(cx - rx * g.u); x <= cx + rx * g.u; x += 1) {
        const d = Math.hypot((x - cx) / (rx * g.u), (y - cy) / (ry * g.u)) + Math.sin(x * 0.9 + cy) * 0.22 + Math.sin(y * 1.3 + x * 0.4) * 0.18;
        if (d > 1) continue;
        // a beirada do reboco quebrado (clara em cima, a sombra embaixo) e o tijolo por baixo
        if (d > 0.84) b.put(x, y, y < cy ? hex('#6a8270') : hex('#141c16'));
        else {
          const row = Math.floor((y - cy) / 3);
          const mortar = (y - cy + 99) % 3 === 0 || (x + (row % 2 ? 3 : 0) + 99) % 7 === 0;
          b.put(x, y, mortar ? hex('#2a1a12') : ramp(RAMP_7, 0.5 + Math.sin(x * 2.1 + row) * 0.3, x, y));
        }
      }
    }
  }
  // as manchas de umidade escorrendo
  for (let i = 0; i < Math.round(w / 9); i += 1) {
    const x = Math.floor(r() * w);
    const y0 = Math.floor(r() * band * 0.6);
    const len = 6 + Math.floor(r() * band * 0.5);
    for (let k = 0; k < len; k += 1) b.put(x + (k % 7 === 0 ? 1 : 0), y0 + k, hex('#121a14'), 0.35 * (1 - k / len));
  }
  // a viga do teto com a fiação e os canos
  b.rect(0, 0, w, Y(4), hex('#2a1a0e'));
  b.rect(0, Y(4), w, 1, hex('#120a04'));
  for (let x = 0; x < w; x += 1) b.put(x, Y(6) + Math.round(Math.sin(x / (w * 0.06)) * 1.4 + 1), hex('#0e120f'));
  for (const px of [M(122), R(404)]) {
    b.rect(px, 0, S(3), floor, hex('#3a4038'));
    b.rect(px, 0, 1, floor, hex('#7a8478'));
    b.rect(px + S(3) - 1, 0, 1, floor, hex('#14180f'));
    for (let y = Y(12); y < floor; y += S(24)) {
      b.rect(px - 1, y, S(3) + 2, S(2), hex('#1a1e18'));
      b.put(px - 1, y, hex('#6a7064'));
    }
  }
  // a caixa de luz com os fios descendo
  b.rect(M(104), Y(10), S(10), S(12), hex('#5a5e58'));
  b.rect(M(104), Y(10), S(10), 1, hex('#9aa094'));
  b.rect(M(106), Y(13), S(6), S(3), hex('#1a1c1a'));
  for (let k = 0; k < S(30); k += 1) b.put(M(107) + Math.round(Math.sin(k * 0.15) * 1.5), Y(22) + k, hex('#14100c'));
  // a faixa de azulejo com o friso azul em cima
  azulejo(b, r, 0, band + S(3), w, floor, g);
  b.rect(0, band, w, S(3), hex('#1e3a6a'));
  b.rect(0, band, w, 1, hex('#4a6ab0'));
  b.rect(0, band + S(3), w, 1, hex('#0e1a30'));
  // à esquerda do rival: a placa do fiado, a flâmula e o relógio
  fiadoSign(b, L(56), Y(36));
  pennant(b, M(140), Y(30));
  wallClock(b, M(164), Y(15), S(8));
  // à direita: o letreiro da cerveja, a lâmpada nua e as prateleiras de garrafas
  beerLightbox(b, G, M(250), Y(6), S(66));
  bareBulb(b, G, M(336), Y(4), Y(22));
  const sx = M(252);
  const sw = w - sx + S(4);
  shelf(b, r, sx, Y(38), sw, [2, 0, 4, 'mug', 1, 3, 5, 0, 2, 'mug', 4, 1]);
  shelf(b, r, sx, Y(62), sw, [0, 3, 'mug', 5, 2, 1, 'mug', 4, 3, 0]);
  eggJar(b, M(316), Y(62));
  // embaixo: o taco do chão, a cadeira e os engradados à esquerda, o freezer à direita
  {
    // (versão 2.38: as tábuas correm para o fundo e convergem; as emendas ficam mais juntas lá longe)
    const gr = groundOf(g);
    const plank = S(15);
    for (let y = floor; y < h; y += 1) {
      const t = (y - floor) / (h - floor);
      const gz = gr.z(y);
      for (let x = 0; x < w; x += 1) {
        const gx = gr.x(x, y) / plank;
        const col = Math.floor(gx);
        const fx = gx - col;
        const row = Math.floor((gz + ((col * 37) % 60)) / (plank * 5));
        const fz = (gz + ((col * 37) % 60)) / (plank * 5) - row;
        const seam = fx < 0.06 || fz < 0.03 / Math.max(0.35, gr.k(y));
        b.put(x, y, seam ? hex('#1a0e06') : ramp(RAMP_8, 0.62 - (1 - t) * 0.3 + ((col + row) % 2 ? 0.1 : 0) + Math.sin(col * 3.7 + row * 1.9) * 0.08, x, y));
      }
    }
  }
  b.rect(0, floor, w, S(3), hex('#24140a'));
  b.rect(0, floor, w, 1, hex('#6a4224'));
  beerCrates(b, L(28), Y(128), 3);
  plasticChair(b, L(52), Y(96));
  chestFreezer(b, R(352), Y(98), S(62), S(30));
  beerCrates(b, R(364), Y(98), 1);
}

function lightsBoteco(g) {
  const { M, L, Y, u } = g;
  return {
    ambient: [0.19, 0.2, 0.2],
    lights: [
      { x: g.cx, y: Y(4), r: 140 * u, c: [1, 0.84, 0.58], k: 1.0, sy: 1.1 },
      { x: M(336), y: Y(22), r: 110 * u, c: [1, 0.82, 0.52], k: 1.6, sy: 0.9 },
      { x: M(283), y: Y(12), r: 70 * u, c: [1, 0.9, 0.55], k: 0.9 },
      // a luz da rua entrando pela porta, à esquerda, e o frio do freezer
      { x: L(-10), y: Y(70), r: 120 * u, c: [0.55, 0.65, 0.9], k: 0.7 },
    ],
  };
}

function finishBoteco(raw, g) {
  const { M, Y, u } = g;
  halo(raw, M(336), Y(22), 34 * u, hex('#ffd890'), 0.55, 1.1);
  halo(raw, M(283), Y(12), 46 * u, hex('#ffd060'), 0.35, 2.4);
}

// ---------------------------------------------------------------------------
// Região 2: o Clube da Sinuca Clandestino
// ---------------------------------------------------------------------------

const BRICK = pal('#5a281f', '#4c221b', '#663024', '#40201a', '#53261f', '#6e3527');
const POOL_WOOD = { hi: hex('#8a4a22'), mid: hex('#5e2c12'), lo: hex('#3a1808'), deep: hex('#1c0a02') };
const POOL_FELT = pal('#0c3a24', '#11502f', '#17683c', '#1f8048');

/** A luminária de sinuca: a barra de latão nas correntes e as três cúpulas verdes, acesas por baixo. */
function poolLamp(b, G, x, y, w, top) {
  // as correntes até o teto
  for (const cx of [x + 3, x + w - 4]) {
    for (let yy = top; yy < y; yy += 2) {
      b.put(cx, yy, hex('#5a5a54'));
      b.put(cx, yy + 1, hex('#2a2a28'));
    }
  }
  // a barra
  b.rect(x, y, w, 2, hex('#6a4a1a'));
  b.rect(x, y, w, 1, hex('#d8a84a'));
  // as cúpulas: domo de vidro verde, o friso dourado e a boca acesa
  const sw = Math.floor((w - 4) / 3);
  for (let k = 0; k < 3; k += 1) {
    const sx = x + 2 + k * sw + Math.floor(sw / 2);
    b.rect(sx, y + 2, 1, 2, hex('#3a2a10'));
    for (let row = 0; row < 6; row += 1) {
      const half = 2 + Math.round(row * 1.25);
      for (let xx = -half; xx <= half; xx += 1) b.put(sx + xx, y + 4 + row, ramp(RAMP_9, 0.25 + (1 - Math.abs(xx) / (half + 1)) * 0.55 - row * 0.05, sx + xx, row));
    }
    b.rect(sx - 8, y + 9, 17, 1, hex('#c8a040'));
    G.rect(sx - 7, y + 10, 15, 1, hex('#fff2c8'));
    G.rect(sx - 2, y + 10, 5, 1, hex('#ffffff'));
  }
}

/** A arandela de gaiola: a lâmpada nua dentro da grade de arame, no braço de ferro. */
function cageLamp(b, G, x, y) {
  b.rect(x - 1, y - 4, 3, 3, hex('#2a2a2a'));
  b.rect(x, y - 1, 1, 2, hex('#3a3a3a'));
  G.ellipse(x + 0.5, y + 4, 2.6, 3.2, hex('#ffe6a8'));
  G.rect(x, y + 3, 1, 2, hex('#ffffff'));
  for (const dx of [-3, 0, 3]) b.line(x + dx, y + 1, x + dx, y + 7, hex('#4a4a46'), 0.85);
  b.rect(x - 3, y + 1, 7, 1, hex('#5a5a54'));
  b.rect(x - 3, y + 7, 7, 1, hex('#5a5a54'));
}

/** A mesa de sinuca do fundo: o pano em perspectiva, a tabela, as caçapas, as bolas, o gabinete e os pés. */
function poolTable(b, r, x, y, w, d, { balls = [], cue = null } = {}) {
  const lean = Math.round(d * 0.35);
  // o pano (um trapézio fino, a beirada de lá mais estreita)
  for (let k = 0; k < d; k += 1) {
    const inset = Math.round(((d - k) / d) * lean);
    for (let xx = x + 3 + inset; xx < x + w - 3 - inset; xx += 1) b.put(xx, y + 2 + k, ramp(POOL_FELT, 0.35 + (k / d) * 0.4, xx, y + k));
  }
  // a tabela de madeira em volta
  b.rect(x + lean, y, w - lean * 2, 2, POOL_WOOD.mid);
  b.rect(x + lean, y, w - lean * 2, 1, POOL_WOOD.hi);
  for (let k = 0; k < d + 2; k += 1) {
    const inset = Math.round(((d + 2 - k) / (d + 2)) * lean);
    b.rect(x + inset, y + k, 3, 1, k % 3 ? POOL_WOOD.mid : POOL_WOOD.hi);
    b.rect(x + w - 3 - inset, y + k, 3, 1, POOL_WOOD.lo);
  }
  b.rect(x, y + d + 2, w, 3, POOL_WOOD.mid);
  b.rect(x, y + d + 2, w, 1, POOL_WOOD.hi);
  // os losangos de madrepérola
  for (let k = 1; k < 4; k += 1) b.put(x + Math.round((w * k) / 4), y + d + 3, hex('#e8f0e8'));
  // as caçapas
  for (const [px, py] of [
    [x + lean + 1, y + 1],
    [x + Math.round(w / 2), y],
    [x + w - lean - 2, y + 1],
    [x + 1, y + d + 2],
    [x + Math.round(w / 2), y + d + 3],
    [x + w - 2, y + d + 2],
  ]) {
    b.rect(px - 1, py, 3, 2, hex('#0a0604'));
    b.put(px, py + 2, hex('#2a1a10'));
  }
  // as bolas
  for (const [bx, bz, c] of balls) {
    const px = x + Math.round(bx * w);
    const py = y + 2 + Math.round(bz * d);
    b.put(px + 1, py + 2, BLACK, 0.5);
    b.rect(px - 1, py, 3, 2, hex(c));
    b.put(px, py - 1, hex(c));
    b.put(px - 1, py, shift(hex(c), 60));
  }
  if (cue) b.line(x + Math.round(cue[0] * w), y + 2 + Math.round(cue[1] * d), x + Math.round(cue[2] * w), y + 2 + Math.round(cue[3] * d), hex('#d8b070'));
  // o gabinete e os pés
  const cab = y + d + 5;
  b.rect(x + 1, cab, w - 2, 7, POOL_WOOD.lo);
  b.rect(x + 1, cab, w - 2, 1, POOL_WOOD.deep);
  b.rect(x + 4, cab + 2, w - 8, 3, POOL_WOOD.mid);
  b.rect(x + 4, cab + 2, w - 8, 1, POOL_WOOD.hi);
  for (const lx of [x + 2, x + w - 6]) {
    b.rect(lx, cab + 7, 4, 9, POOL_WOOD.mid);
    b.rect(lx, cab + 7, 1, 9, POOL_WOOD.hi);
    b.rect(lx - 1, cab + 15, 6, 2, POOL_WOOD.lo);
  }
  contact(b, x + w / 2, cab + 17, w * 0.55, 3, 0.7);
}

/** O jogador do fundo, de boné, em pé atrás da mesa, passando giz no taco (os pés no chão escondidos). */
function player(b, x, base) {
  const coat = hex('#22202a');
  const dark = hex('#121016');
  // as pernas e o tronco
  b.rect(x - 4, base - 30, 9, 20, coat);
  b.rect(x - 5, base - 27, 11, 10, coat);
  b.rect(x + 2, base - 30, 3, 20, dark);
  b.rect(x - 3, base - 10, 3, 10, dark);
  b.rect(x + 1, base - 10, 3, 10, dark);
  // a camisa aberta no peito
  b.rect(x - 1, base - 29, 2, 6, hex('#8a2a2a'));
  // a cabeça, o boné e o pescoço
  b.rect(x - 1, base - 32, 3, 2, hex('#6a4430'));
  b.ellipse(x + 0.5, base - 35, 3, 3.2, hex('#7a4e36'));
  b.rect(x - 3, base - 39, 7, 2, hex('#2a2a32'));
  b.rect(x - 5, base - 37, 4, 1, hex('#2a2a32'));
  b.rect(x + 1, base - 36, 2, 1, hex('#3a2418'));
  // o braço erguido segurando o taco em pé e a outra mão passando o giz
  b.rect(x - 7, base - 27, 3, 8, coat);
  b.rect(x - 9, base - 46, 2, 46, hex('#c8a46a'));
  b.rect(x - 9, base - 46, 1, 46, hex('#e8cc90'));
  b.rect(x - 9, base - 47, 2, 1, hex('#3a6ac8'));
  b.rect(x - 9, base - 20, 2, 20, hex('#3a1a0c'));
  b.rect(x - 7, base - 41, 3, 2, hex('#7a4e36'));
  b.rect(x - 6, base - 38, 3, 9, coat);
  b.put(x - 10, base - 47, hex('#3a6ac8'));
}

/** A régua de tacos na parede, com um faltando e o quebrado pendurado torto. */
function cueRack(b, r, x, y, w, bottom) {
  const n = 7;
  const step = Math.floor((w - 6) / n);
  // as sombras dos tacos na parede e os tacos
  for (let k = 0; k < n; k += 1) {
    if (k === 2) continue;
    const cx = x + 4 + k * step;
    b.rect(cx + 2, y + 2, 1, bottom - y, BLACK, 0.4);
    if (k === 5) {
      // o taco quebrado: pendurado pelo cordão, torto, a ponta lascada
      b.line(cx, y - 1, cx + 6, y + 30, hex('#d8b878'));
      b.line(cx + 1, y - 1, cx + 7, y + 30, hex('#a0804a'));
      b.line(cx + 6, y + 31, cx + 8, y + 33, hex('#f0dcb0'));
      b.put(cx + 5, y + 32, hex('#f0dcb0'));
      b.rect(cx + 6, y + 29, 3, 1, hex('#2a1a10'));
      continue;
    }
    b.rect(cx, y - 3, 2, bottom - y + 3, hex('#d4b070'));
    b.rect(cx, y - 3, 1, bottom - y + 3, hex('#f0d8a0'));
    b.rect(cx, y - 4, 2, 1, hex('#f4f0e8'));
    b.rect(cx, y - 5, 2, 1, hex('#3a6ac8'));
    // a emenda e o cabo escuro, mais embaixo
    const butt = y + 22 + (k % 3) * 2;
    b.rect(cx, butt, 2, bottom - butt, hex('#3a1a0c'));
    b.rect(cx, butt, 2, 1, hex('#c8c0b0'));
    b.rect(cx, butt + 3, 1, 3, hex('#d8a040'), 0.8);
  }
  // as duas tábuas da régua, com os buracos
  for (const [ry, hh] of [
    [y, 3],
    [bottom - 4, 4],
  ]) {
    b.rect(x, ry, w, hh, POOL_WOOD.mid);
    b.rect(x, ry, w, 1, POOL_WOOD.hi);
    b.rect(x, ry + hh - 1, w, 1, POOL_WOOD.deep);
    b.rect(x + 1, ry + hh, w - 2, 1, BLACK, 0.45);
  }
  // o giz azul em cima da régua
  b.rect(x + w - 6, y - 3, 3, 3, hex('#3a6ac8'));
  b.put(x + w - 6, y - 3, hex('#7aa0f0'));
}

/** O marcador de bolinhas (o "ábaco" da sinuca): dois arames com as contas de madeira. */
function beadBoard(b, x, y, w) {
  b.rect(x, y, w, 12, hex('#3a1c0c'));
  b.rect(x, y, w, 1, hex('#8a5a2a'));
  b.rect(x + 1, y + 1, w - 2, 10, hex('#24120a'));
  for (const [wy, left] of [
    [y + 4, 6],
    [y + 8, 3],
  ]) {
    b.rect(x + 1, wy, w - 2, 1, hex('#a8a49a'));
    for (let k = 0; k < 15; k += 1) {
      const at = k < left ? x + 2 + k * 3 : x + w - 2 - (15 - k) * 3;
      const c = k % 5 === 4 ? hex('#c83a24') : hex('#e8d8b0');
      b.rect(at, wy - 1, 2, 3, c);
      b.put(at, wy - 1, shift(c, 30));
      b.put(at + 1, wy + 1, shift(c, -60));
    }
  }
}

/** A porta de ferro dos fundos, com a barra, o vidro aramado e a placa de SAÍDA acesa em cima. */
function steelDoor(b, G, x, y, w, bottom) {
  b.rect(x - 2, y - 2, w + 4, bottom - y + 2, hex('#1a1a1c'));
  b.rect(x, y, w, bottom - y, hex('#2c4a3e'));
  b.rect(x, y, w, 1, hex('#4a6e5e'));
  b.rect(x, y, 1, bottom - y, hex('#3a5c4e'));
  b.rect(x + w - 1, y, 1, bottom - y, hex('#1a2e26'));
  // o vidro aramado
  b.rect(x + 4, y + 4, w - 8, 9, hex('#1a2a30'));
  for (let k = 0; k < w - 8; k += 3) b.rect(x + 4 + k, y + 4, 1, 9, hex('#3a5a62'), 0.6);
  for (let k = 0; k < 9; k += 3) b.rect(x + 4, y + 4 + k, w - 8, 1, hex('#3a5a62'), 0.6);
  // a barra antipânico e a chapa de baixo
  b.rect(x + 2, y + 22, w - 4, 2, hex('#8a8a84'));
  b.rect(x + 2, y + 22, w - 4, 1, hex('#c8c8c0'));
  b.rect(x + 1, bottom - 7, w - 2, 6, hex('#4a4e4c'));
  for (let k = 2; k < w - 2; k += 3) b.put(x + k, bottom - 4, hex('#6a6e6c'));
  // tinta descascada e pichação
  b.rect(x + 3, y + 30, 4, 2, hex('#6a5a4a'), 0.6);
  b.line(x + 3, y + 16, x + w - 4, y + 18, hex('#c83a8a'), 0.55);
  // a placa de SAÍDA acesa
  b.rect(x + w / 2 - 9, y - 10, 18, 7, hex('#1a0a08'));
  G.rect(x + w / 2 - 8, y - 9, 16, 5, hex('#c81e14'));
  pixelText(G, 'SAIDA', Math.round(x + w / 2 - 9), y - 9, hex('#fff0d8'));
}

/** O cartaz do torneio, colado na parede, com a ponta descolando. */
function tourneyPoster(b, x, y) {
  const W = 26;
  const H = 34;
  b.rect(x + 1, y + 1, W, H, BLACK, 0.45);
  for (let yy = 0; yy < H; yy += 1) for (let xx = 0; xx < W; xx += 1) b.put(x + xx, y + yy, ramp(RAMP_10, 0.9 - yy / H / 2, xx, yy));
  b.rect(x, y, W, 8, hex('#b8281e'));
  pixelText(b, 'SINUCA', x + 2, y + 2, hex('#f8ecc8'));
  // a bola 8 grande
  b.ellipse(x + 13, y + 18, 7, 7, hex('#141414'));
  b.ellipse(x + 13, y + 18, 3, 3, hex('#f4f0e4'));
  pixelText(b, '8', x + 12, y + 16, hex('#141414'));
  b.rect(x + 9, y + 13, 2, 1, hex('#8a8a8a'));
  pixelText(b, '22H', x + 7, y + 27, hex('#b8281e'));
  // a ponta de baixo descolando (dobrada para frente) e as fitas
  for (let k = 0; k < 6; k += 1) b.rect(x + W - 6 + k, y + H - 6 + k, 6 - k, 1, hex('#5a2a20'));
  for (let k = 0; k < 6; k += 1) b.rect(x + W - 6, y + H - 6 + k, k + 1, 1, hex('#9a8a6a'));
  b.rect(x - 1, y - 1, 4, 2, hex('#d8d0b0'), 0.8);
  b.rect(x + W - 3, y - 1, 4, 2, hex('#d8d0b0'), 0.8);
}

/** Uma garrafa de cerveja no parapeito. */
function longNeck(b, x, base, c = '#3d1d0b') {
  b.rect(x, base - 7, 3, 7, hex(c));
  b.rect(x + 1, base - 10, 1, 3, hex(c));
  b.put(x + 1, base - 11, hex('#c8a040'));
  b.rect(x, base - 5, 3, 2, hex('#e6c34a'));
  b.put(x, base - 7, shift(hex(c), 50));
}

function sceneSinuca(b, G, r, g) {
  const { w, h, M, L, R, Y, S, floor } = g;
  // o teto de laje com a tubulação
  b.rect(0, 0, w, Y(7), hex('#1a1618'));
  brickWall(b, r, 0, Y(7), w, floor, { bw: S(9), bh: S(4), tones: BRICK, mortar: hex('#22140f') });
  // a fuligem da fumaça em cima e a umidade embaixo
  b.light(0, 0, w, floor, BLACK, (x, y) => Math.max(0, 0.55 - (y / floor) * 0.9) + Math.max(0, (y - floor * 0.8) / floor) * 1.2);
  // os canos e a canaleta no teto
  b.rect(0, Y(2), w, S(3), hex('#3a4448'));
  b.rect(0, Y(2), w, 1, hex('#7a8a90'));
  b.rect(0, Y(2) + S(3), w, 1, hex('#121618'));
  for (let x = S(14); x < w; x += S(46)) {
    b.rect(x, Y(1), S(3), S(5), hex('#22282a'));
    b.rect(x, Y(1), 1, S(5), hex('#5a6468'));
  }
  b.rect(0, Y(6), w, 1, hex('#0e0c0c'));
  for (let x = 0; x < w; x += 1) b.put(x, Y(8) + Math.round(Math.sin(x / (w * 0.07)) * 1.5 + 1), hex('#141010'));

  // o neon SINUCA com a bola 8 (no alto, à direita do rival: o canto de cima à esquerda é do HUD)
  const ns = g.k * 3;
  const nx = M(258);
  const ny = Y(13);
  // o fundo de acrílico preto e os suportes
  const nw = textWidth('SINUCA') * ns;
  b.rect(nx - S(5), ny - S(4), nw + S(28), 5 * ns + S(8), hex('#0c0a0e'), 0.85);
  b.rect(nx - S(5), ny - S(4), nw + S(28), 1, hex('#3a3440'));
  for (const sx of [nx - S(3), nx + nw + S(20)]) b.rect(sx, ny - S(10), 1, S(6), hex('#3a3a3a'));
  neonText(G, 'SINUCA', nx, ny, ns, hex('#ff3d9e'), hex('#ffe2f2'));
  // a bola 8 em neon azul, um anel com o 8 dentro
  const bx = nx + nw + S(12);
  const by = ny + Math.round((5 * ns) / 2);
  const br = S(7);
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    G.put(bx + Math.cos(a) * br, by + Math.sin(a) * br, hex('#3ad6ff'));
    G.put(bx + Math.cos(a) * (br - 1), by + Math.sin(a) * (br - 1), hex('#d8f8ff'));
  }
  pixelText(G, '8', bx - g.k, by - Math.round((5 * g.k) / 2), hex('#e8fbff'), { s: g.k });
  // o taco em neon sublinhando
  const uy = ny + 5 * ns + S(4);
  G.rect(nx - S(2), uy, nw + S(4), 1, hex('#3ad6ff'));
  G.rect(nx + nw - S(2), uy, S(4), 1, hex('#f4f0e8'));
  G.rect(nx + nw + S(2), uy, 1, 1, hex('#5a8aff'));
  // o fio do neon descendo até a tomada
  for (let k = 0; k < S(26); k += 1) b.put(nx + nw + S(22) + Math.round(Math.sin(k * 0.2) * 2), ny + 5 * ns + S(3) + k, hex('#121012'));

  // à esquerda do rival: a porta de ferro com a SAÍDA, o marcador, a régua dos tacos
  steelDoor(b, G, L(36), Y(44), S(26), floor + S(2));
  beadBoard(b, M(146), Y(9), S(30));
  cueRack(b, r, M(96), Y(42), S(64), floor);
  cageLamp(b, G, M(128), Y(30));
  // o parapeito dos copos, dos dois lados do rival, com garrafas e um cinzeiro
  const ledge = Y(74);
  for (const [x0, x1] of [
    [0, M(176)],
    [M(246), w],
  ]) {
    b.rect(x0, ledge, x1 - x0, S(3), POOL_WOOD.mid);
    b.rect(x0, ledge, x1 - x0, 1, POOL_WOOD.hi);
    b.rect(x0, ledge + S(3), x1 - x0, S(2), BLACK, 0.5);
  }
  longNeck(b, M(168), ledge);
  longNeck(b, M(172), ledge, '#1f4a2a');
  longNeck(b, M(256), ledge);
  b.rect(M(262), ledge - S(2), S(6), S(2), hex('#8e9c9e'));
  b.put(M(266), ledge - S(3), hex('#ff8a32'));
  // o cartaz do torneio, à direita do rival
  tourneyPoster(b, M(300), Y(36));

  // os lados de baixo: o chão de cimento e as mesas de sinuca do fundo, sob as luminárias
  {
    // (versão 2.38: as placas de cimento em perspectiva: as juntas convergem e apertam no fundo)
    const gr = groundOf(g);
    const slab = S(64);
    for (let y = floor; y < h; y += 1) {
      const t = (y - floor) / (h - floor);
      const gz = gr.z(y);
      const kk = Math.max(0.35, gr.k(y));
      for (let x = 0; x < w; x += 1) {
        const gx = gr.x(x, y);
        const n = Math.sin(gx * 0.07 + gz * 0.05) + Math.sin(gx * 0.019 - gz * 0.023) * 1.4;
        const fx = (((gx / slab) % 1) + 1) % 1;
        const fz = ((gz / slab) % 1 + 1) % 1;
        const seam = fx < 0.012 / kk || fz < 0.012 / kk;
        b.put(x, y, seam ? hex('#141416') : ramp(RAMP_11, 0.5 + n * 0.18 - t * 0.2, x, y));
      }
    }
  }
  b.rect(0, floor, w, S(2), hex('#120e0e'));
  // manchas de óleo e bitucas
  for (let i = 0; i < 14; i += 1) {
    const sx = r() < 0.5 ? r() * g.farL : g.farR + r() * (w - g.farR);
    const sy = floor + S(4) + r() * (h - floor - S(8));
    if (r() < 0.5) b.ellipse(sx, sy, S(5) + r() * 4, S(2), hex('#141214'), 0.5);
    else b.rect(sx, sy, S(2), 1, hex('#d8c890'), 0.8);
  }
  poolTable(b, r, L(2), Y(104), S(78), S(13), {
    balls: [
      [0.3, 0.5, '#e8c030'],
      [0.42, 0.7, '#c8281e'],
      [0.55, 0.3, '#f4f0e4'],
      [0.7, 0.6, '#2a4ab8'],
    ],
    cue: [0.2, 0.9, 0.62, 0.2],
  });
  poolTable(b, r, R(344), Y(100), S(78), S(13), {
    balls: [
      [0.35, 0.4, '#141414'],
      [0.5, 0.65, '#e86a1e'],
      [0.62, 0.35, '#6a2a8a'],
      [0.72, 0.7, '#f4f0e4'],
    ],
  });
  // o jogador do fundo, passando giz no taco, atrás da mesa da direita
  player(b, R(398), Y(101));
  // o triângulo de bolas encostado na mesa da direita
  for (let k = 0; k < 3; k += 1) b.line(R(392) + k, Y(99) - k * 2, R(400) - k, Y(99) - k * 2, hex('#c8a46a'));
  poolLamp(b, G, L(8), Y(58), S(66), Y(31));
  poolLamp(b, G, R(350), Y(54), S(66), Y(48));
}

function lightsSinuca(g) {
  const { M, L, R, Y, u } = g;
  return {
    ambient: [0.17, 0.14, 0.25],
    lights: [
      // a lâmpada da mesa (LampRig) clareia a parede atrás do rival
      { x: g.cx, y: Y(4), r: 130 * u, c: [1, 0.84, 0.58], k: 0.9, sy: 1.1 },
      // o neon rosa e a bola azul
      { x: M(292), y: Y(20), r: 120 * u, c: [1, 0.28, 0.66], k: 1.25, sy: 1.2 },
      { x: M(352), y: Y(21), r: 60 * u, c: [0.25, 0.8, 1], k: 0.9 },
      // as luminárias de sinuca (o facho para baixo) e a SAÍDA
      { x: L(41), y: Y(68), r: 80 * u, c: [1, 0.96, 0.78], k: 2.1, cone: 0.7, out: 0.18 },
      { x: R(383), y: Y(64), r: 80 * u, c: [1, 0.96, 0.78], k: 2.1, cone: 0.7, out: 0.18 },
      { x: L(49), y: Y(36), r: 34 * u, c: [1, 0.12, 0.08], k: 1.1 },
      // a arandela de gaiola em cima da régua dos tacos
      { x: M(128), y: Y(34), r: 70 * u, c: [1, 0.8, 0.5], k: 1.5, sy: 0.9 },
    ],
  };
}

function finishSinuca(raw, g) {
  const { M, L, R, Y, u } = g;
  const ns = g.k * 3;
  // os fachos das luminárias na fumaça
  for (const [lx, ly] of [
    [L(41), Y(66)],
    [R(383), Y(62)],
  ]) {
    raw.light(lx - 60 * u, ly, 120 * u, 50 * u, hex('#fff2c8'), (x, y) => {
      const spread = 20 * u + (y - ly) * 0.7;
      const d = Math.abs(x - lx) / spread;
      return d < 1 ? (1 - d) * 0.16 * (1 - (y - ly) / (50 * u)) + (bayer(x, y) < 0.2 ? 0.03 : 0) : 0;
    });
  }
  halo(raw, M(258) + (textWidth('SINUCA') * ns) / 2, Y(20), 70 * u, hex('#ff3d9e'), 0.5, 1.7);
  halo(raw, M(258) + textWidth('SINUCA') * ns + 12 * u, Y(20), 26 * u, hex('#3ad6ff'), 0.5);
  halo(raw, L(41), Y(67), 30 * u, hex('#fff2c8'), 0.45, 2.2);
  halo(raw, R(383), Y(63), 30 * u, hex('#fff2c8'), 0.45, 2.2);
  halo(raw, L(49), Y(37), 12 * u, hex('#ff3020'), 0.5, 1.5);
  halo(raw, M(128), Y(34), 18 * u, hex('#ffd890'), 0.55);
}

// ---------------------------------------------------------------------------
// Região 3: o Submundo do Jogo do Bicho
// ---------------------------------------------------------------------------

const GOLD = pal('#3a2408', '#7a5418', '#b8862c', '#e8c060', '#fff0a8');
const MAHOG = { hi: hex('#7a3418'), mid: hex('#4a1c0c'), lo: hex('#2c0e06'), deep: hex('#140402') };
const LEATHER = pal('#2a0a06', '#5a160e', '#8a2a1a', '#b04428', '#d87a50');

/**
 * Os 25 bichos da tabela, 7 × 6 cada (# = tinta), na ordem dos grupos: avestruz, águia, burro,
 * borboleta, cachorro, cabra, carneiro, camelo, cobra, coelho, cavalo, elefante, galo, gato,
 * jacaré, leão, macaco, porco, pavão, peru, touro, tigre, urso, veado e vaca.
 */
const BICHOS = [
  ['.##....', '.#.....', '.#.....', '.####..', '..####.', '..#.#..'],
  ['#.....#', '##.#.##', '.#####.', '..###..', '...#...', '..#.#..'],
  ['#.#....', '###....', '.##....', '.######', '..#####', '..#...#'],
  ['##...##', '###.###', '.##.##.', '..###..', '.##.##.', '##...##'],
  ['.#.....', '###....', '#######', '.######', '.#...#.', '.#...#.'],
  ['#......', '.##....', '###....', '#.#####', '..#####', '..#...#'],
  ['.##....', '#.#....', '.######', '.######', '.######', '..#..#.'],
  ['...##..', '..####.', '#######', '##.####', '...#..#', '...#..#'],
  ['..###..', '.#...#.', '..#....', '...##..', '.....#.', '.####..'],
  ['.#.#...', '.#.#...', '.###...', '####...', '.#####.', '.##.##.'],
  ['##.....', '###....', '.#.....', '.######', '.######', '.#....#'],
  ['.####..', '######.', '######.', '#.####.', '#.#..#.', '..#..#.'],
  ['.#...#.', '##..##.', '.#.###.', '.#####.', '..###..', '..#.#..'],
  ['#.#...#', '###...#', '###..#.', '.####..', '.####..', '.#..#..'],
  ['.......', '....##.', '#######', '#######', '.#.#.#.', '.......'],
  ['###....', '####...', '###.###', '.######', '.#...#.', '.#...#.'],
  ['.##....', '####...', '.##..#.', '.###..#', '.###.#.', '.#.#...'],
  ['.......', '.#####.', '#######', '#######', '.#...#.', '.......'],
  ['.#.#.#.', '#.###.#', '.#####.', '..#.#..', '..###..', '..#.#..'],
  ['.###...', '#####..', '#####.#', '.####.#', '..###..', '..#.#..'],
  ['#...#..', '.###...', '.######', '.######', '.#...#.', '.#...#.'],
  ['##.....', '###....', '.######', '.#.#.##', '.#...#.', '.#...#.'],
  ['#.#....', '###....', '#######', '#######', '.##.##.', '.##.##.'],
  ['#.#....', '.#.....', '.##....', '..#####', '..#####', '..#...#'],
  ['#.#....', '###....', '.######', '.#.##.#', '.######', '.#...#.'],
];

/** Papel de parede vinho em ogiva: as curvas douradas apagadas e a florzinha no meio de cada gomo. */
function ogeeWallpaper(b, r, x0, y0, x1, y1, g) {
  const S = g.S(14);
  const P = g.S(24);
  const base = RAMP_12;
  for (let y = y0; y < y1; y += 1) {
    const sn = Math.sin(((y - y0) * Math.PI * 2) / P);
    for (let x = x0; x < x1; x += 1) {
      const kx = Math.round((x - g.cx) / S);
      const rel = x - g.cx - kx * S;
      const d = Math.min(Math.abs(rel - (S / 2) * sn), Math.abs(rel + (S / 2) * sn));
      const n = Math.sin(x * 0.9 + y * 1.7) * 0.5 + Math.sin(x * 0.13) * 0.3;
      let c = ramp(base, 0.5 + n * 0.25, x, y);
      if (d < 0.7) c = hex('#7a3a20');
      else if (d < 1.3) c = mixRgb(c, hex('#6a2a1c'), 0.5);
      b.put(x, y, c);
    }
  }
  // a florzinha dourada no meio de cada gomo
  for (let y = y0 + Math.round(P / 4); y < y1 + P; y += Math.round(P / 2)) {
    const odd = Math.round((y - y0 - P / 4) / (P / 2)) % 2;
    for (let x = g.cx + (odd ? S / 2 : 0) - S * 40; x < x1 + S; x += S) {
      const fx = Math.round(x);
      if (fx < x0 - 3 || fx > x1 + 3) continue;
      b.put(fx, y, hex('#a8783a'));
      b.put(fx, y - 2, hex('#7a4a24'));
      b.put(fx, y + 2, hex('#7a4a24'));
      b.put(fx - 1, y - 1, hex('#6a3a1e'));
      b.put(fx + 1, y - 1, hex('#6a3a1e'));
      b.put(fx - 1, y + 1, hex('#6a3a1e'));
      b.put(fx + 1, y + 1, hex('#6a3a1e'));
      b.put(fx, y - 3, hex('#5a2a18'));
    }
  }
}

/** Uma moldura de friso dourado (relevo: luz em cima e à esquerda). */
function goldRail(b, x0, x1, y, rows = [0.05, 0.55, 0.95, 0.7, 0.3, 0.1]) {
  rows.forEach((t, k) => b.rect(x0, y + k, x1 - x0, 1, ramp(GOLD, t, x0, y + k)));
  for (let x = x0; x < x1; x += 4) b.put(x, y + 2, hex('#fff0a8'));
}

/** O lambri de mogno com os painéis em relevo. */
function mahoganyPanels(b, r, x0, x1, y0, y1, g) {
  b.rect(x0, y0, x1 - x0, y1 - y0, MAHOG.mid);
  const pw = g.S(30);
  const gap = g.S(6);
  for (let x = g.cx - pw / 2 - (pw + gap) * 20; x < x1; x += pw + gap) {
    const px = Math.round(x);
    if (px + pw < x0) continue;
    const top = y0 + g.S(4);
    const bot = y1 - g.S(6);
    // o campo em relevo com o veio
    for (let yy = top; yy < bot; yy += 1) {
      for (let xx = px; xx < px + pw; xx += 1) {
        const grain = Math.sin(xx * 1.1 + Math.sin(yy * 0.06 + px) * 1.8);
        b.put(xx, yy, grain > 0.86 ? mixRgb(MAHOG.mid, MAHOG.lo, 0.6) : grain < -0.9 ? mixRgb(MAHOG.mid, MAHOG.hi, 0.3) : MAHOG.mid);
      }
    }
    b.rect(px, top, pw, 1, MAHOG.hi);
    b.rect(px, top, 1, bot - top, mixRgb(MAHOG.hi, MAHOG.mid, 0.4));
    b.rect(px, bot - 1, pw, 1, MAHOG.deep);
    b.rect(px + pw - 1, top, 1, bot - top, MAHOG.lo);
    b.rect(px + 2, top + 2, pw - 4, 1, MAHOG.lo);
    b.rect(px + 2, bot - 3, pw - 4, 1, mixRgb(MAHOG.hi, MAHOG.mid, 0.3));
  }
  // o rodapé
  b.rect(x0, y1 - g.S(4), x1 - x0, g.S(4), MAHOG.lo);
  b.rect(x0, y1 - g.S(4), x1 - x0, 1, MAHOG.hi);
}

/** A luz de quadro: a régua de latão com a boca acesa virada para baixo. */
function pictureLight(b, G, x, y, w) {
  b.rect(x + Math.floor(w / 2) - 1, y - 3, 2, 3, hex('#6a4a1a'));
  b.rect(x, y, w, 2, hex('#8a6420'));
  b.rect(x, y, w, 1, hex('#f0c868'));
  G.rect(x + 1, y + 2, w - 2, 1, hex('#fff2c0'));
}

/** O retrato do patrão: terno branco, chapéu-panamá e bigode, na moldura dourada entalhada. */
function patronPortrait(b, x, y, k = 1) {
  const W = 30;
  const H = 44;
  const p = (xx, yy, c, a) => b.rect(x + xx * k, y + yy * k, k, k, c, a);
  const rect = (xx, yy, w, h, c, a) => b.rect(x + xx * k, y + yy * k, w * k, h * k, c, a);
  rect(1, 1, W, H, BLACK, 0.5);
  // a moldura
  for (let d = 0; d < 4; d += 1) {
    const t = [0.15, 0.75, 0.95, 0.4][d];
    rect(d, d, W - d * 2, 1, ramp(GOLD, t + 0.05, x + d, y));
    rect(d, H - 1 - d, W - d * 2, 1, ramp(GOLD, t - 0.25, x + d, y + H));
    rect(d, d, 1, H - d * 2, ramp(GOLD, t, x, y + d));
    rect(W - 1 - d, d, 1, H - d * 2, ramp(GOLD, t - 0.3, x + W, y + d));
  }
  for (const [cx2, cy2] of [
    [1, 1],
    [W - 4, 1],
    [1, H - 4],
    [W - 4, H - 4],
  ]) {
    rect(cx2, cy2, 3, 3, hex('#e8c060'));
    p(cx2 + 1, cy2 + 1, hex('#7a5418'));
  }
  rect(W / 2 - 3, 0, 6, 2, hex('#f0d070'));
  // a tela: fundo escuro de óleo
  const ox = 4;
  const oy = 4;
  const cw = W - 8;
  const ch = H - 8;
  for (let yy = 0; yy < ch; yy += 1) for (let xx = 0; xx < cw; xx += 1) p(ox + xx, oy + yy, ramp(RAMP_13, 0.7 - Math.hypot(xx - cw * 0.4, yy - ch * 0.35) / ch, x + xx, y + yy));
  const cx = ox + 11;
  // o terno branco: os ombros, a lapela e a camisa vinho com a corrente
  for (let yy = 24; yy < ch + oy; yy += 1) {
    const half = Math.min(11, 6 + Math.round((yy - 24) * 0.8));
    for (let xx = -half; xx <= half; xx += 1) p(cx + xx, yy, ramp(RAMP_14, 0.85 - (xx + half) / (half * 2) * 0.7, xx, yy));
  }
  for (let yy = 24; yy < 33; yy += 1) {
    const half = Math.max(0, 3 - Math.round((yy - 24) * 0.35));
    rect(cx - half, yy, half * 2 + 1, 1, hex('#4a0e14'));
  }
  for (let yy = 25; yy < 33; yy += 1) {
    p(cx - 3 - Math.round((yy - 25) * 0.4), yy, hex('#6a6048'));
    p(cx + 3 + Math.round((yy - 25) * 0.4), yy, hex('#6a6048'));
  }
  p(cx, 27, hex('#e8c060'));
  p(cx, 29, hex('#e8c060'));
  p(cx - 6, 28, hex('#c81e1e'));
  p(cx - 7, 27, hex('#e83a2a'));
  // o pescoço, o rosto e o bigode
  rect(cx - 2, 21, 4, 3, hex('#8a5a3a'));
  for (let yy = 12; yy < 22; yy += 1) {
    const half = yy < 14 ? 3 : yy > 19 ? 3 : 4;
    for (let xx = -half; xx < half; xx += 1) p(cx + xx, yy, xx > 1 ? hex('#8a5a3a') : xx < -2 ? hex('#a87050') : hex('#c08860'));
  }
  rect(cx - 3, 15, 2, 1, hex('#1a0e08'));
  rect(cx + 1, 15, 2, 1, hex('#1a0e08'));
  rect(cx - 3, 14, 2, 1, hex('#5a3420'));
  rect(cx + 1, 14, 2, 1, hex('#5a3420'));
  rect(cx - 3, 18, 6, 1, hex('#1e120a'));
  p(cx - 3, 19, hex('#1e120a'));
  p(cx + 2, 19, hex('#1e120a'));
  p(cx - 1, 20, hex('#6a3424'));
  // o panamá com a fita preta
  rect(cx - 4, 7, 8, 4, hex('#d8ccaa'));
  rect(cx - 4, 7, 8, 1, hex('#f0e6c8'));
  rect(cx - 1, 7, 2, 1, hex('#a89870'));
  rect(cx - 4, 10, 8, 1, hex('#1a1410'));
  rect(cx - 8, 11, 16, 1, hex('#e4d8b8'));
  rect(cx - 7, 12, 14, 1, hex('#a89874'));
  rect(cx - 4, 13, 8, 1, hex('#6a4430'));
  // o verniz craquelado
  for (let i = 0; i < 18; i += 1) p(ox + ((i * 7) % cw), oy + ((i * 13) % ch), hex('#f0e0b0'), 0.12);
}

/** A tabela do jogo do bicho: papel amarelado, o cabeçalho vermelho e os 25 grupos com o número. */
function bichoChart(b, x, y, k = 1) {
  const cell = 16;
  const row = 9;
  const W = cell * 5 + 4;
  const H = 12 + row * 5 + 3;
  const rect = (xx, yy, w, h, c, a) => b.rect(x + xx * k, y + yy * k, w * k, h * k, c, a);
  rect(2, 2, W, H, BLACK, 0.5);
  // a moldura de madeira escura com o filete dourado
  rect(-2, -2, W + 4, H + 4, hex('#24100a'));
  rect(-2, -2, W + 4, 1, hex('#5a2e18'));
  rect(-1, -1, W + 2, H + 2, hex('#b08a3a'));
  // o papel
  for (let yy = 0; yy < H; yy += 1) {
    for (let xx = 0; xx < W; xx += 1) {
      const edge = Math.min(xx, yy, W - 1 - xx, H - 1 - yy);
      rect(xx, yy, 1, 1, ramp(RAMP_15, 0.9 - Math.max(0, 4 - edge) * 0.15 - (Math.sin(xx * 0.3 + yy * 0.2) > 0.9 ? 0.25 : 0), x + xx, y + yy));
    }
  }
  // o cabeçalho
  rect(2, 2, W - 4, 9, hex('#a01c16'));
  rect(2, 2, W - 4, 1, hex('#c8382a'));
  const title = 'JOGO DO BICHO';
  pixelText(b, title, x + Math.round((W - textWidth(title)) / 2) * k, y + 4 * k, hex('#f8ecc8'), { s: k });
  // a grade dos 25 grupos
  const gy = 12;
  for (let n = 0; n < 25; n += 1) {
    const cx = 2 + (n % 5) * cell;
    const cy = gy + Math.floor(n / 5) * row;
    if ((n + Math.floor(n / 5)) % 2) rect(cx, cy, cell, row, hex('#d8c498'), 0.6);
    BICHOS[n].forEach((line, ry) => {
      for (let rx = 0; rx < 7; rx += 1) if (line[rx] === '#') rect(cx + 1 + rx, cy + 2 + ry, 1, 1, hex('#2a1810'));
    });
    pixelText(b, String(n + 1).padStart(2, '0'), x + (cx + 9) * k, y + (cy + 2) * k, hex('#9a1a14'), { s: k });
  }
  for (let c = 0; c <= 5; c += 1) rect(2 + c * cell, gy, 1, row * 5, hex('#7a5a3a'), 0.7);
  for (let rr = 0; rr <= 5; rr += 1) rect(2, gy + rr * row, cell * 5, 1, hex('#7a5a3a'), 0.7);
  // uma aposta marcada a lápis e a mancha de café
  rect(2 + 2 * cell + 1, gy + 3 * row + 1, cell - 1, row - 1, hex('#c81e14'), 0.18);
  b.ellipse(x + (W - 14) * k, y + (H - 8) * k, 5 * k, 3 * k, hex('#7a5a30'), 0.25);
  return { w: W * k, h: H * k };
}

/** A persiana: a luz vermelha da rua entra de lado e risca a parede em faixas inclinadas. */
function blindStripes(b, x0, x1, y0, y1, slope, color, amount) {
  b.light(x0, y0, x1 - x0, y1 - y0, hex(color), (x, y) => {
    const yy = y - (x - x0) * slope;
    if (yy < y0 || yy > y1 - (x1 - x0) * 0.1) return 0;
    const stripe = ((yy - y0) % 6 + 6) % 6 < 3.4;
    if (!stripe) return 0;
    const fade = Math.max(0, 1 - (x - x0) / (x1 - x0)) * Math.min(1, (yy - y0) / 6) * Math.min(1, (y1 - yy) / 10);
    return fade * amount;
  });
}

/** A poltrona chesterfield de couro vinho, com os botões em losango e os braços enrolados. */
function chesterfield(b, x, y, w) {
  const backH = 22;
  // o encosto capitonê
  for (let yy = 0; yy < backH; yy += 1) {
    for (let xx = 4; xx < w - 4; xx += 1) {
      const bx = (xx - 4) % 6;
      const by = yy % 6;
      const tuft = Math.hypot(bx - 3, by - 3) / 4.2;
      b.put(x + xx, y + yy, ramp(LEATHER, 0.75 - tuft * 0.55 - yy * 0.012, x + xx, y + yy));
    }
  }
  for (let yy = 3; yy < backH; yy += 6) for (let xx = 7; xx < w - 4; xx += 6) b.put(x + xx + ((yy / 6) % 2 ? 3 : 0) - 3, y + yy, hex('#140402'));
  b.rect(x + 3, y - 1, w - 6, 2, LEATHER[3]);
  b.rect(x + 3, y - 1, w - 6, 1, LEATHER[4]);
  // os braços enrolados dos lados
  for (const side of [0, 1]) {
    const ax = side ? x + w - 9 : x;
    for (let yy = 0; yy < 24; yy += 1) {
      for (let xx = 0; xx < 9; xx += 1) {
        const roll = yy < 5 ? Math.hypot(xx - 4, yy - 4) / 5 : (side ? 9 - xx : xx) / 12 + 0.2;
        b.put(ax + xx, y + 10 + yy, ramp(LEATHER, 0.9 - roll * 0.8, ax + xx, yy));
      }
    }
    b.ellipse(ax + 4.5, y + 13, 2, 2, LEATHER[1]);
    b.put(ax + 4, y + 12, LEATHER[4]);
  }
  // o assento e a frente
  b.rect(x + 9, y + backH, w - 18, 4, LEATHER[3]);
  b.rect(x + 9, y + backH, w - 18, 1, LEATHER[4]);
  b.rect(x + 2, y + backH + 4, w - 4, 8, LEATHER[2]);
  b.rect(x + 2, y + backH + 4, w - 4, 1, LEATHER[3]);
  for (let xx = 4; xx < w - 4; xx += 3) b.put(x + xx, y + backH + 5, hex('#c8a040'));
  // os pés torneados
  for (const fx of [x + 4, x + w - 7]) {
    b.rect(fx, y + backH + 12, 3, 3, MAHOG.mid);
    b.put(fx, y + backH + 12, MAHOG.hi);
  }
  contact(b, x + w / 2, y + backH + 15, w * 0.55, 2.5, 0.7);
}

/** O abajur de pé com a cúpula franjada, aceso. */
function floorLamp(b, G, x, top, base) {
  b.rect(x, top + 10, 1, base - top - 10, hex('#8a6420'));
  b.rect(x - 3, base - 1, 7, 2, hex('#5a4010'));
  b.rect(x - 3, base - 1, 7, 1, hex('#d8a84a'));
  for (let row = 0; row < 10; row += 1) {
    const half = 4 + Math.round(row * 0.5);
    for (let xx = -half; xx <= half; xx += 1) G.put(x + xx, top + row, ramp(RAMP_16, 0.95 - Math.abs(xx) / (half + 1) * 0.6 - (row < 2 ? 0.3 : 0), x + xx, row));
  }
  for (let xx = -9; xx <= 9; xx += 2) b.rect(x + xx, top + 10, 1, 2, hex('#c8a040'));
}

/** O cofre de aço verde-escuro com o filete dourado, o segredo e a roda de travas. */
function safe(b, x, y, w, h) {
  b.rect(x + 2, y + 2, w, h, BLACK, 0.5);
  b.rect(x, y, w, h, hex('#1a2620'));
  b.rect(x, y, w, 1, hex('#5a7266'));
  b.rect(x, y, 1, h, hex('#3a4e44'));
  b.rect(x + w - 1, y, 1, h, hex('#0a100c'));
  b.rect(x, y + h - 1, w, 1, hex('#0a100c'));
  // a porta embutida
  b.rect(x + 4, y + 4, w - 8, h - 9, hex('#22302a'));
  b.rect(x + 4, y + 4, w - 8, 1, hex('#0e1612'));
  b.rect(x + 4, y + h - 6, w - 8, 1, hex('#4a5e54'));
  // o filete dourado com os cantos
  const gx = x + 7;
  const gy = y + 7;
  const gw = w - 14;
  const gh = h - 15;
  b.rect(gx, gy, gw, 1, hex('#b08a3a'));
  b.rect(gx, gy + gh, gw, 1, hex('#b08a3a'));
  b.rect(gx, gy, 1, gh, hex('#b08a3a'));
  b.rect(gx + gw - 1, gy, 1, gh, hex('#b08a3a'));
  for (const [cx2, cy2] of [
    [gx + 2, gy + 2],
    [gx + gw - 3, gy + 2],
    [gx + 2, gy + gh - 2],
    [gx + gw - 3, gy + gh - 2],
  ])
    b.put(cx2, cy2, hex('#e8c060'));
  // o segredo e a roda de travas
  const dx = x + Math.round(w * 0.36);
  const dy = y + Math.round(h * 0.42);
  b.ellipse(dx, dy, 6, 6, hex('#5a4010'));
  b.ellipse(dx, dy, 5, 5, hex('#c8a040'));
  b.ellipse(dx - 0.5, dy - 0.5, 3.5, 3.5, hex('#e8c868'));
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) b.put(dx + Math.cos(a) * 4.6, dy + Math.sin(a) * 4.6, hex('#3a2808'));
  b.ellipse(dx, dy, 1.5, 1.5, hex('#3a2808'));
  b.rect(dx - 1, dy - 7, 2, 2, hex('#c81e14'));
  const hx = x + Math.round(w * 0.68);
  for (let a = 0; a < 3; a += 1) {
    const ang = (a * Math.PI * 2) / 3 - Math.PI / 2;
    b.line(hx, dy, hx + Math.cos(ang) * 6, dy + Math.sin(ang) * 6, hex('#c8a040'));
    b.ellipse(hx + Math.cos(ang) * 6, dy + Math.sin(ang) * 6, 1.3, 1.3, hex('#e8c868'));
  }
  b.ellipse(hx, dy, 2, 2, hex('#8a6420'));
  // as dobradiças, a plaquinha e os pés
  for (const hy of [y + 8, y + h - 14]) {
    b.rect(x + 2, hy, 3, 5, hex('#3a4a42'));
    b.put(x + 2, hy, hex('#7a8e84'));
  }
  b.rect(x + w / 2 - 6, y + 9, 12, 3, hex('#c8a040'));
  b.rect(x + w / 2 - 5, y + 10, 10, 1, hex('#5a4010'));
  for (const fx of [x + 2, x + w - 6]) b.rect(fx, y + h, 4, 2, hex('#0a0c0a'));
}

/** A mesa do bicheiro: o tampo com o forro verde, as gavetas, a luminária de banqueiro, os maços e o telefone. */
function bookieDesk(b, G, x, y, w) {
  const top = y;
  // o tampo e o forro de couro verde
  b.rect(x, top, w, 5, MAHOG.mid);
  b.rect(x, top, w, 1, MAHOG.hi);
  b.rect(x + 4, top + 1, w - 8, 3, hex('#1e3a26'));
  b.rect(x + 4, top + 1, w - 8, 1, hex('#2e5a3a'));
  b.rect(x - 1, top + 5, w + 2, 2, MAHOG.lo);
  b.rect(x - 1, top + 5, w + 2, 1, MAHOG.hi);
  // a frente: as gavetas com os puxadores de latão
  b.rect(x, top + 7, w, 26, MAHOG.mid);
  for (let k = 0; k < 3; k += 1) {
    const dxw = Math.floor((w - 8) / 3);
    const px = x + 3 + k * (dxw + 1);
    b.rect(px, top + 9, dxw, 8, MAHOG.lo);
    b.rect(px, top + 9, dxw, 1, MAHOG.deep);
    b.rect(px, top + 16, dxw, 1, MAHOG.hi);
    b.rect(px + Math.floor(dxw / 2) - 2, top + 12, 4, 1, hex('#e8c060'));
  }
  b.rect(x, top + 19, w, 14, MAHOG.lo);
  b.rect(x + 3, top + 21, w - 6, 10, MAHOG.mid);
  b.rect(x + 3, top + 21, w - 6, 1, MAHOG.hi);
  contact(b, x + w / 2, top + 33, w * 0.6, 3, 0.7);
  // a luminária de banqueiro: o pé de latão e a cúpula de vidro verde acesa
  const lx = x + 9;
  b.ellipse(lx, top, 4, 1.4, hex('#c8a040'));
  b.rect(lx, top - 8, 1, 8, hex('#c8a040'));
  for (let row = 0; row < 4; row += 1) {
    const half = 7 - Math.max(0, 2 - row);
    for (let xx = -half; xx <= half; xx += 1) G.put(lx + xx, top - 12 + row, ramp(RAMP_17, 0.95 - row * 0.12 - Math.abs(xx) / half * 0.35, lx + xx, row));
  }
  G.rect(lx - 6, top - 8, 13, 1, hex('#fff6c8'));
  b.rect(lx - 7, top - 13, 15, 1, hex('#e8c060'));
  // os maços de dinheiro, a cinta de papel
  const stacks = [
    [x + 19, 3],
    [x + 28, 2],
    [x + 26, 1, 1],
  ];
  for (const [sx, n, lift] of stacks) {
    for (let k = 0; k < n; k += 1) {
      const by = top - 2 - k * 2 - (lift ? 4 : 0);
      b.rect(sx, by, 8, 2, hex('#4a7a4a'));
      b.rect(sx, by, 8, 1, hex('#7aaa6a'));
      b.rect(sx + 3, by, 2, 2, hex('#e8dcc0'));
    }
  }
  // o papel das apostas e o telefone preto de disco
  b.rect(x + 38, top - 1, 9, 2, hex('#e8e0c8'));
  for (let k = 0; k < 7; k += 2) b.put(x + 39 + k, top - 1, hex('#2a3a7a'));
  const px = x + w - 13;
  b.rect(px, top - 4, 10, 4, hex('#141012'));
  b.rect(px + 1, top - 5, 8, 1, hex('#2a2428'));
  b.ellipse(px + 5, top - 2.5, 2, 1.3, hex('#c8c0b0'));
  b.rect(px - 1, top - 8, 12, 2, hex('#1a1416'));
  b.rect(px - 1, top - 8, 12, 1, hex('#4a4044'));
  b.rect(px - 1, top - 7, 2, 3, hex('#1a1416'));
  b.rect(px + 9, top - 7, 2, 3, hex('#1a1416'));
  // o copo de uísque com gelo
  b.rect(x + 50, top - 4, 4, 4, hex('#b8c8c8'), 0.6);
  b.rect(x + 50, top - 2, 4, 2, hex('#c87a20'), 0.85);
  b.put(x + 51, top - 3, hex('#ffffff'));
}

/** O chão: o taco em espinha de peixe perto da parede e o tapete persa com a barra. */
function parquetAndRug(b, r, y0, h, g) {
  // versão 2.38: o taco em espinha e o tapete em perspectiva (o desenho diminui para o fundo)
  const gr = groundOf(g);
  const cell = g.S(7);
  for (let y = y0; y < h; y += 1) {
    const gz = gr.z(y);
    for (let x = 0; x < g.w; x += 1) {
      const gx = gr.x(x, y);
      const a = (gx + gz) / cell;
      const c = (gx - gz) / cell;
      const tone = (Math.floor(a) + Math.floor(c)) % 2 ? hex('#3a1e0e') : hex('#2c160a');
      const fa = a - Math.floor(a);
      const fc = c - Math.floor(c);
      const seam = fa < 0.1 || fc < 0.1;
      b.put(x, y, seam ? hex('#160a04') : shift(tone, Math.round((r() - 0.5) * 6)));
    }
  }
  const ry = y0 + g.S(9);
  // a franja, a barra azul e dourada, e o campo vinho com os medalhões
  for (let x = 0; x < g.w; x += 2) b.rect(x, ry - 2, 1, 2, hex('#d8ccb0'));
  b.rect(0, ry, g.w, g.S(2), hex('#1a1e3a'));
  const band = g.S(22);
  for (let y = ry + g.S(2); y < ry + g.S(7); y += 1) {
    for (let x = 0; x < g.w; x += 1) {
      const m = (((gr.x(x, y) / band) % 1) + 1) % 1;
      const dia = Math.abs(m - 0.5) * 8 + Math.abs(y - ry - g.S(4.5)) < 3;
      b.put(x, y, dia ? hex('#7a1218') : hex('#8a6a2a'));
    }
  }
  b.rect(0, ry + g.S(7), g.w, g.S(2), hex('#1a1e3a'));
  const z0 = gr.z(ry + g.S(9));
  const mw = g.S(56);
  const mh = g.S(44);
  for (let y = ry + g.S(9); y < h; y += 1) {
    const gz = z0 - gr.z(y);
    for (let x = 0; x < g.w; x += 1) {
      const gx = gr.x(x, y);
      const u2 = ((((gx / mw) % 1) + 1) % 1) * 2 - 1;
      const v2 = ((((gz / mh) % 1) + 1) % 1) * 2 - 1;
      const med = Math.abs(u2) + Math.abs(v2);
      const c = med < 0.35 ? hex('#1a1e3a') : med < 0.5 ? hex('#8a6a2a') : med > 0.95 && med < 1.05 ? hex('#6a1018') : ramp(RAMP_18, 0.5 + Math.sin(gx * 0.3 + gz * 0.4) * 0.3, x, y);
      b.put(x, y, c);
    }
  }
}

function sceneBicho(b, G, r, g) {
  const { w, h, M, L, R, Y, S, floor } = g;
  // a sanca de cima, o papel de parede, o friso dourado e o lambri
  ogeeWallpaper(b, r, 0, Y(5), w, Y(56), g);
  b.rect(0, 0, w, Y(5), MAHOG.lo);
  b.rect(0, Y(3), w, 1, MAHOG.hi);
  goldRail(b, 0, w, Y(4), [0.2, 0.7, 0.3]);
  b.light(0, Y(7), w, S(4), BLACK, (x, y) => 0.5 - (y - Y(7)) * 0.12);
  mahoganyPanels(b, r, 0, w, Y(59), floor, g);
  goldRail(b, 0, w, Y(56));
  b.light(0, Y(62), w, S(3), BLACK, (x, y) => 0.45 - (y - Y(62)) * 0.15);
  // o retrato do patrão (à esquerda do rival) e a tabela do bicho (à direita), cada um com a luz de quadro
  patronPortrait(b, M(145), Y(10), g.k);
  pictureLight(b, G, M(150), Y(8), S(20));
  bichoChart(b, M(252), Y(12), g.k);
  pictureLight(b, G, M(266), Y(8), S(56));
  // à esquerda: a poltrona com o abajur e o charuto; à direita: a mesa do bicheiro e o cofre
  parquetAndRug(b, r, floor, h, g);
  floorLamp(b, G, L(80), Y(56), Y(124));
  chesterfield(b, L(24), Y(84), S(50));
  // o cinzeiro no braço da poltrona e o charuto aceso
  b.ellipse(L(70), Y(97), 3, 1.2, hex('#8e9c9e'));
  b.rect(L(68), Y(95), 6, 1, hex('#5a3418'));
  G.put(L(74), Y(95), hex('#ff8a32'));
  safe(b, R(366), Y(50), S(50), S(44));
  bookieDesk(b, G, R(340), Y(98), S(72));
}

function lightsBicho(g) {
  const { M, L, R, Y, u } = g;
  return {
    ambient: [0.2, 0.11, 0.1],
    lights: [
      { x: g.cx, y: Y(4), r: 130 * u, c: [1, 0.8, 0.55], k: 0.85, sy: 1.1 },
      // as luzes de quadro
      { x: M(160), y: Y(10), r: 46 * u, c: [1, 0.86, 0.6], k: 1.7, cone: 0.95, out: 0.15 },
      { x: M(294), y: Y(10), r: 70 * u, c: [1, 0.86, 0.6], k: 1.7, cone: 1.0, out: 0.15 },
      // o abajur de pé e a luminária de banqueiro
      { x: L(80), y: Y(62), r: 90 * u, c: [1, 0.66, 0.36], k: 2.0, sy: 0.85 },
      { x: R(349), y: Y(90), r: 70 * u, c: [0.8, 1, 0.66], k: 1.8, cone: 1.2, out: 0.5 },
      // o reflexo morno no aço do cofre
      { x: R(392), y: Y(66), r: 40 * u, c: [1, 0.7, 0.45], k: 0.6 },
    ],
  };
}

function finishBicho(raw, g) {
  const { M, L, R, Y, u } = g;
  // a luz vermelha da rua pela persiana, de lado, riscando a parede da esquerda
  blindStripes(raw, L(10), M(180), Y(10), g.floor + 4 * u, 0.42, '#ff3a2a', 0.42);
  // a fumaça do charuto subindo
  for (let k = 0; k < 40 * u; k += 1) {
    const y = Y(94) - k;
    const x = L(74) + Math.sin(k * 0.18) * 3 * (k / (40 * u)) + k * 0.15;
    raw.put(x, y, hex('#c8b8b0'), 0.35 * (1 - k / (40 * u)));
  }
  halo(raw, L(80), Y(61), 22 * u, hex('#ffc070'), 0.5, 1.2);
  halo(raw, R(349), Y(87), 18 * u, hex('#9aff9a'), 0.45, 1.6);
  halo(raw, M(160), Y(10), 12 * u, hex('#fff0c0'), 0.4, 2);
  halo(raw, M(294), Y(10), 22 * u, hex('#fff0c0'), 0.35, 2.5);
  halo(raw, L(74), Y(95), 5 * u, hex('#ff8a32'), 0.6);
}

// ---------------------------------------------------------------------------
// O Dono da Noite
// ---------------------------------------------------------------------------

const VELVET = pal('#120106', '#2a030c', '#4a0816', '#6e1022', '#962034');
const STONE = pal('#121018', '#1c1824', '#272232', '#332c40');

/** Pedra lavrada em fiadas, cada bloco no seu tom, o rejunte fundo e a quina de cima clara. */
function ashlar(b, r, x0, y0, x1, y1, g) {
  const bw = g.S(16);
  const bh = g.S(8);
  b.rect(x0, y0, x1 - x0, y1 - y0, hex('#08070c'));
  for (let row = 0, y = y0; y < y1; row += 1, y += bh) {
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let x = x0 - off; x < x1; x += bw) {
      const t = 0.35 + r() * 0.4;
      for (let yy = y; yy < Math.min(y1, y + bh - 1); yy += 1) {
        for (let xx = x; xx < x + bw - 1; xx += 1) {
          const n = Math.sin(xx * 0.8 + yy * 1.3) * 0.08 + (r() - 0.5) * 0.1;
          b.put(xx, yy, ramp(STONE, t + n - (yy - y) * 0.03, xx, yy));
        }
      }
      b.rect(x, y, bw - 1, 1, STONE[3], 0.7);
      if (r() < 0.25) b.line(x + 2, y + 2, x + 2 + Math.floor(r() * 6), y + bh - 2, hex('#0c0a10'), 0.6);
    }
  }
}

/**
 * A janela gótica: o arco quebrado de pedra, o vidro da noite em losangos de chumbo, a lua cheia
 * presa na rosácea redonda (atrás da cabeça do rival), o mainel do meio e as nuvens.
 */
function gothicWindow(b, G, r, g) {
  const cx = g.cx;
  const W = g.S(80);
  const apex = g.Y(4);
  const R = W * 0.62;
  const rise = Math.sqrt(R * R - (R - W / 2) * (R - W / 2));
  const spring = apex + rise;
  const sill = g.floor;
  const inside = (x, y, inset) => {
    const half = W / 2 - inset;
    if (y > sill) return false;
    if (y >= spring) return Math.abs(x - cx) <= half;
    const rr = R - inset;
    return Math.hypot(x - (cx + W / 2 - R), y - spring) <= rr && Math.hypot(x - (cx - W / 2 + R), y - spring) <= rr;
  };
  const frame = g.S(6);
  const moon = { x: cx, y: g.Y(30), r: g.S(17) };
  for (let y = 0; y < sill; y += 1) {
    for (let x = Math.floor(cx - W / 2 - 1); x <= Math.ceil(cx + W / 2 + 1); x += 1) {
      if (!inside(x, y, 0)) continue;
      if (!inside(x, y, frame)) {
        // a pedra do arco, com as juntas das aduelas
        const ang = Math.atan2(y - spring, x - cx);
        const joint = y < spring ? Math.abs(((ang * 9) % 1 + 1) % 1 - 0.5) < 0.06 : (y - spring) % g.S(10) === 0;
        const edge = inside(x, y, frame - 1) ? 0.85 : inside(x, y, 1) ? 0.5 : 0.25;
        b.put(x, y, joint ? hex('#0c0a10') : ramp(RAMP_19, edge, x, y));
        continue;
      }
      // o céu: azul da noite clareando perto da lua, as estrelas
      const d = Math.hypot(x - moon.x, y - moon.y);
      if (d <= moon.r) {
        const shade = 0.95 - Math.max(0, (x - moon.x) / moon.r) * 0.25 - (d / moon.r) * 0.15;
        const crater = Math.sin(x * 0.9) * Math.sin(y * 1.1 + x * 0.3) > 0.55 || Math.hypot(x - moon.x + g.S(5), y - moon.y + g.S(3)) < g.S(4) || Math.hypot(x - moon.x - g.S(4), y - moon.y - g.S(6)) < g.S(3);
        G.put(x, y, ramp(RAMP_20, shade - (crater ? 0.3 : 0), x, y));
        continue;
      }
      const glow = Math.max(0, 1 - (d - moon.r) / g.S(46));
      G.put(x, y, ramp(RAMP_21, 0.15 + glow * 0.75 - (y / sill) * 0.1, x, y));
      if (r() < 0.012 && glow < 0.3) G.put(x, y, hex('#d8e0ff'));
    }
  }
  // as nuvens passando: tufos escuros com a borda de cima prateada pela lua
  for (const [ox, oy, rx, ry] of [
    [-24, 44, 9, 3],
    [-14, 42, 7, 3.5],
    [16, 50, 10, 3],
    [26, 48, 6, 3],
    [-6, 64, 12, 3],
    [8, 62, 8, 3.5],
  ]) {
    const ccx = cx + g.S(ox);
    const ccy = g.Y(oy);
    const rrx = g.S(rx);
    const rry = g.S(ry);
    for (let y = Math.floor(ccy - rry); y <= ccy + rry; y += 1) {
      for (let x = Math.floor(ccx - rrx); x <= ccx + rrx; x += 1) {
        const d = Math.hypot((x - ccx) / rrx, (y - ccy) / rry);
        if (d > 1 || !inside(x, y, frame)) continue;
        const rim = y < ccy - rry * 0.35 && d > 0.55;
        G.put(x, y, rim ? hex('#9aa2c4') : ramp(RAMP_22, 0.8 - d * 0.6 + (ccy - y) / rry * 0.2, x, y));
      }
    }
  }
  // o chumbo dos vidros em losango (passa por cima da lua também)
  const step = g.S(7);
  for (let y = 0; y < sill; y += 1) {
    for (let x = Math.floor(cx - W / 2); x <= Math.ceil(cx + W / 2); x += 1) {
      if (!inside(x, y, frame) || Math.hypot(x - moon.x, y - moon.y) < moon.r + g.S(3)) continue;
      const a = (x - cx + y * 0.62) / step;
      const c = (x - cx - y * 0.62) / step;
      if (Math.abs(a - Math.round(a)) < 0.07 || Math.abs(c - Math.round(c)) < 0.07) b.put(x, y, hex('#06050a'));
    }
  }
  // a rosácea em volta da lua, o mainel do meio e os dois arquinhos
  const ring = moon.r + g.S(3);
  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    for (let t = 0; t < g.S(3); t += 1) {
      const x = Math.round(cx + Math.cos(a) * (ring + t));
      const y = Math.round(moon.y + Math.sin(a) * (ring + t));
      if (inside(x, y, 1)) b.put(x, y, t === 0 ? hex('#5a5068') : t === 1 ? hex('#3a3448') : hex('#1a1622'));
    }
  }
  const my = Math.round(moon.y + ring + g.S(2));
  b.rect(cx - g.S(1.5), my, g.S(3), sill - my, hex('#3a3448'));
  b.rect(cx - g.S(1.5), my, 1, sill - my, hex('#5a5068'));
  for (const side of [-1, 1]) {
    for (let k = 0; k < g.S(18); k += 1) {
      const x = Math.round(cx + side * (g.S(2) + k));
      const y = Math.round(my + g.S(4) - Math.sqrt(Math.max(0, g.S(18) * g.S(18) - (k - g.S(9)) * (k - g.S(9)) * 4)) * 0.25);
      b.rect(x, y, 1, g.S(2), hex('#3a3448'));
    }
  }
  return { moon, W, spring, frame };
}

/** A cortina de veludo amarrada: as dobras apertam na braçadeira dourada e abrem embaixo. */
function velvetCurtain(b, G, x0, x1, tieY, tieX, side, g) {
  const top = g.Y(2);
  const bottom = g.floor + g.S(6);
  const inner = side < 0 ? x1 : x0;
  for (let y = top; y < bottom; y += 1) {
    // a borda de dentro: desce da janela até a braçadeira e abre um pouco embaixo
    const t = y < tieY ? (y - top) / (tieY - top) : 1 - (y - tieY) / (bottom - tieY) * 0.35;
    const edge = Math.round(inner + (tieX - inner) * Math.sin(Math.min(1, t) * Math.PI * 0.5));
    const xa = side < 0 ? x0 : edge;
    const xb = side < 0 ? edge : x1;
    const pinch = 1 + Math.max(0, 1 - Math.abs(y - tieY) / g.S(30)) * 1.4;
    for (let x = xa; x < xb; x += 1) {
      const u = (x - tieX) * pinch;
      const fold = Math.sin(u * 0.32) * 0.55 + Math.sin(u * 0.11 + 1.3) * 0.35;
      const nearEdge = Math.abs(x - edge) < 2 ? 0.25 : 0;
      b.put(x, y, ramp(VELVET, 0.45 + fold * 0.42 + nearEdge - (y > tieY ? 0 : 0.05), x, y));
    }
    // a barra dourada na beira de dentro
    b.put(edge - side * 1, y, hex('#8a6420'));
  }
  // a braçadeira de corda dourada abraçando o pano e a borla pendurada do lado de dentro
  const ra = side < 0 ? x0 : tieX;
  const rb = side < 0 ? tieX : x1;
  for (let x = ra - 1; x <= rb + 1; x += 1) {
    const u2 = (x - ra) / Math.max(1, rb - ra);
    const sag = Math.round(Math.sin(u2 * Math.PI) * 2);
    b.put(x, tieY - 1 + sag, GOLD[1]);
    b.put(x, tieY + sag, ramp(GOLD, 0.85 - Math.abs(u2 - 0.4) * 0.6, x, tieY));
    b.put(x, tieY + 1 + sag, (x + tieY) % 3 ? GOLD[2] : GOLD[0]);
    b.put(x, tieY + 2 + sag, GOLD[1]);
  }
  const bx = tieX - side * 1;
  b.ellipse(bx, tieY + g.S(4), 2, 2, GOLD[3]);
  b.put(bx - 1, tieY + g.S(3), GOLD[4]);
  for (let k = 0; k < g.S(10); k += 1) b.rect(bx - 2 - Math.floor(k / 4), tieY + g.S(6) + k, 5 + Math.floor(k / 2), 1, ramp(GOLD, 0.75 - k * 0.04, bx, k));
  for (let k = 0; k < 5 + g.S(4); k += 2) b.put(bx - 3 + k, tieY + g.S(6) + g.S(10), GOLD[1]);
}

/** O bandô em gomos com a franja dourada, por cima das cortinas. */
function valance(b, x0, x1, g) {
  const sw = g.S(26);
  const depth = g.S(8);
  for (let x = x0; x < x1; x += 1) {
    const u = ((x - x0) % sw) / sw;
    const hang = g.Y(3) + Math.round(Math.sin(u * Math.PI) * depth);
    for (let y = 0; y < hang; y += 1) b.put(x, y, ramp(VELVET, 0.75 - Math.abs(u - 0.5) * 0.5 - (hang - y < 3 ? 0.3 : 0), x, y));
    b.put(x, hang, GOLD[2]);
    if (x % 2 === 0) b.rect(x, hang + 1, 1, g.S(2), GOLD[(x >> 1) % 2 ? 1 : 3]);
  }
}

/** As redomas da coleção: cada uma com um coração aceso, menos a última (vazia, esperando). */
function heartJars(b, G, x, y, n, step, g) {
  // a prateleira entalhada com a mão-francesa
  b.rect(x - g.S(4), y, n * step + g.S(4), g.S(3), hex('#24120c'));
  b.rect(x - g.S(4), y, n * step + g.S(4), 1, hex('#5a3420'));
  for (const bx of [x, x + n * step - g.S(6)]) {
    b.rect(bx, y + g.S(3), g.S(2), g.S(5), hex('#1a0c08'));
    b.line(bx + 1, y + g.S(8), bx + g.S(5), y + g.S(3), hex('#1a0c08'));
  }
  for (let k = 0; k < n; k += 1) {
    const jx = x + k * step + Math.round(step / 2) - g.S(3);
    const jw = g.S(9);
    const jh = g.S(12);
    // a base de madeira
    b.rect(jx - 1, y - g.S(2), jw + 2, g.S(2), hex('#3a2010'));
    b.rect(jx - 1, y - g.S(2), jw + 2, 1, hex('#7a4a2a'));
    const cy = y - g.S(2) - Math.round(jh * 0.45);
    if (k < n - 1) {
      // o coração aceso, batendo devagar no escuro
      const hx = jx + Math.floor(jw / 2);
      for (const [dx, dy] of [
        [-2, -1], [-1, -2], [-1, -1], [0, -1], [1, -2], [1, -1], [2, -1],
        [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
        [-1, 1], [0, 1], [1, 1], [0, 2],
      ])
        G.put(hx + dx, cy + dy, dy < 0 && dx < 0 ? hex('#ff6a6a') : hex('#c8141e'));
      G.put(hx - 1, cy - 1, hex('#ffc0b0'));
    }
    // o vidro: a cúpula, o reflexo e a borda
    for (let yy = 0; yy < jh; yy += 1) {
      const half = yy < g.S(3) ? Math.round(Math.sqrt(Math.max(0, 1 - ((g.S(3) - yy) / g.S(3)) ** 2)) * (jw / 2)) : Math.floor(jw / 2);
      const py = y - g.S(2) - jh + yy;
      b.put(jx + Math.floor(jw / 2) - half, py, hex('#8a98b0'), 0.55);
      b.put(jx + Math.floor(jw / 2) + half, py, hex('#4a5468'), 0.5);
      if (yy > 1 && yy < jh - 3) b.put(jx + Math.floor(jw / 2) - half + 1, py, hex('#e8f0ff'), yy % 3 ? 0.35 : 0.6);
    }
    b.rect(jx + Math.floor(jw / 2) - 1, y - g.S(2) - jh - 1, 3, 1, hex('#6a7488'));
  }
}

/** O relógio-armário parado à meia-noite: o capitel em arco, o mostrador e o pêndulo. */
function grandfatherClock(b, x, top, bottom, g) {
  const w = g.S(24);
  const wood = { hi: hex('#5a2e1a'), mid: hex('#341608'), lo: hex('#1e0a04'), deep: hex('#0c0402') };
  b.rect(x + 2, top + 2, w, bottom - top, BLACK, 0.45);
  // o capitel com o arco e os pináculos
  b.rect(x - 1, top + g.S(4), w + 2, g.S(24), wood.mid);
  b.rect(x - 1, top + g.S(4), w + 2, 1, wood.hi);
  for (let k = 0; k < g.S(6); k += 1) b.rect(x + k, top + g.S(4) - k, w - k * 2, 1, k === g.S(6) - 1 ? wood.hi : wood.mid);
  for (const px of [x, x + w - 2]) {
    b.rect(px, top - g.S(1), 2, g.S(5), wood.lo);
    b.put(px, top - g.S(2), hex('#c8a040'));
  }
  // o mostrador: o aro de latão, o creme, os pontos das horas e os ponteiros no 12
  const fx = x + Math.round(w / 2);
  const fy = top + g.S(15);
  const fr = g.S(8);
  b.ellipse(fx, fy, fr + 1, fr + 1, hex('#8a6420'));
  b.ellipse(fx, fy, fr, fr, hex('#d8ccaa'));
  for (let hh = 0; hh < 12; hh += 1) {
    const a = (hh / 12) * Math.PI * 2;
    b.put(Math.round(fx + Math.sin(a) * (fr - 1.5)), Math.round(fy - Math.cos(a) * (fr - 1.5)), hex('#2a1a10'));
  }
  b.rect(fx, fy - fr + 2, 1, fr - 2, hex('#14080a'));
  b.rect(fx - 1, fy - fr + 4, 1, fr - 4, hex('#14080a'));
  b.put(fx, fy, hex('#c8a040'));
  // o corpo com a portinha de vidro e o pêndulo
  b.rect(x + g.S(3), top + g.S(28), w - g.S(6), bottom - top - g.S(34), wood.mid);
  b.rect(x + g.S(3), top + g.S(28), 1, bottom - top - g.S(34), wood.hi);
  const px = x + g.S(7);
  const pw = w - g.S(14);
  b.rect(px, top + g.S(32), pw, g.S(36), hex('#0a0608'));
  b.rect(px, top + g.S(32), pw, 1, wood.lo);
  b.rect(fx, top + g.S(32), 1, g.S(26), hex('#8a6420'));
  b.ellipse(fx + 0.5, top + g.S(60), g.S(3.5), g.S(3.5), hex('#c8a040'));
  b.put(fx - 1, top + g.S(59), hex('#fff0a8'));
  b.rect(px + 1, top + g.S(33), 1, g.S(30), hex('#6a7488'), 0.35);
  // a base
  b.rect(x - 1, bottom - g.S(8), w + 2, g.S(8), wood.mid);
  b.rect(x - 1, bottom - g.S(8), w + 2, 1, wood.hi);
}

/** O chão de mármore em xadrez, em perspectiva, com o veio e o brilho encerado. */
function marbleFloor(b, r, y0, y1, g) {
  const hy = g.Y(-40);
  for (let y = y0; y < y1; y += 1) {
    const zr = (g.S(3200) / (y - hy)) / g.u;
    const row = Math.floor(zr);
    const fz = zr - row;
    for (let x = 0; x < g.w; x += 1) {
      const xr = ((x - g.cx) / (y - hy)) * 8.5;
      const col = Math.floor(xr);
      const fx = xr - col;
      const dark = ((row + col) % 2 + 2) % 2 === 0;
      const vein = Math.sin(xr * 5 + zr * 9 + Math.sin(xr * 2) * 2) > 0.94;
      let c = ramp(dark ? RAMP_23 : RAMP_24, 0.45 + Math.sin(xr * 3.1 + zr * 1.7) * 0.25, x, y);
      if (vein) c = dark ? hex('#1e1a28') : hex('#4a3e58');
      // a junta fina entre as pedras
      if (fz < 0.06 || fx < 0.03) c = hex('#020104');
      b.put(x, y, c);
    }
  }
  b.rect(0, y0, g.w, g.S(2), hex('#050408'));
}

function sceneNoite(b, G, r, g) {
  const { w, h, M, L, R, Y, S, floor } = g;
  ashlar(b, r, 0, 0, w, floor, g);
  marbleFloor(b, r, floor, h, g);
  // a janela e as cortinas que a emolduram
  gothicWindow(b, G, r, g);
  velvetCurtain(b, G, M(118), M(174), Y(58), M(140), -1, g);
  velvetCurtain(b, G, M(248), M(304), Y(58), M(282), 1, g);
  valance(b, M(114), M(176), g);
  valance(b, M(246), M(308), g);
  // o varão de ferro de ponta a ponta, com as pontas de lança
  b.rect(M(110), Y(1), M(312) - M(110), S(2), hex('#2a2430'));
  b.rect(M(110), Y(1), M(312) - M(110), 1, hex('#6a6078'));
  for (const fx of [M(108), M(313)]) {
    b.rect(fx - 1, Y(0), 3, S(4), hex('#3a3444'));
    b.put(fx, Y(0) - 1, hex('#8a8098'));
  }
  // a coleção de corações à esquerda e o relógio parado à direita
  heartJars(b, G, L(34), Y(68), 5, S(16), g);
  grandfatherClock(b, M(320), Y(16), floor + S(4), g);
  // a teia no canto e a corrente pendurada à direita
  for (let k = 0; k < S(20); k += 1) b.put(R(404) + Math.round(Math.sin(k * 0.5) * 1.2), Y(34) + k * 2, k % 2 ? hex('#4a4450') : hex('#2a2430'));
}

function candleLights(g, k = 1) {
  return landCandleSpots(g.w * 2, g.h * 2).map((c) => ({ x: c.x / 2, y: (c.y - CANDLE_FLAME * c.s) / 2, r: (c.far ? 110 : 120) * g.u, c: [1, 0.6, 0.28], k: (c.far ? 1.7 : 1.5) * k }));
}

function lightsNoite(g) {
  const { L, Y, u } = g;
  return {
    ambient: [0.07, 0.06, 0.12],
    lights: [
      { x: g.cx, y: Y(30), r: 140 * u, c: [0.5, 0.58, 1], k: 1.1, sy: 0.9 },
      ...candleLights(g),
      { x: L(74), y: Y(58), r: 50 * u, c: [1, 0.12, 0.18], k: 0.9, sy: 1.4 },
    ],
  };
}

function finishNoite(raw, g) {
  const { L, Y, u } = g;
  halo(raw, g.cx, Y(30), 64 * u, hex('#b8c4ff'), 0.42, 1);
  for (const c of candleLights(g)) halo(raw, c.x, c.y, 16 * u, hex('#ffb060'), 0.45, 1.1);
  for (let k = 0; k < 4; k += 1) halo(raw, L(34) + k * 16 * u + 8 * u - 3 * u + 4 * u, Y(68) - 9 * u, 7 * u, hex('#ff3040'), 0.45);
  // a névoa roxa rente ao chão
  raw.light(0, g.floor - 12 * u, g.w, g.h - g.floor + 12 * u, hex('#5a4a8a'), (x, y) => {
    const n = Math.sin(x * 0.05 + y * 0.2) * 0.5 + Math.sin(x * 0.017 - y * 0.05) * 0.5;
    const band = Math.max(0, 1 - Math.abs(y - g.floor - 6 * u) / (16 * u));
    const t = Math.max(0, n) * band * 0.3;
    return t > bayer(x, y) * 0.12 ? t : 0;
  });
}

// ---------------------------------------------------------------------------
// Versão 2.30: os cenários de dia (a calçada do bar, o quiosque da praia, a praça do coreto).
// O sol no lugar da lâmpada: a luz ambiente alta, o céu azul com nuvens, as sombras curtas.
// ---------------------------------------------------------------------------

/** As salas de dia: sem a lâmpada pendurada (nem o facho dela) e sem fumaça. */
export const DAY_ROOMS = Object.freeze(['landcalcada', 'landpraia', 'landpraca']);

const SKY_DAY = pal('#2a6ac8', '#3a82da', '#5a9ee6', '#7ab8ee', '#a2d0f4', '#c8e4f8');

/** O céu de dia em degraus pontilhados, de `y0` (em cima, azul forte) a `y1` (claro no horizonte). */
function daySky(b, x0, y0, x1, y1, stops = SKY_DAY) {
  for (let y = y0; y < y1; y += 1) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    for (let x = x0; x < x1; x += 1) b.put(x, y, ramp(stops, t, x, y));
  }
}

/**
 * Versão 2.31: pintando em camadas (paintDayLayers), as nuvens não vão para a cena: vão para esta
 * lista e ganham a camada delas, que anda devagar. E o mar sai sem as cristas (elas andam também).
 */
let cloudSink = null;
let seaLayered = false;

/** Nuvem de algodão: bolotas brancas com a barriga cinza-azulada e a luz em cima. */
function cloud(b, r, cx, cy, wd, ht) {
  const lobes = [];
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6;
    const rr = ht * (0.45 + Math.sin(t * Math.PI) * 0.55) * (0.8 + r() * 0.3);
    lobes.push([cx - wd / 2 + t * wd, cy - Math.sin(t * Math.PI) * ht * 0.35, rr]);
  }
  if (cloudSink) cloudSink.push({ cx, cy, wd, ht, lobes });
  else drawCloud(b, { cx, cy, wd, ht, lobes }, 0);
}

/** A nuvem já sorteada, deslocada `dx` px. */
function drawCloud(b, { cx, cy, wd, ht, lobes }, dx) {
  for (const [x, y, rr] of lobes) b.ellipse(x + dx, y + 1, rr, rr * 0.75, hex('#b8cce4'));
  for (const [x, y, rr] of lobes) b.ellipse(x + dx - rr * 0.1, y - rr * 0.12, rr * 0.86, rr * 0.62, hex('#eef6fc'));
  for (const [x, y, rr] of lobes) b.ellipse(x + dx - rr * 0.25, y - rr * 0.3, rr * 0.45, rr * 0.3, hex('#ffffff'));
  b.rect(cx + dx - wd / 2 - ht * 0.3, cy + ht * 0.3, wd + ht * 0.6, 1, hex('#a8bcd8'), 0.7);
}

/** O sol, com o miolo branco e a coroa amarela (vai para a camada que brilha). */
function sun(G, x, y, rr) {
  G.ellipse(x, y, rr + 2, rr + 2, hex('#ffe9a0'));
  G.ellipse(x, y, rr, rr, hex('#fff8dc'));
}

/** Fio de poste caindo em catenária de (x0, y0) a (x1, y1). */
function wire(b, x0, y0, x1, y1, sag, c = '#1a1a22') {
  const n = Math.max(1, Math.abs(x1 - x0));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    b.put(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag), hex(c));
  }
}

/** Pedra portuguesa (as ondas pretas e brancas do calçadão), em perspectiva até o pé da tela. */
function calcadao(b, x0, y0, x1, y1, g, light = '#e6dece', dark = '#6e675c') {
  // versão 2.38: as ondas da pedra portuguesa deitadas no chão: largas e abertas aqui perto,
  // apertadas e miúdas lá no fundo, correndo para o horizonte
  const L = hex(light);
  const D = hex(dark);
  const gr = groundOf(g);
  const unit = g.S(9);
  for (let y = y0; y < y1; y += 1) {
    const v = gr.z(y) / unit;
    const kk = Math.max(0.3, gr.k(y));
    for (let x = x0; x < x1; x += 1) {
      const u = gr.x(x, y) / unit;
      const wave = Math.sin(v * 1.15 + Math.sin(u * 0.55) * 1.9) * 0.8 + Math.sin(u * 1.1 + v * 0.2) * 0.35;
      const stone = ((Math.floor(u * 3.2) + Math.floor(v * 3.2)) & 1) === 1;
      const edge = Math.abs(wave) < 0.05 / kk;
      b.put(x, y, edge ? shift(D, -10) : wave > 0 ? shift(L, stone ? -14 : 0) : shift(D, stone ? 10 : 0));
    }
  }
}

/** Uma pilha de cadeiras de plástico brancas empilhadas (os encostos se repetindo). */
function chairStack(b, x, base, n) {
  for (let k = n - 1; k >= 0; k -= 1) {
    const y = base - 34 - k * 3;
    const c = hex(k === 0 ? '#f6f6f0' : '#dcdcd4');
    b.rect(x, y, 18, 13, c);
    b.rect(x, y, 18, 1, hex('#ffffff'));
    b.rect(x + 17, y + 1, 1, 12, hex('#b8b8b0'));
    for (let s = 0; s < 3; s += 1) b.rect(x + 4 + s * 4, y + 3, 2, 6, hex('#a8a8a0'));
    b.rect(x - 1, y + 13, 20, 2, shift(c, -22));
  }
  for (const lx of [x, x + 16]) {
    b.line(lx + 1, base - 19, lx + (lx === x ? -1 : 3), base, hex('#d8d8d0'));
    b.line(lx + 2, base - 19, lx + (lx === x ? 0 : 4), base, hex('#a8a8a0'));
  }
  contact(b, x + 9, base, 13, 2, 0.45);
}

/** O poste de concreto com a luminária de braço (apagada de dia). */
function streetPole(b, x, top, base, dir = -1) {
  b.rect(x, top, 4, base - top, hex('#a8a49a'));
  b.rect(x, top, 1, base - top, hex('#d8d4ca'));
  b.rect(x + 3, top, 1, base - top, hex('#6a665e'));
  const ax = x + dir * 16;
  b.line(x + 1, top + 2, ax, top - 2, hex('#4a4c50'));
  b.line(x + 1, top + 3, ax, top - 1, hex('#3a3c40'));
  b.rect(ax - 4, top - 3, 9, 3, hex('#3a3c40'));
  b.rect(ax - 3, top, 7, 2, hex('#c8c8b8'));
  // a caixa do transformador
  b.rect(x - 4, top + 14, 12, 10, hex('#5a5e62'));
  b.rect(x - 4, top + 14, 12, 1, hex('#8a8e92'));
}

/** O toldo listrado, visto de frente: as faixas, a franja em ondas e a sombra embaixo. */
function awning(b, x, y, w, h, colors = ['#c8261c', '#f4ece0']) {
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const band = Math.floor(xx / 8) % 2;
      const c = hex(colors[band]);
      b.put(x + xx, y + yy, shift(c, Math.round(-yy * 2.5 + (yy === 0 ? 14 : 0))));
    }
  }
  // a franja recortada
  for (let xx = 0; xx < w; xx += 1) {
    const k = xx % 8;
    const depth = k < 4 ? 3 - Math.abs(k - 1.5) * 0.6 : 0;
    for (let d = 0; d < depth; d += 1) b.put(x + xx, y + h + d, shift(hex(colors[Math.floor(xx / 8) % 2]), -30));
  }
  b.rect(x, y - 1, w, 1, hex('#3a2a20'));
}

/** A porta de enrolar levantada, com o bar na sombra lá dentro (o balcão e as garrafas). */
function rollDoor(b, G, r, x, y, w, bottom, open) {
  const inY = y + open;
  for (let yy = inY; yy < bottom; yy += 1) for (let xx = x; xx < x + w; xx += 1) b.put(xx, yy, ramp(pal('#3a2a1a', '#5a4026', '#7a5a36', '#9a7a4e'), 0.7 - (yy - inY) / (bottom - inY) * 0.4, xx, yy));
  shelf(b, r, x + 2, inY + 8, w - 4, [2, 'mug', 0, 3, 1, 'mug', 4, 2, 5, 0, 3, 'mug', 1]);
  shelf(b, r, x + 2, inY + 24, w - 4, [0, 4, 1, 3, 'mug', 2, 5, 0, 'mug', 1]);
  // a geladeira com a porta de vidro (a luz fria dela)
  G.rect(x + w - 26, inY + 34, 20, bottom - inY - 46, hex('#cfe8f0'));
  for (let k = 0; k < 3; k += 1) b.rect(x + w - 24, inY + 40 + k * 8, 16, 1, hex('#6a8a94'));
  b.rect(x, bottom - 12, w, 12, hex('#8a5a2a'));
  b.rect(x, bottom - 12, w, 2, hex('#d8a060'));
  b.rect(x, bottom - 3, w, 3, hex('#3a2410'));
  for (let yy = y; yy < inY; yy += 1) {
    const k = (yy - y) % 4;
    const c = k === 0 ? hex('#6a6e72') : k === 1 ? hex('#c8ccd0') : k === 2 ? hex('#a8acb0') : hex('#8a8e92');
    b.rect(x, yy, w, 1, c);
  }
  b.rect(x, inY - 3, w, 3, hex('#5a5e62'));
  b.rect(x + w / 2 - 3, inY - 2, 6, 1, hex('#e8ecf0'));
  b.rect(x - 3, y - 2, 3, bottom - y + 2, hex('#4a4a4e'));
  b.rect(x + w, y - 2, 3, bottom - y + 2, hex('#4a4a4e'));
}

/** Letreiro pintado à mão numa chapa: o fundo, a borda e o nome. */
function paintedSign(b, x, y, w, h, text, { bg = '#f4ead0', fg = '#b8261c', edge = '#3a2410', sub = null, subFg = '#2a4a8a' } = {}) {
  b.rect(x + 2, y + 2, w, h, BLACK, 0.3);
  for (let yy = 0; yy < h; yy += 1) for (let xx = 0; xx < w; xx += 1) b.put(x + xx, y + yy, shift(hex(bg), Math.round(Math.sin(xx * 0.7 + yy) * 3 - (yy / h) * 12)));
  b.rect(x, y, w, 1, hex(edge));
  b.rect(x, y + h - 1, w, 1, hex(edge));
  b.rect(x, y, 1, h, hex(edge));
  b.rect(x + w - 1, y, 1, h, hex(edge));
  const tw = textWidth(text) * 2;
  pixelText(b, text, x + Math.round((w - tw) / 2), y + (sub ? 2 : Math.round((h - 10) / 2)), hex(fg), { s: 2 });
  if (sub) pixelText(b, sub, x + Math.round((w - textWidth(sub)) / 2), y + h - 7, hex(subFg));
  for (const px of [x + 2, x + w - 3]) {
    b.put(px, y + 2, hex('#5a3a20'));
    for (let k = 0; k < 4; k += 1) b.put(px, y + 3 + k, hex('#8a4a20'), 0.4 - k * 0.08);
  }
}

/** Uma moto estacionada (a de entrega), de lado: as rodas, o tanque e o baú. */
function motorbike(b, x, base) {
  for (const wx of [x + 6, x + 34]) {
    b.ellipse(wx, base - 6, 6, 6, hex('#1a1a1e'));
    b.ellipse(wx, base - 6, 3, 3, hex('#8a8e92'));
    b.put(wx, base - 6, hex('#2a2a2e'));
  }
  b.rect(x + 8, base - 14, 24, 5, hex('#c8261c'));
  b.rect(x + 8, base - 14, 24, 1, hex('#f06a5a'));
  b.rect(x + 14, base - 18, 10, 4, hex('#c8261c'));
  b.rect(x + 26, base - 17, 9, 3, hex('#1a1a1e'));
  b.line(x + 34, base - 17, x + 36, base - 24, hex('#4a4a4e'));
  b.rect(x + 33, base - 25, 6, 1, hex('#1a1a1e'));
  b.rect(x + 2, base - 26, 14, 12, hex('#e8e4d8'));
  b.rect(x + 2, base - 26, 14, 1, hex('#ffffff'));
  b.rect(x + 2, base - 20, 14, 2, hex('#c8261c'));
  contact(b, x + 20, base, 22, 2, 0.5);
}

/** O fundo da calçada: o céu e o sol (o que fica atrás das nuvens que andam). */
function skyCalcada(b, G, g) {
  daySky(b, 0, 0, g.w, g.Y(44));
  sun(G, g.L(128), g.Y(7), g.S(5));
}

function sceneCalcada(b, G, r, g) {
  const { w, h, M, L, R, Y, S, floor } = g;
  // o céu azul, o sol à esquerda, as nuvens e os fios
  skyCalcada(b, G, g);
  cloud(b, r, M(176), Y(5), S(44), S(7));
  cloud(b, r, R(370), Y(4), S(36), S(6));
  // a casa vizinha à esquerda: a parede azul-piscina com a janela de grade e o vaso
  for (let y = Y(16); y < floor; y += 1) for (let x = 0; x < M(96); x += 1) b.put(x, y, ramp(pal('#3a7aa8', '#4a8ebc', '#5aa2cc', '#72b6d8'), 0.55 + Math.sin(x * 0.11 + y * 0.07) * 0.08, x, y));
  b.rect(0, Y(14), M(98), S(3), hex('#8a3a24'));
  b.rect(0, Y(14), M(98), 1, hex('#c86a4a'));
  b.rect(L(18), Y(30), S(28), S(24), hex('#2a3a44'));
  b.rect(L(20), Y(32), S(24), S(20), hex('#6a9ab8'));
  b.rect(L(20), Y(32), S(10), S(20), hex('#8ab8d4'));
  for (let k = 0; k < 5; k += 1) b.rect(L(20) + k * S(5), Y(32), 1, S(20), hex('#1a1a1e'));
  b.rect(L(20), Y(42), S(24), 1, hex('#1a1a1e'));
  b.rect(L(16), Y(54), S(32), S(2), hex('#e8e4d8'));
  b.ellipse(L(32), Y(52), S(6), S(4), hex('#2a7a3a'));
  b.ellipse(L(29), Y(50), S(3), S(2), hex('#4aa85a'));
  b.ellipse(L(36), Y(49), S(2), S(2), hex('#e84a6a'));
  // o bar: a fachada amarela-mostarda com o reboco gasto e a barra vermelha embaixo
  const fx0 = M(96);
  const fx1 = R(410);
  // o vizinho do lado: a parede caiada que aparece na beira da tela
  for (let y = Y(14); y < floor; y += 1) for (let x = fx1; x < w; x += 1) b.put(x, y, ramp(pal('#8e9a8a', '#a8b4a2', '#bcc6b4', '#d0d8c6'), 0.5 + Math.sin(y * 0.4 + x * 0.1) * 0.05, x, y));
  for (let y = Y(10); y < floor; y += 1) {
    for (let x = fx0; x < fx1; x += 1) {
      const n = Math.sin(x * 0.08 + Math.sin(y * 0.1) * 2) + Math.sin(y * 0.15 + x * 0.03) * 0.6;
      b.put(x, y, ramp(pal('#c8862a', '#e0a03a', '#f0b84a', '#f8cc6a'), 0.5 + n * 0.08, x, y));
    }
  }
  b.rect(fx0, Y(8), fx1 - fx0, S(3), hex('#8a4a1a'));
  b.rect(fx0, Y(8), fx1 - fx0, 1, hex('#e8a060'));
  b.rect(fx0, floor - Y(12), fx1 - fx0, Y(12), hex('#a82a1e'));
  b.rect(fx0, floor - Y(12), fx1 - fx0, 1, hex('#e85a4a'));
  for (let i = 0; i < Math.round((fx1 - fx0) / 9); i += 1) {
    const x = fx0 + Math.floor(r() * (fx1 - fx0));
    const len = 4 + Math.floor(r() * Y(16));
    for (let k = 0; k < len; k += 1) b.put(x, Y(12) + k, hex('#8a5a20'), 0.18 * (1 - k / len));
  }
  // a porta de enrolar no meio, atrás do rival, e o toldo listrado por cima
  rollDoor(b, G, r, M(150), Y(20), S(122), floor, S(10));
  awning(b, M(144), Y(13), S(134), S(7));
  // a sombra do toldo na fachada
  b.rect(M(144), Y(13) + S(10), S(134), S(3), BLACK, 0.18);
  // o letreiro pintado do bar, à direita, e o quadro de preços
  paintedSign(b, M(286), Y(18), S(102), S(19), 'BAR DO CANTO', { sub: 'DESDE 1978' });
  b.rect(M(300), Y(46), S(34), S(30), hex('#1e3a26'));
  b.rect(M(300), Y(46), S(34), 1, hex('#8a6a3a'));
  pixelText(b, 'HOJE', M(306), Y(49), hex('#f4e6b0'));
  pixelText(b, 'TORRESMO', M(302), Y(56), hex('#ffffff'));
  pixelText(b, 'PASTEL', M(302), Y(62), hex('#ffffff'));
  pixelText(b, 'CALDO', M(302), Y(68), hex('#f8d050'));
  fiadoSign(b, M(103), Y(38));
  // o poste à direita, os fios e as bandeirinhas
  streetPole(b, R(404), Y(6), floor, -1);
  wire(b, 0, Y(6), R(405), Y(8), S(10));
  wire(b, 0, Y(11), R(405), Y(12), S(8));
  for (let k = 0; k < 18; k += 1) {
    const t = (k + 0.5) / 18;
    const x = Math.round(M(100) + (R(400) - M(100)) * t);
    const y = Math.round(Y(4) + Math.sin(t * Math.PI) * S(3));
    const c = ['#e8261c', '#f8c830', '#2a9a4a', '#2a6ad8', '#f86a2a'][k % 5];
    for (let yy = 0; yy < 4; yy += 1) for (let xx = -2 + Math.floor(yy / 2); xx <= 2 - Math.floor(yy / 2); xx += 1) b.put(x + xx, y + yy, hex(c));
  }
  wire(b, M(100), Y(4), R(400), Y(4), S(3), '#4a4a4a');
  // o chão: a calçada de pedra portuguesa e o meio-fio
  calcadao(b, 0, floor, w, h, g);
  b.rect(0, floor, w, S(2), hex('#8a867c'));
  b.rect(0, floor, w, 1, hex('#d8d4c8'));
  // a sombra do toldo no chão, rente à porta
  b.light(M(140), floor, S(142), S(8), BLACK, (x, y) => 0.32 - (y - floor) * 0.03);
  chairStack(b, L(30), Y(128), 5);
  beerCrates(b, L(58), Y(126), 2);
  plasticChair(b, R(362), Y(100));
  motorbike(b, R(372), Y(130));
}

function lightsCalcada(g) {
  const { L, M, Y, u } = g;
  return {
    ambient: [0.92, 0.9, 0.86],
    lights: [
      { x: L(128), y: Y(-20), r: 360 * u, c: [1, 0.96, 0.82], k: 0.3, sy: 0.6 },
      { x: M(211), y: Y(60), r: 50 * u, c: [1, 0.86, 0.6], k: 0.2 },
    ],
  };
}

function finishCalcada(raw, g) {
  const { L, Y, u } = g;
  halo(raw, L(128), Y(7), 26 * u, hex('#fff4c8'), 0.45, 1);
}

// --- o quiosque da praia ------------------------------------------------------

/** O coqueiro: o tronco curvo com os anéis e a copa das folhas caídas, verde de dia. */
function palm(b, x, base, top, lean, scale = 1) {
  const H = base - top;
  for (let k = 0; k < H; k += 1) {
    const t = k / H;
    const px = Math.round(x + Math.sin(t * 1.4) * lean * t);
    const py = base - k;
    const wd = Math.max(2, Math.round((5 - t * 2) * scale));
    b.rect(px - Math.floor(wd / 2), py, wd, 1, k % 4 === 0 ? hex('#6a4a2a') : hex('#9a7448'));
    b.put(px - Math.floor(wd / 2), py, hex('#c8a070'));
    b.put(px + Math.ceil(wd / 2) - 1, py, hex('#5a3a1e'));
  }
  const cx = Math.round(x + Math.sin(1.4) * lean);
  for (let f = 0; f < 9; f += 1) {
    const a = -Math.PI * 1.05 + (f / 8) * Math.PI * 1.1;
    const len = (22 + (f % 3) * 5) * scale;
    for (let s = 0; s < len; s += 1) {
      const t = s / len;
      const fx = cx + Math.cos(a) * s;
      const fy = top + Math.sin(a) * s * 0.55 + t * t * len * 0.55;
      b.put(fx, fy, hex('#2a5a1e'));
      for (let l = 1; l < 5 * (1 - t) + 1; l += 1) {
        b.put(fx - Math.sin(a) * l * 0.5, fy + l, hex(l < 2 ? '#6ab84a' : '#3a8a2e'));
        b.put(fx + Math.sin(a) * l * 0.5, fy + l, hex('#2a6a22'));
      }
    }
  }
  b.ellipse(cx - 1, top + 2, 2.5, 2, hex('#6a8a2a'));
  b.ellipse(cx + 2, top + 3, 2.5, 2, hex('#4a6a1a'));
}

/** O sapê: as palhas penduradas na beirada do teto do quiosque. */
function thatch(b, r, x0, x1, y, depth) {
  for (let x = x0; x < x1; x += 1) {
    const len = depth + Math.floor(r() * 5) + (x % 3 === 0 ? 2 : 0);
    for (let k = 0; k < len; k += 1) b.put(x, y + k, ramp(pal('#7a5a24', '#a8843a', '#c8a454', '#e8c87a'), 0.85 - (k / len) * 0.7 + (x % 2 ? -0.1 : 0), x, k));
  }
  for (let x = x0; x < x1; x += 1) b.put(x, y + 1, hex('#5a3a14'), 0.5);
}

/** As lampadinhas coloridas no fio (apagadas de dia, só o vidro colorido). */
function bulbString(b, x0, x1, y, sag, step) {
  wire(b, x0, y, x1, y, sag, '#2a2018');
  const cols = ['#e84a3a', '#f0c030', '#3ab85a', '#3a8ae8', '#e87ab8'];
  let k = 0;
  for (let x = x0 + 4; x < x1 - 2; x += step) {
    const t = (x - x0) / (x1 - x0);
    const yy = Math.round(y + Math.sin(t * Math.PI) * sag);
    b.put(x, yy + 1, hex('#2a2018'));
    b.rect(x - 1, yy + 2, 3, 3, hex(cols[k % cols.length]));
    b.put(x - 1, yy + 2, hex('#ffffff'));
    k += 1;
  }
}

/** O isopor azul e branco com a tampa e a alça de corda. */
function cooler(b, x, base, w2) {
  const hh = 16;
  b.rect(x, base - hh, w2, hh, hex('#f4f8fc'));
  b.rect(x, base - hh, w2, 4, hex('#2a6ab8'));
  b.rect(x, base - hh, w2, 1, hex('#6aa8e8'));
  b.rect(x + w2 - 1, base - hh, 1, hh, hex('#b8c4d0'));
  pixelText(b, 'GELO', x + Math.round((w2 - textWidth('GELO')) / 2), base - hh + 7, hex('#2a6ab8'));
  b.line(x + 4, base - hh - 3, x + w2 - 5, base - hh - 3, hex('#c8a46a'));
  b.rect(x + 4, base - hh - 2, 1, 2, hex('#c8a46a'));
  b.rect(x + w2 - 5, base - hh - 2, 1, 2, hex('#c8a46a'));
  contact(b, x + w2 / 2, base, w2 * 0.7, 2, 0.45);
}

/** A prancha encostada no poste, com a faixa no meio. */
function surfboard(b, x, base, top) {
  for (let y = top; y < base; y += 1) {
    const t = (y - top) / (base - top);
    const half = Math.max(1, Math.round(Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.5) * 5 * (1 - t * 0.25)));
    for (let xx = -half; xx <= half; xx += 1) b.put(x + xx + Math.round(t * 3), y, Math.abs(xx) === half ? hex('#3a5a6a') : xx === 0 ? hex('#f05a2a') : hex('#fcf4dc'));
  }
  contact(b, x + 3, base, 8, 2, 0.4);
}

/** O guarda-sol de praia aberto, listrado, com a sombra na areia. */
function parasol(b, x, base, top, rr) {
  b.rect(x, top, 1, base - top, hex('#e8e4d8'));
  for (let yy = 0; yy < rr * 0.55; yy += 1) {
    const half = Math.round(rr * Math.sqrt(1 - (yy / (rr * 0.55)) ** 2) * (0.4 + (yy / (rr * 0.55)) * 0.6));
    for (let xx = -half; xx <= half; xx += 1) {
      const seg = Math.floor(((Math.atan2(yy + 1, xx) / Math.PI) * 8 + 8)) % 2;
      b.put(x + xx, top + yy, hex(seg ? '#f4ece0' : '#e8462a'));
    }
  }
  contact(b, x + 4, base, rr * 0.9, 3, 0.35);
}

/** Gaivota de longe: o V das asas. */
function gull(b, x, y) {
  b.put(x - 2, y - 1, hex('#3a3a44'));
  b.put(x - 1, y, hex('#3a3a44'));
  b.put(x, y, hex('#3a3a44'));
  b.put(x + 1, y, hex('#3a3a44'));
  b.put(x + 2, y - 1, hex('#3a3a44'));
}

/** O céu da praia e o sol alto à direita. */
function skyPraia(b, G, g) {
  daySky(b, 0, 0, g.w, g.Y(60), pal('#2a6ac8', '#3a86dc', '#5aa4e8', '#82c0f0', '#b0dcf6', '#d8eefa'));
  sun(G, g.M(268), g.Y(16), g.S(7));
}

/** As cristas do mar parado (a versão em camadas tira as cristas: elas andam na camada delas). */
const seaCrest = (x, y, t) => Math.sin(x * 0.12 + y * 1.7) > 0.9 - t * 0.1;
const SEA = ['#1a5a9a', '#1e72a8', '#2a8ab8', '#3aa8c8', '#5ac4d0'];

/** O mar: o azul-turquesa (com as cristas brancas, se `crests`) e o brilho do sol na água. */
function seaPraia(b, G, g, crests) {
  const { w, M, Y, S } = g;
  const horizon = Y(60);
  for (let y = horizon; y < Y(80); y += 1) {
    const t = (y - horizon) / (Y(80) - horizon);
    for (let x = 0; x < w; x += 1) b.put(x, y, crests && seaCrest(x, y, t) ? hex('#e8f8fc') : ramp(pal(...SEA), t, x, y));
  }
  for (let y = horizon + 1; y < Y(78); y += 2) {
    const half = S(4) + (y - horizon) * 0.4;
    for (let x = Math.round(M(268) - half); x < M(268) + half; x += 2) if (Math.sin(x * 0.9 + y) > 0.3) G.put(x, y, hex('#fffbe8'), 0.8);
  }
  b.rect(0, horizon, w, 1, hex('#1a4a80'));
}

function scenePraia(b, G, r, g) {
  const { w, h, M, L, R, Y, S, floor } = g;
  skyPraia(b, G, g);
  cloud(b, r, M(150), Y(26), S(46), S(9));
  cloud(b, r, L(70), Y(36), S(30), S(6));
  cloud(b, r, M(300), Y(40), S(28), S(5));
  for (const [gx, gy] of [
    [M(250), Y(24)],
    [M(262), Y(20)],
    [M(118), Y(46)],
  ])
    gull(b, gx, gy);
  seaPraia(b, G, g, !seaLayered);
  // a espuma na beira e a areia clara até o deque
  for (let y = Math.floor(Y(80)); y < floor; y += 1) for (let x = 0; x < w; x += 1) b.put(x, y, ramp(pal('#c8a874', '#dcbe8a', '#ecd2a2', '#f6e2ba'), 0.55 + Math.sin(x * 0.05 + y * 0.3) * 0.08 - (Math.max(0, y - Y(81)) / (floor - Y(81))) * 0.2, x, y));
  for (let x = 0; x < w; x += 1) b.put(x, Y(80) + Math.round(Math.sin(x * 0.2) * 1.2), hex('#ffffff'));
  parasol(b, M(110), Y(88), Y(66), S(14));
  // os coqueiros, um de cada lado
  palm(b, L(92), Y(86), Y(20), -14, 1.35);
  palm(b, R(332), Y(86), Y(26), 16, 1.2);
  // o quiosque: os postes de eucalipto e o teto de sapê
  for (const px of [L(22), M(102), M(320), R(402)]) {
    b.rect(px, Y(10), S(5), floor - Y(10), hex('#8a5e34'));
    b.rect(px, Y(10), 1, floor - Y(10), hex('#c8945a'));
    b.rect(px + S(5) - 1, Y(10), 1, floor - Y(10), hex('#4a2e14'));
    for (let y = Y(20); y < floor; y += S(16)) b.rect(px, y, S(5), 1, hex('#5a3a1a'));
  }
  b.rect(0, Y(8), w, S(4), hex('#6a4220'));
  b.rect(0, Y(8), w, 1, hex('#b07a40'));
  thatch(b, r, 0, w, 0, S(9));
  bulbString(b, L(24), M(104), Y(13), S(5), S(8));
  bulbString(b, M(322), R(404), Y(13), S(5), S(8));
  paintedSign(b, M(326), Y(26), S(70), S(18), 'QUIOSQUE', { bg: '#2a6ab8', fg: '#fff8e0', edge: '#0e2a4a', sub: 'AGUA DE COCO', subFg: '#ffe08a' });
  b.line(M(332), Y(14), M(332), Y(26), hex('#c8a46a'));
  b.line(M(390), Y(14), M(390), Y(26), hex('#c8a46a'));
  // o deque de madeira clara: as tábuas de frente, com as emendas desencontradas
  {
    let y = floor;
    let row = 0;
    while (y < h) {
      const t = (y - floor) / (h - floor);
      const bh = Math.max(3, Math.round((4 + t * 9) * g.u));
      const off = (row * 37) % 53;
      for (let yy = y; yy < Math.min(h, y + bh); yy += 1) {
        for (let x = 0; x < w; x += 1) {
          // (versão 2.38: as emendas das tábuas acompanham a perspectiva)
          const jx = groundOf(g).x(x, yy) + off;
          const jw = 110 * g.u;
          const joint = (((jx / jw) % 1) + 1) % 1 < 0.9 / (jw * Math.max(0.35, groundOf(g).k(yy)));
          const k = yy - y;
          const c = k === 0 ? hex('#5a3a1e') : k === 1 ? hex('#e8c494') : joint ? hex('#6a4626') : ramp(pal('#8a6238', '#a87c4c', '#c49a64', '#dcb47e'), 0.62 - t * 0.15 + Math.sin(x * 0.07 + row * 2.3) * 0.08, x, yy);
          b.put(x, yy, c);
        }
      }
      y += bh;
      row += 1;
    }
  }
  b.rect(0, floor, w, S(2), hex('#5a3a1e'));
  cooler(b, L(28), Y(124), S(26));
  surfboard(b, L(62), Y(126), Y(70));
  for (let k = 0; k < 5; k += 1) {
    const cx = R(370) + (k % 3) * S(6);
    const cy = Y(124) - Math.floor(k / 3) * S(5);
    b.ellipse(cx, cy, S(3), S(3), hex(k % 2 ? '#5aa83a' : '#4a9a2e'));
    b.put(cx - 1, cy - 1, hex('#9ad86a'));
  }
  plasticChair(b, R(388), Y(96));
}

function lightsPraia(g) {
  const { M, Y, u } = g;
  return {
    ambient: [0.94, 0.93, 0.9],
    lights: [{ x: M(268), y: Y(16), r: 320 * u, c: [1, 0.95, 0.8], k: 0.3, sy: 0.6 }],
  };
}

function finishPraia(raw, g) {
  const { M, Y, u } = g;
  halo(raw, M(268), Y(16), 34 * u, hex('#fff4c8'), 0.5, 1);
}

// --- a praça do coreto --------------------------------------------------------

/** A copa da árvore: bolotas de folha em três tons, a de cima pegando o sol. */
function canopy(b, r, cx, cy, rx, ry, n) {
  for (let i = 0; i < n; i += 1) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const rr = 4 + r() * 6;
    b.ellipse(x, y, rr, rr * 0.8, hex('#1e5a26'));
    b.ellipse(x - 1, y - 1, rr * 0.8, rr * 0.6, hex('#2e7a32'));
    b.ellipse(x - 2, y - 2, rr * 0.45, rr * 0.35, hex('#5aa84a'));
    if (r() < 0.3) b.ellipse(x - 2, y - 3, rr * 0.2, rr * 0.15, hex('#9ad86a'));
  }
}

/** A igreja colonial: a fachada branca com as molduras amarelas, a porta azul e o relógio. */
function church(b, x, base, wd) {
  const top = base - 46;
  const W = hex('#f4f0e4');
  const Ysh = hex('#e8b830');
  const Bl = hex('#2a5aa8');
  b.rect(x - wd / 2, top, wd, base - top, W);
  b.rect(x - wd / 2, top, 2, base - top, Ysh);
  b.rect(x + wd / 2 - 2, top, 2, base - top, Ysh);
  b.rect(x - wd / 2, top, wd, 2, Ysh);
  // o frontão curvo
  for (let k = 0; k < 10; k += 1) {
    const half = Math.round((wd / 2 - 4) * Math.sqrt(1 - (k / 10) ** 2));
    b.rect(x - half, top - 1 - k, half * 2, 1, W);
    b.put(x - half, top - 1 - k, Ysh);
    b.put(x + half - 1, top - 1 - k, Ysh);
  }
  b.rect(x - 1, top - 16, 2, 6, hex('#3a3a3a'));
  b.rect(x - 3, top - 14, 6, 1, hex('#3a3a3a'));
  // o relógio no frontão e a porta azul em arco
  b.ellipse(x, top - 2, 4, 4, hex('#ffffff'));
  b.ellipse(x, top - 2, 4.6, 4.6, Ysh, 0.5);
  b.line(x, top - 2, x, top - 5, hex('#2a2a2a'));
  b.line(x, top - 2, x + 2, top - 2, hex('#2a2a2a'));
  b.rect(x - 6, base - 18, 12, 18, Bl);
  b.ellipse(x, base - 18, 6, 4, Bl);
  b.rect(x, base - 20, 1, 20, hex('#1a3a78'));
  for (const wx of [x - wd / 2 + 8, x + wd / 2 - 14]) {
    b.rect(wx, base - 30, 6, 10, Bl);
    b.ellipse(wx + 3, base - 30, 3, 2, Bl);
    b.rect(wx - 1, base - 20, 8, 1, Ysh);
  }
  b.rect(x - wd / 2 - 2, base - 2, wd + 4, 2, hex('#c8c0b0'));
}

/** O coreto: o telhado em pagode, as colunas brancas, o guarda-corpo. */
function coreto(b, x, base, wd) {
  const top = base - 40;
  for (let k = 0; k < 12; k += 1) {
    const half = Math.round(wd / 2 - k * (wd / 26));
    b.rect(x - half, top + k, half * 2, 1, k < 2 ? hex('#a84a2a') : hex(k % 3 === 0 ? '#7a2e1a' : '#c85a34'));
  }
  b.rect(x - 1, top - 6, 2, 6, hex('#4a4a4a'));
  b.rect(x - wd / 2 - 2, top + 12, wd + 4, 2, hex('#ffffff'));
  for (let xx = -wd / 2; xx < wd / 2; xx += 4) b.ellipse(x + xx + 2, top + 15, 2, 2, hex('#f4f0e4'));
  for (let k = 0; k <= 4; k += 1) {
    const cx = Math.round(x - wd / 2 + 2 + k * ((wd - 4) / 4));
    b.rect(cx, top + 14, 2, base - top - 14, hex('#f4f0e4'));
    b.put(cx + 1, top + 14, hex('#b8b0a0'));
  }
  b.rect(x - wd / 2, base - 10, wd, 2, hex('#f4f0e4'));
  for (let xx = -wd / 2 + 2; xx < wd / 2; xx += 3) b.rect(x + xx, base - 8, 1, 6, hex('#d8d0c0'));
  b.rect(x - wd / 2 - 3, base - 2, wd + 6, 3, hex('#b8b0a0'));
}

/** O poste colonial (apagado de dia): a coluna verde-escura e a lanterna de vidro. */
function colonialLamp(b, x, top, base) {
  b.rect(x - 1, top + 10, 3, base - top - 10, hex('#1e3a26'));
  b.rect(x - 3, base - 6, 7, 6, hex('#1e3a26'));
  b.rect(x - 4, top, 9, 2, hex('#1e3a26'));
  b.rect(x - 3, top + 2, 7, 7, hex('#c8d8d8'));
  b.rect(x - 2, top + 3, 2, 5, hex('#f4fcfc'));
  b.rect(x - 4, top + 9, 9, 2, hex('#1e3a26'));
  b.rect(x, top - 3, 1, 3, hex('#1e3a26'));
}

/** O banco de praça: as ripas de madeira verde e os pés de ferro fundido. */
function parkBench(b, x, base, wd) {
  for (let k = 0; k < 3; k += 1) b.rect(x, base - 20 + k * 3, wd, 2, hex(k === 0 ? '#4aa85a' : '#2e8a42'));
  for (let k = 0; k < 2; k += 1) b.rect(x, base - 10 + k * 3, wd, 2, hex('#2e8a42'));
  b.rect(x, base - 20, wd, 1, hex('#8ad88a'));
  for (const lx of [x + 2, x + wd - 5]) {
    b.rect(lx, base - 21, 3, 21, hex('#1a1a1e'));
    b.put(lx + 1, base - 15, hex('#4a4a54'));
  }
  contact(b, x + wd / 2, base, wd * 0.6, 2, 0.45);
}

/** O carrinho de pipoca: a vitrine, o toldo listrado e as rodas. */
function popcornCart(b, x, base) {
  const wd = 30;
  b.rect(x - 2, base - 52, wd + 4, 6, hex('#e8261c'));
  for (let k = 0; k < wd + 4; k += 6) b.rect(x - 2 + k, base - 52, 3, 6, hex('#fcf8ec'));
  b.rect(x, base - 46, 1, 8, hex('#c8c8c8'));
  b.rect(x + wd - 1, base - 46, 1, 8, hex('#c8c8c8'));
  b.rect(x, base - 38, wd, 16, hex('#fff4c8'));
  for (let k = 0; k < 40; k += 1) b.put(x + 2 + ((k * 7) % (wd - 4)), base - 30 + ((k * 3) % 7), hex('#ffffff'));
  b.rect(x, base - 38, 3, 16, hex('#ffffff'), 0.6);
  b.rect(x, base - 22, wd, 14, hex('#e8261c'));
  pixelText(b, 'PIPOCA', x + Math.round((wd - textWidth('PIPOCA')) / 2), base - 18, hex('#fffbe8'));
  b.ellipse(x + 6, base - 4, 4, 4, hex('#1a1a1e'));
  b.ellipse(x + wd - 6, base - 4, 4, 4, hex('#1a1a1e'));
  b.ellipse(x + 6, base - 4, 1.5, 1.5, hex('#a8a8a8'));
  b.ellipse(x + wd - 6, base - 4, 1.5, 1.5, hex('#a8a8a8'));
  contact(b, x + wd / 2, base, wd * 0.7, 2, 0.45);
}

/** O pombo ciscando no chão. */
function pigeon(b, x, y, dir = 1) {
  b.ellipse(x, y, 3, 2, hex('#8a8e9a'));
  b.ellipse(x + dir * 3, y - 2, 1.6, 1.6, hex('#9a9eaa'));
  b.put(x + dir * 3, y - 1, hex('#5aa88a'));
  b.put(x + dir * 4, y - 2, hex('#e8a040'));
  b.put(x + dir * 3, y - 3, hex('#1a1a1e'));
  b.put(x - dir * 3, y - 1, hex('#5a5e6a'));
  b.put(x, y + 2, hex('#d87a5a'));
}

/** O céu grande da praça, com o sol à direita. */
function skyPraca(b, G, g) {
  daySky(b, 0, 0, g.w, g.Y(84));
  sun(G, g.M(290), g.Y(10), g.S(6));
}

function scenePraca(b, G, r, g) {
  const { w, h, M, L, R, Y, S, floor } = g;
  skyPraca(b, G, g);
  cloud(b, r, M(150), Y(14), S(40), S(7));
  cloud(b, r, M(260), Y(30), S(30), S(5));
  // a igreja lá no fundo, atrás do rival (o frontão com o relógio por cima da cabeça dele)
  church(b, M(211), Y(86), S(86));
  // o coreto à esquerda e as árvores emoldurando
  coreto(b, M(116), Y(88), S(56));
  for (const tx of [L(40), R(380)]) {
    b.rect(tx, Y(30), S(7), floor - Y(30), hex('#6a4a2e'));
    b.rect(tx, Y(30), 1, floor - Y(30), hex('#9a7448'));
    b.rect(tx + S(7) - 1, Y(30), 1, floor - Y(30), hex('#3a2614'));
  }
  canopy(b, r, L(30), Y(12), S(64), S(28), 54);
  canopy(b, r, R(392), Y(16), S(64), S(30), 54);
  colonialLamp(b, M(70), Y(40), floor);
  colonialLamp(b, M(352), Y(40), floor);
  // o gramado, a sombra das árvores nele e o chão de pedra portuguesa da praça
  for (let y = Y(84); y < floor; y += 1) for (let x = 0; x < w; x += 1) b.put(x, y, ramp(pal('#3a8a3a', '#4aa04a', '#62b85a', '#7acc6a'), 0.5 + Math.sin(x * 0.7 + y * 1.3) * 0.15, x, y));
  calcadao(b, 0, floor, w, h, g);
  b.rect(0, floor, w, S(2), hex('#a8a296'));
  b.rect(0, floor, w, 1, hex('#e8e4d8'));
  // a sombra rendada das copas no chão, nos cantos
  for (const [cx, cy] of [
    [L(40), floor + S(16)],
    [R(380), floor + S(18)],
  ]) {
    b.light(cx - S(70), cy - S(14), S(140), S(30), BLACK, (x, y) => {
      const d = Math.hypot((x - cx) / (70 * g.u), (y - cy) / (14 * g.u));
      const leaf = Math.sin(x * 0.6) * Math.sin(y * 0.9 + x * 0.2) > -0.2;
      return d < 1 && leaf ? 0.26 * (1 - d * 0.5) : 0;
    });
  }
  parkBench(b, L(20), Y(124), S(48));
  popcornCart(b, R(354), Y(128));
  pigeon(b, L(84), Y(132), 1);
  pigeon(b, L(96), Y(136), -1);
  pigeon(b, R(338), Y(134), 1);
}

function lightsPraca(g) {
  const { M, Y, u } = g;
  return {
    ambient: [0.93, 0.92, 0.88],
    lights: [{ x: M(290), y: Y(10), r: 320 * u, c: [1, 0.95, 0.8], k: 0.3, sy: 0.6 }],
  };
}

function finishPraca(raw, g) {
  const { M, Y, u } = g;
  halo(raw, M(290), Y(10), 30 * u, hex('#fff4c8'), 0.45, 1);
}

// ---------------------------------------------------------------------------
// As salas
// ---------------------------------------------------------------------------

const ROOMS = {
  // versão 2.30: os cenários de dia
  landcalcada: { paint: sceneCalcada, lights: lightsCalcada, finish: finishCalcada, bands: 8, haze: null },
  landpraia: { paint: scenePraia, lights: lightsPraia, finish: finishPraia, bands: 8, haze: null },
  landpraca: { paint: scenePraca, lights: lightsPraca, finish: finishPraca, bands: 8, haze: null },
  landroom: { paint: sceneBoteco, lights: lightsBoteco, finish: finishBoteco, bands: 8, haze: ['#b8b098', 0.1] },
  landsinuca: { paint: sceneSinuca, lights: lightsSinuca, finish: finishSinuca, bands: 8, haze: ['#9a7ab8', 0.22] },
  landbicho: { paint: sceneBicho, lights: lightsBicho, finish: finishBicho, bands: 8, haze: ['#a88878', 0.12] },
  landnoite: { paint: sceneNoite, lights: lightsNoite, finish: finishNoite, bands: 9, haze: null },
};

export const LAND_ROOM_IDS = Object.freeze(Object.keys(ROOMS));

/** Pinta a sala `name` numa grade de `w` × `h` pixels (a cena da mesa deitada). */
export function paintLandRoom(name, w, h, seed = 1955) {
  const room = ROOMS[name];
  const width = Math.max(8, Math.round(w));
  const height = Math.max(8, Math.round(h));
  const b = buffer(width, height);
  const G = glowLayer(b);
  const g = geometry(width, height);
  const r = rngOf(seed);
  room.paint(b, G, r, g);
  if (room.haze) haze(b, 0, 0, width, Math.round(height * 0.6), room.haze[0], room.haze[1], seed % 7);
  const { ambient, lights } = room.lights(g);
  relight(b, lights, { ambient, mask: G.mask, bands: room.bands });
  room.finish?.(b, g);
  // a vinheta: escurece as quinas e o chão embaixo da mesa
  b.light(0, 0, width, height, BLACK, (x, y) => vignetteAt(x, y, width, height));
  return { w: width, h: height, data: b.data };
}

/** O quanto a vinheta escurece o pixel (0: nada), em pontilhado. */
function vignetteAt(x, y, width, height) {
  const dx = (x - width / 2) / (width * 0.62);
  const dy = (y - height * 0.4) / (height * 0.85);
  const t = Math.max(0, Math.hypot(dx, dy) - 0.5) * 1.5;
  return t > bayer(x, y) * 0.2 ? t : 0;
}

// ---------------------------------------------------------------------------
// Versão 2.31: o céu e o mar que se mexem nas salas de dia
// ---------------------------------------------------------------------------

/** O fundo de cada sala de dia: só o que fica atrás das nuvens (o céu, o sol e o mar). */
const DAY_BACKS = {
  landcalcada: skyCalcada,
  landpraia: (b, G, g) => {
    skyPraia(b, G, g);
    seaPraia(b, G, g, false);
  },
  landpraca: skyPraca,
};

/** As duas camadas de cristas do mar: o período (px), a velocidade (px/s), o sentido e a cor. */
export const WAVE_LAYERS = Object.freeze([
  Object.freeze({ period: 104, speed: 4, dir: -1, len: [4, 8], color: '#e8f8fc', seed: 3 }),
  Object.freeze({ period: 78, speed: 2.2, dir: 1, len: [2, 6], color: '#c8eef6', seed: 9 }),
]);

/** Uma faixa que dá a volta: pinta o ladrilho de `period` px e repete até cobrir `period + w`. */
function tiled(tile, period, w) {
  const out = buffer(period + w, tile.h);
  for (let y = 0; y < tile.h; y += 1) {
    for (let x = 0; x < out.w; x += 1) {
      const i = (y * tile.w + (x % period)) * 4;
      const o = (y * out.w + x) * 4;
      out.data[o] = tile.data[i];
      out.data[o + 1] = tile.data[i + 1];
      out.data[o + 2] = tile.data[i + 2];
      out.data[o + 3] = tile.data[i + 3];
    }
  }
  return out;
}

/**
 * A sala de dia em camadas (components/BotecoBackdrop.jsx), de trás para a frente:
 *   back    o céu, o sol e o mar liso, sem a vinheta
 *   clouds  as nuvens numa faixa que dá a volta (`period` px): anda devagar para a esquerda
 *   waves   (praia) as cristas do mar, duas faixas andando em sentidos opostos, a partir de `y`
 *   shade   a vinheta sozinha (preto com transparência), por cima do céu e do mar que andam
 *   front   a sala inteira, já com a luz e a vinheta, com buraco onde é céu ou mar
 * A cena é a mesma da pintura parada (paintLandRoom): só as nuvens e as cristas saem dela.
 */
export function paintDayLayers(name, w, h, seed = 1955) {
  const room = ROOMS[name];
  const width = Math.max(8, Math.round(w));
  const height = Math.max(8, Math.round(h));
  const g = geometry(width, height);
  const { ambient, lights } = room.lights(g);
  const develop = (b, G) => {
    relight(b, lights, { ambient, mask: G.mask, bands: room.bands });
    room.finish?.(b, g);
  };
  // a sala inteira, sem as nuvens (vão para a lista) e com o mar liso
  const clouds = [];
  const full = buffer(width, height);
  const Gf = glowLayer(full);
  cloudSink = clouds;
  seaLayered = true;
  try {
    room.paint(full, Gf, rngOf(seed), g);
  } finally {
    cloudSink = null;
    seaLayered = false;
  }
  develop(full, Gf);
  // o fundo sozinho, com a mesma luz: onde a sala inteira ficou igual a ele, é céu (ou mar)
  const back = buffer(width, height);
  const Gb = glowLayer(back);
  DAY_BACKS[name](back, Gb, g);
  develop(back, Gb);
  const shade = buffer(width, height);
  const fd = full.data;
  const bd = back.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const v = vignetteAt(x, y, width, height);
      if (v > 0) shade.put(x, y, BLACK, Math.min(1, v) * 0.9);
      if (bd[i + 3] === 255 && fd[i] === bd[i] && fd[i + 1] === bd[i + 1] && fd[i + 2] === bd[i + 2]) fd[i + 3] = 0;
    }
  }
  full.light(0, 0, width, height, BLACK, (x, y) => (fd[(y * width + x) * 4 + 3] ? vignetteAt(x, y, width, height) : 0));
  // as nuvens: um ladrilho da largura da tela (cada uma pintada também uma volta antes e depois)
  const period = width;
  let ch = 1;
  for (const c of clouds) ch = Math.max(ch, Math.ceil(c.cy + c.ht * 1.2) + 2);
  const tile = buffer(period, Math.min(height, ch));
  for (const c of clouds) for (const dx of [-period, 0, period]) drawCloud(tile, c, dx);
  relight(tile, lights, { ambient, bands: room.bands });
  const layers = {
    back: { w: width, h: height, data: back.data },
    clouds: { ...pick(tiled(tile, period, width)), period, speed: 1.2 },
    waves: [],
    shade: { w: width, h: height, data: shade.data },
    front: { w: width, h: height, data: full.data },
  };
  // as cristas do mar (só a praia tem mar): tracinhos sorteados por linha, mais compridos e mais
  // juntos perto da areia
  if (name === 'landpraia') {
    const y0 = g.Y(60) + 1;
    const y1 = g.Y(80);
    for (const wl of WAVE_LAYERS) {
      const wt = buffer(wl.period, y1 - y0);
      const r = rngOf(wl.seed * 7919 + width);
      for (let y = 0; y < wt.h; y += 1) {
        const t = y / Math.max(1, wt.h - 1);
        const n = t > 0.55 ? 2 : 1;
        for (let k = 0; k < n; k += 1) {
          const x = Math.floor(r() * wl.period);
          const len = Math.round(wl.len[0] + (wl.len[1] - wl.len[0]) * (0.4 * r() + 0.6 * t));
          for (let j = 0; j < len; j += 1) wt.put((x + j) % wl.period, y, hex(wl.color), j === 0 || j === len - 1 ? 0.6 : 1);
        }
      }
      relight(wt, lights, { ambient, bands: room.bands, oy: -y0 });
      layers.waves.push({ ...pick(tiled(wt, wl.period, width)), y: y0, period: wl.period, speed: wl.speed, dir: wl.dir });
    }
  }
  return layers;
}

const pick = (b) => ({ w: b.w, h: b.h, data: b.data });

/**
 * Versão 2.13: o que o shader da mesa (components/FxLayer.jsx) acende por cima de cada sala, nas
 * mesmas coordenadas da pintura (px da cena): as fontes vivas (tipo: 0 firme, 1 neon, 2 vela,
 * 3 lâmpada, 4 facho com poeira, 5 coração), a fumaça (cor, quanto e a faixa onde ela fica),
 * o luar da janela e a persiana. `candles`: a mesa das velas (sem a lâmpada do teto).
 */
export function roomFx(name, w, h, { candles = false } = {}) {
  const g = geometry(w, h);
  const { M, L, R, Y, S, u, cx } = g;
  const lights = [];
  // versão 2.30: de dia não tem a lâmpada (nem o facho com poeira dela)
  const day = DAY_ROOMS.includes(name);
  if (day) {
    // sem lâmpada e sem velas
  } else if (!candles) lights.push({ x: cx, y: Y(16), r: 150 * u, c: [1, 0.82, 0.56], k: 0.5, kind: 4 });
  else
    for (const c of landCandleSpots(w * 2, h * 2)) lights.push({ x: c.x / 2, y: (c.y - CANDLE_FLAME * c.s) / 2, r: 90 * u, c: [1, 0.6, 0.26], k: 0.75, kind: 2 });
  const fx = { lights, haze: null, hazeBand: null, moon: null, stripe: null };
  // versão 2.30: os cenários de dia (o sol, o brilho na água, a luz pela copa das árvores)
  if (name === 'landcalcada') fx.sun = { x: L(128), y: Y(7), r: S(5), a: 0.8 };
  if (name === 'landpraia') {
    fx.sun = { x: M(268), y: Y(16), r: S(7), a: 0.9 };
    fx.glint = { y0: Y(60), y1: Y(80), x: M(268), a: 0.9 };
    // as faíscas ficam na água: nem no tampo da mesa nem em cima do rival sentado
    const c = landCorners(w * 2, h * 2);
    fx.glintMask = { x0: c.farL / 2 - S(2), x1: c.farR / 2 + S(2), y: c.yFar / 2 - S(2), half: w * 0.1 };
  }
  if (name === 'landpraca') {
    fx.sun = { x: M(290), y: Y(10), r: S(6), a: 0.8 };
    fx.dapple = { y0: Y(84), y1: Y(110), a: 0.16 };
  }
  if (name === 'landsinuca') {
    const ns = g.k * 3;
    const nw = textWidth('SINUCA') * ns;
    lights.push(
      { x: M(258) + nw / 2, y: Y(20), r: 80 * u, c: [1, 0.24, 0.62], k: 0.85, kind: 1 },
      { x: M(258) + nw + S(12), y: Y(20), r: 34 * u, c: [0.25, 0.8, 1], k: 0.8, kind: 1 },
      { x: L(41), y: Y(68), r: 64 * u, c: [1, 0.95, 0.75], k: 0.8, kind: 4 },
      { x: R(383), y: Y(64), r: 64 * u, c: [1, 0.95, 0.75], k: 0.8, kind: 4 },
      { x: M(128), y: Y(34), r: 40 * u, c: [1, 0.78, 0.45], k: 0.6, kind: 3 },
      { x: L(49), y: Y(36), r: 18 * u, c: [1, 0.15, 0.1], k: 0.6, kind: 1 },
    );
    fx.haze = { c: [0.62, 0.48, 0.78], a: 0.75 };
  } else if (name === 'landbicho') {
    lights.push(
      { x: R(349), y: Y(90), r: 46 * u, c: [0.75, 1, 0.6], k: 0.7, kind: 4 },
      { x: L(80), y: Y(62), r: 50 * u, c: [1, 0.66, 0.34], k: 0.7, kind: 3 },
      { x: M(160), y: Y(10), r: 30 * u, c: [1, 0.86, 0.6], k: 0.5, kind: 4 },
      { x: M(294), y: Y(10), r: 46 * u, c: [1, 0.86, 0.6], k: 0.5, kind: 4 },
    );
    fx.haze = { c: [0.75, 0.6, 0.55], a: 0.5 };
    fx.stripe = { x0: L(10), y0: Y(10), x1: M(180), a: 0.32 };
  } else if (name === 'landnoite') {
    for (let k = 0; k < 4; k += 1) lights.push({ x: L(34) + (k + 0.5) * S(16) - S(3) + S(4.5), y: Y(68) - S(8), r: 14 * u, c: [1, 0.12, 0.2], k: 0.7, kind: 5 });
    fx.moon = { x: cx, y: Y(30), r: S(17), a: 0.32 };
    fx.haze = { c: [0.45, 0.38, 0.75], a: 0.9 };
    fx.hazeBand = [g.floor - 14 * u, h];
  } else if (!day) {
    lights.push({ x: M(336), y: Y(22), r: 60 * u, c: [1, 0.82, 0.5], k: 0.7, kind: 3 }, { x: M(283), y: Y(12), r: 46 * u, c: [1, 0.86, 0.45], k: 0.45, kind: 0 });
    fx.haze = { c: [0.7, 0.66, 0.58], a: 0.45 };
  }
  return fx;
}
