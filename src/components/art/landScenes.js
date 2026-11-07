/**
 * Versão 2.11: as peças pintadas que as cenas deitadas dividem (art/landTitle.js,
 * art/landCounter.js, art/landShop.js): o reboco verde descascado, o lambri de madeira, o chão
 * de tábuas e o engradado de cerveja.
 */
import { paintKit } from './botecoScene.js';

const { hex, mixRgb, shift, plank, drips } = paintKit;

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------

/** Reboco verde-escuro, manchado de umidade e descascado (o mesmo da sala da mesa). */
function plaster(b, r, x0, y0, x1, y1, { base = '#2c3b31', dark = '#1b2620' } = {}) {
  const A = hex(base);
  const B = hex(dark);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const n = Math.sin(x * 0.07 + Math.sin(y * 0.09) * 2) + Math.sin(y * 0.13 + x * 0.02);
      b.put(x, y, mixRgb(A, B, Math.max(0, Math.min(1, 0.5 + n * 0.22 + (r() - 0.5) * 0.12))));
    }
  }
  const spots = Math.round(((x1 - x0) * (y1 - y0)) / 1800);
  for (let i = 0; i < spots; i += 1) {
    const cx = x0 + r() * (x1 - x0);
    const cy = y0 + r() * (y1 - y0);
    b.ellipse(cx, cy, 3 + r() * 9, 2 + r() * 5, shift(A, 14), 0.45);
    b.ellipse(cx + 1, cy + 1, 2 + r() * 5, 1 + r() * 3, shift(B, -10), 0.45);
  }
  drips(b, r, x0, x1, y0, y1, [8, 10, 6], Math.round((x1 - x0) / 6));
}

/** Lambri de madeira escura (tábuas em pé), com o rodapé. */
function woodWall(b, r, x0, y0, x1, y1, tone = { hi: hex('#3a2212'), mid: hex('#25150a'), lo: hex('#120a04'), deep: hex('#080402') }) {
  for (let x = x0; x < x1; x += 14) plank(b, r, x, y0, Math.min(14, x1 - x), y1 - y0, { tone, vertical: true });
}

/** Chão de tábuas fechando para o fundo. */
function floorBoards(b, r, y0, y1, { a = '#3e2412', c = '#4a2c16', seam = '#1e1008', x0 = 0, x1 = b.w, cx = (x0 + x1) / 2, half = (x1 - x0) / 2 } = {}) {
  for (let y = y0; y < y1; y += 1) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const row = Math.floor(Math.sqrt(t) * 7);
    const base = hex(row % 2 ? c : a);
    for (let x = x0; x < x1; x += 1) {
      const u = (x - cx) / half;
      const s = Math.abs((u * (1 + t * 2.2) * 9) % 1) < 0.04;
      b.put(x, y, s ? hex(seam) : shift(base, Math.round((r() - 0.5) * 8 - (1 - t) * 14)));
    }
  }
  b.rect(x0, y0, x1 - x0, 1, hex('#6a4224'));
}

/** Um engradado de cerveja de madeira (com as garrafas aparecendo). */
function crate(b, r, x, y, w, h) {
  plank(b, r, x, y, w, h, { tone: { hi: hex('#8a5a2a'), mid: hex('#5e3a18'), lo: hex('#3a220c'), deep: hex('#1a0e04') } });
  b.rect(x, y, w, 1, hex('#a8743a'));
  b.rect(x, y + Math.floor(h / 2), w, 1, hex('#2a1608'));
  b.rect(x, y, 1, h, hex('#2a1608'));
  b.rect(x + w - 1, y, 1, h, hex('#2a1608'));
  for (let k = 3; k < w - 3; k += 5) {
    b.rect(x + k, y - 6, 3, 6, hex('#3d1d0b'));
    b.rect(x + k + 1, y - 9, 1, 3, hex('#3d1d0b'));
    b.put(x + k, y - 5, hex('#7d4419'));
  }
}

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------

/** As peças das cenas deitadas, para as outras pinturas (landTitle.js e as próximas). */
export const landKit = Object.freeze({ plaster, woodWall, floorBoards, crate });
