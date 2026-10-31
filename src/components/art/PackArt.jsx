// Versão 1.5: os três pacotes fechados da Loja do Valtinho (data/packs.js), em 32x32.
import { mapToRects, pixelCanvas } from './pixelCanvas.js';
import { PixelSvg } from './PixelSvg.jsx';

const PAL = {
  k: '#0b0705',
  // maço: papel vermelho, faixa dourada, papel-alumínio e os cigarros
  r: '#b8261c',
  R: '#e0483a',
  d: '#6e120c',
  y: '#e6c34a',
  Y: '#fff0a0',
  w: '#f2efe6',
  W: '#ffffff',
  o: '#d99a4a',
  s: '#b9c0c4',
  S: '#e8eef0',
  // saco de estopa
  b: '#a07a48',
  B: '#c8a06a',
  n: '#6a4a26',
  t: '#3a2610',
  c: '#ebe0c2',
  p: '#1a120a',
  // engradado de madeira
  m: '#7a4a24',
  M: '#a06a38',
  l: '#4a2a12',
  g: '#2f5a2a',
  G: '#6aa060',
  a: '#d9a531',
};

function drawMaco() {
  const c = pixelCanvas(32, 32);
  // cigarros saindo pela tampa aberta
  for (const [x, h] of [[11, 6], [14, 8], [17, 5], [20, 7]]) {
    c.rect(x, 9 - h + 4, 2, h, 'w').set(x, 9 - h + 4, 'o').set(x + 1, 9 - h + 4, 'o');
  }
  c.rect(9, 8, 14, 2, 's').rect(9, 8, 14, 1, 'S');
  // corpo do maço
  c.rect(8, 10, 16, 19, 'r');
  c.rect(8, 10, 2, 19, 'R');
  c.rect(22, 10, 2, 19, 'd');
  c.rect(8, 15, 16, 3, 'y').rect(8, 15, 16, 1, 'Y');
  // brasão e letreiro
  c.disc(16, 22.5, 3, 'w').disc(16, 22.5, 1.6, 'r');
  c.rect(11, 26, 10, 1, 'y');
  c.outline('k');
  return c.rows();
}

function drawSaco() {
  const c = pixelCanvas(32, 32);
  c.ellipse(16, 21, 10, 9, 'b');
  c.ellipse(14, 19, 6, 6, 'B');
  c.rect(12, 8, 8, 6, 'b');
  c.rect(11, 6, 10, 3, 'B');
  // boca amarrada com barbante
  c.rect(11, 12, 10, 2, 't');
  c.set(21, 13, 't').set(22, 14, 't').set(23, 15, 't');
  // remendo e trama da estopa
  c.rect(19, 21, 4, 4, 'n');
  for (let y = 16; y < 29; y += 3) for (let x = 8; x < 25; x += 4) if (c.get(x, y) === 'b') c.set(x, y, 'n');
  // uma pedra espiando pela boca
  c.rect(14, 3, 5, 5, 'c').set(15, 4, 'p').set(17, 6, 'p');
  c.outline('k');
  return c.rows();
}

function drawEngradado() {
  const c = pixelCanvas(32, 32);
  // gargalos e tampinhas aparecendo por cima
  for (const x of [10, 15, 20]) {
    c.rect(x, 5, 3, 7, 'g').set(x, 6, 'G').set(x, 7, 'G');
    c.rect(x, 4, 3, 2, 'a');
  }
  // engradado: ripas
  c.rect(5, 12, 22, 16, 'm');
  for (const y of [12, 18, 24]) c.rect(5, y, 22, 4, 'M').rect(5, y + 3, 22, 1, 'l');
  c.rect(5, 12, 2, 16, 'l').rect(25, 12, 2, 16, 'l');
  c.rect(14, 12, 4, 16, 'm').rect(15, 12, 1, 16, 'M');
  // pregos
  for (const [x, y] of [[6, 13], [25, 13], [6, 25], [25, 25]]) c.set(x, y, 'S');
  c.outline('k');
  return c.rows();
}

const ART = {
  macoParaguaio: mapToRects(drawMaco(), PAL, 'pm'),
  sacoPedras: mapToRects(drawSaco(), PAL, 'ps'),
  engradadoJumbo: mapToRects(drawEngradado(), PAL, 'pe'),
};

/** O pacote fechado (Maço Paraguaio, Saco de Pedras ou Engradado Jumbo). */
export function PackSprite({ id, className = 'w-10 h-10' }) {
  return (
    <PixelSvg viewBox="0 0 32 32" className={className}>
      {ART[id]}
    </PixelSvg>
  );
}
