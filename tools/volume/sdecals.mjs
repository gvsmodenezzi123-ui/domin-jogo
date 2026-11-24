// Os detalhes à mão do perfil: o olho, os fios (sobrancelha, bigode, cabelo, braço), a orelha, as
// rugas, as costuras e dobras da camisa e da calça, a cinta, a botina e o veio da madeira.
import { H, RAMPS, W } from './side.mjs';
import { M } from './model.mjs';
import { hex, mix } from '../../src/components/art/figKit.js';

export function decals(img, P, { mood = 'idle', part = 'all' } = {}) {
  const { mat } = P;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (x, y) => (inb(x, y) ? mat[y * W + x] : 0);
  const put = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (!inb(x, y) || !c || !mat[y * W + x]) return;
    const i = (y * W + x) * 4;
    if (a >= 1) {
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
  const putIf = (x, y, mats, c, a = 1) => {
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
      putIf(x, y, mats, c, a);
    }
  };
  const curve = (pts, mats, c, a = 1) => {
    for (let i = 0; i + 1 < pts.length; i += 1) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], mats, c, a);
  };
  let seed = 11;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const S = RAMPS[M.SKIN];
  const HAIR = RAMPS[M.STACHE];
  const SH = RAMPS[M.SHIRT];
  const PA = RAMPS[M.PANTS];
  const WD = RAMPS[M.WOOD];
  const DARK = hex('#160c0a');
  const upper = part === 'upper' || part === 'all';
  const legs = part === 'legs' || part === 'all';
  const chair = part === 'chair' || part === 'all';

  if (upper) {
    // ------------------------------------------------------------ o olho de perfil
    if (mood === 'blink' || mood === 'hurt') {
      // a pálpebra fechada: a linha dos cílios descendo um tico para a frente
      for (const [x, y, a] of [
        [99, 70, 0.7],
        [100, 70, 1],
        [101, 71, 1],
        [102, 71, 1],
        [103, 71, 1],
        [104, 71, 0.9],
        [105, 70, 0.6],
      ])
        put(x, y, DARK, a);
      put(101, 72, S[3], 0.5);
      put(102, 72, S[3], 0.5);
    } else {
      const cols = new Map();
      for (let y = 60; y < 80; y += 1)
        for (let x = 95; x < 112; x += 1) {
          const m = at(x, y);
          if (m !== M.EYE && m !== M.IRIS) continue;
          const c = cols.get(x) ?? [];
          c.push(y);
          cols.set(x, c);
        }
      const xs = [...cols.keys()].sort((a, b) => a - b);
      const front = xs[xs.length - 1];
      for (const x of xs) {
        const ys = cols.get(x).sort((a, b) => a - b);
        for (const y of ys) {
          let c;
          if (at(x, y) === M.IRIS) c = x === front ? hex('#1a0e0a') : hex('#4a2a18');
          else c = x <= xs[0] ? hex('#a08c86') : hex('#cbb8b0');
          if (y === ys[0]) c = DARK;
          else if (y === ys[ys.length - 1] && at(x, y) !== M.IRIS) c = mix(c, S[3], 0.55);
          put(x, y, c);
        }
      }
      // o brilho na íris e os cílios passando um tico da frente
      const top = Math.min(...(cols.get(front) ?? [70]));
      const irisTop = [...cols.entries()].flatMap(([x, ys]) => ys.filter((y) => at(x, y) === M.IRIS).map((y) => [x, y])).sort((a, b) => a[1] - b[1])[0];
      if (irisTop) put(irisTop[0] - 1 >= xs[0] ? irisTop[0] - 1 : irisTop[0], irisTop[1] + 1, hex('#e8d8cc'));
      put(front + 1, top, DARK, 0.85);
      put(front + 1, top - 1, DARK, 0.45);
      // a pálpebra de cima (a dobra) e a bolsa de baixo
      const y0 = Math.min(...[...cols.values()].flat());
      line(xs[0] - 1, y0 - 2, front - 1, y0 - 2, [M.SKIN], S[2], 0.55);
      line(xs[0], y0 + 7, front - 1, y0 + 7.5, [M.SKIN], S[2], 0.5);
    }
    // falando: a boca abre embaixo do bigode (no hurt, mais aberta, e o suor)
    if (mood === 'talk' || mood === 'hurt') {
      const big = mood === 'hurt' ? 1 : 0;
      for (let x = 100; x <= 107; x += 1) {
        for (let k = 0; k <= big; k += 1) if (at(x, 99 + k) === M.SKIN || at(x, 99 + k) === M.LIP) put(x, 99 + k, hex('#2a0a0e'));
        if (x >= 102 && (at(x, 100 + big) === M.SKIN || at(x, 100 + big) === M.LIP)) put(x, 100 + big, RAMPS[M.LIP][4], 0.8);
      }
    }
    if (mood === 'hurt') {
      for (const [x, y, c] of [
        [95, 57, '#e8f6ff'],
        [95, 58, '#a8d8f0'],
        [96, 58, '#bfe4f6'],
        [95, 59, '#7ab8dc'],
        [96, 59, '#a8d8f0'],
      ])
        put(x, y, hex(c));
      line(96, 66, 99, 64, [M.SKIN], S[1], 0.7);
      line(96, 73, 99, 74, [M.SKIN], S[1], 0.7);
    }
    // os pés de galinha (atrás do olho, indo para a orelha)
    line(97, 67, 93.5, 65.5, [M.SKIN], S[2], 0.6);
    line(97, 69.5, 93, 69.5, [M.SKIN], S[2], 0.6);
    line(97, 72, 93.5, 73.5, [M.SKIN], S[2], 0.5);

    // ------------------------------------------------------------ sobrancelha, bigode, cabelo
    for (let i = 0; i < 40; i += 1) {
      const x0 = 101 + rnd() * 10;
      const y0 = 59.5 + rnd() * 6;
      const dark = rnd() < 0.6;
      line(x0, y0, x0 + 2, y0 - 1, [M.BROW], dark ? HAIR[0] : HAIR[4], dark ? 0.8 : 0.4);
    }
    // o bigode: fios descendo do nariz, os de cima com luz, as pontas soltas embaixo
    for (let i = 0; i < 60; i += 1) {
      const x0 = 103 + rnd() * 11;
      const y0 = 85.5 + rnd() * 4;
      const len = 3 + rnd() * 6;
      const ang = 0.35 - (x0 - 103) * 0.05 + (rnd() - 0.5) * 0.3;
      const dark = rnd() < 0.55;
      for (let k = 0; k <= len; k += 1) {
        const x = x0 - Math.sin(ang) * k;
        const y = y0 + Math.cos(ang) * k;
        putIf(x, y, [M.STACHE], dark ? HAIR[0] : HAIR[y < 90 ? 5 : 4], dark ? 0.75 : 0.55);
      }
    }
    for (let x = 100; x <= 116; x += 1)
      for (let y = 88; y <= 100; y += 1) if (at(x, y) === M.STACHE && at(x, y + 1) !== M.STACHE && at(x, y + 1) && rnd() < 0.5) put(x, y + 1, HAIR[1], 0.85);
    // o cabelo: fios curtos penteados para trás e para baixo, mais claros em cima
    for (let i = 0; i < 160; i += 1) {
      const x0 = 50 + rnd() * 44;
      const y0 = 42 + rnd() * 44;
      if (at(Math.round(x0), Math.round(y0)) !== M.HAIR) continue;
      const light = y0 < 60 && rnd() < 0.45;
      line(x0, y0, x0 - 1.5, y0 + 2.5, [M.HAIR], light ? RAMPS[M.HAIR][5] : RAMPS[M.HAIR][0], light ? 0.5 : 0.55);
    }

    // ------------------------------------------------------------ a orelha
    // a hélice (a borda de fora, mais clara) e o sulco escuro por dentro dela; a concha funda
    const EX = 72.5;
    const EY = 75;
    for (let t = -1.2; t <= 2.4; t += 0.08) {
      const x = EX - Math.sin(t) * 4.2 + 0.4;
      const y = EY - Math.cos(t) * 7.6 + 0.4;
      putIf(x, y, [M.SKIN], S[1], 0.55);
    }
    for (const [x, y, a] of [
      [74, 76, 0.75],
      [74, 77, 0.75],
      [73, 77, 0.6],
      [75, 75, 0.5],
      [74, 78, 0.5],
    ])
      put(x, y, S[0], a);
    put(76, 76, S[4], 0.6); // o trago
    // as rugas do rosto: o sulco do nariz até o canto da boca e a papada
    curve([[104, 85], [101.5, 88], [100, 92], [100.5, 96]], [M.SKIN], S[2], 0.6);
    curve([[93, 94], [95, 99], [99, 103]], [M.SKIN], S[2], 0.4);
    put(108, 80, S[6]);
    put(109, 80, S[6], 0.6);

    // ------------------------------------------------------------ a camisa
    // a costura da cava em volta do ombro (na frente e atrás) e a pala das costas
    curve([[67, 118], [72, 122], [75, 130], [74.5, 140], [72, 146]], [M.SHIRT], SH[1], 0.75);
    curve([[56, 121], [53, 128], [52.5, 137], [55, 145]], [M.SHIRT], SH[1], 0.6);
    line(44, 126, 55, 124, [M.SHIRT], SH[1], 0.55);
    // a carcela (a tira dos botões) descendo na frente até a cinta
    for (let y = 137; y <= 204; y += 1) {
      let x = 120;
      while (x > 80 && at(x, y) !== M.SHIRT && at(x, y) !== M.BUTTON) x -= 1;
      if (x <= 80) continue;
      putIf(x - 2, y, [M.SHIRT], SH[1], 0.6);
      putIf(x - 1, y, [M.SHIRT], SH[4], 0.25);
    }
    // a manga: as dobras do cotovelo e o vinco de dentro do braço
    curve([[70, 150], [74, 156], [75, 162]], [M.SHIRT], SH[1], 0.6);
    curve([[66, 158], [70, 163]], [M.SHIRT], SH[1], 0.5);
    line(62, 160, 64, 165, [M.SHIRT], SH[5], 0.35);
    // a camisa franzida em cima da cinta (atrás e na frente)
    for (const [x0, y0, x1, y1] of [
      [47, 196, 52, 200],
      [51, 192, 56, 198],
      [88, 196, 92, 201],
      [93, 192, 96, 199],
      [97, 189, 99, 196],
    ])
      line(x0, y0, x1, y1, [M.SHIRT], SH[1], 0.55);
    // o bolso (a costura) e os cigarros saindo do maço
    curve([[90, 130.5], [90, 142], [96, 145.5]], [M.SHIRT], SH[1], 0.5);
    put(97, 129, hex('#f2eee6'));
    put(98, 129, hex('#e2b060'));
    put(96, 129, hex('#e2ddd2'), 0.8);

    // ------------------------------------------------------------ a cinta
    for (const x of [58, 74, 88]) {
      for (let y = 196; y <= 210; y += 1) if (at(x, y) === M.BELT && at(x, y - 1) !== M.BELT) {
        put(x, y - 1, RAMPS[M.BELT][3], 0.9);
        put(x, y, RAMPS[M.BELT][1], 0.9);
        put(x, y + 1, RAMPS[M.BELT][1], 0.9);
        break;
      }
    }
    for (let x = 46; x <= 92; x += 3) {
      for (let y = 196; y <= 210; y += 1) if (at(x, y) === M.BELT && at(x, y + 1) === M.BELT && at(x, y + 2) === M.BELT) {
        put(x, y + 1, RAMPS[M.BELT][5], 0.5);
        break;
      }
    }

    // ------------------------------------------------------------ o braço e a mão
    // os pelos do antebraço, as juntas, as unhas e o ossinho do pulso
    for (let i = 0; i < 26; i += 1) {
      const t = rnd();
      const x = 78 + t * 32;
      const y = 185 + t * 16 + (rnd() - 0.5) * 6;
      if (at(Math.round(x), Math.round(y)) !== M.SKIN) continue;
      put(x, y, S[2], 0.7);
      put(x + 1, y - 0.6, S[2], 0.45);
    }
    put(112, 202, S[5], 0.8);
    for (const [x, y] of [
      [124, 205],
      [128, 205],
      [132, 206],
    ])
      put(x, y, S[1], 0.45);
    for (const [x, y] of [
      [137, 213],
      [140, 211],
      [142, 209],
    ]) {
      if (at(x, y) === M.SKIN) put(x, y, RAMPS[M.NAIL][5], 0.85);
    }
  }

  if (legs) {
    // ------------------------------------------------------------ a calça
    // a costura de fora: no meio da coxa até o joelho, e descendo a canela
    curve([[62, 222], [100, 223], [140, 224], [163, 224]], [M.PANTS], PA[5], 0.4);
    curve([[166, 236], [165, 262], [164, 288]], [M.PANTS], PA[5], 0.35);
    // o bolso de trás na bunda e a abertura do bolso da frente
    curve([[42, 214], [52, 213], [53, 226], [46, 229], [42, 226]], [M.PANTS], PA[1], 0.6);
    curve([[96, 210], [101, 215], [108, 218]], [M.PANTS], PA[1], 0.65);
    // as dobras da virilha e as de trás do joelho
    for (const [x0, y0, x1, y1] of [
      [104, 223, 114, 226],
      [100, 226, 112, 230],
      [150, 228, 155, 233],
      [146, 230, 150, 235],
      [158, 241, 162, 238],
    ])
      line(x0, y0, x1, y1, [M.PANTS], PA[1], 0.55);
    // a barra dobrada
    for (let x = 150; x <= 175; x += 1)
      for (let y = 286; y <= 296; y += 1) if (at(x, y) === M.PANTS && at(x, y - 1) === M.PANTS && rnd() < 0.08) put(x, y, PA[1], 0.4);
    // ------------------------------------------------------------ a botina
    for (let x = 139; x <= 200; x += 2)
      for (let y = 305; y <= 322; y += 1) if (at(x, y) === M.BOOT && at(x, y + 1) === M.SOLE) {
        put(x, y, RAMPS[M.BOOT][5], 0.6);
        break;
      }
    put(184, 309, RAMPS[M.BOOT][6], 0.7);
    put(185, 309, RAMPS[M.BOOT][6], 0.5);
  }

  if (chair) {
    // ------------------------------------------------------------ o veio da madeira
    for (let i = 0; i < 90; i += 1) {
      const x = Math.round(8 + rnd() * 140);
      const y = Math.round(126 + rnd() * 196);
      const m = at(x, y);
      if (m !== M.WOOD && m !== M.WOODD) continue;
      const vertical = at(x, y - 2) === m && at(x, y + 2) === m && (at(x - 3, y) !== m || at(x + 3, y) !== m);
      const len = 2 + Math.round(rnd() * 4);
      for (let k = 0; k < len; k += 1) {
        const px = vertical ? x : x + k;
        const py = vertical ? y + k : y;
        if (at(px, py) === m) put(px, py, RAMPS[m][1], 0.35);
      }
    }
  }
}
