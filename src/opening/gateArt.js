/**
 * Versão 2.12: o desenho do toque de entrada: o gargalo de uma long neck suada, de pertinho,
 * com a tampinha (pintada à parte: ela estoura no toque).
 */
import { paintKit } from '../components/art/botecoScene.js';

const { hex, buffer, bayer } = paintKit;

export const GATE_BOTTLE = Object.freeze({ w: 36, h: 84 });

export function paintGateBottle() {
  const { w, h } = GATE_BOTTLE;
  const b = buffer(w, h);
  const cx = w / 2;
  // o perfil: gargalo fino em cima, o ombro abrindo e o corpo até embaixo
  const halfAt = (y) => (y < 30 ? 5 : y < 46 ? 5 + ((y - 30) / 16) ** 1.6 * 10 : 15);
  for (let y = 4; y < h; y += 1) {
    const half = halfAt(y);
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x += 1) {
      const u = (x - (cx - half)) / (half * 2);
      // o vidro âmbar com a luz batendo da esquerda
      const light = u < 0.2 ? 1.5 : u < 0.32 ? 1.15 : u > 0.82 ? 0.55 : 0.85;
      const base = hex('#6a320e');
      const q = Math.round(light * 4 + bayer(x, y) - 0.5) / 4;
      b.put(x, y, base.map((v) => Math.min(255, v * q)));
    }
  }
  // o anel do gargalo, o rótulo do ombro e as gotas de suor
  b.rect(Math.round(cx - 6), 6, 12, 3, hex('#8a4a1a'));
  b.rect(Math.round(cx - 6), 6, 12, 1, hex('#c87a3a'));
  b.rect(Math.round(cx - 15), 58, 30, 18, hex('#e6c34a'));
  b.rect(Math.round(cx - 15), 58, 30, 1, hex('#fff0a0'));
  b.rect(Math.round(cx - 11), 64, 22, 6, hex('#b8322a'));
  b.rect(Math.round(cx - 9), 66, 18, 2, hex('#f4ecd2'));
  const drops = [
    [12, 20],
    [21, 34],
    [9, 48],
    [24, 52],
    [14, 80],
    [26, 79],
    [11, 38],
  ];
  for (const [x, y] of drops) {
    b.put(x, y, hex('#ffd8a0'));
    b.put(x, y + 1, hex('#c8783a'));
  }
  b.rect(Math.round(cx - 3), 10, 2, 18, hex('#ffcf8a'), 0.7);
  return { w, h, data: b.data };
}

export function paintGateCap() {
  const b = buffer(14, 6);
  b.rect(0, 1, 14, 4, hex('#c9a24a'));
  b.rect(0, 1, 14, 1, hex('#ffe08a'));
  for (let x = 0; x < 14; x += 2) b.put(x, 5, hex('#8a6a20'));
  b.rect(2, 0, 10, 1, hex('#e8c060'));
  b.rect(4, 2, 6, 2, hex('#b8322a'));
  return { w: 14, h: 6, data: b.data };
}
