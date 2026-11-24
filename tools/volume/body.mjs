// O corpo de frente (o busto atrás da mesa, com os braços caídos) e a roupa de cada um: camisa,
// uniforme, cardigã, terno, camisa de time, avental, jaqueta, túnica, sobretudo e regata; a gola,
// a lapela, a gravata, a corrente, as pérolas, o boá, o cachecol e o jabô.
import { M, add } from './kit.mjs';
import { handWorld } from './hands.mjs';
import { clamp, sdCapsule, sdEllipsoid, sdPoly2, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from './sdf.mjs';

export const NECKS = {
  // o decote no plano da frente (x, y)
  vee: [[73.5, 103], [102.5, 103], [95.5, 120], [88, 133], [80.5, 120]],
  closed: [[84, 103], [92, 103], [88, 108.5]],
  suit: [[71, 102], [105, 102], [97.5, 126], [88, 148], [78.5, 126]],
  deep: [[71, 102], [105, 102], [96, 130], [88, 156], [80, 130]],
  cardigan: [[72, 102], [104, 102], [95, 126], [88, 142], [81, 126]],
  robe: [[72, 102], [104, 102], [92, 128], [88, 140], [84, 128]],
  zip: [[78, 102], [98, 102], [92, 112], [88, 122], [84, 112]],
};

/** Os parâmetros do corpo: largura, peito, pescoço; `fem` com busto. */
export function bodyGeo(P) {
  const k = P.broad ? 1 : 0;
  const f = P.fem ? 1 : 0;
  return {
    shX: 45 - 2.6 * k + 3 * f, // o meio do deltoide (lado de cá)
    shR: 12.6 + 1.6 * k - 1.6 * f,
    armR: 11.6 + 1.6 * k - 1.8 * f,
    torW: 38.5 + 3.5 * k - 4 * f,
    neckR: 15.8 + 1.6 * k - 2.4 * f,
    trapY: 121 - 1 * k + 1.5 * f,
  };
}

export const ROLLED = new Set(['tioZe', 'baiano', 'zeca', 'genesio', 'bigode', 'tiao', 'valtinhoRenegado']);

/** `poses`: { [-1 | 1]: { elbow, wrist, hand: { frame, pose, k, mirror } } } (o braço erguido). */
export function makeFrontBody(P, poses = {}) {
  const G = bodyGeo(P);
  const o = P.outfit;
  const T = o.type;
  function neckD(x, y, z) {
    let d = sdCapsule(x, y, z, 88, 96, -5, 88, 126, -8, G.neckR);
    d = smin(d, sdRoundCone(x, y, z, 71, 89, -3, 84.5, 119, 6.5, 3.8, 2.8), 4);
    d = smin(d, sdRoundCone(x, y, z, 105, 89, -3, 91.5, 119, 6.5, 3.8, 2.8), 4);
    if (!P.fem) d = smin(d, sdEllipsoid(x, y, z, 88, 106.5, 9.6, 3.2, 4.4, 3), 2);
    return d;
  }
  function torsoD(x, y, z) {
    let d = sdEllipsoid(x, y, z, 88, 160, -12, G.torW, 46, 25);
    if (P.fem) {
      d = smin(d, sdEllipsoid(x, y, z, 76, 141, 3, 11.5, 10.5, 10.5), 6);
      d = smin(d, sdEllipsoid(x, y, z, 100, 141, 3, 11.5, 10.5, 10.5), 6);
    } else {
      d = smin(d, sdEllipsoid(x, y, z, 73, 136.5, 2, 15.5 + (P.broad ? 2 : 0), 11.5, 10.5), 7);
      d = smin(d, sdEllipsoid(x, y, z, 103, 136.5, 2, 15.5 + (P.broad ? 2 : 0), 11.5, 10.5), 7);
    }
    d = smin(d, sdRoundCone(x, y, z, 79, 104, -10, G.shX + 5, G.trapY, -8, 9, 7), 8);
    d = smin(d, sdRoundCone(x, y, z, 97, 104, -10, 176 - G.shX - 5, G.trapY, -8, 9, 7), 8);
    return d;
  }
  function armsD(x, y, z) {
    // s = 1: o braço à direita da tela; s = −1: à esquerda (o mesmo lado dos gestos e dos objetos)
    const arm = (s) => {
      const X = (v) => 88 - s * (v - 88);
      let d = sdEllipsoid(x, y, z, X(G.shX), 131, -5.5, G.shR, G.shR + 1.6, G.shR);
      const pose = poses[s];
      if (pose) d = smin(d, sdRoundCone(x, y, z, X(G.shX - 0.6), 133, -5.5, ...pose.elbow, G.armR, G.armR - 2.4), 6);
      else d = smin(d, sdRoundCone(x, y, z, X(G.shX - 0.6), 133, -5.5, X(G.shX - 1.6), 200, -2.5, G.armR, G.armR - 2), 6);
      return d;
    };
    return Math.min(arm(1), arm(-1));
  }
  function clavD(x, y, z) {
    return Math.min(sdCapsule(x, y, z, 86, 117, 8.6, 62, 119.5, 3, 2.1), sdCapsule(x, y, z, 90, 117, 8.6, 114, 119.5, 3, 2.1));
  }

  // o que cada roupa tem
  const neckline = { shirt: o.closed ? 'closed' : 'vee', uniform: 'closed', cardigan: 'cardigan', suit: 'suit', jersey: 'round', apron: 'closed', jacket: 'zip', robe: 'robe', coat: 'deep', tank: 'scoop' }[T] ?? 'vee';
  const inner = ['suit', 'cardigan', 'jacket', 'coat', 'robe'].includes(T); // há uma camisa por baixo
  const innerNeck = T === 'robe' ? null : T === 'cardigan' && o.jabot ? 'jabot' : T === 'cardigan' ? 'closed' : T === 'jacket' ? 'round' : 'closed';

  function scene(x, y, z) {
    if (y < 86) {
      forearms(x, y, z);
      return;
    }
    // longe do tronco (de lado ou na frente/atrás), só os braços erguidos contam
    const bx = Math.max(16 - x, x - 160, 0);
    const bz = Math.max(-44 - z, z - 40, 0);
    const bd = Math.hypot(bx, bz);
    if (bd > 4) {
      add(bd - 2, M.NONE);
      forearms(x, y, z);
      return;
    }
    const nk = neckD(x, y, z);
    add(nk, M.SKIN, 3);
    const tor = smin(torsoD(x, y, z), clavD(x, y, z), 2.2);
    add(tor, M.CHEST, 3);
    const arms = armsD(x, y, z);
    const body = smin(tor, arms, 1.6);
    const ax = Math.abs(x - 88);
    // a regata: o tronco coberto, os braços e os ombros de fora
    if (T === 'tank') {
      add(arms, M.SKIN, 1.6);
      let top = tor - 1.4;
      // a cava funda e o decote redondo
      top = smax(top, -smax(sdEllipsoid(x, y, z, 88, 104, 0, 15.5, 17, 40), -z, 1), 1);
      top = smax(top, ax - 27 - Math.max(0, y - 128) * 0.9, 1.5);
      add(top, M.TOP);
      // as alças
      for (const s of [-1, 1]) add(smax(Math.abs(tor - 1.6) - 0.9, Math.abs(x - 88 - s * 18 + (y - 110) * s * 0.12) - 3.4, 0.6), M.TOP, 0.4);
      accessories(x, y, z, tor, nk);
      forearms(x, y, z);
      return;
    }
    // a camisa de dentro (aparece no decote do terno, do cardigã, da jaqueta e do sobretudo)
    if (inner) {
      let sh = body - 1.2;
      if (innerNeck === 'round') sh = smax(sh, -smax(sdEllipsoid(x, y, z, 88, 103, 0, 13, 9, 40), -z, 1), 1);
      else if (innerNeck === 'closed' || innerNeck === 'jabot') sh = smax(sh, -Math.max(sdPoly2(NECKS.closed, x, y), -z - 4), 1);
      add(sh, M.SHIRT);
      if (innerNeck === 'closed') {
        // a golinha da camisa de dentro
        const stand = smax(Math.abs(nk - 1.4) - 1.1, Math.max(y - 110 + Math.max(0, z) * 0.2, 101.5 - y), 0.6);
        add(stand, M.SHIRT, 0.3);
      }
    }
    // a roupa de cima
    let top = body - (inner ? 2.6 : 2.1);
    const poly = NECKS[neckline];
    if (poly) top = smax(top, -Math.max(sdPoly2(poly, x, y), -z - 4), 1);
    else if (neckline === 'round') top = smax(top, -smax(sdEllipsoid(x, y, z, 88, 103.5, 0, 13.5, 9.6, 40), -z, 1), 1);
    add(top, M.TOP);
    // as golas e lapelas
    const onTop = Math.abs(body - (inner ? 2.6 : 2.1) - 1.15) - 1.05;
    if (T === 'shirt' || T === 'uniform' || T === 'apron') {
      const L = T === 'shirt' && !o.closed ? [[71, 100.5], [55, 112.5], [79.5, 128.5], [77.5, 110]] : [[77, 101], [63, 110.5], [85.5, 119.5], [87.6, 110.5]];
      const leaves = Math.min(sdPoly2(L, x, y), sdPoly2(L.map(([a, b]) => [176 - a, b]), x, y));
      add(smax(leaves, onTop, 0.5), M.COLLAR, 0.3);
      const open = T === 'shirt' && !o.closed;
      const stand = smax(Math.abs(nk - 1.4) - 1.1, Math.max(y - (open ? 109.5 : 112) + Math.max(0, z) * (open ? 0.2 : 0.05), 101 - y), 0.6);
      add(open ? smax(stand, z - 5.5, 0.8) : stand, M.COLLAR, 0.3);
    }
    if (T === 'jersey') {
      const ring = smax(Math.abs(sdEllipsoid(x, y, z, 88, 103.5, 0, 14.6, 10.6, 40)) - 1.6, onTop, 0.4);
      add(ring, M.COLLAR, 0.3);
    }
    if (T === 'suit' || T === 'coat') {
      // as lapelas: faixas ao longo do V, por cima do paletó, com o entalhe
      const P2 = T === 'coat' ? NECKS.deep : NECKS.suit;
      const lap = (s) => {
        const X = (v) => 88 + s * (v - 88);
        const pts = T === 'coat' ? [[X(71), 102], [X(60), 116], [X(69), 128], [X(80), 156], [X(87), 156], [X(80), 130]] : [[X(71), 102], [X(61), 115], [X(68.5), 122], [X(81), 148], [X(87.5), 148], [X(78.5), 126]];
        return sdPoly2(pts.map(([a, b]) => [a, b]), x, y);
      };
      const laps = Math.min(lap(-1), lap(1));
      add(smax(laps, Math.abs(body - 2.6 - 1.4) - 1.3, 0.5), o.accent && T === 'suit' ? M.TOPB : M.TOP, 0.3);
      if (T === 'coat') {
        // a gola levantada atrás do pescoço
        add(smax(Math.abs(nk - 3.2) - 1.6, Math.max(y - 116, 98 - y + Math.max(0, z + 4) * 0.5, z - 4), 0.8), M.TOP, 0.5);
      }
    }
    if (T === 'jacket') {
      // a gola alta da jaqueta e o zíper
      add(smax(Math.abs(nk - 2.8) - 1.6, Math.max(y - 113, 101 - y, z - 6 - Math.max(0, y - 104) * 0.0), 0.8), M.TOPB, 0.5);
    }
    if (T === 'robe') {
      // a faixa dourada ao longo do V da túnica
      const edge = Math.abs(sdPoly2(NECKS.robe, x, y)) - 1.6;
      add(smax(smax(edge, Math.abs(body - 2.1 - 0.8) - 1.2, 0.4), -z - 4, 0.5), M.TOPB, 0.3);
    }
    if (T === 'cardigan') {
      // a barra da malha em volta do decote
      const edge = Math.abs(sdPoly2(NECKS.cardigan, x, y)) - 1.4;
      add(smax(smax(edge, Math.abs(body - 2.6 - 0.9) - 1.1, 0.4), -z - 4, 0.5), M.TOP, 0.3);
    }
    if (T === 'apron') {
      // o avental: o peitilho na frente, com a alça no pescoço
      let ap = smax(Math.abs(tor - 2.1 - 1.5) - 1.1, Math.max(ax - 17 - Math.max(0, y - 118) * 0.35, 116 - y), 0.6);
      ap = smax(ap, -z, 0.5);
      add(ap, M.APRON, 0.4);
      for (const s of [-1, 1]) add(smax(Math.abs(body - 2.1 - 1.3) - 0.9, Math.max(Math.abs(x - 88 - s * 14.5 + (y - 116) * s * 0.15) - 1.8, y - 117, 100 - y), 0.5), M.APRON, 0.3);
    }
    // a gravata e a gravata-borboleta
    if (o.tie) {
      add(sdRoundCone(x, y, z, 88, 111, 11, 88, 113, 11.6, 2.4, 2.2), M.TIE, 0.4);
      const blade = smax(sdPoly2([[86, 113], [90, 113], [92, 140], [88, 145], [84, 140]], x, y), Math.abs(tor - 1.2 - 1.6) - 0.9, 0.4);
      add(blade, M.TIE, 0.3);
    }
    if (o.bow) {
      add(sdSphere(x, y, z, 88, 111, 12.2, 1.8), M.TIE);
      add(sdEllipsoid(x, y, z, 83.6, 111, 11.2, 3.6, 2.6, 1.6), M.TIE, 0.6);
      add(sdEllipsoid(x, y, z, 92.4, 111, 11.2, 3.6, 2.6, 1.6), M.TIE, 0.6);
    }
    // os botões da carcela
    if (T === 'shirt' || T === 'uniform') add(sdEllipsoid(x, y, z, 88, o.closed || T === 'uniform' ? 117 : 134.2, 14.4, 1.7, 1.6, 1), M.BUTTON);
    accessories(x, y, z, tor, nk);
    forearms(x, y, z);
  }

  const bare = T === 'tank' || T === 'jersey' || ROLLED.has(P.key);
  function forearms(x, y, z) {
    for (const s of [-1, 1]) {
      const pose = poses[s];
      if (!pose) continue;
      const r0 = 8.2 + (P.broad ? 0.9 : 0) - (P.fem ? 1.4 : 0);
      const fa = smin(sdSphere(x, y, z, ...pose.elbow, r0 + 0.4), sdRoundCone(x, y, z, ...pose.elbow, ...pose.wrist, r0, r0 - 2.8), 3);
      if (bare) add(fa, M.SKIN, 1.2);
      else {
        const cut = -sdSphere(x, y, z, ...pose.wrist, 4.6);
        add(smax(fa - 2, cut, 1), M.TOP, 1);
        add(smax(Math.abs(sdSphere(x, y, z, ...pose.wrist, 7.6)) - 1.6, fa - 2.6, 0.6), M.TOP, 0.5);
        add(fa, M.SKIN, 0.6);
      }
      if (pose.hand) add(handWorld(x, y, z, pose.hand.frame, pose.hand.pose, pose.hand.k ?? 1.12, pose.hand.mirror), M.SKIN, 1.6);
      if (pose.extra) pose.extra(x, y, z);
    }
  }

  function accessories(x, y, z, tor, nk) {
    const ax = Math.abs(x - 88);
    if (o.chain) {
      // a corrente de ouro: um arco no peito
      const cy = 112 + 16 * (1 - (ax / 15.5) ** 2);
      const on = Math.abs(tor - 2.6) - 0.9;
      add(smax(smax(on, Math.abs(y - cy) - 1.1, 0.4), ax - 15.5, 0.4), M.GOLD, 0.3);
      if (o.medal) add(sdEllipsoid(x, y, z, 88, 131, 13.6, 3.8, 3.8, 1.2), M.GOLD);
    }
    if (o.pearls) {
      for (let i = 0; i <= 10; i += 1) {
        const a = -1 + (i / 10) * 2;
        const px = 88 + a * 13.5;
        const py = 106 + 9 * (1 - a * a);
        add(sdSphere(x, y, z, px, py, 9.6 - a * a * 4.5, 1.7), M.SILVER);
      }
    }
    if (o.boa) {
      // o boá de plumas em volta do pescoço e dos ombros
      for (let i = 0; i <= 12; i += 1) {
        const a = -1 + (i / 12) * 2;
        const px = 88 + a * 30;
        const py = 110 + 8 * (1 - a * a) + Math.abs(a) * 4;
        add(sdSphere(x, y, z, px, py, 6 - Math.abs(a) * 10, 6.2) + Math.sin(x * 1.3 + y * 1.7) * 0.7, M.BOA, 2.5);
      }
    }
    if (o.scarf) {
      add(smax(Math.abs(nk - 3) - 2.6, Math.abs(y - 108) - 4.5, 1), M.SCARF, 1);
      add(sdRoundBox(x, y, z, 81, 124, 13, 4, 13, 2, 1.6), M.SCARF, 1);
    }
    if (o.jabot) {
      // o jabô: o babado branco no pescoço
      for (let i = 0; i < 4; i += 1) add(sdEllipsoid(x, y, z, 88, 108 + i * 4.4, 11.5 + i * 0.6, 6.5 - i * 0.6, 2.6, 2.6) + Math.sin((x - 88) * 1.6) * 0.5, M.COLLAR, 1.2);
    }
  }

  return { scene, G };
}
