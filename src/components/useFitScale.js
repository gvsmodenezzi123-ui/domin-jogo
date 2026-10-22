import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Rede de segurança contra scroll (Patch 0.9.3): se o conteúdo de uma cena (loja, beco, Seu
 * Tião) passar da altura da tela mesmo depois do aperto do CSS, ele encolhe por inteiro
 * (`transform: scale`, preso no topo) até caber, no mínimo até `minScale`. O tamanho de
 * layout não muda com o transform, então a medida não entra em ciclo.
 *   const fit = useFitScale();  <div ref={fit.outerRef}><div ref={fit.innerRef} style={fit.style}>…
 */
export function useFitScale(minScale = 0.72) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const style = getComputedStyle(outer);
      const room = outer.clientHeight - parseFloat(style.paddingTop || '0') - parseFloat(style.paddingBottom || '0');
      const need = inner.offsetHeight;
      const next = need > room + 1 && room > 0 ? Math.max(minScale, Math.floor((room / need) * 1000) / 1000) : 1;
      setScale((prev) => (Math.abs(prev - next) < 0.002 ? prev : next));
    };
    const ro = new ResizeObserver(() => flushSync(measure));
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [minScale]);

  return { outerRef, innerRef, scale, style: scale < 1 ? { transform: `scale(${scale})`, transformOrigin: 'top center' } : undefined };
}
