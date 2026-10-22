/**
 * O resumo da run em texto (Patch 0.9.2), para o botão COPIAR RESUMO da lousa do fim:
 * desfecho, semente, modo e maleta, e os números da run (engine/runStats.js).
 */

import { REGIONS } from '../data/campaign.js';
import { modeOf } from '../data/difficulty.js';
import { maletaOf } from '../data/maletas.js';
import { getRival } from '../data/rivals.js';
import { currentNode } from './campaignMap.js';
import { seedLabelOf } from './seedEngine.js';

/** Nome do rival que mais te tirou corações (ou null). */
export const biggestRivalNameOf = (stats) => (stats?.biggestRivalDamage ? getRival(stats.biggestRivalDamage).name : null);

/** Desfecho como a lousa escreve: "TENTATIVA CONCLUÍDA" ou "NOCAUTEADO POR ...". */
export const outcomeTitleOf = (won, rivalName) => (won ? 'TENTATIVA CONCLUÍDA' : `NOCAUTEADO POR ${String(rivalName ?? 'O RIVAL').toUpperCase()}`);

/** Texto pronto para colar numa conversa. */
export function runSummaryText({ state, stats, won, rivalName, version = '' }) {
  const algoz = biggestRivalNameOf(stats);
  const region = currentNode(state)?.region ?? 1;
  const lines = [
    `BUXARIA${version ? ` · Patch ${version}` : ''}`,
    outcomeTitleOf(won, rivalName),
    `Semente: ${seedLabelOf(state) ?? '—'} · ${modeOf(state.mode).name} · ${maletaOf(state.maleta).name}`,
    `Mesas vencidas: ${state.stats?.matchesWon ?? 0} · Região ${region}/${REGIONS.length}`,
    `Buchas jogadas: ${stats.doublePlays}`,
    `Múltiplos de 5 fechados: ${stats.mugginsHit} (+$${stats.mugginsGoldEarned})`,
    `Trancas: ${stats.trancaWins} ${stats.trancaWins === 1 ? 'vitória' : 'vitórias'} | ${stats.trancaLosses} ${stats.trancaLosses === 1 ? 'derrota' : 'derrotas'}`,
    `Maior algoz: ${algoz ?? 'ninguém'}`,
    `Tampinhas: +${stats.tampinhasCollected}`,
  ];
  return lines.join('\n');
}
