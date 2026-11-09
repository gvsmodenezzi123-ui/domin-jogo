import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FloatingTexts from '../components/FloatingTexts.jsx';
import PlayerRack from '../components/PlayerRack.jsx';
import TableBoard from '../components/TableBoard.jsx';
import { mapTable } from '../data/tableMaps.js';
import { kickLamp } from '../components/lampKick.js';
import { goldPop } from '../components/juice.js';
import { FLIGHT_PLAYER, FLIGHT_RIVAL, flyTile, landTime } from '../components/tileFlight.js';
import { centerOf, useFloats } from '../components/useFloats.js';
import { useStableHandler, useStableValue } from '../components/useStable.js';
import { sound } from '../engine/audioSynth.js';
import { getOpenEnds, getValidSides } from '../engine/dominoLogic.js';
import { leavingTileOf } from '../components/finale.js';
import { cancelSweep, dealRivalsFromDorme, sweepToDorme } from '../components/tableSweep.js';
import { haptic } from '../engine/progress.js';
import { prefersReducedMotion } from '../components/motion.js';
import { shake } from '../pvp/duelFx.js';
import { useNow, useSecondsLeft } from '../pvp/useNow.js';
import DangerFx from '../components/DangerFx.jsx';
import { dangerOf } from '../engine/danger.js';
import SeatBench from './SeatBench.jsx';
import { useLandscape } from '../components/useLandscape.js';
import TableResult from './TableResult.jsx';
import { bubbleText, colorOf, plateName, seatsFrom } from './seats.js';
import { partnerOf, turnOptions } from './tableEngine.js';

const PLAYER_FLIGHT_MS = landTime(FLIGHT_PLAYER);
const RIVAL_FLIGHT_MS = landTime(FLIGHT_RIVAL);
const SPOTLIGHT_MS = 700;
const LANDED_MS = 280;
/** Sem jogada e sem compra: o aviso aparece e o passe sai sozinho depois disto. */
const FORCED_PASS_MS = 1100;
/** Quanto tempo a foto fica com a cara de dor depois do golpe. */
const HIT_MS = 900;
/** Versão 2.6: a hora da batida (a mesa segura acesa antes do placar da rodada). */
const FINALE_MS = 1500;

/** O feltro da mesa de 2 a 4: bordô de carteado, para não confundir com o duelo. */
const TABLE_FELT = Object.freeze({ light: '#5a2a2c', mid: '#43201f', dark: '#2a1314' });
const NO_PRESS = () => ({});
const NONE = [];
const NO_MARKS = Object.freeze({});


function hintFor({ view, me, opts, selected, names, partner = null }) {
  if (view.phase !== 'playing') return '';
  if (view.turn !== me && view.turn === partner) return `Vez de ${names[view.turn] ?? '...'}, a sua dupla.`;
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
/**
 * Versão 2.6: o que a rodada fez, embaixo do grito (não tem mais placar entre as rodadas):
 * "VOCÊ −1♥ · NEIDE −1♥", ou "NINGUÉM SANGRA" no empate da tranca. Versão 2.7: nas duplas, o
 * golpe é na dupla ("−1♥ NA SUA DUPLA"); por tentos, quem pontuou ("+1 TENTO PARA A SUA DUPLA").
 */
function roundLine(result, view, me, partner) {
  const name = (id) => (id === me ? 'VOCÊ' : plateName(view.seats.find((s) => s.id === id)?.name ?? ''));
  const duo = (ids) => (ids.includes(me) || (partner && ids.includes(partner)) ? 'A SUA DUPLA' : ids.map(name).join(' E '));
  if (view.rules?.scoring === 'tentos') {
    const got = Object.keys(result.tentos ?? {});
    if (!got.length) return 'NINGUÉM PONTUA';
    if (view.rules?.teams) return `+1 TENTO PARA ${duo(got)}`;
    return got.length > 2 ? `+1 TENTO: ${got.map(name).slice(0, 2).join(' · ')} …` : `+1 TENTO: ${got.map(name).join(' · ')}`;
  }
  const hurt = Object.entries(result.damage ?? {}).filter(([, d]) => d > 0);
  if (!hurt.length) return 'NINGUÉM SANGRA';
  if (view.rules?.teams) {
    const ids = hurt.map(([id]) => id);
    return `−${hurt[0][1]}♥ ${ids.includes(me) ? 'NA SUA DUPLA' : `NA DUPLA DE ${ids.map(name).join(' E ')}`}`;
  }
  const shown = hurt.slice(0, 3).map(([id, d]) => `${name(id)} −${d}♥`);
  return hurt.length > 3 ? `${shown.join(' · ')} …` : shown.join(' · ');
}

export default function TableScreen({ view, me: seatMe, map = null, clock = null, onIntent, onNextRound, onRematch, onLeave, muted, onToggleMute, onMenu, tag = null, links = null, ready = null, canRematch = true }) {
  // versão 2.15: fora da roda, você assiste: a tela inteira passa a ser a de quem você escolheu
  // (a mão dele na sua bancada, a roda girada a partir dele); as ações ficam travadas
  const watchList = view.watch ?? NONE;
  const spectating = watchList.length > 0;
  const [watchPick, setWatchPick] = useState(null);
  const watchId = spectating ? (watchList.includes(watchPick) ? watchPick : (seatsFrom(view.seats, seatMe).find((s) => watchList.includes(s.id))?.id ?? watchList[0])) : null;
  const me = watchId ?? seatMe;
  const stepWatch = (dir) => {
    const ring = seatsFrom(view.seats, me).filter((s) => watchList.includes(s.id));
    if (ring.length < 2) return;
    const next = dir > 0 ? ring[1] : ring[ring.length - 1];
    sound.playBoneTick?.(true);
    setSelectedId(null);
    setWatchPick(next.id);
  };
  // versão 2.13: a sala que o anfitrião escolheu (o cenário, a luz e o feltro; a trilha vem de fora)
  const sala = useMemo(() => mapTable(map, TABLE_FELT), [map]);
  const [selectedId, setSelectedId] = useState(null);
  const [handZone, setHandZone] = useState(0);
  // versão 2.9: tela deitada, todos sentados em volta da mesa
  const landscape = useLandscape();
  const [tableAnim, setTableAnim] = useState(null);
  // a última jogada que já começou a voar (até lá, a pedra nova fica escondida na mesa)
  const [stagedSeq, setStagedSeq] = useState(view.seq);
  const [finaleDone, setFinaleDone] = useState(null);
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

  const names = useMemo(() => Object.fromEntries(view.seats.map((s) => [s.id, s.id === me && !spectating ? 'você' : s.name])), [view.seats, me, spectating]);
  // versão 2.7: a linha embaixo do grito lê a mesa de agora (duplas, tentos), sem refazer o efeito
  const lineFor = useStableHandler((r) => roundLine(r, view, seatMe, view.rules?.teams ? partnerOf(view, seatMe) : null));

  /** A pedra voa da mão de quem jogou até a ponta da mesa. */
  const stagePlay = useCallback(
    (ev, key) => {
      cancelFlight.current?.();
      const rival = ev.by !== me;
      let from = null;
      // versão 2.6: a sua pedra fica no leque até a cópia levantar (o voo esconde a original)
      const fromEl = rival ? null : document.querySelector(`[data-hand-tile="${ev.tileId}"]`);
      if (rival) {
        const fan = document.querySelector(`[data-seat-fan="${ev.by}"]`);
        const src = fan?.lastElementChild ?? document.querySelector(`[data-seat-photo="${ev.by}"]`);
        const r = src?.getBoundingClientRect();
        if (r) from = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.max(14, r.width), h: Math.max(26, r.height), angle: 0 };
      } else if (pendingPlay.current?.tileId === ev.tileId) {
        from = pendingPlay.current.from;
      }
      pendingPlay.current = null;
      setTableAnim({ key, tileId: ev.tileId, by: ev.by, stage: 'flight' });
      setStagedSeq((n) => Math.max(n, key));
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
        later(() => {
          clearFloats();
          setCallout(null);
          // a rodada nova: as pedras das cadeiras saem do dorme (as suas saem sozinhas)
          cancelSweep();
          dealRivalsFromDorme();
        }, 0);
        sound.playDealTick?.();
      }
      if (ev.type === 'play') {
        tileId = ev.tileId;
        // o voo começa no próximo tique (o estado da animação muda fora do corpo do efeito)
        const key = view.seq;
        later(() => stagePlay(ev, key), 0);
        offset = ev.by === me ? PLAYER_FLIGHT_MS : RIVAL_FLIGHT_MS;
      }
      if (ev.type === 'draw') later(() => sound.playDraw(), 40);
      if (ev.type === 'pass') later(() => sound.playPass(), 40);
      if (ev.type === 'five') {
        const at = tileId;
        // versão 2.14: o mesmo placar do solo e do duelo: a soma das pontas em dourado, o +$ embaixo
        const ends = getOpenEnds(view.board);
        const sum = ends ? ends.left + ends.right : null;
        pushFloat(() => {
          const from = centerOf(`[data-tile-id="${at}"]`);
          if (!from) return null;
          goldPop({ x: from.x, y: from.y - 26 }, sum === null ? `+$${ev.amount}` : `${sum}`, { tone: ev.by === me ? 'player' : 'enemy', sub: sum === null ? null : `+$${ev.amount}` });
          return null;
        }, offset + 140);
        later(() => sound.playCoinJingle(), offset + 140);
      }
      if (ev.type === 'roundOver') {
        const r = ev.result;
        const text = r.kind === 'batida' ? (r.batida === 'cruzada' ? 'CRUZADA!' : r.batida === 'bucha' ? 'BATEU DE BUCHA!' : r.batida === 'duasPontas' ? 'NAS DUAS PONTAS!' : 'BATEU!') : 'TRANCOU!';
        later(() => {
          sound[r.kind === 'tranca' ? 'playLock' : 'playTileSlam'](true);
          setCallout({ key: view.seq, text, by: r.kind === 'batida' ? r.by : null, sub: lineFor(r) });
        }, offset + 260);
      }
      if (ev.type === 'damage') {
        const who = ev.who;
        later(() => {
          sound.playHeartHit();
          setHits((h) => ({ ...h, [who]: view.seq }));
          later(() => setHits((h) => (h[who] === view.seq ? { ...h, [who]: null } : h)), HIT_MS);
          if (who === seatMe && !spectating) {
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
      // versão 2.7: o tento (a tampinha) de quem venceu a rodada, na roda por tentos
      if (ev.type === 'tento') {
        const who = ev.who;
        later(() => {
          sound.playTento(who === me);
          setHits((h) => ({ ...h, [who]: null }));
          if (who === me) haptic([20, 30, 20]);
        }, offset + 620);
        pushFloat(() => {
          const from = who === me ? centerOf('.player-life') : centerOf(`[data-seat-photo="${who}"]`);
          return from && { from, text: '+1 TENTO', tone: who === me ? 'player' : 'enemy', kind: 'coin' };
        }, offset + 640);
      }
      if (ev.type === 'eliminated') later(() => sound.playHeartBreak?.(), offset + 1000);
      if (ev.type === 'matchOver') later(() => ((ev.winners ?? [ev.winner]).includes(seatMe) ? sound.playVictory() : sound.playDefeat()), offset + 1500);
    }
  }, [view.seq, view.events, view.board, me, seatMe, spectating, stagePlay, pushFloat, clearFloats, later, lineFor]);

  const playing = view.phase === 'playing';
  // a pedra que acabou de chegar pela rede e ainda vai voar conta como "voando" desde já
  const playEv = view.events.find((e) => e.type === 'play');
  const flying = tableAnim ?? (playEv && view.seq > stagedSeq ? { key: view.seq, tileId: playEv.tileId, by: playEv.by, stage: 'flight' } : null);
  const myTurn = playing && view.turn === me && !flying && !spectating;
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
    sound.playBoneTick(selectedTile?.id !== tile.id);
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
  // versão 2.15: quem saiu some da roda (o X de giz fica só até o fim da rodada em que caiu)
  const goneNow = new Set(view.events.filter((e) => e.type === 'eliminated').map((e) => e.who));
  const ordered = seatsFrom(view.seats, me).filter((s, i) => i === 0 || s.alive || (!playing && goneNow.has(s.id)));
  const mine = ordered[0];
  // versão 2.7: duplas (o seu parceiro) e a contagem por tentos
  const teams = Boolean(view.rules?.teams);
  const tentosMode = view.rules?.scoring === 'tentos';
  const partner = teams ? partnerOf(view, me) : null;
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
      isTurn: playing && view.turn === s.id && !(flying && flying.by === s.id),
      smug: batedor === s.id,
      // o seu parceiro por uma pedra é boa notícia: o perigo é só de quem joga contra
      danger: playing && s.alive && s.id !== partner && (view.handCounts[s.id] ?? 0) === 1,
      partner: s.id === partner,
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
  const turnMs = useStableValue(clock?.deadline ? Math.max(0, clock.deadline - now) : totalMs, turnKey);
  const clockMine = actor === me && !(flying && flying.by !== me);
  const urgent = secondsLeft != null && secondsLeft <= 10;
  const ends = getOpenEnds(view.board);
  const hint = spectating ? '' : hintFor({ view, me, opts, selected: selectedTile, names, partner });
  // versão 2.6: a hora da batida: a mesa segura acesa com a última pedra brilhando antes do placar
  const finaleKey = !playing && !flying && view.phase !== 'lobby' ? `${view.round}:${view.phase}` : null;
  useEffect(() => {
    if (!finaleKey) return undefined;
    const id = setTimeout(() => setFinaleDone(finaleKey), prefersReducedMotion() ? 500 : FINALE_MS);
    return () => clearTimeout(id);
  }, [finaleKey]);
  const finaleHold = Boolean(finaleKey) && finaleDone !== finaleKey;
  const finaleOver = Boolean(finaleKey) && finaleDone === finaleKey;
  // versão 2.6: entre as rodadas não tem placar: a mesa varre para o dorme e você fica pronto
  // sozinho (na roda online a rodada sai quando todos estiverem); o pódio fica para o fim
  const showResult = finaleOver && view.phase === 'matchOver';
  const sweepKey = finaleOver && view.phase === 'roundOver' ? finaleKey : null;
  const autoNext = useStableHandler(() => onNextRound?.({ auto: true }));
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
  const waitingFor =
    view.phase === 'roundOver' && ready?.includes(seatMe) ? view.seats.filter((s) => s.alive && !s.bot && s.id !== seatMe && !ready.includes(s.id)).map((s) => plateName(s.name)) : [];
  // versão 2.5: encurralado (alguém por uma pedra, você no último coração)
  // (por tentos ninguém sangra: só vale o rival por uma pedra; nas duplas, só os adversários)
  const danger = dangerOf({
    myHearts: tentosMode ? 99 : mine.hearts,
    rivals: ordered
      .slice(1)
      .filter((s) => s.alive && s.id !== partner)
      .map((s) => ({ id: s.id, name: s.name, count: view.handCounts[s.id] ?? 0 })),
  });
  const dangerOn = playing && mine.alive && !spectating;

  return (
    <div
      ref={shellRef}
      className={`app-shell table-v24 flex h-full flex-col overflow-hidden ${landscape ? 'is-landscape' : ''}`}
      style={{ '--felt-light': sala.felt.light, '--felt-mid': sala.felt.mid, '--felt-dark': sala.felt.dark, '--me': colorOf(view, me) }}
    >
      <SeatBench landscape={landscape} seats={bench} maxHearts={view.maxHearts} target={tentosMode ? view.target : null} turnKey={turnKey} turnMs={turnMs} turnLeft={actor !== me ? secondsLeft : null} bubble={bubbleNow} hits={hits} roundKey={`mesa:${view.round}`} />

      <div className="relative min-h-0 flex-1 flex flex-col">
        {/* o relógio grande só na sua vez; a dos outros está no anel e nos segundos da cadeira */}
        {playing && actor === me && (
          <div
            className={`pvp-clock table-clock ${clockMine ? 'pvp-clock-mine' : ''} ${urgent ? 'pvp-clock-urgent' : ''}`}
            style={{ '--who': colorOf(view, actor) }}
            role="timer"
            aria-live="off"
          >
            <span className="pvp-clock-who">{actor === me && !spectating ? 'SUA VEZ' : `VEZ DE ${plateName(names[actor])}`}</span>
            {secondsLeft != null && <span className="pvp-clock-sec">{secondsLeft}s</span>}
            {secondsLeft != null && <span className="pvp-clock-bar" style={{ '--left': Math.min(1, secondsLeft / (totalMs / 1000)) }} aria-hidden="true" />}
          </div>
        )}
        {tag && <p className="pvp-final-tag table-tag">{tag}</p>}
        <TableBoard
          landscape={landscape}
          board={view.board}
          roundKey={`mesa:${view.round}`}
          playableSides={selectedSides}
          onPlaySide={handlePlaySide}
          dimmed={showResult}
          previewDouble={Boolean(selectedTile && selectedTile.a === selectedTile.b)}
          frameRef={tableRef}
          endMarks={NO_MARKS}
          felt={sala.felt}
          decor={sala.decor}
          atmosphere={sala.atmosphere}
          lighting={sala.lighting}
          room={sala.room}
          incoming={flying}
          finaleId={finaleHold && playEv ? playEv.tileId : null}
          finaleTone={view.result?.kind === 'batida' && view.result.by === me ? 'player' : 'enemy'}
          noMoves={exhausted}
          boneyardCount={view.boneyardCount}
          tableMod={null}
          handZone={handZone}
          endsSum={ends ? ends.left + ends.right : null}
          canDraw={canDraw}
          drawUrge={canDraw && playableIds.size === 0}
          onDraw={handleDraw}
          drawsUsed={myTurn ? view.drawsThisTurn : 0}
          drawCost={
            canDraw
              ? opts.draw.cost?.type === 'free'
                ? 'GRÁTIS'
                : opts.draw.cost?.type === 'coins'
                  ? `$${opts.draw.cost.amount}`
                  : opts.draw.cost?.type === 'tento'
                    ? `${opts.draw.cost.amount} TENTO`
                    : opts.draw.cost
                      ? `${opts.draw.cost.amount}♥`
                      : null
              : null
          }
          dormeInHud={landscape}
        />

        <PlayerRack
          landscape={landscape}
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
          tentos={tentosMode ? { current: mine.tentos ?? 0, max: view.target } : null}
          coins={mine.coins}
          showCoins={false}
          endsSum={ends ? ends.left + ends.right : null}
          boneyardCount={view.boneyardCount ?? null}
          drawUrge={canDraw && playableIds.size === 0}
          drawsUsed={myTurn ? view.drawsThisTurn : 0}
          hint={hint}
          discardMode={false}
          onDiscard={noop}
          onSkipDiscard={noop}
          onSecretTap={noop}
          relics={NONE}
          relicSlots={0}
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
          leaving={flying?.by === me && flying.stage === 'flight' ? leavingTileOf(view.board, flying.tileId) : null}
          dealKey={`mesa:${view.round}:${me}`}
        />
        {spectating && (
          <div className="spectate-bar" style={{ bottom: landscape ? handZone - 14 : handZone + 8 }} role="group" aria-label="Assistindo">
            {watchList.length > 1 && (
              <button type="button" className="spectate-arrow font-pixel" onClick={() => stepWatch(-1)} aria-label="Assistir o anterior">
                ◀
              </button>
            )}
            <span className="spectate-name font-pixel" style={{ '--who': colorOf(view, me) }}>
              <small>ASSISTINDO</small>
              {plateName(names[me])}
            </span>
            {watchList.length > 1 && (
              <button type="button" className="spectate-arrow font-pixel" onClick={() => stepWatch(1)} aria-label="Assistir o próximo">
                ▶
              </button>
            )}
          </div>
        )}
        {callout && (
          <p key={callout.key} className="table-callout font-pixel" style={{ '--who': callout.by ? colorOf(view, callout.by) : '#f4ecd2' }} aria-live="polite">
            {callout.text}
            {callout.sub && <span className="finale-sub">{callout.sub}</span>}
          </p>
        )}
      </div>

      {myHurt > 0 && <div key={myHurt} className="hurt-flash pointer-events-none fixed inset-0 z-[60]" />}
      <DangerFx danger={danger} myHearts={mine.hearts} active={dangerOn} />
      {spectating && <div className="spectate-veil pointer-events-none" aria-hidden="true" />}
      <FloatingTexts items={floatItems} onDone={floatDone} />
      {waitingFor.length > 0 && (
        <p className="sweep-wait font-pixel" aria-live="polite">
          ESPERANDO {waitingFor.join(', ')}
          <span className="sweep-wait-dots" aria-hidden="true" />
        </p>
      )}
      {showResult && <TableResult view={view} me={seatMe} ready={ready} canRematch={canRematch} onNextRound={onNextRound} onRematch={onRematch} onLeave={onLeave} />}
    </div>
  );
}
