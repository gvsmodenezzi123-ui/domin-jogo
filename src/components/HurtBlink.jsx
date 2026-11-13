import { memo, useEffect, useState } from 'react';
import { sound } from '../engine/audioSynth.js';

/** Quanto dura a piscada inteira (fecha, fica no escuro, abre tonto). */
export const HURT_BLINK_MS = 2400;

/**
 * Versão 2.35: tomou dano. A vista fecha devagar como pálpebras (o fôlego fundo enquanto fecha),
 * fica um instante no escuro com o vermelho do golpe, entreabre, pisca de novo e abre de vez,
 * com a respiração ofegante. Com as animações reduzidas, a vista só escurece e clareia.
 * Versão 2.35.1: sai da tela sozinha no fim (não fica uma camada parada por cima do jogo).
 */
function HurtBlink() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    sound.playHurtBreath?.();
    const id = setTimeout(() => setDone(true), HURT_BLINK_MS + 100);
    return () => clearTimeout(id);
  }, []);
  if (done) return null;
  return (
    <div className="hurt-blink" aria-hidden="true">
      <div className="hurt-blink-red" />
      <div className="hurt-blink-dim" />
      <div className="hurt-blink-lid is-top" />
      <div className="hurt-blink-lid is-bottom" />
    </div>
  );
}

export default memo(HurtBlink);
