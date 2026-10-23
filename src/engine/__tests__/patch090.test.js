import { beforeEach, describe, expect, it } from 'vitest';
import { BOSS_INTRO_IDS, BOSS_TRACKS, REGIONS, bossMusicOf } from '../../data/campaign.js';
import { MODES, modeBadge, modeOf, playerMaxHearts } from '../../data/difficulty.js';
import { UPGRADES } from '../../data/meta.js';
import { RELICS } from '../../data/relics.js';
import { RIVALS, RIVAL_IDS, playStyleOf, rivalFor, tierOf } from '../../data/rivals.js';
import { FULL_SET } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { isSilverTilesUnlocked, resetMeta, saveSilverTilesUnlocked } from '../meta.js';
import { isValidSave, snapshotRun } from '../save.js';

const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const duel = (extra = {}) => act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), seed: 9, ...extra });
const win = (s) => act(s, 'DEV', { op: 'winMatch' });

beforeEach(() => {
  resetMeta();
  saveSilverTilesUnlocked(false);
});

describe('Patch 0.9.0: Modo Inferno (Peças Prateadas)', () => {
  it('é o 3º modo, de pedras prateadas, e devolve só 1 coração por mesa', () => {
    expect(Object.keys(MODES)).toEqual(['normal', 'hard', 'inferno']);
    expect(MODES.inferno).toMatchObject({ name: 'PEÇAS PRATEADAS', tag: 'MODO INFERNO', skin: 'silver', healPerTable: 1 });
    expect(modeOf('inferno').id).toBe('inferno');
    expect(modeBadge('inferno')).toBe('PEÇAS PRATEADAS · ');
    expect(modeBadge('normal')).toBe('');
  });

  it('todo rival senta com talismãs e pedras de grife desde a 1ª mesa (mais a cada região)', () => {
    // no normal, a Região 1 quase não tem talismã
    expect(RIVALS.tioZe.relics).toHaveLength(0);
    for (const id of RIVAL_IDS) {
      const rival = rivalFor(id, 'inferno');
      const base = RIVALS[id];
      expect(rival.inferno).toBe(true);
      expect(rival.relics.length).toBeGreaterThanOrEqual(base.boss ? 5 : base.region);
      expect(Object.keys(rival.deck).length).toBeGreaterThanOrEqual(base.boss ? 10 : 2);
      for (const relic of rival.relics) expect(RELICS[relic]).toBeTruthy();
      expect(tierOf(base, 'inferno')).toBe('agressivo');
      expect(playStyleOf(id, 'inferno')).toBeTruthy();
    }
  });

  it('chefes: 5 talismãs e no mínimo 10 pedras de grife', () => {
    for (const id of RIVAL_IDS.filter((r) => RIVALS[r].boss)) {
      const boss = rivalFor(id, 'inferno');
      expect(boss.relics).toHaveLength(5);
      expect(Object.keys(boss.deck).length).toBeGreaterThanOrEqual(10);
      expect(boss.hearts).toBeGreaterThanOrEqual(RIVALS[id].hearts);
    }
  });

  it('a mesa do Inferno usa o rival do Inferno (talismãs, baralho e corações)', () => {
    const s = duel({ rivalId: 'arlindo', mode: 'inferno' });
    expect(s.mode).toBe('inferno');
    expect(s.relics.tioZe).toEqual(rivalFor('arlindo', 'inferno').relics);
    expect(Object.keys(s.decks.tioZe).length).toBeGreaterThanOrEqual(10);
    expect(s.hearts.tioZe).toBe(rivalFor('arlindo', 'inferno').hearts);
    expect(s.hearts.player).toBe(playerMaxHearts(s));
  });

  it('vencer uma mesa devolve só 1 coração, até a de chefe (no normal o chefe cura tudo)', () => {
    const hurt = (s) => ({ ...s, hearts: { ...s.hearts, player: 1 } });
    const common = win(hurt(duel({ rivalId: 'tonho', mode: 'inferno' })));
    expect(common.hearts.player).toBe(2);
    const boss = win(hurt(duel({ rivalId: 'arlindo', mode: 'inferno' })));
    expect(boss.hearts.player).toBe(2);
    const normalBoss = win(hurt(duel({ rivalId: 'arlindo', mode: 'normal' })));
    expect(normalBoss.hearts.player).toBe(playerMaxHearts(normalBoss));
    const normalCommon = win(hurt(duel({ rivalId: 'tonho', mode: 'normal' })));
    expect(normalCommon.hearts.player).toBe(3);
  });

  it('o save guarda o Inferno e volta nele', () => {
    const s = act(createInitialState(), 'NEW_RUN', { seed: 4, mode: 'inferno' });
    const save = snapshotRun(s, 'map', 1);
    expect(save.mode).toBe('inferno');
    expect(isValidSave(save)).toBe(true);
    const loaded = act(createInitialState(), 'LOAD_RUN', { save });
    expect(loaded.mode).toBe('inferno');
    expect(isValidSave({ ...save, mode: 'pesadelo' })).toBe(false);
  });

  it('as Peças Prateadas ficam gravadas no aparelho', () => {
    expect(isSilverTilesUnlocked()).toBe(false);
    saveSilverTilesUnlocked(true);
    expect(isSilverTilesUnlocked()).toBe(true);
  });
});

describe('Patch 0.9.0: chefes e Conta do Boteco', () => {
  it('cada chefe tem a sua trilha e a Região 3 voltou a ter a dela', () => {
    expect(bossMusicOf('arlindo')).toBe('bossArlindo');
    expect(bossMusicOf('beto')).toBe('bossBeto');
    expect(bossMusicOf('comendador')).toBe('bossFight');
    expect(bossMusicOf('donoDaNoite')).toBe('bossNoite');
    expect(REGIONS[2].music).toBe('submundoNoir');
    expect(new Set(Object.values(BOSS_TRACKS)).size).toBe(4);
  });

  it('os três chefes de região têm entrada própria', () => {
    expect([...BOSS_INTRO_IDS].sort()).toEqual(['arlindo', 'beto', 'comendador']);
  });

  it('Conta do Boteco (Patch 0.9.6): 1 tampinha cada; o Bolso Fundo (5º espaço) custa 2', () => {
    expect(UPGRADES.copoAmericano.cost).toBe(1);
    expect(UPGRADES.valtinho.cost).toBe(1);
    expect(UPGRADES.fiado.cost).toBe(1);
    expect(UPGRADES.bolsoFundo.cost).toBe(2);
    expect(UPGRADES.bolsoFundo.extraSlots).toBe(1);
  });
});
