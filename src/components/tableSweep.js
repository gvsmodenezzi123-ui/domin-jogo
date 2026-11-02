/**
 * Versão 2.6: entre uma rodada e outra, sem tela de "PRÓXIMA RODADA". As pedras da mesa e as
 * que sobraram nas mãos varrem para o dorme (uma atrás da outra, girando em arco), o dorme
 * dá uma chacoalhada de embaralhar e, quando a rodada nova monta, as pedras do rival saem do
 * dorme para a régua dele (as suas já saem do dorme sozinhas, PlayerRack.useEnterFromDorme).
 *
 * Tudo em cópias por cima da tela (as originais ficam escondidas até a rodada nova trocar a
 * mesa), animando só transform e opacidade: leve no iPhone. Com animação reduzida, nada voa.
 */
import { prefersReducedMotion } from './motion.js';

/** O que varre: as pedras da mesa, as da sua mão e as da régua (ou da cadeira) de cada rival. */
const SWEEP_SELECTOR = '.board-tile, [data-hand-tile], [data-rival-tile], .seat-fan-tile';
const FLY_MS = 560;
const MAX_STAGGER_MS = 26;
/** O espaço total das saídas (com muita pedra, elas saem mais coladas). */
const SPREAD_MS = 460;
export const SHUFFLE_MS = 300;

/** A varrida em curso: a camada das cópias, os relógios e as originais escondidas. */
let current = null;
/** As originais escondidas pela última varrida (voltam a aparecer na reparte). */
let hidden = [];

function hide(el) {
  el.style.visibility = 'hidden';
  hidden.push(el);
}

/**
 * Devolve a visibilidade às originais escondidas (as que o React reaproveitou na rodada nova,
 * como as pedras viradas da cadeira, que não trocam de chave).
 */
export function releaseSwept() {
  for (const el of hidden) if (el.isConnected) el.style.visibility = '';
  hidden = [];
}

/** Para a varrida no meio (o menu abriu): some com as cópias e a mesa volta como estava. */
export function cancelSweep() {
  if (current) {
    current.timers.forEach(clearTimeout);
    current.root?.remove();
    current.resolve = null;
    current = null;
  }
  releaseSwept();
}

function pileCenter() {
  const pile = document.querySelector('.boneyard-pile');
  const r = pile?.getBoundingClientRect();
  if (r && r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2, el: pile };
  return { x: window.innerWidth - 40, y: window.innerHeight * 0.25, el: null };
}

function layer() {
  const el = document.createElement('div');
  el.className = 'sweep-layer';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

/** Uma cópia da pedra parada onde a original está (o centro, o tamanho e a inclinação dela). */
function ghostOf(el) {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const w = el.offsetWidth || r.width;
  const h = el.offsetHeight || r.height;
  const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform || '');
  const angle = m ? Number(m[1]) : 0;
  // na mesa a câmera encolhe as pedras (o container tem scale): a cópia acompanha
  const scale = angle ? 1 : r.width / w;
  const box = document.createElement('div');
  box.className = 'sweep-tile';
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  box.style.left = `${cx - w / 2}px`;
  box.style.top = `${cy - h / 2}px`;
  box.style.width = `${w}px`;
  box.style.height = `${h}px`;
  const clone = el.cloneNode(true);
  for (const node of [clone, ...clone.querySelectorAll('[data-tile-id],[data-hand-tile],[data-rival-tile]')]) {
    node.removeAttribute('data-tile-id');
    node.removeAttribute('data-hand-tile');
    node.removeAttribute('data-rival-tile');
  }
  Object.assign(clone.style, { position: 'absolute', left: '0', top: '0', right: 'auto', bottom: 'auto', width: `${w}px`, height: `${h}px`, transform: 'none', visibility: 'visible', transition: 'none' });
  box.appendChild(clone);
  return { box, cx, cy, angle, scale };
}

/**
 * Varre tudo para o dorme. Devolve uma Promise que resolve quando a última pedra entra e o
 * dorme termina de embaralhar. `onTick(i)` toca a cada pedra que chega (o som do osso).
 */
export function sweepToDorme({ onTick = null, onShuffle = null } = {}) {
  if (typeof document === 'undefined') return Promise.resolve();
  cancelSweep();
  const els = [...document.querySelectorAll(SWEEP_SELECTOR)].filter((el) => el.getBoundingClientRect().width > 0);
  const reduced = prefersReducedMotion();
  if (!els.length || reduced) {
    els.forEach(hide);
    return new Promise((resolve) => {
      const run = { root: null, timers: [], resolve };
      run.timers.push(setTimeout(() => finish(run), reduced ? 250 : 0));
      current = run;
    });
  }
  const pile = pileCenter();
  const root = layer();
  const stagger = Math.min(MAX_STAGGER_MS, SPREAD_MS / els.length);
  let last = 0;
  els.forEach((el, i) => {
    const g = ghostOf(el);
    hide(el);
    if (!g) return;
    root.appendChild(g.box);
    const dx = pile.x - g.cx;
    const dy = pile.y - g.cy;
    const spin = (i % 2 ? 1 : -1) * (120 + ((i * 47) % 120));
    const delay = Math.round(i * stagger);
    last = Math.max(last, delay + FLY_MS);
    const anim = g.box.animate(
      [
        { transform: `translate3d(0, 0, 0) rotate(${g.angle}deg) scale(${g.scale})`, opacity: 1 },
        { transform: `translate3d(${dx * 0.35}px, ${dy * 0.35 - 34}px, 0) rotate(${g.angle + spin * 0.4}deg) scale(${g.scale * 1.05})`, opacity: 1, offset: 0.35 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${g.angle + spin}deg) scale(${g.scale * 0.32})`, opacity: 0.25 },
      ],
      { duration: FLY_MS, delay, easing: 'cubic-bezier(0.45, 0, 0.6, 1)', fill: 'both' },
    );
    anim.onfinish = () => {
      g.box.remove();
      if (i % 3 === 0 && current?.root === root) onTick?.(Math.floor(i / 3));
    };
  });
  return new Promise((resolve) => {
    const run = { root, timers: [], resolve };
    current = run;
    run.timers.push(
      setTimeout(() => {
        if (current !== run) return;
        root.remove();
        run.root = null;
        // o dorme chacoalha: embaralhando
        onShuffle?.();
        pile.el?.animate?.(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg) scale(1.06)' }, { transform: 'rotate(5deg) scale(1.04)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(0deg)' }],
          { duration: SHUFFLE_MS, easing: 'ease-in-out' },
        );
        run.timers.push(setTimeout(() => finish(run), SHUFFLE_MS));
      }, last),
    );
  });
}

function finish(run) {
  if (current !== run) return;
  current = null;
  run.resolve?.();
}

/**
 * As pedras novas do rival saem do dorme para a régua dele (ou para a cadeira, na roda), em
 * cascata. Chame logo depois que a rodada nova aparece na tela.
 */
export function dealRivalsFromDorme({ stepMs = 70 } = {}) {
  if (typeof document === 'undefined') return;
  releaseSwept();
  if (prefersReducedMotion()) return;
  const pile = pileCenter();
  const els = [...document.querySelectorAll('[data-rival-tile], .seat-fan-tile')];
  els.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !el.animate) return;
    const dx = pile.x - (r.left + r.width / 2);
    const dy = pile.y - (r.top + r.height / 2);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.4) rotate(-90deg)`, opacity: 0 },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 18}px) scale(0.9)`, opacity: 1, offset: 0.55 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 420, delay: i * stepMs, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'backwards' },
    );
  });
}
