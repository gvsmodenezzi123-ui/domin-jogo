/**
 * Raridades de talismãs e peças aprimoradas, com cor do badge, valor de revenda
 * (metade do preço-base da faixa, para baixo) e peso no sorteio da loja.
 *
 *   Comum (verde, $4–6)     Raro (azul, $7–10)
 *   Lendário (roxo, $12–16) Mítico (dourado/sangue, $18–25)
 *   Necrótico (verde-cadáver, $18–26, só no Mercado Negro)
 */
export const RARITIES = Object.freeze({
  comum: Object.freeze({ id: 'comum', label: 'COMUM', color: '#6fd35a', basePrice: 5, sellPrice: 2, weight: 6 }),
  raro: Object.freeze({ id: 'raro', label: 'RARO', color: '#5aa8ff', basePrice: 8, sellPrice: 4, weight: 4 }),
  lendario: Object.freeze({ id: 'lendario', label: 'LENDÁRIO', color: '#b277ff', basePrice: 14, sellPrice: 7, weight: 2 }),
  mitico: Object.freeze({
    id: 'mitico',
    label: 'MÍTICO',
    color: '#ffcf4a',
    accent: '#c8261d',
    basePrice: 20,
    sellPrice: 10,
    weight: 1,
  }),
  // Patch 0.6.1: só no Mercado Negro (nunca na Loja do Valtinho). Poder alto, preço alto e um custo.
  necrotico: Object.freeze({
    id: 'necrotico',
    label: 'NECRÓTICO',
    color: '#8fe36a',
    accent: '#1a3a12',
    basePrice: 22,
    sellPrice: 11,
    weight: 0,
  }),
});

export const RARITY_ORDER = Object.freeze(['comum', 'raro', 'lendario', 'mitico', 'necrotico']);

export const getRarity = (id) => RARITIES[id] ?? RARITIES.comum;
