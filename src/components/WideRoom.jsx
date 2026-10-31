import { useSyncExternalStore } from 'react';
import BotecoBackdrop from './BotecoBackdrop.jsx';

const QUERY = '(min-width: 600px)';
const subscribe = (fn) => {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener?.('change', fn);
  return () => mq?.removeEventListener?.('change', fn);
};
const isWide = () => Boolean(window.matchMedia?.(QUERY).matches);

/**
 * Versão 1.5: em tela larga (tablet deitado, PC) o jogo continua sendo a coluna do celular no
 * meio, e dos lados aparece o resto do bar, desfocado e no escuro: prateleiras, lâmpadas e a
 * mesa. Parado (pintado uma vez), atrás de tudo.
 */
export default function WideRoom() {
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  if (!wide) return null;
  return (
    <div aria-hidden="true" className="wide-room">
      <BotecoBackdrop scene="wide" seed={77} />
    </div>
  );
}
