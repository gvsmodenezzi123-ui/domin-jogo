/**
 * Maletas de partida (Patch 0.8.0): a "classe" da run, escolhida no Balcão de Maletas.
 * Cada uma muda o começo e uma regra da run; a dificuldade (Peças Brancas / Peças
 * Pretas, data/difficulty.js) é escolhida à parte, logo abaixo da maleta.
 *
 *   coins            moedas a mais no começo (somadas às do modo)
 *   relics           talismãs que já vêm na hotbar
 *   playerDeck       pedras do seu baralho que já começam aprimoradas
 *   extraSlots       espaços a mais na hotbar de talismãs
 *   shopMarkup       acréscimo nos preços da Loja do Valtinho (0.2 = 20%)
 *   prizeMultiplier  multiplica o prêmio de cada mesa vencida
 *   maxDraws         compras do dorme por turno (o normal é 3)
 *   rivalExtraTiles  pedras de grife a mais no baralho de cada rival
 *
 * As metas de desbloqueio são conferidas em engine/achievements.js (trackAchievements)
 * e gravadas em engine/meta.js. A Clássica vem liberada.
 */

export const MALETAS = Object.freeze({
  classica: Object.freeze({
    id: 'classica',
    short: 'CLÁSSICA',
    name: 'Maleta Clássica',
    title: 'O Malandro Tradicional',
    buff: 'Baralho de osso padrão e $5 no bolso.',
    debuff: null,
    goal: null,
    coins: 0,
    relics: [],
    playerDeck: {},
    extraSlots: 0,
    shopMarkup: 0,
    prizeMultiplier: 1,
    maxDraws: 3,
    rivalExtraTiles: 0,
  }),
  bicheiro: Object.freeze({
    id: 'bicheiro',
    short: 'BICHEIRO',
    name: 'Maleta do Bicheiro',
    title: 'Dinheiro Vivo',
    buff: 'Começa com $15 no bolso e a Moeda Furada já na hotbar.',
    debuff: 'Cada rival senta com 1 pedra de grife a mais.',
    goal: 'Acumule $60 em uma única run (somando tudo que ganhar).',
    coins: 10,
    relics: ['moedaFurada'],
    playerDeck: {},
    extraSlots: 0,
    shopMarkup: 0,
    prizeMultiplier: 1,
    maxDraws: 3,
    rivalExtraTiles: 1,
  }),
  borracharia: Object.freeze({
    id: 'borracharia',
    short: 'BORRACHARIA',
    name: 'Maleta da Borracharia',
    title: 'Trava Tudo',
    buff: 'O baralho já vem com a [5|5] e a [3|6] de Chumbo: elas travam a ponta para o rival.',
    debuff: null,
    goal: 'Vença 3 rodadas por Tranca (jogo fechado), somando as runs.',
    coins: 0,
    relics: [],
    playerDeck: { '5-5': 'chumbo', '3-6': 'chumbo' },
    extraSlots: 0,
    shopMarkup: 0,
    prizeMultiplier: 1,
    maxDraws: 3,
    rivalExtraTiles: 0,
  }),
  trapaceiro: Object.freeze({
    id: 'trapaceiro',
    short: 'TRAPACEIRO',
    name: 'Maleta do Trapaceiro',
    title: 'Fundo Falso',
    buff: '5 espaços de talismã na hotbar (em vez de 4).',
    debuff: 'Tudo na Loja do Valtinho custa 20% mais.',
    goal: 'Compre 4 talismãs diferentes na mesma run.',
    coins: 0,
    relics: [],
    playerDeck: {},
    extraSlots: 1,
    shopMarkup: 0.2,
    prizeMultiplier: 1,
    maxDraws: 3,
    rivalExtraTiles: 0,
  }),
  seca: Object.freeze({
    id: 'seca',
    short: 'SECA',
    name: 'Maleta Seca',
    title: 'Hardcore',
    buff: 'Toda mesa vencida paga o prêmio em dobro ($16 de base).',
    debuff: 'Só 1 compra do dorme por turno.',
    goal: 'Vença um Chefe de Região sem comprar nenhuma pedra do dorme na partida inteira.',
    coins: 0,
    relics: [],
    playerDeck: {},
    extraSlots: 0,
    shopMarkup: 0,
    prizeMultiplier: 2,
    maxDraws: 1,
    rivalExtraTiles: 0,
  }),
});

export const MALETA_IDS = Object.freeze(Object.keys(MALETAS));
export const DEFAULT_MALETA = 'classica';

/** A maleta da run (o que não for conhecido é a Clássica). */
export const maletaOf = (id) => MALETAS[id] ?? MALETAS[DEFAULT_MALETA];
