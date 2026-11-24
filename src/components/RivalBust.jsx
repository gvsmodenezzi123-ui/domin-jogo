import { memo, useEffect, useState, useSyncExternalStore } from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import { castSpot, castVersion, subscribeCast } from './art/castHD.js';
import { BUST_H, BUST_W, SEATED_H, SEATED_W, paintBust, paintSeatedBust } from './art/bustPixels.js';
import { PORTRAIT_EMBER, PORTRAIT_GLOW, PORTRAITS } from './art/portraitSpecs.js';
import { PROFILE_SPOTS } from './art/figProfile.js';
import { GESTURE_FACE, GESTURE_FRAMES } from './art/figGesture.js';
import { prefersReducedMotion } from './motion.js';

/**
 * Versão 2.46: os pontos do personagem em volume (a ponta do cigarro e os olhos, de frente e de
 * lado), quando os quadros dele já chegaram; senão, os do desenho antigo.
 */
function spotsOf(spec) {
  const eyes = castSpot(spec, 'eyes');
  const sideEye = castSpot(spec, 'sideEye');
  return {
    ember: castSpot(spec, 'ember'),
    eyes: eyes ? eyes.map(([x, y]) => ({ x, y })) : null,
    sideEmber: castSpot(spec, 'sideEmber') ?? PROFILE_SPOTS.ember,
    sideEye: sideEye ? { x: sideEye[0], y: sideEye[1] } : PROFILE_SPOTS.eye,
  };
}
/** Repinta quando os personagens em volume chegam (art/castHD.js). */
const useCast = () => useSyncExternalStore(subscribeCast, castVersion, castVersion);

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
/** Versão 2.38: cada um pisca no seu tempo (o nome decide o ritmo e o atraso, sempre os mesmos). */
function blinkStyle(name = '') {
  const n = [...name].reduce((s, ch) => (s * 33 + ch.charCodeAt(0)) >>> 0, 11);
  return { animationDuration: `${(4.1 + (n % 23) / 10).toFixed(1)}s`, animationDelay: `${(-(n % 47) / 10).toFixed(1)}s` };
}
/** Os humores em que o personagem pisca (no golpe e desmaiado, não). */
const BLINKS = new Set(['idle', 'thinking', 'smug']);

/** Versão 2.46: quanto fica cada um dos dois quadros do braço subindo (e descendo) no emote (ms). */
const RAISE_MS = 80;

/**
 * Versão 2.46: o emote feito pelo próprio personagem, em movimento: o braço sobe do descanso em dois
 * quadros, o gesto mexe no seu ritmo (GESTURE_FRAMES) e, quando o emote acaba (`gesture` volta a
 * null), o braço desce pelos mesmos dois quadros, ao contrário. Apanhando ou desmaiado (`cut`), não
 * desce: some. Devolve o que está na tela, `{ id, frame, raise }` (`raise` 0 ou 1 enquanto sobe ou
 * desce), ou null.
 */
function useGestureMotion(gesture, cut = false) {
  const [seen, setSeen] = useState(gesture);
  const [shown, setShown] = useState(gesture ? { id: gesture, step: 'up0' } : null);
  const [beat, setBeat] = useState(0);
  // (ajuste de estado no render quando o gesto muda: o mesmo padrão do useLiveEmote)
  if (gesture !== seen) {
    setSeen(gesture);
    if (gesture) {
      setShown({ id: gesture, step: 'up0' });
      setBeat(0);
    } else if (shown) setShown(cut ? null : { id: shown.id, step: 'down1' });
  }
  useEffect(() => {
    if (!shown) return undefined;
    const { id, step } = shown;
    const still = prefersReducedMotion();
    const anim = GESTURE_FRAMES[id];
    let next = null;
    let ms = still ? 0 : RAISE_MS;
    if (step === 'up0') next = () => setShown({ id, step: 'up1' });
    else if (step === 'up1') next = () => setShown({ id, step: 'loop' });
    else if (step === 'down1') next = () => setShown({ id, step: 'down0' });
    else if (step === 'down0') next = () => setShown(null);
    else if (anim && !still) {
      ms = anim.ms;
      next = () => setBeat((b) => b + 1);
    }
    if (!next) return undefined;
    const t = setTimeout(next, ms);
    return () => clearTimeout(t);
  }, [shown, beat]);
  if (!shown) return null;
  const { id, step } = shown;
  const raise = step === 'up0' || step === 'down0' ? 0 : step === 'up1' || step === 'down1' ? 1 : null;
  const anim = GESTURE_FRAMES[id];
  return { id, frame: raise == null && anim ? anim.seq[beat % anim.seq.length] : 0, raise };
}
/** A chave do quadro do emote no cache (o gesto, o quadro e se é o braço subindo). */
const motionKey = (m) => `${m.id}-${m.raise != null ? `r${m.raise}` : m.frame}`;

function RivalBust(props) {
  useCast();
  if (props.seated && props.profile) return <SeatedBust {...props} facing={props.profile} chair={props.seated} />;
  return <FrontBust {...props} />;
}

export default memo(RivalBust);

/** O busto de frente (ou de lado, sem a cadeira), com o emote em movimento quando é com a mão dele. */
function FrontBust({ rival, mood = 'idle', speaking = false, profile = null, talking = false, gesture = null }) {
  const motion = useGestureMotion(gesture && !profile && PORTRAITS[rival.art] ? gesture : null, mood === 'hurt' || mood === 'out');
  if (motion) {
    const [face, mouth] = GESTURE_FACE[motion.id] ?? ['smug', false];
    return (
      <PixelCanvas
        live
        cacheKey={`busto-${rival.art}-gesto-${motionKey(motion)}`}
        paint={() => paintBust(PORTRAITS[rival.art], face, mouth, { gesture: motion.id, frame: motion.frame, raise: motion.raise })}
        w={BUST_W}
        h={BUST_H}
        scale={1}
        className="seat-bust-px"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
  const art = PORTRAITS[rival.art] ? rival.art : strangerOf(rival.name);
  const stranger = !PORTRAITS[rival.art];
  const open = Boolean(speaking) && mood !== 'hurt';
  const smokes = !stranger && PORTRAIT_EMBER[art]?.moods.includes(mood) ? PORTRAIT_EMBER[art] : null;
  const spots = spotsOf(PORTRAITS[art]);
  // de lado, a brasa e o olho ficam no lugar do perfil (espelhado para quem olha para a esquerda)
  const flip = (x) => (profile === 'left' ? BUST_W - 1 - x : x);
  const ember = smokes && profile ? { x: flip(spots.sideEmber.x) - (BUST_W - 64) / 2, y: spots.sideEmber.y } : smokes ? (spots.ember ?? smokes) : null;
  // (desmaiado: os olhos fechados não brilham)
  const glow = !stranger && mood !== 'out' ? PORTRAIT_GLOW[art] : null;
  return (
    <>
      <PixelCanvas
        live
        cacheKey={`busto-${art}-${mood}-${open ? 1 : 0}${stranger ? '-sombra' : ''}${profile ? `-${profile}` : ''}`}
        paint={() => paintBust(PORTRAITS[art], mood, open, { silhouette: stranger, profile })}
        w={BUST_W}
        h={BUST_H}
        scale={1}
        className="seat-bust-px"
        style={{ width: '100%', height: '100%' }}
      />
      {/* versão 2.38: mais vivo: pisca de tempos em tempos e mexe a boca quando fala a jogada */}
      {BLINKS.has(mood) && !open && (
        <PixelCanvas
          live
          cacheKey={`busto-${art}-blink-0${stranger ? '-sombra' : ''}${profile ? `-${profile}` : ''}`}
          paint={() => paintBust(PORTRAITS[art], 'blink', false, { silhouette: stranger, profile })}
          w={BUST_W}
          h={BUST_H}
          scale={1}
          className="seat-bust-px seat-blink"
          style={{ width: '100%', height: '100%', ...blinkStyle(rival.name) }}
        />
      )}
      {talking && BLINKS.has(mood) && !open && (
        <PixelCanvas
          live
          cacheKey={`busto-${art}-${mood}-1${stranger ? '-sombra' : ''}${profile ? `-${profile}` : ''}`}
          paint={() => paintBust(PORTRAITS[art], mood, true, { silhouette: stranger, profile })}
          w={BUST_W}
          h={BUST_H}
          scale={1}
          className="seat-bust-px seat-talk"
          style={{ width: '100%', height: '100%' }}
        />
      )}
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
        (profile ? [{ x: flip(spots.sideEye.x) - (BUST_W - 64) / 2, y: spots.sideEye.y }] : (spots.eyes ?? glow.eyes)).map((eye) => (
          <span
            key={eye.x}
            aria-hidden="true"
            className="eye-glow pointer-events-none absolute"
            style={{ left: `${((eye.x + (BUST_W - 64) / 2) / BUST_W) * 100}%`, top: `${((eye.y + (mood === 'hurt' ? 1 : 0)) / BUST_H) * 100}%`, width: `${(9 / BUST_W) * 100}%`, '--glow': glow.color }}
          />
        ))}
      {mood === 'out' && <FaintStars style={profile ? { left: `${((flip(spots.sideEye.x) - 7 + (BUST_W - 64) / 2) / BUST_W) * 100}%`, top: '6%' } : { left: '50%', top: '7%' }} />}
    </>
  );
}

/**
 * Versão 2.32: quem senta nas laterais da roda, de corpo inteiro na cadeira (`chair`), de lado.
 * O mesmo humor, a boca, a fumaça e o brilho do olho do perfil, no quadro maior.
 */
function SeatedBust({ rival, mood = 'idle', speaking = false, facing, chair, talking = false, gesture = null }) {
  const art = PORTRAITS[rival.art] ? rival.art : strangerOf(rival.name);
  const spots = spotsOf(PORTRAITS[art]);
  const stranger = !PORTRAITS[rival.art];
  const open = Boolean(speaking) && mood !== 'hurt';
  const smokes = !stranger && PORTRAIT_EMBER[art]?.moods.includes(mood);
  const glow = !stranger && mood !== 'out' ? PORTRAIT_GLOW[art] : null;
  const flip = (x) => (facing === 'left' ? SEATED_W - 1 - x : x);
  const at = (p, dy = 0) => ({ left: `${(flip(p.x) / SEATED_W) * 100}%`, top: `${((p.y + dy) / SEATED_H) * 100}%` });
  const layer = (key, part, m = 'idle', o = false, extra = '', style = null) => (
    <PixelCanvas
      live
      cacheKey={key}
      paint={() => paintSeatedBust(PORTRAITS[art], m, o, { silhouette: stranger, facing, chair, part })}
      w={SEATED_W}
      h={SEATED_H}
      scale={1}
      className={`seat-bust-px seated-layer ${extra}`}
      style={{ width: '100%', height: '100%', ...style }}
    />
  );
  const shade = stranger ? '-sombra' : '';
  // versão 2.45: o emote com a mão dele: o corpo de cima com o braço erguido (2.46: subindo, o gesto
  // mexendo e o braço descendo no fim)
  const motion = useGestureMotion(gesture && !stranger ? gesture : null, mood === 'hurt' || mood === 'out');
  const [face, mouth] = motion ? (GESTURE_FACE[motion.id] ?? ['smug', false]) : [mood, false];
  const gestureLayer = motion ? (
    <PixelCanvas
      live
      cacheKey={`sentado-${art}-gesto-${motionKey(motion)}-${facing}`}
      paint={() => paintSeatedBust(PORTRAITS[art], face, mouth, { facing, chair, part: 'upper', gesture: motion.id, frame: motion.frame, raise: motion.raise })}
      w={SEATED_W}
      h={SEATED_H}
      scale={1}
      className="seat-bust-px seated-layer"
      style={{ width: '100%', height: '100%' }}
    />
  ) : null;
  // versão 2.32.3: em camadas: a cadeira e as pernas paradas; do quadril para cima respira, pensa,
  // se inclina e treme como o busto de frente (com a fumaça e o brilho do olho junto)
  return (
    <>
      {layer(`sentado-cadeira-${chair}-${facing}`, 'chair')}
      {layer(`sentado-pernas-${art}${shade}-${facing}`, 'legs')}
      <span className="seated-upper">
        {gestureLayer ?? layer(`sentado-${art}-${mood}-${open ? 1 : 0}${shade}-${facing}`, 'upper', mood, open)}
        {/* versão 2.38: pisca e mexe a boca quando fala a jogada */}
        {!motion && BLINKS.has(mood) && !open && layer(`sentado-${art}-blink-0${shade}-${facing}`, 'upper', 'blink', false, 'seat-blink', blinkStyle(rival.name))}
        {!motion && talking && BLINKS.has(mood) && !open && layer(`sentado-${art}-${mood}-1${shade}-${facing}`, 'upper', mood, true, 'seat-talk')}
        {smokes &&
          PUFF_DELAYS.map((delay) => (
            <span
              key={delay}
              aria-hidden="true"
              className="smoke-puff seat-smoke pointer-events-none absolute rounded-full bg-zinc-400 blur-[1px]"
              style={{ ...at(spots.sideEmber), animationDelay: `${delay}s` }}
            />
          ))}
        {glow && (
          <span
            aria-hidden="true"
            className="eye-glow pointer-events-none absolute"
            style={{ ...at(spots.sideEye, mood === 'hurt' ? 1 : 0), width: `${(9 / SEATED_W) * 100}%`, '--glow': glow.color }}
          />
        )}
        {mood === 'out' && <FaintStars style={at({ x: spots.sideEye.x - 9, y: spots.sideEye.y - 27 })} />}
      </span>
    </>
  );
}
