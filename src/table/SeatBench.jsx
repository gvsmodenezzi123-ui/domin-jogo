import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import BotecoBackdrop from '../components/BotecoBackdrop.jsx';
import RivalBust from '../components/RivalBust.jsx';
import RivalHand from '../components/RivalHand.jsx';
import DominoTile from '../components/DominoTile.jsx';
import { RODA_SIDES, SEAT_RAIL, landCorners, seatBust, seatUnit, sideSeat } from '../components/seatGeometry.js';
import CoinCount from '../components/CoinCount.jsx';
import { HeartsBar, PixelHeart } from '../components/PixelHeart.jsx';
import RivalAvatar from '../components/RivalAvatar.jsx';
import { TentoCap, TentosBar } from '../components/TentoCap.jsx';
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

const NO_REVEAL = new Set();

/**
 * Versão 2.14: as pedras de quem senta na roda deitada, de pé na beirada, com as mesmas costas
 * das pedras do rival da campanha (a régua do RivalSeat). A roda só sabe quantas são: cada uma
 * vira uma pedra de costas com um id fixo pela posição (quando a mão diminui, a da ponta sai).
 */
function ChairRack({ id, count, unit, room, roundKey }) {
  const tiles = useMemo(() => Array.from({ length: count }, (_, i) => ({ id: `${id}:${i}` })), [id, count]);
  return (
    <span className="chair-fan" data-seat-fan={id} aria-label={`${count} pedras na mão`}>
      <RivalHand tiles={tiles} revealedIds={NO_REVEAL} roundKey={roundKey} room={room} unit={unit} seat className="seat-rack-tiles relative" />
    </span>
  );
}

/**
 * Versão 2.19: a mão do seu parceiro de dupla, aberta para você, de pé na beirada. Tocar numa
 * pedra marca ela (o sinal "joga essa": ele vê a marca na mão dele); tocar de novo desmarca.
 */
function MateRack({ id, hand, marked, unit, onSignal }) {
  return (
    <span className="chair-fan mate-rack" data-seat-fan={id} aria-label={`A mão do seu parceiro: ${hand.length} pedras`}>
      {hand.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={`mate-tile ${marked === tile.id ? 'is-marked' : ''}`}
          onClick={() => onSignal?.(tile.id)}
          aria-pressed={marked === tile.id}
          aria-label={`${tile.a} e ${tile.b}${marked === tile.id ? ', marcada' : ''}: tocar para ${marked === tile.id ? 'desmarcar' : 'pedir esta pedra'}`}
        >
          <DominoTile values={[tile.a, tile.b]} orientation="vertical" unit={unit} depth={2} enhancement={tile.enhancement} still />
          {marked === tile.id && <span className="mate-mark font-pixel" aria-hidden="true">!</span>}
        </button>
      ))}
    </span>
  );
}

/** A vida da cadeira: os corações ou, na roda por tentos, as tampinhas até a meta. */
function SeatLife({ seat, L, variant, maxHearts, target }) {
  if (target) {
    const label = `${seat.name}: ${seat.tentos} de ${target} tentos`;
    // com 3 rivais e meta alta, cabe só a tampinha e a conta
    if (variant === 'third' && target > 5) {
      return (
        <span className="seat-hearts-n seat-tentos-n font-pixel" role="img" aria-label={label}>
          <TentoCap size={L.heart + 1} empty={seat.tentos === 0} />
          {seat.tentos}/{target}
        </span>
      );
    }
    return <TentosBar current={seat.tentos} max={target} size={L.heart + 1} label={label} />;
  }
  if (variant === 'third' && maxHearts > 5) {
    return (
      <span className="seat-hearts-n font-pixel" role="img" aria-label={`${seat.hearts} de ${maxHearts} corações`}>
        <PixelHeart size={L.heart} broken={seat.hearts === 0} />×{seat.hearts}
      </span>
    );
  }
  return <HeartsBar current={seat.hearts} max={maxHearts} size={L.heart} label={`${seat.name}: ${seat.hearts} de ${maxHearts} corações`} />;
}

function SeatCard({ seat, variant, maxHearts, target, turnKey, turnMs, turnLeft, bubble, hit }) {
  const L = LAYOUT[variant];
  const out = !seat.alive;
  const mood = hit ? 'hurt' : seat.isTurn && seat.bot ? 'thinking' : seat.smug ? 'smug' : 'idle';
  return (
    <div
      className={`seat seat-${variant} ${seat.isTurn ? 'is-turn' : ''} ${out ? 'is-out' : ''} ${seat.lostLeft != null ? 'is-lost' : ''} ${seat.danger && !out ? 'is-danger' : ''} ${seat.partner ? 'is-partner' : ''}`}
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
          {!out && seat.lostLeft != null && (
            <span className="seat-lost font-pixel" role="status" aria-label={`${seat.name} caiu: ${seat.lostLeft} segundos para voltar`}>
              CAIU
              <b>{seat.lostLeft}s</b>
            </span>
          )}
          {seat.bot && !out && <span className="seat-tag">BOT</span>}
          {/* versão 2.7: nas duplas, a letra da dupla (e "DUPLA" no seu parceiro) */}
          {seat.team && (
            <span className={`seat-team font-pixel is-${seat.team}`} aria-label={seat.partner ? 'sua dupla' : `dupla ${seat.team}`}>
              {seat.partner ? 'DUPLA' : seat.team}
            </span>
          )}
          {!seat.bot && seat.ping != null && !out && <span className={`seat-ping ${seat.ping > 250 ? 'is-slow' : ''}`} aria-label={`ping ${seat.ping} ms`} />}
        </div>
        {variant !== 'third' && (
          <span className={`seat-status font-pixel ${seat.isTurn && !out ? 'is-on' : ''}`} role="status">
            {out ? '' : seat.lostLeft != null ? 'SEM SINAL' : seat.isTurn ? (seat.bot ? <span className="thinking-dots">PENSANDO</span> : 'JOGANDO') : ''}
          </span>
        )}
      </div>

      <div className="seat-info">
        <h3 className="seat-plate rival-nameplate font-pixel" aria-label={seat.name}>
          {out ? `FORA · ${ordinal(seat.place)}` : plateName(seat.name)}
        </h3>
        <div className="seat-stats rival-stats">
          <SeatLife seat={seat} L={L} variant={variant} maxHearts={maxHearts} target={target} />
          <CoinCount value={seat.coins} target={seat.id} className="seat-coins" size={L.coin} />
        </div>
        {!out && variant !== 'wide' && <TileFan id={seat.id} count={seat.count} size={L.tile} max={L.maxTiles} />}
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
 * Versão 2.7: nas duplas, a letra da dupla no canto da foto (o seu parceiro com "DUPLA" e o aro
 * na cor da dupla); na roda por tentos, as tampinhas amassadas no lugar dos corações.
 * O tamanho é travado por mesa (1, 2 ou 3 rivais): nada muda de lugar no meio da rodada.
 */
/**
 * Versão 2.9: a cadeira na mesa deitada. O rival em busto atrás da beirada de lá (a madeira
 * cobre o peito), as pedras dele de pé na beirada e, em cima da cabeça, só a plaquinha com o
 * nome e a vida (na vez dele a plaquinha acende na cor da cadeira, com os segundos ao lado); a
 * fala da jogada ("JOGOU 4|3", "PASSOU") sai logo embaixo da vida. Os mesmos marcadores da
 * cadeira em pé (data-seat, data-seat-photo, data-seat-fan) para os voos e os efeitos.
 */
function SeatChair({ seat, x, bust, unit, room, roundKey, solo, maxHearts, target, turnLeft, bubble, hit, anchor, side = null, onSignal }) {
  const out = !seat.alive;
  const mood = out ? 'idle' : hit ? 'hurt' : seat.isTurn && seat.bot ? 'thinking' : seat.smug ? 'smug' : 'idle';
  const L = LAYOUT.half;
  return (
    <div
      className={`seat chair ${solo ? 'is-solo' : ''} ${side ? `is-side is-side-${side.name}` : ''} ${x < 0.45 ? 'is-west' : ''} ${seat.isTurn ? 'is-turn' : ''} ${out ? 'is-out' : ''} ${seat.lostLeft != null ? 'is-lost' : ''} ${seat.danger && !out ? 'is-danger' : ''} ${seat.partner ? 'is-partner' : ''}`}
      style={{ '--seat': seat.color, '--x': `${x * 100}%`, '--bust-w': `${bust.w}px`, '--bust-h': `${bust.h}px`, '--bust-drop': `${bust.drop}px`, ...(side ? { '--sx': `${side.x}px`, '--sy': `${side.y}px`, '--side-clip': side.clip } : null) }}
      data-seat={seat.id}
      aria-label={`${seat.name}${out ? `, fora em ${ordinal(seat.place)} lugar` : ''}${seat.isTurn ? ', na vez' : ''}`}
    >
      <div className="chair-clip" aria-hidden="true">
        <div className={`chair-bust seat-bust is-${mood}`} data-seat-photo={seat.id}>
          <span key={hit ?? 0} className={`chair-breath seat-breath ${hit ? 'seat-hit' : ''}`}>
            <RivalBust rival={{ art: seat.face, name: seat.name }} mood={mood} profile={side ? side.facing : null} />
          </span>
          {out && <ChalkX />}
        </div>
      </div>
      {!out && (
        <div className="chair-rack" {...(anchor ? { 'data-danger-anchor': '' } : {})}>
          {seat.hand ? <MateRack id={seat.id} hand={seat.hand} marked={seat.marked} unit={Math.max(unit, 13)} onSignal={onSignal} /> : <ChairRack id={seat.id} count={seat.count} unit={unit} room={room} roundKey={roundKey} />}
        </div>
      )}
      {/* em cima da cabeça, só a plaquinha do nome e a vida; a fala da jogada logo embaixo */}
      <div className={`chair-plate ${seat.isTurn && !out ? 'is-on' : ''}`} data-coin-target={seat.id}>
        <h3 className="seat-plate rival-nameplate font-pixel" aria-label={seat.name}>
          {out ? `FORA · ${ordinal(seat.place)}` : plateName(seat.name)}
          {seat.isTurn && !out && turnLeft != null && <span className={`seat-secs chair-secs font-pixel ${turnLeft <= 10 ? 'is-urgent' : ''}`}>{turnLeft}</span>}
        </h3>
        {(seat.bot || seat.team) && !out && (
          <span className="chair-tags">
            {seat.bot && <span className="seat-tag">BOT</span>}
            {seat.team && (
              <span className={`seat-team font-pixel is-${seat.team}`} aria-label={seat.partner ? 'sua dupla' : `dupla ${seat.team}`}>
                {seat.partner ? 'DUPLA' : seat.team}
              </span>
            )}
          </span>
        )}
        <span className="chair-life">
          <SeatLife seat={seat} L={L} variant="half" maxHearts={maxHearts} target={target} />
          {!seat.bot && seat.ping != null && !out && <span className={`seat-ping ${seat.ping > 250 ? 'is-slow' : ''}`} aria-label={`ping ${seat.ping} ms`} />}
        </span>
        {!out && seat.lostLeft != null && (
          <span className="seat-lost chair-lost font-pixel" role="status" aria-label={`${seat.name} caiu: ${seat.lostLeft} segundos para voltar`}>
            CAIU <b>{seat.lostLeft}s</b>
          </span>
        )}
        {bubble && !out && (
          <span key={bubble.key} className={`seat-bubble chair-bubble font-pixel ${bubble.strong ? 'is-strong' : ''}`} role="status">
            {bubble.text}
          </span>
        )}
      </div>
    </div>
  );
}

/** O recorte das cadeiras: tudo acima da beirada de lá e, fora do tampo, até a bancada (47%). */
function chairClip(w, h) {
  const c = landCorners(w, h);
  const yC = Math.round(h * 0.47);
  const r = (v) => Math.round(v);
  return {
    '--chair-h': `${yC}px`,
    '--rail-px': `${c.yFar}px`,
    '--chair-clip': `polygon(0 0, ${w}px 0, ${w}px ${yC}px, ${r(c.xAt(yC, 1))}px ${yC}px, ${r(c.farR)}px ${c.yFar}px, ${r(c.farL)}px ${c.yFar}px, ${r(c.xAt(yC, -1))}px ${yC}px, 0 ${yC}px)`,
  };
}

/**
 * Versão 2.9: a roda na mesa deitada: todos sentados atrás da beirada de lá, na ordem da vez
 * (o próximo à sua direita, o da frente no meio, o último à sua esquerda), do mesmo tamanho do
 * rival do duelo. Quem senta na ponta passa da beirada: o corpo desce até a bancada.
 */
function SeatRow({ seats, maxHearts, target, turnLeft, bubble, hits, roundKey, onSignal }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const n = Math.min(3, seats.length);
  const places = RODA_SIDES[n] ?? RODA_SIDES[3];
  const solo = n === 1;
  // versão 2.14: um tiquinho menores que o rival do duelo (a roda tem até 3 na parede); a cabeça
  // um pouco mais baixa (a plaquinha mora em cima)
  const bust = seatBust(size.h, 0.34, 0.02);
  const unit = seatUnit(size.h);
  // a régua de cada um cabe no espaço da cadeira (como a do rival da campanha)
  const room = Math.max(80, Math.min(bust.w * 1.3, 15 * (unit + 3), (size.w || 844) * (n === 3 ? 0.22 : 0.3)));
  // versão 2.18: quem senta nas laterais fica de perfil, olhando para a mesa
  const sideOf = (place) => {
    if (place === 'far' || !size.w) return null;
    const dir = place === 'left' ? -1 : 1;
    return { name: place, facing: dir < 0 ? 'right' : 'left', ...sideSeat(size.w, size.h, dir, bust) };
  };
  // o selo do perigo encosta nas pedras de quem está por uma
  const danger = seats.find((s) => s.danger && s.alive)?.id ?? seats.find((s) => s.alive)?.id;
  // quem senta na ponta passa da beirada de lá: o tampo esconde só o que fica atrás dele, e o
  // corpo de fora desce até a bancada (sumindo no escuro, sem o corte reto no meio do ar)
  const clip = size.w > 0 ? chairClip(size.w, size.h) : undefined;
  return (
    <header ref={ref} className={`seat-bench rival-bench roda-seats roda-n${n}`} style={{ '--rail-y': `${SEAT_RAIL * 100}%`, ...clip }}>
      {seats.map((seat, i) => (
        <SeatChair
          key={seat.id}
          seat={seat}
          x={places[i] === 'left' ? 0.2 : places[i] === 'right' ? 0.8 : 0.5}
          side={sideOf(places[i] ?? 'far')}
          bust={bust}
          unit={unit}
          room={room}
          roundKey={roundKey}
          solo={solo}
          maxHearts={maxHearts}
          target={target}
          turnLeft={seat.isTurn ? turnLeft : null}
          bubble={bubble?.seat === seat.id ? bubble : null}
          hit={hits?.[seat.id] ?? null}
          anchor={seat.id === danger}
          onSignal={onSignal}
        />
      ))}
    </header>
  );
}

function SeatBench({ seats, maxHearts, target = null, turnKey, turnMs, turnLeft = null, bubble, hits, landscape = false, roundKey = '', onSignal }) {
  if (landscape) return <SeatRow onSignal={onSignal} seats={seats} maxHearts={maxHearts} target={target} turnLeft={turnLeft} bubble={bubble} hits={hits} roundKey={roundKey} />;
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
              target={target}
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
