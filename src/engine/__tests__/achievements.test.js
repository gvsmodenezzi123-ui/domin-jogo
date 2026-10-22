import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LOCKED_RELIC_IDS, RELICS } from '../../data/relics.js';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_RELIC,
  ACHIEVEMENT_EVENT,
  ACHIEVEMENT_IDS,
  checkAchievement,
  isAchievementUnlocked,
  loadAchievementProgress,
  loadUnlockedAchievements,
  loadUnlockedRelics,
  resetAchievements,
  trackAchievements,
  unlockAchievement,
} from '../achievements.js';
import { FULL_SET, createEmptyBoard, makeTile, placeTile } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { buildShop } from '../shop.js';

/** Eventos sintéticos com seq crescente. */
let seq = 0;
const ev = (type, extra = {}) => ({ type, seq: ++seq, ...extra });
const st = (extra = {}) => ({ rivalId: 'tonho', mode: 'normal', seed: 7, run: { node: 'r1-f1-l0' }, relics: { player: [], tioZe: [] }, ...extra });

let heard = [];
const listen = (e) => heard.push(e.detail);
let ownWindow = false;

beforeEach(() => {
  resetAchievements();
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

describe('Patch 0.7.0: banco das conquistas', () => {
  it('10 conquistas, cada uma liberando um talismã trancado por ela', () => {
    expect(ACHIEVEMENT_IDS).toHaveLength(10);
    expect(ACHIEVEMENT_IDS.map((id) => ACHIEVEMENTS[id].relic).sort()).toEqual(LOCKED_RELIC_IDS.slice().sort());
    for (const id of ACHIEVEMENT_IDS) {
      const a = ACHIEVEMENTS[id];
      expect(RELICS[a.relic].lockedBy, id).toBe(id);
      expect(ACHIEVEMENT_BY_RELIC[a.relic].id).toBe(id);
      expect(a.title.length).toBeGreaterThan(3);
      expect(a.goal.length).toBeGreaterThan(15);
    }
  });

  it('checkAchievement: só libera com a meta batida, grava as chaves e avisa uma vez', () => {
    expect(checkAchievement('fregues_ze', { tio_ze_defeats: 1 })).toBe(false);
    expect(isAchievementUnlocked('fregues_ze')).toBe(false);
    expect(checkAchievement('fregues_ze', { tio_ze_defeats: 2 })).toBe(true);
    expect(isAchievementUnlocked('fregues_ze')).toBe(true);
    expect(loadUnlockedRelics()).toEqual(['moedaFurada']);
    expect(loadUnlockedAchievements()).toEqual(['fregues_ze']);
    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatchObject({ id: 'fregues_ze', title: 'Freguês do Zé', relicName: RELICS.moedaFurada.name, icon: 'moedaFurada' });
    // de novo: já saiu, não avisa
    expect(checkAchievement('fregues_ze', { tio_ze_defeats: 5 })).toBe(false);
    expect(heard).toHaveLength(1);
    expect(checkAchievement('nao_existe', {})).toBe(false);
  });

  it('as chaves pedidas vão para o localStorage quando ele existe', () => {
    const data = new Map();
    const had = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
    };
    try {
      unlockAchievement('mao_fechada');
      expect(data.get('achievement_mao_fechada')).toBe('true');
      expect(data.get('relic_unlocked_dadoOsso')).toBe('true');
    } finally {
      if (had === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = had;
    }
  });

  it('o talismã liberado entra no sorteio da loja na hora (UNLOCK_RELICS)', () => {
    const base = { ...gameReducer(createInitialState(), { type: 'NEW_RUN', seed: 3 }), relics: { player: [], tioZe: [] } };
    const pool = (s) => {
      const seen = new Set();
      for (let seed = 0; seed < 200; seed += 1) for (const o of buildShop({ ...s, seed, shop: null }, seed).relics ?? []) seen.add(o.id);
      return seen;
    };
    expect(pool(base).has('moedaFurada')).toBe(false);
    const unlocked = gameReducer(base, { type: 'UNLOCK_RELICS', ids: ['moedaFurada'] });
    expect(unlocked.unlocks).toContain('moedaFurada');
    expect(pool(unlocked).has('moedaFurada')).toBe(true);
  });
});

describe('Patch 0.7.0: gatilhos pelos eventos do jogo', () => {
  it('Freguês do Zé: 2 vitórias sobre o Tio Zé somando runs', () => {
    const s = st({ rivalId: 'tioZe' });
    expect(trackAchievements([ev('duelStart'), ev('duelEnd', { winner: 'player' })], s)).not.toContain('fregues_ze');
    expect(loadAchievementProgress().tio_ze_defeats).toBe(1);
    trackAchievements([ev('duelStart'), ev('duelEnd', { winner: 'tioZe' })], s);
    expect(trackAchievements([ev('duelStart'), ev('duelEnd', { winner: 'player' })], s)).toContain('fregues_ze');
  });

  it('Boca de Balcão: compras em 3 lojas diferentes na mesma run', () => {
    trackAchievements([ev('runStart')], st({ seed: 11 }));
    trackAchievements([ev('shopBuy'), ev('shopBuy')], st({ seed: 11, run: { node: 'a' } }));
    trackAchievements([ev('shopBuy')], st({ seed: 11, run: { node: 'b' } }));
    expect(isAchievementUnlocked('boca_balcao')).toBe(false);
    // outra run zera
    trackAchievements([ev('runStart')], st({ seed: 12 }));
    expect(trackAchievements([ev('shopBuy')], st({ seed: 12, run: { node: 'c' } }))).toEqual([]);
    trackAchievements([ev('shopBuy')], st({ seed: 12, run: { node: 'd' } }));
    expect(trackAchievements([ev('shopBuy')], st({ seed: 12, run: { node: 'e' } }))).toContain('boca_balcao');
  });

  it('No Limite do Sangue: a pedra paga com coração vai à mesa antes da vez do rival', () => {
    const s = st();
    trackAchievements([ev('duelStart'), ev('drawTile', { by: 'player', tileId: '2-5', cost: { type: 'heart', amount: 1 } })], s);
    trackAchievements([ev('pass', { by: 'tioZe' })], s);
    expect(trackAchievements([ev('tilePlaced', { by: 'player', tileId: '2-5' })], s)).toEqual([]);
    trackAchievements([ev('drawTile', { by: 'player', tileId: '1-3', cost: { type: 'coins', amount: 3 } }), ev('tilePlaced', { by: 'player', tileId: '1-3' })], s);
    expect(isAchievementUnlocked('limite_sangue')).toBe(false);
    const got = trackAchievements(
      [ev('drawTile', { by: 'player', tileId: '4-6', cost: { type: 'heart', amount: 1 } }), ev('heartLost', { who: 'player', reason: 'draw' }), ev('tilePlaced', { by: 'player', tileId: '4-6' })],
      s,
    );
    expect(got).toContain('limite_sangue');
  });

  it('Malandragem de Truco: 3 múltiplos de 5 seus na mesma partida', () => {
    const s = st();
    trackAchievements([ev('duelStart'), ev('bonus5', { by: 'player' }), ev('bonus5', { by: 'tioZe' }), ev('bonus5', { by: 'player' })], s);
    trackAchievements([ev('duelStart'), ev('bonus5', { by: 'player' })], s);
    expect(isAchievementUnlocked('malandragem_truco')).toBe(false);
    expect(trackAchievements([ev('bonus5', { by: 'player' }), ev('bonus5', { by: 'player' })], s)).toContain('malandragem_truco');
  });

  it('Cirurgia de Tranca: vencer a tranca com 1 pedra na mão', () => {
    const tranca = (n) => ev('roundEnd', { result: { kind: 'tranca', winner: 'player', reason: 'tranca' }, handCounts: { player: n, tioZe: 4 }, hearts: { player: 3, tioZe: 2 } });
    expect(trackAchievements([tranca(2)], st())).toEqual([]);
    expect(trackAchievements([ev('roundEnd', { result: { kind: 'tranca', winner: 'tioZe' }, handCounts: { player: 1, tioZe: 2 } })], st())).toEqual([]);
    expect(trackAchievements([tranca(1)], st())).toContain('cirurgia_tranca');
  });

  it('Colecionador de Esquina: 6 comuns básicos diferentes equipados ao longo das runs', () => {
    trackAchievements([ev('runStart')], st({ relics: { player: ['caneca', 'giz', 'anel'], tioZe: [] } }));
    trackAchievements([ev('runStart')], st({ relics: { player: ['borracha', 'cinzeiro'], tioZe: [] } }));
    expect(loadAchievementProgress().used_common_relics).toHaveLength(4);
    // talismã trancado não conta como básico
    trackAchievements([ev('shopBuy')], st({ relics: { player: ['moedaFurada', 'palitoDente'], tioZe: [] } }));
    expect(isAchievementUnlocked('colecionador')).toBe(false);
    expect(trackAchievements([ev('shopBuy')], st({ relics: { player: ['radioPilha'], tioZe: [] } }))).toContain('colecionador');
  });

  it('Milagre de Boteco: bater com bucha com 1 coração', () => {
    const end = (hearts) => ev('roundEnd', { result: { kind: 'bucha', winner: 'player', reason: 'batida' }, hearts: { player: hearts, tioZe: 1 }, handCounts: { player: 0, tioZe: 3 } });
    expect(trackAchievements([ev('tilePlaced', { by: 'player', tileId: '3-3', double: true }), end(2)], st())).toEqual([]);
    expect(trackAchievements([ev('tilePlaced', { by: 'player', tileId: '3-4', double: false }), end(1)], st())).toEqual([]);
    expect(trackAchievements([ev('tilePlaced', { by: 'player', tileId: '5-5', double: true }), end(1)], st())).toContain('milagre_boteco');
  });

  it('Rei da Sinuca Branca: 2 campanhas vencidas na Maleta Branca (a Preta não conta)', () => {
    const win = (mode) => [ev('duelStart'), ev('duelEnd', { winner: 'player', runWon: true, finalBoss: true, boss: true, mode })];
    trackAchievements(win('normal'), st({ rivalId: 'comendador' }));
    trackAchievements(win('hard'), st({ rivalId: 'comendador', mode: 'hard' }));
    expect(loadAchievementProgress().normal_mode_clears).toBe(1);
    expect(trackAchievements(win('normal'), st({ rivalId: 'comendador' }))).toContain('rei_sinuca');
  });

  it('Mesa Limpa: chefe de região (Arlindo ou Beto) sem tomar dano; pagar compra com coração não conta', () => {
    const boss = (rivalId, mid = []) => trackAchievements([ev('duelStart'), ...mid, ev('duelEnd', { winner: 'player', boss: true })], st({ rivalId }));
    expect(boss('arlindo', [ev('heartLost', { who: 'player', reason: 'bucha' })])).not.toContain('mesa_limpa');
    expect(boss('comendador')).not.toContain('mesa_limpa');
    expect(boss('beto', [ev('heartLost', { who: 'player', reason: 'draw' }), ev('heartLost', { who: 'tioZe', reason: 'normal' })])).toContain('mesa_limpa');
  });

  it('Mão Fechada: vencer a partida sem comprar (compra forçada não conta)', () => {
    const s = st();
    trackAchievements([ev('duelStart'), ev('drawTile', { by: 'player', tileId: '0-1', cost: { type: 'free' } }), ev('duelEnd', { winner: 'player' })], s);
    expect(isAchievementUnlocked('mao_fechada')).toBe(false);
    trackAchievements([ev('duelStart'), ev('drawPeek', { by: 'player', count: 2 }), ev('drawTile', { by: 'player', tileId: '0-2', picked: true })], s);
    trackAchievements([ev('duelEnd', { winner: 'player' })], s);
    expect(isAchievementUnlocked('mao_fechada')).toBe(false);
    const got = trackAchievements(
      [ev('duelStart'), ev('drawTile', { by: 'tioZe', tileId: '1-1' }), ev('drawTile', { by: 'player', tileId: '2-2', forced: true }), ev('duelEnd', { winner: 'player' })],
      s,
    );
    expect(got).toContain('mao_fechada');
  });

  it('com o reducer de verdade: bater com bucha a 1 coração solta o Milagre de Boteco', () => {
    const t = (a, b) => makeTile(a, b);
    const s0 = gameReducer(createInitialState(), { type: 'START_DUEL', deck: FULL_SET.slice(), seed: 4 });
    const s = {
      ...s0,
      hands: { player: [t(4, 4)], tioZe: [t(1, 1), t(2, 2)] },
      board: placeTile(createEmptyBoard(), t(3, 4), 'root'),
      boneyard: [],
      turn: 'player',
      openingTileId: null,
      relics: { player: [], tioZe: [] },
      hearts: { player: 1, tioZe: 5 },
    };
    const after = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '4-4', side: 'right' });
    const end = [...after.events].reverse().find((e) => e.type === 'roundEnd');
    expect(end.hearts.player).toBe(1);
    expect(end.handCounts).toEqual({ player: 0, tioZe: 2 });
    const fresh = after.events.filter((e) => e.seq > s.seq);
    expect(trackAchievements(fresh, after)).toContain('milagre_boteco');
  });
});
