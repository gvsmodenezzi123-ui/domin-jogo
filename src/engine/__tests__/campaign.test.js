import { describe, expect, it } from 'vitest';
import { REGIONS } from '../../data/campaign.js';
import { RELICS } from '../../data/relics.js';
import { ENHANCEMENTS } from '../../data/enhancedTiles.js';
import { RIVALS } from '../../data/rivals.js';
import { availableNodes, campaignOf, currentNode, generateCampaign, runCast } from '../campaignMap.js';
import {
  FULL_SET,
  MAX_HEARTS,
  createEmptyBoard,
  createSeededRng,
  makeTile,
  placeTile,
  shuffle,
} from '../dominoLogic.js';
import { MATCH_PRIZE, createInitialState, gameReducer } from '../gameReducer.js';
import { knownPlayerTiles, trancaTileValues } from '../powers.js';
import { discover } from '../progress.js';
import { isValidSave, snapshotRun } from '../save.js';
import { buildShop } from '../shop.js';

const t = (a, b) => makeTile(a, b);
const deck = (seed = 1) => shuffle(FULL_SET, createSeededRng(seed));
const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const dev = (s, op, extra = {}) => gameReducer(s, { type: 'DEV', op, ...extra });
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);

const freshRun = (seed = 7) => act(createInitialState(), 'NEW_RUN', { seed });
const nodeOfId = (s, id) => campaignOf(s).byId.get(id);

/** Entra no nó `id` e conclui: vence a mesa (DEV) ou sai da loja, do mercado ou do evento. */
function visit(s, id, seed = 1) {
  let next = act(s, 'CHOOSE_NODE', { nodeId: id, deck: deck(seed) });
  if (next.phase === 'playing') {
    next = dev(next, 'winMatch');
    return next.phase === 'runWon' ? next : act(next, 'OPEN_MAP');
  }
  if (next.phase === 'shop') return act(next, 'LEAVE_SHOP');
  if (next.phase === 'blackMarket') return act(next, 'LEAVE_MARKET');
  if (next.phase === 'coinEvent') return act(next, 'LEAVE_EVENT');
  return next;
}

/** Anda pelo mapa escolhendo sempre com `pick` até o fim da run (ou `limit` nós). */
function walk(s, pick = (ids) => ids[0], limit = 99) {
  let next = s;
  for (let i = 0; i < limit && next.phase === 'map'; i += 1) next = visit(next, pick(availableNodes(next), next), i + 10);
  return next;
}

/** Mesa montada contra `rivalId` (pontas 3 e 4 por padrão). */
function table(rivalId, { player, tioZe, board = placeTile(createEmptyBoard(), t(3, 4), 'root'), boneyard = [], turn = 'player', coins, hearts }) {
  const s = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), rivalId });
  return {
    ...s,
    hands: { player, tioZe },
    board,
    boneyard,
    turn,
    openingTileId: null,
    coins: { ...s.coins, ...coins },
    hearts: { ...s.hearts, ...hearts },
  };
}

describe('mapa da campanha em teia (Patch 0.6.1/0.6.2)', () => {
  it('NOVO JOGO para no mapa antes do 1º nó; o único caminho é a entrada da região 1 (o rival de abertura sorteado)', () => {
    const s = freshRun();
    expect(s.phase).toBe('map');
    expect(s.run).toMatchObject({ node: null, cleared: [], path: [], match: 0 });
    const [entry] = availableNodes(s);
    expect(availableNodes(s)).toHaveLength(1);
    expect(nodeOfId(s, entry)).toMatchObject({ region: 1, floor: 1, type: 'combat', rivalId: runCast(s.seed, 1).intro });
    expect(REGIONS[0].nodes.slice(0, 5)).toContain(nodeOfId(s, entry).rivalId);
    expect(act(s, 'PLAY', { actor: 'player', tileId: '0-0', side: 'root' })).toBe(s);
  });

  it('vencer a mesa conclui o nó e volta direto ao mapa (sem loja obrigatória), com os caminhos do próximo andar', () => {
    let s = freshRun();
    const [entry] = availableNodes(s);
    s = act(s, 'CHOOSE_NODE', { nodeId: entry, deck: deck() });
    expect(s.phase).toBe('playing');
    expect(s.rivalId).toBe(runCast(s.seed, 1).intro);
    s = dev(s, 'winMatch');
    expect(s.phase).toBe('matchWon');
    expect(s.run.cleared).toEqual([entry]);
    s = act(s, 'OPEN_MAP');
    expect(s.phase).toBe('map');
    expect(s.shop).toBeNull();
    const next = availableNodes(s);
    expect(next).toEqual([...nodeOfId(s, entry).next]);
    expect(next.length).toBeGreaterThanOrEqual(1);
    for (const id of next) expect(nodeOfId(s, id).floor).toBe(2);
  });

  it('só dá para entrar nos nós ligados ao atual (e combate precisa de baralho)', () => {
    const s = freshRun(5);
    const far = generateCampaign(s.seed).regions[0].boss;
    expect(act(s, 'CHOOSE_NODE', { nodeId: far, deck: deck() })).toBe(s);
    expect(act(s, 'CHOOSE_NODE', { nodeId: availableNodes(s)[0] })).toBe(s);
  });

  it('os seus corações continuam entre os nós: vencer cura 2, vencer chefe cura tudo', () => {
    let s = act(freshRun(), 'CHOOSE_NODE', { nodeId: availableNodes(freshRun())[0], deck: deck() });
    s = { ...s, hearts: { ...s.hearts, player: 1 } };
    s = dev(s, 'winMatch');
    expect(s.hearts.player).toBe(3);
    expect(s.roundResult.heal).toBe(2);

    let boss = dev(s, 'setRival', { rivalId: 'arlindo', deck: deck(4) });
    expect(currentNode(boss)).toMatchObject({ boss: true, region: 1, floor: 6 });
    boss = { ...boss, hearts: { ...boss.hearts, player: 1 } };
    boss = dev(boss, 'winMatch');
    expect(boss.hearts.player).toBe(MAX_HEARTS);
    expect(lastOf(boss, 'duelEnd')).toMatchObject({ boss: true, heal: MAX_HEARTS - 1 });
  });

  it('uma run inteira sobe as 3 regiões andar por andar e o Comendador encerra a run', () => {
    for (const seed of [3, 11, 42]) {
      const s = walk(freshRun(seed));
      expect(s.phase).toBe('runWon');
      expect(lastOf(s, 'duelEnd')).toMatchObject({ runWon: true });
      const visited = s.run.path.map((id) => nodeOfId(s, id));
      expect(visited.map((n) => `${n.region}-${n.floor}`)).toEqual(REGIONS.flatMap((r) => [1, 2, 3, 4, 5, 6].map((f) => `${r.id}-${f}`)));
      expect(visited.filter((n) => n.boss).map((n) => n.rivalId)).toEqual(['arlindo', 'beto', 'comendador']);
      expect(s.run.cleared).toEqual(s.run.path);
      const fights = visited.filter((n) => n.type === 'combat' || n.type === 'boss');
      expect(s.stats.matchesWon).toBe(fights.length);
      expect(s.coins.player).toBeGreaterThanOrEqual(MATCH_PRIZE * fights.length);
    }
  });

  it('caminhos diferentes enfrentam rivais diferentes', () => {
    const left = walk(freshRun(9), (ids) => ids[0]);
    const right = walk(freshRun(9), (ids) => ids[ids.length - 1]);
    expect(left.run.path).not.toEqual(right.run.path);
    expect(left.run.history).not.toEqual(right.run.history);
  });

  it('loja, mercado negro e Seu Tião são caminhos: entrar, mexer e sair conclui o nó', () => {
    // procura uma semente com cada tipo de nó no 2º andar da região 1
    for (const type of ['shop', 'black', 'coins']) {
      let seed = 1;
      while (!generateCampaign(seed).regions[0].nodes.some((n) => n.floor === 2 && n.type === type)) seed += 1;
      let s = visit(freshRun(seed), availableNodes(freshRun(seed))[0]);
      const target = availableNodes(s).find((id) => nodeOfId(s, id).type === type);
      expect(target, `semente ${seed}`).toBeTruthy();
      const before = s.coins.player;
      s = act(s, 'CHOOSE_NODE', { nodeId: target });
      expect(s.phase).toBe({ shop: 'shop', black: 'blackMarket', coins: 'coinEvent' }[type]);
      if (type === 'coins') {
        expect(s.coinEvent.reward).toBeGreaterThanOrEqual(1);
        expect(s.coinEvent.reward).toBeLessThanOrEqual(12);
        expect(s.coins.player).toBe(before + s.coinEvent.reward);
        expect(s.run.cleared).toContain(target);
      }
      if (type === 'black') expect(s.market.offers.every((o) => RELICS[o.id].rarity === 'necrotico')).toBe(true);
      s = act(s, { shop: 'LEAVE_SHOP', black: 'LEAVE_MARKET', coins: 'LEAVE_EVENT' }[type]);
      expect(s.phase).toBe('map');
      expect(s.run.cleared).toContain(target);
      expect(availableNodes(s)).toEqual([...nodeOfId(s, target).next]);
    }
  });

  it('o prêmio do Seu Tião é fixo pela semente (sair e voltar não sorteia de novo)', () => {
    let seed = 1;
    while (!generateCampaign(seed).regions[0].nodes.some((n) => n.floor === 2 && n.type === 'coins')) seed += 1;
    const go = () => {
      const s = visit(freshRun(seed), availableNodes(freshRun(seed))[0]);
      const target = availableNodes(s).find((id) => nodeOfId(s, id).type === 'coins');
      return act(s, 'CHOOSE_NODE', { nodeId: target }).coinEvent.reward;
    };
    expect(go()).toBe(go());
  });
});

describe('save da run', () => {
  it('CONTINUAR volta exatamente: nó, caminho, vida, moedas, talismãs e pedras de grife', () => {
    let s = walk(freshRun(21), (ids) => ids[0], 3);
    s = { ...s, hearts: { ...s.hearts, player: 3 }, coins: { ...s.coins, player: 17 } };
    s = { ...s, relics: { ...s.relics, player: ['caneca', 'dedal'] }, decks: { ...s.decks, player: { '2-5': 'ouro', '6-6': 'rubi' } } };
    const save = JSON.parse(JSON.stringify(snapshotRun(s, 'map', 1234)));
    expect(isValidSave(save)).toBe(true);

    const loaded = act(createInitialState(), 'LOAD_RUN', { save });
    expect(loaded.phase).toBe('map');
    expect(loaded.run).toEqual(s.run);
    expect(loaded.hearts.player).toBe(3);
    expect(loaded.coins.player).toBe(17);
    expect(loaded.relics.player).toEqual(['caneca', 'dedal']);
    expect(loaded.decks.player).toEqual({ '2-5': 'ouro', '6-6': 'rubi' });
    expect(loaded.seed).toBe(s.seed);
    expect(availableNodes(loaded)).toEqual(availableNodes(s));
  });

  it('save tirado na loja reabre a mesma vitrine; o que você comprou continua vendido', () => {
    let seed = 1;
    while (!generateCampaign(seed).regions[0].nodes.some((n) => n.floor === 2 && n.type === 'shop')) seed += 1;
    let s = visit(freshRun(seed), availableNodes(freshRun(seed))[0]);
    s = act(s, 'CHOOSE_NODE', { nodeId: availableNodes(s).find((id) => nodeOfId(s, id).type === 'shop') });
    s = dev(s, 'addCoins', { amount: 40 });
    s = act(s, 'SHOP_BUY_RELIC', { index: 1 });
    s = act(s, 'SHOP_REROLL');
    s = act(s, 'SHOP_BUY_RELIC', { index: 0 });
    const loaded = act(createInitialState(), 'LOAD_RUN', { save: JSON.parse(JSON.stringify(snapshotRun(s, 'shop'))) });
    expect(loaded.phase).toBe('shop');
    expect(loaded.shop.relics).toEqual(s.shop.relics);
    expect(loaded.shop.tiles).toEqual(s.shop.tiles);
    expect(loaded.shop.rerollCost).toBe(5);
    expect(loaded.relics.player).toEqual(s.relics.player);
    expect(snapshotRun(s, 'map').shop).toBeNull();
    const left = act(loaded, 'LEAVE_SHOP');
    expect(left.phase).toBe('map');
    expect(left.run.cleared).toContain(s.run.node);
  });

  it('save tirado no Mercado Negro reabre o beco com a mesma vitrine', () => {
    let seed = 1;
    while (!generateCampaign(seed).regions[0].nodes.some((n) => n.floor === 2 && n.type === 'black')) seed += 1;
    let s = visit(freshRun(seed), availableNodes(freshRun(seed))[0]);
    s = act(s, 'CHOOSE_NODE', { nodeId: availableNodes(s).find((id) => nodeOfId(s, id).type === 'black') });
    s = dev(s, 'addCoins', { amount: 60 });
    s = act(s, 'MARKET_BUY', { index: 0 });
    const loaded = act(createInitialState(), 'LOAD_RUN', { save: JSON.parse(JSON.stringify(snapshotRun(s, 'blackMarket'))) });
    expect(loaded.phase).toBe('blackMarket');
    expect(loaded.market.offers).toEqual(s.market.offers);
    expect(loaded.relics.player).toEqual(s.relics.player);
  });

  it('save quebrado, de outra versão ou com nó que não existe nesta teia é ignorado', () => {
    const s = createInitialState();
    const good = snapshotRun(walk(freshRun(), (ids) => ids[0], 2), 'map');
    expect(isValidSave(good)).toBe(true);
    for (const bad of [
      null,
      { ...good, v: 1 },
      { ...good, v: 99 },
      { ...good, node: 3 },
      { ...good, node: 'r9-f1-l1' },
      { ...good, cleared: ['nada'] },
      { ...good, path: 'r1-f1-l1' },
      { ...good, hearts: 0 },
      { ...good, relics: ['naoExiste'] },
      { ...good, deck: { '1-1': 'plutonio' } },
      { ...good, resume: 'playing' },
      { ...good, deck: { '9-9': 'ouro' } },
      { ...good, shop: { relics: [{ id: 'naoExiste', price: 1, sold: false }], tiles: [], rerolls: 0, rerollCost: 3 } },
      { ...good, market: { offers: [{ id: 'naoExiste', price: 1, sold: false }] } },
    ]) {
      expect(isValidSave(bad)).toBe(false);
      expect(act(s, 'LOAD_RUN', { save: bad })).toBe(s);
    }
  });
});

describe('loja por região', () => {
  function rarities(regionId, samples = 160) {
    const count = { comum: 0, raro: 0, lendario: 0, mitico: 0, necrotico: 0 };
    for (let seed = 1; seed <= samples; seed += 1) {
      const fresh = freshRun(seed);
      const s = { ...fresh, run: { ...fresh.run, node: `r${regionId}-f1-l1` } };
      for (let r = 0; r < 3; r += 1) {
        const shop = buildShop(s, r);
        for (const o of shop.relics) count[RELICS[o.id].rarity] += 1;
        for (const o of shop.tiles) count[ENHANCEMENTS[o.enhancement].rarity] += 1;
      }
    }
    return count;
  }

  it('Boteco da Esquina nunca mostra mítico e quase não mostra lendário', () => {
    const r1 = rarities(1);
    expect(r1.mitico).toBe(0);
    const total = Object.values(r1).reduce((a, b) => a + b, 0);
    expect(r1.lendario / total).toBeLessThan(0.12);
  });

  it('quanto mais fundo no submundo, mais lendário e mítico; Necrótico nunca na loja do Valtinho', () => {
    const r1 = rarities(1);
    const r2 = rarities(2);
    const r3 = rarities(3);
    expect(r2.mitico).toBeGreaterThan(0);
    expect(r3.mitico).toBeGreaterThan(r2.mitico);
    expect(r3.lendario).toBeGreaterThan(r1.lendario);
    expect(r1.necrotico + r2.necrotico + r3.necrotico).toBe(0);
  });
});

describe('mecânicas dos rivais', () => {
  it('Seu Arlindo: batida com carroça dele dói em dobro', () => {
    const s = table('arlindo', { player: [t(0, 0), t(1, 2)], tioZe: [t(4, 4)], turn: 'tioZe', hearts: { player: 5 } });
    const out = act(s, 'PLAY', { actor: 'tioZe', tileId: '4-4', side: 'right' });
    expect(out.roundResult.kind).toBe('bucha');
    expect(out.hearts.player).toBe(5 - out.roundResult.damage);
    expect(out.roundResult.damage).toBe(4);
    expect(lastOf(out, 'proc').text).toContain('REI DA BUCHA');
  });

  it('Beto Cigano: cada compra sua do dorme paga $2 para ele', () => {
    const s = table('beto', { player: [t(0, 0)], tioZe: [t(6, 6)], boneyard: [t(1, 1), t(2, 2)], coins: { player: 9 } });
    const out = act(s, 'DRAW', { actor: 'player' });
    expect(out.coins.player).toBe(7);
    expect(out.coins.tioZe).toBe(s.coins.tioZe + 2);
    const broke = act({ ...s, coins: { ...s.coins, player: 0 } }, 'DRAW', { actor: 'player' });
    expect(broke.coins.player).toBe(0);
    expect(broke.hands.player).toHaveLength(2);
  });

  it('Cida da Marmita: quando você passa, ela recupera 1 coração', () => {
    const s = table('cida', { player: [t(0, 0)], tioZe: [t(6, 6), t(5, 5)], hearts: { tioZe: 2 } });
    const out = act(s, 'PASS', { actor: 'player' });
    expect(out.hearts.tioZe).toBe(3);
    const full = act({ ...s, hearts: { ...s.hearts, tioZe: RIVALS.cida.hearts } }, 'PASS', { actor: 'player' });
    expect(full.hearts.tioZe).toBe(RIVALS.cida.hearts);
  });

  it('Carlinhos Mão Leve: jogada dele que casa as duas pontas rouba $2', () => {
    // mesa [3|5][5|4]: pontas 3 e 4; o [3|4] dele casa as duas
    const board = placeTile(placeTile(createEmptyBoard(), t(3, 5), 'root'), t(4, 5), 'right');
    const s = table('carlinhos', { player: [t(0, 0)], tioZe: [t(3, 4), t(6, 6)], turn: 'tioZe', board, coins: { player: 5 } });
    const out = act(s, 'PLAY', { actor: 'tioZe', tileId: '3-4', side: 'left' });
    expect(out.coins.player).toBe(3);
    expect(out.coins.tioZe).toBe(s.coins.tioZe + 2);
    expect(lastOf(out, 'proc').text).toContain('MÃO LEVE');
    const plain = act(s, 'PLAY', { actor: 'tioZe', tileId: '6-6', side: 'left' });
    expect(plain).toBe(s); // [6|6] não encaixa; nada muda
  });

  it('Comendador Moreira: imune ao primeiro dano de tranca da partida', () => {
    const s = table('comendador', { player: [t(0, 0)], tioZe: [t(6, 6)], hearts: { tioZe: 7 } });
    const first = dev(s, 'forceTranca');
    expect(first.roundResult.winner).toBe('player');
    expect(first.roundResult.shielded).toBe(true);
    expect(first.hearts.tioZe).toBe(7);
    expect(first.nextStarter).toBe('player');
    const again = dev({ ...first, phase: 'playing' }, 'forceTranca');
    expect(again.hearts.tioZe).toBe(6);
  });

  it('Alemão do Ferro Velho: as pedras dele pesam o dobro na tranca', () => {
    const s = table('alemao', { player: [t(4, 5)], tioZe: [t(2, 3)] });
    expect(trancaTileValues(s).tioZe(t(2, 3))).toBe(10);
    const out = dev(s, 'forceTranca'); // você 9 × ele 5→10
    expect(out.roundResult.winner).toBe('player');
  });

  it('Paulinho vê a sua pedra mais pesada; Madama Sofia prevê as suas buchas', () => {
    const hand = [t(0, 1), t(5, 6), t(2, 2), t(3, 3)];
    const paulinho = table('paulinho', { player: hand, tioZe: [t(1, 1)] });
    expect(knownPlayerTiles(paulinho).map((x) => x.id)).toEqual(['5-6']);
    const sofia = table('sofia', { player: hand, tioZe: [t(1, 1)] });
    expect(knownPlayerTiles(sofia).map((x) => x.id).sort()).toEqual(['2-2', '3-3']);
    expect(knownPlayerTiles(table('tioZe', { player: hand, tioZe: [t(1, 1)] }))).toEqual([]);
  });
});

describe('Livro de Boteco', () => {
  it('descobrir junta só o que é novo e devolve a mesma coleção quando nada mudou', () => {
    const empty = { relics: [], tiles: [], rivals: [] };
    const once = discover(empty, { relics: ['caneca', 'caneca'], rivals: ['tioZe'] });
    expect(once).toEqual({ relics: ['caneca'], tiles: [], rivals: ['tioZe'] });
    expect(discover(once, { relics: ['caneca'], rivals: ['tioZe'] })).toBe(once);
    expect(discover(once, { tiles: ['ouro'] }).tiles).toEqual(['ouro']);
  });
});
