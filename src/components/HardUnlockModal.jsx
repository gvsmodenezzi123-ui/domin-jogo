import { BlackCase } from './CaseSelect.jsx';
import { useUnlockSequence } from './useUnlockSequence.js';

/**
 * Recompensa por zerar a Maleta Branca (Patch 0.6.3): antes do final, uma lousa escura
 * anuncia a campanha concluída, a Maleta Preta destranca na frente do jogador (cadeado
 * abrindo, correntes caindo, som seco de corrente) e o modo difícil fica liberado.
 * O App grava `buxaria_hard_mode_unlocked = true` assim que esta tela aparece.
 */
export default function HardUnlockModal({ onContinue }) {
  const stage = useUnlockSequence(true);
  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-[52] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="chalkboard unlock-board w-full max-w-[360px] px-4 py-5 text-center">
        <p className="chalk-dim font-pixel text-[8px]">CAMPANHA NORMAL CONCLUÍDA!</p>
        <h2 id="unlock-title" className="chalk-text mt-2 font-pixel text-[13px] leading-snug">
          VOCÊ QUEBROU A BANCA DO COMENDADOR!
        </h2>
        <div className="unlock-case mx-auto mt-4">
          <BlackCase stage={stage} />
        </div>
        <div className="chalk-line mx-auto mt-4" aria-hidden="true" />
        <p className={`unlock-reward mt-3 font-pixel text-[9px] leading-relaxed ${stage === 'open' ? 'is-on' : ''}`} role="status">
          NOVO MODO DESBLOQUEADO:
          <span>DOMINÓ PRETO (MODO DIFÍCIL)</span>
        </p>
        <p className="chalk-dim mt-2 font-term text-[17px] leading-tight">A Maleta Preta espera no NOVO JOGO.</p>
        <button type="button" data-tone="play" className="btn-pixel mt-5 w-full" onClick={onContinue}>
          VER O FINAL
        </button>
      </div>
    </div>
  );
}
