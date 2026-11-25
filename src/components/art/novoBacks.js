/**
 * Versão 2.48: os fundos das telas do visual novo em volume (896 × 414, 256 cores), um módulo por
 * tela, que só chega quando a tela abre. Enquanto não chega, fica o fundo de sempre (o CSS).
 */
const LOADERS = {
  map: () => import('./stages/map.js'),
};

const ready = new Map();
const pending = new Map();
const listeners = new Set();

export const hasNovoBack = (name) => Object.prototype.hasOwnProperty.call(LOADERS, name);
/** O fundo (data URL), se já chegou. */
export const novoBack = (name) => ready.get(name) ?? null;

/** Traz o fundo (uma vez só); resolve com a URL, ou null se não deu. */
export function loadNovoBack(name) {
  if (!hasNovoBack(name)) return Promise.resolve(null);
  if (ready.has(name)) return Promise.resolve(ready.get(name));
  let p = pending.get(name);
  if (!p) {
    p = LOADERS[name]()
      .then((m) => {
        ready.set(name, m.default);
        pending.delete(name);
        for (const fn of listeners) fn(name);
        return m.default;
      })
      .catch(() => {
        pending.delete(name);
        return null;
      });
    pending.set(name, p);
  }
  return p;
}

/** Avisa quando um fundo chega (devolve o desligar). */
export function subscribeNovoBack(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
