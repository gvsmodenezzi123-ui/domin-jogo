// src/components/art/RelicArt140.jsx
// Versão 1.4: os 18 talismãs novos (40x40), no mesmo jeito dos do Patch 0.7.0: desenhados com
// pixelCanvas.js (luz de cima à esquerda, contorno escuro) e convertidos em <rect>s uma vez só.
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

/** Pires de aperitivo: pires branco de borda azul com amendoins e uma azeitona. */
export const PiresIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.ellipse(20, 26, 16, 7, 'b');
    c.ellipse(20, 25.5, 14.5, 6, 'w');
    c.ellipse(20, 25, 9, 3.6, 'W');
    c.shade('w', 'g', (x, y) => x > 28 || y > 29);
    // amendoins
    for (const [x, y] of [[13, 21], [18, 19], [23, 21], [16, 23]]) c.ellipse(x, y, 2.6, 1.6, 'a').set(x - 1, y - 1, 'A');
    // azeitona com o palito
    c.disc(26, 21, 2.5, 'o').set(25, 20, 'O');
    c.line(27, 20, 31, 12, 'p');
    c.outline('k');
    return c.rows();
  },
  { k: K, b: '#3a6aa8', w: '#f2ede0', W: '#e2dccb', g: '#bdb6a4', a: '#c8894a', A: '#e8b070', o: '#4a5a1a', O: '#8a9a3a', p: '#e3c58c' },
  'pi',
);

/** Gilete: a lâmina de barbear prateada, com o furo no meio e um fio de luz. */
export const GileteIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(7, 13, 26, 14, 's');
    c.rect(6, 15, 1, 10, 's').rect(33, 15, 1, 10, 's');
    c.shade('s', 'S', (x, y) => y > 22 || x > 28);
    c.shade('s', 'W', (x, y) => y < 15);
    // o furo recortado no meio
    c.rect(12, 19, 16, 2, '.').rect(11, 18, 3, 4, '.').rect(26, 18, 3, 4, '.').rect(19, 17, 2, 6, '.');
    // o fio cortante brilhando
    c.line(8, 13, 32, 13, 'W').line(8, 26, 32, 26, 'S');
    c.set(10, 14, 'w').set(11, 14, 'w');
    c.outline('k');
    return c.rows();
  },
  { k: K, s: '#b4bcc4', S: '#7d858d', W: '#e8eef2', w: '#ffffff' },
  'gi',
);

/** Bicarbonato de sódio: o pacotinho branco de listra azul, com o pozinho e as bolhas. */
export const BicarbonatoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(11, 9, 18, 24, 'w');
    c.rect(12, 8, 16, 1, 'w');
    c.shade('w', 'g', (x) => x > 24);
    c.rect(11, 15, 18, 6, 'b').rect(11, 20, 18, 1, 'B');
    c.rect(14, 17, 3, 2, 'w').rect(18, 17, 2, 2, 'w').rect(21, 17, 4, 2, 'w');
    // dobra do pacote e o pó caindo
    c.line(11, 11, 28, 11, 'g');
    for (const [x, y] of [[30, 30], [32, 27], [31, 33], [34, 31]]) c.disc(x, y, 1.2, 'W');
    c.rect(12, 33, 16, 1, 'g');
    c.outline('k');
    return c.rows();
  },
  { k: K, w: '#f4f2ea', g: '#c8c4b4', b: '#2a6ad8', B: '#1a4a9a', W: '#e8f2ff' },
  'bi',
);

/** Cofrinho de barro: o porquinho de barro com a fenda da moeda e a moeda entrando. */
export const CofrinhoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.ellipse(19, 24, 13, 9, 'b');
    c.ellipse(31, 23, 4, 3.5, 'b');
    c.rect(10, 31, 3, 4, 'b').rect(24, 31, 3, 4, 'b');
    c.shade('b', 'B', (x, y) => y > 28 || x > 28);
    c.shade('b', 'h', (x, y) => x + y < 32 && y < 22);
    // focinho, olho e a orelha
    c.ellipse(33, 23.5, 2, 2, 'p').set(33, 23, 'B').set(34, 24, 'B');
    c.set(27, 20, 'k');
    c.rect(24, 14, 3, 3, 'b').set(25, 15, 'B');
    // a fenda e a moeda entrando
    c.rect(15, 15, 6, 1, 'k');
    c.ellipse(18, 10, 4, 3.5, 'y').rect(16, 9, 4, 1, 'Y');
    // rabinho enrolado
    c.set(5, 22, 'B').set(5, 21, 'B').set(6, 20, 'B');
    c.outline('k');
    return c.rows();
  },
  { k: K, b: '#c8784a', B: '#94522c', h: '#e8a070', p: '#e89a8a', y: '#f0c040', Y: '#fff0a0' },
  'cf',
);

/** Prego enferrujado: atravessado, cabeça larga e a ferrugem comendo a ponta. */
export const PregoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(11, 29, 31, 9, 'g', 3);
    c.line(12, 29, 31, 10, 'G', 1);
    // cabeça
    c.line(26, 6, 34, 14, 'g', 3);
    c.line(27, 6, 35, 14, 'w', 1);
    // ponta afinando
    c.line(8, 32, 11, 29, 'g', 2).set(7, 34, 'g');
    // ferrugem
    for (const [x, y] of [[12, 28], [14, 26], [17, 23], [15, 27], [20, 20], [9, 32], [13, 29]]) c.set(x, y, 'r').set(x + 1, y, 'R');
    c.outline('k');
    return c.rows();
  },
  { k: K, g: '#8d949c', G: '#5d646b', w: '#c8d0d8', r: '#a8542a', R: '#7a3418' },
  'pr',
);

/** Pé de coelho sarnento: o chaveiro de pé de coelho, pelo falhado e a argola. */
export const PeCoelhoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // argola e a correntinha
    c.disc(27, 8, 4, 'g').disc(27, 8, 2.4, '.');
    c.line(25, 11, 22, 15, 'g');
    // a pata, de pelo bege, com as falhas da sarna
    c.ellipse(18, 25, 7, 11, 'f');
    c.ellipse(15, 34, 6, 3, 'f');
    c.shade('f', 'F', (x, y) => x > 21 || y > 33);
    c.shade('f', 'w', (x, y) => x < 15 && y < 24);
    for (const [x, y] of [[19, 20], [16, 27], [21, 30], [14, 22]]) c.rect(x, y, 2, 2, 'p');
    // a capinha de metal onde prende
    c.rect(18, 14, 8, 3, 'g').rect(18, 16, 8, 1, 'G');
    c.outline('k');
    return c.rows();
  },
  { k: K, f: '#d8c098', F: '#a88e66', w: '#f2e4c4', p: '#d88a7a', g: '#b4bcc4', G: '#7d858d' },
  'pc',
);

// --- Raros ----------------------------------------------------------------

/** Grampo de cabelo: o grampo preto ondulado, com um brilho no metal. */
export const GrampoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // perna reta e a perna ondulada, unidas na curva de cima
    c.line(13, 8, 13, 33, 'd', 2);
    for (let y = 8; y < 34; y += 1) c.rect(24 + Math.round(Math.sin(y / 2.2) * 2), y, 2, 1, 'd');
    c.ellipse(19, 7, 6.5, 3.5, 'd');
    c.ellipse(19, 7.5, 4, 1.8, '.');
    c.rect(13, 33, 2, 2, 'b').rect(24, 33, 2, 2, 'b');
    c.line(13, 10, 13, 20, 'h');
    c.set(17, 4, 'h').set(18, 4, 'h');
    c.outline('k');
    return c.rows();
  },
  { k: K, d: '#3a3440', h: '#8a8494', b: '#1a161e' },
  'gp',
);

/** Espátula de gordura: a lâmina de metal engordurada e o cabo de madeira. */
export const EspatulaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(8, 7, 16, 13, 's');
    c.shade('s', 'S', (x, y) => x > 20 || y > 17);
    c.shade('s', 'w', (x, y) => y < 9 && x < 16);
    for (let x = 10; x < 23; x += 3) c.line(x, 9, x, 17, 'S');
    // gordura escorrendo
    c.rect(9, 19, 3, 2, 'y').rect(15, 19, 2, 3, 'y').set(15, 22, 'Y').rect(20, 19, 2, 2, 'y');
    // pescoço e o cabo
    c.rect(15, 20, 2, 4, 'S');
    c.line(16, 24, 30, 34, 'n', 3);
    c.line(17, 24, 31, 34, 'N');
    c.set(26, 30, 'b').set(28, 32, 'b');
    c.outline('k');
    return c.rows();
  },
  { k: K, s: '#b4bcc4', S: '#7d858d', w: '#e8eef2', y: '#f0d070', Y: '#c8a040', n: '#9a6a3a', N: '#6a4422', b: '#d8b070' },
  'ep',
);

/** Taco de sinuca lascado: o taco na diagonal, a ponta azul de giz e a lasca na madeira. */
export const TacoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(6, 35, 32, 9, 'n', 3);
    c.line(7, 35, 32, 10, 'N', 1);
    c.line(4, 37, 12, 29, 'd', 4);
    // ponteira e o giz azul
    c.line(32, 9, 34, 7, 'w', 2);
    c.rect(34, 5, 2, 2, 'b');
    // a lasca
    c.rect(20, 20, 3, 2, '.').set(23, 19, '.').set(19, 22, 'N');
    c.outline('k');
    return c.rows();
  },
  { k: K, n: '#d8a868', N: '#a87840', d: '#4a2a14', w: '#f4ecd2', b: '#3a7ad8' },
  'tc',
);

/** Óleo de máquina Singer: a almotolia vermelha de bico comprido, pingando. */
export const OleoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.ellipse(16, 27, 9, 7, 'r');
    c.rect(9, 27, 15, 6, 'r');
    c.ellipse(16, 33, 7.5, 2, 'R');
    c.shade('r', 'h', (x, y) => x < 13 && y < 28);
    c.shade('r', 'R', (x) => x > 21);
    c.rect(10, 26, 12, 2, 'y').set(10, 27, 'Y');
    // tampa e o bico comprido
    c.rect(13, 19, 6, 2, 'g').rect(15, 18, 2, 1, 'g');
    c.line(17, 20, 33, 8, 'g', 2);
    c.line(17, 19, 33, 7, 'w');
    // a gota
    c.disc(34, 12, 1.4, 'o').set(34, 14, 'o');
    c.outline('k');
    return c.rows();
  },
  { k: K, r: '#c8283a', R: '#8a1a24', h: '#f05a6a', y: '#e8c050', Y: '#a8862a', g: '#b4bcc4', w: '#e8eef2', o: '#d8a838' },
  'ol',
);

/** Pacote de tremoço: o saquinho de papel aberto com os tremoços amarelos. */
export const PacoteTremocoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(10, 14, 20, 21, 'p');
    c.line(10, 14, 13, 11, 'p').line(29, 14, 27, 11, 'p').rect(13, 11, 14, 3, 'P');
    c.shade('p', 'q', (x) => x > 25);
    c.rect(12, 24, 16, 5, 'r').rect(14, 25, 3, 3, 'y').rect(19, 25, 3, 3, 'y').rect(24, 25, 2, 3, 'y');
    // os tremoços saindo pela boca do saco
    for (const [x, y] of [[15, 11], [20, 9], [25, 11], [18, 13], [23, 13], [21, 6]]) c.ellipse(x, y, 2.4, 2, 'y').set(x - 1, y - 1, 'Y');
    c.outline('k');
    return c.rows();
  },
  { k: K, p: '#d8b07a', P: '#b8905a', q: '#a87e4c', r: '#c8322a', y: '#f0d050', Y: '#fff2a8' },
  'pt',
);

/** Cadeado enferrujado: o cadeado de portão, a alça de aço e a ferrugem escorrendo. */
export const CadeadoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // alça
    c.ellipse(20, 14, 8, 9, 'g');
    c.ellipse(20, 14, 5, 6.5, '.');
    c.rect(11, 14, 18, 6, '.');
    c.rect(12, 14, 3, 6, 'g').rect(25, 14, 3, 6, 'G');
    // corpo de latão
    c.rect(8, 19, 24, 16, 'y');
    c.shade('y', 'Y', (x, y) => x > 26 || y > 32);
    c.shade('y', 'h', (x, y) => x < 12 && y < 25);
    // fechadura
    c.disc(20, 25, 2.2, 'k');
    c.rect(19, 26, 2, 4, 'k');
    // ferrugem
    for (const [x, y] of [[10, 33], [11, 32], [28, 21], [29, 22], [15, 34], [26, 33]]) c.set(x, y, 'r');
    c.outline('k');
    return c.rows();
  },
  { k: K, g: '#b4bcc4', G: '#7d858d', y: '#c8a24a', Y: '#8a6a2a', h: '#f0d488', r: '#a8542a' },
  'cd',
);

// --- Lendários ------------------------------------------------------------

/** Chapa de fogão a lenha: o disco de ferro com os anéis e a brasa no meio. */
export const ChapaFogaoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.disc(20, 20, 15, 'i');
    c.disc(20, 20, 11, 'I');
    c.disc(20, 20, 7, 'i');
    c.disc(20, 20, 4, 'o');
    c.disc(20, 20, 2, 'y');
    c.shade('i', 'h', (x, y) => x + y < 24);
    c.shade('I', 'h', (x, y) => x + y < 26);
    // calor subindo
    for (const [x, y] of [[13, 6], [20, 4], [27, 6]]) c.set(x, y, 'o').set(x + 1, y - 1, 'o').set(x, y - 2, 'y');
    c.outline('k');
    return c.rows();
  },
  { k: K, i: '#3a3440', I: '#26222a', h: '#6a6470', o: '#ff5a1a', y: '#ffd27a' },
  'cf',
);

/** Lupa de joalheiro: a lente redonda de aro de latão e o cabo, com o reflexo no vidro. */
export const LupaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.line(25, 25, 34, 34, 'n', 4);
    c.line(26, 25, 35, 34, 'N');
    c.disc(17, 17, 12, 'y');
    c.disc(17, 17, 9.5, 'l');
    c.shade('y', 'Y', (x, y) => x + y > 36);
    c.shade('l', 'L', (x, y) => x + y > 38);
    c.line(11, 14, 15, 10, 'w').line(12, 16, 13, 15, 'w');
    // um pip aumentado do outro lado da lente
    c.disc(19, 19, 2.6, 'k');
    c.outline('k');
    return c.rows();
  },
  { k: K, n: '#3a2a1e', N: '#6a4a32', y: '#d8a84a', Y: '#8a6a2a', l: '#9ad0e0', L: '#6aa0b4', w: '#ffffff' },
  'lu',
);

/** Caneta de lotérica azul: a caneta azul na diagonal riscando o volante. */
export const CanetaLotericaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // o volante (grade de números)
    c.rect(5, 18, 24, 18, 'w');
    c.shade('w', 'g', (x, y) => x > 25 || y > 33);
    for (let y = 21; y < 34; y += 3) for (let x = 8; x < 27; x += 4) c.rect(x, y, 2, 1, 'r');
    c.rect(12, 24, 2, 1, 'b').rect(20, 27, 2, 1, 'b').rect(8, 30, 2, 1, 'b');
    // a caneta
    c.line(14, 26, 33, 7, 'b', 3);
    c.line(15, 26, 33, 8, 'B');
    c.line(12, 28, 14, 26, 'w', 2).set(11, 29, 'k');
    c.rect(32, 5, 3, 3, 'd');
    c.outline('k');
    return c.rows();
  },
  { k: K, w: '#f4f0e0', g: '#c8c2ac', r: '#d8a0a0', b: '#2a5ad8', B: '#6a9aff', d: '#1a3a9a' },
  'ca',
);

/** Trena de pedreiro: a caixinha amarela e a fita de metal esticada com as marcas. */
export const TrenaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // a fita saindo para a direita, com as marcas de centímetro
    c.rect(18, 22, 19, 4, 'm');
    for (let x = 20; x < 37; x += 2) c.rect(x, 22, 1, x % 4 === 0 ? 3 : 2, 'k');
    c.rect(36, 21, 2, 6, 'g');
    // a caixa
    c.disc(15, 22, 11, 'y');
    c.rect(4, 22, 22, 11, 'y');
    c.shade('y', 'Y', (x, y) => x > 21 || y > 30);
    c.shade('y', 'h', (x, y) => x < 10 && y < 20);
    c.disc(15, 22, 4.5, 'd');
    c.disc(15, 22, 2, 'y');
    // a trava
    c.rect(9, 11, 6, 3, 'd');
    c.outline('k');
    return c.rows();
  },
  { k: K, m: '#e8e2a0', g: '#8d949c', y: '#f0c030', Y: '#b88a10', h: '#ffe080', d: '#2a2a2e' },
  'tr',
);

// --- Mítico e Necrótico ---------------------------------------------------

/** Ampulheta rachada: a moldura de madeira, a areia caindo e a trinca no vidro. */
export const AmpulhetaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.rect(9, 5, 22, 3, 'n').rect(9, 32, 22, 3, 'n');
    c.rect(10, 8, 2, 24, 'N').rect(28, 8, 2, 24, 'N');
    // o vidro em dois bulbos
    for (let y = 8; y < 32; y += 1) {
      const half = Math.max(1, Math.round(Math.abs(y - 20) * 0.62));
      c.rect(20 - half, y, half * 2, 1, 'v');
    }
    // areia em cima (pouca) e embaixo (montinho)
    for (let y = 12; y < 18; y += 1) {
      const half = Math.max(1, Math.round(Math.abs(y - 20) * 0.62) - 1);
      c.rect(20 - half, y, half * 2, 1, 's');
    }
    c.rect(19, 18, 2, 10, 's');
    c.ellipse(20, 29.5, 6, 2.5, 's');
    c.shade('s', 'S', (x) => x > 21);
    // a trinca
    c.line(23, 9, 25, 14, 'w').line(25, 14, 22, 16, 'w');
    c.outline('k');
    return c.rows();
  },
  { k: K, n: '#8a5a2a', N: '#5a3a1a', v: '#bcdce4', s: '#e8c070', S: '#b8904a', w: '#ffffff' },
  'am',
);

/** Papel carbono amassado (antes Espelho de Banheiro Trincado): a folha azul-escura amassada e a cópia saindo. */
export const PapelCarbonoIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // a folha branca de baixo, com a cópia em azul
    c.rect(14, 9, 20, 26, 'w');
    c.shade('w', 'g', (x, y) => x > 30 || y > 32);
    for (let y = 14; y < 31; y += 3) c.rect(17, y, 12, 1, 'b');
    // o carbono amassado por cima, com as dobras
    for (let y = 6; y < 30; y += 1) c.rect(6 + (y % 5 === 0 ? 1 : 0), y, 15 - (y % 7 === 0 ? 1 : 0), 1, 'c');
    c.shade('c', 'C', (x, y) => (x + y) % 9 < 2);
    c.line(8, 10, 19, 16, 'h').line(7, 22, 18, 19, 'h');
    c.outline('k');
    return c.rows();
  },
  { k: K, w: '#f4f0e4', g: '#c8c2ac', b: '#3a4ad8', c: '#1e2a5a', C: '#2a3a7a', h: '#4a5aa8' },
  'pb',
);

/** Lanterna do vigia (antes Cinzeiro Cheio de Bitucas): a lanterna de mão e o facho amarelo. */
export const LanternaVigiaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    // o facho de luz saindo para a direita
    for (let x = 20; x < 38; x += 1) {
      const half = Math.round((x - 20) * 0.55) + 3;
      c.rect(x, 20 - half, 1, half * 2, 'l');
    }
    // o corpo da lanterna
    c.rect(4, 16, 13, 8, 'r');
    c.shade('r', 'R', (x, y) => y > 21);
    c.shade('r', 'h', (x, y) => y < 18);
    c.rect(16, 14, 4, 12, 'g');
    c.rect(19, 15, 1, 10, 'y');
    c.rect(8, 15, 3, 1, 'g');
    c.outline('k');
    return c.rows();
  },
  { k: K, l: '#ffe8a0@0.55', r: '#c8322a', R: '#8a1f18', h: '#f05a44', g: '#b4bcc4', y: '#fff6c8' },
  'lv',
);

/** Vela preta derretida: a vela preta escorrendo, a chama roxa e o pires de cera. */
export const VelaPretaIcon = makeIcon(
  () => {
    const c = pixelCanvas(40, 40);
    c.ellipse(20, 34, 12, 3, 'c');
    c.rect(14, 14, 12, 20, 'v');
    c.shade('v', 'V', (x) => x < 17);
    // escorridos
    c.rect(13, 18, 2, 6, 'v').rect(25, 16, 2, 9, 'v').rect(18, 14, 3, 1, 'V');
    c.ellipse(20, 14, 6, 1.6, 'V');
    // pavio e a chama
    c.rect(20, 10, 1, 4, 'k');
    c.ellipse(20, 7, 2.5, 4, 'p');
    c.ellipse(20, 8, 1.4, 2.4, 'P');
    c.set(20, 3, 'p');
    c.outline('k');
    return c.rows();
  },
  { k: K, c: '#3a3440', v: '#1e1a22', V: '#4a4452', p: '#9a5aff', P: '#e8d8ff' },
  'vp',
);
