/**
 * Versão 2.1: a ficha de cada retrato (art/portraitPixels.js), pela chave `art` dos rivais.
 * Mantém a cara de cada um dos retratos antigos (cores, chapéu, bigode, o objeto da mão) e
 * agora enche a foto da polaroide inteira, com a parede de cada um atrás.
 *
 *   bg / bgPattern  a parede (plain, tiles, wood, brick, stripes, curtain, stars, frame, neon)
 *   skin, jaw       pele e o formato do queixo (round, square, heavy, long, thin)
 *   hair, hat       { style | type, color, band... }
 *   facial          { mustache, beard, stubble, goatee, color }
 *   glasses         { type: round | square | dark | gold | monocle, color }
 *   outfit          { type, color, accent, shirt, tie, bow, chain, badge, number, ... }
 *   behind / front  o objeto de cada um, desenhado atrás ou na frente do personagem
 */

// ---------------------------------------------------------------------------
// Objetos
// ---------------------------------------------------------------------------

/** Cigarro no canto da boca (aceso): a brasa fica em EMBER.tioZe. */
const cigarette = (b, { hex, mood }) => {
  if (mood === 'hurt') return;
  b.rect(36, 38, 9, 2, hex('#f2efe6'));
  b.rect(36, 39, 9, 1, hex('#cfc8b8'));
  b.rect(36, 38, 2, 2, hex('#d9a046'));
  b.rect(45, 38, 1, 2, hex('#ff6a1a'));
  b.put(46, 38, hex('#ffd04a'));
};

const cigar = (b, { hex, mood }) => {
  if (mood === 'hurt') return;
  b.rect(35, 37, 11, 3, hex('#5a3418'));
  b.rect(35, 37, 11, 1, hex('#8a5a2a'));
  b.rect(38, 37, 2, 3, hex('#c9962e'));
  b.rect(46, 37, 1, 3, hex('#ff6a1a'));
  b.put(47, 38, hex('#ffd04a'));
};

/** Botijão de gás azul atrás do ombro (Tonho). */
const gasCylinder = (b, { tones, fill, lit }) => {
  const t = tones('#4a6ad0');
  fill(b, 2, 30, 15, 63, (x, y) => {
    const dx = Math.abs(x + 0.5 - 8.5);
    const w = y < 34 ? 5 - (34 - y) * 0.8 : 6.5;
    return dx <= w ? lit(t, (8 - x) / 6, x, y) : null;
  });
  b.rect(6, 26, 5, 4, tones('#9aa2a8').mid);
  b.rect(5, 28, 7, 1, tones('#9aa2a8').hi);
  b.rect(3, 44, 12, 2, tones('#e8e0c8').mid);
};

/** Taco de sinuca em pé, com o giz azul (Baiano). */
const cue = (b, { hex }) => {
  b.line(54, 63, 58, 6, hex('#c8a060'));
  b.line(55, 63, 59, 6, hex('#8a6030'));
  b.rect(57, 3, 3, 4, hex('#f4f0e6'));
  b.rect(57, 2, 3, 2, hex('#3a6ad0'));
  b.rect(52, 50, 6, 4, hex('#3a6ad0'));
  b.put(53, 50, hex('#8ab0ff'));
};

/** Pneu atrás do ombro direito (Valdir). */
const tire = (b, { hex }) => {
  b.ellipse(54, 44, 10, 11, hex('#1a1a1a'));
  b.ellipse(54, 44, 7, 8, hex('#2e2e2e'));
  for (let a = 0; a < Math.PI * 2; a += 0.4) b.put(54 + Math.cos(a) * 9, 44 + Math.sin(a) * 10, hex('#3e3e3e'));
  b.ellipse(54, 44, 4, 4.5, hex('#9aa2a8'));
  b.ellipse(53, 43, 2, 2, hex('#d8e0e4'));
};

/** Pedra de dominó grande na mão (Seu Arlindo). */
const bigTile = (b, { hex }) => {
  b.rect(3, 40, 11, 21, hex('#2a1a08'));
  b.rect(4, 41, 9, 19, hex('#f2e8c8'));
  b.rect(4, 41, 9, 1, hex('#ffffff'));
  b.rect(4, 50, 9, 1, hex('#8a7650'));
  for (const [px, py] of [
    [6, 43],
    [10, 43],
    [6, 47],
    [10, 47],
    [8, 45],
    [6, 53],
    [10, 57],
    [8, 55],
  ])
    b.rect(px, py, 2, 2, hex('#1a1008'));
};

/** Gancho de guincho com a corrente (Marcão). */
const towHook = (b, { hex }) => {
  for (let y = 30; y < 50; y += 3) {
    b.rect(5, y, 3, 2, hex('#8a949c'));
    b.put(5, y, hex('#d8e0e4'));
  }
  b.ellipse(7, 54, 4, 4, hex('#5a6168'));
  b.ellipse(7, 54, 2, 2, [0, 0, 0], 0);
  b.rect(3, 53, 3, 6, hex('#3a4046'));
  b.rect(6, 52, 4, 2, hex('#2a2e32'));
};

/** Concha de feijão (Cida). */
const ladle = (b, { hex }) => {
  b.line(52, 62, 57, 34, hex('#9aa2a8'));
  b.line(53, 62, 58, 34, hex('#5a6168'));
  b.ellipse(57, 31, 5, 3.5, hex('#9aa2a8'));
  b.ellipse(57, 30.5, 3.6, 2.2, hex('#5a2a14'));
};

/** Caneta atrás da orelha. */
const earPen = (color) => (b, { hex }) => {
  b.line(43, 18, 49, 10, hex(color));
  b.put(49, 10, hex('#f4f0e6'));
};

/** A navalha na mão e a cicatriz já vem do spec (Tião). */
const razor = (b, { hex }) => {
  b.rect(4, 44, 3, 12, hex('#3a2010'));
  b.line(6, 44, 10, 34, hex('#d8e0e4'));
  b.line(7, 44, 11, 34, hex('#9aa2a8'));
  b.put(11, 33, hex('#ffffff'));
};

/** Moeda de ouro entre os dedos (Beto). */
const goldCoin = (b, { hex }) => {
  b.ellipse(53, 52, 5, 5, hex('#8a6214'));
  b.ellipse(53, 52, 4, 4, hex('#e6c34a'));
  b.ellipse(52, 51, 2, 2, hex('#fff0a0'));
  b.rect(50, 56, 7, 5, hex('#c88a5a'));
};

/** Carteira roubada saindo do bolso (Carlinhos). */
const wallet = (b, { hex }) => {
  b.rect(46, 50, 12, 8, hex('#5a3418'));
  b.rect(46, 50, 12, 2, hex('#8a5a2a'));
  b.rect(48, 47, 8, 4, hex('#6a9a5a'));
  b.rect(49, 47, 6, 1, hex('#a0d090'));
};

/** Bola de cristal (Madama Sofia). */
const crystalBall = (b, { hex }) => {
  b.rect(24, 60, 17, 4, hex('#5a3a12'));
  b.ellipse(32.5, 55, 9, 7.5, hex('#4a2a8a'));
  b.ellipse(32.5, 55, 8, 6.5, hex('#8a6ae0'));
  b.ellipse(30, 52.5, 3, 2, hex('#e8e0ff'));
  b.ellipse(34, 57, 2, 1.4, hex('#c0a0ff'));
};

/** Frasco de poção (Doutor Fausto). */
const potion = (b, { hex }) => {
  b.rect(50, 42, 3, 4, hex('#d8e0e4'));
  b.rect(49, 41, 5, 1, hex('#8a5a2a'));
  b.ellipse(51.5, 52, 5, 6, hex('#2a3a2a'));
  b.ellipse(51.5, 53, 4, 4.5, hex('#3ae06a'));
  b.put(49, 50, hex('#e0ffe0'));
};

/** Chave inglesa (Alemão). */
const wrench = (b, { hex }) => {
  b.line(50, 63, 58, 38, hex('#9aa2a8'));
  b.line(51, 63, 59, 38, hex('#5a6168'));
  b.ellipse(59, 35, 4, 4, hex('#9aa2a8'));
  b.rect(58, 31, 3, 3, [0, 0, 0], 0);
  b.rect(57, 30, 2, 4, hex('#5a6168'));
};

/** Pá de coveiro (Geraldo). */
const shovel = (b, { hex }) => {
  b.line(53, 63, 56, 30, hex('#6a4a2a'));
  b.line(54, 63, 57, 30, hex('#3a2410'));
  b.rect(52, 18, 9, 12, hex('#6a737a'));
  b.rect(52, 18, 9, 2, hex('#a8b0b6'));
  b.rect(55, 30, 3, 2, hex('#3a4046'));
};

/** Chicote enrolado (Zeca). */
const whip = (b, { hex }) => {
  b.rect(50, 48, 4, 14, hex('#5a3418'));
  for (let a = 0; a < Math.PI * 3; a += 0.15) b.put(52 + Math.cos(a) * (4 + a), 40 - a * 2.2 + Math.sin(a) * 2, hex('#8a5a2a'));
};

/** Talão de rifa (Genésio). */
const raffle = (b, { hex }) => {
  b.rect(46, 48, 12, 9, hex('#f4e8b0'));
  b.rect(46, 48, 12, 2, hex('#b8261c'));
  for (let x = 47; x < 57; x += 2) b.put(x, 53, hex('#3a2a10'));
  b.rect(46, 57, 12, 1, hex('#c8b880'));
};

/** Chave da van com o chaveiro (Marquinhos). */
const vanKey = (b, { hex }) => {
  b.ellipse(52, 52, 3, 3, hex('#c9962e'));
  b.rect(54, 51, 6, 2, hex('#9aa2a8'));
  b.rect(58, 53, 1, 2, hex('#9aa2a8'));
};

/** Apito no cordão (Brandão) e o cassetete. */
const baton = (b, { hex }) => {
  b.line(52, 63, 58, 40, hex('#1a1a1a'));
  b.line(53, 63, 59, 40, hex('#3a3a3a'));
};

/** Caderninho de pontos e o lápis (Nelsinho). */
const scorePad = (b, { hex }) => {
  b.rect(46, 47, 11, 13, hex('#f4f0e6'));
  for (let y = 50; y < 59; y += 2) b.line(47, y, 55, y, hex('#8aa8c8'));
  b.line(48, 52, 50, 52, hex('#1a1a1a'));
  b.line(48, 56, 53, 56, hex('#1a1a1a'));
  b.line(56, 45, 59, 58, hex('#e6c34a'));
};

/** Livro-caixa da agiota (Odete). */
const ledger = (b, { hex }) => {
  b.rect(45, 48, 14, 12, hex('#5a1a2a'));
  b.rect(45, 48, 14, 2, hex('#8a2a3a'));
  b.rect(58, 49, 1, 11, hex('#f4f0e6'));
  b.rect(49, 52, 6, 1, hex('#e6c34a'));
};

/** O pano de balcão no ombro (Valtinho Renegado). */
const barTowel = (b, { hex }) => {
  b.rect(40, 44, 14, 6, hex('#e8e0d0'));
  b.rect(40, 46, 14, 1, hex('#b8261c'));
  b.rect(42, 50, 6, 8, hex('#e8e0d0'));
  b.rect(42, 52, 6, 1, hex('#b8261c'));
};

/** Os olhos vermelhos que brilham no escuro (o Dono da Noite). */
const nightEyes = (b, { hex, mood }) => {
  const y = mood === 'hurt' ? 28 : 27;
  for (const x of [CXL, CXR]) {
    b.rect(x, y, 4, 2, hex('#ff2a1a'));
    b.rect(x + 1, y, 2, 1, hex('#ffd0a0'));
    b.ellipse(x + 2, y + 1, 4, 2.5, hex('#ff2a1a'), 0.25);
  }
};
const CXL = 24;
const CXR = 36;

/** Brincos de argola. */
const hoops = (color) => (b, { hex }) => {
  for (const x of [18, 46]) {
    for (let a = 0; a < Math.PI * 2; a += 0.4) b.put(x + Math.cos(a) * 2.2, 37 + Math.sin(a) * 2.6, hex(color));
  }
};

const both = (...fns) => (b, ctx) => fns.forEach((fn) => fn(b, ctx));

// ---------------------------------------------------------------------------
// As fichas
// ---------------------------------------------------------------------------

export const PORTRAITS = {
  tioZe: {
    nose: 'big', eyes: 'tired',
    seed: 1,
    bg: ['#4a3420', '#1e140c'],
    bgPattern: 'wood',
    skin: '#c88a5a',
    jaw: 'square',
    hair: { style: 'short', color: '#2a1a10' },
    hat: { type: 'fedora', color: '#5a3a22', band: '#2a1a10' },
    facial: { mustache: 'big', color: '#2a1a10' },
    outfit: { type: 'shirt', color: '#2e2a26', collar: '#4a443e' },
    front: cigarette,
  },
  tonho: {
    browShape: 'arched',
    seed: 2,
    bg: ['#2a3a6a', '#101830'],
    bgPattern: 'brick',
    skin: '#d89a6a',
    jaw: 'round',
    hair: { style: 'short', color: '#3a2412' },
    hat: { type: 'cap', color: '#2f4fb0', visor: '#1e3480', emblem: '#ff8a2a' },
    facial: { mustache: 'thin', color: '#3a2412' },
    outfit: { type: 'uniform', color: '#2f4fb0', collar: '#1e3480', patch: '#ff8a2a', buttons: true, accent: '#e8e0c8' },
    behind: gasCylinder,
  },
  baiano: {
    eyes: 'sleepy',
    seed: 3,
    bg: ['#3a4a22', '#141c0c'],
    bgPattern: 'stripes',
    skin: '#7a4a2a',
    jaw: 'long',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'safari', color: '#e0d0a8', band: '#5a3a22' },
    facial: { stubble: true, color: '#1a1008' },
    outfit: { type: 'shirt', color: '#6a7a3a', collar: '#4a5a2a', buttons: true, accent: '#e6c34a' },
    iris: '#2a1a0a',
    front: cue,
  },
  valdir: {
    nose: 'big', browShape: 'angry',
    seed: 4,
    bg: ['#4a4e52', '#1a1c1e'],
    bgPattern: 'brick',
    skin: '#c08060',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'short', color: '#2a2a2a' },
    hat: { type: 'beanie', color: '#6a6e72' },
    facial: { stubble: true, color: '#2a2018' },
    outfit: { type: 'uniform', color: '#8a8e92', collar: '#5a5e62', patch: '#d02a2a' },
    behind: tire,
    front: (b, ctx) => {
      if (ctx.mood === 'hurt') return;
      b.line(36, 38, 42, 36, ctx.hex('#e0c890'));
    },
  },
  neide: {
    browShape: 'arched', eyes: 'lashes',
    seed: 5,
    bg: ['#5a1e2a', '#200a10'],
    bgPattern: 'curtain',
    skin: '#e0aa88',
    jaw: 'round',
    hair: { style: 'bun', color: '#c8c8c8' },
    glasses: { type: 'square', color: '#c02a2a' },
    lip: '#b84a5a',
    blush: '#e06a6a',
    wrinkles: true,
    outfit: { type: 'cardigan', color: '#6a1a2a', collar: '#f0e8d8', pearls: true },
  },
  arlindo: {
    nose: 'big',
    seed: 6,
    bg: ['#6a4a1a', '#2a1a08'],
    bgPattern: 'frame',
    skin: '#e0a888',
    jaw: 'round',
    hair: { style: 'volume', color: '#e8e8e8' },
    hat: { type: 'crown' },
    facial: { mustache: 'big', beard: 'full', color: '#f0f0f0' },
    wrinkles: true,
    outfit: { type: 'suit', color: '#e8e4d8', accent: '#d8d0c0', shirt: '#ffffff', bow: '#c02a2a' },
    behind: bigTile,
  },
  marcao: {
    browShape: 'angry', thickBrows: true,
    seed: 7,
    bg: ['#5a4a1a', '#1e1808'],
    bgPattern: 'stripes',
    skin: '#a06a42',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'helmet', color: '#e88a1a', band: '#2a2a2a' },
    facial: { beard: 'full', color: '#1a1008' },
    outfit: { type: 'uniform', color: '#e8b81a', collar: '#c8981a', stripes: '#e8e8e8' },
    behind: towHook,
  },
  serginho: {
    browShape: 'arched',
    seed: 8,
    bg: ['#6a3a1a', '#24120a'],
    bgPattern: 'tiles',
    skin: '#d8a070',
    jaw: 'thin',
    hair: { style: 'short', color: '#2a1a10' },
    hat: { type: 'cap', color: '#d82a2a', visor: '#a01a1a', emblem: '#ffffff' },
    outfit: { type: 'jersey', color: '#e8781a', collar: '#ffffff', number: '22' },
    front: earPen('#2a6ad0'),
  },
  cida: {
    eyes: 'lashes',
    seed: 9,
    bg: ['#4a1a3a', '#1a0a16'],
    bgPattern: 'tiles',
    skin: '#e8b090',
    jaw: 'round',
    hair: { style: 'curly', color: '#e86a2a' },
    lip: '#c03a4a',
    blush: '#e86a6a',
    outfit: { type: 'apron', color: '#8a2a6a', accent: '#f0e0f0', plaid: '#f0c0e0' },
    behind: ladle,
  },
  paulinho: {
    eyes: 'narrow',
    seed: 10,
    bg: ['#1a4a4a', '#081818'],
    bgPattern: 'plain',
    skin: '#a87048',
    jaw: 'long',
    hair: { style: 'slick', color: '#141414' },
    facial: { mustache: 'thin', color: '#141414' },
    thickBrows: true,
    iris: '#1a3a2a',
    outfit: { type: 'shirt', color: '#2a7a7a', collar: '#1a5a5a', badge: true },
    front: earPen('#e6c34a'),
  },
  tiao: {
    nose: 'hook', browShape: 'angry', eyes: 'narrow',
    seed: 11,
    bg: ['#5a1a1a', '#1e0808'],
    bgPattern: 'stripes',
    skin: '#c08058',
    jaw: 'long',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'panama', color: '#f0ecd8', band: '#c02a2a' },
    facial: { mustache: 'thin', color: '#1a1008' },
    scar: true,
    goldTooth: true,
    outfit: { type: 'shirt', color: '#f0ecd8', collar: '#ffffff', stripes: '#c02a2a' },
    behind: razor,
  },
  beto: {
    browShape: 'angry',
    seed: 12,
    bg: ['#1a1e4a', '#08081e'],
    bgPattern: 'curtain',
    skin: '#a06a42',
    jaw: 'square',
    hair: { style: 'long', color: '#141018' },
    hat: { type: 'fedora', color: '#1e2460', band: '#e6c34a' },
    facial: { beard: 'full', mustache: 'big', color: '#141018' },
    iris: '#2aa060',
    outfit: { type: 'suit', color: '#1e2460', accent: '#2a3480', shirt: '#4a2a8a', chain: true, medal: true },
    front: both(hoops('#e6c34a'), goldCoin),
  },
  carlinhos: {
    eyes: 'narrow', browShape: 'arched',
    seed: 13,
    bg: ['#1e3a24', '#08140a'],
    bgPattern: 'brick',
    skin: '#a87048',
    jaw: 'thin',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'beanie', color: '#2a7a3a' },
    facial: { stubble: true, color: '#1a1008' },
    outfit: { type: 'jacket', color: '#2a3a2a', accent: '#3a4a3a', shirt: '#4a4a4a' },
    front: wallet,
  },
  bigode: {
    nose: 'big',
    seed: 14,
    bg: ['#4a3a0a', '#1a1404'],
    bgPattern: 'frame',
    skin: '#d8a070',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'slick', color: '#141414' },
    glasses: { type: 'gold', color: '#e6c34a' },
    facial: { mustache: 'gold', color: '#e6b82a' },
    goldTooth: true,
    outfit: { type: 'shirt', color: '#c8981a', collar: '#e6c34a', plaid: '#5a3a08', chain: true },
  },
  sofia: {
    eyes: 'lashes', browShape: 'arched',
    seed: 15,
    bg: ['#2a1a4a', '#0a0618'],
    bgPattern: 'stars',
    skin: '#c88a6a',
    jaw: 'thin',
    hair: { style: 'long', color: '#1a1020' },
    hat: { type: 'turban', color: '#7a3ac8' },
    lip: '#a02a5a',
    iris: '#6a3ac8',
    outfit: { type: 'robe', color: '#5a2aa8', collar: '#e6c34a' },
    front: both(hoops('#e6c34a'), crystalBall),
  },
  fausto: {
    nose: 'hook', browShape: 'arched', eyes: 'tired',
    seed: 16,
    bg: ['#2a2a30', '#0a0a0e'],
    bgPattern: 'curtain',
    skin: '#e0dcd0',
    jaw: 'long',
    hair: { style: 'slick', color: '#0e0e12' },
    iris: '#4ad0e0',
    lip: '#7a3a4a',
    outfit: { type: 'suit', color: '#1a1a1e', accent: '#2a2a30', shirt: '#f0f0f0', tie: '#a01a2a' },
    front: potion,
  },
  alemao: {
    nose: 'big', thickBrows: true,
    seed: 17,
    bg: ['#4a3420', '#1a120a'],
    bgPattern: 'brick',
    skin: '#e8b090',
    jaw: 'heavy',
    broad: true,
    hair: { style: 'short', color: '#e8c050' },
    hat: { type: 'goggles' },
    facial: { beard: 'long', mustache: 'big', color: '#e0b840' },
    iris: '#3a6ab0',
    blush: '#e07a6a',
    outfit: { type: 'jacket', color: '#6a4220', accent: '#8a5a2a', shirt: '#3a3a3a' },
    front: wrench,
  },
  comendador: {
    nose: 'hook', eyes: 'sleepy',
    seed: 18,
    bg: ['#5a1010', '#1e0404'],
    bgPattern: 'frame',
    skin: '#e8b898',
    jaw: 'square',
    hair: { style: 'slick', color: '#e0e0e0' },
    facial: { mustache: 'handlebar', color: '#f0f0f0' },
    glasses: { type: 'monocle', color: '#e6c34a' },
    wrinkles: true,
    outfit: { type: 'suit', color: '#8a1a1a', accent: '#e6c34a', shirt: '#ffffff', bow: '#1a1a1a' },
    front: cigar,
  },
  donoDaNoite: {
    rim: '#ff3a1a',
    seed: 19,
    bg: ['#2a0808', '#060202'],
    bgPattern: 'curtain',
    glow: '#ff2a1a',
    skin: '#0e0a0a',
    jaw: 'long',
    hair: { style: 'short', color: '#060606' },
    hat: { type: 'wide', color: '#0e0a0a', band: '#4a0a0a' },
    iris: '#0e0a0a',
    lip: '#0e0a0a',
    outfit: { type: 'coat', color: '#0e0a0a', accent: '#1e1414', shirt: '#2a0a0a' },
    front: nightEyes,
  },
  voJuca: {
    nose: 'big', browShape: 'sad',
    seed: 20,
    bg: ['#3a4a2a', '#141a0e'],
    bgPattern: 'wood',
    skin: '#e0a888',
    jaw: 'round',
    hair: { style: 'bald', color: '#e8e8e8' },
    hat: { type: 'flatcap', color: '#8a6a3a' },
    facial: { mustache: 'big', color: '#f0f0f0' },
    glasses: { type: 'round', color: '#c9962e' },
    wrinkles: true,
    outfit: { type: 'cardigan', color: '#c8a868', collar: '#2a6a3a' },
  },
  juvenal: {
    eyes: 'tired',
    seed: 21,
    bg: ['#3a3a40', '#121216'],
    bgPattern: 'stripes',
    skin: '#d8a888',
    jaw: 'square',
    hair: { style: 'side', color: '#2a2018' },
    glasses: { type: 'square', color: '#3a3a3a' },
    outfit: { type: 'suit', color: '#5a5e66', accent: '#6a6e76', shirt: '#f0f0f0', tie: '#2a3a8a' },
    front: earPen('#2a3a8a'),
  },
  zeca: {
    browShape: 'angry',
    seed: 22,
    bg: ['#4a3a1e', '#1a140a'],
    bgPattern: 'wood',
    skin: '#c08058',
    jaw: 'round',
    hair: { style: 'short', color: '#3a2412' },
    hat: { type: 'straw', color: '#e0c070', band: '#8a2a1a' },
    facial: { mustache: 'big', color: '#3a2412' },
    outfit: { type: 'shirt', color: '#5a7ab0', collar: '#d02a2a', plaid: '#2a3a6a' },
    front: whip,
  },
  genesio: {
    eyes: 'sleepy',
    seed: 23,
    bg: ['#5a3a1a', '#1e1208'],
    bgPattern: 'tiles',
    skin: '#e0a888',
    jaw: 'round',
    hair: { style: 'short', color: '#4a2a12' },
    hat: { type: 'cap', color: '#b8261c', visor: '#8a1a10', ticket: true },
    facial: { mustache: 'thin', color: '#4a2a12' },
    goldTooth: true,
    outfit: { type: 'shirt', color: '#c8981a', collar: '#2a8a4a', plaid: '#5a3a08' },
    front: raffle,
  },
  marquinhos: {
    eyes: 'sleepy', browShape: 'arched',
    seed: 24,
    bg: ['#3a2a1a', '#140e08'],
    bgPattern: 'brick',
    skin: '#8a5a38',
    jaw: 'thin',
    hair: { style: 'short', color: '#141414' },
    hat: { type: 'cap', color: '#d82a2a', visor: '#a01a1a' },
    goldTooth: true,
    outfit: { type: 'tank', color: '#f0f0f0', shirt: '#f0f0f0', chain: true },
    front: vanKey,
  },
  nelsinho: {
    browShape: 'sad',
    seed: 25,
    bg: ['#1a3a24', '#08140c'],
    bgPattern: 'stripes',
    skin: '#d8a070',
    jaw: 'round',
    hair: { style: 'short', color: '#1a1008' },
    hat: { type: 'headband', color: '#f4f0e6' },
    outfit: { type: 'jersey', color: '#2a8a3a', collar: '#ffffff', number: '71' },
    front: scorePad,
  },
  soro: {
    eyes: 'lashes', browShape: 'arched',
    seed: 26,
    bg: ['#4a1a3a', '#1a0814'],
    bgPattern: 'neon',
    neon: '#ff4ad0',
    skin: '#f0c0a0',
    jaw: 'thin',
    hair: { style: 'bob', color: '#a83ad0' },
    lip: '#e02a6a',
    iris: '#6a2aa8',
    blush: '#ff7aa0',
    outfit: { type: 'robe', color: '#2a1a2a', collar: '#ff8ad0', boa: '#ff9ad8' },
  },
  brandao: {
    browShape: 'angry', thickBrows: true,
    seed: 27,
    bg: ['#1e2a4a', '#080c1a'],
    bgPattern: 'brick',
    skin: '#c88a5a',
    jaw: 'square',
    broad: true,
    hair: { style: 'crew', color: '#1a1008' },
    hat: { type: 'police', color: '#1e2a5a', visor: '#0e1430', band: '#0e1430', emblem: '#e6c34a' },
    facial: { mustache: 'big', color: '#1a1008' },
    outfit: { type: 'uniform', color: '#1e2a5a', collar: '#2a3a7a', badge: true, buttons: true, accent: '#e6c34a' },
    behind: baton,
  },
  geraldo: {
    browShape: 'sad', eyes: 'tired', nose: 'hook',
    seed: 28,
    bg: ['#2a2e2a', '#0a0c0a'],
    bgPattern: 'stars',
    glow: '#a0b0a0',
    skin: '#b8b8a8',
    jaw: 'long',
    hair: { style: 'thin', color: '#5a5a54' },
    hat: { type: 'fedora', color: '#2a2a2a', band: '#1a1a1a' },
    iris: '#4a4a40',
    outfit: { type: 'coat', color: '#2a2e2a', accent: '#3a3e3a', shirt: '#5a5e5a' },
    behind: shovel,
  },
  odete: {
    eyes: 'narrow', browShape: 'arched', nose: 'hook',
    seed: 29,
    bg: ['#2a1a3a', '#0e0814'],
    bgPattern: 'curtain',
    skin: '#e0b098',
    jaw: 'thin',
    hair: { style: 'bun', color: '#b8b8c0' },
    glasses: { type: 'square', color: '#a02a8a' },
    lip: '#8a2a5a',
    wrinkles: true,
    outfit: { type: 'cardigan', color: '#4a1a5a', collar: '#2a0e34', pearls: true },
    front: ledger,
  },
  valtinhoRenegado: {
    browShape: 'angry',
    seed: 30,
    bg: ['#3a2a1a', '#140e08'],
    bgPattern: 'wood',
    skin: '#c88a5a',
    jaw: 'square',
    hair: { style: 'side', color: '#1a1008' },
    facial: { mustache: 'big', stubble: true, color: '#1a1008' },
    scar: true,
    outfit: { type: 'jacket', color: '#5a3418', accent: '#3a2010', shirt: '#e8e0d0' },
    front: barTowel,
  },
};

/** De onde sai a fumaça (na grade de 64) de quem fuma; no hurt o cigarro cai. */
export const PORTRAIT_EMBER = Object.freeze({
  tioZe: Object.freeze({ x: 46, y: 38, grid: 64, moods: ['idle', 'thinking', 'smug'] }),
  comendador: Object.freeze({ x: 47, y: 38, grid: 64, moods: ['idle', 'thinking', 'smug'] }),
});
