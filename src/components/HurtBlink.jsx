import { memo, useEffect, useRef, useState } from 'react';
import { sound } from '../engine/audioSynth.js';

/** Quanto dura a piscada inteira (fecha, fica no escuro, abre tonto). */
export const HURT_BLINK_MS = 2400;

/**
 * Versão 2.35: tomou dano. A vista fecha devagar como pálpebras, fica um instante no escuro com
 * o vermelho do golpe, entreabre, pisca de novo e abre de vez; a trilha fica abafada e baixa e
 * volta devagar. Com as animações reduzidas, a vista só escurece e clareia.
 */
const Blink = memo(function Blink({ onDone }) {
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    sound.muffleMusic?.();
    const id = setTimeout(() => done.current?.(), HURT_BLINK_MS + 100);
    return () => clearTimeout(id);
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
