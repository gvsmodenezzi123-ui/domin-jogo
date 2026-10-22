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

/** O que cada recompensa anuncia (Peças Pretas no 0.8.0; Peças Prateadas no 0.9.0). */
const REWARDS = {
  black: {
    skin: 'onyx',
    kicker: 'CAMPANHA NORMAL CONCLUÍDA!',
    title: 'VOCÊ QUEBROU A BANCA DO COMENDADOR!',
    reward: 'PEÇAS PRETAS (MODO DIFÍCIL)',
    hint: 'Escolha as Peças Pretas embaixo de qualquer maleta, no Balcão.',
    tone: 'is-on',
  },
  silver: {
    skin: 'silver',
    kicker: 'PEÇAS PRETAS CONCLUÍDAS!',
    title: 'O SUBMUNDO SE AJOELHOU!',
    reward: 'PEÇAS PRATEADAS (MODO INFERNO)',
    hint: 'Rivais com talismãs desde a 1ª mesa, chefes com 5 talismãs e 10 pedras de grife, e só 1 coração de volta por mesa.',
    tone: 'is-on is-silver',
  },
};

/**
 * Recompensa por zerar um modo (Patch 0.8.0, antes era a Maleta Preta): uma lousa anuncia a
 * campanha concluída, três pedras do modo novo viram na mesa e ele fica liberado no Balcão.
 *   black   zerou nas Peças Brancas → Peças Pretas (modo difícil)
 *   silver  zerou nas Peças Pretas → Peças Prateadas (Modo Inferno, Patch 0.9.0)
 * O App grava o desbloqueio (`buxaria_black_tiles_unlocked` / `buxaria_silver_tiles_unlocked`)
 * assim que esta tela aparece.
 */
export default function TilesUnlockModal({ kind = 'black', onContinue, continueLabel = 'VER O FINAL' }) {
  const info = REWARDS[kind] ?? REWARDS.black;
  useEffect(() => {
    sound.playChainUnlock();
    haptic([20, 40, 60]);
  }, []);
  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-[52] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="chalkboard unlock-board w-full max-w-[360px] px-4 py-5 text-center">
        <p className="chalk-dim font-pixel text-[8px]">{info.kicker}</p>
        <h2 id="unlock-title" className="chalk-text mt-2 font-pixel text-[13px] leading-snug">
          {info.title}
        </h2>
        <TileSkinContext.Provider value={info.skin}>
          <div className="black-tiles mx-auto mt-4" aria-hidden="true">
            {TILES.map(([a, b], i) => (
              <span key={`${a}-${b}`} className="black-tile-flip" style={{ animationDelay: `${300 + i * 260}ms` }}>
                <DominoTile values={[a, b]} unit={20} depth={3} />
              </span>
            ))}
          </div>
        </TileSkinContext.Provider>
        <div className="chalk-line mx-auto mt-4" aria-hidden="true" />
        <p className={`unlock-reward ${info.tone} mt-3 font-pixel text-[9px] leading-relaxed`} role="status">
          VOCÊ DESBLOQUEOU:
          <span>{info.reward}</span>
        </p>
        <p className="chalk-dim mt-2 font-term text-[17px] leading-tight">{info.hint}</p>
        <button type="button" data-tone="play" className="btn-pixel mt-5 w-full" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
