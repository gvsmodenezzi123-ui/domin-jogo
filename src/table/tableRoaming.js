/**
 * Versão 2.42: a roda que continua sem o dono. Embrulha a sessão da mesa (tableSession.js) e
 * troca o papel dela quando precisa, sem a tela perceber (a tela só conhece subscribe /
 * getSnapshot e as ações):
 * - convidado → anfitrião: o anfitrião saiu (ou caiu de vez) e a cópia da mesa estava com este
 *   convidado (o herdeiro): ele abre o mesmo código e segue a partida de onde parou; os outros
 *   reconectam nele sozinhos.
 * - anfitrião → convidado: o anfitrião ficou sem internet, a roda seguiu com o herdeiro e o
 *   código agora é dele: o antigo anfitrião volta como convidado, na cadeira dele.
 *
 * `makeTransport(role, { keepId })` cria o transporte de cada papel.
 */
import { createTableSession } from './tableSession.js';

const ACTIONS = ['setFace', 'setReady', 'moveTo', 'answerSwap', 'setConfig', 'addBot', 'removeBot', 'startMatch', 'intent', 'emote', 'nextRound', 'rematch', 'leave'];

export function createRoamingTable({ role, code, me, config = null, makeTransport, clock, random }) {
  const listeners = new Set();
  const extra = { ...(clock ? { clock } : {}), ...(random ? { random } : {}) };
  let inner = null;
  let off = null;
  let started = false;
  let destroyed = false;
  let wasUp = false;

  const emit = () => listeners.forEach((fn) => fn());

  function mount(next) {
    off?.();
    inner?.destroy();
    inner = next;
    wasUp = false;
    off = inner.subscribe(() => {
      const snap = inner.getSnapshot();
      if (snap.role === 'host') {
        if (snap.link === 'ok') wasUp = true;
        // o código foi tomado depois de a roda já estar aberta: ela seguiu com o herdeiro
        if (wasUp && snap.error === 'taken') {
          becomeGuest();
          return;
        }
      }
      emit();
    });
    if (started) inner.start();
    emit();
  }

  function becomeHost(backup) {
    if (destroyed) return;
    mount(createTableSession({ role: 'host', code, me, transport: makeTransport('host', { keepId: true }), resume: backup, ...extra }));
  }

  function becomeGuest() {
    if (destroyed) return;
    mount(createTableSession({ role: 'guest', code, me, transport: makeTransport('guest', {}), onTakeover: becomeHost, ...extra }));
  }

  mount(
    role === 'host'
      ? createTableSession({ role: 'host', code, me, transport: makeTransport('host', {}), config, ...extra })
      : createTableSession({ role: 'guest', code, me, transport: makeTransport('guest', {}), onTakeover: becomeHost, ...extra }),
  );

  const api = {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => inner.getSnapshot(),
    start() {
      started = true;
      inner.start();
    },
    canStart: () => inner.canStart(),
    destroy() {
      destroyed = true;
      off?.();
      inner.destroy();
      listeners.clear();
    },
  };
  for (const name of ACTIONS) api[name] = (...args) => inner[name](...args);
  return api;
}
