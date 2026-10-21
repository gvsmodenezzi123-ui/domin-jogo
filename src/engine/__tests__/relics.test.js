import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction } from '../../ai/tioZeAI.js';
import { ENHANCEMENTS, ENHANCEMENT_IDS, GOLD_PLAY_COINS, GOLD_WIN_COINS } from '../../data/enhancedTiles.js';
import { RARITY_ORDER } from '../../data/rarities.js';
import { RELICS, RELIC_IDS, RELIC_SLOTS } from '../../data/relics.js';
import { RIVALS } from '../../data/rivals.js';
import {
  FULL_SET,
  MAX_HEARTS,
  STARTING_COINS,
  createEmptyBoard,
  getOpenEnds,
  getPlacement,
  getValidSides,
  makeTile,
  placeTile,
} from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { canUndo, endMarksFor, revealedTioZeTiles, rulesFor } from '../powers.js';

const t = (a, b) => makeTile(a, b);
const enh = (tile, enhancement) => ({ ...tile, enhancement });
const RIVAL_HEARTS = RIVALS.tioZe.hearts;

/** Mesa montada a partir da raiz: left/right são as pedras de cada ponta, em ordem. */
function boardFrom(root, left = [], right = []) {
  let board = placeTile(createEmptyBoard(), root, 'root');
  for (const tile of left) board = placeTile(board, tile, 'left');
  for (const tile of right) board = placeTile(board, tile, 'right');
  return board;
}

/** Partida em andamento com mãos, mesa e dorme escolhidos a dedo. */
function scenario({
  player,
  tioZe,
  board = boardFrom(t(3, 4)),
  boneyard = [],
  relics = [],
  rivalRelics,
  rivalId,
  turn = 'player',
  coins,
  hearts,
}) {
  const s = gameReducer(createInitialState(), { type: 'START_DUEL', deck: FULL_SET.slice(), relics, rivalId });
  return {
    ...s,
    hands: { player, tioZe },
    board,
    boneyard,
    turn,
    openingTileId: null,
    coins: { ...s.coins, ...coins },
    hearts: { ...s.hearts, ...hearts },
    relics: { player: relics, tioZe: rivalRelics ?? s.relics.tioZe },
  };
}

const play = (s, tileId, side, actor = 'player') => gameReducer(s, { type: 'PLAY', actor, tileId, side });
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);

describe('encaixe com regras extras', () => {
  const board = boardFrom(t(3, 4)); // pontas 3 e 4

  it('curinga aceita qualquer pedra e prefere fechar múltiplo de 5', () => {
    const placement = getPlacement(t(1, 2), board, 'right', { wildSides: ['right'] });
    expect(placement).toEqual({ inner: 1, outer: 2, via: 'wild' });
    expect(getValidSides(t(0, 6), board, { wildSides: ['right'] })).toEqual(['right']);
  });

  it('±1 só encaixa com 1 de diferença, e o lado certo encosta', () => {
    expect(getPlacement(t(5, 6), board, 'right', { fuzzy: true })).toEqual({ inner: 5, outer: 6, via: 'fuzzy' });
    expect(getPlacement(t(5, 6), board, 'left', { fuzzy: true })).toBeNull();
    expect(getPlacement(t(6, 6), board, 'right', { fuzzy: true })).toBeNull();
  });

  it('ponta travada não aceita nada; [0|0] de aço encaixa em qualquer ponta', () => {
    expect(getValidSides(t(4, 5), board, { frozenSides: ['right'] })).toEqual([]);
    expect(getValidSides(t(0, 0), board, { steelZero: true })).toEqual(['left', 'right']);
    const steel = placeTile(board, t(0, 0), 'left', { steelZero: true });
    expect(getOpenEnds(steel)).toEqual({ left: 0, right: 4 });
    expect(steel.left[0].via).toBe('steel');
  });

  it('a pedra aprimorada leva o aprimoramento (e quem jogou) para a mesa', () => {
    const placed = placeTile(board, enh(t(4, 5), 'ouro'), 'right', undefined, { by: 'player' });
    expect(placed.right[0]).toMatchObject({ enhancement: 'ouro', by: 'player' });
  });
});

describe('peças aprimoradas', () => {
  it('Ouro: +$4 ao jogar e +$10 ao vencer a rodada com ela na mesa', () => {
    let s = scenario({ player: [enh(t(4, 5), 'ouro'), t(0, 0)], tioZe: [t(6, 6)], boneyard: [t(1, 1)] });
    s = play(s, '4-5', 'right');
    expect(s.coins.player).toBe(STARTING_COINS + GOLD_PLAY_COINS);

    let w = scenario({ player: [enh(t(4, 5), 'ouro')], tioZe: [t(6, 6)], boneyard: [t(1, 1)] });
    w = play(w, '4-5', 'right');
    expect(w.phase).toBe('roundOver');
    expect(w.coins.player).toBe(STARTING_COINS + GOLD_PLAY_COINS + GOLD_WIN_COINS);
  });

  it('Rubi: se o rival compra ou passa logo depois, toma 1 de dano (uma vez)', () => {
    let s = scenario({
      player: [enh(t(4, 5), 'rubi'), t(0, 0)],
      tioZe: [t(6, 6), t(1, 1)],
      boneyard: [t(2, 6), t(1, 2), t(0, 2)],
    });
    s = play(s, '4-5', 'right');
    expect(s.fx.ruby).toBe('tioZe');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' }); // compra
    expect(s.hearts.tioZe).toBe(RIVAL_HEARTS - 1);
    expect(lastOf(s, 'heartLost')).toMatchObject({ who: 'tioZe', reason: 'rubi', direct: true });
    s = gameReducer(s, { type: 'TIO_ZE_ACT' }); // compra de novo: sem dano extra
    expect(s.hearts.tioZe).toBe(RIVAL_HEARTS - 1);
  });

  it('Rubi: se o rival joga, desarma sem dano', () => {
    let s = scenario({ player: [enh(t(4, 5), 'rubi'), t(0, 0)], tioZe: [t(5, 6), t(1, 1)], boneyard: [t(2, 2)] });
    s = play(s, '4-5', 'right');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.board.right).toHaveLength(2);
    expect(s.hearts.tioZe).toBe(RIVAL_HEARTS);
    expect(s.fx.ruby).toBeNull();
  });

  it('Cristal: a ponta vira curinga só para a sua próxima jogada', () => {
    let s = scenario({
      player: [enh(t(3, 5), 'cristal'), t(0, 1), t(2, 2)],
      tioZe: [t(4, 6), t(1, 1)],
      boneyard: [t(2, 3)],
    });
    s = play(s, '3-5', 'left'); // pontas: 5 (curinga) e 4
    expect(endMarksFor(s)).toEqual({ left: 'wild' });
    expect(rulesFor(s, 'tioZe').wildSides).toBeUndefined();
    expect(play(s, '1-1', 'left', 'tioZe')).toBe(s);
    s = play(s, '4-6', 'right', 'tioZe');
    expect(s.turn).toBe('player');
    // 0|1 não tem 5, mas entra na ponta curinga; prefere encostar o 1 (mais perto do 5)
    expect(getValidSides(t(0, 1), s.board, rulesFor(s, 'player'))).toEqual(['left']);
    s = play(s, '0-1', 'left');
    expect(getOpenEnds(s.board).left).toBe(0);
    expect(s.board.left.at(-1).via).toBe('wild');
    expect(s.fx.wild).toBeNull();
  });

  it('Cristal: se o rival cobrir a pedra, o curinga some', () => {
    let s = scenario({ player: [enh(t(3, 5), 'cristal'), t(0, 1)], tioZe: [t(5, 6), t(1, 1)], boneyard: [t(2, 3)] });
    s = play(s, '3-5', 'left');
    s = play(s, '5-6', 'left', 'tioZe');
    expect(endMarksFor(s)).toEqual({});
    expect(getValidSides(t(0, 1), s.board, rulesFor(s, 'player'))).toEqual([]);
  });

  it('Chumbo: o rival não joga naquela ponta durante a vez dele', () => {
    let s = scenario({
      player: [enh(t(4, 5), 'chumbo'), t(0, 0)],
      tioZe: [t(5, 6), t(1, 1)],
      boneyard: [t(2, 2), t(1, 2)],
    });
    s = play(s, '4-5', 'right');
    expect(s.fx.frozen.tioZe).toEqual(['right']);
    expect(endMarksFor(s)).toEqual({ right: 'frozen' });
    expect(play(s, '5-6', 'right', 'tioZe')).toBe(s);
    expect(decideTioZeAction(buildTioZeView(s, 'tioZe')).type).toBe('DRAW');
    s = gameReducer(s, { type: 'PASS', actor: 'tioZe' });
    expect(s.turn).toBe('player');
    expect(s.fx.frozen.tioZe).toEqual([]); // derreteu no fim da vez dele
  });

  it('Fantasma: jogar não passa a vez', () => {
    let s = scenario({ player: [enh(t(4, 5), 'fantasma'), t(5, 6), t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 2)] });
    s = play(s, '4-5', 'right');
    expect(s.turn).toBe('player');
    expect(lastOf(s, 'proc')).toMatchObject({ id: 'fantasma' });
    s = play(s, '5-6', 'right');
    expect(s.turn).toBe('tioZe');
  });

  it('cada aprimoramento tem nome, raridade, preço, cor e descrição', () => {
    expect(ENHANCEMENT_IDS).toEqual(['ouro', 'rubi', 'cristal', 'chumbo', 'fantasma']);
    const rarity = Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, ENHANCEMENTS[id].rarity]));
    expect(rarity).toEqual({ ouro: 'raro', rubi: 'mitico', cristal: 'lendario', chumbo: 'lendario', fantasma: 'mitico' });
    for (const id of ENHANCEMENT_IDS) {
      expect(ENHANCEMENTS[id]).toMatchObject({ id, name: expect.any(String), color: expect.any(String) });
      expect(ENHANCEMENTS[id].price).toBeGreaterThan(0);
      expect(ENHANCEMENTS[id].description.length).toBeGreaterThan(10);
    }
  });
});

describe('talismãs (seus)', () => {
  it('Caneca de Chopp: bucha não gasta a vez (inclusive a de abertura)', () => {
    let s = scenario({ player: [t(4, 4), t(0, 1), t(2, 2)], tioZe: [t(1, 1)], boneyard: [t(2, 3)], relics: ['caneca'] });
    s = play(s, '4-4', 'right');
    expect(s.turn).toBe('player');

    const deck = [t(6, 6), t(0, 1), t(0, 2), t(1, 2), t(1, 3), t(2, 3), t(0, 3)];
    const used = new Set(deck.map((x) => x.id));
    const full = [...deck, ...FULL_SET.filter((x) => !used.has(x.id))];
    let d = gameReducer(createInitialState(), { type: 'START_DUEL', deck: full, relics: ['caneca'] });
    d = play(d, '6-6', 'root');
    expect(d.turn).toBe('player');
  });

  it('Olho de Vidro: revela as 2 pedras mais altas do rival', () => {
    const s = scenario({ player: [t(0, 0)], tioZe: [t(1, 2), t(6, 6), t(5, 6), t(0, 0)], relics: ['olhoDeVidro'] });
    expect(revealedTioZeTiles(s).map((x) => x.id)).toEqual(['6-6', '5-6']);
    expect(revealedTioZeTiles({ ...s, relics: { player: [], tioZe: [] } })).toEqual([]);
  });

  it('Borracha Escolar: uma vez por rodada encaixa com ±1', () => {
    let s = scenario({ player: [t(5, 6), t(0, 2), t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 3)], relics: ['borracha'] });
    expect(getValidSides(t(5, 6), s.board, rulesFor(s, 'player'))).toEqual(['right']);
    s = play(s, '5-6', 'right');
    expect(s.fx.used.player).toContain('borracha');
    expect(getOpenEnds(s.board)).toEqual({ left: 3, right: 6 });
    expect(getValidSides(t(0, 2), s.board, rulesFor(s, 'player'))).toEqual([]);
  });

  it('Cinzeiro de Bar: +$2 quando o rival compra ou passa', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(6, 6)], boneyard: [t(1, 1), t(2, 2)], relics: ['cinzeiro'], turn: 'tioZe' });
    s = gameReducer(s, { type: 'DRAW', actor: 'tioZe' });
    expect(s.coins.player).toBe(STARTING_COINS + 2);
    s = gameReducer(s, { type: 'PASS', actor: 'tioZe' });
    expect(s.coins.player).toBe(STARTING_COINS + 4);
  });

  it('Dado Viciado: começa a rodada com pelo menos duas pedras de 6', () => {
    const player = [t(0, 0), t(0, 1), t(0, 2), t(0, 3), t(0, 4), t(0, 5), t(1, 1)];
    const used = new Set(player.map((x) => x.id));
    const deck = [...player, ...FULL_SET.filter((x) => !used.has(x.id))];
    const s = gameReducer(createInitialState(), { type: 'START_DUEL', deck, relics: ['dadoViciado'] });
    expect(s.hands.player.filter((x) => x.a === 6 || x.b === 6).length).toBeGreaterThanOrEqual(2);
    const ids = [...s.hands.player, ...s.hands.tioZe, ...s.boneyard].map((x) => x.id);
    expect(new Set(ids).size).toBe(28);
  });

  it('Barbante Mágico: vê 3 pedras, escolhe uma e as outras vão pro fundo do dorme', () => {
    let s = scenario({
      player: [t(0, 0)],
      tioZe: [t(6, 6)],
      boneyard: [t(1, 1), t(2, 2), t(5, 5), t(0, 1)],
      relics: ['barbante'],
    });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.pending).toMatchObject({ type: 'drawChoice' });
    expect(s.pending.options.map((x) => x.id)).toEqual(['1-1', '2-2', '5-5']);
    expect(gameReducer(s, { type: 'PASS', actor: 'player' })).toBe(s);
    s = gameReducer(s, { type: 'DRAW_PICK', tileId: '2-2' });
    expect(s.pending).toBeNull();
    expect(s.hands.player.map((x) => x.id)).toEqual(['0-0', '2-2']);
    expect(s.boneyard.map((x) => x.id)).toEqual(['0-1', '1-1', '5-5']);
  });

  it('Giz de Sinuca: múltiplo de 5 deixa descartar 1 pedra (o rival espera)', () => {
    let s = scenario({ player: [t(2, 4), t(6, 6), t(1, 5)], tioZe: [t(1, 1)], boneyard: [t(0, 0)], relics: ['giz'] });
    s = play(s, '2-4', 'right'); // pontas 3 + 2 = 5
    expect(s.pending).toEqual({ type: 'discard' });
    expect(gameReducer(s, { type: 'TIO_ZE_ACT' })).toBe(s);
    s = gameReducer(s, { type: 'DISCARD', tileId: '6-6' });
    expect(s.pending).toBeNull();
    expect(s.hands.player.map((x) => x.id)).toEqual(['1-5']);
    expect(s.boneyard.at(-1).id).toBe('6-6');
    expect(s.turn).toBe('tioZe');
  });

  it('Chave de Fenda: suas buchas valem 0 na tranca', () => {
    const base = { player: [t(6, 6), t(5, 5)], tioZe: [t(0, 1)], boneyard: [t(2, 2)] };
    const without = gameReducer(scenario(base), { type: 'DEV', op: 'forceTranca' });
    expect(without.roundResult).toMatchObject({ winner: 'tioZe', reason: 'forcada' });
    const withKey = gameReducer(scenario({ ...base, relics: ['chaveDeFenda'] }), { type: 'DEV', op: 'forceTranca' });
    expect(withKey.roundResult).toMatchObject({ winner: 'player', sums: { player: 0, tioZe: 1 } });
  });

  it('Dedal de Chumbo e Espelho Retrovisor: 2 compras seguidas do rival custam 1 coração; a pedra comprada aparece', () => {
    let s = scenario({
      player: [t(0, 0)],
      tioZe: [t(6, 6)],
      boneyard: [t(1, 1), t(2, 2), t(1, 2)],
      relics: ['dedal', 'espelho'],
      turn: 'tioZe',
    });
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.hearts.tioZe).toBe(RIVAL_HEARTS);
    expect(revealedTioZeTiles(s).map((x) => x.id)).toEqual(['1-1']);
    expect(lastOf(s, 'proc').text).toContain('1|1');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.hearts.tioZe).toBe(RIVAL_HEARTS - 1);
    expect(lastOf(s, 'heartLost')).toMatchObject({ reason: 'dedal' });
    expect(revealedTioZeTiles(s).map((x) => x.id)).toEqual(['2-2']);
  });

  it('Anel do Bicheiro: pontas iguais tiram $3 do rival, ou 1 coração se ele não tiver', () => {
    const board = boardFrom(t(3, 4), [t(3, 6)]); // pontas 6 e 4
    let s = scenario({ player: [t(4, 6), t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 2)], board, relics: ['anel'] });
    s = play(s, '4-6', 'right');
    expect(s.coins.tioZe).toBe(RIVALS.tioZe.coins - 3);
    expect(s.hearts.tioZe).toBe(RIVAL_HEARTS);

    let broke = scenario({
      player: [t(4, 6), t(0, 0)],
      tioZe: [t(1, 1)],
      boneyard: [t(2, 2)],
      board,
      relics: ['anel'],
      coins: { tioZe: 2 },
    });
    broke = play(broke, '4-6', 'right');
    expect(broke.coins.tioZe).toBe(2);
    expect(broke.hearts.tioZe).toBe(RIVAL_HEARTS - 1);
  });

  it('Bucha de Aço: [0|0] encaixa em qualquer ponta', () => {
    let s = scenario({ player: [t(0, 0), t(6, 6)], tioZe: [t(1, 1)], boneyard: [t(2, 2)], relics: ['buchaDeAco'] });
    expect(getValidSides(t(0, 0), s.board, rulesFor(s, 'player'))).toEqual(['left', 'right']);
    s = play(s, '0-0', 'left');
    expect(getOpenEnds(s.board).left).toBe(0);
    expect(lastOf(s, 'proc')).toMatchObject({ id: 'buchaDeAco' });
  });

  it('Carteira Recheada e Mão Grande: +1 de dano a cada $15, e dobro com o rival de mão cheia', () => {
    const tioZe4 = [t(1, 1), t(2, 2), t(5, 5), t(0, 1)];
    const rich = scenario({ player: [t(4, 6)], tioZe: tioZe4, boneyard: [], relics: ['carteira'], coins: { player: 30 } });
    expect(play(rich, '4-6', 'right').roundResult.damage).toBe(3);

    const big = scenario({ player: [t(4, 6)], tioZe: tioZe4, boneyard: [], relics: ['maoGrande'] });
    expect(play(big, '4-6', 'right').roundResult.damage).toBe(2);
    const small = scenario({ player: [t(4, 6)], tioZe: tioZe4.slice(0, 3), boneyard: [], relics: ['maoGrande'] });
    expect(play(small, '4-6', 'right').roundResult.damage).toBe(1);

    // soma primeiro, dobra depois: (1 + 1) × 2 — e 4 de dano derruba o rival de 3 corações
    const both = scenario({
      player: [t(4, 6)],
      tioZe: tioZe4,
      boneyard: [],
      relics: ['maoGrande', 'carteira'],
      coins: { player: 15 },
    });
    const done = play(both, '4-6', 'right');
    expect(done.roundResult.damage).toBe(4);
    expect(done.hearts.tioZe).toBe(0);
    expect(done.phase).toBe('matchWon');
  });

  it('Relógio Quebrado: desfaz a última jogada do rival (uma vez por rodada), devolvendo até o bônus', () => {
    let s = scenario({ player: [t(0, 0), t(6, 6)], tioZe: [t(2, 4), t(1, 1)], boneyard: [t(5, 5)], relics: ['relogio'], turn: 'tioZe' });
    s = play(s, '2-4', 'right', 'tioZe'); // 3 + 2 = 5: +$3 pra ele
    expect(s.coins.tioZe).toBe(RIVALS.tioZe.coins + 3);
    expect(canUndo(s)).toBe(true);
    s = gameReducer(s, { type: 'UNDO' });
    expect(s.board.right).toHaveLength(0);
    expect(s.hands.tioZe.map((x) => x.id)).toContain('2-4');
    expect(s.coins.tioZe).toBe(RIVALS.tioZe.coins);
    expect(s.turn).toBe('player');
    expect(canUndo(s)).toBe(false);
    expect(gameReducer(s, { type: 'UNDO' })).toBe(s);
  });

  it('Relógio Quebrado: a chance acaba quando a sua vez termina', () => {
    let s = scenario({ player: [t(0, 0), t(6, 6)], tioZe: [t(4, 5), t(1, 1)], boneyard: [t(2, 2), t(1, 2)], relics: ['relogio'], turn: 'tioZe' });
    s = play(s, '4-5', 'right', 'tioZe');
    // nada encaixa: a 1ª compra é obrigatória antes de passar (Patch 0.5.4)
    expect(gameReducer(s, { type: 'PASS', actor: 'player' })).toBe(s);
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.fx.undo).not.toBeNull();
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.fx.undo).toBeNull();
  });

  it('todas as 15 relíquias têm raridade, preço e ícone 12x12 com paleta', () => {
    expect(RELIC_IDS).toHaveLength(15);
    for (const id of RELIC_IDS) {
      const relic = RELICS[id];
      expect(relic.id).toBe(id);
      expect(RARITY_ORDER).toContain(relic.rarity);
      expect(relic.price).toBeGreaterThan(0);
      expect(relic.name && relic.short && relic.description).toBeTruthy();
      expect(relic.icon).toHaveLength(12);
      for (const row of relic.icon) {
        expect(row).toHaveLength(12);
        for (const ch of row) if (ch !== '.') expect(relic.palette[ch], `${id}: cor '${ch}'`).toBeTruthy();
      }
    }
    // faixas de preço por raridade
    const range = { comum: [4, 6], raro: [7, 10], lendario: [12, 16], mitico: [18, 25] };
    for (const item of [...Object.values(RELICS), ...Object.values(ENHANCEMENTS)]) {
      const [lo, hi] = range[item.rarity];
      expect(item.price, item.id).toBeGreaterThanOrEqual(lo);
      expect(item.price, item.id).toBeLessThanOrEqual(hi);
    }
  });
});

describe('talismãs e pedras dos rivais', () => {
  it('Cinzeiro do Marcão: ele ganha +$2 quando VOCÊ compra ou passa', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(6, 6)], boneyard: [t(1, 1), t(2, 2)], rivalId: 'marcao' });
    expect(s.relics.tioZe).toEqual(['cinzeiro']);
    const coins = s.coins.tioZe;
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.coins.tioZe).toBe(coins + 2);
    expect(lastOf(s, 'proc')).toMatchObject({ id: 'cinzeiro', tone: 'enemy' });
  });

  it('Dedal da Dona Neide: duas compras seguidas suas custam 1 coração seu', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(6, 6)], boneyard: [t(1, 1), t(2, 2), t(1, 2)], rivalId: 'neide' });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.hearts.player).toBe(MAX_HEARTS);
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.hearts.player).toBe(MAX_HEARTS - 1);
    expect(lastOf(s, 'heartLost')).toMatchObject({ who: 'player', reason: 'dedal' });
  });

  it('Anel do Beto: se a jogada dele deixa as pontas iguais, você perde $3', () => {
    const board = boardFrom(t(3, 4), [t(3, 6)]); // pontas 6 e 4
    let s = scenario({ player: [t(0, 0)], tioZe: [t(4, 6), t(1, 1)], boneyard: [t(2, 2)], board, rivalId: 'beto', turn: 'tioZe' });
    s = play(s, '4-6', 'right', 'tioZe');
    expect(s.coins.player).toBe(STARTING_COINS - 3);
  });

  it('Chave de Fenda do Seu Arlindo: as buchas DELE valem 0 na tranca', () => {
    const s = scenario({ player: [t(0, 1)], tioZe: [t(6, 6), t(5, 5)], boneyard: [t(2, 2)], rivalId: 'arlindo' });
    const done = gameReducer(s, { type: 'DEV', op: 'forceTranca' });
    expect(done.roundResult).toMatchObject({ winner: 'tioZe', sums: { player: 1, tioZe: 0 } });
  });

  it('Chumbo do Tião Navalha: a pedra dele trava a SUA ponta durante a sua vez', () => {
    let s = scenario({
      player: [t(5, 6), t(0, 0)],
      tioZe: [enh(t(4, 6), 'chumbo'), t(1, 1)],
      boneyard: [t(2, 2), t(1, 2)],
      rivalId: 'tiao',
      turn: 'tioZe',
    });
    s = play(s, '4-6', 'right', 'tioZe'); // pontas 3 e 6, a da direita travada para você
    expect(s.fx.frozen.player).toEqual(['right']);
    expect(endMarksFor(s)).toEqual({ right: 'blocked' });
    expect(play(s, '5-6', 'right')).toBe(s);
    s = gameReducer(s, { type: 'DRAW', actor: 'player' }); // nada encaixa: compra antes de passar
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.fx.frozen.player).toEqual([]);
  });

  it('o rival nunca recebe as SUAS pedras aprimoradas; o Valdir recebe o Chumbo dele', () => {
    const deck = [
      ...[t(0, 0), t(0, 1), t(0, 2), t(0, 3), t(0, 4), t(0, 5), t(0, 6)],
      ...[t(3, 5), t(1, 1), t(1, 2), t(1, 3), t(1, 4), t(1, 5), t(1, 6)],
    ];
    const used = new Set(deck.map((x) => x.id));
    const full = [...deck, ...FULL_SET.filter((x) => !used.has(x.id))];
    const s = gameReducer(createInitialState(), {
      type: 'START_DUEL',
      deck: full,
      rivalId: 'valdir',
      playerDeck: { '1-1': 'ouro', '0-0': 'rubi' },
    });
    const byId = (seat, id) => s.hands[seat].find((x) => x.id === id);
    expect(byId('player', '0-0').enhancement).toBe('rubi');
    expect(byId('tioZe', '1-1').enhancement).toBeUndefined(); // o seu [1|1] de ouro, na mão dele, é comum
    expect(byId('tioZe', '3-5').enhancement).toBe('chumbo');
    expect(s.hearts.tioZe).toBe(3);
  });
});

describe('painel DEV', () => {
  const dev = (s, op, extra = {}) => gameReducer(s, { type: 'DEV', op, ...extra });

  it('adiciona pedra à mão: do dorme, do rival ou como cópia se estiver na mesa', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(5, 6)], boneyard: [t(2, 2)] });
    s = dev(s, 'addTile', { a: 2, b: 2, enhancement: 'ouro' });
    expect(s.boneyard).toHaveLength(0);
    expect(s.hands.player.at(-1)).toMatchObject({ id: '2-2', enhancement: 'ouro' });
    s = dev(s, 'addTile', { a: 6, b: 5, enhancement: 'nenhuma' });
    expect(s.hands.tioZe).toHaveLength(0);
    expect(s.hands.player.at(-1)).toEqual({ id: '5-6', a: 5, b: 6 });
    s = dev(s, 'addTile', { a: 4, b: 3 }); // 3|4 é a raiz da mesa
    expect(s.hands.player.at(-1).id).toBe('3-4#2');
    s = dev(s, 'addTile', { a: 0, b: 0, enhancement: 'cristal' }); // já na mão: só aprimora
    expect(s.hands.player.filter((x) => x.id === '0-0')).toEqual([{ id: '0-0', a: 0, b: 0, enhancement: 'cristal' }]);
  });

  it('equipa e remove talismãs, no máximo 4', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(1, 1)] });
    for (const id of RELIC_IDS.slice(0, 5)) s = dev(s, 'toggleRelic', { id });
    expect(s.relics.player).toEqual(RELIC_IDS.slice(0, RELIC_SLOTS));
    s = dev(s, 'toggleRelic', { id: RELIC_IDS[0] });
    expect(s.relics.player).toEqual(RELIC_IDS.slice(1, RELIC_SLOTS));
  });

  it('moedas, vidas, dano no rival (com nocaute), esvaziar a mão dele e limpar a mesa', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(1, 1), t(5, 6)], boneyard: [t(2, 2)], hearts: { player: 2 } });
    s = dev(s, 'addCoins');
    expect(s.coins.player).toBe(STARTING_COINS + 10);
    s = dev(s, 'resetHearts');
    expect(s.hearts).toEqual({ player: MAX_HEARTS, tioZe: RIVAL_HEARTS });
    s = dev(s, 'emptyTioZeHand');
    expect(s.hands.tioZe).toHaveLength(0);
    expect(s.boneyard.map((x) => x.id)).toEqual(['2-2', '1-1', '5-6']);
    s = dev(s, 'clearBoard');
    expect(s.board.root).toBeNull();
    expect(s.boneyard.at(-1).id).toBe('3-4');
    for (let i = 0; i < RIVAL_HEARTS; i += 1) s = dev(s, 'damageTioZe');
    expect(s.phase).toBe('matchWon');
    expect(s.duelWinner).toBe('player');
    expect(s.roundResult.kind).toBe('nocaute');
  });

  it('com a mão e a mesa vazias, o rival devolve a vez em vez de travar', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 2)], turn: 'tioZe' });
    s = dev(s, 'emptyTioZeHand');
    s = dev(s, 'clearBoard');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.turn).toBe('player');
  });
});
