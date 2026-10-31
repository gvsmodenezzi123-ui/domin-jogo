// Versão 2.0: a textura de osso gasto das pedras (DominoTile.jsx), pintada por código.
// Uma camada transparente de BONE_TEX×BONE_TEX pixels por cima do degradê do osso: veio
// amarelado, poros, fio de rachadura, mancha de dedo e o brilho das lasquinhas.
import { paintKit } from './botecoScene.js';

const { buffer, rngOf, hex } = paintKit;

/** Lado da textura em pixels (1 px de CSS cada: mais fina que a mesa, como o osso de verdade). */
export const BONE_TEX = 48;

export function paintBoneGrain(seed = 5) {
  const S = BONE_TEX;
  const b = buffer(S, S);
  const r = rngOf(seed);
  const vein = hex('#7a5a26');
  const pore = hex('#4a3214');
  const crack = hex('#3a240c');
  const chip = hex('#fffbea');
  // veio do osso: linhas finas e onduladas, quase na horizontal, que dão a volta (a textura repete)
  for (let k = 0; k < 9; k += 1) {
    const y0 = r() * S;
    const amp = 0.6 + r() * 1.6;
    const freq = (Math.PI * 2 * (1 + Math.floor(r() * 2))) / S;
    const phase = r() * Math.PI * 2;
    const alpha = 0.06 + r() * 0.08;
    for (let x = 0; x < S; x += 1) {
      if (r() < 0.18) continue; // o veio falha aqui e ali
      const y = (y0 + Math.sin(x * freq + phase) * amp + S) % S;
      b.put(x, y, vein, alpha);
    }
  }
  // poros: pontinhos escuros, alguns em duplas
  for (let i = 0; i < 46; i += 1) {
    const x = Math.floor(r() * S);
    const y = Math.floor(r() * S);
    b.put(x, y, pore, 0.16 + r() * 0.2);
    if (r() < 0.3) b.put((x + 1) % S, y, pore, 0.1);
  }
  // fios de rachadura: curtos, em zigue-zague, com a borda clara de um lado
  for (let i = 0; i < 3; i += 1) {
    let x = r() * S;
    let y = r() * S;
    const len = 5 + Math.floor(r() * 7);
    const dir = r() < 0.5 ? 1 : -1;
    for (let j = 0; j < len; j += 1) {
      b.put(x % S, y % S, crack, 0.3);
      b.put((x + 1) % S, (y + S - 1) % S, chip, 0.18);
      x += 1;
      y += r() < 0.45 ? dir : 0;
      y = (y + S) % S;
    }
  }
  // manchas de dedo e de bebida (amarelado de anos de mão)
  for (let i = 0; i < 4; i += 1) {
    const cx = r() * S;
    const cy = r() * S;
    const rad = 3 + r() * 5;
    for (let y = -rad; y <= rad; y += 1) {
      for (let x = -rad; x <= rad; x += 1) {
        const d = Math.hypot(x, y) / rad;
        if (d < 1) b.put((cx + x + S) % S, (cy + y + S) % S, vein, 0.05 * (1 - d) + 0.01);
      }
    }
  }
  // lasquinhas claras (o brilho onde o osso foi polido pelo uso)
  for (let i = 0; i < 14; i += 1) b.put(Math.floor(r() * S), Math.floor(r() * S), chip, 0.35 + r() * 0.3);
  return b;
}

/** Pinta a textura uma vez e deixa em `--bone-grain` no :root (o DominoTile usa como camada). */
export function installBoneGrain() {
  if (typeof document === 'undefined' || typeof ImageData === 'undefined') return;
  try {
    const painted = paintBoneGrain();
    const canvas = document.createElement('canvas');
    canvas.width = painted.w;
    canvas.height = painted.h;
    canvas.getContext('2d').putImageData(new ImageData(painted.data, painted.w, painted.h), 0, 0);
    document.documentElement.style.setProperty('--bone-grain', `url(${canvas.toDataURL('image/png')})`);
  } catch {
    // sem canvas (navegador muito velho): a pedra fica só com o degradê de sempre
  }
}
