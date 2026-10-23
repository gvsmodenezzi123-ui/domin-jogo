/**
 * Estado da run e transições. Reducer puro: toda aleatoriedade (o baralho
 * embaralhado e a `seed` da run) chega pronta dentro da ação.
 *
 * Fases:
 *   'title' → 'map' → 'playing' ⇄ 'roundOver' → 'matchWon' → 'shop' → 'map' → ...
 *                                             ↘ 'gameOver' (você zerou: fim da run)
 *                                  (último chefe) → 'runWon'
 *                    (último chefe com 3+ Necróticos) → 'secretReveal' → O Dono da Noite → 'runWon'
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
import { RELICS, getRelic, markUsed } from '../data/relics.js';
import { DEFAULT_MALETA, MALETAS, maletaOf } from '../data/maletas.js';
import { CAPS_PER_RUN_WON, CHALLENGES, DRUNK_EVERY, UPGRADES } from '../data/meta.js';
import { FINAL_BOSS, HEAL_AFTER_NODE } from '../data/campaign.js';
import { FIRST_RIVAL, RIVALS, SECRET_BOSS, TUTOR_ID, getRival, rivalFor, rivalOf } from '../data/rivals.js';
import { modeOf, playerMaxHearts } from '../data/difficulty.js';
import { normalizeSeed, seedNumberOf } from './seedEngine.js';
import { buildMarket, marketBuyBlock } from './blackMarket.js';
import { MAP_VERSION, availableNodes, campaignOf, coinReward, currentNode, mixSeed, regionIdOf } from './campaignMap.js';
import { resolveEncounter, encounterOptionBlock } from './encounters.js';
import { RADIO_FIVE_BONUS, WET_BONUS_POINTS, tableModIs, tableModifierOf } from '../data/tableModifiers.js';
import { encounterOf } from '../data/encounters.js';
import { TUTORIAL_STEPS } from '../data/tutorial.js';
import { tutorialDeal, tutorialStepOf } from './tutorial.js';
import {
  DAMAGE,
  MAX_HEARTS,
  MULTIPLE_OF_FIVE_BONUS,
  STARTING_COINS,
  FULL_SET,
  boardTilesInOrder,
  classifyBatida,
  createEmptyBoard,
  createSeededRng,
  dealFromDeck,
  endsSum,
  findOpening,
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
  canUseCanivete,
  drawAvailabilityFor,
  hasPlayFor,
  isStrategicPass,
  relicsOf,
  rivalMechanics,
  dressTile,
  drawOptionsFor,
  enhancedTilesInPlay,
  hasRelic,
  passAvailabilityFor,
  plainTiles,
  playerTurnExhausted,
  relicExtraTurn,
  requiredOpeningFor,
  rulesFor,
  runRelicHook,
  trancaDamageFor,
  trancaRulesFor,
  trancaSumOffsets,
  trancaTileValues,
} from './powers.js';
import { challengeIs, relicSlotsFor, startCoinsFor } from './loadout.js';
import { isValidSave } from './save.js';
import { buildShop, relicBuyBlock, sellPriceFor, tileBuyBlock } from './shop.js';

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
    wetUsed: false, // Mesa Úmida (Patch 0.9.4): a 1ª pedra sua da rodada já ganhou o +1
    undo: null, // Relógio: como estava antes da última jogada do rival
    lastDraw: bySeat(null, null), // última pedra comprada (Espelho Retrovisor)
    passes: bySeat(0, 0), // passes seguidos de cada lado (Cinzeiro Cheio de Bitucas)
    revealed: [], // pedras do rival que ficaram à mostra (Cinzeiro Cheio de Bitucas)
  };
}

/** Efeitos que valem a partida inteira: escudo do Comendador, Falsa Partida e a compra forçada dela. */
export function createMatchFx() {
  return {
    shieldUsed: false,
    falsaUsed: bySeat(false, false),
    forcedDraw: null,
    fitaUsed: bySeat(false, false), // Fita Crepe do Gambiarra (1x por partida)
    fitaArmed: null,
    caniveteUsed: false, // Canivete Suíço (1x por partida)
    stakesUsed: false, // Aposta Alta (Patch 0.9.4): a 1ª batida da partida já dobrou
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
    // caps: Tampinhas Douradas ganhas nesta run (o App soma no aparelho a cada mesa vencida)
    stats: { roundsWon: bySeat(0, 0), coinsEarned: 0, matchesWon: 0, caps: 0 },
    relics: bySeat([], []),
    decks: bySeat({}, {}), // { tileId: aprimoramento } — as pedras trocadas no baralho de cada lado
    rivalId: rival.id,
    // dificuldade da run ('normal' = Peças Brancas, 'hard' = Peças Pretas, ver data/difficulty.js)
    mode: 'normal',
    // Patch 0.8.0: maleta (classe) da run, desafio (ou null) e melhorias da Conta do Boteco
    maleta: DEFAULT_MALETA,
    challenge: null,
    perks: [],
    // Patch 0.7.0: talismãs liberados por conquista (o App passa o que está no aparelho)
    unlocks: [],
    // corações no começo da rodada (Testamento Rasgado volta para eles)
    roundStartHearts: null,
    // Patch 0.6.1, mapa em teia (engine/campaignMap.js):
    //   node: id do nó onde você está (null antes do 1º); cleared: nós concluídos;
    //   path: o caminho percorrido; match: partidas jogadas; history: rivais enfrentados
    //   fiadoUsed: o passe de graça do Fiado de Rua já foi usado; secret: a noite do Dono começou
    //   Patch 0.9.4: map: versão da teia (2 = com eventos e regras de mesa); scars: corações
    //   máximos perdidos na run (o Bêbado do Fundo do Bar)
    run: { node: null, cleared: [], path: [], match: 0, history: [], fiadoUsed: false, secret: false, scars: 0 },
    matchFx: createMatchFx(), // efeitos que valem a partida inteira
    shop: null,
    market: null, // Mercado Negro do Corvo da Madrugada
    coinEvent: null, // prêmio do Seu Tião das Moedas
    encounter: null, // Patch 0.9.4: evento de dilema do nó [?] ({ id, node, choice, outcome })
    tableMod: null, // Patch 0.9.4: regra de mesa da partida atual (data/tableModifiers.js)
    // Patch 0.9.5: partida de treino com o Vô Juca ({ step, replay } ou null; data/tutorial.js)
    tutorial: null,
    fx: createRoundFx(),
    pending: null,
    seed: null,
    // Patch 0.9.2: a semente como o jogador vê e copia ("BUX-9K2"); `seed` é o número dela
    seedCode: null,
    events: [],
    seq: 0,
  };
}

const tone = (seat) => (seat === 'player' ? 'player' : 'enemy');

// ---------------------------------------------------------------------------
// Partida e rodada
// ---------------------------------------------------------------------------

function startRound(state, deck, dealt = null) {
  // `dealt` (Patch 0.9.5): mãos e dorme já prontos (as rodadas encenadas do treino)
  const { hands, boneyard } = dealt ?? dealFromDeck(deck);
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
    roundStartHearts: { ...state.hearts },
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

/**
 * Baralho do rival: o dele, mais as pedras de grife extras da Maleta do Bicheiro (sorteadas
 * pela semente da run, em pedras que ainda são comuns no baralho dele).
 */
function rivalDeckFor(state, rival) {
  const deck = { ...rival.deck };
  const extra = maletaOf(state.maleta).rivalExtraTiles;
  if (!extra) return deck;
  const rng = createSeededRng(mixSeed(state.seed ?? 0, `bicheiro-${rival.id}-${state.run.match}`));
  const plain = FULL_SET.map((t) => t.id).filter((id) => !deck[id]);
  for (let i = 0; i < extra && plain.length; i += 1) {
    const [id] = plain.splice(Math.floor(rng() * plain.length), 1);
    deck[id] = ENHANCEMENT_IDS[Math.floor(rng() * ENHANCEMENT_IDS.length)];
  }
  return deck;
}

/** Nova partida contra `rivalId`: rival com os corações, talismãs e o baralho dele; os seus corações continuam. */
function startMatch(state, rivalId, deck, { advance = true } = {}) {
  // nas Peças Pretas o rival senta com o baralho, os talismãs e os corações do modo difícil
  const rival = rivalFor(rivalId, state.mode);
  // Tudo ou Nada: todo mundo senta com 1 coração
  const allIn = challengeIs(state, 'tudoOuNada');
  const rivalHearts = allIn ? 1 : rival.hearts;
  let next = {
    ...state,
    rivalId: rival.id,
    run: advance
      ? { ...state.run, match: state.run.match + 1, history: [...state.run.history, rival.id] }
      : { ...state.run, history: [...state.run.history.slice(0, -1), rival.id] },
    relics: { ...state.relics, tioZe: [...rival.relics] },
    decks: { ...state.decks, tioZe: rivalDeckFor(state, rival) },
    hearts: bySeat(allIn ? 1 : Math.max(1, state.hearts.player), rivalHearts),
    maxHearts: bySeat(playerMaxHearts(state), rivalHearts),
    matchFx: createMatchFx(),
    coins: { ...state.coins, tioZe: rival.coins },
    round: 0,
    nextStarter: null,
    duelWinner: null,
    roundResult: null,
    shop: null,
  };
  next = emit(next, { type: 'duelStart', rivalId: rival.id, match: next.run.match, tableMod: next.tableMod ?? null });
  const mod = tableModifierOf(next.tableMod);
  if (mod) next = proc(next, { source: 'table', id: mod.id, text: `REGRA DA MESA: ${mod.name.toUpperCase()}`, tone: 'info', owner: 'player' });
  return startRound(next, deck);
}

/** Quantos Necróticos chamam O Dono da Noite (vencendo o Comendador com eles na hotbar). */
export const SECRET_NECROTICS = 3;

const necroticCount = (state) => state.relics.player.filter((id) => RELICS[id]?.rarity === 'necrotico').length;

/**
 * Nó 19 secreto: depois da revelação, a mesa do Dono da Noite (a partida conta no mesmo nó
 * do Comendador; vencer encerra a run com o final da noite).
 */
function startSecret(state, { deck }) {
  if (state.phase !== 'secretReveal' || !deck) return state;
  return startMatch({ ...state, roundResult: null, tableMod: null }, SECRET_BOSS, deck);
}

/**
 * Alguém zerou: se foi o rival, você vence o nó (prêmio e cura; o nó fica concluído e
 * o mapa abre os próximos caminhos; o chefe final encerra a run); se foi você, a run acaba.
 */
function endMatch(state, winner) {
  // Patch 0.9.5: a partida de treino acaba sem prêmio, tampinha, save nem mapa (o roteiro segue)
  if (state.tutorial) {
    const next = { ...state, phase: 'roundOver', duelWinner: winner, nextStarter: null, pending: null };
    return emit(next, { type: 'duelEnd', winner, tutorial: true });
  }
  if (winner === 'player') {
    const node = currentNode(state);
    const rival = rivalOf(state);
    const secretWon = rival.id === SECRET_BOSS;
    const boss = secretWon || (node ? node.boss : rival.boss);
    // o chefe da última região (o Comendador) encerra a campanha
    const finalBoss = !secretWon && (node ? node.boss && node.region === campaignOf(state).regions.length : rival.id === FINAL_BOSS);
    // Patch 0.8.0: com 3+ Necróticos na hotbar, o final convencional não vem: O Dono da Noite aparece
    const secret = finalBoss && necroticCount(state) >= SECRET_NECROTICS;
    const runWon = secretWon || (finalBoss && !secret);
    // Maleta Seca: o prêmio vem em dobro
    const prize = (MATCH_PRIZE + rival.prizeBonus) * maletaOf(state.maleta).prizeMultiplier;
    // Tampinhas Douradas (Patch 0.9.6): só 1 por run, e só quando ela é vencida
    const caps = runWon ? CAPS_PER_RUN_WON : 0;
    const max = playerMaxHearts(state);
    // Peças Prateadas: cada mesa (chefe também) devolve só 1 coração
    const perTable = modeOf(state.mode).healPerTable;
    const healed = perTable ? Math.min(max, state.hearts.player + perTable) : boss ? max : Math.min(max, state.hearts.player + HEAL_AFTER_NODE);
    const heal = healed - state.hearts.player;
    const cleared = node && !state.run.cleared.includes(node.id) ? [...state.run.cleared, node.id] : state.run.cleared;
    let next = {
      ...state,
      phase: runWon ? 'runWon' : secret ? 'secretReveal' : 'matchWon',
      duelWinner: 'player',
      nextStarter: null,
      pending: null,
      hearts: { ...state.hearts, player: healed },
      run: { ...state.run, cleared, secret: state.run.secret || secret },
      stats: { ...state.stats, matchesWon: state.stats.matchesWon + 1, caps: (state.stats.caps ?? 0) + caps },
    };
    next = gainCoins(next, 'player', prize, 'prize');
    next = { ...next, roundResult: next.roundResult ? { ...next.roundResult, prize, heal, caps } : next.roundResult };
    return emit(next, {
      type: 'duelEnd',
      winner: 'player',
      prize,
      heal,
      caps,
      runWon,
      finalBoss,
      secret,
      secretWon,
      boss,
      region: node?.region ?? rival.region,
      mode: state.mode,
    });
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
  // O Dono da Noite (Noite Eterna): só batida de bucha ou tranca tiram coração dele
  if (result.winner === 'player' && result.damage > 0 && rivalMechanics(next).noiteEterna && result.kind !== 'tranca' && !result.double) {
    result = { ...result, damage: 0, immune: true };
    next = proc(next, { source: 'rival', id: next.rivalId, text: 'NOITE ETERNA: SÓ BUCHA OU TRANCA', tone: 'enemy', owner: 'tioZe' });
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
  // corações e tamanho das mãos na hora do fim (as conquistas leem isso antes da cura/novo deal)
  const handCounts = { player: next.hands.player.length, tioZe: next.hands.tioZe.length };
  next = emit({ ...next, roundResult: result }, { type: 'roundEnd', result, hearts: { ...next.hearts }, handCounts });

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
  if (next.hearts[loser] === 0) return rewindRound(next, loser) ?? endMatch(next, result.winner);
  return { ...next, phase: 'roundOver', nextStarter: result.winner };
}

/**
 * Testamento Rasgado: o golpe fatal faz a rodada recomeçar do zero (corações como no
 * começo dela, dos dois lados) e queima 2 talismãs do dono (o Testamento e mais um).
 * Devolve null se o lado não tiver o talismã.
 */
function rewindRound(state, seat) {
  const will = relicsOf(state, seat).find((r) => r.rewindRound);
  if (!will) return null;
  const others = state.relics[seat].filter((id) => id !== will.id);
  const burned = [will.id, ...others.slice(-1)];
  const result = {
    kind: 'testamento',
    winner: null,
    loser: null,
    owner: seat,
    damage: 0,
    reason: 'testamento',
    burned,
    sums: null,
    lastTileId: state.lastPlay?.tileId ?? null,
  };
  let next = {
    ...state,
    phase: 'roundOver',
    pending: null,
    hearts: { ...(state.roundStartHearts ?? state.maxHearts) },
    relics: { ...state.relics, [seat]: state.relics[seat].filter((id) => !burned.includes(id)) },
    roundResult: result,
    nextStarter: null,
  };
  next = emit(next, { type: 'roundEnd', result });
  return proc(next, {
    source: 'relic',
    id: will.id,
    text: seat === 'player' ? 'TESTAMENTO RASGADO: A RODADA VOLTA DO ZERO' : 'TESTAMENTO DELE: A RODADA VOLTA',
    tone: tone(seat),
    owner: seat,
  });
}

/** Alguém zerou os corações no meio da rodada (dano direto): a partida acaba na hora. */
function checkKnockout(state) {
  const loser = SEATS.find((seat) => state.hearts[seat] <= 0);
  if (!loser) return null;
  const rewound = rewindRound(state, loser);
  if (rewound) return rewound;
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
    ...resolveTranca(state.hands, trancaTileValues(state), trancaSumOffsets(state)),
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
  const turns = (state.fx.turns ?? 0) + 1;
  const fx = {
    ...state.fx,
    frozen: { ...state.fx.frozen, [from]: [] },
    undo: from === 'player' ? null : state.fx.undo,
    turns,
  };
  const next = { ...state, turn: other(from), fx };
  return challengeIs(state, 'mesaBebada') && turns % DRUNK_EVERY === 0 ? drunkTable(next) : next;
}

/**
 * Mesa Bêbada (desafio): os números das duas pontas mudam ao acaso (pela semente da run,
 * da rodada e do momento). Cada ponta fica assim até uma pedra entrar nela.
 */
function drunkTable(state) {
  const ends = getOpenEnds(state.board);
  if (!ends) return state;
  const rng = createSeededRng(mixSeed(state.seed ?? 0, `bebada-${state.run.match}-${state.round}-${state.seq}`));
  const roll = (current) => {
    const value = Math.floor(rng() * 6);
    return value >= current ? value + 1 : value; // nunca repete o número que estava
  };
  const drunk = { left: roll(ends.left), right: roll(ends.right) };
  let next = { ...state, board: { ...state.board, drunk } };
  next = emit(next, { type: 'drunk', ends: drunk });
  return proc(next, { source: 'challenge', id: 'mesaBebada', text: `MESA BÊBADA: PONTAS VIRARAM ${drunk.left} E ${drunk.right}`, tone: 'info', owner: 'player' });
}

/** `seat` comprou ou passou: Rubi do adversário, e os talismãs do adversário (Cinzeiro, Dedal, Espelho). */
function afterMiss(state, seat, ctx) {
  const { fx } = state;
  let next = patchFx(state, {
    misses: { ...fx.misses, [seat]: fx.misses[seat] + 1 },
    passes: ctx.kind === 'pass' ? { ...fx.passes, [seat]: (fx.passes?.[seat] ?? 0) + 1 } : fx.passes,
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
    passes: { ...fx.passes, [actor]: 0 },
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

  // Mesa Úmida (Patch 0.9.4): a 1ª pedra SUA na rodada soma +1 na conta (nunca atrapalha)
  const wet = actor === 'player' && tableModIs(state, 'mesaUmida') && !state.fx.wetUsed;
  if (wet) next = patchFx(next, { wetUsed: true });
  const plainFive = isMultipleOfFive(board);
  const wetSum = endsSum(board) + WET_BONUS_POINTS;
  const wetFive = wet && !plainFive && wetSum % 5 === 0;
  const multipleOfFive = plainFive || wetFive;
  if (multipleOfFive) {
    // Rádio Ligado no Máximo: o múltiplo de 5 paga $5 (para os dois lados)
    const bonus = tableModIs(state, 'radioLigado') ? RADIO_FIVE_BONUS : MULTIPLE_OF_FIVE_BONUS;
    const coins = { ...next.coins, [actor]: next.coins[actor] + bonus };
    const stats = actor === 'player' ? { ...next.stats, coinsEarned: next.stats.coinsEarned + bonus } : next.stats;
    next = emit({ ...next, coins, stats }, {
      type: 'bonus5',
      by: actor,
      sum: wetFive ? wetSum : endsSum(board),
      amount: bonus,
      wet: wetFive,
    });
    if (wetFive) next = proc(next, { source: 'table', id: 'mesaUmida', text: `MESA ÚMIDA: +1 NA SOMA (${wetSum})`, tone: 'player', owner: 'player' });
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
  // talismãs do adversário que reagem à sua pedra (Espelho de Banheiro Trincado)
  next = runRelicHook(next, foe, 'onFoePlay', { tile });

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
    let base = DAMAGE[kind];
    // Rádio Ligado no Máximo (Patch 0.9.4): a batida de bucha perde o dano dobrado
    if (kind === 'bucha' && tableModIs(next, 'radioLigado')) {
      base = DAMAGE.normal;
      next = proc(next, { source: 'table', id: 'radioLigado', text: 'RÁDIO NO MÁXIMO: BUCHA SEM DOBRO', tone: 'info', owner: actor });
    }
    // Aposta Alta: a 1ª batida da partida (de quem for) dói em dobro
    if (tableModIs(next, 'apostaAlta') && !next.matchFx.stakesUsed) {
      next = { ...next, matchFx: { ...next.matchFx, stakesUsed: true } };
      next = proc(next, { source: 'table', id: 'apostaAlta', text: `APOSTA ALTA: DANO ${base}→${base * 2}`, tone: tone(actor), owner: actor });
      base *= 2;
    }
    const boosted = applyBatidaDamage(next, actor, base, tile);
    // Seu Arlindo, o Rei da Bucha: batida com carroça dele dói em dobro
    if (actor === 'tioZe' && isDouble(tile) && rivalMechanics(next).doubleBuchaDamage) {
      boosted.steps.push({ id: null, before: boosted.damage, after: boosted.damage * 2, label: 'REI DA BUCHA' });
      boosted.damage *= 2;
    }
    // Patch 0.6.2: batida com pedra que servia nas duas pontas ganha o balão "Nas duas pontas!"
    if (kind === 'duasPontas') next = emit(next, { type: 'callout', id: 'duasPontas', text: 'NAS DUAS PONTAS!', by: actor });
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
      baseDamage: base,
      reason: 'batida',
      lastTileId: tile.id,
      double: isDouble(tile),
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
  const availability = drawAvailabilityFor(state, actor);
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
    next = runRelicHook(next, actor, 'onDraw', { tileId: null, cost });
    return checkKnockout(next) ?? next;
  }

  const [raw, ...boneyard] = state.boneyard;
  const tile = dressTile(state, actor, raw);
  next = { ...next, boneyard, hands: { ...next.hands, [actor]: [...next.hands[actor], tile] } };
  next = heartCost(emit(next, { type: 'drawTile', by: actor, tileId: tile.id, cost }));
  next = afterMiss(next, actor, { kind: 'draw', tileId: tile.id });
  next = runRelicHook(next, actor, 'onDraw', { tileId: tile.id, cost });
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
  // Fiado de Rua: o 1º passe estratégico da run vai para a conta
  const fiado = Boolean(rule.fiado) && isStrategicPass(state, 'player');
  let next = {
    ...state,
    pending: forced ? null : state.pending,
    consecutivePasses,
    drawsThisTurn: 0,
    memory: actor === 'player' ? rememberPlayerMissing(state) : state.memory,
    run: fiado ? { ...state.run, fiadoUsed: true } : state.run,
  };
  if (fiado) next = proc(next, { source: 'perk', id: 'fiado', text: 'FIADO DE RUA: PASSE NA CONTA', tone: 'player', owner: 'player' });
  if (rule.cost > 0) next = loseCoins(next, actor, rule.cost, 'pass');
  // Dado de Osso Humano: passar (por vontade) custa coração, nunca o último
  const heartCost = forced ? 0 : relicsOf(state, actor).reduce((sum, r) => sum + (r.passHeartCost ?? 0), 0);
  if (heartCost && next.hearts[actor] > heartCost) {
    next = directDamage(next, actor, heartCost, 'dadoOsso');
    next = proc(next, { source: 'relic', id: 'dadoOsso', text: actor === 'player' ? `DADO DE OSSO: PASSAR CUSTOU ${heartCost}♥` : 'DADO DELE: −1♥', tone: tone(other(actor)), owner: actor });
  }
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

/** Canivete Suíço: abre a escolha da pedra que vai virar bucha (1x por partida). */
function openCanivete(state) {
  if (!canUseCanivete(state)) return state;
  return { ...state, pending: { type: 'canivete' } };
}

/** Canivete Suíço: a pedra escolhida vira a bucha do número maior dela (uma cópia, como no painel DEV). */
function caniveteTransform(state, { tileId }) {
  if (state.phase !== 'playing' || state.pending?.type !== 'canivete') return state;
  const hand = state.hands.player;
  const tile = hand.find((t) => t.id === tileId);
  if (!tile) return state;
  const v = Math.max(tile.a, tile.b);
  const taken = new Set([...boardTilesInOrder(state.board), ...hand, ...state.hands.tioZe, ...state.boneyard].map((t) => t.id));
  let n = 1;
  while (taken.has(`${canonicalId(v, v)}#c${n}`)) n += 1;
  const double = { id: `${canonicalId(v, v)}#c${n}`, a: v, b: v };
  let next = {
    ...state,
    pending: null,
    openingTileId: state.openingTileId === tileId ? null : state.openingTileId,
    hands: { ...state.hands, player: hand.map((t) => (t.id === tileId ? double : t)) },
    matchFx: { ...state.matchFx, caniveteUsed: true },
  };
  next = emit(next, { type: 'canivete', from: tileId, to: double.id });
  return proc(next, { source: 'relic', id: 'canivete', text: `CANIVETE: [${tile.a}|${tile.b}] VIROU [${v}|${v}]`, tone: 'player', owner: 'player' });
}

function cancelCanivete(state) {
  if (state.pending?.type !== 'canivete') return state;
  return { ...state, pending: null };
}

/** Conquista nova (engine/achievements.js): o talismã passa a sair na loja e no beco. */
function unlockRelics(state, { ids, reset = false }) {
  // `reset` (DEV): zera a lista antes (as conquistas foram apagadas)
  const current = reset ? [] : state.unlocks;
  const fresh = (ids ?? []).filter((id) => RELICS[id] && !current.includes(id));
  if (!fresh.length && !reset) return state;
  return { ...state, unlocks: [...current, ...fresh] };
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

/**
 * Dedo de Cadáver Amarrado (talismã seu): sem jogada, o rival compra de graça do dorme
 * até achar uma pedra que encaixa (ou o dorme secar).
 */
function foeDrawsUntilPlay(state) {
  if (!state.board.root || !relicsOf(state, 'player').some((r) => r.foeDrawsUntilPlay) || hasPlayFor(state, 'tioZe')) return state;
  let next = state;
  let drawn = 0;
  while (next.boneyard.length && !hasPlayFor(next, 'tioZe')) {
    const [raw, ...boneyard] = next.boneyard;
    const tile = dressTile(next, 'tioZe', raw);
    next = { ...next, boneyard, hands: { ...next.hands, tioZe: [...next.hands.tioZe, tile] } };
    next = emit(next, { type: 'drawTile', by: 'tioZe', tileId: tile.id, cost: null, forced: true });
    drawn += 1;
  }
  if (!drawn) return state;
  return proc(next, { source: 'relic', id: 'dedoCadaver', text: `DEDO DE CADÁVER: ELE COMPROU ${drawn}`, tone: 'player', owner: 'player' });
}

function tioZeAct(input) {
  if (!canAct(input, 'tioZe')) return input;
  const state = foeDrawsUntilPlay(input);
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
  const price = sellPriceFor(state, id);
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
  const next = clearCurrent({ ...state, phase: 'map', shop: null, market: null, coinEvent: null, encounter: null, tableMod: null, ...extra });
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
  return enterNode(state, campaignOf(state).byId.get(id), deck);
}

/** Entra no nó (sem conferir se ele está aberto: o mapa confere; o painel DEV pula direto). */
function enterNode(state, node, deck) {
  const id = node.id;
  if ((node.type === 'combat' || node.type === 'boss') && !deck) return state;
  const path = state.run.path.at(-1) === id ? state.run.path : [...state.run.path.filter((p) => p !== id), id];
  const cleared = state.run.cleared.filter((c) => c !== id);
  let next = { ...state, pending: null, run: { ...state.run, node: id, path, cleared } };
  // Só no Osso (desafio): loja e Mercado Negro de portas fechadas, você passa reto
  if (challengeIs(state, 'soNoOsso') && (node.type === 'shop' || node.type === 'black')) {
    next = { ...next, phase: 'map', run: { ...next.run, cleared: [...cleared, id] } };
    return emit(next, { type: 'nodeClosed', node: id, kind: node.type });
  }
  next = emit(next, { type: 'nodeEnter', node: id, kind: node.type, tableMod: node.mod ?? null });
  switch (node.type) {
    case 'combat':
    case 'boss':
      // Patch 0.9.4: a regra de mesa do nó (se tiver) vale a partida inteira
      return startMatch({ ...next, tableMod: node.mod ?? null }, node.rivalId, deck);
    case 'event':
      next = { ...next, phase: 'encounter', encounter: { id: node.encounter, node: id, choice: null, outcome: null } };
      return emit(next, { type: 'encounterOpen', id: node.encounter, node: id });
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

/**
 * Evento de dilema (Patch 0.9.4): a escolha vale na hora (o desfecho sai da semente) e o nó já
 * conta como feito (sair do jogo no meio não deixa escolher de novo).
 */
function chooseEncounter(state, { choice }) {
  const enc = state.encounter;
  if (state.phase !== 'encounter' || !enc || enc.choice || !encounterOf(enc.id)) return state;
  if (choice !== 'a' && choice !== 'b') return state;
  if (encounterOptionBlock(state, enc.id, choice)) return state;
  const { state: applied, outcome } = resolveEncounter(state, enc.id, choice, enc.node);
  let next = clearCurrent({ ...applied, encounter: { ...enc, choice, outcome } });
  next = emit(next, { type: 'encounterResolved', id: enc.id, choice, tone: outcome.tone });
  return next;
}

function leaveEncounter(state) {
  if (state.phase !== 'encounter' || !state.encounter?.choice) return state;
  return backToMap(state);
}

function leaveEvent(state) {
  if (state.phase !== 'coinEvent') return state;
  return backToMap(state);
}

/** Run nova, parada no mapa antes do primeiro nó (a teia sai da semente). */
function newRun(state, action) {
  const base = createInitialState();
  // dificuldade (Peças Pretas: 4 corações e $3), desafio e maleta (Só no Osso: só a Clássica)
  const mode = modeOf(action.mode);
  const challenge = CHALLENGES[action.challenge] ? action.challenge : null;
  const maletaId = challenge === 'soNoOsso' ? DEFAULT_MALETA : MALETAS[action.maleta] ? action.maleta : DEFAULT_MALETA;
  const maleta = maletaOf(maletaId);
  const perks = (action.perks ?? []).filter((id) => UPGRADES[id]);
  const bare = challenge === 'soNoOsso';
  // semente em texto (Patch 0.9.2): o número sai dela quando o App não manda os dois
  const seedCode = normalizeSeed(action.seedCode);
  const sized = { maleta: maletaId, perks };
  const relics = bare ? [] : [...maleta.relics, ...(action.relics ?? [])].filter((id, i, all) => getRelic(id) && all.indexOf(id) === i).slice(0, relicSlotsFor(sized));
  const maxHearts = challenge === 'tudoOuNada' ? 1 : mode.maxHearts;
  const fresh = {
    ...base,
    phase: 'map',
    // Patch 0.9.4: teia v2 (eventos e regras de mesa); `map: 1` refaz a teia de antes (testes, simulações)
    run: { ...base.run, map: action.map === 1 ? 1 : MAP_VERSION },
    mode: mode.id,
    maleta: maletaId,
    challenge,
    perks,
    hearts: { ...base.hearts, player: maxHearts },
    maxHearts: { ...base.maxHearts, player: maxHearts },
    coins: { ...base.coins, player: startCoinsFor(mode.startCoins, maletaId, perks) },
    relics: bySeat(relics, []),
    decks: bySeat(bare ? {} : { ...maleta.playerDeck, ...(action.playerDeck ?? {}) }, {}),
    seed: Number.isFinite(action.seed) ? action.seed >>> 0 : seedCode ? seedNumberOf(seedCode) : null,
    seedCode,
    unlocks: (action.unlocks ?? state.unlocks ?? []).filter((id) => RELICS[id]),
    seq: state.seq,
    events: state.events,
  };
  return emit(fresh, { type: 'runStart', mode: mode.id, maleta: maletaId, challenge });
}

/** CONTINUAR: volta para o mapa (ou para a loja / o mercado) exatamente como o save guardou. */
function loadRun(state, action) {
  const { save } = action;
  if (!isValidSave(save)) return state;
  const phase = save.resume === 'shop' ? 'shop' : save.resume === 'blackMarket' ? 'blackMarket' : 'map';
  let next = {
    ...createInitialState(),
    phase,
    seed: save.seed ?? null,
    seedCode: normalizeSeed(save.seedCode),
    run: {
      node: save.node,
      cleared: [...save.cleared],
      path: [...save.path],
      match: save.match,
      history: [...save.history],
      fiadoUsed: Boolean(save.fiadoUsed),
      secret: false,
      map: save.map === MAP_VERSION ? MAP_VERSION : 1,
      scars: Number.isInteger(save.scars) && save.scars > 0 ? save.scars : 0,
    },
    maleta: MALETAS[save.maleta] ? save.maleta : DEFAULT_MALETA,
    challenge: CHALLENGES[save.challenge] ? save.challenge : null,
    perks: (action.perks ?? []).filter((id) => UPGRADES[id]),
    coins: bySeat(save.coins, 0),
    relics: bySeat([...save.relics], []),
    decks: bySeat({ ...save.deck }, {}),
    stats: {
      roundsWon: { ...createInitialState().stats.roundsWon, ...save.stats?.roundsWon },
      coinsEarned: save.stats?.coinsEarned ?? 0,
      matchesWon: save.stats?.matchesWon ?? 0,
      caps: save.stats?.caps ?? 0,
    },
    unlocks: (action.unlocks ?? state.unlocks ?? []).filter((id) => RELICS[id]),
    seq: state.seq,
    events: state.events,
  };
  const mode = modeOf(save.mode).id;
  const rival = rivalFor(currentNode(next)?.rivalId ?? FIRST_RIVAL, mode);
  next = { ...next, mode };
  const max = playerMaxHearts(next);
  next = {
    ...next,
    rivalId: rival.id,
    hearts: bySeat(Math.min(save.hearts, max), rival.hearts),
    maxHearts: bySeat(max, rival.hearts),
    coins: bySeat(save.coins, rival.coins),
  };
  if (phase === 'shop') next = { ...next, shop: save.shop ? { ...save.shop } : buildShop(next, 0) };
  if (phase === 'blackMarket') next = { ...next, market: save.market ? { offers: save.market.offers.map((o) => ({ ...o })) } : buildMarket(next) };
  return emit(next, { type: 'runLoaded', node: save.node });
}

// ---------------------------------------------------------------------------
// Partida de treino (Patch 0.9.5, data/tutorial.js)
// ---------------------------------------------------------------------------

/**
 * Senta com o Vô Juca: estado zerado (nada da run, nada do save), 5 corações seus, 3 dele, e
 * a rodada 1 com as mãos do roteiro. A teia, a semente e a carreira não são tocadas.
 */
function startTutorial(state, action) {
  const tutor = getRival(TUTOR_ID);
  let next = {
    ...createInitialState(),
    rivalId: TUTOR_ID,
    hearts: bySeat(MAX_HEARTS, tutor.hearts),
    maxHearts: bySeat(MAX_HEARTS, tutor.hearts),
    coins: bySeat(STARTING_COINS, tutor.coins),
    tutorial: { step: 0, replay: Boolean(action.replay) },
    unlocks: state.unlocks,
    seq: state.seq,
    events: state.events,
  };
  next = emit(next, { type: 'duelStart', rivalId: TUTOR_ID, match: 0, tableMod: null, tutorial: true });
  return startRound(next, null, tutorialDeal(1));
}

/** Próximo passo do roteiro, com o que acontece ao chegar nele (o presente, a rodada 2). */
function advanceTutorial(state) {
  const step = state.tutorial.step + 1;
  let next = { ...state, tutorial: { ...state.tutorial, step } };
  const enter = TUTORIAL_STEPS[step]?.enter;
  if (enter?.grant && getRelic(enter.grant) && !next.relics.player.includes(enter.grant)) {
    next = { ...next, relics: { ...next.relics, player: [...next.relics.player, enter.grant] } };
    next = proc(next, { source: 'relic', id: enter.grant, text: `${RELICS[enter.grant].name.toUpperCase()}!`, tone: 'player', owner: 'player' });
  }
  if (enter?.round && next.phase === 'roundOver') next = startRound(next, null, tutorialDeal(enter.round));
  return next;
}

/** A jogada valeu (o estado mudou)? Então o roteiro anda. */
const tutorialMoved = (before, after) => (after === before ? before : advanceTutorial(after));

/** Ações que, no treino, só passam se forem exatamente o que o passo espera. */
const TUTORIAL_GATED = new Set([
  'PLAY',
  'DRAW',
  'DRAW_PICK',
  'PASS',
  'DISCARD',
  'SKIP_DISCARD',
  'UNDO',
  'TIO_ZE_ACT',
  'USE_CANIVETE',
  'CANIVETE_PICK',
  'CANCEL_CANIVETE',
  'NEXT_ROUND',
  'OPEN_MAP',
  'ENTER_NODE',
  'CHOOSE_NODE',
  'START_SECRET',
  'DEV',
]);

function tutorialAction(state, action) {
  const expect = tutorialStepOf(state)?.expect;
  if (!expect) return state;
  switch (action.type) {
    case 'PLAY':
      if (action.actor !== 'player' || expect.type !== 'play' || action.tileId !== expect.tile || action.side !== expect.side) return state;
      return tutorialMoved(state, playTile(state, action));
    case 'DRAW':
      if (action.actor !== 'player' || expect.type !== 'draw') return state;
      return tutorialMoved(state, drawTile(state, action));
    case 'PASS':
      if (action.actor !== 'player' || expect.type !== 'pass') return state;
      return tutorialMoved(state, passTurn(state, action));
    case 'TIO_ZE_ACT': {
      // o Vô Juca joga o que está no roteiro (nunca a IA)
      if (expect.type !== 'rival' || !canAct(state, 'tioZe')) return state;
      const { action: move } = expect;
      const acted =
        move.type === 'PLAY'
          ? playTile(state, { ...move, actor: 'tioZe' })
          : move.type === 'DRAW'
            ? drawTile(state, { actor: 'tioZe' })
            : passTurn(state, { actor: 'tioZe' });
      return tutorialMoved(state, acted);
    }
    default:
      return state;
  }
}

/** Tocar no balão: passa o passo que só espera o toque. */
function tutorialNext(state) {
  if (tutorialStepOf(state)?.expect.type !== 'tap') return state;
  return advanceTutorial(state);
}

// ---------------------------------------------------------------------------
// Painel DEV (src/components/DevPanel.jsx)
// ---------------------------------------------------------------------------

const DEV_PLAYING_ONLY = new Set(['addTile', 'damageTioZe', 'emptyTioZeHand', 'clearBoard', 'forceTranca', 'winMatch', 'setTableMod']);

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
      if (!owned && state.relics.player.length >= relicSlotsFor(state)) return state;
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
    case 'openStop': {
      // atalho do painel DEV: entra na loja, no Mercado Negro ou no Seu Tião da região atual
      // Patch 0.9.4: 'event' abre um nó [?] (só na teia v2), com o dilema escolhido em `encounter`
      if (!['shop', 'black', 'coins', 'event'].includes(action.kind)) return state;
      const campaign = campaignOf(state);
      const region = regionIdOf(state);
      const stops = [...campaign.byId.values()].filter((n) => n.type === action.kind);
      const found = stops.find((n) => n.region === region) ?? stops[0];
      if (!found) return state;
      const node = action.kind === 'event' && encounterOf(action.encounter) ? { ...found, encounter: action.encounter } : found;
      const fresh = { ...state, shop: null, market: null, coinEvent: null, encounter: null, tableMod: null, roundResult: null };
      return emit(enterNode(fresh, node, null), { type: 'dev', op, kind: action.kind });
    }
    case 'setRival': {
      if (!RIVALS[action.rivalId] || !action.deck) return state;
      // pula para um nó desse rival na teia desta run (região, loja e chefe batem com ele)
      const node = [...campaignOf(state).byId.values()].find((n) => n.rivalId === action.rivalId);
      const run = node ? { ...state.run, node: node.id, path: [node.id], cleared: [] } : state.run;
      const jumped = { ...state, pending: null, shop: null, market: null, coinEvent: null, encounter: null, tableMod: node?.mod ?? null, run };
      return startMatch(jumped, action.rivalId, action.deck, { advance: state.run.match === 0 });
    }
    case 'setTableMod': {
      // Patch 0.9.4: liga (ou tira) uma regra de mesa na partida em andamento
      const id = tableModifierOf(action.id) ? action.id : null;
      let next = { ...state, tableMod: id, matchFx: { ...state.matchFx, stakesUsed: false }, fx: { ...state.fx, wetUsed: false } };
      next = emit(next, { type: 'dev', op, id });
      return id ? proc(next, { source: 'table', id, text: `REGRA DA MESA: ${tableModifierOf(id).name.toUpperCase()}`, tone: 'info', owner: 'player' }) : next;
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
    case 'secretReveal': {
      // atalho: pula direto para a revelação do Dono da Noite (como se o Comendador tivesse caído)
      const next = { ...state, phase: 'secretReveal', pending: null, roundResult: null, run: { ...state.run, secret: true } };
      return emit(next, { type: 'dev', op });
    }
    default:
      return state;
  }
}

export function gameReducer(state, action) {
  // Patch 0.9.5: no treino, a mesa só aceita o que o roteiro pede
  if (state.tutorial && TUTORIAL_GATED.has(action.type)) return tutorialAction(state, action);
  switch (action.type) {
    case 'START_TUTORIAL':
      return startTutorial(state, action);
    case 'TUTORIAL_NEXT':
      return tutorialNext(state);
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
      // Patch 0.9.4: `tableMod` força uma regra de mesa (testes e simulações)
      return startMatch({ ...next, tableMod: tableModifierOf(action.tableMod) ? action.tableMod : null }, rivalId, action.deck);
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
    case 'USE_CANIVETE':
      return openCanivete(state);
    case 'CANIVETE_PICK':
      return caniveteTransform(state, action);
    case 'CANCEL_CANIVETE':
      return cancelCanivete(state);
    case 'UNLOCK_RELICS':
      return unlockRelics(state, action);
    case 'START_SECRET':
      return startSecret(state, action);
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
    case 'ENCOUNTER_CHOOSE':
      return chooseEncounter(state, action);
    case 'LEAVE_ENCOUNTER':
      return leaveEncounter(state);
    case 'LEAVE_EVENT':
      return leaveEvent(state);
    case 'DEV':
      return devAction(state, action);
    case 'RETURN_TO_TITLE':
      return { ...createInitialState(), unlocks: state.unlocks, seq: state.seq, events: state.events };
    default:
      return state;
  }
}
