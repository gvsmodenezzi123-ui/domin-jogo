import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction } from '../../ai/tioZeAI.js';
import { computeBoardLayout, getBranchPaths } from '../boardLayout.js';
import {
  FULL_SET,
  MAX_HEARTS,
  boardTilesInOrder,
  createSeededRng,
  getDrawAvailability,
  getPlayableMoves,
  shuffle,
} from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';

const GRIDS = [
  [16, 12],
  [16, 14],
  [16, 18],
  [16, 24],
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function assertTileConservation(state) {
  const ids = [
    ...boardTilesInOrder(state.board).map((t) => t.id),
    ...state.hands.player.map((t) => t.id),
    ...state.hands.tioZe.map((t) => t.id),
    ...state.boneyard.map((t) => t.id),
  ];
  check(ids.length === 28 && new Set(ids).size === 28, `pedras perdidas/duplicadas: ${ids.length}`);
}

function assertLayout(board) {
  for (const [cols, rows] of GRIDS) {
    const { tiles } = computeBoardLayout(board, cols, rows);
    check(tiles.length === boardTilesInOrder(board).length, 'pedra sem posição no layout');
    const occupied = new Set();
    for (const tile of tiles) {
      for (let dx = 0; dx < tile.w; dx += 1) {
        for (let dy = 0; dy < tile.h; dy += 1) {
          const x = tile.x + dx;
          const y = tile.y + dy;
          check(x >= 0 && x < cols && y >= 0 && y < rows, `pedra fora da mesa em ${cols}x${rows}`);
          const k = `${x},${y}`;
          check(!occupied.has(k), `pedras sobrepostas em ${k}`);
          occupied.add(k);
        }
      }
    }
  }
}

/** Jogador simulado: na maioria das vezes joga como o Tio Zé; às vezes faz algo aleatório (mas legal). */
function simulatedPlayerAction(state, rng) {
  const view = buildTioZeView(state, 'player');
  if (state.board.root && rng() < 0.25) {
    const options = [];
    const moves = getPlayableMoves(state.hands.player, state.board);
    for (const m of moves) options.push({ type: 'PLAY', actor: 'player', tileId: m.tile.id, side: m.side });
    const draw = getDrawAvailability({
      drawsThisTurn: state.drawsThisTurn,
      boneyardCount: state.boneyard.length,
      coins: state.coins.player,
      hearts: state.hearts.player,
    });
    if (draw.allowed) options.push({ type: 'DRAW', actor: 'player' });
    options.push({ type: 'PASS', actor: 'player' });
    return options[Math.floor(rng() * options.length)];
  }
  return decideTioZeAction(view);
}

function runDuel(seed) {
  const rng = createSeededRng(seed);
  let state = gameReducer(createInitialState(), { type: 'START_DUEL', deck: shuffle(FULL_SET, rng) });
  let steps = 0;
  const kinds = new Set();
  while (state.phase !== 'gameOver') {
    steps += 1;
    if (steps > 5000) throw new Error(`duelo ${seed} não terminou`);
    if (state.phase === 'roundOver') {
      kinds.add(state.roundResult.kind);
      assertLayout(state.board);
      state = gameReducer(state, { type: 'NEXT_ROUND', deck: shuffle(FULL_SET, rng) });
      continue;
    }
    check(state.phase === 'playing', `fase inesperada ${state.phase}`);
    const action = state.turn === 'tioZe' ? { type: 'TIO_ZE_ACT' } : simulatedPlayerAction(state, rng);
    const next = gameReducer(state, action);
    // o turno sempre progride: nenhuma ação escolhida pode ser rejeitada
    check(next !== state, `ação rejeitada: ${JSON.stringify(action)}`);
    state = next;
    assertTileConservation(state);
    for (const seat of ['player', 'tioZe']) {
      check(state.hearts[seat] >= 0 && state.hearts[seat] <= MAX_HEARTS, 'corações fora do limite');
      check(state.coins[seat] >= 0, 'moedas negativas');
    }
  }
  kinds.add(state.roundResult.kind);
  assertLayout(state.board);
  expect(state.hearts[state.duelWinner === 'player' ? 'tioZe' : 'player']).toBe(0);
  return { winner: state.duelWinner, kinds, steps };
}

describe('simulação de duelos completos', () => {
  it('300 duelos terminam sem travar, sem perder pedras e com layout válido', () => {
    const wins = { player: 0, tioZe: 0 };
    const kinds = new Set();
    for (let seed = 1; seed <= 300; seed += 1) {
      const result = runDuel(seed);
      wins[result.winner] += 1;
      result.kinds.forEach((k) => kinds.add(k));
    }
    expect(wins.player + wins.tioZe).toBe(300);
    // os quatro desfechos aparecem em 300 duelos
    expect([...kinds].sort()).toEqual(['bucha', 'cruzada', 'normal', 'tranca']);
  }, 60000);
});

describe('caminhos em U', () => {
  it('cada ramo tem espaço para 27 pedras + vaga em qualquer grade', () => {
    for (const [cols, rows] of GRIDS) {
      const paths = getBranchPaths(cols, rows);
      for (const branch of ['left', 'right']) {
        const path = paths[branch];
        expect(path.length).toBe(56);
        for (let i = 1; i < path.length; i += 1) {
          const d = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y);
          expect(d).toBe(1);
        }
        for (const c of path) {
          expect(c.x).toBeGreaterThanOrEqual(0);
          expect(c.x).toBeLessThan(cols);
          expect(c.y).toBeGreaterThanOrEqual(0);
          expect(c.y).toBeLessThan(rows);
        }
      }
    }
  });

  it('desenha um U: desce, sobe pela margem e curva no topo', () => {
    const { left, right } = getBranchPaths(16, 18);
    expect(left[0]).toEqual({ x: 6, y: 17 });
    expect(right[0]).toEqual({ x: 9, y: 17 });
    // margem esquerda e direita sobem
    expect(left.some((c) => c.x === 0 && c.y === 0)).toBe(true);
    expect(right.some((c) => c.x === 15 && c.y === 0)).toBe(true);
    // ramos nunca invadem a metade do outro
    expect(left.every((c) => c.x <= 6)).toBe(true);
    expect(right.every((c) => c.x >= 9)).toBe(true);
  });
});
