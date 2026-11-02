import { describe, expect, it } from 'vitest';
import { MAX_VERTICAL_CHAIN, computeBoardLayout } from '../boardLayout.js';

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

/** A maior sequência de pedras seguidas correndo na vertical num ramo. */
function longestRun(tiles) {
  let best = 0;
  let n = 0;
  for (const t of tiles) {
    n = t.lineAxis === 'vertical' ? n + 1 : 0;
    best = Math.max(best, n);
  }
  return best;
}

describe('versão 2.6.1: a trava da serpente', () => {
  it('nenhum ramo passa de 3 pedras seguidas na vertical: a 4ª sempre deita', () => {
    const rnd = rng(2611);
    for (let k = 0; k < 600; k += 1) {
      const lay = computeBoardLayout(randomBoard(rnd), 10, 16 + (k % 3));
      for (const branch of ['left', 'right']) {
        expect(longestRun(lay.tiles.filter((t) => t.branch === branch))).toBeLessThanOrEqual(MAX_VERTICAL_CHAIN);
      }
    }
  });

  it('a vaga da próxima pedra também respeita a trava', () => {
    // corrente que sobe pela margem até a trava: a vaga já aparece deitada
    const rnd = rng(77);
    for (let k = 0; k < 300; k += 1) {
      const lay = computeBoardLayout(randomBoard(rnd), 10, 16);
      for (const branch of ['left', 'right']) {
        const tiles = lay.tiles.filter((t) => t.branch === branch);
        let run = 0;
        for (let i = tiles.length - 1; i >= 0 && tiles[i].lineAxis === 'vertical'; i -= 1) run += 1;
        if (run >= MAX_VERTICAL_CHAIN) expect(lay.slots[branch].lineAxis).toBe('horizontal');
      }
    }
  });
});
