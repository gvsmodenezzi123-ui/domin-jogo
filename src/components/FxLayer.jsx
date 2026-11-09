import { useEffect, useRef } from 'react';
import { createFx, MAX_BURSTS, MAX_TILES } from './fx/fxShader.js';
import { roomFx } from './art/landRooms.js';
import { prefersReducedMotion } from './motion.js';

/** Cada pedra aprimorada vira um número no shader (fx/fxShader.js). */
const KIND = { ouro: 1, rubi: 2, cristal: 3, chumbo: 4, fantasma: 5, ambar: 6, obsidiana: 7 };
const BURST_COLOR = { ouro: [1, 0.78, 0.3], rubi: [1, 0.15, 0.2], cristal: [0.5, 0.9, 1], chumbo: [0.6, 0.62, 0.8], fantasma: [0.6, 1, 0.85], ambar: [1, 0.6, 0.2], obsidiana: [0.62, 0.3, 1] };
/** 1 px da camada = 2 px de CSS (a grade da pintura da sala). */
const PX = 2;
/** 30 quadros por segundo bastam para o tremor da luz (e poupam bateria). */
const FRAME_MS = 1000 / 30;

const enhOf = (el) => {
  for (const name of el.classList) if (name.startsWith('tile-enh-') && KIND[name.slice(9)]) return name.slice(9);
  return null;
};

/**
 * Versão 2.13: a luz viva da mesa, num shader (WebGL) por cima da sala, da mesa e das pedras,
 * somada à tela: as fontes de luz da sala piscando e tremendo, a fumaça e a poeira no facho, o
 * luar, a persiana, a aura das pedras aprimoradas (na mesa e na sua mão) e o clarão de cada pedra
 * que cai. Sem WebGL, não aparece (o jogo fica como era). Com animações reduzidas, a luz para.
 */
export default function FxLayer({ scene, candles = false, rootRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const root = rootRef?.current;
    if (!canvas || !root) return undefined;
    const fx = createFx(canvas);
    if (!fx) {
      canvas.style.display = 'none';
      return undefined;
    }
    let raf = 0;
    let last = 0;
    let size = { w: 0, h: 0, cssW: 0, cssH: 0 };
    let room = null;
    let tiles = [];
    let seen = null;
    const bursts = [];
    const start = performance.now();
    const reduced = () => prefersReducedMotion() || document.documentElement.classList.contains('reduce-motion') || Boolean(root.closest('.reduce-motion'));

    const resize = () => {
      const box = root.getBoundingClientRect();
      const w = Math.max(8, Math.ceil(box.width / PX));
      const h = Math.max(8, Math.ceil(box.height / PX));
      if (w === size.w && h === size.h) return;
      size = { w, h, cssW: box.width, cssH: box.height };
      canvas.width = w;
      canvas.height = h;
      room = roomFx(scene, w, h, { candles });
    };

    // as pedras aprimoradas (na mesa e na mão) e as pedras novas na mesa (o clarão)
    const measure = (now) => {
      const box = root.getBoundingClientRect();
      const kx = size.w / Math.max(1, box.width);
      const ky = size.h / Math.max(1, box.height);
      const list = [];
      for (const el of document.querySelectorAll('.tile-body.tile-enh')) {
        if (list.length >= MAX_TILES) break;
        const kind = enhOf(el);
        if (!kind || el.closest('[style*="visibility: hidden"]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom) continue;
        // os quatro cantos de verdade (os pontinhos .fx-corner seguem o giro do leque e a
        // perspectiva da mesa); a caixa reta do getBoundingClientRect não serve
        const corners = el.querySelectorAll(':scope > .fx-corner');
        if (corners.length !== 4) continue;
        const q = [];
        for (const c of corners) {
          const cr = c.getBoundingClientRect();
          q.push((cr.left - box.left) * kx, (cr.top - box.top) * ky);
        }
        list.push({ q, kind: KIND[kind] });
      }
      tiles = list;
      const ids = new Set();
      for (const el of root.querySelectorAll('.board-world [data-tile-id]')) {
        if (el.style.visibility === 'hidden') continue;
        const id = el.getAttribute('data-tile-id');
        ids.add(id);
        if (seen && !seen.has(id)) {
          const face = el.querySelector('.domino-face');
          const r = (face ?? el).getBoundingClientRect();
          const enh = face ? enhOf(face.querySelector('.tile-enh') ?? face) : null;
          bursts.push({
            x: (r.left + r.width / 2 - box.left) * kx,
            y: (r.top + r.height / 2 - box.top) * ky,
            t0: now,
            k: face?.classList.contains('tile-crosswise') ? 1.35 : 1,
            c: enh ? BURST_COLOR[enh] : [1, 0.86, 0.62],
          });
          if (bursts.length > MAX_BURSTS) bursts.shift();
        }
      }
      seen = ids;
    };

    const draw = (now) => {
      const motion = reduced() ? 0 : 1;
      const time = motion ? (now - start) / 1000 : 0;
      for (let i = bursts.length - 1; i >= 0; i -= 1) if ((now - bursts[i].t0) / 1000 > 0.9) bursts.splice(i, 1);
      fx.draw({
        w: size.w,
        h: size.h,
        time,
        unit: size.h / 195,
        motion,
        lights: room.lights,
        tiles,
        bursts: motion ? bursts.map((B) => ({ ...B, age: (now - B.t0) / 1000 })) : [],
        haze: room.haze,
        hazeBand: room.hazeBand,
        moon: room.moon,
        stripe: room.stripe,
      });
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.visibilityState === 'hidden') return;
      // com animações reduzidas, a luz fica parada: só redesenha devagar (pedras novas, tela)
      if (reduced() && !tiles.length && now - last < 400) return;
      // com pedra aprimorada na tela, a aura segue a pedra a cada quadro (60 por segundo);
      // sem ela, a luz da sala basta a 30
      if (!tiles.length && !bursts.length && now - last < FRAME_MS) return;
      last = now;
      resize();
      measure(now);
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    const onLost = (e) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      canvas.style.display = 'none';
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onLost);
      fx.dispose();
    };
  }, [scene, candles, rootRef]);
  // trocar de sala troca o canvas (o contexto do anterior é liberado ao sair)
  return <canvas key={`${scene}-${candles ? 'velas' : 'luz'}`} ref={ref} aria-hidden="true" className="fx-layer pointer-events-none absolute inset-0" />;
}
