import { useCallback, useState } from 'react';

/**
 * A fila das falas do rival (versão 2.1, tirada do RivalBench na 2.9 para o rival sentado da
 * mesa deitada usar a mesma): a fala nova espera a atual terminar; só a mais recente fica na
 * fila. Devolve a fala da vez e o `finish` para o balão chamar quando sair.
 */
export function useTalk(speech) {
  const [talk, setTalk] = useState({ now: speech, next: null, busy: Boolean(speech) });
  if (speech && speech.key !== talk.now?.key && speech.key !== talk.next?.key) {
    setTalk(talk.busy ? { ...talk, next: speech } : { now: speech, next: null, busy: true });
  }
  const finish = useCallback(() => setTalk((t) => (t.next ? { now: t.next, next: null, busy: true } : { ...t, busy: false })), []);
  return [talk.now, finish];
}
