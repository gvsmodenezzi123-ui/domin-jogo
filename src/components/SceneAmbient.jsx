import { memo, useEffect, useRef } from 'react';
import { prefersReducedMotion } from './motion.js';

/**
 * Versão 2.40: a vida das salas. Coisas pequenas que acontecem no fundo de tempos em tempos, por
 * relógio (toda partida vê, mas não é toda hora), sem tirar o olho de quem joga:
 * - salas abertas (calçada, praia, praça): pássaros cruzam o céu, o sol dá um brilho, folhas
 *   caem das árvores (as nuvens e o mar já andavam);
 * - salas fechadas (boteco, sinuca, bicho): o luminoso falha e apaga soltando faíscas.
 *   (Versão 2.41: as sombras de gente passando no fundo saíram.)
 * Tudo fica na camada da sala, atrás da mesa e dos personagens. São poucos elementos soltos,
 * animados só com transform e opacity (WAAPI) e removidos no fim: não pesa. Com as animações
 * reduzidas, nada acontece.
 *
 * As posições usam a régua das salas (art/landRooms.js): uma tela de referência de 422 × 195,
 * presa ao meio (M), à esquerda (L) ou à direita (R).
 */
const SCENES = {
  landcalcada: { sky: [4, 30], sun: ['L', 128, 7], birds: true },
  landpraia: { sky: [6, 44], sun: ['M', 268, 16], birds: true, leaves: [['L', 92, 26, 22], ['R', 332, 32, 20]], gulls: true },
  landpraca: { sky: [4, 34], sun: ['M', 290, 10], birds: true, leaves: [['L', 34, 26, 60], ['R', 388, 30, 60]] },
  landroom: { neon: ['M', 250, 5, 66, 14, '#ffb43a'] },
  landsinuca: { neon: ['M', 253, 8, 108, 26, '#ff3d9e'] },
  landbicho: { neon: ['M', 252, 11, 86, 13, '#ff5a3a'] },
};

/** Os relógios (segundos): [primeira vez de, até] e [depois, a cada de, até]. */
const CLOCK = {
  birds: [[5, 12], [28, 60]],
  leaves: [[3, 8], [9, 20]],
  sun: [[6, 10], [16, 30]],
  neon: [[12, 25], [40, 80]],
};

const between = (a, b) => a + Math.random() * (b - a);

/** Um elemento solto na camada. */
function make(layer, className, style = {}) {
  const el = document.createElement('span');
  el.className = className;
  Object.assign(el.style, style);
  layer.appendChild(el);
  return el;
}

/** Anima e tira da tela no fim. */
function play(el, frames, options) {
  if (typeof el.animate !== 'function') {
    el.remove();
    return;
  }
  const anim = el.animate(frames, { fill: 'both', ...options });
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
}

function spawnBirds(layer, cfg, box) {
  const u = box.height / 195;
  const n = 1 + Math.floor(Math.random() * 3);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const y0 = between(cfg.sky[0], cfg.sky[1] * 0.6) * u;
  const dur = between(9000, 14000);
  for (let i = 0; i < n; i += 1) {
    const size = between(9, 13);
    const bird = make(layer, `amb-bird ${cfg.gulls ? 'is-gull' : ''}`, { top: `${y0 + i * between(5, 9) * (i % 2 ? 1 : -1)}px`, width: `${size}px`, height: `${size * 0.6}px` });
    bird.style.setProperty('--flap', `${between(260, 380).toFixed(0)}ms`);
    // (o espelho vai dentro do transform, depois do deslocamento: fora dele inverteria o caminho)
    const flip = dir < 0 ? ' scaleX(-1)' : '';
    const from = dir > 0 ? -30 - i * 22 : box.width + 30 + i * 22;
    const to = dir > 0 ? box.width + 40 : -40;
    const dip = between(-10, 10);
    play(
      bird,
      [
        { transform: `translate3d(${from}px, 0, 0)${flip}` },
        { transform: `translate3d(${(from + to) / 2}px, ${dip}px, 0)${flip}` },
        { transform: `translate3d(${to}px, ${-dip * 0.5}px, 0)${flip}` },
      ],
      { duration: dur + i * 400, easing: 'linear' },
    );
  }
}

function spawnLeaves(layer, cfg, box, at) {
  const u = box.height / 195;
  const [anchor, x, y, spread] = cfg.leaves[Math.floor(Math.random() * cfg.leaves.length)];
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i += 1) {
    const left = at(anchor, x) + between(-spread, spread) * u;
    const top = (y + between(-6, 8)) * u;
    const fall = between(70, 105) * u;
    const sway = between(14, 34) * (Math.random() < 0.5 ? -1 : 1);
    const leaf = make(layer, 'amb-leaf', { left: `${left}px`, top: `${top}px`, background: ['#4c9a3c', '#6cb850', '#a8b83c', '#c89a3a'][Math.floor(Math.random() * 4)] });
    play(
      leaf,
      [
        { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 0 },
        { transform: `translate3d(${sway * 0.5}px, ${fall * 0.18}px, 0) rotate(120deg)`, opacity: 1, offset: 0.12 },
        { transform: `translate3d(${-sway * 0.3}px, ${fall * 0.5}px, 0) rotate(300deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate3d(${sway}px, ${fall * 0.85}px, 0) rotate(470deg)`, opacity: 0.9, offset: 0.85 },
        { transform: `translate3d(${sway * 0.8}px, ${fall}px, 0) rotate(520deg)`, opacity: 0 },
      ],
      { duration: between(5200, 8200), delay: i * between(200, 700), easing: 'linear' },
    );
  }
}

function spawnSun(layer, cfg, box, at) {
  const u = box.height / 195;
  const [anchor, x, y] = cfg.sun;
  const flare = make(layer, 'amb-flare', { left: `${at(anchor, x)}px`, top: `${y * u}px`, width: `${46 * u}px`, height: `${46 * u}px` });
  play(
    flare,
    [
      { transform: 'translate(-50%, -50%) scale(0.5) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.25) rotate(18deg)', opacity: 0.85, offset: 0.35 },
      { transform: 'translate(-50%, -50%) scale(1.05) rotate(30deg)', opacity: 0.6, offset: 0.6 },
      { transform: 'translate(-50%, -50%) scale(1.5) rotate(46deg)', opacity: 0 },
    ],
    { duration: 3200, easing: 'ease-in-out' },
  );
}

function spawnNeon(layer, cfg, box, at) {
  const u = box.height / 195;
  const [anchor, x, y, w, h, color] = cfg.neon;
  const left = at(anchor, x);
  const dark = make(layer, 'amb-outage', { left: `${left - 8 * u}px`, top: `${(y - 6) * u}px`, width: `${(w + 16) * u}px`, height: `${(h + 12) * u}px` });
  // falha, falha, apaga de vez, volta piscando
  play(
    dark,
    [
      { opacity: 0, offset: 0 },
      { opacity: 0.8, offset: 0.04 },
      { opacity: 0, offset: 0.08 },
      { opacity: 0.85, offset: 0.13 },
      { opacity: 0.1, offset: 0.17 },
      { opacity: 0.9, offset: 0.22 },
      { opacity: 0.9, offset: 0.72 },
      { opacity: 0.2, offset: 0.76 },
      { opacity: 0.85, offset: 0.8 },
      { opacity: 0, offset: 0.86 },
      { opacity: 0.5, offset: 0.9 },
      { opacity: 0, offset: 1 },
    ],
    { duration: 3200, easing: 'steps(1, end)' },
  );
  // a luz da sala (o brilho do luminoso e das lâmpadas fica numa camada de luz por cima de tudo:
  // FxLayer): ela falha junto, mas só até a meia-luz, para a mesa continuar legível
  const glow = document.querySelector('.fx-layer');
  if (glow && typeof glow.animate === 'function') {
    glow.animate(
      [
        { opacity: 1, offset: 0 },
        { opacity: 0.5, offset: 0.04 },
        { opacity: 1, offset: 0.08 },
        { opacity: 0.45, offset: 0.13 },
        { opacity: 0.9, offset: 0.17 },
        { opacity: 0.42, offset: 0.22 },
        { opacity: 0.42, offset: 0.72 },
        { opacity: 0.85, offset: 0.76 },
        { opacity: 0.45, offset: 0.8 },
        { opacity: 1, offset: 0.86 },
        { opacity: 0.7, offset: 0.9 },
        { opacity: 1, offset: 1 },
      ],
      { duration: 3200, easing: 'steps(1, end)' },
    );
  }
  // as faíscas: saem de um canto do luminoso quando ele apaga, caem e somem
  const sx = left + (Math.random() < 0.5 ? between(2, 10) : between(w - 10, w - 2)) * u;
  const sy = (y + h * 0.6) * u;
  const n = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i += 1) {
    const spark = make(layer, 'amb-spark', { left: `${sx}px`, top: `${sy}px`, background: i % 3 ? '#ffe9a0' : color });
    const dx = between(-26, 26);
    const up = between(4, 16);
    const fall = between(24, 56) * u;
    play(
      spark,
      [
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        { transform: `translate3d(${dx * 0.5}px, ${-up}px, 0)`, opacity: 1, offset: 0.25 },
        { transform: `translate3d(${dx}px, ${fall}px, 0)`, opacity: 0 },
      ],
      { duration: between(520, 980), delay: 500 + i * between(15, 70), easing: 'cubic-bezier(0.3, 0, 0.7, 1)' },
    );
  }
}

function SceneAmbient({ scene }) {
  const ref = useRef(null);
  useEffect(() => {
    const layer = ref.current;
    const cfg = SCENES[scene];
    if (!layer || !cfg || prefersReducedMotion()) return undefined;
    // (só para teste: `window.__AMB_SPEED = 20` faz os relógios correrem 20× mais rápido)
    const speed = Number(globalThis.__AMB_SPEED) > 0 ? Number(globalThis.__AMB_SPEED) : 1;
    const timers = new Set();
    let alive = true;
    const boxOf = () => layer.getBoundingClientRect();
    const atOf = (box) => (anchor, x) => {
      const u = box.height / 195;
      return anchor === 'L' ? x * u : anchor === 'R' ? box.width - (422 - x) * u : box.width / 2 + (x - 211) * u;
    };
    const every = (name, fn) => {
      const [first, then] = CLOCK[name];
      const arm = ([a, b]) => {
        const id = setTimeout(() => {
          timers.delete(id);
          if (!alive) return;
          // (com a aba escondida não gasta nada: só remarca)
          if (!document.hidden && layer.childElementCount < 28) {
            const box = boxOf();
            if (box.width > 0 && box.height > 0) fn(box, atOf(box));
          }
          arm(then);
        }, (between(a, b) * 1000) / speed);
        timers.add(id);
      };
      arm(first);
    };
    if (cfg.birds) every('birds', (box) => spawnBirds(layer, cfg, box));
    if (cfg.leaves) every('leaves', (box, at) => spawnLeaves(layer, cfg, box, at));
    if (cfg.sun) every('sun', (box, at) => spawnSun(layer, cfg, box, at));
    if (cfg.neon) every('neon', (box, at) => spawnNeon(layer, cfg, box, at));
    return () => {
      alive = false;
      for (const id of timers) clearTimeout(id);
      layer.replaceChildren();
    };
  }, [scene]);
  if (!SCENES[scene]) return null;
  return <div ref={ref} className="scene-ambient" aria-hidden="true" data-scene={scene} />;
}

export default memo(SceneAmbient);
