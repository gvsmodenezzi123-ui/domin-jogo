/**
 * Estado do duelo e transições. Reducer puro: toda aleatoriedade (o baralho
 * embaralhado e a `seed` dos sorteios da campanha) chega pronta dentro da ação.
 *
 * Fases: 'title' → 'playing' → 'roundOver' → 'playing' ... → 'gameOver'
 *
 * Efeitos colaterais (som, banners, falas) não acontecem aqui: o reducer emite
 * eventos em `state.events`, cada um com um `seq` crescente, e a UI reage.
 *
 * Patch 0.2: relíquias (`state.relics`), peças aprimoradas (`tile.enhancement`),
 * efeitos da rodada (`state.fx`) e escolhas que travam o jogo até você decidir
 * (`state.pending`: escolher a compra do Barbante, descartar com o Giz).
 */

import { buildTioZeView, decideTioZeAction } from '../ai/tioZeAI.js';
import { ENHANCEMENTS, ENHANCEMENT_IDS, getEnhancement } from '../data/enhancedTiles.js';
import { RELICS, RELIC_SLOTS, getRelic } from '../data/relics.js';
import {
  DAMAGE,
  MAX_HEARTS,
  MULTIPLE_OF_FIVE_BONUS,
  STARTING_COINS,
  boardTilesInOrder,
  classifyBatida,
  createEmptyBoard,
  createSeededRng,
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
  makeTile,
  placeTile,
  resolveTranca,
  tileId as canonicalId,
} from './dominoLogic.js';
import { directDamage, emit, gainCoins, patchFx, proc } from './effects.js';
import {
  applyBatidaDamage,
  drawOptionsFor,
  enhancedTilesInPlay,
  hasRelic,
  pickNaturalEnhancement,
  pickRelicReward,
  relicExtraTurn,
  requiredOpeningFor,
  rulesFor,
  runRelicHook,
  trancaRulesFor,
  trancaTileValues,
} from './powers.js';

export const SEATS = Object.freeze(['player', 'tioZe']);
export const other = (seat) => (seat === 'player' ? 'tioZe' : 'player');

/** Efeitos que valem só dentro de uma rodada. */
export function createRoundFx() {
  return {
    frozenSides: [], // Chumbo: pontas que o Tio Zé não pode usar na vez dele
    wild: null, // Cristal: { tileId, sides } — curinga só na sua próxima jogada
    rubyArmed: false, // Rubi: dano se o Tio Zé comprar/passar logo em seguida
    tioZeMisses: 0, // compras/passes seguidos do Tio Zé (Dedal de Chumbo)
    borrachaUsed: false,
    relogioUsed: false,
    undo: null, // Relógio: como a mesa estava antes da última jogada do Tio Zé
    lastTioZeDraw: null, // Espelho Retrovisor
  };
}

export function createInitialState() {
  return {
    phase: 'title',
    round: 0,
    board: createEmptyBoard(),
    boneyard: [],
    hands: { player: [], tioZe: [] },
    hearts: { player: MAX_HEARTS, tioZe: MAX_HEARTS },
    coins: { player: STARTING_COINS, tioZe: STARTING_COINS },
    turn: 'player',
    drawsThisTurn: 0,
    consecutivePasses: 0,
    openingTileId: null,
    nextStarter: null,
    roundResult: null,
    duelWinner: null,
    lastPlay: null,
    memory: { playerMissing: [] },
    stats: { roundsWon: { player: 0, tioZe: 0 }, coinsEarned: 0 },
    relics: [],
    fx: createRoundFx(),
    pending: null,
    seed: null,
    events: [],
    seq: 0,
  };
}

/** Gerador da rodada para sorteios da campanha (null em duelo sem seed). */
function roundRng(state, salt) {
  if (state.seed === null || state.seed === undefined) return null;
  return createSeededRng((state.seed ^ Math.imul(state.round + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0);
}

const isCopyId = (id) => id.includes('#');

/** Pedra "limpa" para devolver ao dorme (sem aprimoramento; cópias do painel DEV somem). */
function plainTiles(tiles) {
  return tiles.filter((t) => !isCopyId(t.id)).map((t) => makeTile(t.a, t.b));
}

// ---------------------------------------------------------------------------
// Rodada
// ---------------------------------------------------------------------------

function rollNaturalEnhancement(state) {
  const rng = roundRng(state, 1);
  if (!rng) return state;
  const pick = pickNaturalEnhancement(state.hands.player, rng);
  if (!pick) return state;
  const player = state.hands.player.map((t, i) => (i === pick.index ? { ...t, enhancement: pick.enhancement } : t));
  const next = { ...state, hands: { ...state.hands, player } };
  const name = ENHANCEMENTS[pick.enhancement].name.split(' ')[0].toUpperCase();
  return proc(next, { source: 'tile', id: pick.enhancement, text: `PEDRA DE ${name} NA MÃO` });
}

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
  next = runRelicHook(next, 'onDeal'); // Dado Viciado
  next = rollNaturalEnhancement(next);

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

/** Prêmio da campanha: talismã novo depois de cada rodada que você vence. */
function grantRewardRelic(state) {
  const rng = roundRng(state, 2);
  if (!rng) return state;
  const id = pickRelicReward(state, rng);
  if (!id) return state;
  const next = { ...state, relics: [...state.relics, id], roundResult: { ...state.roundResult, reward: id } };
  return emit(next, { type: 'relicGained', id });
}

function finishRound(state, result) {
  let next = { ...state, pending: null };
  if (result.winner === 'player') {
    // Ouro: bônus por pedra de ouro na mão ou na mesa
    for (const tile of enhancedTilesInPlay(next)) {
      const enhancement = getEnhancement(tile.enhancement);
      if (enhancement.onRoundWin) next = enhancement.onRoundWin(next, { tile });
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

  if (hearts[loser] === 0) {
    next = { ...next, phase: 'gameOver', duelWinner: result.winner, nextStarter: null };
    return emit(next, { type: 'duelEnd', winner: result.winner });
  }
  if (result.winner === 'player') next = grantRewardRelic(next);
  return { ...next, phase: 'roundOver', nextStarter: result.winner };
}

/** Alguém zerou os corações no meio da rodada (dano direto): o duelo acaba na hora. */
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
  let next = emit({ ...state, pending: null, roundResult: result, stats }, { type: 'roundEnd', result });
  next = { ...next, phase: 'gameOver', duelWinner: winner, nextStarter: null };
  return emit(next, { type: 'duelEnd', winner });
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

/** Passa a vez. Quando a vez do Tio Zé termina, o Chumbo derrete; quando a sua termina, o Relógio perde a chance. */
function endTurn(state, from) {
  const fx =
    from === 'tioZe' ? { ...state.fx, frozenSides: [] } : { ...state.fx, undo: null };
  return { ...state, turn: other(from), fx };
}

/** O Tio Zé comprou ou passou: Rubi, Cinzeiro, Dedal, Espelho. */
function afterTioZeMiss(state, ctx) {
  let next = patchFx(state, { tioZeMisses: state.fx.tioZeMisses + 1 });
  if (next.fx.rubyArmed) {
    next = directDamage(patchFx(next, { rubyArmed: false }), 'tioZe', 1, 'rubi');
    next = proc(next, { source: 'tile', id: 'rubi', text: 'RUBI: −1♥ NO TIO ZÉ' });
  }
  return runRelicHook(next, 'onTioZeMiss', ctx);
}

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

  const endsBefore = getOpenEnds(state.board);
  const board = placeTile(state.board, tile, side, rules);
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
  if (actor === 'player') {
    // sua jogada gasta o curinga do Cristal e fecha a janela do Relógio
    next = patchFx(next, { wild: null, undo: null });
  } else {
    next = patchFx(next, {
      rubyArmed: false,
      tioZeMisses: 0,
      undo: state.board.root
        ? { board: state.board, hand, coins: state.coins.tioZe, lastPlay: state.lastPlay, tileId: tile.id }
        : null,
    });
  }
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

  let extraTurn = null;
  if (actor === 'player') {
    const ctx = { tile, side, placement, endsAfter: getOpenEnds(board), multipleOfFive };
    const enhancement = getEnhancement(tile.enhancement);
    if (enhancement?.onPlay) next = enhancement.onPlay(next, ctx);
    next = runRelicHook(next, 'onPlayerPlay', ctx);
    if (enhancement?.extraTurn) extraTurn = { source: 'tile', id: enhancement.id, text: 'FANTASMA: JOGUE DE NOVO' };
    else {
      const relicId = relicExtraTurn(next, ctx);
      if (relicId) extraTurn = { source: 'relic', id: relicId, text: `${RELICS[relicId].short}: JOGUE DE NOVO` };
    }
    const knockout = checkKnockout(next);
    if (knockout) return knockout;
  }

  if (newHand.length === 0) {
    const kind = classifyBatida(tile, endsBefore);
    let damage = DAMAGE[kind];
    if (actor === 'player') {
      const boosted = applyBatidaDamage(next, damage);
      for (const step of boosted.steps) {
        next = proc(next, { source: 'relic', id: step.id, text: `${RELICS[step.id].short}: DANO ${step.before}→${step.after}` });
      }
      damage = boosted.damage;
    }
    return finishRound(next, {
      kind,
      winner: actor,
      loser: other(actor),
      damage,
      baseDamage: DAMAGE[kind],
      reason: 'batida',
      lastTileId: tile.id,
      sums: null,
    });
  }

  const tranca = checkTranca(next);
  if (tranca) return tranca;

  if (extraTurn) return proc(next, extraTurn);
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

  // Barbante no Dedo: vê 2 e escolhe (a escolha chega em DRAW_PICK)
  const options = actor === 'player' ? Math.min(drawOptionsFor(state), state.boneyard.length) : 1;
  if (options >= 2) {
    const picks = state.boneyard.slice(0, options);
    next = { ...next, boneyard: state.boneyard.slice(options), pending: { type: 'drawChoice', options: picks, cost } };
    next = emit(next, { type: 'drawPeek', by: actor, count: options, cost });
    return heartCost(next);
  }

  const [tile, ...boneyard] = state.boneyard;
  next = { ...next, boneyard, hands: { ...next.hands, [actor]: [...next.hands[actor], tile] } };
  next = heartCost(emit(next, { type: 'drawTile', by: actor, tileId: tile.id, cost }));

  if (actor === 'tioZe') {
    next = afterTioZeMiss(patchFx(next, { lastTioZeDraw: tile.id }), { kind: 'draw', tileId: tile.id });
    const knockout = checkKnockout(next);
    if (knockout) return knockout;
  }
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
    boneyard: [...state.boneyard, ...back], // a outra volta para o fundo do dorme
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
  if (actor === 'tioZe') {
    next = afterTioZeMiss(next, { kind: 'pass' });
    const knockout = checkKnockout(next);
    if (knockout) return knockout;
  }
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

/** Relógio Quebrado: a última pedra do Tio Zé volta para a mão dele e a vez continua sua. */
function undoTioZePlay(state) {
  if (!canAct(state, 'player') || !hasRelic(state, 'relogio') || state.fx.relogioUsed || !state.fx.undo) return state;
  const undo = state.fx.undo;
  let next = {
    ...state,
    board: undo.board,
    hands: { ...state.hands, tioZe: undo.hand },
    coins: { ...state.coins, tioZe: undo.coins },
    lastPlay: undo.lastPlay,
    consecutivePasses: 0,
  };
  next = patchFx(next, { undo: null, relogioUsed: true });
  next = emit(next, { type: 'undo', tileId: undo.tileId });
  return proc(next, { source: 'relic', id: 'relogio', text: 'RELÓGIO: JOGADA DESFEITA' });
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
// Painel DEV (src/components/DevPanel.jsx)
// ---------------------------------------------------------------------------

const DEV_PLAYING_ONLY = new Set(['addTile', 'damageTioZe', 'emptyTioZeHand', 'clearBoard', 'forceTranca']);

/** Põe [a|b] na sua mão: puxa do dorme ou do Tio Zé; se a pedra estiver na mesa, cria uma cópia. */
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
    const taken = new Set([
      ...boardTilesInOrder(state.board),
      ...player,
      ...tioZe,
      ...(state.pending?.options ?? []),
    ].map((t) => t.id));
    let n = 2;
    while (taken.has(`${id}#${n}`)) n += 1;
    player = [...player, make(`${id}#${n}`)];
  }
  let next = { ...state, hands: { player, tioZe }, boneyard, openingTileId };
  // a mão do Tio Zé mudou: o "antes" guardado pelo Relógio não vale mais
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
      const owned = state.relics.includes(action.id);
      if (!owned && state.relics.length >= RELIC_SLOTS) return state;
      const relics = owned ? state.relics.filter((id) => id !== action.id) : [...state.relics, action.id];
      return emit({ ...state, relics }, { type: 'dev', op, id: action.id, on: !owned });
    }
    case 'addCoins':
      return gainCoins(state, 'player', action.amount ?? 10, 'dev');
    case 'resetHearts':
      return emit({ ...state, hearts: { player: MAX_HEARTS, tioZe: MAX_HEARTS } }, { type: 'dev', op });
    case 'damageTioZe': {
      const next = directDamage(state, 'tioZe', 1, 'dev');
      return checkKnockout(next) ?? next;
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
      next = patchFx(next, { frozenSides: [], wild: null, undo: null });
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
      const relics = (action.relics ?? []).filter((id) => getRelic(id)).slice(0, RELIC_SLOTS);
      const fresh = {
        ...createInitialState(),
        relics,
        seed: Number.isFinite(action.seed) ? action.seed >>> 0 : null,
        seq: state.seq,
        events: state.events,
      };
      const next = emit(fresh, { type: 'duelStart' });
      return startRound(next, action.deck);
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
    case 'DEV':
      return devAction(state, action);
    case 'RETURN_TO_TITLE':
      return { ...createInitialState(), seq: state.seq, events: state.events };
    default:
      return state;
  }
}
