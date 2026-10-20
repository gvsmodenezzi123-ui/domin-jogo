/**
 * Sprites em pixel art desenhados como mapas de caracteres.
 * Cada caractere aponta para uma cor da paleta; '.' é transparente.
 */

export const TIO_ZE_PALETTE = Object.freeze({
  k: '#0b0806', // contorno
  c: '#3b2d22', // boina
  C: '#5a4531', // boina (luz)
  b: '#21170f', // aba
  s: '#c48a5c', // pele
  S: '#93603d', // pele (sombra)
  w: '#ddd6c6', // cabelo / bigode
  g: '#8d877c', // grisalho / fumaça
  e: '#efe3c2', // branco do olho / dente
  p: '#120c08', // pupila
  m: '#4a1a14', // boca
  t: '#e6dfcd', // cigarro
  o: '#ff8f3a', // brasa
  y: '#d9a441', // dente de ouro
  h: '#2c2118', // camisa
  H: '#46362a', // camisa (luz)
  r: '#c8261d', // sangue
});

const FACE_BASE = [
  '....kkkkkkkk....',
  '...kCCCCCCCCk...',
  '..kCCcccccccck..',
  '.kCcccccccccccck',
  'kbbbbbbbbbbbbbbk',
  '.kgwsssssssswgk.',
  '.kgskkksskkksgk.',
  '.kssepsssspessk.',
  '.ksssssSSssssSk.',
  '.kswwwwwwwwwwskg',
  '.kswwmmmmmwtttto',
  '.kSsssssssssssk.',
  '..kSssssssssSk..',
  '...kkSSSSSSkk...',
  '..hhHkSSSSkHhh..',
  'hhhHHHhhhhHHHhhh',
];

function withRows(base, overrides) {
  return Object.freeze(base.map((row, i) => overrides[i] ?? row));
}

/** Expressões do Tio Zé (16x16). */
export const TIO_ZE_FACES = Object.freeze({
  idle: withRows(FACE_BASE, {}),
  thinking: withRows(FACE_BASE, {
    7: '.ksspesssspessk.',
    10: '.kswwkkkkkwtttto',
  }),
  smug: withRows(FACE_BASE, {
    6: '.kgskkksskkksgk.',
    7: '.ksskpsssspkssk.',
    10: '.kswmeyeemwtttto',
  }),
  hurt: withRows(FACE_BASE, {
    6: '.kgskkssssskkgk.',
    7: '.kskkksssskkksk.',
    9: '.kswwwwwwwwwwsk.',
    10: '.kswmmmmmmmwwSk.',
    11: '.kSsssssrsssssk.',
  }),
});

export const HEART_PALETTE = Object.freeze({
  k: '#140606',
  R: '#ff8f7f',
  r: '#c8261d',
  d: '#741510',
  z: '#3e110e',
  q: '#5c1813',
});

export const HEART_FULL = Object.freeze([
  '.kkk.kkk.',
  'kRRrkrrrk',
  'kRrrrrrrk',
  'krrrrrrdk',
  '.krrrrdk.',
  '..krrdk..',
  '...krk...',
  '....k....',
]);

export const HEART_BROKEN = Object.freeze([
  '.kkk.kkk.',
  'kqzzkzzzk',
  'kzzkzzzzk',
  'kzzzkzzzk',
  '.kzkzzzk.',
  '..kzkzk..',
  '...kzk...',
  '....k....',
]);

export const COIN_PALETTE = Object.freeze({
  k: '#1a1206',
  Y: '#ffe7a3',
  y: '#d4a64a',
  d: '#8f6a24',
});

export const COIN = Object.freeze([
  '..kkk..',
  '.kYYyk.',
  'kYyyydk',
  'kYydydk',
  'kyyyddk',
  '.kyddk.',
  '..kkk..',
]);

export const LAMP_PALETTE = Object.freeze({
  k: '#070806',
  L: '#2d3524',
  l: '#46523a',
  w: '#fff3c8',
  y: '#ffd98a',
});

export const LAMP = Object.freeze([
  '.....kk.....',
  '....kllk....',
  '...kLlLLk...',
  '..kLLlLLLk..',
  '.kLLLlLLLLk.',
  'kkkkkkkkkkkk',
  '....ywwy....',
  '.....yy.....',
]);

export const SPEAKER_PALETTE = Object.freeze({ k: '#0b0705', b: '#e9dcb4', r: '#d9473c' });

export const SPEAKER_ON = Object.freeze([
  '....b.....',
  '...bb..b..',
  'bbbbb...b.',
  'bbbbb.b.b.',
  'bbbbb.b.b.',
  'bbbbb...b.',
  '...bb..b..',
  '....b.....',
]);

export const SPEAKER_OFF = Object.freeze([
  '....b.....',
  '...bb.....',
  'bbbbb.r..r',
  'bbbbb..rr.',
  'bbbbb..rr.',
  'bbbbb.r..r',
  '...bb.....',
  '....b.....',
]);
