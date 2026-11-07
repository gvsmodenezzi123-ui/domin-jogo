import { useLayoutEffect, useRef, useState } from 'react';
import PixelCanvas from './PixelCanvas.jsx';

/** O palco das cenas deitadas: 1000 × 450 unidades (1 pixel da pintura = 2 unidades). */
export const STAGE_W = 1000;
export const STAGE_H = 450;
export const STAGE_PX = 2;

/**
 * Versão 2.11: o palco das telas deitadas. Cada cena (menu, balcão, loja, beco, mapa...) é
 * desenhada uma vez, num quadro fixo de 1000 × 450 (a pintura de fundo em pixel art e as coisas
 * em cima, em posições fixas), e o quadro inteiro cresce ou encolhe para caber na tela, sempre
 * no meio. Assim a composição é a mesma em qualquer celular, tablet ou computador; o que sobra
 * em volta fica na cor da sala (`bleed`).
 *
 * paint/cacheKey: a pintura de fundo (500 × 225 pixels), opcional
 * pad:            a sobra pintada em volta (px da pintura: o teto e o chão das telas mais altas que
 *                 16:9, as paredes das mais largas); a pintura tem então 500 + 2x por 225 + 2y
 * children:       as coisas da cena, em unidades do palco (position absolute)
 */
export default function LandStage({ paint, cacheKey, pad = null, bleed = '#0b0907', className = '', children, label, role = 'main' }) {
  const px = pad?.x ?? 0;
  const py = pad?.y ?? 0;
  const ref = useRef(null);
  // já nasce na escala certa (a moldura é a tela inteira): quem mede posições no primeiro
  // efeito (as moedas do Seu Tião) não pega o palco encolhido
  const [scale, setScale] = useState(() => (typeof window === 'undefined' ? 0 : Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = Math.min(width / STAGE_W, height / STAGE_H);
      setScale((prev) => (Math.abs(prev - next) < 0.0005 ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`land-stage-wrap fixed inset-0 ${className}`} style={{ background: bleed }} role={role} aria-label={label}>
      <div className="land-stage" style={{ '--stage-s': scale, width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale || 0.0001})` }}>
        {paint && (
          <PixelCanvas
            cacheKey={cacheKey}
            paint={paint}
            w={STAGE_W / STAGE_PX + px * 2}
            h={STAGE_H / STAGE_PX + py * 2}
            scale={STAGE_PX}
            className="land-stage-art"
            style={{ left: -px * STAGE_PX, top: -py * STAGE_PX }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
