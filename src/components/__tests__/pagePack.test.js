import { describe, expect, it } from 'vitest';
import { PAGER_HEIGHT, fitScale, packPages, pageScale, samePages, stackHeight } from '../pagePack.js';

describe('Patch 0.9.3: páginas no lugar do scroll', () => {
  it('soma as alturas com o vão entre os blocos', () => {
    expect(stackHeight([], 10)).toBe(0);
    expect(stackHeight([50], 10)).toBe(50);
    expect(stackHeight([50, 30, 20], 10)).toBe(120);
  });

  it('tudo que cabe fica numa página só, sem barra', () => {
    expect(packPages([100, 100, 100], 320, { gap: 10 })).toEqual([[0, 1, 2]]);
    expect(packPages([100, 100, 100], 320.2, { gap: 10 })).toEqual([[0, 1, 2]]);
  });

  it('o que não cabe vai para a próxima página, descontando a barra', () => {
    // 300 px de caixa: a barra come PAGER_HEIGHT; sobram 262 → dois blocos de 100 (+10) por página
    const pages = packPages([100, 100, 100, 100, 100], 300, { gap: 10 });
    expect(PAGER_HEIGHT).toBe(38);
    expect(pages).toEqual([
      [0, 1],
      [2, 3],
      [4],
    ]);
  });

  it('bloco maior que a página fica sozinho (e encolhe para caber)', () => {
    expect(packPages([50, 500, 50], 300, { gap: 0 })).toEqual([[0], [1], [2]]);
    expect(fitScale(500, 250)).toBe(0.5);
    expect(fitScale(200, 250)).toBe(1);
    expect(fitScale(2000, 250)).toBe(0.5);
  });

  it('título não fica sozinho no pé da página', () => {
    // [entrada, entrada, TÍTULO, entrada]: o título desce junto com a entrada dele
    const heights = [100, 100, 20, 100];
    expect(packPages(heights, 300, { gap: 0 })).toEqual([[0, 1, 2], [3]]);
    expect(packPages(heights, 300, { gap: 0, keep: [false, false, true, false] })).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('compara paginações', () => {
    expect(samePages([[0, 1], [2]], [[0, 1], [2]])).toBe(true);
    expect(samePages([[0, 1], [2]], [[0], [1, 2]])).toBe(false);
    expect(samePages([[0]], [[0], [1]])).toBe(false);
  });

  it('caixa sem altura (ainda não medida) não quebra', () => {
    expect(packPages([10, 20], 0)).toEqual([[0, 1]]);
    expect(packPages([], 300)).toEqual([[]]);
  });

  it('squeeze: aperta um pouco em vez de quebrar a página por pouco', () => {
    // cabeçalho 100 + lousa 440 numa caixa de 520: sem aperto, duas folhas; com 0.88, uma só
    expect(packPages([100, 440], 520, { gap: 12 })).toEqual([[0], [1]]);
    expect(packPages([100, 440], 520, { gap: 12, squeeze: 0.88 })).toEqual([[0, 1]]);
    expect(pageScale([100, 440], [0, 1], 520, 12)).toBeCloseTo(520 / 552, 5);
    // com mais blocos, cada folha aceita até room/squeeze antes de virar
    const pages = packPages([100, 440, 300, 300], 560, { gap: 12, squeeze: 0.88 });
    expect(pages).toEqual([[0, 1], [2], [3]]);
    expect(pageScale([100, 440, 300, 300], [0, 1], 560 - PAGER_HEIGHT, 12)).toBeCloseTo(522 / 552, 5);
    expect(pageScale([100, 440, 300, 300], [2], 560 - PAGER_HEIGHT, 12)).toBe(1);
  });
});
