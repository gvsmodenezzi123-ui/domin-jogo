import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MALETAS } from '../../data/maletas.js';
import { CHALLENGES, UPGRADES } from '../../data/meta.js';
import { RELICS } from '../../data/relics.js';
import { RIVALS } from '../../data/rivals.js';
import { trackAchievements } from '../achievements.js';
import { FULL_SET, createEmptyBoard, getOpenEnds, makeTile, placeTile } from '../dominoLogic.js';
import { directDamage } from '../effects.js';
import { MATCH_PRIZE, createInitialState, gameReducer } from '../gameReducer.js';
import { relicSlotsFor } from '../loadout.js';
import {
  BLACK_TILES_KEY,
  LEGACY_HARD_KEY,
  addGoldCaps,
  buyUpgrade,
  isBlackTilesUnlocked,
  isMaletaUnlocked,
  loadChallenges,
  loadFrames,
  loadGoldCaps,
  loadUnlockedMaletas,
  loadUpgrades,
  resetMeta,
  saveBlackTilesUnlocked,
} from '../meta.js';
import { drawAvailabilityFor, endMarksFor, passAvailabilityFor } from '../powers.js';
import { isValidSave, snapshotRun } from '../save.js';
import { buildShop } from '../shop.js';
import { ACHIEVEMENT_EVENT, writeRaw } from '../storage.js';

const t = (a, b) => makeTile(a, b);
const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);
const duel = (extra = {}) => act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), seed: 7, ...extra });
const win = (s) => act(s, 'DEV', { op: 'winMatch' });

let heard = [];
const listen = (e) => heard.push(e.detail);
let ownWindow = false;

beforeEach(() => {
  resetMeta();
  saveBlackTilesUnlocked(false);
  heard = [];
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = new EventTarget();
    ownWindow = true;
  }
  globalThis.window.addEventListener(ACHIEVEMENT_EVENT, listen);
});

afterEach(() => {
  globalThis.window.removeEventListener(ACHIEVEMENT_EVENT, listen);
  if (ownWindow) {
    delete globalThis.window;
    ownWindow = false;
  }
});

describe('Patch 0.8.0: maletas', () => {
  it('Clássica: $5 e nada mais; Bicheiro: $15 com a Moeda Furada; Peças Pretas tiram $2', () => {
    const classica = act(createInitialState(), 'NEW_RUN', { seed: 1 });
    expect(classica.maleta).toBe('classica');
    expect(classica.coins.player).toBe(5);
    expect(classica.relics.player).toEqual([]);
    const bicheiro = act(createInitialState(), 'NEW_RUN', { seed: 1, maleta: 'bicheiro' });
    expect(bicheiro.coins.player).toBe(15);
    expect(bicheiro.relics.player).toEqual(['moedaFurada']);
    expect(act(createInitialState(), 'NEW_RUN', { seed: 1, maleta: 'bicheiro', mode: 'hard' }).coins.player).toBe(13);
    // maleta desconhecida vira a Clássica
    expect(act(createInitialState(), 'NEW_RUN', { seed: 1, maleta: 'xyz' }).maleta).toBe('classica');
  });

  it('Bicheiro: cada rival senta com 1 pedra de grife a mais', () => {
    const s = duel({ maleta: 'bicheiro', rivalId: 'tonho' });
    expect(Object.keys(s.decks.tioZe).length).toBe(Object.keys(RIVALS.tonho.deck).length + 1);
    const plain = duel({ rivalId: 'tonho' });
    expect(plain.decks.tioZe).toEqual(RIVALS.tonho.deck);
  });

  it('Borracharia: [5|5] e [3|6] de Chumbo no baralho desde o começo', () => {
    const s = act(createInitialState(), 'NEW_RUN', { seed: 1, maleta: 'borracharia' });
    expect(s.decks.player).toEqual({ '5-5': 'chumbo', '3-6': 'chumbo' });
  });

  it('Trapaceiro: 5 espaços (6 com o Bolso Fundo) e a loja 20% mais cara', () => {
    const base = act(createInitialState(), 'NEW_RUN', { seed: 9 });
    const trap = act(createInitialState(), 'NEW_RUN', { seed: 9, maleta: 'trapaceiro' });
    expect(relicSlotsFor(base)).toBe(4);
    expect(relicSlotsFor(trap)).toBe(5);
    expect(relicSlotsFor({ ...trap, perks: ['bolsoFundo'] })).toBe(6);
    const a = buildShop(base, 0);
    const b = buildShop(trap, 0);
    a.relics.forEach((o, i) => expect(b.relics[i].price).toBe(Math.ceil(o.price * 1.2)));
    a.tiles.forEach((o, i) => expect(b.tiles[i].price).toBe(Math.ceil(o.price * 1.2)));
  });

  it('Seca: só 1 compra por turno e o prêmio da mesa em dobro', () => {
    let s = duel({ maleta: 'seca', rivalId: 'tonho' });
    s = { ...s, turn: 'player', drawsThisTurn: 1, pending: null };
    expect(drawAvailabilityFor(s, 'player')).toMatchObject({ allowed: false, reason: 'limit' });
    expect(drawAvailabilityFor({ ...s, drawsThisTurn: 0 }, 'player').allowed).toBe(true);
    const before = s.coins.player;
    const won = win(s);
    expect(lastOf(won, 'duelEnd').prize).toBe((MATCH_PRIZE + RIVALS.tonho.prizeBonus) * 2);
    expect(won.coins.player).toBe(before + (MATCH_PRIZE + RIVALS.tonho.prizeBonus) * 2);
  });
});

describe('Patch 0.8.0: Conta do Boteco', () => {
  it('Tampinhas (Patch 0.9.6): mesa comum e chefe de região não dão nenhuma', () => {
    const common = win(duel({ rivalId: 'tonho' }));
    expect(lastOf(common, 'duelEnd').caps).toBe(0);
    expect(common.stats.caps).toBe(0);
    const boss = win(duel({ rivalId: 'arlindo' }));
    expect(lastOf(boss, 'duelEnd').caps).toBe(0);
  });

  it('Zerar a campanha: 1 tampinha só (com desafio também)', () => {
    const s = win(duel({ rivalId: 'comendador' }));
    expect(s.phase).toBe('runWon');
    expect(lastOf(s, 'duelEnd')).toMatchObject({ caps: 1, finalBoss: true, runWon: true });
    expect(s.stats.caps).toBe(1);
    const c = win(duel({ rivalId: 'comendador', challenge: 'mesaBebada' }));
    expect(lastOf(c, 'duelEnd').caps).toBe(1);
  });

  it('melhorias: compra com tampinhas, sem saldo não compra, não compra duas vezes', () => {
    expect(buyUpgrade('copoAmericano').ok).toBe(false);
    addGoldCaps(UPGRADES.copoAmericano.cost + 2);
    expect(buyUpgrade('copoAmericano')).toMatchObject({ ok: true, caps: 2 });
    expect(loadUpgrades()).toEqual(['copoAmericano']);
    expect(buyUpgrade('copoAmericano').ok).toBe(false);
    expect(loadGoldCaps()).toBe(2);
  });

  it('Copo Americano: +$2 no começo; Valtinho: 1º reembaralhar grátis', () => {
    const s = act(createInitialState(), 'NEW_RUN', { seed: 3, perks: ['copoAmericano', 'valtinho'] });
    expect(s.coins.player).toBe(7);
    expect(buildShop(s, 0).rerollCost).toBe(0);
    expect(buildShop(s, 1).rerollCost).toBeGreaterThan(0);
    expect(buildShop({ ...s, perks: [] }, 0).rerollCost).toBeGreaterThan(0);
  });

  it('Fiado de Rua: o 1º passe estratégico da run sai de graça, o próximo cobra', () => {
    let s = duel({ rivalId: 'tonho', perks: ['fiado'] });
    const board = placeTile(createEmptyBoard(), t(3, 4), 'root');
    s = { ...s, board, turn: 'player', pending: null, openingTileId: null, drawsThisTurn: 0, hands: { player: [t(4, 5), t(1, 1)], tioZe: [t(2, 2), t(0, 0)] }, coins: { ...s.coins, player: 0 } };
    expect(passAvailabilityFor(s, 'player')).toMatchObject({ allowed: true, cost: 0, fiado: true });
    const passed = act(s, 'PASS', { actor: 'player' });
    expect(passed.run.fiadoUsed).toBe(true);
    expect(passAvailabilityFor({ ...passed, turn: 'player' }, 'player')).toMatchObject({ allowed: false, cost: 3, reason: 'coins' });
  });

  it('Bolso Fundo: a run começa com espaço para mais 1 talismã', () => {
    const s = act(createInitialState(), 'NEW_RUN', { seed: 3, perks: ['bolsoFundo'] });
    expect(relicSlotsFor(s)).toBe(5);
  });
});

describe('Patch 0.8.0: desafios', () => {
  it('Só no Osso: só a Clássica, sem talismãs; loja e beco de portas fechadas', () => {
    let s = act(createInitialState(), 'NEW_RUN', { seed: 5, maleta: 'bicheiro', challenge: 'soNoOsso', relics: ['caneca'] });
    expect(s.maleta).toBe('classica');
    expect(s.relics.player).toEqual([]);
    s = act(s, 'DEV', { op: 'openStop', kind: 'shop' });
    expect(s.phase).toBe('map');
    expect(lastOf(s, 'nodeClosed')).toMatchObject({ kind: 'shop' });
    expect(s.run.cleared).toContain(s.run.node);
  });

  it('Tudo ou Nada: você e o rival sentam com 1 coração', () => {
    const s = duel({ rivalId: 'arlindo', challenge: 'tudoOuNada' });
    expect(s.hearts).toEqual({ player: 1, tioZe: 1 });
    expect(s.maxHearts).toEqual({ player: 1, tioZe: 1 });
  });

  it('Mesa Bêbada: a cada 3 turnos as pontas mudam; a pedra nova acorda a ponta', () => {
    let s = duel({ rivalId: 'tonho', challenge: 'mesaBebada' });
    const board = placeTile(createEmptyBoard(), t(3, 4), 'root');
    s = { ...s, board, turn: 'player', pending: null, openingTileId: null, fx: { ...s.fx, turns: 2 }, hands: { player: [t(4, 5), t(6, 6), t(1, 2)], tioZe: [t(0, 0), t(2, 2), t(5, 5)] } };
    const next = act(s, 'PLAY', { actor: 'player', tileId: '4-5', side: 'right' });
    expect(next.board.drunk).toBeTruthy();
    const ends = getOpenEnds(next.board);
    expect(ends.left).toBe(next.board.drunk.left);
    expect(ends.right).toBe(next.board.drunk.right);
    expect(ends.left).not.toBe(3);
    expect(ends.right).not.toBe(5);
    expect(lastOf(next, 'drunk')).toBeTruthy();
    expect(endMarksFor(next).left).toBe('drunk');
    // a pedra que entra na ponta trocada usa o número novo e a ponta volta ao normal
    const v = ends.left;
    const placed = placeTile(next.board, t(v, v === 6 ? 0 : 6), 'left');
    expect(placed.drunk?.left).toBeUndefined();
    expect(placed.drunk.right).toBe(next.board.drunk.right);
  });

  it('as definições: 3 desafios com moldura', () => {
    expect(Object.keys(CHALLENGES)).toEqual(['soNoOsso', 'mesaBebada', 'tudoOuNada']);
    for (const c of Object.values(CHALLENGES)) expect(c.frame).toBeTruthy();
  });
});

describe('Patch 0.8.0: O Dono da Noite (nó 19)', () => {
  const necro = ['olhoMorte', 'trancaCadaverica', 'testamento'];

  it('vencer o Comendador com 3 Necróticos trava o final e revela o nó secreto', () => {
    let s = duel({ rivalId: 'comendador' });
    s = { ...s, relics: { ...s.relics, player: necro } };
    s = win(s);
    expect(s.phase).toBe('secretReveal');
    expect(lastOf(s, 'duelEnd')).toMatchObject({ finalBoss: true, secret: true, runWon: false, caps: 0 });
    // com 2 não acontece
    let two = duel({ rivalId: 'comendador' });
    two = win({ ...two, relics: { ...two.relics, player: necro.slice(0, 2) } });
    expect(two.phase).toBe('runWon');
  });

  it('a mesa do Dono: 9 corações, Noite Eterna (batida comum não dói, bucha e tranca doem)', () => {
    let s = duel({ rivalId: 'comendador' });
    s = win({ ...s, relics: { ...s.relics, player: necro } });
    s = act(s, 'START_SECRET', { deck: FULL_SET.slice() });
    expect(s.rivalId).toBe('donoDaNoite');
    expect(s.hearts.tioZe).toBe(9);
    expect(s.decks.tioZe).toEqual(RIVALS.donoDaNoite.deck);

    const board = placeTile(createEmptyBoard(), t(3, 4), 'root');
    const setup = (tile) => ({ ...s, board, turn: 'player', pending: null, openingTileId: null, relics: { player: [], tioZe: [] }, hands: { player: [tile], tioZe: [t(0, 0), t(1, 1)] } });
    const normal = act(setup(t(4, 5)), 'PLAY', { actor: 'player', tileId: '4-5', side: 'right' });
    expect(normal.roundResult).toMatchObject({ winner: 'player', damage: 0, immune: true });
    expect(normal.hearts.tioZe).toBe(9);
    const bucha = act(setup(t(4, 4)), 'PLAY', { actor: 'player', tileId: '4-4', side: 'right' });
    expect(bucha.roundResult.damage).toBeGreaterThan(0);
    expect(bucha.hearts.tioZe).toBeLessThan(9);
    // dano direto não pega (só o painel DEV)
    expect(directDamage(setup(t(4, 4)), 'tioZe', 1, 'anel').hearts.tioZe).toBe(9);
    expect(directDamage(setup(t(4, 4)), 'tioZe', 1, 'dev').hearts.tioZe).toBe(8);
  });

  it('vencer o Dono encerra a run com o final secreto (a tampinha da run vencida)', () => {
    let s = duel({ rivalId: 'comendador' });
    s = win({ ...s, relics: { ...s.relics, player: necro } });
    s = win(act(s, 'START_SECRET', { deck: FULL_SET.slice() }));
    expect(s.phase).toBe('runWon');
    expect(lastOf(s, 'duelEnd')).toMatchObject({ secretWon: true, runWon: true, finalBoss: false, caps: 1 });
    expect(s.stats.caps).toBe(1);
  });
});

describe('Patch 0.8.0: save versão 4', () => {
  it('guarda maleta, desafio, fiado e tampinhas; save da versão 3 continua valendo', () => {
    const s = act(createInitialState(), 'NEW_RUN', { seed: 11, maleta: 'trapaceiro', challenge: 'mesaBebada', perks: ['fiado'] });
    const save = snapshotRun({ ...s, run: { ...s.run, fiadoUsed: true }, stats: { ...s.stats, caps: 4 } }, 'map', 1);
    // (Patch 0.9.4: o save foi para a versão 5; a 4 e a 3 continuam valendo)
    expect(save).toMatchObject({ v: 5, maleta: 'trapaceiro', challenge: 'mesaBebada', fiadoUsed: true });
    expect(isValidSave(save)).toBe(true);
    const loaded = act(createInitialState(), 'LOAD_RUN', { save, perks: ['fiado'] });
    expect(loaded).toMatchObject({ maleta: 'trapaceiro', challenge: 'mesaBebada', perks: ['fiado'] });
    expect(loaded.run.fiadoUsed).toBe(true);
    expect(loaded.stats.caps).toBe(4);
    const old = { ...save, v: 3 };
    delete old.maleta;
    delete old.challenge;
    expect(isValidSave(old)).toBe(true);
    expect(act(createInitialState(), 'LOAD_RUN', { save: old }).maleta).toBe('classica');
    expect(isValidSave({ ...save, maleta: 'nada' })).toBe(false);
  });
});

describe('Patch 0.8.0: desbloqueios permanentes', () => {
  let seq = 0;
  const ev = (type, extra = {}) => ({ type, seq: ++seq, ...extra });
  const st = (extra = {}) => ({ rivalId: 'tonho', mode: 'normal', maleta: 'classica', challenge: null, seed: 3, run: { node: 'n' }, relics: { player: [], tioZe: [] }, stats: { coinsEarned: 0 }, ...extra });

  it('Peças Pretas: chave nova, e a antiga da Maleta Preta também vale', () => {
    expect(isBlackTilesUnlocked()).toBe(false);
    writeRaw(LEGACY_HARD_KEY, 'true');
    expect(isBlackTilesUnlocked()).toBe(true);
    saveBlackTilesUnlocked(false);
    expect(isBlackTilesUnlocked()).toBe(false);
    saveBlackTilesUnlocked(true);
    expect(isBlackTilesUnlocked()).toBe(true);
    expect(BLACK_TILES_KEY).toBe('buxaria_black_tiles_unlocked');
  });

  it('maletas: Bicheiro ($60 numa run), Borracharia (3 trancas), Trapaceiro (4 talismãs), Seca (chefe sem compra)', () => {
    expect(loadUnlockedMaletas()).toEqual(['classica']);
    trackAchievements([ev('coins')], st({ stats: { coinsEarned: 59 } }));
    expect(isMaletaUnlocked('bicheiro')).toBe(false);
    trackAchievements([ev('coins')], st({ stats: { coinsEarned: 60 } }));
    expect(isMaletaUnlocked('bicheiro')).toBe(true);
    expect(heard.some((d) => d.id === 'maleta:bicheiro' && d.kicker === 'MALETA DESBLOQUEADA!')).toBe(true);

    const tranca = () => ev('roundEnd', { result: { kind: 'tranca', winner: 'player' }, handCounts: { player: 3, tioZe: 3 } });
    trackAchievements([tranca(), tranca()], st());
    expect(isMaletaUnlocked('borracharia')).toBe(false);
    trackAchievements([tranca()], st());
    expect(isMaletaUnlocked('borracharia')).toBe(true);

    trackAchievements([ev('runStart')], st({ seed: 21 }));
    trackAchievements([ev('shopBuy', { kind: 'relic', id: 'caneca' }), ev('shopBuy', { kind: 'relic', id: 'caneca' }), ev('shopBuy', { kind: 'tile', id: '1-2' })], st({ seed: 21 }));
    trackAchievements([ev('shopBuy', { kind: 'relic', id: 'giz' }), ev('marketBuy', { id: 'olhoMorte' })], st({ seed: 21 }));
    expect(isMaletaUnlocked('trapaceiro')).toBe(false);
    trackAchievements([ev('shopBuy', { kind: 'relic', id: 'anel' })], st({ seed: 21 }));
    expect(isMaletaUnlocked('trapaceiro')).toBe(true);

    trackAchievements([ev('duelStart'), ev('drawTile', { by: 'player', tileId: '1-1', cost: { type: 'free' } }), ev('duelEnd', { winner: 'player', boss: true })], st({ rivalId: 'arlindo' }));
    expect(isMaletaUnlocked('seca')).toBe(false);
    trackAchievements([ev('duelStart'), ev('duelEnd', { winner: 'player', boss: true })], st({ rivalId: 'beto' }));
    expect(isMaletaUnlocked('seca')).toBe(true);
    expect(Object.keys(MALETAS).every((id) => isMaletaUnlocked(id))).toBe(true);
  });

  it('desafios: zerar com a Clássica, com o Bicheiro e nas Peças Pretas; concluir dá a moldura', () => {
    const clear = (extra) => [ev('duelStart'), ev('duelEnd', { winner: 'player', boss: true, finalBoss: true, runWon: true, mode: extra.mode ?? 'normal' })];
    trackAchievements(clear({}), st({ rivalId: 'comendador' }));
    expect(loadChallenges().unlocked).toEqual(['soNoOsso']);
    trackAchievements(clear({}), st({ rivalId: 'comendador', maleta: 'bicheiro' }));
    trackAchievements(clear({ mode: 'hard' }), st({ rivalId: 'comendador', mode: 'hard', maleta: 'borracharia' }));
    expect(loadChallenges().unlocked).toEqual(['soNoOsso', 'mesaBebada', 'tudoOuNada']);
    expect(loadFrames()).toEqual([]);
    trackAchievements(clear({}), st({ rivalId: 'comendador', challenge: 'mesaBebada' }));
    expect(loadChallenges().done).toEqual(['mesaBebada']);
    expect(loadFrames()).toEqual(['bebada']);
    expect(heard.some((d) => d.id === 'frame:mesaBebada')).toBe(true);
  });

  it('as 20 relíquias e as melhorias seguem válidas', () => {
    for (const m of Object.values(MALETAS)) for (const r of m.relics) expect(RELICS[r]).toBeTruthy();
    expect(Object.keys(UPGRADES)).toEqual(['copoAmericano', 'valtinho', 'fiado', 'bolsoFundo']);
  });
});
