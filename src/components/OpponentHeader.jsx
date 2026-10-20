import DominoTile from './DominoTile.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import PixelSprite from './PixelSprite.jsx';
import { COIN, COIN_PALETTE, SPEAKER_OFF, SPEAKER_ON, SPEAKER_PALETTE, TIO_ZE_FACES, TIO_ZE_PALETTE } from './sprites.js';

export function CoinCount({ value, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 font-pixel text-[10px] text-brass-300 ${className}`}>
      <PixelSprite rows={COIN} palette={COIN_PALETTE} pixel={2} />
      <span aria-label={`${value} moedas`}>${value}</span>
    </span>
  );
}

export function TioZeAvatar({ mood = 'idle', pixel = 4, hurtKey }) {
  const rows = TIO_ZE_FACES[mood] ?? TIO_ZE_FACES.idle;
  return (
    <span key={hurtKey} className={`block ${mood === 'hurt' ? 'animate-avatar-hit' : ''}`}>
      <PixelSprite rows={rows} palette={TIO_ZE_PALETTE} pixel={pixel} title="Tio Zé" />
    </span>
  );
}

const MOOD_LABEL = {
  idle: 'de olho em você',
  thinking: 'pensando',
  smug: 'rindo de canto',
  hurt: 'ferido',
};

/**
 * Painel superior: avatar do Tio Zé, corações racháveis, moedas,
 * pedras viradas na mão dele e o Dorme.
 */
export default function OpponentHeader({
  hearts,
  maxHearts,
  coins,
  handCount,
  boneyardCount,
  isTurn,
  mood,
  hurtKey,
  speech,
  muted,
  onToggleMute,
}) {
  const shownBacks = Math.min(handCount, 14);
  const overlap = handCount > 9 ? -5 : 2;

  return (
    <header
      className={`opponent-panel relative z-30 shrink-0 px-3 pb-2 ${isTurn ? 'opponent-panel-active' : ''}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
    >
      <div className="flex items-stretch gap-3">
        <div className={`avatar-frame relative shrink-0 ${isTurn ? 'avatar-frame-active' : ''}`}>
          <TioZeAvatar mood={mood} pixel={4} hurtKey={hurtKey} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-pixel text-[11px] leading-none text-bone-50 text-shadow-pixel">TIO ZÉ</h2>
              <p className="mt-1 truncate font-term text-[15px] leading-none text-bone-300">
                {isTurn ? (
                  <span className="thinking-dots">pensando</span>
                ) : (
                  MOOD_LABEL[mood] ?? MOOD_LABEL.idle
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              className="icon-btn shrink-0"
              aria-label={muted ? 'Ligar som' : 'Desligar som'}
              aria-pressed={muted}
            >
              <PixelSprite rows={muted ? SPEAKER_OFF : SPEAKER_ON} palette={SPEAKER_PALETTE} pixel={2} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <HeartsBar current={hearts} max={maxHearts} pixel={2} label={`Tio Zé: ${hearts} de ${maxHearts} corações`} />
            <CoinCount value={coins} />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="flex min-w-0 items-end" aria-label={`Tio Zé tem ${handCount} pedras`}>
              {Array.from({ length: shownBacks }, (_, i) => (
                <DominoTile
                  key={i}
                  faceDown
                  unit={10}
                  depth={1}
                  style={{ marginLeft: i === 0 ? 0 : overlap }}
                />
              ))}
              <span className="ml-2 font-pixel text-[9px] text-bone-300">×{handCount}</span>
            </div>

            <div className="flex shrink-0 items-end gap-1.5" aria-label={`Dorme com ${boneyardCount} pedras`}>
              <span className="relative block h-[22px] w-[18px]">
                {boneyardCount > 2 && <DominoTile faceDown unit={9} depth={1} className="absolute! left-[6px] top-0" />}
                {boneyardCount > 1 && <DominoTile faceDown unit={9} depth={1} className="absolute! left-[3px] top-[1px]" />}
                {boneyardCount > 0 && <DominoTile faceDown unit={9} depth={1} className="absolute! left-0 top-[2px]" />}
              </span>
              <span className="font-pixel text-[9px] leading-none text-bone-300">
                DORME
                <span className="mt-1 block text-[11px] text-bone-50">{boneyardCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {speech && (
        <div
          key={speech.key}
          className="speech-bubble animate-speech pointer-events-none absolute left-1/2 top-full z-40 mt-[54px] w-max max-w-[64%] -translate-x-1/2 text-center"
          role="status"
        >
          {speech.text}
        </div>
      )}
    </header>
  );
}
