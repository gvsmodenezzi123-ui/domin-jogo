import { describe, expect, it } from 'vitest';
import { scheduleIntroSound, scheduleRadio } from '../../intro/introAudio.js';

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

describe('Patch 1.1: o som da abertura entrando atrasado', () => {
  it('o toque destravou o áudio no meio da cena: nada é agendado com tempo negativo', () => {
    // o contexto acabou de rodar (currentTime perto de 0) e a cena já está em 4 s
    for (const now of [0.6, 4.1, 9.5]) {
      const { ctx, calls } = fakeContext(0.01);
      const t0 = ctx.currentTime - now + 0.03;
      expect(() => scheduleIntroSound({ ctx, out: ctx.destination, t0, from: now })).not.toThrow();
      expect(() => scheduleRadio({ ctx, out: ctx.destination, t0, from: now })).not.toThrow();
      expect(calls.scheduled).toBeGreaterThan(0);
      expect(calls.minTime).toBeGreaterThanOrEqual(0);
    }
  });

  it('desde o começo continua igual (tudo no horário da cena)', () => {
    const { ctx, calls } = fakeContext(2);
    scheduleIntroSound({ ctx, out: ctx.destination, t0: 2.03, from: 0 });
    expect(calls.minTime).toBeGreaterThanOrEqual(2);
  });
});
