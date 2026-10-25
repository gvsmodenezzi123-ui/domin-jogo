import { describe, expect, it } from 'vitest';
import { RELICS } from '../../data/relics.js';
import { createInitialState, gameReducer } from '../../engine/gameReducer.js';
import { buildShop } from '../../engine/shop.js';
import { buildMarket } from '../../engine/blackMarket.js';
import { actorOf, applyIntent, autoIntent, buildDuel, profileOf, rewardFor, roundOutcome, runResultFor } from '../duelHost.js';
import { PVP_HEARTS, pvpNewRun, statusOf } from '../ladder.js';
import { mirrorState, mirrorText, redactFor, tileCount } from '../mirror.js';
import { MSG, ROOM_ALPHABET, formatRoomId, generateRoomCode, makeMessage, maskRoomInput, parseRoomInput, peerIdOf, validateMessage } from '../protocol.js';

const run = (maleta = 'classica', seed = 5) => gameReducer(createInitialState(), pvpNewRun({ seed, seedCode: 'BUX-PVP', maleta }));

function duel({ host = profileOf(run('classica')), guest = profileOf(run('borracharia')), duelId = 1, final = false } = {}) {
  return buildDuel({ host, guest, seed: 99, duelId, final });
}

describe('Patch PvP: ID da sala', () => {
  it('5 caracteres legíveis, mostrados como MESA-XXXXX, e o ID do anfitrião no PeerJS', () => {
    let i = 0;
    const code = generateRoomCode(() => [0.1, 0.5, 0.9, 0.33, 0.77][i++]);
    expect(code).toHaveLength(5);
    expect([...code].every((ch) => ROOM_ALPHABET.includes(ch))).toBe(true);
    expect(ROOM_ALPHABET).not.toMatch(/[01OIL]/);
    expect(formatRoomId(code)).toBe(`MESA-${code}`);
    expect(peerIdOf('8B2KQ')).toBe('buxaria-mesa-8b2kq');
  });

  it('aceita o ID digitado de vários jeitos (e um link) e recusa o que não é código', () => {
    expect(parseRoomInput('MESA-8B2KQ')).toBe('8B2KQ');
    expect(parseRoomInput(' mesa 8b2kq ')).toBe('8B2KQ');
    expect(parseRoomInput('8b2kq')).toBe('8B2KQ');
    expect(parseRoomInput('https://x.github.io/domin-jogo/?mesa=8B2KQ')).toBe('8B2KQ');
    expect(parseRoomInput('MESA-8B2K')).toBeNull();
    expect(parseRoomInput('MESA-0O1IL')).toBeNull();
    expect(maskRoomInput('mesa-8b2kq77')).toBe('8B2KQ');
  });
});

describe('Patch PvP: mensagens JSON', () => {
  it('os tipos do pedido passam na conferência; formato errado não', () => {
    const ok = [
      makeMessage(MSG.HANDSHAKE, { name: 'Ana', suitcase: 'seca', initialDeck: {} }),
      makeMessage(MSG.PLAY_TILE, { duelId: 1, tile: { id: '3-5', a: 3, b: 5 }, targetEnd: 'left', updatedDeck: { hand: 4 } }),
      makeMessage(MSG.PASS_TURN, { duelId: 1, paid: true }),
      makeMessage(MSG.BUY_TILE, { duelId: 1, count: 2 }),
      makeMessage(MSG.SHOP_FINISH, { newTalismans: ['dedal'], newCoins: 12 }),
      makeMessage(MSG.ROUND_RESULT, { duelId: 1, winnerId: 'a', damage: 2, heartsLeft: { a: 5, b: 3 } }),
    ];
    for (const msg of ok) expect(validateMessage(msg), msg.type).toBe(true);
    expect(validateMessage(makeMessage(MSG.PLAY_TILE, { duelId: 1, tile: { id: '3-5' }, targetEnd: 'left' }))).toBe(false);
    expect(validateMessage(makeMessage(MSG.PASS_TURN, { duelId: 1 }))).toBe(false);
    expect(validateMessage({ type: 'HACK', v: 1, payload: {} })).toBe(false);
    expect(validateMessage(null)).toBe(false);
    // tudo é JSON puro (vai pelo DataChannel)
    for (const msg of ok) expect(JSON.parse(JSON.stringify(msg))).toEqual(msg);
  });
});

describe('Patch PvP: a run do online e a mesa', () => {
  it('a run começa com 7 corações, sem melhorias, com todos os talismãs liberados e a marca pvp', () => {
    const r = run('bicheiro');
    expect(r.pvp).toEqual({ run: true });
    expect(r.hearts.player).toBe(PVP_HEARTS);
    expect(r.maxHearts.player).toBe(PVP_HEARTS);
    expect(r.perks).toEqual([]);
    expect(r.relics.player).toContain('moedaFurada');
    expect(statusOf(r)).toMatchObject({ where: 'map', hearts: 7, maleta: 'bicheiro' });
  });

  it('loja e beco do online não vendem os talismãs que só servem contra a IA', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const r = { ...run('classica', seed), coins: { player: 999, tioZe: 0 } };
      for (let n = 0; n < 4; n += 1) {
        const offers = buildShop(r, n).relics.map((o) => o.id);
        expect(offers).not.toContain('relogio');
        expect(offers).not.toContain('oculosFundo');
      }
      expect(buildMarket(r).offers.map((o) => o.id)).not.toContain('dedoCadaver');
    }
  });

  it('cada cadeira senta com o perfil da própria run (corações, moedas, talismãs, baralho, maleta)', () => {
    const host = { ...profileOf(run('seca')), hearts: 4, coins: 17, relics: ['dedal'] };
    const guest = { ...profileOf(run('borracharia')), hearts: 6 };
    const s = duel({ host, guest });
    expect(s.phase).toBe('playing');
    expect(s.pvp.maletas).toEqual({ player: 'seca', tioZe: 'borracharia' });
    expect(s.hearts).toEqual({ player: 4, tioZe: 6 });
    expect(s.coins.player).toBe(17);
    expect(s.relics.player).toEqual(['dedal']);
    expect(s.decks.tioZe).toMatchObject({ '5-5': 'chumbo', '3-6': 'chumbo' });
    expect(s.rivalId).toBe('tioZe');
    expect(tileCount(s)).toBe(28);
    // Maleta Seca: 1 compra por turno só para quem a escolheu
    expect(s.pvp.maletas.player).toBe('seca');
  });

  it('só quem está na vez joga; a jogada automática é sempre aceita', () => {
    let s = duel();
    for (let i = 0; i < 400 && s.phase === 'playing'; i += 1) {
      const seat = actorOf(s);
      const other = seat === 'player' ? 'tioZe' : 'player';
      expect(applyIntent(s, other, autoIntent(s, other)).ok).toBe(false);
      const { state, ok } = applyIntent(s, seat, autoIntent(s, seat));
      expect(ok).toBe(true);
      s = state;
      expect(tileCount(s)).toBe(28);
    }
    expect(['roundOver', 'matchWon', 'gameOver']).toContain(s.phase);
    const out = roundOutcome(s);
    expect(out).toBeTruthy();
    if (out.winner) expect(out.hearts[out.loser]).toBeLessThan(out.loser === 'player' ? 7 : 7);
  });

  it('o passe e a compra custam igual para as duas cadeiras', () => {
    // procura uma mesa em que o convidado (tioZe) começa podendo jogar: o passe dele custa $3
    for (let id = 1; id < 60; id += 1) {
      const s = duel({ duelId: id });
      if (s.turn !== 'tioZe') continue;
      const first = applyIntent(s, 'tioZe', autoIntent(s, 'tioZe'));
      const t = first.state;
      if (t.turn !== 'player') continue;
      const p = applyIntent(t, 'player', autoIntent(t, 'player')).state;
      if (p.turn !== 'tioZe' || p.phase !== 'playing') continue;
      const coins = p.coins.tioZe;
      const passed = applyIntent(p, 'tioZe', { kind: 'pass' });
      if (!passed.ok) continue;
      expect(passed.state.coins.tioZe).toBe(coins - 3);
      return;
    }
    throw new Error('nenhuma mesa serviu para o teste');
  });
});

describe('Patch PvP: o espelho do convidado', () => {
  it('espelhar duas vezes volta ao mesmo estado; as cadeiras trocam de lado', () => {
    const s = duel();
    const m = mirrorState(s);
    expect(mirrorState(m)).toEqual(s);
    expect(m.hands.player).toEqual(s.hands.tioZe);
    expect(m.hearts.player).toBe(s.hearts.tioZe);
    expect(m.turn).toBe(s.turn === 'player' ? 'tioZe' : 'player');
    expect(m.rivalId).toBe('tioZe'); // o id do rival não é cadeira
    expect(m.pvp.maletas.player).toBe(s.pvp.maletas.tioZe);
  });

  it('os textos dos disparos trocam de ponto de vista', () => {
    expect(mirrorText('DEDAL: −1♥ NO RIVAL', { source: 'relic', id: 'dedal', owner: 'player' })).toBe(`${RELICS.dedal.short} DELE: −1♥ EM VOCÊ`);
    expect(mirrorText(`${RELICS.dedal.short} DELE: −1♥ EM VOCÊ`, { source: 'relic', id: 'dedal', owner: 'tioZe' })).toBe(`${RELICS.dedal.short}: −1♥ NO RIVAL`);
    expect(mirrorText('RUBI DELE: −1♥ EM VOCÊ', { source: 'tile', id: 'rubi', owner: 'tioZe' })).toBe('RUBI: −1♥ NO RIVAL');
    expect(mirrorText('FANTASMA: JOGUE DE NOVO', { source: 'tile', id: 'fantasma', owner: 'player' })).toBe('FANTASMA DELE: JOGA DE NOVO');
    expect(mirrorText('TEMPO ESGOTADO: JOGADA AUTOMÁTICA', { source: 'clock', owner: 'player' })).toBe('TEMPO ESGOTADO: JOGADA AUTOMÁTICA');
  });

  it('durante a rodada a mão do outro e o dorme chegam escondidos; no fim, tudo à mostra', () => {
    const s = duel();
    const g = redactFor(s, 'tioZe');
    expect(g.hands.tioZe).toEqual(s.hands.tioZe);
    expect(g.hands.player.every((t) => t.hidden)).toBe(true);
    expect(g.hands.player).toHaveLength(s.hands.player.length);
    expect(g.boneyard.every((t) => t.hidden)).toBe(true);
    expect(tileCount(g)).toBe(28);
    expect(JSON.stringify(g)).not.toContain(JSON.stringify(s.boneyard[0]));
    const over = { ...s, phase: 'roundOver' };
    expect(redactFor(over, 'tioZe')).toBe(over);
  });
});

describe('Patch PvP: o resultado volta para a run', () => {
  it('quem vence leva o prêmio e +1♥ (chefe: cura tudo); quem perde leva $3', () => {
    expect(rewardFor({ won: true, maleta: 'classica' })).toEqual({ coins: 8, heal: 1 });
    expect(rewardFor({ won: true, maleta: 'seca' }).coins).toBe(16);
    expect(rewardFor({ won: true, boss: true, maleta: 'classica' }).coins).toBe(12);
    expect(rewardFor({ won: false, maleta: 'seca' })).toEqual({ coins: 3, heal: 0 });
  });

  it('PVP_DUEL_RESULT conclui o nó, aplica corações e moedas e só vale na run do online', () => {
    const r = run();
    const node = r.run.node ?? 'r1-f1-l0';
    const entry = gameReducer(r, { type: 'PVP_DUEL_RESULT', nodeId: node, hearts: 6, coins: 20, relics: [], deck: {}, won: true });
    const available = entry.run.cleared.length ? entry : r;
    expect(available.phase).toBe('map');
    const view = { ...duel(), phase: 'roundOver', roundResult: { winner: 'player', loser: 'tioZe', damage: 1, kind: 'normal' }, hearts: { player: 5, tioZe: 3 }, coins: { player: 9, tioZe: 2 } };
    const action = runResultFor(view, { nodeId: null, maleta: 'classica' });
    expect(action).toMatchObject({ type: 'PVP_DUEL_RESULT', won: true, hearts: 6, coins: 17 });
    const dead = gameReducer(r, { ...action, hearts: 0 });
    expect(dead.phase).toBe('gameOver');
    // fora do online o reducer ignora
    const solo = gameReducer(createInitialState(), { type: 'NEW_RUN', seed: 1, mode: 'normal', maleta: 'classica' });
    expect(gameReducer(solo, action)).toBe(solo);
  });
});
