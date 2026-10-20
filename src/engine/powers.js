/**
 * Ponte entre o estado do duelo e os dados de src/data/: quais regras extras
 * valem para cada lado, como rodar os ganchos dos talismãs de cada dono, como
 * "vestir" as pedras com o baralho de cada um e o que a sua tela pode revelar.
 * Tudo puro.
 *
 * Cadeiras: 'player' (você) e 'tioZe' (a cadeira do rival da partida; o nome
 * ficou do Patch 0.1, quando o Tio Zé era o único adversário).
 */

import { getEnhancement } from '../data/enhancedTiles.js';
import { RELICS, getRelic, isUsed } from '../data/relics.js';
import { getRival } from '../data/rivals.js';
import { BASE_RULES, boardTilesInOrder, endTileId, makeTile, pipSum } from './dominoLogic.js';

export const other = (seat) => (seat === 'player' ? 'tioZe' : 'player');

export const relicsOf = (state, seat) => (state.relics[seat] ?? []).map(getRelic).filter(Boolean);

export const hasRelic = (state, seat, id) => (state.relics[seat] ?? []).includes(id);

/** Regras próprias do rival da partida (ver `mechanics` em data/rivals.js). */
export const rivalMechanics = (state) => getRival(state.rivalId).mechanics ?? {};

// ---------------------------------------------------------------------------
// Baralho de cada lado
// ---------------------------------------------------------------------------

/**
 * A pedra como ela é no baralho de `seat`: a versão aprimorada se o dono tiver
 * trocado a comum por ela, senão a comum. Cópias do painel DEV ficam como estão.
 */
export function dressTile(state, seat, tile) {
  if (tile.id.includes('#')) return tile;
  const enhancement = state.decks?.[seat]?.[tile.id];
  return enhancement ? { id: tile.id, a: tile.a, b: tile.b, enhancement } : makeTile(tile.a, tile.b);
}

/** Pedras voltando para o dorme ficam comuns (cópias do painel DEV somem). */
export function plainTiles(tiles) {
  return tiles.filter((t) => !t.id.includes('#')).map((t) => makeTile(t.a, t.b));
}

// ---------------------------------------------------------------------------
// Regras de encaixe
// ---------------------------------------------------------------------------

/** Pontas que ainda são curinga do Cristal de `seat` (somem se o rival cobrir a pedra). */
export function wildSidesFor(state, seat = 'player') {
  const wild = state.fx?.wild;
  if (!wild || wild.seat !== seat || !state.board.root) return [];
  return wild.sides.filter((side) => endTileId(state.board, side) === wild.tileId);
}

/**
 * Regras de encaixe de `seat` agora: talismãs do dono (Borracha, Bucha de Aço),
 * curinga do Cristal e pontas travadas pelo Chumbo do adversário.
 */
export function rulesFor(state, seat, { frozen = true } = {}) {
  let rules = BASE_RULES;
  for (const relic of relicsOf(state, seat)) {
    const extra = relic.rules?.(state, seat);
    if (extra) rules = { ...rules, ...extra };
  }
  const wildSides = wildSidesFor(state, seat);
  if (wildSides.length) rules = { ...rules, wildSides };
  const frozenSides = frozen ? (state.fx?.frozen?.[seat] ?? []) : [];
  if (frozenSides.length) rules = { ...rules, frozenSides };
  return rules;
}

/** Poderes que valem para decidir se a mesa trancou de vez (o Chumbo passa no fim da vez, então não conta). */
export function trancaRulesFor(state) {
  return { player: rulesFor(state, 'player', { frozen: false }), tioZe: rulesFor(state, 'tioZe', { frozen: false }) };
}

/**
 * Valor de cada pedra na contagem da tranca, por lado: Chave de Fenda (bucha
 * vale 0) e o peso do rival (Alemão do Ferro Velho: as pedras dele valem 2×).
 */
export function trancaTileValues(state) {
  const values = {};
  for (const seat of ['player', 'tioZe']) {
    const relic = relicsOf(state, seat).find((r) => r.trancaTileValue);
    const weight = seat === 'tioZe' ? (rivalMechanics(state).trancaWeight ?? 1) : 1;
    if (!relic && weight === 1) continue;
    const base = relic ? relic.trancaTileValue : pipSum;
    values[seat] = weight === 1 ? base : (tile) => base(tile) * weight;
  }
  return values;
}

/**
 * Pedras da SUA mão que o rival enxerga: Paulinho Pente Fino vê a mais pesada,
 * Madama Sofia prevê as suas buchas. A IA dele usa isso; a sua tela marca essas pedras.
 */
export function knownPlayerTiles(state) {
  const mech = rivalMechanics(state);
  const hand = state.hands.player;
  const known = new Map();
  if (mech.exposeHeaviest && hand.length) {
    const heaviest = hand.slice().sort((x, y) => pipSum(y) - pipSum(x) || y.b - x.b)[0];
    known.set(heaviest.id, heaviest);
  }
  if (mech.predictDoubles) {
    for (const tile of hand) if (tile.a === tile.b) known.set(tile.id, tile);
  }
  return [...known.values()];
}

/** Pedra que o lado é obrigado a usar para abrir a mesa (só se ele tiver a pedra). */
export function requiredOpeningFor(state, seat) {
  if (state.board.root || !state.openingTileId) return null;
  return state.hands[seat].some((t) => t.id === state.openingTileId) ? state.openingTileId : null;
}

// ---------------------------------------------------------------------------
// Ganchos
// ---------------------------------------------------------------------------

/** Roda um gancho nos talismãs de `seat`, na ordem dos slots. */
export function runRelicHook(state, seat, hook, ctx = {}) {
  let next = state;
  for (const id of state.relics[seat] ?? []) {
    const fn = RELICS[id]?.[hook];
    if (typeof fn === 'function') next = fn(next, { ...ctx, owner: seat, foe: other(seat) });
  }
  return next;
}

/** Talismã de `seat` que dá vez extra nessa jogada (ou null). */
export function relicExtraTurn(state, seat, ctx) {
  const full = { ...ctx, owner: seat, foe: other(seat) };
  return relicsOf(state, seat).find((r) => r.extraTurn?.(state, full))?.id ?? null;
}

/** Quantas pedras você vê ao comprar (Barbante Mágico: 3). Rivais compram normal. */
export function drawOptionsFor(state, seat) {
  if (seat !== 'player') return 1;
  return Math.max(1, ...relicsOf(state, seat).map((r) => r.drawOptions ?? 1));
}

/** Dano da batida de `seat` depois dos talismãs (somas antes, multiplicações depois). */
export function applyBatidaDamage(state, seat, base) {
  const ctx = { owner: seat, foe: other(seat) };
  const relics = relicsOf(state, seat)
    .filter((r) => r.batidaDamage)
    .sort((p, q) => (p.order ?? 0) - (q.order ?? 0));
  let damage = base;
  const steps = [];
  for (const relic of relics) {
    const after = relic.batidaDamage(damage, state, ctx);
    if (after !== damage) {
      steps.push({ id: relic.id, before: damage, after });
      damage = after;
    }
  }
  return { damage, steps };
}

/** Pedras aprimoradas de `seat` que contam "na mão ou na mesa" (Ouro). */
export function enhancedTilesInPlay(state, seat) {
  const onBoard = boardTilesInOrder(state.board).filter((t) => t.by === seat);
  return [...state.hands[seat], ...onBoard].filter((t) => getEnhancement(t.enhancement));
}

// ---------------------------------------------------------------------------
// O que a sua tela mostra
// ---------------------------------------------------------------------------

/** O Relógio Quebrado pode ser usado agora? */
export function canUndo(state) {
  return (
    state.phase === 'playing' &&
    state.turn === 'player' &&
    !state.pending &&
    hasRelic(state, 'player', 'relogio') &&
    !isUsed(state, 'player', 'relogio') &&
    Boolean(state.fx.undo)
  );
}

/** Pedras da mão do rival que você enxerga (Olho de Vidro, Espelho Retrovisor). */
export function revealedTioZeTiles(state) {
  const hand = state.hands.tioZe;
  const shown = new Map();
  for (const relic of relicsOf(state, 'player')) {
    if (relic.reveal?.topTiles) {
      hand
        .slice()
        .sort((x, y) => pipSum(y) - pipSum(x) || y.b - x.b)
        .slice(0, relic.reveal.topTiles)
        .forEach((t) => shown.set(t.id, t));
    }
    const lastDraw = state.fx.lastDraw?.tioZe;
    if (relic.reveal?.lastDraw && lastDraw) {
      const drawn = hand.find((t) => t.id === lastDraw);
      if (drawn) shown.set(drawn.id, drawn);
    }
  }
  return [...shown.values()];
}

/**
 * Marcas nas pontas abertas:
 *   'frozen'  o rival não pode jogar ali na vez dele (seu Chumbo)
 *   'blocked' você não pode jogar ali nesta vez (Chumbo do rival)
 *   'wild'    curinga do seu Cristal
 */
export function endMarksFor(state) {
  const marks = {};
  if (!state.board.root) return marks;
  for (const side of state.fx.frozen.tioZe) marks[side] = 'frozen';
  for (const side of state.fx.frozen.player) marks[side] = 'blocked';
  for (const side of wildSidesFor(state, 'player')) marks[side] = marks[side] === 'blocked' ? 'blocked' : 'wild';
  return marks;
}

/** Talismãs de `seat` já usados nesta rodada (aparecem apagados na hotbar). */
export const spentRelicsOf = (state, seat) => state.fx.used[seat];
