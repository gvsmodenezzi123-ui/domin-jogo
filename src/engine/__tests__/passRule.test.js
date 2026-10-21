import { describe, expect, it } from 'vitest';
import { FULL_SET, PASS_FEE, createEmptyBoard, getPassAvailability, isTurnExhausted, makeTile, placeTile } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { passAvailabilityFor, playerTurnExhausted } from '../powers.js';

const t = (a, b) => makeTile(a, b);
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);

/** Mesa [3|4] aberta (pontas 3 e 4), sua vez, sem talismãs de nenhum lado. */
function table({ player, tioZe = [t(1, 1), t(2, 2)], boneyard = [], coins = 5, hearts = 5, drawsThisTurn = 0 }) {
  const s = gameReducer(createInitialState(), { type: 'START_DUEL', deck: FULL_SET.slice() });
  return {
    ...s,
    hands: { player, tioZe },
    board: placeTile(createEmptyBoard(), t(3, 4), 'root'),
    boneyard,
    turn: 'player',
    openingTileId: null,
    drawsThisTurn,
    coins: { ...s.coins, player: coins },
    hearts: { ...s.hearts, player: hearts },
    relics: { player: [], tioZe: [] },
  };
}

describe('regra do PASSAR A VEZ (Patch 0.5.4)', () => {
  it('getPassAvailability cobre as quatro situações do turno', () => {
    // nada encaixa e o dorme tem pedra: a 1ª compra (grátis) é obrigatória
    expect(getPassAvailability({ hasPlay: false, drawsThisTurn: 0, boneyardCount: 5, coins: 99 })).toEqual({ allowed: false, cost: 0, reason: 'mustDraw' });
    // nada encaixa e o dorme secou: passa de graça
    expect(getPassAvailability({ hasPlay: false, drawsThisTurn: 0, boneyardCount: 0, coins: 0 })).toEqual({ allowed: true, cost: 0, reason: null });
    // tem jogada: passe estratégico por $3
    expect(getPassAvailability({ hasPlay: true, drawsThisTurn: 0, boneyardCount: 5, coins: 3 })).toEqual({ allowed: true, cost: PASS_FEE, reason: null });
    expect(getPassAvailability({ hasPlay: true, drawsThisTurn: 0, boneyardCount: 5, coins: 2 })).toEqual({ allowed: false, cost: PASS_FEE, reason: 'coins' });
    // já comprou no turno: de graça, encaixando ou não
    expect(getPassAvailability({ hasPlay: true, drawsThisTurn: 1, boneyardCount: 5, coins: 0 })).toEqual({ allowed: true, cost: 0, reason: null });
    expect(getPassAvailability({ hasPlay: false, drawsThisTurn: 2, boneyardCount: 5, coins: 0 })).toEqual({ allowed: true, cost: 0, reason: null });
  });

  it('turno sem saída só depois de comprar, sem jogada e sem nova compra', () => {
    expect(isTurnExhausted({ hasPlay: false, drawsThisTurn: 3, drawAllowed: false })).toBe(true);
    expect(isTurnExhausted({ hasPlay: false, drawsThisTurn: 0, drawAllowed: false })).toBe(false);
    expect(isTurnExhausted({ hasPlay: true, drawsThisTurn: 3, drawAllowed: false })).toBe(false);
    expect(isTurnExhausted({ hasPlay: false, drawsThisTurn: 2, drawAllowed: true })).toBe(false);
  });

  it('sem jogada: PASSAR fica bloqueado até a 1ª compra, que é grátis', () => {
    let s = table({ player: [t(0, 0), t(6, 6)], boneyard: [t(1, 1), t(4, 6), t(2, 2)] });
    expect(passAvailabilityFor(s).reason).toBe('mustDraw');
    expect(gameReducer(s, { type: 'PASS', actor: 'player' })).toBe(s);
    const coins = s.coins.player;
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.coins.player).toBe(coins);
    expect(passAvailabilityFor(s)).toEqual({ allowed: true, cost: 0, reason: null });
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.turn).toBe('tioZe');
    expect(s.coins.player).toBe(coins);
    expect(lastOf(s, 'pass')).toMatchObject({ by: 'player', cost: 0, forced: false });
  });

  it('com jogada: o passe estratégico custa $3 e aparece no evento', () => {
    let s = table({ player: [t(3, 6), t(0, 0)], boneyard: [t(1, 1)], coins: 5 });
    expect(passAvailabilityFor(s)).toEqual({ allowed: true, cost: 3, reason: null });
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.turn).toBe('tioZe');
    expect(s.coins.player).toBe(2);
    expect(lastOf(s, 'pass')).toMatchObject({ cost: 3 });
    expect(lastOf(s, 'coins')).toMatchObject({ who: 'player', amount: -3, source: 'pass' });
  });

  it('com jogada e menos de $3: SALDO INSUFICIENTE, o passe é recusado', () => {
    const s = table({ player: [t(3, 6), t(0, 0)], boneyard: [t(1, 1)], coins: 2 });
    expect(passAvailabilityFor(s)).toEqual({ allowed: false, cost: 3, reason: 'coins' });
    expect(gameReducer(s, { type: 'PASS', actor: 'player' })).toBe(s);
  });

  it('sem jogada e com o dorme seco: passa de graça sem precisar comprar', () => {
    let s = table({ player: [t(0, 0), t(6, 6)], tioZe: [t(4, 5)], boneyard: [] });
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.turn).toBe('tioZe');
    expect(s.coins.player).toBe(5);
  });

  it('3 compras sem encaixe: passe automático com aviso e sem cobrança', () => {
    let s = table({ player: [t(0, 0), t(6, 6)], boneyard: [t(1, 1), t(2, 2), t(5, 5), t(5, 6)], coins: 5, hearts: 5 });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' }); // grátis
    s = gameReducer(s, { type: 'DRAW', actor: 'player' }); // $3
    expect(s.pending).toBeNull();
    s = gameReducer(s, { type: 'DRAW', actor: 'player' }); // 1 coração
    expect(s.drawsThisTurn).toBe(3);
    expect(s.coins.player).toBe(2);
    expect(s.hearts.player).toBe(4);
    // a mesa trava: aviso na tela, nada de comprar, jogar nem desfazer
    expect(s.pending).toEqual({ type: 'forcedPass' });
    expect(lastOf(s, 'noMoves')).toMatchObject({ by: 'player', draws: 3 });
    expect(gameReducer(s, { type: 'DRAW', actor: 'player' })).toBe(s);
    expect(gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '0-0', side: 'left' })).toBe(s);
    expect(gameReducer(s, { type: 'TIO_ZE_ACT' })).toBe(s);
    // a tela manda o PASS depois do banner: passa para o rival sem custo
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.pending).toBeNull();
    expect(s.turn).toBe('tioZe');
    expect(s.coins.player).toBe(2);
    expect(lastOf(s, 'pass')).toMatchObject({ by: 'player', cost: 0, forced: true });
  });

  it('comprar uma pedra que encaixa não dispara o passe automático', () => {
    let s = table({ player: [t(0, 0)], boneyard: [t(1, 1), t(2, 2), t(4, 6), t(5, 5)] });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' }); // [4|6] encaixa no 4
    expect(s.pending).toBeNull();
    expect(playerTurnExhausted(s)).toBe(false);
  });

  it('sem como pagar a 2ª compra e nada encaixa: também passa sozinho', () => {
    let s = table({ player: [t(0, 0)], boneyard: [t(1, 1), t(2, 2), t(5, 5)], coins: 1 });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.pending).toEqual({ type: 'forcedPass' });
  });
});
