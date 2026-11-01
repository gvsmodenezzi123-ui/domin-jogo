// Ferramentas dos testes da mesa de 2 a 4: uma rede de mentira em estrela (um anfitrião e
// vários convidados, com latência pelo relógio injetado e cópias em JSON como no fio).

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

export function createStarNetwork({ clock, delay = 20 } = {}) {
  let host = null;
  let counter = 0;
  const links = new Map();
  const log = [];
  const later = (fn, ms = delay) => clock.setTimeout(fn, ms);

  function cutLink(g) {
    const id = g.link;
    if (id == null) return;
    g.link = null;
    links.delete(id);
    later(() => {
      if (host && !host.destroyed) host.ev.emit('disconnect', id);
      if (!g.destroyed) g.ev.emit('disconnect', id);
    });
  }

  const network = {
    log,
    host() {
      const ev = emitter();
      const end = { ev, destroyed: false };
      host = end;
      return {
        on: ev.on,
        start: () => later(() => !end.destroyed && ev.emit('ready')),
        connect() {},
        send(connId, msg) {
          const g = links.get(connId);
          if (end.destroyed || !g || g.link !== connId) return false;
          const copy = JSON.parse(JSON.stringify(msg));
          log.push({ from: 'host', to: connId, type: msg.type });
          later(() => {
            if (g.link === connId && !g.destroyed) g.ev.emit('message', connId, copy);
          });
          return true;
        },
        drop(connId) {
          const g = links.get(connId);
          if (g) cutLink(g);
        },
        isSignalUp: () => true,
        destroy() {
          end.destroyed = true;
          for (const g of [...links.values()]) cutLink(g);
          ev.clear();
        },
      };
    },
    guest() {
      const ev = emitter();
      const g = { ev, destroyed: false, link: null, blocked: false };
      const transport = {
        on: ev.on,
        start: () =>
          later(() => {
            if (g.destroyed) return;
            ev.emit('ready');
            transport.connect();
          }),
        connect() {
          later(() => {
            if (g.destroyed || g.link != null) return;
            if (!host || host.destroyed || g.blocked) {
              ev.emit('error', { type: 'peer-unavailable' });
              return;
            }
            counter += 1;
            g.link = counter;
            links.set(counter, g);
            host.ev.emit('connection', counter);
            ev.emit('connection', counter);
          });
        },
        send(connId, msg) {
          if (g.destroyed || g.link !== connId) return false;
          const copy = JSON.parse(JSON.stringify(msg));
          log.push({ from: connId, type: msg.type });
          later(() => {
            if (g.link === connId && host && !host.destroyed) host.ev.emit('message', connId, copy);
          });
          return true;
        },
        drop: () => cutLink(g),
        isSignalUp: () => !g.blocked,
        destroy() {
          g.destroyed = true;
          cutLink(g);
          ev.clear();
        },
      };
      transport.end = g;
      return transport;
    },
    /** Derruba a ligação do convidado (`blocked`: ele também não consegue voltar). */
    cut(guestTransport, blocked = false) {
      guestTransport.end.blocked = blocked;
      cutLink(guestTransport.end);
    },
    heal(guestTransport) {
      guestTransport.end.blocked = false;
    },
  };
  return network;
}
