import { memo, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { castVersion, subscribeCast } from './art/castHD.js';

/** Desenhos já pintados, por chave (a pilha do dorme com 9 pedras é a mesma em toda a partida). */
const cache = new Map();
const CACHE_MAX = 160;
/**
 * Pinturas grandes (a mesa inteira, os personagens em volume) ficam num cache à parte, medido em
 * pixels (versão 2.46): cada uma pesa centenas de KB. Sempre cabem pelo menos BIG_MIN.
 */
const bigCache = new Map();
const BIG_PIXELS = 20000;
const BIG_BUDGET = 2_400_000;
const BIG_MIN = 6;
let bigUsed = 0;

const areaOf = (img) => img.width * img.height;
function forget(store, key) {
  const img = store.get(key);
  if (!img) return;
  store.delete(key);
  if (store === bigCache) bigUsed -= areaOf(img);
}

function imageOf(cacheKey, paint) {
  let img = cache.get(cacheKey);
  let store = cache;
  if (!img) {
    img = bigCache.get(cacheKey);
    store = bigCache;
  }
  if (img) {
    // o mais usado vai para o fim (o primeiro da fila é o que sai)
    store.delete(cacheKey);
    store.set(cacheKey, img);
    return img;
  }
  const painted = paint();
  img = new ImageData(painted.data, painted.w, painted.h);
  if (areaOf(img) > BIG_PIXELS) {
    while (bigCache.size >= BIG_MIN && bigUsed + areaOf(img) > BIG_BUDGET) forget(bigCache, bigCache.keys().next().value);
    bigCache.set(cacheKey, img);
    bigUsed += areaOf(img);
  } else {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, img);
  }
  return img;
}

const NO_SUB = () => () => {};
const ZERO = () => 0;

/**
 * Versão 2.0: um desenho em pixel art pintado por código (art/tablePixels.js,
 * art/caseArt128.js...) num <canvas>, mostrado em `w`×`h` × `scale` no CSS (image-rendering:
 * pixelated). `cacheKey` identifica o desenho: mudou a chave, repinta.
 * Versão 2.46: o canvas tem o tamanho da PINTURA (os personagens em volume pintam no dobro);
 * `live`: o desenho é de um personagem, e repinta quando os quadros dele chegam (art/castHD.js).
 */
function PixelCanvas({ cacheKey, paint, w, h, scale = 2, className = '', style, live = false }) {
  const ref = useRef(null);
  const cast = useSyncExternalStore(live ? subscribeCast : NO_SUB, live ? castVersion : ZERO, live ? castVersion : ZERO);
  const key = live ? `${cacheKey}|${cast}` : cacheKey;
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof ImageData === 'undefined') return;
    // versão 2.6.1: só troca o tamanho quando ele muda (trocar apaga e realoca o canvas, mesmo
    // com o mesmo valor); a pintura nova cobre todos os pixels, inclusive a transparência
    const img = imageOf(key, paint);
    if (canvas.width !== img.width) canvas.width = img.width;
    if (canvas.height !== img.height) canvas.height = img.height;
    canvas.getContext('2d')?.putImageData(img, 0, 0);
    // a função de pintura muda a cada render; a chave é o que diz se o desenho mudou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, h]);
  return <canvas ref={ref} aria-hidden="true" className={`pixel-canvas ${className}`} style={{ width: w * scale, height: h * scale, ...style }} />;
}

export default memo(PixelCanvas);
