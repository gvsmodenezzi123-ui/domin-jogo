// src/components/art/CaseArt.jsx
// Patch 0.6.3: as maletas de dominó da tela de NOVO JOGO (48x48).
//   Maleta Branca: estojo de madeira marfim com fechos dourados, forro vinho e as pedras
//                  de osso amarelado com pips pretos.
//   Maleta Preta:  couro preto fosco com cantoneiras de metal escovado, forro roxo e as
//                  pedras de ônix com pips brancos; fechada, com o fecho de corrente.
//   Corrente e cadeado ficam em camadas separadas (para caírem na animação).
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

const K = '#0b0705';

/** Pedrinha de dominó 5x7 deitada no forro, com os pips de `a` e `b` (0–3, para caber). */
function miniTile(c, x, y, a, b) {
  c.rect(x, y, 5, 7, 't');
  c.rect(x, y, 5, 1, 'T');
  c.rect(x + 1, y + 3, 3, 1, 'd');
  const pips = { 1: [[2, 1]], 2: [[1, 0], [3, 2]], 3: [[1, 0], [2, 1], [3, 2]] };
  for (const [px, py] of pips[a] ?? []) c.set(x + px, y + py, 'p');
  for (const [px, py] of pips[b] ?? []) c.set(x + px, y + 4 + py, 'p');
}

/** Estojo aberto: tampa de pé atrás com o forro e a bandeja com 12 pedras na frente. */
function drawOpenCase(metal) {
  const c = pixelCanvas(48, 48);
  // tampa aberta
  c.rect(4, 3, 40, 19, 'c');
  c.rect(4, 3, 40, 2, 'C');
  c.rect(7, 6, 34, 14, 'v');
  c.rect(7, 6, 34, 2, 'V');
  // dobradiça
  c.rect(4, 21, 40, 2, 'h');
  // bandeja
  c.rect(2, 23, 44, 21, 'c');
  c.rect(2, 41, 44, 3, 'C');
  c.rect(5, 25, 38, 15, 'v');
  const faces = [
    [3, 1], [2, 2], [1, 3], [3, 3], [0, 2], [2, 1],
    [1, 1], [3, 2], [0, 3], [2, 3], [1, 0], [3, 0],
  ];
  faces.forEach(([a, b], i) => miniTile(c, 7 + (i % 6) * 6, 25 + Math.floor(i / 6) * 8, a, b));
  // fechos na frente
  c.rect(12, 42, 5, 3, 'g').rect(31, 42, 5, 3, 'g');
  c.set(13, 42, 'G').set(32, 42, 'G');
  if (metal) {
    // cantoneiras de metal escovado
    for (const [x, y] of [[2, 23], [42, 23], [2, 40], [42, 40], [4, 3], [40, 3]]) c.rect(x, y, 4, 4, 'm');
    for (const [x, y] of [[2, 23], [42, 23], [4, 3], [40, 3]]) c.set(x + 1, y + 1, 'M');
  } else {
    // veios da madeira clara
    for (let y = 9; y < 20; y += 5) c.line(5, y, 6, y, 'w');
    c.line(3, 30, 3, 36, 'w').line(44, 28, 44, 34, 'w');
  }
  c.outline('k');
  return c.rows();
}

/** Estojo fechado de frente: alça em cima, cantoneiras, costura e o fecho central. */
function drawClosedCase() {
  const c = pixelCanvas(48, 48);
  // alça
  c.rect(17, 6, 14, 3, 'c').rect(17, 6, 3, 8, 'c').rect(28, 6, 3, 8, 'c');
  c.rect(18, 7, 12, 1, 'C');
  // corpo
  c.rect(3, 12, 42, 31, 'c');
  c.rect(3, 12, 42, 2, 'C');
  c.rect(3, 22, 42, 1, 'h');
  for (let x = 6; x < 43; x += 3) c.set(x, 40, 'C');
  // cantoneiras
  for (const [x, y] of [[3, 12], [40, 12], [3, 38], [40, 38]]) c.rect(x, y, 5, 5, 'm');
  for (const [x, y] of [[3, 12], [40, 12], [3, 38], [40, 38]]) c.set(x + 1, y + 1, 'M');
  // fecho central de metal
  c.rect(21, 20, 6, 5, 'm').set(22, 21, 'M');
  c.outline('k');
  return c.rows();
}

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
  // argola
  c.rect(19, 15 - lift, 2, 9, 'b');
  c.rect(19, 14 - lift, 10, 2, 'b');
  if (!open) c.rect(27, 15, 2, 9, 'b');
  else c.rect(27, 9, 2, 3, 'b');
  c.set(20, 15 - lift, 'B');
  // corpo
  c.rect(16, 23, 16, 13, 'i');
  c.rect(16, 23, 16, 2, 'I');
  c.rect(16, 33, 16, 3, 'j');
  // buraco da chave
  c.rect(23, 27, 2, 2, 'k').set(23, 29, 'k').set(24, 29, 'k').set(24, 30, 'k');
  c.outline('k');
  return c.rows();
}

const WHITE_PAL = {
  k: K,
  c: '#e9dcc0', // marfim
  C: '#fff6e2',
  w: '#cdb88f', // veio da madeira
  h: '#7a5a30',
  v: '#8f1622', // forro vinho
  V: '#b22a35',
  t: '#efe4c4', // osso
  T: '#fffaf0',
  d: '#9c7f4a',
  p: '#1a1006',
  g: '#e8b84a', // fecho dourado
  G: '#fff0b0',
};

const BLACK_PAL = {
  k: '#000000',
  c: '#1f1c20', // couro preto fosco
  C: '#34303a',
  h: '#000000',
  v: '#3a1a46', // forro roxo
  V: '#552a66',
  t: '#1c1917', // ônix
  T: '#4a4542',
  d: '#57534e',
  p: '#f5f5f4', // pip branco
  g: '#a7adb3', // fecho de metal
  G: '#e1e5e8',
  m: '#8d949a', // cantoneira escovada
  M: '#e1e5e8',
};

const CHAIN_PAL = { k: '#000000', l: '#9aa1a8', L: '#4b5157' };
const LOCK_PAL = { k: '#000000', b: '#8d949a', B: '#d5dade', i: '#565d63', I: '#9aa1a8', j: '#2f3439' };

const WHITE_OPEN = mapToRects(drawOpenCase(false), WHITE_PAL, 'wo');
const BLACK_OPEN = mapToRects(drawOpenCase(true), BLACK_PAL, 'bo');
const BLACK_CLOSED = mapToRects(drawClosedCase(), BLACK_PAL, 'bc');
const CHAINS = mapToRects(drawChains(), CHAIN_PAL, 'ch');
const LOCK = mapToRects(drawPadlock(false), LOCK_PAL, 'lk');
const LOCK_OPEN = mapToRects(drawPadlock(true), LOCK_PAL, 'lo');

const box = '0 0 48 48';

/** Maleta Branca aberta (Modo Clássico). */
export function MaletaBrancaSprite({ className = 'w-12 h-12' }) {
  return (
    <PixelSvg viewBox={box} className={className}>
      {WHITE_OPEN}
    </PixelSvg>
  );
}

/** Maleta Preta: aberta (pedras de ônix) ou fechada (couro e cantoneiras). */
export function MaletaPretaSprite({ className = 'w-12 h-12', open = false }) {
  return (
    <PixelSvg viewBox={box} className={className}>
      {open ? BLACK_OPEN : BLACK_CLOSED}
    </PixelSvg>
  );
}

/** As correntes cruzadas da Maleta Preta trancada. */
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
