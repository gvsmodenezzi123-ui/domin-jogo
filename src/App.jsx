import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { scheduleTioZeTurn } from './ai/tioZeAI.js';
import BlackMarketModal from './components/BlackMarketModal.jsx';
import CampaignMap from './components/CampaignMap.jsx';
import CoinEventModal from './components/CoinEventModal.jsx';
import DevPanel from './components/DevPanel.jsx';
import DrawChoice from './components/DrawChoice.jsx';
import FloatingTexts from './components/FloatingTexts.jsx';
import HardUnlockModal from './components/HardUnlockModal.jsx';
import InfoBalloon from './components/InfoBalloon.jsx';
import PauseMenu from './components/PauseMenu.jsx';
import PlayerRack from './components/PlayerRack.jsx';
import RivalBench from './components/RivalBench.jsx';
import RoundOverlay from './components/RoundOverlay.jsx';
import { ScreenVeil, useSceneTransition } from './components/ScreenTransition.jsx';
import Shop from './components/Shop.jsx';
import TableBoard from './components/TableBoard.jsx';
import { FLIGHT_PLAYER, FLIGHT_RIVAL, flyTile, landTime } from './components/tileFlight.js';
import { kickLamp } from './components/lampKick.js';
import TitleScreen from './components/TitleScreen.jsx';
import { applyReducedMotion, prefersReducedMotion } from './components/motion.js';
import { centerOf, useFloats } from './components/useFloats.js';
import { useLongPress } from './components/useLongPress.js';
import { useStableHandler, useStableValue } from './components/useStable.js';
import { useTripleTap } from './components/useTripleTap.js';
import { TileSkinContext } from './components/tileSkin.js';
import { BOSS_MUSIC, REGIONS } from './data/campaign.js';
import { getEnhancement } from './data/enhancedTiles.js';
import { getRelic } from './data/relics.js';
import { getRival, rivalOf } from './data/rivals.js';
import { modeOf } from './data/difficulty.js';
import { MARKET_MUSIC, SHOP_MUSIC, sound } from './engine/audioSynth.js';
import { mapRegionId, regionIdOf } from './engine/campaignMap.js';
import {
  FULL_SET,
  boardTilesInOrder,
  getOpenEnds,
  getPlayableMoves,
  getValidSides,
  shuffle,
} from './engine/dominoLogic.js';
import { bonusFloat, buildPlayerHint, deriveHurtKey, deriveTioZeMood, deriveTioZeSpeech } from './engine/gameFeedback.js';
import { createInitialState, gameReducer } from './engine/gameReducer.js';
import {
  canUndo,
  drawAvailabilityFor,
  endMarksFor,
  knownPlayerTiles,
  passAvailabilityFor,
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
  loadHardUnlocked,
  loadRunSave,
  loadSettings,
  resetProgress,
  saveHardUnlocked,
  saveSettings,
  writeRunSave,
} from './engine/progress.js';
import { snapshotRun } from './engine/save.js';
import { sellPriceOf } from './engine/shop.js';

const newDeck = () => shuffle(FULL_SET);
/** Semente da run: sorteia a teia de caminhos, as vitrines e as gorjetas do Seu Tião. */
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

/** Da jogada até a sua pedra bater na ponta (levanta, desliza e cai), em ms. */
const PLAYER_FLIGHT_MS = landTime(FLIGHT_PLAYER);
/** Da jogada do rival até a pedra dele bater na ponta (vira, desliza e cai), em ms. */
const AI_FLIGHT_MS = landTime(FLIGHT_RIVAL);
/** Destaque da jogada do rival depois que a pedra pousa (anel amarelo + [a|b]). */
const AI_SPOTLIGHT_MS = 800;
/** Anel de impacto da sua bucha depois do pouso (ms). */
const PLAYER_LANDED_MS = 280;
/** Tremida da mesa quando a pedra assenta (ms). */
const SLAM_SHAKE_MS = 150;
/** Banner "SEM JOGADAS DISPONÍVEIS!" na tela antes do passe forçado ir para o rival (ms). */
const NO_MOVES_MS = 1600;

/** Atraso (ms) de cada som dentro de um mesmo lote de eventos, para não embolar. */
const FX_DELAY = {
  tilePlaced: 0,
  drawTile: 0,
  drawPeek: 0,
  pass: 0,
  noMoves: 240,
  discard: 0,
  undo: 0,
  proc: 90,
  callout: 60,
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

/** Som e tremida para cada evento emitido pelo reducer (`offset`: espera o voo da pedra). */
function runEventFx(ev, shell, table, offset = 0) {
  const at = (fn, extra = 0) => setTimeout(fn, offset + (FX_DELAY[ev.type] ?? 0) + extra);
  switch (ev.type) {
    case 'tilePlaced':
      // o som e a tremida saem no pouso do voo (App: stagePlay)
      break;
    case 'drawTile':
    case 'drawPeek':
    case 'shopReroll':
      at(() => sound.playDraw());
      break;
    case 'pass':
      // o passe forçado já tocou o som de "sem jogadas" quando a mesa travou
      if (!ev.forced) at(() => sound.playPass());
      break;
    case 'noMoves':
      at(() => {
        sound.playNoMoves();
        haptic([40, 60, 40]);
      });
      break;
    case 'discard':
      at(() => sound.playPass());
      break;
    case 'bonus5':
      at(() => sound.playCoinJingle());
      break;
    case 'coins':
      // a gorjeta do Seu Tião tem o som dela (uma moeda por vez, CoinEventModal)
      if (ev.who === 'player' && ev.amount > 0 && ev.source !== 'dev' && ev.source !== 'tiao') at(() => sound.playCoinJingle());
      break;
    case 'shopBuy':
    case 'marketBuy':
      at(() => sound.playPurchase());
      break;
    case 'marketOpen':
      at(() => sound.playChime('enemy'));
      break;
    case 'shopOpen':
      at(() => sound.playChime('info'));
      break;
    case 'proc':
      at(() => sound.playChime(ev.tone));
      break;
    case 'callout':
      at(() => {
        sound.playChime(ev.by === 'player' ? 'player' : 'enemy');
        haptic([30, 30, 60]);
      });
      break;
    case 'undo':
      at(() => sound.playRewind());
      break;
    case 'dev':
      at(() => sound.playClick());
      break;
    case 'roundEnd':
      at(() => (ev.result.kind === 'tranca' ? sound.playLock() : sound.playTileSlam(true)));
      break;
    case 'heartLost':
      at(() => {
        sound.playHeartHit();
        if (ev.who === 'player') {
          shake(shell, ev.amount >= 2 ? 9 : 6);
          haptic(ev.amount >= 2 ? [70, 40, 90] : 60);
        }
      });
      // jingle de rodada só na contagem do fim da rodada (não em compra nem em dano direto)
      if (ev.reason !== 'draw' && !ev.direct) {
        at(() => (ev.who === 'tioZe' ? sound.playRoundWin() : sound.playRoundLose()), 1150 - FX_DELAY.heartLost);
      }
      break;
    case 'duelEnd':
      at(() => (ev.winner === 'player' ? sound.playVictory() : sound.playDefeat()));
      break;
    default:
      break;
  }
}

/**
 * Faixa da tela atual: menu e Boteco na bossa, Clube da Sinuca no funk, Submundo e chefes no tenso.
 * A Loja Clandestina tem a trilha suave dela e o beco do Corvo, a dele (Patch 0.6.1).
 */
function musicFor(state) {
  if (state.phase === 'title') return REGIONS[0].music;
  if (state.phase === 'shop') return SHOP_MUSIC;
  if (state.phase === 'blackMarket') return MARKET_MUSIC;
  if (state.phase === 'map') return REGIONS[mapRegionId(state) - 1].music;
  if (state.phase === 'coinEvent') return REGIONS[regionIdOf(state) - 1].music;
  const rival = getRival(state.rivalId);
  return rival.boss ? BOSS_MUSIC : (REGIONS[rival.region - 1]?.music ?? REGIONS[0].music);
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
  else if (payload.owner === 'shop' || payload.owner === 'market') extra = `PREÇO: $${relic.price}`;
  else if (state.phase === 'shop') extra = `VENDE POR $${sellPriceOf(relic.id)}`;
  return { title: relic.name.toUpperCase(), rarity: relic.rarity, description: relic.description, extra };
}

/** Tudo que está à vista agora e entra no Livro de Boteco. */
function seenNow(state) {
  const tiles = new Set(Object.values(state.decks.player));
  for (const t of [...state.hands.player, ...boardTilesInOrder(state.board)]) if (t.enhancement) tiles.add(t.enhancement);
  for (const offer of state.shop?.tiles ?? []) tiles.add(offer.enhancement);
  return {
    relics: [
      ...state.relics.player,
      ...(state.phase === 'playing' || state.phase === 'roundOver' ? state.relics.tioZe : []),
      ...(state.shop?.relics ?? []).map((o) => o.id),
      ...(state.market?.offers ?? []).map((o) => o.id),
    ],
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
  const [muted, setMuted] = useState(() => sound.isMuted);
  const [settings, setSettings] = useState(loadSettings);
  const [collection, setCollection] = useState(loadCollection);
  const [save, setSave] = useState(loadRunSave);
  const [menuOpen, setMenuOpen] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(readDevFlag);
  const [devOpen, setDevOpen] = useState(false);
  const [inspect, setInspect] = useState(null);
  // jogada do rival em cena: 'flight' (pedra voando) → 'spot' (destaque) → null
  // pedra em cena na mesa: 'flight' (voando) → 'spot' (destaque do rival) / 'landed' (impacto da sua) → null
  const [tableAnim, setTableAnim] = useState(null);
  const { items: floatItems, push: pushFloat, done: floatDone, clear: clearFloats } = useFloats();
  const shellRef = useRef(null);
  const tableRef = useRef(null);
  const rivalHandRef = useRef(null);
  const processedSeq = useRef(0);
  const animTimers = useRef([]);
  const cancelFlight = useRef(null);
  // de onde a sua pedra sai (medido antes de jogar: depois do PLAY ela já saiu da mão)
  const pendingPlay = useRef(null);
  // o livro é gravado direto no storage durante a run; a tela do menu lê quando você volta
  const bookRef = useRef(collection);
  // o rival no modo da run (a Maleta Preta muda corações, baralho e talismãs dele)
  const rival = rivalOf(state);
  // Patch 0.6.3: Maleta Preta liberada? E a tela inicial deve abrir direto nas maletas?
  const [hardUnlocked, setHardUnlocked] = useState(loadHardUnlocked);
  const [titlePick, setTitlePick] = useState(false);
  // Patch 0.6.1: corte de cena (fade 350 ms para o preto, troca, 350 ms de volta)
  const { stage: veilStage, go: cutTo } = useSceneTransition();

  useEffect(() => sound.setVolumes(settings), [settings]);
  useEffect(() => applyReducedMotion(settings.reducedMotion), [settings.reducedMotion]);

  // Trilha: Boteco (jazz), Clube da Sinuca (funk) e Submundo/chefes (tensão). Só depois do 1º toque.
  const musicTrack = musicFor(state);
  useEffect(() => {
    if (sound.ctx) sound.playTrack(musicTrack);
  }, [musicTrack]);

  // Camada de tensão da trilha: alguém na mesa com 1 ou 2 corações.
  const tense =
    (state.phase === 'playing' || state.phase === 'roundOver') && Math.min(state.hearts.player, state.hearts.tioZe) <= 2;
  useEffect(() => sound.setTension(tense), [tense]);

  const clearTableAnim = useCallback(() => {
    animTimers.current.forEach((id) => clearTimeout(id));
    animTimers.current = [];
    cancelFlight.current?.();
    cancelFlight.current = null;
    setTableAnim(null);
  }, []);
  useEffect(() => clearTableAnim, [clearTableAnim]);

  // Rival: cada mudança de estado na vez dele agenda a próxima ação (cada um tem seu tempo).
  // Ele espera com o menu ou o painel DEV abertos, enquanto você decide
  // (escolha do Barbante, descarte do Giz) e enquanto a jogada anterior dele está em cena.
  useEffect(() => {
    if (menuOpen || devOpen || tableAnim || state.phase !== 'playing' || state.turn !== 'tioZe' || state.pending) return undefined;
    return scheduleTioZeTurn(dispatch, rivalOf(state).reflexMs);
  }, [state, menuOpen, devOpen, tableAnim]);

  // Turno sem saída (3 compras sem encaixe): o banner fica na mesa e o passe vai sozinho para o rival.
  const forcedPassArmed = state.phase === 'playing' && state.pending?.type === 'forcedPass';
  useEffect(() => {
    if (!forcedPassArmed || menuOpen || devOpen) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'PASS', actor: 'player' }), NO_MOVES_MS);
    return () => clearTimeout(timer);
  }, [forcedPassArmed, menuOpen, devOpen]);

  /**
   * Pedra jogada em cena: uma cópia é levantada da mão (sua: do leque; do rival:
   * da vaga dele no topo, virando de costas para a face), desliza em curva até a
   * ponta com rastro e sombra no pano, girando para a orientação da mesa, e cai
   * com SLAM de osso na madeira: a mesa treme 150 ms e a lâmpada leva um tranco.
   * A do rival fica 800 ms em destaque antes de liberar a sua vez.
   */
  const stagePlay = useCallback(
    (ev) => {
      animTimers.current.forEach((id) => clearTimeout(id));
      animTimers.current = [];
      cancelFlight.current?.();
      const rival = ev.by !== 'player';
      let from = null;
      let fromEl = null;
      if (rival) {
        fromEl = document.querySelector(`[data-rival-tile="${ev.tileId}"]`);
        const src = fromEl?.firstElementChild ?? fromEl;
        const hand = src?.getBoundingClientRect() ?? rivalHandRef.current?.getBoundingClientRect();
        if (hand) from = { x: hand.left + hand.width / 2, y: hand.top + hand.height / 2, w: hand.width, h: hand.height, angle: 0 };
      } else if (pendingPlay.current?.tileId === ev.tileId) {
        from = pendingPlay.current.from;
      }
      pendingPlay.current = null;
      const key = ev.seq;
      setTableAnim({ key, tileId: ev.tileId, by: ev.by, stage: 'flight' });
      cancelFlight.current = flyTile({
        tileId: ev.tileId,
        from,
        fromEl,
        timing: rival ? FLIGHT_RIVAL : FLIGHT_PLAYER,
        arc: rival ? 24 : 54,
        flip: rival,
        onLand: () => {
          sound.playBoneSlam(ev.double, ev.enhancement);
          shake(tableRef.current, ev.double ? 4 : 3, SLAM_SHAKE_MS);
          kickLamp(ev.double ? 1.4 : 1);
          haptic(ev.double ? 22 : 12);
        },
        onDone: () => {
          cancelFlight.current = null;
          const later = (fn, ms) => animTimers.current.push(setTimeout(fn, ms));
          if (rival) {
            const label = tileName(ev.tileId);
            setTableAnim((cur) => (cur?.key === key ? { ...cur, stage: 'spot' } : cur));
            pushFloat(() => {
              const tile = centerOf(`[data-tile-id="${ev.tileId}"]`, { edge: 'top' });
              return tile && { from: { x: tile.x, y: tile.y - 14 }, text: label, tone: 'enemy', kind: 'label' };
            });
            later(() => setTableAnim((cur) => (cur?.key === key ? null : cur)), AI_SPOTLIGHT_MS);
          } else {
            setTableAnim((cur) => (cur?.key === key ? { ...cur, stage: 'landed' } : cur));
            later(() => setTableAnim((cur) => (cur?.key === key ? null : cur)), PLAYER_LANDED_MS);
          }
        },
      });
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
        if (state.phase !== 'title') {
          stagePlay(ev);
          offset = ev.by === 'player' ? PLAYER_FLIGHT_MS : AI_FLIGHT_MS;
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
      // "Nas duas pontas!": balão rápido no alto do feltro, logo que a pedra bate
      if (ev.type === 'callout') {
        pushFloat(() => {
          const felt = tableRef.current?.getBoundingClientRect();
          if (!felt) return null;
          return { from: { x: felt.left + felt.width / 2, y: felt.top + felt.height * 0.3 }, text: ev.text, tone: ev.by === 'player' ? 'player' : 'enemy', kind: 'callout' };
        }, offset + FX_DELAY.callout);
      }
    }
  }, [state.events, state.lastPlay, state.phase, pushFloat, stagePlay]);

  // Save: no mapa, na loja e no beco (ao vencer o nó e depois do Seu Tião, volta no mapa);
  // some quando a run acaba.
  useEffect(() => {
    if (state.phase === 'map' || state.phase === 'matchWon' || state.phase === 'coinEvent') writeRunSave(snapshotRun(state, 'map', Date.now()));
    else if (state.phase === 'shop') writeRunSave(snapshotRun(state, 'shop', Date.now()));
    else if (state.phase === 'blackMarket') writeRunSave(snapshotRun(state, 'blackMarket', Date.now()));
    else if (state.phase === 'gameOver' || state.phase === 'runWon') clearRunSave();
  }, [state]);

  // Patch 0.6.3: zerou a Maleta Branca com a Preta ainda trancada → tela de recompensa antes
  // do final, e o desbloqueio vai para o aparelho na hora (buxaria_hard_mode_unlocked = true)
  const celebrate = state.phase === 'runWon' && state.mode !== 'hard' && !hardUnlocked;
  useEffect(() => {
    if (celebrate) saveHardUnlocked(true);
  }, [celebrate]);

  // Livro de Boteco: tudo que passa pela mesa fica registrado.
  useEffect(() => {
    if (state.phase === 'title') return;
    bookRef.current = discover(bookRef.current, seenNow(state));
  }, [state]);

  // Patch 0.5.5: todo botão de placa (e os textos e ícones tocáveis do menu e da loja)
  // dá o clique mecânico de gatilho ao afundar.
  useEffect(() => {
    const click = (event) => {
      const target = event.target instanceof Element ? event.target.closest('.btn-pixel, .text-action, .icon-btn, .scene-tap') : null;
      if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
      sound.init();
      sound.playClick();
    };
    window.addEventListener('pointerdown', click, { passive: true });
    return () => window.removeEventListener('pointerdown', click);
  }, []);

  // iOS suspende o áudio quando o app vai para o fundo.
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === 'visible' && sound.ctx) sound.init();
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
  const isPlayerTurn = playing && state.turn === 'player' && !pending && !tableAnim;
  const hand = state.hands.player;
  // Patch 0.5.4: valores recalculados a cada render ficam com a mesma identidade enquanto não mudam,
  // para os componentes com React.memo (mesa, leque, botões, cabeçalho) não redesenharem à toa
  const playerRules = useStableValue(rulesFor(state, 'player'));
  const requiredTileId = requiredOpeningFor(state, 'player');

  const playableIds = useMemo(() => {
    if (discardMode) return new Set(hand.map((t) => t.id));
    if (!isPlayerTurn) return new Set();
    return new Set(getPlayableMoves(hand, state.board, requiredTileId, playerRules).map((m) => m.tile.id));
  }, [discardMode, isPlayerTurn, hand, state.board, requiredTileId, playerRules]);

  const selectedTile =
    isPlayerTurn || discardMode ? (hand.find((t) => t.id === selectedId && playableIds.has(t.id)) ?? null) : null;
  const selectedSides = useStableValue(selectedTile && !discardMode ? getValidSides(selectedTile, state.board, playerRules) : []);

  // a escada de compra do jogador (o Pacto do Coveiro deixa a 3ª compra mais cara)
  const draw = useStableValue(drawAvailabilityFor(state, 'player'));
  const boardOpen = Boolean(state.board.root);
  const canDraw = isPlayerTurn && boardOpen && draw.allowed;
  // Patch 0.5.4: sem jogada a 1ª compra é obrigatória; podendo jogar, o passe custa $3
  const passRule = useStableValue(isPlayerTurn && boardOpen ? passAvailabilityFor(state, 'player') : null);
  const canPass = Boolean(passRule?.allowed);
  const forcedPass = playing && state.pending?.type === 'forcedPass';
  const undoReady = canUndo(state) && !tableAnim;

  const speechNow = useMemo(() => deriveTioZeSpeech(state.events, state.rivalId), [state.events, state.rivalId]);
  const speech = useStableValue(speechNow);
  const flashesNow = useMemo(() => deriveRelicFlashes(state.events), [state.events]);
  const relicFlashes = useStableValue(flashesNow);
  const mood = deriveTioZeMood(state);
  const tioZeHurtKey = deriveHurtKey(state.events, 'tioZe');
  const playerHurtKey = deriveHurtKey(state.events, 'player');
  const revealedNow = revealedTioZeTiles(state);
  const revealed = useStableValue(revealedNow, revealedNow.map((t) => t.id).join(','));
  const endMarks = useStableValue(endMarksFor(state));
  const spentRelics = useStableValue(spentRelicsOf(state, 'player'));
  const knownKey = playing ? knownPlayerTiles(state).map((t) => t.id).join(',') : null;
  const knownIds = useMemo(() => (knownKey === null ? null : new Set(knownKey ? knownKey.split(',') : [])), [knownKey]);

  const hint = buildPlayerHint({
    state,
    isPlayerTurn,
    selectedTile,
    playableCount: playableIds.size,
    drawAllowed: canDraw,
    passRule,
    rules: playerRules,
    rivalName: rival.name,
  });

  const play = useCallback((tileId, side) => {
    // mede a pedra no leque antes de ela sair da mão: o voo começa dali
    const el = document.querySelector(`[data-hand-tile="${tileId}"]`);
    const r = el?.getBoundingClientRect();
    pendingPlay.current = r ? { tileId, from: { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, angle: 0 } } : null;
    dispatch({ type: 'PLAY', actor: 'player', tileId, side });
    setSelectedId(null);
  }, []);

  // Tocar na pedra só seleciona (ou desseleciona). Jogar é no JOGAR ou na vaga da mesa.
  const handleSelectTile = useStableHandler((tile) => {
    if (discardMode) {
      sound.playClick();
      setSelectedId(selectedTile?.id === tile.id ? null : tile.id);
      return;
    }
    if (!isPlayerTurn || !playableIds.has(tile.id)) return;
    sound.playClick();
    if (selectedTile?.id === tile.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(tile.id);
    if (tile.a === tile.b) {
      // bucha é jogada de poder: toque e vibração próprios
      sound.playPowerSelect();
      haptic(15);
    }
  });

  const handlePlaySide = useStableHandler((side) => {
    if (selectedTile && !discardMode) play(selectedTile.id, side);
  });

  const handleDraw = useStableHandler(() => {
    if (!canDraw) return;
    dispatch({ type: 'DRAW', actor: 'player' });
  });

  const handlePickDraw = (tileId) => {
    sound.playClick();
    dispatch({ type: 'DRAW_PICK', tileId });
  };

  const handlePass = useStableHandler(() => {
    if (!canPass) return;
    setSelectedId(null);
    dispatch({ type: 'PASS', actor: 'player' });
  });

  const handleDiscard = useStableHandler(() => {
    if (!discardMode || !selectedTile) return;
    dispatch({ type: 'DISCARD', tileId: selectedTile.id });
    setSelectedId(null);
  });

  const handleSkipDiscard = useStableHandler(() => {
    sound.playClick();
    setSelectedId(null);
    dispatch({ type: 'SKIP_DISCARD' });
  });

  const handleUndo = useStableHandler(() => {
    if (!undoReady) return;
    setSelectedId(null);
    dispatch({ type: 'UNDO' });
  });

  // dentro de um toque: destrava o áudio (iOS) e liga a trilha da tela atual
  const wakeAudio = () => {
    sound.init();
    if (!sound.isPlayingMusic || sound.currentTrack !== musicTrack) sound.playTrack(musicTrack);
  };

  const resetTable = () => {
    setSelectedId(null);
    setMenuOpen(false);
    setDevOpen(false);
    clearFloats();
    clearTableAnim();
  };

  /** NOVO JOGO depois de escolher a maleta ('normal' = Branca, 'hard' = Preta). */
  const newGame = (mode = 'normal') => {
    wakeAudio();
    sound.playClick();
    cutTo(() => {
      resetTable();
      clearRunSave();
      setSave(null);
      setTitlePick(false);
      dispatch({ type: 'NEW_RUN', seed: newSeed(), mode: modeOf(mode).id });
    });
  };

  /** NOVO JOGO no fim da run: volta para a mesa das maletas. */
  const restartRun = () => {
    sound.playClick();
    cutTo(() => {
      resetTable();
      dispatch({ type: 'RETURN_TO_TITLE' });
      setSave(loadRunSave());
      setCollection(bookRef.current);
      setTitlePick(true);
    });
  };

  const continueRun = () => {
    const saved = loadRunSave();
    if (!saved) {
      setSave(null);
      return;
    }
    wakeAudio();
    sound.playClick();
    cutTo(() => {
      resetTable();
      dispatch({ type: 'LOAD_RUN', save: saved });
    });
  };

  /** Mapa: entra no nó escolhido (mesa, loja, beco ou Seu Tião), com corte de cena. */
  const enterNode = (nodeId) => {
    sound.playClick();
    cutTo(() => {
      resetTable();
      dispatch({ type: 'CHOOSE_NODE', nodeId, deck: newDeck() });
    });
  };

  const nextRound = () => {
    sound.playClick();
    setSelectedId(null);
    dispatch({ type: 'NEXT_ROUND', deck: newDeck() });
  };

  // venceu a mesa: volta para o mapa da teia (no botão ou sozinho depois de uns segundos)
  const continueToMap = useCallback(() => {
    cutTo(() => {
      setSelectedId(null);
      clearFloats();
      dispatch({ type: 'OPEN_MAP' });
    });
  }, [clearFloats, cutTo]);

  const shopAction = (action) => {
    sound.playClick();
    dispatch(action);
  };

  /** Sai da loja, do beco ou do Seu Tião para o mapa, com corte de cena. */
  const leaveTo = (type) => () => {
    sound.playClick();
    cutTo(() => dispatch({ type }));
  };

  const backToMenu = () => {
    sound.playClick();
    cutTo(() => {
      resetTable();
      dispatch({ type: 'RETURN_TO_TITLE' });
      setSave(loadRunSave());
      setCollection(bookRef.current);
      setTitlePick(false);
    });
  };

  const openMenu = useStableHandler(() => {
    sound.playClick();
    setMenuOpen(true);
  });

  const openDev = useCallback(() => setDevOpen(true), []);

  const closeMenu = () => {
    sound.playClick();
    setMenuOpen(false);
  };

  const toggleMute = useStableHandler(() => {
    sound.init();
    setMuted(sound.toggleMute());
  });

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
    wakeAudio();
    sound.playClick();
  };

  // Painel DEV: 3 toques no título (tela inicial) ou em "VOCÊ" (no duelo).
  const unlockDev = useCallback(() => {
    saveDevFlag();
    setDevUnlocked(true);
    sound.init();
    sound.playChime('info');
  }, []);
  const openDevFromGame = useCallback(() => {
    unlockDev();
    setDevOpen(true);
  }, [unlockDev]);
  const titleSecretTap = useTripleTap(unlockDev);
  const gameSecretTap = useTripleTap(openDevFromGame);

  // painel DEV: tranca ou libera a Maleta Preta (para testar a tela das maletas)
  const toggleHard = () => {
    const next = !hardUnlocked;
    saveHardUnlocked(next);
    setHardUnlocked(next);
  };

  const devAction = (action) => {
    setSelectedId(null);
    // trocar de rival recomeça a partida: precisa de um baralho novo
    dispatch(action.op === 'setRival' ? { ...action, deck: newDeck() } : action);
    if (action.op === 'setRival') {
      clearFloats();
      clearTableAnim();
    }
    if (action.op === 'openStop') {
      clearFloats();
      clearTableAnim();
    }
    // tranca forçada, vitória e os atalhos de cena abrem outra tela: fecha o painel para ver
    if (['forceTranca', 'winMatch', 'setRival', 'openStop'].includes(action.op)) setDevOpen(false);
  };

  const veil = <ScreenVeil stage={veilStage} />;
  // Maleta Preta: as pedras comuns da partida viram ébano com pips brancos
  const tileSkin = state.phase !== 'title' ? modeOf(state.mode).skin : 'bone';

  if (state.phase === 'title') {
    return (
      <TileSkinContext.Provider value={tileSkin}>
      <div className="app-shell h-full">
        <TitleScreen
          key={titlePick ? 'maletas' : 'menu'}
          save={save}
          hardUnlocked={hardUnlocked}
          startPicking={titlePick}
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
      {veil}
      </TileSkinContext.Provider>
    );
  }

  // nas cenas (loja, beco, Seu Tião) o saldo mora no topo: o chip DEV desce
  const sceneChip = ['shop', 'blackMarket', 'coinEvent'].includes(state.phase);
  const devPanel = devOpen && (
    <DevPanel state={state} onAction={devAction} onClose={() => setDevOpen(false)} hardUnlocked={hardUnlocked} onToggleHard={toggleHard} />
  );
  // no mapa fica ao lado do menu; na loja, em cima do botão de voltar (o saldo mora no topo)
  const devChip = devUnlocked && (
    <button
      type="button"
      className={`dev-chip fixed z-[60] ${sceneChip ? 'right-3' : 'right-14'}`}
      style={sceneChip ? { bottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 64px)' } : { top: 'max(env(safe-area-inset-top), 12px)' }}
      onClick={() => setDevOpen(true)}
    >
      DEV
    </button>
  );

  if (state.phase === 'map') {
    return (
      <TileSkinContext.Provider value={tileSkin}>
        <div ref={shellRef} className="app-shell h-full">
          <CampaignMap key={state.run.node ?? 'start'} state={state} onEnter={enterNode} onMenu={backToMenu} press={press} />
          {devChip}
          <InfoBalloon info={balloon} />
          {devPanel}
        </div>
        {veil}
      </TileSkinContext.Provider>
    );
  }

  if (state.phase === 'blackMarket') {
    return (
      <TileSkinContext.Provider value={tileSkin}>
        <div ref={shellRef} className="app-shell h-full">
          <BlackMarketModal
            state={state}
            press={press}
            onBuy={(index) => shopAction({ type: 'MARKET_BUY', index })}
            onLeave={leaveTo('LEAVE_MARKET')}
          />
          {devChip}
          <InfoBalloon info={balloon} />
          {devPanel}
        </div>
        {veil}
      </TileSkinContext.Provider>
    );
  }

  if (state.phase === 'coinEvent') {
    return (
      <TileSkinContext.Provider value={tileSkin}>
        <div ref={shellRef} className="app-shell h-full">
          <CoinEventModal state={state} onLeave={leaveTo('LEAVE_EVENT')} />
          {devChip}
          {devPanel}
        </div>
        {veil}
      </TileSkinContext.Provider>
    );
  }

  if (state.phase === 'shop') {
    return (
      <TileSkinContext.Provider value={tileSkin}>
        <div ref={shellRef} className="app-shell h-full">
          <Shop
            state={state}
            press={press}
            onBuyRelic={(index) => shopAction({ type: 'SHOP_BUY_RELIC', index })}
            onBuyTile={(index) => shopAction({ type: 'SHOP_BUY_TILE', index })}
            onSell={(id) => shopAction({ type: 'SHOP_SELL_RELIC', id })}
            onReroll={() => shopAction({ type: 'SHOP_REROLL' })}
            onLeave={leaveTo('LEAVE_SHOP')}
          />
          {devChip}
          <InfoBalloon info={balloon} />
          {devPanel}
        </div>
        {veil}
      </TileSkinContext.Provider>
    );
  }

  const ends = getOpenEnds(state.board);
  const roundFinished = ['roundOver', 'matchWon', 'gameOver', 'runWon'].includes(state.phase);
  const rivalThinking = playing && state.turn === 'tioZe' && !pending && !tableAnim;
  const atmosphere = REGIONS[rival.region - 1]?.atmosphere ?? 'boteco';

  return (
    <TileSkinContext.Provider value={tileSkin}>
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
        status={tableAnim?.by === 'tioZe' ? 'JOGOU!' : null}
        mood={mood}
        hurtKey={tioZeHurtKey}
        speech={speech}
        hushSpeech={Boolean(selectedTile)}
        handRef={rivalHandRef}
        roundKey={`${state.run.match}:${state.round}`}
        press={press}
      />

      <TableBoard
        board={state.board}
        roundKey={`${state.run.match}:${state.round}`}
        playableSides={selectedSides}
        onPlaySide={handlePlaySide}
        dimmed={roundFinished && !tableAnim}
        previewDouble={Boolean(selectedTile && !discardMode && selectedTile.a === selectedTile.b)}
        frameRef={tableRef}
        endMarks={endMarks}
        felt={rival.felt}
        decor={rival.decor}
        atmosphere={atmosphere}
        incoming={tableAnim}
        noMoves={forcedPass && !menuOpen && !devOpen}
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
        passRule={passRule}
        onPass={handlePass}
        hearts={state.hearts.player}
        maxHearts={state.maxHearts.player}
        coins={state.coins.player}
        endsSum={ends ? ends.left + ends.right : null}
        hint={hint}
        discardMode={discardMode}
        onDiscard={handleDiscard}
        onSkipDiscard={handleSkipDiscard}
        onSecretTap={gameSecretTap}
        relics={state.relics.player}
        relicFlashes={relicFlashes.player}
        spentRelics={spentRelics}
        canUndo={undoReady}
        onUndo={handleUndo}
        devUnlocked={devUnlocked}
        onOpenDev={openDev}
        muted={muted}
        onToggleMute={toggleMute}
        onOpenMenu={openMenu}
        press={press}
        knownIds={knownIds}
        rivalName={rival.name}
      />

      {playerHurtKey > 0 && <div key={playerHurtKey} className="hurt-flash pointer-events-none fixed inset-0 z-[60]" />}

      <FloatingTexts items={floatItems} onDone={floatDone} />

      {pending?.type === 'drawChoice' && <DrawChoice options={pending.options} onPick={handlePickDraw} />}


      {roundFinished && !tableAnim && !celebrate && (
        <RoundOverlay
          state={state}
          rival={rival}
          onNext={nextRound}
          onContinue={continueToMap}
          autoContinue={!menuOpen && !devOpen}
          onRestart={restartRun}
          onMenu={backToMenu}
        />
      )}

      {celebrate && !tableAnim && (
        <HardUnlockModal
          onContinue={() => {
            sound.playClick();
            setHardUnlocked(true);
          }}
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
    {veil}
    </TileSkinContext.Provider>
  );
}
