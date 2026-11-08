import { describe, expect, it } from 'vitest';
import { fakeClock } from '../../pvp/__tests__/kit.js';
import { createTableSession } from '../tableSession.js';
import { TMSG, makeTableMessage, validateTableMessage } from '../tableProtocol.js';
import { createStarNetwork } from './starKit.js';

function setup({ guests = 2, config = { seats: 4, hearts: 3, turn: 30, batida: 'todos', teams: true } } = {}) {
  const clock = fakeClock();
  const net = createStarNetwork({ clock });
  let r = 9;
  const random = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  const host = createTableSession({ role: 'host', code: 'ABCDE', me: { id: 'h', name: 'Ana', face: 'marquinhos' }, transport: net.host(), clock, config, random });
  host.start();
  clock.advance(50);
  const people = [];
  for (let i = 0; i < guests; i += 1) {
    const s = createTableSession({ role: 'guest', code: 'ABCDE', me: { id: `g${i}`, name: `Convidado ${i + 1}`, face: null }, transport: net.guest(), clock });
    s.start();
    people.push(s);
    clock.advance(100);
  }
  return { clock, host, people };
}

const places = (session) => session.getSnapshot().lobby.seats.map((s) => s?.id ?? null);

describe('Versão 2.13: trocar de lugar no saguão da roda', () => {
  it('a mensagem nova passa na conferência; posição fora da mesa não', () => {
    expect(validateTableMessage(makeTableMessage(TMSG.SEAT, { place: 2 }))).toBe(true);
    expect(validateTableMessage(makeTableMessage(TMSG.SEAT, { answer: { from: 's1', yes: true } }))).toBe(true);
    expect(validateTableMessage(makeTableMessage(TMSG.SEAT, { place: 7 }))).toBe(false);
    expect(validateTableMessage(makeTableMessage(TMSG.SEAT, { answer: { from: 's1' } }))).toBe(false);
  });

  it('senta na cadeira vazia na hora; a cadeira (o id) continua a mesma', () => {
    const { clock, host, people } = setup({ guests: 1 });
    const [g] = people;
    expect(places(host)).toEqual(['s0', 's1', null, null]);
    g.moveTo(2);
    clock.advance(50);
    expect(places(host)).toEqual(['s0', null, 's1', null]);
    expect(g.getSnapshot().you).toBe('s1');
    expect(places(g)).toEqual(['s0', null, 's1', null]);
  });

  it('troca com bot na hora; com gente, vira pedido que a pessoa aceita ou recusa', () => {
    const { clock, host, people } = setup({ guests: 2 });
    const [g1, g2] = people;
    host.addBot(3);
    clock.advance(20);
    expect(places(host)).toEqual(['s0', 's1', 's2', 's3']);
    // o anfitrião troca com o bot
    host.moveTo(3);
    clock.advance(20);
    expect(places(host)).toEqual(['s3', 's1', 's2', 's0']);
    // o convidado 1 pede para trocar com o convidado 2: nada muda até ele responder
    g1.moveTo(2);
    clock.advance(50);
    expect(places(host)).toEqual(['s3', 's1', 's2', 's0']);
    expect(g2.getSnapshot().lobby.swaps).toEqual([{ from: 's1', to: 's2' }]);
    g2.answerSwap('s1', false);
    clock.advance(50);
    expect(places(host)).toEqual(['s3', 's1', 's2', 's0']);
    expect(host.getSnapshot().lobby.swaps).toEqual([]);
    g1.moveTo(2);
    clock.advance(50);
    g2.answerSwap('s1', true);
    clock.advance(50);
    expect(places(host)).toEqual(['s3', 's2', 's1', 's0']);
  });

  it('as duplas da partida saem das posições escolhidas (quem senta de frente joga junto)', () => {
    const { clock, host, people } = setup({ guests: 1 });
    host.addBot();
    host.addBot();
    clock.advance(20);
    const [g] = people;
    g.setReady(true);
    clock.advance(20);
    // o anfitrião vai para a frente do convidado: os dois viram dupla
    const at = places(host).indexOf('s1');
    host.moveTo((at + 2) % 4);
    clock.advance(20);
    host.startMatch();
    clock.advance(50);
    const seats = host.getSnapshot().view.seats;
    const team = (id) => seats.find((s) => s.id === id).team;
    expect(team('s0')).toBe(team('s1'));
    // depois de começar, ninguém troca mais de lugar
    const before = seats.map((s) => s.id).join(',');
    g.moveTo(0);
    clock.advance(50);
    expect(host.getSnapshot().view.seats.map((s) => s.id).join(',')).toBe(before);
  });
});
