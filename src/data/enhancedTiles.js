/**
 * Peças aprimoradas. O aprimoramento fica na própria pedra (`tile.enhancement`)
 * e vai junto para a mesa. Quem tem a pedra aprimorada é o dono do baralho:
 * as que você compra na loja substituem a versão comum no SEU baralho
 * (`state.decks.player`); rivais podem ter as deles (`state.decks.tioZe`).
 *
 * Ganchos (todos puros, chamados pelo reducer). `ctx` sempre traz
 * { owner, foe } — quem jogou a pedra e o adversário:
 *   onPlay(state, ctx)     → estado    ao jogar a pedra (ctx: + { tile, side })
 *   onRoundWin(state, ctx) → estado    o dono venceu a rodada com ela na mão ou na mesa
 *   extraTurn: true                    jogar a pedra não passa a vez
 *
 * O visual de cada uma ("shader" em CSS) fica em index.css: .tile-enh-<id>.
 */

import { gainCoins, patchFx, proc } from '../engine/effects.js';

export const GOLD_PLAY_COINS = 4;
export const GOLD_WIN_COINS = 10;

const BOTH_ENDS = Object.freeze(['left', 'right']);
const endsTouched = (side) => (side === 'root' ? BOTH_ENDS : [side]);
const tone = (owner) => (owner === 'player' ? 'player' : 'enemy');
const tileProc = (state, owner, id, text) => proc(state, { source: 'tile', id, text, tone: tone(owner), owner });

export const ENHANCEMENTS = Object.freeze({
  ouro: Object.freeze({
    id: 'ouro',
    name: 'Ouro',
    rarity: 'raro',
    price: 8,
    color: '#f0cc78',
    description: `+$${GOLD_PLAY_COINS} ao jogar. +$${GOLD_WIN_COINS} se você vencer a rodada com ela na mão ou na mesa.`,
    onPlay(state, { owner }) {
      const next = gainCoins(state, owner, GOLD_PLAY_COINS, 'ouro');
      return tileProc(next, owner, 'ouro', owner === 'player' ? `OURO +$${GOLD_PLAY_COINS}` : `OURO DELE +$${GOLD_PLAY_COINS}`);
    },
    onRoundWin(state, { owner }) {
      const next = gainCoins(state, owner, GOLD_WIN_COINS, 'ouro');
      return tileProc(next, owner, 'ouro', owner === 'player' ? `OURO +$${GOLD_WIN_COINS}` : `OURO DELE +$${GOLD_WIN_COINS}`);
    },
  }),

  rubi: Object.freeze({
    id: 'rubi',
    name: 'Rubi Sanguinária',
    rarity: 'mitico',
    price: 20,
    color: '#ff3b4e',
    description: 'Se o rival tiver que passar ou comprar logo depois dela, ele toma 1 de dano direto.',
    onPlay(state, { owner, foe }) {
      const next = patchFx(state, { ruby: foe });
      return tileProc(next, owner, 'rubi', owner === 'player' ? 'RUBI ARMADO' : 'RUBI DELE ARMADO');
    },
  }),

  cristal: Object.freeze({
    id: 'cristal',
    name: 'Cristal Camaleão',
    rarity: 'lendario',
    price: 14,
    color: '#6ff4ff',
    description: 'A ponta que ela deixar aceita qualquer número na SUA próxima jogada. Para o rival vale o número normal.',
    onPlay(state, { owner, tile, side }) {
      const next = patchFx(state, { wild: { seat: owner, tileId: tile.id, sides: endsTouched(side) } });
      return tileProc(next, owner, 'cristal', owner === 'player' ? 'CRISTAL: PONTA CURINGA' : 'CRISTAL DELE: CURINGA');
    },
  }),

  chumbo: Object.freeze({
    id: 'chumbo',
    name: 'Chumbo',
    rarity: 'lendario',
    price: 12,
    color: '#8d949c',
    description: 'Trava a ponta onde foi jogada durante a próxima vez inteira do rival.',
    onPlay(state, { owner, foe, side }) {
      const frozen = { ...state.fx.frozen, [foe]: [...new Set([...state.fx.frozen[foe], ...endsTouched(side)])] };
      const next = patchFx(state, { frozen });
      return tileProc(next, owner, 'chumbo', owner === 'player' ? 'CHUMBO: PONTA TRAVADA' : 'CHUMBO DELE: PONTA TRAVADA');
    },
  }),

  fantasma: Object.freeze({
    id: 'fantasma',
    name: 'Fantasma',
    rarity: 'mitico',
    price: 24,
    color: '#b78cff',
    description: 'Jogar ela não gasta a sua vez: jogue outra pedra em seguida.',
    // o aviso "JOGUE DE NOVO" sai do reducer, só quando a vez extra vale (não na batida)
    extraTurn: true,
  }),
});

export const ENHANCEMENT_IDS = Object.freeze(Object.keys(ENHANCEMENTS));

export const getEnhancement = (id) => (id ? (ENHANCEMENTS[id] ?? null) : null);
