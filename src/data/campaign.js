/**
 * Campanha: 3 regiões com 6 nós cada (18 rivais). Os nós 1–5 de cada região
 * são rivais comuns com dificuldade subindo; o nó 6 é o chefe da região.
 *
 * Também mora aqui o que muda conforme a região: a chance de cada raridade na
 * Loja Clandestina, o clima da mesa (`atmosphere`) e a faixa de música
 * (`music`, ver engine/audioSynth.js; os chefes tocam a `BOSS_MUSIC`).
 */

export const REGIONS = Object.freeze([
  Object.freeze({
    id: 1,
    name: 'BOTECO DA ESQUINA',
    subtitle: 'Feltro tradicional, cerveja quente',
    atmosphere: 'boteco',
    music: 'botecoJazz',
    // chance (%) de cada raridade na loja
    rarity: Object.freeze({ comum: 60, raro: 35, lendario: 5, mitico: 0 }),
    nodes: Object.freeze(['tioZe', 'tonho', 'baiano', 'valdir', 'neide', 'arlindo']),
  }),
  Object.freeze({
    id: 2,
    name: 'CLUBE DA SINUCA CLANDESTINO',
    subtitle: 'Neon, fumaça e taco quebrado',
    atmosphere: 'neon',
    music: 'sinucaFunk',
    rarity: Object.freeze({ comum: 45, raro: 35, lendario: 15, mitico: 5 }),
    nodes: Object.freeze(['marcao', 'serginho', 'cida', 'paulinho', 'tiao', 'beto']),
  }),
  Object.freeze({
    id: 3,
    name: 'SUBMUNDO DO JOGO DO BICHO',
    subtitle: 'Alta tensão, apostas pesadas',
    atmosphere: 'bicho',
    music: 'bossFight',
    rarity: Object.freeze({ comum: 30, raro: 30, lendario: 25, mitico: 15 }),
    nodes: Object.freeze(['carlinhos', 'bigode', 'sofia', 'fausto', 'alemao', 'comendador']),
  }),
]);

export const NODES_PER_REGION = 6;

/** Faixa das mesas de chefe (em qualquer região). */
export const BOSS_MUSIC = 'bossFight';

/** Todos os nós em ordem: { index, region, slot (1–6), rivalId, boss }. */
export const NODES = Object.freeze(
  REGIONS.flatMap((region, r) =>
    region.nodes.map((rivalId, i) =>
      Object.freeze({ index: r * NODES_PER_REGION + i, region: region.id, slot: i + 1, rivalId, boss: i === NODES_PER_REGION - 1 }),
    ),
  ),
);

export const TOTAL_NODES = NODES.length;

export const nodeAt = (index) => NODES[Math.max(0, Math.min(TOTAL_NODES - 1, index))];

export const regionOf = (index) => REGIONS[nodeAt(index).region - 1];

/** Reembaralhar a loja fica mais caro a cada uso na mesma visita: $3, $5, $8, depois $12. */
export const REROLL_COSTS = Object.freeze([3, 5, 8, 12]);
export const rerollCost = (rerolls) => REROLL_COSTS[Math.min(rerolls, REROLL_COSTS.length - 1)];

/** Corações que você recupera ao vencer um nó (chefe: cura tudo). */
export const HEAL_AFTER_NODE = 2;
