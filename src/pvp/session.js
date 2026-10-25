/**
 * Patch PvP: a sessão da mesa online. Liga o canal P2P (um `transport`, ver transport.js) às
 * regras do jogo: apresentação dos dois, maletas, a semente da teia, onde cada um está, os
 * duelos (o anfitrião roda a mesa e manda o estado; o convidado manda as jogadas), o
 * cronômetro de 30 s, o indicador de ping, a queda de conexão com 60 s de tolerância antes
 * do W.O. e a volta de quem caiu (o anfitrião manda tudo de novo).
 *
 * Sem React aqui: a tela assina `subscribe()` e lê `getSnapshot()` (um objeto novo a cada
 * mudança). O relógio é injetável (`clock`) para os testes andarem o tempo na mão.
 *
 *   stage  'lobby' → 'maletas' → 'run' → 'over'
 *   link   'idle' | 'connecting' | 'waiting' (anfitrião sem ninguém) | 'open' | 'lost' | 'closed'
 */

import { proc } from '../engine/effects.js';
import { gameReducer } from '../engine/gameReducer.js';
import { generateRandomSeed, seedNumberOf } from '../engine/seedEngine.js';
import { DEFAULT_ROOM, isRoom, sanitizeRoom } from '../data/pvpRoom.js';
import { NO_MOVES_MS, REPLAY_MS, actorOf, applyIntent, autoIntent, buildDuel, duelDeck, roundOutcome } from './duelHost.js';
import { mirrorState, redactFor } from './mirror.js';
import { MSG, PROTOCOL_VERSION, makeMessage, validateMessage } from './protocol.js';

/** Tolerância de uma queda antes do W.O. */
export const GRACE_MS = 60000;
/** Intervalo do PING (o indicador de conexão). */
export const PING_MS = 2000;
/** Sem notícia do outro lado por este tempo: a conexão caiu. */
export const SILENCE_MS = 7000;
/** De quanto em quanto tempo quem entrou tenta reconectar. */
export const RETRY_MS = 3000;
/** Mesa final: a próxima rodada sai sozinha depois disto, se alguém não tocar. */
export const NEXT_ROUND_MS = 20000;

export const realClock = Object.freeze({
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id),
});

const seatOfIntent = {
  [MSG.PLAY_TILE]: (p) => ({ kind: 'play', tileId: p.tile.id, side: p.targetEnd }),
  [MSG.PASS_TURN]: () => ({ kind: 'pass' }),
  [MSG.BUY_TILE]: () => ({ kind: 'draw' }),
  [MSG.DUEL_PICK]: (p) => ({ kind: p.kind, tileId: p.tileId ?? undefined }),
};

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * `role` 'host' (criou a mesa) ou 'guest' (entrou). `me` = { id, name }. `transport` segue a
 * interface de transport.js. `restore`: um `snapshot()` antigo (a página recarregou).
 * `room`: a configuração da mesa (só quem cria escolhe; quem entra recebe no HELLO).
 */
export function createSession({ role, code, me, transport, clock = realClock, restore = null, online = () => true, room = null }) {
  const listeners = new Set();
  const noticeListeners = new Set();
  const timers = { ping: null, grace: null, retry: null, turn: null, next: null };

  let s = {
    role,
    code,
    me: { id: me.id, name: me.name },
    opp: null,
    stage: 'lobby',
    link: 'idle',
    ping: null,
    lostAt: null,
    graceEndsAt: null,
    myHandshake: null,
    oppHandshake: null,
    seed: null,
    seedCode: null,
    room: role === 'host' ? sanitizeRoom(room ?? DEFAULT_ROOM) : null,
    myStatus: null,
    oppStatus: null,
    oppShop: null,
    myReady: null,
    oppReady: null,
    duel: null, // { id, final, view, clock: { actor, deadline, totalMs }, result, awaiting, nextSent }
    over: null, // { winnerId, reason, self }
    error: null,
    duelCount: 0,
    closedDuelId: 0, // o último duelo cujo resultado já foi para a run (não volta de novo)
  };
  // só o anfitrião: o estado de verdade do duelo (o convidado recebe o espelho)
  let hostDuel = null; // { id, final, state, actor, deadline, done, nextReady: { me, opp } }
  let activeConn = null;
  let lastHeard = 0;
  let destroyed = false;
  /** O tempo de cada jogada (a mesa escolheu 15 a 60 s). */
  const turnMs = () => sanitizeRoom(s.room ?? DEFAULT_ROOM).turn * 1000;

  if (restore && restore.role === role && restore.code === code) {
    s = { ...s, ...restore.s, link: 'idle', ping: null, lostAt: null, graceEndsAt: null };
    hostDuel = restore.hostDuel ?? null;
  }

  // -------------------------------------------------------------------------
  // estado e avisos para a tela
  // -------------------------------------------------------------------------

  let snapshot = Object.freeze({ ...s });
  const set = (patch) => {
    s = { ...s, ...patch };
    snapshot = Object.freeze({ ...s });
    for (const fn of listeners) fn();
  };
  const notice = (n) => {
    for (const fn of noticeListeners) fn(n);
  };

  const send = (type, payload) => {
    if (activeConn == null || destroyed) return false;
    return transport.send(activeConn, makeMessage(type, payload));
  };

  // -------------------------------------------------------------------------
  // relógios
  // -------------------------------------------------------------------------

  const stop = (name) => {
    if (timers[name] == null) return;
    if (name === 'ping' || name === 'retry') clock.clearInterval(timers[name]);
    else clock.clearTimeout(timers[name]);
    timers[name] = null;
  };

  function startPing() {
    stop('ping');
    timers.ping = clock.setInterval(() => {
      if (s.link === 'open') {
        send(MSG.PING, { t: clock.now() });
        if (clock.now() - lastHeard > SILENCE_MS) linkLost();
      }
    }, PING_MS);
  }

  function linkUp(connId) {
    activeConn = connId;
    lastHeard = clock.now();
    stop('grace');
    stop('retry');
    set({ link: 'open', lostAt: null, graceEndsAt: null, error: null });
    startPing();
  }

  function linkLost() {
    if (s.link === 'lost' || s.stage === 'over' || destroyed) return;
    stop('ping');
    stop('turn');
    stop('next');
    const at = clock.now();
    set({ link: 'lost', lostAt: at, graceEndsAt: at + GRACE_MS, ping: null });
    timers.grace = clock.setTimeout(graceOver, GRACE_MS);
    if (role === 'guest') {
      stop('retry');
      timers.retry = clock.setInterval(() => {
        if (s.link === 'lost') transport.connect();
      }, RETRY_MS);
    }
  }

  /** 60 s sem volta: W.O. para quem ficou conectado (quem caiu perde). */
  function graceOver() {
    timers.grace = null;
    if (s.stage === 'over' || s.link !== 'lost') return;
    const selfDown = !transport.isSignalUp() || !online();
    finish({ winnerId: selfDown ? (s.opp?.id ?? null) : s.me.id, reason: 'wo', self: selfDown });
  }

  function finish(over) {
    stop('turn');
    stop('next');
    stop('retry');
    stop('grace');
    set({ stage: 'over', over });
  }

  // -------------------------------------------------------------------------
  // o duelo (anfitrião)
  // -------------------------------------------------------------------------

  const clockOf = () => {
    if (!hostDuel || !hostDuel.actor) return { actor: null, msLeft: null, totalMs: turnMs() };
    return { actor: hostDuel.actor, msLeft: Math.max(0, hostDuel.deadline - clock.now()), totalMs: turnMs() };
  };


  /** Atualiza a tela do anfitrião e manda o espelho escondido para o convidado. */
  function publishDuel(kind = MSG.DUEL_STATE) {
    const c = clockOf();
    const view = redactFor(hostDuel.state, 'player');
    set({
      duel: {
        id: hostDuel.id,
        final: hostDuel.final,
        view,
        clock: { actor: c.actor, deadline: c.actor ? clock.now() + c.msLeft : null, totalMs: c.totalMs },
        result: s.duel?.id === hostDuel.id ? s.duel.result : null,
        awaiting: false,
        nextSent: s.duel?.id === hostDuel.id ? s.duel.nextSent : false,
      },
    });
    send(kind, { duelId: hostDuel.id, final: hostDuel.final, state: redactFor(hostDuel.state, 'tioZe'), clock: c });
  }

  function scheduleTurn() {
    stop('turn');
    if (!hostDuel || s.link !== 'open') return;
    const actor = actorOf(hostDuel.state);
    if (!actor) return;
    const forced = hostDuel.state.pending?.type === 'forcedPass';
    const ms = forced ? NO_MOVES_MS : Math.max(0, hostDuel.deadline - clock.now());
    timers.turn = clock.setTimeout(() => timeUp(actor, forced), ms);
  }

  /** O estado do duelo mudou: o cronômetro reinicia para quem joga agora, e o fim da rodada é tratado. */
  function duelChanged() {
    const actor = actorOf(hostDuel.state);
    hostDuel.actor = actor;
    hostDuel.deadline = actor ? clock.now() + turnMs() : null;
    publishDuel();
    const outcome = roundOutcome(hostDuel.state);
    if (outcome) roundEnded(outcome);
    else scheduleTurn();
  }

  function timeUp(actor, forced) {
    timers.turn = null;
    if (!hostDuel || actorOf(hostDuel.state) !== actor) return;
    let state = hostDuel.state;
    if (!forced) state = proc(state, { source: 'clock', id: 'tempo', text: 'TEMPO ESGOTADO: JOGADA AUTOMÁTICA', tone: 'info', owner: actor });
    const { state: next, ok } = applyIntent(state, actor, autoIntent(state, actor));
    // nada aceito (não deveria acontecer): passa a vez para não travar a mesa
    hostDuel.state = ok ? next : gameReducer(state, { type: 'PASS', actor });
    duelChanged();
  }

  function roundEnded(outcome) {
    stop('turn');
    hostDuel.actor = null;
    const winnerId = outcome.winner === 'player' ? s.me.id : outcome.winner === 'tioZe' ? s.opp.id : null;
    if (outcome.replay) {
      // Testamento Rasgado: a rodada volta do zero (mesmas cadeiras, baralho novo)
      timers.next = clock.setTimeout(() => nextRound(), REPLAY_MS);
      return;
    }
    const heartsLeft = { [s.me.id]: outcome.hearts.player, [s.opp.id]: outcome.hearts.tioZe };
    const result = { duelId: hostDuel.id, winnerId, damage: outcome.damage, heartsLeft, kind: outcome.kind, final: hostDuel.final, matchOver: outcome.matchOver };
    hostDuel.done = !hostDuel.final || outcome.matchOver;
    hostDuel.nextReady = { me: false, opp: false };
    send(MSG.ROUND_RESULT, result);
    set({ duel: { ...s.duel, result } });
    if (outcome.matchOver) {
      send(MSG.GAME_OVER, { winnerId, reason: 'hearts' });
      finish({ winnerId, reason: 'hearts' });
      return;
    }
    if (hostDuel.final) timers.next = clock.setTimeout(() => nextRound(), NEXT_ROUND_MS);
  }

  function nextRound() {
    timers.next = null;
    if (!hostDuel || hostDuel.state.phase !== 'roundOver') return;
    const round = hostDuel.state.round + 1;
    hostDuel.state = gameReducer(hostDuel.state, { type: 'NEXT_ROUND', deck: duelDeck(s.seed, hostDuel.id, round) });
    hostDuel.done = false;
    set({ duel: { ...s.duel, result: null, nextSent: false } });
    duelChanged();
  }

  function maybeNextRound() {
    if (hostDuel?.final && hostDuel.nextReady.me && hostDuel.nextReady.opp) {
      stop('next');
      nextRound();
    }
  }

  function maybeStartDuel() {
    if (role !== 'host' || s.stage !== 'run' || !s.myReady || !s.oppReady) return;
    if (hostDuel && !hostDuel.done) return;
    const id = s.duelCount + 1;
    // a rota online tem um duelo só: vale até alguém zerar
    const final = true;
    const state = buildDuel({ host: s.myReady.profile, guest: s.oppReady.profile, seed: s.seed, duelId: id, final });
    hostDuel = { id, final, state, actor: null, deadline: null, done: false, nextReady: { me: false, opp: false }, nodes: { me: s.myReady, opp: s.oppReady } };
    set({ duelCount: id, myReady: null, oppReady: null, duel: null });
    const actor = actorOf(state);
    hostDuel.actor = actor;
    hostDuel.deadline = actor ? clock.now() + turnMs() : null;
    publishDuel(MSG.DUEL_START);
    scheduleTurn();
  }

  function hostIntent(seat, intent) {
    if (!hostDuel || hostDuel.done) return false;
    const { state, ok } = applyIntent(hostDuel.state, seat, intent);
    if (!ok) return false;
    hostDuel.state = state;
    duelChanged();
    return true;
  }

  /** A jogada também viaja como mensagem do protocolo (o outro lado vê o lance chegando). */
  function announce(seat, intent, before) {
    const duelId = hostDuel?.id ?? s.duel?.id ?? 0;
    if (intent.kind === 'play') {
      const tile = before.hands[seat].find((t) => t.id === intent.tileId);
      if (tile) send(MSG.PLAY_TILE, { duelId, tile: { id: tile.id, a: tile.a, b: tile.b }, targetEnd: intent.side, updatedDeck: { hand: before.hands[seat].length - 1 } });
    } else if (intent.kind === 'pass') {
      send(MSG.PASS_TURN, { duelId, paid: before.pending?.type !== 'forcedPass' && before.drawsThisTurn === 0 });
    } else if (intent.kind === 'draw') {
      send(MSG.BUY_TILE, { duelId, count: before.drawsThisTurn + 1 });
    } else {
      send(MSG.DUEL_PICK, { duelId, kind: intent.kind, tileId: intent.tileId ?? null });
    }
  }

  // -------------------------------------------------------------------------
  // mensagens
  // -------------------------------------------------------------------------

  function sendHello() {
    // quem criou a mesa já manda a configuração dela (o outro vê antes de escolher a maleta)
    const hello = { id: s.me.id, name: s.me.name, version: PROTOCOL_VERSION, rejoin: s.stage !== 'lobby', code };
    send(MSG.HELLO, role === 'host' ? { ...hello, room: s.room } : hello);
  }

  function syncPayload() {
    return {
      stage: s.stage,
      seed: s.seed,
      seedCode: s.seedCode,
      room: s.room,
      handshake: s.myHandshake,
      status: s.myStatus,
      haveReady: Boolean(s.oppReady),
      haveHandshake: Boolean(s.oppHandshake),
      duel: hostDuel
        ? { duelId: hostDuel.id, final: hostDuel.final, state: redactFor(hostDuel.state, 'tioZe'), clock: clockOf(), result: s.duel?.result ?? null, done: hostDuel.done }
        : null,
      over: s.over,
    };
  }

  function guestDuel(p, keepResult = false) {
    if (p.duelId <= s.closedDuelId) return; // esse resultado já entrou na run
    const view = mirrorState(p.state);
    const actor = p.clock?.actor ? (p.clock.actor === 'player' ? 'tioZe' : 'player') : null;
    const same = s.duel?.id === p.duelId;
    // rodada nova (mesa final, Testamento): o resultado da anterior sai da tela
    const playing = view.phase === 'playing';
    set({
      // o convidado também conta as mesas (o fim da noite mostra quantas foram)
      duelCount: Math.max(s.duelCount, p.duelId),
      duel: {
        id: p.duelId,
        final: Boolean(p.final),
        view,
        clock: { actor, deadline: actor && p.clock.msLeft != null ? clock.now() + p.clock.msLeft : null, totalMs: p.clock?.totalMs ?? turnMs() },
        result: playing ? null : keepResult && same ? s.duel.result : (p.result ?? (same ? s.duel.result : null)),
        awaiting: false,
        nextSent: playing ? false : same ? s.duel.nextSent : false,
      },
    });
  }

  function onHello(connId, p) {
    if (p.version !== PROTOCOL_VERSION) {
      transport.send(connId, makeMessage(MSG.ROOM_FULL, { reason: 'version' }));
      set({ error: 'version' });
      return;
    }
    if (role === 'host') {
      if (s.opp && p.id !== s.opp.id) {
        transport.send(connId, makeMessage(MSG.ROOM_FULL, {}));
        transport.drop(connId);
        return;
      }
      if (activeConn != null && activeConn !== connId) transport.drop(activeConn);
      const rejoin = Boolean(s.opp);
      set({ opp: { id: p.id, name: p.name } });
      linkUp(connId);
      sendHello();
      if (s.stage === 'lobby') set({ stage: 'maletas' });
      if (rejoin) send(MSG.SYNC, syncPayload());
      if (s.over) send(MSG.GAME_OVER, s.over);
      else if (hostDuel && !hostDuel.done && hostDuel.actor) {
        // quem volta ganha os 30 s da jogada de novo
        hostDuel.deadline = clock.now() + turnMs();
        publishDuel();
        scheduleTurn();
      }
      return;
    }
    // convidado: o anfitrião respondeu (com a configuração da mesa)
    set({ opp: { id: p.id, name: p.name }, ...(isRoom(p.room) ? { room: p.room } : {}) });
    if (s.stage === 'lobby') set({ stage: 'maletas' });
    if (s.myHandshake) send(MSG.HANDSHAKE, s.myHandshake);
    if (s.myStatus) send(MSG.STATUS, s.myStatus);
  }

  function onMessage(connId, msg) {
    if (destroyed || !validateMessage(msg)) return;
    const p = msg.payload;
    if (msg.type === MSG.HELLO) {
      if (role === 'guest') linkUp(connId);
      onHello(connId, p);
      return;
    }
    if (connId !== activeConn) return;
    lastHeard = clock.now();
    switch (msg.type) {
      case MSG.PING:
        send(MSG.PONG, { t: p.t });
        break;
      case MSG.PONG: {
        const rtt = Math.max(0, clock.now() - p.t);
        set({ ping: s.ping == null ? rtt : Math.round(s.ping * 0.6 + rtt * 0.4) });
        break;
      }
      case MSG.ROOM_FULL:
        set({ error: p.reason === 'version' ? 'version' : 'full', link: 'closed' });
        break;
      case MSG.HANDSHAKE:
        set({ oppHandshake: { name: p.name, suitcase: p.suitcase, initialDeck: p.initialDeck ?? {} } });
        if (role === 'host') maybeStartRun();
        break;
      case MSG.RUN_START:
        if (role === 'guest' && s.stage !== 'over') set({ stage: 'run', seed: p.seed, seedCode: p.seedCode ?? null, room: isRoom(p.room) ? p.room : s.room });
        break;
      case MSG.STATUS:
        set({ oppStatus: p });
        break;
      case MSG.SHOP_FINISH:
        set({ oppShop: p });
        notice({ type: 'shopFinish', ...p });
        break;
      case MSG.DUEL_READY:
        if (role === 'host') {
          set({ oppReady: p });
          maybeStartDuel();
        }
        break;
      case MSG.PLAY_TILE:
      case MSG.PASS_TURN:
      case MSG.BUY_TILE:
      case MSG.DUEL_PICK:
        if (role === 'host') {
          if (!hostDuel || p.duelId !== hostDuel.id) return;
          const ok = hostIntent('tioZe', seatOfIntent[msg.type](p));
          if (!ok) {
            send(MSG.DUEL_REJECT, { duelId: hostDuel.id, reason: 'jogada recusada' });
            publishDuel();
          }
        }
        // no convidado, a jogada do anfitrião só anuncia: o estado vem logo atrás (DUEL_STATE)
        break;
      case MSG.DUEL_START:
      case MSG.DUEL_STATE:
        if (role === 'guest') guestDuel(p, msg.type === MSG.DUEL_STATE);
        break;
      case MSG.DUEL_REJECT:
        if (role === 'guest' && s.duel) {
          set({ duel: { ...s.duel, awaiting: false } });
          notice({ type: 'reject', reason: p.reason });
        }
        break;
      case MSG.ROUND_RESULT:
        if (role === 'guest' && s.duel && s.duel.id === p.duelId) set({ duel: { ...s.duel, result: p, clock: { actor: null, deadline: null } } });
        break;
      case MSG.NEXT_READY:
        if (role === 'host' && hostDuel && p.duelId === hostDuel.id) {
          hostDuel.nextReady.opp = true;
          maybeNextRound();
        }
        break;
      case MSG.SYNC:
        if (role === 'guest') onSync(p);
        break;
      case MSG.GAME_OVER:
        if (s.stage !== 'over') finish({ winnerId: p.winnerId ?? null, reason: p.reason });
        break;
      case MSG.BYE:
        if (s.stage !== 'over') finish({ winnerId: s.me.id, reason: 'quit' });
        break;
      default:
        break;
    }
  }

  function onSync(p) {
    const patch = {};
    if (p.stage && s.stage !== 'over') patch.stage = p.stage === 'run' || p.stage === 'over' ? p.stage : s.stage === 'lobby' ? 'maletas' : s.stage;
    if (p.seed != null) {
      patch.seed = p.seed;
      patch.seedCode = p.seedCode ?? null;
    }
    if (isRoom(p.room)) patch.room = p.room;
    if (p.handshake) patch.oppHandshake = p.handshake;
    if (p.status) patch.oppStatus = p.status;
    set(patch);
    if (p.duel) guestDuel({ ...p.duel, result: p.duel.result }, false);
    else if (s.duel && !s.duel.result) set({ duel: null }); // a mesa que você via não existe mais
    if (!p.haveHandshake && s.myHandshake) send(MSG.HANDSHAKE, s.myHandshake);
    if (!p.haveReady && s.myReady && !p.duel) send(MSG.DUEL_READY, s.myReady);
    if (s.myStatus) send(MSG.STATUS, s.myStatus);
    if (p.over && s.stage !== 'over') finish(p.over);
  }

  function maybeStartRun() {
    if (role !== 'host' || s.stage !== 'maletas' || !s.myHandshake || !s.oppHandshake) return;
    const seedCode = generateRandomSeed();
    const seed = seedNumberOf(seedCode);
    set({ stage: 'run', seed, seedCode });
    send(MSG.RUN_START, { seed, seedCode, room: s.room });
  }

  // -------------------------------------------------------------------------
  // transporte
  // -------------------------------------------------------------------------

  transport.on('connection', (connId) => {
    if (destroyed) return;
    if (role === 'guest') {
      activeConn = connId;
      sendHello();
    }
    // anfitrião: espera o HELLO para saber quem é
  });
  transport.on('message', (connId, msg) => onMessage(connId, msg));
  transport.on('disconnect', (connId) => {
    if (connId === activeConn) linkLost();
  });
  transport.on('error', (err) => {
    if (destroyed) return;
    if (err?.type === 'peer-unavailable' && role === 'guest' && s.stage === 'lobby') set({ error: 'notFound', link: 'closed' });
    else if (err?.type === 'unavailable-id' && role === 'host' && s.stage === 'lobby' && !restore) set({ error: 'taken', link: 'closed' });
    else if (s.link === 'connecting' && s.stage === 'lobby') set({ error: err?.type ?? 'network' });
  });
  transport.on('ready', () => {
    if (destroyed) return;
    if (role === 'host' && s.link !== 'open') set({ link: s.opp ? 'lost' : 'waiting' });
  });

  // -------------------------------------------------------------------------
  // API da tela
  // -------------------------------------------------------------------------

  const api = {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    onNotice(fn) {
      noticeListeners.add(fn);
      return () => noticeListeners.delete(fn);
    },
    getSnapshot: () => snapshot,

    /** Liga o canal (anfitrião: registra o ID da sala; convidado: puxa a cadeira). */
    start() {
      set({ link: 'connecting', error: null });
      transport.start();
      // voltou de uma página recarregada: conta a tolerância desde já (o convidado tenta de novo sozinho)
      if (restore && s.stage !== 'lobby' && s.stage !== 'over') linkLost();
    },

    /** Maleta escolhida: vai junto o baralho inicial dela. */
    chooseMaleta(suitcase, initialDeck = {}) {
      const hs = { name: s.me.name, suitcase, initialDeck };
      set({ myHandshake: hs });
      send(MSG.HANDSHAKE, hs);
      maybeStartRun();
    },

    /** Onde eu estou (vai para o outro só quando muda). */
    reportStatus(status) {
      if (sameJson(status, s.myStatus)) return;
      set({ myStatus: status });
      send(MSG.STATUS, status);
    },

    /** PRONTO PARA O DUELO: saí da loja/beco com o baralho fechado. */
    shopFinished(newTalismans, newCoins) {
      send(MSG.SHOP_FINISH, { newTalismans, newCoins });
    },

    /** Cheguei numa mesa (ou no fim da teia): `kind` 'combat' · 'boss' · 'done'. */
    readyForDuel({ node, kind, profile }) {
      const ready = { node: node ?? null, kind, profile };
      set({ myReady: ready });
      if (role === 'host') maybeStartDuel();
      else send(MSG.DUEL_READY, ready);
    },

    /** Uma jogada minha na mesa (`intent` de duelHost.js). */
    duelIntent(intent) {
      const duel = s.duel;
      if (!duel || duel.result || s.stage !== 'run') return false;
      if (role === 'host') {
        const before = hostDuel?.state;
        const ok = hostIntent('player', intent);
        if (ok && before) announce('player', intent, before);
        return ok;
      }
      if (duel.awaiting || s.link !== 'open') return false;
      const before = duel.view;
      set({ duel: { ...duel, awaiting: true } });
      announce('player', intent, before);
      return true;
    },

    /** Mesa final: pronto para a próxima rodada. */
    nextRound() {
      if (!s.duel?.result || !s.duel.final || s.duel.nextSent) return;
      set({ duel: { ...s.duel, nextSent: true } });
      if (role === 'host') {
        if (hostDuel) hostDuel.nextReady.me = true;
        maybeNextRound();
      } else send(MSG.NEXT_READY, { duelId: s.duel.id });
    },

    /** Saí da mesa (o resultado já foi para a minha run). */
    closeDuel() {
      if (!s.duel?.result) return;
      set({ duel: null, closedDuelId: Math.max(s.closedDuelId, s.duel.id) });
    },

    /** A minha run zerou fora da mesa (um imprevisto): o outro vence. */
    defeat(reason = 'hearts') {
      if (s.stage === 'over') return;
      const winnerId = s.opp?.id ?? null;
      send(MSG.GAME_OVER, { winnerId, reason });
      finish({ winnerId, reason });
    },

    /** SAIR DA MESA: entrega a vitória por W.O. */
    quit() {
      if (s.stage !== 'over' && s.opp) {
        send(MSG.BYE, { reason: 'quit' });
        send(MSG.GAME_OVER, { winnerId: s.opp.id, reason: 'quit' });
      }
      if (s.stage !== 'over') finish({ winnerId: s.opp?.id ?? null, reason: 'quit', self: true });
    },

    /** O que a página guarda para voltar à mesa depois de recarregar. */
    snapshot() {
      const keep = { ...s };
      delete keep.link;
      delete keep.ping;
      return { v: 1, role, code, s: keep, hostDuel };
    },

    destroy() {
      destroyed = true;
      for (const name of Object.keys(timers)) stop(name);
      transport.destroy();
      listeners.clear();
      noticeListeners.clear();
    },

    // testes: o estado de verdade do duelo (só o anfitrião tem)
    _hostDuel: () => hostDuel,
  };
  return api;
}
