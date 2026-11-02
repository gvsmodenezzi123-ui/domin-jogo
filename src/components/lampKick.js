import { prefersReducedMotion } from './motion.js';

/**
 * Pancada na mesa: a lâmpada leva um tranco (balança forte e volta, como
 * pêndulo amortecido) e a luz tremula por um instante (versão 2.6.1: sem apagar a mesa). Vale para todas as partes
 * da lâmpada na tela (corpo e luz), juntas.
 */
export function kickLamp(strength = 1) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const a = 6 * strength;
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const el of document.querySelectorAll('.lamp-kick')) {
    el.animate?.(
      // transform (não a propriedade `rotate`): vai direto para a GPU também no Safari antigo
      [
        { transform: 'rotate(0deg)' },
        { transform: `rotate(${dir * a}deg)`, offset: 0.14 },
        { transform: `rotate(${-dir * a * 0.62}deg)`, offset: 0.38 },
        { transform: `rotate(${dir * a * 0.34}deg)`, offset: 0.62 },
        { transform: `rotate(${-dir * a * 0.12}deg)`, offset: 0.84 },
        { transform: 'rotate(0deg)' },
      ],
      { duration: 1100, easing: 'ease-in-out' },
    );
  }
  // versão 2.6.1: a luz só tremula de leve (antes ia a 0.2 e uma película preta cobria a mesa
  // inteira a 50% a cada pedra: a tela piscava preta a cada jogada)
  for (const el of document.querySelectorAll('.lamp-rig.dynamic-light-cone .lamp-kick, .lamp-flicker-glow')) {
    el.animate?.([{ opacity: 1 }, { opacity: 0.78, offset: 0.15 }, { opacity: 1, offset: 0.4 }, { opacity: 0.9, offset: 0.6 }, { opacity: 1 }], {
      duration: 300,
      easing: 'linear',
    });
  }
}
