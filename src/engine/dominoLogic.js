/**
 * Buxaria — motor matemático do dominó (duplo-seis, duelo 1x1).
 *
 * Tudo aqui é puro e imutável: as funções recebem estado e devolvem estado novo.
 *
 * Modelo da mesa:
 *   board.root  -> primeira pedra { id, a, b, left, right }
 *   board.left  -> pedras que saem da raiz para a esquerda, em ordem de colocação
 *   board.right -> pedras que saem da raiz para a direita, em ordem de colocação
 * Cada pedra de ramo é { id, a, b, inner, outer }: `inner` encosta na pedra
 * anterior e `outer` é o valor que fica livre. Essa é a "rotação automática".
 */

export const MAX_PIP = 6;
export const HAND_SIZE = 7;
export const MAX_HEARTS = 5;
export const STARTING_COINS = 5;
export const MULTIPLE_OF_FIVE_BONUS = 3;

/** Dano por tipo de vitória na rodada. */
export const DAMAGE = Object.freeze({
  normal: 1,
  bucha: 2,
  cruzada: 3,
  tranca: 1,
});

/**
 * Escada de compra por turno: 1ª grátis, 2ª custa $3, 3ª custa 1 coração.
 * Depois da 3ª compra o turno não permite comprar mais.
 */
export const DRAW_LADDER = Object.freeze([
  Object.freeze({ type: 'free', amount: 0 }),
  Object.freeze({ type: 'coins', amount: 3 }),
  Object.freeze({ type: 'heart', amount: 1 }),
]);

export const SIDES = Object.freeze({ ROOT: 'root', LEFT: 'left', RIGHT: 'right' });

// ---------------------------------------------------------------------------
// Pedras
// ---------------------------------------------------------------------------

export function tileId(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}-${hi}`;
}

export function makeTile(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return Object.freeze({ id: tileId(lo, hi), a: lo, b: hi });
}

/** As 28 pedras do duplo-seis, ordenadas. */
export function createDoubleSixSet() {
  const tiles = [];
  for (let a = 0; a <= MAX_PIP; a += 1) {
    for (let b = a; b <= MAX_PIP; b += 1) {
      tiles.push(makeTile(a, b));
    }
  }
  return tiles;
}

export const FULL_SET = Object.freeze(createDoubleSixSet());
export const TOTAL_PIPS = FULL_SET.reduce((sum, t) => sum + t.a + t.b, 0);

/** Fisher–Yates. Não altera o array original. */
export function shuffle(items, rng = Math.random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Gerador determinístico (mulberry32) — útil para testes e seeds de rodada. */
export function createSeededRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isDouble = (tile) => tile.a === tile.b;
export const pipSum = (tile) => tile.a + tile.b;
export const handSum = (hand) => hand.reduce((sum, t) => sum + pipSum(t), 0);
export const hasValue = (tile, value) => tile.a === value || tile.b === value;

export function sortHand(hand) {
  return hand.slice().sort((x, y) => x.a - y.a || x.b - y.b);
}

/** Distribui 7 pedras para cada lado; o resto vira o Dorme. */
export function dealFromDeck(deck) {
  if (!Array.isArray(deck) || deck.length !== FULL_SET.length) {
    throw new Error(`O baralho precisa ter ${FULL_SET.length} pedras.`);
  }
  const ids = new Set(deck.map((t) => t.id));
  if (ids.size !== FULL_SET.length) {
    throw new Error('O baralho tem pedras repetidas.');
  }
  return {
    hands: {
      player: sortHand(deck.slice(0, HAND_SIZE)),
      tioZe: sortHand(deck.slice(HAND_SIZE, HAND_SIZE * 2)),
    },
    boneyard: deck.slice(HAND_SIZE * 2),
  };
}

// ---------------------------------------------------------------------------
// Mesa
// ---------------------------------------------------------------------------

export function createEmptyBoard() {
  return { root: null, left: [], right: [] };
}

export const isBoardEmpty = (board) => board.root === null;

/** Todas as pedras na mesa, da ponta esquerda até a ponta direita. */
export function boardTilesInOrder(board) {
  if (!board.root) return [];
  return [...board.left.slice().reverse(), board.root, ...board.right];
}

export function boardTileCount(board) {
  return board.root ? 1 + board.left.length + board.right.length : 0;
}

/** Pontas abertas { left, right } ou null se a mesa está vazia. */
export function getOpenEnds(board) {
  if (!board.root) return null;
  const left = board.left.length ? board.left[board.left.length - 1].outer : board.root.left;
  const right = board.right.length ? board.right[board.right.length - 1].outer : board.root.right;
  return { left, right };
}

export function endsSum(board) {
  const ends = getOpenEnds(board);
  return ends ? ends.left + ends.right : 0;
}

/** Soma das pontas é múltiplo de 5 (zero não conta). */
export function isMultipleOfFive(board) {
  const sum = endsSum(board);
  return sum > 0 && sum % 5 === 0;
}

export const canPlayOn = (tile, endValue) => hasValue(tile, endValue);

/** Lados em que a pedra encaixa: ['root'] com a mesa vazia, ou 'left'/'right'. */
export function getValidSides(tile, board) {
  const ends = getOpenEnds(board);
  if (!ends) return [SIDES.ROOT];
  const sides = [];
  if (canPlayOn(tile, ends.left)) sides.push(SIDES.LEFT);
  if (canPlayOn(tile, ends.right)) sides.push(SIDES.RIGHT);
  return sides;
}

/** Gira a pedra para que `inner` encoste no valor da ponta. */
export function orientTile(tile, endValue) {
  if (tile.a === endValue) return { inner: tile.a, outer: tile.b };
  if (tile.b === endValue) return { inner: tile.b, outer: tile.a };
  return null;
}

/** Coloca a pedra (já validada ou não) e devolve uma nova mesa. Lança erro se não encaixa. */
export function placeTile(board, tile, side) {
  if (!board.root) {
    if (side !== SIDES.ROOT) throw new Error('A primeira pedra deve ir na raiz.');
    return {
      root: { id: tile.id, a: tile.a, b: tile.b, left: tile.a, right: tile.b },
      left: [],
      right: [],
    };
  }
  if (side !== SIDES.LEFT && side !== SIDES.RIGHT) {
    throw new Error(`Lado inválido: ${side}`);
  }
  const ends = getOpenEnds(board);
  const oriented = orientTile(tile, ends[side]);
  if (!oriented) {
    throw new Error(`A pedra ${tile.id} não encaixa na ponta ${side} (${ends[side]}).`);
  }
  const placed = { id: tile.id, a: tile.a, b: tile.b, ...oriented };
  return {
    root: board.root,
    left: side === SIDES.LEFT ? [...board.left, placed] : board.left,
    right: side === SIDES.RIGHT ? [...board.right, placed] : board.right,
  };
}

/** Lista de jogadas possíveis [{ tile, side }] para uma mão. */
export function getPlayableMoves(hand, board, requiredTileId = null) {
  const moves = [];
  for (const tile of hand) {
    if (requiredTileId && tile.id !== requiredTileId) continue;
    for (const side of getValidSides(tile, board)) {
      moves.push({ tile, side });
    }
  }
  return moves;
}

export function hasAnyPlay(hand, board) {
  const ends = getOpenEnds(board);
  if (!ends) return hand.length > 0;
  return hand.some((t) => canPlayOn(t, ends.left) || canPlayOn(t, ends.right));
}

/** Quantas pedras com o valor `value` já estão na mesa. */
export function countValueOnBoard(board, value) {
  return boardTilesInOrder(board).filter((t) => hasValue(t, value)).length;
}

/**
 * Tranca fechada: as duas pontas têm o mesmo número e as 7 pedras desse número
 * já estão na mesa. Ninguém consegue jogar, nem comprando.
 */
export function isTrancaFechada(board) {
  const ends = getOpenEnds(board);
  if (!ends || ends.left !== ends.right) return false;
  return countValueOnBoard(board, ends.left) === MAX_PIP + 1;
}

/**
 * Validação de Tranca. Retorna o motivo ou null:
 *  - 'fechada': pontas iguais e esgotadas;
 *  - 'bloqueio': Dorme vazio e nenhum dos dois tem pedra que encaixe.
 * (A tranca por dois passes seguidos é tratada pelo controle de turno.)
 */
export function getTrancaReason({ board, hands, boneyard }) {
  if (!board.root) return null;
  if (isTrancaFechada(board)) return 'fechada';
  if (boneyard.length === 0 && !hasAnyPlay(hands.player, board) && !hasAnyPlay(hands.tioZe, board)) {
    return 'bloqueio';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Batida, tranca e dano
// ---------------------------------------------------------------------------

/**
 * Tipo da batida feita com `tile`, dadas as pontas ANTES da jogada.
 *  - cruzada: a pedra casa com as duas pontas ao mesmo tempo (ex.: 3|5 em pontas 3 e 5,
 *    ou bucha 4|4 em pontas 4 e 4);
 *  - bucha: a última pedra é uma bucha (dupla);
 *  - normal: qualquer outra.
 */
export function classifyBatida(tile, endsBefore) {
  if (endsBefore) {
    const tileValues = [tile.a, tile.b].sort((x, y) => x - y);
    const endValues = [endsBefore.left, endsBefore.right].sort((x, y) => x - y);
    if (tileValues[0] === endValues[0] && tileValues[1] === endValues[1]) return 'cruzada';
  }
  if (isDouble(tile)) return 'bucha';
  return 'normal';
}

export function batidaDamage(kind) {
  return DAMAGE[kind] ?? DAMAGE.normal;
}

/**
 * Resolve uma tranca: vence quem tem a MENOR soma de pontos na mão.
 * Empate = ninguém leva dano.
 */
export function resolveTranca(hands) {
  const sums = { player: handSum(hands.player), tioZe: handSum(hands.tioZe) };
  if (sums.player === sums.tioZe) {
    return { kind: 'tranca', winner: null, loser: null, damage: 0, sums };
  }
  const winner = sums.player < sums.tioZe ? 'player' : 'tioZe';
  const loser = winner === 'player' ? 'tioZe' : 'player';
  return { kind: 'tranca', winner, loser, damage: DAMAGE.tranca, sums };
}

// ---------------------------------------------------------------------------
// Abertura e compra
// ---------------------------------------------------------------------------

/**
 * Quem abre a rodada quando não há vencedor anterior: quem tiver a maior bucha.
 * Se ninguém tiver bucha, a pedra mais pesada (desempate pelo maior número).
 */
export function findOpening(hands) {
  let best = null;
  // qualquer bucha vence qualquer pedra comum
  const rank = (tile) => (isDouble(tile) ? 1000 + tile.a : pipSum(tile) * 10 + tile.b);
  for (const who of ['player', 'tioZe']) {
    for (const tile of hands[who]) {
      const r = rank(tile);
      if (!best || r > best.rank) best = { starter: who, tileId: tile.id, rank: r };
    }
  }
  return best ? { starter: best.starter, tileId: best.tileId } : null;
}

/** Custo da próxima compra no turno (ou null se o limite foi atingido). */
export function getDrawCost(drawsThisTurn) {
  return DRAW_LADDER[drawsThisTurn] ?? null;
}

/**
 * Verifica se a próxima compra é possível.
 * Comprar com coração exige pelo menos 2 corações: a compra nunca mata.
 */
export function getDrawAvailability({ drawsThisTurn, boneyardCount, coins, hearts }) {
  const cost = getDrawCost(drawsThisTurn);
  if (boneyardCount <= 0) return { allowed: false, reason: 'empty', cost };
  if (!cost) return { allowed: false, reason: 'limit', cost: null };
  if (cost.type === 'coins' && coins < cost.amount) return { allowed: false, reason: 'coins', cost };
  if (cost.type === 'heart' && hearts <= cost.amount) return { allowed: false, reason: 'hearts', cost };
  return { allowed: true, reason: null, cost };
}
