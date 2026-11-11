/**
 * Versão 2.9: as medidas da mesa deitada, divididas entre a mesa (TableBoard) e o rival sentado
 * (RivalSeat). Como no desenho de referência: a sala inteira na tela e a mesa no meio, vista
 * de cima e de frente (a beirada de lá mais estreita), do tamanho de uma mesa de verdade perto
 * de quem está sentado nela. O rival senta atrás da beirada de lá, com o busto do tamanho de
 * uma pessoa (não de um inseto) e as pedras dele, pequenas, de pé em cima da beirada.
 *
 * far / near: onde ficam as beiradas de lá e de perto do tampo (fração da altura da cena)
 * width:      a largura da beirada de perto (fração da largura, limitada pela altura)
 * tilt/persp: o tombo do tampo (graus) e a perspectiva (px)
 */
import { BUST_H, BUST_MOUTH, BUST_RAIL, BUST_W } from './art/bustPixels.js';

// versão 2.17: a mesa mais quadrada (mais funda e um pouco mais estreita, com menos fuga): as pedras ficam maiores
export const LAND = Object.freeze({ far: 0.34, near: 0.86, width: 0.66, maxWidthH: 1.46, tilt: 28, persp: 1000 });

/** A linha da beirada de lá (fração da altura): o busto é cortado ali. */
export const SEAT_RAIL = LAND.far;

/** O tampo na tela: as beiradas (px do alto da cena) e a largura da beirada de perto. */
export function landTable(w, h) {
  return {
    yFar: Math.round(h * LAND.far),
    yNear: Math.round(h * LAND.near),
    width: Math.round(Math.min(w * LAND.width, h * LAND.maxWidthH)),
  };
}

const LAND_SIN = Math.sin((LAND.tilt * Math.PI) / 180);
const LAND_COS = Math.cos((LAND.tilt * Math.PI) / 180);
/** Quanto do tampo (px do plano, a partir da beirada de perto) fica embaixo de `screen` px da tela. */
export const landSpanFor = (screen) => Math.max(0, Math.round((screen * LAND.persp) / (LAND.persp * LAND_COS - screen * LAND_SIN)));

/**
 * Os quatro cantos do tampo na tela (px): a beirada de lá (yFar, de farL a farR, mais estreita
 * pela perspectiva) e a de perto (yNear, de nearL a nearR). `xAt(y, side)` dá a borda do tampo
 * em qualquer altura (para recortar o que fica atrás dele).
 */
export function landCorners(w, h) {
  const t = landTable(w, h);
  const depth = landSpanFor(t.yNear - t.yFar);
  const far = (t.width * LAND.persp) / (LAND.persp + depth * LAND_SIN);
  const c = { yFar: t.yFar, yNear: t.yNear, farL: (w - far) / 2, farR: (w + far) / 2, nearL: (w - t.width) / 2, nearR: (w + t.width) / 2 };
  const xAt = (y, side) => {
    const k = (y - c.yFar) / Math.max(1, c.yNear - c.yFar);
    return side < 0 ? c.farL + (c.nearL - c.farL) * k : c.farR + (c.nearR - c.farR) * k;
  };
  return { ...c, xAt };
}

/**
 * Versão 2.13: as velas do Dono da Noite, na tela (px de CSS): o meio do canto do aro de cada
 * canto do tampo (onde o castiçal crava: 7 px da pintura da mesa, de 1,5 px de CSS, da quina de
 * fora), a escala da perspectiva ali e se é de lá (`far`). Ordem: lá à esquerda, lá à direita,
 * perto à esquerda, perto à direita.
 */
export function landCandleSpots(w, h) {
  const c = landCorners(w, h);
  const tableW = c.nearR - c.nearL;
  const depth = landSpanFor(c.yNear - c.yFar);
  const inset = 7 * 1.5 + 0.75;
  const at = (side, d) => {
    const s = LAND.persp / (LAND.persp + d * LAND_SIN);
    return { x: w / 2 + side * (tableW / 2 - inset) * s, y: c.yNear - d * LAND_COS * s, s };
  };
  return [at(-1, depth - inset), at(1, depth - inset), at(-1, inset), at(1, inset)].map((p, i) => ({ ...p, i, far: i < 2 }));
}

/** Lado (px) de cada metade das pedras de pé do rival: pequenas, do tamanho do busto. */
export const seatUnit = (h) => Math.max(8, Math.min(16, Math.round((h || 390) * 0.028)));

/**
 * O busto (`size`: a altura em fração da cena; `lift`: quanto a linha dos ombros fica acima da
 * beirada, em fração da cena; na roda a cabeça desce um pouco para a plaquinha caber em cima): altura
 * (px), largura, quanto passa para baixo da beirada (`drop`, escondido atrás do
 * tampo) e a altura da boca a partir do alto da cena (`mouth`). A linha dos ombros (BUST_RAIL
 * do desenho) fica acima da beirada: aparecem a cabeça, os ombros e o alto do peito.
 */
export function seatBust(h, size = 0.36, lift = 0.035) {
  const H = h || 390;
  const rail = H * SEAT_RAIL;
  const bh = Math.round(H * size);
  const bw = Math.round((bh * BUST_W) / BUST_H);
  const top = Math.round(rail - H * lift - (bh * BUST_RAIL) / BUST_H);
  return { w: bw, h: bh, drop: top + bh - Math.round(rail), mouth: Math.round(top + (bh * BUST_MOUTH) / BUST_H) };
}

/**
 * Versão 2.9, a roda deitada: onde cada rival senta atrás da beirada de lá (fração da largura),
 * na ordem da vez a partir de você. A vez gira no sentido anti-horário: o próximo fica à sua
 * direita, depois o da frente, depois o da esquerda.
 */
export const RODA_SPOTS = Object.freeze({ 1: [0.5], 2: [0.69, 0.31], 3: [0.78, 0.5, 0.22] });
