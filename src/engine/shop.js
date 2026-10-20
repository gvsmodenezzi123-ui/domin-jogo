/**
 * Loja Clandestina do Boteco: abre depois de cada partida vencida.
 *
 * Vitrine: 3 talismãs que você ainda não tem + 2 peças de grife (aprimoramento
 * para uma pedra COMUM do seu baralho; a comprada substitui a comum, o baralho
 * continua com 28). Reembaralhar custa $3. Talismãs equipados vendem pela metade
 * do preço-base da raridade (RARITIES[...].sellPrice).
 *
 * Tudo puro: o sorteio sai de um gerador com semente (seed da run + partida +
 * quantas vezes você reembaralhou).
 */

import { ENHANCEMENTS, ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { RARITIES } from '../data/rarities.js';
import { RELICS, RELIC_IDS, RELIC_SLOTS } from '../data/relics.js';
import { FULL_SET, createSeededRng } from './dominoLogic.js';

export const SHOP_RELIC_OFFERS = 3;
export const SHOP_TILE_OFFERS = 2;
export const REROLL_COST = 3;

export function shopRng(state, rerolls, salt = 0) {
  const seed = (state.seed ?? 0) >>> 0;
  return createSeededRng((seed ^ Math.imul(state.run.match + 7, 0x9e3779b1) ^ Math.imul(rerolls + 1 + salt * 31, 0x85ebca6b)) >>> 0);
}

/** Sorteia `count` itens distintos, com peso. */
function pickWeighted(pool, weightOf, count, rng) {
  const left = pool.slice();
  const picked = [];
  while (picked.length < count && left.length) {
    const total = left.reduce((sum, item) => sum + weightOf(item), 0);
    let roll = rng() * total;
    let index = left.length - 1;
    for (let i = 0; i < left.length; i += 1) {
      roll -= weightOf(left[i]);
      if (roll < 0) {
        index = i;
        break;
      }
    }
    picked.push(left[index]);
    left.splice(index, 1);
  }
  return picked;
}

/** Monta a vitrine da loja. */
export function buildShop(state, rerolls = 0) {
  const rng = shopRng(state, rerolls);
  const owned = new Set(state.relics.player);
  const relicPool = RELIC_IDS.filter((id) => !owned.has(id));
  const relics = pickWeighted(relicPool, (id) => RARITIES[RELICS[id].rarity].weight, SHOP_RELIC_OFFERS, rng).map((id) => ({
    id,
    price: RELICS[id].price,
    sold: false,
  }));

  // peças de grife: só pedras que ainda são comuns no seu baralho
  const plainIds = FULL_SET.map((t) => t.id).filter((id) => !state.decks.player[id]);
  const tileIds = pickWeighted(plainIds, () => 1, SHOP_TILE_OFFERS, rng);
  const tiles = tileIds.map((tileId) => {
    const [enhancement] = pickWeighted(ENHANCEMENT_IDS, (e) => RARITIES[ENHANCEMENTS[e].rarity].weight, 1, rng);
    return { tileId, enhancement, price: ENHANCEMENTS[enhancement].price, sold: false };
  });

  return { relics, tiles, rerolls, rerollCost: REROLL_COST };
}

/** Por que não dá para comprar esse talismã agora (ou null se dá). */
export function relicBuyBlock(state, offer) {
  if (!offer || offer.sold) return 'sold';
  if (state.relics.player.length >= RELIC_SLOTS) return 'full';
  if (state.coins.player < offer.price) return 'coins';
  return null;
}

export function tileBuyBlock(state, offer) {
  if (!offer || offer.sold) return 'sold';
  if (state.decks.player[offer.tileId]) return 'owned';
  if (state.coins.player < offer.price) return 'coins';
  return null;
}

/** Quanto um talismã equipado vale na revenda. */
export const sellPriceOf = (relicId) => RARITIES[RELICS[relicId]?.rarity]?.sellPrice ?? 0;
