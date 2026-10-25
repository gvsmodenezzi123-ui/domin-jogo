import { useState } from 'react';
import LampRig from '../components/LampRig.jsx';
import { PRIVACY_URL } from '../data/privacy.js';
import NetBadge from './NetBadge.jsx';
import { webrtcAvailable } from './peerLoader.js';
import { ROOM_LENGTH, ROOM_PREFIX, formatRoomId, maskRoomInput } from './protocol.js';
import { copyText, roomLink } from './share.js';

const ERRORS = {
  notFound: 'Mesa não encontrada. Confira o ID (ou peça um novo).',
  full: 'Essa mesa já tem dois jogadores.',
  version: 'Vocês estão em versões diferentes do Buxaria. Atualizem o jogo.',
  taken: 'Esse ID de mesa já está em uso. Crie outra mesa.',
  library: 'Não deu para carregar a conexão (PeerJS). Confira a internet.',
  network: 'Sem conexão com o servidor das mesas. Confira a internet.',
  'server-error': 'O servidor das mesas não respondeu. Tente de novo.',
  'socket-error': 'O servidor das mesas não respondeu. Tente de novo.',
  'browser-incompatible': 'Esta página não deixa fazer conexão direta entre aparelhos (WebRTC). Abra o Buxaria pelo site ou pelo app.',
};

/** O site do jogo (o mesmo GitHub Pages da política de privacidade). */
const SITE_URL = PRIVACY_URL.replace(/privacy\.html$/, '');

/**
 * Patch PvP: a entrada da mesa online, antes do Balcão de Maletas.
 *   CRIAR MESA CLANDESTINA → gera o ID ("MESA-8B2KQ"), mostra "Esperando oponente sentar à
 *   mesa..." e o COPIAR LINK/ID; SENTAR EM UMA MESA → o campo com máscara e o PUXAR CADEIRA.
 * O indicador de conexão fica no canto.
 */
export default function LobbyView({ name, onName, snap = null, code = null, initialJoin = '', saved = null, onCreate, onJoin, onRejoin, onCancel, onBack, onTap }) {
  const [typed, setTyped] = useState(() => maskRoomInput(initialJoin));
  const [copied, setCopied] = useState(false);
  // prévia em iframe isolado (ex.: um artifact) bloqueia o WebRTC: avisa antes de tentar
  const [direct] = useState(webrtcAvailable);
  const busy = Boolean(snap);
  const hosting = snap?.role === 'host';
  const error = snap?.error ? (ERRORS[snap.error] ?? ERRORS.network) : null;
  const nameOk = name.trim().length > 0;
  const joinOk = typed.length === ROOM_LENGTH && nameOk;
  const link = code ? roomLink(code) : null;

  const copy = async () => {
    onTap?.();
    const text = link ? `Bora jogar Buxaria! Mesa ${formatRoomId(code)} · ${link}` : formatRoomId(code);
    setCopied(await copyText(text));
  };

  return (
    <main className="pvp-lobby fixed inset-0 z-[55] flex flex-col items-center px-5 text-center" role="main" aria-label="Mesa online">
      <LampRig part="light" lamp={56} cord={22} beamWidth={360} className="z-[1]" />
      <LampRig part="body" lamp={56} cord={22} beamWidth={360} className="z-[2]" />
      {/* antes de abrir ou puxar uma mesa não há conexão nenhuma: o indicador só aparece depois */}
      {snap && <NetBadge link={snap.link} ping={snap.ping} />}
      <div className="pvp-lobby-inner relative z-[3] flex w-full max-w-[360px] flex-1 flex-col">
        <h1 className="pvp-title">
          MESA ONLINE
          <span>Um contra um, de verdade. A teia é a mesma para os dois; cada um escolhe o caminho.</span>
        </h1>

        <label className="pvp-field">
          <span className="pvp-field-label">SEU APELIDO NA MESA</span>
          <input
            className="pvp-input"
            type="text"
            value={name}
            onChange={(e) => onName(e.target.value.slice(0, 14))}
            placeholder="Como te chamam no boteco"
            maxLength={14}
            disabled={busy}
            autoComplete="nickname"
            spellCheck={false}
          />
        </label>

        {!busy && !direct && (
          <div className="pvp-room-card" role="alert">
            <span className="pvp-field-label">A MESA ONLINE NÃO ABRE AQUI</span>
            <p className="pvp-hint">Esta página não deixa fazer conexão direta entre aparelhos (WebRTC), então a mesa online não abre nela. Jogue pelo site ou pelo app do Buxaria:</p>
            <a className="pvp-site-link" href={SITE_URL} target="_blank" rel="noopener noreferrer">
              {SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}
            </a>
          </div>
        )}

        {!busy && direct && (
          <>
            {saved && (
              <button type="button" data-tone="brass" className="btn-pixel pvp-btn" onClick={onRejoin}>
                VOLTAR PARA A {formatRoomId(saved.code)}
                <span className="pvp-btn-note">{saved.oppName ? `A partida com ${saved.oppName} continua` : 'A mesa continua'}</span>
              </button>
            )}
            <button type="button" data-tone="play" className="btn-pixel pvp-btn" disabled={!nameOk} onClick={onCreate}>
              CRIAR MESA CLANDESTINA
            </button>
            <p className="pvp-or" aria-hidden="true">
              ou
            </p>
            <div className="pvp-join">
              <span className="pvp-field-label">SENTAR EM UMA MESA</span>
              <label className="pvp-room-input">
                <span className="pvp-room-prefix" aria-hidden="true">
                  {ROOM_PREFIX}
                </span>
                <input
                  className="pvp-input pvp-input-room"
                  type="text"
                  inputMode="text"
                  value={typed}
                  onChange={(e) => setTyped(maskRoomInput(e.target.value))}
                  placeholder="_____"
                  maxLength={ROOM_LENGTH + ROOM_PREFIX.length}
                  aria-label="Digite o ID da sala"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && joinOk) onJoin(typed);
                  }}
                />
              </label>
              <button type="button" className="btn-pixel pvp-btn" disabled={!joinOk} onClick={() => onJoin(typed)}>
                PUXAR CADEIRA (CONECTAR)
              </button>
            </div>
          </>
        )}

        {busy && hosting && (
          <div className="pvp-room-card" role="group" aria-label="Sua mesa">
            <span className="pvp-field-label">O ID DA SUA MESA</span>
            <p className="pvp-room-id">{formatRoomId(code)}</p>
            <p className="pvp-status">
              {snap.link === 'connecting' ? 'Abrindo a mesa' : 'Esperando oponente sentar à mesa'}
              <span className="thinking-dots" aria-hidden="true" />
            </p>
            <button type="button" data-tone="brass" className="btn-pixel pvp-btn" onClick={copy}>
              {copied ? 'COPIADO!' : 'COPIAR LINK/ID'}
            </button>
            <p className="pvp-hint">Mande o ID para quem vai jogar. Ele toca em SENTAR EM UMA MESA e digita.</p>
          </div>
        )}

        {busy && !hosting && (
          <div className="pvp-room-card" role="group" aria-label="Entrando na mesa">
            <span className="pvp-field-label">ENTRANDO NA MESA</span>
            <p className="pvp-room-id">{formatRoomId(code)}</p>
            {!error && (
              <p className="pvp-status">
                Puxando a cadeira
                <span className="thinking-dots" aria-hidden="true" />
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="pvp-error" role="alert">
            {error}
          </p>
        )}

        <div className="mt-auto flex flex-col items-center gap-1 pb-1">
          {busy ? (
            <button type="button" className="text-action pvp-back" onClick={onCancel}>
              {error ? 'TENTAR DE NOVO' : 'CANCELAR'}
            </button>
          ) : (
            <button type="button" className="text-action pvp-back" onClick={onBack}>
              VOLTAR AO MENU
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
