/**
 * Patch PvP: o canal entre os dois aparelhos. A sessão (session.js) só conhece esta interface:
 *
 *   on(evento, fn)      'ready' (registrado no servidor de sinalização), 'connection' (connId),
 *                       'message' (connId, msg), 'disconnect' (connId), 'error' ({ type })
 *   start()             anfitrião: registra o ID da sala e espera; convidado: registra e puxa a cadeira
 *   connect()           convidado: tenta de novo (depois de uma queda)
 *   send(connId, msg)   true se saiu
 *   drop(connId)        fecha aquela conexão
 *   isSignalUp()        o próprio aparelho ainda fala com o servidor de sinalização?
 *   destroy()
 *
 * `createPeerTransport` usa o PeerJS (WebRTC DataChannel, P2P; o servidor público do PeerJS
 * só apresenta os dois). `createLoopbackNetwork` liga duas sessões na memória (testes).
 */

import { loadPeerJs, peerServerOptions } from './peerLoader.js';
import { guestPeerId, peerIdOf } from './protocol.js';

function emitter() {
  const map = new Map();
  return {
    on(name, fn) {
      if (!map.has(name)) map.set(name, new Set());
      map.get(name).add(fn);
      return () => map.get(name)?.delete(fn);
    },
    emit(name, ...args) {
      for (const fn of map.get(name) ?? []) fn(...args);
    },
    clear: () => map.clear(),
  };
}

/** Tentativas de registrar o ID da sala de novo (a página do anfitrião recarregou e o servidor ainda segura o ID antigo). */
const TAKEN_RETRIES = 20;
const TAKEN_RETRY_MS = 3000;

/**
 * Transporte PeerJS. `role` 'host' (o ID no servidor é o da sala) ou 'guest' (ID aleatório,
 * conecta no da sala). `keepId`: o anfitrião voltando de uma página recarregada insiste no ID.
 */
export function createPeerTransport({ role, code, keepId = false, random = Math.random, options = peerServerOptions(), load = loadPeerJs, schedule = (fn, ms) => setTimeout(fn, ms) }) {
  const ev = emitter();
  const conns = new Map();
  const myId = role === 'host' ? peerIdOf(code) : guestPeerId(random);
  let peer = null;
  let PeerClass = null;
  let nextId = 1;
  let destroyed = false;
  let signalUp = false;
  let takenTries = 0;

  function wire(conn) {
    const id = nextId;
    nextId += 1;
    conns.set(id, conn);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      conns.delete(id);
      if (!destroyed) ev.emit('disconnect', id);
    };
    conn.on('open', () => !destroyed && ev.emit('connection', id));
    conn.on('data', (data) => !destroyed && ev.emit('message', id, data));
    conn.on('close', close);
    conn.on('error', close);
    // queda de rede de verdade: o ICE avisa antes do DataChannel
    const pc = conn.peerConnection;
    pc?.addEventListener?.('iceconnectionstatechange', () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') close();
    });
    return id;
  }

  function register() {
    if (destroyed) return;
    peer = new PeerClass(myId, options);
    peer.on('open', () => {
      if (destroyed) return;
      signalUp = true;
      takenTries = 0;
      ev.emit('ready');
      if (role === 'guest') connect();
    });
    peer.on('connection', (conn) => {
      if (role === 'host') wire(conn);
      else conn.close();
    });
    peer.on('disconnected', () => {
      signalUp = false;
      // o servidor de sinalização caiu: tenta voltar (as conexões P2P abertas continuam)
      schedule(() => {
        if (!destroyed && peer && !peer.destroyed && peer.disconnected) peer.reconnect();
      }, 2000);
    });
    peer.on('error', (err) => {
      if (destroyed) return;
      const type = err?.type ?? 'network';
      if (type === 'unavailable-id' && role === 'host' && keepId && takenTries < TAKEN_RETRIES) {
        takenTries += 1;
        peer.destroy();
        schedule(register, TAKEN_RETRY_MS);
        return;
      }
      ev.emit('error', { type, message: err?.message ?? '' });
    });
  }

  function connect() {
    if (destroyed || role !== 'guest' || !peer || peer.destroyed) return;
    if (peer.disconnected) {
      peer.reconnect();
      return;
    }
    for (const [id, conn] of conns) {
      conns.delete(id);
      try {
        conn.close();
      } catch {
        /* já fechou */
      }
    }
    wire(peer.connect(peerIdOf(code), { reliable: true }));
  }

  return {
    on: ev.on,
    async start() {
      try {
        PeerClass = await load();
      } catch {
        ev.emit('error', { type: 'library', message: 'PeerJS não carregou' });
        return;
      }
      register();
    },
    connect,
    send(connId, msg) {
      const conn = conns.get(connId);
      if (!conn || !conn.open) return false;
      try {
        conn.send(msg);
        return true;
      } catch {
        return false;
      }
    },
    drop(connId) {
      const conn = conns.get(connId);
      conns.delete(connId);
      try {
        conn?.close();
      } catch {
        /* já fechou */
      }
    },
    isSignalUp: () => signalUp && Boolean(peer) && !peer.disconnected,
    destroy() {
      destroyed = true;
      ev.clear();
      for (const conn of conns.values()) {
        try {
          conn.close();
        } catch {
          /* já fechou */
        }
      }
      conns.clear();
      try {
        peer?.destroy();
      } catch {
        /* já destruído */
      }
    },
    id: myId,
  };
}

/**
 * Rede de mentira para os testes: o anfitrião e o convidado trocam mensagens pelo relógio
 * injetado (`delay` ms de "latência", cópias em JSON como no fio de verdade). `cut()` derruba
 * a ligação, `heal()` deixa voltar, `signal(role, up)` simula o próprio aparelho sem internet.
 */
export function createLoopbackNetwork({ clock, delay = 20 } = {}) {
  const ends = {};
  const signal = { host: true, guest: true };
  let link = null; // { host: connId, guest: connId }
  let up = true;
  let counter = 0;
  const log = [];

  const later = (fn, ms = delay) => (clock ? clock.setTimeout(fn, ms) : setTimeout(fn, ms));

  function make(role) {
    const ev = emitter();
    let destroyed = false;
    const end = {
      role,
      ev,
      get destroyed() {
        return destroyed;
      },
    };
    ends[role] = end;
    const other = () => ends[role === 'host' ? 'guest' : 'host'];
    const transport = {
      on: ev.on,
      start() {
        later(() => {
          if (destroyed) return;
          ev.emit('ready');
          if (role === 'guest') transport.connect();
        });
      },
      connect() {
        later(() => {
          const host = ends.host;
          if (destroyed || role !== 'guest') return;
          if (!up || !host || host.destroyed || !signal.host || !signal.guest) {
            ev.emit('error', { type: 'peer-unavailable' });
            return;
          }
          counter += 1;
          link = { host: counter, guest: counter };
          host.ev.emit('connection', counter);
          ev.emit('connection', counter);
        });
      },
      send(connId, msg) {
        if (destroyed || !up || !link || link[role] !== connId) return false;
        const copy = JSON.parse(JSON.stringify(msg));
        log.push({ from: role, type: msg.type });
        const target = other();
        const conn = link[target.role];
        later(() => {
          if (!target.destroyed && up && link && link[target.role] === conn) target.ev.emit('message', conn, copy);
        });
        return true;
      },
      drop(connId) {
        if (link && link[role] === connId) network.cut();
      },
      isSignalUp: () => signal[role],
      destroy() {
        destroyed = true;
        if (link) network.cut();
        ev.clear();
      },
    };
    return transport;
  }

  const network = {
    transport: (role) => make(role),
    /** Derruba a ligação (os dois lados recebem "disconnect"). */
    cut() {
      if (!link) return;
      const was = link;
      link = null;
      for (const role of ['host', 'guest']) {
        const end = ends[role];
        if (end && !end.destroyed) later(() => end.ev.emit('disconnect', was[role]), 1);
      }
    },
    /** Some de vez (sem 'disconnect'): só o silêncio do PING percebe. */
    blackout() {
      up = false;
    },
    heal() {
      up = true;
    },
    signal(role, isUp) {
      signal[role] = isUp;
    },
    log,
  };
  return network;
}
