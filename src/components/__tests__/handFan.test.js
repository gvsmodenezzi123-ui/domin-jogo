import { describe, expect, it } from 'vitest';
import { computeFan } from '../handFan.js';

describe('leque da mão', () => {
  it('7 pedras: o arco da referência (centro reto, ±6,4°, ±12,8°, ±19,2°), com as pontas mais baixas', () => {
    const { unit, spots } = computeFan(7, 374);
    expect(unit).toBe(44);
    expect(spots.map((s) => Math.round(s.angle * 10) / 10)).toEqual([-19.2, -12.8, -6.4, 0, 6.4, 12.8, 19.2]);
    expect(spots[3].drop).toBe(0);
    expect(spots[0].drop).toBe(spots[6].drop);
    expect(spots[0].drop).toBeGreaterThan(spots[1].drop);
    expect(spots[1].drop).toBeGreaterThan(spots[2].drop);
  });

  /** Extremos (x) dos cantos de cada pedra girada em torno do centro. */
  const extent = ({ unit, spots }) =>
    spots.map((s) => {
      const r = (s.angle * Math.PI) / 180;
      const xs = [-unit / 2, unit / 2].flatMap((dx) => [unit, -unit].map((dy) => s.x + dx * Math.cos(r) - dy * Math.sin(r)));
      return { min: Math.min(...xs), max: Math.max(...xs) };
    });

  it('7 pedras: simétrico, quase encostadas e sem sair da tela', () => {
    const fan = computeFan(7, 382);
    const { unit, spots } = fan;
    expect(spots[0].x).toBeCloseTo(-spots[6].x);
    for (let i = 1; i < spots.length; i += 1) expect(spots[i].x - spots[i - 1].x).toBeCloseTo(unit * 0.94, 5);
    for (const e of extent(fan)) {
      expect(e.min).toBeGreaterThanOrEqual(-382 / 2);
      expect(e.max).toBeLessThanOrEqual(382 / 2);
    }
  });

  it('mão grande encolhe e aproxima as pedras, sem sair da tela', () => {
    const fan = computeFan(14, 382);
    expect(fan.unit).toBeLessThan(44);
    expect(Math.max(...fan.spots.map((s) => Math.abs(s.angle)))).toBeLessThanOrEqual(26);
    for (const e of extent(fan)) {
      expect(e.min).toBeGreaterThanOrEqual(-382 / 2);
      expect(e.max).toBeLessThanOrEqual(382 / 2);
    }
  });

  it('uma pedra fica reta no centro', () => {
    expect(computeFan(1, 374).spots).toEqual([{ x: 0, angle: 0, drop: 0 }]);
  });
});
