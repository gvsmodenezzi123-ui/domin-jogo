/**
 * Patch PvP: o "meio de campo" entre a sessão de rede (session.js) e a run de cada pessoa (o
 * reducer do jogo): começa a run quando a teia chega, transforma a escolha de uma mesa em
 * DUEL_READY, leva o resultado do duelo de volta para a run, conta onde você está para o
 * outro (STATUS), fecha o baralho na saída da loja (SHOP_FINISH) e guarda tudo no aparelho
 * para voltar depois de recarregar a página. Sem React: a tela assina e lê o snapshot.
 */

import { nodeOf } from '../engine/campaignMap.js';
import { createInitialState, gameReducer } from '../engine/gameReducer.js';
import { profileOf, runResultFor } from './duelHost.js';
import { initialDeckOf, isDuelNode, pvpNewRun, runFinished, statusOf } from './ladder.js';

export const SAVE_KEY = 'buxaria:pvp:save';
/** Depois disso a mesa guardada já não vale (a outra pessoa foi embora faz tempo). */
export const SAVE_MAX_AGE_MS = 30 * 60 * 1000;

/** A mesa guardada no aparelho (ou null). */
export function loadSavedTable(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (!save || save.v !== 1 || !save.session || now - (save.savedAt ?? 0) > SAVE_MAX_AGE_MS) return null;
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
    waitingAt: restore?.waitingAt ?? null,
    readyKind: restore?.readyKind ?? null,
    duelsPlayed: restore?.duelsPlayed ?? 0,
    boss: restore?.boss ?? false,
    shopEntry: restore?.shopEntry ?? null, // talismãs ao entrar na loja/beco (o SHOP_FINISH conta só os novos)
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
        JSON.stringify({ v: 1, savedAt: now(), role: net.role, code: net.code, oppName: net.opp?.name ?? null, session: session.snapshot(), run, waitingAt: s.waitingAt, readyKind: s.readyKind, duelsPlayed: s.duelsPlayed, boss: s.boss, shopEntry: s.shopEntry }),
      );
    } catch {
      /* sem espaço / sem storage: a mesa só não volta depois de recarregar */
    }
  }

  const setRun = (run) => {
    const entering = (run.phase === 'shop' || run.phase === 'blackMarket') && run.phase !== s.run.phase;
    s = { ...s, run, shopEntry: entering ? [...s.run.relics.player] : s.shopEntry };
  };

  /** Reage a qualquer mudança (da rede ou daqui): a run anda sozinha onde precisa. */
  function sync() {
    const net = session.getSnapshot();
    if (net.stage === 'run' || net.stage === 'over') {
      // a teia chegou: a run começa (com a maleta que você escolheu)
      if (s.run.phase === 'title' && net.seed != null && net.myHandshake) {
        setRun(gameReducer(s.run, pvpNewRun({ seed: net.seed, seedCode: net.seedCode, maleta: net.myHandshake.suitcase })));
      }
    }
    if (net.stage === 'run' && s.run.phase !== 'title') {
      // zerou fora da mesa (um imprevisto): o outro vence
      if (s.run.phase === 'gameOver' && !net.duel) session.defeat('hearts');
      // terminou a teia: espera "no fim da noite" (as mesas do outro são contra você)
      else if (!net.duel && !s.readyKind && runFinished(s.run)) {
        s = { ...s, readyKind: 'done', waitingAt: null, boss: false };
        session.readyForDuel({ node: null, kind: 'done', profile: profileOf(s.run) });
      }
      session.reportStatus(statusOf(s.run, { waitingAt: s.waitingAt, inDuel: Boolean(net.duel) }));
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

    /** Ação comum da run (compras, eventos, sair do Seu Tião...). */
    dispatch(action) {
      if (action.type === 'CHOOSE_NODE' || action.type === 'ENTER_NODE') return api.enterNode(action.nodeId);
      const next = gameReducer(s.run, action);
      if (next === s.run) return false;
      setRun(next);
      sync();
      return true;
    },

    /** Entrou num nó do mapa: mesa vira duelo (DUEL_READY); o resto é a run de sempre. */
    enterNode(nodeId) {
      const net = session.getSnapshot();
      if (net.stage !== 'run' || s.run.phase !== 'map' || s.readyKind) return false;
      const node = nodeOf(s.run, nodeId);
      if (!node) return false;
      if (isDuelNode(node)) {
        const kind = node.type === 'boss' ? 'boss' : 'combat';
        s = { ...s, waitingAt: nodeId, readyKind: kind, boss: kind === 'boss' };
        session.readyForDuel({ node: nodeId, kind, profile: profileOf(s.run) });
        sync();
        return true;
      }
      const next = gameReducer(s.run, { type: 'CHOOSE_NODE', nodeId });
      if (next === s.run) return false;
      setRun(next);
      sync();
      return true;
    },

    /** PRONTO PARA O DUELO: sai da loja (ou do beco) e conta para o outro o que entrou no baralho. */
    leaveShop(boughtBefore = s.shopEntry) {
      const run = s.run;
      const type = run.phase === 'shop' ? 'LEAVE_SHOP' : run.phase === 'blackMarket' ? 'LEAVE_MARKET' : null;
      if (!type) return false;
      const fresh = run.relics.player.filter((id) => !(boughtBefore ?? []).includes(id));
      session.shopFinished(fresh, run.coins.player);
      setRun(gameReducer(run, { type }));
      sync();
      return true;
    },

    /** VOLTAR À TEIA: o resultado do duelo entra na run (uma vez só) e a mesa fecha. */
    finishDuel() {
      const duel = session.getSnapshot().duel;
      if (!duel?.result || duel.result.matchOver || duel.final) return false;
      const action = runResultFor(duel.view, { nodeId: s.waitingAt, boss: s.boss, maleta: s.run.maleta });
      setRun(gameReducer(s.run, action));
      s = { ...s, waitingAt: null, readyKind: null, boss: false, duelsPlayed: s.duelsPlayed + 1 };
      session.closeDuel();
      sync();
      return true;
    },

    /** Para a tela do duelo: a mesa é de chefe? */
    isBossTable: () => s.boss,

    destroy() {
      unsubscribe();
      listeners.clear();
    },
  };
  sync();
  return api;
}
