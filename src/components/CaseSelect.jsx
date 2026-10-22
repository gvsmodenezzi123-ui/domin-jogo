import { useEffect, useState } from 'react';
import { HARD_LOCKED_TEXT, MODES } from '../data/difficulty.js';
import { sound } from '../engine/audioSynth.js';
import { haptic, loadHardIntroSeen, saveHardIntroSeen } from '../engine/progress.js';
import LampRig from './LampRig.jsx';
import { CadeadoSprite, CorrentesSprite, MaletaBrancaSprite, MaletaPretaSprite } from './art/CaseArt.jsx';
import { useUnlockSequence } from './useUnlockSequence.js';

/** A Maleta Preta em qualquer estágio: trancada (corrente e cadeado), destrancando ou aberta (com a aura). */
export function BlackCase({ stage, shakeKey = 0, className = '' }) {
  const open = stage === 'open';
  return (
    <span className={`case-art case-black ${open ? 'is-open' : ''} ${className}`}>
      {open && <span aria-hidden="true" className="case-aura" />}
      <span key={`body-${open}-${shakeKey}`} className={`case-body ${open ? 'case-open-pop' : ''} ${shakeKey ? 'case-shake' : ''}`}>
        <MaletaPretaSprite open={open} className="case-sprite" />
      </span>
      {!open && (
        <>
          <span aria-hidden="true" className={`case-chains ${stage === 'unlocking' ? 'is-falling' : ''}`}>
            <CorrentesSprite className="case-sprite" />
          </span>
          <span aria-hidden="true" className={`case-lock ${stage === 'unlocking' ? 'is-open' : ''}`}>
            <CadeadoSprite open={stage === 'unlocking'} className="case-sprite" />
          </span>
        </>
      )}
    </span>
  );
}

/**
 * Tela das maletas (Patch 0.6.3), depois do NOVO JOGO: uma mesa de feltro escuro sob a
 * lâmpada com duas maletas de dominó.
 *   Maleta Branca  sempre liberada: run no modo normal
 *   Maleta Preta   trancada por corrente e cadeado até derrotar o Comendador no normal
 *                  (tocar avisa); liberada, as correntes caem na primeira vez e ela fica
 *                  aberta com uma aura roxa: run no modo difícil
 */
export default function CaseSelect({ hardUnlocked, onPick, onBack }) {
  const [introSeen] = useState(() => loadHardIntroSeen());
  const playIntro = hardUnlocked && !introSeen;
  const stage = useUnlockSequence(playIntro, hardUnlocked ? 'open' : 'locked');
  const [warn, setWarn] = useState(0);

  useEffect(() => {
    if (playIntro) saveHardIntroSeen();
  }, [playIntro]);

  const pickBlack = () => {
    if (!hardUnlocked) {
      setWarn((n) => n + 1);
      sound.playChainRattle();
      haptic([30, 40, 30]);
      return;
    }
    if (stage !== 'open') return;
    onPick('hard');
  };

  return (
    <div className="case-scene fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="case-title">
      <div className="case-lamp" aria-hidden="true">
        <LampRig part="light" lamp={52} cord={24} beamWidth={420} />
        <LampRig part="body" lamp={52} cord={24} beamWidth={420} className="z-[6]" />
      </div>
      <div className="case-scroll">
        <h1 id="case-title" className="case-title">
          ESCOLHA A MALETA
          <span>Cada maleta é uma run diferente</span>
        </h1>

        <div className="case-felt">
          <button type="button" className="scene-tap case-pick case-pick-white" onClick={() => onPick('normal')} aria-label={`${MODES.normal.name}: ${MODES.normal.description}`}>
            <span className="case-art case-white">
              <span className="case-body">
                <MaletaBrancaSprite className="case-sprite" />
              </span>
            </span>
            <span className="case-name">{MODES.normal.name}</span>
            <span className="case-tag">{MODES.normal.tag}</span>
            <span className="case-desc">{MODES.normal.description}</span>
          </button>

          <button
            type="button"
            className={`scene-tap case-pick case-pick-black ${hardUnlocked ? '' : 'is-locked'}`}
            onClick={pickBlack}
            aria-label={hardUnlocked ? `${MODES.hard.name}: ${MODES.hard.description}` : `${MODES.hard.name}: trancada. ${HARD_LOCKED_TEXT}`}
            aria-disabled={!hardUnlocked}
          >
            <BlackCase stage={stage} shakeKey={warn} />
            <span className="case-name">{MODES.hard.name}</span>
            <span className="case-tag">{hardUnlocked ? MODES.hard.tag : 'TRANCADA'}</span>
            <span className="case-desc">{MODES.hard.description}</span>
          </button>
        </div>

        {warn > 0 && !hardUnlocked && (
          <p key={warn} className="case-warn animate-shop-alert" role="alert">
            {HARD_LOCKED_TEXT}
          </p>
        )}

        <button type="button" className="text-action case-back" onClick={onBack}>
          VOLTAR
        </button>
      </div>
    </div>
  );
}
