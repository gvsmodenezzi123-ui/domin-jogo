import { ONLINE_TILE_NAMES } from '../engine/progress.js';
import { useState } from 'react';
import RivalAvatar from '../components/RivalAvatar.jsx';
import { mapOf, stepMap } from '../data/tableMaps.js';
import { loadCollection } from '../engine/progress.js';
import { TentoCap } from '../components/TentoCap.jsx';
import { useFitScale } from '../components/useFitScale.js';
import LandStage from '../components/LandStage.jsx';
import { useLandscape } from '../components/useLandscape.js';
import { ROOM_PAD, paintBackRoom } from '../components/art/landRoom.js';
import { SEAT_COLORS, plateName } from './seats.js';

/** Onde cada cadeira senta em volta da mesa vista de cima (a sua sempre embaixo), na ordem da vez. */
const SPOTS = Object.freeze({
  2: ['bottom', 'top'],
  3: ['bottom', 'right', 'left'],
  4: ['bottom', 'right', 'top', 'left'],
  // versão 2.33: com 5, dois sentam do lado de lá
  5: ['bottom', 'right', 'topR', 'topL', 'left'],
});

const seatIndex = (id) => Number(String(id).slice(1)) || 0;
/** Versão 2.7: nas duplas, a cadeira de número par é da dupla A e a ímpar da B (de frente). */
const teamOfIndex = (index) => (index % 2 ? 'B' : 'A');

export function LobbyChip({ on, onClick, children, label, disabled = false }) {
  return (
    <button type="button" className={`lobby-chip font-pixel ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/**
 * Versão 2.4: o saguão da mesa de 2 a 4. A mesa de feltro vista de cima com as cadeiras em
 * volta (você embaixo; a vez gira no sentido anti-horário, como no boteco), cada uma com o
 * rosto, o nome e o PRONTO. Serve para a mesa com bots e para a online: quem chama monta as
 * regras (`options`) e os botões (`footer`).
 *
 *   slots: as cadeiras pela ordem da mesa (null = vazia)  ·  you: a sua cadeira
 *   onFace(±1): troca o seu rosto  ·  onAddBot(posição) / onRemoveBot(id): só o anfitrião
 *   Versão 2.13: onMove(posição): sentar na cadeira vazia, trocar com o bot, ou pedir a troca
 *   a quem está nela; swaps: os pedidos ({ from, to }); onAnswer(from, sim?): responder.
 */
export default function TableLobby({
  title,
  code = null,
  onCopy = null,
  copied = false,
  slots,
  you,
  onFace = null,
  tiles = 'bone',
  onTiles = null,
  onAddBot = null,
  onRemoveBot = null,
  options = null,
  footer = null,
  note = null,
  teams = false,
  onMove = null,
  swaps = [],
  onAnswer = null,
}) {
  const [fitOuter, fitInner, fitStyle] = useFitScale();
  const landscape = useLandscape();
  const count = slots.length;
  const at = Math.max(0, slots.findIndex((s, i) => (s ? s.id === you : `s${i}` === you)));
  const order = [...slots.slice(at), ...slots.slice(0, at)].map((s, k) => ({ seat: s, index: (at + k) % count }));
  const nameOf = (id) => slots.find((s) => s?.id === id)?.name ?? '';
  // quem pediu para trocar de lugar com você (o primeiro pedido aparece no feltro)
  const asked = swaps.find((r) => r.to === you && slots.some((s) => s?.id === r.from));
  const mineAsked = new Set(swaps.filter((r) => r.from === you).map((r) => r.to));
  const spots = SPOTS[count] ?? SPOTS[4];
  const head = (
    <h1 id="lobby-title" className="lobby-sign font-pixel">
      {title}
      {code && <span className="lobby-code">{code}</span>}
    </h1>
  );
  const copyBtn = onCopy && (
    <button type="button" className="lobby-copy font-pixel" onClick={onCopy}>
      {copied ? 'COPIADO!' : 'COPIAR LINK/CÓDIGO'}
    </button>
  );
  const table = (
    <>
      {/* a mesa vista de cima, com as cadeiras em volta */}
      <section className={`lobby-table lobby-n${count} ${teams ? 'is-teams' : ''}`} aria-label="Cadeiras da mesa">
        <span className="lobby-felt" aria-hidden={!asked}>
          <span className="lobby-turn" aria-hidden="true" />
          {/* versão 2.7: nas duplas, quem senta de frente joga junto */}
          {teams && !asked && <span className="lobby-duo font-pixel">DUPLAS</span>}
          {/* versão 2.13: alguém pediu para trocar de lugar com você */}
          {asked && onAnswer && (
            <span className="lobby-ask" role="alertdialog" aria-label={`${nameOf(asked.from)} quer trocar de lugar com você`}>
              <span className="lobby-ask-text font-pixel">{plateName(nameOf(asked.from))} QUER TROCAR DE LUGAR</span>
              <span className="lobby-ask-keys">
                <button type="button" className="lobby-mini is-yes font-pixel" onClick={() => onAnswer(asked.from, true)}>
                  TROCAR
                </button>
                <button type="button" className="lobby-mini font-pixel" onClick={() => onAnswer(asked.from, false)}>
                  NÃO
                </button>
              </span>
            </span>
          )}
        </span>
        {['bottom', 'right', 'top', 'topR', 'topL', 'left'].map((spot) => {
          const k = spots.indexOf(spot);
          if (k < 0) return null;
          const { seat, index } = order[k];
          // a cor é de quem senta (a mesma na partida); a cadeira vazia usa a da posição
          const color = SEAT_COLORS[(seat ? seatIndex(seat.id) : index) % SEAT_COLORS.length];
          const team = teams ? teamOfIndex(index) : null;
          const teamTag = team && (
            <span className={`lobby-team font-pixel is-${team}`} aria-label={`dupla ${team}`}>
              {team}
            </span>
          );
          if (!seat) {
            return (
              <div key={spot} className={`lobby-seat at-${spot} is-empty`} aria-label={team ? `Cadeira vazia da dupla ${team}` : 'Cadeira vazia'} style={{ '--seat': color }}>
                {onMove ? (
                  <button type="button" className="lobby-chair is-free" aria-label={team ? `Sentar aqui (dupla ${team})` : 'Sentar aqui'} onClick={() => onMove(index)}>
                    {teamTag}
                    <span className="lobby-sit font-pixel" aria-hidden="true">
                      SENTAR
                    </span>
                  </button>
                ) : (
                  <span className="lobby-chair" aria-hidden="true">
                    {teamTag}
                  </span>
                )}
                <span className="lobby-seat-name font-pixel">VAZIA</span>
                {onAddBot && (
                  <button type="button" className="lobby-mini font-pixel" onClick={() => onAddBot(index)}>
                    + BOT
                  </button>
                )}
              </div>
            );
          }
          const mine = seat.id === you;
          const waiting = mineAsked.has(seat.id);
          // trocar com bot é na hora; com gente, vira pedido (tocar de novo cancela)
          const swap = !mine && onMove && !seat.lost && (
            <button
              type="button"
              className={`lobby-swap font-pixel ${waiting ? 'is-waiting' : ''}`}
              aria-pressed={waiting}
              aria-label={waiting ? `Cancelar o pedido de troca com ${seat.name}` : seat.bot ? `Trocar de lugar com ${seat.name}` : `Pedir para trocar de lugar com ${seat.name}`}
              onClick={() => onMove(index)}
            >
              {waiting ? '…' : '⇄'}
            </button>
          );
          return (
            <div key={spot} className={`lobby-seat at-${spot} ${mine ? 'is-me' : ''} ${seat.lost ? 'is-lost' : ''}`} style={{ '--seat': color }}>
              <span className="lobby-photo avatar-frame">
                <RivalAvatar rival={{ art: seat.face ?? 'tioZe', name: seat.name }} size={44} smoke={false} />
                <span className="lobby-order font-pixel" aria-label={`joga em ${seatIndex(seat.id) + 1}º`}>
                  {index + 1}
                </span>
                {seat.bot && <span className="seat-tag">BOT</span>}
                {teamTag}
                {swap}
              </span>
              <span className="lobby-seat-name font-pixel">{mine ? 'VOCÊ' : plateName(seat.name)}</span>
              {mine && onFace ? (
                <span className="lobby-face-pick">
                  <button type="button" className="lobby-arrow" aria-label="Rosto anterior" onClick={() => onFace(-1)}>
                    ◀
                  </button>
                  <span className="font-pixel">ROSTO</span>
                  <button type="button" className="lobby-arrow" aria-label="Próximo rosto" onClick={() => onFace(1)}>
                    ▶
                  </button>
                  {/* versão 2.23: as suas pedras (só enfeite, cada um vê as suas) */}
                  {onTiles && (
                    <button type="button" className={`lobby-tiles is-${tiles}`} aria-label={`Pedras: ${ONLINE_TILE_NAMES[tiles]}. Tocar para trocar`} onClick={() => onTiles(1)}>
                      <span className="lobby-tiles-chip" aria-hidden="true" />
                      <span className="font-pixel">{ONLINE_TILE_NAMES[tiles]}</span>
                    </button>
                  )}
                </span>
              ) : seat.bot && onRemoveBot ? (
                <button type="button" className="lobby-mini font-pixel" onClick={() => onRemoveBot(seat.id)}>
                  TIRAR
                </button>
              ) : waiting ? (
                <span className="lobby-ready font-pixel is-wait">PEDIDO DE TROCA</span>
              ) : (
                <span className={`lobby-ready font-pixel ${seat.ready ? '' : 'is-wait'}`}>{seat.lost ? 'CAIU' : seat.host ? 'ANFITRIÃO' : seat.ready ? 'PRONTO' : 'ESPERANDO'}</span>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
  const opts = options && (
    <section className="lobby-opts" aria-label="Regras da mesa">
      {options}
    </section>
  );
  const noteEl = note && <p className="lobby-note font-term">{note}</p>;
  const foot = footer && <div className="lobby-foot">{footer}</div>;

  // versão 2.11, deitado: o salão dos fundos visto de cima (a mesa e as cadeiras à esquerda, a
  // folha das regras na mesinha à direita)
  if (landscape) {
    return (
      <div className="table-lobby-land" role="main" aria-labelledby="lobby-title">
        <LandStage paint={() => paintBackRoom()} cacheKey="land-salao-fundos" pad={ROOM_PAD} bleed="#0a0705" label={title} role="presentation">
          <div className="tll-head">
            {head}
            {copyBtn}
          </div>
          {table}
          <div className="tll-sheet">
            <p className="tll-sheet-head">REGRAS DA CASA</p>
            {opts}
            {noteEl}
          </div>
          {foot}
        </LandStage>
      </div>
    );
  }

  return (
    <div className="table-lobby app-shell fixed inset-0 flex flex-col" role="main" aria-labelledby="lobby-title">
      <div ref={fitOuter} className="lobby-fit">
        <div ref={fitInner} className="scene-fit" style={fitStyle}>
          <header className="lobby-head">{head}</header>
          {copyBtn}
          {table}
          {opts}
          {noteEl}
          {foot}
        </div>
      </div>
    </div>
  );
}

const BATIDA_LABEL = { todos: 'TODOS', pesada: 'A MÃO + PESADA' };

/**
 * As regras da mesa, em botões: cadeiras, o modo (cada um ou duplas, só com 4), a contagem
 * (corações ou tentos), quem a batida fere, os corações (ou a meta de tentos) e o tempo por
 * jogada. Sem `onChange`, só mostram o que o anfitrião escolheu. `minSeats`: não deixa encolher
 * a mesa para menos cadeiras do que as já ocupadas. `turn: false` esconde o tempo (com bots).
 * Versão 2.7: "a batida fere" só aparece quando vale (corações, cada um por si).
 */
export function TableRules({ config, onChange = null, minSeats = 2, turn = true }) {
  const set = (key, value) => onChange?.({ ...config, [key]: value });
  // versão 2.13: a sala (com a trilha dela); a do Dono da Noite só para quem já sentou com ele
  const [collection] = useState(loadCollection);
  const sala = mapOf(config.map);
  const ro = !onChange;
  const tentos = config.scoring === 'tentos';
  const teams = config.seats === 4 && Boolean(config.teams);
  return (
    <>
      <div className="lobby-opt">
        <span className="lobby-opt-label font-pixel">CADEIRAS</span>
        <span className="lobby-chips">
          {[2, 3, 4, 5].map((n) => (
            <LobbyChip key={n} on={config.seats === n} disabled={ro || n < minSeats} onClick={() => set('seats', n)} label={`${n} cadeiras`}>
              {n}
            </LobbyChip>
          ))}
        </span>
      </div>
      {config.seats === 4 && (
        <div className="lobby-opt">
          <span className="lobby-opt-label font-pixel">MODO</span>
          <span className="lobby-chips">
            <LobbyChip on={!teams} disabled={ro} onClick={() => set('teams', false)} label="Cada um por si">
              CADA UM
            </LobbyChip>
            <LobbyChip on={teams} disabled={ro} onClick={() => set('teams', true)} label="Duplas: quem senta de frente joga junto">
              DUPLAS
            </LobbyChip>
          </span>
        </div>
      )}
      <div className="lobby-opt">
        <span className="lobby-opt-label font-pixel">CONTAGEM</span>
        <span className="lobby-chips">
          <LobbyChip on={!tentos} disabled={ro} onClick={() => set('scoring', 'coracoes')} label="Por corações: perde quem zerar">
            ♥ CORAÇÕES
          </LobbyChip>
          <LobbyChip on={tentos} disabled={ro} onClick={() => set('scoring', 'tentos')} label="Por tentos: vence quem fizer a meta">
            <TentoCap size={11} /> TENTOS
          </LobbyChip>
        </span>
      </div>
      {!tentos && !teams && (
        <div className="lobby-opt">
          <span className="lobby-opt-label font-pixel">A BATIDA FERE</span>
          <span className="lobby-chips">
            {['todos', 'pesada'].map((b) => (
              <LobbyChip key={b} on={config.batida === b} disabled={ro} onClick={() => set('batida', b)}>
                {BATIDA_LABEL[b]}
              </LobbyChip>
            ))}
          </span>
        </div>
      )}
      <div className="lobby-opt">
        <span className="lobby-opt-label font-pixel">{tentos ? 'TENTOS P/ VENCER' : 'CORAÇÕES'}</span>
        <span className="lobby-chips">
          {[3, 5, 7].map((n) => (
            <LobbyChip key={n} on={config.hearts === n} disabled={ro} onClick={() => set('hearts', n)} label={tentos ? `vence quem fizer ${n} tentos` : `${n} corações`}>
              {tentos ? (
                <>
                  {n}
                  <TentoCap size={11} />
                </>
              ) : (
                `${n}♥`
              )}
            </LobbyChip>
          ))}
        </span>
      </div>
      <div className="lobby-opt is-sala">
        <span className="lobby-opt-label font-pixel">
          SALA
          <span className="lobby-song">♪ {sala.song}</span>
        </span>
        {/* versão 2.30: são sete salas com os cenários de dia: ◀ SALA ▶ (pula a que não abriu) */}
        <span className="lobby-chips lobby-step">
          <LobbyChip on={false} disabled={ro} onClick={() => set('map', stepMap(sala.id, -1, collection))} label="Sala anterior">
            ◀
          </LobbyChip>
          <LobbyChip on disabled={ro} onClick={() => set('map', stepMap(sala.id, 1, collection))} label={`${sala.name}: ${sala.song}`}>
            {sala.label}
          </LobbyChip>
          <LobbyChip on={false} disabled={ro} onClick={() => set('map', stepMap(sala.id, 1, collection))} label="Próxima sala">
            ▶
          </LobbyChip>
        </span>
      </div>
      {turn && (
        <div className="lobby-opt">
          <span className="lobby-opt-label font-pixel">TEMPO</span>
          <span className="lobby-chips">
            {[15, 30, 45, 60].map((n) => (
              <LobbyChip key={n} on={config.turn === n} disabled={ro} onClick={() => set('turn', n)} label={`${n} segundos por jogada`}>
                {n}S
              </LobbyChip>
            ))}
          </span>
        </div>
      )}
    </>
  );
}
