import { describe, expect, it } from 'vitest';
import { REGIONS } from '../../data/campaign.js';
import { NECROTIC_IDS, RELICS, RELIC_SLOTS } from '../../data/relics.js';
import { RIVALS } from '../../data/rivals.js';
import { MARKET_OFFERS, buildMarket, marketBuyBlock } from '../blackMarket.js';
import {
  CAMPAIGN_RIVALS,
  COIN_EVENT_MAX,
  COIN_EVENT_MIN,
  FLOORS,
  LANES,
  RIVALS_PER_REGION,
  availableNodes,
  campaignOf,
  coinReward,
  generateCampaign,
  regionPaths,
  runCast,
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

describe('teia procedural: 15 rivais por run e nada repetido por região (Patch 0.6.2)', () => {
  const seeds = Array.from({ length: 120 }, (_, i) => i * 7919 + 3);

  it('é determinística pela semente e muda de semente para semente', () => {
    expect(JSON.stringify(generateCampaign(77).regions)).toBe(JSON.stringify(generateCampaign(77).regions));
    const layouts = new Set(seeds.map((seed) => JSON.stringify(generateCampaign(seed).regions.map((r) => r.nodes.map((n) => [n.id, n.type, n.rivalId])))));
    expect(layouts.size).toBe(seeds.length);
  });

  it('elenco: 15 por run (chefe fixo + 4 dos outros 5 de cada região); quem fica de fora muda entre runs', () => {
    const benchedSeen = new Set();
    for (const seed of seeds) {
      const campaign = generateCampaign(seed);
      expect(campaign.cast).toHaveLength(CAMPAIGN_RIVALS);
      expect(CAMPAIGN_RIVALS).toBe(15);
      expect(new Set(campaign.cast).size).toBe(15);
      for (const region of campaign.regions) {
        const all = REGIONS[region.id - 1].nodes;
        const cast = runCast(seed, region.id);
        expect(region.cast).toEqual(cast);
        expect(cast.boss).toBe(all[5]);
        expect([cast.intro, ...cast.commons]).toHaveLength(RIVALS_PER_REGION - 1);
        expect(cast.benched).toHaveLength(1);
        expect(new Set([cast.intro, ...cast.commons, ...cast.benched])).toEqual(new Set(all.slice(0, 5)));
        // o de menos corações abre a região
        for (const id of cast.commons) expect(RIVALS[id].hearts).toBeGreaterThanOrEqual(RIVALS[cast.intro].hearts);
        for (const id of cast.benched) benchedSeen.add(id);
        // quem ficou de fora não aparece no mapa
        expect(region.nodes.some((n) => n.rivalId === cast.benched[0])).toBe(false);
      }
    }
    // em runs diferentes, cada um dos 15 que não são chefe já ficou de fora alguma vez
    expect(benchedSeen.size).toBe(15);
  });

  it('cada rival, a loja, o Mercado Negro e o Seu Tião aparecem UMA vez por região', () => {
    for (const seed of seeds) {
      const campaign = generateCampaign(seed);
      for (const region of campaign.regions) {
        expect(region.fallback, `semente ${seed}`).toBeFalsy();
        const fights = region.nodes.filter((n) => n.rivalId).map((n) => n.rivalId);
        expect(new Set(fights).size).toBe(fights.length);
        expect(fights).toHaveLength(RIVALS_PER_REGION);
        for (const kind of ['shop', 'black', 'coins']) expect(region.nodes.filter((n) => n.type === kind)).toHaveLength(1);
        for (const id of fights) expect(RIVALS[id].region).toBe(region.id);
      }
    }
  });

  it('andar 1 = entrada única; andar 6 = só o chefe; andares 2–5 com 6 nós em 1 a 3 faixas', () => {
    for (const seed of seeds) {
      const campaign = generateCampaign(seed);
      expect(campaign.regions).toHaveLength(3);
      for (const region of campaign.regions) {
        expect(region.floors).toHaveLength(FLOORS);
        expect(region.floors[0]).toEqual([region.entry]);
        expect(region.floors[FLOORS - 1]).toEqual([region.boss]);
        expect(campaign.byId.get(region.entry)).toMatchObject({ type: 'combat', rivalId: region.cast.intro, floor: 1 });
        expect(campaign.byId.get(region.boss)).toMatchObject({ type: 'boss', boss: true, rivalId: region.cast.boss, floor: FLOORS, next: [] });
        expect(region.floors.slice(1, 5).flat()).toHaveLength(6);
        for (let f = 2; f <= 5; f += 1) {
          expect(region.floors[f - 1].length).toBeGreaterThanOrEqual(1);
          expect(region.floors[f - 1].length).toBeLessThanOrEqual(LANES);
        }
        // ligações só sobem um andar e só para a mesma faixa ou a vizinha
        for (const node of region.nodes) {
          for (const id of node.next) {
            const to = campaign.byId.get(id);
            expect(to.floor).toBe(node.floor + 1);
            expect(Math.abs(to.lane - node.lane)).toBeLessThanOrEqual(1);
          }
          if (node.floor < FLOORS) expect(node.next.length, node.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it('todo caminho: 1 a 3 mesas no meio (algum com 2+), rival nunca repete, e termina no chefe', () => {
    for (const seed of seeds) {
      const campaign = generateCampaign(seed);
      for (const region of campaign.regions) {
        const paths = regionPaths(campaign, region.id);
        let most = 0;
        for (const nodes of paths) {
          expect(nodes[0].id).toBe(region.entry);
          expect(nodes.at(-1).id).toBe(region.boss);
          const combats = nodes.slice(1, -1).filter((n) => n.type === 'combat').length;
          expect(combats).toBeGreaterThanOrEqual(1);
          expect(combats).toBeLessThanOrEqual(3);
          most = Math.max(most, combats);
          const rivals = nodes.filter((n) => n.rivalId).map((n) => n.rivalId);
          expect(new Set(rivals).size, `semente ${seed}: ${nodes.map((n) => n.id).join(' → ')}`).toBe(rivals.length);
        }
        expect(most, `semente ${seed}, região ${region.id}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('sempre há escolha de verdade: alguma bifurcação põe uma mesa ao lado de um desvio sem luta', () => {
    for (const seed of seeds.slice(0, 60)) {
      const campaign = generateCampaign(seed);
      for (const region of campaign.regions) {
        const mixed = region.nodes.filter((n) => {
          if (n.next.length < 2) return false;
          const types = n.next.map((id) => campaign.byId.get(id).type);
          return types.includes('combat') && types.some((x) => x !== 'combat' && x !== 'boss');
        });
        expect(mixed.length, `semente ${seed}`).toBeGreaterThanOrEqual(1);
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

describe('atalhos do painel DEV (Patch 0.6.2)', () => {
  it('entra direto na loja, no Mercado Negro e no Seu Tião da região atual, até no meio da mesa', () => {
    let s = act(createInitialState(), 'NEW_RUN', { seed: 11 });
    s = act(s, 'CHOOSE_NODE', { nodeId: availableNodes(s)[0], deck: FULL_SET.slice() });
    expect(s.phase).toBe('playing');
    for (const [kind, phase, leave] of [
      ['shop', 'shop', 'LEAVE_SHOP'],
      ['black', 'blackMarket', 'LEAVE_MARKET'],
      ['coins', 'coinEvent', 'LEAVE_EVENT'],
    ]) {
      const inside = act(s, 'DEV', { op: 'openStop', kind });
      expect(inside.phase).toBe(phase);
      const node = campaignOf(inside).byId.get(inside.run.node);
      expect(node).toMatchObject({ type: kind, region: 1 });
      const back = act(inside, leave);
      expect(back.phase).toBe('map');
      expect(back.run.cleared).toContain(node.id);
      expect(availableNodes(back)).toEqual([...node.next]);
    }
    expect(act(s, 'DEV', { op: 'openStop', kind: 'cassino' })).toBe(s);
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
    expect(NECROTIC_IDS).toEqual([
      'pactoCoveiro', 'ossoEnsanguentado', 'olhoMorte', 'trancaCadaverica', 'falsaPartida',
      'caliceGalo', 'dedoCadaver', 'testamento', 'dadoOsso',
    ]);
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

describe('batida "Nas duas pontas!" (Patch 0.6.2)', () => {
  const fourFour = () => placeTile(createEmptyBoard(), t(4, 4), 'root'); // pontas 4 e 4

  it('bater com pedra que servia nas duas pontas arranca 2 corações e solta o balão', () => {
    const s = table({ player: [t(2, 4)], tioZe: [t(1, 1), t(6, 6)], board: fourFour(), boneyard: [t(0, 0)], hearts: { tioZe: 5 } });
    const won = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '2-4', side: 'left' });
    expect(won.roundResult).toMatchObject({ kind: 'duasPontas', winner: 'player', damage: 2, baseDamage: 2 });
    expect(won.hearts.tioZe).toBe(3);
    expect(lastOf(won, 'callout')).toMatchObject({ id: 'duasPontas', text: 'NAS DUAS PONTAS!', by: 'player' });
  });

  it('vale para o rival também; pedra que só serve num lado continua batida normal', () => {
    const s = table({ player: [t(1, 1), t(6, 6)], tioZe: [t(4, 0)], board: fourFour(), boneyard: [t(0, 0)], turn: 'tioZe', hearts: { player: 5 } });
    const hit = gameReducer(s, { type: 'PLAY', actor: 'tioZe', tileId: '0-4', side: 'right' });
    expect(hit.roundResult).toMatchObject({ kind: 'duasPontas', winner: 'tioZe', damage: 2 });
    expect(lastOf(hit, 'callout')).toMatchObject({ by: 'tioZe' });

    const plain = table({ player: [t(3, 6)], tioZe: [t(1, 1)], boneyard: [t(0, 0)] }); // pontas 3 e 4
    const normal = gameReducer(plain, { type: 'PLAY', actor: 'player', tileId: '3-6', side: 'left' });
    expect(normal.roundResult.kind).toBe('normal');
    expect(lastOf(normal, 'callout')).toBeUndefined();
  });

  it('a Cruzada continua valendo mais (3♥) e o Pacto do Coveiro soma em cima', () => {
    const board = placeTile(placeTile(createEmptyBoard(), t(3, 6), 'root'), t(6, 4), 'right'); // pontas 3 e 4
    const cruz = table({ player: [t(3, 4)], tioZe: [t(1, 1)], board, boneyard: [t(0, 0)] });
    expect(gameReducer(cruz, { type: 'PLAY', actor: 'player', tileId: '3-4', side: 'left' }).roundResult).toMatchObject({ kind: 'cruzada', damage: 3 });
    const pacto = table({ player: [t(2, 4)], tioZe: [t(1, 1)], board: fourFour(), boneyard: [t(0, 0)], relics: ['pactoCoveiro'], hearts: { tioZe: 6 } });
    expect(gameReducer(pacto, { type: 'PLAY', actor: 'player', tileId: '2-4', side: 'left' }).roundResult.damage).toBe(4);
  });
});
