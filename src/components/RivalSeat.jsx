import { memo, useLayoutEffect, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import LampRig from './LampRig.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import RivalHand from './RivalHand.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { BUST_H, BUST_W, paintBust } from './art/bustPixels.js';
import { PORTRAIT_EMBER, PORTRAITS } from './art/portraitSpecs.js';
import { SEAT_RAIL, seatBust, seatUnit } from './seatGeometry.js';
import { shortRivalName } from '../engine/rivalInfo.js';
import { HEARTBEAT_BPM } from '../engine/audioSynth.js';
import { useTalk } from './useTalk.js';

/** Quem não tem retrato (o adversário do duelo on-line) senta como silhueta de um destes. */
const STRANGERS = ['tioZe', 'paulinho', 'beto', 'zeca', 'marquinhos', 'carlinhos'];
const strangerOf = (name = '') => STRANGERS[[...name].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7) % STRANGERS.length];
const PUFF_DELAYS = [0, 0.7, 1.4];

/**
 * O busto pintado (art/bustPixels.js): o humor do retrato, a boca mexendo enquanto fala e,
 * sem retrato, a silhueta. Respira (CSS), treme no golpe e se inclina quando bate.
 */
const RivalBust = memo(function RivalBust({ rival, mood, speaking }) {
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
});

/**
 * Versão 2.9: o rival SENTADO do outro lado da mesa deitada (16:9), no lugar do cabeçalho.
 *   - o busto no meio, atrás da beirada de lá (a madeira cobre o peito), respirando;
 *   - as pedras dele de pé, viradas, em cima da beirada, na frente do peito;
 *   - no canto de cima à esquerda: o nome, os corações, o dinheiro, os talismãs e o PENSANDO;
 *   - o balão sai da boca, à direita do busto (até 180 px, com quebra de linha);
 *   - o selo do perigo (ÚLTIMA PEDRA!) encosta na fileira das pedras ([data-danger-anchor]).
 * Tudo é uma camada por cima da mesa: o busto é cortado na linha da beirada (SEAT_RAIL, a
 * mesma conta do TableBoard), então parece estar atrás dela.
 */
function RivalSeat({
  rival,
  hearts,
  maxHearts,
  coins,
  hand,
  revealed,
  foreseenId = null,
  relics,
  flashes,
  isTurn,
  thinking = false,
  status = null,
  mood = 'idle',
  hurtKey,
  speech,
  handRef,
  roundKey,
  press,
  avatar = null,
  numberCounts = null,
  danger = 0,
}) {
  const revealedIds = new Set(revealed.map((t) => t.id));
  const [talkNow, finishTalk] = useTalk(speech);
  const [mouthOpen, setMouthOpen] = useState(false);
  // a altura da cena decide o tamanho das pedras de pé e do busto
  const seatRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = seatRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.w === Math.round(width) && prev.h === Math.round(height) ? prev : { w: Math.round(width), h: Math.round(height) }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const unit = seatUnit(size.h);
  const bust = seatBust(size.h);
  const room = Math.max(80, Math.min(bust.w * 1.3, 15 * (unit + 3)));
  return (
    <header
      ref={seatRef}
      className={`rival-bench rival-seat ${isTurn ? 'rival-bench-active is-turn' : ''}`}
      style={{
        '--rail-y': `${SEAT_RAIL * 100}%`,
        '--seat-h': `${size.h}px`,
        '--bust-w': `${bust.w}px`,
        '--bust-h': `${bust.h}px`,
        '--bust-drop': `${bust.drop}px`,
        '--mouth-y': `${bust.mouth}px`,
      }}
    >
      {/* o busto, atrás da beirada de lá: a moldura corta tudo o que passa da linha da mesa */}
      <div className="seat-bust-clip" aria-hidden="true">
        <div key={hurtKey} className={`seat-bust is-${mood}`} data-rival-avatar>
          <div className="seat-breath">
            <RivalBust rival={rival} mood={mood} speaking={mouthOpen} />
          </div>
        </div>
      </div>

      {/* a lâmpada pende sobre a mesa, na frente dele (o facho fica no TableBoard) */}
      <LampRig part="body" lamp={Math.round(bust.h * 0.22)} cord={2} beamWidth={300} className="seat-lamp" />

      {/* as pedras dele de pé na beirada, viradas para você */}
      <div className="seat-rack" data-danger-anchor>
        {danger > 0 && <span key={danger} aria-hidden="true" className="rival-rack-danger seat-rack-danger" style={{ '--beat': `${Math.round(60000 / HEARTBEAT_BPM[danger])}ms` }} />}
        <RivalHand
          tiles={hand}
          revealedIds={revealedIds}
          foreseenId={foreseenId}
          roundKey={roundKey}
          containerRef={handRef}
          room={room}
          unit={unit}
          seat
          className="seat-rack-tiles relative"
        />
      </div>

      {/* o canto de cima à esquerda: quem é, a vida, o dinheiro e os talismãs dele */}
      <div className="seat-hud">
        <div className="seat-name-row">
          {avatar && <span className="seat-avatar">{avatar}</span>}
          <h2 className="rival-name rival-nameplate seat-name whitespace-nowrap font-pixel leading-none" aria-label={rival.name}>
            {shortRivalName(rival.name)}
          </h2>
        </div>
        <div className="rival-stats seat-stats">
          <HeartsBar current={hearts} max={maxHearts} size={12} label={`${rival.name}: ${hearts} de ${maxHearts} corações`} />
          <CoinCount value={coins} target="tioZe" className="text-[8px]" size={12} />
        </div>
        <span className={`rival-status seat-status font-pixel ${thinking ? 'rival-status-on' : ''}`} role="status" aria-live="polite">
          {thinking ? <span className="thinking-dots">PENSANDO</span> : status}
        </span>
        <Hotbar relics={relics} size={18} cols={6} flashes={flashes} press={press} owner="tioZe" bare label={`Talismãs de ${rival.name}`} />
        {/* versão 1.4, Lupa de Joalheiro: quantas pedras com cada número ele tem */}
        {numberCounts && (
          <div className="rival-counts seat-counts flex flex-wrap gap-[3px] font-pixel" role="status" aria-label={`Lupa: ${numberCounts.map((n, i) => `${n} com ${i}`).join(', ')}`}>
            {numberCounts.map((n, i) => (
              <span key={i} className={`rival-count ${n === 0 ? 'is-zero' : ''}`} aria-hidden="true">
                <span className="rival-count-face">{i}</span>
                <span className="rival-count-sep">×</span>
                <span className="rival-count-n">{n}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* a fala sai da boca, à direita do busto */}
      {talkNow && (
        <RivalSpeech
          key={talkNow.key}
          text={talkNow.text}
          voice={rival.id}
          onMouth={setMouthOpen}
          tail="left"
          onFinish={finishTalk}
          className="speech-rival speech-seat z-40"
        />
      )}
    </header>
  );
}

export default memo(RivalSeat);
