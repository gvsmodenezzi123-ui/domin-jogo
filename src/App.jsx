import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { scheduleTioZeTurn } from './ai/tioZeAI.js';
import AchievementToast from './components/AchievementToast.jsx';
import BlackMarketModal from './components/BlackMarketModal.jsx';
import BossIntro from './components/BossIntro.jsx';
import CampaignMap from './components/CampaignMap.jsx';
import CoinEventModal from './components/CoinEventModal.jsx';
import EncounterModal from './components/EncounterModal.jsx';
import DevPanel from './components/DevPanel.jsx';
import DrawChoice from './components/DrawChoice.jsx';
import FloatingTexts from './components/FloatingTexts.jsx';
import InfoBalloon from './components/InfoBalloon.jsx';
import PauseMenu from './components/PauseMenu.jsx';
import PlayerRack from './components/PlayerRack.jsx';
import RivalBench from './components/RivalBench.jsx';
import RoundOverlay from './components/RoundOverlay.jsx';
import SecretBoss from './components/SecretBoss.jsx';
import TilesUnlockModal from './components/TilesUnlockModal.jsx';
import { CoachBox, TutorialCard, TutorialFocus } from './components/TutorialCoach.jsx';
import ScreenVeil from './components/ScreenTransition.jsx';
import { useSceneTransition } from './components/useSceneTransition.js';
import Shop from './components/Shop.jsx';
import TableBoard from './components/TableBoard.jsx';
import { DEAL_STEP_MS } from './components/handFan.js';
import { PACKS } from './data/packs.js';
import { FLIGHT_PLAYER, FLIGHT_RIVAL, flyTile, landTime } from './components/tileFlight.js';
import { kickLamp } from './components/lampKick.js';
import TitleScreen from './components/TitleScreen.jsx';
import IntroScene from './intro/IntroScene.jsx';
import PvpApp from './pvp/PvpApp.jsx';
import { parseRoomInput } from './pvp/protocol.js';
import { loadSavedTable } from './pvp/controller.js';
import { applyReducedMotion, prefersReducedMotion } from './components/motion.js';
import { centerOf, useFloats } from './components/useFloats.js';
import { coinRain, flashOver, goldPop, hitstop, lateralShake, sparkBurst } from './components/juice.js';
import { useLongPress } from './components/useLongPress.js';
import { useStableHandler, useStableValue } from './components/useStable.js';
import { useTripleTap } from './components/useTripleTap.js';
import { TileSkinContext } from './components/tileSkin.js';
import { BOSS_INTRO_IDS, REGIONS, bossMusicOf } from './data/campaign.js';
import { getEnhancement } from './data/enhancedTiles.js';
import { getRelic } from './data/relics.js';
import { SECRET_BOSS, TUTOR, getRival, rivalFor, rivalOf } from './data/rivals.js';
import { TUTORIAL_STEPS } from './data/tutorial.js';
import { modeOf } from './data/difficulty.js';
import {
  ACHIEVEMENT_EVENT,
  ACHIEVEMENT_IDS,
  isAchievementUnlocked,
  loadUnlockedRelics,
  resetAchievements,
  trackAchievements,
  unlockAchievement,
} from './engine/achievements.js';
import { trackStatsEvents } from './engine/accountStats.js';
import { rivalRuleBadge } from './engine/rivalInfo.js';
import { trackRunStatsEvents } from './engine/runStats.js';
import { generateRandomSeed, initPRNG, normalizeSeed, seedLabelOf, shuffle as seededShuffle } from './engine/seedEngine.js';
import { MARKET_MUSIC, SHOP_MUSIC, sound } from './engine/audioSynth.js';
import { mapRegionId, nodeOf, regionIdOf } from './engine/campaignMap.js';
import {
  FULL_SET,
  boardTilesInOrder,
  getOpenEnds,
  getPlayableMoves,
  getValidSides,
} from './engine/dominoLogic.js';
import { bonusFloat, buildPlayerHint, deriveHurtKey, deriveTioZeMood, deriveTioZeSpeech } from './engine/gameFeedback.js';
import { foreseenRivalTile } from './engine/foresight.js';
import { createInitialState, gameReducer } from './engine/gameReducer.js';
import { relicSlotsFor } from './engine/loadout.js';
import {
  addGoldCaps,
  isBlackTilesUnlocked,
  isSilverTilesUnlocked,
  loadEquippedFrame,
  loadUpgrades,
  resetMeta,
  saveBlackTilesUnlocked,
  saveSilverTilesUnlocked,
  subscribeMeta,
  unlockAllMeta,
} from './engine/meta.js';
import {
  canUndo,
  canUseCanivete,
  canUseGrampo,
  drawAvailabilityFor,
  endMarksFor,
  knownPlayerTiles,
  passAvailabilityFor,
  requiredOpeningFor,
  revealedTioZeTiles,
  rivalMechanics,
  rivalNumberCounts,
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
  markOpeningSeen,
  openingSeen,
  resetProgress,
  saveSettings,
  writeRunSave,
} from './engine/progress.js';
import { snapshotRun } from './engine/save.js';
import { markTutorialDone, markTutorialPending, needsTutorial, tutorialStepOf } from './engine/tutorial.js';
import { sellPriceFor } from './engine/shop.js';

// Patch 0.9.2: as pedras de cada rodada saem da semente da run (engine/seedEngine.js), numa
// sequência própria para cada mesa e rodada (`key`): mesma semente + mesmas escolhas = mesmas mãos
const dealDeck = (state, key) => {
  if (state.seed != null) initPRNG(state.seedCode ?? state.seed);
  return seededShuffle(FULL_SET, key);
};
/** Semente da run: sorteia a teia de caminhos, as vitrines e as gorjetas do Seu Tião. */
/** A semente da run nova: a digitada no Balcão (normalizada) ou uma sorteada. */
const seedForRun = (typed) => normalizeSeed(typed) ?? generateRandomSeed();

/** Patch PvP: o link de uma mesa online (?mesa=8B2KQ) abre direto o lobby com o ID preenchido. */
function linkedRoom() {
  try {
    const mesa = new URLSearchParams(window.location.search).get('mesa');
    return mesa ? parseRoomInput(mesa) : null;
  } catch {
    return null;
  }
}

/** O jogo abre direto numa mesa online (o link ?mesa= ou uma mesa guardada)? */
const startsOnline = () => Boolean(linkedRoom() || loadSavedTable());

/** Onde a tela inicial tem o logo e a lâmpada: o último quadro da abertura casa com eles. */
function titleTarget() {
  const logo = document.querySelector('.title-screen .title-logo-svg');
  const lamp = document.querySelector('.title-screen .swinging-lamp .lamp-sprite');
  if (!logo || !lamp) return null;
  return { logo: logo.getBoundingClientRect(), lamp: lamp.getBoundingClientRect() };
}

const DEV_KEY = 'buxaria:dev';
/**
 * Painel DEV por build (APK): 'on' = já vem liberado; 'off' = não existe (os 3 toques não
 * fazem nada); sem a variável (site) = escondido até os 3 toques. Vem de VITE_DEV_PANEL.
 */
const DEV_BUILD = import.meta.env.VITE_DEV_PANEL ?? '';

function readDevFlag() {
  if (DEV_BUILD === 'on') return true;
  if (DEV_BUILD === 'off') return false;
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
/** Canivete Suíço: os botões do modo de escolha (no Giz são PULAR · DESCARTAR). */
const CANIVETE_LABELS = { skip: 'CANCELAR', confirm: 'VIRAR BUCHA' };
/** Grampo de Cabelo (versão 1.4): os botões do modo de escolha. */
const GRAMPO_LABELS = { skip: 'CANCELAR', confirm: 'ESCONDER' };

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

/**
 * Versão 1.5: o combo de múltiplos de 5. Cada jogada que fecha 5 logo depois da anterior do
 * mesmo jogador sobe um degrau no tom (sound.playComboStep); jogada sem 5 zera; rodada nova zera.
 */
const COMBO = { player: 0, tioZe: 0, scored: { player: false, tioZe: false } };

/** Som e tremida para cada evento emitido pelo reducer (`offset`: espera o voo da pedra). */
function runEventFx(ev, shell, table, offset = 0) {
  const at = (fn, extra = 0) => setTimeout(fn, offset + (FX_DELAY[ev.type] ?? 0) + extra);
  switch (ev.type) {
    case 'roundStart':
      COMBO.player = 0;
      COMBO.tioZe = 0;
      COMBO.scored = { player: false, tioZe: false };
      // a mão chega em cascata (PlayerRack): um toque de pedra no feltro para cada uma, com o
      // tom subindo, e a vibração em cascata junto (Versão 2.0: o estalo sai quando a pedra assenta)
      for (let i = 0; i < 7; i += 1) at(() => sound.playDealTick(i), 190 + i * DEAL_STEP_MS);
      at(() => haptic(Array.from({ length: 13 }, (_, i) => (i % 2 ? DEAL_STEP_MS - 9 : 9))), 190);
      break;
    case 'tilePlaced':
      // o som e a tremida saem no pouso do voo (App: stagePlay)
      if (ev.by === 'player' || ev.by === 'tioZe') {
        if (!COMBO.scored[ev.by]) COMBO[ev.by] = 0;
        COMBO.scored[ev.by] = false;
      }
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
    case 'bonus5': {
      const seat = ev.by === 'tioZe' ? 'tioZe' : 'player';
      COMBO[seat] += 1;
      COMBO.scored[seat] = true;
      const step = COMBO[seat] - 1;
      at(() => sound.playComboStep(step));
      break;
    }
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
    // Patch 0.9.4: eventos [?] do mapa
    case 'encounterOpen':
      at(() => sound.playChime('enemy'));
      break;
    case 'encounterResolved':
      at(() => {
        if (ev.tone === 'good') sound.playChime('player');
        else if (ev.tone === 'bad') sound.playChime('enemy');
        else sound.playClick();
      });
      break;
    case 'relicLost':
      at(() => {
        sound.playLock();
        haptic([40, 40, 40]);
      });
      break;
    case 'maxHeartLost':
      at(() => {
        sound.playHeartHit();
        shake(shell, 6);
        haptic([60, 40, 90]);
      });
      break;
    case 'deckTile':
      at(() => sound.playRubySub(), 380);
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
    case 'canivete':
      at(() => {
        sound.playAnvil();
        haptic([20, 30, 20]);
      });
      break;
    // versão 1.4
    case 'grampo':
      at(() => sound.playPass());
      break;
    case 'cuco':
      at(() => {
        sound.playRewind();
        haptic([30, 60, 30]);
      });
      break;
    case 'raffle':
      at(() => sound.playCoinTing(2), 300);
      break;
    case 'relicStolen':
      at(() => {
        sound.playLock();
        haptic([40, 40, 40]);
      }, 400);
      break;
    case 'dev':
      at(() => sound.playClick());
      break;
    case 'roundEnd':
      if (ev.result.kind === 'tranca') {
        // Versão 2.0: tranca de mesa: tudo congela 100 ms (hitstop), depois a mesa treme 6 px
        // soltando faísca, com a bigorna e a vibração pesada
        at(() => {
          sound.playLock();
          hitstop(100).then(() => {
            shake(shell, 6, 420);
            const box = table?.getBoundingClientRect();
            if (box) sparkBurst({ x: box.left + box.width / 2, y: box.top + box.height * 0.58 }, { count: 22, spread: Math.min(150, box.width * 0.4) });
            sound.playSparks();
            haptic([90, 40, 140]);
          });
        });
      } else at(() => sound.playTileSlam(true));
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
  if (state.phase === 'encounter') return MARKET_MUSIC;
  const rival = getRival(state.rivalId);
  return rival.boss ? bossMusicOf(rival.id) : (REGIONS[rival.region - 1]?.music ?? REGIONS[0].music);
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
  if (ev.source === 'table') {
    const seal = centerOf('[data-table-mod]');
    if (seal) return { x: Math.min(seal.x + 90, window.innerWidth - 110), y: seal.y + 26 };
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

/** Versão 1.5: as chances de um pacote em texto curto ("65% COMUM · 25% RARO..."). */
const PACK_RATE_LABEL = { comum: 'COMUM', raro: 'RARO', lendario: 'LENDÁRIO', mitico: 'MÍTICO', normal: 'DE BALCÃO', luxo: 'DE LUXO' };
const packRatesText = (rates) =>
  Object.entries(rates)
    .map(([k, v]) => `${Math.round(v * 100)}% ${PACK_RATE_LABEL[k] ?? k.toUpperCase()}`)
    .join(' · ');

/** Conteúdo do balão do toque longo. */
function inspectInfo(payload, state, rival) {
  if (payload.kind === 'pack') {
    const pack = PACKS[payload.id];
    if (!pack) return null;
    return { title: pack.name.toUpperCase(), rarity: pack.kind === 'tile' ? 'lendario' : 'raro', description: pack.blurb, extra: packRatesText(pack.rates) };
  }
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
  else if (state.phase === 'shop') extra = `VENDE POR $${sellPriceFor(state, relic.id)}`;
  return { title: relic.name.toUpperCase(), rarity: relic.rarity, description: relic.description, extra };
}

/** Onde o anel da aula fica (Patch 0.9.5): no passo de jogar, a pedra e depois o botão da ponta certa. */
const FOCUS_SELECTORS = {
  hearts: '[data-tut="hearts"]',
  hand: '[data-tut="hand"]',
  sum: '[data-tut="sum"]',
  coins: '[data-coin-target="player"]',
  draw: '[data-tut="draw"]',
  pass: '[data-tut="pass"]',
  boneyard: '.boneyard-pile',
};

function tutorialFocusOf(step, selectedId) {
  if (!step || step.card) return null;
  const { expect, focus } = step;
  if (expect.type === 'play') return selectedId === expect.tile ? `[data-tut-side="${expect.side}"]` : `[data-hand-tile="${expect.tile}"]`;
  if (!focus) return null;
  if (focus.startsWith('tile:')) return `[data-hand-tile="${focus.slice(5)}"]`;
  if (focus.startsWith('relic:')) return `[data-relic-slot="player:${focus.slice(6)}"]`;
  return FOCUS_SELECTORS[focus] ?? null;
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
  // o rival no modo da run (as Peças Pretas mudam corações, baralho e talismãs dele)
  const rival = rivalOf(state);
  // Patch 0.8.0: Peças Pretas liberadas (no aparelho) e a moldura equipada; `blackSeen` segura
  // a tela de recompensa até você tocar em continuar
  const blackUnlocked = useSyncExternalStore(subscribeMeta, isBlackTilesUnlocked, () => false);
  const frame = useSyncExternalStore(subscribeMeta, loadEquippedFrame, () => null);
  const [blackSeen, setBlackSeen] = useState(isBlackTilesUnlocked);
  // Patch 0.9.0: o mesmo para as Peças Prateadas (Modo Inferno), ao zerar nas Peças Pretas
  const silverUnlocked = useSyncExternalStore(subscribeMeta, isSilverTilesUnlocked, () => false);
  const [silverSeen, setSilverSeen] = useState(isSilverTilesUnlocked);
  // Patch 0.9.0: entrada do chefe já vista nesta partida (chave da partida)
  const [introDone, setIntroDone] = useState(null);
  // Patch 1.1: a abertura (rua → boteco → bucha → logo) roda toda vez que o jogo abre; na
  // primeira vez inteira, daí em diante com PULAR
  // (o jogo que abre direto numa mesa online — link ?mesa= ou mesa guardada — pula a abertura)
  const [opening, setOpening] = useState(() => ({ on: !startsOnline(), skippable: openingSeen() }));
  const openingDone = useCallback(() => {
    markOpeningSeen();
    setOpening((o) => ({ ...o, on: false }));
  }, [setOpening]);
  // a tela inicial abre direto no Balcão de Maletas? ({ challenge } ou false)
  const [titlePick, setTitlePick] = useState(false);
  // Patch PvP: a mesa online por cima de tudo ({ room } ou null); o solo fica parado na tela inicial
  // (uma mesa guardada — a página recarregou no meio da partida — também volta direto para ela)
  const [online, setOnline] = useState(() => (linkedRoom() ? { room: linkedRoom() } : loadSavedTable() ? { room: null } : null));
  // Patch 0.6.1: corte de cena (fade 350 ms para o preto, troca, 350 ms de volta)
  const { stage: veilStage, go: cutTo } = useSceneTransition();
  // Patch 0.7.0: fila dos avisos de conquista (um por vez, no alto da tela)
  const [toasts, setToasts] = useState([]);
  const toastDone = useCallback((key) => setToasts((queue) => queue.filter((t) => t.key !== key)), []);
  // Patch 0.9.5: partida de treino. `tutorialPending`: o NOVO JOGO abre o treino (1ª vez);
  // `coachReady`: o passo cuja fala já terminou (a vez do Vô Juca só sai depois dela);
  // `nudge`: a bronca da ponta errada ({ key, step, text })
  const [tutorialPending, setTutorialPending] = useState(needsTutorial);
  const [coachReady, setCoachReady] = useState(-1);
  const [nudge, setNudge] = useState(null);
  const tutorialStep = tutorialStepOf(state);
  const tutorialIndex = state.tutorial?.step ?? -1;
  const tutorialExpect = tutorialStep?.expect ?? null;

  // Conquista nova (engine/achievements.js dispara `buxaria-achievement`): mostra o aviso
  // na hora, em qualquer tela, e o talismã dela já entra no sorteio da loja e do beco.
  useEffect(() => {
    let n = 0;
    const onAchievement = (event) => {
      const detail = event.detail;
      if (!detail?.id) return;
      n += 1;
      setToasts((queue) => (queue.some((t) => t.id === detail.id) ? queue : [...queue, { ...detail, key: `${detail.id}:${n}` }]));
      if (detail.relicId) dispatch({ type: 'UNLOCK_RELICS', ids: [detail.relicId] });
    };
    window.addEventListener(ACHIEVEMENT_EVENT, onAchievement);
    return () => window.removeEventListener(ACHIEVEMENT_EVENT, onAchievement);
  }, []);

  useEffect(() => sound.setVolumes(settings), [settings]);
  useEffect(() => applyReducedMotion(settings.reducedMotion), [settings.reducedMotion]);

  // Trilha: Boteco (jazz), Clube da Sinuca (funk) e Submundo/chefes (tensão). Só depois do 1º toque.
  const musicTrack = musicFor(state);
  // Patch 1.1: durante a abertura o som é dela (a trilha do menu entra na batida do logo)
  const openingSound = opening.on && state.phase === 'title';
  // na mesa online quem escolhe a trilha é ela (PvpApp); ao sair, a do menu volta
  const onlineOn = Boolean(online);
  useEffect(() => {
    if (sound.ctx && !openingSound && !onlineOn) sound.playTrack(musicTrack);
  }, [musicTrack, openingSound, onlineOn]);

  // Camada de tensão da trilha: alguém na mesa com 1 ou 2 corações.
  const tense =
    !state.tutorial && (state.phase === 'playing' || state.phase === 'roundOver') && Math.min(state.hearts.player, state.hearts.tioZe) <= 2;
  useEffect(() => sound.setTension(tense), [tense]);

  const clearTableAnim = useCallback(() => {
    animTimers.current.forEach((id) => clearTimeout(id));
    animTimers.current = [];
    cancelFlight.current?.();
    cancelFlight.current = null;
    setTableAnim(null);
  }, []);
  useEffect(() => clearTableAnim, [clearTableAnim]);

  // Patch 0.9.0: entrada do chefe ao sentar na mesa dele, uma vez por partida (a chave é a
  // partida da run); some sozinha ou com um toque
  const bossIntroKey =
    (state.phase === 'playing' || state.phase === 'roundOver') && BOSS_INTRO_IDS.includes(state.rivalId) ? `${state.seed ?? 0}:${state.run.match}` : null;
  const showBossIntro = bossIntroKey !== null && introDone !== bossIntroKey;
  const finishBossIntro = useCallback(() => setIntroDone(bossIntroKey), [bossIntroKey]);

  // Rival: cada mudança de estado na vez dele agenda a próxima ação (cada um tem seu tempo).
  // Ele espera com o menu ou o painel DEV abertos, enquanto você decide
  // (escolha do Barbante, descarte do Giz), enquanto a jogada anterior dele está em cena e
  // durante a entrada do chefe.
  // No treino (Patch 0.9.5), o Vô Juca só joga no passo dele e depois de terminar a fala.
  const tutorialHold = Boolean(state.tutorial) && (tutorialExpect?.type !== 'rival' || coachReady !== tutorialIndex);
  useEffect(() => {
    if (menuOpen || devOpen || tableAnim || showBossIntro || tutorialHold || state.phase !== 'playing' || state.turn !== 'tioZe' || state.pending) return undefined;
    return scheduleTioZeTurn(dispatch, rivalOf(state).reflexMs);
  }, [state, menuOpen, devOpen, tableAnim, showBossIntro, tutorialHold]);

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
          kickLamp(ev.double ? 1.4 : 1);
          if (ev.double) {
            // Versão 2.0: bucha: a tela treme 3 px para os lados, a mesa dá um clarão, a mão
            // espalmada bate pesada na fórmica e o celular dá a vibração pesada
            lateralShake(shellRef.current, 3, 220);
            flashOver(tableRef.current);
            sound.playPalmSlap();
            haptic([70, 30, 100]);
          } else {
            shake(tableRef.current, 3, SLAM_SHAKE_MS);
            haptic(15);
          }
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

  // o estado mais recente para quem roda depois dos eventos (sem refazer o efeito a cada mudança)
  const latestState = useRef(state);
  useEffect(() => {
    latestState.current = state;
  });

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
        // Versão 2.0: o número dourado gigante pula na pedra (1,5 → 1,0) e a chuva de moedas voa
        // da pedra até o contador, que pulsa quando a última chega; o +$ sobe da pedra
        pushFloat(() => {
          const from = centerOf(`[data-tile-id="${tileId}"]`);
          if (!from) return null;
          const targetEl = document.querySelector(`[data-coin-target="${info.to}"]`);
          const to = centerOf(targetEl);
          goldPop({ x: from.x, y: from.y - 26 }, `${ev.sum}`, { tone: info.tone });
          if (to) coinRain(from, to, { count: 4 + Math.min(8, ev.amount * 2), targetEl, onArrive: (i) => sound.playCoinTing(i) });
          return { from: { x: from.x, y: from.y + 18 }, text: info.text, tone: info.tone, kind: 'label' };
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
    // Patch 0.7.0: as conquistas conferem as metas nos eventos novos (ao vencer o Tio Zé,
    // ao jogar a 3ª pedra paga com coração, ao vencer a tranca com 1 pedra...); no 0.8.0
    // também as tampinhas, as maletas e os desafios
    // Patch 0.9.1: a carreira (Caderno de Fiado) soma os mesmos eventos; vem antes das
    // conquistas para o ponto de partida das tampinhas ainda não ter as desta mesa
    // Patch 0.9.5: a partida de treino não conta (carreira, lousa, conquistas)
    if (latestState.current.tutorial) return;
    trackStatsEvents(fresh, latestState.current);
    // Patch 0.9.2: os números desta tentativa (lousa do fim)
    trackRunStatsEvents(fresh, latestState.current);
    trackAchievements(fresh, latestState.current);
  }, [state.events, state.lastPlay, state.phase, pushFloat, stagePlay]);

  // Save: no mapa, na loja e no beco (ao vencer o nó e depois do Seu Tião, volta no mapa);
  // some quando a run acaba.
  useEffect(() => {
    // Patch 0.9.4: no evento [?] também (antes de escolher, o CONTINUAR reabre o mesmo evento; depois, o nó já conta)
    if (state.phase === 'map' || state.phase === 'matchWon' || state.phase === 'coinEvent' || state.phase === 'encounter') writeRunSave(snapshotRun(state, 'map', Date.now()));
    else if (state.phase === 'shop') writeRunSave(snapshotRun(state, 'shop', Date.now()));
    else if (state.phase === 'blackMarket') writeRunSave(snapshotRun(state, 'blackMarket', Date.now()));
    else if (state.phase === 'gameOver' || state.phase === 'runWon') clearRunSave();
  }, [state]);

  // Patch 0.8.0: derrotou o Comendador nas Peças Brancas com as Pretas ainda trancadas → tela
  // de recompensa antes do final (ou da revelação do Dono da Noite), e o desbloqueio vai
  // para o aparelho na hora (buxaria_black_tiles_unlocked = true)
  // Patch 0.9.0: zerar nas Peças Pretas com as Prateadas trancadas → a recompensa do Inferno
  const runOver = state.phase === 'runWon' || state.phase === 'secretReveal';
  const runMode = modeOf(state.mode).id;
  const reward = !runOver ? null : runMode === 'normal' && !blackSeen ? 'black' : runMode === 'hard' && !silverSeen ? 'silver' : null;
  const celebrate = reward !== null;
  useEffect(() => {
    if (reward === 'black') saveBlackTilesUnlocked(true);
    if (reward === 'silver') saveSilverTilesUnlocked(true);
  }, [reward]);

  // Livro de Boteco: tudo que passa pela mesa fica registrado.
  useEffect(() => {
    // o treino com o Vô Juca não entra no livro
    if (state.phase === 'title' || state.tutorial) return;
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
  // Canivete Suíço: escolher a pedra que vira bucha usa o mesmo leque do descarte do Giz
  const caniveteMode = pending?.type === 'canivete';
  // Grampo de Cabelo (versão 1.4): escolher a bucha que some no dorme
  const grampoMode = pending?.type === 'grampo';
  const pickMode = discardMode || caniveteMode || grampoMode;
  // enquanto a jogada do rival está em cena, a sua vez ainda não começou
  const isPlayerTurn = playing && state.turn === 'player' && !pending && !tableAnim;
  const hand = state.hands.player;
  // Patch 0.5.4: valores recalculados a cada render ficam com a mesma identidade enquanto não mudam,
  // para os componentes com React.memo (mesa, leque, botões, cabeçalho) não redesenharem à toa
  const playerRules = useStableValue(rulesFor(state, 'player'));
  const requiredTileId = requiredOpeningFor(state, 'player');

  const playableIds = useMemo(() => {
    if (discardMode) return new Set(hand.map((t) => t.id));
    // bucha já é bucha: o Canivete só serve nas outras
    if (caniveteMode) return new Set(hand.filter((t) => t.a !== t.b).map((t) => t.id));
    if (grampoMode) return new Set(hand.filter((t) => t.a === t.b).map((t) => t.id));
    if (!isPlayerTurn) return new Set();
    const moves = getPlayableMoves(hand, state.board, requiredTileId, playerRules).map((m) => m.tile.id);
    // no treino só acende a pedra que o passo pede
    if (tutorialExpect) return new Set(tutorialExpect.type === 'play' ? moves.filter((id) => id === tutorialExpect.tile) : []);
    return new Set(moves);
  }, [discardMode, caniveteMode, grampoMode, isPlayerTurn, hand, state.board, requiredTileId, playerRules, tutorialExpect]);

  const selectedTile =
    isPlayerTurn || pickMode ? (hand.find((t) => t.id === selectedId && playableIds.has(t.id)) ?? null) : null;
  const selectedSides = useStableValue(selectedTile && !pickMode ? getValidSides(selectedTile, state.board, playerRules) : []);

  // a escada de compra do jogador (o Pacto do Coveiro deixa a 3ª compra mais cara)
  const draw = useStableValue(drawAvailabilityFor(state, 'player'));
  const boardOpen = Boolean(state.board.root);
  const canDraw = isPlayerTurn && boardOpen && draw.allowed && (!tutorialExpect || tutorialExpect.type === 'draw');
  // Patch 0.5.4: sem jogada a 1ª compra é obrigatória; podendo jogar, o passe custa $3
  const passRule = useStableValue(isPlayerTurn && boardOpen ? passAvailabilityFor(state, 'player') : null);
  const canPass = Boolean(passRule?.allowed) && (!tutorialExpect || tutorialExpect.type === 'pass');
  const forcedPass = playing && state.pending?.type === 'forcedPass';
  const undoReady = canUndo(state) && !tableAnim;
  const caniveteReady = isPlayerTurn && canUseCanivete(state);
  const grampoReady = isPlayerTurn && !tutorialExpect && canUseGrampo(state);

  const speechNow = useMemo(() => deriveTioZeSpeech(state.events, state.rivalId), [state.events, state.rivalId]);
  // no treino quem fala é a caixa da aula
  const speech = useStableValue(state.tutorial ? null : speechNow);
  const flashesNow = useMemo(() => deriveRelicFlashes(state.events), [state.events]);
  const relicFlashes = useStableValue(flashesNow);
  const mood = deriveTioZeMood(state);
  const tioZeHurtKey = deriveHurtKey(state.events, 'tioZe');
  const playerHurtKey = deriveHurtKey(state.events, 'player');
  // Óculos Fundo de Garrafa: na vez do rival, a pedra que ele vai jogar aparece virada antes de sair
  const foreseen = useMemo(() => foreseenRivalTile(state), [state]);
  const foreseenId = foreseen?.id ?? null;
  const revealedBase = revealedTioZeTiles(state);
  const revealedNow = foreseen && !revealedBase.some((t) => t.id === foreseen.id) ? [...revealedBase, foreseen] : revealedBase;
  const revealed = useStableValue(revealedNow, revealedNow.map((t) => t.id).join(','));
  const endMarks = useStableValue(endMarksFor(state));
  // versão 1.4: o selo da regra do rival, a contagem da Lupa de Joalheiro e o dorme do Geraldo
  const rivalRule = useStableValue(rivalRuleBadge(state));
  const numberCounts = useStableValue(playing ? rivalNumberCounts(state) : null);
  const boneyardHidden = Boolean(rivalMechanics(state).hideBoneyard);
  const spentRelics = useStableValue(spentRelicsOf(state, 'player'));
  const knownKey = playing ? knownPlayerTiles(state).map((t) => t.id).join(',') : null;
  const knownIds = useMemo(() => (knownKey === null ? null : new Set(knownKey ? knownKey.split(',') : [])), [knownKey]);

  const gameHint = buildPlayerHint({
    state,
    isPlayerTurn,
    selectedTile,
    playableCount: playableIds.size,
    drawAllowed: canDraw,
    passRule,
    rules: playerRules,
    rivalName: rival.name,
  });
  // no treino a instrução mora na caixa da aula
  const hint = tutorialStep ? '' : gameHint;

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
    if (pickMode) {
      if (!playableIds.has(tile.id)) return;
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
    if (!selectedTile || discardMode) return;
    // treino: a ponta errada não joga; o Vô Juca corrige
    if (tutorialExpect?.type === 'play' && side !== tutorialExpect.side) {
      sound.playNoMoves();
      haptic([30, 40, 30]);
      setNudge((cur) => ({ key: (cur?.key ?? 0) + 1, step: tutorialIndex, text: tutorialStep.nudge ?? 'Na outra ponta!' }));
      return;
    }
    play(selectedTile.id, side);
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

  const handleCanivete = useStableHandler(() => {
    if (!caniveteReady) return;
    sound.playPowerSelect();
    setSelectedId(null);
    dispatch({ type: 'USE_CANIVETE' });
  });

  const handleCanivetePick = useStableHandler(() => {
    if (!caniveteMode || !selectedTile) return;
    dispatch({ type: 'CANIVETE_PICK', tileId: selectedTile.id });
    setSelectedId(null);
  });

  const handleCancelCanivete = useStableHandler(() => {
    sound.playClick();
    setSelectedId(null);
    dispatch({ type: 'CANCEL_CANIVETE' });
  });

  const handleGrampo = useStableHandler(() => {
    if (!grampoReady) return;
    sound.playPowerSelect();
    setSelectedId(null);
    dispatch({ type: 'USE_GRAMPO' });
  });

  const handleGrampoPick = useStableHandler(() => {
    if (!grampoMode || !selectedTile) return;
    dispatch({ type: 'GRAMPO_PICK', tileId: selectedTile.id });
    setSelectedId(null);
  });

  const handleCancelGrampo = useStableHandler(() => {
    sound.playClick();
    setSelectedId(null);
    dispatch({ type: 'CANCEL_GRAMPO' });
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

  /** INICIAR RUN no Balcão: a maleta, as peças (Brancas/Pretas), o desafio e as melhorias compradas. */
  const newGame = ({ maleta = 'classica', mode = 'normal', challenge = null, seed = '' } = {}) => {
    const seedCode = seedForRun(seed);
    const seedNumber = initPRNG(seedCode);
    wakeAudio();
    sound.playClick();
    cutTo(() => {
      resetTable();
      clearRunSave();
      setSave(null);
      setTitlePick(false);
      dispatch({ type: 'NEW_RUN', seed: seedNumber, seedCode, mode: modeOf(mode).id, maleta, challenge, perks: loadUpgrades(), unlocks: loadUnlockedRelics() });
    });
  };

  /** TENTAR DE NOVO no fim da run: direto para o Balcão de Maletas, com os bônus novos. */
  const restartRun = () => {
    sound.playClick();
    cutTo(() => {
      resetTable();
      dispatch({ type: 'RETURN_TO_TITLE' });
      setSave(loadRunSave());
      setCollection(bookRef.current);
      setTitlePick({ challenge: null });
    });
  };

  /** O Dono da Noite: SENTAR À MESA abre a partida do nó 19, com corte de cena. */
  const sitWithDono = () => {
    sound.playClick();
    cutTo(() => {
      resetTable();
      dispatch({ type: 'START_SECRET', deck: dealDeck(state, `${state.run.node}:${SECRET_BOSS}:1`) });
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
    // a semente do save volta a ser a ativa (as rodadas seguintes saem dela)
    initPRNG(saved.seedCode ?? saved.seed ?? 0);
    cutTo(() => {
      resetTable();
      dispatch({ type: 'LOAD_RUN', save: saved, perks: loadUpgrades(), unlocks: loadUnlockedRelics() });
    });
  };

  /** Mapa: entra no nó escolhido (mesa, loja, beco ou Seu Tião), com corte de cena. */
  const enterNode = (nodeId) => {
    sound.playClick();
    cutTo(() => {
      resetTable();
      dispatch({ type: 'CHOOSE_NODE', nodeId, deck: dealDeck(state, `${nodeId}:${nodeOf(state, nodeId)?.rivalId ?? 'parada'}:1`) });
    });
  };

  const nextRound = () => {
    sound.playClick();
    setSelectedId(null);
    dispatch({ type: 'NEXT_ROUND', deck: dealDeck(state, `${state.run.node}:${state.rivalId}:${state.round + 1}`) });
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

  /**
   * Patch 0.9.5: a partida de treino com o Vô Juca (o 1º NOVO JOGO, ou REVER O TREINO nas
   * Opções: `replay`). Começando de verdade, o save antigo some como no NOVO JOGO.
   */
  const startTutorial = ({ replay = false } = {}) => {
    wakeAudio();
    sound.playClick();
    cutTo(() => {
      resetTable();
      if (!replay) {
        clearRunSave();
        setSave(null);
      }
      setTitlePick(false);
      setCoachReady(-1);
      setNudge(null);
      dispatch({ type: 'START_TUTORIAL', replay });
    });
  };

  /** Fim (ou PULAR) do treino: da 1ª vez, a run começa no mapa (Clássica, Peças Brancas); revendo, volta ao menu. */
  const finishTutorial = () => {
    markTutorialDone();
    setTutorialPending(false);
    if (state.tutorial?.replay) backToMenu();
    else newGame({ maleta: 'classica', mode: 'normal' });
  };

  const tutorialNext = () => {
    sound.playClick();
    dispatch({ type: 'TUTORIAL_NEXT' });
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
    if (DEV_BUILD === 'off') return;
    saveDevFlag();
    setDevUnlocked(true);
    sound.init();
    sound.playChime('info');
  }, []);
  const openDevFromGame = useCallback(() => {
    if (DEV_BUILD === 'off') return;
    unlockDev();
    setDevOpen(true);
  }, [unlockDev]);
  const titleSecretTap = useTripleTap(unlockDev);
  const gameSecretTap = useTripleTap(openDevFromGame);

  // painel DEV: tranca ou libera as Peças Pretas (para testar o Balcão)
  const toggleBlack = () => {
    const next = !blackUnlocked;
    saveBlackTilesUnlocked(next);
    setBlackSeen(next);
  };
  // ...e as Peças Prateadas (Modo Inferno)
  const toggleSilver = () => {
    const next = !silverUnlocked;
    saveSilverTilesUnlocked(next);
    setSilverSeen(next);
  };

  const devAction = (action) => {
    // conquistas (Patch 0.7.0): a próxima trancada sai com o aviso; zerar tranca tudo de novo
    if (action.op === 'achievementNext') {
      const id = ACHIEVEMENT_IDS.find((a) => !isAchievementUnlocked(a));
      if (id) unlockAchievement(id);
      return;
    }
    if (action.op === 'achievementReset') {
      resetAchievements();
      dispatch({ type: 'UNLOCK_RELICS', ids: [], reset: true });
      return;
    }
    // meta-progressão (Patch 0.8.0): tampinhas, maletas e desafios
    if (action.op === 'capsAdd') {
      addGoldCaps(10);
      return;
    }
    if (action.op === 'metaUnlockAll') {
      unlockAllMeta();
      return;
    }
    if (action.op === 'metaReset') {
      resetMeta();
      return;
    }
    // Patch 0.9.5: o próximo NOVO JOGO abre a partida de treino de novo
    if (action.op === 'tutorialAgain') {
      markTutorialPending();
      setTutorialPending(true);
      return;
    }
    setSelectedId(null);
    // trocar de rival recomeça a partida: precisa de um baralho novo
    dispatch(action.op === 'setRival' ? { ...action, deck: dealDeck(state, `dev:${action.rivalId}:${state.seq}`) } : action);
    if (action.op === 'setRival') {
      clearFloats();
      clearTableAnim();
    }
    if (action.op === 'openStop') {
      clearFloats();
      clearTableAnim();
    }
    if (action.op === 'secretReveal') {
      clearFloats();
      clearTableAnim();
    }
    // tranca forçada, vitória e os atalhos de cena abrem outra tela: fecha o painel para ver
    if (['forceTranca', 'winMatch', 'setRival', 'openStop', 'secretReveal'].includes(action.op)) setDevOpen(false);
  };

  // o corte de cena e o aviso de conquista vão em todas as telas
  const veil = (
    <>
      <ScreenVeil stage={veilStage} />
      <AchievementToast toast={toasts[0] ?? null} onDone={toastDone} />
    </>
  );
  // Peças Pretas: as pedras comuns da partida viram ébano com pips brancos
  const tileSkin = state.phase !== 'title' ? modeOf(state.mode).skin : 'bone';

  if (online) {
    return (
      <>
        <PvpApp
          settings={settings}
          onSettings={changeSettings}
          muted={muted}
          onToggleMute={toggleMute}
          initialRoom={online.room ?? null}
          onExit={() => {
            setOnline(null);
            if (sound.ctx) sound.playTrack(REGIONS[0].music);
          }}
        />
        {veil}
      </>
    );
  }

  if (state.phase === 'title') {
    return (
      <TileSkinContext.Provider value={tileSkin}>
      <div className="app-shell h-full">
        <TitleScreen
          key={titlePick ? 'maletas' : 'menu'}
          save={save}
          blackUnlocked={blackUnlocked}
          silverUnlocked={silverUnlocked}
          startPicking={titlePick}
          onNewGame={newGame}
          tutorialPending={tutorialPending}
          onTutorial={startTutorial}
          onContinue={continueRun}
          settings={settings}
          onSettings={changeSettings}
          onResetProgress={wipeProgress}
          collection={collection}
          onSecretTap={titleSecretTap}
          onTap={titleTap}
          devUnlocked={devUnlocked}
          onOnline={() => {
            titleTap();
            setOpening((o) => ({ ...o, on: false }));
            setOnline({ room: null });
          }}
        />
      </div>
      {opening.on && <IntroScene skippable={opening.skippable} onDone={openingDone} measureTarget={titleTarget} />}
      {veil}
      </TileSkinContext.Provider>
    );
  }

  // nas cenas (loja, beco, Seu Tião) o saldo mora no topo: o chip DEV desce
  const sceneChip = ['shop', 'blackMarket', 'coinEvent', 'encounter'].includes(state.phase);
  const devPanel = devOpen && (
    <DevPanel
      state={state}
      onAction={devAction}
      onClose={() => setDevOpen(false)}
      blackUnlocked={blackUnlocked}
      onToggleBlack={toggleBlack}
      silverUnlocked={silverUnlocked}
      onToggleSilver={toggleSilver}
    />
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

  if (state.phase === 'encounter') {
    return (
      <TileSkinContext.Provider value={tileSkin}>
        <div ref={shellRef} className="app-shell h-full">
          <EncounterModal
            state={state}
            onChoose={(choice) => {
              sound.playClick();
              dispatch({ type: 'ENCOUNTER_CHOOSE', choice });
            }}
            onLeave={leaveTo('LEAVE_ENCOUNTER')}
          />
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
            onBuyPack={(index) => {
              sound.playCaseOpen();
              haptic([12, 40, 12]);
              dispatch({ type: 'SHOP_BUY_PACK', index });
            }}
            onPackPick={(index) => {
              sound.playPurchase();
              haptic(20);
              dispatch({ type: 'SHOP_PACK_PICK', index });
            }}
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
        foreseenId={foreseenId}
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
        numberCounts={numberCounts}
      />
      {state.tutorial && <div className="tut-spacer shrink-0" aria-hidden="true" />}

      <TableBoard
        board={state.board}
        roundKey={`${state.run.match}:${state.round}`}
        playableSides={selectedSides}
        onPlaySide={handlePlaySide}
        dimmed={(roundFinished || state.phase === 'secretReveal') && !tableAnim}
        previewDouble={Boolean(selectedTile && !discardMode && selectedTile.a === selectedTile.b)}
        frameRef={tableRef}
        endMarks={endMarks}
        felt={rival.felt}
        decor={rival.decor}
        atmosphere={atmosphere}
        incoming={tableAnim}
        noMoves={forcedPass && !menuOpen && !devOpen}
        boneyardCount={state.boneyard.length}
        tableMod={state.tableMod}
        boneyardHidden={boneyardHidden}
        rivalRule={rivalRule}
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
        discardMode={pickMode}
        pickLabels={caniveteMode ? CANIVETE_LABELS : grampoMode ? GRAMPO_LABELS : undefined}
        onDiscard={caniveteMode ? handleCanivetePick : grampoMode ? handleGrampoPick : handleDiscard}
        onSkipDiscard={caniveteMode ? handleCancelCanivete : grampoMode ? handleCancelGrampo : handleSkipDiscard}
        onSecretTap={gameSecretTap}
        relics={state.relics.player}
        relicSlots={relicSlotsFor(state)}
        frame={frame}
        relicFlashes={relicFlashes.player}
        spentRelics={spentRelics}
        canUndo={undoReady}
        onUndo={handleUndo}
        canCanivete={caniveteReady}
        onCanivete={handleCanivete}
        canGrampo={grampoReady}
        onGrampo={handleGrampo}
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


      {roundFinished && !tableAnim && !celebrate && !state.tutorial && (
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
        <TilesUnlockModal
          kind={reward}
          continueLabel={state.phase === 'secretReveal' ? 'CONTINUAR' : 'VER O FINAL'}
          onContinue={() => {
            sound.playClick();
            if (reward === 'silver') setSilverSeen(true);
            else setBlackSeen(true);
          }}
        />
      )}

      {showBossIntro && <BossIntro key={bossIntroKey} rival={rival} onDone={finishBossIntro} ball={state.fx.raffle?.number ?? null} />}

      {state.phase === 'secretReveal' && !tableAnim && !celebrate && <SecretBoss rival={rivalFor(SECRET_BOSS, state.mode)} onSit={sitWithDono} />}

      {/* Patch 0.9.5: a aula do Vô Juca por cima da mesa (some com o menu ou o painel DEV abertos) */}
      {tutorialStep && !menuOpen && !devOpen && (
        tutorialStep.card ? (
          <TutorialCard
            key={tutorialIndex}
            step={tutorialStep}
            stepIndex={tutorialIndex}
            tutor={TUTOR}
            replay={Boolean(state.tutorial.replay)}
            onNext={tutorialNext}
            onFinish={finishTutorial}
            onSkip={finishTutorial}
          />
        ) : (
          <>
            <CoachBox
              key={tutorialIndex}
              step={tutorialStep}
              stepIndex={tutorialIndex}
              total={TUTORIAL_STEPS.length}
              tutor={TUTOR}
              hearts={state.hearts.tioZe}
              maxHearts={state.maxHearts.tioZe}
              nudge={nudge?.step === tutorialIndex ? nudge : null}
              onNext={tutorialNext}
              onReady={setCoachReady}
              onSkip={finishTutorial}
            />
            <TutorialFocus selector={tutorialFocusOf(tutorialStep, selectedTile?.id ?? null)} />
          </>
        )
      )}

      {menuOpen && (
        <PauseMenu
          rivalName={rival.name}
          seedCode={seedLabelOf(state)}
          muted={muted}
          onToggleMute={toggleMute}
          onResume={closeMenu}
          onQuit={backToMenu}
          settings={settings}
          onSettings={changeSettings}
          tutorial={state.tutorial ? (state.tutorial.replay ? 'replay' : 'first') : null}
        />
      )}

      <InfoBalloon info={balloon} />
      {devPanel}
    </div>
    {veil}
    </TileSkinContext.Provider>
  );
}
