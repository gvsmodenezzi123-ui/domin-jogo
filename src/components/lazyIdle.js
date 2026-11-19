import { lazy } from 'react';

/**
 * Versão 2.45.1: o que o jogo não usa logo ao abrir (o online, o DEV, o chefe secreto, a tela
 * quebrando, a abertura) vem num pedaço à parte: o app abre mais rápido no celular. Logo que o
 * jogo fica ocioso, os pedaços já são buscados (quando a cena chega, já estão prontos).
 */
const loaders = [];

export function lazyIdle(load) {
  let promise = null;
  const get = () => (promise ??= load());
  loaders.push(get);
  return lazy(get);
}

/** Busca todos os pedaços à parte num momento ocioso. */
export function preloadLazy() {
  if (typeof window === 'undefined') return;
  const go = () => loaders.forEach((get) => get().catch(() => {}));
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}
