import { describe, expect, it } from 'vitest';
import { paintBust } from '../art/bustPixels.js';
import { paintProfile } from '../art/figProfile.js';
import { NPC_PORTRAITS, PORTRAITS } from '../art/portraitSpecs.js';
import { LANDSCAPE } from '../../engine/boardLayout.js';
import { LAND, RODA_SIDES, seatBust, sideSeat } from '../seatGeometry.js';

const same = (a, b) => a.data.every((v, i) => v === b.data[i]);
const opaque = (b) => {
  let n = 0;
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] > 200) n += 1;
  return n;
};

describe('versão 2.18: os personagens de lado e a roda com um jogador em cada lado', () => {
  it('todo personagem tem o perfil nos cinco humores; o da direita é o espelho', () => {
    for (const [id, spec] of Object.entries({ ...PORTRAITS, ...NPC_PORTRAITS })) {
      for (const mood of ['idle', 'thinking', 'smug', 'hurt', 'blink']) expect(opaque(paintProfile(spec, mood)), `${id}.${mood}`).toBeGreaterThan(2000);
      const right = paintProfile(spec, 'idle');
      const left = paintProfile(spec, 'idle', false, 'left');
      expect(same(right, left), id).toBe(false);
      for (let x = 0; x < right.w; x += 7) expect(left.data[(40 * right.w + (right.w - 1 - x)) * 4 + 3]).toBe(right.data[(40 * right.w + x) * 4 + 3]);
      expect(same(right, paintProfile(spec, 'idle', true)), id).toBe(false);
    }
    expect(same(paintBust(PORTRAITS.neide, 'idle'), paintBust(PORTRAITS.neide, 'idle', false, { profile: 'right' }))).toBe(false);
  });

  it('com 3 rivais: direita, frente e esquerda; os das laterais sentam fora do tampo', () => {
    expect(RODA_SIDES[3]).toEqual(['right', 'far', 'left']);
    expect(RODA_SIDES[2]).toEqual(['right', 'left']);
    expect(RODA_SIDES[1]).toEqual(['far']);
    const bust = seatBust(414, 0.34, 0.02);
    const l = sideSeat(896, 414, -1, bust);
    const r = sideSeat(896, 414, 1, bust);
    expect(l.x).toBeLessThan(896 / 2 - (896 * LAND.width) / 2);
    expect(r.x).toBeGreaterThan(896 / 2 + (896 * LAND.width) / 2);
    expect(l.x + r.x).toBe(896);
  });

  it('a mesa é quadrada: estreita, com 12 linhas de tampo', () => {
    expect(LAND.width).toBeLessThan(0.5);
    expect(LANDSCAPE.rows).toBe(12);
  });
});
