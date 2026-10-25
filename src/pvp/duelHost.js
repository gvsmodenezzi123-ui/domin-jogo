/**
 * Patch PvP: o duelo de verdade entre duas pessoas, do lado de quem hospeda a mesa. O
 * anfitrião senta na cadeira 'player' e roda o reducer do jogo (as mesmas regras do solo);
 * quem entrou senta na 'tioZe' e manda as jogadas dele pela rede (src/pvp/session.js).
 *
 * Também mora aqui o que os dois lados calculam igual: o perfil que cada run leva para a
 * mesa e a jogada automática do cronômetro.
 */

import { maletaOf } from '../data/maletas.js';
import { ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { mixSeed } from '../engine/campaignMap.js';
import { FULL_SET, createSeededRng, getPlayableMoves, pipSum, shuffle } from '../engine/dominoLogic.js';
import { createInitialState, gameReducer } from '../engine/gameReducer.js';
import { drawAvailabilityFor, requiredOpeningFor, rulesFor } from '../engine/powers.js';

/** O aviso "SEM JOGADAS DISPONÍVEIS" fica na mesa antes do passe forçado. */
export const NO_MOVES_MS = 1600;
/** Testamento Rasgado: a rodada volta do zero depois desta pausa. */
export const REPLAY_MS = 2600;

/** O que a run de uma pessoa leva para a mesa. */
export function profileOf(run, maleta = run?.maleta) {
  return {
    hearts: run.hearts.player,
    maxHearts: run.maxHearts.player,
    coins: run.coins.player,
    relics: [...run.relics.player],
    deck: { ...run.decks.player },
    maleta: maleta ?? 'classica',
  };
}

/** O baralho embaralhado de cada rodada de cada duelo (sai da semente da partida). */
export function duelDeck(seed, duelId, round) {
  return shuffle(FULL_SET, createSeededRng(mixSeed(seed ?? 0, `pvp-${duelId}-${round}`)));
}

/** Maleta do Bicheiro: o adversário dele senta com 1 pedra de grife a mais (como os rivais do solo). */
function withBicheiroDebuff(deck, foeMaleta, seed, key) {
  const extra = maletaOf(foeMaleta).rivalExtraTiles;
  if (!extra) return deck;
  const out = { ...deck };
  const rng = createSeededRng(mixSeed(seed ?? 0, `pvp-bicheiro-${key}`));
  const plain = FULL_SET.map((t) => t.id).filter((id) => !out[id]);
  for (let i = 0; i < extra && plain.length; i += 1) {
    const [id] = plain.splice(Math.floor(rng() * plain.length), 1);
    out[id] = ENHANCEMENT_IDS[Math.floor(rng() * ENHANCEMENT_IDS.length)];
  }
  return out;
}

/**
 * A mesa nova: `host` senta na cadeira 'player', `guest` na 'tioZe'. `final`: a mesa só acaba
 * quando alguém zerar (a rota online tem um duelo só, sempre final).
 */
export function buildDuel({ host, guest, seed, duelId, final = false }) {
  const seats = {
    player: { ...host, deck: withBicheiroDebuff(host.deck, guest.maleta, seed, `${duelId}-a`) },
    tioZe: { ...guest, deck: withBicheiroDebuff(guest.deck, host.maleta, seed, `${duelId}-b`) },
  };
  return gameReducer(createInitialState(), { type: 'PVP_START_DUEL', deck: duelDeck(seed, duelId, 1), seats, final });
}

/** Quem precisa agir agora: a cadeira da vez ou a dona da escolha pendente (ou ninguém). */
export function actorOf(state) {
  if (!state || state.phase !== 'playing') return null;
  if (state.pending) return state.pending.owner ?? 'player';
  return state.turn;
}

const ACTIONS = {
  play: (i) => ({ type: 'PLAY', tileId: i.tileId, side: i.side }),
  draw: () => ({ type: 'DRAW' }),
  pass: () => ({ type: 'PASS' }),
  pick: (i) => ({ type: 'DRAW_PICK', tileId: i.tileId }),
  discard: (i) => ({ type: 'DISCARD', tileId: i.tileId }),
  skipDiscard: () => ({ type: 'SKIP_DISCARD' }),
  canivete: () => ({ type: 'USE_CANIVETE' }),
  canivetePick: (i) => ({ type: 'CANIVETE_PICK', tileId: i.tileId }),
  caniveteCancel: () => ({ type: 'CANCEL_CANIVETE' }),
};
export const INTENT_KINDS = Object.freeze(Object.keys(ACTIONS));

/** Aplica a jogada de `seat` (`intent.kind`: play, draw, pass, pick, discard...). `ok` = o reducer aceitou. */
export function applyIntent(state, seat, intent) {
  const make = ACTIONS[intent?.kind];
  if (!make || actorOf(state) !== seat) return { state, ok: false };
  const next = gameReducer(state, { ...make(intent), actor: seat });
  return { state: next, ok: next !== state };
}

const tileScore = (t) => (t.a === t.b ? 100 : 0) + pipSum(t);

/**
 * A jogada do cronômetro (tempo esgotado) e do robô dos testes: resolve a escolha pendente,
 * senão joga a pedra mais pesada que encaixa (bucha primeiro), senão compra, senão passa.
 */
export function autoIntent(state, seat) {
  const pending = state.pending;
  if (pending) {
    if (pending.type === 'drawChoice') return { kind: 'pick', tileId: pending.options.slice().sort((x, y) => tileScore(y) - tileScore(x))[0].id };
    if (pending.type === 'discard') return { kind: 'skipDiscard' };
    if (pending.type === 'canivete') return { kind: 'caniveteCancel' };
    return { kind: 'pass' };
  }
  const moves = getPlayableMoves(state.hands[seat], state.board, requiredOpeningFor(state, seat), rulesFor(state, seat));
  if (moves.length) {
    const best = moves.slice().sort((x, y) => tileScore(y.tile) - tileScore(x.tile))[0];
    return { kind: 'play', tileId: best.tile.id, side: best.side };
  }
  if (state.board.root && drawAvailabilityFor(state, seat).allowed) return { kind: 'draw' };
  return { kind: 'pass' };
}

/**
 * Como a rodada acabou, do estado do duelo (null enquanto se joga): quem venceu, o dano,
 * se a partida inteira acabou (alguém zerou) e se a rodada volta do zero (Testamento).
 */
export function roundOutcome(state) {
  if (!state || !['roundOver', 'matchWon', 'gameOver'].includes(state.phase)) return null;
  const result = state.roundResult ?? {};
  const matchOver = state.phase !== 'roundOver';
  const winner = matchOver ? state.duelWinner : (result.winner ?? null);
  return {
    winner,
    loser: winner ? (winner === 'player' ? 'tioZe' : 'player') : null,
    damage: result.damage ?? 0,
    kind: result.kind ?? null,
    reason: result.reason ?? null,
    matchOver,
    replay: !matchOver && result.kind === 'testamento',
    hearts: { ...state.hearts },
  };
}
