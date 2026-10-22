/**
 * Desfecho dos eventos de dilema do mapa (Patch 0.9.4). Puro: o sorteio sai da semente da
 * run, do nó e da escolha (`evento-<nó>-<escolha>`), então sair e voltar dá no mesmo.
 * Os textos e as chances moram em data/encounters.js.
 */

import {
  COIN_FLIP_PAYOUT,
  COIN_FLIP_STAKE,
  COIN_FLIP_WIN_CHANCE,
  CRATE_COINS,
  CRATE_CUT_CHANCE,
  POLICE_BRIBE,
  POLICE_CAUGHT_CHANCE,
  encounterOf,
} from '../data/encounters.js';
import { playerMaxHearts } from '../data/difficulty.js';
import { getRelic } from '../data/relics.js';
import { createSeededRng } from './dominoLogic.js';
import { emit, gainCoins, loseCoins } from './effects.js';
import { mixSeed } from './seedEngine.js';

/** A bucha que o Bêbado entrega. */
export const DRUNK_TILE = '6-6';
export const DRUNK_ENHANCEMENT = 'rubi';

/** Por que a escolha não dá agora (texto curto para o botão) ou null. */
export function encounterOptionBlock(state, encounterId, optionId) {
  if (optionId !== 'a') return null;
  if (encounterId === 'bebado' && playerMaxHearts(state) <= 1) return 'SEM SANGUE PARA DAR';
  if (encounterId === 'policia' && state.coins.player < POLICE_BRIBE) return `FALTA DINHEIRO ($${POLICE_BRIBE})`;
  if (encounterId === 'esquina' && state.coins.player < COIN_FLIP_STAKE) return `FALTA DINHEIRO ($${COIN_FLIP_STAKE})`;
  return null;
}

/** Sorteio do desfecho deste nó e desta escolha (0..1), fixo pela semente. */
export const encounterRoll = (state, nodeId, optionId) => createSeededRng(mixSeed(state.seed ?? 0, `evento-${nodeId}-${optionId}`))();

/** Perde `amount` corações (nunca o último): o corte do engradado. */
function bleed(state, amount, reason) {
  const lost = Math.min(amount, state.hearts.player - 1);
  if (lost <= 0) return { state, lost: 0 };
  const next = { ...state, hearts: { ...state.hearts, player: state.hearts.player - lost } };
  return { state: emit(next, { type: 'heartLost', who: 'player', amount: lost, reason, direct: true }), lost };
}

/**
 * Aplica a escolha. Devolve { state, outcome } com outcome = { tone: 'good' | 'bad' | 'calm',
 * lines: [texto], ...detalhes }. Não muda a fase (quem chama marca o nó e mostra o desfecho).
 */
export function resolveEncounter(state, encounterId, optionId, nodeId) {
  const roll = encounterRoll(state, nodeId, optionId);
  let next = state;
  if (optionId === 'b') {
    if (encounterId === 'policia') {
      const caught = roll < POLICE_CAUGHT_CHANCE;
      const owned = next.relics.player;
      if (!caught) return { state: next, outcome: { tone: 'good', roll, lines: ['O sargento passa reto pela sua manga.', 'Você sai ileso, com a banca inteira.'] } };
      if (!owned.length) return { state: next, outcome: { tone: 'calm', roll, lines: ['O sargento revira os seus bolsos...', 'Não tinha talismã nenhum para confiscar.'] } };
      const pick = owned[Math.floor(createSeededRng(mixSeed(state.seed ?? 0, `confisco-${nodeId}`))() * owned.length)];
      next = { ...next, relics: { ...next.relics, player: owned.filter((id) => id !== pick) } };
      next = emit(next, { type: 'relicLost', id: pick, reason: 'policia' });
      return { state: next, outcome: { tone: 'bad', roll, relicLost: pick, lines: ['O sargento acha o que estava na manga.', `${getRelic(pick)?.name ?? 'Um talismã'} foi confiscado.`] } };
    }
    const calm = {
      bebado: ['Você empurra o velho, que cai sentado no chão.', 'Segue viagem ileso.'],
      esquina: ['Você vira as costas para o rapaz.', 'O dinheiro fica quieto no bolso.'],
      engradado: ['Você deixa o estojo onde estava.', 'Melhor não mexer no que não é seu.'],
    };
    return { state: next, outcome: { tone: 'calm', roll, lines: calm[encounterId] ?? ['Você segue em frente.'] } };
  }

  switch (encounterId) {
    case 'bebado': {
      const scars = (next.run.scars ?? 0) + 1;
      next = {
        ...next,
        run: { ...next.run, scars },
        decks: { ...next.decks, player: { ...next.decks.player, [DRUNK_TILE]: DRUNK_ENHANCEMENT } },
      };
      const max = playerMaxHearts(next);
      next = { ...next, hearts: { ...next.hearts, player: Math.min(next.hearts.player, max) }, maxHearts: { ...next.maxHearts, player: max } };
      next = emit(next, { type: 'maxHeartLost', who: 'player', amount: 1, max });
      next = emit(next, { type: 'deckTile', tileId: DRUNK_TILE, enhancement: DRUNK_ENHANCEMENT, source: 'bebado' });
      return {
        state: next,
        outcome: { tone: 'calm', head: 'TROCA FEITA', roll, tile: DRUNK_TILE, lines: ['O velho corta a sua palma e sorri com dente de ouro.', `A bucha [6|6] de Rubi é sua. Corações máximos: ${max}.`] },
      };
    }
    case 'policia':
      next = loseCoins(next, 'player', POLICE_BRIBE, 'evento');
      return { state: next, outcome: { tone: 'calm', head: 'PROPINA PAGA', roll, coins: -POLICE_BRIBE, lines: ['O sargento conta as notas e guarda no bolso da farda.', `Menos $${POLICE_BRIBE}, mas os talismãs ficam com você.`] } };
    case 'esquina': {
      next = loseCoins(next, 'player', COIN_FLIP_STAKE, 'evento');
      const won = roll < COIN_FLIP_WIN_CHANCE;
      if (won) {
        next = gainCoins(next, 'player', COIN_FLIP_PAYOUT, 'evento');
        return { state: next, outcome: { tone: 'good', roll, coins: COIN_FLIP_PAYOUT - COIN_FLIP_STAKE, lines: ['Cara! A moeda cai do seu lado.', `Os seus $${COIN_FLIP_STAKE} voltam como $${COIN_FLIP_PAYOUT}.`] } };
      }
      return { state: next, outcome: { tone: 'bad', roll, coins: -COIN_FLIP_STAKE, lines: ['Coroa. O rapaz recolhe a moeda rindo.', `Você perdeu os $${COIN_FLIP_STAKE}.`] } };
    }
    case 'engradado': {
      next = gainCoins(next, 'player', CRATE_COINS, 'evento');
      const cut = roll < CRATE_CUT_CHANCE;
      if (!cut) return { state: next, outcome: { tone: 'good', roll, coins: CRATE_COINS, lines: ['Você junta as moedas sem se machucar.', `Mais $${CRATE_COINS} no bolso.`] } };
      const bled = bleed(next, 1, 'evento');
      next = bled.state;
      return {
        state: next,
        outcome: {
          tone: bled.lost ? 'bad' : 'good',
          roll,
          coins: CRATE_COINS,
          hearts: -bled.lost,
          lines: bled.lost ? ['Um caco de vidro abre a sua mão.', `Mais $${CRATE_COINS}, menos 1 coração.`] : ['Um caco de vidro raspa a sua mão, mas não fura.', `Mais $${CRATE_COINS} no bolso.`],
        },
      };
    }
    default:
      return { state: next, outcome: { tone: 'calm', roll, lines: [encounterOf(encounterId)?.title ?? 'Nada acontece.'] } };
  }
}
