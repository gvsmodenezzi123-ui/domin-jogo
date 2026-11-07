import { memo, useLayoutEffect, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import LampRig from './LampRig.jsx';
import RivalBust from './RivalBust.jsx';
import RivalHand from './RivalHand.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { SEAT_RAIL, seatBust, seatUnit } from './seatGeometry.js';
import { shortRivalName } from '../engine/rivalInfo.js';
import { HEARTBEAT_BPM } from '../engine/audioSynth.js';
import { useTalk } from './useTalk.js';

/**
 * Versão 2.9: o rival SENTADO do outro lado da mesa deitada (16:9), no lugar do cabeçalho.
 *   - o busto no meio, atrás da beirada de lá (a madeira cobre o peito), respirando;
 *   - as pedras dele de pé, viradas, em cima da beirada, na frente do peito;
 *   - no canto de cima à esquerda: o nome (com os talismãs nos nichos ao lado, versão 2.11),
 *     os corações, o dinheiro e o PENSANDO;
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
          {/* versão 2.11: os talismãs dele nos nichos de madeira, ao lado da plaquinha */}
          <Hotbar relics={relics} size={30} cols={Math.max(4, relics.length)} flashes={flashes} press={press} owner="tioZe" niche label={`Talismãs de ${rival.name}`} className="seat-relics" />
        </div>
        <div className="rival-stats seat-stats">
          <HeartsBar current={hearts} max={maxHearts} size={12} label={`${rival.name}: ${hearts} de ${maxHearts} corações`} />
          <CoinCount value={coins} target="tioZe" className="text-[8px]" size={12} />
        </div>
        <span className={`rival-status seat-status font-pixel ${thinking ? 'rival-status-on' : ''}`} role="status" aria-live="polite">
          {thinking ? <span className="thinking-dots">PENSANDO</span> : status}
        </span>
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
