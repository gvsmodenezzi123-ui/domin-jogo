/**
 * PRÉVIA: o Tio Zé refeito em volume (os quadros prontos em art/tioZeHD.js, paleta + RLE):
 * de frente (o busto, que também dá o retrato) e de perfil sentado, em camadas.
 */
import { TIOZE_HD } from './tioZeHD.js';

const HD_RAW = new Map();
const bytesOf = (s) => {
  const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u[i] = bin.charCodeAt(i);
  return u;
};
function rawHD(name) {
  if (!HD_RAW.has(name)) {
    const f = TIOZE_HD[name];
    const pal = bytesOf(f.p);
    const rle = bytesOf(f.d);
    const out = new Uint8ClampedArray(f.w * f.h * 4);
    let o = 0;
    for (let i = 0; i < rle.length; ) {
      const n = rle[i];
      let idx = rle[i + 1];
      i += 2;
      if (f.i === 2) {
        idx = (idx << 8) | rle[i];
        i += 1;
      }
      const c = idx * 4;
      for (let k = 0; k < n; k += 1) {
        out[o] = pal[c];
        out[o + 1] = pal[c + 1];
        out[o + 2] = pal[c + 2];
        out[o + 3] = pal[c + 3];
        o += 4;
      }
    }
    HD_RAW.set(name, out);
  }
  return HD_RAW.get(name);
}
/** Um quadro do Tio Zé novo como a prancha fina (S = 2), espelhado se `flip`. */
function frameHD(names, flip = false) {
  const { w, h } = TIOZE_HD[names[0]];
  const data = new Uint8ClampedArray(w * h * 4);
  for (const name of names) {
    const src = rawHD(name);
    for (let p = 0; p < w * h; p += 1) {
      if (!src[p * 4 + 3]) continue;
      data.set(src.subarray(p * 4, p * 4 + 4), p * 4);
    }
  }
  if (flip) {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w / 2; x += 1) {
        const a = (y * w + x) * 4;
        const b = (y * w + (w - 1 - x)) * 4;
        for (let c = 0; c < 4; c += 1) {
          const t = data[a + c];
          data[a + c] = data[b + c];
          data[b + c] = t;
        }
      }
    }
  }
  const px = (x, y, c, a = 1) => {
    const i = (y * w + x) * 4;
    data[i] = Math.round(data[i] + (c[0] - data[i]) * a);
    data[i + 1] = Math.round(data[i + 1] + (c[1] - data[i + 1]) * a);
    data[i + 2] = Math.round(data[i + 2] + (c[2] - data[i + 2]) * a);
  };
  return { w, h, lw: w / 2, lh: h / 2, S: 2, data, px };
}
const FACES = new Set(['thinking', 'smug', 'hurt']);
/** O quadro do rosto: falando, piscando (e desmaiado), pensando, convencido, apanhando ou parado. */
const faceHD = (mood, speaking) => (speaking && mood !== 'hurt' ? 'talk' : mood === 'blink' || mood === 'out' ? 'blink' : FACES.has(mood) ? mood : 'idle');
export const tioZeFront = (mood, speaking) => frameHD([`front-${faceHD(mood, speaking)}`]);
/** O Tio Zé novo sentado de lado (a cadeira dele vem junto: o assento é na altura dele). */
export function tioZeSeated(mood, speaking, facing, part) {
  const upper = `upper-${faceHD(mood, speaking)}`;
  const names = part === 'chair' ? ['chair'] : part === 'legs' ? ['legs'] : part === 'upper' ? [upper] : ['chair', 'legs', upper];
  return frameHD(names, facing === 'left');
}

