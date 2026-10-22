import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DUCK_HOLD,
  DUCK_LEVEL,
  MAX_VOICES,
  SHOP_MUSIC,
  SoundEngine,
  TENSE_CUTOFF,
  TRACKS,
  WARM_CUTOFF,
  stepDuration,
} from '../audioSynth.js';
import { BOSS_TRACKS, REGIONS } from '../../data/campaign.js';

// ---------------------------------------------------------------------------
// Web Audio de mentira: registra automações, conexões, start/stop e dispara onended
// ---------------------------------------------------------------------------

class FakeParam {
  constructor(value) {
    this.value = value;
    this.events = [];
  }
  setValueAtTime(v, t) {
    this.events.push(['set', v, t]);
    return this;
  }
  linearRampToValueAtTime(v, t) {
    this.events.push(['lin', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v, t) {
    // como no navegador: rampa exponencial até 0 (ou negativo) é erro
    if (!(v > 0)) throw new RangeError(`exponentialRamp até ${v}`);
    this.events.push(['exp', v, t]);
    return this;
  }
  setTargetAtTime(v, t, c) {
    this.events.push(['target', v, t, c]);
    return this;
  }
  cancelScheduledValues(t) {
    this.events.push(['cancel', t]);
    return this;
  }
}

class FakeNode {
  constructor(ctx, kind) {
    this.ctx = ctx;
    this.kind = kind;
    this.outputs = new Set();
    this.disconnected = false;
    ctx.nodes.push(this);
  }
  connect(target) {
    this.outputs.add(target);
    return target;
  }
  disconnect() {
    this.outputs.clear();
    this.disconnected = true;
  }
}

class FakeSource extends FakeNode {
  constructor(ctx, kind) {
    super(ctx, kind);
    this.frequency = new FakeParam(440);
    this.onended = null;
    this.ended = false;
  }
  start(t = this.ctx.currentTime) {
    this.startedAt = t;
    this.ctx.sources.push(this);
  }
  stop(t = this.ctx.currentTime) {
    if (this.startedAt === undefined) throw new Error('stop antes de start');
    this.stopAt = t;
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 8000;
    this.nodes = [];
    this.sources = [];
    this.destination = new FakeNode(this, 'destination');
  }
  resume() {
    return Promise.resolve();
  }
  createGain() {
    const n = new FakeNode(this, 'gain');
    n.gain = new FakeParam(1);
    return n;
  }
  createBiquadFilter() {
    const n = new FakeNode(this, 'filter');
    n.frequency = new FakeParam(350);
    n.Q = new FakeParam(1);
    n.type = 'lowpass';
    return n;
  }
  createDelay() {
    const n = new FakeNode(this, 'delay');
    n.delayTime = new FakeParam(0);
    return n;
  }
  createOscillator() {
    const osc = new FakeSource(this, 'osc');
    osc.detune = new FakeParam(0);
    return osc;
  }
  createWaveShaper() {
    const n = new FakeNode(this, 'shaper');
    n.curve = null;
    return n;
  }
  createBufferSource() {
    return new FakeSource(this, 'buffer');
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  /** Avança o relógio e dispara o onended de quem parou. */
  advance(seconds) {
    this.currentTime += seconds;
    for (const src of this.sources) {
      if (!src.ended && src.stopAt !== undefined && src.stopAt <= this.currentTime) {
        src.ended = true;
        src.onended?.();
      }
    }
  }
}

function engineWithFakeAudio() {
  globalThis.window = { AudioContext: FakeAudioContext };
  const engine = new SoundEngine();
  engine.isMuted = false;
  engine.init();
  return engine;
}

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.window;
});

describe('direção de áudio (Patch 0.5.4)', () => {
  it('saída geral passa por um passa-baixa quente em 2800 Hz com leve ressonância', () => {
    const engine = engineWithFakeAudio();
    expect(engine.warmth.type).toBe('lowpass');
    expect(engine.warmth.frequency.value).toBe(WARM_CUTOFF);
    expect(engine.warmth.Q.value).toBeGreaterThan(1);
    expect(engine.warmth.Q.value).toBeLessThan(3);
    // música e efeitos entram no filtro; o filtro vai ao master e o master à saída
    expect(engine.musicBus.outputs.has(engine.warmth)).toBe(true);
    expect(engine.sfxBus.outputs.has(engine.warmth)).toBe(true);
    expect(engine.warmth.outputs.has(engine.master)).toBe(true);
    expect(engine.master.outputs.has(engine.ctx.destination)).toBe(true);
  });

  it('a camada de tensão abre o filtro para 4500 Hz e fecha de volta', () => {
    const engine = engineWithFakeAudio();
    engine.setTension(true);
    expect(engine.warmth.frequency.events.at(-1).slice(0, 2)).toEqual(['target', TENSE_CUTOFF]);
    engine.setTension(false);
    expect(engine.warmth.frequency.events.at(-1).slice(0, 2)).toEqual(['target', WARM_CUTOFF]);
  });

  it('ducking: a música desce 30% (exponencial), segura 200 ms e volta ao nível', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    engine.playTrack('botecoJazz');
    engine.ctx.currentTime = 2;
    const level = engine.musicLevel();
    engine.playTileSlam(false);
    const events = engine.musicBus.gain.events;
    const exps = events.filter((e) => e[0] === 'exp');
    const [down, up] = exps.slice(-2);
    expect(down[1]).toBeCloseTo(level * DUCK_LEVEL, 6);
    expect(up[1]).toBeCloseTo(level, 6);
    const hold = events.filter((e) => e[0] === 'set').at(-1);
    expect(hold[2]).toBeCloseTo(2 + DUCK_HOLD, 6);
    engine.stopMusic();
  });

  it('no máximo 6 vozes (fontes soando) ao mesmo tempo, mesmo com efeitos em rajada', () => {
    const engine = engineWithFakeAudio();
    for (let i = 0; i < 40; i += 1) {
      engine.playTileSlam(i % 3 === 0, i % 5 === 0 ? 'ouro' : i % 7 === 0 ? 'cristal' : null);
      engine.playClick();
      engine.playVoiceBlip('tioZe');
      expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
      // cada voz conta as fontes que ela tem de verdade
      for (const v of engine.liveVoices()) expect(v.cost).toBe(v.sources.length);
    }
  });

  it('entrada do Dono e maletas (Patch 0.8.2): os efeitos novos tocam dentro da polifonia', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    engine.playTrack('bossFight');
    const before = engine.ctx.sources.length;
    const effects = ['playLightsFlicker', 'playHeartbeat', 'playThunder', 'playRuneIgnite', 'playDonoEyes', 'playCaseOpen', 'playCaseClose'];
    effects.forEach((name) => engine[name]());
    for (let i = 0; i < 120; i += 1) {
      vi.advanceTimersByTime(20);
      engine.ctx.advance(0.02);
      expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
    }
    expect(engine.ctx.sources.length - before).toBeGreaterThan(30);
    engine.stopMusic();
  });

  it('cada nota termina com stop, disconnect de todos os nós e sem referências', () => {
    const engine = engineWithFakeAudio();
    const before = engine.ctx.nodes.length;
    engine.playTileSlam(true, 'cristal');
    engine.playHeartHit();
    const created = engine.ctx.nodes.slice(before);
    expect(created.length).toBeGreaterThan(0);
    engine.ctx.advance(10);
    expect(engine.voices).toHaveLength(0);
    for (const node of created) {
      expect(node.disconnected).toBe(true);
      if (node instanceof FakeSource) expect(node.stopAt).toBeLessThanOrEqual(10);
    }
  });

  it('nota do baixo que vai ser cortada lá na frente soa até a próxima entrar, sem somar com ela', () => {
    const engine = engineWithFakeAudio();
    const at = engine.ctx.currentTime + 0.1;
    engine.bassNote(45, at, 1);
    engine.bassNote(47, at + 0.1, 1); // corta a anterior só em at + 0.1
    const [first] = engine.voices;
    expect(first.released).toBe(true);
    expect(first.end).toBeCloseTo(at + 0.12, 5); // segue soando até a segunda entrar
    // uma depois da outra: nunca as duas juntas
    expect(engine.liveCost()).toBe(1);
    for (let i = 0; i < 6; i += 1) engine.tone({ freq: 500 + i, dur: 1 });
    expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
  });

  it('polifonia (Patch 0.8.2): a nota agendada não corta na hora as que ainda estão tocando', () => {
    const engine = engineWithFakeAudio();
    const now = engine.ctx.currentTime;
    // 6 notas curtas tocando agora (acabam em ~0,08 s)
    for (let i = 0; i < 6; i += 1) engine.drum({ at: now + 0.005, freq: 2000, filter: 'bandpass', q: 1, peak: 0.1, dur: 0.05 });
    // a próxima leva, agendada para depois que elas acabam, não precisa cortar nenhuma
    for (let i = 0; i < 6; i += 1) engine.drum({ at: now + 0.1, freq: 2000, filter: 'bandpass', q: 1, peak: 0.1, dur: 0.05 });
    expect(engine.voices.filter((v) => v.released)).toHaveLength(0);
    // uma leva que entra no meio delas corta as mais velhas no instante em que entra
    engine.drum({ at: now + 0.04, freq: 2000, filter: 'bandpass', q: 1, peak: 0.1, dur: 0.02 });
    const cut = engine.voices.filter((v) => v.released);
    expect(cut).toHaveLength(1);
    expect(cut[0].end).toBeCloseTo(now + 0.06, 5);
    expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
  });

  it('a polifonia corta a voz mais velha da música antes de cortar um efeito', () => {
    const engine = engineWithFakeAudio();
    const at = engine.ctx.currentTime + 0.01;
    for (let i = 0; i < 4; i += 1) engine.drum({ at, freq: 2000, filter: 'bandpass', q: 1, peak: 0.1, dur: 2 });
    for (let i = 0; i < 4; i += 1) engine.tone({ freq: 440, dur: 2 });
    const live = engine.soundingVoices();
    expect(live).toHaveLength(MAX_VOICES);
    expect(live.filter((v) => v.priority === 0)).toHaveLength(2);
  });

  it('o sequenciador toca baixo e piano elétrico; a tensão soma hi-hats e acelera', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    engine.playTrack('botecoJazz');
    const oscsBefore = engine.ctx.sources.length;
    for (let i = 0; i < 40; i += 1) {
      vi.advanceTimersByTime(25);
      engine.ctx.advance(0.025);
    }
    const calm = engine.ctx.sources.slice(oscsBefore);
    expect(calm.some((s) => s.kind === 'osc')).toBe(true);
    const calmBuffers = calm.filter((s) => s.kind === 'buffer').length;

    engine.setTension(true);
    const tenseStart = engine.ctx.sources.length;
    for (let i = 0; i < 40; i += 1) {
      vi.advanceTimersByTime(25);
      engine.ctx.advance(0.025);
    }
    const tenseBuffers = engine.ctx.sources.slice(tenseStart).filter((s) => s.kind === 'buffer').length;
    expect(tenseBuffers).toBeGreaterThan(calmBuffers); // hi-hats em semicolcheia
    expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
    engine.stopMusic();
  });

  it('as faixas do jogo rodam a ~128 BPM com swing, a da Loja é mais lenta e a dos chefes mais rápida', () => {
    for (const name of ['botecoJazz', 'sinucaFunk']) expect(TRACKS[name].bpm).toBe(128);
    expect(TRACKS.bossFight.bpm).toBeGreaterThan(140);
    expect(TRACKS[SHOP_MUSIC].bpm).toBeLessThan(128);
    const t = TRACKS.botecoJazz;
    const pair = stepDuration(t, 0) + stepDuration(t, 1);
    expect(pair).toBeCloseTo((2 * 60) / 128 / 4, 6);
    expect(stepDuration(t, 0)).toBeGreaterThan(stepDuration(t, 1));
    expect(stepDuration(t, 0, 1.08)).toBeLessThan(stepDuration(t, 0));
  });

  it('chefes (Patch 0.8.2): faixa elétrica com serra saturada, arpejo, caixa, chimbal e o som aberto', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    engine.playTrack('bossFight');
    const before = engine.ctx.sources.length;
    for (let i = 0; i < 80; i += 1) {
      vi.advanceTimersByTime(25);
      engine.ctx.advance(0.025);
      expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
    }
    const played = engine.ctx.sources.slice(before);
    expect(played.some((s) => s.kind === 'osc' && s.type === 'sawtooth')).toBe(true);
    expect(played.some((s) => s.kind === 'osc' && s.type === 'square')).toBe(true);
    expect(played.filter((s) => s.kind === 'buffer').length).toBeGreaterThan(10); // chimbal e caixa
    expect(engine.ctx.nodes.some((n) => n.kind === 'shaper' && n.curve)).toBe(true);
    const target = engine.warmth.frequency.events.filter((e) => e[0] === 'target').at(-1);
    expect(target[1]).toBe(TRACKS.bossFight.cutoff);
    // voltar para o boteco fecha o som de novo
    engine.playTrack('botecoJazz');
    expect(engine.warmth.frequency.events.filter((e) => e[0] === 'target').at(-1)[1]).toBe(WARM_CUTOFF);
    engine.stopMusic();
  });

  it('entrada do Dono: a trilha cala e volta sozinha (ou na hora, ao pular)', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    engine.playTrack('bossFight');
    engine.hushMusic(5);
    expect(engine.musicLevel()).toBe(0);
    engine.ctx.advance(1);
    engine.hushMusic(0); // pulou a entrada
    expect(engine.musicLevel()).toBeGreaterThan(0);
    const last = engine.musicBus.gain.events.filter((e) => e[0] === 'exp').at(-1);
    expect(last[1]).toBeCloseTo(engine.musicLevel(), 5);
    engine.stopMusic();
  });

  it('cada chefe tem a sua trilha (Patch 0.9.0), diferente das regiões, e todas cabem na polifonia', () => {
    const tracks = Object.values(BOSS_TRACKS);
    expect(new Set(tracks).size).toBe(tracks.length);
    for (const region of REGIONS) expect(tracks).not.toContain(region.music);
    const styles = tracks.map((name) => TRACKS[name].style);
    expect(new Set(styles).size).toBe(tracks.length);
    vi.useFakeTimers();
    for (const name of tracks) {
      const engine = engineWithFakeAudio();
      engine.playTrack(name);
      const before = engine.ctx.sources.length;
      for (let i = 0; i < 160; i += 1) {
        vi.advanceTimersByTime(25);
        engine.ctx.advance(0.025);
        expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
      }
      // 4 s de música: muita nota agendada, sem nada estourar
      expect(engine.ctx.sources.length - before).toBeGreaterThan(40);
      engine.stopMusic();
    }
  });

  it('a nota menos importante da trilha fica de fora em vez de cortar o pad ou o baixo', () => {
    const engine = engineWithFakeAudio();
    const at = engine.ctx.currentTime + 0.01;
    // 6 vozes de efeito (mais importantes que a trilha) ocupando tudo
    for (let i = 0; i < 6; i += 1) engine.tone({ freq: 300 + i, dur: 1 });
    const before = engine.voices.length;
    engine.drum({ at, freq: 9000, filter: 'highpass', q: 1, peak: 0.1, dur: 0.03 });
    expect(engine.voices.length).toBe(before);
    expect(engine.voices.every((v) => !v.released)).toBe(true);
  });

  it('vitória: a trilha sai, a fanfarra toca e a faixa da Loja só entra depois', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    engine.playTrack('botecoJazz');
    engine.ctx.currentTime = 5;
    engine.playVictory();
    expect(engine.musicLevel()).toBe(0);
    engine.playTrack(SHOP_MUSIC);
    expect(engine.seq.name).toBe(SHOP_MUSIC);
    expect(engine.seq.next).toBeGreaterThanOrEqual(engine.musicHoldUntil);
    // a entrada da Loja sobe do silêncio a partir do fim da fanfarra
    const rise = engine.musicBus.gain.events.filter((e) => e[0] === 'exp').at(-1);
    expect(rise[2]).toBeGreaterThan(engine.musicHoldUntil);
    engine.stopMusic();
  });

  it('mudo corta tudo e não deixa nós tocando', () => {
    const engine = engineWithFakeAudio();
    engine.playTileSlam(false, 'rubi');
    expect(engine.voices.length).toBeGreaterThan(0);
    engine.toggleMute();
    // tudo cortado na hora (só o fade de 15 ms) e desmontado quando para
    expect(engine.soundingVoices()).toHaveLength(0);
    engine.ctx.advance(0.1);
    expect(engine.voices).toHaveLength(0);
    expect(engine.isPlayingMusic).toBe(false);
    engine.toggleMute(); // desmutar volta a trilha
    expect(engine.isPlayingMusic).toBe(true);
    engine.stopMusic();
  });
});

describe('Patch 0.9.3: sons novos e efeitos em 0%', () => {
  it('virar página, deslizar maleta e o pesadelo do Balcão cabem nas 6 vozes', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    for (const play of [() => engine.playPageTurn(), () => engine.playCaseSlide(), () => engine.playDread(1), () => engine.playDread(2)]) {
      play();
      expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
      vi.advanceTimersByTime(2000);
      expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
    }
  });

  it('com os efeitos em 0% nenhum som estoura a rampa exponencial', () => {
    vi.useFakeTimers();
    const engine = engineWithFakeAudio();
    engine.setVolumes({ sfx: 0 });
    const names = Object.getOwnPropertyNames(SoundEngine.prototype).filter((n) => n.startsWith('play') && n !== 'playTrack');
    expect(names.length).toBeGreaterThan(30);
    for (const name of names) {
      engine[name]();
      vi.advanceTimersByTime(3000);
    }
    expect(engine.liveCost()).toBeLessThanOrEqual(MAX_VOICES);
  });
});

describe('Patch 0.9.4: batida de pedra não acumula nós de áudio', () => {
  it('cada batida termina e solta (disconnect) todos os nós em até ~120 ms', () => {
    const engine = engineWithFakeAudio();
    for (let i = 0; i < 30; i += 1) {
      engine.ctx.currentTime = i * 0.05;
      engine.playTileSlam(i % 4 === 0, null);
      for (const v of engine.voices) expect(v.end - v.born).toBeLessThanOrEqual(0.121);
    }
  });
});
