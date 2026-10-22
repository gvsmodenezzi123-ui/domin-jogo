// Corte de cena (Patch 0.6.1). Mora fora de ScreenTransition.jsx para o arquivo do
// componente exportar só componente (react-refresh).
import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './motion.js';

/** Escurecer e clarear (ms), cada um. */
export const FADE_MS = 350;

/**
 * Corte de cena (Patch 0.6.1): a tela escurece até o preto absoluto em 350 ms, a cena
 * nova é montada por baixo do preto e aparece em mais 350 ms. `go(swap)` faz isso;
 * enquanto um corte está em andamento, outro pedido é ignorado (toque duplo no botão
 * não troca de cena duas vezes). Com "menos movimento", troca na hora.
 */
export function useSceneTransition() {
  const [stage, setStage] = useState('clear');
  const busy = useRef(false);
  const timers = useRef([]);
  const frames = useRef([]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => clearTimeout(id));
      frames.current.forEach((id) => cancelAnimationFrame(id));
    },
    [],
  );

  const go = useCallback((swap) => {
    if (busy.current) return false;
    if (prefersReducedMotion()) {
      swap();
      return true;
    }
    busy.current = true;
    timers.current = [];
    frames.current = [];
    setStage('dark');
    timers.current.push(
      setTimeout(() => {
        swap();
        // espera a cena nova pintar por baixo do preto antes de clarear
        const first = requestAnimationFrame(() => {
          const second = requestAnimationFrame(() => {
            setStage('clear');
            timers.current.push(
              setTimeout(() => {
                busy.current = false;
              }, FADE_MS),
            );
          });
          frames.current.push(second);
        });
        frames.current.push(first);
      }, FADE_MS),
    );
    return true;
  }, []);

  return { stage, go };
}
