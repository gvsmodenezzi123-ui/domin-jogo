import { RELICS } from '../data/relics.js';
import DominoTile from './DominoTile.jsx';
import RelicIcon from './RelicIcon.jsx';

/** Barbante Mágico: você vê as pedras de cima do dorme e fica com uma. */
export default function DrawChoice({ options, onPick }) {
  const relic = RELICS.barbante;
  return (
    <div className="overlay-backdrop fixed inset-0 z-[65] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="draw-choice-title">
      <div className="overlay-card w-full max-w-[300px] px-5 py-5 text-center">
        <div className="mx-auto w-fit">
          <RelicIcon relic={relic} size={36} />
        </div>
        <h2 id="draw-choice-title" className="mt-2 font-pixel text-[11px] leading-snug text-bone-50 text-shadow-pixel">
          {relic.name.toUpperCase()}
        </h2>
        <p className="mt-2 font-term text-lg leading-tight text-bone-300">Escolha uma. As outras voltam pro fundo do dorme.</p>
        <div className="mt-4 flex items-end justify-center gap-5">
          {options.map((tile) => (
            <DominoTile
              key={tile.id}
              values={[tile.a, tile.b]}
              unit={options.length > 2 ? 32 : 38}
              depth={3}
              enhancement={tile.enhancement}
              onClick={() => onPick(tile.id)}
              label={`Ficar com a pedra ${tile.a} e ${tile.b}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
