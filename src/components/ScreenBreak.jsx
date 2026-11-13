import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { sound } from '../engine/audioSynth.js';
import { prefersReducedMotion } from './motion.js';

/** A rachadura (em % da tela): corta de um lado ao outro, torta. */
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
/** Os galhos finos que saem dela (só riscos: não separam nada). */
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
const pct = (pts) => pts.map(([x, y]) => `${x}% ${y}%`).join(', ');
/** As duas metades (clip-path): a de cima e a de baixo da rachadura. */
const CLIP_TOP = `polygon(0% 0%, 100% 0%, ${pct([...CRACK].reverse())})`;
const CLIP_BOTTOM = `polygon(${pct(CRACK)}, 100% 100%, 0% 100%)`;

/** Quanto tempo até a tela de depois (o fim de jogo ou o modo espectador) aparecer. */
export const BREAK_MS = 1700;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Uma cópia parada da tela agora (o DOM do #root, com o desenho de cada canvas copiado). */
function snapshotOf(root, overlay) {
  const copy = root.cloneNode(true);
  copy.removeAttribute('id');
  copy.className = 'screen-shard-copy';
  copy.querySelectorAll('.screen-break').forEach((el) => el.remove());
  const from = [...root.querySelectorAll('canvas')].filter((c) => !overlay.contains(c));
  const to = [...copy.querySelectorAll('canvas')];
  from.forEach((src, i) => {
    const dst = to[i];
    if (!dst || !src.width || !src.height) return;
    try {
      dst.width = src.width;
      dst.height = src.height;
      dst.getContext('2d')?.drawImage(src, 0, 0);
    } catch {
      // (a camada de luz em WebGL não copia: fica sem o brilho, sem problema)
    }
  });
  return copy;
}

/** A borda clara da quebra, que acompanha a metade quando ela se afasta. */
function edgeOf(top) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'screen-shard-edge');
  const pl = document.createElementNS(SVG_NS, 'polyline');
  pl.setAttribute('points', line(CRACK.map(([x, y]) => [x, y + (top ? -0.35 : 0.35)])));
  svg.appendChild(pl);
  // os galhos da rachadura que caem nesta metade
  for (const b of top ? [BRANCHES[0], BRANCHES[2]] : [BRANCHES[1]]) {
    const br = document.createElementNS(SVG_NS, 'polyline');
    br.setAttribute('points', line(b));
    br.setAttribute('class', 'screen-shard-branch');
    svg.appendChild(br);
  }
  return svg;
}

/**
 * Versão 2.34: perdeu a partida. Versão 2.34.1: a tela quebra de verdade: uma cópia parada da
 * tela é cortada em duas pela rachadura, as metades dão um tranco e se separam (a de cima sobe e
 * gira para um lado, a de baixo desce e gira para o outro), com o vão escuro no meio, e tudo
 * fica em preto e branco. Depois de BREAK_MS chama `onDone`: aí entra a tela de fim de jogo (por
 * cima, com a tela quebrada atrás) ou, se `fade`, a tela quebrada some e fica o modo espectador.
 */
function ScreenBreak({ onDone, fade = false }) {
  const ref = useRef(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useLayoutEffect(() => {
    const host = ref.current;
    const root = document.getElementById('root');
    if (!host || !root) return undefined;
    const shards = host.querySelector('.screen-shards');
    for (const top of [true, false]) {
      const shard = document.createElement('div');
      shard.className = `screen-shard ${top ? 'is-top' : 'is-bottom'}`;
      shard.style.clipPath = top ? CLIP_TOP : CLIP_BOTTOM;
      shard.style.webkitClipPath = shard.style.clipPath;
      shard.appendChild(snapshotOf(root, host));
      shard.appendChild(edgeOf(top));
      shards.appendChild(shard);
    }
    return () => {
      shards.replaceChildren();
    };
  }, []);
  useEffect(() => {
    sound.playScreenBreak?.();
    const id = setTimeout(() => done.current?.(), prefersReducedMotion() ? 600 : BREAK_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <div ref={ref} className={`screen-break ${fade ? 'is-fade' : ''}`} aria-hidden="true">
      <div className="screen-shards" />
      <svg className="screen-break-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline className="screen-break-gap" points={line(CRACK)} />
      </svg>
      <div className="screen-break-flash" />
    </div>
  );
}

export default memo(ScreenBreak);
