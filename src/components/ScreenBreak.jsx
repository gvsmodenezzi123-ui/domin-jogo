import { memo, useEffect, useRef } from 'react';
import { sound } from '../engine/audioSynth.js';
import { prefersReducedMotion } from './motion.js';

/** A rachadura (em % da tela): corta de um lado ao outro, torta, com dois galhos. */
const CRACK = [
  [0, 41],
  [9, 44],
  [16, 40],
  [27, 47],
  [35, 45],
  [44, 53],
  [52, 50],
  [61, 57],
  [70, 55],
  [79, 61],
  [88, 58],
  [100, 64],
];
const BRANCHES = [
  [
    [27, 47],
    [30, 36],
    [26, 28],
  ],
  [
    [61, 57],
    [64, 68],
    [60, 77],
  ],
  [
    [79, 61],
    [84, 50],
  ],
];
const line = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ');
/** As duas metades: a de cima e a de baixo da rachadura. */
const TOP = `0,0 100,0 ${line([...CRACK].reverse())}`;
const BOTTOM = `${line(CRACK)} 100,100 0,100`;

/** Quanto tempo até a tela de depois (o fim de jogo ou o modo espectador) aparecer. */
export const BREAK_MS = 1500;

/**
 * Versão 2.34: perdeu a partida: a tela racha em duas (um estalo, um tranco, a fenda preta
 * abrindo entre as metades) e fica em preto e branco. Depois de BREAK_MS chama `onDone`: aí entra
 * a tela de fim de jogo (que fica por cima, ainda em preto e branco) ou, se `fade`, a cor volta e
 * fica o modo espectador.
 */
function ScreenBreak({ onDone, fade = false }) {
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    sound.playScreenBreak?.();
    const id = setTimeout(() => done.current?.(), prefersReducedMotion() ? 500 : BREAK_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className={`screen-break ${fade ? 'is-fade' : ''}`} aria-hidden="true">
      <div className="screen-break-gray" />
      <svg className="screen-break-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon className="screen-break-top" points={TOP} />
        <polygon className="screen-break-bottom" points={BOTTOM} />
        <polyline className="screen-break-gap" points={line(CRACK)} />
        {BRANCHES.map((b) => (
          <polyline key={b[1].join()} className="screen-break-branch" points={line(b)} />
        ))}
        <polyline className="screen-break-edge" points={line(CRACK)} />
      </svg>
      <div className="screen-break-flash" />
    </div>
  );
}

export default memo(ScreenBreak);
