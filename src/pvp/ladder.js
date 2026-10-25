/**
 * Patch PvP (versão 1.3): a rota curta da mesa online. Os dois fazem as mesmas três paradas,
 * cada um no seu ritmo: a Loja do Valtinho, o Mercado Negro e o duelo. A semente vem de quem
 * criou a mesa (as vitrines saem iguais para os dois) e a configuração da mesa diz as moedas,
 * os corações e a raridade dos talismãs. Quem fecha o baralho primeiro espera o outro; o duelo
 * vale até alguém zerar, e quem vencer é O Dono da Noite.
 */

import { MALETAS, maletaOf } from '../data/maletas.js';
import { DEFAULT_ROOM, sanitizeRoom } from '../data/pvpRoom.js';
import { RELIC_IDS } from '../data/relics.js';

/** A run de uma pessoa no online: Peças Brancas, sem melhorias da Conta do Boteco, todos os talismãs liberados. */
export function pvpNewRun({ seed, seedCode, maleta, room = DEFAULT_ROOM }) {
  const r = sanitizeRoom(room);
  return {
    type: 'NEW_RUN',
    maxHearts: r.hearts,
    coins: r.coins,
    rarity: r.rarity,
    seed,
    seedCode,
    mode: 'normal',
    maleta: MALETAS[maleta] ? maleta : 'classica',
    challenge: null,
    perks: [],
    unlocks: [...RELIC_IDS],
    pvp: true,
  };
}

/** O baralho com que a maleta começa (vai no HANDSHAKE). */
export const initialDeckOf = (maleta) => ({ ...maletaOf(maleta).playerDeck });

/**
 * O que vai no STATUS: em que parada estou ('shop', 'market', 'table' = baralho fechado,
 * esperando; 'duel'), corações, moedas e talismãs.
 */
export function statusOf(run, { step = 'shop', inDuel = false } = {}) {
  let where = step === 'market' ? 'market' : step === 'duel' ? 'table' : 'shop';
  if (inDuel) where = 'duel';
  return {
    where,
    node: null,
    hearts: run.hearts.player,
    maxHearts: run.maxHearts.player,
    coins: run.coins.player,
    relics: [...run.relics.player],
    maleta: run.maleta,
  };
}

/** Texto curto de onde o outro está ("na loja", "no Mercado Negro"...). */
export function whereText(status) {
  if (!status) return 'chegando...';
  switch (status.where) {
    case 'shop':
      return 'na Loja do Valtinho';
    case 'market':
      return 'no Mercado Negro';
    case 'table':
      return 'com o baralho fechado, esperando o duelo';
    case 'duel':
      return 'na mesa com você';
    default:
      return 'escolhendo a maleta';
  }
}
