/**
 * Animações reduzidas? Vale a opção do jogo (OPÇÕES → ANIMAÇÕES), não o ajuste
 * do aparelho: com "Reduzir Movimento" ligado no iPhone a mesa ficava parada
 * (lâmpada, voo das pedras). O App liga a classe `reduce-motion` no <html>.
 */
export function prefersReducedMotion() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion');
}

/** Liga/desliga as animações reduzidas na página inteira. */
export function applyReducedMotion(on) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduce-motion', Boolean(on));
}
