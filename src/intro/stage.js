// Palco da abertura: câmera em 2,5D (camadas em profundidades diferentes, com parallax quando a
// gente anda para a frente) e os efeitos que vão por cima da pixel art em alta resolução (luz
// aditiva, fachos, brilhos, chuva, grão, vinheta).
//
// Coordenadas: cada cena é desenhada num "mundo" em pixels de arte, com o quadro de referência
// 180x320 (9:16) em (0,0)–(180,320). Na tela, esse quadro aparece inteiro (escala `s`) e o que
// sobra (telas mais altas ou mais largas) mostra o mundo em volta.
import { clamp, hash, makeCanvas } from './core.js';

export const DESIGN_W = 180;
export const DESIGN_H = 320;

/**
 * Câmera: `fx, fy` = ponto do plano principal que fica no centro da tela; `f` = quanto a gente
 * já andou para a frente (0 = parado; o plano principal aumenta 1/(1-f)); `roll` = giro (rad);
 * `ax, ay` = âncora do parallax lateral; `zoom` extra (multiplica tudo, para cortes de close).
 */
export function makeCamera(F, { fx = DESIGN_W / 2, fy = DESIGN_H / 2, f = 0, roll = 0, ax = fx, ay = fy, zoom = 1, shakeX = 0, shakeY = 0 }) {
  const { W, H, s } = F;
  const layer = (depth) => {
    const z = (depth / Math.max(0.04, depth - f)) * zoom;
    return {
      sc: s * z,
      cx: ax + (fx - ax) / depth,
      cy: ay + (fy - ay) / depth,
    };
  };
  const cache = new Map();
  const at = (depth) => {
    let L = cache.get(depth);
    if (!L) {
      L = layer(depth);
      cache.set(depth, L);
    }
    return L;
  };
  const cam = {
    roll,
    /** Ponto do mundo (na profundidade `depth`) → tela. */
    toScreen(x, y, depth = 1) {
      const L = at(depth);
      return [W / 2 + (x - L.cx) * L.sc + shakeX, H / 2 + (y - L.cy) * L.sc + shakeY];
    },
    /** Tamanho de 1 pixel de arte na tela, na profundidade `depth`. */
    scale: (depth = 1) => at(depth).sc,
    /** Desenha um canvas de arte com o canto (ox, oy) no mundo. */
    blit(g, canvas, ox, oy, depth = 1, alpha = 1) {
      if (alpha <= 0) return;
      const L = at(depth);
      const x = Math.round(W / 2 + (ox - L.cx) * L.sc + shakeX);
      const y = Math.round(H / 2 + (oy - L.cy) * L.sc + shakeY);
      const w = Math.round(canvas.width * L.sc);
      const h = Math.round(canvas.height * L.sc);
      if (x > W || y > H || x + w < 0 || y + h < 0) return;
      g.globalAlpha = alpha;
      g.drawImage(canvas, x, y, w, h);
      g.globalAlpha = 1;
    },
    /** Desenha um canvas já borrado (brilho), liso e aditivo. */
    glowBlit(g, canvas, ox, oy, depth = 1, alpha = 1, scale = 1) {
      if (alpha <= 0.002) return;
      const L = at(depth);
      const x = W / 2 + (ox - L.cx) * L.sc + shakeX;
      const y = H / 2 + (oy - L.cy) * L.sc + shakeY;
      g.save();
      g.imageSmoothingEnabled = true;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(1, alpha);
      g.drawImage(canvas, x, y, canvas.width * L.sc * scale, canvas.height * L.sc * scale);
      g.restore();
    },
  };
  return cam;
}

/** Aplica o giro da câmera em volta do centro da tela durante `draw`. */
export function withRoll(g, F, roll, draw) {
  if (!roll) {
    draw();
    return;
  }
  g.save();
  g.translate(F.W / 2, F.H / 2);
  g.rotate(roll);
  // um pouco maior para os cantos não aparecerem vazios no giro
  const k = 1 + Math.abs(roll) * 2.2;
  g.scale(k, k);
  g.translate(-F.W / 2, -F.H / 2);
  draw();
  g.restore();
}

// --- luz (em alta, por cima dos pixels) ------------------------------------------

/** Brilho redondo aditivo (lâmpada, neon, olho do Corvo). Raio e posição em px da tela. */
export function glow(g, x, y, r, color, alpha = 1) {
  if (alpha <= 0.002 || r <= 0) return;
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color.replace(/,\s*[\d.]+\)$/, ',0.35)'));
  grad.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ',0)'));
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, alpha);
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

/** Brilho elíptico (mancha de luz no chão, reflexo largo). */
export function glowEllipse(g, x, y, rx, ry, color, alpha = 1) {
  if (alpha <= 0.002 || rx <= 0 || ry <= 0) return;
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  glow(g, 0, 0, rx, color, alpha);
  g.restore();
}

/**
 * Facho de luz (trapézio) do ponto (x0,y0), meia-largura w0, até (x1,y1), meia-largura w1,
 * esmaecendo para o fim e para as bordas. Aditivo.
 */
export function beam(g, x0, y0, w0, x1, y1, w1, color, alpha = 1) {
  if (alpha <= 0.002) return;
  const ang = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
  const len = Math.hypot(x1 - x0, y1 - y0);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.translate(x0, y0);
  g.rotate(ang);
  // bordas suaves: várias camadas mais estreitas por cima umas das outras
  const layers = 12;
  for (let i = 0; i < layers; i += 1) {
    const k = 1 - i / layers;
    const grad = g.createLinearGradient(0, 0, 0, len);
    grad.addColorStop(0, color.replace(/,\s*[\d.]+\)$/, `,${(alpha / layers) * 1.6})`));
    grad.addColorStop(0.55, color.replace(/,\s*[\d.]+\)$/, `,${(alpha / layers) * 0.7})`));
    grad.addColorStop(1, color.replace(/,\s*[\d.]+\)$/, ',0)'));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-w0 * k, 0);
    g.lineTo(w0 * k, 0);
    g.lineTo(w1 * k, len);
    g.lineTo(-w1 * k, len);
    g.closePath();
    g.fill();
  }
  g.restore();
}

// --- pós-processamento ---------------------------------------------------------

let grainCache = null;
/** Grão de filme (textura pronta; muda de lugar a cada quadro). */
export function grain(g, F, t, alpha = 0.06) {
  if (!grainCache) {
    grainCache = makeCanvas(160, 160);
    const gg = grainCache.getContext('2d');
    const img = gg.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(hash(i, 3) * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gg.putImageData(img, 0, 0);
  }
  const frame = Math.floor(t * 24);
  const ox = Math.floor(hash(frame, 1) * 160);
  const oy = Math.floor(hash(frame, 2) * 160);
  const tile = Math.max(2, Math.round(F.W / 360)); // o grão acompanha a resolução
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = 'overlay';
  g.imageSmoothingEnabled = false;
  const size = 160 * tile;
  for (let y = -oy * tile; y < F.H; y += size) for (let x = -ox * tile; x < F.W; x += size) g.drawImage(grainCache, x, y, size, size);
  g.restore();
}

const vignetteCache = { key: '', canvas: null };
/** Vinheta (cantos escuros). `strength` 0..1. */
export function vignette(g, F, strength = 0.7, color = '0,0,0') {
  const key = `${F.W}x${F.H}:${color}`;
  if (vignetteCache.key !== key) {
    const c = makeCanvas(F.W, F.H);
    const vg = c.getContext('2d');
    const r = Math.hypot(F.W, F.H) / 2;
    const grad = vg.createRadialGradient(F.W / 2, F.H * 0.48, r * 0.35, F.W / 2, F.H * 0.48, r * 1.02);
    grad.addColorStop(0, `rgba(${color},0)`);
    grad.addColorStop(0.6, `rgba(${color},0.35)`);
    grad.addColorStop(1, `rgba(${color},0.92)`);
    vg.fillStyle = grad;
    vg.fillRect(0, 0, F.W, F.H);
    vignetteCache.key = key;
    vignetteCache.canvas = c;
  }
  g.save();
  g.globalAlpha = clamp(strength);
  g.drawImage(vignetteCache.canvas, 0, 0);
  g.restore();
}

/** Pinta a tela inteira com uma cor num modo de mistura (gradação de cor por cena). */
export function grade(g, F, color, mode = 'soft-light', alpha = 1) {
  if (alpha <= 0) return;
  g.save();
  g.globalCompositeOperation = mode;
  g.globalAlpha = clamp(alpha);
  g.fillStyle = color;
  g.fillRect(0, 0, F.W, F.H);
  g.restore();
}

/** Cobre a tela com uma cor (fades, flashes). */
export function fill(g, F, color, alpha = 1, mode = 'source-over') {
  if (alpha <= 0.002) return;
  g.save();
  g.globalCompositeOperation = mode;
  g.globalAlpha = clamp(alpha);
  g.fillStyle = color;
  g.fillRect(0, 0, F.W, F.H);
  g.restore();
}
