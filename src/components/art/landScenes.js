/**
 * Versão 2.11: as cenas das telas deitadas, pintadas do zero para o palco de 1000 × 450 (500 ×
 * 225 pixels de pintura, LandStage.jsx). Cada uma é um canto do mesmo boteco à noite, na mesma
 * luz da mesa da partida: reboco verde descascando, azulejo encardido, madeira escura, lâmpada
 * pendurada. O que se toca (botões, maletas, talismãs) vem por cima, em HTML, nos lugares que a
 * pintura deixa prontos (os números de cada cena ficam junto da função dela).
 */
import { paintKit } from './botecoScene.js';

const { hex, mixRgb, shift, rngOf, bayer, buffer, plank, felt, looseTile, beerGlass, ashtray, WOOD, FELT, shelf, rainyWindow, drips, vignette, lampGlow } = paintKit;

export const LAND_W = 500;
export const LAND_H = 225;

const INK = hex('#0b0705');

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

/** A faixa de azulejo azul e creme encardido, com o friso escuro em cima. */
function tileBand(b, r, x0, y0, x1, y1, { size = 10, cream = '#a59f84', blue = '#2d5560', mix = 0.45 } = {}) {
  b.rect(x0, y0 - 2, x1 - x0, 2, hex('#101512'));
  for (let ty = y0; ty < y1; ty += size) {
    for (let tx = x0 - ((ty / size) % 2) * 3; tx < x1; tx += size) {
      const c = shift(hex(r() < mix ? cream : blue), Math.round((r() - 0.5) * 18));
      b.rect(tx, ty, size, Math.min(size, y1 - ty), hex('#141a18'));
      b.rect(tx, ty, size - 1, Math.min(size - 1, y1 - ty), c);
      b.rect(tx, ty, size - 1, 1, shift(c, 18), 0.8);
      b.rect(tx + size - 2, ty, 1, Math.min(size - 1, y1 - ty), shift(c, -14), 0.7);
      if (r() < 0.7) b.rect(tx + 1 + Math.floor(r() * 6), ty + 2 + Math.floor(r() * 5), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), shift(c, -40), 0.55);
      if (r() < 0.1) b.rect(tx + 2, ty + 2, size - 5, size - 5, hex('#3a2a1a'), 0.35);
    }
  }
  drips(b, r, x0, x1, y0, y1, [20, 14, 6], Math.round((x1 - x0) / 3));
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

/** Balcão de bar visto de frente: o tampo envernizado, as almofadas de madeira e o varão de latão. */
function barCounter(b, r, x0, x1, top, bottom, { panel = 24 } = {}) {
  // tampo
  plank(b, r, x0, top, x1 - x0, 6, { tone: { hi: hex('#9a6234'), mid: hex('#6b3f1d'), lo: hex('#3e2210'), deep: hex('#1c0e05') } });
  b.rect(x0, top, x1 - x0, 1, hex('#c88a4e'));
  b.rect(x0, top + 6, x1 - x0, 2, hex('#1a0d05'));
  // frente: almofadas
  b.rect(x0, top + 8, x1 - x0, bottom - top - 8, hex('#3a2010'));
  for (let x = x0 + 4; x < x1 - 4; x += panel) {
    const pw = Math.min(panel - 6, x1 - 4 - x);
    if (pw < 6) continue;
    const py = top + 14;
    const ph = bottom - top - 26;
    b.rect(x, py, pw, ph, hex('#4e2d15'));
    b.rect(x, py, pw, 1, hex('#1c0e05'));
    b.rect(x, py, 1, ph, hex('#1c0e05'));
    b.rect(x, py + ph - 1, pw, 1, hex('#7a4a24'));
    b.rect(x + pw - 1, py, 1, ph, hex('#7a4a24'));
    for (let k = 0; k < ph - 4; k += 3) if (r() < 0.4) b.rect(x + 2 + Math.floor(r() * (pw - 4)), py + 2 + k, 2, 1, hex('#3e2210'), 0.6);
  }
  // varão de latão para o pé
  const ry = bottom - 9;
  b.rect(x0, ry, x1 - x0, 2, hex('#c9962e'));
  b.rect(x0, ry, x1 - x0, 1, hex('#ffe08a'));
  for (let x = x0 + 18; x < x1; x += 60) b.rect(x, ry - 1, 2, 5, hex('#7a5a14'));
  b.rect(x0, bottom - 4, x1 - x0, 4, hex('#140a04'));
}

/** Banqueta alta com assento de courvim vermelho. */
function stool(b, x, seatY, floorY) {
  b.ellipse(x, seatY, 11, 4, hex('#5a1410'));
  b.ellipse(x, seatY - 1, 10, 3, hex('#8a2418'));
  b.ellipse(x - 3, seatY - 2, 4, 1.2, hex('#c0503a'), 0.8);
  b.rect(x - 1, seatY + 3, 3, floorY - seatY - 3, hex('#3a3a3a'));
  b.rect(x - 1, seatY + 3, 1, floorY - seatY - 3, hex('#8a8a8a'));
  b.rect(x - 9, floorY - 10, 19, 2, hex('#5a5a5a'));
  b.ellipse(x, floorY - 1, 9, 2, hex('#2a2a2a'));
}

/** Uma moldura de quadro na parede (foto velha, desbotada). */
function frame(b, r, x, y, w, h, { tone = '#b88a4a', photo = ['#3a3a30', '#6a6248'] } = {}) {
  b.rect(x - 2, y - 2, w + 4, h + 4, hex('#2a1608'));
  b.rect(x - 1, y - 1, w + 2, h + 2, hex(tone));
  b.rect(x - 1, y - 1, w + 2, 1, shift(hex(tone), 30));
  for (let yy = 0; yy < h; yy += 1) for (let xx = 0; xx < w; xx += 1) b.put(x + xx, y + yy, bayer(xx, yy) < yy / h ? hex(photo[0]) : hex(photo[1]));
  // a figura borrada no meio
  b.ellipse(x + w / 2, y + h * 0.42, w * 0.16, h * 0.18, hex('#2a2620'), 0.7);
  b.rect(x + w * 0.3, y + h * 0.62, w * 0.4, h * 0.38, hex('#2a2620'), 0.6);
  b.light(x, y + h - 2, w, 2, [0, 0, 0], () => 0.3);
}

/**
 * A mesa de dominó vista de frente e de cima, como a da partida: tampo de feltro em trapézio
 * com o aro de madeira, a saia e os pés. (cx, top) é o meio da beirada de lá.
 */
function tableFront(b, r, cx, top, near, farW, nearW, legBottom, tone = FELT) {
  const leftAt = (y) => cx - (farW + ((nearW - farW) * (y - top)) / (near - top)) / 2;
  const rightAt = (y) => cx + (farW + ((nearW - farW) * (y - top)) / (near - top)) / 2;
  // pés
  for (const k of [0.08, 0.92]) {
    const lx = Math.round(leftAt(near) + (rightAt(near) - leftAt(near)) * k) - 3;
    b.rect(lx, near + 6, 6, legBottom - near - 6, hex('#2b170b'));
    b.rect(lx, near + 6, 1, legBottom - near - 6, hex('#6b3f1d'));
    b.rect(lx + 5, near + 6, 1, legBottom - near - 6, hex('#120804'));
  }
  // sombra no chão
  b.ellipse(cx, legBottom - 1, nearW * 0.55, 4, [0, 0, 0], 0.45);
  // feltro
  felt(b, r, Math.floor(leftAt(near)), top, Math.ceil(rightAt(near)), near, (x, y) => x > leftAt(y) + 4 && x < rightAt(y) - 4 && y > top + 3, tone);
  // aro
  for (let y = top; y <= near; y += 1) {
    const l = Math.round(leftAt(y));
    const rr = Math.round(rightAt(y));
    for (let k = 0; k < 5; k += 1) {
      const c = k === 0 ? WOOD.lo : k === 1 ? WOOD.hi : k === 4 ? WOOD.deep : WOOD.mid;
      b.put(l + k, y, c);
      b.put(rr - k, y, k === 1 ? mixRgb(WOOD.hi, WOOD.mid, 0.5) : c);
    }
  }
  plank(b, r, Math.round(leftAt(top)), top, Math.round(rightAt(top) - leftAt(top)), 4);
  b.rect(Math.round(leftAt(top)), top, Math.round(rightAt(top) - leftAt(top)), 1, WOOD.hi);
  // a beirada de perto e a saia
  plank(b, r, Math.round(leftAt(near)) - 1, near - 2, Math.round(rightAt(near) - leftAt(near)) + 2, 4);
  b.rect(Math.round(leftAt(near)), near + 2, Math.round(rightAt(near) - leftAt(near)), 5, hex('#3a2010'));
  b.rect(Math.round(leftAt(near)), near + 2, Math.round(rightAt(near) - leftAt(near)), 1, hex('#6b3f1d'));
  b.rect(Math.round(leftAt(near)), near + 6, Math.round(rightAt(near) - leftAt(near)), 1, hex('#140a04'));
  return { leftAt, rightAt };
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

/** O facho de luz quente que desce da lâmpada (clareia por cima do que já foi pintado). */
function beam(b, cx, top, bottom, spread, amount = 0.16) {
  b.light(0, top, b.w, bottom - top, hex('#ffe2a0'), (x, y) => {
    const half = 4 + ((y - top) / (bottom - top)) * spread;
    const d = Math.abs(x - cx) / half;
    return d < 1 ? (1 - d) * amount * (1 - ((y - top) / (bottom - top)) * 0.4) : 0;
  });
}

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------

/** As peças das cenas deitadas, para as outras pinturas (landTitle.js e as próximas). */
export const landKit = Object.freeze({ plaster, tileBand, woodWall, floorBoards, barCounter, stool, frame, tableFront, crate, beam });
