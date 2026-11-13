import { memo, useEffect } from 'react';
import { sound } from '../engine/audioSynth.js';

/** Quanto dura a piscada inteira (fecha, fica no escuro, abre tonto). */
export const HURT_BLINK_MS = 2400;

/**
 * Versão 2.35: tomou dano. A vista fecha devagar como pálpebras (o fôlego fundo enquanto fecha),
 * fica um instante no escuro com o vermelho do golpe, entreabre, pisca de novo e abre de vez,
 * ainda embaçada, com a respiração ofegante.
 */
function HurtBlink() {
  useEffect(() => {
    sound.playHurtBreath?.();
  }, []);
  return (
    <div className="hurt-blink" aria-hidden="true">
      <div className="hurt-blink-blur" />
      <div className="hurt-blink-red" />
      <div className="hurt-blink-lid is-top" />
      <div className="hurt-blink-lid is-bottom" />
    </div>
  );
}

export default memo(HurtBlink);
