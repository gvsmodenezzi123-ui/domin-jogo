import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { scheduleTioZeTurn } from './ai/tioZeAI.js';
import DevPanel from './components/DevPanel.jsx';
import DrawChoice from './components/DrawChoice.jsx';
import OpponentHeader from './components/OpponentHeader.jsx';
import PauseMenu from './components/PauseMenu.jsx';
import PlayerRack from './components/PlayerRack.jsx';
import ProcToasts, { TOAST_ROW_PX } from './components/ProcToasts.jsx';
import RelicBar from './components/RelicBar.jsx';
import RoundOverlay from './components/RoundOverlay.jsx';
import TableBoard from './components/TableBoard.jsx';
import TitleScreen from './components/TitleScreen.jsx';
import { useProcToasts } from './components/useProcToasts.js';
import { useTripleTap } from './components/useTripleTap.js';
import { audio } from './engine/audioSynth.js';
import {
  FULL_SET,
  MAX_HEARTS,
  getDrawAvailability,
  getOpenEnds,
  getPlayableMoves,
  getValidSides,
  shuffle,
} from './engine/dominoLogic.js';
import {
  buildPlayerHint,
  deriveBanner,
  deriveHurtKey,
  deriveTioZeMood,
  deriveTioZeSpeech,
} from './engine/gameFeedback.js';
import { createInitialState, gameReducer } from './engine/gameReducer.js';
import { canUndo, endMarksFor, requiredOpeningFor, revealedTioZeTiles, rulesFor } from './engine/powers.js';

const newDeck = () => shuffle(FULL_SET);
/** Semente dos sorteios da campanha (pedra aprimorada por rodada, talismã de prêmio). */
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

const DEV_KEY = 'buxaria:dev';

function readDevFlag() {
  try {
    return window.localStorage.getItem(DEV_KEY) === '1';
  } catch {
    return false;
  }
}

function saveDevFlag() {
  try {
    window.localStorage.setItem(DEV_KEY, '1');
  } catch {
    /* sem storage (aba privada): vale só nesta sessão */
  }
}

/** Momento (ms) em que a bucha assenta na animação `tile-slam`. */
const DOUBLE_LANDING_MS = 290;

/** Atraso (ms) de cada som dentro de um mesmo lote de eventos, para não embolar. */
const FX_DELAY = {
  tilePlaced: 0,
  drawTile: 0,
  drawPeek: 0,
  pass: 0,
  discard: 0,
  undo: 0,
  proc: 90,
  bonus5: 140,
  coins: 180,
  roundEnd: 260,
  heartLost: 560,
  duelEnd: 1300,
};

function shake(element, strength = 6) {
  if (!element?.animate) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  element.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${-strength}px, ${strength / 3}px)` },
      { transform: `translate(${strength}px, ${-strength / 3}px)` },
      { transform: `translate(${-strength / 2}px, 0)` },
      { transform: `translate(${strength / 2}px, ${strength / 4}px)` },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 380, easing: 'steps(6, end)' },
  );
}

/** Som e tremida para cada evento emitido pelo reducer. */
function runEventFx(ev, shell, table) {
  const at = (fn) => setTimeout(fn, FX_DELAY[ev.type] ?? 0);
  switch (ev.type) {
    case 'tilePlaced':
      if (ev.double) {
        // bucha: pancada dupla e a mesa treme quando ela assenta
        setTimeout(() => {
          audio.doubleSlam();
          shake(table, 3);
          navigator.vibrate?.(25);
        }, DOUBLE_LANDING_MS);
      } else {
        at(() => audio.tileKnock());
      }
      break;
    case 'drawTile':
    case 'drawPeek':
      at(() => audio.drawTile());
      break;
    case 'pass':
      at(() => audio.passKnock());
      break;
    case 'discard':
      at(() => audio.passKnock());
      break;
    case 'bonus5':
      at(() => audio.coin());
      break;
    case 'coins':
      if (ev.who === 'player' && ev.amount > 0 && ev.source !== 'dev') at(() => audio.coin());
      break;
    case 'proc':
      at(() => audio.relicChime(ev.tone));
      break;
    case 'undo':
      at(() => audio.rewind());
      break;
    case 'relicGained':
      setTimeout(() => audio.relicChime('player'), 1500);
      break;
    case 'dev':
      at(() => audio.click());
      break;
    case 'roundEnd':
      at(() => (ev.result.kind === 'tranca' ? audio.lock() : audio.slam()));
      break;
    case 'heartLost':
      at(() => {
        audio.heartDamage();
        if (ev.who === 'player') {
          shake(shell, ev.amount >= 2 ? 9 : 6);
          navigator.vibrate?.(ev.amount >= 2 ? [70, 40, 90] : 60);
        }
      });
      // jingle de rodada só na contagem do fim da rodada (não em compra nem em dano direto)
      if (ev.reason !== 'draw' && !ev.direct) {
        setTimeout(() => (ev.who === 'tioZe' ? audio.roundWin() : audio.roundLose()), 1150);
      }
      break;
    case 'duelEnd':
      at(() => (ev.winner === 'player' ? audio.victory() : audio.defeat()));
      break;
    default:
      break;
  }
}

/** Último disparo de cada talismã no duelo atual: o slot pisca quando muda. */
function deriveRelicFlashes(events) {
  const flashes = {};
  for (const ev of events) {
    if (ev.type === 'duelStart') for (const key of Object.keys(flashes)) delete flashes[key];
    if (ev.type === 'proc' && ev.source === 'relic') flashes[ev.id] = ev.seq;
  }
  return flashes;
}

/**
 * Loop principal: segura o estado do duelo, agenda o Tio Zé, converte eventos
 * em som/feedback e liga os componentes.
 */
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [selectedId, setSelectedId] = useState(null);
  const [muted, setMuted] = useState(() => audio.muted);
  const [menuOpen, setMenuOpen] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(readDevFlag);
  const [devOpen, setDevOpen] = useState(false);
  const { toasts, push: pushToast, clear: clearToasts } = useProcToasts();
  const shellRef = useRef(null);
  const tableRef = useRef(null);
  const processedSeq = useRef(0);

  // Tio Zé: cada mudança de estado na vez dele agenda a próxima ação (700ms).
  // Ele espera com o menu ou o painel DEV abertos e enquanto você decide
  // (escolha do Barbante, descarte do Giz).
  useEffect(() => {
    if (menuOpen || devOpen || state.phase !== 'playing' || state.turn !== 'tioZe' || state.pending) return undefined;
    return scheduleTioZeTurn(dispatch);
  }, [state, menuOpen, devOpen]);

  // Efeitos colaterais dos eventos novos.
  useEffect(() => {
    const fresh = state.events.filter((e) => e.seq > processedSeq.current);
    if (!fresh.length) return;
    processedSeq.current = fresh[fresh.length - 1].seq;
    fresh.forEach((ev) => {
      runEventFx(ev, shellRef.current, tableRef.current);
      if (ev.type === 'proc') pushToast(ev, FX_DELAY.proc);
    });
  }, [state.events, pushToast]);

  // iOS suspende o áudio quando o app vai para o fundo.
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === 'visible' && audio.ready) audio.unlock();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pointerdown', resume, { passive: true });
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pointerdown', resume);
    };
  }, []);

  const playing = state.phase === 'playing';
  const pending = playing ? state.pending : null;
  const discardMode = pending?.type === 'discard';
  const isPlayerTurn = playing && state.turn === 'player' && !pending;
  const hand = state.hands.player;
  const playerRules = rulesFor(state, 'player');
  const requiredTileId = requiredOpeningFor(state, 'player');

  const playableIds = useMemo(() => {
    if (discardMode) return new Set(hand.map((t) => t.id));
    if (!isPlayerTurn) return new Set();
    return new Set(getPlayableMoves(hand, state.board, requiredTileId, playerRules).map((m) => m.tile.id));
  }, [discardMode, isPlayerTurn, hand, state.board, requiredTileId, playerRules]);

  const selectedTile =
    isPlayerTurn || discardMode ? (hand.find((t) => t.id === selectedId && playableIds.has(t.id)) ?? null) : null;
  const selectedSides = selectedTile && !discardMode ? getValidSides(selectedTile, state.board, playerRules) : [];

  const draw = getDrawAvailability({
    drawsThisTurn: state.drawsThisTurn,
    boneyardCount: state.boneyard.length,
    coins: state.coins.player,
    hearts: state.hearts.player,
  });
  const boardOpen = Boolean(state.board.root);
  const canDraw = isPlayerTurn && boardOpen && draw.allowed;
  const canPass = isPlayerTurn && boardOpen;
  const undoReady = canUndo(state);

  const banner = useMemo(() => deriveBanner(state.events), [state.events]);
  const speech = useMemo(() => deriveTioZeSpeech(state.events), [state.events]);
  const relicFlashes = useMemo(() => deriveRelicFlashes(state.events), [state.events]);
  const mood = deriveTioZeMood(state);
  const tioZeHurtKey = deriveHurtKey(state.events, 'tioZe');
  const playerHurtKey = deriveHurtKey(state.events, 'player');
  const revealed = revealedTioZeTiles(state);
  const endMarks = endMarksFor(state);
  const spentRelics = [state.fx.borrachaUsed && 'borracha', state.fx.relogioUsed && 'relogio'].filter(Boolean);

  const hint = buildPlayerHint({
    state,
    isPlayerTurn,
    selectedTile,
    playableCount: playableIds.size,
    drawAllowed: canDraw,
    rules: playerRules,
  });

  const play = useCallback((tileId, side) => {
    dispatch({ type: 'PLAY', actor: 'player', tileId, side });
    setSelectedId(null);
  }, []);

  const handleSelectTile = (tile) => {
    if (discardMode) {
      audio.click();
      setSelectedId(selectedTile?.id === tile.id ? null : tile.id);
      return;
    }
    if (!isPlayerTurn || !playableIds.has(tile.id)) return;
    audio.click();
    if (selectedTile?.id === tile.id) {
      const sides = getValidSides(tile, state.board, playerRules);
      if (sides.length === 1) play(tile.id, sides[0]);
      else setSelectedId(null);
      return;
    }
    setSelectedId(tile.id);
    if (tile.a === tile.b) {
      // bucha é jogada de poder: toque e vibração próprios
      audio.powerSelect();
      navigator.vibrate?.(15);
    }
  };

  const handlePlaySide = (side) => {
    if (selectedTile && !discardMode) play(selectedTile.id, side);
  };

  const handleDraw = () => {
    if (!canDraw) return;
    dispatch({ type: 'DRAW', actor: 'player' });
  };

  const handlePickDraw = (tileId) => {
    audio.click();
    dispatch({ type: 'DRAW_PICK', tileId });
  };

  const handlePass = () => {
    if (!canPass) return;
    setSelectedId(null);
    dispatch({ type: 'PASS', actor: 'player' });
  };

  const handleDiscard = () => {
    if (!discardMode || !selectedTile) return;
    dispatch({ type: 'DISCARD', tileId: selectedTile.id });
    setSelectedId(null);
  };

  const handleSkipDiscard = () => {
    audio.click();
    setSelectedId(null);
    dispatch({ type: 'SKIP_DISCARD' });
  };

  const handleUndo = () => {
    if (!undoReady) return;
    setSelectedId(null);
    dispatch({ type: 'UNDO' });
  };

  const startDuel = () => {
    audio.unlock();
    audio.startAmbience();
    audio.startMusic();
    audio.click();
    setSelectedId(null);
    clearToasts();
    dispatch({ type: 'START_DUEL', deck: newDeck(), seed: newSeed() });
  };

  const nextRound = () => {
    audio.click();
    setSelectedId(null);
    dispatch({ type: 'NEXT_ROUND', deck: newDeck() });
  };

  const backToMenu = () => {
    audio.click();
    setSelectedId(null);
    setMenuOpen(false);
    setDevOpen(false);
    clearToasts();
    dispatch({ type: 'RETURN_TO_TITLE' });
  };

  const openMenu = () => {
    audio.click();
    setMenuOpen(true);
  };

  const closeMenu = () => {
    audio.click();
    setMenuOpen(false);
  };

  const toggleMute = () => {
    audio.unlock();
    setMuted(audio.toggleMuted());
  };

  // Painel DEV: 3 toques no título (tela inicial) ou em "VOCÊ" (no duelo).
  const unlockDev = useCallback(() => {
    saveDevFlag();
    setDevUnlocked(true);
    audio.unlock();
    audio.relicChime('info');
  }, []);
  const openDevFromGame = useCallback(() => {
    unlockDev();
    setDevOpen(true);
  }, [unlockDev]);
  const titleSecretTap = useTripleTap(unlockDev);
  const gameSecretTap = useTripleTap(openDevFromGame);

  const devAction = (action) => {
    setSelectedId(null);
    dispatch(action);
    // a tranca forçada abre o resultado da rodada: fecha o painel para ver
    if (action.op === 'forceTranca') setDevOpen(false);
  };

  if (state.phase === 'title') {
    return (
      <div className="app-shell h-full">
        <TitleScreen onStart={startDuel} onSecretTap={titleSecretTap} devUnlocked={devUnlocked} />
      </div>
    );
  }

  const ends = getOpenEnds(state.board);
  const roundFinished = state.phase === 'roundOver' || state.phase === 'gameOver';

  return (
    <div ref={shellRef} className="app-shell flex h-full flex-col overflow-hidden">
      <OpponentHeader
        hearts={state.hearts.tioZe}
        maxHearts={MAX_HEARTS}
        coins={state.coins.tioZe}
        handCount={state.hands.tioZe.length}
        revealed={revealed}
        boneyardCount={state.boneyard.length}
        isTurn={playing && state.turn === 'tioZe'}
        mood={mood}
        hurtKey={tioZeHurtKey}
        speech={speech}
        speechDrop={toasts.length * TOAST_ROW_PX}
        muted={muted}
        onToggleMute={toggleMute}
        onOpenMenu={openMenu}
      />

      <RelicBar
        relics={state.relics}
        flashes={relicFlashes}
        spent={spentRelics}
        canUndo={undoReady}
        onUndo={handleUndo}
        devUnlocked={devUnlocked}
        onOpenDev={() => setDevOpen(true)}
      />

      <TableBoard
        board={state.board}
        roundKey={state.round}
        playableSides={selectedSides}
        onPlaySide={handlePlaySide}
        banner={banner}
        dimmed={roundFinished}
        previewDouble={Boolean(selectedTile && !discardMode && selectedTile.a === selectedTile.b)}
        frameRef={tableRef}
        endMarks={endMarks}
        overlay={<ProcToasts toasts={toasts} />}
      />

      <PlayerRack
        hand={hand}
        selectedId={selectedTile?.id ?? null}
        playableIds={playableIds}
        isTurn={isPlayerTurn}
        onSelectTile={handleSelectTile}
        selectedSides={selectedSides}
        onPlay={handlePlaySide}
        draw={draw}
        drawsThisTurn={isPlayerTurn ? state.drawsThisTurn : 0}
        canDraw={canDraw}
        onDraw={handleDraw}
        canPass={canPass}
        onPass={handlePass}
        hearts={state.hearts.player}
        maxHearts={MAX_HEARTS}
        coins={state.coins.player}
        ends={ends}
        hint={hint}
        discardMode={discardMode}
        onDiscard={handleDiscard}
        onSkipDiscard={handleSkipDiscard}
        onSecretTap={gameSecretTap}
      />

      {playerHurtKey > 0 && <div key={playerHurtKey} className="hurt-flash pointer-events-none fixed inset-0 z-[60]" />}

      {pending?.type === 'drawChoice' && <DrawChoice options={pending.options} onPick={handlePickDraw} />}

      {roundFinished && (
        <RoundOverlay state={state} onNext={nextRound} onRestart={startDuel} onMenu={backToMenu} />
      )}

      {menuOpen && <PauseMenu muted={muted} onToggleMute={toggleMute} onResume={closeMenu} onQuit={backToMenu} />}

      {devOpen && <DevPanel state={state} onAction={devAction} onClose={() => setDevOpen(false)} />}
    </div>
  );
}
