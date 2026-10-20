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

  /** Tranca: pedras travando — clac-clac seco. */
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

  /** Zumbido da lâmpada pendente + tom de sala, bem baixo. */
  startAmbience() {
    if (!this.ctx || this.ambience) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    out.connect(this.master);

    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 60;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'bandpass';
    humFilter.frequency.value = 120;
    humFilter.Q.value = 6;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.022;
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(out);

    // tremulação lenta da lâmpada
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(humGain.gain);

    const room = ctx.createBufferSource();
    room.buffer = this.noise;
    room.loop = true;
    const roomFilter = ctx.createBiquadFilter();
    roomFilter.type = 'lowpass';
    roomFilter.frequency.value = 320;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.03;
    room.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(out);

    hum.start();
    lfo.start();
    room.start();
    this.ambience = { out, nodes: [hum, lfo, room] };
  }

  stopAmbience() {
    if (!this.ambience || !this.ctx) return;
    const { out, nodes } = this.ambience;
    const t = this.ctx.currentTime;
    out.gain.setTargetAtTime(0, t, 0.3);
    nodes.forEach((n) => n.stop(t + 1.5));
    this.ambience = null;
  }
}

/** Instância única usada pela UI. */
export const audio = new AudioSynth();
