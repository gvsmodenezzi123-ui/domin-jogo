/**
 * Versão 2.9: os botões táticos da mesa deitada, em pixel art pintada por código (o desenho de
 * referência): a tábua de madeira com veio, o contorno escuro, a quina clara em cima, a sombra
 * embaixo e um prego de latão em cada ponta (COMPRAR, PASSAR VEZ), e o botão redondo do MENU:
 * um disco de madeira com aro de latão. Os textos vão por cima, em HTML.
 */
import { paintKit } from './botecoScene.js';

const { hex, mixRgb, rngOf, buffer, plank } = paintKit;

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

/**
 * Versão 2.11: as teclas do menu deitado são pedras de dominó deitadas: o quadrado da esquerda
 * com os pontos, o sulco do meio com o pino de latão e o resto liso para o texto (HTML).
 *   ebony: a pedra preta de pontos de marfim (as teclas comuns)
 *   ivory: a pedra de marfim de pontos pretos (a tecla principal)
 *   blood: laca vermelha (apagar a run)
 * `h` inclui a espessura da pedra (2 px) e a sombra no pano (2 px).
 */
const KEY_TONES = {
  ebony: { top: '#3a2e25', face: '#221a14', hi: '#6a5644', lo: '#120d09', side: '#0f0b08', edge: '#060403', pip: '#f2e6c8', pipHi: '#fffaf0', pipLo: '#a8936a', groove: '#0c0806', grooveHi: '#4e4034', grain: '#4a3c30' },
  ivory: { top: '#f8f0dc', face: '#e4d7b6', hi: '#fffcf4', lo: '#bca67c', side: '#9c8660', edge: '#3e2e1a', pip: '#1e150c', pipHi: '#6a543a', pipLo: '#000000', groove: '#8e7550', grooveHi: '#fffaf0', grain: '#d2c29c' },
  blood: { top: '#7a2a1e', face: '#561a12', hi: '#b04a36', lo: '#2e0c07', side: '#220805', edge: '#0e0302', pip: '#f2e2c8', pipHi: '#fffaf0', pipLo: '#9a7a5a', groove: '#1a0503', grooveHi: '#8a3a2a', grain: '#6a2418' },
};

const KEY_PIPS = {
  0: [],
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

export function paintDominoKey(w, h, { tone = 'ebony', pips = 6, seed = 3 } = {}) {
  const b = buffer(w, h);
  const T = Object.fromEntries(Object.entries(KEY_TONES[tone] ?? KEY_TONES.ebony).map(([k, v]) => [k, hex(v)]));
  const r = rngOf(seed);
  const body = h - 2; // o corpo (tampo + espessura); as 2 de baixo são a sombra
  const face = body - 2; // o tampo
  const R = 3;
  const inside = (x, y, hh) => {
    if (x < 0 || y < 0 || x >= w || y >= hh) return false;
    const cx = x < R ? R : x > w - 1 - R ? w - 1 - R : x;
    const cy = y < R ? R : y > hh - 1 - R ? hh - 1 - R : y;
    return Math.hypot(x - cx, y - cy) <= R + 0.3;
  };
  // a sombra no pano
  for (let y = body - 2; y < h; y += 1) for (let x = 1; x < w; x += 1) if (!inside(x, y, body) && inside(x - 1, y - 2, body)) b.put(x, y, [0, 0, 0], 0.5);
  for (let y = 0; y < body; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!inside(x, y, body)) continue;
      const edge = !inside(x - 1, y, body) || !inside(x + 1, y, body) || !inside(x, y - 1, body) || !inside(x, y + 1, body);
      if (edge) {
        b.put(x, y, T.edge);
        continue;
      }
      if (y >= face) {
        b.put(x, y, y === face ? T.lo : T.side); // a espessura da pedra
        continue;
      }
      const t = y / face;
      let c = bayerMix(T.top, T.face, t, x, y);
      if (y === 1) c = T.hi;
      else if (x === 1) c = mixRgb(T.hi, T.top, 0.4);
      else if (y === face - 1 || x === w - 2) c = T.lo;
      else if (r() < (tone === 'ivory' ? 0.015 : 0.05)) c = mixRgb(c, T.grain, 0.6);
      b.put(x, y, c);
    }
  }
  // o sulco do meio e o pino de latão
  const sq = face;
  for (let y = 3; y < face - 2; y += 1) {
    b.put(sq, y, T.groove);
    b.put(sq + 1, y, T.grooveHi, 0.55);
  }
  const my = Math.round(face / 2) - 1;
  b.rect(sq - 1, my, 3, 3, hex('#7a5418'));
  b.put(sq - 1, my, hex('#ffe08a'));
  b.put(sq, my, hex('#e0b04a'));
  b.put(sq - 1, my + 1, hex('#e0b04a'));
  // os pontos
  const ps = face >= 26 ? 4 : 3;
  const c = (sq - ps) / 2;
  const off = Math.round(sq * 0.28);
  for (const [px, py] of KEY_PIPS[pips] ?? []) {
    const x = Math.round(c + (px - 1) * off);
    const y = Math.round(c + (py - 1) * off);
    for (let yy = 0; yy < ps; yy += 1) {
      for (let xx = 0; xx < ps; xx += 1) {
        const corner = ps === 4 && (xx === 0 || xx === 3) && (yy === 0 || yy === 3);
        if (corner) continue;
        b.put(x + xx, y + yy, yy === ps - 1 || xx === ps - 1 ? T.pipLo : T.pip);
      }
    }
    b.put(x + (ps === 4 ? 1 : 0), y + (ps === 4 ? 1 : 0), T.pipHi);
  }
  return b;
}

/** Degradê em pontilhado entre duas cores (`t` 0..1). */
function bayerMix(a, b2, t, x, y) {
  const steps = 4;
  const q = Math.min(steps, Math.floor(t * steps + paintKit.bayer(x, y)));
  return mixRgb(a, b2, q / steps);
}
