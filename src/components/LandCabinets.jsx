import { memo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { paintCabinet } from './art/cabinetPixels.js';
import { cabBox } from './landCabinets.js';

/**
 * Versão 2.14: os armarinhos da mesa deitada (o desenho: art/cabinetPixels.js; a planta:
 * landCabinets.js). `Cabinet` é o móvel pintado com as caixas por cima; `CabKey` é a tecla-nicho
 * (o mesmo nicho de madeira da hotbar, largo), com a luz quente que acende lá dentro quando ela é
 * o caminho.
 */
const planKey = (plan) => plan.holes.map((h) => `${h.kind[0]}${h.x}.${h.y}.${h.w}.${h.h}`).join('|');

export const Cabinet = memo(function Cabinet({ plan, side, seed, scale = 1, className = '', children }) {
  const light = side === 'left' ? 'right' : 'left';
  return (
    <div className={`cab cab-${side} ${className}`} style={{ width: plan.w, height: plan.h + 3, transform: scale < 1 ? `scale(${scale})` : undefined }}>
      <PixelCanvas
        cacheKey={`armarinho-${side}-${planKey(plan)}`}
        paint={() => paintCabinet(plan.w, plan.h, { holes: plan.holes, light, seed })}
        w={plan.w}
        h={plan.h + 3}
        scale={1}
        className="cab-art"
      />
      {children}
    </div>
  );
});

/** Uma caixa da planta, posicionada por cima da pintura. */
export function CabSlot({ box, inset = 0, className = '', children, ...rest }) {
  return (
    <div className={`cab-slot ${className}`} style={cabBox(box, inset)} {...rest}>
      {children}
    </div>
  );
}

/** A tecla-nicho: o título a fogo, o preço embaixo e a luz de dentro quando é o caminho. */
export function CabKey({ box, on = false, disabled = false, title, cost = null, onClick, tut, label, tone = 'pinho', children }) {
  return (
    <button
      type="button"
      data-tut={tut}
      className={`cab-key is-${tone} ${on ? 'is-on' : ''}`}
      style={cabBox(box)}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      <span className="cab-key-glow" aria-hidden="true" />
      <span className="cab-key-face">
        {children}
        {title && (
          <span className="cab-key-text">
            <span className="cab-key-title font-pixel">{title}</span>
            {cost && <span className="cab-key-cost font-pixel">{cost}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
