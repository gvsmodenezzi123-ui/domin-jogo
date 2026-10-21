/**
 * Mercado Negro do Corvo da Madrugada (Patch 0.6.1): um nó do mapa que vende só
 * talismãs Necróticos ($18 a $26). A vitrine é fixa por semente e nó: sair e voltar
 * não sorteia outra. Puro.
 */

import { NECROTIC_IDS, RELICS, RELIC_SLOTS } from '../data/relics.js';
import { mixSeed } from './campaignMap.js';
import { createSeededRng } from './dominoLogic.js';

/** Quantos Necróticos o Corvo mostra por visita. */
export const MARKET_OFFERS = 3;

/** Monta a vitrine: 3 Necróticos que você ainda não tem. */
export function buildMarket(state) {
  const rng = createSeededRng(mixSeed(state.seed ?? 0, `mercado-${state.run.node ?? 'x'}`));
  const pool = NECROTIC_IDS.filter((id) => !state.relics.player.includes(id));
  const picked = [];
  while (picked.length < MARKET_OFFERS && pool.length) {
    const [id] = pool.splice(Math.floor(rng() * pool.length), 1);
    picked.push({ id, price: RELICS[id].price, sold: false });
  }
  return { offers: picked };
}

/** Por que não dá para comprar agora (ou null se dá). */
export function marketBuyBlock(state, offer) {
  if (!offer || offer.sold) return 'sold';
  if (state.relics.player.length >= RELIC_SLOTS) return 'full';
  if (state.coins.player < offer.price) return 'coins';
  return null;
}
