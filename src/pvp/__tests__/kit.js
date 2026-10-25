// Ferramentas dos testes do online: relógio de mentira, dois jogadores-robô e as conferências.
import { availableNodes } from '../../engine/campaignMap.js';
import { createSeededRng } from '../../engine/dominoLogic.js';
import { createController } from '../controller.js';
import { actorOf, autoIntent } from '../duelHost.js';
import { tileCount } from '../mirror.js';
import { createSession } from '../session.js';
import { createLoopbackNetwork } from '../transport.js';

/** Relógio que só anda quando o teste manda (setTimeout/setInterval em ordem de horário). */
export function fakeClock(start = 1_000_000) {
  let now = start;
  let seq = 0;
  const timers = new Map();
  const add = (fn, ms, every) => {
    seq += 1;
    timers.set(seq, { at: now + Math.max(0, ms), fn, every, id: seq });
    return seq;
  };
  return {
    now: () => now,
    setTimeout: (fn, ms) => add(fn, ms, null),
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, ms) => add(fn, ms, Math.max(1, ms)),
    clearInterval: (id) => timers.delete(id),
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const t of timers.values()) if (t.at <= end && (!next || t.at < next.at || (t.at === next.at && t.id < next.id))) next = t;
        if (!next) break;
        now = next.at;
        if (next.every) next.at += next.every;
        else timers.delete(next.id);
        next.fn();
      }
      now = end;
    },
    pending: () => timers.size,
  };
}

/**
 * Um jogador-robô (pela mesma "ponte" que a tela usa, controller.js): escolhe a maleta, sobe a
 * teia sorteando os caminhos, compra alguma coisa na loja, senta nas mesas, joga com a jogada
 * automática e volta para a teia.
 */
export function makeBot({ session, maleta, seed = 1, shopping = true, restore = null }) {
  const rng = createSeededRng(seed);
  const ctl = createController({ session, restore, storage: null });
  const bot = {
    session,
    ctl,
    errors: [],
    get run() {
      return ctl.getSnapshot().run;
    },
    get duelsPlayed() {
      return ctl.getSnapshot().duelsPlayed;
    },
    step() {
      const snap = ctl.getSnapshot();
      const net = session.getSnapshot();
      if (net.stage === 'over') return;
      if (net.stage === 'maletas' && !net.myHandshake) {
        ctl.chooseMaleta(maleta);
        return;
      }
      if (net.stage !== 'run' || snap.run.phase === 'title') return;
      const duel = net.duel;
      if (duel) {
        if (duel.result) {
          if (duel.final && !duel.result.matchOver) {
            if (!duel.nextSent) session.nextRound();
          } else if (!duel.result.matchOver) ctl.finishDuel();
          return;
        }
        if (actorOf(duel.view) === 'player' && !duel.awaiting) session.duelIntent(autoIntent(duel.view, 'player'));
        return;
      }
      if (snap.readyKind) return;
      const run = snap.run;
      if (run.phase === 'map') {
        const open = availableNodes(run);
        if (!open.length) return;
        const id = open[Math.floor(rng() * open.length)];
        if (!ctl.enterNode(id)) bot.errors.push(`nó recusado ${id}`);
        return;
      }
      if (run.phase === 'shop') {
        const before = [...run.relics.player];
        if (shopping) {
          const i = run.shop.relics.findIndex((o) => !o.sold && o.price <= run.coins.player);
          if (i >= 0) ctl.dispatch({ type: 'SHOP_BUY_RELIC', index: i });
          const now = ctl.getSnapshot().run;
          const t = now.shop.tiles.findIndex((o) => !o.sold && o.price <= now.coins.player);
          if (t >= 0 && rng() < 0.5) ctl.dispatch({ type: 'SHOP_BUY_TILE', index: t });
        }
        ctl.leaveShop(before);
        return;
      }
      if (run.phase === 'blackMarket') {
        const before = [...run.relics.player];
        const i = shopping ? run.market.offers.findIndex((o) => !o.sold && o.price <= run.coins.player) : -1;
        if (i >= 0) ctl.dispatch({ type: 'MARKET_BUY', index: i });
        ctl.leaveShop(before);
        return;
      }
      if (run.phase === 'coinEvent') {
        ctl.dispatch({ type: 'LEAVE_EVENT' });
        return;
      }
      if (run.phase === 'encounter') {
        if (!run.encounter.choice) {
          if (!ctl.dispatch({ type: 'ENCOUNTER_CHOOSE', choice: 'b' }) && !ctl.dispatch({ type: 'ENCOUNTER_CHOOSE', choice: 'a' })) ctl.dispatch({ type: 'LEAVE_ENCOUNTER' });
        } else ctl.dispatch({ type: 'LEAVE_ENCOUNTER' });
      }
    },
  };
  return bot;
}

/** Duas sessões ligadas pela rede de mentira, cada uma com o seu robô. */
export function makeMatch({ seed = 7, hostMaleta = 'classica', guestMaleta = 'bicheiro', delay = 25, shopping = true } = {}) {
  const clock = fakeClock();
  const net = createLoopbackNetwork({ clock, delay });
  const host = createSession({ role: 'host', code: 'TESTE', me: { id: 'id-anfitriao', name: 'Ana' }, transport: net.transport('host'), clock });
  const guest = createSession({ role: 'guest', code: 'TESTE', me: { id: 'id-convidado', name: 'Bento' }, transport: net.transport('guest'), clock });
  const bots = { host: makeBot({ session: host, maleta: hostMaleta, seed, shopping }), guest: makeBot({ session: guest, maleta: guestMaleta, seed: seed + 101, shopping }) };
  host.start();
  guest.start();
  const issues = [];
  const check = () => {
    const hd = host._hostDuel();
    if (hd?.state && ['playing', 'roundOver'].includes(hd.state.phase)) {
      const n = tileCount(hd.state);
      if (n !== 28) issues.push(`pedras na mesa do anfitrião: ${n}`);
      for (const seat of ['player', 'tioZe']) {
        if (hd.state.hearts[seat] < 0 || hd.state.hearts[seat] > hd.state.maxHearts[seat]) issues.push(`corações fora do limite (${seat})`);
        if (hd.state.coins[seat] < 0) issues.push(`moedas negativas (${seat})`);
      }
    }
    const gd = guest.getSnapshot().duel;
    if (gd?.view && ['playing', 'roundOver'].includes(gd.view.phase)) {
      const n = tileCount(gd.view);
      if (n !== 28) issues.push(`pedras na tela do convidado: ${n}`);
    }
  };
  return {
    clock,
    net,
    host,
    guest,
    bots,
    issues,
    /** Roda até acabar (ou `limitMs` de jogo); devolve quantos passos deu. */
    run(limitMs = 4 * 3600 * 1000, tick = 50, { during } = {}) {
      let t = 0;
      while (t < limitMs) {
        if (host.getSnapshot().stage === 'over' && guest.getSnapshot().stage === 'over') break;
        bots.host.step();
        bots.guest.step();
        during?.(t);
        clock.advance(tick);
        check();
        t += tick;
      }
      return t;
    },
  };
}
