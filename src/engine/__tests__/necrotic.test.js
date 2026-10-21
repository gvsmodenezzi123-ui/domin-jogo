import { describe, expect, it } from 'vitest';
import { REGIONS } from '../../data/campaign.js';
import { NECROTIC_IDS, RELICS, RELIC_SLOTS } from '../../data/relics.js';
import { RIVALS } from '../../data/rivals.js';
import { MARKET_OFFERS, buildMarket, marketBuyBlock } from '../blackMarket.js';
import {
  COIN_EVENT_MAX,
  COIN_EVENT_MIN,
  FLOORS,
  LANES,
  availableNodes,
  campaignOf,
  coinReward,
  generateCampaign,
  regionPaths,
} from '../campaignMap.js';
import { DAMAGE, FULL_SET, classifyBatida, createEmptyBoard, getOpenEnds, makeTile, placeTile } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { directDamage } from '../effects.js';
import { drawAvailabilityFor } from '../powers.js';

const t = (a, b) => makeTile(a, b);
const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);
const procs = (s, id) => s.events.filter((e) => e.type === 'proc' && e.id === id);

/** Mesa [3|4] (pontas 3 e 4) com mãos, dorme e talismãs escolhidos a dedo. */
function table({ player, tioZe = [t(1, 1), t(2, 2)], boneyard = [], relics = [], rivalRelics = [], coins, hearts, turn = 'player', board }) {
  const s = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice() });
  return {
    ...s,
    hands: { player, tioZe },
    board: board ?? placeTile(createEmptyBoard(), t(3, 4), 'root'),
    boneyard,
    turn,
    openingTileId: null,
    relics: { player: relics, tioZe: rivalRelics },
    coins: { ...s.coins, ...coins },
    hearts: { ...s.hearts, ...hearts },
  };
}

describe('teia procedural: as 3 regiões com os 18 rivais', () => {
  const seeds = Array.from({ length: 120 }, (_, i) => i * 7919 + 3);

  it('é determinística pela semente e muda de semente para semente', () => {
    expect(JSON.stringify(generateCampaign(77).regions)).toBe(JSON.stringify(generateCampaign(77).regions));
    const layouts = new Set(seeds.map((seed) => JSON.stringify(generateCampaign(seed).regions.map((r) => r.nodes.map((n) => [n.id, n.type, n.rivalId])))));
    expect(layouts.size).toBe(seeds.length);
  });

  it('andar 1 = um rival de entrada; andar 6 = só o chefe; andares 2–5 com 2 ou 3 caminhos', () => {
    for (const seed of seeds) {
      const campaign = generateCampaign(seed);
      expect(campaign.regions).toHaveLength(3);
      for (const region of campaign.regions) {
        const cast = REGIONS[region.id - 1].nodes;
        expect(region.fallback, `semente ${seed}`).toBeFalsy();
        expect(region.floors).toHaveLength(FLOORS);
        expect(region.floors[0]).toEqual([region.entry]);
        expect(region.floors[FLOORS - 1]).toEqual([region.boss]);
        const entry = campaign.byId.get(region.entry);
        expect(entry).toMatchObject({ type: 'combat', rivalId: cast[0], floor: 1 });
        expect(campaign.byId.get(region.boss)).toMatchObject({ type: 'boss', boss: true, rivalId: cast[5], floor: FLOORS, next: [] });
        for (let f = 2; f <= 5; f += 1) {
          const lanes = region.floors[f - 1].length;
          expect(lanes).toBeGreaterThanOrEqual(2);
          expect(lanes).toBeLessThanOrEqual(LANES);
        }
        // ligações só sobem um andar e só para a mesma faixa ou a vizinha
        for (const node of region.nodes) {
          for (const id of node.next) {
            const to = campaign.byId.get(id);
            expect(to.floor).toBe(node.floor + 1);
            if (node.floor > 1 && to.floor < FLOORS) expect(Math.abs(to.lane - node.lane)).toBeLessThanOrEqual(1);
          }
          if (node.floor < FLOORS) expect(node.next.length, node.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it('os 18 rivais estão na teia: cada região usa todos os seus 4 comuns, e cada um só na região dele', () => {
    for (const seed of seeds) {
      const campaign = generateCampaign(seed);
      const all = new Set();
      for (const region of campaign.regions) {
        const cast = REGIONS[region.id - 1].nodes;
        const fights = region.nodes.filter((n) => n.type === 'combat' || n.type === 'boss');
        for (const n of fights) {
          expect(cast).toContain(n.rivalId);
          expect(RIVALS[n.rivalId].region).toBe(region.id);
          all.add(n.rivalId);
        }
        for (const id of cast) expect(fights.some((n) => n.rivalId === id), `semente ${seed}: ${id}`).toBe(true);
      }
      expect(all.size).toBe(18);
    }
  });

  it('todo caminho: 2 ou 3 mesas no meio, rival nunca repete, e termina no chefe', () => {
    for (const seed of seeds) {
      const campaign = generateCampaign(seed);
      for (const region of campaign.regions) {
        const paths = regionPaths(campaign, region.id);
        expect(paths.length).toBeGreaterThanOrEqual(2);
        for (const nodes of paths) {
          expect(nodes[0].id).toBe(region.entry);
          expect(nodes.at(-1).id).toBe(region.boss);
          const middle = nodes.slice(1, -1);
          const combats = middle.filter((n) => n.type === 'combat');
          expect(combats.length).toBeGreaterThanOrEqual(2);
          expect(combats.length).toBeLessThanOrEqual(3);
          const rivals = nodes.filter((n) => n.rivalId).map((n) => n.rivalId);
          expect(new Set(rivals).size, `semente ${seed}: ${nodes.map((n) => n.id).join(' → ')}`).toBe(rivals.length);
        }
        // a loja, o mercado e o Seu Tião aparecem como desvio em toda região
        const kinds = new Set(region.nodes.map((n) => n.type));
        for (const kind of ['shop', 'black', 'coins']) expect(kinds.has(kind), `semente ${seed}, região ${region.id}`).toBe(true);
      }
    }
  });

  it('sempre há escolha de verdade: algum andar oferece um desvio sem luta ao lado de uma mesa', () => {
    for (const seed of seeds.slice(0, 40)) {
      const campaign = generateCampaign(seed);
      for (const region of campaign.regions) {
        const forks = region.nodes.filter((n) => n.next.length >= 2);
        expect(forks.length).toBeGreaterThan(0);
        const mixed = forks.filter((n) => {
          const types = n.next.map((id) => campaign.byId.get(id).type);
          return types.includes('combat') && types.some((x) => x !== 'combat');
        });
        expect(mixed.length, `semente ${seed}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('Seu Tião das Moedas', () => {
  it('paga de $1 a $12, fixo pela semente e pelo nó, e usa a faixa inteira', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 400; seed += 1) {
      const value = coinReward(seed, 'r1-f3-l1');
      expect(value).toBe(coinReward(seed, 'r1-f3-l1'));
      expect(value).toBeGreaterThanOrEqual(COIN_EVENT_MIN);
      expect(value).toBeLessThanOrEqual(COIN_EVENT_MAX);
      seen.add(value);
    }
    expect(COIN_EVENT_MIN).toBe(1);
    expect(COIN_EVENT_MAX).toBe(12);
    expect(seen.size).toBe(12);
  });

  it('o evento não deixa entrar de novo depois de sair (o nó fica feito)', () => {
    let seed = 1;
    while (!generateCampaign(seed).regions[0].nodes.some((n) => n.floor === 2 && n.type === 'coins')) seed += 1;
    let s = act(createInitialState(), 'NEW_RUN', { seed });
    s = act(s, 'CHOOSE_NODE', { nodeId: availableNodes(s)[0], deck: FULL_SET.slice() });
    s = act(act(s, 'DEV', { op: 'winMatch' }), 'OPEN_MAP');
    const id = availableNodes(s).find((x) => campaignOf(s).byId.get(x).type === 'coins');
    s = act(s, 'CHOOSE_NODE', { nodeId: id });
    expect(lastOf(s, 'coinEvent')).toMatchObject({ reward: s.coinEvent.reward });
    expect(lastOf(s, 'coins')).toMatchObject({ who: 'player', source: 'tiao', amount: s.coinEvent.reward });
    const back = act(s, 'LEAVE_EVENT');
    expect(availableNodes(back)).not.toContain(id);
    expect(act(back, 'CHOOSE_NODE', { nodeId: id })).toBe(back);
  });
});

describe('Mercado Negro do Corvo da Madrugada', () => {
  function marketState(seed = 1, relics = []) {
    while (!generateCampaign(seed).regions[0].nodes.some((n) => n.floor === 2 && n.type === 'black')) seed += 1;
    let s = act(createInitialState(), 'NEW_RUN', { seed, relics });
    s = act(s, 'CHOOSE_NODE', { nodeId: availableNodes(s)[0], deck: FULL_SET.slice() });
    s = act(act(s, 'DEV', { op: 'winMatch' }), 'OPEN_MAP');
    const id = availableNodes(s).find((x) => campaignOf(s).byId.get(x).type === 'black');
    return act(s, 'CHOOSE_NODE', { nodeId: id });
  }

  it('vende só Necróticos de $18 a $26, que a loja do Valtinho nunca mostra', () => {
    expect(NECROTIC_IDS).toEqual(['pactoCoveiro', 'ossoEnsanguentado', 'olhoMorte', 'trancaCadaverica', 'falsaPartida']);
    for (const id of NECROTIC_IDS) {
      expect(RELICS[id].price).toBeGreaterThanOrEqual(18);
      expect(RELICS[id].price).toBeLessThanOrEqual(26);
    }
    const s = marketState();
    expect(s.phase).toBe('blackMarket');
    expect(s.market.offers).toHaveLength(MARKET_OFFERS);
    expect(new Set(s.market.offers.map((o) => o.id)).size).toBe(MARKET_OFFERS);
    for (const offer of s.market.offers) expect(NECROTIC_IDS).toContain(offer.id);
    expect(buildMarket(s)).toEqual(buildMarket(s)); // vitrine fixa por semente e nó
  });

  it('não oferece o que você já tem; comprar desconta, ocupa slot e marca vendido', () => {
    const owned = marketState(1, ['pactoCoveiro', 'olhoMorte']);
    expect(owned.market.offers.map((o) => o.id)).not.toContain('pactoCoveiro');
    expect(owned.market.offers.map((o) => o.id)).not.toContain('olhoMorte');

    let s = marketState(3);
    const offer = s.market.offers[0];
    expect(marketBuyBlock(s, offer)).toBe('coins');
    expect(act(s, 'MARKET_BUY', { index: 0 })).toBe(s);
    s = act(s, 'DEV', { op: 'addCoins', amount: 40 });
    const coins = s.coins.player;
    s = act(s, 'MARKET_BUY', { index: 0 });
    expect(s.coins.player).toBe(coins - offer.price);
    expect(s.relics.player).toContain(offer.id);
    expect(s.market.offers[0].sold).toBe(true);
    expect(lastOf(s, 'marketBuy')).toMatchObject({ id: offer.id, price: offer.price });
    expect(marketBuyBlock(s, s.market.offers[0])).toBe('sold');

    const full = { ...s, relics: { ...s.relics, player: ['caneca', 'giz', 'dedal', 'anel', 'espelho'].slice(0, RELIC_SLOTS) } };
    expect(marketBuyBlock(full, full.market.offers[1])).toBe('full');
    const left = act(s, 'LEAVE_MARKET');
    expect(left.phase).toBe('map');
    expect(left.market).toBeNull();
  });
});

describe('talismãs Necróticos', () => {
  it('Pacto do Coveiro: batida +2 de dano', () => {
    const base = table({ player: [t(4, 6)] });
    const won = gameReducer(base, { type: 'PLAY', actor: 'player', tileId: '4-6', side: 'right' });
    const pacto = gameReducer({ ...base, relics: { player: ['pactoCoveiro'], tioZe: [] } }, { type: 'PLAY', actor: 'player', tileId: '4-6', side: 'right' });
    const expected = DAMAGE[classifyBatida(t(4, 6), getOpenEnds(base.board))];
    expect(won.roundResult.damage).toBe(expected);
    expect(pacto.roundResult.damage).toBe(expected + 2);
  });

  it('Pacto do Coveiro: a 3ª compra do turno custa 2 corações (e nunca mata)', () => {
    const boneyard = [t(0, 0), t(0, 1), t(0, 2), t(1, 1), t(5, 5)];
    let s = table({ player: [t(6, 6)], boneyard, relics: ['pactoCoveiro'], coins: { player: 10 }, hearts: { player: 5 } });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(drawAvailabilityFor(s, 'player').cost).toEqual({ type: 'heart', amount: 2 });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.hearts.player).toBe(3);

    let weak = table({ player: [t(6, 6)], boneyard, relics: ['pactoCoveiro'], coins: { player: 10 }, hearts: { player: 2 } });
    weak = gameReducer(gameReducer(weak, { type: 'DRAW', actor: 'player' }), { type: 'DRAW', actor: 'player' });
    expect(drawAvailabilityFor(weak, 'player').allowed).toBe(false);
    expect(gameReducer(weak, { type: 'DRAW', actor: 'player' })).toBe(weak);

    // sem o Pacto a escada continua a de sempre: 1 coração
    let plain = table({ player: [t(6, 6)], boneyard, coins: { player: 10 }, hearts: { player: 5 } });
    plain = gameReducer(gameReducer(plain, { type: 'DRAW', actor: 'player' }), { type: 'DRAW', actor: 'player' });
    expect(drawAvailabilityFor(plain, 'player').cost).toEqual({ type: 'heart', amount: 1 });
  });

  it('Osso Ensanguentado: cada bucha sua que entra arranca $3 do rival (ou o que ele tiver)', () => {
    const s = table({ player: [t(4, 4), t(0, 0)], relics: ['ossoEnsanguentado'], coins: { player: 2, tioZe: 10 } });
    const played = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '4-4', side: 'right' });
    expect(played.coins.player - s.coins.player).toBeGreaterThanOrEqual(3);
    expect(played.coins.tioZe).toBe(7);
    expect(procs(played, 'ossoEnsanguentado')).toHaveLength(1);

    const broke = gameReducer({ ...s, coins: { ...s.coins, tioZe: 1 } }, { type: 'PLAY', actor: 'player', tileId: '4-4', side: 'right' });
    expect(broke.coins.tioZe).toBe(0);
    // pedra que não é bucha não rouba
    const plain = table({ player: [t(4, 5), t(0, 0)], relics: ['ossoEnsanguentado'], coins: { player: 2, tioZe: 10 } });
    expect(gameReducer(plain, { type: 'PLAY', actor: 'player', tileId: '4-5', side: 'right' }).coins.tioZe).toBe(10);
  });

  it('Olho da Morte: rival em 1 coração + pedra com 0 ou 6 = vitória na hora', () => {
    const s = table({ player: [t(4, 6), t(1, 2)], boneyard: [t(0, 3), t(5, 5)], relics: ['olhoMorte'], hearts: { tioZe: 1 } });
    const won = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '4-6', side: 'right' });
    expect(won.hearts.tioZe).toBe(0);
    expect(['matchWon', 'runWon']).toContain(won.phase);
    expect(procs(won, 'olhoMorte')).toHaveLength(1);

    // rival com 2 corações: nada acontece
    const healthy = gameReducer({ ...s, hearts: { ...s.hearts, tioZe: 2 } }, { type: 'PLAY', actor: 'player', tileId: '4-6', side: 'right' });
    expect(healthy.phase).toBe('playing');
    expect(healthy.hearts.tioZe).toBe(2);
    // pedra sem 0 nem 6: nada acontece
    const plain = table({ player: [t(4, 5), t(1, 2)], boneyard: [t(0, 3), t(5, 5)], relics: ['olhoMorte'], hearts: { tioZe: 1 } });
    expect(gameReducer(plain, { type: 'PLAY', actor: 'player', tileId: '4-5', side: 'right' }).phase).toBe('playing');
  });

  it('Tranca Cadavérica: quem perde a soma toma 3 corações (vale para os dois lados)', () => {
    // você com menos pontos na mão: o rival perde 3
    const s = table({ player: [t(0, 1)], tioZe: [t(6, 6), t(5, 6)], relics: ['trancaCadaverica'], hearts: { tioZe: 5 } });
    const r = act(s, 'DEV', { op: 'forceTranca' });
    expect(r.roundResult).toMatchObject({ kind: 'tranca', winner: 'player', damage: 3, cadaverica: true });
    expect(r.hearts.tioZe).toBe(2);
    expect(procs(r, 'trancaCadaverica')).toHaveLength(1);

    // você com mais pontos: quem toma os 3 é você
    const bad = table({ player: [t(6, 6), t(5, 6)], tioZe: [t(0, 1)], relics: ['trancaCadaverica'], hearts: { player: 5 } });
    const rb = act(bad, 'DEV', { op: 'forceTranca' });
    expect(rb.roundResult).toMatchObject({ winner: 'tioZe', damage: 3 });
    expect(rb.hearts.player).toBe(2);

    // sem o talismã, a tranca dá o dano de sempre
    const plain = act(table({ player: [t(0, 1)], tioZe: [t(6, 6), t(5, 6)], hearts: { tioZe: 5 } }), 'DEV', { op: 'forceTranca' });
    expect(plain.roundResult.damage).toBeLessThan(3);
    expect(plain.roundResult.cadaverica).toBeUndefined();
  });

  it('Falsa Partida: o golpe fatal deixa você com 1♥, o rival compra 2 — só uma vez por partida', () => {
    // o rival bate e você está com 1 coração
    const boneyard = [t(0, 0), t(1, 1), t(2, 2), t(0, 5)];
    const s = table({
      player: [t(6, 6), t(5, 5)],
      tioZe: [t(4, 6)],
      boneyard,
      relics: ['falsaPartida'],
      hearts: { player: 1 },
      turn: 'tioZe',
    });
    const hit = gameReducer(s, { type: 'PLAY', actor: 'tioZe', tileId: '4-6', side: 'right' });
    expect(hit.phase).toBe('roundOver');
    expect(hit.hearts.player).toBe(1);
    expect(hit.matchFx.falsaUsed.player).toBe(true);
    expect(procs(hit, 'falsaPartida')).toHaveLength(1);
    // na próxima rodada o rival começa com 2 pedras a mais
    const next = act(hit, 'NEXT_ROUND', { deck: FULL_SET.slice() });
    expect(next.hands.tioZe.length).toBe(next.hands.player.length + 2);
    expect(next.matchFx.forcedDraw).toBeNull();

    // o segundo golpe fatal na mesma partida acaba a run
    const again = gameReducer({ ...s, matchFx: { ...s.matchFx, falsaUsed: { player: true, tioZe: false } } }, { type: 'PLAY', actor: 'tioZe', tileId: '4-6', side: 'right' });
    expect(again.phase).toBe('gameOver');
  });

  it('Falsa Partida também segura dano direto no meio da rodada (o rival compra 2 na hora)', () => {
    const s = {
      ...table({
        player: [t(6, 6), t(5, 5)],
        tioZe: [t(0, 1), t(0, 2)],
        boneyard: [t(1, 1), t(2, 2), t(0, 6)],
        relics: ['falsaPartida'],
        hearts: { player: 1 },
      }),
      decks: { player: {}, tioZe: { '2-2': 'rubi' } },
    };
    const hit = directDamage(s, 'player', 1, 'dedal');
    expect(hit.hearts.player).toBe(1);
    expect(hit.hands.tioZe.map((x) => x.id)).toEqual(['0-1', '0-2', '1-1', '2-2']);
    expect(hit.hands.tioZe[3].enhancement).toBe('rubi'); // chega como é no baralho dele
    expect(hit.boneyard.map((x) => x.id)).toEqual(['0-6']);
    expect(hit.events.filter((e) => e.type === 'drawTile' && e.forced)).toHaveLength(2);
    // a segunda vez não salva
    expect(directDamage(hit, 'player', 1, 'dedal').hearts.player).toBe(0);
    // sem o talismã, zera
    expect(directDamage({ ...s, relics: { player: [], tioZe: [] } }, 'player', 1, 'dedal').hearts.player).toBe(0);
  });
});
