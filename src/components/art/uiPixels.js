// Versão 2.0: o HUD da partida em pixel art de alta densidade, no mesmo nível da mesa pintada.
// Cada peça vira uma textura pequena (PNG em data URL, pintado uma vez ao abrir o jogo) que o
// CSS usa como border-image em 9 fatias (os cantos ficam fixos, as bordas e o miolo repetem):
//
//   tábua      os botões da mesa (pinho; o de jogar em mel; o de passar pintado de vermelho
//              descascando; o de latão; o apagado, cheio de poeira)
//   ferro      os botões de ícone (som, menu): chapa de ferro rebitada com ferrugem
//   lousa      lousinha de giz com moldura de madeira (o número do dorme, a dica do meio)
//   latão      plaquinha de latão aparafusada (o VOCÊ)
//   bandeja    a tábua onde a sua mão descansa (repete sem emenda)
//   costas     as costas das pedras (ébano com o chanfro)
import { paintKit } from './botecoScene.js';

const { hex, shift, rngOf, buffer } = paintKit;

const INK = hex('#0b0705');
const clamp = (v) => Math.max(0, Math.min(255, v));
const clampRgb = (c) => [clamp(c[0]), clamp(c[1]), clamp(c[2])];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Ruído suave que dá a volta (periódico em x e y): a textura repete sem emenda. */
function wrapNoise(w, h, cell, r) {
  const gw = Math.max(1, Math.round(w / cell));
  const gh = Math.max(1, Math.round(h / cell));
  const g = Array.from({ length: gw * gh }, () => r());
  const at = (x, y) => g[(((y % gh) + gh) % gh) * gw + (((x % gw) + gw) % gw)];
  return (x, y) => {
    const fx = (x / w) * gw;
    const fy = (y / h) * gh;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const c = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (c - a) * sy;
  };
}

const PLANK = {
  pinho: { hi: '#d8995a', mid: '#8a5428', lo: '#5a3418', deep: '#2a1508', grain: '#4a2a12', wear: '#b07a44' },
  play: { hi: '#e8b46a', mid: '#9a6430', lo: '#663c18', deep: '#2e1806', grain: '#80522a', wear: '#c08a4a' },
  blood: { hi: '#e0604a', mid: '#8e2a1c', lo: '#5a160c', deep: '#2a0804', grain: '#6a1c10', wear: '#7a4a24', paint: true },
  brass: { hi: '#fff0a8', mid: '#c9962e', lo: '#86601a', deep: '#3a2a08', grain: '#a87a22', wear: '#e8c060', metal: true },
  off: { hi: '#7a6a56', mid: '#4a3e32', lo: '#30281f', deep: '#16120d', grain: '#3a3028', wear: '#5a4e40', dust: true },
};

/** Lado de cada fatia dos cantos da tábua (pixels da textura). */
export const PLANK_SLICE = 8;

/**
 * A tábua de botão, 48×26 em 9 fatias de 8: contorno arredondado, chanfro (luz em cima e à
 * esquerda, sombra grossa embaixo, que é a espessura da tábua), veio na horizontal que repete,
 * nós, lascas, quatro pregos nos cantos e, conforme o tipo, tinta descascando, latão ou poeira.
 */
export function paintPlank(kind = 'pinho', seed = 3) {
  const P = Object.fromEntries(Object.entries(PLANK[kind] ?? PLANK.pinho).map(([k, v]) => [k, typeof v === 'string' ? hex(v) : v]));
  const W = 48;
  const H = 26;
  const b = buffer(W, H);
  const r = rngOf(seed + kind.length * 17);
  const n = wrapNoise(32, 10, 4, r);
  const raw = hex('#9a6a3a');
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const corner = (x === 0 || x === W - 1) && (y === 0 || y === H - 1);
      if (corner) continue;
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (edge) {
        b.put(x, y, INK);
        continue;
      }
      let c;
      if (y === 1) c = mix(P.hi, hex('#ffffff'), P.metal ? 0.45 : 0.18);
      else if (y === 2) c = P.hi;
      else if (y >= H - 5) c = y === H - 2 ? P.deep : y === H - 3 ? P.deep : y === H - 4 ? P.lo : mix(P.lo, P.mid, 0.5);
      else if (x === 1) c = mix(P.hi, P.mid, 0.3);
      else if (x === 2) c = mix(P.hi, P.mid, 0.7);
      else if (x === W - 2) c = P.deep;
      else if (x === W - 3) c = P.lo;
      else {
        // o miolo: veio na horizontal (periódico em x: o miolo repete sem emenda)
        const cx = x - PLANK_SLICE;
        const cy = y - PLANK_SLICE;
        // veio discreto: o letreiro por cima tem que ler bem
        const g = Math.sin(y * 1.7 + Math.sin(((cx + 64) * Math.PI * 2) / 32) * 1.4 + n(cx + 64, cy + 20) * 3);
        c = g > 0.78 ? mix(P.mid, P.grain, 0.55) : g < -0.86 ? mix(P.mid, P.hi, 0.18) : P.mid;
        if (P.metal) c = mix(P.mid, P.hi, 0.18 + 0.25 * Math.sin(x * 0.4 + y * 0.2) ** 2);
        c = shift(c, Math.round((r() - 0.5) * (P.metal ? 6 : 5)));
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // tinta descascando: lascas que mostram a madeira crua por baixo do vermelho
  if (P.paint) {
    for (let i = 0; i < 9; i += 1) {
      const px = 3 + Math.floor(r() * (W - 6));
      const py = 3 + Math.floor(r() * (H - 9));
      const len = 1 + Math.floor(r() * 3);
      b.rect(px, py, len, 1, P.wear);
      b.put(px, py + 1, hex('#3a1a08'), 0.6);
    }
  }
  // latão: a linha gravada por dentro da borda
  if (P.metal) {
    for (let x = 4; x < W - 4; x += 1) {
      b.put(x, 4, P.lo, 0.8);
      b.put(x, H - 7, hex('#fff6c8'), 0.5);
    }
    for (let y = 4; y < H - 6; y += 1) {
      b.put(4, y, P.lo, 0.8);
      b.put(W - 5, y, hex('#fff6c8'), 0.5);
    }
  }
  // poeira do botão apagado
  if (P.dust) for (let i = 0; i < 40; i += 1) b.put(2 + r() * (W - 4), 2 + r() * (H - 6), hex('#b8aa94'), 0.18 + r() * 0.2);
  // lascas na quina de cima e riscos (só onde é madeira)
  if (!P.metal) {
    for (let i = 0; i < 4; i += 1) {
      const px = 4 + Math.floor(r() * (W - 10));
      b.rect(px, 1, 2 + Math.floor(r() * 2), 1, P.deep);
      b.rect(px, 2, 2, 1, raw, 0.8);
    }
    for (let i = 0; i < 3; i += 1) {
      const px = 4 + Math.floor(r() * (W - 14));
      const py = 4 + Math.floor(r() * (H - 11));
      b.line(px, py, px + 3 + Math.floor(r() * 5), py, P.hi, 0.18);
    }
  }
  // pregos (ou parafusos no latão) nos quatro cantos
  for (const [nx, ny] of [
    [4, 4],
    [W - 5, 4],
    [4, H - 8],
    [W - 5, H - 8],
  ]) {
    b.put(nx, ny, hex('#1a1008'));
    b.put(nx + 1, ny, hex('#1a1008'));
    b.put(nx, ny + 1, hex('#1a1008'));
    b.put(nx + 1, ny + 1, hex('#3a2a14'));
    b.put(nx, ny, P.metal ? hex('#fff6c8') : hex('#c8b090'));
    if (P.metal) b.put(nx + 1, ny + 1, hex('#5a4210'));
  }
  return b;
}

/** Chapa de ferro rebitada (16×16, fatias de 5) para os botões de ícone. */
export const IRON_SLICE = 5;
export function paintIronPlate(seed = 7) {
  const S = 16;
  const b = buffer(S, S);
  const r = rngOf(seed);
  const hi = hex('#8a949c');
  const mid = hex('#454c52');
  const lo = hex('#262a2e');
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      if ((x === 0 || x === S - 1) && (y === 0 || y === S - 1)) continue;
      if (x === 0 || y === 0 || x === S - 1 || y === S - 1) {
        b.put(x, y, INK);
        continue;
      }
      let c;
      if (y === 1) c = hi;
      else if (x === 1) c = mix(hi, mid, 0.4);
      else if (y >= S - 3) c = y === S - 2 ? hex('#121416') : lo;
      else if (x === S - 2) c = lo;
      else c = shift(mid, Math.round((r() - 0.5) * 12));
      b.put(x, y, c);
    }
  }
  // ferrugem
  for (let i = 0; i < 10; i += 1) b.put(3 + r() * 10, 3 + r() * 9, r() < 0.5 ? hex('#8a4a1c') : hex('#5a2e12'), 0.55);
  // rebites
  for (const [rx, ry] of [
    [3, 3],
    [S - 4, 3],
    [3, S - 5],
    [S - 4, S - 5],
  ]) {
    b.put(rx, ry, hex('#c8d0d6'));
    b.put(rx + 1, ry + 1, hex('#14171a'));
    b.put(rx + 1, ry, hex('#6a737a'));
    b.put(rx, ry + 1, hex('#6a737a'));
  }
  return b;
}

/** Lousinha de giz com moldura de madeira (24×24, fatias de 6). */
export const SLATE_SLICE = 6;
export function paintSlate(seed = 5) {
  const S = 24;
  const b = buffer(S, S);
  const r = rngOf(seed);
  const wood = [hex('#b07a44'), hex('#7a4a24'), hex('#4a2a12'), hex('#24120a')];
  const slate = hex('#2b322e');
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      if ((x === 0 || x === S - 1) && (y === 0 || y === S - 1)) continue;
      const d = Math.min(x, y, S - 1 - x, S - 1 - y);
      let c;
      if (d === 0) c = INK;
      else if (d <= 3) {
        const lit = y <= x && y < S / 2 ? 0 : x < S / 2 && x < y ? 1 : 2;
        c = d === 3 ? wood[3] : wood[Math.min(2, lit + (d === 1 ? 0 : 1))];
        c = shift(c, Math.round((r() - 0.5) * 10));
      } else if (d === 4) c = hex('#141a17');
      else c = shift(slate, Math.round((r() - 0.5) * 8));
      b.put(x, y, c);
    }
  }
  // giz apagado: borrões claros no miolo
  for (let i = 0; i < 18; i += 1) b.put(5 + r() * 14, 5 + r() * 14, hex('#c8d0c8'), 0.08 + r() * 0.1);
  for (let i = 0; i < 3; i += 1) {
    const y = 6 + Math.floor(r() * 12);
    b.line(5, y, 18, y + (r() < 0.5 ? 1 : 0), hex('#dfe6df'), 0.06);
  }
  return b;
}

/** Plaquinha de latão aparafusada (20×14, fatias de 5): o VOCÊ. */
export const TAG_SLICE = 5;
export function paintBrassTag() {
  const W = 20;
  const H = 14;
  const b = buffer(W, H);
  const hi = hex('#fff0a8');
  const mid = hex('#c9962e');
  const lo = hex('#86601a');
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        b.put(x, y, INK);
        continue;
      }
      let c = mix(mid, hi, 0.15 + 0.2 * Math.sin(x * 0.5 + y * 0.3) ** 2);
      if (y === 1) c = hi;
      else if (y >= H - 3) c = y === H - 2 ? hex('#3a2a08') : lo;
      else if (x === 1) c = mix(hi, mid, 0.4);
      else if (x === W - 2) c = lo;
      b.put(x, y, c);
    }
  }
  for (const [sx, sy] of [
    [3, 3],
    [W - 4, 3],
    [3, H - 5],
    [W - 4, H - 5],
  ]) {
    b.put(sx, sy, hex('#5a4210'));
    b.put(sx + 1, sy, hex('#3a2a08'));
    b.put(sx, sy + 1, hex('#fff6c8'));
  }
  return b;
}

/**
 * A bandeja de madeira da sua mão: 128×48, três tábuas de 16 com veio, nós, a emenda de
 * cada tábua num lugar diferente (com os pregos), riscos e o miolo gasto. Repete sem emenda.
 */
export const TRAY_SIZE = Object.freeze({ w: 128, h: 48 });
export function paintTray(seed = 13) {
  const { w: W, h: H } = TRAY_SIZE;
  const b = buffer(W, H);
  const r = rngOf(seed);
  const n = wrapNoise(W, H, 16, r);
  const fine = wrapNoise(W, H, 4, r);
  const tones = [
    [hex('#6a3e1e'), hex('#4a2a12'), hex('#8a5a30')],
    [hex('#5e361a'), hex('#40240f'), hex('#7e5028')],
    [hex('#72441f'), hex('#4e2c13'), hex('#946234')],
  ];
  for (let y = 0; y < H; y += 1) {
    const plank = Math.floor(y / 16);
    const py = y % 16;
    const [mid, lo, hi] = tones[plank];
    for (let x = 0; x < W; x += 1) {
      let c;
      if (py === 15) c = hex('#120804');
      else if (py === 0) c = mix(hi, hex('#ffd8a0'), 0.15);
      else if (py === 14) c = lo;
      else {
        const g = Math.sin(py * 1.25 + plank * 2 + Math.sin((x * Math.PI * 2) / W + plank) * 2.2 + n(x, y) * 3.5);
        c = g > 0.7 ? lo : g < -0.8 ? hi : mid;
        c = shift(c, Math.round((fine(x, y) - 0.5) * 10 + (r() - 0.5) * 4));
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // emendas das tábuas (cada uma num lugar), com os dois pregos
  for (let plank = 0; plank < 3; plank += 1) {
    const jx = [23, 88, 54][plank];
    const y0 = plank * 16;
    for (let y = y0 + 1; y < y0 + 15; y += 1) {
      b.put(jx, y, hex('#140904'));
      b.put(jx + 1, y, tones[plank][2], 0.5);
    }
    for (const nx of [jx - 3, jx + 4]) {
      b.put(nx, y0 + 4, hex('#1a1008'));
      b.put(nx, y0 + 3, hex('#d8c098'), 0.8);
      b.put(nx, y0 + 11, hex('#1a1008'));
      b.put(nx, y0 + 10, hex('#d8c098'), 0.8);
    }
  }
  // nós
  for (const [kx, ky] of [
    [70, 7],
    [12, 26],
    [104, 39],
  ]) {
    b.ellipse(kx, ky, 3.5, 2, hex('#3a200c'));
    b.ellipse(kx, ky, 2, 1, hex('#1a0c04'));
    b.put(kx - 2, ky - 2, hex('#a06a3a'), 0.6);
  }
  // riscos e marcas de copo
  for (let i = 0; i < 14; i += 1) {
    const x = Math.floor(r() * W);
    const y = 1 + Math.floor(r() * (H - 2));
    if (y % 16 === 15 || y % 16 === 0) continue;
    b.line(x, y, x + 3 + Math.floor(r() * 8), y + (r() < 0.3 ? 1 : 0), hex('#c09060'), 0.28);
  }
  return b;
}

/** Costas das pedras (14×24, fatias de 4): ébano com chanfro claro e veio fino. */
export const BACK_SLICE = 4;
export function paintTileBack(seed = 2) {
  const W = 14;
  const H = 24;
  const b = buffer(W, H);
  const r = rngOf(seed);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        b.put(x, y, INK);
        continue;
      }
      let c;
      if (y === 1 || x === 1) c = hex('#6a5442');
      else if (y === H - 2 || x === W - 2) c = hex('#130d09');
      else if (y === 2 || x === 2) c = hex('#46362a');
      else c = shift(Math.sin(x * 1.3 + y * 0.25) > 0.6 ? hex('#3a2c21') : hex('#2a1f17'), Math.round((r() - 0.5) * 6));
      b.put(x, y, c);
    }
  }
  return b;
}


// ---------------------------------------------------------------------------
// Tela inicial e Livro: a maleta JOGAR, o forro, as placas de dominó, os nichos
// ---------------------------------------------------------------------------

/** A tampa da maleta JOGAR (48×32, fatias de 12): tábua grossa, friso entalhado, cantoneiras. */
export const CASE_LID_SLICE = 12;
export function paintCaseLid(seed = 21) {
  const W = 48;
  const H = 32;
  const b = buffer(W, H);
  const r = rngOf(seed);
  const n = wrapNoise(24, 8, 4, r);
  const wood = { hi: hex('#d8995a'), mid: hex('#8a5428'), lo: hex('#5a3418'), deep: hex('#24120a'), grain: hex('#4a2a12') };
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        b.put(x, y, INK);
        continue;
      }
      let c;
      if (y === 1) c = mix(wood.hi, hex('#ffffff'), 0.2);
      else if (y === 2) c = wood.hi;
      else if (y >= H - 6) c = y >= H - 3 ? wood.deep : y === H - 4 ? wood.lo : mix(wood.lo, wood.deep, 0.4);
      else if (x <= 2) c = mix(wood.hi, wood.mid, x === 1 ? 0.2 : 0.6);
      else if (x >= W - 3) c = x === W - 2 ? wood.deep : wood.lo;
      else {
        const g = Math.sin(y * 1.5 + Math.sin(((x - 12 + 48) * Math.PI * 2) / 24) * 1.3 + n(x + 36, y) * 3);
        c = g > 0.8 ? mix(wood.mid, wood.grain, 0.5) : g < -0.86 ? mix(wood.mid, wood.hi, 0.16) : wood.mid;
        c = shift(c, Math.round((r() - 0.5) * 4));
      }
      // o friso entalhado a 7 px da borda (sombra em cima, luz embaixo)
      const fx = x === 7 || x === W - 8;
      const fy = y === 7 || y === H - 9;
      if ((fx && y >= 7 && y <= H - 9) || (fy && x >= 7 && x <= W - 8)) c = y === 7 || x === 7 ? wood.deep : mix(wood.hi, wood.mid, 0.3);
      b.put(x, y, clampRgb(c));
    }
  }
  // cantoneiras de latão
  const brass = [hex('#fff0a8'), hex('#d9a531'), hex('#8a6214'), hex('#3a2808')];
  for (const [cx, cy, sx, sy] of [
    [1, 1, 1, 1],
    [W - 2, 1, -1, 1],
    [1, H - 2, 1, -1],
    [W - 2, H - 2, -1, -1],
  ]) {
    for (let k = 0; k < 9; k += 1) {
      for (let j = 0; j < 9 - k; j += 1) b.put(cx + sx * j, cy + sy * k, j === 0 || k === 0 ? brass[0] : j + k > 7 ? brass[2] : brass[1]);
    }
    b.put(cx + sx * 3, cy + sy * 3, brass[3]);
    b.put(cx + sx * 3 + (sx > 0 ? -1 : 1), cy + sy * 3, brass[0]);
  }
  return b;
}

/** O forro de dentro da maleta (32×32, fatias de 10): moldura de madeira e veludo vinho. */
export const VELVET_SLICE = 10;
export function paintVelvet(seed = 8) {
  const S = 32;
  const b = buffer(S, S);
  const r = rngOf(seed);
  const wood = [hex('#b07a44'), hex('#7a4a24'), hex('#4a2a12'), hex('#24120a')];
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      if ((x === 0 || x === S - 1) && (y === 0 || y === S - 1)) continue;
      const d = Math.min(x, y, S - 1 - x, S - 1 - y);
      let c;
      if (d === 0) c = INK;
      else if (d <= 5) c = shift(d === 1 ? wood[0] : d === 5 ? wood[3] : y < x && y < S - x ? wood[1] : wood[2], Math.round((r() - 0.5) * 8));
      else if (d === 6) c = hex('#1a0408');
      else if (d <= 8) c = mix(hex('#3a0810'), hex('#5a0f18'), (d - 6) / 3);
      else c = shift(hex('#6a1420'), Math.round(Math.sin(x * 2.1) * 4 + (r() - 0.5) * 8));
      b.put(x, y, c);
    }
  }
  return b;
}

const PLATE = {
  bone: { face: ['#fff6dc', '#efe2bc', '#cdb98a', '#8a7650'], edge: '#4a3418', pip: '#2a1a0a' },
  gold: { face: ['#fff4c0', '#f0d27a', '#c99632', '#7a5a14'], edge: '#3a2606', pip: '#3a2606' },
  off: { face: ['#a89a80', '#8a7e68', '#6a604e', '#40382c'], edge: '#2a2218', pip: '#2a2218', dust: true },
  danger: { face: ['#fff0e6', '#f0d6c8', '#c89a8a', '#8a4a3a'], edge: '#5a120c', pip: '#8a1a10' },
};

/** Placa de dominó (40×20, fatias de 7): osso com chanfro e os pips nos quatro cantos. */
export const PLATE_SLICE = 7;
export function paintDominoPlate(kind = 'bone', seed = 4) {
  const P = PLATE[kind] ?? PLATE.bone;
  const face = P.face.map(hex);
  const W = 40;
  const H = 20;
  const b = buffer(W, H);
  const r = rngOf(seed + kind.length);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        b.put(x, y, hex(P.edge));
        continue;
      }
      let c;
      if (y === 1) c = face[0];
      else if (y >= H - 3) c = y === H - 2 ? face[3] : face[2];
      else if (x === 1) c = mix(face[0], face[1], 0.4);
      else if (x === W - 2) c = face[2];
      else c = shift(mix(face[1], face[0], Math.max(0, 0.45 - (y / H) * 0.6)), Math.round((r() - 0.5) * 6));
      b.put(x, y, c);
    }
  }
  // pips nos cantos (o osso entalhado)
  const pip = hex(P.pip);
  for (const [px, py] of [
    [3, 3],
    [W - 5, 3],
    [3, H - 6],
    [W - 5, H - 6],
  ]) {
    b.rect(px, py, 2, 2, pip);
    b.put(px + 1, py + 1, mix(pip, face[1], 0.4));
    b.put(px, py + 2, face[0], 0.8);
  }
  if (P.dust) for (let i = 0; i < 24; i += 1) b.put(2 + r() * (W - 4), 2 + r() * (H - 5), hex('#d8ccb0'), 0.25);
  return b;
}

/** O nicho de madeira do álbum (24×24, fatias de 8): moldura, paredes por dentro e o fundo. */
export const NICHE_SLICE = 8;
export function paintNiche(seed = 6) {
  const S = 24;
  const b = buffer(S, S);
  const r = rngOf(seed);
  const wood = [hex('#a06a38'), hex('#6a3e1e'), hex('#4a2a12'), hex('#24120a')];
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const d = Math.min(x, y, S - 1 - x, S - 1 - y);
      let c;
      if (d === 0) c = INK;
      else if (d <= 2) c = shift(d === 1 ? wood[0] : wood[1], Math.round((r() - 0.5) * 8));
      else if (d === 3) c = wood[3];
      else if (y < 7 && y <= x && y <= S - 1 - x) c = mix(hex('#0c0603'), wood[3], (y - 3) / 5); // a parede de cima, na sombra
      else if (y > S - 6 && S - 1 - y <= x && S - 1 - y <= S - 1 - x) c = mix(wood[1], wood[0], (y - (S - 6)) / 5); // o chão do nicho, com luz
      else if (x < 7 && x <= y) c = mix(hex('#140a05'), wood[2], (x - 3) / 5);
      else if (x > S - 8) c = mix(wood[2], hex('#140a05'), (x - (S - 8)) / 5);
      else c = shift(hex('#2a170b'), Math.round(Math.sin(x * 1.1) * 3 + (r() - 0.5) * 5)); // o fundo
      b.put(x, y, c);
    }
  }
  return b;
}

/** Cadeadinho e poeira do item ainda trancado no álbum (16×16, por cima do nicho). */
export function paintNicheLock() {
  const b = buffer(16, 16);
  b.rect(4, 2, 1, 6, hex('#8a949c'));
  b.rect(11, 2, 1, 6, hex('#8a949c'));
  b.rect(4, 1, 8, 1, hex('#c8d0d6'));
  b.rect(5, 2, 6, 1, hex('#5a6168'));
  b.rect(2, 7, 12, 8, hex('#3a2808'));
  b.rect(3, 8, 10, 6, hex('#c9962e'));
  b.rect(3, 8, 10, 1, hex('#ffe08a'));
  b.rect(3, 13, 10, 1, hex('#8a6214'));
  b.rect(7, 10, 2, 3, hex('#1a1008'));
  return b;
}

/** Poeira assentada (32×32, repete): pontinhos e um fiapo de teia num canto. */
export function paintDust(seed = 12) {
  const b = buffer(32, 32);
  const r = rngOf(seed);
  for (let i = 0; i < 26; i += 1) b.put(Math.floor(r() * 32), Math.floor(r() * 32), hex('#d8ccb0'), 0.14 + r() * 0.22);
  for (let i = 0; i < 6; i += 1) b.line(i * 2, 0, 0, i * 2, hex('#e8e0d0'), 0.12);
  return b;
}


// ---------------------------------------------------------------------------
// Versão 2.0 (2ª leva): a régua de dominó do rival e a beirada de perto da mesa
// ---------------------------------------------------------------------------

const RACK_WOOD = { hi: hex('#c88a4a'), mid: hex('#7a4a24'), lo: hex('#4a2a12'), deep: hex('#1c0e05'), grain: hex('#5e3618') };

/** A frente da régua (40×14, fatias de 6): o sarrafo de madeira que segura as pedras em pé. */
export const RACK_SLICE = 6;
export function paintRackLip(seed = 31) {
  const W = 40;
  const H = 14;
  const b = buffer(W, H);
  const r = rngOf(seed);
  const n = wrapNoise(28, 2, 4, r);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        b.put(x, y, INK);
        continue;
      }
      let c;
      if (y === 1) c = mix(RACK_WOOD.hi, hex('#ffe2b0'), 0.35);
      else if (y === 2) c = RACK_WOOD.hi;
      else if (y >= H - 3) c = y === H - 2 ? RACK_WOOD.deep : RACK_WOOD.lo;
      else {
        const g = Math.sin(y * 1.9 + Math.sin(((x - 6 + 56) * Math.PI * 2) / 28) * 1.2 + n(x + 22, 0) * 2.5);
        c = g > 0.8 ? mix(RACK_WOOD.mid, RACK_WOOD.grain, 0.6) : RACK_WOOD.mid;
        c = shift(c, Math.round((r() - 0.5) * 5));
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // cantoneiras de latão nas pontas
  for (const x0 of [1, W - 5]) {
    b.rect(x0, 1, 4, H - 2, hex('#8a6214'));
    b.rect(x0, 1, 4, 1, hex('#fff0a8'));
    b.rect(x0 + 1, 2, 2, H - 4, hex('#d9a531'));
    b.put(x0 + 1, 5, hex('#3a2808'));
  }
  return b;
}

/** O fundo da régua (40×20, fatias de 6): a tábua inclinada atrás das pedras, mais escura em cima. */
export function paintRackBack(seed = 32) {
  const W = 40;
  const H = 20;
  const b = buffer(W, H);
  const r = rngOf(seed);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        b.put(x, y, INK);
        continue;
      }
      let c;
      if (y === 1) c = RACK_WOOD.mid;
      else if (x === 1) c = RACK_WOOD.mid;
      else if (x === W - 2) c = RACK_WOOD.deep;
      else c = shift(mix(RACK_WOOD.deep, RACK_WOOD.lo, 0.3 + (y / H) * 0.5), Math.round((r() - 0.5) * 6));
      b.put(x, y, clampRgb(c));
    }
  }
  return b;
}

/** A beirada de perto da mesa (48×24, fatias de 8): onde ficam os corações e o menu. */
export const NEAR_RAIL_SLICE = 8;
export function paintNearRail(seed = 33) {
  const W = 48;
  const H = 24;
  const b = buffer(W, H);
  const r = rngOf(seed);
  const n = wrapNoise(32, 8, 4, r);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let c;
      if (y === 0) c = hex('#050302');
      else if (y === 1) c = mix(RACK_WOOD.hi, hex('#ffe2b0'), 0.3);
      else if (y === 2) c = RACK_WOOD.hi;
      else if (y === 3) c = mix(RACK_WOOD.hi, RACK_WOOD.mid, 0.5);
      else {
        const g = Math.sin(y * 1.4 + Math.sin(((x - 8 + 64) * Math.PI * 2) / 32) * 1.4 + n(x + 24, y) * 3);
        c = g > 0.8 ? mix(RACK_WOOD.mid, RACK_WOOD.grain, 0.55) : g < -0.86 ? mix(RACK_WOOD.mid, RACK_WOOD.hi, 0.15) : RACK_WOOD.mid;
        c = mix(shift(c, Math.round((r() - 0.5) * 5)), RACK_WOOD.lo, Math.min(0.5, (y - 4) / 30));
      }
      b.put(x, y, clampRgb(c));
    }
  }
  // losangos de madrepérola nos cantos (repetem só nas fatias dos cantos)
  for (const dx of [5, W - 6]) {
    b.put(dx, 6, hex('#e8f0ec'));
    b.put(dx - 1, 7, hex('#c8d8d0'));
    b.put(dx + 1, 7, hex('#c8d8d0'));
    b.put(dx, 7, hex('#ffffff'));
    b.put(dx, 8, hex('#9ab0a8'));
  }
  return b;
}

function toDataUrl(painted) {
  const canvas = document.createElement('canvas');
  canvas.width = painted.w;
  canvas.height = painted.h;
  canvas.getContext('2d').putImageData(new ImageData(painted.data, painted.w, painted.h), 0, 0);
  return `url(${canvas.toDataURL('image/png')})`;
}

/** Pinta as texturas do HUD uma vez e deixa no :root (`--px-*`), para o CSS. */
export function installPixelSkins() {
  if (typeof document === 'undefined' || typeof ImageData === 'undefined') return;
  try {
    const root = document.documentElement.style;
    for (const kind of Object.keys(PLANK)) root.setProperty(`--px-plank-${kind}`, toDataUrl(paintPlank(kind)));
    root.setProperty('--px-iron', toDataUrl(paintIronPlate()));
    root.setProperty('--px-slate', toDataUrl(paintSlate()));
    root.setProperty('--px-brass-tag', toDataUrl(paintBrassTag()));
    root.setProperty('--px-tray', toDataUrl(paintTray()));
    root.setProperty('--px-tile-back', toDataUrl(paintTileBack()));
    root.setProperty('--px-case-lid', toDataUrl(paintCaseLid()));
    root.setProperty('--px-velvet', toDataUrl(paintVelvet()));
    for (const kind of Object.keys(PLATE)) root.setProperty(`--px-plate-${kind}`, toDataUrl(paintDominoPlate(kind)));
    root.setProperty('--px-niche', toDataUrl(paintNiche()));
    root.setProperty('--px-niche-lock', toDataUrl(paintNicheLock()));
    root.setProperty('--px-dust', toDataUrl(paintDust()));
    root.setProperty('--px-rack-lip', toDataUrl(paintRackLip()));
    root.setProperty('--px-rack-back', toDataUrl(paintRackBack()));
    root.setProperty('--px-near-rail', toDataUrl(paintNearRail()));
    document.documentElement.classList.add('px-skins');
  } catch {
    // sem canvas: o HUD fica com os degradês de sempre
  }
}
