import { describe, expect, it } from 'vitest';
import { BUST_H, BUST_MOUTH, BUST_RAIL, BUST_W, paintBust } from '../art/bustPixels.js';
import { FIG_H, FIG_W, paintFigure } from '../art/figurePixels.js';
import { NPC_PORTRAITS, PORTRAIT_GLOW, PORTRAITS } from '../art/portraitSpecs.js';
import { LAND, seatBust } from '../seatGeometry.js';

const same = (a, b) => a.data.every((v, i) => v === b.data[i]);
const opaque = (b) => {
  let n = 0;
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] > 200) n += 1;
  return n;
};

describe('versão 2.17: os personagens refeitos (figura 88×84)', () => {
  it('todo personagem pinta nos cinco humores e falando, com contorno e fundo vazio', () => {
    for (const [id, spec] of Object.entries({ ...PORTRAITS, ...NPC_PORTRAITS })) {
      for (const mood of ['idle', 'thinking', 'smug', 'hurt', 'blink']) {
        const b = paintFigure(spec, mood);
        expect(b.w, id).toBe(FIG_W);
        expect(b.h, id).toBe(FIG_H);
        expect(b.data[3], id).toBe(0);
        expect(opaque(b), `${id}.${mood}`).toBeGreaterThan(2200);
      }
      expect(same(paintFigure(spec, 'idle'), paintFigure(spec, 'idle', true)), id).toBe(false);
      expect(same(paintFigure(spec, 'idle'), paintFigure(spec, 'idle')), id).toBe(true);
    }
  });

  it('o busto da mesa é a figura inteira; a mesa corta abaixo dos ombros', () => {
    const b = paintBust(PORTRAITS.neide, 'idle');
    expect([b.w, b.h]).toEqual([BUST_W, BUST_H]);
    expect(BUST_MOUTH).toBeLessThan(BUST_RAIL);
    const seat = seatBust(390);
    expect(seat.drop).toBeGreaterThan(0);
    expect(seat.mouth).toBeGreaterThan(0);
  });

  it('o chefe secreto tem os dois olhos que brilham', () => {
    expect(PORTRAIT_GLOW.donoDaNoite.eyes).toHaveLength(2);
    expect(PORTRAITS.donoDaNoite).toBeTruthy();
  });

  it('a mesa ficou mais quadrada (mais funda, mais estreita)', () => {
    expect(LAND.near - LAND.far).toBeGreaterThanOrEqual(0.5);
    expect(LAND.width).toBeLessThan(0.7);
  });
});
