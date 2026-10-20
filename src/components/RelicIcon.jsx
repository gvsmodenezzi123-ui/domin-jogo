import { RELIC_ART } from './artRegistry.js';
import PixelSprite from './PixelSprite.jsx';

/**
 * Ícone do talismã em `size` px: o desenho 40x40 de alta densidade quando ele
 * existe (`art` em data/relics.js), senão o pixel art 12x12 antigo.
 */
export default function RelicIcon({ relic, size = 24, className = '' }) {
  const Art = relic.art ? RELIC_ART[relic.art] : null;
  if (Art) {
    return (
      <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
        <Art className="h-full w-full" />
      </span>
    );
  }
  return <PixelSprite rows={relic.icon} palette={relic.palette} pixel={size / relic.icon.length} className={className} />;
}
