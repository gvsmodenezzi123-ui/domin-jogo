import { useState } from 'react';
import LampRig from '../components/LampRig.jsx';
import { PRIVACY_URL } from '../data/privacy.js';
import { DEFAULT_ROOM, RARITY_LABEL, ROOM_MAPS, ROOM_OPTIONS, describeRoom, sanitizeRoom } from '../data/pvpRoom.js';
import { mapOf, mapUnlocked, stepMap } from '../data/tableMaps.js';
import { loadCollection } from '../engine/progress.js';
import NetBadge from './NetBadge.jsx';
import { webrtcAvailable } from './peerLoader.js';
import { ROOM_LENGTH, ROOM_PREFIX, formatRoomId, maskRoomInput } from './protocol.js';
import { TABLE_PREFIX, maskTableInput } from '../table/tableProtocol.js';
import { copyText, roomLink } from './share.js';
import DominoKey from '../components/DominoKey.jsx';
import LandStage from '../components/LandStage.jsx';
import { useLandscape } from '../components/useLandscape.js';
import { STREET_PAD, paintStreetBack } from '../components/art/landStreet.js';

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

const ROOM_KEY = 'buxaria:pvp:room';

/** A última configuração que você usou para criar mesa (fica no aparelho). */
function loadRoom() {
  try {
    return sanitizeRoom(JSON.parse(window.localStorage.getItem(ROOM_KEY) ?? 'null') ?? DEFAULT_ROOM);
  } catch {
    return { ...DEFAULT_ROOM };
  }
}
function saveRoom(room) {
  try {
    window.localStorage.setItem(ROOM_KEY, JSON.stringify(room));
  } catch {
    /* sem storage */
  }
}

/** Os itens da configuração da mesa: rótulo e como cada escolha aparece no botão. */
const SETUP_ROWS = [
  { key: 'coins', label: 'MOEDAS DE CADA UM', options: ROOM_OPTIONS.coins, show: (v) => `$${v}` },
  { key: 'hearts', label: 'CORAÇÕES NO DUELO', options: ROOM_OPTIONS.hearts, show: (v) => `${v}♥` },
  { key: 'rarity', label: 'TALISMÃS NA LOJA', options: ROOM_OPTIONS.rarity, show: (v) => RARITY_LABEL[v] },
  { key: 'turn', label: 'TEMPO POR JOGADA', options: ROOM_OPTIONS.turn, show: (v) => `${v}S` },
  // versão 2.13: a sala do duelo, com a trilha dela (a do Dono da Noite só para quem já o viu)
  { key: 'map', label: 'SALA E TRILHA', options: ROOM_MAPS, show: (v) => mapOf(v).label, song: (v) => mapOf(v).song },
];

/** A sala que ainda não abriu para você (a secreta, antes de ver o Dono da Noite). */
const lockedMap = (key, v, collection) => key === 'map' && !mapUnlocked(mapOf(v), collection);

/**
 * Os botões de uma linha da configuração. Versão 2.30: a sala vira ◀ SALA ▶ (com os cenários de
 * dia são sete e não cabem lado a lado); as setas pulam a sala que ainda não abriu.
 */
function choicesOf(row, value, collection) {
  if (row.key !== 'map') return row.options.map((v) => ({ key: v, v, text: lockedMap(row.key, v, collection) ? '???' : row.show(v), radio: true, locked: lockedMap(row.key, v, collection) }));
  return [
    { key: 'prev', v: stepMap(value, -1, collection), text: '◀', aria: 'Sala anterior' },
    { key: 'cur', v: value, text: row.show(value), radio: true, wide: true },
    { key: 'next', v: stepMap(value, 1, collection), text: '▶', aria: 'Próxima sala' },
  ];
}

/**
 * Versão 1.3: a configuração da mesa, antes de abrir (só quem cria escolhe; vale para os dois).
 */
function RoomSetup({ room, onChange, onOpen, onBack, nameOk }) {
  const [collection] = useState(loadCollection);
  return (
    <div className="pvp-room-card pvp-setup" role="group" aria-label="Configurar a mesa">
      <span className="pvp-field-label">CONFIGURAR A MESA</span>
      {SETUP_ROWS.map((row) => (
        <div key={row.key} className="pvp-setup-row">
          <span className="pvp-setup-label">
            {row.label}
            {row.song && <span className="ol-song"> ♪ {row.song(room[row.key])}</span>}
          </span>
          <div className="pvp-seg" role="radiogroup" aria-label={row.label}>
            {choicesOf(row, room[row.key], collection).map((c) => (
              <button
                key={c.key}
                type="button"
                role={c.radio ? 'radio' : undefined}
                aria-checked={c.radio ? room[row.key] === c.v : undefined}
                aria-label={c.aria}
                disabled={c.locked}
                className={`pvp-seg-btn ${c.radio && room[row.key] === c.v ? 'is-on' : ''} ${c.wide ? 'is-wide' : ''}`}
                onClick={() => onChange({ ...room, [row.key]: c.v })}
              >
                {c.text}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="pvp-hint">Rota: Loja → Mercado Negro → Duelo. Quem vencer o duelo é O Dono da Noite.</p>
      <button type="button" data-tone="play" className="btn-pixel pvp-btn" disabled={!nameOk} onClick={onOpen}>
        ABRIR A MESA
      </button>
      <button type="button" className="text-action pvp-setup-back" onClick={onBack}>
        VOLTAR
      </button>
    </div>
  );
}

/** O site do jogo (o mesmo GitHub Pages da política de privacidade). */
const SITE_URL = PRIVACY_URL.replace(/privacy\.html$/, '');

/**
 * Patch PvP: a entrada da mesa online, antes do Balcão de Maletas.
 *   CRIAR MESA CLANDESTINA → a configuração da mesa (moedas, corações, raridade dos talismãs,
 *   tempo por jogada) → ABRIR A MESA gera o ID ("MESA-8B2KQ"), mostra "Esperando oponente
 *   sentar à mesa..." e o COPIAR LINK/ID; SENTAR EM UMA MESA → o campo com máscara e o PUXAR CADEIRA.
 * O indicador de conexão fica no canto.
 */
export default function LobbyView({
  name,
  onName,
  snap = null,
  code = null,
  initialJoin = '',
  initialTable = '',
  saved = null,
  onCreate,
  onJoin,
  onRejoin,
  onCancel,
  onBack,
  onTap,
  onCreateTable,
  onJoinTable,
  onPractice,
}) {
  const [typed, setTyped] = useState(() => maskRoomInput(initialJoin));
  // versão 2.4: o modo online tem o duelo 1×1 e a roda de 2 a 4 (cada um com o seu código)
  const [mode, setMode] = useState(() => (initialTable ? 'roda' : 'duelo'));
  const [typedTable, setTypedTable] = useState(() => maskTableInput(initialTable));
  const [copied, setCopied] = useState(false);
  // prévia em iframe isolado (ex.: um artifact) bloqueia o WebRTC: avisa antes de tentar
  const [direct] = useState(webrtcAvailable);
  // CRIAR MESA CLANDESTINA abre a configuração; ABRIR A MESA cria de verdade
  const [setup, setSetup] = useState(false);
  const [room, setRoom] = useState(loadRoom);
  // versão 2.13: a sala secreta (do Dono da Noite) só aparece para quem já sentou com ele
  const [collection] = useState(loadCollection);
  const landscape = useLandscape();
  const busy = Boolean(snap);
  const hosting = snap?.role === 'host';
  const error = snap?.error ? (ERRORS[snap.error] ?? ERRORS.network) : null;
  const nameOk = name.trim().length > 0;
  const joinOk = typed.length === ROOM_LENGTH && nameOk;
  const joinTableOk = typedTable.length === ROOM_LENGTH && nameOk;
  const roda = mode === 'roda' && !busy;
  const link = code ? roomLink(code) : null;

  const copy = async () => {
    onTap?.();
    const text = link ? `Bora jogar Buxaria! Mesa ${formatRoomId(code)} · ${link}` : formatRoomId(code);
    setCopied(await copyText(text));
  };

  if (landscape) {
    const codeInput = (prefix, value, onChange, ok, go, label) => (
      <label className="ol-code">
        <span className="ol-code-prefix" aria-hidden="true">
          {prefix}
        </span>
        <input
          className="ol-code-input"
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="_____"
          maxLength={ROOM_LENGTH + prefix.length}
          aria-label={label}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ok) go();
          }}
        />
      </label>
    );
    return (
      <main className="pvp-lobby-land" role="main" aria-label="Mesa online">
        <LandStage paint={() => paintStreetBack()} cacheKey="land-calcada" pad={STREET_PAD} bleed="#07080c" label="Mesa online" role="presentation">
          <span className="bl-rain" aria-hidden="true" />
          {snap && (
            <span className="ol-net">
              <NetBadge link={snap.link} ping={snap.ping} />
            </span>
          )}

          {/* a coluna da esquerda: quem é você e que mesa quer */}
          <h1 className="ol-title">
            MESA ONLINE
            <span>
              {roda
                ? 'De 2 a 5 na mesma mesa: quem zerar os corações sai e o último vivo leva. Bots completam as cadeiras vazias.'
                : 'Um contra um, de verdade: cada um passa na loja e no Mercado Negro e os dois se enfrentam no duelo.'}
            </span>
          </h1>
          {!busy && !setup && (
            <div className="ol-modes" role="radiogroup" aria-label="Tipo de mesa">
              {[
                ['duelo', 'DUELO 1×1', 2],
                ['roda', 'RODA 2 A 5', 5],
              ].map(([id, label, pips]) => (
                <DominoKey
                  key={id}
                  role="radio"
                  aria-checked={mode === id}
                  label={label}
                  pips={pips}
                  tone={mode === id ? 'ivory' : 'ebony'}
                  w={170}
                  h={46}
                  className="ol-mode"
                  onClick={() => {
                    onTap?.();
                    setMode(id);
                  }}
                />
              ))}
            </div>
          )}
          <label className="ol-name">
            <span className="ol-label">SEU APELIDO NA MESA</span>
            <input
              className="ol-name-input"
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
          {!busy && !direct && !roda && (
            <div className="ol-warn" role="alert">
              <span className="ol-label">A MESA ONLINE NÃO ABRE AQUI</span>
              <p>Esta página não deixa fazer conexão direta entre aparelhos (WebRTC). Jogue pelo site ou pelo app:</p>
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
                {SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}
              </a>
            </div>
          )}
          {error && (
            <p className="ol-error" role="alert">
              {error}
            </p>
          )}
          {setup && !busy ? null : busy ? (
            <DominoKey label={error ? 'TENTAR DE NOVO' : 'CANCELAR'} pips={0} w={190} h={46} className="ol-back" onClick={onCancel} />
          ) : (
            <DominoKey label="VOLTAR" pips={1} w={156} h={46} className="ol-back" onClick={onBack} />
          )}

          {/* o cavalete na frente do bar: abrir, o código e entrar */}
          <section className="ol-board" aria-label="Mesas da noite">
            <p className="ol-board-head">MESAS DA NOITE</p>
            {!busy && !nameOk && <p className="ol-hint">Escreva o seu apelido para abrir ou entrar numa mesa.</p>}
            {roda && (
              <>
                {direct ? (
                  <>
                    <DominoKey
                      label="ABRIR UMA RODA"
                      note="As regras você escolhe no saguão"
                      pips={6}
                      tone="ivory"
                      w={330}
                      h={58}
                      className="is-main"
                      disabled={!nameOk}
                      onClick={() => {
                        onTap?.();
                        onCreateTable();
                      }}
                    />
                    <p className="ol-or">ou entre numa roda</p>
                    {codeInput(TABLE_PREFIX, typedTable, (v) => setTypedTable(maskTableInput(v)), joinTableOk, () => onJoinTable(typedTable), 'Digite o código da roda')}
                    <DominoKey label="PUXAR CADEIRA" pips={3} w={330} h={46} disabled={!joinTableOk} onClick={() => onJoinTable(typedTable)} />
                  </>
                ) : (
                  <p className="ol-hint">Esta página não deixa fazer conexão direta entre aparelhos (WebRTC): a roda online abre no site ou no app. Aqui dá para treinar com bots.</p>
                )}
                <button
                  type="button"
                  className="ol-text-btn"
                  onClick={() => {
                    onTap?.();
                    onPractice();
                  }}
                >
                  TREINAR COM BOTS (SEM INTERNET)
                </button>
              </>
            )}

            {!busy && direct && setup && (
              <div className="ol-setup" role="group" aria-label="Configurar a mesa">
                {SETUP_ROWS.map((row) => (
                  <div key={row.key} className="ol-setup-row">
                    <span className="ol-label">
                      {row.label}
                      {row.song && <span className="ol-song"> ♪ {row.song(room[row.key])}</span>}
                    </span>
                    <div className="ol-seg" role="radiogroup" aria-label={row.label}>
                      {choicesOf(row, room[row.key], collection).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          role={c.radio ? 'radio' : undefined}
                          aria-checked={c.radio ? room[row.key] === c.v : undefined}
                          aria-label={c.aria}
                          disabled={c.locked}
                          className={`ol-seg-btn ${c.radio && room[row.key] === c.v ? 'is-on' : ''} ${c.wide ? 'is-wide' : ''}`}
                          onClick={() => {
                            onTap?.();
                            setRoom({ ...room, [row.key]: c.v });
                          }}
                        >
                          {c.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="ol-setup-go">
                  <button
                    type="button"
                    className="ol-text-btn"
                    onClick={() => {
                      onTap?.();
                      setSetup(false);
                    }}
                  >
                    ◂ VOLTAR
                  </button>
                  <DominoKey
                    label="ABRIR A MESA"
                    pips={6}
                    tone="ivory"
                    w={220}
                    h={50}
                    className="is-main"
                    disabled={!nameOk}
                    onClick={() => {
                      saveRoom(room);
                      setSetup(false);
                      onCreate(room);
                    }}
                  />
                </div>
              </div>
            )}

            {!busy && direct && !setup && !roda && (
              <>
                {saved && (
                  <DominoKey
                    label={`VOLTAR PARA A ${formatRoomId(saved.code)}`}
                    note={saved.oppName ? `A partida com ${saved.oppName} continua` : 'A mesa continua'}
                    pips={5}
                    w={330}
                    h={54}
                    onClick={onRejoin}
                  />
                )}
                <DominoKey
                  label="CRIAR MESA"
                  note="Você escolhe as regras e chama alguém"
                  pips={6}
                  tone="ivory"
                  w={330}
                  h={58}
                  className="is-main"
                  disabled={!nameOk}
                  onClick={() => {
                    onTap?.();
                    setSetup(true);
                  }}
                />
                <p className="ol-or">ou sente numa mesa</p>
                {codeInput(ROOM_PREFIX, typed, (v) => setTyped(maskRoomInput(v)), joinOk, () => onJoin(typed), 'Digite o ID da sala')}
                <DominoKey label="PUXAR CADEIRA" pips={3} w={330} h={46} disabled={!joinOk} onClick={() => onJoin(typed)} />
              </>
            )}

            {busy && hosting && (
              <div className="ol-host" role="group" aria-label="Sua mesa">
                <span className="ol-label">O ID DA SUA MESA</span>
                <p className="ol-room-id">{formatRoomId(code)}</p>
                <p className="ol-status">
                  {snap.link === 'connecting' ? 'Abrindo a mesa' : 'Esperando oponente sentar à mesa'}
                  <span className="thinking-dots" aria-hidden="true" />
                </p>
                {snap.room && <p className="ol-rules">{describeRoom(snap.room)}</p>}
                <DominoKey label={copied ? 'COPIADO!' : 'COPIAR LINK/ID'} pips={4} tone="ivory" w={330} h={50} className="is-main" onClick={copy} />
                <p className="ol-hint">Mande o ID para quem vai jogar. Ele toca em PUXAR CADEIRA e digita.</p>
              </div>
            )}

            {busy && !hosting && (
              <div className="ol-host" role="group" aria-label="Entrando na mesa">
                <span className="ol-label">ENTRANDO NA MESA</span>
                <p className="ol-room-id">{formatRoomId(code)}</p>
                {!error && (
                  <p className="ol-status">
                    Puxando a cadeira
                    <span className="thinking-dots" aria-hidden="true" />
                  </p>
                )}
              </div>
            )}
          </section>
        </LandStage>
      </main>
    );
  }

  return (
    <main className="pvp-lobby fixed inset-0 z-[55] flex flex-col items-center px-5 text-center" role="main" aria-label="Mesa online">
      <LampRig part="light" lamp={56} cord={22} beamWidth={360} className="z-[1]" />
      <LampRig part="body" lamp={56} cord={22} beamWidth={360} className="z-[2]" />
      {/* antes de abrir ou puxar uma mesa não há conexão nenhuma: o indicador só aparece depois */}
      {snap && <NetBadge link={snap.link} ping={snap.ping} />}
      <div className="pvp-lobby-inner relative z-[3] flex w-full max-w-[360px] flex-1 flex-col">
        <h1 className="pvp-title">
          MESA ONLINE
          <span>
            {roda
              ? 'De 2 a 5 na mesma mesa: quem zerar os corações sai e o último vivo leva. Bots completam as cadeiras vazias.'
              : 'Um contra um, de verdade: cada um passa na loja e no Mercado Negro e os dois se enfrentam no duelo.'}
          </span>
        </h1>

        {!busy && !setup && (
          <div className="pvp-seg pvp-mode" role="radiogroup" aria-label="Tipo de mesa">
            {[
              ['duelo', 'DUELO 1×1'],
              ['roda', 'RODA DE 2 A 5'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                className={`pvp-seg-btn ${mode === id ? 'is-on' : ''}`}
                onClick={() => {
                  onTap?.();
                  setMode(id);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

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

        {!busy && !direct && !roda && (
          <div className="pvp-room-card" role="alert">
            <span className="pvp-field-label">A MESA ONLINE NÃO ABRE AQUI</span>
            <p className="pvp-hint">Esta página não deixa fazer conexão direta entre aparelhos (WebRTC), então a mesa online não abre nela. Jogue pelo site ou pelo app do Buxaria:</p>
            <a className="pvp-site-link" href={SITE_URL} target="_blank" rel="noopener noreferrer">
              {SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}
            </a>
          </div>
        )}

        {roda && (
          <>
            {direct ? (
              <>
                <button
                  type="button"
                  data-tone="play"
                  className="btn-pixel pvp-btn"
                  disabled={!nameOk}
                  onClick={() => {
                    onTap?.();
                    onCreateTable();
                  }}
                >
                  ABRIR UMA RODA
                  <span className="pvp-btn-note">As regras você escolhe no saguão</span>
                </button>
                <p className="pvp-or" aria-hidden="true">
                  ou
                </p>
                <div className="pvp-join">
                  <span className="pvp-field-label">ENTRAR NUMA RODA</span>
                  <label className="pvp-room-input">
                    <span className="pvp-room-prefix" aria-hidden="true">
                      {TABLE_PREFIX}
                    </span>
                    <input
                      className="pvp-input pvp-input-room"
                      type="text"
                      inputMode="text"
                      value={typedTable}
                      onChange={(e) => setTypedTable(maskTableInput(e.target.value))}
                      placeholder="_____"
                      maxLength={ROOM_LENGTH + TABLE_PREFIX.length}
                      aria-label="Digite o código da roda"
                      autoCapitalize="characters"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && joinTableOk) onJoinTable(typedTable);
                      }}
                    />
                  </label>
                  <button type="button" className="btn-pixel pvp-btn" disabled={!joinTableOk} onClick={() => onJoinTable(typedTable)}>
                    PUXAR CADEIRA (CONECTAR)
                  </button>
                </div>
              </>
            ) : (
              <p className="pvp-hint">Esta página não deixa fazer conexão direta entre aparelhos (WebRTC): a roda online abre no site ou no app. Aqui dá para treinar com bots.</p>
            )}
            <button
              type="button"
              className="text-action pvp-practice"
              onClick={() => {
                onTap?.();
                onPractice();
              }}
            >
              TREINAR COM BOTS (SEM INTERNET)
            </button>
          </>
        )}

        {!busy && direct && setup && (
          <RoomSetup
            room={room}
            nameOk={nameOk}
            onChange={(next) => {
              onTap?.();
              setRoom(next);
            }}
            onOpen={() => {
              saveRoom(room);
              setSetup(false);
              onCreate(room);
            }}
            onBack={() => {
              onTap?.();
              setSetup(false);
            }}
          />
        )}

        {!busy && direct && !setup && !roda && (
          <>
            {saved && (
              <button type="button" data-tone="brass" className="btn-pixel pvp-btn" onClick={onRejoin}>
                VOLTAR PARA A {formatRoomId(saved.code)}
                <span className="pvp-btn-note">{saved.oppName ? `A partida com ${saved.oppName} continua` : 'A mesa continua'}</span>
              </button>
            )}
            <button
              type="button"
              data-tone="play"
              className="btn-pixel pvp-btn"
              disabled={!nameOk}
              onClick={() => {
                onTap?.();
                setSetup(true);
              }}
            >
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
            {snap.room && <p className="pvp-room-rules">{describeRoom(snap.room)}</p>}
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
          {setup && !busy ? null : busy ? (
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
