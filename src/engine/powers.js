/**
 * Ponte entre o estado do duelo e os dados de src/data/: quais regras extras
 * valem para cada lado, como rodar os ganchos das relíquias e o que a UI
 * pode revelar. Tudo puro.
 */

import { ENHANCEMENT_IDS, getEnhancement } from '../data/enhancedTiles.js';
import { RARITIES, RELICS, RELIC_IDS, RELIC_SLOTS, getRelic } from '../data/relics.js';
import { BASE_RULES, boardTilesInOrder, endTileId, pipSum } from './dominoLogic.js';

export const hasRelic = (state, id) => state.relics.includes(id);

export const equippedRelics = (state) => state.relics.map(getRelic).filter(Boolean);

/** Pontas que ainda são curinga do Cristal (somem se o Tio Zé cobrir a pedra). */
export function wildSidesFor(state) {
  const wild = state.fx?.wild;
  if (!wild || !state.board.root) return [];
  return wild.sides.filter((side) => endTileId(state.board, side) === wild.tileId);
}

/** Regras de encaixe de cada lado neste momento. */
export function rulesFor(state, seat) {
  if (seat === 'tioZe') {
    const frozen = state.fx?.frozenSides ?? [];
    return frozen.length ? { frozenSides: frozen } : BASE_RULES;
  }
  let rules = BASE_RULES;
  for (const relic of equippedRelics(state)) {
    const extra = relic.rules?.(state);
    if (extra) rules = { ...rules, ...extra };
  }
  const wildSides = wildSidesFor(state);
  if (wildSides.length) rules = { ...rules, wildSides };
  return rules;
}

/**
 * Poderes que valem para decidir se a mesa trancou de vez: os seus (relíquias,
 * curinga) contam; o congelamento do Chumbo não, porque passa no fim da vez.
 */
export function trancaRulesFor(state) {
  return { player: rulesFor(state, 'player'), tioZe: BASE_RULES };
}

/** Valor de cada pedra na contagem da tranca (Chave de Fenda). */
export function trancaTileValues(state) {
  const relic = equippedRelics(state).find((r) => r.trancaTileValue);
  return relic ? { player: relic.trancaTileValue } : {};
}

/** Pedra que o lado é obrigado a usar para abrir a mesa (só se ele tiver a pedra). */
export function requiredOpeningFor(state, seat) {
  if (state.board.root || !state.openingTileId) return null;
  return state.hands[seat].some((t) => t.id === state.openingTileId) ? state.openingTileId : null;
}

/** Roda um gancho em todas as relíquias equipadas, na ordem dos slots. */
export function runRelicHook(state, hook, ctx) {
  let next = state;
  for (const id of state.relics) {
    const fn = RELICS[id]?.[hook];
    if (typeof fn === 'function') next = fn(next, ctx);
  }
  return next;
}

/** Relíquia que dá vez extra nessa jogada (ou null). */
export function relicExtraTurn(state, ctx) {
  return equippedRelics(state).find((r) => r.extraTurn?.(state, ctx))?.id ?? null;
}

/** Quantas pedras você vê ao comprar (Barbante no Dedo: 2). */
export function drawOptionsFor(state) {
  return Math.max(1, ...equippedRelics(state).map((r) => r.drawOptions ?? 1));
}

/** Dano da sua batida depois das relíquias (somas antes, multiplicações depois). */
export function applyBatidaDamage(state, base) {
  const relics = equippedRelics(state)
    .filter((r) => r.batidaDamage)
    .sort((p, q) => (p.order ?? 0) - (q.order ?? 0));
  let damage = base;
  const steps = [];
  for (const relic of relics) {
    const after = relic.batidaDamage(damage, state);
    if (after !== damage) {
      steps.push({ id: relic.id, before: damage, after });
      damage = after;
    }
  }
  return { damage, steps };
}

/** Pedras aprimoradas suas que contam "na mão ou na mesa". */
export function enhancedTilesInPlay(state) {
  return [...state.hands.player, ...boardTilesInOrder(state.board)].filter((t) => getEnhancement(t.enhancement));
}

/** O Relógio Quebrado pode ser usado agora? */
export function canUndo(state) {
  return (
    state.phase === 'playing' &&
    state.turn === 'player' &&
    !state.pending &&
    hasRelic(state, 'relogio') &&
    !state.fx.relogioUsed &&
    Boolean(state.fx.undo)
  );
}

/** Pedras da mão do Tio Zé que você enxerga (Olho de Vidro, Espelho Retrovisor). */
export function revealedTioZeTiles(state) {
  const hand = state.hands.tioZe;
  const shown = new Map();
  for (const relic of equippedRelics(state)) {
    if (relic.reveal?.topTiles) {
      hand
        .slice()
        .sort((x, y) => pipSum(y) - pipSum(x) || y.b - x.b)
        .slice(0, relic.reveal.topTiles)
        .forEach((t) => shown.set(t.id, t));
    }
    if (relic.reveal?.lastDraw && state.fx.lastTioZeDraw) {
      const drawn = hand.find((t) => t.id === state.fx.lastTioZeDraw);
      if (drawn) shown.set(drawn.id, drawn);
    }
  }
  return [...shown.values()];
}

/** Marcas nas pontas abertas: 'frozen' (Chumbo, vale para o Tio Zé) ou 'wild' (Cristal, vale para você). */
export function endMarksFor(state) {
  const marks = {};
  if (!state.board.root) return marks;
  for (const side of state.fx.frozenSides) marks[side] = 'frozen';
  for (const side of wildSidesFor(state)) marks[side] = marks[side] ? 'both' : 'wild';
  return marks;
}

// ---------------------------------------------------------------------------
// Sorteios da campanha (só em duelos com `seed`; os testes jogam sem)
// ---------------------------------------------------------------------------

/** Talismã sorteado como prêmio (raridade pesa: comum 6, rara 3, lendária 1). */
export function pickRelicReward(state, rng) {
  const pool = RELIC_IDS.filter((id) => !state.relics.includes(id));
  if (!pool.length || state.relics.length >= RELIC_SLOTS) return null;
  const weight = (id) => RARITIES[RELICS[id].rarity].weight;
  const total = pool.reduce((sum, id) => sum + weight(id), 0);
  let roll = rng() * total;
  for (const id of pool) {
    roll -= weight(id);
    if (roll < 0) return id;
  }
  return pool[pool.length - 1];
}

/** Uma pedra da sua mão ganha um aprimoramento sorteado. */
export function pickNaturalEnhancement(hand, rng) {
  if (!hand.length) return null;
  const index = Math.floor(rng() * hand.length);
  const enhancement = ENHANCEMENT_IDS[Math.floor(rng() * ENHANCEMENT_IDS.length)];
  return { index, enhancement };
}
