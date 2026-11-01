import { memo } from 'react';
import BotecoBackdrop from '../components/BotecoBackdrop.jsx';
import CoinCount from '../components/CoinCount.jsx';
import { HeartsBar, PixelHeart } from '../components/PixelHeart.jsx';
import RivalAvatar from '../components/RivalAvatar.jsx';
import { ordinal, plateName } from './seats.js';

/** Tamanho do retrato e das pedrinhas de cada formato de cadeira (1, 2 ou 3 rivais na mesa). */
const LAYOUT = Object.freeze({
  wide: { photo: 64, heart: 11, coin: 12, tile: [12, 22], maxTiles: 9 },
  half: { photo: 48, heart: 9, coin: 10, tile: [8, 15], maxTiles: 9 },
  third: { photo: 40, heart: 8, coin: 9, tile: [6, 11], maxTiles: 7 },
});

/** O "X" de giz por cima da foto de quem saiu (traço tremido, desenhado uma vez). */
function ChalkX() {
  return (
    <svg className="seat-chalk" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M6 7 L13 14 L19 19.5 L27 27 L34 33" pathLength="100" />
      <path d="M33 6 L26 13.5 L20 20 L13 27 L7 34" pathLength="100" />
    </svg>
  );
}

/** As pedras na mão, viradas de costas (com o número ao lado quando passam do que cabe). */
function TileFan({ id, count, size, max }) {
  const shown = Math.min(count, max);
  return (
    <span className="seat-fan" data-seat-fan={id} aria-label={`${count} pedras na mão`}>
      {Array.from({ length: shown }, (_, i) => (
        <i key={i} className="seat-fan-tile" style={{ width: size[0], height: size[1] }} />
      ))}
      {(count > max || count === 0) && <b className="seat-fan-n">{count === 0 ? '—' : `×${count}`}</b>}
    </span>
  );
}

function SeatCard({ seat, variant, maxHearts, turnKey, turnMs, turnLeft, bubble, hit }) {
  const L = LAYOUT[variant];
  const out = !seat.alive;
  const mood = hit ? 'hurt' : seat.isTurn && seat.bot ? 'thinking' : seat.smug ? 'smug' : 'idle';
  const compactHearts = variant === 'third' && maxHearts > 5;
  return (
    <div
      className={`seat seat-${variant} ${seat.isTurn ? 'is-turn' : ''} ${out ? 'is-out' : ''} ${seat.lostLeft != null ? 'is-lost' : ''}`}
      style={{ '--seat': seat.color }}
      data-seat={seat.id}
      aria-label={`${seat.name}${out ? `, fora em ${ordinal(seat.place)} lugar` : ''}${seat.isTurn ? ', na vez' : ''}`}
    >
      <div className="seat-photo-col">
        <div className="seat-photo avatar-frame" data-seat-photo={seat.id}>
          <span key={hit ?? 0} className={`seat-photo-in block ${hit ? 'seat-hit' : ''}`}>
            <RivalAvatar rival={{ art: seat.face ?? 'tioZe', name: seat.name }} mood={out ? 'idle' : mood} size={L.photo} smoke={!out} />
          </span>
          {seat.isTurn && !out && (
            <svg key={turnKey} className="seat-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ '--ring-ms': `${turnMs}ms` }}>
              <rect x="1.5" y="1.5" width="97" height="97" pathLength="100" />
            </svg>
          )}
          {seat.isTurn && !out && turnLeft != null && <span className={`seat-secs font-pixel ${turnLeft <= 10 ? 'is-urgent' : ''}`}>{turnLeft}</span>}
          {out && <ChalkX />}
          {seat.bot && !out && <span className="seat-tag">BOT</span>}
          {!seat.bot && seat.ping != null && !out && <span className={`seat-ping ${seat.ping > 250 ? 'is-slow' : ''}`} aria-label={`ping ${seat.ping} ms`} />}
        </div>
        {variant !== 'third' && (
          <span className={`seat-status font-pixel ${seat.isTurn && !out ? 'is-on' : ''}`} role="status">
            {out ? '' : seat.lostLeft != null ? `CAIU ${seat.lostLeft}s` : seat.isTurn ? (seat.bot ? <span className="thinking-dots">PENSANDO</span> : 'JOGANDO') : ''}
          </span>
        )}
      </div>

      <div className="seat-info">
        <h3 className="seat-plate rival-nameplate font-pixel" aria-label={seat.name}>
          {out ? `FORA · ${ordinal(seat.place)}` : plateName(seat.name)}
        </h3>
        <div className="seat-stats rival-stats">
          {compactHearts ? (
            <span className="seat-hearts-n font-pixel" role="img" aria-label={`${seat.hearts} de ${maxHearts} corações`}>
              <PixelHeart size={L.heart} broken={seat.hearts === 0} />×{seat.hearts}
            </span>
          ) : (
            <HeartsBar current={seat.hearts} max={maxHearts} size={L.heart} label={`${seat.name}: ${seat.hearts} de ${maxHearts} corações`} />
          )}
          <CoinCount value={seat.coins} target={seat.id} className="seat-coins" size={L.coin} />
        </div>
        {!out && variant !== 'wide' && <TileFan id={seat.id} count={seat.count} size={L.tile} max={L.maxTiles} />}
        {variant === 'third' && seat.lostLeft != null && <span className="seat-status font-pixel is-on">CAIU {seat.lostLeft}s</span>}
      </div>

      {/* com um rival só, as pedras dele ficam na régua à direita, como no duelo */}
      {!out && variant === 'wide' && <TileFan id={seat.id} count={seat.count} size={L.tile} max={L.maxTiles} />}

      {bubble && !out && (
        <span key={bubble.key} className={`seat-bubble font-pixel ${bubble.strong ? 'is-strong' : ''}`} role="status">
          {bubble.text}
        </span>
      )}
    </div>
  );
}

/**
 * Versão 2.4: a bancada da mesa de 2 a 4. No lugar do rival único (RivalBench), uma fileira de
 * cadeiras na parede de azulejo, na ordem de jogo a partir de você (a seta mostra quem vem
 * depois de quem). Cada cadeira: a polaroide do rosto 64×64, a plaquinha com o nome, corações,
 * moedas e as pedras na mão viradas. A da vez acende na cor dela e ganha o anel do cronômetro
 * esvaziando em volta da foto; quem saiu fica em cinza com um X de giz e a colocação.
 * O tamanho é travado por mesa (1, 2 ou 3 rivais): nada muda de lugar no meio da rodada.
 */
function SeatBench({ seats, maxHearts, turnKey, turnMs, turnLeft = null, bubble, hits }) {
  const variant = seats.length >= 3 ? 'third' : seats.length === 2 ? 'half' : 'wide';
  return (
    <header className={`seat-bench seat-bench-${variant} rival-bench relative z-30 shrink-0`} style={{ paddingTop: 'max(env(safe-area-inset-top), 4px)' }}>
      <BotecoBackdrop scene="match" className="rival-bench-wall absolute inset-0" />
      <div className="seat-row relative">
        {seats.map((seat, i) => (
          <div key={seat.id} className="seat-slot">
            {i > 0 && <span className="seat-arrow" aria-hidden="true" />}
            <SeatCard
              seat={seat}
              variant={variant}
              maxHearts={maxHearts}
              turnKey={turnKey}
              turnMs={turnMs}
              turnLeft={seat.isTurn ? turnLeft : null}
              bubble={bubble?.seat === seat.id ? bubble : null}
              hit={hits?.[seat.id] ?? null}
            />
          </div>
        ))}
      </div>
    </header>
  );
}

export default memo(SeatBench);
