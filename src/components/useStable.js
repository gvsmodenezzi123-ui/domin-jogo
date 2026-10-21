import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Callback com identidade fixa que sempre chama a versão mais nova de `fn`.
 * Os componentes com React.memo (mesa, leque, botões) recebem sempre a mesma
 * função e não redesenham à toa quando o App muda (moedas, dica, falas).
 * Patch 0.5.4: otimização para o Safari do iPhone.
 */
export function useStableHandler(fn) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current(...args), []);
}

/**
 * Devolve sempre o mesmo objeto enquanto a `key` (por padrão, o JSON do valor)
 * não mudar. Serve para dados recalculados a cada render (regras, custo da
 * compra, marcas das pontas) que viram props de componentes com React.memo.
 */
export function useStableValue(value, key = JSON.stringify(value ?? null)) {
  const [held, setHeld] = useState(() => ({ key, value }));
  if (held.key !== key) {
    setHeld({ key, value });
    return value;
  }
  return held.value;
}
