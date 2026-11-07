import { describe, expect, it } from 'vitest';
import { DAMAGE, SIDES, createEmptyBoard, makeTile, placeTile } from '../../engine/dominoLogic.js';
import { botAction, countTiles, createTable, matesOf, partnerOf, tableReducer, turnOptions, viewFor } from '../tableEngine.js';
import { DEFAULT_TABLE_CONFIG, TABLE_PROTOCOL, sanitizeTableConfig } from '../tableProtocol.js';

const seatsOf = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `Cadeira ${i + 1}`, bot: true }));
const t = (a, b) => makeTile(a, b);
const run = (state, ...actions) => actions.reduce((s, a) => tableReducer(s, a), state);

/** Uma mesa no meio da rodada, montada à mão. */
function midRound({ n = 4, hands, board = [], boneyard = [], turn = 's0', rules, hearts = 5 }) {
  let b = createEmptyBoard();
  board.forEach(([tile, side], i) => {
    b = placeTile(b, tile, i === 0 ? SIDES.ROOT : side);
  });
  const base = createTable({ seed: 1, seats: seatsOf(n), hearts, rules });
  return { ...base, phase: 'playing', round: 1, hands, board: b, boneyard, turn };
}

/** Joga uma partida inteira só com bots. */
function playOut(seed, n, rules, hearts = 3) {
  let s = run(createTable({ seed, seats: seatsOf(n), hearts, coins: 20, rules }), { type: 'START_ROUND' });
  let steps = 0;
  while (s.phase !== 'matchOver' && steps < 8000) {
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
  return s;
}

const hearts = (s) => Object.fromEntries(s.seats.map((x) => [x.id, x.hearts]));
const tentos = (s) => Object.fromEntries(s.seats.map((x) => [x.id, x.tentos]));

// uma batida pronta: s0 tem só o 6|4 e a ponta da direita é 4
const BATIDA = {
  hands: { s0: [t(6, 4)], s1: [t(0, 1), t(0, 2)], s2: [t(1, 1), t(2, 3)], s3: [t(5, 5), t(3, 3)] },
  board: [[t(2, 4), null]],
};

describe('versão 2.7: duplas', () => {
  it('as duplas: a 1ª e a 3ª cadeira contra a 2ª e a 4ª (só com 4 cadeiras)', () => {
    const s = createTable({ seed: 1, seats: seatsOf(4), rules: { teams: true } });
    expect(s.seats.map((x) => x.team)).toEqual(['A', 'B', 'A', 'B']);
    expect(partnerOf(s, 's0')).toBe('s2');
    expect(partnerOf(s, 's3')).toBe('s1');
    expect(matesOf(s, 's1').sort()).toEqual(['s1', 's3']);
    // com 3 cadeiras não tem dupla
    const three = createTable({ seed: 1, seats: seatsOf(3), rules: { teams: true } });
    expect(three.rules.teams).toBe(false);
    expect(three.seats.every((x) => x.team === null)).toBe(true);
  });

  it('se você bate, a sua dupla vence e a outra dupla inteira leva o dano', () => {
    const s = midRound({ ...BATIDA, rules: { teams: true } });
    const after = run(s, { type: 'PLAY', seat: 's0', tileId: '4-6', side: 'right' });
    expect(after.phase).toBe('roundOver');
    expect(after.result.winners.sort()).toEqual(['s0', 's2']);
    expect(after.result.team).toBe('A');
    expect(hearts(after)).toEqual({ s0: 5, s1: 5 - DAMAGE.normal, s2: 5, s3: 5 - DAMAGE.normal });
    // quem bateu abre a próxima
    expect(after.nextStarter).toBe('s0');
  });

  it('se o parceiro bate, você vence junto (e não sangra)', () => {
    const s = midRound({ ...BATIDA, hands: { ...BATIDA.hands, s0: [t(0, 0), t(1, 5)], s2: [t(6, 4)] }, turn: 's2', rules: { teams: true } });
    const after = run(s, { type: 'PLAY', seat: 's2', tileId: '4-6', side: 'right' });
    expect(after.result.winners.sort()).toEqual(['s0', 's2']);
    expect(hearts(after).s0).toBe(5);
    expect(hearts(after).s1).toBe(4);
  });

  it('na tranca vence a dupla com a menor soma das duas mãos (mesmo sem a menor mão sozinha)', () => {
    // A: 0|1 (1) + 6|6 (12) = 13 · B: 0|2 (2) + 2|3 (5) = 7 → B vence, embora s0 tenha a menor mão
    const s = midRound({
      hands: { s0: [t(0, 1)], s1: [t(0, 2)], s2: [t(6, 6)], s3: [t(2, 3)] },
      board: [[t(4, 4), null]],
      rules: { teams: true },
    });
    const locked = run(s, { type: 'PASS', seat: 's0' }, { type: 'PASS', seat: 's1' }, { type: 'PASS', seat: 's2' }, { type: 'PASS', seat: 's3' });
    expect(locked.phase).toBe('roundOver');
    expect(locked.result.kind).toBe('tranca');
    expect(locked.result.team).toBe('B');
    expect(hearts(locked)).toEqual({ s0: 4, s1: 5, s2: 4, s3: 5 });
    // abre a próxima a mão mais leve da dupla vencedora
    expect(locked.nextStarter).toBe('s1');
  });

  it('tranca com as duplas empatadas: ninguém sangra', () => {
    const s = midRound({
      // A: 0|1 + 1|1 = 3 · B: 0|3 + 0|0 = 3
      hands: { s0: [t(0, 1)], s1: [t(0, 3)], s2: [t(1, 1)], s3: [t(0, 0)] },
      board: [[t(4, 4), null]],
      rules: { teams: true },
    });
    const locked = run(s, { type: 'PASS', seat: 's0' }, { type: 'PASS', seat: 's1' }, { type: 'PASS', seat: 's2' }, { type: 'PASS', seat: 's3' });
    expect(locked.result.winners).toEqual([]);
    expect(Object.values(hearts(locked))).toEqual([5, 5, 5, 5]);
  });

  it('a vida é da dupla: zerou, os dois saem e a outra dupla vence a partida', () => {
    const s = { ...midRound({ ...BATIDA, rules: { teams: true }, hearts: 1 }) };
    const after = run(s, { type: 'PLAY', seat: 's0', tileId: '4-6', side: 'right' });
    expect(after.phase).toBe('matchOver');
    expect(after.winners.sort()).toEqual(['s0', 's2']);
    expect(after.seats.map((x) => x.place)).toEqual([1, 2, 1, 2]);
    expect(after.events.find((e) => e.type === 'matchOver').team).toBe('A');
  });

  it('a 3ª compra paga com coração tira da dupla inteira', () => {
    const s = midRound({
      hands: { s0: [t(0, 0)], s1: [t(1, 1)], s2: [t(2, 2)], s3: [t(3, 3)] },
      board: [[t(6, 6), null]],
      boneyard: [t(0, 5), t(1, 5), t(2, 5), t(3, 5)],
      rules: { teams: true },
    });
    const third = run({ ...s, seats: s.seats.map((x) => ({ ...x, coins: 20 })) }, { type: 'DRAW', seat: 's0' }, { type: 'DRAW', seat: 's0' }, { type: 'DRAW', seat: 's0' });
    expect(third.drawsThisTurn).toBe(3);
    expect(hearts(third)).toEqual({ s0: 4, s1: 5, s2: 4, s3: 5 });
  });

  it('W.O. nas duplas: o parceiro segue sozinho; a dupla só sai quando os dois saem', () => {
    const s = midRound({ ...BATIDA, turn: 's1', rules: { teams: true } });
    const one = run(s, { type: 'FORFEIT', seat: 's2' });
    expect(one.phase).toBe('playing');
    expect(one.seats.find((x) => x.id === 's0').alive).toBe(true);
    const both = run(one, { type: 'FORFEIT', seat: 's0' });
    expect(both.phase).toBe('matchOver');
    expect(both.winners.sort()).toEqual(['s1', 's3']);
  });

  it('partidas inteiras com bots em duplas terminam, com uma dupla inteira no 1º lugar', () => {
    for (const seed of [3, 17, 44]) {
      for (const scoring of ['coracoes', 'tentos']) {
        const s = playOut(seed, 4, { teams: true, scoring });
        expect(s.phase).toBe('matchOver');
        const first = s.seats.filter((x) => x.place === 1);
        expect(first).toHaveLength(2);
        expect(first[0].team).toBe(first[1].team);
        expect(s.winners.sort()).toEqual(first.map((x) => x.id).sort());
      }
    }
  });
});

describe('versão 2.7: tentos no lugar dos corações', () => {
  it('ninguém sangra: quem bate leva 1 tento (a tampinha), qualquer que seja a batida', () => {
    const s = midRound({ ...BATIDA, n: 4, rules: { scoring: 'tentos' }, hearts: 5 });
    const after = run(s, { type: 'PLAY', seat: 's0', tileId: '4-6', side: 'right' });
    expect(after.result.damage).toEqual({});
    expect(tentos(after)).toEqual({ s0: 1, s1: 0, s2: 0, s3: 0 });
    expect(after.events.filter((e) => e.type === 'tento').map((e) => e.who)).toEqual(['s0']);
    expect(after.target).toBe(5);
  });

  it('em dupla, a vitória dá 1 tento para a dupla (os dois sobem juntos)', () => {
    const s = midRound({ ...BATIDA, rules: { scoring: 'tentos', teams: true } });
    const after = run(s, { type: 'PLAY', seat: 's0', tileId: '4-6', side: 'right' });
    expect(tentos(after)).toEqual({ s0: 1, s1: 0, s2: 1, s3: 0 });
  });

  it('na tranca, o tento vai para a menor soma; empate geral, para ninguém', () => {
    const s = midRound({ n: 3, hands: { s0: [t(0, 1)], s1: [t(0, 2)], s2: [t(6, 6)] }, board: [[t(4, 4), null]], rules: { scoring: 'tentos' } });
    const locked = run(s, { type: 'PASS', seat: 's0' }, { type: 'PASS', seat: 's1' }, { type: 'PASS', seat: 's2' });
    expect(tentos(locked)).toEqual({ s0: 1, s1: 0, s2: 0 });
  });

  it('quem chega primeiro à meta vence a partida; o pódio segue os tentos', () => {
    const base = midRound({ ...BATIDA, rules: { scoring: 'tentos' }, hearts: 3 });
    const s = { ...base, seats: base.seats.map((x, i) => ({ ...x, tentos: [2, 1, 2, 0][i] })) };
    const after = run(s, { type: 'PLAY', seat: 's0', tileId: '4-6', side: 'right' });
    expect(after.phase).toBe('matchOver');
    expect(after.winners).toEqual(['s0']);
    expect(after.seats.map((x) => x.place)).toEqual([1, 3, 2, 4]);
  });

  it('a 3ª compra custa 1 tento (sem tento, não compra)', () => {
    const base = midRound({
      n: 2,
      hands: { s0: [t(0, 0)], s1: [t(1, 1)] },
      board: [[t(6, 6), null]],
      boneyard: [t(0, 5), t(1, 5), t(2, 5), t(3, 5)],
      rules: { scoring: 'tentos' },
    });
    const broke = run(base, { type: 'DRAW', seat: 's0' }, { type: 'DRAW', seat: 's0' });
    expect(turnOptions(broke, 's0').draw).toMatchObject({ allowed: false, reason: 'tentos', cost: { type: 'tento', amount: 1 } });
    const rich = { ...broke, seats: broke.seats.map((x) => (x.id === 's0' ? { ...x, tentos: 2 } : x)) };
    expect(turnOptions(rich, 's0').draw).toMatchObject({ allowed: true, cost: { type: 'tento', amount: 1 } });
    expect(tentos(run(rich, { type: 'DRAW', seat: 's0' })).s0).toBe(1);
  });

  it('o espelho de cada cadeira leva as duplas e os tentos (o HUD precisa)', () => {
    const s = run(createTable({ seed: 9, seats: seatsOf(4), hearts: 5, rules: { teams: true, scoring: 'tentos' } }), { type: 'START_ROUND' });
    const v = viewFor(s, 's1');
    expect(v.rules).toMatchObject({ teams: true, scoring: 'tentos' });
    expect(v.target).toBe(5);
    expect(v.seats.map((x) => [x.team, x.tentos])).toEqual([
      ['A', 0],
      ['B', 0],
      ['A', 0],
      ['B', 0],
    ]);
  });

  it('partidas com bots por tentos terminam com alguém na meta', () => {
    for (const seed of [5, 21]) {
      for (const n of [2, 3, 4]) {
        const s = playOut(seed, n, { scoring: 'tentos' }, 3);
        expect(s.phase).toBe('matchOver');
        expect(Math.max(...s.seats.map((x) => x.tentos))).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('versão 2.7: as regras na rede', () => {
  it('protocolo 2: as mesas de antes não sentam com as novas', () => {
    expect(TABLE_PROTOCOL).toBe(2);
  });

  it('duplas só com 4 cadeiras; contagem por corações ou tentos', () => {
    expect(DEFAULT_TABLE_CONFIG).toMatchObject({ teams: false, scoring: 'coracoes' });
    expect(sanitizeTableConfig({ seats: 4, teams: true, scoring: 'tentos' })).toMatchObject({ seats: 4, teams: true, scoring: 'tentos' });
    expect(sanitizeTableConfig({ seats: 3, teams: true })).toMatchObject({ seats: 3, teams: false });
    expect(sanitizeTableConfig({ seats: 4, teams: 'sim', scoring: 'pontos' })).toMatchObject({ teams: false, scoring: 'coracoes' });
  });
});
