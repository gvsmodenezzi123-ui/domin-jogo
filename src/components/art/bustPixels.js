/**
 * Versão 2.9: o busto do rival sentado do outro lado da mesa deitada. A cabeça, o rosto, a
 * roupa e os objetos são os do retrato 64×64 de cada um (portraitPixels.js, sem a parede); o
 * busto ganha o tronco descendo até a beirada da mesa (o peito continua a roupa de cada um:
 * gravata, listras, avental) e os dois braços caídos ao lado do corpo, com o cotovelo abrindo
 * para fora, de quem está apoiado na mesa. A luz vem da lâmpada (de cima e da esquerda) e o
 * pé do busto escurece na sombra da beirada, que cobre o resto.
 *
 * `silhouette`: a figura escura com só o recorte da luz (o adversário do duelo on-line, que
 * não tem retrato).
 */
import { paintKit } from './botecoScene.js';
import { PORTRAIT_PX, paintPortrait } from './portraitPixels.js';

const { hex, buffer } = paintKit;

/** O retrato fica no meio, com 12 px de cada lado para os braços. */
const OX = 12;
export const BUST_W = PORTRAIT_PX + OX * 2;
/** O tronco desce 12 px abaixo do retrato (a beirada da mesa cobre o pé). */
export const BUST_H = PORTRAIT_PX + 12;
const G = PORTRAIT_PX;
const CX = OX + G / 2;
const INK = hex('#140c08');

const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const alphaAt = (b, x, y) => (x < 0 || y < 0 || x >= b.w || y >= b.h ? 0 : b.data[(y * b.w + x) * 4 + 3]);
const colorAt = (b, x, y) => {
  const i = (y * b.w + x) * 4;
  return [b.data[i], b.data[i + 1], b.data[i + 2]];
};

/** Cola `top` em `base` deslocado de (dx, dy). */
function paste(base, top, dx, dy) {
  for (let y = 0; y < top.h; y += 1) {
    for (let x = 0; x < top.w; x += 1) {
      const a = alphaAt(top, x, y);
      if (a) base.put(x + dx, y + dy, colorAt(top, x, y), a / 255);
    }
  }
}

/** Contorno de 1 px em volta do que está pintado na camada. */
function outline(b) {
  const marks = [];
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      if (alphaAt(b, x, y)) continue;
      if (alphaAt(b, x - 1, y) > 200 || alphaAt(b, x + 1, y) > 200 || alphaAt(b, x, y - 1) > 200 || alphaAt(b, x, y + 1) > 200) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) b.put(x, y, INK);
}

/** A cor de base da manga: o tom do ombro do retrato, perto da ponta. */
function sleeveOf(fig, side) {
  const y = 60;
  for (let i = 0; i < 26; i += 1) {
    const x = side < 0 ? 3 + i : G - 4 - i;
    if (alphaAt(fig, x, y) > 200) {
      const c = colorAt(fig, side < 0 ? x + 2 : x - 2, y);
      // pula o contorno (quase preto)
      if (c[0] + c[1] + c[2] > 60) return c;
    }
  }
  return hex('#3a4a6a');
}

/** A meia largura do ombro do retrato na linha de baixo (até onde o tronco vai). */
function shoulderHalf(fig) {
  let left = G / 2;
  while (left > 0 && alphaAt(fig, left - 1, G - 1) > 200) left -= 1;
  return G / 2 - left;
}

/** Braços: do ombro até a beirada, abrindo para fora (camada de trás, com contorno próprio). */
function paintArms(fig) {
  const arms = buffer(BUST_W, BUST_H);
  const half = shoulderHalf(fig);
  for (const side of [-1, 1]) {
    const base = sleeveOf(fig, side);
    const hi = mix(base, hex('#fff1d8'), 0.28);
    const lo = mix(base, hex('#1a0c06'), 0.3);
    const deep = mix(base, hex('#0a0604'), 0.55);
    for (let y = 55; y < BUST_H; y += 1) {
      const t = (y - 55) / (BUST_H - 55);
      // o braço sai de trás do ombro e o cotovelo abre um pouco para fora
      const inner = CX + side * (half - 4);
      const outer = CX + side * (half + 3 + t * 3);
      // a ponta de cima é redonda (o deltoide encaixa na curva do ombro)
      const cap = y < 59 ? Math.round((59 - y) * 1.3) : 0;
      const x0 = Math.min(inner, outer) + (side > 0 ? 0 : cap);
      const x1 = Math.max(inner, outer) - (side > 0 ? cap : 0);
      for (let x = Math.round(x0); x <= Math.round(x1); x += 1) {
        const u = (x - x0) / Math.max(1, x1 - x0); // 0 à esquerda .. 1 à direita
        // a lâmpada vem da esquerda: o braço esquerdo acende por fora, o direito fica na sombra
        const c = side < 0 ? (u < 0.3 ? hi : u > 0.8 ? lo : base) : u < 0.25 ? base : u > 0.7 ? deep : lo;
        arms.put(x, y, y > BUST_H - 6 ? mix(c, hex('#0a0604'), 0.25) : c);
      }
    }
  }
  outline(arms);
  return arms;
}

/** O tronco: a última linha do retrato descendo até o pé (a roupa continua), escurecendo. */
function paintTorso(fig) {
  const torso = buffer(BUST_W, BUST_H);
  for (let x = 0; x < G; x += 1) {
    if (alphaAt(fig, x, G - 1) < 200) continue;
    const c = colorAt(fig, x, G - 1);
    for (let y = G; y < BUST_H; y += 1) torso.put(x + OX, y, mix(c, hex('#0a0604'), (y - G) * 0.035));
  }
  return torso;
}

/** Só a silhueta: tudo escuro, com o recorte quente da lâmpada na borda esquerda e no alto. */
function silhouetteOf(b) {
  const out = buffer(b.w, b.h);
  const dark = hex('#0d0907');
  const rim = hex('#c99a5a');
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      const a = alphaAt(b, x, y);
      if (a < 200) continue;
      const edge = !alphaAt(b, x - 1, y) || !alphaAt(b, x, y - 1);
      const lum = (colorAt(b, x, y).reduce((s, v) => s + v, 0) / 765) * 0.12;
      out.put(x, y, edge && y < b.h - 8 ? mix(dark, rim, 0.55) : mix(dark, hex('#3a2a20'), lum));
    }
  }
  return out;
}

/**
 * O busto de `spec` no humor `mood` (os mesmos do retrato: idle, thinking, smug, hurt, blink) e
 * com a boca aberta enquanto fala (`speaking`). BUST_W×BUST_H, fundo transparente.
 */
export function paintBust(spec, mood = 'idle', speaking = false, { silhouette = false } = {}) {
  const fig = paintPortrait(spec, mood, speaking, true);
  const out = buffer(BUST_W, BUST_H);
  paste(out, paintArms(fig), 0, 0);
  paste(out, paintTorso(fig), 0, 0);
  paste(out, fig, OX, 0);
  // a beirada da mesa faz sombra no peito: o pé do busto escurece
  for (let y = G - 10; y < BUST_H; y += 1) {
    const k = ((y - (G - 10)) / (BUST_H - (G - 10))) * 0.42;
    for (let x = 0; x < BUST_W; x += 1) if (alphaAt(out, x, y)) out.put(x, y, [8, 5, 3], k);
  }
  return silhouette ? silhouetteOf(out) : out;
}
