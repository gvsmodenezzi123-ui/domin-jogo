import { describe, expect, it } from 'vitest';
import { fakeClock } from '../../pvp/__tests__/kit.js';
import { createTableSession } from '../tableSession.js';
import { TMSG, makeTableMessage, validateTableMessage } from '../tableProtocol.js';
import { EMOTES, EMOTE_COOLDOWN_MS, botReactions, emoteReady, isEmote, pushEmote } from '../emotes.js';
import { createStarNetwork } from './starKit.js';

function setup({ guests = 2, seats = 5 } = {}) {
  const clock = fakeClock();
  const net = createStarNetwork({ clock });
  let r = 7;
  const random = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  const host = createTableSession({ role: 'host', code: 'ABCDE', me: { id: 'h', name: 'Ana', face: 'marquinhos' }, transport: net.host(), clock, config: { seats, hearts: 3, turn: 30, batida: 'todos' }, random });
  host.start();
  clock.advance(50);
  const people = [];
  for (let i = 0; i < guests; i += 1) {
    const s = createTableSession({ role: 'guest', code: 'ABCDE', me: { id: `g${i}`, name: `Convidado ${i + 1}`, face: null }, transport: net.guest(), clock });
    s.start();
    people.push(s);
    clock.advance(100);
  }
  return { clock, net, host, people };
}

describe('versão 2.33: a roda de 5 e os emotes', () => {
  it('seis emotes; cada cadeira mostra só o último; o intervalo mínimo entre dois', () => {
    expect(EMOTES).toHaveLength(6);
    expect(isEmote('risada')).toBe(true);
    expect(isEmote('xingamento')).toBe(false);
    let feed = pushEmote({}, 's1', 'risada', 1);
    feed = pushEmote(feed, 's1', 'bravo', 2);
    feed = pushEmote(feed, 's2', 'nada', 3);
    expect(feed).toEqual({ s1: { id: 'bravo', key: 2 } });
    expect(emoteReady(null, 0)).toBe(true);
    expect(emoteReady(1000, 1000 + EMOTE_COOLDOWN_MS - 1)).toBe(false);
    expect(emoteReady(1000, 1000 + EMOTE_COOLDOWN_MS)).toBe(true);
  });

  it('os bots reagem no fim da rodada, no máximo dois, e só os bots', () => {
    const seats = [{ id: 's0' }, { id: 's1', bot: true }, { id: 's2', bot: true }, { id: 's3', bot: true }];
    const result = { winners: ['s1', 's0'], damage: { s2: 1, s3: 1, s0: 1 } };
    const all = botReactions(result, seats, () => 0);
    expect(all.length).toBe(2);
    for (const r of all) expect(['s1', 's2', 's3']).toContain(r.seat);
    expect(botReactions(result, seats, () => 0.99)).toEqual([]);
    expect(botReactions(null, seats)).toEqual([]);
  });

  it('o protocolo aceita o emote só com um dos seis e a 5ª cadeira no saguão', () => {
    expect(validateTableMessage(makeTableMessage(TMSG.EMOTE, { emote: 'fogo' }))).toBe(true);
    expect(validateTableMessage(makeTableMessage(TMSG.EMOTE, { emote: 'fogo', seat: 's4' }))).toBe(true);
    expect(validateTableMessage(makeTableMessage(TMSG.EMOTE, { emote: '<script>' }))).toBe(false);
    expect(validateTableMessage(makeTableMessage(TMSG.SEAT, { place: 4 }))).toBe(true);
    expect(validateTableMessage(makeTableMessage(TMSG.SEAT, { place: 5 }))).toBe(false);
  });

  it('na roda online, o emote de um chega em todos (uma vez), e o seguinte só depois do intervalo', () => {
    const t = setup({ guests: 2 });
    t.people.forEach((p) => p.setReady(true));
    t.host.addBot();
    t.host.addBot();
    t.clock.advance(100);
    t.host.startMatch();
    t.clock.advance(200);
    expect(t.host.getSnapshot().view.seats).toHaveLength(5);
    const me = t.people[0].getSnapshot().you;
    t.people[0].emote('joinha');
    t.clock.advance(200);
    for (const s of [t.host, ...t.people]) expect(s.getSnapshot().emotes[me]?.id).toBe('joinha');
    const key = t.people[1].getSnapshot().emotes[me].key;
    // cedo demais: não sai
    t.people[0].emote('bravo');
    t.clock.advance(200);
    expect(t.people[1].getSnapshot().emotes[me]).toMatchObject({ id: 'joinha', key });
    t.clock.advance(EMOTE_COOLDOWN_MS);
    t.host.emote('fogo');
    t.people[0].emote('risada');
    t.clock.advance(200);
    expect(t.people[1].getSnapshot().emotes.s0?.id).toBe('fogo');
    expect(t.people[1].getSnapshot().emotes[me]?.id).toBe('risada');
  });
});
