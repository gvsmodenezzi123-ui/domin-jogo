import { memo, useLayoutEffect, useRef, useState } from 'react';
import CoinCount from './CoinCount.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import RivalHand from './RivalHand.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import RivalSeat from './RivalSeat.jsx';
import BotecoBackdrop from './BotecoBackdrop.jsx';
import { shortRivalName } from '../engine/rivalInfo.js';
import { HEARTBEAT_BPM } from '../engine/audioSynth.js';
import { useTalk } from './useTalk.js';

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
function RivalBenchPortrait({
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
  handRef,
  roundKey,
  press,
  avatar = null,
  numberCounts = null,
  danger = 0,
}) {
  const revealedIds = new Set(revealed.map((t) => t.id));
  // Versão 2.1: a fala nova espera a atual terminar (antes ela cortava a frase no meio toda
  // vez que você jogava). Só a mais recente fica na fila.
  const [talkNow, finishTalk] = useTalk(speech);
  // 2.1: a régua das pedras nunca invade o bloco do retrato (polaroide de 64 px, corações e
  // dinheiro): mede onde a faixa dos corações termina e a régua cabe no que sobra à direita
  const statsRef = useRef(null);
  const [room, setRoom] = useState(214);
  useLayoutEffect(() => {
    const el = statsRef.current;
    const bench = el?.closest('.rival-bench');
    if (!el || !bench || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => {
      const free = bench.getBoundingClientRect().right - el.getBoundingClientRect().right - 14;
      setRoom(Math.max(96, Math.min(214, Math.floor(free))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    ro.observe(bench);
    return () => ro.disconnect();
  }, []);
  const rackWidth = Math.min(room, 18 + Math.max(3, hand.length) * 22);
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
        <div className="absolute left-0 top-0 flex h-24 w-44 flex-shrink-0 gap-1.5 pl-2 pt-1.5">
          <div className="flex w-[72px] shrink-0 flex-col items-center">
            <div className={`avatar-frame relative ${isTurn ? 'avatar-frame-active' : ''}`} data-rival-avatar>
              {avatar ?? <RivalAvatar rival={rival} mood={mood} size={64} hurtKey={hurtKey} speaking={mouthOpen} />}
            </div>
            <span className={`rival-status font-pixel ${thinking ? 'rival-status-on' : ''}`} role="status" aria-live="polite">
              {thinking ? <span className="thinking-dots">PENSANDO</span> : status}
            </span>
          </div>
          <div className="rival-plate flex min-w-0 flex-col items-start gap-1">
            {/* Versão 2.0: o nome curto ("JUVENAL C."), sem reticências, entalhado numa plaquinha de
                madeira pendurada na parede; o nome inteiro fica para o leitor de tela */}
            <h2
              className={`rival-name rival-nameplate whitespace-nowrap font-pixel leading-none ${shortRivalName(rival.name).length > 10 ? 'text-[7px]' : 'text-[8px]'}`}
              aria-label={rival.name}
            >
              {shortRivalName(rival.name)}
            </h2>
            {/* corações e dinheiro numa faixa escura só do tamanho deles */}
            <div ref={statsRef} className="rival-stats">
              <HeartsBar current={hearts} max={maxHearts} size={11} label={`${rival.name}: ${hearts} de ${maxHearts} corações`} />
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
        {/* Versão 2.0: as pedras do rival em pé numa régua de madeira, em cima da prateleira */}
        <div className="rival-rack absolute right-1.5" style={{ width: rackWidth }}>
          <span aria-hidden="true" className="rival-rack-back" />
          {/* versão 2.5: a última pedra dele brilha em vermelho no ritmo do coração */}
          {danger > 0 && <span key={danger} aria-hidden="true" className="rival-rack-danger" style={{ '--beat': `${Math.round(60000 / HEARTBEAT_BPM[danger])}ms` }} />}
          <RivalHand
            tiles={hand}
            revealedIds={revealedIds}
            foreseenId={foreseenId}
            roundKey={roundKey}
            containerRef={handRef}
            room={rackWidth - 14}
            className="rival-rack-tiles absolute flex items-center justify-end"
          />
          <span aria-hidden="true" className="rival-rack-lip" />
        </div>

      </div>

      {/* fala: logo abaixo do cabeçalho, sobre o feltro, com a cauda subindo até o retrato
          (o retrato fica centrado em x = 38 px; o balão começa em 12 px) */}
      {talkNow && (
        <RivalSpeech
          key={talkNow.key}
          text={talkNow.text}
          voice={rival.id}
          onMouth={setMouthOpen}
          tail="up"
          tailX={26}
          onFinish={finishTalk}
          className="speech-rival z-40"
        />
      )}
    </header>
  );
}

/** Versão 2.9: com a tela deitada, o rival senta do outro lado da mesa (RivalSeat.jsx). */
function RivalBench({ landscape = false, ...props }) {
  return landscape ? <RivalSeat {...props} /> : <RivalBenchPortrait {...props} />;
}

// Patch 0.5.4: só redesenha quando as props mudam (não a cada moeda/dica/fala da mesa)
export default memo(RivalBench);
