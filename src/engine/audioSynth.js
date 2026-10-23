// src/engine/audioSynth.js
// Motor de áudio procedural do Buxaria (Patch 0.5.4: direção de áudio nova).
//
// Grafo:   vozes da música → musicBus ─┐
//          vozes dos efeitos → sfxBus ─┼→ warmth (passa-baixa 2800 Hz, leve ressonância) → master → saída
//
// - Textura analógica quente: tudo passa por um passa-baixa em 2800 Hz (abre para 4500 Hz na tensão).
// - Ducking: pedra batendo, dano de coração e a voz do rival abaixam a música 30% por 200 ms e ela volta suave.
// - Trilha adaptativa (~128 BPM): bossa-funk com contrabaixo acústico sintetizado (decay natural) e piano
//   elétrico (senoides com tremolo). Com 1–2 corações de alguém, entra a camada de tensão: hi-hats rápidos,
//   filtro aberto e andamento um pouco mais rápido. Vitória da partida: fanfarra maior e só então a trilha
//   suave da Loja Clandestina.
// - SFX táteis: a pedra é osso/marfim (800 Hz, 15 ms) + baque oco da mesa (120 Hz, 80 ms), pitch ±5%.
//   Pedras de grife com timbre próprio (ouro tilintando, rubi sub-grave, cristal com eco de sino).
// - iOS: no máximo 6 vozes soando ao mesmo tempo, contando cada oscilador/fonte de ruído (um acorde de 3 notas
//   são 3 vozes). Estourou: a voz mais velha e menos importante (música antes de efeito) sai com fade de 15 ms.
//   Cada nota termina com .stop() + .disconnect() de todos os nós e as referências zeradas.

const MUTE_KEY = 'buxaria:muted';

function readMuted() {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(value) {
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // armazenamento bloqueado: o mudo vale só nesta sessão
  }
}

/** Polifonia máxima: fontes soando ao mesmo tempo (osciladores e ruído; música e efeitos somados). */
export const MAX_VOICES = 6;
/** Corte do passa-baixa da saída geral (vinil quente) e na camada de tensão. */
export const WARM_CUTOFF = 2800;
export const TENSE_CUTOFF = 4500;
const WARM_Q = 1.6;
/** Ducking: quanto a música desce (fator) e por quanto tempo fica baixa (s). */
export const DUCK_LEVEL = 0.7;
export const DUCK_HOLD = 0.2;
const DUCK_RELEASE = 0.35;
/** Prioridade na hora de cortar uma voz quando a polifonia estoura (menor sai primeiro). */
const PRIORITY = { music: 0, voice: 1, sfx: 2 };

/**
 * Patch 0.9.0: dentro da música, quem cede a vaga primeiro quando a polifonia estoura (menor
 * = mais descartável): chimbal antes do sino, do arpejo e do bumbo; a harmonia e o baixo por
 * último. Tudo abaixo de PRIORITY.voice: efeito e fala sempre passam na frente da trilha.
 */
const MUSIC = { hat: 0, bell: 0.05, snare: 0.1, lead: 0.15, kick: 0.25, harmony: 0.3, toll: 0.32, bass: 0.35 };

/**
 * Instantes (s) em que a luz apaga na entrada do Dono, iguais aos degraus do CSS
 * `secret-flicker` (1,5 s): 3 apagadas que voltam e a queimada final (`FLICKER_OUT`),
 * abaixo de 3 piscadas por segundo.
 */
export const FLICKER_CUTS = [0.14, 0.6, 1.1];
export const FLICKER_OUT = 1.42;
/** Andamento base e o empurrão da camada de tensão. */
export const BASE_BPM = 128;
const TENSION_TEMPO = 1.08;
/** Fanfarra da vitória: a música fica parada esse tempo e a próxima faixa entra depois (s). */
const FANFARE_HOLD = 2.2;
/** Sequenciador: agenda notas com antecedência (s) a cada tique (ms). */
const LOOKAHEAD = 0.12;
const TICK_MS = 25;

const SILENT = 0.0001;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// --- PERFIS DE VOZ ---
// baseFreq (Hz), mod (variação por sílaba, Hz), type (onda), speed (ms por letra)
const VOICE_PROFILES = {
  tioZe: { baseFreq: 110, mod: 35, type: 'triangle', speed: 85 }, // voz rouca, grave de fumante
  donaNeide: { baseFreq: 340, mod: 70, type: 'sine', speed: 65 }, // aguda e ranzinza
  marcao: { baseFreq: 80, mod: 25, type: 'sawtooth', speed: 100 }, // caminhoneiro pesado
  seuArlindo: { baseFreq: 130, mod: 40, type: 'square', speed: 90 }, // chefe fanfarrão
  default: { baseFreq: 160, mod: 50, type: 'triangle', speed: 75 },
  tonho: { baseFreq: 190, mod: 60, type: 'square', speed: 55 }, // entregador apressado
  baiano: { baseFreq: 150, mod: 55, type: 'triangle', speed: 80 }, // malemolente
  valdir: { baseFreq: 95, mod: 30, type: 'sawtooth', speed: 95 }, // rouco de oficina
  serginho: { baseFreq: 230, mod: 80, type: 'square', speed: 50 }, // ligeiro, fala atropelando
  cida: { baseFreq: 290, mod: 60, type: 'sine', speed: 70 }, // tia da marmita
  paulinho: { baseFreq: 200, mod: 40, type: 'triangle', speed: 70 }, // vaidoso
  tiao: { baseFreq: 120, mod: 30, type: 'sawtooth', speed: 60 }, // seco e rápido
  beto: { baseFreq: 140, mod: 45, type: 'triangle', speed: 75 }, // macio de banqueiro
  carlinhos: { baseFreq: 210, mod: 70, type: 'square', speed: 55 }, // batedor de carteira
  bigode: { baseFreq: 105, mod: 30, type: 'triangle', speed: 90 }, // gordo e satisfeito
  sofia: { baseFreq: 260, mod: 90, type: 'sine', speed: 95 }, // mística, arrastada
  fausto: { baseFreq: 125, mod: 15, type: 'sine', speed: 85 }, // frio, monótono
  alemao: { baseFreq: 85, mod: 25, type: 'square', speed: 95 }, // ferro velho
  comendador: { baseFreq: 95, mod: 35, type: 'triangle', speed: 110 }, // grave, sem pressa
  donoDaNoite: { baseFreq: 70, mod: 20, type: 'sawtooth', speed: 140 }, // do fundo do poço, devagar
  valtinho: { baseFreq: 118, mod: 42, type: 'triangle', speed: 72 }, // atendente da Loja Clandestina, com o palito na boca
  corvo: { baseFreq: 72, mod: 18, type: 'sawtooth', speed: 105 }, // Corvo da Madrugada: sussurro grave no escuro do beco
  seuTiao: { baseFreq: 150, mod: 55, type: 'triangle', speed: 90 }, // Seu Tião das Moedas: velho risonho, sem pressa
  voJuca: { baseFreq: 132, mod: 38, type: 'triangle', speed: 34 }, // Vô Juca (tutorial): vozinha de vô, fala ligeiro pra aula não arrastar
};

/** ids do jogo → perfis acima. */
const VOICE_ALIASES = { neide: 'donaNeide', arlindo: 'seuArlindo' };

/** ids das pedras de grife no jogo → nomes usados no motor. */
const ENHANCEMENT_ALIASES = { ouro: 'gold', cristal: 'crystal', rubi: 'ruby', chumbo: 'lead', fantasma: 'ghost' };

/** Letras que não fazem som (pausa natural da fala). */
export const SILENT_CHARS = new Set([' ', '.', ',', '!', '?', '…', '-', ':', ';']);

export const voiceProfile = (character) => VOICE_PROFILES[VOICE_ALIASES[character] ?? character] ?? VOICE_PROFILES.default;

// --- TRILHAS ---
// Um compasso = 16 semicolcheias. `chords`: um acorde por compasso, com a fundamental do baixo
// (midi) e a abertura do piano elétrico (midi, sem a fundamental). `bass`: passo → intervalo em
// semitons a partir da fundamental. `comp`: passo → duração (s) do acorde do piano. `kick`, `rim`:
// passos da percussão base. `level`: volume da faixa.
// Patch 0.8.2, `style: 'electric'` (chefes): o baixo vira serra saturada com filtro varrendo, o
// piano vira power chord distorcido, entra um arpejo de onda quadrada (`lead`: passo → intervalo),
// caixa (`snare`), chimbal em semicolcheia (`hats`) e o bumbo fica mais pesado. `cutoff` abre o
// passa-baixa da saída enquanto a faixa toca.
// Patch 0.9.0: um estilo (e uma faixa) por chefe, ver KITS: 'samba' (Seu Arlindo: órgão, cuíca,
// agogô em `bells` e ganzá), 'iron' (Beto Cigano: serra esmagada, power chord grave, batidas de
// metal em `clank`), 'electric' (Comendador) e 'ritual' (Dono da Noite: pad longo, arpejo de
// vidro nas notas do acorde — `lead` com [índice da nota, oitava] — e um sino a cada `toll`
// compassos). `hats`: true/'16' (semicolcheias), '8' (colcheias), 'off' (contratempos) ou
// 'shaker' (ganzá).
export const TRACKS = {
  // Boteco da Esquina: bossa-funk em ii-V-I, contrabaixo andando e piano elétrico macio
  botecoJazz: {
    bpm: BASE_BPM,
    swing: 0.12,
    level: 1,
    chords: [
      { root: 45, ep: [60, 64, 67] }, // Am7
      { root: 50, ep: [60, 64, 66] }, // D9
      { root: 43, ep: [59, 62, 66] }, // Gmaj7
      { root: 48, ep: [59, 64, 67] }, // Cmaj7
      { root: 42, ep: [57, 60, 64] }, // F#m7(b5)
      { root: 47, ep: [57, 63, 66] }, // B7
      { root: 40, ep: [55, 59, 62] }, // Em7
      { root: 40, ep: [55, 62, 66] }, // Em9
    ],
    bass: { 0: 0, 6: 7, 8: 0, 11: 12, 14: 7 },
    comp: { 0: 0.42, 3: 0.24, 6: 0.3, 10: 0.42, 13: 0.24 },
    kick: [0, 8],
    rim: [3, 6, 10, 12],
  },
  // Clube da Sinuca: funk de groove fechado, baixo em semicolcheias e piano em stabs
  sinucaFunk: {
    bpm: BASE_BPM,
    swing: 0.06,
    level: 0.95,
    chords: [
      { root: 38, ep: [53, 60, 64] }, // Dm9
      { root: 38, ep: [53, 60, 64] },
      { root: 43, ep: [53, 59, 64] }, // G13
      { root: 43, ep: [53, 59, 64] },
    ],
    bass: { 0: 0, 3: 0, 4: 12, 7: 10, 8: 0, 10: 7, 11: 10, 14: 12 },
    comp: { 2: 0.16, 6: 0.16, 10: 0.2, 13: 0.14 },
    kick: [0, 7, 10],
    rim: [4, 12],
  },
  // Submundo do Jogo do Bicho (Região 3): menor, bumbo marcado, piano escuro. Era a faixa dos
  // chefes até o 0.8.1; desde o 0.9.0 é só das mesas comuns da região.
  submundoNoir: {
    bpm: BASE_BPM,
    swing: 0,
    level: 0.95,
    chords: [
      { root: 45, ep: [57, 60, 64] }, // Am
      { root: 41, ep: [57, 60, 65] }, // F
      { root: 38, ep: [57, 62, 65] }, // Dm
      { root: 40, ep: [56, 62, 64] }, // E7
    ],
    bass: { 0: 0, 2: 0, 4: 0, 6: 12, 8: 0, 10: 0, 12: 0, 14: 12 },
    comp: { 0: 0.5, 6: 0.22, 11: 0.3 },
    kick: [0, 4, 8, 12],
    rim: [4, 12],
  },
  // Seu Arlindo, o Rei da Bucha (chefe da Região 1, Patch 0.9.0): "Samba da Navalha". Samba-rock
  // malandro a 136 BPM em Ré menor: baixo de serra limpo e sincopado, órgão em stabs, cuíca
  // nos contratempos, agogô alto/baixo, surdo, palma no 2 e no 4 e ganzá correndo.
  bossArlindo: {
    bpm: 136,
    swing: 0.08,
    level: 1.05,
    style: 'samba',
    cutoff: 4400,
    chords: [
      { root: 38, ep: [53, 57, 60] }, // Dm7
      { root: 43, ep: [53, 59, 62] }, // G7
      { root: 38, ep: [53, 57, 60] }, // Dm7
      { root: 45, ep: [55, 58, 61] }, // A7(b9)
    ],
    bass: { 0: 0, 3: 12, 4: 7, 6: 0, 8: 0, 10: 12, 11: 10, 14: 7 },
    comp: { 2: 0.12, 5: 0.1, 9: 0.12, 12: 0.18 },
    lead: { 7: 36, 15: 31 },
    kick: [0, 8, 11],
    snare: [4, 12],
    bells: { 0: 'h', 2: 'l', 3: 'h', 6: 'l', 8: 'h', 10: 'h', 11: 'l', 14: 'l' },
    hats: 'shaker',
    rim: [],
  },
  // Beto Cigano, o Banqueiro (chefe da Região 2, Patch 0.9.0): "Ferro-Velho". Industrial lento
  // e pesado a 104 BPM em Dó: serra esmagada em palhetada abafada, power chord grave, caixa só
  // no 3 (meio-tempo), batidas de ferro e chimbal em colcheias.
  bossBeto: {
    bpm: 104,
    swing: 0,
    level: 0.82,
    style: 'iron',
    cutoff: 4000,
    chords: [
      { root: 36, ep: [48, 55] }, // C5
      { root: 36, ep: [48, 55] }, // C5
      { root: 37, ep: [49, 56] }, // Db5
      { root: 34, ep: [46, 53] }, // Bb5
    ],
    bass: { 0: 0, 1: 0, 2: 0, 4: 0, 5: 0, 6: 12, 8: 0, 9: 0, 10: 0, 11: 0, 12: 1, 14: 0 },
    comp: { 0: 0.5, 8: 0.36, 14: 0.12 },
    kick: [0, 3, 6, 10],
    snare: [8],
    clank: [4, 12, 15],
    hats: '8',
    rim: [],
  },
  // O Dono da Noite (nó 19 secreto, Patch 0.9.0): "Noite Eterna". Ritual de sintetizador a
  // 116 BPM: Dó menor, Láb, Fá# diminuto (o trítono) e Sol; pad que respira o compasso inteiro,
  // arpejo de vidro nas notas do acorde, baixo pulsando, bumbo de coração (tum-tum), palma
  // seca no 4 e um sino grave a cada 2 compassos.
  bossNoite: {
    bpm: 116,
    swing: 0,
    level: 1.1,
    style: 'ritual',
    cutoff: 3600,
    chords: [
      { root: 36, ep: [55, 60, 63] }, // Cm
      { root: 32, ep: [56, 60, 63] }, // Ab
      { root: 42, ep: [54, 57, 60] }, // F#°
      { root: 43, ep: [55, 59, 62] }, // G
    ],
    bass: { 0: 0, 2: 0, 4: 0, 6: 12, 8: 0, 10: 0, 12: 0, 14: 12 },
    comp: { 0: 1.9 },
    lead: { 0: [0, 12], 2: [1, 12], 4: [2, 12], 6: [1, 24], 8: [0, 24], 10: [2, 12], 12: [1, 12], 14: [2, 24] },
    kick: [0, 2, 8, 10],
    snare: [12],
    toll: 2,
    hats: 'off',
    rim: [],
  },
  // Comendador Moreira, o Dono do Boteco (chefe final; Patch 0.8.2, a faixa de todos os chefes
  // até o 0.9.0): elétrica e agressiva, 152 BPM em Mi frígio. Baixo de serra saturado em galope,
  // power chords distorcidos em contratempo, arpejo de onda quadrada por cima, bumbo duplo,
  // caixa no 2 e no 4 e chimbal correndo em semicolcheias.
  bossFight: {
    bpm: 152,
    swing: 0,
    level: 0.78, // ~2 dB acima das outras: mais densa, sem estourar
    style: 'electric',
    cutoff: 5200,
    chords: [
      { root: 40, ep: [52, 59] }, // E5
      { root: 40, ep: [52, 59] }, // E5
      { root: 41, ep: [53, 60] }, // F5 (o meio-tom frígio)
      { root: 38, ep: [50, 57] }, // D5
    ],
    bass: { 0: 0, 1: 0, 2: 12, 3: 0, 4: 0, 5: 0, 6: 12, 7: 0, 8: 0, 9: 0, 10: 12, 11: 0, 12: 0, 13: 3, 14: 5, 15: 7 },
    comp: { 0: 0.24, 3: 0.12, 6: 0.18, 10: 0.24, 14: 0.12 },
    lead: { 0: 24, 2: 31, 4: 27, 6: 31, 8: 36, 10: 31, 12: 27, 14: 34 },
    kick: [0, 3, 6, 8, 11, 14],
    snare: [4, 12],
    hats: true,
    rim: [],
  },
  // Loja Clandestina: lounge suave, sem bumbo, piano longo e baixo em mínimas
  lojaLounge: {
    bpm: 96,
    swing: 0.15,
    level: 0.85,
    chords: [
      { root: 41, ep: [57, 60, 64] }, // Fmaj7
      { root: 40, ep: [55, 59, 62] }, // Em7
      { root: 38, ep: [53, 57, 60] }, // Dm7
      { root: 48, ep: [55, 59, 64] }, // Cmaj7
    ],
    bass: { 0: 0, 8: 7, 14: 12 },
    comp: { 0: 1.1, 8: 0.9 },
    kick: [],
    rim: [],
    brush: [4, 12],
  },
  // Mercado Negro (Patch 0.6.1): beco noturno, menor e lento, só escovinha e um bumbo abafado
  becoNoir: {
    bpm: 78,
    swing: 0.1,
    level: 0.8,
    chords: [
      { root: 36, ep: [51, 55, 62] }, // Cm9
      { root: 44, ep: [51, 55, 60] }, // Abmaj7
      { root: 41, ep: [51, 56, 60] }, // Fm7
      { root: 43, ep: [53, 59, 62] }, // G7
    ],
    bass: { 0: 0, 10: 7 },
    comp: { 0: 1.4 },
    kick: [0],
    rim: [],
    brush: [6, 14],
  },
};

/** Faixa da Loja Clandestina (entra depois da fanfarra da vitória). */
export const SHOP_MUSIC = 'lojaLounge';
/** Faixa do beco do Corvo da Madrugada. */
export const MARKET_MUSIC = 'becoNoir';

/** Curva de saturação (overdrive suave) do baixo e dos power chords elétricos. */
function driveCurve(amount = 28, size = 1024) {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const x = (i * 2) / size - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

/**
 * Instrumentos de cada estilo de faixa (Patch 0.9.0). `bass`/`comp`/`lead`: quem toca cada
 * linha, com os ajustes do baixo de serra (`bassOpts`) e do power chord (`compOpts`);
 * `kick`/`snare`: o tipo de bumbo e de caixa.
 */
const KITS = {
  classic: { bass: 'acoustic', comp: 'ep', lead: 'square', kick: 'soft', snare: 'crack' },
  electric: {
    bass: 'saw',
    bassOpts: { drive: 28, from: 2400, to: 320, q: 7, dur: 0.17, peak: 0.42 },
    comp: 'power',
    compOpts: { drive: 28, lp: 3200, peak: 0.13 },
    lead: 'square',
    kick: 'hard',
    snare: 'crack',
  },
  samba: {
    bass: 'saw',
    bassOpts: { drive: 5, from: 1500, to: 420, q: 4, dur: 0.15, peak: 0.4 },
    comp: 'organ',
    lead: 'cuica',
    kick: 'surdo',
    snare: 'clap',
  },
  iron: {
    bass: 'saw',
    bassOpts: { drive: 60, from: 1100, to: 150, q: 9, dur: 0.2, peak: 0.44 },
    comp: 'power',
    compOpts: { drive: 60, lp: 2400, peak: 0.12 },
    lead: 'square',
    kick: 'iron',
    snare: 'iron',
  },
  ritual: {
    bass: 'saw',
    bassOpts: { drive: 3, from: 700, to: 120, q: 2, dur: 0.24, peak: 0.42 },
    comp: 'pad',
    lead: 'glass',
    kick: 'heart',
    snare: 'clap',
  },
};

/** Bumbos: [frequência inicial, final, tempo da queda, pico, duração]. */
const KICKS = {
  soft: [115, 48, 0.1, 0.5, 0.13],
  hard: [170, 44, 0.07, 0.62, 0.12],
  surdo: [96, 54, 0.14, 0.55, 0.22],
  iron: [150, 36, 0.09, 0.7, 0.16],
  heart: [82, 38, 0.1, 0.56, 0.15],
};

/** Caixas (ruído filtrado): [frequência, Q, pico, duração]. */
const SNARES = {
  crack: [1900, 0.8, 0.26, 0.11],
  clap: [1200, 1.1, 0.22, 0.07],
  iron: [1400, 0.6, 0.34, 0.24],
};

/** Duração da semicolcheia `step` (com swing nas do contratempo). */
export function stepDuration(track, step, tempo = 1) {
  const base = 60 / (track.bpm * tempo) / 4;
  return base * (step % 2 === 0 ? 1 + track.swing : 1 - track.swing);
}

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = readMuted();
    this.musicVolume = 0.4;
    this.sfxVolume = 0.7;
    this.currentTrack = null;
    this.isPlayingMusic = false;
    this.tension = false;
    this.noiseBuffer = null;
    this.stopSpeech = null;
    // grafo
    this.master = null;
    this.warmth = null;
    this.musicBus = null;
    this.sfxBus = null;
    // vozes vivas (máx. MAX_VOICES) e timers de notas atrasadas
    this.voices = [];
    this.timers = new Set();
    // sequenciador
    this.seq = null;
    this.seqTimer = null;
    this.musicHoldUntil = 0;
  }

  init() {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.buildGraph();
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  /** Só toca com o contexto rodando (senão as notas acumulam e saem todas juntas ao destravar). */
  ready() {
    return this.init() && this.ctx.state === 'running';
  }

  buildGraph() {
    const { ctx } = this;
    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.warmth = ctx.createBiquadFilter();
    this.warmth.type = 'lowpass';
    this.warmth.frequency.value = this.tension ? TENSE_CUTOFF : WARM_CUTOFF;
    this.warmth.Q.value = WARM_Q;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = Math.max(SILENT, this.musicLevel());
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.musicBus.connect(this.warmth);
    this.sfxBus.connect(this.warmth);
    this.warmth.connect(this.master);
    this.master.connect(ctx.destination);
  }

  /** Volume da música agora (0 no mudo e enquanto a fanfarra segura a trilha). */
  musicLevel() {
    if (this.isMuted) return 0;
    if (this.ctx && this.ctx.currentTime < this.musicHoldUntil) return 0;
    return this.musicVolume * (TRACKS[this.seq?.name]?.level ?? 1);
  }

  /** Volume das OPÇÕES (0–1). */
  setVolumes({ sfx = this.sfxVolume, music = this.musicVolume } = {}) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.musicBus) this.rampMusic(this.musicLevel(), 0.08);
  }

  rampMusic(level, seconds) {
    const g = this.musicBus.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(SILENT, g.value), t);
    g.exponentialRampToValueAtTime(Math.max(SILENT, level), t + seconds);
  }

  /**
   * Silencia a trilha por `seconds` (a entrada do Dono, Patch 0.8.2): a música some em meio
   * segundo e volta sozinha no fim; `hushMusic(0)` traz de volta na hora (pular a entrada).
   * O sequenciador segue no relógio, mudo, para a faixa voltar no tempo certo.
   */
  hushMusic(seconds) {
    if (!this.musicBus || !this.ctx) return;
    const wait = Math.max(0, seconds);
    this.musicHoldUntil = this.ctx.currentTime + wait;
    if (wait > 0) this.rampMusic(SILENT, 0.5);
    this.later(wait, () => {
      if (this.isPlayingMusic && this.ctx.currentTime >= this.musicHoldUntil - 0.05) this.rampMusic(this.musicLevel(), 0.8);
    });
  }

  /**
   * Ducking dinâmico: a música desce 30% (exponencial), fica baixa 200 ms e volta suave.
   * Chamado a cada pedra na mesa, dano de coração e sílaba do rival.
   */
  duck() {
    if (!this.musicBus || !this.isPlayingMusic) return;
    const level = this.musicLevel();
    if (level <= 0) return;
    const g = this.musicBus.gain;
    const t = this.ctx.currentTime;
    const low = Math.max(SILENT, level * DUCK_LEVEL);
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(SILENT, g.value), t);
    g.exponentialRampToValueAtTime(low, t + 0.03);
    g.setValueAtTime(low, t + DUCK_HOLD);
    g.exponentialRampToValueAtTime(Math.max(SILENT, level), t + DUCK_HOLD + DUCK_RELEASE);
  }

  /**
   * Camada de tensão: com 1–2 corações de alguém, entram hi-hats rápidos, o passa-baixa
   * abre para 4500 Hz e a música acelera um pouco. Sai do mesmo jeito, suave.
   */
  setTension(on) {
    const next = Boolean(on);
    if (next === this.tension) return;
    this.tension = next;
    if (this.warmth) {
      const t = this.ctx.currentTime;
      const f = this.warmth.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(f.value, t);
      f.setTargetAtTime(this.cutoffNow(), t, 0.25);
    }
  }

  /** Corte do passa-baixa da saída agora: quente, aberto na tensão, ou o da faixa elétrica tocando. */
  cutoffNow() {
    const base = this.tension ? TENSE_CUTOFF : WARM_CUTOFF;
    const track = this.isPlayingMusic ? TRACKS[this.seq?.name] : null;
    return Math.max(base, track?.cutoff ?? 0);
  }

  /** Leva o passa-baixa para o corte da faixa (a elétrica dos chefes abre o som). */
  applyCutoff() {
    if (!this.warmth) return;
    const t = this.ctx.currentTime;
    const f = this.warmth.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.setTargetAtTime(this.cutoffNow(), t, 0.3);
  }

  // --- VOZES (polifonia limitada e limpeza de nós) ---

  /** Vozes que ainda soam (as que já acabaram são desmontadas aqui, caso o `onended` não chegue). */
  liveVoices() {
    const now = this.ctx.currentTime;
    for (const v of [...this.voices]) if (v.end < now - 0.25) this.cleanup(v);
    return this.voices.filter((v) => v.end > now);
  }

  /**
   * Vozes que ocupam vaga agora. Uma voz cortada só sai da conta no fade final de 15 ms;
   * a nota do baixo/piano que vai ser cortada lá na frente (quando a próxima entrar) continua
   * contando até lá, porque ainda está soando.
   */
  soundingVoices() {
    const now = this.ctx.currentTime;
    return this.liveVoices().filter((v) => !(v.released && v.end <= now + 0.03));
  }

  /**
   * Trecho em que a voz ocupa vaga: do início até o corte (`cutAt`, quando cortada; depois
   * dele só sobra o fade de 15 ms do gate) ou até o `stop` menos 20 ms (a cauda já muda do
   * envelope, igual ao fade de quem é cortado).
   */
  span(v) {
    return [v.born, v.released ? v.cutAt : v.end - 0.02];
  }

  /** Vozes que soam em algum ponto de [from, to) (com 1 µs de folga contra arredondamento). */
  overlapping(from, to) {
    return this.liveVoices().filter((v) => {
      const [a, b] = this.span(v);
      return a < to - 1e-6 && b > from + 1e-6;
    });
  }

  /**
   * Pico de fontes (osciladores e ruído) soando juntas, de agora em diante: é isso que pesa no
   * áudio do iOS. Conta também as notas já agendadas pelo sequenciador (o "lookahead"), cada
   * uma no seu trecho; uma nota que acaba antes da próxima começar não soma com ela.
   */
  liveCost() {
    const now = this.ctx.currentTime;
    const events = [];
    for (const v of this.liveVoices()) {
      const [a, b] = this.span(v);
      const start = Math.max(a, now);
      if (b <= start + 1e-6) continue; // já acabou, ou foi cortada antes de começar
      events.push([start, v.cost], [b, -v.cost]);
    }
    events.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    let current = 0;
    let peak = 0;
    for (const [, delta] of events) {
      current += delta;
      peak = Math.max(peak, current);
    }
    return peak;
  }

  /**
   * Cria uma voz: fontes → nós de `build(env)` → env (envelope da nota) → gate → barramento.
   * O gate é um ganho só para cortar a voz sem mexer no envelope (cancelar uma rampa no meio
   * faz o Safari pular de volume). Estourou a polifonia: corta a menos importante e mais velha.
   * Patch 0.8.2: a conta é feita no trecho em que a nova voz vai soar (não no "agora"), e a
   * cortada sai no instante em que a nova entra. Antes, a nota agendada lá na frente cortava
   * na hora as que estavam tocando e a faixa rápida dos chefes ficava com buracos de silêncio.
   * `mono`: só uma por grupo (baixo, piano): a nova corta a anterior no instante em que entra.
   * `offset`: ponto de partida das fontes de buffer (ruído).
   */
  spawn({ at, end, bus, priority, mono = null, offset = 0, build }) {
    if (mono) this.release(this.voices.find((v) => v.mono === mono && !v.released), at);
    const gate = this.ctx.createGain();
    gate.gain.value = 1;
    gate.connect(bus);
    const env = this.ctx.createGain();
    env.gain.value = 0;
    env.connect(gate);
    const { sources, nodes = [] } = build(env);
    // cada fonte conta como uma voz: abre espaço cortando as menos importantes e mais velhas
    const cost = Math.min(sources.length, MAX_VOICES);
    const from = Math.max(at, this.ctx.currentTime);
    const to = end - 0.02;
    for (;;) {
      const live = this.overlapping(from, to);
      if (live.reduce((sum, v) => sum + v.cost, 0) + cost <= MAX_VOICES) break;
      // cortável: ainda não cortada, ou cortada para mais tarde do que a entrada da nova
      const candidates = live.filter((v) => !v.released || v.cutAt > from + 1e-6);
      if (!candidates.length) break;
      const victim = candidates.reduce((a, b) => (b.priority < a.priority || (b.priority === a.priority && b.born < a.born) ? b : a));
      // nota da trilha não derruba outra mais importante (Patch 0.9.0): o chimbal fica de
      // fora em vez de cortar o pad ou o baixo
      if (priority < PRIORITY.voice && victim.priority > priority) {
        for (const src of sources) src.disconnect();
        for (const node of nodes) node.disconnect();
        env.disconnect();
        gate.disconnect();
        return null;
      }
      this.release(victim, from);
    }
    const voice = { env, gate, sources, nodes, end, priority, mono, cost, born: at, done: false, released: false, cutAt: null };
    let pending = sources.length;
    for (const src of sources) {
      src.onended = () => {
        pending -= 1;
        if (pending <= 0) this.cleanup(voice);
      };
      if (offset && src.buffer) src.start(at, offset);
      else src.start(at);
      src.stop(end);
    }
    this.voices.push(voice);
    return voice;
  }

  /** Corta uma voz em `when` (agora, por padrão) com fade de 15 ms e libera a vaga na polifonia. */
  release(voice, when = null) {
    if (!voice || voice.done) return;
    const t = Math.max(this.ctx.currentTime, when ?? 0);
    // já cortada: só adianta o corte (a polifonia pode precisar da vaga antes)
    if (voice.released && voice.cutAt <= t) return;
    const g = voice.gate.gain;
    if (voice.released) g.cancelScheduledValues(t);
    voice.released = true;
    voice.cutAt = t;
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0, t + 0.015);
    const stopAt = Math.min(voice.end, t + 0.02);
    for (const src of voice.sources) {
      try {
        src.stop(stopAt);
      } catch {
        // navegadores antigos não aceitam um 2º stop: o stop original continua valendo
      }
    }
    voice.end = stopAt;
  }

  /** Fim da nota: .stop(), .disconnect() de todos os nós e referências zeradas. */
  cleanup(voice) {
    if (voice.done) return;
    voice.done = true;
    for (const src of voice.sources) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        // já parada
      }
      src.disconnect();
    }
    for (const node of voice.nodes) node.disconnect();
    voice.env.disconnect();
    voice.gate.disconnect();
    voice.sources = [];
    voice.nodes = [];
    voice.env = null;
    voice.gate = null;
    this.voices = this.voices.filter((v) => v !== voice);
  }

  /** Corta todas as vozes (mudo, troca de faixa). `onlyMusic`: deixa os efeitos terminarem. */
  releaseAll(onlyMusic = false) {
    for (const v of [...this.voices]) if (!onlyMusic || v.priority < PRIORITY.voice) this.release(v);
  }

  /** Notas com atraso maior que um tique saem por timer: não ocupam vaga na polifonia antes de soar. */
  later(delay, fn) {
    if (delay <= 0.03) {
      fn(Math.max(0, delay));
      return;
    }
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (!this.isMuted && this.ready()) fn(0);
    }, delay * 1000);
    this.timers.add(id);
  }

  clearTimers() {
    this.timers.forEach((id) => clearTimeout(id));
    this.timers.clear();
  }

  /** Nota curta com envelope percussivo. `delay` em segundos. */
  tone({ type = 'sine', freq, freqEnd, peak = 0.3, dur = 0.15, attack = 0.004, delay = 0, priority = PRIORITY.sfx, partials = null }) {
    if (this.isMuted || !this.ready()) return;
    this.later(delay, (d) => {
      const at = this.ctx.currentTime + 0.005 + d;
      const end = at + attack + dur + 0.03;
      this.spawn({
        at,
        end,
        bus: this.sfxBus,
        priority,
        build: (env) => {
          const g = env.gain;
          g.setValueAtTime(SILENT, at);
          g.exponentialRampToValueAtTime(Math.max(2 * SILENT, this.sfxVolume * peak), at + attack);
          g.exponentialRampToValueAtTime(SILENT, at + attack + dur);
          // parciais (ex.: sino) somam no mesmo envelope: uma voz só
          const sources = (partials ?? [[1, 1]]).map(([ratio, amp]) => {
            const osc = this.ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq * ratio, at);
            if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd * ratio, at + attack + dur);
            if (amp === 1) {
              osc.connect(env);
              return { osc, gain: null };
            }
            const pg = this.ctx.createGain();
            pg.gain.value = amp;
            osc.connect(pg);
            pg.connect(env);
            return { osc, gain: pg };
          });
          return { sources: sources.map((s) => s.osc), nodes: sources.map((s) => s.gain).filter(Boolean) };
        },
      });
    });
  }

  noiseSource() {
    if (!this.noiseBuffer) {
      const length = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    return src;
  }

  /** Estalo de ruído filtrado (osso, papel, metal, prato). */
  noise({ freq = 2000, filter = 'bandpass', q = 1.2, peak = 0.3, dur = 0.05, attack = 0.001, delay = 0, priority = PRIORITY.sfx, bus = null, level = null }) {
    if (this.isMuted || !this.ready()) return;
    this.later(delay, (d) => {
      const at = this.ctx.currentTime + 0.005 + d;
      this.noiseAt({ at, freq, filter, q, peak: (level ?? this.sfxVolume) * peak, dur, attack, priority, bus: bus ?? this.sfxBus });
    });
  }

  noiseAt({ at, freq, filter, q, peak, dur, attack, priority, bus }) {
    const end = at + attack + dur + 0.03;
    this.spawn({
      at,
      end,
      bus,
      priority,
      offset: Math.random() * 0.4, // começa num ponto aleatório do buffer: cada estalo soa diferente
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(Math.max(2 * SILENT, peak), at + attack);
        g.exponentialRampToValueAtTime(SILENT, at + attack + dur);
        const src = this.noiseSource();
        const f = this.ctx.createBiquadFilter();
        f.type = filter;
        f.frequency.value = freq;
        f.Q.value = q;
        src.connect(f);
        f.connect(env);
        return { sources: [src], nodes: [f] };
      },
    });
  }

  // --- 1. VOZES DOS RIVAIS (ANIMALESE) ---

  playVoiceBlip(character = 'tioZe') {
    if (this.isMuted || !this.ready()) return;
    const profile = voiceProfile(character);
    const jitter = (Math.random() - 0.5) * profile.mod;
    const freq = profile.baseFreq + jitter;
    this.duck();
    this.tone({
      type: profile.type,
      freq,
      freqEnd: Math.max(40, profile.baseFreq - 20 + jitter),
      peak: 0.32,
      dur: 0.075,
      attack: 0.004,
      priority: PRIORITY.voice,
    });
  }

  /**
   * Fala com cadência humana. `onCharCallback(textoAtéAqui)` a cada letra (máquina de escrever);
   * devolve uma função que corta a fala. Uma fala nova corta a anterior e, com o som desligado,
   * o texto continua aparecendo (sem os blips).
   */
  speakPhrase(phrase, character = 'tioZe', onCharCallback = null) {
    this.stopSpeech?.();
    const { speed } = voiceProfile(character);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= phrase.length) {
        clearInterval(interval);
        return;
      }
      const char = phrase[i];
      if (!SILENT_CHARS.has(char)) this.playVoiceBlip(character);
      if (onCharCallback) onCharCallback(phrase.substring(0, i + 1));
      i++;
    }, speed);
    const stop = () => {
      clearInterval(interval);
      if (this.stopSpeech === stop) this.stopSpeech = null;
    };
    this.stopSpeech = stop;
    return stop;
  }

  // --- 2. PEDRAS NA MESA ---

  /**
   * Batida de pedra em dois estágios simultâneos: o clique seco de osso/marfim (800 Hz, 15 ms)
   * e o baque oco da madeira da mesa (120 Hz, 80 ms), com pitch ±5% a cada jogada.
   * Bucha bate mais grave e mais forte. Pedra de grife soma o timbre dela.
   */
  playTileSlam(isDouble = false, enhancement = null) {
    if (this.isMuted || !this.ready()) return;
    this.duck();
    const j = 1 + (Math.random() - 0.5) * 0.1;
    const weight = isDouble ? 1.25 : 1;
    // osso/marfim: tom curtíssimo + estalo filtrado no mesmo ponto
    this.tone({ type: 'triangle', freq: 800 * j, peak: 0.34 * weight, dur: 0.015, attack: 0.001 });
    this.noise({ freq: 800 * j * 2.2, q: 2.2, peak: 0.42 * weight, dur: 0.015 });
    // madeira oca: 120 Hz descendo, com o corpo do tampo
    this.tone({ type: 'triangle', freq: 120 * j * (isDouble ? 0.85 : 1), freqEnd: 72 * j, peak: 0.95 * weight, dur: 0.08, attack: 0.002 });

    const enh = ENHANCEMENT_ALIASES[enhancement] ?? enhancement;
    if (enh === 'gold') this.playGoldTinkle();
    if (enh === 'crystal') this.playCrystalBell();
    if (enh === 'ruby') this.playRubySub();
    if (enh === 'lead') this.playAnvil();
    if (enh === 'ghost') this.playGhostSigh();
  }

  /** Pedra assentando na mesa (sua ou do rival). */
  playBoneSlam(isDouble = false, enhancement = null) {
    this.playTileSlam(isDouble, enhancement);
  }

  /** Nome antigo (Patch 0.4): o pouso da pedra do rival. */
  playAiSlam(isDouble = false, enhancement = null) {
    this.playBoneSlam(isDouble, enhancement);
  }

  /** Ouro: tilintar cristalino suave (moedinhas de vidro). */
  playGoldTinkle() {
    this.tone({ freq: 2637, peak: 0.07, dur: 0.45, attack: 0.006, delay: 0.03 });
    this.tone({ freq: 3520, peak: 0.05, dur: 0.38, attack: 0.006, delay: 0.1 });
    this.tone({ freq: 3951, peak: 0.035, dur: 0.3, attack: 0.006, delay: 0.17 });
  }

  /** Rubi: sub-grave quente que incha e some (com um harmônico para o alto-falante do iPhone). */
  playRubySub() {
    this.tone({ type: 'triangle', freq: 55, freqEnd: 46, peak: 0.65, dur: 0.6, attack: 0.05 });
  }

  /** Cristal: sino com eco (parciais inarmônicos e um delay com realimentação, desmontado no fim). */
  playCrystalBell() {
    if (this.isMuted || !this.ready()) return;
    const at = this.ctx.currentTime + 0.01;
    const ring = 0.9;
    const tail = 0.75; // os ecos
    this.spawn({
      at,
      end: at + ring + tail,
      bus: this.sfxBus,
      priority: PRIORITY.sfx,
      build: (env) => {
        // Patch 0.9.3: com os efeitos em 0% a rampa exponencial não aceita zero
        const peak = Math.max(2 * SILENT, this.sfxVolume * 0.13);
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(peak, at + 0.004);
        g.exponentialRampToValueAtTime(SILENT, at + ring);
        const sources = [];
        const nodes = [];
        for (const [ratio, amp] of [
          [1, 1],
          [2.76, 0.45],
          [5.4, 0.2],
        ]) {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 1568 * ratio;
          const pg = this.ctx.createGain();
          pg.gain.value = amp;
          osc.connect(pg);
          pg.connect(env);
          sources.push(osc);
          nodes.push(pg);
        }
        // eco do sino: a nota já com envelope entra num delay realimentado (cada volta 38% mais baixa)
        // e sai por um ganho próprio, que fecha no fim da cauda para não sobrar nada circulando
        const delay = this.ctx.createDelay(1);
        delay.delayTime.value = 0.19;
        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.38;
        const echoOut = this.ctx.createGain();
        echoOut.gain.setValueAtTime(0.55, at);
        echoOut.gain.setValueAtTime(0.55, at + ring);
        echoOut.gain.exponentialRampToValueAtTime(SILENT, at + ring + tail);
        env.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(echoOut);
        echoOut.connect(this.sfxBus);
        nodes.push(delay, feedback, echoOut);
        return { sources, nodes };
      },
    });
  }

  /** Chumbo: ferro de bigorna (parciais metálicos). */
  playAnvil() {
    [
      [523, 0.3, 0.9],
      [1444, 0.18, 0.6],
      [2825, 0.1, 0.4],
    ].forEach(([freq, peak, dur]) => this.tone({ type: 'triangle', freq, peak, dur }));
    this.noise({ freq: 3500, filter: 'highpass', peak: 0.35, dur: 0.03 });
  }

  /** Fantasma: sopro espectral subindo. */
  playGhostSigh() {
    this.tone({ type: 'sine', freq: 660, freqEnd: 990, peak: 0.12, dur: 0.45, attack: 0.1 });
    this.noise({ freq: 1200, peak: 0.12, dur: 0.4, attack: 0.08, q: 4 });
  }

  // --- 3. TRILHA ADAPTATIVA (sequenciador com antecedência) ---

  playTrack(trackName = 'botecoJazz') {
    // guarda a faixa mesmo com o som desligado (desmutar volta nela)
    this.currentTrack = trackName;
    if (this.isMuted || !this.init()) return;
    const name = TRACKS[trackName] ? trackName : 'botecoJazz';
    if (this.isPlayingMusic && this.seq?.name === name) return;
    this.stopMusic();
    this.isPlayingMusic = true;
    const t = this.ctx.currentTime;
    const start = Math.max(t + 0.08, this.musicHoldUntil);
    this.seq = { name, step: 0, next: start };
    this.applyCutoff();
    // entrada limpa: a trilha nova sobe do silêncio
    const g = this.musicBus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(SILENT, t);
    g.setValueAtTime(SILENT, start);
    g.exponentialRampToValueAtTime(Math.max(SILENT, this.musicVolume * TRACKS[name].level), start + 0.6);
    this.seqTimer = setInterval(() => this.tick(), TICK_MS);
  }

  tick() {
    const { ctx, seq } = this;
    if (!seq || !this.isPlayingMusic || this.isMuted) return;
    const now = ctx.currentTime;
    // áudio travado (iOS em segundo plano): nada acumula, retoma do agora
    if (ctx.state !== 'running') {
      seq.next = Math.max(seq.next, now + 0.05);
      return;
    }
    if (seq.next < now - 0.05) seq.next = now + 0.02;
    const track = TRACKS[seq.name];
    const tempo = this.tension ? TENSION_TEMPO : 1;
    while (seq.next < now + LOOKAHEAD) {
      this.scheduleStep(track, seq.step, seq.next, tempo);
      seq.next += stepDuration(track, seq.step, tempo);
      seq.step += 1;
    }
  }

  scheduleStep(track, step, at, tempo) {
    const beat = step % 16;
    const bar = Math.floor(step / 16);
    const chord = track.chords[bar % track.chords.length];
    const kit = KITS[track.style] ?? KITS.classic;
    const bass = track.bass[beat];
    if (bass !== undefined) {
      if (kit.bass === 'saw') this.sawBass(chord.root + bass, at, beat % 4 === 0 ? 1 : 0.78, kit.bassOpts);
      else this.bassNote(chord.root + bass, at, beat === 0 ? 1 : 0.8);
    }
    const comp = track.comp[beat];
    if (comp) {
      const vel = beat === 0 ? 1 : 0.8;
      if (kit.comp === 'power') this.powerChord(chord.ep, at, comp / tempo, vel, kit.compOpts);
      else if (kit.comp === 'organ') this.organChord(chord.ep, at, comp / tempo, vel);
      else if (kit.comp === 'pad') this.padChord(chord.ep, at, comp / tempo, vel);
      else this.epChord(chord.ep, at, comp / tempo, beat === 0 ? 1 : 0.78);
    }
    const lead = track.lead?.[beat];
    if (lead !== undefined) {
      // número: intervalo a partir da fundamental; [i, oitava]: a i-ésima nota do acorde
      const note = Array.isArray(lead) ? chord.ep[lead[0] % chord.ep.length] + lead[1] : chord.root + lead;
      const vel = beat % 8 === 0 ? 1 : 0.8;
      if (kit.lead === 'cuica') this.cuica(note, at, vel);
      else if (kit.lead === 'glass') this.glassNote(note, at, vel);
      else this.leadNote(note, at, vel);
    }
    if (track.kick.includes(beat)) this.kick(at, kit.kick);
    if (track.snare?.includes(beat)) this.snare(at, kit.snare);
    if (track.rim.includes(beat)) this.rim(at);
    const bell = track.bells?.[beat];
    if (bell) this.agogo(at, bell === 'h');
    if (track.clank?.includes(beat)) this.clank(at);
    if (track.toll && beat === 0 && bar % track.toll === 0) this.toll(chord.root + 24, at);
    if (track.brush?.includes(beat)) this.drum({ at, freq: 4200, filter: 'bandpass', q: 0.7, peak: 0.08, dur: 0.16, attack: 0.03 });
    if (track.hats) {
      this.hat(track.hats, beat, at);
      return;
    }
    // camada de tensão: hi-hats em semicolcheias, acento no contratempo e um aberto no fim do compasso
    if (this.tension) {
      const open = beat === 14;
      const accent = beat % 4 === 2;
      this.drum({ at, freq: 8200, filter: 'highpass', q: 0.8, peak: open ? 0.16 : accent ? 0.13 : 0.07, dur: open ? 0.12 : 0.028 });
    }
  }

  /**
   * Chimbal das faixas dos chefes: `mode` diz em que passos ele toca (ver TRACKS). Acento no
   * contratempo, aberto no fim do compasso; na tensão (alguém com 1 ou 2 corações) ele sobe.
   */
  hat(mode, beat, at) {
    const on = mode === '8' ? beat % 2 === 0 : mode === 'off' ? beat % 4 === 2 : true;
    if (!on) return;
    const boost = this.tension ? 1.25 : 1;
    if (mode === 'shaker') {
      // ganzá: ruído agudo mais macio, acento no 2º de cada grupo de 4
      this.drum({ at, freq: 6200, filter: 'bandpass', q: 1.4, peak: (beat % 4 === 2 ? 0.1 : 0.05) * boost, dur: 0.03, attack: 0.008, priority: MUSIC.hat });
      return;
    }
    const open = beat === 14;
    const accent = beat % 4 === 2;
    this.drum({ at, freq: 9000, filter: 'highpass', q: 0.9, peak: (open ? 0.15 : accent ? 0.12 : 0.065) * boost, dur: open ? 0.14 : 0.024, priority: MUSIC.hat });
  }

  /** Contrabaixo acústico: corpo triangular + oitava, ataque de dedo e decay natural (mono). */
  bassNote(note, at, vel) {
    const freq = midi(note);
    const dur = 0.55;
    this.spawn({
      at,
      end: at + dur + 0.05,
      bus: this.musicBus,
      priority: MUSIC.bass,
      mono: 'bass',
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(0.55 * vel, at + 0.006);
        g.exponentialRampToValueAtTime(0.28 * vel, at + 0.09);
        g.exponentialRampToValueAtTime(SILENT, at + dur);
        // triangular: os harmônicos ímpares fazem o baixo aparecer até no alto-falante do celular
        const body = this.ctx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(freq * 1.012, at);
        body.frequency.exponentialRampToValueAtTime(freq, at + 0.04); // a corda assenta
        const tone = this.ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.Q.value = 2.2; // o "tum" de madeira da caixa do contrabaixo
        tone.frequency.setValueAtTime(1600, at);
        tone.frequency.exponentialRampToValueAtTime(380, at + 0.18);
        body.connect(tone);
        tone.connect(env);
        return { sources: [body], nodes: [tone] };
      },
    });
  }

  /**
   * Piano elétrico: uma senoide por nota (até 3) com tremolo suave. O tremolo é automação
   * no ganho (rampas a 5,2 Hz), não um oscilador LFO: sobra polifonia para os efeitos.
   */
  epChord(notes, at, dur, vel) {
    const tail = dur + 0.22;
    this.spawn({
      at,
      end: at + tail + 0.03,
      bus: this.musicBus,
      priority: MUSIC.harmony,
      mono: 'ep',
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(0.16 * vel, at + 0.012);
        g.exponentialRampToValueAtTime(0.09 * vel, at + dur * 0.5);
        g.exponentialRampToValueAtTime(SILENT, at + tail);
        const trem = this.ctx.createGain();
        const half = 1 / 5.2 / 2;
        trem.gain.setValueAtTime(1, at);
        for (let t = half, up = false; t < tail; t += half, up = !up) trem.gain.linearRampToValueAtTime(up ? 1 : 0.68, at + t);
        trem.connect(env);
        const sources = notes.slice(0, 3).map((n) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = midi(n);
          osc.connect(trem);
          return osc;
        });
        return { sources, nodes: [trem] };
      },
    });
  }

  /** Bumbo (ver KICKS): 'soft' do boteco, 'hard' do pedal duplo, 'surdo', 'iron' e 'heart'. */
  kick(at, kind = 'soft') {
    const [from, to, fall, peak, dur] = KICKS[kind] ?? KICKS.soft;
    this.spawn({
      at,
      end: at + dur + 0.03,
      bus: this.musicBus,
      priority: MUSIC.kick,
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(peak, at + 0.003);
        g.exponentialRampToValueAtTime(SILENT, at + dur);
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(from, at);
        osc.frequency.exponentialRampToValueAtTime(to, at + fall);
        osc.connect(env);
        return { sources: [osc] };
      },
    });
  }

  /** Saturação compartilhada (criada uma vez); sem WaveShaper (navegador antigo), passa direto. */
  driveNode(amount = 28) {
    if (typeof this.ctx.createWaveShaper !== 'function') return null;
    this.driveShapes = this.driveShapes ?? {};
    this.driveShapes[amount] = this.driveShapes[amount] ?? driveCurve(amount);
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.driveShapes[amount];
    shaper.oversample = 'none';
    return shaper;
  }

  /**
   * Baixo de serra dos chefes: filtro ressonante abrindo e fechando a cada nota e saturação
   * (mono). `opts` (KITS): `drive` (quanto satura), `from`/`to` (varredura do filtro), `q`,
   * `dur` e `peak`.
   */
  sawBass(note, at, vel, opts = KITS.electric.bassOpts) {
    const { drive: amount = 28, from = 2400, to = 320, q = 7, dur = 0.17, peak = 0.42 } = opts;
    const freq = midi(note);
    this.spawn({
      at,
      end: at + dur + 0.04,
      bus: this.musicBus,
      priority: MUSIC.bass,
      mono: 'bass',
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(peak * vel, at + 0.004);
        g.exponentialRampToValueAtTime(peak * 0.48 * vel, at + 0.07);
        g.exponentialRampToValueAtTime(SILENT, at + dur);
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const tone = this.ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.Q.value = q;
        tone.frequency.setValueAtTime(from, at);
        tone.frequency.exponentialRampToValueAtTime(to, at + dur * 0.7);
        osc.connect(tone);
        const drive = this.driveNode(amount);
        if (drive) {
          tone.connect(drive);
          drive.connect(env);
        } else tone.connect(env);
        return { sources: [osc], nodes: drive ? [tone, drive] : [tone] };
      },
    });
  }

  /** Power chord distorcido (fundamental + quinta, 2 vozes), curto e seco (mono). `opts`: KITS. */
  powerChord(notes, at, dur, vel, opts = KITS.electric.compOpts) {
    const { drive: amount = 28, lp = 3200, peak = 0.13 } = opts;
    const tail = dur + 0.06;
    this.spawn({
      at,
      end: at + tail + 0.03,
      bus: this.musicBus,
      priority: MUSIC.harmony,
      mono: 'ep',
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(peak * vel, at + 0.006);
        g.exponentialRampToValueAtTime(peak * 0.54 * vel, at + dur * 0.6);
        g.exponentialRampToValueAtTime(SILENT, at + tail);
        const tone = this.ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.Q.value = 1.2;
        tone.frequency.value = lp;
        const drive = this.driveNode(amount);
        if (drive) {
          drive.connect(tone);
        }
        tone.connect(env);
        const sources = notes.slice(0, 2).map((n, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = midi(n);
          osc.detune.value = i ? 7 : -7;
          osc.connect(drive ?? tone);
          return osc;
        });
        return { sources, nodes: drive ? [drive, tone] : [tone] };
      },
    });
  }

  /** Arpejo elétrico: onda quadrada com um "bend" curto para baixo, filtrada e seca (mono). */
  leadNote(note, at, vel) {
    const freq = midi(note);
    const dur = 0.11;
    this.spawn({
      at,
      end: at + dur + 0.03,
      bus: this.musicBus,
      priority: MUSIC.lead,
      mono: 'lead',
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(0.075 * vel, at + 0.004);
        g.exponentialRampToValueAtTime(SILENT, at + dur);
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq * 1.03, at);
        osc.frequency.exponentialRampToValueAtTime(freq, at + 0.02);
        const tone = this.ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.Q.value = 3;
        tone.frequency.setValueAtTime(3600, at);
        tone.frequency.exponentialRampToValueAtTime(1400, at + dur);
        osc.connect(tone);
        tone.connect(env);
        return { sources: [osc], nodes: [tone] };
      },
    });
  }

  /** Caixa (ver SNARES): o estalo da elétrica, a palma do samba e do ritual, a pancada do ferro. */
  snare(at, kind = 'crack') {
    const [freq, q, peak, dur] = SNARES[kind] ?? SNARES.crack;
    this.drum({ at, freq, filter: 'bandpass', q, peak, dur, attack: 0.001, priority: MUSIC.snare });
  }

  /** Aro da caixa (bossa): estalo de madeira curto. */
  rim(at) {
    this.drum({ at, freq: 1900, filter: 'bandpass', q: 3, peak: 0.16, dur: 0.025, priority: MUSIC.bell });
  }

  drum({ at, freq, filter, q, peak, dur, attack = 0.001, priority = PRIORITY.music }) {
    this.noiseAt({ at, freq, filter, q, peak, dur, attack, priority, bus: this.musicBus });
  }

  /** Uma voz curta de música com um oscilador, filtro opcional e envelope percussivo. */
  musicTone({ at, type, freq, glide = null, peak, dur, attack = 0.004, filter = null, priority, mono = null }) {
    this.spawn({
      at,
      end: at + attack + dur + 0.03,
      bus: this.musicBus,
      priority,
      mono,
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(peak, at + attack);
        g.exponentialRampToValueAtTime(SILENT, at + attack + dur);
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(glide ? freq * glide[0][0] : freq, at);
        for (const [ratio, t] of glide ?? []) osc.frequency.exponentialRampToValueAtTime(freq * ratio, at + t);
        if (!filter) {
          osc.connect(env);
          return { sources: [osc] };
        }
        const f = this.ctx.createBiquadFilter();
        f.type = filter.type;
        f.frequency.value = filter.freq;
        f.Q.value = filter.q ?? 1;
        osc.connect(f);
        f.connect(env);
        return { sources: [osc], nodes: [f] };
      },
    });
  }

  /** Órgão do samba-rock: duas quadradas (a 1ª e a última nota do acorde) filtradas, em stab (mono). */
  organChord(notes, at, dur, vel) {
    const tail = dur + 0.05;
    const pick = [notes[0], notes[notes.length - 1]];
    this.spawn({
      at,
      end: at + tail + 0.03,
      bus: this.musicBus,
      priority: MUSIC.harmony,
      mono: 'ep',
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(0.075 * vel, at + 0.008);
        g.setValueAtTime(0.06 * vel, at + Math.max(0.02, dur));
        g.exponentialRampToValueAtTime(SILENT, at + tail);
        const tone = this.ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.frequency.value = 1900;
        tone.Q.value = 1.4;
        tone.connect(env);
        const sources = pick.map((n, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.value = midi(n);
          osc.detune.value = i ? 4 : -4;
          osc.connect(tone);
          return osc;
        });
        return { sources, nodes: [tone] };
      },
    });
  }

  /** Pad do ritual: duas serras desafinadas que respiram o compasso (filtro abre e fecha) (mono). */
  padChord(notes, at, dur, vel) {
    const tail = dur + 0.35;
    const pick = [notes[0], notes[notes.length - 1]];
    this.spawn({
      at,
      end: at + tail + 0.03,
      bus: this.musicBus,
      priority: MUSIC.harmony,
      mono: 'ep',
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(0.07 * vel, at + 0.35);
        g.setValueAtTime(0.07 * vel, at + dur * 0.7);
        g.exponentialRampToValueAtTime(SILENT, at + tail);
        const tone = this.ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.Q.value = 3;
        tone.frequency.setValueAtTime(320, at);
        tone.frequency.exponentialRampToValueAtTime(1500, at + dur * 0.55);
        tone.frequency.exponentialRampToValueAtTime(420, at + tail);
        tone.connect(env);
        const sources = pick.map((n, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = midi(n);
          osc.detune.value = i ? 11 : -11;
          osc.connect(tone);
          return osc;
        });
        return { sources, nodes: [tone] };
      },
    });
  }

  /** Cuíca: o "uí" do samba, uma senoide que sobe e cai rápido (mono). */
  cuica(note, at, vel) {
    this.musicTone({ at, type: 'triangle', freq: midi(note), glide: [[0.72, 0], [1.22, 0.06], [0.9, 0.17]], peak: 0.085 * vel, dur: 0.17, attack: 0.012, priority: MUSIC.lead, mono: 'lead' });
  }

  /** Arpejo de vidro do ritual: triangular limpa com cauda (mono). */
  glassNote(note, at, vel) {
    this.musicTone({ at, type: 'triangle', freq: midi(note), peak: 0.06 * vel, dur: 0.3, filter: { type: 'lowpass', freq: 3800, q: 0.7 }, priority: MUSIC.lead, mono: 'lead' });
  }

  /** Agogô: sino de metal alto ou baixo (quadrada num passa-banda estreito). */
  agogo(at, high) {
    this.musicTone({ at, type: 'square', freq: high ? 1046.5 : 784, peak: 0.055, dur: 0.09, attack: 0.002, filter: { type: 'bandpass', freq: high ? 2100 : 1600, q: 5 }, priority: MUSIC.bell });
  }

  /** Batida de ferro (Ferro-Velho): duas parciais inarmônicas num passa-banda, como chapa velha. */
  clank(at) {
    this.spawn({
      at,
      end: at + 0.3,
      bus: this.musicBus,
      priority: MUSIC.bell,
      build: (env) => {
        const g = env.gain;
        g.setValueAtTime(SILENT, at);
        g.exponentialRampToValueAtTime(0.09, at + 0.002);
        g.exponentialRampToValueAtTime(SILENT, at + 0.26);
        const band = this.ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 1500;
        band.Q.value = 1.6;
        band.connect(env);
        const sources = [392, 1082].map((freq) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq * 1.02, at);
          osc.frequency.exponentialRampToValueAtTime(freq, at + 0.04);
          osc.connect(band);
          return osc;
        });
        return { sources, nodes: [band] };
      },
    });
  }

  /** Sino grave do ritual: uma triangular que cai devagar, com um leve desafinar no começo. */
  toll(note, at) {
    this.musicTone({ at, type: 'triangle', freq: midi(note), glide: [[1.01, 0], [1, 0.25]], peak: 0.12, dur: 1.3, attack: 0.004, filter: { type: 'lowpass', freq: 2200, q: 0.8 }, priority: MUSIC.toll });
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.seqTimer) {
      clearInterval(this.seqTimer);
      this.seqTimer = null;
    }
    this.seq = null;
    if (this.ctx) this.releaseAll(true);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    writeMuted(this.isMuted);
    if (this.isMuted) {
      this.stopMusic();
      this.stopSpeech?.();
      this.clearTimers();
      if (this.ctx) this.releaseAll();
    } else {
      this.playTrack(this.currentTrack ?? 'botecoJazz');
    }
    return this.isMuted;
  }

  // --- 4. OS OUTROS SONS DO JOGO ---

  playCoinJingle() {
    this.tone({ freq: 987.77, peak: 0.28, dur: 0.08 }); // B5
    this.tone({ freq: 1318.51, peak: 0.3, dur: 0.24, delay: 0.08 }); // E6
  }

  /**
   * Seu Tião das Moedas (Patch 0.6.1): cada moeda que cai no contador dá um "tim" metálico,
   * um semitom acima da anterior (o som cresce com a pilha). Duas parciais inarmônicas
   * (o timbre de metal) e nada mais: com as moedas espaçadas, cabe no orçamento de vozes.
   */
  playCoinTing(step = 0) {
    const freq = 880 * 2 ** (Math.min(step, 18) / 12);
    this.tone({ type: 'triangle', freq, peak: 0.16 + Math.min(step, 12) * 0.006, dur: 0.09, attack: 0.002 });
    this.tone({ freq: freq * 2.76, peak: 0.05, dur: 0.06, attack: 0.001 });
  }

  /** Nome antigo do cristal (Patch 0.4). */
  playGlassPing() {
    this.playCrystalBell();
  }

  /** Nome antigo do rubi (Patch 0.4). */
  playDeepBassDrop() {
    this.playRubySub();
  }

  /**
   * Clique mecânico de gatilho (Patch 0.5.5): o estalo metálico da placa afundando e o
   * "toc" da trava. Toques repetidos em menos de 60 ms viram um só (o App toca o clique em
   * todo botão e alguns botões também chamam playClick no próprio handler).
   */
  playClick() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - (this.lastClickAt ?? -1e9) < 60) return;
    this.lastClickAt = now;
    this.noise({ freq: 3400, filter: 'highpass', q: 0.8, peak: 0.22, dur: 0.012 });
    this.tone({ type: 'square', freq: 1900, freqEnd: 900, peak: 0.05, dur: 0.008, attack: 0.001 });
    this.tone({ type: 'triangle', freq: 210, freqEnd: 120, peak: 0.22, dur: 0.035, attack: 0.001, delay: 0.012 });
  }

  /**
   * Virar a página (Patch 0.9.3: livro, caderno, lousa): o papel arrastando (ruído que sobe de
   * grave para agudo), a borda estalando e a folha assentando de leve.
   */
  playPageTurn() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - (this.lastPageAt ?? -1e9) < 90) return;
    this.lastPageAt = now;
    this.noise({ freq: 1800, filter: 'bandpass', q: 0.7, peak: 0.16, dur: 0.1, attack: 0.025 });
    this.noise({ freq: 5200, filter: 'highpass', q: 0.6, peak: 0.08, dur: 0.045, delay: 0.06 });
    this.tone({ type: 'triangle', freq: 170, freqEnd: 110, peak: 0.07, dur: 0.03, attack: 0.002, delay: 0.12 });
  }

  /** Carrossel do Balcão (Patch 0.9.3): a maleta arrastada na madeira e o toque ao assentar. */
  playCaseSlide() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - (this.lastSlideAt ?? -1e9) < 70) return;
    this.lastSlideAt = now;
    this.noise({ freq: 700, filter: 'lowpass', q: 0.8, peak: 0.22, dur: 0.11, attack: 0.03 });
    this.tone({ type: 'triangle', freq: 190, freqEnd: 120, peak: 0.12, dur: 0.04, attack: 0.002, delay: 0.1 });
  }

  /**
   * A dificuldade escolhida no Balcão (Patch 0.9.3): o pesadelo chegando.
   * 1 (Peças Pretas): um zumbido grave que incha e bate contra ele mesmo, e o ronco por baixo.
   * 2 (Peças Prateadas, Inferno): mais grave e mais áspero, e o coração batendo no escuro.
   */
  playDread(level = 1) {
    this.duck();
    if (level >= 2) {
      this.tone({ type: 'sine', freq: 62, freqEnd: 41, peak: 0.62, dur: 1.1, attack: 0.08 });
      this.tone({ type: 'sawtooth', freq: 124, freqEnd: 83, peak: 0.07, dur: 0.9, attack: 0.1 });
      this.noise({ freq: 220, filter: 'lowpass', q: 0.9, peak: 0.3, dur: 0.9, attack: 0.12 });
      this.playHeartbeat();
      return;
    }
    this.tone({ type: 'sine', freq: 87, freqEnd: 73, peak: 0.42, dur: 0.95, attack: 0.12 });
    this.tone({ type: 'sine', freq: 92, freqEnd: 77, peak: 0.26, dur: 0.85, attack: 0.16 });
    this.noise({ freq: 320, filter: 'lowpass', q: 0.8, peak: 0.16, dur: 0.7, attack: 0.15 });
  }

  /** REEMBARALHAR: dados chacoalhando dentro do copo de couro e o copo batendo no balcão. */
  playDiceShake() {
    this.duck();
    [0, 0.07, 0.13, 0.21, 0.26, 0.34, 0.4].forEach((delay, i) => {
      this.noise({ freq: 2200 + (i % 3) * 600, q: 3, peak: 0.28, dur: 0.02, delay });
    });
    this.tone({ type: 'triangle', freq: 150, freqEnd: 70, peak: 0.6, dur: 0.09, delay: 0.5 });
    this.noise({ freq: 900, q: 1.2, peak: 0.25, dur: 0.05, delay: 0.5 });
  }

  /** Selecionou uma bucha: estalo + brilho curto. */
  playPowerSelect() {
    this.tone({ type: 'triangle', freq: 260, freqEnd: 190, peak: 0.2, dur: 0.06 });
    this.tone({ freq: 1318.5, peak: 0.1, dur: 0.18, delay: 0.03 });
  }

  /** Pedra puxada do dorme: arrasto + toque leve. */
  playDraw() {
    this.noise({ freq: 900, q: 1.8, peak: 0.2, dur: 0.16, attack: 0.03 });
    this.tone({ type: 'triangle', freq: 300, freqEnd: 180, peak: 0.18, dur: 0.05, delay: 0.2 });
  }

  /** Passar a vez: duas batidas de nó dos dedos na mesa. */
  playPass() {
    this.tone({ freq: 135, freqEnd: 70, peak: 0.6, dur: 0.12 });
    this.tone({ freq: 120, freqEnd: 70, peak: 0.6, dur: 0.12, delay: 0.17 });
  }

  /**
   * Sem jogadas, turno passado: o "uó-uó-uóóó" descendente de erro (quadrada filtrada pela
   * saída quente) fechando com as duas batidas do passe.
   */
  playNoMoves() {
    this.duck();
    [
      [392, 370, 0],
      [330, 311, 0.2],
      [262, 196, 0.4],
    ].forEach(([freq, freqEnd, delay], i) =>
      this.tone({ type: 'square', freq, freqEnd, peak: 0.1, dur: i === 2 ? 0.5 : 0.16, attack: 0.01, delay }),
    );
    this.tone({ freq: 120, freqEnd: 62, peak: 0.55, dur: 0.12, delay: 0.98 });
    this.tone({ freq: 110, freqEnd: 58, peak: 0.5, dur: 0.14, delay: 1.14 });
  }

  /** Compra na loja: gaveta do caixa + moedas. */
  playPurchase() {
    this.noise({ freq: 1800, peak: 0.25, dur: 0.05 });
    this.tone({ type: 'triangle', freq: 180, freqEnd: 120, peak: 0.3, dur: 0.08 });
    this.tone({ freq: 2093, peak: 0.15, dur: 0.3, delay: 0.07 });
    this.tone({ freq: 2637, peak: 0.14, dur: 0.42, delay: 0.13 });
  }

  /** Talismã ou pedra disparou: brilho curto (descendo quando é contra você). */
  playChime(tone = 'player') {
    const notes = tone === 'enemy' ? [659, 523, 392] : tone === 'info' ? [988, 1319] : [1319, 1760, 2637];
    notes.forEach((freq, i) => this.tone({ type: 'triangle', freq, peak: 0.1, dur: 0.28, delay: i * 0.06 }));
  }

  /** Relógio Quebrado: varredura de trás pra frente. */
  playRewind() {
    this.tone({ type: 'triangle', freq: 220, freqEnd: 1320, peak: 0.14, dur: 0.12, attack: 0.25 });
    this.playTileSlam(false);
  }

  /** Tranca: pedras travando — clac-clac-clac. */
  playLock() {
    [0, 0.11, 0.22].forEach((delay) => {
      this.noise({ freq: 1900, q: 2, peak: 0.35, dur: 0.03, delay });
      this.tone({ type: 'square', freq: 210, freqEnd: 150, peak: 0.08, dur: 0.05, delay });
    });
  }

  /**
   * Maleta destrancando no Balcão (Patch 0.6.3): o estalo seco do cadeado, a mola da argola e a
   * corrente escorregando e caindo no feltro.
   */
  playChainUnlock() {
    this.noise({ freq: 2600, filter: 'highpass', q: 0.9, peak: 0.34, dur: 0.03 });
    this.tone({ type: 'triangle', freq: 170, freqEnd: 85, peak: 0.3, dur: 0.07, attack: 0.001 });
    this.tone({ type: 'square', freq: 1250, freqEnd: 620, peak: 0.05, dur: 0.05, delay: 0.07 });
    [0.16, 0.22, 0.27, 0.33, 0.42].forEach((delay, i) => this.noise({ freq: 3200 - i * 260, q: 3, peak: 0.16 - i * 0.02, dur: 0.025, delay }));
    this.tone({ type: 'triangle', freq: 120, freqEnd: 70, peak: 0.18, dur: 0.09, delay: 0.5 });
  }

  /** Tocar numa maleta trancada: a corrente sacode contra o cadeado. */
  playChainRattle() {
    [0, 0.06, 0.13].forEach((delay, i) => this.noise({ freq: 3000 - i * 300, q: 3, peak: 0.18, dur: 0.025, delay }));
    this.tone({ type: 'square', freq: 240, freqEnd: 180, peak: 0.05, dur: 0.04, delay: 0.02 });
  }

  /**
   * Conquista desbloqueada (Patch 0.7.0): fanfarra metálica curta. Dois "tins" de metal
   * subindo (parciais inarmônicas), o acorde de metais aberto e o brilho do prato por cima.
   * Não segura a trilha: o aviso pode chegar no meio da partida.
   */
  playAchievement() {
    this.duck();
    [
      [784, 0],
      [1047, 0.09],
    ].forEach(([freq, delay]) => {
      this.tone({ type: 'triangle', freq, peak: 0.14, dur: 0.1, attack: 0.002, delay });
      this.tone({ freq: freq * 2.76, peak: 0.04, dur: 0.07, attack: 0.001, delay });
    });
    this.brassChord([67, 72, 76, 79], { delay: 0.2, dur: 0.7, peak: 0.1 });
    [1568, 2093, 2637].forEach((freq, i) => this.tone({ type: 'triangle', freq, peak: 0.06, dur: 0.5, delay: 0.24 + i * 0.05 }));
    this.noise({ freq: 7000, filter: 'highpass', q: 0.6, peak: 0.1, dur: 0.6, attack: 0.01, delay: 0.2 });
  }

  /**
   * Trovão do Dono da Noite (Patch 0.8.0): o estalo do raio, o ronco grave que rola por
   * mais de um segundo e o tremor por baixo. A trilha abaixa enquanto ele passa.
   */
  playThunder() {
    this.duck();
    this.noise({ freq: 3800, filter: 'highpass', q: 0.7, peak: 0.42, dur: 0.09, attack: 0.002 });
    this.noise({ freq: 1400, filter: 'bandpass', q: 0.6, peak: 0.3, dur: 0.22, attack: 0.004, delay: 0.04 });
    [0.12, 0.42, 0.85].forEach((delay, i) => this.noise({ freq: 160 - i * 30, filter: 'lowpass', q: 0.8, peak: 0.55 - i * 0.12, dur: 0.9 + i * 0.3, attack: 0.05, delay }));
    this.tone({ type: 'sine', freq: 52, freqEnd: 30, peak: 0.6, dur: 1.6, attack: 0.08, delay: 0.1 });
  }

  /**
   * Entrada do Dono (Patch 0.8.2), 1: a luz do boteco falhando. O zumbido da fiação por baixo e
   * um estalo elétrico em cada apagada (no mesmo tempo das piscadas do CSS `secret-flicker`).
   */
  playLightsFlicker() {
    this.duck();
    this.tone({ type: 'sawtooth', freq: 60, freqEnd: 58, peak: 0.07, dur: FLICKER_OUT, attack: 0.05 });
    FLICKER_CUTS.forEach((delay, i) => {
      this.noise({ freq: 5200, filter: 'highpass', q: 0.8, peak: 0.26, dur: 0.035, delay });
      this.tone({ type: 'square', freq: 118 - i * 8, freqEnd: 70, peak: 0.07, dur: 0.07, delay: delay + 0.01 });
    });
    // o último estalo, mais forte: a lâmpada queima
    this.noise({ freq: 2600, filter: 'bandpass', q: 0.9, peak: 0.34, dur: 0.06, delay: FLICKER_OUT });
    this.tone({ type: 'triangle', freq: 1900, freqEnd: 240, peak: 0.06, dur: 0.16, delay: FLICKER_OUT + 0.01 });
  }

  /** 2: no escuro total, dois pares de batidas de coração graves. */
  playHeartbeat() {
    [0, 0.2, 0.78, 0.98].forEach((delay, i) => this.tone({ type: 'triangle', freq: i % 2 ? 64 : 74, freqEnd: 38, peak: i % 2 ? 0.5 : 0.62, dur: 0.16, delay }));
  }

  /** 3: as runas do círculo acendendo uma a uma: um "tim" frio descendo, meio-tom contra meio-tom. */
  playRuneIgnite(count = 8, gap = 0.13) {
    const notes = [659, 622, 698, 587, 554, 523, 494, 466];
    for (let i = 0; i < count; i += 1) {
      this.tone({ type: 'triangle', freq: notes[i % notes.length], freqEnd: notes[i % notes.length] * 0.985, peak: 0.07, dur: 0.2, attack: 0.008, delay: i * gap });
    }
  }

  /** 4: os olhos dourados abrindo no breu: um ronco grave e um brilho dissonante por cima. */
  playDonoEyes() {
    this.duck();
    this.tone({ type: 'sawtooth', freq: 55, freqEnd: 49, peak: 0.16, dur: 1.5, attack: 0.35 });
    this.tone({ type: 'sine', freq: 1244.5, peak: 0.035, dur: 1.2, attack: 0.45, delay: 0.1 });
    this.tone({ type: 'sine', freq: 1318.5, peak: 0.03, dur: 1.1, attack: 0.5, delay: 0.16 });
  }

  /**
   * Entrada do Seu Arlindo (Patch 0.9.0): a navalha cortando o ar ("fsshh" subindo), o fio
   * cantando no metal e o zumbido do neon acendendo logo depois.
   */
  playRazorSlash() {
    this.duck();
    this.noise({ freq: 2400, filter: 'highpass', q: 0.7, peak: 0.3, dur: 0.16, attack: 0.05 });
    this.noise({ freq: 6800, filter: 'bandpass', q: 2, peak: 0.22, dur: 0.06, delay: 0.17 });
    this.tone({ type: 'triangle', freq: 2637, peak: 0.08, dur: 0.5, delay: 0.18, partials: [[1, 1], [1.5, 0.35]] });
    this.tone({ type: 'sawtooth', freq: 120, freqEnd: 118, peak: 0.05, dur: 0.5, attack: 0.02, delay: 0.32 });
    [0.34, 0.5].forEach((delay) => this.noise({ freq: 5200, filter: 'highpass', q: 0.8, peak: 0.16, dur: 0.03, delay }));
  }

  /**
   * Entrada do Beto Cigano: a chapa de ferro despencando (assobio do ar) e batendo no chão:
   * baque grave, a bigorna e as faíscas chiando.
   */
  playIronSlam() {
    this.tone({ type: 'sine', freq: 900, freqEnd: 300, peak: 0.05, dur: 0.3, attack: 0.05 });
    this.later(0.34, () => {
      this.duck();
      this.tone({ type: 'sine', freq: 70, freqEnd: 34, peak: 0.85, dur: 0.38 });
      this.noise({ freq: 600, filter: 'lowpass', q: 0.8, peak: 0.5, dur: 0.22 });
      this.playAnvil();
      [0.05, 0.11, 0.16, 0.24].forEach((delay, i) => this.noise({ freq: 4200 + i * 500, filter: 'bandpass', q: 3, peak: 0.12, dur: 0.02, delay }));
    });
  }

  /**
   * Entrada do Comendador: a cortina de veludo abrindo (sopro de pano), a fanfarra grave de
   * metais e as moedas tilintando ao cair.
   */
  playGrandEntrance() {
    this.duck();
    this.noise({ freq: 900, filter: 'lowpass', q: 0.6, peak: 0.18, dur: 0.6, attack: 0.15 });
    this.brassChord([43, 50, 55, 59], { delay: 0.3, dur: 0.18, peak: 0.12 });
    this.brassChord([48, 55, 60, 64], { delay: 0.52, dur: 0.9, peak: 0.14 });
    [0.75, 0.86, 0.94, 1.08, 1.17, 1.3, 1.42].forEach((delay, i) => this.tone({ type: 'triangle', freq: [2093, 2637, 2349, 3136, 2794, 2637, 3520][i], peak: 0.05, dur: 0.18, delay }));
  }

  /**
   * Maleta abrindo no Balcão (Patch 0.8.2): os dois fechos estalando, a dobradiça rangendo, a
   * tampa assentando no veludo e um brilho curto (o que tem dentro).
   */
  playCaseOpen() {
    [0, 0.07].forEach((delay, i) => {
      this.noise({ freq: 3400 - i * 300, filter: 'highpass', q: 0.9, peak: 0.26, dur: 0.022, delay });
      this.tone({ type: 'square', freq: 980 - i * 120, freqEnd: 520, peak: 0.045, dur: 0.035, delay });
    });
    this.tone({ type: 'sawtooth', freq: 230, freqEnd: 150, peak: 0.035, dur: 0.22, attack: 0.03, delay: 0.14 });
    this.noise({ freq: 520, filter: 'lowpass', q: 0.7, peak: 0.2, dur: 0.12, attack: 0.02, delay: 0.3 });
    this.tone({ type: 'triangle', freq: 1568, peak: 0.07, dur: 0.3, delay: 0.32 });
    this.tone({ type: 'triangle', freq: 2349, peak: 0.05, dur: 0.36, delay: 0.38 });
  }

  /** A maleta que estava aberta fecha quando você abre outra: baque abafado da tampa. */
  playCaseClose() {
    this.tone({ type: 'triangle', freq: 150, freqEnd: 72, peak: 0.24, dur: 0.08, delay: 0.05 });
    this.noise({ freq: 900, q: 1, peak: 0.12, dur: 0.04, delay: 0.05 });
  }

  /** Dano de coração: dois baques de batimento e um estalo rachando (a música abaixa). */
  playHeartHit() {
    this.duck();
    this.tone({ type: 'triangle', freq: 78, freqEnd: 42, peak: 0.8, dur: 0.16 });
    this.tone({ type: 'triangle', freq: 70, freqEnd: 38, peak: 0.65, dur: 0.2, delay: 0.19 });
    this.noise({ freq: 1600, filter: 'highpass', peak: 0.45, dur: 0.12, delay: 0.3 });
  }

  /** Acorde de metais quentes (dente-de-serra filtrada), uma voz por acorde. */
  brassChord(notes, { delay = 0, dur = 0.2, peak = 0.12 }) {
    if (this.isMuted || !this.ready()) return;
    this.later(delay, (d) => {
      const at = this.ctx.currentTime + 0.005 + d;
      this.spawn({
        at,
        end: at + dur + 0.08,
        bus: this.sfxBus,
        priority: PRIORITY.sfx,
        build: (env) => {
          const g = env.gain;
          g.setValueAtTime(SILENT, at);
          g.exponentialRampToValueAtTime(Math.max(2 * SILENT, this.sfxVolume * peak), at + 0.02);
          g.setValueAtTime(Math.max(2 * SILENT, this.sfxVolume * peak * 0.85), at + Math.max(0.03, dur * 0.6));
          g.exponentialRampToValueAtTime(SILENT, at + dur);
          const lp = this.ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(900, at);
          lp.frequency.exponentialRampToValueAtTime(2600, at + 0.06); // o "blat" do metal abrindo
          lp.Q.value = 0.9;
          lp.connect(env);
          const sources = notes.map((n) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = midi(n);
            osc.connect(lp);
            return osc;
          });
          return { sources, nodes: [lp] };
        },
      });
    });
  }

  /** Vitória da rodada: "tã-dã" maior curto por cima da trilha. */
  playRoundWin() {
    this.duck();
    this.brassChord([60, 64, 67], { dur: 0.12, peak: 0.1 });
    this.brassChord([64, 67, 72], { delay: 0.14, dur: 0.42, peak: 0.12 });
  }

  playRoundLose() {
    [392, 311.13, 261.63].forEach((freq, i) => this.tone({ type: 'triangle', freq, peak: 0.18, dur: 0.35, delay: i * 0.12 }));
  }

  /**
   * Vitória da partida: a trilha sai em fade, a fanfarra maior toca limpa
   * (tã-tã-tãããã + prato) e a próxima faixa (a da Loja) só entra depois.
   */
  playVictory() {
    if (this.isMuted || !this.ready()) return;
    const t = this.ctx.currentTime;
    this.musicHoldUntil = t + FANFARE_HOLD;
    if (this.musicBus) this.rampMusic(0, 0.25);
    // o sequenciador continua no relógio, mas sem som até a fanfarra acabar
    if (this.seq) this.seq.next = Math.max(this.seq.next, this.musicHoldUntil);
    this.brassChord([55, 60, 64], { delay: 0.18, dur: 0.12, peak: 0.11 });
    this.brassChord([55, 60, 64], { delay: 0.34, dur: 0.12, peak: 0.11 });
    this.brassChord([60, 64, 67, 72], { delay: 0.52, dur: 1.4, peak: 0.14 });
    this.noise({ freq: 6500, filter: 'highpass', q: 0.6, peak: 0.14, dur: 1.1, attack: 0.02, delay: 0.52 });
    this.later(FANFARE_HOLD, () => {
      if (this.isPlayingMusic) this.rampMusic(this.musicLevel(), 0.6);
    });
  }

  /** Derrota: descida lenta e um baque. */
  playDefeat() {
    [440, 415.3, 392, 349.23, 293.66].forEach((freq, i) => this.tone({ type: 'sawtooth', freq, peak: 0.08, dur: 0.4, delay: i * 0.18 }));
    this.tone({ freq: 62, freqEnd: 34, peak: 0.7, dur: 0.6, delay: 0.95 });
  }
}

export const sound = new SoundEngine();
