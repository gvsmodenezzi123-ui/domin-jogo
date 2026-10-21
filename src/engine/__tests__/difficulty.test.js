import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction } from '../../ai/tioZeAI.js';
import { REGIONS } from '../../data/campaign.js';
import { MODES, modeOf, playerMaxHearts } from '../../data/difficulty.js';
import { RELICS } from '../../data/relics.js';
import { BOSS_IDS, HARD_LOADOUTS, HARD_PLAY_STYLES, PLAY_STYLES, RIVALS, RIVAL_IDS, rivalFor, tierOf } from '../../data/rivals.js';
import { ENHANCEMENTS } from '../../data/enhancedTiles.js';
import { availableNodes } from '../campaignMap.js';
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
import { createInitialState, gameReducer } from '../gameReducer.js';
import { isValidSave, snapshotRun } from '../save.js';
import { rivalRules } from '../rivalInfo.js';

const t = (a, b) => makeTile(a, b);
const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const dev = (s, op, extra = {}) => gameReducer(s, { type: 'DEV', op, ...extra });
const hardRun = (seed = 5) => act(createInitialState(), 'NEW_RUN', { seed, mode: 'hard' });

describe('maletas: Branca (normal) e Preta (difícil)', () => {
  it('Maleta Branca: 5 corações e $5; Maleta Preta: 4 corações e $3', () => {
    const normal = act(createInitialState(), 'NEW_RUN', { seed: 5 });
    expect(normal.mode).toBe('normal');
    expect(normal.hearts.player).toBe(MAX_HEARTS);
    expect(normal.maxHearts.player).toBe(MAX_HEARTS);
    expect(normal.coins.player).toBe(STARTING_COINS);
    const hard = hardRun();
    expect(hard.mode).toBe('hard');
    expect(hard.hearts.player).toBe(4);
    expect(hard.maxHearts.player).toBe(4);
    expect(hard.coins.player).toBe(3);
    expect(MODES.hard.skin).toBe('onyx');
    expect(modeOf('qualquer').id).toBe('normal');
    expect(playerMaxHearts(hard)).toBe(4);
    // a teia é a mesma nos dois modos (só os rivais endurecem)
    expect(availableNodes(hard)).toEqual(availableNodes(normal));
  });

  it('no difícil o rival senta com o baralho e os talismãs da Maleta Preta; seus corações continuam no teto de 4', () => {
    let s = hardRun();
    s = act(s, 'CHOOSE_NODE', { nodeId: availableNodes(s)[0], deck: FULL_SET.slice() });
    const hard = rivalFor(s.rivalId, 'hard');
    expect(s.relics.tioZe).toEqual(hard.relics);
    expect(s.decks.tioZe).toEqual(hard.deck);
    expect(s.maxHearts).toEqual({ player: 4, tioZe: hard.hearts });
    for (const tile of s.hands.tioZe) expect(tile.enhancement).toBe(hard.deck[tile.id]);
    s = { ...s, hearts: { ...s.hearts, player: 3 } };
    s = dev(s, 'winMatch');
    expect(s.hearts.player).toBe(4); // +2, mas o teto é 4
    const boss = dev({ ...s, phase: 'playing', hearts: { ...s.hearts, player: 1 } }, 'setRival', { rivalId: 'arlindo', deck: FULL_SET.slice() });
    const won = dev(boss, 'winMatch');
    expect(won.hearts.player).toBe(4); // chefe cura tudo (até 4)
  });

  it('save guarda a maleta; save antigo sem o campo é Maleta Branca; maleta inventada não vale', () => {
    const s = hardRun(9);
    const save = JSON.parse(JSON.stringify(snapshotRun(s, 'map')));
    expect(save.mode).toBe('hard');
    expect(isValidSave(save)).toBe(true);
    const loaded = act(createInitialState(), 'LOAD_RUN', { save });
    expect(loaded.mode).toBe('hard');
    expect(loaded.maxHearts.player).toBe(4);
    const { mode, ...old } = save;
    expect(mode).toBe('hard');
    expect(act(createInitialState(), 'LOAD_RUN', { save: old }).mode).toBe('normal');
    expect(isValidSave({ ...save, mode: 'pesadelo' })).toBe(false);
  });
});

describe('calibragem da Maleta Preta', () => {
  const enhancedOf = (rival) => Object.values(rival.deck);

  it('Região 1: cada rival comum com 1 pedra de grife e 1 talismã', () => {
    for (const id of REGIONS[0].nodes.slice(0, 5)) {
      const r = rivalFor(id, 'hard');
      expect(enhancedOf(r), id).toHaveLength(1);
      expect(r.relics, id).toHaveLength(1);
      expect(tierOf(r, 'hard')).toBe('calculista');
    }
  });

  it('Região 2: 2 pedras de grife e até 2 talismãs passivos, contas precisas de tranca e de 5', () => {
    for (const id of REGIONS[1].nodes.slice(0, 5)) {
      const r = rivalFor(id, 'hard');
      expect(enhancedOf(r), id).toHaveLength(2);
      expect(r.relics.length, id).toBeLessThanOrEqual(2);
      expect(HARD_PLAY_STYLES[id].trancaBias).toBe(0);
      expect(HARD_PLAY_STYLES[id].five).toBeGreaterThanOrEqual(8);
      expect(HARD_PLAY_STYLES[id].fiveSetup).toBeGreaterThan(PLAY_STYLES[id].fiveSetup);
    }
  });

  it('Região 3: comuns viram quase chefes (3 pedras de grife e 2 talismãs perigosos)', () => {
    for (const id of REGIONS[2].nodes.slice(0, 5)) {
      const r = rivalFor(id, 'hard');
      expect(enhancedOf(r), id).toHaveLength(3);
      expect(r.relics, id).toHaveLength(2);
      expect(r.relics.some((rel) => ['lendario', 'mitico'].includes(RELICS[rel].rarity)), id).toBe(true);
      expect(HARD_PLAY_STYLES[id].aggression).toBeGreaterThan(PLAY_STYLES[id].aggression);
    }
  });

  it('chefes: Arlindo 6♥ com buchas de Chumbo; Beto 7♥, taxa de $3, 2 Ouros e 1 Rubi; Comendador 8♥, 2 Necróticos e escudo', () => {
    const arlindo = rivalFor('arlindo', 'hard');
    expect(arlindo.hearts).toBe(6);
    const leadDoubles = Object.entries(arlindo.deck).filter(([id, e]) => e === 'chumbo' && id.split('-')[0] === id.split('-')[1]);
    expect(leadDoubles.length).toBeGreaterThanOrEqual(4);
    expect(arlindo.mechanics.doubleBuchaDamage).toBe(true);

    const beto = rivalFor('beto', 'hard');
    expect(beto.hearts).toBe(7);
    expect(beto.mechanics.drawFee).toBe(3);
    expect(enhancedOf(beto).sort()).toEqual(['ouro', 'ouro', 'rubi']);

    const comendador = rivalFor('comendador', 'hard');
    expect(comendador.hearts).toBe(8);
    expect(comendador.relics).toHaveLength(2);
    for (const rel of comendador.relics) expect(RELICS[rel].rarity).toBe('necrotico');
    expect(comendador.mechanics.trancaShield).toBe(true);

    // no modo normal nada disso muda
    expect(RIVALS.arlindo.hearts).toBe(5);
    expect(RIVALS.beto.mechanics.drawFee).toBe(2);
    expect(RIVALS.comendador.hearts).toBe(7);
  });

  it('todo baralho e talismã da Maleta Preta existe e funciona do lado do rival', () => {
    for (const id of RIVAL_IDS) {
      expect(HARD_LOADOUTS[id], id).toBeTruthy();
      const r = rivalFor(id, 'hard');
      for (const [tileId, enh] of Object.entries(r.deck)) {
        expect(FULL_SET.some((x) => x.id === tileId), `${id}: ${tileId}`).toBe(true);
        expect(ENHANCEMENTS[enh], `${id}: ${enh}`).toBeTruthy();
      }
      for (const rel of r.relics) {
        expect(RELICS[rel], `${id}: ${rel}`).toBeTruthy();
        expect(RELICS[rel].reveal, `${id}: ${rel}`).toBeUndefined();
        expect(RELICS[rel].drawOptions, `${id}: ${rel}`).toBeUndefined();
        expect(RELICS[rel].ability, `${id}: ${rel}`).toBeUndefined();
        if (RELICS[rel].rarity === 'necrotico') expect(BOSS_IDS).toContain(id);
      }
    }
    expect(rivalRules('beto', 'hard').join(' ')).toContain('$3');
    expect(rivalRules('beto').join(' ')).toContain('$2');
  });

  it('Beto Cigano no difícil cobra $3 a cada compra do dorme', () => {
    let s = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), rivalId: 'beto', mode: 'hard' });
    s = {
      ...s,
      hands: { player: [t(6, 6)], tioZe: [t(1, 1), t(2, 2)] },
      board: placeTile(createEmptyBoard(), t(3, 4), 'root'),
      boneyard: [t(0, 0), t(0, 1)],
      turn: 'player',
      openingTileId: null,
      coins: { player: 10, tioZe: 0 },
    };
    const drawn = act(s, 'DRAW', { actor: 'player' });
    expect(drawn.coins.player).toBe(7);
    expect(drawn.coins.tioZe).toBe(3);
  });
});

describe('simulação na Maleta Preta', () => {
  it('40 mesas contra os chefes e os rivais duros terminam sem travar nem perder pedras', () => {
    const rng = createSeededRng(4242);
    const rivals = ['arlindo', 'beto', 'comendador', 'carlinhos', 'alemao', 'tiao', 'neide', 'tonho'];
    let finished = 0;
    for (let game = 0; game < 40; game += 1) {
      let s = act(createInitialState(), 'START_DUEL', {
        deck: shuffle(FULL_SET, rng),
        rivalId: rivals[game % rivals.length],
        mode: 'hard',
        seed: game,
      });
      for (let step = 0; step < 4000 && ['playing', 'roundOver'].includes(s.phase); step += 1) {
        let next;
        if (s.phase === 'roundOver') next = act(s, 'NEXT_ROUND', { deck: shuffle(FULL_SET, rng) });
        else if (s.pending?.type === 'drawChoice') next = act(s, 'DRAW_PICK', { tileId: s.pending.options[0].id });
        else if (s.pending?.type === 'discard') next = act(s, 'DISCARD', { tileId: s.hands.player[0].id });
        else if (s.pending?.type === 'forcedPass') next = act(s, 'PASS', { actor: 'player' });
        else if (s.turn === 'tioZe') next = act(s, 'TIO_ZE_ACT');
        else next = gameReducer(s, decideTioZeAction(buildTioZeView(s, 'player')));
        expect(next, `jogo ${game}, passo ${step}`).not.toBe(s);
        s = next;
        if (s.phase === 'playing') {
          const ids = [...boardTilesInOrder(s.board), ...s.hands.player, ...s.hands.tioZe, ...s.boneyard, ...(s.pending?.options ?? [])].map((x) => x.id);
          expect(ids).toHaveLength(28);
          expect(new Set(ids).size).toBe(28);
          for (const tile of s.hands.tioZe) expect(tile.enhancement).toBe(s.decks.tioZe[tile.id]);
        }
        expect(s.hearts.player).toBeLessThanOrEqual(4);
      }
      if (['matchWon', 'runWon', 'gameOver'].includes(s.phase)) finished += 1;
    }
    expect(finished).toBe(40);
  }, 60000);
});
