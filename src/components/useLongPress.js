import { useCallback, useEffect, useRef } from 'react';

export const LONG_PRESS_MS = 350;

/**
 * Toque longo para inspecionar sem jogar: segurar `delay` ms chama
 * `onStart(payload, rect)`; soltar (ou arrastar para fora) chama `onEnd()`.
 * Um toque rápido continua sendo um clique normal; o clique que vem depois de
 * um toque longo é engolido, para não selecionar a pedra por acidente.
 *
 * Uso: const press = useLongPress(onStart, onEnd); <div {...press(payload)} />
 */
export function useLongPress(onStart, onEnd, delay = LONG_PRESS_MS) {
  const timer = useRef(null);
  const fired = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(
    (payload) => {
      const release = () => {
        clearTimeout(timer.current);
        timer.current = null;
        if (fired.current) onEnd();
      };
      return {
        onPointerDown(event) {
          fired.current = false;
          clearTimeout(timer.current);
          const target = event.currentTarget;
          timer.current = setTimeout(() => {
            fired.current = true;
            navigator.vibrate?.(8);
            onStart(payload, target.getBoundingClientRect());
          }, delay);
        },
        onPointerUp: release,
        onPointerCancel: release,
        onPointerLeave: release,
        onContextMenu(event) {
          event.preventDefault();
        },
        onClickCapture(event) {
          if (!fired.current) return;
          fired.current = false;
          event.stopPropagation();
          event.preventDefault();
        },
      };
    },
    [onStart, onEnd, delay],
  );
}
