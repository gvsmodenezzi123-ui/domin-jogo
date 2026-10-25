import { useState } from 'react';
import LampRig from '../components/LampRig.jsx';
import OptionsPanel from '../components/OptionsPanel.jsx';
import { HeartsBar } from '../components/PixelHeart.jsx';
import { MaletaSprite } from '../components/art/CaseArt.jsx';
import { maletaOf } from '../data/maletas.js';
import { describeRoom } from '../data/pvpRoom.js';
import NetBadge from './NetBadge.jsx';
import OpponentStrip from './OpponentStrip.jsx';
import { formatRoomId } from './protocol.js';
import { useSecondsLeft } from './useNow.js';

/**
 * Patch PvP (versão 1.3): o seu baralho fechou e você espera o outro sair do Mercado Negro.
 * Mostra onde ele está, os corações e os talismãs dele.
 */
export function PvpWaiting({ run, opp, oppStatus, link, ping, press, onMenu }) {
  return (
    <main className="pvp-wait fixed inset-0 z-[55] flex flex-col items-center px-5 text-center" role="main" aria-label="Mesa reservada">
      <LampRig part="light" lamp={60} cord={26} beamWidth={360} className="z-[1]" />
      <LampRig part="body" lamp={60} cord={26} beamWidth={360} className="z-[2]" />
      <NetBadge link={link} ping={ping} />
      <div className="pvp-wait-inner relative z-[3] flex w-full max-w-[360px] flex-1 flex-col items-center">
        <p className="pvp-kicker">BARALHO FECHADO</p>
        <h1 className="pvp-wait-title">
          {`Esperando ${opp.name} fechar o baralho`}
          <span className="thinking-dots" aria-hidden="true" />
        </h1>
        <p className="pvp-wait-note">O duelo começa quando ele sair do Mercado Negro. Vale até alguém zerar: quem vencer é O Dono da Noite.</p>
        <div className="pvp-wait-cases" aria-hidden="true">
          <MaletaSprite id={run.maleta} className="h-14 w-14" />
          <span className="pvp-wait-x">×</span>
          <MaletaSprite id={opp.maleta ?? 'classica'} open={false} className="h-14 w-14" />
        </div>
        <div className="pvp-wait-me">
          <span className="font-pixel text-[7px] text-bone-400">VOCÊ</span>
          <HeartsBar current={run.hearts.player} max={run.maxHearts.player} pixel={2} label="Seus corações" />
        </div>
        <OpponentStrip name={opp.name} maleta={opp.maleta} status={oppStatus} press={press} />
        <button type="button" className="text-action pvp-back mt-auto" onClick={onMenu}>
          MENU DA MESA
        </button>
      </div>
    </main>
  );
}

/** Patch PvP: esperando o outro escolher a maleta (ou o anfitrião mandar a teia). */
export function PvpMaletaWait({ opp, myMaleta, room = null, link, ping, onMenu }) {
  return (
    <main className="pvp-wait fixed inset-0 z-[55] flex flex-col items-center px-5 text-center" role="main" aria-label="Esperando a maleta do oponente">
      <LampRig part="light" lamp={60} cord={26} beamWidth={360} className="z-[1]" />
      <LampRig part="body" lamp={60} cord={26} beamWidth={360} className="z-[2]" />
      <NetBadge link={link} ping={ping} />
      <div className="pvp-wait-inner relative z-[3] flex w-full max-w-[360px] flex-1 flex-col items-center">
        <p className="pvp-kicker">BALCÃO DE MALETAS</p>
        <h1 className="pvp-wait-title">
          {opp ? `${opp.name} está escolhendo a maleta` : 'Esperando o oponente'}
          <span className="thinking-dots" aria-hidden="true" />
        </h1>
        <div className="pvp-wait-cases" aria-hidden="true">
          <MaletaSprite id={myMaleta} open className="h-16 w-16" />
        </div>
        <p className="pvp-wait-note">A sua: {maletaOf(myMaleta).name}. A rota (Loja, Mercado Negro e o duelo) começa para os dois assim que ele escolher.</p>
        {room && <p className="pvp-room-rules">{describeRoom(room)}</p>}
        <button type="button" className="text-action pvp-back mt-auto" onClick={onMenu}>
          MENU DA MESA
        </button>
      </div>
    </main>
  );
}

/**
 * Patch PvP: o menu da mesa online (no lugar da pausa: o outro não espera). SAIR DA MESA
 * entrega a vitória por W.O., então pede confirmação.
 */
export function PvpMenu({ code, oppName, muted, onToggleMute, settings, onSettings, onResume, onQuit, stage }) {
  const [confirm, setConfirm] = useState(false);
  const [options, setOptions] = useState(false);
  const playing = stage === 'run' || stage === 'maletas';
  return (
    <div className="overlay-backdrop fixed inset-0 z-[80] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="pvp-menu-title">
      <div className="overlay-card pause-card flex max-h-[92%] w-full max-w-[300px] flex-col overflow-hidden px-5 py-6 text-center">
        <h2 id="pvp-menu-title" className="shrink-0 font-pixel text-[14px] text-bone-50 text-shadow-pixel">
          {options ? 'OPÇÕES' : confirm ? 'SAIR DA MESA?' : 'MESA ONLINE'}
        </h2>
        {options ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col text-left">
            <OptionsPanel settings={settings} onChange={onSettings} />
            <button type="button" className="btn-pixel mt-4 w-full shrink-0" onClick={() => setOptions(false)}>
              VOLTAR
            </button>
          </div>
        ) : confirm ? (
          <>
            <p className="mt-3 font-term text-lg leading-tight text-bone-200">
              {playing ? `Sair agora entrega a vitória para ${oppName ?? 'o oponente'} por W.O.` : 'A mesa fecha e o ID deixa de valer.'}
            </p>
            <div className="mt-5 grid gap-2">
              <button type="button" data-tone="blood" className="btn-pixel" onClick={onQuit}>
                {playing ? 'SAIR E ENTREGAR (W.O.)' : 'FECHAR A MESA'}
              </button>
              <button type="button" className="btn-pixel" onClick={() => setConfirm(false)}>
                FICAR NA MESA
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 font-term text-lg text-bone-300">
              {formatRoomId(code)}
              {oppName ? ` · contra ${oppName}` : ''}
            </p>
            <p className="font-term text-[15px] leading-tight text-bone-400">O jogo continua do outro lado: o cronômetro não para.</p>
            <div className="mt-4 grid gap-2">
              <button type="button" data-tone="brass" className="btn-pixel" onClick={onResume}>
                VOLTAR À MESA
              </button>
              <button type="button" className="btn-pixel" onClick={onToggleMute} aria-pressed={muted}>
                {muted ? 'SOM: DESLIGADO' : 'SOM: LIGADO'}
              </button>
              <button type="button" className="btn-pixel" onClick={() => setOptions(true)}>
                OPÇÕES
              </button>
              <button type="button" data-tone="blood" className="btn-pixel" onClick={() => setConfirm(true)}>
                SAIR DA MESA
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Patch PvP: a conexão caiu. 60 s de tolerância contados na tela; depois, W.O. para quem
 * ficou conectado (o jogo decide sozinho, ver session.js).
 */
export function DisconnectOverlay({ graceEndsAt, oppName, selfDown }) {
  const left = useSecondsLeft(graceEndsAt);
  return (
    <div className="overlay-backdrop pvp-lost fixed inset-0 z-[75] flex items-center justify-center px-6" role="alertdialog" aria-modal="true" aria-labelledby="pvp-lost-title">
      <div className="overlay-card w-full max-w-[300px] px-5 py-6 text-center">
        <p className="font-pixel text-[8px] text-blood-400">CONEXÃO PERDIDA</p>
        <h2 id="pvp-lost-title" className="mt-2 font-pixel text-[12px] leading-snug text-bone-50">
          {selfDown ? 'A SUA INTERNET CAIU' : `${(oppName ?? 'O OPONENTE').toUpperCase()} SUMIU DA MESA`}
        </h2>
        <p className="pvp-countdown mt-3 font-pixel" aria-live="polite">
          {left ?? 60}s
        </p>
        <p className="mt-3 font-term text-lg leading-tight text-bone-200">
          {selfDown
            ? 'Volte para a internet: o jogo reconecta sozinho. Sem volta em 60 s, a vitória é dele por W.O.'
            : `Esperando ${oppName ?? 'o oponente'} voltar. Sem volta em 60 s, a vitória é sua por W.O.`}
        </p>
      </div>
    </div>
  );
}

const REASON = {
  hearts: (mine, opp) => (mine ? `${opp} zerou os corações.` : 'Os seus corações acabaram.'),
  wo: (mine, opp) => (mine ? `${opp} não voltou para a mesa: vitória por W.O.` : 'A conexão não voltou a tempo: W.O.'),
  quit: (mine, opp) => (mine ? `${opp} saiu da mesa: vitória por W.O.` : 'Você saiu da mesa: W.O.'),
};

/** Patch PvP: o fim da noite online — o sobrevivente é O Dono da Noite. */
export function PvpEnd({ over, me, opp, run, rounds = 0, onLobby, onMenu }) {
  const mine = over.winnerId === me.id;
  const oppName = opp?.name ?? 'O oponente';
  const why = (REASON[over.reason] ?? REASON.hearts)(mine, oppName);
  return (
    <main className={`pvp-end fixed inset-0 z-[60] flex flex-col items-center px-5 text-center ${mine ? 'pvp-end-win' : 'pvp-end-lose'}`} role="main" aria-label="Fim da noite">
      <LampRig part="light" lamp={60} cord={26} beamWidth={380} className="z-[1]" />
      <LampRig part="body" lamp={60} cord={26} beamWidth={380} className="z-[2]" />
      <div className="relative z-[3] flex w-full max-w-[360px] flex-1 flex-col items-center">
        <p className="pvp-kicker">FIM DA NOITE{rounds > 0 ? ` · ${rounds} ${rounds === 1 ? 'RODADA' : 'RODADAS'}` : ''}</p>
        <div className="pvp-end-case" aria-hidden="true">
          <MaletaSprite id={mine ? run.maleta : (opp?.maleta ?? 'classica')} open className="h-20 w-20" />
        </div>
        <h1 className="pvp-end-title">{mine ? 'VOCÊ É O DONO DA NOITE' : `${oppName.toUpperCase()} É O DONO DA NOITE`}</h1>
        <p className="pvp-end-why">{why}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-pixel text-[7px] text-bone-400">SEUS CORAÇÕES</span>
          <HeartsBar current={Math.max(0, run.hearts.player)} max={run.maxHearts.player} pixel={2} />
        </div>
        <div className="mt-auto grid w-full gap-2 pb-2">
          <button type="button" data-tone="play" className="btn-pixel" onClick={onLobby}>
            NOVA MESA
          </button>
          <button type="button" className="btn-pixel" onClick={onMenu}>
            MENU PRINCIPAL
          </button>
        </div>
      </div>
    </main>
  );
}

/** Patch PvP: pequenos avisos da mesa (o outro fechou o baralho na loja, jogada recusada...). */
export function PvpToast({ notice }) {
  if (!notice) return null;
  return (
    <div key={notice.key} className="pvp-toast" role="status" aria-live="polite">
      {notice.text}
    </div>
  );
}
