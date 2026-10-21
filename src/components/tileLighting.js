/**
 * Luz da lâmpada nas pedras (as da mesa e as da sua mão).
 *
 * A cada quadro mede onde a mancha de luz da lâmpada está (ela balança e leva
 * tranco nas batidas) e quanto ela está acesa (falhas e apagões), e passa para
 * cada pedra, como variáveis CSS na vaga dela:
 *   --lx, --ly  direção da luz até a pedra (-1..1): o brilho fica do lado virado
 *               para a lâmpada e a sombra cai para o lado oposto
 *   --lit       quanta luz chega (0..1): longe da mancha ou com a lâmpada
 *               falhando a pedra escurece
 * O desenho fica no CSS (.domino-face, .tile-lamp-light em index.css).
 */

import { prefersReducedMotion } from './motion.js';

/** Distância (px) em que a direção da luz satura. */
const REACH = 90;
/** Até onde (px) a mancha de luz ainda clareia. */
const FALLOFF = 420;
/**
 * Patch 0.5.4 (Safari iOS): ~15 atualizações por segundo bastam para luz que balança
 * devagar; as posições das pedras só são medidas de novo a cada MEASURE_MS (antes eram
 * medidas TODAS a cada quadro, o que forçava layout e repintava a mão e a mesa inteiras).
 */
const STEP_MS = 66;
const MEASURE_MS = 300;
/** Degraus das variáveis: com valores em degraus, a maioria dos quadros não escreve nada (nada repinta). */
const DIR_STEP = 0.1;
const LIT_STEP = 0.05;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const snap = (v, step) => Math.round(v / step) * step;
const fmt = (v) => (Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(2)));
const opacityOf = (el) => (el ? Number(getComputedStyle(el).opacity) || 0 : 1);

/**
 * Liga a luz nas pedras enquanto a mesa estiver na tela.
 * @param root  a mesa (`.felt-table`), onde estão a lâmpada e as pedras jogadas
 * @returns desligar
 */
export function startTileLighting(root) {
  if (typeof window === 'undefined' || !root) return () => {};
  let raf = 0;
  let last = 0;
  let measuredAt = -Infinity;
  /** pedras medidas: elemento, centro na tela e se é da sua mão */
  let tiles = [];
  const written = new WeakMap();

  const measure = (now) => {
    measuredAt = now;
    tiles = [];
    for (const el of document.querySelectorAll('[data-tile-id], [data-hand-tile]')) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      tiles.push({ el, x: r.left + r.width / 2, y: r.top + r.height / 2, hand: el.hasAttribute('data-hand-tile') });
    }
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (now - last < STEP_MS || document.hidden || prefersReducedMotion()) return;
    last = now;
    const pool = root.querySelector('.lamp-pool');
    if (!pool) return;
    // 1º mede tudo, depois escreve (escrever no meio das medições trava o quadro)
    const p = pool.getBoundingClientRect();
    const light = { x: p.left + p.width / 2, y: p.top + p.height / 2 };
    const on = opacityOf(pool.closest('.lamp-rig')) * opacityOf(pool.closest('.lamp-kick'));
    if (now - measuredAt >= MEASURE_MS) measure(now);
    for (const tile of tiles) {
      if (!tile.el.isConnected) continue;
      const dx = tile.x - light.x;
      const dy = tile.y - light.y;
      const near = clamp(1 - Math.hypot(dx, dy) / FALLOFF, 0, 1);
      const lx = fmt(snap(clamp(dx / REACH, -1, 1), DIR_STEP));
      const ly = fmt(snap(clamp(dy / REACH, -1, 1), DIR_STEP));
      // a sua mão fica na beira da mesa: pega menos luz, mas nunca some no escuro
      const base = tile.hand ? 0.55 : 0.35;
      const lit = fmt(snap(clamp(on * (base + (1 - base) * near), 0, 1), LIT_STEP));
      const key = `${lx}|${ly}|${lit}`;
      if (written.get(tile.el) === key) continue;
      written.set(tile.el, key);
      tile.el.style.setProperty('--lx', lx);
      tile.el.style.setProperty('--ly', ly);
      tile.el.style.setProperty('--lit', lit);
    }
  };

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
