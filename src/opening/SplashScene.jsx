import { useEffect, useRef } from 'react';
import BuxariaLogo from '../components/BuxariaLogo.jsx';
import { prefersReducedMotion } from '../components/motion.js';

/** Quanto dura a tela preta com o nome (ms): entra, segura e sai. */
export const SPLASH_MS = 3200;

/**
 * Versão 2.46: a abertura é só a tela preta com o BUXARIA, que acende devagar, segura e apaga
 * (no lugar do "Efeito Dominó"). Da segunda vez em diante, um toque pula. `onDone()` no fim.
 */
export default function SplashScene({ skippable = false, onDone }) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone?.();
  };
  useEffect(() => {
    const t = setTimeout(finish, prefersReducedMotion() ? 1800 : SPLASH_MS + 120);
    return () => clearTimeout(t);
    // a abertura monta uma vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="splash" role="img" aria-label="Buxaria" onClick={skippable ? finish : undefined}>
      <div className="splash-logo" onAnimationEnd={finish}>
        <BuxariaLogo skin="gold" className="splash-logo-svg" />
      </div>
    </div>
  );
}
