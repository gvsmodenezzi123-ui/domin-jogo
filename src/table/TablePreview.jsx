import { useMemo, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import TableLobby from './TableLobby.jsx';
import TableScreen from './TableScreen.jsx';
import { useLocalTable } from './useLocalTable.js';

/** Quem senta nas cadeiras de bot da mesa local. */
const BOTS = Object.freeze([
  { id: 's1', name: 'Neide', face: 'neide', bot: true },
  { id: 's2', name: 'Baiano', face: 'baiano', bot: true },
  { id: 's3', name: 'Sofia', face: 'sofia', bot: true },
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
 * Versão 2.4: a mesa de 2 a 4 com bots, sem rede. Serve de prévia do HUD (o saguão e a mesa)
 * e é a base do treino offline; o online da fase 3 troca os bots por pessoas.
 */
export default function TablePreview() {
  const [count, setCount] = useState(4);
  const [myFace, setMyFace] = useState('marquinhos');
  const [rule, setRule] = useState('todos');
  const [hearts, setHearts] = useState(5);
  const [game, setGame] = useState(null);
  const [muted, setMuted] = useState(() => Boolean(sound.isMuted));

  const start = () => {
    sound.init();
    sound.playClick();
    const seats = [{ id: 's0', name: 'Você', face: myFace }, ...BOTS.slice(0, count - 1)];
    setGame({ seats, seed: (Date.now() & 0xffffff) >>> 0, key: Date.now() });
  };
  const toggleMute = () => {
    sound.init();
    setMuted(sound.toggleMute());
  };

  if (game) {
    return <LocalTable key={game.key} seats={game.seats} seed={game.seed} hearts={hearts} rule={rule} onLeave={() => setGame(null)} muted={muted} onToggleMute={toggleMute} />;
  }
  return (
    <TableLobby
      count={count}
      setCount={setCount}
      myFace={myFace}
      setMyFace={setMyFace}
      bots={BOTS}
      rule={rule}
      setRule={setRule}
      hearts={hearts}
      setHearts={setHearts}
      onStart={start}
    />
  );
}
