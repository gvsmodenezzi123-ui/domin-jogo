import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { botAction, createTable, tableReducer, viewFor } from './tableEngine.js';

/** Quanto o bot "pensa" antes de jogar (ms): espera o voo da pedra anterior e varia um pouco. */
const BOT_THINK_MS = 1150;
const BOT_DRAW_MS = 650;

function boot(config) {
  return tableReducer(createTable(config), { type: 'START_ROUND' });
}

function reducer(state, action) {
  // revanche: a mesma mesa com a semente seguinte (outra distribuição a cada revanche)
  if (action.type === 'RESET') return boot({ ...action.config, seed: (state.seed + 1) >>> 0 });
  return tableReducer(state, action);
}

/**
 * Versão 2.4: a mesa local (a prévia do HUD e, depois, o treino com bots). Roda o motor aqui
 * mesmo, joga pelas cadeiras de bot e dá a você o cronômetro da vez: se ele zerar, a jogada
 * automática (a mesma que o online usa para quem caiu) joga por você.
 * Devolve o espelho da sua cadeira, o relógio e as ações, no formato que a TableScreen espera.
 */
export function useLocalTable({ seats, seed, hearts = 5, coins = 100, rules, turnSec = 30, me = seats[0].id }) {
  const config = useMemo(() => ({ seed, seats, hearts, coins, rules }), [seed, seats, hearts, coins, rules]);
  const [state, dispatch] = useReducer(reducer, config, boot);
  const [deadline, setDeadline] = useState(null);
  const turnSeq = useRef(-1);

  // começa o relógio quando a vez muda de mão (ou começa uma rodada)
  const turnKey = state.phase === 'playing' ? `${state.round}:${state.turn}` : null;
  useEffect(() => {
    if (!turnKey) {
      setDeadline(null);
      return;
    }
    turnSeq.current = state.seq;
    setDeadline(Date.now() + turnSec * 1000);
    // só quando a vez troca; as compras no meio da vez não reiniciam o relógio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnKey, turnSec]);

  // os bots jogam sozinhos
  useEffect(() => {
    if (state.phase !== 'playing') return undefined;
    const seat = state.seats.find((s) => s.id === state.turn);
    if (!seat?.bot) return undefined;
    const action = botAction(state);
    if (!action) return undefined;
    const wait = action.type === 'DRAW' ? BOT_DRAW_MS : BOT_THINK_MS + ((state.seq * 137) % 450);
    const id = setTimeout(() => dispatch(action), wait);
    return () => clearTimeout(id);
  }, [state]);

  // o seu relógio: zerou, a jogada automática joga por você
  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== me || !deadline) return undefined;
    const id = setTimeout(() => {
      const action = botAction(state, me);
      if (action) dispatch(action);
    }, Math.max(0, deadline - Date.now()));
    return () => clearTimeout(id);
  }, [state, me, deadline]);

  const act = useCallback((action) => dispatch(action), []);
  const nextRound = useCallback(() => dispatch({ type: 'START_ROUND' }), []);
  const rematch = useCallback(() => dispatch({ type: 'RESET', config }), [config]);
  const view = useMemo(() => viewFor(state, me), [state, me]);
  const clock = useMemo(() => (deadline ? { actor: state.turn, deadline, totalMs: turnSec * 1000 } : null), [deadline, state.turn, turnSec]);
  return { state, view, clock, act, nextRound, rematch };
}
