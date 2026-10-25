/**
 * Patch PvP: a escalada espelhada. Os dois sobem a MESMA teia (a semente vem do anfitrião),
 * cada um pelo seu caminho: lojas, beco e imprevistos no próprio ritmo; toda mesa (comum ou
 * chefe) é um duelo de verdade contra o outro jogador. Quem chega primeiro numa mesa espera o
 * outro chegar na dele; quem termina a teia espera "no fim da noite" e joga as mesas que o
 * outro ainda tem. Os dois no fim: a mesa final vale até alguém zerar.
 */

import { MALETAS, maletaOf } from '../data/maletas.js';
import { RELIC_IDS } from '../data/relics.js';
import { availableNodes, currentNode, nodeOf } from '../engine/campaignMap.js';

/** Corações de cada um no online (a noite é longa: 7 em vez dos 5 do solo). */
export const PVP_HEARTS = 7;

/** A run de uma pessoa no online: Peças Brancas, sem melhorias da Conta do Boteco, todos os talismãs liberados. */
export function pvpNewRun({ seed, seedCode, maleta }) {
  return {
    type: 'NEW_RUN',
    maxHearts: PVP_HEARTS,
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

/** Mesa (duelo) ou parada? */
export const isDuelNode = (node) => node?.type === 'combat' || node?.type === 'boss';

/** A teia acabou para esta run (o chefe final já foi)? */
export const runFinished = (run) => run.phase === 'map' && Boolean(run.run.node) && availableNodes(run).length === 0;

const WHERE = { map: 'map', shop: 'shop', blackMarket: 'market', coinEvent: 'coins', encounter: 'event', gameOver: 'out' };

/**
 * O que vai no STATUS: onde estou (mapa, loja, beco, Seu Tião, imprevisto, mesa, fim da
 * teia, duelo), o nó, a região e o andar, corações, moedas e talismãs.
 */
export function statusOf(run, { waitingAt = null, inDuel = false } = {}) {
  const node = waitingAt ? nodeOf(run, waitingAt) : currentNode(run);
  let where = WHERE[run.phase] ?? 'map';
  if (inDuel) where = 'duel';
  else if (waitingAt) where = 'table';
  else if (runFinished(run)) where = 'done';
  return {
    where,
    node: node?.id ?? null,
    region: node?.region ?? 1,
    floor: node?.floor ?? 0,
    hearts: run.hearts.player,
    maxHearts: run.maxHearts.player,
    coins: run.coins.player,
    relics: [...run.relics.player],
    maleta: run.maleta,
  };
}

/** Texto curto de onde o outro está ("na loja", "esperando na mesa"...). */
export function whereText(status) {
  if (!status) return 'chegando...';
  const at = status.floor ? ` · região ${status.region}, andar ${status.floor}` : '';
  switch (status.where) {
    case 'shop':
      return `na Loja do Valtinho${at}`;
    case 'market':
      return `no Mercado Negro${at}`;
    case 'coins':
      return `com o Seu Tião${at}`;
    case 'event':
      return `num imprevisto${at}`;
    case 'table':
      return `esperando na mesa${at}`;
    case 'done':
      return 'no fim da noite (terminou a teia)';
    case 'duel':
      return 'na mesa com você';
    case 'out':
      return 'fora da noite';
    default:
      return `no mapa${at}`;
  }
}
