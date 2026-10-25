import { describe, expect, it } from 'vitest';
import { createSession } from '../session.js';
import { makeBot, makeMatch } from './kit.js';

const inDuel = (m) => Boolean(m.host.getSnapshot().duel && !m.host.getSnapshot().duel.result && m.guest.getSnapshot().duel);

describe('Patch PvP: queda de conexão, W.O. e volta para a mesa', () => {
  it('a conexão cai no meio do duelo e volta antes de 60 s: a partida segue até o fim', () => {
    const m = makeMatch({ seed: 21 });
    let cut = false;
    let sawLost = false;
    m.run(undefined, 50, {
      during: () => {
        if (!cut && inDuel(m)) {
          cut = true;
          m.net.cut();
        }
        if (m.guest.getSnapshot().link === 'lost') sawLost = true;
      },
    });
    expect(cut).toBe(true);
    expect(sawLost).toBe(true);
    const h = m.host.getSnapshot().over;
    expect(h.reason).toBe('hearts');
    expect(m.guest.getSnapshot().over.winnerId).toBe(h.winnerId);
    expect(m.issues).toEqual([]);
  });

  it('quem some por mais de 60 s perde por W.O. (os dois lados concordam)', () => {
    const m = makeMatch({ seed: 33 });
    let gone = false;
    let countdown = null;
    m.run(10 * 60 * 1000, 50, {
      during: () => {
        if (!gone && inDuel(m)) {
          gone = true;
          m.net.blackout();
          m.net.signal('guest', false); // o aparelho do convidado ficou sem internet
        }
        const h = m.host.getSnapshot();
        if (h.link === 'lost' && countdown == null) countdown = h.graceEndsAt - m.clock.now();
      },
    });
    expect(countdown).toBeGreaterThan(55000);
    expect(countdown).toBeLessThanOrEqual(60000);
    const h = m.host.getSnapshot().over;
    const g = m.guest.getSnapshot().over;
    expect(h).toMatchObject({ winnerId: 'id-anfitriao', reason: 'wo' });
    expect(g).toMatchObject({ winnerId: 'id-anfitriao', reason: 'wo', self: true });
  });

  it('o convidado recarrega a página no meio da run e volta para a mesma mesa', () => {
    const m = makeMatch({ seed: 45 });
    let reloaded = false;
    m.run(undefined, 50, {
      during: () => {
        if (reloaded || m.bots.guest.duelsPlayed < 1 || inDuel(m)) return;
        reloaded = true;
        // o que a página guardou (controller.js grava isso no aparelho)
        const ctl = m.bots.guest.ctl.getSnapshot();
        const saved = { run: ctl.run, waitingAt: ctl.waitingAt, readyKind: ctl.readyKind, duelsPlayed: ctl.duelsPlayed, boss: ctl.boss };
        const snap = JSON.parse(JSON.stringify(m.guest.snapshot()));
        m.bots.guest.ctl.destroy();
        m.guest.destroy();
        const guest = createSession({ role: 'guest', code: 'TESTE', me: { id: 'id-convidado', name: 'Bento' }, transport: m.net.transport('guest'), clock: m.clock, restore: snap });
        const bot = makeBot({ session: guest, maleta: 'bicheiro', seed: 77, restore: JSON.parse(JSON.stringify(saved)) });
        m.guest = guest;
        m.bots.guest = bot;
        guest.start();
      },
    });
    expect(reloaded).toBe(true);
    const h = m.host.getSnapshot().over;
    expect(h).toBeTruthy();
    expect(h.reason).toBe('hearts');
    expect(m.guest.getSnapshot().over.winnerId).toBe(h.winnerId);
    expect(m.issues).toEqual([]);
  });

  it('o anfitrião recarrega no meio do duelo: a mesa (o estado de verdade) volta junto', () => {
    const m = makeMatch({ seed: 52 });
    let reloaded = false;
    m.run(undefined, 50, {
      during: () => {
        if (reloaded || !inDuel(m)) return;
        reloaded = true;
        const ctl = m.bots.host.ctl.getSnapshot();
        const saved = { run: ctl.run, waitingAt: ctl.waitingAt, readyKind: ctl.readyKind, duelsPlayed: ctl.duelsPlayed, boss: ctl.boss };
        const snap = JSON.parse(JSON.stringify(m.host.snapshot()));
        m.bots.host.ctl.destroy();
        m.host.destroy();
        const host = createSession({ role: 'host', code: 'TESTE', me: { id: 'id-anfitriao', name: 'Ana' }, transport: m.net.transport('host'), clock: m.clock, restore: snap });
        const bot = makeBot({ session: host, maleta: 'classica', seed: 88, restore: JSON.parse(JSON.stringify(saved)) });
        m.host = host;
        m.bots.host = bot;
        host.start();
      },
    });
    expect(reloaded).toBe(true);
    const h = m.host.getSnapshot().over;
    expect(h?.reason).toBe('hearts');
    expect(m.guest.getSnapshot().over.winnerId).toBe(h.winnerId);
  });

  it('30 s sem jogar: o cronômetro joga sozinho e a mesa não trava', () => {
    const m = makeMatch({ seed: 64 });
    // o convidado só olha: nunca joga na mesa
    m.bots.guest.step = ((orig) =>
      function lazy() {
        const d = m.guest.getSnapshot().duel;
        if (d && !d.result) return;
        orig();
      })(m.bots.guest.step);
    let timeouts = 0;
    m.run(3 * 3600 * 1000, 250, {
      during: () => {
        const ev = m.host._hostDuel()?.state?.events ?? [];
        timeouts = Math.max(timeouts, ev.filter((e) => e.type === 'proc' && e.source === 'clock').length);
      },
    });
    expect(timeouts).toBeGreaterThan(0);
    expect(m.host.getSnapshot().over?.reason).toBe('hearts');
  });

  it('SAIR DA MESA entrega a vitória por W.O. para o outro', () => {
    const m = makeMatch({ seed: 70 });
    let quit = false;
    m.run(undefined, 50, {
      during: () => {
        if (!quit && m.bots.host.duelsPlayed >= 1) {
          quit = true;
          m.guest.quit();
        }
      },
    });
    expect(m.host.getSnapshot().over).toMatchObject({ winnerId: 'id-anfitriao', reason: 'quit' });
    expect(m.guest.getSnapshot().over).toMatchObject({ winnerId: 'id-anfitriao', reason: 'quit', self: true });
  });
});
