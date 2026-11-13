/**
 * Versão 2.4: a mesa online de 2 a 4, em estrela. O anfitrião roda o motor (tableEngine.js),
 * confere cada jogada que chega, joga pelos bots, cuida do cronômetro e das quedas, e manda a
 * cada convidado só o espelho da cadeira dele. O convidado manda intenções e desenha o que vem.
 *
 * A tela só conhece `getSnapshot()` / `subscribe()` e os métodos de ação. O transporte é o
 * mesmo do duelo (PeerJS, ou a rede de mentira dos testes) e o relógio pode ser injetado.
 *
 * Snapshot:
 *   { role, code, link: 'connecting'|'ok'|'lost', stage: 'connecting'|'lobby'|'table'|'error'|'ended',
 *     error, ended, you, lobby: { config, seats, started }, view, clock: { deadline, totalMs },
 *     ready: [seatId], links: { [seatId]: { lost, graceEndsAt, ping } }, notice, lostAt, graceEndsAt }
 */
import { MAX_SEATS, botAction, createTable, tableReducer, viewFor } from './tableEngine.js';
import { TABLE_PROTOCOL, TMSG, makeTableMessage, sanitizeTableConfig, validateTableMessage } from './tableProtocol.js';
import { TABLE_FACES } from './seats.js';
import { EMOTE_MS, botReactions, emoteReady, pushEmote } from './emotes.js';

/** Quanto uma cadeira caída tem para voltar antes do W.O. (o mesmo do duelo). */
export const TABLE_GRACE_MS = 60000;
const PING_MS = 3000;
/** Fim da rodada: se alguém demora a tocar em PRÓXIMA RODADA, ela começa sozinha. */
export const NEXT_AUTO_MS = 25000;
const BOT_THINK_MS = 1150;
const BOT_DRAW_MS = 650;
/** Quem caiu e está na vez: o relógio joga por ele mais cedo (não segura a mesa inteira). */
const LOST_TURN_MS = 4000;
const RETRY_MS = 3000;

/** Quem senta nas cadeiras de bot (o anfitrião põe com + BOT). */
export const TABLE_BOTS = Object.freeze([
  { name: 'Neide', face: 'neide' },
  { name: 'Baiano', face: 'baiano' },
  { name: 'Sofia', face: 'sofia' },
  { name: 'Zeca', face: 'zeca' },
]);

const realClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id),
};

const cleanName = (name) =>
  String(name ?? '')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, 14) || 'Jogador';

export function createTableSession({ role, code, me, transport, clock = realClock, config = null, random = Math.random }) {
  const listeners = new Set();
  const timers = {};
  let destroyed = false;
  let snap = {
    role,
    code,
    link: 'connecting',
    stage: 'connecting',
    error: null,
    ended: null,
    you: role === 'host' ? 's0' : null,
    lobby: null,
    view: null,
    clock: null,
    ready: [],
    links: {},
    notice: null,
    lostAt: null,
    graceEndsAt: null,
    // versão 2.33: o emote de cada cadeira ({ [cadeira]: { id, key } })
    emotes: {},
  };
  let noticeN = 0;
  let emoteN = 0;
  const showEmote = (seat, id) => {
    emoteN += 1;
    set({ emotes: pushEmote(snap.emotes, seat, id, emoteN) });
  };

  const emit = () => listeners.forEach((fn) => fn());
  const set = (patch) => {
    snap = { ...snap, ...patch };
    emit();
  };
  const later = (key, fn, ms) => {
    if (timers[key] != null) clock.clearTimeout(timers[key]);
    timers[key] = clock.setTimeout(() => {
      timers[key] = null;
      if (!destroyed) fn();
    }, ms);
  };
  const cancel = (key) => {
    if (timers[key] != null) clock.clearTimeout(timers[key]);
    timers[key] = null;
  };
  const send = (connId, type, payload) => connId != null && transport.send(connId, makeTableMessage(type, payload));
  const notice = (text) => {
    noticeN += 1;
    set({ notice: { key: noticeN, text } });
  };

  const api = {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snap,
  };

  // =======================================================================================
  // anfitrião
  // =======================================================================================
  if (role === 'host') {
    const cfg = sanitizeTableConfig(config);
    const seats = Array.from({ length: cfg.seats }, () => null);
    seats[0] = { id: 's0', playerId: me.id, name: cleanName(me.name), face: me.face ?? TABLE_FACES[0], bot: false, ready: true, host: true, connId: null, lost: false, lostAt: null, ping: null };
    const connSeat = new Map();
    let engine = null;
    let lastTurnKey = null;
    let turnDeadline = null;
    const nextReady = new Set();

    const seatById = (id) => seats.find((s) => s?.id === id) ?? null;
    /**
     * Versão 2.13: a cadeira é de quem senta (o id não muda quando a pessoa troca de lugar); a
     * posição na mesa (o índice em `seats`) é que decide a vez e as duplas. Quem chega pega o
     * primeiro número livre.
     */
    const freeId = () => {
      const used = new Set(seats.filter(Boolean).map((s) => s.id));
      for (let n = 0; n < MAX_SEATS; n += 1) if (!used.has(`s${n}`)) return `s${n}`;
      return `s${seats.length}`;
    };
    /** Os pedidos de troca de lugar entre duas pessoas (quem pediu → com quem). */
    let swaps = [];
    const dropSwaps = (id) => {
      swaps = swaps.filter((r) => r.from !== id && r.to !== id);
    };
    /** Troca duas posições da mesa (uma pode estar vazia). */
    const swapPlaces = (a, b) => {
      [seats[a], seats[b]] = [seats[b], seats[a]];
    };
    /**
     * Mudar de lugar: cadeira vazia ou de bot, na hora; cadeira de outra pessoa, vira um pedido
     * que ela aceita ou recusa (tocar de novo cancela).
     */
    function moveSeat(seat, place) {
      if (engine || !seat || !Number.isInteger(place) || place < 0 || place >= seats.length) return;
      const from = seats.indexOf(seat);
      if (from < 0 || from === place) return;
      const other = seats[place];
      if (!other || other.bot) {
        dropSwaps(seat.id);
        swapPlaces(from, place);
        publishLobby();
        return;
      }
      const pending = swaps.some((r) => r.from === seat.id && r.to === other.id);
      swaps = swaps.filter((r) => r.from !== seat.id);
      if (!pending) swaps.push({ from: seat.id, to: other.id });
      publishLobby();
    }
    function answerSwap(seat, fromId, yes) {
      if (engine || !seat) return;
      const asked = swaps.some((r) => r.from === fromId && r.to === seat.id);
      if (!asked) return;
      swaps = swaps.filter((r) => !(r.from === fromId && r.to === seat.id));
      const other = seatById(fromId);
      if (yes && other) {
        dropSwaps(seat.id);
        dropSwaps(other.id);
        swapPlaces(seats.indexOf(seat), seats.indexOf(other));
      }
      publishLobby();
    }
    const usedFaces = () => new Set(seats.filter(Boolean).map((s) => s.face));
    const freeFace = (wanted) => (wanted && !usedFaces().has(wanted) ? wanted : (TABLE_FACES.find((f) => !usedFaces().has(f)) ?? TABLE_FACES[0]));
    const publicSeat = (s) => s && { id: s.id, name: s.name, face: s.face, bot: s.bot, ready: s.ready, host: Boolean(s.host), lost: s.lost };
    const humans = () => seats.filter((s) => s && !s.bot && !s.host);

    const linksNow = () => {
      const out = {};
      for (const s of seats) {
        if (!s || s.bot) continue;
        out[s.id] = { lost: s.lost, graceMs: s.lost ? Math.max(0, s.lostAt + TABLE_GRACE_MS - clock.now()) : null, ping: s.ping };
      }
      return out;
    };
    const localLinks = (links) =>
      Object.fromEntries(Object.entries(links).map(([id, l]) => [id, { lost: l.lost, graceEndsAt: l.lost ? clock.now() + l.graceMs : null, ping: l.ping }]));

    function publishLobby() {
      swaps = swaps.filter((r) => seatById(r.from) && seatById(r.to));
      const lobby = { config: cfg, seats: seats.map(publicSeat), started: Boolean(engine), swaps: engine ? [] : swaps.map((r) => ({ ...r })) };
      for (const s of humans()) if (!s.lost) send(s.connId, TMSG.LOBBY, { ...lobby, you: s.id });
      set({ lobby, stage: engine ? 'table' : 'lobby' });
    }

    function broadcast() {
      if (!engine) return;
      const totalMs = cfg.turn * 1000;
      const msLeft = turnDeadline != null ? Math.max(0, turnDeadline - clock.now()) : null;
      const links = linksNow();
      const ready = [...nextReady];
      for (const s of humans()) {
        if (s.lost || s.connId == null) continue;
        send(s.connId, TMSG.STATE, { view: viewFor(engine, s.id), clock: msLeft != null ? { msLeft, totalMs } : null, ready, links });
      }
      set({ stage: 'table', view: viewFor(engine, 's0'), clock: turnDeadline != null ? { deadline: turnDeadline, totalMs } : null, ready, links: localLinks(links) });
    }

    /** Cronômetro da vez, bots e quem caiu; e a próxima rodada que começa sozinha. */
    function schedule() {
      cancel('bot');
      if (!engine) return;
      const turnKey = engine.phase === 'playing' ? `${engine.round}:${engine.turn}` : null;
      if (turnKey !== lastTurnKey) {
        lastTurnKey = turnKey;
        cancel('turn');
        turnDeadline = turnKey ? clock.now() + cfg.turn * 1000 : null;
        if (turnKey) later('turn', () => autoPlay(engine.turn), cfg.turn * 1000);
      }
      if (engine.phase !== 'playing') return;
      const seat = seatById(engine.turn);
      if (seat?.bot) {
        const action = botAction(engine);
        if (!action) return;
        const wait = action.type === 'DRAW' ? BOT_DRAW_MS : BOT_THINK_MS + ((engine.seq * 137) % 450);
        later('bot', () => apply(tableReducer(engine, action)), wait);
      } else if (seat?.lost) {
        later('bot', () => autoPlay(seat.id), LOST_TURN_MS);
      }
    }

    /** O relógio zerou (ou a cadeira caiu): a jogada automática termina a vez daquela cadeira. */
    function autoPlay(seatId) {
      if (!engine || engine.phase !== 'playing' || engine.turn !== seatId) return;
      let s = engine;
      for (let i = 0; i < 6 && s.phase === 'playing' && s.turn === seatId; i += 1) {
        const action = botAction(s, seatId);
        if (!action) break;
        const next = tableReducer(s, action);
        if (next === s) break;
        s = next;
      }
      apply(s);
    }

    /** Versão 2.33: o emote de `seatId` (com o intervalo mínimo) vai para todo mundo menos quem mandou. */
    const lastEmote = {};
    function emoteFrom(seatId, emote, skipConn = null) {
      const now = clock.now();
      if (!emoteReady(lastEmote[seatId], now)) return;
      lastEmote[seatId] = now;
      showEmote(seatId, emote);
      for (const s of humans()) if (!s.lost && s.connId !== skipConn) send(s.connId, TMSG.EMOTE, { emote, seat: seatId });
    }

    function apply(next) {
      if (!next || next === engine) return;
      const was = engine?.phase;
      engine = next;
      if (engine.phase === 'roundOver' && was !== 'roundOver') {
        nextReady.clear();
        later('next', startNextRound, NEXT_AUTO_MS);
        // os bots reagem ao fim da rodada (de vez em quando)
        botReactions(engine.result, seats.filter(Boolean), random).forEach((r, i) => later(`emote-${i}`, () => emoteFrom(r.seat, r.emote), 900 + i * (EMOTE_MS * 0.6)));
      }
      if (engine.phase !== 'roundOver') cancel('next');
      schedule();
      broadcast();
    }

    function startNextRound() {
      if (engine?.phase !== 'roundOver') return;
      apply(tableReducer(engine, { type: 'START_ROUND' }));
    }

    function maybeNextRound() {
      if (engine?.phase !== 'roundOver') return;
      const alive = new Set(engine.seats.filter((s) => s.alive).map((s) => s.id));
      // quem decide: as pessoas vivas e ligadas (o anfitrião também); os bots estão sempre prontos
      const waiting = seats.filter((s) => s && !s.bot && !s.lost && alive.has(s.id) && !nextReady.has(s.id));
      if (!waiting.length) startNextRound();
      else broadcast();
    }

    function freeSeat(seat) {
      const i = seats.indexOf(seat);
      if (i >= 0 && !seat.host) seats[i] = null;
      dropSwaps(seat.id);
      if (seat.connId != null) connSeat.delete(seat.connId);
      cancel(`grace:${seat.id}`);
    }

    function seatLost(seat) {
      if (!engine) {
        freeSeat(seat);
        publishLobby();
        return;
      }
      seat.lost = true;
      seat.lostAt = clock.now();
      seat.connId = null;
      later(
        `grace:${seat.id}`,
        () => {
          seat.lost = false;
          seat.lostAt = null;
          if (engine && engine.phase !== 'matchOver') apply(tableReducer(engine, { type: 'FORFEIT', seat: seat.id }));
          freeSeat(seat);
          publishLobby();
          broadcast();
        },
        TABLE_GRACE_MS,
      );
      schedule();
      broadcast();
      maybeNextRound();
    }

    function onHello(connId, p) {
      const back = seats.find((s) => s && !s.bot && !s.host && s.playerId === p.id);
      if (back) {
        if (back.connId != null && back.connId !== connId) connSeat.delete(back.connId);
        back.connId = connId;
        back.lost = false;
        back.lostAt = null;
        back.name = cleanName(p.name);
        connSeat.set(connId, back.id);
        cancel(`grace:${back.id}`);
        publishLobby();
        schedule();
        broadcast();
        return;
      }
      if (engine) {
        send(connId, TMSG.FULL, { reason: 'started' });
        return;
      }
      const at = seats.findIndex((s) => !s);
      if (at < 0) {
        send(connId, TMSG.FULL, { reason: 'full' });
        return;
      }
      const id = freeId();
      seats[at] = { id, playerId: p.id, name: cleanName(p.name), face: freeFace(p.face), bot: false, ready: false, host: false, connId, lost: false, lostAt: null, ping: null };
      connSeat.set(connId, id);
      publishLobby();
    }

    transport.on('ready', () => {
      set({ link: 'ok' });
      publishLobby();
    });
    transport.on('message', (connId, msg) => {
      if (destroyed) return;
      if (msg?.type === TMSG.HELLO && msg.v !== TABLE_PROTOCOL) {
        send(connId, TMSG.FULL, { reason: 'version' });
        return;
      }
      if (!validateTableMessage(msg)) return;
      const p = msg.payload;
      if (msg.type === TMSG.HELLO) {
        onHello(connId, p);
        return;
      }
      const seat = seatById(connSeat.get(connId));
      if (!seat) return;
      switch (msg.type) {
        case TMSG.SEAT:
          if (engine) return;
          if (p.face) seat.face = freeFace(p.face) === p.face ? p.face : seat.face;
          if (typeof p.ready === 'boolean') seat.ready = p.ready;
          if (p.place != null) moveSeat(seat, p.place);
          else if (p.answer) answerSwap(seat, p.answer.from, p.answer.yes);
          else publishLobby();
          break;
        case TMSG.INTENT: {
          if (!engine) return;
          const next = tableReducer(engine, { ...p.action, seat: seat.id });
          if (next === engine) send(connId, TMSG.REJECT, { reason: 'stale' });
          else apply(next);
          break;
        }
        case TMSG.NEXT:
          nextReady.add(seat.id);
          maybeNextRound();
          break;
        case TMSG.PING:
          send(connId, TMSG.PONG, { t: p.t });
          break;
        case TMSG.EMOTE:
          if (engine) emoteFrom(seat.id, p.emote, connId);
          break;
        case TMSG.PONG:
          seat.ping = Math.max(0, Math.round(clock.now() - p.t));
          break;
        case TMSG.BYE:
          connSeat.delete(connId);
          if (engine && engine.phase !== 'matchOver') apply(tableReducer(engine, { type: 'FORFEIT', seat: seat.id }));
          freeSeat(seat);
          publishLobby();
          broadcast();
          break;
        default:
          break;
      }
    });
    transport.on('disconnect', (connId) => {
      const seat = seatById(connSeat.get(connId));
      connSeat.delete(connId);
      if (seat && !destroyed) seatLost(seat);
    });
    transport.on('error', (err) => {
      if (destroyed) return;
      set({ error: err?.type === 'unavailable-id' ? 'taken' : (err?.type ?? 'network'), link: 'lost', stage: snap.stage === 'connecting' ? 'error' : snap.stage });
    });

    const pinger = () => {
      for (const s of humans()) if (!s.lost) send(s.connId, TMSG.PING, { t: clock.now() });
    };

    Object.assign(api, {
      start() {
        transport.start();
        timers.ping = clock.setInterval(pinger, PING_MS);
      },
      setFace(face) {
        const me0 = seatById('s0');
        if (engine || !me0) return;
        me0.face = freeFace(face) === face ? face : me0.face;
        publishLobby();
      },
      setReady() {},
      /** Versão 2.13: mudar de cadeira (ou pedir a troca a quem está nela). */
      moveTo(place) {
        moveSeat(seatById('s0'), place);
      },
      answerSwap(fromId, yes) {
        answerSwap(seatById('s0'), fromId, yes);
      },
      /** As regras, ainda no saguão: a mesa não encolhe para menos cadeiras do que as ocupadas. */
      setConfig(patch) {
        if (engine) return;
        const next = sanitizeTableConfig({ ...cfg, ...patch });
        if (seats.slice(next.seats).some(Boolean)) next.seats = cfg.seats;
        Object.assign(cfg, next);
        while (seats.length < cfg.seats) seats.push(null);
        seats.length = cfg.seats;
        publishLobby();
      },
      addBot(place = null) {
        if (engine) return;
        const at = Number.isInteger(place) && place >= 0 && place < seats.length && !seats[place] ? place : seats.findIndex((s) => !s);
        if (at < 0) return;
        const names = new Set(seats.filter(Boolean).map((s) => s.name));
        const bot = TABLE_BOTS.find((b) => !names.has(b.name)) ?? TABLE_BOTS[0];
        seats[at] = { id: freeId(), playerId: null, name: bot.name, face: freeFace(bot.face), bot: true, ready: true, host: false, connId: null, lost: false, lostAt: null, ping: null };
        publishLobby();
      },
      removeBot(id) {
        const seat = seatById(id);
        if (engine || !seat?.bot) return;
        freeSeat(seat);
        publishLobby();
      },
      canStart() {
        const seated = seats.filter(Boolean);
        // duplas precisam das 4 cadeiras ocupadas (gente ou bot)
        if (cfg.teams && seated.length < 4) return false;
        return !engine && seated.length >= 2 && seated.every((s) => s.ready && !s.lost);
      },
      startMatch() {
        if (!api.canStart()) return;
        const seated = seats.filter(Boolean);
        const seed = Math.floor(random() * 2 ** 31) >>> 0;
        const table = createTable({
          seed,
          seats: seated.map((s) => ({ id: s.id, name: s.name, face: s.face, bot: s.bot })),
          hearts: cfg.hearts,
          coins: 100,
          rules: { batida: cfg.batida, teams: cfg.teams, scoring: cfg.scoring },
        });
        engine = null;
        lastTurnKey = null;
        swaps = [];
        apply(tableReducer(table, { type: 'START_ROUND' }));
        publishLobby();
      },
      intent(action) {
        if (!engine) return;
        apply(tableReducer(engine, { ...action, seat: 's0' }));
      },
      emote(id) {
        if (engine) emoteFrom('s0', id);
      },
      nextRound() {
        nextReady.add('s0');
        maybeNextRound();
      },
      /** Revanche: todo mundo volta ao saguão (as pessoas marcam PRONTO de novo). */
      rematch() {
        if (engine?.phase !== 'matchOver') return;
        engine = null;
        lastTurnKey = null;
        turnDeadline = null;
        cancel('turn');
        cancel('bot');
        cancel('next');
        for (const s of humans()) s.ready = false;
        set({ view: null, clock: null, ready: [] });
        publishLobby();
      },
      leave() {
        for (const s of humans()) if (!s.lost) send(s.connId, TMSG.END, { reason: 'host-left' });
        closeSoon();
      },
    });
  }

  // =======================================================================================
  // convidado
  // =======================================================================================
  else {
    let lastSent = null;
    let hostConn = null;
    let everConnected = false;
    let leaving = false;
    let lostSince = null;

    const hello = () => send(hostConn, TMSG.HELLO, { id: me.id, name: cleanName(me.name), face: me.face ?? null, version: TABLE_PROTOCOL });

    function retry() {
      if (destroyed || leaving || hostConn != null) return;
      if (lostSince != null && clock.now() - lostSince >= TABLE_GRACE_MS) {
        set({ stage: 'ended', ended: 'lost', link: 'lost' });
        return;
      }
      transport.connect();
      later('retry', retry, RETRY_MS);
    }

    transport.on('connection', (connId) => {
      if (destroyed) return;
      hostConn = connId;
      everConnected = true;
      lostSince = null;
      cancel('retry');
      set({ link: 'ok', lostAt: null, graceEndsAt: null, error: null });
      hello();
    });
    transport.on('message', (connId, msg) => {
      if (destroyed || !validateTableMessage(msg)) return;
      const p = msg.payload;
      switch (msg.type) {
        case TMSG.LOBBY:
          if (p.started) set({ lobby: p, you: p.you });
          else set({ lobby: p, you: p.you, stage: 'lobby', view: null, clock: null, ready: [] });
          break;
        case TMSG.STATE: {
          const now = clock.now();
          const links = Object.fromEntries(Object.entries(p.links ?? {}).map(([id, l]) => [id, { lost: Boolean(l?.lost), graceEndsAt: l?.lost && Number.isFinite(l.graceMs) ? now + l.graceMs : null, ping: l?.ping ?? null }]));
          set({ stage: 'table', view: p.view, clock: p.clock ? { deadline: now + p.clock.msLeft, totalMs: p.clock.totalMs } : null, ready: Array.isArray(p.ready) ? p.ready : [], links });
          break;
        }
        case TMSG.REJECT:
          notice('A mesa mudou antes da sua jogada. Tente de novo.');
          break;
        case TMSG.EMOTE:
          if (p.seat) showEmote(p.seat, p.emote);
          break;
        case TMSG.PING:
          send(connId, TMSG.PONG, { t: p.t });
          break;
        case TMSG.FULL:
          leaving = true;
          set({ stage: 'error', error: p.reason === 'version' ? 'version' : p.reason === 'started' ? 'started' : 'full' });
          break;
        case TMSG.END:
          leaving = true;
          set({ stage: 'ended', ended: p.reason ?? 'host-left' });
          break;
        default:
          break;
      }
    });
    transport.on('disconnect', () => {
      hostConn = null;
      if (destroyed || leaving) return;
      lostSince = clock.now();
      set({ link: 'lost', lostAt: lostSince, graceEndsAt: lostSince + TABLE_GRACE_MS });
      later('retry', retry, RETRY_MS);
    });
    transport.on('error', (err) => {
      if (destroyed || leaving) return;
      const type = err?.type ?? 'network';
      if (everConnected) {
        // caiu e está tentando voltar: o erro de cada tentativa não acaba a mesa
        if (timers.retry == null) later('retry', retry, RETRY_MS);
        return;
      }
      set({ stage: 'error', link: 'lost', error: type === 'peer-unavailable' ? 'notFound' : type });
    });

    Object.assign(api, {
      start() {
        transport.start();
      },
      setFace(face) {
        send(hostConn, TMSG.SEAT, { face });
      },
      setReady(ready) {
        send(hostConn, TMSG.SEAT, { ready });
      },
      moveTo(place) {
        send(hostConn, TMSG.SEAT, { place });
      },
      answerSwap(fromId, yes) {
        send(hostConn, TMSG.SEAT, { answer: { from: fromId, yes } });
      },
      setConfig() {},
      addBot() {},
      removeBot() {},
      canStart: () => false,
      startMatch() {},
      intent(action) {
        const clean = action.type === 'PLAY' ? { type: 'PLAY', tileId: action.tileId, side: action.side } : action.type === 'SIGNAL' ? { type: 'SIGNAL', tileId: action.tileId ?? null } : { type: action.type };
        if (!send(hostConn, TMSG.INTENT, { action: clean })) notice('Sem conexão com a mesa agora.');
      },
      emote(id) {
        const now = clock.now();
        if (!snap.you || !emoteReady(lastSent, now)) return;
        lastSent = now;
        showEmote(snap.you, id);
        send(hostConn, TMSG.EMOTE, { emote: id });
      },
      nextRound() {
        send(hostConn, TMSG.NEXT, {});
        if (snap.you && !snap.ready.includes(snap.you)) set({ ready: [...snap.ready, snap.you] });
      },
      rematch() {},
      leave() {
        leaving = true;
        send(hostConn, TMSG.BYE, { reason: 'quit' });
        closeSoon();
      },
    });
  }

  /** Sai de propósito: o aviso (BYE / END) precisa de um instante para sair antes de fechar o canal. */
  function closeSoon() {
    listeners.clear();
    clock.setTimeout(() => api.destroy(), 400);
  }

  api.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    for (const key of Object.keys(timers)) {
      if (timers[key] == null) continue;
      if (key === 'ping') clock.clearInterval(timers[key]);
      else clock.clearTimeout(timers[key]);
    }
    try {
      transport.destroy();
    } catch {
      /* já fechou */
    }
    listeners.clear();
  };

  return api;
}
