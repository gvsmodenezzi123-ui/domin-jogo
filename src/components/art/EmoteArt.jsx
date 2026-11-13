/**
 * Versão 2.33: os emotes da roda em pixel art (14×14): a carinha amarela de cada humor, o joinha
 * e o foguinho. Desenhados por código (grade de letras → retângulos SVG nítidos).
 */
import { memo } from 'react';

const N = 14;
const PAL = {
  k: '#2a1606',
  y: '#f8c838',
  o: '#d8961c',
  h: '#fff2b0',
  R: '#f0683a',
  r: '#c43e1c',
  m: '#5a1010',
  t: '#e8506a',
  b: '#5ab8f0',
  w: '#ffffff',
  f: '#ff8a1a',
  F: '#ffd23a',
  s: '#f2bc84',
  S: '#c88458',
};

/** A carinha: o círculo com contorno, a sombra embaixo e o brilho em cima (`hot`: a vermelha). */
function face(hot = false) {
  const g = Array.from({ length: N }, () => Array(N).fill('.'));
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 7);
      if (d <= 5.9) g[y][x] = d > 4.4 && y >= 8 ? (hot ? 'r' : 'o') : hot ? 'R' : 'y';
      else if (d <= 6.9) g[y][x] = 'k';
    }
  }
  for (const [x, y] of [
    [4, 3],
    [5, 3],
    [3, 4],
  ])
    g[y][x] = 'h';
  return g;
}

const dot = (g, pts, c) => {
  for (const [x, y] of pts) if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c;
  return g;
};

const fromRows = (rows) => rows.map((r) => r.padEnd(N, '.').split(''));

const GRIDS = {
  // olhos de ^ ^, a boca aberta com a língua e as lágrimas de rir
  risada: () =>
    dot(
      dot(
        dot(face(), [
          [4, 5],
          [3, 6],
          [5, 6],
          [9, 5],
          [8, 6],
          [10, 6],
          [4, 8],
          [5, 8],
          [6, 8],
          [7, 8],
          [8, 8],
          [9, 8],
          [4, 9],
          [5, 9],
          [8, 9],
          [9, 9],
          [5, 10],
          [8, 10],
        ], 'm'),
        [
          [6, 9],
          [7, 9],
          [6, 10],
          [7, 10],
        ],
        't',
      ),
      [
        [1, 7],
        [2, 8],
        [12, 7],
        [11, 8],
      ],
      'b',
    ),
  // a sobrancelha levantada, os olhos para cima e a boca de lado
  pensa: () =>
    dot(
      dot(face(), [
        [4, 5],
        [9, 5],
        [8, 3],
        [9, 3],
        [10, 3],
        [3, 4],
        [4, 4],
        [6, 10],
        [7, 10],
        [8, 9],
      ], 'k'),
      [
        [3, 10],
        [4, 10],
        [3, 11],
        [4, 11],
        [5, 11],
        [4, 12],
        [5, 12],
      ],
      's',
    ),
  // vermelho, as sobrancelhas para baixo e a boca torta
  bravo: () =>
    dot(face(true), [
      [3, 4],
      [4, 5],
      [5, 5],
      [10, 4],
      [9, 5],
      [8, 5],
      [4, 7],
      [9, 7],
      [5, 10],
      [6, 10],
      [7, 10],
      [8, 10],
      [4, 11],
      [9, 11],
    ], 'k'),
  // os olhos fechados de choro e as lágrimas escorrendo
  choro: () =>
    dot(
      dot(face(), [
        [3, 6],
        [4, 5],
        [5, 6],
        [8, 6],
        [9, 5],
        [10, 6],
        [6, 10],
        [7, 10],
        [5, 11],
        [8, 11],
      ], 'k'),
      [
        [4, 7],
        [4, 8],
        [4, 9],
        [3, 10],
        [9, 7],
        [9, 8],
        [9, 9],
        [10, 10],
      ],
      'b',
    ),
  joinha: () =>
    fromRows([
      '......kk......',
      '.....kssk.....',
      '.....kssk.....',
      '.....kssk.....',
      '....ksssk.....',
      '.kkkkssskkkk..',
      '.kSkssssssssk.',
      '.kSkkkkkkkssk.',
      '.kSkssssssssk.',
      '.kSkkkkkkkssk.',
      '.kSkssssssssk.',
      '.kSkkkkkkksk..',
      '.kkkkkkkkkk...',
      '..............',
    ]),
  fogo: () =>
    fromRows([
      '......k.......',
      '.....kfk......',
      '.....kffk.....',
      '....kfffk..k..',
      '...kffFfk.kfk.',
      '...kffFFfkffk.',
      '..kffFFFFfffk.',
      '..kfFFwwFFffk.',
      '..kfFFwwwFFfk.',
      '..kffFwwwFFfk.',
      '..kffFFwFFffk.',
      '...kffFFFffk..',
      '....kkfffkk...',
      '......kkk.....',
    ]),
};

const RECTS = new Map();
function rectsOf(id) {
  let out = RECTS.get(id);
  if (!out) {
    const g = (GRIDS[id] ?? GRIDS.joinha)();
    out = [];
    g.forEach((row, y) => {
      // junta os pixels iguais em sequência num retângulo só
      for (let x = 0; x < N; ) {
        const c = row[x];
        let w = 1;
        while (x + w < N && row[x + w] === c) w += 1;
        if (c !== '.' && PAL[c]) out.push({ x, y, w, c: PAL[c] });
        x += w;
      }
    });
    RECTS.set(id, out);
  }
  return out;
}

export const EmoteIcon = memo(function EmoteIcon({ id, size = 28, className = '' }) {
  return (
    <svg viewBox={`0 0 ${N} ${N}`} width={size} height={size} className={`emote-icon ${className}`} style={{ shapeRendering: 'crispEdges' }} aria-hidden="true">
      {rectsOf(id).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
});
