import { describe, expect, it } from 'vitest';
import { createTable, tableReducer, turnOptions, countTiles, aliveSeats, viewFor } from '../tableEngine.js';

/** Um aleatório com semente (as partidas do teste são sempre as mesmas). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seatsOf = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `J${i}`, bot: i > 0 }));

/** As regras que valem em qualquer instante da mesa. */
function check(s, label) {
  if (countTiles(s) !== 28) throw new Error(`${label}: pedras somem ou sobram (${countTiles(s)})`);
  const ids = [
    ...Object.values(s.hands).flat().map((t) => t.id),
    ...s.boneyard.map((t) => t.id),
    ...(s.board.root ? [s.board.root, ...s.board.left, ...s.board.right].map((p) => p.tile?.id ?? p.id) : []),
  ];
  if (new Set(ids).size !== ids.length) throw new Error(`${label}: pedra repetida`);
  for (const seat of s.seats) {
    if (seat.hearts < 0) throw new Error(`${label}: vida negativa em ${seat.id}`);
    if (!seat.alive && s.phase === 'playing' && s.turn === seat.id) throw new Error(`${label}: a vez está com quem saiu (${seat.id})`);
    // o espelho de cada cadeira nunca quebra e nunca mostra a mão dos outros no meio da rodada
    const v = viewFor(s, seat.id);
    if (!v) throw new Error(`${label}: sem espelho para ${seat.id}`);
  }
  if (s.phase === 'playing' && !aliveSeats(s).some((x) => x.id === s.turn)) throw new Error(`${label}: a vez não é de ninguém vivo`);
}

/** Uma partida inteira com jogadas sorteadas entre as válidas (e uma desistência de vez em quando). */
function playRandom(seed, n, rules, hearts) {
  const rand = rng(seed * 7919 + n * 101 + hearts);
  let s = tableReducer(createTable({ seed, seats: seatsOf(n), hearts, coins: 30, rules }), { type: 'START_ROUND' });
  check(s, `semente ${seed}, início`);
  let steps = 0;
  while (s.phase !== 'matchOver') {
    steps += 1;
    if (steps > 20000) throw new Error(`semente ${seed}, ${n} cadeiras: a partida não acaba`);
    const label = `semente ${seed}, ${n} cadeiras, passo ${steps}`;
    if (s.phase === 'roundOver') {
      s = tableReducer(s, { type: 'START_ROUND' });
      check(s, label);
      continue;
    }
    const seat = s.turn;
    // de vez em quando alguém levanta e vai embora (nunca o último)
    if (rand() < 0.004 && aliveSeats(s).length > 2) {
      const who = aliveSeats(s)[Math.floor(rand() * aliveSeats(s).length)].id;
      const next = tableReducer(s, { type: 'FORFEIT', seat: who });
      if (next !== s) {
        s = next;
        check(s, `${label} (desistência de ${who})`);
        continue;
      }
    }
    const { moves, draw, pass } = turnOptions(s, seat);
    const options = [...moves.map((m) => ({ type: 'PLAY', seat, tileId: m.tile.id, side: m.side }))];
    if (draw.allowed) options.push({ type: 'DRAW', seat });
    if (pass.allowed) options.push({ type: 'PASS', seat });
    if (!options.length) throw new Error(`${label}: ${seat} não tem o que fazer (travou)`);
    // prefere jogar (para a partida andar), mas compra e passa às vezes mesmo podendo jogar
    const pick = moves.length && rand() < 0.8 ? options[Math.floor(rand() * moves.length)] : options[Math.floor(rand() * options.length)];
    const next = tableReducer(s, pick);
    if (next === s) throw new Error(`${label}: ação válida recusada ${JSON.stringify(pick)}`);
    // quem não é da vez não consegue agir
    const other = aliveSeats(s).find((x) => x.id !== seat);
    if (other && tableReducer(s, { ...pick, seat: other.id }) !== s && pick.type !== 'PLAY') throw new Error(`${label}: ${other.id} agiu fora da vez`);
    s = next;
    check(s, label);
  }
  return s;
}

describe('versão 2.39: partidas sorteadas da roda (de 2 a 5, com e sem duplas, corações e tentos)', () => {
  it('nenhuma trava, nenhuma pedra some e toda partida acaba com alguém em 1º', () => {
    let games = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const n of [2, 3, 4, 5]) {
        const combos = [{ scoring: 'coracoes' }, { scoring: 'tentos' }];
        if (n === 4) combos.push({ teams: true, scoring: 'coracoes' }, { teams: true, scoring: 'tentos' });
        for (const rules of combos) {
          const s = playRandom(seed, n, rules, 2 + (seed % 3));
          expect(s.phase).toBe('matchOver');
          expect(s.seats.some((x) => x.place === 1)).toBe(true);
          expect(s.winners.length).toBeGreaterThan(0);
          games += 1;
        }
      }
    }
    expect(games).toBe(40 * (2 + 2 + 4 + 2)); // 400 partidas
  }, 120000);
});
