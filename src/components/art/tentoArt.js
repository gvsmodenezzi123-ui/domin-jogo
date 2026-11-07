// Versão 2.7: o tento da roda por tentos, uma tampinha de garrafa amassada (14×14).
// Vista de cima: a saia dentada (achatada embaixo à direita, onde levou a pisada), o tampo
// com o brilho de metal e a dobra do amassado. Vazia (o tento que falta), só a marca no feltro.
import { pixelCanvas } from './pixelCanvas.js';

export const TENTO_GRID = 14;

/** O mapa de caracteres da tampinha (`empty`: a vaga do tento que ainda falta). */
export function drawTento(empty = false) {
  const c = pixelCanvas(TENTO_GRID, TENTO_GRID);
  const cx = 7;
  const cy = 7;
  // a saia: os dentes em volta (um sim, um não)
  for (let a = 0; a < 24; a += 1) {
    const ang = (a / 24) * Math.PI * 2;
    const R = a % 2 ? 6.4 : 5.7;
    c.set(Math.floor(cx + Math.cos(ang) * R), Math.floor(cy + Math.sin(ang) * R), empty ? 'e' : a % 2 ? 'r' : 'd');
  }
  if (empty) {
    // a marca da tampinha que falta: um aro apagado no feltro
    c.disc(cx, cy, 5.6, 'e');
    c.disc(cx, cy, 3.4, '.');
    c.outline('k');
    return c.rows();
  }
  // o aro (a dobra da saia) e o tampo
  c.disc(cx, cy, 5.6, 'd');
  c.disc(cx, cy, 4.5, 'r');
  c.ellipse(cx - 0.9, cy - 0.9, 2.8, 2.4, 'R');
  // a pisada: o canto de baixo à direita amassado para dentro e o vinco atravessando o tampo
  c.shade('rRd', '.', (x, y) => x + y > 19);
  c.shade('r', 'd', (x, y) => x + y > 17);
  c.line(4, 9, 9, 6, 'd');
  c.line(4, 8, 9, 5, 'R');
  // o brilho do metal, em cima à esquerda
  c.set(4, 4, 'W').set(5, 4, 'w').set(4, 5, 'w');
  c.outline('k');
  return c.rows();
}

/** Paleta: tampinha vermelha de cerveja (a cheia) e a vaga apagada. */
export const TENTO_PALETTE = Object.freeze({
  k: '#1a0806',
  d: '#7a1410',
  r: '#c22c20',
  R: '#e8584a',
  W: '#fff4e0',
  w: '#ffc8b8',
  e: '#3a2a22@0.75',
});
