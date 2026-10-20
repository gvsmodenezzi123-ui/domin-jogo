/**
 * Funções puras que traduzem o estado/eventos em feedback para a UI:
 * banner de múltiplo de 5, falas e humor do Tio Zé, e a dica do jogador.
 */

import { pickTioZeLine } from '../ai/tioZeAI.js';
import { getOpenEnds, getValidSides } from './dominoLogic.js';

function findLast(events, predicate) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (predicate(events[i])) return events[i];
  }
  return null;
}

function lastSeqOf(events, type) {
  return findLast(events, (e) => e.type === type)?.seq ?? 0;
}

/** Banner temporário do múltiplo de 5 (só da rodada atual). */
export function deriveBanner(events) {
  const roundStart = lastSeqOf(events, 'roundStart');
  const ev = findLast(events, (e) => e.type === 'bonus5' && e.seq > roundStart);
  if (!ev) return null;
  return {
    key: ev.seq,
    tone: ev.by === 'player' ? 'player' : 'enemy',
    text: `+$${ev.amount} MÚLTIPLO DE 5!`,
    sub: ev.by === 'player' ? `PONTAS SOMAM ${ev.sum}` : `PRO BOLSO DO TIO ZÉ · ${ev.sum}`,
  };
}

function lineKindFor(ev) {
  switch (ev.type) {
    case 'roundStart':
      return ev.round === 1 ? 'intro' : null;
    case 'tilePlaced':
      if (ev.by !== 'tioZe') return null;
      return ev.double ? 'playDouble' : 'play';
    case 'drawTile':
      return ev.by === 'tioZe' ? 'draw' : 'playerDraw';
    case 'pass':
      if (ev.by === 'tioZe') return ev.intent === 'tranca' ? 'passTranca' : 'pass';
      return 'playerPass';
    case 'bonus5':
      return ev.by === 'tioZe' ? 'bonus5' : 'playerBonus';
    case 'roundEnd':
      if (!ev.result.winner) return 'tranca';
      return ev.result.winner === 'tioZe' ? 'winRound' : 'loseRound';
    case 'duelEnd':
      return ev.winner === 'tioZe' ? 'duelWin' : 'duelLose';
    default:
      return null;
  }
}

/** Fala mais recente do Tio Zé dentro do duelo atual. */
export function deriveTioZeSpeech(events) {
  const duelStart = lastSeqOf(events, 'duelStart');
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (ev.seq <= duelStart) break;
    const kind = lineKindFor(ev);
    if (kind) {
      const text = pickTioZeLine(kind, ev.seq);
      if (text) return { key: ev.seq, text };
    }
  }
  return null;
}

/** Expressão do avatar. */
export function deriveTioZeMood(state) {
  if (state.phase === 'playing' && state.turn === 'tioZe') return 'thinking';
  const ev = findLast(state.events, (e) => ['heartLost', 'roundEnd', 'pass', 'drawTile', 'tilePlaced', 'roundStart'].includes(e.type));
  if (!ev) return 'idle';
  if (ev.type === 'heartLost') return ev.who === 'tioZe' ? 'hurt' : 'smug';
  if (ev.type === 'roundEnd') return ev.result.winner === 'tioZe' ? 'smug' : ev.result.winner ? 'hurt' : 'idle';
  if ((ev.type === 'pass' || ev.type === 'drawTile') && ev.by === 'player') return 'smug';
  return 'idle';
}

/** Chave que muda a cada dano sofrido no duelo atual (reinicia a animação de impacto). */
export function deriveHurtKey(events, who) {
  const duelStart = lastSeqOf(events, 'duelStart');
  return findLast(events, (e) => e.type === 'heartLost' && e.who === who && e.seq > duelStart)?.seq ?? 0;
}

/** Texto de ajuda logo acima dos botões. */
export function buildPlayerHint({ state, isPlayerTurn, selectedTile, playableCount, drawAllowed }) {
  if (state.phase !== 'playing') return '';
  if (!isPlayerTurn) return 'Vez do Tio Zé...';
  if (!state.board.root) {
    if (state.openingTileId) {
      const [a, b] = state.openingTileId.split('-');
      return a === b ? `Abra a mesa com a bucha ${a}|${b}.` : `Abra a mesa com a ${a}|${b}.`;
    }
    return 'Você venceu a última: abra com qualquer pedra.';
  }
  if (selectedTile) {
    const sides = getValidSides(selectedTile, state.board);
    if (sides.length === 2) {
      const ends = getOpenEnds(state.board);
      return ends.left === ends.right
        ? 'Encaixa dos dois lados. Escolha a ponta.'
        : 'Encaixa nas duas pontas! Escolha o lado.';
    }
    return 'Toque de novo, no JOGAR ou na vaga da mesa.';
  }
  if (playableCount > 0) return `Sua vez. ${playableCount} pedra${playableCount > 1 ? 's' : ''} encaixa${playableCount > 1 ? 'm' : ''}.`;
  if (drawAllowed) return 'Nada encaixa. Compre no dorme ou passe.';
  return 'Nada encaixa e não dá pra comprar. Passe a vez.';
}
