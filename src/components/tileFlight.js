/**
 * Voo de uma pedra até a mesa, por cima de tudo (fora do feltro, que corta o
 * que passa da borda). Usa uma CÓPIA visual da pedra que já está no lugar
 * final da mesa (escondida durante o voo), então ela chega idêntica: mesmo
 * material, mesma orientação e, se for bucha, já atravessada na linha.
 *
 * Três tempos, como mão de jogador de verdade:
 *   1. LEVANTA  a pedra sai do lugar, cresce um pouco e a sombra aparece embaixo
 *               (a do rival vira: começa de costas e mostra a face)
 *   2. DESLIZA  vai em curva até a ponta, girando para a orientação da mesa,
 *               com um rastro de cópias apagadas atrás e a sombra no pano
 *   3. CAI      desce até o feltro, bate (som, tremida, lâmpada balança) e
 *               assenta com um esmagadinho
 *
 * A cada quadro o destino é medido de novo: a câmera da mesa pode estar se
 * afastando durante o voo e a pedra pousa exatamente onde a real está.
 */

import { prefersReducedMotion } from './motion.js';

/** Tempos (ms) do voo da sua pedra e da pedra do rival. */
export const FLIGHT_PLAYER = Object.freeze({ lift: 90, glide: 400, drop: 130 });
export const FLIGHT_RIVAL = Object.freeze({ lift: 170, glide: 430, drop: 130 });
/** Em que fração da queda a pedra encosta no feltro (o SLAM sai aqui). */
const CONTACT = 0.5;
/** Quanto (px) a pedra sobe ao ser levantada. */
const LIFT_PX = 16;
/** Rastro: atraso (ms) e opacidade de cada cópia apagada atrás da pedra. */
const TRAIL = [
  { lag: 34, alpha: 0.42 },
  { lag: 68, alpha: 0.24 },
  { lag: 102, alpha: 0.12 },
];

/** Momento do pouso (ms desde o começo do voo). */
export const landTime = (t) => Math.round(t.lift + t.glide + t.drop * CONTACT);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const easeInQuad = (t) => t * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const bezier = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

function makeLayer(className, content, w, h) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  if (content) el.appendChild(content);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.opacity = '0';
  document.body.appendChild(el);
  return el;
}

function cloneFace(inner) {
  const clone = inner.cloneNode(true);
  clone.querySelectorAll('[data-tile-id]').forEach((el) => el.removeAttribute('data-tile-id'));
  return clone;
}

/**
 * @param tileId  id da pedra na mesa (`data-tile-id`)
 * @param from    { x, y, w, h, angle }: centro na tela, tamanho EM PÉ (largura × altura)
 *                e inclinação (graus) de onde ela sai; null = cai de cima do próprio lugar
 * @param fromEl  elemento de onde ela sai (escondido no voo); com `flip`, a cópia dele
 *                é o verso da pedra que vira no começo
 * @param timing  FLIGHT_PLAYER ou FLIGHT_RIVAL
 * @param arc     quanto (px) a curva sobe no meio do caminho
 * @param flip    começa de costas e vira (pedra do rival)
 * @param onLand  chamado quando ela encosta no feltro (som, tremida, lâmpada)
 * @param onDone  chamado quando ela assenta e a pedra real aparece (destaque)
 * @returns cancelar (para no meio sem chamar onLand/onDone)
 */
export function flyTile({ tileId, from, fromEl = null, timing = FLIGHT_PLAYER, arc = 0, flip = false, onLand, onDone }) {
  const { lift: L, glide: G, drop: D } = timing;
  const total = L + G + D;
  let raf = 0;
  let target = null;
  let face = null;
  let back = null;
  let shadow = null;
  let ghosts = [];
  let start = 0;
  let tries = 0;
  let landed = false;
  let done = false;

  const land = () => {
    if (landed) return;
    landed = true;
    onLand?.();
  };

  const finish = (complete) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    for (const el of [face, back, shadow, ...ghosts]) el?.remove();
    if (target) target.style.visibility = '';
    if (complete) {
      land();
      onDone?.();
    }
  };

  const setup = (now) => {
    const inner = target.firstElementChild;
    target.style.visibility = 'hidden';
    if (fromEl) fromEl.style.visibility = 'hidden';
    const w = inner.offsetWidth;
    const h = inner.offsetHeight;
    face = makeLayer('tile-flight', cloneFace(inner), w, h);
    ghosts = TRAIL.map(() => makeLayer('tile-flight tile-flight-ghost', cloneFace(inner), w, h));
    shadow = makeLayer('tile-flight-shadow', null, w, h);
    if (flip && fromEl) {
      // o verso é a pedra deitada de costas na mão do rival
      const src = fromEl.firstElementChild ?? fromEl;
      back = makeLayer('tile-flight', src.cloneNode(true), src.offsetWidth, src.offsetHeight);
    }
    start = now;
  };

  /**
   * Pose da pedra no instante t (ms): centro na tela (x, y), quanto ela está
   * no ar (0..1), escala, giro e o "chão" embaixo dela (para a sombra).
   */
  const poseAt = (t, ctx) => {
    const { origin, end, startScale, startAngle } = ctx;
    const lifted = startScale * 1.12;
    const landedScale = end.scale * 1.12;
    if (t <= L) {
      const u = easeOutQuad(clamp01(t / L));
      return { x: origin.x, y: origin.y - LIFT_PX * u, gx: origin.x, gy: origin.y, air: u, scale: lerp(startScale, lifted, u), angle: startAngle, flipT: clamp01(t / L) };
    }
    if (t <= L + G) {
      const u = easeInOutCubic(clamp01((t - L) / G));
      const cx = (origin.x + end.x) / 2;
      const cy = Math.min(origin.y, end.y) - arc;
      const gx = lerp(origin.x, end.x, u);
      const gy = lerp(origin.y, end.y, u);
      return {
        x: bezier(origin.x, cx, end.x, u),
        y: bezier(origin.y, cy, end.y, u) - LIFT_PX,
        gx,
        gy,
        air: 1,
        scale: lerp(lifted, landedScale, u),
        angle: lerp(startAngle, 0, u),
        flipT: 1,
      };
    }
    const u = clamp01((t - L - G) / D);
    if (u <= CONTACT) {
      // cai até o feltro
      const k = easeInQuad(u / CONTACT);
      return { x: end.x, y: end.y - LIFT_PX * (1 - k), gx: end.x, gy: end.y, air: 1 - k, scale: lerp(landedScale, end.scale * 0.92, k), angle: 0, flipT: 1 };
    }
    // esmaga um tico e assenta
    const k = easeOutQuad((u - CONTACT) / (1 - CONTACT));
    return { x: end.x, y: end.y, gx: end.x, gy: end.y, air: 0, scale: lerp(end.scale * 0.92, end.scale, k), angle: 0, flipT: 1 };
  };

  const place = (el, pose, w, h, extra = '') => {
    el.style.transform = `translate(${pose.x - w / 2}px, ${pose.y - h / 2}px) rotate(${pose.angle}deg) scale(${pose.scale})${extra}`;
  };

  const frame = (now) => {
    if (!target) {
      target = document.querySelector(`[data-tile-id="${tileId}"]`);
      if (!target?.firstElementChild) {
        // a mesa ainda não desenhou a pedra: tenta mais uns quadros
        target = null;
        tries += 1;
        if (tries > 6) finish(true);
        else raf = requestAnimationFrame(frame);
        return;
      }
      if (prefersReducedMotion()) {
        finish(true);
        return;
      }
      setup(now);
    }

    const natW = face.offsetWidth || 1;
    const natH = face.offsetHeight || 1;
    const rect = target.getBoundingClientRect();
    const end = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, scale: rect.width / natW };
    const horizontal = natW > natH;
    const origin = from ?? { x: end.x, y: end.y - 80, w: Math.min(natW, natH) * end.scale, h: Math.max(natW, natH) * end.scale, angle: 0 };
    const ctx = {
      origin,
      end,
      startScale: origin.h / Math.max(natW, natH),
      // em pé na mão; se na mesa ela fica deitada, gira 90° no caminho
      startAngle: (origin.angle ?? 0) + (horizontal ? -90 : 0),
    };

    const t = Math.min(total, now - start);
    const pose = poseAt(t, ctx);

    // pedra (e o verso, se ela vira no começo)
    if (back && pose.flipT < 0.5) {
      const sx = Math.max(0.02, Math.cos(Math.PI * pose.flipT));
      const bw = back.offsetWidth || 1;
      const bh = back.offsetHeight || 1;
      const s = pose.scale / ctx.startScale;
      back.style.opacity = '1';
      back.style.transform = `translate(${pose.x - bw / 2}px, ${pose.y - bh / 2}px) rotate(${origin.angle ?? 0}deg) scale(${s * sx}, ${s})`;
      face.style.opacity = '0';
    } else {
      if (back) back.style.opacity = '0';
      face.style.opacity = '1';
      // no fim do giro a face "abre" de lado (como pedra virando na mão)
      const sx = back ? Math.max(0.02, -Math.cos(Math.PI * pose.flipT)) : 1;
      place(face, pose, natW, natH, sx < 1 ? ` scale(${horizontal ? 1 : sx}, ${horizontal ? sx : 1})` : '');
    }

    // sombra no pano: embaixo da pedra, mais larga e clara quanto mais alto ela está
    shadow.style.opacity = String(0.22 + 0.4 * pose.air);
    const sOff = 4 + 10 * pose.air;
    shadow.style.transform = `translate(${pose.gx - natW / 2 + sOff * 0.6}px, ${pose.gy - natH / 2 + sOff}px) rotate(${pose.angle}deg) scale(${pose.scale * (1 + 0.18 * pose.air)})`;

    // rastro: as cópias seguem o mesmo caminho um pouco atrás, só enquanto ela desliza
    ghosts.forEach((g, i) => {
      const lt = t - TRAIL[i].lag;
      const sliding = lt > L * 0.6 && t < L + G + D * CONTACT;
      if (!sliding) {
        g.style.opacity = '0';
        return;
      }
      const gp = poseAt(lt, ctx);
      g.style.opacity = String(TRAIL[i].alpha);
      place(g, gp, natW, natH);
    });

    if (!landed && t >= L + G + D * CONTACT) land();
    if (t >= total) finish(true);
    else raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => finish(false);
}
