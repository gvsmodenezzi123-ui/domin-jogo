/**
 * Versão 2.1: os 58 talismãs em pixel art de 32×32, pintados por código (antes eram SVGs de
 * 40×40 com poucos tons). Cada objeto tem volume de verdade: a luz vem da lâmpada de cima e da
 * esquerda, quatro tons por material (luz, base, sombra, sombra funda) com pontilhado nas
 * passagens, brilho especular no metal e no vidro, contorno colorido (a borda escura puxa a cor
 * do próprio objeto) e a sombrinha no chão. Os míticos ganham faísca; os necróticos, a névoa roxa.
 *
 * O kit (`kit()`) tem as formas: esfera/elipse com volume, caixa com chanfro, cilindro de pé e
 * deitado, bastão (cabo, palito, prego), anel (toro), polígono, área livre por função, cubo em
 * perspectiva (dados, caixas) e os materiais prontos (ouro, latão, ferro, ferrugem, madeira,
 * osso, papel, vidro, couro...).
 */
import { paintKit } from './botecoScene.js';

const { hex, buffer, rngOf } = paintKit;

export const RELIC_PX = 32;
const N = RELIC_PX;

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (c) => [clamp(c[0]), clamp(c[1]), clamp(c[2])];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const INK = hex('#120a06');

/** Cinco tons de um material: sp (brilho), hi, mid, lo, deep. `cool` para vidro e aço. */
function mat(base, { cool = false, gloss = 0.75 } = {}) {
  const c = hex(base);
  return {
    sp: rgb(mix(c, hex('#ffffff'), gloss)),
    hi: rgb(mix(c, cool ? hex('#eaf4ff') : hex('#fff2d6'), 0.36)),
    mid: c,
    lo: rgb(mix(c, cool ? hex('#0c1424') : hex('#2a1206'), 0.34)),
    deep: rgb(mix(c, hex('#080404'), 0.62)),
  };
}

const M = {
  gold: mat('#d8a838'),
  brass: mat('#b8862e'),
  copper: mat('#b8643a'),
  iron: mat('#646a72', { cool: true }),
  steel: mat('#a4b0b8', { cool: true, gloss: 0.9 }),
  rust: mat('#8e4420'),
  wood: mat('#9a6232'),
  darkWood: mat('#5e3618'),
  bone: mat('#e2d4ae'),
  ivory: mat('#ece2c6'),
  paper: mat('#eee4c8'),
  parchment: mat('#d4b878'),
  glass: mat('#bcdce6', { cool: true, gloss: 0.95 }),
  red: mat('#c42c26'),
  blood: mat('#8e1414'),
  green: mat('#3a8a48'),
  money: mat('#7aae6a'),
  blue: mat('#3a5ec4', { cool: true }),
  navy: mat('#26346a', { cool: true }),
  teal: mat('#2a8a84'),
  black: mat('#2e2a34', { cool: true }),
  white: mat('#ece8de'),
  leather: mat('#7a4424'),
  clay: mat('#c0683a'),
  flesh: mat('#dca282'),
  dead: mat('#b6b49a'),
  beer: mat('#e8a020'),
  foam: mat('#faf2de'),
  pink: mat('#e88aa0'),
  yellow: mat('#e8c020'),
  orange: mat('#e07a20'),
  purple: mat('#7a4ac8'),
  wax: mat('#2a2432', { cool: true }),
  ash: mat('#8a8680'),
  cloth: mat('#7a8a9a', { cool: true }),
  felt: mat('#2f6a3a'),
};

/** Escolhe o tom pela luz (-1 escuro .. 1 claro), com pontilhado nas transições. */
function shade(m, light, x, y) {
  const v = light + (dither(x, y) - 0.5) * 0.22;
  if (v > 0.45) return m.hi;
  if (v > -0.1) return m.mid;
  if (v > -0.5) return m.lo;
  return m.deep;
}

/** As ferramentas de desenho sobre um buffer 32×32. */
function kit(b) {
  const solid = (x, y) => x >= 0 && y >= 0 && x < N && y < N && b.data[(y * N + x) * 4 + 3] > 200;
  const px = (x, y, c, a = 1) => b.put(Math.round(x), Math.round(y), c, a);
  const each = (x0, y0, x1, y1, fn) => {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(N - 1, Math.ceil(y1)); y += 1) {
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(N - 1, Math.ceil(x1)); x += 1) {
        const c = fn(x, y);
        if (c) b.put(x, y, c);
      }
    }
  };

  /** Elipse com volume de esfera (luz de cima à esquerda) e o brilho; `flat` para discos. */
  const ell = (cx, cy, rx, ry, m, o = {}) =>
    each(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1 || (o.clip && !o.clip(x, y))) return null;
      if (o.spec !== false && (dx + 0.42) ** 2 + (dy + 0.45) ** 2 < (o.specR ?? 0.035)) return m.sp;
      const nz = Math.sqrt(1 - d2);
      const light = o.flat ? -dx * 0.35 - dy * 0.45 + (o.light ?? 0.05) : -dx * 0.5 - dy * 0.62 + nz * 0.45 - 0.2 + (o.light ?? 0);
      return shade(m, light, x, y);
    });

  /** Caixa com cantos arredondados (r), chanfro claro em cima/esquerda e escuro embaixo/direita. */
  const box = (x0, y0, w, h, m, o = {}) => {
    const r = o.r ?? 0;
    const x1 = x0 + w - 1;
    const y1 = y0 + h - 1;
    const inside = (x, y) => {
      if (x < x0 || y < y0 || x > x1 || y > y1) return false;
      const cx = Math.max(x0 + r, Math.min(x1 - r, x));
      const cy = Math.max(y0 + r, Math.min(y1 - r, y));
      return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5;
    };
    each(x0, y0, x1, y1, (x, y) => {
      if (!inside(x, y) || (o.clip && !o.clip(x, y))) return null;
      let light = 0.12 - ((x - x0) / Math.max(1, w)) * 0.35 - ((y - y0) / Math.max(1, h)) * 0.35 + (o.light ?? 0);
      if (o.bevel !== false) {
        if (!inside(x - 1, y) || !inside(x, y - 1)) light += 0.55;
        else if (!inside(x + 1, y) || !inside(x, y + 1)) light -= 0.5;
      }
      return shade(m, light, x, y);
    });
  };

  /** Cilindro de pé: luz pela posição horizontal (o brilho a 30% da largura), fundo e tampa elípticos. */
  const cylV = (x0, y0, w, h, m, o = {}) => {
    const ry = o.ry ?? Math.max(1, w / 5);
    const cx = x0 + w / 2;
    const at = (x) => {
      const t = (x + 0.5 - x0) / w;
      return t < 0.3 ? 0.62 - ((0.3 - t) / 0.3) ** 2 * 0.8 : 0.62 - ((t - 0.3) / 0.7) ** 1.6 * 1.5;
    };
    each(x0, y0, x0 + w - 1, y0 + h + ry, (x, y) => {
      const dx = (x + 0.5 - cx) / (w / 2);
      if (Math.abs(dx) > 1) return null;
      const bottom = y0 + h + ry * Math.sqrt(1 - dx * dx) - ry;
      if (y > bottom) return null;
      if (o.spec !== false && Math.abs((x + 0.5 - x0) / w - 0.26) < 0.05 && y > y0 + 1 && y < y0 + h - 1) return m.sp;
      return shade(m, at(x) + (o.light ?? 0), x, y);
    });
    if (o.cap !== false) {
      const cm = o.capMat ?? m;
      ell(cx, y0, w / 2, ry, cm, { flat: true, light: 0.5 + (o.capLight ?? 0), spec: false });
    }
  };

  /** Cilindro deitado (eixo horizontal). */
  const cylH = (x0, y0, w, h, m, o = {}) =>
    each(x0, y0, x0 + w - 1, y0 + h - 1, (x, y) => {
      const t = (y + 0.5 - y0) / h;
      if (o.clip && !o.clip(x, y)) return null;
      const light = t < 0.3 ? 0.62 - ((0.3 - t) / 0.3) ** 2 * 0.8 : 0.62 - ((t - 0.3) / 0.7) ** 1.6 * 1.5;
      if (o.spec !== false && Math.abs(t - 0.26) < 0.07) return m.sp;
      return shade(m, light + (o.light ?? 0), x, y);
    });

  /** Bastão de (x0,y0) a (x1,y1) com espessura `w`: o lado de cima/esquerda pega a luz. */
  const bar = (x0, y0, x1, y1, w, m, o = {}) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    if (nx + ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const half = w / 2;
    each(Math.min(x0, x1) - half - 1, Math.min(y0, y1) - half - 1, Math.max(x0, x1) + half + 1, Math.max(y0, y1) + half + 1, (x, y) => {
      const px0 = x + 0.5 - x0;
      const py0 = y + 0.5 - y0;
      let t = (px0 * dx + py0 * dy) / (len * len);
      if (o.flatEnds) {
        if (t < 0 || t > 1) return null;
      } else t = Math.max(0, Math.min(1, t));
      const qx = px0 - dx * t;
      const qy = py0 - dy * t;
      const dist = Math.hypot(qx, qy);
      if (dist > half) return null;
      const s = (qx * nx + qy * ny) / half; // 1 no lado da luz
      if (o.spec !== false && s > 0.35 && s < 0.75 && w >= 2.5) return m.sp;
      return shade(m, s * 0.75 - 0.05 + (o.light ?? 0) - t * (o.fade ?? 0), x, y);
    });
  };

  /** Anel (toro) de raio R e tubo r; `sy` achata (anel visto de lado). */
  const ring = (cx, cy, R, r, m, o = {}) => {
    const sy = o.sy ?? 1;
    each(cx - R - r - 1, cy - (R + r) * sy - 1, cx + R + r + 1, cy + (R + r) * sy + 1, (x, y) => {
      const dx = x + 0.5 - cx;
      const dy = (y + 0.5 - cy) / sy;
      const rho = Math.hypot(dx, dy) || 0.001;
      const u = (rho - R) / r;
      if (Math.abs(u) > 1 || (o.clip && !o.clip(x, y))) return null;
      const nx = (dx / rho) * u;
      const ny = (dy / rho) * u;
      const nz = Math.sqrt(1 - u * u);
      if (o.spec !== false && nx < -0.25 && ny < -0.25 && nz > 0.55 && nz < 0.85) return m.sp;
      return shade(m, -nx * 0.6 - ny * 0.7 + nz * 0.35 - 0.15 + (o.light ?? 0), x, y);
    });
  };

  /** Polígono (lista de [x, y]); a luz é um degradê de cima à esquerda, ou `light(x, y)`. */
  const poly = (pts, m, o = {}) => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const bx0 = Math.min(...xs);
    const by0 = Math.min(...ys);
    const bw = Math.max(1, Math.max(...xs) - bx0);
    const bh = Math.max(1, Math.max(...ys) - by0);
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    each(bx0 - 1, by0 - 1, bx0 + bw + 1, by0 + bh + 1, (x, y) => {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (!inside(cx, cy)) return null;
      let light = o.light ? o.light(x, y) : 0.15 - ((x - bx0) / bw) * 0.4 - ((y - by0) / bh) * 0.4;
      if (o.bevel) {
        if (!inside(cx - 1, cy) || !inside(cx, cy - 1)) light += 0.45;
        else if (!inside(cx + 1, cy) || !inside(cx, cy + 1)) light -= 0.45;
      }
      return shade(m, light, x, y);
    });
  };

  /** Área livre: pinta onde `test(x, y)` (centro do pixel) for verdadeiro, com chanfro. */
  const area = (x0, y0, x1, y1, test, m, o = {}) =>
    each(x0, y0, x1, y1, (x, y) => {
      if (!test(x + 0.5, y + 0.5)) return null;
      let light = (o.light ?? 0.1) - ((x - x0) / Math.max(1, x1 - x0)) * 0.35 - ((y - y0) / Math.max(1, y1 - y0)) * 0.35;
      if (o.bevel !== false) {
        if (!test(x - 0.5, y + 0.5) || !test(x + 0.5, y - 0.5)) light += 0.5;
        else if (!test(x + 1.5, y + 0.5) || !test(x + 0.5, y + 1.5)) light -= 0.45;
      }
      if (o.spec && !test(x - 0.5, y - 0.5) && test(x + 1.5, y + 1.5) && (x + y) % 3 === 0) return m.sp;
      return shade(m, light, x, y);
    });

  /**
   * Cubo em perspectiva: topo (losango), face esquerda e direita. Devolve as funções que levam
   * (u, v) de 0..1 em cada face para o pixel (para pintar os pontos do dado, rótulos...).
   */
  const cube = (cx, y0, s, h, mTop, mLeft = mTop, mRight = mLeft) => {
    const T = [cx, y0];
    const R = [cx + s, y0 + s / 2];
    const B = [cx, y0 + s];
    const L = [cx - s, y0 + s / 2];
    const down = (p) => [p[0], p[1] + h];
    poly([L, B, down(B), down(L)], mLeft, { light: (x, y) => 0.05 - (y - y0 - s / 2) * 0.02, bevel: false });
    poly([B, R, down(R), down(B)], mRight, { light: (x, y) => -0.42 - (y - y0 - s / 2) * 0.015, bevel: false });
    poly([T, R, B, L], mTop, { light: () => 0.5, bevel: false });
    // a quina da frente acesa e o fio do topo
    for (let y = B[1]; y < B[1] + h; y += 1) px(cx - 0.5, y, mLeft.hi);
    b.line(L[0], L[1], B[0] - 1, B[1], mTop.sp, 0.7);
    const lerp = (a, c, d, u, v) => [a[0] + (c[0] - a[0]) * u + (d[0] - a[0]) * v, a[1] + (c[1] - a[1]) * u + (d[1] - a[1]) * v];
    return {
      top: (u, v) => lerp(L, T, B, u, v),
      left: (u, v) => lerp(L, B, down(L), u, v),
      right: (u, v) => lerp(B, R, down(B), u, v),
    };
  };

  /** Sombrinha no chão (bem transparente, não ganha contorno). */
  const shadow = (cx, cy, rx, ry = 1.6) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (d <= 1) b.put(x, y, [10, 6, 4], 0.32 * (1 - d * 0.5));
      }
    }
  };

  /** Faísca de quatro pontas. */
  const spark = (x, y, c = hex('#fff6c8'), big = false) => {
    px(x, y, hex('#ffffff'));
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      px(x + dx, y + dy, c, 0.9);
    if (big) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) px(x + dx, y + dy, c, 0.45);
  };

  /** Linha de 1 px (alpha opcional). */
  const line = (x0, y0, x1, y1, c, a = 1) => b.line(x0, y0, x1, y1, c, a);

  return { b, M, mat, hex, px, each, ell, box, cylV, cylH, bar, ring, poly, area, cube, shadow, spark, line, solid, shade, mix, rgb };
}

/** Contorno colorido: a borda é a cor do vizinho escurecida (fica mais bonito que preto chapado). */
function outline(b) {
  const solid = (x, y) => x >= 0 && y >= 0 && x < N && y < N && b.data[(y * N + x) * 4 + 3] > 200;
  const marks = [];
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (solid(x, y)) continue;
      let best = null;
      let lum = 999;
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        if (!solid(nx, ny)) continue;
        const i = (ny * N + nx) * 4;
        const c = [b.data[i], b.data[i + 1], b.data[i + 2]];
        const l = c[0] + c[1] + c[2];
        if (l < lum) {
          lum = l;
          best = c;
        }
      }
      if (best) marks.push([x, y, rgb(mix(best, INK, 0.78))]);
    }
  }
  for (const [x, y, c] of marks) b.put(x, y, c);
}

/** Névoa dos necróticos: um halo roxo-escuro bem fraco em volta do contorno. */
function miasma(b) {
  const solid = (x, y) => x >= 0 && y >= 0 && x < N && y < N && b.data[(y * N + x) * 4 + 3] > 200;
  const tint = hex('#6a2a9a');
  const marks = [];
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (solid(x, y)) continue;
      let near = 0;
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) if (solid(x + dx, y + dy)) near += 1;
      if (near) marks.push([x, y, Math.min(0.42, near * 0.045)]);
    }
  }
  for (const [x, y, a] of marks) b.put(x, y, tint, a);
}

// ---------------------------------------------------------------------------
// Os talismãs (chave = `art` de data/relics.js)
// ---------------------------------------------------------------------------

/** Pontos de dado/dominó (2×2 com brilho) num centro. */
function pip(k, x, y, c = k.hex('#1a1008'), r = 1) {
  if (r <= 1) {
    k.px(x, y, c);
    k.px(x + 1, y, c);
    k.px(x, y + 1, c);
    k.px(x + 1, y + 1, c, 0.85);
  } else k.b.ellipse(x + 0.5, y + 0.5, r, r, c);
}

/** As posições dos pontos 1..6 numa face (u, v em 0..1). */
const PIPS = {
  1: [[0.5, 0.5]],
  2: [
    [0.25, 0.25],
    [0.75, 0.75],
  ],
  3: [
    [0.22, 0.22],
    [0.5, 0.5],
    [0.78, 0.78],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  6: [
    [0.27, 0.2],
    [0.73, 0.2],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.8],
    [0.73, 0.8],
  ],
};

/** Chama de vela/fósforo (núcleo claro, borda laranja) com o halo. */
function flame(k, cx, by, h = 7, palette = ['#fff6c0', '#ffc23a', '#e2581a']) {
  const [core, mid, edge] = palette.map(k.hex);
  for (let y = 0; y < h; y += 1) {
    const t = y / h;
    const w = Math.sin(Math.PI * (0.15 + t * 0.85)) * (h * 0.28) * (1 - t * 0.35);
    for (let x = Math.floor(cx - w - 1); x <= Math.ceil(cx + w); x += 1) {
      const d = Math.abs(x + 0.5 - cx) / Math.max(0.6, w);
      if (d > 1) continue;
      k.px(x, by - y, d < 0.4 && t > 0.15 ? core : d < 0.75 ? mid : edge);
    }
  }
  k.b.ellipse(cx, by - h / 2, h * 0.7, h * 0.75, k.hex(palette[1]), 0.16);
}

const ICONS = {
  canecaChopp(k) {
    const { M } = k;
    k.shadow(15, 29.5, 11);
    k.ring(22.5, 18, 4.6, 1.5, M.glass, { sy: 1.25, clip: (x) => x >= 21 });
    k.cylV(6, 10, 15, 17, M.beer, { ry: 2.2, cap: false });
    // o fundo grosso de vidro e as paredes
    k.cylV(6, 24, 15, 3, M.glass, { ry: 2.2, cap: false, spec: false, light: 0.2 });
    for (let y = 10; y < 26; y += 1) {
      k.px(6, y, M.glass.hi, 0.7);
      k.px(20, y, M.glass.lo, 0.5);
      k.px(8, y, M.glass.sp, 0.55);
      if (y % 2) k.px(12, y, M.beer.hi, 0.5);
      if (y % 2 === 0) k.px(16, y, M.beer.lo, 0.35);
    }
    for (const [x, y] of [
      [10, 21],
      [14, 17],
      [17, 22],
      [12, 14],
      [15, 24],
      [11, 18],
    ])
      k.px(x, y, M.foam.mid, 0.85);
    // espuma transbordando
    k.ell(13.5, 9.5, 8.6, 2.6, M.foam, { spec: false });
    k.ell(9, 7.8, 3.6, 2.6, M.foam, { spec: false });
    k.ell(14, 6.8, 4, 2.8, M.foam);
    k.ell(18.8, 8.2, 3, 2.2, M.foam, { spec: false });
    k.box(18, 9, 2, 5, M.foam, { r: 1, bevel: false, light: 0.3 });
  },

  borracha(k) {
    const { M, hex } = k;
    k.shadow(16, 25, 13, 2.4);
    const pink = M.pink;
    const blue = k.mat('#4a7ad8', { cool: true });
    // bloco em perspectiva: topo (paralelogramo) e frente
    k.poly(
      [
        [4, 14],
        [16, 8],
        [28, 12],
        [16, 18],
      ],
      pink,
      { light: (x) => (x > 16 ? 0.1 : 0.5) },
    );
    k.poly(
      [
        [16, 8],
        [28, 12],
        [22, 15],
        [10, 11],
      ],
      blue,
      { light: () => 0.45 },
    );
    k.poly(
      [
        [4, 14],
        [16, 18],
        [16, 24],
        [4, 20],
      ],
      pink,
      { light: () => -0.05 },
    );
    k.poly(
      [
        [16, 18],
        [28, 12],
        [28, 18],
        [16, 24],
      ],
      blue,
      { light: () => -0.45 },
    );
    // a divisa rosa/azul na frente direita e o desgaste
    k.poly(
      [
        [16, 18],
        [22, 15],
        [22, 21],
        [16, 24],
      ],
      pink,
      { light: () => -0.4 },
    );
    k.line(5, 14, 15, 9, pink.sp, 0.8);
    k.line(16, 18, 16, 24, hex('#fff0f4'), 0.6);
    k.px(9, 13, pink.lo);
    k.px(11, 15, pink.lo);
    k.px(7, 15, pink.lo);
  },

  cinzeiro(k) {
    const { M, hex } = k;
    k.shadow(15, 26.5, 13, 2.2);
    // a borda do cinzeiro de vidro grosso, a cavidade e a cinza
    k.ell(15, 20, 13, 6, M.glass, { flat: true, light: 0.1, spec: false });
    k.ell(15, 19, 13, 5.5, mat('#9ab8c4', { cool: true }), { flat: true, light: 0.35, spec: false });
    k.ell(15, 19.5, 9.5, 3.6, mat('#4a5a64', { cool: true }), { flat: true, light: -0.2, spec: false });
    k.ell(14, 20, 6, 2.2, M.ash, { flat: true, light: 0.1, spec: false });
    for (const [x, y] of [
      [11, 20],
      [15, 19],
      [17, 21],
      [13, 21],
    ])
      k.px(x, y, M.ash.hi);
    k.px(9, 16, M.glass.sp);
    k.px(10, 15, M.glass.sp);
    // duas bitucas e o cigarro aceso apoiado na borda
    k.bar(9, 21, 13, 19, 1.6, M.paper);
    k.px(13, 19, hex('#d9a046'));
    k.bar(17, 21, 20, 20, 1.6, M.paper);
    k.bar(16, 16, 27, 12, 2.2, M.white);
    k.bar(16, 16, 18.5, 15, 2.2, mat('#d9a046'));
    k.px(27, 12, hex('#ff6a1a'));
    k.px(28, 11, hex('#ffd04a'));
    // fumaça
    for (const [x, y, a] of [
      [28, 9, 0.6],
      [27, 7, 0.5],
      [28, 5, 0.4],
      [29, 3, 0.3],
      [27, 6, 0.3],
    ])
      k.px(x, y, hex('#d8d4cc'), a);
  },

  giz(k) {
    const { hex } = k;
    k.shadow(16, 28, 11, 2);
    const blue = k.mat('#3a7ae0', { cool: true });
    const f = k.cube(16, 6, 11, 11, k.mat('#5a9af0', { cool: true }), blue, k.mat('#2a5ab8', { cool: true }));
    // a cavidade gasta no topo (onde o taco esfrega)
    const [cx, cy] = f.top(0.5, 0.5);
    k.ell(cx, cy, 5, 2.4, k.mat('#2a5ab8', { cool: true }), { flat: true, light: -0.35, spec: false });
    k.ell(cx + 0.8, cy + 0.6, 3.6, 1.4, k.mat('#4a8ae8', { cool: true }), { flat: true, light: 0.1, spec: false });
    // marca "GIZ" na face e pó de giz
    const [lx, ly] = f.left(0.35, 0.45);
    k.line(lx - 2, ly, lx + 2, ly + 2, hex('#e8f0ff'), 0.8);
    k.line(lx - 2, ly + 2, lx + 2, ly + 4, hex('#e8f0ff'), 0.6);
    for (const [x, y] of [
      [4, 26],
      [7, 28],
      [26, 27],
      [28, 25],
      [24, 29],
    ])
      k.px(x, y, hex('#7ab0ff'), 0.8);
  },

  olhoVidro(k) {
    const { hex } = k;
    k.shadow(16, 28.5, 10, 2);
    k.ell(16, 15.5, 11.5, 11.5, k.mat('#f4efe4'), { spec: false });
    // veias
    for (const [x0, y0, x1, y1] of [
      [6, 12, 10, 14],
      [7, 20, 11, 18],
      [25, 11, 22, 14],
      [26, 19, 22, 17],
      [8, 16, 10, 16],
    ])
      k.line(x0, y0, x1, y1, hex('#c8402a'), 0.65);
    // íris azul com raios, pupila e o reflexo
    k.ell(17, 15, 6, 6, k.mat('#2a7ac8', { cool: true }), { spec: false, light: 0.1 });
    for (let a = 0; a < Math.PI * 2; a += 0.5) k.px(17 + Math.cos(a) * 4.5, 15 + Math.sin(a) * 4.5, hex('#8ad0ff'), 0.6);
    k.ell(17, 15, 2.7, 2.7, k.mat('#0a0a10'), { spec: false });
    k.px(13, 11, hex('#ffffff'));
    k.px(14, 11, hex('#ffffff'));
    k.px(13, 12, hex('#ffffff'));
    k.px(19, 17, hex('#ffffff'), 0.7);
    k.b.ellipse(10, 9, 2.2, 1.6, hex('#ffffff'), 0.5);
  },

  dadoViciado(k) {
    const { hex } = k;
    k.shadow(16, 28.5, 12, 2);
    const f = k.cube(16, 5, 12, 12, k.mat('#f4ecd8'), k.mat('#e4d8b8'), k.mat('#c8b890'));
    const dark = hex('#1a1008');
    for (const [u, v] of PIPS[6]) {
      const [x, y] = f.top(u, v);
      pip(k, x - 0.5, y - 0.5, dark);
    }
    for (const [u, v] of PIPS[5]) {
      const [x, y] = f.left(u, v);
      pip(k, x - 0.5, y - 0.5, dark);
    }
    const [x1, y1] = f.right(0.5, 0.5);
    pip(k, x1 - 1, y1 - 1, hex('#c8201a'), 1.6);
    // o chumbo escondido aparecendo por uma lasca
    k.px(25, 21, hex('#5a6168'));
    k.px(25, 22, hex('#8a949c'));
  },

  chaveDeFenda(k) {
    const { M, hex } = k;
    k.shadow(15, 29, 11, 1.8);
    k.bar(14, 17, 27, 4, 2.4, M.steel);
    k.bar(26, 5, 28, 3, 3.2, M.steel, { flatEnds: true });
    // cabo de acetato amarelo/laranja com sulcos
    const handle = k.mat('#e8a020');
    k.bar(5, 26, 13, 18, 6.4, handle);
    for (let i = 0; i < 4; i += 1) k.bar(6 + i * 2, 24 - i * 2, 7 + i * 2, 25 - i * 2, 1, handle, { light: -0.5 });
    k.bar(12, 19, 15, 16, 4.4, k.mat('#2a2a2a', { cool: true }));
    k.px(4, 26, hex('#fff0c0'));
  },


  buchaDeAco(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 10, 2);
    // a pedra [0|0] de aço: a espessura à direita, a face escovada, a divisória e o pino
    k.box(10, 3, 15, 27, M.iron, { r: 3, light: -0.3 });
    k.box(8, 2, 15, 27, M.steel, { r: 3 });
    k.box(10, 4, 11, 23, k.mat('#96a2aa', { cool: true }), { r: 2, light: 0.05 });
    k.box(9, 14, 13, 2, k.mat('#3a4048', { cool: true }), { bevel: false });
    k.line(9, 16, 21, 16, M.steel.sp, 0.8);
    k.ell(15.5, 15, 2, 2, M.gold);
    // o brilho diagonal do aço escovado
    for (let i = 0; i < 8; i += 1) k.px(11.5 + i * 0.7, 5 + i, M.steel.sp, 0.6);
    for (let i = 0; i < 7; i += 1) k.px(12 + i * 0.7, 18 + i, M.steel.sp, 0.45);
    k.spark(24, 4, hex('#eaf6ff'));
  },


  dedal(k) {
    const { hex } = k;
    k.shadow(16, 29, 10, 2);
    const lead = k.mat('#7c848e', { cool: true });
    // corpo: cone curto com a cúpula redonda em cima
    const inside = (x, y) => {
      if (y < 5 || y > 27) return false;
      const w = y < 11 ? Math.sqrt(Math.max(0, 1 - ((11 - y) / 6.2) ** 2)) * 7.2 : 7.2 + ((y - 11) / 16) * 2.6;
      return Math.abs(x - 16) <= w;
    };
    k.area(6, 4, 26, 27, inside, lead, { light: 0.05 });
    // volume de cilindro por cima do degradê
    k.each(6, 4, 26, 27, (x, y) => {
      if (!inside(x + 0.5, y + 0.5)) return null;
      const t = (x + 0.5 - 7) / 18;
      if (t > 0.62) return k.shade(lead, -0.55, x, y);
      if (t > 0.18 && t < 0.3 && y > 7) return lead.hi;
      return null;
    });
    // as covinhas (luz embaixo, sombra em cima: são buraquinhos)
    for (let y = 8; y <= 21; y += 3) {
      const w = (y < 11 ? 5 : 6 + ((y - 11) / 16) * 2.6) - 1;
      for (let x = 16 - w + ((y / 3) % 2) * 1.2; x <= 16 + w; x += 2.4) {
        k.px(x, y, lead.deep);
        k.px(x, y + 1, lead.hi, 0.7);
      }
    }
    // a borda grossa embaixo
    k.cylH(6, 23, 21, 5, k.mat('#8a929c', { cool: true }), { clip: (x, y) => inside(x + 0.5, y + 0.5) || (y >= 23 && Math.abs(x + 0.5 - 16) <= 10.2) });
    k.px(11, 7, hex('#ffffff'));
    k.px(10, 8, lead.sp);
  },

  espelho(k) {
    const { M, hex } = k;
    k.shadow(16, 28, 12, 1.8);
    // o braço que prende no para-brisa
    k.bar(16, 3, 16, 9, 3, M.black);
    k.ell(16, 3.5, 3, 2, M.black);
    // moldura e o vidro
    k.box(2, 8, 28, 15, M.black, { r: 5 });
    k.box(4, 10, 24, 11, k.mat('#6a9ab8', { cool: true }), { r: 4, bevel: false, light: 0.1 });
    // o reflexo: uma estrada e a pedra do rival
    k.box(4, 17, 24, 4, k.mat('#3a4a56', { cool: true }), { r: 0, bevel: false, clip: (x, y) => (x - 16) ** 2 / 144 + (y - 15.5) ** 2 / 30 <= 1.2 });
    k.box(14, 11, 5, 8, M.ivory, { r: 1 });
    k.px(16, 13, hex('#1a1008'));
    k.px(16, 16, hex('#1a1008'));
    k.line(14, 15, 18, 15, M.ivory.lo);
    // listras de brilho
    for (let i = 0; i < 6; i += 1) {
      k.px(6 + i, 19 - i * 1.3, hex('#ffffff'), 0.6);
      k.px(9 + i, 19 - i * 1.3, hex('#ffffff'), 0.35);
    }
  },

  carteira(k) {
    const { M, hex } = k;
    k.shadow(16, 28.5, 13, 2);
    // as notas saindo
    k.box(6, 5, 14, 9, M.money, { r: 1 });
    k.box(11, 3, 15, 9, k.mat('#8ac07a'), { r: 1 });
    k.ell(18.5, 7.5, 2, 2, k.mat('#5a8a4a'), { flat: true, spec: false });
    k.line(13, 5, 15, 5, hex('#e8ffe0'));
    // a carteira de couro estufada
    k.box(3, 11, 26, 16, M.leather, { r: 3 });
    k.box(3, 11, 26, 6, k.mat('#8a5430'), { r: 3, light: 0.15 });
    for (let x = 5; x < 27; x += 2) {
      k.px(x, 13, k.mat('#8a5430').lo);
      k.px(x, 25, M.leather.deep);
    }
    // o botão de pressão e as moedas
    k.ell(16, 17, 2.2, 2, M.gold);
    k.ell(25, 26, 3.6, 2.4, M.gold, { flat: true });
    k.ell(22, 27.5, 3.6, 2.2, M.gold, { flat: true, light: 0.2 });
  },

  anel(k) {
    const { M, hex } = k;
    k.shadow(16, 29, 10, 2);
    k.ring(16, 20, 7.5, 2.3, M.gold, { sy: 0.95 });
    // o engaste e a pedra vermelha lapidada
    k.box(11, 9, 10, 5, M.gold, { r: 1 });
    const ruby = k.mat('#d0202a');
    k.poly(
      [
        [10, 7],
        [13, 2],
        [19, 2],
        [22, 7],
        [16, 13],
      ],
      ruby,
      { light: (x, y) => (y < 7 ? (x < 16 ? 0.55 : 0.1) : x < 16 ? -0.1 : -0.5) },
    );
    k.line(10, 7, 22, 7, ruby.hi, 0.8);
    k.line(13, 2, 16, 7, ruby.sp, 0.6);
    k.px(13, 4, hex('#ffffff'));
    k.spark(23, 3, hex('#ffe0e0'));
  },

  maoGrande(k) {
    const { M } = k;
    k.shadow(16, 29.5, 10, 2);
    const skin = M.flesh;
    // punho da camisa
    k.box(9, 23, 14, 7, M.white, { r: 1 });
    k.box(9, 23, 14, 2, k.mat('#c8c0b0'), { bevel: false });
    // a palma e os dedos abertos
    k.box(9, 12, 14, 12, skin, { r: 3 });
    const fingers = [
      [10, 4, 9],
      [13.5, 2, 11],
      [17, 2.5, 10.5],
      [20.5, 5, 8],
    ];
    for (const [x, y, h] of fingers) k.box(x - 1.5, y, 3, h + 2, skin, { r: 1.5 });
    k.bar(9, 18, 4, 12, 3.2, skin);
    // as dobras e o anel de ouro no dedo
    for (const [x] of fingers) k.px(x - 0.5, 11, skin.lo);
    k.line(11, 18, 18, 17, skin.lo, 0.7);
    k.box(15.5, 7, 3, 2, M.gold, { bevel: false, light: 0.3 });
    k.px(16, 7, M.gold.sp);
  },

  relogio(k) {
    const { M, hex } = k;
    k.shadow(15, 29.5, 11, 1.8);
    // a corrente
    for (let i = 0; i < 7; i += 1) k.ring(24 + Math.cos(i * 0.5) * 3, 3 + i * 2.5, 1.4, 0.6, M.gold, { spec: false });
    // coroa e a caixa
    k.box(13, 2, 5, 4, M.gold, { r: 1 });
    k.ring(15.5, 16, 10, 2.4, M.gold);
    k.ell(15.5, 16, 8.4, 8.4, k.mat('#f4ecd8'), { flat: true, light: 0.25, spec: false });
    // marcas das horas, ponteiros parados e o vidro trincado
    for (let h = 0; h < 12; h += 1) {
      const a = (h / 12) * Math.PI * 2;
      k.px(15.5 + Math.cos(a) * 6.6, 16 + Math.sin(a) * 6.6, hex('#3a2a14'));
    }
    k.line(16, 16, 16, 10, hex('#1a1008'));
    k.line(16, 16, 20, 18, hex('#1a1008'));
    k.px(16, 16, hex('#c8201a'));
    k.line(9, 10, 14, 15, hex('#ffffff'), 0.85);
    k.line(14, 15, 12, 21, hex('#ffffff'), 0.7);
    k.line(14, 15, 21, 13, hex('#ffffff'), 0.6);
    k.spark(6, 6);
  },

  barbante(k) {
    const { hex } = k;
    k.shadow(15, 29, 11, 2);
    const twine = k.mat('#c8a46a');
    k.ell(15, 17, 10.5, 10.5, twine, { spec: false });
    // as voltas do fio (faixas em ângulos diferentes)
    for (let a = -1.2; a <= 1.2; a += 0.6) {
      for (let t = -9; t <= 9; t += 0.5) {
        const x = 15 + t * Math.cos(a) - 0 * Math.sin(a);
        const y = 17 + t * Math.sin(a) * 0.4 + Math.cos(t * 0.35) * 3 * Math.cos(a);
        if ((x - 15) ** 2 + (y - 17) ** 2 < 90) k.px(x, y, twine.lo, 0.75);
      }
    }
    for (let t = -8; t <= 8; t += 0.5) k.px(15 + t, 13 + Math.sin(t * 0.3) * 2, twine.hi, 0.7);
    // a ponta solta enrolando e as faíscas (mítico)
    for (let t = 0; t < 7; t += 0.25) k.px(24 + t * 0.9 + Math.sin(t * 1.6) * 1.2, 22 - t * 2.2, twine.mid);
    k.spark(27, 4, hex('#fff6c8'), true);
    k.spark(4, 6, hex('#e8d8ff'));
    k.spark(6, 26, hex('#fff6c8'));
  },


  pactoCoveiro(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 13, 1.8);
    // a pá de coveiro atrás, na diagonal: cabo com o T e a lâmina de ponta
    k.bar(4, 4, 18, 18, 2.4, M.darkWood);
    k.bar(2, 6, 6, 2, 2.2, M.darkWood);
    const blade = k.mat('#8a929a', { cool: true });
    k.poly(
      [
        [17, 15],
        [22, 13],
        [29, 20],
        [29, 27],
        [22, 22],
      ],
      blade,
      { bevel: true },
    );
    k.line(19, 16, 27, 23, blade.sp, 0.7);
    k.px(25, 23, M.rust.mid);
    // o contrato enrolado nas pontas, com a assinatura e o selo de sangue
    k.box(4, 13, 15, 14, M.parchment, { r: 1 });
    k.cylH(3, 11, 17, 3, M.parchment);
    k.cylH(3, 26, 17, 3, k.mat('#c0a060'));
    for (let y = 15; y < 22; y += 2) k.line(6, y, 16, y, M.parchment.lo, 0.7);
    k.line(6, 23, 9, 22, M.blood.mid);
    k.line(9, 22, 11, 24, M.blood.mid);
    k.ell(15, 23.5, 2.6, 2.4, M.red);
    k.px(14, 22, M.red.sp);
    k.px(15, 27, M.blood.mid);
    void hex;
  },

  ossoEnsanguentado(k) {
    const { M, hex } = k;
    k.shadow(16, 29, 12, 1.8);
    const end = (x, y) => {
      k.ell(x - 1.6, y - 1.2, 3, 3, M.bone, { spec: false });
      k.ell(x + 1.4, y + 1.6, 3, 3, M.bone, { spec: false });
    };
    k.bar(8, 22, 23, 8, 4, M.bone);
    end(7, 23);
    end(24, 7);
    k.px(21, 5, M.bone.sp);
    // o sangue escorrendo
    k.bar(13, 16, 18, 13, 3.2, M.blood);
    for (const [x, y0, len] of [
      [14, 18, 6],
      [17, 15, 8],
      [11, 21, 4],
    ]) {
      k.bar(x, y0, x, y0 + len, 1.4, M.red, { spec: false });
      k.ell(x + 0.5, y0 + len + 0.5, 1.2, 1.4, M.red);
    }
    k.px(16, 14, hex('#ff8a7a'));
  },

  olhoMorte(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 10, 1.8);
    k.ell(16, 13, 11, 10.5, M.bone, { spec: false });
    k.box(9, 18, 14, 9, M.bone, { r: 3 });
    // olhos: um vazio e um com a brasa vermelha
    k.ell(11.5, 14, 3.4, 3.6, k.mat('#1a1010'), { spec: false });
    k.ell(20.5, 14, 3.4, 3.6, k.mat('#1a1010'), { spec: false });
    k.ell(20.5, 14, 2, 2, k.mat('#ff2a1a'), { spec: false, light: 0.4 });
    k.px(20, 13, hex('#ffd0a0'));
    k.b.ellipse(20.5, 14, 5, 5, hex('#ff2a1a'), 0.22);
    // nariz e dentes
    k.poly(
      [
        [16, 17],
        [14, 21],
        [18, 21],
      ],
      k.mat('#2a1a14'),
    );
    for (let x = 11; x < 22; x += 2) k.line(x, 23, x, 27, M.bone.deep);
    k.line(10, 25, 22, 25, M.bone.lo, 0.8);
    // a rachadura
    k.line(8, 6, 11, 9, M.bone.deep);
    k.line(11, 9, 10, 11, M.bone.deep);
  },

  trancaCadaverica(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 11, 1.8);
    k.ring(16, 12, 7, 2, M.iron, { clip: (x, y) => y < 14 });
    k.bar(9, 12, 9, 15, 4, M.iron);
    k.bar(23, 12, 23, 15, 4, M.iron);
    k.box(5, 14, 22, 15, M.bone, { r: 3 });
    // a caveira no lugar do buraco da chave
    k.ell(16, 20, 4.5, 4, k.mat('#2a1a14'), { spec: false });
    k.ell(14.4, 19.6, 1.3, 1.4, M.bone, { spec: false });
    k.ell(17.6, 19.6, 1.3, 1.4, M.bone, { spec: false });
    k.box(14, 23, 5, 3, k.mat('#2a1a14'), { bevel: false });
    k.line(15, 23, 15, 25, M.bone.mid);
    k.line(17, 23, 17, 25, M.bone.mid);
    for (const [x, y] of [
      [7, 16],
      [25, 16],
      [7, 27],
      [25, 27],
    ])
      k.px(x, y, M.iron.mid);
    void hex;
  },


  falsaPartida(k) {
    const { M, hex } = k;
    k.shadow(16, 29, 10, 1.8);
    const heart = (x, y) => {
      if ((x - 10.5) ** 2 + (y - 11) ** 2 <= 36 || (x - 21.5) ** 2 + (y - 11) ** 2 <= 36) return true;
      // a ponta: triângulo de baixo
      if (y < 11 || y > 27) return false;
      const w = 11 * (1 - (y - 11) / 16) + 0.4;
      return Math.abs(x - 16) <= w;
    };
    k.area(3, 4, 29, 28, (x, y) => heart(x, y) && x < 16.2, M.red, { light: 0.3 });
    k.area(3, 4, 29, 28, (x, y) => heart(x, y) && x >= 16.2, k.mat('#8a8a94', { cool: true }), { light: 0.15 });
    // volume: a sombra embaixo de cada lado
    k.each(3, 4, 29, 28, (x, y) => {
      if (!heart(x + 0.5, y + 0.5)) return null;
      const dx = (x + 0.5 - 16) / 13;
      const dy = (y + 0.5 - 13) / 14;
      if (dy + Math.abs(dx) * 0.3 > 0.55) return x < 16 ? k.shade(M.red, -0.45, x, y) : k.shade(k.mat('#8a8a94', { cool: true }), -0.5, x, y);
      return null;
    });
    // a costura (pontos em X)
    for (let y = 7; y < 25; y += 3) {
      k.line(14, y, 18, y + 2, hex('#1a1010'));
      k.line(14, y + 2, 18, y, hex('#1a1010'));
    }
    k.ell(8.5, 9, 2, 1.6, M.red, { flat: true, light: 0.9, spec: false });
    k.px(7, 8, hex('#ffffff'));
    k.px(23, 9, hex('#d8d8e0'));
  },

  palitoDente(k) {
    const { M, hex } = k;
    k.shadow(16, 28, 12, 1.4);
    const wood = k.mat('#e0c08a');
    k.bar(5, 26, 26, 5, 2.4, wood, { spec: false });
    // ponta mastigada (lascas) e a ponta fina
    for (const [x, y] of [
      [4, 27],
      [5, 28],
      [3, 26],
      [6, 28],
      [3, 28],
    ])
      k.px(x, y, wood.lo);
    k.px(27, 4, wood.hi);
    k.px(28, 3, wood.mid);
    for (let i = 0; i < 5; i += 1) k.px(10 + i * 3, 21 - i * 3, wood.lo, 0.7);
    k.px(20, 10, hex('#fff6dc'));
    void M;
  },

  moedaFurada(k) {
    const { M } = k;
    k.shadow(16, 28.5, 12, 2);
    const bronze = k.mat('#c08a3a');
    // espessura da moeda (de lado) e a face
    k.ell(16, 16.5, 12, 11, k.mat('#7a5420'), { flat: true, light: -0.4, spec: false });
    k.ell(15.5, 15, 12, 11, bronze, { spec: true, specR: 0.02 });
    k.ring(15.5, 15, 9, 0.8, bronze, { spec: false, light: -0.3 });
    // o furo no meio (dá para ver o chão)
    k.ell(15.5, 15, 3, 3, bronze, { flat: true, light: -0.6, spec: false });
    k.each(12, 12, 19, 18, (x, y) => ((x + 0.5 - 15.5) ** 2 + (y + 0.5 - 15) ** 2 < 4.4 ? [0, 0, 0] : null));
    k.each(12, 12, 19, 18, (x, y) => {
      if ((x + 0.5 - 15.5) ** 2 + (y + 0.5 - 15) ** 2 < 4.4) {
        const i = (y * N + x) * 4;
        k.b.data[i + 3] = 0;
      }
      return null;
    });
    // número e as estrelinhas da borda
    for (let a = 0; a < Math.PI * 2; a += 0.52) k.px(15.5 + Math.cos(a) * 7, 15 + Math.sin(a) * 7, bronze.lo);
    void M;
  },


  panoChao(k) {
    const { hex } = k;
    k.shadow(16, 28.5, 13, 2);
    // o pano de chão de algodão, dobrado e torcido, com a listra azul e a parte molhada
    const cotton = k.mat('#e4dcc4');
    const wet = k.mat('#a8a490');
    const wave = (x) => Math.sin(x * 0.7) * 1.1;
    k.area(2, 6, 30, 27, (x, y) => y > 9 + wave(x) && y < 25 + wave(x + 2) && x > 3 + Math.sin(y) * 0.6 && x < 29 - Math.cos(y * 0.8) * 0.8, cotton, { light: 0.2 });
    // a dobra de cima (aba levantada)
    k.area(4, 4, 24, 14, (x, y) => y > 5 + wave(x * 1.3) * 0.8 && y < 13 - (x - 4) * 0.12 && x > 5 && x < 23 - (y - 5) * 0.3, k.mat('#f0e8d2'), { light: 0.4 });
    // listras azuis da trama
    for (let x = 3; x < 29; x += 1) {
      k.px(x, 18 + wave(x + 2) * 0.8, hex('#3a62c8'));
      k.px(x, 19 + wave(x + 2) * 0.8, hex('#2a4a9a'));
    }
    // a parte molhada e a trama de waffle
    k.each(14, 12, 29, 26, (x, y) => (k.solid(x, y) && (x - 24) ** 2 / 30 + (y - 21) ** 2 / 14 < 1 && (x + y) % 2 === 0 ? wet.mid : null));
    for (let y = 11; y < 25; y += 2) for (let x = 5; x < 28; x += 2) if (k.solid(x, y)) k.px(x, y, cotton.lo, 0.35);
    // as gotas
    for (const [x, y] of [
      [20, 27],
      [25, 28],
      [14, 28],
    ]) {
      k.ell(x + 0.5, y + 1, 1.2, 1.6, k.mat('#6ab0e0', { cool: true }));
      k.px(x, y, hex('#e0f4ff'));
    }
  },


  tampaGarrafa(k) {
    const { hex } = k;
    k.shadow(16, 28, 12, 2);
    const red = k.mat('#c8261e');
    // a saia serrilhada (vista de cima, um pouco de lado), amassada à direita
    const r0 = (a, x) => 11.5 + Math.cos(a * 21) * 0.75 - (x > 22 ? (x - 22) * 0.45 : 0);
    k.area(2, 3, 30, 29, (x, y) => {
      const dx = x - 16;
      const dy = (y - 16) / 0.92;
      return dx * dx + dy * dy <= r0(Math.atan2(dy, dx), x) ** 2;
    }, k.mat('#a01a14'), { light: -0.1 });
    k.area(2, 3, 30, 28, (x, y) => {
      const dx = x - 16;
      const dy = (y - 14.6) / 0.92;
      return dx * dx + dy * dy <= r0(Math.atan2(dy, dx), x) ** 2;
    }, red, { light: 0.15 });
    // o topo liso, a logo e o vinco do amassado
    k.ell(15.5, 14.5, 8.2, 7.6, k.mat('#dc3428'), { flat: true, light: 0.25, spec: false });
    k.ell(15, 14.5, 5, 3, k.mat('#f4e8c8'), { flat: true, light: 0.2, spec: false });
    k.line(11, 14, 19, 14, hex('#c8261e'));
    k.line(12, 15, 18, 15, hex('#c8261e'), 0.6);
    k.line(21, 6, 23, 24, red.deep, 0.9);
    k.line(22, 6, 24, 24, red.hi, 0.6);
    k.px(9, 9, hex('#ffffff'));
    k.px(10, 8, hex('#ffd0c8'));
  },

  radioPilha(k) {
    const { M, hex } = k;
    k.shadow(16, 29, 13, 1.8);
    // antena
    k.bar(22, 10, 28, 1, 1.4, M.steel, { spec: false });
    k.px(28, 1, M.steel.sp);
    // a caixa verde de plástico
    k.box(3, 9, 26, 19, k.mat('#3a7a5a'), { r: 3 });
    // a grade do alto-falante
    k.box(5, 12, 14, 13, k.mat('#2a3a30'), { r: 2, bevel: false });
    for (let y = 13; y < 24; y += 2) k.line(6, y, 17, y, k.mat('#8ab09a').mid, 0.85);
    // o dial dourado e o botão
    k.ell(23.5, 16, 3.4, 3.4, M.gold);
    k.line(23.5, 16, 24.5, 13.5, hex('#1a1008'));
    k.ell(23.5, 23.5, 2, 2, M.black);
    // chiado: risquinhos saindo
    for (const [x, y] of [
      [1, 6],
      [3, 4],
      [6, 3],
    ])
      k.px(x, y, hex('#fff0a0'), 0.9);
    k.line(29, 12, 31, 11, hex('#fff0a0'), 0.8);
  },

  fosforo(k) {
    const { hex } = k;
    k.shadow(14, 29, 8, 1.4);
    const wood = k.mat('#e8c890');
    k.bar(9, 28, 19, 10, 2.6, wood, { spec: false });
    // a cabeça queimando e a chama
    k.ell(19.8, 9, 2.6, 2.8, k.mat('#5a1a10'), { spec: false });
    k.px(19, 8, hex('#c84a2a'));
    flame(k, 20.5, 8, 8);
    for (const [x, y] of [
      [25, 3],
      [15, 2],
    ])
      k.px(x, y, hex('#ffd04a'), 0.8);
  },

  oculosFundo(k) {
    const { M, hex } = k;
    k.shadow(16, 25, 13, 1.6);
    // armação (hastes atrás)
    k.bar(2, 12, 6, 15, 1.6, M.black, { spec: false });
    k.bar(26, 15, 30, 12, 1.6, M.black, { spec: false });
    k.bar(13, 15, 19, 15, 2, M.black, { spec: false });
    // as lentes fundo de garrafa: anéis concêntricos que aumentam o olho
    for (const cx of [9, 23]) {
      k.ring(cx, 16, 6, 1.6, M.black);
      k.ell(cx, 16, 5, 5, M.glass, { flat: true, light: 0.2, spec: false });
      k.ring(cx, 16, 3.4, 0.5, k.mat('#8ab0c0', { cool: true }), { spec: false, light: -0.3 });
      k.ring(cx, 16, 1.8, 0.5, k.mat('#8ab0c0', { cool: true }), { spec: false, light: -0.3 });
      k.ell(cx + 0.5, 16.5, 1.2, 1.2, k.mat('#2a4a6a'), { spec: false });
      k.px(cx - 2, 13, hex('#ffffff'));
      k.px(cx - 3, 14, hex('#ffffff'), 0.7);
    }
  },

  canivete(k) {
    const { M, hex } = k;
    k.shadow(15, 28, 13, 1.8);
    // a lâmina aberta com ferrugem
    k.poly(
      [
        [14, 15],
        [27, 3],
        [29, 4],
        [18, 17],
      ],
      M.steel,
      { light: (x, y) => (x + y < 31 ? 0.55 : -0.2) },
    );
    k.px(22, 9, M.rust.mid);
    k.px(24, 7, M.rust.lo);
    k.px(20, 12, M.rust.mid);
    // o cabo vermelho com a cruz
    k.box(2, 15, 19, 9, k.mat('#c8261e'), { r: 4 });
    k.box(8, 17, 5, 5, M.white, { bevel: false, clip: (x, y) => Math.abs(x - 10) < 1 || Math.abs(y - 19) < 1 || false });
    k.box(9, 17, 2, 5, M.white, { bevel: false, light: 0.3 });
    k.box(8, 18, 5, 2, M.white, { bevel: false, light: 0.3 });
    // rebites e a argolinha
    k.px(18, 18, M.steel.sp);
    k.px(4, 20, M.steel.sp);
    k.ring(3, 25, 2, 0.7, M.steel, { spec: false });
    void hex;
  },


  trucoMarcado(k) {
    const { M, hex } = k;
    k.shadow(16, 29, 13, 1.6);
    const card = (cx, cy, ang, face) => {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const P = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
      k.poly([P(-6, -9.5), P(6, -9.5), P(6, 9.5), P(-6, 9.5)], face ? M.paper : k.mat('#b8261e'), { bevel: true });
      if (!face) {
        // o verso: losangos e a marquinha a lápis no canto (é assim que ele sabe)
        k.poly([P(-4, -7.5), P(4, -7.5), P(4, 7.5), P(-4, 7.5)], k.mat('#d84a3a'), { light: () => 0.05 });
        for (let v = -6; v <= 6; v += 3) {
          const [x, y] = P(0, v);
          k.px(x, y, hex('#f4d0b0'));
        }
        const [mx, my] = P(4, -8);
        k.line(mx - 1, my, mx + 1, my + 2, hex('#2a2ad0'));
      }
      return P;
    };
    card(9, 17, -0.42, false);
    card(15, 15.5, -0.12, false);
    const P = card(21, 16, 0.22, true);
    // a frente: o ás de espada espanhol
    const [x, y] = P(0, 0);
    k.bar(x - 1, y + 6, x + 1.5, y - 6, 2, M.steel);
    k.bar(x - 3, y + 3, x + 3, y + 3.8, 1.4, M.gold, { spec: false });
    k.ell(x - 1.2, y + 6.5, 1.3, 1.3, M.gold, { spec: false });
    const [ax, ay] = P(-4, -7);
    k.px(ax, ay, hex('#1a1008'));
    k.px(ax, ay + 1, hex('#1a1008'));
  },


  abridorLata(k) {
    const { M, hex } = k;
    k.shadow(16, 28.5, 12, 1.6);
    // cabo de madeira com a ponteira
    k.bar(4, 27, 14, 17, 5, M.wood);
    for (const [x, y] of [
      [7, 23],
      [10, 20],
    ])
      k.line(x - 1, y - 1, x + 1, y + 1, M.wood.lo);
    k.bar(13, 18, 15, 16, 5.4, M.steel, { flatEnds: true });
    // a haste chata e a lâmina em gancho (cega, de tanto abrir lata de sardinha)
    k.bar(15, 16, 22, 9, 2.6, M.steel);
    k.poly(
      [
        [20, 10],
        [23, 4],
        [28, 3],
        [29, 6],
        [26, 7],
        [25, 11],
        [22, 13],
      ],
      M.steel,
      { bevel: true },
    );
    k.poly(
      [
        [25, 11],
        [29, 13],
        [27, 15],
        [23, 13],
      ],
      M.steel,
      { bevel: true, light: () => -0.2 },
    );
    k.px(24, 5, M.steel.sp);
    k.px(28, 4, M.rust.mid);
    k.px(27, 14, M.rust.lo);
    void hex;
  },

  cinzeiroBitucas(k) {
    // Lanterna do Vigia (a chave `art` ficou do desenho antigo)
    const { M, hex } = k;
    k.shadow(16, 29.5, 10, 1.8);
    // a alça
    k.ring(16, 6, 5, 1, M.iron, { clip: (x, y) => y < 7, spec: false });
    // tampa, vidro com a chama, base
    k.poly(
      [
        [9, 9],
        [23, 9],
        [20, 5],
        [12, 5],
      ],
      M.iron,
      { bevel: true },
    );
    k.box(8, 9, 16, 3, M.iron, { r: 1 });
    k.box(9, 12, 14, 11, k.mat('#f4d890'), { r: 1, bevel: false, light: 0.4 });
    k.b.ellipse(16, 17, 6, 5, hex('#fff6c0'), 0.7);
    flame(k, 16, 20, 7);
    // as grades da lanterna
    for (const x of [9, 22]) k.bar(x, 12, x, 23, 1.6, M.iron, { spec: false });
    k.line(9, 17, 22, 17, M.iron.lo, 0.6);
    k.box(7, 23, 18, 5, M.iron, { r: 1 });
    k.px(10, 13, hex('#ffffff'));
    k.b.ellipse(16, 16, 15, 14, hex('#ffc23a'), 0.08);
  },

  notaTres(k) {
    const { M, hex } = k;
    k.shadow(16, 25, 14, 1.6);
    // a nota levemente torta, com o 3 grande e a efígie
    k.poly(
      [
        [2, 9],
        [29, 7],
        [30, 22],
        [3, 24],
      ],
      M.money,
      { bevel: true },
    );
    k.poly(
      [
        [4, 11],
        [27, 9.5],
        [28, 20],
        [5, 21.5],
      ],
      k.mat('#9ac88a'),
      { light: () => 0.1 },
    );
    k.ell(20, 15, 4.5, 4.5, k.mat('#6a9a5a'), { flat: true, light: -0.1, spec: false });
    k.ell(20, 14, 2, 2.2, k.mat('#4a7a3a'), { spec: false });
    k.box(18, 16, 5, 3, k.mat('#4a7a3a'), { bevel: false });
    // o 3
    const g = hex('#2a4a1e');
    k.line(7, 12, 11, 12, g);
    k.line(11, 12, 11, 19, g);
    k.line(8, 15, 11, 15, g);
    k.line(7, 19, 11, 19, g);
    k.line(8, 12, 12, 12, g);
    k.line(12, 12, 12, 19, g);
    k.line(8, 19, 12, 19, g);
    k.line(9, 15, 12, 15, g);
    k.px(25, 19, hex('#e8ffe0'));
  },


  fitaCrepe(k) {
    const { M } = k;
    k.shadow(15, 28, 12, 2);
    const tape = k.mat('#e0cc94');
    // a ponta solta descendo para a direita (atrás do rolo), rasgada em zigue-zague
    k.poly(
      [
        [16, 20],
        [28, 23],
        [27, 25],
        [29, 26],
        [27, 28],
        [28, 29],
        [15, 27],
      ],
      tape,
      { bevel: true, light: () => 0.05 },
    );
    // o rolo: a lateral e as camadas
    k.ell(13, 15, 11, 11, tape, { spec: false });
    for (let r = 6.8; r < 10.5; r += 1.2) k.ring(13, 15, r, 0.35, tape, { spec: false, light: -0.4 });
    k.ring(13, 15, 10.6, 0.6, tape, { spec: false, light: -0.6 });
    // o miolo de papelão e o buraco
    k.ring(13, 15, 5.4, 1.3, k.mat('#a07a4a'), { spec: false });
    k.each(7, 9, 19, 21, (x, y) => {
      if ((x + 0.5 - 13) ** 2 + (y + 0.5 - 15) ** 2 < 16) k.b.data[(y * N + x) * 4 + 3] = 0;
      return null;
    });
    k.px(6, 9, tape.sp);
    k.px(7, 8, tape.sp);
    void M;
  },


  espelhoBanheiro(k) {
    // Papel Carbono Amassado
    const { M, hex } = k;
    k.shadow(16, 28.5, 13, 1.8);
    // a folha branca com a cópia azul que vazou
    k.poly(
      [
        [9, 4],
        [29, 5],
        [28, 27],
        [8, 26],
      ],
      M.paper,
      { bevel: true },
    );
    for (let y = 8; y < 25; y += 3) k.line(18, y, 26, y + 0.2, hex('#4a5ab8'), 0.8);
    k.line(18, 22, 22, 21, hex('#4a5ab8'));
    // a bola de carbono amassada: esfera com facetas e vincos
    const carbon = k.mat('#2a3070', { cool: true, gloss: 0.6 });
    k.ell(11, 17, 8.5, 8, carbon, { spec: false });
    const folds = [
      [5, 13, 11, 16],
      [11, 16, 16, 12],
      [11, 16, 10, 24],
      [11, 16, 18, 20],
      [6, 20, 10, 24],
      [8, 10, 11, 16],
    ];
    for (const [x0, y0, x1, y1] of folds) {
      k.line(x0, y0, x1, y1, carbon.deep);
      k.line(x0 - 1, y0 - 0.5, x1 - 1, y1 - 0.5, carbon.hi, 0.7);
    }
    k.px(7, 12, carbon.sp);
    k.px(8, 11, carbon.sp);
    k.px(13, 13, carbon.sp, 0.7);
  },

  balancaAcougue(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 12, 1.8);
    // o prato em cima
    k.ell(16, 5, 11, 2.6, M.steel, { flat: true, light: 0.3 });
    k.bar(16, 6, 16, 9, 2.4, M.steel);
    // o corpo vermelho redondo com o mostrador
    k.ell(16, 16, 10, 9, k.mat('#c8261e'));
    k.ell(16, 16, 7.4, 6.6, k.mat('#f4ecd8'), { flat: true, light: 0.3, spec: false });
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.3) k.px(16 + Math.cos(a) * 6, 16 + Math.sin(a) * 5.4, hex('#3a2a14'));
    // o ponteiro descalibrado (passando do zero) e o parafuso
    k.line(16, 17, 11, 12, hex('#c8201a'));
    k.px(16, 17, hex('#1a1008'));
    k.box(14, 20, 4, 2, k.mat('#1a1008'), { bevel: false });
    // os pés
    k.box(5, 23, 22, 5, k.mat('#8a1a14'), { r: 2 });
    k.px(8, 24, k.mat('#c8261e').hi);
  },

  relogioParede(k) {
    const { M, hex } = k;
    k.shadow(16, 30, 7, 1.4);
    // o pêndulo
    k.bar(16, 17, 16, 25, 1.4, M.brass, { spec: false });
    k.ell(16, 26.5, 3, 3, M.brass);
    // a caixa de madeira redonda e o mostrador
    k.ell(16, 11, 10.5, 10, M.darkWood);
    k.ell(16, 11, 8, 7.6, k.mat('#f4ecd8'), { flat: true, light: 0.3, spec: false });
    for (let h = 0; h < 12; h += 1) {
      const a = (h / 12) * Math.PI * 2;
      k.px(16 + Math.cos(a) * 6.4, 11 + Math.sin(a) * 6, hex(h % 3 === 0 ? '#1a1008' : '#8a7a5a'));
    }
    k.line(16, 11, 16, 6, hex('#1a1008'));
    k.line(16, 11, 20, 11, hex('#1a1008'));
    k.px(16, 11, hex('#c8201a'));
    k.px(10, 5, M.darkWood.sp);
    k.px(9, 6, M.darkWood.hi);
  },

  caliceGalo(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 9, 1.8);
    // o pé e a haste
    k.ell(16, 27, 7, 2.2, M.brass, { flat: true, light: 0.2 });
    k.bar(16, 18, 16, 26, 2.6, M.brass);
    k.ell(16, 21, 2.4, 1.6, M.brass);
    // a taça com o sangue de galo
    k.area(5, 4, 27, 19, (x, y) => {
      const t = (y - 5) / 14;
      return y >= 5 && Math.abs(x - 16) <= 10.5 * Math.sqrt(Math.max(0, 1 - t * t)) && y <= 19;
    }, M.brass, { light: 0.15 });
    k.ell(16, 6, 10, 2.6, M.blood, { flat: true, light: 0.2, spec: false });
    k.ell(14, 5.6, 4, 0.9, M.red, { flat: true, light: 0.5, spec: false });
    k.px(8, 9, M.brass.sp);
    k.px(8, 10, M.brass.sp);
    // a pena do galo e as gotas
    k.bar(22, 4, 28, 0, 1.2, k.mat('#c84a1a'), { spec: false });
    k.bar(23, 3, 27, 1, 2.4, k.mat('#2a6a3a'), { spec: false });
    k.px(13, 12, M.blood.mid);
    k.px(13, 13, M.blood.mid);
    void hex;
  },


  dedoCadaver(k) {
    const { hex } = k;
    k.shadow(16, 27, 13, 1.8);
    const skin = k.mat('#b8b89a');
    // o dedo deitado, dobrado no nó do meio (duas falanges)
    k.bar(4, 20, 15, 18, 6.6, skin);
    k.bar(15, 18, 25, 13, 6, skin);
    k.ell(25, 13, 3.6, 3.2, skin);
    // a unha comprida amarelada
    k.poly(
      [
        [24, 10],
        [29, 10],
        [30, 13],
        [27, 15],
        [24, 13],
      ],
      k.mat('#d8c890'),
      { bevel: true },
    );
    k.line(25, 11, 28, 11, hex('#fff6d0'));
    // as rugas dos nós e as manchas roxas
    for (const x of [14, 15, 16]) k.line(x, 15.5, x + 1, 21, skin.lo, 0.8);
    k.line(21, 12.5, 22, 17, skin.lo, 0.7);
    k.ell(9, 21, 2, 1.2, k.mat('#8a6a8a'), { flat: true, spec: false });
    k.ell(19, 17, 1.4, 1, k.mat('#8a6a8a'), { flat: true, spec: false });
    // o toco cortado
    k.ell(3.5, 19.5, 2, 3.2, k.mat('#8a2a2a'), { flat: true, light: -0.1, spec: false });
    k.px(3, 19, hex('#e8d8c0'));
    // o barbante amarrado com laço
    const tw = k.mat('#c8a46a');
    k.bar(9, 16, 10, 23, 1.6, tw, { spec: false });
    k.ell(8, 25, 2.2, 1.6, tw, { spec: false });
    k.ell(12, 25, 2.2, 1.6, tw, { spec: false });
    k.line(9, 26, 7, 29, tw.mid);
    k.line(11, 26, 13, 29, tw.mid);
  },

  testamento(k) {
    const { M, hex } = k;
    k.shadow(16, 29, 13, 1.6);
    // duas metades do pergaminho rasgado (beirada em zigue-zague)
    const tear = [
      [15, 3],
      [17, 7],
      [14, 11],
      [17, 15],
      [14, 19],
      [16, 23],
      [14, 28],
    ];
    k.poly([[3, 4], ...tear, [4, 27]], M.parchment, { bevel: true });
    k.poly([[30, 5], [30, 27], ...[...tear].reverse().map(([x, y]) => [x + 3, y + 1])], M.parchment, { bevel: true, light: (x, y) => 0.05 - (y - 5) * 0.02 });
    for (let y = 8; y < 24; y += 3) {
      k.line(5, y, 13, y, M.parchment.lo, 0.8);
      k.line(19, y + 1, 28, y + 1, M.parchment.lo, 0.8);
    }
    // o selo de cera partido
    k.ell(15.5, 24, 4, 3.6, M.red, { clip: (x) => x < 15 });
    k.ell(18.5, 25, 4, 3.6, M.red, { clip: (x) => x >= 18 });
    k.px(13, 22, M.red.sp);
    k.line(6, 6, 10, 6, hex('#3a2a14'));
  },

  dadoOsso(k) {
    const { M, hex } = k;
    k.shadow(16, 28.5, 12, 2);
    const f = k.cube(16, 5, 12, 12, k.mat('#ece0c0'), M.bone, k.mat('#b8a880'));
    const carve = hex('#3a2414');
    for (const [u, v] of PIPS[6]) {
      const [x, y] = f.top(u, v);
      pip(k, x - 0.5, y - 0.5, carve);
    }
    for (const [u, v] of PIPS[3]) {
      const [x, y] = f.left(u, v);
      pip(k, x - 0.5, y - 0.5, carve);
    }
    for (const [u, v] of PIPS[2]) {
      const [x, y] = f.right(u, v);
      pip(k, x - 0.5, y - 0.5, carve);
    }
    // as rachaduras e manchas do osso
    k.line(9, 18, 11, 22, M.bone.deep);
    k.line(11, 22, 10, 25, M.bone.deep);
    k.line(22, 9, 25, 11, M.bone.lo);
    k.px(20, 22, hex('#8a6a3a'));
    k.px(21, 24, hex('#8a6a3a'));
  },

  pires(k) {
    const { M, hex } = k;
    k.shadow(16, 26, 14, 2);
    // o pires de louça
    k.ell(16, 20, 14, 5.5, M.white, { flat: true, light: 0.05, spec: false });
    k.ell(16, 19.4, 10, 3.6, k.mat('#d8d4c8'), { flat: true, light: -0.1, spec: false });
    k.ring(16, 20, 13, 0.5, k.mat('#3a6ac8', { cool: true }), { sy: 0.4, spec: false });
    // azeitonas, amendoins e o palito
    k.ell(11, 17.5, 2.6, 2.2, k.mat('#3a5a1a'));
    k.ell(15, 18.5, 2.6, 2.2, k.mat('#4a6a24'));
    k.px(11, 17, hex('#c84a2a'));
    for (const [x, y] of [
      [19, 18],
      [21, 17],
      [20, 19.5],
      [22, 19],
      [18, 19.5],
    ])
      k.ell(x, y, 1.4, 1.1, k.mat('#c8964a'), { spec: false });
    k.bar(14, 17, 20, 9, 1.2, k.mat('#e0c08a'), { spec: false });
    k.px(20, 9, hex('#fff0c0'));
    k.px(9, 19, hex('#ffffff'));
  },

  gilete(k) {
    const { M, hex } = k;
    k.shadow(16, 25, 14, 1.6);
    const blade = M.steel;
    // a lâmina de dois fios (um pouco inclinada)
    k.box(2, 10, 28, 12, blade, { r: 1 });
    k.line(3, 10, 28, 10, blade.sp);
    k.line(3, 21, 28, 21, blade.deep);
    // o recorte do meio e os furos
    k.box(8, 14, 16, 4, k.mat('#2a2e34', { cool: true }), { bevel: false });
    k.box(5, 14, 3, 4, k.mat('#2a2e34', { cool: true }), { r: 1, bevel: false });
    k.box(24, 14, 3, 4, k.mat('#2a2e34', { cool: true }), { r: 1, bevel: false });
    k.each(5, 14, 27, 17, (x, y) => {
      const i = (y * N + x) * 4;
      if (k.b.data[i] < 60) k.b.data[i + 3] = 0;
      return null;
    });
    k.line(4, 12, 10, 12, hex('#ffffff'), 0.8);
    k.px(26, 19, M.rust.mid);
    k.spark(28, 8, hex('#eaf6ff'));
  },

  bicarbonato(k) {
    const { M, hex } = k;
    k.shadow(15, 29.5, 10, 1.6);
    const f = k.cube(15, 4, 9, 18, M.white, M.white, k.mat('#c8c8d0', { cool: true }));
    // o rótulo azul e o nome
    const [x0, y0] = f.left(0, 0.38);
    k.poly(
      [
        [x0, y0],
        f.left(1, 0.38),
        f.left(1, 0.62),
        f.left(0, 0.62),
      ],
      k.mat('#2a5ac8', { cool: true }),
      { light: () => 0.05 },
    );
    const [lx, ly] = f.left(0.5, 0.5);
    k.line(lx - 3, ly - 1, lx + 2, ly + 1, hex('#ffffff'));
    k.poly([f.right(0, 0.38), f.right(1, 0.38), f.right(1, 0.62), f.right(0, 0.62)], k.mat('#1a3a90', { cool: true }), { light: () => -0.2 });
    // o pó caindo da tampa aberta
    for (const [x, y] of [
      [23, 8],
      [25, 11],
      [24, 14],
      [27, 16],
      [26, 20],
      [28, 24],
    ])
      k.px(x, y, hex('#ffffff'), 0.9);
  },

  cofrinho(k) {
    const { hex } = k;
    k.shadow(16, 29.5, 12, 1.8);
    const clay = k.mat('#c8784a');
    // pernas
    for (const x of [8, 13, 19, 23]) k.box(x, 22, 3, 6, clay, { r: 1 });
    // o corpo e o focinho
    k.ell(15.5, 17, 11.5, 8.5, clay);
    k.ell(26.5, 17, 3, 3.4, clay);
    k.ell(27, 17, 1.8, 2.4, k.mat('#a85a34'), { flat: true, spec: false });
    k.px(26.5, 16, hex('#3a1a10'));
    k.px(27.5, 18, hex('#3a1a10'));
    // a orelha, o olho e o rabinho
    k.poly(
      [
        [19, 10],
        [22, 5],
        [24, 11],
      ],
      clay,
      { bevel: true },
    );
    k.px(22, 13, hex('#1a1008'));
    k.ring(4, 15, 1.5, 0.6, clay, { spec: false });
    // a fenda com a moeda entrando
    k.box(12, 9, 7, 2, k.mat('#2a1008'), { bevel: false });
    k.box(13, 3, 5, 7, k.mat('#e6b84a'), { r: 1 });
    k.px(14, 4, hex('#fff0a0'));
    // a rachadura
    k.line(8, 18, 10, 21, clay.deep);
  },

  prego(k) {
    const { M } = k;
    k.shadow(16, 28.5, 11, 1.4);
    // haste enferrujada e a cabeça
    k.bar(7, 25, 23, 9, 2.6, M.rust);
    k.bar(5, 27, 8, 24, 1.6, M.rust, { spec: false, light: -0.3 });
    k.poly(
      [
        [19, 9],
        [25, 3],
        [29, 7],
        [23, 13],
      ],
      M.iron,
      { bevel: true },
    );
    for (const [x, y] of [
      [12, 19],
      [15, 17],
      [18, 13],
      [10, 22],
    ])
      k.px(x, y, k.mat('#c8642a').hi);
    k.px(24, 5, M.iron.sp);
  },



  peCoelho(k) {
    const { M, hex } = k;
    k.shadow(15, 29.5, 10, 1.6);
    // a argola do chaveiro, a correntinha e o tampão dourado
    k.ring(20, 4, 3, 1, M.steel);
    k.bar(18.5, 7, 17.5, 9, 1.4, M.steel, { spec: false });
    k.box(13, 8, 8, 4, M.gold, { r: 1 });
    // o pé: oval gorducho de pelo, com os três dedos embaixo e a borda em tufos
    const fur = k.mat('#e4d6ba');
    const foot = (x, y) => {
      const tuft = Math.sin(y * 2.1 + x * 1.3) * 0.7;
      const oval = ((x - 16) / (6.2 + tuft)) ** 2 + ((y - 19) / 8.2) ** 2 <= 1;
      const toes = [11.5, 16, 20.5].some((tx) => (x - tx) ** 2 + (y - 26) ** 2 <= 6.2);
      return y >= 11 && (oval || toes);
    };
    k.area(5, 10, 27, 29, foot, fur, { light: 0.3 });
    // volume: sombra do lado direito e embaixo
    k.each(5, 10, 27, 29, (x, y) => {
      if (!foot(x + 0.5, y + 0.5)) return null;
      return (x - 16) / 6 + (y - 19) / 12 > 0.75 ? k.shade(fur, -0.45, x, y) : null;
    });
    // pelo em fiapos e as falhas (sarnento)
    for (let i = 0; i < 30; i += 1) {
      const x = 10 + ((i * 7) % 12);
      const y = 12 + ((i * 5) % 14);
      if (k.solid(x, y)) k.line(x, y, x + 1, y + 1, i % 3 ? fur.lo : fur.hi, 0.7);
    }
    k.ell(18, 17, 1.8, 1.4, k.mat('#c8908a'), { flat: true, spec: false });
    k.ell(13, 21, 1.4, 1.1, k.mat('#c8908a'), { flat: true, spec: false });
    // as unhas
    for (const x of [11, 16, 21]) k.px(x, 28, hex('#3a2a20'));
  },

  grampo(k) {
    const { hex } = k;
    k.shadow(16, 28.5, 8, 1.4);
    const pin = k.mat('#2e2a34', { cool: true, gloss: 0.6 });
    // as duas pernas do grampo: uma reta, outra ondulada, unidas na curva de cima
    k.ring(16, 6, 3, 1.1, pin, { clip: (x, y) => y < 6 });
    k.bar(13, 6, 13, 27, 2.2, pin);
    for (let y = 6; y < 26; y += 0.5) k.px(19 + Math.sin((y - 6) * 0.75) * 1.4, y, pin.mid);
    for (let y = 6; y < 26; y += 0.5) k.px(19.8 + Math.sin((y - 6) * 0.75) * 1.4, y, pin.lo);
    k.ell(13, 27, 1.4, 1.2, k.mat('#5a5460'));
    k.ell(19.5, 26, 1.4, 1.2, k.mat('#5a5460'));
    k.px(12, 9, hex('#c8c8e0'));
    k.px(12, 10, hex('#c8c8e0'));
  },



  espatula(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 12, 1.6);
    // o cabo de madeira na diagonal e o pescoço de aço
    k.bar(4, 28, 12, 20, 4.4, M.wood);
    k.px(7, 25, M.wood.lo);
    k.px(9, 23, M.wood.lo);
    k.bar(11, 21, 17, 15, 2.4, M.steel);
    // a lâmina larga (quadrada, girada) com as fendas
    k.poly(
      [
        [14, 12],
        [21, 3],
        [30, 11],
        [21, 19],
      ],
      M.steel,
      { bevel: true, light: (x, y) => 0.25 - (x - 14) * 0.03 - (y - 3) * 0.02 },
    );
    for (const o of [-3, 0, 3]) k.line(17.5 + o * 0.7, 12 + o * 0.7, 22.5 + o * 0.7, 7 + o * 0.7, k.mat('#262a30', { cool: true }).mid);
    k.line(21, 4, 28, 11, hex('#ffffff'), 0.7);
    // a gordura amarela grudada na beirada
    const fat = k.mat('#e8c050');
    k.ell(27, 12, 1.6, 1.3, fat);
    k.ell(23, 16, 1.4, 1.2, fat);
    k.bar(23, 17, 23, 21, 1.2, fat, { spec: false });
  },

  taco(k) {
    const { M, hex } = k;
    k.shadow(16, 29, 12, 1.4);
    // o taco na diagonal, a madeira clara e o anel
    k.bar(4, 28, 20, 12, 4, M.darkWood);
    k.bar(16, 16, 26, 6, 2.8, k.mat('#e0c08a'));
    k.bar(19, 13, 21, 11, 3.6, M.ivory, { flatEnds: true });
    // a ponta azul de giz e a lasca
    k.bar(25, 7, 28, 4, 3, k.mat('#3a7ae0', { cool: true }), { flatEnds: true });
    k.px(28, 3, hex('#8ab0ff'));
    k.poly(
      [
        [22, 9],
        [24, 7],
        [26, 11],
      ],
      k.mat('#e0c08a'),
      { bevel: true },
    );
    for (const [x, y] of [
      [27, 1],
      [29, 2],
    ])
      k.px(x, y, hex('#7ab0ff'), 0.7);
  },



  oleo(k) {
    const { M, hex } = k;
    k.shadow(15, 29.5, 11, 1.8);
    const red = k.mat('#c8261e');
    // a almotolia: base redonda, corpo em cone e o bico comprido
    k.cylV(5, 21, 20, 5, M.brass, { ry: 2.6, cap: false });
    k.area(5, 8, 25, 22, (x, y) => y >= 9 && y <= 22 && Math.abs(x - 15) <= 2 + ((y - 9) / 13) * 8.2, red, { light: 0.25 });
    k.each(5, 8, 25, 22, (x, y) => {
      if (!(y >= 9 && y <= 22 && Math.abs(x + 0.5 - 15) <= 2 + ((y - 9) / 13) * 8.2)) return null;
      const t = (x + 0.5 - 15) / (2 + ((y - 9) / 13) * 8.2);
      if (t > 0.45) return k.shade(red, -0.5, x, y);
      if (t > -0.55 && t < -0.3) return red.hi;
      return null;
    });
    // a faixa dourada do rótulo
    k.each(5, 15, 25, 18, (x, y) => (Math.abs(x + 0.5 - 15) <= 2 + ((y - 9) / 13) * 8.2 && y >= 16 && y <= 17 ? (x < 15 ? M.gold.hi : M.gold.mid) : null));
    // o bico e a gota de óleo
    k.bar(15, 10, 26, 2, 1.8, M.brass);
    k.ell(15, 9.5, 2.4, 1.4, M.brass);
    k.ell(27.5, 4.5, 1.2, 1.7, k.mat('#c8a020'));
    k.px(27, 4, hex('#fff0a0'));
    k.px(11, 22, M.brass.sp);
  },

  pacoteTremoco(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 11, 1.6);
    // o saquinho de papel com a boca dobrada
    const bag = k.mat('#c89a5a');
    k.poly(
      [
        [6, 9],
        [26, 9],
        [27, 28],
        [5, 28],
      ],
      bag,
      { bevel: true },
    );
    k.poly(
      [
        [6, 9],
        [26, 9],
        [24, 5],
        [8, 5],
      ],
      k.mat('#a87a3a'),
      { light: () => -0.2 },
    );
    // os tremoços amarelos saindo
    for (const [x, y] of [
      [11, 6],
      [15, 4],
      [19, 5],
      [13, 3],
      [17, 2],
      [22, 6],
    ])
      k.ell(x, y, 2.2, 1.8, k.mat('#f0c830'));
    // o rótulo vermelho
    k.box(8, 16, 16, 7, k.mat('#c8261e'), { r: 1 });
    for (let x = 10; x < 22; x += 3) k.box(x, 18, 2, 3, k.mat('#f4e8c8'), { bevel: false, light: 0.2 });
    k.px(9, 12, hex('#ffe8c0'));
    void M;
  },

  cadeado(k) {
    const { M } = k;
    k.shadow(16, 29.5, 11, 1.8);
    k.ring(16, 11, 7, 2.2, M.steel, { clip: (x, y) => y < 13 });
    k.bar(9, 11, 9, 15, 4.4, M.steel);
    k.bar(23, 11, 23, 15, 4.4, M.steel);
    k.box(5, 14, 22, 15, M.brass, { r: 3 });
    // o buraco da chave e a ferrugem
    k.ell(16, 19.5, 2.2, 2.2, k.mat('#1a1008'), { flat: true, spec: false });
    k.box(15, 20, 3, 5, k.mat('#1a1008'), { bevel: false });
    for (const [x, y] of [
      [7, 25],
      [9, 26],
      [8, 27],
      [23, 18],
      [24, 19],
      [22, 26],
      [24, 25],
    ])
      k.px(x, y, M.rust.mid);
    k.px(8, 16, M.brass.sp);
    k.px(9, 16, M.brass.sp);
  },

  chapaFogao(k) {
    const { hex } = k;
    k.shadow(16, 26.5, 14, 2);
    const iron = k.mat('#3a3434', { cool: true });
    // a chapa de ferro fundido (em perspectiva) e os anéis
    k.ell(16, 18, 14, 8, iron, { flat: true, light: 0.05, spec: false });
    k.ell(16, 17, 14, 7.6, k.mat('#4a4444', { cool: true }), { flat: true, light: 0.25, spec: false });
    for (const r of [11, 8]) k.ring(16, 17, r, 0.6, iron, { sy: 0.54, spec: false, light: -0.4 });
    // o miolo em brasa
    k.ell(16, 17, 6, 3.3, k.mat('#c8301a'), { flat: true, light: 0.3, spec: false });
    k.ell(16, 17, 3.6, 2, k.mat('#ff8a2a'), { flat: true, light: 0.5, spec: false });
    k.ell(16, 17, 1.6, 0.9, k.mat('#ffe080'), { flat: true, spec: false });
    k.b.ellipse(16, 15, 10, 7, hex('#ff6a1a'), 0.15);
    // o calor subindo
    for (const x of [11, 16, 21]) for (let y = 3; y < 11; y += 1) k.px(x + Math.sin(y * 0.9 + x) * 1, y, hex('#ffb060'), 0.5 - (11 - y) * 0.05);
  },

  lupa(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 12, 1.6);
    // o cabo
    k.bar(19, 19, 27, 27, 4.4, M.darkWood);
    k.bar(18, 18, 20, 20, 4.8, M.brass, { flatEnds: true });
    // o aro e a lente (aumentando um diamante)
    k.ring(12, 12, 8.4, 2, M.brass);
    k.ell(12, 12, 7, 7, M.glass, { flat: true, light: 0.15, spec: false });
    k.poly(
      [
        [12, 7],
        [16, 11],
        [12, 17],
        [8, 11],
      ],
      k.mat('#c8f0ff', { cool: true }),
      { light: (x, y) => (y < 11 ? 0.6 : x < 12 ? 0.1 : -0.3) },
    );
    k.line(8, 11, 16, 11, hex('#ffffff'), 0.8);
    k.px(8, 7, hex('#ffffff'));
    k.px(7, 8, hex('#ffffff'));
    k.px(9, 6, hex('#ffffff'), 0.6);
  },

  canetaLoterica(k) {
    const { hex } = k;
    k.shadow(16, 29, 13, 1.6);
    // o volante da lotérica com os números marcados
    k.poly(
      [
        [2, 10],
        [22, 8],
        [24, 27],
        [4, 28],
      ],
      k.mat('#f4f0e6'),
      { bevel: true },
    );
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const x = 5 + c * 4.2 + r * 0.15;
        const y = 13 + r * 3.6 - c * 0.2;
        k.box(x, y, 3, 2, k.mat('#e88a8a'), { bevel: false, light: 0.3 });
        if ((r * 4 + c) % 5 === 1) k.box(x, y, 3, 2, k.mat('#2a3ac8', { cool: true }), { bevel: false });
      }
    }
    // a caneta azul na diagonal
    const blue = k.mat('#2a4ad0', { cool: true });
    k.bar(11, 24, 27, 4, 3.2, blue);
    k.bar(9, 26.5, 11.5, 23.5, 1.6, k.mat('#e8e0d0'), { spec: false });
    k.px(8, 28, hex('#1a1a40'));
    k.bar(24, 7, 28, 4, 3.4, k.mat('#1a2a90', { cool: true }));
    k.bar(22, 8, 20, 13, 1, k.mat('#c8c8d0'), { spec: false });
  },

  trena(k) {
    const { M, hex } = k;
    k.shadow(15, 29, 13, 1.8);
    // a fita saindo e a ponta de metal
    const tape = k.mat('#f0d030');
    k.box(18, 18, 13, 4, tape, { bevel: false, light: 0.2 });
    for (let x = 19; x < 30; x += 2) k.line(x, 18, x, x % 4 === 1 ? 20 : 19, hex('#1a1008'));
    k.box(29, 16, 2, 7, M.steel, { bevel: false, light: 0.2 });
    // a caixa amarela de borracha com o botão
    k.box(2, 7, 19, 20, k.mat('#e8b81a'), { r: 4 });
    k.box(2, 22, 19, 5, k.mat('#2a2a2a', { cool: true }), { r: 2 });
    k.ell(11.5, 15, 5, 5, k.mat('#2a2a2a', { cool: true }));
    k.ell(11.5, 15, 2.6, 2.6, M.steel);
    k.box(14, 4, 5, 4, k.mat('#c8261e'), { r: 1 });
    k.px(5, 10, hex('#fff6c8'));
  },

  ampulheta(k) {
    const { M, hex } = k;
    k.shadow(16, 30, 11, 1.4);
    // tampas de madeira e as colunas
    k.box(5, 2, 22, 4, M.darkWood, { r: 1 });
    k.box(5, 26, 22, 4, M.darkWood, { r: 1 });
    for (const x of [7, 24]) k.bar(x, 6, x, 26, 2.4, M.wood);
    // o vidro (dois bulbos) com a areia
    const glass = M.glass;
    const bulb = (x, y) => {
      const t = Math.abs(y - 16) / 10;
      return Math.abs(x - 16) <= 1 + t * 6.5 && y > 6 && y < 26;
    };
    k.area(9, 6, 23, 26, bulb, glass, { light: 0.35 });
    const sand = k.mat('#e0b060');
    k.area(9, 6, 23, 26, (x, y) => bulb(x, y) && y > 21 - Math.abs(x - 16) * 0.3, sand, { light: 0.2, bevel: false });
    k.area(9, 6, 23, 26, (x, y) => bulb(x, y) && y > 11 && y < 15, sand, { light: 0.25, bevel: false });
    k.line(16, 15, 16, 21, sand.mid);
    // a rachadura no vidro e o brilho
    k.line(19, 8, 17, 11, hex('#ffffff'), 0.9);
    k.line(17, 11, 19, 13, hex('#ffffff'), 0.8);
    k.px(11, 8, glass.sp);
    k.px(11, 22, glass.sp);
    k.spark(4, 14, hex('#fff6c8'));
  },

  velaPreta(k) {
    const { M, hex } = k;
    k.shadow(16, 29.5, 11, 1.8);
    // a poça de cera e a vela torta
    k.ell(16, 27, 10, 2.6, M.wax, { flat: true, light: 0.1 });
    k.cylV(11, 12, 10, 15, M.wax, { ry: 2, capMat: k.mat('#3a3444', { cool: true }) });
    // os escorridos
    for (const [x, y0, len] of [
      [12, 12, 7],
      [15, 12, 4],
      [19, 12, 10],
    ]) {
      k.bar(x, y0, x, y0 + len, 1.8, M.wax, { light: 0.25 });
      k.ell(x + 0.5, y0 + len + 0.5, 1.3, 1.4, M.wax, { light: 0.2 });
    }
    // pavio e a chama roxa
    k.line(16, 12, 16, 9, hex('#1a1010'));
    flame(k, 16.5, 9, 8, ['#f4e8ff', '#b07aff', '#5a2ac8']);
    for (const [x, y] of [
      [10, 4],
      [23, 6],
    ])
      k.px(x, y, hex('#c8a0ff'), 0.8);
  },
};

/** Os talismãs que têm desenho novo (chaves `art`). */
export const RELIC_ICON_KEYS = Object.freeze(Object.keys(ICONS));

/**
 * Pinta o talismã `art` em 32×32. `rarity` acrescenta o toque da raridade: faísca no mítico,
 * névoa roxa no necrótico. Devolve null se não houver desenho para essa chave.
 */
export function paintRelic(art, rarity) {
  const draw = ICONS[art];
  if (!draw) return null;
  const b = buffer(N, N);
  const k = kit(b);
  draw(k);
  outline(b);
  if (rarity === 'necrotico') miasma(b);
  if (rarity === 'mitico') {
    const r = rngOf(art.length * 13 + 7);
    k.spark(2 + Math.floor(r() * 4), 2 + Math.floor(r() * 4), hex('#fff6c8'));
  }
  return b;
}
