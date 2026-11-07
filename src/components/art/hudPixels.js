/**
 * Versão 2.9: os botões táticos da mesa deitada, em pixel art pintada por código (o desenho de
 * referência): a tábua de madeira com veio, o contorno escuro, a quina clara em cima, a sombra
 * embaixo e um prego de latão em cada ponta (COMPRAR, PASSAR VEZ), e o botão redondo do MENU:
 * um disco de madeira com aro de latão. Os textos vão por cima, em HTML.
 */
import { paintKit } from './botecoScene.js';

const { hex, rngOf, buffer, plank } = paintKit;

const INK = hex('#120904');
export const PLANK_TONES = Object.freeze({
  pinho: { hi: hex('#9a6234'), mid: hex('#6b3f1d'), lo: hex('#3e2210'), deep: hex('#1c0e05') },
  sangue: { hi: hex('#9a3a26'), mid: hex('#6a2014'), lo: hex('#3c0f08'), deep: hex('#1c0603') },
});

/** Prego de latão (3×3) com o brilho em cima à esquerda. */
function nail(b, x, y) {
  b.rect(x, y, 3, 3, hex('#5a3c10'));
  b.put(x, y, hex('#ffe08a'));
  b.put(x + 1, y, hex('#d9a83a'));
  b.put(x, y + 1, hex('#d9a83a'));
  b.put(x + 1, y + 1, hex('#b08024'));
}

/** A tábua de `w`×`h` px (com contorno e sombra de 1 px embaixo). */
export function paintPlank(w, h, { tone = 'pinho', seed = 11 } = {}) {
  const b = buffer(w, h);
  const t = PLANK_TONES[tone] ?? PLANK_TONES.pinho;
  const r = rngOf(seed);
  // corpo: duas ripas deitadas
  const inner = h - 3;
  const top = Math.ceil(inner / 2);
  plank(b, r, 1, 1, w - 2, top, { tone: t });
  plank(b, r, 1, 1 + top, w - 2, inner - top, { tone: t });
  // a junta das ripas
  for (let x = 2; x < w - 2; x += 1) b.put(x, top, t.deep, 0.75);
  // contorno, cantos chanfrados e a sombra no pé
  for (let x = 1; x < w - 1; x += 1) {
    b.put(x, 0, INK);
    b.put(x, h - 2, INK);
    b.put(x, h - 1, [0, 0, 0], 0.45);
  }
  for (let y = 1; y < h - 2; y += 1) {
    b.put(0, y, INK);
    b.put(w - 1, y, INK);
  }
  // quina clara em cima, escura embaixo
  for (let x = 2; x < w - 2; x += 1) {
    b.put(x, 1, t.hi);
    b.put(x, h - 3, t.deep);
  }
  // os pregos
  nail(b, 3, Math.round(h / 2) - 2);
  nail(b, w - 6, Math.round(h / 2) - 2);
  return b;
}

/** O botão redondo do MENU: disco de madeira, aro de latão e a sombra no pé (`d` px). */
export function paintRoundButton(d = 15) {
  const b = buffer(d, d + 1);
  const c = (d - 1) / 2;
  const t = PLANK_TONES.pinho;
  for (let y = 0; y < d + 1; y += 1) {
    for (let x = 0; x < d; x += 1) {
      const dist = Math.hypot(x - c, y - c);
      const shadow = Math.hypot(x - c, y - c - 1);
      if (dist > c + 0.5) {
        if (shadow <= c + 0.5) b.put(x, y, [0, 0, 0], 0.45);
        continue;
      }
      if (dist > c - 0.5) b.put(x, y, INK);
      else if (dist > c - 1.6) b.put(x, y, y < c ? hex('#ffe08a') : hex('#8a6014'));
      else {
        const light = (c - x) * 0.6 + (c - y);
        b.put(x, y, light > 2 ? t.hi : light < -3 ? t.lo : t.mid);
      }
    }
  }
  return b;
}
