import { useEffect } from 'react';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import RivalAvatar from './RivalAvatar.jsx';
import { prefersReducedMotion } from './motion.js';

/**
 * Entrada de cada chefe (Patch 0.9.0), quando você senta na mesa dele. Cada um tem o seu
 * jeito (só CSS, `boss-intro-<tema>` no index.css), com som e vibração no tempo certo:
 *   navalha  Seu Arlindo: a navalha corta a tela na diagonal, as metades se abrem e o nome
 *            acende em neon
 *   ferro    Beto Cigano: uma chapa de ferro enferrujada despenca, bate no chão, a tela treme
 *            e saltam faíscas
 *   ouro     Comendador Moreira: a cortina de veludo abre, o holofote dourado acende e chovem
 *            moedas
 * O Dono da Noite já tem a entrada dele (SecretBoss.jsx). Tocar na tela pula. Com "menos
 * movimento": só o cartão, parado, por menos tempo.
 */
const THEMES = {
  arlindo: { id: 'navalha', kicker: 'CHEFE DA REGIÃO 1', total: 2900, hitAt: 200, sfx: 'playRazorSlash', buzz: [12, 30, 40] },
  beto: { id: 'ferro', kicker: 'CHEFE DA REGIÃO 2', total: 2900, hitAt: 120, sfx: 'playIronSlam', buzz: [0, 340, 90, 60, 50] },
  comendador: { id: 'ouro', kicker: 'CHEFE FINAL', total: 3100, hitAt: 0, sfx: 'playGrandEntrance', buzz: [20, 300, 30, 200, 60] },
};

/** Faíscas da chapa (direção x, y em px) e moedas do Comendador (posição %, atraso ms). */
const SPARKS = [
  [-120, -40],
  [-90, -80],
  [-60, -110],
  [-30, -60],
  [0, -120],
  [30, -70],
  [60, -105],
  [95, -85],
  [125, -35],
  [-140, -10],
  [140, -14],
  [10, -90],
];
const COINS = [
  [8, 0],
  [20, 260],
  [31, 120],
  [43, 420],
  [55, 60],
  [66, 330],
  [77, 180],
  [88, 480],
  [14, 640],
  [50, 700],
  [82, 780],
  [38, 900],
];

export default function BossIntro({ rival, onDone }) {
  const theme = THEMES[rival.id];
  const quick = prefersReducedMotion();
  useEffect(() => {
    if (!theme) return undefined;
    const timers = [
      setTimeout(() => {
        sound[theme.sfx]?.();
        haptic(theme.buzz);
      }, quick ? 0 : theme.hitAt),
      setTimeout(onDone, quick ? 1800 : theme.total),
    ];
    return () => timers.forEach(clearTimeout);
  }, [theme, quick, onDone]);

  if (!theme) return null;
  const quote = rival.lines?.intro?.[0];
  return (
    <div
      className={`boss-intro boss-intro-${theme.id} ${quick ? 'is-still' : ''} fixed inset-0 z-[57] flex items-center justify-center px-5`}
      style={{ '--bi-total': `${quick ? 1800 : theme.total}ms` }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="boss-intro-name"
      onClick={onDone}
    >
      <div aria-hidden="true" className="bi-backdrop pointer-events-none absolute inset-0" />
      {theme.id === 'ouro' && (
        <>
          <div aria-hidden="true" className="bi-spot pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="bi-coins pointer-events-none absolute inset-0 overflow-hidden">
            {COINS.map(([left, delay]) => (
              <i key={`${left}-${delay}`} style={{ left: `${left}%`, animationDelay: `${700 + delay}ms` }} />
            ))}
          </div>
        </>
      )}

      <div className="bi-stage relative w-full max-w-[330px]">
        <div className="bi-card text-center">
          <p className="bi-kicker font-pixel">{theme.kicker}</p>
          <div className="bi-portrait mx-auto mt-3">
            <RivalAvatar rival={rival} mood="smug" size={104} smoke={false} />
          </div>
          <h2 id="boss-intro-name" className="bi-name mt-3 font-pixel">
            {rival.name.toUpperCase()}
          </h2>
          <p className="bi-title mt-1 font-term">{rival.title}</p>
          {quote && <p className="bi-quote mt-3 font-term">“{quote}”</p>}
        </div>
        {theme.id === 'ferro' && (
          <span aria-hidden="true" className="bi-sparks pointer-events-none">
            {SPARKS.map(([x, y]) => (
              <i key={`${x}-${y}`} style={{ '--dx': `${x}px`, '--dy': `${y}px` }} />
            ))}
          </span>
        )}
      </div>

      {theme.id === 'navalha' && (
        <>
          <div aria-hidden="true" className="bi-half bi-half-a pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="bi-half bi-half-b pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="bi-slash pointer-events-none absolute" />
        </>
      )}
      {theme.id === 'ouro' && (
        <>
          <div aria-hidden="true" className="bi-curtain bi-curtain-l pointer-events-none absolute inset-y-0 left-0" />
          <div aria-hidden="true" className="bi-curtain bi-curtain-r pointer-events-none absolute inset-y-0 right-0" />
        </>
      )}
      <p className="bi-skip font-pixel">TOQUE PARA PULAR</p>
    </div>
  );
}
