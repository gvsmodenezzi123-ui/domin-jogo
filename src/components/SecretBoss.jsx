import { useEffect, useRef, useState } from 'react';
import { SECRET_BOSS } from '../data/rivals.js';
import { bossMusicOf } from '../data/campaign.js';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { RuneCircle, RuneGlyph } from './art/RuneArt.jsx';
import { prefersReducedMotion } from './motion.js';

/**
 * Tempo de cada fase da entrada (ms desde que a cena abre, Patch 0.8.2):
 * flicker  a luz do boteco falha (4 apagadas em 1,5 s, abaixo de 3 piscadas por segundo)
 * dark     breu total, o coração batendo
 * strobe   o trovão, o estrobo vermelho e o círculo de runas se desenhando, runa por runa
 * eyes     o estrobo para; no meio do círculo, dois olhos dourados abrem
 * reveal   o Dono e a regra da mesa, com o círculo girando devagar atrás
 */
const DARK_AT = 1500;
const STROBE_AT = 2400;
const EYES_AT = 4300;
const REVEAL_AT = 5700;
const ORDER = ['flicker', 'dark', 'strobe', 'eyes', 'reveal'];
/** A trilha dele (Patch 0.9.0) entra junto com a revelação. */
const DONO_TRACK = bossMusicOf(SECRET_BOSS);

/** Runas e brasas que sobem pelo escuro: [posição %, runa (ou -1 = brasa), duração s, atraso s]. */
const DRIFT = [
  [6, 0, 5.2, 0],
  [15, -1, 3.8, 1.1],
  [24, 3, 6, 2.2],
  [33, -1, 4.4, 0.4],
  [44, 6, 5.6, 1.6],
  [56, -1, 4, 2.8],
  [66, 1, 5.4, 0.8],
  [75, -1, 3.6, 1.9],
  [84, 5, 6.2, 0.2],
  [93, -1, 4.2, 2.5],
];

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

  const intro = stage !== 'reveal';
  const skip = () => {
    if (!intro) return;
    skipped.current = true;
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
      <div aria-hidden="true" className="secret-shade pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="secret-flash pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="secret-drift pointer-events-none absolute inset-0 overflow-hidden">
        {DRIFT.map(([left, glyph, dur, delay]) => (
          <span key={left} className={glyph < 0 ? 'drift-ember' : 'drift-rune'} style={{ left: `${left}%`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
            {glyph >= 0 && <RuneGlyph index={glyph} className="h-full w-full" />}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="secret-runes pointer-events-none">
        <RuneCircle className="h-full w-full" />
      </div>

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
