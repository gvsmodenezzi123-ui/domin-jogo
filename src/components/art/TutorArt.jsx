// src/components/art/TutorArt.jsx
// Vô Juca, o Professor do Boteco (Patch 0.9.5): o velhinho que senta com todo novato na
// partida de treino. Retrato 40x40 no mesmo enquadramento dos rivais (busto de frente,
// silhueta escura atrás): boina de tweed, óculos redondos de aro dourado, sobrancelhas e
// bigode brancos, um lápis atrás da orelha, gravata borboleta verde e o colete de tricô
// mostarda. Quatro humores (idle, thinking, smug, hurt) e a boca que abre quando fala.
//
// Desenhado com as primitivas de pixelCanvas (camadas: fundo, roupa, rosto, boina, óculos)
// e convertido em <rect>s uma vez só, quando o módulo carrega.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

const PAL = {
  K: '#0b0a10', // silhueta escura atrás do busto
  k: '#140d09', // contorno
  c: '#9a7a50', // boina: luz
  C: '#75583a', // boina: tom
  d: '#523c26', // boina: sombra
  e: '#3a2a1c', // aba (sombra na testa)
  x: '#b39368', // fio claro do tweed
  s: '#efc199', // pele: luz
  S: '#d89d72', // pele: tom
  t: '#b2744c', // pele: sombra
  T: '#82502f', // pele: sombra funda
  R: '#e58f78', // bochecha corada
  w: '#f6f2e8', // cabelo branco: luz
  W: '#d2cbbb', // cabelo branco: tom
  v: '#9e978a', // cabelo branco: sombra
  g: '#d6ae52', // aro dourado
  G: '#8f6c26', // aro na sombra / haste
  l: '#ffffff@0.6', // reflexo da lente
  o: '#140d09', // pupila
  O: '#f3ead4', // branco do olho
  m: '#2a0d08', // boca
  r: '#b8473c', // língua / lábio
  h: '#efe6cf', // camisa
  H: '#c4b99f', // camisa: sombra
  z: '#2f6b44', // gravata borboleta
  Z: '#1f4a2e', // gravata: sombra
  y: '#dba443', // colete: luz
  Y: '#b27f2e', // colete: tom
  u: '#7e5520', // colete: sombra
  b: '#4a2e14', // botões
  p: '#f2c230', // lápis
  P: '#c4951a', // lápis: sombra
  q: '#f08a8a', // borracha
  n: '#3a2a1a', // ponta do grafite
};

/** Tudo o que não muda com o humor: fundo, roupa, rosto, cabelo, boina, óculos e nariz. */
function base() {
  const cv = pixelCanvas(40, 40);
  // silhueta escura atrás (cantos de cima arredondados)
  cv.rect(5, 4, 30, 36, 'K').rect(6, 3, 28, 1, 'K');
  cv.set(5, 4, '.').set(34, 4, '.');

  // colete de tricô e ombros
  cv.rect(6, 34, 28, 6, 'Y').rect(8, 33, 24, 1, 'Y').rect(10, 32, 20, 1, 'Y');
  cv.rect(5, 36, 1, 4, 'Y').rect(34, 36, 1, 4, 'Y');
  cv.shade('Y', 'y', (x, y) => x < 13 && y < 37);
  cv.shade('Y', 'u', (x, y) => x > 29 || (x < 8 && y > 36) || y === 39);
  // tricô: pontinhos de sombra
  for (let y = 35; y < 40; y += 2) for (let x = 7 + (y % 4 === 1 ? 1 : 0); x < 33; x += 3) if (cv.get(x, y) === 'Y') cv.set(x, y, 'u');
  // camisa em V e o colarinho
  cv.rect(17, 32, 6, 8, 'h').rect(16, 32, 1, 2, 'h').rect(23, 32, 1, 2, 'h');
  cv.rect(18, 36, 4, 4, 'H').rect(19, 35, 2, 1, 'H');
  cv.set(15, 32, 'h').set(24, 32, 'h');
  // gravata borboleta
  cv.rect(17, 33, 2, 2, 'z').rect(21, 33, 2, 2, 'z').rect(19, 33, 2, 2, 'Z');
  cv.set(16, 33, 'z').set(23, 33, 'z').set(16, 34, 'Z').set(23, 34, 'Z');
  // botões do colete
  cv.set(16, 36, 'b').set(16, 38, 'b');
  cv.line(16, 35, 16, 39, 'u');
  cv.set(16, 36, 'b').set(16, 38, 'b');

  // pescoço
  cv.rect(16, 30, 8, 2, 'S').rect(17, 31, 6, 1, 't');

  // orelhas
  cv.rect(7, 17, 2, 6, 'S').rect(31, 17, 2, 6, 'S');
  cv.set(7, 18, 't').set(7, 19, 't').set(32, 18, 't').set(32, 19, 't').set(7, 22, 't').set(32, 22, 't');

  // rosto
  cv.ellipse(20, 20.5, 11, 11, 'S');
  cv.rect(10, 13, 20, 12, 'S');
  // queixo mais estreito
  for (let y = 27; y < 33; y += 1) {
    const half = [10, 9, 8, 7, 5, 3][y - 27];
    for (let x = 0; x < 40; x += 1) if (cv.get(x, y) === 'S' && Math.abs(x + 0.5 - 20) > half && y > 26) cv.set(x, y, y > 29 ? '.' : cv.get(x, y));
  }
  cv.rect(16, 30, 8, 1, 'S');
  // luz da lâmpada (cima/esquerda) e sombra (baixo/direita)
  cv.shade('S', 's', (x, y) => x < 18 && y < 24 && x > 10);
  cv.shade('S', 't', (x, y) => x > 27 || y > 28 || (x > 25 && y > 25));
  cv.shade('t', 'T', (x, y) => x > 29 && y > 22);

  // cabelo branco nas têmporas e na nuca
  cv.rect(9, 12, 2, 6, 'w').rect(29, 12, 2, 6, 'w').rect(8, 14, 1, 3, 'W').rect(31, 14, 1, 3, 'W');
  cv.set(10, 18, 'W').set(29, 18, 'W').set(9, 18, 'v').set(30, 18, 'v');

  // lápis atrás da orelha direita (lado de quem olha: direita)
  cv.line(30, 15, 35, 10, 'p', 1).line(31, 15, 36, 10, 'P', 1);
  cv.set(29, 16, 'n').set(30, 16, 'S');
  cv.set(36, 9, 'q').set(35, 9, 'q').set(36, 10, 'q');

  // boina de tweed: copa arredondada e a aba na frente
  cv.ellipse(20, 9, 11.5, 5.5, 'C');
  cv.rect(9, 9, 22, 3, 'C');
  cv.rect(7, 11, 26, 2, 'd').rect(8, 13, 24, 1, 'e');
  cv.shade('C', 'c', (x, y) => y < 8 || (x < 16 && y < 10));
  cv.shade('C', 'd', (x, y) => x > 28 && y > 8);
  // fio do tweed
  for (let y = 5; y < 11; y += 2) for (let x = 10 + (y % 4 === 1 ? 2 : 0); x < 31; x += 4) if ('cC'.includes(cv.get(x, y))) cv.set(x, y, 'x');
  // costura no topo
  cv.set(20, 4, 'd').set(19, 4, 'd').set(20, 3, 'k');
  // brilho da aba
  cv.rect(10, 11, 8, 1, 'C');

  // óculos redondos: duas lentes e a ponte
  for (const cx of [11, 22]) {
    cv.rect(cx + 1, 16, 5, 1, 'g').rect(cx + 1, 22, 5, 1, 'G');
    cv.rect(cx, 17, 1, 5, 'g').rect(cx + 6, 17, 1, 5, 'G');
  }
  cv.rect(18, 18, 4, 1, 'g');
  cv.rect(9, 18, 2, 1, 'G').rect(29, 18, 2, 1, 'G');

  // nariz grande de vô
  cv.rect(19, 19, 2, 4, 's').rect(18, 22, 4, 2, 'S');
  cv.set(21, 20, 't').set(21, 21, 't').set(17, 23, 't').set(22, 23, 't').set(18, 24, 'T').set(21, 24, 'T').set(19, 24, 't').set(20, 24, 't');
  // bochechas coradas
  cv.rect(12, 23, 2, 1, 'R').rect(26, 23, 2, 1, 'R');

  // bigode branco, cheio, de pontas caídas
  cv.rect(15, 25, 10, 1, 'w').rect(13, 26, 14, 1, 'w').rect(12, 27, 4, 1, 'W').rect(24, 27, 4, 1, 'W');
  cv.set(11, 28, 'v').set(12, 28, 'W').set(27, 28, 'W').set(28, 28, 'v');
  cv.rect(17, 27, 6, 1, 'W');
  cv.set(14, 25, 'W').set(25, 25, 'W');
  cv.shade('w', 'W', (x, y) => x > 23 && y === 26);
  return cv.rows();
}

/** Sobrancelhas e olhos por humor (desenhados dentro das lentes). */
function eyes(mood) {
  const cv = pixelCanvas(40, 40);
  const brow = (x0, y, rows) => rows.forEach((row, i) => [...row].forEach((ch, j) => ch !== '.' && cv.set(x0 + j, y + i, ch)));
  if (mood === 'thinking') {
    // olha para cima e para o lado; uma sobrancelha sobe
    brow(11, 13, ['.wwwww.', 'wWW....']);
    brow(22, 14, ['wwwwww.', '.WWWWW.']);
    for (const cx of [11, 22]) {
      cv.rect(cx + 2, 18, 3, 2, 'O').set(cx + 4, 18, 'o').set(cx + 3, 18, 'o');
      cv.set(cx + 1, 17, 'l');
    }
  } else if (mood === 'smug') {
    // piscadinha: olho esquerdo fechado em arco, o direito aberto
    brow(11, 14, ['wwwwww.', '.WWWW..']);
    brow(22, 13, ['.wwwww.', 'wWW....']);
    cv.rect(13, 20, 3, 1, 'o').set(12, 19, 'o').set(16, 19, 'o');
    cv.rect(24, 18, 3, 2, 'O').rect(25, 18, 1, 2, 'o');
    cv.set(23, 17, 'l').rect(24, 20, 3, 1, 't');
  } else if (mood === 'hurt') {
    // olhos apertados e sobrancelhas de dor
    brow(11, 14, ['.wwww..', 'W....W.']);
    brow(22, 14, ['..wwww.', '.W....W']);
    cv.set(13, 18, 'o').set(14, 19, 'o').set(15, 20, 'o').set(15, 18, 'o').set(13, 20, 'o');
    cv.set(24, 18, 'o').set(25, 19, 'o').set(26, 20, 'o').set(26, 18, 'o').set(24, 20, 'o');
  } else {
    // olhar bondoso, de frente
    brow(11, 14, ['wwwwww.', '.WWWW..']);
    brow(22, 14, ['.wwwwww', '..WWWW.']);
    for (const cx of [11, 22]) {
      cv.rect(cx + 2, 18, 3, 2, 'O').rect(cx + 3, 18, 1, 2, 'o');
      cv.set(cx + 1, 17, 'l').rect(cx + 2, 20, 3, 1, 't');
    }
  }
  return cv.rows();
}

/** Boca debaixo do bigode: falando abre; cada humor tem a dele. */
function mouth(key) {
  const cv = pixelCanvas(40, 40);
  if (key === 'speak') {
    cv.rect(17, 28, 6, 2, 'm').rect(18, 30, 4, 1, 'm').rect(18, 29, 4, 1, 'r');
  } else if (key === 'thinking') {
    cv.rect(19, 28, 3, 1, 'm');
  } else if (key === 'smug') {
    cv.rect(16, 28, 8, 1, 'm').rect(17, 29, 6, 1, 'h').set(16, 29, 'm').set(23, 29, 'm').rect(17, 30, 6, 1, 'm');
  } else if (key === 'hurt') {
    cv.rect(17, 29, 6, 1, 'm').set(16, 30, 'm').set(23, 30, 'm').rect(18, 28, 4, 1, 't');
  } else {
    cv.rect(17, 28, 6, 1, 'm').rect(18, 29, 4, 1, 'r').set(16, 28, 't').set(23, 28, 't');
  }
  return cv.rows();
}

const BASE = mapToRects(base(), PAL, 'vj-b-');
const EYES = Object.fromEntries(['idle', 'thinking', 'smug', 'hurt'].map((m) => [m, mapToRects(eyes(m), PAL, `vj-e${m}-`)]));
const MOUTH = Object.fromEntries(['idle', 'thinking', 'smug', 'hurt', 'speak'].map((m) => [m, mapToRects(mouth(m), PAL, `vj-m${m}-`)]));

/** Vô Juca, o Professor do Boteco (só na partida de treino). */
export function VoJucaAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  const face = EYES[mood] ? mood : 'idle';
  const speaking = isSpeaking && face !== 'hurt';
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {BASE}
      {EYES[face]}
      {MOUTH[speaking ? 'speak' : face]}
    </PixelSvg>
  );
}
