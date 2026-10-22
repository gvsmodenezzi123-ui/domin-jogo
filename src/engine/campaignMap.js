/**
 * Mapa da campanha em teia (Patch 0.6.1, refeito no 0.6.2), no estilo Slay the Spire / FTL.
 *
 * Elenco da run (0.6.2): dos 18 personagens, cada run escala 15. Por região, o chefe é
 * fixo e 4 dos outros 5 são sorteados pela semente (um fica de fora, e muda de run para
 * run). Entre os 4, o de menos corações abre a região; os outros 3 vão para os caminhos.
 *
 * Cada região sobe 6 andares:
 *   andar 1      entrada única: o rival de abertura sorteado
 *   andares 2–5  6 nós espalhados em 1 a 3 faixas por andar (esquerda, centro, direita),
 *                ligados só entre vizinhos: os 3 rivais comuns, a LOJA DO VALTINHO, o
 *                MERCADO NEGRO e o NPC DE MOEDAS (Seu Tião), cada um UMA vez por região
 *   andar 6      todos os caminhos convergem para a mesa do chefe da região
 *
 * Garantias (conferidas a cada sorteio; se uma falhar, sorteia de novo com a mesma semente):
 *   - nenhum rival, loja, mercado ou Seu Tião aparece duas vezes na mesma região;
 *   - todo caminho tem de 1 a 3 mesas entre os andares 2 e 5, e algum caminho tem 2 ou mais;
 *   - pelo menos uma bifurcação põe lado a lado uma mesa e um desvio sem luta.
 * Tudo puro e determinístico: a mesma semente sempre gera o mesmo mapa (o save guarda só
 * a semente e o caminho percorrido).
 */

import { REGIONS } from '../data/campaign.js';
import { RIVALS } from '../data/rivals.js';
import { createSeededRng } from './dominoLogic.js';

export const FLOORS = 6;
export const LANES = 3;
/** Rivais por região numa run (entrada + 3 comuns + chefe) e na run inteira. */
export const RIVALS_PER_REGION = 5;
export const CAMPAIGN_RIVALS = RIVALS_PER_REGION * REGIONS.length;
/** Rótulos para a tela. */
export const NODE_LABEL = Object.freeze({
  combat: 'COMBATE',
  boss: 'CHEFE',
  shop: 'LOJA DO VALTINHO',
  black: 'MERCADO NEGRO',
  coins: 'SEU TIÃO DAS MOEDAS',
});
/** Prêmio do Seu Tião das Moedas. */
export const COIN_EVENT_MIN = 1;
export const COIN_EVENT_MAX = 12;

const SPECIALS = ['shop', 'black', 'coins'];
const MAX_TRIES = 200;
/** Quantos nós cada andar do meio tem (2, 2, 1, 1 em alguma ordem, ou 3, 1, 1, 1): sempre 6. */
const FLOOR_PATTERNS = [
  [2, 2, 1, 1],
  [2, 1, 2, 1],
  [2, 1, 1, 2],
  [1, 2, 2, 1],
  [1, 2, 1, 2],
  [1, 1, 2, 2],
  [3, 1, 1, 1],
  [1, 3, 1, 1],
  [1, 1, 3, 1],
  [1, 1, 1, 3],
];

export const nodeId = (region, floor, lane) => `r${region}-f${floor}-l${lane}`;

/** Mistura a semente da run com um texto (id do nó, região) para sortear sem depender da ordem. */
export function mixSeed(seed, text) {
  let h = (seed >>> 0) ^ 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const shuffled = (items, rng) => {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Elenco desta run na região: o chefe fixo e 4 dos outros 5 (sorteados pela semente).
 * O de menos corações entre os 4 abre a região; os outros 3 são os comuns dos caminhos.
 * `benched` é quem ficou de fora nesta run.
 */
export function runCast(seed, regionId) {
  const list = REGIONS[regionId - 1].nodes;
  const boss = list[list.length - 1];
  const pool = list.slice(0, -1);
  const rng = createSeededRng(mixSeed(seed ?? 0, `elenco-${regionId}`));
  const picked = shuffled(pool, rng).slice(0, RIVALS_PER_REGION - 1);
  const least = Math.min(...picked.map((id) => RIVALS[id].hearts));
  const intro = picked.find((id) => RIVALS[id].hearts === least);
  return {
    intro,
    commons: picked.filter((id) => id !== intro),
    boss,
    benched: pool.filter((id) => !picked.includes(id)),
  };
}

/** Faixas ocupadas por um andar com `count` nós (vizinhos sempre ligáveis). */
function lanesFor(count, rng) {
  if (count >= 3) return [0, 1, 2];
  if (count === 1) return [1];
  const roll = rng();
  if (roll < 0.6) return [0, 2];
  return roll < 0.8 ? [0, 1] : [1, 2];
}

/** Liga um andar ao próximo: só para a mesma faixa ou a vizinha; ninguém fica sem saída nem sem entrada. */
function linkFloors(from, to, rng) {
  const edges = new Map(from.map((a) => [a, []]));
  for (const a of from) {
    for (const b of to) if (Math.abs(a - b) <= 1) edges.get(a).push(b);
    // faixa 0 → [2] sem vizinho: liga no mais próximo
    if (!edges.get(a).length) edges.get(a).push(to.reduce((best, b) => (Math.abs(b - a) < Math.abs(best - a) ? b : best)));
  }
  // o centro às vezes abre só para dois lados: a teia não vira um "tudo liga em tudo"
  for (const a of from) {
    const out = edges.get(a);
    if (out.length === 3 && rng() < 0.45) out.splice(rng() < 0.5 ? 0 : 2, 1);
  }
  for (const b of to) {
    if ([...edges.values()].some((out) => out.includes(b))) continue;
    const a = from.reduce((best, x) => (Math.abs(x - b) < Math.abs(best - b) ? x : best));
    edges.get(a).push(b);
  }
  for (const out of edges.values()) out.sort((x, y) => x - y);
  return edges;
}

/** Todos os caminhos pelos andares 2–5, como listas de nós. */
function middlePaths(floors) {
  const paths = [];
  const walk = (node, acc) => {
    const next = [...acc, node];
    if (node.floor === 5) {
      paths.push(next);
      return;
    }
    for (const id of node.next) walk(floors.byId.get(id), next);
  };
  for (const node of floors[2]) walk(node, []);
  return paths;
}

/** Todas as ordens distintas de uma lista com repetidos (6 itens → no máximo 120). */
function arrangements(items) {
  if (items.length <= 1) return [items.slice()];
  const out = [];
  const seen = new Set();
  items.forEach((item, i) => {
    if (seen.has(item)) return;
    seen.add(item);
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of arrangements(rest)) out.push([item, ...tail]);
  });
  return out;
}

const ARRANGEMENTS = arrangements(['combat', 'combat', 'combat', ...SPECIALS]);

/** Sorteia uma teia candidata para a região; devolve null se ela não passar nas garantias. */
function tryRegion(regionId, cast, rng) {
  const pattern = FLOOR_PATTERNS[Math.floor(rng() * FLOOR_PATTERNS.length)];
  const lanesByFloor = { 1: [1], 6: [1] };
  for (let f = 2; f <= 5; f += 1) lanesByFloor[f] = lanesFor(pattern[f - 2], rng);

  const floors = { byId: new Map() };
  for (let f = 1; f <= FLOORS; f += 1) {
    floors[f] = lanesByFloor[f].map((lane) => ({ id: nodeId(regionId, f, lane), region: regionId, floor: f, lane, type: null, rivalId: null, next: [] }));
    for (const node of floors[f]) floors.byId.set(node.id, node);
  }
  for (let f = 1; f < FLOORS; f += 1) {
    const edges = linkFloors(lanesByFloor[f], lanesByFloor[f + 1], rng);
    for (const node of floors[f]) node.next = edges.get(node.lane).map((lane) => nodeId(regionId, f + 1, lane));
  }

  // entrada e chefe
  Object.assign(floors[1][0], { type: 'combat', rivalId: cast.intro });
  Object.assign(floors[6][0], { type: 'boss', rivalId: cast.boss, boss: true });

  // andares do meio: os 6 itens da região (3 mesas, loja, mercado, Seu Tião), uma vez cada
  const middle = [2, 3, 4, 5].flatMap((f) => floors[f]);
  const paths = middlePaths(floors);
  const forks = [floors[1][0], ...middle].filter((n) => n.floor <= 4 && n.next.length >= 2);
  const valid = ARRANGEMENTS.filter((types) => {
    const typeOf = new Map(middle.map((n, i) => [n, types[i]]));
    const fights = paths.map((path) => path.filter((n) => typeOf.get(n) === 'combat').length);
    if (Math.min(...fights) < 1 || Math.max(...fights) < 2) return false;
    // escolha tática: numa bifurcação, uma mesa ao lado de um desvio sem luta
    return forks.some((n) => {
      const kinds = n.next.map((id) => typeOf.get(floors.byId.get(id)) ?? 'boss');
      return kinds.includes('combat') && kinds.some((k) => k !== 'combat' && k !== 'boss');
    });
  });
  if (!valid.length) return null;
  const types = valid[Math.floor(rng() * valid.length)];
  middle.forEach((n, i) => {
    n.type = types[i];
  });
  const commons = shuffled(cast.commons, rng);
  middle.filter((n) => n.type === 'combat').forEach((n, i) => {
    n.rivalId = commons[i];
  });

  const all = Array.from({ length: FLOORS }, (_, i) => floors[i + 1]).flat();
  return {
    id: regionId,
    cast,
    entry: floors[1][0].id,
    boss: floors[6][0].id,
    floors: Array.from({ length: FLOORS }, (_, i) => floors[i + 1].map((n) => n.id)),
    nodes: all.map((n) => Object.freeze({ ...n, next: Object.freeze([...n.next]), boss: n.type === 'boss' })),
  };
}

/** Teia de reserva (se nenhum sorteio passar): dois caminhos limpos e fixos. */
function fallbackRegion(regionId, cast) {
  const [a, b, c] = cast.commons;
  const layout = {
    2: [['combat', a], ['shop']],
    3: [['black'], ['combat', b]],
    4: [['coins']],
    5: [['combat', c]],
  };
  const lanes = { 2: [0, 2], 3: [0, 2], 4: [1], 5: [1] };
  const nodes = [{ id: nodeId(regionId, 1, 1), region: regionId, floor: 1, lane: 1, type: 'combat', rivalId: cast.intro }];
  for (let f = 2; f <= 5; f += 1) {
    layout[f].forEach(([type, rivalId], i) => nodes.push({ id: nodeId(regionId, f, lanes[f][i]), region: regionId, floor: f, lane: lanes[f][i], type, rivalId: rivalId ?? null }));
  }
  nodes.push({ id: nodeId(regionId, 6, 1), region: regionId, floor: 6, lane: 1, type: 'boss', rivalId: cast.boss });
  for (const node of nodes) {
    const up = nodes.filter((n) => n.floor === node.floor + 1);
    node.next = (node.floor === 2 ? up.filter((n) => n.lane === node.lane) : up).map((n) => n.id);
  }
  return {
    id: regionId,
    cast,
    fallback: true,
    entry: nodeId(regionId, 1, 1),
    boss: nodeId(regionId, 6, 1),
    floors: Array.from({ length: FLOORS }, (_, i) => nodes.filter((n) => n.floor === i + 1).map((n) => n.id)),
    nodes: nodes.map((n) => Object.freeze({ ...n, next: Object.freeze([...n.next]), boss: n.type === 'boss' })),
  };
}

const cache = new Map();

/** A teia da run inteira para esta semente (memorizada). */
export function generateCampaign(seed = 0) {
  const key = (Number.isFinite(seed) ? seed : 0) >>> 0;
  if (cache.has(key)) return cache.get(key);
  const regions = REGIONS.map((region) => {
    const cast = runCast(key, region.id);
    const rng = createSeededRng(mixSeed(key, `regiao-${region.id}`));
    for (let i = 0; i < MAX_TRIES; i += 1) {
      const built = tryRegion(region.id, cast, rng);
      if (built) return built;
    }
    return fallbackRegion(region.id, cast);
  });
  const byId = new Map(regions.flatMap((r) => r.nodes.map((n) => [n.id, n])));
  // os 15 da run, na ordem das regiões (entrada, comuns, chefe)
  const cast = regions.flatMap((r) => [r.cast.intro, ...r.cast.commons, r.cast.boss]);
  const campaign = Object.freeze({ seed: key, regions, byId, cast });
  if (cache.size > 32) cache.clear();
  cache.set(key, campaign);
  return campaign;
}

export const campaignOf = (state) => generateCampaign(state.seed ?? 0);

export const nodeOf = (state, id) => (id ? (campaignOf(state).byId.get(id) ?? null) : null);

export const currentNode = (state) => nodeOf(state, state.run.node);

/** Para onde dá para ir agora (ids). Antes do 1º nó: a entrada da região 1. */
export function availableNodes(state) {
  const campaign = campaignOf(state);
  const node = currentNode(state);
  if (!node) return [campaign.regions[0].entry];
  if (!state.run.cleared.includes(node.id)) return [node.id];
  if (node.boss) return node.region < campaign.regions.length ? [campaign.regions[node.region].entry] : [];
  return [...node.next];
}

/** Região que o mapa mostra: a dos próximos nós (ou a do nó atual, no fim da run). */
export function mapRegionId(state) {
  const next = availableNodes(state)[0];
  return (nodeOf(state, next) ?? currentNode(state))?.region ?? 1;
}

/** Região da cena atual (loja, mercado, mesa): a do nó em que você está. */
export const regionIdOf = (state) => currentNode(state)?.region ?? mapRegionId(state);

export const regionOfState = (state) => REGIONS[regionIdOf(state) - 1];

/** Prêmio do Seu Tião neste nó ($1 a $12), fixo pela semente (sair e voltar não sorteia de novo). */
export function coinReward(seed, id) {
  const rng = createSeededRng(mixSeed(seed ?? 0, `moedas-${id}`));
  return COIN_EVENT_MIN + Math.floor(rng() * (COIN_EVENT_MAX - COIN_EVENT_MIN + 1));
}

/** Todos os caminhos de uma região, do andar 1 ao chefe (para testes e para o mapa). */
export function regionPaths(campaign, regionId) {
  const region = campaign.regions[regionId - 1];
  const paths = [];
  const walk = (id, acc) => {
    const node = campaign.byId.get(id);
    const next = [...acc, node];
    if (!node.next.length) {
      paths.push(next);
      return;
    }
    for (const n of node.next) walk(n, next);
  };
  walk(region.entry, []);
  return paths;
}
