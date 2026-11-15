import { RELICS } from '../data/relics.js';

/**
 * Versão 2.44: o ritual do Dono da Noite, antes da entrada dele (SecretBoss.jsx). Ele só vem
 * por causa dos três Necróticos na sua hotbar, então são eles que o chamam:
 *  1. (0 – 1,4 s) a mesa escurece, os três talismãs tremem no nicho e são arrancados de lá, um
 *     de cada vez, arrastados (com rastro) até o meio da tela, nos cantos de um triângulo;
 *  2. (1,4 – 3,5 s) eles começam a girar, cada vez mais rápido; o círculo se risca no chão, o
 *     triângulo e o triângulo invertido ligam um ao outro, as runas acendem em volta;
 *  3. (3,5 s) o giro trava num clarão vermelho com trovão: o ritual está feito;
 *  4. (3,6 – 4,6 s) os talismãs voltam arrastados para a hotbar, cada um no seu nicho, e a
 *     luz morre. Daí segue a entrada dele (o coração no breu, as runas, os olhos).
 * Tudo em WAAPI (transform e opacity), com pausa para filmar.
 */
export const RITUAL_MS = 5000;
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON = 44;
const LIFT = [360, 540, 720];
const FLY_IN = 760;
const SPIN = [1450, 3500];
const BACK = [3640, 3780, 3920];
const FLY_BACK = 640;
/** As runas (riscos numa grade de 60): desenho próprio, sem depender de fonte. */
const GLYPHS = [
  'M10 50 L30 10 L50 50 M18 34 L42 34',
  'M30 8 L30 52 M14 20 L46 40 M46 20 L14 40',
  'M12 12 L48 12 L12 48 L48 48',
  'M20 8 L20 52 M20 14 L42 26 L20 38',
  'M30 8 L30 52 M30 18 L14 8 M30 18 L46 8',
  'M14 10 L46 50 M46 10 L14 50 M14 30 L46 30',
];
const RUNE_COUNT = 12;

/** Os três Necróticos na sua hotbar que estão na tela agora (id e onde está o desenho). */
export function ritualSources() {
  if (typeof document === 'undefined') return null;
  const out = [];
  for (const slot of document.querySelectorAll('[data-relic-slot^="player:"]')) {
    const id = slot.dataset.relicSlot.split(':')[1];
    if (RELICS[id]?.rarity !== 'necrotico') continue;
    const icon = slot.querySelector('.relic-niche-icon, .relic-pixels') ?? slot;
    const r = icon.getBoundingClientRect();
    if (r.width < 4 || r.bottom < 0 || r.top > window.innerHeight) continue;
    out.push({ id, x: r.left + r.width / 2, y: r.top + r.height / 2, size: Math.max(r.width, r.height) });
    if (out.length === 3) break;
  }
  return out.length === 3 ? out : null;
}

const el = (tag, cls, parent, style) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (style) Object.assign(n.style, style);
  parent?.appendChild(n);
  return n;
};
const svgEl = (tag, attrs, parent) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.appendChild(n);
  return n;
};

/** Monta o ritual em `layer` (o React já pôs lá os talismãs). Devolve as animações. */
export function buildRitual(layer, sources, W, H) {
  const anims = [];
  const run = (node, frames, opts) => {
    if (!node || typeof node.animate !== 'function') return null;
    const a = node.animate(frames, { fill: 'both', ...opts });
    anims.push(a);
    return a;
  };
  const cx = W / 2;
  const cy = H * 0.47;
  const R = Math.round(Math.min(W, H) * 0.24);
  const pulse = layer.querySelector('.sr-pulse');
  const orbit = layer.querySelector('.sr-orbit');
  Object.assign(pulse.style, { left: `${cx}px`, top: `${cy}px` });

  // o escuro (e no fim o breu) e a luz vermelha por baixo
  const dim = el('div', 'sr-dim');
  layer.insertBefore(dim, pulse);
  run(dim, [{ opacity: 0 }, { opacity: 0.66, offset: 0.1 }, { opacity: 0.74, offset: 0.68 }, { opacity: 0.6, offset: 0.72 }, { opacity: 0.7, offset: 0.9 }, { opacity: 1 }], { duration: RITUAL_MS, easing: 'ease-in-out' });
  const core = el('div', 'sr-core', null, { left: `${cx}px`, top: `${cy}px`, width: `${R * 3.4}px`, height: `${R * 3.4}px` });
  layer.insertBefore(core, pulse);
  run(core, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 0.5, transform: 'translate(-50%,-50%) scale(.7)', offset: 0.35 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.7 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.25)', offset: 0.74 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.1)' }], { duration: 3600, delay: 1200, easing: 'ease-in' });

  // o desenho no chão: gira junto com os talismãs
  const S = R * 3.2;
  const svg = svgEl('svg', { viewBox: `${-S / 2} ${-S / 2} ${S} ${S}`, class: 'sr-sigil', width: S, height: S }, null);
  Object.assign(svg.style, { left: `${-S / 2}px`, top: `${-S / 2}px` });
  orbit.insertBefore(svg, orbit.firstChild);
  const stroke = (d, len, at, dur, w = 2.5) => {
    const glow = svgEl('path', { d, class: 'sr-line-glow', 'stroke-width': w * 4, 'stroke-dasharray': len, 'stroke-dashoffset': len }, svg);
    const line = svgEl('path', { d, class: 'sr-line', 'stroke-width': w, 'stroke-dasharray': len, 'stroke-dashoffset': len }, svg);
    [glow, line].forEach((p) => run(p, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, delay: at, easing: 'ease-in-out' }));
  };
  const circ = (r) => `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0`;
  const tri = (r, rot) => {
    const p = [0, 1, 2].map((i) => {
      const a = ((rot + i * 120) * Math.PI) / 180;
      return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
    });
    return `M ${p[0]} L ${p[1]} L ${p[2]} Z`;
  };
  stroke(circ(R * 1.32), 2 * Math.PI * R * 1.32, 1450, 650, 3);
  stroke(circ(R * 1.2), 2 * Math.PI * R * 1.2, 1600, 650, 1.5);
  stroke(tri(R, -90), 3 * Math.sqrt(3) * R, 1800, 520);
  stroke(tri(R, 90), 3 * Math.sqrt(3) * R, 2050, 520);
  stroke(circ(R * 0.5), 2 * Math.PI * R * 0.5, 2300, 420, 2);
  run(svg, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.18)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 900, delay: SPIN[1], easing: 'ease-out' });

  // o anel de runas, girando ao contrário (fora do giro)
  const ring = el('div', 'sr-runes', null, { left: `${cx}px`, top: `${cy}px` });
  layer.insertBefore(ring, pulse.nextSibling);
  for (let i = 0; i < RUNE_COUNT; i += 1) {
    const a = (i / RUNE_COUNT) * Math.PI * 2;
    const g = svgEl('svg', { viewBox: '0 0 60 60', class: 'sr-rune' }, ring);
    Object.assign(g.style, { left: `${Math.cos(a) * R * 1.58}px`, top: `${Math.sin(a) * R * 1.58}px` });
    svgEl('path', { d: GLYPHS[(i * 5) % GLYPHS.length] }, g);
    run(g, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(2.2)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 220, delay: 1900 + i * 70, easing: 'ease-out' });
  }
  run(ring, [{ transform: 'rotate(0deg)', opacity: 1 }, { transform: 'rotate(-140deg)', opacity: 1, offset: 0.8 }, { transform: 'rotate(-170deg)', opacity: 0 }], { duration: 3000, delay: 1900, easing: 'linear' });

  // o giro: acelera até travar no clarão; o círculo encolhe e estoura
  run(orbit, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(1080deg)' }], { duration: SPIN[1] - SPIN[0], delay: SPIN[0], easing: 'cubic-bezier(.55,0,.95,.55)' });
  run(pulse, [{ transform: 'scale(1)' }, { transform: 'scale(.82)', offset: 0.55 }, { transform: 'scale(.78)', offset: 0.9 }, { transform: 'scale(1.14)', offset: 0.95 }, { transform: 'scale(1)' }], { duration: 2400, delay: SPIN[0], easing: 'ease-in-out' });

  // cada talismã: tremer no nicho, ser arrancado, vir arrastado, girar e voltar
  sources.forEach((src, i) => {
    const a = ((-90 + i * 120) * Math.PI) / 180;
    const tx = Math.cos(a) * R;
    const ty = Math.sin(a) * R;
    const dx = src.x - (cx + tx);
    const dy = src.y - (cy + ty);
    const s0 = src.size / ICON;
    // o meio do caminho, puxado para o lado (arrasto em curva)
    const len = Math.hypot(dx, dy) || 1;
    const bend = (i - 1) * 0.18 + 0.12;
    const mx = dx / 2 + (-dy / len) * len * bend;
    const my = dy / 2 + (dx / len) * len * bend;
    const nodes = layer.querySelectorAll(`.sr-talisman[data-i="${i}"]`);
    nodes.forEach((node) => {
      const k = Number(node.dataset.k);
      Object.assign(node.style, { left: `${tx - ICON / 2}px`, top: `${ty - ICON / 2}px` });
      const fade = k === 0 ? 1 : k === 1 ? 0.45 : 0.2;
      const lag = k * 55;
      run(node, [
        { transform: `translate(${dx}px,${dy}px) scale(${s0})`, opacity: k ? 0 : 1 },
        { transform: `translate(${dx * 0.97}px,${dy - 14}px) scale(${s0 * 1.5})`, opacity: fade, offset: 0.18 },
        { transform: `translate(${mx}px,${my}px) scale(${(s0 + 1) * 0.7})`, opacity: fade, offset: 0.55 },
        { transform: 'translate(0,0) scale(1.12)', opacity: k ? 0 : 1, offset: 0.9 },
        { transform: 'translate(0,0) scale(1)', opacity: k ? 0 : 1 },
      ], { duration: FLY_IN, delay: LIFT[i] + lag, easing: 'cubic-bezier(.45,0,.25,1)' });
      run(node, [
        { transform: 'translate(0,0) scale(1)', opacity: k ? 0 : 1 },
        { transform: `translate(${mx * 0.8}px,${my * 0.8}px) scale(${(s0 + 1) * 0.6})`, opacity: fade, offset: 0.45 },
        { transform: `translate(${dx}px,${dy}px) scale(${s0})`, opacity: k ? 0 : 1 },
      ], { duration: FLY_BACK, delay: BACK[i] + lag, easing: 'cubic-bezier(.6,0,.85,.4)', fill: 'forwards' });
      // pousou: o de verdade já está no nicho, a cópia some
      if (k === 0) run(node, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: BACK[i] + FLY_BACK, fill: 'forwards' });
    });
    // fica de pé enquanto o círculo gira, com um tremor de força
    layer.querySelectorAll(`.sr-talisman[data-i="${i}"] .sr-spin`).forEach((spin) => {
      run(spin, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1080deg)' }], { duration: SPIN[1] - SPIN[0], delay: SPIN[0], easing: 'cubic-bezier(.55,0,.95,.55)' });
    });
    // o nicho: brilha quando ele sai e quando ele volta; o desenho de lá some enquanto isso
    const ringAt = el('i', 'sr-slotglow', layer, { left: `${src.x}px`, top: `${src.y}px`, width: `${src.size * 2.4}px`, height: `${src.size * 2.4}px` });
    run(ringAt, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.5 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.4)' }], { duration: 520, delay: LIFT[i] - 200 });
    const land = BACK[i] + FLY_BACK;
    const back = el('i', 'sr-slotglow', layer, { left: `${src.x}px`, top: `${src.y}px`, width: `${src.size * 2.4}px`, height: `${src.size * 2.4}px` });
    run(back, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.1)', offset: 0.3 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.6)' }], { duration: 520, delay: land - 20 });
    const orig = document.querySelector(`[data-relic-slot="player:${src.id}"] .relic-niche-icon`) ?? document.querySelector(`[data-relic-slot="player:${src.id}"]`);
    run(orig, [
      { transform: 'translate(0,0)', opacity: 1 },
      { transform: 'translate(-1px,1px)', opacity: 1, offset: 0.25 },
      { transform: 'translate(1px,-1px)', opacity: 1, offset: 0.5 },
      { transform: 'translate(-1px,0)', opacity: 1, offset: 0.75 },
      { transform: 'translate(0,0)', opacity: 1 },
    ], { duration: 120, delay: LIFT[i] - 360, iterations: 3, fill: 'none' });
    run(orig, [{ opacity: 0 }, { opacity: 0 }], { duration: land - LIFT[i], delay: LIFT[i], fill: 'none' });
  });

  // o clarão do ritual feito
  const flash = el('div', 'sr-flash', layer);
  run(flash, [{ opacity: 0 }, { opacity: 0.9, offset: 0.06 }, { opacity: 0 }], { duration: 650, delay: SPIN[1] - 20, easing: 'ease-out' });
  run(layer, [{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,6px)', offset: 0.15 }, { transform: 'translate(7px,-5px)', offset: 0.35 }, { transform: 'translate(-4px,3px)', offset: 0.6 }, { transform: 'translate(0,0)' }], { duration: 420, delay: SPIN[1], fill: 'none' });

  return { anims, lift: LIFT, spin: SPIN, land: BACK.map((b) => b + FLY_BACK) };
}
