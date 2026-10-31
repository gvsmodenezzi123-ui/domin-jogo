/**
 * Versão 2.2: a Loja do Valtinho e o porão do Seu Tião em pixel art pintada por código.
 *
 * Fundos (1 pixel = 2 px de CSS, pintados no tamanho do elemento):
 *   paintAwning       o toldo de lona listrado, desbotado, desfiado e rasgado nas pontas
 *   paintShopWall     a parede de azulejo encardido atrás do Valtinho, com a prateleira de garrafas
 *   paintShelfRow     uma prateleira da estante de madeira maciça (fundo, colunas e a tábua em
 *                     2.5D com juntas, manchas de copo, gordura e marcas de faca)
 *   paintCounterFront a frente do balcão, onde ficam os nichos da Bolsa
 *   paintRoughPlank   a placa de madeira tosca com rebites de aço (VOLTAR AO MAPA)
 *   paintCellar       o porão do Seu Tião: tijolo velho, canos enferrujados, teias, chão de pedra
 *
 * Objetos (fundo transparente, com o kit dos talismãs):
 *   almofada de veludo, nicho entalhado, alfinete enferrujado, copo de dados de couro, moeda,
 *   o caixote vermelho do Seu Tião e os três pacotes lacrados em 128×128.
 */
import { paintKit } from './botecoScene.js';
import { spriteKit } from './relicPixels.js';

const { hex, rngOf, buffer } = paintKit;
const { kit, mat, outline } = spriteKit;

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (c) => [clamp(c[0]), clamp(c[1]), clamp(c[2])];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

/** Ruído de valor suave (sem emenda não importa aqui: os fundos são pintados no tamanho certo). */
function noise2(seed, cell) {
  const r = rngOf(seed);
  const g = new Float32Array(64 * 64).map(() => r());
  const at = (x, y) => g[((y & 63) << 6) | (x & 63)];
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

const W4 = {
  hi: hex('#9a6436'),
  mid: hex('#6a4122'),
  lo: hex('#3e2412'),
  deep: hex('#1c0f06'),
};

/** Madeira com veio horizontal (ou vertical), nós e o pontilhado de desgaste. */
function woodAt(x, y, n, tone = W4, light = 0, vertical = false) {
  const u = vertical ? y : x;
  const v = vertical ? x : y;
  const g = Math.sin(v * 1.35 + Math.sin(u * 0.07 + v * 0.2) * 2.2 + n(u * 0.6, v * 2) * 4);
  let l = light + (n(u * 0.25, v * 0.8) - 0.5) * 0.5;
  if (g > 0.82) l -= 0.32;
  else if (g < -0.88) l += 0.18;
  const t = l + (dither(x, y) - 0.5) * 0.2;
  if (t > 0.42) return tone.hi;
  if (t > -0.12) return tone.mid;
  if (t > -0.5) return tone.lo;
  return tone.deep;
}

// ---------------------------------------------------------------------------
// Loja: o toldo
// ---------------------------------------------------------------------------

/** O toldo de lona: listras vinho/bege com dobras, a sanefa recortada, desfiada e rasgada. */
export function paintAwning(w, h, seed = 41) {
  const b = buffer(w, h);
  const r = rngOf(seed);
  const n = noise2(seed, 5);
  const red = { hi: hex('#b8392a'), mid: hex('#8a1f17'), lo: hex('#5a1009'), deep: hex('#2a0604') };
  const cream = { hi: hex('#f4e6c0'), mid: hex('#d8c494'), lo: hex('#a08a5c'), deep: hex('#4e4026') };
  const S = 13; // largura de cada listra
  const body = h - 12; // onde a lona termina e começa a sanefa
  // cada língua da sanefa tem o seu comprimento (umas rasgadas, mais curtas, outras desfiadas)
  const tongues = Array.from({ length: Math.ceil(w / S) + 2 }, () => ({ cut: r() < 0.28 ? 3 + Math.floor(r() * 5) : 0, fray: r() < 0.55, hole: r() < 0.22 ? 2 + r() * 6 : 0 }));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const k = Math.floor(x / S);
      const t = tongues[k];
      const u = (x % S) / S; // 0..1 dentro da listra
      // a ponta arredondada da língua (sanefa)
      const tip = body + 9 - t.cut - (u - 0.5) ** 2 * 14;
      if (y > tip) continue;
      // furinhos de traça/rasgo na sanefa
      if (t.hole && y > body - 2 && Math.abs(u - 0.5) < 0.18 && Math.abs(y - (body + 3 - t.hole * 0.3)) < 1.2) continue;
      const tone = k % 2 ? cream : red;
      // dobras: cada listra é um gomo (claro no meio-esquerda, escuro na emenda)
      let l = 0.25 - Math.abs(u - 0.38) * 1.3;
      // a lona sobe em ondas embaixo (onde pendura) e escurece na sombra de cima
      if (y < 4) l -= 0.5 - y * 0.1;
      if (y > body - 3) l += 0.1 - (y - body + 3) * 0.06;
      // desbotado e sujo (manchas de chuva escorrendo)
      l += (n(x, y * 0.4) - 0.5) * 0.45;
      const v = l + (dither(x, y) - 0.5) * 0.22;
      let c = v > 0.38 ? tone.hi : v > -0.1 ? tone.mid : v > -0.5 ? tone.lo : tone.deep;
      if (n(x * 0.5 + 40, y * 0.15) > 0.72) c = mix(c, hex('#3a2a18'), 0.35);
      b.put(x, y, rgb(c));
    }
  }
  // a costura da barra (pontos) e a linha de sombra onde a sanefa dobra
  for (let x = 0; x < w; x += 1) {
    b.put(x, body - 1, hex('#1a0805'), 0.5);
    if (x % 3 === 0) b.put(x, body + 1, hex('#f8eed0'), 0.35);
  }
  // fiapos pendurados
  tongues.forEach((t, k) => {
    if (!t.fray) return;
    const x0 = k * S + 2 + Math.floor(r() * (S - 4));
    const len = 2 + Math.floor(r() * 5);
    const base = body + 9 - t.cut - 1;
    for (let i = 0; i < len; i += 1) b.put(x0 + (i > 2 ? 1 : 0), base + i, k % 2 ? cream.lo : red.lo, 0.9 - i * 0.08);
  });
  // a barra de ferro no alto, com ferrugem
  for (let x = 0; x < w; x += 1) {
    b.put(x, 0, hex('#2a2420'));
    b.put(x, 1, x % 9 === 0 ? hex('#8a4a20') : hex('#5a524a'));
    b.put(x, 2, hex('#1a1612'), 0.7);
  }
  return b;
}

// ---------------------------------------------------------------------------
// Loja: a parede de azulejo
// ---------------------------------------------------------------------------

/** Azulejo encardido (rachado, um faltando), a prateleira das garrafas e a vinheta. */
export function paintShopWall(w, h, seed = 52) {
  const b = buffer(w, h);
  const r = rngOf(seed);
  const n = noise2(seed, 7);
  const T = 9;
  const missing = new Set([`${Math.floor(w / T) - 2},${2}`, `${1},${Math.floor(h / T) - 3}`]);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const tx = Math.floor(x / T);
      const ty = Math.floor(y / T);
      const ix = x % T;
      const iy = y % T;
      let c;
      if (missing.has(`${tx},${ty}`)) {
        // reboco aparecendo onde caiu o azulejo
        c = mix(hex('#5a4a38'), hex('#3a2e22'), n(x * 2, y * 2));
      } else if (ix === 0 || iy === 0) {
        c = hex('#2a2218'); // rejunte
      } else {
        const tint = (tx * 7 + ty * 3) % 5 === 0 ? hex('#c8d4c0') : hex('#d8d2bc');
        let l = 0.18 - (ix + iy) * 0.025;
        if (ix === 1 || iy === 1) l += 0.25;
        if (ix === T - 1 || iy === T - 1) l -= 0.2;
        c = mix(tint, hex('#1a1208'), Math.max(0, 0.18 - l * 0.4));
      }
      // encardido: escurece embaixo, escorrido de gordura, fumaça no alto
      const grime = 0.5 + (y / h) * 0.3 + (n(x * 0.3, y * 0.08) - 0.5) * 0.5;
      c = mix(c, hex('#20140a'), Math.max(0, Math.min(0.85, grime)));
      b.put(x, y, rgb(c));
    }
  }
  // rachaduras em alguns azulejos
  for (let i = 0; i < 4; i += 1) {
    let x = 4 + Math.floor(r() * (w - 8));
    let y = 3 + Math.floor(r() * (h * 0.6));
    for (let k = 0; k < 7; k += 1) {
      b.put(x, y, hex('#120c06'), 0.8);
      x += r() < 0.5 ? 1 : 0;
      y += 1;
    }
  }
  // a prateleira de garrafas (atrás do Valtinho), meio no escuro
  const shelfY = Math.round(h * 0.42);
  const bottles = ['#2a5a2a', '#6a2a14', '#3a3a1a', '#1e3a4a', '#5a1a1a', '#4a4a3a'];
  for (let x = 4; x < w - 6; x += 5 + Math.floor(r() * 4)) {
    if (Math.abs(x - w / 2) < 22) continue; // atrás da cabeça dele fica vazio
    const bh = 9 + Math.floor(r() * 6);
    const col = hex(bottles[Math.floor(r() * bottles.length)]);
    for (let y = shelfY - bh; y < shelfY; y += 1) {
      const neck = y < shelfY - bh + 4;
      const half = neck ? 0 : 1;
      for (let dx = -half; dx <= half + 1; dx += 1) b.put(x + dx, y, rgb(mix(col, hex('#000000'), dx > half ? 0.4 : 0.15)), 0.85);
    }
    b.put(x, shelfY - bh + 5, hex('#e8e0c0'), 0.35); // o reflexo da lâmpada
  }
  for (let x = 0; x < w; x += 1) {
    b.put(x, shelfY, hex('#7a4a24'));
    b.put(x, shelfY + 1, hex('#4a2a12'));
    b.put(x, shelfY + 2, hex('#1a0c04'));
    b.put(x, shelfY + 3, hex('#000000'), 0.4);
  }
  // vinheta nos cantos
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.hypot((x - w / 2) / (w * 0.62), (y - h * 0.4) / (h * 0.9));
      if (d > 0.55) b.put(x, y, [0, 0, 0], Math.min(0.7, (d - 0.55) * 1.4));
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// Loja: a estante
// ---------------------------------------------------------------------------

/**
 * Uma prateleira da estante: o fundo de tábuas na vertical (escuro, com a sombra da tábua de
 * cima), as colunas laterais e, embaixo, a tábua em 2.5D (o tampo visto de cima e a frente
 * grossa) com juntas, anéis de copo, mancha de gordura e marcas de faca.
 */
export function paintShelfRow(w, h, { seed = 61, board = 9, top = true } = {}) {
  const b = buffer(w, h);
  const r = rngOf(seed);
  const n = noise2(seed, 4);
  const back = { hi: hex('#4a2c16'), mid: hex('#2e1a0c'), lo: hex('#1c0f06'), deep: hex('#0c0603') };
  const post = 5;
  const lip = 4; // altura do tampo (visto de cima)
  const front = board - lip;
  const by = h - board;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let c;
      if (x < post || x >= w - post) {
        // colunas: madeira na vertical, a luz bate na esquerda de cada uma
        const px = x < post ? x : x - (w - post);
        c = woodAt(x, y, n, W4, 0.25 - px * 0.18 - (x >= w - post ? 0.25 : 0), true);
        if (px === post - 1 && x < post) c = W4.deep;
        if (px === 0 && x >= w - post) c = W4.deep;
      } else if (y < by) {
        // o fundo: tábuas verticais de 11 px com o friso, mais escuro em cima (sombra da prateleira de cima)
        const gx = (x - post) % 11;
        let l = -0.1 - (top ? Math.max(0, 1 - y / 10) * 0.7 : 0) + (y / by) * 0.15;
        if (gx === 0) l -= 0.6;
        if (gx === 1) l += 0.25;
        c = woodAt(x, y, n, back, l, true);
        // sombra que as colunas fazem no fundo
        if (x < post + 3 || x >= w - post - 3) c = mix(c, hex('#000000'), 0.35);
      } else if (y < by + lip) {
        // o tampo, visto de cima: claro, veio no comprimento
        c = woodAt(x, y, n, { hi: hex('#b07a46'), mid: hex('#8a5a30'), lo: hex('#5e3a1c'), deep: hex('#2e1a0a') }, 0.25 - (y - by) * 0.08);
        if (y === by) c = hex('#c8925a');
      } else {
        // a frente da tábua
        c = woodAt(x, y, n, W4, -0.05 - (y - by - lip) * (0.6 / front));
        if (y === h - 1) c = W4.deep;
      }
      b.put(x, y, c);
    }
  }
  // juntas da tábua (emenda) e as cabeças dos pregos na frente
  for (let x = post + 30 + Math.floor(r() * 20); x < w - post - 10; x += 46 + Math.floor(r() * 30)) {
    for (let y = by; y < h; y += 1) b.put(x, y, W4.deep);
    for (let y = by; y < by + lip; y += 1) b.put(x + 1, y, hex('#c8925a'), 0.5);
    b.put(x - 3, by + lip + 2, hex('#1a1210'));
    b.put(x + 3, by + lip + 2, hex('#1a1210'));
    b.put(x - 3, by + lip + 1, hex('#8a8070'), 0.7);
  }
  // anéis de copo e manchas de umidade no tampo, gordura e marcas de faca na frente
  for (let i = 0; i < 2; i += 1) {
    const cx = post + 10 + r() * (w - 2 * post - 20);
    for (let a = 0; a < Math.PI * 2; a += 0.12) b.put(cx + Math.cos(a) * 5, by + 2 + Math.sin(a) * 1.4, hex('#2e1a0a'), 0.5);
  }
  for (let i = 0; i < 2; i += 1) {
    const cx = post + 8 + r() * (w - 2 * post - 16);
    b.ellipse(cx, by + lip + front * 0.5, 4 + r() * 3, 1.6, hex('#1a0c04'), 0.32);
  }
  for (let i = 0; i < 5; i += 1) {
    const x = post + 6 + Math.floor(r() * (w - 2 * post - 12));
    const y = by + lip + 1 + Math.floor(r() * Math.max(1, front - 3));
    b.line(x, y, x + 2, y + 1, hex('#c8925a'), 0.55);
    b.line(x, y + 1, x + 2, y + 2, W4.deep, 0.6);
  }
  // sombra embaixo da tábua (cai na prateleira de baixo) fica com a próxima fileira
  return b;
}

/** A frente do balcão: pranchas grossas na horizontal, a quina de cima acesa. */
export function paintCounterFront(w, h, seed = 71) {
  const b = buffer(w, h);
  const n = noise2(seed, 4);
  const r = rngOf(seed);
  const top = { hi: hex('#c8925a'), mid: hex('#9a6436'), lo: hex('#6a4122'), deep: hex('#2e1a0a') };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let c;
      if (y < 6) c = woodAt(x, y, n, top, 0.3 - y * 0.1);
      else if (y === 6) c = W4.deep;
      else {
        const gy = (y - 7) % 14;
        let l = -0.05 - ((y - 7) / h) * 0.3;
        if (gy === 0) l -= 0.7;
        if (gy === 1) l += 0.3;
        c = woodAt(x, y, n, W4, l);
      }
      b.put(x, y, c);
    }
  }
  b.line(0, 0, w, 0, hex('#e8b07a'));
  for (let i = 0; i < 3; i += 1) {
    const cx = 10 + r() * (w - 20);
    for (let a = 0; a < Math.PI * 2; a += 0.15) b.put(cx + Math.cos(a) * 6, 2.5 + Math.sin(a) * 1.6, hex('#3a2010'), 0.45);
  }
  return b;
}

/**
 * A placa de madeira tosca: duas tábuas escuras pregadas lado a lado (rachaduras, lascas) e
 * os rebites de aço em relevo nos cantos e na emenda.
 */
export function paintRoughPlank(w, h, seed = 81) {
  const b = buffer(w, h);
  const n = noise2(seed, 4);
  const r = rngOf(seed);
  const dark = { hi: hex('#8a5a32'), mid: hex('#5a361a'), lo: hex('#36200e'), deep: hex('#160b04') };
  const seam = Math.round(h / 2);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const corner = (x < 2 && y < 2) || (x < 2 && y >= h - 2) || (x >= w - 2 && y < 2) || (x >= w - 2 && y >= h - 2);
      if (corner) continue;
      const half = y < seam ? y : y - seam;
      const hh = y < seam ? seam : h - seam;
      let l = 0.2 - (half / hh) * 0.55;
      if (half === 0) l += 0.45;
      if (half === hh - 1) l -= 0.6;
      let c = woodAt(x, y, n, dark, l + (y < seam ? 0 : -0.05));
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) c = hex('#0b0603');
      b.put(x, y, c);
    }
  }
  // rachaduras no veio
  for (let i = 0; i < 3; i += 1) {
    let x = 6 + Math.floor(r() * (w - 20));
    const y0 = r() < 0.5 ? 2 + Math.floor(r() * (seam - 4)) : seam + 2 + Math.floor(r() * (h - seam - 4));
    for (let k = 0; k < 8 + r() * 10; k += 1) {
      b.put(x, y0 + Math.round(Math.sin(k * 0.6)), hex('#0b0603'));
      x += 1;
    }
  }
  // rebites de aço em relevo
  const rivet = (x, y) => {
    b.ellipse(x + 0.5, y + 0.5, 2, 2, hex('#1a1c1e'));
    b.ellipse(x, y, 1.5, 1.5, hex('#8a949c'));
    b.put(x - 1, y - 1, hex('#e8f0f4'));
    b.put(x + 1, y + 1, hex('#3a4046'));
  };
  for (const [x, y] of [
    [4, 4],
    [w - 5, 4],
    [4, h - 5],
    [w - 5, h - 5],
    [Math.round(w * 0.33), seam],
    [Math.round(w * 0.67), seam],
  ])
    rivet(x, y);
  return b;
}

// ---------------------------------------------------------------------------
// Porão do Seu Tião
// ---------------------------------------------------------------------------

/** Tijolo velho e úmido, dois canos enferrujados descendo, teias nos cantos e o chão de pedra. */
export function paintCellar(w, h, seed = 91) {
  const b = buffer(w, h);
  const r = rngOf(seed);
  const n = noise2(seed, 6);
  const floorY = Math.round(h * 0.8);
  const BW = 12;
  const BH = 5;
  const brickTone = (bx, by) => {
    const k = (bx * 13 + by * 7) % 6;
    return hex(['#6a2e1c', '#5a2616', '#7a3a22', '#4e2014', '#6e3420', '#58281a'][k]);
  };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let c;
      if (y >= floorY) {
        // chão de pedra: lajes irregulares, mais escuro longe da luz
        const fy = y - floorY;
        const row = Math.floor(fy / 5);
        const off = (row % 2) * 7;
        const jx = (x + off) % 14;
        let l = -0.15 - Math.abs(x - w / 2) / w + fy * 0.02;
        if (jx === 0 || fy % 5 === 0) l -= 0.5;
        c = mix(hex('#4a4640'), hex('#1a1814'), Math.max(0, Math.min(1, 0.45 - l * 0.6)));
        c = mix(c, hex('#000000'), (n(x, y) - 0.5) * 0.4 + 0.1);
      } else {
        const row = Math.floor(y / BH);
        const off = (row % 2) * (BW / 2);
        const bx = Math.floor((x + off) / BW);
        const ix = (x + off) % BW;
        const iy = y % BH;
        if (ix === 0 || iy === 0) c = hex('#2a2420');
        else {
          c = brickTone(bx, row);
          if (iy === 1) c = mix(c, hex('#c8805a'), 0.25);
          if (iy === BH - 1 || ix === BW - 1) c = mix(c, hex('#000000'), 0.3);
          // tijolo lascado
          if ((bx * 5 + row * 3) % 11 === 0 && ix < 4 && iy < 3) c = hex('#3a2a20');
        }
        // umidade: manchas esverdeadas embaixo, salitre
        const damp = n(x * 0.4, y * 0.25);
        if (damp > 0.62 && y > h * 0.35) c = mix(c, hex('#2a3a24'), (damp - 0.62) * 1.6);
        if (damp < 0.14) c = mix(c, hex('#c8c0a8'), 0.07);
        // a parede escurece longe do foco de luz do teto
        const d = Math.hypot((x - w / 2) / (w * 0.5), (y - h * 0.2) / (h * 0.75));
        c = mix(c, hex('#050302'), Math.min(0.85, 0.25 + d * 0.55));
      }
      b.put(x, y, rgb(c));
    }
  }
  // o rodapé de sombra entre parede e chão
  for (let x = 0; x < w; x += 1) {
    b.put(x, floorY - 1, hex('#000000'), 0.6);
    b.put(x, floorY - 2, hex('#000000'), 0.3);
  }
  // canos enferrujados descendo (com as braçadeiras e o escorrido de ferrugem)
  for (const [px, pw] of [
    [Math.round(w * 0.08), 4],
    [Math.round(w * 0.86), 3],
  ]) {
    for (let y = 0; y < floorY; y += 1) {
      for (let dx = 0; dx < pw; dx += 1) {
        const t = dx / (pw - 1 || 1);
        let c = t < 0.35 ? hex('#8a5a3a') : t < 0.7 ? hex('#5a3a28') : hex('#2a1a10');
        if (n(px + dx, y * 0.5) > 0.66) c = mix(c, hex('#a8501a'), 0.5);
        b.put(px + dx, y, c);
      }
      if (y % 22 === 10) {
        b.rect(px - 1, y, pw + 2, 2, hex('#3a3632'));
        b.put(px - 1, y, hex('#8a8680'));
      }
    }
    for (let y = 18; y < floorY; y += 9) if (r() < 0.6) b.line(px + pw, y, px + pw, y + 3 + r() * 5, hex('#7a3a14'), 0.6);
  }
  // teias de aranha nos cantos de cima
  const web = (cx, cy, dir) => {
    const c = hex('#d8d4c8');
    for (let a = 0; a <= 5; a += 1) {
      const ang = (a / 5) * (Math.PI / 2);
      b.line(cx, cy, cx + dir * Math.cos(ang) * 22, cy + Math.sin(ang) * 22, c, 0.32);
    }
    for (let rr = 5; rr < 22; rr += 4.5) {
      for (let a = 0; a < Math.PI / 2; a += 0.05) b.put(cx + dir * Math.cos(a) * (rr + Math.sin(a * 6) * 0.8), cy + Math.sin(a) * (rr + Math.sin(a * 6) * 0.8), c, 0.22);
    }
  };
  web(0, 0, 1);
  web(w - 1, 0, -1);
  // a luminária no teto (o foco sai dela)
  b.rect(Math.round(w / 2) - 1, 0, 2, 5, hex('#1a1612'));
  b.ellipse(w / 2, 6, 5, 2.2, hex('#2a2620'));
  b.ellipse(w / 2, 7, 3, 1.2, hex('#fff2c0'));
  return b;
}

// ---------------------------------------------------------------------------
// Objetos com o kit
// ---------------------------------------------------------------------------

/** Pinta um objeto num buffer novo com o kit e contorna (fundo transparente). */
function sprite(w, h, draw, { ink = null, k = 0.78 } = {}) {
  const b = buffer(w, h);
  draw(kit(b), b);
  outline(b, ink ?? hex('#120a06'), k);
  return b;
}

/** A almofada redonda de veludo vermelho (vista em 2.5D): tufos, o botão e o cordão dourado. */
export function paintCushion(seed = 3) {
  return sprite(44, 22, (k) => {
    const velvet = mat('#8a1622');
    const r = rngOf(seed);
    // a lateral (a espessura) e o tampo
    k.ell(22, 13, 20.5, 7.5, mat('#4a0810'), { flat: true, light: -0.35, spec: false });
    k.ell(22, 10.5, 20.5, 7.5, velvet, { flat: true, light: 0.1, spec: false });
    // volume do veludo: o miolo afunda no botão, as bordas estufam
    k.each(1, 3, 43, 18, (x, y) => {
      const dx = (x + 0.5 - 22) / 20.5;
      const dy = (y + 0.5 - 10.5) / 7.5;
      const d = Math.hypot(dx, dy);
      if (d > 1) return null;
      const bump = Math.sin(d * Math.PI) * 0.6 - dx * 0.35 - dy * 0.45 - 0.15 + (r() - 0.5) * 0.12;
      return k.shade(velvet, bump, x, y);
    });
    // os vincos dos tufos até o botão
    for (const a of [0.4, 1.4, 2.4, 3.6, 4.6, 5.6]) k.line(22 + Math.cos(a) * 4, 10.5 + Math.sin(a) * 1.5, 22 + Math.cos(a) * 15, 10.5 + Math.sin(a) * 5.5, velvet.lo, 0.6);
    k.ell(22, 10.5, 2, 1.3, mat('#c9962e'), { spec: true, specR: 0.2 });
    // o cordão dourado na quina
    k.ring(22, 11.6, 20, 0.7, mat('#c9962e'), { sy: 0.37, spec: false });
  });
}

/** O nicho entalhado no balcão (2.5D): borda clara, paredes de dentro e o fundo na sombra. */
export function paintNiche() {
  const b = buffer(26, 24);
  const k = kit(b);
  k.box(0, 0, 26, 24, mat('#8a5a30'), { r: 2 });
  // a cavidade: em cima o fundo some na sombra, embaixo o chão do nicho pega luz
  k.each(3, 3, 22, 20, (x, y) => {
    const t = (y - 3) / 17;
    const side = Math.min(x - 3, 22 - x);
    let c = mix(hex('#0a0503'), hex('#3a2010'), Math.max(0, t - 0.35) * 1.4);
    if (side < 2) c = mix(c, hex('#000000'), 0.4);
    if (y >= 18) c = mix(hex('#5a3418'), hex('#2a1608'), (22 - y) / 4);
    return rgb(c);
  });
  for (let x = 3; x < 23; x += 1) k.px(x, 3, hex('#000000'));
  for (let y = 3; y < 21; y += 1) {
    k.px(3, y, hex('#1a0c04'));
    k.px(22, y, hex('#4a2a12'), 0.8);
  }
  outline(b);
  return b;
}

/** O alfinete enferrujado que prende o bilhete. */
export function paintPin() {
  return sprite(9, 12, (k) => {
    k.bar(4.5, 6, 4.5, 11, 1.2, mat('#8a8680', { cool: true }), { spec: false });
    k.ell(4.5, 4, 3.6, 3.4, mat('#a0461c'));
    k.px(3, 2, hex('#f0c090'));
    k.px(6, 5, hex('#5a2008'));
  });
}

/** O copo de couro de dados, gasto, com a costura e dois dados escapando. */
export function paintDiceCup() {
  return sprite(40, 40, (k) => {
    const leather = mat('#6a3a1c');
    k.shadow(20, 36, 16, 2.4);
    // o copo inclinado: tronco de cone com a boca elíptica em cima
    k.area(6, 6, 32, 34, (x, y) => {
      const t = (y - 8) / 25;
      const half = 11.5 - t * 3;
      return y >= 8 && y <= 33 && Math.abs(x - 19) <= half;
    }, leather, { light: 0.2 });
    k.each(6, 6, 32, 34, (x, y) => {
      const t = (y - 8) / 25;
      const half = 11.5 - t * 3;
      if (!(y >= 8 && y <= 33 && Math.abs(x + 0.5 - 19) <= half)) return null;
      const u = (x + 0.5 - 19) / half;
      if (u > 0.5) return k.shade(leather, -0.55, x, y);
      if (u < -0.45 && u > -0.75) return leather.hi;
      return null;
    });
    // a costura e as faixas gastas
    for (let y = 11; y < 33; y += 2) k.px(19 + Math.sin(y) * 0.4, y, hex('#e8d0a0'), 0.8);
    k.line(8, 31, 30, 31, leather.deep);
    k.line(8, 30, 30, 30, leather.hi, 0.5);
    // a boca
    k.ell(19, 8.5, 11.5, 3.6, mat('#3a1c0a'), { flat: true, light: 0.1, spec: false });
    k.ell(19, 9.5, 9, 2.4, mat('#140804'), { flat: true, light: -0.5, spec: false });
    // dois dados na frente
    const die = (cx, cy) => {
      k.box(cx - 3, cy - 3, 7, 7, mat('#f0e8d4'), { r: 1 });
      k.px(cx, cy, hex('#c8201a'));
    };
    die(31, 31);
    die(26, 35);
    k.px(25, 34, hex('#1a1008'));
    k.px(27, 36, hex('#1a1008'));
  });
}

/** Moeda de ouro (12×12), com o brilho e a borda serrilhada. */
export function paintCoin() {
  return sprite(12, 12, (k) => {
    k.ell(6, 6, 5.2, 5.2, mat('#d8a838'));
    k.ring(6, 6, 3.4, 0.6, mat('#d8a838'), { spec: false, light: -0.4 });
    k.px(4, 3, hex('#ffffff'));
  });
}

/** O caixote de feira vermelho e gasto, com a chave de boca, o pano de óleo e a chave de fenda. */
export function paintTiaoCrate() {
  return sprite(76, 44, (k) => {
    const red = mat('#a8261c');
    const raw = mat('#8a6a42');
    // o caixote: ripas horizontais com fresta, a tinta descascando mostrando a madeira
    for (let i = 0; i < 4; i += 1) {
      const y = 14 + i * 7.5;
      k.box(3, y, 70, 6, red, { r: 1 });
    }
    k.each(3, 14, 73, 43, (x, y) => (k.solid(x, y) && ((x * 7 + y * 3) % 23 === 0 || (x > 50 && x < 58 && y > 30)) ? raw.mid : null));
    // os montantes dos cantos
    k.box(2, 12, 6, 32, mat('#8a1c14'), { r: 1 });
    k.box(68, 12, 6, 32, mat('#8a1c14'), { r: 1 });
    // a tampa (o tampo onde ele apoia as coisas)
    k.box(1, 9, 74, 6, mat('#c03a2a'), { r: 1, light: 0.15 });
    // o pano sujo de óleo jogado por cima
    k.poly(
      [
        [40, 4],
        [58, 3],
        [62, 12],
        [56, 18],
        [44, 15],
      ],
      mat('#4a4a46'),
      { bevel: true },
    );
    k.ell(50, 9, 4, 2, mat('#1a1a18'), { flat: true, spec: false });
    // a chave de boca
    k.bar(10, 8, 30, 5, 2.4, mat('#a4b0b8', { cool: true }));
    k.ring(9, 8.5, 2.6, 1, mat('#a4b0b8', { cool: true }), { clip: (x) => x < 10 });
    k.ring(31, 4.5, 2.6, 1, mat('#a4b0b8', { cool: true }), { clip: (x) => x > 30 });
    // a chave de fenda
    k.bar(64, 6, 72, 3, 2, mat('#e8a020'));
    k.bar(57, 8, 64, 6, 1.2, mat('#a4b0b8', { cool: true }), { spec: false });
  });
}

// ---------------------------------------------------------------------------
// Os pacotes lacrados (128×128)
// ---------------------------------------------------------------------------

/** Brilho do plástico/celofane: faixas diagonais claras. */
function wrapShine(k, x0, y0, x1, y1, inside) {
  const marks = [];
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!inside(x, y)) continue;
      const d = (x - x0 + (y - y0) * 0.55) % 52;
      if (d > 6 && d < 7.6) marks.push([x, y, 0.42]);
      else if (d > 9 && d < 9.8) marks.push([x, y, 0.22]);
    }
  }
  for (const [x, y, a] of marks) k.px(x, y, hex('#ffffff'), a);
}

const PACK_DRAW = {
  /** Maço Paraguaio: o maço em pé, de três quartos, a tampa aberta com o papel-alumínio e os filtros. */
  macoParaguaio(k) {
    const { hex: hx } = k;
    k.shadow(64, 121, 40, 5);
    const red = mat('#c42c26');
    const white = mat('#f0ece2');
    // o corpo (cubo alto em perspectiva)
    const f = k.cube(60, 30, 34, 70, white, white, mat('#c8c4b8'));
    // a faixa vermelha e o brasão dourado na frente
    k.poly([f.left(0, 0.42), f.left(1, 0.42), f.left(1, 1), f.left(0, 1)], red, { light: (x, y) => 0.1 - (y - 70) * 0.008 });
    k.poly([f.right(0, 0.42), f.right(1, 0.42), f.right(1, 1), f.right(0, 1)], mat('#8a1a14'), { light: () => -0.25 });
    const [ex, ey] = f.left(0.5, 0.3);
    k.ell(ex, ey, 9, 8, mat('#d8a838'));
    k.ell(ex, ey, 6, 5.5, red, { flat: true, light: 0.2, spec: false });
    k.poly(
      [
        [ex - 3, ey + 2],
        [ex, ey - 4],
        [ex + 3, ey + 2],
      ],
      mat('#f4d860'),
    );
    // o fio dourado do lacre e a tampa aberta
    const [lx0, ly0] = f.left(0, 0.12);
    const [lx1, ly1] = f.left(1, 0.12);
    k.line(lx0, ly0, lx1, ly1, hx('#f4d860'));
    k.line(lx0, ly0 + 1, lx1, ly1 + 1, hx('#8a6a14'));
    // filtros saindo pela boca (alaranjados, com o pontinho)
    const [tx, ty] = f.top(0.55, 0.5);
    for (let i = 0; i < 4; i += 1) {
      const cx = tx - 14 + i * 7;
      const cy = ty - 6 - (i % 2) * 4;
      k.cylV(cx - 3, cy, 6, 12, mat('#d88a3a'), { ry: 1.6, capMat: mat('#e8c890') });
      k.px(cx, cy, hx('#8a5a2a'));
    }
    // o papel-alumínio dobrado
    k.poly(
      [
        [tx - 22, ty + 2],
        [tx - 6, ty - 4],
        [tx + 4, ty + 6],
        [tx - 14, ty + 12],
      ],
      mat('#c8ccd0', { cool: true, gloss: 0.95 }),
      { bevel: true },
    );
    // o celofane
    wrapShine(k, 20, 20, 110, 118, (x, y) => k.solid(x, y));
  },

  /** Saco de pão de papel pardo, amassado em cima, com as pedras de dominó escapando. */
  sacoPedras(k) {
    const { hex: hx } = k;
    k.shadow(64, 121, 42, 5);
    const kraft = mat('#c89a5a');
    // as pedras aparecendo na boca (atrás do papel)
    const tile = (cx, cy, ang, pips) => {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const P = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
      k.poly([P(-8, -15), P(8, -15), P(8, 15), P(-8, 15)], mat('#ece2c6'), { bevel: true });
      const [mx0, my0] = P(-7, 0);
      const [mx1, my1] = P(7, 0);
      k.line(mx0, my0, mx1, my1, hx('#6a5434'));
      for (const [u, v] of pips) {
        const [px, py] = P(u, v);
        k.b.ellipse(px, py, 1.6, 1.6, hx('#1a1008'));
      }
    };
    tile(46, 30, -0.35, [
      [-3, -9],
      [3, -5],
      [0, 7],
    ]);
    tile(80, 26, 0.3, [
      [0, -8],
      [-3, 5],
      [3, 5],
      [-3, 10],
      [3, 10],
    ]);
    tile(64, 22, 0.05, [
      [-3, -10],
      [3, -10],
      [-3, -4],
      [3, -4],
      [0, 8],
    ]);
    // o saco: trapézio com a boca franzida e vincos
    k.area(18, 34, 110, 120, (x, y) => {
      const t = (y - 36) / 82;
      const half = 40 + t * 6 + Math.sin(x * 0.5) * (y < 46 ? 2.5 : 0);
      return y >= 36 + Math.abs(Math.sin(x * 0.35)) * 4 && y <= 118 && Math.abs(x - 64) <= half;
    }, kraft, { light: 0.2 });
    // volume: a lateral direita na sombra e a dobra do fundo
    k.each(18, 34, 110, 120, (x, y) => {
      if (!k.solid(x, y)) return null;
      const u = (x - 64) / 44;
      if (u > 0.55) return k.shade(kraft, -0.5, x, y);
      if (y > 110) return k.shade(kraft, -0.35, x, y);
      return null;
    });
    for (const [x0, y0, x1, y1] of [
      [36, 50, 42, 100],
      [84, 48, 90, 104],
      [58, 60, 62, 96],
    ]) {
      k.line(x0, y0, x1, y1, kraft.lo, 0.7);
      k.line(x0 - 1, y0, x1 - 1, y1, kraft.hi, 0.5);
    }
    // a mancha de gordura e o carimbo da padaria
    k.ell(44, 88, 9, 7, mat('#8a6a3a'), { flat: true, light: -0.1, spec: false });
    k.ring(76, 80, 10, 1.2, mat('#3a3ac8', { cool: true }), { spec: false });
    k.line(70, 80, 82, 80, hx('#3a3ac8'));
    k.line(72, 84, 80, 84, hx('#3a3ac8'));
    // o barbante amarrado na boca
    const twine = mat('#e0c890');
    k.bar(26, 46, 102, 44, 2.2, twine, { spec: false });
    k.ell(66, 46, 4, 3, twine, { spec: false });
    k.bar(66, 48, 60, 60, 1.6, twine, { spec: false });
    k.bar(67, 48, 74, 60, 1.6, twine, { spec: false });
  },

  /** Engradado de madeira amarrado com corda, palha escapando e o carimbo de carga. */
  engradadoJumbo(k) {
    const { hex: hx } = k;
    k.shadow(64, 122, 46, 5);
    const pine = mat('#b8864a');
    const dark = mat('#7a5428');
    const f = k.cube(64, 14, 44, 56, mat('#c8965a'), pine, dark);
    // as ripas: frestas na frente e no lado
    for (let v = 0.25; v < 1; v += 0.25) {
      const [ax, ay] = f.left(0, v);
      const [bx, by] = f.left(1, v);
      k.line(ax, ay, bx, by, hx('#2a1806'));
      k.line(ax, ay + 1, bx, by + 1, pine.hi, 0.6);
      const [cx, cy] = f.right(0, v);
      const [dx, dy] = f.right(1, v);
      k.line(cx, cy, dx, dy, hx('#1a0e04'));
    }
    // os montantes das quinas
    for (const face of [f.left, f.right]) {
      for (const u of [0.04, 0.96]) {
        const [ax, ay] = face(u, 0);
        const [bx, by] = face(u, 1);
        k.bar(ax, ay, bx, by, 4, face === f.left ? mat('#9a6a36') : mat('#5a3a18'), { spec: false });
      }
    }
    // a palha escapando pelas frestas da tampa e pelas ripas (tufos curtos)
    const straw = (x, y, dir) => {
      for (let i = 0; i < 5; i += 1) {
        const a = dir + (i - 2) * 0.35;
        const len = 4 + ((i * 5 + Math.round(x)) % 5);
        k.line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, hx(i % 2 ? '#e8c860' : '#b89038'));
      }
    };
    for (const [u, v] of [
      [0.15, 0.2],
      [0.8, 0.3],
      [0.3, 0.85],
      [0.75, 0.75],
    ]) {
      const [x, y] = f.top(u, v);
      straw(x, y, -Math.PI / 2);
    }
    for (const v of [0.25, 0.75]) {
      const [x, y] = f.left(0.22, v);
      straw(x, y, Math.PI * 0.85);
      const [x2, y2] = f.right(0.7, v);
      straw(x2, y2, 0.2);
    }
    // a corda cruzada amarrando tudo
    const rope = mat('#d8b878');
    const [l0x, l0y] = f.left(0.5, 0);
    const [l1x, l1y] = f.left(0.5, 1);
    k.bar(l0x, l0y, l1x, l1y, 3.2, rope, { spec: false });
    const [r0x, r0y] = f.right(0.5, 0);
    const [r1x, r1y] = f.right(0.5, 1);
    k.bar(r0x, r0y, r1x, r1y, 3.2, rope, { spec: false });
    const [t0x, t0y] = f.top(0, 0.5);
    const [t1x, t1y] = f.top(1, 0.5);
    k.bar(t0x, t0y, t1x, t1y, 3, rope, { spec: false });
    for (let i = 0; i < 12; i += 1) {
      const t = i / 12;
      k.px(l0x + (l1x - l0x) * t, l0y + (l1y - l0y) * t, rope.lo);
    }
    k.ell(l0x, l0y + 2, 4, 3, rope, { spec: false });
    // o carimbo "FRÁGIL" em preto (só a forma) e o número da carga
    const [sx, sy] = f.left(0.5, 0.62);
    k.b.rect(sx - 12, sy - 3, 24, 7, hx('#1a1008'), 0.75);
    k.b.rect(sx - 10, sy - 1, 20, 3, hx('#b8864a'), 0.6);
    const [nx, ny] = f.right(0.5, 0.35);
    k.b.ellipse(nx, ny, 5, 5, hx('#1a1008'), 0.6);
  },
};

/** Um dos três pacotes lacrados da Loja, em 128×128. */
export function paintPack(id) {
  const draw = PACK_DRAW[id] ?? PACK_DRAW.macoParaguaio;
  return sprite(128, 128, (k) => draw(k));
}

export const PACK_PX = 128;

/**
 * Papel pardo (48×48, repete): fibras curtas claras e escuras, manchas de mão e o pontilhado
 * do papel de embrulho. `dark` dá o papel encardido do Mercado Negro.
 */
export function paintKraft(dark = false, seed = 101) {
  const S = 48;
  const b = buffer(S, S);
  const r = rngOf(seed + (dark ? 7 : 0));
  const base = dark ? hex('#4a3a2a') : hex('#c9a56b');
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      // manchas periódicas (repetem sem emenda) e o pontilhado do papel
      const m = Math.sin((x / S) * Math.PI * 4 + Math.sin((y / S) * Math.PI * 2) * 1.5) * 0.5 + Math.sin((y / S) * Math.PI * 6) * 0.3;
      let c = mix(base, m > 0 ? hex(dark ? '#5e4a36' : '#dcbc84') : hex(dark ? '#32261a' : '#a8844c'), Math.abs(m) * 0.35);
      const g = r();
      if (g < 0.06) c = mix(c, hex('#000000'), 0.18);
      else if (g > 0.95) c = mix(c, hex('#ffffff'), 0.15);
      b.put(x, y, rgb(c));
    }
  }
  for (let i = 0; i < 26; i += 1) {
    const x = Math.floor(r() * S);
    const y = Math.floor(r() * S);
    const light = r() < 0.5;
    for (let k = 0; k < 3 + Math.floor(r() * 3); k += 1) b.put((x + k) % S, (y + (k > 2 ? 1 : 0)) % S, light ? hex(dark ? '#6e5a44' : '#ead2a0') : hex(dark ? '#221810' : '#8a6a3a'), 0.6);
  }
  return b;
}

// ---------------------------------------------------------------------------
// Mercado Negro: o beco do Corvo
// ---------------------------------------------------------------------------

/**
 * O beco molhado: tijolo escuro brilhando de chuva (o vermelho do neon batendo de cima), a
 * porta de ferro atrás do Corvo, o cano com a calha, sacos de lixo no canto e as poças no
 * chão refletindo o letreiro.
 */
export function paintAlley(w, h, seed = 111) {
  const b = buffer(w, h);
  const r = rngOf(seed);
  const n = noise2(seed, 6);
  const groundY = Math.round(h * 0.78);
  const BW = 11;
  const BH = 5;
  const door = { x0: Math.round(w / 2 - 26), x1: Math.round(w / 2 + 26), y0: Math.round(h * 0.16) };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let c;
      if (y >= groundY) {
        // o chão de paralelepípedo molhado
        const fy = y - groundY;
        const row = Math.floor(fy / 4);
        const jx = (x + (row % 2) * 4) % 8;
        let l = -0.2 + fy * 0.015;
        if (jx === 0 || fy % 4 === 0) l -= 0.45;
        c = mix(hex('#3a3440'), hex('#0e0c12'), Math.max(0, Math.min(1, 0.5 - l)));
      } else if (x >= door.x0 && x <= door.x1 && y >= door.y0) {
        // a porta de ferro de enrolar, com ferrugem
        const fy = y - door.y0;
        let l = -0.25 - Math.abs(x - w / 2) / 60;
        if (fy % 4 === 0) l -= 0.4;
        if (fy % 4 === 1) l += 0.2;
        c = mix(hex('#4a4650'), hex('#121016'), Math.max(0, Math.min(1, 0.55 - l)));
        if (n(x * 3, y * 1.4) > 0.8) c = mix(c, hex('#6a2a12'), 0.4);
        if (x === door.x0 || x === door.x1) c = hex('#08070a');
      } else {
        const row = Math.floor(y / BH);
        const off = (row % 2) * 5;
        const bx = Math.floor((x + off) / BW);
        const ix = (x + off) % BW;
        const iy = y % BH;
        if (ix === 0 || iy === 0) c = hex('#120a0c');
        else {
          c = hex(['#3a1a1a', '#321616', '#42201e', '#2c1414'][(bx * 7 + row * 3) % 4]);
          // o brilho molhado na quina de cima de cada tijolo (vermelho do neon)
          if (iy === 1) c = mix(c, hex('#c84040'), 0.22 + (1 - y / h) * 0.2);
        }
        // escorridos de chuva
        if (n(x * 2.5, y * 0.12) > 0.78) c = mix(c, hex('#5a6a7a'), 0.18);
      }
      // a luz vermelha do neon vem de cima e o fundo afunda no escuro
      const d = Math.hypot((x - w / 2) / (w * 0.6), (y - h * 0.08) / (h * 0.9));
      c = mix(c, hex('#050204'), Math.min(0.8, 0.2 + d * 0.55));
      b.put(x, y, rgb(c));
    }
  }
  // as poças refletindo o neon
  for (let i = 0; i < 4; i += 1) {
    const cx = 10 + r() * (w - 20);
    const cy = groundY + 4 + r() * (h - groundY - 8);
    const rx = 8 + r() * 12;
    for (let y = Math.floor(cy - 2); y <= cy + 2; y += 1) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x += 1) {
        const dd = ((x - cx) / rx) ** 2 + ((y - cy) / 2.4) ** 2;
        if (dd > 1) continue;
        b.put(x, y, hex('#0a0810'), 0.85);
        if ((x + y) % 3 === 0 && dd < 0.6) b.put(x, y, hex('#ff3a4a'), 0.35 + (1 - dd) * 0.3);
      }
    }
  }
  // o cano com a calha e os sacos de lixo no canto direito
  const px = Math.round(w * 0.12);
  for (let y = 0; y < groundY; y += 1) {
    b.put(px, y, hex('#1a1a20'));
    b.put(px + 1, y, hex('#5a5a66'));
    b.put(px + 2, y, hex('#3a3a44'));
    b.put(px + 3, y, hex('#141418'));
    if (y % 20 === 6) b.rect(px - 1, y, 6, 2, hex('#2a2a32'));
  }
  b.rect(px - 2, groundY - 3, 8, 3, hex('#2a2a32'));
  for (const [cx, cy, rx, ry] of [
    [w - 18, groundY - 2, 12, 8],
    [w - 6, groundY + 1, 9, 7],
    [w - 30, groundY + 2, 8, 6],
  ]) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y += 1) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const l = -dx * 0.4 - dy * 0.5 + (dither(x, y) - 0.5) * 0.3;
        b.put(x, y, l > 0.2 ? hex('#3a3a44') : l > -0.25 ? hex('#22222a') : hex('#101014'));
      }
    }
    b.put(cx - rx * 0.4, cy - ry * 0.5, hex('#8a8a9a'));
  }
  return b;
}

/**
 * O forro do sobretudo aberto: as duas abas de couro nas laterais, o cetim roxo-sangue
 * acolchoado em losangos no meio, a costura e as três presilhas de onde os talismãs pendem.
 */
export function paintCoatLining(w, h, seed = 121) {
  const b = buffer(w, h);
  const n = noise2(seed, 5);
  const leather = { hi: hex('#4a4250'), mid: hex('#2a2430'), lo: hex('#16121a'), deep: hex('#08060a') };
  const satin = { hi: hex('#8a2a4a'), mid: hex('#5a1630'), lo: hex('#360a1c'), deep: hex('#1a040c') };
  const flap = Math.max(8, Math.round(w * 0.07));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let c;
      const left = x < flap + Math.sin(y * 0.12) * 1.5;
      const right = x > w - 1 - flap - Math.sin(y * 0.1 + 1) * 1.5;
      if (left || right) {
        // as abas de couro gasto, com a dobra
        const u = left ? x / flap : (w - 1 - x) / flap;
        let l = (left ? 0.2 : -0.25) + (u > 0.75 ? -0.45 : 0) + (n(x, y * 0.5) - 0.5) * 0.4;
        if (u < 0.15) l += 0.35;
        const v = l + (dither(x, y) - 0.5) * 0.2;
        c = v > 0.38 ? leather.hi : v > -0.1 ? leather.mid : v > -0.5 ? leather.lo : leather.deep;
      } else {
        // cetim acolchoado: losangos com a costura e o brilho do tecido
        const u = (x - flap) / (w - 2 * flap);
        const a = (x + y) % 14;
        const bq = (x - y + 1400) % 14;
        let l = Math.sin(u * Math.PI * 3 + y * 0.05) * 0.25 - (y / h) * 0.3;
        const dd = Math.min(a, 14 - a, bq, 14 - bq);
        l += dd < 1 ? -0.55 : dd < 3 ? 0.18 : 0;
        const v = l + (dither(x, y) - 0.5) * 0.2;
        c = v > 0.38 ? satin.hi : v > -0.1 ? satin.mid : v > -0.5 ? satin.lo : satin.deep;
        if (dd < 1 && (x + y) % 4 === 0) c = hex('#8a6a3a'); // o fio dourado da costura
      }
      b.put(x, y, c);
    }
  }
  // sombra das abas sobre o forro
  for (let y = 0; y < h; y += 1) {
    for (let k = 1; k <= 4; k += 1) {
      b.put(flap + k, y, hex('#000000'), 0.45 - k * 0.1);
      b.put(w - 1 - flap - k, y, hex('#000000'), 0.45 - k * 0.1);
    }
  }
  // a gola em cima
  for (let x = 0; x < w; x += 1) {
    b.put(x, 0, hex('#08060a'));
    b.put(x, 1, leather.hi);
    b.put(x, 2, leather.mid);
    b.put(x, 3, leather.lo);
  }
  return b;
}
