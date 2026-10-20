import { useLayoutEffect, useRef, useState } from 'react';
import DominoTile from './DominoTile.jsx';
import { RIVAL_FAN, computeFan } from './handFan.js';

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Mão do rival vista do outro lado da mesa: o mesmo leque do jogador girado
 * 180° (ele segura pela base, do lado de lá), pedras ~27% menores, viradas
 * para baixo e flutuando de leve. Pedras reveladas (Olho de Vidro, Espelho)
 * aparecem de frente, um pouco transparentes.
 */
export default function RivalHand({ tiles, revealedIds, className = '' }) {
  const [ref, width] = useWidth();
  const { unit, spots } = computeFan(tiles.length, width, RIVAL_FAN);
  const height = unit * 2 + RIVAL_FAN.drop + 4;
  return (
    <div ref={ref} className={`relative ${className}`} style={{ height }} aria-label={`Mão do rival: ${tiles.length} pedras`} role="img">
      <div className="absolute inset-0 rotate-180">
        {tiles.map((tile, i) => {
          const spot = spots[i];
          if (!spot) return null;
          const revealed = revealedIds.has(tile.id);
          return (
            <div
              key={tile.id}
              className="hand-slot absolute"
              style={{
                left: `calc(50% + ${spot.x - unit / 2}px)`,
                bottom: 2,
                width: unit,
                height: unit * 2,
                zIndex: i + 1,
                transform: `translateY(${spot.drop}px) rotate(${spot.angle}deg)`,
              }}
            >
              <div className="rival-float" style={{ animationDelay: `${-i * 0.6}s` }}>
                {revealed ? (
                  <DominoTile values={[tile.a, tile.b]} unit={unit} depth={2} enhancement={tile.enhancement} className="rival-revealed" />
                ) : (
                  <DominoTile faceDown unit={unit} depth={2} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
