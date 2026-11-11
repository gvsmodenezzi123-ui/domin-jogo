import { describe, expect, it } from 'vitest';
import { LANDSCAPE, computeBoardLayout, computeWorldSize } from '../boardLayout.js';

/** Sorteio fixo (as mesas são sempre as mesmas a cada execução). */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function randomBoard(rnd) {
  const chain = (len) => {
    const out = [];
    let v = Math.floor(rnd() * 7);
    for (let i = 0; i < len; i += 1) {
      const next = rnd() < 0.18 ? v : Math.floor(rnd() * 7);
      out.push([v, next]);
      v = next;
    }
    return out;
  };
  const total = 6 + Math.floor(rnd() * 22);
  const split = Math.floor(rnd() * (total + 1));
  const mk = (list, side) =>
    list.map(([inner, outer], i) => ({ id: `${side}${i}`, a: Math.min(inner, outer), b: Math.max(inner, outer), inner, outer, seq: side === 'L' ? i * 2 + 1 : i * 2 + 2 }));
  const a = Math.floor(rnd() * 7);
  const b = rnd() < 0.3 ? a : Math.floor(rnd() * 7);
  return { root: { id: 'root', a: Math.min(a, b), b: Math.max(a, b), left: a, right: b }, left: mk(chain(split), 'L'), right: mk(chain(total - split), 'R') };
}

const VIEWS = [
  [844, 390],
  [932, 430],
  [667, 375],
  [1280, 720],
];

function* boards(seed, count) {
  const rnd = rng(seed);
  for (let k = 0; k < count; k += 1) {
    const [w, h] = VIEWS[k % VIEWS.length];
    const { cols, rows } = computeWorldSize(w * 0.7, h * 0.5, 10, { landscape: true });
    yield { cols, rows, lay: computeBoardLayout(randomBoard(rnd), cols, rows, { landscape: true }) };
  }
}

const cy = (t) => t.y + t.h / 2;

describe('versão 2.9: a corrente da mesa deitada (tampo de tamanho fixo)', () => {
  it('o mundo deitado é o tampo quadrado (versão 2.18): 12 linhas e de 15 a 18 colunas', () => {
    const { cols, rows } = computeWorldSize(600, 200, 10, { landscape: true });
    expect(rows).toBe(LANDSCAPE.rows);
    expect(cols).toBeLessThanOrEqual(LANDSCAPE.maxCols);
    expect(computeWorldSize(380, 280, 10, { landscape: true }).cols).toBe(16);
    expect(computeWorldSize(300, 400, 10).cols).toBe(10);
  });

  it('começa no meio do tampo; ao chegar na beirada, as duas pontas viram para lados opostos', () => {
    for (const { lay, cols, rows } of boards(2901, 600)) {
      const root = lay.tiles.find((t) => t.branch === 'root');
      expect(root.x + root.w / 2).toBeCloseTo(cols / 2, 5);
      expect(cy(root)).toBeCloseTo(rows / 2, 5);
      for (const branch of ['left', 'right']) {
        const tiles = lay.tiles.filter((t) => t.branch === branch && !t.detached);
        const turn = tiles.find((t) => Math.abs(cy(t) - cy(root)) > 1e-6 && !t.isDouble);
        // a da direita dobra para perto (para baixo), a da esquerda para lá (para cima)
        if (turn) expect(Math.sign(cy(turn) - cy(root))).toBe(branch === 'right' ? 1 : -1);
        // a 1ª volta só acontece na beirada do tampo
        const lane = tiles.slice(0, tiles.indexOf(turn));
        if (turn && lane.length) {
          const far = branch === 'right' ? Math.max(...lane.map((t) => t.x + t.w)) : Math.min(...lane.map((t) => t.x));
          expect(branch === 'right' ? cols - far : far).toBeLessThan(2.6);
        }
      }
    }
  });

  it('no máximo 2 pedras seguidas em pé na vertical (a bucha atravessada na quina fica deitada)', () => {
    for (const { lay } of boards(2902, 1200)) {
      for (const branch of ['left', 'right']) {
        let run = 0;
        for (const t of lay.tiles.filter((x) => x.branch === branch)) {
          run = t.lineAxis === 'vertical' && !t.isDouble ? run + 1 : 0;
          expect(run).toBeLessThanOrEqual(LANDSCAPE.maxRise);
        }
      }
    }
  });

  it('nada sai do tampo nem se sobrepõe (só a bucha de quina passa meia casa)', () => {
    for (const { lay, cols, rows } of boards(2903, 800)) {
      const ts = lay.tiles;
      for (let i = 0; i < ts.length; i += 1) {
        const t = ts[i];
        const over = Math.max(-t.x, t.x + t.w - cols, -t.y, t.y + t.h - rows);
        expect(over).toBeLessThanOrEqual(t.isDouble ? 0.5 + 1e-6 : 1e-6);
        for (let j = i + 1; j < ts.length; j += 1) {
          const o = ts[j];
          const hit = t.x < o.x + o.w - 1e-6 && o.x < t.x + t.w - 1e-6 && t.y < o.y + o.h - 1e-6 && o.y < t.y + t.h - 1e-6;
          expect(hit).toBe(false);
        }
      }
    }
  });

  it('numa partida de verdade (as duas pontas crescendo) a corrente inteira cabe ligada', () => {
    const rnd = rng(2904);
    for (const aspect of [2.6, 3, 3.45, 3.9]) {
      const { cols, rows } = computeWorldSize(aspect * 100, 100, 10, { landscape: true });
      for (let k = 0; k < 300; k += 1) {
        const total = 6 + Math.floor(rnd() * 22);
        const board = randomBoard(rnd);
        // reparte as pedras entre as duas pontas (20% a 80% de um lado)
        const all = [...board.left, ...board.right].slice(0, total);
        const split = Math.floor(all.length * (0.2 + rnd() * 0.6));
        const fair = { root: board.root, left: all.slice(0, split).map((t, i) => ({ ...t, seq: i * 2 + 1 })), right: all.slice(split).map((t, i) => ({ ...t, seq: i * 2 + 2 })) };
        const lay = computeBoardLayout(fair, cols, rows, { landscape: true });
        expect(lay.tiles.filter((t) => t.detached)).toHaveLength(0);
      }
    }
  });
});
