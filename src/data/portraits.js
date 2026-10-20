/**
 * Retratos 16x16 dos rivais novos do Patch 0.4.
 *
 * Todos seguem o mesmo molde: olho esquerdo nas colunas 4–5 e direito nas
 * 10–11 da linha 7; boca nas colunas 6–9 da linha 10; sangue (humor "ferido")
 * na linha 11, coluna 8. Assim os 4 humores saem do rosto base sem desenhar
 * cada um à mão: `templateMoods(rows)`.
 *
 * Paleta: cada rival traz as cores dele + as do molde (k contorno, s/S pele,
 * e/p olho, m boca, r sangue).
 */

const EYE_ROW = 7;
const LEFT_EYE = 4;
const RIGHT_EYE = 10;
const MOUTH_ROW = 10;
const MOUTH = [6, 7, 8, 9];
const BLOOD = [11, 8];

function put(row, col, ch) {
  return row.slice(0, col) + ch + row.slice(col + 1);
}

function withEyes(rows, left, right) {
  const out = rows.slice();
  let row = out[EYE_ROW];
  row = put(put(row, LEFT_EYE, left[0]), LEFT_EYE + 1, left[1]);
  row = put(put(row, RIGHT_EYE, right[0]), RIGHT_EYE + 1, right[1]);
  out[EYE_ROW] = row;
  return out;
}

function withMouth(rows, cells) {
  const out = rows.slice();
  let row = out[MOUTH_ROW];
  MOUTH.forEach((col, i) => {
    row = put(row, col, cells[i]);
  });
  out[MOUTH_ROW] = row;
  return out;
}

/** idle / thinking / smug / hurt a partir do rosto base. */
export function templateMoods(base) {
  const idle = withMouth(withEyes(base, 'ep', 'pe'), 'mmmm');
  const hurtRows = withMouth(withEyes(base, 'kp', 'pk'), 'mmmm');
  hurtRows[BLOOD[0]] = put(hurtRows[BLOOD[0]], BLOOD[1], 'r');
  return Object.freeze({
    idle: Object.freeze(idle),
    thinking: Object.freeze(withMouth(withEyes(base, 'pe', 'pe'), 'kkkk')),
    smug: Object.freeze(withMouth(withEyes(base, 'kk', 'kk'), 'meem')),
    hurt: Object.freeze(hurtRows),
  });
}

const K = '#0b0806';
const EYES = { e: '#efe3c2', p: '#120c08', m: '#4a1a14', r: '#c8261d', k: K };

// ---------------------------------------------------------------------------
// Região 1 — Boteco da Esquina
// ---------------------------------------------------------------------------

export const TONHO = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kBBBBBBBBk...',
    '..kBBBByOBBBBk..',
    '..kBBBBBBBBBBk..',
    '.kbbbbbbbbbbbbk.',
    '.kssssssssssssk.',
    '.ksKKssssssKKsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    '.kssHHHHHHHHssk.',
    '.ksssHmmmmHsssk.',
    '.kSsssssssssssk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..UUkUUyyUUkUU..',
    'UUUUUUUUUUUUUUUU',
  ]),
  palette: { ...EYES, B: '#2f5fb3', y: '#ffcf4a', O: '#ff7a1f', b: '#1e3d7a', s: '#d29a70', S: '#9c6644', K: '#3a2414', H: '#3a2414', U: '#3a66a8' },
});

export const BAIANO = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kcccccccck...',
    '..kccCcccCccck..',
    '..kcccccccccck..',
    '.kcssssssssssck.',
    '.kssssssssssssk.',
    '.ksKKssssssKKsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    '.kbbssssssssssk.',
    '.kssssmmmmssssk.',
    '.kSsssssssssssk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..wwkSyyyySkww..',
    'wwwwwSSSSSSwwwww',
  ]),
  palette: { ...EYES, c: '#1a1210', C: '#3a2a22', s: '#8a5a3a', S: '#5e3a22', K: '#1a1210', b: '#5aa8ff', y: '#e8b84a', w: '#e9e4d6', m: '#3a1410' },
});

export const VALDIR = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kGGGGGGGGk...',
    '..kGgGgGgGgGGk..',
    '..kGGGGGGGGGGk..',
    '.kGGGGGGGGGGGGk.',
    '.kssssssssssssk.',
    '.ksKKKssssKKKsk.',
    '.kssepsssspessk.',
    '.ksosssSSsssssk.',
    '.kddsssssssssddk',
    '.kdddsmmmmsdddk.',
    '.kddddddddddddk.',
    '..kddddddddddk..',
    '...kkddddddkk...',
    '..AAkAAAAAAkAA..',
    'AAAAAoAAAAoAAAAA',
  ]),
  palette: { ...EYES, G: '#5f666e', g: '#7f878f', s: '#c08a5e', S: '#8a5a38', K: '#2a1a10', o: '#14181c', d: '#3a2a1e', A: '#4a5058' },
});

// ---------------------------------------------------------------------------
// Região 2 — Clube da Sinuca Clandestino
// ---------------------------------------------------------------------------

export const SERGINHO = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kRRRRRRRRk...',
    '..kRRRwwRRRRRk..',
    '..kRRRRRRRRRRk..',
    '.kRRRRRRRRRRRRkk',
    '.kssssssssssssk.',
    '.ksKKssssssKKsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    '.kssssssssssssk.',
    '.kssssmmmmssssk.',
    '.kSssssssssssSk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..OOkOOwwOOkOO..',
    'OOOOOOOwwOOOOOOO',
  ]),
  palette: { ...EYES, R: '#c8261d', w: '#f4ecd2', s: '#d6a27a', S: '#a06a46', K: '#2a1a10', O: '#e07a1f', r: '#8f1610' },
});

export const CIDA = Object.freeze({
  faces: templateMoods([
    '.....kkkkkk.....',
    '...kkhhhhhhkk...',
    '..khHhhhhhhHhk..',
    '.khhhhhhhhhhhhk.',
    '.khhsssssssshhk.',
    '.khsssssssssshk.',
    '.ksKKssssssKKsk.',
    '.kssepsssspessk.',
    '.ksBsssSSsssBsk.',
    '.kssssssssssssk.',
    '.kssssmmmmssssk.',
    '.kSssssssssssSk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..PPkwwwwwwkPP..',
    'PPPPwwwwwwwwPPPP',
  ]),
  palette: { ...EYES, h: '#d9692a', H: '#f39a52', s: '#e8b08a', S: '#b07a52', K: '#5a2a12', B: '#e0786a', m: '#b3182a', w: '#f4efe2', P: '#6b2a5c' },
});

export const PAULINHO = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkkk...',
    '...kHHHHHHHHyk..',
    '..kHHhHHHHHHHHk.',
    '..kHHHHHHHHHHk..',
    '.kHHssssssssHHk.',
    '.kHsssssssssssk.',
    '.ksKKssssssKKsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    '.ksssKKKKKKsssk.',
    '.kssssmmmmssssk.',
    '.kSssssssssssSk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..CCkCwwwwCkCC..',
    'CCCCCCwwwwCCCCCC',
  ]),
  palette: { ...EYES, H: '#1a1414', h: '#5a5a6a', y: '#e8b84a', s: '#c99068', S: '#94603e', K: '#1a1414', C: '#1f6a70', w: '#f4ecd2' },
});

// ---------------------------------------------------------------------------
// Região 3 — Submundo do Jogo do Bicho
// ---------------------------------------------------------------------------

export const CARLINHOS = Object.freeze({
  faces: templateMoods([
    '................',
    '....kkkkkkkk....',
    '...kGGGGGGGGk...',
    '..kGGgGGGGGGGk..',
    '.kbbbbbbbbbbbbk.',
    '.kssssssssssssk.',
    '.ksKKKssssKKKsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    '.ksdsdsdsdsdsdk.',
    '.kdsdsmmmmsdsdk.',
    '.kSdsdsdsdsdsSk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..EEEEEEEEEEEE..',
    'JJJJJEEJJJJJJJJJ',
  ]),
  palette: { ...EYES, G: '#3a4a3a', g: '#5a6a5a', b: '#232e23', s: '#c08a5e', S: '#8a5a38', K: '#1a140e', d: '#6e4a32', E: '#3fe07a', J: '#2a2a30' },
});

export const BIGODE = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kHHHHHHHHk...',
    '..kHHhHHHHhHHk..',
    '..kHHHHHHHHHHk..',
    '.kHssssssssssHk.',
    '.kssssssssssssk.',
    '.ksKKssssssKKsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    'kyyyyyyyyyyyyyyk',
    '.kyyssmmmmssyyk.',
    '.kSssssssssssSk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..DDkyyyyyykDD..',
    'DDDDDDwyywDDDDDD',
  ]),
  palette: { ...EYES, H: '#1a1410', h: '#3a3028', s: '#d39a70', S: '#9c6644', K: '#1a1410', y: '#ffcf4a', D: '#5a4a1a', w: '#f4ecd2' },
});

export const SOFIA = Object.freeze({
  faces: templateMoods([
    '.....kkkkkk.....',
    '...kkVVVVVVkk...',
    '..kVVvVVgVVvVk..',
    '..kVVVVVVVVVVk..',
    '.kVvVVVVVVVVvVk.',
    '.kssssssssssssk.',
    '.ksKKssssssKKsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    'ykssssssssssssky',
    'y.ksssmmmmsssk.y',
    '..kSssssssssSk..',
    '...kSssssssSk...',
    '....kkSSSSkk....',
    '..VVkqqqqqqkVV..',
    'VVVVVVVVVVVVVVVV',
  ]),
  palette: { ...EYES, V: '#5a2a8a', v: '#8a5ac0', g: '#3fe0a0', s: '#c99068', S: '#94603e', K: '#1a0a14', y: '#e8b84a', m: '#8f1640', q: '#ffcf4a' },
});

export const FAUSTO = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kggggggggk...',
    '..kgGgggggGggk..',
    '..kggggggggggk..',
    '.kgsssssssssssk.',
    '.kssssssssssssk.',
    '.ksKKssssssKKsk.',
    '.ksKepKssKpeKsk.',
    '.ksssssSSsssssk.',
    '.kssssssssssssk.',
    '.kssssmmmmssssk.',
    '.kSssssssssssSk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..XXkwwRRwwkXX..',
    'XXXXXXwRRwXXXXXX',
  ]),
  // óculos escuros redondos: o "branco" do olho é a lente, a pupila é um brilho vermelho
  palette: { ...EYES, g: '#9aa0a6', G: '#d6dade', s: '#e6d6c6', S: '#b0a090', K: '#0b0b10', e: '#2a2a3a', p: '#e0453f', m: '#5a2030', X: '#141418', w: '#e9e4d6', R: '#a3221a', r: '#8f1610' },
});

export const ALEMAO = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kYYYYYYYYk...',
    '..kYGGGYYGGGYk..',
    '..kYGgGYYGgGYk..',
    '.kYssssssssssYk.',
    '.kssssssssssssk.',
    '.ksYYssssssYYsk.',
    '.kssepsssspessk.',
    '.ksssssSSsssssk.',
    '.kYYssssssssYYk.',
    '.kYYYsmmmmsYYYk.',
    '.kYYYYYYYYYYYYk.',
    '..kYYYYYYYYYYk..',
    '...kkYYYYYYkk...',
    '..RRkRRRRRRkRR..',
    'RRRRRoRRRRoRRRRR',
  ]),
  palette: { ...EYES, Y: '#e8c860', G: '#3a4048', g: '#7fd0ff', s: '#e0a67e', S: '#a8744e', R: '#8a4a24', o: '#c9ccd0' },
});

export const COMENDADOR = Object.freeze({
  faces: templateMoods([
    '....kkkkkkkk....',
    '...kWWWWWWWWk...',
    '..kWWwWWWWwWWk..',
    '..kWWWWWWWWWWk..',
    '.kWssssssssssWk.',
    '.kssssssssssssk.',
    '.ksKKKssssKKKsk.',
    '.kssepsssyepysk.',
    '.ksssssSSsssssk.',
    '.ksWWWWWWWWWWsk.',
    '.ksssWmmmmWsttto',
    '.kSssssssssssSk.',
    '..kSssssssssSk..',
    '...kkSSSSSSkk...',
    '..VVkwwyywwkVV..',
    'VVVVVVwyywVVVVVV',
  ]),
  palette: { ...EYES, W: '#efe9dc', w: '#c9c3b6', s: '#d8a07a', S: '#a06a46', K: '#efe9dc', y: '#ffcf4a', m: '#5a1a14', t: '#6a3a1c', o: '#ff8f3a', V: '#8f1016' },
});
