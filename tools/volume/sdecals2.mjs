// Os detalhes à mão do perfil sentado, para qualquer personagem (o olho de lado, os fios, a orelha,
// as rugas, a boca, as costuras, a cinta, a calça, o sapato e o veio da cadeira).
import { M, hex } from './kit.mjs';
import { SH as H, SW as W } from './seat.mjs';

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function sideDecals(img, Px, P, R, mood = 'idle', part = 'all', seed0 = 11) {
  const { mat } = Px;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (x, y) => (inb(x, y) ? mat[y * W + x] : 0);
  const put = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (!inb(x, y) || !c || !mat[y * W + x]) return;
    const i = (y * W + x) * 4;
    img[i] = Math.round(img[i] + (c[0] - img[i]) * a);
    img[i + 1] = Math.round(img[i + 1] + (c[1] - img[i + 1]) * a);
    img[i + 2] = Math.round(img[i + 2] + (c[2] - img[i + 2]) * a);
  };
  const putOn = (x, y, mats, c, a = 1) => {
    if (mats.includes(at(Math.round(x), Math.round(y)))) put(x, y, c, a);
  };
  const line = (x0, y0, x1, y1, mats, c, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    let last = '';
    for (let i = 0; i <= n; i += 1) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      if (`${x},${y}` === last) continue;
      last = `${x},${y}`;
      putOn(x, y, mats, c, a);
    }
  };
  let seed = seed0;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const S = R[M.SKIN];
  const DARK = hex('#160c0a');
  const upper = part === 'upper' || part === 'all';
  const legs = part === 'legs' || part === 'all';
  const chair = part === 'chair' || part === 'all';
  const my = P.mouthY + 1; // na tela (y + 1)

  if (upper) {
    // ------------------------------------------------------------ o olho de lado
    if (mood === 'blink' || mood === 'hurt' || mood === 'laugh') {
      for (const [x, y, a] of [
        [99, 70, 0.7],
        [100, 70, 1],
        [101, 71, 1],
        [102, 71, 1],
        [103, 71, 1],
        [104, 71, 0.9],
        [105, 70, 0.6],
      ])
        put(x, y, P.lashes ? hex('#0a0404') : DARK, a);
      if (mood === 'hurt') {
        line(96, 66, 99, 64, [M.SKIN], S[1], 0.7);
        line(96, 73, 99, 74, [M.SKIN], S[1], 0.7);
        for (const [x, y, c] of [
          [95, 57, '#e8f6ff'],
          [95, 58, '#a8d8f0'],
          [96, 58, '#bfe4f6'],
          [95, 59, '#7ab8dc'],
        ])
          put(x, y, hex(c));
      }
    } else {
      const cols = new Map();
      for (let y = 60; y < 80; y += 1)
        for (let x = 94; x < 112; x += 1) {
          const m = at(x, y);
          if (m !== M.EYE && m !== M.IRIS) continue;
          const c = cols.get(x) ?? [];
          c.push(y);
          cols.set(x, c);
        }
      const xs = [...cols.keys()].sort((a, b) => a - b);
      if (xs.length) {
        const front = xs[xs.length - 1];
        const IR = R[M.IRIS];
        for (const x of xs) {
          const ys = cols.get(x).sort((a, b) => a - b);
          for (const y of ys) {
            let c;
            if (P.redEyes) c = at(x, y) === M.IRIS ? hex('#ff5a2a') : hex('#8a1008');
            else if (at(x, y) === M.IRIS) c = x === front ? hex('#1a0e0a') : IR[2];
            else c = x <= xs[0] ? hex('#a08c86') : hex('#cbb8b0');
            if (y === ys[0]) c = P.lashes ? hex('#0a0404') : DARK;
            else if (y === ys[ys.length - 1] && at(x, y) !== M.IRIS) c = mix(c, S[3], 0.55);
            put(x, y, c);
          }
        }
        const top = Math.min(...(cols.get(front) ?? [70]));
        put(front + 1, top, P.lashes ? hex('#0a0404') : DARK, 0.85);
        put(front + 1, top - 1, P.lashes ? hex('#0a0404') : DARK, P.lashes ? 0.9 : 0.45);
        if (P.lashes) put(front + 2, top - 2, hex('#0a0404'), 0.7);
        const y0 = Math.min(...[...cols.values()].flat());
        line(xs[0] - 1, y0 - 2, front - 1, y0 - 2, [M.SKIN], S[2], 0.5);
        if (P.bags) line(xs[0], y0 + 7, front - 1, y0 + 7.5, [M.SKIN], S[2], 0.45);
        if (P.redEyes)
          for (let y = y0 - 2; y <= y0 + 6; y += 1)
            for (let x = xs[0] - 2; x <= front + 3; x += 1) if (at(x, y) === M.SKIN) put(x, y, hex('#ff2a1a'), 0.18);
      }
    }
    if (P.bags || P.wrinkles) {
      line(97, 67, 93.5, 65.5, [M.SKIN], S[2], 0.55);
      line(97, 69.5, 93, 69.5, [M.SKIN], S[2], 0.55);
      if (P.wrinkles) line(97, 72, 93.5, 73.5, [M.SKIN], S[2], 0.5);
    }
    // ------------------------------------------------------------ fios
    for (let i = 0; i < 40; i += 1) {
      const x0 = 100 + rnd() * 11;
      const y0 = 58.5 + rnd() * 7;
      const dark = rnd() < 0.6;
      line(x0, y0, x0 + 2, y0 - 1, [M.BROW], dark ? R[M.BROW][0] : R[M.BROW][4], dark ? 0.75 : 0.4);
    }
    const HA = R[M.STACHE];
    if (P.stache) {
      for (let i = 0; i < 60; i += 1) {
        const x0 = 101 + rnd() * 13;
        const y0 = my - 10 + rnd() * 4;
        const len = 3 + rnd() * 6;
        const ang = 0.35 - (x0 - 103) * 0.05 + (rnd() - 0.5) * 0.3;
        const dark = rnd() < 0.55;
        for (let k = 0; k <= len; k += 1) putOn(x0 - Math.sin(ang) * k, y0 + Math.cos(ang) * k, [M.STACHE], dark ? HA[0] : HA[5], dark ? 0.72 : 0.5);
      }
    }
    if (P.beard) {
      for (let i = 0; i < 200; i += 1) {
        const x0 = 64 + rnd() * 50;
        const y0 = 80 + rnd() * 50;
        if (at(Math.round(x0), Math.round(y0)) !== M.BEARD) continue;
        const dark = rnd() < 0.55;
        for (let k = 0; k < 4; k += 1) putOn(x0 + Math.sin(k + i) * 0.4 + k * 0.2, y0 + k, [M.BEARD], dark ? HA[1] : HA[5], dark ? 0.55 : 0.4);
      }
    }
    if (P.stubble) {
      for (let i = 0; i < 220; i += 1) {
        const x = 76 + rnd() * 36;
        const y = 84 + rnd() * 24;
        if (at(Math.round(x), Math.round(y)) !== M.SKIN) continue;
        if (x < 84 && y < 92) continue;
        put(x, y, HA[1], 0.3);
      }
    }
    const HR = R[M.HAIR];
    for (let i = 0; i < 260; i += 1) {
      const x0 = 30 + rnd() * 80;
      const y0 = 2 + rnd() * 120;
      if (at(Math.round(x0), Math.round(y0)) !== M.HAIR) continue;
      const light = y0 < 60 && rnd() < 0.45;
      if (P.hairStyle === 'curly' || P.hairStyle === 'volume' || P.hairStyle === 'bun') {
        const r = 1.6 + rnd() * 1.4;
        for (let t = 0; t < 4; t += 1) putOn(x0 + Math.cos(t * 0.9) * r, y0 + Math.sin(t * 0.9) * r, [M.HAIR], light ? HR[5] : HR[1], 0.5);
      } else if (P.hairStyle === 'bob') line(x0, y0, x0 - 0.8, y0 + 4 + rnd() * 4, [M.HAIR], light ? HR[5] : HR[1], light ? 0.5 : 0.5);
      else line(x0, y0, x0 - 1.5, y0 + 2.5, [M.HAIR], light ? HR[5] : HR[0], light ? 0.5 : 0.55);
    }
    // ------------------------------------------------------------ a orelha (a hélice e a concha)
    for (let t = -1.2; t <= 2.4; t += 0.08) putOn(72.5 - Math.sin(t) * 4.2 + 0.4, 75 - Math.cos(t) * 7.6 + 0.4, [M.SKIN], S[1], 0.55);
    for (const [x, y, a] of [
      [74, 76, 0.75],
      [74, 77, 0.75],
      [73, 77, 0.6],
      [75, 75, 0.5],
    ])
      putOn(x, y, [M.SKIN], S[0], a);
    // ------------------------------------------------------------ a boca e as rugas
    if (mood === 'talk' || mood === 'hurt' || mood === 'laugh') {
      // (aberta no volume; o dente de ouro aparece)
      if (P.goldTooth) for (let x = 104; x <= 109; x += 1) if (at(x, my + 1) === M.TEETH) {
        put(x, my + 1, R[M.GOLD][5]);
        break;
      }
    } else if (!P.stache || P.stache === 'thin' || P.stache === 'handlebar') {
      for (let x = 101; x <= 108; x += 1) if ([M.LIP, M.SKIN].includes(at(x, Math.round(my + 0.7)))) put(x, my + 0.7 - (P.smile ?? 0) * (x > 105 ? 0.8 : 0), R[M.LIP][0], 0.7);
    }
    if (!P.fem && P.age !== 'young') line(104, 85, 101, 92, [M.SKIN], S[2], P.age === 'old' ? 0.55 : 0.35);
    if (P.scar) line(91, 76, 96, 86, [M.SKIN], S[1], 0.8);
    if (P.blush)
      for (let y = 76; y <= 84; y += 1)
        for (let x = 86; x <= 98; x += 1) {
          const r = Math.hypot((x - 92) / 6, (y - 80) / 4);
          if (r < 1 && at(x, y) === M.SKIN) put(x, y, hex(P.blush), 0.25 * (1 - r));
        }
    // ------------------------------------------------------------ a roupa
    const T = R[M.TOP];
    const o = P.outfit;
    if (o.plaid) {
      const c = hex(o.plaid);
      for (let y = 100; y < 250; y += 1) for (let x = 20; x < 140; x += 1) if (at(x, y) === M.TOP && (x % 7 === 2 || y % 7 === 3)) put(x, y, c, 0.4);
    }
    if (o.stripes && o.type !== 'uniform') for (let y = 100; y < 250; y += 1) for (let x = 20; x < 140; x += 1) if (at(x, y) === M.TOP && x % 4 === 1) put(x, y, hex(o.stripes), 0.6);
    if (o.stripes && o.type === 'uniform') for (let x = 20; x < 140; x += 1) for (const y of [172, 173, 174]) if (at(x, y) === M.TOP) put(x, y, hex(o.stripes), y === 173 ? 0.9 : 0.6);
    if (o.type === 'cardigan') for (let y = 104; y < 240; y += 2) for (let x = 20; x < 140; x += 3) if (at(x, y) === M.TOP) put(x, y, T[2], 0.45);
    // a cava do ombro
    if (o.type !== 'tank') {
      const dx = P.broad ? -2.6 : P.fem ? 3 : 0;
      for (const [a, b, c2, d2] of [
        [67 + dx, 118, 72 + dx, 122],
        [72 + dx, 122, 75 + dx, 130],
        [75 + dx, 130, 74.5 + dx, 140],
        [56 + dx, 121, 53 + dx, 128],
        [53 + dx, 128, 52.5 + dx, 137],
      ])
        line(a, b, c2, d2, [M.TOP], T[1], 0.6);
    }
    // a cinta: os passadores
    for (const x of [58, 74, 88]) {
      for (let y = 196; y <= 214; y += 1) if (at(x, y) === M.BELT && at(x, y - 1) !== M.BELT) {
        put(x, y - 1, R[M.BELT][3], 0.9);
        put(x, y, R[M.BELT][1], 0.9);
        put(x, y + 1, R[M.BELT][1], 0.9);
        break;
      }
    }
    // os pelos do braço e as unhas (quem tem o braço de fora)
    for (let i = 0; i < 22; i += 1) {
      const t = rnd();
      const x = 78 + t * 32;
      const y = 185 + t * 16 + (rnd() - 0.5) * 6;
      if (at(Math.round(x), Math.round(y)) !== M.SKIN || P.fem) continue;
      put(x, y, S[2], 0.6);
    }
  }

  if (legs) {
    const PA = R[M.PANTS];
    if (P.outfit.type !== 'robe' && !P.fem) {
      line(62, 222, 100, 223, [M.PANTS], PA[5], 0.35);
      line(100, 223, 163, 224, [M.PANTS], PA[5], 0.35);
      line(166, 236, 164, 288, [M.PANTS], PA[5], 0.3);
      for (const [x0, y0, x1, y1] of [
        [42, 214, 52, 213],
        [52, 213, 53, 226],
        [96, 210, 108, 218],
        [104, 223, 114, 226],
        [150, 228, 155, 233],
        [146, 230, 150, 235],
      ])
        line(x0, y0, x1, y1, [M.PANTS], PA[1], 0.55);
    }
    for (let x = 120; x <= 220; x += 2)
      for (let y = 300; y <= 322; y += 1) if (at(x, y) === M.SHOE && at(x, y + 1) === M.SOLE) {
        put(x, y, R[M.SHOE][5], 0.55);
        break;
      }
  }

  if (chair) {
    for (let i = 0; i < 90; i += 1) {
      const x = Math.round(8 + rnd() * 150);
      const y = Math.round(120 + rnd() * 202);
      const m = at(x, y);
      if (m !== M.WOOD && m !== M.WOODD) continue;
      const vertical = at(x, y - 2) === m && at(x, y + 2) === m && (at(x - 3, y) !== m || at(x + 3, y) !== m);
      const len = 2 + Math.round(rnd() * 4);
      for (let k = 0; k < len; k += 1) {
        const px = vertical ? x : x + k;
        const py = vertical ? y + k : y;
        if (at(px, py) === m) put(px, py, R[m][1], 0.35);
      }
    }
  }
  if (P.rim && upper) {
    const c = hex(P.rim);
    for (let y = 1; y < H - 1; y += 1)
      for (let x = 1; x < W - 1; x += 1) {
        if (!at(x, y) || at(x, y) === M.WOOD || at(x, y) === M.WOODD) continue;
        if (!at(x + 1, y) || !at(x, y - 1)) put(x, y, c, 0.5);
      }
  }
}
