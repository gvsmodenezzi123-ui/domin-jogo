import { describe, expect, it } from 'vitest';
import { RELICS } from '../../data/relics.js';
import { RIVALS, TUTOR_ID, getRival } from '../../data/rivals.js';
import { PORTRAIT_PX, paintPortrait } from '../art/portraitPixels.js';
import { PORTRAIT_EMBER, PORTRAITS } from '../art/portraitSpecs.js';
import { RELIC_ICON_KEYS, RELIC_PX, paintRelic } from '../art/relicPixels.js';

const opaque = (b) => {
  let n = 0;
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] > 200) n += 1;
  return n;
};
const same = (a, b) => a.data.every((v, i) => v === b.data[i]);

describe('versão 2.1: retratos 64×64 dos rivais', () => {
  it('todo rival (e o Vô Juca) tem retrato que enche a foto inteira, nos 4 humores', () => {
    const arts = [...Object.values(RIVALS).map((r) => r.art), getRival(TUTOR_ID).art];
    for (const art of arts) {
      expect(PORTRAITS[art], art).toBeTruthy();
      for (const mood of ['idle', 'thinking', 'smug', 'hurt']) {
        const b = paintPortrait(PORTRAITS[art], mood);
        expect(b.w, art).toBe(PORTRAIT_PX);
        expect(b.h, art).toBe(PORTRAIT_PX);
        // sem buraco: a parede de cada um vai até a borda da polaroide
        expect(opaque(b), `${art}.${mood}`).toBe(PORTRAIT_PX * PORTRAIT_PX);
      }
    }
  });

  it('cada rival tem a cara dele, a boca abre falando e o humor muda o rosto', () => {
    const idle = Object.values(PORTRAITS).map((spec) => paintPortrait(spec, 'idle'));
    for (let i = 0; i < idle.length; i += 1) for (let j = i + 1; j < idle.length; j += 1) expect(same(idle[i], idle[j])).toBe(false);
    const spec = PORTRAITS.neide;
    expect(same(paintPortrait(spec, 'idle'), paintPortrait(spec, 'idle', true))).toBe(false);
    expect(same(paintPortrait(spec, 'idle'), paintPortrait(spec, 'hurt'))).toBe(false);
    // o desenho é puro: pintar de novo dá o mesmo
    expect(same(paintPortrait(spec, 'smug'), paintPortrait(spec, 'smug'))).toBe(true);
  });

  it('a silhueta (bare) pinta só a figura, sem a parede', () => {
    const b = paintPortrait(PORTRAITS.comendador, 'idle', false, true);
    expect(b.data[3]).toBe(0); // canto vazio
    expect(opaque(b)).toBeGreaterThan(1200);
  });

  it('quem fuma solta fumaça da brasa, menos ferido (o cigarro cai)', () => {
    expect(PORTRAIT_EMBER.tioZe.grid).toBe(64);
    expect(PORTRAIT_EMBER.tioZe.moods).not.toContain('hurt');
    expect(PORTRAIT_EMBER.comendador.moods).not.toContain('hurt');
  });
});

describe('versão 2.1: talismãs 32×32', () => {
  it('os 58 talismãs têm desenho próprio, todos diferentes', () => {
    const arts = Object.values(RELICS).map((r) => r.art);
    expect(arts.length).toBe(58);
    const painted = Object.values(RELICS).map((r) => {
      expect(RELIC_ICON_KEYS, r.id).toContain(r.art);
      const b = paintRelic(r.art, r.rarity);
      expect(b.w).toBe(RELIC_PX);
      // o objeto ocupa boa parte do quadro e o fundo fica transparente
      expect(opaque(b), r.id).toBeGreaterThan(110);
      expect(opaque(b), r.id).toBeLessThan(RELIC_PX * RELIC_PX * 0.85);
      return b;
    });
    for (let i = 0; i < painted.length; i += 1) for (let j = i + 1; j < painted.length; j += 1) expect(same(painted[i], painted[j])).toBe(false);
  });

  it('a raridade deixa a marca: névoa no necrótico, faísca no mítico', () => {
    const plain = paintRelic('ossoEnsanguentado');
    const necro = paintRelic('ossoEnsanguentado', 'necrotico');
    expect(same(plain, necro)).toBe(false);
    expect(same(paintRelic('barbante'), paintRelic('barbante', 'mitico'))).toBe(false);
    expect(paintRelic('naoExiste')).toBe(null);
  });
});
