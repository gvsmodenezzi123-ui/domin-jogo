// Os objetos que mais de uma sala usa: a cadeira de plástico de bar, o engradado de cerveja.
import { add } from '../../kit.mjs';
import { sdRoundBox, sdRoundCone, smax } from '../../sdf.mjs';
import { boxD } from '../common.mjs';

const FLOOR = 194;

/**
 * A cadeira de plástico (de bar), de frente: o assento, o encosto curvo com as duas frestas e as
 * quatro pernas abertas. (cx, cz): o meio do assento no chão; `floor`: a altura do chão.
 */
export function plasticChair(x, y, z, cx, cz, mat, floor = FLOOR, lift = 0) {
  const base = floor - lift;
  const b = boxD(x, y, z, cx - 30, base - 80, cz - 28, cx + 30, base, cz + 26);
  if (b > 1) {
    add(b, 0);
    return;
  }
  const seatY = base - 36;
  add(sdRoundBox(x, y, z, cx, seatY, cz, 24, 2.4, 22, 2), mat);
  const bend = ((x - cx) / 23) ** 2 * 3;
  let back = sdRoundBox(x, y, z - bend, cx, seatY - 22, cz - 21, 23, 18, 2, 3);
  for (const sy of [seatY - 34, seatY - 27]) back = smax(back, -sdRoundBox(x, y, z - bend, cx, sy, cz - 21, 15, 1.6, 8, 1.2), 0.5);
  add(back, mat);
  for (const [lx, lz] of [
    [cx - 21, cz - 18],
    [cx + 21, cz - 18],
    [cx - 22, cz + 19],
    [cx + 22, cz + 19],
  ])
    add(sdRoundCone(x, y, z, lx, seatY + 2, lz, lx + Math.sign(lx - cx) * 3, base, lz + Math.sign(lz - cz) * 3, 2.4, 2.2), mat);
}

/** A pilha de cadeiras de plástico encaixadas (n cadeiras, cada uma 7 px acima da de baixo). */
export function chairStack(x, y, z, cx, cz, n, mat, floor = FLOOR) {
  for (let k = n - 1; k >= 0; k -= 1) plasticChair(x, y, z, cx, cz + k * 1.2, mat, floor, k * 7);
}

/** O engradado de plástico vazado, com as garrafas (ou vazio). */
export function crate(x, y, z, cx, baseY, cz, crateMat, bottleMat = 0) {
  const w = 26;
  const h = 18;
  const dd = 20;
  let d = sdRoundBox(x, y, z, cx, baseY - h / 2, cz, w, h / 2, dd, 1.6);
  const hollow = sdRoundBox(x, y, z, cx, baseY - h / 2 - 2, cz, w - 2.4, h / 2, dd - 2.4, 1);
  d = smax(d, -hollow, 0.6);
  const win = Math.max(Math.abs((((x - cx + 100) % 10) + 10) % 10 - 5) - 3, Math.abs(y - (baseY - h / 2)) - 4.5);
  d = smax(d, -Math.max(win, -(z - (cz + dd - 3))), 0.4);
  add(d, crateMat);
  if (!bottleMat) return;
  for (let i = 0; i < 4; i += 1)
    for (let j = 0; j < 2; j += 1) {
      const bx = cx - 18 + i * 12;
      const bz = cz - 8 + j * 16;
      add(Math.min(sdRoundCone(x, y, z, bx, baseY - 4, bz, bx, baseY - 22, bz, 5, 4.6), sdRoundCone(x, y, z, bx, baseY - 22, bz, bx, baseY - 34, bz, 4.6, 1.9)), bottleMat);
    }
}
