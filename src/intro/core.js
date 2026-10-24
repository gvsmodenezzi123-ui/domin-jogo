// Ferramentas da abertura (canvas): matemática de tempo, sorteio determinístico, canvas de
// pixel art, fonte 3x5 para os letreiros, borrão, contorno de máscara e a conversão dos sprites
// SVG do jogo em imagens (os mesmos personagens da mesa, sem redesenhar nada).
//
// Tudo é função do tempo: o mesmo `t` sempre dá o mesmo quadro (é assim que o vídeo de
// divulgação sai quadro a quadro, igual ao que roda no jogo).

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, k) => a + (b - a) * k;
/** 0 → 1 entre `a` e `b` (linear). */
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const easeOut = (k) => 1 - (1 - k) ** 3;
export const easeIn = (k) => k * k * k;
export const easeOutBack = (k, s = 1.7) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2;

/** Sorteio determinístico em [0, 1): o mesmo par (i, sal) dá sempre o mesmo número. */
export function hash(i, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7 + 74.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Ruído suave 1D (balanço de mão, chama, neon). */
export function wobble(t, salt = 0) {
  const i = Math.floor(t);
  const f = t - i;
  return lerp(hash(i, salt), hash(i + 1, salt), smooth(f)) * 2 - 1;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Contexto 2D de pixel art: sem suavização e com atalhos de retângulo. */
export function pix(canvas) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  return g;
}

export function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Elipse cheia, pixel a pixel (sem serrilhado suavizado). */
export function ellipse(g, cx, cy, rx, ry, color) {
  g.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1);
  }
}

/** Linha de Bresenham. */
export function line(g, x0, y0, x1, y1, color, t = 1) {
  g.fillStyle = color;
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - x);
  const dy = -Math.abs(ye - y);
  const sx = x < xe ? 1 : -1;
  const sy = y < ye ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 4000; guard += 1) {
    g.fillRect(x, y, t, t);
    if (x === xe && y === ye) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Mapa de caracteres → pixels (um caractere por pixel; '.' ou ausente na paleta = vazio). */
export function paintMap(g, rows, palette, ox = 0, oy = 0) {
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const color = palette[ch];
      if (!color) {
        x += 1;
        continue;
      }
      let x1 = x + 1;
      while (x1 < row.length && row[x1] === ch) x1 += 1;
      g.fillStyle = color;
      g.fillRect(ox + x, oy + y, x1 - x, 1);
      x = x1;
    }
  });
}

export function mapCanvas(rows, palette) {
  const c = makeCanvas(Math.max(...rows.map((r) => r.length)), rows.length);
  paintMap(pix(c), rows, palette);
  return c;
}

// --- cor -------------------------------------------------------------------------

export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(c, a = 1) {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(c1, c2, k) {
  const a = hex(c1);
  const b = hex(c2);
  const m = a.map((v, i) => Math.round(lerp(v, b[i], k)));
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Faixa vertical em degraus (céu, parede): `stops` = [[y, cor], ...], com pontilhado entre os degraus. */
export function bands(g, x, w, stops) {
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [y0, c0] = stops[i];
    const [y1, c1] = stops[i + 1];
    for (let y = y0; y < y1; y += 1) {
      const k = (y - y0) / (y1 - y0);
      // degraus de 4 tons, com pontilhado na transição (cara de pixel art, não de degradê)
      const step = Math.floor(k * 4) / 4;
      const frac = k * 4 - Math.floor(k * 4);
      g.fillStyle = mix(c0, c1, step);
      g.fillRect(x, y, w, 1);
      if (frac > 0.5) {
        g.fillStyle = mix(c0, c1, Math.min(1, step + 0.25));
        for (let xx = x + (y % 2); xx < x + w; xx += 2) g.fillRect(xx, y, 1, 1);
      }
    }
  }
}

// --- fonte 3x5 (letreiros, lousa, placa) --------------------------------------------

const GLYPH5 = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', ':': '000010000010000', '.': '000000000000010', '!': '010010010000010', '·': '000000010000000',
  '-': '000000111000000', '$': '011110010011110', '/': '001001010100100', '?': '110001010000010', ',': '000000000010100',
  x: '000101010101000', h: '100100110101101', '♥': '000101111111010', ' ': '000000000000000',
};
const ACCENTS = { Á: ['A', 'acute'], Ã: ['A', 'tilde'], Â: ['A', 'circ'], É: ['E', 'acute'], Ê: ['E', 'circ'], Í: ['I', 'acute'], Ó: ['O', 'acute'], Õ: ['O', 'tilde'], Ô: ['O', 'circ'], Ú: ['U', 'acute'], Ç: ['C', 'cedil'] };

/** Escreve em fonte 3x5 (maiúsculas). Devolve a largura usada. `y` é o topo da letra (acentos sobem 2 px). */
export function text5(g, str, x, y, color, spacing = 1) {
  g.fillStyle = color;
  let cx = Math.round(x);
  for (const raw of str) {
    const up = raw.toUpperCase();
    const [base, accent] = ACCENTS[up] ?? [GLYPH5[raw] ? raw : up, null];
    const bits = GLYPH5[base] ?? GLYPH5[' '];
    for (let i = 0; i < 15; i += 1) if (bits[i] === '1') g.fillRect(cx + (i % 3), y + Math.floor(i / 3), 1, 1);
    if (accent === 'acute') g.fillRect(cx + 2, y - 2, 1, 1);
    if (accent === 'tilde') {
      g.fillRect(cx, y - 2, 1, 1);
      g.fillRect(cx + 1, y - 2, 1, 1);
      g.fillRect(cx + 2, y - 2, 1, 1);
    }
    if (accent === 'circ') {
      g.fillRect(cx + 1, y - 2, 1, 1);
    }
    if (accent === 'cedil') g.fillRect(cx + 1, y + 5, 1, 1);
    cx += 3 + spacing;
  }
  return cx - Math.round(x) - spacing;
}

export const text5Width = (str, spacing = 1) => str.length * (3 + spacing) - spacing;

// --- máscaras ---------------------------------------------------------------------

/** Borrão de caixa (3 passadas ≈ gaussiano) direto nos pixels; para brilhos e fundo desfocado. */
export function boxBlur(canvas, radius = 2, passes = 3) {
  const g = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = g.getImageData(0, 0, w, h);
  const src = img.data;
  const tmp = new Float32Array(src.length);
  const buf = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 1) buf[i] = src[i];
  const r = Math.max(1, Math.round(radius));
  const norm = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p += 1) {
    // horizontal
    for (let y = 0; y < h; y += 1) {
      for (let c = 0; c < 4; c += 1) {
        let acc = 0;
        for (let k = -r; k <= r; k += 1) acc += buf[(y * w + clamp(k, 0, w - 1)) * 4 + c];
        for (let x = 0; x < w; x += 1) {
          tmp[(y * w + x) * 4 + c] = acc * norm;
          acc += buf[(y * w + Math.min(w - 1, x + r + 1)) * 4 + c] - buf[(y * w + Math.max(0, x - r)) * 4 + c];
        }
      }
    }
    // vertical
    for (let x = 0; x < w; x += 1) {
      for (let c = 0; c < 4; c += 1) {
        let acc = 0;
        for (let k = -r; k <= r; k += 1) acc += tmp[(clamp(k, 0, h - 1) * w + x) * 4 + c];
        for (let y = 0; y < h; y += 1) {
          buf[(y * w + x) * 4 + c] = acc * norm;
          acc += tmp[(Math.min(h - 1, y + r + 1) * w + x) * 4 + c] - tmp[(Math.max(0, y - r) * w + x) * 4 + c];
        }
      }
    }
  }
  for (let i = 0; i < src.length; i += 1) src[i] = buf[i];
  g.putImageData(img, 0, 0);
  return canvas;
}

/** Cópia de um canvas (com margem opcional), para borrar ou tingir sem mexer no original. */
export function copyCanvas(src, pad = 0) {
  const c = makeCanvas(src.width + pad * 2, src.height + pad * 2);
  c.getContext('2d').drawImage(src, pad, pad);
  return c;
}

/** Silhueta: todo pixel visível vira `color` (sombra, recorte do impacto). */
export function silhouette(src, color) {
  const c = copyCanvas(src);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Tinge multiplicando (luz do ambiente sobre um sprite), preservando a transparência. */
export function tint(src, color, amount = 1) {
  const c = copyCanvas(src);
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = amount;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(src, 0, 0);
  return c;
}

/** Apaga do sprite a cor de fundo ligada às bordas (o "fundo escuro" dos retratos). */
export function clearBackdrop(src, matches) {
  const c = copyCanvas(src);
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const ok = (i) => d[i * 4 + 3] > 0 && matches(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  for (let x = 0; x < w; x += 1) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 1) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    if (!ok(i) && d[i * 4 + 3] > 0) continue;
    d[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Contorno de 1 px de uma máscara (pixels opacos com vizinho transparente). */
export function outline(src, color) {
  const { width: w, height: h } = src;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = color;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))) g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Deixa a máscara dura (alfa 0 ou 255), para polígonos virarem pixel art. */
export function hardAlpha(canvas, cut = 110) {
  const g = canvas.getContext('2d');
  const img = g.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > cut ? 255 : 0;
  g.putImageData(img, 0, 0);
  return canvas;
}

// --- sprites SVG do jogo → canvas ------------------------------------------------

/** Converte um <svg> já montado (string) em canvas de `w`×`h`. */
export async function svgToCanvas(markup, w, h) {
  const img = new Image();
  img.decoding = 'async';
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await img.decode();
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, w, h);
  return c;
}

/** Polígono cheio, pixel a pixel (testa o centro de cada pixel). */
export function poly(g, pts, color) {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.floor(Math.min(...ys));
  const y1 = Math.ceil(Math.max(...ys));
  g.fillStyle = color;
  for (let y = y0; y <= y1; y += 1) {
    const cy = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i += 1) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.round(xs[i]);
      const xb = Math.round(xs[i + 1]);
      if (xb > xa) g.fillRect(xa, y, xb - xa, 1);
    }
  }
}

/** Luz de contorno: pinta os pixels da borda que têm vazio na direção (dx, dy) da luz. */
export function rimLight(src, color, dirs = [[0, -1]]) {
  const { width: w, height: h } = src;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = color;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!on(x, y)) continue;
      if (dirs.some(([dx, dy]) => !on(x + dx, y + dy))) g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}
