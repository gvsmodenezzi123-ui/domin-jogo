import { describe, expect, it } from 'vitest';
import { fakeClock } from '../../pvp/__tests__/kit.js';
import { createRoamingTable } from '../tableRoaming.js';
import { createStarNetwork } from './starKit.js';

function setup({ guests = 2 } = {}) {
  const clock = fakeClock();
  const net = createStarNetwork({ clock });
  let r = 7;
  const random = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  const makeTransport = (role) => (role === 'host' ? net.host() : net.guest());
  const open = (role, id, name) => {
    const s = createRoamingTable({ role, code: '48213', me: { id, name, face: null }, config: { seats: 4, hearts: 3, turn: 30, batida: 'todos' }, makeTransport, clock, random });
    s.start();
    return s;
  };
  const host = open('host', 'h', 'Ana');
  clock.advance(50);
  const people = [];
  for (let i = 0; i < guests; i += 1) {
    people.push(open('guest', `g${i}`, `Convidado ${i + 1}`));
    clock.advance(100);
  }
  people.forEach((p) => p.setReady(true));
  host.addBot();
  clock.advance(100);
  host.startMatch();
  clock.advance(200);
  return { clock, net, host, people };
}

const tilesOf = (view) => view.seats.length;

describe('versão 2.42: a roda continua sem o dono', () => {
  it('o anfitrião sai: o herdeiro assume o código, os outros reconectam e a partida segue', () => {
    const t = setup();
    const [heir, other] = t.people;
    const heirSeat = heir.getSnapshot().you;
    const otherSeat = other.getSnapshot().you;
    expect(heir.getSnapshot().role).toBe('guest');
    t.host.leave();
    t.clock.advance(1000);
    // o herdeiro virou o anfitrião, na mesma cadeira, com a mesa de pé
    const hs = heir.getSnapshot();
    expect(hs.role).toBe('host');
    expect(hs.you).toBe(heirSeat);
    expect(hs.stage).toBe('table');
    expect(tilesOf(hs.view)).toBe(4);
    // a cadeira do antigo anfitrião saiu (W.O.), as outras continuam vivas
    expect(hs.view.seats.find((s) => s.id === 's0').alive).toBe(false);
    expect(hs.view.seats.find((s) => s.id === heirSeat).alive).toBe(true);
    // o outro convidado volta sozinho, na cadeira dele, e a roda não acabou para ele
    t.clock.advance(8000);
    const os = other.getSnapshot();
    expect(os.stage).toBe('table');
    expect(os.link).toBe('ok');
    expect(os.you).toBe(otherSeat);
    expect(heir.getSnapshot().links[otherSeat].lost).toBe(false);
    // e a partida anda até o fim (relógio da vez, bots, rodadas)
    for (let i = 0; i < 400 && heir.getSnapshot().view.phase !== 'matchOver'; i += 1) {
      for (const s of [heir, other]) {
        const snap = s.getSnapshot();
        if (snap.view?.phase === 'roundOver') s.nextRound();
      }
      t.clock.advance(5000);
    }
    expect(heir.getSnapshot().view.phase).toBe('matchOver');
    expect(other.getSnapshot().view.phase).toBe('matchOver');
  });

  it('o anfitrião cai de vez (sem avisar): o herdeiro percebe que o código sumiu e assume', () => {
    const t = setup();
    const [heir, other] = t.people;
    t.host.destroy();
    t.clock.advance(12000);
    expect(heir.getSnapshot().role).toBe('host');
    expect(heir.getSnapshot().stage).toBe('table');
    t.clock.advance(8000);
    expect(other.getSnapshot().link).toBe('ok');
    expect(other.getSnapshot().stage).toBe('table');
    // o antigo anfitrião não voltou: no fim do prazo a cadeira dele sai
    t.clock.advance(70000);
    expect(heir.getSnapshot().view.seats.find((s) => s.id === 's0').alive).toBe(false);
  });
});
