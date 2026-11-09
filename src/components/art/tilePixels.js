/**
 * Versão 2.15: as pedras em pixel art de verdade (o desenho de referência do jogador): cada pedra
 * é pintada pixel a pixel numa grade baixa (a metade tem de 7 a 20 pixels de lado, ~2 px de CSS
 * por pixel) e mostrada ampliada sem suavização. A quina em degraus, o contorno escuro de 1
 * pixel, o marfim em faixas chapadas com a luz em cima e à esquerda, a lateral grossa embaixo,
 * os pips redondos de pixel, o friso preto com o pino de latão.
 *
 * As comuns, as Peças Pretas e Prateadas e o verso saem inteiras daqui. As aprimoradas mantêm
 * o "shader" em CSS na face e ganham daqui só a moldura (contorno, quina e lateral) por cima.
 */

/** Os pips numa grade 3×3 [linha, coluna] da metade em pé (deitada, transpõe). */
export const PIP_GRID = Object.freeze({
  0: [],
  1: [[1, 1]],
  2: [
    [0, 2],
    [2, 0],
  ],
  3: [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
});

/**
 * As cores de cada material. face: 5 faixas de cima para baixo; hi/lo: a quina de luz e a de
 * sombra da face; side: a lateral (do tom de cima ao de baixo); line: o contorno.
 */
export const PX_MATERIALS = Object.freeze({
  bone: { line: '#1a1108', face: ['#f8ecc4', '#f0dfa8', '#ead49a', '#e2c98a', '#d9bd7c'], hi: '#fff8dc', lo: '#c9a964', side: ['#c4a15e', '#8c6a32'], pip: '#130c05', pipLip: '#b8975a', divider: '#1c1309' },
  onyx: { line: '#000000', face: ['#5a524b', '#3c3631', '#312c28', '#27231f', '#1d1a17'], hi: '#6e655d', lo: '#141210', side: ['#3a332e', '#0e0c0b'], pip: '#f4efe4', pipLip: '#9c958c', divider: '#5c5650' },
  silver: { line: '#1c2024', face: ['#fbfcfd', '#e6eaee', '#d7dce1', '#c6ccd2', '#b1b8bf'], hi: '#ffffff', lo: '#8e959c', side: ['#b7bdc3', '#4a5056'], pip: '#b3121b', pipLip: '#ff6a5a', divider: '#4b5157' },
  // as aprimoradas, em pixel também (o brilho e as camadas animadas ficam no CSS por cima)
  ouro: { line: '#2a1804', face: ['#fff1b8', '#f4d272', '#e6b74c', '#d29c34', '#b37e20'], hi: '#fffbe0', lo: '#8a5e14', side: ['#c08e2c', '#5c3a08'], pip: '#2a1a04', divider: '#5a3a0a' },
  rubi: { line: '#2a0008', face: ['#ff7a88', '#e02a46', '#c21834', '#9c0e26', '#76081a'], hi: '#ffc8cf', lo: '#4a0410', side: ['#a10c26', '#3a020a'], pip: '#2e0410', divider: '#3a0210' },
  cristal: { line: '#08303e', face: ['rgba(214,252,255,0.86)', 'rgba(150,232,246,0.8)', 'rgba(100,206,232,0.78)', 'rgba(60,166,206,0.8)', 'rgba(32,124,170,0.84)'], hi: 'rgba(235,255,255,0.95)', lo: 'rgba(16,90,125,0.85)', side: ['#2a95b8', '#0a3c50'], pip: '#e6ffff', divider: '#e6ffff' },
  chumbo: { line: '#050607', face: ['#6e747a', '#50565c', '#43484e', '#373c41', '#2a2e32'], hi: '#8a9097', lo: '#1c1f22', side: ['#30353a', '#0c0e10'], pip: '#b4bac1', divider: '#0a0c0e' },
  fantasma: { line: '#1e0a3c', face: ['rgba(238,226,255,0.78)', 'rgba(204,176,252,0.66)', 'rgba(172,134,240,0.6)', 'rgba(136,88,222,0.6)', 'rgba(96,46,176,0.66)'], hi: 'rgba(248,242,255,0.85)', lo: 'rgba(60,20,120,0.7)', side: ['#5c33a4', '#2a0f5a'], pip: '#f6eeff', divider: 'rgba(240,228,255,0.85)' },
  ambar: { line: '#2a1004', face: ['#ffd696', '#f6ab4a', '#e68e2a', '#cc7218', '#a6560c'], hi: '#ffe8c0', lo: '#7a3406', side: ['#a84e0e', '#4a1a04'], pip: '#4a2206', divider: '#6e2c06' },
  obsidiana: { line: '#000000', face: ['#4c3e5c', '#2e2438', '#251d2e', '#1c1624', '#130e18'], hi: '#6a5a7c', lo: '#08060b', side: ['#2a2034', '#08060b'], pip: '#ff8a32', divider: '#ff8a32' },
  back: { line: '#0b0705', face: ['#56432f', '#4a3a29', '#3f3123', '#35291e', '#2b2119'], hi: '#6b5440', lo: '#1f1711', side: ['#3a2c1e', '#120b06'], sigil: '#9a6e3a', sigilIn: '#5a1410' },
});

/** A moldura das aprimoradas: o contorno e a lateral do material (a face é o CSS). */
export const PX_FRAMES = Object.freeze({
  ouro: { line: '#2a1804', side: ['#c08e2c', '#5c3a08'], hi: 'rgba(255,250,220,0.85)', lo: 'rgba(90,55,10,0.6)' },
  rubi: { line: '#2a0008', side: ['#a10c26', '#3a020a'], hi: 'rgba(255,200,205,0.7)', lo: 'rgba(60,0,10,0.6)' },
  cristal: { line: '#08303e', side: ['#2a95b8', '#0a3c50'], hi: 'rgba(200,255,255,0.8)', lo: 'rgba(10,70,95,0.5)' },
  chumbo: { line: '#050607', side: ['#30353a', '#0c0e10'], hi: 'rgba(255,255,255,0.22)', lo: 'rgba(0,0,0,0.5)' },
  fantasma: { line: '#1e0a3c', side: ['#5c33a4', '#2a0f5a'], hi: 'rgba(235,220,255,0.6)', lo: 'rgba(40,10,90,0.4)' },
  ambar: { line: '#2a1004', side: ['#a84e0e', '#4a1a04'], hi: 'rgba(255,224,170,0.7)', lo: 'rgba(120,40,0,0.45)' },
  obsidiana: { line: '#000000', side: ['#2a2034', '#08060b'], hi: 'rgba(235,225,255,0.45)', lo: 'rgba(0,0,0,0.6)' },
});

/**
 * A grade de uma pedra com metade de `unit` px: `hw` pixels de lado na metade e `s` px de CSS
 * por pixel (~2). As miudinhas (marcadores, pilhas) ficam 1:1.
 */
export function tileGrid(unit) {
  const u = Math.max(4, Math.round(unit));
  const hw = u <= 28 ? u : Math.min(36, Math.round(u / 1.3));
  return { hw, s: u / hw, corner: cornerOf(hw) };
}

/** A quina em degraus (o arco de pixel da referência): quantos pixels cada linha de cima entra. */
const CORNERS = [[1], [1], [2, 1], [3, 1, 1], [4, 2, 1, 1], [5, 3, 2, 1, 1], [6, 4, 2, 2, 1, 1]];
export function cornerOf(hw) {
  return CORNERS[Math.max(1, Math.min(6, Math.round(hw * 0.13)))];
}

/** O recorte da pedra com a quina em degraus (clip-path em px de CSS). */
export function pixelClip(width, height, s, corner) {
  const n = corner.length;
  const W = width;
  const H = height;
  const pts = [[0, n * s]];
  for (let i = n - 1; i >= 0; i -= 1) pts.push([corner[i] * s, (i + 1) * s], [corner[i] * s, i * s]);
  for (let i = 0; i < n; i += 1) pts.push([W - corner[i] * s, i * s], [W - corner[i] * s, (i + 1) * s]);
  pts.push([W, n * s], [W, H - n * s]);
  for (let i = n - 1; i >= 0; i -= 1) pts.push([W - corner[i] * s, H - (i + 1) * s], [W - corner[i] * s, H - i * s]);
  for (let i = 0; i < n; i += 1) pts.push([corner[i] * s, H - i * s], [corner[i] * s, H - (i + 1) * s]);
  pts.push([0, H - n * s]);
  const px = (v) => `${Math.round(v * 100) / 100}px`;
  return `polygon(${pts.map(([x, y]) => `${px(x)} ${px(y)}`).join(',')})`;
}

const hexRgba = (c) => {
  if (c.startsWith('rgba')) {
    const [r, g, b, a] = c
      .slice(5, -1)
      .split(',')
      .map((v) => Number(v));
    return [r, g, b, Math.round(a * 255)];
  }
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255];
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** O disco de pixel de `d` de diâmetro (o pip): [dx, dy] de cada pixel. */
export function pixelDisc(d) {
  const r = d / 2;
  const cut = d <= 3 ? Infinity : d === 4 ? 3.2 : r * r + 0.3;
  const out = [];
  for (let y = 0; y < d; y += 1) {
    for (let x = 0; x < d; x += 1) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      if (dx * dx + dy * dy <= cut) out.push([x, y]);
    }
  }
  return out;
}

/** O clip-path do pip de pixel (para os pips em CSS das aprimoradas). */
export function discClip(d, size) {
  const k = size / d;
  const rows = new Map();
  for (const [x, y] of pixelDisc(d)) {
    const row = rows.get(y) ?? [x, x];
    rows.set(y, [Math.min(row[0], x), Math.max(row[1], x)]);
  }
  const left = [];
  const right = [];
  for (let y = 0; y < d; y += 1) {
    const [a, b] = rows.get(y) ?? [0, d - 1];
    left.push([a * k, y * k], [a * k, (y + 1) * k]);
    right.push([(b + 1) * k, y * k], [(b + 1) * k, (y + 1) * k]);
  }
  const pts = [...right, ...left.reverse()];
  const f = (v) => `${Math.round(v * 100) / 100}px`;
  return `polygon(${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(',')})`;
}

/** O tamanho do pip e a folga da borda numa metade de `hw` pixels. */
const pipPad = (hw) => Math.max(1, Math.round(hw * 0.12));
/** O pip cabe 3 vezes no lado da metade com folga de meio pip entre eles (nunca colados: sobra ~1/3 de pip entre eles). */
const pipFit = (span) => Math.max(1, Math.round(span / 3.6));
export const pipSize = (hw) => pipFit(hw - 3 - 2 * pipPad(hw));

/**
 * Pinta a pedra. `w`×`h` em pixels; `depth`: linhas de lateral embaixo. `frame` pinta só a
 * moldura (contorno, lateral e quinas de luz), com a face transparente.
 */
export function paintTileArt({ w, h, horizontal = false, values = [0, 0], mat = 'bone', depth = 1, frame = false, back = false }) {
  const M = frame ? PX_FRAMES[mat] : PX_MATERIALS[mat];
  const data = new Uint8ClampedArray(w * h * 4);
  const hw = horizontal ? h : w;
  const corner = cornerOf(Math.min(hw, horizontal ? h : w));
  const indent = (y) => {
    if (y < corner.length) return corner[y];
    if (h - 1 - y < corner.length) return corner[h - 1 - y];
    return 0;
  };
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && x >= indent(y) && x <= w - 1 - indent(y);
  const put = (x, y, c) => {
    if (!c || !inside(x, y)) return;
    const i = (y * w + x) * 4;
    const a = c[3] / 255;
    if (a >= 1 || data[i + 3] === 0) {
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = c[3];
      return;
    }
    data[i] = Math.round(data[i] + (c[0] - data[i]) * a);
    data[i + 1] = Math.round(data[i + 1] + (c[1] - data[i + 1]) * a);
    data[i + 2] = Math.round(data[i + 2] + (c[2] - data[i + 2]) * a);
  };
  const line = hexRgba(M.line);
  const side = M.side.map(hexRgba);
  const hi = hexRgba(M.hi);
  const lo = hexRgba(M.lo);
  // a lateral grossa embaixo e a fininha à direita (a luz vem de cima e da esquerda)
  const d = Math.max(1, Math.round(hw * 0.08), depth > 3 ? 2 : 1);
  const rs = hw >= 14 ? Math.max(1, Math.round(hw * 0.05)) : 0;
  const faceTop = 1;
  const faceBot = h - 2 - d;
  const faceRight = w - 2 - rs;
  const edge = (x, y) => !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
  const face = frame ? null : M.face.map(hexRgba);
  const hiRows = Math.max(1, Math.round(hw * 0.06));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!inside(x, y)) continue;
      if (edge(x, y)) {
        put(x, y, line);
        continue;
      }
      if (y > faceBot) {
        // a lateral de baixo: do tom de cima ao de baixo
        const t = d > 1 ? (y - faceBot - 1) / (d - 1) : 0;
        put(x, y, mix(side[0], side[1], t));
        continue;
      }
      if (x > faceRight) {
        put(x, y, mix(side[0], face ? face[3] : side[0], 0.35));
        continue;
      }
      if (face) {
        const t = (y - faceTop) / Math.max(1, faceBot - faceTop);
        let c = t < 0.3 ? face[1] : t < 0.62 ? face[2] : t < 0.86 ? face[3] : face[4];
        // as riscas finas do marfim (uma linha sim, outra não, quase nada)
        if (y % 2 === 1) c = mix(c, face[4], 0.18);
        put(x, y, c);
      }
      // a luz: as linhas de cima e a coluna da esquerda; a sombra no pé da face
      const top = y - faceTop < hiRows || !inside(x, y - hiRows - 1);
      if (top || !inside(x - 2, y)) put(x, y, hi);
      else if (y === faceBot) put(x, y, lo);
    }
  }
  if (frame) return { w, h, data };

  if (back) {
    // o losango gravado no meio do verso
    const cx = (w - 1) / 2;
    const cy = (faceTop + faceBot) / 2;
    const r = Math.max(2, Math.round(Math.min(w, faceBot) * 0.22));
    const sig = hexRgba(M.sigil);
    const sigIn = hexRgba(M.sigilIn);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
        const k = Math.abs(x - cx) + Math.abs(y - cy);
        if (k <= r - 0.5 && k > r - 1.6) put(x, y, sig);
        else if (k <= r - 1.6) put(x, y, sigIn);
      }
    }
    return { w, h, data };
  }

  // o friso do meio, de ponta a ponta (com folga de 1 pixel da quina de luz), e o pino
  const div = hexRgba(M.divider);
  const gold = [hexRgba('#d8a83a'), hexRgba('#fff0a8'), hexRgba('#8a5e14')];
  const rivet = hw >= 24 ? 3 : hw >= 12 ? 2 : 1;
  const thick = hw >= 26 ? 2 : 1;
  let halves;
  if (horizontal) {
    const mx = Math.floor(w / 2) - Math.floor(thick / 2);
    for (let y = faceTop + 2; y <= faceBot - 2; y += 1) for (let k = 0; k < thick; k += 1) put(mx + k, y, div);
    const ry = Math.round((faceTop + faceBot) / 2 - rivet / 2 + 0.01);
    const rx = mx + Math.floor(thick / 2) - Math.floor(rivet / 2);
    for (let j = 0; j < rivet; j += 1) for (let i = 0; i < rivet; i += 1) put(rx + i, ry + j, rivet === 1 ? gold[0] : i + j === 0 ? gold[1] : i + j === 2 ? gold[2] : gold[0]);
    halves = [
      { x0: 1, x1: mx - 1, y0: faceTop, y1: faceBot },
      { x0: mx + thick, x1: faceRight, y0: faceTop, y1: faceBot },
    ];
  } else {
    const my = Math.floor((faceTop + faceBot + 1) / 2) - Math.floor(thick / 2);
    for (let x = 2; x <= faceRight; x += 1) for (let k = 0; k < thick; k += 1) put(x, my + k, div);
    const ry = my + Math.floor(thick / 2) - Math.floor(rivet / 2);
    const rx = Math.floor((faceRight + 2 - rivet) / 2);
    for (let j = 0; j < rivet; j += 1) for (let i = 0; i < rivet; i += 1) put(rx + i, ry + j, rivet === 1 ? gold[0] : i + j === 0 ? gold[1] : i + j === 2 ? gold[2] : gold[0]);
    halves = [
      { x0: 1, x1: faceRight, y0: faceTop, y1: my - 1 },
      { x0: 1, x1: faceRight, y0: my + thick, y1: faceBot },
    ];
  }

  // os pips: discos chapados, numa grade 3×3 dentro de cada metade
  const pad = pipPad(hw);
  const pd = Math.min(...halves.map((hf) => pipFit(Math.min(hf.x1 - hf.x0 + 1, hf.y1 - hf.y0 + 1) - 2 * pad)));
  const disc = pixelDisc(pd);
  const pip = hexRgba(M.pip);
  halves.forEach((half, i) => {
    const value = values[i] ?? 0;
    const cells = (PIP_GRID[value] ?? []).map(([r, c]) => (horizontal ? [c, r] : [r, c]));
    const spanX = half.x1 - half.x0 + 1 - pad * 2 - pd;
    const spanY = half.y1 - half.y0 + 1 - pad * 2 - pd;
    for (const [r, c] of cells) {
      const px = Math.round(half.x0 + pad + (c * spanX) / 2);
      const py = Math.round(half.y0 + pad + (r * spanY) / 2);
      for (const [dx, dy] of disc) put(px + dx, py + dy, pip);
    }
  });
  return { w, h, data };
}

const sprites = new Map();

/**
 * A pedra pintada como imagem (data URL), guardada por chave. Fora do navegador (testes) não
 * tem canvas: devolve null e a pedra fica só com o recorte.
 */
export function tileSprite(opts) {
  const key = `${opts.mat}|${opts.frame ? 'f' : ''}${opts.back ? 'b' : ''}|${opts.w}x${opts.h}|${opts.horizontal ? 'h' : 'v'}|${opts.depth}|${opts.values?.join('') ?? ''}`;
  if (sprites.has(key)) return sprites.get(key);
  let url = null;
  if (typeof document !== 'undefined') {
    try {
      const img = paintTileArt(opts);
      const canvas = document.createElement('canvas');
      canvas.width = img.w;
      canvas.height = img.h;
      const ctx = canvas.getContext('2d');
      const id = ctx.createImageData(img.w, img.h);
      id.data.set(img.data);
      ctx.putImageData(id, 0, 0);
      url = `url(${canvas.toDataURL()})`;
    } catch {
      url = null;
    }
  }
  sprites.set(key, url);
  return url;
}
