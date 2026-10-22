/**
 * Dificuldade da run (Patch 0.6.3; no 0.8.0 virou a escolha das peças no Balcão de Maletas).
 *
 *   normal  Peças Brancas: a caminhada tradicional de boteco. Sempre liberada.
 *   hard    Peças Pretas: o submundo não perdoa. Rivais com pedras de grife e talismãs
 *           desde a Região 1, chefes mais duros (data/rivals.js, HARD_LOADOUTS), as suas
 *           pedras comuns ficam pretas com pips brancos e você começa com 4 corações e $3.
 *           Liberada ao derrotar o Comendador Moreira nas Peças Brancas (engine/meta.js).
 *
 * O resto não muda entre os modos: prêmio das mesas, loja, Mercado Negro, regras do dominó.
 */

import { MAX_HEARTS, STARTING_COINS } from '../engine/dominoLogic.js';

export const MODES = Object.freeze({
  normal: Object.freeze({
    id: 'normal',
    name: 'PEÇAS BRANCAS',
    short: 'NORMAL',
    tag: 'MODO NORMAL',
    description: 'A caminhada tradicional de boteco. Dificuldade padrão, adversários aprendizes e ritmo clássico.',
    maxHearts: MAX_HEARTS,
    startCoins: STARTING_COINS,
    skin: 'bone',
  }),
  hard: Object.freeze({
    id: 'hard',
    name: 'PEÇAS PRETAS',
    short: 'DIFÍCIL',
    tag: 'MODO DIFÍCIL',
    description: 'Rivais com mais pedras de grife e talismãs; as suas pedras comuns ficam pretas com pips brancos.',
    maxHearts: 4,
    startCoins: 3,
    skin: 'onyx',
  }),
});

/** O modo da run (o que não for 'hard' é normal). */
export const modeOf = (mode) => MODES[mode] ?? MODES.normal;

/** Corações máximos do jogador na run deste estado (desafio Tudo ou Nada: 1). */
export const playerMaxHearts = (state) => (state?.challenge === 'tudoOuNada' ? 1 : modeOf(state?.mode).maxHearts);

/** Aviso das Peças Pretas trancadas. */
export const BLACK_LOCKED_TEXT = 'TRANCADO! DERROTE O COMENDADOR MOREIRA NAS PEÇAS BRANCAS PARA LIBERAR AS PEÇAS PRETAS.';
