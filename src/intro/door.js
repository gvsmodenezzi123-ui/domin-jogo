// Cena 2: a porta de perto. A cortina de fitas de plástico brilha com a luz de dentro; a nossa
// mão entra por baixo e afasta as fitas, os raios de luz quente atravessam a fresta e a gente
// entra (a luz estoura em branco-âmbar e abre no boteco).
import { bands, boxBlur, clamp, copyCanvas, easeOut, hash, makeCanvas, mix, pix, poly, rect, rimLight, silhouette, smooth, span, text5 } from './core.js';
import { beam, fill, glow, glowEllipse, makeCamera, vignette, withRoll } from './stage.js';

export const DOOR_LEN = 0.8;

const WORLD = { ox: -40, oy: -40, w: 260, h: 400 };
/** Vão da porta (onde as fitas penduram). */
const GAP = { x: 22, y: 64, w: 136, h: 270 };
const STRIPS = 22;
const STRIP_COLORS = ['#e2493b', '#f3c13a', '#43b46e', '#4d84dc', '#ef8a2e'];

function wallArt() {
  const c = makeCanvas(WORLD.w, WORLD.h);
  const g = pix(c);
  g.translate(-WORLD.ox, -WORLD.oy);
  bands(g, -40, 260, [
    [-40, '#2b4148'],
    [200, '#22363d'],
    [360, '#1b2c32'],
  ]);
  for (let i = 0; i < 1600; i += 1) rect(g, -40 + hash(i, 1) * 260, -40 + hash(i, 2) * 400, 1, 1, hash(i, 3) > 0.5 ? '#2e474e' : '#182629');
  // azulejo de baixo dos dois lados
  for (const [x0, x1] of [
    [-40, 14],
    [166, 220],
  ]) {
    for (let y = 250; y < 360; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const tx = (x + 400) % 12;
        const ty = (y - 250) % 12;
        let col = '#1b2847';
        if (tx === 0 || ty === 0) col = '#0c1220';
        else if (tx === 6 || ty === 6) col = '#5a78ad';
        else if ((tx === 3 || tx === 9) && (ty === 3 || ty === 9)) col = '#5a78ad';
        rect(g, x, y, 1, 1, col);
      }
    }
    rect(g, x0, 248, x1 - x0, 2, '#2f474e');
  }
  // batente de aço
  rect(g, GAP.x - 8, 20, 8, 340, '#1a1d23');
  rect(g, GAP.x + GAP.w, 20, 8, 340, '#1a1d23');
  rect(g, GAP.x - 8, 20, 2, 340, '#2c3038');
  rect(g, GAP.x + GAP.w + 6, 20, 2, 340, '#101216');
  // caixa da porta de aço e o aço enrolado
  rect(g, GAP.x - 8, 14, GAP.w + 16, 12, '#3d424a');
  rect(g, GAP.x - 8, 14, GAP.w + 16, 2, '#525862');
  for (let y = 26; y < 58; y += 4) {
    rect(g, GAP.x, y, GAP.w, 2, '#50565f');
    rect(g, GAP.x, y + 2, GAP.w, 2, '#2d3138');
  }
  rect(g, GAP.x, 58, GAP.w, 6, '#6b717b');
  rect(g, GAP.x, 58, GAP.w, 1, '#8a909a');
  rect(g, GAP.x + 30, 58, 8, 6, '#9aa0aa');
  rect(g, GAP.x + GAP.w - 38, 58, 8, 6, '#9aa0aa');
  // placa 147
  rect(g, 168, 120, 30, 18, '#c7cfdc');
  rect(g, 170, 122, 26, 14, '#183c7a');
  text5(g, '147', 174, 126, '#c7cfdc');
  // soleira
  rect(g, GAP.x - 8, 332, GAP.w + 16, 6, '#4a4a54');
  rect(g, GAP.x - 8, 332, GAP.w + 16, 1, '#66666f');
  return c;
}

/** Lá dentro, atrás das fitas: luz quente, a lâmpada, o balcão com o Valtinho e o Tio Zé de chapéu. */
function insideArt() {
  const c = makeCanvas(GAP.w, GAP.h);
  const g = pix(c);
  bands(g, 0, GAP.w, [
    [0, '#ffe2a6'],
    [90, '#f6b462'],
    [GAP.h, '#b9672a'],
  ]);
  const S = '#8a4f22';
  const D = '#6a3816';
  // lâmpada
  rect(g, 86, 0, 1, 40, D);
  poly(
    g,
    [
      [76, 40],
      [97, 40],
      [104, 52],
      [69, 52],
    ],
    D,
  );
  rect(g, 82, 52, 10, 3, '#fff4cc');
  // balcão e o Valtinho atrás (silhuetas)
  rect(g, 0, 150, 46, 120, S);
  rect(g, 0, 146, 50, 6, D);
  rect(g, 14, 104, 18, 16, S);
  rect(g, 8, 120, 30, 28, S);
  // Tio Zé de chapéu, sentado
  rect(g, 76, 112, 34, 6, D);
  rect(g, 83, 98, 20, 14, D);
  rect(g, 85, 118, 16, 16, D);
  rect(g, 72, 134, 42, 44, D);
  // a mesa
  rect(g, 50, 176, 86, 8, D);
  rect(g, 56, 184, 6, 86, S);
  rect(g, 124, 184, 6, 86, S);
  // cadeira vazia do lado de cá
  rect(g, 40, 196, 4, 74, S);
  rect(g, 40, 196, 22, 4, S);
  return c;
}

/** A nossa mão direita (manga do casaco), vista por trás e contra a luz: escura, com o contorno aceso. */
function handArt() {
  const W = 42;
  const H = 80;
  const c = makeCanvas(W, H);
  const g = pix(c);
  const skin = '#4e2c1d';
  const mid = '#63392a';
  const gapCol = '#2c170e';
  // dedos: indicador, médio, anelar, mindinho (x, topo, largura)
  const fingers = [
    [10, 7, 5],
    [16, 3, 5],
    [22, 6, 5],
    [28, 13, 4],
  ];
  for (const [x, top, w] of fingers) {
    rect(g, x + 1, top, w - 2, 1, skin);
    rect(g, x, top + 1, w, 34 - top, skin);
    rect(g, x + 1, top + 1, w - 2, 2, mid);
    rect(g, x + 1, top + Math.round((34 - top) * 0.42), w - 2, 1, gapCol);
    rect(g, x + w, top + 3, 1, 32 - top, gapCol);
  }
  // costas da mão, arredondada, estreitando no punho
  poly(
    g,
    [
      [9, 32],
      [33, 32],
      [34, 42],
      [31, 52],
      [12, 53],
      [8, 44],
    ],
    skin,
  );
  for (let i = 0; i < 4; i += 1) rect(g, 11 + i * 6, 33, 3, 1, mid);
  rect(g, 18, 40, 1, 9, mid);
  rect(g, 24, 39, 1, 10, mid);
  // polegar saindo para a esquerda
  poly(
    g,
    [
      [10, 46],
      [4, 36],
      [2, 28],
      [5, 26],
      [9, 32],
      [13, 41],
    ],
    skin,
  );
  rect(g, 3, 28, 2, 2, mid);
  // manga do casaco
  poly(
    g,
    [
      [10, 50],
      [33, 49],
      [39, 80],
      [5, 80],
    ],
    '#1b1f2e',
  );
  rect(g, 10, 50, 23, 3, '#12141f');
  for (let y = 58; y < 80; y += 7) rect(g, 9 + (y % 4), y, 22, 1, '#141725');
  // contorno aceso pela luz de dentro do boteco
  const rim = rimLight(c, '#e8925a', [
    [0, -1],
    [-1, 0],
    [1, 0],
  ]);
  g.drawImage(rim, 0, 0);
  const rim2 = rimLight(c, '#ffe0b0', [[0, -1]]);
  g.drawImage(rim2, 0, 0);
  return c;
}

/** Uma fita com volume: borda escura, miolo claro (a luz passando pelo plástico). */
function stripArt(color) {
  const shades = [0.55, 0.88, 1.1, 1.22, 0.96, 0.62];
  const c = makeCanvas(shades.length, 1);
  const g = pix(c);
  shades.forEach((k, x) => rect(g, x, 0, 1, 1, k > 1 ? mix(color, '#ffffff', (k - 1) * 1.6) : mix(color, '#000000', 1 - k)));
  return c;
}

export function buildDoor() {
  const wall = wallArt();
  const inside = insideArt();
  const hand = handArt();
  const handGlow = boxBlur(copyCanvas(silhouette(hand, '#ffb070'), 8), 3, 3);
  const strips = STRIP_COLORS.map(stripArt);
  const order = Array.from({ length: STRIPS }, (_, i) => Math.floor(hash(i, 5) * STRIP_COLORS.length));
  const frame = makeCanvas(WORLD.w, WORLD.h);
  const sw = GAP.w / STRIPS;

  /** Onde a mão está (mundo) e quanto já empurrou as fitas (0..1). */
  const handState = (t) => {
    const enter = easeOut(span(t, 0.02, 0.32));
    const push = smooth(span(t, 0.26, 0.62));
    const x = 96 + push * 6;
    const y = 360 - enter * 150 - push * 20;
    return { x, y, push };
  };

  const draw = (F) => {
    const { out, t } = F;
    const H = handState(t);
    const k = span(t, 0, DOOR_LEN);
    const cam = makeCamera(F, {
      fx: 92 + (H.x - 92) * 0.2 * k,
      fy: 196 - 20 * k,
      ax: 92,
      ay: 196,
      f: 0.12 + 0.42 * k * k,
      roll: F.reduced ? 0 : Math.sin(t * 5) * 0.004,
    });

    const g = pix(frame);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, frame.width, frame.height);
    g.drawImage(wall, 0, 0);
    g.translate(-WORLD.ox, -WORLD.oy);
    g.drawImage(inside, GAP.x, GAP.y);
    // fitas: presas em cima, afastadas em volta da mão (mais na altura dela)
    for (let i = 0; i < STRIPS; i += 1) {
      const cx = GAP.x + (i + 0.5) * sw;
      const away = cx - H.x;
      const side = away === 0 ? 1 : Math.sign(away);
      const reach = Math.exp(-((away / 26) ** 2));
      const sway = Math.sin(t * 2.4 + i * 0.8) * 1.2;
      const tex = strips[order[i]];
      for (let y = GAP.y; y < GAP.y + GAP.h; y += 3) {
        const down = (y - GAP.y) / GAP.h;
        const toHand = clamp((y - GAP.y) / Math.max(20, H.y - 20 - GAP.y));
        const dx = side * H.push * reach * 30 * smooth(toHand) + sway * down * down;
        const x = Math.round(cx - sw / 2 + dx);
        // dobras do plástico: a luz varia ao longo da fita
        g.globalAlpha = 0.8 + 0.12 * Math.sin(y * 0.11 + i * 1.7 + t * 0.8);
        g.drawImage(tex, x, y, 6, 3);
      }
    }
    g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);

    withRoll(out, F, cam.roll, () => {
      cam.blit(out, frame, WORLD.ox, WORLD.oy);
      const sc = cam.scale(1);
      // a luz de dentro vazando pelas fitas
      const [gx, gy] = cam.toScreen(GAP.x + GAP.w / 2, GAP.y + GAP.h * 0.45);
      glowEllipse(out, gx, gy, sc * 90, sc * 150, 'rgba(255,190,110,0.55)', 0.45);
      // a fresta aberta: raios de luz vindo na nossa direção
      if (H.push > 0) {
        const [hx, hy] = cam.toScreen(H.x, H.y - 40);
        glow(out, hx, hy, sc * (40 + H.push * 90), 'rgba(255,220,160,0.9)', 0.75 * H.push);
        for (let r = 0; r < 7; r += 1) {
          const ang = -Math.PI / 2 + (r - 3) * 0.28 + Math.sin(t * 3 + r) * 0.04;
          const len = sc * (160 + hash(r, 7) * 120);
          beam(out, hx, hy, sc * 3, hx + Math.cos(ang + Math.PI) * len * 0.2, hy + len, sc * (14 + hash(r, 8) * 16), 'rgba(255,210,150,0.5)', 0.22 * H.push);
        }
      }
      // luz vermelha do neon, que está logo acima, fora do quadro
      const [, ty] = cam.toScreen(0, -40);
      const grad = out.createLinearGradient(0, ty, 0, ty + sc * 160);
      grad.addColorStop(0, 'rgba(255,60,40,0.35)');
      grad.addColorStop(1, 'rgba(255,60,40,0)');
      out.save();
      out.globalCompositeOperation = 'lighter';
      out.fillStyle = grad;
      out.fillRect(0, ty, F.W, sc * 160);
      out.restore();
      // a mão (bem perto da câmera), contra a luz: um halo quente em volta
      cam.glowBlit(out, handGlow, H.x - 21 - 8, H.y - 4 - 8, 0.86, 0.9);
      cam.blit(out, hand, H.x - 21, H.y - 4, 0.86);
    });
    vignette(out, F, 0.8);
    // entrando: estoura a luz
    const burst = smooth(span(t, 0.5, DOOR_LEN));
    fill(out, F, '#ffe6b8', burst, 'source-over');
  };

  return { draw };
}
