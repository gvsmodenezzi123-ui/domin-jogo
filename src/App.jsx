import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { scheduleTioZeTurn } from './ai/tioZeAI.js';
import OpponentHeader from './components/OpponentHeader.jsx';
import PlayerRack from './components/PlayerRack.jsx';
import RoundOverlay from './components/RoundOverlay.jsx';
import TableBoard from './components/TableBoard.jsx';
import TitleScreen from './components/TitleScreen.jsx';
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

const newDeck = () => shuffle(FULL_SET);

/** Momento (ms) em que a bucha assenta na animação `tile-slam`. */
const DOUBLE_LANDING_MS = 290;

/** Atraso (ms) de cada som dentro de um mesmo lote de eventos, para não embolar. */
const FX_DELAY = {
  tilePlaced: 0,
  drawTile: 0,
  pass: 0,
  bonus5: 140,
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
      at(() => audio.drawTile());
      break;
    case 'pass':
      at(() => audio.passKnock());
      break;
    case 'bonus5':
      at(() => audio.coin());
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
      if (ev.reason !== 'draw') {
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

/**
 * Loop principal: segura o estado do duelo, agenda o Tio Zé, converte eventos
 * em som/feedback e liga os componentes.
 */
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [selectedId, setSelectedId] = useState(null);
  const [muted, setMuted] = useState(() => audio.muted);
  const shellRef = useRef(null);
  const tableRef = useRef(null);
  const processedSeq = useRef(0);

  // Tio Zé: cada mudança de estado na vez dele agenda a próxima ação (700ms).
  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== 'tioZe') return undefined;
    return scheduleTioZeTurn(dispatch);
  }, [state]);

  // Efeitos colaterais dos eventos novos.
  useEffect(() => {
    const fresh = state.events.filter((e) => e.seq > processedSeq.current);
    if (!fresh.length) return;
    processedSeq.current = fresh[fresh.length - 1].seq;
    fresh.forEach((ev) => runEventFx(ev, shellRef.current, tableRef.current));
  }, [state.events]);

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

  const isPlayerTurn = state.phase === 'playing' && state.turn === 'player';
  const hand = state.hands.player;
  const requiredTileId = state.board.root ? null : state.openingTileId;

  const playableIds = useMemo(() => {
    if (!isPlayerTurn) return new Set();
    return new Set(getPlayableMoves(hand, state.board, requiredTileId).map((m) => m.tile.id));
  }, [isPlayerTurn, hand, state.board, requiredTileId]);

  const selectedTile = isPlayerTurn ? (hand.find((t) => t.id === selectedId && playableIds.has(t.id)) ?? null) : null;
  const selectedSides = selectedTile ? getValidSides(selectedTile, state.board) : [];

  const draw = getDrawAvailability({
    drawsThisTurn: state.drawsThisTurn,
    boneyardCount: state.boneyard.length,
    coins: state.coins.player,
    hearts: state.hearts.player,
  });
  const boardOpen = Boolean(state.board.root);
  const canDraw = isPlayerTurn && boardOpen && draw.allowed;
  const canPass = isPlayerTurn && boardOpen;

  const banner = useMemo(() => deriveBanner(state.events), [state.events]);
  const speech = useMemo(() => deriveTioZeSpeech(state.events), [state.events]);
  const mood = deriveTioZeMood(state);
  const tioZeHurtKey = deriveHurtKey(state.events, 'tioZe');
  const playerHurtKey = deriveHurtKey(state.events, 'player');

  const hint = buildPlayerHint({
    state,
    isPlayerTurn,
    selectedTile,
    playableCount: playableIds.size,
    drawAllowed: canDraw,
  });

  const play = useCallback((tileId, side) => {
    dispatch({ type: 'PLAY', actor: 'player', tileId, side });
    setSelectedId(null);
  }, []);

  const handleSelectTile = (tile) => {
    if (!isPlayerTurn || !playableIds.has(tile.id)) return;
    audio.click();
    if (selectedTile?.id === tile.id) {
      const sides = getValidSides(tile, state.board);
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
    if (selectedTile) play(selectedTile.id, side);
  };

  const handleDraw = () => {
    if (!canDraw) return;
    dispatch({ type: 'DRAW', actor: 'player' });
  };

  const handlePass = () => {
    if (!canPass) return;
    setSelectedId(null);
    dispatch({ type: 'PASS', actor: 'player' });
  };

  const startDuel = () => {
    audio.unlock();
    audio.startAmbience();
    audio.click();
    setSelectedId(null);
    dispatch({ type: 'START_DUEL', deck: newDeck() });
  };

  const nextRound = () => {
    audio.click();
    setSelectedId(null);
    dispatch({ type: 'NEXT_ROUND', deck: newDeck() });
  };

  const backToMenu = () => {
    audio.click();
    setSelectedId(null);
    dispatch({ type: 'RETURN_TO_TITLE' });
  };

  const toggleMute = () => {
    audio.unlock();
    setMuted(audio.toggleMuted());
  };

  if (state.phase === 'title') {
    return (
      <div className="app-shell h-full">
        <TitleScreen onStart={startDuel} />
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
        boneyardCount={state.boneyard.length}
        isTurn={state.phase === 'playing' && state.turn === 'tioZe'}
        mood={mood}
        hurtKey={tioZeHurtKey}
        speech={speech}
        muted={muted}
        onToggleMute={toggleMute}
      />

      <TableBoard
        board={state.board}
        playableSides={selectedSides}
        onPlaySide={handlePlaySide}
        banner={banner}
        dimmed={roundFinished}
        previewDouble={Boolean(selectedTile && selectedTile.a === selectedTile.b)}
        frameRef={tableRef}
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
      />

      {playerHurtKey > 0 && <div key={playerHurtKey} className="hurt-flash pointer-events-none fixed inset-0 z-[60]" />}

      {roundFinished && (
        <RoundOverlay state={state} onNext={nextRound} onRestart={startDuel} onMenu={backToMenu} />
      )}
    </div>
  );
}
