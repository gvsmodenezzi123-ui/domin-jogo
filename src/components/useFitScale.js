import { useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Rede de segurança contra scroll (Patch 0.9.3): se o conteúdo de uma cena (loja, beco, Seu
 * Tião) passar da altura da tela mesmo depois do aperto do CSS, ele encolhe por inteiro
 * (`transform: scale`, preso no topo) até caber, no mínimo até `minScale`. O tamanho de
 * layout não muda com o transform, então a medida não entra em ciclo.
 * Devolve dois "ref de função" (o setter do estado guarda o elemento) e o estilo:
 *   const [fitOuter, fitInner, fitStyle] = useFitScale();
 *   <div ref={fitOuter}><div ref={fitInner} style={fitStyle}>…
 */
export function useFitScale(minScale = 0.72) {
  const [outer, setOuter] = useState(null);
  const [inner, setInner] = useState(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
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
  }, [outer, inner, minScale]);

  return [setOuter, setInner, scale < 1 ? { transform: `scale(${scale})`, transformOrigin: 'top center' } : undefined];
}
