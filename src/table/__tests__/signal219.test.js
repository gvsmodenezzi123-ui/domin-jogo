import { describe, expect, it } from 'vitest';
import { SIDES, createEmptyBoard, makeTile, placeTile } from '../../engine/dominoLogic.js';
import { botAction, createTable, partnerOf, tableReducer, viewFor } from '../tableEngine.js';
import { validateTableMessage, makeTableMessage, TMSG } from '../tableProtocol.js';

const seatsOf = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `Cadeira ${i + 1}`, bot: true }));
const t = (a, b) => makeTile(a, b);

function duplas() {
  const base = createTable({ seed: 1, seats: seatsOf(4), hearts: 5, rules: { teams: true } });
  const board = placeTile(createEmptyBoard(), t(6, 6), SIDES.ROOT);
  const hands = { s0: [t(6, 1), t(2, 3)], s1: [t(0, 1), t(4, 4)], s2: [t(6, 2), t(6, 5), t(1, 1)], s3: [t(3, 3), t(0, 2)] };
  return { ...base, phase: 'playing', round: 1, hands, board, boneyard: [], turn: 's1' };
}

describe('versão 2.19: ver a mão do parceiro e o sinal da dupla', () => {
  it('nas duplas você vê a mão do parceiro (e só a dele)', () => {
    const s = duplas();
    const mate = partnerOf(s, 's0');
    const view = viewFor(s, 's0');
    expect(Object.keys(view.hands).sort()).toEqual(['s0', mate].sort());
    expect(view.hands[mate]).toEqual(s.hands[mate]);
    // sem duplas, nada vaza
    const solo = { ...s, rules: { ...s.rules, teams: false } };
    expect(Object.keys(viewFor(solo, 's0').hands)).toEqual(['s0']);
  });

  it('marcar uma pedra do parceiro: ele vê o sinal, os adversários não; marcar de novo tira', () => {
    const s = duplas();
    const mate = partnerOf(s, 's0');
    const tile = s.hands[mate][1];
    const a = tableReducer(s, { type: 'SIGNAL', seat: 's0', tileId: tile.id });
    expect(a.signals[mate]).toBe(tile.id);
    expect(a.turn).toBe(s.turn);
    expect(viewFor(a, mate).signals[mate]).toBe(tile.id);
    expect(viewFor(a, 's0').signals[mate]).toBe(tile.id);
    const foe = s.seats.find((x) => x.id !== 's0' && x.id !== mate).id;
    expect(viewFor(a, foe).signals).toEqual({});
    // pedra que não é da mão do parceiro não marca; a mesma de novo desmarca
    expect(tableReducer(s, { type: 'SIGNAL', seat: 's0', tileId: s.hands[foe][0].id })).toBe(s);
    expect(tableReducer(a, { type: 'SIGNAL', seat: 's0', tileId: tile.id }).signals).toEqual({});
    // sem duplas a ação não existe
    expect(tableReducer({ ...s, rules: { ...s.rules, teams: false } }, { type: 'SIGNAL', seat: 's0', tileId: tile.id }).signals).toBeUndefined();
  });

  it('o bot parceiro joga a pedra pedida quando ela encaixa, e o sinal some quando ela sai da mão', () => {
    const s = duplas();
    const mate = partnerOf(s, 's0');
    const asked = s.hands[mate].find((x) => x.a === 6 || x.b === 6) ?? s.hands[mate][0];
    const marked = { ...tableReducer(s, { type: 'SIGNAL', seat: 's0', tileId: asked.id }), turn: mate };
    const action = botAction(marked, mate);
    if (asked.a === 6 || asked.b === 6) {
      expect(action).toMatchObject({ type: 'PLAY', tileId: asked.id });
      const after = tableReducer(marked, action);
      expect(after.signals?.[mate]).toBeUndefined();
    }
  });

  it('a rede aceita o sinal como intenção', () => {
    const ok = validateTableMessage(makeTableMessage(TMSG.INTENT, { action: { type: 'SIGNAL', tileId: '6-5' } }));
    expect(ok).toBeTruthy();
  });
});
