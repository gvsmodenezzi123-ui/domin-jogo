// src/components/art/CaseArt.jsx
// Patch 0.8.0: as 5 maletas do Balcão (48x48), fechadas (de frente, com o emblema) e
// abertas (tampa de pé com o forro de veludo e a bandeja de pedras), mais a corrente e
// o cadeado das trancadas (camadas separadas, para caírem na animação).
//   Clássica     madeira marfim, fechos dourados, forro vinho e pedras de osso
//   Bicheiro     couro de crocodilo verde, plaqueta de "$" e um maço de notas no forro
//   Borracharia  borracha preta com sulco de pneu, emblema de pneu e duas pedras de chumbo
//   Trapaceiro   veludo roxo com friso dourado, um ás de espadas e cartas no fundo falso
//   Seca         couro cru rachado de sol, emblema de sol e forro de juta desbotado
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

/** Pedrinha de dominó 5x7 deitada no forro, com os pips de `a` e `b` (0–3, para caber). */
function miniTile(c, x, y, a, b, body = 't', light = 'T') {
  c.rect(x, y, 5, 7, body);
  c.rect(x, y, 5, 1, light);
  c.rect(x + 1, y + 3, 3, 1, 'd');
  const pips = { 1: [[2, 1]], 2: [[1, 0], [3, 2]], 3: [[1, 0], [2, 1], [3, 2]] };
  for (const [px, py] of pips[a] ?? []) c.set(x + px, y + py, 'p');
  for (const [px, py] of pips[b] ?? []) c.set(x + px, y + 4 + py, 'p');
}

const FACES = [
  [3, 1], [2, 2], [1, 3], [3, 3], [0, 2], [2, 1],
  [1, 1], [3, 2], [0, 3], [2, 3], [1, 0], [3, 0],
];

/** Emblema na frente da maleta fechada (centro, abaixo do fecho). */
const EMBLEMS = {
  classica: (c) => {
    // plaqueta de dominó deitada [2|3]
    c.rect(16, 28, 16, 8, 'h');
    c.rect(17, 29, 14, 6, 't').rect(17, 29, 14, 1, 'T').rect(24, 29, 1, 6, 'd');
    c.set(19, 30, 'p').set(22, 33, 'p');
    c.set(26, 30, 'p').set(27, 31, 'p').set(28, 32, 'p').set(29, 33, 'p');
  },
  bicheiro: (c) => {
    c.rect(18, 27, 12, 10, 'g').rect(18, 27, 12, 1, 'G');
    // o "$"
    c.rect(22, 29, 5, 1, 'h').rect(22, 30, 1, 2, 'h').rect(22, 31, 5, 1, 'h').rect(26, 32, 1, 2, 'h').rect(22, 33, 5, 1, 'h');
    c.rect(24, 28, 1, 7, 'h');
  },
  borracharia: (c) => {
    c.disc(24, 32, 6.5, 'e');
    c.disc(24, 32, 3.5, 'E');
    c.disc(24, 32, 1.5, 'h');
    for (const [x, y] of [[24, 25], [24, 38], [17, 32], [30, 32]]) c.set(x, y, 'e');
  },
  trapaceiro: (c) => {
    c.rect(19, 26, 10, 13, 'e').rect(19, 26, 10, 1, 'E');
    // espada
    c.set(24, 28, 'f').rect(23, 29, 3, 1, 'f').rect(22, 30, 5, 1, 'f').rect(21, 31, 7, 2, 'f').rect(23, 33, 3, 2, 'f').rect(22, 35, 5, 1, 'f');
    c.set(20, 27, 'f').set(27, 37, 'f');
  },
  seca: (c) => {
    c.disc(24, 32, 4, 'e');
    for (const [dx, dy] of [[0, -7], [0, 7], [-7, 0], [7, 0], [-5, -5], [5, -5], [-5, 5], [5, 5]]) c.set(24 + dx, 32 + dy, 'E');
    c.line(10, 28, 14, 33, 'h').line(36, 25, 39, 31, 'h');
  },
};

/** O que vai no forro da tampa aberta, além das pedras na bandeja. */
const LID_EXTRAS = {
  classica: () => {},
  bicheiro: (c) => {
    // maço de notas preso no forro
    c.rect(15, 8, 18, 9, 'e').rect(15, 8, 18, 1, 'E');
    c.rect(22, 8, 4, 9, 'g');
    c.disc(19, 12, 1.5, 'E').disc(29, 12, 1.5, 'E');
  },
  borracharia: (c) => {
    // duas pedras de chumbo de pé na tampa
    miniTile(c, 16, 9, 3, 3, 'e', 'E');
    miniTile(c, 27, 9, 2, 3, 'e', 'E');
  },
  trapaceiro: (c) => {
    // cartas no fundo falso
    c.rect(13, 8, 7, 10, 'e').rect(20, 7, 7, 10, 'e').rect(27, 8, 7, 10, 'e');
    c.rect(13, 8, 7, 1, 'E').rect(20, 7, 7, 1, 'E').rect(27, 8, 7, 1, 'E');
    c.set(16, 12, 'f').set(23, 11, 'f').set(30, 12, 'f');
  },
  seca: (c) => {
    // rachaduras no forro de juta
    c.line(10, 8, 16, 15, 'h').line(30, 7, 36, 16, 'h').line(22, 9, 25, 13, 'h');
  },
};

/** Estojo aberto: tampa de pé atrás com o forro e a bandeja com 12 pedras na frente. */
function drawOpen(id) {
  const c = pixelCanvas(48, 48);
  c.rect(4, 3, 40, 19, 'c');
  c.rect(4, 3, 40, 2, 'C');
  c.rect(7, 6, 34, 14, 'v');
  c.rect(7, 6, 34, 2, 'V');
  LID_EXTRAS[id](c);
  c.rect(4, 21, 40, 2, 'h');
  c.rect(2, 23, 44, 21, 'c');
  c.rect(2, 41, 44, 3, 'C');
  c.rect(5, 25, 38, 15, 'v');
  FACES.forEach(([a, b], i) => miniTile(c, 7 + (i % 6) * 6, 25 + Math.floor(i / 6) * 8, a, b));
  c.rect(12, 42, 5, 3, 'g').rect(31, 42, 5, 3, 'g');
  c.set(13, 42, 'G').set(32, 42, 'G');
  for (const [x, y] of [[2, 23], [42, 23], [2, 40], [42, 40], [4, 3], [40, 3]]) c.rect(x, y, 4, 4, 'm');
  for (const [x, y] of [[2, 23], [42, 23], [4, 3], [40, 3]]) c.set(x + 1, y + 1, 'M');
  c.outline('k');
  return c.rows();
}

/** Estojo fechado de frente: alça, cantoneiras, costura, o fecho central e o emblema. */
function drawClosed(id) {
  const c = pixelCanvas(48, 48);
  c.rect(17, 6, 14, 3, 'c').rect(17, 6, 3, 8, 'c').rect(28, 6, 3, 8, 'c');
  c.rect(18, 7, 12, 1, 'C');
  c.rect(3, 12, 42, 31, 'c');
  c.rect(3, 12, 42, 2, 'C');
  c.rect(3, 22, 42, 1, 'h');
  for (let x = 6; x < 43; x += 3) c.set(x, 40, 'C');
  if (id === 'borracharia') for (let y = 15; y < 40; y += 4) c.line(5, y, 9, y + 2, 'h').line(43, y, 39, y + 2, 'h');
  if (id === 'bicheiro') for (let y = 25; y < 40; y += 3) for (let x = 6 + (y % 2) * 2; x < 43; x += 5) c.set(x, y, 'C');
  for (const [x, y] of [[3, 12], [40, 12], [3, 38], [40, 38]]) c.rect(x, y, 5, 5, 'm');
  for (const [x, y] of [[3, 12], [40, 12], [3, 38], [40, 38]]) c.set(x + 1, y + 1, 'M');
  c.rect(21, 20, 6, 5, 'g').set(22, 21, 'G');
  EMBLEMS[id](c);
  c.outline('k');
  return c.rows();
}

const BONE = { t: '#efe4c4', T: '#fffaf0', d: '#9c7f4a', p: '#1a1006' };

const PALETTES = {
  classica: {
    ...BONE,
    k: '#0b0705', c: '#e9dcc0', C: '#fff6e2', h: '#7a5a30', v: '#8f1622', V: '#b22a35',
    g: '#e8b84a', G: '#fff0b0', m: '#cdb88f', M: '#fff6e2',
  },
  bicheiro: {
    ...BONE,
    k: '#06100a', c: '#2f5a3a', C: '#4f8a5a', h: '#14301c', v: '#1d3d26', V: '#2d5a38',
    g: '#e8b84a', G: '#fff0b0', m: '#c9a050', M: '#fff0b0', e: '#9fd08a', E: '#e8ffd8',
  },
  borracharia: {
    ...BONE,
    k: '#000000', c: '#262626', C: '#3e3e3e', h: '#0d0d0d', v: '#33373b', V: '#4a5056',
    g: '#a7adb3', G: '#e1e5e8', m: '#6f767c', M: '#c9cfd4', e: '#5d6973', E: '#8d949a',
  },
  trapaceiro: {
    ...BONE,
    k: '#0a0410', c: '#3a1f4a', C: '#5a3270', h: '#1a0c24', v: '#5c1a3a', V: '#7a2a52',
    g: '#e8b84a', G: '#fff0b0', m: '#c9a050', M: '#fff0b0', e: '#f4ecd2', E: '#ffffff', f: '#1a1a24',
  },
  seca: {
    ...BONE,
    k: '#1a0f06', c: '#b08a5a', C: '#d0aa76', h: '#6a4a2a', v: '#8a7a5a', V: '#a8977a',
    g: '#8d949a', G: '#c9cfd4', m: '#7a5a3a', M: '#a07a50', e: '#f2b84b', E: '#ffd98a',
  },
};

const SPRITES = Object.fromEntries(
  Object.keys(PALETTES).map((id) => [
    id,
    { open: mapToRects(drawOpen(id), PALETTES[id], `${id}o`), closed: mapToRects(drawClosed(id), PALETTES[id], `${id}c`) },
  ]),
);

/** Duas correntes cruzadas por cima da maleta. */
function drawChains() {
  const c = pixelCanvas(48, 48);
  const link = (x, y, flip) => {
    if (flip) c.rect(x, y, 2, 3, 'l').set(x, y, 'L');
    else c.rect(x, y, 3, 2, 'l').set(x + 2, y + 1, 'L');
  };
  for (let i = 0; i < 16; i += 1) {
    link(1 + i * 3, 10 + Math.round(i * 2.25), i % 2 === 0);
    link(44 - i * 3, 10 + Math.round(i * 2.25), i % 2 === 1);
  }
  c.outline('k');
  return c.rows();
}

/** Cadeado de ferro no meio; aberto, a argola sobe e gira para o lado. */
function drawPadlock(open) {
  const c = pixelCanvas(48, 48);
  const lift = open ? 5 : 0;
  c.rect(19, 15 - lift, 2, 9, 'b');
  c.rect(19, 14 - lift, 10, 2, 'b');
  if (!open) c.rect(27, 15, 2, 9, 'b');
  else c.rect(27, 9, 2, 3, 'b');
  c.set(20, 15 - lift, 'B');
  c.rect(16, 23, 16, 13, 'i');
  c.rect(16, 23, 16, 2, 'I');
  c.rect(16, 33, 16, 3, 'j');
  c.rect(23, 27, 2, 2, 'k').set(23, 29, 'k').set(24, 29, 'k').set(24, 30, 'k');
  c.outline('k');
  return c.rows();
}

const CHAINS = mapToRects(drawChains(), { k: '#000000', l: '#9aa1a8', L: '#4b5157' }, 'ch');
const LOCK_PAL = { k: '#000000', b: '#8d949a', B: '#d5dade', i: '#565d63', I: '#9aa1a8', j: '#2f3439' };
const LOCK = mapToRects(drawPadlock(false), LOCK_PAL, 'lk');
const LOCK_OPEN = mapToRects(drawPadlock(true), LOCK_PAL, 'lo');

const box = '0 0 48 48';

/** Uma das 5 maletas (data/maletas.js), aberta (forro de veludo) ou fechada (emblema). */
export function MaletaSprite({ id = 'classica', open = false, className = 'w-12 h-12' }) {
  const sprite = SPRITES[id] ?? SPRITES.classica;
  return (
    <PixelSvg viewBox={box} className={className}>
      {open ? sprite.open : sprite.closed}
    </PixelSvg>
  );
}

/** As correntes cruzadas das maletas trancadas. */
export function CorrentesSprite({ className = 'w-12 h-12' }) {
  return (
    <PixelSvg viewBox={box} className={className}>
      {CHAINS}
    </PixelSvg>
  );
}

/** O cadeado (fechado ou com a argola aberta). */
export function CadeadoSprite({ className = 'w-12 h-12', open = false }) {
  return (
    <PixelSvg viewBox={box} className={className}>
      {open ? LOCK_OPEN : LOCK}
    </PixelSvg>
  );
}
