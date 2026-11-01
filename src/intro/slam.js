// Cena 4: o close da bucha. A mão do Tio Zé desce com o [6|6] e bate no feltro: quadro de
// impacto, tremor, as outras pedras pulam, o dorme estremece, a poeira sobe e a lâmpada
// balança. A luz falha duas vezes e apaga.
//
// Versão 2.3: no modelo novo do jogo: o feltro pintado com a luz da lâmpada, as pedras de osso
// com espessura, chanfro, pontos cavados e o pino de latão (pintadas em 2× e desenhadas na
// resolução da tela), o dorme da partida e a mão com volume. Sem copo, cinzeiro e tampinhas.
import { clamp, easeIn, ellipse, hash, makeCanvas, mix, pix, rect, rimLight, silhouette, span } from './core.js';
import { fill, glow, glowEllipse, makeCamera, vignette, withRoll } from './stage.js';
import { paintKit } from '../components/art/botecoScene.js';
import { spriteKit } from '../components/art/relicPixels.js';

export const SLAM_LEN = 1.0;
/** O instante da batida, dentro da cena. */
export const SLAM_HIT = 0.13;
/** A lâmpada apaga. */
export const SLAM_DARK = 0.8;

const WORLD = { ox: -40, oy: -40, w: 260, h: 400 };
const HALF = 26;
const PIPS = {
  0: [],
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 1],
    [0, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

/** As pedras e a mão são pintadas em 2× (o detalhe aparece na tela). */
const RES = 2;

/** Buffer dos pintores → <canvas>. */
function canvasOf(b) {
  const c = makeCanvas(b.w, b.h);
  c.getContext('2d').putImageData(new ImageData(b.data, b.w, b.h), 0, 0);
  return c;
}

/**
 * Pedra grande, de cima (em 2×): osso com o degradê da luz, o chanfro claro em cima e à
 * esquerda, a espessura embaixo (a lateral), o veio do osso, a divisória cavada com o pino de
 * latão e os pontos fundos (sombra em cima, a borda clara embaixo).
 */
function tileArt(a, b, vertical) {
  const w = (vertical ? HALF : HALF * 2) * RES;
  const h = (vertical ? HALF * 2 : HALF) * RES;
  const depth = 3 * RES;
  const buf = paintKit.buffer(w + 2, h + depth + 2);
  const k = spriteKit.kit(buf);
  const bone = spriteKit.mat('#e8dcbc');
  const side = spriteKit.mat('#a8906a');
  // a lateral (espessura) e o tampo
  k.box(1, depth, w, h, side, { r: 6, light: -0.35 });
  k.box(1, 1, w, h, bone, { r: 6, light: 0.25 });
  // o degradê da luz e o veio do osso
  k.each(2, 2, w - 1, h - 1, (x, y) => {
    if (!k.solid(x, y)) return null;
    const vein = Math.sin(x * 0.11 + Math.sin(y * 0.05) * 3 + y * 0.02);
    if (vein > 0.94) return spriteKit.shade(bone, -0.15, x, y);
    return null;
  });
  // a divisória cavada e o pino
  const half = HALF * RES;
  if (vertical) {
    k.line(8, half, w - 7, half, bone.deep);
    k.line(8, half + 1, w - 7, half + 1, bone.sp, 0.8);
  } else {
    k.line(half, 8, half, h - 7, bone.deep);
    k.line(half + 1, 8, half + 1, h - 7, bone.sp, 0.8);
  }
  k.ell(vertical ? w / 2 + 1 : half + 1, vertical ? half + 1 : h / 2 + 1, 3, 3, spriteKit.mat('#c9962e'));
  // os pontos cavados
  const pipAt = (cx, cy) => {
    k.ell(cx, cy, 4.2, 4.2, spriteKit.mat('#2a1d14'), { flat: true, light: -0.6, spec: false });
    k.ell(cx - 0.5, cy - 0.8, 3, 2.6, spriteKit.mat('#140c06'), { flat: true, light: -0.3, spec: false });
    k.line(cx - 2, cy + 3.5, cx + 2, cy + 3.5, bone.sp, 0.9);
  };
  const face = (ox, oy, n) => {
    for (const [px, py] of PIPS[n]) pipAt(ox + (6 + px * 7 + 2) * RES, oy + (6 + py * 7 + 2) * RES);
  };
  if (vertical) {
    face(1, 1, a);
    face(1, half + 1, b);
  } else {
    face(1, 1, a);
    face(half + 1, 1, b);
  }
  spriteKit.outline(buf, paintKit.hex('#140c06'), 0.85);
  return canvasOf(buf);
}

function feltArt() {
  const c = makeCanvas(WORLD.w, WORLD.h);
  const g = pix(c);
  g.translate(-WORLD.ox, -WORLD.oy);
  // o escuro do outro lado da mesa (o paletó do Tio Zé)
  rect(g, -40, -40, 260, 60, '#0d0a08');
  // a borda de mogno do lado de lá, com o friso aceso
  rect(g, -40, 14, 260, 10, '#4a2410');
  rect(g, -40, 14, 260, 1, '#c8844a');
  rect(g, -40, 15, 260, 1, '#7a3c1c');
  rect(g, -40, 23, 260, 2, '#1a0a04');
  for (let x = -36; x < 220; x += 17) rect(g, x, 18, 8, 1, '#5a2c14');
  // o feltro: miolo claro debaixo da lâmpada, escurecendo, fiapos e manchas antigas
  const tones = ['#142212', '#24381e', '#3a5a30', '#5a7a46'];
  for (let y = 25; y < 360; y += 1) {
    for (let x = -40; x < 220; x += 1) {
      const d = Math.hypot((x - 90) / 170, (y - 170) / 230);
      const n = hash(x * 17 + y * 5, 1);
      const v = 1.05 - d * 1.5 + (n - 0.5) * 0.3;
      let col = v > 0.62 ? tones[3] : v > 0.18 ? tones[2] : v > -0.3 ? tones[1] : tones[0];
      if (n > 0.975) col = mix(col, '#a8c088', 0.3);
      rect(g, x, y, 1, 1, col);
    }
  }
  // fiapos e a queimadura de cigarro antiga
  for (let i = 0; i < 90; i += 1) {
    const x = -40 + hash(i, 2) * 260;
    const y = 25 + hash(i, 3) * 335;
    rect(g, x, y, 2, 1, '#2a4a26');
  }
  ellipse(g, 30, 250, 3, 2, '#1a1208');
  rect(g, 29, 249, 2, 1, '#3a2a14');
  for (let a = 0; a < Math.PI * 2; a += 0.2) rect(g, Math.round(140 + Math.cos(a) * 9), Math.round(268 + Math.sin(a) * 4), 1, 1, '#2a4022');
  return c;
}

/**
 * A mão do Tio Zé vindo de cima (em 2×): a manga escura com as dobras, o punho da camisa com a
 * abotoadura, as costas da mão com volume e os tendões, os dedos apertando a pedra, o polegar
 * por fora e o anel de ouro. A luz da lâmpada pega na beira esquerda.
 */
const HAND = { w: 44, h: 122 };
function handArt() {
  const W = HAND.w * RES;
  const H = HAND.h * RES;
  const buf = paintKit.buffer(W, H);
  const k = spriteKit.kit(buf);
  const suit = spriteKit.mat('#2a2622');
  const shirt = spriteKit.mat('#5a524a');
  const skin = spriteKit.mat('#c88a5a');
  // a manga do paletó, com as dobras
  k.poly(
    [
      [18, 0],
      [70, 0],
      [68, 152],
      [20, 152],
    ],
    suit,
    { light: (x) => 0.25 - (x - 18) * 0.014 },
  );
  for (let y = 24; y < 150; y += 30) {
    k.line(26, y, 58, y - 6, suit.deep, 0.9);
    k.line(26, y + 1, 58, y - 5, suit.hi, 0.35);
  }
  // o punho da camisa e a abotoadura
  k.box(18, 146, 54, 16, shirt, { r: 2 });
  k.ell(60, 154, 3, 2.5, spriteKit.mat('#c9962e'));
  // as costas da mão (mais larga que o punho)
  k.poly(
    [
      [20, 160],
      [70, 160],
      [76, 182],
      [74, 202],
      [14, 202],
      [12, 180],
    ],
    skin,
    { bevel: true, light: (x, y) => 0.35 - (x - 12) * 0.012 - (y - 160) * 0.008 },
  );
  for (const vx of [32, 44, 56]) k.line(vx, 174, vx - 1, 196, skin.lo, 0.7);
  // os nós dos dedos
  for (let i = 0; i < 4; i += 1) k.ell(22 + i * 14, 199, 6, 3.5, skin, { light: 0.2, spec: false });
  // os dedos apontando para nós, apertando a pedra (curtos: vêm na nossa direção)
  for (let i = 0; i < 4; i += 1) {
    const x = 22 + i * 14;
    const len = [30, 34, 32, 24][i];
    k.bar(x, 200, x, 200 + len, 12, skin, { light: 0.05 });
    k.line(x - 4, 200 + len * 0.45, x + 4, 200 + len * 0.45, skin.lo, 0.7);
    k.ell(x, 200 + len - 2, 4, 3, spriteKit.mat('#e8c0a0'), { flat: true, light: 0.3, spec: false });
  }
  // o polegar por fora, à esquerda
  k.bar(16, 172, 6, 214, 12, skin, { light: 0.2 });
  k.ell(6, 214, 4.5, 3.5, spriteKit.mat('#e8c0a0'), { flat: true, light: 0.3, spec: false });
  // o anel de ouro no anelar
  k.box(58, 208, 13, 5, spriteKit.mat('#d8a838'), { r: 1 });
  k.px(60, 208, paintKit.hex('#fff6c0'));
  spriteKit.outline(buf, paintKit.hex('#0c0806'), 0.85);
  const c = canvasOf(buf);
  const rim = rimLight(c, '#ffd8a0', [[-1, 0]]);
  const g = c.getContext('2d');
  g.globalAlpha = 0.55;
  g.drawImage(rim, 0, 0);
  g.globalAlpha = 1;
  return c;
}

export function buildSlam(sprites = {}) {
  const felt = feltArt();
  const t24 = tileArt(2, 4, false);
  const t46 = tileArt(4, 6, false);
  const t66 = tileArt(6, 6, true);
  const hand = handArt();
  const dorme = sprites.boneyard ?? null;
  const t66White = silhouette(t66, '#ffffff');
  const handWhite = silhouette(hand, '#ffffff');
  const frame = makeCanvas(WORLD.w, WORLD.h);
  /** Tamanho na arte de cada peça pintada em 2×. */
  const size = (c) => [c.width / RES, c.height / RES];

  const draw = (F) => {
    const { out, t } = F;
    const hit = span(t, SLAM_HIT, SLAM_HIT + 0.42);
    const decay = t < SLAM_HIT ? 0 : (1 - hit) ** 2;
    const shake = F.reduced ? 0 : decay * 7;
    const shakeX = Math.sin(t * 90) * shake * F.s * 0.6;
    const shakeY = Math.cos(t * 77) * shake * F.s * 0.5;
    const push = t < SLAM_HIT ? 0 : 0.05 * (1 - hit);
    const cam = makeCamera(F, {
      fx: 92,
      fy: 166,
      f: 0.06 + t * 0.05 + push,
      shakeX,
      shakeY,
      roll: F.reduced ? 0 : -0.01 + decay * Math.sin(t * 50) * 0.01,
    });
    // pedra descendo (com a mão) até a batida; depois a mão solta e sobe um pouco
    const fallK = easeIn(span(t, 0, SLAM_HIT));
    const tileY = t < SLAM_HIT ? -120 + fallK * (137 + 120) : 137;
    const lift = span(t, SLAM_HIT + 0.2, SLAM_HIT + 0.6);
    const handY = tileY - 104 - lift * 20;
    const hop = t > SLAM_HIT && t < SLAM_HIT + 0.12 ? Math.sin(((t - SLAM_HIT) / 0.12) * Math.PI) * 3 : 0;
    const jiggle = t > SLAM_HIT && t < SLAM_HIT + 0.2 ? Math.sin(((t - SLAM_HIT) / 0.2) * Math.PI * 3) * 1.2 : 0;

    const g = pix(frame);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, frame.width, frame.height);
    g.drawImage(felt, 0, 0);
    g.translate(-WORLD.ox, -WORLD.oy);
    // sombras das pedras no feltro
    g.globalAlpha = 0.45;
    rect(g, -27, 153, 104, 28, '#0a140d');
    const near = clamp(1 - (137 - tileY) / 160);
    const grow = Math.round((1 - near) * 6);
    // a sombra da bucha chegando: macia (três camadas), aperta quando ela encosta
    for (let i = 0; i < 3; i += 1) {
      g.globalAlpha = 0.2 * near;
      rect(g, 79 - grow - i, 141 - grow - i, 26 + (grow + i) * 2, 54 + (grow + i) * 2, '#06100a');
    }
    g.globalAlpha = 0.25;
    rect(g, 118, 72, 58, 8, '#06100a');
    g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);

    // a lâmpada balançando depois da batida: a mancha de luz vai e vem
    const swing = t < SLAM_HIT ? 0 : Math.sin((t - SLAM_HIT) * 7.5) * 34 * (1 - span(t, SLAM_HIT, 1.6) * 0.5);
    const flicker = !F.reduced && t > 0.62 && t < 0.67;
    const light = t >= SLAM_DARK ? 0 : flicker ? 0.45 : 1;

    withRoll(out, F, cam.roll, () => {
      cam.blit(out, frame, WORLD.ox, WORLD.oy);
      const sc = cam.scale(1);
      // Versão 2.3: as pedras, o dorme e a mão na resolução da tela
      cam.blitScaled(out, t24, -29, 150 - hop, ...size(t24));
      cam.blitScaled(out, t46, 24, 150 - hop, ...size(t46));
      if (dorme) cam.blitScaled(out, dorme, 122 + jiggle, 34 - Math.abs(jiggle), 54, 40);
      cam.blitScaled(out, t66, 77, tileY, ...size(t66));
      if (handY > -200) cam.blitScaled(out, hand, 68, handY, HAND.w, HAND.h);
      // poeira saindo de baixo da pedra
      if (t > SLAM_HIT) {
        const [ox0, oy0] = cam.toScreen(0, 0);
        out.save();
        out.translate(ox0, oy0);
        out.scale(sc, sc);
        const pk = span(t, SLAM_HIT, SLAM_HIT + 0.5);
        for (let i = 0; i < 46; i += 1) {
          const ang = hash(i, 11) * Math.PI * 2;
          const dist = (10 + hash(i, 12) * 34) * Math.sqrt(pk);
          const x = 90 + Math.cos(ang) * (13 + dist);
          const y = 163 + Math.sin(ang) * (26 + dist * 0.7) - pk * 8;
          out.globalAlpha = (1 - pk) * 0.8;
          rect(out, x, y, hash(i, 13) > 0.6 ? 2 : 1, 1, hash(i, 14) > 0.5 ? '#c8c2b0' : '#8a947e');
        }
        out.globalAlpha = 1;
        out.restore();
      }
      // tudo fora da luz fica bem escuro
      const [lx, ly] = cam.toScreen(92 + swing, 150);
      out.save();
      const grad = out.createRadialGradient(lx, ly, sc * 40, lx, ly, sc * 190);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.82)');
      out.fillStyle = grad;
      out.fillRect(0, 0, F.W, F.H);
      out.restore();
      glowEllipse(out, lx, ly + sc * 10, sc * 100, sc * 120, 'rgba(255,214,150,0.5)', 0.4 * light);
      // a onda de choque na batida
      if (t > SLAM_HIT && t < SLAM_HIT + 0.25) {
        const k = (t - SLAM_HIT) / 0.25;
        const [cx, cy] = cam.toScreen(90, 166);
        out.save();
        out.strokeStyle = `rgba(255,240,210,${0.7 * (1 - k)})`;
        out.lineWidth = sc * (3 - k * 2);
        out.beginPath();
        out.ellipse(cx, cy, sc * (20 + k * 90), sc * (14 + k * 60), 0, 0, Math.PI * 2);
        out.stroke();
        out.restore();
        glow(out, cx, cy, sc * 60 * (1 - k * 0.5), 'rgba(255,230,180,0.8)', 0.6 * (1 - k));
      }
      // riscos de velocidade da descida
      if (t < SLAM_HIT) {
        out.save();
        out.strokeStyle = 'rgba(255,240,220,0.35)';
        out.lineWidth = sc * 0.8;
        for (let i = 0; i < 7; i += 1) {
          const x = 77 + i * 4.5;
          const [sx, sy] = cam.toScreen(x, tileY - 30 - hash(i, 31) * 40);
          out.beginPath();
          out.moveTo(sx, sy);
          out.lineTo(sx, sy - sc * (30 + hash(i, 32) * 40));
          out.stroke();
        }
        out.restore();
      }
    });
    // quadro de impacto: silhuetas brancas no preto (2 quadros)
    if (!F.reduced && t >= SLAM_HIT && t < SLAM_HIT + 0.034) {
      fill(out, F, '#000', 1);
      cam.blitScaled(out, t66White, 77, 137, ...size(t66White));
      cam.blitScaled(out, handWhite, 68, handY, HAND.w, HAND.h);
    } else if (!F.reduced && t >= SLAM_HIT + 0.034 && t < SLAM_HIT + 0.12) {
      fill(out, F, '#fff4dc', 0.5 * (1 - (t - SLAM_HIT - 0.034) / 0.086), 'lighter');
    }
    vignette(out, F, 0.9);
    // a luz falhando e apagando
    if (light < 1) fill(out, F, '#000', t >= SLAM_DARK ? 1 : 0.55);
    // apagando: o filamento ainda brilha um instante
    if (t >= SLAM_DARK - 0.06 && t < SLAM_DARK) fill(out, F, '#000', (t - (SLAM_DARK - 0.06)) / 0.06);
  };

  return { draw };
}
