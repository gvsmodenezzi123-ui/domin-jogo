/**
 * Óculos Fundo de Garrafa (Patch 0.7.0): na vez do rival, a pedra que ele vai jogar.
 * A IA dele é determinística (mesma mesa, mesma escolha), então dá para saber antes de
 * ela sair da mão: a tela mostra essa pedra virada e um aviso antes de ela assentar.
 * Fica fora de powers.js porque precisa da IA (que já importa powers.js).
 */

import { buildTioZeView, decideTioZeAction } from '../ai/tioZeAI.js';
import { relicsOf } from './powers.js';

/** A pedra que o rival vai jogar agora (ou null: não é a vez dele, ele vai comprar/passar, ou você não tem os Óculos). */
export function foreseenRivalTile(state) {
  if (state.phase !== 'playing' || state.turn !== 'tioZe' || state.pending) return null;
  if (!relicsOf(state, 'player').some((relic) => relic.foresight)) return null;
  const decision = decideTioZeAction(buildTioZeView(state, 'tioZe'));
  if (decision.type !== 'PLAY') return null;
  return state.hands.tioZe.find((t) => t.id === decision.tileId) ?? null;
}
