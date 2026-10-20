import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction } from '../../ai/tioZeAI.js';
import { computeBoardLayout, rectGap, rectsOverlap } from '../boardLayout.js';
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

// mundos [colunas, linhas]: SE, iPhone 14, telas altas
const GRIDS = [
  [10, 9],
  [10, 11],
  [10, 13],
  [10, 18],
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
    for (let i = 0; i < tiles.length; i += 1) {
      const t = tiles[i];
      check((t.w > t.h) === (t.orientation === 'horizontal'), `pedra ${t.id} com retângulo e orientação trocados`);
      check(!t.isDouble || t.orientation !== t.lineAxis, `bucha ${t.id} não está atravessada`);
      for (let j = i + 1; j < tiles.length; j += 1) {
        check(!rectsOverlap(t, tiles[j]), `pedras ${t.id} e ${tiles[j].id} sobrepostas em ${cols}x${rows}`);
      }
    }
    // cada pedra encosta na anterior da sua ponta (a corrente nunca pula)
    for (const branch of ['left', 'right']) {
      const chain = [tiles[0], ...tiles.filter((t) => t.branch === branch)];
      for (let k = 1; k < chain.length; k += 1) {
        check(rectGap(chain[k - 1], chain[k]) < 1e-6, `corrente ${branch} desconectada em ${chain[k].id}`);
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
