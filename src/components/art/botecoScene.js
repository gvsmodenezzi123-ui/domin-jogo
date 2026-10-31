/**
 * Versão 1.5: o cenário do boteco em pixel art, pintado por código num buffer de pixels
 * (sem imagem baixada). Azulejo encardido, prateleira de garrafas, janela com chuva, mesa de
 * feltro com aro de madeira, copo americano, cinzeiro, pedras e ossos jogados no pano.
 *
 * `paintScene(nome, w, h, semente)` devolve { w, h, data } (RGBA, Uint8ClampedArray). É puro:
 * a mesma semente pinta sempre o mesmo boteco, e roda no Node (testes, prévias em PNG) e no
 * navegador (components/BotecoBackdrop.jsx põe o buffer num <canvas> uma vez por tamanho).
 * Um pixel do buffer vale 2 px de CSS: a tela de 390 px de largura vira uma grade de 195.
 *
 * Cenas:
 *   title     tela inicial: parede de azulejo, garrafas à esquerda, janela com chuva à direita
 *             e a mesa de feltro no terço de baixo (onde a caixa JOGAR repousa)
 *   counter   Balcão de Maletas: sala escura e o feltro da bancada embaixo
 *   match     partida: azulejo verde de boteco e a prateleira atrás do rival; a mesa é do TableBoard
 *   wide      laterais da tela larga (tablet, PC): o bar continua para os lados, desfocado no CSS
 *   map       folha de papel de pão do mapa (manchas de copo, gordura, dobras)
 */

/** Quantos px de CSS cada pixel do cenário ocupa. */
export const SCENE_PX = 2;

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shift = (c, k) => [c[0] + k, c[1] + k, c[2] + k];

/** Mulberry32 (o mesmo gerador das sementes do jogo). */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Matriz de Bayer 4x4: degradê em pontilhado, como nos jogos de 16 bits. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

function buffer(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  const put = (x, y, c, a = 1) => {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
    const i = (y * w + x) * 4;
    if (a >= 1) {
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
      return;
    }
    const keep = data[i + 3] / 255;
    const out = a + keep * (1 - a);
    data[i] = (c[0] * a + data[i] * keep * (1 - a)) / out;
    data[i + 1] = (c[1] * a + data[i + 1] * keep * (1 - a)) / out;
    data[i + 2] = (c[2] * a + data[i + 2] * keep * (1 - a)) / out;
    data[i + 3] = out * 255;
  };
  const get = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const rect = (x, y, rw, rh, c, a = 1) => {
    for (let yy = Math.max(0, y | 0); yy < Math.min(h, (y + rh) | 0); yy += 1) for (let xx = Math.max(0, x | 0); xx < Math.min(w, (x + rw) | 0); xx += 1) put(xx, yy, c, a);
  };
  const ellipse = (cx, cy, rx, ry, c, a = 1) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) put(x, y, c, a);
      }
    }
  };
  const line = (x0, y0, x1, y1, c, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i += 1) put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c, a);
  };
  /** Escurece (k < 0) ou clareia (k > 0) onde `test` deixar, em pontilhado conforme `amount(x, y)` (0..1). */
  const light = (x, y, rw, rh, tint, amount) => {
    for (let yy = Math.max(0, y | 0); yy < Math.min(h, (y + rh) | 0); yy += 1) {
      for (let xx = Math.max(0, x | 0); xx < Math.min(w, (x + rw) | 0); xx += 1) {
        const t = amount(xx, yy);
        if (t <= 0) continue;
                put(xx, yy, tint, Math.min(1, t) * 0.9);
      }
    }
  };
  return { w, h, data, put, get, rect, ellipse, line, light };
}

// ---------------------------------------------------------------------------
// Peças do cenário
// ---------------------------------------------------------------------------

/** Azulejo com rejunte, cada peça num tom levemente diferente, brilho em cima e lascas. */
function tiles(b, r, x0, y0, x1, y1, { size = 12, base, grout, grime = 0.5 }) {
  b.rect(x0, y0, x1 - x0, y1 - y0, grout);
  for (let ty = y0; ty < y1; ty += size) {
    for (let tx = x0; tx < x1; tx += size) {
      const jitter = (r() - 0.5) * 12;
      const c = shift(base, jitter);
      const iw = Math.min(size - 1, x1 - tx);
      const ih = Math.min(size - 1, y1 - ty);
      b.rect(tx, ty, iw, ih, c);
      b.rect(tx, ty, iw, 1, shift(c, 16), 0.8); // quina de cima pega a luz
      b.rect(tx, ty, 1, ih, shift(c, 9), 0.6);
      b.rect(tx, ty + ih - 1, iw, 1, shift(c, -12), 0.8);
      b.rect(tx + iw - 1, ty, 1, ih, shift(c, -8), 0.7);
      // brilho esmaltado no canto
      if (r() < 0.55) b.rect(tx + 2, ty + 2, 2, 1, shift(c, 26), 0.55);
      // encardido: manchas e lascas
      if (r() < grime) {
        const gx = tx + 1 + Math.floor(r() * (iw - 3));
        const gy = ty + 1 + Math.floor(r() * (ih - 3));
        b.rect(gx, gy, 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), shift(c, -18), 0.6);
      }
      if (r() < 0.06) b.rect(tx + iw - 3, ty + ih - 3, 2, 2, grout, 0.9); // lasca no canto
      if (r() < 0.05) b.line(tx + 2, ty + 2 + Math.floor(r() * 4), tx + iw - 2, ty + ih - 3, shift(grout, 6), 0.7); // trinca
    }
  }
}

/** Escorrido de gordura e sujeira descendo pela parede. */
function drips(b, r, x0, x1, y0, y1, color, n) {
  for (let i = 0; i < n; i += 1) {
    const x = x0 + Math.floor(r() * (x1 - x0));
    const len = 6 + Math.floor(r() * (y1 - y0) * 0.4);
    const y = y0 + Math.floor(r() * (y1 - y0 - len));
    for (let k = 0; k < len; k += 1) b.put(x, y + k, color, 0.35 * (1 - k / len));
  }
}

const WOOD = { hi: hex('#7a4a24'), mid: hex('#4e2d15'), lo: hex('#2b170b'), deep: hex('#160b05') };

/** Tábua de madeira com veio. `vertical` deita o veio no comprimento da tábua. */
function plank(b, r, x, y, w, h, { tone = WOOD, vertical = false } = {}) {
  b.rect(x, y, w, h, tone.mid);
  const len = vertical ? h : w;
  const across = vertical ? w : h;
  for (let k = 0; k < across; k += 1) {
    let c = k === 0 ? tone.hi : k === across - 1 ? tone.lo : tone.mid;
    let run = 0;
    for (let i = 0; i < len; i += 1) {
      if (run <= 0) {
        run = 3 + Math.floor(r() * 14);
        c = k === 0 ? tone.hi : k === across - 1 ? tone.lo : r() < 0.35 ? mixRgb(tone.mid, tone.lo, 0.45) : r() < 0.2 ? mixRgb(tone.mid, tone.hi, 0.35) : tone.mid;
      }
      run -= 1;
      if (vertical) b.put(x + k, y + i, c);
      else b.put(x + i, y + k, c);
    }
  }
  // nós da madeira
  if (len > 20 && r() < 0.6) {
    const kx = vertical ? x + Math.floor(across / 2) : x + 4 + Math.floor(r() * (len - 8));
    const ky = vertical ? y + 4 + Math.floor(r() * (len - 8)) : y + Math.floor(across / 2);
    b.ellipse(kx, ky, 1.6, 1.1, tone.lo);
    b.put(kx, ky, tone.deep);
  }
}

const BOTTLES = [
  { glass: '#1f4a2a', hi: '#4f8a55', liquid: null, label: '#e8dcb4', cap: '#c9a24a' }, // vinho verde-garrafa
  { glass: '#5a2c0e', hi: '#a5622a', liquid: null, label: '#b8322a', cap: '#2a1a10' }, // conhaque
  { glass: '#9fb0a6', hi: '#e8f0ea', liquid: '#d9a232', label: '#f2ecd6', cap: '#c42a1e' }, // cachaça
  { glass: '#3d1d0b', hi: '#7d4419', liquid: null, label: '#e6c34a', cap: '#d8d2c4' }, // cerveja long neck
  { glass: '#16302e', hi: '#3f7470', liquid: null, label: '#1a1a1a', cap: '#8a8a8a' }, // gim escuro
  { glass: '#6a7f8a', hi: '#d8e4ea', liquid: '#7c1d14', label: '#2a2420', cap: '#d0c08a' }, // licor vermelho
];

/** Garrafa em pé com a base em (x, baseY): corpo, ombro, gargalo, rótulo e o reflexo da lâmpada. */
function bottle(b, r, x, baseY, kind, scale = 1) {
  const k = BOTTLES[kind % BOTTLES.length];
  const glass = hex(k.glass);
  const hi = hex(k.hi);
  const bw = Math.round((5 + Math.floor(r() * 3)) * scale);
  const bh = Math.round((11 + Math.floor(r() * 6)) * scale);
  const nh = Math.round((5 + Math.floor(r() * 4)) * scale);
  const nw = Math.max(2, Math.round(bw / 3));
  const top = baseY - bh;
  b.rect(x, top, bw, bh, glass);
  if (k.liquid) b.rect(x + 1, top + Math.round(bh * 0.25), bw - 2, bh - Math.round(bh * 0.25) - 1, hex(k.liquid), 0.85);
  // ombro arredondado
  b.rect(x + 1, top - 1, bw - 2, 1, glass);
  b.rect(x + Math.floor((bw - nw) / 2), top - nh, nw, nh, glass);
  b.rect(x + Math.floor((bw - nw) / 2), top - nh - 1, nw, 2, hex(k.cap));
  // rótulo
  const lh = Math.max(3, Math.round(bh * 0.35));
  b.rect(x, top + Math.round(bh * 0.4), bw, lh, hex(k.label));
  b.rect(x + 1, top + Math.round(bh * 0.4) + 1, bw - 2, 1, shift(hex(k.label), -60), 0.6);
  // reflexo e sombra do vidro
  b.rect(x + 1, top + 1, 1, bh - 3, hi, 0.75);
  b.rect(x + Math.floor((bw - nw) / 2), top - nh + 1, 1, nh - 1, hi, 0.5);
  b.rect(x + bw - 1, top, 1, bh, shift(glass, -25));
  b.rect(x, baseY - 1, bw, 1, shift(glass, -30));
  return bw;
}

/** Caneca de chope com espuma e alça. */
function mug(b, x, baseY) {
  const glass = hex('#d9a531');
  b.rect(x, baseY - 10, 7, 10, glass);
  b.rect(x, baseY - 12, 7, 3, hex('#f4ecd2'));
  b.rect(x - 1, baseY - 12, 9, 1, hex('#fffaf0'));
  b.rect(x + 1, baseY - 9, 1, 7, hex('#ffe9a0'), 0.8);
  b.rect(x + 7, baseY - 9, 2, 1, hex('#c9d4d0'));
  b.rect(x + 8, baseY - 9, 1, 6, hex('#c9d4d0'));
  b.rect(x + 7, baseY - 4, 2, 1, hex('#c9d4d0'));
  b.rect(x, baseY - 1, 7, 1, hex('#8a6018'));
}

/** Prateleira: tábua com quina iluminada, mão-francesa e a sombra na parede. */
function shelf(b, r, x, y, w, items) {
  b.light(x, y + 3, w, 6, [0, 0, 0], (xx, yy) => 0.55 - (yy - y - 3) * 0.08);
  plank(b, r, x, y, w, 3);
  b.rect(x, y, w, 1, WOOD.hi);
  for (const bx of [x + 4, x + w - 7]) {
    b.rect(bx, y + 3, 2, 5, WOOD.lo);
    b.line(bx + 1, y + 7, bx + 4, y + 3, WOOD.lo);
  }
  let cx = x + 2;
  for (const it of items) {
    if (cx > x + w - 8) break;
    if (it === 'mug') {
      mug(b, cx, y);
      cx += 12;
    } else {
      cx += bottle(b, r, cx, y, it) + 2 + Math.floor(r() * 3);
    }
  }
}

/** Janela de noite com chuva: caixilho de ferro, vidros azul-escuros, gotas e riscos. */
function rainyWindow(b, r, x, y, w, h) {
  const frame = hex('#1d2426');
  const glassTop = hex('#22384a');
  const glassBottom = hex('#0c1620');
  b.rect(x - 3, y - 3, w + 6, h + 6, frame);
  b.rect(x - 3, y - 3, w + 6, 1, hex('#3a474a'));
  for (let yy = 0; yy < h; yy += 1) {
    const t = yy / h;
    for (let xx = 0; xx < w; xx += 1) b.put(x + xx, y + yy, bayer(xx, yy) < t ? glassBottom : glassTop);
  }
  // prédio do outro lado da rua, com uma janela acesa
  b.rect(x + Math.floor(w * 0.55), y + Math.floor(h * 0.45), Math.floor(w * 0.5), Math.ceil(h * 0.55), hex('#0a1016'));
  b.rect(x + Math.floor(w * 0.7), y + Math.floor(h * 0.6), 3, 4, hex('#d9a24a'), 0.8);
  // riscos de chuva e gotas escorrendo
  for (let i = 0; i < (w * h) / 22; i += 1) {
    const rx = x + Math.floor(r() * w);
    const ry = y + Math.floor(r() * h);
    const len = 2 + Math.floor(r() * 4);
    b.line(rx, ry, rx - 1, ry + len, hex('#5d7d8c'), 0.45);
  }
  for (let i = 0; i < (w * h) / 60; i += 1) {
    const rx = x + Math.floor(r() * w);
    const ry = y + Math.floor(r() * h);
    b.put(rx, ry, hex('#a8c4d0'), 0.8);
    b.put(rx, ry + 1, hex('#4a6a7a'), 0.6);
  }
  // caixilhos: um no meio, dois deitados
  b.rect(x + Math.floor(w / 2) - 1, y, 3, h, frame);
  b.rect(x, y + Math.floor(h / 3), w, 2, frame);
  b.rect(x, y + Math.floor((h * 2) / 3), w, 2, frame);
  b.rect(x + Math.floor(w / 2), y, 1, h, hex('#3a474a'));
  // peitoril
  b.rect(x - 5, y + h + 3, w + 10, 3, hex('#2d3638'));
  b.rect(x - 5, y + h + 3, w + 10, 1, hex('#56666a'));
}

/** Quadro-negro com o "cardápio" em giz. */
function chalkboard(b, r, x, y, w, h) {
  b.rect(x - 2, y - 2, w + 4, h + 4, WOOD.lo);
  b.rect(x - 2, y - 2, w + 4, 1, WOOD.mid);
  b.rect(x, y, w, h, hex('#1a1f1c'));
  const chalk = hex('#c9cdc4');
  for (let ly = y + 3; ly < y + h - 2; ly += 4) {
    let lx = x + 3;
    while (lx < x + w - 5) {
      const word = 2 + Math.floor(r() * 6);
      b.rect(lx, ly, Math.min(word, x + w - 4 - lx), 1, chalk, 0.55 + r() * 0.3);
      lx += word + 2;
    }
    b.rect(x + w - 8, ly, 4, 1, hex('#e0c060'), 0.7);
  }
}

const FELT = { hi: hex('#2a6b3e'), mid: hex('#1d5230'), lo: hex('#0f3420'), deep: hex('#082214') };

/** Feltro gasto: degradê do meio para as bordas, fiapos, manchas de bebida e queimado de cigarro. */
function felt(b, r, x0, y0, x1, y1, inside = () => true, tone = FELT) {
  const cx = (x0 + x1) / 2;
  const cy = y0 + (y1 - y0) * 0.35;
  const rx = (x1 - x0) * 0.62;
  const ry = (y1 - y0) * 0.9;
  for (let y = Math.max(0, y0); y < Math.min(b.h, y1); y += 1) {
    for (let x = Math.max(0, x0); x < Math.min(b.w, x1); x += 1) {
      if (!inside(x, y)) continue;
      const d = Math.min(1, Math.hypot((x - cx) / rx, (y - cy) / ry));
      const t = d * 2.2;
      let c;
      if (t < 1) c = mixRgb(tone.hi, tone.mid, t);
      else if (t < 2) c = mixRgb(tone.mid, tone.lo, t - 1);
      else c = mixRgb(tone.lo, tone.deep, Math.min(1, t - 2));
      // fiapos do pano
      const n = r();
      if (n < 0.07) c = shift(c, -7);
      else if (n > 0.95) c = shift(c, 6);
      b.put(x, y, c);
    }
  }
  // manchas de copo e de bebida
  const area = (x1 - x0) * (y1 - y0);
  for (let i = 0; i < Math.max(2, area / 2600); i += 1) {
    const sx = x0 + 8 + r() * (x1 - x0 - 16);
    const sy = y0 + 6 + r() * (y1 - y0 - 12);
    if (!inside(sx | 0, sy | 0)) continue;
    const rr = 3 + r() * 6;
    b.ellipse(sx, sy, rr, rr * 0.8, tone.deep, 0.35);
    if (r() < 0.5) b.ellipse(sx + 1, sy, rr * 0.55, rr * 0.45, tone.lo, 0.4);
  }
  // queimado de cigarro
  for (let i = 0; i < Math.max(1, area / 7000); i += 1) {
    const sx = x0 + 10 + r() * (x1 - x0 - 20);
    const sy = y0 + 10 + r() * (y1 - y0 - 20);
    if (!inside(sx | 0, sy | 0)) continue;
    b.ellipse(sx, sy, 2.2, 1.6, hex('#3a2a12'), 0.8);
    b.put(sx, sy, hex('#120a04'));
  }
}

/** Mesa de feltro vista de frente, em perspectiva: aro de madeira e o pano. */
function feltTable(b, r, top, { inset = 0.05 } = {}) {
  const { w, h } = b;
  const leftAt = (y) => Math.round(w * inset - (y - top) * 0.45);
  const rightAt = (y) => Math.round(w * (1 - inset) + (y - top) * 0.45);
  const rail = 7;
  // fora da mesa, embaixo: o chão no escuro
  for (let y = top; y < h; y += 1) {
    b.rect(0, y, Math.max(0, leftAt(y)), 1, hex('#0a0806'));
    b.rect(rightAt(y), y, Math.max(0, w - rightAt(y)), 1, hex('#0a0806'));
  }
  // sombra da mesa no chão / parede logo acima
  b.light(0, top - 4, w, 4, [0, 0, 0], (x, y) => 0.25 + (y - top + 4) * 0.15);
  // o pano vai até debaixo do aro (o aro é pintado por cima): sem fresta entre os dois
  felt(b, r, 0, top + rail, w, h, (x, y) => x >= leftAt(y) && x <= rightAt(y));
  // aro: tábua de cima e as laterais em diagonal
  for (let y = top; y < h; y += 1) {
    const l = leftAt(y);
    const rr = rightAt(y);
    const thick = rail + 2 + Math.floor((y - top) * 0.05);
    for (let k = 0; k < thick; k += 1) {
      const c = k === 0 ? WOOD.lo : k === 1 ? WOOD.hi : k === thick - 1 ? WOOD.deep : (y + k * 3) % 11 < 2 ? mixRgb(WOOD.mid, WOOD.lo, 0.5) : WOOD.mid;
      b.put(l + k, y, c);
      b.put(rr - k, y, k === 1 ? mixRgb(WOOD.hi, WOOD.mid, 0.5) : c);
    }
  }
  plank(b, r, leftAt(top), top, rightAt(top) - leftAt(top), rail);
  b.rect(leftAt(top), top, rightAt(top) - leftAt(top), 1, WOOD.hi);
  b.rect(leftAt(top) + rail, top + rail, rightAt(top) - leftAt(top) - rail * 2, 1, WOOD.deep);
  // sombra do aro no pano
  b.light(0, top + rail + 1, w, 6, [0, 0, 0], (x, y) => (x > leftAt(y) + rail && x < rightAt(y) - rail ? 0.5 - (y - top - rail - 1) * 0.09 : 0));
  // lascas no aro
  for (let i = 0; i < 8; i += 1) {
    const px = leftAt(top) + 4 + Math.floor(r() * (rightAt(top) - leftAt(top) - 8));
    b.rect(px, top + 2 + Math.floor(r() * 3), 2 + Math.floor(r() * 3), 1, hex('#a06a38'), 0.6);
  }
  return { leftAt, rightAt, rail };
}

/** Copo americano de cerveja: vidro facetado, espuma e bolhinhas. */
function beerGlass(b, r, x, y, s = 1) {
  const gw = Math.round(12 * s);
  const gh = Math.round(16 * s);
  // sombra no pano
  b.ellipse(x + gw / 2 + 2, y + gh, gw * 0.7, 2.5 * s, [0, 0, 0], 0.45);
  for (let yy = 0; yy < gh; yy += 1) {
    const narrow = Math.round((yy / gh) * 1.5 * s);
    const xl = x + narrow;
    const xr = x + gw - narrow;
    for (let xx = xl; xx < xr; xx += 1) {
      const foam = yy < Math.round(4 * s);
      let c = foam ? hex('#f7f0dc') : hex('#e2a12c');
      if (!foam && yy > gh * 0.6) c = hex('#c9821c');
      if (!foam && (xx - xl) % Math.max(3, Math.round(4 * s)) === 0) c = shift(c, 18); // facetas
      b.put(xx, y + yy, c, foam ? 1 : 0.92);
    }
    b.put(xl, y + yy, hex('#fffbe8'), 0.75);
    b.put(xr - 1, y + yy, hex('#7a4a10'), 0.6);
  }
  b.rect(x - 1, y, gw + 2, 1, hex('#fffef8'));
  b.rect(x + 2, y + 1, Math.round(4 * s), 1, hex('#ffffff'), 0.7);
  for (let i = 0; i < 6 * s; i += 1) b.put(x + 2 + Math.floor(r() * (gw - 4)), y + Math.round(5 * s) + Math.floor(r() * (gh - 7 * s)), hex('#ffe9a8'), 0.85);
  b.rect(x + Math.round(1.5 * s), y + gh - 1, gw - Math.round(3 * s), 1, hex('#f0e8d0'), 0.7);
}

/** Cinzeiro de vidro com bitucas, cinza e um cigarro aceso. */
function ashtray(b, r, x, y, s = 1) {
  const rx = 10 * s;
  const ry = 5 * s;
  b.ellipse(x + 2, y + 3, rx, ry, [0, 0, 0], 0.45);
  b.ellipse(x, y, rx, ry, hex('#5d6a6c'));
  b.ellipse(x, y - 1, rx - 1, ry - 1, hex('#8e9c9e'));
  b.ellipse(x, y, rx - 3 * s, ry - 2 * s, hex('#2a2e2c'));
  b.ellipse(x - 1, y, rx - 5 * s, ry - 3 * s, hex('#4a4a46'));
  for (let i = 0; i < 7; i += 1) b.put(x - rx / 2 + r() * rx, y - ry / 3 + r() * ry * 0.6, hex('#9a9890'), 0.8);
  // bitucas
  b.rect(x - 4 * s, y, 4 * s, 1.5, hex('#d9c27a'));
  b.rect(x + 1 * s, y + 1, 3 * s, 1.5, hex('#e8e0c8'));
  // cigarro aceso apoiado na borda
  b.line(x + 3 * s, y - 1, x + 12 * s, y - 4 * s, hex('#f2efe6'));
  b.line(x + 3 * s, y, x + 12 * s, y - 3 * s, hex('#d8d2c2'));
  b.line(x + 3 * s, y - 1, x + 5 * s, y - 2, hex('#d99a4a'));
  b.put(x + 12 * s, y - 4 * s, hex('#ff8a32'));
  b.put(x + 13 * s, y - 4 * s, hex('#ffd27a'));
  b.rect(x - rx + 1, y - ry + 1, 3 * s, 1, hex('#d0dcdc'), 0.8);
}

/** Pedra de dominó jogada no pano (deitada ou em pé), com os pontos. */
function looseTile(b, x, y, a, c, horizontal = true) {
  const W = horizontal ? 14 : 7;
  const H = horizontal ? 7 : 14;
  b.rect(x + 1, y + 2, W, H, [0, 0, 0], 0.45);
  b.rect(x, y, W, H, hex('#ebe0c2'));
  b.rect(x, y, W, 1, hex('#fff8e6'));
  b.rect(x, y + H - 1, W, 1, hex('#a8936a'));
  b.rect(x + W - 1, y, 1, H, hex('#bfa97e'));
  if (horizontal) b.rect(x + 7, y + 1, 1, H - 2, hex('#6a5434'));
  else b.rect(x + 1, y + 7, W - 2, 1, hex('#6a5434'));
  const PIPS = {
    0: [],
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
  };
  const half = (hx, hy, n) => {
    for (const [px, py] of PIPS[n]) b.put(hx + 1 + px * 2, hy + 1 + py * 2, hex('#1a120a'));
  };
  if (horizontal) {
    half(x, y, a);
    half(x + 7, y, c);
  } else {
    half(x, y, a);
    half(x, y + 7, c);
  }
}

/** Ossinho jogado (o baralho de osso do boteco). */
function bone(b, x, y, len = 12) {
  const c = hex('#e6dcc0');
  b.rect(x + 1, y + 4, len, 2, [0, 0, 0], 0.4);
  b.rect(x + 2, y + 1, len - 4, 2, c);
  b.ellipse(x + 1.5, y + 1, 1.6, 1.6, c);
  b.ellipse(x + 1.5, y + 3, 1.6, 1.6, c);
  b.ellipse(x + len - 1.5, y + 1, 1.6, 1.6, c);
  b.ellipse(x + len - 1.5, y + 3, 1.6, 1.6, c);
  b.rect(x + 2, y + 1, len - 4, 1, hex('#fffaf0'));
  b.rect(x + 2, y + 2, len - 4, 1, hex('#bfb08a'));
}

/** Vinheta: escurece os cantos e as bordas. */
function vignette(b, strength = 0.7, cy = 0.35) {
  b.light(0, 0, b.w, b.h, [0, 0, 0], (x, y) => {
    const dx = (x - b.w / 2) / (b.w * 0.62);
    const dy = (y - b.h * cy) / (b.h * 0.8);
    return Math.max(0, Math.hypot(dx, dy) - 0.45) * strength * 1.6;
  });
}

/** Luz quente da lâmpada batendo na parede (o facho animado vem por cima, no CSS). */
function lampGlow(b, cx, cy, radius, amount = 0.35) {
  b.light(0, 0, b.w, b.h, hex('#ffd98a'), (x, y) => Math.max(0, 1 - Math.hypot(x - cx, (y - cy) * 1.25) / radius) * amount);
}

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------

function sceneTitle(b, r) {
  const { w, h } = b;
  const tableTop = Math.round(h * 0.66);
  tiles(b, r, 0, 0, w, tableTop, { size: 12, base: hex('#2a3033'), grout: hex('#121618') });
  drips(b, r, 0, w, 0, tableTop, [10, 8, 4], Math.round(w / 6));
  // quadro-negro e prateleiras de garrafas à esquerda
  chalkboard(b, r, 6, Math.round(h * 0.11), Math.round(w * 0.24), Math.round(h * 0.07));
  const shelfW = Math.round(w * 0.42);
  shelf(b, r, -2, Math.round(h * 0.29), shelfW, [0, 3, 1, 4, 0, 2, 5, 3, 1]);
  shelf(b, r, -2, Math.round(h * 0.39), shelfW, [2, 1, 'mug', 0, 4, 3, 5]);
  shelf(b, r, -2, Math.round(h * 0.49), shelfW, [5, 0, 3, 'mug', 1, 2]);
  // janela com chuva à direita (cortada pela borda)
  rainyWindow(b, r, Math.round(w * 0.6), Math.round(h * 0.17), Math.round(w * 0.45), Math.round(h * 0.33));
  // rodapé de madeira escura atrás da mesa
  plank(b, r, 0, tableTop - 10, w, 7, { tone: { ...WOOD, hi: hex('#4a2c16'), mid: hex('#2e1a0c') } });
  lampGlow(b, w / 2, h * 0.27, w * 0.75, 0.32);
  vignette(b, 0.75, 0.32);
  const table = feltTable(b, r, tableTop);
  // o que ficou na mesa: pedras soltas, ossos, um copo
  looseTile(b, Math.round(w * 0.16), tableTop + 17, 2, 5, true);
  looseTile(b, Math.round(w * 0.1), tableTop + 44, 6, 1, false);
  looseTile(b, Math.round(w * 0.76), tableTop + 30, 4, 4, true);
  bone(b, Math.round(w * 0.44), tableTop + 26, 13);
  looseTile(b, Math.round(w * 0.58), tableTop + 13, 3, 0, false);
  beerGlass(b, r, Math.round(w * 0.8), tableTop + 2, 1.15);
  // vapor/fumaça subindo do copo é animado no CSS; a luz na mesa:
  lampGlow(b, w / 2, tableTop + 40, w * 0.5, 0.08);
  return table;
}

function sceneCounter(b, r) {
  const { w, h } = b;
  // sala escura: tábua na parede, quase sem luz fora do facho; a bancada de feltro é do CSS
  // (.case-stage), porque ela acompanha o carrossel das maletas
  for (let x = 0; x < w; x += 14) plank(b, r, x, 0, 14, h, { tone: { hi: hex('#2e1a0d'), mid: hex('#1f1209'), lo: hex('#0f0804'), deep: hex('#070402') }, vertical: true });
  // rodapé e chão escuro embaixo
  const floor = Math.round(h * 0.84);
  b.rect(0, floor, w, h - floor, hex('#0b0705'));
  plank(b, r, 0, floor - 5, w, 5, { tone: { ...WOOD, hi: hex('#3a2212'), mid: hex('#24140a') } });
  lampGlow(b, w / 2, h * 0.22, w * 0.75, 0.2);
  vignette(b, 0.95, 0.32);
}

function sceneMatch(b, r) {
  const { w, h } = b;
  // azulejo verde de boteco atrás do rival, prateleira com garrafas e canecas
  tiles(b, r, 0, 0, w, h, { size: 11, base: hex('#2a4d46'), grout: hex('#12201c'), grime: 0.7 });
  drips(b, r, 0, w, 0, h, [8, 12, 6], Math.round(w / 4));
  const y = Math.round(h * 0.6);
  shelf(b, r, Math.round(w * 0.3), y, Math.round(w * 0.72), [0, 3, 'mug', 1, 'mug', 4, 2, 'mug', 5, 0]);
  lampGlow(b, w / 2, h * 0.9, w * 0.6, 0.25);
  vignette(b, 0.8, 0.8);
}

function sceneWide(b, r) {
  const { w, h } = b;
  const tableTop = Math.round(h * 0.72);
  for (let x = 0; x < w; x += 16) plank(b, r, x, 0, 16, tableTop, { tone: { hi: hex('#3a2212'), mid: hex('#25150a'), lo: hex('#120a04'), deep: hex('#080402') }, vertical: true });
  for (let i = 0; i < 4; i += 1) {
    const sx = Math.round((w / 4) * i + 6);
    shelf(b, r, sx, Math.round(h * 0.3), Math.round(w / 4) - 12, [i % 6, (i + 2) % 6, 'mug', (i + 4) % 6, (i + 1) % 6]);
    shelf(b, r, sx, Math.round(h * 0.46), Math.round(w / 4) - 12, [(i + 3) % 6, (i + 5) % 6, i % 6, 'mug']);
  }
  for (const lx of [0.12, 0.88]) lampGlow(b, w * lx, h * 0.12, w * 0.12, 0.5);
  vignette(b, 0.6, 0.4);
  feltTable(b, r, tableTop, { inset: 0.02 });
}

function sceneMap(b, r) {
  const { w, h } = b;
  // papel de pão: bege-palha com fibras, mais escuro nas bordas
  const paper = hex('#cdb68c');
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const n = r();
      b.put(x, y, n < 0.08 ? shift(paper, -14) : n > 0.94 ? shift(paper, 10) : paper);
    }
  }
  for (let i = 0; i < (w * h) / 90; i += 1) {
    const fx = Math.floor(r() * w);
    const fy = Math.floor(r() * h);
    b.line(fx, fy, fx + 2 + Math.floor(r() * 4), fy + (r() < 0.5 ? 0 : 1), hex('#b29c70'), 0.5);
  }
  // dobras do papel
  b.line(0, Math.round(h * 0.34), w, Math.round(h * 0.36), hex('#a8905e'), 0.45);
  b.line(0, Math.round(h * 0.35), w, Math.round(h * 0.37), hex('#e2d2ac'), 0.5);
  b.line(Math.round(w * 0.5), 0, Math.round(w * 0.52), h, hex('#a8905e'), 0.35);
  // marca de copo e gordura
  for (let i = 0; i < 3; i += 1) {
    const cx = w * (0.15 + r() * 0.7);
    const cy = h * (0.1 + r() * 0.8);
    const rr = 9 + r() * 6;
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const rw = rr + Math.sin(a * 3) * 0.6;
      b.put(cx + Math.cos(a) * rw, cy + Math.sin(a) * rw, hex('#8a6a3a'), 0.45);
      b.put(cx + Math.cos(a) * (rw - 1), cy + Math.sin(a) * (rw - 1), hex('#9a7a48'), 0.25);
    }
  }
  for (let i = 0; i < 4; i += 1) b.ellipse(w * r(), h * r(), 6 + r() * 10, 5 + r() * 8, hex('#b49a62'), 0.35);
  // borda queimada / encardida
  b.light(0, 0, w, h, hex('#503714'), (x, y) => {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    return Math.max(0, 1 - e / 14) * 0.7;
  });
}

const SCENES = { title: sceneTitle, counter: sceneCounter, match: sceneMatch, wide: sceneWide, map: sceneMap };
export const SCENE_IDS = Object.freeze(Object.keys(SCENES));

/** Pinta a cena `name` numa grade de `w`×`h` pixels. */
export function paintScene(name, w, h, seed = 1955) {
  const width = Math.max(8, Math.round(w));
  const height = Math.max(8, Math.round(h));
  const b = buffer(width, height);
  const paint = SCENES[name] ?? SCENES.title;
  paint(b, rngOf(seed));
  return { w: width, h: height, data: b.data };
}

// ---------------------------------------------------------------------------
// Objetos soltos (copo, cinzeiro, tampinhas) para pôr por cima da mesa da partida
// ---------------------------------------------------------------------------

const PROPS = {
  glass: { w: 18, h: 22, draw: (b, r) => beerGlass(b, r, 3, 2, 1) },
  ashtray: { w: 30, h: 16, draw: (b, r) => ashtray(b, r, 12, 9, 1) },
  caps: {
    w: 12,
    h: 34,
    draw: (b) => {
      const caps = [['#2f5f9a', '#5a8ad0'], ['#c9a24a', '#f0d27a'], ['#3a7a3a', '#6ab06a']];
      caps.forEach(([lo, hi], i) => {
        const cy = 5 + i * 11;
        b.ellipse(6.5, cy + 1.5, 5, 4, [0, 0, 0], 0.45);
        b.ellipse(6, cy, 5, 4, hex(lo));
        b.ellipse(6, cy - 0.6, 3.6, 2.6, hex(hi));
        for (let k = 0; k < 8; k += 1) b.put(6 + Math.cos(k) * 5, cy + Math.sin(k) * 4, hex('#1a1a1a'), 0.5);
      });
    },
  },
};
export const PROP_IDS = Object.freeze(Object.keys(PROPS));
/** Tamanho (em pixels do cenário) de cada objeto solto. */
export const propSize = (name) => ({ w: PROPS[name].w, h: PROPS[name].h });

/** Pinta um objeto solto com fundo transparente. */
export function paintProp(name, seed = 7) {
  const prop = PROPS[name];
  const b = buffer(prop.w, prop.h);
  prop.draw(b, rngOf(seed));
  return { w: prop.w, h: prop.h, data: b.data };
}
