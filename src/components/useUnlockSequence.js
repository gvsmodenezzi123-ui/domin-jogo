// Sequência da Maleta Preta destrancando (Patch 0.6.3). Fora de CaseSelect.jsx para o
// arquivo do componente exportar só componentes (react-refresh).
import { useEffect, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import { prefersReducedMotion } from './motion.js';

/** Do cadeado abrindo até a maleta aberta (ms). */
const UNLOCK_AT = 450;
const OPEN_AT = 1250;

/**
 * Sequência da Maleta Preta destrancando: 'locked' → 'unlocking' (o cadeado abre e as
 * correntes caem, com o som seco da corrente) → 'open'. Com `play` falso fica no `rest`.
 */
export function useUnlockSequence(play, rest = 'locked') {
  const [stage, setStage] = useState(play ? 'locked' : rest);
  useEffect(() => {
    if (!play) return undefined;
    const quick = prefersReducedMotion();
    const timers = [
      setTimeout(
        () => {
          setStage('unlocking');
          sound.playChainUnlock();
          haptic([20, 40, 60]);
        },
        quick ? 50 : UNLOCK_AT,
      ),
      setTimeout(() => setStage('open'), quick ? 120 : OPEN_AT),
    ];
    return () => timers.forEach(clearTimeout);
  }, [play]);
  return stage;
}
