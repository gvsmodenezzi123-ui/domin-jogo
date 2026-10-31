import { memo, useLayoutEffect, useRef } from 'react';

/** Desenhos já pintados, por chave (a pilha do dorme com 9 pedras é a mesma em toda a partida). */
const cache = new Map();
const CACHE_MAX = 64;
/** Pinturas grandes (a mesa inteira) ficam num cache à parte, de poucas: cada uma pesa centenas de KB. */
const bigCache = new Map();
const BIG_PIXELS = 20000;
const BIG_MAX = 3;

function imageOf(cacheKey, paint, w, h) {
  const store = w * h > BIG_PIXELS ? bigCache : cache;
  let img = store.get(cacheKey);
  if (img) {
    // o mais usado vai para o fim (o primeiro da fila é o que sai)
    store.delete(cacheKey);
  } else {
    const painted = paint();
    img = new ImageData(painted.data, painted.w, painted.h);
    if (store.size >= (store === bigCache ? BIG_MAX : CACHE_MAX)) store.delete(store.keys().next().value);
  }
  store.set(cacheKey, img);
  return img;
}

/**
 * Versão 2.0: um desenho em pixel art pintado por código (art/tablePixels.js,
 * art/caseArt128.js...) num <canvas> de `w`×`h` pixels, ampliado `scale` vezes no CSS
 * (image-rendering: pixelated). `cacheKey` identifica o desenho: mudou a chave, repinta.
 */
function PixelCanvas({ cacheKey, paint, w, h, scale = 2, className = '', style }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof ImageData === 'undefined') return;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.putImageData(imageOf(cacheKey, paint, w, h), 0, 0);
    // a função de pintura muda a cada render; a chave é o que diz se o desenho mudou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, w, h]);
  return <canvas ref={ref} aria-hidden="true" className={`pixel-canvas ${className}`} style={{ width: w * scale, height: h * scale, ...style }} />;
}

export default memo(PixelCanvas);
