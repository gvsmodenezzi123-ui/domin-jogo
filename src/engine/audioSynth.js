// src/engine/audioSynth.js
// Motor Procedural de Áudio Web: Músicas Chiptune/Jazz de Boteco, Efeitos Sonoros Físicos e Vozes Estilo Animalese
//
// Ajustes para encaixar no jogo (marcados com "AJUSTE" no código):
//   - perfis de voz para os 18 rivais, com os ids do jogo (neide, arlindo...);
//   - `speed` do perfil vira o ritmo da fala (ms por letra); com som desligado o texto continua aparecendo;
//   - as pedras de grife usam os ids do jogo (ouro, cristal, rubi, chumbo, fantasma);
//   - nada toca com o áudio ainda travado (iOS: o contexto só destrava num toque);
//   - volume das OPÇÕES, mudo salvo no aparelho e a faixa atual volta ao desmutar;
//   - os outros sons do jogo (clique, compra, coração, vitória...) no mesmo estilo, no fim da classe.

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

// --- PERFIS DE VOZ ---
// baseFreq (Hz), mod (variação por sílaba, Hz), type (onda), speed (ms por letra)
const VOICE_PROFILES = {
  tioZe: { baseFreq: 110, mod: 35, type: 'triangle', speed: 85 }, // Voz rouca, grave de fumante
  donaNeide: { baseFreq: 340, mod: 70, type: 'sine', speed: 65 }, // Voz aguda e ranzinza
  marcao: { baseFreq: 80, mod: 25, type: 'sawtooth', speed: 100 }, // Voz de caminhoneiro pesada
  seuArlindo: { baseFreq: 130, mod: 40, type: 'square', speed: 90 }, // Boss fanfarrão
  default: { baseFreq: 160, mod: 50, type: 'triangle', speed: 75 },
  // AJUSTE: o resto da campanha
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
};

/** AJUSTE: ids do jogo → perfis acima. */
const VOICE_ALIASES = { neide: 'donaNeide', arlindo: 'seuArlindo' };

/** AJUSTE: ids das pedras de grife no jogo → nomes usados no motor. */
const ENHANCEMENT_ALIASES = { ouro: 'gold', cristal: 'crystal', rubi: 'ruby', chumbo: 'lead', fantasma: 'ghost' };

/** Letras que não fazem som (pausa natural da fala). */
export const SILENT_CHARS = new Set([' ', '.', ',', '!', '?', '…', '-', ':', ';']);

export const voiceProfile = (character) => VOICE_PROFILES[VOICE_ALIASES[character] ?? character] ?? VOICE_PROFILES.default;

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = readMuted();
    this.musicVolume = 0.4;
    this.sfxVolume = 0.7;
    this.currentTrack = null;
    this.isPlayingMusic = false;
    this.musicStep = 0;
    this.musicInterval = null;
    this.tempo = 120;
    this.noiseBuffer = null;
    this.stopSpeech = null;
  }

  init() {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  /** AJUSTE: só toca com o contexto rodando (senão as notas acumulam e saem todas juntas ao destravar). */
  ready() {
    return this.init() && this.ctx.state === 'running';
  }

  /** AJUSTE: volume das OPÇÕES (0–1). */
  setVolumes({ sfx = this.sfxVolume, music = this.musicVolume } = {}) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
  }

  // --- 1. SISTEMA VOCAL PROCEDURAL (ANIMALESE / BLIP CHATTER) ---
  // Cada personagem tem frequência base, tipo de onda e velocidade de fala únicos
  playVoiceBlip(character = 'tioZe') {
    if (this.isMuted || !this.ready()) return;

    const profile = voiceProfile(character);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Variação orgânica de entonação por sílaba
    const pitchJitter = (Math.random() - 0.5) * profile.mod;
    osc.type = profile.type;
    osc.frequency.setValueAtTime(profile.baseFreq + pitchJitter, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, profile.baseFreq - 20 + pitchJitter), this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.sfxVolume * 0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /**
   * Executa uma frase vocal com cadência humana. `onCharCallback(textoAtéAqui)`
   * a cada letra (efeito máquina de escrever); devolve uma função que corta a
   * fala. AJUSTE: uma fala nova corta a anterior, o ritmo é o `speed` do
   * personagem e, com som desligado, o texto continua aparecendo (sem os blips).
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
      if (!SILENT_CHARS.has(char)) {
        this.playVoiceBlip(character);
      }
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

  // --- 2. IMPACTOS FÍSICOS E SFX DE MESA ---
  playTileSlam(isDouble = false, enhancement = null) {
    if (this.isMuted || !this.ready()) return;

    // Batida de madeira oca (Frequência baixa ressonante)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = isDouble ? 110 : 160;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(this.sfxVolume * (isDouble ? 0.9 : 0.6), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);

    // Efeito específico de pedra aprimorada
    const enh = ENHANCEMENT_ALIASES[enhancement] ?? enhancement;
    if (enh === 'gold') this.playCoinJingle();
    if (enh === 'crystal') this.playGlassPing();
    if (enh === 'ruby') this.playDeepBassDrop();
    if (enh === 'lead') this.playAnvil();
    if (enh === 'ghost') this.playGhostSigh();
  }

  playCoinJingle() {
    if (this.isMuted || !this.ready()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6
    gain.gain.setValueAtTime(this.sfxVolume * 0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playGlassPing() {
    if (this.isMuted || !this.ready()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
    gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playDeepBassDrop() {
    if (this.isMuted || !this.ready()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(this.sfxVolume * 0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  /** AJUSTE: Chumbo — ferro de bigorna (parciais metálicos). */
  playAnvil() {
    [
      [523, 0.3, 0.9],
      [1444, 0.18, 0.6],
      [2825, 0.1, 0.4],
    ].forEach(([freq, peak, dur]) => this.tone({ type: 'triangle', freq, peak, dur }));
    this.noise({ freq: 3500, filter: 'highpass', peak: 0.35, dur: 0.03 });
  }

  /** AJUSTE: Fantasma — sopro espectral subindo. */
  playGhostSigh() {
    this.tone({ type: 'sine', freq: 660, freqEnd: 990, peak: 0.12, dur: 0.45, attack: 0.1 });
    this.noise({ freq: 1200, peak: 0.12, dur: 0.4, attack: 0.08, q: 4 });
  }

  // --- 3. REPERTÓRIO MUSICAL DE BOTECO (MULTITRACKS CHIPTUNE/JAZZ) ---
  // Sistema de Sequenciador por Passos com Baixo Acústico Sintetizado e Acordes
  playTrack(trackName = 'botecoJazz') {
    // AJUSTE: guarda a faixa mesmo com o som desligado (desmutar volta nela)
    this.currentTrack = trackName;
    if (this.isMuted || !this.init()) return;
    this.stopMusic();
    this.isPlayingMusic = true;
    this.musicStep = 0;

    // Frequências das Notas
    const N = {
      C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
      C4: 261.63, E4: 329.63, G4: 392.0, B4: 493.88, D4: 293.66, REST: 0,
    };

    // Tracks Disponíveis
    const tracks = {
      // Faixa 1: Boteco da Esquina (Bossa / Jazz Lento, descontraído)
      botecoJazz: {
        tempo: 220, // ms por step
        bass: [
          N.C2, N.REST, N.G2, N.REST, N.A2, N.REST, N.E2, N.REST,
          N.F2, N.REST, N.C3, N.REST, N.G2, N.REST, N.B2, N.REST,
        ],
        chords: [
          [N.E3, N.G3, N.B3], N.REST, [N.E3, N.G3], N.REST,
          [N.F3, N.A3, N.C4], N.REST, [N.D3, N.F3], N.REST,
        ],
      },
      // Faixa 2: Sinuca Clandestina (Funk 70s / Ritmo malandro com groove)
      sinucaFunk: {
        tempo: 180,
        bass: [
          N.D2, N.D2, N.REST, N.F2, N.REST, N.G2, N.REST, N.A2,
          N.D2, N.REST, N.C3, N.A2, N.F2, N.REST, N.G2, N.REST,
        ],
        chords: [
          [N.F3, N.A3], N.REST, [N.G3, N.B3], N.REST,
          [N.A3, N.C4], N.REST, [N.F3, N.D4], N.REST,
        ],
      },
      // Faixa 3: Tensão de Boss / Submundo (Pesado, tenso, compasso quebrado)
      bossFight: {
        tempo: 160,
        bass: [
          N.A2, N.A2, N.REST, N.A2, N.E2, N.REST, N.G2, N.REST,
          N.F2, N.F2, N.REST, N.F2, N.D2, N.E2, N.F2, N.G2,
        ],
        chords: [
          [N.C3, N.E3], N.REST, [N.D3, N.F3], N.REST,
          [N.E3, N.G3], N.REST, [N.D3, N.F3], N.REST,
        ],
      },
    };

    const selected = tracks[trackName] || tracks.botecoJazz;

    this.musicInterval = setInterval(() => {
      if (!this.isPlayingMusic || this.isMuted) return;
      // AJUSTE: com o áudio travado o passo é pulado (nada fica acumulado)
      if (this.ctx?.state !== 'running') return;

      const step = this.musicStep % selected.bass.length;
      const bassNote = selected.bass[step];
      const chordNotes = selected.chords[step % selected.chords.length];

      // Toca o Baixo (Onda Triangular macia com ataque percussivo)
      if (bassNote && bassNote > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassNote, this.ctx.currentTime);
        gain.gain.setValueAtTime(this.musicVolume * 0.45, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
      }

      // Toca os Acordes de Fundo (Onda Senoidal suave para criar harmonia de bar)
      if (Array.isArray(chordNotes)) {
        chordNotes.forEach((freq) => {
          if (freq > 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(this.musicVolume * 0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.28);
          }
        });
      }

      this.musicStep++;
    }, selected.tempo);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    writeMuted(this.isMuted);
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.playTrack(this.currentTrack ?? 'botecoJazz');
    }
    return this.isMuted;
  }

  // --- 4. OS OUTROS SONS DO JOGO (AJUSTE: mesmo estilo, oscilador → ganho → saída) ---

  /** Nota curta com envelope percussivo. `delay` em segundos. */
  tone({ type = 'sine', freq, freqEnd, peak = 0.3, dur = 0.15, attack = 0.004, delay = 0 }) {
    if (this.isMuted || !this.ready()) return;
    const t = this.ctx.currentTime + 0.005 + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.sfxVolume * peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + attack + dur + 0.05);
  }

  /** Estalo de ruído filtrado (osso, papel, metal). */
  noise({ freq = 2000, filter = 'bandpass', q = 1.2, peak = 0.3, dur = 0.05, attack = 0.001, delay = 0 }) {
    if (this.isMuted || !this.ready()) return;
    if (!this.noiseBuffer) {
      const length = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const t = this.ctx.currentTime + 0.005 + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.sfxVolume * peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    src.connect(f);
    f.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t, Math.random() * 0.4);
    src.stop(t + attack + dur + 0.05);
  }

  /** Pedra assentando na mesa (sua ou do rival): a madeira oca + estalo seco de osso ("SLAM"). */
  playBoneSlam(isDouble = false, enhancement = null) {
    this.playTileSlam(isDouble, enhancement);
    this.noise({ freq: 2400, q: 1.3, peak: 0.75, dur: 0.03 });
    this.noise({ freq: 5200, filter: 'highpass', peak: 0.3, dur: 0.012 });
    if (isDouble) this.noise({ freq: 1900, q: 1.4, peak: 0.45, dur: 0.03, delay: 0.04 });
  }

  /** Nome antigo (Patch 0.4): o pouso da pedra do rival. */
  playAiSlam(isDouble = false, enhancement = null) {
    this.playBoneSlam(isDouble, enhancement);
  }

  playClick() {
    this.tone({ type: 'square', freq: 1450, peak: 0.08, dur: 0.022, attack: 0.001 });
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

  /** Dano de coração: dois baques de batimento e um estalo rachando. */
  playHeartHit() {
    this.tone({ freq: 78, freqEnd: 42, peak: 0.8, dur: 0.16 });
    this.tone({ freq: 70, freqEnd: 38, peak: 0.65, dur: 0.2, delay: 0.19 });
    this.noise({ freq: 1600, filter: 'highpass', peak: 0.45, dur: 0.12, delay: 0.3 });
  }

  playRoundWin() {
    [523.25, 659.25, 783.99].forEach((freq, i) => this.tone({ type: 'triangle', freq, peak: 0.18, dur: 0.3, delay: i * 0.09 }));
  }

  playRoundLose() {
    [392, 311.13, 261.63].forEach((freq, i) => this.tone({ type: 'triangle', freq, peak: 0.18, dur: 0.35, delay: i * 0.12 }));
  }

  /** Vitória: arpejo menor resolvendo em maior. */
  playVictory() {
    [220, 261.63, 329.63, 440, 554.37, 659.25, 880].forEach((freq, i) =>
      this.tone({ type: 'triangle', freq, peak: 0.18, dur: 0.5, delay: i * 0.11 }),
    );
    [220, 277.18, 329.63, 440].forEach((freq) => this.tone({ type: 'triangle', freq, peak: 0.12, dur: 1.6, attack: 0.02, delay: 0.77 }));
  }

  /** Derrota: descida lenta e um baque. */
  playDefeat() {
    [440, 415.3, 392, 349.23, 293.66].forEach((freq, i) => this.tone({ type: 'sawtooth', freq, peak: 0.08, dur: 0.4, delay: i * 0.18 }));
    this.tone({ freq: 62, freqEnd: 34, peak: 0.7, dur: 0.6, delay: 0.95 });
  }
}

export const sound = new SoundEngine();
