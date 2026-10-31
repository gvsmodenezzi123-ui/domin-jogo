/**
 * Versão 1.5: os pacotes fechados da Loja do Valtinho, numa prateleira a mais (a vitrine de
 * 3 talismãs + 2 pedras continua igual). Paga, abre na hora e escolhe 1 de 3. Um de cada por
 * visita. O sorteio sai da semente da run (engine/shop.js: rollPack), então a mesma semente
 * abre os mesmos pacotes.
 *
 * Talismã: as chances valem por opção (comum, raro, lendário, mítico); necrótico nunca.
 * Pedra: 70% pedra de grife "de balcão" (raras e lendárias) e 30% de luxo (míticas); cada opção
 * já vem numa pedra comum do seu baralho, e a escolhida substitui a comum (o baralho segue com 28).
 */

export const PACKS = Object.freeze({
  macoParaguaio: Object.freeze({
    id: 'macoParaguaio',
    name: 'Maço Paraguaio',
    short: 'MAÇO',
    kind: 'relic',
    price: 6,
    rates: Object.freeze({ comum: 0.65, raro: 0.25, lendario: 0.08, mitico: 0.02 }),
    blurb: 'Três talismãs contrabandeados. Fica com um.',
  }),
  sacoPedras: Object.freeze({
    id: 'sacoPedras',
    name: 'Saco de Pedras',
    short: 'SACO',
    kind: 'tile',
    price: 9,
    rates: Object.freeze({ normal: 0.7, luxo: 0.3 }),
    blurb: 'Três pedras de grife no saco de estopa. Fica com uma.',
  }),
  engradadoJumbo: Object.freeze({
    id: 'engradadoJumbo',
    name: 'Engradado Jumbo',
    short: 'ENGRADADO',
    kind: 'relic',
    price: 12,
    rates: Object.freeze({ comum: 0.4, raro: 0.4, lendario: 0.17, mitico: 0.03 }),
    blurb: 'Talismãs da carga boa. Fica com um.',
  }),
});

export const PACK_IDS = Object.freeze(Object.keys(PACKS));

/** As chances de cada pacote, no formato do documento do 1.5 (para os testes e o README). */
export const PACK_DROP_RATES = Object.freeze(Object.fromEntries(PACK_IDS.map((id) => [id, PACKS[id].rates])));

/** Raridades das pedras de grife em cada metade do Saco de Pedras. */
export const STONE_TIERS = Object.freeze({ normal: Object.freeze(['raro', 'lendario']), luxo: Object.freeze(['mitico']) });

/** Quantas opções cada pacote abre. */
export const PACK_OPTIONS = 3;
