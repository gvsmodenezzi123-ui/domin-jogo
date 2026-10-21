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
/** Intervalo mínimo entre atualizações (ms): ~40 por segundo bastam para luz. */
const STEP_MS = 24;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round2 = (v) => Math.round(v * 100) / 100;
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
  const written = new WeakMap();

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (now - last < STEP_MS || prefersReducedMotion()) return;
    last = now;
    const pool = root.querySelector('.lamp-pool');
    if (!pool) return;
    const rig = pool.closest('.lamp-rig');
    const kick = pool.closest('.lamp-kick');
    // 1º mede tudo, depois escreve (escrever no meio das medições trava o quadro)
    const p = pool.getBoundingClientRect();
    const light = { x: p.left + p.width / 2, y: p.top + p.height / 2 };
    const on = opacityOf(rig) * opacityOf(kick);
    const tiles = [...document.querySelectorAll('[data-tile-id], [data-hand-tile]')];
    const rects = tiles.map((el) => el.getBoundingClientRect());
    tiles.forEach((el, i) => {
      const r = rects[i];
      if (!r.width) return;
      const dx = r.left + r.width / 2 - light.x;
      const dy = r.top + r.height / 2 - light.y;
      const near = clamp(1 - Math.hypot(dx, dy) / FALLOFF, 0, 1);
      const lx = round2(clamp(dx / REACH, -1, 1));
      const ly = round2(clamp(dy / REACH, -1, 1));
      // a sua mão fica na beira da mesa: pega menos luz, mas nunca some no escuro
      const base = el.hasAttribute('data-hand-tile') ? 0.55 : 0.35;
      const lit = round2(clamp(on * (base + (1 - base) * near), 0, 1));
      const key = `${lx}|${ly}|${lit}`;
      if (written.get(el) === key) return;
      written.set(el, key);
      el.style.setProperty('--lx', lx);
      el.style.setProperty('--ly', ly);
      el.style.setProperty('--lit', lit);
    });
  };

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
