import { CoinIcon, EyeIcon, HeartIcon, LampIcon, MenuIcon, SpeakerIcon } from './ArtSprites.jsx';

/**
 * Ícones de interface num tamanho em px, desenhados em 40x40 (ArtSprites.jsx).
 * Ponto único de troca: o resto do jogo pede `<CoinGlyph size={12} />`.
 */
function Box({ size, className = '', children }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

export function CoinGlyph({ size = 14, className = '' }) {
  return (
    <Box size={size} className={className}>
      <CoinIcon className="h-full w-full" />
    </Box>
  );
}

export function HeartGlyph({ size = 14, broken = false, className = '' }) {
  return (
    <Box size={size} className={className}>
      <HeartIcon className="h-full w-full" broken={broken} />
    </Box>
  );
}

export function SpeakerGlyph({ size = 18, muted = false, className = '' }) {
  return (
    <Box size={size} className={className}>
      <SpeakerIcon className="h-full w-full" muted={muted} />
    </Box>
  );
}

export function MenuGlyph({ size = 18, className = '' }) {
  return (
    <Box size={size} className={className}>
      <MenuIcon className="h-full w-full" />
    </Box>
  );
}

export function LampGlyph({ size = 40, className = '' }) {
  return (
    <Box size={size} className={className}>
      <LampIcon className="h-full w-full" />
    </Box>
  );
}

export function EyeGlyph({ size = 14, className = '' }) {
  return (
    <Box size={size} className={className}>
      <EyeIcon className="h-full w-full" />
    </Box>
  );
}

/**
 * Seta de pixel (Patch 0.9.3: páginas e o carrossel das maletas). Desenhada em SVG: no Android
 * o "◀" de texto vira figurinha colorida.
 */
export function ArrowGlyph({ dir = 'next', size = 12, className = '' }) {
  return (
    <svg viewBox="0 0 6 8" width={Math.round(size * 0.75)} height={size} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {dir === 'prev' ? <path d="M4 0h2v8H4zM2 2h2v4H2zM0 3h2v2H0z" fill="currentColor" /> : <path d="M0 0h2v8H0zM2 2h2v4H2zM4 3h2v2H4z" fill="currentColor" />}
    </svg>
  );
}
