/**
 * Versão 2.0: peças da mesa em pixel art de alta densidade, pintadas no buffer do cenário
 * (art/botecoScene.js → paintKit) e mostradas em <canvas> (components/PixelCanvas.jsx):
 *
 *   dorme      a pilha de pedras viradas para baixo, de 0 a 14, que baixa a cada compra
 *   cadeado    corrente de ferro em X com o cadeado de latão por cima (ponta travada)
 *   moeda      a moedinha da chuva de moedas (múltiplo de 5, vitória)
 *   faisca     a faísca da tranca
 *   mesa       o plano inteiro (aro, tabela e feltro), a frente da mesa (saia) e, de pé em
 *              cima da beirada, o cinzeiro de lata e o copo americano
 *
 * Tudo puro e com semente: a mesma pilha sai sempre igual.
 */
import { paintKit } from './botecoScene.js';

const { hex, shift, rngOf, buffer } = paintKit;

const INK = hex('#0b0705');

/** Contorno de 1 px em volta do que foi pintado (vizinhança de 4). */
function outline(b, color = INK) {
  const marks = [];
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      const i = (y * b.w + x) * 4 + 3;
      if (b.data[i] > 0) continue;
      const near = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => nx >= 0 && ny >= 0 && nx < b.w && ny < b.h && b.data[(ny * b.w + nx) * 4 + 3] > 200);
      if (near) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) b.put(x, y, color);
}

// ---------------------------------------------------------------------------
// Dorme: pedras viradas, empilhadas em duas colunas de até 7
// ---------------------------------------------------------------------------

export const BONEYARD_SIZE = Object.freeze({ w: 66, h: 48 });
const BACK = {
  top: hex('#2e2219'),
  topHi: hex('#6a5442'),
  topLo: hex('#1a120c'),
  grain: hex('#3c2d22'),
  mark: hex('#b8903e'),
  markLo: hex('#5a4216'),
  ebony: hex('#20170f'),
  bone: hex('#bfae86'),
  boneHi: hex('#dccca2'),
  boneLo: hex('#86765a'),
  seam: hex('#4a3a24'),
};
const TILE_W = 24;
const TOP_H = 9;
const SIDE_H = 5;

/**
 * Uma pedra deitada, virada para baixo, vista do alto em 2.5D: o tampo de ébano com chanfro,
 * veio e o losango gravado em latão; a lateral mostra as duas camadas da pedra (o ébano das
 * costas em cima, o osso da face embaixo), com o friso entre elas e uma lasquinha no osso.
 */
function backTile(b, x, y, r, shade = 0) {
  // lateral: ébano (2) + friso (1) + osso (2); as de baixo ficam na sombra das de cima
  const dim = (c) => shift(c, -shade);
  b.rect(x, y + TOP_H, TILE_W, 2, dim(BACK.ebony));
  b.rect(x, y + TOP_H + 2, TILE_W, 1, dim(BACK.seam));
  b.rect(x, y + TOP_H + 3, TILE_W, 2, dim(BACK.bone));
  b.rect(x, y + TOP_H + 4, TILE_W, 1, dim(BACK.boneLo));
  b.rect(x, y + TOP_H + 3, 1, 2, dim(BACK.boneHi));
  b.rect(x + TILE_W - 1, y + TOP_H, 1, SIDE_H, dim(BACK.topLo));
  if (r() < 0.6) b.put(x + 3 + Math.floor(r() * (TILE_W - 6)), y + TOP_H + 3, dim(BACK.boneLo));
  // tampo: chanfro claro em cima e à esquerda (a lâmpada), escuro embaixo e à direita
  for (let yy = 0; yy < TOP_H; yy += 1) {
    for (let xx = 0; xx < TILE_W; xx += 1) {
      let c;
      if (yy === 0) c = BACK.topHi;
      else if (xx === 0) c = mix3(BACK.topHi, BACK.top, 0.4);
      else if (yy === TOP_H - 1 || xx === TILE_W - 1) c = BACK.topLo;
      else c = Math.sin(xx * 0.7 + yy * 2.1) > 0.75 ? BACK.grain : BACK.top;
      b.put(x + xx, y + yy, c);
    }
  }
  // o losango gravado (latão gasto) no meio do tampo
  const cx = x + TILE_W / 2 - 0.5;
  const cy = y + 4;
  b.put(cx, cy - 2, BACK.mark);
  b.put(cx - 2, cy, BACK.mark);
  b.put(cx + 2, cy, BACK.markLo);
  b.put(cx, cy + 2, BACK.markLo);
  b.put(cx - 1, cy - 1, BACK.mark);
  b.put(cx + 1, cy - 1, BACK.mark);
  b.put(cx - 1, cy + 1, BACK.markLo);
  b.put(cx + 1, cy + 1, BACK.markLo);
  b.put(cx, cy, hex('#ffe08a'));
}

const mix3 = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];

/**
 * A pilha do dorme com `count` pedras (até 14 aparecem): quatro montinhos baixos, dois atrás
 * e dois na frente, desencontrados como pedra embaralhada na mesa. Cada compra tira a pedra
 * de cima do montinho mais alto, e a pilha vai baixando.
 */
const HEAPS = [
  // [x, base y, máximo] — os de trás primeiro (são desenhados antes e ficam encobertos)
  { x: 14, y: 22, max: 3 },
  { x: 39, y: 20, max: 3 },
  { x: 2, y: 30, max: 4 },
  { x: 28, y: 31, max: 4 },
];
export function paintBoneyard(count, seed = 3) {
  const { w, h } = BONEYARD_SIZE;
  const b = buffer(w, h);
  const r = rngOf(seed);
  const n = Math.max(0, Math.min(14, count));
  // sombra no feltro, por baixo de tudo
  b.ellipse(w / 2, h - 4, 31, 4.5, [0, 0, 0], 0.45);
  b.ellipse(w / 2 + 2, h - 10, 26, 7, [0, 0, 0], 0.22);
  if (n === 0) {
    b.ellipse(w / 2, h - 6, 24, 3.5, [0, 0, 0], 0.25);
    return b;
  }
  // quantas em cada montinho: a pedra comprada sai do mais alto (empate: o de trás primeiro)
  const heights = HEAPS.map(() => 0);
  for (let k = 0; k < n; k += 1) {
    const order = [2, 3, 0, 1];
    const next = order.find((i) => heights[i] < HEAPS[i].max && heights[i] === Math.min(...order.filter((j) => heights[j] < HEAPS[j].max).map((j) => heights[j])));
    heights[next] += 1;
  }
  const jit = Array.from({ length: 16 }, () => Math.round((r() - 0.5) * 3));
  HEAPS.forEach((heap, i) => {
    for (let k = 0; k < heights[i]; k += 1) {
      const x = heap.x + jit[i * 4 + k];
      const y = heap.y - k * SIDE_H;
      backTile(b, x, y, r, Math.max(0, (heights[i] - 1 - k) * 9));
    }
  });
  outline(b);
  return b;
}

// ---------------------------------------------------------------------------
// Corrente em X e o cadeado (ponta travada pelo Chumbo ou pelo Âmbar)
// ---------------------------------------------------------------------------

export const LOCK_SIZE = Object.freeze({ w: 40, h: 40 });

function chainLink(b, x, y, flat) {
  const iron = hex('#8a9298');
  const hi = hex('#d8dee2');
  const lo = hex('#3a4046');
  if (flat) {
    b.rect(x, y, 5, 3, iron);
    b.rect(x + 1, y + 1, 3, 1, lo);
    b.put(x + 1, y, hi);
  } else {
    b.rect(x, y, 3, 5, iron);
    b.rect(x + 1, y + 1, 1, 3, lo);
    b.put(x, y + 1, hi);
  }
}

export function paintLock() {
  const { w, h } = LOCK_SIZE;
  const b = buffer(w, h);
  // duas correntes cruzadas
  for (let i = 0; i < 12; i += 1) {
    const k = Math.round(i * 3);
    chainLink(b, 1 + k, 1 + k, i % 2 === 0);
    chainLink(b, 35 - k, 1 + k, i % 2 === 1);
  }
  // argola grossa do cadeado
  const steel = hex('#b9c0c4');
  const steelHi = hex('#f2f6f8');
  const steelLo = hex('#5a6268');
  b.rect(13, 10, 3, 10, steel);
  b.rect(24, 10, 3, 10, steel);
  b.rect(14, 8, 12, 3, steel);
  b.rect(15, 8, 10, 1, steelHi);
  b.rect(13, 11, 1, 8, steelHi);
  b.rect(26, 11, 1, 8, steelLo);
  // corpo de latão com relevo
  const brass = hex('#c9962e');
  const brassHi = hex('#ffe08a');
  const brassLo = hex('#7a5410');
  b.rect(10, 18, 20, 16, brass);
  b.rect(10, 18, 20, 2, brassHi);
  b.rect(10, 18, 2, 16, shift(brass, 30));
  b.rect(28, 18, 2, 16, brassLo);
  b.rect(10, 32, 20, 2, brassLo);
  // rebites e o buraco da chave
  for (const [rx, ry] of [[12, 21], [27, 21], [12, 31], [27, 31]]) {
    b.put(rx, ry, brassHi);
    b.put(rx + 1, ry + 1, brassLo);
  }
  b.ellipse(20, 24, 2, 2, hex('#1a1004'));
  b.rect(19, 25, 2, 4, hex('#1a1004'));
  // brilho da lâmpada no latão
  b.rect(14, 21, 2, 6, hex('#fff6cc'), 0.7);
  outline(b);
  return b;
}

// ---------------------------------------------------------------------------
// Moeda e faísca (as partículas do juice)
// ---------------------------------------------------------------------------

export const COIN_SIZE = Object.freeze({ w: 12, h: 12 });

export function paintCoin() {
  const b = buffer(COIN_SIZE.w, COIN_SIZE.h);
  b.ellipse(6, 6, 5.5, 5.5, hex('#8a5a10'));
  b.ellipse(6, 6, 4.6, 4.6, hex('#e8b84a'));
  b.ellipse(5.4, 5.4, 3, 3, hex('#ffe08a'));
  b.rect(5, 3, 2, 6, hex('#8a5a10'));
  b.rect(4, 4, 4, 1, hex('#8a5a10'));
  b.rect(4, 7, 4, 1, hex('#8a5a10'));
  b.put(3, 3, hex('#fffbe0'));
  b.put(4, 2, hex('#fffbe0'));
  outline(b);
  return b;
}

export const SPARK_SIZE = Object.freeze({ w: 7, h: 7 });

export function paintSpark() {
  const b = buffer(SPARK_SIZE.w, SPARK_SIZE.h);
  b.rect(3, 0, 1, 7, hex('#ffd27a'));
  b.rect(0, 3, 7, 1, hex('#ffd27a'));
  b.rect(2, 2, 3, 3, hex('#ff8a32'));
  b.put(3, 3, hex('#ffffff'));
  return b;
}

// ---------------------------------------------------------------------------
// A mesa inteira: o aro de madeira com volume e o feltro gasto (o plano inclinado)
// ---------------------------------------------------------------------------

/** Quantos px de CSS vale cada pixel da mesa (mais denso que o cenário: 1,5 em vez de 2). */
export const TABLE_PX = 1.5;
/** Espessura do aro (madeira + a tabela de feltro por dentro), em pixels da mesa. */
export const RAIL = 18;
/** Só a madeira do aro (o resto do RAIL é a tabela de feltro). */
export const RAIL_WOOD_W = 14;
const WOOD_W = RAIL_WOOD_W;

const RAIL_WOOD = {
  pinho: { hi: hex('#c88a4a'), mid: hex('#7a4a24'), lo: hex('#4a2a12'), deep: hex('#1c0e05'), grain: hex('#3a2010'), worn: hex('#9a6a3a') },
  mogno: { hi: hex('#c8604a'), mid: hex('#74241a'), lo: hex('#44120b'), deep: hex('#1a0503'), grain: hex('#300a06'), worn: hex('#94402e') },
};

const clamp255 = (v) => Math.max(0, Math.min(255, v));
const clampRgb = (c) => [clamp255(c[0]), clamp255(c[1]), clamp255(c[2])];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Ruído de valor suave (grade `cell` interpolada): manchas grandes do pano e da madeira. */
function valueNoise(w, h, cell, r) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g = Array.from({ length: gw * gh }, () => r());
  const at = (x, y) => g[y * gw + x];
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const c = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (c - a) * sy;
  };
}

/** Mancha de contorno irregular e borda macia (bebida derramada, umidade). */
function blot(b, cx, cy, rad, color, alpha, r) {
  const lobes = Array.from({ length: 6 }, () => 0.75 + r() * 0.5);
  for (let y = Math.floor(cy - rad * 1.3); y <= cy + rad * 1.3; y += 1) {
    for (let x = Math.floor(cx - rad * 1.3); x <= cx + rad * 1.3; x += 1) {
      const a = Math.atan2(y - cy, x - cx);
      const k = lobes[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 6) % 6];
      const d = Math.hypot(x - cx, (y - cy) * 1.2) / (rad * k);
      if (d < 1) b.put(x, y, color, alpha * (d > 0.8 ? 1.4 : 0.6 + d * 0.4));
    }
  }
}

/** Grade de ruído suave (célula `cell`) já amostrada em cada pixel, como Float32Array w×h. */
function noiseField(w, h, cell, r) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i += 1) g[i] = r();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const fy = y / cell;
    const y0 = fy | 0;
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < w; x += 1) {
      const fx = x / cell;
      const x0 = fx | 0;
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const i0 = y0 * gw + x0;
      const top = g[i0] + (g[i0 + 1] - g[i0]) * sx;
      const bot = g[i0 + gw] + (g[i0 + gw + 1] - g[i0 + gw]) * sx;
      out[y * w + x] = top + (bot - top) * sy;
    }
  }
  return out;
}

/**
 * O pano numa passada só, direto no buffer: gradiente da luz, sarja (a trama diagonal),
 * manchas grandes de uso, grão, o miolo gasto onde as pedras deslizam e a vinheta dos
 * cantos longe da lâmpada. (Separado e sem alocar nada por pixel: é o laço mais quente.)
 */
function paintFeltBase(data, w, h, L, M, D, seed) {
  const r = rngOf(seed * 7 + 1);
  const mottle = noiseField(w, h, 22, r);
  const fine = noiseField(w, h, 5, r);
  const cx = w / 2;
  const cy = h * 0.6;
  const iw = 1 / (w * 0.6);
  const ih = 1 / (h * 0.72);
  const wx = 1 / (w * 0.36);
  const vx = 1 / (w * 0.55);
  const WR = 168;
  const WG = 184;
  const WB = 148;
  let hash = (seed * 2654435761) >>> 0;
  for (let y = WOOD_W; y < h - WOOD_W; y += 1) {
    const dy = (y - cy) * ih;
    const ey = (y - h * 0.68) / (h * 0.2);
    const vy = (y - cy) / (h * 0.62);
    for (let x = WOOD_W; x < w - WOOD_W; x += 1) {
      const dx = (x - cx) * iw;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const near = d < 0.45;
      const t = near ? d / 0.45 : Math.min(1, (d - 0.45) / 0.55);
      const m5 = (x + y * 2) % 5;
      hash = (Math.imul(hash ^ (hash >>> 13), 1274126177) + 1013904223) >>> 0;
      const j = y * w + x;
      const k = (m5 === 0 ? 5 : m5 === 2 ? -3 : 0) + (mottle[j] - 0.5) * 16 + (fine[j] - 0.5) * 8 + ((hash >>> 8) / 16777216 - 0.5) * 7;
      let cr = near ? L[0] + (M[0] - L[0]) * t : M[0] + (D[0] - M[0]) * t;
      let cg = near ? L[1] + (M[1] - L[1]) * t : M[1] + (D[1] - M[1]) * t;
      let cb = near ? L[2] + (M[2] - L[2]) * t : M[2] + (D[2] - M[2]) * t;
      cr += k;
      cg += k;
      cb += k;
      const ex = (x - cx) * wx;
      const we = 1 - Math.sqrt(ex * ex + ey * ey);
      if (we > 0) {
        const a = we * Math.sqrt(we) * 0.144;
        cr += (WR - cr) * a;
        cg += (WG - cg) * a;
        cb += (WB - cb) * a;
      }
      const ux = (x - cx) * vx;
      const vg = Math.sqrt(ux * ux + vy * vy) - 0.55;
      if (vg > 0) {
        const keep = 1 - Math.min(1, vg * 0.9) * 0.9;
        cr *= keep;
        cg *= keep;
        cb *= keep;
      }
      const i = j * 4;
      data[i] = cr;
      data[i + 1] = cg;
      data[i + 2] = cb;
      data[i + 3] = 255;
    }
  }
}

/**
 * Pinta a mesa de `w`×`h` pixels, como uma mesa de sinuca de boteco:
 *   aro de madeira com a quina boleada (luz em cima), veio, nós, meia-esquadria nos cantos,
 *   lascas, riscos, marcas de copo desbotadas, partes com o verniz gasto, queimado, pregos de
 *   latão e os losangos de madrepérola;
 *   a tabela de feltro por dentro do aro (com o degrau e a sombra dela no pano);
 *   o feltro: trama em sarja, manchas grandes, o miolo gasto pelas pedras, fiapos, poeira,
 *   bebida derramada, marca de copo, queimado de cigarro e pó de giz.
 */
export function paintTablePlane({ w, h, light = '#3a4a2a', mid = '#2c3a20', dark = '#1f2a17', seed = 11, mahogany = false }) {
  const b = buffer(w, h);
  const r = rngOf(seed);
  const wood = mahogany ? RAIL_WOOD.mogno : RAIL_WOOD.pinho;
  const L = hex(light);
  const M = hex(mid);
  const D = hex(dark);

  // --- feltro (até debaixo da tabela) ---------------------------------------
  paintFeltBase(b.data, w, h, L, M, D, seed);
  // bebida derramada: manchas irregulares com a borda que secou
  for (let i = 0; i < 4; i += 1) {
    blot(b, RAIL + 12 + r() * (w - RAIL * 2 - 24), RAIL + 12 + r() * (h - RAIL * 2 - 24), 5 + r() * 9, shift(D, -10), 0.28, r);
  }
  // marca de copo: arco falhado, não um círculo perfeito
  for (let i = 0; i < 2; i += 1) {
    const sx = w * (0.2 + r() * 0.6);
    const sy = h * (0.12 + r() * 0.5);
    const start = r() * Math.PI * 2;
    for (let a = start; a < start + Math.PI * 1.6; a += 0.03) {
      const fade = 0.25 + 0.25 * Math.sin((a - start) * 2);
      b.put(sx + Math.cos(a) * 8, sy + Math.sin(a) * 6.5, shift(D, -16), fade);
    }
  }
  // queimado de cigarro: miolo carbonizado, auréola marrom e o pano derretido em volta
  for (let i = 0; i < 3; i += 1) {
    const sx = RAIL + 14 + r() * (w - RAIL * 2 - 28);
    const sy = RAIL + 14 + r() * (h - RAIL * 2 - 28);
    b.ellipse(sx, sy, 4, 3, hex('#4a3214'), 0.45);
    b.ellipse(sx, sy, 2.6, 1.8, hex('#2a1606'), 0.85);
    b.ellipse(sx, sy, 1.4, 1, hex('#0a0402'));
    b.put(sx + 2, sy - 2, hex('#a88a5a'), 0.5);
  }
  // pó de giz azul perto de uma caçapa de canto
  {
    const sx = w * (r() < 0.5 ? 0.16 : 0.84);
    const sy = h * (0.22 + r() * 0.1);
    for (let i = 0; i < 70; i += 1) {
      const a = r() * Math.PI * 2;
      const rr = r() * r() * 14;
      b.put(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.7, hex('#86a6ea'), 0.25 + r() * 0.35);
    }
  }
  // fiapos soltos e poeira
  for (let i = 0; i < (w * h) / 180; i += 1) {
    const fx = RAIL + Math.floor(r() * (w - RAIL * 2));
    const fy = RAIL + Math.floor(r() * (h - RAIL * 2));
    if (r() < 0.6) b.put(fx, fy, hex('#d2cebc'), 0.18 + r() * 0.3);
    else b.line(fx, fy, fx + 1 + Math.floor(r() * 3), fy + (r() < 0.5 ? 0 : 1), shift(L, 26), 0.3);
  }

  // --- a tabela de feltro (por dentro do aro de madeira) ------------------------
  for (let y = WOOD_W; y < h - WOOD_W; y += 1) {
    const band = y < RAIL || y >= h - RAIL;
    for (let x = WOOD_W; x < w - WOOD_W; x += band ? 1 : x < RAIL ? 1 : x === RAIL ? w - RAIL * 2 : 1) {
      const dmin = Math.min(y, h - 1 - y, x, w - 1 - x);
      if (dmin >= RAIL) continue;
      const k = dmin - WOOD_W; // 0 encostado na madeira ... 5 a quina que encosta no pano
      const top = dmin === y;
      let c = k === 0 ? shift(D, -18) : k <= 2 ? lerp(M, L, 0.5 + (top ? 0.25 : 0)) : k === 3 ? M : shift(D, -6);
      c = shift(c, Math.round((r() - 0.5) * 6));
      b.put(x, y, clampRgb(c));
    }
  }

  // --- aro de madeira -----------------------------------------------------
  const woodNoise = valueNoise(w, h, 14, r);
  for (let y = 0; y < h; y += 1) {
    const band = y < WOOD_W || y >= h - WOOD_W;
    for (let x = 0; x < w; x += band || x < WOOD_W - 1 || x >= w - WOOD_W ? 1 : w - WOOD_W * 2 + 1) {
      const dTop = y;
      const dBottom = h - 1 - y;
      const dLeft = x;
      const dRight = w - 1 - x;
      const dmin = Math.min(dTop, dBottom, dLeft, dRight);
      if (dmin >= WOOD_W) continue;
      const horizontal = Math.min(dTop, dBottom) <= Math.min(dLeft, dRight);
      const side = horizontal ? (dTop <= dBottom ? 'top' : 'bottom') : dLeft <= dRight ? 'left' : 'right';
      const along = horizontal ? x : y;
      const across = dmin;
      // quina boleada: escuro na borda, brilho forte no alto da curva, depois o tampo
      let c;
      if (across === 0) c = wood.deep;
      else if (across === 1) c = wood.lo;
      else if (across === 2) c = lerp(wood.hi, hex('#ffe2b0'), side === 'top' ? 0.45 : 0.15);
      else if (across === 3) c = wood.hi;
      else if (across === 4) c = lerp(wood.hi, wood.mid, 0.55);
      else if (across >= WOOD_W - 3) c = across === WOOD_W - 1 ? wood.deep : across === WOOD_W - 2 ? wood.lo : lerp(wood.mid, wood.lo, 0.6);
      else {
        const g = Math.sin(along * 0.09 + across * 1.9 + Math.sin(along * 0.021 + across * 0.7) * 2.6 + woodNoise(x, y) * 4);
        c = g > 0.74 ? wood.grain : g > 0.3 ? lerp(wood.mid, wood.lo, 0.3) : g < -0.78 ? lerp(wood.mid, wood.hi, 0.4) : wood.mid;
        c = shift(c, Math.round((r() - 0.5) * 7));
      }
      // luz de cima: o lado de cima mais claro, o de baixo mais escuro
      if (side === 'top') c = lerp(c, wood.hi, 0.14);
      if (side === 'bottom') c = lerp(c, wood.lo, 0.12);
      // verniz gasto no meio do lado de baixo (onde se apoia o cotovelo) e nas quinas
      const elbow = side === 'bottom' && Math.abs(x - w / 2) < w * 0.22 && across > 3 && across < WOOD_W - 2;
      if (elbow && woodNoise(x * 2, y) > 0.45) c = lerp(c, wood.worn, 0.55);
      // emenda em meia-esquadria nos quatro cantos
      if (Math.abs(Math.min(dTop, dBottom) - Math.min(dLeft, dRight)) === 0 && across > 0 && across < WOOD_W - 1) c = wood.deep;
      b.put(x, y, clampRgb(c));
    }
  }
  // nós da madeira
  for (let i = 0; i < 7; i += 1) {
    const t = r();
    const horizontal = r() < 0.6;
    const kx = horizontal ? WOOD_W + t * (w - WOOD_W * 2) : r() < 0.5 ? 6 : w - 7;
    const ky = horizontal ? (r() < 0.5 ? 6 : h - 7) : WOOD_W + t * (h - WOOD_W * 2);
    b.ellipse(kx, ky, horizontal ? 3 : 1.6, horizontal ? 1.6 : 3, wood.lo);
    b.ellipse(kx, ky, horizontal ? 1.6 : 0.8, horizontal ? 0.8 : 1.6, wood.deep);
  }
  // losangos de madrepérola no tampo do aro (as marcas da mesa de sinuca)
  const diamond = (dx, dy) => {
    b.put(dx, dy - 1, hex('#e8f0ec'));
    b.put(dx - 1, dy, hex('#c8d8d0'));
    b.put(dx + 1, dy, hex('#c8d8d0'));
    b.put(dx, dy, hex('#ffffff'));
    b.put(dx, dy + 1, hex('#9ab0a8'));
  };
  for (const t of [0.25, 0.5, 0.75]) {
    diamond(Math.round(w * t), 7);
    diamond(Math.round(w * t), h - 8);
  }
  for (const t of [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]) {
    diamond(7, Math.round(h * t));
    diamond(w - 8, Math.round(h * t));
  }
  // lascas na quina de fora: o dente escuro e a madeira crua por dentro
  for (let i = 0; i < 18; i += 1) {
    const side = Math.floor(r() * 4);
    const t = 0.06 + r() * 0.88;
    const len = 2 + Math.floor(r() * 4);
    const raw = hex('#d09a60');
    if (side < 2) {
      const px = Math.round(t * w);
      const py = side === 0 ? 1 : h - 3;
      b.rect(px, py, len, 2, wood.deep);
      b.rect(px, side === 0 ? py + 2 : py - 1, len, 1, raw, 0.85);
    } else {
      const px = side === 2 ? 1 : w - 3;
      const py = Math.round(t * h);
      b.rect(px, py, 2, len, wood.deep);
      b.rect(side === 2 ? px + 2 : px - 1, py, 1, len, raw, 0.85);
    }
  }
  // riscos de chave e de anel no tampo do aro
  for (let i = 0; i < 30; i += 1) {
    const side = Math.floor(r() * 4);
    const a = 4 + Math.floor(r() * (WOOD_W - 6));
    const len = 3 + Math.floor(r() * 7);
    const tint = r() < 0.7 ? hex('#e0b07a') : wood.deep;
    if (side < 2) {
      const py = side === 0 ? a : h - 1 - a;
      const px = Math.round(r() * (w - len));
      b.line(px, py, px + len, py + (r() < 0.3 ? 1 : 0), tint, 0.32);
    } else {
      const px = side === 2 ? a : w - 1 - a;
      const py = Math.round(r() * (h - len));
      b.line(px, py, px + (r() < 0.3 ? 1 : 0), py + len, tint, 0.32);
    }
  }
  // marcas de copo desbotadas na madeira: um arco claro e a umidade escura por dentro
  for (const [rx, ry, rw] of [
    [w * 0.76, 5.5, 8],
    [5.5, h * 0.56, 7],
    [w * 0.3, h - 6.5, 8],
    [w - 6, h * 0.22, 6],
  ]) {
    const start = r() * Math.PI;
    for (let a = start; a < start + Math.PI * 1.7; a += 0.035) {
      b.put(rx + Math.cos(a) * rw, ry + Math.sin(a) * (rw * 0.55), hex('#f0d0a0'), 0.3);
    }
    b.ellipse(rx, ry, rw * 0.8, rw * 0.4, hex('#2a1608'), 0.14);
  }
  // queimado de cigarro esquecido na beirada
  b.ellipse(w * 0.14, h - 6, 4, 2.2, hex('#1a0c04'), 0.7);
  b.ellipse(w * 0.14, h - 6, 2, 1.2, hex('#050200'), 0.9);
  // pregos de latão nos cantos
  for (const [nx, ny] of [
    [5, 5],
    [w - 6, 5],
    [5, h - 6],
    [w - 6, h - 6],
  ]) {
    b.ellipse(nx, ny, 2, 2, hex('#6a4a10'));
    b.put(nx - 1, ny - 1, hex('#ffe08a'));
    b.put(nx, ny, hex('#c9962e'));
  }
  // a sombra da tabela no pano (mais forte em cima: a luz vem do alto)
  for (let k = 0; k < 5; k += 1) {
    const a = (5 - k) * 0.09;
    b.rect(RAIL, RAIL + k, w - RAIL * 2, 1, [0, 0, 0], a * 1.4);
    b.rect(RAIL, h - RAIL - 1 - k, w - RAIL * 2, 1, [0, 0, 0], a * 0.6);
    b.rect(RAIL + k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a);
    b.rect(w - RAIL - 1 - k, RAIL, 1, h - RAIL * 2, [0, 0, 0], a);
  }
  return b;
}

// ---------------------------------------------------------------------------
// A frente da mesa (a saia de madeira que aparece embaixo do aro de perto)
// ---------------------------------------------------------------------------

/** Altura da saia, em pixels da mesa. */
export const APRON_H = 12;

/**
 * A frente da mesa, de `w` pixels: o lábio do aro (luz em cima), a tábua com veio na
 * horizontal, chanfro, pregos, lascas, a cantoneira de latão nas pontas e a sombra no chão.
 */
export function paintApron(w, { mahogany = false, seed = 5 } = {}) {
  const h = APRON_H;
  const b = buffer(w, h);
  const r = rngOf(seed);
  const wood = mahogany ? RAIL_WOOD.mogno : RAIL_WOOD.pinho;
  for (let y = 0; y < h - 3; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let c;
      if (y === 0) c = lerp(wood.hi, hex('#ffe2b0'), 0.25);
      else if (y === 1) c = wood.mid;
      else if (y === 2) c = wood.deep;
      else {
        const g = Math.sin(x * 0.05 + y * 2.3 + Math.sin(x * 0.013) * 3);
        c = g > 0.7 ? wood.grain : g < -0.8 ? lerp(wood.lo, wood.mid, 0.6) : lerp(wood.lo, wood.deep, (y - 3) / 10);
        c = shift(c, Math.round((r() - 0.5) * 6));
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // a base da saia, mais escura, e a sombra dela no chão (some para baixo)
  b.rect(0, h - 4, w, 1, wood.deep);
  for (let k = 0; k < 3; k += 1) b.rect(0, h - 3 + k, w, 1, [0, 0, 0], 0.6 - k * 0.18);
  // pregos e lascas da beirada
  for (let x = 18 + Math.floor(r() * 10); x < w - 12; x += 34 + Math.floor(r() * 18)) {
    b.put(x, 6, hex('#2a1a08'));
    b.put(x, 5, hex('#d8b070'), 0.8);
  }
  for (let i = 0; i < Math.max(4, w / 30); i += 1) {
    const x = Math.floor(r() * (w - 4));
    const len = 2 + Math.floor(r() * 3);
    b.rect(x, 0, len, 1, wood.deep);
    b.rect(x, 1, len, 1, hex('#d09a60'), 0.7);
  }
  // cantoneiras de latão nas pontas
  for (const x0 of [0, w - 6]) {
    b.rect(x0, 0, 6, h - 4, hex('#7a5a14'));
    b.rect(x0 + (x0 === 0 ? 0 : 1), 0, 5, 1, hex('#ffe08a'));
    b.rect(x0 + 1, 1, 4, h - 6, hex('#c9962e'));
    b.put(x0 + 3, 3, hex('#3a2a08'));
    b.put(x0 + 3, h - 7, hex('#3a2a08'));
    b.put(x0 + 2, 2, hex('#fff0b0'));
  }
  return b;
}

// ---------------------------------------------------------------------------
// De pé na beirada: o cinzeiro de lata com o cigarro aceso e o copo americano
// ---------------------------------------------------------------------------

export const ASHTRAY_SIZE = Object.freeze({ w: 52, h: 26 });

/**
 * Cinzeiro de lata estampada, visto de cima e de lado: a aba com as ranhuras e os três
 * descansos, um amassado, o fundo cheio de cinza, duas bitucas e o cigarro aceso
 * apoiado no descanso, com a brasa e a cinza comprida na ponta.
 */
export function paintTinAshtray(seed = 9) {
  const { w, h } = ASHTRAY_SIZE;
  const b = buffer(w, h);
  const r = rngOf(seed);
  const cx = 20;
  const cy = 15;
  // sombra no feltro
  b.ellipse(cx + 2, cy + 6, 19, 6, [0, 0, 0], 0.45);
  // a lateral da lata (a parte que desce até a mesa)
  b.ellipse(cx, cy + 3, 18, 7.5, hex('#4a5054'));
  b.ellipse(cx, cy + 2, 18, 7.5, hex('#7c858a'));
  // a aba de cima, com brilho na frente e as ranhuras estampadas
  b.ellipse(cx, cy, 18, 7.5, hex('#b9c2c6'));
  b.ellipse(cx, cy - 0.5, 16.5, 6.5, hex('#dfe6e8'));
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
    b.put(cx + Math.cos(a) * 17, cy + Math.sin(a) * 7, hex('#8a9498'));
  }
  // a cuba: escura, com a borda de dentro
  b.ellipse(cx, cy + 0.5, 12.5, 4.6, hex('#5a6266'));
  b.ellipse(cx, cy + 1, 11.5, 4, hex('#2c3134'));
  // cinza no fundo, um monte cinza claro com pontinhos pretos
  b.ellipse(cx - 1, cy + 1.6, 9, 2.6, hex('#8a8a86'));
  b.ellipse(cx - 2, cy + 1.2, 5, 1.4, hex('#b4b4ae'));
  for (let i = 0; i < 16; i += 1) b.put(cx - 9 + r() * 17, cy + 0.5 + r() * 3, r() < 0.5 ? hex('#3a3a38') : hex('#d8d8d0'));
  // duas bitucas amassadas
  b.rect(cx - 7, cy, 4, 2, hex('#d9a046'));
  b.put(cx - 7, cy, hex('#a06a20'));
  b.rect(cx - 3, cy + 1, 3, 1, hex('#f2efe6'));
  b.rect(cx + 3, cy + 2, 3, 2, hex('#e6b45a'));
  b.put(cx + 6, cy + 2, hex('#7a7a74'));
  // os três descansos de cigarro (entalhes na aba)
  for (const a of [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6]) {
    const nx = cx + Math.cos(a) * 15;
    const ny = cy + Math.sin(a) * 6;
    b.rect(nx - 1, ny - 1, 3, 2, hex('#6a7276'));
  }
  // um amassado na aba (de quem bateu o cinzeiro na mesa)
  b.put(cx - 13, cy + 3, hex('#8a9498'));
  b.put(cx - 12, cy + 4, hex('#f4f8f8'));
  b.put(cx - 14, cy + 4, hex('#6a7276'));
  // brilho da lâmpada na frente da aba
  for (let x = cx - 8; x < cx + 6; x += 1) b.put(x, cy + 6, hex('#ffffff'), 0.7);
  // o cigarro aceso, apoiado no descanso da direita, saindo para fora
  const sy = cy - 3;
  b.rect(cx + 8, sy, 4, 2, hex('#d9a046'));
  b.rect(cx + 8, sy, 4, 1, hex('#f0c070'));
  b.rect(cx + 12, sy, 13, 2, hex('#f6f3ea'));
  b.rect(cx + 12, sy + 1, 13, 1, hex('#d4d0c4'));
  b.rect(cx + 25, sy, 3, 2, hex('#9a9a94'));
  b.put(cx + 28, sy, hex('#ff6a1a'));
  b.put(cx + 28, sy + 1, hex('#ffb040'));
  b.put(cx + 29, sy, hex('#ffe08a'), 0.9);
  b.put(cx + 29, sy + 1, hex('#c03a10'));
  // brilho da brasa no metal
  b.ellipse(cx + 28.5, sy + 1, 3, 2, hex('#ff8a30'), 0.18);
  outline(b);
  return b;
}

export const GLASS_SIZE = Object.freeze({ w: 22, h: 36 });

/**
 * Copo americano de cerveja: o anel liso em cima, os gomos facetados embaixo, o colarinho de
 * espuma passando da borda, a cerveja âmbar com as bolhas subindo, as gotas do suor do copo,
 * o fundo grosso e a poça molhada no feltro.
 */
export function paintCopoAmericano(seed = 4) {
  const { w, h } = GLASS_SIZE;
  const b = buffer(w, h);
  const r = rngOf(seed);
  const top = 5;
  const bottom = h - 4;
  const widthAt = (y) => 8.5 - ((y - top) / (bottom - top)) * 2.2; // afina para baixo
  // poça molhada e sombra
  b.ellipse(11.5, bottom + 1.5, 10, 2.6, [0, 0, 0], 0.4);
  b.ellipse(11, bottom + 1, 8.5, 2, hex('#c8d8c0'), 0.12);
  for (let y = top; y <= bottom; y += 1) {
    const half = widthAt(y);
    for (let x = Math.round(11 - half); x <= Math.round(11 + half); x += 1) {
      const u = (x - (11 - half)) / (half * 2); // 0 esquerda .. 1 direita
      const smooth = y < top + 8; // o anel liso de cima
      let c;
      if (y < top + 3) c = hex('#fff6e0'); // espuma dentro do copo
      else if (y < top + 4) c = hex('#f0d890');
      else {
        // cerveja: mais escura nas bordas e embaixo
        const depth = (y - top) / (bottom - top);
        c = mixLocal(hex('#ffcf4a'), hex('#b8700e'), Math.min(1, Math.abs(u - 0.45) * 1.6 + depth * 0.35));
      }
      // os gomos do copo americano (só abaixo do anel liso)
      if (!smooth && y > top + 3) {
        const facet = Math.floor(u * 7);
        const fu = u * 7 - facet;
        if (fu < 0.18) c = shift(c, 26);
        else if (fu > 0.82) c = shift(c, -22);
      }
      if (smooth && y === top + 8) c = shift(c, -30); // a linha onde o anel acaba
      b.put(x, y, clampRgb(c));
    }
  }
  // colarinho passando da borda (espuma que derrama)
  b.ellipse(11, top, 9.5, 2.6, hex('#fffaf0'));
  b.ellipse(10, top - 1, 6, 1.6, hex('#ffffff'));
  b.rect(3, top + 1, 2, 3, hex('#fff6e0'));
  b.put(3, top + 4, hex('#f6ecd0'));
  for (let i = 0; i < 8; i += 1) b.put(4 + r() * 14, top - 1 + r() * 3, hex('#e8dcc0'));
  // bolhas subindo
  for (let i = 0; i < 12; i += 1) b.put(7 + r() * 8, top + 6 + r() * (bottom - top - 8), hex('#fff0b0'), 0.8);
  // o vidro: borda clara à esquerda, brilho comprido, fundo grosso
  for (let y = top + 1; y <= bottom; y += 1) {
    b.put(Math.round(11 - widthAt(y)), y, hex('#fff8e8'), 0.85);
    b.put(Math.round(11 + widthAt(y)), y, hex('#6a3a08'), 0.8);
    if (y > top + 2 && y < bottom - 5) b.put(Math.round(11 - widthAt(y) + 2), y, hex('#ffffff'), 0.55);
  }
  b.rect(5, bottom - 1, 13, 2, hex('#e8c060'));
  b.rect(6, bottom, 11, 1, hex('#fff4c8'), 0.7);
  // suor do copo: gotinhas com brilho
  for (let i = 0; i < 7; i += 1) {
    const gy = top + 9 + Math.floor(r() * (bottom - top - 12));
    const gx = Math.round(11 + (r() - 0.5) * widthAt(gy) * 1.4);
    b.put(gx, gy, hex('#fffbe8'));
    b.put(gx, gy + 1, hex('#8a5210'), 0.6);
  }
  outline(b);
  return b;
}

const mixLocal = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
