// O som da abertura, todo sintetizado (Web Audio), agendado de uma vez a partir do tempo da cena.
// Serve para os dois casos: no jogo (no contexto de áudio do motor, entrando atrasado se o
// sistema só liberar o som depois) e no vídeo de divulgação (num OfflineAudioContext).
//
// Rua: chuva em estéreo, trovão, o neon acordando e zumbindo, passos molhados, a moeda do Seu
// Tião, um riso baixo do Corvo e o rádio do boteco abafado lá dentro. Porta: as fitas de plástico.
// Boteco: o burburinho, copos, o ventilador, passos no assoalho, a voz do Tio Zé e a cadeira
// rangendo. Bucha: a batida com tudo tremendo e a música cortando seco. Logo: o baque e a trilha.
import { SoundEngine, TRACKS, stepDuration } from '../engine/audioSynth.js';
import { hash } from './core.js';
import { BEATS } from './renderer.js';

const SILENT = 0.0001;
export const INTRO_TRACK = 'botecoJazz';

function noiseBuffer(ctx, seconds = 2.5) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let pink = 0;
  for (let i = 0; i < len; i += 1) {
    const white = hash(i, 0.5) * 2 - 1;
    pink = 0.97 * pink + 0.03 * white;
    d[i] = white * 0.55 + pink * 3.2;
  }
  return buf;
}

function reverbBuffer(ctx, seconds = 1.7, decay = 0.42) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i += 1) {
      const t = i / ctx.sampleRate;
      lp = 0.6 * lp + 0.4 * (hash(i * 2 + ch, 1.5) * 2 - 1);
      d[i] = lp * Math.exp(-t / decay) * (t < 0.012 ? t / 0.012 : 1);
    }
  }
  return buf;
}

/**
 * Agenda o som da cena. `t0` = quando a cena começa no relógio de `ctx` (s); `from` = de que
 * ponto da cena começar (entrar atrasado sem acumular o que já passou); `until` = até onde
 * (o teaser corta depois da bucha); `sfx` = volume.
 * Devolve uma função que corta tudo (PULAR).
 */
export function scheduleIntroSound({ ctx, out, t0, from = 0, until = Infinity, sfx = 0.7 }) {
  const nodes = [];
  const keep = (n) => {
    nodes.push(n);
    return n;
  };
  const master = keep(ctx.createGain());
  master.gain.value = Math.max(SILENT, sfx);
  const comp = keep(ctx.createDynamicsCompressor());
  comp.threshold.value = -14;
  comp.knee.value = 8;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  master.connect(comp).connect(out);
  // reverberação do salão (o boteco e a batida soam "dentro")
  const verb = keep(ctx.createConvolver());
  verb.buffer = reverbBuffer(ctx);
  const verbIn = keep(ctx.createGain());
  verbIn.gain.value = 0.32;
  verbIn.connect(verb).connect(master);
  const noise = noiseBuffer(ctx);

  const T = (s) => t0 + s;
  const alive = (start, end) => end > from && start <= until;
  const panner = (p) => {
    if (!p || typeof ctx.createStereoPanner !== 'function') return null;
    const n = keep(ctx.createStereoPanner());
    n.pan.value = p;
    return n;
  };
  /** Liga `node` na saída (com pan e um tanto de reverb). */
  const route = (node, { pan = 0, wet = 0 } = {}) => {
    const p = panner(pan);
    const target = p ?? master;
    if (p) p.connect(master);
    node.connect(target);
    if (wet > 0) {
      const send = keep(ctx.createGain());
      send.gain.value = wet;
      node.connect(send).connect(verbIn);
    }
  };

  /** Ruído filtrado com envelope. Devolve os nós para automação (chuva, murmúrio). */
  const burst = ({ at, dur, type = 'bandpass', freq = 800, freqEnd = null, q = 1, peak = 0.2, attack = 0.005, release = null, loop = false, pan = 0, wet = 0 }) => {
    if (!alive(at, at + dur)) return null;
    const rel = release ?? dur * 0.8;
    const src = keep(ctx.createBufferSource());
    src.buffer = noise;
    src.loop = loop;
    const f = keep(ctx.createBiquadFilter());
    f.type = type;
    f.frequency.setValueAtTime(freq, T(at));
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, T(at + dur));
    f.Q.value = q;
    const g = keep(ctx.createGain());
    g.gain.setValueAtTime(SILENT, T(at));
    g.gain.exponentialRampToValueAtTime(peak, T(at + attack));
    g.gain.setValueAtTime(peak, T(at + Math.max(attack, dur - rel)));
    g.gain.exponentialRampToValueAtTime(SILENT, T(at + dur));
    src.connect(f).connect(g);
    route(g, { pan, wet });
    const late = Math.max(0, from - at);
    src.start(T(Math.max(at, from)), (hash(at * 100, 2) * 1.5 + late) % noise.duration);
    src.stop(T(at + dur + 0.05));
    return { src, f, g };
  };

  /** Tom com envelope percussivo (moeda, copos, baques, a voz). */
  const tone = ({ at, freq, freqEnd = null, dur = 0.12, type = 'sine', peak = 0.2, attack = 0.003, pan = 0, wet = 0, vibrato = 0 }) => {
    if (!alive(at, at + dur) || at < from) return;
    const o = keep(ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(freq, T(at));
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, T(at + dur));
    if (vibrato) {
      const lfo = keep(ctx.createOscillator());
      lfo.frequency.value = 7;
      const depth = keep(ctx.createGain());
      depth.gain.value = vibrato;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(T(at));
      lfo.stop(T(at + dur + 0.05));
    }
    const g = keep(ctx.createGain());
    g.gain.setValueAtTime(SILENT, T(at));
    g.gain.exponentialRampToValueAtTime(peak, T(at + attack));
    g.gain.exponentialRampToValueAtTime(SILENT, T(at + dur));
    o.connect(g);
    route(g, { pan, wet });
    o.start(T(at));
    o.stop(T(at + dur + 0.05));
  };

  /** Pedra de osso na madeira (o mesmo som da mesa, mais pesado quando é a bucha). */
  const tileHit = (at, weight = 1, wet = 0.25) => {
    tone({ at, type: 'triangle', freq: 800, dur: 0.018, peak: 0.34 * weight, attack: 0.001, wet });
    burst({ at, dur: 0.02, freq: 1760, q: 2.2, peak: 0.4 * weight, attack: 0.001, wet });
    tone({ at, type: 'triangle', freq: 102, freqEnd: 62, dur: 0.11, peak: 0.95 * weight, attack: 0.002, wet });
  };

  const B = BEATS;

  // ---- rua -------------------------------------------------------------------------
  // chuva em estéreo (cheia na rua, abafada dentro, some no logo ou no corte do teaser)
  const rainEnd = Math.min(B.logo + 0.35, until + 0.3);
  if (alive(0, rainEnd)) {
    for (const [pan, salt] of [
      [-0.6, 0],
      [0.6, 1],
    ]) {
      const src = keep(ctx.createBufferSource());
      src.buffer = noise;
      src.loop = true;
      const f = keep(ctx.createBiquadFilter());
      f.type = 'highpass';
      f.Q.value = 0.35;
      const g = keep(ctx.createGain());
      const hp = 1300 + salt * 200;
      f.frequency.setValueAtTime(hp, T(0));
      f.frequency.setValueAtTime(hp, T(B.inside - 0.35));
      f.frequency.exponentialRampToValueAtTime(380, T(B.inside + 0.1));
      g.gain.setValueAtTime(SILENT, T(0));
      g.gain.exponentialRampToValueAtTime(0.11, T(0.08));
      g.gain.setValueAtTime(0.11, T(B.inside - 0.35));
      g.gain.exponentialRampToValueAtTime(0.05, T(B.inside + 0.1));
      const quiet = Math.min(B.dark, rainEnd - 0.35);
      g.gain.setValueAtTime(0.05, T(quiet));
      g.gain.exponentialRampToValueAtTime(rainEnd < B.logo ? SILENT : 0.025, T(quiet + 0.1 + (rainEnd < B.logo ? 0.2 : 0)));
      if (rainEnd >= B.logo) {
        g.gain.setValueAtTime(0.025, T(B.logo - 0.05));
        g.gain.exponentialRampToValueAtTime(SILENT, T(rainEnd));
      }
      src.connect(f).connect(g);
      route(g, { pan });
      src.start(T(Math.max(0, from)), (salt * 0.9 + Math.max(0, from)) % noise.duration);
      src.stop(T(rainEnd + 0.05));
    }
  }
  // goteira forte da marquise (gotas grossas)
  for (let i = 0; i < 18; i += 1) {
    const at = 0.15 + i * 0.17 + hash(i, 3) * 0.08;
    if (at > B.inside - 0.3) break;
    tone({ at, type: 'sine', freq: 900 + hash(i, 4) * 900, freqEnd: 300, dur: 0.05, peak: 0.035, pan: hash(i, 5) - 0.5 });
  }
  // trovão: o estalo e o rolar longe
  burst({ at: B.thunder - 0.02, dur: 0.35, type: 'highpass', freq: 900, q: 0.5, peak: 0.22, attack: 0.004, release: 0.3 });
  burst({ at: B.thunder, dur: 2.6, type: 'lowpass', freq: 140, freqEnd: 70, q: 0.8, peak: 0.5, attack: 0.06, release: 2.2 });
  burst({ at: B.thunder + 0.3, dur: 1.6, type: 'lowpass', freq: 240, freqEnd: 90, q: 0.7, peak: 0.16, attack: 0.2, release: 1.2, pan: -0.3 });
  // neon acordando: estalos a cada piscada e o zumbido
  for (const at of [0.52, 0.58, 0.66, 0.7, 0.78]) {
    burst({ at, dur: 0.03, type: 'highpass', freq: 3800, q: 0.7, peak: 0.12, attack: 0.001 });
    tone({ at, type: 'square', freq: 60, dur: 0.05, peak: 0.03 });
  }
  if (alive(0.52, B.inside)) {
    const hum = keep(ctx.createOscillator());
    hum.type = 'sawtooth';
    hum.frequency.value = 120;
    const hf = keep(ctx.createBiquadFilter());
    hf.type = 'bandpass';
    hf.frequency.value = 360;
    hf.Q.value = 3;
    const hg = keep(ctx.createGain());
    hg.gain.setValueAtTime(SILENT, T(0.52));
    for (const [at, v] of [
      [0.52, 0.02],
      [0.58, SILENT],
      [0.66, 0.02],
      [0.7, 0.004],
      [0.78, 0.022],
    ])
      hg.gain.setValueAtTime(v, T(at));
    hg.gain.exponentialRampToValueAtTime(0.03, T(2.2));
    hg.gain.exponentialRampToValueAtTime(SILENT, T(B.inside));
    hum.connect(hf).connect(hg);
    route(hg, { pan: 0.05 });
    hum.start(T(Math.max(0.52, from)));
    hum.stop(T(B.inside + 0.05));
  }
  // passos na calçada molhada (no ritmo do balanço da câmera)
  for (let n = 1; n <= 5; n += 1) {
    const at = n / 2.2;
    const side = n % 2 ? -0.15 : 0.15;
    tone({ at, type: 'sine', freq: 88, freqEnd: 52, dur: 0.09, peak: 0.2, pan: side });
    burst({ at, dur: 0.07, type: 'bandpass', freq: 600, q: 1.1, peak: 0.12, pan: side });
    burst({ at: at + 0.012, dur: 0.12, type: 'highpass', freq: 2800, q: 0.5, peak: 0.05, pan: side });
  }
  // a moeda do Seu Tião: o peteleco, o giro no ar e o tapa na mão
  tone({ at: B.coinUp, type: 'triangle', freq: 2637, dur: 0.3, peak: 0.07, pan: 0.45 });
  tone({ at: B.coinUp, type: 'sine', freq: 3951, dur: 0.22, peak: 0.04, pan: 0.45 });
  for (let i = 0; i < 6; i += 1) tone({ at: B.coinUp + 0.08 + i * 0.07, type: 'sine', freq: 5200 + (i % 2) * 400, dur: 0.03, peak: 0.012, pan: 0.45 });
  tone({ at: B.coinCatch, type: 'triangle', freq: 1760, dur: 0.1, peak: 0.07, pan: 0.45 });
  burst({ at: B.coinCatch, dur: 0.04, freq: 1200, q: 1.5, peak: 0.06, pan: 0.45 });
  // o Corvo: um riso baixinho lá de cima
  for (let i = 0; i < 3; i += 1) tone({ at: 0.98 + i * 0.13, type: 'sawtooth', freq: 78 - i * 4, freqEnd: 60, dur: 0.09, peak: 0.035, pan: 0.35 });

  // ---- porta: a cortina de fitas ---------------------------------------------------
  burst({ at: B.curtain - 0.05, dur: 0.55, type: 'bandpass', freq: 2600, freqEnd: 900, q: 0.8, peak: 0.12, attack: 0.05, release: 0.4 });
  for (let i = 0; i < 16; i += 1) {
    const at = B.curtain + hash(i, 7) * 0.5;
    burst({ at, dur: 0.012, type: 'highpass', freq: 3000 + hash(i, 8) * 3000, q: 1.2, peak: 0.05 + hash(i, 9) * 0.04, attack: 0.001, pan: hash(i, 10) * 1.2 - 0.6 });
  }
  // a luz estourando: um sopro que sobe
  burst({ at: B.inside - 0.45, dur: 0.6, type: 'lowpass', freq: 300, freqEnd: 4000, q: 0.6, peak: 0.08, attack: 0.4, release: 0.15 });

  // ---- dentro do boteco --------------------------------------------------------------
  const barEnd = B.slam + 0.02;
  for (const [freq, peak, pan] of [
    [380, 0.12, -0.4],
    [720, 0.08, 0.3],
    [1150, 0.045, -0.1],
  ]) {
    const v = burst({ at: B.inside - 0.1, dur: barEnd - B.inside + 0.1, type: 'bandpass', freq, q: 2, peak, attack: 0.35, release: 0.03, loop: true, pan, wet: 0.3 });
    if (v && alive(B.inside, barEnd)) {
      const lfo = keep(ctx.createOscillator());
      lfo.frequency.value = 0.7 + hash(freq, 11) * 0.9;
      const depth = keep(ctx.createGain());
      depth.gain.value = peak * 0.45;
      lfo.connect(depth).connect(v.g.gain);
      lfo.start(T(Math.max(B.inside, from)));
      lfo.stop(T(barEnd));
      // a conversa baixa enquanto o Tio Zé fala
      v.g.gain.setValueAtTime(peak, T(B.speech - 0.1));
      v.g.gain.exponentialRampToValueAtTime(peak * 0.45, T(B.speech + 0.2));
    }
  }
  // ventilador de teto
  burst({ at: B.inside, dur: barEnd - B.inside, type: 'lowpass', freq: 140, q: 4, peak: 0.05, attack: 0.3, release: 0.02, loop: true, wet: 0.1 });
  // passos no assoalho (a gente entrando)
  for (const at of [B.inside + 0.12, B.inside + 0.55, B.inside + 0.98]) {
    tone({ at, type: 'triangle', freq: 130, freqEnd: 74, dur: 0.08, peak: 0.16, wet: 0.3 });
    burst({ at, dur: 0.06, type: 'bandpass', freq: 300, q: 1.2, peak: 0.1, wet: 0.3 });
  }
  // copos do Valtinho (à esquerda) e uma garrafa
  for (const [at, f] of [
    [B.inside + 0.3, 2900],
    [B.inside + 0.85, 3400],
    [B.inside + 1.6, 2600],
    [B.inside + 2.4, 3100],
  ]) {
    tone({ at, freq: f, dur: 0.25, peak: 0.05, pan: -0.55, wet: 0.35 });
    tone({ at: at + 0.006, freq: f * 1.51, dur: 0.14, peak: 0.025, pan: -0.55, wet: 0.35 });
  }
  // a voz do Tio Zé ("animalese" do jogo: grave, rouca)
  const text = B.speechText;
  for (let i = 0; i < text.length; i += 1) {
    if (' .,!?'.includes(text[i])) continue;
    const at = B.speech + i * B.speechChar;
    const jitter = (hash(i, 12) - 0.5) * 35;
    tone({ at, type: 'triangle', freq: 110 + jitter, freqEnd: Math.max(40, 90 + jitter), dur: 0.075, peak: 0.3, attack: 0.004, pan: 0.1, wet: 0.2 });
  }
  // a cadeira dele rangendo e a pedra saindo da mão
  tone({ at: B.raise - 0.05, type: 'sawtooth', freq: 420, freqEnd: 300, dur: 0.28, peak: 0.022, vibrato: 18, pan: 0.15, wet: 0.3 });
  tone({ at: B.raise + 0.1, type: 'triangle', freq: 1500, dur: 0.02, peak: 0.08, pan: 0.2, wet: 0.2 });

  // ---- a bucha ------------------------------------------------------------------------
  tileHit(B.slam, 1.6, 0.45);
  tone({ at: B.slam, type: 'sine', freq: 62, freqEnd: 30, dur: 0.75, peak: 0.6, attack: 0.003, wet: 0.4 });
  burst({ at: B.slam, dur: 0.5, type: 'lowpass', freq: 900, freqEnd: 120, q: 0.7, peak: 0.3, attack: 0.002, release: 0.45, wet: 0.5 });
  // copos e moedas tremendo
  for (let i = 0; i < 9; i += 1) {
    const at = B.slam + 0.02 + hash(i, 13) * 0.32;
    tone({ at, freq: 2200 + hash(i, 14) * 2600, dur: 0.08 + hash(i, 15) * 0.1, peak: 0.03, pan: hash(i, 16) * 1.4 - 0.7, wet: 0.3 });
  }
  // a lâmpada balançando na corrente, o estalo da falha e o apagão
  tone({ at: B.slam + 0.15, type: 'sine', freq: 1900, freqEnd: 1600, dur: 0.35, peak: 0.012, vibrato: 40, wet: 0.4 });
  tone({ at: B.slam + 0.55, type: 'sine', freq: 1800, freqEnd: 1550, dur: 0.3, peak: 0.01, vibrato: 40, wet: 0.4 });
  burst({ at: B.dark - 0.18, dur: 0.05, type: 'highpass', freq: 4200, q: 0.6, peak: 0.1, attack: 0.001 });
  burst({ at: B.dark - 0.01, dur: 0.06, type: 'highpass', freq: 3600, q: 0.6, peak: 0.14, attack: 0.001 });
  tone({ at: B.dark, type: 'square', freq: 58, dur: 0.12, peak: 0.04 });
  tone({ at: B.dark, type: 'sine', freq: 2400, freqEnd: 900, dur: 0.06, peak: 0.04 });

  // ---- logo -----------------------------------------------------------------------------
  burst({ at: B.lampOn, dur: 0.03, type: 'highpass', freq: 3800, q: 0.6, peak: 0.1, attack: 0.001 });
  burst({ at: B.lampOn + 0.1, dur: 0.03, type: 'highpass', freq: 3800, q: 0.6, peak: 0.08, attack: 0.001 });
  // a subida antes da batida (um sopro reverso)
  burst({ at: B.logo - 0.32, dur: 0.33, type: 'bandpass', freq: 500, freqEnd: 3200, q: 0.9, peak: 0.12, attack: 0.3, release: 0.02, wet: 0.3 });
  // o baque do logo
  tone({ at: B.logo, type: 'sine', freq: 74, freqEnd: 34, dur: 1.3, peak: 0.58, attack: 0.003, wet: 0.5 });
  tone({ at: B.logo, type: 'triangle', freq: 148, freqEnd: 70, dur: 0.4, peak: 0.25, attack: 0.002, wet: 0.5 });
  burst({ at: B.logo, dur: 0.7, type: 'lowpass', freq: 1600, freqEnd: 150, q: 0.6, peak: 0.26, attack: 0.002, release: 0.6, wet: 0.6 });
  tileHit(B.logo, 1.4, 0.6);
  // o metal do logo tinindo
  for (const [f, p] of [
    [1244, 0.035],
    [1864, 0.022],
    [2793, 0.012],
  ])
    tone({ at: B.logo + 0.01, freq: f, dur: 1.6, peak: p, attack: 0.002, wet: 0.6 });
  // brasas estalando
  for (let i = 0; i < 10; i += 1) burst({ at: B.logo + 0.2 + hash(i, 17) * 1.4, dur: 0.01, type: 'highpass', freq: 5000, q: 1, peak: 0.03, attack: 0.001, pan: hash(i, 18) * 1.6 - 0.8 });

  return () => {
    const now = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.12);
    } catch {
      /* contexto fechado */
    }
    setTimeout(() => {
      for (const n of nodes) {
        try {
          if (n.stop) n.stop();
          n.disconnect();
        } catch {
          /* já parou */
        }
      }
    }, 200);
  };
}

/**
 * O rádio do boteco: a trilha da tela inicial tocando lá dentro (abafada da rua, mais clara
 * dentro, baixinha sob a fala) até a bucha, que corta seco. Usa um motor de som próprio no mesmo
 * contexto (as notas vão todas agendadas de uma vez).
 */
export function scheduleRadio({ ctx, out, t0, from = 0, music = 0.4 }) {
  const engine = new SoundEngine();
  engine.ctx = ctx;
  engine.isMuted = false;
  engine.musicVolume = 1;
  engine.buildGraph();
  engine.master.disconnect();
  const radio = ctx.createBiquadFilter();
  radio.type = 'lowpass';
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 160;
  const level = ctx.createGain();
  engine.master.connect(hp).connect(radio).connect(level).connect(out);
  const T = (s) => t0 + s;
  const B = BEATS;
  const v = Math.max(SILENT, music * 1.3);
  radio.frequency.setValueAtTime(520, T(0));
  radio.frequency.setValueAtTime(520, T(B.curtain - 0.1));
  radio.frequency.exponentialRampToValueAtTime(3200, T(B.inside + 0.1));
  level.gain.setValueAtTime(SILENT, T(0));
  level.gain.exponentialRampToValueAtTime(v * 0.45, T(0.6));
  level.gain.exponentialRampToValueAtTime(v * 0.7, T(B.curtain));
  level.gain.exponentialRampToValueAtTime(v, T(B.inside + 0.2));
  level.gain.setValueAtTime(v, T(B.speech - 0.1));
  level.gain.exponentialRampToValueAtTime(v * 0.5, T(B.speech + 0.15));
  level.gain.setValueAtTime(v * 0.5, T(B.slam - 0.01));
  level.gain.linearRampToValueAtTime(0, T(B.slam + 0.02));
  const track = TRACKS[INTRO_TRACK];
  let at = T(0);
  for (let step = 0; at < T(B.slam + 0.05); step += 1) {
    if (at >= T(from) - 0.02) engine.scheduleStep(track, step, at, 1);
    at += stepDuration(track, step, 1);
  }
  return () => {
    try {
      level.gain.cancelScheduledValues(ctx.currentTime);
      level.gain.setValueAtTime(level.gain.value, ctx.currentTime);
      level.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    } catch {
      /* contexto fechado */
    }
    setTimeout(() => engine.releaseAll(), 150);
  };
}

/** Só para o vídeo: a trilha entrando com o logo (no jogo é o próprio motor que toca). */
export function scheduleLogoMusic({ ctx, out, t0, until, music = 0.4 }) {
  const engine = new SoundEngine();
  engine.ctx = ctx;
  engine.isMuted = false;
  engine.musicVolume = 1;
  engine.buildGraph();
  engine.master.disconnect();
  const level = ctx.createGain();
  level.gain.value = music;
  engine.master.connect(level).connect(out);
  const track = TRACKS[INTRO_TRACK];
  let at = t0 + BEATS.logo;
  for (let step = 0; at < t0 + until; step += 1) {
    engine.scheduleStep(track, step, at, 1);
    at += stepDuration(track, step, 1);
  }
  level.gain.setValueAtTime(music, t0 + until - 0.8);
  level.gain.linearRampToValueAtTime(0, t0 + until);
}
