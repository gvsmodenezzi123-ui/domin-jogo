/**
 * Estado da run e transições. Reducer puro: toda aleatoriedade (o baralho
 * embaralhado e a `seed` da run) chega pronta dentro da ação.
 *
 * Fases:
 *   'title' → 'map' → 'playing' ⇄ 'roundOver' → 'matchWon' → 'shop' → 'map' → ...
 *                                             ↘ 'gameOver' (você zerou: fim da run)
 *                                  (último chefe) → 'runWon'
 *
 * Uma RUN é a campanha de 18 nós (data/campaign.js), cada nó uma PARTIDA contra
 * um rival. A partida acaba quando alguém zera os corações; vencer abre a Loja
 * Clandestina e libera o próximo nó do mapa. Moedas, talismãs, o seu baralho
 * (pedras de grife) e os seus corações passam de um nó para o outro: vencer um
 * nó cura 2♥, vencer um chefe cura tudo.
 *
 * Efeitos colaterais (som, banners, falas) não acontecem aqui: o reducer emite
 * eventos em `state.events`, cada um com um `seq` crescente, e a UI reage.
 *
 * Cadeiras: 'player' (você) e 'tioZe' (o rival da partida, qualquer que seja).
 */

import { buildTioZeView, decideTioZeAction } from '../ai/tioZeAI.js';
import { ENHANCEMENT_IDS, getEnhancement } from '../data/enhancedTiles.js';
import { RELICS, RELIC_SLOTS, getRelic, markUsed } from '../data/relics.js';
import { FINAL_BOSS, HEAL_AFTER_NODE } from '../data/campaign.js';
import { FIRST_RIVAL, RIVALS, getRival } from '../data/rivals.js';
import { buildMarket, marketBuyBlock } from './blackMarket.js';
import { availableNodes, campaignOf, coinReward, currentNode } from './campaignMap.js';
import {
  DAMAGE,
  MAX_HEARTS,
  MULTIPLE_OF_FIVE_BONUS,
  STARTING_COINS,
  boardTilesInOrder,
  classifyBatida,
  createEmptyBoard,
  dealFromDeck,
  endsSum,
  findOpening,
  getDrawAvailability,
  getOpenEnds,
  getPlacement,
  getTrancaReason,
  getValidSides,
  isDouble,
  isMultipleOfFive,
  placeTile,
  resolveTranca,
  tileId as canonicalId,
} from './dominoLogic.js';
import { cheatDeath, directDamage, emit, gainCoins, loseCoins, patchFx, proc } from './effects.js';
import {
  applyBatidaDamage,
  canUndo,
  rivalMechanics,
  dressTile,
  drawOptionsFor,
  enhancedTilesInPlay,
  hasRelic,
  heartDrawCostFor,
  passAvailabilityFor,
  plainTiles,
  playerTurnExhausted,
  relicExtraTurn,
  requiredOpeningFor,
  rulesFor,
  runRelicHook,
  trancaDamageFor,
  trancaRulesFor,
  trancaTileValues,
} from './powers.js';
import { isValidSave } from './save.js';
import { buildShop, relicBuyBlock, sellPriceOf, tileBuyBlock } from './shop.js';

export const SEATS = Object.freeze(['player', 'tioZe']);
export const other = (seat) => (seat === 'player' ? 'tioZe' : 'player');

/** Moedas por partida vencida (mais o bônus do rival, ver `prizeBonus`). */
export const MATCH_PRIZE = 8;

const bySeat = (player, tioZe) => ({ player, tioZe });

/** Efeitos que valem só dentro de uma rodada, separados por cadeira. */
export function createRoundFx() {
  return {
    frozen: bySeat([], []), // pontas que cada lado não pode usar na próxima vez (Chumbo do adversário)
    wild: null, // { seat, tileId, sides }: curinga do Cristal, só na próxima jogada do dono
    ruby: null, // cadeira que toma dano se comprar/passar em seguida (Rubi do adversário)
    misses: bySeat(0, 0), // compras/passes seguidos (Dedal de Chumbo)
    used: bySeat([], []), // talismãs de uso único já gastos na rodada (Borracha, Relógio)
    undo: null, // Relógio: como estava antes da última jogada do rival
    lastDraw: bySeat(null, null), // última pedra comprada (Espelho Retrovisor)
  };
}

/** Efeitos que valem a partida inteira: escudo do Comendador, Falsa Partida e a compra forçada dela. */
export function createMatchFx() {
  return { shieldUsed: false, falsaUsed: bySeat(false, false), forcedDraw: null };
}

export function createInitialState() {
  const rival = getRival(FIRST_RIVAL);
  return {
    phase: 'title',
    round: 0,
    board: createEmptyBoard(),
    boneyard: [],
    hands: bySeat([], []),
    hearts: bySeat(MAX_HEARTS, rival.hearts),
    maxHearts: bySeat(MAX_HEARTS, rival.hearts),
    coins: bySeat(STARTING_COINS, rival.coins),
    turn: 'player',
    drawsThisTurn: 0,
    consecutivePasses: 0,
    openingTileId: null,
    nextStarter: null,
    roundResult: null,
    duelWinner: null,
    lastPlay: null,
    memory: { playerMissing: [] },
    stats: { roundsWon: bySeat(0, 0), coinsEarned: 0, matchesWon: 0 },
    relics: bySeat([], []),
    decks: bySeat({}, {}), // { tileId: aprimoramento } — as pedras trocadas no baralho de cada lado
    rivalId: rival.id,
    // Patch 0.6.1, mapa em teia (engine/campaignMap.js):
    //   node: id do nó onde você está (null antes do 1º); cleared: nós concluídos;
    //   path: o caminho percorrido; match: partidas jogadas; history: rivais enfrentados
    run: { node: null, cleared: [], path: [], match: 0, history: [] },
    matchFx: createMatchFx(), // efeitos que valem a partida inteira
    shop: null,
    market: null, // Mercado Negro do Corvo da Madrugada
    coinEvent: null, // prêmio do Seu Tião das Moedas
    fx: createRoundFx(),
    pending: null,
    seed: null,
    events: [],
    seq: 0,
  };
}

const tone = (seat) => (seat === 'player' ? 'player' : 'enemy');

// ---------------------------------------------------------------------------
// Partida e rodada
// ---------------------------------------------------------------------------

function startRound(state, deck) {
  const { hands, boneyard } = dealFromDeck(deck);
  let next = {
    ...state,
    phase: 'playing',
    round: state.round + 1,
    board: createEmptyBoard(),
    boneyard,
    hands,
    drawsThisTurn: 0,
    consecutivePasses: 0,
    openingTileId: null,
    roundResult: null,
    lastPlay: null,
    memory: { playerMissing: [] },
    fx: createRoundFx(),
    pending: null,
  };
  // Dado Viciado mexe nas pedras ainda comuns; depois cada lado "veste" as suas
  next = runRelicHook(next, 'player', 'onDeal');
  next = runRelicHook(next, 'tioZe', 'onDeal');
  next = {
    ...next,
    hands: {
      player: next.hands.player.map((t) => dressTile(next, 'player', t)),
      tioZe: next.hands.tioZe.map((t) => dressTile(next, 'tioZe', t)),
    },
  };

  // Falsa Partida no fim da rodada passada: quem foi poupado faz o adversário comprar agora
  const forced = next.matchFx?.forcedDraw;
  if (forced) {
    for (const seat of SEATS) {
      const count = forced[seat] ?? 0;
      if (!count) continue;
      const taken = next.boneyard.slice(0, count).map((t) => dressTile(next, seat, t));
      next = { ...next, boneyard: next.boneyard.slice(taken.length), hands: { ...next.hands, [seat]: [...next.hands[seat], ...taken] } };
    }
    next = { ...next, matchFx: { ...next.matchFx, forcedDraw: null } };
  }

  let starter = state.nextStarter;
  let openingTileId = null;
  if (!starter) {
    const opening = findOpening(next.hands);
    starter = opening.starter;
    openingTileId = opening.tileId;
  }
  next = { ...next, turn: starter, openingTileId };
  return emit(next, { type: 'roundStart', round: next.round, starter, openingTileId });
}

/** Nova partida contra `rivalId`: rival com os corações, talismãs e o baralho dele; os seus corações continuam. */
function startMatch(state, rivalId, deck, { advance = true } = {}) {
  const rival = getRival(rivalId);
  let next = {
    ...state,
    rivalId: rival.id,
    run: advance
      ? { ...state.run, match: state.run.match + 1, history: [...state.run.history, rival.id] }
      : { ...state.run, history: [...state.run.history.slice(0, -1), rival.id] },
    relics: { ...state.relics, tioZe: [...rival.relics] },
    decks: { ...state.decks, tioZe: { ...rival.deck } },
    hearts: bySeat(Math.max(1, state.hearts.player), rival.hearts),
    maxHearts: bySeat(MAX_HEARTS, rival.hearts),
    matchFx: createMatchFx(),
    coins: { ...state.coins, tioZe: rival.coins },
    round: 0,
    nextStarter: null,
    duelWinner: null,
    roundResult: null,
    shop: null,
  };
  next = emit(next, { type: 'duelStart', rivalId: rival.id, match: next.run.match });
  return startRound(next, deck);
}

/**
 * Alguém zerou: se foi o rival, você vence o nó (prêmio e cura; o nó fica concluído e
 * o mapa abre os próximos caminhos; o chefe final encerra a run); se foi você, a run acaba.
 */
function endMatch(state, winner) {
  if (winner === 'player') {
    const node = currentNode(state);
    const rival = getRival(state.rivalId);
    const boss = node ? node.boss : rival.boss;
    const runWon = node ? node.boss && node.region === campaignOf(state).regions.length : rival.id === FINAL_BOSS;
    const prize = MATCH_PRIZE + rival.prizeBonus;
    const healed = boss ? MAX_HEARTS : Math.min(MAX_HEARTS, state.hearts.player + HEAL_AFTER_NODE);
    const heal = healed - state.hearts.player;
    const cleared = node && !state.run.cleared.includes(node.id) ? [...state.run.cleared, node.id] : state.run.cleared;
    let next = {
      ...state,
      phase: runWon ? 'runWon' : 'matchWon',
      duelWinner: 'player',
      nextStarter: null,
      pending: null,
      hearts: { ...state.hearts, player: healed },
      run: { ...state.run, cleared },
      stats: { ...state.stats, matchesWon: state.stats.matchesWon + 1 },
    };
    next = gainCoins(next, 'player', prize, 'prize');
    next = { ...next, roundResult: next.roundResult ? { ...next.roundResult, prize, heal } : next.roundResult };
    return emit(next, { type: 'duelEnd', winner: 'player', prize, heal, runWon, boss, region: node?.region ?? rival.region });
  }
  const next = { ...state, phase: 'gameOver', duelWinner: 'tioZe', nextStarter: null, pending: null };
  return emit(next, { type: 'duelEnd', winner: 'tioZe' });
}

function finishRound(state, incoming) {
  let next = { ...state, pending: null };
  let result = incoming;
  // Comendador Moreira: o primeiro dano de tranca da partida não pega
  if (
    result.kind === 'tranca' &&
    result.winner === 'player' &&
    result.damage > 0 &&
    rivalMechanics(next).trancaShield &&
    !next.matchFx.shieldUsed
  ) {
    result = { ...result, damage: 0, shielded: true };
    next = { ...next, matchFx: { ...next.matchFx, shieldUsed: true } };
    next = proc(next, { source: 'rival', id: next.rivalId, text: 'IMUNE À PRIMEIRA TRANCA', tone: 'enemy', owner: 'tioZe' });
  }
  if (result.cadaverica && result.damage > 0) {
    const text = result.loser === 'player' ? `TRANCA CADAVÉRICA: −${result.damage}♥ EM VOCÊ` : `TRANCA CADAVÉRICA: −${result.damage}♥ NO RIVAL`;
    next = proc(next, { source: 'relic', id: 'trancaCadaverica', text, tone: result.loser === 'player' ? 'enemy' : 'player', owner: 'player' });
  }
  if (result.winner) {
    // Ouro: bônus por pedra de ouro do vencedor na mão ou na mesa
    for (const tile of enhancedTilesInPlay(next, result.winner)) {
      const enhancement = getEnhancement(tile.enhancement);
      if (enhancement.onRoundWin) next = enhancement.onRoundWin(next, { tile, owner: result.winner, foe: other(result.winner) });
    }
  }
  next = emit({ ...next, roundResult: result }, { type: 'roundEnd', result });

  if (!result.winner || result.damage <= 0) {
    return { ...next, phase: 'roundOver', nextStarter: result.shielded ? result.winner : null };
  }

  const loser = other(result.winner);
  const hearts = { ...next.hearts, [loser]: Math.max(0, next.hearts[loser] - result.damage) };
  const stats = {
    ...next.stats,
    roundsWon: { ...next.stats.roundsWon, [result.winner]: next.stats.roundsWon[result.winner] + 1 },
  };
  next = emit({ ...next, hearts, stats }, { type: 'heartLost', who: loser, amount: result.damage, reason: result.kind });

  // Falsa Partida: o golpe fatal deixa o dono com 1 coração (uma vez por partida)
  // (a rodada já acabou: a compra forçada do rival fica para o começo da próxima)
  if (hearts[loser] === 0) next = cheatDeath({ ...next, phase: 'roundOver' }, loser);
  if (next.hearts[loser] === 0) return endMatch(next, result.winner);
  return { ...next, phase: 'roundOver', nextStarter: result.winner };
}

/** Alguém zerou os corações no meio da rodada (dano direto): a partida acaba na hora. */
function checkKnockout(state) {
  const loser = SEATS.find((seat) => state.hearts[seat] <= 0);
  if (!loser) return null;
  const winner = other(loser);
  const lastHit = [...state.events].reverse().find((e) => e.type === 'heartLost' && e.who === loser);
  const result = {
    kind: 'nocaute',
    winner,
    loser,
    damage: 0,
    reason: lastHit?.reason ?? null,
    sums: null,
    lastTileId: state.lastPlay?.tileId ?? null,
  };
  const stats = {
    ...state.stats,
    roundsWon: { ...state.stats.roundsWon, [winner]: state.stats.roundsWon[winner] + 1 },
  };
  const next = emit({ ...state, pending: null, roundResult: result, stats }, { type: 'roundEnd', result });
  return endMatch(next, winner);
}

function trancaResult(state, reason) {
  let result = {
    ...resolveTranca(state.hands, trancaTileValues(state)),
    reason,
    lastTileId: state.lastPlay?.tileId ?? null,
  };
  // Tranca Cadavérica (de qualquer um dos lados): quem perde a soma toma 3 corações
  const cadaverica = trancaDamageFor(state);
  if (cadaverica && result.winner && result.damage > 0 && cadaverica > result.damage) {
    result = { ...result, damage: cadaverica, baseDamage: result.damage, cadaverica: true };
  }
  return result;
}

function checkTranca(state) {
  const tranca = getTrancaReason(state, trancaRulesFor(state));
  return tranca ? finishRound(state, trancaResult(state, tranca)) : null;
}

/** Pontas de agora entram na lista de "o jogador parece não ter". */
function rememberPlayerMissing(state) {
  const ends = getOpenEnds(state.board);
  if (!ends) return state.memory;
  const set = new Set(state.memory.playerMissing);
  set.add(ends.left);
  set.add(ends.right);
  return { ...state.memory, playerMissing: [...set].sort((a, b) => a - b) };
}

function canAct(state, actor) {
  return state.phase === 'playing' && SEATS.includes(actor) && state.turn === actor && !state.pending;
}

/** Passa a vez. O Chumbo que travava quem jogou derrete; quando a SUA vez termina, o Relógio perde a chance. */
function endTurn(state, from) {
  const fx = {
    ...state.fx,
    frozen: { ...state.fx.frozen, [from]: [] },
    undo: from === 'player' ? null : state.fx.undo,
  };
  return { ...state, turn: other(from), fx };
}

/** `seat` comprou ou passou: Rubi do adversário, e os talismãs do adversário (Cinzeiro, Dedal, Espelho). */
function afterMiss(state, seat, ctx) {
  const { fx } = state;
  let next = patchFx(state, {
    misses: { ...fx.misses, [seat]: fx.misses[seat] + 1 },
    lastDraw: ctx.kind === 'draw' && ctx.tileId ? { ...fx.lastDraw, [seat]: ctx.tileId } : fx.lastDraw,
  });
  if (next.fx.ruby === seat) {
    next = directDamage(patchFx(next, { ruby: null }), seat, 1, 'rubi');
    next = proc(next, {
      source: 'tile',
      id: 'rubi',
      text: seat === 'tioZe' ? 'RUBI: −1♥ NO RIVAL' : 'RUBI DELE: −1♥ EM VOCÊ',
      tone: tone(other(seat)),
      owner: other(seat),
    });
  }
  return runRelicHook(next, other(seat), 'onFoeMiss', ctx);
}

const diff = (after, before) => bySeat(after.player - before.player, after.tioZe - before.tioZe);

// ---------------------------------------------------------------------------
// Ações de jogo
// ---------------------------------------------------------------------------

function playTile(state, { actor, tileId, side }) {
  if (!canAct(state, actor)) return state;
  const hand = state.hands[actor];
  const tile = hand.find((t) => t.id === tileId);
  if (!tile) return state;
  const required = requiredOpeningFor(state, actor);
  if (required && tile.id !== required) return state;
  const rules = rulesFor(state, actor);
  const placement = getPlacement(tile, state.board, side, rules);
  if (!placement) return state;

  const foe = other(actor);
  const endsBefore = getOpenEnds(state.board);
  const board = placeTile(state.board, tile, side, rules, { by: actor });
  const newHand = hand.filter((t) => t.id !== tile.id);

  let memory = state.memory;
  if (actor === 'player') {
    memory = { ...memory, playerMissing: memory.playerMissing.filter((v) => v !== tile.a && v !== tile.b) };
  }

  let next = {
    ...state,
    board,
    hands: { ...state.hands, [actor]: newHand },
    openingTileId: null,
    consecutivePasses: 0,
    drawsThisTurn: 0,
    lastPlay: { by: actor, tileId: tile.id, side },
    memory,
  };
  const { fx } = state;
  next = patchFx(next, {
    misses: { ...fx.misses, [actor]: 0 },
    ruby: fx.ruby === actor ? null : fx.ruby, // o alvo do Rubi jogou: desarma
    wild: fx.wild?.seat === actor ? null : fx.wild, // o curinga do Cristal vale só para a próxima jogada do dono
    undo: actor === 'player' ? null : fx.undo,
  });
  next = emit(next, {
    type: 'tilePlaced',
    by: actor,
    tileId: tile.id,
    side,
    double: isDouble(tile),
    enhancement: tile.enhancement ?? null,
    via: placement.via,
  });

  const multipleOfFive = isMultipleOfFive(board);
  if (multipleOfFive) {
    const coins = { ...next.coins, [actor]: next.coins[actor] + MULTIPLE_OF_FIVE_BONUS };
    const stats =
      actor === 'player' ? { ...next.stats, coinsEarned: next.stats.coinsEarned + MULTIPLE_OF_FIVE_BONUS } : next.stats;
    next = emit({ ...next, coins, stats }, {
      type: 'bonus5',
      by: actor,
      sum: endsSum(board),
      amount: MULTIPLE_OF_FIVE_BONUS,
    });
  }

  // Carlinhos Mão Leve: jogada que casa as duas pontas rouba moedas suas
  const steal = actor === 'tioZe' ? rivalMechanics(next).stealOnCross : 0;
  if (steal && endsBefore && classifyBatida(tile, endsBefore) === 'cruzada') {
    const taken = Math.min(steal, next.coins.player);
    if (taken > 0) {
      next = gainCoins(loseCoins(next, 'player', taken, 'steal'), 'tioZe', taken, 'steal');
      next = proc(next, { source: 'rival', id: next.rivalId, text: `MÃO LEVE: −$${taken}`, tone: 'enemy', owner: 'tioZe' });
    }
  }

  const ctx = { tile, side, placement, endsAfter: getOpenEnds(board), multipleOfFive };
  const enhancement = getEnhancement(tile.enhancement);
  if (enhancement?.onPlay) next = enhancement.onPlay(next, { ...ctx, owner: actor, foe });
  next = runRelicHook(next, actor, 'onPlay', ctx);

  let extraTurn = null;
  if (enhancement?.extraTurn) {
    extraTurn = { id: enhancement.id, source: 'tile', label: 'FANTASMA' };
  } else {
    const relicId = relicExtraTurn(next, actor, ctx);
    if (relicId) extraTurn = { id: relicId, source: 'relic', label: RELICS[relicId].short };
  }

  const knockout = checkKnockout(next);
  if (knockout) return knockout;

  if (newHand.length === 0) {
    const kind = classifyBatida(tile, endsBefore);
    const boosted = applyBatidaDamage(next, actor, DAMAGE[kind]);
    // Seu Arlindo, o Rei da Bucha: batida com carroça dele dói em dobro
    if (actor === 'tioZe' && isDouble(tile) && rivalMechanics(next).doubleBuchaDamage) {
      boosted.steps.push({ id: null, before: boosted.damage, after: boosted.damage * 2, label: 'REI DA BUCHA' });
      boosted.damage *= 2;
    }
    for (const step of boosted.steps) {
      next = proc(next, {
        source: step.id ? 'relic' : 'rival',
        id: step.id ?? next.rivalId,
        text: `${step.id ? RELICS[step.id].short : step.label}: DANO ${step.before}→${step.after}`,
        tone: tone(actor),
        owner: actor,
      });
    }
    return finishRound(next, {
      kind,
      winner: actor,
      loser: foe,
      damage: boosted.damage,
      baseDamage: DAMAGE[kind],
      reason: 'batida',
      lastTileId: tile.id,
      sums: null,
    });
  }

  const tranca = checkTranca(next);
  if (tranca) return tranca;

  // Relógio Quebrado: guarda como a mesa estava e o que essa jogada do rival mudou
  if (actor === 'tioZe' && state.board.root && next.boneyard === state.boneyard) {
    next = patchFx(next, {
      undo: {
        tileId: tile.id,
        board: state.board,
        hand,
        lastPlay: state.lastPlay,
        consecutivePasses: state.consecutivePasses,
        fx: { ...state.fx, undo: null },
        delta: { coins: diff(next.coins, state.coins), hearts: diff(next.hearts, state.hearts) },
      },
    });
  }

  if (extraTurn) {
    const text = actor === 'player' ? `${extraTurn.label}: JOGUE DE NOVO` : `${extraTurn.label} DELE: JOGA DE NOVO`;
    return proc(next, { source: extraTurn.source, id: extraTurn.id, text, tone: tone(actor), owner: actor });
  }
  return endTurn(next, actor);
}

function drawTile(state, { actor }) {
  if (!canAct(state, actor) || !state.board.root) return state;
  const availability = getDrawAvailability({
    drawsThisTurn: state.drawsThisTurn,
    boneyardCount: state.boneyard.length,
    coins: state.coins[actor],
    hearts: state.hearts[actor],
    heartCost: heartDrawCostFor(state, actor),
  });
  if (!availability.allowed) return state;

  const { cost } = availability;
  let next = {
    ...state,
    drawsThisTurn: state.drawsThisTurn + 1,
    memory: actor === 'player' ? rememberPlayerMissing(state) : state.memory,
  };
  if (cost.type === 'coins') {
    next = { ...next, coins: { ...next.coins, [actor]: next.coins[actor] - cost.amount } };
  }
  if (cost.type === 'heart') {
    next = { ...next, hearts: { ...next.hearts, [actor]: next.hearts[actor] - cost.amount } };
  }
  const heartCost = (s) =>
    cost.type === 'heart' ? emit(s, { type: 'heartLost', who: actor, amount: cost.amount, reason: 'draw' }) : s;
  // Beto Cigano, o Banqueiro: cada compra sua do dorme paga taxa para ele
  const fee = actor === 'player' ? (rivalMechanics(state).drawFee ?? 0) : 0;
  const charged = Math.min(fee, next.coins.player);
  if (charged > 0) {
    next = gainCoins(loseCoins(next, 'player', charged, 'fee'), 'tioZe', charged, 'fee');
    next = proc(next, { source: 'rival', id: state.rivalId, text: `TAXA DO BANQUEIRO −$${charged}`, tone: 'enemy', owner: 'tioZe' });
  }

  // Barbante Mágico: vê várias e escolhe (a escolha chega em DRAW_PICK)
  const options = Math.min(drawOptionsFor(state, actor), state.boneyard.length);
  if (options >= 2) {
    const picks = state.boneyard.slice(0, options).map((t) => dressTile(state, actor, t));
    next = { ...next, boneyard: state.boneyard.slice(options), pending: { type: 'drawChoice', options: picks, cost } };
    next = heartCost(emit(next, { type: 'drawPeek', by: actor, count: options, cost }));
    next = afterMiss(next, actor, { kind: 'draw', tileId: null });
    return checkKnockout(next) ?? next;
  }

  const [raw, ...boneyard] = state.boneyard;
  const tile = dressTile(state, actor, raw);
  next = { ...next, boneyard, hands: { ...next.hands, [actor]: [...next.hands[actor], tile] } };
  next = heartCost(emit(next, { type: 'drawTile', by: actor, tileId: tile.id, cost }));
  next = afterMiss(next, actor, { kind: 'draw', tileId: tile.id });
  const knockout = checkKnockout(next);
  if (knockout) return knockout;
  return checkTranca(next) ?? armForcedPass(next);
}

function pickDrawn(state, { tileId }) {
  const pending = state.pending;
  if (state.phase !== 'playing' || pending?.type !== 'drawChoice') return state;
  const chosen = pending.options.find((t) => t.id === tileId);
  if (!chosen) return state;
  const back = pending.options.filter((t) => t.id !== tileId);
  let next = {
    ...state,
    pending: null,
    hands: { ...state.hands, player: [...state.hands.player, chosen] },
    boneyard: [...state.boneyard, ...plainTiles(back)], // as outras voltam para o fundo do dorme
  };
  next = emit(next, { type: 'drawTile', by: 'player', tileId: chosen.id, cost: pending.cost, picked: true });
  return checkTranca(next) ?? armForcedPass(next);
}

/**
 * Sua vez sem saída (comprou, nada encaixa, não dá para comprar de novo): a mesa
 * trava as ações e avisa "SEM JOGADAS DISPONÍVEIS"; a tela mostra o banner, toca
 * o som de passe e só então manda o PASS forçado (`pending.type === 'forcedPass'`).
 */
function armForcedPass(state) {
  if (!playerTurnExhausted(state)) return state;
  return emit({ ...state, pending: { type: 'forcedPass' } }, { type: 'noMoves', by: 'player', draws: state.drawsThisTurn });
}

/**
 * Passa a vez. Para o jogador vale a regra do Patch 0.5.4 (`getPassAvailability`):
 * sem jogada, a 1ª compra é obrigatória; com jogada e sem compra, o passe custa $3;
 * depois de comprar, é de graça. O passe forçado (turno sem saída) não custa nada.
 */
function passTurn(state, { actor, intent }) {
  const forced = actor === 'player' && state.phase === 'playing' && state.turn === 'player' && state.pending?.type === 'forcedPass';
  if (!forced && (!canAct(state, actor) || !state.board.root)) return state;
  const rule = actor === 'player' && !forced ? passAvailabilityFor(state, 'player') : { allowed: true, cost: 0 };
  if (!rule.allowed) return state;
  const consecutivePasses = state.consecutivePasses + 1;
  let next = {
    ...state,
    pending: forced ? null : state.pending,
    consecutivePasses,
    drawsThisTurn: 0,
    memory: actor === 'player' ? rememberPlayerMissing(state) : state.memory,
  };
  if (rule.cost > 0) next = loseCoins(next, actor, rule.cost, 'pass');
  next = emit(next, { type: 'pass', by: actor, intent: intent ?? null, cost: rule.cost, forced });
  next = afterMiss(next, actor, { kind: 'pass' });
  // Cida da Marmita: você passou, ela come e recupera 1 coração
  if (actor === 'player' && rivalMechanics(next).healOnPlayerPass && next.hearts.tioZe < next.maxHearts.tioZe) {
    next = emit({ ...next, hearts: { ...next.hearts, tioZe: next.hearts.tioZe + 1 } }, { type: 'heartGained', who: 'tioZe', amount: 1 });
    next = proc(next, { source: 'rival', id: next.rivalId, text: 'MARMITA: +1♥ PRA CIDA', tone: 'enemy', owner: 'tioZe' });
  }
  const knockout = checkKnockout(next);
  if (knockout) return knockout;
  if (consecutivePasses >= 2) return finishRound(next, trancaResult(next, 'passes'));
  return endTurn(next, actor);
}

/** Giz de Sinuca: a pedra escolhida vai para o fundo do dorme. */
function discardTile(state, { tileId }) {
  if (state.phase !== 'playing' || state.pending?.type !== 'discard') return state;
  const hand = state.hands.player;
  const tile = hand.find((t) => t.id === tileId);
  if (!tile || hand.length < 2) return state;
  const next = {
    ...state,
    pending: null,
    hands: { ...state.hands, player: hand.filter((t) => t.id !== tileId) },
    boneyard: [...state.boneyard, ...plainTiles([tile])],
  };
  return emit(next, { type: 'discard', by: 'player', tileId });
}

function skipDiscard(state) {
  if (state.pending?.type !== 'discard') return state;
  return { ...state, pending: null };
}

/** Relógio Quebrado: a última pedra do rival volta para a mão dele, o que ela causou é desfeito e a vez continua sua. */
function undoTioZePlay(state) {
  if (!canUndo(state)) return state;
  const undo = state.fx.undo;
  const back = (now, delta, cap) =>
    bySeat(
      Math.max(0, Math.min(cap?.player ?? Infinity, now.player - delta.player)),
      Math.max(0, Math.min(cap?.tioZe ?? Infinity, now.tioZe - delta.tioZe)),
    );
  let next = {
    ...state,
    board: undo.board,
    hands: { ...state.hands, tioZe: undo.hand },
    coins: back(state.coins, undo.delta.coins),
    hearts: back(state.hearts, undo.delta.hearts, state.maxHearts),
    lastPlay: undo.lastPlay,
    consecutivePasses: 0,
    fx: { ...undo.fx, misses: state.fx.misses, lastDraw: state.fx.lastDraw, used: state.fx.used, undo: null },
  };
  next = markUsed(next, 'player', 'relogio');
  next = emit(next, { type: 'undo', tileId: undo.tileId });
  return proc(next, { source: 'relic', id: 'relogio', text: 'RELÓGIO: JOGADA DESFEITA', tone: 'player', owner: 'player' });
}

function tioZeAct(state) {
  if (!canAct(state, 'tioZe')) return state;
  const decision = decideTioZeAction(buildTioZeView(state, 'tioZe'));
  const next = gameReducer(state, decision);
  if (next !== state) return next;
  // Segurança: se a decisão foi rejeitada, joga qualquer pedra válida ou passa.
  const rules = rulesFor(state, 'tioZe');
  for (const tile of state.hands.tioZe) {
    for (const side of getValidSides(tile, state.board, rules)) {
      const played = gameReducer(state, { type: 'PLAY', actor: 'tioZe', tileId: tile.id, side });
      if (played !== state) return played;
    }
  }
  const passed = gameReducer(state, { type: 'PASS', actor: 'tioZe' });
  if (passed !== state) return passed;
  // mesa vazia e mão vazia (só pelo painel DEV): devolve a vez para não travar
  return emit(endTurn(state, 'tioZe'), { type: 'pass', by: 'tioZe', intent: null });
}

// ---------------------------------------------------------------------------
// Loja Clandestina (src/engine/shop.js monta a vitrine)
// ---------------------------------------------------------------------------

function buyRelic(state, { index }) {
  if (state.phase !== 'shop') return state;
  const offer = state.shop.relics[index];
  if (relicBuyBlock(state, offer)) return state;
  let next = loseCoins(state, 'player', offer.price, 'shop');
  next = {
    ...next,
    relics: { ...next.relics, player: [...next.relics.player, offer.id] },
    shop: { ...next.shop, relics: next.shop.relics.map((o, i) => (i === index ? { ...o, sold: true } : o)) },
  };
  return emit(next, { type: 'shopBuy', kind: 'relic', id: offer.id, price: offer.price });
}

/** A pedra de grife substitui a comum no SEU baralho (continua com 28). */
function buyTile(state, { index }) {
  if (state.phase !== 'shop') return state;
  const offer = state.shop.tiles[index];
  if (tileBuyBlock(state, offer)) return state;
  let next = loseCoins(state, 'player', offer.price, 'shop');
  next = {
    ...next,
    decks: { ...next.decks, player: { ...next.decks.player, [offer.tileId]: offer.enhancement } },
    shop: { ...next.shop, tiles: next.shop.tiles.map((o, i) => (i === index ? { ...o, sold: true } : o)) },
  };
  return emit(next, { type: 'shopBuy', kind: 'tile', id: offer.tileId, enhancement: offer.enhancement, price: offer.price });
}

function sellRelic(state, { id }) {
  if (state.phase !== 'shop' || !hasRelic(state, 'player', id)) return state;
  const price = sellPriceOf(id);
  let next = { ...state, relics: { ...state.relics, player: state.relics.player.filter((r) => r !== id) } };
  next = gainCoins(next, 'player', price, 'sell');
  return emit(next, { type: 'shopSell', id, price });
}

/** Reembaralhar: $3, $5, $8 e depois $12 por vez na mesma visita. */
function rerollShop(state) {
  if (state.phase !== 'shop' || state.coins.player < state.shop.rerollCost) return state;
  let next = loseCoins(state, 'player', state.shop.rerollCost, 'reroll');
  const rerolls = state.shop.rerolls + 1;
  next = { ...next, shop: buildShop(next, rerolls) };
  return emit(next, { type: 'shopReroll', rerolls });
}

/** Conclui o nó em que você está (loja, mercado ou evento visitado; combate vencido). */
function clearCurrent(state) {
  const id = state.run.node;
  if (!id || state.run.cleared.includes(id)) return state;
  return { ...state, run: { ...state.run, cleared: [...state.run.cleared, id] } };
}

/** Volta para o mapa da teia (sai da loja, do mercado, do evento ou da vitória). */
function backToMap(state, extra = {}) {
  const next = clearCurrent({ ...state, phase: 'map', shop: null, market: null, coinEvent: null, ...extra });
  return emit(next, { type: 'mapOpen', node: next.run.node });
}

/** Sai da loja para o mapa. */
function leaveShop(state) {
  if (state.phase !== 'shop') return state;
  return backToMap(state);
}

/** Depois de vencer o nó: o mapa abre os próximos caminhos (a loja agora é um caminho, não uma parada fixa). */
function continueToMap(state) {
  if (state.phase !== 'matchWon') return state;
  return backToMap(state);
}

/**
 * No mapa, escolhe um dos próximos nós (`nodeId`; sem ele, só vale se houver uma opção).
 *   combate/chefe → a mesa daquele rival (precisa de `deck`)
 *   loja          → Loja do Valtinho
 *   mercado negro → o beco do Corvo da Madrugada
 *   moedas        → o Seu Tião paga na hora ($1 a $12, fixo pela semente) e o nó já conta como feito
 */
function chooseNode(state, { nodeId, deck }) {
  if (state.phase !== 'map') return state;
  const options = availableNodes(state);
  const id = nodeId ?? (options.length === 1 ? options[0] : null);
  if (!id || !options.includes(id)) return state;
  const node = campaignOf(state).byId.get(id);
  if ((node.type === 'combat' || node.type === 'boss') && !deck) return state;
  const path = state.run.path.at(-1) === id ? state.run.path : [...state.run.path, id];
  let next = { ...state, run: { ...state.run, node: id, path } };
  next = emit(next, { type: 'nodeEnter', node: id, kind: node.type });
  switch (node.type) {
    case 'combat':
    case 'boss':
      return startMatch(next, node.rivalId, deck);
    case 'shop':
      next = { ...next, phase: 'shop', shop: buildShop(next, 0) };
      return emit(next, { type: 'shopOpen' });
    case 'black':
      next = { ...next, phase: 'blackMarket', market: buildMarket(next) };
      return emit(next, { type: 'marketOpen' });
    default: {
      const reward = coinReward(state.seed, id);
      next = clearCurrent({ ...next, phase: 'coinEvent', coinEvent: { reward } });
      next = gainCoins(next, 'player', reward, 'tiao');
      return emit(next, { type: 'coinEvent', reward });
    }
  }
}

/** Mercado Negro: compra um Necrótico da vitrine. */
function marketBuy(state, { index }) {
  if (state.phase !== 'blackMarket') return state;
  const offer = state.market.offers[index];
  if (marketBuyBlock(state, offer)) return state;
  let next = loseCoins(state, 'player', offer.price, 'market');
  next = {
    ...next,
    relics: { ...next.relics, player: [...next.relics.player, offer.id] },
    market: { ...next.market, offers: next.market.offers.map((o, i) => (i === index ? { ...o, sold: true } : o)) },
  };
  return emit(next, { type: 'marketBuy', id: offer.id, price: offer.price });
}

function leaveMarket(state) {
  if (state.phase !== 'blackMarket') return state;
  return backToMap(state);
}

function leaveEvent(state) {
  if (state.phase !== 'coinEvent') return state;
  return backToMap(state);
}

/** Run nova, parada no mapa antes do primeiro nó (a teia sai da semente). */
function newRun(state, action) {
  const relics = (action.relics ?? []).filter((id) => getRelic(id)).slice(0, RELIC_SLOTS);
  const fresh = {
    ...createInitialState(),
    phase: 'map',
    relics: bySeat(relics, []),
    decks: bySeat({ ...(action.playerDeck ?? {}) }, {}),
    seed: Number.isFinite(action.seed) ? action.seed >>> 0 : null,
    seq: state.seq,
    events: state.events,
  };
  return emit(fresh, { type: 'runStart' });
}

/** CONTINUAR: volta para o mapa (ou para a loja / o mercado) exatamente como o save guardou. */
function loadRun(state, { save }) {
  if (!isValidSave(save)) return state;
  const phase = save.resume === 'shop' ? 'shop' : save.resume === 'blackMarket' ? 'blackMarket' : 'map';
  let next = {
    ...createInitialState(),
    phase,
    seed: save.seed ?? null,
    run: { node: save.node, cleared: [...save.cleared], path: [...save.path], match: save.match, history: [...save.history] },
    coins: bySeat(save.coins, 0),
    relics: bySeat([...save.relics], []),
    decks: bySeat({ ...save.deck }, {}),
    stats: {
      roundsWon: { ...createInitialState().stats.roundsWon, ...save.stats?.roundsWon },
      coinsEarned: save.stats?.coinsEarned ?? 0,
      matchesWon: save.stats?.matchesWon ?? 0,
    },
    seq: state.seq,
    events: state.events,
  };
  const rival = getRival(currentNode(next)?.rivalId ?? FIRST_RIVAL);
  next = {
    ...next,
    rivalId: rival.id,
    hearts: bySeat(save.hearts, rival.hearts),
    maxHearts: bySeat(MAX_HEARTS, rival.hearts),
    coins: bySeat(save.coins, rival.coins),
  };
  if (phase === 'shop') next = { ...next, shop: save.shop ? { ...save.shop } : buildShop(next, 0) };
  if (phase === 'blackMarket') next = { ...next, market: save.market ? { offers: save.market.offers.map((o) => ({ ...o })) } : buildMarket(next) };
  return emit(next, { type: 'runLoaded', node: save.node });
}

// ---------------------------------------------------------------------------
// Painel DEV (src/components/DevPanel.jsx)
// ---------------------------------------------------------------------------

const DEV_PLAYING_ONLY = new Set(['addTile', 'damageTioZe', 'emptyTioZeHand', 'clearBoard', 'forceTranca', 'winMatch']);

/** Põe [a|b] na sua mão: puxa do dorme ou do rival; se a pedra estiver na mesa, cria uma cópia. */
function devAddTile(state, { a, b, enhancement }) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (!Number.isInteger(lo) || lo < 0 || hi > 6) return state;
  const id = canonicalId(lo, hi);
  const enh = ENHANCEMENT_IDS.includes(enhancement) ? enhancement : null;
  const make = (tid) => (enh ? { id: tid, a: lo, b: hi, enhancement: enh } : { id: tid, a: lo, b: hi });

  let { player, tioZe } = state.hands;
  let { boneyard, openingTileId } = state;
  if (player.some((t) => t.id === id)) {
    player = player.map((t) => (t.id === id ? make(id) : t));
  } else if (boneyard.some((t) => t.id === id)) {
    boneyard = boneyard.filter((t) => t.id !== id);
    player = [...player, make(id)];
  } else if (tioZe.some((t) => t.id === id)) {
    tioZe = tioZe.filter((t) => t.id !== id);
    player = [...player, make(id)];
    if (openingTileId === id) openingTileId = null;
  } else {
    const taken = new Set(
      [...boardTilesInOrder(state.board), ...player, ...tioZe, ...(state.pending?.options ?? [])].map((t) => t.id),
    );
    let n = 2;
    while (taken.has(`${id}#${n}`)) n += 1;
    player = [...player, make(`${id}#${n}`)];
  }
  let next = { ...state, hands: { player, tioZe }, boneyard, openingTileId };
  // a mão do rival mudou: o "antes" guardado pelo Relógio não vale mais
  if (tioZe !== state.hands.tioZe) next = patchFx(next, { undo: null });
  return emit(next, { type: 'dev', op: 'addTile', tileId: id, enhancement: enh });
}

function devAction(state, action) {
  const { op } = action;
  if (state.phase === 'title') return state;
  if (DEV_PLAYING_ONLY.has(op) && state.phase !== 'playing') return state;
  switch (op) {
    case 'addTile':
      return devAddTile(state, action);
    case 'toggleRelic': {
      if (!getRelic(action.id)) return state;
      const owned = state.relics.player.includes(action.id);
      if (!owned && state.relics.player.length >= RELIC_SLOTS) return state;
      const player = owned ? state.relics.player.filter((id) => id !== action.id) : [...state.relics.player, action.id];
      return emit({ ...state, relics: { ...state.relics, player } }, { type: 'dev', op, id: action.id, on: !owned });
    }
    case 'addCoins':
      return gainCoins(state, 'player', action.amount ?? 10, 'dev');
    case 'resetHearts':
      return emit({ ...state, hearts: { ...state.maxHearts } }, { type: 'dev', op });
    case 'damageTioZe': {
      const next = directDamage(state, 'tioZe', 1, 'dev');
      return checkKnockout(next) ?? next;
    }
    case 'winMatch': {
      const next = directDamage(state, 'tioZe', state.hearts.tioZe, 'dev');
      return checkKnockout(next) ?? next;
    }
    case 'setRival': {
      if (!RIVALS[action.rivalId] || !action.deck) return state;
      // pula para um nó desse rival na teia desta run (região, loja e chefe batem com ele)
      const node = [...campaignOf(state).byId.values()].find((n) => n.rivalId === action.rivalId);
      const run = node ? { ...state.run, node: node.id, path: [node.id], cleared: [] } : state.run;
      const jumped = { ...state, pending: null, shop: null, market: null, coinEvent: null, run };
      return startMatch(jumped, action.rivalId, action.deck, { advance: state.run.match === 0 });
    }
    case 'emptyTioZeHand': {
      const hand = state.hands.tioZe;
      const openingTileId = hand.some((t) => t.id === state.openingTileId) ? null : state.openingTileId;
      const next = {
        ...state,
        hands: { ...state.hands, tioZe: [] },
        boneyard: [...state.boneyard, ...plainTiles(hand)],
        openingTileId,
        fx: { ...state.fx, undo: null },
      };
      return emit(next, { type: 'dev', op });
    }
    case 'clearBoard': {
      const back = plainTiles(boardTilesInOrder(state.board));
      let next = {
        ...state,
        board: createEmptyBoard(),
        boneyard: [...state.boneyard, ...back],
        openingTileId: null,
        consecutivePasses: 0,
      };
      next = patchFx(next, { frozen: bySeat([], []), wild: null, undo: null });
      return emit(next, { type: 'dev', op });
    }
    case 'forceTranca':
      return finishRound(state, trancaResult(state, 'forcada'));
    default:
      return state;
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'NEW_RUN':
      return newRun(state, action);
    case 'LOAD_RUN':
      return loadRun(state, action);
    case 'ENTER_NODE':
    case 'CHOOSE_NODE':
      return chooseNode(state, action);
    case 'START_DUEL': {
      // atalho: run nova (baralho 100% comum, sem talismãs) direto na mesa do 1º nó
      const fresh = newRun(state, action);
      const rivalId = action.rivalId && RIVALS[action.rivalId] ? action.rivalId : FIRST_RIVAL;
      // a mesa fica num nó de verdade da teia: ao vencer, o mapa segue dali
      const node = [...campaignOf(fresh).byId.values()].find((n) => n.rivalId === rivalId);
      const next = node ? { ...fresh, run: { ...fresh.run, node: node.id, path: [node.id] } } : fresh;
      return startMatch(next, rivalId, action.deck);
    }
    case 'NEXT_ROUND':
      if (state.phase !== 'roundOver') return state;
      return startRound(state, action.deck);
    case 'PLAY':
      return playTile(state, action);
    case 'DRAW':
      return drawTile(state, action);
    case 'DRAW_PICK':
      return pickDrawn(state, action);
    case 'PASS':
      return passTurn(state, action);
    case 'DISCARD':
      return discardTile(state, action);
    case 'SKIP_DISCARD':
      return skipDiscard(state);
    case 'UNDO':
      return undoTioZePlay(state);
    case 'TIO_ZE_ACT':
      return tioZeAct(state);
    case 'OPEN_MAP':
      return continueToMap(state);
    case 'SHOP_BUY_RELIC':
      return buyRelic(state, action);
    case 'SHOP_BUY_TILE':
      return buyTile(state, action);
    case 'SHOP_SELL_RELIC':
      return sellRelic(state, action);
    case 'SHOP_REROLL':
      return rerollShop(state);
    case 'LEAVE_SHOP':
      return leaveShop(state);
    case 'MARKET_BUY':
      return marketBuy(state, action);
    case 'LEAVE_MARKET':
      return leaveMarket(state);
    case 'LEAVE_EVENT':
      return leaveEvent(state);
    case 'DEV':
      return devAction(state, action);
    case 'RETURN_TO_TITLE':
      return { ...createInitialState(), seq: state.seq, events: state.events };
    default:
      return state;
  }
}
