/**
 * Versão 2.45: os emotes feitos pelo próprio personagem, com o braço e a mão dele (de frente: o
 * busto da mesa, o antebraço subindo de trás da beirada; de lado: sentado na cadeira, o braço
 * de cá erguido no lugar do antebraço na mesa). As mãos são as formas dos gestos (EmoteArt.jsx),
 * pintadas na rampa de pele dele, com o punho da roupa dele. As palmas e o "calma aí" mexem:
 * quadros que se revezam (GESTURE_FRAMES).
 */
import { board, poly, rampOf } from './figKit.js';
import { INK } from './figHead.js';
import { gridOf } from './emoteShapes.js';
import { PORTRAITS } from './portraitSpecs.js';

const HW = 18;

/** O rosto em cada gesto: [humor, boca aberta]. */
export const GESTURE_FACE = Object.freeze({
  joinha: ['smug', false],
  negativo: ['smug', false],
  dedo: ['smug', false],
  aceno: ['idle', false],
  palmas: ['smug', false],
  calma: ['idle', false],
  risada: ['blink', true],
});

/** Os gestos que mexem: a ordem dos quadros e quanto dura cada um (ms). */
export const GESTURE_FRAMES = Object.freeze({
  palmas: Object.freeze({ seq: Object.freeze([0, 1, 2, 1]), ms: 90 }),
  calma: Object.freeze({ seq: Object.freeze([0, 1, 2, 3, 2, 1]), ms: 180 }),
});
const HH = 20;

/** Carimba a mão `id` em (x, y). `flip` espelha na horizontal; `far`: a mão de trás, mais escura. */
export function stampHand(k, id, x, y, S, Sl, { flip = false, far = false } = {}) {
  const d = far ? 1 : 0;
  const pal = { s: S[4 - d], d: S[2 - d], h: S[5 - d], k: INK, c: Sl[4 - d], C: Sl[2 - d] };
  for (const r of gridOf(id)) {
    for (let i = 0; i < r.w; i += 1) {
      const gx = r.x + i;
      k.put(flip ? x + HW - 1 - gx : x + gx, y + r.y, pal[r.c]);
    }
  }
}

/** O antebraço: uma faixa de largura `w` do cotovelo `a` ao pulso `b`, na rampa `R`. */
export function forearm(k, a, b, w, R, { far = false, seed = 7 } = {}) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  const px = (-dy / n) * (w / 2);
  const py = (dx / n) * (w / 2);
  const pts = [[a[0] + px, a[1] + py], [b[0] + px * 0.85, b[1] + py * 0.85], [b[0] - px * 0.85, b[1] - py * 0.85], [a[0] - px, a[1] - py]];
  // a luz vem de cima e da esquerda: o lado de lá do braço escurece
  const tone = (x, y) => {
    const t = ((x - a[0]) * px + (y - a[1]) * py) / ((w / 2) ** 2);
    return (far ? 3.6 : 4.6) - t * 1.4;
  };
  k.form(poly(pts), tone, R, { edge: 1, rim: far ? 4 : 5, noise: 0.2, seed });
}

/** As mãos e os braços de cada gesto, DE FRENTE (quadro de 88×84). */
const FRONT = {
  joinha: [{ id: 'joinha', x: 64, y: 30, elbow: [80, 90] }],
  dedo: [{ id: 'dedo', x: 64, y: 30, elbow: [80, 90] }],
  aceno: [{ id: 'aceno', x: 66, y: 22, elbow: [84, 88] }],
  negativo: [{ id: 'negativo', x: 60, y: 36, wrist: [76, 44], elbow: [86, 88] }],
  // as palmas batendo: as mãos se afastam e se juntam (quadro `f` de 0 a 3)
  palmas: (f) => {
    const gap = [9, 5, 0, 5][f % 4];
    return [
      { id: 'aceno', x: 26 - gap, y: 50, flip: true, elbow: [30, 94] },
      { id: 'aceno', x: 44 + gap, y: 50, elbow: [58, 94] },
    ];
  },
  // calma aí: as duas mãos abertas na altura do peito, bem separadas, descendo e subindo devagar
  calma: (f) => {
    const dy = [0, 1, 3, 1][f % 4];
    return [
      { id: 'aceno', x: 10, y: 44 + dy, flip: true, elbow: [16, 94] },
      { id: 'aceno', x: 60, y: 44 + dy, elbow: [72, 94] },
    ];
  },
  risada: [{ id: 'peito', x: 40, y: 54, wrist: [57, 64], elbow: [74, 92] }],
};

/** As mãos e os braços de cada gesto, DE LADO (olhando para a direita, quadro de 120×164). */
const SIDE = {
  joinha: [{ id: 'joinha', x: 59, y: 44, flip: true, elbow: [45, 87] }],
  dedo: [{ id: 'dedo', x: 59, y: 44, elbow: [45, 87] }],
  aceno: [{ id: 'aceno', x: 60, y: 30, elbow: [45, 87] }],
  negativo: [{ id: 'negativo', x: 58, y: 52, flip: true, wrist: [60, 60], elbow: [45, 87] }],
  palmas: (f) => {
    const gap = [8, 4, 0, 4][f % 4];
    return [
      { id: 'aceno', x: 62 + gap, y: 42, far: true, elbow: [44, 82] },
      { id: 'aceno', x: 60 - Math.round(gap / 2), y: 45, elbow: [45, 87] },
    ];
  },
  calma: (f) => {
    const dy = [0, 1, 3, 1][f % 4];
    return [
      { id: 'aceno', x: 66, y: 46 + dy, far: true, elbow: [44, 82] },
      { id: 'aceno', x: 61, y: 49 + dy, elbow: [45, 87] },
    ];
  },
  risada: [{ id: 'peito', x: 47, y: 84, flip: true, wrist: [48, 92], elbow: [44, 88] }],
};

function wristOf(h) {
  if (h.wrist) return h.wrist;
  return [h.x + 8.5, h.y + HH - 1];
}

function paintHands(k, entry, S, Sl, frame = 0) {
  const list = typeof entry === 'function' ? entry(frame) : entry;
  // as de trás primeiro
  for (const h of [...list].sort((a, b) => Number(Boolean(b.far)) - Number(Boolean(a.far)))) {
    forearm(k, h.elbow, wristOf(h), 9, Sl, { far: h.far });
    stampHand(k, h.id, h.x, h.y, S, Sl, { flip: h.flip, far: h.far });
  }
}

/** Os braços erguidos por cima de uma figura de frente já pintada (`fig`: prancheta 88×84). */
export function gestureFront(fig, spec, id, frame = 0) {
  const S = rampOf(spec.skin ?? '#d8a070', 'skin');
  const o = spec.outfit ?? { color: '#5a5a5a' };
  const Sl = o.type === 'tank' ? S : rampOf(o.color ?? '#5a5a5a');
  const g = board(fig.w, fig.h);
  paintHands(g, FRONT[id] ?? FRONT.joinha, S, Sl, frame);
  g.ink(INK);
  for (let y = 0; y < fig.h; y += 1) {
    for (let x = 0; x < fig.w; x += 1) {
      const i = (y * fig.w + x) * 4;
      if (g.data[i + 3]) fig.put(x, y, [g.data[i], g.data[i + 1], g.data[i + 2]]);
    }
  }
  return fig;
}

/** O braço de cá do perfil sentado no gesto (no lugar do antebraço na mesa). */
export function gestureSide(k, id, S, Sl, frame = 0) {
  paintHands(k, SIDE[id] ?? SIDE.joinha, S, Sl, frame);
}

/** Dá para fazer o gesto com a mão dele? (quem não tem retrato, ou o busto de lado sem cadeira, não) */
export const handGesture = (art, profile, seated) => Boolean(PORTRAITS[art]) && (!profile || Boolean(seated));
