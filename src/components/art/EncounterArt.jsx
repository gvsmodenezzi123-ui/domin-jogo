// Arte dos eventos de dilema do mapa (Patch 0.9.4), 16x16: a sirene do camburão (Batida
// Policial), o engradado com o estojo de dominó (Engradado Esquecido) e a garrafa do Bêbado.
// A Aposta de Esquina usa a moeda do jogo; o Bêbado mostra a própria bucha de Rubi.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects } from './pixelCanvas.js';

const PAL = {
  k: '#0b0705',
  r: '#c3352b',
  R: '#ff7a5c',
  b: '#2a5bd7',
  B: '#7aa8ff',
  g: '#5c646b',
  G: '#aab1b8',
  w: '#fff3d6',
  d: '#5c3a22',
  D: '#8a5a32',
  y: '#e8a534',
  Y: '#ffd27a',
  v: '#2f6b3a',
  V: '#5fae5a',
};

const SIREN = [
  '................',
  '.......kk.......',
  '......kwwk......',
  '.R..kkkkkkkk..B.',
  '..R.krrRkbBbk.B.',
  'R...krRRkBBbk...',
  '.R..krrRkbBbk.B.',
  '....krrrkbbbk..B',
  '...kkkkkkkkkkk..',
  '...kGGGGGGGGGk..',
  '...kgggggggggk..',
  '..kkkkkkkkkkkkk.',
  '..kGGGGGGGGGGGk.',
  '..kgggggggggggk.',
  '..kkkkkkkkkkkkk.',
  '................',
];

const CRATE = [
  '................',
  '....kkkkkkkk....',
  '...kwwkwwkwwk...',
  '...kwkkwkkwwk...',
  '..kkkkkkkkkkkk..',
  '..kDDDDDDDDDDk..',
  '..kDkkkkkkkkDk..',
  '..kDkdddddddDk..',
  '..kDDDDDDDDDDk..',
  '..kDkkkkkkkkDk..',
  '..kDkdddddddDk..',
  '..kDDDDDDDDDDk..',
  '..kdddddddddddk.',
  '..kkkkkkkkkkkk..',
  '.....Y....Y.....',
  '....kYk..kyk....',
];

const BOTTLE = [
  '.......kk.......',
  '.......kwk......',
  '.......kkk......',
  '......kVVk......',
  '......kVvk......',
  '.....kVVvvk.....',
  '....kVVVvvvk....',
  '....kVwwwwvk....',
  '....kVwkkwvk....',
  '....kVwwwwvk....',
  '....kVVVvvvk....',
  '....kVVVvvvk....',
  '....kVVvvvvk....',
  '.....kkkkkk.....',
  '................',
  '................',
];

const RECTS = {
  police: mapToRects(SIREN, PAL, 'en-p-'),
  crate: mapToRects(CRATE, PAL, 'en-c-'),
  drunk: mapToRects(BOTTLE, PAL, 'en-d-'),
};

export function EncounterIcon({ art, className = 'h-16 w-16' }) {
  if (!RECTS[art]) return null;
  return (
    <PixelSvg viewBox="0 0 16 16" className={className}>
      {RECTS[art]}
    </PixelSvg>
  );
}
