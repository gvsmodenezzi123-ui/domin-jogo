/**
 * Versão 2.12: o som da abertura "Efeito Dominó", todo sintetizado e casado com o roteiro
 * (openingPlan.js): o psssst da gelada destampando, o tlim da tampinha, o tec-tec-tec das
 * pedras (cada uma no seu tempo, embalando), o surdo marcando a onda, o miado do gato, o rangido
 * do carretão pendendo, a pancada no chão e o zumbido do neon acendendo. A trilha do menu entra
 * em seguida (OpeningScene).
 */
import { BEATS, GIANT_HIT, HIT_TIMES, NEON_FULL, NEON_ON, SCENE_SECONDS, SLAM, TILES, catAt } from './openingPlan.js';

/** O menu toca esta trilha; ela entra quando o neon acende. */
export const OPENING_TRACK = 'botecoJazz';

function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Quando o gato pula (o miado sai no pulo). */
function catJumpTime() {
  for (let t = BEATS.chain; t < GIANT_HIT; t += 0.02) if (catAt(t).pose === 'leap') return t;
  return null;
}

/**
 * Agenda o som da cena. `t0`: o tempo do áudio (ctx.currentTime) que corresponde ao 0 da cena;
 * `from`: a partir de que segundo da cena (o som que entra no meio, depois de um toque).
 * Devolve uma função que corta tudo.
 */
export function scheduleOpeningSound({ ctx, out, t0, from = 0, sfx = 0.7 }) {
  const bus = ctx.createGain();
  bus.gain.value = Math.max(0.0001, sfx);
  bus.connect(out);
  const sources = [];
  const r = rngOf(77);
  const noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 1), ctx.sampleRate);
  const ch = noise.getChannelData?.(0);
  if (ch) for (let i = 0; i < ch.length; i += 1) ch[i] = Math.random() * 2 - 1;

  const at = (sceneT) => t0 + sceneT;
  const fresh = (sceneT) => sceneT >= from && at(sceneT) >= ctx.currentTime;

  /** Um envelope rápido: sobe em `attack` e cai a quase nada em `decay`. */
  const env = (gain, when, peak, attack, decay) => {
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  };

  const burst = (sceneT, { type = 'bandpass', freq = 2000, q = 1, peak = 0.2, attack = 0.002, decay = 0.05 } = {}) => {
    if (!fresh(sceneT)) return;
    const when = at(sceneT);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, when);
    filter.Q.value = q;
    const gain = ctx.createGain();
    env(gain, when, peak, attack, decay);
    src.connect(filter).connect(gain).connect(bus);
    src.start(when, r() * 0.5);
    src.stop(when + attack + decay + 0.05);
    sources.push(src);
  };

  const tone = (sceneT, { type = 'sine', freq = 440, to = null, peak = 0.1, attack = 0.003, decay = 0.1, glide = null } = {}) => {
    if (!fresh(sceneT)) return;
    const when = at(sceneT);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, when + (glide ?? attack + decay));
    const gain = ctx.createGain();
    env(gain, when, peak, attack, decay);
    osc.connect(gain).connect(bus);
    osc.start(when);
    osc.stop(when + attack + decay + 0.05);
    sources.push(osc);
  };

  // a gelada destampa: o gás saindo e a tampinha tinindo
  burst(BEATS.pop, { type: 'highpass', freq: 3200, q: 0.7, peak: 0.32, attack: 0.008, decay: 0.5 });
  tone(BEATS.pop + 0.02, { freq: 2900, peak: 0.09, decay: 0.22 });
  tone(BEATS.pop + 0.02, { freq: 4350, peak: 0.05, decay: 0.16 });
  tone(BEATS.chain - 0.005, { freq: 3700, peak: 0.08, decay: 0.07 });
  tone(BEATS.chain + 0.3, { freq: 3100, peak: 0.04, decay: 0.06 });

  // as pedras: um tec por pedra que encosta na seguinte; o surdo marca a onda a cada 8
  TILES.forEach((tile, i) => {
    const t = HIT_TIMES[i];
    const lift = 0.75 + (i / TILES.length) * 0.35;
    burst(t, { freq: 2300 + r() * 1700, q: 4, peak: 0.2 * lift, decay: 0.035 });
    tone(t, { freq: 1050 + r() * 520, peak: 0.07 * lift, decay: 0.04 });
    if (tile.rest === 90) tone(t + 0.12, { freq: 430, to: 300, peak: 0.12, decay: 0.09 });
    if (i % 8 === 0) tone(t, { freq: 92, to: 48, peak: 0.26, attack: 0.004, decay: 0.2, glide: 0.18 });
  });

  // a onda crescendo: um chiado que vai abrindo até a gigante
  {
    const start = Math.max(BEATS.chain, from);
    if (start < GIANT_HIT - 0.1 && at(start) >= ctx.currentTime) {
      const when = at(start);
      const end = at(GIANT_HIT);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 2;
      filter.frequency.setValueAtTime(500, when);
      filter.frequency.exponentialRampToValueAtTime(2600, end);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.05, end);
      gain.gain.linearRampToValueAtTime(0.0001, end + 0.12);
      src.connect(filter).connect(gain).connect(bus);
      src.start(when);
      src.stop(end + 0.2);
      sources.push(src);
    }
  }

  // o gato acorda e pula para a geladeira
  const jump = catJumpTime();
  if (jump != null) {
    tone(jump, { type: 'sawtooth', freq: 520, to: 840, peak: 0.05, attack: 0.03, decay: 0.16, glide: 0.12 });
    tone(jump + 0.15, { type: 'sawtooth', freq: 840, to: 470, peak: 0.045, attack: 0.01, decay: 0.2, glide: 0.2 });
  }

  // o carretão range, pende e bate no chão
  tone(GIANT_HIT, { type: 'sawtooth', freq: 120, to: 66, peak: 0.05, attack: 0.08, decay: 0.62, glide: 0.7 });
  tone(SLAM, { freq: 84, to: 31, peak: 0.62, attack: 0.004, decay: 0.75, glide: 0.6 });
  burst(SLAM, { type: 'lowpass', freq: 900, q: 0.8, peak: 0.42, attack: 0.003, decay: 0.38 });
  burst(SLAM, { type: 'highpass', freq: 2600, q: 0.7, peak: 0.2, attack: 0.002, decay: 0.06 });

  // o neon: um estalo e um zumbido curto a cada letra; depois o zumbido baixinho firme
  for (let k = 0; k < 8; k += 1) {
    const t = NEON_ON + (k * (NEON_FULL - NEON_ON)) / 9;
    burst(t, { freq: 5200, q: 3, peak: 0.07, decay: 0.02 });
    tone(t, { type: 'square', freq: 118, peak: 0.035, attack: 0.004, decay: 0.07 });
  }
  if (fresh(NEON_FULL)) {
    const when = at(NEON_FULL);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, when);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, when);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.014, when + 0.2);
    gain.gain.linearRampToValueAtTime(0.0001, at(SCENE_SECONDS));
    osc.connect(filter).connect(gain).connect(bus);
    osc.start(when);
    osc.stop(at(SCENE_SECONDS) + 0.1);
    sources.push(osc);
  }

  return () => {
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value || 0.0001, now);
    bus.gain.linearRampToValueAtTime(0.0001, now + 0.08);
    for (const src of sources) {
      try {
        src.stop(now + 0.1);
      } catch {
        /* já parou */
      }
    }
    setTimeout(() => bus.disconnect(), 200);
  };
}
