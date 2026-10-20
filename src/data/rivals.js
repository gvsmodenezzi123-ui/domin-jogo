/**
 * Rivais do boteco. A run começa sempre contra o Tio Zé (o dono da mesa); a cada
 * nova partida sai um dos 5 rivais da galeria (o Beto Cigano é raro).
 *
 * Cada rival tem:
 *   hearts / coins     corações e moedas no começo da partida
 *   relics             talismãs passivos (aparecem na hotbar dele)
 *   deck               pedras aprimoradas do baralho dele ({ id: aprimoramento })
 *   style              pesos da IA (ver scoreMove em ai/tioZeAI.js)
 *   reflexMs           tempo de "pensar" antes de cada ação
 *   prizeBonus         moedas extras ao vencê-lo
 *   faces / palette    retrato 16x16 em pixel art, um mapa por humor
 *   lines              falas curtas por situação (o que faltar usa as do Tio Zé)
 */

import { TIO_ZE_FACES, TIO_ZE_PALETTE } from '../components/sprites.js';

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
});

const style = (overrides) => Object.freeze({ ...DEFAULT_STYLE, ...overrides });

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------

export const RIVALS = Object.freeze({
  tioZe: Object.freeze({
    id: 'tioZe',
    name: 'Tio Zé',
    title: 'O Dono da Mesa',
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: [],
    deck: {},
    style: DEFAULT_STYLE,
    reflexMs: 700,
    prizeBonus: 0,
    weight: 0,
    faces: TIO_ZE_FACES,
    palette: TIO_ZE_PALETTE,
    lines: TIO_ZE_LINES,
  }),

  arlindo: Object.freeze({
    id: 'arlindo',
    name: 'Seu Arlindo',
    title: 'O Velho Truqueiro',
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: ['chaveDeFenda'],
    deck: {},
    style: style({ doubles: 1.6, earlyDoubles: 14 }),
    reflexMs: 900,
    prizeBonus: 0,
    weight: 5,
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

  neide: Object.freeze({
    id: 'neide',
    name: 'Dona Neide',
    title: 'A Rainha da Tranca',
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: ['dedal'],
    deck: {},
    style: style({ heavy: 1.5, lockEnds: 6, trancaBias: 0.15, follow: 2.5 }),
    reflexMs: 800,
    prizeBonus: 0,
    weight: 5,
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

  marcao: Object.freeze({
    id: 'marcao',
    name: 'Marcão do Guincho',
    title: 'O Rebocador',
    rarity: 'comum',
    hearts: 3,
    coins: 5,
    relics: ['cinzeiro'],
    deck: {},
    style: style({ heavy: 2.2, doubles: 0.8, pressure: 6, heartDrawMin: 2 }),
    reflexMs: 600,
    prizeBonus: 0,
    weight: 5,
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

  tiao: Object.freeze({
    id: 'tiao',
    name: 'Tião Navalha',
    title: 'O Malandro Perigoso',
    rarity: 'raro',
    hearts: 5,
    coins: 5,
    relics: [],
    deck: { '4-6': 'chumbo' },
    style: style({ five: 9, pressure: 4 }),
    reflexMs: 650,
    prizeBonus: 4,
    weight: 4,
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
    name: 'Beto Cigano',
    title: 'Apostas Altas',
    rarity: 'mitico',
    hearts: 4,
    coins: 15,
    relics: ['anel'],
    deck: {},
    style: style({ five: 7, pressure: 5, heavy: 1.2, lockEnds: 3 }),
    reflexMs: 420,
    prizeBonus: 15,
    weight: 1.5,
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
});

export const RIVAL_IDS = Object.freeze(Object.keys(RIVALS));
/** Os 5 da galeria, sorteados a cada nova partida (o Tio Zé abre a run). */
export const RIVAL_POOL = Object.freeze(RIVAL_IDS.filter((id) => RIVALS[id].weight > 0));
export const FIRST_RIVAL = 'tioZe';

export const getRival = (id) => RIVALS[id] ?? RIVALS.tioZe;

/** Fala do rival para a situação (cai nas falas do Tio Zé se ele não tiver uma própria). */
export function pickRivalLine(rivalId, kind, seed = 0) {
  const lines = getRival(rivalId).lines[kind] ?? TIO_ZE_LINES[kind];
  if (!lines || !lines.length) return null;
  return lines[Math.abs(seed) % lines.length];
}

/** Próximo rival: sorteio com peso, sem repetir o último. */
export function pickNextRival(rng, lastId = null) {
  const pool = RIVAL_POOL.filter((id) => id !== lastId);
  const total = pool.reduce((sum, id) => sum + RIVALS[id].weight, 0);
  let roll = rng() * total;
  for (const id of pool) {
    roll -= RIVALS[id].weight;
    if (roll < 0) return id;
  }
  return pool[pool.length - 1];
}
