import { memo } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { BUST_H, BUST_W, SEATED_H, SEATED_W, paintBust, paintSeatedBust } from './art/bustPixels.js';
import { PORTRAIT_EMBER, PORTRAIT_GLOW, PORTRAITS } from './art/portraitSpecs.js';
import { PROFILE_SPOTS } from './art/figProfile.js';

/** Quem não tem retrato (o adversário do duelo on-line) senta como silhueta de um destes. */
const STRANGERS = ['tioZe', 'paulinho', 'beto', 'zeca', 'marquinhos', 'carlinhos'];
const strangerOf = (name = '') => STRANGERS[[...name].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7) % STRANGERS.length];
const PUFF_DELAYS = [0, 0.7, 1.4];

/**
 * Versão 2.36: as estrelinhas de quem desmaiou, rodando devagar em volta da cabeça (`style`: o
 * centro da roda, em % do quadro).
 */
function FaintStars({ style }) {
  return (
    <span className="faint-stars" style={style} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="faint-star" style={{ animationDelay: `${-i * 0.8}s` }}>
          <svg viewBox="0 0 5 5" width="100%" height="100%" style={{ shapeRendering: 'crispEdges' }}>
            <rect x="2" y="0" width="1" height="5" fill="#ffe27a" />
            <rect x="0" y="2" width="5" height="1" fill="#ffe27a" />
            <rect x="2" y="2" width="1" height="1" fill="#fffbe0" />
          </svg>
        </span>
      ))}
    </span>
  );
}

/**
 * O busto pintado (art/bustPixels.js): o humor do retrato, a boca mexendo enquanto fala e,
 * sem retrato, a silhueta. Respira (CSS), treme no golpe e se inclina quando bate.
 */
function RivalBust({ rival, mood = 'idle', speaking = false, profile = null, seated = null }) {
  if (seated && profile) return <SeatedBust rival={rival} mood={mood} speaking={speaking} facing={profile} chair={seated} />;
  const art = PORTRAITS[rival.art] ? rival.art : strangerOf(rival.name);
  const stranger = !PORTRAITS[rival.art];
  const open = Boolean(speaking) && mood !== 'hurt';
  const smokes = !stranger && PORTRAIT_EMBER[art]?.moods.includes(mood) ? PORTRAIT_EMBER[art] : null;
  // de lado, a brasa e o olho ficam no lugar do perfil (espelhado para quem olha para a esquerda)
  const flip = (x) => (profile === 'left' ? BUST_W - 1 - x : x);
  const ember = smokes && profile ? { x: flip(PROFILE_SPOTS.ember.x) - (BUST_W - 64) / 2, y: PROFILE_SPOTS.ember.y } : smokes;
  // (desmaiado: os olhos fechados não brilham)
  const glow = !stranger && mood !== 'out' ? PORTRAIT_GLOW[art] : null;
  return (
    <>
      <PixelCanvas
        cacheKey={`busto-${art}-${mood}-${open ? 1 : 0}${stranger ? '-sombra' : ''}${profile ? `-${profile}` : ''}`}
        paint={() => paintBust(PORTRAITS[art], mood, open, { silhouette: stranger, profile })}
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
      {glow &&
        (profile ? [{ x: flip(PROFILE_SPOTS.eye.x) - (BUST_W - 64) / 2, y: PROFILE_SPOTS.eye.y }] : glow.eyes).map((eye) => (
          <span
            key={eye.x}
            aria-hidden="true"
            className="eye-glow pointer-events-none absolute"
            style={{ left: `${((eye.x + (BUST_W - 64) / 2) / BUST_W) * 100}%`, top: `${((eye.y + (mood === 'hurt' ? 1 : 0)) / BUST_H) * 100}%`, width: `${(9 / BUST_W) * 100}%`, '--glow': glow.color }}
          />
        ))}
      {mood === 'out' && <FaintStars style={profile ? { left: `${((flip(PROFILE_SPOTS.eye.x) - 7 + (BUST_W - 64) / 2) / BUST_W) * 100}%`, top: '6%' } : { left: '50%', top: '7%' }} />}
    </>
  );
}

export default memo(RivalBust);

/**
 * Versão 2.32: quem senta nas laterais da roda, de corpo inteiro na cadeira (`chair`), de lado.
 * O mesmo humor, a boca, a fumaça e o brilho do olho do perfil, no quadro maior.
 */
function SeatedBust({ rival, mood, speaking, facing, chair }) {
  const art = PORTRAITS[rival.art] ? rival.art : strangerOf(rival.name);
  const stranger = !PORTRAITS[rival.art];
  const open = Boolean(speaking) && mood !== 'hurt';
  const smokes = !stranger && PORTRAIT_EMBER[art]?.moods.includes(mood);
  const glow = !stranger && mood !== 'out' ? PORTRAIT_GLOW[art] : null;
  const flip = (x) => (facing === 'left' ? SEATED_W - 1 - x : x);
  const at = (p, dy = 0) => ({ left: `${(flip(p.x) / SEATED_W) * 100}%`, top: `${((p.y + dy) / SEATED_H) * 100}%` });
  const layer = (key, part, m = 'idle', o = false) => (
    <PixelCanvas
      cacheKey={key}
      paint={() => paintSeatedBust(PORTRAITS[art], m, o, { silhouette: stranger, facing, chair, part })}
      w={SEATED_W}
      h={SEATED_H}
      scale={1}
      className="seat-bust-px seated-layer"
      style={{ width: '100%', height: '100%' }}
    />
  );
  const shade = stranger ? '-sombra' : '';
  // versão 2.32.3: em camadas: a cadeira e as pernas paradas; do quadril para cima respira, pensa,
  // se inclina e treme como o busto de frente (com a fumaça e o brilho do olho junto)
  return (
    <>
      {layer(`sentado-cadeira-${chair}-${facing}`, 'chair')}
      {layer(`sentado-pernas-${art}${shade}-${facing}`, 'legs')}
      <span className="seated-upper">
        {layer(`sentado-${art}-${mood}-${open ? 1 : 0}${shade}-${facing}`, 'upper', mood, open)}
        {smokes &&
          PUFF_DELAYS.map((delay) => (
            <span
              key={delay}
              aria-hidden="true"
              className="smoke-puff seat-smoke pointer-events-none absolute rounded-full bg-zinc-400 blur-[1px]"
              style={{ ...at(PROFILE_SPOTS.ember), animationDelay: `${delay}s` }}
            />
          ))}
        {glow && (
          <span
            aria-hidden="true"
            className="eye-glow pointer-events-none absolute"
            style={{ ...at(PROFILE_SPOTS.eye, mood === 'hurt' ? 1 : 0), width: `${(9 / SEATED_W) * 100}%`, '--glow': glow.color }}
          />
        )}
        {mood === 'out' && <FaintStars style={at({ x: PROFILE_SPOTS.eye.x - 9, y: PROFILE_SPOTS.eye.y - 27 })} />}
      </span>
    </>
  );
}
