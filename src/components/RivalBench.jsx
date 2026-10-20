import { useState } from 'react';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import RivalHand from './RivalHand.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { MenuGlyph, SpeakerGlyph } from './UiGlyphs.jsx';

/**
 * O outro lado da mesa, com o layout TRAVADO (nada aqui muda de tamanho
 * quando o rival fala, pensa ou joga):
 *   - caixa fixa de 96px de altura (h-24), sem estouro;
 *   - bloco fixo de 160px à esquerda (w-40): retrato 40x40, status
 *     ("PENSANDO..."), nome, corações, moedas, dorme e os talismãs dele;
 *   - balão da fala em posição absoluta (não empurra ninguém), uma linha;
 *   - mão do rival presa à direita, cada pedra na sua vaga (RivalHand.jsx);
 *   - som e menu no canto de baixo à direita.
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
  roundKey,
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
      className={`rival-bench relative z-30 shrink-0 ${isTurn ? 'rival-bench-active' : ''}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 4px)' }}
    >
      <div className="relative h-24 w-full select-none overflow-hidden">
        {/* bloco fixo da esquerda */}
        <div className="absolute left-0 top-0 flex h-24 w-40 flex-shrink-0 gap-1.5 pl-2 pt-2">
          <div className="flex w-[60px] shrink-0 flex-col items-center">
            <div className={`avatar-frame relative ${isTurn ? 'avatar-frame-active' : ''}`} data-rival-avatar>
              <RivalAvatar rival={rival} mood={mood} size={48} hurtKey={hurtKey} speaking={mouthOpen} />
            </div>
            <span className={`rival-status font-pixel ${thinking ? 'rival-status-on' : ''}`} role="status" aria-live="polite">
              {thinking ? <span className="thinking-dots">PENSANDO</span> : status}
            </span>
          </div>
          <div className="flex w-[90px] min-w-0 flex-col gap-1">
            <h2 className="truncate font-pixel text-[8px] leading-none text-bone-50 text-shadow-pixel">{rival.name.toUpperCase()}</h2>
            <HeartsBar current={hearts} max={maxHearts} size={11} label={`${rival.name}: ${hearts} de ${maxHearts} corações`} />
            <div className="flex items-center gap-2">
              <CoinCount value={coins} target="tioZe" className="text-[8px]" size={12} />
              <span className="flex items-center gap-1" aria-label={`Dorme com ${boneyardCount} pedras`}>
                <span className="relative block h-[16px] w-[13px]">
                  {boneyardCount > 1 && <DominoTile faceDown unit={7} depth={1} className="absolute! left-[5px] top-0" />}
                  {boneyardCount > 0 && <DominoTile faceDown unit={7} depth={1} className="absolute! left-0 top-[2px]" />}
                </span>
                <span className="font-pixel text-[7px] leading-none text-bone-300">{boneyardCount}</span>
              </span>
            </div>
            <Hotbar relics={relics} size={20} cols={4} flashes={flashes} press={press} owner="tioZe" label={`Talismãs de ${rival.name}`} />
          </div>
        </div>

        {/* fala: absoluta, uma linha, nunca empurra a fileira */}
        {speech && <RivalSpeech key={speech.key} text={speech.text} voice={rival.id} onMouth={setMouthOpen} />}

        {/* mão do rival presa à direita: só a pedra jogada anima */}
        <RivalHand
          tiles={hand}
          revealedIds={revealedIds}
          roundKey={roundKey}
          containerRef={handRef}
          className="absolute right-2 top-2 flex h-16 w-[200px] items-center justify-end"
        />

        <div className="absolute bottom-1 right-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            className="icon-btn icon-btn-sm"
            aria-label={muted ? 'Ligar som e música' : 'Desligar som e música'}
            aria-pressed={muted}
          >
            <SpeakerGlyph muted={muted} size={18} />
          </button>
          <button type="button" onClick={onOpenMenu} className="icon-btn icon-btn-sm" aria-label="Menu">
            <MenuGlyph size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
