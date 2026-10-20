/**
 * Peças aprimoradas. O aprimoramento fica na própria pedra (`tile.enhancement`)
 * e vai junto para a mesa. Só as pedras da SUA mão são aprimoradas: o Tio Zé
 * joga dominó de raiz.
 *
 * Ganchos (todos puros, chamados pelo reducer):
 *   onPlay(state, ctx)     → estado    ao jogar a pedra (ctx: { tile, side })
 *   onRoundWin(state, ctx) → estado    você venceu a rodada com a pedra na mão ou na mesa
 *   extraTurn: true                    jogar a pedra não passa a vez
 *
 * O visual de cada uma ("shader" em CSS) fica em index.css: .tile-enh-<id>.
 */

import { gainCoins, patchFx, proc } from '../engine/effects.js';

export const GOLD_PLAY_COINS = 4;
export const GOLD_WIN_COINS = 10;

const BOTH_ENDS = Object.freeze(['left', 'right']);
const endsTouched = (side) => (side === 'root' ? BOTH_ENDS : [side]);

export const ENHANCEMENTS = Object.freeze({
  ouro: Object.freeze({
    id: 'ouro',
    name: 'Ouro',
    color: '#f0cc78',
    description: `+$${GOLD_PLAY_COINS} ao jogar. +$${GOLD_WIN_COINS} se você vencer a rodada com ela na mão ou na mesa.`,
    onPlay(state) {
      const next = gainCoins(state, 'player', GOLD_PLAY_COINS, 'ouro');
      return proc(next, { source: 'tile', id: 'ouro', text: `OURO +$${GOLD_PLAY_COINS}` });
    },
    onRoundWin(state) {
      const next = gainCoins(state, 'player', GOLD_WIN_COINS, 'ouro');
      return proc(next, { source: 'tile', id: 'ouro', text: `OURO +$${GOLD_WIN_COINS}` });
    },
  }),

  rubi: Object.freeze({
    id: 'rubi',
    name: 'Rubi (Sanguinária)',
    color: '#ff3b4e',
    description: 'Se o Tio Zé tiver que passar ou comprar logo depois dela, ele toma 1 de dano direto.',
    onPlay(state) {
      const next = patchFx(state, { rubyArmed: true });
      return proc(next, { source: 'tile', id: 'rubi', text: 'RUBI ARMADO' });
    },
  }),

  cristal: Object.freeze({
    id: 'cristal',
    name: 'Cristal (Camaleão)',
    color: '#6ff4ff',
    description: 'A ponta que ela deixar aceita qualquer número na SUA próxima jogada. Para o Tio Zé vale o número normal.',
    onPlay(state, { tile, side }) {
      const next = patchFx(state, { wild: { tileId: tile.id, sides: endsTouched(side) } });
      return proc(next, { source: 'tile', id: 'cristal', text: 'CRISTAL: PONTA CURINGA' });
    },
  }),

  chumbo: Object.freeze({
    id: 'chumbo',
    name: 'Chumbo',
    color: '#8d949c',
    description: 'Congela a ponta onde foi jogada durante a próxima vez inteira do Tio Zé.',
    onPlay(state, { side }) {
      const frozenSides = [...new Set([...state.fx.frozenSides, ...endsTouched(side)])];
      const next = patchFx(state, { frozenSides });
      return proc(next, { source: 'tile', id: 'chumbo', text: 'CHUMBO: PONTA CONGELADA' });
    },
  }),

  fantasma: Object.freeze({
    id: 'fantasma',
    name: 'Fantasma',
    color: '#b78cff',
    description: 'Jogar ela não gasta a sua vez: jogue outra pedra em seguida.',
    // o aviso "JOGUE DE NOVO" sai do reducer, só quando a vez extra vale (não na batida)
    extraTurn: true,
  }),
});

export const ENHANCEMENT_IDS = Object.freeze(Object.keys(ENHANCEMENTS));

export const getEnhancement = (id) => (id ? (ENHANCEMENTS[id] ?? null) : null);
