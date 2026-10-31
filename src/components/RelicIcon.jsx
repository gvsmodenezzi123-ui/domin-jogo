import PixelCanvas from './PixelCanvas.jsx';
import { RELIC_PX, paintRelic } from './art/relicPixels.js';

/** Ampliado menos de 1,5× na tela (em pixels do aparelho), o desenho fica suave em vez de serrilhado. */
function crisp(size) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return size * dpr >= RELIC_PX * 1.5 || size % RELIC_PX === 0;
}

/**
 * Versão 2.1: o ícone do talismã em `size` px, pintado em pixel art de 32×32
 * (art/relicPixels.js, pela chave `art` de data/relics.js), com o toque da raridade.
 */
export default function RelicIcon({ relic, size = 24, className = '' }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label={relic.name}>
      <PixelCanvas
        cacheKey={`talisma-${relic.art}-${relic.rarity ?? ''}`}
        paint={() => paintRelic(relic.art, relic.rarity) ?? paintRelic('canecaChopp')}
        w={RELIC_PX}
        h={RELIC_PX}
        scale={size / RELIC_PX}
        className="relic-pixels"
        style={crisp(size) ? undefined : { imageRendering: 'auto' }}
      />
    </span>
  );
}
