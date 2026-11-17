import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './motion.js';

const IN_MS = 700;
const HOLD_MS = 450;
const OUT_MS = 700;

/**
 * Versão 2.44.2: a morte no online (roda de 2 a 5 e duelo), sem cacos: a tela escurece até o
 * preto, troca o que está por baixo (`onPeak`: o modo espectador ou o placar) e clareia de novo.
 * `onDone` quando acabou de clarear.
 */
export default function DeathFade({ onPeak, onDone }) {
  const peak = useRef(onPeak);
  const done = useRef(onDone);
  useEffect(() => {
    peak.current = onPeak;
    done.current = onDone;
  });
  useEffect(() => {
    const quick = prefersReducedMotion();
    const a = setTimeout(() => peak.current?.(), quick ? 200 : IN_MS + HOLD_MS / 2);
    const b = setTimeout(() => done.current?.(), quick ? 500 : IN_MS + HOLD_MS + OUT_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  return <div className="death-fade" aria-hidden="true" style={{ '--df-in': `${IN_MS}ms`, '--df-hold': `${HOLD_MS}ms`, '--df-out': `${OUT_MS}ms` }} />;
}
