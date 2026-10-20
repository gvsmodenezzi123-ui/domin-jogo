/**
 * Estado da run e transições. Reducer puro: toda aleatoriedade (o baralho
 * embaralhado e a `seed` da run) chega pronta dentro da ação.
 *
 * Fases:
 *   'title' → 'playing' ⇄ 'roundOver' → 'matchWon' → 'shop' → 'playing' (próximo rival) ...
 *                                     ↘ 'gameOver' (você zerou: fim da run)
 *
 * Uma RUN é uma sequência de PARTIDAS, cada uma contra um rival. A partida acaba
 * quando alguém zera os corações; vencer abre a Loja Clandestina. Moedas, talismãs
 * e o seu baralho (pedras aprimoradas compradas) passam de uma partida para outra;
 * seus corações voltam cheios a cada partida.
 *
 * Efeitos colaterais (som, banners, falas) não acontecem aqui: o reducer emite
 * eventos em `state.events`, cada um com um `seq` crescente, e a UI reage.
 *
 * Cadeiras: 'player' (você) e 'tioZe' (o rival da partida, qualquer que seja).
 */

import { buildTioZeView, decideTioZeAction } from '../ai/tioZeAI.js';
import { ENHANCEMENT_IDS, getEnhancement } from '../data/enhancedTiles.js';
import { RELICS, RELIC_SLOTS, getRelic, markUsed } from '../data/relics.js';
import { FIRST_RIVAL, RIVALS, getRival, pickNextRival } from '../data/rivals.js';
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
import { directDamage, emit, gainCoins, loseCoins, patchFx, proc } from './effects.js';
import {
  applyBatidaDamage,
  canUndo,
  dressTile,
  drawOptionsFor,
  enhancedTilesInPlay,
  hasRelic,
  plainTiles,
  relicExtraTurn,
  requiredOpeningFor,
  rulesFor,
  runRelicHook,
  trancaRulesFor,
  trancaTileValues,
} from './powers.js';
import { REROLL_COST, buildShop, relicBuyBlock, sellPriceOf, shopRng, tileBuyBlock } from './shop.js';

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
    run: { match: 0, history: [] },
    shop: null,
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

/** Nova partida contra `rivalId`: corações cheios, rival com os talismãs e o baralho dele. */
function startMatch(state, rivalId, deck, { advance = true } = {}) {
  const rival = getRival(rivalId);
  let next = {
    ...state,
    rivalId: rival.id,
    run: advance
      ? { match: state.run.match + 1, history: [...state.run.history, rival.id] }
      : { ...state.run, history: [...state.run.history.slice(0, -1), rival.id] },
    relics: { ...state.relics, tioZe: [...rival.relics] },
    decks: { ...state.decks, tioZe: { ...rival.deck } },
    hearts: bySeat(MAX_HEARTS, rival.hearts),
    maxHearts: bySeat(MAX_HEARTS, rival.hearts),
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

/** Alguém zerou: se foi o rival, você vence a partida (prêmio e loja); se foi você, a run acaba. */
function endMatch(state, winner) {
  if (winner === 'player') {
    const prize = MATCH_PRIZE + getRival(state.rivalId).prizeBonus;
    let next = {
      ...state,
      phase: 'matchWon',
      duelWinner: 'player',
      nextStarter: null,
      pending: null,
      stats: { ...state.stats, matchesWon: state.stats.matchesWon + 1 },
    };
    next = gainCoins(next, 'player', prize, 'prize');
    next = { ...next, roundResult: next.roundResult ? { ...next.roundResult, prize } : next.roundResult };
    return emit(next, { type: 'duelEnd', winner: 'player', prize });
  }
  const next = { ...state, phase: 'gameOver', duelWinner: 'tioZe', nextStarter: null, pending: null };
  return emit(next, { type: 'duelEnd', winner: 'tioZe' });
}

function finishRound(state, result) {
  let next = { ...state, pending: null };
  if (result.winner) {
    // Ouro: bônus por pedra de ouro do vencedor na mão ou na mesa
    for (const tile of enhancedTilesInPlay(next, result.winner)) {
      const enhancement = getEnhancement(tile.enhancement);
      if (enhancement.onRoundWin) next = enhancement.onRoundWin(next, { tile, owner: result.winner, foe: other(result.winner) });
    }
  }
  next = emit({ ...next, roundResult: result }, { type: 'roundEnd', result });

  if (!result.winner || result.damage <= 0) {
    return { ...next, phase: 'roundOver', nextStarter: null };
  }

  const loser = other(result.winner);
  const hearts = { ...next.hearts, [loser]: Math.max(0, next.hearts[loser] - result.damage) };
  const stats = {
    ...next.stats,
    roundsWon: { ...next.stats.roundsWon, [result.winner]: next.stats.roundsWon[result.winner] + 1 },
  };
  next = emit({ ...next, hearts, stats }, { type: 'heartLost', who: loser, amount: result.damage, reason: result.kind });

  if (hearts[loser] === 0) return endMatch(next, result.winner);
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
  return {
    ...resolveTranca(state.hands, trancaTileValues(state)),
    reason,
    lastTileId: state.lastPlay?.tileId ?? null,
  };
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
    for (const step of boosted.steps) {
      next = proc(next, {
        source: 'relic',
        id: step.id,
        text: `${RELICS[step.id].short}: DANO ${step.before}→${step.after}`,
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
  return checkTranca(next) ?? next;
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
  return checkTranca(next) ?? next;
}

function passTurn(state, { actor, intent }) {
  if (!canAct(state, actor) || !state.board.root) return state;
  const consecutivePasses = state.consecutivePasses + 1;
  let next = {
    ...state,
    consecutivePasses,
    drawsThisTurn: 0,
    memory: actor === 'player' ? rememberPlayerMissing(state) : state.memory,
  };
  next = emit(next, { type: 'pass', by: actor, intent: intent ?? null });
  next = afterMiss(next, actor, { kind: 'pass' });
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

function openShop(state) {
  if (state.phase !== 'matchWon') return state;
  const nextRivalId = pickNextRival(shopRng(state, 0, 1), state.rivalId);
  const next = { ...state, phase: 'shop', shop: { ...buildShop(state, 0), nextRivalId } };
  return emit(next, { type: 'shopOpen', nextRivalId });
}

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

function rerollShop(state) {
  if (state.phase !== 'shop' || state.coins.player < REROLL_COST) return state;
  let next = loseCoins(state, 'player', REROLL_COST, 'reroll');
  const rerolls = state.shop.rerolls + 1;
  next = { ...next, shop: { ...buildShop(next, rerolls), nextRivalId: state.shop.nextRivalId } };
  return emit(next, { type: 'shopReroll', rerolls });
}

function nextMatch(state, { deck, rivalId }) {
  if (state.phase !== 'shop') return state;
  const id = rivalId && RIVALS[rivalId] ? rivalId : state.shop.nextRivalId;
  return startMatch(state, id, deck);
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
      return startMatch({ ...state, pending: null }, action.rivalId, action.deck, { advance: state.run.match === 0 });
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
    case 'START_DUEL': {
      // começa uma RUN nova: baralho 100% comum e sem talismãs (os testes podem passar extras)
      const relics = (action.relics ?? []).filter((id) => getRelic(id)).slice(0, RELIC_SLOTS);
      const fresh = {
        ...createInitialState(),
        relics: bySeat(relics, []),
        decks: bySeat({ ...(action.playerDeck ?? {}) }, {}),
        seed: Number.isFinite(action.seed) ? action.seed >>> 0 : null,
        seq: state.seq,
        events: state.events,
      };
      const next = emit(fresh, { type: 'runStart' });
      return startMatch(next, action.rivalId && RIVALS[action.rivalId] ? action.rivalId : FIRST_RIVAL, action.deck);
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
    case 'OPEN_SHOP':
      return openShop(state);
    case 'SHOP_BUY_RELIC':
      return buyRelic(state, action);
    case 'SHOP_BUY_TILE':
      return buyTile(state, action);
    case 'SHOP_SELL_RELIC':
      return sellRelic(state, action);
    case 'SHOP_REROLL':
      return rerollShop(state);
    case 'NEXT_MATCH':
      return nextMatch(state, action);
    case 'DEV':
      return devAction(state, action);
    case 'RETURN_TO_TITLE':
      return { ...createInitialState(), seq: state.seq, events: state.events };
    default:
      return state;
  }
}
