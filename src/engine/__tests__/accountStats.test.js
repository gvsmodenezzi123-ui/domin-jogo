import { beforeEach, describe, expect, it } from 'vitest';
import {
  LIFETIME_STATS_KEY,
  biggestNemesisOf,
  biggestVictimOf,
  favoriteTileOf,
  loadAccountStats,
  resetAccountStats,
  subscribeAccountStats,
  tileNameOf,
  trackGoldSpent,
  trackRunEnd,
  trackRunStart,
  trackStatsEvents,
  trackTilePlay,
  winRateOf,
} from '../accountStats.js';
import { FULL_SET, createSeededRng, shuffle } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { addGoldCaps, resetMeta } from '../meta.js';
import { readRaw, writeRaw } from '../storage.js';

beforeEach(() => {
  resetMeta();
  resetAccountStats();
});

describe('Patch 0.9.1: estatísticas da conta (Caderno de Fiado)', () => {
  it('grava em buxaria_lifetime_stats e começa zerado', () => {
    const s = loadAccountStats();
    expect(s).toMatchObject({ runsStarted: 0, runsWon: 0, runsLost: 0, totalGoldSpent: 0, totalBuchasPlayed: 0, tilesPlayedCount: {} });
    trackRunStart();
    expect(JSON.parse(readRaw(LIFETIME_STATS_KEY)).runsStarted).toBe(1);
  });

  it('trackTilePlay conta a pedra (na ordem do jogo) e as buchas', () => {
    trackTilePlay(6, 6);
    trackTilePlay(5, 3);
    trackTilePlay(3, 5);
    trackTilePlay(9, 1); // pedra que não existe: ignorada
    const s = loadAccountStats();
    expect(s.tilesPlayedCount).toEqual({ '6-6': 1, '3-5': 2 });
    expect(s.totalBuchasPlayed).toBe(1);
    expect(favoriteTileOf(s)).toMatchObject({ id: '3-5', count: 2 });
    expect(tileNameOf(6, 6)).toBe('Bucha de Sena');
    expect(tileNameOf(3, 5)).toBe('Quina e Terno');
  });

  it('trackGoldSpent soma, trackRunEnd fecha vitórias, derrotas e o maior algoz', () => {
    trackGoldSpent(8);
    trackGoldSpent(3);
    trackRunStart();
    trackRunStart();
    trackRunStart();
    trackRunEnd(false, 'neide');
    trackRunEnd(false, 'neide');
    trackRunEnd(true, 'comendador');
    const s = loadAccountStats();
    expect(s.totalGoldSpent).toBe(11);
    expect(s).toMatchObject({ runsStarted: 3, runsWon: 1, runsLost: 2, biggestLossRival: 'neide' });
    expect(biggestNemesisOf(s)).toEqual({ id: 'neide', count: 2 });
    expect(winRateOf(s)).toBeCloseTo(1 / 3, 5);
  });

  it('runs que começaram antes do caderno não deixam o total iniciado atrás', () => {
    trackRunEnd(false, 'tonho');
    expect(loadAccountStats()).toMatchObject({ runsStarted: 1, runsLost: 1 });
  });

  it('quem já tinha tampinhas começa com o saldo como histórico', () => {
    writeRaw(LIFETIME_STATS_KEY, null);
    addGoldCaps(23);
    expect(loadAccountStats().totalCapsEarned).toBe(23);
  });

  it('lê dado torto sem quebrar e avisa quem assina', () => {
    writeRaw(LIFETIME_STATS_KEY, '{"runsWon": -4, "tilesPlayedCount": {"6-6": "x", "1-2": 3}, "biggestLossRival": 7}');
    expect(loadAccountStats()).toMatchObject({ runsWon: 0, tilesPlayedCount: { '1-2': 3 }, biggestLossRival: null });
    let heard = 0;
    const off = subscribeAccountStats(() => (heard += 1));
    trackRunStart();
    off();
    expect(heard).toBe(1);
  });

  it('eventos da mesa: pedra, gasto, múltiplo de 5, tranca, mesa vencida, tampinhas e fim da run', () => {
    const events = [
      { type: 'runStart' },
      { type: 'tilePlaced', by: 'player', tileId: '4-4' },
      { type: 'tilePlaced', by: 'tioZe', tileId: '6-6' },
      { type: 'tilePlaced', by: 'player', tileId: '2-5#c' },
      { type: 'coins', who: 'player', amount: -7, source: 'shop' },
      { type: 'coins', who: 'player', amount: -3, source: 'pass' },
      { type: 'coins', who: 'player', amount: -2, source: 'fee' }, // taxa do Beto: não é gasto
      { type: 'coins', who: 'player', amount: 9, source: 'prize' },
      { type: 'drawTile', by: 'player', cost: { type: 'coins', amount: 3 } },
      { type: 'drawTile', by: 'player', cost: { type: 'free' } },
      { type: 'bonus5', by: 'player', amount: 3 },
      { type: 'bonus5', by: 'tioZe', amount: 3 },
      { type: 'roundEnd', result: { kind: 'tranca', winner: 'player' } },
      { type: 'roundEnd', result: { kind: 'tranca', winner: 'tioZe' } },
      { type: 'duelEnd', winner: 'player', caps: 3, runWon: false },
    ];
    const s = trackStatsEvents(events, { rivalId: 'arlindo' });
    expect(s).toMatchObject({
      runsStarted: 1,
      totalGoldSpent: 13,
      totalMugginsClosed: 1,
      totalMugginsEarnings: 3,
      totalTrancasWon: 1,
      totalBuchasPlayed: 1,
      tilesPlayedCount: { '4-4': 1, '2-5': 1 },
      rivalsDefeated: { arlindo: 1 },
      totalCapsEarned: 3,
    });
    expect(biggestVictimOf(s)).toEqual({ id: 'arlindo', count: 1 });
    const lost = trackStatsEvents([{ type: 'duelEnd', winner: 'tioZe' }], { rivalId: 'beto' });
    expect(lost).toMatchObject({ runsLost: 1, biggestLossRival: 'beto' });
    const won = trackStatsEvents([{ type: 'duelEnd', winner: 'player', caps: 8, runWon: true }], { rivalId: 'comendador' });
    expect(won).toMatchObject({ runsWon: 1, rivalsDefeated: { arlindo: 1, comendador: 1 }, totalCapsEarned: 11 });
  });

  it('eventos que não contam não regravam nada', () => {
    const before = readRaw(LIFETIME_STATS_KEY);
    trackStatsEvents([{ type: 'proc' }, { type: 'coins', who: 'tioZe', amount: -3, source: 'pass' }], { rivalId: 'tioZe' });
    expect(readRaw(LIFETIME_STATS_KEY)).toBe(before);
  });

  it('uma mesa de verdade: cada pedra sua jogada entra no caderno, sem mexer no jogo', () => {
    const rng = createSeededRng(11);
    let state = gameReducer(createInitialState(), { type: 'START_DUEL', deck: shuffle(FULL_SET, rng), seed: 3 });
    const plain = gameReducer(createInitialState(), { type: 'START_DUEL', deck: shuffle(FULL_SET, createSeededRng(11)), seed: 3 });
    expect(state.hands).toEqual(plain.hands); // a semente continua mandando
    let seq = 0;
    let mine = 0;
    for (let i = 0; i < 400 && state.phase === 'playing'; i += 1) {
      const action =
        state.turn === 'tioZe'
          ? { type: 'TIO_ZE_ACT' }
          : (() => {
              for (const tile of state.hands.player) {
                for (const side of ['left', 'right', 'root']) {
                  const next = gameReducer(state, { type: 'PLAY', actor: 'player', tileId: tile.id, side });
                  if (next !== state) return { type: 'PLAY', actor: 'player', tileId: tile.id, side };
                }
              }
              return state.pending?.type === 'forcedPass' ? { type: 'PASS', actor: 'player' } : { type: 'DRAW', actor: 'player' };
            })();
      let next = gameReducer(state, action);
      if (next === state) next = gameReducer(state, { type: 'PASS', actor: state.turn });
      if (next === state) break;
      const fresh = next.events.filter((e) => e.seq > seq);
      mine += fresh.filter((e) => e.type === 'tilePlaced' && e.by === 'player').length;
      trackStatsEvents(fresh, next);
      seq = next.seq;
      state = next;
    }
    const s = loadAccountStats();
    const counted = Object.values(s.tilesPlayedCount).reduce((a, b) => a + b, 0);
    expect(mine).toBeGreaterThan(0);
    expect(counted).toBe(mine);
  });
});
