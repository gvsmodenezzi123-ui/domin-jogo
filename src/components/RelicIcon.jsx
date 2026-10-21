import { RELIC_ART } from './artRegistry.js';

/** Ícone do talismã em `size` px: o desenho 40x40 dele (ArtSprites.jsx, via `art` em data/relics.js). */
export default function RelicIcon({ relic, size = 24, className = '' }) {
  const Art = RELIC_ART[relic.art];
  return (
    <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label={relic.name}>
      {Art && <Art className="h-full w-full" />}
    </span>
  );
}
