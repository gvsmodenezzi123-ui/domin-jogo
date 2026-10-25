/**
 * Patch PvP: o duelo tem um estado só (o do anfitrião, que senta na cadeira 'player'). Quem
 * entrou na mesa joga com o ESPELHO dele: as cadeiras trocam de lugar (ele vira 'player' na
 * própria tela), os textos dos disparos trocam de ponto de vista ("NO RIVAL" ↔ "EM VOCÊ") e,
 * durante a rodada, a mão do outro e o dorme chegam escondidos (só a quantidade).
 */

import { getEnhancement } from '../data/enhancedTiles.js';
import { getRelic } from '../data/relics.js';
import { revealedTioZeTiles } from '../engine/powers.js';

export const otherSeat = (seat) => (seat === 'player' ? 'tioZe' : 'player');

/** Campos cujo valor é uma cadeira ('player' | 'tioZe'). */
const SEAT_KEYS = new Set(['by', 'who', 'owner', 'turn', 'winner', 'loser', 'starter', 'nextStarter', 'duelWinner', 'seat', 'actor', 'ruby']);
const swapSeat = (v) => (v === 'player' ? 'tioZe' : v === 'tioZe' ? 'player' : v);
const swapTone = (v) => (v === 'player' ? 'enemy' : v === 'enemy' ? 'player' : v);

/** Pares de ponto de vista nos textos dos disparos (vale nos dois sentidos). */
const PHRASES = [
  ['NO RIVAL', 'EM VOCÊ'],
  ['DO RIVAL', 'DO SEU BOLSO'],
  ['ELE COMPROU', 'VOCÊ COMPROU'],
  ['ELE TEM', 'VOCÊ TEM'],
  ['JOGUE DE NOVO', 'JOGA DE NOVO'],
];

function swapPhrases(text) {
  let out = '';
  let i = 0;
  // troca da esquerda para a direita, sem trocar de volta o que acabou de trocar
  outer: while (i < text.length) {
    for (const [a, b] of PHRASES) {
      if (text.startsWith(a, i)) {
        out += b;
        i += a.length;
        continue outer;
      }
      if (text.startsWith(b, i)) {
        out += a;
        i += b.length;
        continue outer;
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/** Nome curto da fonte do disparo ("DEDAL", "RUBI"), como aparece no começo do texto. */
function shortOf(ev) {
  if (ev.source === 'relic') return getRelic(ev.id)?.short ?? null;
  if (ev.source === 'tile') return getEnhancement(ev.id) ? String(ev.id).toUpperCase() : null;
  return null;
}

/**
 * O texto de um disparo visto do outro lado da mesa. `owner` é o dono no estado do anfitrião:
 * se era o convidado, o texto foi escrito na forma "DELE" e volta a ser "seu"; se era o
 * anfitrião, ganha o "DELE".
 */
export function mirrorText(text, ev = {}) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  const short = shortOf(ev);
  if (short && (ev.source === 'relic' || ev.source === 'tile')) {
    if (ev.owner === 'tioZe') {
      out = out.replace(`${short} DELE`, short);
    } else if (ev.owner === 'player' && out.startsWith(short) && !out.startsWith(`${short} DELE`)) {
      out = `${short} DELE${out.slice(short.length)}`;
    }
  }
  return swapPhrases(out);
}

function mirrorValue(value, key) {
  if (Array.isArray(value)) return value.map((v) => mirrorValue(v, null));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const nk = k === 'player' ? 'tioZe' : k === 'tioZe' ? 'player' : k;
      out[nk] = mirrorValue(v, k);
    }
    // texto de disparo: o ponto de vista troca junto com as cadeiras
    if (value.type === 'proc' && typeof value.text === 'string') out.text = mirrorText(value.text, value);
    return out;
  }
  if (typeof value === 'string') {
    if (key === 'tone') return swapTone(value);
    if (SEAT_KEYS.has(key)) return swapSeat(value);
  }
  return value;
}

/** O estado do duelo visto da outra cadeira (cópia nova; o original não muda). */
export const mirrorState = (state) => mirrorValue(state, null);

const hidden = (prefix, i) => ({ id: `${prefix}-${i}`, a: 0, b: 0, hidden: true });

/**
 * O estado que `viewer` pode receber: durante a rodada, a mão da outra cadeira sai escondida
 * (menos as pedras que os talismãs de `viewer` mostram) e o dorme vira só a pilha; as compras
 * do outro também perdem o número da pedra. No fim da rodada tudo fica à mostra (a contagem
 * da tranca precisa das pedras).
 */
export function redactFor(state, viewer) {
  if (!state || state.phase !== 'playing') return state;
  const foe = otherSeat(viewer);
  // o que os talismãs de `viewer` revelam, calculado como se ele fosse o 'player'
  const asViewer = viewer === 'player' ? state : mirrorState(state);
  const shown = new Set(revealedTioZeTiles(asViewer).map((t) => t.id));
  const hand = state.hands[foe].map((t, i) => (shown.has(t.id) ? t : hidden('oculta', i)));
  const pending = state.pending && (state.pending.owner ?? 'player') !== viewer && state.pending.options ? { ...state.pending, options: state.pending.options.map((_, i) => hidden('escolha', i)) } : state.pending;
  const events = state.events.map((ev) =>
    (ev.type === 'drawTile' || ev.type === 'discard') && ev.by === foe && ev.tileId ? { ...ev, tileId: null } : ev,
  );
  return {
    ...state,
    hands: { ...state.hands, [foe]: hand },
    boneyard: state.boneyard.map((_, i) => hidden('dorme', i)),
    pending,
    events,
    fx: state.fx ? { ...state.fx, undo: null } : state.fx,
  };
}

/** Pedras somadas na mesa, nas mãos e no dorme (as escondidas contam igual). */
export function tileCount(state) {
  const board = state.board ? [state.board.root, ...(state.board.left ?? []), ...(state.board.right ?? [])].filter(Boolean).length : 0;
  return board + state.hands.player.length + state.hands.tioZe.length + state.boneyard.length + (state.pending?.options?.length ?? 0);
}
