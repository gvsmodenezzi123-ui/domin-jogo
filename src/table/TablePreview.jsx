import { useEffect, useMemo, useState } from 'react';
import { mapOf } from '../data/tableMaps.js';
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

function LocalTable({ seats, seed, hearts, rule, teams = false, scoring = 'coracoes', map = null, onLeave, muted, onToggleMute }) {
  const rules = useMemo(() => ({ batida: rule, teams, scoring }), [rule, teams, scoring]);
  const { view, clock, act, nextRound, rematch } = useLocalTable({ seats, seed, hearts, coins: 100, rules, turnSec: 30 });
  return (
    <TableScreen
      view={view}
      map={map}
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
export default function TablePreview({ onExit = null, muted: mutedProp, onToggleMute: toggleProp, onTrack = null }) {
  const [config, setConfig] = useState({ seats: 4, batida: 'todos', hearts: 5, turn: 30, teams: false, scoring: 'coracoes', map: 'boteco' });
  // versão 2.13: a trilha da sala escolhida (o modo online toca)
  const track = mapOf(config.map).music;
  useEffect(() => onTrack?.(track), [onTrack, track]);
  const [myFace, setMyFace] = useState(TABLE_FACES[0]);
  // versão 2.13: no treino, você escolhe a cadeira (os bots trocam de lugar com você)
  const [myPlace, setMyPlace] = useState(0);
  const [game, setGame] = useState(null);
  const [mutedLocal, setMutedLocal] = useState(() => Boolean(sound.isMuted));
  const muted = mutedProp ?? mutedLocal;

  /** As cadeiras na ordem da mesa, com você na posição escolhida. */
  const arrange = (n) => {
    const out = [...BOTS.slice(0, n - 1)];
    out.splice(Math.min(myPlace, n - 1), 0, { id: 's0', name: 'Você', face: myFace, ready: true });
    return out;
  };
  const start = () => {
    sound.init();
    sound.playClick();
    const seats = arrange(config.seats).map((s) => (s.id === 's0' ? { id: 's0', name: 'Você', face: myFace } : s));
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
    return (
      <LocalTable
        key={game.key}
        seats={game.seats}
        seed={game.seed}
        hearts={config.hearts}
        rule={config.batida}
        teams={config.seats === 4 && config.teams}
        scoring={config.scoring}
        map={config.map}
        onLeave={() => setGame(null)}
        muted={muted}
        onToggleMute={toggleMute}
      />
    );
  }
  const slots = arrange(config.seats);
  return (
    <TableLobby
      title={`MESA DE ${config.seats}${config.seats === 4 && config.teams ? ' · DUPLAS' : ''}`}
      code="TREINO COM BOTS"
      slots={slots}
      you="s0"
      onFace={face}
      onMove={(place) => {
        sound.playClick();
        setMyPlace(place);
      }}
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
      teams={config.seats === 4 && config.teams}
      note={tableNote(config.seats, config)}
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
