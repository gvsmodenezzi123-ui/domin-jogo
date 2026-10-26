// src/components/art/Rivals140.jsx
// Versão 1.4: os retratos 40x40 dos 10 rivais novos, no mesmo enquadramento dos de antes (busto de
// frente, silhueta escura atrás, luz da lâmpada vindo de cima à esquerda). Cada um tem 4 humores
// (idle, thinking, smug, hurt) e a boca que abre quando fala (menos no ferido).
//
// Desenhados com as primitivas de pixelCanvas em camadas (fundo e roupa, rosto, cabelo/chapéu,
// detalhes; olhos e boca por humor) e convertidos em <rect>s uma vez só, quando o módulo carrega.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

const MOODS = ['idle', 'thinking', 'smug', 'hurt'];

/** Cores comuns a todos (fundo, contorno, olhos, boca). */
const COMMON = {
  K: '#0b0a10', // silhueta escura atrás do busto
  k: '#140d09', // contorno e cílios
  O: '#f3ead4', // branco do olho / dentes
  o: '#140d09', // pupila
  m: '#2a0d08', // boca
  r: '#b8473c', // língua / lábio
  l: '#ffffff@0.55', // reflexo
};

// ---------------------------------------------------------------------------
// Primitivas do busto
// ---------------------------------------------------------------------------

function backdrop(cv) {
  cv.rect(5, 4, 30, 36, 'K').rect(6, 3, 28, 1, 'K');
  cv.set(5, 4, '.').set(34, 4, '.');
}

/** Ombros/roupa: tom `c`, luz `light` (esquerda), sombra `shade` (direita e embaixo). */
function shoulders(cv, c, light, shade) {
  cv.rect(6, 34, 28, 6, c).rect(8, 33, 24, 1, c).rect(10, 32, 20, 1, c);
  cv.rect(5, 36, 1, 4, c).rect(34, 36, 1, 4, c);
  cv.shade(c, light, (x, y) => x < 13 && y < 37);
  cv.shade(c, shade, (x, y) => x > 29 || y === 39);
}

/**
 * Pescoço, orelhas e rosto em S/s/t/T (tom, luz, sombra, sombra funda). `jaw`: 'soft' (queixo
 * estreito), 'square' (quadrado) ou 'long' (comprido e magro).
 */
function head(cv, { jaw = 'soft', rx = 11 } = {}) {
  cv.rect(16, 30, 8, 2, 'S').rect(17, 31, 6, 1, 't');
  cv.rect(7, 17, 2, 6, 'S').rect(31, 17, 2, 6, 'S');
  cv.set(7, 18, 't').set(7, 19, 't').set(32, 18, 't').set(32, 19, 't').set(7, 22, 't').set(32, 22, 't');
  cv.ellipse(20, 20.5, rx, 11, 'S');
  cv.rect(Math.round(20 - rx + 1), 13, Math.round(2 * rx - 2), 12, 'S');
  const widths = jaw === 'square' ? [10, 10, 9, 8, 7, 4] : jaw === 'long' ? [9, 8, 7, 6, 5, 3] : [10, 9, 8, 7, 5, 3];
  for (let y = 27; y < 33; y += 1) {
    const half = widths[y - 27];
    for (let x = 0; x < 40; x += 1) if (cv.get(x, y) === 'S' && Math.abs(x + 0.5 - 20) > half && y > 26) cv.set(x, y, y > 29 ? '.' : cv.get(x, y));
  }
  if (jaw === 'square') cv.rect(13, 28, 14, 2, 'S');
  cv.rect(16, 30, 8, 1, 'S');
  cv.shade('S', 's', (x, y) => x < 18 && y < 24 && x > 10);
  cv.shade('S', 't', (x, y) => x > 27 || y > 28 || (x > 25 && y > 25));
  cv.shade('t', 'T', (x, y) => x > 29 && y > 22);
}

/** Nariz simples (luz em cima, sombra embaixo e do lado direito). */
function nose(cv, { y = 19, big = false } = {}) {
  cv.rect(19, y, 2, big ? 4 : 3, 's');
  const bottom = y + (big ? 4 : 3);
  cv.rect(18, bottom, 4, 1, 'S').set(21, y + 1, 't').set(17, bottom, 't').set(22, bottom, 't');
  cv.set(18, bottom + 1, 'T').set(21, bottom + 1, 'T');
}

/**
 * Olhos e sobrancelhas por humor. `xs`: canto esquerdo de cada olho (3x2); `brow`: cor;
 * `lid`: cor da pálpebra; `y`: linha de cima dos olhos.
 */
function eyes(cv, mood, { xs = [13, 24], y = 18, brow = 'h', lid = 't', browY = y - 3, thick = 1 } = {}) {
  const browRow = (x, by, len = 5) => cv.rect(x, by, len, thick, brow);
  if (mood === 'thinking') {
    for (const x of xs) cv.rect(x, y, 3, 2, 'O').set(x + 2, y, 'o').set(x + 1, y, 'o');
    browRow(xs[0] - 1, browY - 1);
    cv.set(xs[0] - 1, browY, brow);
    browRow(xs[1] - 1, browY);
  } else if (mood === 'smug') {
    for (const x of xs) {
      cv.rect(x, y, 3, 1, lid).rect(x, y + 1, 3, 1, 'O').set(x + 1, y + 1, 'o');
    }
    browRow(xs[0] - 1, browY + 1);
    cv.set(xs[0] + 3, browY + 2, brow);
    browRow(xs[1] - 1, browY);
    cv.set(xs[1] + 3, browY + 1, brow);
  } else if (mood === 'hurt') {
    for (const x of xs) cv.set(x, y - 1, 'o').set(x + 1, y, 'o').set(x + 2, y + 1, 'o').set(x + 2, y - 1, 'o').set(x, y + 1, 'o');
    cv.rect(xs[0], browY, 4, thick, brow).set(xs[0] + 3, browY - 1, brow);
    cv.rect(xs[1] - 1, browY, 4, thick, brow).set(xs[1] - 1, browY - 1, brow);
  } else {
    for (const x of xs) cv.rect(x, y, 3, 2, 'O').rect(x + 1, y, 1, 2, 'o').set(x, y, 'l');
    browRow(xs[0] - 1, browY);
    browRow(xs[1] - 1, browY);
  }
}

/** Boca por humor (y = linha da boca fechada). */
function mouth(cv, key, { y = 26, x = 17, w = 6, lip = 'r' } = {}) {
  if (key === 'speak') {
    cv.rect(x, y, w, 2, 'm').rect(x + 1, y + 2, w - 2, 1, 'm').rect(x + 1, y + 1, w - 2, 1, lip);
  } else if (key === 'thinking') {
    cv.rect(x + 2, y, Math.max(2, w - 3), 1, 'm');
  } else if (key === 'smug') {
    cv.rect(x - 1, y, w + 2, 1, 'm').rect(x, y + 1, w, 1, 'O').set(x - 1, y + 1, 'm').set(x + w, y + 1, 'm').rect(x, y + 2, w, 1, 'm');
  } else if (key === 'hurt') {
    cv.rect(x, y + 1, w, 1, 'm').set(x - 1, y + 2, 'm').set(x + w, y + 2, 'm').rect(x + 1, y, w - 2, 1, 't');
  } else {
    cv.rect(x, y, w, 1, 'm').set(x - 1, y - 1, 't').set(x + w, y - 1, 't');
  }
}

/** Monta o componente: base + olhos do humor + boca (falando, abre). */
function makePortrait(key, pal, { base, face, lips }) {
  const palette = { ...COMMON, ...pal };
  const BASE = mapToRects(base(), palette, `${key}-b-`);
  const EYES = Object.fromEntries(
    MOODS.map((m) => {
      const cv = pixelCanvas(40, 40);
      face(cv, m);
      return [m, mapToRects(cv.rows(), palette, `${key}-e${m}-`)];
    }),
  );
  const MOUTH = Object.fromEntries(
    [...MOODS, 'speak'].map((m) => {
      const cv = pixelCanvas(40, 40);
      lips(cv, m);
      return [m, mapToRects(cv.rows(), palette, `${key}-m${m}-`)];
    }),
  );
  function Portrait({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
    const faceKey = EYES[mood] ? mood : 'idle';
    const speaking = isSpeaking && faceKey !== 'hurt';
    return (
      <PixelSvg className={className} viewBox="0 0 40 40">
        {BASE}
        {EYES[faceKey]}
        {MOUTH[speaking ? 'speak' : faceKey]}
      </PixelSvg>
    );
  }
  return Portrait;
}

/** Algarismo 3x5 (para o "71" da camisa). */
const DIGITS = {
  7: ['###', '..#', '..#', '.#.', '.#.'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
};
function digit(cv, d, x, y, c) {
  DIGITS[d].forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && cv.set(x + i, y + j, c)));
}

// ---------------------------------------------------------------------------
// Juvenal Cobrador, o Homem da Pasta: careca com o fio penteado por cima, óculos redondos de
// aro fino, bigodinho, terno cinza de repartição, gravata cor de vinho e a caneta atrás da orelha.
// ---------------------------------------------------------------------------

export const JuvenalAvatar = makePortrait(
  'jv',
  {
    S: '#d9a37a', s: '#ecc39b', t: '#b57c55', T: '#8a5a3a',
    h: '#3a2a1e', H: '#5a4632',
    g: '#c9c2b0', G: '#8f897a',
    c: '#5a5f68', C: '#7c838e', d: '#3b3f46',
    w: '#e8e2d0', z: '#7a2a22', Z: '#4f1a15', p: '#2a4fa8',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'C', 'd');
      cv.rect(17, 32, 6, 8, 'w');
      cv.line(16, 32, 18, 39, 'd').line(23, 32, 21, 39, 'd');
      cv.rect(19, 33, 2, 7, 'z').rect(19, 32, 2, 1, 'Z').rect(20, 34, 1, 6, 'Z');
      head(cv);
      // careca brilhando, os lados e o fio penteado de um lado a outro
      cv.rect(15, 9, 5, 1, 's');
      cv.rect(9, 13, 2, 7, 'h').rect(29, 13, 2, 7, 'h').rect(8, 15, 1, 3, 'H').rect(31, 15, 1, 3, 'H');
      cv.line(11, 12, 28, 10, 'h').line(12, 13, 27, 11, 'H');
      // caneta atrás da orelha
      cv.line(31, 15, 34, 10, 'p').set(34, 9, 'G');
      // óculos redondos de aro fino
      for (const x of [12, 23]) {
        cv.rect(x + 1, 16, 4, 1, 'g').rect(x + 1, 21, 4, 1, 'G').rect(x, 17, 1, 4, 'g').rect(x + 5, 17, 1, 4, 'G');
      }
      cv.rect(18, 18, 5, 1, 'g').rect(9, 18, 3, 1, 'G').rect(29, 18, 2, 1, 'G');
      nose(cv);
      // bigodinho fino
      cv.rect(16, 24, 8, 1, 'h').set(15, 25, 'h').set(24, 25, 'h');
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [14, 24], y: 18, browY: 15 }),
    lips: (cv, key) => mouth(cv, key, { y: 26 }),
  },
);

// ---------------------------------------------------------------------------
// Zeca Charreteiro, o Chicote Estalando: chapéu de palha de aba larga, pele queimada de sol,
// barba por fazer, lenço vermelho de bolinhas no pescoço, camisa xadrez e o cabo do chicote.
// ---------------------------------------------------------------------------

export const ZecaAvatar = makePortrait(
  'zc',
  {
    S: '#c98a5a', s: '#e0a674', t: '#a0643a', T: '#7a4626',
    h: '#3a2414', v: '#8a5a38',
    y: '#e8c870', Y: '#c9a24a', u: '#9a7a30', b: '#7a2a1a',
    z: '#c8322a', Z: '#8a1f18', w: '#f4ecd2',
    c: '#3a6a8a', C: '#5a8aaa', d: '#24465c', e: '#b8d0e0',
    n: '#7a4a24', N: '#4a2a12',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'C', 'd');
      // xadrez da camisa
      for (let y = 33; y < 40; y += 3) cv.rect(6, y, 28, 1, 'd');
      for (let x = 8; x < 34; x += 4) for (let y = 32; y < 40; y += 1) if ('cCd'.includes(cv.get(x, y))) cv.set(x, y, 'e');
      // o cabo do chicote no ombro
      cv.line(27, 39, 35, 29, 'n', 2).line(35, 29, 37, 26, 'N');
      head(cv, { jaw: 'square' });
      cv.shade('S', 'v', (x, y) => y >= 26 && y <= 30 && x >= 11 && x <= 29);
      // costeletas
      cv.rect(9, 14, 1, 5, 'h').rect(30, 14, 1, 5, 'h');
      // chapéu de palha: copa e a aba larga (sombra na testa)
      cv.ellipse(20, 7.5, 9, 4.5, 'y');
      cv.rect(11, 7, 18, 5, 'y');
      cv.rect(3, 11, 34, 2, 'Y').rect(5, 13, 30, 1, 'u');
      cv.rect(11, 10, 18, 1, 'b');
      cv.shade('y', 'Y', (x, y) => x > 25 || y < 5);
      for (let y = 5; y < 10; y += 2) for (let x = 12 + (y % 4 === 1 ? 2 : 0); x < 29; x += 4) if (cv.get(x, y) === 'y') cv.set(x, y, 'u');
      cv.rect(10, 14, 20, 1, 't');
      nose(cv, { big: true });
      // lenço vermelho de bolinhas
      cv.rect(14, 31, 12, 2, 'z').rect(16, 33, 8, 2, 'z').rect(18, 35, 4, 1, 'z').set(20, 36, 'Z').set(19, 36, 'Z');
      cv.shade('z', 'Z', (x) => x > 22);
      for (const [x, y] of [[15, 31], [19, 32], [23, 31], [18, 34], [21, 33]]) cv.set(x, y, 'w');
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [13, 24], y: 18, browY: 16 }),
    lips: (cv, key) => mouth(cv, key === 'idle' ? 'smug' : key, { y: 26 }),
  },
);

// ---------------------------------------------------------------------------
// Marquinhos da Van, Sem Troco: boné de aba reta, regata branca, corrente dourada, brinco e o
// sorrisão de quem não tem troco nunca.
// ---------------------------------------------------------------------------

export const MarquinhosAvatar = makePortrait(
  'mq',
  {
    S: '#a8704a', s: '#c48a5e', t: '#86542f', T: '#643b1e',
    h: '#1a110b',
    c: '#d83a2a', C: '#f05a44', d: '#9a2418', D: '#6a160e',
    w: '#f2f2ee', W: '#c8c8c0', g: '#f0c040', G: '#b88a20',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      // ombros de fora (a regata) e a regata no meio
      shoulders(cv, 'S', 's', 'T');
      cv.rect(12, 32, 16, 8, 'w').rect(13, 31, 3, 2, 'w').rect(24, 31, 3, 2, 'w');
      cv.shade('w', 'W', (x) => x > 24);
      head(cv);
      // cabelo raspado nas laterais
      cv.rect(9, 13, 2, 4, 'h').rect(29, 13, 2, 4, 'h');
      // boné de aba reta
      cv.ellipse(20, 9, 10.5, 5, 'c');
      cv.rect(9, 9, 22, 4, 'c');
      cv.rect(8, 13, 24, 2, 'd').rect(8, 15, 24, 1, 'D');
      cv.rect(9, 13, 10, 1, 'C');
      cv.shade('c', 'C', (x, y) => x < 16 && y < 10);
      cv.shade('c', 'd', (x) => x > 27);
      cv.rect(19, 4, 2, 1, 'd');
      // brinco e a corrente dourada
      cv.set(8, 22, 'g').set(8, 23, 'G');
      for (let x = 14; x <= 25; x += 1) cv.set(x, x < 20 ? 32 + Math.floor((x - 14) / 3) : 33 + Math.floor((25 - x) / 3), (x % 2 ? 'g' : 'G'));
      cv.rect(19, 35, 2, 2, 'g');
      nose(cv);
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [13, 24], y: 18, browY: 16 }),
    lips: (cv, key) => {
      mouth(cv, key === 'idle' ? 'smug' : key, { y: 26 });
      // o dente faltando no sorrisão
      if (key === 'idle' || key === 'smug') cv.set(19, 27, 'm');
    },
  },
);

// ---------------------------------------------------------------------------
// Nelsinho 71, o Mestre do Ponto: cabelo de gel repartido, faixa na testa, camisa verde de
// futebol de várzea com o 71 no peito e o lápis de marcar ponto atrás da orelha.
// ---------------------------------------------------------------------------

export const NelsinhoAvatar = makePortrait(
  'nl',
  {
    S: '#e0b088', s: '#f2c9a4', t: '#bf8a62', T: '#94643e',
    h: '#1c1410', H: '#5a4632',
    b: '#f2f2ee', B: '#c8c8c0', x: '#2a6a3a',
    c: '#2a6a3a', C: '#3e8a50', d: '#1c4a28', w: '#f2f2ee',
    p: '#f2c230', P: '#c4951a',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'C', 'd');
      // gola branca e o 71
      cv.rect(15, 32, 10, 1, 'w').rect(16, 33, 2, 1, 'w').rect(22, 33, 2, 1, 'w');
      digit(cv, 7, 15, 34, 'w');
      digit(cv, 1, 20, 34, 'w');
      head(cv);
      // cabelo de gel repartido de lado
      cv.ellipse(20, 10, 11, 5, 'h');
      cv.rect(9, 10, 3, 6, 'h').rect(28, 10, 3, 6, 'h');
      cv.line(14, 7, 24, 6, 'H').line(25, 7, 28, 9, 'H');
      cv.set(16, 7, 'S').set(16, 8, 'S');
      // faixa na testa com o friso verde
      cv.rect(9, 13, 22, 2, 'b').rect(9, 14, 22, 1, 'B').rect(9, 13, 22, 1, 'b');
      cv.rect(9, 13, 22, 1, 'b').rect(18, 13, 4, 1, 'x');
      // lápis atrás da orelha
      cv.line(31, 16, 35, 12, 'p').line(32, 16, 35, 13, 'P');
      nose(cv);
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [13, 24], y: 18, browY: 16 }),
    lips: (cv, key) => mouth(cv, key, { y: 26 }),
  },
);

// ---------------------------------------------------------------------------
// Geraldo Coveiro, o Silencioso: rosto comprido e cinzento, olheiras fundas, chapéu de feltro
// velho, sobretudo escuro e a pá apoiada no ombro.
// ---------------------------------------------------------------------------

export const GeraldoAvatar = makePortrait(
  'gr',
  {
    S: '#b9b3a2', s: '#d2ccba', t: '#958e7c', T: '#6e685a',
    q: '#5a5448', h: '#3a3630', v: '#8a8478',
    f: '#2e2a26', F: '#46403a', e: '#1c1a17',
    c: '#2c2f2a', C: '#3e423b', d: '#1c1e1a',
    n: '#7a5a3a', N: '#5a3e24', g: '#8d949c', G: '#b4bcc4',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'C', 'd');
      // gola alta do sobretudo
      cv.rect(13, 31, 3, 4, 'C').rect(24, 31, 3, 4, 'd');
      // a pá: cabo no ombro, lâmina lá em cima
      cv.line(26, 39, 34, 21, 'n', 2).line(27, 39, 35, 21, 'N');
      cv.ellipse(35.5, 17.5, 2.5, 4, 'g');
      cv.rect(35, 14, 2, 3, 'G');
      head(cv, { jaw: 'long', rx: 10 });
      // maçãs do rosto fundas e a barba grisalha por fazer
      cv.rect(11, 22, 2, 3, 't').rect(27, 22, 2, 3, 'T');
      cv.shade('S', 'v', (x, y) => y >= 27 && y <= 30 && x >= 12 && x <= 28);
      // olheiras (o fundo do olho)
      cv.rect(12, 17, 6, 4, 'q').rect(23, 17, 6, 4, 'q');
      // chapéu de feltro velho, amassado
      cv.rect(11, 5, 18, 6, 'f').rect(12, 4, 16, 1, 'f');
      cv.rect(17, 4, 6, 1, 'e');
      cv.rect(11, 10, 18, 1, 'e');
      cv.rect(7, 11, 26, 2, 'F').rect(8, 13, 24, 1, 'e');
      cv.shade('f', 'F', (x, y) => x < 15 && y < 9);
      nose(cv, { big: true });
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [14, 24], y: 18, browY: 16, brow: 'h' }),
    lips: (cv, key) => mouth(cv, key === 'smug' ? 'thinking' : key, { y: 27, x: 17, w: 6 }),
  },
);

// ---------------------------------------------------------------------------
// Genésio da Rifa, o Picareta do Bilhete: chapéu vermelho com bilhetes de rifa na fita, cabelo
// de brilhantina, bigodinho, dente de ouro, paletó xadrez berrante e gravata borboleta.
// ---------------------------------------------------------------------------

export const GenesioAvatar = makePortrait(
  'gn',
  {
    S: '#d8a072', s: '#ecbd8f', t: '#b27a4c', T: '#875632',
    h: '#120c08', H: '#3a2a20',
    f: '#7a1f1f', F: '#a02a2a', e: '#3a0e0e',
    w: '#f4e3b8', W: '#c8b080',
    c: '#c8a24a', C: '#e8c870', d: '#8a6a2a', x: '#5a2a12',
    z: '#2a8a3a', Z: '#1a5a24', g: '#f0c040',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'C', 'd');
      // xadrez berrante do paletó
      for (let y = 32; y < 40; y += 1) for (let x = 6; x < 35; x += 1) if ('cCd'.includes(cv.get(x, y)) && (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) cv.set(x, y, 'x');
      // camisa e a gravata borboleta
      cv.rect(17, 32, 6, 8, 'w').rect(18, 36, 4, 4, 'W');
      cv.rect(16, 33, 3, 2, 'z').rect(21, 33, 3, 2, 'z').rect(19, 33, 2, 2, 'Z');
      head(cv);
      // brilhantina por baixo do chapéu
      cv.rect(9, 13, 2, 5, 'h').rect(29, 13, 2, 5, 'h').set(9, 14, 'H');
      // chapéu com os bilhetes enfiados na fita
      cv.rect(11, 5, 18, 6, 'f').rect(12, 4, 16, 1, 'f');
      cv.rect(11, 9, 18, 2, 'e');
      cv.rect(7, 11, 26, 2, 'F').rect(8, 13, 24, 1, 'e');
      cv.shade('f', 'F', (x) => x < 16);
      cv.rect(23, 5, 3, 5, 'w').rect(26, 6, 2, 4, 'W').set(24, 6, 'W').set(24, 8, 'W');
      nose(cv);
      // bigodinho de malandro
      cv.rect(16, 24, 3, 1, 'h').rect(21, 24, 3, 1, 'h');
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [13, 24], y: 18, browY: 16 }),
    lips: (cv, key) => {
      mouth(cv, key === 'idle' ? 'smug' : key, { y: 26 });
      // o dente de ouro no sorrisão
      if (key === 'idle' || key === 'smug') cv.set(21, 27, 'g');
    },
  },
);

// ---------------------------------------------------------------------------
// Dama Soró, a Rainha do Ponto Chic: cabelão armado roxo, sombra violeta e cílios longos,
// batom vermelho, pinta charmosa, brincos de argola e a estola de plumas cor-de-rosa.
// ---------------------------------------------------------------------------

export const SoroAvatar = makePortrait(
  'sr',
  {
    S: '#e8b494', s: '#f6ccb0', t: '#c48c6c', T: '#9a6648',
    h: '#7a2a7a', H: '#a84aa8', v: '#4a1a4a',
    e: '#7a4aaa', g: '#f0c040', G: '#b88a20',
    r: '#d8283a', R: '#ff5a6a',
    p: '#ff8fc8', P: '#ffc0e0', q: '#d0609a',
    c: '#2a0a20',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'c', 'c');
      cv.rect(15, 32, 10, 8, 'S').rect(17, 31, 6, 1, 'S');
      cv.shade('S', 't', (x) => x > 22);
      // cabelão armado por trás do rosto
      cv.ellipse(20, 11, 15, 10, 'h');
      cv.ellipse(20, 6, 11, 5, 'h');
      cv.rect(5, 12, 4, 14, 'h').rect(31, 12, 4, 14, 'h');
      head(cv);
      // franja volumosa e os cachos
      cv.ellipse(20, 10.5, 11, 4, 'h');
      cv.shade('h', 'H', (x, y) => (x < 17 && y < 12) || (y < 4 && x < 24));
      cv.shade('h', 'v', (x, y) => x > 30 || y > 22);
      cv.set(12, 13, 'H').set(13, 14, 'h').set(27, 13, 'h').set(28, 14, 'v');
      // sombra violeta em cima dos olhos
      cv.rect(13, 16, 4, 1, 'e').rect(24, 16, 4, 1, 'e');
      // brincos de argola
      cv.rect(7, 23, 2, 3, 'g').set(7, 25, 'G').rect(31, 23, 2, 3, 'G');
      // pinta charmosa
      cv.set(25, 24, 'k');
      nose(cv);
      // estola de plumas
      cv.ellipse(10, 35, 6, 4, 'p').ellipse(30, 35, 6, 4, 'p').ellipse(20, 38, 7, 2.5, 'p');
      cv.shade('p', 'P', (x, y) => (x + y) % 3 === 0);
      cv.shade('p', 'q', (x, y) => (x * 7 + y) % 5 === 0);
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => {
      eyes(cv, mood, { xs: [14, 24], y: 18, browY: 15, brow: 'v', lid: 'e' });
      // cílios longos
      if (mood !== 'hurt') cv.set(13, 17, 'k').set(17, 17, 'k').set(23, 17, 'k').set(27, 17, 'k');
    },
    lips: (cv, key) => {
      mouth(cv, key, { y: 26, lip: 'R' });
      // batom: o lábio de cima sempre vermelho
      if (key !== 'speak') cv.rect(17, 25, 6, 1, 'r');
      if (key === 'idle') cv.rect(17, 26, 6, 1, 'r').rect(18, 27, 4, 1, 'R').set(20, 26, 'm');
    },
  },
);

// ---------------------------------------------------------------------------
// Sargento Brandão, a Ronda Noturna: quepe azul-marinho com o distintivo dourado, bigodão,
// queixo quadrado, farda e o apito no cordão branco.
// ---------------------------------------------------------------------------

export const BrandaoAvatar = makePortrait(
  'bd',
  {
    S: '#c68e62', s: '#dca87c', t: '#a46e44', T: '#7a4e2c',
    h: '#2a1a10',
    c: '#1f2c45', C: '#2e4066', d: '#141d2e', e: '#0b0e16',
    g: '#e8c050', G: '#b8902a',
    u: '#2e4066', U: '#3e5585', x: '#1f2c45', w: '#e8e2d0',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'u', 'U', 'x');
      // gola e o cordão do apito
      cv.rect(15, 32, 3, 3, 'x').rect(22, 32, 3, 3, 'x');
      cv.line(17, 33, 13, 38, 'w').line(13, 38, 11, 39, 'w');
      cv.rect(10, 38, 3, 2, 'g').set(12, 39, 'G');
      // dragona e o botão
      cv.rect(6, 34, 5, 1, 'g').rect(29, 34, 5, 1, 'G');
      cv.set(20, 36, 'g').set(20, 38, 'g');
      head(cv, { jaw: 'square' });
      // quepe: copa, faixa e a pala brilhando
      cv.ellipse(20, 7.5, 11.5, 4.5, 'c');
      cv.rect(9, 7, 22, 4, 'c');
      cv.rect(9, 10, 22, 2, 'd');
      cv.rect(8, 12, 24, 2, 'e').rect(11, 12, 8, 1, 'C');
      cv.shade('c', 'C', (x, y) => x < 16 && y < 8);
      cv.rect(18, 6, 4, 4, 'g').set(19, 7, 'G').set(20, 8, 'G');
      nose(cv, { big: true });
      // bigodão
      cv.rect(14, 24, 12, 2, 'h').rect(13, 25, 2, 2, 'h').rect(25, 25, 2, 2, 'h');
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood === 'smug' ? 'smug' : mood, { xs: [13, 24], y: 18, browY: 16, thick: 2 }),
    lips: (cv, key) => mouth(cv, key, { y: 27, x: 17, w: 6 }),
  },
);

// ---------------------------------------------------------------------------
// Dona Odete, a Agiota do Beco Escuro: velhinha de coque grisalho, óculos gatinho com a
// correntinha dourada, xale roxo de crochê, colar de pérolas e os lábios finos.
// ---------------------------------------------------------------------------

export const OdeteAvatar = makePortrait(
  'od',
  {
    S: '#dcb092', s: '#ecc8ae', t: '#b88a6c', T: '#8e644a',
    h: '#b8b4ac', H: '#dedad2', v: '#8a867e',
    g: '#7a1f4a', G: '#e8c050', w: '#f4f0e4',
    c: '#4a1f4a', C: '#6a2f6a', d: '#2c0f2c',
    r: '#9a3a4a', R: '#c25a6a',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'C', 'd');
      // renda do xale e o colar de pérolas
      for (let x = 7; x < 34; x += 2) cv.set(x, 34 + (x % 4 === 1 ? 1 : 0), 'w');
      for (let x = 15; x <= 25; x += 2) cv.set(x, x < 20 ? 32 + Math.floor((x - 15) / 2) : 32 + Math.floor((25 - x) / 2), 'w');
      head(cv, { rx: 10.5 });
      // rugas
      cv.set(12, 23, 't').set(13, 24, 't').set(27, 23, 't').set(26, 24, 't').rect(16, 14, 8, 1, 't');
      // cabelo grisalho preso e o coque no alto
      cv.ellipse(20, 10.5, 11, 4.5, 'h');
      cv.rect(9, 11, 2, 7, 'h').rect(29, 11, 2, 7, 'h');
      cv.disc(20, 4.5, 3.6, 'h');
      cv.shade('h', 'H', (x, y) => x < 17 && y < 12);
      cv.shade('h', 'v', (x) => x > 26);
      cv.set(20, 8, 'v').set(21, 8, 'v').rect(18, 2, 4, 1, 'H');
      // óculos gatinho: as pontas subindo e a correntinha caindo nos ombros
      for (const x of [12, 23]) cv.rect(x, 17, 6, 1, 'g').rect(x, 21, 6, 1, 'g').rect(x, 18, 1, 3, 'g').rect(x + 5, 18, 1, 3, 'g');
      cv.set(11, 16, 'g').set(29, 16, 'g').set(28, 17, 'g').rect(18, 18, 5, 1, 'g');
      cv.line(10, 19, 9, 31, 'G').line(30, 19, 31, 31, 'G');
      // a pinta e os brincos de pérola
      cv.set(14, 25, 'T');
      cv.set(8, 23, 'w').set(31, 23, 'w');
      nose(cv);
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [14, 24], y: 18, browY: 15, brow: 'v' }),
    lips: (cv, key) => {
      mouth(cv, key, { y: 26, x: 17, w: 6, lip: 'R' });
      if (key === 'idle') cv.rect(17, 26, 6, 1, 'r');
    },
  },
);

// ---------------------------------------------------------------------------
// Valtinho Renegado, o Ex-Sócio do Balcão: o bigodão e o palito do Valtinho do Bar, mas de
// jaqueta de couro, óculos escuros no topo da cabeça, cicatriz na sobrancelha e brinco de ouro.
// ---------------------------------------------------------------------------

export const ValtinhoRenegadoAvatar = makePortrait(
  'vr',
  {
    S: '#d9a477', s: '#ecbd8f', t: '#a8714a', T: '#7e5232',
    h: '#1c1410', H: '#4a3a30', u: '#a08c7a',
    e: '#1a1a1a', E: '#4a4a52',
    c: '#2a1a12', C: '#4a3022', d: '#140c08',
    w: '#ece6da', p: '#e3c58c', g: '#f0c040', x: '#a8514a',
  },
  {
    base() {
      const cv = pixelCanvas(40, 40);
      backdrop(cv);
      shoulders(cv, 'c', 'C', 'd');
      // regata por baixo e a gola da jaqueta
      cv.rect(16, 32, 8, 8, 'w');
      cv.line(15, 32, 17, 39, 'C').line(24, 32, 22, 39, 'd');
      cv.rect(12, 31, 4, 3, 'C').rect(24, 31, 4, 3, 'd');
      cv.set(27, 37, 'E').set(27, 38, 'E');
      head(cv, { jaw: 'square' });
      // cabelo penteado para trás e as costeletas
      cv.ellipse(20, 9.5, 11, 5, 'h');
      cv.rect(9, 10, 2, 8, 'h').rect(29, 10, 2, 8, 'h');
      cv.line(13, 6, 25, 5, 'H');
      // óculos escuros no topo da cabeça
      cv.rect(12, 8, 6, 2, 'e').rect(22, 8, 6, 2, 'e').rect(18, 8, 4, 1, 'e').set(13, 8, 'E').set(23, 8, 'E');
      // barba por fazer e a cicatriz na sobrancelha
      cv.shade('S', 'u', (x, y) => y >= 26 && y <= 30 && x >= 12 && x <= 28);
      cv.line(25, 14, 27, 20, 'x');
      // brinco de ouro
      cv.set(32, 22, 'g');
      nose(cv, { big: true });
      // o bigodão caído do Valtinho
      cv.rect(14, 24, 12, 2, 'h').rect(13, 25, 2, 3, 'h').rect(25, 25, 2, 3, 'h').rect(16, 24, 4, 1, 'H');
      cv.outline('k');
      return cv.rows();
    },
    face: (cv, mood) => eyes(cv, mood, { xs: [13, 24], y: 18, browY: 16, thick: 2 }),
    lips: (cv, key) => {
      mouth(cv, key, { y: 27, x: 17, w: 6 });
      // o palito no canto da boca (menos falando)
      if (key !== 'speak') cv.line(23, 27, 29, 25, 'p');
    },
  },
);
