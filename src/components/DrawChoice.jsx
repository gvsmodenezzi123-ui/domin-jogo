import { RELICS } from '../data/relics.js';
import DominoTile from './DominoTile.jsx';
import PixelSprite from './PixelSprite.jsx';

/** Barbante no Dedo: você vê as 2 pedras de cima do dorme e fica com uma. */
export default function DrawChoice({ options, onPick }) {
  const relic = RELICS.barbante;
  return (
    <div className="overlay-backdrop fixed inset-0 z-[65] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="draw-choice-title">
      <div className="overlay-card w-full max-w-[300px] px-5 py-5 text-center">
        <div className="mx-auto w-fit">
          <PixelSprite rows={relic.icon} palette={relic.palette} pixel={3} />
        </div>
        <h2 id="draw-choice-title" className="mt-2 font-pixel text-[11px] leading-snug text-bone-50 text-shadow-pixel">
          BARBANTE NO DEDO
        </h2>
        <p className="mt-2 font-term text-lg leading-tight text-bone-300">Escolha uma. A outra volta pro fundo do dorme.</p>
        <div className="mt-4 flex items-end justify-center gap-7">
          {options.map((tile) => (
            <DominoTile
              key={tile.id}
              values={[tile.a, tile.b]}
              unit={38}
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
