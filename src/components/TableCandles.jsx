import PixelCanvas from './PixelCanvas.jsx';
import { CANDLE_FOOT, CANDLE_SIZE, FLAME_FRAMES, FLAME_SIZE, candleWick, paintCandle, paintFlameStrip } from './art/candleArt.js';
import { landCandleSpots } from './seatGeometry.js';

/** px de CSS por px da pintura, na escala 1 (as de lá encolhem com a perspectiva). */
const PX = 2;
/** O pavio fica nesta coluna do desenho (art/candleArt.js); a chama tem o miolo na coluna 3. */
const WICK_X = 8;

/**
 * Versão 2.13: a mesa do Dono da Noite não tem lâmpada no teto: são quatro velas em castiçais
 * de latão, cravados no meio do canto do aro de cada canto do tampo (seatGeometry.js:
 * landCandleSpots, a mesma conta da perspectiva da mesa), as de lá menores. A cera derramada no
 * aro e a luz quente em volta de cada canto vêm pintadas na mesa (tablePixels.js); aqui ficam o
 * castiçal, a chama (uma tira de quadros que o CSS passa em degraus, cada vela no seu tempo) e o
 * halo. As pedras pegam a luz da vela mais perto (tileLighting.js lê os [data-candle]).
 */
export default function TableCandles({ room, landscape }) {
  if (!room.width || !room.height) return null;
  const spots = landscape
    ? landCandleSpots(room.width, room.height)
    : [
        [0.12, 0.2, 0.84],
        [0.88, 0.2, 0.84],
        [0.08, 0.8, 1],
        [0.92, 0.8, 1],
      ].map(([x, y, s], i) => ({ x: room.width * x, y: room.height * y, s, i, far: i < 2 }));
  const cw = CANDLE_SIZE.w * PX;
  const ch = CANDLE_SIZE.h * PX;
  const foot = ch - CANDLE_FOOT * PX;
  return (
    <div aria-hidden="true" className="table-candles pointer-events-none absolute inset-0">
      {spots.map((spot) => {
        const seed = spot.i * 5 + 1;
        const wick = candleWick(seed);
        return (
          <div
            key={spot.i}
            className={`table-candle ${spot.far ? 'is-far' : 'is-near'}`}
            style={{
              left: Math.round(spot.x - cw / 2),
              top: Math.round(spot.y - foot),
              width: cw,
              height: ch,
              transformOrigin: `50% ${foot}px`,
              '--s': spot.s.toFixed(3),
              '--flick': `${(0.62 + spot.i * 0.07).toFixed(2)}s`,
              '--delay': `${(-spot.i * 0.23).toFixed(2)}s`,
            }}
          >
            <span className="candle-glow" style={{ top: (wick - 6) * PX }} />
            <PixelCanvas cacheKey={`vela-${seed}`} paint={() => paintCandle(seed)} w={CANDLE_SIZE.w} h={CANDLE_SIZE.h} scale={PX} className="candle-body" style={{ width: cw, height: ch }} />
            <span
              className="candle-flame"
              data-candle={spot.i}
              style={{ left: (WICK_X - 3) * PX, top: (wick - FLAME_SIZE.h + 1) * PX, width: FLAME_SIZE.w * PX, height: FLAME_SIZE.h * PX }}
            >
              <PixelCanvas
                cacheKey="vela-chama"
                paint={paintFlameStrip}
                w={FLAME_SIZE.w * FLAME_FRAMES}
                h={FLAME_SIZE.h}
                scale={PX}
                className="candle-flame-strip"
                style={{ width: FLAME_SIZE.w * FLAME_FRAMES * PX, height: FLAME_SIZE.h * PX }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
