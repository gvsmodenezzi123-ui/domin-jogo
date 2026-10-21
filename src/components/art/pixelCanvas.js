// Ferramentas da pixel art vetorial (Patch 0.5.5).
//
// `mapToRects` transforma um mapa de caracteres (um caractere = um pixel da grade,
// '.' = transparente) em <rect>s, juntando pixels iguais em retângulos maiores.
// `pixelCanvas` desenha esse mapa com primitivas (retângulo, disco, elipse, linha,
// contorno), para sprites novos sem precisar digitar 40 linhas de caracteres à mão.
import { createElement } from 'react';

/** Converte um mapa de caracteres em <rect>s (cor da paleta; "cor@opacidade" aceita opacidade). */
export function mapToRects(rows, palette, prefix) {
  const used = rows.map((row) => Array.from(row, () => false));
  const sameRun = (y, x0, x1, ch) => {
    for (let x = x0; x <= x1; x += 1) if (rows[y][x] !== ch || used[y][x]) return false;
    return true;
  };
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (used[y][x] || !palette[ch]) continue;
      let x1 = x;
      while (x1 + 1 < row.length && row[x1 + 1] === ch && !used[y][x1 + 1]) x1 += 1;
      let y1 = y;
      while (y1 + 1 < rows.length && sameRun(y1 + 1, x, x1, ch)) y1 += 1;
      for (let yy = y; yy <= y1; yy += 1) for (let xx = x; xx <= x1; xx += 1) used[yy][xx] = true;
      const [fill, opacity] = palette[ch].split('@');
      rects.push(createElement('rect', { key: `${prefix}${x}-${y}`, x, y, width: x1 - x + 1, height: y1 - y + 1, fill, opacity }));
    }
  });
  return rects;
}

/** Grade de `w`×`h` caracteres com primitivas de desenho. Tudo fora da grade é ignorado. */
export function pixelCanvas(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const api = {
    get: (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? g[y][x] : '.'),
    set(x, y, c) {
      if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c;
      return api;
    },
    rect(x, y, rw, rh, c) {
      for (let yy = y; yy < y + rh; yy += 1) for (let xx = x; xx < x + rw; xx += 1) api.set(xx, yy, c);
      return api;
    },
    /** Elipse cheia centrada no meio do pixel (cx, cy). */
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) api.set(x, y, c);
        }
      }
      return api;
    },
    disc: (cx, cy, r, c) => api.ellipse(cx, cy, r, r, c),
    /** Linha de Bresenham com `t` pixels de espessura (quadrado). */
    line(x0, y0, x1, y1, c, t = 1) {
      let x = x0;
      let y = y0;
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        api.rect(x, y, t, t, c);
        if (x === x1 && y === y1) break;
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
      return api;
    },
    /** Troca a cor `from` por `to` onde `test(x, y)` for verdadeiro (luzes e sombras por região). */
    shade(from, to, test) {
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (from.includes(g[y][x]) && test(x, y)) g[y][x] = to;
      return api;
    },
    /** Contorno de 1 pixel em volta de tudo que não é transparente (vizinhança de 4). */
    outline(c = 'k') {
      const marks = [];
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (g[y][x] !== '.') continue;
          const n = [api.get(x - 1, y), api.get(x + 1, y), api.get(x, y - 1), api.get(x, y + 1)];
          if (n.some((ch) => ch !== '.' && ch !== c)) marks.push([x, y]);
        }
      }
      for (const [x, y] of marks) g[y][x] = c;
      return api;
    },
    rows: () => g.map((row) => row.join('')),
  };
  return api;
}
