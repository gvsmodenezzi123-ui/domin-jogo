import RivalAvatar from './RivalAvatar.jsx';
import RunEndBoard from './RunEndBoard.jsx';
import RunSummaryBoard from './RunSummaryBoard.jsx';

/**
 * Fim da run perdida (Patch 0.9.2): o rival que te nocauteou, rindo, como a última rodada
 * acabou, a lousa da tentativa (RunSummaryBoard, com o "NOCAUTEADO POR ...") e a Conta do
 * Boteco com TENTAR NOVAMENTE.
 */
export default function GameOverModal({ state, rival, kicker, howItEnded, onRetry, onMenu }) {
  return (
    <>
      <div className="mx-auto mb-2 w-fit">
        <RivalAvatar rival={rival} mood="smug" pixel={5} />
      </div>
      <p className="font-pixel text-[8px] text-bone-400">{kicker}</p>
      <p className="mt-2 font-term text-xl text-bone-200">{howItEnded}</p>
      {/* o título do fim ("NOCAUTEADO POR ...") é o da lousa */}
      <RunSummaryBoard state={state} won={false} rivalName={rival.name} titleId="round-title" />
      <RunEndBoard runCaps={state.stats.caps ?? 0} onRetry={onRetry} onMenu={onMenu} />
    </>
  );
}
