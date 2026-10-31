import { memo, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import RivalHand from './RivalHand.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import BotecoBackdrop from './BotecoBackdrop.jsx';

/**
 * O outro lado da mesa, com o layout TRAVADO (nada aqui muda de tamanho
 * quando o rival fala, pensa ou joga):
 *   - caixa fixa de 96px de altura (h-24), sem estouro;
 *   - bloco fixo de 160px à esquerda (w-40): retrato 40x40, status
 *     ("PENSANDO..."), nome, corações, moedas e os talismãs dele (o dorme mora no
 *     canto da mesa desde o 0.7.0);
 *   - balão da fala (Patch 0.5.5) fora da caixa travada: cresce para baixo, sobre o
 *     feltro, com a frase inteira e a cauda apontando para o retrato;
 *   - mão do rival presa à direita, cada pedra na sua vaga (RivalHand.jsx);
 *   - o som e o menu moram na sua hotbar desde o 0.6.2.
 */
function RivalBench({
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
  mood,
  hurtKey,
  speech,
  hushSpeech = false,
  handRef,
  roundKey,
  press,
  avatar = null,
  numberCounts = null,
}) {
  const revealedIds = new Set(revealed.map((t) => t.id));
  // boca do retrato abre e fecha enquanto a fala aparece no balão
  const [mouthOpen, setMouthOpen] = useState(false);
  return (
    <header
      className={`rival-bench relative z-30 shrink-0 ${isTurn ? 'rival-bench-active' : ''}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 4px)' }}
    >
      {/* Versão 1.5: atrás do rival, a parede de azulejo do boteco com a prateleira */}
      <BotecoBackdrop scene="match" className="rival-bench-wall absolute inset-0" />
      <div className="relative h-24 w-full select-none overflow-hidden">
        {/* bloco fixo da esquerda */}
        <div className="absolute left-0 top-0 flex h-24 w-40 flex-shrink-0 gap-1.5 pl-2 pt-2">
          <div className="flex w-[60px] shrink-0 flex-col items-center">
            <div className={`avatar-frame relative ${isTurn ? 'avatar-frame-active' : ''}`} data-rival-avatar>
              {avatar ?? <RivalAvatar rival={rival} mood={mood} size={48} hurtKey={hurtKey} speaking={mouthOpen} />}
            </div>
            <span className={`rival-status font-pixel ${thinking ? 'rival-status-on' : ''}`} role="status" aria-live="polite">
              {thinking ? <span className="thinking-dots">PENSANDO</span> : status}
            </span>
          </div>
          <div className="flex w-[90px] min-w-0 flex-col gap-1">
            <h2 className="truncate font-pixel text-[8px] leading-none text-bone-50 text-shadow-pixel">{rival.name.toUpperCase()}</h2>
            <HeartsBar current={hearts} max={maxHearts} size={11} label={`${rival.name}: ${hearts} de ${maxHearts} corações`} />
            {/* o dorme saiu daqui no 0.7.0: agora fica grande no canto da mesa (TableBoard) */}
            <div className="flex items-center gap-2">
              <CoinCount value={coins} target="tioZe" className="text-[8px]" size={12} />
            </div>
            <Hotbar relics={relics} size={20} cols={4} flashes={flashes} press={press} owner="tioZe" bare label={`Talismãs de ${rival.name}`} />
          </div>
        </div>

        {/* versão 1.4, Lupa de Joalheiro: quantas pedras com cada número ele tem (embaixo da mão) */}
        {numberCounts && (
          <div className="rival-counts absolute bottom-0.5 right-2 flex gap-[3px] font-pixel" role="status" aria-label={`Lupa: ${numberCounts.map((n, i) => `${n} com ${i}`).join(', ')}`}>
            {numberCounts.map((n, i) => (
              <span key={i} className={`rival-count ${n === 0 ? 'is-zero' : ''}`} aria-hidden="true">
                <span className="rival-count-face">{i}</span>
                <span className="rival-count-sep">×</span>
                <span className="rival-count-n">{n}</span>
              </span>
            ))}
          </div>
        )}

        {/* mão do rival presa à direita: só a pedra jogada anima */}
        <RivalHand
          tiles={hand}
          revealedIds={revealedIds}
          foreseenId={foreseenId}
          roundKey={roundKey}
          containerRef={handRef}
          className="absolute right-2 top-4 flex h-16 w-[200px] items-center justify-end"
        />

      </div>

      {/* fala: logo abaixo do cabeçalho, sobre o feltro, com a cauda subindo até o retrato
          (o retrato fica centrado em x = 38 px; o balão começa em 12 px) */}
      {speech && (
        <RivalSpeech
          key={speech.key}
          text={speech.text}
          voice={rival.id}
          onMouth={setMouthOpen}
          tail="up"
          tailX={26}
          hush={hushSpeech}
          className="speech-rival z-40"
        />
      )}
    </header>
  );
}

// Patch 0.5.4: só redesenha quando as props mudam (não a cada moeda/dica/fala da mesa)
export default memo(RivalBench);
