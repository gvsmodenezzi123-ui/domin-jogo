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
export function proc(state, { source, id, text, tone = 'player', owner }) {
  return emit(state, { type: 'proc', source, id, text, tone, owner: owner ?? (tone === 'enemy' ? 'tioZe' : 'player') });
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
  const next = emit({ ...state, hearts }, { type: 'heartLost', who, amount, reason, direct: true });
  return hearts[who] === 0 ? cheatDeath(next, who) : next;
}

const otherSeat = (seat) => (seat === 'player' ? 'tioZe' : 'player');

/**
 * Falsa Partida (talismã Necrótico): uma vez por partida, quem tem o talismã e acabou de
 * zerar fica com 1 coração, e o adversário é obrigado a comprar 2 pedras do dorme. Com a
 * rodada em jogo, ele compra agora; se a rodada já acabou, compra no começo da próxima.
 */
export function cheatDeath(state, who) {
  if (state.hearts[who] > 0) return state;
  if (!(state.relics?.[who] ?? []).includes('falsaPartida')) return state;
  const fx = state.matchFx ?? {};
  if (fx.falsaUsed?.[who]) return state;
  const foe = otherSeat(who);
  let next = {
    ...state,
    hearts: { ...state.hearts, [who]: 1 },
    matchFx: { ...fx, falsaUsed: { ...fx.falsaUsed, [who]: true } },
  };
  next = emit(next, { type: 'heartGained', who, amount: 1, reason: 'falsaPartida' });
  if (next.phase === 'playing' && next.boneyard.length) {
    // a pedra chega como ela é no baralho de quem compra (sem importar powers.js: evita ciclo)
    const dress = (t) => {
      const enhancement = next.decks?.[foe]?.[t.id];
      return enhancement ? { id: t.id, a: t.a, b: t.b, enhancement } : { id: t.id, a: t.a, b: t.b };
    };
    const taken = next.boneyard.slice(0, 2).map(dress);
    next = {
      ...next,
      boneyard: next.boneyard.slice(taken.length),
      hands: { ...next.hands, [foe]: [...next.hands[foe], ...taken] },
    };
    for (const tile of taken) next = emit(next, { type: 'drawTile', by: foe, tileId: tile.id, cost: null, forced: true });
  } else {
    next = { ...next, matchFx: { ...next.matchFx, forcedDraw: { ...next.matchFx.forcedDraw, [foe]: 2 } } };
  }
  const text = who === 'player' ? 'FALSA PARTIDA: VIVO COM 1♥, RIVAL COMPRA 2' : 'FALSA PARTIDA DELE: VIVO COM 1♥';
  return proc(next, { source: 'relic', id: 'falsaPartida', text, tone: who === 'player' ? 'player' : 'enemy', owner: who });
}
