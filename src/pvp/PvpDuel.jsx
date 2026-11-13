import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DrawChoice from '../components/DrawChoice.jsx';
import FloatingTexts from '../components/FloatingTexts.jsx';
import InfoBalloon from '../components/InfoBalloon.jsx';
import PlayerRack from '../components/PlayerRack.jsx';
import RivalBench from '../components/RivalBench.jsx';
import TableBoard from '../components/TableBoard.jsx';
import { mapTable } from '../data/tableMaps.js';
import MaletaSprite from '../components/MaletaPixel.jsx';
import { kickLamp } from '../components/lampKick.js';
import { coinRain, goldPop } from '../components/juice.js';
import { FLIGHT_PLAYER, FLIGHT_RIVAL, flyTile, landTime } from '../components/tileFlight.js';
import { centerOf, useFloats } from '../components/useFloats.js';
import { useLongPress } from '../components/useLongPress.js';
import { useStableHandler, useStableValue } from '../components/useStable.js';
import { getEnhancement } from '../data/enhancedTiles.js';
import { getRelic } from '../data/relics.js';
import { sound } from '../engine/audioSynth.js';
import { getOpenEnds, getPlayableMoves, getValidSides } from '../engine/dominoLogic.js';
import { prefersReducedMotion } from '../components/motion.js';
import { bonusFloat, buildPlayerHint } from '../engine/gameFeedback.js';
import { haptic } from '../engine/progress.js';
import { canUseCanivete, canUseGrampo, drawAvailabilityFor, endMarksFor, passAvailabilityFor, requiredOpeningFor, revealedTioZeTiles, rulesFor, spentRelicsOf } from '../engine/powers.js';
import { actorOf } from './duelHost.js';
import { deriveRelicFlashes, hurtKeyOf, procOrigin, runEventFx, shake, tileName } from './duelFx.js';
import NetBadge from './NetBadge.jsx';
import DangerFx from '../components/DangerFx.jsx';
import { dangerOf } from '../engine/danger.js';
import PvpRoundResult from './PvpRoundResult.jsx';
import { FINALE_TITLE, finaleLines, lastPlacedOf, leavingTileOf, shortName } from '../components/finale.js';
import { cancelSweep, dealRivalsFromDorme, sweepToDorme } from '../components/tableSweep.js';
import { useSecondsLeft } from './useNow.js';
import { useLandscape } from '../components/useLandscape.js';
import ScreenBreak from '../components/ScreenBreak.jsx';
import HurtBlink from '../components/HurtBlink.jsx';

const PLAYER_FLIGHT_MS = landTime(FLIGHT_PLAYER);
const RIVAL_FLIGHT_MS = landTime(FLIGHT_RIVAL);
const SPOTLIGHT_MS = 800;
const LANDED_MS = 280;
const SLAM_SHAKE_MS = 150;
/** Versão 2.6: a hora da batida (a mesa segura acesa com a última pedra brilhando antes do placar). */
const FINALE_MS = 1350;

const CANIVETE_LABELS = { skip: 'CANCELAR', confirm: 'VIRAR BUCHA' };
const GRAMPO_LABELS = { skip: 'CANCELAR', confirm: 'ESCONDER' };

/** O feltro da mesa online (verde-garrafa, um tom mais frio que o do Tio Zé). */
const PVP_FELT = Object.freeze({ light: '#2f4a3c', mid: '#223a2e', dark: '#16281f' });

function inspectInfo(payload, oppName) {
  if (payload.kind === 'tile') {
    const enhancement = getEnhancement(payload.tile.enhancement);
    if (!enhancement) return null;
    return { title: `${tileName(payload.tile.id)} DE ${enhancement.name.toUpperCase()}`, rarity: enhancement.rarity, description: enhancement.description, extra: null };
  }
  const relic = getRelic(payload.id);
  if (!relic) return null;
  const extra = payload.owner === 'tioZe' ? `DE ${oppName.toUpperCase()}: O EFEITO É DELE, CONTRA VOCÊ` : null;
  return { title: relic.name.toUpperCase(), rarity: relic.rarity, description: relic.description, extra };
}

/**
 * Patch PvP: a mesa de feltro do duelo online. É a mesma mesa do solo (RivalBench, TableBoard,
 * PlayerRack), mas o outro lado é a outra pessoa: a maleta e o nome dela no retrato, os
 * corações e talismãs de verdade, o cronômetro de 30 s da jogada e nenhuma IA.
 * `duel.view` é a mesa vista daqui (você é sempre a cadeira 'player').
 */
export default function PvpDuel({ duel, map = null, opp, relicSlots, link, ping, muted, onToggleMute, onIntent, onMenu, onNextRound, onFinish, frame = null }) {
  const view = duel.view;
  const [selectedId, setSelectedId] = useState(null);
  // Versão 2.0: a altura da faixa da mão, deitada na mesa (PlayerRack mede, a mesa reserva)
  const [handZone, setHandZone] = useState(0);
  // versão 2.9: tela deitada, o outro senta do outro lado da mesa (silhueta + maleta)
  const landscape = useLandscape();
  const [tableAnim, setTableAnim] = useState(null);
  // versão 2.6: a última jogada que já começou a voar (até lá a pedra fica escondida na mesa)
  const [stagedSeq, setStagedSeq] = useState(() => Math.max(0, ...duel.view.events.map((e) => e.seq)));
  const [finaleDone, setFinaleDone] = useState(null);
  const [inspect, setInspect] = useState(null);
  const { items: floatItems, push: pushFloat, done: floatDone, clear: clearFloats } = useFloats();
  const shellRef = useRef(null);
  const tableRef = useRef(null);
  const rivalHandRef = useRef(null);
  const animTimers = useRef([]);
  const fxTimers = useRef([]);
  const cancelFlight = useRef(null);
  const pendingPlay = useRef(null);
  // eventos já tratados (a mesa que já estava aberta ao montar não toca tudo de novo)
  const processed = useRef({ duel: duel.id, seq: Math.max(0, ...view.events.map((e) => e.seq)) });

  // versão 2.13: a sala que quem abriu a mesa escolheu (o cenário, a luz, o feltro e a trilha)
  const sala = useMemo(() => mapTable(map, PVP_FELT), [map]);
  const oppRival = useMemo(() => ({ id: 'tioZe', name: opp.name, art: null, felt: sala.felt, decor: sala.decor, light: sala.lighting }), [opp.name, sala]);
  const avatar = useMemo(() => <MaletaSprite id={opp.maleta ?? 'classica'} className="block h-12 w-12" />, [opp.maleta]);

  useEffect(
    () => () => {
      animTimers.current.forEach(clearTimeout);
      fxTimers.current.forEach(clearTimeout);
      cancelFlight.current?.();
    },
    [],
  );

  const stagePlay = useCallback(
    (ev) => {
      animTimers.current.forEach((id) => clearTimeout(id));
      animTimers.current = [];
      cancelFlight.current?.();
      const rival = ev.by !== 'player';
      let from = null;
      // versão 2.6: a pedra fica na mão até a cópia levantar (o voo esconde a original)
      const fromEl = document.querySelector(rival ? `[data-rival-tile="${ev.tileId}"]` : `[data-hand-tile="${ev.tileId}"]`);
      if (rival) {
        const src = fromEl?.firstElementChild ?? fromEl;
        const hand = src?.getBoundingClientRect() ?? rivalHandRef.current?.getBoundingClientRect();
        if (hand) from = { x: hand.left + hand.width / 2, y: hand.top + hand.height / 2, w: hand.width, h: hand.height, angle: 0 };
      } else if (pendingPlay.current?.tileId === ev.tileId) {
        from = pendingPlay.current.from;
      }
      pendingPlay.current = null;
      const key = ev.seq;
      setTableAnim({ key, tileId: ev.tileId, by: ev.by, stage: 'flight' });
      setStagedSeq((n) => Math.max(n, key));
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
            setTableAnim((cur) => (cur?.key === key ? { ...cur, stage: 'spot' } : cur));
            pushFloat(() => {
              const tile = centerOf(`[data-tile-id="${ev.tileId}"]`, { edge: 'top' });
              return tile && { from: { x: tile.x, y: tile.y - 14 }, text: tileName(ev.tileId), tone: 'enemy', kind: 'label' };
            });
            later(() => setTableAnim((cur) => (cur?.key === key ? null : cur)), SPOTLIGHT_MS);
          } else {
            setTableAnim((cur) => (cur?.key === key ? { ...cur, stage: 'landed' } : cur));
            later(() => setTableAnim((cur) => (cur?.key === key ? null : cur)), LANDED_MS);
          }
        },
      });
    },
    [pushFloat],
  );

  // som, voo e balões dos eventos novos (vale para as suas jogadas e para as do outro)
  useEffect(() => {
    if (processed.current.duel !== duel.id) processed.current = { duel: duel.id, seq: 0 };
    const fresh = view.events.filter((e) => e.seq > processed.current.seq);
    if (!fresh.length) return;
    processed.current.seq = fresh[fresh.length - 1].seq;
    let offset = 0;
    let lastTileId = view.lastPlay?.tileId ?? null;
    for (const ev of fresh) {
      if (ev.type === 'tilePlaced') {
        lastTileId = ev.tileId;
        stagePlay(ev);
        offset = ev.by === 'player' ? PLAYER_FLIGHT_MS : RIVAL_FLIGHT_MS;
      }
      fxTimers.current.push(...runEventFx(ev, shellRef.current, offset));
      const tileId = lastTileId;
      if (ev.type === 'bonus5') {
        const info = bonusFloat(ev);
        // versão 2.14: o mesmo placar do solo: o número dourado com o +$ embaixo e as moedas voando
        pushFloat(() => {
          const from = centerOf(`[data-tile-id="${tileId}"]`);
          if (!from) return null;
          const targetEl = document.querySelector(`[data-coin-target="${info.to}"]`);
          const to = centerOf(targetEl);
          goldPop({ x: from.x, y: from.y - 26 }, `${ev.sum}`, { tone: info.tone, sub: `+$${ev.amount}` });
          if (to) coinRain(from, to, { count: 3 + Math.min(6, ev.amount * 2), targetEl });
          return null;
        }, offset + 140);
      }
      if (ev.type === 'proc') {
        pushFloat(() => {
          const from = procOrigin(ev, tileId, tableRef.current);
          return from && { from, text: ev.text, tone: ev.tone };
        }, offset + 90);
      }
      if (ev.type === 'callout') {
        pushFloat(() => {
          const felt = tableRef.current?.getBoundingClientRect();
          return felt && { from: { x: felt.left + felt.width / 2, y: felt.top + felt.height * 0.3 }, text: ev.text, tone: ev.by === 'player' ? 'player' : 'enemy', kind: 'callout' };
        }, offset + 60);
      }
    }
  }, [view.events, view.lastPlay, duel.id, pushFloat, stagePlay]);

  // mesa nova (rodada da mesa final): os balões da anterior saem
  const roundKey = `${duel.id}:${view.round}`;
  useEffect(() => {
    clearFloats();
  }, [roundKey, clearFloats]);

  const startInspect = useCallback((payload, rect) => setInspect({ payload, rect }), []);
  const endInspect = useCallback(() => setInspect(null), []);
  const press = useLongPress(startInspect, endInspect);
  const balloonInfo = inspect ? inspectInfo(inspect.payload, opp.name) : null;
  const balloon = balloonInfo ? { ...balloonInfo, rect: inspect.rect } : null;

  const playing = view.phase === 'playing';
  // versão 2.6: a pedra recém-chegada já conta como "no ar" desde o 1º quadro, e a hora da batida
  const lastPlaced = lastPlacedOf(view.events);
  const incoming =
    tableAnim ?? (lastPlaced && lastPlaced.seq > stagedSeq ? { key: lastPlaced.seq, tileId: lastPlaced.tileId, by: lastPlaced.by, stage: 'flight' } : null);
  const finaleKey = duel.result && !incoming ? `${duel.id}:${view.round}` : null;
  useEffect(() => {
    if (!finaleKey) return undefined;
    const id = setTimeout(() => setFinaleDone(finaleKey), prefersReducedMotion() ? 500 : FINALE_MS);
    return () => clearTimeout(id);
  }, [finaleKey]);
  const finaleHold = Boolean(finaleKey) && finaleDone !== finaleKey;
  const finaleOver = Boolean(finaleKey) && finaleDone === finaleKey;
  const rr = view.roundResult;
  // versão 2.34: perdeu o duelo (o último golpe foi dele): a tela racha antes do resultado
  const loseBreakKey = finaleOver && duel.result?.matchOver && view.hearts.player <= 0 ? finaleKey : null;
  const [brokeKey, setBrokeKey] = useState(null);
  // versão 2.6: sem placar entre as rodadas: a mesa varre para o dorme e você já fica pronto
  // (a rodada nova sai quando os dois estiverem); o placar fica só para o fim do duelo
  const lastRound = Boolean(duel.result?.matchOver) || !duel.final;
  const sweepKey = finaleOver && duel.result && !lastRound ? finaleKey : null;
  const autoNext = useStableHandler(() => onNextRound({ auto: true }));
  useEffect(() => {
    if (!sweepKey) return undefined;
    let live = true;
    sweepToDorme({ onTick: (i) => sound.playDealTick(i), onShuffle: () => sound.playShuffle() }).then(() => {
      if (live) autoNext();
    });
    return () => {
      live = false;
    };
  }, [sweepKey, autoNext]);
  // a rodada nova chegou: as pedras viradas do rival saem do dorme (as suas saem sozinhas)
  const dealtRef = useRef(roundKey);
  useEffect(() => {
    if (dealtRef.current === roundKey) return;
    dealtRef.current = roundKey;
    cancelSweep();
    requestAnimationFrame(() => dealRivalsFromDorme());
  }, [roundKey]);
  const pending = playing ? view.pending : null;
  const minePending = pending && (pending.owner ?? 'player') === 'player' ? pending : null;
  const discardMode = minePending?.type === 'discard';
  const caniveteMode = minePending?.type === 'canivete';
  const grampoMode = minePending?.type === 'grampo';
  const pickMode = discardMode || caniveteMode || grampoMode;
  const locked = Boolean(duel.awaiting) || Boolean(duel.result);
  const isPlayerTurn = playing && view.turn === 'player' && !pending && !incoming && !locked;
  const hand = view.hands.player;
  const playerRules = useStableValue(rulesFor(view, 'player'));
  const requiredTileId = requiredOpeningFor(view, 'player');

  const playableIds = useMemo(() => {
    if (discardMode) return new Set(hand.map((t) => t.id));
    if (caniveteMode) return new Set(hand.filter((t) => t.a !== t.b).map((t) => t.id));
    if (grampoMode) return new Set(hand.filter((t) => t.a === t.b).map((t) => t.id));
    if (!isPlayerTurn) return new Set();
    return new Set(getPlayableMoves(hand, view.board, requiredTileId, playerRules).map((m) => m.tile.id));
  }, [discardMode, caniveteMode, grampoMode, isPlayerTurn, hand, view.board, requiredTileId, playerRules]);

  const selectedTile = isPlayerTurn || pickMode ? (hand.find((t) => t.id === selectedId && playableIds.has(t.id)) ?? null) : null;
  const selectedSides = useStableValue(selectedTile && !pickMode ? getValidSides(selectedTile, view.board, playerRules) : []);
  const draw = useStableValue(drawAvailabilityFor(view, 'player'));
  const boardOpen = Boolean(view.board.root);
  const canDraw = isPlayerTurn && boardOpen && draw.allowed;
  const passRule = useStableValue(isPlayerTurn && boardOpen ? passAvailabilityFor(view, 'player') : null);
  const canPass = Boolean(passRule?.allowed);
  const caniveteReady = isPlayerTurn && canUseCanivete(view, 'player');
  const grampoReady = isPlayerTurn && canUseGrampo(view, 'player');
  const forcedMine = minePending?.type === 'forcedPass';

  const flashesNow = useMemo(() => deriveRelicFlashes(view.events), [view.events]);
  const relicFlashes = useStableValue(flashesNow);
  const revealedNow = revealedTioZeTiles(view);
  const revealed = useStableValue(revealedNow, revealedNow.map((t) => t.id).join(','));
  const endMarks = useStableValue(endMarksFor(view));
  const spentRelics = useStableValue(spentRelicsOf(view, 'player'));
  const oppHurtKey = hurtKeyOf(view.events, 'tioZe');
  const myHurtKey = hurtKeyOf(view.events, 'player');

  const hint = buildPlayerHint({
    state: view,
    isPlayerTurn,
    selectedTile,
    playableCount: playableIds.size,
    drawAllowed: canDraw,
    passRule,
    rules: playerRules,
    rivalName: opp.name,
  });

  const send = (intent) => {
    setSelectedId(null);
    onIntent(intent);
  };

  const handleSelectTile = useStableHandler((tile) => {
    if (pickMode) {
      if (!playableIds.has(tile.id)) return;
      sound.playBoneTick(selectedTile?.id !== tile.id);
      setSelectedId(selectedTile?.id === tile.id ? null : tile.id);
      return;
    }
    if (!isPlayerTurn || !playableIds.has(tile.id)) return;
    sound.playBoneTick(selectedTile?.id !== tile.id);
    if (selectedTile?.id === tile.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(tile.id);
    if (tile.a === tile.b) {
      sound.playPowerSelect();
      haptic(15);
    }
  });
  const handlePlaySide = useStableHandler((side) => {
    if (!selectedTile || pickMode) return;
    const el = document.querySelector(`[data-hand-tile="${selectedTile.id}"]`);
    const r = el?.getBoundingClientRect();
    pendingPlay.current = r ? { tileId: selectedTile.id, from: { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, angle: 0 } } : null;
    send({ kind: 'play', tileId: selectedTile.id, side });
  });
  const handleDraw = useStableHandler(() => canDraw && send({ kind: 'draw' }));
  const handlePass = useStableHandler(() => canPass && send({ kind: 'pass' }));
  const handleDiscard = useStableHandler(() => discardMode && selectedTile && send({ kind: 'discard', tileId: selectedTile.id }));
  const handleSkipDiscard = useStableHandler(() => {
    sound.playClick();
    send({ kind: 'skipDiscard' });
  });
  const handleCanivete = useStableHandler(() => {
    if (!caniveteReady) return;
    sound.playPowerSelect();
    send({ kind: 'canivete' });
  });
  const handleCanivetePick = useStableHandler(() => caniveteMode && selectedTile && send({ kind: 'canivetePick', tileId: selectedTile.id }));
  const handleCancelCanivete = useStableHandler(() => {
    sound.playClick();
    send({ kind: 'caniveteCancel' });
  });
  const handleGrampo = useStableHandler(() => {
    if (!grampoReady) return;
    sound.playPowerSelect();
    send({ kind: 'grampo' });
  });
  const handleGrampoPick = useStableHandler(() => grampoMode && selectedTile && send({ kind: 'grampoPick', tileId: selectedTile.id }));
  const handleCancelGrampo = useStableHandler(() => {
    sound.playClick();
    send({ kind: 'grampoCancel' });
  });
  const noop = useStableHandler(() => {});

  // o cronômetro da jogada: de quem é a vez e quanto falta
  const actor = duel.result ? null : (duel.clock?.actor ?? actorOf(view));
  const secondsLeft = useSecondsLeft(duel.result ? null : duel.clock?.deadline);
  // enquanto a pedra do outro ainda voa para a mesa, o aviso segue com ele (como a mão)
  const clockMine = actor === 'player' && !(incoming && incoming.by !== 'player');
  const urgent = secondsLeft != null && secondsLeft <= 10;
  const ends = getOpenEnds(view.board);
  const roundFinished = !playing;
  // versão 2.5: encurralado (o outro por uma pedra, você no último coração)
  const danger = dangerOf({ myHearts: view.hearts.player, rivals: [{ id: 'tioZe', name: opp.name, count: view.hands.tioZe.length }] });
  const dangerOn = playing && !duel.result;

  return (
    <div
      ref={shellRef}
      className={`app-shell pvp-duel flex h-full flex-col overflow-hidden ${landscape ? 'is-landscape' : ''}`}
      style={{ '--felt-light': sala.felt.light, '--felt-mid': sala.felt.mid, '--felt-dark': sala.felt.dark }}
    >
      <RivalBench
        landscape={landscape}
        rival={oppRival}
        avatar={avatar}
        hearts={view.hearts.tioZe}
        maxHearts={view.maxHearts.tioZe}
        coins={view.coins.tioZe}
        hand={view.hands.tioZe}
        revealed={revealed}
        relics={view.relics.tioZe}
        flashes={relicFlashes.tioZe}
        isTurn={playing && actor === 'tioZe'}
        thinking={playing && actor === 'tioZe' && !incoming}
        status={incoming?.by === 'tioZe' ? 'JOGOU!' : null}
        mood="idle"
        hurtKey={oppHurtKey}
        speech={null}
        handRef={rivalHandRef}
        roundKey={roundKey}
        press={press}
        danger={dangerOn && danger.reason === 'last' ? danger.level : 0}
      />

      <div className="relative min-h-0 flex-1 flex flex-col">
        {playing && actor && (
          <div className={`pvp-clock ${clockMine ? 'pvp-clock-mine' : ''} ${urgent ? 'pvp-clock-urgent' : ''}`} data-turn-clock role="timer" aria-live="off">
            <span className="pvp-clock-who">{clockMine ? 'SUA VEZ' : `VEZ DE ${opp.name.toUpperCase()}`}</span>
            {secondsLeft != null && <span className="pvp-clock-sec">{secondsLeft}s</span>}
            {secondsLeft != null && <span className="pvp-clock-bar" style={{ '--left': Math.min(1, secondsLeft / ((duel.clock?.totalMs ?? 30000) / 1000)) }} aria-hidden="true" />}
          </div>
        )}
        <p className="pvp-final-tag">DUELO · ATÉ ALGUÉM ZERAR</p>
        <TableBoard
          landscape={landscape}
          board={view.board}
          roundKey={roundKey}
          playableSides={selectedSides}
          onPlaySide={handlePlaySide}
          dimmed={roundFinished && finaleOver && lastRound}
          previewDouble={Boolean(selectedTile && !pickMode && selectedTile.a === selectedTile.b)}
          frameRef={tableRef}
          endMarks={endMarks}
          felt={sala.felt}
          decor={sala.decor}
          atmosphere={sala.atmosphere}
          lighting={sala.lighting}
          material={sala.material}
          room={sala.room}
          incoming={incoming}
          finaleId={finaleHold && lastPlaced ? lastPlaced.tileId : null}
          finaleTone={rr?.winner === 'player' ? 'player' : 'enemy'}
          noMoves={forcedMine}
          boneyardCount={view.boneyard.length}
          tableMod={null}
          handZone={handZone}
          endsSum={ends ? ends.left + ends.right : null}
          canDraw={canDraw && !pickMode}
          drawUrge={canDraw && !pickMode && playableIds.size === 0}
          onDraw={handleDraw}
          drawsUsed={isPlayerTurn ? view.drawsThisTurn : 0}
          drawCost={canDraw ? (draw?.cost?.type === 'free' ? 'GRÁTIS' : draw?.cost?.type === 'coins' ? `$${draw.cost.amount}` : draw?.cost ? `${draw.cost.amount}♥` : null) : null}
          dormeInHud={landscape}
        />

      <PlayerRack
        landscape={landscape}
        onZoneHeight={setHandZone}
        hand={hand}
        selectedId={selectedTile?.id ?? null}
        playableIds={playableIds}
        isTurn={isPlayerTurn}
        onSelectTile={handleSelectTile}
        selectedSides={selectedSides}
        onPlay={handlePlaySide}
        draw={draw}
        drawsThisTurn={isPlayerTurn ? view.drawsThisTurn : 0}
        canDraw={canDraw}
        onDraw={handleDraw}
        canPass={canPass}
        passRule={passRule}
        onPass={handlePass}
        hearts={view.hearts.player}
        maxHearts={view.maxHearts.player}
        coins={view.coins.player}
        endsSum={ends ? ends.left + ends.right : null}
        boneyardCount={view.boneyard.length}
        drawUrge={canDraw && !pickMode && playableIds.size === 0}
        drawsUsed={isPlayerTurn ? view.drawsThisTurn : 0}
        hint={duel.awaiting ? 'Mandando a jogada...' : hint}
        discardMode={pickMode}
        pickLabels={caniveteMode ? CANIVETE_LABELS : grampoMode ? GRAMPO_LABELS : undefined}
        onDiscard={caniveteMode ? handleCanivetePick : grampoMode ? handleGrampoPick : handleDiscard}
        onSkipDiscard={caniveteMode ? handleCancelCanivete : grampoMode ? handleCancelGrampo : handleSkipDiscard}
        onSecretTap={noop}
        relics={view.relics.player}
        relicSlots={relicSlots}
        frame={frame}
        relicFlashes={relicFlashes.player}
        spentRelics={spentRelics}
        canUndo={false}
        onUndo={noop}
        canCanivete={caniveteReady}
        onCanivete={handleCanivete}
        canGrampo={grampoReady}
        onGrampo={handleGrampo}
        devUnlocked={false}
        onOpenDev={noop}
        muted={muted}
        onToggleMute={onToggleMute}
        onOpenMenu={onMenu}
        press={press}
        knownIds={null}
        rivalName={opp.name}
        leaving={incoming?.by === 'player' && incoming.stage === 'flight' ? leavingTileOf(view.board, incoming.tileId) : null}
        dealKey={roundKey}
      />
      {finaleHold && rr && (
        <p key={finaleKey} className={`finale-callout font-pixel is-${rr.winner === 'player' ? 'player' : rr.winner ? 'enemy' : 'tie'}`} aria-live="polite">
          {rr.winner ? (FINALE_TITLE[rr.kind] ?? 'BATEU!') : 'EMPATE!'}
          {duel.result.matchOver ? (
            <span className="finale-sub">{rr.winner === 'player' ? `${opp.name.toUpperCase()} CAIU!` : 'VOCÊ CAIU...'}</span>
          ) : (
            finaleLines(rr, opp.name).map((line) => (
              <span key={line} className="finale-sub">
                {line}
              </span>
            ))
          )}
        </p>
      )}
      </div>

      <NetBadge link={link} ping={ping} place="duel" />
      {myHurtKey > 0 && <div key={myHurtKey} className="hurt-flash pointer-events-none fixed inset-0 z-[60]" />}
      {/* versão 2.35: tomou dano (e não caiu): a vista pisca e a respiração ofega */}
      <HurtBlink hurtKey={myHurtKey} allowed={view.hearts.player > 0} />
      <DangerFx danger={danger} myHearts={view.hearts.player} active={dangerOn} />
      <FloatingTexts items={floatItems} onDone={floatDone} />
      {minePending?.type === 'drawChoice' && !locked && (
        <DrawChoice
          options={minePending.options}
          onPick={(tileId) => {
            sound.playClick();
            send({ kind: 'pick', tileId });
          }}
        />
      )}
      {duel.result && !lastRound && duel.nextSent && (
        <p className="sweep-wait font-pixel" aria-live="polite">
          ESPERANDO {shortName(opp.name)}
          <span className="sweep-wait-dots" aria-hidden="true" />
        </p>
      )}
      {/* versão 2.34: perdeu o duelo: a tela racha e fica em preto e branco antes do resultado */}
      {loseBreakKey && <ScreenBreak key={loseBreakKey} onDone={() => setBrokeKey(loseBreakKey)} />}
      {duel.result && finaleOver && lastRound && (!loseBreakKey || brokeKey === loseBreakKey) && (
        <PvpRoundResult view={view} result={duel.result} nextSent={duel.nextSent} opp={opp} onNextRound={onNextRound} onFinish={onFinish} />
      )}
      <InfoBalloon info={balloon} />
    </div>
  );
}
