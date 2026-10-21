/**
 * Os 18 personagens da campanha (3 regiões; cada uma com 1 rival de entrada, 4 comuns
 * espalhados pela teia de caminhos e o chefe no topo). A escalação fica em data/campaign.js,
 * a teia em engine/campaignMap.js. O nível da IA sai da região (ver AI_TIERS abaixo).
 *
 * Cada rival tem:
 *   region / boss      região (1–3) e se é o chefe dela
 *   hearts / coins     corações e moedas no começo da partida
 *   relics             talismãs passivos (aparecem na hotbar dele)
 *   deck               pedras aprimoradas do baralho dele ({ id: aprimoramento })
 *   mechanics          regras próprias (ver gameReducer.js):
 *                        doubleBuchaDamage  batida com bucha dele dá dano dobrado
 *                        drawFee            você paga $N a ele a cada compra do dorme
 *                        healOnPlayerPass   ele recupera 1♥ quando você passa
 *                        exposeHeaviest     ele enxerga a sua pedra mais pesada
 *                        predictDoubles     ele enxerga as suas buchas
 *                        stealOnCross       rouba $N quando joga casando as duas pontas
 *                        trancaWeight       as pedras dele valem N× na contagem da tranca
 *                        trancaShield       ignora o primeiro dano de tranca da partida
 *   style              pesos da IA (ver scoreMove em ai/tioZeAI.js)
 *   reflexMs           tempo de "pensar" antes de cada ação (mínimo 600 ms, para dar para ver)
 *   prizeBonus         moedas extras ao vencê-lo
 *   felt / decor       cores do feltro da mesa dele e enfeites (giz, caneca, cinzas...)
 *   art                retrato 40x40 em components/ArtSprites.jsx (via components/artRegistry.js)
 *   faces / palette    retrato 16x16 antigo (dados de reserva; o jogo desenha o `art` 40x40)
 *   lines              falas curtas por situação (o que faltar usa as do Tio Zé)
 */

import { TIO_ZE_FACES, TIO_ZE_PALETTE } from '../components/sprites.js';
import {
  ALEMAO,
  BAIANO,
  BIGODE,
  CARLINHOS,
  CIDA,
  COMENDADOR,
  FAUSTO,
  PAULINHO,
  SERGINHO,
  SOFIA,
  TONHO,
  VALDIR,
} from './portraits.js';

const K = '#0b0806';

/** Falas do Tio Zé; também servem de reserva para o que um rival não tiver. */
export const TIO_ZE_LINES = Object.freeze({
  intro: ['Senta, menino. A mesa tá posta.', 'Mais um pra minha coleção...'],
  play: ['Toma.', 'Encaixa essa.', 'Hehe...', 'Essa é minha.', 'Segue o jogo.'],
  playDouble: ['BUCHA NA MESA!', 'Lá vai carroça!', 'Desovei a bucha.'],
  draw: ['Vou no dorme...', 'Deixa eu cavar.', 'Compro, compro.'],
  pass: ['Passo.', 'Toc, toc. Passo.', 'Nada pra mim.'],
  passTranca: ['Passo... e tranco. Hehe.', 'Vamos contar os pontos?'],
  bonus5: ['Cinco na mesa, três no bolso.', 'Múltiplo de cinco! Hehe.'],
  playerPass: ['Passou, é? Hehehe.', 'Tá sem pedra, menino?'],
  playerDraw: ['Cava, cava...', 'O dorme não tem piedade.'],
  playerBonus: ['Sorte sua...', 'Guarda essas moedas. Vai precisar.'],
  winRound: ['Bati! Sente o peso.', 'Mais um coração pro meu pote.'],
  loseRound: ['Sorte de principiante...', 'Argh! Isso vai te custar.'],
  tranca: ['Mesa travada. Vamos contar.', 'Trancou!'],
  duelWin: ['Mais uma alma na minha mesa.'],
  duelLose: ['...Volte amanhã. Se tiver coragem.'],
  hurtRelic: ['Ai! Que bruxaria é essa?', 'Isso é trapaça, menino!', 'Essa pedra tá amaldiçoada...'],
  undo: ['Ei! Eu tinha jogado isso!', 'Que relógio é esse?!', 'Volta o tempo, é? Hmpf.'],
});

/** Fala determinística (sem Math.random) a partir de uma semente. */
export function pickTioZeLine(kind, seed = 0) {
  const lines = TIO_ZE_LINES[kind];
  if (!lines || !lines.length) return null;
  return lines[Math.abs(seed) % lines.length];
}

function face(base, overrides) {
  return Object.freeze(base.map((row, i) => overrides[i] ?? row));
}

/** Gera os 4 humores a partir do rosto base e das linhas que mudam em cada um. */
function moods(base, { thinking, smug, hurt }) {
  return Object.freeze({
    idle: face(base, {}),
    thinking: face(base, thinking),
    smug: face(base, smug),
    hurt: face(base, hurt),
  });
}

// ---------------------------------------------------------------------------
// Retratos
// ---------------------------------------------------------------------------

const ARLINDO = [
  '.....kkkkkk.....',
  '...kkssssLsskk..',
  '..ksssssssLsssk.',
  '.kwssssssssssswk',
  '.kwwssssssssswwk',
  '.kwsGGGGsGGGGswk',
  '.kwGeepGsGeepGwk',
  '.ksGGGGsSsGGGGsk',
  '.kssssssSSssssk.',
  '.kswwwwwwwwwwsk.',
  '.ksswmmmmmmwssk.',
  '..kssssssssssk..',
  '...kSssssssSk...',
  '....kkSSSSkk....',
  '..cckrrRRrrkcc..',
  'cccCcccrrcccCccc',
];

const NEIDE = [
  '.....kkkkkk.....',
  '....kgggGggk....',
  '...kgGgggggGk...',
  '..kggggggggggk..',
  '.kgggssssssgggk.',
  '.kggssssssssggk.',
  '.kgFFFFssFFFFgk.',
  '.kgFepFssFepFgk.',
  '.kgssssSSssssgk.',
  '.kgsBssssssBsgk.',
  '.kgssslLLlsssgk.',
  '.kgssssssssssgk.',
  '..kgSssssssSgk..',
  '...kkSSSSSSkk...',
  '..PPkwwwwwwkPPP.',
  'PPPqPPPPPPPPqPPP',
];

const MARCAO = [
  '....kkkkkkkk....',
  '...kOOOOOOOOk...',
  '..kOOOOyyOOOOk..',
  '..kOOOOOOOOOOk..',
  '.kbbbbbbbbbbbbbk',
  '.kssssssssssssk.',
  '.ksKKKssssKKKsk.',
  '.ksepsssssspesk.',
  '.kssssSSSSssssk.',
  '.kdsdsdsdsdsdsk.',
  '.ksdmmmmmmmmdsk.',
  '.kdsdsdsdsdsdsk.',
  'kkddddddddddddkk',
  'kssSSSSSSSSSSssk',
  'BBBBkBBBBBBkBBBB',
  'BBBBBBgBBgBBBBBB',
];

const TIAO = [
  '....kkkkkkkk....',
  '...kHHHHHHhHk...',
  '..kHHHHHHHHhHk..',
  '.kHHHHHHHHHHHHk.',
  '.kHHssssssssHHk.',
  '.kHsssssssssssk.',
  '.ksKKsssssKKssk.',
  '.ksepssssspesrk.',
  '.ksssssSSsssrsk.',
  '.ksssKKKKKKsssk.',
  '.kssmmymmmmssstt',
  '.kSsssssssssssk.',
  '..kSssssssssSk..',
  '...kkSSSSSSkk...',
  '..RRkSyyyySkRR..',
  'RRRRRkSSSSkRRRRR',
];

const BETO = [
  '....kkkkkkkk....',
  '...kRRRRRRRRk...',
  '..kRRwRRRRwRRk..',
  '.kRRRRRRRRRRRRkR',
  '.kccRRRRRRRRcckR',
  '.kccsssssssscck.',
  '.kcsKKssssKKsck.',
  '.kcsegssssegsck.',
  '.kcssssSSssssck.',
  'yykssbssssbssky.',
  'y.ksbmmmmmmbsk.y',
  '..ksbbbbbbbbsk..',
  '...kbbbbbbbbk...',
  '....kkSSSSkk....',
  '..VVkyyyyyykVV..',
  'VVVVVvVVVVvVVVVV',
];

// ---------------------------------------------------------------------------
// Estilos de jogo (pesos da IA; o padrão é o do Tio Zé)
// ---------------------------------------------------------------------------

export const DEFAULT_STYLE = Object.freeze({
  heavy: 1, // descarregar pontos
  doubles: 1, // descarregar buchas
  earlyDoubles: 0, // bônus por bucha com a mesa ainda pequena
  five: 4, // fechar múltiplo de 5
  follow: 2, // deixar pontas que ele consegue seguir
  pressure: 3, // deixar pontas que você parece não ter
  lockEnds: 0, // deixar as duas pontas iguais (caminho da tranca)
  trancaBias: 0, // folga para passar e trancar (fração da soma estimada)
  heartDrawMin: 3, // só gasta coração para comprar com pelo menos isso
  fiveSetup: 0, // prepara múltiplo de 5 para a próxima jogada (conta uma vez à frente)
  aggression: 0, // arma batida, solta Rubi/Fantasma na hora certa, pressiona mais
});

const style = (overrides) => Object.freeze({ ...DEFAULT_STYLE, ...overrides });

// ---------------------------------------------------------------------------
// Galeria (a ordem aqui é a da campanha)
// ---------------------------------------------------------------------------

export const RIVALS = Object.freeze({
  tioZe: Object.freeze({
    id: 'tioZe',
    name: 'Tio Zé',
    title: 'O Dono da Mesa',
    region: 1,
    boss: false,
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: [],
    deck: {},
    mechanics: {},
    style: DEFAULT_STYLE,
    reflexMs: 800,
    prizeBonus: 0,
    felt: { light: '#3a4a2a', mid: '#2c3a20', dark: '#1f2a17' },
    // retrato 40x40 (components/ArtSprites.jsx); a fumaça sai da brasa (artRegistry.js)
    art: 'tioZe',
    decor: [],
    faces: TIO_ZE_FACES,
    palette: TIO_ZE_PALETTE,
    lines: TIO_ZE_LINES,
  }),
  tonho: Object.freeze({
    id: 'tonho',
    art: 'tonho', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Tonho do Gás',
    title: 'Entrega em 10 Minutos',
    region: 1,
    boss: false,
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: [],
    deck: {},
    mechanics: {},
    style: style({ heavy: -0.6, doubles: 0.6, follow: 2.5 }),
    reflexMs: 600,
    prizeBonus: 0,
    felt: { light: '#2c4a7a', mid: '#1f3660', dark: '#142446' },
    decor: [],
    faces: TONHO.faces,
    palette: TONHO.palette,
    lines: {
      intro: ['Ô de casa! Chegou o gás!', 'Rapidinho, que tenho entrega.'],
      play: ['Vai, vai!', 'Essa é levinha.', 'Pra já!', 'Entregue!'],
      playDouble: ['Bucha baixinha, sem peso!'],
      draw: ['Peraí que vou no caminhão...'],
      pass: ['Passo, tô com pressa.'],
      bonus5: ['Cinco! Troco certinho.'],
      playerPass: ['Travou o botijão?'],
      winRound: ['Entrega feita!', 'Rápido e certeiro.'],
      loseRound: ['Vazou o gás...', 'Eita, perdi a hora.'],
      duelWin: ['Próximo endereço!'],
      duelLose: ['Fica com o troco, campeão.'],
      hurtRelic: ['Ai! Vazamento!'],
    },
  }),
  baiano: Object.freeze({
    id: 'baiano',
    art: 'baiano', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Baiano da Sinuca',
    title: 'O Rei do Giz',
    region: 1,
    boss: false,
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: [],
    deck: {},
    mechanics: {},
    style: style({ five: 10, follow: 2.5 }),
    reflexMs: 800,
    prizeBonus: 0,
    felt: { light: '#5a5f2a', mid: '#454a1f', dark: '#2f3315' },
    decor: ['chalk'],
    faces: BAIANO.faces,
    palette: BAIANO.palette,
    lines: {
      intro: ['Ê, meu rei! Bora uma partidinha?', 'Aqui é na tabela, visse?'],
      play: ['Tranquilo...', 'Na caçapa.', 'Devagar, meu rei.'],
      playDouble: ['Bucha na tabela!'],
      draw: ['Deixa eu passar giz...'],
      pass: ['Passo, sem pressa.'],
      bonus5: ['Cinco na caçapa!', 'Múltiplo de cinco, meu rei!'],
      playerPass: ['Ficou sem tacada, foi?'],
      winRound: ['Encaçapei!', 'Tabela perfeita.'],
      loseRound: ['Ôxe!', 'Errei a tacada.'],
      duelWin: ['Vai treinar mais, meu rei.'],
      duelLose: ['Respeito, visse? Respeito.'],
      hurtRelic: ['Ôxe! Que é isso?'],
    },
  }),
  valdir: Object.freeze({
    id: 'valdir',
    art: 'valdir', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Valdir Borracheiro',
    title: 'Calibra na Marra',
    region: 1,
    boss: false,
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: [],
    deck: {},
    mechanics: {},
    style: style({ heavy: 1.4, pressure: 4 }),
    reflexMs: 850,
    prizeBonus: 2,
    felt: { light: '#4a4d50', mid: '#35383a', dark: '#232527' },
    decor: [],
    faces: VALDIR.faces,
    palette: VALDIR.palette,
    lines: {
      intro: ['Senta aí. Pneu e dominó, é comigo.', 'Mesa pesada, rapaz.'],
      play: ['Toma.', 'Remendado.', 'Calibrado.'],
      playDouble: ['Bucha de aro 16!'],
      draw: ['Vou na borracharia...'],
      pass: ['Furou. Passo.'],
      bonus5: ['Cinco. Serviço pago.'],
      playerPass: ['Murchou, é?'],
      winRound: ['Pneu cheio!', 'Rodou macio.'],
      loseRound: ['Estourou...', 'Câmara furada.'],
      duelWin: ['Volta quando tiver estepe.'],
      duelLose: ['Tá rodando bem, rapaz.'],
      hurtRelic: ['Ai, minha graxa!'],
    },
  }),
  neide: Object.freeze({
    id: 'neide',
    art: 'neide', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Dona Neide',
    title: 'A Rainha da Tranca',
    region: 1,
    boss: false,
    rarity: 'raro',
    hearts: 4,
    coins: 5,
    relics: ['dedal'],
    deck: {},
    mechanics: {},
    style: style({ heavy: 1.5, lockEnds: 6, trancaBias: 0.15, follow: 2.5 }),
    reflexMs: 850,
    prizeBonus: 3,
    felt: { light: '#5a2230', mid: '#431823', dark: '#2c0f17' },
    decor: [],
    faces: moods(NEIDE, {
      thinking: { 7: '.kgFpeFssFpeFgk.', 10: '.kgsssllllsssgk.' },
      smug: { 7: '.kgFkkFssFkkFgk.', 10: '.kgsslLeeLlssgk.' },
      hurt: { 7: '.kgFkpFssFpkFgk.', 10: '.kgssslllllssgk.', 11: '.kgssssRsssssgk.' },
    }),
    palette: {
      k: K, g: '#a9a6a0', G: '#d6d3cc', s: '#e0a982', S: '#a87352', F: '#7a1f5c', e: '#f3ecda',
      p: '#120c08', B: '#e0786a', l: '#b3182a', L: '#e0453f', w: '#f4efe2', P: '#6b3f8f', q: '#e06aa8',
      R: '#c8261d',
    },
    lines: {
      intro: ['Senta, querido. A mesa é minha.', 'Vamos ver quem conta menos.'],
      play: ['Hum-hum.', 'Fecha aqui, abre ali...', 'Calma, querido.'],
      playDouble: ['Bucha guardada é bucha perdida.'],
      draw: ['Ai, o dorme...'],
      pass: ['Passo, meu bem.', 'Tô esperando você.'],
      passTranca: ['Passo... e tranco.', 'Tranca, querido. Conta comigo.'],
      bonus5: ['Cinquinho pra vovó.'],
      playerPass: ['Passou? Que pena...'],
      playerDraw: ['Compra, compra, que eu espero.'],
      winRound: ['Contou menos, venceu. Simples.', 'A rainha nunca perde a conta.'],
      loseRound: ['Ora essa!', 'Isso não estava no meu cálculo.'],
      tranca: ['Trancou! Vamos contar.', 'Hora da matemática.'],
      duelWin: ['Volte para o chá. Se tiver coragem.'],
      duelLose: ['Você conta bem, querido.'],
      hurtRelic: ['Que falta de educação!'],
    },
  }),
  arlindo: Object.freeze({
    id: 'arlindo',
    art: 'arlindo', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Seu Arlindo',
    title: 'O Rei da Bucha',
    region: 1,
    boss: true,
    rarity: 'lendario',
    hearts: 5,
    coins: 8,
    relics: ['chaveDeFenda', 'caneca'],
    deck: { '6-6': 'rubi' },
    mechanics: { doubleBuchaDamage: true },
    style: style({ doubles: 1.8, earlyDoubles: 16 }),
    reflexMs: 1000,
    prizeBonus: 10,
    felt: { light: '#3f5530', mid: '#2f4123', dark: '#1f2c17' },
    decor: ['tear', 'mug'],
    faces: moods(ARLINDO, {
      thinking: { 6: '.kwGpeeGsGpeeGwk', 10: '.ksswkkkkkkwssk.' },
      smug: { 6: '.kwGkkkGsGkkkGwk', 10: '.ksswmeeeemwssk.' },
      hurt: { 6: '.kwGekeGsGekeGwk', 10: '.kssmmmmmmmmssk.', 11: '..ksssssRssssk..' },
    }),
    palette: {
      k: K, s: '#d39a70', S: '#9c6644', L: '#f0c39a', w: '#e9e4d6', G: '#2a2a2a', e: '#cfe3ea',
      p: '#120c08', m: '#4a1a14', c: '#8a6a3e', C: '#b08a52', r: '#a3221a', R: '#d9473c',
    },
    lines: {
      intro: ['Sente aí, rapaz. Jogo desde 1962.', 'Na minha época, isso era pouco.'],
      play: ['Hum.', 'Devagarinho...', 'Olha só.', 'Paciência, rapaz.'],
      playDouble: ['Bucha cedo, cabeça leve!', 'Carroça no começo é sabedoria.', 'Lá vai a bucha do vovô.'],
      draw: ['Deixa o velho cavar...', 'No meu tempo o dorme era maior.'],
      pass: ['Passo, passo.', 'Velho também passa.'],
      bonus5: ['Cinco redondo. Aprendi com meu pai.'],
      playerPass: ['Tá sem pedra, rapaz?'],
      playerDraw: ['Cava, cava, que o dorme ensina.'],
      winRound: ['Truque velho nunca falha.', 'Sentiu a experiência?'],
      loseRound: ['Hm. Sorte de novato.', 'Minhas costas doem hoje.'],
      tranca: ['Trancou. Conta aí.'],
      duelWin: ['Volta quando crescer a barba.'],
      duelLose: ['Bom jogo, rapaz. Bom jogo.'],
      hurtRelic: ['Ai, minha coluna!'],
    },
  }),
  marcao: Object.freeze({
    id: 'marcao',
    art: 'marcao', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Marcão do Guincho',
    title: 'O Rebocador',
    region: 2,
    boss: false,
    rarity: 'comum',
    hearts: 4,
    coins: 6,
    relics: ['cinzeiro'],
    deck: { '4-6': 'chumbo' },
    mechanics: {},
    style: style({ heavy: 2.2, doubles: 0.8, pressure: 6, heartDrawMin: 2 }),
    reflexMs: 650,
    prizeBonus: 2,
    felt: { light: '#7a6420', mid: '#5c4a16', dark: '#3d300d' },
    decor: ['neon'],
    faces: moods(MARCAO, {
      thinking: { 7: '.kspesssssspesk.', 10: '.ksdkkkkkkkkdsk.' },
      smug: { 7: '.kskksssssskksk.', 10: '.ksdmeeeeeemdsk.' },
      hurt: { 7: '.kskeksssskeksk.', 11: '.kdsdsRsdsdsdsk.' },
    }),
    palette: {
      k: K, O: '#e07a1f', y: '#ffd24a', b: '#9c4f10', s: '#b97a52', S: '#8a5634', K: '#2a1a10',
      e: '#efe3c2', p: '#120c08', d: '#6e4a32', m: '#4a1a14', B: '#2d4f7a', g: '#141a20', R: '#c8261d',
    },
    lines: {
      intro: ['Bora, que o guincho tá ligado!', 'Vou te rebocar dessa mesa.'],
      play: ['TOMA!', 'Pesado!', 'Segura essa!', 'Rebocado!'],
      playDouble: ['CARROÇA PESADA!', 'Bucha de seis eixos!'],
      draw: ['Dorme, me dá peça!', 'Puxa, puxa!'],
      pass: ['Pô... passo.', 'Motor afogou.'],
      bonus5: ['Cinco no bolso, bora!'],
      playerPass: ['Atolou, é?', 'Precisa de guincho?'],
      playerDraw: ['Cava! Cava mais!', 'O dorme é teu agora.'],
      winRound: ['REBOCADO!', 'Passei por cima!'],
      loseRound: ['Pneu furou...', 'Isso não acaba assim!'],
      tranca: ['Travou o motor!'],
      duelWin: ['Vai a pé pra casa!'],
      duelLose: ['Tá bom, tá bom... tu é bom.'],
      hurtRelic: ['Ô! Que isso, rapá?!'],
    },
  }),
  serginho: Object.freeze({
    id: 'serginho',
    art: 'serginho', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Serginho 22',
    title: 'O Ligeirinho',
    region: 2,
    boss: false,
    rarity: 'comum',
    hearts: 4,
    coins: 6,
    relics: ['giz'],
    deck: { '2-2': 'ouro', '0-5': 'ouro' },
    mechanics: {},
    style: style({ five: 5, pressure: 4, heavy: 1.2 }),
    reflexMs: 600,
    prizeBonus: 2,
    felt: { light: '#8a4524', mid: '#69331a', dark: '#472210' },
    decor: ['neon'],
    faces: SERGINHO.faces,
    palette: SERGINHO.palette,
    lines: {
      intro: ['Vinte e dois, número da sorte!', 'Joga rápido que eu tô com fome.'],
      play: ['Tô sem nada... brincadeira!', 'Pá!', 'Viu? Nem pensei.', 'Rapidinho!'],
      playDouble: ['Bucha do 22!'],
      draw: ['Que nada, tenho pedra...', 'Vou buscar, pra disfarçar.'],
      pass: ['Passo... ou não?', 'Tô blefando, hein.'],
      bonus5: ['Cinco! Sorte de 22.'],
      playerPass: ['Ih, ficou nervoso?'],
      winRound: ['Falei que era rápido!', 'Vinte e dois na cabeça!'],
      loseRound: ['Ah, era blefe meu também...', 'Calma, calma.'],
      duelWin: ['Até a próxima, lerdinho.'],
      duelLose: ['Tu é ligeiro também, hein.'],
      hurtRelic: ['Ai! Sem cacoete!'],
    },
  }),
  cida: Object.freeze({
    id: 'cida',
    art: 'cida', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Cida da Marmita',
    title: 'Prato Feito',
    region: 2,
    boss: false,
    rarity: 'raro',
    hearts: 4,
    coins: 6,
    relics: ['caneca'],
    deck: { '1-4': 'ouro' },
    mechanics: { healOnPlayerPass: true },
    style: style({ follow: 3, lockEnds: 2 }),
    reflexMs: 800,
    prizeBonus: 3,
    felt: { light: '#5c2448', mid: '#451a36', dark: '#2d1023' },
    decor: ['neon'],
    faces: CIDA.faces,
    palette: CIDA.palette,
    lines: {
      intro: ['Senta, meu filho. Já comeu?', 'Marmita quentinha e dominó.'],
      play: ['Tempero da Cida.', 'Prova essa.', 'Hum, no ponto.'],
      playDouble: ['Bucha com feijão!'],
      draw: ['Deixa eu mexer a panela...'],
      pass: ['Passo, a comida tá no fogo.'],
      bonus5: ['Cinco! Pro gás do mês.'],
      playerPass: ['Passou? Dá tempo de eu comer.', 'Hmm, marmita.'],
      winRound: ['Bem servido!', 'Repete o prato?'],
      loseRound: ['Queimou o arroz...', 'Ai, meu feijão.'],
      duelWin: ['Leva uma marmita pra casa.'],
      duelLose: ['Tu tem tempero, menino.'],
      hurtRelic: ['Ai! Derramou o caldo!'],
    },
  }),
  paulinho: Object.freeze({
    id: 'paulinho',
    art: 'paulinho', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Paulinho Pente Fino',
    title: 'Olho de Lince',
    region: 2,
    boss: false,
    rarity: 'raro',
    hearts: 4,
    coins: 6,
    relics: ['borracha'],
    deck: { '0-5': 'cristal' },
    mechanics: { exposeHeaviest: true },
    style: style({ pressure: 5, follow: 2.5 }),
    reflexMs: 750,
    prizeBonus: 3,
    felt: { light: '#1f5a5c', mid: '#164446', dark: '#0d2d2f' },
    decor: ['neon'],
    faces: PAULINHO.faces,
    palette: PAULINHO.palette,
    lines: {
      intro: ['Penteado no lugar, olho na sua mão.', 'Eu vejo tudo, parceiro.'],
      play: ['Penteado.', 'Visto e anotado.', 'Hmm, sei o que você tem.'],
      playDouble: ['Bucha alinhada.'],
      draw: ['Deixa eu dar uma penteada no dorme.'],
      pass: ['Passo. Por estratégia.'],
      bonus5: ['Cinco, pente fino.'],
      playerPass: ['Eu sabia que você não tinha.'],
      winRound: ['Pente fino não deixa passar.'],
      loseRound: ['Despenteou...', 'Escapou do pente.'],
      duelWin: ['Vi sua mão desde o começo.'],
      duelLose: ['Você escondeu bem.'],
      hurtRelic: ['Ei! Meu topete!'],
    },
  }),
  tiao: Object.freeze({
    id: 'tiao',
    art: 'tiao', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Tião Navalha',
    title: 'O Malandro Perigoso',
    region: 2,
    boss: false,
    rarity: 'raro',
    hearts: 5,
    coins: 6,
    relics: ['cinzeiro', 'giz'],
    deck: { '5-5': 'chumbo', '4-6': 'ouro' },
    mechanics: {},
    style: style({ five: 9, pressure: 4, heavy: 1.3 }),
    reflexMs: 600,
    prizeBonus: 4,
    felt: { light: '#7a1c22', mid: '#5c1419', dark: '#3d0c10' },
    decor: ['neon'],
    faces: moods(TIAO, {
      thinking: { 7: '.kspessssspesrk.', 10: '.kssskkkkksssstt' },
      smug: { 7: '.kskkssssskksrk.', 10: '.kssmeyeemsssttt' },
      hurt: { 7: '.ksekssssseksrk.', 10: '.kssmmmmmmmssstt', 11: '.kSsssssRsssssk.' },
    }),
    palette: {
      k: K, H: '#141010', h: '#4a4a5a', s: '#c08a5e', S: '#8a5a38', K: '#141010', e: '#efe3c2',
      p: '#120c08', r: '#e08080', m: '#4a1a14', y: '#e8b84a', t: '#d9c49a', R: '#a3221a',
    },
    lines: {
      intro: ['Chega mais. Sem movimento brusco.', 'Aqui ninguém sai sem pagar.'],
      play: ['Na moral.', 'Corta.', 'Fica a dica.', 'Malandragem.'],
      playDouble: ['Bucha afiada.', 'Corte limpo.'],
      draw: ['Vou buscar no escuro...'],
      pass: ['Passo. Por enquanto.', 'Guarda essa.'],
      bonus5: ['Cinco. Taxa da casa.'],
      playerPass: ['Perdeu o fio, parceiro?'],
      playerDraw: ['Pode cavar. A navalha espera.'],
      winRound: ['Cortei fundo.', 'Malandro é malandro.'],
      loseRound: ['Hm. Anotado.', 'Vou lembrar dessa.'],
      tranca: ['Travou. Conta o prejuízo.'],
      duelWin: ['Deixa a carteira na saída.'],
      duelLose: ['Respeito. Mas a gente se vê.'],
      hurtRelic: ['Ninguém encosta no Tião!'],
    },
  }),
  beto: Object.freeze({
    id: 'beto',
    art: 'beto', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Beto Cigano',
    title: 'O Banqueiro',
    region: 2,
    boss: true,
    rarity: 'mitico',
    hearts: 6,
    coins: 15,
    relics: ['anel', 'carteira'],
    deck: { '6-6': 'fantasma', '0-5': 'rubi', '3-3': 'ouro' },
    mechanics: { drawFee: 2 },
    style: style({ five: 7, pressure: 5, heavy: 1.2, lockEnds: 3 }),
    reflexMs: 600,
    prizeBonus: 15,
    felt: { light: '#1f2a5a', mid: '#161f45', dark: '#0d132d' },
    decor: ['ash', 'coins', 'velvet'],
    faces: moods(BETO, {
      thinking: { 7: '.kcsgessssgesck.', 10: 'y.ksbkkkkkkbsk.y' },
      smug: { 7: '.kcskksssskksck.', 10: 'y.ksbmeyyembsk.y' },
      hurt: { 7: '.kcskesssskesck.', 11: '..ksbbbRbbbbsk..' },
    }),
    palette: {
      k: K, R: '#b3182a', w: '#f4ecd2', c: '#1a1010', s: '#a8704a', S: '#7a4a2c', K: '#1a1010',
      e: '#efe3c2', g: '#3fbf6a', y: '#e8b84a', b: '#2a1a12', m: '#4a1a14', V: '#4a2a6a', v: '#7a4aa0',
    },
    lines: {
      intro: ['As cartas disseram que você vinha.', 'Aposta alta hoje, freguês.'],
      // blefa: diz que não tem nada... e joga
      play: ['Eu não tinha nada... juro.', 'Tava escrito.', 'Hehe, blefe?', 'Rápido, rápido!'],
      playDouble: ['O destino é uma bucha.', 'Bucha da sorte!'],
      draw: ['Tô sem nada mesmo...', 'Vou ler o dorme.'],
      pass: ['Passo... ou será que não?', 'Passo. Acredita?'],
      bonus5: ['Cinco moedas, cinco destinos.'],
      playerPass: ['Eu vi isso nas cartas.'],
      playerDraw: ['O dorme mente, freguês.'],
      winRound: ['Eu avisei. As cartas avisaram.', 'A banca sempre ganha.'],
      loseRound: ['Hm... as cartas mentiram.', 'Nem toda aposta vinga.'],
      tranca: ['Travou? Eu sabia.'],
      duelWin: ['Seu destino era perder. Paciência.'],
      duelLose: ['O pote é seu. Por hoje.'],
      hurtRelic: ['Mau-olhado! Mau-olhado!'],
    },
  }),
  carlinhos: Object.freeze({
    id: 'carlinhos',
    art: 'carlinhos', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Carlinhos Mão Leve',
    title: 'O Batedor de Carteira',
    region: 3,
    boss: false,
    rarity: 'raro',
    hearts: 5,
    coins: 8,
    relics: ['maoGrande', 'cinzeiro'],
    deck: { '1-6': 'fantasma', '2-4': 'ouro' },
    mechanics: { stealOnCross: 2 },
    style: style({ pressure: 5, five: 5, lockEnds: 2 }),
    reflexMs: 650,
    prizeBonus: 4,
    felt: { light: '#1f7a4a', mid: '#165c37', dark: '#0d3d24' },
    decor: ['toxic'],
    faces: CARLINHOS.faces,
    palette: CARLINHOS.palette,
    lines: {
      intro: ['Opa, deixa eu guardar sua carteira.', 'Mão leve, consciência mais ainda.'],
      play: ['Peguei.', 'Ninguém viu.', 'Leve, leve...'],
      playDouble: ['Bucha surrupiada.'],
      draw: ['Vou dar uma passadinha no dorme...'],
      pass: ['Passo. Por enquanto.'],
      bonus5: ['Cinco moedas. Ou seis?'],
      playerPass: ['Distraído, é? Ótimo.'],
      winRound: ['Bati e levei.', 'Obrigado pela doação.'],
      loseRound: ['Me pegaram...', 'Hm. Mão pesada hoje.'],
      duelWin: ['Confere os bolsos na saída.'],
      duelLose: ['Tá, devolvo... um pouco.'],
      hurtRelic: ['Pega ladrão! Ah, sou eu.'],
    },
  }),
  bigode: Object.freeze({
    id: 'bigode',
    art: 'bigode', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Bigode de Ouro',
    title: 'O Banqueiro do Bicho',
    region: 3,
    boss: false,
    rarity: 'raro',
    hearts: 5,
    coins: 20,
    relics: ['carteira', 'anel'],
    deck: { '5-6': 'ouro', '2-6': 'ouro', '0-0': 'rubi' },
    mechanics: {},
    style: style({ five: 7, heavy: 1.3 }),
    reflexMs: 800,
    prizeBonus: 6,
    felt: { light: '#6e5a1c', mid: '#534314', dark: '#372c0c' },
    decor: ['coins'],
    faces: BIGODE.faces,
    palette: BIGODE.palette,
    lines: {
      intro: ['Aposta no bicho ou na pedra?', 'Meu bigode vale mais que sua casa.'],
      play: ['Ouro puro.', 'Banca paga.', 'Hmm, rico.'],
      playDouble: ['Bucha de ouro maciço!'],
      draw: ['O dorme me deve.'],
      pass: ['Passo. Dinheiro não tem pressa.'],
      bonus5: ['Mais cinco pro cofre.'],
      playerPass: ['Pobreza é isso.'],
      winRound: ['A banca sempre ganha!', 'Deu leão!'],
      loseRound: ['Deu zebra...', 'Quebrou a banca? Não.'],
      duelWin: ['Volta quando tiver capital.'],
      duelLose: ['Toma, compra um bigode.'],
      hurtRelic: ['Meu bigode, não!'],
    },
  }),
  sofia: Object.freeze({
    id: 'sofia',
    art: 'sofia', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Madama Sofia',
    title: 'A Vidente',
    region: 3,
    boss: false,
    rarity: 'lendario',
    hearts: 5,
    coins: 8,
    relics: ['dedal', 'cinzeiro'],
    deck: { '3-3': 'cristal', '1-1': 'fantasma' },
    mechanics: { predictDoubles: true },
    style: style({ pressure: 4, follow: 3 }),
    reflexMs: 900,
    prizeBonus: 5,
    felt: { light: '#4a2a7a', mid: '#38205c', dark: '#25143d' },
    decor: ['runes'],
    faces: SOFIA.faces,
    palette: SOFIA.palette,
    lines: {
      intro: ['As runas me contaram das suas buchas.', 'Sente, filho. O destino já embaralhou.'],
      play: ['Previsto.', 'As runas mandaram.', 'Hmm, eu já sabia.'],
      playDouble: ['A bucha estava escrita.'],
      draw: ['Deixa eu consultar o dorme...'],
      pass: ['Passo. O destino espera.'],
      bonus5: ['Cinco, como as estrelas disseram.'],
      playerPass: ['Eu vi isso na bola de cristal.'],
      winRound: ['Estava nas cartas.', 'O destino não erra.'],
      loseRound: ['Nuvens na visão...', 'As runas mentiram?'],
      duelWin: ['Seu futuro era este.'],
      duelLose: ['Não previ você, filho.'],
      hurtRelic: ['Mau presságio!'],
    },
  }),
  fausto: Object.freeze({
    id: 'fausto',
    art: 'fausto', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Doutor Fausto',
    title: 'O Alquimista',
    region: 3,
    boss: false,
    rarity: 'lendario',
    hearts: 5,
    coins: 10,
    relics: ['maoGrande', 'carteira'],
    deck: { '3-6': 'cristal', '1-4': 'cristal', '0-6': 'rubi' },
    mechanics: {},
    style: style({ five: 6, follow: 3, pressure: 4 }),
    reflexMs: 850,
    prizeBonus: 6,
    felt: { light: '#25252a', mid: '#18181c', dark: '#0d0d10' },
    decor: [],
    faces: FAUSTO.faces,
    palette: FAUSTO.palette,
    lines: {
      intro: ['Boa noite. Vamos fazer um pacto?', 'Minhas pedras mudam de forma.'],
      play: ['Experimento concluído.', 'Transmutação.', 'Interessante.'],
      playDouble: ['Bucha destilada.'],
      draw: ['Preciso de mais reagentes.'],
      pass: ['Passo. A reação demora.'],
      bonus5: ['Cinco. Proporção áurea... quase.'],
      playerPass: ['Fascinante. Você travou.'],
      winRound: ['Hipótese confirmada.', 'O cristal nunca falha.'],
      loseRound: ['Contaminação...', 'Recalculando.'],
      duelWin: ['Sua alma serve de amostra.'],
      duelLose: ['Um espécime raro. Raro.'],
      hurtRelic: ['Ah! Reação adversa!'],
    },
  }),
  alemao: Object.freeze({
    id: 'alemao',
    art: 'alemao', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Alemão do Ferro Velho',
    title: 'O Sucateiro',
    region: 3,
    boss: false,
    rarity: 'raro',
    hearts: 5,
    coins: 8,
    relics: ['buchaDeAco', 'chaveDeFenda'],
    deck: { '6-6': 'chumbo', '4-5': 'chumbo', '5-5': 'fantasma' },
    mechanics: { trancaWeight: 2 },
    style: style({ heavy: 2.4, doubles: 1.4, trancaBias: -0.4, pressure: 5 }),
    reflexMs: 850,
    prizeBonus: 6,
    felt: { light: '#6a3a1c', mid: '#502b14', dark: '#351c0c' },
    decor: ['rust'],
    faces: ALEMAO.faces,
    palette: ALEMAO.palette,
    lines: {
      intro: ['Ferro velho, pedra pesada.', 'Aqui tudo pesa o dobro, rapaz.'],
      play: ['Sucata!', 'Pesado.', 'Bum.'],
      playDouble: ['Bucha de ferro fundido!'],
      draw: ['Vou garimpar no ferro velho.'],
      pass: ['Passo. Enferrujou.'],
      bonus5: ['Cinco. Vale o quilo.'],
      playerPass: ['Emperrou, é?'],
      winRound: ['Esmagado!', 'Ferro não perdoa.'],
      loseRound: ['Enferrujei...', 'Peso morto.'],
      duelWin: ['Vira sucata, rapaz.'],
      duelLose: ['Tu é de aço, hein.'],
      hurtRelic: ['Ai! Tétano!'],
    },
  }),
  comendador: Object.freeze({
    id: 'comendador',
    art: 'comendador', // retrato 40x40 em components/ArtSprites.jsx
    name: 'Comendador Moreira',
    title: 'O Dono do Boteco',
    region: 3,
    boss: true,
    rarity: 'mitico',
    hearts: 7,
    coins: 30,
    relics: ['dedal', 'carteira'],
    deck: { '6-6': 'fantasma', '5-5': 'rubi', '4-6': 'ouro' },
    mechanics: { trancaShield: true },
    style: style({ five: 7, pressure: 6, heavy: 1.4, follow: 3, trancaBias: 0.1 }),
    reflexMs: 1000,
    prizeBonus: 40,
    felt: { light: '#6a0f12', mid: '#500b0d', dark: '#350608' },
    decor: ['cognac', 'mahogany'],
    faces: COMENDADOR.faces,
    palette: COMENDADOR.palette,
    lines: {
      intro: ['Este boteco é meu. E você também.', 'Chegou longe. Vamos ver até onde.'],
      play: ['Minha mesa, minhas regras.', 'Hm.', 'Elegante.'],
      playDouble: ['Bucha de comendador.'],
      draw: ['O dorme trabalha pra mim.'],
      pass: ['Passo. Por cortesia.'],
      bonus5: ['Cinco. Gorjeta.'],
      playerPass: ['Já cansou?'],
      winRound: ['A casa sempre vence.', 'Assine aqui.'],
      loseRound: ['Insolente!', 'Isso será cobrado.'],
      tranca: ['Tranca? Eu sou imune a isso.'],
      duelWin: ['Bem-vindo ao meu quadro de funcionários.'],
      duelLose: ['O boteco... é seu. Por hoje.'],
      hurtRelic: ['Como ousa?!'],
    },
  }),
});

export const RIVAL_IDS = Object.freeze(Object.keys(RIVALS));
export const FIRST_RIVAL = 'tioZe';
export const BOSS_IDS = Object.freeze(RIVAL_IDS.filter((id) => RIVALS[id].boss));

export const getRival = (id) => RIVALS[id] ?? RIVALS.tioZe;

// ---------------------------------------------------------------------------
// IA adaptativa por região (Patch 0.6.1)
//   intuitivo   Região 1: baralho 100% osso, joga pelo instinto (o estilo dele, sem conta à frente)
//   calculista  Região 2: 1–2 pedras de grife, até 2 talismãs passivos, caça múltiplo de 5
//   agressivo   Região 3 e chefes: até 3 pedras de grife (Rubi, Fantasma), 2 talismãs fortes,
//               arma a batida e aperta. Ninguém trapaceia: todos só veem a própria mão e a mesa.
// ---------------------------------------------------------------------------

export const AI_TIERS = Object.freeze({
  intuitivo: Object.freeze({ id: 'intuitivo', label: 'INTUITIVA', maxEnhanced: 0, maxRelics: 1 }),
  calculista: Object.freeze({ id: 'calculista', label: 'CALCULISTA', maxEnhanced: 2, maxRelics: 2 }),
  agressivo: Object.freeze({ id: 'agressivo', label: 'AGRESSIVA', maxEnhanced: 3, maxRelics: 2 }),
});

/**
 * Nível de jogo do rival: chefes e a Região 3 são agressivos, a Região 2 calcula, a 1 joga
 * no instinto. Na Maleta Preta (modo difícil) ninguém joga no instinto: as Regiões 1 e 2
 * calculam e a 3 e os chefes atacam.
 */
export function tierOf(rival, mode = 'normal') {
  if (rival.boss || rival.region >= 3) return 'agressivo';
  if (rival.region === 2 || mode === 'hard') return 'calculista';
  return 'intuitivo';
}

function tierStyle(rival, mode = 'normal') {
  const base = rival.style;
  const tier = tierOf(rival, mode);
  if (mode === 'hard') {
    // Maleta Preta: contas precisas de tranca (sem achismo) e de múltiplo de 5; ataque mais forte
    if (tier === 'calculista') {
      return style({ ...base, five: Math.max(base.five, 8), fiveSetup: Math.max(base.fiveSetup, 4), trancaBias: 0, heartDrawMin: Math.min(base.heartDrawMin, 2) });
    }
    return style({
      ...base,
      five: Math.max(base.five, 8),
      fiveSetup: Math.max(base.fiveSetup, 3),
      pressure: base.pressure * 1.8,
      trancaBias: 0,
      heartDrawMin: Math.min(base.heartDrawMin, 2),
      aggression: Math.max(base.aggression, 1.5),
    });
  }
  if (tier === 'calculista') return style({ ...base, five: Math.max(base.five, 7), fiveSetup: Math.max(base.fiveSetup, 3) });
  if (tier === 'agressivo') {
    return style({
      ...base,
      five: Math.max(base.five, 7),
      fiveSetup: Math.max(base.fiveSetup, 2),
      pressure: base.pressure * 1.5,
      heartDrawMin: Math.min(base.heartDrawMin, 2),
      aggression: Math.max(base.aggression, 1),
    });
  }
  return base;
}

/** Pesos que a IA usa de fato com esse rival (o estilo dele + o nível da região). */
export const PLAY_STYLES = Object.freeze(Object.fromEntries(RIVAL_IDS.map((id) => [id, tierStyle(RIVALS[id])])));
/** Os mesmos pesos na Maleta Preta. */
export const HARD_PLAY_STYLES = Object.freeze(Object.fromEntries(RIVAL_IDS.map((id) => [id, tierStyle(RIVALS[id], 'hard')])));
export const playStyleOf = (id, mode = 'normal') => {
  const table = mode === 'hard' ? HARD_PLAY_STYLES : PLAY_STYLES;
  return table[id] ?? table.tioZe;
};

// ---------------------------------------------------------------------------
// Maleta Preta (Patch 0.6.3): o que muda em cada rival no modo difícil
//   Região 1  1 pedra de grife e 1 talismã cada
//   Região 2  2 pedras de grife e até 2 talismãs passivos (e contas precisas)
//   Região 3  quase mini-chefes: 3 pedras de grife (Rubi, Fantasma) e 2 talismãs perigosos
//   Chefes    Seu Arlindo: 6♥ e as buchas viram Chumbo (travam as pontas)
//             Beto Cigano: 7♥, taxa de $3 a cada compra do dorme, 2 Ouros e 1 Rubi
//             Comendador Moreira: 8♥, 2 talismãs Necróticos e imune à 1ª tranca
// ---------------------------------------------------------------------------

export const HARD_LOADOUTS = Object.freeze({
  tioZe: { relics: ['cinzeiro'], deck: { '5-5': 'ouro' } },
  tonho: { relics: ['giz'], deck: { '0-1': 'fantasma' } },
  baiano: { relics: ['giz'], deck: { '0-5': 'ouro' } },
  valdir: { relics: ['chaveDeFenda'], deck: { '3-5': 'chumbo' } },
  neide: { relics: ['dedal'], deck: { '4-4': 'chumbo' } },
  arlindo: { hearts: 6, relics: ['chaveDeFenda', 'caneca'], deck: { '6-6': 'chumbo', '5-5': 'chumbo', '4-4': 'chumbo', '3-3': 'chumbo' } },
  marcao: { relics: ['cinzeiro', 'chaveDeFenda'], deck: { '4-6': 'chumbo', '5-6': 'ouro' } },
  serginho: { relics: ['giz', 'cinzeiro'], deck: { '2-2': 'ouro', '0-5': 'fantasma' } },
  cida: { relics: ['caneca', 'cinzeiro'], deck: { '1-4': 'ouro', '3-3': 'cristal' } },
  paulinho: { relics: ['borracha', 'cinzeiro'], deck: { '0-5': 'cristal', '6-6': 'chumbo' } },
  tiao: { relics: ['cinzeiro', 'giz'], deck: { '5-5': 'chumbo', '4-6': 'rubi' } },
  beto: { hearts: 7, relics: ['anel', 'carteira'], deck: { '5-6': 'ouro', '3-3': 'ouro', '0-5': 'rubi' }, mechanics: { drawFee: 3 } },
  carlinhos: { relics: ['maoGrande', 'anel'], deck: { '1-6': 'fantasma', '2-4': 'ouro', '0-3': 'rubi' } },
  bigode: { relics: ['carteira', 'maoGrande'], deck: { '5-6': 'ouro', '2-6': 'ouro', '0-0': 'rubi' } },
  sofia: { relics: ['dedal', 'anel'], deck: { '3-3': 'cristal', '1-1': 'fantasma', '2-5': 'rubi' } },
  fausto: { relics: ['maoGrande', 'dedal'], deck: { '3-6': 'cristal', '1-4': 'cristal', '0-6': 'rubi' } },
  alemao: { relics: ['buchaDeAco', 'dedal'], deck: { '6-6': 'chumbo', '4-5': 'chumbo', '5-5': 'fantasma' } },
  comendador: { hearts: 8, relics: ['trancaCadaverica', 'falsaPartida'], deck: { '6-6': 'fantasma', '5-5': 'rubi', '4-6': 'ouro' } },
});

/** Os 18 rivais como eles sentam à mesa na Maleta Preta. */
export const HARD_RIVALS = Object.freeze(
  Object.fromEntries(
    RIVAL_IDS.map((id) => {
      const over = HARD_LOADOUTS[id] ?? {};
      const base = RIVALS[id];
      return [
        id,
        Object.freeze({
          ...base,
          hearts: over.hearts ?? base.hearts,
          relics: over.relics ?? base.relics,
          deck: over.deck ?? base.deck,
          mechanics: { ...base.mechanics, ...over.mechanics },
          hard: true,
        }),
      ];
    }),
  ),
);

/** O rival `id` no modo da run (normal ou 'hard'). */
export const rivalFor = (id, mode = 'normal') => (mode === 'hard' ? HARD_RIVALS[id] : RIVALS[id]) ?? RIVALS.tioZe;

/** O rival da mesa deste estado, no modo da run. */
export const rivalOf = (state) => rivalFor(state.rivalId, state.mode);

/** Fala do rival para a situação (cai nas falas do Tio Zé se ele não tiver uma própria). */
export function pickRivalLine(rivalId, kind, seed = 0) {
  const lines = getRival(rivalId).lines[kind] ?? TIO_ZE_LINES[kind];
  if (!lines || !lines.length) return null;
  return lines[Math.abs(seed) % lines.length];
}
