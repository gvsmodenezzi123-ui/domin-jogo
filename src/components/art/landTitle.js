/**
 * Versão 2.11: a tela inicial deitada, pintada do zero (500 × 225 px, o palco de 1000 × 450 do
 * LandStage). Meia-noite no boteco: a lâmpada pendurada sobre a mesa de dominó é a luz forte da
 * cena; o resto vem do neon do BOTECO, da TV ligada no futebol, da estante de garrafas acesa por
 * trás e da janela com chuva. Quem te espera senta do outro lado da mesa (o busto é HTML, entre
 * as duas camadas desta pintura):
 *   paintTitleBack:  a sala (parede, letreiro iluminado, relógio, placa do fiado, estante, TV,
 *                    janela, engradados, chão);
 *   paintTitleFront: a mesa (feltro, aros, as pedras de pé do rival, o jogo correndo, a garrafa,
 *                    os copos e o cinzeiro), por cima do busto.
 * As medidas em que o HTML encosta (a beirada, o meio da mesa, o bulbo) ficam em TITLE_GEO.
 */
import { paintKit } from './botecoScene.js';
import { landKit } from './landScenes.js';
import { glowLayer, halo, relight, shifted, vignetteBox } from './lightPass.js';
import { pixelText, textWidth } from './pixelFont.js';

const { hex, mixRgb, shift, rngOf, bayer, buffer, plank, felt, beerGlass, ashtray, bottle, mug, rainyWindow } = paintKit;
const { plaster, woodWall, floorBoards, crate } = landKit;

export const TITLE_W = 500;
export const TITLE_H = 225;
/**
 * A sobra pintada em volta do palco (px da pintura): o teto e o chão para as telas mais altas
 * que 16:9 (até 16:10), as paredes para as mais largas. O palco continua em 0..500 × 0..225.
 */
export const TITLE_PAD = Object.freeze({ x: 24, y: 44 });
const PX = TITLE_PAD.x;
const PY = TITLE_PAD.y;
const X0 = -PX;
const X1 = TITLE_W + PX;
const Y1 = TITLE_H + PY;
/** rail: a beirada de lá da mesa (o busto é cortado ali); cx: o meio da mesa e da lâmpada. */
export const TITLE_GEO = Object.freeze({ rail: 150, cx: 360, bulbY: 44, ember: [466, 200] });

const INK = hex('#0b0705');
const BLACK = [0, 0, 0];

const AMBIENT = [0.17, 0.18, 0.26];
const LIGHTS = [
  // a pendente sobre a mesa (forte no cone) e a mancha dela no feltro
  { x: 360, y: 44, r: 235, c: [1, 0.84, 0.58], k: 1.3, cone: 0.6, out: 0.34, sy: 0.92 },
  { x: 360, y: 182, r: 118, c: [1, 0.88, 0.66], k: 0.95, sy: 2.1 },
  // o pescoço de ganso que ilumina o letreiro
  { x: 112, y: 12, r: 128, c: [1, 0.86, 0.62], k: 0.8, cone: 1.05, out: 0.12 },
  // a estante acesa por trás
  { x: 346, y: 96, r: 175, c: [1, 0.64, 0.3], k: 0.34 },
  // o neon rosa
  { x: 292, y: 15, r: 74, c: [1, 0.32, 0.55], k: 0.6 },
  // a TV
  { x: 424, y: 26, r: 86, c: [0.45, 0.78, 1], k: 0.5 },
  // a janela (a rua molhada)
  { x: 500, y: 70, r: 125, c: [0.42, 0.56, 0.95], k: 0.5 },
  // o resto do salão, fora da tela, à esquerda
  { x: -20, y: 150, r: 190, c: [1, 0.78, 0.55], k: 0.22 },
];

const TABLE_WOOD = { hi: hex('#b07a46'), mid: hex('#7e4c26'), lo: hex('#4e2d15'), deep: hex('#2b170b') };
const BAR_WOOD = { hi: hex('#8e5c34'), mid: hex('#62391c'), lo: hex('#3c2210'), deep: hex('#1e1007') };
const WAINSCOT = { hi: hex('#86562f'), mid: hex('#603c20'), lo: hex('#3e2614'), deep: hex('#20130a') };
const TITLE_FELT = { hi: hex('#47a062'), mid: hex('#34804c'), lo: hex('#215c36'), deep: hex('#143e24') };

// ---------------------------------------------------------------------------
// Peças da sala
// ---------------------------------------------------------------------------

/** Tijolo aparecendo onde o reboco caiu (mancha irregular, com a borda do reboco quebrado). */
function bricks(b, r, cx, cy, rx, ry) {
  const tones = [hex('#93503a'), hex('#7e402c'), hex('#a35c40'), hex('#6e3826')];
  const wob = Array.from({ length: 16 }, () => 0.82 + r() * 0.3);
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y += 1) {
    for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x += 1) {
      const a = Math.atan2(y - cy, x - cx);
      const lim = wob[Math.floor(((a + Math.PI) / (2 * Math.PI)) * 16) % 16];
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > lim + 0.14) continue;
      if (d > lim) {
        b.put(x, y, hex('#7d9483'), 0.7); // a borda do reboco quebrado pega luz
        continue;
      }
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const mortar = y % 4 === 0 || (x + off) % 8 === 0;
      const id = (Math.floor((x + off) / 8) * 31 + row * 17) % tones.length;
      b.put(x, y, mortar ? hex('#5e5448') : shift(tones[id], (x * 7 + y * 3) % 5 === 0 ? -10 : 0));
    }
  }
}

/** O relógio de parede (aro vermelho de propaganda), marcando quase meia-noite. */
function wallClock(b, cx, cy, R) {
  b.ellipse(cx + 1, cy + 2, R, R, BLACK, 0.45);
  b.ellipse(cx, cy, R, R, hex('#7a1a12'));
  b.ellipse(cx, cy, R - 1, R - 1, hex('#c4301f'));
  b.ellipse(cx - 1, cy - 1, R - 2, R - 2, hex('#d84a32'));
  b.ellipse(cx, cy, R - 3, R - 3, hex('#efe7cf'));
  for (let k = 0; k < 12; k += 1) {
    const a = (k * Math.PI) / 6;
    const big = k % 3 === 0;
    const px = cx + Math.sin(a) * (R - 5);
    const py = cy - Math.cos(a) * (R - 5);
    b.put(px, py, INK);
    if (big) b.put(px + (k === 9 ? 1 : k === 3 ? -1 : 0), py + (k === 0 ? 1 : k === 6 ? -1 : 0), INK);
  }
  const hand = (turns, len, c) => {
    const a = turns * 2 * Math.PI;
    b.line(cx, cy, cx + Math.sin(a) * len, cy - Math.cos(a) * len, c);
  };
  hand((11 + 52 / 60) / 12, R - 8, INK); // as horas: quase meia-noite
  hand(52 / 60, R - 5, INK);
  hand(0.2, R - 5, hex('#c4301f'));
  b.put(cx, cy, hex('#c9a24a'));
  // o vidro
  b.line(cx - R + 5, cy - 3, cx - 3, cy - R + 5, hex('#ffffff'), 0.45);
}

/** Placa de madeira pregada na parede, letreiro pintado à mão em branco. */
function woodSign(b, r, x, y, w, lines) {
  const h = lines.length * 7 + 3;
  b.rect(x + 1, y + 2, w, h, BLACK, 0.45);
  plank(b, r, x, y, w, h, { tone: { hi: hex('#c08a50'), mid: hex('#9a6634'), lo: hex('#6e4420'), deep: hex('#3a2210') } });
  b.rect(x, y, w, 1, hex('#d8a468'));
  b.rect(x, y + h - 1, w, 1, hex('#4a2c12'));
  lines.forEach((t, i) => pixelText(b, t, x + Math.round((w - textWidth(t)) / 2), y + 2 + i * 7, hex('#f4ecd8')));
  // tinta gasta
  for (let i = 0; i < w / 3; i += 1) b.put(x + 1 + r() * (w - 2), y + 1 + r() * (h - 2), hex('#9a6634'), 0.5);
  b.put(x + 2, y + 2, hex('#d9c27a'));
  b.put(x + w - 3, y + 2, hex('#d9c27a'));
}

/** Luminária de pescoço de ganso presa na viga, virada para o letreiro. */
function gooseneck(b, G, x, y0) {
  b.rect(x - 1, 6, 2, y0 - 6, hex('#2a2e2c'));
  b.rect(x - 1, 6, 1, y0 - 6, hex('#6a706c'));
  for (let k = 0; k < 6; k += 1) {
    const half = 3 + k * 1.6;
    b.rect(x - half, y0 + k, half * 2, 1, k === 0 ? hex('#6f9a7e') : k === 5 ? hex('#1a2a20') : mixRgb(hex('#3d6a50'), hex('#24402f'), k / 5));
    b.put(x - half, y0 + k, hex('#7fae8e'));
  }
  G.rect(x - 9, y0 + 6, 18, 1, hex('#fff4c8'));
  G.rect(x - 6, y0 + 7, 12, 1, hex('#ffd98a'));
}

/** O neon da casa: BOTECO em rosa e a caneca em âmbar (o halo vem depois da luz). */
function neonSign(b, G, x, y) {
  // os suportes do neon
  b.rect(x - 2, y - 2, 1, 14, hex('#3a3a3a'));
  b.rect(x + 66, y - 2, 1, 14, hex('#3a3a3a'));
  const tube = hex('#ff4f86');
  const core = hex('#ffd2e2');
  // o tubo, com o miolo mais claro
  pixelText(b, 'BOTECO', x, y, tube, { s: 2, put: (px, py) => G.put(px, py, (px - x) % 2 === 0 && (py - y) % 2 === 0 ? core : tube) });
  // a caneca
  const amber = hex('#ffb347');
  const mx = x + 52;
  G.rect(mx, y + 1, 1, 9, amber);
  G.rect(mx + 8, y + 1, 1, 9, amber);
  G.rect(mx, y + 9, 9, 1, amber);
  G.rect(mx, y + 1, 9, 1, hex('#fff2d0'));
  G.rect(mx + 9, y + 3, 3, 1, amber);
  G.rect(mx + 11, y + 3, 1, 4, amber);
  G.rect(mx + 9, y + 6, 3, 1, amber);
  G.rect(mx + 2, y + 4, 1, 4, hex('#ffe08a'));
  G.rect(mx + 5, y + 3, 1, 4, hex('#ffe08a'));
}

/** A TV de tubo pendurada no suporte, passando o futebol. */
function crtTV(b, G, x, y) {
  const W = 48;
  const H = 34;
  b.rect(x + 22, 6, 4, y - 6, hex('#26282a'));
  b.rect(x + 22, 6, 1, y - 6, hex('#5a5e60'));
  b.rect(x + 14, y - 2, 20, 3, hex('#26282a'));
  b.rect(x + 1, y + 2, W, H, BLACK, 0.5);
  b.rect(x, y, W, H, hex('#6e6a5e'));
  b.rect(x, y, W, 1, hex('#9c978a'));
  b.rect(x, y, 1, H, hex('#8a8578'));
  b.rect(x, y + H - 1, W, 1, hex('#3a382f'));
  b.rect(x + W - 1, y, 1, H, hex('#3a382f'));
  // a tela (abaulada: cantos comidos)
  const sx = x + 4;
  const sy = y + 4;
  const sw = 34;
  const sh = 25;
  b.rect(sx - 1, sy - 1, sw + 2, sh + 2, hex('#1a1a18'));
  for (let yy = 0; yy < sh; yy += 1) {
    for (let xx = 0; xx < sw; xx += 1) {
      const corner = (xx < 2 || xx > sw - 3) && (yy < 2 || yy > sh - 3);
      if (corner && (xx === 0 || xx === sw - 1 || yy === 0 || yy === sh - 1)) continue;
      const stripe = Math.floor((xx + yy * 0.4) / 5) % 2;
      let c = stripe ? hex('#4fb060') : hex('#43a054');
      if (yy < 5) c = hex('#1c3a6a'); // o alto da arquibancada
      if (yy === 5) c = hex('#e8e8e8');
      if (xx === 17 && yy > 5) c = hex('#dff5e0'); // linha do meio
      if (Math.abs(Math.hypot(xx - 17, (yy - 15) * 1.2) - 5) < 0.6 && yy > 5) c = hex('#dff5e0');
      if (yy % 2 === 1) c = shift(c, -18); // linhas do tubo
      G.put(sx + xx, sy + yy, c);
    }
  }
  // os jogadores e a bola
  for (const [px, py, c] of [
    [7, 12, '#e8332a'],
    [11, 18, '#e8332a'],
    [22, 10, '#f2f2f2'],
    [25, 19, '#f2f2f2'],
    [14, 14, '#e8332a'],
    [28, 13, '#f2f2f2'],
  ]) {
    G.rect(sx + px, sy + py, 1, 2, hex(c));
  }
  G.put(sx + 19, sy + 16, hex('#ffffff'));
  // o placar
  G.rect(sx + 1, sy + 1, 15, 7, hex('#0b0b0b'));
  pixelText(b, '1-0', sx + 3, sy + 2, hex('#ffd24a'), { put: G.put });
  // o brilho do vidro
  for (let k = 0; k < 8; k += 1) G.put(sx + 22 + k, sy + 2 + Math.floor(k / 3), hex('#ffffff'), 0.35);
  // os botões
  b.rect(x + 40, y + 6, 5, 5, hex('#2a2824'));
  b.put(x + 41, y + 7, hex('#8a8578'));
  b.rect(x + 40, y + 14, 5, 5, hex('#2a2824'));
  b.put(x + 41, y + 15, hex('#8a8578'));
  for (let k = 0; k < 4; k += 1) b.rect(x + 40, y + 23 + k * 2, 5, 1, hex('#3a382f'));
  G.put(x + 42, y + H - 4, hex('#ff3a2a'));
}

/**
 * A estante de garrafas atrás do rival: o fundo aceso em âmbar (brilha por si), três prateleiras
 * de vidro com as garrafas, os montantes e a cornija.
 */
function backBar(b, r, G, x0, x1, top, base) {
  const rows = [
    [top + 8, top + 34],
    [top + 37, top + 66],
    [top + 69, top + 100],
  ];
  const cx = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  const deep = hex('#2e1608');
  const warm = hex('#b4642a');
  const hot = hex('#e3953f');
  for (const [y0, y1] of rows) {
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0 + 6; x < x1 - 6; x += 1) {
        const t = (y - y0) / (y1 - y0);
        const v = (1 - Math.abs(x - cx) / half) * 0.55 + (1 - t) * 0.6;
        const q = Math.round(v * 4 + bayer(x, y) - 0.5) / 4;
        G.put(x, y, q > 0.75 ? hot : q > 0.4 ? warm : mixRgb(deep, warm, q * 1.6));
      }
    }
  }
  // o que fica na frente do fundo aceso NÃO brilha (é iluminado pela sala)
  const S = G.solid();
  // montantes do meio
  for (const mx of [Math.round(cx - half / 3), Math.round(cx + half / 3)]) {
    S.rect(mx, top + 8, 2, base - top - 8, BAR_WOOD.lo);
    S.rect(mx, top + 8, 1, base - top - 8, BAR_WOOD.mid);
  }
  // prateleiras e garrafas
  const kinds = [0, 3, 'mug', 1, 4, 2, 5, 0, 'mug', 3, 1, 4, 2, 5, 'mug', 0, 3, 1, 5, 2, 4];
  rows.forEach(([, y1], k) => {
    plank(S, r, x0 + 4, y1, x1 - x0 - 8, 3, { tone: BAR_WOOD });
    S.rect(x0 + 4, y1, x1 - x0 - 8, 1, hex('#e8b070'));
    let x = x0 + 9 + k * 3;
    let i = k * 5;
    while (x < x1 - 14) {
      const kind = kinds[i % kinds.length];
      i += 1;
      if (kind === 'mug') {
        mug(S, x, y1);
        x += 12;
      } else {
        x += bottle(S, r, x, y1, kind, 1.05) + 2 + Math.floor(r() * 3);
      }
    }
  });
  // montantes de fora e a cornija
  plank(S, r, x0, top, 6, base - top, { tone: BAR_WOOD, vertical: true });
  plank(S, r, x1 - 6, top, 6, base - top, { tone: BAR_WOOD, vertical: true });
  plank(S, r, x0 - 5, top, x1 - x0 + 10, 8, { tone: BAR_WOOD });
  S.rect(x0 - 5, top, x1 - x0 + 10, 1, BAR_WOOD.hi);
  S.rect(x0 - 5, top + 7, x1 - x0 + 10, 1, BAR_WOOD.deep);
  S.rect(x0 - 3, top + 3, x1 - x0 + 6, 1, BAR_WOOD.lo);
  // o balcão de trás embaixo (quase todo atrás da mesa)
  plank(S, r, x0 - 3, base, x1 - x0 + 6, 5, { tone: BAR_WOOD });
  S.rect(x0 - 3, base, x1 - x0 + 6, 1, BAR_WOOD.hi);
  S.rect(x0, base + 5, x1 - x0, 178 - base - 5, BAR_WOOD.lo);
  for (let x = x0 + 4; x < x1 - 10; x += 26) {
    S.rect(x, base + 9, 22, 178 - base - 14, BAR_WOOD.mid);
    S.rect(x, base + 9, 22, 1, BAR_WOOD.deep);
    S.rect(x, base + 9, 1, 178 - base - 14, BAR_WOOD.deep);
  }
}

// ---------------------------------------------------------------------------
// A mesa (camada da frente)
// ---------------------------------------------------------------------------

const PIP3 = {
  0: [],
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/** Pedra deitada no feltro, vista de cima e da frente: o tampo (11 × 9 por metade) e a espessura. */
function tableTile(b, x, y, a, c, vertical = false) {
  const W = vertical ? 11 : 22;
  const H = vertical ? 20 : 11;
  b.rect(x + 1, y + 2, W, H, BLACK, 0.5);
  b.rect(x, y, W, H, hex('#f2e8cf'));
  b.rect(x, y, W, 1, hex('#fffaf0'));
  b.rect(x, y, 1, H - 2, hex('#fff6e2'));
  b.rect(x + W - 1, y, 1, H, hex('#d6c49e'));
  b.rect(x, y + H - 2, W, 2, hex('#b9a37a')); // a espessura da pedra
  b.rect(x, y + H - 1, W, 1, hex('#8e7a54'));
  const pipC = hex('#1c140c');
  const half = (hx, hy, n) => {
    for (const [px, py] of PIP3[n]) {
      b.rect(hx + 2 + px * 3, hy + 1 + py * 3, 2, 2, pipC);
      b.put(hx + 2 + px * 3, hy + 1 + py * 3, hex('#4a3a28'));
    }
  };
  if (vertical) {
    half(x, y, a);
    b.rect(x + 1, y + 9, W - 2, 1, hex('#7a6446'));
    half(x, y + 9, c);
    b.rect(x + 4, y + 8, 2, 2, hex('#c9962e'));
  } else {
    half(x, y, a);
    b.rect(x + 11, y + 1, 1, 7, hex('#7a6446'));
    half(x + 11, y, c);
    b.rect(x + 10, y + 3, 2, 2, hex('#c9962e'));
  }
}

/** Uma pedra do rival de pé na beirada, de costas para você. */
function standingTile(b, x, base, h = 14) {
  const y = base - h;
  b.rect(x + 1, base, 6, 1, BLACK, 0.55);
  b.rect(x, y, 6, h, hex('#ece0c4'));
  b.rect(x, y, 6, 1, hex('#fffaf0'));
  b.rect(x, y, 1, h, hex('#fff4de'));
  b.rect(x + 5, y, 1, h, hex('#bba67e'));
  b.rect(x + 1, base - 1, 5, 1, hex('#a8936a'));
  b.put(x + 3, y + Math.round(h / 2), hex('#c9b48c'));
}

/** O litrão (a garrafa marrom de 600 ml) suando em cima da mesa. */
function litrao(b, r, x, baseY) {
  const glass = hex('#4e2209');
  const hi = hex('#b5652a');
  b.ellipse(x + 6, baseY + 1, 8, 2, BLACK, 0.5);
  b.rect(x, baseY - 24, 11, 24, glass);
  b.rect(x + 1, baseY - 26, 9, 2, glass);
  b.rect(x + 3, baseY - 28, 5, 2, glass);
  b.rect(x + 4, baseY - 37, 3, 9, glass);
  b.rect(x + 3, baseY - 39, 5, 3, hex('#c9a24a'));
  b.rect(x + 3, baseY - 39, 5, 1, hex('#ffe08a'));
  // rótulo
  b.rect(x, baseY - 17, 11, 9, hex('#ece2c6'));
  b.rect(x, baseY - 15, 11, 2, hex('#b8261c'));
  b.rect(x + 2, baseY - 11, 7, 1, hex('#2a5a9a'));
  b.rect(x, baseY - 8, 11, 1, hex('#9a8a6a'));
  // reflexo, sombra e o suor da garrafa gelada
  b.rect(x + 2, baseY - 24, 1, 22, hi);
  b.rect(x + 5, baseY - 36, 1, 7, hi, 0.7);
  b.rect(x + 9, baseY - 24, 2, 24, shift(glass, -18));
  for (let i = 0; i < 9; i += 1) b.put(x + 1 + r() * 9, baseY - 24 + r() * 22, hex('#e8c8a0'), 0.7);
}

/** Moedas empilhadas (a aposta). */
function coins(b, x, y, n) {
  for (let i = 0; i < n; i += 1) {
    const yy = y - i * 2;
    b.ellipse(x, yy + 1, 4, 1.6, hex('#6a4a10'));
    b.ellipse(x, yy, 4, 1.6, hex('#d9a83a'));
    b.rect(x - 2, yy - 1, 3, 1, hex('#ffe08a'));
  }
}

// ---------------------------------------------------------------------------
// As duas camadas
// ---------------------------------------------------------------------------

/** A sala, atrás do rival. */
export function paintTitleBack(seed = 5) {
  const raw = buffer(TITLE_W + PX * 2, TITLE_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  // o teto de tábuas (só aparece nas telas mais altas)
  for (let y = -PY; y < 0; y += 6) plank(b, r, X0, y, X1 - X0, 6, { tone: { hi: hex('#4a2e18'), mid: hex('#36210f'), lo: hex('#24150a'), deep: hex('#140b05') } });
  // a parede de reboco verde, com tijolo aparecendo
  plaster(b, r, X0, 0, X1, 124, { base: '#5f7866', dark: '#3e5044' });
  bricks(b, r, 150, 26, 16, 7);
  bricks(b, r, 466, 140, 12, 8);
  // a viga do teto
  plank(b, r, X0, 0, X1 - X0, 6, { tone: BAR_WOOD });
  b.rect(X0, 6, X1 - X0, 1, INK);
  b.light(X0, 7, X1 - X0, 4, BLACK, (x, y) => 0.4 - (y - 7) * 0.1);
  // o lambri, o friso e o rodapé
  woodWall(b, r, X0, 124, X1, 178, WAINSCOT);
  plank(b, r, X0, 120, X1 - X0, 4, { tone: WAINSCOT });
  b.rect(X0, 120, X1 - X0, 1, hex('#b07a46'));
  b.rect(X0, 124, X1 - X0, 1, INK);
  floorBoards(b, r, 178, Y1, { a: '#5a3820', c: '#684226', seam: '#24140a', x0: X0, x1: X1, cx: TITLE_W / 2, half: TITLE_W / 2 });
  b.rect(X0, 174, X1 - X0, 4, WAINSCOT.deep);
  b.rect(X0, 174, X1 - X0, 1, WAINSCOT.hi);
  // o letreiro (o logo vem por cima) e a luminária
  gooseneck(b, G, 112, 7);
  // o relógio e a placa do fiado
  wallClock(b, 229, 44, 12);
  woodSign(b, r, 182, 80, 45, ['FIADO', 'SÓ AMANHÃ']);
  // os engradados no chão, ao lado da mesa
  crate(b, r, 196, 160, 42, 18);
  crate(b, r, 200, 142, 36, 18);
  // a estante acesa atrás do rival, o neon e a TV
  backBar(b, r, G, 246, 448, 28, 128);
  neonSign(b, G, 262, 10);
  crtTV(b, G, 398, 8);
  // a janela com chuva, cortada pela borda
  rainyWindow(G, r, 468, 20, 44, 100);
  // a luz da noite
  relight(raw, LIGHTS, { ambient: AMBIENT, mask: G.mask, ox: PX, oy: PY });
  // os halos de quem brilha
  halo(raw, 292 + PX, 15 + PY, 46, hex('#ff4f86'), 0.55, 1.3);
  halo(raw, 424 + PX, 25 + PY, 40, hex('#7ac8ff'), 0.4);
  halo(raw, 112 + PX, 15 + PY, 30, hex('#ffd98a'), 0.6, 1.6);
  halo(raw, 360 + PX, 44 + PY, 70, hex('#ffd98a'), 0.35, 1.1);
  vignetteBox(raw, PX, PY, TITLE_W, TITLE_H, 0.55, 0.42);
  return { w: raw.w, h: raw.h, data: raw.data };
}

/** A mesa, por cima do busto do rival. */
export function paintTitleFront(seed = 9) {
  const raw = buffer(TITLE_W + PX * 2, TITLE_H + PY * 2);
  const b = shifted(raw, PX, PY);
  const r = rngOf(seed);
  const G = glowLayer(raw, PX, PY);
  const top = TITLE_GEO.rail;
  const near = 216;
  const leftAt = (y) => 264 - (y - top) * 0.8;
  const rightAt = (y) => 456 + (y - top) * 0.8;
  // o feltro
  felt(b, r, 190, top, TITLE_W, TITLE_H, (x, y) => x > leftAt(y) + 4 && x < rightAt(y) - 4 && y > top + 3 && y < near, TITLE_FELT);
  // a sombra da beirada de lá no pano
  b.light(0, top + 4, TITLE_W, 7, BLACK, (x, y) => (x > leftAt(y) && x < rightAt(y) ? 0.55 - (y - top - 4) * 0.08 : 0));
  // os aros dos lados
  for (let y = top; y < near; y += 1) {
    const l = Math.round(leftAt(y));
    const rr = Math.round(rightAt(y));
    const thick = 6 + Math.floor((y - top) * 0.04);
    for (let k = 0; k < thick; k += 1) {
      const grain = (y * 3 + k * 7) % 13 < 2;
      const c = k === 0 ? TABLE_WOOD.deep : k === 1 ? TABLE_WOOD.hi : k === thick - 1 ? TABLE_WOOD.deep : grain ? TABLE_WOOD.lo : TABLE_WOOD.mid;
      b.put(l + k, y, c);
      b.put(rr - k, y, k === 1 ? mixRgb(TABLE_WOOD.hi, TABLE_WOOD.mid, 0.5) : c);
    }
  }
  // a beirada de lá: o tampo do aro e a face de dentro
  const fl = Math.round(leftAt(top));
  const fw = Math.round(rightAt(top) - leftAt(top));
  plank(b, r, fl, top, fw, 4, { tone: TABLE_WOOD });
  b.rect(fl, top, fw, 1, TABLE_WOOD.hi);
  b.rect(fl + 5, top + 4, fw - 10, 1, TABLE_WOOD.lo);
  b.rect(fl + 5, top + 5, fw - 10, 1, TABLE_WOOD.deep);
  // a beirada de perto (onde você apoia os braços)
  const nl = Math.round(leftAt(near));
  const nw = Math.round(rightAt(near) - leftAt(near));
  plank(b, r, nl, near, nw, 4, { tone: TABLE_WOOD });
  b.rect(nl, near, nw, 1, hex('#d09a5e'));
  b.rect(nl, near + 4, nw, Y1 - near - 4, TABLE_WOOD.lo);
  b.rect(nl, near + 4, nw, 1, TABLE_WOOD.deep);
  b.light(nl, near + 5, nw, Y1 - near - 5, BLACK, (x, y) => Math.min(0.85, (y - near - 5) * 0.03));
  // as pedras do rival de pé, na beirada de lá
  for (let i = 0; i < 7; i += 1) standingTile(b, 336 + i * 7, top + 14);
  // o jogo correndo no meio
  tableTile(b, 309, 181, 5, 2);
  tableTile(b, 332, 181, 2, 6);
  tableTile(b, 355, 175, 6, 6, true);
  tableTile(b, 367, 181, 6, 4);
  tableTile(b, 390, 181, 4, 1);
  // a aposta, os copos, o litrão e o cinzeiro
  coins(b, 306, 166, 4);
  coins(b, 316, 168, 2);
  beerGlass(b, r, 285, 152, 0.85);
  beerGlass(b, r, 421, 166, 1.05);
  litrao(b, r, 440, 186);
  ashtray(b, r, 452, 205, 1.2);
  G.put(TITLE_GEO.ember[0], TITLE_GEO.ember[1], hex('#ff8a32'));
  G.put(TITLE_GEO.ember[0] + 1, TITLE_GEO.ember[1], hex('#ffd27a'));
  relight(raw, LIGHTS, { ambient: AMBIENT, mask: G.mask, ox: PX, oy: PY, bands: 9 });
  return { w: raw.w, h: raw.h, data: raw.data };
}
