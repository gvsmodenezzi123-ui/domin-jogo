import { describe, expect, it } from 'vitest';
import { BASIC_COMMON_IDS, LOCKED_RELIC_IDS, RELICS, isRelicAvailable } from '../../data/relics.js';
import { buildMarket } from '../blackMarket.js';
import { DAMAGE, FULL_SET, classifyBatida, createEmptyBoard, getOpenEnds, getPlacement, makeTile, placeTile } from '../dominoLogic.js';
import { directDamage } from '../effects.js';
import { foreseenRivalTile } from '../foresight.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { canUseCanivete, endMarksFor, passAvailabilityFor, revealedTioZeTiles, rulesFor } from '../powers.js';
import { buildShop, sellPriceFor, sellPriceOf } from '../shop.js';

const t = (a, b) => makeTile(a, b);
const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const play = (s, tileId, side, actor = 'player') => act(s, 'PLAY', { actor, tileId, side });
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);
const procs = (s, id) => s.events.filter((e) => e.type === 'proc' && e.id === id);

/** Mesa com mãos, mesa e talismãs escolhidos (pontas 3 e 4 por padrão). */
function table({ player, tioZe = [t(1, 1), t(2, 2)], board, boneyard = [], relics = [], rivalRelics = [], coins, hearts, turn = 'player', seed = 1, rivalDeck }) {
  const s = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), seed });
  return {
    ...s,
    hands: { player, tioZe },
    board: board ?? placeTile(createEmptyBoard(), t(3, 4), 'root'),
    boneyard,
    turn,
    openingTileId: null,
    relics: { player: relics, tioZe: rivalRelics },
    decks: { player: {}, tioZe: rivalDeck ?? {} },
    coins: { ...s.coins, ...coins },
    hearts: { ...s.hearts, ...hearts },
    roundStartHearts: { player: 5, tioZe: 3 },
  };
}

const boardOf = (root, left = [], right = []) => {
  let b = placeTile(createEmptyBoard(), root, 'root');
  for (const x of left) b = placeTile(b, x, 'left');
  for (const x of right) b = placeTile(b, x, 'right');
  return b;
};

describe('Patch 0.7.0: cadastro dos 20 talismãs novos', () => {
  const NEW = [
    'palitoDente', 'moedaFurada', 'panoChao', 'tampaGarrafa', 'radioPilha', 'fosforo',
    'oculosFundo', 'canivete', 'trucoMarcado', 'abridorLata', 'cinzeiroBitucas', 'notaTres',
    'fitaCrepe', 'espelhoBanheiro', 'balancaAcougue', 'relogioParede',
    'caliceGalo', 'dedoCadaver', 'testamento', 'dadoOsso',
  ];

  it('20 novos com raridade, preço na faixa e arte; 10 trancados por conquista', () => {
    const rarity = { comum: 6, raro: 6, lendario: 4, necrotico: 4 };
    for (const [r, n] of Object.entries(rarity)) expect(NEW.filter((id) => RELICS[id].rarity === r), r).toHaveLength(n);
    for (const id of NEW) {
      expect(RELICS[id], id).toBeTruthy();
      expect(RELICS[id].art, id).toBe(id);
      expect(RELICS[id].description.length, id).toBeGreaterThan(20);
    }
    // (versão 1.4: os 18 talismãs novos também são de conquista, ver patch140.test.js)
    expect(LOCKED_RELIC_IDS.filter((id) => NEW.includes(id)).sort()).toEqual(
      ['moedaFurada', 'tampaGarrafa', 'fosforo', 'trucoMarcado', 'abridorLata', 'notaTres', 'fitaCrepe', 'balancaAcougue', 'caliceGalo', 'dadoOsso'].sort(),
    );
    expect(BASIC_COMMON_IDS).toEqual(['caneca', 'borracha', 'cinzeiro', 'giz', 'palitoDente', 'panoChao', 'radioPilha']);
  });

  it('trancado não sai na loja nem no beco até ser liberado', () => {
    for (let seed = 1; seed <= 120; seed += 1) {
      const s = { ...act(createInitialState(), 'NEW_RUN', { seed }), run: { node: 'r3-f1-l1', cleared: [], path: [], match: 0, history: [] } };
      for (let r = 0; r < 3; r += 1) for (const o of buildShop(s, r).relics) expect(isRelicAvailable(o.id, []), o.id).toBe(true);
      for (const o of buildMarket(s).offers) expect(LOCKED_RELIC_IDS).not.toContain(o.id);
    }
    // liberados, aparecem
    const seen = new Set();
    for (let seed = 1; seed <= 200; seed += 1) {
      const s = { ...act(createInitialState(), 'NEW_RUN', { seed, unlocks: LOCKED_RELIC_IDS }), run: { node: 'r3-f1-l1', cleared: [], path: [], match: 0, history: [] } };
      for (let r = 0; r < 3; r += 1) for (const o of buildShop(s, r).relics) seen.add(o.id);
      for (const o of buildMarket(s).offers) seen.add(o.id);
    }
    for (const id of LOCKED_RELIC_IDS) expect(seen.has(id), id).toBe(true);
  });

  it('UNLOCK_RELICS libera na hora para as próximas vitrines (e sobrevive ao voltar para o menu)', () => {
    let s = act(createInitialState(), 'NEW_RUN', { seed: 3 });
    expect(s.unlocks).toEqual([]);
    s = act(s, 'UNLOCK_RELICS', { ids: ['moedaFurada', 'naoExiste'] });
    expect(s.unlocks).toEqual(['moedaFurada']);
    expect(act(s, 'UNLOCK_RELICS', { ids: ['moedaFurada'] })).toBe(s);
    expect(act(s, 'RETURN_TO_TITLE').unlocks).toEqual(['moedaFurada']);
  });
});

describe('comuns', () => {
  it('Palito de Dente: a 1ª pedra ímpar da rodada dá +$2 (só uma vez)', () => {
    let s = table({ player: [t(4, 5), t(4, 1), t(6, 6)], boneyard: [t(0, 0)], relics: ['palitoDente'], coins: { player: 0 } });
    s = play(s, '4-5', 'right'); // 9: ímpar
    expect(s.coins.player).toBe(2);
    s = { ...s, turn: 'player' };
    s = play(s, '1-4', 'right');
    expect(s.coins.player).toBe(2);
    expect(procs(s, 'palitoDente')).toHaveLength(1);
  });

  it('Moeda Furada: o passe estratégico custa $1', () => {
    const s = table({ player: [t(4, 5)], boneyard: [t(0, 0)], relics: ['moedaFurada'], coins: { player: 1 } });
    expect(passAvailabilityFor(s)).toEqual({ allowed: true, cost: 1, reason: null });
    expect(act(s, 'PASS', { actor: 'player' }).coins.player).toBe(0);
    expect(passAvailabilityFor({ ...s, relics: { player: [], tioZe: [] } }).cost).toBe(3);
  });

  it('Pano de Chão Úmido: bucha numa ponta trava ela para o rival', () => {
    const s = table({ player: [t(4, 4), t(0, 1)], tioZe: [t(4, 6), t(2, 2)], boneyard: [t(0, 0)], relics: ['panoChao'] });
    const after = play(s, '4-4', 'right');
    expect(after.fx.frozen.tioZe).toContain('right');
    expect(rulesFor(after, 'tioZe').frozenSides).toContain('right');
  });

  it('Tampa de Garrafa: rodada sem bucha na mão dá +$4', () => {
    const noDoubles = [t(0, 1), t(0, 2), t(0, 3), t(0, 4), t(0, 5), t(0, 6), t(1, 2)];
    const deck = [...noDoubles, ...FULL_SET.filter((x) => !noDoubles.some((y) => y.id === x.id))];
    const s = act(createInitialState(), 'START_DUEL', { deck, relics: ['tampaGarrafa'] });
    expect(s.coins.player).toBe(5 + 4);
    expect(procs(s, 'tampaGarrafa')).toHaveLength(1);
  });

  it('Rádio de Pilha: em soma par, às vezes (15%) o rival compra por engano', () => {
    let hits = 0;
    let tries = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const s = table({ player: [t(4, 6), t(0, 0)], boneyard: [t(1, 2), t(2, 3), t(5, 5)], relics: ['radioPilha'], seed });
      const after = play(s, '4-6', 'right'); // pontas 3 e 6: 9 (ímpar)
      expect(after.hands.tioZe).toHaveLength(2);
      const even = play(s, '4-6', 'right');
      tries += 1;
      if (even.hands.tioZe.length > 2) hits += 1;
    }
    expect(tries).toBe(300);
    expect(hits).toBe(0); // soma ímpar nunca dispara
    let evenHits = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const s = table({ player: [t(4, 5), t(0, 0)], boneyard: [t(1, 2), t(2, 3), t(5, 5)], relics: ['radioPilha'], seed });
      const after = play(s, '4-5', 'right'); // pontas 3 e 5: 8 (par)
      if (after.hands.tioZe.length === 3) {
        evenHits += 1;
        expect(lastOf(after, 'drawTile')).toMatchObject({ by: 'tioZe', forced: true });
      }
    }
    expect(evenHits).toBeGreaterThan(20);
    expect(evenHits).toBeLessThan(80);
    // 900 jogadas: no runner do GitHub, com os outros arquivos rodando junto, passa dos 5 s padrão
  }, 30000);

  it('Fósforo Riscado: a 1ª compra da rodada mostra a próxima do topo', () => {
    let s = table({ player: [t(6, 6)], boneyard: [t(0, 0), t(1, 2), t(2, 5)], relics: ['fosforo'], coins: { player: 10 } });
    s = act(s, 'DRAW', { actor: 'player' });
    expect(procs(s, 'fosforo').at(-1).text).toContain('[1|2]');
    s = act(s, 'DRAW', { actor: 'player' });
    expect(procs(s, 'fosforo')).toHaveLength(1);
  });
});

describe('raros', () => {
  it('Óculos Fundo de Garrafa: na vez do rival, mostra a pedra que ele vai jogar', () => {
    const s = table({ player: [t(0, 0)], tioZe: [t(4, 6), t(1, 1)], boneyard: [t(2, 2)], relics: ['oculosFundo'], turn: 'tioZe' });
    const seen = foreseenRivalTile(s);
    expect(seen?.id).toBe('4-6');
    const after = act(s, 'TIO_ZE_ACT');
    expect(lastOf(after, 'tilePlaced').tileId).toBe('4-6');
    expect(foreseenRivalTile({ ...s, relics: { player: [], tioZe: [] } })).toBeNull();
    expect(foreseenRivalTile({ ...s, turn: 'player' })).toBeNull();
  });

  it('Canivete Suíço: 1x por partida, uma pedra vira a bucha do número maior', () => {
    let s = table({ player: [t(2, 5), t(0, 1)], boneyard: [t(0, 0)], relics: ['canivete'] });
    expect(canUseCanivete(s)).toBe(true);
    s = act(s, 'USE_CANIVETE');
    expect(s.pending).toEqual({ type: 'canivete' });
    expect(act(s, 'CANCEL_CANIVETE').pending).toBeNull();
    s = act(s, 'CANIVETE_PICK', { tileId: '2-5' });
    const double = s.hands.player.find((x) => x.a === 5 && x.b === 5);
    expect(double).toBeTruthy();
    expect(double.id.startsWith('5-5#c')).toBe(true);
    expect(s.hands.player.some((x) => x.id === '2-5')).toBe(false);
    expect(canUseCanivete(s)).toBe(false);
    expect(act(s, 'USE_CANIVETE')).toBe(s);
  });

  it('Baralho de Truco Marcado: múltiplo de 5 com ponta 4 tira 1 coração do rival', () => {
    const s = table({ player: [t(1, 6), t(0, 0)], board: boardOf(t(4, 6)), boneyard: [t(2, 2)], relics: ['trucoMarcado'], hearts: { tioZe: 3 } });
    const after = play(s, '1-6', 'right'); // pontas 4 e 1: 5
    expect(lastOf(after, 'bonus5')).toBeTruthy();
    expect(after.hearts.tioZe).toBe(2);
    // múltiplo de 5 sem ponta 4: nada
    const plain = table({ player: [t(2, 6), t(0, 0)], board: boardOf(t(3, 6)), boneyard: [t(2, 2)], relics: ['trucoMarcado'], hearts: { tioZe: 3 } });
    expect(play(plain, '2-6', 'right').hearts.tioZe).toBe(3);
  });

  it('Abridor de Lata: batida +1 se o rival ainda tiver 2 pedras ou mais', () => {
    const s = table({ player: [t(4, 6)], tioZe: [t(1, 1), t(2, 2)], boneyard: [t(0, 0)], relics: ['abridorLata'], hearts: { tioZe: 5 } });
    expect(play(s, '4-6', 'right').roundResult.damage).toBe(2);
    const one = table({ player: [t(4, 6)], tioZe: [t(1, 1)], boneyard: [t(0, 0)], relics: ['abridorLata'], hearts: { tioZe: 5 } });
    expect(play(one, '4-6', 'right').roundResult.damage).toBe(1);
  });

  it('Cinzeiro Cheio de Bitucas: o rival passou 2 vezes seguidas, uma pedra dele fica à mostra', () => {
    let s = table({ player: [t(6, 6), t(5, 5)], tioZe: [t(0, 0), t(1, 2)], boneyard: [], relics: ['cinzeiroBitucas'], turn: 'tioZe' });
    s = act(s, 'PASS', { actor: 'tioZe' });
    expect(revealedTioZeTiles(s)).toHaveLength(0);
    s = { ...s, turn: 'tioZe', consecutivePasses: 0 };
    s = act(s, 'PASS', { actor: 'tioZe' });
    expect(revealedTioZeTiles(s).map((x) => x.id)).toEqual(['1-2']);
  });

  it('Nota de 3 Reais: o 1º reembaralhar da visita é de graça', () => {
    const base = { ...act(createInitialState(), 'NEW_RUN', { seed: 4 }), run: { node: 'r1-f2-l0', cleared: [], path: [], match: 0, history: [] } };
    const s = { ...base, relics: { player: ['notaTres'], tioZe: [] } };
    expect(buildShop(s, 0).rerollCost).toBe(0);
    expect(buildShop(s, 1).rerollCost).toBe(5);
    expect(buildShop(base, 0).rerollCost).toBe(3);
  });
});

describe('lendários', () => {
  it('Fita Crepe: 1x por partida joga duas pedras grudadas', () => {
    let s = table({ player: [t(4, 6), t(6, 1), t(0, 0)], boneyard: [t(2, 2)], relics: ['fitaCrepe'] });
    s = play(s, '4-6', 'right'); // abre o 6 e você tem [6|1]
    expect(s.turn).toBe('player');
    expect(procs(s, 'fitaCrepe')).toHaveLength(1);
    s = play(s, '1-6', 'right');
    expect(s.turn).toBe('tioZe'); // a segunda já não ganha outra
    expect(s.matchFx.fitaUsed.player).toBe(true);
  });

  it('Espelho de Banheiro Trincado: a pedra de grife do rival vira material da sua pedra mais pesada', () => {
    const s = table({
      player: [t(6, 5), t(0, 1)],
      tioZe: [{ ...t(4, 6), enhancement: 'ouro' }, t(1, 1)],
      rivalDeck: { '4-6': 'ouro' },
      boneyard: [t(2, 2)],
      relics: ['espelhoBanheiro'],
      turn: 'tioZe',
    });
    const after = play(s, '4-6', 'right', 'tioZe');
    const copied = after.hands.player.find((x) => x.id === '5-6');
    expect(copied).toMatchObject({ enhancement: 'ouro', copied: true });
    expect(after.hands.player.find((x) => x.id === '0-1').enhancement).toBeUndefined();
  });

  it('Balança de Açougue: na tranca, sua soma tem 10 a menos', () => {
    const s = table({ player: [t(6, 6), t(1, 2)], tioZe: [t(3, 5)], relics: ['balancaAcougue'], hearts: { tioZe: 5 } });
    const r = act(s, 'DEV', { op: 'forceTranca' });
    expect(r.roundResult.sums).toEqual({ player: 5, tioZe: 8 });
    expect(r.roundResult.winner).toBe('player');
  });

  it('Relógio de Parede do Bar: com 4 pedras na mesa, a ponta direita vira curinga na sua vez', () => {
    const board = boardOf(t(3, 4), [t(3, 1)], [t(4, 5), t(5, 2)]); // 4 pedras, pontas 1 e 2
    const s = table({ player: [t(6, 6)], board, boneyard: [t(0, 0)], relics: ['relogioParede'] });
    expect(rulesFor(s, 'player').wildSides).toEqual(['right']);
    expect(getPlacement(t(6, 6), board, 'right', rulesFor(s, 'player'))).toMatchObject({ via: 'wild' });
    expect(endMarksFor(s).right).toBe('wild');
    const three = table({ player: [t(6, 6)], board: boardOf(t(3, 4), [t(3, 1)], [t(4, 5)]), relics: ['relogioParede'] });
    expect(rulesFor(three, 'player').wildSides).toBeUndefined();
  });
});

describe('necróticos', () => {
  it('Cálice de Sangue de Galo: batida de bucha dá 5; cada compra custa 1 coração (nunca o último)', () => {
    const s = table({ player: [t(4, 4)], tioZe: [t(1, 1)], board: boardOf(t(3, 4)), boneyard: [t(0, 0)], relics: ['caliceGalo'], hearts: { tioZe: 7 } });
    const r = play(s, '4-4', 'right');
    expect(classifyBatida(t(4, 4), getOpenEnds(s.board))).toBe('bucha');
    expect(r.roundResult.damage).toBe(5);
    let d = table({ player: [t(6, 6)], boneyard: [t(0, 0), t(0, 1), t(1, 2), t(2, 5)], relics: ['caliceGalo'], hearts: { player: 2 }, coins: { player: 9 } });
    d = act(d, 'DRAW', { actor: 'player' });
    expect(d.hearts.player).toBe(1);
    d = act(d, 'DRAW', { actor: 'player' });
    expect(d.hearts.player).toBe(1);
  });

  it('Dedo de Cadáver: sem jogada, o rival compra até encaixar; revenda vira $0', () => {
    const s = table({
      player: [t(6, 6)],
      tioZe: [t(0, 0), t(1, 1)],
      boneyard: [t(1, 2), t(2, 2), t(0, 3), t(5, 5)],
      relics: ['dedoCadaver'],
      turn: 'tioZe',
    });
    const after = act(s, 'TIO_ZE_ACT');
    expect(procs(after, 'dedoCadaver').at(-1).text).toContain('COMPROU 3');
    expect(lastOf(after, 'tilePlaced')).toMatchObject({ by: 'tioZe', tileId: '0-3' });
    expect(sellPriceFor(after, 'caneca')).toBe(0);
    expect(sellPriceOf('caneca')).toBe(2);
  });

  it('Testamento Rasgado: golpe fatal recomeça a rodada e queima 2 talismãs (ele e mais um)', () => {
    const s = table({
      player: [t(6, 6), t(5, 5)],
      tioZe: [t(4, 6)],
      boneyard: [t(0, 0)],
      relics: ['caneca', 'testamento', 'giz'],
      hearts: { player: 1, tioZe: 2 },
      turn: 'tioZe',
    });
    const hit = play(s, '4-6', 'right', 'tioZe');
    expect(hit.phase).toBe('roundOver');
    expect(hit.roundResult).toMatchObject({ kind: 'testamento', winner: null, burned: ['testamento', 'giz'] });
    expect(hit.hearts).toEqual({ player: 5, tioZe: 3 });
    expect(hit.relics.player).toEqual(['caneca']);
    const next = act(hit, 'NEXT_ROUND', { deck: FULL_SET.slice() });
    expect(next.phase).toBe('playing');
    // direto no meio da rodada também
    const direct = table({ player: [t(6, 6)], tioZe: [t(1, 1)], relics: ['testamento'], hearts: { player: 1 } });
    const dead = act(directDamage(direct, 'player', 1, 'dedal'), 'DEV', { op: 'damageTioZe' });
    expect(dead.phase).not.toBe('gameOver');
  });

  it('Dado de Osso Humano: toda pedra sua encaixa em ponta 6; passar custa 1 coração', () => {
    const board = boardOf(t(3, 6));
    const s = table({ player: [t(1, 2), t(0, 0)], board, boneyard: [], relics: ['dadoOsso'], hearts: { player: 3 }, coins: { player: 9 } });
    expect(getPlacement(t(1, 2), board, 'right', rulesFor(s, 'player'))).toMatchObject({ via: 'six' });
    expect(getPlacement(t(1, 2), board, 'left', rulesFor(s, 'player'))).toBeNull();
    const placed = play(s, '1-2', 'right');
    expect(placed.board.right).toHaveLength(1);
    const passed = act(s, 'PASS', { actor: 'player' });
    expect(passed.hearts.player).toBe(2);
    const last = act({ ...s, hearts: { ...s.hearts, player: 1 } }, 'PASS', { actor: 'player' });
    expect(last.hearts.player).toBe(1);
    expect(DAMAGE.normal).toBe(1);
  });
});
