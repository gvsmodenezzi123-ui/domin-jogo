import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FloatingTexts from '../components/FloatingTexts.jsx';
import PlayerRack from '../components/PlayerRack.jsx';
import TableBoard from '../components/TableBoard.jsx';
import { kickLamp } from '../components/lampKick.js';
import { FLIGHT_PLAYER, FLIGHT_RIVAL, flyTile, landTime } from '../components/tileFlight.js';
import { centerOf, useFloats } from '../components/useFloats.js';
import { useStableHandler, useStableValue } from '../components/useStable.js';
import { sound } from '../engine/audioSynth.js';
import { getOpenEnds, getValidSides } from '../engine/dominoLogic.js';
import { haptic } from '../engine/progress.js';
import { shake } from '../pvp/duelFx.js';
import { useNow, useSecondsLeft } from '../pvp/useNow.js';
import SeatBench from './SeatBench.jsx';
import TableResult from './TableResult.jsx';
import { bubbleText, colorOf, seatsFrom } from './seats.js';
import { turnOptions } from './tableEngine.js';

const PLAYER_FLIGHT_MS = landTime(FLIGHT_PLAYER);
const RIVAL_FLIGHT_MS = landTime(FLIGHT_RIVAL);
const SPOTLIGHT_MS = 700;
const LANDED_MS = 280;
/** Sem jogada e sem compra: o aviso aparece e o passe sai sozinho depois disto. */
const FORCED_PASS_MS = 1100;
/** Quanto tempo a foto fica com a cara de dor depois do golpe. */
const HIT_MS = 900;

/** O feltro da mesa de 2 a 4: bordô de carteado, para não confundir com o duelo. */
const TABLE_FELT = Object.freeze({ light: '#5a2a2c', mid: '#43201f', dark: '#2a1314' });
const NO_PRESS = () => ({});
const NONE = [];
const NO_MARKS = Object.freeze({});

function hintFor({ view, me, opts, selected, names }) {
  if (view.phase !== 'playing') return '';
  if (view.turn !== me) return `Vez de ${names[view.turn] ?? '...'}.`;
  if (!view.board.root) return 'Você abre a rodada com a sua maior pedra.';
  if (selected) return 'Toque numa ponta que brilha.';
  if (opts.moves.length) return 'Sua vez: escolha uma pedra.';
  if (opts.exhausted) return 'Nada encaixa. Passando a vez...';
  if (opts.draw.allowed) return 'Nada encaixa: compre do dorme.';
  return 'Nada encaixa: passe a vez.';
}

/**
 * Versão 2.4: a tela da mesa de 2 a 4. A mesa e a sua mão são as do jogo (TableBoard e
 * PlayerRack); em cima, a bancada com uma cadeira por rival (SeatBench), na ordem de jogo.
 *
 * `view` é o espelho da sua cadeira (tableEngine.viewFor): a sua mão inteira e, dos outros, só
 * quantas pedras têm. `onIntent` recebe as ações do motor ({ type: 'PLAY' | 'DRAW' | 'PASS' }).
 * Serve para a mesa local com bots e, na fase 3, para a mesa online (o espelho vem da rede).
 */
export default function TableScreen({ view, me, clock = null, onIntent, onNextRound, onRematch, onLeave, muted, onToggleMute, onMenu, tag = null, links = null, ready = null, canRematch = true }) {
  const [selectedId, setSelectedId] = useState(null);
  const [handZone, setHandZone] = useState(0);
  const [tableAnim, setTableAnim] = useState(null);
  const [hits, setHits] = useState({});
  const [myHurt, setMyHurt] = useState(0);
  const [callout, setCallout] = useState(null);
  const { items: floatItems, push: pushFloat, done: floatDone, clear: clearFloats } = useFloats();
  const shellRef = useRef(null);
  const tableRef = useRef(null);
  const timers = useRef([]);
  const cancelFlight = useRef(null);
  const pendingPlay = useRef(null);
  const seen = useRef(view.seq);

  const later = useCallback((fn, ms) => timers.current.push(setTimeout(fn, ms)), []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      cancelFlight.current?.();
    },
    [],
  );

  const names = useMemo(() => Object.fromEntries(view.seats.map((s) => [s.id, s.id === me ? 'você' : s.name])), [view.seats, me]);
  const coinTarget = useCallback((id) => (id === me ? 'player' : id), [me]);

  /** A pedra voa da mão de quem jogou até a ponta da mesa. */
  const stagePlay = useCallback(
    (ev, key) => {
      cancelFlight.current?.();
      const rival = ev.by !== me;
      let from = null;
      let fromEl = null;
      if (rival) {
        const fan = document.querySelector(`[data-seat-fan="${ev.by}"]`);
        fromEl = fan?.lastElementChild ?? document.querySelector(`[data-seat-photo="${ev.by}"]`);
        const r = fromEl?.getBoundingClientRect();
        if (r) from = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.max(14, r.width), h: Math.max(26, r.height), angle: 0 };
        fromEl = null;
      } else if (pendingPlay.current?.tileId === ev.tileId) {
        from = pendingPlay.current.from;
      }
      pendingPlay.current = null;
      setTableAnim({ key, tileId: ev.tileId, by: ev.by, stage: 'flight' });
      const double = ev.tileId.split('-')[0] === ev.tileId.split('-')[1];
      cancelFlight.current = flyTile({
        tileId: ev.tileId,
        from,
        fromEl,
        timing: rival ? FLIGHT_RIVAL : FLIGHT_PLAYER,
        arc: rival ? 30 : 54,
        flip: rival,
        onLand: () => {
          sound.playBoneSlam(double);
          shake(tableRef.current, double ? 4 : 3, 150);
          kickLamp(double ? 1.4 : 1);
          haptic(double ? 22 : 12);
        },
        onDone: () => {
          cancelFlight.current = null;
          if (rival) {
            setTableAnim((cur) => (cur?.key === key ? { ...cur, stage: 'spot' } : cur));
            later(() => setTableAnim((cur) => (cur?.key === key ? null : cur)), SPOTLIGHT_MS);
          } else {
            setTableAnim((cur) => (cur?.key === key ? { ...cur, stage: 'landed' } : cur));
            later(() => setTableAnim((cur) => (cur?.key === key ? null : cur)), LANDED_MS);
          }
        },
      });
    },
    [me, later],
  );

  // os eventos da última ação: voo, som, dinheiro, golpes e o fim da rodada
  useEffect(() => {
    if (view.seq <= seen.current) return;
    seen.current = view.seq;
    let offset = 0;
    let tileId = null;
    for (const ev of view.events) {
      if (ev.type === 'roundStart') {
        clearFloats();
        setCallout(null);
        sound.playDealTick?.();
      }
      if (ev.type === 'play') {
        tileId = ev.tileId;
        stagePlay(ev, view.seq);
        offset = ev.by === me ? PLAYER_FLIGHT_MS : RIVAL_FLIGHT_MS;
      }
      if (ev.type === 'draw') later(() => sound.playDraw(), 40);
      if (ev.type === 'pass') later(() => sound.playPass(), 40);
      if (ev.type === 'five') {
        const at = tileId;
        pushFloat(() => {
          const from = centerOf(`[data-tile-id="${at}"]`);
          const to = centerOf(`[data-coin-target="${coinTarget(ev.by)}"]`);
          return from && { from, to, text: `+$${ev.amount}`, tone: ev.by === me ? 'player' : 'enemy', kind: 'coin' };
        }, offset + 140);
        later(() => sound.playCoinJingle(), offset + 140);
      }
      if (ev.type === 'roundOver') {
        const r = ev.result;
        const text = r.kind === 'batida' ? (r.batida === 'cruzada' ? 'CRUZADA!' : r.batida === 'bucha' ? 'BATEU DE BUCHA!' : r.batida === 'duasPontas' ? 'NAS DUAS PONTAS!' : 'BATEU!') : 'TRANCOU!';
        later(() => {
          sound[r.kind === 'tranca' ? 'playLock' : 'playTileSlam'](true);
          setCallout({ key: view.seq, text, by: r.kind === 'batida' ? r.by : null });
        }, offset + 260);
      }
      if (ev.type === 'damage') {
        const who = ev.who;
        later(() => {
          sound.playHeartHit();
          setHits((h) => ({ ...h, [who]: view.seq }));
          later(() => setHits((h) => (h[who] === view.seq ? { ...h, [who]: null } : h)), HIT_MS);
          if (who === me) {
            setMyHurt(view.seq);
            shake(shellRef.current, ev.amount >= 2 ? 9 : 6);
            haptic(ev.amount >= 2 ? [70, 40, 90] : 60);
          }
        }, offset + 620);
        pushFloat(() => {
          const from = who === me ? centerOf('.player-life') : centerOf(`[data-seat-photo="${who}"]`);
          return from && { from, text: `−${ev.amount}♥`, tone: who === me ? 'enemy' : 'player' };
        }, offset + 640);
      }
      if (ev.type === 'eliminated') later(() => sound.playHeartBreak?.(), offset + 1000);
      if (ev.type === 'matchOver') later(() => (ev.winner === me ? sound.playVictory() : sound.playDefeat()), offset + 1500);
    }
  }, [view.seq, view.events, me, stagePlay, pushFloat, clearFloats, later, coinTarget]);

  const playing = view.phase === 'playing';
  const myTurn = playing && view.turn === me && !tableAnim;
  const optsNow = turnOptions(view, me);
  const opts = useStableValue(optsNow, `${view.seq}:${me}`);
  const hand = view.hands[me] ?? NONE;
  const playableIds = useMemo(() => (myTurn ? new Set(opts.moves.map((m) => m.tile.id)) : new Set()), [myTurn, opts]);
  const selectedTile = myTurn ? (hand.find((t) => t.id === selectedId && playableIds.has(t.id)) ?? null) : null;
  const selectedSides = useStableValue(selectedTile ? (view.board.root ? getValidSides(selectedTile, view.board) : ['root']) : NONE);
  const canDraw = myTurn && opts.draw.allowed;
  const canPass = myTurn && opts.pass.allowed;
  const exhausted = myTurn && opts.exhausted;

  // sem saída: o aviso "SEM JOGADAS" e o passe automático
  useEffect(() => {
    if (!exhausted) return undefined;
    const id = setTimeout(() => {
      sound.playNoMoves();
      onIntent({ type: 'PASS', seat: me });
    }, FORCED_PASS_MS);
    return () => clearTimeout(id);
  }, [exhausted, me, onIntent, view.seq]);

  const send = (action) => {
    setSelectedId(null);
    onIntent(action);
  };
  const handleSelectTile = useStableHandler((tile) => {
    if (!myTurn || !playableIds.has(tile.id)) return;
    sound.playClick();
    setSelectedId(selectedTile?.id === tile.id ? null : tile.id);
    if (tile.a === tile.b) haptic(15);
  });
  const handlePlaySide = useStableHandler((side) => {
    if (!selectedTile) return;
    const el = document.querySelector(`[data-hand-tile="${selectedTile.id}"]`);
    const r = el?.getBoundingClientRect();
    pendingPlay.current = r ? { tileId: selectedTile.id, from: { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, angle: 0 } } : null;
    send({ type: 'PLAY', seat: me, tileId: selectedTile.id, side });
  });
  const handleDraw = useStableHandler(() => canDraw && send({ type: 'DRAW', seat: me }));
  const handlePass = useStableHandler(() => canPass && send({ type: 'PASS', seat: me }));
  const noop = useStableHandler(() => {});

  // a fileira de cima: os rivais na ordem de jogo a partir de você
  const ordered = seatsFrom(view.seats, me);
  const mine = ordered[0];
  const lastBy = view.events.find((e) => e.type === 'play' || e.type === 'draw' || e.type === 'pass')?.by ?? null;
  const batedor = view.result?.kind === 'batida' ? view.result.by : null;
  // online: quem caiu (contagem dos 60 s) e o ping de cada um
  const now = useNow();
  const benchNow = ordered.slice(1).map((s) => {
    const link = links?.[s.id];
    return {
      ...s,
      count: view.handCounts[s.id] ?? 0,
      color: colorOf(view, s.id),
      isTurn: playing && view.turn === s.id && !(tableAnim && tableAnim.by === s.id),
      smug: batedor === s.id,
      ping: link && !link.lost ? link.ping : null,
      lostLeft: link?.lost && link.graceEndsAt ? Math.max(0, Math.ceil((link.graceEndsAt - now) / 1000)) : null,
    };
  });
  const bench = useStableValue(benchNow, JSON.stringify(benchNow));
  const bubbleNow = useMemo(() => {
    if (batedor && batedor !== me) return { seat: batedor, text: 'BATEU!', key: `b${view.seq}`, strong: true };
    if (!lastBy || lastBy === me) return null;
    const text = bubbleText(view.lastAction[lastBy]);
    return text ? { seat: lastBy, text, key: view.seq } : null;
  }, [batedor, lastBy, me, view.lastAction, view.seq]);

  const actor = playing ? view.turn : null;
  const secondsLeft = useSecondsLeft(playing ? clock?.deadline : null);
  const totalMs = clock?.totalMs ?? 30000;
  const turnKey = `${view.round}:${actor}:${clock?.deadline ?? 0}`;
  // o anel conta o tempo que faltava quando a vez começou (fixo durante a vez, para não pular)
  const turnMs = useStableValue(clock?.deadline ? Math.max(0, clock.deadline - Date.now()) : totalMs, turnKey);
  const clockMine = actor === me && !(tableAnim && tableAnim.by !== me);
  const urgent = secondsLeft != null && secondsLeft <= 10;
  const ends = getOpenEnds(view.board);
  const hint = hintFor({ view, me, opts, selected: selectedTile, names });
  const showResult = !playing && !tableAnim;

  return (
    <div
      ref={shellRef}
      className={`app-shell table-v24 flex h-full flex-col overflow-hidden`}
      style={{ '--felt-light': TABLE_FELT.light, '--felt-mid': TABLE_FELT.mid, '--felt-dark': TABLE_FELT.dark, '--me': colorOf(view, me) }}
    >
      <SeatBench seats={bench} maxHearts={view.maxHearts} turnKey={turnKey} turnMs={turnMs} turnLeft={actor !== me ? secondsLeft : null} bubble={bubbleNow} hits={hits} />

      <div className="relative min-h-0 flex-1 flex flex-col">
        {/* o relógio grande só na sua vez; a dos outros está no anel e nos segundos da cadeira */}
        {playing && actor === me && (
          <div
            className={`pvp-clock table-clock ${clockMine ? 'pvp-clock-mine' : ''} ${urgent ? 'pvp-clock-urgent' : ''}`}
            style={{ '--who': colorOf(view, actor) }}
            role="timer"
            aria-live="off"
          >
            <span className="pvp-clock-who">{actor === me ? 'SUA VEZ' : `VEZ DE ${String(names[actor]).toUpperCase()}`}</span>
            {secondsLeft != null && <span className="pvp-clock-sec">{secondsLeft}s</span>}
            {secondsLeft != null && <span className="pvp-clock-bar" style={{ '--left': Math.min(1, secondsLeft / (totalMs / 1000)) }} aria-hidden="true" />}
          </div>
        )}
        {tag && <p className="pvp-final-tag table-tag">{tag}</p>}
        <TableBoard
          board={view.board}
          roundKey={`mesa:${view.round}`}
          playableSides={selectedSides}
          onPlaySide={handlePlaySide}
          dimmed={!playing && !tableAnim}
          previewDouble={Boolean(selectedTile && selectedTile.a === selectedTile.b)}
          frameRef={tableRef}
          endMarks={NO_MARKS}
          felt={TABLE_FELT}
          decor={NONE}
          atmosphere="boteco"
          incoming={tableAnim}
          noMoves={exhausted}
          boneyardCount={view.boneyardCount}
          tableMod={null}
          handZone={handZone}
          endsSum={ends ? ends.left + ends.right : null}
          canDraw={canDraw}
          drawUrge={canDraw && playableIds.size === 0}
          onDraw={handleDraw}
          drawsUsed={myTurn ? view.drawsThisTurn : 0}
          drawCost={canDraw ? (opts.draw.cost?.type === 'free' ? 'GRÁTIS' : opts.draw.cost?.type === 'coins' ? `$${opts.draw.cost.amount}` : opts.draw.cost ? `${opts.draw.cost.amount}♥` : null) : null}
        />

        <PlayerRack
          onZoneHeight={setHandZone}
          hand={hand}
          selectedId={selectedTile?.id ?? null}
          playableIds={playableIds}
          isTurn={myTurn}
          onSelectTile={handleSelectTile}
          selectedSides={selectedSides}
          onPlay={handlePlaySide}
          draw={opts.draw}
          drawsThisTurn={myTurn ? view.drawsThisTurn : 0}
          canDraw={canDraw}
          onDraw={handleDraw}
          canPass={canPass}
          passRule={myTurn ? opts.pass : null}
          onPass={handlePass}
          hearts={mine.hearts}
          maxHearts={view.maxHearts}
          coins={mine.coins}
          endsSum={ends ? ends.left + ends.right : null}
          hint={hint}
          discardMode={false}
          onDiscard={noop}
          onSkipDiscard={noop}
          onSecretTap={noop}
          relics={NONE}
          relicSlots={4}
          relicFlashes={undefined}
          spentRelics={NONE}
          canUndo={false}
          onUndo={noop}
          devUnlocked={false}
          onOpenDev={noop}
          muted={muted}
          onToggleMute={onToggleMute}
          onOpenMenu={onMenu}
          press={NO_PRESS}
          knownIds={null}
          rivalName="os rivais"
        />
        {callout && (
          <p key={callout.key} className="table-callout font-pixel" style={{ '--who': callout.by ? colorOf(view, callout.by) : '#f4ecd2' }} aria-live="polite">
            {callout.text}
          </p>
        )}
      </div>

      {myHurt > 0 && <div key={myHurt} className="hurt-flash pointer-events-none fixed inset-0 z-[60]" />}
      <FloatingTexts items={floatItems} onDone={floatDone} />
      {showResult && <TableResult view={view} me={me} ready={ready} canRematch={canRematch} onNextRound={onNextRound} onRematch={onRematch} onLeave={onLeave} />}
    </div>
  );
}
