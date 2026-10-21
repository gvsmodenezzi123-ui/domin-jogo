/**
 * Mapa da campanha em teia (Patch 0.6.1), no estilo Slay the Spire / FTL.
 *
 * Cada run sorteia, a partir da semente dela, uma teia para cada uma das 3 regiões:
 *   andar 1      entrada única: o rival de abertura da região (Tio Zé, Marcão, Carlinhos)
 *   andares 2–5  2 ou 3 caminhos (esquerda, centro, direita) que se cruzam entre vizinhos,
 *                misturando COMBATE (um dos 4 rivais comuns da região), LOJA DO VALTINHO,
 *                MERCADO NEGRO e o NPC DE MOEDAS (Seu Tião)
 *   andar 6      todos os caminhos convergem para a mesa do chefe da região
 *
 * Garantias (conferidas a cada sorteio; se uma falhar, sorteia de novo com a mesma semente):
 *   - os 4 rivais comuns de cada região estão em algum nó (os 18 aparecem no mapa);
 *     os que ficam fora do caminho que você escolher não são enfrentados nesta run;
 *   - todo caminho tem 2 ou 3 combates entre os andares 2 e 5 e nunca o mesmo rival duas vezes;
 *   - toda região tem ao menos 1 loja, 1 mercado negro e 1 NPC de moedas, e nenhum caminho
 *     passa por dois nós especiais iguais seguidos;
 *   - pelo menos duas bifurcações põem lado a lado uma mesa e um desvio sem luta.
 * Tudo puro e determinístico: a mesma semente sempre gera o mesmo mapa (o save guarda só
 * a semente e o caminho percorrido).
 */

import { REGIONS } from '../data/campaign.js';
import { createSeededRng } from './dominoLogic.js';

export const FLOORS = 6;
export const LANES = 3;
/** Tipos de nó. */
export const NODE_TYPES = Object.freeze({ combat: 'combat', boss: 'boss', shop: 'shop', black: 'black', coins: 'coins' });
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
const MAX_TRIES = 400;

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

/** Rivais da região: o de abertura, os 4 comuns e o chefe (a ordem de `REGIONS[].nodes`). */
export function regionCast(regionId) {
  const list = REGIONS[regionId - 1].nodes;
  return { intro: list[0], commons: list.slice(1, -1), boss: list[list.length - 1] };
}

/** Faixas ocupadas em cada andar do meio (2 ou 3, sempre com vizinhos ligáveis). */
function pickLanes(rng) {
  if (rng() < 0.62) return [0, 1, 2];
  return [[0, 1], [1, 2], [0, 2]][Math.floor(rng() * 3)];
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

/** Sorteia uma teia candidata para a região; devolve null se ela não passar nas garantias. */
function tryRegion(regionId, rng) {
  const cast = regionCast(regionId);
  const lanesByFloor = { 1: [1], 6: [1] };
  for (let f = 2; f <= 5; f += 1) lanesByFloor[f] = pickLanes(rng);

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

  // andares do meio: começa sorteado e é consertado caminho a caminho
  const middle = [2, 3, 4, 5].flatMap((f) => floors[f]);
  for (const node of middle) node.type = rng() < 0.55 ? 'combat' : SPECIALS[Math.floor(rng() * SPECIALS.length)];
  const paths = middlePaths(floors);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  /** Um especial que não repete o vizinho em nenhum caminho que passa pelo nó. */
  const specialFor = (node) => {
    const banned = new Set();
    for (const path of paths) {
      const i = path.indexOf(node);
      if (i < 0) continue;
      if (path[i - 1] && path[i - 1].type !== 'combat') banned.add(path[i - 1].type);
      if (path[i + 1] && path[i + 1].type !== 'combat') banned.add(path[i + 1].type);
    }
    const ok = SPECIALS.filter((t) => !banned.has(t));
    return ok.length ? pick(ok) : null;
  };

  for (let pass = 0; pass < 40; pass += 1) {
    let changed = false;
    for (const path of paths) {
      const fights = path.filter((n) => n.type === 'combat');
      if (fights.length < 2) {
        pick(path.filter((n) => n.type !== 'combat')).type = 'combat';
        changed = true;
      } else if (fights.length > 3) {
        const node = pick(fights);
        const type = specialFor(node);
        if (type) {
          node.type = type;
          changed = true;
        }
      }
    }
    // cada especial pelo menos uma vez: troca um especial repetido (ou um combate que sobra)
    for (const special of SPECIALS) {
      if (middle.some((n) => n.type === special)) continue;
      const counts = SPECIALS.map((t) => [t, middle.filter((n) => n.type === t).length]);
      const extra = counts.filter(([, c]) => c > 1).map(([t]) => t);
      const candidates = middle.filter((n) => extra.includes(n.type));
      if (candidates.length) pick(candidates).type = special;
      else pick(middle.filter((n) => n.type === 'combat')).type = special;
      changed = true;
    }
    // nada de dois especiais iguais seguidos num caminho
    for (const path of paths) {
      for (let i = 1; i < path.length; i += 1) {
        if (path[i].type !== 'combat' && path[i].type === path[i - 1].type) {
          const type = specialFor(path[i]);
          path[i].type = type ?? 'combat';
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const combats = middle.filter((n) => n.type === 'combat');
  if (combats.length < cast.commons.length) return null;
  for (const special of SPECIALS) if (!middle.some((n) => n.type === special)) return null;

  // rivais: dois combates que dividem um caminho nunca têm o mesmo rival, e os 4 comuns aparecem
  const conflicts = new Map(combats.map((n) => [n, new Set()]));
  for (const path of paths) {
    const fights = path.filter((n) => n.type === 'combat');
    for (const a of fights) for (const b of fights) if (a !== b) conflicts.get(a).add(b);
  }
  const order = shuffled(combats, rng).sort((a, b) => a.floor - b.floor);
  const commons = shuffled(cast.commons, rng);
  const assign = (i) => {
    if (i === order.length) return commons.every((id) => order.some((n) => n.rivalId === id));
    const node = order[i];
    // preferência: quem ainda não apareceu (todos os comuns entram no mapa), depois quem
    // aparece menos no mesmo andar e no mapa (esquerda, centro e direita com rivais diferentes)
    const count = (id, test) => order.filter((n) => n.rivalId === id && test(n)).length;
    const options = commons
      .map((id, k) => ({ id, k, total: count(id, () => true), floor: count(id, (n) => n.floor === node.floor) }))
      .sort((a, b) => (a.total > 0) - (b.total > 0) || a.floor - b.floor || a.total - b.total || a.k - b.k)
      .map((o) => o.id);
    for (const id of options) {
      if ([...conflicts.get(node)].some((other) => other.rivalId === id)) continue;
      node.rivalId = id;
      if (assign(i + 1)) return true;
      node.rivalId = null;
    }
    return false;
  };
  if (!assign(0)) return null;

  // um andar com 2+ combates mostra rivais diferentes (escolher o caminho muda quem você enfrenta)
  for (let f = 2; f <= 5; f += 1) {
    const fights = floors[f].filter((n) => n.type === 'combat');
    if (fights.length >= 2 && new Set(fights.map((n) => n.rivalId)).size === 1) return null;
  }

  for (const path of paths) {
    const fights = path.filter((n) => n.type === 'combat');
    if (fights.length < 2 || fights.length > 3) return null;
    if (new Set(fights.map((n) => n.rivalId)).size !== fights.length) return null;
    for (let i = 1; i < path.length; i += 1) {
      if (path[i].type !== 'combat' && path[i].type === path[i - 1].type) return null;
    }
  }

  const all = Array.from({ length: FLOORS }, (_, i) => floors[i + 1]).flat();

  // escolha tática de verdade: pelo menos duas bifurcações oferecem mesa OU desvio sem luta
  const tactical = all.filter((n) => {
    if (n.floor > 4 || n.next.length < 2) return false;
    const types = n.next.map((id) => floors.byId.get(id).type);
    return types.includes('combat') && types.some((t) => t !== 'combat');
  });
  if (tactical.length < 2) return null;

  return {
    id: regionId,
    entry: floors[1][0].id,
    boss: floors[6][0].id,
    floors: Array.from({ length: FLOORS }, (_, i) => floors[i + 1].map((n) => n.id)),
    nodes: all.map((n) => Object.freeze({ ...n, next: Object.freeze([...n.next]), boss: n.type === 'boss' })),
  };
}

/** Teia de reserva (se nenhum sorteio passar): três caminhos limpos e fixos. */
function fallbackRegion(regionId) {
  const cast = regionCast(regionId);
  const [a, b, c, d] = cast.commons;
  const layout = {
    2: [['combat', a], ['shop'], ['combat', b]],
    3: [['coins'], ['combat', c], ['black']],
    4: [['combat', d], ['black'], ['combat', a]],
    5: [['shop'], ['combat', b], ['coins']],
  };
  const nodes = [{ id: nodeId(regionId, 1, 1), region: regionId, floor: 1, lane: 1, type: 'combat', rivalId: cast.intro }];
  for (let f = 2; f <= 5; f += 1) {
    layout[f].forEach(([type, rivalId], lane) => nodes.push({ id: nodeId(regionId, f, lane), region: regionId, floor: f, lane, type, rivalId: rivalId ?? null }));
  }
  nodes.push({ id: nodeId(regionId, 6, 1), region: regionId, floor: 6, lane: 1, type: 'boss', rivalId: cast.boss });
  for (const node of nodes) {
    if (node.floor === 1) node.next = [0, 1, 2].map((l) => nodeId(regionId, 2, l));
    else if (node.floor === 5) node.next = [nodeId(regionId, 6, 1)];
    else if (node.floor < 5) node.next = [node.lane].map((l) => nodeId(regionId, node.floor + 1, l));
    else node.next = [];
  }
  return {
    id: regionId,
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
    const rng = createSeededRng(mixSeed(key, `regiao-${region.id}`));
    for (let i = 0; i < MAX_TRIES; i += 1) {
      const built = tryRegion(region.id, rng);
      if (built) return built;
    }
    return fallbackRegion(region.id);
  });
  const byId = new Map(regions.flatMap((r) => r.nodes.map((n) => [n.id, n])));
  const campaign = Object.freeze({ seed: key, regions, byId });
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
