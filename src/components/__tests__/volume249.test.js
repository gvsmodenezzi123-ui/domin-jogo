import { describe, expect, it } from 'vitest';
import { NOVO_PX, NOVO_VARS } from '../art/novoVolume.js';
import { hasNovoBack, loadNovoBack, novoBack } from '../art/novoBacks.js';

/** O cabeçalho de um PNG em data URL (largura, altura) e os nomes dos pedaços dele. */
function pngInfo(url) {
  const PREFIX = 'data:image/png;base64,';
  expect(url.startsWith(PREFIX)).toBe(true);
  const bin = atob(url.slice(PREFIX.length));
  const u32 = (i) => ((bin.charCodeAt(i) << 24) | (bin.charCodeAt(i + 1) << 16) | (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3)) >>> 0;
  expect(bin.slice(12, 16)).toBe('IHDR');
  const chunks = [];
  for (let i = 8; i + 8 <= bin.length; i += 12 + u32(i)) chunks.push(bin.slice(i + 4, i + 8));
  return { w: u32(16), h: u32(20), chunks };
}

describe('Versão 2.49: as peças das lojas em volume (art/novoVolume.js)', () => {
  it('o CSS das lojas só pede peças que existem, e as 9 fatias cabem', () => {
    for (const name of ['woodbrass', 'niche', 'cushion', 'showcase', 'wood-bm', 'inset-bm', 'woodred-bm', 'blood', 'niche-bm', 'showcase-bm', 'chain']) {
      expect(NOVO_VARS).toContain(name);
      expect(NOVO_PX[name], name).toBeTruthy();
    }
    for (const [name, slice] of [
      ['woodbrass', 12],
      ['niche', 10],
      ['wood-bm', 10],
      ['inset-bm', 8],
      ['woodred-bm', 12],
      ['blood', 12],
    ])
      expect(Math.min(NOVO_PX[name].w, NOVO_PX[name].h), name).toBeGreaterThan(slice * 2);
    // as vitrines têm o tamanho do CSS (140 × 136); a almofada, 44 × 12; a correntinha, 6 × 20
    for (const name of ['showcase', 'showcase-bm']) expect([NOVO_PX[name].w, NOVO_PX[name].h]).toEqual([140, 136]);
    expect([NOVO_PX.cushion.w, NOVO_PX.cushion.h]).toEqual([44, 12]);
    expect([NOVO_PX.chain.w, NOVO_PX.chain.h]).toEqual([6, 20]);
  });

  it('o Seu Tião tem a caixa de ferramentas e a moeda de 24', () => {
    for (const name of ['toolbox', 'coin24']) {
      const png = pngInfo(NOVO_PX[name].url);
      expect([png.w, png.h]).toEqual([NOVO_PX[name].w, NOVO_PX[name].h]);
    }
    expect([NOVO_PX.coin24.w, NOVO_PX.coin24.h]).toEqual([24, 24]);
  });
});

describe('Versão 2.49: os fundos das lojas (art/novoBacks.js)', () => {
  it('a loja e o Mercado Negro chegam inteiros (896 × 414) e com a faixa do balcão por cima', async () => {
    for (const [name, w, h, hole] of [
      ['shop', 896, 414, false],
      ['shopFront', 896, 70, true],
      ['black', 896, 414, false],
      ['blackFront', 896, 28, true],
    ]) {
      expect(hasNovoBack(name), name).toBe(true);
      const url = await loadNovoBack(name);
      const png = pngInfo(url);
      expect([png.w, png.h], name).toEqual([w, h]);
      expect(png.chunks.includes('tRNS'), name).toBe(hole);
      expect(url.length, name).toBeLessThan(200 * 1024);
      expect(novoBack(name)).toBe(url);
    }
  });

  it('o porão do Seu Tião tem o tamanho do palco deitado com a sobra (1096 × 626)', async () => {
    const url = await loadNovoBack('tiao');
    const png = pngInfo(url);
    expect([png.w, png.h]).toEqual([1000 + 48 * 2, 450 + 88 * 2]);
    expect(png.chunks.includes('tRNS')).toBe(false);
    expect(url.length).toBeLessThan(200 * 1024);
  });

  it('sem nome, o fundo é null (a tela no visual clássico não pede nada)', () => {
    expect(novoBack(null)).toBe(null);
  });
});
