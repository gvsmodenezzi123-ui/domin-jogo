// Os detalhes desenhados à mão por cima do volume: gola, olhos, fios, rugas, dedos, costuras.
import { EYES, H, RAMPS, W } from './front.mjs';
import { M } from './model.mjs';
import { hex, mix } from '../../src/components/art/figKit.js';

export function decals(img, P, { mood = 'idle', look = null } = {}) {
  const { mat } = P;
  look = look ?? (mood === 'thinking' ? [-1.2, -1.7] : [0, 0]);
  const shut = mood === 'blink' || mood === 'hurt';
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (x, y) => (inb(x, y) ? mat[y * W + x] : 0);
  const put = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (!inb(x, y) || !c) return;
    const i = (y * W + x) * 4;
    if (a >= 1 || img[i + 3] === 0) {
      img[i] = c[0];
      img[i + 1] = c[1];
      img[i + 2] = c[2];
      img[i + 3] = 255;
      return;
    }
    img[i] = Math.round(img[i] + (c[0] - img[i]) * a);
    img[i + 1] = Math.round(img[i + 1] + (c[1] - img[i + 1]) * a);
    img[i + 2] = Math.round(img[i + 2] + (c[2] - img[i + 2]) * a);
  };
  const get = (x, y) => {
    const i = (y * W + x) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  const shade = (x, y, k) => {
    // escurece o que já está lá (a sombra de contato), puxando para o roxo
    if (!inb(x, y) || !at(x, y)) return;
    put(x, y, mix(mix(get(x, y), [0, 0, 0], 0.45), hex('#2a1430'), 0.25), k);
  };
  const S = RAMPS[M.SKIN];
  let seed0 = 3;
  const rnd0 = () => {
    seed0 = (seed0 * 1103515245 + 12345) & 0x7fffffff;
    return seed0 / 0x7fffffff;
  };
  const C = RAMPS[M.COLLAR];
  const HAIR = RAMPS[M.STACHE];
  const inPoly = (pts, x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const lineAA = (x0, y0, x1, y1, c, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    let last = '';
    for (let i = 0; i <= n; i += 1) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      if (`${x},${y}` === last) continue;
      last = `${x},${y}`;
      put(x, y, c, a);
    }
  };

  // os pelos do peito no decote: fios curtos e escuros, mais no meio
  for (let i = 0; i < 40; i += 1) {
    const x = Math.round(88 + (rnd0() - 0.5) * 14);
    const y = Math.round(114 + rnd0() * 15);
    if (at(x, y) !== M.CHEST || at(x, y - 1) !== M.CHEST) continue;
    put(x, y, HAIR[1], 0.7);
    if (rnd0() < 0.5) put(x + (rnd0() < 0.5 ? -1 : 1), y - 1, HAIR[2], 0.5);
  }

  // ---------------------------------------------------------------- os olhos
  if (shut) {
    for (const [cx, cy] of [EYES.L, EYES.R]) {
      for (let i = -6; i <= 6; i += 1) put(cx + i, cy + 1.6 + Math.abs(i) * -0.12 + (i * i) / 40, hex('#1e100c'), Math.abs(i) > 5 ? 0.6 : 1);
      for (let i = -4; i <= 4; i += 1) put(cx + i, cy + 0.4, S[4], 0.5);
    }
  }
  if (mood === 'hurt') {
    // apertando os olhos: as rugas em leque nos cantos e a dobra em cima
    for (const [side, [cx, cy]] of [
      [-1, EYES.L],
      [1, EYES.R],
    ]) {
      const ox = cx + side * 7.5;
      lineAA(ox, cy + 1, ox + side * 3, cy - 1.5, S[1], 0.8);
      lineAA(ox, cy + 2, ox + side * 3.5, cy + 2.5, S[1], 0.8);
      lineAA(ox, cy + 3, ox + side * 3, cy + 5.5, S[1], 0.7);
      for (let i = -4; i <= 4; i += 1) put(cx + i, cy - 1.2 + Math.abs(i) * 0.1, S[2], 0.6);
    }
    // o suor escorrendo da têmpora
    for (const [x, y, c] of [
      [118, 58, '#e8f6ff'],
      [118, 59, '#a8d8f0'],
      [119, 59, '#bfe4f6'],
      [118, 60, '#7ab8dc'],
      [119, 60, '#a8d8f0'],
    ])
      put(x, y, hex(c));
  }
  for (const [side, [cx, cy]] of shut ? [] : [
    [-1, EYES.L],
    [1, EYES.R],
  ]) {
    const lit = side < 0;
    const icx = cx + look[0];
    const icy = cy + 0.6 + look[1];
    // o branco: a linha de cima (cílios) bem escura; os cantos na sombra
    for (let y = Math.floor(cy - 6); y <= cy + 6; y += 1) {
      for (let x = Math.floor(cx - 8); x <= cx + 8; x += 1) {
        if (at(x, y) !== M.EYE) continue;
        const up = at(x, y - 1) !== M.EYE;
        const down = at(x, y + 1) !== M.EYE;
        const outer = side < 0 ? x < cx - 4 : x > cx + 4;
        let c = lit ? hex('#e8ddd6') : hex('#cbbcb5');
        if (outer || Math.abs(x + 0.5 - cx) > 5) c = lit ? hex('#c4b0a8') : hex('#a8948c');
        const r = Math.hypot(x + 0.5 - icx, y + 0.5 - icy);
        if (r < 3.35) {
          c = y + 0.5 < icy ? hex('#3a2014') : hex('#6a3e22');
          if (r > 2.65) c = hex('#24140e');
          if (r < 1.35) c = hex('#0c0606');
        }
        if (up) c = hex('#160c0a');
        else if (at(x, y - 2) !== M.EYE && r >= 3.35) c = mix(c, hex('#6a5a56'), 0.55);
        if (down && r >= 2.4) c = mix(c, S[2], 0.5);
        put(x, y, c);
      }
    }
    // o brilho na pupila (em cima e à esquerda)
    const hx = Math.round(icx - 1.2);
    const hy = Math.round(icy - 1.4);
    if (at(hx, hy) === M.EYE && at(hx, hy - 1) === M.EYE) put(hx, hy, hex('#ffffff'));
    // a linha dos cílios passa um pouco do canto de fora
    const ox = side < 0 ? Math.floor(cx - 7) : Math.ceil(cx + 6);
    put(ox, Math.round(cy - 1), hex('#160c0a'));
    put(ox + side * -0 - (side < 0 ? 1 : -1), Math.round(cy), hex('#2a1612'), 0.8);
    // os pés de galinha e a dobra da bolsa (o cansado)
    const fx = side < 0 ? cx - 9 : cx + 9;
    lineAA(fx, cy - 0.5, fx - side * -2, cy - 2, S[2], 0.7);
    lineAA(fx, cy + 1.5, fx - side * -2.5, cy + 2.2, S[2], 0.7);
    lineAA(fx, cy + 3, fx - side * -2, cy + 4.6, S[2], 0.6);
    for (let i = -4; i <= 4; i += 1) put(cx + i, cy + 8.6 + Math.abs(i) * -0.18, S[2], 0.55);
  }

  // ---------------------------------------------------------------- sobrancelhas e bigode: os fios
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  // o bigode: fios que nascem embaixo do nariz e descem para fora, uns escuros, uns com luz
  for (let i = 0; i < 70; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x0 = 88 + side * (1 + rnd() * 13);
    const y0 = 85 + rnd() * 4;
    const len = 3 + rnd() * 5;
    const ang = side * (0.35 + (Math.abs(x0 - 88) / 14) * 0.7) + (rnd() - 0.5) * 0.25;
    const dark = rnd() < 0.62;
    for (let k = 0; k <= len; k += 1) {
      const x = Math.round(x0 + Math.sin(ang) * k);
      const y = Math.round(y0 + Math.cos(ang) * k * 0.9);
      if (at(x, y) !== M.STACHE) continue;
      put(x, y, dark ? HAIR[0] : HAIR[y < 88 ? 5 : 4], dark ? 0.75 : 0.55);
    }
  }
  // as pontas soltas na borda de baixo do bigode
  for (let x = 72; x <= 104; x += 1) {
    for (let y = 86; y <= 100; y += 1) {
      if (at(x, y) === M.STACHE && at(x, y + 1) !== M.STACHE && rnd() < 0.45) put(x, y + 1, HAIR[1], 0.85);
    }
  }
  // as sobrancelhas: fios curtos inclinados para fora e para cima
  for (let i = 0; i < 46; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x0 = 88 + side * (4 + rnd() * 16);
    const y0 = 60.5 + rnd() * 4.5 + (Math.abs(x0 - 88) - 4) * 0.12;
    const dark = rnd() < 0.6;
    for (let k = 0; k < 3; k += 1) {
      const x = Math.round(x0 + side * k * 0.9);
      const y = Math.round(y0 - k * 0.5);
      if (at(x, y) !== M.BROW) continue;
      put(x, y, dark ? HAIR[0] : HAIR[4], dark ? 0.8 : 0.35);
    }
  }

  // ---------------------------------------------------------------- as dobras do rosto
  lineAA(79, 84, 74.5, 92.5, S[2], 0.55);
  lineAA(97, 84, 101.5, 92.5, S[1], 0.6);
  put(87, 80, S[6]);
  put(86, 81, S[6], 0.6);

  // ---------------------------------------------------------------- a camisa
  // a costura da cava (do alto do ombro contornando o deltoide até a axila) e as dobras da axila
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : 176 - x);
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const x = 52.5 + Math.sin(t * 1.9) * 4.2;
      const y = 115.5 + t * 20;
      if (at(Math.round(X(x)), Math.round(y)) === M.SHIRT) put(X(x), y, RAMPS[M.SHIRT][1], 0.7);
    }
    lineAA(X(58.5), 128.5, X(65), 133, RAMPS[M.SHIRT][1], 0.75);
    lineAA(X(59.5), 127.5, X(66), 132, RAMPS[M.SHIRT][4], 0.35);
    lineAA(X(58), 133, X(62.5), 136, RAMPS[M.SHIRT][1], 0.6);
  }

  // ---------------------------------------------------------------- o chapéu: o laço e o brilho
  for (const [x, y, t] of [
    [61, 37, 3],
    [62, 37, 4],
    [61, 38, 2],
    [60, 38, 3],
    [62, 38, 3],
  ])
    put(x, y, RAMPS[M.BAND][t]);
  // falando: a boca aberta embaixo do bigode (o escuro, o lábio de baixo e uma sombra de dente)
  if (mood === 'talk' || mood === 'hurt') {
    const big = mood === 'hurt' ? 1 : 0;
    for (let x = 81 - big; x <= 96 + big; x += 1) {
      const e = Math.abs(x - 88.5) / (7.5 + big);
      const h = (e < 0.55 ? 2 : 1) + (big && e < 0.8 ? 1 : 0);
      for (let k = 0; k < h; k += 1) put(x, 94 + k, hex('#2a0a0e'));
      put(x, 94 + h, RAMPS[M.LIP][e < 0.5 ? 5 : 4], 0.85);
    }
    for (let x = 85; x <= 92; x += 1) put(x, 94, hex('#cfc4b4'), big ? 0.8 : 0.3);
  }
  // o cigarro: a brasa acesa (no hurt o cigarro caiu)
  if (mood !== 'hurt') {
    put(114, 99, hex('#ffe08a'));
    put(114, 98, hex('#ff9a2a'), 0.8);
  }
}
