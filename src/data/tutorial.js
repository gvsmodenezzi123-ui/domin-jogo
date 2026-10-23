/**
 * Partida de treino (Patch 0.9.5): o Vô Juca (data/rivals.js, TUTOR) senta com quem abre o
 * jogo pela primeira vez e ensina as manhas numa partida toda encenada, de duas rodadas, com
 * as mãos e o dorme fixos (nada sai da semente) e as jogadas dele no roteiro.
 *
 * Cada passo do roteiro:
 *   pages   o que ele fala (uma ou mais páginas; [a|b] vira uma pedrinha no balão)
 *   mood    a cara dele no balão (idle, thinking, smug, hurt)
 *   expect  o que destrava o próximo passo:
 *             { type: 'tap' }                          tocar no balão (ou no botão do cartão)
 *             { type: 'play', tile, side }             você joga exatamente essa pedra nessa ponta
 *             { type: 'draw' }                         você compra no dorme
 *             { type: 'rival', action }                ele joga o que está escrito (PLAY/DRAW/PASS)
 *             { type: 'end' }                          fim: COMEÇAR A RUN (ou VOLTAR, revendo)
 *   focus   o que o anel de destaque mostra: 'hearts' | 'hand' | 'sum' | 'coins' | 'draw' |
 *           'pass' | 'boneyard' | 'relic:<id>' | 'tile:<id>' (nos passos de jogar, o anel
 *           segue sozinho: a pedra e, depois de escolhida, o botão da ponta certa)
 *   nudge   o que ele diz se você escolher a ponta errada
 *   enter   o que acontece ao chegar no passo: { grant: idDoTalismã } | { round: 2 }
 *   card    'intro' | 'end': o passo vira um cartão no meio da tela, com botão
 *
 * O motor (engine/gameReducer.js) só aceita a jogada que o passo espera e avança sozinho; o
 * teste engine/__tests__/patch095.test.js joga o roteiro inteiro do começo ao fim.
 */

/** Mãos e o topo do dorme de cada rodada (o resto do dorme vem na ordem do jogo completo). */
export const TUTORIAL_DEALS = Object.freeze({
  1: Object.freeze({
    player: ['6-6', '2-4', '0-5', '2-3'],
    tioZe: ['2-6', '1-4', '5-6', '2-5', '3-3'],
    top: ['0-1', '1-1'],
  }),
  2: Object.freeze({
    player: ['2-3', '3-3', '3-6', '6-6'],
    tioZe: ['2-4', '0-4', '1-5', '1-1'],
    top: [],
  }),
});

/** O talismã que ele dá de presente no intervalo (Caneca de Chopp: bucha não gasta a vez). */
export const TUTORIAL_GIFT = 'caneca';

const tap = Object.freeze({ type: 'tap' });
const play = (tile, side) => Object.freeze({ type: 'play', tile, side });
const rival = (tileId, side) => Object.freeze({ type: 'rival', action: Object.freeze({ type: 'PLAY', tileId, side }) });

const step = (fields) => Object.freeze({ mood: 'idle', focus: null, ...fields, pages: Object.freeze(fields.pages) });

export const TUTORIAL_STEPS = Object.freeze([
  // --- Apresentação ---------------------------------------------------------
  step({
    id: 'intro',
    card: 'intro',
    mood: 'smug',
    expect: tap,
    pages: [
      'Opa, chegou gente nova no boteco! Eu sou o Vô Juca: quarenta anos batendo pedra nesta mesa.',
      'Antes de encarar a noite, vamos jogar uma partidinha de treino. Eu vou te mostrando as manhas.',
    ],
  }),
  step({
    id: 'goal',
    expect: tap,
    focus: 'hearts',
    pages: ['É um contra um: quem zerar os corações do outro vence a mesa. Os seus ficam aqui embaixo; os meus, aqui comigo.'],
  }),
  step({
    id: 'hand',
    expect: tap,
    focus: 'hand',
    pages: ['Essas são as suas pedras. No treino a gente joga com poucas; na mesa de verdade são 7 pra cada um.'],
  }),

  // --- Rodada 1: abrir, encaixar, múltiplo de 5, comprar, escolher a ponta, bater ---
  step({
    id: 'bucha',
    expect: tap,
    focus: 'tile:6-6',
    pages: ['Quem tem a bucha mais alta começa a rodada. Bucha (ou carroça) é a pedra de dois números iguais.'],
  }),
  step({
    id: 'open',
    expect: play('6-6', 'root'),
    pages: ['A maior é a sua: a [6|6]. Toque nela e depois em ABRIR MESA.'],
  }),
  step({
    id: 'rivalMatch',
    expect: rival('2-6', 'right'),
    mood: 'thinking',
    pages: ['Agora eu. A pedra tem que encostar num número igual ao da ponta: vou encaixar o meu [6|2] no seu 6.'],
  }),
  step({
    id: 'fiveRule',
    expect: tap,
    focus: 'sum',
    pages: ['Manha que dá dinheiro: se as duas pontas somarem múltiplo de 5 (5, 10, 15, 20...), quem jogou ganha $3.'],
  }),
  step({
    id: 'fivePlay',
    expect: play('2-4', 'right'),
    pages: ['As pontas estão em 6 e 2. Jogue o [2|4] no 2: ficam 6 e 4. Seis mais quatro... dez!'],
  }),
  step({
    id: 'fivePaid',
    expect: tap,
    focus: 'coins',
    mood: 'smug',
    pages: ['$3 no bolso! A soma das pontas (o Σ) fica ali do lado das suas moedas. Fique sempre de olho nela.'],
  }),
  step({
    id: 'rivalBlock',
    expect: rival('1-4', 'right'),
    mood: 'smug',
    pages: ['Minha vez: [4|1] no 4. Deixei 6 e 1... quero ver você sair dessa!'],
  }),
  step({
    id: 'boneyard',
    expect: tap,
    focus: 'boneyard',
    mood: 'thinking',
    pages: ['Você não tem 6 nem 1. Quando nada encaixa, você compra no dorme: aquele monte de pedras viradas no canto da mesa.'],
  }),
  step({
    id: 'draw',
    expect: Object.freeze({ type: 'draw' }),
    focus: 'draw',
    pages: ['A 1ª compra de cada turno é de graça. Toque em COMPRAR.'],
  }),
  step({
    id: 'ladder',
    expect: tap,
    focus: 'draw',
    pages: ['Veio o [1|0], que serve no 1! Repare no botão: a 2ª compra do turno já custa $3, e a 3ª custa um coração.'],
  }),
  step({
    id: 'pass',
    expect: tap,
    focus: 'pass',
    pages: ['Depois de comprar, PASSAR a vez fica de graça. Passar podendo jogar custa $3. Mas agora não: essa pedra serve!'],
  }),
  step({
    id: 'drawnPlay',
    expect: play('0-1', 'right'),
    pages: ['Jogue o [1|0] no 1.'],
  }),
  step({
    id: 'rivalFive',
    expect: rival('5-6', 'left'),
    mood: 'smug',
    pages: ['Agora eu: [6|5] no 6. Cinco mais zero, cinco! Múltiplo de 5 paga pra mim também. Hehe.'],
  }),
  step({
    id: 'sideWhy',
    expect: tap,
    focus: 'tile:0-5',
    pages: ['Sua [5|0] serve nas duas pontas. Escolha bem o lado: na esquerda as pontas ficariam 0 e 0, que não vale nada.'],
  }),
  step({
    id: 'side',
    expect: play('0-5', 'right'),
    nudge: 'Na outra ponta! Na DIREITA fecha 5 + 5 = 10.',
    pages: ['Na DIREITA ficam 5 e 5: dez! Toque na [5|0] e escolha DIR >.'],
  }),
  step({
    id: 'rivalLast',
    expect: rival('2-5', 'left'),
    mood: 'smug',
    pages: ['Vou de [5|2] no 5. Agora me sobrou uma pedra só... se eu jogar ela, eu bato!'],
  }),
  step({
    id: 'batidaWhy',
    expect: tap,
    focus: 'hand',
    pages: ['Bater é jogar a última pedra da mão: a rodada acaba e quem bateu tira coração do outro. Você também tem uma só...'],
  }),
  step({
    id: 'batida',
    expect: play('2-3', 'left'),
    pages: ['...e a vez é sua! Bata com o [2|3] no 2.'],
  }),
  step({
    id: 'hit',
    expect: tap,
    mood: 'hurt',
    pages: ['Ai! Batida simples tira 1 coração. Mas tem batida que dói mais...'],
  }),
  step({
    id: 'kinds',
    expect: tap,
    pages: ['Batendo com bucha: 2 corações. Com pedra que serve nas duas pontas: 2. Casando as duas pontas de uma vez (a cruzada): 3!'],
  }),
  step({
    id: 'tranca',
    expect: tap,
    mood: 'thinking',
    pages: ['Se ninguém conseguir jogar e o dorme acabar, a mesa tranca: ganha quem tiver menos pontos na mão. Desova as pedras pesadas cedo!'],
  }),

  // --- Intervalo: o talismã de presente ---------------------------------------
  step({
    id: 'gift',
    expect: tap,
    enter: Object.freeze({ grant: TUTORIAL_GIFT }),
    focus: `relic:${TUTORIAL_GIFT}`,
    mood: 'smug',
    pages: ['Agora um presente: a Caneca de Chopp! Talismãs mudam as regras a seu favor e ficam nessa barra.'],
  }),
  step({
    id: 'relicHow',
    expect: tap,
    focus: `relic:${TUTORIAL_GIFT}`,
    pages: ['Segure o dedo num talismã para ler o que ele faz. O da Caneca: jogar bucha não gasta a sua vez!'],
  }),
  step({
    id: 'shopTip',
    expect: tap,
    pages: ['Talismã se compra na Loja do Valtinho, com o dinheiro dos múltiplos de 5. Cada um tem uma manha diferente.'],
  }),

  // --- Rodada 2: o talismã em ação e a batida de bucha -------------------------
  step({
    id: 'round2',
    expect: play('2-3', 'root'),
    enter: Object.freeze({ round: 2 }),
    pages: ['Segunda rodada! Quem bateu abre, com a pedra que quiser. Abra com o [2|3]: 2 + 3 = 5, já começa ganhando!'],
  }),
  step({
    id: 'rivalOpen',
    expect: rival('2-4', 'left'),
    pages: ['Bonito! Minha vez: [2|4] no 2.'],
  }),
  step({
    id: 'caneca',
    expect: play('3-3', 'right'),
    pages: ['Agora a Caneca: jogue a bucha [3|3] no 3 e repare no talismã piscando.'],
  }),
  step({
    id: 'combo',
    expect: play('3-6', 'right'),
    mood: 'smug',
    pages: ['Viu? A vez continua sua! Emende o [3|6] no 3: quatro mais seis, dez!'],
  }),
  step({
    id: 'rivalTired',
    expect: rival('0-4', 'left'),
    mood: 'thinking',
    pages: ['Uff... vou de [4|0] no 4.'],
  }),
  step({
    id: 'finish',
    expect: play('6-6', 'right'),
    pages: ['Sua última é a bucha [6|6], e ela serve no 6. Batida de bucha tira 2 corações... e eu só tenho 2. Bate!'],
  }),
  step({
    id: 'won',
    expect: tap,
    mood: 'hurt',
    pages: ['Hahaha! Me pegou direitinho. Aprende rápido, hein?'],
  }),
  step({
    id: 'wrap',
    expect: tap,
    mood: 'smug',
    pages: ['Daqui pra frente é com você. No mapa você escolhe o caminho: mesas, loja, beco, uns imprevistos... O resto se descobre jogando.'],
  }),
  step({
    id: 'end',
    card: 'end',
    expect: Object.freeze({ type: 'end' }),
    mood: 'smug',
    pages: ['Boa sorte lá fora. E cuidado com o Comendador!'],
  }),
]);

export const TUTORIAL_STEP_IDS = Object.freeze(TUTORIAL_STEPS.map((s) => s.id));
