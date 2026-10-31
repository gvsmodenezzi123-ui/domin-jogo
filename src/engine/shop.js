/**
 * Loja Clandestina do Boteco: abre depois de cada nó vencido.
 *
 * Vitrine: 3 talismãs que você ainda não tem + 2 peças de grife (aprimoramento
 * para uma pedra COMUM do seu baralho; a comprada substitui a comum, o baralho
 * continua com 28). A raridade sorteada segue a região do próximo nó
 * (data/campaign.js): no Boteco da Esquina quase não sai lendário e nunca
 * mítico. Reembaralhar fica mais caro a cada uso na mesma visita ($3, $5, $8,
 * $12). Talismãs equipados vendem pela metade do preço-base da raridade.
 *
 * Tudo puro: o sorteio sai de um gerador com semente (seed da run + nó +
 * quantas vezes você reembaralhou).
 */

import { rerollCost } from '../data/campaign.js';
import { mixSeed, regionOfState } from './campaignMap.js';
import { ENHANCEMENTS, ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { ROOM_RARITY_CHANCES } from '../data/pvpRoom.js';
import { RARITIES } from '../data/rarities.js';
import { RELICS, RELIC_IDS, isRelicOffered } from '../data/relics.js';
import { FULL_SET, createSeededRng } from './dominoLogic.js';
import { PACKS, PACK_IDS, PACK_OPTIONS, STONE_TIERS } from '../data/packs.js';
import { hasPerk, relicSlotsFor, shopPrice } from './loadout.js';

export const SHOP_RELIC_OFFERS = 3;
export const SHOP_TILE_OFFERS = 2;

export function shopRng(state, rerolls, salt = 0) {
  return createSeededRng(mixSeed(state.seed ?? 0, `loja-${state.run.node ?? 'x'}-${rerolls}-${salt}`));
}

/**
 * Sorteia `count` itens distintos: primeiro a raridade (pelas chances da região,
 * só entre as que ainda têm item), depois um item dela. Se nenhuma raridade com
 * chance tiver item sobrando, sorteia entre o que restou.
 */
function pickByRarity(pool, rarityOf, chances, count, rng) {
  const left = pool.slice();
  const picked = [];
  while (picked.length < count && left.length) {
    const present = [...new Set(left.map(rarityOf))].filter((r) => (chances[r] ?? 0) > 0);
    let candidates = left;
    if (present.length) {
      const total = present.reduce((sum, r) => sum + chances[r], 0);
      let roll = rng() * total;
      let chosen = present[present.length - 1];
      for (const r of present) {
        roll -= chances[r];
        if (roll < 0) {
          chosen = r;
          break;
        }
      }
      candidates = left.filter((item) => rarityOf(item) === chosen);
    }
    const item = candidates[Math.floor(rng() * candidates.length)];
    picked.push(item);
    left.splice(left.indexOf(item), 1);
  }
  return picked;
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

/** Monta a vitrine da loja (raridade conforme a região do nó). Necróticos nunca: só no Mercado Negro. */
export function buildShop(state, rerolls = 0) {
  const rng = shopRng(state, rerolls);
  // Versão 1.3: na mesa online a raridade dos talismãs é a que a mesa escolheu (as pedras de
  // grife seguem a mistura completa); no solo, a da região do nó
  const roomChances = state.pvp?.run ? ROOM_RARITY_CHANCES[state.pvp.rarity] : null;
  const chances = roomChances ?? regionOfState(state).rarity;
  const tileChances = roomChances ? ROOM_RARITY_CHANCES.todas : chances;
  const owned = new Set(state.relics.player);
  // talismãs trancados por conquista só entram depois de liberados (Patch 0.7.0)
  const relicPool = RELIC_IDS.filter((id) => !owned.has(id) && RELICS[id].rarity !== 'necrotico' && isRelicOffered(id, state));
  // Maleta do Trapaceiro: tudo aqui custa 20% a mais
  const relics = pickByRarity(relicPool, (id) => RELICS[id].rarity, chances, SHOP_RELIC_OFFERS, rng).map((id) => ({
    id,
    price: shopPrice(state, RELICS[id].price),
    sold: false,
  }));

  // peças de grife: só pedras que ainda são comuns no seu baralho
  const plainIds = FULL_SET.map((t) => t.id).filter((id) => !state.decks.player[id]);
  const tileIds = pickWeighted(plainIds, () => 1, SHOP_TILE_OFFERS, rng);
  const tiles = tileIds.map((tileId) => {
    const [enhancement] = pickByRarity(ENHANCEMENT_IDS, (e) => ENHANCEMENTS[e].rarity, tileChances, 1, rng);
    return { tileId, enhancement, price: shopPrice(state, ENHANCEMENTS[enhancement].price), sold: false };
  });

  // Pé de Coelho Sarnento (versão 1.4): enquanto tiver reembaralhar grátis guardado, sai de graça
  const free = freeFirstReroll(state, rerolls) || (state.run?.freeRerolls ?? 0) > 0;
  // Versão 1.5: a prateleira de pacotes (só no solo; a mesa online escolhe as raridades dela)
  const packs = state.pvp?.run ? [] : PACK_IDS.map((id) => ({ id, price: shopPrice(state, PACKS[id].price), sold: false }));
  return { relics, tiles, packs, rerolls, rerollCost: free ? 0 : rerollCost(rerolls) };
}

/**
 * Versão 1.5: o que sai de um pacote (3 opções). Talismã: raridade por opção nas chances do
 * pacote, sem repetir, sem os que você já tem nem os da vitrine, sem necrótico e só os liberados.
 * Pedra: cada opção é uma pedra comum do seu baralho com uma pedra de grife (70% rara ou
 * lendária, 30% mítica). Sai da semente: nó, reembaralhadas e o pacote.
 */
export function rollPack(state, packId) {
  const pack = PACKS[packId];
  const rng = shopRng(state, state.shop?.rerolls ?? 0, `pacote-${packId}`);
  if (pack.kind === 'relic') {
    const owned = new Set([...state.relics.player, ...(state.shop?.relics ?? []).filter((o) => !o.sold).map((o) => o.id)]);
    let pool = RELIC_IDS.filter((id) => !owned.has(id) && RELICS[id].rarity !== 'necrotico' && isRelicOffered(id, state));
    if (pool.length < PACK_OPTIONS) pool = RELIC_IDS.filter((id) => !state.relics.player.includes(id) && RELICS[id].rarity !== 'necrotico' && isRelicOffered(id, state));
    return pickByRarity(pool, (id) => RELICS[id].rarity, pack.rates, PACK_OPTIONS, rng).map((id) => ({ kind: 'relic', id }));
  }
  const plain = FULL_SET.map((t) => t.id).filter((id) => !state.decks.player[id]);
  const tileIds = pickWeighted(plain, () => 1, PACK_OPTIONS, rng);
  return tileIds.map((tileId) => {
    const tier = rng() < pack.rates.normal ? 'normal' : 'luxo';
    const pool = ENHANCEMENT_IDS.filter((e) => STONE_TIERS[tier].includes(ENHANCEMENTS[e].rarity));
    const enhancement = pool[Math.floor(rng() * pool.length)];
    return { kind: 'tile', tileId, enhancement };
  });
}

/** Por que não dá para comprar esse pacote agora (ou null se dá). */
export function packBuyBlock(state, offer) {
  if (!offer || offer.sold) return 'sold';
  if (state.shop?.opening) return 'opening';
  if (PACKS[offer.id].kind === 'relic' && state.relics.player.length >= relicSlotsFor(state)) return 'full';
  if (state.coins.player < offer.price) return 'coins';
  return null;
}

/** Nota de 3 Reais (talismã) e Amizade com o Valtinho (Conta do Boteco): o 1º reembaralhar da visita é de graça. */
export const freeFirstReroll = (state, rerolls) => rerolls === 0 && (hasPerk(state, 'valtinho') || state.relics.player.some((id) => RELICS[id]?.firstRerollFree));

/** Por que não dá para comprar esse talismã agora (ou null se dá). */
export function relicBuyBlock(state, offer) {
  if (!offer || offer.sold) return 'sold';
  if (state.relics.player.length >= relicSlotsFor(state)) return 'full';
  if (state.coins.player < offer.price) return 'coins';
  return null;
}

export function tileBuyBlock(state, offer) {
  if (!offer || offer.sold) return 'sold';
  if (state.decks.player[offer.tileId]) return 'owned';
  if (state.coins.player < offer.price) return 'coins';
  return null;
}

/** Quanto um talismã equipado vale na revenda (metade do preço-base da raridade). */
export const sellPriceOf = (relicId) => RARITIES[RELICS[relicId]?.rarity]?.sellPrice ?? 0;

/** A revenda agora, com os seus talismãs (Dedo de Cadáver: tudo a $0). */
export const sellPriceFor = (state, relicId) => (state.relics.player.some((id) => RELICS[id]?.sellZero) ? 0 : sellPriceOf(relicId));

export { rerollCost };
