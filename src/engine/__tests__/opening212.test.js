import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scheduleOpeningSound } from '../../opening/openingAudio.js';
import { BEATS, CAM_END, GIANT_HIT, HIT_TIMES, PANO_W, SCENE_SECONDS, SLAM, TILES, VIEW_W, cameraX, capAt, catAt, giantAngle, neonAt, tileAngle } from '../../opening/openingPlan.js';

/**
 * Contexto de áudio de mentira que, como o Web Audio de verdade, recusa tempo negativo
 * (setValueAtTime, rampas, start, stop). Qualquer nó tem qualquer parâmetro.
 */
function fakeContext(currentTime = 0) {
  const calls = { scheduled: 0, minTime: Infinity };
  const check = (t) => {
    if (!Number.isFinite(t) || t < 0) throw new RangeError(`Time must be a finite non-negative number: ${t}`);
    calls.scheduled += 1;
    calls.minTime = Math.min(calls.minTime, t);
  };
  const param = () => ({
    value: 0,
    setValueAtTime: (_, t) => check(t),
    linearRampToValueAtTime: (_, t) => check(t),
    exponentialRampToValueAtTime: (_, t) => check(t),
    setTargetAtTime: (_, t) => check(t),
    cancelScheduledValues: (t) => check(t),
  });
  const node = () => {
    const base = {
      connect: (to) => to,
      disconnect: () => {},
      start: (t = 0) => check(t),
      stop: (t = 0) => check(t),
      addEventListener: () => {},
      buffer: null,
      loop: false,
      type: 'sine',
    };
    return new Proxy(base, {
      get(target, key) {
        if (!(key in target) && typeof key === 'string') target[key] = param();
        return target[key];
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    });
  };
  const ctx = {
    currentTime,
    sampleRate: 8000,
    state: 'running',
    destination: node(),
    createBuffer: (channels, length, sampleRate) => ({
      duration: length / sampleRate,
      numberOfChannels: channels,
      getChannelData: () => new Float32Array(length),
    }),
  };
  for (const name of ['createGain', 'createDynamicsCompressor', 'createConvolver', 'createBufferSource', 'createBiquadFilter', 'createOscillator', 'createStereoPanner', 'createDelay', 'createWaveShaper', 'createConstantSource']) {
    ctx[name] = () => node();
  }
  return { ctx, calls };
}

describe('Versão 2.12: a abertura deitada (Efeito Dominó)', () => {
  it('a fileira cai em ordem, embalando, e termina na pedra gigante antes do neon', () => {
    expect(TILES.length).toBeGreaterThan(100);
    for (let i = 1; i < HIT_TIMES.length; i += 1) expect(HIT_TIMES[i]).toBeGreaterThan(HIT_TIMES[i - 1]);
    const first = HIT_TIMES[1] - HIT_TIMES[0];
    const last = HIT_TIMES.at(-1) - HIT_TIMES.at(-2);
    expect(last).toBeLessThan(first);
    expect(HIT_TIMES[0]).toBe(BEATS.chain);
    expect(GIANT_HIT).toBeGreaterThan(HIT_TIMES.at(-1));
    expect(SLAM).toBeGreaterThan(GIANT_HIT);
    expect(SCENE_SECONDS).toBeGreaterThan(SLAM + 2);
    expect(SCENE_SECONDS).toBeLessThan(13);
  });

  it('cada pedra fica em pé até a vez dela e depois deita até o descanso', () => {
    TILES.forEach((tile, i) => {
      expect(tileAngle(i, HIT_TIMES[i] - 0.01)).toBe(0);
      expect(tileAngle(i, SCENE_SECONDS)).toBeCloseTo(tile.rest, 5);
    });
    expect(giantAngle(GIANT_HIT)).toBe(0);
    expect(giantAngle(SLAM)).toBeCloseTo(90, 5);
  });

  it('a câmera só anda para a frente, não sai do salão e para no neon', () => {
    let prev = cameraX(0);
    expect(prev).toBe(0);
    for (let t = 0; t <= SCENE_SECONDS; t += 0.05) {
      const x = cameraX(t);
      expect(x).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(x + VIEW_W).toBeLessThanOrEqual(PANO_W);
      prev = x;
    }
    expect(cameraX(SCENE_SECONDS)).toBeCloseTo(CAM_END, 5);
  });

  it('a tampinha voa até a primeira pedra; o gato pula; o neon acende só depois da batida', () => {
    expect(capAt(BEATS.pop - 0.01)).toBeNull();
    const hit = capAt(BEATS.chain);
    expect(Math.abs(hit.x - TILES[0].x)).toBeLessThan(3);
    expect(catAt(0).pose).toBe('sleep');
    expect(catAt(SCENE_SECONDS).pose).toBe('perch');
    expect(neonAt(SLAM).glow).toBe(0);
    expect(neonAt(SCENE_SECONDS).letters).toBe(7);
    expect(neonAt(SCENE_SECONDS).sub).toBe(1);
  });

  it('o som entra no meio da cena sem agendar nada no passado', () => {
    for (const now of [0, 0.6, 4.1, 8.5, SLAM + 0.5]) {
      const { ctx, calls } = fakeContext(0.01);
      const t0 = ctx.currentTime - now + 0.03;
      expect(() => scheduleOpeningSound({ ctx, out: ctx.destination, t0, from: now })).not.toThrow();
      expect(calls.scheduled).toBeGreaterThan(0);
      expect(calls.minTime).toBeGreaterThanOrEqual(0);
    }
  });

  it('o jogo começa pelo toque de entrada, que deita a tela; a abertura antiga saiu', () => {
    const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
    expect(app).toContain('{!entered && <AccessGate onEnter={enter} />}');
    expect(app).toContain('{entered && opening.on && <OpeningScene');
    expect(app).not.toContain('IntroScene');
    const gate = readFileSync(new URL('../../opening/AccessGate.jsx', import.meta.url), 'utf8');
    expect(gate).toContain('enterLandscape();');
    const lock = readFileSync(new URL('../../components/landscapeLock.js', import.meta.url), 'utf8');
    expect(lock).toContain("orientation?.lock?.('landscape')");
  });

  it('a bucha não pisca mais a mesa inteira de branco', () => {
    const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
    expect(app).not.toContain('flashOver');
    const juice = readFileSync(new URL('../../components/juice.js', import.meta.url), 'utf8');
    expect(juice).not.toContain('juice-flash');
  });
});
