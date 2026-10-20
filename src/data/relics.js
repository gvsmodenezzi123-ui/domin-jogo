/**
 * Relíquias (talismãs). Você carrega até 4 por duelo (RELIC_SLOTS).
 *
 * Cada relíquia é dado + ganchos. O reducer chama os ganchos nos momentos certos
 * (todos puros, recebem e devolvem estado):
 *
 *   rules(state)                    regras extras de encaixe para as SUAS jogadas
 *                                   (ver BASE_RULES em engine/dominoLogic.js)
 *   onDeal(state)                   logo depois de distribuir as mãos da rodada
 *   onPlayerPlay(state, ctx)        depois de cada jogada sua
 *                                   ctx: { tile, side, placement, endsAfter, multipleOfFive }
 *   extraTurn(state, ctx)           true = essa jogada não passa a vez
 *   onTioZeMiss(state, ctx)         o Tio Zé comprou ou passou (ctx: { kind, tileId })
 *   batidaDamage(damage, state)     ajusta o dano da sua batida (aplicadas por `order`)
 *   trancaTileValue(tile)           valor de cada pedra sua na contagem da tranca
 *   drawOptions                     quantas pedras você vê ao comprar
 *   reveal                          o que a UI mostra da mão do Tio Zé
 *   ability: 'undo'                 botão de desfazer (Relógio Quebrado)
 *
 * Ícones: mapas de pixels 12x12 (cada caractere aponta para a paleta; '.' é vazio).
 */

import { isDouble, pipSum, sortHand } from '../engine/dominoLogic.js';
import { directDamage, gainCoins, loseCoins, patchFx, proc } from '../engine/effects.js';

export const RELIC_SLOTS = 4;

export const RARITIES = Object.freeze({
  comum: Object.freeze({ id: 'comum', label: 'COMUM', color: '#bfa86c', weight: 6 }),
  rara: Object.freeze({ id: 'rara', label: 'RARA', color: '#6fb6ff', weight: 3 }),
  lendaria: Object.freeze({ id: 'lendaria', label: 'LENDÁRIA', color: '#ff8f3a', weight: 1 }),
});

const K = '#0b0705';

const hasSix = (tile) => tile.a === 6 || tile.b === 6;
const relicProc = (state, id, text, tone = 'player') => proc(state, { source: 'relic', id, text, tone });

/** Dado Viciado: troca pedras leves da sua mão por pedras com 6 (do dorme ou, se faltar, do Tio Zé). */
function rigSixes(state) {
  let player = state.hands.player.slice();
  let tioZe = state.hands.tioZe.slice();
  const boneyard = state.boneyard.slice();
  let swaps = 0;
  while (player.filter(hasSix).length < 2) {
    const out = player.filter((t) => !hasSix(t)).sort((x, y) => pipSum(x) - pipSum(y))[0];
    if (!out) break;
    const fromBoneyard = boneyard.findIndex(hasSix);
    if (fromBoneyard >= 0) {
      const incoming = boneyard[fromBoneyard];
      boneyard[fromBoneyard] = out;
      player = player.map((t) => (t.id === out.id ? incoming : t));
    } else {
      const fromTioZe = tioZe.findIndex(hasSix);
      if (fromTioZe < 0) break;
      const incoming = tioZe[fromTioZe];
      tioZe = tioZe.map((t, i) => (i === fromTioZe ? out : t));
      player = player.map((t) => (t.id === out.id ? incoming : t));
    }
    swaps += 1;
  }
  if (!swaps) return state;
  const next = { ...state, hands: { player: sortHand(player), tioZe: sortHand(tioZe) }, boneyard };
  return relicProc(next, 'dadoViciado', `DADO VICIADO: +${swaps} PEDRA${swaps > 1 ? 'S' : ''} DE 6`);
}

export const RELICS = Object.freeze({
  caneca: Object.freeze({
    id: 'caneca',
    name: 'Caneca de Chopp',
    short: 'CANECA',
    rarity: 'comum',
    description: 'Jogar qualquer carroça (bucha) não gasta a sua vez.',
    extraTurn: (state, { tile }) => isDouble(tile),
    palette: { k: K, w: '#f4ecd2', W: '#ffffff', y: '#d99a2b', Y: '#f6cf6a', d: '#9c6416' },
    icon: [
      '..wW.ww.....',
      '.wwwwwwww...',
      '.kwWwwwwk...',
      '.kyYyyyykkk.',
      '.kyYyyyyk.k.',
      '.kyYyyyyk.k.',
      '.kyYyyyyk.k.',
      '.kyYyyyykkk.',
      '.kyYyyyyk...',
      '.kyyyyydk...',
      '.kkkkkkkk...',
      '............',
    ],
  }),

  olhoDeVidro: Object.freeze({
    id: 'olhoDeVidro',
    name: 'Olho de Vidro',
    short: 'OLHO DE VIDRO',
    rarity: 'comum',
    description: 'Revela para sempre as 2 pedras mais altas da mão do Tio Zé.',
    reveal: { topTiles: 2 },
    palette: { k: K, w: '#e9e3d0', b: '#3f7fd0', B: '#a8d4ff', p: '#08060a', R: '#c8261d' },
    icon: [
      '....kkkk....',
      '..kkwwwwkk..',
      '.kwwwwwwwwk.',
      '.kwwwbbbwwk.',
      'kwwwbBbbbwwk',
      'kwwwbbpbbwwk',
      'kwwwbbbbbwwk',
      '.kwwwbbbwwk.',
      '.kwwwwwwwRk.',
      '..kkwwwwkk..',
      '....kkkk....',
      '............',
    ],
  }),

  borracha: Object.freeze({
    id: 'borracha',
    name: 'Borracha Escolar',
    short: 'BORRACHA',
    rarity: 'comum',
    description: 'Uma vez por rodada, uma pedra encaixa com 1 número de diferença da ponta (um 5 numa ponta de 4 ou 6).',
    rules: (state) => (state.fx.borrachaUsed ? null : { fuzzy: true }),
    onPlayerPlay(state, { placement }) {
      if (placement.via !== 'fuzzy') return state;
      return relicProc(patchFx(state, { borrachaUsed: true }), 'borracha', 'BORRACHA: ENCAIXE ±1');
    },
    palette: { k: K, p: '#e88a9a', P: '#f8c2cb', d: '#a8505f', b: '#4b77c9', B: '#86a9ec', e: '#2c4a8a' },
    icon: [
      '............',
      '............',
      '............',
      '..kkkkkkkkk.',
      '.kPpppbBbbbk',
      '.kppppbbbbbk',
      '.kppppbbbbbk',
      '.kddddeeeeek',
      '..kkkkkkkkk.',
      '............',
      '............',
      '............',
    ],
  }),

  cinzeiro: Object.freeze({
    id: 'cinzeiro',
    name: 'Cinzeiro de Bar',
    short: 'CINZEIRO',
    rarity: 'comum',
    description: 'Cada vez que o Tio Zé comprar ou passar, você ganha +$2.',
    onTioZeMiss(state) {
      return relicProc(gainCoins(state, 'player', 2, 'cinzeiro'), 'cinzeiro', 'CINZEIRO +$2');
    },
    palette: { k: K, s: '#7d776c', o: '#ff8f3a', t: '#e6dfcd', G: '#c9d3d6', g: '#7f9aa2', d: '#3e535a' },
    icon: [
      '........s...',
      '.......s....',
      '........s...',
      '.......o....',
      '......tt....',
      '.....tt.....',
      '.kkkttkkkkk.',
      'kGggggggggGk',
      'kgkkkkkkkkgk',
      'kgggggggggdk',
      '.kddddddddk.',
      '..kkkkkkkk..',
    ],
  }),

  dadoViciado: Object.freeze({
    id: 'dadoViciado',
    name: 'Dado Viciado',
    short: 'DADO VICIADO',
    rarity: 'comum',
    description: 'Você sempre começa a rodada com pelo menos duas pedras que têm o número 6.',
    onDeal: rigSixes,
    palette: { k: K, R: '#ff6b5c', r: '#c8261d', d: '#741510', w: '#f4ecd2' },
    icon: [
      '.kkkkkkkkkk.',
      'kRrrrrrrrrrk',
      'krwwrrrrwwrk',
      'krwwrrrrwwrk',
      'krrrrrrrrrrk',
      'krwwrrrrwwrk',
      'krwwrrrrwwrk',
      'krrrrrrrrrrk',
      'krwwrrrrwwrk',
      'krwwrrrrwwdk',
      'kddddddddddk',
      '.kkkkkkkkkk.',
    ],
  }),

  barbante: Object.freeze({
    id: 'barbante',
    name: 'Barbante no Dedo',
    short: 'BARBANTE',
    rarity: 'comum',
    description: 'Ao comprar, você vê 2 pedras e escolhe uma. A outra volta para o fundo do dorme.',
    drawOptions: 2,
    palette: { k: K, s: '#c48a5c', S: '#93603d', r: '#d9473c' },
    icon: [
      '....kkk.....',
      '...kssSk....',
      '...ksssk....',
      '..rrrrrrr...',
      '.r.ksssk.r..',
      'r..kssSk..r.',
      '...ksssk....',
      '..kkssSkk...',
      '.kssssssSk..',
      '.ksssssssk..',
      '.kssssssSk..',
      '..kkkkkkk...',
    ],
  }),

  giz: Object.freeze({
    id: 'giz',
    name: 'Giz de Sinuca',
    short: 'GIZ DE SINUCA',
    rarity: 'comum',
    description: 'Fechar as pontas num múltiplo de 5 deixa você descartar 1 pedra da mão para o fundo do dorme.',
    onPlayerPlay(state, { multipleOfFive }) {
      if (!multipleOfFive || state.hands.player.length < 2) return state;
      return relicProc({ ...state, pending: { type: 'discard' } }, 'giz', 'GIZ: DESCARTE 1 PEDRA');
    },
    palette: { k: K, B: '#7fc4ff', d: '#3a78b8', b: '#2f7fd6', e: '#1d4f8a' },
    icon: [
      '............',
      '..kkkkkkkk..',
      '.kBBBBBBBBk.',
      '.kBBBddBBBk.',
      '.kBBBBBBBBk.',
      '.kkkkkkkkkk.',
      '.kbbbbbbbek.',
      '.kbbbbbbbek.',
      '.kbbbbbbbek.',
      '.kbbbbbbbek.',
      '.kkkkkkkkkk.',
      '............',
    ],
  }),

  chaveDeFenda: Object.freeze({
    id: 'chaveDeFenda',
    name: 'Chave de Fenda',
    short: 'CHAVE DE FENDA',
    rarity: 'comum',
    description: 'Suas buchas valem 0 pontos na mão na contagem da tranca.',
    trancaTileValue: (tile) => (isDouble(tile) ? 0 : pipSum(tile)),
    palette: { k: K, m: '#c9ccd0', r: '#d9473c', R: '#ff8f7f' },
    icon: [
      '..........k.',
      '.........kmk',
      '........kmk.',
      '.......kmk..',
      '......kmk...',
      '.....kmk....',
      '....kkk.....',
      '...krrk.....',
      '..krRrk.....',
      '.krRrk......',
      'krrrk.......',
      'kkkk........',
    ],
  }),

  dedal: Object.freeze({
    id: 'dedal',
    name: 'Dedal de Chumbo',
    short: 'DEDAL',
    rarity: 'rara',
    description: 'Se o Tio Zé passar ou comprar 2 vezes seguidas, ele perde 1 coração.',
    onTioZeMiss(state) {
      if (state.fx.tioZeMisses < 2) return state;
      const next = directDamage(patchFx(state, { tioZeMisses: 0 }), 'tioZe', 1, 'dedal');
      return relicProc(next, 'dedal', 'DEDAL: −1♥ NO TIO ZÉ');
    },
    palette: { k: K, g: '#5f666e', G: '#9aa3ab', d: '#2b3036' },
    icon: [
      '............',
      '....kkkk....',
      '...kgGgGk...',
      '..kgdgdgGk..',
      '..kggggggk..',
      '.kgdgdgdgGk.',
      '.kgggggggGk.',
      '.kgdgdgdggk.',
      'kGGGGGGGGGGk',
      'kggggggggggk',
      '.kkkkkkkkkk.',
      '............',
    ],
  }),

  espelho: Object.freeze({
    id: 'espelho',
    name: 'Espelho Retrovisor',
    short: 'ESPELHO',
    rarity: 'rara',
    description: 'Mostra exatamente qual pedra o Tio Zé acabou de comprar.',
    reveal: { lastDraw: true },
    onTioZeMiss(state, { kind, tileId }) {
      if (kind !== 'draw' || !tileId) return state;
      const [a, b] = tileId.split('-');
      return relicProc(state, 'espelho', `ESPELHO: ELE COMPROU ${a}|${b}`, 'info');
    },
    palette: { k: K, m: '#7fa8b8', W: '#e8f6ff', n: '#4f6f7c' },
    icon: [
      '............',
      '............',
      '.....kk.....',
      '.....kk.....',
      '.kkkkkkkkkk.',
      'kmWWmmmmmmmk',
      'kmmWWmmmmmmk',
      'kmmmmmmmmmnk',
      'kmmmmmmmmnnk',
      '.kkkkkkkkkk.',
      '............',
      '............',
    ],
  }),

  anel: Object.freeze({
    id: 'anel',
    name: 'Anel do Bicheiro',
    short: 'ANEL',
    rarity: 'rara',
    description: 'Se a sua jogada deixar as duas pontas com o mesmo número, o Tio Zé perde $3 (ou 1 coração, se não tiver o dinheiro).',
    onPlayerPlay(state, { endsAfter }) {
      if (!endsAfter || endsAfter.left !== endsAfter.right) return state;
      if (state.coins.tioZe >= 3) {
        return relicProc(loseCoins(state, 'tioZe', 3, 'anel'), 'anel', 'ANEL: TIO ZÉ −$3');
      }
      return relicProc(directDamage(state, 'tioZe', 1, 'anel'), 'anel', 'ANEL: −1♥ NO TIO ZÉ');
    },
    palette: { k: K, g: '#2fa35a', G: '#8ff0b0', y: '#d4a64a', Y: '#ffe7a3', d: '#8f6a24' },
    icon: [
      '....kkkk....',
      '...kgGGgk...',
      '...kggggk...',
      '....kggk....',
      '..kkkkkkkk..',
      '.kyYk..kyyk.',
      'kyYk....kyyk',
      'kyk......kyk',
      'kyk......kdk',
      'kyyk....kddk',
      '.kyyk..kddk.',
      '..kkkkkkkk..',
    ],
  }),

  buchaDeAco: Object.freeze({
    id: 'buchaDeAco',
    name: 'Bucha de Aço',
    short: 'BUCHA DE AÇO',
    rarity: 'rara',
    description: 'A pedra [0|0] vira curinga completo e encaixa em qualquer ponta.',
    rules: () => ({ steelZero: true }),
    onPlayerPlay(state, { placement }) {
      if (placement.via !== 'steel') return state;
      return relicProc(state, 'buchaDeAco', 'BUCHA DE AÇO: CURINGA');
    },
    palette: { k: K, s: '#b8c0c8', S: '#6f7880', W: '#ffffff', d: '#3a4046' },
    icon: [
      '...kkkkkk...',
      '..kWssssSk..',
      '..ksssssSk..',
      '..ksssssSk..',
      '..ksssssSk..',
      '..kddddddk..',
      '..ksssssSk..',
      '..ksssssSk..',
      '..ksssssSk..',
      '..ksssssSk..',
      '..kSSSSSSk..',
      '...kkkkkk...',
    ],
  }),

  carteira: Object.freeze({
    id: 'carteira',
    name: 'Carteira Recheada',
    short: 'CARTEIRA',
    rarity: 'rara',
    description: 'Para cada $15 que você tiver, suas batidas causam +1 de dano.',
    order: 1,
    batidaDamage: (damage, state) => damage + Math.floor(state.coins.player / 15),
    palette: { k: K, g: '#4f9a45', G: '#9fe08a', b: '#7a4a26', B: '#a8703f', d: '#4a2a12', y: '#d4a64a' },
    icon: [
      '............',
      '...kkkkkk...',
      '..kGgggggk..',
      '.kkgGgggkkk.',
      'kbbbbbbbbbbk',
      'kbBbbbbbbbbk',
      'kbbbbbbbkkkk',
      'kbbbbbbkyyyk',
      'kbbbbbbbkkkk',
      'kbbbbbbbbbbk',
      'kddddddddddk',
      '.kkkkkkkkkk.',
    ],
  }),

  maoGrande: Object.freeze({
    id: 'maoGrande',
    name: 'Mão Grande',
    short: 'MÃO GRANDE',
    rarity: 'lendaria',
    description: 'Se você bater e o Tio Zé ainda tiver 4 ou mais pedras, o dano da batida dobra.',
    order: 2,
    batidaDamage: (damage, state) => (state.hands.tioZe.length >= 4 ? damage * 2 : damage),
    palette: { k: K, s: '#c48a5c', S: '#93603d' },
    icon: [
      '..kk.kk.kk..',
      '.kssksskssk.',
      '.kssksskssk.',
      '.kssksskssk.',
      '.kssssssssk.',
      '.ksssssssskk',
      '.kssssssskSk',
      '.kssssssksSk',
      '.ksssssssSk.',
      '..ksssssSk..',
      '..kssssSSk..',
      '..kkkkkkkk..',
    ],
  }),

  relogio: Object.freeze({
    id: 'relogio',
    name: 'Relógio Quebrado',
    short: 'RELÓGIO',
    rarity: 'lendaria',
    description: 'Uma vez por rodada, desfaz a última jogada do Tio Zé: a pedra volta para a mão dele e ele perde a vez.',
    ability: 'undo',
    palette: { k: K, y: '#d4a64a', w: '#efe3c2', c: '#5a4531' },
    icon: [
      '.....kk.....',
      '....kyyk....',
      '...kkkkkk...',
      '..kyyyyyyk..',
      '.kywwwwwwyk.',
      '.kywwkwwcyk.',
      '.kywwkkcwyk.',
      '.kywwwcwwyk.',
      '.kywwcwwwyk.',
      '..kyyyyyyk..',
      '...kkkkkk...',
      '............',
    ],
  }),
});

export const RELIC_IDS = Object.freeze(Object.keys(RELICS));

export const getRelic = (id) => RELICS[id] ?? null;

