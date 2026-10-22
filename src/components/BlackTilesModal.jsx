import { useEffect } from 'react';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import DominoTile from './DominoTile.jsx';
import { TileSkinContext } from './tileSkin.js';

const TILES = [
  [6, 6],
  [5, 3],
  [4, 1],
];

/**
 * Recompensa por derrotar o Comendador nas Peças Brancas (Patch 0.8.0; antes era a Maleta
 * Preta). Uma lousa anuncia a campanha concluída, três pedras de ébano viram na mesa e as
 * Peças Pretas (modo difícil) ficam liberadas no Balcão. O App grava
 * `buxaria_black_tiles_unlocked = true` assim que esta tela aparece.
 */
export default function BlackTilesModal({ onContinue, continueLabel = 'VER O FINAL' }) {
  useEffect(() => {
    sound.playChainUnlock();
    haptic([20, 40, 60]);
  }, []);
  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-[52] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="chalkboard unlock-board w-full max-w-[360px] px-4 py-5 text-center">
        <p className="chalk-dim font-pixel text-[8px]">CAMPANHA NORMAL CONCLUÍDA!</p>
        <h2 id="unlock-title" className="chalk-text mt-2 font-pixel text-[13px] leading-snug">
          VOCÊ QUEBROU A BANCA DO COMENDADOR!
        </h2>
        <TileSkinContext.Provider value="onyx">
          <div className="black-tiles mx-auto mt-4" aria-hidden="true">
            {TILES.map(([a, b], i) => (
              <span key={`${a}-${b}`} className="black-tile-flip" style={{ animationDelay: `${300 + i * 260}ms` }}>
                <DominoTile values={[a, b]} unit={20} depth={3} />
              </span>
            ))}
          </div>
        </TileSkinContext.Provider>
        <div className="chalk-line mx-auto mt-4" aria-hidden="true" />
        <p className="unlock-reward is-on mt-3 font-pixel text-[9px] leading-relaxed" role="status">
          VOCÊ DESBLOQUEOU:
          <span>PEÇAS PRETAS (MODO DIFÍCIL)</span>
        </p>
        <p className="chalk-dim mt-2 font-term text-[17px] leading-tight">Escolha as Peças Pretas embaixo de qualquer maleta, no Balcão.</p>
        <button type="button" data-tone="play" className="btn-pixel mt-5 w-full" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
