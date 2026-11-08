/**
 * Versão 2.12: o roteiro da abertura deitada, "Efeito Dominó". Madrugada, o boteco fechado e
 * vazio; a gelada no balcão destampa sozinha, a tampinha voa e derruba a primeira pedra de uma
 * fileira que atravessa o salão inteiro: o balcão, a escadinha de engradados, a mesa de lata, a
 * outra escadinha e o chão de ladrilho, passando pela jukebox, pelo gato que dormia e pela
 * geladeira, até a pedra gigante (o carretão), que cai no chão com tudo e acende o neon do
 * BUXARIA. A câmera corre de lado, atrás da onda.
 *
 * Aqui só a conta (tudo é função do tempo, para o PULAR, a pausa e o som baterem): onde fica cada
 * pedra, quando cada uma cai, o ângulo dela, a câmera e os momentos fortes. As unidades são os
 * pixels da pintura (o quadro visível tem 500 × 225; o salão inteiro, PANO_W).
 */

export const VIEW_W = 500;
export const VIEW_H = 225;
/** O salão pintado inteiro (largura) e a sobra em volta de cada quadro. */
export const PANO_W = 1400;
export const PAD = Object.freeze({ x: 24, y: 44 });

/** A pedra em pé (de lado): 4 de largura (a face e a espessura), 12 de altura. */
export const TILE_W = 4;
export const TILE_H = 12;
const SPACING = 8;

/** Os pisos por onde a fileira passa: balcão, mesa e chão (y = onde a pedra pisa). */
export const FLOORS = Object.freeze({ counter: 118, table: 150, ground: 206 });
/** As escadinhas de engradados: a pedra pisa no alto de cada degrau. */
const STEPS_A = [
  { x: 268, y: 129 },
  { x: 283, y: 140 },
];
const STEPS_B = [
  { x: 480, y: 161 },
  { x: 495, y: 172 },
  { x: 510, y: 183 },
  { x: 525, y: 194 },
];

/** A gelada que destampa sozinha e a pedra gigante do fim. */
export const BOTTLE = Object.freeze({ x: 40, y: FLOORS.counter });
export const GIANT = Object.freeze({ x: 1090, y: FLOORS.ground, w: 13, h: 44 });
/** O neon do BUXARIA na parede (centro) e o gato que dormia no saco de juta. */
export const NEON = Object.freeze({ x: 1110, y: 46 });
export const CAT = Object.freeze({ x: 858, y: FLOORS.ground - 2, fridgeX: 928, fridgeTop: 101 });

function run(x0, x1, y) {
  const out = [];
  for (let x = x0; x <= x1; x += SPACING) out.push({ x, y });
  return out;
}

/** A fileira inteira, da primeira pedra (a da tampinha) à que encosta na gigante. */
export const TILES = Object.freeze(
  [...run(62, 258, FLOORS.counter), ...STEPS_A, ...run(298, 466, FLOORS.table), ...STEPS_B, ...run(540, 1078, FLOORS.ground)].map((t, i, all) => {
    const next = all[i + 1];
    const drop = next ? next.y - t.y : 0;
    // encosta na próxima: no mesmo piso, deita até 64°; na beirada de um degrau, vai ao chão
    const rest = !next ? 58 : drop > 0 ? 90 : 64;
    const gap = next ? next.x - (t.x + TILE_W) : GIANT.x - (t.x + TILE_W);
    const touch = drop > 0 ? 52 : Math.min(60, (Math.asin(Math.min(1, gap / TILE_H)) * 180) / Math.PI);
    return Object.freeze({ i, x: t.x, y: t.y, rest, touch, face: (i * 5 + 2) % 7, face2: (i * 3 + 5) % 7 });
  }),
);

/** Os tempos (segundos desde o começo da cena). */
export const BEATS = Object.freeze({
  fadeIn: 0.5,
  pop: 0.55,
  /** a tampinha bate na primeira pedra */
  chain: 1.45,
});

/** Quanto tempo a onda leva de uma pedra para a seguinte: começa calma e vai embalando. */
function gapOf(i) {
  const t = i / (TILES.length - 1);
  return 0.074 - 0.047 * Math.pow(t, 0.8);
}

/** Quando cada pedra começa a cair (a anterior encostou nela). */
export const HIT_TIMES = Object.freeze(
  TILES.reduce((acc, _, i) => {
    acc.push(i === 0 ? BEATS.chain : acc[i - 1] + gapOf(i - 1));
    return acc;
  }, []),
);

const LAST = TILES.length - 1;
/** A última pedra encosta na gigante; ela pende devagar e bate no chão (o SLAM). */
export const GIANT_HIT = HIT_TIMES[LAST] + gapOf(LAST);
export const GIANT_FALL = 0.78;
export const SLAM = GIANT_HIT + GIANT_FALL;
/** O neon acende letra por letra logo depois da batida; a cena segura o logo e entrega. */
export const NEON_ON = SLAM + 0.16;
export const NEON_FULL = NEON_ON + 1.0;
export const SCENE_SECONDS = NEON_FULL + 1.7;
/** O fim em que a abertura some por cima da tela inicial. */
export const HANDOFF = 0.5;

/** O ângulo (graus, para a direita) da pedra `i` no tempo `t`. */
export function tileAngle(i, t) {
  const tile = TILES[i];
  const start = HIT_TIMES[i];
  if (t <= start) return 0;
  const gap = gapOf(i);
  const u = (t - start) / gap;
  // até encostar na próxima, cai acelerando (gravidade); depois deita até o descanso
  if (u <= 1) return tile.touch * Math.pow(u, 1.7);
  const v = Math.min(1, (u - 1) / 1.3);
  return tile.touch + (tile.rest - tile.touch) * (1 - (1 - v) * (1 - v));
}

/** O ângulo da pedra gigante: pende devagar e despenca (90° = deitada no chão). */
export function giantAngle(t) {
  if (t <= GIANT_HIT) return 0;
  const s = Math.min(1, (t - GIANT_HIT) / GIANT_FALL);
  return 90 * Math.pow(s, 2.4);
}

/** Onde a onda está (x da pedra que está sendo derrubada), contínuo no tempo. */
export function frontX(t) {
  if (t <= HIT_TIMES[0]) return TILES[0].x;
  if (t >= GIANT_HIT) return GIANT.x;
  let lo = 0;
  let hi = LAST;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (HIT_TIMES[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = TILES[lo];
  const nextX = lo === LAST ? GIANT.x : TILES[lo + 1].x;
  const nextT = lo === LAST ? GIANT_HIT : HIT_TIMES[lo + 1];
  return a.x + (nextX - a.x) * Math.min(1, (t - HIT_TIMES[lo]) / (nextT - HIT_TIMES[lo]));
}

/** A câmera (x da esquerda do quadro): parada no começo, corre atrás da onda e para no neon. */
export const CAM_END = NEON.x - VIEW_W / 2;
const LEAD = 200;
export function cameraX(t) {
  // a câmera vem um pouquinho atrás da onda (o olho acompanha a queda)
  const x = frontX(t - 0.18) - LEAD;
  const settle = t > GIANT_HIT ? Math.min(1, (t - GIANT_HIT) / 0.6) : 0;
  const follow = Math.max(0, Math.min(CAM_END, x));
  return follow + (CAM_END - follow) * (1 - (1 - settle) * (1 - settle));
}

/** A tampinha: sai do gargalo, sobe girando e bate no alto da primeira pedra. */
export function capAt(t) {
  if (t < BEATS.pop) return null;
  const from = { x: BOTTLE.x + 3, y: BOTTLE.y - 22 };
  const to = { x: TILES[0].x + 1, y: TILES[0].y - TILE_H - 1 };
  if (t <= BEATS.chain) {
    const s = (t - BEATS.pop) / (BEATS.chain - BEATS.pop);
    const arc = 46;
    return { x: from.x + (to.x - from.x) * s, y: from.y + (to.y - from.y) * s - arc * 4 * s * (1 - s), spin: s * 7.5 };
  }
  // ricocheteia para trás do balcão e some
  const s = (t - BEATS.chain) / 0.55;
  if (s >= 1) return null;
  return { x: to.x - 18 * s, y: to.y - 14 * s + 40 * s * s, spin: 7.5 + s * 4 };
}

/** O gato: dorme; acorda quando a onda chega perto; pula para cima da geladeira e fica olhando. */
export function catAt(t) {
  const fx = frontX(t);
  if (fx < CAT.x - 150) return { pose: 'sleep', x: CAT.x, y: CAT.y };
  if (fx < CAT.x - 62) return { pose: 'alert', x: CAT.x, y: CAT.y };
  const jumpT = HIT_TIMES[TILES.findIndex((tile) => tile.x >= CAT.x - 62)] ?? GIANT_HIT;
  const s = Math.min(1, (t - jumpT) / 0.42);
  if (s >= 1) return { pose: 'perch', x: CAT.fridgeX, y: CAT.fridgeTop };
  const x = CAT.x + (CAT.fridgeX - CAT.x) * s;
  const y = CAT.y + (CAT.fridgeTop - CAT.y) * s - 34 * 4 * s * (1 - s);
  return { pose: 'leap', x, y };
}

/** O quanto o neon está aceso (0..1) e cada letra: acende uma a uma, piscando. */
export function neonAt(t) {
  if (t < NEON_ON) return { glow: 0, letters: 0, sub: 0 };
  const u = (t - NEON_ON) / (NEON_FULL - NEON_ON);
  const letters = Math.min(7, Math.floor(u * 9));
  // dois tremeliques antes de firmar
  const flicker = u < 1 && (Math.floor(t * 23) % 5 === 0 || (u > 0.55 && u < 0.62)) ? 0.35 : 1;
  const glow = Math.min(1, u * 1.2) * flicker;
  const sub = t < NEON_FULL ? 0 : Math.min(1, (t - NEON_FULL) / 0.25);
  return { glow, letters, sub };
}

/** O tremor da câmera na batida da gigante (px). */
export function shakeAt(t) {
  const s = t - SLAM;
  if (s < 0 || s > 0.42) return { x: 0, y: 0 };
  const k = (1 - s / 0.42) * 4;
  return { x: Math.round(Math.sin(s * 90) * k), y: Math.round(Math.cos(s * 71) * k * 0.6) };
}
