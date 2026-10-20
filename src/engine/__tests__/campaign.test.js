import { describe, expect, it } from 'vitest';
import { NODES, TOTAL_NODES } from '../../data/campaign.js';
import { RELICS } from '../../data/relics.js';
import { ENHANCEMENTS } from '../../data/enhancedTiles.js';
import { RIVALS } from '../../data/rivals.js';
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

/** Vence o nó atual pelo mapa: entra, vence (DEV), abre a loja e volta para o mapa. */
function clearNode(s, seed = 1) {
  let next = act(s, 'ENTER_NODE', { deck: deck(seed) });
  next = dev(next, 'winMatch');
  if (next.phase === 'runWon') return next;
  next = act(next, 'OPEN_SHOP');
  return act(next, 'LEAVE_SHOP');
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

describe('mapa da campanha', () => {
  it('NOVO JOGO para no mapa, no 1º nó (Tio Zé)', () => {
    const s = freshRun();
    expect(s.phase).toBe('map');
    expect(s.run).toMatchObject({ node: 0, cleared: [], match: 0 });
    expect(s.rivalId).toBe('tioZe');
    expect(s.hearts.player).toBe(MAX_HEARTS);
    expect(act(s, 'PLAY', { actor: 'player', tileId: '0-0', side: 'root' })).toBe(s);
  });

  it('entrar no nó abre a mesa; vencer marca o X, libera o próximo e volta ao mapa pela loja', () => {
    let s = act(freshRun(), 'ENTER_NODE', { deck: deck() });
    expect(s.phase).toBe('playing');
    expect(s.rivalId).toBe('tioZe');
    s = dev(s, 'winMatch');
    expect(s.phase).toBe('matchWon');
    expect(s.run.cleared).toEqual([0]);
    expect(s.run.node).toBe(1);
    s = act(s, 'OPEN_SHOP');
    expect(s.shop.nextRivalId).toBe('tonho');
    s = act(s, 'LEAVE_SHOP');
    expect(s.phase).toBe('map');
    expect(s.shop).toBeNull();
    expect(s.rivalId).toBe('tonho');
    s = act(s, 'ENTER_NODE', { deck: deck(2) });
    expect(s.rivalId).toBe('tonho');
    expect(s.hearts.tioZe).toBe(RIVALS.tonho.hearts);
  });

  it('os seus corações continuam entre os nós: vencer cura 2, vencer chefe cura tudo', () => {
    let s = act(freshRun(), 'ENTER_NODE', { deck: deck() });
    s = { ...s, hearts: { ...s.hearts, player: 1 } };
    s = dev(s, 'winMatch');
    expect(s.hearts.player).toBe(3);
    expect(s.roundResult.heal).toBe(2);
    s = act(act(s, 'OPEN_SHOP'), 'LEAVE_SHOP');
    s = act(s, 'ENTER_NODE', { deck: deck(3) });
    expect(s.hearts.player).toBe(3); // não volta cheio na mesa nova

    // chefe da região 1 (nó 6)
    let boss = dev(s, 'setRival', { rivalId: 'arlindo', deck: deck(4) });
    expect(boss.run.node).toBe(5);
    boss = { ...boss, hearts: { ...boss.hearts, player: 1 } };
    boss = dev(boss, 'winMatch');
    expect(boss.hearts.player).toBe(MAX_HEARTS);
    expect(lastOf(boss, 'duelEnd')).toMatchObject({ boss: true, heal: MAX_HEARTS - 1 });
  });

  it('as 18 mesas em ordem; vencer o Comendador encerra a run', () => {
    let s = freshRun(3);
    const seen = [];
    for (let i = 0; i < TOTAL_NODES; i += 1) {
      expect(s.phase).toBe('map');
      seen.push(s.rivalId);
      s = clearNode(s, i + 10);
    }
    expect(seen).toEqual(NODES.map((n) => n.rivalId));
    expect(s.phase).toBe('runWon');
    expect(s.run.cleared).toHaveLength(TOTAL_NODES);
    expect(lastOf(s, 'duelEnd')).toMatchObject({ runWon: true });
    expect(s.coins.player).toBeGreaterThanOrEqual(MATCH_PRIZE * TOTAL_NODES);
  });
});

describe('save da run', () => {
  it('CONTINUAR volta exatamente: nó, vida, moedas, talismãs e pedras de grife', () => {
    let s = clearNode(clearNode(freshRun(21), 1), 2);
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
    expect(loaded.rivalId).toBe('baiano');
    expect(loaded.seed).toBe(s.seed);

    const table = act(loaded, 'ENTER_NODE', { deck: deck(5) });
    expect(table.rivalId).toBe('baiano');
    expect(table.hearts.player).toBe(3);
  });

  it('save tirado na loja reabre a loja do mesmo nó', () => {
    let s = act(freshRun(4), 'ENTER_NODE', { deck: deck() });
    s = act(dev(s, 'winMatch'), 'OPEN_SHOP');
    const loaded = act(createInitialState(), 'LOAD_RUN', { save: snapshotRun(s, 'shop') });
    expect(loaded.phase).toBe('shop');
    expect(loaded.shop.relics).toHaveLength(3);
    expect(loaded.shop.nextRivalId).toBe('tonho');
    expect(act(loaded, 'LEAVE_SHOP').phase).toBe('map');
  });

  it('a vitrine salva volta igual (o que você comprou continua vendido)', () => {
    let s = act(freshRun(8), 'ENTER_NODE', { deck: deck() });
    s = act(dev(s, 'winMatch'), 'OPEN_SHOP');
    s = dev(s, 'addCoins', { amount: 40 });
    s = act(s, 'SHOP_BUY_RELIC', { index: 1 });
    s = act(s, 'SHOP_REROLL');
    s = act(s, 'SHOP_BUY_RELIC', { index: 0 });
    const loaded = act(createInitialState(), 'LOAD_RUN', { save: JSON.parse(JSON.stringify(snapshotRun(s, 'shop'))) });
    expect(loaded.shop.relics).toEqual(s.shop.relics);
    expect(loaded.shop.tiles).toEqual(s.shop.tiles);
    expect(loaded.shop.rerollCost).toBe(5);
    expect(loaded.relics.player).toEqual(s.relics.player);
    expect(snapshotRun(s, 'map').shop).toBeNull();
  });

  it('save quebrado ou de outra versão é ignorado', () => {
    const s = createInitialState();
    const good = snapshotRun(freshRun(), 'map');
    for (const bad of [
      null,
      { ...good, v: 99 },
      { ...good, node: 18 },
      { ...good, hearts: 0 },
      { ...good, relics: ['naoExiste'] },
      { ...good, deck: { '1-1': 'plutonio' } },
      { ...good, resume: 'playing' },
      { ...good, deck: { '9-9': 'ouro' } },
      { ...good, shop: { relics: [{ id: 'naoExiste', price: 1, sold: false }], tiles: [], rerolls: 0, rerollCost: 3 } },
    ]) {
      expect(isValidSave(bad)).toBe(false);
      expect(act(s, 'LOAD_RUN', { save: bad })).toBe(s);
    }
  });
});

describe('loja por região', () => {
  function rarities(node, samples = 160) {
    const count = { comum: 0, raro: 0, lendario: 0, mitico: 0 };
    for (let seed = 1; seed <= samples; seed += 1) {
      const s = { ...freshRun(seed), run: { node, cleared: [], match: 1, history: [] } };
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

  it('quanto mais fundo no submundo, mais lendário e mítico', () => {
    const r1 = rarities(1);
    const r2 = rarities(7);
    const r3 = rarities(13);
    expect(r2.mitico).toBeGreaterThan(0);
    expect(r3.mitico).toBeGreaterThan(r2.mitico);
    expect(r3.lendario).toBeGreaterThan(r1.lendario);
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
