import { ONLINE_TILES } from '../engine/progress.js';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { sound } from '../engine/audioSynth.js';
import NetBadge from '../pvp/NetBadge.jsx';
import { PvpToast } from '../pvp/PvpScreens.jsx';
import { copyText, roomLink } from '../pvp/share.js';
import { createPeerTransport } from '../pvp/transport.js';
import { useSecondsLeft } from '../pvp/useNow.js';
import TableLobby, { TableRules } from './TableLobby.jsx';
import TableScreen from './TableScreen.jsx';
import { mapOf } from '../data/tableMaps.js';
import { TABLE_FACES, tableNote } from './seats.js';
import { formatTableId, tablePeerId } from './tableProtocol.js';
import { createTableSession } from './tableSession.js';

const FACE_KEY = 'buxaria:mesa:face';

function loadFace() {
  try {
    const f = window.localStorage.getItem(FACE_KEY);
    return TABLE_FACES.includes(f) ? f : TABLE_FACES[0];
  } catch {
    return TABLE_FACES[0];
  }
}
function saveFace(face) {
  try {
    window.localStorage.setItem(FACE_KEY, face);
  } catch {
    /* sem storage */
  }
}

const ERRORS = {
  notFound: 'Roda não encontrada. Confira o código (ou peça um novo).',
  full: 'Essa roda já está cheia.',
  started: 'Essa roda já começou. Peça para o anfitrião abrir outra.',
  version: 'Vocês estão em versões diferentes do Buxaria. Atualizem o jogo.',
  taken: 'Esse código já está em uso. Abra outra roda.',
  library: 'Não deu para carregar a conexão (PeerJS). Confira a internet.',
  'browser-incompatible': 'Esta página não deixa fazer conexão direta entre aparelhos (WebRTC). Abra o Buxaria pelo site ou pelo app.',
};
const ENDED = {
  'host-left': 'O anfitrião saiu: a roda acabou.',
  lost: 'A conexão com a roda caiu e não voltou.',
};

/** Tela de espera, erro ou fim (a lâmpada do boteco e um cartão no meio). */
function TableCard({ kicker, title, text, code, button, onButton, busy = false }) {
  return (
    <div className="table-lobby app-shell fixed inset-0 flex items-center justify-center px-6" role="main">
      <div className="overlay-card w-full max-w-[320px] px-5 py-6 text-center">
        <p className="font-pixel text-[8px] text-bone-400">{kicker}</p>
        <h2 className="mt-2 font-pixel text-[12px] leading-snug text-bone-50">
          {title}
          {busy && <span className="thinking-dots" aria-hidden="true" />}
        </h2>
        {code && <p className="pvp-room-id mt-3">{code}</p>}
        {text && <p className="mt-3 font-term text-lg leading-tight text-bone-200">{text}</p>}
        <button type="button" className="btn-pixel mt-4 w-full" onClick={onButton}>
          {button}
        </button>
      </div>
    </div>
  );
}

/** A sua conexão com a roda caiu: o jogo tenta voltar sozinho por 60 s. */
function LostOverlay({ graceEndsAt }) {
  const left = useSecondsLeft(graceEndsAt);
  return (
    <div className="overlay-backdrop pvp-lost fixed inset-0 z-[75] flex items-center justify-center px-6" role="alertdialog" aria-modal="true" aria-labelledby="table-lost-title">
      <div className="overlay-card w-full max-w-[300px] px-5 py-6 text-center">
        <p className="font-pixel text-[8px] text-blood-400">CONEXÃO PERDIDA</p>
        <h2 id="table-lost-title" className="mt-2 font-pixel text-[12px] leading-snug text-bone-50">
          VOLTANDO PARA A RODA
        </h2>
        <p className="pvp-countdown mt-3 font-pixel" aria-live="polite">
          {left ?? 60}s
        </p>
        <p className="mt-3 font-term text-lg leading-tight text-bone-200">Enquanto isso, o relógio joga por você. Sem volta em 60 s, você sai por W.O.</p>
      </div>
    </div>
  );
}

/** O menu da roda: som, continuar e sair (sair no meio da partida é W.O.). */
function TableMenu({ playing, host, muted, onToggleMute, onResume, onQuit }) {
  return (
    <div className="overlay-backdrop fixed inset-0 z-[80] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="table-menu-title">
      <div className="overlay-card w-full max-w-[300px] px-5 py-6 text-center">
        <h2 id="table-menu-title" className="font-pixel text-[12px] text-bone-50">
          RODA
        </h2>
        <button type="button" className="btn-pixel mt-4 w-full" onClick={onToggleMute}>
          {muted ? 'LIGAR O SOM' : 'DESLIGAR O SOM'}
        </button>
        <button type="button" data-tone="play" className="btn-pixel mt-2 w-full" onClick={onResume}>
          CONTINUAR
        </button>
        <button type="button" className="btn-pixel mt-2 w-full" onClick={onQuit}>
          SAIR DA RODA
        </button>
        <p className="mt-3 font-term text-base leading-tight text-bone-300">
          {host ? 'Você é o anfitrião: se sair, a roda acaba para todo mundo.' : playing ? 'Sair no meio da partida é W.O.: a sua cadeira fica fora.' : 'Você pode voltar pelo código enquanto a roda não começar.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Versão 2.4: a roda online de 2 a 4 (o "MESA DE 2 A 4" do modo online). Liga a sessão em
 * estrela (tableSession.js) pelo mesmo PeerJS do duelo e mostra o saguão, a mesa, o resultado
 * e o pódio. `role` 'host' abre a roda com `code`; 'guest' entra nela.
 */
export default function TableOnline({ role, code, me, config = null, onExit, muted, onToggleMute, onTrack = null, tiles = 'bone', onTiles = null }) {
  const [face, setFace] = useState(loadFace);
  // a sessão vale para esta roda (o PvpApp troca a key a cada roda nova)
  const [session] = useState(() =>
    createTableSession({ role, code, me: { id: me.id, name: me.name, face: loadFace() }, transport: createPeerTransport({ role, code, hostPeerId: tablePeerId(code) }), config }),
  );
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    session.start();
    return () => session.destroy();
  }, [session]);

  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, () => null);
  // versão 2.13: a roda toca a trilha da sala que o anfitrião escolheu (o PvpApp toca)
  const track = mapOf(snap?.lobby?.config?.map).music;
  useEffect(() => onTrack?.(track), [onTrack, track]);

  const tap = () => {
    sound.init();
    sound.playClick();
  };
  const leave = () => {
    tap();
    session?.leave();
    onExit();
  };

  if (!snap || snap.stage === 'connecting') {
    return (
      <TableCard
        kicker={formatTableId(code)}
        title={role === 'host' ? 'ABRINDO A RODA' : 'PUXANDO A CADEIRA'}
        busy
        button="CANCELAR"
        onButton={leave}
      />
    );
  }
  if (snap.stage === 'error') {
    return <TableCard kicker={formatTableId(code)} title="NÃO DEU PARA SENTAR" text={ERRORS[snap.error] ?? 'Sem conexão com o servidor das mesas. Confira a internet.'} button="VOLTAR" onButton={leave} />;
  }
  if (snap.stage === 'ended') {
    return <TableCard kicker={formatTableId(code)} title="FIM DA RODA" text={ENDED[snap.ended] ?? ENDED.lost} button="VOLTAR" onButton={leave} />;
  }

  const host = role === 'host';
  const lost = !host && snap.link === 'lost' && <LostOverlay graceEndsAt={snap.graceEndsAt} />;
  const humansIn = (snap.lobby?.seats ?? []).filter((s) => s && !s.bot && !s.host).length;
  const badgeLink = snap.link === 'ok' ? (host && humansIn === 0 ? 'waiting' : 'open') : snap.link;
  // o indicador de conexão fica no saguão; na mesa, o ping é a bolinha de cada cadeira
  const badge = <NetBadge link={badgeLink} ping={null} />;

  // --- saguão ------------------------------------------------------------------------------
  if (snap.stage === 'lobby' && snap.lobby) {
    const { config: cfg, seats } = snap.lobby;
    const mine = seats.find((s) => s?.id === snap.you);
    const others = new Set(seats.filter((s) => s && s.id !== snap.you).map((s) => s.face));
    const cycleFace = (dir) => {
      tap();
      let at = TABLE_FACES.indexOf(mine?.face ?? face);
      for (let k = 0; k < TABLE_FACES.length; k += 1) {
        at = (at + dir + TABLE_FACES.length) % TABLE_FACES.length;
        if (!others.has(TABLE_FACES[at])) break;
      }
      const next = TABLE_FACES[at];
      setFace(next);
      saveFace(next);
      session.setFace(next);
    };
    const copy = async () => {
      tap();
      const link = roomLink(code, 'roda');
      const id = formatTableId(code);
      setCopied(await copyText(link ? `Bora jogar Buxaria! Roda ${id} · ${link}` : id));
    };
    const highest = seats.reduce((n, s, i) => (s ? i + 1 : n), 1);
    const seated = seats.filter(Boolean);
    const waiting = seated.filter((s) => !s.ready);
    return (
      <>
        <TableLobby
          title={`RODA DE ${cfg.seats}${cfg.teams ? ' · DUPLAS' : ''}`}
          code={formatTableId(code)}
          onCopy={copy}
          copied={copied}
          slots={seats}
          you={snap.you}
          onFace={cycleFace}
          tiles={tiles}
          onTiles={onTiles ? (dir) => (tap(), onTiles(ONLINE_TILES[(ONLINE_TILES.indexOf(tiles) + dir + ONLINE_TILES.length) % ONLINE_TILES.length])) : null}
          onAddBot={host ? (place) => (tap(), session.addBot(place)) : null}
          onRemoveBot={host ? (id) => (tap(), session.removeBot(id)) : null}
          teams={Boolean(cfg.teams)}
          onMove={(place) => (tap(), session.moveTo(place))}
          swaps={snap.lobby.swaps ?? []}
          onAnswer={(from, yes) => (tap(), session.answerSwap(from, yes))}
          options={<TableRules config={cfg} minSeats={highest} onChange={host ? (next) => (tap(), session.setConfig(next)) : null} />}
          note={
            host
              ? seated.length < 2
                ? 'Mande o código para quem vai jogar, ou ponha bots nas cadeiras vazias.'
                : cfg.teams && seated.length < 4
                  ? 'Duplas precisam das 4 cadeiras: chame mais gente ou ponha bots.'
                  : waiting.length
                    ? `Esperando ${waiting.map((s) => s.name).join(', ')} marcar PRONTO.`
                    : tableNote(seated.length, cfg)
              : cfg.teams || cfg.scoring === 'tentos'
                ? tableNote(cfg.seats, cfg)
                : 'Quem abriu a roda escolhe as regras e começa a partida.'
          }
          footer={
            <>
              {host ? (
                <button type="button" data-tone="play" className="btn-pixel lobby-start w-full" disabled={!session.canStart()} onClick={() => (tap(), session.startMatch())}>
                  COMEÇAR A RODA
                </button>
              ) : (
                <button type="button" data-tone={mine?.ready ? 'brass' : 'play'} className="btn-pixel lobby-start w-full" onClick={() => (tap(), session.setReady(!mine?.ready))}>
                  {mine?.ready ? 'PRONTO! (TOCAR PARA DESMARCAR)' : 'ESTOU PRONTO'}
                </button>
              )}
              <button type="button" className="text-action lobby-back" onClick={leave}>
                SAIR DA RODA
              </button>
            </>
          }
        />
        {badge}
        {lost}
        <PvpToast notice={snap.notice} />
      </>
    );
  }

  // --- a mesa ------------------------------------------------------------------------------
  if (snap.view) {
    return (
      <div className="app-shell h-full">
        <TableScreen
          view={snap.view}
          map={snap.lobby?.config?.map}
          me={snap.you}
          clock={snap.clock}
          links={snap.links}
          ready={snap.ready}
          canRematch={host}
          onIntent={(action) => session.intent(action)}
          emotes={snap.emotes}
          onEmote={(id) => session.emote(id)}
          onNextRound={(opts) => {
            if (opts?.auto !== true) tap();
            session.nextRound();
          }}
          onRematch={() => {
            tap();
            session.rematch();
          }}
          onLeave={leave}
          onMenu={() => {
            tap();
            setMenu(true);
          }}
          muted={muted}
          onToggleMute={onToggleMute}
        />
        {lost}
        <PvpToast notice={snap.notice} />
        {menu && (
          <TableMenu
            playing={snap.view.phase !== 'matchOver'}
            host={host}
            muted={muted}
            onToggleMute={onToggleMute}
            onResume={() => {
              tap();
              setMenu(false);
            }}
            onQuit={leave}
          />
        )}
      </div>
    );
  }
  return <TableCard kicker={formatTableId(code)} title="ENTRANDO NA RODA" busy button="SAIR" onButton={leave} />;
}
