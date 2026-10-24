import { useCallback, useEffect, useRef, useState } from 'react';
import { SECRET_BOSS } from '../data/rivals.js';
import { bossMusicOf } from '../data/campaign.js';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { prefersReducedMotion } from './motion.js';
import { DARK_AT, EYES_AT, REVEAL_AT, STROBE_AT, createSecretRenderer } from './secretPixel.js';

/**
 * Fases da entrada (ms desde que a cena abre, Patch 0.8.2; desenho em pixel art desde o 1.1,
 * em secretPixel.js): flicker (a luz falha), dark (breu e o coração), strobe (o trovão e o
 * círculo de runas), eyes (os olhos dourados) e reveal (o Dono e a regra da mesa).
 */
const ORDER = ['flicker', 'dark', 'strobe', 'eyes', 'reveal'];
/** A trilha dele (Patch 0.9.0) entra junto com a revelação. */
const DONO_TRACK = bossMusicOf(SECRET_BOSS);

/**
 * Nó 19 secreto (Patch 0.8.0). Você venceu o Comendador com 3+ Necróticos na hotbar e o
 * final não vem. Patch 0.8.2: a entrada ganhou fases (ver acima): a luz falha com o zumbido
 * da fiação, apaga de vez, o coração bate, o trovão estoura com o estrobo vermelho enquanto
 * um círculo de runas se desenha no chão, os olhos dele abrem no breu e só então aparece O
 * Dono da Noite com a regra da mesa. Tocar na tela durante a entrada pula para o fim.
 * Com "menos movimento": sem piscar, direto para a revelação, com o círculo parado.
 * SENTAR À MESA começa a partida (App → START_SECRET).
 */
export default function SecretBoss({ rival, onSit }) {
  const [stage, setStage] = useState(() => (prefersReducedMotion() ? 'dark' : 'flicker'));
  const skipped = useRef(false);

  useEffect(() => {
    const quick = prefersReducedMotion();
    const go = (next) => setStage((now) => (ORDER.indexOf(next) > ORDER.indexOf(now) ? next : now));
    const at = (ms, fn) => setTimeout(() => !skipped.current && fn(), ms);
    if (quick) {
      const timers = [
        at(150, () => {
          sound.playThunder();
          haptic([80, 60, 160]);
        }),
        setTimeout(() => {
          go('reveal');
          sound.playTrack(DONO_TRACK);
        }, 400),
      ];
      return () => timers.forEach(clearTimeout);
    }
    sound.hushMusic(REVEAL_AT / 1000); // a trilha morre com a luz e volta com ele
    sound.playLightsFlicker();
    haptic([1, 139, 15, 445, 15, 485, 15, 305, 40]);
    const timers = [
      at(DARK_AT, () => {
        go('dark');
        sound.playHeartbeat();
        haptic([60, 140, 50, 420, 60, 140, 50]);
      }),
      at(STROBE_AT, () => {
        go('strobe');
        sound.playThunder();
        haptic([80, 60, 160]);
      }),
      at(STROBE_AT + 700, () => sound.playRuneIgnite()),
      at(EYES_AT, () => {
        go('eyes');
        sound.playDonoEyes();
        haptic([220]);
      }),
      at(REVEAL_AT, () => {
        go('reveal');
        sound.playTrack(DONO_TRACK);
      }),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // o desenho: um canvas em pixel art que segue o relógio da cena (pular salta para a revelação)
  const clock = useRef({ start: 0, jump: null });
  const canvasRef = useCallback((canvas) => {
    if (!canvas) return undefined;
    const r = createSecretRenderer(canvas);
    const reduced = prefersReducedMotion();
    clock.current.start = performance.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const { start, jump } = clock.current;
      const ms = jump != null ? REVEAL_AT + (now - jump) : now - start;
      r.render(ms, { reduced });
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const intro = stage !== 'reveal';
  const skip = () => {
    if (!intro) return;
    skipped.current = true;
    clock.current.jump = performance.now();
    sound.hushMusic(0);
    sound.playTrack(DONO_TRACK);
    setStage('reveal');
  };

  return (
    <div
      className={`secret-scene secret-${stage} fixed inset-0 z-[56] flex items-center justify-center px-5`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="secret-title"
      onClick={skip}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="secret-canvas pointer-events-none absolute inset-0 h-full w-full" />

      {intro ? (
        <p className="secret-skip font-pixel">TOQUE PARA PULAR</p>
      ) : (
        <div className="secret-card secret-card-in relative w-full max-w-[340px] text-center">
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
