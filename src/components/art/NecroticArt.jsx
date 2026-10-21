// src/components/art/NecroticArt.jsx
// Patch 0.6.1: os 5 talismãs Necróticos do Mercado Negro (40x40), o Corvo da Madrugada
// (contrabandista encapuzado, 48x48) e o Seu Tião das Moedas no engradado (48x48).
// Desenhados com pixelCanvas.js e convertidos em <rect>s uma vez só.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

const K = '#0b0705';

// --- Pacto do Coveiro: pá de coveiro com o lacre de cera do contrato
const PACTO_PAL = { k: K, K, w: '#8a5a32', W: '#b9824a', m: '#8f969c', M: '#dfe4e8', d: '#5b6268', r: '#a3121b', R: '#e0434c', x: '#4a060b' };
function drawPacto() {
  const c = pixelCanvas(40, 40);
  c.line(7, 5, 21, 19, 'w', 3);
  c.line(8, 5, 21, 18, 'W', 1);
  c.rect(5, 3, 6, 3, 'w');
  for (let y = 20; y <= 35; y += 1) {
    const half = Math.round(6 - Math.abs(y - 27) * 0.35);
    c.rect(28 - half, y, half * 2, 1, 'm');
  }
  c.line(22, 19, 25, 22, 'd', 2);
  c.shade('m', 'M', (x, y) => x < 26 && y < 30);
  c.shade('m', 'd', (x, y) => x > 31 || y > 33);
  c.disc(11, 30, 6.5, 'r');
  c.disc(11, 30, 4, 'x');
  c.line(9, 28, 13, 32, 'R').line(13, 28, 9, 32, 'R');
  c.set(7, 26, 'R').set(8, 26, 'R');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Osso Ensanguentado: osso atravessado pingando sangue
const OSSO_PAL = { k: K, K, w: '#efe4c4', W: '#fffaf0', s: '#b9a77a', r: '#b3121c', R: '#ff5a62' };
function drawOsso() {
  const c = pixelCanvas(40, 40);
  c.line(10, 10, 29, 29, 'w', 5);
  for (const [x, y] of [[6, 11], [11, 6], [29, 34], [34, 29]]) c.disc(x, y, 4.2, 'w');
  c.shade('w', 'W', (x, y) => y < x - 4 && x + y < 34);
  c.shade('w', 's', (x, y) => y > x + 3);
  c.rect(18, 22, 2, 9, 'r').rect(18, 31, 2, 2, 'R');
  c.rect(23, 27, 2, 6, 'r').rect(23, 33, 2, 2, 'R');
  c.rect(13, 17, 2, 5, 'r');
  c.set(17, 20, 'r').set(22, 25, 'r').set(16, 19, 'r');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Olho da Morte: caveira de osso com um olho em brasa vermelha
const OLHO_PAL = { k: K, K, w: '#efe4c4', W: '#fffaf0', s: '#b9a77a', x: '#120808', r: '#d1121c', R: '#ff8a7a' };
function drawOlho() {
  const c = pixelCanvas(40, 40);
  c.ellipse(20, 16, 13, 12.5, 'w');
  c.rect(12, 24, 16, 9, 'w');
  c.shade('w', 'W', (x, y) => x < 15 && y < 16);
  c.shade('w', 's', (x, y) => x > 28 || y > 31);
  c.disc(14, 16, 4.2, 'x');
  c.disc(26, 16, 4.2, 'x');
  c.disc(26, 16, 2.6, 'r');
  c.rect(25, 15, 2, 2, 'R');
  c.rect(19, 21, 3, 3, 'x');
  for (let x = 14; x <= 26; x += 3) c.rect(x, 28, 1, 5, 'x');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Tranca Cadavérica: cadeado de osso com a fechadura em caveirinha
const TRANCA_PAL = { k: K, K, m: '#7d848a', M: '#c9cfd4', w: '#e9dcb4', W: '#fff4d6', s: '#a8956a', x: '#120808', r: '#9e1a14' };
function drawTranca() {
  const c = pixelCanvas(40, 40);
  c.ellipse(20, 13, 9.5, 9.5, 'm');
  c.ellipse(20, 13, 5.5, 6, '.');
  c.rect(10, 13, 20, 4, '.');
  c.rect(10, 11, 4, 7, 'm').rect(26, 11, 4, 7, 'm');
  c.shade('m', 'M', (x) => x < 14);
  c.rect(7, 17, 26, 19, 'w');
  c.shade('w', 'W', (x, y) => y < 20 || x < 10);
  c.shade('w', 's', (x, y) => y > 32 || x > 30);
  // caveirinha da fechadura
  c.ellipse(20, 24, 4.5, 4, 'x');
  c.rect(18, 27, 5, 3, 'x');
  c.rect(18, 23, 2, 2, 'w').rect(21, 23, 2, 2, 'w');
  c.set(20, 26, 'w');
  c.line(9, 20, 13, 26, 'r');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Falsa Partida: coração remendado, meio vivo, meio cinza
const FALSA_PAL = { k: K, K, r: '#c8261d', R: '#ff8f7f', d: '#7f1712', g: '#5e5a5f', G: '#8e8a90', D: '#3a373c', w: '#efe4c4' };
function drawFalsa() {
  const c = pixelCanvas(40, 40);
  c.disc(13, 14, 8, 'r').disc(27, 14, 8, 'r');
  for (let y = 14; y <= 34; y += 1) {
    const half = Math.round(15 - (y - 14) * 0.74);
    if (half > 0) c.rect(20 - half, y, half * 2, 1, 'r');
  }
  c.shade('r', 'g', (x) => x >= 20);
  c.shade('r', 'R', (x, y) => x < 14 && y < 13);
  c.shade('r', 'd', (x, y) => y > 24 && x < 20);
  c.shade('g', 'G', (x, y) => y < 12);
  c.shade('g', 'D', (x, y) => y > 24);
  c.line(20, 8, 20, 31, 'k');
  for (let y = 10; y <= 28; y += 4) c.rect(18, y, 5, 1, 'w');
  c.outline('k').outline('K');
  return c.rows();
}

// --- Corvo da Madrugada (48x48): capuz, sobretudo de gola alta, olhos vermelhos no escuro
const CORVO_PAL = {
  k: K,
  h: '#2b2732', // capuz
  H: '#463f52', // luz no capuz
  x: '#050304', // rosto na sombra
  r: '#e0242e', // olho
  R: '#ffb0a8', // brilho do olho
  c: '#3a3442', // sobretudo
  C: '#24202b', // sobretudo na sombra
  b: '#b38a3a', // botões de latão
  f: '#141018', // pena
  F: '#4b5f8a', // reflexo azul da pena
};
function drawCorvo(blink) {
  const c = pixelCanvas(48, 48);
  c.ellipse(24, 44, 20, 15, 'c');
  c.shade('c', 'C', (x) => x > 29);
  c.line(24, 31, 24, 47, 'k');
  c.rect(23, 36, 3, 2, 'b').rect(23, 42, 3, 2, 'b');
  // gola levantada
  c.line(15, 27, 20, 36, 'h', 3).line(33, 27, 28, 36, 'h', 3);
  // capuz e o rosto apagado
  c.ellipse(24, 16, 13, 14.5, 'h');
  c.shade('h', 'H', (x, y) => x < 18 && y < 18);
  c.ellipse(24, 20, 7.5, 9, 'x');
  if (!blink) {
    c.rect(20, 19, 2, 2, 'r').rect(27, 19, 2, 2, 'r');
    c.set(20, 19, 'R').set(27, 19, 'R');
  }
  // pena de corvo presa no capuz
  c.line(9, 6, 12, 18, 'f', 2).line(10, 7, 12, 14, 'F');
  c.outline('k');
  return c.rows();
}

// --- Seu Tião das Moedas (48x48): boina, barba branca, sentado no engradado com uma moeda na mão
const TIAO_PAL = {
  k: K,
  s: '#c98f62', // pele
  S: '#9c6a44',
  w: '#efeae0', // barba e sobrancelha brancas
  c: '#6b6458', // boina
  C: '#4a453d',
  p: '#4f6f8f', // camisa
  P: '#3a536c',
  n: '#5a4030', // calça
  R: '#b3201c', // engradado
  r: '#7a140f',
  y: '#e8b84a', // moeda / tampinhas
  Y: '#fff0b0',
  e: '#1a1206',
};
function drawTiao() {
  const c = pixelCanvas(48, 48);
  // engradado de cerveja
  c.rect(8, 34, 32, 14, 'R');
  for (let y = 37; y < 47; y += 4) c.rect(10, y, 28, 2, 'r');
  for (let x = 11; x < 38; x += 5) c.rect(x, 33, 3, 1, 'y');
  // pernas e tronco
  c.rect(13, 30, 9, 5, 'n').rect(26, 30, 9, 5, 'n');
  c.rect(15, 20, 18, 12, 'p');
  c.shade('p', 'P', (x) => x > 28);
  // braço estendido com a moeda
  c.line(31, 23, 37, 27, 'p', 3);
  c.disc(39, 27, 2.6, 's');
  c.disc(41, 24, 2.8, 'y');
  c.set(40, 23, 'Y');
  c.line(16, 22, 14, 30, 'p', 3);
  // cabeça, barba branca e boina
  c.ellipse(24, 12, 7, 8, 's');
  c.shade('s', 'S', (x) => x > 28);
  c.ellipse(24, 17, 6.5, 4, 'w');
  c.rect(22, 16, 4, 1, 'e');
  c.rect(23, 12, 2, 3, 'S');
  c.rect(19, 10, 3, 1, 'w').rect(26, 10, 3, 1, 'w');
  c.rect(20, 11, 2, 1, 'e').rect(26, 11, 2, 1, 'e');
  c.ellipse(24, 5.5, 8, 3.4, 'c');
  c.rect(16, 7, 17, 2, 'C');
  c.outline('k');
  return c.rows();
}

const rects = (rows, pal, key) => mapToRects(rows, pal, key);
const PACTO = rects(drawPacto(), PACTO_PAL, 'pc');
const OSSO = rects(drawOsso(), OSSO_PAL, 'os');
const OLHO = rects(drawOlho(), OLHO_PAL, 'ol');
const TRANCA = rects(drawTranca(), TRANCA_PAL, 'tr');
const FALSA = rects(drawFalsa(), FALSA_PAL, 'fp');
const CORVO = rects(drawCorvo(false), CORVO_PAL, 'cv');
const CORVO_BLINK = rects(drawCorvo(true), CORVO_PAL, 'cb');
const TIAO = rects(drawTiao(), TIAO_PAL, 'ti');

export function PactoCoveiroIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{PACTO}</PixelSvg>;
}
export function OssoEnsanguentadoIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{OSSO}</PixelSvg>;
}
export function OlhoMorteIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{OLHO}</PixelSvg>;
}
export function TrancaCadavericaIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{TRANCA}</PixelSvg>;
}
export function FalsaPartidaIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{FALSA}</PixelSvg>;
}

/** Corvo da Madrugada, 48x48. `blink`: os olhos vermelhos apagam (piscar). */
export function CorvoSprite({ className = 'w-12 h-12', blink = false }) {
  return (
    <PixelSvg viewBox="0 0 48 48" className={className}>
      {blink ? CORVO_BLINK : CORVO}
    </PixelSvg>
  );
}

/** Seu Tião das Moedas, 48x48, sentado no engradado. */
export function TiaoMoedasSprite({ className = 'w-12 h-12' }) {
  return (
    <PixelSvg viewBox="0 0 48 48" className={className}>
      {TIAO}
    </PixelSvg>
  );
}
