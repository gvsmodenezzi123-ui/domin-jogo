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
import { rivalOf } from '../data/rivals.js';
import {
  BASE_RULES,
  boardTilesInOrder,
  endTileId,
  getDrawAvailability,
  getPassAvailability,
  getPlayableMoves,
  isTurnExhausted,
  PASS_FEE,
  makeTile,
  pipSum,
} from './dominoLogic.js';
import { fiadoAvailable, maxDrawsFor } from './loadout.js';
import { HIGH_STAKES_PASS_FEE, SMOKE_DRAW_COINS, tableModIs } from '../data/tableModifiers.js';

export const other = (seat) => (seat === 'player' ? 'tioZe' : 'player');

export const relicsOf = (state, seat) => (state.relics[seat] ?? []).map(getRelic).filter(Boolean);

export const hasRelic = (state, seat, id) => (state.relics[seat] ?? []).includes(id);

/** Regras próprias do rival da partida (ver `mechanics` em data/rivals.js). */
export const rivalMechanics = (state) => rivalOf(state).mechanics ?? {};

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
  let wildSides = wildSidesFor(state, seat);
  for (const relic of relicsOf(state, seat)) {
    const extra = relic.rules?.(state, seat);
    if (!extra) continue;
    // pontas curinga de talismãs (Relógio de Parede) somam com as do Cristal
    if (extra.wildSides) wildSides = [...new Set([...wildSides, ...extra.wildSides])];
    rules = { ...rules, ...extra };
  }
  if (wildSides.length) rules = { ...rules, wildSides };
  else if (rules.wildSides) rules = { ...rules, wildSides: undefined };
  const frozenSides = frozen ? (state.fx?.frozen?.[seat] ?? []) : [];
  if (frozenSides.length) rules = { ...rules, frozenSides };
  // Mesa Desnivelada (Patch 0.9.4): a 1ª pedra de cada ponta deixa par na esquerda e ímpar na direita
  if (tableModIs(state, 'mesaDesnivelada')) rules = { ...rules, tilted: true };
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

/** Quantas pedras você vê ao comprar (Barbante Mágico: 3). Rivais compram normal (no online, os dois lados escolhem). */
export function drawOptionsFor(state, seat) {
  if (seat !== 'player' && !state.pvp) return 1;
  return Math.max(1, ...relicsOf(state, seat).map((r) => r.drawOptions ?? 1));
}

/** Dano da batida de `seat` depois dos talismãs (somas antes, multiplicações depois). */
export function applyBatidaDamage(state, seat, base, tile = null) {
  const ctx = { owner: seat, foe: other(seat), tile };
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

/** `seat` tem alguma pedra que encaixa agora (com os talismãs e as pontas travadas dele)? */
export function hasPlayFor(state, seat) {
  return getPlayableMoves(state.hands[seat], state.board, requiredOpeningFor(state, seat), rulesFor(state, seat)).length > 0;
}

/** Quantos corações custa a compra paga com coração para `seat` (Pacto do Coveiro: 2). */
export function heartDrawCostFor(state, seat) {
  return relicsOf(state, seat).reduce((cost, relic) => Math.max(cost, relic.heartDrawCost ?? 1), 1);
}

/** Dano da tranca para quem perde a soma (Tranca Cadavérica, em qualquer um dos lados: 3). */
export function trancaDamageFor(state) {
  return [...relicsOf(state, 'player'), ...relicsOf(state, 'tioZe')].reduce((dmg, relic) => Math.max(dmg, relic.trancaDamage ?? 0), 0);
}

/** A próxima compra de `seat` neste turno (escada grátis → $3 → coração; Maleta Seca: só 1). */
export function drawAvailabilityFor(state, seat) {
  return getDrawAvailability({
    drawsThisTurn: state.drawsThisTurn,
    boneyardCount: state.boneyard.length,
    coins: state.coins[seat],
    hearts: state.hearts[seat],
    heartCost: heartDrawCostFor(state, seat),
    maxDraws: maxDrawsFor(state, seat),
    // Fumaça Densa (Patch 0.9.4): a compra paga em moedas sobe para $4
    coinCost: tableModIs(state, 'fumacaDensa') ? SMOKE_DRAW_COINS : null,
  });
}

/** Quanto custa o passe estratégico de `seat` ($3; Moeda Furada: $1; Fiado de Rua: o 1º da run de graça). */
export function passFeeFor(state, seat = 'player') {
  if (seat === 'player' && fiadoAvailable(state)) return 0;
  // Aposta Alta (Patch 0.9.4): o passe voluntário custa $5 (a Moeda Furada ainda barateia)
  const base = tableModIs(state, 'apostaAlta') ? HIGH_STAKES_PASS_FEE : PASS_FEE;
  return relicsOf(state, seat).reduce((fee, relic) => Math.min(fee, relic.passFee ?? base), base);
}

/** Regra do PASSAR A VEZ do jogador agora (ver `getPassAvailability`); `fiado` marca o passe na conta. */
export function passAvailabilityFor(state, seat = 'player') {
  const rule = getPassAvailability({
    hasPlay: hasPlayFor(state, seat),
    drawsThisTurn: state.drawsThisTurn,
    boneyardCount: state.boneyard.length,
    coins: state.coins[seat],
    fee: passFeeFor(state, seat),
  });
  return isStrategicPass(state, seat) && seat === 'player' && fiadoAvailable(state) ? { ...rule, fiado: true } : rule;
}

/** Passe estratégico: dava para jogar e ainda não comprou no turno (é o que custa $3). */
export function isStrategicPass(state, seat) {
  return state.drawsThisTurn === 0 && hasPlayFor(state, seat);
}

/** Ajuste na soma da tranca por lado (Balança de Açougue: −10). */
export function trancaSumOffsets(state) {
  const offset = {};
  for (const seat of ['player', 'tioZe']) {
    const total = relicsOf(state, seat).reduce((sum, relic) => sum + (relic.trancaSumOffset ?? 0), 0);
    if (total) offset[seat] = total;
  }
  return offset;
}

/** O Canivete Suíço pode ser aberto agora (sua vez, 1x por partida; no online, 1x para cada lado)? */
export function canUseCanivete(state, seat = 'player') {
  const used = state.pvp ? Boolean(state.matchFx?.caniveteBy?.[seat]) : Boolean(state.matchFx?.caniveteUsed);
  return (
    state.phase === 'playing' &&
    state.turn === seat &&
    !state.pending &&
    hasRelic(state, seat, 'canivete') &&
    !used &&
    state.hands[seat].length > 0
  );
}

/**
 * A sua vez acabou sem saída: comprou, nada encaixa e não dá para comprar de novo.
 * O Relógio Quebrado pronto ainda é uma saída (desfazer a jogada do rival).
 */
export function playerTurnExhausted(state, seat = 'player') {
  if (state.phase !== 'playing' || state.turn !== seat || state.pending || !state.board.root) return false;
  if (seat === 'player' && canUndo(state)) return false;
  return isTurnExhausted({
    hasPlay: hasPlayFor(state, seat),
    drawsThisTurn: state.drawsThisTurn,
    drawAllowed: drawAvailabilityFor(state, seat).allowed,
  });
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
  // Cinzeiro Cheio de Bitucas: pedras que ficaram à mostra depois de ele passar seguido
  for (const id of state.fx.revealed ?? []) {
    const tile = hand.find((t) => t.id === id);
    if (tile) shown.set(tile.id, tile);
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
  // curinga do Cristal e do Relógio de Parede do Bar
  for (const side of rulesFor(state, 'player', { frozen: false }).wildSides ?? []) marks[side] = marks[side] === 'blocked' ? 'blocked' : 'wild';
  // Mesa Bêbada: ponta com o número trocado
  for (const side of Object.keys(state.board.drunk ?? {})) marks[side] = marks[side] ?? 'drunk';
  return marks;
}

/** Talismãs de `seat` já usados nesta rodada (aparecem apagados na hotbar). */
export const spentRelicsOf = (state, seat) => state.fx.used[seat];
