/**
 * Dificuldade da run (Patch 0.6.3; no 0.8.0 virou a escolha das peças no Balcão de Maletas).
 *
 *   normal  Peças Brancas: a caminhada tradicional de boteco. Sempre liberada.
 *   hard    Peças Pretas: o submundo não perdoa. Rivais com pedras de grife e talismãs
 *           desde a Região 1, chefes mais duros (data/rivals.js, HARD_LOADOUTS), as suas
 *           pedras comuns ficam pretas com pips brancos e você começa com 4 corações e $3.
 *           Liberada ao derrotar o Comendador Moreira nas Peças Brancas (engine/meta.js).
 *   inferno Peças Prateadas (Patch 0.9.0): o modo mais difícil. Todo rival senta com talismãs
 *           e pedras de grife desde a 1ª mesa, os chefes com 5 talismãs e 10 pedras de grife,
 *           todos no nível agressivo (data/rivals.js, INFERNO_LOADOUTS). Você começa com 6
 *           corações e $5, mas cada mesa vencida (chefe também) devolve só 1 coração: não dá
 *           para gastar vida. As suas pedras comuns ficam prateadas. Liberada ao derrotar o
 *           Comendador nas Peças Pretas. Medido com scripts/simulate-runs.mjs (ver README).
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
  inferno: Object.freeze({
    id: 'inferno',
    name: 'PEÇAS PRATEADAS',
    short: 'INFERNO',
    tag: 'MODO INFERNO',
    description: 'Todo rival com talismãs e pedras de grife desde o começo, chefes com 5 talismãs e 10 pedras de grife; cada mesa devolve só 1 coração.',
    maxHearts: 6,
    startCoins: STARTING_COINS,
    // corações devolvidos ao vencer uma mesa (chefe também); nos outros modos: 2, e o chefe cura tudo
    healPerTable: 1,
    skin: 'silver',
  }),
});

export const MODE_IDS = Object.freeze(Object.keys(MODES));

/** O modo da run (o que não for 'hard' nem 'inferno' é normal). */
export const modeOf = (mode) => MODES[mode] ?? MODES.normal;

/** Corações máximos do jogador na run deste estado (desafio Tudo ou Nada: 1). */
/**
 * Corações máximos do jogador: os do modo (Tudo ou Nada: 1), menos as cicatrizes da run
 * (Patch 0.9.4: o Bêbado do Fundo do Bar cobra 1 em sangue), nunca menos de 1.
 */
export const playerMaxHearts = (state) => Math.max(1, (state?.challenge === 'tudoOuNada' ? 1 : modeOf(state?.mode).maxHearts) - (state?.run?.scars ?? 0));

/** Aviso das Peças Pretas trancadas. */
export const BLACK_LOCKED_TEXT = 'TRANCADO! DERROTE O COMENDADOR MOREIRA NAS PEÇAS BRANCAS PARA LIBERAR AS PEÇAS PRETAS.';
/** Aviso das Peças Prateadas (Modo Inferno) trancadas. */
export const SILVER_LOCKED_TEXT = 'TRANCADO! DERROTE O COMENDADOR MOREIRA NAS PEÇAS PRETAS PARA LIBERAR AS PEÇAS PRATEADAS.';

/** Rivais e chefes no arsenal do difícil (Peças Pretas) ou acima. */
export const isHardOrWorse = (mode) => mode === 'hard' || mode === 'inferno';

/** Rótulo curto do modo para placas ("PEÇAS PRETAS · ", vazio no normal). */
export const modeBadge = (mode) => (mode === 'hard' || mode === 'inferno' ? `${MODES[mode].name} · ` : '');
