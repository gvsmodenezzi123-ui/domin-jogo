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
 * Versão 2.7, duas regras novas (o anfitrião escolhe no saguão):
 *   - DUPLAS (só com 4): a 1ª e a 3ª cadeira contra a 2ª e a 4ª (os parceiros sentam de frente
 *     e a vez alterna entre as duplas). Se você ou o seu parceiro bate, os dois vencem e a outra
 *     dupla leva o dano; na tranca, vence a dupla com a menor soma das duas mãos. A vida (ou os
 *     tentos) é da dupla: os dois parceiros sobem e descem juntos.
 *   - TENTOS no lugar dos corações: ninguém sangra; cada rodada vencida (sozinho ou em dupla)
 *     vale 1 tento (uma tampinha amassada) e vence quem chegar primeiro à meta. A 3ª compra do
 *     turno, que custaria 1 coração, custa 1 tento.
 *
 * Talismãs e pedras de grife entram nas próximas fases (o documento "Buxaria Online — Mesas de
 * 2 a 4"). A semente da mesa é só dela: nada aqui toca as sementes do solo.
 */
import {
  DAMAGE,
  FULL_SET,
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
  isTrancaFechada,
  isTurnExhausted,
  pipSum,
  placeTile,
  sortHand,
} from '../engine/dominoLogic.js';
import { mixSeed, mulberry32, shuffleWith } from '../engine/seedEngine.js';

export const MIN_SEATS = 2;
export const MAX_SEATS = 5;

/** Regras da mesa que o anfitrião escolhe (as decisões abertas do documento). */
export const DEFAULT_TABLE_RULES = Object.freeze({
  /** 'todos': a batida fere cada um dos outros vivos · 'pesada': só quem tem a mão mais pesada. */
  batida: 'todos',
  /** pedras na mão com 4 jogadores: 6 (dorme de 4) ou 7 (sem dorme). */
  hand4: 6,
  /** Versão 2.7: duplas (só vale com 4 cadeiras): a 1ª e a 3ª contra a 2ª e a 4ª. */
  teams: false,
  /** Versão 2.7: 'coracoes' (perde quem zera) · 'tentos' (vence quem chegar primeiro à meta). */
  scoring: 'coracoes',
});

/** As duas duplas: a cadeira de número par é da A, a ímpar da B (parceiros sentam de frente). */
export const TEAMS = Object.freeze(['A', 'B']);
const teamForIndex = (i) => TEAMS[i % 2];

/** Quantas pedras cada um recebe com `alive` jogadores na mesa. */
export function handSizeFor(alive, rules = DEFAULT_TABLE_RULES) {
  // versão 2.33: com 5 na mesa, 5 pedras para cada um (as 3 que sobram ficam no dorme)
  if (alive >= 5) return 5;
  if (alive >= 4) return rules.hand4 === 7 ? 7 : 6;
  return 7;
}

/** Cadeiras vivas, na ordem da mesa. */
export const aliveSeats = (state) => state.seats.filter((s) => s.alive);
const seatOf = (state, id) => state.seats.find((s) => s.id === id);
const handSumOf = (hand) => hand.reduce((sum, t) => sum + pipSum(t), 0);

/** A mesa conta por tentos (tampinhas) em vez de corações? */
export const usesTentos = (state) => state.rules?.scoring === 'tentos';

/** Os ids da cadeira e do parceiro dela (sem duplas, só ela). */
export function matesOf(state, id) {
  const me = seatOf(state, id);
  if (!state.rules?.teams || !me?.team) return [id];
  return state.seats.filter((s) => s.team === me.team).map((s) => s.id);
}

/** O parceiro de `id` nas duplas (ou null). */
export function partnerOf(state, id) {
  return matesOf(state, id).find((m) => m !== id) ?? null;
}

/** As duplas que ainda têm alguém sentado. */
const teamsAlive = (state) => [...new Set(aliveSeats(state).map((s) => s.team))];

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
  const merged = { ...DEFAULT_TABLE_RULES, ...rules };
  // duplas só com as 4 cadeiras ocupadas; a contagem é corações ou tentos
  const ruleSet = { ...merged, teams: Boolean(merged.teams) && seats.length === 4, scoring: merged.scoring === 'tentos' ? 'tentos' : 'coracoes' };
  const tentos = ruleSet.scoring === 'tentos';
  return {
    v: 1,
    seed: seed >>> 0,
    rules: ruleSet,
    // com tentos, o número da sala é a meta (quantos tentos para vencer)
    maxHearts: hearts,
    target: tentos ? hearts : null,
    seats: seats.map((s, i) => ({
      id: s.id,
      name: s.name ?? s.id,
      face: s.face ?? null,
      bot: Boolean(s.bot),
      hearts: tentos ? 0 : hearts,
      tentos: 0,
      team: ruleSet.teams ? teamForIndex(i) : null,
      coins,
      alive: true,
      place: null,
    })),
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
    winners: [],
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

/**
 * A compra da vez: a escada de sempre (grátis, $3, 1 coração). Versão 2.7: com tentos, o
 * coração vira 1 tento (só compra quem tem um para dar).
 */
function drawRule(state, me) {
  if (!usesTentos(state)) return getDrawAvailability({ drawsThisTurn: state.drawsThisTurn, boneyardCount: boneyardCountOf(state), coins: me.coins, hearts: me.hearts });
  // a regra do coração exige sobrar 1 (hearts > 1): com tentos, basta ter 1 (tentos + 1 > 1)
  const rule = getDrawAvailability({ drawsThisTurn: state.drawsThisTurn, boneyardCount: boneyardCountOf(state), coins: me.coins, hearts: me.tentos + 1 });
  const cost = rule.cost?.type === 'heart' ? { type: 'tento', amount: rule.cost.amount } : rule.cost;
  return { ...rule, cost, reason: rule.reason === 'hearts' ? 'tentos' : rule.reason };
}

/** O que a cadeira da vez pode fazer agora (para o HUD, o bot e a validação). Vale no espelho. */
export function turnOptions(state, seat = state.turn) {
  const me = seatOf(state, seat);
  if (!me || !canAct(state, seat)) return { moves: [], draw: { allowed: false }, pass: { allowed: false }, exhausted: false };
  const hand = state.hands[seat];
  const required = !state.board.root ? state.openingTileId : null;
  const moves = getPlayableMoves(hand, state.board, required);
  const draw = state.board.root ? drawRule(state, me) : { allowed: false, reason: 'opening', cost: null };
  const pass = state.board.root
    ? getPassAvailability({ hasPlay: moves.length > 0, drawsThisTurn: state.drawsThisTurn, boneyardCount: boneyardCountOf(state), coins: me.coins })
    : { allowed: false, cost: 0, reason: 'opening' };
  const exhausted = Boolean(state.board.root) && isTurnExhausted({ hasPlay: moves.length > 0, drawsThisTurn: state.drawsThisTurn, drawAllowed: draw.allowed });
  return { moves, draw, pass, exhausted };
}

const patchSeat = (state, id, patch) => ({ ...state, seats: state.seats.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

/** Muda a vida (ou os tentos) da cadeira; nas duplas, do parceiro junto (é da dupla). */
function patchPool(state, id, field, value) {
  let next = state;
  for (const mate of matesOf(state, id)) {
    // quem saiu da dupla (W.O.) não volta a ter vida
    if (mate !== id && !seatOf(state, mate).alive) continue;
    next = patchSeat(next, mate, { [field]: value });
  }
  return next;
}

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
  // versão 2.22: na mesa de 2 a 4 o múltiplo de 5 não vale nada (só na campanha solo)
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
  const rule = drawRule(state, me);
  if (!rule.allowed) return state;
  const { cost } = rule;
  const [tile, ...boneyard] = state.boneyard;
  let next = { ...state, boneyard, hands: { ...state.hands, [seat]: sortHand([...state.hands[seat], tile]) }, drawsThisTurn: state.drawsThisTurn + 1 };
  if (cost.type === 'coins') next = patchSeat(next, seat, { coins: me.coins - cost.amount });
  // o coração (ou o tento) sai da vida da dupla inteira
  if (cost.type === 'heart') next = patchPool(next, seat, 'hearts', me.hearts - cost.amount);
  if (cost.type === 'tento') next = patchPool(next, seat, 'tentos', me.tentos - cost.amount);
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
 * Quem vence a rodada e quem leva o golpe. Sem duplas: quem bateu (ou a menor soma na tranca)
 * contra os outros vivos (ou só a mão mais pesada). Nas duplas: a dupla de quem bateu (ou a
 * de menor soma das duas mãos) contra a outra dupla inteira.
 */
function roundOutcome(state, outcome, sums) {
  const alive = aliveSeats(state);
  const amount = outcome.kind === 'batida' ? (DAMAGE[outcome.batida] ?? DAMAGE.normal) : DAMAGE.tranca;
  if (state.rules.teams) {
    let team = null;
    if (outcome.kind === 'batida') team = seatOf(state, outcome.by).team;
    else {
      const total = (t) => alive.filter((s) => s.team === t).reduce((n, s) => n + sums[s.id], 0);
      const [a, b] = TEAMS.map(total);
      if (a !== b) team = a < b ? TEAMS[0] : TEAMS[1];
    }
    if (!team) return { winners: [], losers: [], amount, nextStarter: null };
    const winners = alive.filter((s) => s.team === team).map((s) => s.id);
    const losers = alive.filter((s) => s.team !== team).map((s) => s.id);
    // na tranca, abre a próxima quem da dupla vencedora tem a mão mais leve
    const low = Math.min(...winners.map((id) => sums[id]));
    const lightest = winners.filter((id) => sums[id] === low);
    const nextStarter = outcome.kind === 'batida' ? outcome.by : lightest.length === 1 ? lightest[0] : null;
    return { winners, losers, amount, nextStarter };
  }
  if (outcome.kind === 'batida') {
    let victims = alive.filter((s) => s.id !== outcome.by);
    // "a mão mais pesada" só vale quando o golpe tira coração
    if (state.rules.batida === 'pesada' && !usesTentos(state) && victims.length) {
      const top = Math.max(...victims.map((s) => sums[s.id]));
      victims = victims.filter((s) => sums[s.id] === top);
    }
    return { winners: [outcome.by], losers: victims.map((s) => s.id), amount, nextStarter: outcome.by };
  }
  const low = Math.min(...alive.map((s) => sums[s.id]));
  const spared = alive.filter((s) => sums[s.id] === low).map((s) => s.id);
  // todos empatados na menor soma: ninguém vence, ninguém sangra
  if (spared.length === alive.length) return { winners: [], losers: [], amount, nextStarter: null };
  return { winners: spared, losers: alive.filter((s) => !spared.includes(s.id)).map((s) => s.id), amount, nextStarter: spared.length === 1 ? spared[0] : null };
}

/** Pódio por tentos: mais tentos na frente (empatados dividem); quem saiu fica atrás. */
function placeByTentos(state) {
  const alive = aliveSeats(state);
  let next = state;
  for (const s of alive) {
    const place = 1 + alive.filter((o) => o.tentos > s.tentos).length;
    next = patchSeat(next, s.id, { place });
  }
  return next;
}

/** Fim da partida com duplas: a dupla que sobrou (ou que fez a meta) em 1º, a outra em 2º. */
function placeTeams(state, team) {
  let next = state;
  for (const s of state.seats) next = patchSeat(next, s.id, { place: s.team === team ? 1 : 2, alive: s.team === team ? s.alive : false });
  return next;
}

/**
 * Fecha a rodada: com corações, calcula quem leva dano, tira os corações, marca quem saiu (com
 * a colocação) e decide se a partida acabou. Com tentos, dá a tampinha a quem venceu e confere
 * se alguém chegou à meta.
 */
function finishRound(state, outcome, events = []) {
  const alive = aliveSeats(state);
  const sums = Object.fromEntries(alive.map((s) => [s.id, handSumOf(state.hands[s.id])]));
  const { winners, losers, amount, nextStarter } = roundOutcome(state, outcome, sums);
  const teams = state.rules.teams;
  const damage = {};
  const tentos = {};
  let next = { ...state };
  let ranked = [];
  let over;
  let champion = null;

  if (usesTentos(state)) {
    // cada vitória vale 1 tento; nas duplas, 1 para a dupla (os dois sobem juntos)
    const done = new Set();
    for (const id of winners) {
      if (done.has(id)) continue;
      const seat = seatOf(next, id);
      const value = seat.tentos + 1;
      next = patchPool(next, id, 'tentos', value);
      for (const mate of matesOf(next, id)) {
        done.add(mate);
        if (seatOf(next, mate).alive) {
          tentos[mate] = 1;
          events.push({ type: 'tento', who: mate, tentos: value });
        }
      }
    }
    const top = Math.max(...aliveSeats(next).map((s) => s.tentos));
    over = top >= state.target;
    if (over) {
      if (teams) {
        champion = aliveSeats(next).find((s) => s.tentos === top).team;
        next = placeTeams(next, champion);
      } else next = placeByTentos(next);
    }
  } else {
    // o golpe: nas duplas, um coração da dupla (os dois descem juntos)
    const hit = new Set();
    for (const id of losers) {
      if (hit.has(id)) continue;
      const seat = seatOf(next, id);
      const hearts = Math.max(0, seat.hearts - amount);
      next = patchPool(next, id, 'hearts', hearts);
      for (const mate of matesOf(next, id)) {
        hit.add(mate);
        if (!seatOf(next, mate).alive) continue;
        damage[mate] = amount;
        events.push({ type: 'damage', who: mate, amount, hearts });
      }
    }
    const out = aliveSeats(next).filter((s) => s.hearts === 0).map((s) => s.id);
    if (teams) {
      // a dupla que zerou sai inteira; a outra vence a partida
      for (const id of out) {
        next = patchSeat(next, id, { alive: false });
        events.push({ type: 'eliminated', who: id, place: 2 });
      }
      ranked = out;
      const left = teamsAlive(next);
      over = left.length <= 1;
      if (over) {
        champion = left[0] ?? null;
        next = placeTeams(next, champion);
      }
    } else {
      // quem saiu neste golpe divide as últimas colocações; a mão mais leve fica à frente
      const left = alive.length - out.length;
      ranked = out.slice().sort((x, y) => sums[x] - sums[y]);
      ranked.forEach((id) => {
        // empatados na soma dividem a colocação
        const place = left + 1 + ranked.findIndex((o) => sums[o] === sums[id]);
        next = patchSeat(next, id, { alive: false, place });
        events.push({ type: 'eliminated', who: id, place });
      });
      const survivors = aliveSeats(next);
      over = survivors.length <= 1;
      if (over && survivors.length === 1) next = patchSeat(next, survivors[0].id, { place: 1 });
    }
  }

  const winnersOfMatch = over ? next.seats.filter((s) => s.place === 1).map((s) => s.id) : [];
  // compatível com a 2.4: `spared` são os que não levaram o golpe nesta rodada
  const spared = alive.map((s) => s.id).filter((id) => !losers.includes(id));
  const result = { ...outcome, sums, damage, tentos, spared, winners, eliminated: ranked, round: state.round, team: teams && winners.length ? seatOf(state, winners[0]).team : null };
  events.push({ type: 'roundOver', result });
  if (over) events.push({ type: 'matchOver', winner: winnersOfMatch[0] ?? null, winners: winnersOfMatch, team: champion });
  next = {
    ...next,
    phase: over ? 'matchOver' : 'roundOver',
    turn: null,
    result,
    nextStarter: nextStarter && seatOf(next, nextStarter)?.alive ? nextStarter : null,
    winner: over ? (winnersOfMatch[0] ?? null) : null,
    winners: winnersOfMatch,
  };
  return commit(next, events);
}

/**
 * W.O. ou saída de propósito: a cadeira zera e sai. Se era a vez dela, a vez segue; se só
 * sobrar um, a partida acaba. As pedras dela ficam fora da rodada (não contam na tranca).
 * Versão 2.7: nas duplas, o parceiro segue jogando sozinho pela dupla; a dupla só sai quando
 * os dois saem. Com tentos, quem sobrou sozinho na mesa vence.
 */
function forfeit(state, { seat }) {
  const me = seatOf(state, seat);
  if (!me?.alive || state.phase === 'matchOver' || state.phase === 'lobby') return state;
  const alive = aliveSeats(state).length;
  const teams = state.rules.teams;
  let next = patchSeat(state, seat, { hearts: 0, alive: false, place: teams ? 2 : alive });
  const events = [{ type: 'eliminated', who: seat, place: teams ? 2 : alive, reason: 'wo' }];
  const survivors = aliveSeats(next);
  const left = teams ? teamsAlive(next) : null;
  if (teams ? left.length <= 1 : survivors.length <= 1) {
    let winners;
    if (teams) {
      next = placeTeams(next, left[0] ?? null);
      winners = next.seats.filter((s) => s.place === 1).map((s) => s.id);
    } else {
      if (survivors.length === 1) next = patchSeat(next, survivors[0].id, { place: 1 });
      winners = survivors.map((s) => s.id);
    }
    events.push({ type: 'matchOver', winner: winners[0] ?? null, winners, team: teams ? (left[0] ?? null) : null });
    return commit({ ...next, phase: 'matchOver', turn: null, winner: winners[0] ?? null, winners }, events);
  }
  if (next.nextStarter === seat) next = { ...next, nextStarter: null };
  if (next.phase === 'playing') {
    const passStreak = Math.min(next.passStreak, survivors.length - 1);
    next = { ...next, passStreak };
    // versão 2.15: quem ia abrir saiu antes da 1ª pedra: a abertura passa para a maior pedra de
    // quem ficou (antes a mesa travava esperando uma pedra que ninguém tinha)
    const opener = !next.board.root && next.openingTileId && (state.hands[seat] ?? []).some((t) => t.id === next.openingTileId);
    if (opener) {
      const opening = findTableOpening(next.hands, survivors.map((s) => s.id));
      next = { ...next, openingTileId: opening?.tileId ?? null, turn: opening?.starter ?? next.turn };
    } else if (next.turn === seat) next = advance(next, seat);
    const lock = next.board.root ? blocked(next) : null;
    if (lock) return finishRound(next, { kind: 'tranca', reason: lock }, events);
  }
  return commit(next, events);
}

/**
 * Versão 2.19, o sinal da dupla: você marca uma pedra da mão do seu parceiro ("joga essa").
 * Marcar a mesma de novo (ou `tileId` nulo) tira o sinal. `signals[cadeira]` é a pedra marcada
 * NA MÃO daquela cadeira; só a dupla enxerga (viewFor). Não gasta a vez nem mexe no relógio.
 */
function signalTile(state, { seat, tileId = null }) {
  if (state.phase !== 'playing' || !state.rules?.teams) return state;
  const mate = partnerOf(state, seat);
  if (!mate || !seatOf(state, mate)?.alive) return state;
  const current = state.signals?.[mate] ?? null;
  const wanted = tileId && (state.hands[mate] ?? []).some((t) => t.id === tileId) ? tileId : null;
  const next = wanted === current ? null : wanted;
  if (next === current) return state;
  const signals = { ...(state.signals ?? {}) };
  if (next) signals[mate] = next;
  else delete signals[mate];
  return commit({ ...state, signals }, [{ type: 'signal', by: seat, to: mate, tileId: next }]);
}

/** Os sinais que ainda valem: a pedra continua na mão e a rodada está em jogo. */
function pruneSignals(state) {
  const signals = state.signals;
  if (!signals || !Object.keys(signals).length) return state;
  if (state.phase !== 'playing') return { ...state, signals: {} };
  const keep = Object.fromEntries(Object.entries(signals).filter(([id, tileId]) => (state.hands[id] ?? []).some((t) => t.id === tileId)));
  return Object.keys(keep).length === Object.keys(signals).length ? state : { ...state, signals: keep };
}

/** O reducer da mesa. Ações: START_ROUND · PLAY · DRAW · PASS · FORFEIT · SIGNAL. */
export function tableReducer(state, action) {
  const next = reduceTable(state, action);
  return next === state ? state : pruneSignals(next);
}

function reduceTable(state, action) {
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
    case 'SIGNAL':
      return signalTile(state, action);
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
  const watch = watchableFor(state, seat);
  const hands = reveal ? state.hands : { [seat]: state.hands[seat] ?? [] };
  if (!reveal) for (const id of watch) hands[id] = state.hands[id] ?? [];
  // versão 2.19: nas duplas você vê a mão do seu parceiro (e os sinais são só da dupla)
  const mate = state.rules?.teams ? partnerOf(state, seat) : null;
  if (!reveal && mate && state.phase === 'playing') hands[mate] = state.hands[mate] ?? [];
  const signals = Object.fromEntries(Object.entries(state.signals ?? {}).filter(([id]) => id === seat || id === mate));
  const { boneyard, seed, signals: allSignals, ...rest } = state;
  void allSignals;
  void boneyard;
  void seed;
  return { ...rest, me: seat, hands, handCounts, boneyardCount: state.boneyard.length, watch, signals };
}

/**
 * Versão 2.15: quem perdeu todas as vidas sai da roda e fica assistindo: vê a mão de quem
 * continua (e troca de cadeira para ver por outro ângulo). Nas duplas, enquanto o seu parceiro
 * ainda joga, você só assiste a ele (as pedras dos adversários não vazam pela dupla).
 */
export function watchableFor(state, seat) {
  const me = seatOf(state, seat);
  if (!me || me.alive || state.phase === 'lobby' || state.phase === 'matchOver') return [];
  // a rodada em que você caiu termina na sua cadeira (o X de giz é seu); a próxima já é assistida
  if (state.phase === 'roundOver' && (state.events ?? []).some((e) => e.type === 'eliminated' && e.who === seat)) return [];
  const alive = aliveSeats(state);
  const mates = state.rules?.teams && me.team ? alive.filter((s) => s.team === me.team) : [];
  return (mates.length ? mates : alive).map((s) => s.id);
}

/**
 * A jogada do bot (as cadeiras vazias da prévia e o relógio de quem caiu): joga a pedra
 * mais pesada, preferindo soltar bucha; sem jogada, compra; sem
 * compra, passa. Determinístico: a mesma mesa dá a mesma jogada.
 */
export function botAction(state, seat = state.turn) {
  if (state.phase !== 'playing' || state.turn !== seat) return null;
  const { moves, draw, pass } = turnOptions(state, seat);
  if (moves.length) {
    const score = ({ tile, side }) => {
      void side;
      return pipSum(tile) * 2 + (isDouble(tile) ? 6 : 0);
    };
    // o sinal do parceiro: se a pedra marcada encaixa, o bot joga ela
    const asked = state.signals?.[seat];
    const pool = asked && moves.some((m) => m.tile.id === asked) ? moves.filter((m) => m.tile.id === asked) : moves;
    const best = pool.reduce((top, m) => (score(m) > score(top) ? m : top), pool[0]);
    return { type: 'PLAY', seat, tileId: best.tile.id, side: best.side };
  }
  // o bot não paga com coração nem com tento enquanto puder passar
  if (draw.allowed && draw.cost?.type !== 'heart' && draw.cost?.type !== 'tento') return { type: 'DRAW', seat };
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
