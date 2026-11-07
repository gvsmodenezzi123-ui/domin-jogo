import CoinCount from './CoinCount.jsx';
import DominoKey from './DominoKey.jsx';
import LandStage from './LandStage.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import RivalBust from './RivalBust.jsx';
import RunEndBoard from './RunEndBoard.jsx';
import RunSummaryBoard from './RunSummaryBoard.jsx';
import { END_H, END_PAD, END_W, paintEndBack, paintEndFront } from './art/landEnd.js';

/**
 * Versão 2.11: o fim da run deitado, desenhado para o palco 16:9 (nada esticado, nada de
 * páginas: cabe tudo de uma vez). À esquerda, como acabou: quem te nocauteou rindo atrás do
 * balcão (ou o último chefe nocauteado, com o carimbo de K.O. e o prêmio), e as pedras de
 * TENTAR NOVAMENTE e MENU; no meio, a lousa da tentativa (RunSummaryBoard); à direita, a Conta
 * do Boteco no quadro de letras (RunEndBoard), com as melhorias para comprar ali mesmo.
 */
export default function RunEndLand({ state, rival, won, kicker, title, howItEnded, challengeLine, prizeShown, onRetry, onMenu }) {
  return (
    <LandStage
      paint={() => paintEndBack(won)}
      cacheKey={`land-fim-${won ? 'ganhou' : 'perdeu'}`}
      pad={END_PAD}
      bleed="#060508"
      className={`run-end-land ${won ? 'is-won' : 'is-lost'} animate-overlay-in`}
      label={won ? 'Run vencida' : 'Fim da run'}
      role="dialog"
    >
      <div className="rel-bust" aria-hidden="true">
        <div className={won ? 'rel-ko' : 'seat-breath'}>
          <RivalBust rival={rival} mood={won ? 'hurt' : 'smug'} />
        </div>
        {won && <span className="rel-stamp">K.O.</span>}
      </div>
      <PixelCanvas
        cacheKey={`land-fim-balcao-${won ? 'ganhou' : 'perdeu'}`}
        paint={() => paintEndFront(won)}
        w={END_W + END_PAD.x * 2}
        h={END_H + END_PAD.y * 2}
        scale={2}
        className="rel-front"
        style={{ left: -END_PAD.x * 2, top: -END_PAD.y * 2 }}
      />

      <header className="rel-head">
        <p className="rel-kicker">{kicker}</p>
        {title && (
          <h2 id="round-title" className="rel-title">
            {title}
          </h2>
        )}
        <p className="rel-how">{howItEnded}</p>
        {challengeLine && <p className="rel-challenge">{challengeLine}</p>}
      </header>

      <div className="rel-keys">
        {won && (
          <p className="rel-prize">
            <span>PRÊMIO FINAL</span>
            <CoinCount value={`${prizeShown}`} className="chalk-coins" size={18} />
          </p>
        )}
        <DominoKey label="TENTAR NOVAMENTE" pips={6} tone="ivory" w={272} h={52} className="rel-retry" onClick={onRetry} />
        <DominoKey label="MENU" pips={0} w={272} h={40} className="rel-menu" onClick={onMenu} />
      </div>

      <div className="rel-slate">
        {/* perdeu: o título do fim ("NOCAUTEADO POR ...") é o da lousa */}
        <RunSummaryBoard state={state} won={won} rivalName={rival.name} titleId={won ? 'slate-title' : 'round-title'} />
      </div>
      <div className="rel-tab">
        <RunEndBoard runCaps={state.stats.caps ?? 0} />
      </div>
    </LandStage>
  );
}
