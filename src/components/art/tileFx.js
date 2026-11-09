/**
 * Versão 2.15.2: os brilhos das pedras aprimoradas em pixel art, na MESMA grade da pedra
 * (tilePixels.js). Cada efeito é uma tira de quadros pintados pixel a pixel, mostrada quadro a
 * quadro (steps) por cima da pedra: nenhum pixel fica fora da grade, nada borra, nada vaza da
 * quina em degraus. Por dentro: o reflexo em faixa de escada, a estrelinha, o arco-íris em
 * faixas e os fiapos do fantasma. Por fora: o halo em degraus (1 a 3 anéis de pixel seguindo a
 * quina), que bate (rubi), respira (ouro, âmbar, fantasma, obsidiana) ou fica parado (cristal).
 */
import { tileShape } from './tilePixels.js';

/** O que cada material faz. layer: o efeito de dentro; halo: o de fora. */
export const TILE_FX = Object.freeze({
  ouro: { layer: 'glint', glint: [255, 250, 214], sparkle: [255, 255, 236], halo: [255, 196, 84], pulse: 'breath' },
  rubi: { layer: 'glint', glint: [255, 214, 222], sparkle: [255, 240, 244], halo: [255, 36, 66], pulse: 'beat' },
  cristal: { layer: 'holo', alpha: 0.32, sparkle: [240, 255, 255], halo: [110, 236, 255], pulse: 'steady' },
  chumbo: { layer: null, halo: null },
  fantasma: { layer: 'wisp', halo: [186, 136, 255], pulse: 'breath' },
  ambar: { layer: 'glint', glint: [255, 238, 196], halo: [255, 146, 36], pulse: 'breath' },
  obsidiana: { layer: 'holo', alpha: 0.2, sparkle: [255, 214, 170], halo: [176, 132, 255], pulse: 'slow' },
});

/** O reflexo da pedra selecionada (as comuns também): a faixa branca de escada. */
const PLAIN_GLINT = [255, 255, 255];

/** ms por quadro de cada efeito. */
const FRAME_MS = { glint: 45, holo: 150, wisp: 140, beat: 120, breath: 140, slow: 170 };

const RAINBOW = [
  [255, 110, 200],
  [255, 214, 110],
  [150, 255, 170],
  [110, 220, 255],
  [176, 140, 255],
  [255, 140, 220],
];

const blank = (w, h) => new Uint8ClampedArray(w * h * 4);
function plot(data, W, x, y, rgb, a) {
  const i = (y * W + x) * 4;
  const prev = data[i + 3] / 255;
  const out = a + prev * (1 - a);
  if (out <= 0) return;
  for (let k = 0; k < 3; k += 1) data[i + k] = Math.round((rgb[k] * a + data[i + k] * prev * (1 - a)) / out);
  data[i + 3] = Math.round(out * 255);
}

/** A estrelinha de pixel: 1 ponto, a cruz de 3, a cruz de 5 com o miolo. */
function sparkle(data, W, shape, fx0, x, y, size, rgb) {
  const dots = size === 1 ? [[0, 0, 1]] : size === 2 ? [[0, 0, 1], [1, 0, 0.6], [-1, 0, 0.6], [0, 1, 0.6], [0, -1, 0.6]] : [[0, 0, 1], [1, 0, 0.9], [-1, 0, 0.9], [0, 1, 0.9], [0, -1, 0.9], [2, 0, 0.5], [-2, 0, 0.5], [0, 2, 0.5], [0, -2, 0.5]];
  for (const [dx, dy, a] of dots) if (shape.onFace(x + dx, y + dy)) plot(data, W, fx0 + x + dx, y + dy, rgb, a);
}

/**
 * A tira de quadros do efeito de dentro (`kind`: glint | holo | wisp), do tamanho da pedra
 * (w×h pixels). Devolve { w: w × quadros, h, data, frames, ms }.
 */
export function paintFxStrip({ kind, w, h, horizontal = false, depth = 1, mat = null }) {
  const shape = tileShape(w, h, horizontal, depth);
  const fx = mat ? TILE_FX[mat] : null;
  let frames;
  let draw;
  if (kind === 'glint') {
    // a faixa de 3 pixels em escada (x + y/2) cruza a pedra 3 pixels por quadro e descansa
    // o mesmo tempo; no descanso, a estrelinha pisca na quina de cima
    const span = w + Math.ceil(h / 2) + 8;
    const travel = Math.ceil(span / 3);
    frames = travel * 2;
    const rgb = fx?.glint ?? PLAIN_GLINT;
    const star = fx?.sparkle ?? null;
    const sx = Math.max(2, Math.round(w * 0.24));
    const sy = Math.max(2, Math.round(h * 0.1));
    const twinkle = [1, 2, 3, 3, 2, 1];
    draw = (data, W, f, x0) => {
      if (f < travel) {
        const p = f * 3 - 4;
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            if (!shape.onFace(x, y)) continue;
            // a faixa: 2 pixels de miolo forte e 1 de cada lado mais fraco
            const t = x + Math.floor(y / 2) - p;
            if (t === 1 || t === 2) plot(data, W, x0 + x, y, rgb, 0.62);
            else if (t === 0 || t === 3) plot(data, W, x0 + x, y, rgb, 0.26);
          }
        }
      } else if (star) {
        const k = f - travel - 4;
        if (k >= 0 && k < twinkle.length) sparkle(data, W, shape, x0, sx, sy, twinkle[k], star);
      }
    };
  } else if (kind === 'holo') {
    // o arco-íris em faixas de 2 pixels na diagonal, andando 1 pixel por quadro (volta certinho)
    const period = RAINBOW.length * 2;
    frames = period;
    const alpha = fx?.alpha ?? 0.3;
    const star = fx?.sparkle ?? null;
    const sx = Math.max(2, Math.round(w * 0.72));
    const sy = Math.max(2, Math.round(h * 0.78));
    const twinkle = [0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 0];
    draw = (data, W, f, x0) => {
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (!shape.onFace(x, y)) continue;
          const band = Math.floor((((x + Math.floor(y / 2) + f) % period) + period) % period / 2);
          plot(data, W, x0 + x, y, RAINBOW[band], alpha);
        }
      }
      if (star && twinkle[f]) sparkle(data, W, shape, x0, sx, sy, twinkle[f], star);
    };
  } else {
    // wisp: os fiapos do fantasma subindo 1 pixel por quadro (um a cada 16 linhas, alternando)
    const period = 16;
    frames = period;
    const rgb = [240, 228, 255];
    // o fiapo: 4 linhas de cima para baixo, de 1, 3, 1 e 1 pixels (um fio que se desfaz)
    const widths = { 0: 1, 1: 2, 2: 1, 3: 1 };
    draw = (data, W, f, x0) => {
      for (let y = 0; y < h; y += 1) {
        const row = (y + f) % period;
        const lane = Math.floor((y + f) / period) % 2;
        const cx = lane ? Math.round(w * 0.32) : Math.round(w * 0.66);
        const half = widths[row];
        if (half == null) continue;
        const sway = row === 3 ? 1 : 0;
        for (let dx = -half + 1; dx < half; dx += 1) {
          const x = cx + dx + sway;
          if (shape.onFace(x, y)) plot(data, W, x0 + x, y, rgb, row === 1 ? 0.42 : 0.26);
        }
      }
    };
  }
  const W = w * frames;
  const data = blank(W, h);
  for (let f = 0; f < frames; f += 1) draw(data, W, f, f * w);
  return { w: W, h, data, frames, ms: frames * FRAME_MS[kind] };
}

/** Os anéis de fora por quadro: [anel 1, anel 2, anel 3] de opacidade. */
function pulseFrames(pulse) {
  if (pulse === 'beat') {
    // duas batidas e a pausa (como o coração)
    return [
      [0.95, 0.6, 0.28],
      [0.7, 0.36, 0.12],
      [0.92, 0.55, 0.24],
      [0.55, 0.26, 0.06],
      [0.45, 0.18, 0],
      [0.4, 0.14, 0],
      [0.38, 0.12, 0],
      [0.38, 0.12, 0],
      [0.38, 0.12, 0],
      [0.4, 0.14, 0],
      [0.42, 0.16, 0],
      [0.45, 0.18, 0],
      [0.5, 0.22, 0.04],
      [0.6, 0.3, 0.1],
    ];
  }
  if (pulse === 'steady') return [[0.62, 0.3, 0.12]];
  const n = pulse === 'slow' ? 20 : 16;
  return Array.from({ length: n }, (_, i) => {
    const t = 0.5 - 0.5 * Math.cos((i / n) * Math.PI * 2);
    // em degraus de 0,08 (a luz sobe e desce de pixel em pixel, sem degradê)
    const q = (v) => Math.round(v / 0.08) * 0.08;
    return [q(0.38 + 0.4 * t), q(0.14 + 0.26 * t), q(0.1 * t)];
  });
}

/** A margem do halo, em pixels da pedra. */
export const HALO_M = 3;

/**
 * A tira do halo: a pedra (w×h) com HALO_M pixels de folga em volta; cada pixel de fora ganha a
 * distância (1 a 3) até a quina em degraus e acende conforme o anel dele no quadro.
 */
/** A distância (1 a HALO_M) de cada pixel de fora até a quina em degraus, na folga em volta. */
function ringMap(shape, w, h) {
  const M = HALO_M;
  const hw = w + M * 2;
  const hh = h + M * 2;
  const ring = new Int8Array(hw * hh);
  for (let y = 0; y < hh; y += 1) {
    for (let x = 0; x < hw; x += 1) {
      const tx = x - M;
      const ty = y - M;
      if (shape.inside(tx, ty)) continue;
      let best = 0;
      for (let r = 1; r <= M && !best; r += 1) {
        for (let dy = -r; dy <= r && !best; dy += 1) {
          for (let dx = -r; dx <= r; dx += 1) {
            if (Math.abs(dx) + Math.abs(dy) > r) continue;
            if (shape.inside(tx + dx, ty + dy)) {
              best = r;
              break;
            }
          }
        }
      }
      ring[y * hw + x] = best;
    }
  }
  return { ring, hw, hh };
}

/** Pinta os quadros de anéis: frames = [[a1, a2, a3], ...] na cor `rgb`. */
function paintRings(shape, w, h, frames, rgb) {
  const { ring, hw, hh } = ringMap(shape, w, h);
  const W = hw * frames.length;
  const data = blank(W, hh);
  frames.forEach((alphas, f) => {
    for (let y = 0; y < hh; y += 1) {
      for (let x = 0; x < hw; x += 1) {
        const r = ring[y * hw + x];
        const a = r ? (alphas[r - 1] ?? 0) : 0;
        if (a > 0) plot(data, W, f * hw + x, y, rgb, a);
      }
    }
  });
  return { w: W, h: hh, data, frames: frames.length };
}

/**
 * A tira do halo: a pedra (w×h) com HALO_M pixels de folga em volta; cada pixel de fora ganha a
 * distância (1 a 3) até a quina em degraus e acende conforme o anel dele no quadro.
 */
export function paintHaloStrip({ mat, w, h, horizontal = false, depth = 1 }) {
  const fx = TILE_FX[mat];
  const img = paintRings(tileShape(w, h, horizontal, depth), w, h, pulseFrames(fx.pulse), fx.halo);
  return { ...img, ms: img.frames * FRAME_MS[fx.pulse === 'steady' ? 'breath' : fx.pulse] };
}

/**
 * As molduras de seleção em pixel, seguindo a quina: a escolhida (latão cheio), a bucha
 * escolhida (piscando), a que dá para jogar (latão fraco) e a ponta aberta da mesa (pulsando).
 */
const RINGS = {
  selected: { rgb: [240, 204, 120], frames: [[1, 0.45, 0.12]], ms: 0 },
  power: { rgb: [255, 226, 122], frames: [[1, 0.6, 0.2], [1, 0.85, 0.4], [1, 0.6, 0.2], [0.85, 0.35, 0.08]], ms: 480 },
  playable: { rgb: [240, 204, 120], frames: [[0.55, 0.16, 0]], ms: 0 },
  open: { rgb: [240, 204, 120], frames: [[0.4, 0.1, 0], [0.6, 0.2, 0], [0.8, 0.32, 0.06], [1, 0.45, 0.12], [1, 0.45, 0.12], [0.8, 0.32, 0.06], [0.6, 0.2, 0], [0.4, 0.1, 0]], ms: 1600 },
};
export function paintRingStrip({ ring, w, h, horizontal = false, depth = 1 }) {
  const R = RINGS[ring];
  const img = paintRings(tileShape(w, h, horizontal, depth), w, h, R.frames, R.rgb);
  return { ...img, ms: R.ms };
}

const strips = new Map();

function toUrl(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.w;
  canvas.height = img.h;
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(img.w, img.h);
  id.data.set(img.data);
  ctx.putImageData(id, 0, 0);
  return `url(${canvas.toDataURL()})`;
}

/**
 * A tira pronta para o CSS: { url, frames, ms } (guardada por chave). `halo` pinta a de fora.
 * Fora do navegador devolve null.
 */
export function fxStrip({ kind, halo = false, ring = null, mat = null, w, h, horizontal = false, depth = 1 }) {
  const key = `${ring ? `ring-${ring}` : halo ? 'halo' : kind}|${mat}|${w}x${h}|${horizontal ? 'h' : 'v'}|${depth}`;
  if (strips.has(key)) return strips.get(key);
  let out = null;
  if (typeof document !== 'undefined') {
    try {
      const img = ring ? paintRingStrip({ ring, w, h, horizontal, depth }) : halo ? paintHaloStrip({ mat, w, h, horizontal, depth }) : paintFxStrip({ kind, mat, w, h, horizontal, depth });
      out = { url: toUrl(img), frames: img.frames, ms: img.ms };
    } catch {
      out = null;
    }
  }
  strips.set(key, out);
  return out;
}
