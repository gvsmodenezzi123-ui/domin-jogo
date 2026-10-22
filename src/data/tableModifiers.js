/**
 * Regras de Mesa (Patch 0.9.4): o clima do boteco muda a partida de algumas mesas do mapa.
 * O selo aparece na polaroid do rival no mapa, o banner âmbar no rodapé ao escolher o nó e um
 * selo discreto no canto do feltro durante a partida (toque para lembrar a regra).
 *
 * Quem sorteia qual mesa tem regra é engine/campaignMap.js (pela semente, só nas runs novas);
 * os efeitos moram no motor:
 *   mesaUmida        a 1ª pedra SUA em cada rodada soma +1 na conta do múltiplo de 5
 *                    (gameReducer: playTile; nunca atrapalha: vale com ou sem o +1)
 *   fumacaDensa      o dorme some da tela e a compra paga em moedas custa $4 (powers.js)
 *   apostaAlta       a 1ª batida da partida dói em dobro (de quem bater primeiro) e o passe
 *                    voluntário custa $5 (gameReducer: playTile; powers.js: passFeeFor)
 *   mesaDesnivelada  a 1ª pedra de cada ponta tem de deixar número par na esquerda e ímpar
 *                    na direita (dominoLogic.getPlacement, regra `tilted`)
 *   radioLigado      múltiplo de 5 paga $5 (para os dois lados) e a batida de bucha perde o
 *                    dano dobrado (vale como batida simples)
 */

/** Pontos de graça da Mesa Úmida na 1ª pedra da rodada. */
export const WET_BONUS_POINTS = 1;
/** Compra paga em moedas na Fumaça Densa. */
export const SMOKE_DRAW_COINS = 4;
/** Passe voluntário na Aposta Alta. */
export const HIGH_STAKES_PASS_FEE = 5;
/** Múltiplo de 5 com o Rádio Ligado no Máximo. */
export const RADIO_FIVE_BONUS = 5;

export const TABLE_MODIFIERS = Object.freeze({
  mesaUmida: Object.freeze({
    id: 'mesaUmida',
    name: 'Mesa Úmida',
    alias: 'Copo Derramado',
    icon: 'drop',
    rule: 'O feltro está encharcado de cerveja. A primeira pedra jogada por você em cada rodada ganha +1 ponto livre na soma das pontas (para o múltiplo de 5).',
    short: '1ª PEDRA DA RODADA: +1 NA SOMA',
  }),
  fumacaDensa: Object.freeze({
    id: 'fumacaDensa',
    name: 'Fumaça Densa',
    alias: null,
    icon: 'smoke',
    rule: 'A fumaça de cigarro arde os olhos. O dorme fica completamente oculto e a compra paga em moedas sobe para $4.',
    short: 'DORME OCULTO · COMPRA $4',
  }),
  apostaAlta: Object.freeze({
    id: 'apostaAlta',
    name: 'Aposta Alta',
    alias: 'Clima Pesado',
    icon: 'knife',
    rule: 'O boteco inteiro está apostando alto. A primeira batida da partida causa o dobro de dano (2 corações na simples, 4 na bucha), mas o passe voluntário custa $5.',
    short: '1ª BATIDA EM DOBRO · PASSE $5',
  }),
  mesaDesnivelada: Object.freeze({
    id: 'mesaDesnivelada',
    name: 'Mesa Desnivelada',
    alias: null,
    icon: 'level',
    rule: 'Um calço quebrou. A primeira pedra de cada ponta tem de deixar número par na ponta esquerda e número ímpar na ponta direita.',
    short: 'ESQUERDA PAR · DIREITA ÍMPAR',
  }),
  radioLigado: Object.freeze({
    id: 'radioLigado',
    name: 'Rádio Ligado no Máximo',
    alias: null,
    icon: 'radio',
    rule: 'O samba está ensurdecedor. Fechar as pontas em múltiplo de 5 rende $5 em vez de $3, mas a batida de bucha perde o dano dobrado.',
    short: 'MÚLTIPLO DE 5: $5 · BUCHA SEM DOBRO',
  }),
});

export const TABLE_MODIFIER_IDS = Object.freeze(Object.keys(TABLE_MODIFIERS));

/** A regra de mesa por id (ou null). */
export const tableModifierOf = (id) => (id ? (TABLE_MODIFIERS[id] ?? null) : null);

/** A regra da mesa da partida atual vale? */
export const tableModIs = (state, id) => state?.tableMod === id;
