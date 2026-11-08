import { useEffect, useRef, useState } from 'react';
import PixelCanvas from '../components/PixelCanvas.jsx';
import { enterLandscape } from '../components/landscapeLock.js';
import { sound } from '../engine/audioSynth.js';
import { GATE_BOTTLE, paintGateBottle, paintGateCap } from './gateArt.js';

/**
 * Versão 2.12: o toque de entrada. A tela preta com o gargalo de uma gelada sob a luz: tocar
 * "abre a gelada" (a tampinha estoura para cima), liga o som e deita o jogo (tela cheia e a
 * horizontal travada, onde o sistema deixa). A abertura começa logo em seguida, com a mesma
 * tampinha voando pelo boteco.
 */
export default function AccessGate({ onEnter }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  const enter = () => {
    if (open) return;
    // dentro do toque: o navegador só deixa som, tela cheia e trava de tela a partir de um gesto
    sound.init();
    enterLandscape();
    setOpen(true);
    setTimeout(() => onEnter?.(), 520);
  };
  return (
    <div
      ref={ref}
      className={`access-gate ${open ? 'is-open' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Toque para entrar no Buxaria"
      onClick={enter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enter();
        }
      }}
    >
      <div className="gate-glow" aria-hidden="true" />
      <div className="gate-bottle" aria-hidden="true">
        <PixelCanvas cacheKey="gate-gelada" paint={paintGateBottle} w={GATE_BOTTLE.w} h={GATE_BOTTLE.h} scale={3} className="gate-bottle-art" />
        <PixelCanvas cacheKey="gate-tampinha" paint={paintGateCap} w={14} h={6} scale={3} className="gate-cap" />
      </div>
      <p className="gate-cta">TOQUE PARA ABRIR A GELADA</p>
      <p className="gate-hint">
        <span className="gate-phone" aria-hidden="true" />o Buxaria é jogado com a tela deitada
      </p>
    </div>
  );
}
