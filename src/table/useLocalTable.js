import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { botAction, createTable, tableReducer, viewFor } from './tableEngine.js';

/** Quanto o bot "pensa" antes de jogar (ms): espera o voo da pedra anterior e varia um pouco. */
const BOT_THINK_MS = 1150;
const BOT_DRAW_MS = 650;

const turnKeyOf = (s) => (s.phase === 'playing' ? `${s.round}:${s.turn}` : null);

/** Liga o relógio da vez quando ela troca de mão (as compras no meio da vez não reiniciam). */
function withClock(prev, next, turnSec) {
  const key = turnKeyOf(next);
  if (prev && key === turnKeyOf(prev)) return next.turnDeadline === prev.turnDeadline ? next : { ...next, turnDeadline: prev.turnDeadline };
  return { ...next, turnDeadline: key ? Date.now() + turnSec * 1000 : null };
}

function boot({ config, turnSec }) {
  return withClock(null, tableReducer(createTable(config), { type: 'START_ROUND' }), turnSec);
}

function reducer(state, action) {
  // revanche: a mesma mesa com a semente seguinte (outra distribuição a cada revanche)
  if (action.type === 'RESET') return boot({ config: { ...action.config, seed: (state.seed + 1) >>> 0 }, turnSec: action.turnSec });
  const next = tableReducer(state, action);
  return next === state ? state : withClock(state, next, action.turnSec ?? 30);
}

/**
 * Versão 2.4: a mesa local (o TREINAR COM BOTS e a prévia do HUD). Roda o motor aqui mesmo,
 * joga pelas cadeiras de bot e dá a você o cronômetro da vez: se ele zerar, a jogada
 * automática (a mesma que o online usa para quem caiu) joga por você.
 * Devolve o espelho da sua cadeira, o relógio e as ações, no formato que a TableScreen espera.
 */
export function useLocalTable({ seats, seed, hearts = 5, coins = 100, rules, turnSec = 30, me = seats[0].id }) {
  const config = useMemo(() => ({ seed, seats, hearts, coins, rules }), [seed, seats, hearts, coins, rules]);
  const [state, dispatch] = useReducer(reducer, { config, turnSec }, boot);
  const send = useCallback((action) => dispatch({ ...action, turnSec }), [turnSec]);

  // os bots jogam sozinhos
  useEffect(() => {
    if (state.phase !== 'playing') return undefined;
    const seat = state.seats.find((s) => s.id === state.turn);
    if (!seat?.bot) return undefined;
    const action = botAction(state);
    if (!action) return undefined;
    const wait = action.type === 'DRAW' ? BOT_DRAW_MS : BOT_THINK_MS + ((state.seq * 137) % 450);
    const id = setTimeout(() => send(action), wait);
    return () => clearTimeout(id);
  }, [state, send]);

  // o seu relógio: zerou, a jogada automática joga por você
  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== me || !state.turnDeadline) return undefined;
    const id = setTimeout(() => {
      const action = botAction(state, me);
      if (action) send(action);
    }, Math.max(0, state.turnDeadline - Date.now()));
    return () => clearTimeout(id);
  }, [state, me, send]);

  const nextRound = useCallback(() => send({ type: 'START_ROUND' }), [send]);
  const rematch = useCallback(() => dispatch({ type: 'RESET', config, turnSec }), [config, turnSec]);
  const view = useMemo(() => viewFor(state, me), [state, me]);
  const clock = useMemo(() => (state.turnDeadline ? { actor: state.turn, deadline: state.turnDeadline, totalMs: turnSec * 1000 } : null), [state.turnDeadline, state.turn, turnSec]);
  return { state, view, clock, act: send, nextRound, rematch };
}
