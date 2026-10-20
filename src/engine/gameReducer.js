/**
 * Estado do duelo e transições. Reducer puro: toda aleatoriedade (o baralho
 * embaralhado) chega pronta dentro da ação.
 *
 * Fases: 'title' → 'playing' → 'roundOver' → 'playing' ... → 'gameOver'
 *
 * Efeitos colaterais (som, banners, falas) não acontecem aqui: o reducer emite
 * eventos em `state.events`, cada um com um `seq` crescente, e a UI reage.
 */

import { buildTioZeView, decideTioZeAction } from '../ai/tioZeAI.js';
import {
  DAMAGE,
  MAX_HEARTS,
  MULTIPLE_OF_FIVE_BONUS,
  STARTING_COINS,
  classifyBatida,
  createEmptyBoard,
  dealFromDeck,
  endsSum,
  findOpening,
  getDrawAvailability,
  getOpenEnds,
  getTrancaReason,
  getValidSides,
  isDouble,
  isMultipleOfFive,
  placeTile,
  resolveTranca,
} from './dominoLogic.js';

export const SEATS = Object.freeze(['player', 'tioZe']);
export const other = (seat) => (seat === 'player' ? 'tioZe' : 'player');

const MAX_EVENTS = 40;

export function createInitialState() {
  return {
    phase: 'title',
    round: 0,
    board: createEmptyBoard(),
    boneyard: [],
    hands: { player: [], tioZe: [] },
    hearts: { player: MAX_HEARTS, tioZe: MAX_HEARTS },
    coins: { player: STARTING_COINS, tioZe: STARTING_COINS },
    turn: 'player',
    drawsThisTurn: 0,
    consecutivePasses: 0,
    openingTileId: null,
    nextStarter: null,
    roundResult: null,
    duelWinner: null,
    lastPlay: null,
    memory: { playerMissing: [] },
    stats: { roundsWon: { player: 0, tioZe: 0 }, coinsEarned: 0 },
    events: [],
    seq: 0,
  };
}

function emit(state, event) {
  const seq = state.seq + 1;
  const events = [...state.events, { ...event, seq }];
  return { ...state, seq, events: events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events };
}

function startRound(state, deck) {
  const { hands, boneyard } = dealFromDeck(deck);
  let starter = state.nextStarter;
  let openingTileId = null;
  if (!starter) {
    const opening = findOpening(hands);
    starter = opening.starter;
    openingTileId = opening.tileId;
  }
  const next = {
    ...state,
    phase: 'playing',
    round: state.round + 1,
    board: createEmptyBoard(),
    boneyard,
    hands,
    turn: starter,
    drawsThisTurn: 0,
    consecutivePasses: 0,
    openingTileId,
    roundResult: null,
    lastPlay: null,
    memory: { playerMissing: [] },
  };
  return emit(next, { type: 'roundStart', round: next.round, starter, openingTileId });
}

function finishRound(state, result) {
  let next = { ...state, roundResult: result };
  next = emit(next, { type: 'roundEnd', result });

  if (!result.winner || result.damage <= 0) {
    return { ...next, phase: 'roundOver', nextStarter: null };
  }

  const loser = other(result.winner);
  const hearts = { ...next.hearts, [loser]: Math.max(0, next.hearts[loser] - result.damage) };
  const stats = {
    ...next.stats,
    roundsWon: { ...next.stats.roundsWon, [result.winner]: next.stats.roundsWon[result.winner] + 1 },
  };
  next = emit({ ...next, hearts, stats }, { type: 'heartLost', who: loser, amount: result.damage, reason: result.kind });

  if (hearts[loser] === 0) {
    next = { ...next, phase: 'gameOver', duelWinner: result.winner, nextStarter: null };
    return emit(next, { type: 'duelEnd', winner: result.winner });
  }
  return { ...next, phase: 'roundOver', nextStarter: result.winner };
}

function trancaResult(state, reason) {
  return { ...resolveTranca(state.hands), reason, lastTileId: state.lastPlay?.tileId ?? null };
}

/** Pontas de agora entram na lista de "o jogador parece não ter". */
function rememberPlayerMissing(state) {
  const ends = getOpenEnds(state.board);
  if (!ends) return state.memory;
  const set = new Set(state.memory.playerMissing);
  set.add(ends.left);
  set.add(ends.right);
  return { ...state.memory, playerMissing: [...set].sort((a, b) => a - b) };
}

function canAct(state, actor) {
  return state.phase === 'playing' && SEATS.includes(actor) && state.turn === actor;
}

function playTile(state, { actor, tileId, side }) {
  if (!canAct(state, actor)) return state;
  const hand = state.hands[actor];
  const tile = hand.find((t) => t.id === tileId);
  if (!tile) return state;
  if (!state.board.root && state.openingTileId && tile.id !== state.openingTileId) return state;
  if (!getValidSides(tile, state.board).includes(side)) return state;

  const endsBefore = getOpenEnds(state.board);
  const board = placeTile(state.board, tile, side);
  const newHand = hand.filter((t) => t.id !== tile.id);

  let memory = state.memory;
  if (actor === 'player') {
    memory = { ...memory, playerMissing: memory.playerMissing.filter((v) => v !== tile.a && v !== tile.b) };
  }

  let next = {
    ...state,
    board,
    hands: { ...state.hands, [actor]: newHand },
    openingTileId: null,
    consecutivePasses: 0,
    drawsThisTurn: 0,
    lastPlay: { by: actor, tileId: tile.id, side },
    memory,
  };
  next = emit(next, { type: 'tilePlaced', by: actor, tileId: tile.id, side, double: isDouble(tile) });

  if (isMultipleOfFive(board)) {
    const coins = { ...next.coins, [actor]: next.coins[actor] + MULTIPLE_OF_FIVE_BONUS };
    const stats =
      actor === 'player' ? { ...next.stats, coinsEarned: next.stats.coinsEarned + MULTIPLE_OF_FIVE_BONUS } : next.stats;
    next = emit({ ...next, coins, stats }, {
      type: 'bonus5',
      by: actor,
      sum: endsSum(board),
      amount: MULTIPLE_OF_FIVE_BONUS,
    });
  }

  if (newHand.length === 0) {
    const kind = classifyBatida(tile, endsBefore);
    return finishRound(next, {
      kind,
      winner: actor,
      loser: other(actor),
      damage: DAMAGE[kind],
      reason: 'batida',
      lastTileId: tile.id,
      sums: null,
    });
  }

  const tranca = getTrancaReason(next);
  if (tranca) return finishRound(next, trancaResult(next, tranca));

  return { ...next, turn: other(actor) };
}

function drawTile(state, { actor }) {
  if (!canAct(state, actor) || !state.board.root) return state;
  const availability = getDrawAvailability({
    drawsThisTurn: state.drawsThisTurn,
    boneyardCount: state.boneyard.length,
    coins: state.coins[actor],
    hearts: state.hearts[actor],
  });
  if (!availability.allowed) return state;

  const { cost } = availability;
  const [tile, ...boneyard] = state.boneyard;
  let next = {
    ...state,
    boneyard,
    hands: { ...state.hands, [actor]: [...state.hands[actor], tile] },
    drawsThisTurn: state.drawsThisTurn + 1,
    memory: actor === 'player' ? rememberPlayerMissing(state) : state.memory,
  };
  if (cost.type === 'coins') {
    next = { ...next, coins: { ...next.coins, [actor]: next.coins[actor] - cost.amount } };
  }
  if (cost.type === 'heart') {
    next = { ...next, hearts: { ...next.hearts, [actor]: next.hearts[actor] - cost.amount } };
  }
  next = emit(next, { type: 'drawTile', by: actor, tileId: tile.id, cost });
  if (cost.type === 'heart') {
    next = emit(next, { type: 'heartLost', who: actor, amount: cost.amount, reason: 'draw' });
  }

  const tranca = getTrancaReason(next);
  if (tranca) return finishRound(next, trancaResult(next, tranca));
  return next;
}

function passTurn(state, { actor, intent }) {
  if (!canAct(state, actor) || !state.board.root) return state;
  const consecutivePasses = state.consecutivePasses + 1;
  let next = {
    ...state,
    consecutivePasses,
    drawsThisTurn: 0,
    memory: actor === 'player' ? rememberPlayerMissing(state) : state.memory,
  };
  next = emit(next, { type: 'pass', by: actor, intent: intent ?? null });
  if (consecutivePasses >= 2) return finishRound(next, trancaResult(next, 'passes'));
  return { ...next, turn: other(actor) };
}

function tioZeAct(state) {
  if (!canAct(state, 'tioZe')) return state;
  const decision = decideTioZeAction(buildTioZeView(state, 'tioZe'));
  const next = gameReducer(state, decision);
  if (next !== state) return next;
  // Segurança: se a decisão foi rejeitada, joga qualquer pedra válida ou passa.
  const fallback = buildTioZeView(state, 'tioZe');
  for (const tile of fallback.hand) {
    const sides = getValidSides(tile, state.board);
    if (sides.length) {
      const played = gameReducer(state, { type: 'PLAY', actor: 'tioZe', tileId: tile.id, side: sides[0] });
      if (played !== state) return played;
    }
  }
  return gameReducer(state, { type: 'PASS', actor: 'tioZe' });
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'START_DUEL': {
      const fresh = { ...createInitialState(), seq: state.seq, events: state.events };
      const next = emit(fresh, { type: 'duelStart' });
      return startRound(next, action.deck);
    }
    case 'NEXT_ROUND':
      if (state.phase !== 'roundOver') return state;
      return startRound(state, action.deck);
    case 'PLAY':
      return playTile(state, action);
    case 'DRAW':
      return drawTile(state, action);
    case 'PASS':
      return passTurn(state, action);
    case 'TIO_ZE_ACT':
      return tioZeAct(state);
    case 'RETURN_TO_TITLE':
      return { ...createInitialState(), seq: state.seq, events: state.events };
    default:
      return state;
  }
}
