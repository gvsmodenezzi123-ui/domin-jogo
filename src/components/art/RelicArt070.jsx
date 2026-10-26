// src/components/art/RelicArt070.jsx
// Patch 0.7.0: os 20 talismãs novos (40x40) e o troféu do aviso de conquista.
// Desenhados com pixelCanvas.js e convertidos em <rect>s uma vez só.
import { PixelSvg } from './PixelSvg.jsx';
import { mapToRects, pixelCanvas } from './pixelCanvas.js';

const K = '#0b0705';

/** Componente de ícone 40x40 a partir de um desenho e da paleta. */
function makeIcon(draw, palette, key) {
  const rects = mapToRects(draw(), palette, key);
  function Icon({ className = 'w-6 h-6' }) {
    return <PixelSvg className={className}>{rects}</PixelSvg>;
  }
  return Icon;
}

// --- Comuns ---------------------------------------------------------------

/** Palito de dente usado: atravessado, com a ponta mordida. */
export const PalitoDenteIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(6, 33, 33, 6, 'w', 3);
    c.line(7, 32, 32, 7, 'W', 1);
    c.line(6, 33, 9, 30, 'd', 3);
    c.set(33, 6, 'd').set(34, 5, 'd');
    for (const [x, y] of [[14, 22], [20, 17], [26, 11]]) c.set(x, y, 'd');
    c.outline('k');
    return c.rows();
  },
  { k: K, w: '#d9b07a', W: '#f5dcae', d: '#8a6236' },
  'pl',
);

/** Moeda furada: cobre gasto com o furo no meio. */
export const MoedaFuradaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.disc(20, 20, 14, 'y');
    c.disc(20, 20, 11, 'Y');
    c.shade('Y', 'o', (x, y) => x + y > 44);
    c.disc(20, 20, 4, '.');
    c.disc(15, 14, 2, 'W');
    for (let a = 0; a < 12; a += 1) {
      const x = Math.round(20 + Math.cos((a / 12) * Math.PI * 2) * 13);
      const y = Math.round(20 + Math.sin((a / 12) * Math.PI * 2) * 13);
      c.set(x, y, 'o');
    }
    c.outline('k');
    return c.rows();
  },
  { k: K, y: '#b87333', Y: '#d99a5a', o: '#7a4a1e', W: '#ffd8a8' },
  'mf',
);

/** Pano de chão úmido: pano cinza dobrado pingando. */
export const PanoChaoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    for (let y = 8; y < 30; y += 1) {
      const wave = Math.round(Math.sin(y / 3) * 2);
      c.rect(7 + wave, y, 26, 1, 'g');
    }
    c.shade('g', 'G', (x, y) => y < 14);
    c.shade('g', 'd', (x, y) => y > 25);
    for (let y = 11; y < 28; y += 5) c.rect(9, y, 22, 1, 'd');
    c.rect(12, 31, 2, 3, 'b').rect(20, 32, 2, 4, 'b').rect(27, 31, 2, 3, 'b');
    c.set(20, 36, 'B').set(12, 34, 'B');
    c.outline('k');
    return c.rows();
  },
  { k: K, g: '#8b98a3', G: '#b5c1ca', d: '#5d6973', b: '#4a8fd9', B: '#a8d4ff' },
  'pc',
);

/** Tampa de garrafa amassada: coroa dentada, vermelha, torta. */
export const TampaGarrafaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.ellipse(20, 22, 14, 11, 'r');
    for (let a = 0; a < 16; a += 1) {
      const x = Math.round(20 + Math.cos((a / 16) * Math.PI * 2) * 15);
      const y = Math.round(22 + Math.sin((a / 16) * Math.PI * 2) * 12);
      c.rect(x - 1, y - 1, 2, 2, 'r');
    }
    c.ellipse(20, 21, 9, 7, 'R');
    c.line(13, 18, 26, 25, 'd', 2);
    c.ellipse(17, 18, 3, 2, 'W');
    c.outline('k');
    return c.rows();
  },
  { k: K, r: '#b3201c', R: '#d94a3a', d: '#6e100c', W: '#ffd0c4' },
  'tg',
);

/** Rádio de pilha chiando: caixinha com grade, antena e o chiado. */
export const RadioPilhaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(27, 13, 34, 3, 'm', 1);
    c.rect(6, 13, 28, 20, 'c');
    c.rect(6, 13, 28, 2, 'C');
    for (let y = 17; y < 30; y += 2) c.rect(9, y, 13, 1, 'g');
    c.disc(28, 21, 3, 'y');
    c.rect(25, 27, 6, 2, 'g');
    for (const [x, y] of [[2, 8], [3, 6], [37, 12], [36, 9], [1, 11]]) c.set(x, y, 'w');
    c.outline('k');
    return c.rows();
  },
  { k: K, c: '#2f5a3a', C: '#4f8a5a', g: '#16261a', y: '#e8b84a', m: '#c9cfd4', w: '#fff4cf' },
  'rp',
);

/** Fósforo riscado: palito com a cabeça queimada e a fumaça subindo. */
export const FosforoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(10, 35, 25, 14, 'w', 3);
    c.line(11, 34, 25, 15, 'W', 1);
    c.disc(27, 11, 4, 'b');
    c.set(26, 9, 'B');
    c.line(29, 7, 31, 3, 's').line(31, 3, 29, 1, 's');
    c.set(33, 5, 's').set(34, 3, 's');
    c.outline('k');
    return c.rows();
  },
  { k: K, w: '#e6c48a', W: '#fff0c8', b: '#2a1810', B: '#6e4a30', s: '#9aa1a8' },
  'fs',
);

// --- Raros ----------------------------------------------------------------

/** Óculos fundo de garrafa: lentes grossas com o redemoinho. */
export const OculosFundoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    for (const cx of [12, 28]) {
      c.disc(cx, 21, 8, 'f');
      c.disc(cx, 21, 6, 'l');
      c.disc(cx, 21, 4, 'L');
      c.disc(cx, 21, 2, 'l');
      c.set(cx - 3, 18, 'W');
    }
    c.rect(19, 19, 2, 2, 'f');
    c.line(4, 19, 1, 15, 'f', 2).line(36, 19, 39, 15, 'f', 2);
    c.outline('k');
    return c.rows();
  },
  { k: K, f: '#3a2a1a', l: '#9fd3e6', L: '#5fa8c4', W: '#ffffff' },
  'oc',
);

/** Canivete suíço enferrujado: cabo vermelho com a cruz e a lâmina aberta. */
export const CaniveteIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(6, 22, 22, 9, 'r');
    c.rect(6, 22, 22, 2, 'R');
    c.rect(15, 24, 4, 5, 'w').rect(13, 25, 8, 3, 'w');
    // a lâmina aberta sai da ponta direita do cabo, em diagonal
    const edge = (x) => 21 - Math.round((x - 24) * 0.7);
    for (let i = 0; i < 14; i += 1) c.rect(24 + i, edge(24 + i), 1, i < 10 ? 4 : Math.max(1, 13 - i), 'm');
    c.shade('m', 'M', (x, y) => y === edge(x));
    c.set(30, 18, 'o').set(27, 20, 'o').set(33, 16, 'o').set(9, 29, 'o');
    c.outline('k');
    return c.rows();
  },
  { k: K, r: '#c8261d', R: '#ff6a5a', w: '#ffffff', m: '#a7adb3', M: '#e1e5e8', o: '#a0522d' },
  'cv',
);

/** Baralho de truco marcado: leque de cartas com a ponta dobrada. */
export const TrucoMarcadoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(6, 10, 15, 22, 'w');
    c.rect(13, 8, 15, 22, 'W');
    c.rect(20, 6, 15, 22, 'w');
    c.rect(22, 9, 3, 3, 'r').rect(23, 13, 1, 3, 'r');
    c.rect(29, 21, 3, 3, 'b');
    c.rect(31, 6, 4, 4, 'd');
    c.set(31, 6, '.').set(34, 9, 'm');
    c.rect(8, 27, 3, 3, 'b');
    c.outline('k');
    return c.rows();
  },
  { k: K, w: '#efe4c4', W: '#fffaf0', r: '#c8261d', b: '#1a1a24', d: '#c9b88a', m: '#c8261d' },
  'tm',
);

/** Abridor de lata cego: cabo de metal com o gancho torto. */
export const AbridorLataIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(8, 32, 26, 14, 'm', 4);
    c.line(9, 31, 26, 14, 'M', 1);
    c.rect(24, 8, 6, 8, 'm');
    c.rect(29, 6, 5, 3, 'm');
    c.set(33, 9, 'm').set(33, 10, 'm');
    c.disc(11, 29, 2, 'd');
    c.set(27, 11, 'o').set(15, 25, 'o');
    c.outline('k');
    return c.rows();
  },
  { k: K, m: '#8d949a', M: '#e1e5e8', d: '#2f3439', o: '#a0522d' },
  'al',
);

/** Nota de 3 reais: cédula verde com o 3. */
export const NotaTresIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(4, 11, 32, 18, 'g');
    c.rect(6, 13, 28, 14, 'G');
    c.disc(20, 20, 5, 'g');
    // o 3
    c.rect(18, 17, 4, 1, 'd').rect(21, 18, 1, 2, 'd').rect(19, 20, 3, 1, 'd').rect(21, 21, 1, 2, 'd').rect(18, 23, 4, 1, 'd');
    c.rect(8, 15, 3, 3, 'd').rect(29, 22, 3, 3, 'd');
    c.line(4, 11, 7, 14, 'W');
    c.outline('k');
    return c.rows();
  },
  { k: K, g: '#5a8f4a', G: '#9fd08a', d: '#1f3d17', W: '#e8ffd8' },
  'n3',
);

// --- Lendários -------------------------------------------------------------

/** Fita crepe do gambiarra: rolo bege com a ponta solta. */
export const FitaCrepeIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.disc(18, 20, 13, 't');
    c.disc(18, 20, 9, 'T');
    c.disc(18, 20, 6, '.');
    c.shade('t', 'd', (x, y) => x + y > 44);
    c.rect(28, 25, 9, 6, 't');
    c.set(37, 25, '.').set(36, 30, '.');
    c.disc(13, 14, 2, 'W');
    c.outline('k');
    return c.rows();
  },
  { k: K, t: '#d9c48a', T: '#b89f62', d: '#8f7a42', W: '#fff4cf' },
  'fc',
);

/** Balança de açougue: mostrador redondo com o ponteiro torto e o prato. */
export const BalancaAcougueIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(18, 28, 4, 5, 'r');
    c.ellipse(20, 34, 13, 3, 'm');
    c.disc(20, 16, 12, 'r');
    c.disc(20, 16, 9, 'w');
    for (let a = 0; a < 8; a += 1) {
      const x = Math.round(20 + Math.cos((a / 8) * Math.PI * 2) * 8);
      const y = Math.round(16 + Math.sin((a / 8) * Math.PI * 2) * 8);
      c.set(x, y, 'k');
    }
    c.line(20, 16, 25, 10, 'p', 1);
    c.set(20, 16, 'k');
    c.outline('k');
    return c.rows();
  },
  { k: K, r: '#b3201c', w: '#f4ecd2', m: '#a7adb3', p: '#c8261d' },
  'ba',
);

/** Relógio de parede do bar: redondo, de madeira, com o pêndulo. */
export const RelogioParedeIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(18, 24, 4, 10, 'w');
    c.disc(20, 34, 3, 'y');
    c.disc(20, 15, 12, 'w');
    c.disc(20, 15, 9, 'f');
    for (let a = 0; a < 12; a += 1) {
      const x = Math.round(20 + Math.cos((a / 12) * Math.PI * 2) * 7);
      const y = Math.round(15 + Math.sin((a / 12) * Math.PI * 2) * 7);
      c.set(x, y, 'k');
    }
    c.line(20, 15, 20, 9, 'k').line(20, 15, 24, 17, 'k');
    c.outline('k');
    return c.rows();
  },
  { k: K, w: '#6a4122', f: '#f4ecd2', y: '#e8b84a' },
  'rw',
);

// --- Necróticos -------------------------------------------------------------

/** Cálice de sangue de galo: taça de latão com sangue e uma pena. */
export const CaliceGaloIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.ellipse(20, 12, 11, 4, 'g');
    for (let y = 12; y < 22; y += 1) c.rect(20 - Math.round(11 - (y - 12) * 0.8), y, Math.round(22 - (y - 12) * 1.6), 1, 'g');
    c.ellipse(20, 12, 9, 2.6, 'r');
    c.rect(19, 22, 3, 8, 'g');
    c.ellipse(20, 32, 8, 2.5, 'g');
    c.shade('g', 'G', (x) => x < 16);
    c.line(30, 4, 34, 14, 'f', 2).line(31, 5, 33, 11, 'F');
    c.set(15, 16, 'r').set(15, 17, 'r');
    c.outline('k');
    return c.rows();
  },
  { k: K, g: '#b38a3a', G: '#e8c06a', r: '#8a0f14', f: '#2a2a2a', F: '#6e5a8a' },
  'cg',
);

/** Dedo de cadáver amarrado: dedo pálido com a unha roxa e o barbante. */
export const DedoCadaverIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(10, 32, 28, 10, 's', 6);
    c.shade('s', 'S', (x, y) => x + y < 36);
    c.disc(29, 9, 3, 'n');
    c.line(12, 21, 20, 29, 'b', 1).line(13, 20, 21, 28, 'b', 1);
    c.line(20, 29, 22, 35, 'b').line(21, 28, 26, 33, 'b');
    c.set(18, 22, 'd').set(21, 19, 'd');
    c.outline('k');
    return c.rows();
  },
  { k: K, s: '#c9c7b0', S: '#e8e6d0', n: '#5a3a6a', b: '#a0522d', d: '#7a786a' },
  'dc',
);

/** Testamento rasgado: papel velho rasgado ao meio com o lacre. */
export const TestamentoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(6, 6, 13, 28, 'p');
    c.rect(21, 8, 13, 28, 'p');
    for (let y = 6; y < 34; y += 3) c.set(18, y, '.').set(21, y + 2, '.');
    c.shade('p', 'P', (x, y) => y < 10);
    for (let y = 11; y < 30; y += 3) {
      c.rect(8, y, 9, 1, 'i');
      c.rect(23, y + 2, 9, 1, 'i');
    }
    c.disc(27, 30, 4, 'r');
    c.set(26, 29, 'R');
    c.outline('k');
    return c.rows();
  },
  { k: K, p: '#e8d8a8', P: '#fff4d6', i: '#6a5a3a', r: '#a3121b', R: '#e0434c' },
  'tt',
);

/** Dado de osso humano: dado amarelado, rachado, com pips escuros. */
export const DadoOssoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(8, 8, 24, 24, 'b');
    c.rect(8, 8, 24, 2, 'B');
    c.shade('b', 's', (x, y) => x > 28 || y > 28);
    for (const [x, y] of [[13, 13], [25, 13], [13, 19], [25, 19], [13, 25], [25, 25]]) c.rect(x, y, 3, 3, 'p');
    c.line(16, 8, 19, 15, 'd').line(19, 15, 17, 20, 'd');
    c.outline('k');
    return c.rows();
  },
  { k: K, b: '#e8dcb8', B: '#fffaf0', s: '#b9a77a', p: '#2a1010', d: '#8a7a5a' },
  'do',
);

// --- Troféu do aviso de conquista ---------------------------------------------

/** Troféu dourado de conquista (40x40). */
export const TrophyIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // alças
    c.ellipse(9, 12, 4, 5, 'g').ellipse(9, 12, 2, 3, '.');
    c.ellipse(31, 12, 4, 5, 'g').ellipse(31, 12, 2, 3, '.');
    // taça
    c.rect(10, 5, 20, 3, 'g');
    for (let y = 8; y < 21; y += 1) c.rect(20 - Math.round(10 - (y - 8) * 0.55), y, Math.round(20 - (y - 8) * 1.1), 1, 'g');
    c.rect(18, 21, 4, 6, 'g');
    c.rect(13, 27, 14, 3, 'g');
    c.rect(11, 30, 18, 5, 'd');
    c.rect(15, 31, 10, 3, 'y');
    c.shade('g', 'G', (x, y) => x < 17 && y < 20);
    c.shade('g', 'o', (x) => x > 25);
    c.rect(15, 8, 2, 7, 'W');
    c.outline('k');
    return c.rows();
  },
  { k: K, g: '#e8b84a', G: '#fff0b0', o: '#a8761c', d: '#5a3a1a', y: '#c9a050', W: '#ffffff' },
  'tr',
);
