/**
 * Versão 2.1: os retratos dos rivais em 64×64 (antes 40×40), pintados por código e feitos
 * para encher a foto da polaroide inteira: fundo (a parede de cada um), busto, cabeça com
 * volume (luz da lâmpada de cima e da esquerda, três tons de pele, contorno escuro), cabelo,
 * chapéu, roupa e o objeto de cada personagem. Cada retrato tem os humores do jogo:
 *
 *   idle      olhar para a frente
 *   thinking  olhos para o alto, uma sobrancelha erguida, boca de lado
 *   smug      pálpebra caída, sorriso de canto
 *   hurt      olhos apertados, sobrancelhas de dor, boca aberta, suor e a bochecha marcada
 *
 * e `speaking` (a boca abre, menos no hurt). O desenho é puro e com semente (cache por chave).
 */
import { paintKit } from './botecoScene.js';

const { hex, rngOf, buffer } = paintKit;

export const PORTRAIT_PX = 64;
const G = PORTRAIT_PX;
const CX = 32;

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (c) => [clamp(c[0]), clamp(c[1]), clamp(c[2])];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const INK = hex('#140c08');

/** Quatro tons de um material a partir da cor base (luz, base, sombra, sombra funda). */
function tones(base, { warm = true } = {}) {
  const c = hex(base);
  return {
    hi: rgb(mix(c, warm ? hex('#fff1d8') : hex('#eef4ff'), 0.32)),
    mid: c,
    lo: rgb(mix(c, warm ? hex('#2a1208') : hex('#0a1020'), 0.32)),
    deep: rgb(mix(c, hex('#0a0604'), 0.58)),
  };
}

/** Escolhe o tom pela luz (-1 escuro .. 1 claro), com pontilhado nas transições. */
function lit(t, light, x, y) {
  const v = light + (dither(x, y) - 0.5) * 0.18;
  if (v > 0.42) return t.hi;
  if (v > -0.12) return t.mid;
  if (v > -0.52) return t.lo;
  return t.deep;
}

/** Contorno de 1 px (vizinhança de 4) em volta do que foi pintado na camada. */
function outline(b, color = INK) {
  const marks = [];
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      if (b.data[(y * b.w + x) * 4 + 3] > 0) continue;
      const solid = (nx, ny) => nx >= 0 && ny >= 0 && nx < b.w && ny < b.h && b.data[(ny * b.w + nx) * 4 + 3] > 200;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) b.put(x, y, color);
}

/**
 * Luz de recorte: a lâmpada do boteco bate na borda esquerda (luz quente) e a luz de trás
 * (a cor da parede, ou `spec.rim`) acende a borda direita. É o que destaca a figura do fundo.
 */
function rimLight(b, spec) {
  const back = hex(spec.rim ?? spec.glow ?? '#ffe2a8');
  const key = hex('#fff1d0');
  const solid = (x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h && b.data[(y * b.w + x) * 4 + 3] > 200;
  const marks = [];
  for (let y = 0; y < b.h; y += 1) {
    for (let x = 0; x < b.w; x += 1) {
      if (!solid(x, y)) continue;
      if (!solid(x + 1, y)) marks.push([x, y, back, 0.42]);
      else if (!solid(x - 1, y)) marks.push([x, y, key, 0.22]);
      else if (!solid(x, y - 1) && y > 0) marks.push([x, y, key, 0.16]);
    }
  }
  for (const [x, y, c, a] of marks) b.put(x, y, c, a);
}

/** Sombra da figura na parede (um pouco para a direita e para baixo). */
function dropShadow(bg, fig) {
  for (let y = G - 1; y >= 0; y -= 1) {
    for (let x = G - 1; x >= 0; x -= 1) {
      const sx = x - 3;
      const sy = y - 2;
      if (sx < 0 || sy < 0) continue;
      if (fig.data[(sy * G + sx) * 4 + 3] > 200) bg.put(x, y, [0, 0, 0], 0.35);
    }
  }
}

/** Cola a camada `top` por cima da `base`. */
function over(base, top) {
  for (let i = 0; i < top.data.length; i += 4) {
    const a = top.data[i + 3] / 255;
    if (!a) continue;
    base.data[i] = base.data[i] * (1 - a) + top.data[i] * a;
    base.data[i + 1] = base.data[i + 1] * (1 - a) + top.data[i + 1] * a;
    base.data[i + 2] = base.data[i + 2] * (1 - a) + top.data[i + 2] * a;
    base.data[i + 3] = 255;
  }
}

/** Preenche onde `fn(x, y)` devolver uma cor (dentro da caixa). */
function fill(b, x0, y0, x1, y1, fn) {
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(G - 1, Math.ceil(y1)); y += 1) {
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(G - 1, Math.ceil(x1)); x += 1) {
      const c = fn(x, y);
      if (c) b.put(x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------
// Fundo: a parede de cada um (enche a foto inteira)
// ---------------------------------------------------------------------------

function paintBackground(b, spec, r) {
  const [top, bottom] = (spec.bg ?? ['#3a2a1e', '#1a120c']).map(hex);
  const pattern = spec.bgPattern ?? 'plain';
  for (let y = 0; y < G; y += 1) {
    for (let x = 0; x < G; x += 1) {
      let c = mix(top, bottom, y / (G - 1));
      if (pattern === 'tiles' && (x % 10 === 0 || y % 10 === 0)) c = mix(c, hex('#000000'), 0.25);
      if (pattern === 'tiles' && x % 10 === 1 && y % 10 !== 0) c = mix(c, hex('#ffffff'), 0.06);
      if (pattern === 'wood' && Math.sin(x * 0.9 + Math.sin(y * 0.15) * 2) > 0.85) c = mix(c, hex('#000000'), 0.22);
      if (pattern === 'wood' && x % 13 === 0) c = mix(c, hex('#000000'), 0.35);
      if (pattern === 'stripes' && Math.floor(x / 5) % 2 === 0) c = mix(c, hex('#ffffff'), 0.06);
      if (pattern === 'curtain') c = mix(c, hex('#000000'), (Math.sin(x * 0.55) * 0.5 + 0.5) * 0.35);
      if (pattern === 'brick' && (y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 5) % 10 === 0)) c = mix(c, hex('#000000'), 0.3);
      if (pattern === 'stars' && r() < 0.012) c = mix(c, hex('#fff6c8'), 0.8);
      if (pattern === 'frame') {
        const d = Math.min(x, y, G - 1 - x, G - 1 - y);
        if (d < 4) c = d === 0 ? hex('#3a2808') : d === 1 ? hex('#ffe08a') : d === 3 ? hex('#5a3c08') : hex('#c9962e');
      }
      if (pattern === 'neon' && Math.abs(y - 12 - Math.sin(x * 0.2) * 2) < 1) c = mix(c, hex(spec.neon ?? '#ff4ad0'), 0.7);
      b.put(x, y, rgb(c));
    }
  }
  // a luz da lâmpada atrás da cabeça e a vinheta nos cantos
  const glow = hex(spec.glow ?? '#ffd890');
  for (let y = 0; y < G; y += 1) {
    for (let x = 0; x < G; x += 1) {
      const d = Math.hypot((x - CX) / 30, (y - 24) / 28);
      if (d < 1) b.put(x, y, glow, (1 - d) * 0.18);
      const v = Math.hypot((x - CX) / 40, (y - CX) / 40);
      if (v > 0.8) b.put(x, y, [0, 0, 0], Math.min(0.5, (v - 0.8) * 1.6));
    }
  }
}

// ---------------------------------------------------------------------------
// Corpo: ombros e roupa
// ---------------------------------------------------------------------------

function paintBody(b, spec) {
  const o = spec.outfit ?? {};
  const cloth = tones(o.color ?? '#3a4a6a');
  const accent = o.accent ? tones(o.accent) : cloth;
  const skin = tones(spec.skin ?? '#c88a5a');
  const shoulder = spec.broad ? 29 : 26;
  // pescoço
  fill(b, CX - 6, 38, CX + 6, 50, (x, y) => lit(skin, (CX - x) / 10 - (y < 44 ? 0.45 : 0.2), x, y));
  // ombros: um trapézio com a quina redonda
  fill(b, 0, 46, G - 1, G - 1, (x, y) => {
    const t = (y - 46) / 18;
    const half = 12 + (shoulder - 12) * Math.min(1, Math.sqrt(Math.max(0, t)) * 1.25);
    if (Math.abs(x - CX) > half) return null;
    const light = (CX - x) / 26 - t * 0.25 + 0.1;
    return lit(cloth, light, x, y);
  });
  // as cavas do braço e a sombra que a cabeça faz no peito
  for (const side of [-1, 1]) {
    for (let y = 52; y < G; y += 1) {
      const x = Math.round(CX + side * (shoulder - 7 - (y - 52) * 0.12));
      if (Math.abs(x - CX) < 13) continue;
      b.put(x, y, side < 0 ? cloth.lo : cloth.deep, 0.75);
    }
  }
  const type = o.type ?? 'shirt';
  if (type === 'suit' || type === 'jacket' || type === 'coat') {
    // camisa no meio (V), lapelas
    const shirt = tones(o.shirt ?? '#e8e4d8');
    fill(b, CX - 9, 46, CX + 9, G - 1, (x, y) => {
      const v = (y - 46) * 0.7;
      if (Math.abs(x - CX) > v) return null;
      return lit(shirt, (CX - x) / 10, x, y);
    });
    // lapelas
    fill(b, CX - 13, 46, CX + 13, G - 1, (x, y) => {
      const d = Math.abs(x - CX);
      const edge = (y - 46) * 0.7;
      if (d < edge || d > edge + 4) return null;
      return lit(accent, (CX - x) / 14 + 0.2, x, y);
    });
    if (o.tie) {
      const tie = tones(o.tie);
      fill(b, CX - 2, 47, CX + 2, G - 1, (x, y) => {
        const w = y < 50 ? 1.5 : 1.5 + (y - 50) * 0.12;
        return Math.abs(x - CX) <= w ? lit(tie, (CX - x) / 3, x, y) : null;
      });
    }
    if (o.bow) {
      const bow = tones(o.bow);
      b.rect(CX - 4, 47, 3, 3, bow.mid);
      b.rect(CX + 2, 47, 3, 3, bow.lo);
      b.rect(CX - 1, 47, 3, 3, bow.hi);
    }
  } else if (type === 'tank') {
    const under = tones(o.shirt ?? '#efefe8');
    fill(b, CX - 12, 50, CX + 12, G - 1, (x, y) => lit(under, (CX - x) / 12, x, y));
    // pele dos ombros de fora da regata
    fill(b, 0, 48, G - 1, G - 1, (x, y) => {
      const d = Math.abs(x - CX);
      return d > 12 && d < 24 && y < 56 + (d - 12) * 0.3 ? lit(skin, (CX - x) / 20, x, y) : null;
    });
  } else if (type === 'uniform' || type === 'jersey' || type === 'shirt' || type === 'apron' || type === 'robe' || type === 'cardigan') {
    // gola
    const collar = tones(o.collar ?? o.color ?? '#3a4a6a');
    fill(b, CX - 10, 45, CX + 10, 52, (x, y) => {
      const d = Math.abs(x - CX);
      if (type === 'jersey' || type === 'robe') return d < 8 && d > 4 - (y - 45) * 0.4 && y < 49 ? lit(collar, 0.1, x, y) : null;
      return d > (y - 45) * 0.6 && d < 9 - (y - 45) * 0.3 ? lit(collar, (CX - x) / 9 + 0.3, x, y) : null;
    });
    if (type === 'apron') {
      const ap = tones(o.accent ?? '#e8e0d0');
      fill(b, CX - 11, 52, CX + 11, G - 1, (x, y) => lit(ap, (CX - x) / 12, x, y));
      b.line(CX - 11, 52, CX - 16, 46, ap.lo);
      b.line(CX + 11, 52, CX + 16, 46, ap.lo);
    }
    if (o.buttons) for (let y = 50; y < G; y += 4) b.put(CX, y, accent.hi);
    if (o.stripes) {
      fill(b, 0, 46, G - 1, G - 1, (x, y) => (b.data[(y * G + x) * 4 + 3] && Math.floor(x / 3) % 2 === 0 && Math.abs(x - CX) > 4 ? hex(o.stripes) : null));
    }
    if (o.plaid) {
      fill(b, 0, 46, G - 1, G - 1, (x, y) => {
        if (!b.data[(y * G + x) * 4 + 3] || Math.abs(x - CX) < 3) return null;
        return x % 6 === 0 || y % 6 === 0 ? rgb(mix(hex(o.plaid), cloth.mid, 0.3)) : null;
      });
    }
    if (o.number) {
      const n = tones('#f4f0e6');
      digits(b, String(o.number), CX + 6, 53, n.mid);
    }
    if (o.badge) {
      b.rect(CX + 8, 52, 5, 6, hex('#c9962e'));
      b.rect(CX + 9, 53, 3, 4, hex('#ffe08a'));
      b.put(CX + 10, 54, hex('#7a5a14'));
    }
    if (o.patch) {
      b.rect(CX - 15, 53, 8, 4, hex('#f4f0e6'));
      b.line(CX - 14, 55, CX - 9, 55, hex(o.patch));
    }
  }
  if (o.chain) {
    const gold = tones('#e6c34a');
    for (let a = 0.15; a < Math.PI - 0.15; a += 0.12) {
      const x = CX + Math.cos(a) * 9;
      const y = 47 + Math.sin(a) * 7;
      b.put(x, y, Math.floor(a * 8) % 2 ? gold.hi : gold.lo);
    }
    if (o.medal) {
      b.ellipse(CX, 55, 2.5, 2.5, gold.lo);
      b.ellipse(CX - 0.5, 54.5, 1.4, 1.4, gold.hi);
    }
  }
  if (o.boa) {
    const boa = tones(o.boa);
    for (let i = 0; i < 70; i += 1) {
      const a = (i / 70) * Math.PI;
      const x = CX + Math.cos(a) * 18 + Math.sin(i * 1.7) * 2;
      const y = 50 + Math.sin(a) * 5 + Math.cos(i * 2.3) * 2;
      b.ellipse(x, y, 2.2, 2, i % 3 ? boa.mid : boa.hi);
    }
  }
  if (o.pearls) {
    for (let a = 0.3; a < Math.PI - 0.3; a += 0.28) b.ellipse(CX + Math.cos(a) * 8, 47 + Math.sin(a) * 6, 1, 1, hex('#f4f0f8'));
  }
}

/** Dígitos de 3×5 (o número da camisa). */
const DIG = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  7: ['111', '001', '010', '010', '010'],
};
function digits(b, str, x, y, c) {
  [...str].forEach((ch, i) => {
    const rows = DIG[ch];
    if (!rows) return;
    rows.forEach((row, ry) => [...row].forEach((v, rx) => v === '1' && b.put(x + i * 4 + rx, y + ry, c)));
  });
}

// ---------------------------------------------------------------------------
// Cabeça: rosto com volume, orelhas, olhos, nariz, boca, pelos
// ---------------------------------------------------------------------------

const FACE = { top: 13, bottom: 44, half: 12.5 };

/** Meia-largura do rosto na altura `t` (0 testa .. 1 queixo) para cada tipo de queixo. */
function halfAt(jaw, t) {
  const H = FACE.half;
  if (t < 0 || t > 1) return 0;
  const crown = Math.sqrt(Math.max(0, 1 - ((0.42 - Math.min(t, 0.42)) / 0.42) ** 2));
  if (jaw === 'square') return H * (t < 0.42 ? crown : t < 0.82 ? 1 : 1 - ((t - 0.82) / 0.18) ** 1.6 * 0.55);
  if (jaw === 'heavy') return H * (t < 0.42 ? crown : t < 0.86 ? 1 + Math.sin(((t - 0.42) / 0.44) * Math.PI) * 0.1 : 1.04 - ((t - 0.86) / 0.14) ** 1.4 * 0.5);
  if (jaw === 'long') return H * 0.9 * (t < 0.42 ? crown : 1 - ((t - 0.42) / 0.58) ** 2.2 * 0.62);
  if (jaw === 'thin') return H * 0.86 * (t < 0.42 ? crown : 1 - ((t - 0.42) / 0.58) ** 1.6 * 0.7);
  return H * (t < 0.42 ? crown : 1 - ((t - 0.42) / 0.58) ** 1.8 * 0.66); // round
}

function paintHead(b, spec) {
  const skin = tones(spec.skin ?? '#c88a5a');
  const jaw = spec.jaw ?? 'round';
  const top = FACE.top;
  const bottom = FACE.bottom + (jaw === 'long' ? 2 : 0);
  const span = bottom - top;
  // orelhas
  for (const side of [-1, 1]) {
    const ex = CX + side * (halfAt(jaw, 0.45) + 0.5);
    b.ellipse(ex, 29, 2.4, 3.8, side < 0 ? skin.mid : skin.lo);
    b.ellipse(ex + side * 0.4, 29, 1, 2.2, skin.deep);
  }
  fill(b, CX - 16, top, CX + 16, bottom, (x, y) => {
    const t = (y - top) / span;
    const h = halfAt(jaw, t);
    const nx = (x + 0.5 - CX) / Math.max(1, h);
    if (Math.abs(nx) > 1) return null;
    // luz: da esquerda e de cima; sombra embaixo do queixo e na lateral direita
    let light = -nx * 0.55 + (0.35 - t) * 0.5 + 0.12;
    if (t > 0.9) light -= 0.35;
    // maçã do rosto
    if (Math.abs(nx + 0.45) < 0.2 && t > 0.5 && t < 0.62) light += 0.25;
    return lit(skin, light, x, y);
  });
  if (spec.blush) {
    for (const side of [-1, 1]) b.ellipse(CX + side * 7, 34, 2.4, 1.3, hex(spec.blush), 0.35);
  }
  if (spec.wrinkles) {
    b.line(CX - 9, 31, CX - 8, 35, skin.lo, 0.7);
    b.line(CX + 8, 31, CX + 9, 35, skin.lo, 0.7);
    b.line(CX - 4, 20, CX + 4, 20, skin.lo, 0.5);
  }
  if (spec.scar) {
    b.line(CX + 6, 26, CX + 10, 34, hex('#a05040'));
    for (let i = 0; i < 3; i += 1) b.put(CX + 7 + i, 28 + i * 2, hex('#f0c0a8'));
  }
}

/** Olhos e sobrancelhas no humor do momento. */
function paintEyes(b, spec, mood) {
  const ey = 27;
  const eyes = [CX - 7, CX + 5];
  const brow = hex(spec.brow ?? spec.hair?.color ?? '#2a1a10');
  const iris = hex(spec.iris ?? '#3a2412');
  const white = hex('#f2ece0');
  const skin = tones(spec.skin ?? '#c88a5a');
  const dark = hex('#100806');
  eyes.forEach((x0, i) => {
    const side = i === 0 ? -1 : 1;
    if (mood === 'hurt') {
      // olhos apertados: um > e um <
      const dir = side < 0 ? 1 : -1;
      b.line(x0, ey - 1, x0 + 2, ey + 0.5, dark);
      b.line(x0 + 2, ey + 0.5, x0, ey + 2, dark);
      if (dir < 0) {
        b.rect(x0, ey - 1, 4, 4, [0, 0, 0], 0);
      }
      b.line(x0 + 4, ey - 1, x0 + 2, ey + 0.5, dark);
      b.line(x0 + 2, ey + 0.5, x0 + 4, ey + 2, dark);
      // sobrancelha de dor (ponta de dentro para cima)
      b.line(x0 - 1 + (side < 0 ? 0 : 1), ey - 3 - (side < 0 ? 0 : 2), x0 + 4 - (side < 0 ? 0 : 1), ey - 3 - (side < 0 ? 2 : 0), brow);
      return;
    }
    // sombra da órbita (e as olheiras de quem já viveu muito)
    b.rect(x0 - 1, ey - 2, 7, 1, skin.lo, 0.5);
    if (spec.wrinkles || spec.eyes === 'tired') {
      b.line(x0, ey + 3, x0 + 4, ey + 3, skin.lo, 0.8);
      b.put(x0 + (side < 0 ? 0 : 4), ey + 2, skin.lo);
    }
    // o branco do olho
    b.rect(x0, ey - 1, 5, 3, white);
    b.put(x0, ey - 1, skin.lo);
    b.put(x0 + 4, ey + 1, skin.lo);
    // para onde ele olha: pensando, para o alto e para o lado; convencido, de lado; senão, para você
    const iy = ey - 1;
    const ix = mood === 'thinking' ? x0 + 1 - (side > 0 ? 1 : 0) : mood === 'smug' ? x0 + 2 : x0 + 1 + (side < 0 ? 1 : 0);
    b.rect(ix, iy, 2, 3, iris);
    b.put(ix + (mood === 'thinking' ? 0 : 1), iy + 1, dark);
    b.put(ix, iy, hex('#ffffff'));
    // pálpebra de cima (no smug e no olhar caído cobre metade; olho puxado fica mais fino)
    const lid = mood === 'smug' || spec.eyes === 'sleepy' ? 2 : 1;
    b.rect(x0, ey - 1, 5, lid, lid > 1 ? skin.mid : skin.lo);
    b.rect(x0, ey - 2, 5, 1, dark);
    if (spec.eyes === 'narrow') b.rect(x0, ey + 1, 5, 1, skin.mid);
    if (spec.eyes === 'lashes') {
      b.put(x0 + (side < 0 ? -1 : 5), ey - 2, dark);
      b.put(x0 + (side < 0 ? -1 : 5), ey - 3, dark);
    }
    // sobrancelhas: o jeito de cada um (brava, triste, arqueada) e o do humor
    const shape = spec.browShape;
    const inner = side < 0 ? x0 + 5 : x0 - 1;
    const outer = side < 0 ? x0 - 1 : x0 + 5;
    const by = ey - 4;
    if (mood === 'thinking' && side > 0) b.line(x0 - 1, ey - 5, x0 + 5, ey - 6, brow);
    else if (mood === 'smug') b.line(x0 - 1, ey - 3 - (side < 0 ? 1 : 0), x0 + 5, ey - 3 - (side < 0 ? 0 : 1), brow);
    else if (shape === 'angry') b.line(outer, by - 1, inner, by + 1, brow);
    else if (shape === 'sad') b.line(outer, by + 1, inner, by - 1, brow);
    else if (shape === 'arched') {
      b.line(outer, by + 1, x0 + 2, by - 1, brow);
      b.line(x0 + 2, by - 1, inner, by, brow);
    } else b.line(x0 - 1, by, x0 + 5, by, brow);
    if (spec.thickBrows) {
      const lift = mood === 'thinking' && side > 0 ? -2 : shape === 'angry' && mood === 'idle' ? -1 : -1;
      b.line(x0 - 1, by + lift, x0 + 5, by + lift, brow);
    }
  });
}

function paintNose(b, spec) {
  const skin = tones(spec.skin ?? '#c88a5a');
  const big = spec.nose === 'big';
  const hook = spec.nose === 'hook';
  // dorso (luz) e a lateral na sombra
  b.line(CX - 1, 26, CX - 1, 32, skin.hi, 0.6);
  b.line(CX + 1, 27, CX + 1 + (hook ? 1 : 0), 33, skin.lo);
  // ponta e narinas
  b.ellipse(CX, 33, big ? 3 : 2.2, big ? 2 : 1.5, skin.mid);
  b.put(CX - 1, 32, skin.hi);
  b.rect(CX - 2, 34, 1, 1, skin.deep);
  b.rect(CX + 2, 34, 1, 1, skin.deep);
  b.line(CX - 2, 35, CX + 2, 35, skin.lo, 0.7);
}

function paintMouth(b, spec, mood, speaking) {
  const my = 38;
  const skin = tones(spec.skin ?? '#c88a5a');
  const lip = hex(spec.lip ?? '#8a4a3a');
  const dark = hex('#2a0c08');
  const teeth = hex(spec.goldTooth ? '#f0e0c0' : '#f0ebe0');
  if (mood === 'hurt') {
    // careta: boca aberta torta, dentes de cima
    b.ellipse(CX, my + 0.5, 3.4, 2, dark);
    b.rect(CX - 3, my - 1, 6, 1, teeth);
    b.line(CX - 4, my + 2, CX + 4, my + 1, skin.lo);
    return;
  }
  if (speaking) {
    b.ellipse(CX, my + 0.5, 3, 2.2, dark);
    b.rect(CX - 2, my - 1, 5, 1, teeth);
    b.rect(CX - 1, my + 2, 3, 1, hex('#c0504a'));
    b.line(CX - 3, my - 2, CX + 3, my - 2, lip, 0.8);
    if (spec.goldTooth) b.put(CX + 1, my - 1, hex('#ffd04a'));
    return;
  }
  if (mood === 'smug') {
    b.line(CX - 4, my + 0.5, CX + 2, my, lip);
    b.line(CX + 2, my, CX + 4, my - 2, lip);
    b.put(CX + 4, my - 2, dark);
    b.line(CX - 3, my + 2, CX + 2, my + 2, skin.lo, 0.6);
    if (spec.goldTooth) b.put(CX + 2, my, hex('#ffd04a'));
    return;
  }
  if (mood === 'thinking') {
    b.line(CX - 1, my, CX + 3, my + 0.5, lip);
    b.put(CX - 2, my, dark);
    return;
  }
  b.line(CX - 3, my, CX + 3, my, lip);
  b.put(CX - 4, my - 1, skin.lo);
  b.put(CX + 4, my - 1, skin.lo);
  b.line(CX - 2, my + 2, CX + 2, my + 2, skin.lo, 0.6);
}

function paintFacialHair(b, spec) {
  const fh = spec.facial;
  if (!fh) return;
  const t = tones(fh.color ?? spec.hair?.color ?? '#2a1a10');
  const jaw = spec.jaw ?? 'round';
  const top = FACE.top;
  const bottom = FACE.bottom + (jaw === 'long' ? 2 : 0);
  const span = bottom - top;
  if (fh.beard || fh.stubble) {
    fill(b, CX - 16, 31, CX + 16, bottom + (fh.beard === 'long' ? 6 : 1), (x, y) => {
      const tt = (y - top) / span;
      const h = tt <= 1 ? halfAt(jaw, tt) : halfAt(jaw, 1) + (fh.beard === 'long' ? 6 - (y - bottom) : 0);
      const nx = (x + 0.5 - CX) / Math.max(1, h);
      if (Math.abs(nx) > 1.05 && y <= bottom) return null;
      if (y > bottom && (fh.beard !== 'long' || Math.abs(x - CX) > 7 - (y - bottom))) return null;
      // deixa a boca de fora
      if (Math.abs(x - CX) < 4 && y >= 37 && y <= 39 && !fh.coverMouth) return null;
      if (y < 34 && Math.abs(nx) < 0.62) return null;
      if (fh.stubble) return dither(x, y) > 0.55 ? t.lo : null;
      return lit(t, -nx * 0.5 + 0.1 - (y - 34) * 0.03, x, y);
    });
  }
  if (fh.mustache) {
    const big = fh.mustache === 'big' || fh.mustache === 'handlebar' || fh.mustache === 'gold';
    fill(b, CX - 9, 34, CX + 9, 38, (x, y) => {
      const d = Math.abs(x + 0.5 - CX);
      const w = big ? 7.5 : 5;
      if (d > w) return null;
      const yTop = 35 + (d > w - 2 ? 1 : 0);
      const yBot = big ? 37.5 + (d > w - 2 ? 0.5 : 0) : 36.5;
      if (y < yTop || y > yBot) return null;
      return lit(t, (CX - x) / 8 + (y === yTop ? 0.4 : 0), x, y);
    });
    if (fh.mustache === 'handlebar' || fh.mustache === 'gold') {
      for (const side of [-1, 1]) {
        b.put(CX + side * 9, 36, t.mid);
        b.put(CX + side * 10, 35, t.mid);
        b.put(CX + side * 10, 34, t.hi);
      }
    }
  }
  if (fh.goatee) {
    b.rect(CX - 2, 40, 5, 3, t.mid);
    b.rect(CX - 1, 43, 3, 1, t.lo);
  }
}

// ---------------------------------------------------------------------------
// Cabelo e chapéus
// ---------------------------------------------------------------------------

function paintHair(b, spec, layer) {
  const h = spec.hair;
  if (!h || h.style === 'none') return;
  const t = tones(h.color ?? '#2a1a10');
  const jaw = spec.jaw ?? 'round';
  const top = FACE.top;
  const span = FACE.bottom - top;
  const style = h.style;
  if (layer === 'back') {
    if (style === 'long' || style === 'bob' || style === 'bun' || style === 'volume') {
      const reach = style === 'long' ? 54 : style === 'bob' ? 42 : style === 'volume' ? 40 : 36;
      fill(b, CX - 19, top - 3, CX + 19, reach, (x, y) => {
        const yy = Math.max(top, Math.min(FACE.bottom, y));
        const w = halfAt(jaw, (yy - top) / span) + (style === 'volume' ? 5 : 3.5);
        if (Math.abs(x + 0.5 - CX) > w || y < top - 3 + Math.abs(x - CX) * 0.15) return null;
        return lit(t, (CX - x) / 14 - 0.2, x, y);
      });
    }
    if (style === 'bun') {
      b.ellipse(CX, top - 3, 6, 4.5, t.lo);
      b.ellipse(CX - 1, top - 4, 4, 2.8, t.mid);
      b.put(CX - 2, top - 5, t.hi);
    }
    return;
  }
  // frente: a calota de cabelo no alto da cabeça e as costeletas
  const cover = style === 'bald' ? 0 : style === 'thin' ? 0.12 : style === 'slick' || style === 'short' || style === 'crew' ? 0.2 : style === 'bangs' || style === 'bob' ? 0.38 : 0.24;
  fill(b, CX - 18, top - 4, CX + 18, FACE.bottom, (x, y) => {
    const tt = (y - top) / span;
    const w = halfAt(jaw, Math.max(0, tt)) + 1.2;
    const dx = x + 0.5 - CX;
    if (Math.abs(dx) > w + (style === 'curly' || style === 'volume' ? 2 : 0)) return null;
    const lift = style === 'curly' || style === 'volume' ? 3 : style === 'slick' ? 1.5 : 1;
    if (y < top - lift + Math.abs(dx) * 0.08) return null;
    const edge = Math.abs(dx) / Math.max(1, w);
    let inHair = tt < cover;
    // costeletas (até a orelha)
    if (style !== 'bald' && edge > 0.86 && tt < 0.48) inHair = true;
    if (style === 'bald' && edge > 0.9 && tt > 0.22 && tt < 0.46) inHair = true;
    if (style === 'bangs' && tt < 0.42 && Math.abs(dx) < w) inHair = tt < 0.3 + (Math.floor(x / 3) % 2) * 0.06;
    if (style === 'side' && dx > 2 && tt < 0.3) inHair = true;
    if (!inHair) return null;
    let light = -dx / 10 + (0.1 - tt) * 2;
    if (style === 'slick' && Math.abs(dx + 4) < 1.5 && tt < 0.18) light = 1; // o brilho do gel
    if (style === 'curly' && dither(x * 2, y * 2) > 0.7) light -= 0.5;
    return lit(t, light, x, y);
  });
  // fios: umas mechas mais escuras e outras com brilho, para o cabelo não parecer um capacete
  if (style !== 'bald') {
    const rr = rngOf((spec.seed ?? 3) * 31 + 5);
    for (let i = 0; i < 9; i += 1) {
      const sx = CX - 10 + rr() * 20;
      const sy = top - 1 + rr() * 4;
      const len = 2 + rr() * 3;
      const dir = (sx - CX) * 0.06;
      const c = i % 3 === 0 ? t.hi : t.deep;
      for (let k = 0; k < len; k += 1) {
        const px = Math.round(sx + dir * k);
        const py = Math.round(sy + k);
        if (px >= 0 && py >= 0 && px < G && py < G && b.data[(py * G + px) * 4 + 3] > 200) {
          const i4 = (py * G + px) * 4;
          // só risca onde já é cabelo (a cor bate com algum tom do cabelo)
          const same = [t.hi, t.mid, t.lo, t.deep].some((tc) => Math.abs(b.data[i4] - tc[0]) + Math.abs(b.data[i4 + 1] - tc[1]) + Math.abs(b.data[i4 + 2] - tc[2]) < 6);
          if (same) b.put(px, py, c, 0.7);
        }
      }
    }
  }
  if (style === 'slick' || style === 'side') b.line(CX - 3, top - 1, CX - 1, top + 5, t.deep); // a risca
  if (style === 'bald') {
    b.put(CX - 5, top + 2, hex('#ffffff'), 0.7);
    b.put(CX - 4, top + 2, hex('#ffffff'), 0.4);
  }
}

function paintHat(b, spec) {
  const hat = spec.hat;
  if (!hat) return;
  const t = tones(hat.color ?? '#5a3a22');
  const band = hat.band ? tones(hat.band) : null;
  const top = FACE.top;
  const kind = hat.type;
  if (kind === 'fedora' || kind === 'panama' || kind === 'straw' || kind === 'wide' || kind === 'safari') {
    const brimHalf = kind === 'wide' ? 24 : kind === 'safari' || kind === 'straw' ? 21 : 18;
    const brimY = top + 3;
    // aba
    fill(b, CX - brimHalf, brimY - 1, CX + brimHalf, brimY + 3, (x, y) => {
      const d = Math.abs(x + 0.5 - CX) / brimHalf;
      if (d > 1) return null;
      const yy = brimY + d * d * 1.5;
      if (y < yy - 1 || y > yy + 1.5) return null;
      return lit(t, (CX - x) / 20 + (y < yy ? 0.5 : -0.3), x, y);
    });
    // copa
    const crownTop = top - (kind === 'safari' ? 8 : 9);
    fill(b, CX - 11, crownTop, CX + 11, brimY, (x, y) => {
      const dx = Math.abs(x + 0.5 - CX);
      const w = 9.5 - ((brimY - y) / (brimY - crownTop)) * 1.5;
      if (dx > w) return null;
      if (kind !== 'safari' && y < crownTop + 2 && dx < 3) return null; // o vinco do fedora
      return lit(t, (CX - x) / 10 + (crownTop + 3 - y) * 0.08, x, y);
    });
    if (band) b.rect(CX - 9, brimY - 3, 19, 2, band.mid);
    if (kind === 'straw' || kind === 'panama') {
      fill(b, CX - brimHalf, crownTop, CX + brimHalf, brimY + 3, (x, y) => (b.data[(y * G + x) * 4 + 3] && (x + y) % 3 === 0 ? t.lo : null));
    }
    if (hat.ticket) {
      b.rect(CX + 4, brimY - 7, 5, 4, hex('#f4e8b0'));
      b.put(CX + 5, brimY - 6, hex('#b8261c'));
    }
    return;
  }
  if (kind === 'cap' || kind === 'police' || kind === 'helmet' || kind === 'captain') {
    const capTop = top - (kind === 'helmet' ? 7 : 5);
    fill(b, CX - 14, capTop, CX + 14, top + 6, (x, y) => {
      const dx = Math.abs(x + 0.5 - CX);
      const w = 12.5 * Math.sqrt(Math.max(0, 1 - ((top + 4 - y) / (top + 4 - capTop + 1)) ** 2)) + 0.5;
      if (dx > w || y > top + 4) return null;
      return lit(t, (CX - x) / 11 + (capTop + 3 - y) * 0.1, x, y);
    });
    // aba / viseira
    const visor = hat.visor ? tones(hat.visor) : t;
    fill(b, CX - 13, top + 4, CX + 13, top + 7, (x, y) => {
      const dx = Math.abs(x + 0.5 - CX);
      if (dx > 12.5 - (y - top - 4) * 1.5) return null;
      return lit(visor, (CX - x) / 12 - (y - top - 4) * 0.25, x, y);
    });
    if (band) b.rect(CX - 12, top + 2, 25, 2, band.mid);
    if (hat.emblem) {
      b.ellipse(CX, top - 1, 2.5, 2.5, hex(hat.emblem));
      b.put(CX - 1, top - 2, hex('#ffffff'));
    }
    if (kind === 'helmet') {
      b.rect(CX - 1, capTop, 3, top + 4 - capTop, t.hi, 0.5);
    }
    return;
  }
  if (kind === 'beanie') {
    fill(b, CX - 14, top - 7, CX + 14, top + 6, (x, y) => {
      const dx = Math.abs(x + 0.5 - CX);
      const w = 13 * Math.sqrt(Math.max(0, 1 - ((top + 3 - y) / 11) ** 2)) + 0.5;
      if (dx > w || y > top + 6) return null;
      let c = lit(t, (CX - x) / 12 + (top - y) * 0.05, x, y);
      if (y > top + 2) c = lit(t, (CX - x) / 12 - 0.1, x, y);
      if (y <= top + 2 && x % 3 === 0) c = rgb(mix(c, hex('#000000'), 0.2));
      return c;
    });
    return;
  }
  if (kind === 'flatcap') {
    fill(b, CX - 15, top - 5, CX + 16, top + 5, (x, y) => {
      const dx = x + 0.5 - CX;
      const w = 13 + (y > top + 1 ? 2 : 0);
      if (Math.abs(dx) > w || y < top - 5 + Math.abs(dx) * 0.12) return null;
      return lit(t, -dx / 12 + (top - y) * 0.08, x, y);
    });
    return;
  }
  if (kind === 'turban') {
    fill(b, CX - 15, top - 9, CX + 15, top + 6, (x, y) => {
      const dx = Math.abs(x + 0.5 - CX);
      const w = 14 * Math.sqrt(Math.max(0, 1 - ((top - 1 - y) / 9) ** 2)) + 0.5;
      if (dx > w) return null;
      const fold = Math.sin((x - y) * 0.5) > 0.6 ? -0.4 : 0;
      return lit(t, (CX - x) / 12 + fold, x, y);
    });
    b.ellipse(CX, top - 1, 2.6, 3, hex('#3ae0a0'));
    b.put(CX - 1, top - 2, hex('#e0fff0'));
    b.rect(CX - 1, top + 2, 3, 2, hex('#e6c34a'));
    return;
  }
  if (kind === 'crown') {
    const gold = tones('#e6c34a');
    fill(b, CX - 9, top - 9, CX + 9, top - 1, (x, y) => {
      const dx = x - CX;
      const spike = Math.abs(((dx + 9) % 6) - 3) < 1.5;
      if (y < top - 4 && !spike) return null;
      return lit(gold, -dx / 9 + 0.2, x, y);
    });
    for (const gx of [-6, 0, 6]) b.put(CX + gx, top - 4, hex('#d02a2a'));
    return;
  }
  if (kind === 'headband') {
    b.rect(CX - 13, top + 2, 27, 3, hex(hat.color ?? '#f4f0e6'));
    b.rect(CX - 13, top + 2, 27, 1, hex('#ffffff'));
    return;
  }
  if (kind === 'goggles') {
    for (const gx of [-6, 5]) {
      b.ellipse(CX + gx, top + 2, 3.6, 3, hex('#3a3a3a'));
      b.ellipse(CX + gx, top + 2, 2.4, 2, hex('#7ab0c8'));
      b.put(CX + gx - 1, top + 1, hex('#e0f4ff'));
    }
    b.rect(CX - 14, top + 1, 4, 2, hex('#5a3a22'));
    b.rect(CX + 10, top + 1, 4, 2, hex('#5a3a22'));
  }
}

function paintGlasses(b, spec, mood) {
  const g = spec.glasses;
  if (!g) return;
  const frame = hex(g.color ?? '#2a1a10');
  const ey = 27;
  if (g.type === 'dark' || g.type === 'gold') {
    for (const x0 of [CX - 8, CX + 4]) {
      b.rect(x0, ey - 2, 7, 4, hex(g.type === 'gold' ? '#2a1a08' : '#101014'));
      b.rect(x0 + 1, ey - 1, 2, 1, hex('#6a7a8a'));
      b.rect(x0, ey - 3, 7, 1, frame);
    }
    b.line(CX - 1, ey - 2, CX + 3, ey - 2, frame);
    return;
  }
  if (g.type === 'monocle') {
    b.ellipse(CX + 6.5, ey + 0.5, 3.6, 3.6, frame);
    b.ellipse(CX + 6.5, ey + 0.5, 2.6, 2.6, hex('#cfe8f0'), 0.35);
    b.line(CX + 9, ey + 3, CX + 12, 40, hex('#e6c34a'));
    return;
  }
  // armação comum (redonda ou quadrada)
  for (const x0 of [CX - 8, CX + 4]) {
    if (g.type === 'round') {
      for (let a = 0; a < Math.PI * 2; a += 0.3) b.put(x0 + 3 + Math.cos(a) * 3.5, ey + 0.5 + Math.sin(a) * 3, frame);
    } else {
      b.rect(x0, ey - 2, 7, 1, frame);
      b.rect(x0, ey + 2, 7, 1, frame);
      b.rect(x0, ey - 2, 1, 5, frame);
      b.rect(x0 + 6, ey - 2, 1, 5, frame);
    }
    b.put(x0 + 1, ey - 1, hex('#ffffff'), 0.6);
  }
  b.line(CX - 1, ey - 1, CX + 3, ey - 1, frame);
  void mood;
}

// ---------------------------------------------------------------------------
// O retrato
// ---------------------------------------------------------------------------

/**
 * Pinta o retrato de `spec` (art/portraitSpecs.js) no humor `mood`. As camadas: fundo, corpo,
 * cabelo de trás, cabeça, rosto, pelos, cabelo da frente, chapéu, óculos e os objetos (o
 * `extra` de cada rival, que desenha atrás e/ou na frente). O personagem ganha contorno.
 */
export function paintPortrait(spec, mood = 'idle', speaking = false, bare = false) {
  const bg = buffer(G, G);
  const fig = buffer(G, G);
  const r = rngOf(spec.seed ?? 7);
  paintBackground(bg, spec, r);
  spec.behind?.(fig, { mood, tones, mix, hex, fill, lit, G, CX });
  paintBody(fig, spec);
  paintHair(fig, spec, 'back');
  paintHead(fig, spec);
  paintEyes(fig, spec, mood);
  paintNose(fig, spec);
  paintMouth(fig, spec, mood, speaking && mood !== 'hurt');
  paintFacialHair(fig, spec);
  paintHair(fig, spec, 'front');
  paintHat(fig, spec);
  paintGlasses(fig, spec, mood);
  spec.front?.(fig, { mood, speaking, tones, mix, hex, fill, lit, G, CX });
  if (mood === 'hurt') {
    // suor, lágrima e a bochecha vermelha do golpe
    fig.ellipse(CX + 12, 22, 1.2, 2, hex('#bfe8ff'));
    fig.put(CX + 12, 21, hex('#ffffff'));
    fig.ellipse(CX + 6, 34, 2.4, 1.4, hex('#e04a3a'), 0.35);
  }
  rimLight(fig, spec);
  outline(fig);
  if (bare) return fig; // só a figura (para a silhueta de quem você ainda não conhece)
  dropShadow(bg, fig);
  over(bg, fig);
  return bg;
}
