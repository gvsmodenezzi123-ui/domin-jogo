// Patch 1.1: a entrada do Dono da Noite em pixel art. Tudo é desenhado numa grade de 180 px de
// largura (a mesma da abertura do jogo), em cores fechadas e com pontilhado no lugar de degradê,
// e o canvas é ampliado sem suavizar. As fases e os tempos são os de sempre (SecretBoss.jsx):
//   0–1,5 s   a luz falha: o breu entra pontilhado por cima da mesa (e soltam faíscas da fiação)
//   1,5–2,4 s breu total, a vinheta vermelha batendo com o coração
//   2,4–4,3 s o trovão: estrobo vermelho e o círculo de runas se desenhando no chão, traço a traço
//   4,3–5,7 s o estrobo para e dois olhos dourados abrem no meio do círculo (e piscam uma vez)
//   5,7 s →   a revelação: o círculo maior e apagado, girando devagar atrás do cartão
// `render(ms)` é puro: o mesmo instante dá sempre o mesmo quadro.
import { FLICKER_CUTS, FLICKER_OUT } from '../engine/audioSynth.js';

export const DARK_AT = 1500;
export const STROBE_AT = 2400;
export const EYES_AT = 4300;
export const REVEAL_AT = 5700;
const AW = 180;
/** Altura mínima do desenho (180x320, a proporção do celular em pé). */
const AH = 320;

// ---- cores (0xAABBGGRR) ---------------------------------------------------------------------
const C = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
};
const BLACK = C('#000000');
const INK = C('#050203');
const RED = [C('#ff4a3a'), C('#c81018'), C('#8c0e14'), C('#5a060c'), C('#3c0006'), C('#1a0004')];
const RUNE = C('#ffd9c4');
const RUNE_HOT = C('#ff3b2f');
const RUNE_DIM = C('#c8261d');
const WHITE_HOT = C('#fff4ea');
const GOLD = [C('#fff6c8'), C('#ffd24a'), C('#e09a20'), C('#ff7a2a')];
const PUPIL = C('#1a0306');
const EMBER = [C('#ffd27a'), C('#ff7a2a'), C('#ff3b1a')];
const SPARK = [C('#ffffff'), C('#fff0a0'), C('#ffc040')];

const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map((v) => (v + 0.5) / 64);
const bayer = (x, y) => BAYER[((y & 7) << 3) | (x & 7)];
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const easeOut = (k) => 1 - (1 - k) ** 3;
const hash = (i, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7 + 74.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---- o desenho do círculo (unidades da caixa 200x200, centro 100,100) --------------------------
/** As 8 runas inventadas da casa (caixa 20x20, traços retos). */
const GLYPHS = [
  [[4, 17, 10, 3], [10, 3, 16, 17], [7, 11, 13, 11]],
  [[10, 2, 10, 18], [4, 6, 16, 14], [16, 6, 4, 14]],
  [[4, 4, 16, 4], [16, 4, 4, 16], [4, 16, 16, 16]],
  [[7, 2, 7, 18], [7, 3, 15, 8], [7, 9, 15, 14]],
  [[5, 2, 5, 18], [5, 10, 16, 3], [5, 10, 16, 17]],
  [[3, 10, 10, 3], [10, 3, 17, 10], [17, 10, 10, 17], [10, 17, 3, 10], [10, 7, 10, 13]],
  [[5, 3, 15, 17], [15, 3, 5, 17], [3, 10, 17, 10]],
  [[10, 3, 10, 17], [5, 8, 10, 3], [10, 3, 15, 8], [6, 17, 14, 17]],
];
const TRI = [[37.65, 64], [162.35, 64], [100, 172]];
/** Olho (linhas de 2 px: [início, fim] em x a partir do centro do olho), a pálpebra caindo pro nariz. */
const EYE_ROWS = [[-7, -2], [-8, 3], [-8, 7], [-7, 8], [-5, 7]];
/** Runas e brasas que sobem: [x %, runa (-1 = brasa), duração s, atraso s]. */
const DRIFT = [[6, 0, 5.2, 0], [15, -1, 3.8, 1.1], [24, 3, 6, 2.2], [33, -1, 4.4, 0.4], [44, 6, 5.6, 1.6], [56, -1, 4, 2.8], [66, 1, 5.4, 0.8], [75, -1, 3.6, 1.9], [84, 5, 6.2, 0.2], [93, -1, 4.2, 2.5]];

/** Opacidade do breu na falha da luz (degraus, no tempo do estalo de cada apagada). */
function flickerShade(s) {
  const [a, b, c] = FLICKER_CUTS;
  if (s >= FLICKER_OUT) return 1;
  if (s >= c + 0.1) return 0.46;
  if (s >= c) return 0.97;
  if (s >= b + 0.105) return 0.32;
  if (s >= b) return 0.96;
  if (s >= a + 0.16) return 0.24;
  if (s >= a) return 0.94;
  return 0.16;
}
/** O coração na vinheta: 2 batidas de 780 ms (sobe, cai um pouco, sobe de novo, apaga). */
function heartPulse(ms) {
  const k = (ms % 780) / 780;
  if (ms >= 1560) return 0;
  if (k < 0.1) return k / 0.1;
  if (k < 0.22) return 1 - ((k - 0.1) / 0.12) * 0.7;
  if (k < 0.32) return 0.3 + ((k - 0.22) / 0.1) * 0.55;
  return 0.85 * (1 - (k - 0.32) / 0.68);
}
/** Os olhos abrindo: altura de 0 a 1, piscam uma vez no meio. */
function eyeOpen(ms) {
  const k = clamp((ms - 150) / 1300);
  if (k <= 0) return 0;
  if (k < 0.32) return easeOut(k / 0.32);
  if (k < 0.58) return 1;
  if (k < 0.64) return 1 - ((k - 0.58) / 0.06) * 0.88;
  if (k < 0.7) return 0.12 + ((k - 0.64) / 0.06) * 0.88;
  return 1;
}

export function createSecretRenderer(canvas) {
  const g = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let buf = null;
  let img = null;

  const fit = () => {
    const cw = Math.max(1, canvas.clientWidth || 360);
    const ch = Math.max(1, canvas.clientHeight || 640);
    // pixel quadrado: o desenho tem 180 de largura no celular em pé; deitado (PC, tablet), a
    // altura manda (320) e a tela ganha mais colunas dos lados, sem esticar o círculo
    const px = Math.min(cw / AW, ch / AH);
    const w = Math.max(AW, Math.round(cw / px));
    const h = Math.max(AH, Math.round(ch / px));
    if (w === W && h === H) return;
    W = w;
    H = h;
    canvas.width = W;
    canvas.height = H;
    img = g.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);
  };

  const set = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c;
  };
  const seta = (x, y, c, a) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H && (a >= 1 || a > bayer(x, y))) buf[y * W + x] = c;
  };
  const line = (x0, y0, x1, y1, c, a = 1, t = 1) => {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i += 1) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      seta(x, y, c, a);
      if (t > 1) {
        seta(x + 1, y, c, a);
        seta(x, y + 1, c, a);
      }
    }
  };
  /** Anel (ou só um trecho, `upTo` de 0 a 1 da volta, a partir do ângulo `start`). */
  const ring = (cx, cy, r, th, c, a = 1, upTo = 1, start = 0) => {
    if (upTo <= 0) return;
    const step = 0.5 / Math.max(4, r);
    const end = upTo * Math.PI * 2;
    for (let ang = 0; ang <= end; ang += step) {
      const ca = Math.cos(start + ang);
      const sa = Math.sin(start + ang);
      for (let k = 0; k < th; k += 1) seta(cx + ca * (r - k), cy + sa * (r - k), c, a);
    }
  };

  /** O círculo de runas: `draw` = ms desde que começou a se desenhar (Infinity = pronto). */
  function circle(cx, cy, diam, rot, draw, { color, alpha = 1, hot = false }) {
    const u = diam / 200;
    const P = (x, y) => {
      const dx = (x - 100) * u;
      const dy = (y - 100) * u;
      return [cx + dx * Math.cos(rot) - dy * Math.sin(rot), cy + dx * Math.sin(rot) + dy * Math.cos(rot)];
    };
    const prog = (delay) => easeOut(clamp((draw - delay) / 900));
    ring(cx, cy, 96 * u, 3, color, alpha, prog(0), rot);
    ring(cx, cy, 72 * u, 2, color, alpha, prog(250), rot);
    // o pontilhado (aparece de uma vez, apagadinho)
    const dots = clamp((draw - 600) / 500);
    if (dots > 0) {
      for (let i = 0; i < 44; i += 1) {
        const ang = rot + (i / 44) * Math.PI * 2;
        const x = cx + Math.cos(ang) * 64 * u;
        const y = cy + Math.sin(ang) * 64 * u;
        seta(x, y, color, alpha * dots);
        seta(x + 1, y, color, alpha * dots);
      }
    }
    // o triângulo invertido, traçado de um vértice ao outro
    const tri = prog(480) * 3;
    for (let s = 0; s < 3; s += 1) {
      const f = clamp(tri - s);
      if (f <= 0) break;
      const [ax, ay] = P(...TRI[s]);
      const [bx, by] = P(...TRI[(s + 1) % 3]);
      line(ax, ay, ax + (bx - ax) * f, ay + (by - ay) * f, color, alpha, 2);
    }
    ring(cx, cy, 36 * u, 2, color, alpha, prog(700), rot);
    // as 8 runas acendem uma por uma (branco quente e depois a cor do giz)
    GLYPHS.forEach((segs, i) => {
      const k = (draw - (700 + i * 130)) / 340;
      if (k < 0) return;
      const ang = (i / GLYPHS.length) * Math.PI * 2 - Math.PI / 2;
      const gx = 100 + Math.cos(ang) * 84;
      const gy = 100 + Math.sin(ang) * 84;
      const col = k < 0.4 && hot ? WHITE_HOT : color;
      const a = alpha * clamp(k / 0.4);
      for (const [x0, y0, x1, y1] of segs) {
        const [ax, ay] = P(gx - 8 + x0 * 0.8, gy - 8 + y0 * 0.8);
        const [bx, by] = P(gx - 8 + x1 * 0.8, gy - 8 + y1 * 0.8);
        line(ax, ay, bx, by, col, a, 2);
      }
    });
  }

  /** Os olhos em 2x (cada pixel do desenho vira 2x2), com o breu atrás para saltarem do círculo. */
  function eyes(cx, cy, open) {
    // quantas linhas do desenho aparecem (fechando, somem de fora para dentro)
    const lim = open >= 0.95 ? 2 : open >= 0.55 ? 1 : open > 0.08 ? 0 : -1;
    if (lim < 0) return;
    const S = 2;
    const px = (x, y, c, a = 1) => {
      for (let i = 0; i < S; i += 1) for (let j = 0; j < S; j += 1) seta(x * S + i, y * S + j, c, a);
    };
    const ox = Math.round(cx / S);
    const oy = Math.round(cy / S);
    // o breu atrás de cada olho (oval, com a borda pontilhada)
    for (const ex of [ox - 12, ox + 12]) {
      for (let y = -7; y <= 7; y += 1) {
        for (let x = -12; x <= 12; x += 1) {
          const d = (x / 12) ** 2 + (y / 7) ** 2;
          if (d <= 1) px(ex + x, oy + y, BLACK, d > 0.7 ? 0.55 : 1);
        }
      }
    }
    const vis = (i) => Math.abs(i - 2) <= lim;
    for (const [ex, flip] of [[ox - 12, false], [ox + 12, true]]) {
      EYE_ROWS.forEach(([a, b], i) => {
        if (!vis(i)) return;
        const [x0, x1] = flip ? [-b, -a] : [a, b];
        for (let yy = 0; yy < 2; yy += 1) {
          const y = oy - 5 + i * 2 + yy;
          const top = !vis(i - 1) && yy === 0;
          for (let x = x0; x < x1; x += 1) px(ex + x, y, top ? GOLD[0] : GOLD[1]);
          px(ex + x0 - 1, y, GOLD[3], 0.7);
          px(ex + x1, y, GOLD[3], 0.7);
        }
      });
      // a fenda da pupila (só onde o olho está aberto) e o reflexo
      for (let y = -3; y < 5; y += 1) if (vis(Math.floor((y + 5) / 2))) px(ex - 1, oy + y, PUPIL), px(ex, oy + y, PUPIL);
      if (lim >= 1) for (const dy of [-1, 0]) for (const dx of [0, 1]) px(ex + (flip ? 2 : -4) + dx, oy + dy, GOLD[0]);
    }
  }

  function drift(ms, alpha) {
    const s = ms / 1000;
    DRIFT.forEach(([left, glyph, dur, delay]) => {
      const k = ((s + delay) % dur) / dur;
      const a = alpha * (k < 0.12 ? k / 0.12 * 0.85 : k < 0.85 ? 0.85 - ((k - 0.12) / 0.73) * 0.4 : 0.45 * (1 - (k - 0.85) / 0.15));
      const x = (left / 100) * W + (k < 0.5 ? k * 2 * 5 : 5 - (k - 0.5) * 2 * 8);
      const y = H + 6 - k * (H + 20);
      if (glyph < 0) {
        seta(x, y, EMBER[0], a);
        seta(x + 1, y, EMBER[1], a);
        seta(x, y + 1, EMBER[1], a);
        seta(x + 1, y + 1, EMBER[2], a);
      } else {
        for (const [x0, y0, x1, y1] of GLYPHS[glyph]) line(x + x0 * 0.4, y + y0 * 0.4, x + x1 * 0.4, y + y1 * 0.4, RUNE_HOT, a * 0.8);
      }
    });
  }

  /** Fundo em faixas pontilhadas: radial (elipse) da cor `ramp` para o escuro. */
  function radial(cx, cy, rx, ry, ramp, lift = 0, base = BLACK) {
    const n = ramp.length;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        const v = d * n - lift;
        const i = Math.floor(v + bayer(x, y) - 0.5);
        buf[y * W + x] = i < 0 ? ramp[0] : i >= n ? base : ramp[i];
      }
    }
  }

  function render(ms, { reduced = false } = {}) {
    fit();
    const cx = W / 2;
    const cy = Math.round(H / 2);
    const rot = reduced ? 0 : ((ms - STROBE_AT) / 48000) * Math.PI * 2;
    if (reduced) ms = Math.max(ms, REVEAL_AT + 1000);

    if (ms < DARK_AT) {
      // a luz falhando por cima do jogo: o resto da tela continua aparecendo nos buracos
      const shade = flickerShade(ms / 1000);
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) buf[y * W + x] = shade > bayer(x, y) ? BLACK : 0;
      // faíscas caindo da fiação em cada apagada
      for (const at of [...FLICKER_CUTS, FLICKER_OUT]) {
        const k = ms / 1000 - at;
        if (k < 0 || k > 0.5) continue;
        for (let i = 0; i < 9; i += 1) {
          const vx = (hash(i, at * 10) - 0.5) * 70;
          const vy = -20 - hash(i, at * 10 + 1) * 40;
          const x = cx + (hash(i, at * 10 + 2) - 0.5) * 20 + vx * k;
          const y = 8 + vy * k + 260 * k * k;
          set(x, y, SPARK[i % 3]);
          if (k < 0.25) set(x - vx * 0.02, y - (vy + 520 * k) * 0.02, SPARK[2]);
        }
      }
    } else if (ms < STROBE_AT) {
      // breu: só a vinheta vermelha bem escura pulsando com o coração
      const p = heartPulse(ms - DARK_AT);
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const d = Math.hypot((x - cx) / (W * 0.62), (y - cy) / (H * 0.62));
          const v = clamp((d - 0.38) / 0.62) * p * 0.55;
          buf[y * W + x] = v > bayer(x, y) ? (v > 0.42 ? RED[4] : RED[5]) : BLACK;
        }
      }
    } else if (ms < EYES_AT) {
      // o trovão: estrobo vermelho (liga e desliga a cada 225 ms) e o círculo se desenhando
      const on = Math.floor((ms - STROBE_AT) / 225) % 2 === 0;
      if (on) radial(cx, H * 0.4, Math.max(W, AW) * 0.9, H * 0.7, RED.slice(1), 0.2, RED[5]);
      else radial(cx, H * 0.4, W * 0.9, H * 0.7, [RED[5]], 0, BLACK);
      drift(ms, 1);
      circle(cx, cy, AW * 0.86, rot, ms - STROBE_AT, { color: on ? RUNE : RUNE_HOT, hot: true });
    } else if (ms < REVEAL_AT) {
      // os olhos no meio do círculo; o vermelho só respirando
      const br = 0.55 + 0.45 * Math.sin(((ms - EYES_AT) / 1600) * Math.PI * 2 - Math.PI / 2) ** 2;
      radial(cx, cy, AW * 0.55 * (0.8 + br * 0.3), AW * 0.55 * (0.8 + br * 0.3), [RED[4], RED[5]], 0, BLACK);
      drift(ms, 1);
      circle(cx, cy, AW * 0.86, rot, Infinity, { color: RUNE_HOT });
      eyes(cx, cy, eyeOpen(ms - EYES_AT));
    } else {
      // a revelação: o círculo maior e apagadinho girando atrás do cartão
      const k = reduced ? 1 : easeOut(clamp((ms - REVEAL_AT) / 700));
      const br = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(((ms - REVEAL_AT) / 2800) * Math.PI * 2) ** 2;
      radial(cx, H * 0.38, W * 0.8, H * 0.6 * (0.85 + br * 0.15), [RED[3], RED[4], RED[5]], 0, INK);
      if (!reduced) drift(ms, 1);
      circle(cx, cy, AW * (0.86 + 0.26 * k), rot, Infinity, { color: k < 0.5 ? RUNE_DIM : RED[2] });
    }
    g.putImageData(img, 0, 0);
  }

  return { render };
}
