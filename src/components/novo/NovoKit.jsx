import { useLayoutEffect, useRef, useState } from 'react';
import PixelCanvas from '../PixelCanvas.jsx';
import { TITLE_H, TITLE_PAD, TITLE_W, paintTitleBack } from '../art/landTitle.js';

/** O palco das telas do visual novo: 896 × 414, que cresce ou encolhe para caber, no meio. */
export const NV_W = 896;
export const NV_H = 414;

/**
 * Versão 2.24: o palco das telas do visual novo (loja, beco, mapa, configurações, coleção).
 * Cada tela é montada num quadro fixo de 896 × 414 e o quadro inteiro escala para a tela.
 */
export function NovoStage({ kind, bleed = '#1a0e06', label, children, className = '' }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(() => (typeof window === 'undefined' ? 0 : Math.min(window.innerWidth / NV_W, window.innerHeight / NV_H)));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = Math.min(width / NV_W, height / NV_H);
      setScale((prev) => (Math.abs(prev - next) < 0.0005 ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`nvs nvs-wrap ${className}`} style={{ background: bleed }} role="dialog" aria-modal="true" aria-label={label}>
      <section className={`q-screen nvs-${kind}`} style={{ transform: `translate(-50%, -50%) scale(${scale || 0.0001})` }}>
        {children}
      </section>
    </div>
  );
}

/** Uma pintura das cenas deitadas (500 × 225 + sobra) como fundo, no enquadramento pedido. */
export function PaintBack({ paint, cacheKey, pad, size = 896, x = 0, y = 0, filter }) {
  const k = size / (TITLE_W * 2);
  return (
    <div className="q-bg" style={{ filter, overflow: 'hidden' }} aria-hidden="true">
      <PixelCanvas
        cacheKey={cacheKey}
        paint={paint}
        w={TITLE_W + pad.x * 2}
        h={TITLE_H + pad.y * 2}
        scale={2}
        style={{ position: 'absolute', left: x - pad.x * 2 * k, top: y - pad.y * 2 * k, transformOrigin: '0 0', transform: `scale(${k})` }}
      />
    </div>
  );
}

/** O salão do boteco (a pintura da tela inicial) como fundo. */
export function SaloonBack({ size = 1040, x = -470, y = -66, filter = 'brightness(1.05) saturate(1.35) sepia(0.15)' }) {
  return <PaintBack paint={() => paintTitleBack()} cacheKey="land-salao-fundo" pad={TITLE_PAD} size={size} x={x} y={y} filter={filter} />;
}

export function NovoLogo({ left = 24, top = 16, size = 22 }) {
  return (
    <>
      <div className="q-cards" style={{ left: left + 68, top: top - 16, transform: 'scale(0.6)', transformOrigin: '0 0' }} aria-hidden="true">
        <span>A♠</span>
        <span>A♥</span>
        <span>A♣</span>
        <span>A♦</span>
      </div>
      <div className="q-logo" style={{ left, top, fontSize: size }} aria-hidden="true">
        <i>BUXARIA</i>
        <b>BUXARIA</b>
      </div>
    </>
  );
}

export function NovoHearts({ current, max }) {
  return (
    <div className="q-hearts" role="img" aria-label={`${current} de ${max} corações`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`q-heart ${i < current ? '' : 'q-off'}`} />
      ))}
    </div>
  );
}

/** A plaquinha do topo: a vida e o dinheiro (e o que mais vier em `children`). */
export function NovoStatus({ left = 236, hearts, maxHearts, coins, children, coinTarget }) {
  return (
    <div className="q-wood q-dark q-status" style={{ left }}>
      <span className="q-nail" style={{ left: 4, top: 4 }} />
      <span className="q-nail" style={{ right: 4, top: 4 }} />
      {hearts != null && <NovoHearts current={hearts} max={maxHearts} />}
      <div className="q-money" data-coin-target={coinTarget}>
        <span className="q-coin" />${coins}
      </div>
      {children}
    </div>
  );
}

export function NovoLamp({ left, top, scale = 1, z }) {
  return (
    <div className="q-lamp" style={{ left, top, transform: scale === 1 ? undefined : `scale(${scale})`, zIndex: z }} aria-hidden="true">
      <i />
      <b />
    </div>
  );
}
