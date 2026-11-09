/**
 * Versão 2.14: os dois armarinhos da mesa deitada, um em cada canto de baixo, em pixel art pintada
 * por código, na densidade do HUD (1 pixel = 1 px de CSS) e na mesma madeira dos nichos da hotbar
 * (o nicho é literalmente o mesmo desenho: art/shopPixels.js paintNiche, aqui em vários tamanhos).
 *
 *   o da esquerda (o seu): a plaquinha de latão do dinheiro, os nichos dos talismãs, a vida num
 *                          sulco forrado de veludo vermelho e a tecla-nicho do MENU
 *   o da direita (a mesa): a lousa do dorme e da soma das pontas e as teclas-nicho de COMPRAR e
 *                          PASSAR
 *
 * O móvel: cornija em cima (passa 2 px para cada lado, com o friso e a sombra embaixo), as duas
 * colunas de pinho, o rodapé e, no miolo, o painel de imbuia rebaixado, de veio em pé. A luz vem
 * da lâmpada da mesa: o armarinho da esquerda acende na quina da direita e o da direita na da
 * esquerda. Os textos, os corações e os talismãs vão por cima, em HTML.
 */
import { paintKit } from './botecoScene.js';
import { paintNiche } from './shopPixels.js';

const { hex, rngOf, buffer } = paintKit;

const INK = hex('#0b0705');
const BLACK = [0, 0, 0];
const PINE = { sp: hex('#dca468'), hi: hex('#b07c48'), mid: hex('#8a5a30'), lo: hex('#603a1c'), deep: hex('#36200e') };
const IMBUIA = { sp: hex('#86562e'), hi: hex('#623c1e'), mid: hex('#462a14'), lo: hex('#321c0c'), deep: hex('#1c0f06') };
const BRASS = { sp: hex('#fff2b8'), hi: hex('#e4b85e'), mid: hex('#b48636'), lo: hex('#7c5818'), deep: hex('#3a2808') };
const VELVET = { sp: hex('#d0506a'), hi: hex('#a42a40'), mid: hex('#7c1a2c'), lo: hex('#52101e'), deep: hex('#2a0610') };
const SLATE = { base: hex('#2b322e'), dark: hex('#141a17'), lit: hex('#3a443e'), chalk: hex('#dfe6df') };

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const tone = (m, l, x, y) => {
  const v = l + (dither(x, y) - 0.5) * 0.24;
  return v > 0.62 ? m.sp : v > 0.3 ? m.hi : v > -0.12 ? m.mid : v > -0.5 ? m.lo : m.deep;
};

/** Ruído de valor suave (grade 32×32 que dá a volta). */
function noiseOf(seed, cell) {
  const r = rngOf(seed);
  const g = Float32Array.from({ length: 1024 }, () => r());
  const at = (x, y) => g[((y & 31) << 5) | (x & 31)];
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

/** O veio: `u` corre ao longo da fibra, `v` atravessa. Devolve um desvio de luz. */
function grain(u, v, n) {
  const g = Math.sin(v * 0.9 + Math.sin(u * 0.045 + v * 0.13) * 2.6 + n(u * 0.12, v * 0.55) * 5);
  let l = (n(u * 0.05 + 40, v * 0.3) - 0.5) * 0.4;
  if (g > 0.86) l -= 0.32;
  else if (g < -0.92) l += 0.16;
  return l;
}

/** Cola um buffer pintado (com alfa) em `x`,`y`. */
function blit(b, src, x0, y0) {
  for (let y = 0; y < src.h; y += 1) {
    for (let x = 0; x < src.w; x += 1) {
      const i = (y * src.w + x) * 4;
      const a = src.data[i + 3] / 255;
      if (a > 0) b.put(x0 + x, y0 + y, [src.data[i], src.data[i + 1], src.data[i + 2]], a);
    }
  }
}

/** Prego de latão 3×3 com o brilho em cima à esquerda. */
function nail(b, x, y) {
  b.put(x, y, BRASS.sp);
  b.put(x + 1, y, BRASS.hi);
  b.put(x + 2, y, BRASS.lo);
  b.put(x, y + 1, BRASS.hi);
  b.put(x + 1, y + 1, BRASS.mid);
  b.put(x + 2, y + 1, BRASS.deep);
  b.put(x, y + 2, BRASS.lo);
  b.put(x + 1, y + 2, BRASS.deep);
  b.put(x + 2, y + 2, INK, 0.6);
}

/** A sombra que uma peça em relevo joga no painel (embaixo e para o lado contrário da luz). */
function dropShadow(b, x, y, w, h, litRight) {
  for (let i = 1; i <= w; i += 1) b.put(x + i - (litRight ? 2 : 0), y + h, BLACK, 0.5);
  const sx = litRight ? x - 1 : x + w;
  for (let j = 2; j < h; j += 1) b.put(sx, y + j, BLACK, 0.35);
}

/** O sulco forrado de veludo vermelho (a vida): friso de latão, a borda funda e o pelo. */
function velvet(b, x0, y0, w, h, n) {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      let c;
      if (d === 0) c = INK;
      else if (d === 1) c = y === 1 ? BRASS.hi : y === h - 2 ? BRASS.lo : x === 1 ? BRASS.mid : x === w - 2 ? BRASS.lo : BRASS.mid;
      else if (d === 2) c = y === 2 ? BRASS.deep : INK;
      else {
        // o veludo estufa no meio e afunda contra o friso; o brilho corre torto, de pelo deitado
        const v = (y - 2.5) / (h - 5);
        const u = (x - 2.5) / (w - 5);
        let l = 0.25 - Math.abs(v - 0.4) * 1.3;
        if (y === 3) l -= 0.75;
        else if (y === 4) l -= 0.35;
        if (y === h - 4) l -= 0.3;
        if (x === 3 || x === w - 4) l -= 0.35;
        l += (n(x * 0.22, y * 0.7) - 0.5) * 0.35;
        l += Math.sin(u * 7.5 - v * 2.2) * 0.12;
        c = tone(VELVET, l, x, y);
      }
      b.put(x0 + x, y0 + y, c);
    }
  }
}

/** A plaquinha de latão escovado, com o friso gravado e dois parafusos de fenda. */
function brassPlate(b, x0, y0, w, h) {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      let c;
      if (d === 0) c = INK;
      else if (d === 1) c = y === 1 ? BRASS.sp : y === h - 2 || x === w - 2 ? BRASS.deep : BRASS.hi;
      else if (d === 3) c = y === 3 || x === 3 ? BRASS.lo : BRASS.hi; // o friso gravado
      else {
        // latão escovado: a luz cai de cima, com um reflexo largo e macio perto da ponta da mesa
        const l = 0.12 - (y / h) * 0.4 + Math.max(0, 1 - Math.abs(x / w - 0.32) * 5) * 0.22 + Math.sin(y * 2.3) * 0.05;
        c = tone(BRASS, l, x, y);
      }
      b.put(x0 + x, y0 + y, c);
    }
  }
  // os dois parafusos de fenda (na plaquinha estreita, ao lado do MENU, não cabem: o dinheiro ocupa)
  for (const sx of w >= 72 ? [x0 + 5, x0 + w - 8] : []) {
    const sy = y0 + Math.round(h / 2) - 1;
    b.put(sx, sy, BRASS.deep);
    b.put(sx + 1, sy, BRASS.lo);
    b.put(sx + 2, sy, BRASS.mid);
    b.put(sx, sy + 1, BRASS.lo);
    b.put(sx + 1, sy + 1, INK);
    b.put(sx + 2, sy + 1, BRASS.hi);
    b.put(sx, sy + 2, BRASS.mid);
    b.put(sx + 1, sy + 2, BRASS.hi);
    b.put(sx + 2, sy + 2, BRASS.sp);
  }
}

/** A lousa: moldura de pinho, o fio escuro, a pedra com giz apagado e o risco do meio. */
function slate(b, x0, y0, w, h, r, split) {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      let c;
      if (d === 0) c = INK;
      else if (d <= 3) {
        const lit = y <= 3 || x <= 3;
        const l = (lit ? 0.35 : -0.3) + (d === 1 ? 0.3 : d === 3 ? -0.55 : 0) + (r() - 0.5) * 0.2;
        c = tone(PINE, l, x, y);
      } else if (d === 4) c = SLATE.dark;
      else {
        c = mix(SLATE.base, SLATE.lit, Math.max(0, 0.6 - (x + y * 1.4) / (w + h)) * 0.9);
        c = mix(c, BLACK, Math.max(0, (y - h * 0.6) / h) * 0.25);
        if (r() < 0.25) c = mix(c, r() < 0.5 ? SLATE.dark : SLATE.lit, 0.35);
      }
      b.put(x0 + x, y0 + y, c);
    }
  }
  // giz apagado: borrões claros e riscos de quem passou o pano com pressa
  for (let i = 0; i < (w * h) / 40; i += 1) b.put(x0 + 6 + r() * (w - 12), y0 + 6 + r() * (h - 12), SLATE.chalk, 0.05 + r() * 0.07);
  for (let i = 0; i < 6; i += 1) {
    const y = y0 + 7 + Math.floor(r() * (h - 14));
    const x = x0 + 7 + Math.floor(r() * (w * 0.4));
    b.line(x, y, x + 10 + r() * (w * 0.35), y + (r() < 0.5 ? 1 : 0), SLATE.chalk, 0.04);
  }
  if (split !== null && split !== undefined) {
    // o risco de giz que separa o dorme das pontas, tremido
    for (let x = x0 + 9; x < x0 + w - 9; x += 1) {
      const y = y0 + split + (Math.sin(x * 0.31) > 0.8 ? 1 : 0);
      if (r() < 0.9) b.put(x, y, SLATE.chalk, 0.4 + r() * 0.25);
    }
  }
}

/**
 * O armarinho: `w`×`h` px (mais 3 da sombra no chão), com a luz vindo de `light` ('left' ou
 * 'right': o lado virado para a mesa) e os `holes` pintados no painel.
 *   holes: [{ kind: 'niche' | 'key' | 'velvet' | 'slate' | 'brass', x, y, w, h, split? }]
 */
export function paintCabinet(w, h, { holes = [], light = 'right', seed = 7 } = {}) {
  const b = buffer(w, h + 3);
  const r = rngOf(seed);
  const n = noiseOf(seed, 6);
  const litRight = light === 'right';
  const CORNICE = 8;
  const PLINTH = 8;
  const STILE = 6;
  const body0 = 2;
  const body1 = w - 3;
  const towardLight = (x) => (litRight ? x / w : 1 - x / w) - 0.5;

  // as colunas e o painel
  for (let y = CORNICE; y < h - PLINTH; y += 1) {
    for (let x = body0; x <= body1; x += 1) {
      let c;
      const sx = x - body0;
      const ex = body1 - x;
      if (sx === 0 || ex === 0) c = INK;
      else if (sx < STILE || ex < STILE) {
        // a coluna de pinho, de veio em pé; a quina de fora pega a luz do lado da mesa
        const near = sx < STILE ? sx : ex;
        const lit = sx < STILE ? !litRight : litRight;
        let l = (lit ? 0.22 : -0.22) + grain(y, x * 1.6, n);
        if (near === 1) l += lit ? 0.32 : -0.25;
        if (near === STILE - 1) l -= 0.6; // o degrau para o painel
        c = tone(PINE, l, x, y);
      } else {
        // o painel de imbuia rebaixado: veio em pé, mais claro no alto e do lado da mesa
        const py = y - CORNICE;
        let l = 0.05 - (py / (h - CORNICE - PLINTH)) * 0.4 + towardLight(x) * 0.35 + grain(y, x * 1.3, n);
        c = tone(IMBUIA, l, x, y);
        if (py < 3) c = mix(c, BLACK, [0.7, 0.45, 0.2][py]); // a sombra da cornija
        const shadeSide = litRight ? sx === STILE : ex === STILE;
        if (shadeSide) c = mix(c, BLACK, 0.45);
      }
      b.put(x, y, c);
    }
  }
  // a cornija: passa 2 px para cada lado; quina clara, friso, a moldura e a sombra embaixo
  for (let y = 0; y < CORNICE; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const cut = y === 0 ? x < 2 || x > w - 3 : y === 1 ? x < 1 || x > w - 2 : false;
      if (cut) continue;
      let c;
      if (y === 0 || x === 0 || x === w - 1) c = INK;
      else if (y === CORNICE - 1) c = INK;
      else {
        const profile = [0, 0.75, 0.3, 0.05, -0.15, -0.6, 0.45][y] ?? 0;
        const l = profile + towardLight(x) * 0.4 + grain(x, y * 3, n) * 0.6;
        c = tone(PINE, l, x, y);
        if (x === 1 || x === w - 2) c = mix(c, BLACK, 0.45);
      }
      b.put(x, y, c);
    }
  }
  // o rodapé, um pouco mais escuro e mais fundo que a cornija
  for (let y = h - PLINTH; y < h; y += 1) {
    const j = y - (h - PLINTH);
    for (let x = 0; x < w; x += 1) {
      const cut = j === PLINTH - 1 ? x < 2 || x > w - 3 : j === PLINTH - 2 ? x < 1 || x > w - 2 : false;
      if (cut) continue;
      let c;
      if (j === 0 || j === PLINTH - 1 || x === 0 || x === w - 1) c = INK;
      else {
        const profile = [0, 0.55, 0.1, -0.35, 0.2, -0.1, -0.55][j] ?? 0;
        const l = profile + towardLight(x) * 0.4 + grain(x, y * 3, n) * 0.6;
        c = tone(PINE, l, x, y);
        if (x === 1 || x === w - 2) c = mix(c, BLACK, 0.4);
      }
      b.put(x, y, c);
    }
  }
  // riscos de uso e manchas de copo no painel
  for (let i = 0; i < Math.round((w * h) / 1400); i += 1) {
    const x = body0 + STILE + 2 + Math.floor(r() * (w - 2 * STILE - 8));
    const y = CORNICE + 4 + Math.floor(r() * (h - CORNICE - PLINTH - 8));
    const len = 3 + Math.floor(r() * 6);
    b.line(x, y, x + len, y + (r() < 0.5 ? 1 : -1), IMBUIA.hi, 0.18);
  }
  // os buracos
  for (const hole of holes) {
    if (hole.kind === 'niche' || hole.kind === 'key') {
      dropShadow(b, hole.x, hole.y, hole.w, hole.h, litRight);
      blit(b, paintNiche(hole.w, hole.h), hole.x, hole.y);
    } else if (hole.kind === 'velvet') {
      velvet(b, hole.x, hole.y, hole.w, hole.h, n);
      for (let x = 2; x < hole.w - 2; x += 1) b.put(hole.x + x, hole.y + hole.h, IMBUIA.hi, 0.6); // o lábio de baixo pega a luz
    } else if (hole.kind === 'slate') {
      dropShadow(b, hole.x, hole.y, hole.w, hole.h, litRight);
      slate(b, hole.x, hole.y, hole.w, hole.h, r, hole.split);
    } else if (hole.kind === 'brass') {
      dropShadow(b, hole.x, hole.y, hole.w, hole.h, litRight);
      brassPlate(b, hole.x, hole.y, hole.w, hole.h);
    }
  }
  // os pregos de latão da cornija e do rodapé
  for (const x of [4, w - 7]) {
    nail(b, x, 2);
    nail(b, x, h - 5);
  }
  // a sombra no chão
  for (let x = 2; x < w - 1; x += 1) {
    b.put(x + (litRight ? -1 : 1), h, BLACK, 0.55);
    b.put(x + (litRight ? -2 : 2), h + 1, BLACK, 0.3);
    b.put(x + (litRight ? -2 : 2), h + 2, BLACK, 0.12);
  }
  return b;
}
