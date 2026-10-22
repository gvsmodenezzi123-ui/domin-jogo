/**
 * Eventos de dilema do mapa (Patch 0.9.4): os nós "[?]" dos andares 2 a 5 (só nas runs novas,
 * engine/campaignMap.js sorteia onde e qual). Cada um tem duas linhas de cena e exatamente duas
 * escolhas de risco e recompensa; o desfecho sai da semente da run e do nó (sair e voltar não
 * sorteia de novo). Quem aplica os efeitos é engine/encounters.js.
 */

export const ENCOUNTERS = Object.freeze({
  bebado: Object.freeze({
    id: 'bebado',
    title: 'O Bêbado do Fundo do Bar',
    art: 'drunk',
    text: [
      'Um velho cambaleante derruba uma pedra entalhada sobre o seu casaco...',
      'É uma bucha [6|6] de Rubi legítima, mas ele exige sangue em troca.',
    ],
    options: Object.freeze([
      Object.freeze({ id: 'a', label: 'Aceitar a troca', detail: 'A bucha [6|6] de Rubi entra no seu baralho, mas você perde 1 coração máximo até o fim da run.', tone: 'blood' }),
      Object.freeze({ id: 'b', label: 'Empurrar o velho e seguir em frente', detail: 'Segue viagem ileso.', tone: 'quiet' }),
    ]),
  }),
  policia: Object.freeze({
    id: 'policia',
    title: 'Batida Policial Noturna',
    art: 'police',
    text: ['Um camburão da ronda freia na porta do boteco.', 'O sargento entra farejando apostas clandestinas.'],
    options: Object.freeze([
      Object.freeze({ id: 'a', label: 'Pagar $5 de propina', detail: 'Perde $5 e mantém todos os seus talismãs.', tone: 'brass', cost: 5 }),
      Object.freeze({ id: 'b', label: 'Esconder a banca na manga', detail: '60% de chance de escapar ileso; 40% de ter 1 talismã confiscado.', tone: 'blood' }),
    ]),
  }),
  esquina: Object.freeze({
    id: 'esquina',
    title: 'Aposta de Esquina',
    art: 'coin',
    text: ['Um rapaz de jaqueta de couro encosta no balcão.', 'Ele te desafia para uma aposta rápida de cara ou coroa na moeda.'],
    options: Object.freeze([
      Object.freeze({ id: 'a', label: 'Apostar $3', detail: '50%: os seus $3 voltam como $7. 50%: perde os $3.', tone: 'brass', cost: 3 }),
      Object.freeze({ id: 'b', label: 'Ignorar o desafio', detail: 'Guarda o seu dinheiro.', tone: 'quiet' }),
    ]),
  }),
  engradado: Object.freeze({
    id: 'engradado',
    title: 'Engradado Esquecido no Beco',
    art: 'crate',
    text: ['Atrás da lixeira do bar você encontra um estojo de dominó abandonado.', 'Tem umas moedas soltas lá dentro, no meio de caco de vidro.'],
    options: Object.freeze([
      Object.freeze({ id: 'a', label: 'Revirar o estojo', detail: 'Ganha $4; 30% de chance de levar um corte e perder 1 coração (nunca o último).', tone: 'brass' }),
      Object.freeze({ id: 'b', label: 'Deixar onde está e ir embora', detail: 'Nada acontece.', tone: 'quiet' }),
    ]),
  }),
});

export const ENCOUNTER_IDS = Object.freeze(Object.keys(ENCOUNTERS));

export const encounterOf = (id) => ENCOUNTERS[id] ?? null;

/** Chances dos desfechos (testadas em engine/__tests__/patch094.test.js). */
export const POLICE_CAUGHT_CHANCE = 0.4;
export const COIN_FLIP_WIN_CHANCE = 0.5;
export const CRATE_CUT_CHANCE = 0.3;
/** Aposta de Esquina: aposta $3 e, ganhando, recebe $7. */
export const COIN_FLIP_STAKE = 3;
export const COIN_FLIP_PAYOUT = 7;
export const POLICE_BRIBE = 5;
export const CRATE_COINS = 4;
