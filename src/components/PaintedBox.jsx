import { memo, useLayoutEffect, useRef } from 'react';

/** Fundos já pintados, por nome e tamanho (voltar para a tela não pinta de novo). */
const cache = new Map();
const CACHE_MAX = 24;

function imageFor(name, painter, w, h, seed) {
  const key = `${name}:${w}x${h}:${seed}`;
  let img = cache.get(key);
  if (!img) {
    const painted = painter(w, h, seed);
    img = new ImageData(painted.data, painted.w, painted.h);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, img);
  }
  return img;
}

/**
 * Versão 2.2: um fundo pintado em pixel art do tamanho do elemento (o toldo da loja, a
 * estante, a placa de madeira, o porão do Seu Tião): `painter(w, h, seed)` devolve o buffer,
 * 1 pixel para cada `px` px de CSS. Mede o tamanho de layout (offsetWidth), então funciona
 * dentro da cena encolhida pelo useFitScale, e só repinta quando o tamanho muda.
 */
function PaintedBox({ name, painter, px = 2, seed = 1, className = '', style }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof ImageData === 'undefined') return undefined;
    let last = '';
    const paint = () => {
      const w = Math.max(4, Math.ceil(canvas.offsetWidth / px));
      const h = Math.max(4, Math.ceil(canvas.offsetHeight / px));
      const key = `${w}x${h}`;
      if (key === last) return;
      last = key;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')?.putImageData(imageFor(name, painter, w, h, seed), 0, 0);
    };
    paint();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
    // o pintor é estável (função do módulo); o nome e a semente dizem quando muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, px, seed]);
  return <canvas ref={ref} aria-hidden="true" className={`painted-box ${className}`} style={style} />;
}

export default memo(PaintedBox);
