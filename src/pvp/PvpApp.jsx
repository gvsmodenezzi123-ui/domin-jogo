import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import BlackMarketModal from '../components/BlackMarketModal.jsx';
import CaseCounter from '../components/CaseCounter.jsx';
import InfoBalloon from '../components/InfoBalloon.jsx';
import ScreenVeil from '../components/ScreenTransition.jsx';
import Shop from '../components/Shop.jsx';
import { useSceneTransition } from '../components/useSceneTransition.js';
import { useLongPress } from '../components/useLongPress.js';
import { BOSS_TRACKS, REGIONS } from '../data/campaign.js';
import { getEnhancement } from '../data/enhancedTiles.js';
import { MALETA_IDS } from '../data/maletas.js';
import { describeRoom } from '../data/pvpRoom.js';
import { getRelic } from '../data/relics.js';
import { MARKET_MUSIC, SHOP_MUSIC, sound } from '../engine/audioSynth.js';
import { relicSlotsFor } from '../engine/loadout.js';
import { loadEquippedFrame } from '../engine/meta.js';
import { sellPriceFor } from '../engine/shop.js';
import { clearSavedTable, createController, loadSavedTable, recentSavedTable } from './controller.js';
import { whereText } from './ladder.js';
import LobbyView from './LobbyView.jsx';
import NetBadge from './NetBadge.jsx';
import PvpDuel from './PvpDuel.jsx';
import { DisconnectOverlay, PvpEnd, PvpMaletaWait, PvpMenu, PvpToast, PvpWaiting } from './PvpScreens.jsx';
import { cleanName, generateRoomCode, parseRoomInput } from './protocol.js';
import { createSession } from './session.js';
import { createPeerTransport } from './transport.js';

const ME_KEY = 'buxaria:pvp:me';

/** Número ao acaso do aparelho (crypto quando dá). */
function deviceRandom() {
  try {
    const n = new Uint32Array(1);
    globalThis.crypto.getRandomValues(n);
    return n[0] / 2 ** 32;
  } catch {
    return Math.random();
  }
}

/** Quem você é na mesa online: um id fixo do aparelho e o apelido. */
function loadMe() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ME_KEY) ?? 'null');
    if (saved?.id) return { id: saved.id, name: saved.name ?? '' };
  } catch {
    /* sem storage */
  }
  const id = `j-${Math.floor(deviceRandom() * 36 ** 8).toString(36)}${Math.floor(deviceRandom() * 36 ** 4).toString(36)}`;
  return { id, name: '' };
}

function saveMe(me) {
  try {
    window.localStorage.setItem(ME_KEY, JSON.stringify(me));
  } catch {
    /* sem storage */
  }
}

const emptyStore = { subscribe: () => () => {}, getSnapshot: () => null };

/** Texto do balão do toque longo (talismã ou pedra de grife). */
function inspectInfo(payload, run) {
  if (payload.kind === 'tile' || payload.kind === 'offerTile') {
    const tileId = payload.kind === 'tile' ? payload.tile.id : payload.tileId;
    const enhancement = getEnhancement(payload.kind === 'tile' ? payload.tile.enhancement : payload.enhancement);
    if (!enhancement) return null;
    const [a, b] = tileId.split('#')[0].split('-');
    return { title: `[${a}|${b}] DE ${enhancement.name.toUpperCase()}`, rarity: enhancement.rarity, description: enhancement.description, extra: null };
  }
  const relic = getRelic(payload.id);
  if (!relic) return null;
  let extra = null;
  if (payload.owner === 'tioZe') extra = 'DO OPONENTE';
  else if (payload.owner === 'shop' || payload.owner === 'market') extra = `PREÇO: $${relic.price}`;
  else if (run?.phase === 'shop') extra = `VENDE POR $${sellPriceFor(run, relic.id)}`;
  return { title: relic.name.toUpperCase(), rarity: relic.rarity, description: relic.description, extra };
}

/** Faixa da trilha: a da loja, a do beco e, no duelo, a do chefe. */
function musicOf(view) {
  if (!view) return REGIONS[0].music;
  if (view.duel) return BOSS_TRACKS.comendador;
  const run = view.run;
  if (run.phase === 'shop') return SHOP_MUSIC;
  if (run.phase === 'blackMarket') return MARKET_MUSIC;
  return REGIONS[0].music;
}

/**
 * Patch PvP: o modo online inteiro (abre pelo JOGAR ONLINE da tela inicial). Versão 1.3:
 * lobby (quem cria configura a mesa) → maletas → Loja → Mercado Negro → o duelo → O Dono da
 * Noite. A rede mora em session.js; a ponte com a run, em controller.js; aqui só as telas.
 */
/** A mesa (rede + ponte com a run), ainda sem ligar: quem liga é o efeito da tela. `room`: a configuração (só quem cria). */
function makeTable(me, role, code, restore = null, room = null) {
  const clean = cleanName(me.name) || 'Jogador';
  const transport = createPeerTransport({ role, code, keepId: Boolean(restore) });
  const session = createSession({ role, code, me: { id: me.id, name: clean }, transport, restore: restore?.session ?? null, online: () => navigator.onLine !== false, room });
  return createController({ session, restore });
}

export default function PvpApp({ settings, onSettings, muted, onToggleMute, onExit, initialRoom = null }) {
  const [me, setMe] = useState(loadMe);
  const [saved, setSaved] = useState(() => loadSavedTable());
  const [ctl, setCtl] = useState(() => {
    const table = recentSavedTable();
    return table ? makeTable(loadMe(), table.role, table.code, table) : null;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [joinError, setJoinError] = useState(null);
  // o duelo acabou: a última rodada fica na mesa até tocar em FIM DA NOITE (a mesa nova zera)
  const [endSeen, setEndSeen] = useState(null);
  const { stage: veilStage, go: cutTo } = useSceneTransition();

  // liga a mesa nova (uma vez: o controller ignora o segundo pedido)
  useEffect(() => {
    ctl?.start();
  }, [ctl]);

  const store = ctl ?? emptyStore;
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, () => null);
  const net = view?.net ?? null;
  const run = view?.run ?? null;
  const frame = useMemo(() => loadEquippedFrame(), []);

  // avisos da mesa (o outro fechou o baralho na loja, jogada recusada)
  useEffect(() => {
    if (!ctl) return undefined;
    let timer = 0;
    let n = 0;
    const off = ctl.session.onNotice((info) => {
      n += 1;
      const opp = ctl.session.getSnapshot().opp?.name ?? 'O oponente';
      const text =
        info.type === 'shopFinish'
          ? `${opp} fechou o baralho: PRONTO PARA O DUELO${info.newTalismans.length ? ` (+${info.newTalismans.length} talismã${info.newTalismans.length > 1 ? 's' : ''})` : ''}`
          : 'Jogada recusada: a mesa mudou. Tente de novo.';
      setNotice({ key: n, text });
      clearTimeout(timer);
      timer = setTimeout(() => setNotice(null), 3200);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [ctl]);

  // a trilha da tela
  const track = musicOf(view);
  useEffect(() => {
    if (sound.ctx) sound.playTrack(track);
  }, [track]);

  const startInspect = useCallback((payload, rect) => setInspect({ payload, rect }), []);
  const endInspect = useCallback(() => setInspect(null), []);
  const press = useLongPress(startInspect, endInspect);
  const balloonInfo = inspect ? inspectInfo(inspect.payload, run) : null;
  const balloon = balloonInfo ? { ...balloonInfo, rect: inspect.rect } : null;

  const tap = () => {
    sound.init();
    sound.playClick();
  };

  const setName = (name) => {
    const next = { ...me, name };
    setMe(next);
    saveMe(next);
  };

  const begin = (role, code, restore = null, room = null) => {
    sound.init();
    setJoinError(null);
    setCtl(makeTable(me, role, code, restore, room));
  };

  const create = (room) => {
    tap();
    begin('host', generateRoomCode(deviceRandom), null, room);
  };
  const join = (typed) => {
    tap();
    const code = parseRoomInput(typed);
    if (!code) {
      setJoinError('Esse ID não parece de mesa: são 5 letras e números (ex.: MESA-8B2KQ).');
      return;
    }
    begin('guest', code);
  };
  const rejoin = () => {
    tap();
    if (saved) begin(saved.role, saved.code, saved);
    setSaved(null);
  };

  /** Fecha a mesa e volta ao lobby (ou ao menu). */
  const closeTable = (then) => {
    ctl?.destroy();
    ctl?.session.destroy();
    setCtl(null);
    setSaved(null);
    setMenuOpen(false);
    if (then === 'menu') onExit();
  };

  const cancel = () => {
    tap();
    clearSavedTable();
    closeTable();
  };

  const quit = () => {
    tap();
    if (net && (net.stage === 'run' || net.stage === 'maletas')) ctl.session.quit();
    else {
      clearSavedTable();
      closeTable();
    }
    setMenuOpen(false);
  };

  const openMenu = () => {
    tap();
    setMenuOpen(true);
  };

  const veil = <ScreenVeil stage={veilStage} />;
  const badge = net && <NetBadge link={net.link} ping={net.ping} place="map" />;
  const lost = net && net.link === 'lost' && net.stage !== 'over' && net.stage !== 'lobby' && (
    <DisconnectOverlay graceEndsAt={net.graceEndsAt} oppName={net.opp?.name} selfDown={navigator.onLine === false} />
  );
  const menu = menuOpen && net && (
    <PvpMenu
      code={net.code}
      oppName={net.opp?.name}
      muted={muted}
      onToggleMute={onToggleMute}
      settings={settings}
      onSettings={onSettings}
      onResume={() => {
        tap();
        setMenuOpen(false);
      }}
      onQuit={quit}
      stage={net.stage}
    />
  );
  const overlays = (
    <>
      {lost}
      {menu}
      <PvpToast notice={notice} />
      <InfoBalloon info={balloon} />
      {veil}
    </>
  );

  // --- lobby ---------------------------------------------------------------
  if (!net || net.stage === 'lobby') {
    return (
      <div className="app-shell h-full">
        <LobbyView
          name={me.name}
          onName={setName}
          snap={net}
          code={net?.code ?? null}
          initialJoin={initialRoom ?? ''}
          saved={saved}
          onCreate={create}
          onJoin={join}
          onRejoin={rejoin}
          onCancel={cancel}
          onBack={() => {
            tap();
            onExit();
          }}
          onTap={tap}
        />
        {joinError && (
          <p className="pvp-error pvp-error-float" role="alert">
            {joinError}
          </p>
        )}
        {veil}
      </div>
    );
  }

  const opp = { name: net.opp?.name ?? 'Oponente', maleta: net.oppHandshake?.suitcase ?? net.oppStatus?.maleta ?? 'classica' };

  // --- duelo (e a última rodada, antes do fim da noite) ---------------------------------
  const lastRound = net.stage === 'over' && net.over?.reason === 'hearts' && net.duel?.result?.matchOver && endSeen !== net.code;
  const duelScreen = net.duel && (
    <div className="app-shell h-full">
      <PvpDuel
        key={net.duel.id}
        duel={net.duel}
        opp={opp}
        relicSlots={relicSlotsFor(run)}
        link={net.link}
        ping={net.ping}
        muted={muted}
        onToggleMute={onToggleMute}
        onIntent={(intent) => ctl.session.duelIntent(intent)}
        onMenu={openMenu}
        onNextRound={() => {
          tap();
          ctl.session.nextRound();
        }}
        onFinish={() => {
          tap();
          cutTo(() => setEndSeen(net.code));
        }}
        frame={frame}
      />
      {overlays}
    </div>
  );
  if (net.duel && net.stage !== 'over') return duelScreen;

  // --- fim da noite ----------------------------------------------------------
  if (lastRound) return duelScreen;
  if (net.stage === 'over') {
    const shownRun = net.duel?.view ? { ...run, hearts: { player: net.duel.view.hearts.player }, maxHearts: { player: net.duel.view.maxHearts.player } } : run;
    return (
      <div className="app-shell h-full">
        <PvpEnd
          over={net.over}
          me={net.me}
          opp={opp}
          run={shownRun.phase === 'title' ? { ...shownRun, maleta: net.myHandshake?.suitcase ?? 'classica' } : shownRun}
          rounds={net.duel?.view?.round ?? 0}
          onLobby={() => {
            tap();
            clearSavedTable();
            closeTable();
          }}
          onMenu={() => {
            tap();
            clearSavedTable();
            closeTable('menu');
          }}
        />
        {veil}
      </div>
    );
  }

  // --- maletas -----------------------------------------------------------------
  if (net.stage === 'maletas' || (net.stage === 'run' && run.phase === 'title')) {
    if (!net.myHandshake) {
      return (
        <div className="app-shell h-full">
          <CaseCounter
            unlocked={MALETA_IDS}
            seen={MALETA_IDS}
            blackUnlocked={false}
            onStart={({ maleta }) => {
              tap();
              ctl.chooseMaleta(maleta);
            }}
            onBack={openMenu}
            pvp={{
              title: `MESA ONLINE · CONTRA ${opp.name.toUpperCase()}`,
              note: `Escolha a sua maleta (todas abertas). Mesa: ${describeRoom(net.room)}.`,
              start: 'ESTA É A MINHA MALETA',
              back: 'MENU DA MESA',
              debuff: { bicheiro: 'O adversário senta com 1 pedra de grife a mais contra você.' },
            }}
          />
          {badge}
          {overlays}
        </div>
      );
    }
    return (
      <div className="app-shell h-full">
        <PvpMaletaWait opp={net.opp} myMaleta={net.myHandshake.suitcase} room={net.room} link={net.link} ping={net.ping} onMenu={openMenu} />
        {overlays}
      </div>
    );
  }

  // --- baralho fechado: esperando o outro sair do Mercado Negro ----------------------------
  if (view.step === 'duel') {
    return (
      <div className="app-shell h-full">
        <PvpWaiting run={run} opp={opp} oppStatus={net.oppStatus} link={net.link} ping={net.ping} press={press} onMenu={openMenu} />
        {overlays}
      </div>
    );
  }

  const act = (action) => {
    tap();
    ctl.dispatch(action);
  };
  const leaveStop = () => {
    tap();
    cutTo(() => ctl.leaveStop());
  };
  const oppNow = `${opp.name.toUpperCase()}: ${whereText(net.oppStatus).toUpperCase()}`;

  // --- 1ª parada: a Loja do Valtinho -------------------------------------------------
  if (run.phase === 'shop') {
    return (
      <div className="app-shell h-full">
        <Shop
          state={run}
          press={press}
          onBuyRelic={(index) => act({ type: 'SHOP_BUY_RELIC', index })}
          onBuyTile={(index) => act({ type: 'SHOP_BUY_TILE', index })}
          onSell={(id) => act({ type: 'SHOP_SELL_RELIC', id })}
          onReroll={() => act({ type: 'SHOP_REROLL' })}
          onLeave={leaveStop}
          leaveTitle="SEGUIR PARA O MERCADO NEGRO →"
          leaveNote={`DEPOIS, O DUELO · ${oppNow}`}
        />
        {badge}
        {overlays}
      </div>
    );
  }

  // --- 2ª parada: o Mercado Negro ------------------------------------------------------
  if (run.phase === 'blackMarket') {
    return (
      <div className="app-shell h-full">
        <BlackMarketModal state={run} press={press} onBuy={(index) => act({ type: 'MARKET_BUY', index })} onLeave={leaveStop} leaveTitle="PRONTO PARA O DUELO →" leaveNote={`FECHA O BARALHO · ${oppNow}`} />
        {badge}
        {overlays}
      </div>
    );
  }

  // entre uma parada e outra (um quadro só)
  return (
    <div className="app-shell h-full">
      <PvpMaletaWait opp={net.opp} myMaleta={run.maleta} room={net.room} link={net.link} ping={net.ping} onMenu={openMenu} />
      {overlays}
    </div>
  );
}
