import { describe, expect, it } from 'vitest';
import { fakeClock } from '../../pvp/__tests__/kit.js';
import { botAction } from '../tableEngine.js';
import { NEXT_AUTO_MS, TABLE_GRACE_MS, createTableSession } from '../tableSession.js';
import { TABLE_PROTOCOL, TMSG, makeTableMessage, maskTableInput, parseTableInput, formatTableId, tablePeerId } from '../tableProtocol.js';
import { createStarNetwork } from './starKit.js';

/** Monta o anfitrião e `n` convidados ligados na mesma rede de mentira. */
function setup({ guests = 2, config = { seats: 4, hearts: 3, turn: 30, batida: 'todos' }, seed = 7 } = {}) {
  const clock = fakeClock();
  const net = createStarNetwork({ clock });
  let r = seed;
  const random = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  const host = createTableSession({ role: 'host', code: 'ABCDE', me: { id: 'h', name: 'Ana', face: 'marquinhos' }, transport: net.host(), clock, config, random });
  host.start();
  clock.advance(50);
  const people = [];
  for (let i = 0; i < guests; i += 1) {
    const transport = net.guest();
    const s = createTableSession({ role: 'guest', code: 'ABCDE', me: { id: `g${i}`, name: `Convidado ${i + 1}`, face: null }, transport, clock });
    s.start();
    people.push({ s, transport });
    clock.advance(100);
  }
  return { clock, net, host, people };
}

/** Todo mundo joga com a jogada automática até a partida acabar (ou o tempo do teste). */
function playAll({ clock, host, people }, maxMs = 30 * 60 * 1000) {
  const all = [host, ...people.map((p) => p.s)];
  let elapsed = 0;
  while (elapsed < maxMs) {
    for (const s of all) {
      const snap = s.getSnapshot();
      const v = snap.view;
      if (!v || snap.stage !== 'table') continue;
      if (v.phase === 'playing' && v.turn === snap.you) {
        const action = botAction(v, snap.you);
        if (action) s.intent(action);
      }
      if (v.phase === 'roundOver' && !snap.ready.includes(snap.you)) s.nextRound();
    }
    clock.advance(200);
    elapsed += 200;
    if (host.getSnapshot().view?.phase === 'matchOver') break;
  }
  clock.advance(500);
}

describe('mesa online de 2 a 4: código e protocolo', () => {
  it('o código da roda tem o próprio prefixo e outro ID de anfitrião que o duelo', () => {
    expect(formatTableId('48213')).toBe('RODA-48213');
    expect(parseTableInput('roda-48213')).toBe('48213');
    expect(parseTableInput('https://x.y/?roda=48213')).toBe('48213');
    expect(parseTableInput('MESA-48213')).toBe(null);
    // versão 2.35.3: só números
    expect(parseTableInput('RODA-8B2KQ')).toBe(null);
    expect(maskTableInput('roda-4a8213')).toBe('48213');
    expect(tablePeerId('48213')).toBe('buxaria-roda-48213');
  });
});

describe('mesa online de 2 a 4: saguão', () => {
  it('quem entra senta numa cadeira livre; o anfitrião completa com bot e só começa com todos prontos', () => {
    const t = setup({ guests: 2 });
    const lobby = t.host.getSnapshot().lobby;
    expect(lobby.seats.filter(Boolean).map((s) => s.name)).toEqual(['Ana', 'Convidado 1', 'Convidado 2']);
    expect(t.people[0].s.getSnapshot().you).toBe('s1');
    expect(t.people[1].s.getSnapshot().stage).toBe('lobby');
    // rostos diferentes para cada um
    const faces = lobby.seats.filter(Boolean).map((s) => s.face);
    expect(new Set(faces).size).toBe(faces.length);
    expect(t.host.canStart()).toBe(false);
    t.people.forEach((p) => p.s.setReady(true));
    t.clock.advance(100);
    expect(t.host.canStart()).toBe(true);
    t.host.addBot();
    expect(t.host.getSnapshot().lobby.seats[3]).toMatchObject({ bot: true, name: 'Neide' });
    t.clock.advance(100);
    expect(t.people[0].s.getSnapshot().lobby.seats[3].bot).toBe(true);
  });

  it('mesa cheia, mesa já começada e versão diferente: o convidado fica sabendo', () => {
    const t = setup({ guests: 3 });
    const extra = createTableSession({ role: 'guest', code: 'ABCDE', me: { id: 'x', name: 'Quinto' }, transport: t.net.guest(), clock: t.clock });
    extra.start();
    t.clock.advance(200);
    expect(extra.getSnapshot()).toMatchObject({ stage: 'error', error: 'full' });

    const t2 = setup({ guests: 1 });
    t2.people[0].s.setReady(true);
    t2.clock.advance(100);
    t2.host.startMatch();
    t2.clock.advance(100);
    const late = createTableSession({ role: 'guest', code: 'ABCDE', me: { id: 'y', name: 'Atrasado' }, transport: t2.net.guest(), clock: t2.clock });
    late.start();
    t2.clock.advance(200);
    expect(late.getSnapshot()).toMatchObject({ stage: 'error', error: 'started' });

    const t3 = setup({ guests: 0 });
    const tr = t3.net.guest();
    const seen = [];
    tr.on('connection', (id) => tr.send(id, { ...makeTableMessage(TMSG.HELLO, { id: 'z', name: 'Velho', face: null, version: 0 }), v: TABLE_PROTOCOL + 9 }));
    tr.on('message', (_, msg) => seen.push(msg));
    tr.start();
    t3.clock.advance(300);
    expect(seen.find((m) => m.type === TMSG.FULL)?.payload.reason).toBe('version');
  });

  it('quem sai do saguão libera a cadeira', () => {
    const t = setup({ guests: 2 });
    t.people[0].s.leave();
    t.clock.advance(200);
    expect(t.host.getSnapshot().lobby.seats[1]).toBe(null);
  });
});

describe('mesa online de 2 a 4: a partida', () => {
  it('cada um vê só a própria mão; a partida vai até o pódio e todos veem o mesmo resultado', () => {
    const t = setup({ guests: 2 });
    t.people.forEach((p) => p.s.setReady(true));
    t.host.addBot();
    t.clock.advance(100);
    t.host.startMatch();
    t.clock.advance(100);
    for (const p of t.people) {
      const snap = p.s.getSnapshot();
      expect(snap.stage).toBe('table');
      expect(Object.keys(snap.view.hands)).toEqual([snap.you]);
      expect(snap.view.handCounts.s0).toBe(6);
      expect(snap.view).not.toHaveProperty('boneyard');
      expect(snap.clock.totalMs).toBe(30000);
    }
    playAll(t);
    const final = t.host.getSnapshot().view;
    expect(final.phase).toBe('matchOver');
    for (const p of t.people) {
      const v = p.s.getSnapshot().view;
      expect(v.phase).toBe('matchOver');
      expect(v.winner).toBe(final.winner);
      expect(v.seats.map((s) => s.place)).toEqual(final.seats.map((s) => s.place));
    }
  });

  it('jogada de quem não está na vez é recusada e não muda a mesa', () => {
    const t = setup({ guests: 1 });
    t.people[0].s.setReady(true);
    t.clock.advance(100);
    t.host.startMatch();
    t.clock.advance(100);
    const guest = t.people[0].s;
    const v = guest.getSnapshot().view;
    const notMine = v.turn !== 's1';
    const seq = t.host.getSnapshot().view.seq;
    if (notMine) {
      guest.intent({ type: 'PLAY', tileId: v.hands.s1[0].id, side: 'root' });
      t.clock.advance(100);
      expect(t.host.getSnapshot().view.seq).toBe(seq);
      expect(guest.getSnapshot().notice?.text).toMatch(/mesa mudou/);
    } else {
      t.host.intent({ type: 'PASS' });
      expect(t.host.getSnapshot().view.seq).toBe(seq);
    }
  });

  it('o cronômetro zerou: a jogada automática joga pela cadeira', () => {
    const t = setup({ guests: 1, config: { seats: 2, hearts: 3, turn: 15, batida: 'todos' } });
    t.people[0].s.setReady(true);
    t.clock.advance(100);
    t.host.startMatch();
    t.clock.advance(100);
    const before = t.host.getSnapshot().view;
    t.clock.advance(15100);
    const after = t.host.getSnapshot().view;
    expect(after.seq).toBeGreaterThan(before.seq);
    expect(after.turn === before.turn && after.phase === 'playing').toBe(false);
  });

  it('caiu e voltou dentro de 60 s: a cadeira é dele; não voltou: W.O.', () => {
    const t = setup({ guests: 2, config: { seats: 3, hearts: 5, turn: 30, batida: 'todos' } });
    t.people.forEach((p) => p.s.setReady(true));
    t.clock.advance(100);
    t.host.startMatch();
    t.clock.advance(100);
    const [a, b] = t.people;
    t.net.cut(a.transport, true);
    t.clock.advance(200);
    expect(t.host.getSnapshot().links.s1.lost).toBe(true);
    expect(a.s.getSnapshot().link).toBe('lost');
    t.net.heal(a.transport);
    t.clock.advance(3500);
    expect(a.s.getSnapshot().link).toBe('ok');
    expect(t.host.getSnapshot().links.s1.lost).toBe(false);
    expect(a.s.getSnapshot().you).toBe('s1');
    expect(a.s.getSnapshot().stage).toBe('table');

    t.net.cut(b.transport, true);
    t.clock.advance(TABLE_GRACE_MS + 500);
    const seat = t.host.getSnapshot().view.seats.find((s) => s.id === 's2');
    expect(seat).toMatchObject({ alive: false, hearts: 0 });
    expect(b.s.getSnapshot().stage).toBe('ended');
  });

  it('fim da rodada: começa quando todos tocam em PRÓXIMA RODADA (ou sozinha depois de 25 s)', () => {
    const t = setup({ guests: 1, config: { seats: 2, hearts: 5, turn: 15, batida: 'todos' } });
    t.people[0].s.setReady(true);
    t.clock.advance(100);
    t.host.startMatch();
    // ninguém joga: o relógio joga por todo mundo até a rodada acabar
    for (let i = 0; i < 200 && t.host.getSnapshot().view.phase === 'playing'; i += 1) t.clock.advance(15100);
    expect(t.host.getSnapshot().view.phase).toBe('roundOver');
    const round = t.host.getSnapshot().view.round;
    t.host.nextRound();
    t.clock.advance(100);
    expect(t.host.getSnapshot().view.round).toBe(round);
    expect(t.people[0].s.getSnapshot().ready).toContain('s0');
    t.clock.advance(NEXT_AUTO_MS);
    expect(t.host.getSnapshot().view.round).toBe(round + 1);
  });

  it('o anfitrião saiu: a mesa acaba para todo mundo; revanche volta ao saguão', () => {
    const t = setup({ guests: 1, config: { seats: 2, hearts: 3, turn: 30, batida: 'todos' } });
    t.people[0].s.setReady(true);
    t.clock.advance(100);
    t.host.startMatch();
    t.clock.advance(100);
    playAll(t);
    expect(t.host.getSnapshot().view.phase).toBe('matchOver');
    t.host.rematch();
    t.clock.advance(100);
    expect(t.host.getSnapshot().stage).toBe('lobby');
    expect(t.people[0].s.getSnapshot().stage).toBe('lobby');
    expect(t.host.canStart()).toBe(false);
    t.host.leave();
    t.clock.advance(100);
    expect(t.people[0].s.getSnapshot()).toMatchObject({ stage: 'ended', ended: 'host-left' });
  });
});

describe('mesa online de 2 a 4: regras no saguão', () => {
  it('o anfitrião troca as regras e todo mundo vê; a mesa não encolhe com gente sentada', () => {
    const t = setup({ guests: 2 });
    t.host.setConfig({ hearts: 7, batida: 'pesada', turn: 15 });
    t.clock.advance(100);
    expect(t.people[0].s.getSnapshot().lobby.config).toMatchObject({ hearts: 7, batida: 'pesada', turn: 15, seats: 4 });
    t.host.setConfig({ seats: 2 });
    expect(t.host.getSnapshot().lobby.config.seats).toBe(4);
    t.host.setConfig({ seats: 3 });
    t.clock.advance(100);
    expect(t.people[1].s.getSnapshot().lobby.seats).toHaveLength(3);
  });
});

describe('versão 2.7: duplas e tentos pela rede', () => {
  it('duplas só começam com as 4 cadeiras ocupadas; a partida por tentos vai até a meta com a dupla junta', () => {
    const t = setup({ guests: 2, config: { seats: 4, hearts: 3, turn: 30, batida: 'todos', teams: true, scoring: 'tentos' } });
    t.people.forEach((p) => p.s.setReady(true));
    t.clock.advance(100);
    expect(t.host.getSnapshot().lobby.config).toMatchObject({ teams: true, scoring: 'tentos' });
    // 3 cadeiras ocupadas: não dá para começar as duplas
    expect(t.host.canStart()).toBe(false);
    t.host.addBot();
    t.clock.advance(100);
    expect(t.host.canStart()).toBe(true);
    t.host.startMatch();
    t.clock.advance(100);
    const v0 = t.people[0].s.getSnapshot().view;
    expect(v0.rules).toMatchObject({ teams: true, scoring: 'tentos' });
    expect(v0.seats.map((s) => s.team)).toEqual(['A', 'B', 'A', 'B']);
    playAll(t);
    const final = t.host.getSnapshot().view;
    expect(final.phase).toBe('matchOver');
    expect(final.winners).toHaveLength(2);
    const [a, b] = final.winners.map((id) => final.seats.find((s) => s.id === id));
    expect(a.team).toBe(b.team);
    expect(a.tentos).toBeGreaterThanOrEqual(3);
    for (const p of t.people) expect(p.s.getSnapshot().view.winners).toEqual(final.winners);
  });

  it('com 3 cadeiras, o pedido de duplas não vale', () => {
    const t = setup({ guests: 1, config: { seats: 3, hearts: 3, turn: 30, batida: 'todos', teams: true } });
    expect(t.host.getSnapshot().lobby.config.teams).toBe(false);
  });
});
