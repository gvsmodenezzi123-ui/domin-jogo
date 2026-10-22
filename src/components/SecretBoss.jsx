import { useEffect, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { prefersReducedMotion } from './motion.js';

/** Escuro total, estrobo vermelho e a revelação (ms desde que a cena abre). */
const STROBE_AT = 900;
const REVEAL_AT = 2700;

/**
 * Nó 19 secreto (Patch 0.8.0). Você venceu o Comendador com 3+ Necróticos na hotbar e o
 * final não vem: as luzes apagam, um trovão pesado rola, a luz volta vermelho-sangue
 * piscando (abaixo de 3 vezes por segundo) e aparece O Dono da Noite, com a regra da mesa
 * dele. SENTAR À MESA começa a partida (App → START_SECRET).
 */
export default function SecretBoss({ rival, onSit }) {
  const [stage, setStage] = useState('dark');
  useEffect(() => {
    const quick = prefersReducedMotion();
    const timers = [
      setTimeout(
        () => {
          setStage('strobe');
          sound.playThunder();
          haptic([80, 60, 160]);
        },
        quick ? 150 : STROBE_AT,
      ),
      setTimeout(() => setStage('reveal'), quick ? 400 : REVEAL_AT),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={`secret-scene secret-${stage} fixed inset-0 z-[56] flex items-center justify-center px-5`} role="dialog" aria-modal="true" aria-labelledby="secret-title">
      <div aria-hidden="true" className="secret-flash pointer-events-none absolute inset-0" />
      {stage === 'reveal' && (
        <div className="secret-card animate-overlay-in relative w-full max-w-[340px] text-center">
          <p className="secret-kicker font-pixel">NÓ 19 · SECRETO</p>
          <div className="secret-portrait mx-auto mt-3">
            <RivalAvatar rival={rival} mood="smug" size={112} smoke={false} />
          </div>
          <h2 id="secret-title" className="secret-title mt-3 font-pixel">
            O DONO DA NOITE
          </h2>
          <p className="mt-2 font-term text-[18px] leading-tight text-[#e8c8c8]">
            Três almas penduradas no seu cinto. Ele sentiu o cheiro e veio cobrar.
          </p>
          <div className="mt-3 flex justify-center">
            <HeartsBar current={rival.hearts} max={rival.hearts} size={12} label={`${rival.name}: ${rival.hearts} corações`} />
          </div>
          <div className="secret-rule mt-3">
            <p className="font-pixel text-[8px] text-[#ffd24a]">NOITE ETERNA</p>
            <p className="mt-1 font-term text-[17px] leading-[1.05] text-[#f4ecd2]">
              Imune a batida comum e a dano direto. Só batida de bucha ou vitória por tranca tiram coração dele.
            </p>
          </div>
          <button type="button" data-tone="blood" className="btn-pixel mt-5 w-full" onClick={onSit}>
            SENTAR À MESA
          </button>
        </div>
      )}
    </div>
  );
}
