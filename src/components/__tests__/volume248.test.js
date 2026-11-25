import { describe, expect, it } from 'vitest';
import { NOVO_OBJ, NOVO_PX, NOVO_VARS, installNovoVolume } from '../art/novoVolume.js';
import { hasNovoBack, loadNovoBack, novoBack } from '../art/novoBacks.js';

/** O cabeçalho de um PNG em data URL (largura, altura, tipo de cor) e os nomes dos pedaços dele. */
function pngInfo(url) {
  const PREFIX = 'data:image/png;base64,';
  expect(url.startsWith(PREFIX)).toBe(true);
  const bin = atob(url.slice(PREFIX.length));
  const u32 = (i) => ((bin.charCodeAt(i) << 24) | (bin.charCodeAt(i + 1) << 16) | (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3)) >>> 0;
  expect(bin.slice(12, 16)).toBe('IHDR');
  const chunks = [];
  for (let i = 8; i + 8 <= bin.length; i += 12 + u32(i)) chunks.push(bin.slice(i + 4, i + 8));
  return { w: u32(16), h: u32(20), color: bin.charCodeAt(25), chunks };
}

describe('Versão 2.48: as peças do visual novo em volume (art/novoVolume.js)', () => {
  it('cada peça é um PNG do tamanho declarado, inteiro', () => {
    for (const s of Object.values(NOVO_PX)) {
      const png = pngInfo(s.url);
      expect([png.w, png.h]).toEqual([s.w, s.h]);
      expect(png.chunks.at(-1)).toBe('IEND');
    }
  });

  it('o CSS só pede peças que existem; os objetos do mapa também', () => {
    for (const name of NOVO_VARS) expect(NOVO_PX[name], name).toBeTruthy();
    for (const name of Object.values(NOVO_OBJ)) expect(NOVO_PX[name], name).toBeTruthy();
    expect(Object.keys(NOVO_OBJ).sort()).toEqual(['black', 'coins', 'event', 'shop']);
    // as 9 fatias têm de caber: o canto de cada uma menor que a metade da peça
    for (const [name, slice] of [
      ['wood', 10],
      ['dark', 10],
      ['inset', 8],
      ['gold', 12],
      ['tag', 4],
      ['tag-pick', 4],
      ['ribbon', 6],
    ])
      expect(Math.min(NOVO_PX[name].w, NOVO_PX[name].h)).toBeGreaterThan(slice * 2);
    // as molduras: 7 px de cada lado da foto do ponto (54 × 46; a do chefe, 86 × 80)
    for (const name of ['frame-wood', 'frame-gold', 'frame-grey']) expect([NOVO_PX[name].w, NOVO_PX[name].h]).toEqual([68, 60]);
    expect([NOVO_PX['frame-boss'].w, NOVO_PX['frame-boss'].h]).toEqual([100, 94]);
    for (const name of ['sc-combat', 'sc-combat2', 'sc-combat3', 'sc-shop', 'sc-black', 'sc-coins', 'sc-event', 'sc-lock']) expect([NOVO_PX[name].w, NOVO_PX[name].h]).toEqual([54, 46]);
  });

  it('fora do navegador, instalar não faz nada (e não quebra)', () => {
    expect(() => installNovoVolume()).not.toThrow();
  });
});

describe('Versão 2.48: os fundos das telas do visual novo (art/novoBacks.js)', () => {
  it('o mapa chega como um PNG de 896 × 414 (sem buraco) e leve', async () => {
    expect(hasNovoBack('map')).toBe(true);
    const url = await loadNovoBack('map');
    const png = pngInfo(url);
    expect([png.w, png.h]).toEqual([896, 414]);
    expect(png.chunks.includes('tRNS')).toBe(false);
    expect(url.length).toBeLessThan(200 * 1024);
    expect(novoBack('map')).toBe(url);
  });

  it('um fundo que não existe resolve null', async () => {
    expect(hasNovoBack('nao-existe')).toBe(false);
    expect(await loadNovoBack('nao-existe')).toBe(null);
    expect(novoBack('nao-existe')).toBe(null);
  });
});
