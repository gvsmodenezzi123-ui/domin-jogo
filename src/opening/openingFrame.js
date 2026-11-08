/**
 * Versão 2.12: um quadro da abertura "Efeito Dominó" (o roteiro em openingPlan.js, a pintura em
 * openingArt.js). O canvas tem o tamanho do quadro em pixels da pintura (com a sobra); entra o
 * pedaço do salão onde a câmera está e, por cima, o que se mexe.
 */
import {
  BEATS,
  BOTTLE,
  GIANT,
  PAD,
  SLAM,
  TILE_H,
  TILE_W,
  TILES,
  VIEW_H,
  VIEW_W,
  cameraX,
  capAt,
  catAt,
  giantAngle,
  neonAt,
  shakeAt,
  tileAngle,
} from './openingPlan.js';
import { CAT_POSES, FAN, NEON_BOX, NEON_LAYOUT, paintGiant, paintNeonLetters, paintNeonSpill, paintNeonSub, paintPanorama, paintTile, tintAt } from './openingArt.js';

export const VW = VIEW_W + PAD.x * 2;
export const VH = VIEW_H + PAD.y * 2;
const DEG = Math.PI / 180;
const FLAG_COLORS = ['#a8302a', '#c8a02a', '#2a7a3a', '#2a4a9a', '#c8c0a8', '#a84a8a'];
const CAT_INK = { g: '#b8682a', s: '#7a3c16', d: '#5a2a10', e: '#f2f27a' };

function canvasOf({ w, h, data }) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  return c;
}

/** As bordas de cima e de baixo escurecidas (a lente), por cima de tudo. */
function vignetteCanvas() {
  const c = document.createElement('canvas');
  c.width = VW;
  c.height = VH;
  const g = c.getContext('2d');
  const top = g.createLinearGradient(0, 0, 0, VH);
  top.addColorStop(0, 'rgba(0,0,0,0.85)');
  top.addColorStop(0.2, 'rgba(0,0,0,0)');
  top.addColorStop(0.8, 'rgba(0,0,0,0)');
  top.addColorStop(1, 'rgba(0,0,0,0.8)');
  g.fillStyle = top;
  g.fillRect(0, 0, VW, VH);
  const side = g.createLinearGradient(0, 0, VW, 0);
  side.addColorStop(0, 'rgba(0,0,0,0.45)');
  side.addColorStop(0.12, 'rgba(0,0,0,0)');
  side.addColorStop(0.88, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = side;
  g.fillRect(0, 0, VW, VH);
  return c;
}

/** Pinta tudo uma vez (o salão leva uns décimos de segundo; acontece na tela preta). */
export function buildArt() {
  const letters = paintNeonLetters();
  const sub = paintNeonSub();
  const spill = paintNeonSpill();
  return {
    pano: canvasOf(paintPanorama()),
    tiles: TILES.map((t) => canvasOf(paintTile(t.face, t.face2, tintAt(t.x + 1, t.y - TILE_H / 2)))),
    giant: canvasOf(paintGiant()),
    letters: letters.map(canvasOf),
    letterPad: letters[0].pad,
    sub: canvasOf(sub),
    subAt: { x: sub.x, y: sub.y },
    spill: canvasOf(spill),
    spillX: spill.x,
    vignette: vignetteCanvas(),
  };
}

/** Um quadro da cena no tempo T (segundos). */
export function drawFrame(g, art, T) {
  const cam = Math.round(cameraX(T));
  const sh = shakeAt(T);
  const ox = PAD.x - cam + sh.x;
  const oy = PAD.y + sh.y;
  const inView = (x, margin = 40) => x + ox > -margin && x + ox < VW + margin;
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#000';
  g.fillRect(0, 0, VW, VH);
  g.drawImage(art.pano, ox - PAD.x, oy - PAD.y);

  // as bandeirinhas de festa junina no teto, balançando com o ar do salão
  for (let hook = 0; hook < 1400; hook += 112) {
    if (!inView(hook + 56, 80)) continue;
    for (let k = 0; k < 14; k += 1) {
      const s = k / 13;
      const x = hook + 4 + s * 104;
      const y = 12 + Math.sin(s * Math.PI) * 9;
      g.fillStyle = '#2a2420';
      g.fillRect(Math.round(x + ox), Math.round(y + oy), 8, 1);
      const sway = Math.round(Math.sin(T * 2.2 + k * 0.9 + hook) * 0.8);
      g.fillStyle = FLAG_COLORS[(k + hook / 112) % FLAG_COLORS.length];
      g.globalAlpha = 0.62;
      const fx = Math.round(x + ox) + 1;
      const fy = Math.round(y + oy) + 1;
      g.fillRect(fx, fy, 5, 2);
      g.fillRect(fx + 1 + sway, fy + 2, 3, 2);
      g.fillRect(fx + 2 + sway, fy + 4, 1, 2);
      g.globalAlpha = 1;
    }
  }

  // as pás do ventilador de parede, girando devagar
  if (inView(FAN.x)) {
    g.fillStyle = '#9a9a92';
    for (let k = 0; k < 3; k += 1) {
      const a = T * 7.5 + (k * Math.PI * 2) / 3;
      for (let d = 2; d <= 9; d += 1) g.fillRect(Math.round(FAN.x + Math.cos(a) * d + ox), Math.round(FAN.y + Math.sin(a) * d * 0.9 + oy), 2, 2);
    }
  }

  // as luzes da jukebox correndo de cor
  if (inView(660)) {
    const colors = ['#ff5a8a', '#ffb43a', '#5ad8ff', '#8aff6a', '#c86aff'];
    for (let k = 0; k < 6; k += 1) {
      g.fillStyle = colors[(k + Math.floor(T * 5)) % colors.length];
      g.globalAlpha = 0.55;
      g.fillRect(646 + k * 5 + ox, 128 + oy, 3, 12);
    }
    g.globalAlpha = 1;
  }

  // o pó boiando no facho das lâmpadas
  for (const lx of [140, 382]) {
    if (!inView(lx, 60)) continue;
    g.fillStyle = '#ffe8b0';
    for (let k = 0; k < 9; k += 1) {
      const y = 40 + ((k * 23 + T * (6 + (k % 3) * 2)) % 100);
      const x = lx - 20 + ((k * 37) % 40) + Math.sin(T * 0.7 + k) * 3;
      g.globalAlpha = 0.35 * Math.sin(((y - 40) / 100) * Math.PI);
      g.fillRect(Math.round(x + ox), Math.round(y + oy), 1, 1);
    }
    g.globalAlpha = 1;
  }

  // o neon acendendo: o rosa na parede e no chão, as letras e a linha de baixo
  const neon = neonAt(T);
  if (neon.glow > 0) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = neon.glow * 0.75;
    g.drawImage(art.spill, art.spillX + ox, oy - PAD.y);
    g.globalAlpha = Math.min(1, neon.glow + 0.2);
    for (let k = 0; k < neon.letters; k += 1) g.drawImage(art.letters[k], NEON_BOX.x + NEON_LAYOUT.xs[k] - art.letterPad + ox, NEON_BOX.y - art.letterPad + oy);
    if (neon.sub > 0) {
      g.globalAlpha = neon.sub;
      g.drawImage(art.sub, art.subAt.x + ox, art.subAt.y + oy);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  // o gato
  const cat = catAt(T);
  const pose = CAT_POSES[cat.pose];
  const cw = pose[0].length;
  const cx = Math.round(cat.x - cw / 2 + ox);
  const cy = Math.round(cat.y - pose.length + oy);
  pose.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ink = row[x] === 'g' && (x + y) % 3 === 0 ? CAT_INK.s : CAT_INK[row[x]];
      if (!ink) continue;
      g.fillStyle = ink;
      g.fillRect(cx + x, cy + y, 1, 1);
    }
  });

  // a gelada e a tampinha (no gargalo até estourar; depois voando e girando)
  const cap = capAt(T);
  g.fillStyle = '#c9a24a';
  if (T < BEATS.pop) g.fillRect(BOTTLE.x + 2 + ox, BOTTLE.y - 22 + oy, 3, 2);
  else if (cap) {
    const w = Math.max(1, Math.round(4 * Math.abs(Math.cos(cap.spin * Math.PI))));
    g.fillRect(Math.round(cap.x - w / 2 + ox), Math.round(cap.y + oy), w, 2);
    g.fillStyle = '#8a2a1a';
    g.fillRect(Math.round(cap.x - w / 2 + ox), Math.round(cap.y + 1 + oy), w, 1);
  }
  // a espuma espirrando do gargalo
  const foam = T - BEATS.pop;
  if (foam > 0 && foam < 0.6) {
    g.fillStyle = '#fff6e0';
    for (let k = 0; k < 10; k += 1) {
      const vx = -10 + ((k * 7) % 22);
      const vy = 26 + ((k * 13) % 18);
      const x = BOTTLE.x + 3 + vx * foam;
      const y = BOTTLE.y - 22 - vy * foam + 60 * foam * foam;
      g.globalAlpha = 1 - foam / 0.6;
      g.fillRect(Math.round(x + ox), Math.round(y + oy), 1, 1);
    }
    g.globalAlpha = 1;
  }

  // as pedras: cada uma gira em volta do pé da frente
  TILES.forEach((tile, i) => {
    if (!inView(tile.x, 24)) return;
    const a = tileAngle(i, T);
    const px = tile.x + TILE_W + ox;
    const py = tile.y + oy;
    if (a <= 0.01) {
      g.drawImage(art.tiles[i], px - TILE_W, py - TILE_H);
      return;
    }
    g.save();
    g.translate(px, py);
    g.rotate(a * DEG);
    g.drawImage(art.tiles[i], -TILE_W, -TILE_H);
    g.restore();
  });

  // o carretão gigante
  if (inView(GIANT.x, 80)) {
    const a = giantAngle(T);
    g.save();
    g.translate(GIANT.x + GIANT.w + ox, GIANT.y + oy);
    g.rotate(a * DEG);
    g.drawImage(art.giant, -GIANT.w, -GIANT.h);
    g.restore();
  }

  // a poeira da pancada
  const dust = T - SLAM;
  if (dust > 0 && dust < 1.1) {
    g.fillStyle = '#cfc6b4';
    for (let k = 0; k < 30; k += 1) {
      const dir = k % 2 ? 1 : -1;
      const sx = GIANT.x + GIANT.w + 6 + ((k * 11) % 40);
      const vx = dir * (14 + ((k * 17) % 40));
      const vy = 12 + ((k * 7) % 22);
      const x = sx + vx * dust * (1 - dust * 0.35);
      const y = GIANT.y - 1 - vy * dust + 26 * dust * dust;
      g.globalAlpha = Math.max(0, 0.75 - dust * 0.7);
      g.fillRect(Math.round(x + ox), Math.round(Math.min(GIANT.y, y) + oy), k % 3 ? 1 : 2, 1);
    }
    g.globalAlpha = 1;
  }

  // a chuva lá fora, pela fresta da porta de aço
  if (inView(1330, 120)) {
    g.fillStyle = '#9ab0e8';
    g.globalAlpha = 0.6;
    for (let k = 0; k < 20; k += 1) {
      const x = 1252 + ((k * 37) % 170);
      const y = 174 + ((T * 150 + k * 23) % 30);
      g.fillRect(Math.round(x + ox), Math.round(y + oy), 1, 3);
    }
    g.globalAlpha = 1;
  }

  g.drawImage(art.vignette, 0, 0);
  if (T < BEATS.fadeIn) {
    g.globalAlpha = 1 - Math.max(0, T) / BEATS.fadeIn;
    g.fillStyle = '#000';
    g.fillRect(0, 0, VW, VH);
    g.globalAlpha = 1;
  }
}

