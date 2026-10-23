import { useSyncExternalStore } from 'react';
import { CHALLENGES, CHALLENGE_IDS } from '../data/meta.js';
import { loadChallenges, loadEquippedFrame, saveEquippedFrame, subscribeMeta } from '../engine/meta.js';
import PagedBlocks from './PagedBlocks.jsx';

const challengesKey = () => {
  const { unlocked, done } = loadChallenges();
  return `${unlocked.join(',')}|${done.join(',')}`;
};
const frameKey = () => loadEquippedFrame() ?? '';

/**
 * Desafios (Patch 0.8.0): regras extremas, liberadas por metas. Trancado mostra a meta;
 * liberado mostra a regra e o JOGAR (abre o Balcão de Maletas com o desafio valendo);
 * concluído dá a moldura, que dá para equipar aqui (ela enfeita a sua mão na mesa).
 * Patch 0.9.3: sem scroll, um cartão por bloco em páginas (PagedBlocks).
 */
export default function ChallengesModal({ onPlay }) {
  const key = useSyncExternalStore(subscribeMeta, challengesKey, () => '|');
  const frame = useSyncExternalStore(subscribeMeta, frameKey, () => '');
  const [unlockedRaw, doneRaw] = key.split('|');
  const unlocked = unlockedRaw ? unlockedRaw.split(',') : [];
  const done = doneRaw ? doneRaw.split(',') : [];

  return (
    <PagedBlocks className="min-h-0 flex-1" gap={8} label="Páginas dos desafios">
      {CHALLENGE_IDS.map((id) => {
        const challenge = CHALLENGES[id];
        const open = unlocked.includes(id);
        const finished = done.includes(id);
        const equipped = frame === challenge.frame;
        return (
          <div key={id} role="group" aria-label={open ? challenge.name : 'Desafio bloqueado'} className={`challenge-card ${open ? '' : 'is-locked'} ${finished ? 'is-done' : ''}`}>
            <span className={`challenge-frame frame-${challenge.frame} ${finished ? '' : 'is-dim'}`} aria-hidden="true">
              {open ? '♠' : '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-pixel text-[8px] leading-snug text-bone-50">
                {open ? challenge.name.toUpperCase() : 'BLOQUEADO'}
                {finished && <span className="challenge-done"> · CONCLUÍDO</span>}
              </p>
              {open ? (
                <>
                  <p className="mt-0.5 font-term text-[16px] leading-[1.05] text-bone-200">{challenge.rule}</p>
                  <p className="mt-1 flex items-center gap-1 font-pixel text-[7px] text-amber-300">
                    PRÊMIO: {challenge.frameName.toUpperCase()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" data-tone="play" className="btn-pixel btn-mini" onClick={() => onPlay(id)}>
                      {finished ? 'JOGAR DE NOVO' : 'JOGAR'}
                    </button>
                    {finished && (
                      <button type="button" data-tone="brass" className="btn-pixel btn-mini" onClick={() => saveEquippedFrame(equipped ? null : challenge.frame)} aria-pressed={equipped}>
                        {equipped ? 'TIRAR MOLDURA' : 'EQUIPAR MOLDURA'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="book-unlock-goal mt-1">
                  <p className="font-pixel text-[7px] leading-snug text-amber-300">[?] COMO DESBLOQUEAR:</p>
                  <p className="mt-0.5 font-term text-[15px] leading-[1.05] text-amber-100">{challenge.goal}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </PagedBlocks>
  );
}
