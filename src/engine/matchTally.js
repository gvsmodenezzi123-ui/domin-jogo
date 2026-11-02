/**
 * Versão 2.6: o placar da mesa vencida, linha por linha. Lê o caderninho da partida
 * (`matchFx.earned`, anotado por effects.recordEarning) e monta, na ordem em que o placar
 * mostra: os múltiplos de 5, as pedras de ouro, cada talismã que rendeu moeda (o que mais
 * rendeu primeiro) e por fim o prêmio da mesa. Depois do dinheiro, o que não é moeda: a cura
 * e a tampinha dourada. Nada aqui muda o jogo: só conta o que já entrou.
 */
import { maletaOf } from '../data/maletas.js';
import { RELICS } from '../data/relics.js';

/** Origens de moeda que não são da mesa (loja, Seu Tião, eventos, painel): ficam de fora. */
const OFF_TABLE = new Set(['sell', 'tiao', 'evento', 'dev']);

/**
 * `state` na fase matchWon (ou runWon); `rival` o derrotado. Devolve
 * { lines: [{ id, kind, label, count, amount, note?, relicId? }], total, extras, purse }.
 */
export function matchTally(state, rival) {
  const earned = state.matchFx?.earned ?? {};
  const result = state.roundResult ?? {};
  const lines = [];
  if (earned.five?.amount) lines.push({ id: 'five', kind: 'five', label: 'MÚLTIPLOS DE 5', count: earned.five.count, amount: earned.five.amount });
  if (earned.ouro?.amount) lines.push({ id: 'ouro', kind: 'gold', label: 'PEDRAS DE OURO', count: earned.ouro.count, amount: earned.ouro.amount });
  const relics = Object.entries(earned)
    .filter(([src, e]) => RELICS[src] && !OFF_TABLE.has(src) && e.amount > 0)
    .sort((a, b) => b[1].amount - a[1].amount || a[0].localeCompare(b[0]));
  for (const [src, e] of relics) lines.push({ id: src, kind: 'relic', relicId: src, label: RELICS[src].name.toUpperCase(), count: e.count, amount: e.amount });

  const prize = earned.prize?.amount ?? result.prize ?? 0;
  if (prize > 0) {
    const mult = maletaOf(state.maleta).prizeMultiplier;
    const notes = [];
    if (rival?.prizeBonus) notes.push(`+$${rival.prizeBonus} DO ${rival.boss ? 'CHEFE' : 'RIVAL'}`);
    if (mult > 1) notes.push(`${maletaOf(state.maleta).name.toUpperCase()} ×${mult}`);
    lines.push({ id: 'prize', kind: 'prize', label: rival?.boss ? 'PRÊMIO DO CHEFE' : 'PRÊMIO DA MESA', count: 1, amount: prize, note: notes.join(' · ') || null });
  }

  const extras = [];
  const heal = result.heal ?? 0;
  if (heal > 0) extras.push({ id: 'heal', kind: 'heal', label: 'CURA', amount: heal });
  if (result.caps) extras.push({ id: 'caps', kind: 'caps', label: 'TAMPINHA DOURADA', amount: result.caps });

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total, extras, purse: state.coins?.player ?? 0 };
}
