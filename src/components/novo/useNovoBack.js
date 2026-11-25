import { useEffect, useSyncExternalStore } from 'react';
import { loadNovoBack, novoBack, subscribeNovoBack } from '../art/novoBacks.js';

/** Versão 2.48: o fundo em volume da tela `name` (a URL quando chegar; null até lá ou sem `name`). */
export function useNovoBack(name) {
  const url = useSyncExternalStore(subscribeNovoBack, () => novoBack(name), () => null);
  useEffect(() => {
    if (name && !url) void loadNovoBack(name);
  }, [name, url]);
  return url;
}
