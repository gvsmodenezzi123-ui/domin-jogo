/**
 * Comparação do React.memo das pedras (Patch 0.9.4, DominoTile.jsx).
 */

/** Objetos rasos iguais (o `style` da vaga chega novo a cada render, com os mesmos números). */
function sameShallow(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.is(a[k], b[k]));
}

/**
 * Patch 0.9.4 (Safari iOS): a pedra só redesenha se o que ela MOSTRA mudou. O layout da mesa
 * recria `values` ([a, b]) e o `style` a cada jogada; comparar por conteúdo faz as pedras
 * paradas da corrente pularem o render (antes todas redesenhavam a cada pedra nova).
 */
export function sameTileProps(prev, next) {
  for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (key === 'values') {
      const a = prev.values ?? [0, 0];
      const b = next.values ?? [0, 0];
      if (a[0] !== b[0] || a[1] !== b[1]) return false;
    } else if (key === 'style') {
      if (!sameShallow(prev.style, next.style)) return false;
    } else if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
}
