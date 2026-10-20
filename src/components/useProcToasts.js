import { useCallback, useEffect, useRef, useState } from 'react';

const TOAST_MS = 2600;
const STAGGER_MS = 240;
const MAX_TOASTS = 3;

/**
 * Fila dos avisos de relíquia/peça aprimorada. `push(event)` agenda o aviso
 * (escalonado, para vários disparos na mesma jogada não embolarem) e ele some sozinho.
 */
export function useProcToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());
  const queuedUntil = useRef(0);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => clearTimeout(id));
  }, []);

  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const push = useCallback(
    (event, delay = 0) => {
      const now = performance.now();
      const at = Math.max(now + delay, queuedUntil.current);
      queuedUntil.current = at + STAGGER_MS;
      const wait = at - now;
      later(() => setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), event]), wait);
      later(() => setToasts((list) => list.filter((t) => t.seq !== event.seq)), wait + TOAST_MS);
    },
    [later],
  );

  const clear = useCallback(() => setToasts([]), []);

  return { toasts, push, clear };
}
