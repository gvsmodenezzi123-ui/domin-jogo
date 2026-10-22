/**
 * O que a maleta da run, as melhorias da Conta do Boteco e o desafio mudam nas regras
 * (Patch 0.8.0). Tudo puro, lido do estado: `state.maleta`, `state.perks` (melhorias
 * compradas, entram na run pelo App) e `state.challenge`.
 */

import { maletaOf } from '../data/maletas.js';
import { UPGRADES } from '../data/meta.js';
import { RELIC_SLOTS } from '../data/relics.js';
import { DRAW_LADDER } from './dominoLogic.js';

/** Teto da hotbar: 4 + Trapaceiro + Bolso Fundo. */
export const MAX_RELIC_SLOTS = RELIC_SLOTS + 2;

export const hasPerk = (state, id) => Boolean(state?.perks?.includes(id));

export const challengeIs = (state, id) => state?.challenge === id;

/** Espaços de talismã do jogador nesta run. */
export function relicSlotsFor(state) {
  const perks = (state?.perks ?? []).reduce((n, id) => n + (UPGRADES[id]?.extraSlots ?? 0), 0);
  return Math.min(MAX_RELIC_SLOTS, RELIC_SLOTS + maletaOf(state?.maleta).extraSlots + perks);
}

/** Compras do dorme por turno (Maleta Seca: 1; o rival segue com 3). */
export const maxDrawsFor = (state, seat) => (seat === 'player' ? maletaOf(state?.maleta).maxDraws : DRAW_LADDER.length);

/** Fiado de Rua: o 1º passe voluntário da run ainda está na conta? */
export const fiadoAvailable = (state) => hasPerk(state, 'fiado') && !state?.run?.fiadoUsed;

/** Preço na Loja do Valtinho com o acréscimo da maleta (Trapaceiro: +20%, arredonda para cima). */
export const shopPrice = (state, base) => Math.ceil(base * (1 + maletaOf(state?.maleta).shopMarkup) - 1e-9);

/** Moedas do jogador no começo da run (modo + maleta + Copo Americano). */
export function startCoinsFor(modeCoins, maletaId, perks = []) {
  const extra = perks.reduce((n, id) => n + (UPGRADES[id]?.startCoins ?? 0), 0);
  return modeCoins + maletaOf(maletaId).coins + extra;
}
