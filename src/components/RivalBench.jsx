import { useState } from 'react';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import PixelSprite from './PixelSprite.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import RivalHand from './RivalHand.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { MENU_ICON, SPEAKER_OFF, SPEAKER_ON, SPEAKER_PALETTE } from './sprites.js';

const MOOD_LABEL = {
  idle: 'de olho em você',
  thinking: 'pensando',
  smug: 'rindo de canto',
  hurt: 'ferido',
};

/**
 * O outro lado da mesa: o rival sentado no feltro, sem prateleira de madeira.
 * Retrato, status ("PENSANDO...") e hotbar dele (2x2) à esquerda; nome,
 * corações, moedas e o dorme no topo; a mão dele flutuando logo abaixo.
 * A fala aparece num balão compacto colado no retrato, letra a letra e com a
 * voz do rival (RivalSpeech.jsx), e some logo depois.
 */
export default function RivalBench({
  rival,
  hearts,
  maxHearts,
  coins,
  hand,
  revealed,
  boneyardCount,
  relics,
  flashes,
  isTurn,
  thinking = false,
  status = null,
  mood,
  hurtKey,
  speech,
  handRef,
  muted,
  onToggleMute,
  onOpenMenu,
  press,
}) {
  const revealedIds = new Set(revealed.map((t) => t.id));
  // boca do retrato abre e fecha enquanto a fala aparece no balão
  const [mouthOpen, setMouthOpen] = useState(false);
  return (
    <header
      className={`rival-bench relative z-30 shrink-0 px-3 pb-1.5 ${isTurn ? 'rival-bench-active' : ''}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
    >
      <div className="flex gap-2.5">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <div className={`avatar-frame relative ${isTurn ? 'avatar-frame-active' : ''}`} data-rival-avatar>
            <RivalAvatar rival={rival} mood={mood} size={56} hurtKey={hurtKey} speaking={mouthOpen} />
          </div>
          <span className={`rival-status font-pixel ${thinking ? 'rival-status-on' : ''}`} role="status" aria-live="polite">
            {thinking ? <span className="thinking-dots">PENSANDO</span> : status}
          </span>
          <Hotbar relics={relics} size={23} cols={2} flashes={flashes} press={press} owner="tioZe" label={`Talismãs de ${rival.name}`} />
        </div>

        <div className="relative min-w-0 flex-1">
          {speech && <RivalSpeech key={speech.key} text={speech.text} voice={rival.id} onMouth={setMouthOpen} />}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-pixel text-[10px] leading-none text-bone-50 text-shadow-pixel">{rival.name.toUpperCase()}</h2>
              <p className="mt-1 truncate font-term text-[15px] leading-none text-bone-300">
                {`${rival.title} · ${MOOD_LABEL[mood] ?? MOOD_LABEL.idle}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleMute}
                className="icon-btn"
                aria-label={muted ? 'Ligar som e música' : 'Desligar som e música'}
                aria-pressed={muted}
              >
                <PixelSprite rows={muted ? SPEAKER_OFF : SPEAKER_ON} palette={SPEAKER_PALETTE} pixel={2} />
              </button>
              <button type="button" onClick={onOpenMenu} className="icon-btn" aria-label="Menu">
                <PixelSprite rows={MENU_ICON} palette={SPEAKER_PALETTE} pixel={2} />
              </button>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <HeartsBar current={hearts} max={maxHearts} pixel={2} label={`${rival.name}: ${hearts} de ${maxHearts} corações`} />
            <div className="flex shrink-0 items-center gap-2.5">
              <CoinCount value={coins} target="tioZe" />
              <span className="flex items-center gap-1" aria-label={`Dorme com ${boneyardCount} pedras`}>
                <span className="relative block h-[18px] w-[15px]">
                  {boneyardCount > 1 && <DominoTile faceDown unit={8} depth={1} className="absolute! left-[5px] top-0" />}
                  {boneyardCount > 0 && <DominoTile faceDown unit={8} depth={1} className="absolute! left-0 top-[2px]" />}
                </span>
                <span className="font-pixel text-[8px] leading-none text-bone-300">{boneyardCount}</span>
              </span>
            </div>
          </div>

          <RivalHand tiles={hand} revealedIds={revealedIds} className="mt-1" containerRef={handRef} />
        </div>
      </div>
    </header>
  );
}
