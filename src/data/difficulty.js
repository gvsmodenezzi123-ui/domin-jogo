/**
 * Maletas de dominó (Patch 0.6.3): o modo da run.
 *
 *   normal  Maleta Branca: a caminhada tradicional de boteco. Sempre liberada.
 *   hard    Maleta Preta (Dominó Preto): o submundo não perdoa. Rivais com pedras de
 *           grife e talismãs desde a Região 1, chefes mais duros (data/rivals.js,
 *           HARD_LOADOUTS), e você começa com 4 corações e $3. Liberada ao derrotar o
 *           Comendador Moreira no modo normal (engine/progress.js guarda a chave).
 *
 * O resto não muda entre os modos: prêmio das mesas, loja, Mercado Negro, regras do dominó.
 */

import { MAX_HEARTS, STARTING_COINS } from '../engine/dominoLogic.js';

export const MODES = Object.freeze({
  normal: Object.freeze({
    id: 'normal',
    name: 'MALETA BRANCA',
    short: 'NORMAL',
    tag: 'MODO CLÁSSICO',
    description: 'A caminhada tradicional de boteco. Dificuldade padrão, adversários aprendizes e ritmo clássico.',
    maxHearts: MAX_HEARTS,
    startCoins: STARTING_COINS,
    skin: 'bone',
  }),
  hard: Object.freeze({
    id: 'hard',
    name: 'MALETA PRETA',
    short: 'DIFÍCIL',
    tag: 'MODO DIFÍCIL · SUBMUNDO',
    description: 'O submundo não perdoa. Adversários afiados, builds pesadas desde a Região 1 e chefes implacáveis.',
    maxHearts: 4,
    startCoins: 3,
    skin: 'onyx',
  }),
});

export const MODE_IDS = Object.freeze(Object.keys(MODES));

/** O modo da run (o que não for 'hard' é normal). */
export const modeOf = (mode) => MODES[mode] ?? MODES.normal;

/** Corações máximos do jogador na run deste estado. */
export const playerMaxHearts = (state) => modeOf(state?.mode).maxHearts;

/** Aviso da Maleta Preta trancada. */
export const HARD_LOCKED_TEXT = 'TRANCADO! DERROTE O COMENDADOR MOREIRA NO MODO NORMAL PARA DESBLOQUEAR.';
