/**
 * Luz da lâmpada nas pedras (as da mesa e as da sua mão).
 *
 * Cada pedra recebe, como variáveis CSS na vaga dela, de onde vem a luz:
 *   --lx, --ly  direção da luz até a pedra (-1..1): o brilho fica do lado virado
 *               para a lâmpada e a sombra cai para o lado oposto
 *   --lit       quanta luz chega (0..1): longe da mancha a pedra escurece
 * O desenho fica no CSS (.domino-face, .tile-lamp-light em index.css).
 *
 * Patch 0.9.4 (quedas de quadro no Safari iOS): a luz das pedras ficou PARADA, no ponto de
 * repouso da lâmpada. Antes ela seguia o balanço e as falhas a ~15 vezes por segundo: cada
 * escrita repintava a sombra e o brilho das pedras (a mesa medida dava ~38 pinturas por segundo
 * com a mesa parada). Agora as variáveis só mudam quando entra ou sai pedra (mesa ou mão) ou a
 * tela muda de tamanho; o balanço da lâmpada continua no facho e na mancha de luz (transform, na
 * GPU) e as falhas escurecem a mesa inteira (.room-flicker, opacity).
 */

/** Distância (px) em que a direção da luz satura. */
const REACH = 90;
/** Até onde (px) a mancha de luz ainda clareia. */
const FALLOFF = 420;
/** De quanto em quanto tempo confere se a mesa ou a mão mudaram (só conta pedras; não mede nada). */
const CHECK_MS = 450;
/** Depois de uma mudança, mede de novo mais algumas vezes (a câmera da mesa e o leque assentam). */
const SETTLE_PASSES = 3;
/** Degraus das variáveis: valores em degraus quase nunca mudam (nada repinta). */
const DIR_STEP = 0.1;
const LIT_STEP = 0.05;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const snap = (v, step) => Math.round(v / step) * step;
const fmt = (v) => (Math.abs(v) < 1e-9 ? 0 : Number(v.toFixed(2)));

/** Variáveis de luz de uma pedra no centro (x, y), com a lâmpada parada em `light`. */
export function lightingFor(x, y, light, hand) {
  const dx = x - light.x;
  const dy = y - light.y;
  const near = clamp(1 - Math.hypot(dx, dy) / FALLOFF, 0, 1);
  const lx = fmt(snap(clamp(dx / REACH, -1, 1), DIR_STEP));
  const ly = fmt(snap(clamp(dy / REACH, -1, 1), DIR_STEP));
  // a sua mão fica na beira da mesa: pega menos luz, mas nunca some no escuro
  const base = hand ? 0.55 : 0.35;
  const lit = fmt(snap(clamp(base + (1 - base) * near, 0, 1), LIT_STEP));
  return { lx, ly, lit };
}

/**
 * Liga a luz nas pedras enquanto a mesa estiver na tela.
 * @param root  a mesa (`.felt-table`), onde fica a lâmpada
 * @returns desligar
 */
export function startTileLighting(root) {
  if (typeof window === 'undefined' || !root) return () => {};
  let timer = 0;
  let signature = '';
  let settle = 0;
  const written = new WeakMap();

  const relight = () => {
    const els = [...document.querySelectorAll('[data-tile-id], [data-hand-tile]')];
    const sig = `${root.clientWidth}x${root.clientHeight}|${els.map((el) => el.getAttribute('data-tile-id') ?? el.getAttribute('data-hand-tile')).join(',')}`;
    if (sig !== signature) {
      signature = sig;
      settle = SETTLE_PASSES;
    }
    if (settle <= 0) return;
    settle -= 1;
    // a lâmpada em repouso: no meio da mesa, a mancha de luz um pouco acima do centro
    const box = root.getBoundingClientRect();
    const light = { x: box.left + box.width / 2, y: box.top + box.height * 0.42 };
    // 1º mede tudo, depois escreve (escrever no meio das medições trava o quadro)
    const spots = els.map((el) => [el, el.getBoundingClientRect()]);
    for (const [el, r] of spots) {
      if (!r.width) continue;
      const { lx, ly, lit } = lightingFor(r.left + r.width / 2, r.top + r.height / 2, light, el.hasAttribute('data-hand-tile'));
      const key = `${lx}|${ly}|${lit}`;
      if (written.get(el) === key) continue;
      written.set(el, key);
      el.style.setProperty('--lx', lx);
      el.style.setProperty('--ly', ly);
      el.style.setProperty('--lit', lit);
    }
  };

  const tick = () => {
    if (!document.hidden) relight();
    timer = window.setTimeout(tick, CHECK_MS);
  };
  tick();
  return () => window.clearTimeout(timer);
}
