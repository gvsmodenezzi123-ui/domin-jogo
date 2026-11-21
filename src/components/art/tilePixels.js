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
/**
 * A forma da pedra na grade: quem está dentro (com a quina em degraus), onde a face termina
 * (a lateral embaixo e à direita). A pintura e os efeitos (tileFx.js) usam a mesma.
 */
export function tileShape(w, h, horizontal = false, depth = 1) {
  const hw = horizontal ? h : w;
  const corner = cornerOf(hw);
  const indent = (y) => {
    if (y < corner.length) return corner[y];
    if (h - 1 - y < corner.length) return corner[h - 1 - y];
    return 0;
  };
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && x >= indent(y) && x <= w - 1 - indent(y);
  const d = Math.max(1, Math.round(hw * 0.08), depth > 3 ? 2 : 1);
  const rs = hw >= 14 ? Math.max(1, Math.round(hw * 0.05)) : 0;
  const faceTop = 1;
  const faceBot = h - 2 - d;
  const faceRight = w - 2 - rs;
  const edge = (x, y) => !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
  /** Dentro da face (fora do contorno e das laterais). */
  const onFace = (x, y) => inside(x, y) && !edge(x, y) && y >= faceTop && y <= faceBot && x <= faceRight;
  return { hw, corner, indent, inside, edge, onFace, d, rs, faceTop, faceBot, faceRight };
}

export function paintTileArt({ w, h, horizontal = false, values = [0, 0], mat = 'bone', depth = 1, frame = false, back = false }) {
  const M = frame ? PX_FRAMES[mat] : PX_MATERIALS[mat];
  const data = new Uint8ClampedArray(w * h * 4);
  const { hw, inside, edge, d, faceTop, faceBot, faceRight } = tileShape(w, h, horizontal, depth);
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
  if (mat === 'chumbo' || mat === 'ambar') paintDetails({ put, mat, w, h, values, onFace: tileShape(w, h, horizontal, depth).onFace, data, avoid: [hexRgba(M.pip), hexRgba(M.divider)] });
  return { w, h, data };
}

/** Um gerador pseudoaleatório pequeno e fixo (a mesma pedra sai sempre igual). */
export function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * O que fica gravado na pedra: no Chumbo, a trinca (a fenda escura com a quina clara); no
 * Âmbar, as bolhas de ar e o mosquito preso na resina. Por cima dos pips, só onde não tem pip.
 */
function paintDetails({ put, mat, w, h, values, onFace, data, avoid }) {
  const rand = rng(values[0] * 7 + values[1] * 13 + w * 31 + h);
  // não pinta por cima dos pips, do friso nem do pino (nem rente a eles: 1 pixel de folga)
  const taken = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const i = (y * w + x) * 4;
    if (data[i + 3] === 0) return false;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (avoid.some((c) => c[0] === r && c[1] === g && c[2] === b)) return true;
    return r > 200 && g > 150 && b < 120 && r - b > 120 && g < 240 && mat === 'chumbo';
  };
  const free = (x, y) => onFace(x, y) && !taken(x, y) && !taken(x - 1, y) && !taken(x + 1, y) && !taken(x, y - 1) && !taken(x, y + 1);
  if (mat === 'chumbo') {
    const dark = hexRgba('#0c0e10');
    const lite = hexRgba('rgba(190,198,206,0.55)');
    let x = Math.round(w * (0.25 + rand() * 0.5));
    for (let y = 2; y < h - 3; y += 1) {
      if (free(x, y)) {
        put(x, y, dark);
        if (free(x + 1, y)) put(x + 1, y, lite);
      }
      const r = rand();
      if (r < 0.3) x -= 1;
      else if (r > 0.7) x += 1;
      if (rand() < 0.08) {
        // um galho da trinca
        let bx = x;
        const dir = rand() < 0.5 ? -1 : 1;
        for (let k = 0; k < 4; k += 1) {
          bx += dir;
          if (free(bx, y + k)) put(bx, y + k, dark);
        }
      }
    }
    return;
  }
  // âmbar: bolhas (um anel de 1 pixel claro) e o mosquito (corpo, asas)
  const bubble = hexRgba('rgba(255,248,226,0.8)');
  for (let k = 0; k < 3; k += 1) {
    const bx = Math.round(2 + rand() * (w - 6));
    const by = Math.round(2 + rand() * (h - 8));
    if (free(bx, by)) put(bx, by, bubble);
    if (w >= 20 && free(bx + 1, by + 1)) put(bx + 1, by + 1, hexRgba('rgba(255,248,226,0.4)'));
  }
  if (w < 14) return;
  const body = hexRgba('rgba(48,18,2,0.92)');
  const wing = hexRgba('rgba(255,244,222,0.6)');
  const cx = Math.round(w * 0.55);
  const cy = Math.round(h * 0.6);
  for (const [dx, dy, c] of [
    [0, 0, body],
    [1, 0, body],
    [2, 0, body],
    [-1, 0, body],
    [0, -1, wing],
    [1, -1, wing],
    [2, -2, wing],
    [-1, -1, wing],
    [0, 1, body],
    [2, 1, body],
  ])
    if (free(cx + dx, cy + dy)) put(cx + dx, cy + dy, c);
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
      // versão 2.46: a pedra em alta (as miudinhas, de 1 px por pixel de CSS, também)
      const img = paintTileArtHD(opts);
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

// ---------------------------------------------------------------------------------------------
// Versão 2.46: a pedra em alta (HD). A silhueta (a quina em degraus, o recorte, as molduras de
// seleção) continua na grade de sempre; por dentro, cada pixel vira 2×2 finos: o marfim em
// degradê com o veio fino do osso, o chanfro aceso em cima e à esquerda, a lateral com o filete
// de luz, o friso cavado (a sombra e a luz da parede), o pino de latão em cúpula e os pips
// cavados de verdade (a parede de cima na sombra, a de baixo acesa e o lábio claro por fora).
// ---------------------------------------------------------------------------------------------

/** A semente de cada pixel fino (veio e pintinhas fixos). */
const hash2 = (x, y, s = 0) => {
  let n = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (((n ^ (n >>> 16)) >>> 0) % 10000) / 10000;
};
const BAYER2 = [
  [0, 0.5],
  [0.75, 0.25],
];

export const TILE_HD = 2;

export function paintTileArtHD({ w, h, horizontal = false, values = [0, 0], mat = 'bone', depth = 1, frame = false, back = false }, S = TILE_HD) {
  const M = frame ? PX_FRAMES[mat] : PX_MATERIALS[mat];
  const W = w * S;
  const H = h * S;
  const data = new Uint8ClampedArray(W * H * 4);
  const shape = tileShape(w, h, horizontal, depth);
  const { hw, inside, d, faceTop, faceBot, faceRight } = shape;
  const inL = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && inside(Math.floor(X / S), Math.floor(Y / S));
  const put = (X, Y, c, a = 1) => {
    if (!c || !inL(X, Y)) return;
    const i = (Y * W + X) * 4;
    const ca = (c[3] / 255) * a;
    if (ca >= 1 || data[i + 3] === 0) {
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = Math.round(ca * 255) || c[3];
      if (data[i + 3] === 0) data[i + 3] = c[3];
      return;
    }
    data[i] = Math.round(data[i] + (c[0] - data[i]) * ca);
    data[i + 1] = Math.round(data[i + 1] + (c[1] - data[i + 1]) * ca);
    data[i + 2] = Math.round(data[i + 2] + (c[2] - data[i + 2]) * ca);
  };
  // a distância de cada fino à borda da silhueta (em finos), para o contorno e o chanfro
  const far = new Uint8Array(W * H);
  for (let Y = 0; Y < H; Y += 1) for (let X = 0; X < W; X += 1) far[Y * W + X] = inL(X, Y) ? 99 : 0;
  for (let Y = 0; Y < H; Y += 1) for (let X = 0; X < W; X += 1) if (far[Y * W + X]) far[Y * W + X] = Math.min(far[Y * W + X], (X ? far[Y * W + X - 1] : 0) + 1, (Y ? far[(Y - 1) * W + X] : 0) + 1);
  for (let Y = H - 1; Y >= 0; Y -= 1) for (let X = W - 1; X >= 0; X -= 1) if (far[Y * W + X]) far[Y * W + X] = Math.min(far[Y * W + X], (X < W - 1 ? far[Y * W + X + 1] : 0) + 1, (Y < H - 1 ? far[(Y + 1) * W + X] : 0) + 1);
  const line = hexRgba(M.line);
  const side = M.side.map(hexRgba);
  const hi = hexRgba(M.hi);
  const lo = hexRgba(M.lo);
  const face = frame ? null : M.face.map(hexRgba);
  const fT = faceTop * S + 2; // o primeiro fino da face (dentro do contorno de 2 finos)
  const fB = (faceBot + 1) * S - 1;
  const fR = (faceRight + 1) * S - 1;
  const hiRows = Math.max(2, Math.round(hw * 0.06 * S));
  const faceAt = (t) => {
    // o degradê das cinco faixas, liso (com o xadrez fino entre os tons)
    const f = Math.max(0, Math.min(0.9999, t)) * (face.length - 1);
    const i = Math.floor(f);
    return mix(face[i], face[Math.min(face.length - 1, i + 1)], f - i);
  };
  for (let Y = 0; Y < H; Y += 1) {
    for (let X = 0; X < W; X += 1) {
      if (!inL(X, Y)) continue;
      const e = far[Y * W + X];
      if (e === 1) {
        put(X, Y, line);
        continue;
      }
      if (e === 2) {
        // o segundo fino do contorno: a quina do chanfro, um tom acima da tinta
        put(X, Y, Y > fB ? mix(line, side[1], 0.55) : mix(line, side[0], 0.42));
        continue;
      }
      if (Y > fB) {
        // a lateral de baixo, com o filete de luz onde a face dobra
        const t = (Y - fB - 1) / Math.max(1, H - 3 - fB - 1);
        let c = mix(side[0], side[1], Math.min(1, t * 1.1));
        if (Y === fB + 1) c = mix(side[0], hi, 0.45);
        put(X, Y, c);
        continue;
      }
      if (X > fR) {
        put(X, Y, mix(side[0], face ? face[3] : side[0], X === fR + 1 ? 0.55 : 0.3));
        continue;
      }
      if (face) {
        const t = (Y - fT) / Math.max(1, fB - fT);
        const b = BAYER2[Y & 1][X & 1] - 0.375;
        let c = faceAt(t + b * 0.09);
        // o veio do osso: riscos finos e compridos, quase nada; e umas pintinhas
        const grain = Math.sin(Y * 1.7 + Math.sin(X * 0.21 + Y * 0.05) * 2.2) * 0.5 + 0.5;
        if (mat === 'bone' || mat === 'back') c = mix(c, face[4], grain > 0.82 ? 0.16 : 0);
        if (hash2(X, Y, 3) < 0.012) c = mix(c, face[4], 0.45);
        put(X, Y, c);
      }
      // o chanfro arredondado: o alto e a esquerda acesos, desvanecendo; a direita e o pé na
      // sombra; e o lustro do marfim descendo da quina de cima
      const dt = Y - fT;
      const dl = e - 3;
      const dr = fR - X;
      if (dt < hiRows) put(X, Y, hi, dt === 0 ? 1 : dt < hiRows - 1 ? 0.72 : 0.38);
      else if (dl < 3 && X < W / 2) put(X, Y, hi, dl === 0 ? 0.9 : dl === 1 ? 0.5 : 0.22);
      else if (Y >= fB - 2) put(X, Y, lo, Y === fB ? 0.9 : Y === fB - 1 ? 0.45 : 0.2);
      else if (dr < 2) put(X, Y, lo, dr === 0 ? 0.42 : 0.2);
      if (face) {
        const sheen = 1 - ((X / W) * 1.25 + ((Y - fT) / Math.max(1, fB - fT)) * 1.7);
        if (sheen > 0 && BAYER2[Y & 1][X & 1] < sheen * 1.4) put(X, Y, hi, 0.16 * Math.min(1, sheen * 2));
      }
    }
  }
  if (frame) return { w: W, h: H, data };

  if (back) {
    // o losango gravado no meio do verso: a borda funda e a luz no lado de baixo
    const cx = W / 2;
    const cy = ((faceTop + faceBot + 1) * S) / 2;
    const r = Math.max(4, Math.round(Math.min(w, faceBot) * 0.22 * S));
    const sig = hexRgba(M.sigil);
    const sigIn = hexRgba(M.sigilIn);
    for (let Y = Math.floor(cy - r - 2); Y <= Math.ceil(cy + r + 2); Y += 1) {
      for (let X = Math.floor(cx - r - 2); X <= Math.ceil(cx + r + 2); X += 1) {
        const k = Math.abs(X + 0.5 - cx) + Math.abs(Y + 0.5 - cy);
        if (k <= r && k > r - 2.2) put(X, Y, Y + 0.5 < cy ? mix(sig, hi, 0.25) : mix(sig, line, 0.25));
        else if (k <= r - 2.2) put(X, Y, sigIn);
        else if (k <= r + 1 && Y + 0.5 > cy) put(X, Y, hi, 0.25);
      }
    }
    return { w: W, h: H, data };
  }

  // o friso do meio (cavado: a parede de cima/esquerda na sombra, a de baixo/direita acesa)
  const div = hexRgba(M.divider);
  const brass = [hexRgba('#d8a83a'), hexRgba('#fff0a8'), hexRgba('#8a5e14'), hexRgba('#4a3006')];
  const rivet = (hw >= 24 ? 3 : hw >= 12 ? 2 : 1) * S;
  const thick = hw >= 26 ? 2 : 1;
  let halves;
  const dome = (cx, cy) => {
    const R = rivet / 2;
    for (let Y = Math.floor(cy - R - 1); Y <= Math.ceil(cy + R); Y += 1) {
      for (let X = Math.floor(cx - R - 1); X <= Math.ceil(cx + R); X += 1) {
        const dx = X + 0.5 - cx;
        const dy = Y + 0.5 - cy;
        const r = Math.hypot(dx, dy);
        if (r > R) continue;
        const lit = (-dx - dy) / Math.max(0.5, R);
        put(X, Y, r > R - 0.9 ? brass[3] : lit > 0.55 ? brass[1] : lit < -0.35 ? brass[2] : brass[0]);
      }
    }
  };
  if (horizontal) {
    const mx = (Math.floor(w / 2) - Math.floor(thick / 2)) * S;
    for (let Y = (faceTop + 2) * S; Y <= (faceBot - 1) * S - 1; Y += 1) {
      for (let k = 0; k < thick * S; k += 1) put(mx + k, Y, k < thick * S - 1 ? div : mix(div, hi, 0.55));
      put(mx - 1, Y, div, 0.35);
    }
    dome(mx + (thick * S) / 2, ((faceTop + faceBot + 1) * S) / 2);
    halves = [
      { x0: 1, x1: mx / S - 1, y0: faceTop, y1: faceBot },
      { x0: mx / S + thick, x1: faceRight, y0: faceTop, y1: faceBot },
    ];
  } else {
    const my = (Math.floor((faceTop + faceBot + 1) / 2) - Math.floor(thick / 2)) * S;
    for (let X = 2 * S; X <= (faceRight + 1) * S - 1; X += 1) {
      for (let k = 0; k < thick * S; k += 1) put(X, my + k, k < thick * S - 1 ? div : mix(div, hi, 0.55));
      put(X, my - 1, div, 0.35);
    }
    dome(((faceRight + 3) * S) / 2, my + (thick * S) / 2);
    halves = [
      { x0: 1, x1: faceRight, y0: faceTop, y1: my / S - 1 },
      { x0: 1, x1: faceRight, y0: my / S + thick, y1: faceBot },
    ];
  }

  // os pips: covinhas redondas (na mesma grade 3×3 de sempre, no fino)
  const pad = pipPad(hw);
  const pd = Math.min(...halves.map((hf) => pipFit(Math.min(hf.x1 - hf.x0 + 1, hf.y1 - hf.y0 + 1) - 2 * pad)));
  const pip = hexRgba(M.pip);
  const lip = hexRgba(M.pipLip ?? M.lo);
  const light = mat === 'onyx' || mat === 'cristal' || mat === 'fantasma' || mat === 'obsidiana';
  const pipShade = light ? mix(pip, hexRgba(M.lo), 0.5) : mix(pip, [0, 0, 0, 255], 0.35);
  const pipLit = light ? mix(pip, [255, 255, 255, 255], 0.4) : mix(pip, lip, 0.55);
  halves.forEach((half, i) => {
    const value = values[i] ?? 0;
    const cells = (PIP_GRID[value] ?? []).map(([r, c]) => (horizontal ? [c, r] : [r, c]));
    const spanX = half.x1 - half.x0 + 1 - pad * 2 - pd;
    const spanY = half.y1 - half.y0 + 1 - pad * 2 - pd;
    for (const [r, c] of cells) {
      const px = Math.round(half.x0 + pad + (c * spanX) / 2);
      const py = Math.round(half.y0 + pad + (r * spanY) / 2);
      const cx = (px + pd / 2) * S;
      const cy = (py + pd / 2) * S;
      const R = (pd * S) / 2 - (pd >= 3 ? 0.15 : 0);
      for (let Y = Math.floor(cy - R - 2); Y <= Math.ceil(cy + R + 1); Y += 1) {
        for (let X = Math.floor(cx - R - 2); X <= Math.ceil(cx + R + 1); X += 1) {
          const dx = X + 0.5 - cx;
          const dy = Y + 0.5 - cy;
          const rr = Math.hypot(dx, dy);
          const v = (-dx - dy) / Math.max(0.01, rr) / 1.414; // 1 na direção da luz (cima e esquerda)
          if (rr <= R) {
            let c = pip;
            if (rr > R - 1.3 && v > 0.25) c = pipShade;
            else if (rr > R - 1.6 && v < -0.3) c = pipLit;
            put(X, Y, c);
          } else if (rr <= R + 1.4 && v < -0.15) put(X, Y, hi, rr <= R + 0.8 ? 0.9 : 0.45);
          else if (rr <= R + 1.1 && v > 0.3) put(X, Y, lo, 0.6);
        }
      }
    }
  });
  if (mat === 'chumbo' || mat === 'ambar') {
    // a trinca / as bolhas: o desenho de sempre, na grade lógica, por cima
    const lowRes = { w, h, data: new Uint8ClampedArray(w * h * 4) };
    const lp = (x, y, c) => {
      if (!c || !inside(x, y)) return;
      const k = (y * w + x) * 4;
      lowRes.data[k] = c[0];
      lowRes.data[k + 1] = c[1];
      lowRes.data[k + 2] = c[2];
      lowRes.data[k + 3] = c[3];
    };
    paintDetails({ put: lp, mat, w, h, values, onFace: shape.onFace, data: lowRes.data, avoid: [hexRgba(M.pip), hexRgba(M.divider)] });
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const k = (y * w + x) * 4;
      if (lowRes.data[k + 3]) for (let j = 0; j < S; j += 1) for (let q = 0; q < S; q += 1) put(x * S + q, y * S + j, [lowRes.data[k], lowRes.data[k + 1], lowRes.data[k + 2], lowRes.data[k + 3]]);
    }
  }
  return { w: W, h: H, data };
}
