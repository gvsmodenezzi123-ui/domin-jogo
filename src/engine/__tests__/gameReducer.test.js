import { describe, expect, it } from 'vitest';
import { TIO_ZE_REFLEX_MS, buildTioZeView, decideTioZeAction } from '../../ai/tioZeAI.js';
import { TIO_ZE_FACES, HEART_BROKEN, HEART_FULL } from '../../components/sprites.js';
import { FULL_SET, makeTile } from '../dominoLogic.js';
import { deriveBanner, deriveTioZeSpeech } from '../gameFeedback.js';
import { createInitialState, gameReducer } from '../gameReducer.js';

const t = (a, b) => makeTile(a, b);

/** Monta um baralho: 7 do jogador, 7 do Tio Zé e o resto no dorme (na ordem dada). */
function deckWith(player, tioZe, boneyardFirst = []) {
  const used = new Set([...player, ...tioZe, ...boneyardFirst].map((x) => x.id));
  const rest = FULL_SET.filter((x) => !used.has(x.id));
  return [...player, ...tioZe, ...boneyardFirst, ...rest];
}

const PLAYER = [t(6, 6), t(0, 1), t(0, 2), t(1, 2), t(1, 3), t(2, 3), t(0, 3)];
const TIOZE = [t(5, 5), t(4, 4), t(4, 5), t(3, 4), t(2, 4), t(1, 4), t(0, 4)];

function start(deck = deckWith(PLAYER, TIOZE)) {
  return gameReducer(createInitialState(), { type: 'START_DUEL', deck });
}

describe('abertura', () => {
  it('quem tem a maior bucha começa e é obrigado a abrir com ela', () => {
    const s = start();
    expect(s.turn).toBe('player');
    expect(s.openingTileId).toBe('6-6');
    expect(gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '0-1', side: 'root' })).toBe(s);
    expect(gameReducer(s, { type: 'DRAW', actor: 'player' })).toBe(s);
    expect(gameReducer(s, { type: 'PASS', actor: 'player' })).toBe(s);
    const s2 = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '6-6', side: 'root' });
    expect(s2.turn).toBe('tioZe');
    expect(s2.board.root.id).toBe('6-6');
  });

  it('ninguém joga fora da vez', () => {
    const s = start();
    expect(gameReducer(s, { type: 'PLAY', actor: 'tioZe', tileId: '5-5', side: 'root' })).toBe(s);
  });
});

describe('controle de ritmo', () => {
  it('compra: 1ª grátis, 2ª $3, 3ª 1 coração, depois bloqueia', () => {
    let s = start();
    s = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '6-6', side: 'root' });
    // Tio Zé não tem 6: passa a vez manualmente para testar a compra do jogador
    s = gameReducer(s, { type: 'PASS', actor: 'tioZe' });
    expect(s.turn).toBe('player');
    const coins = s.coins.player;
    const hearts = s.hearts.player;
    const handSize = s.hands.player.length;

    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.coins.player).toBe(coins);
    expect(s.hearts.player).toBe(hearts);
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.coins.player).toBe(coins - 3);
    s = gameReducer(s, { type: 'DRAW', actor: 'player' });
    expect(s.hearts.player).toBe(hearts - 1);
    expect(s.events.some((e) => e.type === 'heartLost' && e.reason === 'draw')).toBe(true);
    expect(s.hands.player.length).toBe(handSize + 3);
    expect(gameReducer(s, { type: 'DRAW', actor: 'player' })).toBe(s);
  });

  it('dois passes seguidos encerram a rodada por tranca na hora', () => {
    let s = start();
    s = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '6-6', side: 'root' });
    s = gameReducer(s, { type: 'PASS', actor: 'tioZe' });
    expect(s.phase).toBe('playing');
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.phase).toBe('roundOver');
    expect(s.roundResult).toMatchObject({ kind: 'tranca', reason: 'passes' });
    // menor soma vence: jogador tem 15 pontos, Tio Zé tem 44
    expect(s.roundResult.winner).toBe('player');
    expect(s.hearts.tioZe).toBe(4);
    expect(s.nextStarter).toBe('player');
  });

  it('jogar zera a contagem de passes', () => {
    let s = start(deckWith(PLAYER, [t(6, 5), ...TIOZE.slice(1)]));
    s = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '6-6', side: 'root' });
    s = gameReducer(s, { type: 'PLAY', actor: 'tioZe', tileId: '5-6', side: 'right' });
    expect(s.consecutivePasses).toBe(0);
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    expect(s.consecutivePasses).toBe(1);
    expect(s.phase).toBe('playing');
  });
});

describe('múltiplo de 5', () => {
  it('quem fecha múltiplo de 5 ganha $3 e gera o banner', () => {
    let s = start(deckWith([t(5, 5), ...PLAYER.slice(1)], [t(1, 1), t(2, 2), t(0, 0), t(3, 3), t(1, 4), t(2, 4), t(0, 4)]));
    expect(s.openingTileId).toBe('5-5');
    const before = s.coins.player;
    s = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '5-5', side: 'root' });
    expect(s.coins.player).toBe(before + 3);
    expect(deriveBanner(s.events)).toMatchObject({ text: '+$3 MÚLTIPLO DE 5!', tone: 'player' });
  });
});

describe('Tio Zé', () => {
  it('delay reflexivo de 700ms', () => {
    expect(TIO_ZE_REFLEX_MS).toBe(700);
  });

  it('joga quando pode e prefere descarregar a bucha pesada', () => {
    let s = start(deckWith([t(0, 0), t(0, 1), t(0, 2), t(1, 2), t(1, 3), t(2, 3), t(0, 3)], [t(6, 6), t(6, 0), t(0, 4), t(4, 4), t(1, 4), t(2, 4), t(3, 4)]));
    // Tio Zé abre com a 6-6 obrigatória
    expect(s.turn).toBe('tioZe');
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.board.root.id).toBe('6-6');
    // jogada inválida (raiz com a mesa já aberta) é ignorada
    expect(gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '0-0', side: 'root' })).toBe(s);
    // jogador passa; com pontas 6 e 6, o Tio Zé tem a 6-0 e joga em vez de passar
    s = gameReducer(s, { type: 'PASS', actor: 'player' });
    const decision = decideTioZeAction(buildTioZeView(s));
    expect(decision).toMatchObject({ type: 'PLAY', tileId: '0-6' });
  });

  it('sem jogada: compra grátis antes de passar', () => {
    let s = start();
    s = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '6-6', side: 'root' });
    expect(decideTioZeAction(buildTioZeView(s))).toMatchObject({ type: 'DRAW' });
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(s.drawsThisTurn).toBe(1);
  });

  it('fala alguma coisa ao jogar', () => {
    let s = start();
    s = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '6-6', side: 'root' });
    s = gameReducer(s, { type: 'TIO_ZE_ACT' });
    expect(deriveTioZeSpeech(s.events)?.text).toBeTruthy();
  });
});

describe('sprites', () => {
  it('rostos do Tio Zé são 16x16 e corações 9x8', () => {
    for (const face of Object.values(TIO_ZE_FACES)) {
      expect(face).toHaveLength(16);
      face.forEach((row) => expect(row).toHaveLength(16));
    }
    for (const heart of [HEART_FULL, HEART_BROKEN]) {
      expect(heart).toHaveLength(8);
      heart.forEach((row) => expect(row).toHaveLength(9));
    }
  });
});
