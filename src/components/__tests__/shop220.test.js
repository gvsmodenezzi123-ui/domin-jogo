import { describe, expect, it } from 'vitest';
import { PACK_DROP_RATES, PACK_IDS } from '../../data/packs.js';
import { sound } from '../../engine/audioSynth.js';
import { paintPortrait } from '../art/portraitPixels.js';
import { NPC_PORTRAITS } from '../art/portraitSpecs.js';
import * as shop from '../art/shopPixels.js';

const opaque = (b) => {
  let n = 0;
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] > 200) n += 1;
  return n;
};
const same = (a, b) => a.data.every((v, i) => v === b.data[i]);
const reds = (b) => {
  let n = 0;
  for (let i = 0; i < b.data.length; i += 4) if (b.data[i] > 220 && b.data[i + 1] < 90 && b.data[i + 2] < 90 && b.data[i + 3] > 200) n += 1;
  return n;
};

describe('versão 2.2: a loja, o beco e o porão pintados', () => {
  it('os três pacotes lacrados têm desenho próprio em 128×128', () => {
    const packs = PACK_IDS.map((id) => shop.paintPack(id));
    for (const b of packs) {
      expect(b.w).toBe(shop.PACK_PX);
      expect(b.h).toBe(shop.PACK_PX);
      expect(opaque(b)).toBeGreaterThan(5000);
      expect(opaque(b)).toBeLessThan(128 * 128 * 0.8);
    }
    expect(same(packs[0], packs[1])).toBe(false);
    expect(same(packs[1], packs[2])).toBe(false);
  });

  it('os fundos enchem o tamanho pedido (e o toldo é recortado embaixo)', () => {
    for (const [paint, w, h] of [
      [shop.paintShopWall, 195, 90],
      [shop.paintShelfRow, 180, 50],
      [shop.paintCounterFront, 180, 40],
      [shop.paintCellar, 180, 200],
      [shop.paintAlley, 195, 120],
      [shop.paintCoatLining, 180, 90],
    ]) {
      const b = paint(w, h);
      expect(b.w).toBe(w);
      expect(b.h).toBe(h);
      expect(opaque(b)).toBe(w * h);
    }
    const awning = shop.paintAwning(195, 44);
    expect(opaque(awning)).toBeLessThan(195 * 44);
    expect(awning.data[(43 * 195 + 7) * 4 + 3]).toBe(0); // a ponta da sanefa não chega no pé
    const plank = shop.paintRoughPlank(150, 30);
    expect(plank.data[3]).toBe(0); // canto arredondado
  });

  it('os objetos (almofada, nicho, alfinete, copo, moeda, caixote, papel) têm fundo transparente', () => {
    for (const b of [shop.paintCushion(), shop.paintNiche(), shop.paintPin(), shop.paintDiceCup(), shop.paintCoin(), shop.paintTiaoCrate()]) {
      expect(opaque(b)).toBeGreaterThan(20);
      expect(b.data[3]).toBe(0);
    }
    const kraft = shop.paintKraft();
    expect(opaque(kraft)).toBe(48 * 48);
    expect(same(kraft, shop.paintKraft(true))).toBe(false);
  });

  it('o Valtinho, o Seu Tião e o Corvo piscam; o Corvo apaga os olhos vermelhos', () => {
    for (const spec of Object.values(NPC_PORTRAITS)) {
      const open = paintPortrait(spec, spec.restMood, false, true);
      const shut = paintPortrait(spec, 'blink', false, true);
      expect(open.data[3]).toBe(0); // só a figura
      expect(same(open, shut)).toBe(false);
    }
    const corvo = NPC_PORTRAITS.corvo;
    expect(reds(paintPortrait(corvo, 'smug', false, true))).toBeGreaterThan(reds(paintPortrait(corvo, 'blink', false, true)));
  });

  it('as chances dos pacotes continuam as mesmas', () => {
    expect(PACK_DROP_RATES.macoParaguaio).toEqual({ comum: 0.65, raro: 0.25, lendario: 0.08, mitico: 0.02 });
    expect(PACK_DROP_RATES.sacoPedras).toEqual({ normal: 0.7, luxo: 0.3 });
    expect(PACK_DROP_RATES.engradadoJumbo).toEqual({ comum: 0.4, raro: 0.4, lendario: 0.17, mitico: 0.03 });
  });

  it('os sons novos existem e não quebram sem áudio', () => {
    for (const name of ['playPackShake', 'playPackBurst', 'playPackReveal', 'playLatch', 'playAsh', 'playShopBell', 'playNeonBuzz', 'playLightOn', 'playShelfTap']) {
      expect(typeof sound[name]).toBe('function');
      expect(() => sound[name]()).not.toThrow();
    }
  });
});
