// O que todas as salas da mesa deitada dividem: a tela de referência (896 × 414 px de CSS), a
// câmera alta com a MESMA perspectiva do tampo que o jogo desenha (seatGeometry.js), o tampo em
// 3D (só para a sombra: o jogo o pinta por cima) e o abajur pendurado no alto da tela.
import { acc, add } from '../kit.mjs';
import { sdRoundBox } from '../sdf.mjs';

export const W = 896;
export const H = 414;
// A imagem sai mais larga que a tela de referência (OX px de sobra de cada lado: o jogo corta o
// meio que cabe em cada tela). As coordenadas da cena continuam as da tela de 896; a imagem, não.
export const OX = Number(process.env.ROOM_OX ?? 72);
export const WR = W + 2 * OX;

// seatGeometry.js: tombo de 28°, perspectiva de 1000 px, as beiradas em 37% e 87% da altura e a
// beirada de perto com 44% da largura (até 98% da altura)
const TILT = (28 * Math.PI) / 180;
const PERSP = 1000;
export const Y_FAR = Math.round(H * 0.37);
export const Y_NEAR = Math.round(H * 0.87);
const NEAR_W = Math.round(Math.min(W * 0.44, H * 0.98));
const DEPTH = Math.round(((Y_NEAR - Y_FAR) * PERSP) / (PERSP * Math.cos(TILT) - (Y_NEAR - Y_FAR) * Math.sin(TILT)));
/**
 * A câmera: a parede (z = 0) cai em cima da tela, 1:1; o olho fica bem alto (o horizonte em
 * CAM[1], lá em cima, fora da tela) e longe (CAM[2]). Assim o chão fica paralelo ao tampo: as
 * linhas dele fogem para o mesmo ponto que as beiradas da mesa.
 */
export const CAM = [W / 2, Y_NEAR - PERSP / Math.tan(TILT), PERSP / Math.sin(TILT)];

/** Onde cai na imagem (px, já com a sobra OX) o ponto (x, y, z) da cena. */
export const proj = (x, y, z) => {
  const k = CAM[2] / (CAM[2] - z);
  return [CAM[0] + (x - CAM[0]) * k + OX, CAM[1] + (y - CAM[1]) * k];
};
/** O ponto do plano y = `py` que cai no pixel (sx, sy) da imagem: [x, z]. */
export const planeAt = (sx, sy, py) => {
  const t = (py - CAM[1]) / (sy - CAM[1]);
  return [CAM[0] + (sx - OX - CAM[0]) * t, CAM[2] - CAM[2] * t];
};
/** A escala (px de tela por unidade) de uma coisa na profundidade z. */
export const scaleAt = (z) => CAM[2] / (CAM[2] - z);

// O tampo na cena: o retângulo deitado que esta câmera põe exatamente em cima do tampo do jogo.
// A largura de verdade escolhe a altura dele (331: um tampo alto, a 135 px do chão de 194).
const T_W = 331;
const T_U = NEAR_W / T_W;
const T_ZN = CAM[2] * (1 - 1 / T_U);
const T_ZF = T_ZN - DEPTH / T_U;
const T_Y = CAM[1] + (Y_NEAR - CAM[1]) / T_U;
const LAMP_Z = (T_ZN + T_ZF) / 2;
/** O abajur que o jogo pendura no alto da tela (y ≈ 16), em cima do meio do tampo. */
export const LAMP = [W / 2, CAM[1] + (16 - CAM[1]) * (1 - LAMP_Z / CAM[2]), LAMP_Z];
export const TABLE3D = Object.freeze({ w: T_W, y: T_Y, zNear: T_ZN, zFar: T_ZF, zMid: LAMP_Z, x0: W / 2 - T_W / 2, x1: W / 2 + T_W / 2 });

/** A distância até o tampo (com o aro e a saia, uns 12 px para baixo): só para a sombra. */
export const tableD = (x, y, z) => sdRoundBox(x, y, z, W / 2, T_Y + 6, LAMP_Z, T_W / 2, 6, (T_ZN - T_ZF) / 2, 2);

/** Os cantos de cima do tampo em 3D (lá à esq., lá à dir., perto à esq., perto à dir.). */
export const TABLE_CORNERS = [
  [W / 2 - T_W / 2, T_Y, T_ZF],
  [W / 2 + T_W / 2, T_Y, T_ZF],
  [W / 2 - T_W / 2, T_Y, T_ZN],
  [W / 2 + T_W / 2, T_Y, T_ZN],
];

/** A distância até a caixa [x0, y0, z0]–[x1, y1, z1] (0 por dentro). */
export const boxD = (x, y, z, x0, y0, z0, x1, y1, z1) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1), Math.max(z0 - z, 0, z - z1));
/** Só olha de perto o que está dentro da caixa; de longe, a distância até a caixa basta. */
export function group(x, y, z, box, fn) {
  const b = boxD(x, y, z, ...box);
  if (b > 2) add(b, 0);
  else fn(x, y, z);
}
export { acc };
