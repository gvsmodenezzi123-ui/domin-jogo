import PagedBlocks from './PagedBlocks.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import RunEndBoard, { RunEndActions } from './RunEndBoard.jsx';
import RunSummaryBoard from './RunSummaryBoard.jsx';

/**
 * Fim da run perdida (Patch 0.9.2): o rival que te nocauteou, rindo, como a última rodada
 * acabou, a lousa da tentativa (RunSummaryBoard, com o "NOCAUTEADO POR ...") e a Conta do
 * Boteco com TENTAR NOVAMENTE.
 * Patch 0.9.3: sem scroll. O que não cabe na tela passa para a próxima página da lousa
 * (setas embaixo, ou arrastar); TENTAR NOVAMENTE e MENU ficam sempre à mão.
 */
export default function GameOverModal({ state, rival, kicker, howItEnded, onRetry, onMenu }) {
  return (
    <>
      <PagedBlocks className="min-h-0 flex-1" gap={12} squeeze={0.86} theme="chalk" label="Páginas do fim da run">
        <div className="run-end-head is-row">
          <div className="run-end-face">
            <RivalAvatar rival={rival} mood="smug" pixel={3} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-pixel text-[8px] leading-relaxed text-bone-400">{kicker}</p>
            <p className="mt-1 font-term text-[19px] leading-[1.05] text-bone-200">{howItEnded}</p>
          </div>
        </div>
        {/* o título do fim ("NOCAUTEADO POR ...") é o da lousa */}
        <RunSummaryBoard state={state} won={false} rivalName={rival.name} titleId="round-title" />
        <RunEndBoard runCaps={state.stats.caps ?? 0} />
      </PagedBlocks>
      <RunEndActions onRetry={onRetry} onMenu={onMenu} />
    </>
  );
}
