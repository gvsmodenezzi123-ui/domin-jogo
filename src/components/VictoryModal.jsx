import CoinCount from './CoinCount.jsx';
import RunEndBoard from './RunEndBoard.jsx';
import RunSummaryBoard from './RunSummaryBoard.jsx';

/**
 * Fim da run vencida (Patch 0.9.2): o último chefe nocauteado (`portrait`), o título do
 * modo, o prêmio final, a lousa da tentativa (RunSummaryBoard) e a Conta do Boteco com
 * TENTAR NOVAMENTE.
 */
export default function VictoryModal({ state, rival, portrait, kicker, title, howItEnded, challengeLine, prizeShown, onRetry, onMenu }) {
  return (
    <>
      {portrait}
      <p className="font-pixel text-[8px] text-bone-400">{kicker}</p>
      <h2 id="round-title" className="run-won-title mt-2 font-pixel text-[15px] leading-snug text-brass-300 text-shadow-pixel">
        {title}
      </h2>
      <p className="mt-2 font-term text-xl text-bone-200">{howItEnded}</p>
      {challengeLine && <p className="mt-1 font-pixel text-[8px] text-amber-300">{challengeLine}</p>}
      <div className="mt-3 flex items-center justify-center gap-2 font-pixel text-[10px] text-[#9fe08a]">
        <span>PRÊMIO FINAL</span>
        <CoinCount value={`${prizeShown}`} className="chalk-coins text-[14px]" size={18} />
      </div>
      <RunSummaryBoard state={state} won rivalName={rival.name} />
      <RunEndBoard runCaps={state.stats.caps ?? 0} onRetry={onRetry} onMenu={onMenu} />
    </>
  );
}
