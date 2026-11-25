// node tools/volume/cena/novo/kit.mjs [pasta] — as peças do visual novo em volume (1 pixel da
// arte = 1 px do palco de 896 × 414): as tábuas e os botões em 9 fatias (madeira clara e escura, o
// vão fundo, o ouro, o papel da etiqueta e a fita amarela), as molduras dos pontos do mapa (madeira,
// ouro, ferro e a do chefe), o fundinho de cada tipo de ponto, os objetos (o engradado, o beco, as
// moedas, a porta), a fita crepe, o alfinete, a coroa, a faixa do chefe, a pedra e a moeda.
// Sai em src/components/art/novoVolumePx.js e, se pedir, em <pasta>/*.png.
import { mkdirSync, writeFileSync } from 'node:fs';
import { acc, add, reset } from '../../kit.mjs';
import { encodePNG } from '../../png.mjs';
import { sdCapsule, sdEllipsoid, sdRoundBox, sdRoundCone, sdSphere, smax, smin } from '../../sdf.mjs';
import { renderScene } from '../render.mjs';
import { bayer, halo, pixelPass } from '../pixelpass.mjs';
import { hash2 } from '../decals.mjs';

const DIR = process.argv[2] ? process.argv[2].replace(/\/?$/, '/') : null;
if (DIR) mkdirSync(DIR, { recursive: true });
const MODULE = new URL('../../../../src/components/art/novoVolumePx.js', import.meta.url);

const M = {
  WOOD: 60, WOOD_D: 61, POCKET: 62, GOLD: 63, PAPER: 64, RIBBON: 65, RED: 66, VELVET: 67, BRASS: 68,
  NAIL: 69, TAPE: 70, PIN: 71, STEEL: 72, GREY: 73, PLASTER: 74, SHELF: 75, GLASS_G: 76, GLASS_A: 77,
  GLASS_B: 78, AWN_R: 79, AWN_W: 80, BRICK: 81, NEON: 82, FELT: 83, NIGHT: 84, CRATE: 85, CRATE_D: 86,
  COIN: 87, DOOR: 88, IVORY: 89, PIP: 90, LAMP: 91, GROUND: 92, FRAME: 93, JEWEL: 94, CAP: 95, COIN_B: 96,
  NEON2: 97, CUE: 98, DAMASK: 99, WOOD_BM: 100, POCKET_BM: 101, BLOOD: 102, IRON_R: 103, GREEN_GLOW: 104,
};
const COLORS = {
  [M.WOOD]: ['#7a4520'], [M.WOOD_D]: ['#45250f'], [M.POCKET]: ['#2a150a'], [M.GOLD]: ['#f0a41e', 'metal'],
  [M.PAPER]: ['#f6e2b0'], [M.RIBBON]: ['#f2c454'], [M.RED]: ['#c8202a'], [M.VELVET]: ['#9a1420'],
  [M.BRASS]: ['#d8a848', 'metal'], [M.NAIL]: ['#a8a49a', 'metal'], [M.TAPE]: ['#e8d6a4'], [M.PIN]: ['#d8202a', 'metal'],
  [M.STEEL]: ['#8a8e96', 'metal'], [M.GREY]: ['#5a5e66'], [M.PLASTER]: ['#8a5426'], [M.SHELF]: ['#5e3214'],
  [M.GLASS_G]: ['#2a7a3a', 'metal'], [M.GLASS_A]: ['#b8701c', 'metal'], [M.GLASS_B]: ['#5a2e14', 'metal'],
  [M.AWN_R]: ['#c8382a'], [M.AWN_W]: ['#f6e2b0'], [M.BRICK]: ['#6a2434'], [M.NEON]: ['#d080ff', 'glow'],
  [M.FELT]: ['#2e7a3e'], [M.NIGHT]: ['#3a2e5a'], [M.CRATE]: ['#b07a3a'], [M.CRATE_D]: ['#6a4420'],
  [M.COIN]: ['#f0b830', 'metal'], [M.DOOR]: ['#3a2a30'], [M.IVORY]: ['#f6ead0'], [M.PIP]: ['#2a1206'],
  [M.LAMP]: ['#ffe9a0', 'glow'], [M.GROUND]: ['#2a2630'], [M.FRAME]: ['#8a5426'], [M.JEWEL]: ['#e0303a', 'metal'],
  [M.CAP]: ['#c8281c', 'metal'], [M.COIN_B]: ['#c88a1c', 'metal'], [M.NEON2]: ['#ff7ac8', 'glow'],
  [M.CUE]: ['#c8a46a'], [M.DAMASK]: ['#6a1420'], [M.WOOD_BM]: ['#3e2234'], [M.POCKET_BM]: ['#140810'],
  [M.BLOOD]: ['#c41c26', 'metal'], [M.IRON_R]: ['#c8141c', 'metal'], [M.GREEN_GLOW]: ['#7af08a', 'glow'],
};
const SPEC = new Set([M.BLOOD, M.IRON_R, M.GOLD, M.BRASS, M.NAIL, M.PIN, M.STEEL, M.GLASS_G, M.GLASS_A, M.GLASS_B, M.COIN, M.COIN_B, M.JEWEL, M.CAP, M.IVORY]);

const sprites = {};
/**
 * Renderiza a peça `name` (W × H) vista de frente (quase ortográfica, a luz do alto à esquerda).
 * `shadow`: [dx, dy, alfa] a sombra dura projetada nos pixels vazios; `lights` troca a luz.
 */
function sprite(name, W, H, scene, o = {}) {
  const cam = o.cam ?? [W / 2, H / 2, 1e5];
  const lights = o.lights ?? [{ p: [W / 2 - 40000, H / 2 - 60000, 70000], c: [1, 0.96, 0.88], k: 0.95, R: 1e9, shadow: true }];
  const emissive = new Set(o.emissive ?? []);
  const R = renderScene({ W, H, scene, cam, lights, amb: o.amb ?? [0.44, 0.42, 0.42], emissive, shadowStart: 0.25, normalOffset: 0.25 }, o.ss ?? 4);
  const ctx = pixelPass(R, {
    W,
    H,
    colors: COLORS,
    emissive,
    dither: new Set(o.dither ?? [M.VELVET, M.FELT, M.PLASTER, M.BRICK, M.NIGHT, M.DAMASK]),
    spec: SPEC,
    flats: new Set(o.flats ?? [M.WOOD, M.WOOD_D, M.PAPER, M.RIBBON, M.POCKET, M.FELT, M.PLASTER, M.VELVET, M.TAPE]),
    noEdge: new Set(o.noEdge ?? [M.WOOD, M.WOOD_D, M.PAPER, M.RIBBON, M.POCKET, M.FELT, M.PLASTER, M.VELVET, M.TAPE, M.BRICK, M.NIGHT, M.GROUND]),
    skyEdge: o.edge ?? true,
    vignette: false,
    decals: o.decals,
    post: o.post,
    ink: o.ink,
  });
  if (o.shadow) {
    const [dx, dy, a] = o.shadow;
    const { img } = ctx;
    const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && img[(y * W + x) * 4 + 3] === 255;
    const out = [];
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (!solid(x, y) && solid(x - dx, y - dy)) out.push(y * W + x);
    for (const p of out) {
      img[p * 4] = 14;
      img[p * 4 + 1] = 6;
      img[p * 4 + 2] = 2;
      img[p * 4 + 3] = Math.round(a * 255);
    }
  }
  if (DIR) writeFileSync(DIR + name + '.png', encodePNG(W, H, ctx.img));
  sprites[name] = { w: W, h: H, png: encodePNG(W, H, ctx.img) };
  return ctx;
}

// o veio da madeira que emenda nas 9 fatias: periódico de 28 px no comprido e de 7 px de través
const grainTile = (ctx, mats, period = 28) => {
  const { W, H, mat } = ctx;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!mats.includes(mat[p])) continue;
      const g = Math.sin((y * 2 * Math.PI) / 7 + Math.sin((x * 2 * Math.PI) / period) * 1.3 + Math.sin((x * 4 * Math.PI) / period + 1) * 0.5);
      if (g > 0.8) ctx.set(p, ctx.colorOf(p, ctx.RAMP[mat[p]], ctx.tone[p] - 1));
      else if (g < -0.95 && bayer(x, y) > 0.5) ctx.set(p, ctx.colorOf(p, ctx.RAMP[mat[p]], ctx.tone[p] + 1));
    }
};

// o tijolo (fiadas desencontradas, a argamassa escura)
const brick = (ctx, mats, bw = 10, bh = 5) => {
  const { W, H, mat } = ctx;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (!mats.includes(mat[p])) continue;
      const row = Math.floor(y / bh);
      const off = row % 2 ? bw / 2 : 0;
      if (y % bh === 0 || (x + off) % bw === 0) ctx.set(p, ctx.colorOf(p, ctx.RAMP[mat[p]], ctx.tone[p] - 2));
      else if (hash2(Math.floor((x + off) / bw), row) > 0.7) ctx.set(p, ctx.colorOf(p, ctx.RAMP[mat[p]], ctx.tone[p] + 1));
    }
};

// ------------------------------------------------------------------ as tábuas (9 fatias, canto de 10)
function boardScene(W, H, mat, r = 3) {
  return (x, y, z) => {
    reset();
    add(sdRoundBox(x, y, z, W / 2, (H - 3) / 2, 0, W / 2 - 0.5, (H - 3) / 2 - 0.5, 3, r), mat);
    return acc.D;
  };
}
sprite('wood', 48, 48, boardScene(48, 48, M.WOOD), { decals: (c) => grainTile(c, [M.WOOD]), shadow: [0, 3, 0.85] });
sprite('dark', 48, 48, boardScene(48, 48, M.WOOD_D), { decals: (c) => grainTile(c, [M.WOOD_D]), shadow: [0, 3, 0.85] });

// o vão fundo (9 fatias, canto de 8): a beirada escura em rampa e o fundo
function pocketScene(W, H) {
  return (x, y, z) => {
    reset();
    const plate = sdRoundBox(x, y, z, W / 2, H / 2, -1, W / 2 - 0.2, H / 2 - 0.2, 1.4, 1);
    const hole = sdRoundBox(x, y, z, W / 2, H / 2, 0.8, W / 2 - 2.6, H / 2 - 2.6, 2.6, 1.6);
    add(smax(plate, -hole, 1.2), M.WOOD_D);
    add(sdRoundBox(x, y, z, W / 2, H / 2, -2.8, W / 2 - 1, H / 2 - 1, 0.4, 1), M.POCKET);
    return acc.D;
  };
}
sprite('inset', 32, 32, pocketScene(32, 32), { edge: false });

// o botão de ouro (9 fatias, canto de 12): a placa estufada
function goldScene(W, H) {
  return (x, y, z) => {
    reset();
    add(sdRoundBox(x, y, z, W / 2, (H - 4) / 2, 0, W / 2 - 0.6, (H - 4) / 2 - 0.6, 3, 4), M.GOLD);
    return acc.D;
  };
}
sprite('gold', 40, 40, goldScene(40, 40), { shadow: [0, 4, 0.85] });

// a etiqueta de papel (9 fatias, canto de 4) e a fita amarela (9 fatias, canto de 6)
function paperScene(W, H, mat, r = 1.5) {
  return (x, y, z) => {
    reset();
    add(sdRoundBox(x, y, z, W / 2, (H - 2) / 2, 0, W / 2 - 0.5, (H - 2) / 2 - 0.5, 1, r), mat);
    return acc.D;
  };
}
sprite('tag', 20, 16, paperScene(20, 16, M.PAPER), { shadow: [0, 2, 0.5], ink: [106, 68, 16] });
sprite('ribbon', 32, 26, paperScene(32, 26, M.RIBBON, 2), { shadow: [0, 3, 0.5], ink: [106, 68, 16] });
// a etiqueta do ponto escolhido (amarela, como a fita)
sprite('tag-pick', 20, 16, paperScene(20, 16, M.RIBBON), { shadow: [0, 2, 0.5], ink: [106, 68, 16] });

// a tábua com as cantoneiras de latão (9 fatias, canto de 12): o painel de detalhe da loja
function woodBrassScene(x, y, z) {
  reset();
  const W = 48;
  const H = 48;
  add(sdRoundBox(x, y, z, W / 2, (H - 3) / 2, 0, W / 2 - 0.5, (H - 3) / 2 - 0.5, 3, 3), M.WOOD);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const ox = W / 2 + sx * (W / 2 - 1.5);
      const oy = (H - 3) / 2 + sy * ((H - 3) / 2 - 1.5);
      const armA = sdRoundBox(x, y, z, ox - sx * 5, oy - sy * 1.6, 3.2, 5, 1.8, 0.7, 0.5);
      const armB = sdRoundBox(x, y, z, ox - sx * 1.6, oy - sy * 5, 3.2, 1.8, 5, 0.7, 0.5);
      add(Math.min(armA, armB), M.BRASS);
      add(sdSphere(x, y, z, ox - sx * 7, oy - sy * 1.6, 3.9, 1.05), M.NAIL);
      add(sdSphere(x, y, z, ox - sx * 1.6, oy - sy * 7, 3.9, 1.05), M.NAIL);
    }
  return acc.D;
}
sprite('woodbrass', 48, 48, woodBrassScene, { decals: (c) => grainTile(c, [M.WOOD]), shadow: [0, 3, 0.85] });

// o nicho do mostruário (9 fatias, canto de 10): a caixinha funda e escura
function nicheScene(W, H) {
  return (x, y, z) => {
    reset();
    const plate = sdRoundBox(x, y, z, W / 2, H / 2, -1, W / 2 - 0.2, H / 2 - 0.2, 1.4, 1);
    const hole = sdRoundBox(x, y, z, W / 2, H / 2, 1, W / 2 - 3, H / 2 - 3, 4, 1.4);
    add(smax(plate, -hole, 1.4), M.WOOD_D);
    add(sdRoundBox(x, y, z, W / 2, H / 2, -4.4, W / 2 - 1, H / 2 - 1, 0.4, 1), M.POCKET);
    return acc.D;
  };
}
sprite('niche', 32, 32, nicheScene(32, 32), { edge: false, lights: [{ p: [16, -30, 40], c: [1, 0.86, 0.6], k: 1.1, R: 60, shadow: true }], amb: [0.3, 0.26, 0.24] });

/** A almofada de veludo vermelho onde a peça descansa. */
sprite('cushion', 44, 12, (x, y, z) => {
  reset();
  add(sdEllipsoid(x, y, z, 22, 6, 0, 21.4, 5.4, 6), M.VELVET);
  // os botões da almofada
  for (const bx of [13, 22, 31]) add(sdSphere(x, y, z, bx, 5, 5.2, 1), M.BRASS);
  return acc.D;
}, { shadow: [0, 1, 0.5], dither: [] });

/** A vitrine grande do detalhe: o veludo com o sol de ouro e a moldura dourada. */
sprite('showcase', 140, 136, (x, y, z) => {
  reset();
  add(z + 3 - Math.sin(x * 0.3) * 0.5, M.VELVET);
  const e = Math.max(Math.abs(x - 70) - 64, Math.abs(y - 68) - 62);
  add(Math.max(Math.hypot(e - 3, z - 1) - 3.2, -z - 2) * 0.9, M.GOLD);
  return acc.D;
}, {
  lights: [{ p: [70, 40, 90], c: [1, 0.86, 0.6], k: 1.3, R: 120, shadow: false }],
  amb: [0.3, 0.2, 0.2],
  edge: false,
  decals: (c) => {
    const { W, H, mat } = c;
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        if (mat[p] !== M.VELVET) continue;
        const a = Math.atan2(y - 68, x - 70);
        const r = Math.hypot(x - 70, y - 68);
        if (Math.sin(a * 18) > 0.6 && bayer(x, y) < 0.55 - r / 120) c.set(p, c.colorOf(p, c.RAMP[M.GOLD], 4));
      }
  },
});

// ------------------------------------------------------------------ o Mercado Negro
// a madeira roxa do beco, o vão quase preto, a tábua com as cantoneiras de ferro vermelho e o botão de sangue
sprite('wood-bm', 48, 48, boardScene(48, 48, M.WOOD_BM), { decals: (c) => grainTile(c, [M.WOOD_BM]), shadow: [0, 3, 0.85] });
function pocketBm(W, H) {
  return (x, y, z) => {
    reset();
    const plate = sdRoundBox(x, y, z, W / 2, H / 2, -1, W / 2 - 0.2, H / 2 - 0.2, 1.4, 1);
    const hole = sdRoundBox(x, y, z, W / 2, H / 2, 0.8, W / 2 - 2.6, H / 2 - 2.6, 2.6, 1.6);
    add(smax(plate, -hole, 1.2), M.WOOD_BM);
    add(sdRoundBox(x, y, z, W / 2, H / 2, -2.8, W / 2 - 1, H / 2 - 1, 0.4, 1), M.POCKET_BM);
    return acc.D;
  };
}
sprite('inset-bm', 32, 32, pocketBm(32, 32), { edge: false, lights: [{ p: [-40000, -60000, 70000], c: [1, 0.9, 0.95], k: 0.55, R: 1e9, shadow: true }], amb: [0.22, 0.2, 0.22] });
sprite('woodred-bm', 48, 48, (x, y, z) => {
  reset();
  const W = 48;
  const H = 48;
  add(sdRoundBox(x, y, z, W / 2, (H - 3) / 2, 0, W / 2 - 0.5, (H - 3) / 2 - 0.5, 3, 3), M.WOOD_BM);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const ox = W / 2 + sx * (W / 2 - 1.5);
      const oy = (H - 3) / 2 + sy * ((H - 3) / 2 - 1.5);
      add(Math.min(sdRoundBox(x, y, z, ox - sx * 5, oy - sy * 1.6, 3.2, 5, 1.8, 0.7, 0.5), sdRoundBox(x, y, z, ox - sx * 1.6, oy - sy * 5, 3.2, 1.8, 5, 0.7, 0.5)), M.IRON_R);
      add(sdSphere(x, y, z, ox - sx * 7, oy - sy * 1.6, 3.9, 1.05), M.NAIL);
      add(sdSphere(x, y, z, ox - sx * 1.6, oy - sy * 7, 3.9, 1.05), M.NAIL);
    }
  return acc.D;
}, { decals: (c) => grainTile(c, [M.WOOD_BM]), shadow: [0, 3, 0.85] });
sprite('blood', 40, 40, (x, y, z) => {
  reset();
  add(sdRoundBox(x, y, z, 20, 18, 0, 19.4, 17.4, 3, 4), M.BLOOD);
  return acc.D;
}, { shadow: [0, 4, 0.85], lights: [{ p: [-40000, -60000, 70000], c: [1, 0.92, 0.9], k: 0.8, R: 1e9, shadow: true }], amb: [0.26, 0.22, 0.22] });

/** O nicho de onde cada talismã pende (74 × 70): a caixinha preta com a moldura vinho e a luz verde. */
sprite('niche-bm', 74, 70, (x, y, z) => {
  reset();
  const outer = sdRoundBox(x, y, z, 37, 35, 0, 36.5, 34.5, 2.4, 1.6);
  const inner = sdRoundBox(x, y, z, 37, 35, 2, 31, 29, 4, 1);
  add(smax(outer, -inner, 0.8), M.DAMASK);
  add(sdRoundBox(x, y, z, 37, 35, -3, 32, 30, 0.6, 1), M.POCKET_BM);
  return acc.D;
}, {
  lights: [
    { p: [37, 30, 10], c: [0.5, 1, 0.55], k: 1.2, R: 34, shadow: false },
    { p: [-40000, -60000, 70000], c: [1, 0.8, 0.85], k: 0.6, R: 1e9, shadow: true },
  ],
  amb: [0.18, 0.12, 0.16],
  dither: [M.POCKET_BM],
  post: (c) => halo(c, 37, 33, 30, [110, 255, 130], 0.32),
});

/** A vitrine grande do Mercado Negro: o fundo preto, os raios vermelhos e a luz verde no meio. */
sprite('showcase-bm', 140, 136, (x, y, z) => {
  reset();
  add(z + 3, M.POCKET_BM);
  const e = Math.max(Math.abs(x - 70) - 64, Math.abs(y - 68) - 62);
  add(Math.max(Math.hypot(e - 3, z - 1) - 3.2, -z - 2) * 0.9, M.DAMASK);
  return acc.D;
}, {
  lights: [
    { p: [70, 64, 40], c: [0.5, 1, 0.55], k: 1.4, R: 70, shadow: false },
    { p: [-40000, -60000, 70000], c: [1, 0.7, 0.7], k: 0.6, R: 1e9, shadow: true },
  ],
  amb: [0.2, 0.12, 0.14],
  edge: false,
  dither: [M.POCKET_BM],
  post: (c) => halo(c, 70, 66, 64, [110, 255, 130], 0.34),
  decals: (c) => {
    const { W, H, mat } = c;
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        if (mat[p] !== M.POCKET_BM) continue;
        const a = Math.atan2(y - 68, x - 70);
        const r = Math.hypot(x - 70, y - 68);
        if (Math.sin(a * 18) > 0.6 && bayer(x, y) < 0.5 - r / 140) c.set(p, c.colorOf(p, c.RAMP[M.IRON_R], 3));
      }
  },
});

/** A correntinha de onde a peça pende (6 × 20): os elos de aço. */
sprite('chain', 6, 20, (x, y, z) => {
  reset();
  for (let i = 0; i < 5; i += 1) {
    const cy = 2 + i * 4;
    if (i % 2 === 0) add(Math.hypot(Math.hypot((x - 3) / 1.3, (y - cy) / 2.2) * 2.2 - 2.2, z) - 0.7, M.STEEL);
    else add(Math.hypot(Math.hypot((y - cy) / 2.2, z / 1.3) * 2.2 - 2.2, x - 3) - 0.7, M.STEEL);
  }
  return acc.D;
}, { edge: false });

// ------------------------------------------------------------------ o Seu Tião
/** A caixa de ferramentas vermelha na frente dele (243 × 141, vista um pouco de cima): as três
 *  gavetas, a tampa com a alça e as ferramentas em cima (a chave inglesa e a chave grande). */
sprite('toolbox', 243, 141, (x, y, z) => {
  reset();
  // o corpo, a tampa (com o tampo à mostra) e o friso entre os dois
  add(sdRoundBox(x, y, z, 121.5, 88, 0, 113, 44, 21, 2.6), M.RED);
  add(sdRoundBox(x, y, z, 121.5, 38, 0, 116, 7, 23, 3), M.RED);
  add(sdRoundBox(x, y, z, 121.5, 45.5, 0, 114, 1.2, 22, 0.6), M.POCKET);
  // as gavetas saltadas, com o puxador de cromo e a etiqueta
  for (const gy of [62, 89, 116]) {
    add(sdRoundBox(x, y, z, 121.5, gy, 21.6, 104, 11.4, 1.4, 1.2), M.RED);
    add(sdRoundBox(x, y, z, 121.5, gy + 2, 23.6, 22, 2, 1.6, 1), M.STEEL);
    add(sdRoundBox(x, y, z, 64, gy - 2, 23.2, 9, 4, 0.6, 0.5), M.PAPER);
  }
  // os fechos de latão e a alça de cima
  for (const lx of [28, 215]) add(sdRoundBox(x, y, z, lx, 44, 23.6, 5, 5, 1.4, 1), M.BRASS);
  for (const hx of [84, 159]) add(sdCapsule(x, y, z, hx, 31, 0, hx, 22, 0, 2.4), M.STEEL);
  add(sdCapsule(x, y, z, 84, 21, 0, 159, 21, 0, 3), M.STEEL);
  // as ferramentas deitadas no tampo: a chave inglesa e a chave grande de latão
  add(sdCapsule(x, y, z, 26, 29, 8, 66, 30, 14, 3), M.STEEL);
  add(smax(sdSphere(x, y, z, 21, 29, 7, 7), -sdRoundBox(x, y, z, 15, 29, 7, 5, 2.4, 9, 0.5), 0.6), M.STEEL);
  add(sdCapsule(x, y, z, 176, 29, 10, 210, 29, 14, 2.2), M.GOLD);
  add(Math.hypot(Math.hypot(x - 220, y - 29) - 6.6, z - 14) - 2.2, M.GOLD);
  for (const tx of [181, 188]) add(sdRoundBox(x, y, z, tx, 33, 10, 2, 4.4, 2, 0.6), M.GOLD);
  return acc.D;
}, {
  ss: 3,
  cam: [121.5, 70.5 - 36000, 1e5],
  lights: [
    { p: [121, -200, 160], c: [0.86, 0.92, 1], k: 1.15, R: 1e9, shadow: true },
    { p: [-40000, -20000, 70000], c: [1, 0.8, 0.6], k: 0.35, R: 1e9, shadow: true },
  ],
  amb: [0.14, 0.13, 0.16],
  dither: [M.RED],
  decals: (c) => {
    // a tinta lascada: uns pontinhos de metal
    const { W, H, mat } = c;
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        if (mat[p] === M.RED && hash2(Math.floor(x / 2), Math.floor(y / 2)) > 0.993) c.set(p, c.colorOf(p, c.RAMP[M.STEEL], c.tone[p]));
      }
  },
  shadow: [0, 4, 0.55],
});

/** A moeda que voa do Seu Tião para o bolso (24 × 24). */
sprite('coin24', 24, 24, (x, y, z) => {
  reset();
  const r = Math.hypot(x - 12, y - 12);
  add(smax(Math.max(r - 11, Math.abs(z) - 2), -Math.max(r - 7.4, z - 2.6), 0.6) - 0.1, M.COIN);
  add(Math.max(r - 8, Math.abs(z - 0.8) - 1), M.COIN);
  return acc.D;
}, { shadow: [1, 1, 0.5] });

// ------------------------------------------------------------------ as molduras dos pontos do mapa
// a moldura de 7 px em volta da foto (54 × 46; a do chefe, 86 × 80): o friso boleado, a meia-esquadria
function frameScene(W, H, iw, ih, mat, { bead = 3, trim = null } = {}) {
  return (x, y, z) => {
    reset();
    // a distância até a beira da janela (0 na janela, (W - iw) / 2 na beira de fora)
    const e = Math.max(Math.abs(x - W / 2) - iw / 2, Math.abs(y - H / 2) - ih / 2);
    const band = (W - iw) / 2;
    // o perfil: uma meia-cana deitada ao longo da moldura (alto no meio, caindo para as beiras)
    const t = e - band / 2;
    const prof = Math.hypot(t / (band / 2), z / bead) - 1;
    add(Math.max(prof * Math.min(band / 2, bead), -z) * 0.9, mat);
    // o filete de dentro (o friso vermelho da do chefe)
    if (trim) add(Math.max(Math.hypot(e - 0.9, z - 0.6) - 1, -z), trim);
    return acc.D;
  };
}
const FRAME_LIGHT = { lights: [{ p: [-40000, -60000, 70000], c: [1, 0.96, 0.88], k: 1.25, R: 1e9, shadow: true }], amb: [0.2, 0.18, 0.18] };
sprite('frame-wood', 68, 60, frameScene(68, 60, 54, 46, M.FRAME), { ...FRAME_LIGHT, shadow: [0, 3, 0.55] });
sprite('frame-gold', 68, 60, frameScene(68, 60, 54, 46, M.GOLD), { ...FRAME_LIGHT, shadow: [0, 3, 0.55] });
sprite('frame-grey', 68, 60, frameScene(68, 60, 54, 46, M.STEEL), { ...FRAME_LIGHT, shadow: [0, 3, 0.55] });
sprite('frame-boss', 100, 94, frameScene(100, 94, 86, 80, M.GOLD, { bead: 3.6, trim: M.RED }), { ...FRAME_LIGHT, shadow: [0, 4, 0.55] });

// ------------------------------------------------------------------ o fundinho de cada ponto (54 × 46)
const warm = (W, H, k = 0.9) => [{ p: [W / 2, -6, 34], c: [1, 0.82, 0.55], k, R: 70, shadow: true }];

/** A mesa: a parede do boteco com a prateleira de garrafas. */
function scCombat(x, y, z) {
  reset();
  add(z + 8, M.PLASTER);
  add(sdRoundBox(x, y, z, 27, 27, -5, 30, 2, 4, 0.8), M.SHELF);
  add(sdRoundBox(x, y, z, 27, 42, -4, 30, 6, 4, 1), M.SHELF);
  const glass = [M.GLASS_G, M.GLASS_A, M.GLASS_B, M.GLASS_G, M.GLASS_B, M.GLASS_A];
  for (let i = 0; i < 6; i += 1) {
    const bx = 6 + i * 8.4;
    add(smin(sdRoundBox(x, y, z, bx, 19, -4, 2.6, 6, 2.6, 2.4), sdCapsule(x, y, z, bx, 13, -4, bx, 7, -4, 1), 1), glass[i]);
  }
  return acc.D;
}
sprite('sc-combat', 54, 46, scCombat, { lights: warm(54, 46, 1.2), amb: [0.32, 0.26, 0.24], edge: false });

/** A mesa da região 2: a parede de tijolo do Clube da Sinuca, o neon rosa e os tacos. */
function scCombat2(x, y, z) {
  reset();
  add(z + 8, M.BRICK);
  add(sdCapsule(x, y, z, 10, 7, -4, 44, 7, -4, 1.3), M.NEON2);
  for (let i = 0; i < 4; i += 1) add(sdCapsule(x, y, z, 8 + i * 3, 44, -5, 9 + i * 3.3, 16, -5, 0.8), M.CUE);
  add(sdRoundBox(x, y, z, 13, 44, -4, 8, 2, 3, 0.6), M.SHELF);
  return acc.D;
}
sprite('sc-combat2', 54, 46, scCombat2, {
  lights: [{ p: [27, 12, 20], c: [1, 0.55, 0.8], k: 1.2, R: 34, shadow: true }],
  amb: [0.2, 0.15, 0.2],
  emissive: [M.NEON2],
  edge: false,
  decals: (c) => brick(c, [M.BRICK], 10, 5),
});

/** A mesa da região 3: o papel de parede de damasco do escritório do bicho e a moldura dourada. */
function scCombat3(x, y, z) {
  reset();
  add(z + 8, M.DAMASK);
  add(sdRoundBox(x, y, z, 42, 18, -6, 9, 13, 1.4, 0.8), M.GOLD);
  add(sdRoundBox(x, y, z, 42, 18, -5, 6.5, 10.5, 1.2, 0.5), M.POCKET);
  add(sdRoundBox(x, y, z, 27, 43, -5, 30, 4, 4, 1), M.SHELF);
  return acc.D;
}
sprite('sc-combat3', 54, 46, scCombat3, {
  lights: [{ p: [20, -4, 30], c: [1, 0.82, 0.6], k: 1.2, R: 60, shadow: true }],
  amb: [0.3, 0.22, 0.22],
  edge: false,
  decals: (c) => {
    // o damasco: as flores de ouro em losango
    const { W, H, mat } = c;
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const p = y * W + x;
        if (mat[p] !== M.DAMASK) continue;
        const gx = (((x + (Math.floor(y / 10) % 2) * 5) % 10) + 10) % 10 - 5;
        const gy = ((y % 10) + 10) % 10 - 5;
        const d = Math.abs(gx) + Math.abs(gy);
        if (d === 3 || (d === 0 && (x + y) % 2 === 0)) c.set(p, c.colorOf(p, c.RAMP[M.GOLD], c.tone[p] - 1));
      }
  },
});

/** A loja: o toldo listrado em cima e a luz quente lá dentro. */
function scShop(x, y, z) {
  reset();
  add(z + 8, M.PLASTER);
  // o toldo: as listras em gomos, caindo para a frente
  const t = Math.max(0, Math.min(1, y / 11));
  const scallop = 11 + Math.abs(Math.sin((x * Math.PI) / 9)) * 2.2;
  add(Math.max(Math.abs(z - (2 - t * 5)) - 1.2, y - scallop, -y - 1) * 0.8, Math.floor(x / 9) % 2 ? M.AWN_W : M.AWN_R);
  // o balcão embaixo
  add(sdRoundBox(x, y, z, 27, 41, -3, 30, 6, 4, 1), M.SHELF);
  return acc.D;
}
sprite('sc-shop', 54, 46, scShop, { lights: warm(54, 46, 1.25), amb: [0.32, 0.26, 0.24], edge: false });

/** O beco: tijolo vinho na sombra e o neon roxo em cima. */
function scBlack(x, y, z) {
  reset();
  add(z + 6, M.BRICK);
  add(sdCapsule(x, y, z, 12, 6, -3, 42, 6, -3, 1.4), M.NEON);
  return acc.D;
}
sprite('sc-black', 54, 46, scBlack, {
  lights: [{ p: [27, 10, 18], c: [0.75, 0.45, 1], k: 1.3, R: 34, shadow: false }],
  amb: [0.14, 0.1, 0.16],
  emissive: [M.NEON],
  edge: false,
  decals: (c) => brick(c, [M.BRICK]),
});

/** O Seu Tião: o feltro verde debaixo da luz. */
sprite('sc-coins', 54, 46, (x, y, z) => {
  reset();
  add(z + Math.sin(x * 0.7) * Math.sin(y * 0.9) * 0.15, M.FELT);
  return acc.D;
}, { lights: [{ p: [27, 18, 40], c: [1, 0.92, 0.66], k: 1.25, R: 40, shadow: false }], amb: [0.2, 0.2, 0.18], edge: false });

/** O imprevisto: o beco de noite (tijolo roxo e a chuva). */
sprite('sc-event', 54, 46, (x, y, z) => {
  reset();
  add(z + 6, M.NIGHT);
  return acc.D;
}, {
  lights: [{ p: [27, 14, 24], c: [1, 0.6, 0.85], k: 1.1, R: 36, shadow: false }],
  amb: [0.16, 0.14, 0.24],
  edge: false,
  decals: (c) => {
    brick(c, [M.NIGHT], 9, 5);
    const { W, H } = c;
    for (let i = 0; i < 26; i += 1) {
      const x0 = Math.floor(hash2(i, 1) * W);
      const y0 = Math.floor(hash2(i, 2) * H);
      for (let k = 0; k < 4; k += 1) {
        const x = x0 - Math.floor(k / 2);
        const y = y0 + k;
        if (x >= 0 && y < H) c.set(y * W + x, [150, 140, 200]);
      }
    }
  },
});

/** A mesa trancada: a placa de ferro com os rebites. */
sprite('sc-lock', 54, 46, (x, y, z) => {
  reset();
  add(sdRoundBox(x, y, z, 27, 23, -1, 27.5, 23.5, 1, 0.5), M.GREY);
  for (const [rx, ry] of [
    [5, 5],
    [49, 5],
    [5, 41],
    [49, 41],
  ])
    add(sdSphere(x, y, z, rx, ry, 0, 1.8), M.STEEL);
  return acc.D;
}, {
  edge: false,
  decals: (c) => {
    // o ferro escovado
    const { W, H, mat } = c;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (mat[y * W + x] === M.GREY && hash2(y, Math.floor(x / 9)) > 0.75) c.set(y * W + x, c.colorOf(y * W + x, c.RAMP[M.GREY], c.tone[y * W + x] + 1));
  },
});

/** O chefe: o veludo vermelho com o sol de ouro atrás. */
sprite('sc-boss', 86, 80, (x, y, z) => {
  reset();
  // as dobras da cortina
  add(z + 4 - Math.sin(x * 0.42) * 1.6, M.VELVET);
  return acc.D;
}, {
  lights: [{ p: [43, 20, 60], c: [1, 0.86, 0.7], k: 1.2, R: 70, shadow: false }],
  amb: [0.3, 0.2, 0.2],
  edge: false,
  decals: (c) => {
    const { W, H } = c;
    // os raios de ouro saindo de trás da cabeça
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const a = Math.atan2(y - 36, x - 43);
        const r = Math.hypot(x - 43, y - 36);
        if (r > 8 && Math.sin(a * 12) > 0.55 && bayer(x, y) < 0.7 - r / 90) c.set(y * W + x, c.colorOf(y * W + x, c.RAMP[M.GOLD], 4));
      }
  },
});

// ------------------------------------------------------------------ os objetos dos pontos
/** O engradado da loja: as ripas, as garrafas e o toldinho em cima. */
sprite('obj-crate', 44, 40, (x, y, z) => {
  reset();
  // as ripas da frente do engradado
  for (let i = 0; i < 3; i += 1) add(sdRoundBox(x, y, z, 22, 22 + i * 5.6, 2, 15, 2.4, 5, 1), i % 2 ? M.CRATE_D : M.CRATE);
  add(sdRoundBox(x, y, z, 22, 28, -1, 15.5, 9, 5, 1), M.CRATE_D);
  for (const sx of [8.5, 35.5]) add(sdRoundBox(x, y, z, sx, 28, 2.4, 1.6, 9.5, 5.4, 0.8), M.CRATE);
  // as garrafas saindo por cima
  const glass = [M.GLASS_G, M.GLASS_B, M.GLASS_A, M.GLASS_G];
  for (let i = 0; i < 4; i += 1) {
    const bx = 12 + i * 6.6;
    add(smin(sdRoundBox(x, y, z, bx, 17, 0, 2.6, 4, 2.6, 2.4), sdCapsule(x, y, z, bx, 13, 0, bx, 8, 0, 1.1), 1), glass[i]);
    add(sdSphere(x, y, z, bx, 7.5, 0, 1.4), M.CAP);
  }
  return acc.D;
}, { shadow: [1, 2, 0.45] });

/** O beco do imprevisto: o corredor entre dois prédios sumindo lá no fundo, o poste aceso. */
sprite('obj-alley', 40, 42, (x, y, z) => {
  reset();
  // as duas paredes de tijolo (o corredor vai para o fundo, z negativo), o chão molhado e o fundo
  add(sdRoundBox(x, y, z, 3, 21, -22, 6, 23, 22, 0.5), M.BRICK);
  add(sdRoundBox(x, y, z, 37, 21, -22, 6, 23, 22, 0.5), M.BRICK);
  add(sdRoundBox(x, y, z, 20, 44, -22, 20, 2, 22, 0.5), M.GROUND);
  add(sdRoundBox(x, y, z, 20, 21, -46, 20, 25, 2, 0.5), M.NIGHT);
  // o poste na parede da direita, com o braço e a lâmpada
  add(sdCapsule(x, y, z, 30.6, 42, -16, 30.6, 10, -16, 0.9), M.STEEL);
  add(sdCapsule(x, y, z, 30.6, 10, -16, 26, 9, -16, 0.8), M.STEEL);
  add(sdSphere(x, y, z, 25.5, 10.5, -16, 1.9), M.LAMP);
  return acc.D;
}, {
  cam: [20, 18, 70],
  emissive: [M.LAMP],
  lights: [
    { p: [25, 13, -14], c: [1, 0.86, 0.5], k: 1.3, R: 22, shadow: true },
    { p: [20, -40, 60], c: [0.6, 0.6, 0.9], k: 0.3, R: 1e9, shadow: true },
  ],
  amb: [0.18, 0.16, 0.26],
  decals: (c) => brick(c, [M.BRICK], 6, 3),
  shadow: [1, 2, 0.45],
});

/** As moedas do Seu Tião: três pilhas, a do meio mais alta (vistas um pouco de cima). */
sprite('obj-coins', 40, 38, (x, y, z) => {
  reset();
  for (const [cx, cz, n] of [
    [11, -3, 4],
    [21, 2, 7],
    [30, -2, 5],
  ])
    for (let i = 0; i < n; i += 1) {
      // cada moeda: um disco deitado (o eixo em pé, ao longo de y), com o vão entre uma e outra
      const cy = 34 - i * 3.3;
      const r = Math.hypot(x - cx, z - cz);
      const ridge = Math.abs(Math.sin(Math.atan2(z - cz, x - cx) * 18)) * 0.25;
      add(Math.max(r - 6.6 + ridge, Math.abs(y - cy) - 1.25) - 0.25, i === n - 1 || i % 2 ? M.COIN : M.COIN_B);
    }
  return acc.D;
}, { cam: [20, 19 - 46000, 1e5], shadow: [1, 2, 0.45] });

/** A porta do beco: a porta de ferro com o postigo gradeado e a luz vermelha em cima. */
sprite('obj-door', 36, 42, (x, y, z) => {
  reset();
  add(sdRoundBox(x, y, z, 18, 23, -1, 17, 19, 2, 1), M.BRICK);
  add(sdRoundBox(x, y, z, 18, 26, 1.4, 11, 15, 1.2, 0.8), M.DOOR);
  add(sdRoundBox(x, y, z, 18, 18, 2.4, 5, 3, 0.6, 0.6), M.POCKET);
  for (const bx of [15, 18, 21]) add(sdCapsule(x, y, z, bx, 15, 3, bx, 21, 3, 0.55), M.STEEL);
  add(sdSphere(x, y, z, 25.5, 28, 3, 1.4), M.BRASS);
  add(sdSphere(x, y, z, 18, 5, 2, 2.3), M.JEWEL);
  return acc.D;
}, {
  lights: [
    { p: [18, 2, 14], c: [1, 0.35, 0.3], k: 1.2, R: 22, shadow: true },
    { p: [-4000, -6000, 7000], c: [0.7, 0.65, 0.8], k: 0.45, R: 1e9, shadow: true },
  ],
  amb: [0.2, 0.16, 0.2],
  decals: (c) => brick(c, [M.BRICK], 7, 4),
  shadow: [1, 2, 0.45],
});

// ------------------------------------------------------------------ as miudezas
/** A fita crepe que prende a moldura na folha. */
sprite('tape', 26, 9, (x, y, z) => {
  reset();
  const torn = Math.abs(x - 13) - 12.4 + (hash2(Math.floor(y), 3) - 0.5) * 1.6;
  add(Math.max(torn, Math.abs(y - 4.5) - 4, Math.abs(z) - 0.4) - 0.1, M.TAPE);
  return acc.D;
}, { edge: false, decals: (c) => { for (let p = 0; p < c.W * c.H; p += 1) if (c.mat[p] && (p % c.W + Math.floor(p / c.W) * 3) % 5 === 0) c.set(p, c.colorOf(p, c.RAMP[M.TAPE], c.tone[p] - 1)); } });

/** O alfinete de cabeça vermelha (visto de cima). */
sprite('pin', 14, 14, (x, y, z) => {
  reset();
  add(sdSphere(x, y, z, 7, 6.6, 0, 5.4), M.PIN);
  return acc.D;
}, { shadow: [1, 2, 0.5] });

/** A coroa do chefe. */
sprite('crown', 32, 18, (x, y, z) => {
  reset();
  const band = sdRoundBox(x, y, z, 16, 13, 0, 13, 3, 2, 1);
  // as três pontas (a do meio mais alta) com as bolinhas
  let spikes = 1e9;
  for (const [px, top] of [
    [5, 5],
    [16, 2],
    [27, 5],
  ]) {
    spikes = Math.min(spikes, sdRoundCone(x, y, z, px, 12, 0, px, top + 2, 0, 3.4, 1));
    add(sdSphere(x, y, z, px, top + 0.5, 0.6, 1.6), M.GOLD);
  }
  add(smin(band, spikes, 1.2), M.GOLD);
  add(sdSphere(x, y, z, 16, 13, 1.8, 1.6), M.JEWEL);
  return acc.D;
}, { shadow: [0, 2, 0.6] });

/** A faixa vermelha do chefe (o texto vem por cima). */
sprite('banner', 96, 20, (x, y, z) => {
  reset();
  add(sdRoundBox(x, y, z, 48, 9, 0, 47.5, 8.5, 2, 1.5) - Math.sin(x * 0.3) * 0.15, M.RED);
  add(Math.max(Math.abs(Math.abs(y - 9) - 6.6) - 0.6, Math.abs(x - 48) - 46, Math.abs(z - 1.9) - 0.6), M.GOLD);
  return acc.D;
}, { shadow: [0, 2, 0.6], dither: [M.RED] });

/** A pedra de dominó na mesa, vista de cima ([1|4]). */
sprite('dom', 20, 38, (x, y, z) => {
  reset();
  const body = sdRoundBox(x, y, z, 10, 18.5, 0, 9.5, 18, 3, 2.6);
  let pips = 1e9;
  for (const [px, py] of [
    [10, 9],
    [6, 24],
    [14, 24],
    [6, 32],
    [14, 32],
  ])
    pips = Math.min(pips, sdSphere(x, y, z, px, py, 3.6, 1.8));
  const line = sdRoundBox(x, y, z, 10, 18.5, 3.2, 7, 0.5, 0.8, 0.4);
  add(smax(body, -Math.min(pips, line), 0.4), M.IVORY);
  add(Math.min(pips, line) + 0.5, M.PIP);
  return acc.D;
}, { shadow: [2, 3, 0.5] });

/** A moeda do bolso (vista de cima). */
sprite('coin', 14, 14, (x, y, z) => {
  reset();
  const r = Math.hypot(x - 7, y - 7);
  const disk = Math.max(r - 6.4, Math.abs(z) - 1.2);
  const face = Math.max(r - 4.2, z - 1.6);
  add(smax(disk, -face, 0.4) - 0.1, M.COIN);
  add(Math.max(r - 4.6, Math.abs(z - 0.4) - 0.6), M.COIN);
  return acc.D;
}, { shadow: [0, 1, 0.6] });

// ------------------------------------------------------------------ o pacote para o jogo
let js = '// gerado por tools/volume/cena/novo/kit.mjs: as peças do visual novo em volume (PNG em data URL)\nexport const NOVO_PX = {\n';
for (const [name, s] of Object.entries(sprites)) js += `  '${name}': { w: ${s.w}, h: ${s.h}, url: 'data:image/png;base64,${Buffer.from(s.png).toString('base64')}' },\n`;
js += '};\n';
writeFileSync(MODULE, js);
console.log('sprites', Object.keys(sprites).length, 'js', js.length);
