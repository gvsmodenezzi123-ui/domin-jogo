/** O aparelho pediu menos animação? (Ajustes → Acessibilidade → Movimento) */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
