// src/components/art/MetaArt.jsx
// Patch 0.8.0: a Tampinha Dourada (moeda da meta-progressão), 16x16.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

function drawCap() {
  const c = pixelCanvas(16, 16);
  // coroa dentada
  for (let a = 0; a < 12; a += 1) {
    const x = Math.round(8 + Math.cos((a / 12) * Math.PI * 2) * 6.6);
    const y = Math.round(8 + Math.sin((a / 12) * Math.PI * 2) * 6.6);
    c.set(x - 1, y - 1, 'g');
  }
  c.disc(8, 8, 6, 'g');
  c.disc(8, 8, 4.2, 'G');
  c.disc(8, 8, 2.6, 'g');
  c.set(5, 5, 'W').set(6, 4, 'W');
  c.shade('g', 'o', (x, y) => x + y > 19);
  c.outline('k');
  return c.rows();
}

const CAP = mapToRects(drawCap(), { k: '#2a1806', g: '#e8b84a', G: '#fff0b0', o: '#a8761c', W: '#ffffff' }, 'cap');

/** Tampinha Dourada. */
export function BottleCapIcon({ className = 'w-4 h-4' }) {
  return (
    <PixelSvg viewBox="0 0 16 16" className={className}>
      {CAP}
    </PixelSvg>
  );
}
