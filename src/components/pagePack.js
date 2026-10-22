/**
 * Paginação sem scroll (Patch 0.9.3): reparte blocos de altura conhecida em páginas que cabem
 * numa altura dada. Usado por PagedBlocks.jsx (livro, caderno, lousa do fim, créditos...).
 */

/** Altura da barra de páginas (setas e bolinhas), em px. */
export const PAGER_HEIGHT = 38;

/** Altura natural de todos os blocos empilhados, com o vão entre eles. */
export function stackHeight(heights, gap = 0) {
  if (!heights.length) return 0;
  return heights.reduce((sum, h) => sum + h, 0) + gap * (heights.length - 1);
}

/**
 * Enche cada página até `room` px, na ordem; bloco maior que a página fica sozinho nela.
 * Um título (`keep`) que ficaria no pé da página desce para a próxima, junto do que anuncia.
 */
function fill(heights, room, gap, keep) {
  const pages = [];
  let page = [];
  let used = 0;
  heights.forEach((h, i) => {
    const need = page.length ? used + gap + h : h;
    if (page.length && need > room) {
      const carry = page.length > 1 && keep[page[page.length - 1]] ? [page.pop()] : [];
      pages.push(page);
      page = [...carry, i];
      used = stackHeight(page.map((k) => heights[k]), gap);
    } else {
      page.push(i);
      used = need;
    }
  });
  if (page.length) pages.push(page);
  return pages;
}

/**
 * Páginas (listas de índices) para blocos de `heights` px numa caixa de `room` px. Se tudo
 * cabe, uma página só (sem barra); senão a barra de páginas (`pagerHeight`) sai da altura.
 * `keep[i]` true: o bloco i não fica sozinho no pé da página (título que vai com o próximo).
 * `squeeze` (< 1): aceita apertar a página até essa escala para não quebrar por pouco
 * (a lousa do fim: melhor um pouco menor do que uma folha quase vazia).
 */
export function packPages(heights, room, { gap = 0, pagerHeight = PAGER_HEIGHT, keep = [], squeeze = 1 } = {}) {
  if (!heights.length) return [[]];
  const give = Math.min(1, Math.max(0.5, squeeze));
  if (!(room > 0) || stackHeight(heights, gap) * give <= room + 0.5) return [heights.map((_, i) => i)];
  const pages = fill(heights, Math.max(1, room - pagerHeight) / give, gap, keep);
  return pages.filter((page) => page.length);
}

/** Escala da página `page` (índices) numa caixa de `room` px: 1 se cabe, menor se apertou. */
export const pageScale = (heights, page, room, gap = 0) => fitScale(stackHeight(page.map((i) => heights[i] ?? 0), gap), room);

/** Escala para um bloco de `height` px caber em `room` px (1 se já cabe). */
export const fitScale = (height, room) => (height > room && room > 0 ? Math.max(0.5, room / height) : 1);

/** Duas paginações iguais? (para não re-renderizar à toa) */
export const samePages = (a, b) => a.length === b.length && a.every((page, i) => page.length === b[i].length && page.every((id, k) => id === b[i][k]));
