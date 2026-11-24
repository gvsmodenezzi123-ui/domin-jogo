// O corpo inteiro sentado de lado (olhando para a direita da tela), para qualquer personagem: a
// mesma cabeça de frente vista do lado direito dele, o tronco (largo, feminino, com barriga), a
// roupa, o braço de cá caído com a mão na coxa (ou erguido num gesto), as pernas com a calça, a
// saia ou a túnica, os sapatos e a cadeira (de madeira ou de plástico). Quadro 240×328.
import { M, acc, add, reset } from './kit.mjs';
import { faceOf, makeHead } from './head.mjs';
import { NECKS } from './body.mjs';
import { handFrame, handWorld } from './hands.mjs';
import { clamp, norm, sdCapsule, sdEllipsoid, sdPoly2, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from './sdf.mjs';
import { rampsOf } from './cast.mjs';
import { ramp } from './kit.mjs';

export const SW = 240;
export const SH = 328;
export const OX = 81;
export const OY = 1;
export const SEAT = 236;
export const FLOOR = 322;

const BELLY = { bigode: 3.5, arlindo: 3, comendador: 2.6, genesio: 3, zeca: 3, voJuca: 2.6, valdir: 2.6, tioZe: 1.6, brandao: 2, tonho: 1.6, tiao: 1, marcao: 1.6, alemao: 2.4, beto: 1, seuTiao: 1.4, neide: 1.2, odete: 0.6, cida: 1.6 };
const BARE = new Set(['tank', 'jersey']);
const ROLLED = new Set(['tioZe', 'baiano', 'zeca', 'genesio', 'bigode', 'tiao', 'valtinhoRenegado']);

/** O que vai nas pernas (como o figProfile antigo): a saia, a túnica ou a calça. */
export function lowerOf(P) {
  const o = P.outfit;
  if (o.type === 'robe') return { kind: 'robe', color: o.color };
  if (P.fem) return { kind: 'skirt', color: o.skirt ?? '#3a3444' };
  const loose = ['#3e3a36', '#2e3e5e', '#5a4e38', '#3a3a48', '#4a3424'][(P.spec.seed ?? 0) % 5];
  const pants = o.pants ?? (o.type === 'uniform' || o.type === 'suit' || o.type === 'coat' ? o.color : o.type === 'jacket' ? '#2e3e5e' : loose);
  return { kind: 'pants', color: pants };
}

export function makeSeat(P) {
  const head = makeHead(P);
  const o = P.outfit;
  const T = o.type;
  const belly = BELLY[P.key] ?? 0;
  const br = P.broad ? 1 : 0;
  const fm = P.fem ? 1 : 0;
  const low = lowerOf(P);
  const bareArm = BARE.has(T) || ROLLED.has(P.key);
  const tucked = ['shirt', 'uniform', 'jersey', 'tank'].includes(T);
  const hem = T === 'coat' ? 236 : T === 'suit' || T === 'jacket' || T === 'cardigan' || T === 'apron' ? 224 : null;
  const inner = ['suit', 'cardigan', 'jacket', 'coat', 'robe'].includes(T);

  // ------------------------------------------------------------------ o tronco
  function neckD(x, y, z) {
    const r = 14.6 + br * 1.4 - fm * 2.2;
    let d = sdCapsule(x, y, z, 88, 92, -6, 88, 124, -12.5, r);
    if (!P.fem) d = smin(d, sdEllipsoid(x, y, z, 88, 106.5, 8.4, 3.2, 4.2, 3.2), 2);
    d = smin(d, sdRoundCone(x, y, z, 72.5, 87, -7.5, 84, 121, 2.5, 4.2, 3), 4);
    d = smin(d, sdRoundCone(x, y, z, 103.5, 87, -7.5, 92, 121, 2.5, 4.2, 3), 4);
    return d;
  }
  function torsoD(x, y, z) {
    let d = sdEllipsoid(x, y, z, 88, 151, -10, 33 + br * 3 - fm * 3, 31, 24 + br * 2 - fm * 2);
    d = smin(d, sdEllipsoid(x, y, z, 88, 142, -19, 31 + br * 3 - fm * 3, 22, 14.5 + br), 8);
    if (P.fem) {
      d = smin(d, sdEllipsoid(x, y, z, 76, 141, 4.5, 11, 10, 10), 6);
      d = smin(d, sdEllipsoid(x, y, z, 100, 141, 4.5, 11, 10, 10), 6);
    } else {
      d = smin(d, sdEllipsoid(x, y, z, 74.5, 135.5, 3 + br, 14 + br * 2, 10.5, 12), 6);
      d = smin(d, sdEllipsoid(x, y, z, 101.5, 135.5, 3 + br, 14 + br * 2, 10.5, 12), 6);
    }
    d = smin(d, sdEllipsoid(x, y, z, 88, 188, 0.5 - 4 + belly * 1.6, 32 + br * 2 - fm * 4, 25, 21 + belly * 1.6), 12); // a barriga
    d = smin(d, sdEllipsoid(x, y, z, 88, 193, -14.5, 32 + br * 2 - fm * 3, 20, 15.5), 10); // o lombo
    d = smin(d, sdRoundCone(x, y, z, 80, 114, -18, 54 - br * 2.6 + fm * 3, 122.5, -13, 7, 6.5), 7);
    d = smin(d, sdRoundCone(x, y, z, 96, 114, -18, 122 + br * 2.6 - fm * 3, 122.5, -13, 7, 6.5), 7);
    return d;
  }
  function hipsD(x, y, z) {
    let d = sdEllipsoid(x, y, z, 88, 216, -16, 35 + fm * 2, 20, 26 + fm * 1.5);
    d = smin(d, sdEllipsoid(x, y, z, 72, 223, -25 - fm, 16.5 + fm, 13, 17.5 + fm * 1.5), 6);
    d = smin(d, sdEllipsoid(x, y, z, 104, 223, -25 - fm, 16.5 + fm, 13, 17.5 + fm * 1.5), 6);
    return smax(d, y - SEAT, 3);
  }
  const shX = 51 - br * 2.6 + fm * 3;
  function upperArmD(x, y, z, pose) {
    const r = 11 + br * 1.4 - fm * 1.8;
    let d = sdEllipsoid(x, y, z, shX, 129.5, -12, r + 1, r + 2.5, r + 1.5);
    const elbow = pose ? pose.elbow : [52, 177, -13];
    d = smin(d, sdRoundCone(x, y, z, shX, 131, -12, ...elbow, r, r - 2.8), 6);
    if (!pose) {
      d = smin(d, sdEllipsoid(x, y, z, shX + 0.5, 152, -6.5, r - 2, 14, 7.6), 6);
      d = smin(d, sdEllipsoid(x, y, z, shX + 0.5, 150, -20, r - 2, 15, 7.4), 6);
    }
    return d;
  }
  function forearmD(x, y, z, pose) {
    const r = 7.8 + br * 0.8 - fm * 1.4;
    if (pose) {
      let d = sdSphere(x, y, z, ...pose.elbow, r);
      d = smin(d, sdRoundCone(x, y, z, ...pose.elbow, ...pose.wrist, r, r - 3), 4);
      return d;
    }
    let d = sdSphere(x, y, z, 52.5, 179.5, -13, r);
    d = smin(d, sdSphere(x, y, z, 52.5, 182.5, -18.5, r - 3.2), 3);
    d = smin(d, sdRoundCone(x, y, z, 53, 182, -9, 61, 202.4, 30, r, r - 3), 4);
    d = smin(d, sdEllipsoid(x, y, z, 55, 184.5, 1, r + 0.4, r - 0.8, 12.5), 6);
    return d;
  }
  // a mão de cá deitada na coxa (a mesma do Tio Zé)
  const REST = handFrame([61.5, 202.4, 30.5], [0.12, 0.3, 1], [0.18, 1, -0.12]);
  const beltY = (z) => 205 + clamp(z / 26, -1, 1) * 4.5;
  function frontZ(f, x, y) {
    let z = 60;
    while (z > -60 && f(x, y, z) > 0) z -= 0.25;
    return z;
  }
  const shirtSurf = (x, y, z) => torsoD(x, y, z) - 2.2;
  const BUTTONS = [140, 157, 174, 191].map((by) => [by, frontZ(shirtSurf, 88, by)]);
  const BUCKLE_Y = beltY(20);
  const BUCKLE_Z = frontZ(shirtSurf, 88, BUCKLE_Y) + 2.4;
  const neckline = { shirt: o.closed ? 'closed' : 'vee', uniform: 'closed', cardigan: 'cardigan', suit: 'suit', jersey: 'round', apron: 'closed', jacket: 'zip', robe: 'robe', coat: 'deep', tank: 'scoop' }[T] ?? 'vee';

  function upper(x, y, z, F, pose) {
    if (y < 84 || y > 250) return;
    // longe do corpo (atrás das costas, na frente das mãos, dos lados), nada
    const bx = Math.max(20 - x, x - 156, 0);
    const bz = Math.max(-52 - z, z - 96, 0);
    const bd = Math.hypot(bx, bz);
    if (bd > 4) {
      add(bd - 2, M.NONE);
      return;
    }
    const nk = neckD(x, y, z);
    add(nk, M.SKIN, 3);
    const tor = torsoD(x, y, z);
    const arm = upperArmD(x, y, z, pose);
    const bY = beltY(z);
    const cut = (d) => (tucked ? smax(d, y - bY - 1.2, 1) : smax(d, y - (hem ?? 230) + Math.max(0, -z - 20) * 0.1, 1.2));
    add(smax(tor, Math.max(y - 140, -z - 4), 1), M.CHEST, 3);
    // a camisa de dentro (o decote de quem usa paletó, cardigã, jaqueta e sobretudo)
    if (inner && T !== 'robe') {
      let sh = smax(tor - 1.2, y - 200, 1);
      if (neckline === 'zip') sh = smax(sh, -smax(sdEllipsoid(x, y, z, 88, 103, 0, 13, 9, 40), -z, 1), 1);
      else sh = smax(sh, -Math.max(sdPoly2(NECKS.closed, x, y), -z - 4), 1);
      add(sh, M.SHIRT);
    }
    let top = cut(tor - (inner ? 2.6 : 2.2));
    const poly = NECKS[neckline];
    if (poly) top = smax(top, -Math.max(sdPoly2(poly, x, y), -z - 2), 1);
    else if (neckline === 'round') top = smax(top, -smax(sdEllipsoid(x, y, z, 88, 103.5, 0, 13.5, 9.6, 40), -z, 1), 1);
    else if (neckline === 'scoop') top = smax(top, -smax(sdEllipsoid(x, y, z, 88, 104, 0, 15.5, 17, 40), -z, 1), 1);
    let sleeve = arm - (inner ? 2.6 : 2.2);
    if (T === 'tank') sleeve = 1e9;
    else if (bareArm && !pose) sleeve = smax(sleeve, y - 170 + (z + 8) * 0.1, 1.2);
    else if (bareArm && pose) sleeve = smax(sleeve, sdSphere(x, y, z, ...pose.elbow, 14) > 0 ? -1e9 : 1e9, 0);
    if (T === 'tank') {
      // a regata: o tronco coberto e as alças; o braço de fora
      top = smax(top, Math.abs(x - 88) - 27 - Math.max(0, y - 128) * 0.9, 1.5);
      add(top, M.TOP);
      add(arm, M.SKIN, 1.6);
    } else add(smin(top, sleeve, 1.2), M.TOP);
    if (bareArm && T !== 'tank' && !pose) {
      const cuff = sdRoundCone(x, y, z, 52.1, 165.5, -9.6, 52.4, 172, -8.6, 11.6, 11);
      add(smax(cuff, Math.max(163.5 - y, y - 173.8), 0.8), M.TOP, 0.3);
    }
    // a gola, a lapela, a gola alta
    const onTop = Math.abs(tor - (inner ? 2.6 : 2.2) - 1.2) - 1.1;
    if (T === 'shirt' || T === 'uniform' || T === 'apron') {
      const open = T === 'shirt' && !o.closed;
      const collarTop = 101.5 + clamp(z + 12, 0, 22) * 0.3;
      const band = smax(Math.abs(nk - 1.5) - 1.2, Math.max(y - collarTop - (open ? 6.5 : 9), collarTop - y), 0.6);
      add(open ? smax(band, z - 7, 0.8) : band, M.COLLAR, 0.3);
      const LEAF = open ? [[-24, 105.5], [-6, 106.5], [7.5, 109.5], [11.5, 114], [11, 130], [4, 124.5], [-6, 116], [-24, 112]] : [[-24, 106], [-6, 107.5], [7, 110], [10.5, 113], [10, 120], [3, 117.5], [-6, 114], [-24, 112]];
      add(smax(Math.max(sdPoly2(LEAF, z, y), x - 86), Math.min(onTop, Math.abs(nk - 3.2) - 1.1), 0.6), M.COLLAR, 0.3);
    }
    if (T === 'jersey') add(smax(Math.abs(sdEllipsoid(x, y, z, 88, 103.5, 0, 14.6, 10.6, 40)) - 1.6, onTop, 0.4), M.COLLAR, 0.3);
    if (T === 'suit' || T === 'coat') {
      const lapel = smax(Math.max(sdPoly2(T === 'coat' ? [[-16, 104], [6, 104], [14, 126], [16, 156], [10, 156], [6, 128]] : [[-16, 104], [6, 104], [14, 124], [15, 148], [9, 148], [5, 126]], z, y), x - 86), Math.abs(tor - 2.6 - 1.4) - 1.3, 0.5);
      add(lapel, o.accent && T === 'suit' ? M.TOPB : M.TOP, 0.3);
      if (T === 'coat') add(smax(Math.abs(nk - 3.2) - 1.6, Math.max(y - 116, 98 - y + Math.max(0, z + 4) * 0.5, z - 4), 0.8), M.TOP, 0.5);
    }
    if (T === 'jacket') add(smax(Math.abs(nk - 2.8) - 1.6, Math.max(y - 113, 101 - y, z - 6), 0.8), M.TOPB, 0.5);
    if (T === 'robe') add(smax(smax(Math.abs(sdPoly2(NECKS.robe, x, y)) - 1.6, Math.abs(tor - 2.2 - 0.8) - 1.2, 0.4), -z - 4, 0.5), M.TOPB, 0.3);
    if (T === 'apron') {
      let ap = smax(Math.abs(tor - 2.2 - 1.5) - 1.1, Math.max(Math.abs(x - 88) - 17, 116 - y, y - 230), 0.6);
      add(smax(ap, -z, 0.5), M.APRON, 0.4);
    }
    if (o.tie) {
      add(sdRoundCone(x, y, z, 88, 111, 11, 88, 113, 11.6, 2.4, 2.2), M.TIE, 0.4);
      add(smax(sdPoly2([[86, 113], [90, 113], [92, 140], [88, 145], [84, 140]], x, y), Math.abs(tor - 1.2 - 1.6) - 0.9, 0.4), M.TIE, 0.3);
    }
    if (o.bow) {
      add(sdSphere(x, y, z, 88, 111, 12.2, 1.8), M.TIE);
      add(sdEllipsoid(x, y, z, 83.6, 111, 11.2, 3.6, 2.6, 1.6), M.TIE, 0.6);
    }
    if ((T === 'shirt' && o.closed) || T === 'uniform' || T === 'shirt') for (const [by, bz] of BUTTONS) add(sdEllipsoid(x, y, z, 88, by, bz + 0.6, 1.7, 1.6, 1.1), M.BUTTON);
    if (o.chain) {
      const ax = Math.abs(x - 88);
      const cy = 112 + 16 * (1 - (ax / 15.5) ** 2);
      add(smax(smax(Math.abs(tor - 2.6) - 0.9, Math.abs(y - cy) - 1.1, 0.4), ax - 15.5, 0.4), M.GOLD, 0.3);
    }
    if (o.boa) for (let i = 0; i <= 8; i += 1) add(sdSphere(x, y, z, 70 + i * 4, 110 + Math.abs(i - 4) * 1.6, 2 - Math.abs(i - 4) * 2.4, 6) + Math.sin(x * 1.3 + y * 1.7) * 0.7, M.BOA, 2.5);
    if (o.pearls) for (let i = 0; i <= 10; i += 1) {
      const a = -1 + (i / 10) * 2;
      add(sdSphere(x, y, z, 88 + a * 13.5, 106 + 9 * (1 - a * a), 9.6 - a * a * 4.5, 1.7), M.SILVER);
    }
    if (o.scarf) add(smax(Math.abs(nk - 3) - 2.6, Math.abs(y - 108) - 4.5, 1), M.SCARF, 1);
    // a cinta (de quem enfia a camisa na calça) e a fivela
    if (tucked) {
      add(smax(Math.abs(tor - 2.2 - 1.3) - 1.5, Math.abs(y - bY) - 3.1, 0.6), M.BELT);
      add(sdRoundBox(x, y, z, 88, BUCKLE_Y, BUCKLE_Z, 4.6, 3.9, 1.5, 0.8), M.BUCKLE);
    }
    // o antebraço e a mão
    const fa = forearmD(x, y, z, pose);
    if (bareArm || !pose) {
      if (!bareArm && !pose) {
        // a manga comprida até o pulso, com o punho
        add(smax(fa - 1.8, -sdSphere(x, y, z, 61, 202.4, 30, 7.4), 1), M.TOP);
        add(smax(fa - 2.2, Math.abs(sdSphere(x, y, z, 61, 202.4, 30, 9.6)) - 1.4, 0.6), M.TOPB === undefined ? M.TOP : M.TOP);
      } else add(fa, M.SKIN, 1.2);
    } else {
      const wristCut = sdSphere(x, y, z, ...pose.wrist, 7.4);
      add(smax(fa - 1.8, -wristCut, 1), M.TOP);
    }
    if (pose) for (const h of pose.hands) add(handWorld(x, y, z, h.frame, h.pose, h.k ?? 1.04, h.mirror), M.SKIN, 1.6);
    else add(handWorld(x, y, z, REST, 'relaxed', 0.86), M.SKIN, 2.2);
  }

  // ------------------------------------------------------------------ as pernas
  function thighD(x, y, z, cx) {
    let d = sdRoundCone(x, y, z, cx, 221, -14, cx + 1, 223.5, 84, 15.6 + fm * 0.6, 11.4);
    d = smin(d, sdEllipsoid(x, y, z, cx + 0.5, 213.5, 28, 13.6, 8.4, 33), 8);
    d = smin(d, sdSphere(x, y, z, cx + 1, 222.5, 86, 11.6 - fm), 3);
    d = smin(d, sdEllipsoid(x, y, z, cx + 1, 220.5, 95, 6, 6.4, 4.2), 3);
    return smax(d, y - SEAT, 2.5);
  }
  function shinD(x, y, z, cx, ankleZ) {
    let d = sdRoundCone(x, y, z, cx + 1, 226, 86, cx + 1, 304, ankleZ, 10.2 - fm * 1.4, 6.4 - fm);
    d = smin(d, sdEllipsoid(x, y, z, cx + 1, 248, 77 + (ankleZ - 86) * 0.28, 10 - fm, 19, 10 - fm), 8);
    return d;
  }
  function shoeD(x, y, z, cx, ankleZ) {
    if (P.fem) {
      let d = sdRoundBox(x, y, z, cx + 1, 314, ankleZ + 10, 6.6, 4.4, 14, 4);
      d = smin(d, sdEllipsoid(x, y, z, cx + 1, 312.5, ankleZ + 21, 6.4, 4.4, 7), 3);
      return d;
    }
    const boot = P.key === 'tioZe' || P.key === 'zeca' || P.key === 'marcao' || P.key === 'valdir' || P.key === 'alemao';
    let d = boot ? sdRoundCone(x, y, z, cx + 1, 292, ankleZ, cx + 1, 309, ankleZ + 1, 8.2, 8.6) : sdRoundCone(x, y, z, cx + 1, 302, ankleZ, cx + 1, 309, ankleZ + 1, 7.4, 8);
    d = smin(d, sdRoundBox(x, y, z, cx + 1, 313.5, ankleZ + 12, 8, 5.6, 18.5, 5), 5);
    d = smin(d, sdEllipsoid(x, y, z, cx + 1, 311, ankleZ + 25, 8, 6, 8.6), 4);
    d = smin(d, sdEllipsoid(x, y, z, cx + 1, 312.5, ankleZ - 5, 7.4, 6.4, 5.6), 3);
    return d;
  }
  function soleD(x, y, z, cx, ankleZ) {
    if (P.fem) return Math.min(sdRoundBox(x, y, z, cx + 1, 319.6, ankleZ + 13, 6.8, 1.6, 15, 1), sdRoundBox(x, y, z, cx + 1, 316, ankleZ - 2, 2.2, 5.6, 2.2, 0.8));
    return Math.min(sdRoundBox(x, y, z, cx + 1, 319.8, ankleZ + 13, 8.6, 2.2, 20.6, 1.4), sdRoundBox(x, y, z, cx + 1, 318, ankleZ - 2.5, 7.8, 4, 5.8, 1.2));
  }
  function legs(x, y, z) {
    if (y < 190) return;
    const nearA = 82;
    const farA = 66;
    if (low.kind === 'robe') {
      // a túnica cai do quadril por cima das coxas até o tornozelo
      let r = hipsD(x, y, z);
      r = smin(r, thighD(x, y, z, 70), 6);
      r = smin(r, thighD(x, y, z, 106), 6);
      r = smin(r, smax(sdRoundBox(x, y, z, 88, 262, 80, 34, 40, 13, 6), y - 304 + 0, 1), 8);
      add(smax(r - 2.4, beltY(z) - 1.5 - y, 1), M.PANTS);
      add(shoeD(x, y, z, 70, nearA), M.SHOE);
      add(soleD(x, y, z, 70, nearA), M.SOLE);
      return;
    }
    let near = hipsD(x, y, z);
    near = smax(near, beltY(z) - 1.5 - y, 1);
    near = smin(near, thighD(x, y, z, 70), 6);
    const far = thighD(x, y, z, 106);
    if (low.kind === 'skirt') {
      // a saia até o joelho; as canelas de fora
      add(smax(smin(near, far, 4) - 2.4, y - 226 + Math.max(0, z - 90) * 0.4, 1), M.PANTS);
      add(shinD(x, y, z, 70, nearA), M.SKIN);
      add(shinD(x, y, z, 106, farA), M.SKIN2);
    } else {
      const nearS = Math.min(near, shinD(x, y, z, 70, nearA));
      const farS = Math.min(far, shinD(x, y, z, 106, farA));
      add(smax(nearS - 1.6, y - 302, 1.2), M.PANTS);
      add(smax(farS - 1.6, y - 302, 1.2), M.PANTSD);
      add(smax(sdRoundCone(x, y, z, 71, 292, nearA, 71, 302.5, nearA, 10.2, 10.6), Math.max(288 - y, y - 303.5), 1), M.PANTS);
      add(smax(sdRoundCone(x, y, z, 107, 292, farA, 107, 302.5, farA, 10.2, 10.6), Math.max(288 - y, y - 303.5), 1), M.PANTSD);
    }
    add(shoeD(x, y, z, 70, nearA), M.SHOE);
    add(shoeD(x, y, z, 106, farA), M.SHOED);
    add(soleD(x, y, z, 70, nearA), M.SOLE);
    add(soleD(x, y, z, 106, farA), M.SOLE);
  }

  // ------------------------------------------------------------------ a cadeira
  const YAW = -0.3;
  const CY = Math.cos(YAW);
  const SYw = Math.sin(YAW);
  function chair(x0, y, z0, kind) {
    if (y < 110) return;
    const dx = x0 - 88;
    const dz = z0 - 2;
    const x = 88 + dx * CY - dz * SYw;
    const z = 2 + dx * SYw + dz * CY;
    if (kind === 'plastico') {
      const near = (px) => (px < 88 ? M.PLASTIC : M.PLASTICD);
      add(sdRoundBox(x, y, z, 88, SEAT + 3.6, 4, 37, 3.6, 58, 4), M.PLASTIC);
      add(smax(sdRoundBox(x, y, z, 88, 168, -60, 34, 52, 2.4, 10) + Math.sin(y * 0.55) * 0.35, -sdRoundBox(x, y, z, 88, 150, -60, 20, 3, 6, 2), 1), M.PLASTIC);
      for (const px of [57, 119]) {
        add(sdRoundCone(x, y, z, px, SEAT + 6, -52, px - 4 * Math.sign(px - 88) * 0, FLOOR - 1, -64, 3.2, 3.6), near(px));
        add(sdRoundCone(x, y, z, px, SEAT + 6, 56, px, FLOOR - 1, 68, 3.2, 3.6), near(px));
      }
      return;
    }
    add(sdRoundBox(x, y, z, 88, SEAT + 4.6, 2, 36, 4.6, 59, 2.2), M.WOOD);
    for (const px of [56, 120]) {
      const mm = px < 88 ? M.WOOD : M.WOODD;
      add(sdRoundCone(x, y, z, px, FLOOR - 1, -52, px, SEAT, -53, 3.3, 3.5), mm);
      add(sdRoundCone(x, y, z, px, SEAT, -53, px, 130, -62, 3.5, 3.3), mm);
      add(sdSphere(x, y, z, px, 128.5, -62.2, 3.9), mm);
      add(sdRoundCone(x, y, z, px, FLOOR - 1, 56, px, SEAT + 6, 56, 3.3, 3.5), mm);
      add(sdCapsule(x, y, z, px, 290, -52.5, px, 290, 56, 2.1), mm);
    }
    add(sdCapsule(x, y, z, 56, 300, 56, 120, 300, 56, 2), M.WOODD);
    add(sdRoundBox(x, y, z, 88, 141, -60.8, 33, 6, 1.6, 1), M.WOOD);
    add(sdRoundBox(x, y, z, 88, 170, -57.6, 33, 3.8, 1.5, 0.9), M.WOOD);
  }

  return { head, upper, legs, chair, neckD, torsoD, low };
}

/** A configuração do motor para a camada `part` de `P` no humor `mood` (e o gesto `pose`). */
export function seatCfg(P, part, mood = 'idle', chairKind = 'madeira', pose = null) {
  const S = makeSeat(P);
  const F = faceOf(P, mood);
  if (mood === 'talk' || mood === 'hurt' || mood === 'laugh') F.open = mood === 'hurt' ? [5.4, 2.6] : mood === 'laugh' ? [5.6, 2.8] : [4.4, 1.8];
  const parts = part === 'all' ? ['upper', 'legs', 'chair'] : [part];
  const make = (list) => (x, y, z) => {
    reset();
    if (list.includes('upper')) {
      S.head.scene(x, y, z, true, F);
      S.upper(x, y, z, F, pose);
    }
    if (list.includes('legs')) S.legs(x, y, z);
    if (list.includes('chair')) S.chair(x, y, z, chairKind);
    return acc.D;
  };
  const R = rampsOf(P);
  const low = S.low;
  R[M.PANTS] = ramp(low.kind === 'skirt' || low.kind === 'robe' ? low.color : low.color, 'cloth');
  R[M.PANTSD] = ramp(low.color, 'cloth').map((c) => c.map((v) => v * 0.72));
  R[M.SKIN2] = R[M.SKIN].map((c) => c.map((v) => v * 0.8));
  R[M.SHOE] = ramp(P.fem ? '#4a1c24' : P.key === 'tioZe' ? '#683a20' : '#3a2a20', 'cloth');
  R[M.SHOED] = R[M.SHOE].map((c) => c.map((v) => v * 0.75));
  R[M.SOLE] = ramp('#2a2222', 'cloth');
  R[M.BELT] = ramp('#4a2a16', 'cloth');
  R[M.BUCKLE] = ramp('#c49c40', 'metal');
  R[M.WOOD] = ramp('#8a5028', 'cloth');
  R[M.WOODD] = ramp('#5c361c', 'cloth');
  R[M.PLASTIC] = ramp('#e9ebe4', 'cloth');
  R[M.PLASTICD] = ramp('#b4b8b0', 'cloth');
  return {
    W: SW,
    H: SH,
    scene: make(parts),
    shade: make(['upper', 'legs', 'chair']),
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
    specMats: new Set([M.SKIN, M.EYE, M.IRIS, M.HATB, M.NAIL, M.LIP, M.BUTTON, M.BUCKLE, M.SHOE, M.BELT, M.GOLD, M.GLASSF, M.TIE, M.PLASTIC]),
    ramps: R,
    edge: new Set([M.TOP, M.SHIRT, M.SKIN, M.CHEST, M.HAT, M.HAIR, M.PANTS, M.SHOE, M.WOOD, M.BEARD, M.APRON, M.PLASTIC]),
    soft: new Set([`${M.SKIN}-${M.CHEST}`, `${M.CHEST}-${M.SKIN}`, `${M.SKIN}-${M.LIP}`, `${M.SKIN}-${M.EYE}`, `${M.SKIN}-${M.BROW}`, `${M.SKIN}-${M.NAIL}`, `${M.HAT}-${M.HATB}`, `${M.SHOE}-${M.SOLE}`, `${M.SKIN}-${M.BEARD}`]),
    litEdge: (x) => x > 60,
    creaseMin: P.youth ? { [M.SKIN]: 1.4 } : undefined,
    seat: S,
    F,
  };
}
