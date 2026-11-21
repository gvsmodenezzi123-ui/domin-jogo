/**
 * Versão 2.17: a prancheta dos personagens novos (art/figurePixels.js). Cada material tem uma
 * RAMPA de sete tons (0 a sombra mais funda .. 4 a cor da ficha .. 6 o brilho), com a sombra
 * puxando para o roxo/vermelho e a luz para o amarelo, como numa paleta pintada à mão. Cada parte
 * do desenho é uma FORMA: um teste de quem está dentro, uma função de tom por pixel e a borda,
 * que cai para um tom escuro do próprio material (as linhas de separação). O contorno de tinta
 * em volta da figura inteira vem no fim.
 */

export const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function toHsv([r, g, b]) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}

function fromHsv(h, s, v) {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  const [r, g, b] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Gira `h` em direção a `to` (pelo caminho mais curto), no máximo `deg` graus. */
function toward(h, to, deg) {
  const d = ((to - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), deg);
}

const SKIN_V = [0.46, 0.7, 0.86, 0.96, 1.04, 1.1, 1.13];
const SKIN_S = [1.6, 1.5, 1.45, 1.33, 1.2, 1.06, 0.74];
const SKIN_H = [-17, -16, -12, -8, -5, 0, 2];
const SKIN_LIFT = [0, 0, 0, 0, 0.03, 0.08, 0.15];

/**
 * Os sete tons de um material. `kind`: 'skin' (pele), 'hair' (cabelo: o cinza sombreia roxo),
 * 'cloth' (pano: o branco sombreia rosado), 'metal' (o cinza sombreia azulado).
 */
export function rampOf(base, kind = 'cloth') {
  const c = typeof base === 'string' ? hex(base) : base;
  const [h0, s0, v0] = toHsv(c);
  if (kind === 'skin') {
    return SKIN_V.map((m, i) => fromHsv(h0 + SKIN_H[i], clamp01(Math.min(0.92, s0 * SKIN_S[i])), clamp01(Math.min(0.99, Math.max(v0 * m, i >= 4 ? v0 + SKIN_LIFT[i] : 0)))));
  }
  const light = clamp01((v0 - 0.5) / 0.45);
  const dark = [0.34, 0.56, 0.74, 0.9];
  const soft = [0.43, 0.7, 0.86, 0.95];
  const grey = s0 < 0.1;
  const tintH = kind === 'hair' ? 300 : kind === 'metal' ? 222 : 352;
  const tintS = kind === 'hair' ? [0.24, 0.2, 0.15, 0.11, 0.07, 0.05, 0.03] : kind === 'metal' ? [0.3, 0.26, 0.2, 0.14, 0.08, 0.05, 0.02] : [0.26, 0.22, 0.17, 0.12, 0.06, 0.04, 0.02];
  const room = (1 - v0) * (0.72 + 0.28 * v0);
  const lifts = [0.09 + 0.03 * light, 0.22 + 0.33 * light, 0.32 + 0.63 * light];
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const v = i < 4 ? v0 * (dark[i] + (soft[i] - dark[i]) * light) : v0 + room * lifts[i - 4];
    let s;
    let h;
    if (grey) {
      s = Math.max(s0, tintS[i]);
      h = s0 < 0.02 ? tintH : toward(h0, tintH, 40);
    } else {
      const rich = 1.14 - 0.14 * light;
      s = Math.min(0.96, i < 4 ? s0 * [1.24, 1.26, 1.22, 1.16][i] : s0 * rich * [1, 0.98 - 0.1 * light, 0.95 - 0.2 * light][i - 4]);
      h = i < 4 ? toward(h0, 285, [10, 8, 5, 2][i]) : toward(h0, 52, [0, 3, 7][i - 4]);
    }
    out.push(fromHsv(h, clamp01(s), clamp01(v)));
  }
  return out;
}

/** Ruído de valor (manchas macias de `s` px), fixo: os tons variam em blocos, não em xadrez. */
export function vnoise(x, y, s = 3, seed = 0) {
  const hsh = (i, j) => {
    let n = (i * 374761393 + j * 668265263 + seed * 69069) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (((n ^ (n >>> 16)) >>> 0) % 1000) / 1000;
  };
  const fx = x / s;
  const fy = y / s;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const a = hsh(ix, iy) + (hsh(ix + 1, iy) - hsh(ix, iy)) * tx;
  const b = hsh(ix, iy + 1) + (hsh(ix + 1, iy + 1) - hsh(ix, iy + 1)) * tx;
  return a + (b - a) * ty - 0.5;
}

/** Número fixo 0..1 por pixel (os fios soltos, os pontos de textura). */
export function hash(x, y, seed = 0) {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (((n ^ (n >>> 16)) >>> 0) % 10000) / 10000;
}

// --- testes de forma ---------------------------------------------------------------------------
// Versão 2.32: cada teste de forma conhecido leva junto a caixa (`box`: x0, y0, x1, y1, com folga)
// onde ele pode dar verdadeiro; a forma só varre essa caixa (a figura sai igual, mais depressa).
const withBox = (test, x0, y0, x1, y1) => Object.assign(test, { box: [Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(x1) + 1, Math.ceil(y1) + 1] });
export const ell = (cx, cy, rx, ry) => withBox((x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1, cx - rx, cy - ry, cx + rx, cy + ry);
export const box = (x0, y0, x1, y1) => withBox((x, y) => x >= x0 - 0.5 && x < x1 + 0.5 && y >= y0 - 0.5 && y < y1 + 0.5, x0, y0, x1, y1);
export const poly = (pts) =>
  withBox(
    (x, y) => {
      let inside = false;
      const px = x + 0.5;
      const py = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
    Math.min(...pts.map((p) => p[0])),
    Math.min(...pts.map((p) => p[1])),
    Math.max(...pts.map((p) => p[0])),
    Math.max(...pts.map((p) => p[1])),
  );
export const any = (...ts) => {
  const t = (x, y) => ts.some((f) => f(x, y));
  if (!ts.every((f) => f.box)) return t;
  t.box = [Math.min(...ts.map((f) => f.box[0])), Math.min(...ts.map((f) => f.box[1])), Math.max(...ts.map((f) => f.box[2])), Math.max(...ts.map((f) => f.box[3]))];
  return t;
};
export const all = (...ts) => {
  const t = (x, y) => ts.every((f) => f(x, y));
  const boxed = ts.filter((f) => f.box);
  if (boxed.length) t.box = [Math.max(...boxed.map((f) => f.box[0])), Math.max(...boxed.map((f) => f.box[1])), Math.min(...boxed.map((f) => f.box[2])), Math.min(...boxed.map((f) => f.box[3]))];
  return t;
};
export const not = (t) => (x, y) => !t(x, y);

/** A luz da lâmpada: de cima e da esquerda, um pouco de frente. */
const LX = -0.52;
const LY = -0.62;
const LZ = 0.59;

/** Tom de uma bola (cx, cy, rx, ry): `lo` na sombra .. `hi` na luz. */
export const ball = (cx, cy, rx, ry, lo, hi) => (x, y) => {
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return lo + (hi - lo) * clamp01((nx * LX + ny * LY + nz * LZ + 0.32) / 1.22);
};

/** Tom de um cilindro em pé entre x0 e x1: a luz bate um pouco à esquerda do meio. */
export const tube = (x0, x1, lo, hi) => (x) => {
  const n = ((x + 0.5 - x0) / (x1 - x0)) * 2 - 1;
  const nz = Math.sqrt(Math.max(0, 1 - n * n));
  return lo + (hi - lo) * clamp01((n * -0.5 + nz * 0.82 + 0.25) / 1.2);
};

/**
 * A prancheta: `w`×`h` pixels RGBA (o mesmo formato do buffer do paintKit: data, w, h, put).
 *
 * Versão 2.46 (HD): com `scale` 2 a prancheta guarda o dobro de pixels em cada eixo, mas o
 * desenho continua falando em pixels LÓGICOS (o `put` pinta o bloco 2×2, o `rect` e o `stamp`
 * também). As FORMAS é que ganham a resolução: o teste e o tom são lidos no meio de cada pixel
 * fino, então a borda das curvas, as dobras e os degradês saem lisos, e a linha de separação
 * (a borda escura de cada forma) e o contorno de tinta ficam com 1 pixel fino. Os testes
 * escritos com limites inteiros (`x >= 40 && x <= 44`) e os tons com listras (`x % 4 === 0`)
 * continuam valendo: a forma nota quando o teste fino só come a borda do teste inteiro (e usa o
 * inteiro) e o tom de cada bloco cai para o inteiro quando o fino diverge dele. Para o desenho
 * novo, `px` / `fput` / `fstamp` pintam direto no pixel fino. `w` e `h` são os da imagem (os
 * finos); `lw`/`lh` os lógicos. Cada pixel guarda a CAMADA que o pintou (`layer(n)`), para o
 * acabamento (sombra de contato entre as partes).
 */
export function board(w, h, scale = 1) {
  const S = scale;
  const PW = w * S;
  const PH = h * S;
  const data = new Uint8ClampedArray(PW * PH * 4);
  const zbuf = new Uint8Array(PW * PH);
  let z = 0;
  const layer = (n) => {
    z = n;
  };
  // versão 2.32: a caixa padrão das formas sem caixa própria (a cabeça do perfil no quadro maior)
  let limit = null;
  const setLimit = (r) => {
    limit = r;
  };
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  /** Um pixel fino (X, Y). */
  const px = (X, Y, c, a = 1) => {
    if (X < 0 || Y < 0 || X >= PW || Y >= PH || a <= 0) return;
    const p = Y * PW + X;
    const i = p * 4;
    if (a >= 1 || data[i + 3] === 0) {
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
      zbuf[p] = z;
      return;
    }
    data[i] = Math.round(data[i] + (c[0] - data[i]) * a);
    data[i + 1] = Math.round(data[i + 1] + (c[1] - data[i + 1]) * a);
    data[i + 2] = Math.round(data[i + 2] + (c[2] - data[i + 2]) * a);
  };
  const put = (xi, yi, c, a = 1) => {
    const x = Math.round(xi);
    const y = Math.round(yi);
    if (!inb(x, y) || a <= 0) return;
    if (S === 1) {
      px(x, y, c, a);
      return;
    }
    for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) px(x * S + i, y * S + j, c, a);
  };
  /** O pixel fino onde cai o ponto lógico (x, y) (x = 37.5 é a metade direita da coluna 37). */
  const fput = (x, y, c, a = 1) => px(Math.round(x * S), Math.round(y * S), c, a);
  const hasP = (X, Y) => X >= 0 && Y >= 0 && X < PW && Y < PH && data[(Y * PW + X) * 4 + 3] > 0;
  /** Só pinta por cima do que já existe (sombras e brilhos que não vazam para fora da figura). */
  const tint = (xi, yi, c, a = 1) => {
    const x = Math.round(xi);
    const y = Math.round(yi);
    if (!inb(x, y)) return;
    for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) if (hasP(x * S + i, y * S + j)) px(x * S + i, y * S + j, c, a);
  };
  const ftint = (X, Y, c, a = 1) => {
    if (hasP(X, Y)) px(X, Y, c, a);
  };
  const has = (xi, yi) => {
    const x = Math.round(xi);
    const y = Math.round(yi);
    if (!inb(x, y)) return false;
    for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) if (data[((y * S + j) * PW + x * S + i) * 4 + 3] > 0) return true;
    return false;
  };
  const get = (x, y) => {
    const i = ((y * S + (S >> 1)) * PW + x * S + (S >> 1)) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const getP = (X, Y) => {
    const i = (Y * PW + X) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const erase = (x, y) => {
    if (!inb(x, y)) return;
    for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) data[((y * S + j) * PW + x * S + i) * 4 + 3] = 0;
  };
  /**
   * Uma forma: `test(x, y)` diz quem é dela; `tone(x, y)` devolve o tom (fracionário) na rampa
   * `R`. A borda cai para o tom `edge` (a de cima e da esquerda, que pega luz, para `rim` se
   * dado). `noise`: quanto o tom varia em manchas. `dither`: a mistura em xadrez entre dois tons
   * vizinhos (só na HD). `fine`: true lê o teste só no fino, false só no inteiro (blocos).
   * Devolve a máscara (`has`, lógico; `hasP`, fino).
   */
  const form = (test, tone, R, { edge = 1, rim = null, noise = 0.3, seed = 1, x0, y0, x1, y1, fine = null, dither = 0 } = {}) => {
    // a caixa: a dada, a do teste (ell, poly, box...) ou a da prancheta (`limit`, se marcada)
    const bb = test.box ?? limit;
    const ax = Math.max(0, x0 ?? bb?.[0] ?? 0);
    const ay = Math.max(0, y0 ?? bb?.[1] ?? 0);
    const bx = Math.min(w - 1, x1 ?? bb?.[2] ?? w - 1);
    const by = Math.min(h - 1, y1 ?? bb?.[3] ?? h - 1);
    const mask = new Uint8Array(PW * PH);
    const toneOf = typeof tone === 'function' ? tone : () => tone;
    const top = R.length - 1;
    if (S === 1) {
      for (let y = ay; y <= by; y += 1) for (let x = ax; x <= bx; x += 1) if (test(x, y)) mask[y * w + x] = 1;
    } else {
      // o teste no inteiro (o desenho de sempre) e no fino
      const lw = bx - ax + 1;
      const ints = new Uint8Array(lw * (by - ay + 1));
      if (fine !== true) for (let y = ay; y <= by; y += 1) for (let x = ax; x <= bx; x += 1) if (test(x, y)) ints[(y - ay) * lw + x - ax] = 1;
      let added = 0;
      let lost = 0;
      if (fine !== false) {
        for (let Y = ay * S; Y < (by + 1) * S; Y += 1) {
          const yc = (Y + 0.5) / S - 0.5;
          for (let X = ax * S; X < (bx + 1) * S; X += 1) {
            if (!test((X + 0.5) / S - 0.5, yc)) continue;
            mask[Y * PW + X] = 1;
            if (fine !== true && !ints[(Math.floor(Y / S) - ay) * lw + Math.floor(X / S) - ax]) added += 1;
          }
        }
      }
      if (fine === false) {
        for (let Y = ay * S; Y < (by + 1) * S; Y += 1) for (let X = ax * S; X < (bx + 1) * S; X += 1) mask[Y * PW + X] = ints[(Math.floor(Y / S) - ay) * lw + Math.floor(X / S) - ax];
      } else if (fine !== true) {
        // o fino só perdeu pixels de dentro do inteiro (nenhum de fora): o teste é de limites
        // inteiros e o fino só comeu a borda; vale o inteiro, em blocos
        const blockCount = new Uint8Array(lw * (by - ay + 1));
        for (let Y = ay * S; Y < (by + 1) * S; Y += 1) {
          for (let X = ax * S; X < (bx + 1) * S; X += 1) {
            const bi = (Math.floor(Y / S) - ay) * lw + Math.floor(X / S) - ax;
            if (mask[Y * PW + X]) blockCount[bi] += 1;
            else if (ints[bi]) lost += 1;
          }
        }
        const blocky = added === 0 && lost > 0;
        if (globalThis.__FORMDBG) globalThis.__FORMDBG.push({ added, lost, blocky, stack: new Error().stack.split('\n')[3]?.trim() });
        for (let y = ay; y <= by; y += 1) {
          for (let x = ax; x <= bx; x += 1) {
            const bi = (y - ay) * lw + x - ax;
            // o bloco inteiro: no teste de limites, ou o detalhe fino que sumiria (1 px)
            if (!ints[bi] || !(blocky || blockCount[bi] === 0)) continue;
            for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) mask[(y * S + j) * PW + x * S + i] = 1;
          }
        }
      }
    }
    const m = (X, Y) => X >= 0 && Y >= 0 && X < PW && Y < PH && mask[Y * PW + X] === 1;
    // o tom de cada bloco no inteiro (para os tons de listra), lido só quando preciso
    const tint0 = S > 1 ? new Float32Array((bx - ax + 1) * (by - ay + 1)).fill(NaN) : null;
    const tInt = (x, y) => {
      const bi = (y - ay) * (bx - ax + 1) + x - ax;
      if (Number.isNaN(tint0[bi])) tint0[bi] = toneOf(x, y);
      return tint0[bi];
    };
    for (let Y = ay * S; Y < (by + 1) * S; Y += 1) {
      for (let X = ax * S; X < (bx + 1) * S; X += 1) {
        if (!mask[Y * PW + X]) continue;
        let t;
        let nx;
        let ny;
        if (S === 1) {
          nx = X;
          ny = Y;
          t = toneOf(X, Y);
        } else {
          nx = (X + 0.5) / S - 0.5;
          ny = (Y + 0.5) / S - 0.5;
          t = toneOf(nx, ny);
          // o tom fino diverge do inteiro do bloco (listra, costura, `y === 58`): vale o inteiro
          const ti = tInt(Math.floor(X / S), Math.floor(Y / S));
          if (!(Math.abs(t - ti) <= 0.75)) t = ti;
          // o fino que a curva ganhou fora do desenho inteiro pode não ter tom nenhum (tabela que
          // só vale dentro): fica no tom do meio, e a borda escurece ele
          if (Number.isNaN(t) || t == null) t = 3;
        }
        if (noise) t += vnoise(nx, ny, 2.7, seed) * noise * 2;
        if (edge != null) {
          const lit = !m(X - 1, Y) || !m(X, Y - 1);
          const dim = !m(X + 1, Y) || !m(X, Y + 1);
          if (lit && !dim && rim != null) t = Math.min(t, rim);
          else if (lit || dim) t = Math.min(t, edge);
        }
        if (dither && S > 1) t += (((X + Y) & 1) - 0.5) * dither;
        px(X, Y, R[clamp(Math.round(t), 0, top)]);
      }
    }
    const hasL = (xi, yi) => {
      const x = Math.round(xi);
      const y = Math.round(yi);
      if (!inb(x, y)) return false;
      for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) if (mask[(y * S + j) * PW + x * S + i]) return true;
      return false;
    };
    return { has: hasL, hasP: m, mask };
  };
  const rect = (x, y, rw, rh, c, a = 1) => {
    for (let yy = y; yy < y + rh; yy += 1) for (let xx = x; xx < x + rw; xx += 1) put(xx, yy, c, a);
  };
  const line = (x0, y0, x1, y1, c, a = 1) => {
    const n = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)), 1);
    for (let i = 0; i < n + 1; i += 1) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
  };
  /** A linha fina (1 pixel fino de largura), entre pontos lógicos. */
  const fline = (x0, y0, x1, y1, c, a = 1) => {
    const X0 = x0 * S + (S - 1) / 2;
    const Y0 = y0 * S + (S - 1) / 2;
    const X1 = x1 * S + (S - 1) / 2;
    const Y1 = y1 * S + (S - 1) / 2;
    const n = Math.max(Math.abs(Math.round(X1) - Math.round(X0)), Math.abs(Math.round(Y1) - Math.round(Y0)), 1);
    for (let i = 0; i <= n; i += 1) px(Math.round(X0 + ((X1 - X0) * i) / n), Math.round(Y0 + ((Y1 - Y0) * i) / n), c, a);
  };
  /** Carimba um mapa de caracteres: `pal[ch]` é a cor (falta = transparente). `flip` espelha. */
  const stamp = (rows, x, y, pal, flip = false) => {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i += 1) {
        const c = pal[row[i]];
        if (c) put(flip ? x - i : x + i, y + j, c);
      }
    });
  };
  /** O carimbo no fino: (X, Y) em pixels finos; `flip` espelha em volta de X. */
  const fstamp = (rows, X, Y, pal, flip = false) => {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i += 1) {
        const c = pal[row[i]];
        if (c) px(flip ? X - i : X + i, Y + j, c);
      }
    });
  };
  /**
   * O contorno de tinta em volta de tudo que está pintado. Na HD são 2 finos (a largura de
   * sempre): o de dentro sólido e o de fora um pouco transparente, para a silhueta ficar firme sem
   * pesar nas curvas.
   */
  const ink = (color, outer = S > 1 ? 0.7 : 0) => {
    const ring = () => {
      const marks = [];
      for (let Y = 0; Y < PH; Y += 1) for (let X = 0; X < PW; X += 1) if (!hasP(X, Y) && (hasP(X - 1, Y) || hasP(X + 1, Y) || hasP(X, Y - 1) || hasP(X, Y + 1))) marks.push(X, Y);
      return marks;
    };
    const first = ring();
    for (let i = 0; i < first.length; i += 2) px(first[i], first[i + 1], color);
    if (!outer) return;
    const second = ring();
    for (let i = 0; i < second.length; i += 2) {
      const p = second[i + 1] * PW + second[i];
      px(second[i], second[i + 1], color);
      data[p * 4 + 3] = Math.round(255 * outer);
    }
  };
  return { data, w: PW, h: PH, lw: w, lh: h, S, zbuf, layer, put, px, fput, tint, ftint, has, hasP, get, getP, erase, form, rect, line, fline, stamp, fstamp, ink, setLimit };
}
