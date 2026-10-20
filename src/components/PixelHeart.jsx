import PixelSprite from './PixelSprite.jsx';
import { HEART_BROKEN, HEART_FULL, HEART_PALETTE } from './sprites.js';

/**
 * Coração de vida. Quando vira "quebrado", o <svg> é remontado (key muda)
 * e a animação de rachadura roda uma vez.
 */
export function PixelHeart({ broken = false, pixel = 2 }) {
  return (
    <span className="relative inline-block leading-none" aria-hidden="true">
      <PixelSprite
        key={broken ? 'broken' : 'full'}
        rows={broken ? HEART_BROKEN : HEART_FULL}
        palette={HEART_PALETTE}
        pixel={pixel}
        className={broken ? 'animate-heart-crack' : 'heart-alive'}
      />
    </span>
  );
}

export function HeartsBar({ current, max, pixel = 2, label }) {
  const hearts = [];
  for (let i = 0; i < max; i += 1) hearts.push(<PixelHeart key={i} broken={i >= current} pixel={pixel} />);
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={label ?? `${current} de ${max} corações`}>
      {hearts}
    </span>
  );
}
