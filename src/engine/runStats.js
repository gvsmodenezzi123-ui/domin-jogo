/**
 * Estatísticas da run em andamento (Patch 0.9.2): um coletor desacoplado que soma os eventos
 * da mesa durante a tentativa e alimenta a lousa do fim (RunSummaryBoard.jsx). Vive em
 * memória e deixa uma cópia no aparelho (`buxaria:run_stats`, com a semente da run) só para o
 * CONTINUAR de outro dia não perder a conta. Não mexe em regra, seed nem save.
 *
 *   doublePlays          buchas (carroças) que você jogou na mesa
 *   mugginsHit           vezes que você fechou as pontas num múltiplo de 5
 *   mugginsGoldEarned    $ ganhos só com esses múltiplos de 5
 *   trancaWins           rodadas vencidas por tranca (você com a menor soma)
 *   trancaLosses         rodadas perdidas por tranca
 *   damageByRival        { idDoRival: corações } que cada rival te tirou nesta run
 *   biggestRivalDamage   o rival que mais te tirou corações (id; o nome sai de data/rivals.js)
 *   tampinhasCollected   Tampinhas Douradas ganhas nesta run
 *
 * Corações que você mesmo paga (comprar com coração, Dado de Osso, Cálice) e os dos eventos do
 * mapa (Patch 0.9.4) não contam como dano de rival.
 */

import { readJson, writeJson } from './storage.js';

const STORE_KEY = 'buxaria:run_stats';
/** Motivos de coração perdido que são custo seu, não golpe do rival. */
const SELF_COSTS = new Set(['draw', 'dadoOsso', 'caliceGalo', 'dev', 'evento']);

const emptyRunStats = (seed = null) => ({
  seed,
  doublePlays: 0,
  mugginsHit: 0,
  mugginsGoldEarned: 0,
  trancaWins: 0,
  trancaLosses: 0,
  damageByRival: {},
  biggestRivalDamage: null,
  tampinhasCollected: 0,
});

const num = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** O que estava guardado no aparelho, consertado (ou uma conta zerada). */
function fromStore() {
  const saved = readJson(STORE_KEY, null);
  if (!saved || typeof saved !== 'object') return emptyRunStats();
  const base = emptyRunStats(Number.isFinite(saved.seed) ? saved.seed : null);
  for (const key of ['doublePlays', 'mugginsHit', 'mugginsGoldEarned', 'trancaWins', 'trancaLosses', 'tampinhasCollected']) base[key] = num(saved[key]);
  const damage = saved.damageByRival && typeof saved.damageByRival === 'object' ? saved.damageByRival : {};
  base.damageByRival = Object.fromEntries(Object.entries(damage).filter(([, n]) => num(n) > 0).map(([id, n]) => [id, num(n)]));
  base.biggestRivalDamage = topRival(base.damageByRival);
  return base;
}

let current = null;
const listeners = new Set();

const topRival = (damage) => Object.entries(damage).reduce((best, [id, n]) => (n > (best?.[1] ?? 0) ? [id, n] : best), null)?.[0] ?? null;

/** A conta da run agora (o mesmo objeto enquanto nada mudar). */
export function loadRunStats() {
  if (!current) current = Object.freeze(fromStore());
  return current;
}

export function subscribeRunStats(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit(next) {
  current = Object.freeze(next);
  writeJson(STORE_KEY, current);
  for (const fn of [...listeners]) fn();
  return current;
}

/** Zera a conta para uma run nova (com a semente dela). */
export const resetRunStats = (seed = null) => commit(emptyRunStats(seed));

/**
 * Passa os eventos novos do reducer (em ordem) e o estado depois deles. `runStart` zera a
 * conta; `runLoaded` (CONTINUAR) só zera se a conta guardada for de outra semente.
 * Grava uma vez só (e nada, se nada contou). Devolve a conta.
 */
export function trackRunStatsEvents(events, state) {
  let stats = null;
  const edit = () => {
    if (!stats) {
      const base = loadRunStats();
      stats = { ...base, damageByRival: { ...base.damageByRival } };
    }
    return stats;
  };
  for (const ev of events) {
    switch (ev.type) {
      case 'runStart':
        stats = emptyRunStats(state?.seed ?? null);
        break;
      case 'runLoaded':
        if ((stats ?? loadRunStats()).seed !== (state?.seed ?? null)) stats = emptyRunStats(state?.seed ?? null);
        break;
      case 'tilePlaced':
        if (ev.by === 'player' && ev.double) edit().doublePlays += 1;
        break;
      case 'bonus5':
        if (ev.by !== 'player') break;
        edit().mugginsHit += 1;
        edit().mugginsGoldEarned += num(ev.amount);
        break;
      case 'roundEnd':
        if (ev.result?.kind !== 'tranca' || !ev.result.winner) break;
        if (ev.result.winner === 'player') edit().trancaWins += 1;
        else edit().trancaLosses += 1;
        break;
      case 'heartLost': {
        if (ev.who !== 'player' || SELF_COSTS.has(ev.reason) || !state?.rivalId) break;
        const s = edit();
        s.damageByRival[state.rivalId] = (s.damageByRival[state.rivalId] ?? 0) + num(ev.amount);
        s.biggestRivalDamage = topRival(s.damageByRival);
        break;
      }
      case 'duelEnd':
        if (ev.winner === 'player') edit().tampinhasCollected += num(ev.caps);
        break;
      default:
        break;
    }
  }
  return stats ? commit(stats) : loadRunStats();
}

/** Esquece a conta guardada em memória (testes). */
export function forgetRunStats() {
  current = null;
}
