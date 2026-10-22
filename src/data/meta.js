/**
 * Meta-progressão (Patch 0.8.0): o que fica de uma run para a outra.
 *
 *   Tampinhas Douradas  moeda permanente: +1 por rival comum vencido, +3 por chefe,
 *                       +5 por zerar a campanha, +10 por concluir um desafio
 *   A Conta do Boteco   4 melhorias permanentes, compradas com tampinhas na lousa do
 *                       fim de cada run (RunEndBoard.jsx)
 *   Desafios            regras extremas liberadas por metas (ChallengesModal.jsx)
 *
 * O estado gravado no aparelho fica em engine/meta.js.
 */

export const CAPS_PER_RIVAL = 1;
export const CAPS_PER_BOSS = 3;
export const CAPS_PER_CLEAR = 5;
export const CAPS_PER_CHALLENGE = 10;

export const UPGRADES = Object.freeze({
  copoAmericano: Object.freeze({
    id: 'copoAmericano',
    name: 'Copo Americano',
    cost: 5,
    description: 'Toda run começa com +$2 no bolso.',
    startCoins: 2,
  }),
  valtinho: Object.freeze({
    id: 'valtinho',
    name: 'Amizade com o Valtinho',
    cost: 8,
    description: 'O 1º reembaralhar de cada Loja do Valtinho é de graça.',
    firstRerollFree: true,
  }),
  fiado: Object.freeze({
    id: 'fiado',
    name: 'Fiado de Rua',
    cost: 12,
    description: 'O 1º passe voluntário da run sai de graça.',
    freePass: true,
  }),
  bolsoFundo: Object.freeze({
    id: 'bolsoFundo',
    name: 'Bolso Fundo',
    cost: 15,
    description: '1 espaço a mais de talismã na hotbar, em toda run.',
    extraSlots: 1,
  }),
});

export const UPGRADE_IDS = Object.freeze(Object.keys(UPGRADES));

/** Desafios: regra, meta para liberar e a moldura que ele dá ao ser concluído. */
export const CHALLENGES = Object.freeze({
  soNoOsso: Object.freeze({
    id: 'soNoOsso',
    name: 'Só no Osso',
    rule: 'Lojas e Mercados Negros fechados. Só a Maleta Clássica, sem nenhum talismã nem pedra de grife.',
    goal: 'Zere a campanha com a Maleta Clássica.',
    frame: 'osso',
    frameName: 'Moldura de Osso',
    maleta: 'classica',
  }),
  mesaBebada: Object.freeze({
    id: 'mesaBebada',
    name: 'Mesa Bêbada',
    rule: 'A cada 3 turnos os números das duas pontas da mesa mudam ao acaso.',
    goal: 'Zere a campanha com a Maleta do Bicheiro.',
    frame: 'bebada',
    frameName: 'Moldura Bêbada',
    maleta: null,
  }),
  tudoOuNada: Object.freeze({
    id: 'tudoOuNada',
    name: 'Tudo ou Nada',
    rule: 'Você e os rivais começam toda mesa com 1 coração. Perdeu uma batida ou uma tranca, perdeu a mesa.',
    goal: 'Zere a campanha nas Peças Pretas.',
    frame: 'sangue',
    frameName: 'Moldura de Sangue',
    maleta: null,
  }),
});

export const CHALLENGE_IDS = Object.freeze(Object.keys(CHALLENGES));
export const challengeOf = (id) => CHALLENGES[id] ?? null;

/** A cada quantos turnos a Mesa Bêbada mexe nas pontas. */
export const DRUNK_EVERY = 3;
