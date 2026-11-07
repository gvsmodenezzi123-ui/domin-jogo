import { memo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { BUST_H, BUST_W, paintBust } from './art/bustPixels.js';
import { PORTRAIT_EMBER, PORTRAITS } from './art/portraitSpecs.js';

/** Quem não tem retrato (o adversário do duelo on-line) senta como silhueta de um destes. */
const STRANGERS = ['tioZe', 'paulinho', 'beto', 'zeca', 'marquinhos', 'carlinhos'];
const strangerOf = (name = '') => STRANGERS[[...name].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7) % STRANGERS.length];
const PUFF_DELAYS = [0, 0.7, 1.4];

/**
 * O busto pintado (art/bustPixels.js): o humor do retrato, a boca mexendo enquanto fala e,
 * sem retrato, a silhueta. Respira (CSS), treme no golpe e se inclina quando bate.
 */
function RivalBust({ rival, mood = 'idle', speaking = false }) {
  const art = PORTRAITS[rival.art] ? rival.art : strangerOf(rival.name);
  const stranger = !PORTRAITS[rival.art];
  const open = Boolean(speaking) && mood !== 'hurt';
  const ember = !stranger && PORTRAIT_EMBER[art]?.moods.includes(mood) ? PORTRAIT_EMBER[art] : null;
  return (
    <>
      <PixelCanvas
        cacheKey={`busto-${art}-${mood}-${open ? 1 : 0}${stranger ? '-sombra' : ''}`}
        paint={() => paintBust(PORTRAITS[art], mood, open, { silhouette: stranger })}
        w={BUST_W}
        h={BUST_H}
        scale={1}
        className="seat-bust-px"
        style={{ width: '100%', height: '100%' }}
      />
      {ember &&
        PUFF_DELAYS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="smoke-puff seat-smoke pointer-events-none absolute rounded-full bg-zinc-400 blur-[1px]"
            style={{ left: `${((ember.x + (BUST_W - 64) / 2) / BUST_W) * 100}%`, top: `${(ember.y / BUST_H) * 100}%`, animationDelay: `${delay}s` }}
          />
        ))}
    </>
  );
}

export default memo(RivalBust);
