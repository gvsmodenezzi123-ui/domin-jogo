/**
 * Tio Zé — máquina de decisão do oponente.
 *
 * Regras de conduta (estritas):
 *  1. Se tem pedra que encaixa, JOGA. Nunca compra nem passa podendo jogar.
 *  2. Sem jogada: compra seguindo a escada (1ª grátis, 2ª $3, 3ª 1 coração —
 *     só gasta coração se tiver 3 ou mais).
 *  3. Sem jogada e sem compra possível: passa.
 *  Exceção tática: se o adversário acabou de passar e a tranca o favorece
 *  (menor soma estimada), ele passa de propósito para trancar a mesa.
 *
 * Preferências táticas ao jogar:
 *  - bater (e bater com Cruzada/Bucha vale mais);
 *  - descarregar buchas pesadas cedo (são difíceis de encaixar depois);
 *  - descarregar pontos (diminui a soma numa eventual tranca);
 *  - fechar múltiplos de 5 (+$3);
 *  - deixar pontas que ele mesmo consegue seguir;
 *  - deixar pontas que o jogador parece não ter (lembra de passes e compras).
 *
 * Ele não espia a sua mão: só vê a própria mão, a mesa, contagens públicas e
 * a memória do que você fez. Respeita as pontas congeladas pelo Chumbo.
 */

import {
  DAMAGE,
  FULL_SET,
  boardTilesInOrder,
  canPlayOn,
  classifyBatida,
  getDrawAvailability,
  getOpenEnds,
  getPlayableMoves,
  handSum,
  isDouble,
  isMultipleOfFive,
  isTrancaFechada,
  pipSum,
  placeTile,
} from '../engine/dominoLogic.js';
import { requiredOpeningFor, rulesFor } from '../engine/powers.js';

/** Delay reflexivo entre cada ação do Tio Zé. */
export const TIO_ZE_REFLEX_MS = 700;

/** Gasta coração para comprar só se tiver pelo menos isso. */
const HEART_DRAW_MIN_HEARTS = 3;

/** Visão do jogo a partir de uma cadeira (sem informação oculta do adversário). */
export function buildTioZeView(state, seat = 'tioZe') {
  const opponent = seat === 'tioZe' ? 'player' : 'tioZe';
  return {
    seat,
    hand: state.hands[seat],
    board: state.board,
    boneyardCount: state.boneyard.length,
    opponentHandCount: state.hands[opponent].length,
    coins: state.coins[seat],
    hearts: state.hearts[seat],
    drawsThisTurn: state.drawsThisTurn,
    openingTileId: requiredOpeningFor(state, seat),
    consecutivePasses: state.consecutivePasses,
    suspectedMissing: seat === 'tioZe' ? state.memory.playerMissing : [],
    // regras de encaixe da cadeira (para o Tio Zé: pontas congeladas pelo Chumbo)
    rules: rulesFor(state, seat),
  };
}

/** Média de pontos por pedra entre as pedras que ele não vê. */
function averageUnseenPips(view) {
  const seen = new Set([...boardTilesInOrder(view.board), ...view.hand].map((t) => t.id));
  const unseen = FULL_SET.filter((t) => !seen.has(t.id));
  if (!unseen.length) return 0;
  return handSum(unseen) / unseen.length;
}

function estimatedOpponentSum(view) {
  return view.opponentHandCount * averageUnseenPips(view);
}

/** A tranca (menor soma vence) favorece ele com essa mão? */
function trancaFavors(view, hand) {
  return handSum(hand) < estimatedOpponentSum(view);
}

export function scoreMove(view, move) {
  const { tile, side } = move;
  const endsBefore = getOpenEnds(view.board);
  const after = placeTile(view.board, tile, side, view.rules);
  const remaining = view.hand.filter((t) => t.id !== tile.id);

  if (remaining.length === 0) {
    return 1000 + DAMAGE[classifyBatida(tile, endsBefore)] * 100;
  }

  const ends = getOpenEnds(after);
  const danger = view.opponentHandCount <= 2 ? 2 : 1;
  let score = 0;

  // descarrega peso
  score += pipSum(tile);

  // buchas pesadas primeiro
  if (isDouble(tile)) score += 6 + tile.a * 1.5;

  // múltiplo de 5 rende moedas
  if (isMultipleOfFive(after)) score += 4;

  // controle: quantas pedras dele seguem as novas pontas
  const followers = remaining.filter((t) => canPlayOn(t, ends.left) || canPlayOn(t, ends.right)).length;
  score += followers * 2;
  if (followers === 0) score -= 5;

  // pressão: pontas que o jogador parece não ter
  const missing = new Set(view.suspectedMissing);
  if (missing.has(ends.left)) score += 3 * danger;
  if (missing.has(ends.right) && ends.right !== ends.left) score += 3 * danger;

  // tranca fechada: só se a menor soma estiver do lado dele
  if (isTrancaFechada(after)) score += trancaFavors(view, remaining) ? 40 : -60;

  return score;
}

function compareTie(p, q) {
  // determinístico: pedra mais pesada, depois id, depois lado
  return pipSum(q.tile) - pipSum(p.tile) || p.tile.id.localeCompare(q.tile.id) || p.side.localeCompare(q.side);
}

/** Melhor jogada (ou null). */
export function chooseBestMove(view) {
  const required = view.board.root ? null : view.openingTileId;
  const moves = getPlayableMoves(view.hand, view.board, required, view.rules);
  if (!moves.length) return null;
  const scored = moves.map((m) => ({ ...m, score: scoreMove(view, m) }));
  scored.sort((p, q) => q.score - p.score || compareTie(p, q));
  return scored[0];
}

function willPay(cost, view) {
  if (!cost) return false;
  if (cost.type === 'free') return true;
  if (cost.type === 'coins') return view.coins >= cost.amount;
  if (cost.type === 'heart') return view.hearts >= HEART_DRAW_MIN_HEARTS;
  return false;
}

/**
 * Decide a próxima ação. Retorna uma ação pronta para o reducer:
 *   { type: 'PLAY', actor, tileId, side } | { type: 'DRAW', actor } | { type: 'PASS', actor }
 */
export function decideTioZeAction(view) {
  const actor = view.seat;
  const best = chooseBestMove(view);
  if (best) return { type: 'PLAY', actor, tileId: best.tile.id, side: best.side };

  if (view.consecutivePasses >= 1 && trancaFavors(view, view.hand)) {
    return { type: 'PASS', actor, intent: 'tranca' };
  }

  const availability = getDrawAvailability({
    drawsThisTurn: view.drawsThisTurn,
    boneyardCount: view.boneyardCount,
    coins: view.coins,
    hearts: view.hearts,
  });
  if (availability.allowed && willPay(availability.cost, view)) {
    return { type: 'DRAW', actor };
  }
  return { type: 'PASS', actor };
}

/** Agenda a próxima ação do Tio Zé. Retorna a função que cancela. */
export function scheduleTioZeTurn(dispatch, delay = TIO_ZE_REFLEX_MS) {
  const timer = setTimeout(() => dispatch({ type: 'TIO_ZE_ACT' }), delay);
  return () => clearTimeout(timer);
}

// ---------------------------------------------------------------------------
// Falas
// ---------------------------------------------------------------------------

export const TIO_ZE_LINES = Object.freeze({
  intro: ['Senta, menino. A mesa tá posta.', 'Mais um pra minha coleção...'],
  play: ['Toma.', 'Encaixa essa.', 'Hehe...', 'Essa é minha.', 'Segue o jogo.'],
  playDouble: ['BUCHA NA MESA!', 'Lá vai carroça!', 'Desovei a bucha.'],
  draw: ['Vou no dorme...', 'Deixa eu cavar.', 'Compro, compro.'],
  pass: ['Passo.', 'Toc, toc. Passo.', 'Nada pra mim.'],
  passTranca: ['Passo... e tranco. Hehe.', 'Vamos contar os pontos?'],
  bonus5: ['Cinco na mesa, três no bolso.', 'Múltiplo de cinco! Hehe.'],
  playerPass: ['Passou, é? Hehehe.', 'Tá sem pedra, menino?'],
  playerDraw: ['Cava, cava...', 'O dorme não tem piedade.'],
  playerBonus: ['Sorte sua...', 'Guarda essas moedas. Vai precisar.'],
  winRound: ['Bati! Sente o peso.', 'Mais um coração pro meu pote.'],
  loseRound: ['Sorte de principiante...', 'Argh! Isso vai te custar.'],
  tranca: ['Mesa travada. Vamos contar.', 'Trancou!'],
  duelWin: ['Mais uma alma na minha mesa.'],
  duelLose: ['...Volte amanhã. Se tiver coragem.'],
  hurtRelic: ['Ai! Que bruxaria é essa?', 'Isso é trapaça, menino!', 'Essa pedra tá amaldiçoada...'],
  undo: ['Ei! Eu tinha jogado isso!', 'Que relógio é esse?!', 'Volta o tempo, é? Hmpf.'],
});

/** Fala determinística (sem Math.random) a partir de uma semente. */
export function pickTioZeLine(kind, seed = 0) {
  const lines = TIO_ZE_LINES[kind];
  if (!lines || !lines.length) return null;
  return lines[Math.abs(seed) % lines.length];
}
