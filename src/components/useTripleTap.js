import { useCallback, useRef } from 'react';

/** Devolve um onClick que só chama `callback` no 3º toque seguido (gatilho secreto do painel DEV). */
export function useTripleTap(callback, windowMs = 650) {
  const taps = useRef([]);
  return useCallback(() => {
    const now = performance.now();
    taps.current = [...taps.current.filter((at) => now - at < windowMs), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      callback();
    }
  }, [callback, windowMs]);
}
