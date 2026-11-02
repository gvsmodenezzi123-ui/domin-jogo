/**
 * Versão 2.6: a hora da batida. O grito do golpe que fica na mesa enquanto a última pedra
 * brilha e, embaixo dele, o que a rodada fez (não tem mais placar entre as rodadas): a conta
 * da tranca, o dano e em quem, o escudo do rival ou o empate. Usado no solo, no duelo e na roda.
 */
import { boardTilesInOrder } from '../engine/dominoLogic.js';

export const FINALE_TITLE = { normal: 'BATEU!', bucha: 'BATIDA DE BUCHA!', duasPontas: 'NAS DUAS PONTAS!', cruzada: 'CRUZADA!', tranca: 'TRANCOU!', nocaute: 'NOCAUTE!', testamento: 'TESTAMENTO!' };

/** O primeiro nome, em caixa alta (cabe no grito). */
export function shortName(name) {
  return String(name ?? '').split(' ')[0].toUpperCase();
}

/** As linhas embaixo do grito, do ponto de vista de quem joga ('player' contra 'tioZe'). */
export function finaleLines(result, rivalName) {
  if (!result) return [];
  const name = shortName(rivalName);
  const lines = [];
  if (result.kind === 'tranca' && result.sums) lines.push(`VOCÊ ${result.sums.player} × ${result.sums.tioZe} ${name}`);
  if (result.shielded || result.immune) lines.push(`${name} SEGUROU O GOLPE`);
  else if (result.damage > 0) lines.push(result.loser === 'player' ? `−${result.damage}♥ EM VOCÊ` : `−${result.damage}♥ EM ${name}`);
  else if (!result.winner) lines.push('NINGUÉM SANGRA');
  return lines;
}

/** A pedra que está saindo da sua mão (a da mesa, com o material dela), para o leque segurar até o voo. */
export function leavingTileOf(board, tileId) {
  const t = boardTilesInOrder(board).find((x) => x.id === tileId);
  return t ? { id: t.id, a: t.a, b: t.b, enhancement: t.enhancement } : null;
}

/** A última pedra que entrou na mesa (o evento mais recente de pedra jogada). */
export function lastPlacedOf(events) {
  for (let i = (events?.length ?? 0) - 1; i >= 0; i -= 1) if (events[i].type === 'tilePlaced') return events[i];
  return null;
}
