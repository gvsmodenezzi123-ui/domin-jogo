import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { scheduleTioZeTurn } from './ai/tioZeAI.js';
import CampaignMap from './components/CampaignMap.jsx';
import DevPanel from './components/DevPanel.jsx';
import DrawChoice from './components/DrawChoice.jsx';
import FloatingTexts from './components/FloatingTexts.jsx';
import InfoBalloon from './components/InfoBalloon.jsx';
import PauseMenu from './components/PauseMenu.jsx';
import PlayerRack from './components/PlayerRack.jsx';
import RivalBench from './components/RivalBench.jsx';
import RoundOverlay from './components/RoundOverlay.jsx';
import Shop from './components/Shop.jsx';
import TableBoard, { AI_FLIGHT_MS } from './components/TableBoard.jsx';
import TitleScreen from './components/TitleScreen.jsx';
import { prefersReducedMotion } from './components/motion.js';
import { centerOf, useFloats } from './components/useFloats.js';
import { useLongPress } from './components/useLongPress.js';
import { useTripleTap } from './components/useTripleTap.js';
import { REGIONS } from './data/campaign.js';
import { getEnhancement } from './data/enhancedTiles.js';
import { getRelic } from './data/relics.js';
import { getRival } from './data/rivals.js';
import { audio } from './engine/audioSynth.js';
import {
  FULL_SET,
  MAX_HEARTS,
  boardTilesInOrder,
  getDrawAvailability,
  getOpenEnds,
  getPlayableMoves,
  getValidSides,
  shuffle,
} from './engine/dominoLogic.js';
import { bonusFloat, buildPlayerHint, deriveHurtKey, deriveTioZeMood, deriveTioZeSpeech } from './engine/gameFeedback.js';
import { createInitialState, gameReducer } from './engine/gameReducer.js';
import {
  canUndo,
  endMarksFor,
  knownPlayerTiles,
  requiredOpeningFor,
  revealedTioZeTiles,
  rulesFor,
  spentRelicsOf,
} from './engine/powers.js';
import {
  clearRunSave,
  discover,
  haptic,
  loadCollection,
  loadRunSave,
  loadSettings,
  resetProgress,
  saveSettings,
  writeRunSave,
} from './engine/progress.js';
import { snapshotRun } from './engine/save.js';
import { sellPriceOf } from './engine/shop.js';

const newDeck = () => shuffle(FULL_SET);
/** Semente da run: sorteia as vitrines da loja. */
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
/** Destaque da jogada do rival depois que a pedra pousa (anel amarelo + [a|b]). */
const AI_SPOTLIGHT_MS = 800;

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

function shake(element, strength = 6, duration = 380) {
  if (!element?.animate || prefersReducedMotion()) return;
  element.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${-strength}px, ${strength / 3}px)` },
      { transform: `translate(${strength}px, ${-strength / 3}px)` },
      { transform: `translate(${-strength / 2}px, 0)` },
      { transform: `translate(${strength / 2}px, ${strength / 4}px)` },
      { transform: 'translate(0, 0)' },
    ],
    { duration, easing: 'steps(6, end)' },
  );
}

/** Som e tremida para cada evento emitido pelo reducer (`offset`: espera o voo da pedra do rival). */
function runEventFx(ev, shell, table, offset = 0) {
  const at = (fn, extra = 0) => setTimeout(fn, offset + (FX_DELAY[ev.type] ?? 0) + extra);
  switch (ev.type) {
    case 'tilePlaced':
      // a pedra do rival tem o próprio pouso (App: voo + SLAM)
      if (ev.by !== 'player') break;
      if (ev.double) {
        // bucha: pancada dupla e a mesa treme quando ela assenta
        at(() => {
          audio.doubleSlam();
          if (ev.enhancement) audio.enhancedPlace(ev.enhancement);
          shake(table, 3);
          haptic(25);
        }, DOUBLE_LANDING_MS);
      } else {
        at(() => {
          audio.tileKnock();
          if (ev.enhancement) audio.enhancedPlace(ev.enhancement);
        });
      }
      break;
    case 'drawTile':
    case 'drawPeek':
    case 'shopReroll':
      at(() => audio.drawTile());
      break;
    case 'pass':
    case 'discard':
      at(() => audio.passKnock());
      break;
    case 'bonus5':
      at(() => audio.coin());
      break;
    case 'coins':
      if (ev.who === 'player' && ev.amount > 0 && ev.source !== 'dev') at(() => audio.coin());
      break;
    case 'shopBuy':
      at(() => audio.purchase());
      break;
    case 'shopOpen':
      at(() => audio.relicChime('info'));
      break;
    case 'proc':
      at(() => audio.relicChime(ev.tone));
      break;
    case 'undo':
      at(() => audio.rewind());
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
          haptic(ev.amount >= 2 ? [70, 40, 90] : 60);
        }
      });
      // jingle de rodada só na contagem do fim da rodada (não em compra nem em dano direto)
      if (ev.reason !== 'draw' && !ev.direct) {
        at(() => (ev.who === 'tioZe' ? audio.roundWin() : audio.roundLose()), 1150 - FX_DELAY.heartLost);
      }
      break;
    case 'duelEnd':
      at(() => (ev.winner === 'player' ? audio.victory() : audio.defeat()));
      break;
    default:
      break;
  }
}

/** Último disparo de cada talismã na partida atual, por dono: o slot pisca quando muda. */
function deriveRelicFlashes(events) {
  const flashes = { player: {}, tioZe: {} };
  for (const ev of events) {
    if (ev.type === 'duelStart') {
      flashes.player = {};
      flashes.tioZe = {};
    }
    if (ev.type === 'proc' && ev.source === 'relic') flashes[ev.owner === 'tioZe' ? 'tioZe' : 'player'][ev.id] = ev.seq;
  }
  return flashes;
}

const tileName = (tileId) => {
  const [a, b] = tileId.split('#')[0].split('-');
  return `[${a}|${b}]`;
};

/** De onde sai o aviso de um disparo: o slot do talismã, a pedra na mesa ou o retrato do rival. */
function procOrigin(ev, tileId, table) {
  if (ev.source === 'relic') {
    const slot = centerOf(`[data-relic-slot="${ev.owner ?? 'player'}:${ev.id}"]`);
    if (slot) return { x: slot.x, y: slot.y - 14 };
  }
  if (ev.source === 'rival') {
    const avatar = centerOf('[data-rival-avatar]');
    if (avatar) return { x: Math.min(avatar.x + 70, window.innerWidth - 90), y: avatar.y + 40 };
  }
  if (tileId) {
    const tile = centerOf(`[data-tile-id="${tileId}"]`);
    if (tile) return tile;
  }
  const felt = table?.getBoundingClientRect();
  return felt ? { x: felt.left + felt.width / 2, y: felt.top + felt.height * 0.3 } : null;
}

/** Conteúdo do balão do toque longo. */
function inspectInfo(payload, state, rival) {
  if (payload.kind === 'tile' || payload.kind === 'offerTile') {
    const tileId = payload.kind === 'tile' ? payload.tile.id : payload.tileId;
    const enhancement = getEnhancement(payload.kind === 'tile' ? payload.tile.enhancement : payload.enhancement);
    if (!enhancement) return null;
    return {
      title: `${tileName(tileId)} DE ${enhancement.name.toUpperCase()}`,
      rarity: enhancement.rarity,
      description: enhancement.description,
      extra: payload.kind === 'offerTile' ? `SUBSTITUI O SEU ${tileName(tileId)} COMUM` : null,
    };
  }
  const relic = getRelic(payload.id);
  if (!relic) return null;
  let extra = null;
  if (payload.owner === 'tioZe') extra = `DE ${rival.name.toUpperCase()}: O EFEITO É DELE, CONTRA VOCÊ`;
  else if (payload.owner === 'shop') extra = `PREÇO: $${relic.price}`;
  else if (state.phase === 'shop') extra = `VENDE POR $${sellPriceOf(relic.id)}`;
  return { title: relic.name.toUpperCase(), rarity: relic.rarity, description: relic.description, extra };
}

/** Tudo que está à vista agora e entra no Livro de Boteco. */
function seenNow(state) {
  const tiles = new Set(Object.values(state.decks.player));
  for (const t of [...state.hands.player, ...boardTilesInOrder(state.board)]) if (t.enhancement) tiles.add(t.enhancement);
  for (const offer of state.shop?.tiles ?? []) tiles.add(offer.enhancement);
  return {
    relics: [...state.relics.player, ...(state.phase === 'map' ? [] : state.relics.tioZe), ...(state.shop?.relics ?? []).map((o) => o.id)],
    tiles: [...tiles],
    rivals: state.phase === 'playing' ? [state.rivalId] : [],
  };
}

/**
 * Loop principal: segura o estado da run, agenda o rival, converte eventos
 * em som/feedback, grava o save e liga as telas (menu, mapa, mesa, loja).
 */
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [selectedId, setSelectedId] = useState(null);
  const [muted, setMuted] = useState(() => audio.muted);
  const [settings, setSettings] = useState(loadSettings);
  const [collection, setCollection] = useState(loadCollection);
  const [save, setSave] = useState(loadRunSave);
  const [menuOpen, setMenuOpen] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(readDevFlag);
  const [devOpen, setDevOpen] = useState(false);
  const [inspect, setInspect] = useState(null);
  // jogada do rival em cena: 'flight' (pedra voando) → 'spot' (destaque) → null
  const [aiAnim, setAiAnim] = useState(null);
  const { items: floatItems, push: pushFloat, done: floatDone, clear: clearFloats } = useFloats();
  const shellRef = useRef(null);
  const tableRef = useRef(null);
  const rivalHandRef = useRef(null);
  const processedSeq = useRef(0);
  const aiTimers = useRef([]);
  // o livro é gravado direto no storage durante a run; a tela do menu lê quando você volta
  const bookRef = useRef(collection);
  const rival = getRival(state.rivalId);

  useEffect(() => audio.setVolumes(settings), [settings]);

  const clearAiAnim = useCallback(() => {
    aiTimers.current.forEach((id) => clearTimeout(id));
    aiTimers.current = [];
    setAiAnim(null);
  }, []);
  useEffect(() => clearAiAnim, [clearAiAnim]);

  // Rival: cada mudança de estado na vez dele agenda a próxima ação (cada um tem seu tempo).
  // Ele espera com o menu ou o painel DEV abertos, enquanto você decide
  // (escolha do Barbante, descarte do Giz) e enquanto a jogada anterior dele está em cena.
  useEffect(() => {
    if (menuOpen || devOpen || aiAnim || state.phase !== 'playing' || state.turn !== 'tioZe' || state.pending) return undefined;
    return scheduleTioZeTurn(dispatch, getRival(state.rivalId).reflexMs);
  }, [state, menuOpen, devOpen, aiAnim]);

  /** A pedra do rival sai da mão dele, voa 400 ms, bate (SLAM) e fica 800 ms em destaque. */
  const stageAiPlay = useCallback(
    (ev) => {
      aiTimers.current.forEach((id) => clearTimeout(id));
      const hand = rivalHandRef.current?.getBoundingClientRect();
      const from = hand ? { x: hand.left + hand.width / 2, y: hand.top + hand.height * 0.7 } : null;
      const label = tileName(ev.tileId);
      setAiAnim({ key: ev.seq, tileId: ev.tileId, label, stage: 'flight', from });
      const land = setTimeout(() => {
        audio.aiSlam({ double: ev.double });
        if (ev.enhancement) audio.enhancedPlace(ev.enhancement);
        shake(tableRef.current, ev.double ? 4 : 3, 100);
        haptic(ev.double ? 22 : 12);
        setAiAnim((cur) => (cur?.key === ev.seq ? { ...cur, stage: 'spot' } : cur));
        pushFloat(() => {
          const tile = centerOf(`[data-tile-id="${ev.tileId}"]`, { edge: 'top' });
          return tile && { from: { x: tile.x, y: tile.y - 14 }, text: label, tone: 'enemy', kind: 'label' };
        });
      }, AI_FLIGHT_MS);
      const release = setTimeout(() => setAiAnim((cur) => (cur?.key === ev.seq ? null : cur)), AI_FLIGHT_MS + AI_SPOTLIGHT_MS);
      aiTimers.current = [land, release];
    },
    [pushFloat],
  );

  // Efeitos colaterais dos eventos novos.
  useEffect(() => {
    const fresh = state.events.filter((e) => e.seq > processedSeq.current);
    if (!fresh.length) return;
    processedSeq.current = fresh[fresh.length - 1].seq;
    let offset = 0;
    let lastTileId = state.lastPlay?.tileId ?? null;
    for (const ev of fresh) {
      if (ev.type === 'tilePlaced') {
        lastTileId = ev.tileId;
        if (ev.by === 'tioZe' && state.phase !== 'title') {
          stageAiPlay(ev);
          offset = AI_FLIGHT_MS;
        }
      }
      runEventFx(ev, shellRef.current, tableRef.current, offset);
      const tileId = lastTileId;
      if (ev.type === 'bonus5') {
        const info = bonusFloat(ev);
        pushFloat(() => {
          const from = centerOf(`[data-tile-id="${tileId}"]`);
          const to = centerOf(`[data-coin-target="${info.to}"]`);
          return from && { from, to, text: info.text, tone: info.tone, kind: 'coin' };
        }, offset + FX_DELAY.bonus5);
      }
      if (ev.type === 'proc') {
        pushFloat(() => {
          const from = procOrigin(ev, tileId, tableRef.current);
          return from && { from, text: ev.text, tone: ev.tone };
        }, offset + FX_DELAY.proc);
      }
    }
  }, [state.events, state.lastPlay, state.phase, pushFloat, stageAiPlay]);

  // Save: no mapa e na loja (e ao vencer o nó); some quando a run acaba.
  useEffect(() => {
    if (state.phase === 'map') writeRunSave(snapshotRun(state, 'map', Date.now()));
    else if (state.phase === 'shop' || state.phase === 'matchWon') writeRunSave(snapshotRun(state, 'shop', Date.now()));
    else if (state.phase === 'gameOver' || state.phase === 'runWon') clearRunSave();
  }, [state]);

  // Livro de Boteco: tudo que passa pela mesa fica registrado.
  useEffect(() => {
    if (state.phase === 'title') return;
    bookRef.current = discover(bookRef.current, seenNow(state));
  }, [state]);

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

  // Toque longo: balão com o efeito da pedra/talismã; soltar fecha.
  const startInspect = useCallback((payload, rect) => setInspect({ payload, rect }), []);
  const endInspect = useCallback(() => setInspect(null), []);
  const press = useLongPress(startInspect, endInspect);
  const balloonInfo = inspect ? inspectInfo(inspect.payload, state, rival) : null;
  const balloon = balloonInfo ? { ...balloonInfo, rect: inspect.rect } : null;

  const playing = state.phase === 'playing';
  const pending = playing ? state.pending : null;
  const discardMode = pending?.type === 'discard';
  // enquanto a jogada do rival está em cena, a sua vez ainda não começou
  const isPlayerTurn = playing && state.turn === 'player' && !pending && !aiAnim;
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
  const undoReady = canUndo(state) && !aiAnim;

  const speech = useMemo(() => deriveTioZeSpeech(state.events, state.rivalId), [state.events, state.rivalId]);
  const relicFlashes = useMemo(() => deriveRelicFlashes(state.events), [state.events]);
  const mood = deriveTioZeMood(state);
  const tioZeHurtKey = deriveHurtKey(state.events, 'tioZe');
  const playerHurtKey = deriveHurtKey(state.events, 'player');
  const revealed = revealedTioZeTiles(state);
  const endMarks = endMarksFor(state);
  const knownIds = useMemo(() => (playing ? new Set(knownPlayerTiles(state).map((t) => t.id)) : null), [playing, state]);

  const hint = buildPlayerHint({
    state,
    isPlayerTurn,
    selectedTile,
    playableCount: playableIds.size,
    drawAllowed: canDraw,
    rules: playerRules,
    rivalName: rival.name,
  });

  const play = useCallback((tileId, side) => {
    dispatch({ type: 'PLAY', actor: 'player', tileId, side });
    setSelectedId(null);
  }, []);

  // Tocar na pedra só seleciona (ou desseleciona). Jogar é no JOGAR ou na vaga da mesa.
  const handleSelectTile = (tile) => {
    if (discardMode) {
      audio.click();
      setSelectedId(selectedTile?.id === tile.id ? null : tile.id);
      return;
    }
    if (!isPlayerTurn || !playableIds.has(tile.id)) return;
    audio.click();
    if (selectedTile?.id === tile.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(tile.id);
    if (tile.a === tile.b) {
      // bucha é jogada de poder: toque e vibração próprios
      audio.powerSelect();
      haptic(15);
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

  const wakeAudio = () => {
    audio.unlock();
    audio.startAmbience();
    audio.startMusic();
  };

  const resetTable = () => {
    setSelectedId(null);
    setMenuOpen(false);
    setDevOpen(false);
    clearFloats();
    clearAiAnim();
  };

  const newGame = () => {
    wakeAudio();
    audio.click();
    resetTable();
    clearRunSave();
    setSave(null);
    dispatch({ type: 'NEW_RUN', seed: newSeed() });
  };

  const continueRun = () => {
    const saved = loadRunSave();
    if (!saved) {
      setSave(null);
      return;
    }
    wakeAudio();
    audio.click();
    resetTable();
    dispatch({ type: 'LOAD_RUN', save: saved });
  };

  const enterNode = () => {
    audio.click();
    resetTable();
    dispatch({ type: 'ENTER_NODE', deck: newDeck() });
  };

  const nextRound = () => {
    audio.click();
    setSelectedId(null);
    dispatch({ type: 'NEXT_ROUND', deck: newDeck() });
  };

  const openShop = useCallback(() => {
    setSelectedId(null);
    clearFloats();
    dispatch({ type: 'OPEN_SHOP' });
  }, [clearFloats]);

  const shopAction = (action) => {
    audio.click();
    dispatch(action);
  };

  const leaveShop = () => {
    audio.click();
    dispatch({ type: 'LEAVE_SHOP' });
  };

  const backToMenu = () => {
    audio.click();
    resetTable();
    dispatch({ type: 'RETURN_TO_TITLE' });
    setSave(loadRunSave());
    setCollection(bookRef.current);
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

  const changeSettings = (next) => {
    setSettings(next);
    saveSettings(next);
    if (next.haptics && !settings.haptics) haptic(20);
  };

  const wipeProgress = () => {
    bookRef.current = resetProgress();
    setCollection(bookRef.current);
    setSave(null);
  };

  const titleTap = () => {
    audio.unlock();
    audio.click();
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
    // trocar de rival recomeça a partida: precisa de um baralho novo
    dispatch(action.op === 'setRival' ? { ...action, deck: newDeck() } : action);
    if (action.op === 'setRival') {
      clearFloats();
      clearAiAnim();
    }
    // tranca forçada e vitória abrem o resultado: fecha o painel para ver
    if (action.op === 'forceTranca' || action.op === 'winMatch' || action.op === 'setRival') setDevOpen(false);
  };

  if (state.phase === 'title') {
    return (
      <div className="app-shell h-full">
        <TitleScreen
          save={save}
          onNewGame={newGame}
          onContinue={continueRun}
          settings={settings}
          onSettings={changeSettings}
          onResetProgress={wipeProgress}
          collection={collection}
          onSecretTap={titleSecretTap}
          onTap={titleTap}
          devUnlocked={devUnlocked}
        />
      </div>
    );
  }

  const devPanel = devOpen && <DevPanel state={state} onAction={devAction} onClose={() => setDevOpen(false)} />;
  // no mapa fica ao lado do menu; na loja, em cima do botão de voltar (o saldo mora no topo)
  const devChip = devUnlocked && (
    <button
      type="button"
      className={`dev-chip fixed z-[60] ${state.phase === 'shop' ? 'right-3' : 'right-14'}`}
      style={state.phase === 'shop' ? { bottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 64px)' } : { top: 'max(env(safe-area-inset-top), 12px)' }}
      onClick={() => setDevOpen(true)}
    >
      DEV
    </button>
  );

  if (state.phase === 'map') {
    return (
      <div ref={shellRef} className="app-shell h-full">
        <CampaignMap state={state} onEnter={enterNode} onMenu={backToMenu} press={press} />
        {devChip}
        <InfoBalloon info={balloon} />
        {devPanel}
      </div>
    );
  }

  if (state.phase === 'shop') {
    return (
      <div ref={shellRef} className="app-shell h-full">
        <Shop
          state={state}
          press={press}
          onBuyRelic={(index) => shopAction({ type: 'SHOP_BUY_RELIC', index })}
          onBuyTile={(index) => shopAction({ type: 'SHOP_BUY_TILE', index })}
          onSell={(id) => shopAction({ type: 'SHOP_SELL_RELIC', id })}
          onReroll={() => shopAction({ type: 'SHOP_REROLL' })}
          onLeave={leaveShop}
        />
        {devChip}
        <InfoBalloon info={balloon} />
        {devPanel}
      </div>
    );
  }

  const ends = getOpenEnds(state.board);
  const roundFinished = ['roundOver', 'matchWon', 'gameOver', 'runWon'].includes(state.phase);
  const rivalThinking = playing && state.turn === 'tioZe' && !pending && !aiAnim;
  const atmosphere = REGIONS[rival.region - 1]?.atmosphere ?? 'boteco';

  return (
    <div
      ref={shellRef}
      className="app-shell flex h-full flex-col overflow-hidden"
      style={{ '--felt-light': rival.felt.light, '--felt-mid': rival.felt.mid, '--felt-dark': rival.felt.dark }}
    >
      <RivalBench
        rival={rival}
        hearts={state.hearts.tioZe}
        maxHearts={state.maxHearts.tioZe}
        coins={state.coins.tioZe}
        hand={state.hands.tioZe}
        revealed={revealed}
        boneyardCount={state.boneyard.length}
        relics={state.relics.tioZe}
        flashes={relicFlashes.tioZe}
        isTurn={playing && state.turn === 'tioZe'}
        thinking={rivalThinking}
        status={aiAnim ? 'JOGOU!' : null}
        mood={mood}
        hurtKey={tioZeHurtKey}
        speech={speech}
        handRef={rivalHandRef}
        muted={muted}
        onToggleMute={toggleMute}
        onOpenMenu={openMenu}
        press={press}
      />

      <TableBoard
        board={state.board}
        roundKey={`${state.run.match}:${state.round}`}
        playableSides={selectedSides}
        onPlaySide={handlePlaySide}
        dimmed={roundFinished && !aiAnim}
        previewDouble={Boolean(selectedTile && !discardMode && selectedTile.a === selectedTile.b)}
        frameRef={tableRef}
        endMarks={endMarks}
        felt={rival.felt}
        decor={rival.decor}
        atmosphere={atmosphere}
        incoming={aiAnim}
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
        relics={state.relics.player}
        relicFlashes={relicFlashes.player}
        spentRelics={spentRelicsOf(state, 'player')}
        canUndo={undoReady}
        onUndo={handleUndo}
        devUnlocked={devUnlocked}
        onOpenDev={() => setDevOpen(true)}
        press={press}
        knownIds={knownIds}
        rivalName={rival.name}
      />

      {playerHurtKey > 0 && <div key={playerHurtKey} className="hurt-flash pointer-events-none fixed inset-0 z-[60]" />}

      <FloatingTexts items={floatItems} onDone={floatDone} />

      {pending?.type === 'drawChoice' && <DrawChoice options={pending.options} onPick={handlePickDraw} />}

      {roundFinished && !aiAnim && (
        <RoundOverlay
          state={state}
          rival={rival}
          onNext={nextRound}
          onShop={openShop}
          autoShop={!menuOpen && !devOpen}
          onRestart={newGame}
          onMenu={backToMenu}
        />
      )}

      {menuOpen && (
        <PauseMenu
          rivalName={rival.name}
          muted={muted}
          onToggleMute={toggleMute}
          onResume={closeMenu}
          onQuit={backToMenu}
          settings={settings}
          onSettings={changeSettings}
        />
      )}

      <InfoBalloon info={balloon} />
      {devPanel}
    </div>
  );
}
