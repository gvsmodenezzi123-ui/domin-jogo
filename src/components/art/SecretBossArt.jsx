// src/components/art/SecretBossArt.jsx
// Patch 0.8.0: O Dono da Noite (nó 19 secreto), retrato 48x48. Figura sombria de chapéu
// de aba larga e gola alta de veludo, o rosto quase todo no escuro, só os olhos dourados
// brilhando; as mãos juntas embaixo, com anéis de caveira. Atrás, um halo vermelho-sangue.
// Camadas como nos outros retratos: base, remendo do humor e a boca aberta falando.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

const PAL = {
  b: '#0c0507', // fundo
  B: '#1a080c', // fundo (borda do halo)
  r: '#4a0a12', // halo vermelho
  R: '#7a1018', // halo (miolo)
  k: '#020102', // contorno
  h: '#09070a', // chapéu
  H: '#5a0c14', // fita do chapéu
  j: '#1c171d', // aba (luz)
  f: '#140d11', // rosto no escuro
  F: '#24171d', // queixo (meia-luz)
  y: '#ffd24a', // olho dourado
  Y: '#8a5e10', // brilho em volta do olho
  W: '#fff6c8', // centro do olho
  c: '#0d0a0d', // casaco
  C: '#3a0c16', // lapela de veludo
  v: '#5e1220', // veludo (luz)
  g: '#4a3c44', // mão
  G: '#6a5a62', // mão (luz)
  w: '#e8dcc0', // osso do anel de caveira
  e: '#ff3b3b', // olho ferido
  t: '#d8ccb0', // dentes
  T: '#e8b84a', // dente de ouro
  m: '#000000', // boca
};

function background() {
  const c = pixelCanvas(48, 48);
  c.rect(0, 0, 48, 48, 'b');
  c.disc(24, 21, 21, 'B');
  c.disc(24, 21, 18, 'r');
  c.disc(24, 19, 12, 'R');
  return c;
}

function figure() {
  const c = pixelCanvas(48, 48);
  // casaco e ombros
  c.ellipse(24, 47, 22, 14, 'c');
  // gola alta de veludo
  c.rect(13, 28, 4, 12, 'C').rect(31, 28, 4, 12, 'C');
  c.line(13, 28, 17, 40, 'v').line(34, 28, 31, 40, 'v');
  // rosto
  c.ellipse(24, 22, 8, 9.5, 'f');
  c.rect(19, 27, 10, 4, 'F');
  // luz vermelha de recorte no lado direito do rosto
  c.line(31, 18, 31, 24, 'v').line(30, 25, 29, 28, 'v');
  c.line(17, 19, 17, 23, 'C');
  // chapéu de aba larga
  c.ellipse(24, 14.5, 18, 3.2, 'h');
  c.rect(10, 13, 28, 1, 'j');
  c.rect(15, 3, 18, 11, 'h');
  c.rect(16, 2, 16, 1, 'h');
  c.rect(15, 10, 18, 2, 'H');
  // olhos dourados
  for (const x of [19, 27]) {
    c.rect(x - 1, 19, 4, 3, 'Y');
    c.rect(x, 20, 2, 1, 'y');
  }
  c.set(19, 20, 'W').set(28, 20, 'W');
  // mãos juntas com os anéis de caveira
  c.ellipse(19, 42, 5, 3.5, 'g').ellipse(29, 42, 5, 3.5, 'g');
  c.rect(16, 40, 4, 1, 'G').rect(27, 40, 4, 1, 'G');
  for (const [x, y] of [[17, 41], [27, 41], [31, 42]]) {
    c.rect(x, y, 3, 3, 'w');
    c.set(x, y + 1, 'k').set(x + 2, y + 1, 'k');
  }
  c.outline('k');
  return c;
}

/** Junta o fundo e a figura (a figura por cima). */
function merge(back, front) {
  const b = back.rows();
  const f = front.rows();
  return b.map((row, y) => Array.from(row, (ch, x) => (f[y][x] !== '.' ? f[y][x] : ch)).join(''));
}

const BASE = mapToRects(merge(background(), figure()), PAL, 'dn');

function patch(draw, key) {
  const c = pixelCanvas(48, 48);
  draw(c);
  return mapToRects(c.rows(), PAL, key);
}

const MOODS = {
  idle: [],
  // um olho aperta, o outro brilha mais
  thinking: patch((c) => {
    c.rect(18, 19, 4, 1, 'f').rect(18, 21, 4, 1, 'f');
    c.rect(19, 20, 2, 1, 'Y');
    c.rect(27, 19, 2, 1, 'W');
  }, 'dt'),
  // o sorriso aparece no escuro, com um dente de ouro
  smug: patch((c) => {
    c.rect(20, 27, 8, 1, 'k');
    c.rect(21, 27, 6, 1, 't');
    c.set(25, 27, 'T');
    c.set(20, 26, 'k').set(27, 26, 'k');
  }, 'ds'),
  // os olhos ficam vermelhos e o rosto racha
  hurt: patch((c) => {
    for (const x of [19, 27]) c.rect(x - 1, 19, 4, 3, 'k').rect(x, 20, 2, 1, 'e');
    c.line(25, 15, 23, 19, 'k').line(23, 19, 26, 24, 'k');
  }, 'dh'),
};

// falando: a boca abre devagar, com os dentes
const SPEAK = patch((c) => {
  c.rect(20, 26, 8, 3, 'm');
  c.rect(21, 26, 6, 1, 't');
  c.set(25, 26, 'T');
}, 'dm');

/** O Dono da Noite, retrato 48x48 (o mesmo contrato dos outros retratos: mood e isSpeaking). */
export function DonoDaNoiteAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return (
    <PixelSvg className={className} viewBox="0 0 48 48">
      {BASE}
      {MOODS[mood] ?? MOODS.idle}
      {isSpeaking && mood !== 'hurt' && SPEAK}
    </PixelSvg>
  );
}
