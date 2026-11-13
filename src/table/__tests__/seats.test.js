import { describe, expect, it } from 'vitest';
import { SEAT_COLORS, bubbleText, colorOf, ordinal, plateName, seatsFrom } from '../seats.js';

const seats = ['s0', 's1', 's2', 's3'].map((id) => ({ id }));

describe('HUD da mesa: cadeiras', () => {
  it('a bancada começa em quem joga depois de você e segue a ordem da mesa', () => {
    expect(seatsFrom(seats, 's0').map((s) => s.id)).toEqual(['s0', 's1', 's2', 's3']);
    expect(seatsFrom(seats, 's2').map((s) => s.id)).toEqual(['s2', 's3', 's0', 's1']);
  });

  it('cada cadeira tem a sua cor fixa, pela ordem em que sentou', () => {
    expect(colorOf({ seats }, 's0')).toBe(SEAT_COLORS[0]);
    expect(colorOf({ seats }, 's3')).toBe(SEAT_COLORS[3]);
    expect(new Set(SEAT_COLORS).size).toBe(5);
  });

  it('o balão da última jogada diz o que a pessoa fez', () => {
    expect(bubbleText({ kind: 'play', tileId: '3-6' })).toBe('JOGOU 3|6');
    expect(bubbleText({ kind: 'draw', count: 1 })).toBe('COMPROU');
    expect(bubbleText({ kind: 'draw', count: 3 })).toBe('COMPROU 3');
    expect(bubbleText({ kind: 'pass', cost: 3 })).toBe('PASSOU −$3');
    expect(bubbleText({ kind: 'pass', cost: 0 })).toBe('PASSOU');
    expect(bubbleText(null)).toBe(null);
  });

  it('a plaquinha corta nomes compridos e a colocação sai com º', () => {
    expect(plateName('Neide')).toBe('NEIDE');
    expect(plateName('Marquinhos da Van')).toBe('MARQUINH.');
    expect(ordinal(1)).toBe('1º');
  });
});
