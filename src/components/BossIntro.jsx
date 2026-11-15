import { useLayoutEffect, useRef, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import RivalAvatar from './RivalAvatar.jsx';
import { BOSS_THEMES, T, bossLayout, buildBossIntro } from './bossIntroStage.js';
import { prefersReducedMotion } from './motion.js';

/**
 * Entrada de cada chefe quando você senta na mesa dele (Patch 0.9.0; refeita na versão 2.44,
 * a cena está em bossIntroStage.js): o número de cada um, a faixa na cor dele com o retrato
 * em silhueta acendendo num clarão, o nome batendo letra por letra, os corações e a fala.
 * O Dono da Noite tem a dele (SecretBoss.jsx). Tocar na tela pula. Com "menos movimento":
 * a cena já pronta, parada, por menos tempo.
 * `ball`: o número da rifa da 1ª rodada (Genésio), que salta do globo.
 */
export default function BossIntro({ rival, onDone, ball = null }) {
  // a cena é montada uma vez com o que veio na entrada (a key troca a cada partida)
  const [init] = useState(() => ({ rival, ball }));
  const theme = BOSS_THEMES[init.rival.id];
  const hostRef = useRef(null);
  const [P] = useState(() => (typeof window === 'undefined' ? 200 : bossLayout(window.innerWidth, window.innerHeight).P));
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  });

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !theme) return undefined;
    const { rival: who, ball: number } = init;
    const quick = prefersReducedMotion();
    const { anims, total } = buildBossIntro(host, {
      rivalId: who.id,
      name: who.name,
      title: who.title,
      quote: who.lines?.intro?.[0] ?? '',
      hearts: who.hearts ?? 0,
      ball: number,
      W: window.innerWidth,
      H: window.innerHeight,
    });
    const finish = () => done.current?.();
    // desmonta o que a cena pôs (o React só conhece a faixa do palco e o retrato)
    const teardown = () => {
      anims.forEach((a) => a.cancel());
      const stage = host.querySelector('.bi2-stage');
      const port = stage?.querySelector('.bi2-portrait');
      [...host.children].forEach((n) => n !== stage && n.remove());
      [...(stage?.children ?? [])].forEach((n) => n !== port && n.remove());
      port?.querySelector('.bi2-frame')?.remove();
    };
    // para filmar a cena quadro a quadro (ferramentas): tudo parado, quem manda é o relógio de fora
    if (globalThis.__HOLD_BOSS) {
      anims.forEach((a) => a.pause());
      globalThis.__ba = anims;
      return teardown;
    }
    if (quick) {
      const still = T.flash + 2600;
      anims.forEach((a) => {
        a.pause();
        a.currentTime = still;
      });
      const id = setTimeout(finish, 1800);
      return () => {
        clearTimeout(id);
        teardown();
      };
    }
    const timers = [
      setTimeout(() => sound[theme.sfx]?.(...(theme.sfxArgs ?? [])), theme.sfxAt),
      setTimeout(() => haptic(theme.buzz), theme.sfxAt),
      setTimeout(() => sound.playBossReveal?.(), T.flash - 260),
      setTimeout(finish, total),
    ];
    return () => {
      timers.forEach(clearTimeout);
      teardown();
    };
  }, [theme, init]);

  if (!theme) return null;
  return (
    <div
      ref={hostRef}
      className={`boss-intro2 boss-intro-${theme.id} fixed inset-0 z-[57] overflow-hidden`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="boss-intro-name"
      onClick={() => done.current?.()}
    >
      <div className="bi2-stage pointer-events-none absolute inset-0">
        <div className="bi2-portrait" aria-hidden="true">
          <span className="bi2-sil">
            <RivalAvatar rival={init.rival} bare size={P} smoke={false} mood="smug" />
          </span>
          <span className="bi2-lit">
            <RivalAvatar rival={init.rival} size={P} smoke={false} mood="smug" />
          </span>
        </div>
      </div>
    </div>
  );
}
