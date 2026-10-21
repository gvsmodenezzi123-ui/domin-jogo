import { describe, expect, it } from 'vitest';
import {
  DAMAGE,
  FULL_SET,
  TOTAL_PIPS,
  classifyBatida,
  createDoubleSixSet,
  createEmptyBoard,
  createSeededRng,
  dealFromDeck,
  endsSum,
  findOpening,
  getDrawAvailability,
  getDrawCost,
  getOpenEnds,
  getPlayableMoves,
  getTrancaReason,
  getValidSides,
  isMultipleOfFive,
  isTrancaFechada,
  makeTile,
  orientTile,
  placeTile,
  resolveTranca,
  shuffle,
} from '../dominoLogic.js';

const t = (a, b) => makeTile(a, b);

function buildBoard(root, moves) {
  let board = placeTile(createEmptyBoard(), root, 'root');
  for (const [tile, side] of moves) board = placeTile(board, tile, side);
  return board;
}

describe('conjunto de pedras', () => {
  it('gera 28 pedras únicas com 7 buchas e 168 pontos', () => {
    const set = createDoubleSixSet();
    expect(set).toHaveLength(28);
    expect(new Set(set.map((x) => x.id)).size).toBe(28);
    expect(set.filter((x) => x.a === x.b)).toHaveLength(7);
    expect(TOTAL_PIPS).toBe(168);
    for (let v = 0; v <= 6; v += 1) {
      expect(set.filter((x) => x.a === v || x.b === v)).toHaveLength(7);
    }
  });

  it('embaralha sem perder pedras e sem mexer no original', () => {
    const original = createDoubleSixSet();
    const copy = original.slice();
    const shuffled = shuffle(original, createSeededRng(42));
    expect(original).toEqual(copy);
    expect(shuffled.map((x) => x.id).sort()).toEqual(copy.map((x) => x.id).sort());
    expect(shuffled.map((x) => x.id)).not.toEqual(copy.map((x) => x.id));
  });

  it('distribui 7 + 7 e deixa 14 no dorme', () => {
    const { hands, boneyard } = dealFromDeck(shuffle(FULL_SET, createSeededRng(1)));
    expect(hands.player).toHaveLength(7);
    expect(hands.tioZe).toHaveLength(7);
    expect(boneyard).toHaveLength(14);
  });

  it('recusa baralho inválido', () => {
    expect(() => dealFromDeck(FULL_SET.slice(1))).toThrow();
    expect(() => dealFromDeck([...FULL_SET.slice(1), FULL_SET[1]])).toThrow();
  });
});

describe('encaixe e rotação automática', () => {
  it('a primeira pedra vai na raiz e define as duas pontas', () => {
    const board = placeTile(createEmptyBoard(), t(2, 5), 'root');
    expect(getOpenEnds(board)).toEqual({ left: 2, right: 5 });
    expect(getValidSides(t(1, 1), createEmptyBoard())).toEqual(['root']);
  });

  it('gira a pedra para encostar o número certo', () => {
    expect(orientTile(t(3, 6), 6)).toEqual({ inner: 6, outer: 3 });
    expect(orientTile(t(3, 6), 3)).toEqual({ inner: 3, outer: 6 });
    expect(orientTile(t(3, 6), 4)).toBeNull();
    const board = buildBoard(t(2, 5), [[t(5, 6), 'right'], [t(0, 2), 'left']]);
    expect(getOpenEnds(board)).toEqual({ left: 0, right: 6 });
    expect(board.right[0]).toMatchObject({ inner: 5, outer: 6 });
    expect(board.left[0]).toMatchObject({ inner: 2, outer: 0 });
  });

  it('lista os lados válidos e rejeita encaixe errado', () => {
    const board = buildBoard(t(2, 5), []);
    expect(getValidSides(t(2, 5), board)).toEqual(['left', 'right']);
    expect(getValidSides(t(5, 5), board)).toEqual(['right']);
    expect(getValidSides(t(1, 3), board)).toEqual([]);
    expect(() => placeTile(board, t(1, 3), 'left')).toThrow();
    expect(() => placeTile(board, t(2, 2), 'root')).toThrow();
  });

  it('respeita pedra obrigatória de abertura', () => {
    const hand = [t(6, 6), t(1, 2)];
    const moves = getPlayableMoves(hand, createEmptyBoard(), '6-6');
    expect(moves).toHaveLength(1);
    expect(moves[0].tile.id).toBe('6-6');
  });
});

describe('múltiplo de 5', () => {
  it('soma as duas pontas abertas', () => {
    const board = buildBoard(t(2, 3), []);
    expect(endsSum(board)).toBe(5);
    expect(isMultipleOfFive(board)).toBe(true);
    expect(isMultipleOfFive(buildBoard(t(5, 5), []))).toBe(true);
    expect(isMultipleOfFive(buildBoard(t(0, 0), []))).toBe(false);
    expect(isMultipleOfFive(buildBoard(t(2, 4), []))).toBe(false);
  });
});

describe('batida e dano', () => {
  it('classifica normal, bucha e cruzada', () => {
    expect(classifyBatida(t(3, 4), { left: 3, right: 6 })).toBe('normal');
    expect(classifyBatida(t(6, 6), { left: 6, right: 1 })).toBe('bucha');
    expect(classifyBatida(t(3, 6), { left: 6, right: 3 })).toBe('cruzada');
    expect(classifyBatida(t(4, 4), { left: 4, right: 4 })).toBe('cruzada');
    // pontas iguais com pedra não-dupla não é cruzada: é "nas duas pontas" (Patch 0.6.2)
    expect(classifyBatida(t(4, 2), { left: 4, right: 4 })).toBe('duasPontas');
    expect(classifyBatida(t(2, 4), { left: 4, right: 4 })).toBe('duasPontas');
    // pedra que só serve numa ponta continua normal (ou bucha)
    expect(classifyBatida(t(4, 2), { left: 4, right: 5 })).toBe('normal');
    expect(classifyBatida(t(5, 5), { left: 4, right: 5 })).toBe('bucha');
  });

  it('valores de dano', () => {
    expect(DAMAGE).toEqual({ normal: 1, bucha: 2, duasPontas: 2, cruzada: 3, tranca: 1 });
  });

  it('tranca: menor soma vence; empate não dá dano', () => {
    const hands = { player: [t(0, 1), t(1, 1)], tioZe: [t(6, 6)] };
    expect(resolveTranca(hands)).toMatchObject({ winner: 'player', loser: 'tioZe', damage: 1 });
    const tie = resolveTranca({ player: [t(2, 3)], tioZe: [t(1, 4)] });
    expect(tie).toMatchObject({ winner: null, damage: 0 });
  });
});

describe('validação de tranca', () => {
  it('detecta tranca fechada (pontas iguais e as 7 pedras do número na mesa)', () => {
    const almost = buildBoard(t(6, 6), [
      [t(6, 1), 'left'], [t(1, 1), 'left'], [t(1, 0), 'left'], [t(0, 6), 'left'],
      [t(6, 2), 'right'], [t(2, 2), 'right'], [t(2, 3), 'right'], [t(3, 6), 'right'],
      [t(6, 4), 'left'], [t(4, 4), 'left'], [t(4, 5), 'left'],
    ]);
    expect(getOpenEnds(almost)).toEqual({ left: 5, right: 6 });
    expect(isTrancaFechada(almost)).toBe(false);
    const closed = placeTile(almost, t(5, 6), 'left');
    expect(getOpenEnds(closed)).toEqual({ left: 6, right: 6 });
    expect(isTrancaFechada(closed)).toBe(true);
    // fechada vale mesmo com dorme cheio
    const reason = getTrancaReason({ board: closed, hands: { player: [t(0, 0)], tioZe: [t(3, 3)] }, boneyard: [t(5, 5)] });
    expect(reason).toBe('fechada');
  });

  it('pontas iguais sem esgotar o número não tranca', () => {
    const board = buildBoard(t(6, 6), []);
    expect(isTrancaFechada(board)).toBe(false);
    expect(getTrancaReason({ board, hands: { player: [t(0, 6)], tioZe: [] }, boneyard: [] })).toBeNull();
  });

  it('bloqueio: dorme vazio e ninguém encaixa', () => {
    const board = buildBoard(t(6, 6), []);
    const hands = { player: [t(0, 1)], tioZe: [t(2, 3)] };
    expect(getTrancaReason({ board, hands, boneyard: [] })).toBe('bloqueio');
    expect(getTrancaReason({ board, hands, boneyard: [t(4, 4)] })).toBeNull();
    expect(getTrancaReason({ board, hands: { player: [t(6, 1)], tioZe: [] }, boneyard: [] })).toBeNull();
  });
});

describe('abertura e compra', () => {
  it('maior bucha abre; sem bucha, a pedra mais pesada', () => {
    expect(findOpening({ player: [t(5, 5), t(1, 2)], tioZe: [t(6, 6)] })).toEqual({ starter: 'tioZe', tileId: '6-6' });
    expect(findOpening({ player: [t(5, 6), t(1, 2)], tioZe: [t(4, 6)] })).toEqual({ starter: 'player', tileId: '5-6' });
    // a menor bucha ainda vence a pedra comum mais pesada
    expect(findOpening({ player: [t(5, 6)], tioZe: [t(0, 0)] })).toEqual({ starter: 'tioZe', tileId: '0-0' });
  });

  it('escada de compra: grátis, $3, 1 coração, limite', () => {
    expect(getDrawCost(0)).toMatchObject({ type: 'free' });
    expect(getDrawCost(1)).toMatchObject({ type: 'coins', amount: 3 });
    expect(getDrawCost(2)).toMatchObject({ type: 'heart', amount: 1 });
    expect(getDrawCost(3)).toBeNull();
    const base = { boneyardCount: 5, coins: 5, hearts: 5 };
    expect(getDrawAvailability({ ...base, drawsThisTurn: 0 }).allowed).toBe(true);
    expect(getDrawAvailability({ ...base, drawsThisTurn: 1, coins: 2 })).toMatchObject({ allowed: false, reason: 'coins' });
    expect(getDrawAvailability({ ...base, drawsThisTurn: 2, hearts: 1 })).toMatchObject({ allowed: false, reason: 'hearts' });
    expect(getDrawAvailability({ ...base, drawsThisTurn: 3 })).toMatchObject({ allowed: false, reason: 'limit' });
    expect(getDrawAvailability({ ...base, drawsThisTurn: 0, boneyardCount: 0 })).toMatchObject({ allowed: false, reason: 'empty' });
  });
});
