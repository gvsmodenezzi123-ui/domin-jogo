/**
 * Versão 2.4 (início do online de 2 a 4): o motor da mesa de N cadeiras.
 *
 * Um reducer puro, à parte do `gameReducer` (o solo, o tutorial e o duelo 1×1 continuam
 * nele, intocados). Reaproveita as regras de encaixe de `dominoLogic` e muda só o que
 * depende do número de cadeiras:
 *   - mão de 7 com 2 ou 3 jogadores, de 6 com 4 (a escada de compra continua tendo dorme);
 *   - a vez gira pela ordem das cadeiras (anti-horária na mesa), pulando quem já saiu;
 *   - batida: o dano vai para cada um dos outros vivos (ou só para a mão mais pesada);
 *   - tranca: quem tem a menor soma escapa, os outros levam 1 (todos empatados: ninguém);
 *   - quem zera sai; o último vivo vence; a ordem das saídas dá o pódio.
 *
 * Talismãs, pedras de grife e duplas entram nas próximas fases (o documento "Buxaria Online
 * — Mesas de 2 a 4"). A semente da mesa é só dela: nada aqui toca as sementes do solo.
 */
import {
  DAMAGE,
  FULL_SET,
  MULTIPLE_OF_FIVE_BONUS,
  SIDES,
  classifyBatida,
  createEmptyBoard,
  getDrawAvailability,
  getOpenEnds,
  getPassAvailability,
  getPlayableMoves,
  getValidSides,
  hasAnyPlay,
  isDouble,
  isMultipleOfFive,
  isTrancaFechada,
  isTurnExhausted,
  pipSum,
  placeTile,
  sortHand,
} from '../engine/dominoLogic.js';
import { mixSeed, mulberry32, shuffleWith } from '../engine/seedEngine.js';

export const MIN_SEATS = 2;
export const MAX_SEATS = 4;

/** Regras da mesa que o anfitrião escolhe (as decisões abertas do documento). */
export const DEFAULT_TABLE_RULES = Object.freeze({
  /** 'todos': a batida fere cada um dos outros vivos · 'pesada': só quem tem a mão mais pesada. */
  batida: 'todos',
  /** pedras na mão com 4 jogadores: 6 (dorme de 4) ou 7 (sem dorme). */
  hand4: 6,
});

/** Quantas pedras cada um recebe com `alive` jogadores na mesa. */
export function handSizeFor(alive, rules = DEFAULT_TABLE_RULES) {
  if (alive >= 4) return rules.hand4 === 7 ? 7 : 6;
  return 7;
}

/** Cadeiras vivas, na ordem da mesa. */
export const aliveSeats = (state) => state.seats.filter((s) => s.alive);
const seatOf = (state, id) => state.seats.find((s) => s.id === id);
const handSumOf = (hand) => hand.reduce((sum, t) => sum + pipSum(t), 0);

/** A próxima cadeira viva depois de `id` (a vez gira pela ordem das cadeiras). */
export function nextAlive(state, id) {
  const n = state.seats.length;
  const at = state.seats.findIndex((s) => s.id === id);
  for (let k = 1; k <= n; k += 1) {
    const seat = state.seats[(at + k) % n];
    if (seat.alive) return seat.id;
  }
  return id;
}

/**
 * Quem abre quando não há vencedor anterior: a maior bucha; sem bucha, a pedra mais
 * pesada (desempate pelo maior número). A mesma régua do duelo, para N cadeiras.
 */
export function findTableOpening(hands, ids) {
  let best = null;
  const rank = (tile) => (isDouble(tile) ? 1000 + tile.a : pipSum(tile) * 10 + Math.max(tile.a, tile.b));
  for (const id of ids) {
    for (const tile of hands[id] ?? []) {
      const r = rank(tile);
      if (!best || r > best.rank) best = { starter: id, tileId: tile.id, rank: r };
    }
  }
  return best ? { starter: best.starter, tileId: best.tileId } : null;
}

/** O baralho embaralhado da rodada: semente da mesa + número da rodada. */
export function roundDeck(seed, round) {
  return shuffleWith(FULL_SET, mulberry32(mixSeed(seed >>> 0, `mesa:${round}`)));
}

/**
 * Cria a mesa. `seats` = [{ id, name, face?, bot? }] na ordem em que sentaram (2 a 4).
 * Todos começam com os mesmos corações e moedas da sala.
 */
export function createTable({ seed, seats, hearts = 5, coins = 100, rules = {} }) {
  if (!Array.isArray(seats) || seats.length < MIN_SEATS || seats.length > MAX_SEATS) {
    throw new Error(`A mesa precisa de ${MIN_SEATS} a ${MAX_SEATS} cadeiras.`);
  }
  const ids = new Set(seats.map((s) => s.id));
  if (ids.size !== seats.length) throw new Error('Duas cadeiras com o mesmo id.');
  return {
    v: 1,
    seed: seed >>> 0,
    rules: { ...DEFAULT_TABLE_RULES, ...rules },
    maxHearts: hearts,
    seats: seats.map((s) => ({ id: s.id, name: s.name ?? s.id, face: s.face ?? null, bot: Boolean(s.bot), hearts, coins, alive: true, place: null })),
    round: 0,
    phase: 'lobby',
    hands: {},
    boneyard: [],
    board: createEmptyBoard(),
    turn: null,
    openingTileId: null,
    nextStarter: null,
    drawsThisTurn: 0,
    passStreak: 0,
    lastAction: {},
    result: null,
    winner: null,
    seq: 0,
    events: [],
  };
}

/** Uma ação aceita: numera e troca os eventos (o HUD e o som leem só os da última ação). */
const commit = (state, events) => ({ ...state, seq: state.seq + 1, events });

/** Distribui a rodada entre os vivos e decide quem abre. */
function startRound(state) {
  if (state.phase !== 'lobby' && state.phase !== 'roundOver') return state;
  const alive = aliveSeats(state);
  if (alive.length < MIN_SEATS) return state;
  const round = state.round + 1;
  const size = handSizeFor(alive.length, state.rules);
  const deck = roundDeck(state.seed, round);
  const hands = {};
  alive.forEach((seat, i) => {
    hands[seat.id] = sortHand(deck.slice(i * size, (i + 1) * size));
  });
  // quem já saiu fica sem mão (o HUD mostra a cadeira apagada)
  for (const seat of state.seats) if (!seat.alive) hands[seat.id] = [];
  const boneyard = deck.slice(alive.length * size);
  const keep = state.nextStarter && seatOf(state, state.nextStarter)?.alive;
  const opening = keep ? null : findTableOpening(hands, alive.map((s) => s.id));
  const turn = keep ? state.nextStarter : opening.starter;
  const next = {
    ...state,
    round,
    phase: 'playing',
    hands,
    boneyard,
    board: createEmptyBoard(),
    turn,
    openingTileId: opening?.tileId ?? null,
    drawsThisTurn: 0,
    passStreak: 0,
    lastAction: {},
    result: null,
  };
  return commit(next, [{ type: 'roundStart', round, starter: turn, openingTileId: next.openingTileId, handSize: size }]);
}

const canAct = (state, seat) => state.phase === 'playing' && state.turn === seat && seatOf(state, seat)?.alive;

/** Pedras no dorme (o espelho de uma cadeira só traz o número). */
const boneyardCountOf = (state) => state.boneyardCount ?? state.boneyard.length;

/** O que a cadeira da vez pode fazer agora (para o HUD, o bot e a validação). Vale no espelho. */
export function turnOptions(state, seat = state.turn) {
  const me = seatOf(state, seat);
  if (!me || !canAct(state, seat)) return { moves: [], draw: { allowed: false }, pass: { allowed: false }, exhausted: false };
  const hand = state.hands[seat];
  const required = !state.board.root ? state.openingTileId : null;
  const moves = getPlayableMoves(hand, state.board, required);
  const draw = state.board.root
    ? getDrawAvailability({ drawsThisTurn: state.drawsThisTurn, boneyardCount: boneyardCountOf(state), coins: me.coins, hearts: me.hearts })
    : { allowed: false, reason: 'opening', cost: null };
  const pass = state.board.root
    ? getPassAvailability({ hasPlay: moves.length > 0, drawsThisTurn: state.drawsThisTurn, boneyardCount: boneyardCountOf(state), coins: me.coins })
    : { allowed: false, cost: 0, reason: 'opening' };
  const exhausted = Boolean(state.board.root) && isTurnExhausted({ hasPlay: moves.length > 0, drawsThisTurn: state.drawsThisTurn, drawAllowed: draw.allowed });
  return { moves, draw, pass, exhausted };
}

const patchSeat = (state, id, patch) => ({ ...state, seats: state.seats.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

/** Passa a vez para a próxima cadeira viva. */
const advance = (state, from) => ({ ...state, turn: nextAlive(state, from), drawsThisTurn: 0 });

/** Ninguém vivo encaixa nada e não há o que comprar (ou a mesa fechou): tranca. */
function blocked(state) {
  const alive = aliveSeats(state);
  const stuck = alive.every((s) => !hasAnyPlay(state.hands[s.id], state.board));
  if (!stuck) return null;
  if (isTrancaFechada(state.board)) return 'fechada';
  if (state.boneyard.length === 0) return 'bloqueio';
  return null;
}

function playTile(state, { seat, tileId, side }) {
  if (!canAct(state, seat)) return state;
  const hand = state.hands[seat];
  const tile = hand.find((t) => t.id === tileId);
  if (!tile) return state;
  const opening = !state.board.root;
  if (opening && state.openingTileId && tileId !== state.openingTileId) return state;
  const where = opening ? SIDES.ROOT : side;
  if (!getValidSides(tile, state.board).includes(where)) return state;
  const endsBefore = getOpenEnds(state.board);
  const board = placeTile(state.board, tile, where, undefined, { by: seat });
  const rest = hand.filter((t) => t.id !== tileId);
  let next = { ...state, board, hands: { ...state.hands, [seat]: rest }, passStreak: 0, openingTileId: null };
  const events = [{ type: 'play', by: seat, tileId, side: where }];
  // múltiplo de 5: +$3 para quem fechou, em qualquer tamanho de mesa
  if (!opening && isMultipleOfFive(board)) {
    const me = seatOf(next, seat);
    next = patchSeat(next, seat, { coins: me.coins + MULTIPLE_OF_FIVE_BONUS });
    events.push({ type: 'five', by: seat, amount: MULTIPLE_OF_FIVE_BONUS });
  }
  next = { ...next, lastAction: { ...next.lastAction, [seat]: { kind: 'play', tileId } } };
  if (rest.length === 0) {
    const kind = classifyBatida(tile, endsBefore);
    return finishRound(next, { kind: 'batida', batida: kind, by: seat }, events);
  }
  const lock = blocked(next);
  if (lock) return finishRound(next, { kind: 'tranca', reason: lock }, events);
  return commit(advance(next, seat), events);
}

function drawTile(state, { seat }) {
  if (!canAct(state, seat) || !state.board.root) return state;
  const me = seatOf(state, seat);
  const rule = getDrawAvailability({ drawsThisTurn: state.drawsThisTurn, boneyardCount: state.boneyard.length, coins: me.coins, hearts: me.hearts });
  if (!rule.allowed) return state;
  const { cost } = rule;
  const [tile, ...boneyard] = state.boneyard;
  let next = { ...state, boneyard, hands: { ...state.hands, [seat]: sortHand([...state.hands[seat], tile]) }, drawsThisTurn: state.drawsThisTurn + 1 };
  if (cost.type === 'coins') next = patchSeat(next, seat, { coins: me.coins - cost.amount });
  if (cost.type === 'heart') next = patchSeat(next, seat, { hearts: me.hearts - cost.amount });
  next = { ...next, lastAction: { ...next.lastAction, [seat]: { kind: 'draw', count: next.drawsThisTurn } } };
  const events = [{ type: 'draw', by: seat, cost, n: next.drawsThisTurn }];
  const lock = blocked(next);
  if (lock) return finishRound(next, { kind: 'tranca', reason: lock }, events);
  return commit(next, events);
}

function passTurn(state, { seat }) {
  if (!canAct(state, seat) || !state.board.root) return state;
  const rule = turnOptions(state, seat).pass;
  if (!rule.allowed) return state;
  const me = seatOf(state, seat);
  let next = { ...state, passStreak: state.passStreak + 1 };
  if (rule.cost > 0) next = patchSeat(next, seat, { coins: me.coins - rule.cost });
  next = { ...next, lastAction: { ...next.lastAction, [seat]: { kind: 'pass', cost: rule.cost } } };
  const events = [{ type: 'pass', by: seat, cost: rule.cost }];
  // uma volta inteira de passes: ninguém quis (ou pôde) jogar
  if (next.passStreak >= aliveSeats(next).length) return finishRound(next, { kind: 'tranca', reason: 'passes' }, events);
  return commit(advance(next, seat), events);
}

/**
 * Fecha a rodada: calcula quem leva dano, tira os corações, marca quem saiu (com a
 * colocação) e decide se a partida acabou.
 */
function finishRound(state, outcome, events = []) {
  const alive = aliveSeats(state);
  const sums = Object.fromEntries(alive.map((s) => [s.id, handSumOf(state.hands[s.id])]));
  const damage = {};
  let spared;
  let nextStarter;
  if (outcome.kind === 'batida') {
    const amount = DAMAGE[outcome.batida] ?? DAMAGE.normal;
    let victims = alive.filter((s) => s.id !== outcome.by);
    if (state.rules.batida === 'pesada' && victims.length) {
      const top = Math.max(...victims.map((s) => sums[s.id]));
      victims = victims.filter((s) => sums[s.id] === top);
    }
    for (const v of victims) damage[v.id] = amount;
    spared = [outcome.by];
    nextStarter = outcome.by;
  } else {
    const low = Math.min(...alive.map((s) => sums[s.id]));
    spared = alive.filter((s) => sums[s.id] === low).map((s) => s.id);
    if (spared.length < alive.length) {
      for (const s of alive) if (!spared.includes(s.id)) damage[s.id] = DAMAGE.tranca;
    }
    nextStarter = spared.length === 1 ? spared[0] : null;
  }

  let next = { ...state };
  const out = [];
  for (const [id, amount] of Object.entries(damage)) {
    const seat = seatOf(next, id);
    const hearts = Math.max(0, seat.hearts - amount);
    next = patchSeat(next, id, { hearts });
    events.push({ type: 'damage', who: id, amount, hearts });
    if (hearts === 0) out.push(id);
  }
  // quem saiu neste golpe divide as últimas colocações; a mão mais leve fica à frente
  const left = alive.length - out.length;
  const ranked = out.slice().sort((x, y) => sums[x] - sums[y]);
  ranked.forEach((id) => {
    // empatados na soma dividem a colocação
    const place = left + 1 + ranked.findIndex((o) => sums[o] === sums[id]);
    next = patchSeat(next, id, { alive: false, place });
    events.push({ type: 'eliminated', who: id, place });
  });
  const survivors = aliveSeats(next);
  const over = survivors.length <= 1;
  if (over && survivors.length === 1) next = patchSeat(next, survivors[0].id, { place: 1 });
  const result = { ...outcome, sums, damage, spared, eliminated: ranked, round: state.round };
  events.push({ type: 'roundOver', result });
  if (over) events.push({ type: 'matchOver', winner: survivors[0]?.id ?? null });
  next = {
    ...next,
    phase: over ? 'matchOver' : 'roundOver',
    turn: null,
    result,
    nextStarter: nextStarter && seatOf(next, nextStarter)?.alive ? nextStarter : null,
    winner: over ? (survivors[0]?.id ?? null) : null,
  };
  return commit(next, events);
}

/**
 * W.O. ou saída de propósito: a cadeira zera e sai. Se era a vez dela, a vez segue; se só
 * sobrar um, a partida acaba. As pedras dela ficam fora da rodada (não contam na tranca).
 */
function forfeit(state, { seat }) {
  const me = seatOf(state, seat);
  if (!me?.alive || state.phase === 'matchOver' || state.phase === 'lobby') return state;
  const alive = aliveSeats(state).length;
  let next = patchSeat(state, seat, { hearts: 0, alive: false, place: alive });
  const events = [{ type: 'eliminated', who: seat, place: alive, reason: 'wo' }];
  const survivors = aliveSeats(next);
  if (survivors.length <= 1) {
    if (survivors.length === 1) next = patchSeat(next, survivors[0].id, { place: 1 });
    events.push({ type: 'matchOver', winner: survivors[0]?.id ?? null });
    return commit({ ...next, phase: 'matchOver', turn: null, winner: survivors[0]?.id ?? null }, events);
  }
  if (next.nextStarter === seat) next = { ...next, nextStarter: null };
  if (next.phase === 'playing') {
    const passStreak = Math.min(next.passStreak, survivors.length - 1);
    next = { ...next, passStreak };
    if (next.turn === seat) next = advance(next, seat);
    const lock = next.board.root ? blocked(next) : null;
    if (lock) return finishRound(next, { kind: 'tranca', reason: lock }, events);
  }
  return commit(next, events);
}

/** O reducer da mesa. Ações: START_ROUND · PLAY · DRAW · PASS · FORFEIT. */
export function tableReducer(state, action) {
  switch (action?.type) {
    case 'START_ROUND':
      return startRound(state);
    case 'PLAY':
      return playTile(state, action);
    case 'DRAW':
      return drawTile(state, action);
    case 'PASS':
      return passTurn(state, action);
    case 'FORFEIT':
      return forfeit(state, action);
    default:
      return state;
  }
}

/**
 * O espelho de uma cadeira: o que ela pode ver. A própria mão inteira; das outras, só
 * quantas pedras têm. O dorme vira um número. (A rede da fase 3 manda isto, nunca o estado.)
 */
export function viewFor(state, seat) {
  const handCounts = Object.fromEntries(Object.entries(state.hands).map(([id, hand]) => [id, hand.length]));
  const reveal = state.phase === 'roundOver' || state.phase === 'matchOver';
  const hands = reveal ? state.hands : { [seat]: state.hands[seat] ?? [] };
  const { boneyard, seed, ...rest } = state;
  void boneyard;
  void seed;
  return { ...rest, me: seat, hands, handCounts, boneyardCount: state.boneyard.length };
}

/**
 * A jogada do bot (as cadeiras vazias da prévia e o relógio de quem caiu): joga a pedra
 * mais pesada, preferindo fechar múltiplo de 5 e soltar bucha; sem jogada, compra; sem
 * compra, passa. Determinístico: a mesma mesa dá a mesma jogada.
 */
export function botAction(state, seat = state.turn) {
  if (state.phase !== 'playing' || state.turn !== seat) return null;
  const { moves, draw, pass } = turnOptions(state, seat);
  if (moves.length) {
    const score = ({ tile, side }) => {
      let s = pipSum(tile) * 2 + (isDouble(tile) ? 6 : 0);
      if (state.board.root) {
        const after = placeTile(state.board, tile, side);
        if (isMultipleOfFive(after)) s += 15;
      }
      return s;
    };
    const best = moves.reduce((top, m) => (score(m) > score(top) ? m : top), moves[0]);
    return { type: 'PLAY', seat, tileId: best.tile.id, side: best.side };
  }
  if (draw.allowed && draw.cost?.type !== 'heart') return { type: 'DRAW', seat };
  if (pass.allowed) return { type: 'PASS', seat };
  if (draw.allowed) return { type: 'DRAW', seat };
  return null;
}

/** Conta todas as pedras da mesa (mãos + dorme + mesa): devem ser sempre 28. */
export function countTiles(state) {
  const onBoard = state.board.root ? 1 + state.board.left.length + state.board.right.length : 0;
  const inHands = Object.values(state.hands).reduce((n, h) => n + h.length, 0);
  return onBoard + inHands + state.boneyard.length;
}
