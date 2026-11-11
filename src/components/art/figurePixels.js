/**
 * Versão 2.17: os personagens REFEITOS do zero, no nível de um retrato pintado à mão: cabeça
 * grande (o rosto ocupa 28 px de um desenho de 88×84), paleta de sete tons por material (pele,
 * cabelo, pano, metal), mechas e dobras com a luz da lâmpada vindo de cima e da esquerda, linhas
 * de separação no tom escuro do próprio material e o contorno de tinta em volta de tudo.
 *
 * A figura sai da mesma ficha de sempre (art/portraitSpecs.js): o busto da mesa é ela inteira
 * (art/bustPixels.js) e o retrato 64×64 é o recorte do meio (art/portraitPixels.js).
 *
 *   figKit.js   a prancheta: rampas, formas com tom por pixel, contorno
 *   figHead.js  o rosto: pele, olhos, nariz, boca, barba, bigode, óculos, brincos
 *   figHair.js  o cabelo (atrás e na frente) e os chapéus
 *   figBody.js  o tronco e a roupa
 */
import { ball, board, box, ell, hex, mix, poly, rampOf, tube } from './figKit.js';
import { geoOf, INK, mir, paintEarrings, paintEars, paintFace, paintFacialHair, paintGlasses, paintNeck, paintSkull } from './figHead.js';
import { paintHairBack, paintHairFront, paintHat, paintHatBack } from './figHair.js';
import { paintBody } from './figBody.js';

export const FIG_W = 88;
export const FIG_H = 84;
/** O retrato 64×64 começa 12 px para dentro da figura. */
export const FIG_OX = 12;
/** A linha dos ombros e a da boca (para sentar o busto atrás da mesa e soltar o balão da fala). */
export const FIG_SHOULDER = 60;
export const FIG_MOUTH = 46;

const EARLESS = new Set(['curly', 'bob']);

/**
 * A figura de `spec` no humor `mood` (idle, thinking, smug, hurt, blink), com a boca aberta se
 * `speaking`. Devolve a prancheta FIG_W×FIG_H (data RGBA, w, h, put), de fundo transparente.
 */
export function paintFigure(spec, mood = 'idle', speaking = false) {
  const k = board(FIG_W, FIG_H);
  const geo = geoOf(spec);
  const S = rampOf(spec.skin ?? '#d8a070', 'skin');
  const ctx = { hex, mix, rampOf, ball, tube, ell, box, poly, mir, mood, speaking, geo, S, INK };
  spec.behind?.(k, ctx);
  paintHatBack(k, spec);
  paintHairBack(k, spec);
  paintBody(k, spec, geo, S, (bottom) => paintNeck(k, S, geo, bottom));
  const hooded = spec.hat?.type === 'hood';
  const earX = hooded || EARLESS.has(spec.hair?.style) ? 44 - geo.cw - 4 : paintEars(k, S, geo);
  paintSkull(k, S, geo, spec);
  const browOf = spec.hair?.color ?? spec.facial?.color;
  paintFace(k, spec, mood, speaking, S, geo, browOf ? rampOf(browOf, 'hair')[1] : S[0]);
  paintFacialHair(k, spec, geo);
  paintHairFront(k, spec, geo);
  paintHat(k, spec, geo);
  paintGlasses(k, spec, earX);
  if (spec.earrings) paintEarrings(k, spec.earrings, earX, spec.earringColor);
  spec.front?.(k, ctx);
  if (spec.rim) {
    // a luz de trás recorta a borda de cima e da esquerda
    const rim = hex(spec.rim);
    const marks = [];
    for (let y = 0; y < FIG_H; y += 1) for (let x = 0; x < FIG_W; x += 1) if (k.has(x, y) && (!k.has(x - 1, y) || !k.has(x, y - 1))) marks.push(x, y);
    for (let i = 0; i < marks.length; i += 2) k.put(marks[i], marks[i + 1], rim, 0.55);
  }
  k.ink(INK);
  return k;
}
