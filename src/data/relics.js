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
 *   heartDrawCost                  a compra paga com coração custa N corações (Pacto do Coveiro)
 *   trancaDamage                   dano da tranca para quem perde a soma, dos dois lados (Tranca Cadavérica)
 *   cheatDeath                     1x por partida o golpe fatal deixa o dono com 1 coração (Falsa Partida)
 *
 * Patch 0.7.0 (20 talismãs novos; 10 trancados por conquista, ver engine/achievements.js):
 *   lockedBy                       id da conquista que libera o talismã (sem ela, não sai na loja nem no beco)
 *   onDraw(state, ctx)             depois de cada compra do dono (ctx: + { tileId, cost })
 *   onFoePlay(state, ctx)          o adversário jogou uma pedra (ctx: + { tile })
 *   passFee                        o passe estratégico custa $N em vez de $3 (Moeda Furada)
 *   passHeartCost                  passar a vez custa N corações, nunca o último (Dado de Osso)
 *   trancaSumOffset                soma da tranca do dono mexida em N (Balança de Açougue: −10)
 *   firstRerollFree                o 1º reembaralhar de cada loja é de graça (Nota de 3 Reais)
 *   foresight                      mostra a pedra que o rival vai jogar (Óculos Fundo de Garrafa)
 *   foeDrawsUntilPlay / sellZero   o rival compra até encaixar; revenda a $0 (Dedo de Cadáver)
 *   rewindRound                    golpe fatal recomeça a rodada e queima 2 talismãs (Testamento)
 *   ability: 'canivete'            botão do Canivete Suíço (1x por partida, só o jogador)
 *
 * Versão 1.4 (18 talismãs novos, todos por conquista):
 *   onFoeFive(state, ctx)          o adversário fechou múltiplo de 5 (ctx: + { amount })
 *   freePaidDraw / freeSecondDraw  compra paga de graça 1x por partida (Bicarbonato) / a 2ª do turno (Óleo)
 *   trancaSumOffset(state, seat)   também pode ser função (Espátula: −3 por pedra comprada na rodada)
 *   trancaEdge                     tranca decidida por até N pontos é do dono, +1 de dano (Trena)
 *   trancaWinBonus                 +N de dano na tranca que o dono vence (Cadeado Enferrujado)
 *   rerollOnHurt                   batida tomada vira reembaralhar grátis na próxima loja (Pé de Coelho)
 *   rewindBatida                   1x por partida a batida do adversário volta (Ampulheta Rachada)
 *   heartCap                       senta na partida com até o máximo −N corações (Vela Preta)
 *   reveal.numberCounts            quantas pedras de cada número o rival tem (Lupa de Joalheiro)
 *   ability: 'grampo'              botão do Grampo de Cabelo (1x por rodada)
 *
 * Ícones: mapas de pixels 12x12 (cada caractere aponta para a paleta; '.' é vazio).
 */

import { mixSeed } from '../engine/seedEngine.js';
import { boardTileCount, canPlayOn, isDouble, pipSum, sortHand } from '../engine/dominoLogic.js';
import { countBought, directDamage, emit, gainCoins, loseCoins, patchFx, proc } from '../engine/effects.js';
import { getEnhancement } from './enhancedTiles.js';

export const RELIC_SLOTS = 4;

const K = '#0b0705';

const hasSix = (tile) => tile.a === 6 || tile.b === 6;
const mine = (owner) => owner === 'player';
/** No online (Patch PvP) as duas cadeiras são gente: o que era só "seu" vale para os dois lados. */
const human = (state, owner) => mine(owner) || Boolean(state.pvp);
const relicProc = (state, owner, id, text) =>
  proc(state, { source: 'relic', id, text, tone: mine(owner) ? 'player' : 'enemy', owner });

/** Marca o talismã como usado nesta rodada (Borracha, Relógio). */
export function markUsed(state, owner, id) {
  const used = { ...state.fx.used, [owner]: [...new Set([...state.fx.used[owner], id])] };
  return patchFx(state, { used });
}

export const isUsed = (state, owner, id) => state.fx.used[owner].includes(id);

/**
 * Sorteio de 0 a 99 fixo pela semente da run e pelo momento da partida (sem Math.random no
 * reducer), pelo `mixSeed` do motor de sementes.
 */
const roll = (state, salt) => mixSeed(state.seed ?? 0, `${salt}-${state.round}-${state.seq}`) % 100;

/** `seat` compra `count` pedras do topo do dorme de graça (Rádio de Pilha), como elas são no baralho dele. */
function forceDraw(state, seat, count) {
  const taken = state.boneyard.slice(0, count).map((t) => {
    const enhancement = state.decks?.[seat]?.[t.id];
    return enhancement ? { id: t.id, a: t.a, b: t.b, enhancement } : { id: t.id, a: t.a, b: t.b };
  });
  if (!taken.length) return state;
  let next = { ...state, boneyard: state.boneyard.slice(taken.length), hands: { ...state.hands, [seat]: [...state.hands[seat], ...taken] } };
  for (const tile of taken) next = emit(next, { type: 'drawTile', by: seat, tileId: tile.id, cost: null, forced: true });
  return countBought(next, seat, taken.length);
}

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
  if (state.pvp) {
    // online: cada um escolhe o seu descarte; se o outro já está escolhendo, este espera a vez
    const ask = { type: 'discard', owner };
    const next = state.pending ? { ...state, pendingNext: ask } : { ...state, pending: ask };
    return relicProc(next, owner, 'giz', 'GIZ: DESCARTE 1 PEDRA');
  }
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
    art: 'canecaChopp', // ícone 40x40 em components/HighDensitySprites.jsx
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
    art: 'borracha',
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
    art: 'cinzeiro',
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
    art: 'giz',
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
    art: 'olhoVidro',
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
    art: 'dadoViciado',
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
    art: 'chaveDeFenda',
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
    art: 'buchaDeAco',
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
    art: 'dedal',
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
    art: 'espelho',
    rarity: 'lendario',
    price: 12,
    description: 'Mostra exatamente qual pedra o rival acabou de comprar.',
    reveal: { lastDraw: true },
    onFoeMiss(state, { owner, kind, tileId }) {
      if (!human(state, owner) || kind !== 'draw' || !tileId) return state;
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
    art: 'carteira',
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
    art: 'anel',
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
    art: 'maoGrande',
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
    art: 'relogio',
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
    art: 'barbante',
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

  // ---------------------------------------------------------------------------
  // Necróticos (Patch 0.6.1): só no Mercado Negro do Corvo da Madrugada.
  // ---------------------------------------------------------------------------

  pactoCoveiro: Object.freeze({
    id: 'pactoCoveiro',
    name: 'Pacto do Coveiro',
    short: 'PACTO',
    art: 'pactoCoveiro',
    rarity: 'necrotico',
    price: 22,
    description: 'Toda batida sua dá +2 de dano. Em troca, a 3ª compra do dorme no mesmo turno custa 2 corações.',
    order: 5,
    batidaDamage: (damage) => damage + 2,
    heartDrawCost: 2,
    palette: { k: K, w: '#8a5a32', m: '#c9cfd4', r: '#a3121b' },
    icon: [
      '..kk........',
      '..kwk.......',
      '...kwk......',
      '....kwk.....',
      '.....kwk....',
      '......kwkk..',
      '......kmmmk.',
      '.kkk..kmmmmk',
      'krrrk.kmmmmk',
      'krkrk..kmmk.',
      'krrrk...kk..',
      '.kkk........',
    ],
  }),

  ossoEnsanguentado: Object.freeze({
    id: 'ossoEnsanguentado',
    name: 'Osso Ensanguentado',
    short: 'OSSO',
    art: 'ossoEnsanguentado',
    rarity: 'necrotico',
    price: 18,
    description: 'Cada bucha sua que entra na mesa arranca $3 do bolso do rival para o seu.',
    onPlay(state, { owner, foe, tile }) {
      if (!isDouble(tile)) return state;
      const taken = Math.min(3, state.coins[foe]);
      if (taken <= 0) return state;
      const next = gainCoins(loseCoins(state, foe, taken, 'ossoEnsanguentado'), owner, taken, 'ossoEnsanguentado');
      return relicProc(next, owner, 'ossoEnsanguentado', `OSSO: +$${taken} DO ${mine(owner) ? 'RIVAL' : 'SEU BOLSO'}`);
    },
    palette: { k: K, w: '#efe4c4', r: '#b3121c' },
    icon: [
      '............',
      '.kk......kk.',
      'kwwk....kwwk',
      'kwwwkkkkwwwk',
      '.kwwwwwwwwk.',
      'kwwwkkkkwwwk',
      'kwwk.r..kwwk',
      '.kk..r...kk.',
      '.....r...r..',
      '.....r...r..',
      '.........r..',
      '............',
    ],
  }),

  olhoMorte: Object.freeze({
    id: 'olhoMorte',
    name: 'Olho da Morte',
    short: 'OLHO DA MORTE',
    art: 'olhoMorte',
    rarity: 'necrotico',
    price: 26,
    description: 'Com o rival em 1 coração, qualquer pedra sua com 0 ou 6 que entra na mesa acaba a partida na hora.',
    onPlay(state, { owner, foe, tile }) {
      if (state.hearts[foe] !== 1) return state;
      const marked = [tile.a, tile.b].some((v) => v === 0 || v === 6);
      if (!marked) return state;
      const next = directDamage(state, foe, 1, 'olhoMorte');
      return relicProc(next, owner, 'olhoMorte', 'OLHO DA MORTE: FIM DE PARTIDA');
    },
    palette: { k: K, w: '#efe4c4', r: '#d1121c' },
    icon: [
      '...kkkkkk...',
      '..kwwwwwwk..',
      '.kwwwwwwwwk.',
      '.kwkkwwkkwk.',
      '.kwkkwwkrwk.',
      '.kwkkwwkkwk.',
      '.kwwwkkwwwk.',
      '..kwwwwwwk..',
      '...kwkwkwk..',
      '...kkkkkkk..',
      '............',
      '............',
    ],
  }),

  trancaCadaverica: Object.freeze({
    id: 'trancaCadaverica',
    name: 'Tranca Cadavérica',
    short: 'TRANCA CADAVÉRICA',
    art: 'trancaCadaverica',
    rarity: 'necrotico',
    price: 20,
    description: 'Rodada que termina em tranca custa 3 corações a quem perder na soma. Vale para os dois lados.',
    trancaDamage: 3,
    palette: { k: K, m: '#7d848a', w: '#e9dcb4', r: '#9e1a14' },
    icon: [
      '....kkkk....',
      '...kmmmmk...',
      '..kmk..kmk..',
      '..kmk..kmk..',
      '.kkkkkkkkkk.',
      '.kwwwwwwwwk.',
      '.kwwwkkwwwk.',
      '.kwwkrrkwwk.',
      '.kwwwkkwwwk.',
      '.kwwwkkwwwk.',
      '.kwwwwwwwwk.',
      '.kkkkkkkkkk.',
    ],
  }),

  falsaPartida: Object.freeze({
    id: 'falsaPartida',
    name: 'Falsa Partida',
    short: 'FALSA PARTIDA',
    art: 'falsaPartida',
    rarity: 'necrotico',
    price: 24,
    description: 'Uma vez por partida, um golpe que mataria você deixa você com 1 coração, e o rival é obrigado a comprar 2 pedras do dorme.',
    cheatDeath: true,
    palette: { k: K, r: '#c8261d', d: '#5e5a5f', w: '#efe4c4' },
    icon: [
      '............',
      '.kkk...kkk..',
      'krrrk.kdddk.',
      'krrrrkwddddk',
      'krrrrkdddddk',
      '.krrrkwdddk.',
      '..krrkddk...',
      '...krwdk....',
      '....kkk.....',
      '............',
      '............',
      '............',
    ],
  }),

  // -------------------------------------------------------------------------
  // Patch 0.7.0: 20 talismãs novos (arte 40x40 em components/art/RelicArt070.jsx).
  // Os com `lockedBy` só aparecem na loja/no beco depois da conquista (engine/achievements.js).
  // -------------------------------------------------------------------------

  palitoDente: Object.freeze({
    id: 'palitoDente',
    name: 'Palito de Dente Usado',
    short: 'PALITO',
    art: 'palitoDente',
    rarity: 'comum',
    price: 4,
    description: 'A primeira pedra ímpar (soma dos pontos ímpar) que você joga na rodada dá +$2.',
    onPlay(state, { owner, tile }) {
      if (isUsed(state, owner, 'palitoDente') || pipSum(tile) % 2 === 0) return state;
      const next = gainCoins(markUsed(state, owner, 'palitoDente'), owner, 2, 'palitoDente');
      return relicProc(next, owner, 'palitoDente', mine(owner) ? 'PALITO: +$2' : 'PALITO DELE: +$2');
    },
  }),

  moedaFurada: Object.freeze({
    id: 'moedaFurada',
    name: 'Moeda Furada',
    short: 'MOEDA FURADA',
    art: 'moedaFurada',
    rarity: 'comum',
    price: 5,
    lockedBy: 'fregues_ze',
    description: 'O passe estratégico (podendo jogar) custa só $1 em vez de $3.',
    passFee: 1,
  }),

  panoChao: Object.freeze({
    id: 'panoChao',
    name: 'Pano de Chão Úmido',
    short: 'PANO',
    art: 'panoChao',
    rarity: 'comum',
    price: 5,
    description: 'Jogar uma bucha numa ponta deixa essa ponta molhada: o rival não pode usar ela na vez dele.',
    onPlay(state, { owner, foe, tile, side }) {
      if (!isDouble(tile) || (side !== 'left' && side !== 'right')) return state;
      const frozen = { ...state.fx.frozen, [foe]: [...new Set([...state.fx.frozen[foe], side])] };
      return relicProc(patchFx(state, { frozen }), owner, 'panoChao', mine(owner) ? 'PANO MOLHADO: PONTA TRAVADA' : 'PANO DELE: PONTA TRAVADA');
    },
  }),

  tampaGarrafa: Object.freeze({
    id: 'tampaGarrafa',
    name: 'Tampa de Garrafa Amassada',
    short: 'TAMPINHA',
    art: 'tampaGarrafa',
    rarity: 'comum',
    price: 4,
    lockedBy: 'boca_balcao',
    description: 'Começar a rodada sem nenhuma bucha na mão dá +$4.',
    onDeal(state, { owner }) {
      if (state.hands[owner].some(isDouble)) return state;
      return relicProc(gainCoins(state, owner, 4, 'tampaGarrafa'), owner, 'tampaGarrafa', mine(owner) ? 'TAMPINHA: SEM BUCHA, +$4' : 'TAMPINHA DELE: +$4');
    },
  }),

  radioPilha: Object.freeze({
    id: 'radioPilha',
    name: 'Rádio de Pilha Chiando',
    short: 'RÁDIO',
    art: 'radioPilha',
    rarity: 'comum',
    price: 6,
    description: 'Jogada sua que deixa as pontas com soma par tem 15% de chance de o rival comprar uma pedra por engano.',
    onPlay(state, { owner, foe, endsAfter }) {
      if (!endsAfter || (endsAfter.left + endsAfter.right) % 2 !== 0 || !state.boneyard.length) return state;
      if (roll(state, 'radio') >= 15) return state;
      const next = forceDraw(state, foe, 1);
      return relicProc(next, owner, 'radioPilha', mine(owner) ? 'RÁDIO CHIANDO: ELE COMPROU POR ENGANO' : 'RÁDIO DELE: VOCÊ COMPROU POR ENGANO');
    },
  }),

  fosforo: Object.freeze({
    id: 'fosforo',
    name: 'Fósforo Riscado',
    short: 'FÓSFORO',
    art: 'fosforo',
    rarity: 'comum',
    price: 5,
    lockedBy: 'limite_sangue',
    description: 'A sua 1ª compra do dorme na rodada mostra qual é a próxima pedra do topo.',
    onDraw(state, { owner }) {
      if (!human(state, owner) || isUsed(state, owner, 'fosforo') || !state.boneyard.length) return state;
      const [top] = state.boneyard;
      return relicProc(markUsed(state, owner, 'fosforo'), owner, 'fosforo', `FÓSFORO: A PRÓXIMA É [${top.a}|${top.b}]`);
    },
  }),

  oculosFundo: Object.freeze({
    id: 'oculosFundo',
    name: 'Óculos Fundo de Garrafa',
    short: 'ÓCULOS',
    art: 'oculosFundo',
    rarity: 'raro',
    price: 8,
    description: 'Na vez do rival, mostra a pedra que ele vai jogar antes de ela assentar na mesa.',
    foresight: true,
  }),

  canivete: Object.freeze({
    id: 'canivete',
    name: 'Canivete Suíço Enferrujado',
    short: 'CANIVETE',
    art: 'canivete',
    rarity: 'raro',
    price: 9,
    description: '1x por partida, na sua vez: transforma 1 pedra da mão na bucha do número maior dela.',
    ability: 'canivete',
  }),

  trucoMarcado: Object.freeze({
    id: 'trucoMarcado',
    name: 'Baralho de Truco Marcado',
    short: 'TRUCO',
    art: 'trucoMarcado',
    rarity: 'raro',
    price: 8,
    lockedBy: 'malandragem_truco',
    description: 'Fechar múltiplo de 5 com uma ponta 4 na mesa tira 1 coração do rival.',
    onPlay(state, { owner, foe, multipleOfFive, endsAfter }) {
      if (!multipleOfFive || !endsAfter || (endsAfter.left !== 4 && endsAfter.right !== 4)) return state;
      const next = directDamage(state, foe, 1, 'trucoMarcado');
      return relicProc(next, owner, 'trucoMarcado', mine(owner) ? 'TRUCO MARCADO: −1♥ NO RIVAL' : 'TRUCO DELE: −1♥ EM VOCÊ');
    },
  }),

  abridorLata: Object.freeze({
    id: 'abridorLata',
    name: 'Abridor de Lata Cego',
    short: 'ABRIDOR',
    art: 'abridorLata',
    rarity: 'raro',
    price: 7,
    lockedBy: 'cirurgia_tranca',
    description: 'Se o rival ainda tiver 2 ou mais pedras quando você bate, a batida dá +1 de dano.',
    order: 1,
    batidaDamage: (damage, state, { foe }) => (state.hands[foe].length >= 2 ? damage + 1 : damage),
  }),

  cinzeiroBitucas: Object.freeze({
    id: 'cinzeiroBitucas',
    // versão 1.4: era o Cinzeiro Cheio de Bitucas (o id fica, por causa dos saves)
    name: 'Lanterna do Vigia',
    short: 'LANTERNA',
    art: 'cinzeiroBitucas',
    rarity: 'raro',
    price: 7,
    description: 'Se o rival passar 2 vezes seguidas, uma pedra da mão dele fica à mostra até o fim da rodada.',
    onFoeMiss(state, { owner, foe, kind }) {
      if (!human(state, owner) || kind !== 'pass' || (state.fx.passes?.[foe] ?? 0) < 2) return state;
      const shown = new Set(state.fx.revealed ?? []);
      const hidden = state.hands[foe].filter((t) => !shown.has(t.id));
      if (!hidden.length) return state;
      const tile = hidden.slice().sort((x, y) => pipSum(y) - pipSum(x) || y.b - x.b)[0];
      const next = patchFx(state, { revealed: [...shown, tile.id] });
      return relicProc(next, owner, 'cinzeiroBitucas', mine(owner) ? `LANTERNA: ELE TEM [${tile.a}|${tile.b}]` : `LANTERNA DELE: VOCÊ TEM [${tile.a}|${tile.b}]`);
    },
  }),

  notaTres: Object.freeze({
    id: 'notaTres',
    name: 'Nota de 3 Reais',
    short: 'NOTA DE 3',
    art: 'notaTres',
    rarity: 'raro',
    price: 7,
    lockedBy: 'colecionador',
    description: 'O 1º reembaralhar de cada visita à Loja do Valtinho é de graça.',
    firstRerollFree: true,
  }),

  fitaCrepe: Object.freeze({
    id: 'fitaCrepe',
    name: 'Fita Crepe do Gambiarra',
    short: 'FITA CREPE',
    art: 'fitaCrepe',
    rarity: 'lendario',
    price: 15,
    lockedBy: 'milagre_boteco',
    description: '1x por partida: se depois de jogar você ainda tiver pedra que encaixa na ponta que abriu, joga de novo na hora (duas pedras grudadas).',
    onPlay(state, { owner, tile, side, endsAfter }) {
      if (state.matchFx?.fitaUsed?.[owner] || !endsAfter) return state;
      const ends = side === 'left' || side === 'right' ? [endsAfter[side]] : [endsAfter.left, endsAfter.right];
      if (!state.hands[owner].some((t) => ends.some((end) => canPlayOn(t, end)))) return state;
      const fx = state.matchFx ?? {};
      return { ...state, matchFx: { ...fx, fitaUsed: { ...fx.fitaUsed, [owner]: true }, fitaArmed: { owner, tileId: tile.id } } };
    },
    extraTurn: (state, { owner, tile }) => state.matchFx?.fitaArmed?.owner === owner && state.matchFx.fitaArmed.tileId === tile.id,
  }),

  espelhoBanheiro: Object.freeze({
    id: 'espelhoBanheiro',
    // versão 1.4: era o Espelho de Banheiro Trincado (o id fica, por causa dos saves)
    name: 'Papel Carbono Amassado',
    short: 'CARBONO',
    art: 'espelhoBanheiro',
    rarity: 'lendario',
    price: 14,
    description: 'Quando o rival joga uma pedra de grife, a sua pedra comum mais pesada copia o material dela até o fim da rodada.',
    onFoePlay(state, { owner, tile }) {
      const enhancement = getEnhancement(tile.enhancement);
      if (!enhancement) return state;
      const hand = state.hands[owner];
      const target = hand.filter((t) => !t.enhancement && !t.id.includes('#')).sort((x, y) => pipSum(y) - pipSum(x) || y.b - x.b)[0];
      if (!target) return state;
      const copy = { ...target, enhancement: enhancement.id, copied: true };
      const next = { ...state, hands: { ...state.hands, [owner]: hand.map((t) => (t.id === target.id ? copy : t)) } };
      const name = enhancement.name.toUpperCase();
      return relicProc(next, owner, 'espelhoBanheiro', mine(owner) ? `CARBONO: SUA [${target.a}|${target.b}] VIROU ${name}` : `CARBONO DELE: ${name}`);
    },
  }),

  balancaAcougue: Object.freeze({
    id: 'balancaAcougue',
    name: 'Balança de Açougue Descalibrada',
    short: 'BALANÇA',
    art: 'balancaAcougue',
    rarity: 'lendario',
    price: 13,
    lockedBy: 'rei_sinuca',
    description: 'Na contagem da tranca, a sua soma tem 10 pontos a menos.',
    trancaSumOffset: -10,
  }),

  relogioParede: Object.freeze({
    id: 'relogioParede',
    name: 'Relógio de Parede do Bar',
    short: 'RELÓGIO DO BAR',
    art: 'relogioParede',
    rarity: 'lendario',
    price: 16,
    description: 'Quando a mesa tem 4, 8, 12... pedras, a ponta direita aceita qualquer número na sua vez.',
    rules: (state) => {
      const count = boardTileCount(state.board);
      return count > 0 && count % 4 === 0 ? { wildSides: ['right'] } : null;
    },
  }),

  caliceGalo: Object.freeze({
    id: 'caliceGalo',
    name: 'Cálice de Sangue de Galo',
    short: 'CÁLICE',
    art: 'caliceGalo',
    rarity: 'necrotico',
    price: 22,
    lockedBy: 'mesa_limpa',
    description: 'Batida com bucha dá 5 de dano. Em troca, cada compra do dorme custa 1 coração (nunca o último).',
    order: 0,
    batidaDamage: (damage, state, { tile }) => (tile && isDouble(tile) ? Math.max(damage, 5) : damage),
    onDraw(state, { owner }) {
      if (state.hearts[owner] <= 1) return state;
      return relicProc(directDamage(state, owner, 1, 'caliceGalo'), owner, 'caliceGalo', mine(owner) ? 'CÁLICE: −1♥ PELA COMPRA' : 'CÁLICE DELE: −1♥');
    },
  }),

  dedoCadaver: Object.freeze({
    id: 'dedoCadaver',
    name: 'Dedo de Cadáver Amarrado',
    short: 'DEDO',
    art: 'dedoCadaver',
    rarity: 'necrotico',
    price: 20,
    description: 'O rival é obrigado a comprar até achar uma pedra que encaixa. Em troca, seus talismãs vendem por $0.',
    foeDrawsUntilPlay: true,
    sellZero: true,
  }),

  testamento: Object.freeze({
    id: 'testamento',
    name: 'Testamento Rasgado',
    short: 'TESTAMENTO',
    art: 'testamento',
    rarity: 'necrotico',
    price: 26,
    description: 'Um golpe que mataria você faz a rodada recomeçar do zero, com os corações do começo dela. Depois queima 2 talismãs seus (ele e mais um).',
    rewindRound: true,
  }),

  dadoOsso: Object.freeze({
    id: 'dadoOsso',
    name: 'Dado de Osso Humano',
    short: 'DADO DE OSSO',
    art: 'dadoOsso',
    rarity: 'necrotico',
    price: 24,
    lockedBy: 'mao_fechada',
    description: 'Toda pedra sua encaixa em ponta 6, como se tivesse um 6. Em troca, passar a vez custa 1 coração (nunca o último).',
    rules: () => ({ sixWild: true }),
    passHeartCost: 1,
  }),

  // -------------------------------------------------------------------------
  // Versão 1.4: 18 talismãs novos, todos trancados por conquista (engine/achievements.js).
  // Arte 40x40 em components/art/RelicArt140.jsx. Os números foram acertados pela simulação
  // de 600 partidas (fuzz/balance.mjs): por rodada você joga ~7 pedras e ~1,3 bucha, o rival
  // fecha ~2 múltiplos de 5, compra ~2,6 vezes e passa ~0,5; a tranca sai em ~27% das rodadas.
  // -------------------------------------------------------------------------

  pires: Object.freeze({
    id: 'pires',
    name: 'Pires de Aperitivo',
    short: 'PIRES',
    art: 'pires',
    rarity: 'comum',
    price: 4,
    lockedBy: 'petisco_balcao',
    description: 'Começar a rodada com 2 ou mais pedras leves (soma até 3) na mão dá +$2.',
    onDeal(state, { owner }) {
      if (state.hands[owner].filter((t) => pipSum(t) <= 3).length < 2) return state;
      return relicProc(gainCoins(state, owner, 2, 'pires'), owner, 'pires', mine(owner) ? 'PIRES: PETISCO, +$2' : 'PIRES DELE: +$2');
    },
  }),

  gilete: Object.freeze({
    id: 'gilete',
    name: 'Gilete no Colarinho',
    short: 'GILETE',
    art: 'gilete',
    rarity: 'comum',
    price: 5,
    lockedBy: 'corte_fino',
    description: 'Bucha sua que entra numa ponta ímpar ([1|1], [3|3] ou [5|5]) dá +$3.',
    onPlay(state, { owner, tile, side }) {
      if (!isDouble(tile) || side === 'root' || tile.a % 2 === 0) return state;
      return relicProc(gainCoins(state, owner, 3, 'gilete'), owner, 'gilete', mine(owner) ? 'GILETE: CORTE FINO, +$3' : 'GILETE DELE: +$3');
    },
  }),

  bicarbonato: Object.freeze({
    id: 'bicarbonato',
    name: 'Bicarbonato de Sódio',
    short: 'BICARBONATO',
    art: 'bicarbonato',
    rarity: 'comum',
    price: 4,
    lockedBy: 'azia_beco',
    description: '1x por partida: a sua próxima compra do dorme que custaria $ ou coração sai de graça.',
    // engine/powers.js (drawAvailabilityFor): a compra paga vira grátis uma vez por partida
    freePaidDraw: true,
  }),

  cofrinho: Object.freeze({
    id: 'cofrinho',
    name: 'Cofrinho de Barro',
    short: 'COFRINHO',
    art: 'cofrinho',
    rarity: 'comum',
    price: 5,
    lockedBy: 'pano_furado',
    description: 'Quando o rival fecha um múltiplo de 5, você ganha metade do que ele faturou (arredondado para cima).',
    onFoeFive(state, { owner, amount }) {
      const gain = Math.ceil(amount / 2);
      if (gain <= 0) return state;
      return relicProc(gainCoins(state, owner, gain, 'cofrinho'), owner, 'cofrinho', mine(owner) ? `COFRINHO: +$${gain}` : `COFRINHO DELE: +$${gain}`);
    },
  }),

  prego: Object.freeze({
    id: 'prego',
    name: 'Prego Enferrujado',
    short: 'PREGO',
    art: 'prego',
    rarity: 'comum',
    price: 4,
    lockedBy: 'tetano_mesa',
    description: 'A 1ª pedra com 0 que você joga na rodada deixa 1 pedra do rival à mostra até o fim dela (com o [0|0], 2 pedras).',
    onPlay(state, { owner, foe, tile }) {
      if (!human(state, owner) || isUsed(state, owner, 'prego') || (tile.a !== 0 && tile.b !== 0)) return state;
      const shown = new Set(state.fx.revealed ?? []);
      const hidden = state.hands[foe].filter((t) => !shown.has(t.id));
      const count = Math.min(isDouble(tile) ? 2 : 1, hidden.length);
      const next = markUsed(state, owner, 'prego');
      if (!count) return next;
      // ao acaso (pela semente), sem Math.random no reducer
      const pool = hidden.slice();
      const picked = [];
      for (let i = 0; i < count; i += 1) picked.push(...pool.splice(roll(next, `prego-${i}`) % pool.length, 1));
      const revealed = patchFx(next, { revealed: [...shown, ...picked.map((t) => t.id)] });
      const names = picked.map((t) => `[${t.a}|${t.b}]`).join(' ');
      return relicProc(revealed, owner, 'prego', mine(owner) ? `PREGO: ELE TEM ${names}` : `PREGO DELE: VOCÊ TEM ${names}`);
    },
  }),

  peCoelho: Object.freeze({
    id: 'peCoelho',
    name: 'Pé de Coelho Sarnento',
    short: 'PÉ DE COELHO',
    art: 'peCoelho',
    rarity: 'comum',
    price: 4,
    lockedBy: 'azar_compartilhado',
    description: 'Cada batida que você toma vale 1 reembaralhar de graça na próxima Loja do Valtinho (junta até 3).',
    // engine/gameReducer.js (finishRound) junta as fichas em `run.freeRerolls`
    rerollOnHurt: true,
  }),

  grampo: Object.freeze({
    id: 'grampo',
    name: 'Grampo de Cabelo',
    short: 'GRAMPO',
    art: 'grampo',
    rarity: 'raro',
    price: 7,
    lockedBy: 'gazuada',
    description: '1x por rodada, na sua vez: esconde uma bucha da mão no fundo do dorme. A vez acaba ali, sem custo e sem contar como passe.',
    ability: 'grampo',
  }),

  espatula: Object.freeze({
    id: 'espatula',
    name: 'Espátula de Gordura',
    short: 'ESPÁTULA',
    art: 'espatula',
    rarity: 'raro',
    price: 7,
    lockedBy: 'fritura_pesada',
    description: 'Cada pedra que você compra do dorme na rodada tira 3 pontos da sua soma na contagem da tranca.',
    trancaSumOffset: (state, seat) => -3 * (state.fx?.bought?.[seat] ?? 0),
  }),

  taco: Object.freeze({
    id: 'taco',
    name: 'Taco de Sinuca Lascado',
    short: 'TACO',
    art: 'taco',
    rarity: 'raro',
    price: 8,
    lockedBy: 'tacada_torta',
    description: 'Se a sua jogada deixar as duas pontas com o mesmo número, o rival não pode jogar bucha na vez dele.',
    onPlay(state, { owner, foe, endsAfter }) {
      if (!endsAfter || endsAfter.left !== endsAfter.right) return state;
      const next = patchFx(state, { noDoubles: { ...(state.fx.noDoubles ?? {}), [foe]: true } });
      return relicProc(next, owner, 'taco', mine(owner) ? 'TACO: BUCHA PROIBIDA PRO RIVAL' : 'TACO DELE: SEM BUCHA PRA VOCÊ');
    },
  }),

  oleo: Object.freeze({
    id: 'oleo',
    name: 'Óleo de Máquina Singer',
    short: 'ÓLEO',
    art: 'oleo',
    rarity: 'raro',
    price: 8,
    lockedBy: 'engrenagem_cega',
    description: 'A 2ª compra do dorme no mesmo turno sai de graça (no lugar dos $3).',
    // engine/powers.js (drawAvailabilityFor)
    freeSecondDraw: true,
  }),

  pacoteTremoco: Object.freeze({
    id: 'pacoteTremoco',
    name: 'Pacote de Tremoço',
    short: 'TREMOÇO',
    art: 'pacoteTremoco',
    rarity: 'raro',
    price: 7,
    lockedBy: 'mao_pesada',
    description: 'Começar a rodada com mais de 45 pontos na mão dá +$4.',
    onDeal(state, { owner }) {
      if (state.hands[owner].reduce((sum, t) => sum + pipSum(t), 0) <= 45) return state;
      return relicProc(gainCoins(state, owner, 4, 'pacoteTremoco'), owner, 'pacoteTremoco', mine(owner) ? 'TREMOÇO: MÃO PESADA, +$4' : 'TREMOÇO DELE: +$4');
    },
  }),

  cadeado: Object.freeze({
    id: 'cadeado',
    name: 'Cadeado Enferrujado',
    short: 'CADEADO',
    art: 'cadeado',
    rarity: 'raro',
    price: 8,
    lockedBy: 'porteira_fechada',
    description: 'Rodada que você vence por tranca tira 1 coração a mais do rival.',
    trancaWinBonus: 1,
  }),

  chapaFogao: Object.freeze({
    id: 'chapaFogao',
    name: 'Chapa de Fogão a Lenha',
    short: 'CHAPA',
    art: 'chapaFogao',
    rarity: 'lendario',
    price: 14,
    lockedBy: 'calor_fornalha',
    description: '1x por rodada: depois de uma bucha sua, se o rival comprar ou passar na vez seguinte, ele toma 1 de dano.',
    onPlay(state, { owner, foe, tile }) {
      if (!isDouble(tile) || isUsed(state, owner, 'chapaFogao') || state.fx.chapa?.[foe]) return state;
      const next = patchFx(state, { chapa: { ...(state.fx.chapa ?? {}), [foe]: true } });
      return relicProc(next, owner, 'chapaFogao', mine(owner) ? 'CHAPA QUENTE' : 'CHAPA DELE QUENTE');
    },
  }),

  lupa: Object.freeze({
    id: 'lupa',
    name: 'Lupa de Joalheiro',
    short: 'LUPA',
    art: 'lupa',
    rarity: 'lendario',
    price: 13,
    lockedBy: 'olho_clinico',
    description: 'Mostra quantas pedras com cada número (0 a 6) o rival tem na mão.',
    reveal: { numberCounts: true },
  }),

  canetaLoterica: Object.freeze({
    id: 'canetaLoterica',
    name: 'Caneta de Lotérica Azul',
    short: 'CANETA',
    art: 'canetaLoterica',
    rarity: 'lendario',
    price: 15,
    lockedBy: 'acertei_quina',
    description: 'Jogada sua que deixa as pontas somando 10 ou 12 tira $4 do bolso do rival para o seu.',
    onPlay(state, { owner, foe, endsAfter }) {
      if (!endsAfter) return state;
      const sum = endsAfter.left + endsAfter.right;
      if (sum !== 10 && sum !== 12) return state;
      const taken = Math.min(4, state.coins[foe]);
      if (taken <= 0) return state;
      const next = gainCoins(loseCoins(state, foe, taken, 'canetaLoterica'), owner, taken, 'canetaLoterica');
      return relicProc(next, owner, 'canetaLoterica', mine(owner) ? `CANETA: DEU ${sum}! +$${taken} DO RIVAL` : `CANETA DELE: DEU ${sum}! +$${taken} DO SEU BOLSO`);
    },
  }),

  trena: Object.freeze({
    id: 'trena',
    name: 'Trena de Pedreiro',
    short: 'TRENA',
    art: 'trena',
    rarity: 'lendario',
    price: 12,
    lockedBy: 'por_um_fio',
    description: 'Tranca decidida por até 5 pontos (empate incluso) é sua e tira 1 coração a mais.',
    // engine/gameReducer.js (trancaResult)
    trancaEdge: 5,
  }),

  ampulheta: Object.freeze({
    id: 'ampulheta',
    name: 'Ampulheta Rachada',
    short: 'AMPULHETA',
    art: 'ampulheta',
    rarity: 'mitico',
    price: 24,
    lockedBy: 'hora_morta',
    description: '1x por partida: quando o rival bater, o tempo volta. A pedra volta para a mão dele, ele compra 2 do dorme e a vez é sua.',
    // engine/gameReducer.js (cucoRewind)
    rewindBatida: true,
  }),

  velaPreta: Object.freeze({
    id: 'velaPreta',
    name: 'Vela Preta Derretida',
    short: 'VELA PRETA',
    art: 'velaPreta',
    rarity: 'necrotico',
    price: 24,
    lockedBy: 'despacho_meia_noite',
    description: 'Batida com [0|0] ou [6|6] dá 4 de dano (não soma com o Cálice). Em troca, você senta em toda partida com, no máximo, 1 coração a menos que o seu máximo.',
    // `max` (não soma): com o Cálice de Sangue de Galo vale o maior; a Mão Grande dobra depois
    order: 0,
    batidaDamage: (damage, state, { tile }) => (tile && isDouble(tile) && (tile.a === 0 || tile.a === 6) ? Math.max(damage, 4) : damage),
    heartCap: 1,
  }),
});

export const RELIC_IDS = Object.freeze(Object.keys(RELICS));

/** Talismãs Necróticos: só no Mercado Negro (a Loja do Valtinho nunca vende). */
export const NECROTIC_IDS = Object.freeze(RELIC_IDS.filter((id) => RELICS[id].rarity === 'necrotico'));

export const getRelic = (id) => RELICS[id] ?? null;

/** Talismãs que só existem depois de uma conquista (Patch 0.7.0). */
export const LOCKED_RELIC_IDS = Object.freeze(RELIC_IDS.filter((id) => RELICS[id].lockedBy));

/** O talismã pode sair na loja/no beco? (`unlocks`: ids liberados por conquista) */
export const isRelicAvailable = (id, unlocks = []) => Boolean(RELICS[id]) && (!RELICS[id].lockedBy || unlocks.includes(id));

/**
 * Patch PvP: talismãs que só fazem sentido contra a IA (desfazer a jogada dela, prever a
 * próxima pedra dela, ela comprando até encaixar) não saem na loja nem no beco do online.
 * Versão 1.3: nem a Carteira Recheada (+1 de dano a cada $15): com as moedas da mesa online
 * ($50 a $300) ela virava uma batida que zera o outro de uma vez.
 * Versão 1.4: o Taco (assimetria de bucha), a Lupa de Joalheiro (contaria a mão escondida do
 * outro), a Ampulheta Rachada (desfazer a batida de gente) e o Pé de Coelho (não tem loja
 * depois do duelo) também ficam de fora.
 */
export const PVP_BANNED_RELICS = Object.freeze(['relogio', 'oculosFundo', 'dedoCadaver', 'carteira', 'taco', 'lupa', 'ampulheta', 'peCoelho']);
/** O talismã pode sair na vitrine desta run (no online, fora os da IA)? */
export const isRelicOffered = (id, state) => isRelicAvailable(id, state?.unlocks) && !(state?.pvp && PVP_BANNED_RELICS.includes(id));

/** Os talismãs comuns "básicos" (sem trava de conquista) da conquista Colecionador de Esquina. */
export const BASIC_COMMON_IDS = Object.freeze(RELIC_IDS.filter((id) => RELICS[id].rarity === 'comum' && !RELICS[id].lockedBy));
