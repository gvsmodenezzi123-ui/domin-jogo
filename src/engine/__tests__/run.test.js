import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction, scoreMove } from '../../ai/tioZeAI.js';
import { RELICS, RELIC_IDS, RELIC_SLOTS } from '../../data/relics.js';
import { REGIONS } from '../../data/campaign.js';
import { AI_TIERS, BOSS_IDS, PLAY_STYLES, RIVALS, RIVAL_IDS, tierOf } from '../../data/rivals.js';
import { ENHANCEMENTS } from '../../data/enhancedTiles.js';
import { availableNodes, campaignOf, generateCampaign, runCast } from '../campaignMap.js';
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
import { encounterOptionBlock } from '../encounters.js';
import { relicBuyBlock, rerollCost, sellPriceOf } from '../shop.js';

const t = (a, b) => makeTile(a, b);
const dev = (s, op, extra = {}) => gameReducer(s, { type: 'DEV', op, ...extra });

/**
 * Run nova já sentada na 1ª mesa (a entrada da região 1, o rival de abertura sorteado).
 * Com `rivalId`, é o atalho START_DUEL direto na mesa desse rival.
 */
function newRun(seed = seedWithShop(42), extra = {}) {
  const deck = shuffle(FULL_SET, createSeededRng(seed));
  if (extra.rivalId) return gameReducer(createInitialState(), { type: 'START_DUEL', deck, seed, ...extra });
  const map = gameReducer(createInitialState(), { type: 'NEW_RUN', seed, map: 1, ...extra });
  return gameReducer(map, { type: 'CHOOSE_NODE', nodeId: availableNodes(map)[0], deck });
}

/** 1ª semente cuja teia tem a Loja do Valtinho logo depois da entrada da Região 1. */
function seedWithShop(from = 1) {
  let seed = from;
  const shopNext = (c) => c.byId.get(c.regions[0].entry).next.some((id) => c.byId.get(id).type === 'shop');
  while (!shopNext(generateCampaign(seed))) seed += 1;
  return seed;
}

/** Vence a 1ª mesa (painel DEV), volta ao mapa e entra na loja do 2º andar. */
function toShop(state) {
  const won = dev(state, 'winMatch');
  expect(won.phase).toBe('matchWon');
  const map = gameReducer(won, { type: 'OPEN_MAP' });
  const shopId = availableNodes(map).find((id) => campaignOf(map).byId.get(id).type === 'shop');
  expect(shopId).toBeTruthy();
  return gameReducer(map, { type: 'CHOOSE_NODE', nodeId: shopId });
}

/** Sai da loja e anda pelo mapa (lojas, becos e eventos pelo caminho) até a próxima mesa. */
function toNextFight(state, deck) {
  let s = gameReducer(state, { type: 'LEAVE_SHOP' });
  for (let i = 0; i < 6 && s.phase === 'map'; i += 1) {
    const ids = availableNodes(s);
    const fight = ids.find((id) => ['combat', 'boss'].includes(campaignOf(s).byId.get(id).type));
    s = gameReducer(s, { type: 'CHOOSE_NODE', nodeId: fight ?? ids[0], deck });
    if (s.phase === 'blackMarket') s = gameReducer(s, { type: 'LEAVE_MARKET' });
    else if (s.phase === 'coinEvent') s = gameReducer(s, { type: 'LEAVE_EVENT' });
    else if (s.phase === 'shop') s = gameReducer(s, { type: 'LEAVE_SHOP' });
  }
  return s;
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
  it('começa limpa: baralho 100% comum, sem talismãs, contra o rival de abertura sorteado', () => {
    const s = newRun();
    const intro = runCast(s.seed, 1).intro;
    expect(s.relics.player).toEqual([]);
    expect(s.decks.player).toEqual({});
    expect([...s.hands.player, ...s.hands.tioZe].some((x) => x.enhancement)).toBe(false);
    expect(s.rivalId).toBe(intro);
    expect(RIVALS[intro].region).toBe(1);
    expect(s.run.match).toBe(1);
    expect(s.hearts).toEqual({ player: MAX_HEARTS, tioZe: RIVALS[intro].hearts });
  });
});

describe('partida → mapa → loja (caminho opcional) → próximo rival', () => {
  it('vencer a partida paga o prêmio; a loja é um caminho do mapa, com 3 talismãs e 2 peças de grife', () => {
    const s = newRun();
    const won = dev(s, 'winMatch');
    const prize = MATCH_PRIZE + RIVALS[s.rivalId].prizeBonus;
    expect(won.coins.player).toBe(s.coins.player + prize);
    expect(won.roundResult.prize).toBe(prize);
    expect(gameReducer(won, { type: 'OPEN_SHOP' })).toBe(won);
    const shop = toShop(s);
    expect(shop.phase).toBe('shop');
    expect(shop.shop.relics).toHaveLength(3);
    expect(new Set(shop.shop.relics.map((o) => o.id)).size).toBe(3);
    expect(shop.shop.tiles).toHaveLength(2);
    for (const offer of shop.shop.tiles) {
      expect(FULL_SET.some((x) => x.id === offer.tileId)).toBe(true);
      expect(offer.price).toBeGreaterThan(0);
    }
    expect(shop.shop.nextRivalId).toBeUndefined(); // o próximo rival depende do caminho que você escolher
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
    let s = toShop(newRun(seedWithShop(7), { relics: RELIC_IDS.slice(0, RELIC_SLOTS) }));
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
    expect(byRarity).toEqual({ comum: 2, raro: 4, lendario: 7, mitico: 10, necrotico: 11 });
  });

  it('reembaralhar custa $3, $5, $8 e depois $12 na mesma visita; sem dinheiro, não deixa', () => {
    let s = toShop(newRun(seedWithShop(11)));
    s = dev(s, 'addCoins', { amount: 60 });
    const before = s.shop;
    const coins = s.coins.player;
    expect(s.shop.rerollCost).toBe(3);
    s = gameReducer(s, { type: 'SHOP_REROLL' });
    expect(s.coins.player).toBe(coins - 3);
    expect(s.shop.rerolls).toBe(1);
    expect(s.shop.rerollCost).toBe(5);
    let paid = [];
    for (let i = 0; i < 4; i += 1) {
      const c = s.coins.player;
      s = gameReducer(s, { type: 'SHOP_REROLL' });
      paid.push(c - s.coins.player);
    }
    expect(paid).toEqual([5, 8, 12, 12]);
    expect([0, 1, 2, 3, 9].map(rerollCost)).toEqual([3, 5, 8, 12, 12]);
    const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
    expect(changed(before.relics, s.shop.relics) || changed(before.tiles, s.shop.tiles)).toBe(true);
    const broke = { ...s, coins: { ...s.coins, player: 11 } };
    expect(gameReducer(broke, { type: 'SHOP_REROLL' })).toBe(broke);
  });

  it('a peça de grife SUBSTITUI a comum no seu baralho (continua com 28) e chega aprimorada na sua mão', () => {
    let s = toShop(newRun(seedWithShop(5)));
    s = dev(s, 'addCoins', { amount: 40 });
    const offer = s.shop.tiles[0];
    s = gameReducer(s, { type: 'SHOP_BUY_TILE', index: 0 });
    expect(s.decks.player).toEqual({ [offer.tileId]: offer.enhancement });
    expect(s.shop.tiles[0].sold).toBe(true);

    const [a, b] = offer.tileId.split('-').map(Number);
    const tile = t(a, b);
    // próxima partida (saindo da loja para uma mesa do mapa): a pedra cai na sua mão → vem aprimorada
    let m = toNextFight(s, deckWith([tile]));
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

  it('próximo adversário: o rival do nó escolhido, moedas e talismãs mantidos', () => {
    let s = toShop(newRun(seedWithShop(9)));
    s = dev(s, 'addCoins', { amount: 40 });
    s = gameReducer(s, { type: 'SHOP_BUY_RELIC', index: 0 });
    const relic = s.relics.player[0];
    const coins = s.coins.player;
    const m = toNextFight(s, shuffle(FULL_SET, createSeededRng(1)));
    const rivalId = campaignOf(m).byId.get(m.run.node).rivalId;
    expect(m.phase).toBe('playing');
    expect(m.run.match).toBe(2);
    expect(m.rivalId).toBe(rivalId);
    expect(REGIONS[0].nodes).toContain(rivalId);
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
  it('18 rivais na ordem da campanha, mais o Dono da Noite (nó 19 secreto, fora do sorteio)', () => {
    expect(RIVAL_IDS).toHaveLength(19);
    expect(RIVAL_IDS.filter((id) => !RIVALS[id].secret)).toEqual(REGIONS.flatMap((r) => r.nodes));
    expect(RIVAL_IDS.filter((id) => RIVALS[id].secret)).toEqual(['donoDaNoite']);
    expect(BOSS_IDS).toEqual(['arlindo', 'beto', 'comendador', 'donoDaNoite']);
    for (const id of RIVAL_IDS) {
      const rival = RIVALS[id];
      expect(rival.art, id).toBe(id);
      for (const relic of rival.relics) expect(RELICS[relic]).toBeTruthy();
      expect(rival.reflexMs, id).toBeGreaterThanOrEqual(600);
    }
    expect(RIVALS.arlindo.hearts).toBe(5);
    expect(RIVALS.arlindo.mechanics.doubleBuchaDamage).toBe(true);
    expect(RIVALS.neide.relics).toEqual(['dedal']);
    expect(RIVALS.valdir.deck).toEqual({}); // Região 1: 100% osso
    expect(Object.values(RIVALS.marcao.deck)).toEqual(['chumbo']);
    expect(RIVALS.tiao.hearts).toBe(5);
    expect(RIVALS.beto.hearts).toBe(6);
    expect(RIVALS.beto.mechanics.drawFee).toBe(2);
    expect(Object.values(RIVALS.bigode.deck)).toEqual(['ouro', 'ouro', 'rubi']);
    expect(Object.values(RIVALS.fausto.deck)).toEqual(['cristal', 'cristal', 'rubi']);
    expect(RIVALS.comendador.hearts).toBe(7);
    expect(RIVALS.comendador.relics).toHaveLength(2);
    for (const relic of RIVALS.comendador.relics) expect(RELICS[relic].rarity).toBe('lendario');
  });

  it('campanha: 3 regiões de 6 rivais (entrada, 4 comuns, chefe); a dificuldade sobe dentro da região', () => {
    expect(REGIONS.map((r) => r.name)).toEqual(['BOTECO DA ESQUINA', 'CLUBE DA SINUCA CLANDESTINO', 'SUBMUNDO DO JOGO DO BICHO']);
    expect(REGIONS.map((r) => r.nodes)).toEqual([
      ['tioZe', 'tonho', 'baiano', 'valdir', 'neide', 'arlindo'],
      ['marcao', 'serginho', 'cida', 'paulinho', 'tiao', 'beto'],
      ['carlinhos', 'bigode', 'sofia', 'fausto', 'alemao', 'comendador'],
    ]);
    for (const region of REGIONS) {
      expect(region.nodes).toHaveLength(6);
      expect(region.nodes.map((id) => RIVALS[id].boss)).toEqual([false, false, false, false, false, true]);
      for (const id of region.nodes) expect(RIVALS[id].region).toBe(region.id);
      const hearts = region.nodes.map((id) => RIVALS[id].hearts);
      for (let i = 1; i < hearts.length; i += 1) expect(hearts[i]).toBeGreaterThanOrEqual(hearts[i - 1]);
      const total = Object.values(region.rarity).reduce((a, b) => a + b, 0);
      expect(total).toBe(100);
    }
    expect(REGIONS[0].rarity).toMatchObject({ lendario: 5, mitico: 0 });
    expect(REGIONS[1].rarity).toMatchObject({ lendario: 15, mitico: 5 });
    expect(REGIONS[2].rarity).toMatchObject({ lendario: 25, mitico: 15 });
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

  it('IA por região: R1 100% osso; R2 1–2 grifes e até 2 talismãs; R3 e chefes até 3 grifes e 2 talismãs fortes', () => {
    for (const id of RIVAL_IDS) {
      const rival = RIVALS[id];
      const tier = AI_TIERS[tierOf(rival)];
      const enhanced = Object.values(rival.deck);
      expect(enhanced.length, id).toBeLessThanOrEqual(tier.maxEnhanced);
      expect(rival.relics.length, id).toBeLessThanOrEqual(tier.maxRelics);
      for (const [tileId, enh] of Object.entries(rival.deck)) {
        expect(FULL_SET.some((x) => x.id === tileId), `${id}: ${tileId}`).toBe(true);
        expect(ENHANCEMENTS[enh], `${id}: ${enh}`).toBeTruthy();
      }
      for (const relic of rival.relics) {
        expect(RELICS[relic].rarity).not.toBe('necrotico');
        expect(RELICS[relic].reveal, `${id}: ${relic} só serve para a sua tela`).toBeUndefined();
        expect(RELICS[relic].drawOptions, `${id}: ${relic}`).toBeUndefined();
        expect(RELICS[relic].ability, `${id}: ${relic}`).toBeUndefined();
      }
    }
    for (const id of REGIONS[0].nodes.slice(0, 5)) {
      expect(tierOf(RIVALS[id])).toBe('intuitivo');
      expect(RIVALS[id].deck).toEqual({});
    }
    for (const id of REGIONS[1].nodes.slice(0, 5)) {
      expect(tierOf(RIVALS[id])).toBe('calculista');
      const n = Object.keys(RIVALS[id].deck).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
      expect(PLAY_STYLES[id].five).toBeGreaterThanOrEqual(7);
      expect(PLAY_STYLES[id].fiveSetup).toBeGreaterThan(0);
    }
    const strong = new Set(['raro', 'lendario', 'mitico']);
    for (const id of [...REGIONS[2].nodes, ...BOSS_IDS]) {
      expect(tierOf(RIVALS[id])).toBe('agressivo');
      expect(PLAY_STYLES[id].aggression).toBeGreaterThan(0);
      expect(RIVALS[id].relics).toHaveLength(2);
      expect(RIVALS[id].relics.some((r) => strong.has(RELICS[r].rarity)), id).toBe(true);
    }
    const r3 = REGIONS[2].nodes.flatMap((id) => Object.values(RIVALS[id].deck));
    expect(r3).toContain('rubi');
    expect(r3).toContain('fantasma');
  });

  it('Região 2 conta uma jogada à frente atrás do múltiplo de 5; a Região 1 não', () => {
    let s = newRun(4, { rivalId: 'marcao' });
    s = {
      ...s,
      board: placeTile(createEmptyBoard(), t(2, 3), 'root'),
      hands: { player: [t(6, 6), t(5, 6)], tioZe: [t(3, 6), t(2, 4)] },
      turn: 'tioZe',
      openingTileId: null,
    };
    const calculista = buildTioZeView(s, 'tioZe');
    const instinto = buildTioZeView({ ...s, rivalId: 'tonho' }, 'tioZe');
    expect(calculista.style.fiveSetup).toBeGreaterThan(0);
    expect(instinto.style.fiveSetup).toBe(0);
    // [3|6] na direita deixa 2 e 6 (8); a seguir o [2|4] na esquerda deixa 4 e 6 = 10 ✔
    const move = { tile: t(3, 6), side: 'right' };
    const noSetup = { ...calculista, style: { ...calculista.style, fiveSetup: 0 } };
    expect(scoreMove(calculista, move) - scoreMove(noSetup, move)).toBe(PLAY_STYLES.marcao.fiveSetup);
  });

  it('Região 3 e chefes soltam o Rubi quando você está sem a ponta', () => {
    let s = newRun(4, { rivalId: 'bigode' });
    s = {
      ...s,
      board: placeTile(createEmptyBoard(), t(0, 3), 'root'),
      hands: { player: [t(6, 6), t(5, 6)], tioZe: [{ ...t(0, 0), enhancement: 'rubi' }, t(3, 4), t(1, 2)] },
      memory: { playerMissing: [0] },
      turn: 'tioZe',
      openingTileId: null,
    };
    const rubi = { tile: s.hands.tioZe[0], side: 'left' };
    const agressivo = buildTioZeView(s, 'tioZe');
    const calmo = { ...agressivo, style: { ...agressivo.style, aggression: 0 } };
    expect(scoreMove(agressivo, rubi) - scoreMove(calmo, rubi)).toBeGreaterThanOrEqual(10);
  });

  it('Beto Cigano joga rápido e paga um pote maior', () => {
    expect(RIVALS.beto.reflexMs).toBeLessThan(RIVALS.tioZe.reflexMs);
    const s = newRun(2, { rivalId: 'beto' });
    expect(dev(s, 'winMatch').roundResult.prize).toBe(MATCH_PRIZE + RIVALS.beto.prizeBonus);
    expect(RIVALS.beto.prizeBonus).toBeGreaterThan(RIVALS.tioZe.prizeBonus);
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

  it('80 runs andam pela teia (mesas, loja, mercado, Seu Tião) sem travar nem perder pedras', () => {
    const rng = createSeededRng(31337);
    let matchesWon = 0;
    let shopsVisited = 0;
    const kinds = new Set();
    const rivalsSeen = new Set();
    for (let run = 0; run < 80; run += 1) {
      let s = gameReducer(createInitialState(), { type: 'NEW_RUN', seed: Math.floor(rng() * 2 ** 31) });
      for (let step = 0; step < 6000 && s.phase !== 'gameOver' && s.phase !== 'runWon' && s.run.match <= 4; step += 1) {
        let next;
        if (s.phase === 'map') {
          const ids = availableNodes(s);
          const id = ids[Math.floor(rng() * ids.length)];
          kinds.add(campaignOf(s).byId.get(id).type);
          next = gameReducer(s, { type: 'CHOOSE_NODE', nodeId: id, deck: shuffle(FULL_SET, rng) });
          // às vezes o rival da partida dá uma mãozinha: o jogador simulado é fraco
          if (next.phase === 'playing' && rng() < 0.5) next = dev(next, 'damageTioZe');
        } else if (s.phase === 'roundOver') next = gameReducer(s, { type: 'NEXT_ROUND', deck: shuffle(FULL_SET, rng) });
        else if (s.phase === 'matchWon') next = gameReducer(s, { type: 'OPEN_MAP' });
        else if (s.phase === 'shop') {
          shopsVisited += 1;
          let shop = dev(s, 'addCoins', { amount: 20 });
          if (shop.relics.player.length >= RELIC_SLOTS) shop = gameReducer(shop, { type: 'SHOP_SELL_RELIC', id: shop.relics.player[0] });
          shop = gameReducer(shop, { type: 'SHOP_BUY_RELIC', index: Math.floor(rng() * 3) });
          shop = gameReducer(shop, { type: 'SHOP_BUY_TILE', index: Math.floor(rng() * 2) });
          if (rng() < 0.3) shop = gameReducer(shop, { type: 'SHOP_REROLL' });
          next = gameReducer(shop, { type: 'LEAVE_SHOP' });
          expect(next.phase).toBe('map');
        } else if (s.phase === 'blackMarket') {
          let market = dev(s, 'addCoins', { amount: 30 });
          if (market.relics.player.length < RELIC_SLOTS) market = gameReducer(market, { type: 'MARKET_BUY', index: Math.floor(rng() * 3) });
          next = gameReducer(market, { type: 'LEAVE_MARKET' });
        } else if (s.phase === 'coinEvent') next = gameReducer(s, { type: 'LEAVE_EVENT' });
        // Patch 0.9.4: eventos [?] da teia v2 (escolhe ao acaso; sem dinheiro, a opção segura)
        else if (s.phase === 'encounter') {
          if (s.encounter.choice) next = gameReducer(s, { type: 'LEAVE_ENCOUNTER' });
          else {
            const pick = rng() < 0.5 && !encounterOptionBlock(s, s.encounter.id, 'a') ? 'a' : 'b';
            next = gameReducer(s, { type: 'ENCOUNTER_CHOOSE', choice: pick });
          }
        }
        else if (s.pending?.type === 'drawChoice') next = gameReducer(s, { type: 'DRAW_PICK', tileId: s.pending.options.at(-1).id });
        else if (s.pending?.type === 'discard') next = gameReducer(s, { type: 'DISCARD', tileId: s.hands.player[0].id });
        else if (s.turn === 'tioZe') next = gameReducer(s, { type: 'TIO_ZE_ACT' });
        else if (canUndo(s) && rng() < 0.5) next = gameReducer(s, { type: 'UNDO' });
        else next = gameReducer(s, decideTioZeAction(buildTioZeView(s, 'player')));
        expect(next, `run ${run}, passo ${step}, fase ${s.phase}`).not.toBe(s);
        if (s.phase !== 'matchWon' && next.phase === 'matchWon') matchesWon += 1;
        s = next;
        if (s.phase === 'playing') {
          rivalsSeen.add(s.rivalId);
          // o rival da mesa é o do nó escolhido, da região certa
          const node = campaignOf(s).byId.get(s.run.node);
          expect(s.rivalId).toBe(node.rivalId);
          expect(RIVALS[s.rivalId].region).toBe(node.region);
          const ids = canonical(s);
          expect(ids).toHaveLength(28);
          expect(new Set(ids).size).toBe(28);
          // a mão do rival só tem as pedras do baralho DELE
          for (const tile of s.hands.tioZe) expect(tile.enhancement).toBe(s.decks.tioZe[tile.id]);
          // (o Espelho de Banheiro Trincado copia material do rival para uma pedra sua até o fim da rodada)
          for (const tile of s.hands.player) if (!tile.copied && !tile.id.includes('#')) expect(tile.enhancement).toBe(s.decks.player[tile.id]);
        }
        expect(s.relics.player.length).toBeLessThanOrEqual(RELIC_SLOTS);
        expect(s.coins.player).toBeGreaterThanOrEqual(0);
        expect(Object.keys(s.decks.player).length).toBeLessThanOrEqual(28);
      }
    }
    expect(matchesWon).toBeGreaterThan(40);
    expect(shopsVisited).toBeGreaterThan(5);
    for (const kind of ['black', 'coins', 'combat', 'shop']) expect([...kinds]).toContain(kind);
    expect(rivalsSeen.size).toBeGreaterThanOrEqual(5);
  }, 60000);

  it('o estado inicial e as constantes batem', () => {
    expect(createInitialState().coins.player).toBe(STARTING_COINS);
  });
});
