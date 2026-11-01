/**
 * Versão 2.4: o que o HUD da mesa de 2 a 4 precisa saber de cada cadeira: a cor dela, a ordem
 * vista de quem está jogando e o texto curto do balão da última jogada.
 */

/** A cor de cada cadeira, pela ordem em que sentaram (âmbar, verde-água, tijolo, lilás). */
export const SEAT_COLORS = Object.freeze(['#f0b64a', '#5cc4b8', '#e4694c', '#b493e6']);

/** Os rostos que a mesa oferece (retratos 64×64 do jogo), na ordem do seletor do saguão. */
export const TABLE_FACES = Object.freeze(['marquinhos', 'neide', 'baiano', 'sofia', 'zeca', 'odete', 'carlinhos', 'bigode', 'cida', 'fausto', 'genesio', 'tonho']);

/** A cor da cadeira vem do número dela ("s2" → a 3ª cor), igual no saguão e na mesa (mesmo com cadeira vazia no meio). */
export function colorOf(state, id) {
  const n = /^s\d$/.test(String(id)) ? Number(String(id).slice(1)) : Math.max(0, state.seats.findIndex((s) => s.id === id));
  return SEAT_COLORS[n % SEAT_COLORS.length];
}

/** As cadeiras na ordem de jogo a partir de `me` (você primeiro, depois quem joga em seguida). */
export function seatsFrom(seats, me) {
  const at = Math.max(0, seats.findIndex((s) => s.id === me));
  return [...seats.slice(at), ...seats.slice(0, at)];
}

const tileLabel = (tileId) => {
  const [a, b] = String(tileId).split('-');
  return `${a}|${b}`;
};

/** O texto do balão da última jogada de uma cadeira ("JOGOU 6|3", "COMPROU 2", "PASSOU"). */
export function bubbleText(action) {
  if (!action) return null;
  if (action.kind === 'play') return `JOGOU ${tileLabel(action.tileId)}`;
  if (action.kind === 'draw') return action.count > 1 ? `COMPROU ${action.count}` : 'COMPROU';
  if (action.kind === 'pass') return action.cost > 0 ? `PASSOU −$${action.cost}` : 'PASSOU';
  return null;
}

/** "1º", "2º"... */
export const ordinal = (n) => `${n}º`;

/** Nome curto para a plaquinha (até 8 letras: "MARQUINHOS" vira "MARQUINH."). */
export function plateName(name) {
  const up = String(name ?? '').toUpperCase();
  return up.length > 9 ? `${up.slice(0, 8)}.` : up;
}
