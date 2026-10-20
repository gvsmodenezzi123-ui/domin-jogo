import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction } from '../../ai/tioZeAI.js';
import { ENHANCEMENTS, ENHANCEMENT_IDS, GOLD_PLAY_COINS, GOLD_WIN_COINS } from '../../data/enhancedTiles.js';
import { RELICS, RELIC_IDS, RELIC_SLOTS } from '../../data/relics.js';
import {
  FULL_SET,
  MAX_HEARTS,
  STARTING_COINS,
  boardTilesInOrder,
  createEmptyBoard,
  createSeededRng,
  getOpenEnds,
  getPlacement,
  getValidSides,
  makeTile,
  placeTile,
  shuffle,
} from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { canUndo, endMarksFor, revealedTioZeTiles, rulesFor } from '../powers.js';

const t = (a, b) => makeTile(a, b);
const enh = (tile, enhancement) => ({ ...tile, enhancement });

/** Mesa montada a partir da raiz: left/right são as pedras de cada ponta, em ordem. */
function boardFrom(root, left = [], right = []) {
  let board = placeTile(createEmptyBoard(), root, 'root');
  for (const tile of left) board = placeTile(board, tile, 'left');
  for (const tile of right) board = placeTile(board, tile, 'right');
  return board;
}

/** Duelo em andamento com mãos, mesa e dorme escolhidos a dedo. */
function scenario({ player, tioZe, board = boardFrom(t(3, 4)), boneyard = [], relics = [], turn = 'player', coins, hearts }) {
  const s = gameReducer(createInitialState(), { type: 'START_DUEL', deck: FULL_SET.slice(), relics });
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

const play = (s, tileId, side, actor = 'player') => gameReducer(s, { type: 'PLAY', actor, tileId, side });
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);

describe('encaixe com regras extras', () => {
  const board = boardFrom(t(3, 4)); // pontas 3 e 4

  it('curinga aceita qualquer pedra e prefere fechar múltiplo de 5', () => {
    // ponta direita (4) curinga, esquerda 3: 1|2 com o 2 de fora soma 5
    const placement = getPlacement(t(1, 2), board, 'right', { wildSides: ['right'] });
    expect(placement).toEqual({ inner: 1, outer: 2, via: 'wild' });
    expect(getValidSides(t(0, 6), board, { wildSides: ['right'] })).toEqual(['right']);
  });

  it('±1 só encaixa com 1 de diferença, e o lado certo encosta', () => {
    expect(getPlacement(t(5, 6), board, 'right', { fuzzy: true })).toEqual({ inner: 5, outer: 6, via: 'fuzzy' });
    expect(getPlacement(t(5, 6), board, 'left', { fuzzy: true })).toBeNull();
    expect(getPlacement(t(6, 6), board, 'right', { fuzzy: true })).toBeNull();
  });

  it('ponta congelada não aceita nada; [0|0] de aço encaixa em qualquer ponta', () => {
    expect(getValidSides(t(4, 5), board, { frozenSides: ['right'] })).toEqual([]);
    expect(getValidSides(t(0, 0), board, { steelZero: true })).toEqual(['left', 'right']);
    const steel = placeTile(board, t(0, 0), 'left', { steelZero: true });
    expect(getOpenEnds(steel)).toEqual({ left: 0, right: 4 });
    expect(steel.left[0].via).toBe('steel');
  });

  it('a pedra aprimorada leva o aprimoramento para a mesa', () => {
    const placed = placeTile(board, enh(t(4, 5), 'ouro'), 'right');
    expect(placed.right[0].enhancement).toBe('ouro');
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

  it('Rubi: se o Tio Zé compra ou passa logo depois, toma 1 de dano (uma vez)', () => {
    let s = scenario({
      player: [enh(t(4, 5), 'rubi'), t(0, 0)],
      tioZe: [t(6, 6), t(1, 1)],
      boneyard: [t(2, 6), t(1, 2), t(0, 2)],
    });
    s = play(s, '4-5', 'right');
    expect(s.fx.rubyArmed).toBe(true);
    s = gameReducer(s, { type: 'TIO_ZE_ACT' }); // compra
    expect(s.hearts.tioZe).toBe(MAX_HEARTS - 1);
    expect(lastOf(s, 'heartLost')).toMatchObject({ who: 'tioZe', reason: 'rubi', direct: true });
    s = gameReducer(s, { type: 'TIO_ZE_ACT' }); // compra de novo: sem dano extra
    expect(s.hearts.tioZe).toBe(MAX_HEARTS - 1);
  });

  it('Rubi: se o Tio Zé joga, desarma sem dano', () => {
    let s = scenario({ player: [enh(t(4, 5), 'rubi'), t(0, 0)], tioZe: [t(5, 6), t(1, 1)], boneyard: [t(2, 2)] });
    s = play(s, '4-5', 'right');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.board.right).toHaveLength(2);
    expect(s.hearts.tioZe).toBe(MAX_HEARTS);
    expect(s.fx.rubyArmed).toBe(false);
  });

  it('Cristal: a ponta vira curinga só para a sua próxima jogada', () => {
    let s = scenario({
      player: [enh(t(3, 5), 'cristal'), t(0, 1), t(2, 2)],
      tioZe: [t(4, 6), t(1, 1)],
      boneyard: [t(2, 3)],
    });
    s = play(s, '3-5', 'left'); // pontas: 5 (curinga) e 4
    expect(endMarksFor(s)).toEqual({ left: 'wild' });
    // para o Tio Zé vale o número normal
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

  it('Cristal: se o Tio Zé cobrir a pedra, o curinga some', () => {
    let s = scenario({ player: [enh(t(3, 5), 'cristal'), t(0, 1)], tioZe: [t(5, 6), t(1, 1)], boneyard: [t(2, 3)] });
    s = play(s, '3-5', 'left');
    s = play(s, '5-6', 'left', 'tioZe');
    expect(endMarksFor(s)).toEqual({});
    expect(getValidSides(t(0, 1), s.board, rulesFor(s, 'player'))).toEqual([]);
  });

  it('Chumbo: o Tio Zé não joga naquela ponta durante a vez dele', () => {
    let s = scenario({
      player: [enh(t(4, 5), 'chumbo'), t(0, 0)],
      tioZe: [t(5, 6), t(1, 1)],
      boneyard: [t(2, 2), t(1, 2)],
    });
    s = play(s, '4-5', 'right');
    expect(s.fx.frozenSides).toEqual(['right']);
    expect(endMarksFor(s)).toEqual({ right: 'frozen' });
    expect(play(s, '5-6', 'right', 'tioZe')).toBe(s);
    expect(decideTioZeAction(buildTioZeView(s, 'tioZe')).type).toBe('DRAW');
    s = gameReducer(s, { type: 'PASS', actor: 'tioZe' });
    expect(s.turn).toBe('player');
    expect(s.fx.frozenSides).toEqual([]); // derreteu no fim da vez dele
  });

  it('Fantasma: jogar não passa a vez', () => {
    let s = scenario({ player: [enh(t(4, 5), 'fantasma'), t(5, 6), t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 2)] });
    s = play(s, '4-5', 'right');
    expect(s.turn).toBe('player');
    expect(lastOf(s, 'proc')).toMatchObject({ id: 'fantasma' });
    s = play(s, '5-6', 'right');
    expect(s.turn).toBe('tioZe');
  });

  it('cada aprimoramento tem nome, cor e descrição', () => {
    expect(ENHANCEMENT_IDS).toEqual(['ouro', 'rubi', 'cristal', 'chumbo', 'fantasma']);
    for (const id of ENHANCEMENT_IDS) {
      expect(ENHANCEMENTS[id]).toMatchObject({ id, name: expect.any(String), color: expect.any(String) });
      expect(ENHANCEMENTS[id].description.length).toBeGreaterThan(10);
    }
  });
});

describe('relíquias', () => {
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

  it('Olho de Vidro: revela as 2 pedras mais altas do Tio Zé', () => {
    const s = scenario({ player: [t(0, 0)], tioZe: [t(1, 2), t(6, 6), t(5, 6), t(0, 0)], relics: ['olhoDeVidro'] });
    expect(revealedTioZeTiles(s).map((x) => x.id)).toEqual(['6-6', '5-6']);
    expect(revealedTioZeTiles({ ...s, relics: [] })).toEqual([]);
  });

  it('Borracha Escolar: uma vez por rodada encaixa com ±1', () => {
    let s = scenario({ player: [t(5, 6), t(0, 2), t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 3)], relics: ['borracha'] });
    expect(getValidSides(t(5, 6), s.board, rulesFor(s, 'player'))).toEqual(['right']);
    s = play(s, '5-6', 'right');
    expect(s.fx.borrachaUsed).toBe(true);
    expect(getOpenEnds(s.board)).toEqual({ left: 3, right: 6 });
    // gastou: 0|2 (2 = 3−1) não encaixa mais
    expect(getValidSides(t(0, 2), s.board, rulesFor(s, 'player'))).toEqual([]);
  });

  it('Cinzeiro de Bar: +$2 quando o Tio Zé compra ou passa', () => {
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

  it('Barbante no Dedo: vê 2 pedras, escolhe uma e a outra vai pro fundo do dorme', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(6, 6)], boneyard: [t(1, 1), t(2, 2), t(5, 5)], relics: ['barbante'] });
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.pending).toMatchObject({ type: 'drawChoice' });
    expect(s.pending.options.map((x) => x.id)).toEqual(['1-1', '2-2']);
    expect(gameReducer(s, { type: 'PASS', actor: 'player' })).toBe(s);
    s = gameReducer(s, { type: 'DRAW_PICK', tileId: '2-2' });
    expect(s.pending).toBeNull();
    expect(s.hands.player.map((x) => x.id)).toEqual(['0-0', '2-2']);
    expect(s.boneyard.map((x) => x.id)).toEqual(['5-5', '1-1']);
  });

  it('Giz de Sinuca: múltiplo de 5 deixa descartar 1 pedra (o Tio Zé espera)', () => {
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

  it('Dedal de Chumbo e Espelho Retrovisor: 2 compras seguidas custam 1 coração; a pedra comprada aparece', () => {
    let s = scenario({
      player: [t(0, 0)],
      tioZe: [t(6, 6)],
      boneyard: [t(1, 1), t(2, 2), t(1, 2)],
      relics: ['dedal', 'espelho'],
      turn: 'tioZe',
    });
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.hearts.tioZe).toBe(MAX_HEARTS);
    expect(revealedTioZeTiles(s).map((x) => x.id)).toEqual(['1-1']);
    expect(lastOf(s, 'proc').text).toContain('1|1');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.hearts.tioZe).toBe(MAX_HEARTS - 1);
    expect(lastOf(s, 'heartLost')).toMatchObject({ reason: 'dedal' });
    expect(revealedTioZeTiles(s).map((x) => x.id)).toEqual(['2-2']);
  });

  it('Anel do Bicheiro: pontas iguais tiram $3 do Tio Zé, ou 1 coração se ele não tiver', () => {
    const board = boardFrom(t(3, 4), [t(3, 6)]); // pontas 6 e 4
    let s = scenario({ player: [t(4, 6), t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 2)], board, relics: ['anel'] });
    s = play(s, '4-6', 'right');
    expect(s.coins.tioZe).toBe(STARTING_COINS - 3);
    expect(s.hearts.tioZe).toBe(MAX_HEARTS);

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
    expect(broke.hearts.tioZe).toBe(MAX_HEARTS - 1);
  });

  it('Bucha de Aço: [0|0] encaixa em qualquer ponta', () => {
    let s = scenario({ player: [t(0, 0), t(6, 6)], tioZe: [t(1, 1)], boneyard: [t(2, 2)], relics: ['buchaDeAco'] });
    expect(getValidSides(t(0, 0), s.board, rulesFor(s, 'player'))).toEqual(['left', 'right']);
    s = play(s, '0-0', 'left');
    expect(getOpenEnds(s.board).left).toBe(0);
    expect(lastOf(s, 'proc')).toMatchObject({ id: 'buchaDeAco' });
  });

  it('Carteira Recheada e Mão Grande: +1 de dano a cada $15, e dobro com o Tio Zé de mão cheia', () => {
    const tioZe4 = [t(1, 1), t(2, 2), t(5, 5), t(0, 1)];
    const rich = scenario({ player: [t(4, 6)], tioZe: tioZe4, boneyard: [], relics: ['carteira'], coins: { player: 30 } });
    expect(play(rich, '4-6', 'right').roundResult.damage).toBe(3);

    const big = scenario({ player: [t(4, 6)], tioZe: tioZe4, boneyard: [], relics: ['maoGrande'] });
    expect(play(big, '4-6', 'right').roundResult.damage).toBe(2);
    const small = scenario({ player: [t(4, 6)], tioZe: tioZe4.slice(0, 3), boneyard: [], relics: ['maoGrande'] });
    expect(play(small, '4-6', 'right').roundResult.damage).toBe(1);

    // soma primeiro, dobra depois: (1 + 1) × 2
    const both = scenario({
      player: [t(4, 6)],
      tioZe: tioZe4,
      boneyard: [],
      relics: ['maoGrande', 'carteira'],
      coins: { player: 15 },
    });
    const done = play(both, '4-6', 'right');
    expect(done.roundResult.damage).toBe(4);
    expect(done.hearts.tioZe).toBe(MAX_HEARTS - 4);
  });

  it('Relógio Quebrado: desfaz a última jogada do Tio Zé (uma vez por rodada), devolvendo até o bônus', () => {
    let s = scenario({ player: [t(0, 0), t(6, 6)], tioZe: [t(2, 4), t(1, 1)], boneyard: [t(5, 5)], relics: ['relogio'], turn: 'tioZe' });
    s = play(s, '2-4', 'right', 'tioZe'); // 3 + 2 = 5: +$3 pra ele
    expect(s.coins.tioZe).toBe(STARTING_COINS + 3);
    expect(canUndo(s)).toBe(true);
    s = gameReducer(s, { type: 'UNDO' });
    expect(s.board.right).toHaveLength(0);
    expect(s.hands.tioZe.map((x) => x.id)).toContain('2-4');
    expect(s.coins.tioZe).toBe(STARTING_COINS);
    expect(s.turn).toBe('player');
    expect(canUndo(s)).toBe(false);
    expect(gameReducer(s, { type: 'UNDO' })).toBe(s);
  });

  it('Relógio Quebrado: a chance acaba quando a sua vez termina', () => {
    let s = scenario({ player: [t(0, 0), t(6, 6)], tioZe: [t(4, 5), t(1, 1)], boneyard: [t(2, 2)], relics: ['relogio'], turn: 'tioZe' });
    s = play(s, '4-5', 'right', 'tioZe');
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.fx.undo).toBeNull();
  });

  it('todas as 15 relíquias têm dados completos e ícone 12x12 com paleta', () => {
    expect(RELIC_IDS).toHaveLength(15);
    for (const id of RELIC_IDS) {
      const relic = RELICS[id];
      expect(relic.id).toBe(id);
      expect(['comum', 'rara', 'lendaria']).toContain(relic.rarity);
      expect(relic.name && relic.short && relic.description).toBeTruthy();
      expect(relic.icon).toHaveLength(12);
      for (const row of relic.icon) {
        expect(row).toHaveLength(12);
        for (const ch of row) if (ch !== '.') expect(relic.palette[ch], `${id}: cor '${ch}'`).toBeTruthy();
      }
    }
  });
});

describe('painel DEV', () => {
  const dev = (s, op, extra = {}) => gameReducer(s, { type: 'DEV', op, ...extra });

  it('adiciona pedra à mão: do dorme, do Tio Zé ou como cópia se estiver na mesa', () => {
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

  it('equipa e remove relíquias, no máximo 4', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(1, 1)] });
    for (const id of RELIC_IDS.slice(0, 5)) s = dev(s, 'toggleRelic', { id });
    expect(s.relics).toEqual(RELIC_IDS.slice(0, RELIC_SLOTS));
    s = dev(s, 'toggleRelic', { id: RELIC_IDS[0] });
    expect(s.relics).toEqual(RELIC_IDS.slice(1, RELIC_SLOTS));
  });

  it('moedas, vidas, dano no Tio Zé (com nocaute), esvaziar a mão dele e limpar a mesa', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(1, 1), t(5, 6)], boneyard: [t(2, 2)], hearts: { player: 2 } });
    s = dev(s, 'addCoins');
    expect(s.coins.player).toBe(STARTING_COINS + 10);
    s = dev(s, 'resetHearts');
    expect(s.hearts).toEqual({ player: MAX_HEARTS, tioZe: MAX_HEARTS });
    s = dev(s, 'emptyTioZeHand');
    expect(s.hands.tioZe).toHaveLength(0);
    expect(s.boneyard.map((x) => x.id)).toEqual(['2-2', '1-1', '5-6']);
    s = dev(s, 'clearBoard');
    expect(s.board.root).toBeNull();
    expect(s.boneyard.at(-1).id).toBe('3-4');
    for (let i = 0; i < MAX_HEARTS; i += 1) s = dev(s, 'damageTioZe');
    expect(s.phase).toBe('gameOver');
    expect(s.duelWinner).toBe('player');
    expect(s.roundResult.kind).toBe('nocaute');
  });

  it('com a mão e a mesa vazias, o Tio Zé devolve a vez em vez de travar', () => {
    let s = scenario({ player: [t(0, 0)], tioZe: [t(1, 1)], boneyard: [t(2, 2)], turn: 'tioZe' });
    s = dev(s, 'emptyTioZeHand');
    s = dev(s, 'clearBoard');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.turn).toBe('player');
  });
});

describe('campanha (duelo com seed)', () => {
  it('cada rodada começa com 1 pedra aprimorada na sua mão e nenhuma na do Tio Zé', () => {
    const s = gameReducer(createInitialState(), { type: 'START_DUEL', deck: shuffle(FULL_SET, createSeededRng(9)), seed: 1234 });
    expect(s.hands.player.filter((x) => x.enhancement)).toHaveLength(1);
    expect(s.hands.tioZe.some((x) => x.enhancement)).toBe(false);
  });

  it('vencer a rodada dá um talismã novo enquanto houver slot', () => {
    const started = gameReducer(createInitialState(), { type: 'START_DUEL', deck: FULL_SET.slice(), seed: 77 });
    const s = { ...started, hands: { player: [t(4, 6)], tioZe: [t(1, 1)] }, board: boardFrom(t(3, 4)), turn: 'player', openingTileId: null };
    const won = play(s, '4-6', 'right');
    expect(won.phase).toBe('roundOver');
    expect(won.relics).toHaveLength(1);
    expect(won.roundResult.reward).toBe(won.relics[0]);
  });
});

describe('simulação com relíquias e peças aprimoradas', () => {
  function canonical(state) {
    return [
      ...boardTilesInOrder(state.board),
      ...state.hands.player,
      ...state.hands.tioZe,
      ...state.boneyard,
      ...(state.pending?.options ?? []),
    ].map((x) => x.id);
  }

  it('150 duelos terminam sem travar, sem perder nem duplicar pedras', () => {
    const rng = createSeededRng(2024);
    let finished = 0;
    for (let duel = 0; duel < 150; duel += 1) {
      const relics = shuffle(RELIC_IDS, rng).slice(0, 1 + Math.floor(rng() * RELIC_SLOTS));
      let s = gameReducer(createInitialState(), {
        type: 'START_DUEL',
        deck: shuffle(FULL_SET, rng),
        seed: Math.floor(rng() * 2 ** 31),
        relics,
      });
      for (let step = 0; step < 3000 && s.phase !== 'gameOver'; step += 1) {
        let next;
        if (s.phase === 'roundOver') next = gameReducer(s, { type: 'NEXT_ROUND', deck: shuffle(FULL_SET, rng) });
        else if (s.pending?.type === 'drawChoice') next = gameReducer(s, { type: 'DRAW_PICK', tileId: s.pending.options[1].id });
        else if (s.pending?.type === 'discard') {
          const hand = s.hands.player;
          next = gameReducer(s, { type: 'DISCARD', tileId: hand[Math.floor(rng() * hand.length)].id });
        } else if (s.turn === 'tioZe') next = gameReducer(s, { type: 'TIO_ZE_ACT' });
        else if (canUndo(s) && rng() < 0.5) next = gameReducer(s, { type: 'UNDO' });
        else next = gameReducer(s, decideTioZeAction(buildTioZeView(s, 'player')));
        expect(next, `travou no duelo ${duel}, passo ${step}`).not.toBe(s);
        s = next;
        if (s.phase === 'playing') {
          const ids = canonical(s);
          expect(ids).toHaveLength(28);
          expect(new Set(ids).size).toBe(28);
          expect(s.hands.tioZe.some((x) => x.enhancement)).toBe(false);
        }
        expect(s.relics.length).toBeLessThanOrEqual(RELIC_SLOTS);
      }
      if (s.phase === 'gameOver') finished += 1;
    }
    expect(finished).toBe(150);
  });
});
