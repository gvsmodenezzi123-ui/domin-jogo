/**
 * Pequenas transições de estado compartilhadas pelo reducer e pelos ganchos
 * das relíquias e peças aprimoradas (src/data/). Todas são puras.
 */

export const MAX_EVENTS = 40;

/** Registra um evento com `seq` crescente (a UI transforma em som, banner, fala). */
export function emit(state, event) {
  const seq = state.seq + 1;
  const events = [...state.events, { ...event, seq }];
  return { ...state, seq, events: events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events };
}

/** Atualiza os efeitos da rodada (pontas congeladas, curinga, usos por rodada...). */
export function patchFx(state, patch) {
  return { ...state, fx: { ...state.fx, ...patch } };
}

/** Uma relíquia ou peça aprimorada disparou: vira aviso na tela e brilho no slot. */
export function proc(state, { source, id, text, tone = 'player' }) {
  return emit(state, { type: 'proc', source, id, text, tone });
}

export function gainCoins(state, who, amount, source) {
  if (amount <= 0) return state;
  const coins = { ...state.coins, [who]: state.coins[who] + amount };
  const stats = who === 'player' ? { ...state.stats, coinsEarned: state.stats.coinsEarned + amount } : state.stats;
  return emit({ ...state, coins, stats }, { type: 'coins', who, amount, source });
}

export function loseCoins(state, who, amount, source) {
  const paid = Math.min(amount, state.coins[who]);
  if (paid <= 0) return state;
  const coins = { ...state.coins, [who]: state.coins[who] - paid };
  return emit({ ...state, coins }, { type: 'coins', who, amount: -paid, source });
}

/** Dano direto, fora da contagem da rodada (Rubi, Dedal, Anel, painel DEV). */
export function directDamage(state, who, amount, reason) {
  if (amount <= 0 || state.hearts[who] <= 0) return state;
  const hearts = { ...state.hearts, [who]: Math.max(0, state.hearts[who] - amount) };
  return emit({ ...state, hearts }, { type: 'heartLost', who, amount, reason, direct: true });
}
