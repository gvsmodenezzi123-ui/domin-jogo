import { describe, expect, it } from 'vitest';
import { FULL_SET } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';

const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const duel = () => act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), seed: 7 });

describe('versão 2.38.1: o painel DEV tira vida de você', () => {
  it('−1 VIDA EM VOCÊ: um coração a menos, com o evento do golpe (a piscada)', () => {
    const s = duel();
    const hit = act(s, 'DEV', { op: 'damagePlayer' });
    expect(hit.hearts.player).toBe(s.hearts.player - 1);
    expect(hit.phase).toBe('playing');
    expect(hit.events.some((e) => e.type === 'heartLost' && e.who === 'player' && e.reason === 'dev')).toBe(true);
  });

  it('SE MATAR: zera as vidas e a run acaba (a tela quebrando)', () => {
    const dead = act(duel(), 'DEV', { op: 'killPlayer' });
    expect(dead.hearts.player).toBe(0);
    expect(dead.phase).toBe('gameOver');
  });

  it('fora da rodada não faz nada', () => {
    const s = createInitialState();
    expect(act(s, 'DEV', { op: 'killPlayer' })).toBe(s);
  });
});
