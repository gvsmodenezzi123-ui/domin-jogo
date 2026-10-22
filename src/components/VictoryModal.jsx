import CoinCount from './CoinCount.jsx';
import PagedBlocks from './PagedBlocks.jsx';
import RunEndBoard, { RunEndActions } from './RunEndBoard.jsx';
import RunSummaryBoard from './RunSummaryBoard.jsx';

/**
 * Fim da run vencida (Patch 0.9.2): o último chefe nocauteado (`portrait`), o título do
 * modo, o prêmio final, a lousa da tentativa (RunSummaryBoard) e a Conta do Boteco com
 * TENTAR NOVAMENTE.
 * Patch 0.9.3: sem scroll, em páginas (como o GameOverModal).
 */
export default function VictoryModal({ state, rival, portrait, kicker, title, howItEnded, challengeLine, prizeShown, onRetry, onMenu }) {
  return (
    <>
      <PagedBlocks className="min-h-0 flex-1" gap={12} squeeze={0.86} theme="chalk" label="Páginas do fim da run">
        <div className="run-end-head is-row">
          <div className="run-end-portrait">{portrait}</div>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-pixel text-[7px] leading-relaxed text-bone-400">{kicker}</p>
            <h2 id="round-title" className="run-won-title mt-1 font-pixel text-[11px] leading-snug text-brass-300 text-shadow-pixel">
              {title}
            </h2>
            <p className="mt-1 font-term text-[17px] leading-[1.05] text-bone-200">{howItEnded}</p>
            {challengeLine && <p className="mt-1 font-pixel text-[7px] leading-snug text-amber-300">{challengeLine}</p>}
            <div className="mt-1.5 flex items-center gap-2 font-pixel text-[9px] text-[#9fe08a]">
              <span>PRÊMIO FINAL</span>
              <CoinCount value={`${prizeShown}`} className="chalk-coins text-[13px]" size={16} />
            </div>
          </div>
        </div>
        <RunSummaryBoard state={state} won rivalName={rival.name} />
        <RunEndBoard runCaps={state.stats.caps ?? 0} />
      </PagedBlocks>
      <RunEndActions onRetry={onRetry} onMenu={onMenu} />
    </>
  );
}
