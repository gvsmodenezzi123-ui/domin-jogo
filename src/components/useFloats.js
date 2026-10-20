import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_FLOATS = 6;

/** Centro de um elemento da tela (ou null se ele não estiver lá). */
export function centerOf(selector, { edge = 'center' } = {}) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: r.left + r.width / 2, y: edge === 'top' ? r.top : r.top + r.height / 2 };
}

/**
 * Fila dos textos flutuantes. `push(resolve, delay)` espera `delay` ms e só
 * então pergunta a `resolve()` de onde o texto sai (a pedra pode estar voando);
 * se o elemento não estiver na tela, o texto não aparece.
 */
export function useFloats() {
  const [items, setItems] = useState([]);
  const timers = useRef(new Set());
  const nextId = useRef(1);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => clearTimeout(id));
  }, []);

  const push = useCallback((resolve, delay = 0) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      const item = resolve();
      if (!item?.from) return;
      const fid = nextId.current;
      nextId.current += 1;
      setItems((list) => [...list.slice(-(MAX_FLOATS - 1)), { ...item, id: fid }]);
    }, delay);
    timers.current.add(id);
  }, []);

  const done = useCallback((id) => setItems((list) => list.filter((f) => f.id !== id)), []);
  const clear = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current.clear();
    setItems([]);
  }, []);

  return { items, push, done, clear };
}
