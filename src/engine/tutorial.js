/**
 * Partida de treino com o Vô Juca (Patch 0.9.5): o passo do roteiro (data/tutorial.js), as
 * mãos fixas de cada rodada e a marca no aparelho de que o treino já foi feito.
 *
 * Quem abre o jogo pela primeira vez cai no treino ao tocar em NOVO JOGO; quem já jogava
 * antes desta versão (tem carreira, tampinhas, save ou Livro de Boteco) não é jogado de
 * volta para o treino, mas pode revê-lo nas Opções. O painel DEV marca como pendente.
 */

import { TUTORIAL_DEALS, TUTORIAL_STEPS } from '../data/tutorial.js';
import { FULL_SET, sortHand } from './dominoLogic.js';
import { readRaw, writeRaw } from './storage.js';

/** O passo do roteiro em que a partida de treino está (ou null fora dela). */
export const tutorialStepOf = (state) => (state?.tutorial ? (TUTORIAL_STEPS[state.tutorial.step] ?? null) : null);

/** O que o passo atual espera (ou null fora do treino). */
export const tutorialExpectOf = (state) => tutorialStepOf(state)?.expect ?? null;

const byId = new Map(FULL_SET.map((t) => [t.id, t]));
const take = (id) => ({ ...byId.get(id) });

/** As mãos e o dorme da rodada `round` do treino (o dorme: o topo do roteiro e depois o resto, na ordem do jogo). */
export function tutorialDeal(round) {
  const deal = TUTORIAL_DEALS[round];
  if (!deal) throw new Error(`O treino não tem a rodada ${round}.`);
  const used = new Set([...deal.player, ...deal.tioZe, ...deal.top]);
  return {
    hands: { player: sortHand(deal.player.map(take)), tioZe: sortHand(deal.tioZe.map(take)) },
    boneyard: [...deal.top.map(take), ...FULL_SET.filter((t) => !used.has(t.id)).map((t) => ({ ...t }))],
  };
}

// ---------------------------------------------------------------------------
// No aparelho
// ---------------------------------------------------------------------------

/** 'done' = já fez (ou pulou); 'pending' = o painel DEV pediu de novo; sem nada = decide pela carreira. */
export const TUTORIAL_KEY = 'buxaria_tutorial';

/** Sinais de que o aparelho já jogava antes do treino existir. */
const VETERAN_KEYS = ['buxaria_lifetime_stats', 'buxaria_gold_caps', 'buxaria:run', 'buxaria:collection'];

function playedBefore() {
  for (const key of VETERAN_KEYS) {
    const raw = readRaw(key);
    if (!raw) continue;
    if (key === 'buxaria_gold_caps') {
      if (Number(raw) > 0) return true;
      continue;
    }
    try {
      const value = JSON.parse(raw);
      if (key === 'buxaria_lifetime_stats') {
        if ((value?.runsStarted ?? 0) > 0 || Object.keys(value?.tilesPlayedCount ?? {}).length > 0) return true;
        continue;
      }
      if (key === 'buxaria:collection') {
        if (Object.values(value ?? {}).some((list) => Array.isArray(list) && list.length > 0)) return true;
        continue;
      }
      if (value) return true;
    } catch {
      /* gravado torto: não conta */
    }
  }
  return false;
}

/** NOVO JOGO deve abrir a partida de treino? */
export function needsTutorial() {
  const mark = readRaw(TUTORIAL_KEY);
  if (mark === 'done') return false;
  if (mark === 'pending') return true;
  return !playedBefore();
}

export const markTutorialDone = () => writeRaw(TUTORIAL_KEY, 'done');

/** Painel DEV: o próximo NOVO JOGO abre o treino de novo. */
export const markTutorialPending = () => writeRaw(TUTORIAL_KEY, 'pending');
