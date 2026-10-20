/**
 * Buxaria — sintetizador procedural (Web Audio API pura, sem arquivos de áudio).
 *
 * Grafo:  vozes → [sala (delay curto com realimentação)] → master → compressor → saída
 *
 * No iOS o AudioContext só nasce/retoma dentro de um gesto do usuário:
 * chame `unlock()` num toque (o botão "Sentar à mesa" faz isso).
 */

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

const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Trilha: bossa lenta de boteco, 76 BPM, 8 compassos em loop. */
const MUSIC_BPM = 76;
const EIGHTH = 60 / MUSIC_BPM / 2;
const LOOP_EIGHTHS = 64;
const MUSIC_LEVEL = 0.55;

/** Acordes (MIDI): baixo na tônica e na quinta, voicing confortável no meio. */
const CHORDS = {
  Dm9: { root: 38, fifth: 45, voicing: [53, 57, 60, 64] },
  G13: { root: 43, fifth: 38, voicing: [53, 59, 64] },
  Cmaj9: { root: 36, fifth: 43, voicing: [52, 55, 59, 62] },
  A7b13: { root: 45, fifth: 40, voicing: [55, 61, 65] },
  Em7: { root: 40, fifth: 47, voicing: [55, 59, 62] },
  A7: { root: 45, fifth: 40, voicing: [55, 61, 64] },
};

/** Um acorde por meio compasso: ii–V–I–VI, e uma volta com Em7–A7 no fim. */
const HALF_BARS = [
  'Dm9', 'Dm9', 'G13', 'G13', 'Cmaj9', 'Cmaj9', 'A7b13', 'A7b13',
  'Dm9', 'Dm9', 'G13', 'G13', 'Em7', 'A7', 'Dm9', 'G13',
];

/** Vibrafone: [colcheia de início (0–63), duração em colcheias, nota MIDI]. */
const MELODY = [
  [0, 3, 69], [3, 2, 72], [5, 3, 76],
  [8, 2, 74], [10, 1, 72], [11, 5, 71],
  [18, 2, 76], [20, 2, 74], [22, 2, 71],
  [24, 4, 73], [28, 4, 69],
  [32, 3, 77], [35, 1, 76], [36, 2, 74], [38, 2, 69],
  [40, 2, 71], [42, 4, 76],
  [48, 2, 79], [50, 2, 76], [52, 2, 73], [54, 2, 67],
  [56, 4, 74], [60, 2, 72], [62, 2, 71],
];

const NOTE = {
  A2: 110,
  E3: 164.81,
  A3: 220,
  C4: 261.63,
  Cs4: 277.18,
  D4: 293.66,
  Ds4: 311.13,
  E4: 329.63,
  A4: 440,
  C5: 523.25,
  Cs5: 554.37,
  E5: 659.25,
  A5: 880,
};

export class AudioSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.room = null;
    this.noise = null;
    this.ambience = null;
    this.music = null;
    this.pink = null;
    this.muted = readMuted();
  }

  get ready() {
    return Boolean(this.ctx);
  }

  /** Cria (ou retoma) o contexto. Deve ser chamado dentro de um gesto do usuário. */
  unlock() {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      this.buildGraph();
      // buffer silencioso: destrava o áudio no Safari antigo
      const silent = this.ctx.createBufferSource();
      silent.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      silent.connect(this.ctx.destination);
      silent.start(0);
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  buildGraph() {
    const ctx = this.ctx;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    compressor.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.master.connect(compressor);

    // "sala": um delay curto escurecido dá corpo de quarto fechado
    const roomIn = ctx.createGain();
    roomIn.gain.value = 1;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.083;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    roomIn.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(wet);
    wet.connect(this.master);
    this.room = roomIn;

    // ruído branco reaproveitado por todas as vozes
    const length = Math.floor(ctx.sampleRate * 1.5);
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted) {
    this.muted = muted;
    writeMuted(muted);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.85, now, 0.03);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // -------------------------------------------------------------------------
  // Blocos de construção
  // -------------------------------------------------------------------------

  canPlay() {
    return Boolean(this.ctx) && !this.muted && this.ctx.state === 'running';
  }

  /** Envelope percussivo: ataque rápido e queda exponencial. */
  envelope(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  connectOut(node, roomSend = 0) {
    node.connect(this.master);
    if (roomSend > 0) {
      const send = this.ctx.createGain();
      send.gain.value = roomSend;
      node.connect(send);
      send.connect(this.room);
    }
  }

  tone({ t, type = 'sine', freq, freqEnd, peak = 0.3, attack = 0.004, decay = 0.2, room = 0, filter }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    const gain = ctx.createGain();
    this.envelope(gain, t, peak, attack, decay);
    let head = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type;
      f.frequency.setValueAtTime(filter.freq, t);
      if (filter.freqEnd) f.frequency.exponentialRampToValueAtTime(filter.freqEnd, t + attack + decay);
      f.Q.value = filter.q ?? 0.7;
      osc.connect(f);
      head = f;
    }
    head.connect(gain);
    this.connectOut(gain, room);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  noiseBurst({ t, peak = 0.3, attack = 0.001, decay = 0.08, filter, sweepTo, room = 0, distortion = 0 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter.type;
    f.frequency.setValueAtTime(filter.freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay);
    f.Q.value = filter.q ?? 1;
    const gain = ctx.createGain();
    this.envelope(gain, t, peak, attack, decay);
    src.connect(f);
    let head = f;
    if (distortion > 0) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.distortionCurve(distortion);
      f.connect(shaper);
      head = shaper;
    }
    head.connect(gain);
    this.connectOut(gain, room);
    const offset = Math.random() * (this.noise.duration - 0.5);
    src.start(t, offset);
    src.stop(t + attack + decay + 0.05);
  }

  distortionCurve(amount) {
    const n = 1024;
    const curve = new Float32Array(n);
    const k = amount * 100;
    for (let i = 0; i < n; i += 1) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  now(offset = 0) {
    return this.ctx.currentTime + 0.005 + offset;
  }

  // -------------------------------------------------------------------------
  // Sons do jogo
  // -------------------------------------------------------------------------

  /** Batida seca de madeira/osso: pedra encostando na mesa. */
  tileKnock({ heavy = false } = {}) {
    if (!this.canPlay()) return;
    const t = this.now();
    const jitter = 1 + (Math.random() - 0.5) * 0.08;
    // estalo de osso
    this.noiseBurst({ t, peak: heavy ? 0.55 : 0.42, decay: 0.035, filter: { type: 'bandpass', freq: 2600 * jitter, q: 1.4 }, room: 0.5 });
    // ressonância modal curta (osso)
    this.tone({ t, freq: 1720 * jitter, peak: 0.08, attack: 0.001, decay: 0.045 });
    this.tone({ t, freq: 2930 * jitter, peak: 0.04, attack: 0.001, decay: 0.03 });
    // corpo de madeira da mesa
    this.tone({ t, type: 'triangle', freq: (heavy ? 190 : 230) * jitter, freqEnd: 120, peak: heavy ? 0.5 : 0.36, attack: 0.002, decay: 0.09, room: 0.35 });
    if (heavy) {
      this.tone({ t: t + 0.004, type: 'sine', freq: 95, freqEnd: 55, peak: 0.32, attack: 0.003, decay: 0.14 });
    }
  }

  /** Clique de interface. */
  click() {
    if (!this.canPlay()) return;
    const t = this.now();
    this.tone({ t, type: 'square', freq: 1450, peak: 0.07, attack: 0.001, decay: 0.022, filter: { type: 'lowpass', freq: 3200 } });
    this.noiseBurst({ t, peak: 0.08, decay: 0.012, filter: { type: 'highpass', freq: 4000 } });
  }

  /** Pedra sendo puxada do dorme: arrasto + toque leve. */
  drawTile() {
    if (!this.canPlay()) return;
    const t = this.now();
    this.noiseBurst({ t, peak: 0.16, attack: 0.03, decay: 0.16, filter: { type: 'bandpass', freq: 700, q: 1.8 }, sweepTo: 2600 });
    this.tone({ t: t + 0.2, type: 'triangle', freq: 300, freqEnd: 180, peak: 0.14, attack: 0.002, decay: 0.05 });
  }

  /** Passar a vez: duas batidas de nó dos dedos na mesa. */
  passKnock() {
    if (!this.canPlay()) return;
    [0, 0.17].forEach((offset, i) => {
      const t = this.now(offset);
      this.tone({ t, type: 'sine', freq: i ? 120 : 135, freqEnd: 70, peak: 0.55, attack: 0.002, decay: 0.12, room: 0.4 });
      this.noiseBurst({ t, peak: 0.22, decay: 0.04, filter: { type: 'lowpass', freq: 900 }, room: 0.3 });
    });
  }

  /** Moedas: dois parciais metálicos. */
  coin() {
    if (!this.canPlay()) return;
    const t = this.now();
    this.tone({ t, freq: 1568, peak: 0.13, attack: 0.002, decay: 0.32, room: 0.3 });
    this.tone({ t, freq: 3920, peak: 0.04, attack: 0.001, decay: 0.12 });
    this.tone({ t: t + 0.075, freq: 2093, peak: 0.14, attack: 0.002, decay: 0.45, room: 0.4 });
    this.tone({ t: t + 0.075, freq: 5230, peak: 0.03, attack: 0.001, decay: 0.15 });
  }

  /** Dano de coração: dois baques de batimento e um estalo rachando. */
  heartDamage() {
    if (!this.canPlay()) return;
    const t = this.now();
    this.tone({ t, freq: 78, freqEnd: 42, peak: 0.75, attack: 0.004, decay: 0.16 });
    this.tone({ t: t + 0.19, freq: 70, freqEnd: 38, peak: 0.6, attack: 0.004, decay: 0.2 });
    this.noiseBurst({ t: t + 0.3, peak: 0.42, decay: 0.12, filter: { type: 'highpass', freq: 1400 }, distortion: 0.6, room: 0.5 });
    this.noiseBurst({ t: t + 0.33, peak: 0.25, decay: 0.07, filter: { type: 'bandpass', freq: 3200, q: 3 } });
    this.tone({ t: t + 0.3, type: 'sawtooth', freq: 58, freqEnd: 40, peak: 0.2, attack: 0.01, decay: 0.55, filter: { type: 'lowpass', freq: 380 } });
  }

  /** Batida que fecha a rodada: pedra pesada + pancada grave. */
  slam() {
    if (!this.canPlay()) return;
    this.tileKnock({ heavy: true });
    const t = this.now(0.02);
    this.tone({ t, freq: 62, freqEnd: 34, peak: 0.6, attack: 0.003, decay: 0.32, room: 0.6 });
  }

  /**
   * Bucha batendo na mesa: duas pancadas de madeira quase juntas (a pedra
   * bate de quina e assenta), mais secas (pouca sala) e com peso grave.
   */
  doubleSlam() {
    if (!this.canPlay()) return;
    const t = this.now();
    [0, 0.042].forEach((offset, i) => {
      const at = t + offset;
      const jitter = 1 + (Math.random() - 0.5) * 0.06;
      this.noiseBurst({ t: at, peak: i ? 0.52 : 0.66, decay: 0.028, filter: { type: 'bandpass', freq: (i ? 1850 : 2250) * jitter, q: 1.6 }, room: 0.2 });
      this.tone({ t: at, type: 'triangle', freq: (i ? 148 : 172) * jitter, freqEnd: 82, peak: i ? 0.52 : 0.64, attack: 0.002, decay: 0.085, room: 0.15 });
      this.tone({ t: at, freq: 1480 * jitter, peak: 0.07, attack: 0.001, decay: 0.03 });
    });
    // peso: grave curto embaixo da segunda pancada
    this.tone({ t: t + 0.042, freq: 74, freqEnd: 40, peak: 0.72, attack: 0.003, decay: 0.2 });
    this.noiseBurst({ t: t + 0.042, peak: 0.18, decay: 0.09, filter: { type: 'lowpass', freq: 420 } });
  }

  /** Selecionou uma bucha na mão: estalo de osso + brilho metálico curto. */
  powerSelect() {
    if (!this.canPlay()) return;
    const t = this.now();
    this.tone({ t, type: 'triangle', freq: 260, freqEnd: 190, peak: 0.16, attack: 0.002, decay: 0.06 });
    this.tone({ t: t + 0.03, freq: 1318.5, peak: 0.07, attack: 0.002, decay: 0.18, room: 0.3 });
    this.tone({ t: t + 0.03, freq: 1975.5, peak: 0.035, attack: 0.002, decay: 0.12 });
  }

  /** Tranca: pedras travando — clac-clac seco. */
  /** Relíquia ou peça aprimorada disparou: brilho curto (grave quando é contra você). */
  relicChime(tone = 'player') {
    if (!this.canPlay()) return;
    const t = this.now();
    const notes = tone === 'enemy' ? [659, 523, 392] : tone === 'info' ? [988, 1319] : [1319, 1760, 2637];
    notes.forEach((freq, i) => {
      this.tone({ t: t + i * 0.06, type: 'triangle', freq, peak: 0.07, attack: 0.002, decay: 0.28, room: 0.45 });
    });
    this.noiseBurst({ t, peak: 0.03, decay: 0.18, filter: { type: 'highpass', freq: 6500 }, room: 0.3 });
  }

  /** Compra na loja: gaveta do caixa abrindo + moedas. */
  purchase() {
    if (!this.canPlay()) return;
    const t = this.now();
    this.noiseBurst({ t, peak: 0.22, decay: 0.05, filter: { type: 'bandpass', freq: 1800, q: 1.2 }, room: 0.3 });
    this.tone({ t, type: 'triangle', freq: 180, freqEnd: 120, peak: 0.25, attack: 0.002, decay: 0.08 });
    this.tone({ t: t + 0.07, freq: 2093, peak: 0.12, attack: 0.002, decay: 0.3, room: 0.4 });
    this.tone({ t: t + 0.13, freq: 2637, peak: 0.11, attack: 0.002, decay: 0.42, room: 0.45 });
  }

  /** Relógio Quebrado: a jogada volta no tempo (varredura de trás pra frente). */
  rewind() {
    if (!this.canPlay()) return;
    const t = this.now();
    this.tone({ t, type: 'triangle', freq: 220, freqEnd: 1320, peak: 0.1, attack: 0.25, decay: 0.12, room: 0.4 });
    this.noiseBurst({ t, peak: 0.06, attack: 0.22, decay: 0.08, filter: { type: 'bandpass', freq: 600, q: 2 }, sweepTo: 4200 });
    this.tileKnock();
  }

  lock() {
    if (!this.canPlay()) return;
    [0, 0.11, 0.22].forEach((offset) => {
      const t = this.now(offset);
      this.noiseBurst({ t, peak: 0.3, decay: 0.03, filter: { type: 'bandpass', freq: 1900, q: 2 }, room: 0.4 });
      this.tone({ t, type: 'square', freq: 210, freqEnd: 150, peak: 0.08, attack: 0.001, decay: 0.05, filter: { type: 'lowpass', freq: 1200 } });
    });
  }

  /** Vitória: arpejo menor resolvendo em maior, caixinha de música amaldiçoada. */
  victory() {
    if (!this.canPlay()) return;
    const seq = [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.Cs5, NOTE.E5, NOTE.A5];
    seq.forEach((freq, i) => {
      const t = this.now(i * 0.11);
      this.tone({ t, type: 'triangle', freq, peak: 0.16, attack: 0.004, decay: 0.5, room: 0.6 });
      this.tone({ t, type: 'sine', freq: freq * 2, peak: 0.04, attack: 0.002, decay: 0.25 });
    });
    const t = this.now(seq.length * 0.11);
    [NOTE.A3, NOTE.Cs4, NOTE.E4, NOTE.A4].forEach((freq) => {
      this.tone({ t, type: 'triangle', freq, peak: 0.1, attack: 0.02, decay: 1.6, room: 0.7 });
    });
  }

  /** Derrota: queda cromática em serra abafada e um baque final. */
  defeat() {
    if (!this.canPlay()) return;
    const seq = [NOTE.E4, NOTE.Ds4, NOTE.D4, NOTE.Cs4];
    seq.forEach((freq, i) => {
      const t = this.now(i * 0.3);
      this.tone({
        t,
        type: 'sawtooth',
        freq,
        freqEnd: freq * 0.97,
        peak: 0.16,
        attack: 0.03,
        decay: 0.42,
        room: 0.6,
        filter: { type: 'lowpass', freq: 1400, freqEnd: 500 },
      });
    });
    const t = this.now(seq.length * 0.3);
    this.tone({ t, type: 'sawtooth', freq: NOTE.A2, freqEnd: 55, peak: 0.24, attack: 0.02, decay: 1.4, room: 0.7, filter: { type: 'lowpass', freq: 600, freqEnd: 120 } });
    this.tone({ t, freq: 55, freqEnd: 30, peak: 0.6, attack: 0.005, decay: 0.5 });
  }

  /** Ganhou a rodada (sem fim de duelo). */
  roundWin() {
    if (!this.canPlay()) return;
    [NOTE.E4, NOTE.A4, NOTE.C5].forEach((freq, i) => {
      this.tone({ t: this.now(i * 0.09), type: 'triangle', freq, peak: 0.14, attack: 0.004, decay: 0.35, room: 0.5 });
    });
  }

  /** Perdeu a rodada (sem fim de duelo). */
  roundLose() {
    if (!this.canPlay()) return;
    [NOTE.E4, NOTE.C4, NOTE.A3].forEach((freq, i) => {
      this.tone({ t: this.now(i * 0.12), type: 'sawtooth', freq, peak: 0.1, attack: 0.01, decay: 0.35, room: 0.5, filter: { type: 'lowpass', freq: 1100 } });
    });
  }

  // -------------------------------------------------------------------------
  // Ambiência de bar
  // -------------------------------------------------------------------------

  /** Ruído rosa (filtro de Paul Kellet): base da conversa de fundo do bar. */
  pinkNoise(seconds = 4) {
    if (this.pink) return this.pink;
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let [b0, b1, b2, b3, b4, b5, b6] = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.pink = buffer;
    return buffer;
  }

  /** Camada de ruído em loop, filtrada, com "ondas" lentas de volume (gente conversando). */
  noiseLayer(out, { type, freq, q = 0.7, level, swell = 0, rate = 0.1 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoise();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = level;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    const nodes = [src];
    if (swell > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const depth = ctx.createGain();
      depth.gain.value = swell;
      lfo.connect(depth);
      depth.connect(gain.gain);
      lfo.start();
      nodes.push(lfo);
    }
    src.start(0, Math.random() * 3);
    return nodes;
  }

  /**
   * Fundo do bar, quase imperceptível: murmúrio grave de gente conversando,
   * zumbido da lâmpada e, de vez em quando, um "tink" de copo ou garrafa.
   */
  startAmbience() {
    if (!this.ctx || this.ambience) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(0.75, ctx.currentTime, 1.5);
    out.connect(this.master);

    const nodes = [
      // conversa abafada (faixa da voz, bem filtrada) e o grave da sala
      ...this.noiseLayer(out, { type: 'bandpass', freq: 380, q: 0.9, level: 0.05, swell: 0.02, rate: 0.07 }),
      ...this.noiseLayer(out, { type: 'bandpass', freq: 760, q: 1.3, level: 0.016, swell: 0.008, rate: 0.13 }),
      ...this.noiseLayer(out, { type: 'lowpass', freq: 170, level: 0.04 }),
    ];

    // zumbido da lâmpada pendente, mais baixo que a conversa
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 60;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'bandpass';
    humFilter.frequency.value = 120;
    humFilter.Q.value = 6;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.01;
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(out);
    hum.start();
    nodes.push(hum);

    this.ambience = { out, nodes, timer: null };
    this.scheduleGlassTink();
  }

  /** Próximo "tink" daqui a 15–25 s. */
  scheduleGlassTink() {
    if (!this.ambience) return;
    const delay = 15000 + Math.random() * 10000;
    this.ambience.timer = setTimeout(() => {
      this.glassTink();
      this.scheduleGlassTink();
    }, delay);
  }

  /** Copo ou garrafa tilintando em algum canto do bar (parciais inarmônicos, bem baixo). */
  glassTink() {
    if (!this.canPlay() || !this.ambience) return;
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (pan.pan) pan.pan.value = (Math.random() * 2 - 1) * 0.75;
    pan.connect(this.ambience.out);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    pan.connect(send);
    send.connect(this.room);

    const clink = (t, base, level) => {
      [
        [1, 0.032, 0.9],
        [1.52, 0.018, 0.7],
        [2.33, 0.011, 0.5],
        [3.11, 0.006, 0.35],
      ].forEach(([ratio, peak, decay]) => {
        const osc = ctx.createOscillator();
        osc.frequency.value = base * ratio;
        const gain = ctx.createGain();
        this.envelope(gain, t, peak * level, 0.002, decay);
        osc.connect(gain);
        gain.connect(pan);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      });
    };
    const t = this.now();
    const base = 2100 + Math.random() * 1100;
    clink(t, base, 1);
    // às vezes são dois copos brindando
    if (Math.random() < 0.45) clink(t + 0.09 + Math.random() * 0.08, base * (1.04 + Math.random() * 0.06), 0.7);
  }

  stopAmbience() {
    if (!this.ambience || !this.ctx) return;
    const { out, nodes, timer } = this.ambience;
    clearTimeout(timer);
    const t = this.ctx.currentTime;
    out.gain.setTargetAtTime(0, t, 0.3);
    nodes.forEach((n) => n.stop(t + 1.5));
    this.ambience = null;
  }

  // -------------------------------------------------------------------------
  // Trilha de boteco: bossa lenta, 8 compassos em loop
  // -------------------------------------------------------------------------

  /** Liga a trilha (agendador com folga de 250 ms, à prova de travadas do timer). */
  startMusic() {
    if (!this.ctx || this.music) return;
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 2.5);
    // um pouco abafada, como vindo de um rádio do balcão
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 2600;
    warm.Q.value = 0.5;
    bus.connect(warm);
    warm.connect(this.master);
    const send = ctx.createGain();
    send.gain.value = 0.35;
    warm.connect(send);
    send.connect(this.room);

    this.music = { bus, step: 0, nextTime: ctx.currentTime + 0.2, timer: null };
    this.music.timer = setInterval(() => this.scheduleMusic(), 60);
    this.scheduleMusic();
  }

  stopMusic() {
    if (!this.music || !this.ctx) return;
    const { bus, timer } = this.music;
    clearInterval(timer);
    bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    setTimeout(() => bus.disconnect(), 2500);
    this.music = null;
  }

  scheduleMusic() {
    const m = this.music;
    if (!m || !this.ctx) return;
    const now = this.ctx.currentTime;
    // voltou de segundo plano: não despeja as notas atrasadas de uma vez
    if (m.nextTime < now - 0.1) m.nextTime = now + 0.05;
    while (m.nextTime < now + 0.25) {
      this.playMusicStep(m.step, m.nextTime);
      m.nextTime += EIGHTH;
      m.step = (m.step + 1) % LOOP_EIGHTHS;
    }
  }

  /** Uma colcheia da trilha: contrabaixo, acordes, vibrafone e escovinha. */
  playMusicStep(step, t) {
    const bar = Math.floor(step / 8);
    const eighth = step % 8;
    const chord = CHORDS[HALF_BARS[Math.floor(step / 4)]];

    // contrabaixo de bossa: tônica pontuada + quinta, duas vezes por compasso
    if (eighth === 0 || eighth === 4) this.musicBass(t, chord.root, EIGHTH * 2.8);
    if (eighth === 3 || eighth === 7) this.musicBass(t, chord.fifth, EIGHTH * 0.9);

    // violão/piano: batida sincopada, leve
    const comp = bar % 2 === 0 ? [0, 3, 6] : [2, 5];
    if (comp.includes(eighth)) chord.voicing.forEach((note) => this.musicPluck(t, note));

    // vibrafone
    for (const [start, length, note] of MELODY) {
      if (start === step) this.musicVibes(t, note, length * EIGHTH);
    }

    // escovinha na caixa, quase só um sopro
    this.noiseVoice(t, { peak: eighth % 2 ? 0.006 : 0.0035, decay: 0.06, freq: 6200 });
  }

  /** Nota com envelope percussivo indo para o barramento da música. */
  musicNote({ t, freq, type = 'sine', peak, attack, decay, filterFreq, partials = [] }) {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    this.envelope(gain, t, peak, attack, decay);
    let head = gain;
    if (filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      gain.connect(filter);
      head = filter;
    }
    head.connect(this.music.bus);
    const oscs = [[1, 1, type], ...partials].map(([ratio, level, oscType]) => {
      const osc = ctx.createOscillator();
      osc.type = oscType ?? 'sine';
      osc.frequency.value = freq * ratio;
      if (level === 1) {
        osc.connect(gain);
      } else {
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(g);
        g.connect(gain);
      }
      osc.start(t);
      osc.stop(t + attack + decay + 0.05);
      return osc;
    });
    return { gain, oscs };
  }

  musicBass(t, midi, length) {
    this.musicNote({
      t,
      freq: midiToFreq(midi),
      type: 'sine',
      peak: 0.3,
      attack: 0.008,
      decay: Math.max(0.25, length),
      filterFreq: 600,
      partials: [[2, 0.18, 'triangle']],
    });
  }

  musicPluck(t, midi) {
    this.musicNote({ t, freq: midiToFreq(midi), type: 'triangle', peak: 0.04, attack: 0.012, decay: 0.55, filterFreq: 1300 });
  }

  /** Vibrafone: senoide com um parcial agudo bem baixo e tremolo lento. */
  musicVibes(t, midi, length) {
    const ctx = this.ctx;
    const decay = Math.max(0.9, length * 1.4);
    const { gain } = this.musicNote({
      t,
      freq: midiToFreq(midi),
      type: 'sine',
      peak: 0.085,
      attack: 0.004,
      decay,
      partials: [[4, 0.06, 'sine']],
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.value = 0.025;
    lfo.connect(depth);
    depth.connect(gain.gain);
    lfo.start(t);
    lfo.stop(t + decay + 0.05);
  }

  noiseVoice(t, { peak, decay, freq }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    this.envelope(gain, t, peak, 0.004, decay);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.music.bus);
    src.start(t, Math.random() * (this.noise.duration - 0.2));
    src.stop(t + decay + 0.05);
  }
}

/** Instância única usada pela UI. */
export const audio = new AudioSynth();
