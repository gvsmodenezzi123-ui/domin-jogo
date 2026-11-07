import { useSyncExternalStore } from 'react';

/**
 * Versão 2.9: a mesa deitada (16:9). Vale quando a tela está deitada (bem mais larga que
 * alta): o celular girado, o computador, o tablet deitado. Em pé, a partida fica como antes
 * (até a etapa 4, quando o jogo inteiro deita).
 */
export const LANDSCAPE_QUERY = '(min-aspect-ratio: 5/4)';

function subscribe(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(LANDSCAPE_QUERY);
  mq.addEventListener?.('change', onChange);
  return () => mq.removeEventListener?.('change', onChange);
}

const snapshot = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(LANDSCAPE_QUERY).matches);
const serverSnapshot = () => false;

/** true com a tela deitada (a mesa 16:9 com o rival sentado do outro lado). */
export function useLandscape() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
