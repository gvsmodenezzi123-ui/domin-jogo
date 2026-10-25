/**
 * Patch PvP: o "meio de campo" entre a sessão de rede (session.js) e a run de cada pessoa (o
 * reducer do jogo). Versão 1.3: a rota é Loja → Mercado Negro → Duelo. Quando a mesa começa,
 * a run nasce com as moedas e os corações da configuração e já entra na loja; sair dela abre
 * o Mercado Negro; sair do beco fecha o baralho (SHOP_FINISH) e manda o DUEL_READY. Também
 * conta onde você está para o outro (STATUS) e guarda tudo no aparelho para voltar depois de
 * recarregar a página. Sem React: a tela assina e lê o snapshot.
 */

import { createInitialState, gameReducer } from '../engine/gameReducer.js';
import { profileOf } from './duelHost.js';
import { initialDeckOf, pvpNewRun, statusOf } from './ladder.js';

export const SAVE_KEY = 'buxaria:pvp:save';
/** Depois disso a mesa guardada já não vale (a outra pessoa foi embora faz tempo). */
export const SAVE_MAX_AGE_MS = 30 * 60 * 1000;

/** A mesa guardada no aparelho (ou null). */
export function loadSavedTable(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    // v2 = versão 1.3 (a rota curta); uma mesa guardada da rota antiga não volta
    if (!save || save.v !== 2 || !save.session || now - (save.savedAt ?? 0) > SAVE_MAX_AGE_MS) return null;
    if (save.session.s?.stage === 'over') return null;
    return save;
  } catch {
    return null;
  }
}

/** Recarregou a página no meio da partida (faz pouco): a mesa volta sozinha. */
export const AUTO_REJOIN_MS = 90000;
export function recentSavedTable(storage = globalThis.localStorage, now = Date.now()) {
  const save = loadSavedTable(storage, now);
  return save && now - save.savedAt <= AUTO_REJOIN_MS ? save : null;
}

export function clearSavedTable(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* sem storage */
  }
}

/**
 * `session` (session.js); `restore`: o que `loadSavedTable` devolveu (a run volta junto).
 * `storage`: onde guardar (null = não guarda, nos testes).
 */
export function createController({ session, restore = null, storage = globalThis.localStorage, now = () => Date.now() }) {
  const listeners = new Set();
  let s = {
    run: restore?.run ?? createInitialState(),
    // a parada da rota: 'shop' → 'market' → 'duel' (baralho fechado)
    step: restore?.step ?? 'shop',
    startRelics: restore?.startRelics ?? null, // os talismãs da maleta (o SHOP_FINISH conta só os comprados)
  };
  let snapshot = Object.freeze({ ...s, net: session.getSnapshot() });

  const emit = () => {
    snapshot = Object.freeze({ ...s, net: session.getSnapshot() });
    for (const fn of listeners) fn();
  };

  function save() {
    if (!storage) return;
    const net = session.getSnapshot();
    try {
      if (net.stage === 'over') {
        storage.removeItem(SAVE_KEY);
        return;
      }
      const run = { ...s.run, events: [] };
      storage.setItem(
        SAVE_KEY,
        JSON.stringify({ v: 2, savedAt: now(), role: net.role, code: net.code, oppName: net.opp?.name ?? null, session: session.snapshot(), run, step: s.step, startRelics: s.startRelics }),
      );
    } catch {
      /* sem espaço / sem storage: a mesa só não volta depois de recarregar */
    }
  }

  const open = (run, kind) => gameReducer(run, { type: 'PVP_OPEN_STOP', kind });

  /** Reage a qualquer mudança (da rede ou daqui): a run anda sozinha onde precisa. */
  function sync() {
    const net = session.getSnapshot();
    if ((net.stage === 'run' || net.stage === 'over') && s.run.phase === 'title' && net.seed != null && net.myHandshake) {
      // a mesa começou: a run nasce com a configuração da mesa e já entra na loja
      const fresh = gameReducer(s.run, pvpNewRun({ seed: net.seed, seedCode: net.seedCode, maleta: net.myHandshake.suitcase, room: net.room }));
      s = { ...s, run: open(fresh, 'shop'), step: 'shop', startRelics: [...fresh.relics.player] };
    }
    if (net.stage === 'run' && s.run.phase !== 'title') {
      session.reportStatus(statusOf(s.run, { step: s.step, inDuel: Boolean(net.duel) }));
    }
    save();
    emit();
  }

  const unsubscribe = session.subscribe(sync);

  let started = false;
  const api = {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    session,

    /** Liga a rede (uma vez só, mesmo que a tela peça de novo). */
    start() {
      if (started) return;
      started = true;
      session.start();
    },

    chooseMaleta(maleta) {
      session.chooseMaleta(maleta, initialDeckOf(maleta));
    },

    /** Compras e vendas da loja e do beco (as ações de sempre da run). */
    dispatch(action) {
      const next = gameReducer(s.run, action);
      if (next === s.run) return false;
      s = { ...s, run: next };
      sync();
      return true;
    },

    /**
     * Sai da parada atual: da loja vai para o Mercado Negro; do beco, o baralho fecha
     * (SHOP_FINISH com os talismãs comprados) e vem o DUEL_READY.
     */
    leaveStop() {
      const run = s.run;
      if (run.phase === 'shop') {
        s = { ...s, run: open(gameReducer(run, { type: 'LEAVE_SHOP' }), 'black'), step: 'market' };
        sync();
        return true;
      }
      if (run.phase === 'blackMarket') {
        const left = gameReducer(run, { type: 'LEAVE_MARKET' });
        const bought = left.relics.player.filter((id) => !(s.startRelics ?? []).includes(id));
        s = { ...s, run: left, step: 'duel' };
        session.shopFinished(bought, left.coins.player);
        session.readyForDuel({ node: null, kind: 'done', profile: profileOf(left) });
        sync();
        return true;
      }
      return false;
    },

    destroy() {
      unsubscribe();
      listeners.clear();
    },
  };
  sync();
  return api;
}
