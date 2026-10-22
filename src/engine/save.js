/**
 * Save da run (puro): o que precisa para o CONTINUAR voltar exatamente onde
 * você parou — nó atual, corações, moedas, talismãs e o seu baralho (pedras
 * de grife). Quem grava no localStorage é engine/progress.js.
 *
 * `resume` diz para onde o CONTINUAR leva: 'map' (escolher o próximo nó), 'shop'
 * (dentro da Loja do Valtinho) ou 'blackMarket' (no beco do Corvo).
 *
 * Versão 2 (Patch 0.6.1): a teia da campanha sai da semente; o save guarda a semente,
 * o nó atual, os concluídos e o caminho. Saves da versão 1 (trilha fixa) não valem mais.
 * Versão 3 (Patch 0.6.2): a teia mudou (15 rivais por run, nós únicos por região), então
 * a mesma semente gera outro mapa: saves da versão 2 também não valem mais.
 * Versão 4 (Patch 0.8.0): guarda a maleta da run, o desafio, o Fiado de Rua usado e as
 * tampinhas da run. Saves da versão 3 continuam valendo (Maleta Clássica, sem desafio).
 */

import { SEED_MAX_LENGTH } from './seedEngine.js';
import { MODES, modeOf } from '../data/difficulty.js';
import { MALETAS } from '../data/maletas.js';
import { CHALLENGES } from '../data/meta.js';
import { RELIC_IDS } from '../data/relics.js';
import { MAX_RELIC_SLOTS } from './loadout.js';
import { generateCampaign } from './campaignMap.js';
import { ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { FULL_SET, MAX_HEARTS } from './dominoLogic.js';

export const SAVE_VERSION = 4;
/** Versões que o CONTINUAR ainda aceita. */
const READABLE = [3, 4];
const RESUMES = ['map', 'shop', 'blackMarket'];

export function snapshotRun(state, resume, savedAt = 0) {
  return {
    v: SAVE_VERSION,
    savedAt,
    resume,
    mode: modeOf(state.mode).id,
    maleta: state.maleta ?? 'classica',
    challenge: state.challenge ?? null,
    fiadoUsed: Boolean(state.run.fiadoUsed),
    seed: state.seed,
    seedCode: state.seedCode ?? null,
    node: state.run.node,
    cleared: [...state.run.cleared],
    path: [...state.run.path],
    match: state.run.match,
    history: [...state.run.history],
    hearts: state.hearts.player,
    coins: state.coins.player,
    relics: [...state.relics.player],
    deck: { ...state.decks.player },
    // vitrine da loja como estava (sem isso, sair e voltar sortearia outra de graça)
    shop:
      resume === 'shop' && state.shop
        ? {
            relics: state.shop.relics.map((o) => ({ ...o })),
            tiles: state.shop.tiles.map((o) => ({ ...o })),
            rerolls: state.shop.rerolls,
            rerollCost: state.shop.rerollCost,
          }
        : null,
    market: resume === 'blackMarket' && state.market ? { offers: state.market.offers.map((o) => ({ ...o })) } : null,
    stats: {
      roundsWon: { ...state.stats.roundsWon },
      coinsEarned: state.stats.coinsEarned,
      matchesWon: state.stats.matchesWon,
      caps: state.stats.caps ?? 0,
    },
  };
}

const isInt = (n) => Number.isInteger(n);
const TILE_IDS = new Set(FULL_SET.map((t) => t.id));

/** A vitrine guardada ainda bate com os dados do jogo? */
export function isValidShop(shop) {
  if (!shop || typeof shop !== 'object') return false;
  if (!Array.isArray(shop.relics) || !Array.isArray(shop.tiles)) return false;
  if (!isInt(shop.rerolls) || shop.rerolls < 0 || !isInt(shop.rerollCost) || shop.rerollCost < 0) return false;
  const priced = (o) => o && isInt(o.price) && o.price >= 0 && typeof o.sold === 'boolean';
  if (!shop.relics.every((o) => priced(o) && RELIC_IDS.includes(o.id))) return false;
  return shop.tiles.every((o) => priced(o) && TILE_IDS.has(o.tileId) && ENHANCEMENT_IDS.includes(o.enhancement));
}

/** A vitrine do Mercado Negro guardada ainda bate com os dados do jogo? */
export function isValidMarket(market) {
  if (!market || typeof market !== 'object' || !Array.isArray(market.offers)) return false;
  return market.offers.every((o) => o && RELIC_IDS.includes(o.id) && isInt(o.price) && o.price >= 0 && typeof o.sold === 'boolean');
}

/** Confere se um save lido do storage é usável (versão, formato, valores, nós da teia). */
export function isValidSave(save) {
  if (!save || typeof save !== 'object' || !READABLE.includes(save.v)) return false;
  if (!RESUMES.includes(save.resume)) return false;
  // Patch 0.6.3: maleta da run (saves sem o campo são das Peças Brancas)
  if (save.mode != null && !MODES[save.mode]) return false;
  // Patch 0.8.0: maleta e desafio (saves sem os campos: Clássica, sem desafio)
  if (save.maleta != null && !MALETAS[save.maleta]) return false;
  if (save.challenge != null && !CHALLENGES[save.challenge]) return false;
  if (save.seed != null && !isInt(save.seed)) return false;
  // Patch 0.9.2: a semente em texto (saves antigos não têm)
  if (save.seedCode != null && (typeof save.seedCode !== 'string' || save.seedCode.length > SEED_MAX_LENGTH)) return false;
  const campaign = generateCampaign(save.seed ?? 0);
  const known = (id) => typeof id === 'string' && campaign.byId.has(id);
  if (save.node !== null && !known(save.node)) return false;
  if (!Array.isArray(save.cleared) || !save.cleared.every(known)) return false;
  if (!Array.isArray(save.path) || !save.path.every(known)) return false;
  // Peças Prateadas começam com 6 corações (Patch 0.9.0)
  if (!isInt(save.hearts) || save.hearts < 1 || save.hearts > Math.max(MAX_HEARTS, modeOf(save.mode).maxHearts)) return false;
  if (!isInt(save.coins) || save.coins < 0) return false;
  if (!Array.isArray(save.relics) || save.relics.length > MAX_RELIC_SLOTS) return false;
  if (!save.relics.every((id) => RELIC_IDS.includes(id))) return false;
  if (!save.deck || typeof save.deck !== 'object') return false;
  if (!Object.entries(save.deck).every(([id, e]) => TILE_IDS.has(id) && ENHANCEMENT_IDS.includes(e))) return false;
  if (!Array.isArray(save.history) || !isInt(save.match)) return false;
  if (save.shop != null && !isValidShop(save.shop)) return false;
  if (save.market != null && !isValidMarket(save.market)) return false;
  return true;
}
