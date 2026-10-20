/**
 * Voo de uma pedra até a mesa, por cima de tudo (fora do feltro, que corta o
 * que passa da borda). Usa uma CÓPIA visual da pedra que já está no lugar
 * final da mesa (escondida durante o voo), então ela chega idêntica: mesmo
 * material, mesma orientação e, se for bucha, já atravessada na linha.
 *
 * A cada quadro o destino é medido de novo: a câmera da mesa pode estar se
 * afastando durante o voo e a pedra pousa exatamente onde a real está.
 */

import { prefersReducedMotion } from './motion.js';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param tileId   id da pedra na mesa (`data-tile-id`)
 * @param from     { x, y, w, h, angle }: centro na tela, tamanho EM PÉ (largura × altura)
 *                 e inclinação (graus) de onde ela sai; null = cai de cima do próprio lugar
 * @param duration ms do voo
 * @param arc      quanto (px) a pedra sobe no meio do caminho
 * @param onLand   chamado quando ela assenta (som, tremida, destaque)
 * @returns cancelar (para no meio sem chamar onLand)
 */
export function flyTile({ tileId, from, duration = 360, arc = 0, onLand }) {
  let raf = 0;
  let layer = null;
  let target = null;
  let start = 0;
  let tries = 0;
  let done = false;

  const finish = (land) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    layer?.remove();
    if (target) target.style.visibility = '';
    if (land) onLand?.();
  };

  const frame = (now) => {
    if (!target) {
      target = document.querySelector(`[data-tile-id="${tileId}"]`);
      const inner = target?.firstElementChild;
      if (!target || !inner) {
        // a mesa ainda não desenhou a pedra: tenta mais uns quadros
        tries += 1;
        if (tries > 6) finish(true);
        else raf = requestAnimationFrame(frame);
        return;
      }
      if (prefersReducedMotion() || duration <= 0) {
        finish(true);
        return;
      }
      target.style.visibility = 'hidden';
      layer = document.createElement('div');
      layer.className = 'tile-flight';
      layer.setAttribute('aria-hidden', 'true');
      const clone = inner.cloneNode(true);
      clone.querySelectorAll('[data-tile-id]').forEach((el) => el.removeAttribute('data-tile-id'));
      layer.appendChild(clone);
      layer.style.width = `${inner.offsetWidth}px`;
      layer.style.height = `${inner.offsetHeight}px`;
      document.body.appendChild(layer);
      start = now;
    }

    const natW = layer.offsetWidth || 1;
    const natH = layer.offsetHeight || 1;
    const rect = target.getBoundingClientRect();
    const end = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, scale: rect.width / natW };
    const horizontal = natW > natH;
    const origin = from ?? { x: end.x, y: end.y - 60, w: Math.min(natW, natH) * end.scale, h: Math.max(natW, natH) * end.scale, angle: 0 };
    const startScale = origin.h / Math.max(natW, natH);
    // em pé na mão; se na mesa ela fica deitada, gira 90° no caminho
    const startAngle = (origin.angle ?? 0) + (horizontal ? -90 : 0);

    const t = Math.min(1, (now - start) / duration);
    const k = easeOutCubic(t);
    const x = lerp(origin.x, end.x, k);
    const y = lerp(origin.y, end.y, k) - arc * Math.sin(Math.PI * t);
    const scale = lerp(startScale, end.scale, k);
    const angle = lerp(startAngle, 0, k);
    layer.style.transform = `translate(${x - natW / 2}px, ${y - natH / 2}px) rotate(${angle}deg) scale(${scale})`;

    if (t >= 1) finish(true);
    else raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => finish(false);
}
