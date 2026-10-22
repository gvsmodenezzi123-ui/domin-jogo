// src/components/art/SceneArt.jsx
// Patch 0.5.5: ícones do menu (livro de coleções, engrenagem de latão), o copo de dados
// de couro do REEMBARALHAR e o Valtinho do Bar (atendente da Loja Clandestina, 48x48).
// Desenhados com as primitivas de pixelCanvas.js e convertidos para <rect>s uma vez só.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

// --- Livro de Boteco (COLEÇÕES): couro com cantoneiras de latão e uma pedra [2|1] na capa
const BOOK_PAL = {
  k: '#0b0705',
  K: '#0b0705',
  L: '#7a4122', // couro
  h: '#a15a30', // luz no couro
  D: '#55290f', // sombra no couro
  S: '#4a2412', // lombada
  P: '#e9dcb4', // páginas
  p: '#b8a57a', // linhas das páginas
  B: '#d9a946', // latão
  b: '#8f6a22', // latão na sombra
  W: '#f1e6c4', // osso da pedra
  w: '#c9b47c', // sombra do osso
  x: '#1a1206', // pips
  R: '#a51d1d', // fita marcadora
};

function drawBook() {
  const c = pixelCanvas(40, 40);
  c.rect(33, 7, 3, 27, 'P');
  for (let y = 9; y < 33; y += 3) c.rect(33, y, 3, 1, 'p');
  c.rect(8, 5, 25, 30, 'L');
  c.shade('L', 'h', (x, y) => y <= 6 || x <= 13);
  c.shade('L', 'D', (x, y) => y >= 32 || x >= 30);
  c.rect(8, 5, 4, 30, 'S');
  c.rect(8, 9, 4, 2, 'B').rect(8, 29, 4, 2, 'B');
  // cantoneiras
  c.rect(29, 5, 4, 2, 'B').rect(31, 5, 2, 4, 'B').rect(29, 33, 4, 2, 'b').rect(31, 31, 2, 4, 'b');
  // a pedra [2|1] na capa
  c.rect(16, 10, 10, 19, 'W');
  c.rect(16, 27, 10, 2, 'w').rect(24, 10, 2, 19, 'w');
  c.rect(17, 19, 8, 1, 'x');
  c.rect(18, 12, 2, 2, 'x').rect(22, 15, 2, 2, 'x');
  c.rect(20, 22, 2, 2, 'x');
  // fita marcadora pendurada
  c.rect(26, 35, 3, 4, 'R').set(27, 38, '.');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Caderno de Fiado (ESTATÍSTICAS DA CONTA, Patch 0.9.1): caderno pardo com espiral,
// cantoneiras de lata, as linhas da conta e o lápis atravessado
const LEDGER_PAL = {
  k: '#0b0705',
  K: '#0b0705',
  P: '#d7b878', // papel pardo
  p: '#b8955a', // papel na sombra
  h: '#efd9a4', // papel no claro
  l: '#8a6a3a', // linhas da conta
  r: '#b0322a', // margem vermelha
  m: '#aab1b8', // cantoneira de lata
  M: '#e6eaee',
  s: '#6f767c', // espiral
  S: '#c9cfd4',
  y: '#e8b84a', // lápis
  Y: '#a8761c',
  e: '#f0a8a0', // borracha
  g: '#3a3a3a', // grafite
};

function drawLedger() {
  const c = pixelCanvas(40, 40);
  c.rect(7, 6, 26, 30, 'P');
  c.shade('P', 'h', (x, y) => y <= 8 || x <= 9);
  c.shade('P', 'p', (x, y) => y >= 33 || x >= 30);
  // margem vermelha e as linhas da conta, com pauzinhos de contagem
  c.rect(12, 9, 1, 25, 'r');
  for (let y = 12; y < 34; y += 4) c.rect(13, y, 18, 1, 'l');
  for (const [x, y] of [[15, 10], [17, 10], [19, 10], [21, 10]]) c.rect(x, y, 1, 2, 'l');
  c.line(14, 11, 22, 10, 'l');
  c.rect(15, 14, 5, 1, 'l').rect(22, 14, 3, 1, 'l').rect(15, 18, 7, 1, 'l').rect(15, 22, 4, 1, 'l').rect(21, 26, 6, 1, 'l');
  // espiral em cima
  for (let x = 10; x <= 30; x += 4) {
    c.rect(x, 4, 2, 4, 's');
    c.set(x, 4, 'S');
  }
  // cantoneiras de lata
  c.rect(7, 31, 5, 5, 'm').rect(28, 31, 5, 5, 'm').rect(28, 6, 5, 3, 'm');
  c.set(8, 32, 'M').set(29, 32, 'M').set(29, 7, 'M');
  // lápis atravessado
  c.line(18, 36, 35, 19, 'y', 2);
  c.line(19, 37, 36, 20, 'Y');
  c.rect(34, 17, 3, 3, 'e');
  c.set(17, 37, 'g').set(16, 38, 'g');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Engrenagem de latão (OPÇÕES)
const GEAR_PAL = {
  k: '#0b0705',
  K: '#0b0705',
  B: '#c9962f',
  L: '#f2cf6e',
  d: '#7a5517',
  r: '#5e4113',
  H: '#1c1408',
};

function drawGear() {
  const c = pixelCanvas(40, 40);
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    c.rect(Math.round(20 + 14.5 * Math.cos(a) - 3), Math.round(20 + 14.5 * Math.sin(a) - 3), 6, 6, 'B');
  }
  c.disc(20, 20, 13, 'B');
  c.shade('B', 'L', (x, y) => x - 20 + (y - 20) < -11);
  c.shade('B', 'd', (x, y) => x - 20 + (y - 20) > 12);
  c.disc(20, 20, 7, 'r');
  c.disc(20, 20, 5, 'H');
  c.disc(20, 20, 2, 'd');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Copo de dados de couro virado na mesa (REEMBARALHAR), com um dado na frente
const CUP_PAL = {
  k: '#0b0705',
  K: '#0b0705',
  L: '#7a3d1c',
  h: '#a65a2c',
  D: '#4d240f',
  R: '#3a1a0b',
  s: '#e9dcb4',
  W: '#f4ecd2',
  w: '#c9b47c',
  x: '#1a1206',
};

function drawCup() {
  const c = pixelCanvas(40, 40);
  for (let y = 6; y <= 32; y += 1) {
    const half = Math.round(5 + (y - 6) * 0.3) + (y === 6 ? -1 : 0);
    c.rect(20 - half, y, half * 2, 1, 'L');
    c.set(20 - half, y, 'h').set(21 - half, y, 'h');
    c.set(19 + half, y, 'D').set(18 + half, y, 'D');
  }
  c.rect(10, 10, 20, 2, 'R');
  for (let x = 11; x < 30; x += 3) c.set(x, 10, 's');
  c.rect(4, 29, 32, 4, 'R');
  for (let x = 6; x < 35; x += 3) c.set(x, 30, 's');
  // o dado na frente, um pouco virado
  c.rect(23, 30, 9, 8, 'W').rect(23, 37, 9, 1, 'w').rect(31, 30, 1, 8, 'w');
  c.rect(24, 31, 2, 2, 'x').rect(27, 33, 2, 2, 'x').rect(29, 35, 1, 1, 'x').rect(29, 35, 2, 2, 'x');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Valtinho do Bar (48x48): bigodão, palito no canto da boca, regata branca, avental manchado
const VALT_PAL = {
  k: '#0b0705',
  s: '#d9a477', // pele
  S: '#a8714a', // pele na sombra
  u: '#a08c7a', // barba por fazer
  n: '#c47a56', // nariz
  r: '#e08a6a', // bochecha
  h: '#1c1410', // cabelo, sobrancelha, bigode
  H: '#4a3a30', // brilho do cabelo
  e: '#f4ecd2', // branco do olho
  x: '#0b0705', // pupila
  m: '#4a1a12', // boca
  t: '#e3c58c', // palito
  w: '#ece6da', // regata
  g: '#b9b2a4', // regata na sombra
  a: '#d9cfb4', // avental
  A: '#b3a685', // avental na sombra
  b: '#8a6a3a', // mancha
};

function drawValtinho(blink) {
  const c = pixelCanvas(48, 48);
  // ombros e braços
  c.ellipse(24, 41, 17.5, 12, 's');
  c.shade('s', 'S', (x) => x >= 37);
  // regata
  c.rect(15, 30, 18, 18, 'w');
  c.rect(16, 27, 4, 4, 'w').rect(28, 27, 4, 4, 'w');
  c.shade('w', 'g', (x) => x >= 29);
  c.ellipse(24, 29, 5, 3, 's');
  c.set(23, 30, 'h').set(25, 31, 'h').set(24, 29, 'h');
  c.rect(14, 33, 1, 15, 'S').rect(33, 33, 1, 15, 'S');
  // avental com peitilho e alças
  c.rect(17, 34, 14, 4, 'a').rect(14, 38, 20, 10, 'a');
  c.line(18, 30, 18, 34, 'a').line(29, 30, 29, 34, 'a');
  c.rect(10, 38, 4, 1, 'A').rect(34, 38, 4, 1, 'A');
  c.shade('a', 'A', (x) => x >= 30);
  for (const [x, y] of [[19, 41], [20, 41], [20, 42], [27, 44], [28, 44], [28, 45], [17, 46], [24, 39]]) c.set(x, y, 'b');
  // pescoço
  c.rect(20, 22, 8, 6, 's').rect(20, 24, 8, 1, 'S');
  // cabeça e orelhas
  c.ellipse(14.5, 15.5, 2, 2.6, 's').ellipse(33.5, 15.5, 2, 2.6, 's');
  c.set(14, 15, 'S').set(34, 15, 'S');
  c.ellipse(24, 14, 9.5, 10.5, 's');
  // cabelo penteado para trás e costeletas
  c.ellipse(24, 7, 10, 5.2, 'h');
  c.ellipse(24, 12.6, 8.2, 3.2, 's');
  c.rect(14, 9, 2, 7, 'h').rect(32, 9, 2, 7, 'h');
  c.line(19, 3, 25, 3, 'H').line(26, 4, 28, 4, 'H');
  // sombra do lado direito do rosto
  c.shade('s', 'S', (x, y) => y < 26 && x >= 31);
  // sobrancelhas grossas, olhos e olheiras
  c.rect(18, 11, 5, 2, 'h').rect(26, 11, 5, 2, 'h').set(18, 10, 'h').set(30, 10, 'h');
  if (blink) {
    c.rect(19, 15, 3, 1, 'S').rect(27, 15, 3, 1, 'S');
  } else {
    c.rect(19, 14, 3, 2, 'e').rect(27, 14, 3, 2, 'e');
    c.rect(20, 14, 1, 2, 'x').rect(28, 14, 1, 2, 'x');
  }
  c.rect(19, 16, 3, 1, 'S').rect(27, 16, 3, 1, 'S');
  // nariz, bochechas
  c.rect(23, 15, 3, 4, 'n').rect(23, 19, 3, 1, 'S');
  c.rect(17, 18, 2, 1, 'r').rect(30, 18, 2, 1, 'r');
  // barba por fazer
  c.shade('s', 'u', (x, y) => y >= 21 && y <= 24 && x >= 17 && x <= 31);
  // bigodão caído
  c.rect(18, 19, 13, 3, 'h').rect(17, 21, 2, 2, 'h').rect(30, 21, 2, 2, 'h');
  c.rect(20, 19, 4, 1, 'H');
  // boca e o palito no canto
  c.rect(21, 22, 6, 1, 'm').rect(22, 23, 4, 1, 'n');
  c.line(27, 22, 34, 19, 't');
  c.outline('k');
  return c.rows();
}

const BOOK_RECTS = mapToRects(drawBook(), BOOK_PAL, 'bk');
const GEAR_RECTS = mapToRects(drawGear(), GEAR_PAL, 'gr');
const LEDGER_RECTS = mapToRects(drawLedger(), LEDGER_PAL, 'ld');
const CUP_RECTS = mapToRects(drawCup(), CUP_PAL, 'cp');
const VALT_RECTS = mapToRects(drawValtinho(false), VALT_PAL, 'vt');
const VALT_BLINK_RECTS = mapToRects(drawValtinho(true), VALT_PAL, 'vb');

export function BookIcon({ className = 'w-10 h-10' }) {
  return <PixelSvg className={className}>{BOOK_RECTS}</PixelSvg>;
}

export function GearIcon({ className = 'w-10 h-10' }) {
  return <PixelSvg className={className}>{GEAR_RECTS}</PixelSvg>;
}

/** Caderno de Fiado (Estatísticas da Conta, Patch 0.9.1). */
export function LedgerIcon({ className = 'w-10 h-10' }) {
  return <PixelSvg className={className}>{LEDGER_RECTS}</PixelSvg>;
}

export function DiceCupIcon({ className = 'w-10 h-10' }) {
  return <PixelSvg className={className}>{CUP_RECTS}</PixelSvg>;
}

/** Valtinho do Bar, 48x48. `blink`: olhos fechados (o piscar é trocado pela Loja). */
export function ValtinhoSprite({ className = 'w-12 h-12', blink = false }) {
  return (
    <PixelSvg viewBox="0 0 48 48" className={className}>
      {blink ? VALT_BLINK_RECTS : VALT_RECTS}
    </PixelSvg>
  );
}
