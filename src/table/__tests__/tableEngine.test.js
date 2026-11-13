import { describe, expect, it } from 'vitest';
import { DAMAGE, createEmptyBoard, makeTile, placeTile, SIDES } from '../../engine/dominoLogic.js';
import { botAction, countTiles, createTable, findTableOpening, handSizeFor, nextAlive, roundDeck, tableReducer, turnOptions, viewFor } from '../tableEngine.js';

const seatsOf = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `Cadeira ${i + 1}`, bot: true }));
const t = (a, b) => makeTile(a, b);
const run = (state, ...actions) => actions.reduce((s, a) => tableReducer(s, a), state);

/** Uma mesa no meio da rodada, montada à mão. */
function midRound({ n = 3, hands, board = [], boneyard = [], turn = 's0', rules, hearts = 5 }) {
  let b = createEmptyBoard();
  board.forEach(([tile, side], i) => {
    b = placeTile(b, tile, i === 0 ? SIDES.ROOT : side);
  });
  const base = createTable({ seed: 1, seats: seatsOf(n), hearts, rules });
  return { ...base, phase: 'playing', round: 1, hands, board: b, boneyard, turn };
}

/** Joga uma partida inteira só com bots; devolve o estado final e quantos passos levou. */
function playOut(seed, n, rules) {
  let s = run(createTable({ seed, seats: seatsOf(n), hearts: 3, coins: 20, rules }), { type: 'START_ROUND' });
  let steps = 0;
  while (s.phase !== 'matchOver' && steps < 5000) {
    if (s.phase === 'roundOver') s = tableReducer(s, { type: 'START_ROUND' });
    else {
      const action = botAction(s);
      const next = tableReducer(s, action);
      if (next === s) throw new Error(`ação recusada: ${JSON.stringify(action)}`);
      s = next;
    }
    if (countTiles(s) !== 28) throw new Error(`pedras somem: ${countTiles(s)}`);
    steps += 1;
  }
  return { s, steps };
}

describe('mesa de N cadeiras: montagem', () => {
  it('aceita só 2 a 5 cadeiras (versão 2.33), sem id repetido', () => {
    expect(() => createTable({ seed: 1, seats: seatsOf(1) })).toThrow();
    expect(() => createTable({ seed: 1, seats: seatsOf(6) })).toThrow();
    expect(createTable({ seed: 1, seats: seatsOf(5) }).seats).toHaveLength(5);
    expect(() => createTable({ seed: 1, seats: [{ id: 'a' }, { id: 'a' }] })).toThrow();
    expect(createTable({ seed: 1, seats: seatsOf(4) }).seats).toHaveLength(4);
  });

  it('mão de 7 com 2 e 3 jogadores; de 6 com 4 (ou 7, se a mesa pedir)', () => {
    expect(handSizeFor(2)).toBe(7);
    expect(handSizeFor(3)).toBe(7);
    expect(handSizeFor(4)).toBe(6);
    expect(handSizeFor(4, { hand4: 7 })).toBe(7);
    expect(handSizeFor(5)).toBe(5);
    expect(handSizeFor(5, { hand4: 7 })).toBe(5);
  });

  it('versão 2.33: a roda de 5 vai até o fim só com bots, sem sumir pedra', () => {
    for (const seed of [3, 17, 41]) {
      const { s } = playOut(seed, 5);
      expect(s.phase).toBe('matchOver');
    }
  });

  it('distribui pelos vivos, deixa o resto no dorme e conta 28 pedras', () => {
    for (const [n, hand, dorme] of [
      [2, 7, 14],
      [3, 7, 7],
      [4, 6, 4],
      // versão 2.33: com 5, todos com o mesmo tanto (5) e as 3 que sobram no dorme
      [5, 5, 3],
    ]) {
      const s = run(createTable({ seed: 99, seats: seatsOf(n) }), { type: 'START_ROUND' });
      expect(s.phase).toBe('playing');
      for (const seat of s.seats) expect(s.hands[seat.id]).toHaveLength(hand);
      expect(s.boneyard).toHaveLength(dorme);
      expect(countTiles(s)).toBe(28);
    }
  });

  it('a semente da mesa decide a distribuição; cada rodada embaralha de novo', () => {
    expect(roundDeck(7, 1).map((x) => x.id)).toEqual(roundDeck(7, 1).map((x) => x.id));
    expect(roundDeck(7, 1).map((x) => x.id)).not.toEqual(roundDeck(7, 2).map((x) => x.id));
    expect(roundDeck(7, 1).map((x) => x.id)).not.toEqual(roundDeck(8, 1).map((x) => x.id));
  });

  it('abre quem tem a maior bucha, e a 1ª pedra tem de ser ela', () => {
    const s = run(createTable({ seed: 5, seats: seatsOf(3) }), { type: 'START_ROUND' });
    const opening = findTableOpening(s.hands, ['s0', 's1', 's2']);
    expect(s.turn).toBe(opening.starter);
    expect(s.openingTileId).toBe(opening.tileId);
    const other = s.hands[s.turn].find((x) => x.id !== s.openingTileId);
    expect(tableReducer(s, { type: 'PLAY', seat: s.turn, tileId: other.id, side: 'root' })).toBe(s);
    const played = tableReducer(s, { type: 'PLAY', seat: s.turn, tileId: s.openingTileId, side: 'root' });
    expect(played.board.root.id).toBe(s.openingTileId);
    expect(played.turn).toBe(nextAlive(s, s.turn));
  });

  it('só a cadeira da vez joga', () => {
    const s = run(createTable({ seed: 5, seats: seatsOf(3) }), { type: 'START_ROUND' });
    const wrong = s.seats.find((x) => x.id !== s.turn).id;
    expect(tableReducer(s, { type: 'PLAY', seat: wrong, tileId: s.hands[wrong][0].id, side: 'root' })).toBe(s);
  });
});

describe('mesa de N cadeiras: compra e passe', () => {
  const hands = { s0: [t(1, 2), t(4, 4)], s1: [t(0, 0), t(5, 5)], s2: [t(2, 3), t(6, 6)] };

  it('sem jogada e com dorme: a 1ª compra é obrigatória e grátis', () => {
    const s = midRound({ hands, board: [[t(6, 5)]], boneyard: [t(3, 3), t(1, 1)] });
    expect(turnOptions(s).pass.allowed).toBe(false);
    const drew = tableReducer(s, { type: 'DRAW', seat: 's0' });
    expect(drew.hands.s0).toHaveLength(3);
    expect(drew.seats[0].coins).toBe(s.seats[0].coins);
    expect(drew.lastAction.s0).toEqual({ kind: 'draw', count: 1 });
  });

  it('a 2ª compra custa $3 e a 3ª, 1 coração; depois de comprar o passe é grátis', () => {
    let s = midRound({ hands, board: [[t(6, 5)]], boneyard: [t(3, 3), t(1, 1), t(0, 1), t(0, 2)] });
    s = run(s, { type: 'DRAW', seat: 's0' }, { type: 'DRAW', seat: 's0' });
    expect(s.seats[0].coins).toBe(97);
    s = tableReducer(s, { type: 'DRAW', seat: 's0' });
    expect(s.seats[0].hearts).toBe(4);
    expect(turnOptions(s).draw.allowed).toBe(false);
    expect(turnOptions(s).pass).toMatchObject({ allowed: true, cost: 0 });
    s = tableReducer(s, { type: 'PASS', seat: 's0' });
    expect(s.turn).toBe('s1');
  });

  it('passar podendo jogar custa $3', () => {
    const s = midRound({ hands: { ...hands, s0: [t(5, 1), t(4, 4)] }, board: [[t(6, 5)]], boneyard: [t(3, 3)] });
    const passed = tableReducer(s, { type: 'PASS', seat: 's0' });
    expect(passed.seats[0].coins).toBe(97);
    expect(passed.lastAction.s0).toEqual({ kind: 'pass', cost: 3 });
  });

  it('uma volta inteira de passes fecha a rodada em tranca', () => {
    let s = midRound({ hands, board: [[t(6, 5)]], boneyard: [] });
    s = run(s, { type: 'PASS', seat: 's0' }, { type: 'PASS', seat: 's1' });
    expect(s.phase).toBe('playing');
    s = tableReducer(s, { type: 'PASS', seat: 's2' });
    expect(s.phase).toBe('roundOver');
    expect(s.result.kind).toBe('tranca');
  });

  it('múltiplo de 5 não paga nada na mesa (versão 2.22)', () => {
    // a raiz [5|6] deixa a ponta 5 na esquerda; o [4|5] ali deixa 4 e 6 = 10
    const s = midRound({ hands: { ...hands, s0: [t(5, 4), t(4, 4)] }, board: [[t(6, 5)]] });
    const played = tableReducer(s, { type: 'PLAY', seat: 's0', tileId: '4-5', side: 'left' });
    expect(played.seats[0].coins).toBe(100);
    expect(played.events.some((e) => e.type === 'five')).toBe(false);
  });
});

describe('mesa de N cadeiras: dano, eliminação e vitória', () => {
  it('batida: cada um dos outros vivos leva o dano da batida', () => {
    const s = midRound({ hands: { s0: [t(5, 3)], s1: [t(0, 0)], s2: [t(6, 6), t(4, 4)] }, board: [[t(6, 5)]] });
    const done = tableReducer(s, { type: 'PLAY', seat: 's0', tileId: '3-5', side: 'left' });
    expect(done.phase).toBe('roundOver');
    expect(done.result).toMatchObject({ kind: 'batida', batida: 'normal', by: 's0' });
    expect(done.result.damage).toEqual({ s1: DAMAGE.normal, s2: DAMAGE.normal });
    expect(done.seats.map((x) => x.hearts)).toEqual([5, 4, 4]);
    expect(done.nextStarter).toBe('s0');
  });

  it('batida cruzada tira 3 de cada um', () => {
    const s = midRound({ hands: { s0: [t(6, 5)], s1: [t(0, 0)], s2: [t(1, 1)] }, board: [[t(6, 2)], [t(2, 5), 'left']] });
    const done = tableReducer(s, { type: 'PLAY', seat: 's0', tileId: '5-6', side: 'left' });
    expect(done.result.batida).toBe('cruzada');
    expect(done.seats.map((x) => x.hearts)).toEqual([5, 2, 2]);
  });

  it('regra "pesada": só a mão mais pesada leva', () => {
    const s = midRound({ rules: { batida: 'pesada' }, hands: { s0: [t(5, 3)], s1: [t(0, 0)], s2: [t(6, 6)] }, board: [[t(6, 5)]] });
    const done = tableReducer(s, { type: 'PLAY', seat: 's0', tileId: '3-5', side: 'left' });
    expect(done.result.damage).toEqual({ s2: DAMAGE.normal });
  });

  it('tranca: a menor soma escapa, os outros levam 1; empate geral não fere ninguém', () => {
    const s = midRound({ hands: { s0: [t(1, 1)], s1: [t(0, 0), t(4, 4)], s2: [t(2, 2)] }, board: [[t(6, 5)]] });
    const done = run(s, { type: 'PASS', seat: 's0' }, { type: 'PASS', seat: 's1' }, { type: 'PASS', seat: 's2' });
    expect(done.result.spared).toEqual(['s0']);
    expect(done.result.damage).toEqual({ s1: 1, s2: 1 });
    expect(done.nextStarter).toBe('s0');
    // as três mãos somam 3
    const tie = midRound({ hands: { s0: [t(0, 3)], s1: [t(1, 2)], s2: [t(0, 0), t(0, 1), t(0, 2)] }, board: [[t(6, 5)]] });
    const even = run(tie, { type: 'PASS', seat: 's0' }, { type: 'PASS', seat: 's1' }, { type: 'PASS', seat: 's2' });
    expect(even.result.damage).toEqual({});
    expect(even.nextStarter).toBe(null);
  });

  it('quem zera sai, a vez pula a cadeira e o último vivo vence', () => {
    const s = midRound({ hearts: 1, hands: { s0: [t(5, 3)], s1: [t(0, 0), t(1, 1)], s2: [t(6, 6)] }, board: [[t(6, 5)]] });
    const done = tableReducer(s, { type: 'PLAY', seat: 's0', tileId: '3-5', side: 'left' });
    expect(done.phase).toBe('matchOver');
    expect(done.winner).toBe('s0');
    // s2 (mão 12) e s1 (mão 2) saem juntos; a mão mais leve fica à frente
    expect(done.seats.map((x) => x.place)).toEqual([1, 2, 3]);
  });

  it('com 4 cadeiras, quem saiu não recebe pedras e a vez pula', () => {
    let s = createTable({ seed: 3, seats: seatsOf(4) });
    s = { ...s, phase: 'roundOver', seats: s.seats.map((x) => (x.id === 's1' ? { ...x, alive: false, hearts: 0, place: 4 } : x)) };
    s = tableReducer(s, { type: 'START_ROUND' });
    expect(s.hands.s1).toHaveLength(0);
    expect(s.hands.s0).toHaveLength(7); // três vivos: mão de 7
    expect(nextAlive(s, 's0')).toBe('s2');
    expect(nextAlive(s, 's3')).toBe('s0');
  });

  it('W.O.: a cadeira sai, a vez segue e, se sobrar um, ele vence', () => {
    let s = run(createTable({ seed: 11, seats: seatsOf(3) }), { type: 'START_ROUND' });
    const who = s.turn;
    s = tableReducer(s, { type: 'FORFEIT', seat: who });
    expect(s.seats.find((x) => x.id === who)).toMatchObject({ alive: false, hearts: 0, place: 3 });
    expect(s.turn).not.toBe(who);
    const next = s.seats.find((x) => x.alive && x.id !== s.turn).id;
    s = tableReducer(s, { type: 'FORFEIT', seat: next });
    expect(s.phase).toBe('matchOver');
    expect(s.winner).toBe(s.seats.find((x) => x.alive).id);
  });
});

describe('mesa de N cadeiras: espelho e bots', () => {
  it('o espelho mostra só a própria mão, o número das outras e esconde dorme e semente', () => {
    const s = run(createTable({ seed: 21, seats: seatsOf(4) }), { type: 'START_ROUND' });
    const v = viewFor(s, 's2');
    expect(Object.keys(v.hands)).toEqual(['s2']);
    expect(v.handCounts).toEqual({ s0: 6, s1: 6, s2: 6, s3: 6 });
    expect(v.boneyardCount).toBe(4);
    expect(v).not.toHaveProperty('boneyard');
    expect(v).not.toHaveProperty('seed');
    // a pedra de abertura é pública (quem tem a maior bucha abre com ela); o resto, não
    const { events, openingTileId, ...plain } = v;
    void events;
    const others = ['s0', 's1', 's3'].flatMap((id) => s.hands[id].map((x) => x.id)).filter((id) => id !== openingTileId);
    expect(others.some((id) => JSON.stringify(plain).includes(`"${id}"`))).toBe(false);
  });

  it('1.200 partidas de bots com 2, 3 e 4 cadeiras terminam com um vencedor', () => {
    let seeds = 0;
    for (const n of [2, 3, 4]) {
      for (let seed = 1; seed <= 400; seed += 1) {
        const { s } = playOut(seed * 7 + n, n, seed % 2 ? {} : { batida: 'pesada' });
        expect(s.phase).toBe('matchOver');
        const winners = s.seats.filter((x) => x.place === 1);
        expect(winners).toHaveLength(1);
        expect(winners[0].id).toBe(s.winner);
        expect(s.seats.every((x) => x.hearts >= 0 && x.place >= 1 && x.place <= n)).toBe(true);
        seeds += 1;
      }
    }
    expect(seeds).toBe(1200);
  });

  it('a mesma semente joga a mesma partida', () => {
    const a = playOut(1234, 4).s;
    const b = playOut(1234, 4).s;
    expect(a.seq).toBe(b.seq);
    expect(a.seats).toEqual(b.seats);
  });
});
