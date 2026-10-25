import { describe, expect, it } from 'vitest';
import { RELICS } from '../../data/relics.js';
import { createInitialState, gameReducer } from '../../engine/gameReducer.js';
import { buildShop } from '../../engine/shop.js';
import { buildMarket } from '../../engine/blackMarket.js';
import { DEFAULT_ROOM, ROOM_RARITY_CHANCES, describeRoom, isRoom, sanitizeRoom } from '../../data/pvpRoom.js';
import { actorOf, applyIntent, autoIntent, buildDuel, profileOf, roundOutcome } from '../duelHost.js';
import { pvpNewRun, statusOf } from '../ladder.js';
import { mirrorState, mirrorText, redactFor, tileCount } from '../mirror.js';
import { MSG, ROOM_ALPHABET, formatRoomId, generateRoomCode, makeMessage, maskRoomInput, parseRoomInput, peerIdOf, validateMessage } from '../protocol.js';

const run = (maleta = 'classica', seed = 5, room = DEFAULT_ROOM) => gameReducer(createInitialState(), pvpNewRun({ seed, seedCode: 'BUX-PVP', maleta, room }));

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
      makeMessage(MSG.RUN_START, { seed: 9, seedCode: 'BUX-1', room: DEFAULT_ROOM }),
      makeMessage(MSG.HELLO, { id: 'a', name: 'Ana', version: 2, rejoin: false, room: DEFAULT_ROOM }),
    ];
    for (const msg of ok) expect(validateMessage(msg), msg.type).toBe(true);
    expect(validateMessage(makeMessage(MSG.PLAY_TILE, { duelId: 1, tile: { id: '3-5' }, targetEnd: 'left' }))).toBe(false);
    expect(validateMessage(makeMessage(MSG.PASS_TURN, { duelId: 1 }))).toBe(false);
    expect(validateMessage({ type: 'HACK', v: 1, payload: {} })).toBe(false);
    // a configuração da mesa só passa inteira e com valores que existem
    expect(validateMessage(makeMessage(MSG.RUN_START, { seed: 9, room: { ...DEFAULT_ROOM, coins: 99999 } }))).toBe(false);
    expect(validateMessage(makeMessage(MSG.RUN_START, { seed: 9 }))).toBe(false);
    // versão diferente: o HELLO e o aviso de mesa recusada passam (para os dois saberem); o resto não
    expect(validateMessage({ type: MSG.ROOM_FULL, v: 1, payload: { reason: 'version' } })).toBe(true);
    expect(validateMessage({ type: MSG.PASS_TURN, v: 1, payload: { duelId: 1, paid: true } })).toBe(false);
    expect(validateMessage(null)).toBe(false);
    // tudo é JSON puro (vai pelo DataChannel)
    for (const msg of ok) expect(JSON.parse(JSON.stringify(msg))).toEqual(msg);
  });
});

describe('Patch PvP: a configuração da mesa e a rota', () => {
  it('padrão: $100, 5 corações, todas as raridades, 30 s; valores fora da lista voltam ao padrão', () => {
    expect(DEFAULT_ROOM).toEqual({ coins: 100, hearts: 5, rarity: 'todas', turn: 30 });
    expect(sanitizeRoom({ coins: 300, hearts: 9, rarity: 'lendarios', turn: 15 })).toEqual({ coins: 300, hearts: 9, rarity: 'lendarios', turn: 15 });
    expect(sanitizeRoom({ coins: 7, hearts: 'x', rarity: 'ouro' })).toEqual(DEFAULT_ROOM);
    expect(isRoom(DEFAULT_ROOM)).toBe(true);
    expect(isRoom({ ...DEFAULT_ROOM, turn: 31 })).toBe(false);
    expect(describeRoom(DEFAULT_ROOM)).toBe('$100 · 5♥ · TALISMÃS: TODAS · 30 S POR JOGADA');
  });

  it('a run começa com as moedas e os corações da mesa, sem melhorias, todos os talismãs liberados', () => {
    const r = run('bicheiro');
    expect(r.pvp).toEqual({ run: true, rarity: 'todas' });
    expect(r.coins.player).toBe(100);
    expect(r.hearts.player).toBe(5);
    expect(r.maxHearts.player).toBe(5);
    expect(r.perks).toEqual([]);
    expect(r.relics.player).toContain('moedaFurada');
    expect(statusOf(r)).toMatchObject({ where: 'shop', hearts: 5, coins: 100, maleta: 'bicheiro' });
    const big = run('classica', 5, { coins: 300, hearts: 9, rarity: 'raros', turn: 60 });
    expect(big.coins.player).toBe(300);
    expect(big.maxHearts.player).toBe(9);
  });

  it('a rota abre a loja e o Mercado Negro direto (só no online)', () => {
    const r = run();
    const shop = gameReducer(r, { type: 'PVP_OPEN_STOP', kind: 'shop' });
    expect(shop.phase).toBe('shop');
    expect(shop.shop.relics).toHaveLength(3);
    const back = gameReducer(shop, { type: 'LEAVE_SHOP' });
    expect(back.phase).toBe('map');
    const market = gameReducer(back, { type: 'PVP_OPEN_STOP', kind: 'black' });
    expect(market.phase).toBe('blackMarket');
    expect(market.market.offers.length).toBeGreaterThan(0);
    // fora do online (e fora do "mapa") o reducer ignora
    const solo = gameReducer(createInitialState(), { type: 'NEW_RUN', seed: 1, mode: 'normal', maleta: 'classica' });
    expect(gameReducer(solo, { type: 'PVP_OPEN_STOP', kind: 'shop' })).toBe(solo);
    expect(gameReducer(shop, { type: 'PVP_OPEN_STOP', kind: 'black' })).toBe(shop);
  });

  it('a raridade da mesa manda nos talismãs da loja (as vitrines saem iguais para os dois)', () => {
    const rarityOf = (id) => RELICS[id].rarity;
    for (const rarity of ['comuns', 'raros', 'lendarios']) {
      const allowed = Object.entries(ROOM_RARITY_CHANCES[rarity]).filter(([, w]) => w > 0).map(([k]) => k);
      for (let seed = 1; seed < 25; seed += 1) {
        const r = run('classica', seed, { ...DEFAULT_ROOM, rarity });
        for (let n = 0; n < 3; n += 1) for (const o of buildShop(r, n).relics) expect(allowed, `${rarity}/${o.id}`).toContain(rarityOf(o.id));
      }
    }
    // mesma semente, mesma vitrine nos dois aparelhos
    expect(buildShop(run('classica', 8), 0)).toEqual(buildShop(run('bicheiro', 8), 0));
  });

  it('loja e beco do online não vendem os talismãs que só servem contra a IA', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const r = { ...run('classica', seed), coins: { player: 999, tioZe: 0 } };
      for (let n = 0; n < 4; n += 1) {
        const offers = buildShop(r, n).relics.map((o) => o.id);
        expect(offers).not.toContain('relogio');
        expect(offers).not.toContain('oculosFundo');
        expect(offers).not.toContain('carteira'); // com as moedas da mesa ela zerava o outro numa batida
      }
      expect(buildMarket(r).offers.map((o) => o.id)).not.toContain('dedoCadaver');
    }
  });
});

describe('Patch PvP: a mesa', () => {
  it('cada cadeira senta com o perfil da própria run (corações, moedas, talismãs, baralho, maleta)', () => {
    const host = { ...profileOf(run('seca')), hearts: 4, coins: 17, relics: ['dedal'] };
    const guest = { ...profileOf(run('borracharia')), hearts: 3 };
    const s = duel({ host, guest });
    expect(s.phase).toBe('playing');
    expect(s.pvp.maletas).toEqual({ player: 'seca', tioZe: 'borracharia' });
    expect(s.hearts).toEqual({ player: 4, tioZe: 3 });
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
    if (out.winner) expect(out.hearts[out.loser]).toBeLessThan(s.maxHearts[out.loser]);
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
