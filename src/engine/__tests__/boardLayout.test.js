import { describe, expect, it } from 'vitest';
import {
  BASE_UNIT_PX,
  computeBoardLayout,
  computeCamera,
  computeWorldSize,
  rectGap,
  rectsOverlap,
  tileOrientationOnBoard,
} from '../boardLayout.js';
import { createEmptyBoard, makeTile, placeTile } from '../dominoLogic.js';

const t = (a, b) => makeTile(a, b);
const COLS = 10;
const ROWS = 13;

/** Mesa sintética: o layout só usa inner/outer, então dá para montar correntes longas. */
function synthetic(rootTile, left = [], right = []) {
  const mk = (list, side) =>
    list.map(([inner, outer], i) => ({ id: `${side}${i}`, a: Math.min(inner, outer), b: Math.max(inner, outer), inner, outer }));
  return {
    root: { id: rootTile.id, a: rootTile.a, b: rootTile.b, left: rootTile.a, right: rootTile.b },
    left: mk(left, 'L'),
    right: mk(right, 'R'),
  };
}

const byId = (layout, id) => layout.tiles.find((x) => x.id === id);
const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

describe('bucha atravessada', () => {
  it('a orientação na mesa inverte o eixo só para buchas', () => {
    expect(tileOrientationOnBoard(true, 'horizontal')).toBe('vertical');
    expect(tileOrientationOnBoard(true, 'vertical')).toBe('horizontal');
    expect(tileOrientationOnBoard(false, 'horizontal')).toBe('horizontal');
  });

  it('bucha na raiz fica em pé, centrada na linha de baixo', () => {
    const board = placeTile(createEmptyBoard(), t(6, 6), 'root');
    const root = computeBoardLayout(board, COLS, ROWS).tiles[0];
    expect(root).toMatchObject({ orientation: 'vertical', w: 1, h: 2, isDouble: true });
    expect(center(root)).toEqual({ x: COLS / 2, y: ROWS - 1 });
  });

  it('pedra comum na raiz fica deitada no centro da linha de baixo', () => {
    const board = placeTile(createEmptyBoard(), t(2, 5), 'root');
    const root = computeBoardLayout(board, COLS, ROWS).tiles[0];
    expect(root).toMatchObject({ orientation: 'horizontal', w: 2, h: 1, values: [2, 5] });
    expect(center(root)).toEqual({ x: COLS / 2, y: ROWS - 1 });
  });

  it('na linha de baixo a bucha fica em pé, centrada no encaixe', () => {
    let board = placeTile(createEmptyBoard(), t(2, 5), 'root');
    board = placeTile(board, t(5, 5), 'right');
    const lay = computeBoardLayout(board, COLS, ROWS);
    const dbl = lay.tiles[1];
    expect(dbl).toMatchObject({ orientation: 'vertical', lineAxis: 'horizontal', w: 1, h: 2 });
    expect(center(dbl).y).toBe(center(lay.tiles[0]).y);
    expect(rectGap(dbl, lay.tiles[0])).toBe(0);
  });

  it('na perna do U (linha subindo) a bucha fica deitada', () => {
    // 3 pedras levam a ponta esquerda até a margem; a 4ª já está subindo
    const board = synthetic(t(1, 2), [
      [1, 3],
      [3, 4],
      [4, 0],
      [0, 5],
      [5, 5],
    ]);
    const lay = computeBoardLayout(board, COLS, ROWS);
    const dbl = byId(lay, 'L4');
    expect(dbl.lineAxis).toBe('vertical');
    expect(dbl).toMatchObject({ orientation: 'horizontal', w: 2, h: 1 });
  });
});

describe('U e corrente longa', () => {
  it('a ponta esquerda vai até a margem e sobe; a direita espelha', () => {
    const chain = Array.from({ length: 7 }, (_, i) => [i % 7, (i + 1) % 7]);
    const lay = computeBoardLayout(synthetic(t(0, 0), chain, chain), COLS, ROWS);
    const left = lay.tiles.filter((x) => x.branch === 'left');
    const right = lay.tiles.filter((x) => x.branch === 'right');
    expect(Math.min(...left.map((x) => x.x))).toBeLessThanOrEqual(0.5);
    expect(Math.max(...right.map((x) => x.x + x.w))).toBeGreaterThanOrEqual(COLS - 0.5);
    expect(Math.min(...left.map((x) => x.y))).toBeLessThan(ROWS - 5);
    expect(left.every((x) => x.x + x.w <= COLS / 2)).toBe(true);
    expect(right.every((x) => x.x >= COLS / 2)).toBe(true);
  });

  it('corrente enorme fica dentro do feltro, conectada e sem sobrepor', () => {
    const chain = Array.from({ length: 16 }, (_, i) => (i % 5 === 2 ? [3, 3] : [3, 3 + (i % 2)]));
    const lay = computeBoardLayout(synthetic(t(3, 4), chain), COLS, ROWS);
    const left = [lay.tiles[0], ...lay.tiles.filter((x) => x.branch === 'left')];
    for (let i = 1; i < left.length; i += 1) expect(rectGap(left[i - 1], left[i])).toBeLessThan(1e-6);
    for (const tile of lay.tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(-0.5);
      expect(tile.y).toBeGreaterThanOrEqual(-0.5);
      expect(tile.x + tile.w).toBeLessThanOrEqual(COLS + 0.5);
      expect(tile.y + tile.h).toBeLessThanOrEqual(ROWS + 0.01);
    }
    for (let i = 0; i < lay.tiles.length; i += 1) {
      for (let j = i + 1; j < lay.tiles.length; j += 1) expect(rectsOverlap(lay.tiles[i], lay.tiles[j])).toBe(false);
    }
  });

  it('no topo a linha dobra 90° para dentro, deitando as pedras de novo', () => {
    const chain = Array.from({ length: 12 }, (_, i) => [i % 7, (i + 1) % 7]);
    const lay = computeBoardLayout(synthetic(t(0, 0), chain), COLS, ROWS);
    const top = lay.tiles.filter((x) => x.branch === 'left' && !x.isDouble && x.y < 1);
    expect(top.length).toBeGreaterThan(0);
    expect(top.some((x) => x.lineAxis === 'horizontal' && x.x > 0.5)).toBe(true);
  });

  it('pedras já postas nunca mudam de lugar nem de rotação quando outra entra', () => {
    // joga alternando as pontas, com buchas no meio, numa mesa real (com `seq`)
    let board = placeTile(createEmptyBoard(), t(3, 3), 'root');
    const plays = [
      [t(3, 1), 'left'], [t(3, 5), 'right'], [t(1, 1), 'left'], [t(5, 5), 'right'], [t(1, 4), 'left'],
      [t(5, 2), 'right'], [t(4, 4), 'left'], [t(2, 2), 'right'], [t(4, 0), 'left'], [t(2, 6), 'right'],
      [t(0, 0), 'left'], [t(6, 6), 'right'], [t(0, 2), 'left'], [t(6, 1), 'right'], [t(2, 4), 'left'],
    ];
    let before = computeBoardLayout(board, COLS, ROWS);
    for (const [tile, side] of plays) {
      board = placeTile(board, tile, side);
      const after = computeBoardLayout(board, COLS, ROWS);
      for (const old of before.tiles) {
        const now = byId(after, old.id);
        expect({ x: now.x, y: now.y, w: now.w, h: now.h, orientation: now.orientation }).toEqual({
          x: old.x, y: old.y, w: old.w, h: old.h, orientation: old.orientation,
        });
      }
      before = after;
    }
  });

  it('a vaga mostra o espaço de bucha quando a pedra selecionada é bucha', () => {
    const board = placeTile(createEmptyBoard(), t(2, 5), 'root');
    const normal = computeBoardLayout(board, COLS, ROWS);
    const dbl = computeBoardLayout(board, COLS, ROWS, { previewDouble: true });
    expect(normal.slots.right).toMatchObject({ w: 2, h: 1 });
    expect(dbl.slots.right).toMatchObject({ w: 1, h: 2, isDouble: true });
    expect(normal.slots.right.value).toBe(5);
    expect(normal.slots.left.value).toBe(2);
  });
});

describe('câmera', () => {
  const viewport = { width: 374, height: 430 };

  it('o mundo tem 10 colunas e a altura segue a tela', () => {
    expect(computeWorldSize(374, 430)).toEqual({ cols: 10, rows: 13 });
    expect(computeWorldSize(414, 640).rows).toBe(15);
  });

  it('começo da rodada: zoom máximo (pedras grandes)', () => {
    const board = placeTile(createEmptyBoard(), t(6, 6), 'root');
    const cam = computeCamera(computeBoardLayout(board, COLS, ROWS), viewport);
    expect(cam.unitPx).toBe(BASE_UNIT_PX);
    expect(cam.scale).toBe(1);
  });

  it('mesa cheia: afasta, mas mantém pedras ao menos ~40% maiores que no Patch 0.1 (22px)', () => {
    const chain = Array.from({ length: 6 }, (_, i) => [i % 7, (i + 1) % 7]);
    const lay = computeBoardLayout(synthetic(t(0, 0), chain, chain), COLS, ROWS);
    const cam = computeCamera(lay, viewport);
    expect(cam.unitPx).toBeLessThan(BASE_UNIT_PX);
    expect(cam.unitPx).toBeGreaterThanOrEqual(22 * 1.4);
    // tudo dentro do viewport
    for (const tile of lay.tiles) {
      expect(cam.x + tile.x * cam.unitPx).toBeGreaterThanOrEqual(-0.5);
      expect(cam.x + (tile.x + tile.w) * cam.unitPx).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(cam.y + tile.y * cam.unitPx).toBeGreaterThanOrEqual(-0.5);
      expect(cam.y + (tile.y + tile.h) * cam.unitPx).toBeLessThanOrEqual(viewport.height + 0.5);
    }
  });

  const endsVisible = (lay, cam) => {
    for (const end of lay.tiles.filter((x) => x.isOpenEnd)) {
      expect(cam.y + end.y * cam.unitPx).toBeGreaterThanOrEqual(-0.5);
      expect(cam.y + (end.y + end.h) * cam.unitPx).toBeLessThanOrEqual(viewport.height + 0.5);
      expect(cam.x + end.x * cam.unitPx).toBeGreaterThanOrEqual(-0.5);
      expect(cam.x + (end.x + end.w) * cam.unitPx).toBeLessThanOrEqual(viewport.width + 0.5);
    }
  };

  it('corrente enorme numa ponta: as duas pontas continuam na tela', () => {
    const chain = Array.from({ length: 24 }, (_, i) => [3, 3 + (i % 2)]);
    const lay = computeBoardLayout(synthetic(t(3, 4), chain, [[4, 4]]), COLS, ROWS);
    endsVisible(lay, computeCamera(lay, viewport));
  });

  it('mesa lotada cabe inteira no feltro, com pedras ~30% maiores que no Patch 0.1', () => {
    const chain = Array.from({ length: 13 }, (_, i) => [3, 3 + (i % 2)]);
    const lay = computeBoardLayout(synthetic(t(3, 4), chain, chain), COLS, ROWS);
    const cam = computeCamera(lay, viewport);
    expect(cam.focus).toBe('all');
    expect(cam.unitPx).toBeGreaterThanOrEqual(22 * 1.3);
    endsVisible(lay, cam);
  });
});
