import { useEffect, useState } from 'react';
import { EMOTE_MS } from './emotes.js';

/**
 * Versão 2.41: o emote "vivo" de uma cadeira: o que chegou há menos de EMOTE_MS (depois disso o
 * personagem volta ao normal). `emote`: { id, key } ou null.
 */
export function useLiveEmote(emote) {
  const key = emote?.key ?? null;
  const [seen, setSeen] = useState(null);
  const [live, setLive] = useState(false);
  // (ajuste de estado no render quando a chave muda: o padrão do React para "derivar da prop")
  if (key !== seen) {
    setSeen(key);
    setLive(key != null);
  }
  useEffect(() => {
    if (key == null) return undefined;
    const id = setTimeout(() => setLive(false), EMOTE_MS);
    return () => clearTimeout(id);
  }, [key]);
  return live ? emote : null;
}
