/**
 * Funções puras que traduzem o estado/eventos em feedback para a UI:
 * texto flutuante do múltiplo de 5, falas e humor do rival, e a dica do jogador.
 */

import { pickRivalLine } from '../data/rivals.js';
import { BASE_RULES, getOpenEnds, getPlacement, getValidSides } from './dominoLogic.js';
import { requiredOpeningFor } from './powers.js';

const DIRECT_HURT = new Set(['rubi', 'dedal', 'anel', 'olhoMorte', 'dev']);

function findLast(events, predicate) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (predicate(events[i])) return events[i];
  }
  return null;
}

function lastSeqOf(events, type) {
  return findLast(events, (e) => e.type === type)?.seq ?? 0;
}

/** Texto flutuante do múltiplo de 5: sobe da ponta jogada até as moedas de quem fechou. */
export function bonusFloat(ev) {
  if (ev?.type !== 'bonus5') return null;
  return { text: `+$${ev.amount} Σ${ev.sum}`, tone: ev.by === 'player' ? 'player' : 'enemy', to: ev.by === 'player' ? 'player' : 'tioZe' };
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
    case 'heartLost':
      if (!DIRECT_HURT.has(ev.reason)) return null;
      // dano direto: ele reclama quando sofre, provoca quando é você
      return ev.who === 'tioZe' ? 'hurtRelic' : 'winRound';
    case 'undo':
      return 'undo';
    default:
      return null;
  }
}

/** Fala mais recente do rival dentro da partida atual (cada rival tem as suas). */
export function deriveTioZeSpeech(events, rivalId = 'tioZe') {
  const duelStart = lastSeqOf(events, 'duelStart');
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (ev.seq <= duelStart) break;
    const kind = lineKindFor(ev);
    if (kind) {
      const text = pickRivalLine(rivalId, kind, ev.seq);
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

/** Por que a pedra entra fora da regra comum (relíquia ou cristal), para a dica. */
const SPECIAL_HINT = {
  wild: 'Ponta de cristal: aceita qualquer número agora.',
  fuzzy: 'Borracha: encaixa com 1 de diferença (1x por rodada).',
  steel: 'Bucha de Aço: o [0|0] encaixa em qualquer ponta.',
};

/** Texto de ajuda logo acima dos botões. */
export function buildPlayerHint({
  state,
  isPlayerTurn,
  selectedTile,
  playableCount,
  drawAllowed,
  passRule = null,
  rules = BASE_RULES,
  rivalName = 'o rival',
}) {
  if (state.phase !== 'playing') return '';
  if (state.pending?.type === 'discard') {
    return selectedTile ? 'Toque em DESCARTAR para mandar ela pro fundo do dorme.' : 'Giz de Sinuca: escolha uma pedra para descartar (ou pule).';
  }
  if (state.pending?.type === 'drawChoice') return 'Barbante: escolha uma das duas pedras.';
  if (state.pending?.type === 'forcedPass') return `Nada encaixa e acabaram as compras. A vez é de ${rivalName}.`;
  if (!isPlayerTurn) return `Vez de ${rivalName}...`;
  if (!state.board.root) {
    const required = requiredOpeningFor(state, 'player');
    if (required) {
      const [a, b] = required.split('-');
      return a === b ? `Abra a mesa com a bucha ${a}|${b}.` : `Abra a mesa com a ${a}|${b}.`;
    }
    // sem pedra obrigatória: você venceu a última rodada (ou a mesa foi limpa no painel DEV)
    return state.lastPlay ? 'Mesa vazia: abra com qualquer pedra.' : 'Você venceu a última: abra com qualquer pedra.';
  }
  if (selectedTile) {
    const sides = getValidSides(selectedTile, state.board, rules);
    const special = sides.map((side) => getPlacement(selectedTile, state.board, side, rules).via).find((via) => SPECIAL_HINT[via]);
    if (special) return SPECIAL_HINT[special];
    if (sides.length === 2) {
      const ends = getOpenEnds(state.board);
      return ends.left === ends.right
        ? 'Encaixa dos dois lados. Escolha a ponta.'
        : 'Encaixa nas duas pontas! Escolha o lado.';
    }
    return 'Toque no JOGAR ou na vaga pontilhada da mesa.';
  }
  if (playableCount > 0) return `Sua vez. ${playableCount} pedra${playableCount > 1 ? 's' : ''} encaixa${playableCount > 1 ? 'm' : ''}.`;
  if (passRule?.reason === 'mustDraw') return 'Nada encaixa. Compre no dorme: a 1ª é grátis.';
  if (drawAllowed) return 'Nada encaixa. Compre de novo ou passe a vez.';
  return 'Nada encaixa e não dá pra comprar. Passe a vez.';
}
