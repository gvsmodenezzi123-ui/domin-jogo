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
import { BUST_H, BUST_W } from './art/bustPixels.js';

export const LAND = Object.freeze({ far: 0.39, near: 0.85, width: 0.7, maxWidthH: 1.55, tilt: 30, persp: 640 });

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

/** Lado (px) de cada metade das pedras de pé do rival: pequenas, do tamanho do busto. */
export const seatUnit = (h) => Math.max(8, Math.min(16, Math.round((h || 390) * 0.028)));

/**
 * O busto: altura (px), largura, quanto passa para baixo da beirada (`drop`, escondido atrás do
 * tampo) e a altura da boca a partir do alto da cena (`mouth`). A linha dos ombros (linha 50 de
 * 76 do desenho) fica acima da beirada: aparecem a cabeça, os ombros e o alto do peito.
 */
export function seatBust(h) {
  const H = h || 390;
  const rail = H * SEAT_RAIL;
  const bh = Math.round(H * 0.44);
  const bw = Math.round((bh * BUST_W) / BUST_H);
  const top = Math.round(rail - H * 0.07 - (bh * 50) / BUST_H);
  return { w: bw, h: bh, drop: top + bh - Math.round(rail), mouth: Math.round(top + (bh * 38) / BUST_H) };
}
