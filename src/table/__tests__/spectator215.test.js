import { describe, expect, it } from 'vitest';
import { botAction, createTable, partnerOf, tableReducer, viewFor, watchableFor } from '../tableEngine.js';
import { seatsFrom } from '../seats.js';

const seatsOf = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    name: `Cadeira ${i + 1}`,
    bot: true,
  }));
const run = (state, ...actions) => actions.reduce((s, a) => tableReducer(s, a), state);

describe('versão 2.15: quem sai da roda assiste', () => {
  it('quem caiu vê a mão de todos que continuam; quem joga segue vendo só a sua', () => {
    const s = run(createTable({ seed: 21, seats: seatsOf(4) }), { type: 'START_ROUND' }, { type: 'FORFEIT', seat: 's1' });
    expect(s.phase).toBe('playing');
    const out = viewFor(s, 's1');
    expect(out.watch).toEqual(['s0', 's2', 's3']);
    for (const id of out.watch) expect(out.hands[id]).toEqual(s.hands[id]);
    const live = viewFor(s, 's0');
    expect(live.watch).toEqual([]);
    expect(Object.keys(live.hands)).toEqual(['s0']);
    // a roda vista de quem você assiste começa nele e pula quem saiu
    const ring = seatsFrom(out.seats, 's2')
      .filter((x) => out.watch.includes(x.id))
      .map((x) => x.id);
    expect(ring).toEqual(['s2', 's3', 's0']);
  });

  it('nas duplas, com o parceiro ainda na mesa, você só assiste a ele', () => {
    const s = run(createTable({ seed: 8, seats: seatsOf(4), rules: { teams: true } }), { type: 'START_ROUND' }, { type: 'FORFEIT', seat: 's0' });
    const mate = partnerOf(s, 's0');
    const v = viewFor(s, 's0');
    expect(v.watch).toEqual([mate]);
    expect(Object.keys(v.hands).sort()).toEqual(['s0', mate].sort());
  });

  it('a rodada em que você cai termina na sua cadeira; a seguinte já é assistida; no fim, ninguém assiste', () => {
    let checked = 0;
    for (const seed of [4, 5, 6, 7, 8, 9]) {
      let s = run(createTable({ seed, seats: seatsOf(4), hearts: 2, coins: 20 }), { type: 'START_ROUND' });
      for (let steps = 0; s.phase !== 'matchOver' && steps < 5000; steps += 1) {
        for (const seat of s.seats) {
          const w = watchableFor(s, seat.id);
          if (seat.alive) expect(w).toEqual([]);
          else if (s.phase === 'roundOver' && s.events.some((e) => e.type === 'eliminated' && e.who === seat.id)) expect(w).toEqual([]);
          else {
            expect(w).toEqual(s.seats.filter((x) => x.alive).map((x) => x.id));
            checked += 1;
          }
        }
        s = s.phase === 'roundOver' ? tableReducer(s, { type: 'START_ROUND' }) : tableReducer(s, botAction(s));
      }
      expect(s.phase).toBe('matchOver');
      for (const seat of s.seats) expect(viewFor(s, seat.id).watch).toEqual([]);
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('versão 2.15: quem ia abrir sai antes da 1ª pedra', () => {
  it('a abertura passa para a maior pedra de quem ficou e a mesa segue', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let s = run(createTable({ seed, seats: seatsOf(4) }), { type: 'START_ROUND' });
      const opener = s.turn;
      s = tableReducer(s, { type: 'FORFEIT', seat: opener });
      expect(s.phase).toBe('playing');
      expect(s.turn).not.toBe(opener);
      expect(s.hands[s.turn].some((t) => t.id === s.openingTileId)).toBe(true);
      const action = botAction(s);
      expect(action?.type).toBe('PLAY');
      expect(tableReducer(s, action).board.root).toBeTruthy();
    }
  });
});
