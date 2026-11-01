import { useMemo, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import TableLobby, { TableRules } from './TableLobby.jsx';
import TableScreen from './TableScreen.jsx';
import { TABLE_FACES, tableNote } from './seats.js';
import { useLocalTable } from './useLocalTable.js';

/** Quem senta nas cadeiras de bot da mesa local. */
const BOTS = Object.freeze([
  { id: 's1', name: 'Neide', face: 'neide', bot: true, ready: true },
  { id: 's2', name: 'Baiano', face: 'baiano', bot: true, ready: true },
  { id: 's3', name: 'Sofia', face: 'sofia', bot: true, ready: true },
]);

function LocalTable({ seats, seed, hearts, rule, onLeave, muted, onToggleMute }) {
  const rules = useMemo(() => ({ batida: rule }), [rule]);
  const { view, clock, act, nextRound, rematch } = useLocalTable({ seats, seed, hearts, coins: 100, rules, turnSec: 30 });
  return (
    <TableScreen
      view={view}
      me="s0"
      clock={clock}
      onIntent={act}
      onNextRound={nextRound}
      onRematch={rematch}
      onLeave={onLeave}
      onMenu={onLeave}
      muted={muted}
      onToggleMute={onToggleMute}
    />
  );
}

/**
 * Versão 2.4: a mesa de 2 a 4 com bots, sem internet (o TREINAR COM BOTS do modo online, e a
 * prévia do HUD). A mesa online troca os bots por pessoas.
 */
export default function TablePreview({ onExit = null, muted: mutedProp, onToggleMute: toggleProp }) {
  const [config, setConfig] = useState({ seats: 4, batida: 'todos', hearts: 5, turn: 30 });
  const [myFace, setMyFace] = useState(TABLE_FACES[0]);
  const [game, setGame] = useState(null);
  const [mutedLocal, setMutedLocal] = useState(() => Boolean(sound.isMuted));
  const muted = mutedProp ?? mutedLocal;

  const start = () => {
    sound.init();
    sound.playClick();
    const seats = [{ id: 's0', name: 'Você', face: myFace }, ...BOTS.slice(0, config.seats - 1)];
    setGame({ seats, seed: (Date.now() & 0xffffff) >>> 0, key: Date.now() });
  };
  const toggleMute = () => {
    if (toggleProp) {
      toggleProp();
      return;
    }
    sound.init();
    setMutedLocal(sound.toggleMute());
  };
  const face = (dir) => {
    sound.playClick();
    const at = TABLE_FACES.indexOf(myFace);
    setMyFace(TABLE_FACES[(at + dir + TABLE_FACES.length) % TABLE_FACES.length]);
  };

  if (game) {
    return <LocalTable key={game.key} seats={game.seats} seed={game.seed} hearts={config.hearts} rule={config.batida} onLeave={() => setGame(null)} muted={muted} onToggleMute={toggleMute} />;
  }
  const slots = [{ id: 's0', name: 'Você', face: myFace, ready: true }, ...BOTS.slice(0, config.seats - 1)];
  return (
    <TableLobby
      title={`MESA DE ${config.seats}`}
      code="TREINO COM BOTS"
      slots={slots}
      you="s0"
      onFace={face}
      options={
        <TableRules
          config={config}
          turn={false}
          onChange={(next) => {
            sound.playClick();
            setConfig(next);
          }}
        />
      }
      note={tableNote(config.seats)}
      footer={
        <>
          <button type="button" data-tone="play" className="btn-pixel lobby-start w-full" onClick={start}>
            SENTAR E JOGAR
          </button>
          {onExit && (
            <button type="button" className="text-action lobby-back" onClick={onExit}>
              VOLTAR
            </button>
          )}
        </>
      }
    />
  );
}
