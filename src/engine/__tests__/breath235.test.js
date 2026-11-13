import { describe, expect, it } from 'vitest';
import { BREATH_SECONDS, breathSamples } from '../breath.js';

const rms = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i += 1) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};

describe('Versão 2.35: a respiração do dano', () => {
  const rate = 16000;
  const x = breathSamples(rate);

  it('tem a duração certa, sem NaN e sem estourar', () => {
    expect(x.length).toBe(Math.round(BREATH_SECONDS * rate));
    let peak = 0;
    for (const v of x) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeLessThanOrEqual(0.9001);
    expect(peak).toBeGreaterThan(0.5);
  });

  it('é sempre a mesma (semente própria) e não mexe no aleatório do jogo', () => {
    const before = Math.random;
    let calls = 0;
    Math.random = () => {
      calls += 1;
      return before();
    };
    const y = breathSamples(rate);
    Math.random = before;
    expect(calls).toBe(0);
    expect(y).toEqual(x);
  });

  it('o fôlego, o ar preso e o ofegar que vai sumindo', () => {
    const at = (s) => Math.round(s * rate);
    const gasp = rms(x, at(0.1), at(0.55));
    const held = rms(x, at(0.72), at(0.94));
    const early = rms(x, at(1.0), at(2.0));
    const late = rms(x, at(BREATH_SECONDS - 1.2), at(BREATH_SECONDS - 0.2));
    expect(gasp).toBeGreaterThan(held * 8);
    expect(early).toBeGreaterThan(held * 8);
    expect(early).toBeGreaterThan(late * 3);
  });
});
