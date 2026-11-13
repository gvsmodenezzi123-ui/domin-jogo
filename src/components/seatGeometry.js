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
import { BUST_H, BUST_MOUTH, BUST_RAIL, BUST_W, SEATED_H, SEATED_W } from './art/bustPixels.js';

// versão 2.18: a mesa QUADRADA (bem mais estreita e funda): sobra sala dos dois lados para quem senta nas laterais
export const LAND = Object.freeze({ far: 0.37, near: 0.87, width: 0.44, maxWidthH: 0.98, tilt: 28, persp: 1000 });

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

/**
 * Versão 2.18: a roda com um jogador em cada lado da mesa. Com 3 rivais, o próximo senta à sua
 * direita (de perfil, olhando para a mesa), o seguinte na sua frente e o último à sua esquerda;
 * com 2, um de cada lado; com 1, na frente.
 */
export const RODA_SIDES = Object.freeze({ 1: ['far'], 2: ['right', 'left'], 3: ['right', 'far', 'left'], 4: ['right', 'farR', 'farL', 'left'] });

/** Versão 2.33: onde senta cada um do lado de lá (fração da largura): um no meio, ou dois lado a lado. */
export const FAR_X = Object.freeze({ far: 0.5, farR: 0.6, farL: 0.4 });

/**
 * A cadeira da lateral (`side`: -1 a esquerda, 1 a direita): o meio do busto (px), a linha do pé
 * dele e o recorte que esconde atrás da beirada de lado do tampo o que passa dela.
 */
export function sideSeat(w, h, side, bust) {
  const c = landCorners(w, h);
  const y = Math.round(c.yFar + (c.yNear - c.yFar) * 0.46);
  const edge = c.xAt(c.yFar + (c.yNear - c.yFar) * 0.2, side);
  const x = Math.round(edge + side * bust.w * 0.4);
  const r = Math.round;
  const clip =
    side < 0
      ? `polygon(0 0, ${r(c.farL)}px 0, ${r(c.farL)}px ${c.yFar}px, ${r(c.nearL)}px ${c.yNear}px, 0 ${c.yNear}px)`
      : `polygon(${w}px 0, ${r(c.farR)}px 0, ${r(c.farR)}px ${c.yFar}px, ${r(c.nearR)}px ${c.yNear}px, ${w}px ${c.yNear}px)`;
  return { x, y, clip };
}

/** Onde fica a mão no quadro do corpo sentado (olhando para a direita). */
export const SEATED_HAND = Object.freeze({ x: 73, y: 85 });

/**
 * Versão 2.32: quem senta na lateral de corpo inteiro, na cadeira. O quadro (SEATED_W×SEATED_H,
 * na mesma escala do busto e com a cabeça no mesmo lugar dele), o recorte só da beirada de lado
 * (as pernas entram embaixo do tampo; desce até o pé da tela) e a fileira das pedras dele (`lane`):
 * de pé no tampo, junto da beirada de lado e seguindo a linha dela, de lá para cá, cada uma um
 * pouco maior (a perspectiva), com a mão dele no meio da fileira.
 */
export function sideFigure(w, h, side, bust, unit) {
  const c = landCorners(w, h);
  const s = sideSeat(w, h, side, bust);
  const k = bust.w / BUST_W;
  const bustLeft = s.x - bust.w / 2;
  // olhando para a esquerda o desenho é o espelho: o crânio sai da coluna 47 do busto e da 79 do corpo
  const left = Math.round(side < 0 ? bustLeft : bustLeft - (SEATED_W - BUST_W) * k);
  const top = s.y - bust.h;
  const r = Math.round;
  const clip =
    side < 0
      ? `polygon(0 0, ${r(c.farL)}px 0, ${r(c.farL)}px ${c.yFar}px, ${r(c.xAt(h, -1))}px ${h}px, 0 ${h}px)`
      : `polygon(${w}px 0, ${r(c.farR)}px 0, ${r(c.farR)}px ${c.yFar}px, ${r(c.xAt(h, 1))}px ${h}px, ${w}px ${h}px)`;
  const handX = left + (side < 0 ? SEATED_HAND.x : SEATED_W - 1 - SEATED_HAND.x) * k;
  const handY = top + SEATED_HAND.y * k;
  // a fileira começa junto da mão (a primeira pedra, a de perto, é a maior) e sobe para o lado de
  // lá em cima do aro, seguindo a linha da beirada (versão 2.32.2: sem entrar no tampo, que em
  // algumas mesas o aro é fino e as pedras iam parar no meio do jogo)
  const dy = -Math.max(5, Math.round(unit * 0.8 * 10) / 10);
  const slope = (c.xAt(c.yNear, side) - c.xAt(c.yFar, side)) / (c.yNear - c.yFar);
  const y0 = handY + unit * 0.5;
  const inset = unit * 0.75;
  const x0 = c.xAt(y0, side) - side * inset;
  const dx = slope * dy;
  return {
    ...s,
    clip,
    fig: { left, top, w: r(SEATED_W * k), h: r(SEATED_H * k) },
    hand: { x: handX, y: handY },
    lane: { x: r(x0), y: r(y0), dx: r(dx * 100) / 100, dy, grow: -0.03, back: true },
  };
}
