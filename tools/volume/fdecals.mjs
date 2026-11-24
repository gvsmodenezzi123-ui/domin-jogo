// Os detalhes à mão do busto de frente, para qualquer personagem: os olhos (íris, cílios, brilho),
// as rugas, os fios (sobrancelha, bigode, barba, cabelo, barba por fazer), a boca, o dente de
// ouro, o rubor, a cicatriz, os olhos vermelhos, o brilho dos óculos e as estampas da roupa.
import { M, hex } from './kit.mjs';
import { FW as W, FH as H } from './front.mjs';

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// os algarismos 3×5 (o número da camisa)
const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

export function frontDecals(img, Px, P, R, mood = 'idle', seed0 = 7) {
  const { mat } = Px;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (x, y) => (inb(x, y) ? mat[y * W + x] : 0);
  const put = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (!inb(x, y) || !c) return;
    const i = (y * W + x) * 4;
    if (!img[i + 3]) return;
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
      if (!mats || mats.includes(at(x, y))) put(x, y, c, a);
    }
  };
  let seed = seed0;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const S = R[M.SKIN];
  const SK = [M.SKIN, M.CHEST];
  const shut = mood === 'blink' || mood === 'hurt' || mood === 'laugh';
  const look = mood === 'thinking' ? [-1.2, -1.7] : [0, 0];
  const DARK = hex('#160c0a');
  const EYES = [
    [-1, [76.5, 68.6]],
    [1, [99.5, 68.6]],
  ];
  const my = P.mouthY;

  // ------------------------------------------------------------ os olhos
  if (shut) {
    for (const [, [cx, cy]] of EYES) {
      for (let i = -6; i <= 6; i += 1) put(cx + i, mood === 'laugh' ? cy + 1.2 - (36 - i * i) / 18 + 2 : cy + 1.6 + (i * i) / 40 - Math.abs(i) * 0.12, P.lashes ? hex('#0e0606') : DARK, Math.abs(i) > 5 ? 0.6 : 1);
      if (P.lashes) {
        put(cx + (cx < 88 ? -7 : 7), cy + 0.8, hex('#0e0606'), 0.8);
        put(cx + (cx < 88 ? -8 : 8), cy + 0.2, hex('#0e0606'), 0.5);
      }
    }
    if (mood === 'hurt') {
      for (const [side, [cx, cy]] of EYES) {
        const ox = cx + side * 7.5;
        line(ox, cy + 1, ox + side * 3, cy - 1.5, SK, S[1], 0.8);
        line(ox, cy + 2, ox + side * 3.5, cy + 2.5, SK, S[1], 0.8);
        line(ox, cy + 3, ox + side * 3, cy + 5.5, SK, S[1], 0.7);
      }
      for (const [x, y, c] of [
        [118, 58, '#e8f6ff'],
        [118, 59, '#a8d8f0'],
        [119, 59, '#bfe4f6'],
        [118, 60, '#7ab8dc'],
        [119, 60, '#a8d8f0'],
      ])
        put(x, y, hex(c));
    }
  } else {
    const IR = R[M.IRIS];
    for (const [side, [cx, cy]] of EYES) {
      const lit = side < 0;
      const icx = cx + look[0];
      const icy = cy + 0.6 + look[1];
      const ir = P.fem ? 3.5 : 3.35;
      for (let y = Math.floor(cy - 7); y <= cy + 7; y += 1) {
        for (let x = Math.floor(cx - 8); x <= cx + 8; x += 1) {
          if (at(x, y) !== M.EYE) continue;
          const up = at(x, y - 1) !== M.EYE;
          const down = at(x, y + 1) !== M.EYE;
          const outer = side < 0 ? x < cx - 4 : x > cx + 4;
          let c = P.redEyes ? hex('#3a0a0a') : lit ? hex('#e8ddd6') : hex('#cbbcb5');
          if (!P.redEyes && (outer || Math.abs(x + 0.5 - cx) > 5)) c = lit ? hex('#c4b0a8') : hex('#a8948c');
          const r = Math.hypot(x + 0.5 - icx, y + 0.5 - icy);
          if (P.redEyes) {
            if (r < 3.4) c = r < 1.6 ? hex('#fff0c0') : r < 2.6 ? hex('#ff5a2a') : hex('#c8180a');
          } else if (r < ir) {
            c = y + 0.5 < icy ? IR[2] : IR[4];
            if (r > ir - 0.7) c = IR[1];
            if (r < 1.35) c = hex('#0c0606');
          }
          if (up) c = P.lashes ? hex('#0a0404') : DARK;
          else if (at(x, y - 2) !== M.EYE && r >= ir && !P.redEyes) c = mix(c, hex('#6a5a56'), 0.55);
          if (down && r >= 2.4 && !P.redEyes) c = mix(c, S[2], 0.5);
          put(x, y, c);
        }
      }
      if (!P.redEyes) {
        const hx = Math.round(icx - 1.2);
        const hy = Math.round(icy - 1.4);
        if (at(hx, hy) === M.EYE && at(hx, hy - 1) === M.EYE) put(hx, hy, hex('#ffffff'));
      }
      // os cílios passam do canto de fora (nas mulheres, o risco puxado para cima)
      const ox = side < 0 ? Math.floor(cx - 7) : Math.ceil(cx + 6);
      put(ox, Math.round(cy - 1), DARK);
      put(ox - side, Math.round(cy), hex('#2a1612'), 0.8);
      if (P.lashes) {
        put(ox + side, Math.round(cy - 2), hex('#0a0404'));
        put(ox + side * 2, Math.round(cy - 3), hex('#0a0404'), 0.8);
        for (let i = -4; i <= 4; i += 1) put(cx + i, cy - 5.4 + Math.abs(i) * 0.15, mix(S[3], hex('#7a4a8a'), 0.3), 0.35);
      }
    }
  }
  // as rugas dos olhos: pés de galinha e a dobra da bolsa (os cansados e os velhos)
  if (P.bags || P.wrinkles) {
    for (const [side, [cx, cy]] of EYES) {
      const fx = side < 0 ? cx - 9 : cx + 9;
      line(fx, cy - 0.5, fx + side * 2, cy - 2, SK, S[2], 0.6);
      line(fx, cy + 1.5, fx + side * 2.5, cy + 2.2, SK, S[2], 0.6);
      if (P.wrinkles) line(fx, cy + 3, fx + side * 2, cy + 4.6, SK, S[2], 0.5);
      for (let i = -4; i <= 4; i += 1) put(cx + i, cy + 8.6 + Math.abs(i) * -0.18, S[2], P.bags ? 0.5 : 0.35);
    }
  }
  if (P.wrinkles && (!P.hat || P.hatBase < 44)) {
    // as rugas da testa
    for (const yy of [50, 53.5]) for (let x = 76; x <= 100; x += 1) putOn(x, yy + Math.sin((x - 88) / 7) * 0.8, SK, S[2], 0.35);
  }

  // ------------------------------------------------------------ sobrancelha, bigode, barba, cabelo
  const HAIR = R[M.STACHE];
  for (let i = 0; i < 46; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x0 = 88 + side * (4 + rnd() * 16);
    const y0 = 59.5 + rnd() * 6;
    const dark = rnd() < 0.6;
    for (let k = 0; k < 3; k += 1) putOn(x0 + side * k * 0.9, y0 - k * 0.5, [M.BROW], dark ? R[M.BROW][0] : R[M.BROW][4], dark ? 0.75 : 0.35);
  }
  if (P.stache) {
    for (let i = 0; i < 70; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const x0 = 88 + side * (1 + rnd() * 13);
      const y0 = my - 10.4 + rnd() * 4;
      const len = 3 + rnd() * 5;
      const ang = side * (0.35 + (Math.abs(x0 - 88) / 14) * 0.7) + (rnd() - 0.5) * 0.25;
      const dark = rnd() < 0.62;
      for (let k = 0; k <= len; k += 1) {
        const x = x0 + Math.sin(ang) * k;
        const y = y0 + Math.cos(ang) * k * 0.9;
        putOn(x, y, [M.STACHE], dark ? HAIR[0] : HAIR[y < my - 7 ? 5 : 4], dark ? 0.7 : 0.55);
      }
    }
    for (let x = 70; x <= 106; x += 1)
      for (let y = my - 12; y <= my + 6; y += 1) if (at(x, y) === M.STACHE && at(x, y + 1) !== M.STACHE && at(x, y + 1) && rnd() < 0.45) put(x, y + 1, HAIR[1], 0.8);
  }
  if (P.beard) {
    // a barba: fios ondulados descendo
    for (let i = 0; i < 220; i += 1) {
      const x0 = 60 + rnd() * 56;
      const y0 = 78 + rnd() * 50;
      if (at(Math.round(x0), Math.round(y0)) !== M.BEARD) continue;
      const dark = rnd() < 0.55;
      const sway = (x0 - 88) * 0.04;
      for (let k = 0; k < 4; k += 1) putOn(x0 + sway * k + Math.sin(k + i) * 0.4, y0 + k, [M.BEARD], dark ? HAIR[1] : HAIR[5], dark ? 0.55 : 0.4);
    }
  }
  if (P.stubble) {
    // a barba por fazer: pontinhos no queixo, nas bochechas de baixo e em cima da boca
    const C = R[M.STACHE][1];
    for (let i = 0; i < 260; i += 1) {
      const x = 64 + rnd() * 48;
      const y = 80 + rnd() * 30;
      const ax = Math.abs(x - 88);
      const inBeard = (y > 86 + Math.max(0, 14 - ax) * 0.2 || (y > my - 5 && y < my - 1 && ax < 9)) && ax < 25 - Math.max(0, y - 98) * 0.6;
      if (!inBeard || at(Math.round(x), Math.round(y)) !== M.SKIN) continue;
      put(x, y, C, 0.32);
    }
  }
  // o cabelo: fios curtos (os cachos fazem arcos; o penteado para trás, fios longos e brilho)
  const HR = R[M.HAIR];
  const style = P.hairStyle;
  for (let i = 0; i < 420; i += 1) {
    const x0 = 46 + rnd() * 84;
    const y0 = 2 + rnd() * 108;
    if (at(Math.round(x0), Math.round(y0)) !== M.HAIR) continue;
    const light = rnd() < 0.42;
    if (style === 'curly' || style === 'volume' || style === 'bun') {
      const r = 1.6 + rnd() * 1.4;
      for (let t = 0; t < 4; t += 1) putOn(x0 + Math.cos(t * 0.9) * r, y0 + Math.sin(t * 0.9) * r, [M.HAIR], light ? HR[5] : HR[1], light ? 0.5 : 0.55);
    } else if (style === 'bob') {
      // o chanel: fios compridos descendo, as pontas virando para dentro; mais claros na faixa do brilho
      const dir = x0 < 88 ? -1 : 1;
      const len = 3.5 + rnd() * 5;
      const band = y0 > 31 && y0 < 43;
      line(x0, y0, x0 - dir * 0.5, y0 + len, [M.HAIR], light || band ? HR[5] : HR[1], band ? 0.6 : light ? 0.42 : 0.5);
    } else if (style === 'slick') {
      const dir = x0 < 88 ? -1 : 1;
      line(x0, y0, x0 + dir * 3, y0 + 1.2, [M.HAIR], light ? HR[5] : HR[1], light ? 0.45 : 0.5);
    } else {
      line(x0, y0, x0 + (x0 < 88 ? -1 : 1) * 1.2, y0 + 2.2, [M.HAIR], light ? HR[5] : HR[0], light ? 0.45 : 0.5);
    }
  }

  // ------------------------------------------------------------ a boca
  const hasBigStache = P.stache === 'big' || P.stache === 'gold';
  if (mood !== 'talk' && mood !== 'hurt' && mood !== 'laugh') {
    // a linha entre os lábios (com o canto que sobe no convencido)
    const half = P.fem ? 6 : 6.5;
    for (let x = Math.round(88 - half); x <= Math.round(88 + half); x += 1) {
      const t = (x - 88) / half;
      let yy = my + 0.7 + t * t * (0.6 - (P.smile ?? 0) * 1.6);
      if (mood === 'smug') yy -= Math.max(0, t) * 1.6;
      if (mood === 'thinking') yy += t * 0.8;
      if ([M.LIP, M.SKIN].includes(at(x, Math.round(yy)))) put(x, yy, R[M.LIP][0], hasBigStache ? 0.6 : 0.9);
    }
    if (mood === 'smug' && P.goldTooth) put(91, my + 0.7, R[M.GOLD][5]);
  } else if (P.goldTooth) {
    for (let x = 86; x <= 96; x += 1) if (at(x, Math.round(my + 1)) === M.TEETH) {
      put(x + 3, my + 1, R[M.GOLD][5]);
      put(x + 3, my + 2, R[M.GOLD][3]);
      break;
    }
  }
  if (P.blush) {
    for (const cx of [72, 104])
      for (let y = 76; y <= 84; y += 1)
        for (let x = cx - 6; x <= cx + 6; x += 1) {
          const r = Math.hypot((x - cx) / 6, (y - 80) / 4);
          if (r < 1 && at(x, y) === M.SKIN) put(x, y, hex(P.blush), 0.28 * (1 - r));
        }
  }
  if (P.scar) {
    line(100, 72, 106, 84, [M.SKIN], S[1], 0.85);
    for (const [x, y] of [
      [101, 75],
      [103, 79],
      [105, 82],
    ]) {
      put(x - 1, y, S[5], 0.5);
      put(x + 1, y, S[5], 0.5);
    }
  }
  // as dobras do rosto (do nariz até o canto da boca)
  if (!P.fem && P.age !== 'young') {
    line(79, my - 11.4, 74.5, my - 2.9, SK, S[2], P.age === 'old' ? 0.55 : 0.38);
    line(97, my - 11.4, 101.5, my - 2.9, SK, S[1], P.age === 'old' ? 0.6 : 0.42);
  }

  // ------------------------------------------------------------ os óculos: o brilho nas lentes
  if (P.glasses) {
    const pairs = P.glasses.type === 'monocle' ? [99.5] : [76.5, 99.5];
    for (const cx of pairs) {
      put(cx - 3, 66, hex('#ffffff'), 0.7);
      put(cx - 2, 65, hex('#ffffff'), 0.55);
      put(cx + 2, 71, hex('#ffffff'), 0.35);
    }
  }

  // ------------------------------------------------------------ a roupa: estampas e enfeites
  const o = P.outfit;
  const TOP = [M.TOP];
  const T = R[M.TOP];
  if (o.plaid) {
    const c = hex(o.plaid);
    for (let y = 100; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        if (at(x, y) !== M.TOP && at(x, y) !== M.APRON) continue;
        const a = (x + y * 0) % 7 === 2 || y % 7 === 3 ? 0.42 : (x + 1) % 7 === 2 || (y + 1) % 7 === 3 ? 0.15 : 0;
        if (a && at(x, y) === M.TOP) put(x, y, c, a);
      }
  }
  if (o.stripes && o.type !== 'uniform') {
    const c = hex(o.stripes);
    for (let y = 100; y < H; y += 1) for (let x = 0; x < W; x += 1) if (at(x, y) === M.TOP && x % 4 === 1) put(x, y, c, 0.65);
  }
  if (o.stripes && o.type === 'uniform') {
    // as faixas refletivas: duas faixas largas no peito e nos braços
    const c = hex(o.stripes);
    for (let x = 0; x < W; x += 1)
      for (const y0 of [132, 133, 134]) if (at(x, y0) === M.TOP) put(x, y0, c, y0 === 133 ? 0.9 : 0.65);
  }
  if (o.type === 'cardigan') {
    // a malha: colunas de "v" pequenos
    for (let y = 104; y < H; y += 2) for (let x = 0; x < W; x += 3) if (at(x, y) === M.TOP && at(x + 1, y + 1) === M.TOP) {
      put(x, y, T[2], 0.5);
      put(x + 1, y + 1, T[2], 0.5);
    }
  }
  if (o.type === 'jersey' && o.number) {
    const s = String(o.number);
    const x0 = 88 - s.length * 4 + 1;
    for (let d = 0; d < s.length; d += 1) {
      const g = DIGITS[s[d]];
      for (let r = 0; r < 5; r += 1)
        for (let c = 0; c < 3; c += 1) {
          if (g[r][c] !== '1') continue;
          for (let dy = 0; dy < 2; dy += 1) putOn(x0 + d * 8 + c * 2, 122 + r * 2 + dy, TOP, hex('#ffffff'), 0.92);
          for (let dy = 0; dy < 2; dy += 1) putOn(x0 + d * 8 + c * 2 + 1, 122 + r * 2 + dy, TOP, hex('#ffffff'), 0.92);
        }
    }
  }
  if (o.patch) {
    const c = R[M.TOPB];
    for (let y = 124; y <= 129; y += 1) for (let x = 64; x <= 70; x += 1) putOn(x, y, TOP, y === 124 ? hex(o.patch) : mix(hex(o.patch), [0, 0, 0], (y - 124) * 0.06));
    put(64, 124, c[2]);
  }
  if (o.badge) {
    const G = R[M.GOLD];
    for (let y = 123; y <= 130; y += 1)
      for (let x = 101; x <= 107; x += 1) {
        const w = y < 128 ? 3.5 : 3.5 - (y - 127) * 1.1;
        if (Math.abs(x + 0.5 - 104.5) <= w) putOn(x, y, TOP, x < 104 ? G[5] : G[3]);
      }
  }
  if (o.buttons || o.type === 'uniform' || o.type === 'jacket') {
    for (let y = 104; y < H; y += 1) {
      if (o.type === 'jacket') putOn(88, y, [M.TOP], R[M.SILVER][y % 2 ? 4 : 2], 0.9);
      else if (y % 12 === 0) {
        putOn(88, y, [M.TOP], R[M.BUTTON][5]);
        putOn(88, y + 1, [M.TOP], R[M.BUTTON][2]);
      }
    }
  }
  // os bolsos do uniforme
  if (o.type === 'uniform') {
    for (const cx of [70, 106]) {
      line(cx - 6, 127, cx + 6, 127, TOP, T[1], 0.6);
      line(cx - 6, 127, cx - 6, 135, TOP, T[1], 0.45);
      line(cx + 6, 127, cx + 6, 135, TOP, T[1], 0.45);
    }
  }
  // a cava (a costura do ombro) de todos que têm manga
  if (o.type !== 'tank') {
    for (const side of [-1, 1]) {
      const X = (x) => (side < 0 ? x : 176 - x);
      for (let i = 0; i <= 12; i += 1) {
        const t = i / 12;
        const x = 52.5 + Math.sin(t * 1.9) * 4.2 - (P.broad ? 2.5 : 0) + (P.fem ? 3 : 0);
        const y = 115.5 + t * 20;
        putOn(X(x), y, TOP, T[1], 0.6);
      }
    }
  }
  // a brasa do cigarro
  if (P.smokes && mood !== 'hurt') {
    const e = P.cigFront.e;
    put(e[0], e[1], hex('#ffe08a'));
    put(e[0], e[1] - 1, hex('#ff9a2a'), 0.8);
  }
  // o recorte de luz colorido (o Dono da Noite, o Corvo, o Valtinho, o Seu Tião)
  if (P.rim) {
    const c = hex(P.rim);
    for (let y = 1; y < H - 1; y += 1)
      for (let x = 1; x < W - 1; x += 1) {
        if (!at(x, y)) continue;
        if (!at(x - 1, y) || !at(x, y - 1)) put(x, y, c, x < 88 ? 0.55 : 0.3);
      }
  }
}
