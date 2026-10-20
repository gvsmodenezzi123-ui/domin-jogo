/**
 * Talismãs (relíquias). Você carrega até 4 (RELIC_SLOTS); os rivais têm os deles.
 * Os efeitos valem para quem é o DONO do talismã: o Cinzeiro do Marcão paga ele
 * quando VOCÊ compra ou passa, o Dedal da Dona Neide tira o SEU coração, etc.
 *
 * Cada talismã é dado + ganchos puros. O reducer chama os ganchos do dono e
 * passa `ctx` com { owner, foe } (o dono e o adversário dele):
 *
 *   rules(state, owner)            regras extras de encaixe para as jogadas do dono
 *                                  (ver BASE_RULES em engine/dominoLogic.js)
 *   onDeal(state, ctx)             logo depois de distribuir as mãos da rodada
 *   onPlay(state, ctx)             depois de cada jogada do dono
 *                                  ctx: + { tile, side, placement, endsAfter, multipleOfFive }
 *   extraTurn(state, ctx)          true = essa jogada do dono não passa a vez
 *   onFoeMiss(state, ctx)          o adversário comprou ou passou (ctx: + { kind, tileId })
 *   batidaDamage(damage, state, ctx)  ajusta o dano da batida do dono (aplicadas por `order`)
 *   trancaTileValue(tile)          valor de cada pedra do dono na contagem da tranca
 *   drawOptions                    quantas pedras você vê ao comprar (só o jogador escolhe)
 *   reveal                         o que a SUA tela mostra da mão do rival
 *   ability: 'undo'                botão de desfazer (Relógio Quebrado, só o jogador)
 *
 * Ícones: mapas de pixels 12x12 (cada caractere aponta para a paleta; '.' é vazio).
 */

import { isDouble, pipSum, sortHand } from '../engine/dominoLogic.js';
import { directDamage, emit, gainCoins, loseCoins, patchFx, proc } from '../engine/effects.js';

export const RELIC_SLOTS = 4;

const K = '#0b0705';

const hasSix = (tile) => tile.a === 6 || tile.b === 6;
const mine = (owner) => owner === 'player';
const relicProc = (state, owner, id, text) =>
  proc(state, { source: 'relic', id, text, tone: mine(owner) ? 'player' : 'enemy', owner });

/** Marca o talismã como usado nesta rodada (Borracha, Relógio). */
export function markUsed(state, owner, id) {
  const used = { ...state.fx.used, [owner]: [...new Set([...state.fx.used[owner], id])] };
  return patchFx(state, { used });
}

export const isUsed = (state, owner, id) => state.fx.used[owner].includes(id);

/** Dado Viciado: troca pedras leves do dono por pedras com 6 (do dorme ou, se faltar, do adversário). */
function rigSixes(state, { owner, foe }) {
  let own = state.hands[owner].slice();
  let other = state.hands[foe].slice();
  const boneyard = state.boneyard.slice();
  let swaps = 0;
  while (own.filter(hasSix).length < 2) {
    const out = own.filter((t) => !hasSix(t)).sort((x, y) => pipSum(x) - pipSum(y))[0];
    if (!out) break;
    const fromBoneyard = boneyard.findIndex(hasSix);
    if (fromBoneyard >= 0) {
      const incoming = boneyard[fromBoneyard];
      boneyard[fromBoneyard] = out;
      own = own.map((t) => (t.id === out.id ? incoming : t));
    } else {
      const fromFoe = other.findIndex(hasSix);
      if (fromFoe < 0) break;
      const incoming = other[fromFoe];
      other = other.map((t, i) => (i === fromFoe ? out : t));
      own = own.map((t) => (t.id === out.id ? incoming : t));
    }
    swaps += 1;
  }
  if (!swaps) return state;
  const next = { ...state, hands: { ...state.hands, [owner]: sortHand(own), [foe]: sortHand(other) }, boneyard };
  return relicProc(next, owner, 'dadoViciado', `DADO VICIADO: +${swaps} PEDRA${swaps > 1 ? 'S' : ''} DE 6`);
}

/** Giz de Sinuca: você escolhe o descarte; um rival descarta a pedra mais pesada na hora. */
function chalkDiscard(state, { owner }) {
  if (mine(owner)) return relicProc({ ...state, pending: { type: 'discard' } }, owner, 'giz', 'GIZ: DESCARTE 1 PEDRA');
  const hand = state.hands[owner];
  const heaviest = hand.slice().sort((x, y) => pipSum(y) - pipSum(x))[0];
  const next = {
    ...state,
    hands: { ...state.hands, [owner]: hand.filter((t) => t.id !== heaviest.id) },
    boneyard: [...state.boneyard, { id: heaviest.id, a: heaviest.a, b: heaviest.b }],
  };
  return relicProc(emit(next, { type: 'discard', by: owner, tileId: heaviest.id }), owner, 'giz', 'GIZ DELE: DESCARTOU 1');
}

export const RELICS = Object.freeze({
  caneca: Object.freeze({
    id: 'caneca',
    name: 'Caneca de Chopp',
    short: 'CANECA',
    rarity: 'comum',
    price: 6,
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

  borracha: Object.freeze({
    id: 'borracha',
    name: 'Borracha Escolar',
    short: 'BORRACHA',
    rarity: 'comum',
    price: 4,
    description: 'Uma vez por rodada, uma pedra encaixa com 1 número de diferença da ponta (um 5 numa ponta de 4 ou 6).',
    rules: (state, owner) => (isUsed(state, owner, 'borracha') ? null : { fuzzy: true }),
    onPlay(state, { owner, placement }) {
      if (placement.via !== 'fuzzy') return state;
      return relicProc(markUsed(state, owner, 'borracha'), owner, 'borracha', 'BORRACHA: ENCAIXE ±1');
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
    price: 5,
    description: 'Cada vez que o rival comprar ou passar, você ganha +$2.',
    onFoeMiss(state, { owner }) {
      return relicProc(gainCoins(state, owner, 2, 'cinzeiro'), owner, 'cinzeiro', mine(owner) ? 'CINZEIRO +$2' : 'CINZEIRO DELE +$2');
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

  giz: Object.freeze({
    id: 'giz',
    name: 'Giz de Sinuca',
    short: 'GIZ DE SINUCA',
    rarity: 'comum',
    price: 5,
    description: 'Fechar as pontas num múltiplo de 5 deixa você descartar 1 pedra da mão para o fundo do dorme.',
    onPlay(state, ctx) {
      if (!ctx.multipleOfFive || state.hands[ctx.owner].length < 2) return state;
      return chalkDiscard(state, ctx);
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

  olhoDeVidro: Object.freeze({
    id: 'olhoDeVidro',
    name: 'Olho de Vidro',
    short: 'OLHO DE VIDRO',
    rarity: 'raro',
    price: 7,
    description: 'Revela para sempre as 2 pedras mais altas da mão do rival.',
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

  dadoViciado: Object.freeze({
    id: 'dadoViciado',
    name: 'Dado Viciado',
    short: 'DADO VICIADO',
    rarity: 'raro',
    price: 8,
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

  chaveDeFenda: Object.freeze({
    id: 'chaveDeFenda',
    name: 'Chave de Fenda',
    short: 'CHAVE DE FENDA',
    rarity: 'raro',
    price: 8,
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

  buchaDeAco: Object.freeze({
    id: 'buchaDeAco',
    name: 'Bucha de Aço',
    short: 'BUCHA DE AÇO',
    rarity: 'raro',
    price: 10,
    description: 'A pedra [0|0] vira curinga completo e encaixa em qualquer ponta.',
    rules: () => ({ steelZero: true }),
    onPlay(state, { owner, placement }) {
      if (placement.via !== 'steel') return state;
      return relicProc(state, owner, 'buchaDeAco', 'BUCHA DE AÇO: CURINGA');
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

  dedal: Object.freeze({
    id: 'dedal',
    name: 'Dedal de Chumbo',
    short: 'DEDAL',
    rarity: 'lendario',
    price: 14,
    description: 'Se o rival passar ou comprar 2 vezes seguidas, ele perde 1 coração.',
    onFoeMiss(state, { owner, foe }) {
      if (state.fx.misses[foe] < 2) return state;
      const reset = patchFx(state, { misses: { ...state.fx.misses, [foe]: 0 } });
      const next = directDamage(reset, foe, 1, 'dedal');
      return relicProc(next, owner, 'dedal', mine(owner) ? 'DEDAL: −1♥ NO RIVAL' : 'DEDAL DELE: −1♥ EM VOCÊ');
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
    rarity: 'lendario',
    price: 12,
    description: 'Mostra exatamente qual pedra o rival acabou de comprar.',
    reveal: { lastDraw: true },
    onFoeMiss(state, { owner, kind, tileId }) {
      if (!mine(owner) || kind !== 'draw' || !tileId) return state;
      const [a, b] = tileId.split('-');
      return proc(state, { source: 'relic', id: 'espelho', text: `ESPELHO: ELE COMPROU ${a}|${b}`, tone: 'info', owner });
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

  carteira: Object.freeze({
    id: 'carteira',
    name: 'Carteira Recheada',
    short: 'CARTEIRA',
    rarity: 'lendario',
    price: 16,
    description: 'Para cada $15 que você tiver, suas batidas causam +1 de dano.',
    order: 1,
    batidaDamage: (damage, state, { owner }) => damage + Math.floor(state.coins[owner] / 15),
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

  anel: Object.freeze({
    id: 'anel',
    name: 'Anel do Bicheiro',
    short: 'ANEL',
    rarity: 'lendario',
    price: 14,
    description: 'Se a sua jogada deixar as duas pontas com o mesmo número, o rival perde $3 (ou 1 coração, se não tiver o dinheiro).',
    onPlay(state, { owner, foe, endsAfter }) {
      if (!endsAfter || endsAfter.left !== endsAfter.right) return state;
      const victim = mine(owner) ? 'RIVAL' : 'VOCÊ';
      if (state.coins[foe] >= 3) {
        return relicProc(loseCoins(state, foe, 3, 'anel'), owner, 'anel', `ANEL: ${victim} −$3`);
      }
      return relicProc(directDamage(state, foe, 1, 'anel'), owner, 'anel', `ANEL: −1♥ ${mine(owner) ? 'NO RIVAL' : 'EM VOCÊ'}`);
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

  maoGrande: Object.freeze({
    id: 'maoGrande',
    name: 'Mão Grande',
    short: 'MÃO GRANDE',
    rarity: 'mitico',
    price: 25,
    description: 'Se você bater e o rival ainda tiver 4 ou mais pedras, o dano da batida dobra.',
    order: 2,
    batidaDamage: (damage, state, { foe }) => (state.hands[foe].length >= 4 ? damage * 2 : damage),
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
    rarity: 'mitico',
    price: 22,
    description: 'Uma vez por rodada, desfaz a última jogada do rival: a pedra volta para a mão dele e ele perde a vez.',
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

  barbante: Object.freeze({
    id: 'barbante',
    name: 'Barbante Mágico',
    short: 'BARBANTE',
    rarity: 'mitico',
    price: 18,
    description: 'Ao comprar, você vê 3 pedras e escolhe uma. As outras voltam para o fundo do dorme.',
    drawOptions: 3,
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
});

export const RELIC_IDS = Object.freeze(Object.keys(RELICS));

export const getRelic = (id) => RELICS[id] ?? null;
