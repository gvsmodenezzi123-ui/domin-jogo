// node bake.mjs <outDir> <keys...> — renderiza todos os quadros de cada personagem e grava o módulo
// de dados dele (<outDir>/<key>.js): de frente (parado, humores e emotes) e de lado sentado (as
// pernas, o corpo parado, os humores e os emotes). Humores e emotes vão como recortes do parado.
import { mkdirSync, writeFileSync } from 'node:fs';
import { cleanup, compose, pixelize, render } from './r3d.mjs';
import { FH, FW, frontCfg } from './front.mjs';
import { SH, SW, seatCfg } from './seat.mjs';
import { paramsOf } from './cast.mjs';
import { frontDecals } from './fdecals.mjs';
import { sideDecals } from './sdecals2.mjs';
import { EYE_Y, EYE_Z } from './head.mjs';
import { GESTURE_FACE, GESTURE_N, frontGesture, sideGesture } from './gestures.mjs';

const A = new URL('../../src/components/art/', import.meta.url).href;
const { PORTRAITS, NPC_PORTRAITS } = await import(A + 'portraitSpecs.js');
const all = { ...PORTRAITS, ...NPC_PORTRAITS };
const [outDir, ...keys] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const SS_BASE = Number(process.env.SS_BASE ?? 2);
const SS = Number(process.env.SS ?? 2);
const SS_G = Number(process.env.SS_G ?? 1);
const MOODS = ['blink', 'talk', 'thinking', 'smug', 'hurt'];

function run(cfg, ss) {
  const R = render(cfg, ss);
  const Px = pixelize(cfg, R);
  cleanup(cfg, Px);
  return { img: compose(cfg, Px), Px };
}

// ------------------------------------------------------------------ os codificadores
function rle(idx, wide) {
  const bytes = [];
  for (let p = 0; p < idx.length; ) {
    let n = 1;
    while (p + n < idx.length && idx[p + n] === idx[p] && n < 255) n += 1;
    bytes.push(n);
    if (wide) bytes.push(idx[p] >> 8, idx[p] & 255);
    else bytes.push(idx[p]);
    p += n;
  }
  return Buffer.from(bytes).toString('base64');
}
function pack(w, h, get, x0 = 0, y0 = 0) {
  // get(x, y) → null (transparente), 'keep' (fica o de baixo) ou [r, g, b, a]
  const pal = new Map([['t', 0], ['k', 1]]);
  const idx = new Uint16Array(w * h);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const c = get(x0 + x, y0 + y);
      const key = c === null ? 't' : c === 'keep' ? 'k' : c.join(',');
      if (!pal.has(key)) pal.set(key, pal.size);
      idx[y * w + x] = pal.get(key);
    }
  const wide = pal.size > 255;
  const palBytes = [];
  for (const k of pal.keys()) palBytes.push(...(k === 't' || k === 'k' ? [0, 0, 0, 0] : k.split(',').map(Number)));
  return { x: x0, y: y0, w, h, i: wide ? 2 : 1, p: Buffer.from(palBytes).toString('base64'), d: rle(idx, wide) };
}
const px = (img, W, x, y) => {
  const i = (y * W + x) * 4;
  return img[i + 3] ? [img[i], img[i + 1], img[i + 2], img[i + 3]] : null;
};
const same = (a, b) => (a === null && b === null) || (a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]);
function full(img, W, H) {
  return pack(W, H, (x, y) => px(img, W, x, y));
}
/** O recorte do que muda de `base` para `img` (dentro de `reg`, se houver). */
function delta(base, img, W, H, reg = [0, 0, W, H]) {
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = reg[1]; y < reg[3]; y += 1)
    for (let x = reg[0]; x < reg[2]; x += 1) {
      if (same(px(base, W, x, y), px(img, W, x, y))) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  if (x1 < 0) return { x: 0, y: 0, w: 0, h: 0, i: 1, p: '', d: '' };
  return pack(x1 - x0 + 1, y1 - y0 + 1, (x, y) => {
    const a = px(base, W, x, y);
    const b = px(img, W, x, y);
    return same(a, b) ? 'keep' : b;
  }, x0, y0);
}
/**
 * O recorte do emote: só onde o quadro `g` (renderizado em `ss` baixo) difere do mesmo rosto sem o
 * gesto (`ref`, no mesmo `ss`), um pixel a mais em volta; ali vale o pixel do `g`.
 */
function maskDelta(top, ref, g, W, H) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) if (!same(px(ref, W, x, y), px(g, W, x, y))) mask[y * W + x] = 1;
  const grow = Uint8Array.from(mask);
  for (let y = 1; y < H - 1; y += 1)
    for (let x = 1; x < W - 1; x += 1) if (mask[y * W + x - 1] || mask[y * W + x + 1] || mask[(y - 1) * W + x] || mask[(y + 1) * W + x]) grow[y * W + x] = 1;
  const out = Uint8ClampedArray.from(top);
  for (let p = 0; p < W * H; p += 1) if (grow[p]) out.set(g.subarray(p * 4, p * 4 + 4), p * 4);
  return delta(top, out, W, H);
}

/** Cola a região `reg` de `img` em cima de uma cópia de `base`. */
function patch(base, img, W, reg) {
  const out = Uint8ClampedArray.from(base);
  for (let y = reg[1]; y < reg[3]; y += 1)
    for (let x = reg[0]; x < reg[2]; x += 1) {
      const i = (y * W + x) * 4;
      out[i] = img[i];
      out[i + 1] = img[i + 1];
      out[i + 2] = img[i + 2];
      out[i + 3] = img[i + 3];
    }
  return out;
}

const FACE_F = [44, 26, 136, 118];
const FACE_S = [62, 34, 136, 118];
const GEST_S = [20, 40, 200, 250];

for (const key of keys) {
  const t0 = performance.now();
  const P = paramsOf(key, all[key]);
  const data = { front: {}, frontG: {}, side: {}, sideG: {}, spots: {} };
  // ---------------------------------------------------------------- de frente
  const fBaseCfg = frontCfg(P, 'idle');
  const fb = run(fBaseCfg, SS_BASE);
  frontDecals(fb.img, fb.Px, P, fBaseCfg.ramps, 'idle', 7);
  data.front.idle = full(fb.img, FW, FH);
  for (const mood of MOODS) {
    const cfg = { ...frontCfg(P, mood), region: FACE_F };
    const r = run(cfg, SS);
    frontDecals(r.img, r.Px, P, cfg.ramps, mood, 7);
    data.front[mood] = delta(fb.img, patch(fb.img, r.img, FW, FACE_F), FW, FH);
  }
  // os emotes: só o braço (e o rosto da risada) por cima do rosto do gesto
  const fRef = {};
  const fTop = {};
  for (const face of ['idle', 'smug']) {
    const c = frontCfg(P, face);
    const r = run(c, SS_G);
    frontDecals(r.img, r.Px, P, c.ramps, face, 7);
    fRef[face] = r.img;
    fTop[face] = face === 'idle' ? fb.img : patch(fb.img, (() => {
      const c2 = { ...frontCfg(P, face), region: FACE_F };
      const r2 = run(c2, SS);
      frontDecals(r2.img, r2.Px, P, c2.ramps, face, 7);
      return r2.img;
    })(), FW, FACE_F);
  }
  for (const [id, n] of Object.entries(GESTURE_N)) {
    data.frontG[id] = [];
    const mood = GESTURE_FACE[id];
    const base = mood === 'smug' ? 'smug' : 'idle';
    for (let f = 0; f < n; f += 1) {
      const cfg = frontCfg(P, mood, frontGesture(id, f));
      const r = run(cfg, SS_G);
      frontDecals(r.img, r.Px, P, cfg.ramps, mood, 7);
      data.frontG[id].push(maskDelta(fTop[base], fRef[base], r.img, FW, FH));
    }
  }
  // ---------------------------------------------------------------- de lado, sentado
  const legsCfg = seatCfg(P, 'legs', 'idle');
  const lg = run(legsCfg, SS);
  sideDecals(lg.img, lg.Px, P, legsCfg.ramps, 'idle', 'legs', 11);
  data.side.legs = full(lg.img, SW, SH);
  const upCfg = seatCfg(P, 'upper', 'idle');
  const up = run(upCfg, SS_BASE);
  sideDecals(up.img, up.Px, P, upCfg.ramps, 'idle', 'upper', 11);
  data.side.idle = full(up.img, SW, SH);
  for (const mood of MOODS) {
    const cfg = { ...seatCfg(P, 'upper', mood), region: FACE_S };
    const r = run(cfg, SS);
    sideDecals(r.img, r.Px, P, cfg.ramps, mood, 'upper', 11);
    data.side[mood] = delta(up.img, patch(up.img, r.img, SW, FACE_S), SW, SH);
  }
  const sRef = {};
  const sTop = {};
  for (const face of ['idle', 'smug']) {
    const c = { ...seatCfg(P, 'upper', face), region: GEST_S };
    const r = run(c, SS_G);
    sideDecals(r.img, r.Px, P, c.ramps, face, 'upper', 11);
    sRef[face] = patch(up.img, r.img, SW, GEST_S);
    if (face === 'idle') sTop[face] = up.img;
    else {
      const c2 = { ...seatCfg(P, 'upper', face), region: FACE_S };
      const r2 = run(c2, SS);
      sideDecals(r2.img, r2.Px, P, c2.ramps, face, 'upper', 11);
      sTop[face] = patch(up.img, r2.img, SW, FACE_S);
    }
  }
  for (const [id, n] of Object.entries(GESTURE_N)) {
    data.sideG[id] = [];
    const mood = GESTURE_FACE[id];
    const base = mood === 'smug' ? 'smug' : 'idle';
    for (let f = 0; f < n; f += 1) {
      const cfg = { ...seatCfg(P, 'upper', mood, 'madeira', sideGesture(id, f)), region: GEST_S };
      const r = run(cfg, SS_G);
      sideDecals(r.img, r.Px, P, cfg.ramps, mood, 'upper', 11);
      data.sideG[id].push(maskDelta(sTop[base], sRef[base], patch(up.img, r.img, SW, GEST_S), SW, SH));
    }
  }
  // ---------------------------------------------------------------- os pontos (fumaça, brilho dos olhos)
  if (P.smokes) {
    const e = P.cigFront.e;
    const s = P.cigSide.e;
    data.spots.ember = { x: +(e[0] / 2 - 12).toFixed(1), y: +(e[1] / 2).toFixed(1), grid: 64 };
    data.spots.sideEmber = { x: +((s[2] + 81) / 2).toFixed(1), y: +((s[1] + 1) / 2).toFixed(1) };
  }
  data.spots.eyes = [
    [38.25 - 12, EYE_Y / 2],
    [49.75 - 12, EYE_Y / 2],
  ];
  data.spots.sideEye = [+((EYE_Z + 6 + 81) / 2).toFixed(1), +((EYE_Y + 1) / 2).toFixed(1)];
  const js = `// gerado por tools/volume (não editar à mão): o ${key} em volume, de frente e sentado.\nexport default ${JSON.stringify(data)};\n`;
  writeFileSync(`${outDir}/${key}.js`, js);
  console.log(key, ((performance.now() - t0) / 1000).toFixed(0) + 's', (js.length / 1024).toFixed(0) + 'KB');
}
