import { memo, useEffect, useRef, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import { prefersReducedMotion } from './motion.js';

/** Quanto dura a piscada inteira (fecha, fica no escuro, abre tonto). */
export const HURT_BLINK_MS = 2400;

/**
 * Versão 2.37: a vista embaça junto: fecha embaçando, abre ainda borrada e vai voltando ao foco.
 * (Um `filter` animado no #root, só durante a piscada: o `backdrop-filter` falhava no Safari.)
 */
const BLUR_FRAMES = [
  { offset: 0, filter: 'blur(0px)', transform: 'translate(0, 0) rotate(0deg) scale(1)' },
  // (versão 2.38: o tranco do golpe e a tontura: a vista balança enquanto volta ao foco; o zoom
  // de 3% esconde as bordas enquanto a tela gira)
  { offset: 0.05, filter: 'blur(1.5px)', transform: 'translate(-0.7%, 0.5%) rotate(-0.5deg) scale(1.03)' },
  { offset: 0.23, filter: 'blur(6px)', transform: 'translate(0.5%, 0.9%) rotate(0.6deg) scale(1.035)' },
  { offset: 0.37, filter: 'blur(6px)', transform: 'translate(0.2%, 1.1%) rotate(0.3deg) scale(1.035)' },
  { offset: 0.44, filter: 'blur(4.5px)', transform: 'translate(-0.5%, 0.7%) rotate(-0.7deg) scale(1.035)' },
  { offset: 0.52, filter: 'blur(5px)', transform: 'translate(-0.2%, 0.9%) rotate(-0.4deg) scale(1.035)' },
  { offset: 0.72, filter: 'blur(3px)', transform: 'translate(0.5%, 0.3%) rotate(0.55deg) scale(1.03)' },
  { offset: 0.88, filter: 'blur(1.2px)', transform: 'translate(-0.2%, 0.1%) rotate(-0.2deg) scale(1.012)' },
  { offset: 1, filter: 'blur(0px)', transform: 'translate(0, 0) rotate(0deg) scale(1)' },
];

/**
 * Versão 2.35: tomou dano. A vista fecha devagar como pálpebras, fica um instante no escuro com
 * o vermelho do golpe, entreabre, pisca de novo e abre de vez; a trilha fica abafada e baixa e
 * volta devagar. Com as animações reduzidas, a vista só escurece e clareia (sem embaçar).
 * Versão 2.37: embaça junto, com a respiração gravada e o zumbido no ouvido.
 */
const Blink = memo(function Blink({ onDone }) {
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    sound.muffleMusic?.();
    // versão 2.37: a falta de ar e o ofegante gravados, com o "tuin" do ouvido zunindo
    sound.playHurtSound?.();
    const root = document.getElementById('root');
    const blur = !prefersReducedMotion() && typeof root?.animate === 'function' ? root.animate(BLUR_FRAMES, { duration: HURT_BLINK_MS, easing: 'linear' }) : null;
    const id = setTimeout(() => done.current?.(), HURT_BLINK_MS + 100);
    return () => {
      clearTimeout(id);
      blur?.cancel();
    };
  }, []);
  return (
    <div className="hurt-blink" aria-hidden="true">
      <div className="hurt-blink-red" />
      <div className="hurt-blink-dim" />
      <div className="hurt-blink-lid is-top" />
      <div className="hurt-blink-lid is-bottom" />
    </div>
  );
});

/**
 * Versão 2.35.2: pisca a CADA dano. `hurtKey` muda a cada golpe (o número do evento); a piscada
 * guarda a sua própria chave e vai até o fim mesmo que o golpe saia da lista curta de eventos
 * (antes, com a rodada seguinte começando, a chave voltava a 0 e a piscada sumia no meio).
 * `allowed`: falso no golpe que derruba (aí quem entra é a tela quebrando).
 */
function HurtBlink({ hurtKey, allowed = true }) {
  const [seen, setSeen] = useState(hurtKey);
  const [active, setActive] = useState(null);
  // (ajuste de estado no render, quando a chave muda: o padrão do React para "derivar da prop")
  if (hurtKey && hurtKey !== seen) {
    setSeen(hurtKey);
    if (allowed) setActive(hurtKey);
  }
  if (!active) return null;
  return <Blink key={active} onDone={() => setActive((a) => (a === active ? null : a))} />;
}

export default memo(HurtBlink);
