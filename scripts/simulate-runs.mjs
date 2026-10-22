#!/usr/bin/env node
// Simulador de runs completas (Patch 0.9.0): o robô do jogo (a mesma IA dos rivais, com o
// jeito de jogar padrão) senta na sua cadeira e joga a campanha inteira, do Balcão ao
// Comendador: escolhe caminhos no mapa, compra talismãs e pedras de grife na loja, pega o
// dinheiro do Seu Tião e joga cada mesa até alguém zerar. Serve para medir a dificuldade de
// cada modo (quantas runs ele vence e até onde chega).
//
//   node scripts/simulate-runs.mjs [modo=inferno] [runs=500] [semente=1] [amostras=8] [veterano=1]
//
// `amostras`: quantas mãos do rival o robô imagina antes de cada jogada (0 = joga no
// instinto). `veterano`: com as 4 melhorias da Conta do Boteco e todos os talismãs de
// conquista liberados, como quem já zerou o normal e o difícil (é quem chega no Inferno).
//
// O robô não usa o Canivete, o Relógio nem o Mercado Negro e não planeja a run: um jogador
// atento vence mais do que ele. Os números servem para comparar os modos entre si.

import { buildTioZeView, decideTioZeAction } from '../src/ai/tioZeAI.js';
import { UPGRADE_IDS } from '../src/data/meta.js';
import { RELICS, RELIC_IDS } from '../src/data/relics.js';
import { DEFAULT_STYLE } from '../src/data/rivals.js';
import { availableNodes, nodeOf } from '../src/engine/campaignMap.js';
import { FULL_SET, createSeededRng, getOpenEnds, getValidSides, makeTile, shuffle } from '../src/engine/dominoLogic.js';
import { createInitialState, gameReducer } from '../src/engine/gameReducer.js';
import { dressTile, requiredOpeningFor, rulesFor } from '../src/engine/powers.js';
import { relicBuyBlock, tileBuyBlock } from '../src/engine/shop.js';

const RARITY_RANK = { comum: 1, raro: 2, lendario: 3, mitico: 4 };

/**
 * Jeito de jogar do robô na sua cadeira: o de um jogador atento (conta múltiplo de 5 uma
 * jogada à frente, pressiona as pontas que você não tem) que nunca paga coração para comprar.
 */
const PLAYER_STYLE = Object.freeze({ ...DEFAULT_STYLE, five: 8, fiveSetup: 3, pressure: 4.5, heavy: 1.3, heartDrawMin: 99, aggression: 1.2 });

/** Quanto vale cada coração seu perdido numa rodada, contra cada coração tirado do rival. */
const OWN_HEART = 1.6;

/**
 * Reparte de novo, ao acaso, as pedras que o robô não vê (mão do rival + dorme), respeitando
 * os números que o rival mostrou não ter: um "e se a mão dele for essa?".
 */
function determinize(state, rng, rivalMissing) {
  const hand = state.hands.tioZe;
  const fixed = hand.filter((t) => t.id.includes('#'));
  const size = hand.length - fixed.length;
  const pool = shuffle([...hand.filter((t) => !t.id.includes('#')), ...state.boneyard].map((t) => makeTile(t.a, t.b)), rng);
  const fits = (t) => !rivalMissing.has(t.a) && !rivalMissing.has(t.b);
  const chosen = [];
  const rest = [];
  for (const t of pool) (chosen.length < size && fits(t) ? chosen : rest).push(t);
  // não deu para respeitar tudo: completa com o que sobrou
  while (chosen.length < size) chosen.push(rest.shift());
  return {
    ...state,
    hands: { ...state.hands, tioZe: [...fixed, ...chosen.map((t) => dressTile(state, 'tioZe', t))] },
    boneyard: rest,
  };
}

/** Joga a rodada até o fim com as duas IAs (o robô no jeito padrão dele) e mede o saldo de corações. */
function rollout(state, action, limit = 400) {
  const before = { player: state.hearts.player, tioZe: state.hearts.tioZe };
  let s = gameReducer(state, action);
  if (s === state) return null;
  for (let i = 0; i < limit && s.phase === 'playing'; i += 1) {
    const a = s.turn === 'tioZe' && !s.pending ? { type: 'TIO_ZE_ACT' } : basicAction(s);
    let n = gameReducer(s, a);
    if (n === s) n = gameReducer(s, { type: 'PASS', actor: s.turn });
    if (n === s) break;
    s = n;
  }
  return before.tioZe - s.hearts.tioZe - OWN_HEART * (before.player - s.hearts.player);
}

/** O robô sem pensar à frente (escolhas pendentes resolvidas do jeito mais simples). */
function basicAction(state, rivalMissing = []) {
  const { pending } = state;
  if (pending?.type === 'drawChoice') return { type: 'DRAW_PICK', tileId: pending.options[0].id };
  if (pending?.type === 'discard') return { type: 'SKIP_DISCARD' };
  if (pending?.type === 'canivete') return { type: 'CANCEL_CANIVETE' };
  if (pending?.type === 'forcedPass') return { type: 'PASS', actor: 'player' };
  return decideTioZeAction({ ...buildTioZeView(state, 'player'), style: PLAYER_STYLE, suspectedMissing: rivalMissing });
}

/** As jogadas possíveis do robô agora: cada pedra em cada ponta, comprar e passar. */
function candidateActions(state) {
  const rules = rulesFor(state, 'player');
  const opening = requiredOpeningFor(state, 'player');
  const out = [];
  for (const tile of state.hands.player) {
    if (opening && tile.id !== opening) continue;
    for (const side of getValidSides(tile, state.board, rules)) out.push({ type: 'PLAY', actor: 'player', tileId: tile.id, side });
  }
  if (!out.length) {
    out.push({ type: 'DRAW', actor: 'player' });
    out.push({ type: 'PASS', actor: 'player' });
  }
  return out.filter((a) => gameReducer(state, a) !== state && !(a.type === 'DRAW' && gameReducer(state, a).hearts.player < state.hearts.player));
}

/**
 * Ação do robô na mesa, na cadeira do jogador. Com `samples` > 0 ele pensa à frente:
 * para cada jogada possível, imagina `samples` mãos do rival e joga a rodada até o fim; fica
 * com a que rende o melhor saldo de corações (um jogador que conta pedras faz isso de cabeça). `rivalMissing`: os números que o rival mostrou não ter (comprou ou passou com
 * eles na ponta), como um jogador atento lembra; a IA do rival faz o mesmo com você.
 */
function playerAction(state, rivalMissing = [], { samples = 0, rng = Math.random } = {}) {
  if (state.pending || !samples || state.turn !== 'player') return basicAction(state, rivalMissing);
  const options = candidateActions(state);
  if (options.length <= 1) return options[0] ?? basicAction(state, rivalMissing);
  const missing = new Set(rivalMissing);
  const worlds = Array.from({ length: samples }, () => determinize(state, rng, missing));
  let best = null;
  let bestValue = -Infinity;
  for (const action of options) {
    let total = 0;
    for (const world of worlds) total += rollout(world, action) ?? -99;
    if (total > bestValue) {
      bestValue = total;
      best = action;
    }
  }
  return best;
}

/** No mapa: dinheiro do Seu Tião primeiro, loja com dinheiro no bolso, senão a mesa mais fraca. */
function pickNode(state) {
  const options = availableNodes(state).map((id) => nodeOf(state, id));
  const byType = (type) => options.filter((n) => n.type === type);
  if (byType('coins').length) return byType('coins')[0].id;
  if (state.coins.player >= 8 && byType('shop').length) return byType('shop')[0].id;
  const fights = options.filter((n) => n.type === 'combat' || n.type === 'boss');
  if (fights.length) return fights[0].id;
  return options[0]?.id ?? null;
}

/** Na loja: o talismã mais raro que couber no bolso, depois uma pedra de grife se sobrar troco. */
function shopActions(state) {
  const relics = state.shop.relics
    .map((offer, index) => ({ offer, index }))
    .filter(({ offer }) => !relicBuyBlock(state, offer))
    .sort((a, b) => (RARITY_RANK[RELICS[b.offer.id].rarity] ?? 0) - (RARITY_RANK[RELICS[a.offer.id].rarity] ?? 0));
  if (relics.length) return { type: 'SHOP_BUY_RELIC', index: relics[0].index };
  const tile = state.shop.tiles.findIndex((offer) => !tileBuyBlock(state, offer) && state.coins.player - offer.price >= 4);
  if (tile >= 0) return { type: 'SHOP_BUY_TILE', index: tile };
  return { type: 'LEAVE_SHOP' };
}

/**
 * Uma run inteira. Devolve se venceu, quantas mesas ganhou, os chefes que derrubou, quem
 * acabou com ele e os talismãs/pedras de grife com que terminou.
 */
export function simulateRun({ mode = 'normal', seed = 1, maleta = 'classica', perks = [], unlocks = [], samples = 0 } = {}) {
  const rng = createSeededRng(seed * 7919 + 13);
  const deck = () => shuffle(FULL_SET, rng);
  let state = gameReducer(createInitialState(), { type: 'NEW_RUN', seed, mode, maleta, perks, unlocks });
  const wins = [];
  const stats = { rounds: 0, roundWins: 0, kinds: {}, heartSpent: 0 };
  const rivalMissing = new Set();
  let steps = 0;
  while (state.phase !== 'runWon' && state.phase !== 'gameOver') {
    steps += 1;
    if (steps > 60000) throw new Error(`run ${seed} (${mode}) não terminou na fase ${state.phase}`);
    let action;
    switch (state.phase) {
      case 'map': {
        const id = pickNode(state);
        if (!id) throw new Error(`run ${seed}: mapa sem saída`);
        action = { type: 'CHOOSE_NODE', nodeId: id, deck: deck() };
        break;
      }
      case 'playing':
        // escolha pendente sua (Giz, Barbante) se resolve antes, mesmo na vez dele
        action = state.turn === 'tioZe' && !state.pending ? { type: 'TIO_ZE_ACT' } : playerAction(state, [...rivalMissing], { samples, rng });
        break;
      case 'roundOver':
        stats.rounds += 1;
        if (state.roundResult?.winner === 'player') stats.roundWins += 1;
        stats.kinds[`${state.roundResult?.winner}:${state.roundResult?.reason}`] = (stats.kinds[`${state.roundResult?.winner}:${state.roundResult?.reason}`] ?? 0) + 1;
        action = { type: 'NEXT_ROUND', deck: deck() };
        break;
      case 'matchWon':
        wins.push(state.rivalId);
        action = { type: 'OPEN_MAP' };
        break;
      case 'shop':
        action = shopActions(state);
        break;
      case 'blackMarket':
        action = { type: 'LEAVE_MARKET' };
        break;
      case 'coinEvent':
        action = { type: 'LEAVE_EVENT' };
        break;
      case 'secretReveal':
        action = { type: 'START_SECRET', deck: deck() };
        break;
      default:
        throw new Error(`run ${seed}: fase inesperada ${state.phase}`);
    }
    const next = gameReducer(state, action);
    if (next === state) {
      // ação recusada (ex.: passe sem poder): na mesa, o rival-robô de segurança resolve
      if (state.phase === 'playing' && state.turn === 'player') {
        const fallback = gameReducer(state, { type: 'PASS', actor: 'player' });
        if (fallback === state) throw new Error(`run ${seed}: ${JSON.stringify(action)} recusada`);
        state = fallback;
        continue;
      }
      if (state.phase === 'shop') {
        state = gameReducer(state, { type: 'LEAVE_SHOP' });
        continue;
      }
      throw new Error(`run ${seed}: ${JSON.stringify(action)} recusada na fase ${state.phase} (vez: ${state.turn}, pendente: ${JSON.stringify(state.pending)})`);
    }
    // memória do robô: o que o rival não tem (zera a cada rodada)
    const ends = getOpenEnds(state.board);
    for (const ev of next.events) {
      if (ev.seq <= state.seq) continue;
      if (ev.type === 'roundStart' || ev.type === 'duelStart') rivalMissing.clear();
      if (ends && ev.by === 'tioZe' && (ev.type === 'drawTile' || ev.type === 'drawPeek' || ev.type === 'pass')) {
        rivalMissing.add(ends.left);
        rivalMissing.add(ends.right);
      }
    }
    if (next.lastPlay && next.lastPlay !== state.lastPlay && next.lastPlay.by === 'tioZe') {
      const [a, b] = next.lastPlay.tileId.split('#')[0].split('-').map(Number);
      rivalMissing.delete(a);
      rivalMissing.delete(b);
    }
    state = next;
  }
  const won = state.phase === 'runWon';
  if (won) wins.push(state.rivalId);
  return {
    won,
    tables: wins.length,
    bosses: wins.filter((id) => ['arlindo', 'beto', 'comendador'].includes(id)),
    killedBy: won ? null : state.rivalId,
    stats,
    relics: state.relics.player.length,
    grife: Object.keys(state.decks.player).length,
  };
}

/**
 * Uma mesa só, contra `rivalId`, com os seus corações cheios e sem talismãs: mede quanto cada
 * rival pesa no modo (o chefe dá para vencer?). Devolve true se você venceu.
 */
export function simulateDuel({ mode = 'normal', rivalId = 'arlindo', seed = 1, samples = 8, perks = [], unlocks = [] } = {}) {
  const rng = createSeededRng(seed * 104729 + 7);
  const deck = () => shuffle(FULL_SET, rng);
  let state = gameReducer(createInitialState(), { type: 'NEW_RUN', seed, mode, maleta: 'classica', perks, unlocks });
  state = gameReducer(state, { type: 'DEV', op: 'setRival', rivalId, deck: deck() });
  const rivalMissing = new Set();
  for (let steps = 0; steps < 20000; steps += 1) {
    if (state.phase === 'roundOver') {
      rivalMissing.clear();
      state = gameReducer(state, { type: 'NEXT_ROUND', deck: deck() });
      continue;
    }
    if (state.phase !== 'playing') break;
    const action = state.turn === 'tioZe' && !state.pending ? { type: 'TIO_ZE_ACT' } : playerAction(state, [...rivalMissing], { samples, rng });
    let next = gameReducer(state, action);
    if (next === state) next = gameReducer(state, { type: 'PASS', actor: state.turn });
    if (next === state) break;
    const ends = getOpenEnds(state.board);
    for (const ev of next.events) {
      if (ev.seq > state.seq && ends && ev.by === 'tioZe' && (ev.type === 'drawTile' || ev.type === 'drawPeek' || ev.type === 'pass')) {
        rivalMissing.add(ends.left);
        rivalMissing.add(ends.right);
      }
    }
    state = next;
  }
  return state.phase === 'matchWon' || state.phase === 'runWon' || state.phase === 'secretReveal';
}

/** Várias runs seguidas (sementes `seed`, `seed+1`, ...) e o resumo. */
export function simulateMany({ mode = 'normal', runs = 500, seed = 1, ...rest } = {}) {
  const results = [];
  for (let i = 0; i < runs; i += 1) results.push(simulateRun({ mode, seed: seed + i, ...rest }));
  const won = results.filter((r) => r.won).length;
  const killers = {};
  for (const r of results) if (r.killedBy) killers[r.killedBy] = (killers[r.killedBy] ?? 0) + 1;
  const reached = (id) => results.filter((r) => r.bosses.includes(id)).length;
  const kinds = {};
  for (const r of results) for (const [k, v] of Object.entries(r.stats.kinds)) kinds[k] = (kinds[k] ?? 0) + v;
  const rounds = results.reduce((t, r) => t + r.stats.rounds, 0);
  return {
    mode,
    runs,
    won,
    roundWinRate: results.reduce((t, r) => t + r.stats.roundWins, 0) / Math.max(1, rounds),
    kinds,
    winRate: won / runs,
    avgTables: results.reduce((s, r) => s + r.tables, 0) / runs,
    bosses: { arlindo: reached('arlindo'), beto: reached('beto'), comendador: reached('comendador') },
    killers: Object.fromEntries(Object.entries(killers).sort((a, b) => b[1] - a[1])),
  };
}

// rodando direto: node scripts/simulate-runs.mjs inferno 500 1
//                 node scripts/simulate-runs.mjs duelo inferno arlindo 200
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'duelo') {
  const [, , , mode = 'inferno', rivalId = 'arlindo', count = '200', samples = '8'] = process.argv;
  const kit = { perks: [...UPGRADE_IDS], unlocks: [...RELIC_IDS] };
  let won = 0;
  for (let i = 1; i <= Number(count); i += 1) if (simulateDuel({ mode, rivalId, seed: i, samples: Number(samples), ...kit })) won += 1;
  console.log(JSON.stringify({ mode, rivalId, duels: Number(count), won, winRate: won / Number(count) }));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode = 'inferno', runs = '500', seed = '1', samples = '8', veteran = '1'] = process.argv.slice(2);
  const started = Date.now();
  const kit = veteran === '1' ? { perks: [...UPGRADE_IDS], unlocks: [...RELIC_IDS] } : {};
  const summary = simulateMany({ mode, runs: Number(runs), seed: Number(seed), samples: Number(samples), ...kit });
  console.log(JSON.stringify({ ...summary, seconds: Math.round((Date.now() - started) / 100) / 10 }, null, 2));
}
