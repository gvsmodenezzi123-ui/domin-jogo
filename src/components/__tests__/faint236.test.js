import { describe, expect, it } from 'vitest';
import { paintProfile } from '../art/figProfile.js';
import { paintFigure } from '../art/figurePixels.js';
import { NPC_PORTRAITS, PORTRAITS } from '../art/portraitSpecs.js';

const same = (a, b) => a.data.every((v, i) => v === b.data[i]);

describe('versão 2.36: quem perdeu as vidas desmaia na cadeira', () => {
  it('todo personagem tem o rosto desmaiado, de frente e de lado, diferente do de olho fechado', () => {
    for (const [id, spec] of Object.entries({ ...PORTRAITS, ...NPC_PORTRAITS })) {
      const front = paintFigure(spec, 'out');
      expect(same(front, paintFigure(spec, 'idle')), id).toBe(false);
      expect(same(front, paintFigure(spec, 'blink')), id).toBe(false);
      const side = paintProfile(spec, 'out');
      expect(same(side, paintProfile(spec, 'idle')), id).toBe(false);
      expect(same(side, paintProfile(spec, 'blink')), id).toBe(false);
    }
  }, 30000);
});
