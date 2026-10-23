import { describe, expect, it } from 'vitest';
import { TUTORIAL_DEALS, TUTORIAL_GIFT, TUTORIAL_STEPS } from '../../data/tutorial.js';
import { RIVALS, TUTOR, TUTOR_ID, getRival, rivalFor } from '../../data/rivals.js';
import { FULL_SET, boardTilesInOrder, getOpenEnds } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { TUTORIAL_KEY, markTutorialDone, markTutorialPending, needsTutorial, tutorialDeal, tutorialStepOf } from '../tutorial.js';
import { readRaw, writeRaw } from '../storage.js';

const act = (state, type, extra = {}) => gameReducer(state, { type, ...extra });
const start = (extra = {}) => act(createInitialState(), 'START_TUTORIAL', extra);

/** Faz o que o passo pede (tocar, jogar, comprar, a vez dele). */
function obey(state) {
  const { expect: want } = tutorialStepOf(state);
  if (want.type === 'tap') return act(state, 'TUTORIAL_NEXT');
  if (want.type === 'play') return act(state, 'PLAY', { actor: 'player', tileId: want.tile, side: want.side });
  if (want.type === 'draw') return act(state, 'DRAW', { actor: 'player' });
  if (want.type === 'rival') return act(state, 'TIO_ZE_ACT');
  throw new Error(`passo sem ação: ${want.type}`);
}

/** O roteiro inteiro, do cartão de abertura ao cartão final. */
function runScript() {
  let s = start();
  const seen = [];
  for (let guard = 0; guard < 200; guard += 1) {
    const step = tutorialStepOf(s);
    seen.push({ id: step.id, state: s });
    if (step.expect.type === 'end') return { state: s, seen };
    const next = obey(s);
    if (next === s) throw new Error(`o roteiro travou no passo ${step.id}`);
    s = next;
  }
  throw new Error('o roteiro não acabou');
}

describe('Patch 0.9.5: a partida de treino com o Vô Juca', () => {
  it('o Vô Juca existe fora da galeria da campanha', () => {
    expect(RIVALS[TUTOR_ID]).toBeUndefined();
    expect(getRival(TUTOR_ID)).toBe(TUTOR);
    expect(rivalFor(TUTOR_ID, 'hard')).toBe(TUTOR);
    expect(getRival('ninguem').id).toBe('tioZe');
    expect(TUTOR.hearts).toBe(3);
  });

  it('as mãos do roteiro são pedras de verdade, sem repetição, e o dorme completa o jogo', () => {
    for (const round of Object.keys(TUTORIAL_DEALS)) {
      const { hands, boneyard } = tutorialDeal(Number(round));
      const ids = [...hands.player, ...hands.tioZe, ...boneyard].map((t) => t.id);
      expect(new Set(ids).size).toBe(FULL_SET.length);
      expect(ids.length).toBe(FULL_SET.length);
      for (const id of TUTORIAL_DEALS[round].top) expect(boneyard[TUTORIAL_DEALS[round].top.indexOf(id)].id).toBe(id);
    }
  });

  it('começa na mesa do Vô Juca, com a rodada 1 do roteiro e você abrindo com a [6|6]', () => {
    const s = start();
    expect(s.phase).toBe('playing');
    expect(s.rivalId).toBe(TUTOR_ID);
    expect(s.tutorial).toEqual({ step: 0, replay: false });
    expect(s.hearts).toEqual({ player: 5, tioZe: 3 });
    expect(s.turn).toBe('player');
    expect(s.openingTileId).toBe('6-6');
    expect(s.hands.player.map((t) => t.id).sort()).toEqual([...TUTORIAL_DEALS[1].player].sort());
    expect(s.relics.player).toEqual([]);
    expect(s.seed).toBeNull();
    expect(s.run.node).toBeNull();
    expect(start({ replay: true }).tutorial.replay).toBe(true);
  });

  it('o roteiro joga do começo ao fim: rodada 1 de batida simples, a Caneca, rodada 2 de batida de bucha', () => {
    const { state, seen } = runScript();
    expect(seen.map((x) => x.id)).toEqual(TUTORIAL_STEPS.map((x) => x.id));
    expect(state.hearts.tioZe).toBe(0);
    expect(state.hearts.player).toBe(5);
    expect(state.duelWinner).toBe('player');
    expect(state.phase).toBe('roundOver');
    // nada de prêmio, tampinha, nó ou loja: é treino
    expect(state.stats.caps).toBe(0);
    expect(state.stats.matchesWon).toBe(0);
    expect(state.run.cleared).toEqual([]);
    expect(state.relics.player).toEqual([TUTORIAL_GIFT]);
    // quatro múltiplos de 5 seus ($3 cada) a partir dos $5
    expect(state.coins.player).toBe(5 + 4 * 3);
    const at = (id) => seen.find((x) => x.id === id).state;
    // rodada 1: batida simples (1♥), rodada 2: batida de bucha (2♥)
    expect(at('hit').roundResult).toMatchObject({ kind: 'normal', winner: 'player', damage: 1 });
    expect(at('hit').hearts.tioZe).toBe(2);
    expect(at('won').roundResult).toMatchObject({ kind: 'bucha', winner: 'player', damage: 2 });
    // o múltiplo de 5 do rival pagou para ele
    expect(at('sideWhy').coins.tioZe).toBe(8);
    // a escolha da ponta: na direita, 5 e 5
    expect(getOpenEnds(at('rivalLast').board)).toEqual({ left: 5, right: 5 });
    // a compra trouxe a [1|0] do topo do dorme
    expect(at('ladder').hands.player.some((t) => t.id === '0-1')).toBe(true);
    expect(at('ladder').drawsThisTurn).toBe(1);
    // a Caneca deu a vez de novo depois da bucha [3|3]
    expect(at('combo').turn).toBe('player');
    expect(at('combo').events.some((e) => e.type === 'proc' && e.id === 'caneca' && e.text.includes('JOGUE DE NOVO'))).toBe(true);
    // o fim é do treino: duelEnd marcado, sem matchWon
    expect(state.events.some((e) => e.type === 'duelEnd' && e.tutorial)).toBe(true);
  });

  it('a mesa só aceita a jogada do passo (pedra errada, ponta errada, compra, passe, DEV)', () => {
    let s = start();
    // no cartão de abertura nada joga
    expect(act(s, 'PLAY', { actor: 'player', tileId: '6-6', side: 'root' })).toBe(s);
    while (tutorialStepOf(s).id !== 'open') s = act(s, 'TUTORIAL_NEXT');
    expect(act(s, 'TUTORIAL_NEXT')).toBe(s);
    expect(act(s, 'DRAW', { actor: 'player' })).toBe(s);
    expect(act(s, 'PASS', { actor: 'player' })).toBe(s);
    expect(act(s, 'TIO_ZE_ACT')).toBe(s);
    expect(act(s, 'DEV', { op: 'winMatch' })).toBe(s);
    expect(act(s, 'NEXT_ROUND', { deck: FULL_SET })).toBe(s);
    s = act(s, 'PLAY', { actor: 'player', tileId: '6-6', side: 'root' });
    expect(tutorialStepOf(s).id).toBe('rivalMatch');
    // na vez dele, você não joga; ele joga o roteiro
    expect(act(s, 'PLAY', { actor: 'player', tileId: '2-4', side: 'right' })).toBe(s);
    s = act(s, 'TIO_ZE_ACT');
    expect(boardTilesInOrder(s.board).map((t) => t.id)).toEqual(['6-6', '2-6']);
    // a ponta errada não vale
    while (tutorialStepOf(s).id !== 'side') s = obey(s);
    expect(act(s, 'PLAY', { actor: 'player', tileId: '0-5', side: 'left' })).toBe(s);
    expect(act(s, 'PLAY', { actor: 'player', tileId: '0-5', side: 'right' })).not.toBe(s);
  });

  it('o presente entra na hotbar ao chegar no passo, e a rodada 2 dá as mãos dela', () => {
    let s = start();
    while (tutorialStepOf(s).id !== 'gift') s = obey(s);
    expect(s.relics.player).toEqual([TUTORIAL_GIFT]);
    expect(s.events.some((e) => e.type === 'proc' && e.source === 'relic' && e.id === TUTORIAL_GIFT)).toBe(true);
    while (tutorialStepOf(s).id !== 'round2') s = obey(s);
    expect(s.phase).toBe('playing');
    expect(s.round).toBe(2);
    expect(s.turn).toBe('player');
    expect(s.openingTileId).toBeNull();
    expect(s.hands.player.map((t) => t.id).sort()).toEqual([...TUTORIAL_DEALS[2].player].sort());
  });

  it('sair do treino zera tudo: a run nova não carrega nada dele', () => {
    const { state } = runScript();
    const run = act(state, 'NEW_RUN', { seed: 7, seedCode: 'BUX-777' });
    expect(run.tutorial).toBeNull();
    expect(run.phase).toBe('map');
    expect(run.relics.player).toEqual([]);
    expect(run.coins.player).toBe(5);
    expect(act(state, 'RETURN_TO_TITLE').tutorial).toBeNull();
  });

  it('a marca no aparelho: novato cai no treino, veterano não, o DEV pede de novo', () => {
    const keys = [TUTORIAL_KEY, 'buxaria_lifetime_stats', 'buxaria_gold_caps', 'buxaria:run', 'buxaria:collection'];
    const backup = keys.map((k) => [k, readRaw(k)]);
    try {
      for (const k of keys) writeRaw(k, null);
      expect(needsTutorial()).toBe(true);
      writeRaw('buxaria_lifetime_stats', JSON.stringify({ runsStarted: 3 }));
      expect(needsTutorial()).toBe(false);
      markTutorialPending();
      expect(needsTutorial()).toBe(true);
      markTutorialDone();
      expect(needsTutorial()).toBe(false);
      writeRaw(TUTORIAL_KEY, null);
      writeRaw('buxaria_lifetime_stats', null);
      writeRaw('buxaria:collection', JSON.stringify({ relics: [], tiles: [], rivals: ['tioZe'] }));
      expect(needsTutorial()).toBe(false);
      writeRaw('buxaria:collection', JSON.stringify({ relics: [], tiles: [], rivals: [] }));
      expect(needsTutorial()).toBe(true);
    } finally {
      for (const [k, v] of backup) writeRaw(k, v);
    }
  });

  it('todo passo tem fala curta o bastante para a caixa (e os de jogar, uma página só)', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.pages.length, step.id).toBeGreaterThan(0);
      for (const page of step.pages) expect(page.length, `${step.id}: ${page}`).toBeLessThanOrEqual(136);
      if (step.expect.type !== 'tap') expect(step.pages.length, step.id).toBe(1);
    }
    expect(TUTORIAL_STEPS[0].card).toBe('intro');
    expect(TUTORIAL_STEPS.at(-1).expect.type).toBe('end');
  });
});
