import RivalAvatar from '../components/RivalAvatar.jsx';
import { useFitScale } from '../components/useFitScale.js';
import { sound } from '../engine/audioSynth.js';
import { MAX_SEATS } from './tableEngine.js';
import { SEAT_COLORS, TABLE_FACES, plateName } from './seats.js';

/** Onde cada cadeira senta em volta da mesa vista de cima, pela quantidade de jogadores. */
const SPOTS = Object.freeze({
  2: ['bottom', 'top'],
  3: ['bottom', 'right', 'left'],
  4: ['bottom', 'right', 'top', 'left'],
});

function Chip({ on, onClick, children, label }) {
  return (
    <button type="button" className={`lobby-chip font-pixel ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * Versão 2.4: o saguão da mesa de 2 a 4. A mesa de feltro vista de cima com as cadeiras em
 * volta (você embaixo; a vez gira no sentido anti-horário, como no boteco), cada uma com o
 * rosto, o nome e o PRONTO. Embaixo, o que o anfitrião escolhe: cadeiras, regra da batida e
 * corações. Na prévia as outras cadeiras são bots; no online elas enchem com quem entra.
 */
export default function TableLobby({ count, setCount, myFace, setMyFace, bots, rule, setRule, hearts, setHearts, onStart, code = 'PRÉVIA' }) {
  const [fitOuter, fitInner, fitStyle] = useFitScale();
  const spots = SPOTS[count];
  const people = [{ id: 's0', name: 'Você', face: myFace, me: true }, ...bots.slice(0, count - 1)];
  const cycleFace = (dir) => {
    sound.playClick();
    const at = TABLE_FACES.indexOf(myFace);
    setMyFace(TABLE_FACES[(at + dir + TABLE_FACES.length) % TABLE_FACES.length]);
  };
  const pick = (fn, value) => {
    sound.playClick();
    fn(value);
  };
  return (
    <div className="table-lobby app-shell fixed inset-0 flex flex-col" role="main" aria-labelledby="lobby-title">
      <div ref={fitOuter} className="lobby-fit">
        <div ref={fitInner} className="scene-fit" style={fitStyle}>
          <header className="lobby-head">
            <h1 id="lobby-title" className="lobby-sign font-pixel">
              MESA DE {count}
              <span className="lobby-code">CÓDIGO {code}</span>
            </h1>
          </header>

          {/* a mesa vista de cima, com as cadeiras em volta */}
          <section className={`lobby-table lobby-n${count}`} aria-label="Cadeiras da mesa">
            <span className="lobby-felt" aria-hidden="true">
              <span className="lobby-turn" aria-hidden="true" />
            </span>
            {Array.from({ length: MAX_SEATS }, (_, i) => {
              const spot = SPOTS[4][i];
              const at = spots.indexOf(spot);
              const person = at >= 0 ? people[at] : null;
              if (!person) {
                return (
                  <div key={spot} className={`lobby-seat at-${spot} is-empty`} aria-label="Cadeira vazia">
                    <span className="lobby-chair" aria-hidden="true" />
                    <span className="lobby-seat-name font-pixel">VAZIA</span>
                  </div>
                );
              }
              return (
                <div key={spot} className={`lobby-seat at-${spot} ${person.me ? 'is-me' : ''}`} style={{ '--seat': SEAT_COLORS[at] }}>
                  <span className="lobby-photo avatar-frame">
                    <RivalAvatar rival={{ art: person.face, name: person.name }} size={44} smoke={false} />
                    <span className="lobby-order font-pixel" aria-label={`joga em ${at + 1}º`}>
                      {at + 1}
                    </span>
                  </span>
                  <span className="lobby-seat-name font-pixel">{person.me ? 'VOCÊ' : plateName(person.name)}</span>
                  {person.me ? (
                    <span className="lobby-face-pick">
                      <button type="button" className="lobby-arrow" aria-label="Rosto anterior" onClick={() => cycleFace(-1)}>
                        ◀
                      </button>
                      <span className="font-pixel">ROSTO</span>
                      <button type="button" className="lobby-arrow" aria-label="Próximo rosto" onClick={() => cycleFace(1)}>
                        ▶
                      </button>
                    </span>
                  ) : (
                    <span className="lobby-ready font-pixel">PRONTO</span>
                  )}
                </div>
              );
            })}
          </section>

          <section className="lobby-opts" aria-label="Regras da mesa">
            <div className="lobby-opt">
              <span className="lobby-opt-label font-pixel">CADEIRAS</span>
              <span className="lobby-chips">
                {[2, 3, 4].map((n) => (
                  <Chip key={n} on={count === n} onClick={() => pick(setCount, n)} label={`${n} cadeiras`}>
                    {n}
                  </Chip>
                ))}
              </span>
            </div>
            <div className="lobby-opt">
              <span className="lobby-opt-label font-pixel">A BATIDA FERE</span>
              <span className="lobby-chips">
                <Chip on={rule === 'todos'} onClick={() => pick(setRule, 'todos')}>
                  TODOS
                </Chip>
                <Chip on={rule === 'pesada'} onClick={() => pick(setRule, 'pesada')}>
                  A MÃO + PESADA
                </Chip>
              </span>
            </div>
            <div className="lobby-opt">
              <span className="lobby-opt-label font-pixel">CORAÇÕES</span>
              <span className="lobby-chips">
                {[3, 5, 7].map((n) => (
                  <Chip key={n} on={hearts === n} onClick={() => pick(setHearts, n)} label={`${n} corações`}>
                    {n}♥
                  </Chip>
                ))}
              </span>
            </div>
            <p className="lobby-note font-term">
              Mão de {count === 4 ? 6 : 7} pedras · dorme de {count === 4 ? 4 : count === 3 ? 7 : 14}. A vez gira no sentido anti-horário.
            </p>
          </section>

          <button type="button" data-tone="play" className="btn-pixel lobby-start w-full" onClick={onStart}>
            SENTAR E JOGAR
          </button>
        </div>
      </div>
    </div>
  );
}
