/**
 * Layout da mesa em "U" — grade matricial sem zoom.
 *
 * A mesa é uma grade de COLS x rows células quadradas. Cada pedra ocupa duas
 * células consecutivas de um caminho. A primeira pedra fica fixa no centro da
 * fileira de baixo; cada ponta tem o seu caminho:
 *
 *   ponta esquerda: anda para a esquerda, sobe pela margem esquerda, curva
 *                   para dentro no topo e, se precisar, espirala para dentro;
 *   ponta direita:  espelho da esquerda.
 *
 * O caminho é gerado por uma "tartaruga" que gira quando bate na borda ou
 * quando ficaria colada no próprio rastro (sempre sobra uma célula de folga
 * entre as voltas). Cada ramo vive na sua metade da mesa, então os dois
 * nunca se cruzam.
 */

import { getOpenEnds } from './dominoLogic.js';

export const BOARD_COLS = 16;
export const MIN_ROWS = 12;
export const MAX_ROWS = 26;

const DIRS = {
  west: { dx: -1, dy: 0 },
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
};

// Esquerda gira no sentido horário (oeste → norte → leste → sul); direita no anti-horário.
const TURN_LEFT_BRANCH = { west: 'north', north: 'east', east: 'south', south: 'west' };
const TURN_RIGHT_BRANCH = { east: 'north', north: 'west', west: 'south', south: 'east' };

const key = (x, y) => `${x},${y}`;

/** Linhas da grade para um container, dado o lado da célula derivado da largura. */
export function computeGridSize(width, height, cols = BOARD_COLS) {
  if (!width || !height) return { cols, rows: MIN_ROWS, cell: 0 };
  const cellFromWidth = width / cols;
  const rows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.floor(height / cellFromWidth)));
  const cell = Math.floor(Math.min(width / cols, height / rows));
  return { cols, rows, cell };
}

function rootCells(cols, rows) {
  const x = cols / 2 - 1;
  return [
    { x, y: rows - 1 },
    { x: x + 1, y: rows - 1 },
  ];
}

/**
 * Gera o caminho de células de um ramo.
 * Níveis de tolerância: 0 = exige folga de 1 célula; 1 = só não sobrepõe;
 * 2 = último recurso, segue reto mesmo fora da área (nunca deveria acontecer).
 */
function buildBranchPath({ start, dir, turns, bounds, length }) {
  const cells = [];
  const used = new Set();

  const inBounds = (x, y) => x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1;

  const isFree = (x, y, prev, tolerance) => {
    if (tolerance >= 2) return !used.has(key(x, y));
    if (!inBounds(x, y) || used.has(key(x, y))) return false;
    if (tolerance === 1) return true;
    for (const d of Object.values(DIRS)) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (prev && nx === prev.x && ny === prev.y) continue;
      if (used.has(key(nx, ny))) return false;
    }
    return true;
  };

  if (!inBounds(start.x, start.y)) return cells;
  cells.push(start);
  used.add(key(start.x, start.y));

  let cur = start;
  let heading = dir;
  while (cells.length < length) {
    let moved = false;
    for (let tolerance = 0; tolerance <= 2 && !moved; tolerance += 1) {
      let h = heading;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const d = DIRS[h];
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (isFree(nx, ny, cur, tolerance)) {
          cur = { x: nx, y: ny };
          cells.push(cur);
          used.add(key(nx, ny));
          heading = h;
          moved = true;
          break;
        }
        h = turns[h];
      }
    }
    if (!moved) break;
  }
  return cells;
}

const pathCache = new Map();

/** Caminhos (memoizados) dos dois ramos para uma grade. */
export function getBranchPaths(cols, rows) {
  const cacheKey = `${cols}x${rows}`;
  if (pathCache.has(cacheKey)) return pathCache.get(cacheKey);
  const [rootL, rootR] = rootCells(cols, rows);
  const half = cols / 2;
  // Cada ramo pode guardar até 27 pedras + 1 vaga de encaixe.
  const length = 2 * 28;
  const paths = {
    left: buildBranchPath({
      start: { x: rootL.x - 1, y: rows - 1 },
      dir: 'west',
      turns: TURN_LEFT_BRANCH,
      bounds: { x0: 0, x1: half - 2, y0: 0, y1: rows - 1 },
      length,
    }),
    right: buildBranchPath({
      start: { x: rootR.x + 1, y: rows - 1 },
      dir: 'east',
      turns: TURN_RIGHT_BRANCH,
      bounds: { x0: half + 1, x1: cols - 1, y0: 0, y1: rows - 1 },
      length,
    }),
  };
  pathCache.set(cacheKey, paths);
  return paths;
}

/** Retângulo e orientação de uma pedra que ocupa as células c0 (inner) e c1 (outer). */
function tileGeometry(c0, c1, inner, outer) {
  const horizontal = c0.y === c1.y;
  const x = Math.min(c0.x, c1.x);
  const y = Math.min(c0.y, c1.y);
  let values;
  if (horizontal) values = c0.x < c1.x ? [inner, outer] : [outer, inner];
  else values = c0.y < c1.y ? [inner, outer] : [outer, inner];
  return {
    x,
    y,
    w: horizontal ? 2 : 1,
    h: horizontal ? 1 : 2,
    orientation: horizontal ? 'horizontal' : 'vertical',
    values,
  };
}

/** Direção (unitária) de c0 para c1, usada para posicionar o badge da ponta. */
function heading(c0, c1) {
  return { dx: Math.sign(c1.x - c0.x), dy: Math.sign(c1.y - c0.y) };
}

/**
 * Calcula a posição de todas as pedras e das vagas de encaixe.
 *
 * Retorna:
 *   tiles: [{ id, x, y, w, h, orientation, values, branch, isOpenEnd, endSides }]
 *   slots: { root } com mesa vazia, ou { left, right } — cada vaga tem
 *          { x, y, w, h, orientation, badge: {x, y}, value }
 * Coordenadas em células.
 */
export function computeBoardLayout(board, cols, rows) {
  const [rootL, rootR] = rootCells(cols, rows);
  const rootRect = { x: rootL.x, y: rootL.y, w: 2, h: 1, orientation: 'horizontal' };

  if (!board.root) {
    return {
      tiles: [],
      slots: {
        root: { ...rootRect, badge: null, value: null },
      },
    };
  }

  const paths = getBranchPaths(cols, rows);
  const ends = getOpenEnds(board);
  const tiles = [];

  const rootEndSides = [];
  if (board.left.length === 0) rootEndSides.push('left');
  if (board.right.length === 0) rootEndSides.push('right');
  tiles.push({
    id: board.root.id,
    ...rootRect,
    values: [board.root.left, board.root.right],
    branch: 'root',
    isOpenEnd: rootEndSides.length > 0,
    endSides: rootEndSides,
  });

  const slots = {};

  for (const branch of ['left', 'right']) {
    const placed = board[branch];
    const path = paths[branch];
    placed.forEach((tile, i) => {
      const c0 = path[2 * i];
      const c1 = path[2 * i + 1];
      if (!c0 || !c1) return;
      const isLast = i === placed.length - 1;
      tiles.push({
        id: tile.id,
        ...tileGeometry(c0, c1, tile.inner, tile.outer),
        branch,
        isOpenEnd: isLast,
        endSides: isLast ? [branch] : [],
      });
    });

    const n = placed.length;
    const s0 = path[2 * n];
    const s1 = path[2 * n + 1];
    if (s0 && s1) {
      const prev = n === 0 ? (branch === 'left' ? rootL : rootR) : path[2 * n - 1];
      const dir = heading(prev, s0);
      const geom = tileGeometry(s0, s1, ends[branch], ends[branch]);
      slots[branch] = {
        x: geom.x,
        y: geom.y,
        w: geom.w,
        h: geom.h,
        orientation: geom.orientation,
        // badge no centro da primeira célula livre, puxado para perto da ponta
        badge: { x: s0.x + 0.5 - dir.dx * 0.18, y: s0.y + 0.5 - dir.dy * 0.18 },
        value: ends[branch],
      };
    }
  }

  return { tiles, slots };
}
