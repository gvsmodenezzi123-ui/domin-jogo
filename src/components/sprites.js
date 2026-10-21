/**
 * Retrato 16x16 antigo do Tio Zé (dados de reserva; o jogo desenha o retrato
 * 40x40 de components/ArtSprites.jsx). Os ícones de interface agora são os
 * de components/art/UiIcons.jsx.
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
