import RivalAvatar from '../components/RivalAvatar.jsx';
import { useFitScale } from '../components/useFitScale.js';
import { SEAT_COLORS, plateName } from './seats.js';

/** Onde cada cadeira senta em volta da mesa vista de cima (a sua sempre embaixo), na ordem da vez. */
const SPOTS = Object.freeze({
  2: ['bottom', 'top'],
  3: ['bottom', 'right', 'left'],
  4: ['bottom', 'right', 'top', 'left'],
});

const seatIndex = (id) => Number(String(id).slice(1)) || 0;

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
 *   onFace(±1): troca o seu rosto  ·  onAddBot / onRemoveBot(id): só o anfitrião
 */
export default function TableLobby({ title, code = null, onCopy = null, copied = false, slots, you, onFace = null, onAddBot = null, onRemoveBot = null, options = null, footer = null, note = null }) {
  const [fitOuter, fitInner, fitStyle] = useFitScale();
  const count = slots.length;
  const at = Math.max(0, slots.findIndex((s, i) => (s ? s.id === you : `s${i}` === you)));
  const order = [...slots.slice(at), ...slots.slice(0, at)].map((s, k) => ({ seat: s, index: (at + k) % count }));
  const spots = SPOTS[count] ?? SPOTS[4];
  return (
    <div className="table-lobby app-shell fixed inset-0 flex flex-col" role="main" aria-labelledby="lobby-title">
      <div ref={fitOuter} className="lobby-fit">
        <div ref={fitInner} className="scene-fit" style={fitStyle}>
          <header className="lobby-head">
            <h1 id="lobby-title" className="lobby-sign font-pixel">
              {title}
              {code && <span className="lobby-code">{code}</span>}
            </h1>
          </header>
          {onCopy && (
            <button type="button" className="lobby-copy font-pixel" onClick={onCopy}>
              {copied ? 'COPIADO!' : 'COPIAR LINK/CÓDIGO'}
            </button>
          )}

          {/* a mesa vista de cima, com as cadeiras em volta */}
          <section className={`lobby-table lobby-n${count}`} aria-label="Cadeiras da mesa">
            <span className="lobby-felt" aria-hidden="true">
              <span className="lobby-turn" aria-hidden="true" />
            </span>
            {['bottom', 'right', 'top', 'left'].map((spot) => {
              const k = spots.indexOf(spot);
              if (k < 0) return null;
              const { seat, index } = order[k];
              const color = SEAT_COLORS[index % SEAT_COLORS.length];
              if (!seat) {
                return (
                  <div key={spot} className={`lobby-seat at-${spot} is-empty`} aria-label="Cadeira vazia" style={{ '--seat': color }}>
                    <span className="lobby-chair" aria-hidden="true" />
                    <span className="lobby-seat-name font-pixel">VAZIA</span>
                    {onAddBot && (
                      <button type="button" className="lobby-mini font-pixel" onClick={onAddBot}>
                        + BOT
                      </button>
                    )}
                  </div>
                );
              }
              const mine = seat.id === you;
              return (
                <div key={spot} className={`lobby-seat at-${spot} ${mine ? 'is-me' : ''} ${seat.lost ? 'is-lost' : ''}`} style={{ '--seat': color }}>
                  <span className="lobby-photo avatar-frame">
                    <RivalAvatar rival={{ art: seat.face ?? 'tioZe', name: seat.name }} size={44} smoke={false} />
                    <span className="lobby-order font-pixel" aria-label={`joga em ${seatIndex(seat.id) + 1}º`}>
                      {index + 1}
                    </span>
                    {seat.bot && <span className="seat-tag">BOT</span>}
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
                    </span>
                  ) : seat.bot && onRemoveBot ? (
                    <button type="button" className="lobby-mini font-pixel" onClick={() => onRemoveBot(seat.id)}>
                      TIRAR
                    </button>
                  ) : (
                    <span className={`lobby-ready font-pixel ${seat.ready ? '' : 'is-wait'}`}>{seat.lost ? 'CAIU' : seat.host ? 'ANFITRIÃO' : seat.ready ? 'PRONTO' : 'ESPERANDO'}</span>
                  )}
                </div>
              );
            })}
          </section>

          {options && (
            <section className="lobby-opts" aria-label="Regras da mesa">
              {options}
            </section>
          )}
          {note && <p className="lobby-note font-term">{note}</p>}
          {footer && <div className="lobby-foot">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

const BATIDA_LABEL = { todos: 'TODOS', pesada: 'A MÃO + PESADA' };

/**
 * As regras da mesa, em botões: cadeiras, quem a batida fere, corações e tempo por jogada.
 * Sem `onChange`, só mostram o que o anfitrião escolheu. `minSeats`: não deixa encolher a mesa
 * para menos cadeiras do que as já ocupadas. `turn: false` esconde o tempo (a mesa com bots).
 */
export function TableRules({ config, onChange = null, minSeats = 2, turn = true }) {
  const set = (key, value) => onChange?.({ ...config, [key]: value });
  const ro = !onChange;
  return (
    <>
      <div className="lobby-opt">
        <span className="lobby-opt-label font-pixel">CADEIRAS</span>
        <span className="lobby-chips">
          {[2, 3, 4].map((n) => (
            <LobbyChip key={n} on={config.seats === n} disabled={ro || n < minSeats} onClick={() => set('seats', n)} label={`${n} cadeiras`}>
              {n}
            </LobbyChip>
          ))}
        </span>
      </div>
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
      <div className="lobby-opt">
        <span className="lobby-opt-label font-pixel">CORAÇÕES</span>
        <span className="lobby-chips">
          {[3, 5, 7].map((n) => (
            <LobbyChip key={n} on={config.hearts === n} disabled={ro} onClick={() => set('hearts', n)} label={`${n} corações`}>
              {n}♥
            </LobbyChip>
          ))}
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

/** "Mão de 6 pedras · dorme de 4. A vez gira no sentido anti-horário." */
export const tableNote = (seats) => `Mão de ${seats === 4 ? 6 : 7} pedras · dorme de ${seats === 4 ? 4 : seats === 3 ? 7 : 14}. A vez gira no sentido anti-horário.`;
