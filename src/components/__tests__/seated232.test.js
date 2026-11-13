import { describe, expect, it } from 'vitest';
import { SEATED_H, SEATED_W, paintProfile, paintSeatedProfile } from '../art/figProfile.js';
import { paintSeatedBust } from '../art/bustPixels.js';
import { NPC_PORTRAITS, PORTRAITS } from '../art/portraitSpecs.js';
import { SEATED_HAND, landCorners, seatBust, seatUnit, sideFigure } from '../seatGeometry.js';

const opaque = (b) => {
  let n = 0;
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] > 200) n += 1;
  return n;
};
const same = (a, b) => a.data.every((v, i) => v === b.data[i]);

describe('versão 2.32: quem senta nas laterais da roda, de corpo inteiro na cadeira', () => {
  it('todo personagem tem o corpo sentado nos cinco humores, nas duas cadeiras; o da direita é o espelho', () => {
    for (const [id, spec] of Object.entries({ ...PORTRAITS, ...NPC_PORTRAITS })) {
      for (const mood of ['idle', 'thinking', 'smug', 'hurt', 'blink']) {
        const k = paintSeatedProfile(spec, mood);
        expect([k.w, k.h]).toEqual([SEATED_W, SEATED_H]);
        // bem mais que o busto: o corpo, as pernas e a cadeira
        expect(opaque(k), `${id}.${mood}`).toBeGreaterThan(opaque(paintProfile(spec, mood)) + 2500);
      }
      const right = paintSeatedProfile(spec, 'idle', false, 'right');
      const left = paintSeatedProfile(spec, 'idle', false, 'left');
      for (let x = 0; x < SEATED_W; x += 5) expect(left.data[(100 * SEATED_W + (SEATED_W - 1 - x)) * 4 + 3]).toBe(right.data[(100 * SEATED_W + x) * 4 + 3]);
      expect(same(right, paintSeatedProfile(spec, 'idle', true)), id).toBe(false);
      expect(same(right, paintSeatedProfile(spec, 'idle', false, 'right', 'plastico')), id).toBe(false);
    }
    // a silhueta (o adversário sem retrato) também senta
    expect(opaque(paintSeatedBust(PORTRAITS.tioZe, 'idle', false, { silhouette: true }))).toBeGreaterThan(4000);
  }, 60000);

  it('a cabeça fica no mesmo lugar do busto e a mão chega na beirada do tampo', () => {
    for (const [w, h] of [
      [896, 414],
      [844, 390],
      [667, 375],
    ]) {
      const bust = seatBust(h, 0.34, 0.02);
      const unit = seatUnit(h);
      const c = landCorners(w, h);
      for (const side of [-1, 1]) {
        const f = sideFigure(w, h, side, bust, unit);
        const k = bust.w / 88;
        expect(f.fig.w).toBe(Math.round(SEATED_W * k));
        expect(f.fig.h).toBe(Math.round(SEATED_H * k));
        // o crânio (coluna 40 do perfil) no mesmo x do busto
        const skull = side < 0 ? f.fig.left + 40 * k : f.fig.left + (SEATED_W - 1 - 40) * k;
        const bustSkull = side < 0 ? f.x - bust.w / 2 + 40 * k : f.x - bust.w / 2 + (88 - 1 - 40) * k;
        expect(Math.abs(skull - bustSkull)).toBeLessThan(1.5);
        // a mão encosta na beirada de lado (menos de uma pedra de distância)
        expect(Math.abs(f.hand.x - c.xAt(f.hand.y, side))).toBeLessThan(unit * 2.2);
        // a fileira das pedras: no tampo, para dentro da beirada, subindo para o lado de lá
        expect(side < 0 ? f.lane.x > c.xAt(f.lane.y, side) : f.lane.x < c.xAt(f.lane.y, side)).toBe(true);
        expect(f.lane.dy).toBeLessThan(0);
        expect(Math.sign(f.lane.dx)).toBe(-side);
        const far = { x: f.lane.x + f.lane.dx * 8, y: f.lane.y + f.lane.dy * 8 };
        expect(far.y).toBeGreaterThan(c.yFar);
        expect(side < 0 ? far.x > c.xAt(far.y, side) : far.x < c.xAt(far.y, side)).toBe(true);
        expect(f.clip).toContain(`${h}px`);
      }
      // os dois lados são o espelho um do outro
      const l = sideFigure(w, h, -1, bust, unit);
      const r = sideFigure(w, h, 1, bust, unit);
      expect(Math.abs(l.fig.left + r.fig.left + l.fig.w - w)).toBeLessThan(2);
      expect(Math.abs(l.lane.x + r.lane.x - w)).toBeLessThan(2);
    }
    expect(SEATED_HAND.y).toBeGreaterThan(70);
  }, 30000);
});
