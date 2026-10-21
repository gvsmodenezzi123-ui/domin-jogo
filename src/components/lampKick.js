import { prefersReducedMotion } from './motion.js';

/**
 * Pancada na mesa: a lâmpada leva um tranco (balança forte e volta, como
 * pêndulo amortecido) e a luz falha por um instante. Vale para todas as partes
 * da lâmpada na tela (corpo e luz), juntas.
 */
export function kickLamp(strength = 1) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const a = 6 * strength;
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const el of document.querySelectorAll('.lamp-kick')) {
    el.animate?.(
      [
        { rotate: '0deg' },
        { rotate: `${dir * a}deg`, offset: 0.14 },
        { rotate: `${-dir * a * 0.62}deg`, offset: 0.38 },
        { rotate: `${dir * a * 0.34}deg`, offset: 0.62 },
        { rotate: `${-dir * a * 0.12}deg`, offset: 0.84 },
        { rotate: '0deg' },
      ],
      { duration: 1100, easing: 'ease-in-out' },
    );
  }
  for (const el of document.querySelectorAll('.lamp-rig.dynamic-light-cone .lamp-kick, .lamp-flicker-glow')) {
    el.animate?.([{ opacity: 1 }, { opacity: 0.2, offset: 0.12 }, { opacity: 1, offset: 0.3 }, { opacity: 0.45, offset: 0.5 }, { opacity: 1 }], {
      duration: 300,
      easing: 'linear',
    });
  }
  for (const el of document.querySelectorAll('.room-flicker')) {
    el.animate?.([{ opacity: 0 }, { opacity: 0.5, offset: 0.12 }, { opacity: 0, offset: 0.3 }, { opacity: 0.3, offset: 0.5 }, { opacity: 0 }], {
      duration: 300,
      easing: 'linear',
    });
  }
}
