// node ui.mjs — as peças do HUD novo em volume (1 pixel da arte = 1 px de CSS, como as salas):
// os corações (cheio e vazio, em cada tamanho que o jogo usa), o nicho dos talismãs, a caixa de
// nogueira com as cantoneiras de latão, as bandejas de veludo (vermelha da vida, verde do dorme), a
// lousa das pontas, as teclas (ouro, escura, vermelha; acesas e apagadas) e a placa de tábua.
// Sai em src/components/art/hudVolumePx.js (os data URLs, para o jogo) e, se pedir, em <pasta>/*.png:
//   node tools/volume/cena/ui.mjs [pasta]
import { mkdirSync, writeFileSync } from 'node:fs';
import { add, reset, acc } from '../kit.mjs';
import { encodePNG } from '../png.mjs';
import { sdRoundBox, sdSphere, smax } from '../sdf.mjs';
import { renderScene } from './render.mjs';
import { pixelPass } from './pixelpass.mjs';
import { hash2 } from './decals.mjs';

const DIR = process.argv[2] ? process.argv[2].replace(/\/?$/, '/') : null;
if (DIR) mkdirSync(DIR, { recursive: true });
const MODULE = new URL('../../../src/components/art/hudVolumePx.js', import.meta.url);

const M = {
  WOOD: 60, WOOD_D: 61, BRASS: 62, RIVET: 63, VELVET_R: 64, VELVET_G: 65, SLATE: 66, CHALK_FRAME: 67,
  GOLD: 68, GOLD_OFF: 69, DARK: 70, DARK_OFF: 71, RED: 72, HEART: 73, HEART_X: 74, POCKET: 75, NAIL: 76, PLANK: 77,
};
const COLORS = {
  [M.WOOD]: ['#5e361a'], [M.WOOD_D]: ['#3e2010'], [M.BRASS]: ['#d8a848', 'metal'], [M.RIVET]: ['#f0d070', 'metal'],
  [M.VELVET_R]: ['#7e101a'], [M.VELVET_G]: ['#1e4a30'], [M.SLATE]: ['#26322c'], [M.CHALK_FRAME]: ['#7a4a22'],
  [M.GOLD]: ['#e89a1c', 'metal'], [M.GOLD_OFF]: ['#7a6040'], [M.DARK]: ['#4a2a14'], [M.DARK_OFF]: ['#3a2416'],
  [M.RED]: ['#b01c26', 'metal'], [M.HEART]: ['#e8202c', 'metal'], [M.HEART_X]: ['#3e2c34'], [M.POCKET]: ['#1e0e06'],
  [M.NAIL]: ['#9a9a90', 'metal'], [M.PLANK]: ['#7a4a24'],
};

const sprites = {};
/** Renderiza a peça `name` (W × H) com a cena `scene(x, y, z)` vista de frente (quase ortográfica). */
function sprite(name, W, H, scene, { decals = null, ss = 4, edge = true, amb = [0.44, 0.42, 0.42], spec = [M.BRASS, M.RIVET, M.GOLD, M.RED, M.HEART, M.NAIL] } = {}) {
  const cam = [W / 2, H / 2, 1e5];
  const lights = [{ p: [W / 2 - 40000, H / 2 - 60000, 70000], c: [1, 0.96, 0.88], k: 0.95, R: 1e9, shadow: true }];
  const R = renderScene({ W, H, scene, cam, lights, amb, emissive: new Set(), shadowStart: 0.25, normalOffset: 0.25 }, ss);
  const ctx = pixelPass(R, {
    W,
    H,
    colors: COLORS,
    dither: new Set([M.VELVET_R, M.VELVET_G, M.SLATE]),
    spec: new Set(spec),
    flats: new Set([M.VELVET_R, M.VELVET_G, M.SLATE, M.WOOD, M.WOOD_D, M.PLANK]),
    noEdge: new Set([M.VELVET_R, M.VELVET_G, M.SLATE, M.WOOD, M.WOOD_D, M.PLANK]),
    skyEdge: edge,
    vignette: false,
    decals,
  });
  if (DIR) writeFileSync(DIR + name + '.png', encodePNG(W, H, ctx.img));
  sprites[name] = { w: W, h: H, png: encodePNG(W, H, ctx.img) };
  return ctx;
}

// ------------------------------------------------------------------ o coração
// o coração 2D de Inigo Quilez (a ponta embaixo), estufado como uma almofada
function heart2(px, py) {
  px = Math.abs(px);
  const d2 = (ax, ay) => ax * ax + ay * ay;
  if (py + px > 1) return Math.sqrt(d2(px - 0.25, py - 0.75)) - Math.SQRT2 / 4;
  const m = 0.5 * Math.max(px + py, 0);
  return Math.sqrt(Math.min(d2(px, py - 1), d2(px - m, py - m))) * Math.sign(px - py);
}
function heartScene(s, mat) {
  // o coração cabe em s × s: a ponta embaixo, os dois gomos em cima
  const k = s / 1.32;
  return (x, y, z) => {
    reset();
    const px = (x - s / 2) / k;
    const py = (s * 0.92 - y) / k;
    const d = heart2(px, py) * k;
    const puff = Math.sqrt(Math.max(0, -d)) * (s / 9);
    add(Math.max(d, Math.abs(z) - puff - 0.5) * 0.8, mat);
    return acc.D;
  };
}
const HEART_SIZES = [7, 8, 9, 11, 12, 13, 14, 16, 18, 20, 24, 27];
for (const s of HEART_SIZES) {
  sprite(`heart-${s}`, s, s, heartScene(s, M.HEART));
  sprite(`heartx-${s}`, s, s, heartScene(s, M.HEART_X), {
    decals: (ctx) => {
      // a rachadura do coração apagado
      if (s < 9) return;
      const pts = [
        [0.5, 0.22],
        [0.42, 0.42],
        [0.56, 0.56],
        [0.47, 0.8],
      ];
      for (let i = 0; i < pts.length - 1; i += 1) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        for (let t = 0; t <= 1; t += 0.1) {
          const x = Math.round((ax + (bx - ax) * t) * s);
          const y = Math.round((ay + (by - ay) * t) * s);
          const p = y * s + x;
          if (ctx.mat[p]) ctx.set(p, [16, 10, 12]);
        }
      }
    },
  });
}

// ------------------------------------------------------------------ o nicho dos talismãs
function nicheScene(W, H) {
  return (x, y, z) => {
    reset();
    const cx = W / 2;
    const cy = H / 2;
    const plate = sdRoundBox(x, y, z, cx, cy, 0, W / 2 - 0.5, H / 2 - 0.5, 2.5, 2);
    const pocket = sdRoundBox(x, y, z, cx, cy + 0.5, 2.6, W / 2 - 4, H / 2 - 4, 2.6, 2.4);
    add(smax(plate, -pocket, 0.4), M.WOOD);
    add(sdRoundBox(x, y, z, cx, cy + 0.5, -0.4, W / 2 - 4, H / 2 - 4, 0.6, 2.4), M.POCKET);
    // o aro de latão em volta da boca do nicho
    const ring = Math.max(Math.abs(Math.max(Math.abs(x - cx) - (W / 2 - 4), Math.abs(y - cy - 0.5) - (H / 2 - 4))) - 0.8, Math.abs(z - 2.4) - 0.6);
    add(ring, M.BRASS);
    return acc.D;
  };
}
for (const s of [24, 26, 28, 30, 32]) sprite(`niche-${s}`, s, Math.round((s * 24) / 26), nicheScene(s, Math.round((s * 24) / 26)));

// ------------------------------------------------------------------ a caixa de nogueira (9 fatias, canto de 12)
const FR = 48;
function caseScene(x, y, z) {
  reset();
  const c = FR / 2;
  const outer = sdRoundBox(x, y, z, c, c, 0, c - 0.5, c - 0.5, 3, 3);
  // a moldura alta (10 px) e o painel de dentro, mais fundo
  const inner = sdRoundBox(x, y, z, c, c, 3, c - 10, c - 10, 2.2, 1.5);
  add(smax(outer, -inner, 0.8), M.WOOD);
  add(sdRoundBox(x, y, z, c, c, -0.6, c - 9, c - 9, 1.6, 1), M.WOOD_D);
  // o filete de latão embutido no meio da moldura
  const e = Math.max(Math.abs(x - c), Math.abs(y - c));
  add(Math.max(Math.abs(e - (c - 5)) - 0.55, Math.abs(z - 2.8) - 0.5), M.BRASS);
  // as cantoneiras de latão em L, com dois rebites cada
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const ox = c + sx * (c - 1);
      const oy = c + sy * (c - 1);
      const armA = sdRoundBox(x, y, z, ox - sx * 5.5, oy - sy * 2, 3.2, 5, 2.2, 0.8, 0.6);
      const armB = sdRoundBox(x, y, z, ox - sx * 2, oy - sy * 5.5, 3.2, 2.2, 5, 0.8, 0.6);
      add(Math.min(armA, armB), M.BRASS);
      for (const [rx, ry] of [
        [ox - sx * 7.5, oy - sy * 2],
        [ox - sx * 2, oy - sy * 7.5],
      ])
        add(sdSphere(x, y, z, rx, ry, 3.9, 1.15), M.RIVET);
    }
  return acc.D;
}
const woodGrain = (ctx) => {
  const { W, H, mat } = ctx;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (mat[p] !== M.WOOD && mat[p] !== M.WOOD_D && mat[p] !== M.PLANK) continue;
      // o veio corre ao comprido de cada lado (nas pontas do 9 fatias ele precisa emendar)
      const vertical = mat[p] !== M.WOOD_D && Math.min(x, W - 1 - x) < Math.min(y, H - 1 - y);
      const g = vertical ? Math.sin(x * 1.7 + Math.sin(y * 0.4) * 0.8) : Math.sin(y * 1.7 + Math.sin(x * 0.4) * 0.8);
      if (g > 0.85) ctx.set(p, ctx.colorOf(p, ctx.RAMP[mat[p]], ctx.tone[p] - 1));
    }
};
sprite('case', FR, FR, caseScene, { decals: woodGrain });

// ------------------------------------------------------------------ as bandejas (9 fatias, canto de 8)
function trayScene(mat, S = 24) {
  return (x, y, z) => {
    reset();
    const c = S / 2;
    // o vão (a parede em rampa) e o fundo de pano
    const outer = sdRoundBox(x, y, z, c, c, 0, c - 0.5, c - 0.5, 3, 1.5);
    const hole = sdRoundBox(x, y, z, c, c, 1.6, c - 2.5, c - 2.5, 5, 2);
    add(smax(outer, -hole, 0.6), M.WOOD_D);
    add(sdRoundBox(x, y, z, c, c, -3.6, c - 2, c - 2, 0.6, 1.5), mat);
    return acc.D;
  };
}
sprite('tray-red', 24, 24, trayScene(M.VELVET_R), { edge: false });
sprite('tray-green', 24, 24, trayScene(M.VELVET_G), { edge: false });
sprite('slate', 24, 24, trayScene(M.SLATE), { edge: false });

// ------------------------------------------------------------------ as teclas (9 fatias, canto de 8)
function keyScene(mat, pressed = false) {
  const W = 40;
  const H = 24;
  return (x, y, z) => {
    reset();
    // a base escura (o "poço" da tecla) e a capa estufada em cima
    add(sdRoundBox(x, y, z, W / 2, H / 2, 0, W / 2 - 0.5, H / 2 - 0.5, 1.5, 3), M.WOOD_D);
    const lift = pressed ? 0.8 : 2.2;
    const cap = sdRoundBox(x, y, z, W / 2, H / 2 - (pressed ? 0 : 1), 1.5 + lift / 2, W / 2 - 2, H / 2 - 2.5, lift / 2 + 0.6, 2.6);
    add(cap - Math.max(0, 1 - Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2))) * 0.6, mat);
    return acc.D;
  };
}
sprite('key-gold-on', 40, 24, keyScene(M.GOLD));
sprite('key-gold-off', 40, 24, keyScene(M.GOLD_OFF), { spec: [] });
sprite('key-dark-off', 40, 24, keyScene(M.DARK_OFF), { spec: [] });
sprite('key-red-on', 40, 24, keyScene(M.RED));
sprite('key-gold-down', 40, 24, keyScene(M.GOLD, true));

// ------------------------------------------------------------------ a placa de tábua (9 fatias, canto de 10)
function plankScene(x, y, z) {
  reset();
  const W = 48;
  const H = 32;
  for (const [py, ph] of [
    [8, 7.5],
    [24, 7.5],
  ])
    add(sdRoundBox(x, y, z, W / 2, py, 0, W / 2 - 0.5, ph, 2.5, 2), M.PLANK);
  for (const [nx, ny] of [
    [5, 8],
    [W - 5, 8],
    [5, 24],
    [W - 5, 24],
  ])
    add(sdSphere(x, y, z, nx, ny, 2.2, 1.3), M.NAIL);
  return acc.D;
}
sprite('plank', 48, 32, plankScene, { decals: woodGrain });

// ------------------------------------------------------------------ o pacote para o jogo
let js = '// gerado por tools/volume/cena/ui.mjs: as peças do HUD em volume (PNG em data URL)\nexport const HUD_PX = {\n';
for (const [name, s] of Object.entries(sprites)) js += `  '${name}': { w: ${s.w}, h: ${s.h}, url: 'data:image/png;base64,${Buffer.from(s.png).toString('base64')}' },\n`;
js += '};\n';
writeFileSync(MODULE, js);
console.log('sprites', Object.keys(sprites).length, 'js', js.length);
