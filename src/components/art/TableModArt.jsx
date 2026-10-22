// Ícones das Regras de Mesa (Patch 0.9.4), 16x16: o selo na polaroid do mapa, o banner do
// rodapé e o selo no canto do feltro. Cada um diz a regra num olhar:
//   drop   Mesa Úmida (a gota de cerveja e a poça)      smoke  Fumaça Densa (nuvem e o cigarro)
//   knife  Aposta Alta (a faca cravada na mesa)          level  Mesa Desnivelada (tábua torta e o nível)
//   radio  Rádio Ligado no Máximo (as notas e o som)
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects } from './pixelCanvas.js';

const PAL = {
  k: '#0b0705',
  y: '#e8a534', // cerveja
  Y: '#ffd27a',
  O: '#b8741e',
  w: '#fff3d6', // espuma, papel do cigarro
  G: '#d8dde2', // fumaça clara, aço claro
  g: '#9aa3ab',
  d: '#5c3a22', // madeira escura
  h: '#6b3a1e', // cabo
  H: '#9a5a2c',
  r: '#c3352b', // sangue, brasa
  R: '#ff7a5c',
  V: '#7ad36a', // bolha do nível
  v: '#3f8a3a',
};

const DRAW = {
  drop: [
    '.......kk.......',
    '......kYYk......',
    '......kYYk......',
    '.....kYYyyk.....',
    '.....kYyyyk.....',
    '....kYyyyyyk....',
    '....kwyyyyyk....',
    '...kwwyyyyyyk...',
    '...kwyyyyyyyk...',
    '...kyyyyyyyyk...',
    '...kyyyyyyyOk...',
    '....kyyyyyOk....',
    '.....kkOOkk.....',
    '.......kk.......',
    '..kkkkkkkkkkkk..',
    '.kyyyYYyyyyyOOk.',
  ],
  smoke: [
    '................',
    '......kkk.......',
    '.....kGGGk......',
    '...kkGGGGGkkk...',
    '..kGGGGwwGGGGk..',
    '.kGGGwwwGGGGGGk.',
    '.kGGGGGGGGGGGgk.',
    'kGGGGGGGGGGGGggk',
    'kgGGGGGGGGGGgggk',
    '.kgggGGGGGggggk.',
    '..kkgggggggkkk..',
    '....kkkkkkk.....',
    '................',
    '..kkkkkkkkkkkk..',
    '..kwwwwwwwwkRk..',
    '..kkkkkkkkkkkk..',
  ],
  knife: [
    '......kkkk......',
    '.....khHHhk.....',
    '.....khHHhk.....',
    '.....khHHhk.....',
    '.....khHHhk.....',
    '....kkkkkkkk....',
    '....kgggggGk....',
    '....kkkGGkkk....',
    '......kGgk......',
    '......kGgk......',
    '......kGgk......',
    '......kGrk......',
    '......kGrk......',
    '.......krk......',
    '..kkkkkkkkkkkk..',
    '.kddddddrdddddk.',
  ],
  level: [
    'kk..............',
    'kHkk............',
    'kHHHkk..........',
    '.kkHHHkk........',
    '...kkHHHkk......',
    '.....kkHHHkk....',
    '.......kkHHHkk..',
    '.........kkHHHk.',
    '...........kkkk.',
    '............kk..',
    '...........krk..',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kYYYYkvvVVkYYk.',
    '.kYYYYkvVVVkYYk.',
    '.kkkkkkkkkkkkkk.',
  ],
  radio: [
    '.......kkkkkkk..',
    '.......kYYYYYk..',
    '.......kYkkkYk..',
    '.......kYk.kYk..',
    '.......kYk.kYk..',
    '.......kYk.kYk..',
    '....kkkkYkkkYk..',
    '...kYYYYkYYYYk..',
    '...kYYYYkYYYk...',
    '....kkkk.kkk....',
    '................',
    '..k...k...k...k.',
    '.kRk.kRk.kRk.kRk',
    '.k.k.k.k.k.k.k.k',
    'k...k...k...k...',
    '................',
  ],
};

const RECTS = Object.fromEntries(Object.entries(DRAW).map(([id, rows]) => [id, mapToRects(rows, PAL, `tm-${id}-`)]));

/** Ícone de uma regra de mesa pelo `icon` dela (data/tableModifiers.js). */
export function TableModIcon({ icon, className = 'h-4 w-4' }) {
  return (
    <PixelSvg viewBox="0 0 16 16" className={className}>
      {RECTS[icon] ?? RECTS.drop}
    </PixelSvg>
  );
}

// --- Nó de evento "[?]" no mapa: placa de madeira pregada com a interrogação em néon âmbar
const EVENT_PAL = { k: '#0b0705', b: '#5c3a22', B: '#8a5a32', n: '#2a1a0e', Y: '#ffd27a', y: '#e8a534', s: '#c9cfd4' };
const EVENT_ROWS = [
  '................',
  '.kkkkkkkkkkkkkk.',
  'kBBBBBBBBBBBBBBk',
  'kBsBBBBBBBBBBsBk',
  'kBBBnnnnnnnnBBBk',
  'kBBnkYYYYYkknBBk',
  'kBBnYYkkkYYknBBk',
  'kBBnkkknYYkknBBk',
  'kBBnnnkYYknnnBBk',
  'kBBnnnkYYknnnBBk',
  'kBBnnnnkknnnnBBk',
  'kBBnnnkYYknnnBBk',
  'kBBBnnnkknnnBBBk',
  'kBsBBBBBBBBBBsBk',
  'kbbbbbbbbbbbbbbk',
  '.kkkkkkkkkkkkkk.',
];
const EVENT_RECTS = mapToRects(EVENT_ROWS, EVENT_PAL, 'ev-');

export function EventPlaqueIcon({ className = 'h-10 w-10' }) {
  return (
    <PixelSvg viewBox="0 0 16 16" className={className}>
      {EVENT_RECTS}
    </PixelSvg>
  );
}
