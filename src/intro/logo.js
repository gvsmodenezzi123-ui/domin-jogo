// Cena 5: no escuro, a lâmpada volta (a mesma da tela inicial) e o logo BUXARIA cai com tudo
// debaixo dela: poeira, faíscas, o brilho correndo pelas letras e a frase do jogo. No jogo, o
// quadro final casa com a tela inicial (lâmpada e logo no mesmo lugar) e a troca é invisível.
import { clamp, easeIn, easeOut, hash, makeCanvas, silhouette, smooth, span, wobble } from './core.js';
import { beam, fill, glow, glowEllipse, vignette } from './stage.js';

export const LOGO_LEN = 1.75;
const DROP = 0.22;
const HIT = 0.34;
export const LOGO_HIT = HIT;
export const TAGLINE = 'DOMINÓ DE BOTECO · UM CONTRA UM';

/** Onde ficam a lâmpada e o logo (px da tela). `target` vem da tela inicial, quando há. */
export function logoLayout(W, H, target = null) {
  if (target?.logo) return target;
  const lampSize = Math.min(W * 0.3, H * 0.17);
  const logoW = Math.min(W * 0.86, H * 0.5);
  return {
    lamp: { x: W / 2, y: H * 0.04, size: lampSize },
    logo: { x: W / 2, y: H * 0.37, w: logoW },
  };
}

export function buildLogo(sprites) {
  const logo = sprites.logo;
  const ratio = logo.height / logo.width;
  const white = silhouette(logo, '#ffffff');
  const sweep = makeCanvas(logo.width, logo.height);

  const draw = (F, target = null) => {
    const { out, t, W, H } = F;
    const L = logoLayout(W, H, target);
    const lampOn = t < 0.04 ? 0 : t < 0.09 ? 0.55 : t < 0.14 ? 0.1 : 1;
    const light = lampOn * (0.94 + wobble(t * 8, 2) * 0.05);
    const hitK = span(t, HIT, HIT + 0.45);
    const shake = F.reduced || t < HIT ? 0 : (1 - hitK) ** 2 * W * 0.012;
    const sx = Math.sin(t * 83) * shake;
    const sy = Math.cos(t * 71) * shake;

    fill(out, F, '#0b0907', 1);
    out.save();
    out.translate(sx, sy);
    // o facho e a luz da lâmpada sobre o logo
    const bulbY = L.lamp.y + L.lamp.size * 0.72;
    beam(out, L.lamp.x, bulbY, L.lamp.size * 0.18, L.lamp.x, H * 0.95, W * 0.62, 'rgba(255,214,150,0.5)', 0.32 * light);
    glowEllipse(out, L.logo.x, L.logo.y, L.logo.w * 0.62, L.logo.w * 0.36, 'rgba(255,180,100,0.5)', 0.42 * light);

    // o logo: cai de cima, maior e transparente, e assenta pesado
    const drop = easeIn(span(t, DROP, HIT));
    if (t >= DROP) {
      const scale = t < HIT ? 1.6 - 0.6 * drop : 1 + 0.035 * Math.sin(hitK * Math.PI) * (1 - hitK);
      const w = L.logo.w * scale;
      const h = w * ratio;
      out.save();
      out.globalAlpha = clamp(drop * 1.5);
      out.imageSmoothingEnabled = true;
      out.drawImage(logo, L.logo.x - w / 2, L.logo.y - h / 2, w, h);
      out.restore();
      // clarão de quando bate
      if (t >= HIT && t < HIT + 0.22) {
        out.save();
        out.globalCompositeOperation = 'lighter';
        out.globalAlpha = 0.7 * (1 - (t - HIT) / 0.22);
        out.drawImage(white, L.logo.x - w / 2, L.logo.y - h / 2, w, h);
        out.restore();
      }
      // o brilho correndo pelas letras
      const sk = span(t, HIT + 0.35, HIT + 1.05);
      if (sk > 0 && sk < 1) {
        const sg = sweep.getContext('2d');
        sg.setTransform(1, 0, 0, 1, 0, 0);
        sg.globalCompositeOperation = 'source-over';
        sg.clearRect(0, 0, sweep.width, sweep.height);
        sg.drawImage(white, 0, 0);
        sg.globalCompositeOperation = 'destination-in';
        const bx = -0.3 * sweep.width + sk * 1.6 * sweep.width;
        const grad = sg.createLinearGradient(bx - sweep.width * 0.08, 0, bx + sweep.width * 0.08, sweep.height * 0.3);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        sg.fillStyle = grad;
        sg.fillRect(0, 0, sweep.width, sweep.height);
        out.save();
        out.globalCompositeOperation = 'lighter';
        out.globalAlpha = 0.55;
        out.drawImage(sweep, L.logo.x - w / 2, L.logo.y - h / 2, w, h);
        out.restore();
      }
    }
    // poeira e faíscas da batida
    if (t >= HIT) {
      const k = span(t, HIT, HIT + 1.1);
      const h = L.logo.w * ratio;
      out.save();
      for (let i = 0; i < 26; i += 1) {
        const across = hash(i, 1) * 2 - 1;
        const x = L.logo.x + across * L.logo.w * 0.55 + Math.sign(across) * k * W * (0.04 + hash(i, 2) * 0.12);
        const y = L.logo.y + h * 0.4 - k * H * (0.015 + hash(i, 3) * 0.05);
        const a = (1 - k) ** 1.5 * 0.22;
        const r = W * (0.03 + hash(i, 4) * 0.05) * (0.6 + k * 1.4);
        const grad = out.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(190,170,140,${a})`);
        grad.addColorStop(1, 'rgba(190,170,140,0)');
        out.fillStyle = grad;
        out.fillRect(x - r, y - r, r * 2, r * 2);
      }
      out.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 28; i += 1) {
        const kk = span(t, HIT, HIT + 0.5 + hash(i, 5) * 0.5);
        if (kk >= 1) continue;
        const ang = -Math.PI / 2 + (hash(i, 6) - 0.5) * 2.6;
        const sp = W * (0.25 + hash(i, 7) * 0.45);
        const x = L.logo.x + (hash(i, 8) - 0.5) * L.logo.w * 0.9 + Math.cos(ang) * sp * kk;
        const y = L.logo.y + Math.sin(ang) * sp * kk + kk * kk * H * 0.25;
        out.strokeStyle = `rgba(255,${180 + Math.floor(hash(i, 9) * 60)},90,${1 - kk})`;
        out.lineWidth = W * 0.003;
        out.beginPath();
        out.moveTo(x, y);
        out.lineTo(x - Math.cos(ang) * W * 0.02, y - Math.sin(ang) * W * 0.02 - kk * W * 0.01);
        out.stroke();
      }
      out.restore();
    }
    // brasas subindo devagar, o tempo todo
    out.save();
    out.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i += 1) {
      const life = 2.2 + hash(i, 11) * 1.5;
      const age = (t + hash(i, 12) * life) % life;
      const k = age / life;
      const x = W * hash(i, 13) + Math.sin(age * 1.7 + i) * W * 0.02;
      const y = H * (1.02 - k * 0.8);
      const a = Math.sin(k * Math.PI) * 0.6 * clamp(t * 3);
      glow(out, x, y, W * 0.008, `rgba(255,160,70,${a})`, 1);
    }
    out.restore();
    // a lâmpada (o mesmo sprite da tela inicial, em pixel)
    out.save();
    out.imageSmoothingEnabled = false;
    const ls = L.lamp.size;
    out.fillStyle = '#120b06';
    out.fillRect(L.lamp.x - ls * 0.012, -10, Math.max(2, ls * 0.025), L.lamp.y + 12);
    out.drawImage(sprites.lamp, L.lamp.x - ls / 2, L.lamp.y, ls, ls);
    out.restore();
    glow(out, L.lamp.x, bulbY, ls * 0.75, 'rgba(255,236,190,0.95)', 0.9 * light);
    out.restore();
    // a frase do jogo
    const tag = smooth(span(t, 0.62, 0.95));
    if (tag > 0) {
      const size = Math.round(Math.min(W * 0.03, H * 0.018));
      out.save();
      out.globalAlpha = tag;
      out.font = `${size}px "Press Start 2P", monospace`;
      out.textAlign = 'center';
      out.textBaseline = 'middle';
      out.fillStyle = '#e2c288';
      out.shadowColor = 'rgba(0,0,0,0.8)';
      out.shadowBlur = size * 0.6;
      const y = L.logo.y + L.logo.w * ratio * 0.62 + size * 1.6;
      out.fillText(TAGLINE, L.logo.x, y + (1 - easeOut(tag)) * size);
      out.restore();
    }
    vignette(out, F, 0.75);
    // a lâmpada ainda apagada: só escuro
    if (lampOn === 0) fill(out, F, '#000', 0.9);
  };

  return { draw, layout: logoLayout };
}
