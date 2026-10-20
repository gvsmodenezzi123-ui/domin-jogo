import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction, scoreMove } from '../../ai/tioZeAI.js';
import { RELICS, RELIC_IDS, RELIC_SLOTS } from '../../data/relics.js';
import { RIVALS, RIVAL_IDS, RIVAL_POOL, pickNextRival } from '../../data/rivals.js';
import {
  FULL_SET,
  MAX_HEARTS,
  STARTING_COINS,
  boardTilesInOrder,
  createEmptyBoard,
  createSeededRng,
  makeTile,
  placeTile,
  shuffle,
} from '../dominoLogic.js';
import { MATCH_PRIZE, createInitialState, gameReducer } from '../gameReducer.js';
import { canUndo } from '../powers.js';
import { REROLL_COST, relicBuyBlock, sellPriceOf } from '../shop.js';

const t = (a, b) => makeTile(a, b);
const dev = (s, op, extra = {}) => gameReducer(s, { type: 'DEV', op, ...extra });

function newRun(seed = 42, extra = {}) {
  return gameReducer(createInitialState(), {
    type: 'START_DUEL',
    deck: shuffle(FULL_SET, createSeededRng(seed)),
    seed,
    ...extra,
  });
}

/** Vence a partida na hora (painel DEV) e entra na loja. */
function toShop(state) {
  const won = dev(state, 'winMatch');
  expect(won.phase).toBe('matchWon');
  return gameReducer(won, { type: 'OPEN_SHOP' });
}

/** Baralho com `mine` na sua mão e `theirs` na do rival (completando com o resto); sobra no dorme. */
function deckWith(mine, theirs = []) {
  const used = new Set([...mine, ...theirs].map((x) => x.id));
  const rest = FULL_SET.filter((x) => !used.has(x.id));
  const fillMine = 7 - mine.length;
  const fillTheirs = 7 - theirs.length;
  return [
    ...mine,
    ...rest.slice(0, fillMine),
    ...theirs,
    ...rest.slice(fillMine, fillMine + fillTheirs),
    ...rest.slice(fillMine + fillTheirs),
  ];
}

describe('início da run', () => {
  it('começa limpa: baralho 100% comum, sem talismãs, contra o Tio Zé', () => {
    const s = newRun();
    expect(s.relics.player).toEqual([]);
    expect(s.decks.player).toEqual({});
    expect([...s.hands.player, ...s.hands.tioZe].some((x) => x.enhancement)).toBe(false);
    expect(s.rivalId).toBe('tioZe');
    expect(s.run.match).toBe(1);
    expect(s.hearts).toEqual({ player: MAX_HEARTS, tioZe: RIVALS.tioZe.hearts });
  });
});

describe('partida → loja → próximo rival', () => {
  it('vencer a partida paga o prêmio e abre a loja com 3 talismãs e 2 peças de grife', () => {
    const s = newRun();
    const won = dev(s, 'winMatch');
    expect(won.coins.player).toBe(s.coins.player + MATCH_PRIZE);
    expect(won.roundResult.prize).toBe(MATCH_PRIZE);
    const shop = gameReducer(won, { type: 'OPEN_SHOP' });
    expect(shop.phase).toBe('shop');
    expect(shop.shop.relics).toHaveLength(3);
    expect(new Set(shop.shop.relics.map((o) => o.id)).size).toBe(3);
    expect(shop.shop.tiles).toHaveLength(2);
    for (const offer of shop.shop.tiles) {
      expect(FULL_SET.some((x) => x.id === offer.tileId)).toBe(true);
      expect(offer.price).toBeGreaterThan(0);
    }
    expect(RIVAL_POOL).toContain(shop.shop.nextRivalId);
  });

  it('comprar talismã desconta as moedas e ocupa um slot; o item some da vitrine', () => {
    let s = toShop(newRun());
    s = dev(s, 'addCoins', { amount: 40 });
    const offer = s.shop.relics[0];
    const coins = s.coins.player;
    s = gameReducer(s, { type: 'SHOP_BUY_RELIC', index: 0 });
    expect(s.coins.player).toBe(coins - offer.price);
    expect(s.relics.player).toEqual([offer.id]);
    expect(s.shop.relics[0].sold).toBe(true);
    expect(gameReducer(s, { type: 'SHOP_BUY_RELIC', index: 0 })).toBe(s);
  });

  it('hotbar cheia bloqueia a compra até vender um talismã', () => {
    let s = toShop(newRun(7, { relics: RELIC_IDS.slice(0, RELIC_SLOTS) }));
    s = dev(s, 'addCoins', { amount: 60 });
    expect(relicBuyBlock(s, s.shop.relics[0])).toBe('full');
    expect(gameReducer(s, { type: 'SHOP_BUY_RELIC', index: 0 })).toBe(s);
    const sold = RELIC_IDS[0];
    const coins = s.coins.player;
    s = gameReducer(s, { type: 'SHOP_SELL_RELIC', id: sold });
    expect(s.relics.player).not.toContain(sold);
    expect(s.coins.player).toBe(coins + sellPriceOf(sold));
    expect(relicBuyBlock(s, s.shop.relics[0])).toBeNull();
  });

  it('revenda paga metade do preço-base da raridade', () => {
    const byRarity = Object.fromEntries(RELIC_IDS.map((id) => [RELICS[id].rarity, sellPriceOf(id)]));
    expect(byRarity).toEqual({ comum: 2, raro: 4, lendario: 7, mitico: 10 });
  });

  it('reembaralhar custa $3 e troca a vitrine; sem dinheiro, não deixa', () => {
    let s = toShop(newRun(11));
    s = dev(s, 'addCoins', { amount: 30 });
    const before = s.shop;
    const coins = s.coins.player;
    s = gameReducer(s, { type: 'SHOP_REROLL' });
    expect(s.coins.player).toBe(coins - REROLL_COST);
    expect(s.shop.rerolls).toBe(1);
    expect(s.shop.nextRivalId).toBe(before.nextRivalId);
    const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
    expect(changed(before.relics, s.shop.relics) || changed(before.tiles, s.shop.tiles)).toBe(true);
    const broke = { ...s, coins: { ...s.coins, player: 2 } };
    expect(gameReducer(broke, { type: 'SHOP_REROLL' })).toBe(broke);
  });

  it('a peça de grife SUBSTITUI a comum no seu baralho (continua com 28) e chega aprimorada na sua mão', () => {
    let s = toShop(newRun(5));
    s = dev(s, 'addCoins', { amount: 40 });
    const offer = s.shop.tiles[0];
    s = gameReducer(s, { type: 'SHOP_BUY_TILE', index: 0 });
    expect(s.decks.player).toEqual({ [offer.tileId]: offer.enhancement });
    expect(s.shop.tiles[0].sold).toBe(true);

    const [a, b] = offer.tileId.split('-').map(Number);
    const tile = t(a, b);
    // próxima partida: a pedra cai na sua mão → vem aprimorada
    let m = gameReducer(s, { type: 'NEXT_MATCH', deck: deckWith([tile]) });
    const ids = [...m.hands.player, ...m.hands.tioZe, ...m.boneyard].map((x) => x.id);
    expect(ids).toHaveLength(28);
    expect(new Set(ids).size).toBe(28);
    expect(m.hands.player.find((x) => x.id === offer.tileId).enhancement).toBe(offer.enhancement);
    // a mesma pedra na mão do rival é a comum dele
    m = dev(m, 'forceTranca');
    if (m.phase === 'roundOver') {
      const r = gameReducer(m, { type: 'NEXT_ROUND', deck: deckWith([], [tile]) });
      expect(r.hands.tioZe.find((x) => x.id === offer.tileId).enhancement).toBeUndefined();
    }
  });

  it('comprar do dorme também traz a sua versão aprimorada', () => {
    let s = newRun(3, { playerDeck: { '2-5': 'ouro' } });
    s = {
      ...s,
      board: placeTile(createEmptyBoard(), t(1, 1), 'root'),
      boneyard: [t(2, 5), ...s.boneyard.filter((x) => x.id !== '2-5')],
      hands: { player: s.hands.player.filter((x) => x.id !== '2-5' && x.id !== '1-1'), tioZe: s.hands.tioZe.filter((x) => x.id !== '2-5' && x.id !== '1-1') },
      turn: 'player',
      openingTileId: null,
    };
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.hands.player.at(-1)).toMatchObject({ id: '2-5', enhancement: 'ouro' });
  });

  it('próximo adversário: rival da vitrine, corações cheios, moedas e talismãs mantidos', () => {
    let s = toShop(newRun(9));
    s = dev(s, 'addCoins', { amount: 40 });
    s = gameReducer(s, { type: 'SHOP_BUY_RELIC', index: 0 });
    const relic = s.relics.player[0];
    const coins = s.coins.player;
    const rivalId = s.shop.nextRivalId;
    const m = gameReducer(s, { type: 'NEXT_MATCH', deck: shuffle(FULL_SET, createSeededRng(1)) });
    expect(m.phase).toBe('playing');
    expect(m.run.match).toBe(2);
    expect(m.rivalId).toBe(rivalId);
    expect(m.relics.player).toEqual([relic]);
    expect(m.relics.tioZe).toEqual(RIVALS[rivalId].relics);
    expect(m.coins.player).toBe(coins);
    expect(m.hearts).toEqual({ player: MAX_HEARTS, tioZe: RIVALS[rivalId].hearts });
    expect(m.shop).toBeNull();
  });

  it('perder a partida acaba a run', () => {
    let s = newRun();
    s = { ...s, hearts: { ...s.hearts, player: 1 } };
    s = dev(s, 'forceTranca');
    if (s.roundResult.winner === 'tioZe') expect(s.phase).toBe('gameOver');
    const lost = gameReducer({ ...newRun(), hearts: { player: 0, tioZe: 3 } }, { type: 'DEV', op: 'damageTioZe' });
    expect(lost.phase).toBe('gameOver');
    expect(lost.duelWinner).toBe('tioZe');
  });

  it('vender só funciona na loja', () => {
    const s = newRun(1, { relics: ['caneca'] });
    expect(gameReducer(s, { type: 'SHOP_SELL_RELIC', id: 'caneca' })).toBe(s);
  });
});

describe('rivais', () => {
  it('6 rivais (Tio Zé + 5 da galeria) com retrato 16x16 em 4 humores', () => {
    expect(RIVAL_IDS).toEqual(['tioZe', 'arlindo', 'neide', 'marcao', 'tiao', 'beto']);
    expect(RIVAL_POOL).toEqual(['arlindo', 'neide', 'marcao', 'tiao', 'beto']);
    for (const id of RIVAL_IDS) {
      const rival = RIVALS[id];
      for (const mood of ['idle', 'thinking', 'smug', 'hurt']) {
        const rows = rival.faces[mood];
        expect(rows, `${id}.${mood}`).toHaveLength(16);
        for (const row of rows) {
          expect(row, `${id}.${mood}: ${row}`).toHaveLength(16);
          for (const ch of row) if (ch !== '.') expect(rival.palette[ch], `${id}: cor '${ch}'`).toBeTruthy();
        }
      }
      for (const relic of rival.relics) expect(RELICS[relic]).toBeTruthy();
    }
    expect(RIVALS.arlindo.relics).toEqual(['chaveDeFenda']);
    expect(RIVALS.neide.relics).toEqual(['dedal']);
    expect(RIVALS.marcao.relics).toEqual(['cinzeiro']);
    expect(RIVALS.tiao.hearts).toBe(5);
    expect(Object.values(RIVALS.tiao.deck)).toEqual(['chumbo']);
    expect(RIVALS.beto.relics).toEqual(['anel']);
    expect(RIVALS.beto.rarity).toBe('mitico');
  });

  it('o sorteio não repete o último rival e o Beto Cigano é raro', () => {
    const rng = createSeededRng(99);
    const count = {};
    let last = 'tioZe';
    for (let i = 0; i < 2000; i += 1) {
      const id = pickNextRival(rng, last);
      expect(id).not.toBe(last);
      count[id] = (count[id] ?? 0) + 1;
      last = id;
    }
    expect(count.tioZe).toBeUndefined();
    expect(count.beto).toBeLessThan(count.arlindo / 2);
  });

  it('estilos: Seu Arlindo solta bucha cedo; Marcão pressiona as pontas que você não tem', () => {
    let s = newRun(4, { rivalId: 'arlindo' });
    s = {
      ...s,
      board: placeTile(createEmptyBoard(), t(3, 4), 'root'),
      hands: { player: [t(0, 0), t(0, 1)], tioZe: [t(4, 4), t(3, 5), t(1, 1)] },
      turn: 'tioZe',
      openingTileId: null,
    };
    const arlindo = buildTioZeView(s, 'tioZe');
    const tioZe = buildTioZeView({ ...s, rivalId: 'tioZe' }, 'tioZe');
    const double = { tile: t(4, 4), side: 'right' };
    expect(scoreMove(arlindo, double) - scoreMove(tioZe, double)).toBeGreaterThanOrEqual(14);

    const pressured = { ...s, memory: { playerMissing: [5] } };
    const marcao = buildTioZeView({ ...pressured, rivalId: 'marcao' }, 'tioZe');
    const calm = buildTioZeView({ ...pressured, rivalId: 'tioZe' }, 'tioZe');
    const leaveFive = { tile: t(3, 5), side: 'left' };
    expect(scoreMove(marcao, leaveFive) - scoreMove(calm, leaveFive)).toBeGreaterThan(0);
  });

  it('Beto Cigano joga rápido e paga um pote maior', () => {
    expect(RIVALS.beto.reflexMs).toBeLessThan(RIVALS.tioZe.reflexMs);
    const s = newRun(2, { rivalId: 'beto' });
    expect(dev(s, 'winMatch').roundResult.prize).toBe(MATCH_PRIZE + RIVALS.beto.prizeBonus);
  });
});

describe('simulação de runs inteiras', () => {
  function canonical(state) {
    return [
      ...boardTilesInOrder(state.board),
      ...state.hands.player,
      ...state.hands.tioZe,
      ...state.boneyard,
      ...(state.pending?.options ?? []),
    ].map((x) => x.id);
  }

  it('80 runs passam por partidas, loja e rivais sem travar nem perder pedras', () => {
    const rng = createSeededRng(31337);
    let matchesWon = 0;
    let shopsVisited = 0;
    const rivalsSeen = new Set();
    for (let run = 0; run < 80; run += 1) {
      let s = gameReducer(createInitialState(), {
        type: 'START_DUEL',
        deck: shuffle(FULL_SET, rng),
        seed: Math.floor(rng() * 2 ** 31),
      });
      for (let step = 0; step < 6000 && s.phase !== 'gameOver' && s.run.match <= 4; step += 1) {
        let next;
        if (s.phase === 'roundOver') next = gameReducer(s, { type: 'NEXT_ROUND', deck: shuffle(FULL_SET, rng) });
        else if (s.phase === 'matchWon') next = gameReducer(s, { type: 'OPEN_SHOP' });
        else if (s.phase === 'shop') {
          shopsVisited += 1;
          let shop = dev(s, 'addCoins', { amount: 20 });
          if (shop.relics.player.length >= RELIC_SLOTS) shop = gameReducer(shop, { type: 'SHOP_SELL_RELIC', id: shop.relics.player[0] });
          shop = gameReducer(shop, { type: 'SHOP_BUY_RELIC', index: Math.floor(rng() * 3) });
          shop = gameReducer(shop, { type: 'SHOP_BUY_TILE', index: Math.floor(rng() * 2) });
          if (rng() < 0.3) shop = gameReducer(shop, { type: 'SHOP_REROLL' });
          next = gameReducer(shop, { type: 'NEXT_MATCH', deck: shuffle(FULL_SET, rng) });
          // às vezes o rival da partida dá uma mãozinha: o jogador simulado é fraco
          if (rng() < 0.5) next = dev(next, 'damageTioZe');
        } else if (s.pending?.type === 'drawChoice') next = gameReducer(s, { type: 'DRAW_PICK', tileId: s.pending.options.at(-1).id });
        else if (s.pending?.type === 'discard') next = gameReducer(s, { type: 'DISCARD', tileId: s.hands.player[0].id });
        else if (s.turn === 'tioZe') next = gameReducer(s, { type: 'TIO_ZE_ACT' });
        else if (canUndo(s) && rng() < 0.5) next = gameReducer(s, { type: 'UNDO' });
        else next = gameReducer(s, decideTioZeAction(buildTioZeView(s, 'player')));
        expect(next, `run ${run}, passo ${step}, fase ${s.phase}`).not.toBe(s);
        if (s.phase !== 'matchWon' && next.phase === 'matchWon') matchesWon += 1;
        s = next;
        rivalsSeen.add(s.rivalId);
        if (s.phase === 'playing') {
          const ids = canonical(s);
          expect(ids).toHaveLength(28);
          expect(new Set(ids).size).toBe(28);
          // a mão do rival só tem as pedras do baralho DELE
          for (const tile of s.hands.tioZe) expect(tile.enhancement).toBe(s.decks.tioZe[tile.id]);
          for (const tile of s.hands.player) expect(tile.enhancement).toBe(s.decks.player[tile.id]);
        }
        expect(s.relics.player.length).toBeLessThanOrEqual(RELIC_SLOTS);
        expect(s.coins.player).toBeGreaterThanOrEqual(0);
        expect(Object.keys(s.decks.player).length).toBeLessThanOrEqual(28);
      }
    }
    expect(matchesWon).toBeGreaterThan(40);
    expect(shopsVisited).toBeGreaterThan(40);
    expect(rivalsSeen.size).toBeGreaterThanOrEqual(5);
  }, 60000);

  it('o estado inicial e as constantes batem', () => {
    expect(createInitialState().coins.player).toBe(STARTING_COINS);
  });
});
