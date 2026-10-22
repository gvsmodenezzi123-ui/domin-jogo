import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { forgetRunStats, loadRunStats, resetRunStats, trackRunStatsEvents } from '../runStats.js';
import { outcomeTitleOf, runSummaryText } from '../runSummary.js';
import { writeRaw } from '../storage.js';

beforeEach(() => {
  writeRaw('buxaria:run_stats', null);
  forgetRunStats();
});

describe('Patch 0.9.2: estatísticas da tentativa', () => {
  it('runStart zera; buchas, múltiplos de 5, trancas, dano de rival e tampinhas somam', () => {
    resetRunStats(5);
    trackRunStatsEvents([{ type: 'tilePlaced', by: 'player', double: true }], { seed: 5, rivalId: 'tonho' });
    const s = trackRunStatsEvents(
      [
        { type: 'runStart' },
        { type: 'tilePlaced', by: 'player', double: true, tileId: '4-4' },
        { type: 'tilePlaced', by: 'player', double: false, tileId: '1-4' },
        { type: 'tilePlaced', by: 'tioZe', double: true, tileId: '6-6' },
        { type: 'bonus5', by: 'player', amount: 3 },
        { type: 'bonus5', by: 'player', amount: 3 },
        { type: 'bonus5', by: 'tioZe', amount: 3 },
        { type: 'roundEnd', result: { kind: 'tranca', winner: 'player' } },
        { type: 'roundEnd', result: { kind: 'tranca', winner: 'tioZe' } },
        { type: 'roundEnd', result: { kind: 'tranca', winner: null } },
        { type: 'heartLost', who: 'player', amount: 2, reason: 'batida' },
        { type: 'heartLost', who: 'player', amount: 1, reason: 'draw' }, // comprou com coração: custo seu
        { type: 'heartLost', who: 'player', amount: 1, reason: 'rubi' },
        { type: 'heartLost', who: 'tioZe', amount: 3, reason: 'batida' },
        { type: 'duelEnd', winner: 'player', caps: 3 },
      ],
      { seed: 9, rivalId: 'neide' },
    );
    expect(s).toMatchObject({
      seed: 9,
      doublePlays: 1,
      mugginsHit: 2,
      mugginsGoldEarned: 6,
      trancaWins: 1,
      trancaLosses: 1,
      damageByRival: { neide: 3 },
      biggestRivalDamage: 'neide',
      tampinhasCollected: 3,
    });
    const more = trackRunStatsEvents([{ type: 'heartLost', who: 'player', amount: 4, reason: 'batida' }], { seed: 9, rivalId: 'arlindo' });
    expect(more.biggestRivalDamage).toBe('arlindo');
  });

  it('CONTINUAR a mesma run mantém a conta; outra semente começa do zero', () => {
    resetRunStats(9);
    trackRunStatsEvents([{ type: 'bonus5', by: 'player', amount: 3 }], { seed: 9, rivalId: 'tonho' });
    forgetRunStats(); // fechou o app
    expect(trackRunStatsEvents([{ type: 'runLoaded' }], { seed: 9 }).mugginsHit).toBe(1);
    expect(trackRunStatsEvents([{ type: 'runLoaded' }], { seed: 10 }).mugginsHit).toBe(0);
  });

  it('o resumo copiado traz desfecho, semente e os números', () => {
    const state = gameReducer(createInitialState(), { type: 'NEW_RUN', seedCode: 'BUX-9K2' });
    resetRunStats(state.seed);
    const stats = trackRunStatsEvents(
      [
        { type: 'tilePlaced', by: 'player', double: true },
        { type: 'bonus5', by: 'player', amount: 3 },
        { type: 'heartLost', who: 'player', amount: 2, reason: 'batida' },
        { type: 'duelEnd', winner: 'player', caps: 1 },
      ],
      { ...state, rivalId: 'neide' },
    );
    const text = runSummaryText({ state, stats, won: false, rivalName: 'Dona Neide', version: '0.9.2' });
    expect(text).toContain('NOCAUTEADO POR DONA NEIDE');
    expect(text).toContain('Semente: BUX-9K2');
    expect(text).toContain('Buchas jogadas: 1');
    expect(text).toContain('Múltiplos de 5 fechados: 1 (+$3)');
    expect(text).toContain('Trancas: 0 vitórias | 0 derrotas');
    expect(text).toContain('Maior algoz: Dona Neide');
    expect(text).toContain('Tampinhas: +1');
    expect(outcomeTitleOf(true)).toBe('TENTATIVA CONCLUÍDA');
  });

  it('com o jogo de verdade: a run nova zera e a mesa soma', () => {
    resetRunStats(1);
    trackRunStatsEvents([{ type: 'bonus5', by: 'player', amount: 3 }], { seed: 1 });
    const s = gameReducer(createInitialState(), { type: 'NEW_RUN', seedCode: 'NEW-RUN' });
    expect(trackRunStatsEvents(s.events, s)).toMatchObject({ seed: s.seed, mugginsHit: 0, doublePlays: 0 });
    expect(loadRunStats().seed).toBe(s.seed);
  });
});
