// Botão de copiar com resposta na hora (Patch 0.9.2): 'ok' ou 'fail' por 1,6 s, depois volta.
import { useEffect, useState } from 'react';
import { copyText } from './clipboard.js';

const SHOW_MS = 1600;

/** [estado ('idle' | 'ok' | 'fail'), copiar(texto)] */
export function useCopyFeedback() {
  const [status, setStatus] = useState({ value: 'idle', n: 0 });
  useEffect(() => {
    if (status.value === 'idle') return undefined;
    const timer = setTimeout(() => setStatus((s) => ({ ...s, value: 'idle' })), SHOW_MS);
    return () => clearTimeout(timer);
  }, [status]);
  const copy = async (text) => {
    const ok = await copyText(text);
    setStatus((s) => ({ value: ok ? 'ok' : 'fail', n: s.n + 1 }));
    return ok;
  };
  return [status.value, copy];
}
