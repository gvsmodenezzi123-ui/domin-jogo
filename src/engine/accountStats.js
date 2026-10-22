/**
 * Estatísticas da conta (Patch 0.9.1): a carreira do jogador, somada run após run e gravada
 * no aparelho em `buxaria_lifetime_stats` (JSON). Fica fora do reducer e não mexe em seed,
 * regra nem save: o App passa os eventos novos da mesa para `trackStatsEvents` (como faz com
 * as conquistas) e o Caderno de Fiado (AccountStatsModal.jsx) lê com `loadAccountStats` +
 * `subscribeAccountStats`. "Apagar tudo" (Opções) não apaga a carreira, como a meta.
 *
 *   runsStarted           runs iniciadas no Balcão (continuar um save não conta de novo)
 *   runsWon / runsLost    runs zeradas / perdidas pelo caminho
 *   totalGoldSpent        $ gastos: loja (talismã, pedra de grife, reembaralhar), Mercado
 *                         Negro, passe pago e compra paga do dorme ($3)
 *   totalMugginsClosed    pontas fechadas em múltiplo de 5 (por você)
 *   totalMugginsEarnings  $ ganhos só com esses múltiplos de 5
 *   totalTrancasWon       rodadas vencidas por tranca
 *   totalBuchasPlayed     buchas (carroças) que você jogou na mesa
 *   tilesPlayedCount      { 'a-b': vezes } das 28 pedras que você jogou ('6-6', '0-5'...)
 *   rivalsDefeated        { idDoRival: vezes } mesas vencidas contra cada rival
 *   rivalsLostTo          { idDoRival: vezes } runs que cada rival encerrou
 *   biggestLossRival      o rival que mais encerrou runs suas (id)
 *   totalCapsEarned       Tampinhas Douradas ganhas na vida (o saldo de quem já tinha
 *                         tampinhas antes do 0.9.1 entra como ponto de partida)
 */

import { loadGoldCaps } from './meta.js';
import { readRaw, writeJson } from './storage.js';

export const LIFETIME_STATS_KEY = 'buxaria_lifetime_stats';

/** De onde sai dinheiro que conta como "gasto" (eventos `coins` do reducer). */
const SPEND_SOURCES = new Set(['shop', 'reroll', 'market', 'pass']);

const emptyStats = () => ({
  v: 1,
  runsStarted: 0,
  runsWon: 0,
  runsLost: 0,
  totalGoldSpent: 0,
  totalMugginsClosed: 0,
  totalMugginsEarnings: 0,
  totalTrancasWon: 0,
  totalBuchasPlayed: 0,
  tilesPlayedCount: {},
  rivalsDefeated: {},
  rivalsLostTo: {},
  biggestLossRival: null,
  totalCapsEarned: 0,
});

const count = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const counts = (obj) =>
  Object.fromEntries(Object.entries(obj && typeof obj === 'object' ? obj : {}).filter(([, n]) => count(n) > 0).map(([k, n]) => [k, count(n)]));

/** Lê o que estiver gravado, conserta o que vier torto e completa o que faltar. */
function parse(raw) {
  const base = emptyStats();
  if (!raw) return { ...base, totalCapsEarned: loadGoldCaps() };
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!saved || typeof saved !== 'object') return base;
  const stats = { ...base };
  for (const key of Object.keys(base)) {
    if (key === 'v' || key === 'biggestLossRival') continue;
    stats[key] = typeof base[key] === 'object' ? counts(saved[key]) : count(saved[key]);
  }
  stats.biggestLossRival = typeof saved.biggestLossRival === 'string' ? saved.biggestLossRival : null;
  return stats;
}

// ---------------------------------------------------------------------------
// Leitura (com cache: useSyncExternalStore pede sempre o mesmo objeto se nada mudou)
// ---------------------------------------------------------------------------

let cache = { key: undefined, value: null };

export function loadAccountStats() {
  const raw = readRaw(LIFETIME_STATS_KEY);
  // sem nada gravado ainda, o ponto de partida acompanha o saldo de tampinhas
  const key = raw ?? `seed:${loadGoldCaps()}`;
  if (cache.key !== key || !cache.value) cache = { key, value: Object.freeze(parse(raw)) };
  return cache.value;
}

const listeners = new Set();

export function subscribeAccountStats(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function save(stats) {
  writeJson(LIFETIME_STATS_KEY, stats);
  for (const fn of [...listeners]) fn();
}

/** Cópia editável das estatísticas atuais. */
function draft() {
  const current = loadAccountStats();
  return {
    ...current,
    tilesPlayedCount: { ...current.tilesPlayedCount },
    rivalsDefeated: { ...current.rivalsDefeated },
    rivalsLostTo: { ...current.rivalsLostTo },
  };
}

/** Lê, aplica `change` numa cópia e grava uma vez só. */
function update(change) {
  const next = draft();
  change(next);
  save(next);
  return next;
}

/** Zera a carreira (painel DEV e testes). */
export function resetAccountStats() {
  save(emptyStats());
}

// ---------------------------------------------------------------------------
// Gravação (cada uma pode ser chamada sozinha; trackStatsEvents junta tudo numa gravação)
// ---------------------------------------------------------------------------

/** 'a-b' com o menor número primeiro (o id das 28 pedras do jogo). */
export const tileKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

const bump = (obj, key, by = 1) => {
  obj[key] = (obj[key] ?? 0) + by;
};

/** O rival que mais aparece em `lostTo` (empate: o que chegou primeiro lá). */
const topOf = (obj) => Object.entries(obj).reduce((best, [id, n]) => (n > (best?.[1] ?? 0) ? [id, n] : best), null);

function applyRunStart(stats) {
  stats.runsStarted += 1;
}

function applyTilePlay(stats, sideA, sideB) {
  const a = Number(sideA);
  const b = Number(sideB);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 6 || b > 6) return;
  bump(stats.tilesPlayedCount, tileKey(a, b));
  if (a === b) stats.totalBuchasPlayed += 1;
}

function applyGoldSpent(stats, amount) {
  stats.totalGoldSpent += count(amount);
}

function applyMuggins(stats, amount) {
  stats.totalMugginsClosed += 1;
  stats.totalMugginsEarnings += count(amount);
}

function applyRunEnd(stats, isVictory, rivalName) {
  if (isVictory) stats.runsWon += 1;
  else {
    stats.runsLost += 1;
    if (rivalName) bump(stats.rivalsLostTo, rivalName);
    stats.biggestLossRival = topOf(stats.rivalsLostTo)?.[0] ?? null;
  }
  // runs que começaram antes do 0.9.1 terminam aqui: o total iniciado nunca fica atrás
  stats.runsStarted = Math.max(stats.runsStarted, stats.runsWon + stats.runsLost);
}

/** Uma run começou (NOVO JOGO → INICIAR). */
export const trackRunStart = () => update(applyRunStart);
/** Uma pedra [sideA|sideB] sua entrou na mesa (bucha também soma em totalBuchasPlayed). */
export const trackTilePlay = (sideA, sideB) => update((s) => applyTilePlay(s, sideA, sideB));
/** $ gastos na loja, no Mercado Negro, num passe ou numa compra paga do dorme. */
export const trackGoldSpent = (amount) => update((s) => applyGoldSpent(s, amount));
/** Você fechou as pontas num múltiplo de 5 e levou `amount`. */
export const trackMuggins = (amount) => update((s) => applyMuggins(s, amount));
/** Você venceu uma rodada por tranca. */
export const trackTrancaWon = () => update((s) => (s.totalTrancasWon += 1));
/** Você venceu a mesa contra `rivalId`. */
export const trackRivalDefeated = (rivalId) => update((s) => rivalId && bump(s.rivalsDefeated, rivalId));
/** Tampinhas Douradas ganhas. */
export const trackCapsEarned = (amount) => update((s) => (s.totalCapsEarned += count(amount)));
/** A run acabou: zerada (`isVictory`) ou perdida para o rival `rivalName` (id, ex.: 'neide'). */
export const trackRunEnd = (isVictory, rivalName = null) => update((s) => applyRunEnd(s, isVictory, rivalName));

/** Os dois números de um id de pedra ('6-6', '3-5#c' do Canivete). */
function sidesOf(tileId) {
  const [a, b] = String(tileId ?? '').split('#')[0].split('-').map(Number);
  return [a, b];
}

/**
 * Passa os eventos novos do reducer (em ordem) e o estado depois deles; soma tudo que conta
 * para a carreira e grava uma vez só (nada contou: não grava). Devolve as estatísticas.
 * O App chama antes das conquistas: assim o ponto de partida das tampinhas (o saldo) ainda
 * não tem as tampinhas da mesa que acabou de ser vencida.
 */
export function trackStatsEvents(events, state) {
  const stats = draft();
  let touched = false;
  for (const ev of events) {
    switch (ev.type) {
      case 'runStart':
        applyRunStart(stats);
        touched = true;
        break;
      case 'tilePlaced':
        if (ev.by !== 'player') break;
        applyTilePlay(stats, ...sidesOf(ev.tileId));
        touched = true;
        break;
      case 'coins':
        if (ev.who !== 'player' || !(ev.amount < 0) || !SPEND_SOURCES.has(ev.source)) break;
        applyGoldSpent(stats, -ev.amount);
        touched = true;
        break;
      case 'drawTile':
      case 'drawPeek':
        if (ev.by !== 'player' || ev.cost?.type !== 'coins') break;
        applyGoldSpent(stats, ev.cost.amount);
        touched = true;
        break;
      case 'bonus5':
        if (ev.by !== 'player') break;
        applyMuggins(stats, ev.amount);
        touched = true;
        break;
      case 'roundEnd':
        if (ev.result?.kind !== 'tranca' || ev.result?.winner !== 'player') break;
        stats.totalTrancasWon += 1;
        touched = true;
        break;
      case 'duelEnd':
        if (ev.winner === 'player') {
          if (state?.rivalId) bump(stats.rivalsDefeated, state.rivalId);
          stats.totalCapsEarned += count(ev.caps);
          if (ev.runWon) applyRunEnd(stats, true, state?.rivalId ?? null);
        } else {
          applyRunEnd(stats, false, state?.rivalId ?? null);
        }
        touched = true;
        break;
      default:
        break;
    }
  }
  if (!touched) return loadAccountStats();
  save(stats);
  return stats;
}

// ---------------------------------------------------------------------------
// Leituras prontas para a tela
// ---------------------------------------------------------------------------

/** Aproveitamento (0–1) das runs iniciadas. */
export const winRateOf = (stats) => (stats.runsStarted > 0 ? stats.runsWon / stats.runsStarted : 0);

/** A pedra mais jogada: { id: 'a-b', a, b, count } ou null (empate: a de mais pontos). */
export function favoriteTileOf(stats) {
  let best = null;
  for (const [id, n] of Object.entries(stats.tilesPlayedCount)) {
    const [a, b] = sidesOf(id);
    if (!best || n > best.count || (n === best.count && a + b > best.a + best.b)) best = { id, a, b, count: n };
  }
  return best;
}

/** O rival que você mais derrotou: { id, count } ou null. */
export function biggestVictimOf(stats) {
  const top = topOf(stats.rivalsDefeated);
  return top ? { id: top[0], count: top[1] } : null;
}

/** O rival que mais encerrou runs suas: { id, count } ou null. */
export function biggestNemesisOf(stats) {
  const id = stats.biggestLossRival;
  return id ? { id, count: stats.rivalsLostTo[id] ?? 0 } : null;
}

const NUMBER_NAMES = ['Branco', 'Ás', 'Duque', 'Terno', 'Quadra', 'Quina', 'Sena'];

/** Nome de boteco da pedra: "Bucha de Sena", "Sena e Quina". */
export function tileNameOf(a, b) {
  if (a === b) return `Bucha de ${NUMBER_NAMES[a]}`;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return `${NUMBER_NAMES[hi]} e ${NUMBER_NAMES[lo]}`;
}
