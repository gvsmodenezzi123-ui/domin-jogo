import { useSyncExternalStore } from 'react';

// Um relógio só para todas as contagens da mesa online (cronômetro de 30 s, os 60 s do W.O.):
// atualiza 4 vezes por segundo enquanto alguém estiver olhando.
let now = 0;
let timer = null;
const subscribers = new Set();

function subscribe(fn) {
  subscribers.add(fn);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const cb of subscribers) cb();
    }, 250);
  }
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const read = () => now || Date.now();

/** Agora (ms), atualizado a cada 250 ms. */
export function useNow() {
  return useSyncExternalStore(subscribe, read, () => 0);
}

/** Segundos que faltam até `deadline` (null sem prazo). */
export function useSecondsLeft(deadline) {
  const at = useNow();
  if (deadline == null) return null;
  return Math.max(0, Math.ceil((deadline - at) / 1000));
}
