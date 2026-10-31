import { memo, useLayoutEffect, useRef } from 'react';
import { SCENE_PX, paintProp, paintScene, propSize } from './art/botecoScene.js';

/** Cenas já pintadas, por nome e tamanho (trocar de tela e voltar não pinta de novo). */
const cache = new Map();
const CACHE_MAX = 12;

function sceneImage(name, w, h, seed) {
  const key = `${name}:${w}x${h}:${seed}`;
  let img = cache.get(key);
  if (!img) {
    const painted = paintScene(name, w, h, seed);
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
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')?.putImageData(sceneImage(scene, w, h, seed), 0, 0);
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
