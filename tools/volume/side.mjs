// O Tio Zé de perfil, de corpo inteiro, sentado na cadeira (olhando para a direita da tela).
// A mesma cabeça do busto de frente, vista do lado direito dele; o corpo sentado, o braço caído
// com a mão na coxa, as pernas e a botina; a cadeira de madeira. Quadro 240×328, em camadas:
// 'chair' (a cadeira), 'legs' (a calça e as botinas) e 'upper' (da cinta para cima, com a cabeça).
import { R7 } from './r3d.mjs';
import { CIGS, M, acc, add, headScene, reset } from './model.mjs';
import { clamp, norm, sdCapsule, sdEllipsoid, sdPoly2, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from './sdf.mjs';

export const W = 240;
export const H = 328;
// tela = (z + OX, y + OY): o crânio no mesmo lugar do perfil antigo (80, 58)
export const OX = 81;
export const OY = 1;
export const SEAT = 236; // o alto do assento
export const FLOOR = 322; // o chão

// ---------------------------------------------------------------------------------------------
// O corpo (x para o lado de lá, y para baixo, z para a frente; o lado de cá é x < 88)
// ---------------------------------------------------------------------------------------------
function neckD(x, y, z) {
  // o pescoço inclinado para a frente (a cabeça um tico adiantada), o gogó e o esternocleido
  let d = sdCapsule(x, y, z, 88, 92, -6, 88, 124, -12.5, 14.6);
  d = smin(d, sdEllipsoid(x, y, z, 88, 106.5, 8.4, 3.2, 4.2, 3.2), 2);
  d = smin(d, sdRoundCone(x, y, z, 72.5, 87, -7.5, 84, 121, 2.5, 4.2, 3), 4);
  d = smin(d, sdRoundCone(x, y, z, 103.5, 87, -7.5, 92, 121, 2.5, 4.2, 3), 4);
  return d;
}
function torsoD(x, y, z) {
  // o peito (com o esterno saindo do pé do pescoço), as costas curvas, a barriga de tio e o lombo
  let d = sdEllipsoid(x, y, z, 88, 151, -10, 33, 31, 24);
  d = smin(d, sdEllipsoid(x, y, z, 88, 142, -19, 31, 22, 14.5), 8); // as costas (escápulas)
  d = smin(d, sdEllipsoid(x, y, z, 74.5, 135.5, 3, 14, 10.5, 12), 6); // peitoral
  d = smin(d, sdEllipsoid(x, y, z, 101.5, 135.5, 3, 14, 10.5, 12), 6);
  d = smin(d, sdEllipsoid(x, y, z, 88, 188, 0.5, 32, 25, 25), 12); // a barriga
  d = smin(d, sdEllipsoid(x, y, z, 88, 193, -14.5, 32, 20, 15.5), 10); // o lombo
  d = smin(d, sdRoundCone(x, y, z, 80, 114, -18, 54, 122.5, -13, 7, 6.5), 7); // trapézio
  d = smin(d, sdRoundCone(x, y, z, 96, 114, -18, 122, 122.5, -13, 7, 6.5), 7);
  return d;
}
function hipsD(x, y, z) {
  // o quadril e a bunda sentados (achatados no assento)
  let d = sdEllipsoid(x, y, z, 88, 216, -16, 35, 20, 26);
  d = smin(d, sdEllipsoid(x, y, z, 72, 223, -25, 16.5, 13, 17.5), 6);
  d = smin(d, sdEllipsoid(x, y, z, 104, 223, -25, 16.5, 13, 17.5), 6);
  return smax(d, y - SEAT, 3);
}
function thighD(x, y, z, cx) {
  // a coxa deitada no assento: grossa no quadril, afinando até o joelho; o músculo de cima
  let d = sdRoundCone(x, y, z, cx, 221, -14, cx + 1, 223.5, 84, 15.6, 11.4);
  d = smin(d, sdEllipsoid(x, y, z, cx + 0.5, 213.5, 28, 13.6, 8.4, 33), 8);
  d = smin(d, sdSphere(x, y, z, cx + 1, 222.5, 86, 11.6), 3); // o joelho
  d = smin(d, sdEllipsoid(x, y, z, cx + 1, 220.5, 95, 6, 6.4, 4.2), 3); // a patela
  return smax(d, y - SEAT, 2.5);
}
function shinD(x, y, z, cx, ankleZ) {
  // a canela (o osso na frente, reto) e a batata da perna atrás
  let d = sdRoundCone(x, y, z, cx + 1, 226, 86, cx + 1, 304, ankleZ, 10.2, 6.4);
  d = smin(d, sdEllipsoid(x, y, z, cx + 1, 248, 77 + (ankleZ - 86) * 0.28, 10, 19, 10), 8);
  return d;
}
function bootD(x, y, z, cx, ankleZ) {
  // a botina: o cano até acima do tornozelo, o pé, o bico e o calcanhar
  let d = sdRoundCone(x, y, z, cx + 1, 292, ankleZ, cx + 1, 309, ankleZ + 1, 8.2, 8.6);
  d = smin(d, sdRoundBox(x, y, z, cx + 1, 313.5, ankleZ + 12, 8, 5.6, 18.5, 5), 5);
  d = smin(d, sdEllipsoid(x, y, z, cx + 1, 311, ankleZ + 25, 8, 6, 8.6), 4); // o bico
  d = smin(d, sdEllipsoid(x, y, z, cx + 1, 312.5, ankleZ - 5, 7.4, 6.4, 5.6), 3); // o calcanhar
  return d;
}
function soleD(x, y, z, cx, ankleZ) {
  let d = sdRoundBox(x, y, z, cx + 1, 319.8, ankleZ + 13, 8.6, 2.2, 20.6, 1.4);
  d = Math.min(d, sdRoundBox(x, y, z, cx + 1, 318, ankleZ - 2.5, 7.8, 4, 5.8, 1.2)); // o salto
  return d;
}

/** O braço de cá (o direito dele): o ombro, o braço caído e o cotovelo. */
function upperArmD(x, y, z) {
  let d = sdEllipsoid(x, y, z, 51, 129.5, -12, 12, 13.5, 12.5);
  d = smin(d, sdRoundCone(x, y, z, 51, 131, -12, 52, 177, -13, 11, 8.2), 6);
  d = smin(d, sdEllipsoid(x, y, z, 51.5, 152, -6.5, 9, 14, 7.6), 6); // bíceps
  d = smin(d, sdEllipsoid(x, y, z, 51.5, 150, -20, 9, 15, 7.4), 6); // tríceps
  return d;
}
function forearmD(x, y, z) {
  let d = sdSphere(x, y, z, 52.5, 179.5, -13, 7.8); // o cotovelo
  d = smin(d, sdSphere(x, y, z, 52.5, 182.5, -18.5, 4.6), 3);
  d = smin(d, sdRoundCone(x, y, z, 53, 182, -9, 61, 202.4, 30, 7.8, 4.8), 4);
  d = smin(d, sdEllipsoid(x, y, z, 55, 184.5, 1, 8.2, 7, 12.5), 6); // o músculo do antebraço
  return d;
}
/** A mão direita deitada na coxa: as costas da mão, os dedos curvando por cima da coxa. */
const WR = [61.5, 202.6, 30.5];
const K = [
  [69.6, 202.4, 44.6],
  [65.6, 203.2, 46.6],
  [61.4, 204.8, 46.2],
  [57.6, 207.4, 44.0],
];
const P = [
  [70.2, 204.4, 53.2],
  [65.8, 205.4, 55.8],
  [61, 207.2, 54.8],
  [57, 210, 51.4],
];
const T = [
  [70.6, 208, 58.4],
  [66, 209.4, 61.4],
  [60.6, 211.4, 60.0],
  [56.6, 213.6, 55.8],
];
function handD(x, y, z) {
  let d = 1e9;
  // os ossos das costas da mão, do pulso até cada junta (juntos formam a mão)
  for (let i = 0; i < 4; i += 1) d = smin(d, sdRoundCone(x, y, z, WR[0] - 4.2 + i * 2.8, WR[1] + 0.2 - i * 0.1, WR[2], ...K[i], 3.5, 2.5), 3);
  let f = 1e9;
  const R = [2.1, 2.2, 2.1, 1.8];
  for (let i = 0; i < 4; i += 1) {
    f = Math.min(f, sdRoundCone(x, y, z, ...K[i], ...P[i], R[i], R[i] * 0.9));
    f = Math.min(f, sdRoundCone(x, y, z, ...P[i], ...T[i], R[i] * 0.9, R[i] * 0.76));
  }
  d = smin(d, f, 1.3);
  // o polegar, do lado de dentro (de lá)
  d = smin(d, sdRoundCone(x, y, z, 67, 203.5, 33, 73, 206, 40.5, 3.2, 2.4), 2);
  d = smin(d, sdRoundCone(x, y, z, 73, 206, 40.5, 75.5, 208, 46, 2.4, 2), 1);
  return d;
}

// a linha da cinta: mais baixa na frente (embaixo da barriga) e mais alta atrás
const beltY = (z) => 205 + clamp(z / 26, -1, 1) * 4.5;
// a folha da gola de cá no plano (z, y): das costas do pescoço até a ponta no peito
const LEAF = [
  [-24, 105.5],
  [-6, 106.5],
  [7.5, 109.5],
  [11.5, 114],
  [11, 130],
  [4, 124.5],
  [-6, 116],
  [-24, 112],
];
const VEE = [
  [74, 103],
  [102, 103],
  [95.5, 120],
  [88, 136],
  [80.5, 120],
];

/** Onde a superfície `f` (distância) cruza a linha (x, y) vindo da frente (z de 60 para trás). */
function frontZ(f, x, y) {
  let z = 60;
  while (z > -60 && f(x, y, z) > 0) z -= 0.25;
  let a = z;
  let b = z + 0.25;
  for (let i = 0; i < 20; i += 1) {
    const m = (a + b) / 2;
    if (f(x, y, m) > 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
}
const shirtSurf = (x, y, z) => torsoD(x, y, z) - 2.2;
const BUTTONS = [140, 157, 174, 191].map((by) => [by, frontZ(shirtSurf, 88, by)]);
const POCKET_Z = frontZ(shirtSurf, 75, 136);
const BUCKLE_Y = beltY(20);
const BUCKLE_Z = frontZ(shirtSurf, 88, BUCKLE_Y) + 2.4;
export const SPOTS = { ember: [CIGS.side.e[2] + OX, CIGS.side.e[1] + OY], hand: [K[1][2] + OX, K[1][1] + OY] };

/**
 * A cena de perfil. `parts`: quais camadas entram ('upper', 'legs', 'chair'). As sombras usam a
 * cena inteira (ver cfgFor).
 */
export function makeScene(parts) {
  const up = parts.includes('upper');
  const lg = parts.includes('legs');
  const ch = parts.includes('chair');
  return (x, y, z) => {
    reset();
    if (up) {
      headScene(x, y, z, CIGS.side, true);
      if (y > 84 && y < 222) {
        const nk = neckD(x, y, z);
        add(nk, M.SKIN, 3);
        const tor = torsoD(x, y, z);
        const arm = upperArmD(x, y, z);
        const bY = beltY(z);
        // o peito que aparece no decote (só lá em cima, na frente)
        add(smax(tor, Math.max(y - 140, -z - 4), 1), M.CHEST, 3);
        // a camisa: o tronco (enfiado na calça, cortado na cinta) e a manga (dobrada acima do
        // cotovelo), aberta em V no pescoço
        let shirtT = smax(tor - 2.2, y - bY - 1.2, 1);
        shirtT = smax(shirtT, -Math.max(sdPoly2(VEE, x, y), -z - 2), 1);
        const shirtA = smax(arm - 2.2, y - 170 + (z + 8) * 0.1, 1.2);
        add(smin(shirtT, shirtA, 1.2), M.SHIRT);
        const cuff = sdRoundCone(x, y, z, 52.1, 165.5, -9.6, 52.4, 172, -8.6, 11.6, 11);
        add(smax(cuff, Math.max(163.5 - y, y - 173.8), 0.8), M.CUFF, 0.3);
        // a gola: o colarinho em pé em volta do pescoço (alto atrás, baixo na frente, aberto) e a
        // folha dobrada por cima dele, com a ponta deitada no peito
        const collarTop = 101.5 + clamp(z + 12, 0, 22) * 0.3;
        const band = smax(Math.abs(nk - 1.5) - 1.2, Math.max(y - collarTop - 6.5, collarTop - y), 0.6);
        add(smax(band, z - 7, 0.8), M.COLLAR, 0.3);
        const onShirt = Math.abs(tor - 2.2 - 1.2) - 1.1;
        const flap = Math.max(sdPoly2(LEAF, z, y), x - 86);
        add(smax(flap, Math.min(onShirt, Math.abs(nk - 3.2) - 1.1), 0.6), M.COLLAR, 0.3);
        // os botões da carcela
        for (const [by, bz] of BUTTONS) add(sdEllipsoid(x, y, z, 88, by, bz + 0.6, 1.7, 1.6, 1.1), M.BUTTON);
        // o bolso do peito com o maço de cigarro saindo
        add(sdRoundBox(x, y, z, 75, 139, POCKET_Z + 1, 6.4, 6.4, 1.9, 1.1), M.SHIRT, 0.6);
        add(sdRoundBox(x, y, z, 75, 135.6, POCKET_Z + 1.1, 5.2, 6.4, 1.5, 0.8), M.PACK);
        // a cinta de couro e a fivela
        const ring = Math.abs(tor - 2.2 - 1.3) - 1.5;
        add(smax(ring, Math.abs(y - bY) - 3.1, 0.6), M.BELT);
        add(sdRoundBox(x, y, z, 88, BUCKLE_Y, BUCKLE_Z, 4.6, 3.9, 1.5, 0.8), M.BUCKLE);
        // o antebraço e a mão (pele)
        add(forearmD(x, y, z), M.SKIN, 1.2);
        add(handD(x, y, z), M.SKIN, 2.5);
      }
    }
    if (lg && y > 190) {
      // a calça: o quadril (por baixo da cinta) e a perna de cá; a de lá mais escura
      let near = hipsD(x, y, z);
      near = smax(near, beltY(z) - 1.5 - y, 1);
      near = smin(near, thighD(x, y, z, 70), 6);
      near = Math.min(near, shinD(x, y, z, 70, 82));
      const far = Math.min(thighD(x, y, z, 106), shinD(x, y, z, 106, 66));
      add(smax(near - 1.6, y - 302, 1.2), M.PANTS);
      add(smax(far - 1.6, y - 302, 1.2), M.PANTSD);
      // a barra da calça caída por cima do cano da botina
      add(smax(sdRoundCone(x, y, z, 71, 292, 82, 71, 302.5, 82, 10.2, 10.6), Math.max(288 - y, y - 303.5), 1), M.PANTS);
      add(smax(sdRoundCone(x, y, z, 107, 292, 66, 107, 302.5, 66, 10.2, 10.6), Math.max(288 - y, y - 303.5), 1), M.PANTSD);
      add(bootD(x, y, z, 70, 82), M.BOOT);
      add(bootD(x, y, z, 106, 66), M.BOOTD);
      add(soleD(x, y, z, 70, 82), M.SOLE);
      add(soleD(x, y, z, 106, 66), M.SOLE);
    }
    if (ch && y > 110) chairScene(x, y, z);
    return acc.D;
  };
}

// ---------------------------------------------------------------------------------------------
// A cadeira de madeira (girada um tico para os pés de lá aparecerem)
// ---------------------------------------------------------------------------------------------
const YAW = -0.3;
const CY = Math.cos(YAW);
const SY = Math.sin(YAW);
function chairScene(x0, y, z0) {
  const dx = x0 - 88;
  const dz = z0 - 2;
  const x = 88 + dx * CY - dz * SY;
  const z = 2 + dx * SY + dz * CY;
  // o assento: uma tábua grossa com a beirada arredondada
  add(sdRoundBox(x, y, z, 88, SEAT + 4.6, 2, 36, 4.6, 59, 2.2), M.WOOD);
  for (const px of [56, 120]) {
    const mm = px < 88 ? M.WOOD : M.WOODD;
    // o pé de trás sobe e vira o montante do encosto (inclinado para trás)
    add(sdRoundCone(x, y, z, px, FLOOR - 1, -52, px, SEAT, -53, 3.3, 3.5), mm);
    add(sdRoundCone(x, y, z, px, SEAT, -53, px, 130, -62, 3.5, 3.3), mm);
    add(sdSphere(x, y, z, px, 128.5, -62.2, 3.9), mm);
    add(sdRoundCone(x, y, z, px, FLOOR - 1, 56, px, SEAT + 6, 56, 3.3, 3.5), mm); // o da frente
    add(sdCapsule(x, y, z, px, 290, -52.5, px, 290, 56, 2.1), mm); // a travessa de baixo
  }
  add(sdCapsule(x, y, z, 56, 300, 56, 120, 300, 56, 2), M.WOODD);
  // as ripas do encosto
  add(sdRoundBox(x, y, z, 88, 141, -60.8, 33, 6, 1.6, 1), M.WOOD);
  add(sdRoundBox(x, y, z, 88, 170, -57.6, 33, 3.8, 1.5, 0.9), M.WOOD);
}

// ---------------------------------------------------------------------------------------------
// As cores
// ---------------------------------------------------------------------------------------------
export const RAMPS = {
  [M.SKIN]: R7('#2e1614', '#552a20', '#7c4130', '#a05a3c', '#bf774e', '#d79766', '#ecbc8c'),
  [M.LIP]: R7('#3a1618', '#5c2626', '#7e3a36', '#9c4e46', '#b66456', '#ca7e68', '#e2a088'),
  [M.EYE]: R7('#4a3c3e', '#7a6664', '#a89490', '#ccbab4', '#e2d6d0', '#f2ebe6', '#ffffff'),
  [M.HAIR]: R7('#0e0808', '#1a100c', '#281a12', '#3a2618', '#4e3420', '#644428', '#7a5634'),
  [M.STACHE]: R7('#0e0808', '#1a100c', '#2a1a12', '#3c2818', '#523620', '#6a482a', '#846038'),
  [M.BROW]: R7('#0a0606', '#140c0a', '#1e140e', '#2c1c12', '#3c2818', '#523620', '#6a482a'),
  [M.SHIRT]: R7('#121014', '#1c1a1e', '#2a2628', '#3a3534', '#4c4542', '#605650', '#776a60'),
  [M.CUFF]: R7('#141216', '#201e22', '#2e2a2c', '#3e3938', '#514a46', '#665c56', '#7e7066'),
  [M.COLLAR]: R7('#2a2624', '#3e3834', '#554c46', '#6e645a', '#887c70', '#a29486', '#bcae9e'),
  [M.HAT]: R7('#1a0e0a', '#2e1a10', '#462818', '#5e3820', '#784a2a', '#925e36', '#ae7848'),
  [M.BAND]: R7('#0c0606', '#160c0a', '#22140e', '#2e1c12', '#3c2618', '#4e3220', '#64422a'),
  [M.CIG]: R7('#6a645c', '#9a948a', '#c4beb2', '#e2ddd2', '#f2eee6', '#faf8f2', '#ffffff'),
  [M.ASH]: R7('#2a2626', '#4a4444', '#6a6262', '#8a8282', '#a8a0a0', '#c0b8b8', '#d8d0d0'),
  [M.EMBER]: R7('#6a1a0a', '#a02a0a', '#d8460e', '#ff7a1a', '#ffb040', '#ffe08a', '#fff6d0'),
  [M.NAIL]: R7('#5a3030', '#7a4440', '#9a5e56', '#b67a6c', '#cc9684', '#deb09c', '#f0cab4'),
  [M.BUTTON]: R7('#1a1614', '#2e2824', '#4a423c', '#6a6058', '#8c8278', '#b0a69a', '#d8cec0'),
  [M.PANTS]: R7('#0e121a', '#161c28', '#1f2738', '#29344a', '#34435e', '#435676', '#586c90'),
  [M.PANTSD]: R7('#0a0d13', '#11151e', '#181e2a', '#1f2738', '#29344a', '#34435e', '#435676'),
  [M.BELT]: R7('#140a06', '#22120a', '#341c10', '#482818', '#5c3620', '#74462a', '#8e5a36'),
  [M.BUCKLE]: R7('#3a2a10', '#5a4218', '#7e5e22', '#a27c2e', '#c49c40', '#dcbc62', '#f2dc96'),
  [M.BOOT]: R7('#160c08', '#26140c', '#3a2012', '#502c18', '#683a20', '#82502c', '#9e683a'),
  [M.BOOTD]: R7('#100806', '#1c0e08', '#2a160c', '#3a2012', '#502c18', '#683a20', '#82502c'),
  [M.SOLE]: R7('#0c0808', '#161010', '#201818', '#2c2222', '#3a2e2c', '#4a3c38', '#5c4c46'),
  [M.WOOD]: R7('#24140a', '#3a2010', '#542e16', '#6e3e1e', '#8a5028', '#a66634', '#c08044'),
  [M.WOODD]: R7('#180c06', '#28160c', '#3a2010', '#4c2a16', '#60361c', '#744426', '#8a5430'),
  [M.IRIS]: R7('#0a0606', '#160c0a', '#24140e', '#3a2014', '#54301c', '#6e4226', '#8a5632'),
  [M.PACK]: R7('#3a0e0c', '#5a1612', '#7e2018', '#a02c1e', '#c03e28', '#d85a3a', '#ec8a5e'),
};
RAMPS[M.CHEST] = RAMPS[M.SKIN];

const FULL = makeScene(['upper', 'legs', 'chair']);

/** A configuração do motor para a camada `part` ('upper', 'legs', 'chair' ou 'all'). */
export function cfgFor(part) {
  const parts = part === 'all' ? ['upper', 'legs', 'chair'] : [part];
  return {
    W,
    H,
    scene: makeScene(parts),
    shade: FULL,
    mat: () => acc.MAT,
    origin: (sx, sy) => [-30, sy - OY, sx - OX],
    dir: [1, 0, 0],
    maxT: 200,
    key: norm(-0.42, -0.6, 0.68),
    fill: norm(-0.55, 0.05, -0.55),
    back: norm(0.3, -0.42, -0.86),
    w: { key: 1, fill: 0.2, back: 0.5, amb: 0.12 },
    steps: [0.11, 0.23, 0.39, 0.6, 0.86],
    smooth: 1.05,
    specMats: new Set([M.SKIN, M.EYE, M.IRIS, M.BAND, M.NAIL, M.LIP, M.BUTTON, M.BUCKLE, M.BOOT, M.BELT]),
    ramps: RAMPS,
    edge: new Set([M.SHIRT, M.CUFF, M.SKIN, M.CHEST, M.HAT, M.HAIR, M.PANTS, M.BOOT, M.WOOD]),
    soft: new Set([`${M.SKIN}-${M.CHEST}`, `${M.CHEST}-${M.SKIN}`, `${M.SKIN}-${M.LIP}`, `${M.SKIN}-${M.EYE}`, `${M.SKIN}-${M.BROW}`, `${M.SKIN}-${M.NAIL}`, `${M.HAT}-${M.BAND}`, `${M.BOOT}-${M.SOLE}`, `${M.SHIRT}-${M.CUFF}`]),
    litEdge: (x) => x > 60,
  };
}
