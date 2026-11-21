import { memo, useLayoutEffect, useRef } from 'react';
import { SCENE_PX, paintProp, paintScene, propSize } from './art/botecoScene.js';
import { DAY_ROOMS, LAND_ROOM_IDS, paintDayLayers, paintLandRoom } from './art/landRooms.js';

/** Cenas já pintadas, por nome e tamanho (trocar de tela e voltar não pinta de novo). */
const cache = new Map();
const CACHE_MAX = 12;

function sceneImage(name, w, h, seed) {
  const key = `${name}:${w}x${h}:${seed}`;
  let img = cache.get(key);
  if (!img) {
    // versão 2.13: as salas das regiões (art/landRooms.js) têm a luz delas
    const painted = LAND_ROOM_IDS.includes(name) ? paintLandRoom(name, w, h, seed) : paintScene(name, w, h, seed);
    img = new ImageData(painted.data, painted.w, painted.h);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, img);
  }
  return img;
}

/**
 * Versão 1.5: o boteco atrás da tela (art/botecoScene.js), num <canvas> com 1 pixel do
 * cenário para cada 2 px de CSS. Pinta uma vez por tamanho, direto no ResizeObserver (nada de
 * estado do React, nada re-renderiza), e o navegador só compõe a imagem parada: não pesa no
 * iPhone. `seed` troca a arrumação das garrafas e manchas.
 */
function BotecoBackdrop({ scene, seed = 1955, className = '', style }) {
  if (DAY_ROOMS.includes(scene)) return <DayBackdrop scene={scene} seed={seed} className={className} style={style} />;
  return <StillBackdrop scene={scene} seed={seed} className={className} style={style} />;
}

function StillBackdrop({ scene, seed, className, style }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof ImageData === 'undefined') return undefined;
    let last = '';
    const paint = () => {
      const box = canvas.getBoundingClientRect();
      const w = Math.max(8, Math.ceil(box.width / SCENE_PX));
      const h = Math.max(8, Math.ceil(box.height / SCENE_PX));
      const key = `${w}x${h}`;
      if (key === last) return;
      last = key;
      // versão 2.46: as salas da noite vêm em alta (o canvas tem o tamanho da pintura)
      const img = sceneImage(scene, w, h, seed);
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.putImageData(img, 0, 0);
    };
    paint();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [scene, seed]);
  return <canvas ref={ref} aria-hidden="true" className={`boteco-backdrop ${className}`} style={style} data-scene={scene} />;
}

export default memo(BotecoBackdrop);

/** As camadas já pintadas de uma sala de dia, por nome e tamanho. */
const dayCache = new Map();

function dayLayers(name, w, h, seed) {
  const key = `${name}:${w}x${h}:${seed}`;
  let layers = dayCache.get(key);
  if (!layers) {
    layers = paintDayLayers(name, w, h, seed);
    if (dayCache.size >= 4) dayCache.delete(dayCache.keys().next().value);
    dayCache.set(key, layers);
  }
  return layers;
}

/** `top` por cima de `bottom` (mesmo tamanho; alfa de verdade, como o navegador compunha). */
function overlay(bottom, top) {
  if (!bottom || bottom.w !== top.w || bottom.h !== top.h) return top;
  const out = new Uint8ClampedArray(bottom.data);
  const t = top.data;
  for (let i = 0; i < out.length; i += 4) {
    const a = t[i + 3] / 255;
    if (a === 0) continue;
    if (a === 1) {
      out[i] = t[i];
      out[i + 1] = t[i + 1];
      out[i + 2] = t[i + 2];
      out[i + 3] = 255;
      continue;
    }
    const b = out[i + 3] / 255;
    const oa = a + b * (1 - a);
    for (let c = 0; c < 3; c += 1) out[i + c] = (t[i + c] * a + out[i + c] * b * (1 - a)) / (oa || 1);
    out[i + 3] = oa * 255;
  }
  return { w: top.w, h: top.h, data: out };
}

const putLayer = (canvas, layer) => {
  canvas.width = layer.w;
  canvas.height = layer.h;
  canvas.getContext('2d')?.putImageData(new ImageData(layer.data, layer.w, layer.h), 0, 0);
};

/**
 * Versão 2.31: a sala de dia em camadas (art/landRooms.js, paintDayLayers): o céu atrás, as
 * nuvens andando devagar, as cristas do mar indo e vindo, a vinheta e a sala por cima, com buraco
 * onde é céu ou mar. As faixas que andam são `transform` em passos de 1 pixel da cena (a pixel
 * art não borra) e o navegador só compõe: não pesa no iPhone. Com animações reduzidas, param.
 */
function DayBackdrop({ scene, seed, className, style }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || typeof ImageData === 'undefined') return undefined;
    const [back, clouds, waveA, waveB, front] = root.children;
    let trees = [];
    let last = '';
    let anims = [];
    const drift = (el, layer, sx, sy, top) => {
      el.style.width = `${layer.w * sx}px`;
      el.style.height = `${layer.h * sy}px`;
      el.style.top = `${top * sy}px`;
      if (typeof el.animate !== 'function') return;
      const span = layer.period * sx;
      const [from, to] = (layer.dir ?? -1) < 0 ? [0, -span] : [-span, 0];
      anims.push(
        el.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: `translate3d(${to}px, 0, 0)` }], {
          duration: (layer.period / layer.speed) * 1000,
          iterations: Infinity,
          easing: `steps(${layer.period})`,
        }),
      );
    };
    const paint = () => {
      const box = root.getBoundingClientRect();
      const w = Math.max(8, Math.ceil(box.width / SCENE_PX));
      const h = Math.max(8, Math.ceil(box.height / SCENE_PX));
      const key = `${w}x${h}`;
      if (key === last) return;
      last = key;
      const L = dayLayers(scene, w, h, seed);
      for (const a of anims) a.cancel();
      anims = [];
      putLayer(back, L.back);
      // versão 2.45.1: a vinheta e a sala num canvas só (a sala por cima da vinheta, como era):
      // uma camada de tela cheia a menos para a placa de vídeo compor
      putLayer(front, overlay(L.shade, L.front));
      const sx = box.width / w;
      const sy = box.height / h;
      putLayer(clouds, L.clouds);
      drift(clouds, L.clouds, sx, sy, 0);
      // versão 2.41: as copas das árvores e as palmas dos coqueiros balançam com o vento, cada uma
      // presa no seu tronco (uma inclinação pequena, indo e voltando, cada árvore no seu tempo)
      for (const el of trees) el.remove();
      trees = (L.trees ?? []).map((t, i) => {
        const el = document.createElement('canvas');
        el.className = 'day-layer day-tree';
        putLayer(el, t);
        Object.assign(el.style, { left: `${t.x * sx}px`, top: `${t.y * sy}px`, width: `${t.w * sx}px`, height: `${t.h * sy}px`, transformOrigin: `${t.px * sx}px ${t.py * sy}px` });
        root.appendChild(el);
        if (typeof el.animate === 'function') {
          const a = 1.1 * (t.amp ?? 1);
          anims.push(
            el.animate(
              [
                { transform: `skewX(${-a}deg) rotate(${-a * 0.5}deg)` },
                { transform: `skewX(${a * 0.4}deg) rotate(${a * 0.25}deg)`, offset: 0.45 },
                { transform: `skewX(${a}deg) rotate(${a * 0.5}deg)` },
              ],
              { duration: 4200 + i * 900, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: -i * 1300 },
            ),
          );
        }
        return el;
      });
      [waveA, waveB].forEach((el, k) => {
        const wave = L.waves[k];
        el.style.display = wave ? '' : 'none';
        if (!wave) return;
        putLayer(el, wave);
        drift(el, wave, sx, sy, wave.y);
      });
    };
    paint();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(paint);
    observer?.observe(root);
    return () => {
      observer?.disconnect();
      for (const a of anims) a.cancel();
      for (const el of trees) el.remove();
    };
  }, [scene, seed]);
  return (
    <div ref={ref} aria-hidden="true" className={`boteco-backdrop day-backdrop ${className}`} style={style} data-scene={scene}>
      <canvas className="day-layer day-fill" />
      <canvas className="day-layer day-drift" />
      <canvas className="day-layer day-drift" />
      <canvas className="day-layer day-drift" />
      <canvas className="day-layer day-fill" />
    </div>
  );
}

/** Um objeto solto do cenário (copo, cinzeiro, tampinhas) em pixel art, `scale` px por pixel. */
export const SceneProp = memo(function SceneProp({ name, scale = 2, className = '', style }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof ImageData === 'undefined') return;
    const painted = paintProp(name);
    canvas.width = painted.w;
    canvas.height = painted.h;
    canvas.getContext('2d')?.putImageData(new ImageData(painted.data, painted.w, painted.h), 0, 0);
  }, [name]);
  const size = propSize(name);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`scene-prop scene-prop-${name} ${className}`}
      style={{ width: size.w * scale, height: size.h * scale, ...style }}
      data-prop={name}
    />
  );
});
